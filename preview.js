import {concentration, particleState, drawnRadius} from './model.mjs';
import {Annotations, svgPoint} from './annotations.mjs';
import {viewParams, viewWriter} from './view-state.mjs';
// A shared address (#radius=75) reopens the explorer at that radius, drawn on the first frame; any hash skips the opening.
const sharedView = viewParams(), writeView = viewWriter();
{ const r = +sharedView?.get('radius'); if (r >= 25 && r <= 100) document.getElementById('radius').value = String(Math.round(r)); }
if (sharedView) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('explore')?.scrollIntoView({block: 'start'})));

const $ = id => document.getElementById(id);
let currentState = particleState(50);
// Callouts on the cross section: the surface sets the boundary, the core shows how far lithium has got.
// Their words keep off the disk (it is what they name): above and below it, in bands the frame keeps free at every radius.
const stage = document.querySelector('.particle-stage'), svg = $('particle');
let shownRadius = Number($('radius').value) || 50, visualRadius = drawnRadius(shownRadius), easing = 0;
const CY = 190, rim = (dx, dy) => svgPoint(svg, 280 + visualRadius * dx, CY + visualRadius * dy, stage);
function disk() { const c = rim(0, 0), e = rim(1, 0); return c && e ? {x: c.x, y: c.y, r: e.x - c.x + 4} : null; }
// Laptop stages (468 px at 1024 wide) keep both notes and full-size words; only phone-sized stages go compact.
const notes = new Annotations(stage, {className: 'particle-notes', compactWidth: 420, avoid: () => [disk()]});
// ?reduced and ?fallback are the pages' review modes for reduced motion, as in film.js and the shared labels.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)'), reviewReduced = ['reduced', 'fallback'].some(k => new URLSearchParams(location.search).has(k));
const coreWords = core => core > .9 ? 'Nearly full already' : core > .4 ? 'Filling, but behind the surface' : 'Barely reached yet';
let coreNote = '', seen = '', seenSince = 0;
// The core's value follows the drawing frame by frame. Its note says what the drawing shows too, but as a wording it waits
// until the drawing has stayed in that state for 150 ms (or has settled), so a wording only passed through on a long jump
// never flickers onto the label.
function explainParts(settled = true) {
  const core = concentration(0, currentState.tau), words = coreWords(core), now = performance.now();
  if (words !== seen) { seen = words; seenSince = now; }
  if (settled || !coreNote || now - seenSince >= 150) coreNote = words;
  notes.show([
    {id: 'surface', title: 'Surface, c = c<sub>s</sub>', note: 'Held full: lithium enters here', tone: '#d1defe', live: true,
      at: () => rim(.34, -.94), dir: [.25, -1], dist: 10},
    {id: 'core', title: `Core, c = ${core.toFixed(2)} c<sub>s</sub>`, note: coreNote, tone: '#a5beff', live: true,
      at: () => rim(0, 0), home: () => rim(-.24, .97), dir: [-.25, 1], dist: 0, phone: 'note'}
  ], {stagger: 300});
}
// The drawing eases to the new radius, so a step grows the particle rather than jumping it. The readouts describe the
// drawing (they count with it and never lead it); the slider's own position is the radius asked for.
function updateParticle() {
  const radius = Number($('radius').value), state = particleState(radius);
  { const p = new URLSearchParams(); if (radius !== 50) p.set('radius', String(radius)); writeView(p); }
  $('particle-desc').textContent = `Circular cross section at radius ${radius} nanometers, drawn to scale with the other radii. At fixed diffusivity and elapsed time, characteristic diffusion time is ${state.relativeTime.toFixed(2)} times the value for a 50 nanometer particle. Color shows normalized concentration from zero to one, with rings at 20, 40, 60 and 80 percent; not measured cathode data.`;
  cancelAnimationFrame(easing);
  let last = performance.now();
  const step = now => {
    shownRadius += (radius - shownRadius) * (reviewReduced || reduceMotion.matches ? 1 : 1 - Math.exp(-Math.max(0, now - last) / 85)); last = now;
    if (Math.abs(radius - shownRadius) < .03) shownRadius = radius;
    drawParticle(shownRadius); explainParts(shownRadius === radius); notes.frame();   // words keep step with the rim in this frame
    easing = shownRadius === radius ? 0 : requestAnimationFrame(step);
  };
  easing = requestAnimationFrame(step);
}
function drawParticle(radius) {
  currentState = particleState(radius);
  visualRadius = drawnRadius(radius);
  const nm = Math.round(radius);
  $('radius-value').innerHTML = `${nm} <span>nm</span>`;
  $('scale-value').innerHTML = `${particleState(nm).relativeTime.toFixed(2)}<span>×</span>`;
  $('particle-outline').setAttribute('r', visualRadius);
  $('radius-line').setAttribute('d', `M280 ${CY}H${280 + visualRadius}`);
  $('radius-label').setAttribute('x', 280 + visualRadius / 2 - 5);
  const low = [23, 36, 69], high = [125, 156, 255];
  const stops = [];
  for (let i = 0; i <= 60; i++) {
    const c = concentration(i / 60, currentState.tau);
    const rgb = low.map((v, j) => Math.round(v + (high[j] - v) * c));
    stops.push(`<stop offset="${i / 60 * 100}%" stop-color="rgb(${rgb.join(',')})"/>`);
  }
  $('concentration-gradient').innerHTML = stops.join('');
  // Iso-concentration rings at 20/40/60/80% of the surface value; c(x) rises monotonically, so bisection finds each radius.
  $('particle-contours').innerHTML = [.2, .4, .6, .8].map(level => {
    if (concentration(0, currentState.tau) >= level) return '';
    let lo = 0, hi = 1;
    for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; concentration(mid, currentState.tau) < level ? lo = mid : hi = mid; }
    return `<circle cx="280" cy="${CY}" r="${((lo + hi) / 2 * visualRadius).toFixed(2)}" fill="none" stroke="#e5ecff" stroke-opacity=".45"/>`;
  }).join('');
  const points = Array.from({length:101}, (_, i) => `${34 + i * 5.04},${99 - concentration(i / 100, currentState.tau) * 84}`);
  const path = `M${points.join('L')}`;
  $('profile-curve').setAttribute('d', path);
  $('profile-fill').setAttribute('d', `${path}L538,99L34,99Z`);
}
$('radius').addEventListener('input', updateParticle);
drawParticle(shownRadius); updateParticle(); explainParts();

