// Layout v2 for the nanoparticle (the default; ?layout=v1 shows the earlier layout): one screen is the instrument, with
// the quiet pass (design/layout-overhaul/spec.md; DESIGN_AND_PRODUCT_HANDOFF.md, 18 October 2026). The layout is shared
// (kit/layout-v2.mjs, layout-v2.css); this is the page's adapter, on the pattern of fast ion, anion and the interwoven
// battery: Kang et al.'s Figure 1 leaves the stage for a column of its own, with the panels each step reads from outlined
// (the cubes' column a, d for a square {100} face; the octahedra's c, f for a triangular {111} one). Nine steps in the
// page's four views are in <template id="v2-tpl">, cut from its captions and notes. Each step puts the model in its state
// through the page's own controls, so nanoparticle.js keeps one code path; the address keeps the page's shared view,
// which lands on the step.
import {layoutV2,createLayoutV2} from './kit/layout-v2.mjs';
import {crossfadeFigure,preload} from './kit/figure-crossfade.mjs';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],click=s=>$(s)?.click();
// Figure 1, panels a–f: a lossless crop of the two micrograph rows (references/nanoparticle/provenance.json)
const FIGURE={file:'assets/nanoparticle/kang-figure-1a-f.webp',size:[1503,996],title:'Figure 1 · panels a–f',
 caption:'Scanning electron micrographs of gold nanocubes (a), rhombic dodecahedra (b) and octahedra (c), with 100 nm scale bars; below each, a high-resolution TEM image with its lattice spacing (d: Au(200), 0.209 nm; e: Au(110), 0.141 nm; f: Au(111), 0.242 nm), diffraction inset and 5 nm scale bar.'};
// Panels in the figure's pixels (each column's coloured frame); the opening's outlines start on panels a and c
const PANELS={
 ad:{box:[6,4,495,993],note:'Panels a, d · nanocubes: square {100} faces, with (200) planes 0.209 nm apart'},
 cf:{box:[1013,2,1500,990],note:'Panels c, f · octahedra: triangular {111} faces, with (111) planes 0.242 nm apart'},
 row:{box:[6,2,1500,494],note:'Panels a–c · the photographed particles, about 60 nanometres across'},
 atoms:{box:null,note:'No panel resolves single atoms: the model counts neighbors from its coordinates'},
 opening:{box:null,note:'Panels a and c · cubes with square faces, octahedra with triangular faces'}
};
const LIFT={a:[0,0,498,494],c:[1008,0,1503,494]};
const SEC=[
 {id:'square',ch:0,short:'Square terrace'},{id:'triangle',ch:0,short:'Triangular terrace'},
 {id:'face',ch:1,short:'Face atom'},{id:'edge',ch:1,short:'Edge atom'},{id:'corner',ch:1,short:'Corner atom'},{id:'inside',ch:1,short:'Interior atom'},
 {id:'size',ch:2,short:'Size'},
 {id:'sites',ch:3,short:'Sites on {100}'},{id:'hollows',ch:3,short:'Hollows on {111}'}];
const F100='100:1,0,0',F111='111:1,1,1';
const WANT={square:{view:'surfaces',face:F100},triangle:{view:'surfaces',face:F111},
 face:{view:'neighbors',face:F100,atom:'face'},edge:{view:'neighbors',atom:'edge'},corner:{view:'neighbors',atom:'corner'},inside:{view:'neighbors',atom:'interior'},
 size:{view:'size'},sites:{view:'binding',face:F100},hollows:{view:'binding',face:F111,hollow:true}};
const CN={8:'face',9:'face',7:'edge',5:'corner',12:'inside'};

