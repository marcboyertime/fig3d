// The rocksalt lattice and percolation model behind rocksalt.html (Hau et al., Adv. Mater. 37 (2025) 2502766, Figure 1).
// What it computes, and what it does not, is specified in production/rocksalt/model-spec.md, section 4.
// Moved here unchanged from the page's inline "core:start"…"core:end" block (17 October 2026, the rocksalt rebuild's first
// step), so the page, its Node checks and the percolation sweep all run this one copy. The original page, with the same
// core, is preserved in references/rocksalt-li-pathways-user-original.html; evidence/rocksalt-percolation/sweep.mjs runs that.
// Changed since by owner decision 4 (16 October 2026, production/rocksalt/model-spec.md, 3.3): the short-range-order swaps
// (applySRO) are gone, because the order slider's two ends were not sourced; every crystal is fully random.

// Cation sites of a rocksalt lattice sit at integer (i,j,k) with i+j+k even (units of half a cube edge).
// Every unit cube of that grid holds one tetrahedral site; the four even-sum corners of the cube
// are the four octahedral cation sites that face-share with it.
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const NN=[];for(const a of[-1,1])for(const b of[-1,1]){NN.push([a,b,0],[a,0,b],[0,a,b])}
export const CORNERS=[];for(let dx=0;dx<2;dx++)for(let dy=0;dy<2;dy++)for(let dz=0;dz<2;dz++)CORNERS.push([dx,dy,dz]);
export const KEY=(i,j,k)=>((i+64)*256+(j+64))*256+(k+64);
export function buildLattice(range,keep){
  // range = [imin,imax,jmin,jmax,kmin,kmax], keep(i,j,k) filters sites
  const sites=[],map=new Map();
  for(let i=range[0];i<=range[1];i++)for(let j=range[2];j<=range[3];j++)for(let k=range[4];k<=range[5];k++){
    if(((i+j+k)&1)!==0)continue;
    if(keep&&!keep(i,j,k))continue;
    map.set(KEY(i,j,k),sites.length);sites.push([i,j,k]);
  }
  const tets=[];
  for(let p=range[0]-1;p<=range[1];p++)for(let q=range[2]-1;q<=range[3];q++)for(let r=range[4]-1;r<=range[5];r++){
    const v=[];
    for(const[dx,dy,dz]of CORNERS){if(((p+q+r+dx+dy+dz)&1)===0){const id=map.get(KEY(p+dx,q+dy,r+dz));if(id===undefined)break;v.push(id)}}
    if(v.length===4)tets.push({v,c:[p+.5,q+.5,r+.5]});
  }
  const nbr=sites.map(([i,j,k])=>{const o=[];for(const[a,b,c]of NN){const id=map.get(KEY(i+a,j+b,k+c));if(id!==undefined)o.push(id)}return o});
  return{sites,map,tets,nbr};
}
export function cubicLattice(L){const n=2*L;return buildLattice([0,n-1,0,n-1,0,n-1])}
// Spinel Fd-3m written on the rocksalt frame (units of a_s/4): 16c holds Li, 16d holds TM.
export const C16=(()=>{const s=new Set();const base=[[0,0,0],[3,1,2],[1,2,3],[2,3,1]],tr=[[0,0,0],[0,2,2],[2,0,2],[2,2,0]];
  for(const b of base)for(const t of tr)s.add(KEY((b[0]+t[0])%4,(b[1]+t[1])%4,(b[2]+t[2])%4));return s})();
export const mod4=v=>((v%4)+4)%4;
export function speciesSpinel(lat){return Uint8Array.from(lat.sites,([i,j,k])=>C16.has(KEY(mod4(i),mod4(j),mod4(k)))?0:1)} // 0=Li 1=TM
export function speciesLayered(lat){return Uint8Array.from(lat.sites,([i,j,k])=>(((i+j+k)/2)&1)===1?0:1)}   // alternating (111) planes; odd planes Li, so TM layers sit top and bottom
export function speciesRandom(lat,x,seed){ // Li_{1+x}M_{1-x}O2: a fraction (1+x)/2 of cation sites hold Li
  const rnd=mulberry32(seed),n=lat.sites.length,rank=Float64Array.from({length:n},rnd),order=Array.from({length:n},(_,i)=>i).sort((a,b)=>rank[a]-rank[b]);
  const nLi=Math.round(n*(1+x)/2),sp=new Uint8Array(n).fill(1);for(let t=0;t<nLi;t++)sp[order[t]]=0;return sp}