const concepts = {
  diffusion: {title:'How far does lithium have to go?', intro:'A concentration profile connects a small physical object to an abstract transport equation. The first new companion planned for Fig.3D.', list:['Meet an active-material particle and distinguish its surface from its interior.','Predict how changing particle size changes diffusion time under a declared model.','Link a cutaway view to its radial concentration profile.','See why a simple particle model does not predict whole-cell performance.']},
  charge: {title:'One battery. Two paths for charge.', intro:'Battery diagrams often put arrows everywhere. This companion will separate the paths before putting them back together.', list:['Trace ionic transport through the electrolyte and electronic transport through the external circuit.','Connect the two paths through oxidation and reduction at the electrodes.','Follow the changes between charging and discharging.','Keep charge transport distinct from the motion of a particular atom.']},
  impedance: {title:'What is an impedance spectrum saying?', intro:'Before interpreting a semicircle, build the signal that creates it. Begin with a deliberately simple electrical model.', list:['Connect a sinusoidal voltage to the amplitude and phase of a responding current.','Translate that response into real and imaginary impedance.','Connect Nyquist and Bode representations of the same model.','Understand why an equivalent-circuit fit alone does not establish a physical mechanism.']}
};
document.querySelectorAll('[data-concept]').forEach(button=>button.addEventListener('click',()=>{
  const item=concepts[button.dataset.concept];
  $('concept-title').textContent=item.title;
  $('concept-intro').textContent=item.intro;
  $('concept-list').replaceChildren(...item.list.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('concept-dialog').showModal();
}));
$('model-open').addEventListener('click',()=>$('model-dialog').showModal());
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
});
