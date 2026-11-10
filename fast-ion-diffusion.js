import {Annotations} from './annotations.mjs';
import {swapFigure,fitStage} from './figure-swap.mjs';
import {initialState,reduce,FIGURES,DISPLAYS,INSET,clamp,smooth,ease,curveAt,imageAt,ionPositions,singlePosition,hopKind,phi,chainRow,chainBarrier,dist,openingHolds,paperK,PAPER_K,signedEnergy,LEDGER,ledgerBar,ledgerRef,ledgerRefPath,keyItems,fallbackDisplay,handsOver,captionChange,tagPlace,VIEW} from './fast-ion-diffusion-model.mjs?v=5';
import {viewParams,decodeView,encodeView,viewWriter} from './view-state.mjs';
import {ChannelScene,PALETTE} from './fast-ion-diffusion-scene.mjs?v=5';
const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)],BASE='assets/fast-ion-diffusion/',SVGNS='http://www.w3.org/2000/svg';
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)'),params=new URLSearchParams(location.search);
const load=f=>fetch(BASE+f).then(r=>{if(!r.ok)throw Error(f);return r.json();});
const [DATA,CURVES,MODEL]=await Promise.all([load('llzo-scene.json'),load('curves.json'),load('fig4-model.json')]);
const P3B=CURVES.panels['3b'].points,P3E=CURVES.panels['3e'].points;
let state=initialState(reducedQuery.matches||params.has('reduced')),scene=null,failed=false,openingStop=null,playStop=null;
const figureViews=Object.fromEntries(Object.keys(FIGURES).map(k=>[k,{zoom:1,x:0,y:0}]));
const fmt=(v,d=2)=>(Math.abs(v)<.005&&d===2?0:v).toFixed(d);

// ————— Words —————
const CAPTIONS={
 sites:{kicker:'Figure 2b,e · lithium sites',title:'Two kinds of room\nfor lithium',copy:'Tetrahedral T sites (four oxygens) and octahedral O sites (six) alternate along a chain that threads the garnet. Shown here is the moment the event begins, with five ions on this stretch of chain.',note:'Rings mark sites; a sphere inside a ring is lithium. Faint rings are neighbouring sites off the channel, whose occupancy the paper does not show.'},
 average:{kicker:'Figure 2 · partial occupancy',title:'Shared, never\nall filled at once',copy:'Each cubic cell holds 56 lithium ions and 72 T and O sites. A T site and its neighbouring O site are only 1.99 Å apart, so they cannot both be filled at their centres. Averaged over time, every site is partly occupied. At any instant, each is either full or empty.',note:'The small green spheres stand for a time average, not for 72 ions. The paper’s Figure 2 draws the same idea as partially filled spheres.'},
 cell:{kicker:'Figure 2b · the whole cell',title:'One stretch of a\nthree-dimensional network',copy:'The cubic cell is 12.98 Å on a side. Its T and O sites link into loops running in every direction, around the lavender zirconium ions. The bright line is the stretch the paper drew in Figure 3b.',note:'This view shows connectivity only. One stretch of channel does not establish how well the network conducts over long distances.'},
 concerted:{kicker:'Figure 3b · five ions, one event',title:'Every ion advances\none site',copy:'Three ions leave high-energy O sites for T sites while two leave T sites for O sites, all in one rearrangement. The paper’s calculated barrier for the whole group is 0.26 eV.',note:'Start and end sites follow the paper and its Fig. 3b inset. The straight-line motion between them is interpolated, so neither the path nor the timing is the calculated one.'},
 single:{kicker:'Figure 3e · one ion alone',title:'Alone, the same step\ncosts 0.58 eV',copy:'Here one ion crosses from a T site, through an O site, to the next T site, with the rest of the lithium held fixed. It must climb to the O site, 0.58 eV above where it started. This is the framework’s energy landscape.',note:'The paper removes one lithium ion and relaxes only the framework atoms for this curve, so the other lithium stays put. Which sites it kept filled is not shown: here the dim ions keep the event’s start sites, and the ion at T3 is the one removed. It is a reference landscape, not a competing event in the same crystal.'},
 barrier:{kicker:'Figure 4 · the paper’s 1D model',title:'Downhill ions pay\nfor uphill ones',copy:'Four ions sit on a line, two on low sites and two on the high sites between them, all repelling one another. When they shift together, the two on high sites fall while the other two climb, so much of the cost cancels.',note:'In this model the energy is exactly the sum of the bars. The crystal’s DFT energy cannot be split per ion, so no such bars are drawn for LLZO.'},
 barrierB:{kicker:'Figure 4b · when it fails',title:'If the high sites sit\nin a dip, all must climb',copy:'Give each high site its own 0.3 eV pocket and the picture changes: at the start every ion sits in a well, so the shift forces all four uphill at once. The group’s barrier rises far above the single-ion one.',note:'The paper links this landscape to conductors that are not super-ionic, such as LiTiS₂ (Supplementary Note 4).'}
};
const OPENING=[
 {id:'paper',kicker:'He, Zhu & Mo 2017 · Figure 3',title:'The paper’s evidence:\ntwo energy curves',copy:'Top row: several ions hopping together. Bottom row: one ion crossing the same channel alone. In all three materials, the group’s barrier is lower.'},
 {id:'inset',kicker:'Figure 3b · LLZO',title:'Five lithium ions\nin the garnet LLZO',copy:'Each green streak traces one ion hopping into the next site along the channel. The yellow spheres are the oxygens around them.'},
 {id:'emerge',kicker:'Figure 3b, given depth',title:'The same channel,\nnow in three dimensions',copy:'Rebuilt from the garnet’s crystal structure and fitted to this drawing. The printed oxygens land within 0.07 Å of the model’s.'},
 {id:'play',kicker:'Figure 3b · five ions, one event',title:'Every ion advances\none site',copy:'As the five ions move, the marker follows the paper’s energy profile for the group. Its highest point is 0.26 eV.'}
];
// Reading pace for the opening's words: about 17 characters a second, never under 4.5 s.
const readingTime=b=>Math.max(4.5,(b.title.length+b.copy.length)/17+1.2);
const REFERENCES={
 sites:{file:'figure-2e.webp',figure:'2',caption:'Figure 2e · where lithium spent its time in the simulation. The density stretches along the T–O–T channel. Open Figure 2 ↗'},
 concerted:{file:'figure-3b.webp',figure:'3',caption:'Figure 3b · the five-ion event and its energy profile, as printed. Open Figure 3 ↗'},
 single:{file:'figure-3e.webp',figure:'3',caption:'Figure 3e · one ion along T → O → T, as printed. Open Figure 3 ↗'},
 barrier:{file:'figure-4.webp',figure:'4',caption:'Figure 4 · the paper’s 1D model, as printed. Open Figure 4 ↗'}
};
const DEPTH={
 sites:[['Why two kinds of site?','In the garnet framework, lanthanum and zirconium sit with their oxygens in fixed positions (Zr in ZrO₆ octahedra). Lithium fills the gaps between them: 24 tetrahedral cavities and 48 octahedral cavities per cubic cell. Each octahedral cavity shares a face with two tetrahedral ones, so T and O sites alternate along chains, 1.99 Å apart.'],
  ['A partly filled site is an average','Diffraction and long simulations see where lithium is on average, so cubic LLZO’s sites are reported as partly occupied. A single moment is different: each site is empty or holds one ion. To simulate it, the authors first chose an ordered arrangement of the lithium (their Methods). This page shows one moment of their event, and the average in a separate view.'],
  ['What Figure 2e shows','It shows where lithium spent its time during a molecular-dynamics run. Around the O sites the density stretches along the channel. The authors read this as a locally flat landscape that lets lithium leave those high-energy sites easily, one of their two conditions for a low-barrier group move.'],
  ['How this channel was rebuilt','From the published space group of cubic LLZO (Ia-3d, a = 12.98 Å), with the oxygen position fitted to standard bond lengths. Its orientation was then fitted to the 13 oxygens drawn in Figure 3b’s inset. Of the 36 possible six-site stretches of channel, one shape fits, to 3.2 px or 0.07 Å; every other shape misses by 18 px or more.']],
 event:[['What “concerted” means here','In the simulations, the authors grouped hops falling within 1 ps of one another into one event. Groups of two or more carried most of the diffusion. In LLZO the correlation factor at 900 K is 3.0, about two to three ions moving together on average. It is not a fixed, repeating dance: the paper reports many modes in LLZO with different numbers of ions, all with barriers of 0.18–0.29 eV.'],
  ['Where 0.26 eV comes from','The authors computed the lowest-energy route for this group with the nudged elastic band method, using density-functional theory. The 17 points of Figure 3b are its images, and energies are relative to the lower end. The start sits 0.06 eV above the end. That is consistent with one fewer ion on a high-energy O site afterwards, though this is our reading, not a statement in the paper.'],
  ['Why the two curves are not overlaid','They answer different questions. Figure 3b follows five ions, with the images of one calculation along its axis. Figure 3e follows one ion, with one lithium removed and only the framework allowed to relax, plotted against position. Each is measured from its own lowest end. Compare their barriers, 0.26 against 0.58 eV, not their shapes.'],
  ['Barrier, activation energy, conductivity','These are three different numbers. The 0.26 eV barrier belongs to one calculated event. The activation energy from the authors’ molecular dynamics is 0.25 ± 0.02 eV. Experiments on doped cubic LLZO give 0.31–0.34 eV. Conductivity depends on how many carriers there are, how often events happen and how the network connects. One event cannot establish it.'],
  ['What the animation does not show','Each ion moves along a straight line at the same rate. The real path and timing of the calculation are not resolved here. Halfway through, ions 2 and 3 pass within 1.8 Å near T2, which is a feature of the drawing, not a result. Playback speed means nothing physical.']],
 barrier:[['The model in one line','E = Σ φ(xᵢ) + Σ K / |xᵢ − xⱼ|. Four ions on a 12 Å line made of two 6 Å cells, repeating. φ is the framework landscape with a 0.6 eV top, close to LLZO’s 0.58 eV. K sets how hard the ions repel. The authors estimated K from DFT as 2.0 eV Å in LLZO, 2.7 in LGPS and 4.2 in LATP.'],
  ['Why the barrier falls','In landscape a the high sites are flat-topped, so an ion there rolls downhill as soon as it moves. Shifting all four ions by 3 Å sends two downhill and two uphill. Repulsion keeps them evenly spaced, so they move together and the framework part of the energy rises only a little. At K = 3 eV Å the group’s barrier is about 0.32 eV, against 0.6 eV for one ion alone.'],
  ['When it fails','In landscape b each high site sits in its own 0.3 eV dip. Every ion starts in a well, so the shift forces all four to climb at once, and the barrier exceeds 1.5 eV. Occupied high-energy sites are not enough on their own. They also need a locally flat landscape, the elongated density of Figure 2e.'],
  ['How it was re-run','Each ion was relaxed while the four together advanced a fixed distance, from 0 to 3 Å. The paper does not say how it treats the ends of the line. Making the 12 Å cell repeat and counting each pair once reproduces Figure 4c and 4d to within 0.07 eV. Other choices miss by much more. Printed points appear on the plots so you can check.'],
  ['What the model is not','It is one-dimensional, uses point charges and lets nothing else relax. The authors note that its ion arrangement resembles LATP more than LLZO. It shows how occupied high-energy sites and repulsion can lower a group’s barrier. It does not show that adding lithium always helps, and it does not predict any material’s conductivity.']]
};

