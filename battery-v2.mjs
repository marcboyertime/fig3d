// Layout v2 for the battery foundation (the default; ?layout=v1 shows the earlier layout): one screen is the instrument,
// with the quiet pass (design/layout-overhaul/spec.md, mockups/battery-desktop.html; DESIGN_AND_PRODUCT_HANDOFF.md,
// 18 October 2026). The layout is shared (kit/layout-v2.mjs, layout-v2.css); this is the page's adapter. A foundation has
// no paper figure: the lithium-inventory chart, linked to the cell, takes the figure's place, with the inventory sentence
// under it; the two half-reactions sit in their own step. Six steps in the spec's three chapters are in
// <template id="v2-tpl">, cut from the page's words and model notes. Each step puts the cell in its state through the
// page's own controls (view and mode), so battery.js keeps one code path; the address keeps the page's shared view, which
// lands on the step.
import {layoutV2,createLayoutV2} from './kit/layout-v2.mjs';

const $=s=>document.querySelector(s),click=s=>$(s)?.click();
const SEC=[
 {id:'paths',ch:0,short:'Two paths'},{id:'roles',ch:0,short:'Charging'},
 {id:'inventory',ch:1,short:'Inventory'},{id:'reactions',ch:1,short:'Reactions'},
 {id:'sheets',ch:2,short:'Between the sheets'},{id:'intercalation',ch:2,short:'Intercalation'}];
const WANT={paths:{inside:false,mode:'discharge'},roles:{inside:false,mode:'charge'},inventory:{inside:false,mode:'discharge'},reactions:{inside:false},
 sheets:{inside:true,mode:'discharge'},intercalation:{inside:true,mode:'charge'}};

if(layoutV2()){
 const ex=$('#explorer'),stage=$('#viewport');
 const mode=()=>$('.mode-switch [aria-pressed="true"]')?.dataset.mode||'discharge',inside=()=>$('#graphite-view').hasAttribute('aria-current');
 const stepOf=()=>inside()?(mode()==='charge'?'intercalation':'sheets'):(mode()==='charge'?'roles':'paths');

 // ———— The workspace: the inventory chart beside the cell, built at once so the page never shows its earlier grid ————
 ex.classList.add('figure-pair');
 const head=document.createElement('div');head.className='pair-head paper-head';head.innerHTML='<p class="pair-title">The lithium inventory · linked to the cell</p>';
 const mhead=document.createElement('div');mhead.className='pair-head model-head';
 const col=document.createElement('figure');col.className='paper-column v2-paper v2-chart';
 const chart=$('.state-section .graph');chart.classList.add('v2-chartbox');
 // The note under the chart says what the chart shows, in the chart's own description (18 October 2026: it used to be the
 // inventory sentence, which the inventory step's words repeat word for word; that sentence moves to "More on this step")
 const note=document.createElement('p');note.className='panel-note';note.setAttribute('aria-live','polite');
 const describe=()=>{const t=`Lithium per host formula unit in each electrode, against graphite x. The markers show the current state; ${mode()==='charge'?'charge raises':'discharge lowers'} graphite x.`;if(note.textContent!==t)note.textContent=t;};
 describe();new MutationObserver(describe).observe($('#inventory-desc'),{childList:true,characterData:true,subtree:true});
 const cap=document.createElement('figcaption');cap.className='paper-details';cap.append(note);
 col.append(chart,cap);
 const visual=$('.visual-column');visual.classList.add('stage-column');
 ex.prepend(head,mhead,col);ex.insertBefore(visual,col.nextSibling);
 // The stage's own chrome: the mode in words at the top right (the contract's persistent mode text), the hint at the top
 // left until the first touch, the key behind its button, motion and Reset at the bottom right
 const hint=$('.camera-controls > span');hint.id='v2-hint';
 stage.append($('#mode-label'),hint,$('.scene-key'),$('.camera-controls'));
 // "More on this step": the electrode roles, the part explanations, the composition and its readouts
 const pane=document.createElement('div');pane.className='v2-pane';pane.append($('.explanation'),$('.transport'),$('#inventory-copy'),$('.inventory-values'));

 const v2=createLayoutV2({
  template:$('#v2-tpl'),sections:SEC,chapters:['Two paths','Nothing used up','Inside graphite'],
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches||/[?&]reduced\b/.test(location.search),
  bar:$('body > header'),brand:$('body > header .brand'),back:$('.collection-link'),title:'How a battery works',
  explorer:ex,stage,paper:col,input:$('#cell-canvas'),key:$('.scene-key'),hint,
  shifted:()=>[$('#cell-canvas'),$('#scene-labels')],
  // Put the cell on step k through the page's own controls: the view (the cell or inside graphite) and the mode. The scene
  // glides between its views and reverses its markers in place, so a step change needs no fade.
  goModel(k){
   const w=WANT[SEC[k].id];
   if(inside()!==w.inside)click(w.inside?'#graphite-view':'#cell-view');
   if(w.mode&&mode()!==w.mode)click(`.mode-switch [data-mode="${w.mode}"]`);
  },
  onModel(k,more){if(pane.parentNode!==more)more.append(pane);},
  more(k,body){if(pane.parentNode!==body)body.append(pane);},
  hash:false
 });
 // The half-reactions, live, in the step about them
 $('.v2-step[data-sec="reactions"] .v2-rx').append($('.chemistry .reaction-pair'));
 $('.v2-step .v2-more-body').append(pane);

 // Start on the step the address names: a step's own id (#sheets), or the page's shared view (#mode=charge&view=graphite)
 const hash=location.hash.slice(1);let k=v2.idx(hash),linked=k>=0;
 if(!linked&&hash.includes('=')){k=v2.idx(stepOf());linked=k>=0;}
 v2.start(k,linked);
}
