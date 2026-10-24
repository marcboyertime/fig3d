// State, data helpers and the pure science of the fast-ion-diffusion companion.
// Scope, sources and every assumption: references/fast-ion-diffusion/scientific-notes.md.
// Data files (site/assets/fast-ion-diffusion/):
//   llzo-scene.json  garnet channel rebuilt from Ia-3d Wyckoff positions, registered to the Fig. 3b inset
//   curves.json      Fig. 3b, 3e, 4c, 4d points read from the PDF's vector markers
//   fig4-model.json  the paper's 1D model (Methods eqs 6–8) re-run here for K = 1…7 eV Å
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number(v)||0));
export const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
export const lerp=(a,b,t)=>a+(b-a)*t;

export const QUESTIONS=['sites','event','barrier'];
// Figures offered beside each question; the first entry is what the question opens on in the paper.
export const DISPLAYS={sites:['model','2','3'],event:['model','3','2'],barrier:['chain','4','1','3']};
// Without 3D, a question opens on its own first display that needs no WebGL: Figure 2 for the sites, Figure 3 for the
// event, the 1D chart for the barrier. (Until the 16 Oct 2026 repair every question fell back to Figure 3.)
export const fallbackDisplay=q=>DISPLAYS[q].find(d=>d!=='model');
export const FIGURES={
 '1':{file:'figure-1.webp',width:1008,height:1388,title:'Figure 1 · single-ion versus concerted migration',heading:'The idea in one picture',caption:'Figure 1 · Schematic illustration of single-ion migration versus multi-ion concerted migration. For single-ion migration (upper insets), the migration energy barrier is the same as the barrier of the energy landscape. In contrast, the concerted migration of multiple ions (lower insets) has a lower energy barrier as a result of strong ion–ion interactions and unique mobile ion configuration in super-ionic conductors.'},
 '2':{file:'figure-2.webp',width:2032,height:1352,title:'Figure 2 · Li ion diffusion in super-ionic conductors',heading:'Where the lithium spends its time',caption:'Figure 2 · (a–c) Crystal structures of LGPS, LLZO and LATP marked with Li sites (partially filled green spheres), Li⁺ diffusion channels (green bars) and polyanion groups. (d–f) The probability density of Li⁺ spatial occupancy during AIMD simulations; the zoom-in subsets show its elongation along the migration channel (Li green, O/S yellow). (g–i) Van Hove correlation functions of Li⁺ dynamics during AIMD simulations.'},
 '3':{file:'figure-3.webp',width:1936,height:980,title:'Figure 3 · concerted migration and energy landscape',heading:'Two energy curves, two different questions',caption:'Figure 3 · (a–c) Migration energy barrier in LGPS, LLZO and LATP for concerted migration of multiple Li ions hopping into the next sites along the diffusion channel. Insets show the Li⁺ path (green spheres) and O/S ions (yellow spheres). (d–f) The energy landscape of single Li⁺ along the migration channel (shown in insets) across multiple Li sites (partially filled green sphere) and Li⁺ pathway (red spheres).'},
 '4':{file:'figure-4.webp',width:1936,height:496,title:'Figure 4 · diffusion model for concerted migration',heading:'A model small enough to reason with',caption:'Figure 4 · (a,b) The potential energy of the structural framework with low (a) or high (b) barriers at the high-energy sites; the mobile ion configurations and migration paths are illustrated. (c) The energy profile for the concerted migration in landscapes (a) and (b) at K = 3 eV Å. (d) The energy barrier of concerted migration at different Coulomb interaction strength K.'}
};
// Panel b's inset inside figure-3.webp (figure pixels) and its native pixel size; see extract-figures.py.
export const INSET={x:(269.688-56)*4,y:(72.490-52)*4,w:(362.318-269.688)*4,h:(114.874-72.490)*4,nativeW:579,nativeH:265};

