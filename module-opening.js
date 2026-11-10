// First-visit opening shared by every module page.
// The page's name or question appears alone, settles into its place, then the page builds in reading order.
// Load it as a classic script in <head>, before the page's own scripts, so nothing is painted in its final state first.
// Markup:
//   data-open="title"  the title block; its [data-open-line] children appear one after another
//   data-open="1".."9" groups that appear in order after the title; equal numbers appear together
//   data-open-stage    on the group holding the live visual; the page's own opening waits for it
// Pages read window.Fig3DOpening.holding and listen for the "fig3d:stage" event before starting their own timelines.
// ?opening forces the sequence for review; ?no-opening suppresses it.
// The stylesheet opts the page into the site's cross-document view transitions; on a first visit the opening replaces them.
(function(){
 const root=document.documentElement,params=new URLSearchParams(location.search);
 const page=location.pathname.split('/').pop()||'index.html',key='fig3d-opened:'+page;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let seen=false;try{seen=localStorage.getItem(key)==='1';}catch(e){}
 // A deep link to a section, or a reader returning later, goes straight to the page.
 // ?reduced (or the older ?motion=reduce) and ?fallback are the pages' own review modes; they skip it too.
 const run=params.has('opening')||(!seen&&!['no-opening','reduced','fallback'].some(k=>params.has(k))&&params.get('motion')!=='reduce'&&!reduced&&!location.hash);
 const T={line:1300,lineGap:650,hold:900,glide:1150,groupLead:550,groupGap:420,group:900};
 let resolveDone;
 const api=window.Fig3DOpening={running:run,holding:run,timing:T,done:new Promise(r=>resolveDone=r),finish(){}};
 const release=()=>{if(!api.holding)return;api.holding=false;dispatchEvent(new Event('fig3d:stage'));};
 if(!run){resolveDone();return;}
 root.classList.add('fig-opening');
 // The opening replaces the card-to-page morph on a first visit; the morph returns on later visits. A skipped transition
 // rejects its promises, which would be logged as uncaught on pages without navigation-motion.js.
 addEventListener('pagereveal',e=>{const t=e.viewTransition;if(!api.running||!t)return;t.ready.catch(()=>{});t.updateCallbackDone?.catch(()=>{});t.skipTransition();});
 const timers=[];let title,lines=[],groups=[],finished=false,clip=null,clipWas='';
 const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
 const show=(el,quick)=>{if(el.classList.contains('is-open'))return;el.classList.add('is-open');if(quick)el.classList.add('is-quick');};
 function settleTitle(quick){
  if(!title)return;
  title.style.transition=`transform ${quick?450:T.glide}ms cubic-bezier(.65,0,.25,1)`;
  title.style.transform='';
 }
 function finish(quick){
  if(finished)return;finished=true;
  timers.forEach(clearTimeout);
  lines.forEach(l=>show(l,quick));settleTitle(quick);
  groups.flat().forEach(el=>show(el,quick));
  release();
  try{localStorage.setItem(key,'1');}catch(e){}
  removeEventListener('pointerdown',skip,true);removeEventListener('keydown',skip,true);removeEventListener('wheel',skip,true);removeEventListener('touchmove',skip,true);
  setTimeout(()=>{root.classList.remove('fig-opening');root.classList.add('fig-opened');api.running=false;if(title){title.style.transition='';title.style.transformOrigin='';}if(clip)clip.style.overflowX=clipWas;resolveDone();},quick?600:T.group+200);
 }
 // Any deliberate input brings the whole page in at once.
 function skip(e){if(e.type==='keydown'&&['Shift','Control','Alt','Meta'].includes(e.key))return;finish(true);}
 api.finish=()=>finish(true);
 function start(){
  title=document.querySelector('[data-open="title"]');
  const byGroup=new Map();
  document.querySelectorAll('[data-open]').forEach(el=>{const g=el.dataset.open;if(g==='title')return;const n=Number(g)||9;if(!byGroup.has(n))byGroup.set(n,[]);byGroup.get(n).push(el);});
  groups=[...byGroup.keys()].sort((a,b)=>a-b).map(k=>byGroup.get(k));
  addEventListener('pointerdown',skip,true);addEventListener('keydown',skip,true);addEventListener('wheel',skip,{capture:true,passive:true});addEventListener('touchmove',skip,{capture:true,passive:true});
  let t=0;
  if(title){
   lines=[...title.querySelectorAll('[data-open-line]')];if(!lines.length)lines=[title];
   // Centre the title in the window and enlarge it, then let it glide to the place it occupies in the layout.
   // Measure the words themselves, not their boxes, which often span the full column.
   const ink=el=>{const range=document.createRange();range.selectNodeContents(el);return range.getBoundingClientRect();};
   const boxes=lines.map(ink),head=ink(title.querySelector('h1')||lines[0]);
   const r={left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))};
   const scale=Math.max(1,Math.min(1.45,(innerWidth*.84)/Math.max(1,head.width),(innerWidth*.9)/Math.max(1,r.right-r.left),(innerHeight*.5)/Math.max(1,r.bottom-r.top)));
   const cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2,box=title.getBoundingClientRect();
   // Scale about the words' centre so the measured centre lands on the window's centre.
   title.style.transformOrigin=`${cx-box.left}px ${cy-box.top}px`;
   const dx=innerWidth/2-cx,dy=innerHeight*.46-cy;
   title.style.transform=`translate(${dx}px,${dy}px) scale(${scale})`;
   // The enlarged title's box (often the whole column, scaled up) reaches past the window's right edge although its words
   // stay centred. Clip sideways on the nearest full-width ancestor while the opening plays, so the page never scrolls
   // sideways and no visible word is cut (clip, not hidden: no scroll box, so sticky parts keep working).
   const vw=root.clientWidth;clip=title.parentElement;
   while(clip&&clip!==document.body&&clip.getBoundingClientRect().width<vw-1)clip=clip.parentElement;
   clip=clip||document.body;clipWas=clip.style.overflowX;clip.style.overflowX='clip';
   title.classList.add('is-open','is-title');
   lines.forEach((l,i)=>later(()=>show(l),i*T.lineGap));
   t=(lines.length-1)*T.lineGap+T.line+T.hold;
   later(()=>settleTitle(false),t);
   t+=T.groupLead;
  }
  groups.forEach((els,i)=>later(()=>{els.forEach(el=>show(el));if(els.some(el=>el.hasAttribute('data-open-stage')))release();},t+i*T.groupGap));
  later(()=>finish(false),t+groups.length*T.groupGap+T.group);
 }
 const ready=()=>{
  // Measure the title only once the page font is in, so it lands exactly where it will stay.
  const fonts=document.fonts?.ready||Promise.resolve();
  Promise.race([fonts,new Promise(r=>setTimeout(r,700))]).then(()=>requestAnimationFrame(start));
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
