import {initialState,reduce,reducedFromSearch,landing,display,VIEWS,ease,VIEW} from './nanoparticle-state.mjs?v=20261016-1';
import {viewParams,decodeView,encodeView,viewWriter} from './view-state.mjs';
import {representative,siteDescription,neighborCopy,siteCopy,callouts,SITE_NAMES,bindingSites,add,mul} from './nanoparticle-model.mjs?v=20261016-1';
import {fallbackSVG} from './nanoparticle-fallback.mjs?v=20261016-1';
import {ParticleScene} from './nanoparticle-scene.mjs?v=20261016-1';
import {OPENING_BEATS,OPENING_STARTS,OPENING_END,LIFT_END,openingPhase,fastForward,hullOpacity,liftPlays} from './nanoparticle-opening.mjs?v=20261018-1';
import {Annotations} from './annotations.mjs';
const $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)');
// Layout v2 (nanoparticle-v2.mjs): the figure has its own column (Fig3DPairFigure), the stage waits empty until the lift
const V2=document.documentElement.classList.contains('layout-v2');
const forceReduced=reducedFromSearch(location.search);
// The shared first-visit opening marks the page while it runs and after it ends. Only then does the paper-to-model tour play:
// later visits, deep links, ?no-opening, ?reduced and reduced motion start in the explorer.
const openingRan=['fig-opening','fig-opened'].some(c=>document.documentElement.classList.contains(c));
let state=initialState(reduced.matches||forceReduced,openingRan),scene,failed=false,elapsed=0,lastTime=0,phase=-1,lifting=false,pendingAim=null,invite=false,held=null;
// A shared address (#view=…&face=…) reopens that view on the first drawn frame; any hash already skips the tour.
const sharedView=viewParams();if(sharedView)state=decodeView(VIEW,sharedView,state,reduce);
const writeView=viewWriter();let viewWritten=null;
if(sharedView)requestAnimationFrame(()=>requestAnimationFrame(()=>$('explorer').scrollIntoView({block:'start'})));
// While the lift plays, the stage still shows the tour (held): the tabs, controls, caption and scene keep showing it, and the reader's
// choice appears on the frame the lift ends, with its camera move. Pause and reduced motion reach the scene at once.
const shown=()=>display(state,held);
const INVITE=['YOUR EXPLORER','Choose an atom','Choose an atom to see its neighbors. Turn the particle, or use the site shortcuts to compare face, edge, corner and interior.'];
const names=SITE_NAMES;
function caption(kicker,title,copy){$('caption-kicker').textContent=kicker;$('caption-title').textContent=title;$('caption-copy').textContent=copy;}
function action(event,{camera=true}={}){
 // A press with the stage out of view, where the lift cannot play, lands the lift first: a control always takes effect at once.
 if(lifting&&!liftPlays(elapsed/1000,scene.active))endLift();
 $('explorer').dataset.lastAction=event.type+':'+(event.value||'');$('explorer').dataset.actions=($('explorer').dataset.actions||'').split('|').slice(-7).concat(event.type+':'+(event.value||'')).join('|');const inputTime=performance.now();const before=state,wasIntro=state.intro,wasStacking=state.stacking;
 // Explore lands exactly where the full opening ends: the corner atom, the whole particle, one invitation.
 const lands=event.type==='explore'&&wasIntro;if(lands)state=landing(state);
 state=reduce(state,event);if(wasIntro&&!state.intro)finishIntro(true,before);
 // Explore's invitation waits for the lift: until the atoms have resolved, a tap has nothing to choose. It stays until the reader's next step.
 if(lands)invite=lifting?'held':'shown';else if(event.type!=='pause')invite=false;
 update();if(lands&&invite==='shown')caption(...INVITE);if(scene)scene.inputTime=inputTime;scene?.setState(shown());
 if(!camera||!scene)return;
 if(lands)scene.overview();
 // The lift is drawn for the tour's own camera: a move asked for during it starts as soon as the model has resolved, never under the paper.
 const aim=()=>{
  if(event.type==='view'){
   if(state.view==='size')scene.overview(true);
   else if(state.view==='surfaces')scene.overview();
   else if(state.view==='neighbors')scene.focusAtom(state.selected);
   else scene.focusFace(state.faceId,true);
  }
  if(event.type==='site'&&wasStacking)scene.focusFace(state.faceId,true);
  if(event.type==='face')scene.focusFace(state.faceId,state.view==='binding');
  if(event.type==='atom'||event.type==='shortcut')scene.focusAtom(state.selected);
  if(event.type==='reset')scene.overview();
  if(event.type==='stacking'){if(state.stacking)scene.focusStacking();else scene.focusFace(state.faceId,true);}
  // Opening or closing the cut turns the camera so the change can be seen; for an interior atom it confirms the view from the hidden side.
  if(event.type==='cutaway'&&state.selected)scene.focusAtom(state.selected);
 };
 if(lifting){const prior=pendingAim;pendingAim=()=>{prior?.();aim();};}else aim();
}
// When the lift ends, or is cut short: the reader's choice appears in the controls, caption and scene together, camera moves asked for
// during the lift play in order, so the last one wins (turning or zooming the camera by hand cancels them), and a held invitation
// appears now that a tap can answer it. The identity badge arrives with the model, never over the paper.
function landed(){const was=held;held=null;$('scene-badge').hidden=false;if(was){scene?.setState(state);update();}const aim=pendingAim;pendingAim=null;aim?.();if(invite==='held'){invite='shown';caption(...INVITE);}}
function finishIntro(animate=true,from=state){ if($('intro-transport').contains(document.activeElement))queueMicrotask(()=>$('particle').focus({preventScroll:true})); if(scene){scene.travel=null;scene.canvas.dataset.moving='false';} $('intro-transport').hidden=true;
 // An interrupted lift plays out at three times speed instead of cutting from the paper to the model.
 // It plays only on screen: with the stage out of view it lands at once, so nothing waits on a stage nobody can see.
 lifting=animate&&!!scene&&!failed&&!state.reduced&&!$('paper').hidden&&liftPlays(elapsed/1000,scene.active);
 if(lifting){held=from;lastTime=0;scene.wake();}else endLift(); }