export const PRESET_PROGRESS={sites:0,event:0,barrier:0};
// The first-visit opening starts as soon as any of the stage is on screen; beat 0 holds only while the stage is
// wholly off screen, or while the reader has paused. (Until 16 Oct 2026 it waited for 60 % of the stage, which a
// 1512 × 982 window never shows without scrolling, so the opening never began.)
export const openingHolds=({beat,paused,ratio})=>!!paused||(beat===0&&!(ratio>0));
// Any input on the stage hands the opening over, but a page scroll that starts on the stage is not input. A mouse press
// counts at once; a touch (or pen, which can also pan the page) counts only when it ends as a tap or a drag the page keeps
// ('up'), since one the browser takes for scrolling ends in pointercancel. (Until 16 Oct 2026 every touch counted at
// pointerdown, so a phone reader scrolling past the stage ended the opening.)
export const handsOver=(pointerType,phase)=>pointerType==='mouse'?phase==='down':phase==='up';
// What a caption change rewrites: 'all' when the heading changes, 'copy' when only the words do (the opening's last beat
// and the explorer's event share a heading), '' when nothing does. (Until 16 Oct 2026 only the heading was compared, so
// after a first visit's opening the words stayed the opening's.)
export const captionChange=(a,b)=>!a||a.kicker!==b.kicker||a.title!==b.title?'all':a.copy!==b.copy?'copy':'';
// A tag riding the scene sits at a fixed offset (dx, dy) from what it names, inside the frame [4, W−w−4] × [4, H−h−bottom]
// (the bottom keeps clear of the stage bar). Where the frame has no room for that place, the tag has none (null) and
// fades out where it was: it never slides onto the ion or site it names. (Until 16 Oct 2026 tags were clamped into
// the frame, so near an edge a tag sat on its own ion, or named an ion off screen.)
export function tagPlace(p,dx,dy,w,h,W,H,bottom=60){const x=p.x+dx-w/2,y=p.y+dy-h/2;return x>=4&&y>=4&&x<=W-w-4&&y<=H-h-bottom?{x,y}:null;}
export function initialState(reduced=false){
 return {question:'event',display:reduced?'model':'3',progress:0,playing:false,reduced,compare:'concerted',framework:'cages',occupancy:'moment',context:false,
  selection:null,K:3,landscape:'a',opening:!reduced,openingPaused:false,beat:null,saved:{}};
}
export function reduce(s,a){
 const quiet={playing:false,opening:false};
 switch(a.type){
  case 'question':{
   if(!QUESTIONS.includes(a.value))return s;
   if(a.value===s.question)return {...s,...quiet,display:DISPLAYS[s.question][0]};
   const saved={...s.saved,[s.question]:{progress:s.progress,display:s.display}};
   const back=saved[a.value];
   return {...s,...quiet,question:a.value,saved,progress:back?.progress??PRESET_PROGRESS[a.value],display:DISPLAYS[a.value][0],context:a.value==='sites'?s.context:false,occupancy:a.value==='sites'?s.occupancy:'moment'};
  }
  case 'display':return {...s,opening:false,display:a.value};
  case 'progress':return {...s,opening:false,playing:a.playing??false,progress:clamp(a.value),display:s.question==='barrier'?(s.display==='model'?'model':'chain'):'model'};
  case 'play':return {...s,opening:false,display:s.question==='barrier'?(s.display==='model'?'model':'chain'):'model',playing:!s.playing,progress:!s.playing&&s.progress>=1?0:s.progress};
  // A new comparison restarts at 0, unless its set is still on screen fading out (clicked back mid-fade): then it carries on
  // from where it stands (a.resume), so neither the picture nor the scrubber rewinds.
  case 'compare':return {...s,...quiet,compare:a.value,display:'model',progress:a.value===s.compare?s.progress:clamp(a.resume??0)};
  case 'framework':return {...s,opening:false,framework:a.value,display:'model'};
  case 'occupancy':return {...s,...quiet,occupancy:a.value,display:'model',progress:0};
  case 'context':return {...s,...quiet,context:a.value,display:'model'};
  case 'select':return {...s,opening:false,selection:a.value&&s.selection&&s.selection.kind===a.value.kind&&s.selection.id===a.value.id?null:a.value};
  case 'K':return {...s,opening:false,K:clamp(Math.round(a.value*4)/4,1,7),display:s.display==='model'?'model':'chain'};
  case 'landscape':return {...s,opening:false,landscape:a.value,display:s.display==='model'?'model':'chain'};
  case 'stop-opening':return {...s,opening:false,openingPaused:false,beat:null,display:s.display==='3'||s.display==='model'?'model':s.display};
  case 'reduced':return {...s,reduced:a.value,playing:false};
  case 'reset':return {...initialState(s.reduced),opening:false,display:DISPLAYS[s.question][0],question:s.question};
  default:return s;
 }
}