// ————— Paper view —————
const showingPaper=()=>!['model','chain'].includes(state.display);
function figureFor(key){const f=FIGURES[key],img=$('paper-image'),src=BASE+f.file;swapFigure(img,key,src,()=>{img.width=f.width;img.height=f.height;img.alt=`Original ${f.title}.`;sizeFigure();const v=figureViews[key];$('paper-viewport').scrollTo(v.x,v.y);});$('paper-original').href=src;$('paper-caption').textContent=f.caption;}
// The figure on screen, which lags the chosen one while the next file decodes.
const shownFigure=()=>FIGURES[$('paper-image').dataset.key]?$('paper-image').dataset.key:state.display;
function saveFigure(){if(showingPaper()){const v=figureViews[shownFigure()],p=$('paper-viewport');v.x=p.scrollLeft;v.y=p.scrollTop;}}
function sizeFigure(){
 if(!showingPaper())return;
 const p=$('paper-viewport'),img=$('paper-image'),k=shownFigure(),v=figureViews[k],f=FIGURES[k],st=$('stage');
 const room=fitStage(st,state.opening||st.classList.contains('is-emerging')?null:{w:f.width,h:f.height,cap:1},{view:$('paper-view'),opening:state.opening||st.classList.contains('is-emerging')})??p.clientHeight;
 const fit=Math.min(p.clientWidth,room*(f.width/f.height),f.width);
 img.style.width=Math.max(1,fit*v.zoom)+'px';p.classList.toggle('zoomed',v.zoom>1);
 $('figure-out').disabled=v.zoom<=1;$('figure-in').disabled=v.zoom>=4;
 $('figure-help').textContent=v.zoom===1?'Original figure · He, Zhu & Mo 2017 · CC BY 4.0':'Drag or scroll to inspect · '+Math.round(v.zoom*100)+'%';
}
function zoomFigure(factor){
 const p=$('paper-viewport'),v=figureViews[state.display],old=v.zoom;
 const c=[(p.scrollLeft+p.clientWidth/2)/p.scrollWidth,(p.scrollTop+p.clientHeight/2)/p.scrollHeight];
 v.zoom=factor===0?1:Math.max(1,Math.min(4,v.zoom*factor));if(v.zoom===old)return;
 sizeFigure();p.scrollTo(c[0]*p.scrollWidth-p.clientWidth/2,c[1]*p.scrollHeight-p.clientHeight/2);saveFigure();
}

// ————— SVG helpers —————
const el=(tag,attrs={},text)=>{const n=document.createElementNS(SVGNS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);if(text!=null)n.textContent=text;return n;};
const path=pts=>'M'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join('L');

