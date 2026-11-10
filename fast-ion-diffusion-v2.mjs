// Layout v2 for fast ion diffusion (the default; ?layout=v1 shows the earlier layout): one screen is the instrument, with
// the quiet pass (design/layout-overhaul/spec.md; DESIGN_AND_PRODUCT_HANDOFF.md, 18 October 2026). The layout is shared
// (kit/layout-v2.mjs, layout-v2.css); this is the page's adapter. The earlier page showed the paper's figures inside the
// stage; here they get their own column beside it, as on silicon and rocksalt: the figure the step needs, its matching
// panel outlined, and, while the event plays, a ring riding the paper's own printed energy points (figure-marks.json,
// found in the figure and checked against the PDF's vectors). Seven steps in the page's three questions, cut from its
// captions, are in <template id="v2-tpl">. Each step puts the model in its state through the page's own controls, so
// fast-ion-diffusion.js keeps one code path; the address keeps the page's shared view, which lands on the step.
import {layoutV2,createLayoutV2} from './kit/layout-v2.mjs';
import {FIGURES,curveAt} from './fast-ion-diffusion-model.mjs?v=5';
import {crossfadeFigure,preload} from './kit/figure-crossfade.mjs';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],click=s=>$(s)?.click(),now=()=>window.figState?.()||{};
const BASE='assets/fast-ion-diffusion/';
const SEC=[
 {id:'sites',ch:0,short:'Two kinds of site'},{id:'average',ch:0,short:'Average occupancy'},{id:'cell',ch:0,short:'The whole cell'},
 {id:'concerted',ch:1,short:'Five ions together'},{id:'single',ch:1,short:'One ion alone'},
 {id:'barrier',ch:2,short:'The 1D model'},{id:'barrierB',ch:2,short:'High sites in a dip'}];
const QUESTION={sites:'sites',average:'sites',cell:'sites',concerted:'event',single:'event',barrier:'barrier',barrierB:'barrier'};
// The figure each step reads from, the panel that matches the model, and the panel's note (from the figures' own captions)
const PANEL={sites:'2e',average:'2b',cell:'2b',concerted:'3b',single:'3e',barrier:'4a',barrierB:'4b'};
const NOTE={
 '2e':'Panel e · where lithium spent its time in the simulation: the density stretches along the T–O–T channel',
 '2b':'Panel b · LLZO, its lithium sites drawn as partly filled green spheres and its channels as green bars',
 '3b':'Panel b · the five-ion event and its energy profile, as printed; the ring marks where the model is',
 '3e':'Panel e · one ion along T → O → T, as printed; the ring marks where the model is',
 '4a':'Panel a · the framework landscape with flat-topped high sites',
 '4b':'Panel b · the same landscape with each high site in a dip'};
const stepOf=s=>s.question==='sites'?(s.context?'cell':s.occupancy==='average'?'average':'sites'):s.question==='event'?(s.compare==='single'?'single':'concerted'):s.landscape==='b'?'barrierB':'barrier';

