// Cards that are films (class card-film): the diffusion card (assets/diffusion-card, two radii from the diffusion page's
// own render, made by production/diffusion-card/make-card-film.py), and the fast ion card (five ions hopping together)
// and the nanoparticle card (the gold particle rocking), both filmed from the explorers' own scenes by tools/card-film.mjs. A film plays only while it is on screen, and not at all
// under reduced motion, where its poster stands for it.
{
 const still=matchMedia('(prefers-reduced-motion: reduce)'),films=[...document.querySelectorAll('video.card-film')],seen=new Set();
 const run=film=>{if(seen.has(film)&&!still.matches)film.play().catch(()=>{});else film.pause()};
 if('IntersectionObserver' in window){
  const watch=new IntersectionObserver(entries=>{for(const e of entries){e.isIntersecting?seen.add(e.target):seen.delete(e.target);run(e.target)}},{rootMargin:'80px'});
  films.forEach(film=>watch.observe(film));
  still.addEventListener('change',()=>films.forEach(run));
 }
}

// Share of random DRX crystals whose 0-TM Li network crosses along one axis, from
// evidence/rocksalt-percolation/sweep-output.txt (the companion's own lattice core, 200 seeds; 60 at 16 cells).
const excess=[0,.03,.06,.09,.12,.15,.2,.3],crossing={3:[.07,.10,.12,.17,.21,.28,.39,.61],6:[.04,.09,.14,.22,.36,.47,.69,.97],16:[0,0,.03,.25,.65,.90,1,1]}
const px=x=>105+450*x/.3,py=p=>370-265*p
document.querySelector('#percolation-curves').innerHTML=Object.entries(crossing).map(([cells,ps],i)=>{
 const color=['#606fae','#9296ed','#bfcfff'][i],at=6
 return `<path d="M${ps.map((p,j)=>`${px(excess[j]).toFixed(1)},${py(p).toFixed(1)}`).join('L')}" fill="none" stroke="${color}" stroke-width="3"/><text x="${px(excess[at])+14}" y="${py(ps[at])+(cells==='16'?22:24)}" class="plot-label" fill="${color}">${cells} cells</text>`}).join('')
document.querySelector('#percolation-mark').setAttribute('d',`M${px(.09)} 370V105`)
document.querySelector('#percolation-mark-label').setAttribute('x',px(.09))

// A normalized Nyquist plot of Z = Rs + Rp/(1 + i ω Rp C), swept from high frequency to low.
// A signal goes in (the voltage) and a signal comes back (the current), the same frequency but shifted; that shift and
// the size of the response are one point of the curve, drawn as the line from the origin to the dot. As the frequency
// falls the two waves stretch, the shift changes, and the dot traces the arc. The waves are drawn at equal height: only
// their shift is the model's. Sampling log frequency is only a plotting choice, not measured cell data.
{
 const $=id=>document.querySelector(id),arc=$('#nyquist-teaser');
 if(arc){
 const dot=$('#nyquist-dot'),phasor=$('#nyquist-phasor'),vIn=$('#wave-in'),iOut=$('#wave-out'),card=arc.closest('figure');
 const Z=w=>({x:137+370/(1+w*w),y:370-370*w/(1+w*w)}),pts=Array.from({length:181},(_,i)=>Z(10**(3-i/30)));
 const wave=(yc,cycles,shift)=>'M'+Array.from({length:70},(_,k)=>`${(205+230*k/69).toFixed(1)},${(yc-14*Math.sin(2*Math.PI*cycles*k/69+shift)).toFixed(1)}`).join('L');
 function draw(p){
  const n=Math.max(1,Math.round(p*180)),z=pts[n],lead=Math.atan2(370-z.y,z.x-105),cycles=4-2.7*p;
  arc.setAttribute('d','M'+pts.slice(0,n+1).map(q=>`${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L'));
  dot.setAttribute('cx',z.x.toFixed(1));dot.setAttribute('cy',z.y.toFixed(1));
  phasor.setAttribute('d',`M105 370L${z.x.toFixed(1)} ${z.y.toFixed(1)}`);
  vIn.setAttribute('d',wave(289,cycles,0));iOut.setAttribute('d',wave(335,cycles,lead));
 }
 const still=matchMedia('(prefers-reduced-motion: reduce)'),SWEEP=7200,HOLD=2300;
 let seen=false,frame=0,start=0;
 const tick=t=>{frame=0;if(!seen||still.matches){draw(still.matches?.5:1);return}if(!start)start=t;const e=(t-start)%(SWEEP+HOLD);draw(Math.min(1,e/SWEEP));frame=requestAnimationFrame(tick)};
 const run=()=>{if(seen&&!frame)frame=requestAnimationFrame(tick)};
 draw(still.matches?.5:1);
 if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{seen=entry.isIntersecting;if(seen){start=0;run()}else if(frame){cancelAnimationFrame(frame);frame=0}},{threshold:.2}).observe(card);
 still.addEventListener('change',run);
 }
}
addEventListener('load',()=>requestAnimationFrame(()=>document.documentElement.classList.add('settled')));
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