// ————— Linked energy plots: one per process, never overlaid —————
// Both printed panels use the same 0–1.0 eV axis, each relative to its own lowest end; the pair keeps that shared scale (0–0.7 eV shown).
const EP={w:200,h:150,l:30,r:194,t:12,b:112,ymax:.7};
const ex=s=>EP.l+(EP.r-EP.l)*s,ey=e=>EP.b-(EP.b-EP.t)*e/EP.ymax;
function buildEventPlot(){
 const box=$('event-plot');box.innerHTML='';const pair=document.createElement('div');pair.className='plot-pair';
 for(const [key,pts,label,axis,colour] of [['concerted',P3B,'Five ions · Fig. 3b','NEB images →',PALETTE.li],['single',P3E,'One ion · Fig. 3e','T → O → T',PALETTE.single]]){
  const b=document.createElement('button');b.className='plot-card';b.dataset.compare=key;b.setAttribute('aria-pressed','false');
  b.innerHTML=`<span class="plot-title">${label}</span>`;
  const svg=el('svg',{viewBox:`0 0 ${EP.w} ${EP.h}`,role:'img','aria-label':`${label}: printed energy points, barrier ${key==='concerted'?'0.26':'0.58'} eV`});
  for(const e of [0,.2,.4,.6]){svg.append(el('line',{x1:EP.l,x2:EP.r,y1:ey(e),y2:ey(e),stroke:'#ffffff',...(e?{'stroke-opacity':.07}:{'stroke-opacity':.28})}));svg.append(el('text',{x:EP.l-6,y:ey(e)+4,'text-anchor':'end','font-size':12,fill:'#95a2ba'},e.toFixed(1)));}
  svg.append(el('text',{x:(EP.l+EP.r)/2,y:EP.h-14,'text-anchor':'middle','font-size':12,fill:'#95a2ba'},axis));
  const line=pts.map(p=>[ex(p.s),ey(p.energy_eV)]);
  svg.append(el('path',{d:path(line),fill:'none',stroke:colour,'stroke-width':1.5,'stroke-opacity':.9}));
  for(const p of line)svg.append(el('circle',{cx:p[0],cy:p[1],r:2.6,fill:colour}));
  const top=pts.reduce((a,p)=>p.energy_eV>a.energy_eV?p:a);svg.append(el('text',{x:ex(top.s),y:ey(top.energy_eV)-8,'text-anchor':'middle','font-size':13,fill:'#eef2fb','font-weight':600},top.energy_eV.toFixed(2)+' eV'));
  const g=el('g',{class:'marker'});g.append(el('line',{y1:EP.t,y2:EP.b,stroke:'#ffffff','stroke-opacity':.35,'stroke-dasharray':'2 3'}),el('circle',{r:5.5,fill:'none',stroke:'#ffffff','stroke-width':2}),el('circle',{r:2.2,fill:'#ffffff'}));svg.append(g);
  b.append(svg);b.addEventListener('click',()=>compareTo(key));pair.append(b);
 }
 box.append(pair);const note=document.createElement('p');note.className='plot-axis-note';note.textContent='Energy in eV, each measured from its own lower end. Points as printed in the paper.';box.append(note);
}
// Barrier question: the model’s energy profile for both landscapes, and its barrier against K, with the printed points to check against.
const BP={w:200,h:150,l:30,r:194,t:12,b:112,ymax:2};
const bx=s=>BP.l+(BP.r-BP.l)*s/3,by=e=>BP.b-(BP.b-BP.t)*e/BP.ymax,kx=K=>BP.l+(BP.r-BP.l)*(K-1)/6;
function buildBarrierPlot(){
 const box=$('event-plot');box.innerHTML='';const pair=document.createElement('div');pair.className='plot-pair';
 const frame=(svg,xlabel,xt)=>{for(const e of [0,.5,1,1.5,2]){svg.append(el('line',{x1:BP.l,x2:BP.r,y1:by(e),y2:by(e),stroke:'#fff','stroke-opacity':e?.07:.28}));svg.append(el('text',{x:BP.l-6,y:by(e)+4,'text-anchor':'end','font-size':12,fill:'#95a2ba'},e.toFixed(1)));}
  for(const [v,x] of xt)svg.append(el('text',{x,y:BP.b+13,'text-anchor':'middle','font-size':12,fill:'#95a2ba'},v));svg.append(el('text',{x:(BP.l+BP.r)/2,y:BP.h-8,'text-anchor':'middle','font-size':12,fill:'#95a2ba'},xlabel));};
 const c1=document.createElement('div');c1.className='plot-card';c1.setAttribute('aria-pressed','true');c1.innerHTML='<span class="plot-title">Group’s energy as it shifts</span>';
 const s1=el('svg',{viewBox:`0 0 ${BP.w} ${BP.h}`,role:'img','aria-label':'Energy profile of the four-ion shift in the 1D model',id:'profile-svg'});frame(s1,'Shift of the group (Å)',[[0,bx(0)],[1,bx(1)],[2,bx(2)],[3,bx(3)]]);
 s1.append(el('path',{class:'curve-a',fill:'none',stroke:PALETTE.li,'stroke-width':1.6}),el('path',{class:'curve-b',fill:'none',stroke:PALETTE.single,'stroke-width':1.6}),el('g',{class:'printed'}));
 const g=el('g',{class:'marker'});g.append(el('line',{y1:BP.t,y2:BP.b,stroke:'#fff','stroke-opacity':.35,'stroke-dasharray':'2 3'}),el('circle',{r:5.5,fill:'none',stroke:'#fff','stroke-width':2}),el('circle',{r:2.2,fill:'#fff'}));s1.append(g);
 c1.append(s1);
 const c2=document.createElement('div');c2.className='plot-card';c2.setAttribute('aria-pressed','true');c2.innerHTML='<span class="plot-title">Group’s barrier against K</span>';
 const s2=el('svg',{viewBox:`0 0 ${BP.w} ${BP.h}`,role:'img','aria-label':'Barrier of the group move against Coulomb strength K, model line and printed Figure 4d points',id:'kplot-svg'});s2.append(el('rect',{x:kx(PAPER_K.min),y:BP.t,width:kx(PAPER_K.max)-kx(PAPER_K.min),height:BP.b-BP.t,fill:'#fff','fill-opacity':.045}));frame(s2,'K (eV Å)',[1,2,3,4,5,6,7].map(k=>[k,kx(k)]));
 s2.append(el('line',{x1:BP.l,x2:BP.r,y1:by(.6),y2:by(.6),stroke:'#d7e1f3','stroke-opacity':.6,'stroke-dasharray':'4 3'}));
 for(const [land,colour] of [['a',PALETTE.li],['b',PALETTE.single]]){
  s2.append(el('path',{d:path(MODEL.K.map(r=>[kx(r.K),by(chainBarrier(MODEL,r.K,land))])),fill:'none',stroke:colour,'stroke-width':1.6,class:'k-'+land}));
  for(const [K,E] of CURVES.panels['4d'].series['landscape_'+land])s2.append(el(land==='a'?'path':'circle',land==='a'?{d:`M${kx(K)} ${by(E)-3.6}l3.2 5.6h-6.4z`,fill:'none',stroke:'#fff','stroke-width':1}:{cx:kx(K),cy:by(E),r:2.8,fill:'none',stroke:'#fff','stroke-width':1}));
 }
 const k=el('g',{class:'kmarker'});k.append(el('line',{y1:BP.t,y2:BP.b,stroke:'#fff','stroke-opacity':.35,'stroke-dasharray':'2 3'}),el('circle',{r:5,fill:'none',stroke:'#fff','stroke-width':2}));s2.append(k);
 // Drawn over the K marker with a halo in the page colour, so the marker's dashed line never runs through the words.
 s2.append(el('text',{x:BP.r,y:by(.6)-5,'text-anchor':'end','font-size':11.5,fill:'#d7e1f3',stroke:'#0f111b','stroke-width':3,'stroke-linejoin':'round','paint-order':'stroke'},'one ion alone, 0.6'));
 c2.append(s2);pair.append(c1,c2);box.append(pair);
 const note=document.createElement('p');note.className='plot-axis-note';note.innerHTML='Lines: the paper’s model, re-run here. White marks: points printed in Figure 4c (at K = 3) and 4d; the paler band is the K range the paper plots. <span style="color:'+PALETTE.li+'">Green a</span>, <span style="color:#ff9697">red b</span>.';box.append(note);
}
let plotKind='';
function updatePlots(){
 const kind=state.question==='barrier'?'barrier':'event';
 if(kind!==plotKind){plotKind=kind;kind==='event'?buildEventPlot():buildBarrierPlot();}
 if(kind==='event'){
  for(const card of all('#event-plot .plot-card')){const on=card.dataset.compare===state.compare,pts=card.dataset.compare==='concerted'?P3B:P3E;card.setAttribute('aria-pressed',String(on));
   const m=card.querySelector('.marker'),s=on?shownProgress():0,e=curveAt(pts,s);m.setAttribute('transform',`translate(${ex(s).toFixed(1)},0)`);m.querySelectorAll('circle').forEach(c=>c.setAttribute('cy',ey(e).toFixed(1)));m.querySelector('line').setAttribute('x1',0);m.querySelector('line').setAttribute('x2',0);m.style.opacity=on?1:0;}
 }else{
  const s=shownProgress(),rowsA=MODEL.K.find(r=>Math.abs(r.K-state.K)<1e-6),svg=$('profile-svg');
  for(const land of ['a','b']){const rows=rowsA[land];svg.querySelector('.curve-'+land).setAttribute('d',path(rows.map(r=>[bx(r.s),by(r.E)])));svg.querySelector('.curve-'+land).setAttribute('stroke-opacity',land===state.landscape?1:.3);}
  const pr=svg.querySelector('.printed');pr.innerHTML='';
  if(Math.abs(state.K-3)<1e-6)for(const land of ['a','b'])for(const [x,E] of CURVES.panels['4c'].series['landscape_'+land])pr.append(el(land==='a'?'path':'circle',land==='a'?{d:`M${bx(x)} ${by(E)-3.2}l2.8 4.9h-5.6z`,fill:'none',stroke:'#fff','stroke-width':.9,'stroke-opacity':land===state.landscape?.95:.35}:{cx:bx(x),cy:by(E),r:2.4,fill:'none',stroke:'#fff','stroke-width':.9,'stroke-opacity':land===state.landscape?.95:.35}));
  const row=chainRow(MODEL,state.K,state.landscape,s),m=svg.querySelector('.marker');m.setAttribute('transform',`translate(${bx(3*s).toFixed(1)},0)`);m.querySelectorAll('circle').forEach(c=>c.setAttribute('cy',by(row.E).toFixed(1)));
  const km=$('kplot-svg').querySelector('.kmarker'),B=chainBarrier(MODEL,state.K,state.landscape);km.setAttribute('transform',`translate(${kx(state.K).toFixed(1)},0)`);km.querySelector('circle').setAttribute('cy',by(B).toFixed(1));
  for(const land of ['a','b'])$('kplot-svg').querySelector('.k-'+land).setAttribute('stroke-opacity',land===state.landscape?1:.3);
 }
}
const shownProgress=()=>scene&&state.question!=='barrier'?scene.view.progress:state.progress;

// ————— The 1D model, drawn in the stage —————
// Three layouts: wide for desktop stages, tall for narrow ones, so the words stay readable at either size, and phone for
// layout v2 on a phone (23 October 2026): the tall drawing across, shorter down, so it fills the phone's wide, low stage
// (the same stage as the model's: the stage no longer grows for the chart) with its words as large as before.
const LAYOUTS={
 wide:{CV:{w:960,h:530,l:70,r:900,top:40,base:220},F:15,B:{...LEDGER.wide,top:318,row:31,h:19},R:15,axis:'Position along the line (Å) · the pattern repeats every 12 Å'},
 tall:{CV:{w:480,h:600,l:46,r:462,top:48,base:205},F:17,B:{...LEDGER.tall,top:318,row:35,h:23},R:17,axis:'Position (Å) · repeats every 12 Å'},
 phone:{CV:{w:480,h:406,l:46,r:462,top:46,base:146},F:17,B:{...LEDGER.phone,top:246,row:24,h:18},R:16,tick:22,label:42,axis:'Position (Å) · repeats every 12 Å'}};
