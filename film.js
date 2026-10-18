// Keeps the page in step with the Blender film: the caption steps, readouts,
// live profile and hairline labels all read the same solved field the film
// was rendered from (assets/diffusion-film/film.json), one entry per frame.
import {Annotations} from './annotations.mjs';
const $ = id => document.getElementById(id);
const video = $('film-video');
const stage = video.closest('.film-stage');
const steps = [...document.querySelectorAll('#film-steps li')];
const scrub = $('film-scrub');
const radiusInput = $('radius');
// ?reduced and ?fallback are the pages' review modes for reduced motion; the film holds a still for them too.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || ['reduced', 'fallback'].some(k => new URLSearchParams(location.search).has(k));
const D = 1e-16;
// Playing starts where lithium starts to go in, so the first motion seen is the outside filling first. A still (reduced
// motion) holds the poster's frame, part-way through the fill.
const START_FRAME = 0, STILL_FRAME = 72;
let data = null, frame = -1, userPaused = reduceMotion, onScreen = true, scrubbing = false, scrubbed = false;
// Layout v2 (diffusion-v2.mjs) plays the film a beat at a time: a step's beat plays through and holds on its last frame, so
// scrolling down watches the film go on; a beat earlier in the loop (or far ahead) is reached through a short fade through
// black, never a jump. The Play button there plays the whole loop, and the size comparison lets it loop.
const V2 = !!document.documentElement?.classList?.contains?.('layout-v2');
let beatFrom = null, holdAt = null, looping = !V2;

function radiusNm() { return Number(radiusInput?.value || 50); }

function frameFromTime(seconds) {
  return Math.min(data.frames - 1, Math.max(0, Math.floor(seconds * data.fps + 1e-3))) % data.frames;
}

function drawProfile(c) {
  const pts = c.map((v, i) => `${(28 + i / (c.length - 1) * 324).toFixed(1)},${(64 - v * 58).toFixed(1)}`);
  const line = `M${pts.join('L')}`;
  $('film-profile-line').setAttribute('d', line);
  $('film-profile-fill').setAttribute('d', `${line}L352,64L28,64Z`);
}

// The film's camera, as set up in blender/diffusion/scene.py, so a point on the cut face can be found on screen in
// any frame: the hairline labels sit exactly on the contour they name.
const CAMERA = {frames: 384, dist: 4.55, elev: 21 * Math.PI / 180, lens: 58 / 36, target: [0, 0, -0.04]};
function project(f, p) {
  const t = 2 * Math.PI * f / CAMERA.frames, az = -Math.PI / 4 + Math.PI / 12 * Math.sin(t), el = CAMERA.elev + Math.PI / 45 * Math.sin(2 * t + .6);
  const c = [CAMERA.dist * Math.cos(el) * Math.cos(az), CAMERA.dist * Math.cos(el) * Math.sin(az), CAMERA.dist * Math.sin(el)];
  const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], unit = a => { const n = Math.hypot(...a); return a.map(v => v / n); };
  const fwd = unit(sub(CAMERA.target, c)), right = unit(cross(fwd, [0, 0, 1])), up = cross(right, fwd), v = sub(p, c), z = dot(v, fwd);
  return [.5 + CAMERA.lens * dot(v, right) / z, .5 - CAMERA.lens * dot(v, up) / z];
}
// A point on the left cut face (the plane x = 0) at radius x along the labelled direction.
const RAY = .62, onFace = (f, x) => project(f, [0, -x * Math.cos(RAY), x * Math.sin(RAY)]);
const notes = new Annotations(stage, {className: 'film-notes', compactWidth: 420});
function toStage([x, y]) {
  const w = stage.clientWidth, h = stage.clientHeight, side = Math.min(w, h);
  return {x: (w - side) / 2 + x * side, y: (h - side) / 2 + y * side};
}
// Where the face is half full along the labelled direction, or null when the whole face is above or below half. The film
// draws hairlines only at 20/40/60/80 % (blender/diffusion/solve.py LEVELS), so the label names the place, not a line.
function halfLine(f) {
  const c = data.c[f];
  for (let i = c.length - 1; i > 0; i--) {
    const a = c[i - 1], b = c[i];
    if ((a - .5) * (b - .5) <= 0 && a !== b) return (i - 1 + (.5 - a) / (b - a)) / (c.length - 1);
  }
  return null;
}
let notePhase = '';
// The labels name parts of the picture, so they wait for it: none points into an empty stage while the film is still loading.
const pictured = () => video.classList.contains('is-ready') ? 1 : 0;
function placeLabels(f) {
  const goingIn = f < data.half, phase = goingIn ? 'in' : 'out';
  if (phase !== notePhase) {
    notePhase = phase;
    notes.show([
      {id: 'surface', title: goingIn ? 'Surface, held full' : 'Surface, held empty', tone: '#d1defe',
        at: () => frame >= 0 ? {...toStage(onFace(frame, 1))} : null, home: () => toStage([.0, .07]), dir: [1, 0], dist: -6, fade: pictured},
      {id: 'half', title: 'Half full', note: goingIn ? 'Moves in as lithium spreads' : 'Moves in as lithium drains', tone: '#a5beff',
        at: () => { if (frame < 0) return null; const x = halfLine(frame); return x === null || x < .04 || x > .97 ? {x: 0, y: 0, visible: false} : {...toStage(onFace(frame, x)), r: 3}; },
        home: () => toStage([.0, .9]), dir: [1, 0], dist: -6, fade: pictured},
      {id: 'centre', title: goingIn ? 'Center fills last' : 'Center empties last', tone: '#d1defe',
        at: () => frame >= 0 ? toStage(onFace(frame, 0)) : null, home: () => toStage([.5, .93]), dir: [1, 0], dist: -12, phone: false, fade: pictured}
    ], {stagger: 420});
  }
  notes.frame();
}

