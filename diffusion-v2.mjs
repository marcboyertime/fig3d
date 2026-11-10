// Layout v2 for the diffusion foundation (the default; ?layout=v1 shows the earlier layout): one screen is the instrument,
// with the quiet pass (design/layout-overhaul/spec.md; DESIGN_AND_PRODUCT_HANDOFF.md, 18 October 2026). The layout is
// shared (kit/layout-v2.mjs, layout-v2.css); this is the page's adapter. The Blender film stays the large picture, in the
// stage; its linked 2D view takes the figure's place: the film's own concentration profile and readouts through its four
// beats, then the radius explorer's cross-section for the size comparison. Scrolling down plays the film on, a beat at a
// time (film.js, Fig3DFilm); the size comparison lets it loop. Five steps in two chapters are in <template id="v2-tpl">,
// cut from the page's words and model notes.
import {layoutV2,createLayoutV2} from './kit/layout-v2.mjs';

const $=s=>document.querySelector(s);
const SEC=[
 {id:'fill',ch:0,short:'Filling',beat:[0,96]},{id:'center',ch:0,short:'The center',beat:[96,192]},
 {id:'empty',ch:0,short:'Emptying',beat:[192,288]},{id:'last',ch:0,short:'The last to empty',beat:[288,384]},
 {id:'size',ch:1,short:'Size'}];
const NOTE={film:'Concentration from center to surface, for the frame on screen',size:'Relative concentration c/cₛ across the particle, 2 s in, for this radius'};
const TITLE={film:'The film’s field · center to surface',size:'Fig. 02 · a radial cross section'};

if(layoutV2()){
 const ex=$('.film-grid'),stage=$('.film-stage'),video=$('#film-video');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||/[?&](reduced|fallback)\b/.test(location.search);

 // ———— The workspace: the linked 2D view beside the film, built at once so the page never shows its earlier grid ————
 ex.classList.add('figure-pair');ex.id='explorer';
 const head=document.createElement('div');head.className='pair-head paper-head';head.innerHTML='<p class="pair-title"></p>';
 const mhead=document.createElement('div');mhead.className='pair-head model-head';
 const col=document.createElement('figure');col.className='paper-column v2-paper v2-dview';
 const figs={film:document.createElement('div'),size:document.createElement('div')};
 figs.film.className=figs.size.className='v2-dfig';
 figs.film.append($('.film-profile'),$('.film-readout'));
 figs.size.append($('.particle-stage'),$('.concentration-key'));
 const box=document.createElement('div');box.className='v2-dfigs';box.append(figs.film,figs.size);
 const note=document.createElement('p');note.className='panel-note';note.setAttribute('aria-live','polite');
 const cap=document.createElement('figcaption');cap.className='paper-details';cap.append(note);
 col.append(box,cap);
 const stageCol=document.createElement('div');stageCol.className='stage-column';
 ex.prepend(head,mhead,col);stage.before(stageCol);stageCol.append(stage);
 // "More on this step": the film's clock, Play and the scrubber; the size comparison's profile, inputs and the model notes
 const pane=document.createElement('div');pane.className='v2-pane';
 pane.append($('#film-time-note'),$('.film-controls'),$('.profile-header'),$('.profile-plot'),$('.fixed-inputs'),$('#model-open'));

 // The figure column changes view by a crossfade, gliding to the new view's height (never a cut)
 let shownFig='';
 function showFig(k,instant){
  if(shownFig===k)return;const prev=figs[shownFig],next=figs[k];shownFig=k;
  head.firstChild.textContent=TITLE[k];note.textContent=NOTE[k];
  next.hidden=false;
  if(instant||reduced||!prev){for(const f of Object.values(figs)){f.classList.toggle('on',f===next);f.hidden=f!==next;}box.style.height='';return;}
  box.style.height=box.offsetHeight+'px';next.classList.add('on');prev.classList.remove('on');
  requestAnimationFrame(()=>{box.style.height=next.offsetHeight+'px';});
  setTimeout(()=>{if(shownFig===k){prev.hidden=true;box.style.height='';}},460);
 }
 showFig('film',true);

 const v2=createLayoutV2({
  template:$('#v2-tpl'),sections:SEC,chapters:['Watch it happen','Compare sizes'],reduced,
  bar:$('.preview-header'),brand:$('.preview-header .brand'),back:$('.preview-header > a:last-child'),title:'Diffusion in a particle',
  explorer:ex,stage,paper:col,input:stage,
  shifted:()=>[video,$('.film-stage > .film-notes')],
  // A beat of the film for each of the first four steps; the size comparison lets the film loop beside the cross section
  goModel(k){
   const s=SEC[k];showFig(s.beat?'film':'size');
   if(s.beat)window.Fig3DFilm?.beat(...s.beat);else window.Fig3DFilm?.loop();
  },
  onModel(k,more){if(pane.parentNode!==more)more.append(pane);},
  more(k,body){if(pane.parentNode!==body)body.append(pane);},
  hash:false
 });
 // The size comparison's result, live, in its step
 $('.v2-step[data-sec="size"] .v2-rx').append($('.result-line'));
 $('.v2-step .v2-more-body').append(pane);

 // Start on the step the address names: a step's own id (#size), the size comparison (#explore), or a shared radius
 const hash=location.hash.slice(1);let k=v2.idx(hash==='explore'?'size':hash),linked=k>=0;
 if(!linked&&/(^|&)radius=/.test(hash)){k=v2.idx('size');linked=true;}
 v2.start(k,linked);
}