const phoneV2=matchMedia('(max-width:860px)');
let LY=LAYOUTS.wide,CV=LY.CV;
const cx=x=>CV.l+(CV.r-CV.l)*x/12,cy=e=>CV.base-(CV.base-CV.top)*e/.75;
let chainBuilt='';
function drawChain(){
 const svg=$('chain-svg'),s=state.progress,row=chainRow(MODEL,state.K,state.landscape,s),land=state.landscape;
 const kind=$('stage').clientWidth<600?(phoneV2.matches&&document.documentElement.classList.contains('layout-v2')?'phone':'tall'):'wide',F=LAYOUTS[kind].F;
 if(chainBuilt!==land+kind){chainBuilt=land+kind;LY=LAYOUTS[kind];CV=LY.CV;svg.setAttribute('viewBox',`0 0 ${CV.w} ${CV.h}`);for(const n of [...svg.querySelectorAll('g,path,line,text:not(title):not(desc)')])n.remove();
  const g=el('g',{class:'axes'});
  for(const e of [0,.3,.6]){g.append(el('line',{x1:CV.l,x2:CV.r,y1:cy(e),y2:cy(e),stroke:'#fff','stroke-opacity':e?.06:.25}));g.append(el('text',{x:CV.l-10,y:cy(e)+5,'text-anchor':'end','font-size':F,fill:'#95a2ba'},e.toFixed(1)));}
  for(const x of [0,3,6,9,12])g.append(el('text',{x:cx(x),y:CV.base+(LY.tick??24),'text-anchor':'middle','font-size':F,fill:'#95a2ba'},x));
  g.append(el('text',{x:(CV.l+CV.r)/2,y:CV.base+(LY.label??48),'text-anchor':'middle','font-size':F,fill:'#afbdd4'},LY.axis));
  g.append(el('text',{x:CV.l-10,y:CV.top-16,'text-anchor':'start','font-size':F,fill:'#afbdd4'},'Framework landscape φ (eV)'));
  const pts=[];for(let i=0;i<=480;i++){const x=12*i/480;pts.push([cx(x),cy(phi(x,land))]);}
  g.append(el('path',{d:path(pts),fill:'none',stroke:'#86adef','stroke-width':2.4}));
  svg.append(g,el('g',{class:'ions'}),el('g',{class:'bars'}));
 }
 // Ions on the landscape, coloured by whether each is climbing (orange) or falling (blue) since the start
 const ions=svg.querySelector('.ions');ions.innerHTML='';
 row.x.forEach((x,i)=>{const w=((x%12)+12)%12;
  const up=row.phi[i]-row.phi0[i];
  ions.append(el('circle',{cx:cx(w),cy:cy(phi(w,land))-LY.R-1,r:LY.R,fill:up>.005?'#ffa676':up<-.005?'#87bfff':'#e1e6ef',stroke:'#0f111b','stroke-width':2}));
  ions.append(el('text',{x:cx(w),y:cy(phi(w,land))-LY.R+4,'text-anchor':'middle','font-size':F,'font-weight':600,fill:'#10141f'},'ABCD'[i]));
 });
 // Bars: the change in each part of the energy since the start. Exact in this model, by construction:
 // total = ΔφA + ΔφB + ΔφC + ΔφD + Δrepulsion. Horizontal, signed, on a scale the "one ion alone" line makes readable.
 const bars=svg.querySelector('.bars');bars.innerHTML='';
 const B=LY.B;
 bars.append(el('text',{x:CV.l-10,y:B.top-26,'font-size':F,fill:'#afbdd4'},'Change in energy since the start (eV)'));
 const items=row.phi.map((p,i)=>['Ion '+'ABCD'[i],p-row.phi0[i],i]).concat([['Repulsion',row.coulomb-row.coulomb0,4],['= Total',row.E,5]]);
 const yAt=i=>B.top+i*B.row+(i===5?12:0);
 bars.append(el('line',{x1:B.zero,x2:B.zero,y1:B.top-8,y2:yAt(5)+B.row-2,stroke:'#fff','stroke-opacity':.32}));
 bars.append(el('line',{x1:B.lab,x2:CV.r,y1:yAt(5)-7,y2:yAt(5)-7,stroke:'#fff','stroke-opacity':.14}));
 // The reference line gives way on rows whose value is written across it (ledgerRefPath): no dashes through the digits.
 const ref=ledgerRef(B,land);bars.append(el('path',{d:ledgerRefPath(B,land,items.map(([,v,i])=>({v,y:yAt(i),h:B.h})),B.top-8,yAt(5)+B.row-2),fill:'none',stroke:'#fff','stroke-dasharray':'5 5','stroke-opacity':.55}),el('text',{x:ref+6,y:B.top-8,'text-anchor':kind==='wide'?'start':'middle','font-size':F-2,fill:'#d7e1f3'},'one ion alone: 0.60'));
 // Names in a column on the left, values at their bars' ends: a falling ion's bar and number never cover its name.
 items.forEach(([name,v,i])=>{const y=yAt(i),h=B.h,b=ledgerBar(B,land,v),fill=i===5?'#ffffff':i===4?'#c1afff':v>=0?'#ffa676':'#87bfff';
  bars.append(el('text',{x:B.lab,y:y+h/2+5,'text-anchor':'start','font-size':B.font,fill:i===5?'#fff':'#afbdd4','font-weight':i===5?600:400},name));
  bars.append(el('rect',{x:b.x,y,width:Math.max(1.5,b.w),height:h,rx:3,fill,'fill-opacity':i===5?.92:.85}));
  bars.append(el('text',{x:b.text,y:y+h/2+5,'text-anchor':b.anchor,'font-size':B.font,fill:'#eaeff9','font-variant-numeric':'tabular-nums'},(v>=-.005?'+':'−')+Math.abs(v).toFixed(2)));});
 $('chain-desc').textContent=`Landscape ${land}, K = ${state.K} eV Å, shift ${(3*s).toFixed(2)} Å. Total energy change ${row.E.toFixed(2)} eV; framework changes per ion ${row.phi.map((p,i)=>(p-row.phi0[i]).toFixed(2)).join(', ')} eV; repulsion ${(row.coulomb-row.coulomb0).toFixed(2)} eV.`;
}