if(layoutV2()){
 // The cover names its paper as every other companion's does (18 October 2026: the covers share one pattern)
 {const t=$('.heading h1'),e=document.createElement('p');e.className='v2-eyebrow';e.textContent='Paper companion · Kang et al. · Nature Communications 2024';t?.before(e);}
 const ex=$('#explorer'),stage=$('#scene-stage'),d=ex.dataset;
 const panelOf=()=>d.view==='surfaces'||d.view==='binding'?(d.npFace?.startsWith('100')?'ad':'cf'):d.view==='size'?'row':d.npCn==='8'?'ad':d.npCn==='9'?'cf':'atoms';
 const stepOf=()=>d.view==='surfaces'?(d.npFace?.startsWith('100')?'square':'triangle'):d.view==='neighbors'?CN[d.npCn]||'face':d.view==='size'?'size':d.npFace?.startsWith('100')?'sites':'hollows';
 const opening=()=>d.intro==='true'||d.held==='true';

 // ———— The workspace: the figure column beside the stage, built at once so the page never shows its earlier grid ————
 ex.classList.add('figure-pair');
 const head=document.createElement('div');head.className='pair-head paper-head';
 head.innerHTML='<div class="display-switch v2-figpick" role="group" aria-label="The original figure"><button type="button" data-fig="1" aria-pressed="true">Figure 1</button></div>'
  +'<div class="v2-figtools" role="group" aria-label="Figure magnification"><button type="button" data-z="out" aria-label="Zoom out of figure">−</button><button type="button" data-z="fit">Fit</button><button type="button" data-z="in" aria-label="Zoom into figure">+</button></div>';
 const mhead=document.createElement('div');mhead.className='pair-head model-head';
 const col=document.createElement('figure');col.className='paper-column v2-paper';
 col.innerHTML='<div class="v2-pview"><div class="v2-pviewport" tabindex="0" role="region" aria-label="Original paper figure. Use the zoom buttons to enlarge, then drag or scroll to pan."><div class="v2-psheet"><img alt="" decoding="async"><div class="panel-mark"></div></div></div></div>'
  +'<figcaption class="paper-details"><p class="panel-note" aria-live="polite"></p></figcaption>';
 const stageCol=$('.scene-column');stageCol.classList.add('stage-column');
 ex.append(head,mhead,col,stageCol,$('#inspection'));
 $('.explorer-layout')?.remove();
 const img=col.querySelector('img'),vp=col.querySelector('.v2-pviewport'),mark=col.querySelector('.panel-mark'),note=col.querySelector('.panel-note');
 // The stage's own chrome: the hint at the top, Reset at the bottom; the opening's outlines travel over the whole workspace
 stage.append($('#scene-help'),$('.camera-controls'));
 ex.append($('#shape-traces'));
 const wait=document.createElement('p');wait.className='v2-wait';wait.setAttribute('aria-hidden','true');wait.textContent='The outlines will lift off the figure into this space';wait.hidden=true;stage.append(wait);
 // The opening's outlines start from this figure (nanoparticle.js, drawTraces)
 window.Fig3DPairFigure=()=>({img,layer:ex,natural:FIGURE.size,panels:LIFT});

 // "Show inside" asks for the cut open (or, pressed again, closed): a press from another step brings the model to the
 // interior atom, whose step opens the cut already, so the press sets the cut to what the chip offered, never flips it
 // back. A hidden proxy carries the page's cut state for the chip (its pressed state) and takes the press.
 const proxy=document.createElement('button');proxy.id='v2-cutaway';proxy.type='button';proxy.hidden=true;document.body.append(proxy);
 let wantCut=null;
 document.addEventListener('click',e=>{const c=e.target.closest?.('[data-click="#v2-cutaway"]');if(c)wantCut=c.getAttribute('aria-pressed')!=='true';},true);
 proxy.addEventListener('click',()=>{const on=d.cutaway==='true';if(wantCut===null||wantCut!==on)click('#cutaway');wantCut=null;});
 // "More on this step" holds the view's controls and readouts (the step's own control is hidden there, layout below)
 const pane=document.createElement('div');pane.className='v2-pane';pane.append($('#explore-controls'));
 const cap={title:document.createElement('p'),text:document.createElement('p'),links:document.createElement('p')};
 cap.title.className='eyebrow';cap.links.className='paper-links';
 const credit=document.createElement('div');credit.className='v2-credit';$('#scientific-notes').prepend(credit);

 const v2=createLayoutV2({
  template:$('#v2-tpl'),sections:SEC,chapters:['Surfaces','Neighbors','Size','Binding'],
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches||/[?&](reduced|motion=reduce)\b/.test(location.search),
  bar:$('.masthead'),brand:$('.masthead .brand'),back:$('.masthead .back-link'),title:'Inside a nanoparticle',
  credit:{nodes:[cap.title,cap.text,cap.links],into:credit},
  explorer:ex,stage,paper:col,input:$('#particle'),hint:$('#scene-help'),
  shifted:()=>[$('#particle'),$('#scene-stage > .particle-notes'),$('#scene-label'),wait],
  opening:{on:opening,flying:()=>d.flying==='true',end:()=>{if(d.intro==='true')click('#explore-now');}},
  // Put the model on step k through the page's own controls: its view, face, atom and site; only what differs is pressed.
  // The scene glides its camera and blends its colours, so a step change needs no fade. Nothing is pressed while the
  // opening plays (the model joins the step being read when it ends).
  goModel(k){
   if(opening())return;
   const w=WANT[SEC[k].id];
   if(d.view!==w.view)click(`.view-tabs [data-view="${w.view}"]`);
   if(w.face&&d.npFace!==w.face)click(`[data-face="${w.face}"]`);
   if(w.atom&&$(`[data-atom="${w.atom}"]`)?.getAttribute('aria-pressed')!=='true')click(`[data-atom="${w.atom}"]`);
   if(w.hollow&&!['fcc','hcp'].includes(d.npSite))click('[data-site="fcc"]');
  },
  onModel(k,more){if(pane.parentNode!==more)more.append(pane);},
  more(k,body){if(pane.parentNode!==body)body.append(pane);},
  hash:false
 });
 // The page's controls stay in the document from the start (its update() reads them)
 $('.v2-step .v2-more-body').append(pane);

 // ———— The figure, sized to the column ————
 const view={zoom:1},phone=matchMedia('(max-width:860px)');
 function size(){
  if(!img.dataset.key)return;const [fw,fh]=FIGURE.size,w=col.clientWidth;
  const room=phone.matches?Math.min(innerHeight*.42,420):Math.round((innerHeight-56)*.46);
  const fit=Math.round(Math.min(w,room*fw/fh,fw*1.6));
  vp.style.width=fit+'px';vp.style.height=Math.round(fit*fh/fw)+'px';img.style.width=fit*view.zoom+'px';vp.classList.toggle('zoomed',view.zoom>1);
  head.querySelector('[data-z=out]').disabled=view.zoom<=1;head.querySelector('[data-z=in]').disabled=view.zoom>=4;head.querySelector('[data-z=fit]').textContent=view.zoom===1?'Fit':Math.round(view.zoom*100)+'%';
 }
 crossfadeFigure(img,'1',FIGURE.file,()=>{[img.width,img.height]=FIGURE.size;img.alt='Original Kang et al. Figure 1, panels a to f: gold nanocubes, rhombic dodecahedra and octahedra, and their lattice fringes.';size();
  cap.title.textContent='Kang et al. 2024 · Figure 1';cap.text.textContent=FIGURE.caption;
  cap.links.innerHTML='<a href="references/nanoparticle/kang-2024-figure-1.png" target="_blank" rel="noopener">Complete Figure 1 ↗</a> · <a href="https://doi.org/10.1038/s41467-024-47994-y" target="_blank" rel="noopener">Nature Communications, 2024 ↗</a> · CC BY 4.0';});
 head.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b?.dataset.z)return;const c=[(vp.scrollLeft+vp.clientWidth/2)/vp.scrollWidth,(vp.scrollTop+vp.clientHeight/2)/vp.scrollHeight];
  view.zoom=b.dataset.z==='fit'?1:Math.max(1,Math.min(4,view.zoom*(b.dataset.z==='in'?1.5:1/1.5)));size();vp.scrollTo(c[0]*vp.scrollWidth-vp.clientWidth/2,c[1]*vp.scrollHeight-vp.clientHeight/2);
 });
 {let pan=null;vp.addEventListener('pointerdown',e=>{if(view.zoom>1&&e.pointerType!=='touch'){pan={x:e.clientX,y:e.clientY,l:vp.scrollLeft,t:vp.scrollTop};vp.setPointerCapture(e.pointerId);vp.classList.add('panning');}});
  vp.addEventListener('pointermove',e=>{if(pan){vp.scrollLeft=pan.l-(e.clientX-pan.x);vp.scrollTop=pan.t-(e.clientY-pan.y);}});
  const end=()=>{if(pan){pan=null;vp.classList.remove('panning');}};vp.addEventListener('pointerup',end);vp.addEventListener('pointercancel',end);}
 addEventListener('resize',size);phone.addEventListener('change',size);

 // ———— Every frame: the outline and its note, the wait line, and the opening's words in the first step ————
 const pct=(v,n)=>v/n*100+'%';
 const first=$('.v2-step[data-sec="square"]'),h0=first.querySelector('h2'),b0=first.querySelector('.v2-body'),own={h:h0.innerHTML,b:b0.innerHTML};
 let lastNote=null;
 function tick(){
  const op=opening(),P=PANELS[op?'opening':panelOf()],ok=img.dataset.key==='1'&&!!P;
  if(ok&&P.box){const b=P.box,[fw,fh]=FIGURE.size;Object.assign(mark.style,{left:pct(b[0],fw),top:pct(b[1],fh),width:pct(b[2]-b[0],fw),height:pct(b[3]-b[1],fh)});}
  mark.classList.toggle('on',ok&&!!P.box);
  const t=ok?P.note:'';if(t!==lastNote){note.textContent=t;lastNote=t;note.classList.toggle('is-unmatched',!!P&&!P.box&&!op);}
  // While the tour plays, the first step carries its words (they were the caption beside the stage before); a step above
  // the one being read that changes height leaves the reader in place
  const cur=$('.v2-step.is-current'),t0=cur&&cur!==first?cur.getBoundingClientRect().top:null;
  if(d.intro==='true'){const ht=$('#caption-title').textContent,bt=$('#caption-copy').textContent;if(h0.textContent!==ht)h0.textContent=ht;if(b0.textContent!==bt)b0.textContent=bt;first.classList.add('v2-mirrored');}
  else if(first.classList.contains('v2-mirrored')){h0.innerHTML=own.h;b0.innerHTML=own.b;first.classList.remove('v2-mirrored');}
  if(t0!=null){const dy=cur.getBoundingClientRect().top-t0;if(Math.abs(dy)>.5)scrollBy({top:dy,behavior:'instant'});}
  wait.hidden=!(d.intro==='true'&&$('#particle').style.opacity==='0');
  const cut=String(d.cutaway==='true');if(proxy.getAttribute('aria-pressed')!==cut)proxy.setAttribute('aria-pressed',cut);
  document.documentElement.classList.toggle('np-opening',op);
  requestAnimationFrame(tick);
 }
 // Start on the step the address names: a step's own id (#corner), or the page's shared view (#view=binding&face=…)
 const hash=location.hash.slice(1);let k=v2.idx(hash),linked=k>=0;
 if(!linked&&hash.includes('=')){k=v2.idx(stepOf());linked=k>=0;}
 v2.start(k,linked);
 requestAnimationFrame(tick);
 setTimeout(()=>preload([FIGURE.file]),1200);
}
