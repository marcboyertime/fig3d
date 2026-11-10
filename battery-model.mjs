/** Fig.3D ideal insertion-cell bookkeeping. No voltage, kinetic or staging model. */
export const SPEC=Object.freeze({initialNegative:.60,initialPositive:.60,window:.30,hostUnits:20,totalLithium:24,schema:'fig3d-battery-2'});
export const MODES=Object.freeze(['discharge','charge']);
export function batteryState(progress,mode='discharge'){
  if(!Number.isFinite(progress)||progress<0||progress>1||!MODES.includes(mode))throw new RangeError('Use progress in [0,1] and discharge or charge mode.');
  const direction=mode==='discharge'?1:-1;
  const dischargeProgress=mode==='discharge'?progress:1-progress;
  const extent=SPEC.window*progress,negative=.60-.30*dischargeProgress,positive=.60+.30*dischargeProgress;
  const initialNegative=mode==='discharge'?.60:.30,initialPositive=mode==='discharge'?.60:.90;
  const transfer=SPEC.hostUnits*extent;
  return Object.freeze({progress,mode,direction,dischargeProgress,extent,negative,positive,initialNegative,initialPositive,
    negativeLithium:SPEC.hostUnits*negative,positiveLithium:SPEC.hostUnits*positive,
    lithiumTransferred:transfer,electronsReleased:transfer,electronsAccepted:transfer,
    electrolyteAccumulation:0,netChargeAccumulation:0,
    oxidation:mode==='discharge'?'negative':'positive',reduction:mode==='discharge'?'positive':'negative',
    externalDevice:mode==='discharge'?'load':'source',phase:progress===0?'start':progress===1?'window-complete':mode});
}
/** Reversing mode preserves the cell's physical composition. */
export const reverseProgress=progress=>{if(!Number.isFinite(progress)||progress<0||progress>1)throw new RangeError('Invalid progress.');return 1-progress;};
/** One composition axis for the slider and the graph in both modes: 0 at graphite x = 0.30, 1 at x = 0.60. Mode never mirrors it. */
export const compositionFraction=x=>{const low=SPEC.initialNegative-SPEC.window;if(!Number.isFinite(x)||x<low-1e-9||x>SPEC.initialNegative+1e-9)throw new RangeError('Invalid composition.');return (x-low)/SPEC.window;};
export function inventoryFills(fraction,bins=SPEC.hostUnits){
  if(!Number.isFinite(fraction)||fraction<0||fraction>1||!Number.isInteger(bins)||bins<1)throw new RangeError('Invalid inventory.');
  return Array.from({length:bins},(_,i)=>Math.max(0,Math.min(1,fraction*bins-i)));
}
export function assertConservation(s,tolerance=1e-10){
  const residuals={lithium:s.negativeLithium+s.positiveLithium+s.electrolyteAccumulation-SPEC.totalLithium,
    pairedCharge:s.electronsReleased-s.electronsAccepted,faradaicCoupling:s.lithiumTransferred-s.electronsReleased,
    negativeChange:SPEC.hostUnits*(s.initialNegative-s.negative)-s.direction*s.lithiumTransferred,
    positiveChange:SPEC.hostUnits*(s.positive-s.initialPositive)-s.direction*s.lithiumTransferred};
  return{pass:Object.values(residuals).every(v=>Math.abs(v)<=tolerance),residuals};
}
/** Where marker pair i is along its route at a flow phase. Ion i and electron i share it, so each pair leaves graphite together and arrives
 * in the oxide together (one electron per ion); golden-ratio offsets spread the nine pairs as a stream, not in ranks. */
export const pairFraction=(phase,i)=>((phase+i*.618034)%1+1)%1;
/** Marker size along a looping route: grows from nothing over the first `edge` of the path and shrinks to nothing over the last, so the wrap
 * from the end back to the start is never drawn as a jump. */
export const endFade=(t,edge)=>{const u=Math.max(0,Math.min(1,Math.min(t,1-t)/edge));return Math.max(.001,u*u*(3-2*u));};
/** How present one view's callouts are (0..1). `fade` is the camera's own visibility for that view. While the camera is anywhere but settled on
 * the view, presence may only fall, with the camera, so callouts leave with the flight and never return mid-flight; once the camera has settled
 * on the view they come back over `ease` ms (0: at once, for reduced motion). Nothing is cut or popped in. */