// ————— Labels anchored to the 3D scene —————
const labelBox=$('scene-labels');
const ionTags=DATA.ions.map(i=>{const t=document.createElement('span');t.className='label ion-tag';t.textContent=i.id;labelBox.append(t);return t;});
const siteTags=DATA.sites.map(s=>{const t=document.createElement('span');t.className='label site-tag';t.textContent=s.kind;labelBox.append(t);return t;});
// Callouts that explain: the group or the selected ion during the event, the lone ion in the reference, and one site of each kind.
const notes=new Annotations($('stage'),{className:'channel-notes',avoid:()=>[...$('stage').querySelectorAll('.scene-key,.stage-bar,.stage-tools')].filter(e=>e.offsetParent).map(e=>notes.rect(e,6))});
let notesKey='';const CALLOUT_SITES=['T2','O2'];
function noteSpecs(sc){
 const v=sc.view,list=[];if(showingPaper()||state.display==='chain'||failed||(state.opening&&state.beat!=null&&state.beat<3)||v.cell>.5)return list;
 const pp=()=>sc.pixelsPerAngstrom(),at=f=>()=>{const p=sc.project(f());return {x:p.x,y:p.y,r:.3*pp()};};
 // The words sit in the clear space above or below the channel; the hairline drops to the ion or site.
 const band=edge=>{const ys=DATA.sites.map(o=>sc.project(o.p).y);return edge<0?Math.min(...ys)-1.9*pp()-12:Math.max(...ys)+1.9*pp()+12;};
 const off=(atFn,edge)=>({home:()=>{const a=atFn();return a&&{x:a.x,y:band(edge)};},dir:[1,edge*.05],dist:0});
 if(state.question==='sites'&&v.average<.5){
  for(const name of CALLOUT_SITES){const site=siteByName[name];if(!site)continue;const T=site.kind==='T';
   list.push({id:'site-'+name,title:T?'Tetrahedral site':'Octahedral site',note:T?'Four oxygens around it':'Six oxygens around it',tone:PALETTE.site,at:()=>{const p=sc.project(site.p);return {x:p.x,y:p.y,r:.42*pp()};},...off(()=>sc.project(site.p),T?-1:1),phone:'note'});}
 }else if(state.question!=='sites'&&state.compare==='single'&&v.single>.5){
  list.push({id:'single',title:'One Li⁺ alone',note:'Barrier 0.58 eV in Fig. 3e',tone:'#ff7879',at:at(()=>singlePosition(DATA,sc.shown.single)),...off(at(()=>singlePosition(DATA,sc.shown.single)),-1),phone:'note'});
 }else if(state.question!=='sites'&&v.single<.5&&v.average<.5){
  const sel=state.selection?.kind==='ion'?DATA.ions[state.selection.id-1]:null;
  if(sel){const k=hopKind(sel);list.push({id:'ion',title:`Ion ${sel.id}: ${sel.from} → ${sel.to}`,note:k==='downhill'?'Steps down into a tetrahedral site':'Steps up into an octahedral site',tone:PALETTE.li,at:at(()=>ionPositions(DATA,sc.shown.group)[sel.id-1]),...off(at(()=>ionPositions(DATA,sc.shown.group)[sel.id-1]),-1),phone:'note',live:true});}
  else list.push({id:'group',title:'Five Li⁺ move together',note:'Barrier 0.26 eV in Fig. 3b',tone:PALETTE.li,at:at(()=>ionPositions(DATA,sc.shown.group)[2]),...off(at(()=>ionPositions(DATA,sc.shown.group)[2]),-1),phone:'note'});
 }
 return list;
}
function placeLabels(sc){
 const v=sc.view,inEvent=state.question!=='sites',cell=v.cell>.5,P=ionPositions(DATA,sc.shown.group),pp=sc.pixelsPerAngstrom(),opening=state.opening&&state.beat!=null&&state.beat<3;
 // Tags are rigid: at their offset from what they name, or, where the frame has no room for that (tagPlace), fading out
 // where they last stood. They never slide onto their own ion or ring at an edge.
 const put=(t,pos,dx,dy,on)=>{const at=on&&tagPlace(sc.project(pos),dx,dy,t.offsetWidth,t.offsetHeight,sc.width,sc.height);t.classList.toggle('on',!!at&&!showingPaper()&&!opening);if(at)t.style.transform=`translate(${at.x.toFixed(1)}px,${at.y.toFixed(1)}px)`;};
 ionTags.forEach((t,i)=>{t.classList.toggle('selected',state.selection?.kind==='ion'&&state.selection.id===i+1);put(t,P[i],0,-(.36*pp+14),v.single<.5&&v.average<.5&&!cell);});
 siteTags.forEach((t,i)=>{t.classList.toggle('dim',inEvent);put(t,DATA.sites[i].p,.5*pp+8,.5*pp+6,!cell&&pp>22&&!(state.question==='sites'&&v.average<.5&&CALLOUT_SITES.includes(DATA.sites[i].name)));});
 const list=noteSpecs(sc),key=JSON.stringify(list.map(x=>[x.id,x.title,x.note]));if(key!==notesKey){notesKey=key;notes.show(list);}notes.frame();
}
const KEY={'cell-li':[PALETTE.li,'Li sites (T and O)','small'],zr:[PALETTE.zr,'Zr','small'],'cell-la':[PALETTE.la,'La','small'],'cell-oxygen':[PALETTE.oxygen,'Oxygen','small'],average:[PALETTE.li,'Time-averaged lithium','small'],moving:[PALETTE.single,'Moving Li⁺'],fixed:[PALETTE.liDeep,'Li⁺ held fixed'],li:[PALETTE.li,'Li⁺'],oxygen:[PALETTE.oxygen,'Oxygen'],zro6:[PALETTE.zr,'ZrO₆'],la:[PALETTE.la,'La']};
// The key lists what is drawn and nothing else (keyItems in the model): no oxygen in "Lithium only", La wherever it is drawn.
function sceneKey(){
 const dot=(c,t,cls='')=>`<span><i class="${cls}" style="background:${c}"></i>${t}</span>`;
 $('scene-key').innerHTML=keyItems(state).map(k=>k==='site'||k==='li-site'?`<span><i class="ring"></i>${k==='site'?'Site':'Li site (T or O)'}</span>`:k==='chain'?'<span style="color:#d9ffe4">— the channel drawn in Fig. 3b</span>':dot(...KEY[k])).join('');
 $('scene-key').style.opacity=state.opening&&state.beat!=null&&state.beat<3?0:1;
}

// ————— Selection —————
const siteByName=Object.fromEntries(DATA.sites.map(s=>[s.name,s]));
function selectionHTML(){
 const s=state.selection;if(!s)return '';
 if(s.kind==='ion'){const ion=DATA.ions[s.id-1],len=dist(ion.start,ion.end),k=hopKind(ion);
  const words=k==='downhill'?`It leaves a high-energy octahedral site for a tetrahedral one: <span class="kind-down">downhill</span> on the single-ion landscape of Fig. 3e.`:`It leaves a low-energy tetrahedral site for the next octahedral one: <span class="kind-up">uphill</span> on the single-ion landscape of Fig. 3e.`;
  return `<h3>Ion ${ion.id} · ${ion.from} → ${ion.to}</h3><p>Hops ${len.toFixed(2)} Å. ${words} That label describes the framework, not this ion’s share of the group’s energy, which DFT does not split up.</p>`;}
 if(s.kind==='site'){const x=siteByName[s.id],start=DATA.ions.find(i=>i.from===s.id),end=DATA.ions.find(i=>i.to===s.id);
  const occ=`At the start: ${start?'ion '+start.id:'empty'}. At the end: ${end?'ion '+end.id:'empty'}.`;
  return x.kind==='T'?`<h3>Tetrahedral site ${s.id}</h3><p>Four oxygens, all 1.94 Å away. The low-energy site of Fig. 3e. ${occ}</p>`:`<h3>Octahedral site ${s.id}</h3><p>Six oxygens, 2.03–2.45 Å away. The high-energy site of Fig. 3e. Lithium here sits off-centre, in one of two split positions 0.41 Å either side (the small dots). ${occ}</p>`;}
 return `<h3>A neighbouring ${s.site} site</h3><p>Off this channel. The paper’s figure does not show whether it holds lithium at this moment, so it is drawn as a faint marker only.</p>`;
}

