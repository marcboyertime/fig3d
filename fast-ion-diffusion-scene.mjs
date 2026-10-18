// The LLZO channel in three dimensions. One state drives everything; displayed values ease toward it,
// so framework, occupancy and context changes fade and the camera travels instead of jumping.
// Camera: orthographic, oriented by a quaternion so the reader can turn the crystal freely; HOME is the
// viewpoint fitted to the printed inset of Fig. 3b (production/fast-ion-diffusion/registration).
import {createRenderer} from './kit/renderer.mjs';
import {clamp,ease,smooth,ionPositions,singlePosition,singlePath,singleContext} from './fast-ion-diffusion-model.mjs?v=5';
const T=window.THREE;
const lin=hex=>new T.Color(hex).convertSRGBToLinear();
// Species colours follow the paper: Li green, O yellow (Fig. 3 insets), ZrO₆ lavender (Fig. 2b), single-ion path red (Fig. 3e).
export const PALETTE={li:'#46c46a',liDeep:'#2f9b53',oxygen:'#e2c341',cage:'#8fd6a6',zr:'#9c9cf0',la:'#b7b0a2',single:'#ec3b3f',site:'#d8e6ff',select:'#ffffff'};
const R_LI=.36,R_O=.3,R_LA=.38,R_SITE=.5;
const approach=(v,t,dt,rate)=>Math.abs(t-v)<1e-4?t:v+(t-v)*(1-Math.exp(-dt*rate));