export const calloutPresence=(prev,fade,settled,dt,ease=300)=>settled?Math.min(fade,ease>0?prev+dt/ease:1):Math.min(prev,fade);
/** Soft window over a rider's travel: 0 outside [from,to], 1 inside it beyond `edge` of either end. Symmetric, so reversing the direction of
 * travel (t → 1−t, with the window mirrored the same way) leaves it unchanged. */
export const rideWindow=(t,from,to,edge=.05)=>{const a=Math.max(0,Math.min(1,(t-from)/edge)),b=Math.max(0,Math.min(1,(to-t)/edge));return a*a*(3-2*a)*b*b*(3-2*b);};
/** One frame of a rider callout: words that follow one marker across its window of travel, then hand over to the next. `travels` are the
 * markers' travel fractions in the current direction; r keeps {index, op, hold, at}. op (0..1) is how present the words are: never above the
 * soft window, so they are gone before the marker leaves it; rising by at most dt/ease and falling by at most 2dt/ease, so a hand-over, a
 * reversal or a pause is never a cut or a pop. While nothing moves, a marker parked on the window's soft edge is let go and the most central
 * one taken, so a paused or reduced-motion view never keeps half-faded words. `pickup` false (the camera is not settled on the rider's view)
 * lets words fade and let go but never rise or take up a new marker, so no callout is chosen, or comes in, on a moving camera. Returns the
 * followed index (null while there is none). */
export function riderStep(r,travels,{from,to,edge=.05,now,moving=true,ease=300,hold=420,pickup=true}){
  const w=t=>rideWindow(t,from,to,edge),inside=t=>t>=from&&t<=to,dt=Math.min(64,Math.max(0,now-(r.at??now)));r.at=now;
  let t=r.index==null?null:travels[r.index];
  if(t!=null&&!(r.op>0)&&(!inside(t)||!moving&&w(t)<1)){r.index=null;t=null;r.hold=now+hold;}
  // Moving: the newest marker on its way, so the words ride as long as possible. Still: the most central fully visible one.
  if(t==null&&pickup&&now>=(r.hold??-Infinity)){let best=null,score=Infinity;travels.forEach((c,i)=>{const s=!inside(c)?Infinity:moving?c:w(c)<1?Infinity:Math.abs(c-(from+to)/2);if(s<score){score=s;best=i;}});if(best!=null){r.index=best;t=travels[best];r.op=0;}}
  const op=r.op||0,target=t==null||!moving&&w(t)<1?0:pickup?w(t):Math.min(w(t),op),step=ease>0?dt/ease:1;
  r.op=target>=op?Math.min(target,op+step):Math.max(target,op-2*step);r.t=t;return r.index??null;
}
/** One pointer gesture on the stage, from where it went down (g.x0, g.y0; g.kind starts as 'press'). Nothing is decided until the pointer is
 * `slop` px away from its start, measured from the start and not per move, so a slow drag still leaves 'press'. Then it is a 'turn', or, for a
 * touch that sets off vertically, a 'scroll': the page scrolling, which never counts as input on the stage. Only a gesture that ends as a
 * 'press' is a tap. Returns the kind. */