function show(f) {
  if (!data) return;
  frame = f;
  const goingIn = f < data.half;
  const sinceSwitch = (f % data.half) * data.tauHalf / data.half;      // tau since the surface switched
  const seconds = sinceSwitch * (radiusNm() * 1e-9) ** 2 / D;
  $('film-phase').textContent = goingIn ? 'going in' : 'coming out';
  $('film-time').textContent = `${seconds.toFixed(1)} s`;
  $('film-fill').textContent = `${Math.round(data.fill[f] * 100)}%`;
  steps.forEach(li => li.classList.toggle('is-active', f >= Number(li.dataset.from) && f < Number(li.dataset.to)));
  drawProfile(data.c[f]);
  placeLabels(f);
  if (!scrubbing) scrub.value = f;
}

function setTimeNote() {
  const r = radiusNm();
  const half = data ? data.tauHalf * (r * 1e-9) ** 2 / D : 0;
  $('film-time-note').textContent = `Time since the surface last switched. For a ${r} nm particle with D = 10⁻¹⁶ m²/s, each half of the loop takes ${half.toFixed(half < 10 ? 1 : 0)} s. Change the radius below and this clock rescales.`;
}

function track() {
  if (!data) return;
  const step = (now, meta) => {
    const f = frameFromTime(meta ? meta.mediaTime : video.currentTime);
    if (f !== frame && ready) show(f);   // until the first seek lands, the readouts keep the frame about to be shown
    if (V2 && !looping && holdAt !== null && ready) {
      if (video.playbackRate !== 1 && f >= beatFrom) video.playbackRate = 1;   // caught up with the beat: its own pace
      if (f >= holdAt && !video.paused) { video.pause(); video.currentTime = (holdAt + .5) / data.fps; }
    }
    schedule();
  };
  const schedule = () => {
    if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(step);
    else requestAnimationFrame(() => step(0, null));
  };
  schedule();
}

function setToggle() {
  const paused = video.paused;
  $('film-toggle').setAttribute('aria-pressed', String(paused));
  $('film-toggle-label').textContent = paused ? 'Play' : 'Pause';
}
// The first-visit page opening holds the film until it has appeared.
function play() {
  if (V2 && !looping && (holdAt === null || frame >= holdAt)) return;   // a beat that has played holds its last frame
  if (ready && data && !userPaused && onScreen && atRest && !document.hidden && !window.Fig3DOpening?.holding) video.play().catch(() => { userPaused = true; setToggle(); });
}

$('film-toggle').addEventListener('click', () => {
  if (V2 && video.paused) { looping = true; holdAt = null; video.playbackRate = 1; }
  userPaused = !video.paused ? true : false;
  if (userPaused) video.pause();
  else if (!ready) { fallBack(); video.play().catch(() => {}); }   // asked for before it could load: a browser that waits for a tap
  else { onScreen = atRest = true; play(); }
});
video.addEventListener('play', setToggle);
video.addEventListener('pause', setToggle);
scrub.addEventListener('input', () => {
  if (!data) return;
  scrubbing = scrubbed = true;
  userPaused = true; video.pause();
  const f = Number(scrub.value);
  video.currentTime = (f + .5) / data.fps;
  show(f);
  scrubbing = false;
});
radiusInput?.addEventListener('input', () => { setTimeNote(); if (frame >= 0) show(frame); });
new IntersectionObserver(entries => {
  onScreen = entries[0].isIntersecting;
  if (onScreen) play(); else video.pause();
}, {threshold: 0}).observe(stage);   // plays as soon as any of the stage is in view
document.addEventListener('visibilitychange', () => document.hidden ? video.pause() : play());
// A link to a later section (#explore) scrolls the page there after it loads, gliding past the film: the stage only looks
// visible at the top until then. The film waits for that scroll to come to rest (or for 1 s without one), so it is not
// played unseen on the way and a reader who comes back up still meets it empty.
const linked = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
let atRest = !linked || stage.contains(linked);
if (!atRest) {
  let quiet = 0;
  const rest = wait => { clearTimeout(quiet); quiet = setTimeout(() => {
    removeEventListener('scroll', onScroll); atRest = true;
    const r = stage.getBoundingClientRect(); onScreen = r.bottom > 0 && r.top < innerHeight; play();
  }, wait); };
  const onScroll = () => rest(200);
  addEventListener('scroll', onScroll, {passive: true}); rest(1000);
}

