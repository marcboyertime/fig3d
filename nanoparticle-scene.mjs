import {createRenderer} from './kit/renderer.mjs';
import {add,mul,sub,unit,norm,bindingSites,atomVisible,atomView,displayAtoms} from './nanoparticle-model.mjs?v=20261016-1';
import {ease,orbitDelta,gesture} from './nanoparticle-state.mjs?v=20261016-1';
import {growth} from './nanoparticle-opening.mjs?v=20261016-1';
const T=window.THREE;
const GOLD=0xc7994e,BLUE=0x91b7ff,VIOLET=0xbda5ff,RED=0xff7a62;
export class ParticleScene{
 constructor(canvas,{onAtom,onFace,onInterrupt,onHover,onFrame,onFailure}){
  this.canvas=canvas;this.callbacks={onAtom,onFace,onInterrupt,onHover,onFrame,onFailure};
  this.renderer=createRenderer(T,canvas,{exposure:.92,shadows:true,clear:0x0f111b});this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-10,10,10,-10,.1,250);
  this.pose={yaw:.91,elevation:.43,halfHeight:10.7,target:[0,0,0]};this.home={...this.pose,target:[0,0,0]};
  this.width=1;this.height=1;this.active=true;this.pageVisible=!document.hidden;this.raf=0;this.animateUntil=0;this.model=null;this.state=null;this.fade=1;this.hullOpacity=0;this.dpr=Math.min(devicePixelRatio,1.8);
  const env=new T.Scene();env.background=new T.Color(0x030409);
  const panel=(p,w,h,color,intensity)=>{const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,side:T.DoubleSide}));mesh.material.color.multiplyScalar(intensity);mesh.position.set(...p);mesh.lookAt(0,0,0);env.add(mesh);};
  panel([5,9,6],8,12,0xfff0d8,3);panel([-7,3,2],5,11,0xc5d7ff,2.2);panel([0,2,-9],10,5,0xc8b8ff,2);panel([2,-6,3],7,5,0x7a8497,.6);
  const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(env,0);pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  this.scene.environment=this.environment.texture;
  this.scene.add(new T.HemisphereLight(0xc6d7ff,0x231c15,.48));
  for(const [p,color,power] of [[[6,14,10],0xffe3b8,2.1],[[-10,4,8],0xc1d3ff,1.1],[[6,6,-12],0xc5b3ff,1.9]]){const l=new T.DirectionalLight(color,power);l.position.set(...p);if(p[0]===6&&p[1]===14){l.castShadow=true;l.shadow.mapSize.set(2048,2048);Object.assign(l.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.5,far:90});l.shadow.bias=-.0002;l.shadow.normalBias=.025;}this.scene.add(l);}
  this.geometry=new T.SphereGeometry(1,28,18);this.lowGeometry=new T.SphereGeometry(1,18,12);this.material=new T.MeshStandardMaterial({color:0xffffff,metalness:.92,roughness:.32,envMapIntensity:.65});
  this.group=new T.Group();this.scene.add(this.group);this.decor=new T.Group();this.scene.add(this.decor);this.hulls=new T.Group();this.scene.add(this.hulls);
  this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.matrix=new T.Matrix4();this.dummy=new T.Object3D();this.colors=[];this.scales=[];
  this.installEvents();new ResizeObserver(()=>this.resize()).observe(canvas);
  this.observer=new IntersectionObserver(e=>{this.active=e[0].isIntersecting;if(this.active)this.wake();else this.stop();});this.observer.observe(canvas);
  document.addEventListener('visibilitychange',()=>{this.pageVisible=!document.hidden;if(this.pageVisible)this.wake();else this.stop();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.stop();this.callbacks.onFailure();});
  this.resize();
 }
 resize(){const r=this.canvas.parentElement.getBoundingClientRect();if(r.width<32||r.height<32)return;this.width=r.width;this.height=r.height;this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(this.width,this.height,false);this.updateCamera();if(this.model&&this.active&&this.pageVisible)this.renderer.render(this.scene,this.camera);this.wake();}
 updateCamera(){const p=this.pose,a=this.width/this.height;const h=p.halfHeight*Math.max(1,.95/a);this.camera.left=-h*a;this.camera.right=h*a;this.camera.top=h;this.camera.bottom=-h;this.camera.updateProjectionMatrix();this.camera.position.set(p.target[0]+70*Math.sin(p.yaw)*Math.cos(p.elevation),p.target[1]+70*Math.sin(p.elevation),p.target[2]+70*Math.cos(p.yaw)*Math.cos(p.elevation));this.camera.lookAt(...p.target);this.camera.updateMatrixWorld();}
 project(p){const v=new T.Vector3(...p).project(this.camera);return {x:(v.x+1)*this.width/2,y:(1-v.y)*this.height/2,z:v.z};}
 targetPose({direction,target,halfHeight}){const d=unit(direction);return {yaw:Math.atan2(d[0],d[2]),elevation:Math.asin(Math.max(-.9,Math.min(.9,d[1]))),target,halfHeight};}
 moveTo(pose,duration=850){if(this.state?.reduced){this.pose=structuredClone(pose);this.travel=null;this.canvas.dataset.moving='false';this.updateCamera();this.wake();return;}this.canvas.dataset.moving='true';let yaw=pose.yaw;while(yaw-this.pose.yaw>Math.PI)yaw-=2*Math.PI;while(yaw-this.pose.yaw< -Math.PI)yaw+=2*Math.PI;this.travel={from:structuredClone(this.pose),to:{...pose,yaw},start:performance.now(),duration:this.state?.reduced?0:duration};this.wake();}
 overview(fixed=false){this.moveTo({...this.home,halfHeight:fixed?17.4:Math.max(7.4,this.model.shells*1.76),target:[0,0,0]});}
 focusFace(id,binding=false){const f=this.model.facets.find(f=>f.id===id),t=mul(f.center,binding?.9:.45);const d=unit(add(f.normal,[.16,.24,.18]));this.moveTo(this.targetPose({direction:d,target:t,halfHeight:binding?4.6:Math.max(5.5,this.model.shells*1.22)}));}
 focusStacking(){const f=this.model.facets.find(f=>f.id===this.state.faceId),site=bindingSites(this.model,f.id)[this.state.site];const p=this.targetPose({direction:add(f.normal,[.75,-.18,-.1]),target:site.p,halfHeight:4.6});this.moveTo(p);}
 // With the cut open the camera looks in from the hidden half (atomView), so nothing hides the chosen atom and its neighbors.
 focusAtom(id){const s=this.state;this.moveTo(this.targetPose(atomView(this.model.byId.get(id),s?.cutaway,s?.cutSide||1)));}
 clear(group){for(const o of [...group.children]){group.remove(o);o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}}
 setState(state){if(state.paused&&!this.state?.paused)this.pauseAt=performance.now();if(!state.paused&&this.state?.paused&&this.travel)this.travel.start+=performance.now()-this.pauseAt;const newModel=this.model!==state.model;this.state=state;this.rate=70;this.lastDraw=0;
  // A new size keeps every atom it shares with the old one; added atoms grow from nothing and removed atoms shrink away, never vanishing in one frame.
  if(newModel){const shown=this.items||[],before=new Map(shown.map((a,i)=>[a.id,i]));this.items=displayAtoms(shown,state.model,i=>this.scales[i]>.003);this.scales=this.items.map(a=>before.has(a.id)?this.scales[before.get(a.id)]:shown.length?0:.57);this.colors=this.items.map(a=>before.has(a.id)?this.colors[before.get(a.id)]:new T.Color(GOLD).convertSRGBToLinear());if(shown.length)this.rate=120;this.model=state.model;this.mesh(state.model.shells>8||shown.length>2057);this.buildHulls();}this.updateDecoration();this.animateUntil=performance.now()+250;this.forceAtoms=true;this.wake();}
 mesh(low){if(this.atoms){this.group.remove(this.atoms);this.atoms.dispose?.();}this.atoms=new T.InstancedMesh(low?this.lowGeometry:this.geometry,this.material,this.items.length);this.atoms.instanceMatrix.setUsage(T.DynamicDrawUsage);this.atoms.frustumCulled=false;this.atoms.castShadow=true;this.atoms.receiveShadow=true;this.group.add(this.atoms);}
 // Once removed atoms have shrunk to nothing, drop them and redraw the same picture in the same frame.
 compact(now){this.items=this.model.atoms.slice();this.scales.length=this.colors.length=this.items.length;this.mesh(this.model.shells>8);this.drawAtoms(now);}
 buildHulls(){this.clear(this.hulls);for(const face of this.model.facets){const c=face.center,ps=[];for(let i=0;i<face.vertices.length;i++)ps.push(...c,...face.vertices[i],...face.vertices[(i+1)%face.vertices.length]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.computeVertexNormals();const material=new T.MeshStandardMaterial({color:new T.Color(GOLD).convertSRGBToLinear(),metalness:.8,roughness:.34,side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false});const m=new T.Mesh(g,material);m.userData.faceId=face.id;this.hulls.add(m);}}
 cylinder(a,b,color,r=.026){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const mesh=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),8),new T.MeshBasicMaterial({color,transparent:true,opacity:.8}));mesh.position.copy(va.add(vb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return mesh;}
 outline(points,color,r=.035){for(let i=0;i<points.length;i++)this.decor.add(this.cylinder(points[i],points[(i+1)%points.length],color,r));}
 updateDecoration(){this.clear(this.decor);const s=this.state,m=this.model;this.selectedNeighbors=new Set(s.selected?m.byId.get(s.selected)?.neighbors:[]);this.binding=s.view==='binding'?bindingSites(m,s.faceId)[s.site]:null;
  const face=m.facets.find(f=>f.id===s.faceId);this.faceSet=new Set(face.terraceIds);
  if(s.view==='surfaces')this.outline(face.vertices.map(p=>add(p,mul(face.normal,.64))),face.family==='100'?RED:VIOLET,.035);
  if(s.view==='neighbors'&&s.selected){const a=m.byId.get(s.selected);for(const id of a.neighbors)this.decor.add(this.cylinder(a.p,m.byId.get(id).p,BLUE));
   // A thin orbit ring supplies a shape cue as well as the blue selection color.
   const ring=new T.Mesh(new T.TorusGeometry(.72,.026,8,48),new T.MeshBasicMaterial({color:0xd8e6ff}));ring.position.set(...a.p);ring.userData.billboard=true;this.decor.add(ring);
  }
  if(this.binding){const site=this.binding,normal=site.normal,p=add(site.p,mul(normal,1.52));this.marker=new T.Mesh(new T.OctahedronGeometry(.22),new T.MeshStandardMaterial({color:0xd0bcff,metalness:.25,roughness:.27,emissive:0x322246,emissiveIntensity:.3}));this.marker.position.set(...p);this.marker.userData.marker=true;this.decor.add(this.marker);
   for(const id of site.atomIds)this.decor.add(this.cylinder(p,m.byId.get(id).p,VIOLET,.024));
   if(site.atomIds.length>2){const pts=site.atomIds.map(id=>m.byId.get(id).p);const c=site.p;const u=unit(sub(pts[0],c)),v=new T.Vector3(...normal).cross(new T.Vector3(...u)).toArray();pts.sort((a,b)=>Math.atan2(dotLocal(sub(a,c),v),dotLocal(sub(a,c),u))-Math.atan2(dotLocal(sub(b,c),v),dotLocal(sub(b,c),u)));this.outline(pts.map(p=>add(p,mul(normal,.64))),VIOLET,.03);}
   if(s.stacking&&site.underlying){this.decor.add(this.cylinder(add(site.p,mul(normal,.2)),m.byId.get(site.underlying).p,0xe4ddff,.034));}
   this.markerStart=performance.now();
  }
 }
 // Each change eases from the first frame after it: the step is measured from the previous frame, never from an idle gap.
 // While the hull dissolves, every atom is drawn at growth(hull) of its size: the atoms grow as the hull fades instead of switching on in one frame.
 drawAtoms(now){const s=this.state;if(!s)return;const grow=growth(this.hullOpacity),t=this.state.reduced?1:Math.min(1,Math.max(.06,Math.min(50,now-(this.lastDraw||now))/this.rate));let changing=false,i=-1;
  for(const a of this.items){i++;let hex=GOLD,scale=.59;
   if(s.view==='size')hex=a.surface?GOLD:0x455268;
   if(s.view==='surfaces'&&this.faceSet.has(a.id))hex=this.model.facets.find(f=>f.id===s.faceId).family==='100'?0xff9a8a:0xd2c2e4;
   if(s.view==='neighbors'&&s.selected){hex=a.id===s.selected?0xc2d9ff:this.selectedNeighbors.has(a.id)?0x759fe5:0x847352;scale=a.id===s.selected?.53:this.selectedNeighbors.has(a.id)?.46:.59;}
   if(this.binding){hex=this.binding.atomIds.includes(a.id)?0xb9a0e4:0xb89e6a;if(s.stacking&&a.id===this.binding.underlying)hex=0xe4d9ff;}
   const leaving=i>=this.model.atoms.length,target=leaving?this.colors[i]:new T.Color(hex).convertSRGBToLinear();this.colors[i].lerp(target,t);if(Math.abs(this.colors[i].r-target.r)+Math.abs(this.colors[i].g-target.g)+Math.abs(this.colors[i].b-target.b)>.003)changing=true;else this.colors[i].copy(target);this.atoms.setColorAt(i,this.colors[i]);
   if(leaving||!atomVisible(a,s))scale=0;const current=this.scales[i];this.scales[i]=Math.abs(current-scale)<.003?scale:current+(scale-current)*t;if(Math.abs(current-scale)>.003)changing=true;
   this.dummy.position.set(...a.p);this.dummy.scale.setScalar(this.scales[i]*grow);this.dummy.updateMatrix();this.atoms.setMatrixAt(i,this.dummy.matrix);
  }
  this.atoms.instanceMatrix.needsUpdate=true;this.atoms.instanceColor.needsUpdate=true;this.lastDraw=now;return changing;
 }
 render=now=>{this.raf=0;if(!this.active||!this.pageVisible)return;const start=performance.now();if(this.cadencePrevious&&now-this.cadencePrevious<100){this.frameIntervals=(this.frameIntervals||[]).concat(now-this.cadencePrevious).slice(-120);this.canvas.dataset.fps=(1000/(this.frameIntervals.reduce((a,b)=>a+b,0)/this.frameIntervals.length)).toFixed(1);}this.cadencePrevious=now;let ongoing=false;
  this.callbacks.onFrame?.(now);
  if(this.travel&&!this.state?.paused){const tr=this.travel,t=tr.duration?Math.min(1,(now-tr.start)/tr.duration):1,e=ease(t);for(const k of ['yaw','elevation','halfHeight'])this.pose[k]=tr.from[k]+(tr.to[k]-tr.from[k])*e;this.pose.target=tr.from.target.map((v,i)=>v+(tr.to.target[i]-v)*e);if(t===1){this.travel=null;this.canvas.dataset.moving='false';}else ongoing=true;}
  this.updateCamera();if(this.model){if(now<this.animateUntil||this.forceAtoms){const changing=this.drawAtoms(now);ongoing=changing||ongoing;this.forceAtoms=changing;if(!changing&&this.items.length>this.model.atoms.length)this.compact(now);}for(const h of this.hulls.children)h.material.opacity=this.hullOpacity;this.hulls.visible=this.hullOpacity>.001;this.atoms.visible=growth(this.hullOpacity)>0;this.material.opacity=1;for(const o of this.decor.children)if(o.userData.billboard)o.quaternion.copy(this.camera.quaternion);
   if(this.binding&&now-this.markerStart<700&&!this.state.reduced){const d=2.4*(1-ease((now-this.markerStart)/700));this.marker.position.fromArray(add(this.binding.p,mul(this.binding.normal,1.52+d)));ongoing=true;}
  }
  this.renderer.render(this.scene,this.camera);if(this.inputTime){this.canvas.dataset.feedbackMs=(performance.now()-this.inputTime).toFixed(1);this.inputTime=0;}if(this.lastFrameTime&&now-this.lastFrameTime>24){this.slowFrames=(this.slowFrames||0)+1;}else this.slowFrames=Math.max(0,(this.slowFrames||0)-1);if(this.slowFrames>24&&this.dpr>1){this.dpr=Math.max(1,this.dpr-.2);this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(this.width,this.height,false);this.renderer.render(this.scene,this.camera);this.slowFrames=0;}this.lastFrameTime=now;this.canvas.dataset.pixelRatio=this.dpr.toFixed(1);this.canvas.dataset.paused=String(this.state?.paused);this.canvas.dataset.renderWidth=this.width.toFixed(0);this.canvas.dataset.renderHeight=this.height.toFixed(0);this.canvas.dataset.growth=growth(this.hullOpacity).toFixed(3);this.canvas.dataset.visibleInstances=this.scales?.filter(v=>v*growth(this.hullOpacity)>.1).length;this.canvas.dataset.drawCalls=this.renderer.info.render.calls;this.canvas.dataset.triangles=this.renderer.info.render.triangles;this.canvas.dataset.atomVisible=this.atoms?.visible;this.canvas.dataset.hull=this.hullOpacity;this.canvas.dataset.frames=String((Number(this.canvas.dataset.frames)||0)+1);this.canvas.dataset.renderMs=(performance.now()-start).toFixed(2);this.canvas.dataset.yaw=this.pose.yaw.toFixed(4);this.canvas.dataset.elevation=this.pose.elevation.toFixed(4);this.canvas.dataset.halfHeight=this.pose.halfHeight.toFixed(3);
  if(this.state?.selected){const a=this.model.byId.get(this.state.selected),p=this.project(a.p);this.canvas.dataset.selectedScreen=`${p.x.toFixed(1)},${p.y.toFixed(1)}`;}
  if(this.state?.intro&&!this.state.paused||ongoing||now<this.animateUntil)this.wake();
 };
 wake(){
  // Viewport changes and restored pages can precede the observer notification.
  // Reconcile visibility before dropping an explicit request to render.
  this.pageVisible=!document.hidden;
  if(!this.active&&this.pageVisible){const r=this.canvas.getBoundingClientRect();this.active=r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
  if(!this.raf&&this.active&&this.pageVisible)this.raf=requestAnimationFrame(this.render);
 }
 stop(){cancelAnimationFrame(this.raf);this.raf=0;}
 setIntro(hull){if(hull!==this.hullOpacity)this.forceAtoms=true;this.hullOpacity=hull;this.wake();}
 interrupt(){this.travel=null;this.canvas.dataset.moving='false';this.callbacks.onInterrupt();this.setIntro(0);}
 orbit(dx,dy){this.interrupt();this.pose=orbitDelta(this.pose,dx,dy);this.canvas.dataset.requestedYaw=this.pose.yaw.toFixed(4);this.canvas.dataset.active=String(this.active);this.canvas.dataset.pageVisible=String(this.pageVisible);this.wake();}
 zoom(factor){this.interrupt();this.moveTo({...this.pose,halfHeight:Math.max(2.6,Math.min(23,this.pose.halfHeight*factor))},220);}
 pick(x,y,hover=false){const r=this.canvas.getBoundingClientRect();this.pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObject(this.atoms).find(h=>this.scales[h.instanceId]>.2&&h.instanceId<this.model.atoms.length);if(!hit)return null;const atom=this.model.atoms[hit.instanceId];if(!hover&&this.state.view==='surfaces'){const faces=this.model.facets.filter(f=>f.atomIds.includes(atom.id));faces.sort((a,b)=>dotLocal(b.normal,this.camera.position.toArray())-dotLocal(a.normal,this.camera.position.toArray()));if(faces.length){this.callbacks.onFace(faces[0].id);return atom;}}if(!hover)this.callbacks.onAtom(atom.id);return atom;}
 installEvents(){const c=this.canvas;
  c.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,touch:e.pointerType==='touch',locked:false};if(e.pointerType!=='touch')c.setPointerCapture(e.pointerId);});
  c.addEventListener('pointermove',e=>{const d=this.drag;if(!d){if(e.pointerType==='mouse'&&this.model){const a=this.pick(e.clientX,e.clientY,true);this.callbacks.onHover?.(a);}return;}if(d.id!==e.pointerId)return;if(!d.moved){const g=gesture(e.clientX-d.x,e.clientY-d.y,d.touch);if(g==='page'){this.drag=null;return;}if(g==='turn'){d.moved=d.locked=true;c.setPointerCapture(e.pointerId);this.interrupt();}}if(d.locked){this.orbit(e.clientX-d.lastX,d.touch?0:e.clientY-d.lastY);c.style.cursor='grabbing';}d.lastX=e.clientX;d.lastY=e.clientY;});
  // A tap on the paper or the dissolving hull hands control to the reader but selects nothing: the atoms have not resolved yet.
  // Distance is measured from the press (gesture), so a slow drag is never a tap, and a touch stroke that scrolls the page is not input here.
  const end=e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;c.style.cursor='grab';if(c.hasPointerCapture(e.pointerId))c.releasePointerCapture(e.pointerId);if(e.type==='pointerup'&&!d.moved&&this.model){const covered=this.hullOpacity>0;this.interrupt();if(!covered)this.pick(e.clientX,e.clientY);}};
  c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('lostpointercapture',()=>{this.drag=null;c.style.cursor='grab';});c.addEventListener('pointerleave',()=>this.callbacks.onHover?.(null));
  c.addEventListener('keydown',e=>{const actions={ArrowLeft:()=>this.orbit(-24,0),ArrowRight:()=>this.orbit(24,0),ArrowUp:()=>this.orbit(0,-24),ArrowDown:()=>this.orbit(0,24),'+':()=>this.zoom(.85),'=':()=>this.zoom(.85),'-':()=>this.zoom(1.18),Home:()=>{this.interrupt();this.overview(this.state.view==='size');}};if(actions[e.key]){e.preventDefault();actions[e.key]();}});
 }
}
const dotLocal=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