export function gestureStep(g,x,y,{touch=false,slop=6}={}){
  const dx=x-g.x0,dy=y-g.y0;g.dx=dx;g.dy=dy;
  if(g.kind==='press'&&Math.hypot(dx,dy)>=slop)g.kind=touch&&Math.abs(dy)>Math.abs(dx)?'scroll':'turn';
  return g.kind;
}
/** View-space paths; never a physical trajectory or time coordinate. 2D/3D supported. */
export function pointAlongPolyline(points,fraction){
  if(!Number.isFinite(fraction)||fraction<0||fraction>1||points.length<2)throw new RangeError('Invalid path.');
  const lengths=points.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-points[i][j]))),total=lengths.reduce((a,b)=>a+b,0);
  let distance=fraction*total;
  for(let i=0;i<lengths.length;i++){
    if(distance<=lengths[i]||i===lengths.length-1){const t=lengths[i]?Math.min(1,distance/lengths[i]):0;return points[i].map((v,j)=>v+(points[i+1][j]-v)*t);}
    distance-=lengths[i];
  }
}
/** All routes are shared by renderer and tests. Electrons stay outside electrolyte. */
export const CELL=Object.freeze({negative:{min:[-4.45,-1.5,-1.5],max:[-2.05,1.5,1.5]},positive:{min:[2.05,-1.5,-1.5],max:[4.45,1.5,1.5]},electrolyte:{min:[-2.05,-1.5,-1.5],max:[2.05,1.5,1.5]},separatorX:0,graphiteOrigin:[-3.25,0,0],graphiteScale:.28});
export const ROUTES=Object.freeze({cell:{electrons:[[-4.2,.9,0],[-4.2,2.8,0],[4.2,2.8,0],[4.2,.9,0]],ions:[[-2.05,0,0],[2.05,0,0]]}});
export const REGIONS=CELL;
/** Honeycomb carbon patch, AA-aligned galleries for clarity. Bond length is one unit.
 * This geometry encodes rings and galleries, not bulk staging at an average x. */
export function graphiteGeometry(radius=3,layers=4,bond=.65,gap=1.67){
  const atoms=[],rings=[],indices=new Map(),bonds=new Map();
  const key=(x,z)=>`${x.toFixed(6)},${z.toFixed(6)}`;
  for(let q=-radius;q<=radius;q++)for(let r=-radius;r<=radius;r++){
    if(Math.abs(q+r)>radius)continue;
    const x=1.5*q*bond,z=Math.sqrt(3)*(r+q/2)*bond,ring=[];
    for(let k=0;k<6;k++){
      const px=x+bond*Math.cos(k*Math.PI/3),pz=z+bond*Math.sin(k*Math.PI/3),id=key(px,pz);
      if(!indices.has(id)){indices.set(id,atoms.length);atoms.push([px,0,pz]);}
      ring.push(indices.get(id));
    }
    for(let k=0;k<6;k++){const edge=[ring[k],ring[(k+1)%6]].sort((a,b)=>a-b);bonds.set(edge.join(','),edge);}
    rings.push({center:[x,0,z],indices:ring,q,r});
  }
  const layerY=Array.from({length:layers},(_,i)=>(i-(layers-1)/2)*gap);
  // One sublattice of hollow sites, separated by 3 C-C lengths; no adjacent crowded rings.
  const hollows=rings.filter(r=>((r.q-r.r)%3+3)%3===0);
  const sites=[];for(let layer=0;layer<layers-1;layer++)for(const ring of hollows)sites.push([ring.center[0],(layerY[layer]+layerY[layer+1])/2,ring.center[2]]);
  // Interleave galleries to avoid visually implying a staging sequence as mean occupancy changes.
  const ordered=sites.map((position,i)=>({position,rank:(i*17)%sites.length})).sort((a,b)=>a.rank-b.rank).map(item=>item.position);
  return {atoms,bonds:[...bonds.values()],rings,layerY,sites:ordered,bond,gap};
}
/** An explanatory path reaches a gallery through an exposed edge, parallel to sheets. */
export function graphiteIonPath(site,edgeX=4.8){return [[edgeX,site[1],site[2]],site];}
/** The highlighted ion's start: a central hollow whose path to the edge meets no lit site at any slider composition (fills only grow with x),
 * so it never doubles up on a drawn lithium. Falls back to the first central hollow. */
export function galleryStartSite(g=graphiteGeometry(),maxFraction=SPEC.initialNegative){
  const fills=inventoryFills(maxFraction,g.sites.length),central=g.sites.filter(s=>Math.abs(s[0])<1e-9&&Math.abs(s[2])<1e-9).sort((a,b)=>b[1]-a[1]);
  const clear=site=>{const [a,b]=graphiteIonPath(site);return g.sites.every((s,i)=>{if(!(fills[i]>0))return true;const t=Math.max(0,Math.min(1,(s[0]-b[0])/(a[0]-b[0])));return Math.hypot(s[0]-(b[0]+(a[0]-b[0])*t),s[1]-b[1],s[2]-b[2])>g.bond;});};
  return central.find(clear)||central[0];
}
