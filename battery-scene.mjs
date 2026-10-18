import {createRenderer} from './kit/renderer.mjs';
import {Annotations,projectPoint} from './annotations.mjs';
import {CELL,ROUTES,pointAlongPolyline,graphiteGeometry,graphiteIonPath,galleryStartSite,inventoryFills,endFade,pairFraction,calloutPresence,riderStep,gestureStep} from './battery-model.mjs';
const COLORS={lithium:0x80f3d0,electron:0xc5a0ff,carbon:0x526b8e,negative:0x7da6f8,positive:0xa786ef};
const smooth=t=>t*t*(3-2*t),clamp01=t=>Math.max(0,Math.min(1,t)),easeOut=t=>1-Math.pow(1-clamp01(t),3);
// Turntable orbit: yaw is unbounded (a drag can go all the way round); elevation stays between a low side view and a near top view.
const ORBIT={yawPerPx:.0068,pitchPerPx:.0048,minElevation:-.22,maxElevation:1.3,follow:70,spinDecay:380};
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
// The dive is a critically damped spring (rate per second): it leaves from rest, arrives in about a second without overshoot, and a reversal
// mid-flight carries on from the current velocity. Callouts wait until the camera is within `settle` of its view.
const DIVE={spring:4.5,settle:.03};
// Each rider's window of travel, per mode. Both are symmetric under a reversal (t → 1−t maps one mode's window onto the other's). The electron's
// words let go before its plate reaches the tail of the circuit's direction arrow. The gallery ion's window is the same in both modes.
export const RIDE={ion:{discharge:[.22,.78],charge:[.22,.78]},electron:{discharge:[.03,.29],charge:[.71,.97]},gallery:{from:.1,to:.9,edge:.08}};
const SVG='http://www.w3.org/2000/svg';
export class BatteryScene{
  constructor(canvas,labelLayer,onPart,options={}){
    const T=window.THREE;if(!T)throw new Error('The 3D library could not load.');this.T=T;this.canvas=canvas;this.labelLayer=labelLayer;this.onPart=onPart||(()=>{});this.options=options;this.phase=.25;
    this.renderer=createRenderer(T,canvas,{exposure:.95});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(40,1,.02,100);this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();
    this.scene.add(new T.HemisphereLight(0xc5d7ff,0x12162a,.55));
    const key=new T.DirectionalLight(0xd7e4ff,1.25);key.position.set(-2,8,8);this.scene.add(key);
    const rim=new T.DirectionalLight(0x8d65ff,.9);rim.position.set(2,3,-6);this.scene.add(rim);
    const glow=new T.PointLight(0x9afde4,.24,20);glow.position.set(-4,1,4);this.scene.add(glow);
    this.cell=new T.Group();this.scene.add(this.cell);this.fadeMaterials=[];this.pickMeshes=[];this.labels=[];this.zoom=0;this.zoomV=0;this.targetZoom=0;this.rotation={x:0,y:0};this.targetRotation={x:0,y:0};this.spin=0;this.dragging=false;this.dirty=true;this.fit=1;this.arrowDraw=1;this.arrowOut=1;this.presence={cell:1,inside:0};this.reduced=options.reduced||matchMedia('(prefers-reduced-motion:reduce)');
    this.makeCell();this.makeGraphite();if(options.labels!==false)this.makeLabels();
    new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);this.resize();
    if(options.interactive===false)return;
    canvas.addEventListener('pointerdown',e=>this.pointerDown(e));canvas.addEventListener('pointermove',e=>this.pointerMove(e));
    canvas.addEventListener('pointerup',e=>this.pointerUp(e,false));canvas.addEventListener('pointercancel',e=>this.pointerUp(e,true));
    canvas.addEventListener('pointerleave',()=>{if(!this.dragging)this.onPart(null,false);});
    canvas.addEventListener('keydown',e=>{
      const step={ArrowLeft:[.26,0],ArrowRight:[-.26,0],ArrowUp:[0,-.14],ArrowDown:[0,.14]}[e.key];
      if(e.key==='Home'){e.preventDefault();this.resetCamera(this.reduced.matches);return;}
      if(!step)return;e.preventDefault();this.spin=0;this.targetRotation.x+=step[0];
      this.targetRotation.y=Math.max(ORBIT.minElevation-.4,Math.min(ORBIT.maxElevation-.4,this.targetRotation.y+step[1]));this.dirty=true;
    });
  }
  // Drag follows the hand: right turns the cell right, down tips its top toward the reader. A press is a tap or a turn only by how far it has
  // gone from where it went down (gestureStep), so no tap turns the cell and no drag, however slow, is a tap. A mouse or pen catches the cell at
  // once; a finger waits, because one that sets off vertically is the page scrolling (the canvas leaves vertical panning to the browser), and
  // scrolling must not stop, tip or pick anything on the stage.
  pointerDown(e){
    if(e.button>0)return;const touch=e.pointerType==='touch';this.dragging=true;this.gesture={x0:e.clientX,y0:e.clientY,kind:'press',touch};
    this.dragStart={rx:this.targetRotation.x,ry:this.targetRotation.y};this.lastDrag={t:performance.now(),x:this.targetRotation.x};
    if(!touch)this.grab(e);
  }
  grab(e){this.spin=0;this.canvas.setPointerCapture?.(e.pointerId);this.canvas.classList.add('is-dragging');this.onPart(null,false);}
  pointerMove(e){
    if(!this.dragging){if(e.pointerType!=='touch')this.pick(e,false);return;}
    const g=this.gesture,was=g.kind;if(gestureStep(g,e.clientX,e.clientY,{touch:g.touch})!=='turn')return;if(was!=='turn'&&g.touch)this.grab(e);
    this.targetRotation.x=this.dragStart.rx-g.dx*ORBIT.yawPerPx;
    this.targetRotation.y=Math.max(ORBIT.minElevation-.4,Math.min(ORBIT.maxElevation-.4,this.dragStart.ry+g.dy*ORBIT.pitchPerPx));
    // Release velocity, smoothed over the last few moves, carries the turn on.
    const dt=Math.max(1,performance.now()-this.lastDrag.t),v=(this.targetRotation.x-this.lastDrag.x)/dt;
    this.velocity=dt>80?v:(this.velocity||0)*.6+v*.4;this.lastDrag={t:performance.now(),x:this.targetRotation.x};this.dirty=true;
  }
  pointerUp(e,cancel){
    if(!this.dragging)return;this.dragging=false;this.canvas.classList.remove('is-dragging');const g=this.gesture,recent=performance.now()-this.lastDrag.t<90;
    if(!cancel&&g.kind==='turn'&&recent&&!this.reduced.matches&&Math.abs(this.velocity||0)>.0003)this.spin=Math.max(-.012,Math.min(.012,this.velocity));
    this.velocity=0;if(!cancel&&g.kind==='press'){this.spin=0;this.pick(e,true);}
  }
  vector(p){return new this.T.Vector3(...p);}
  material(color,props={}){const settings={color:new this.T.Color(color).convertSRGBToLinear(),roughness:.5,metalness:.16,...props};if(typeof settings.emissive==='number')settings.emissive=new this.T.Color(settings.emissive).convertSRGBToLinear();return new this.T.MeshStandardMaterial(settings);}
  addBox(parent,size,position,material,part){const m=new this.T.Mesh(new this.T.BoxGeometry(...size),material);m.position.set(...position);parent.add(m);if(part){m.userData.part=part;this.pickMeshes.push(m);}return m;}
  line(points,color,radius=.017,parent=this.cell){
    const T=this.T;const curve=new T.CurvePath();for(let i=1;i<points.length;i++)curve.add(new T.LineCurve3(this.vector(points[i-1]),this.vector(points[i])));
    const m=new T.Mesh(new T.TubeGeometry(curve,Math.max(16,points.length*12),radius,8,false),this.material(color,{emissive:color,emissiveIntensity:.22}));parent.add(m);return m;
  }
  edges(size,position,color,parent=this.cell){const T=this.T;const m=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(...size)),new T.LineBasicMaterial({color,transparent:true,opacity:.5}));m.position.set(...position);parent.add(m);return m;}
  makeCell(){
    const T=this.T;
    // Slab cutaway: electronically conducting hosts outside a shared ionic region.
    const negMat=this.material(0x1d3358,{transparent:true,opacity:.12,depthWrite:false});
    const posMat=this.material(0x52396f,{transparent:true,opacity:.3,depthWrite:false});
    this.addBox(this.cell,[2.4,3,3],[-3.25,0,0],negMat,'negative');this.edges([2.4,3,3],[-3.25,0,0],COLORS.negative);
    this.addBox(this.cell,[2.4,3,3],[3.25,0,0],posMat,'positive');this.edges([2.4,3,3],[3.25,0,0],COLORS.positive);
    const collectorN=this.material(0xa98063,{metalness:.82,roughness:.21});const collectorP=this.material(0xc2cbdd,{metalness:.9,roughness:.18});
    this.addBox(this.cell,[.1,3.25,3.2],[-4.5,0,0],collectorN,'negative');this.addBox(this.cell,[.1,3.25,3.2],[4.5,0,0],collectorP,'positive');
    const grainGeo=new T.IcosahedronGeometry(.39,1),grainMat=this.material(0x7960aa,{metalness:.4,roughness:.37,transparent:true,opacity:.62,depthWrite:false});
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++){const m=new T.Mesh(grainGeo,grainMat);m.position.set(2.48+i*.74,-.93+j*.92,-.94+k*.93);m.rotation.set(i*.7,j*.3,k*.5);m.userData.part='positive';this.pickMeshes.push(m);this.cell.add(m);}
    this.addBox(this.cell,[4.1,3,3],[0,0,0],this.material(0x264e65,{transparent:true,opacity:.055,depthWrite:false}),'electrolyte');
    this.edges([4.1,3,3],[0,0,0],0x427579);
    const sep=this.addBox(this.cell,[.075,3.15,3.1],[0,0,0],this.material(0xb5c7d3,{transparent:true,opacity:.15,depthWrite:false,side:T.DoubleSide}),'separator');
    for(let y=-1.45;y<=1.5;y+=.3)this.line([[0,y,-1.5],[0,y,1.5]],0x8197b7,.009);
    for(let z=-1.4;z<=1.5;z+=.3)this.line([[0,-1.55,z],[0,1.55,z]],0x8197b7,.009);
    this.wire=this.line(ROUTES.cell.electrons,0x7688ac,.035);this.wire.userData.part='circuit';this.pickMeshes.push(this.wire);
    this.device=new T.Group();this.device.position.set(0,2.8,0);this.cell.add(this.device);
    this.deviceBody=this.addBox(this.device,[1.4,.6,.64],[0,0,0],this.material(0x181e31,{metalness:.55}),'load');this.edges([1.4,.6,.64],[0,0,0],0xa898d3,this.device);
    this.deviceBand=this.addBox(this.device,[.8,.06,.025],[0,.01,.335],this.material(0x91e9d1,{emissive:0x91e9d1,emissiveIntensity:.65}));
    this.sourcePlus=this.addBox(this.device,[.045,.24,.028],[.43,.02,.34],this.material(0xe2d6ff));this.sourcePlus.visible=false;
    this.sourceBar=this.addBox(this.device,[.21,.045,.029],[.43,.02,.34],this.material(0xe2d6ff));this.sourceBar.visible=false;
    const sphere=new T.SphereGeometry(.075,16,12);
    this.ionMarkers=Array.from({length:9},()=>{const m=new T.Mesh(sphere,this.material(COLORS.lithium,{emissive:COLORS.lithium,emissiveIntensity:.55}));this.cell.add(m);return m;});
    this.electronMarkers=Array.from({length:9},()=>{const m=new T.Mesh(new T.SphereGeometry(.058,14,10),this.material(COLORS.electron,{emissive:COLORS.electron,emissiveIntensity:.7}));this.cell.add(m);return m;});
    // Lithium is held inside the oxide grains (the host's own layers), not in the pores between them, where electrolyte would be. One mark sits
    // at the centre of each of twenty grains, chosen by a stride so a partial fill is spread through the block. It keeps the key's mint (drawn
    // after the translucent grains) and stays centred on its grain from every angle, so it reads as held inside.
    const at=(i,j,k)=>[2.48+i*.74,-.93+j*.92,-.94+k*.93],centres=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)centres.push(at(i,j,k));
    const sites=centres.map((p,i)=>({p,rank:(i*11)%centres.length})).sort((x,y)=>x.rank-y.rank).slice(0,20).map(x=>x.p);
    this.inventoryPositive=sites.map(p=>{
      const m=new T.Mesh(new T.SphereGeometry(.085,14,10),this.material(COLORS.lithium,{emissive:COLORS.lithium,emissiveIntensity:.5,transparent:true}));m.position.set(...p);m.renderOrder=2;this.cell.add(m);return m;
    });
    // Save opacity once so camera transitions do not compound the fade.
    const seen=new Set();this.cell.traverse(m=>{if(m.material&&!seen.has(m.material)){seen.add(m.material);const mat=m.material;this.fadeMaterials.push({mat,opacity:mat.opacity});mat.transparent=true;}});
  }
  makeGraphite(){
    const T=this.T,g=graphiteGeometry();this.graphiteData=g;this.graphite=new T.Group();this.graphite.position.set(...CELL.graphiteOrigin);this.graphite.scale.setScalar(CELL.graphiteScale);this.scene.add(this.graphite);
    const carbon=new T.InstancedMesh(new T.SphereGeometry(.092,12,8),this.material(COLORS.carbon,{roughness:.4,metalness:.5}),g.atoms.length*g.layerY.length);
    const bonds=new T.InstancedMesh(new T.CylinderGeometry(.027,.027,1,7),this.material(0x425e86,{roughness:.4,metalness:.5}),g.bonds.length*g.layerY.length);
    const dummy=new T.Object3D(),up=new T.Vector3(0,1,0);let ai=0,bi=0;
    for(const y of g.layerY){
      for(const atom of g.atoms){dummy.position.set(atom[0],y,atom[2]);dummy.scale.set(1,1,1);dummy.quaternion.identity();dummy.updateMatrix();carbon.setMatrixAt(ai++,dummy.matrix);}
      for(const [a,b] of g.bonds){const p=this.vector([g.atoms[a][0],y,g.atoms[a][2]]),q=this.vector([g.atoms[b][0],y,g.atoms[b][2]]),delta=q.clone().sub(p);dummy.position.copy(p.add(q).multiplyScalar(.5));dummy.scale.set(1,delta.length(),1);dummy.quaternion.setFromUnitVectors(up,delta.normalize());dummy.updateMatrix();bonds.setMatrixAt(bi++,dummy.matrix);}
    }
    carbon.userData.part='carbon';bonds.userData.part='carbon';this.pickMeshes.push(carbon,bonds);this.graphite.add(carbon,bonds);
    this.lithiumSites=g.sites.map(site=>{const m=new T.Mesh(new T.SphereGeometry(.145,16,12),this.material(COLORS.lithium,{emissive:COLORS.lithium,emissiveIntensity:.38,transparent:true}));m.position.set(...site);m.userData.part='lithium';this.graphite.add(m);this.pickMeshes.push(m);return m;});
    const site=galleryStartSite(g);
    this.galleryPath=graphiteIonPath(site);this.galleryMarker=new T.Mesh(new T.SphereGeometry(.2,20,14),this.material(COLORS.lithium,{emissive:COLORS.lithium,emissiveIntensity:1.1}));this.graphite.add(this.galleryMarker);
    // A soft halo singles out the explanatory ion from the occupancy population.
    this.galleryMarker.add(new T.Mesh(new T.SphereGeometry(.42,24,16),new T.MeshBasicMaterial({color:COLORS.lithium,transparent:true,opacity:.16,depthWrite:false})));
    this.galleryGuide=this.line(this.galleryPath,0x67b59f,.009,this.graphite);this.galleryGuide.material.transparent=true;this.galleryGuide.material.opacity=.5;
    this.galleryMarker.visible=false;this.galleryGuide.visible=false;
    // The patch's bounds, so it can be picked through the electrolyte in front of it in the cell view.
    const half=[Math.max(...g.atoms.map(a=>Math.abs(a[0]))),Math.max(...g.layerY.map(Math.abs)),Math.max(...g.atoms.map(a=>Math.abs(a[2])))].map(v=>(v+.092)*CELL.graphiteScale);
    this.patchBox=new T.Box3(this.vector(CELL.graphiteOrigin.map((o,i)=>o-half[i])),this.vector(CELL.graphiteOrigin.map((o,i)=>o+half[i])));
  }
  makeLabels(){
    const g=this.graphiteData,local=p=>this.vector(CELL.graphiteOrigin.map((o,i)=>o+p[i]*CELL.graphiteScale));
    const top=g.layerY.at(-1),gallery=this.galleryPath[1][1],edge=this.galleryPath[0];
    // The words sit on small dark glass plates: the ion's words ride across the separator's grid and the gallery ion's across the carbon sheets,
    // where a halo alone let the lines strike through them (owner's rule for busy scenes, 6 Oct).
    this.notes=new Annotations(this.labelLayer,{className:'battery-notes is-plated',reduced:this.reduced});
    // On a narrow stage the graphite ring sits further left along the same front edge, so the words hanging below it stay clear of the ion arrow.
    this.points={negative:this.vector([-3.25,-1.5,1.5]),negativeNarrow:this.vector([-3.85,-1.5,1.5]),positive:this.vector([3.6,-1.5,1.5]),separator:this.vector([0,1.575,-1.2]),load:this.vector([.7,3.1,0]),
      ionHome:this.vector([0,-1.5,1.5]),electronHome:this.vector([-4.2,2.15,0]),galleryHome:local(pointAlongPolyline(this.galleryPath,.5)),
      carbon:local([-2.6,top,-1.1]),gallery:local([-3.1,gallery,1.4]),edge:local([edge[0]-.6,edge[1],edge[2]])};
    // Direction arrows: lithium ions through the electrolyte, electrons around the circuit, lithium along a gallery.
    this.annotations=document.createElementNS(SVG,'svg');this.annotations.setAttribute('class','scene-annotations');this.annotations.setAttribute('aria-hidden','true');this.labelLayer.prepend(this.annotations);
    this.arrows=['ion','electron','gallery'].map(kind=>{
      const group=document.createElementNS(SVG,'g'),line=document.createElementNS(SVG,'path'),head=document.createElementNS(SVG,'path');
      group.setAttribute('class',`flow-arrow flow-${kind}`);line.setAttribute('class','line');head.setAttribute('class','head');
      group.append(line,head);this.annotations.append(group);return {kind,group,line,head};
    });
    this.riders={ion:{},electron:{},gallery:{}};
  }
  // The callout that rides a moving ion follows one ion across its window, lets go as it nears the far electrode and picks up the next one
  // entering, so the words stay with one ion at a time. riderStep (battery-model.mjs) keeps the hand-over, a reversal and a pause free of cuts,
  // and a new ion is taken up only while the camera is settled on the cell, so no rider's words are placed on a moving camera.
  rider(kind,now=performance.now()){
    const markers=kind==='ion'?this.ionMarkers:this.electronMarkers,[from,to]=RIDE[kind][this.state.mode],forward=this.state.direction>0;
    const travels=markers.map((m,i)=>{const f=pairFraction(this.phase,i);return forward?f:1-f;});
    const r=this.riders[kind],i=riderStep(r,travels,{from,to,now,moving:now-(this.flowAt??-1e9)<250,ease:this.reduced.matches?0:300,pickup:this.view==='cell'});if(i!=null)r.marker=markers[i];return i==null?null:markers[i];
  }
  // The gallery ion is a rider with a single marker: its words fade with the soft window as it runs. With no other ion to hand over to, a
  // stopped flow closes the window's soft edges, so a paused ion anywhere inside the window comes to full words instead of holding them
  // part-faded (owner's rule: a still view never keeps half-faded words); outside the window, where the marker shrinks, they stay gone.
  galleryRider(now=performance.now()){
    const f=((this.phase%1)+1)%1,t=this.state.mode==='discharge'?f:1-f,moving=now-(this.flowAt??-1e9)<250,{from,to,edge}=RIDE.gallery;
    return riderStep(this.riders.gallery,[t],{from,to,edge:moving?edge:1e-9,now,moving,ease:this.reduced.matches?0:300,pickup:this.view==='inside'});
  }
  project(point){const p=point.clone().project(this.camera);return [(p.x*.5+.5)*this.width,(-p.y*.5+.5)*this.height,p.z];}
  layoutLabels(z){
    if(!this.state||!this.notes)return;
    const discharge=this.state.mode==='discharge',compact=this.notes.compact,cell=()=>this.presence.cell,inside=()=>this.presence.inside;
    const at=(p,r)=>()=>projectPoint(this.T,this.camera,p,this.width,this.height,r);
    // Between hand-overs the anchor stays on the ion just let go (hidden), so words still fading never jump to another place.
    const ride=(kind,radius)=>()=>{const m=this.rider(kind),last=m||this.riders[kind].marker;if(!last)return {x:0,y:0,visible:false};const a=projectPoint(this.T,this.camera,last.getWorldPosition(new this.T.Vector3()),this.width,this.height,radius*last.scale.x);if(!m)a.visible=false;return a;};
    // A rider's words fade with its hand-overs (riderStep's op); the page lays callouts out every frame, so the fade is the only easing they get.
    const rideFade=kind=>()=>(kind==='gallery'?inside():cell())*(this.riders[kind].op||0);
    // The gallery ion's anchor stays on its marker; it is hidden while no rider holds it (between loops, or when the flow stops outside the window).
    const galleryAt=()=>{const i=this.galleryRider(),a=projectPoint(this.T,this.camera,this.galleryMarker.getWorldPosition(new this.T.Vector3()),this.width,this.height,.2*CELL.graphiteScale);if(i==null)a.visible=false;return a;};
    // Callouts are chosen only once the camera has settled on a view, so none is ever placed, or picks its side, on a moving camera. While it
    // flies, the callouts of the view being left stay on their anchors and fade out with the camera (this.presence), so none is cut.
    const shown=this.view==='moving'?this.shownView||'cell':this.view,key=`${this.state.mode}:${shown}:${compact}`;
    if(this.noteKey!==key){
      this.noteKey=key;this.shownView=shown;const P=this.points,pick=this.onPart;
      const ox=this.state.oxidation==='negative',role=anode=>compact?(anode?'Anode':'Cathode'):anode?'Anode · oxidation':'Cathode · reduction';
      this.notes.show(shown==='cell'?[
        {id:'ion',title:'Lithium ion',note:discharge?'Through the electrolyte':'Back to graphite',tone:'#89fcd8',at:ride('ion',.075),dir:[.6,-1],dist:4,fade:rideFade('ion'),live:true,priority:0},
        {id:'electron',title:'Electron',tone:'#cea8ff',at:ride('electron',.058),dir:[-1,-.5],dist:4,fade:rideFade('electron'),phone:false,priority:1},
        // The owner's contract: the active roles live on the scene. Material and polarity sign stay fixed; the role note swaps with the mode. A narrow
        // stage keeps the role alone beside the sign ('role plus polarity sign'), and hangs the graphite words straight down into the clear space
        // under the cell's front edge, from a ring further left on that edge so they end well short of the ion arrow, instead of across the
        // separator. The oxide's words hang a little lower there, clear of the ion arrow's head.
        {id:'negative',title:'Graphite −',note:role(ox),tone:'#97bbff',at:at(compact?P.negativeNarrow:P.negative),dir:compact?[-.1,1]:[-.7,1],dist:compact?30:0,fade:cell,onSelect:pick,phone:'note',label:`Graphite, negative electrode, the ${ox?'anode':'cathode'} while ${discharge?'discharging':'charging'}. Select for explanation.`,priority:2},
        {id:'positive',title:'Cobalt oxide +',note:role(!ox),tone:'#ba9ffc',at:at(P.positive),dir:[.6,1],dist:compact?24:0,fade:cell,onSelect:pick,phone:'note',label:`Cobalt oxide, positive electrode, the ${ox?'cathode':'anode'} while ${discharge?'discharging':'charging'}. Select for explanation.`,priority:3}
      ]:[
        // The direction arrow runs just above the gallery, so the moving ion's words hang below it. A narrow stage has room beside the short path
        // for one set of words only: the moving ion keeps its callout and the edge is named by the arrow's end and the panel.
        {id:'gallery-ion',title:'Lithium ion',note:discharge?'Slides out between two sheets':'Slides in between two sheets',tone:'#89fcd8',at:galleryAt,dir:[-.5,1],dist:6,fade:rideFade('gallery'),live:true,priority:0},
        {id:'edge',title:'Exposed edge',tone:'#89fcd8',at:at(P.edge),dir:[.7,.9],fade:inside,onSelect:pick,phone:false,priority:1},
        {id:'gallery',title:'Gallery',tone:'#89fcd8',at:at(P.gallery),dir:[-1,-.2],fade:inside,onSelect:pick,phone:false,priority:3}
      ]);
    }
    this.notes.frame();
  }
  layoutArrows(z){
    if(!this.state)return;const forward=this.arrowForward??this.state.mode==='discharge',draw=this.arrowDraw,{cellOpacity,insideOpacity}=this.arrowLevels(z);
    const g=this.graphiteData,local=p=>this.vector(CELL.graphiteOrigin.map((o,i)=>o+p[i]*CELL.graphiteScale)),path=this.galleryPath;
    const lift=(g.layerY[1]-g.layerY[0])*.28,site=path[1],outer=path[0];
    const spans={
      ion:[this.vector([.25,-2.35,1.5]),this.vector([2.05,-2.35,1.5]),cellOpacity],
      electron:[this.vector([-3.5,3.22,0]),this.vector([-1.25,3.22,0]),cellOpacity],
      // Discharge: out of the gallery toward the edge. Charge: in from the edge.
      gallery:[local([site[0]+(outer[0]-site[0])*.28,site[1]+lift,site[2]]),local([site[0]+(outer[0]-site[0])*.92,site[1]+lift,site[2]]),insideOpacity]
    };
    for(const a of this.arrows){
      const [p,q,opacity]=spans[a.kind];a.group.style.opacity=opacity.toFixed(3);if(opacity<.02)continue;
      let [sx,sy]=this.project(p),[tx,ty]=this.project(q);if(!forward)[sx,sy,tx,ty]=[tx,ty,sx,sy];
      const L=Math.hypot(tx-sx,ty-sy)||1,ux=(tx-sx)/L,uy=(ty-sy)/L,lineP=clamp01(draw/.85),headP=easeOut((draw-.75)/.25);
      const ex=sx+ux*(L-5)*lineP,ey=sy+uy*(L-5)*lineP;
      a.line.setAttribute('d',`M${sx.toFixed(1)} ${sy.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`);
      const k=.55+.45*headP,len=9*k,half=3.6*k,notch=6.2*k,bx=tx-ux*len,by=ty-uy*len;
      a.head.setAttribute('d',headP>0?`M${tx} ${ty}L${bx-uy*half} ${by+ux*half}L${tx-ux*notch} ${ty-uy*notch}L${bx+uy*half} ${by-ux*half}Z`:'');a.head.style.opacity=headP.toFixed(3);
    }
  }
  // An arrow fades with the camera that leaves its view and never shows before that view's callouts may (presence); arrowOut fades the old
  // direction out before a mode change redraws it.
  arrowLevels(z){const out=this.arrowOut??1;return {cellOpacity:Math.min(1-smooth(clamp01(z/.22)),this.presence.cell)*out,insideOpacity:Math.min(smooth(clamp01((z-.78)/.22)),this.presence.inside)*out};}
  replayArrows(){this.arrowDraw=this.reduced.matches?1:0;this.dirty=true;}
  resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.width=r.width;this.height=r.height;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();if(this.options.labels!==false)this.fitCell();this.dirty=true;this.render();}
  // Frame the whole cell, circuit and callouts at the default angle, whatever the viewport's shape.
  fitCell(){
    const target=this.vector([0,.45,0]),dir=this.vector([6.4,4.6,9.5]),box=[];
    for(const x of [-4.55,4.55])for(const y of [-1.625,1.625])for(const z of [-1.6,1.6])box.push(this.vector([x,y,z]));
    for(const x of [-4.2,4.2])box.push(this.vector([x,2.85,0]));for(const x of [-.7,.7])for(const z of [-.32,.32])box.push(this.vector([x,3.1,z]));
    const narrow=this.width<520,pad={x:narrow?8:40,top:narrow?60:64,bottom:narrow?52:58};
    // Find the closest camera that fits the cell, then centre it in the space the callouts leave.
    this.camera.clearViewOffset();
    const bounds=k=>{this.camera.position.copy(target).add(dir.clone().multiplyScalar(k));this.camera.lookAt(target);this.camera.updateMatrixWorld();
      const pts=box.map(p=>this.project(p));return {x0:Math.min(...pts.map(p=>p[0])),x1:Math.max(...pts.map(p=>p[0])),y0:Math.min(...pts.map(p=>p[1])),y1:Math.max(...pts.map(p=>p[1]))};};
    const fits=k=>{const r=bounds(k);return r.x1-r.x0<=this.width-2*pad.x&&r.y1-r.y0<=this.height-pad.top-pad.bottom;};
    let lo=.7,hi=2.6;for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(fits(mid))hi=mid;else lo=mid;}this.fit=Math.max(.92,hi);
    const r=bounds(this.fit);this.shift=[(r.x0+r.x1)/2-this.width/2,(r.y0+r.y1)/2-(pad.top+this.height-pad.bottom)/2];
  }
  setState(state){
    this.state=state;const phase=this.phase;
    // Ions are staggered by the golden ratio so they cross as a stream, not in marching ranks, and grow or shrink at the electrode faces.
    this.ionMarkers.forEach((m,i)=>{const f=pairFraction(phase,i),p=pointAlongPolyline(ROUTES.cell.ions,f);m.position.set(p[0],[-.85,0,.85][i%3]+[.12,-.1,.04][Math.floor(i/3)],[-.85,0,.85][Math.floor(i/3)]+[-.08,.1,0][i%3]);m.scale.setScalar(endFade(f,.07));m.visible=true;});
    // Electron i shares ion i's offset: each pair leaves graphite together and arrives in the oxide together (one electron per ion).
    // Electrons grow out of the graphite and shrink into the oxide, so the wrap back to the start is never drawn as a jump.
    this.electronMarkers.forEach((m,i)=>{const f=pairFraction(phase,i);m.position.set(...pointAlongPolyline(ROUTES.cell.electrons,f));m.scale.setScalar(endFade(f,.05));m.visible=true;});
    inventoryFills(state.positive).forEach((fill,i)=>this.inventoryPositive[i].material.opacity=fill);
    inventoryFills(state.negative,this.lithiumSites.length).forEach((fill,i)=>{this.lithiumSites[i].material.opacity=fill;this.lithiumSites[i].visible=fill>0;});
    // The highlighted marker explains direction. It is not an additional inventory atom.
    // It grows out of its site and shrinks away through the edge (or the reverse), so the wrap is never drawn as a jump.
    const t=1-((phase%1)+1)%1;this.galleryMarker.position.set(...pointAlongPolyline(this.galleryPath,t));this.galleryMarker.scale.setScalar(endFade(t,.1));
    this.galleryMarker.visible=this.zoom>.65;this.galleryGuide.visible=this.zoom>.65;
    this.sourcePlus.visible=this.sourceBar.visible=state.mode==='charge';
    this.deviceBand.scale.x=state.mode==='charge'?.28:1;this.deviceBand.position.x=state.mode==='charge'?-.43:0;this.deviceBand.material.color.setHex(state.mode==='charge'?COLORS.electron:COLORS.lithium).convertSRGBToLinear();this.deviceBand.material.emissive.copy(this.deviceBand.material.color);
    this.dirty=true;
  }
  setFlow(phase,now=performance.now()){if(phase!==this.phase)this.flowAt=now;this.phase=phase;if(this.state)this.setState(this.state);}
  setView(inside,reduced){this.targetZoom=inside?1:0;this.resetCamera(reduced);if(reduced){this.zoom=this.targetZoom;this.zoomV=0;}this.dirty=true;}
  resetCamera(reduced=false){
    // Unwind whole turns first, so the reset takes the short way back to the front view.
    this.spin=0;this.rotation.x=wrapAngle(this.rotation.x);this.targetRotation={x:0,y:0};if(reduced)this.rotation={x:0,y:0};this.dirty=true;
  }
  select(part){this.notes?.select(part);}
  pick(event,pin){
    const r=this.canvas.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects(this.pickMeshes,false).filter(hit=>hit.object.visible&&(this.zoom<.5?!['carbon','lithium'].includes(hit.object.userData.part):['carbon','lithium'].includes(hit.object.userData.part)));
    // The electrolyte is a near-invisible volume: when a ray through it goes on to meet the separator, or the graphite patch seen through it, that is what the pointer is on.
    let hit=hits[0];if(hit?.object.userData.part==='electrolyte'){const next=hits.find(h=>h.object.userData.part!=='electrolyte'),part=next?.object.userData.part;if(part==='separator'||part==='negative'&&this.raycaster.ray.intersectsBox(this.patchBox))hit=next;}
    this.onPart(hit?.object.userData.part||null,pin);
  }
  // One frame of camera, callout and arrow state, without drawing (so its timing can be checked in Node).
  advance(dt=16){
    {const d=this.zoom-this.targetZoom,s=Math.min(dt,60)/1000,w=DIVE.spring,e=Math.exp(-w*s),c=this.zoomV+w*d;
      if(Math.abs(d)>.0005||Math.abs(this.zoomV)>.002){this.zoom=clamp01(this.targetZoom+(d+c*s)*e);this.zoomV=(this.zoomV-w*c*s)*e;this.dirty=true;}else{this.zoom=this.targetZoom;this.zoomV=0;}}
    // A settled view's arrows draw in again only if they had faded out with the camera; after a turn back mid-flight they return as they were.
    const view=Math.abs(this.zoom-this.targetZoom)<DIVE.settle?(this.targetZoom>.5?'inside':'cell'):'moving';if(view!==this.view){const first=this.view==null;this.view=view;if(view!=='moving'&&(first||this.presence[view]<.02))this.replayArrows();}
    // Each view's callouts fade with the camera that leaves it and return only once the camera has settled on it.
    if(this.notes){const ease=this.reduced.matches?0:300;this.presence.cell=calloutPresence(this.presence.cell,1-smooth(clamp01(this.zoom/.3)),view==='cell',dt,ease);this.presence.inside=calloutPresence(this.presence.inside,smooth(clamp01((this.zoom-.7)/.3)),view==='inside',dt,ease);if(view!=='moving'&&this.presence[view]<1)this.dirty=true;}
    // A mode change fades the arrows out in their old direction (240 ms), then draws them in the new one.
    if(this.state){const forward=this.state.mode!=='charge',d=this.reduced.matches?1:dt/240;if(this.arrowForward==null)this.arrowForward=forward;
      if(this.arrowForward!==forward){this.arrowOut=Math.max(0,this.arrowOut-d);if(!this.arrowOut){this.arrowForward=forward;this.arrowOut=1;this.replayArrows();}this.dirty=true;}
      else if(this.arrowOut<1){this.arrowOut=Math.min(1,this.arrowOut+d);this.dirty=true;}}
    if(this.spin&&!this.dragging){this.targetRotation.x+=this.spin*dt;this.spin*=Math.exp(-dt/ORBIT.spinDecay);if(Math.abs(this.spin)<.00002)this.spin=0;this.dirty=true;}
    for(const axis of ['x','y']){const d=this.targetRotation[axis]-this.rotation[axis];if(Math.abs(d)>.0001){this.rotation[axis]+=d*Math.min(1,dt/ORBIT.follow);this.dirty=true;}else this.rotation[axis]=this.targetRotation[axis];}
    if(this.arrowDraw<1){this.arrowDraw=Math.min(1,this.arrowDraw+dt/900);this.dirty=true;}
  }
  render(dt=16){
    this.advance(dt);
    if(!this.dirty)return;this.dirty=false;const z=smooth(this.zoom),T=this.T;
    const aspect=this.camera.aspect,mobile=aspect<1.25,dist=this.options.labels===false?Math.max(1,1.15/aspect):this.fit;
    const base=this.vector([6.4*dist,4.6*dist,9.5*dist]),near=this.vector([CELL.graphiteOrigin[0]+(mobile?2.65:2.15),mobile?1.6:1.3,mobile?3.65:3.05]);
    const target=this.vector([0,.45,0]).lerp(this.vector(CELL.graphiteOrigin),z);
    // Orbit on a sphere around the target: yaw turns freely, elevation is held between a low side view and a near top view.
    const offset=base.lerp(near,z).sub(target),radius=offset.length(),azimuth=Math.atan2(offset.x,offset.z)+this.rotation.x;
    const elevation=Math.max(ORBIT.minElevation,Math.min(ORBIT.maxElevation,Math.asin(offset.y/radius)+this.rotation.y));
    this.camera.position.set(target.x+radius*Math.cos(elevation)*Math.sin(azimuth),target.y+radius*Math.sin(elevation),target.z+radius*Math.cos(elevation)*Math.cos(azimuth));
    this.camera.lookAt(target);this.camera.updateMatrixWorld();
    if(this.shift)this.camera.setViewOffset(this.width,this.height,this.shift[0]*(1-z),this.shift[1]*(1-z),this.width,this.height);
    // The cell stays in view for the first part of the dive, so the graphite patch is seen in place before the camera enters it.
    const fade=1-smooth(clamp01((z-.3)/.55));this.fadeMaterials.forEach(({mat,opacity})=>mat.opacity=opacity*fade);this.cell.visible=fade>.001;
    if(this.state)inventoryFills(this.state.positive).forEach((fill,i)=>this.inventoryPositive[i].material.opacity=fill*fade);
    this.galleryGuide.visible=z>.7;this.galleryMarker.visible=z>.7;
    if(this.notes){this.layoutArrows(z);}
    this.renderer.render(this.scene,this.camera);
    if(this.notes)this.layoutLabels(z);
  }
}
