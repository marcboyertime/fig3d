// Ideal rocksalt coordinates, in units of a/2. See references/hop-scientific-audit.md.
// This geometry specifies a schematic O–T–O route, not an energy-minimized trajectory.
export const A=[0,0,0], B=[1,1,0], C=[1,0,1], D=[0,1,1], T=[.5,.5,.5];
export const cations=[A,B,C,D];
export const tetraO=[[1,0,0],[0,1,0],[0,0,1],[1,1,1]];
const offsets=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
export const octO=p=>offsets.map(o=>o.map((v,i)=>v+p[i]));
export const oxygen=[...new Map([...tetraO,...octO(A),...octO(B)].map(p=>[p.join(','),p])).values()];
export const windows=[tetraO.filter(o=>Math.hypot(...o.map((v,i)=>v-A[i]))<1.001),tetraO.filter(o=>Math.hypot(...o.map((v,i)=>v-B[i]))<1.001)];
export function hopPosition(s){s=Math.max(0,Math.min(1,s));const [p,q,f]=s<=.5?[A,T,2*s]:[T,B,2*s-1];return p.map((v,i)=>v+(q[i]-v)*f);}