// ————— Linked curves —————
// Piecewise-linear between the printed markers: nothing between NEB images is invented beyond a straight line,
// and the plotted line is drawn the same way the paper draws it.
export function curveAt(points,s){
 const p=points;if(s<=p[0].s)return p[0].energy_eV;
 for(let i=1;i<p.length;i++)if(s<=p[i].s){const t=(s-p[i-1].s)/(p[i].s-p[i-1].s);return lerp(p[i-1].energy_eV,p[i].energy_eV,t);}
 return p[p.length-1].energy_eV;
}
// Event coordinate s ∈ [0,1] ↔ NEB image index: Fig. 3b's images are equally spaced (6.42–6.48 pt apart).
export const imageAt=(points,s)=>clamp(s)*(points.length-1);

// ————— The five-ion event —————
// Every ion moves on a straight line from its start to its end at the same normalized rate.
// This is an interpolation for following identities; it is not the calculated minimum-energy path.
export function ionPositions(scene,s){const u=clamp(s);return scene.ions.map(i=>i.start.map((v,k)=>v+(i.end[k]-v)*u));}
// The single-ion reference of Fig. 3e: one Li⁺ from T2 straight through the O2 cavity centre to T3.
export function singlePath(scene){const by=Object.fromEntries(scene.sites.map(x=>[x.name,x.p]));return {from:by.T2,via:by.O2,to:by.T3};}
// Fig. 3e's x axis is not evenly spaced (7.24–8.32 pt): map s along the T–O–T line by the printed positions.
export function singlePosition(scene,s){const {from,to}=singlePath(scene);return from.map((v,k)=>v+(to[k]-v)*clamp(s));}
// The lithium held fixed around it. The paper removes one Li and relaxes only non-Li atoms (Methods), so the rest stay put;
// which sites its calculation kept filled is not shown. Drawn here (schematic): the event's start sites, without the
// lone ion's own start (T2) and without the ion at T3, taken as the one removed so the lone ion has a site to move into.
export function singleContext(scene){return scene.ions.filter(i=>i.from!=='T2'&&i.from!=='T3');}
export const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
export function minSeparation(scene,steps=200){let m=Infinity,at=0;for(let k=0;k<=steps;k++){const P=ionPositions(scene,k/steps);for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const d=dist(P[i],P[j]);if(d<m){m=d;at=k/steps;}}}return {min:m,at};}

// Which way each ion goes on the single-ion landscape (Fig. 3e: O sites high, T sites low).
export function hopKind(ion){return ion.from[0]==='O'&&ion.to[0]==='T'?'downhill':ion.from[0]==='T'&&ion.to[0]==='O'?'uphill':'level';}

// ————— The paper's 1D model (Fig. 4), as re-run in production/fast-ion-diffusion/model —————
export const L=6,EA=.6;
export function phi(x,land){const t=2*Math.PI*x/L-Math.PI;return land==='a'?EA*(Math.cos(t)-.25*Math.cos(2*t)+1.25)/2:EA*(Math.cos(t)-1.5*Math.cos(2*t)+2.5)/4.08;}
// Rows are stored for K = 1…7 in steps of 0.25 and s = 0…3 Å in 24 steps; interpolate in s only (K snaps to the grid).
export function chainRow(model,K,land,s){
 const k=model.K.find(r=>Math.abs(r.K-K)<1e-6)||model.K[0],rows=k[land],x=clamp(s)*(rows.length-1),i=Math.min(rows.length-2,Math.floor(x)),t=x-i,a=rows[i],b=rows[i+1];
 const mix=(p,q)=>p+(q-p)*t;
 return {E:mix(a.E,b.E),x:a.x.map((v,j)=>mix(v,b.x[j])),phi:a.phi.map((v,j)=>mix(v,b.phi[j])),coulomb:mix(a.coulomb,b.coulomb),phi0:rows[0].phi,coulomb0:rows[0].coulomb};
}
export function chainBarrier(model,K,land){const k=model.K.find(r=>Math.abs(r.K-K)<1e-6);return Math.max(...k[land].map(r=>r.E));}
// The paper plots K = 2–6.5 eV Å (Fig. 4d: ten points per landscape, the last at 6.5, past the axis's "6" tick);
// the slider's 1–2 and 6.75–7 are the same model, extrapolated. (Until the 16 Oct 2026 repair this said 2–6.)
export const PAPER_K={min:2,max:6.5};
export const paperK=K=>K>=PAPER_K.min-1e-9&&K<=PAPER_K.max+1e-9;
// An energy relative to a reference, worded by its side: never "−0.10 eV above".
export function signedEnergy(E){const v=Math.abs(E)<.005?0:E;return {value:Math.abs(v).toFixed(2),side:v<0?'below':'above'};}
// The energy ledger's horizontal bars (SVG units of the wide, tall and phone 1D-model layouts). Names sit in a column
// from `lab`; bars grow from `zero`; each value is written at its bar's end. Zero and reach leave room for the largest
// values the re-run reaches (Δφ −0.60…+0.60 eV, total up to 1.72 eV in landscape b) without touching the names.
// The phone layout (layout v2 on a phone, 23 October 2026) is the tall one across and shorter down.
export const LEDGER={wide:{lab:60,zero:500,reach:330,font:14,width:960},tall:{lab:36,zero:287,reach:134,font:16,width:480},phone:{lab:36,zero:287,reach:134,font:16,width:480}};
export function ledgerBar(L,land,v){const w=v*L.reach/(land==='a'?.8:1.75);return {x:Math.min(L.zero,L.zero+w),w:Math.abs(w),text:w>=0?L.zero+w+8:L.zero+w-8,anchor:w>=0?'start':'end'};}
// The dashed "one ion alone: 0.60" line gives way on any row whose value is written across it, so its dashes never run
// through the digits. Values are five characters, at most 3.1 em wide (measured "−0.60" 2.99 em in Sora); rows [{v,y,h}]
// top to bottom; returns the line as an SVG path of the segments left standing.
export const ledgerRef=(L,land)=>L.zero+.6*L.reach/(land==='a'?.8:1.75);
export function ledgerRefPath(L,land,rows,top,bottom){
 const x=ledgerRef(L,land),w=3.1*L.font;let d='',y=top;
 for(const r of rows){const b=ledgerBar(L,land,r.v),a=b.anchor==='start'?b.text:b.text-w;if(a-4<x&&a+w+4>x){if(r.y-3>y)d+=`M${x} ${y}V${r.y-3}`;y=r.y+r.h+3;}}
 return bottom>y?d+`M${x} ${y}V${bottom}`:d;
}