// ————— Sync: one state for every visible part —————
let lastCaption=null,shownDisplay=null;
function caption(){
 if(state.opening&&state.beat!=null)return OPENING[state.beat];
 if(showingPaper()){const f=FIGURES[state.display];return {kicker:'He, Zhu & Mo 2017 · '+f.title.split(' · ')[0],title:f.heading,copy:'',note:''};}
 if(state.question==='sites')return CAPTIONS[state.context?'cell':state.occupancy==='average'?'average':'sites'];
 if(state.question==='event')return CAPTIONS[state.compare];
 return CAPTIONS[state.landscape==='b'?'barrierB':'barrier'];
}
function referenceKey(){return state.question==='sites'?'sites':state.question==='event'?state.compare:'barrier';}
function sync(){
 if(state!==viewWritten&&!state.opening&&!state.playing){viewWritten=state;writeView(encodeView(VIEW,state,reduce(initialState(state.reduced),{type:'stop-opening'}),reduce));}
 scene?.setState(state);
 const paper=showingPaper(),c=caption(),stage=$('stage'),q=state.question;
 stage.classList.toggle('showing-paper',paper);stage.classList.toggle('opening',state.opening);document.body.classList.toggle('exploring',!state.opening);
 stage.classList.toggle('showing-chain',state.display==='chain');$('chain-view').setAttribute('aria-hidden',String(state.display!=='chain'));
 // Leaving the 1D model for a wide figure, the stage waits for the chart to fade before it closes up (CSS .leaving-chain).
 stage.classList.toggle('leaving-chain',shownDisplay==='chain'&&paper);shownDisplay=state.display;
 // A new heading brings the whole caption in; new words under the same heading (the opening's last beat handing over to the
 // event's own words) bring in the words alone (captionChange).
 const change=captionChange(lastCaption,c),copy=$('caption-copy');
 // On a first visit the caption's own build-in brings the first one in; later changes (the opening's beats) arrive softly too.
 if(change==='all'){const cap=document.querySelector('.caption'),building=cap.getAnimations().some(a=>a.animationName==='build-rise'&&a.playState!=='finished');
  $('caption-kicker').textContent=c.kicker;$('caption-title').textContent=c.title;copy.textContent=c.copy;copy.hidden=!c.copy;cap.classList.remove('changing');copy.classList.remove('changing');void cap.offsetWidth;if(lastCaption&&!state.reduced&&!building)cap.classList.add('changing');}
 else if(change==='copy'){copy.textContent=c.copy;copy.hidden=!c.copy;copy.classList.remove('changing');void copy.offsetWidth;if(!state.reduced)copy.classList.add('changing');}
 if(change)lastCaption={kicker:c.kicker,title:c.title,copy:c.copy};
 $('caption-note').textContent=paper?'':c.note||'';
 $('paper-details').hidden=!paper||state.opening;$('controls').classList.toggle('dimmed',state.opening);
 if(paper){figureFor(state.display);sizeFigure();}else fitStage($('stage'),null);
 // Toolbar
 all('[data-question]').forEach(b=>{const on=b.dataset.question===q;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
 $('inspection').setAttribute('aria-labelledby','tab-'+q);
 const offered=DISPLAYS[q];
 all('[data-display]').forEach(b=>{b.hidden=!offered.includes(b.dataset.display)&&b.dataset.display!==state.display;b.setAttribute('aria-pressed',String(b.dataset.display===state.display));});
 // Controls for this question
 $('event-plot').hidden=q==='sites';$('transport-block').hidden=q==='sites';$('readout').hidden=q==='sites';
 // Without 3D, the controls that only steer the 3D scene go (ion chips, occupancy, view, framework): they would change nothing visible.
 $('compare-block').hidden=q!=='event';$('ion-block').hidden=q!=='event'||state.compare==='single'||failed;$('sites-block').hidden=q!=='sites'||failed;$('model-block').hidden=q!=='barrier';
 $('framework-block').hidden=q==='barrier'||failed;
 $('progress-label').textContent=q==='barrier'?'Shift the group':state.compare==='single'?'Move the ion':'Scrub the event';
 $('progress-note').textContent=q==='barrier'?'From 0 to 3 Å: each ion moves to the next site.':'Event coordinate, start to end. Not time.';
 all('[data-compare]:not(.plot-card)').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.compare===state.compare)));
 all('[data-framework]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.framework===state.framework)));
 all('[data-occupancy]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.occupancy===state.occupancy)));
 all('[data-context]').forEach(b=>b.setAttribute('aria-pressed',String(String(state.context)===b.dataset.context)));
 all('[data-landscape]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.landscape===state.landscape)));
 all('.ion-chips button').forEach(b=>b.setAttribute('aria-pressed',String(state.selection?.kind==='ion'&&state.selection.id===+b.dataset.ion)));
 $('coulomb').value=state.K;$('coulomb-value').value=state.K.toFixed(2)+' eV Å';
 $('progress').value=Math.round(state.progress*1000);
 $('play').setAttribute('aria-label',state.playing?'Pause':state.progress>=1?'Replay':'Play');$('play').innerHTML=state.playing?'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>':'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z"/></svg>';
 const sel=selectionHTML();$('selection').hidden=!sel||q==='barrier'||failed;$('selection').innerHTML=sel;
 const ref=REFERENCES[referenceKey()];$('reference').hidden=!ref||paper;
 if(ref){if(!$('reference-image').src.endsWith(ref.file))$('reference-image').src=BASE+ref.file;$('reference-image').alt=ref.caption.replace(/ Open.*$/,'');$('reference-caption').textContent=ref.caption;$('reference-open').dataset.figure=ref.figure;}
 // Stage furniture
 $('opening-controls').hidden=!state.opening;$('opening-pause').textContent=state.openingPaused?'Resume':'Pause';$('opening-pause').setAttribute('aria-pressed',String(state.openingPaused));
 $('figure-tools').hidden=!paper||state.opening;const cam=state.display==='model'&&!state.opening&&!failed;$('camera-controls').hidden=!cam;$('scene-help').hidden=!cam;
 sceneKey();depth();readout();updatePlots();if(state.display==='chain')drawChain();
 if(failed&&state.display==='model'){state.display=fallbackDisplay(state.question);sync();return;}
 managePlay();
}
// While the event plays, the image line keeps one wording; flashing "NEB image n" as each point passes read as flicker.
function readout(){
 const q=state.question,s=shownProgress();let html='';
 if(q==='event'&&state.compare==='concerted'){const e=curveAt(P3B,s),img=imageAt(P3B,s)+1;const near=!state.playing&&Math.abs(img-Math.round(img))<.05,where=near?`NEB image ${Math.round(img)} of ${P3B.length}`:`between NEB images ${Math.floor(img)} and ${Math.floor(img)+1}`;html=`<strong>${fmt(e)} eV</strong> above the end state<span>${where} · group barrier 0.26 eV</span>`;}
 else if(q==='event'){const e=curveAt(P3E,s),where=s<.08?'in T2':s>.92?'in T3':Math.abs(s-.5)<.06?'at the O2 site':s<.5?'between T2 and O2':'between O2 and T3';html=`<strong>${fmt(e)} eV</strong> above the T site<span>Ion ${where} · landscape barrier 0.58 eV</span>`;}
 else if(q==='barrier'){const row=chainRow(MODEL,state.K,state.landscape,s),e=signedEnergy(row.E);html=`<strong>${e.value} eV</strong> ${e.side} the start<span>Shift ${(3*s).toFixed(2)} Å · group barrier ${chainBarrier(MODEL,state.K,state.landscape).toFixed(2)} eV at K = ${state.K} eV Å${paperK(state.K)?'':', beyond the paper’s 2–\u20606.5, extrapolated'}</span>`;}
 $('readout').innerHTML=html;$('progress-value').value=q==='barrier'?(3*state.progress).toFixed(2)+' Å':state.progress.toFixed(2);
}
let depthKey='';
function depth(){const q=state.question;if(q===depthKey)return;depthKey=q;$('depth-argument').innerHTML=DEPTH[q].map(([h,p])=>`<details><summary>${h}</summary><p>${p}</p></details>`).join('');}
function onFrame(sc){placeLabels(sc);if(state.question!=='barrier'){updatePlots();readout();}}

// ————— Actions —————
const WORK={quat:null,target:null,halfHeight:5.5};
function stopOpening(){
 if(!state.opening)return;openingStop?.();openingStop=null;emergence.cancel();
 state=reduce(state,{type:'stop-opening'});state.beat=null;if(scene)scene.moveTo(WORK,700);
}
function dispatch(action){
 if(state.opening)stopOpening();
 const before=state;state=reduce(state,action);
 if(action.type==='question'&&before.question!==state.question&&scene){scene.moveTo(state.question==='sites'&&state.context?CELL_POSE():WORK);}
 if(action.type==='context'&&scene)scene.moveTo(state.context?CELL_POSE():WORK,1400);
 if(before.display!==state.display&&!['model','chain'].includes(before.display))saveFigure();
 sync();
 if(before.display!==state.display&&state.display==='model')scene?.wake();
}
function setDisplay(key){
 if(state.opening)stopOpening();
 if(key===state.display){sync();return;}
 saveFigure();state=reduce(state,{type:'display',value:key});sync();
 if(showingPaper())requestAnimationFrame(()=>{if(shownFigure()!==key)return;const v=figureViews[key];$('paper-viewport').scrollTo(v.x,v.y);});else scene?.wake();
}
// Playback: a steady sweep of the event coordinate. Its rate is a reading pace, not a physical speed.
const PLAY_SECONDS=7;
function managePlay(){
 if(!state.playing){playStop?.();playStop=null;return;}if(playStop)return;
 const tick=(now,dt)=>{if(!state.playing){playStop=null;return false;}const p=clamp(state.progress+dt/PLAY_SECONDS);state={...state,progress:p,playing:p<1};
  $('progress').value=Math.round(p*1000);scene?.setState(state);if(state.display==='chain')drawChain();readout();updatePlots();if(!state.playing){playStop=null;sync();return false;}return true;};
 if(scene)playStop=scene.animate(tick);else{let last=0,run=true;const loop=t=>{if(!run)return;const dt=last?(t-last)/1000:0;last=t;if(tick(t,dt)!==false)requestAnimationFrame(loop);};requestAnimationFrame(loop);playStop=()=>{run=false;};}
}

// ————— Emergence: the printed inset of Fig. 3b becomes the live channel —————
// The figure zooms until panel b's inset fills the stage at a measured scale. The camera takes the pose fitted to
// the inset's 13 printed oxygens (registration/fit-inset.py) at the same pixels per ångström, so when the inset
// dissolves the model's oxygens sit on the printed ones. Then the page gives way and the channel turns to show its depth.
const emergence={
 active:false,
 // Interrupted mid-lift, the figure fades out where it is while the model fades in; it never vanishes in one frame.
 // Its opacity is read from the inline style only: a computed-style read here would flush the half-changed stage classes
 // and show the full figure for a frame.
 cancel(){this.active=false;const t=this.transit;this.transit=null;$('stage').classList.remove('is-emerging','handing-over');if(!t)return;const o=t.style.opacity===''?1:+t.style.opacity;t.animate([{opacity:o},{opacity:0}],{duration:state.reduced?0:220*o,easing:'ease-out',fill:'forwards'}).finished.then(()=>t.remove(),()=>t.remove());},
 // Layout v2 draws the model in the part of the stage on screen while the stage is partly off it (kit/layout-v2.mjs):
 // the inset is sized to that part (Hv) and lands in it.
 plan(){const st=$('stage').getBoundingClientRect(),W=st.width,H=st.height,f=FIGURES['3'],Hv=Math.min(H,globalThis.Fig3DStageView?.()?.height||H);
  const S=Math.min(W*.86/INSET.w,(Hv-80)*.8/INSET.h);
  const insetScreen={x:(W-INSET.w*S)/2,y:(H-60-INSET.h*S)/2,w:INSET.w*S,h:INSET.h*S};
  return {W,H,S,insetScreen,final:{x:insetScreen.x-INSET.x*S,y:insetScreen.y-INSET.y*S,w:f.width*S,h:f.height*S}};},
 // Camera pose that draws the model exactly over the inset at its planned screen position.
 pose(plan){
  const v=DATA.paperView,k=plan.insetScreen.w/INSET.nativeW,ppa=v.scale_px_per_A_in_inset*k;
  const T=window.THREE,q=scene.paperQuat,right=new T.Vector3(1,0,0).applyQuaternion(q),up=new T.Vector3(0,1,0).applyQuaternion(q);
  const c=new T.Vector3(...v.inset_centre_A),sx=plan.insetScreen.x+(v.inset_dots_centre_px[0]+v.offset_px[0])*k,sy=plan.insetScreen.y+(v.inset_dots_centre_px[1]+v.offset_px[1])*k;
  const target=c.clone().addScaledVector(right,-(sx-plan.W/2)/ppa).addScaledVector(up,(sy-plan.H/2)/ppa);
  const hEff=plan.H/(2*ppa),halfHeight=hEff/Math.max(1,1.5/(plan.W/plan.H));
  return {quat:q.clone(),target,halfHeight};
 },
 // In layout v2 the figure sits beside the stage (Fig3DPairFigure, fast-ion-diffusion-v2.mjs): only the inset lifts off it,
 // crosses into the stage and lands where the model will be drawn, travelling in the explorer's coordinates.
 start(img){
  const pair=globalThis.Fig3DPairFigure?.();if(pair)img=pair.img;
  const st=$('stage'),layer=pair?pair.layer:st,r=img.getBoundingClientRect(),s=layer.getBoundingClientRect(),g=st.getBoundingClientRect();this.plan_=this.plan();
  this.offset=pair?{x:g.left-s.left,y:g.top-s.top-(globalThis.Fig3DStageView?.()?.shift||0)}:{x:0,y:0};
  const el=document.createElement('div');el.className='emerge-transit';el.setAttribute('aria-hidden','true');
  Object.assign(el.style,{left:r.left-s.left+'px',top:r.top-s.top+'px',width:r.width+'px',height:r.height+'px'});
  const copy=new Image();copy.src=img.currentSrc||img.src;copy.alt='';const f=FIGURES['3'],focus=document.createElement('div');focus.className='emerge-focus';
  Object.assign(focus.style,{left:INSET.x/f.width*100+'%',top:INSET.y/f.height*100+'%',width:INSET.w/f.width*100+'%',height:INSET.h/f.height*100+'%'});
  // The inset is an embedded render; a native-resolution copy takes over as it grows so the zoom stays sharp.
  const hi=new Image();hi.src=BASE+'figure-3b-inset.webp';hi.alt='';hi.className='emerge-hires';Object.assign(hi.style,{left:focus.style.left,top:focus.style.top,width:focus.style.width,height:focus.style.height});
  if(pair){el.style.clipPath=`inset(${INSET.y/f.height*100}% ${100-(INSET.x+INSET.w)/f.width*100}% ${100-(INSET.y+INSET.h)/f.height*100}% ${INSET.x/f.width*100}%)`;focus.hidden=true;}
  el.append(copy,hi,focus);layer.append(el);this.transit=el;this.copy=copy;this.focus=focus;this.hi=hi;this.ratio=r.height/r.width;this.from={x:r.left-s.left,y:r.top-s.top,w:r.width};st.classList.add('is-emerging');this.active=true;
 },
 zoom(u){const a=this.from,f=this.plan_.final,b={...f,x:f.x+this.offset.x,y:f.y+this.offset.y},w=a.w+(b.w-a.w)*u,k=smooth(.75,1,u);
  // Laid out, not transformed: a scaled layer would be rasterised at its starting size and blur.
  Object.assign(this.transit.style,{left:a.x+(b.x-a.x)*u+'px',top:a.y+(b.y-a.y)*u+'px',width:w+'px',height:w*this.ratio+'px'});this.hi.style.opacity=String(smooth(.25,.7,u));
  // The rest of the figure goes as the inset arrives, so the inset ends alone on the stage, not on a grey slab cut by the bar.
  this.copy.style.opacity=String(1-k);this.focus.style.opacity=String(Math.min(1,u*3)*(1-k));},
 handover(){scene.travel=null;const p=this.pose(this.plan_);scene.pose={quat:p.quat,target:p.target,halfHeight:p.halfHeight};
  // The model around the inset fades in (it used to appear whole in one frame); inside the inset the printed figure still covers it.
  // A CSS transition (.handing-over), not a script animation: if the reader leaves for a figure or the 1D chart mid-fade, the
  // stage's own fade-out takes over from wherever it stands. A script animation overrode it, kept rising and then vanished.
  $('stage').classList.add('handing-over');state.display='model';sync();scene.renderNow();
  // Crop the transit image to the inset only, so the rest of the figure is already gone and the inset dissolves over the model.
  const f=FIGURES['3'];this.transit.style.clipPath=`inset(${INSET.y/f.height*100}% ${100-(INSET.x+INSET.w)/f.width*100}% ${100-(INSET.y+INSET.h)/f.height*100}% ${INSET.x/f.width*100}%)`;this.focus.style.opacity='0';},
 dissolve(u){if(this.transit)this.transit.style.opacity=String(1-u);},
 done(){this.transit?.remove();this.transit=null;$('stage').classList.remove('is-emerging','handing-over');this.active=false;}
};
// How much of the stage is on screen; the opening starts as soon as any of it is (openingHolds).
let stageRatio=0;if(typeof IntersectionObserver==='function')new IntersectionObserver(e=>{stageRatio=e[0].isIntersecting?e[0].intersectionRatio:0;},{threshold:[0,.01,.5,1]}).observe($('stage'));else stageRatio=1;
const BUILD_IN=document.documentElement.classList.contains('build-in')?6:0;
if(BUILD_IN){const skip=()=>{for(const an of document.getAnimations())if(/^build-/.test(an.animationName||''))an.finish();for(const ev of ['pointerdown','keydown','wheel','touchstart'])removeEventListener(ev,skip,true);};for(const ev of ['pointerdown','keydown','wheel','touchstart'])addEventListener(ev,skip,{capture:true,passive:true});}
const EMERGE={zoom:2.4,dissolve:1.6,turn:2.6};
function startOpening(){
 if(!state.opening||!scene)return;
 const durations=OPENING.map(readingTime);durations[2]=Math.max(durations[2],EMERGE.dissolve+EMERGE.turn+2.2);durations[3]=PLAY_SECONDS+2.2;
 // In layout v2 the figure has its own column and the stage waits empty, so the wait before the lift is about 7 s, as on
 // silicon and rocksalt (owner decision 8); beside the figure in the stage (?layout=v1) it keeps its reading time.
 if(document.documentElement.classList.contains('layout-v2'))durations[0]=Math.min(durations[0],7);
 let beat=0,t=0,elapsed=0,waited=false,turnFrom=null;
 const enter=b=>{beat=b;t=0;state.beat=b;
  if(b===1){emergence.start($('paper-image'));}
  if(b===2){emergence.handover();turnFrom={quat:scene.pose.quat.clone(),target:scene.pose.target.clone(),halfHeight:scene.pose.halfHeight};}
  if(b===3){emergence.done();state.progress=0;}
  sync();};
 state.beat=0;state.display='3';state.progress=0;sync();
 openingStop=scene.animate((now,dt)=>{
  if(!state.opening)return false;if(openingHolds({beat,paused:state.openingPaused,ratio:stageRatio}))return true;
  if(!waited){waited=true;durations[0]+=Math.max(0,BUILD_IN-now/1000);}
  t+=dt;elapsed+=dt;$('opening-progress').style.setProperty('--p',clamp(elapsed/durations.reduce((a,b)=>a+b,0)).toFixed(3));
  if(beat===1)emergence.zoom(ease(clamp((t-.6)/EMERGE.zoom)));
  if(beat===2){emergence.dissolve(ease(clamp((t-.5)/EMERGE.dissolve)));const u=ease(clamp((t-.5-EMERGE.dissolve)/EMERGE.turn));
   scene.pose.quat.copy(turnFrom.quat).slerp(WORK.quat,u);scene.pose.target.copy(turnFrom.target).lerp(WORK.target,u);scene.pose.halfHeight=turnFrom.halfHeight+(WORK.halfHeight-turnFrom.halfHeight)*u;scene.dirty=true;}
  if(beat===3){const p=clamp((t-1)/PLAY_SECONDS);if(p!==state.progress){state.progress=p;scene.setState(state);$('progress').value=Math.round(p*1000);}}
  if(t>=durations[beat]){if(beat<OPENING.length-1)enter(beat+1);else{state=reduce(state,{type:'stop-opening'});state.beat=null;openingStop=null;sync();return false;}}
  return true;});
 enter(0);
}

// ————— Wiring —————
function failure(){failed=true;$('stage').classList.add('webgl-failed');$('fallback').hidden=false;$('scene-labels').hidden=true;emergence.cancel();state={...state,opening:false,playing:false,beat:null,display:showingPaper()||state.display==='chain'?state.display:fallbackDisplay(state.question)};all('[data-display="model"]').forEach(b=>b.disabled=true);}
let CELL_POSE=()=>WORK;
try{if(params.has('no-webgl')||params.has('fallback'))throw Error('Requested fallback');
 if(!window.THREE)throw Error('Three.js unavailable');
 scene=new ChannelScene($('channel'),DATA,{frame:onFrame,interrupt:()=>{if(state.opening){stopOpening();sync();}},failure:()=>{failure();sync();},pick:hit=>{if(state.opening){stopOpening();}if(!hit){if(state.selection){state={...state,selection:null};sync();}return;}dispatch({type:'select',value:{kind:hit.kind,id:hit.id,site:hit.site}});},home:()=>state.question==='sites'&&state.context?CELL_POSE():WORK});
 // Working view: the paper's viewpoint turned 24° about the vertical, enough to show depth while staying recognisable.
 const T=window.THREE;WORK.quat=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0).applyQuaternion(scene.paperQuat),-.42).multiply(scene.paperQuat.clone());WORK.target=new T.Vector3(0,0,0);
 const o=DATA.cell.origin,a=DATA.cell.a;CELL_POSE=()=>({quat:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0).applyQuaternion(WORK.quat),-.25).multiply(WORK.quat.clone()),target:new T.Vector3(o[0]+a/2,o[1]+a/2,o[2]+a/2),halfHeight:11.5});
 scene.pose={quat:WORK.quat.clone(),target:WORK.target.clone(),halfHeight:WORK.halfHeight};scene.home=WORK;
}catch(e){console.warn('Fig.3D: static fallback',e);failure();}
// Ion chips
$('ion-block').querySelector('.ion-chips').innerHTML=DATA.ions.map(i=>`<button data-ion="${i.id}" aria-pressed="false" aria-label="Ion ${i.id}, ${i.from} to ${i.to}">${i.id}<i>${i.from}→${i.to}</i></button>`).join('');
all('.ion-chips button').forEach(b=>b.addEventListener('click',()=>dispatch({type:'select',value:{kind:'ion',id:+b.dataset.ion}})));
all('[data-question]').forEach(b=>b.addEventListener('click',()=>dispatch({type:'question',value:b.dataset.question})));
$('explorer').querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=all('[data-question]'),i=tabs.indexOf(document.activeElement),n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[n].focus();tabs[n].click();});
all('[data-display]').forEach(b=>b.addEventListener('click',()=>setDisplay(b.dataset.display)));
// Clicked back while the other set is still fading out, that set carries on from where it stands (scene.frozen): no rewind.
function compareTo(v){dispatch({type:'compare',value:v,resume:v!==state.compare&&scene?.frozen!=null?scene.frozen:undefined});}
all('#compare-block [data-compare]').forEach(b=>b.addEventListener('click',()=>compareTo(b.dataset.compare)));
all('[data-framework]').forEach(b=>b.addEventListener('click',()=>dispatch({type:'framework',value:b.dataset.framework})));
all('[data-occupancy]').forEach(b=>b.addEventListener('click',()=>dispatch({type:'occupancy',value:b.dataset.occupancy})));
all('[data-context]').forEach(b=>b.addEventListener('click',()=>dispatch({type:'context',value:b.dataset.context==='true'})));
all('[data-landscape]').forEach(b=>b.addEventListener('click',()=>dispatch({type:'landscape',value:b.dataset.landscape})));
all('[data-camera]').forEach(b=>b.addEventListener('click',()=>{if(state.opening){stopOpening();sync();}scene?.control(b.dataset.camera);}));
$('progress').addEventListener('input',e=>{if(scene)scene.scrubbing=true;dispatch({type:'progress',value:e.target.value/1000});});
$('progress').addEventListener('change',()=>{if(scene)scene.scrubbing=false;});
$('coulomb').addEventListener('input',e=>dispatch({type:'K',value:+e.target.value}));
$('play').addEventListener('click',()=>dispatch({type:'play'}));
$('reference-open').addEventListener('click',e=>setDisplay(e.currentTarget.dataset.figure));
$('explore').addEventListener('click',()=>{stopOpening();sync();});
$('opening-pause').addEventListener('click',()=>{state={...state,openingPaused:!state.openingPaused};sync();});
$('figure-in').addEventListener('click',()=>zoomFigure(1.5));$('figure-out').addEventListener('click',()=>zoomFigure(1/1.5));$('figure-fit').addEventListener('click',()=>zoomFigure(0));
{let pan=null;const p=$('paper-viewport');p.addEventListener('pointerdown',e=>{if(figureViews[state.display]?.zoom>1&&e.pointerType!=='touch'){pan={x:e.clientX,y:e.clientY,l:p.scrollLeft,t:p.scrollTop};p.setPointerCapture(e.pointerId);p.classList.add('panning');}});p.addEventListener('pointermove',e=>{if(pan){p.scrollLeft=pan.l-(e.clientX-pan.x);p.scrollTop=pan.t-(e.clientY-pan.y);}});const end=()=>{if(pan){pan=null;p.classList.remove('panning');saveFigure();}};p.addEventListener('pointerup',end);p.addEventListener('pointercancel',end);p.addEventListener('scroll',()=>{if(!pan)saveFigure();},{passive:true});}
$('paper-image').addEventListener('load',()=>{if(showingPaper()){sizeFigure();const v=figureViews[shownFigure()];$('paper-viewport').scrollTo(v.x,v.y);}});
// Any input on the stage during the opening hands it over; a page scroll that starts on the stage does not (handsOver):
// a touch counts when it ends in pointerup, and one the browser takes for scrolling ends in pointercancel instead.
for(const [type,phase] of [['pointerdown','down'],['pointerup','up']])$('stage').addEventListener(type,e=>{if(state.opening&&!e.target.closest('.stage-bar')&&handsOver(e.pointerType,phase)){stopOpening();sync();}},{capture:true});
$('channel').addEventListener('keydown',e=>{if(state.opening){stopOpening();sync();}});
addEventListener('keydown',e=>{if(e.key==='Escape'&&showingPaper()&&!state.opening){e.preventDefault();setDisplay(DISPLAYS[state.question][0]==='chain'?'chain':'model');}});
addEventListener('resize',()=>{sizeFigure();if(state.display==='chain')drawChain();});
reducedQuery.addEventListener('change',e=>{if(state.opening)stopOpening();state=reduce(state,{type:'reduced',value:e.matches});sync();});
addEventListener('pagehide',()=>{state={...state,playing:false};playStop?.();playStop=null;scene?.stop();});
addEventListener('pageshow',()=>scene?.wake());
// The emergence from the paper belongs to the first visit (or ?intro); later visits open straight on the model.
if(state.opening&&!BUILD_IN)state=reduce(state,{type:'stop-opening'});
for(const key of ['question','compare','framework','occupancy','landscape'])if(params.has(key)){const v=params.get(key);state=reduce(state,{type:key,value:v});}
if(params.has('context'))state=reduce(state,{type:'context',value:true});
if(params.has('K'))state=reduce(state,{type:'K',value:+params.get('K')});
if(params.has('progress'))state={...state,progress:clamp(+params.get('progress'))};
if(params.has('display'))state={...state,display:params.get('display')};
if(params.has('select')){const [kind,id]=params.get('select').split(':');state={...state,selection:{kind,id:kind==='ion'?+id:id}};}
// A shared address (#question=…&figure=…) reopens that view on the first drawn frame; any hash already skips the opening.
const sharedView=viewParams();if(sharedView)state=decodeView(VIEW,sharedView,state,reduce);
const writeView=viewWriter();let viewWritten=null;
if(scene&&state.question==='sites'&&state.context)scene.pose={quat:CELL_POSE().quat,target:CELL_POSE().target,halfHeight:CELL_POSE().halfHeight};
window.figState=()=>({...state});window.figScene=scene;window.figData={DATA,CURVES};
sync();if(state.opening&&scene)startOpening();else if(state.opening){state.opening=false;state.display=fallbackDisplay(state.question);sync();}
if(sharedView)requestAnimationFrame(()=>$('explorer').scrollIntoView({block:'start'}));
document.documentElement.dataset.ready='true';