export class ChannelScene{
 constructor(canvas,data,callbacks={}){
  this.canvas=canvas;this.data=data;this.cb=callbacks;this.width=1;this.height=1;this.animators=new Set();this.active=true;this.raf=0;this.last=0;this.dirty=true;
  this.renderer=createRenderer(T,canvas,{exposure:.92});
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-10,10,6,-6,-200,200);
  const q=data.paperView.quaternion_crystal_to_camera;this.paperQuat=new T.Quaternion(q[0],q[1],q[2],q[3]).invert();
  this.home={quat:this.paperQuat.clone(),target:new T.Vector3(0,0,0),halfHeight:5.2};
  this.pose={quat:this.home.quat.clone(),target:this.home.target.clone(),halfHeight:this.home.halfHeight};
  this.view={progress:0,cages:1,zr:0,la:0,anions:1,cell:0,average:0,single:0,dimOthers:0};this.target={...this.view};
  this.lighting();this.build();
  new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);
  this.observer=new IntersectionObserver(e=>{this.active=e[0].isIntersecting;if(this.active)this.wake();else this.stop();});this.observer.observe(canvas);
  document.addEventListener('visibilitychange',()=>{this.last=0;if(document.hidden)this.stop();else this.wake();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.stop();this.cb.failure?.();});
  this.install();this.resize();
 }
 lighting(){
  this.scene.add(new T.HemisphereLight(0xe8eeff,0x141826,.55));
  this.key=new T.DirectionalLight(0xffffff,1.25);this.scene.add(this.key);this.key.target.position.set(0,0,0);this.scene.add(this.key.target);
  this.rim=new T.DirectionalLight(0xbfd0ff,.55);this.scene.add(this.rim);
  const studio=new T.Scene();studio.background=new T.Color(0x161a24);
  for(const [pos,w,h,c,k] of [[[0,9,4],8,14,0xffffff,1.4],[[8,1,-5],4,12,0xffeedd,.9],[[-7,3,6],5,10,0xc6d2ff,.9]]){const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:c,side:T.DoubleSide}));m.material.color.multiplyScalar(k);m.position.set(...pos);m.lookAt(0,0,0);studio.add(m);}
  const pm=new T.PMREMGenerator(this.renderer);this.env=pm.fromScene(studio,.04);this.scene.environment=this.env.texture;pm.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 }
 // Lights ride with the camera so the crystal is lit the same way from every side the reader turns to.
 placeLights(){const q=this.pose.quat;this.key.position.set(4,6,9).applyQuaternion(q);this.rim.position.set(-6,-2,-8).applyQuaternion(q);}
 build(){
  const d=this.data,V=a=>new T.Vector3(a[0],a[1],a[2]);
  this.root=new T.Group();this.scene.add(this.root);
  const sphere=new T.SphereGeometry(1,40,24);this.sphere=sphere;
  const mat=(c,o={})=>new T.MeshStandardMaterial({color:lin(c),roughness:.42,metalness:0,envMapIntensity:.6,...o});
  // O²⁻ anions coordinating the channel (the yellow spheres of the inset)
  this.anionMat=mat(PALETTE.oxygen,{roughness:.5,transparent:true});
  // Oxygens of the channel cages always show; the rest belong only to ZrO₆ and appear with the full framework.
  const core=new Set(d.polyhedra.flatMap(p=>p.anions)),inner=d.anions.filter((p,i)=>core.has(i)),outer=d.anions.filter((p,i)=>!core.has(i));
  const anionMesh=(list,m)=>{const g=new T.InstancedMesh(sphere,m,list.length);list.forEach((p,i)=>g.setMatrixAt(i,new T.Matrix4().compose(V(p),new T.Quaternion(),new T.Vector3(R_O,R_O,R_O))));this.root.add(g);return g;};
  this.anions=anionMesh(inner,this.anionMat);this.outerMat=this.anionMat.clone();this.outerAnions=anionMesh(outer,this.outerMat);this.anionCounts={inner:inner.length,outer:outer.length};
  // Li-site cages (LiO₄ tetrahedra and LiO₆ octahedra) drawn as the paper draws them: pale green, translucent, edged.
  const polyGeo=(list,faces)=>{const g=new T.BufferGeometry(),pos=[];for(const f of faces)for(const i of f)pos.push(...list[i]);g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;};
  const edgeGeo=faces=>{const set=new Set(),pos=[];for(const f of faces)for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=a<b?a+'-'+b:b+'-'+a;if(set.has(key))continue;set.add(key);pos.push(...d.anions[a],...d.anions[b]);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));return g;};
  const faceMat=(c,o)=>new T.MeshStandardMaterial({color:lin(c),transparent:true,opacity:o,roughness:.6,metalness:0,side:T.DoubleSide,depthWrite:false,envMapIntensity:.3});
  const lineMat=(c,o)=>new T.LineBasicMaterial({color:lin(c),transparent:true,opacity:o,depthWrite:false});
  this.cageFace=faceMat(PALETTE.cage,.13);this.cageEdge=lineMat(PALETTE.cage,.42);
  this.cages=new T.Group();this.root.add(this.cages);
  this.cageMeshes={};
  for(const p of d.polyhedra){const g=new T.Group(),f=new T.Mesh(polyGeo(d.anions,p.faces),this.cageFace),e=new T.LineSegments(edgeGeo(p.faces),this.cageEdge);f.renderOrder=1;e.renderOrder=2;g.add(f,e);this.cages.add(g);this.cageMeshes[p.site]=g;}
  // ZrO₆ octahedra and La of the framework (Fig. 2b colours), shown in "Full framework".
  this.zrFace=faceMat(PALETTE.zr,.2);this.zrEdge=lineMat(PALETTE.zr,.45);this.zr=new T.Group();this.root.add(this.zr);
  for(const z of d.zr){const f=new T.Mesh(polyGeo(d.anions,z.faces),this.zrFace),e=new T.LineSegments(edgeGeo(z.faces),this.zrEdge);f.renderOrder=1;e.renderOrder=2;this.zr.add(f,e);}
  this.laMat=mat(PALETTE.la,{roughness:.55,transparent:true});this.la=new T.InstancedMesh(sphere,this.laMat,Math.max(1,d.la.length));
  d.la.forEach((p,i)=>this.la.setMatrixAt(i,new T.Matrix4().compose(V(p),new T.Quaternion(),new T.Vector3(R_LA,R_LA,R_LA))));this.root.add(this.la);
  // Site markers: thin rings that always face the reader. An empty site is a ring; an occupied one is a ring around a sphere.
  const ring=(r,w)=>new T.RingGeometry(r-w,r,64);
  this.siteMat=new T.MeshBasicMaterial({color:lin(PALETTE.site),transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false,toneMapped:false});
  this.branchMat=new T.MeshBasicMaterial({color:lin(PALETTE.site),transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false,toneMapped:false});
  this.splitMat=new T.MeshBasicMaterial({color:lin(PALETTE.site),transparent:true,opacity:.45,depthWrite:false,toneMapped:false});
  this.markers=[];this.siteGroup=new T.Group();this.root.add(this.siteGroup);
  for(const s of d.sites){const m=new T.Mesh(ring(R_SITE,.045),this.siteMat.clone());m.position.copy(V(s.p));m.userData={kind:'site',id:s.name};m.renderOrder=4;this.siteGroup.add(m);this.markers.push(m);}
  this.branch=[];for(const [i,b] of d.branch.entries()){const m=new T.Mesh(ring(R_SITE*.8,.035),this.branchMat);m.position.copy(V(b.p));m.userData={kind:'branch',id:'b'+i,site:b.kind};m.renderOrder=4;this.siteGroup.add(m);this.branch.push(m);}
  // The two split (96h) positions inside each channel O site, as tiny dots: Li sits off-centre, in one or the other.
  this.splits=new T.Group();this.root.add(this.splits);
  const dot=new T.SphereGeometry(.07,12,8);
  const byName=Object.fromEntries(d.sites.map(s=>[s.name,s.p]));
  for(const s of d.sites)if(s.kind==='O'){const i=d.sites.indexOf(s),a=d.sites[i-1]?.p,b=d.sites[i+1]?.p;for(const n of [a,b]){if(!n)continue;const dir=V(n).sub(V(s.p)).normalize().multiplyScalar(.408),m=new T.Mesh(dot,this.splitMat);m.position.copy(V(s.p)).add(dir);this.splits.add(m);}}
  // The five ions and their paths
  this.liMat=mat(PALETTE.li,{roughness:.32,emissive:lin(PALETTE.liDeep),emissiveIntensity:.18});
  this.ions=d.ions.map(ion=>{const m=new T.Mesh(sphere,this.liMat.clone());m.scale.setScalar(R_LI);m.userData={kind:'ion',id:ion.id};m.renderOrder=5;this.root.add(m);return m;});
  this.paths=d.ions.map(ion=>this.arrow(V(ion.start),V(ion.end)));
  // Selection halo
  this.halo=new T.Mesh(ring(.62,.05),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,side:T.DoubleSide,depthTest:false,toneMapped:false}));this.halo.renderOrder=9;this.halo.visible=false;this.root.add(this.halo);
  // Single-ion reference (Fig. 3e): one red ion and its straight T–O–T line of images.
  const sp=singlePath(d);this.singleMat=mat(PALETTE.single,{roughness:.35,transparent:true,emissive:lin('#7a1214'),emissiveIntensity:.25});
  this.single=new T.Mesh(sphere,this.singleMat);this.single.scale.setScalar(R_LI);this.single.renderOrder=5;this.root.add(this.single);
  this.singleTrail=new T.Group();this.root.add(this.singleTrail);this.singleTrailMat=new T.MeshBasicMaterial({color:lin(PALETTE.single),transparent:true,opacity:.6,toneMapped:false});
  for(let k=0;k<=12;k++){const m=new T.Mesh(dot,this.singleTrailMat);m.scale.setScalar(1.3);m.position.copy(V(sp.from)).lerp(V(sp.to),k/12);this.singleTrail.add(m);}
  // The lithium held fixed around the lone ion (schematic: the event's start sites, model singleContext), dimmed.
  this.contextMat=mat(PALETTE.li,{roughness:.42,transparent:true,opacity:0,depthWrite:false});this.contextMat.color.multiplyScalar(.5);
  this.context=singleContext(d).map(ion=>{const m=new T.Mesh(sphere,this.contextMat);m.scale.setScalar(R_LI);m.position.copy(V(ion.start));m.renderOrder=5;this.root.add(m);return m;});
  // Whole-cell context: every T and O site of one conventional cell, ZrO₆ centres and the cell edges.
  this.cell=new T.Group();this.root.add(this.cell);this.cellMats=[];
  const c=d.cell,cm=(o)=>{const m=new T.MeshBasicMaterial({...o,transparent:true,depthWrite:false,toneMapped:false});this.cellMats.push([m,o.opacity]);return m;};
  const pts=(list,r,m)=>{const g=new T.InstancedMesh(new T.SphereGeometry(1,14,10),m,list.length);list.forEach((p,i)=>g.setMatrixAt(i,new T.Matrix4().compose(V(p),new T.Quaternion(),new T.Vector3(r,r,r))));this.cell.add(g);};
  pts(c.T,.26,cm({color:lin(PALETTE.li),opacity:.75}));pts(c.O,.26,cm({color:lin(PALETTE.li),opacity:.42}));
  pts(c.zr,.42,cm({color:lin(PALETTE.zr),opacity:.7}));pts(c.la,.3,cm({color:lin(PALETTE.la),opacity:.35}));
  const o=V(c.origin),a=c.a,corners=[];for(let i=0;i<8;i++)corners.push(o.clone().add(new T.Vector3(i&1?a:0,i&2?a:0,i&4?a:0)));
  const edges=[];for(let i=0;i<8;i++)for(const b of [1,2,4])if(!(i&b))edges.push(corners[i],corners[i|b]);
  const box=new T.LineSegments(new T.BufferGeometry().setFromPoints(edges),new T.LineBasicMaterial({color:lin('#8ea3d6'),transparent:true,opacity:.55,depthWrite:false}));this.cellMats.push([box.material,.55]);this.cell.add(box);
  // Li–Li connections of the whole cell (T–O neighbours at 1.99 Å): the garnet's 3D network of channels.
  const bonds=[];for(const t of c.T)for(const g of c.O){const dd=Math.hypot(t[0]-g[0],t[1]-g[1],t[2]-g[2]);if(dd<2.1)bonds.push(V(t),V(g));}
  const net=new T.LineSegments(new T.BufferGeometry().setFromPoints(bonds),new T.LineBasicMaterial({color:lin(PALETTE.li),transparent:true,opacity:.35,depthWrite:false}));this.cellMats.push([net.material,.35]);this.cell.add(net);
  // The channel, highlighted inside the cell
  const chainPts=d.sites.map(s=>V(s.p));this.chainLine=new T.Line(new T.BufferGeometry().setFromPoints(chainPts),new T.LineBasicMaterial({color:lin('#d9ffe4'),transparent:true,opacity:0,depthTest:false}));this.chainLine.renderOrder=8;this.root.add(this.chainLine);
  this.pickables=[...this.ions,...this.markers,...this.branch];
 }
 // A path drawn as a slim shaft and a proper head, for the direction each ion travels.
 arrow(a,b){
  const g=new T.Group(),dir=b.clone().sub(a),len=dir.length(),head=.34,shaft=Math.max(.01,len-head-.08);
  const m=new T.MeshBasicMaterial({color:lin('#bff2cf'),transparent:true,opacity:.75,depthWrite:false,toneMapped:false});
  const s=new T.Mesh(new T.CylinderGeometry(.032,.032,shaft,10),m);s.position.y=shaft/2;
  const h=new T.Mesh(new T.ConeGeometry(.12,head,18),m);h.position.y=shaft+head/2;
  g.add(s,h);g.position.copy(a);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());g.renderOrder=3;g.userData.material=m;this.root.add(g);return g;
 }
 setState(s){
  const ev=s.question!=='sites',single=ev&&s.compare==='single',average=s.question==='sites'&&s.occupancy==='average',cell=s.question==='sites'&&s.context;
  Object.assign(this.target,{progress:s.question==='sites'?0:s.progress,cages:s.framework==='none'?0:1,zr:s.framework==='full'?1:0,la:s.framework==='full'?1:0,anions:s.framework==='none'?0:1,cell:cell?1:0,average:average?1:0,single:single?1:0});
  // Five ions together and one ion alone are different calculations: the outgoing one fades where it stands while the
  // incoming one starts at its own coordinate, so nothing rewinds on screen and the readout never runs ahead of the picture.
  // Clicked back before the fade ends: the set that was leaving returns from where it stands and eases to its coordinate.
  if(this.started&&this.state&&this.state.compare!==s.compare&&ev&&this.state.question!=='sites'){const back=this.frozen;this.frozen=this.view.progress;this.view.progress=back??this.target.progress;}
  if(s.reduced||!this.started){Object.assign(this.view,this.target);this.started=true;}
  this.state=s;this.wake();
 }
 step(dt){
  const v=this.view,t=this.target,before=JSON.stringify(v);
  v.progress=this.state?.playing||this.scrubbing?t.progress:approach(v.progress,t.progress,dt,9);
  // The whole cell comes in as the camera pulls back, not while it is still close on the channel.
  const cellTo=t.cell>v.cell&&this.travel?Math.min(t.cell,smooth(.25,.85,this.travel.t/(this.travel.duration||1))):t.cell;
  for(const k of ['cages','zr','la','anions','cell','average','single'])v[k]=approach(v[k],k==='cell'?cellTo:t[k],dt,5.5);
  return JSON.stringify(v)!==before;
 }
 settled(){return Object.keys(this.target).every(k=>Math.abs(this.view[k]-this.target[k])<1e-4);}
 update(){
  const v=this.view,s=this.state||{},d=this.data,focus=1-.75*v.cell;
  // While the compare fade runs, the outgoing set keeps the coordinate it had.
  if(this.frozen!=null&&Math.abs(v.single-this.target.single)<1e-3)this.frozen=null;
  const out=this.frozen!=null;this.shown={group:out&&this.target.single===1?this.frozen:v.progress,single:out&&this.target.single===0?this.frozen:v.progress};
  const P=ionPositions(d,this.shown.group);
  const sel=s.selection;
  this.ions.forEach((m,i)=>{m.position.set(...P[i]);const show=(1-v.single)*(1-v.average);m.visible=show>.01;m.material.transparent=show<.999;m.material.opacity=show;
   const dim=sel?.kind==='ion'&&sel.id!==i+1?.45:1;m.material.emissiveIntensity=.18*dim;m.material.color.copy(lin(PALETTE.li)).multiplyScalar(dim);});
  // Average occupancy: every channel site drawn as a dimmer, smaller sphere: lithium is there part of the time.
  this.markers.forEach((m,i)=>{m.quaternion.copy(this.pose.quat);m.material.opacity=.7*focus*(1-.35*v.single);});
  this.branch.forEach(m=>{m.quaternion.copy(this.pose.quat);m.visible=v.cell<.98;});
  if(!this.avg){this.avg=new T.InstancedMesh(this.sphere,new T.MeshStandardMaterial({color:lin(PALETTE.li),transparent:true,opacity:0,roughness:.5,depthWrite:false}),d.sites.length+d.branch.length);[...d.sites.map(x=>x.p),...d.branch.map(x=>x.p)].forEach((p,i)=>this.avg.setMatrixAt(i,new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion(),new T.Vector3(.27,.27,.27))));this.avg.renderOrder=5;this.root.add(this.avg);}
  this.avg.material.opacity=.55*v.average;this.avg.visible=v.average>.01;
  this.paths.forEach((g,i)=>{const o=(1-v.single)*(1-v.average)*(1-v.cell)*(s.question==='sites'?0:1)*(sel?.kind==='ion'&&sel.id!==i+1?.3:1);g.userData.material.opacity=.75*o;g.visible=o>.01;});
  for(const m of this.context)m.visible=v.single>.01;this.contextMat.opacity=v.single;
  this.single.position.set(...singlePosition(d,this.shown.single));this.single.visible=v.single>.01;this.singleMat.opacity=v.single;this.singleTrail.visible=v.single>.01;this.singleTrailMat.opacity=.6*v.single;
  this.splits.visible=v.cell<.98;this.splitMat.opacity=.45*focus;
  this.anionMat.opacity=v.anions*(1-.6*v.cell);this.anions.visible=this.anionMat.opacity>.01;this.outerMat.opacity=v.anions*v.zr*(1-v.cell);this.outerAnions.visible=this.outerMat.opacity>.01;
  this.cageFace.opacity=.13*v.cages*(1-.5*v.cell);this.cageEdge.opacity=.42*v.cages*(1-.3*v.cell);this.cages.visible=v.cages>.01;
  this.zrFace.opacity=.2*v.zr*(1-v.cell);this.zrEdge.opacity=.45*v.zr*(1-v.cell);this.zr.visible=v.zr*(1-v.cell)>.01;
  this.laMat.opacity=v.la*(1-v.cell);this.la.visible=v.la*(1-v.cell)>.01;
  for(const [m,o] of this.cellMats)m.opacity=o*v.cell;this.cell.visible=v.cell>.01;this.chainLine.material.opacity=.9*v.cell;
  // Selection halo follows the selected ion or site
  let at=null;if(sel?.kind==='ion'&&v.single<.5&&v.average<.5)at=this.ions[sel.id-1].position;else if(sel?.kind==='site')at=this.markers.find(m=>m.userData.id===sel.id)?.position;else if(sel?.kind==='branch')at=this.branch[+sel.id.slice(1)]?.position;
  this.halo.visible=!!at&&v.cell<.5;if(at){this.halo.position.copy(at);this.halo.quaternion.copy(this.pose.quat);}
  this.canvas.dataset.progress=v.progress.toFixed(4);this.canvas.dataset.rendered='true';
 }
 resize(){const r=this.canvas.getBoundingClientRect();if(r.width<10||r.height<10)return;this.width=r.width;this.height=r.height;this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(r.width,r.height,false);this.dirty=true;this.wake();}
 // Narrow stages keep the channel's length in view rather than its height.
 halfHeightFor(h){return h*Math.max(1,1.5/(this.width/this.height));}
 updateCamera(){
  const p=this.pose,h=this.halfHeightFor(p.halfHeight),a=this.width/this.height;
  Object.assign(this.camera,{left:-h*a,right:h*a,top:h,bottom:-h});this.camera.updateProjectionMatrix();
  this.camera.quaternion.copy(p.quat);this.camera.position.copy(p.target).add(new T.Vector3(0,0,60).applyQuaternion(p.quat));this.camera.updateMatrixWorld();
  this.placeLights();
 }
 project(pos){const p=new T.Vector3(...pos).project(this.camera);return {x:(p.x+1)*this.width/2,y:(1-p.y)*this.height/2,z:p.z};}
 pixelsPerAngstrom(){return this.height/(2*this.halfHeightFor(this.pose.halfHeight));}
 moveTo(p,duration=1100){this.travel={from:{quat:this.pose.quat.clone(),target:this.pose.target.clone(),halfHeight:this.pose.halfHeight},to:{quat:(p.quat||this.pose.quat).clone(),target:(p.target||this.pose.target).clone(),halfHeight:p.halfHeight??this.pose.halfHeight},t:0,duration:this.state?.reduced?0:duration};this.wake();}
 animate(fn){this.animators.add(fn);this.wake();return ()=>this.animators.delete(fn);}
 renderNow(){this.updateCamera();this.update();this.renderer.render(this.scene,this.camera);this.cb.frame?.(this);this.dirty=false;}
 frame(now){
  this.raf=0;if(!this.active||document.hidden)return;
  const dt=this.last?Math.min(.1,(now-this.last)/1000):1/60;this.last=now;
  for(const fn of [...this.animators])if(fn(now,dt)===false)this.animators.delete(fn);
  if(this.travel){const t=this.travel;t.t+=dt*1000;const u=t.duration?clamp(t.t/t.duration):1,k=ease(u);
   this.pose.quat.copy(t.from.quat).slerp(t.to.quat,k);this.pose.target.copy(t.from.target).lerp(t.to.target,k);this.pose.halfHeight=t.from.halfHeight+(t.to.halfHeight-t.from.halfHeight)*k;if(u>=1)this.travel=null;this.dirty=true;}
  if(this.state&&this.step(dt))this.dirty=true;
  if(this.dirty)this.renderNow();
  if(this.raf)return;
  if(this.travel||this.animators.size||!this.settled())this.raf=requestAnimationFrame(t=>this.frame(t));else this.last=0;
 }
 wake(){this.dirty=true;if(!this.raf&&this.active&&!document.hidden)this.raf=requestAnimationFrame(t=>this.frame(t));}
 stop(){cancelAnimationFrame(this.raf);this.raf=0;this.last=0;}
 // Turn about the screen's own axes: horizontal drag spins about "up", vertical drag tips about "right".
 orbit(dx,dy){const k=Math.PI/Math.max(320,this.width*.8),up=new T.Vector3(0,1,0).applyQuaternion(this.pose.quat),right=new T.Vector3(1,0,0).applyQuaternion(this.pose.quat);
  const q=new T.Quaternion().setFromAxisAngle(up,-dx*k).multiply(new T.Quaternion().setFromAxisAngle(right,-dy*k));this.pose.quat.premultiply(q).normalize();this.dirty=true;this.wake();}
 pick(clientX,clientY){
  const r=this.canvas.getBoundingClientRect(),x=clientX-r.left,y=clientY-r.top;let best=null,bd=Infinity;
  for(const m of this.pickables){if(!m.visible)continue;if(m.userData.kind==='ion'&&m.material.opacity<.5)continue;const p=this.project([m.position.x,m.position.y,m.position.z]),dd=Math.hypot(p.x-x,p.y-y);const reach=Math.max(16,(m.userData.kind==='ion'?R_LI:R_SITE)*this.pixelsPerAngstrom()+6);
   const score=dd-(m.userData.kind==='ion'?4:0)+p.z*2;if(dd<reach&&score<bd){bd=score;best=m.userData;}}
  return best;
 }
 install(){
  const c=this.canvas;
  c.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.drag={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,kind:e.pointerType,locked:e.pointerType!=='touch',moved:false,id:e.pointerId};});
  c.addEventListener('pointermove',e=>{if(!this.drag)return;const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;
   if(!d.moved){if(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)<6)return;if(!d.locked&&Math.abs(dy)>Math.abs(dx)){this.drag=null;return;}d.locked=true;d.moved=true;c.setPointerCapture(d.id);this.travel=null;this.cb.interrupt?.();}
   this.orbit(dx,d.kind==='touch'?dy*.6:dy);d.x=e.clientX;d.y=e.clientY;this.cb.camera?.();});
  c.addEventListener('pointerup',e=>{const d=this.drag;this.drag=null;if(d&&!d.moved)this.cb.pick?.(this.pick(e.clientX,e.clientY));});
  for(const ev of ['pointercancel','lostpointercapture'])c.addEventListener(ev,()=>{if(this.drag?.moved)this.drag=null;});
  c.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();this.cb.interrupt?.();this.travel=null;this.pose.halfHeight=clamp(this.pose.halfHeight*Math.exp(e.deltaY*.001),2.4,14);this.cb.camera?.();this.wake();},{passive:false});
  c.addEventListener('keydown',e=>{const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down','+':'in','=':'in','-':'out',Home:'reset'};if(map[e.key]){e.preventDefault();this.cb.interrupt?.();this.control(map[e.key]);}});
 }
 control(action){
  if(action==='reset'){this.moveTo(this.cb.home?.()??this.home);return;}
  const base=this.travel?this.travel.to:this.pose;
  if(action==='in'||action==='out'){this.moveTo({halfHeight:clamp(base.halfHeight*(action==='in'?.84:1.2),2.4,14)},380);this.cb.camera?.();return;}
  const ang=Math.PI/8,up=new T.Vector3(0,1,0).applyQuaternion(base.quat),right=new T.Vector3(1,0,0).applyQuaternion(base.quat);
  const q=action==='left'?new T.Quaternion().setFromAxisAngle(up,ang):action==='right'?new T.Quaternion().setFromAxisAngle(up,-ang):action==='up'?new T.Quaternion().setFromAxisAngle(right,ang):new T.Quaternion().setFromAxisAngle(right,-ang);
  this.moveTo({quat:q.multiply(base.quat.clone()).normalize()},420);this.cb.camera?.();
 }
}