// ————— The 3D key: it names only what the scene draws —————
// Scene setState: oxygens unless "Lithium only", ZrO₆ and La only in "Full". The whole cell draws its own Li, Zr and La
// dots, and keeps the channel's oxygens (dimmed to 40 %) unless "Lithium only".
export function keyItems(s){
 if(s.question==='barrier'&&s.display==='chain')return [];
 const none=s.framework==='none';
 if(s.question==='sites'&&s.context)return ['cell-li','zr','cell-la',...(none?[]:['cell-oxygen']),'chain'];
 const fw=[...(none?[]:['oxygen']),...(s.framework==='full'?['zro6','la']:[])];
 if(s.question==='sites'&&s.occupancy==='average')return ['average','site',...fw];
 if(s.question!=='sites'&&s.compare==='single')return ['moving','fixed','site',...fw];
 return ['li','li-site',...fw];
}

// The reader's view as address fields (site/view-state.mjs), in the order the review parameters are applied: the
// question first (it brings back its own progress and figure), the comparison and framework, the 1D model's K and
// landscape, the event coordinate, then the figure beside the model. A field is written only on the questions it shapes.
export const VIEW=[
 {key:'question',get:s=>s.question,act:v=>QUESTIONS.includes(v)?{type:'question',value:v}:null},
 {key:'compare',when:s=>s.question!=='barrier',get:s=>s.compare,act:v=>['concerted','single'].includes(v)?{type:'compare',value:v}:null},
 {key:'framework',get:s=>s.framework,act:v=>['cages','full','none'].includes(v)?{type:'framework',value:v}:null},
 {key:'occupancy',when:s=>s.question!=='barrier',get:s=>s.occupancy,act:v=>['moment','average'].includes(v)?{type:'occupancy',value:v}:null},
 {key:'landscape',when:s=>s.question==='barrier',get:s=>s.landscape,act:v=>['a','b'].includes(v)?{type:'landscape',value:v}:null},
 {key:'context',when:s=>s.question==='sites',get:s=>s.context,act:(v,s)=>v!==s.context?{type:'context',value:v}:null,parse:t=>t==='1',format:v=>v?'1':'0'},
 {key:'K',when:s=>s.question==='barrier',get:s=>s.K,act:v=>({type:'K',value:v}),parse:t=>t===''?NaN:+t,format:v=>String(+(+v).toFixed(3))},
 {key:'progress',get:s=>s.progress,act:v=>({type:'progress',value:v}),parse:t=>t===''?NaN:+t,format:v=>String(+(+v).toFixed(3))},
 {key:'figure',get:s=>s.display,act:(v,s)=>DISPLAYS[s.question]?.includes(v)?{type:'display',value:v}:null},
];
