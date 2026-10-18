import {concentration, particleState} from './model.mjs';
// Two radii after the same elapsed time, drawn as stepped concentration bands
// bounded by calculated iso-concentration contours (no smooth gradient).
const levels=[.2,.4,.6,.8],low=[23,36,69],high=[125,156,255]
const shade=c=>`rgb(${low.map((v,k)=>Math.round(v+(high[k]-v)*c))})`
// c(x) increases monotonically from centre to surface, so bisection finds each contour radius.
const contour=(level,tau)=>{if(concentration(0,tau)>=level)return 0;let a=0,b=1;for(let n=0;n<40;n++){const m=(a+b)/2;concentration(m,tau)<level?a=m:b=m}return (a+b)/2}
const particle=(radiusNm,cx,cy,unit)=>{const {tau}=particleState(radiusNm),R=radiusNm*unit
 // Outermost band holds c in [0.8,1]; each inner disc is the region below the next contour, shaded at its band midpoint.
 const discs=[[1,.9],...[.8,.6,.4,.2].map(l=>[contour(l,tau),l-.1])].filter(([x])=>x>0)
 const fills=discs.map(([x,c])=>`<circle cx="${cx}" cy="${cy}" r="${(x*R).toFixed(2)}" fill="${shade(c)}"/>`).join('')
 const rings=discs.slice(1).map(([x])=>`<circle cx="${cx}" cy="${cy}" r="${(x*R).toFixed(2)}" fill="none" stroke="#e5ecff" stroke-opacity=".5"/>`).join('')
 return `${fills}${rings}<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#ced3e1" stroke-opacity=".7"/><text class="diffusion-radius" x="${cx}" y="${cy+R+34}" text-anchor="middle">${radiusNm} nm</text>`}
document.querySelector('#diffusion-field').innerHTML=particle(50,230,225,3)+particle(25,500,225,3)

// Share of random DRX crystals whose 0-TM Li network crosses along one axis, from
// evidence/rocksalt-percolation/sweep-output.txt (the companion's own lattice core, 200 seeds; 60 at 16 cells).
const excess=[0,.03,.06,.09,.12,.15,.2,.3],crossing={3:[.07,.10,.12,.17,.21,.28,.39,.61],6:[.04,.09,.14,.22,.36,.47,.69,.97],16:[0,0,.03,.25,.65,.90,1,1]}
const px=x=>105+450*x/.3,py=p=>370-265*p
document.querySelector('#percolation-curves').innerHTML=Object.entries(crossing).map(([cells,ps],i)=>{
 const color=['#606fae','#9296ed','#bfcfff'][i],at=6
 return `<path d="M${ps.map((p,j)=>`${px(excess[j]).toFixed(1)},${py(p).toFixed(1)}`).join('L')}" fill="none" stroke="${color}" stroke-width="3"/><text x="${px(excess[at])+14}" y="${py(ps[at])+(cells==='16'?22:24)}" class="plot-label" fill="${color}">${cells} cells</text>`}).join('')
document.querySelector('#percolation-mark').setAttribute('d',`M${px(.09)} 370V105`)
document.querySelector('#percolation-mark-label').setAttribute('x',px(.09))

// A normalized Nyquist plot of Z = Rs + Rp/(1 + i ω Rp C).
// Sampling log frequency is only a plotting choice, not measured cell data.
const points=Array.from({length:181},(_,i)=>{
  const w=10**(3-i/30);
  return `${137+370/(1+w*w)},${370-370*w/(1+w*w)}`;
});
document.querySelector('#nyquist-teaser').setAttribute('d',`M${points.join('L')}`);
const concepts={
 battery:{title:'How a battery works',intro:'Start with a lithium-ion cell. Follow the electrons outside it and the ions inside it, then connect their paths through the electrode reactions.',list:['Meet the electrodes, electrolyte, separator and external circuit.','See how discharge couples both charge pathways.','Connect the chemical changes to energy delivered to a load.']},
 impedance:{title:'A signal becomes a spectrum',intro:'Begin with a simple electrical model. See how a changing voltage and responding current become an impedance plot.',list:['Link the signal to its amplitude and phase response.','Connect Nyquist and Bode views of the same model.','See why a fitted circuit does not by itself prove a physical mechanism.']}
};
const dialog=document.querySelector('#concept-dialog');
document.querySelectorAll('[data-concept]').forEach(button=>button.addEventListener('click',()=>{
 const item=concepts[button.dataset.concept];
 document.querySelector('#concept-title').textContent=item.title;
 document.querySelector('#concept-intro').textContent=item.intro;
 document.querySelector('#concept-list').replaceChildren(...item.list.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 dialog.showModal();
}));
dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{const b=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom))dialog.close();});

import './hero.js';

import './battery-teaser.js';