if(layoutV2()){
 // ———— The figure column, built at once so the page never shows its earlier grid ————
 const ex=$('#explorer'),stage=$('#stage');ex.classList.add('figure-pair');
 const head=document.createElement('div');head.className='pair-head paper-head';
 head.innerHTML='<div class="display-switch v2-figpick" role="group" aria-label="Choose an original figure">'+['3','2','4','1'].map(k=>`<button type="button" data-fig="${k}" aria-pressed="false">Figure ${k}</button>`).join('')+'</div>'
  +'<div class="v2-figtools" role="group" aria-label="Figure magnification"><button type="button" data-z="out" aria-label="Zoom out of figure">−</button><button type="button" data-z="fit">Fit</button><button type="button" data-z="in" aria-label="Zoom into figure">+</button></div>';
 const mhead=document.createElement('div');mhead.className='pair-head model-head';
 const col=document.createElement('figure');col.className='paper-column v2-paper';
 col.innerHTML='<div class="v2-pview"><div class="v2-pviewport" tabindex="0" role="region" aria-label="Original paper figure. Use the zoom buttons to enlarge, then drag or scroll to pan."><div class="v2-psheet"><img alt="" decoding="async"><div class="panel-mark"></div><span class="v2-curve-ring" hidden></span></div></div></div>'
  +'<figcaption class="paper-details"><p class="panel-note" aria-live="polite"></p></figcaption>';
 const sc=$('#explorer .stage-column');sc.before(head,mhead,col);
 const img=col.querySelector('img'),vp=col.querySelector('.v2-pviewport'),mark=col.querySelector('.panel-mark'),ring=col.querySelector('.v2-curve-ring'),note=col.querySelector('.panel-note');
 const wait=document.createElement('p');wait.className='v2-wait';wait.setAttribute('aria-hidden','true');wait.textContent='The inset of Figure 3b will lift off the figure into this space';stage.append(wait);
 // The opening's lift starts from this figure (fast-ion-diffusion.js, emergence.start)
 window.Fig3DPairFigure=()=>({img,layer:ex});
 window.Fig3DFigureRoom=()=>Math.round((innerHeight-56)*.46);

 // ———— Wait for the page's module (it loads its data first), then lay out the steps ————
 const ready=()=>document.documentElement.dataset.ready==='true';
 await new Promise(r=>{if(ready())return r();const mo=new MutationObserver(()=>{if(ready()){mo.disconnect();r();}});mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-ready']});});
 const {CURVES}=window.figData,P3B=CURVES.panels['3b'].points,P3E=CURVES.panels['3e'].points;
 const MARKS=await fetch(BASE+'figure-marks.json').then(r=>r.json());
 // Each step's own control is hidden in "More on this step", which holds the question's other controls and its Go deeper
 $('#framework-block').dataset.v2p='sites';
 $('#sites-block').dataset.v2p='average cell';
 $('#transport-block').dataset.v2p='concerted single barrier barrierB';
 $('#compare-block').dataset.v2p='concerted single';
 const pane=document.createElement('div');pane.className='v2-pane';pane.append($('#controls'),$('.depth-reading'));
 // The figure's caption and links, below the workspace with the sources
 const cap={title:document.createElement('p'),text:document.createElement('p'),links:document.createElement('p')};
 cap.title.className='eyebrow';cap.links.className='paper-links';
 const credit=document.createElement('div');credit.className='v2-credit';$('.notes').prepend(credit);
 // The peak presets sit at the printed curves' highest points
 for(const b of $$('[data-peak]')){const pts=b.dataset.peak==='3b'?P3B:P3E,top=pts.reduce((a,p)=>p.energy_eV>a.energy_eV?p:a);b.dataset.set=String(Math.round(top.s*1000));b.style.left=`calc(9px + (100% - 18px) * ${top.s})`;}
 const fmtE=pts=>v=>curveAt(pts,v/1000).toFixed(2)+' eV';

 const v2=createLayoutV2({
  template:$('#v2-tpl'),sections:SEC,chapters:['Where it sits','What moves','Why it’s lower'],
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches||new URLSearchParams(location.search).has('reduced'),
  bar:$('.masthead'),brand:$('.masthead .brand'),back:$('.masthead > a:last-child'),title:'Lithium that moves together',
  credit:{nodes:[cap.title,cap.text,cap.links],into:credit},
  explorer:ex,stage,paper:col,input:$('#channel'),key:$('#scene-key'),hint:$('#scene-help'),
  shifted:()=>[$('#channel'),$('#scene-labels'),$('#stage > .fig-ann'),wait],
  opening:{on:()=>stage.classList.contains('opening'),flying:()=>stage.classList.contains('is-emerging'),end:()=>click('#explore')},
  // Put the model on step k: its question, then its view of that question. Nothing is pressed while the opening plays (the
  // model joins the step being read when it ends), and only what differs is pressed, so a reader's own settings stay.
  goModel(k){
   if(stage.classList.contains('opening'))return;
   const id=SEC[k].id,q=QUESTION[id];
   if(now().question!==q)click('#tab-'+q);
   const s=now();
   if(q==='sites'){const occ=id==='average'?'average':'moment',ctx=id==='cell';if(s.occupancy!==occ)click(`[data-occupancy="${occ}"]`);if(!!now().context!==ctx)click(`[data-context="${ctx}"]`);}
   if(q==='event'&&s.compare!==id)click(`#compare-block [data-compare="${id}"]`);
   if(q==='barrier'){const land=id==='barrierB'?'b':'a';if(s.landscape!==land)click(`[data-landscape="${land}"]`);}
   const want=q==='barrier'?'chain':'model';if(now().display!==want&&!stage.classList.contains('webgl-failed'))click(`[data-display="${want}"]`);
  },
  onModel(k,more){if(pane.parentNode!==more)more.append(pane);},
  more(k,body){if(pane.parentNode!==body)body.append(pane);},
  hash:false,fmt:{e3b:fmtE(P3B),e3e:fmtE(P3E)}
 });
 // The page's controls stay in the document from the start (its sync() reads them)
 $('.v2-step .v2-more-body').append(pane);
 stage.append($('#scene-help'));

 // ———— The figure: the step's own, or the one the reader picked, sized to the column ————
 const views=Object.fromEntries(Object.keys(FIGURES).map(k=>[k,{zoom:1}]));
 let picked=null,pickedFor=-1,shown='',sizedFor='';
 const phone=matchMedia('(max-width:860px)');
 function wantFigure(){const step=SEC[Math.max(0,v2.model)].id,own=stage.classList.contains('opening')?'3':PANEL[step][0];if(picked&&pickedFor===v2.model)return picked;picked=null;return own;}
 function size(){
  const k=img.dataset.key;if(!k)return;const f=FIGURES[k],v=views[k],w=col.clientWidth;
  const room=phone.matches?Math.min(innerHeight*.42,420):window.Fig3DFigureRoom();
  const fit=Math.round(Math.min(w,room*f.width/f.height,f.width));
  vp.style.width=fit+'px';vp.style.height=Math.round(fit*f.height/f.width)+'px';img.style.width=fit*v.zoom+'px';vp.classList.toggle('zoomed',v.zoom>1);
  head.querySelector('[data-z=out]').disabled=v.zoom<=1;head.querySelector('[data-z=in]').disabled=v.zoom>=4;head.querySelector('[data-z=fit]').textContent=v.zoom===1?'Fit':Math.round(v.zoom*100)+'%';
  sizedFor=k+fit+v.zoom;
 }
 function showFigure(k){
  if(shown===k)return;shown=k;const f=FIGURES[k];mark.classList.remove('on');
  crossfadeFigure(img,k,BASE+f.file,()=>{img.width=f.width;img.height=f.height;img.alt=`Original ${f.title}.`;size();
   cap.title.textContent='He, Zhu & Mo 2017 · '+f.title.split(' · ')[0];cap.text.textContent=f.caption;
   cap.links.innerHTML=`<a href="${BASE+f.file}" target="_blank" rel="noopener">Full-resolution figure ↗</a> · <a href="https://doi.org/10.1038/ncomms15893" target="_blank" rel="noopener">Nat. Commun. 8, 15893 ↗</a> · CC BY 4.0`;});
  $$('[data-fig]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fig===k)));
 }
 head.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.fig){picked=b.dataset.fig;pickedFor=v2.model;showFigure(picked);}
  if(b.dataset.z){const k=img.dataset.key,v=views[k];if(!v)return;const c=[(vp.scrollLeft+vp.clientWidth/2)/vp.scrollWidth,(vp.scrollTop+vp.clientHeight/2)/vp.scrollHeight];
   v.zoom=b.dataset.z==='fit'?1:Math.max(1,Math.min(4,v.zoom*(b.dataset.z==='in'?1.5:1/1.5)));size();vp.scrollTo(c[0]*vp.scrollWidth-vp.clientWidth/2,c[1]*vp.scrollHeight-vp.clientHeight/2);}
 });
 {let pan=null;vp.addEventListener('pointerdown',e=>{if(views[img.dataset.key]?.zoom>1&&e.pointerType!=='touch'){pan={x:e.clientX,y:e.clientY,l:vp.scrollLeft,t:vp.scrollTop};vp.setPointerCapture(e.pointerId);vp.classList.add('panning');}});
  vp.addEventListener('pointermove',e=>{if(pan){vp.scrollLeft=pan.l-(e.clientX-pan.x);vp.scrollTop=pan.t-(e.clientY-pan.y);}});
  const end=()=>{if(pan){pan=null;vp.classList.remove('panning');}};vp.addEventListener('pointerup',end);vp.addEventListener('pointercancel',end);}
 addEventListener('resize',size);phone.addEventListener('change',size);

 // ———— Every frame: the figure, its outline and note, the ring on the printed curve, and the opening's words ————
 const pct=(v,n)=>v/n*100+'%';
 const along=(marks,s)=>{let i=0;while(i<marks.length-2&&marks[i+1].s<s)i++;const a=marks[i],b=marks[i+1],t=Math.max(0,Math.min(1,(s-a.s)/(b.s-a.s||1)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};};
 const s0=$('.v2-step[data-sec="sites"]'),h0=s0.querySelector('h2'),b0=s0.querySelector('.v2-body'),own={h:h0.innerHTML,b:b0.innerHTML};
 let lastNote=null;
 function tick(){
  const opening=stage.classList.contains('opening'),k=wantFigure();showFigure(k);
  const step=SEC[Math.max(0,v2.model)].id,id=opening?'3b':PANEL[step],P=MARKS.panels[id],f=FIGURES[img.dataset.key||k];
  const on=!!P&&img.dataset.key===P.figure&&img.dataset.want===P.figure;
  if(on){const b=P.box;Object.assign(mark.style,{left:pct(b[0],f.width),top:pct(b[1],f.height),width:pct(b[2]-b[0],f.width),height:pct(b[3]-b[1],f.height)});}
  mark.classList.toggle('on',on);
  const t=on?NOTE[id]:'';if(t!==lastNote){note.textContent=t;lastNote=t;}
  // The ring rides the printed points of the curve the model is on, at the model's own progress (the eased, drawn one)
  const curve=!opening&&on&&(id==='3b'||id==='3e')?MARKS.curve_marks[id]:null;
  ring.hidden=!curve;
  if(curve){const s=window.figScene?.view?.progress??now().progress??0,p=along(curve,s);ring.style.left=pct(p.x,f.width);ring.style.top=pct(p.y,f.height);}
  // While the opening plays, the first step carries its words (they were the caption under the stage before)
  if(opening||s0.classList.contains('v2-opening')){
   const cur=$('.v2-step.is-current'),t0=cur&&cur!==s0?cur.getBoundingClientRect().top:null;
   if(opening){const ht=$('#caption-title').textContent.replace(/\s*\n\s*/g,' '),bt=$('#caption-copy').textContent;
    if(h0.textContent!==ht)h0.textContent=ht;if(b0.textContent!==bt)b0.textContent=bt;s0.classList.add('v2-opening');document.documentElement.classList.add('fi-opening');}
   else{h0.innerHTML=own.h;b0.innerHTML=own.b;s0.classList.remove('v2-opening');document.documentElement.classList.remove('fi-opening');}
   if(t0!=null){const d=cur.getBoundingClientRect().top-t0;if(Math.abs(d)>.5)scrollBy({top:d,behavior:'instant'});}
  }
  requestAnimationFrame(tick);
 }
 // Start on the step the address names: a step's own id (#single), or the page's shared view (#question=event&…)
 const hash=location.hash.slice(1);let k=v2.idx(hash),linked=k>=0;
 if(!linked&&hash.includes('=')){k=v2.idx(stepOf(now()));linked=k>=0;}
 v2.start(k,linked);
 requestAnimationFrame(tick);
 // Every figure the page can show is decoded ahead, once the page is idle, so a change never waits on a file
 setTimeout(()=>preload(Object.values(FIGURES).map(f=>BASE+f.file)),1200);
}
