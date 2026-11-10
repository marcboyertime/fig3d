import {BatteryScene} from './battery-scene.mjs';
import {batteryState} from './battery-model.mjs';
const canvas=document.querySelector('#battery-teaser'),link=canvas.closest('a'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let scene,visible=false,frame=0,last=0,phase=.22,remaining=4000;
function draw(t){frame=0;if(!scene||!visible)return;const dt=last?Math.min(60,t-last):16;last=t;if(!reduced.matches&&remaining>0){phase=(phase+dt/8500)%1;remaining-=dt;}scene.setFlow?.(phase);scene.render(dt);if(remaining>0&&!reduced.matches)frame=requestAnimationFrame(draw);}
function begin(){if(!scene){try{scene=new BatteryScene(canvas,document.createElement('div'),()=>{},{labels:false,interactive:false});scene.setState(batteryState(.5,'discharge'));}catch{link.classList.add('teaser-fallback');return;}}last=0;if(!frame)frame=requestAnimationFrame(draw);}
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){remaining=4000;begin();}else if(frame){cancelAnimationFrame(frame);frame=0;}},{threshold:.08}).observe(canvas);
for(const name of ['mouseenter','focus'])link.addEventListener(name,()=>{if(!reduced.matches){remaining=4000;begin();}});
reduced.addEventListener('change',()=>{remaining=reduced.matches?0:4000;if(visible)begin();});