export function analyse(lat,sp,maxTM,axes,tol){
  const n=lat.sites.length,par=Int32Array.from({length:n},(_,i)=>i);
  const find=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a]}return a};
  const census=[0,0,0,0,0],tmCount=new Uint8Array(lat.tets.length),active=[];
  lat.tets.forEach((t,ti)=>{let m=0;for(const v of t.v)m+=sp[v];tmCount[ti]=m;census[m]++;
    if(m<=maxTM){const li=t.v.filter(v=>sp[v]===0);if(li.length>=2){active.push(ti);for(let q=1;q<li.length;q++){const a=find(li[0]),b=find(li[q]);if(a!==b)par[a]=b}}}});
  const size=new Map();let nLi=0;for(let i=0;i<n;i++)if(sp[i]===0){nLi++;const r=find(i);size.set(r,(size.get(r)||0)+1)}
  let big=-1,bigSize=0;for(const[r,c]of size)if(c>bigSize){bigSize=c;big=r}
  // which display axes does some cluster reach both ends of?
  const proj=axes.map(ax=>lat.sites.map(s=>s[0]*ax[0]+s[1]*ax[1]+s[2]*ax[2])),lo=proj.map(p=>Math.min(...p)),hi=proj.map(p=>Math.max(...p));
  const cmin=new Map(),cmax=new Map();
  for(let i=0;i<n;i++)if(sp[i]===0){const r=find(i);axes.forEach((_,a)=>{const v=proj[a][i],k=r*8+a;if(!cmin.has(k)||v<cmin.get(k))cmin.set(k,v);if(!cmax.has(k)||v>cmax.get(k))cmax.set(k,v)})}
  const spans=axes.map(()=>false);for(const r of size.keys())axes.forEach((_,a)=>{const k=r*8+a;if(cmin.get(k)<=lo[a]+tol&&cmax.get(k)>=hi[a]-tol)spans[a]=true});
  // Li that can reach the particle surface through the active network (a surface Li can simply leave)
  const touch=new Set();for(let i=0;i<n;i++)if(sp[i]===0&&axes.some((_,a)=>proj[a][i]<=lo[a]+1e-6||proj[a][i]>=hi[a]-1e-6))touch.add(find(i));
  let reach=0;for(const r of touch)reach+=size.get(r);
  return{find,size,big,bigSize,nLi,census,tmCount,active,spans,reach};
}
export const CUBE_AXES=[[1,0,0],[0,1,0],[0,0,1]];

// ---- The measured layered cell (owner decision 4, 3.4; added 17 October 2026) ----
// The layered endpoint is drawn from a cited structure: LiCoO2 (R-3m), Crystallography Open Database entry 1550397 (Rosolen et
// al., Ionics 3 (1997) 345, X-ray powder diffraction; public domain), stored unchanged in production/rocksalt/sources/. Reported:
// a and c in Å, and the oxygen height zO (Co on 3a, Li on 3b, O on 6c). The ideal cubic frame of the spinel and DRX steps is the
// same a with c = √24·a and zO = 1/4.
export const LICOO2={cod:1550397,a:2.8185,c:14.0664,zO:.2592};
export const idealCell=a=>({a,c:Math.sqrt(24)*a,zO:.25});
// Derived distances in Å: liSlab is the O–O height across a Li layer, tmSlab the same across a TM layer, tmO the height from a TM
// layer to its O layers, and tTM runs from a Li-layer tetrahedral site's centre (the centroid of its four O) to the TM whose
// octahedron shares its base.
export function layeredGeometry({a,c,zO}){return{cOverA:c/a,layer:c/6,liSlab:(2*zO-1/3)*c,tmSlab:(2/3-2*zO)*c,tmO:(1/3-zO)*c,tTM:(1/4-zO/2)*c}}
// A lattice point (i,j,k) of the layered drawing, stacking axis vertical, in the drawing's units (a cation–cation distance is √2):
// cations (i+j+k even) in layers m=(i+j+k)/2, TM where m is even, as in speciesLayered; each O layer tmO from its TM layer.
// For the ideal cell this is the plain rotation of the cubic grid.
export function layeredPoint(i,j,k,cell){const u=cell.a/Math.SQRT2,g=layeredGeometry(cell),L=g.layer/u,d=g.tmO/u,s=i+j+k;
  let y;if((s&1)===0)y=s/2*L;else{const m=(s-1)/2;y=(m&1)===0?m*L+d:(m+1)*L-d}
  return[(i-j)/Math.SQRT2,y,(i+j-2*k)/Math.sqrt(6)]}