// Land on the first frame (or the still) before the film is shown, so the poster is never replaced by another frame on
// screen, and only play once that seek has landed. A server that ignores Range requests (python3 -m http.server) leaves
// the film unseekable, and the scrubber could not move the picture: then the file is loaded whole and played from memory.
let ready = false, fellBack = false;
const reveal = () => video.classList.add('is-ready');
// The frame the film stands on before it plays: the start of the fill, or the poster's own frame for a still or a fallback;
// a frame the reader has already scrubbed to wins. In layout v2 it is the start of the beat of the step being read (its
// last frame, still, for reduced motion).
const firstFrame = () => scrubbed ? Number(scrub.value) : V2 && beatFrom !== null ? (reduceMotion ? holdAt : beatFrom) : userPaused || fellBack ? STILL_FRAME : START_FRAME;
function begin() {
  const seekable = video.seekable.length > 0 && video.seekable.end(video.seekable.length - 1) > 1;
  if (!seekable && !video.src.startsWith('blob:')) {
    fetch(video.currentSrc).then(r => r.ok ? r.blob() : Promise.reject(r.status)).then(blob => {
      video.addEventListener('loadedmetadata', begin, {once: true});
      video.src = URL.createObjectURL(blob);
    }).catch(land);
    return;
  }
  land();
}
function land() {
  video.addEventListener('seeked', () => { ready = true; reveal(); if (data) show(frameFromTime(video.currentTime)); play(); }, {once: true});
  video.currentTime = (firstFrame() + .5) / 24;
}
// A browser that holds back loading (iOS in Low Power Mode, a stalled connection) would leave an empty stage: after 2 s in
// view of the reader (a tab opened in the background may not load until it is shown) the poster is shown, the readouts and
// labels describe its frame, and the film goes on from that same frame once it can.
function fallBack() {
  if (ready || fellBack || scrubbed) return;   // the poster would contradict the frame the reader chose
  fellBack = true; reveal();
  if (data) show(STILL_FRAME);
  if (video.readyState >= 1) video.currentTime = (STILL_FRAME + .5) / 24;
}
const arm = () => document.hidden ? document.addEventListener('visibilitychange', arm, {once: true}) : setTimeout(fallBack, 2000);
arm();
video.querySelector('source:last-of-type')?.addEventListener('error', reveal);   // no playable source: show the poster
if (video.readyState >= 1) begin();
else video.addEventListener('loadedmetadata', begin, {once: true});

fetch('assets/diffusion-film/film.json').then(r => r.json()).then(json => {
  data = json;
  setTimeNote();
  show(ready ? frameFromTime(video.currentTime || 0) : firstFrame());   // the frame about to be shown
  track();
  setToggle();
  play();
});

addEventListener('fig3d:stage', play);

if (V2) window.Fig3DFilm = {
  // Play the beat [from, to) and hold its last frame: on from a beat just before it (at three times speed until it is
  // reached), or after a fade through black from anywhere else. Reduced motion shows the beat's last frame, still.
  beat(from, to) {
    looping = false; beatFrom = from; holdAt = to - 1; video.playbackRate = 1;
    if (!data || !ready) return;   // the first seek lands on the start; play() then plays up to the hold
    if (reduceMotion) { video.pause(); video.currentTime = (holdAt + .5) / data.fps; show(holdAt); return; }
    const f = frame;
    if (f >= from && f <= holdAt) { play(); return; }
    if (f < from && from - f <= 96) { video.playbackRate = 3; play(); return; }
    video.getAnimations().forEach(a => a.cancel());
    video.animate([{opacity: 1}, {opacity: 0}], {duration: 200, easing: 'ease-in', fill: 'forwards'}).finished.then(() => {
      if (beatFrom !== from) return;
      video.pause();
      video.addEventListener('seeked', () => {
        show(from);
        const a = video.animate([{opacity: 0}, {opacity: 1}], {duration: 320, easing: 'ease-out', fill: 'forwards'});
        a.finished.then(() => { const all = video.getAnimations(); all.slice(0, all.indexOf(a) + 1).forEach(o => o.cancel()); }, () => {});
        play();
      }, {once: true});
      video.currentTime = (from + .5) / data.fps;
    }, () => {});
  },
  loop() { looping = true; holdAt = null; video.playbackRate = 1; play(); },
  get frame() { return frame; }
};