function endLift(){lifting=false;$('paper').hidden=true;$('shape-traces').style.display='none';$('particle').style.opacity='';$('explorer').dataset.flying='false';scene?.setIntro(0);landed();}
function update(){
 if(state!==viewWritten&&!state.intro){viewWritten=state;writeView(encodeView(VIEW,state,initialState(state.reduced,false),reduce));}
 // The controls tell the truth about the stage: during the lift they keep showing the tour, which is still what the stage shows.
 const v=shown();
 if(failed)$('fallback-graphic').innerHTML=fallbackSVG(state);
 $('explorer').dataset.view=v.view;$('explorer').dataset.paused=String(state.paused);$('explorer').dataset.cutaway=v.cutaway;$('explorer').dataset.intro=String(state.intro);$('explorer').dataset.held=String(!!held);$('explorer').dataset.shells=v.model.shells;$('explorer').dataset.selected=v.selected||'';
 // What layout v2 reads (nanoparticle-v2.mjs): the face, the binding site and its layers, and the chosen atom's neighbour count
 // (np- names: the page's own handlers look for [data-face] and [data-site])
 Object.assign($('explorer').dataset,{npFace:v.faceId,npSite:v.site,npStacking:String(v.stacking),npCn:String(v.model.byId.get(v.selected)?.cn??'')});
 document.querySelectorAll('.view-tabs [data-view]').forEach(b=>{const on=b.dataset.view===v.view;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});$('inspection').setAttribute('aria-labelledby','tab-'+v.view);
 $('explore-controls').hidden=state.intro||!!held;
 $('face-controls').hidden=!['surfaces','binding'].includes(v.view);$('neighbor-controls').hidden=v.view!=='neighbors';$('size-controls').hidden=v.view!=='size';$('binding-controls').hidden=v.view!=='binding';
 document.querySelectorAll('[data-face]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.face.split(':')[0]===v.faceId.split(':')[0]));
 $('scene-help').firstChild.textContent=failed?'Use the view and site controls below':v.view==='surfaces'?'Drag to turn · select a face':'Drag to turn · select an atom';
 if(state.intro||held)return;
 const m=state.model,face=m.facets.find(f=>f.id===state.faceId);
 if(state.view==='surfaces')caption('TWO SURFACE PATTERNS',face.family==='100'?'A square terrace':'A triangular terrace',face.family==='100'?'Look along this {100} face: the atoms form a square grid. Turn the particle to see how the terrace meets its neighbors.':'On this {111} face, the atoms form a close-packed triangular pattern. The same crystal can expose both arrangements.');
 if(state.view==='neighbors'){
  const a=m.byId.get(state.selected);if(a){if(!invite)caption('SAME CRYSTAL · DIFFERENT SURROUNDINGS',siteDescription(a),neighborCopy(a,state.cutaway));$('neighbor-count').textContent=a.cn;$('neighbor-dots').innerHTML='<circle cx="52" cy="52" r="6" fill="#daeaff"/>'+Array.from({length:12},(_,i)=>{const t=i*Math.PI/6;return `<circle cx="${52+37*Math.cos(t)}" cy="${52+37*Math.sin(t)}" r="4.5" fill="${i<a.cn?'#acc8ff':'none'}" stroke="${i<a.cn?'#acc8ff':'#4b5265'}" stroke-width="1.4"/>`;}).join('');}
  $('cutaway').setAttribute('aria-pressed',state.cutaway);$('cutaway').innerHTML=(state.cutaway?'Restore the surface':'Show inside')+' <span aria-hidden="true">↗</span>';
  document.querySelectorAll('[data-atom]').forEach(b=>b.setAttribute('aria-pressed',state.selected===representative(m,b.dataset.atom,state.faceId).id));
 }
 if(state.view==='size'){
  caption('LESS SIZE · MORE SURFACE','Small changes the balance','The outside grows with area; the interior grows with volume. Smaller particles put a larger share of their atoms at the surface.');
  $('shells').value=m.shells;$('shell-count').textContent=m.shells;$('total-atoms').textContent=m.atoms.length.toLocaleString();$('surface-percent').innerHTML=(m.surfaceFraction*100).toFixed(1)+'<span>%</span>';$('surface-exact').textContent=`${m.surfaceCount.toLocaleString()} surface atoms / ${m.atoms.length.toLocaleString()} total`;
  $('fraction-bar').firstElementChild.style.width=(m.surfaceFraction*100)+'%';$('fraction-bar').setAttribute('aria-label',`${m.surfaceCount} of ${m.atoms.length} atoms are at the surface`);
 }
 if(state.view==='binding'){
  const sites=bindingSites(m,state.faceId),site=sites[state.site],copy=siteCopy(site);caption('GEOMETRY BEFORE CHEMISTRY',names[state.site],copy.caption);
  const signature=Object.keys(sites).join(',');if($('binding-choices').dataset.signature!==signature){$('binding-choices').dataset.signature=signature;$('binding-choices').replaceChildren(...Object.keys(sites).map(k=>{const b=document.createElement('button');b.textContent=names[k];b.dataset.site=k;b.addEventListener('click',()=>action({type:'site',value:k}));return b;}));}
  document.querySelectorAll('[data-site]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.site===state.site));$('stacking').hidden=!['fcc','hcp'].includes(state.site);$('stacking').setAttribute('aria-pressed',state.stacking);$('stacking').textContent=state.stacking?'Restore the terrace ↙':'Reveal underlying layers ↗';$('binding-detail').textContent=state.stacking?copy.detail:`${site.atomIds.length} surface atom${site.atomIds.length>1?'s frame':' frames'} this position. The diamond marks a location, not a molecule.`;
 }
 $('scene-label').hidden=true;
 notesFor();
}

// Callouts in the scene: the face, atom or binding site the caption is talking about carries its own label.
let notes=null,noteKey='',inFrame=false;
function worldRadius(){const c=scene.camera;return (c.top-c.bottom)/scene.height;}
function facing(p){const c=scene.camera.position,t=scene.pose.target,d=[c.x-t[0],c.y-t[1],c.z-t[2]],n=Math.hypot(...d),q=Math.hypot(...p)||1;return (p[0]*d[0]+p[1]*d[1]+p[2]*d[2])/(n*q);}
function atAtom(a,r=.56){return ()=>{if(!scene||!a)return null;const pr=scene.project(a.p);return {x:pr.x,y:pr.y,r:r/worldRadius(),visible:pr.z<1&&(a.cn===12||facing(a.p)>-.05)};};}
function atPoint(p,r=0){return ()=>{if(!scene)return null;const pr=scene.project(p);return {x:pr.x,y:pr.y,r:r?r/worldRadius():0};};}
function notesFor(){
 if(!scene||failed)return;
 if(!notes){
  notes=new Annotations($('scene-stage'),{className:'particle-notes is-plated',compactWidth:520,avoid:()=>{if(!scene||!state.model)return[];const c=scene.project([0,0,0]),R=state.model.radius??(state.model.radius=Math.max(...state.model.atoms.map(a=>Math.hypot(...a.p))));return[{x:c.x,y:c.y,r:R*.95/worldRadius()}];}});
 }
 // No label is drawn over the paper: labels arrive once the lift has finished.
 if(state.intro||lifting){if(noteKey!=='intro'){noteKey='intro';notes.hide();}return;}
 const m=state.model,gold='#f1cc72',blue='#a7c9ff',violet='#d1bcf8',red='#ffb3a3',site=bindingSites(m,state.faceId)[state.site];
 // The words and keys come from the model (callouts); the page adds where each callout sits and its colour.
 const list=callouts(state).map(c=>({
  face:()=>({...c,tone:m.facets.find(f=>f.id===state.faceId).family==='100'?red:violet,at:atAtom(representative(m,'face',state.faceId)),dir:[1,-.6],dist:40,phone:'note'}),
  atom:()=>({...c,tone:blue,at:atAtom(m.byId.get(state.selected),.6),dir:[1,-.65],dist:46,phone:'note'}),
  surface:()=>({...c,tone:gold,at:atAtom(representative(m,'edge')),dir:[1,-.6],dist:40,phone:'note'}),
  site:()=>({...c,tone:violet,at:atPoint(add(site.p,mul(site.normal,1.52)),.42),dir:[1,-.6],dist:40,phone:'note'}),
  under:()=>({...c,tone:'#ede2ff',at:atAtom(m.byId.get(site.underlying),.5),dir:[-1,.6],dist:40,phone:false})})[c.kind]());
 const key=JSON.stringify(list.map(x=>[x.id,x.title,x.note]))+state.selected+state.faceId;
 // A label created inside the scene's frame would paint once before the label layer places it; create it just after the frame instead.
 if(key!==noteKey){noteKey=key;if(inFrame)setTimeout(()=>noteKey===key&&notes.show(list));else notes.show(list);}
}
function advance(now){inFrame=true;try{tick(now);}finally{inFrame=false;}}
function tick(now){
 $('explorer').dataset.flying=String(lifting||(state.intro&&elapsed/1000>=OPENING_STARTS[2]&&elapsed/1000<LIFT_END));
 if(lifting){if(lastTime)elapsed=1000*fastForward(elapsed/1000,Math.min(60,now-lastTime)/1000);lastTime=now;lift(elapsed/1000);lifting=elapsed/1000<LIFT_END;if(lifting)scene.wake();else{lastTime=0;landed();notesFor();}return;}
 if(!state.intro||state.paused){lastTime=0;return;}
 // The first-visit page opening holds this clock until the stage has appeared.
 if(window.Fig3DOpening?.holding){lastTime=0;return;}
 if(lastTime)elapsed+=Math.min(60,now-lastTime);lastTime=now;
 const seconds=elapsed/1000,p=openingPhase(seconds);
 if(p!==phase){phase=p;caption(...OPENING_BEATS[p].copy);
  if(p===2){scene.moveTo({...scene.home,yaw:1.02,elevation:.5},3200);}
  if(p>=3){const kind=OPENING_BEATS[p].site;state=reduce(state,{type:'intro',patch:{view:'neighbors',selected:representative(state.model,kind).id}});update();scene.setState(state);scene.focusAtom(state.selected);}
 }
 lift(seconds);if(seconds>=OPENING_STARTS[3])$('scene-badge').hidden=false;
 if(seconds>=OPENING_END)action({type:'explore'});
}
// The paper lies back and fades while the outlines travel onto the model and the hull dissolves into atoms.
function lift(seconds){
 if(seconds>=LIFT_END){$('paper').hidden=true;$('shape-traces').style.display='none';$('particle').style.opacity='';scene.setIntro(0);return;}
 const modelTime=seconds-OPENING_STARTS[2],transition=ease(modelTime/5);
 // In v2 the stage waits empty beside the figure; the model fades in as the outlines leave the figure for it
 if(V2)$('particle').style.opacity=String(ease(modelTime/2.2));$('paper').style.opacity=1-transition;$('paper').style.transform=`perspective(1100px) rotateX(${transition*15}deg) scale(${1-transition*.14})`;$('paper').style.pointerEvents=transition>.5?'none':'';scene.setIntro(hullOpacity(seconds));drawTraces(seconds,transition);
}
// In v2 the outlines start on the panels in the figure column and travel over the explorer (Fig3DPairFigure: the figure,
// the layer they travel in, each panel's box in the figure's pixels) to the model, drawn shifted while the stage is partly
// off screen (Fig3DStageShift).
function drawTraces(seconds,t){
 const pair=globalThis.Fig3DPairFigure?.(),stage=$('scene-stage').getBoundingClientRect(),L=pair?pair.layer.getBoundingClientRect():stage,sh=pair?globalThis.Fig3DStageShift?.()||0:0;
 $('shape-traces').setAttribute('viewBox',`0 0 ${L.width} ${L.height}`);
 for(const [panel,id,fid,source] of [['a','square-trace','100:1,0,0',[[.594,.526],[.719,.489],[.836,.528],[.711,.584]]],['c','triangle-trace','111:1,1,1',[[.686,.432],[.576,.607],[.813,.603]]]]){
  let r;if(pair){const ir=pair.img.getBoundingClientRect(),[x0,y0,x1,y1]=pair.panels[panel],k=ir.width/pair.natural[0];r={left:ir.left+x0*k,top:ir.top+y0*k,width:(x1-x0)*k,height:(y1-y0)*k};}else r=$('paper-'+panel).getBoundingClientRect();
  const face=state.model.facets.find(f=>f.id===fid),dest=face.vertices.map(p=>{const q=scene.project(add(p,mul(face.normal,.64)));return {x:q.x+stage.left-L.left,y:q.y+stage.top-L.top-sh};});
  const pts=source.map((p,i)=>{const a={x:r.left-L.left+p[0]*r.width,y:r.top-L.top+p[1]*r.height};return [a.x+(dest[i].x-a.x)*t,a.y+(dest[i].y-a.y)*t];});
  const path=$(id);path.setAttribute('d','M'+pts.map(p=>p.join(',')).join('L')+'Z');path.style.strokeDashoffset=1-ease((seconds-OPENING_STARTS[1])/2.5);path.style.opacity=1-ease((seconds-OPENING_STARTS[2]-3)/2.5);
 }
}
function failure(){if(failed)return;failed=true;state=reduce(state,{type:'explore'});finishIntro(false);$('fallback').hidden=false;$('scene-stage').dataset.fallback=true;$('particle').tabIndex=-1;$('return').hidden=true;document.querySelector('.camera-controls').hidden=true;document.querySelector('.touch-help').hidden=true;document.querySelectorAll('[data-camera]').forEach(b=>b.disabled=true);invite=false;update();}
try{if(new URLSearchParams(location.search).has('fallback'))throw Error('Requested static fallback');scene=new ParticleScene($('particle'),{onAtom:id=>action({type:'atom',value:id}),onFace:id=>action({type:'face',value:id}),onInterrupt:()=>{pendingAim=null;if(state.intro){const before=state;state=reduce(state,{type:'explore'});finishIntro(true,before);update();scene?.setState(shown());}},onHover:a=>{if(state.intro||lifting)return;const label=$('scene-label');if(a){label.textContent=`${siteDescription(a)} · ${a.cn} neighbors`;label.hidden=false;}else label.hidden=true;},onFrame:advance,onFailure:failure});scene.setState(state);if(state.intro){scene.setIntro(1);if(V2)$('particle').style.opacity='0';caption(...OPENING_BEATS[0].copy);}else finishIntro(false);}catch(error){console.warn('Nanoparticle static fallback:',error.message);failure();}
update();
// Reviewing the source never restarts the opening or changes the selected model.
// The native modal provides focus containment, Escape and return to the opener.
let resumeAfterPaper=false;
$('paper-open').addEventListener('click',()=>{
 resumeAfterPaper=!state.paused;
 if(resumeAfterPaper)action({type:'pause'},{camera:false});
 lastTime=0;scene?.stop();$('paper-dialog').showModal();
});
$('paper-close').addEventListener('click',()=>$('paper-dialog').close());
$('paper-dialog').addEventListener('close',()=>{
 lastTime=0;
 if(resumeAfterPaper&&state.paused)action({type:'pause'},{camera:false});
 resumeAfterPaper=false;scene?.wake();
});
$('explore-now').addEventListener('click',()=>action({type:'explore'}));$('intro-pause').addEventListener('click',()=>{action({type:'pause'},{camera:false});$('intro-pause').textContent=state.paused?'Resume':'Pause';$('intro-pause').setAttribute('aria-label',state.paused?'Resume opening':'Pause opening');scene?.wake();});
document.querySelectorAll('.view-tabs [data-view]').forEach(b=>{b.addEventListener('click',()=>action({type:'view',value:b.dataset.view}));b.addEventListener('keydown',e=>{let i=VIEWS.indexOf(state.view);if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();i=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;action({type:'view',value:VIEWS[i]});$('tab-'+VIEWS[i]).focus();}});});
document.querySelectorAll('[data-face]').forEach(b=>b.addEventListener('click',()=>action({type:'face',value:b.dataset.face})));
document.querySelectorAll('[data-atom]').forEach(b=>b.addEventListener('click',()=>action({type:'shortcut',value:b.dataset.atom})));
$('cutaway').addEventListener('click',()=>action({type:'cutaway'}));$('return').addEventListener('click',()=>{scene?.interrupt();scene?.overview();});
$('stacking').addEventListener('click',()=>action({type:'stacking'}));$('shells').addEventListener('input',e=>action({type:'shells',value:Number(e.target.value)},{camera:false}));
document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>{if(!scene)return;const k=b.dataset.camera;scene.interrupt();if(k==='up')scene.orbit(0,-28);if(k==='down')scene.orbit(0,28);if(k==='in')scene.zoom(.85);if(k==='out')scene.zoom(1.18);if(k==='reset')scene.overview(state.view==='size');}));
// Reduced motion switched on mid-move ends the move where it was going, at once; then any move held for the lift is applied.
reduced.addEventListener('change',e=>{if(e.matches&&state.intro)state={...state,intro:false,paused:false};state={...state,reduced:e.matches};scene?.setState(shown());
 if(e.matches){if(scene?.travel)scene.moveTo(scene.travel.to);finishIntro(false);}update();});
window.addEventListener('pagehide',()=>scene?.stop());window.addEventListener('pageshow',()=>scene?.wake());
