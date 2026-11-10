import {createHopRenderer} from './hero-renderer.js';
import {BEATS, DURATION, HOP_REPLAY_AT, HANDOVER_AT, INSPECT, sequence, beatAt, beatIndex, hopAt, across, siteRings, clamp, smooth, easeInOut, easeOut} from './hero-timeline.mjs';

const $ = s => document.querySelector(s);
const hero = $('.home-hero'), frameEl = $('#hero-frame'), stageEl = $('.hero-stage');
const paper = $('#hero-paper'), pctx = paper.getContext('2d'), overlay = $('#hero-canvas'), ctx = overlay.getContext('2d');
const slider = $('#hero-progress'), play = $('#hero-play'), replay = $('#hero-replay'), caption = $('#hero-stage'), kicker = $('#hero-kicker'), resetButton = $('#hero-reset'), continueLink = $('#hero-continue');
// Review flags shared with the module pages: ?no-opening shows the settled model, ?reduced stands in for the
// reduced-motion preference, ?opening plays the story even under it, and ?fallback shows the page without WebGL.
const flags = new Set((globalThis.location?.search || '').slice(1).split('&').map(s => s.split('=')[0]));
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = {get matches() { return flags.has('reduced') || motionQuery.matches; }, addEventListener: (type, f) => motionQuery.addEventListener(type, f)};
let gpu; try { if (flags.has('fallback')) throw Error('Requested fallback'); gpu = createHopRenderer($('#hero-gl')); } catch { gpu = null; }

// The untouched Figure 1 (a pixel-identical lossless WebP; the PNG is the fallback).
const source = new Image(), SOURCE_PNG = 'references/hau-2025-figure-1-original.png';
source.decoding = 'async'; source.src = 'assets/hau-2025-figure-1.webp';
const FIGURE = {w: 1500, h: 850}, GLYPH = {x: 74, y: 322, w: 275, h: 240};
// Printed positions of the glyph's actors, in native figure pixels.
const ANCHORS = {li: [142, 384], b: [262, 388], c: [239, 399], tm: [215, 488], t: [213, 414]};

let t = 0, playing = false, userPaused = false, wasAuto = false, last = 0, frame = 0, inView = true;
// travel: the story moving at another speed (early input fast-forwards, Replay rewinds). reset: Play again lifting
// lithium out at B and setting it down at A. While they run, lithium's opacity and shown path position are overridden.
// driftHold keeps the camera where a repeated hop began; holdOut eases that hold away when the reader scrubs.
let travel = null, reset = null, liFade = 1, hopShown = null, introFade = true, driftHold = 0, holdOut = null, begun = false;
// Before the figure has loaded nothing plays. The transport shows what will happen when it arrives (the story plays
// unless reduced motion, ?no-opening or the reader says otherwise), and Play or Pause changes that rather than starting
// the clock over an empty stage; input on the stage (`handed`) plays the lift to the built model once it is in.
let autoplay = !flags.has('no-opening') && (flags.has('opening') || !reduced.matches), handed = false;
let yaw = 0, pitch = 0, viewTween = null, selection = '', hover = '', pointer = null, dragged = false, hitAreas = [];
// The selection drawn on the model (it trails `hover || selection`) and how strongly: the old emphasis lets go, then the
// new one comes in, so nothing on the model or its labels pops (see tick).
let drawnSel = '', focus = 0, focusAt = 0;
let size = {w: 0, h: 0, dpr: 1, frame: {x: 0, y: 0, w: 1, h: 1}, unit: 100, narrow: false, stacked: false};
let shownBeat = '', shownText = '', shownKicker = '', project = null, figureBox = null;

// ---------- Layout ----------
function measure() {
 const c = stageEl.getBoundingClientRect(), f = frameEl.getBoundingClientRect();
 const dpr = Math.min(devicePixelRatio || 1, 2), w = c.width, h = c.height;
 if (!w || !h) return false;
 const fr = {x: f.left - c.left, y: f.top - c.top, w: f.width, h: f.height};
 const narrow = hero.getBoundingClientRect().width < 701;
 // Stacked layouts (phones, portrait tablets) put the headline above the stage: words get underlines, not arrows.
 const stacked = f.top >= $('.hero-copy').getBoundingClientRect().bottom - 1;
 for (const cv of [paper, overlay]) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
 pctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
 // One model unit (a/2) in CSS pixels, sized so the whole oxygen context fits the frame.
 const unit = Math.min(fr.h * (narrow ? .37 : .42), fr.w * (narrow ? .28 : .3));
 size = {w, h, dpr, frame: fr, unit, narrow, stacked};
 gpu?.layout(w, h, fr, unit, dpr);
 paintCard();
 reserveCaption();
 return true;
}
// The caption keeps the height of the longest line it can show at this width, so an inspect description never
// pushes the controls under it down while a finger is on them.
const CAPTIONS = [...BEATS.map(b => b.caption), ...Object.values(INSPECT).flatMap(f => [0, .5, 1].map(f))];
function reserveCaption() {
 const probe = caption.cloneNode?.(false);
 if (!probe) return;
 probe.removeAttribute('id'); probe.removeAttribute('aria-live'); probe.setAttribute('aria-hidden', 'true');
 Object.assign(probe.style, {position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: `${caption.clientWidth}px`, minHeight: '0'});
 caption.after(probe);
 let tallest = 0;
 for (const text of CAPTIONS) { probe.textContent = text; tallest = Math.max(tallest, probe.offsetHeight); }
 probe.remove();
 caption.style.minHeight = `${tallest}px`;
}

// ---------- Figure layer ----------
// Fit the whole figure in the frame, then zoom (geometrically) until the 1-TM glyph fills the centre.
function figureTransform(zoom) {
 const f = size.frame, fit = Math.min(f.w / FIGURE.w, f.h / FIGURE.h);
 const end = Math.min(.95, f.h * .6 / GLYPH.h, f.w * .55 / GLYPH.w);
 const scale = fit * Math.pow(end / fit, zoom);
 const gx = GLYPH.x + GLYPH.w / 2, gy = GLYPH.y + GLYPH.h / 2;
 const fitX = f.x + (f.w - FIGURE.w * fit) / 2 + gx * fit, fitY = f.y + (f.h - FIGURE.h * fit) / 2 + gy * fit;
 const cx = fitX + (f.x + f.w / 2 - fitX) * zoom, cy = fitY + (f.y + f.h / 2 - fitY) * zoom;
 return {scale, x: cx - gx * scale, y: cy - gy * scale};
}
const toScreen = (tr, [x, y]) => [tr.x + x * tr.scale, tr.y + y * tr.scale];
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const glyphRect = tr => ({x: tr.x + GLYPH.x * tr.scale, y: tr.y + GLYPH.y * tr.scale, w: GLYPH.w * tr.scale, h: GLYPH.h * tr.scale});
// The 1-TM glyph on its patch of white paper, with the accent frame drawing around it once spotlit.
function drawCard(g2d, tr, g, spot) {
 roundRect(g2d, g.x, g.y, g.w, g.h, 4); g2d.save(); g2d.clip(); g2d.drawImage(source, tr.x, tr.y, FIGURE.w * tr.scale, FIGURE.h * tr.scale); g2d.restore();
 if (spot <= 0) return;
 const w = g.w + 6, h = g.h + 6, r = 6, per = 2 * (w + h) - 8 * r + 2 * Math.PI * r;
 g2d.save(); g2d.globalAlpha *= Math.min(1, spot * 3); g2d.strokeStyle = '#97b1ff'; g2d.lineWidth = 1.5; g2d.lineCap = 'round';
 g2d.setLineDash([per * spot, per]); roundRect(g2d, g.x - 3, g.y - 3, w, h, r); g2d.stroke(); g2d.restore();
}
function drawPaper(q) {
 pctx.clearRect(0, 0, size.w, size.h); figureBox = null;
 // Once the page has lifted away the layer is empty: take it out of compositing rather than rely on an empty bitmap
 // (an accelerated canvas can keep presenting an older frame, which would bring the whole page back).
 const ready = source.complete && source.naturalWidth, live = ready && q.paper > 0;
 paper.style.visibility = live ? '' : 'hidden';
 if (!ready) return;
 const tr = figureTransform(q.zoom), W = FIGURE.w * tr.scale, H = FIGURE.h * tr.scale, g = glyphRect(tr), f = size.frame;
 // The rest of the figure dims under a spotlight, stays faintly in view through the zoom, then clears.
 const rest = (1 - .62 * q.spot - .24 * q.zoom) * q.ghost;
 // Kept once the page has gone, so the "figures" arrow still points at the glyph (now the 3D card) while it fades.
 figureBox = {x: tr.x, y: tr.y, w: W, h: H, glyph: g, rest};
 if (!live) return;
 // A short fade-in when the story first starts, so the white page never pops onto the dark hero. (Replay rewinds
 // the lift back into the page instead, so the page is already there when the story restarts.)
 const base = introFade && playing && !reduced.matches ? q.intro : 1;
 if (rest > .003) {
  // Keep the page inside the frame while it zooms, so it never spills over the headline.
  pctx.save(); pctx.beginPath(); pctx.rect(f.x, f.y, f.w, f.h); pctx.clip();
  pctx.globalAlpha = base * rest; roundRect(pctx, tr.x, tr.y, W, H, 3); pctx.clip(); pctx.drawImage(source, tr.x, tr.y, W, H);
  pctx.restore();
  // As the camera closes in, the page's edges soften into the background instead of stopping at the frame.
  // (Erased outside the clip, so no antialiased sliver survives along the frame edge.)
  if (q.zoom > 0) {
   pctx.save(); pctx.globalCompositeOperation = 'destination-out';
   pctx.translate(f.x + f.w / 2, f.y + f.h / 2); pctx.scale(f.w / 2, f.h / 2);
   const vignette = pctx.createRadialGradient(0, 0, .42, 0, 0, .98);
   vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, `rgba(0,0,0,${Math.min(1, q.zoom * 2.4)})`);
   pctx.fillStyle = vignette; pctx.fillRect(-1.1, -1.1, 2.2, 2.2); pctx.restore();
  }
 }
 pctx.save(); pctx.globalAlpha = base; drawCard(pctx, tr, g, q.spot); pctx.restore();
}
// The zoomed card, painted once per layout for the 3D scene, where it lays back as the atoms lift off.
const cardCanvas = document.createElement('canvas');
function paintCard() {
 if (!gpu || !(source.complete && source.naturalWidth)) return;
 const tr = figureTransform(1), g = glyphRect(tr), pad = 8, k = Math.min(3, size.dpr * 1.5);
 const rect = {x: g.x - pad, y: g.y - pad, w: g.w + 2 * pad, h: g.h + 2 * pad};
 cardCanvas.width = Math.round(rect.w * k); cardCanvas.height = Math.round(rect.h * k);
 const c = cardCanvas.getContext('2d');
 c.setTransform(cardCanvas.width / rect.w, 0, 0, cardCanvas.height / rect.h, 0, 0); c.translate(-rect.x, -rect.y); c.imageSmoothingQuality = 'high';
 drawCard(c, tr, g, 1);
 gpu.setCard(cardCanvas, rect);
}

// ---------- Labels ----------
// Callouts in the site-wide style (see annotations.mjs): a ring on the atom or site, a hairline that bends into a
// short shelf, a title in the thing's colour and, on wider stages, one muted line saying what it is.
const titleFont = () => `500 ${size.narrow ? 11.5 : 13}px Sora, Arial, sans-serif`;
const noteFont = () => `400 ${size.narrow ? 10.5 : 11.5}px Sora, Arial, sans-serif`;
const labelSide = {};
// Greedy placement: when a label comes in, it tries its preferred side, then the mirrored and vertical sides, and
// takes the first spot inside the stage that is clear of labels already placed and, if possible, of the atoms, rings
// and route too. It then keeps that side and its direction for as long as it is shown, so nothing hops back and forth as
// the model turns (a direction away from the model's centre is taken once, as it comes in, never per frame: near the
// centre that direction swings round as the model turns). Once faded out it chooses afresh; a label that rides a mover
// (`along`) takes a side clear at every stop of its path.
function placeLabels(items, obstacles) {
 const boxes = [], reach = size.narrow ? 14 : 30, shelf = size.narrow ? 8 : 11, gap = 5;
 const inside = b => b.x >= 3 && b.x + b.w <= size.w - 3 && b.y >= 3 && b.y + b.h <= size.h - 3;
 const free = b => !boxes.some(o => b.x < o.x + o.w + 6 && b.x + b.w + 6 > o.x && b.y < o.y + o.h + 4 && b.y + b.h + 4 > o.y);
 // (An obstacle centred on the label's own anchor is the thing it names, so it never blocks it.)
 const open = (b, at) => !obstacles.some(c => Math.hypot(c.x - at.x, c.y - at.y) > 2 && Math.hypot(Math.max(b.x, Math.min(c.x, b.x + b.w)) - c.x, Math.max(b.y, Math.min(c.y, b.y + b.h)) - c.y) < c.r + 2);
 const usable = b => inside(b) && free(b);
 return items.filter(i => { const on = i.p && i.opacity > .01; if (!on) delete labelSide[i.key]; return on; }).map(item => {
  const {p, dir} = item, note = size.narrow ? '' : item.note || '';
  ctx.font = titleFont(); const tw = ctx.measureText(item.text).width; ctx.font = noteFont(); const nw = note ? ctx.measureText(note).width : 0;
  const w = Math.max(tw, nw), h = note ? 31 : 16;
  const sides = item.home ? [dir] : [dir, [-dir[0], dir[1]], [dir[0], -dir[1]], [-dir[0], -dir[1]], [.35, -1], [.35, 1]];
  const geometry = (d, p = item.p) => {
   const len = Math.hypot(d[0], d[1]) || 1, ux = d[0] / len, uy = d[1] / len, side = ux < -.2 ? -1 : 1;
   const home = item.home, ex = home ? home.x : p.x + ux * (p.r + reach), ey = home ? home.y : p.y + uy * (p.r + reach), sx = ex + side * shelf, tx = sx + side * gap;
   const hl = Math.hypot(ex - p.x, ey - p.y) || 1, fx = home ? (ex - p.x) / hl : ux, fy = home ? (ey - p.y) / hl : uy;
   return {from: [p.x + fx * (p.r + 5), p.y + fy * (p.r + 5)], elbow: [ex, ey], to: [sx, ey], tx, ty: ey + 4.5, side, note, box: {x: side > 0 ? tx - 2 : tx - w - 2, y: ey - 9, w: w + 4, h}};
  };
  const kept = labelSide[item.key];
  // A secondary callout with no clear place when it comes in stays out (the caption still names it) rather than being
  // drawn over the model or popping in later mid-turn; it tries again the next time it is selected.
  if (kept === -1) return null;
  const clear = (d, at = p) => { const b = geometry(d, at).box; return usable(b) && open(b, at); };
  if (!kept) {
   let side = sides.findIndex(d => [p, ...item.along || []].every(at => clear(d, at)));
   if (side < 0) side = sides.findIndex(d => clear(d));
   if (side < 0 && item.optional) { labelSide[item.key] = -1; return null; }
   if (side < 0) side = sides.findIndex(d => usable(geometry(d).box));
   if (side < 0) side = sides.findIndex(d => inside(geometry(d).box));
   if (side < 0) side = 0;
   labelSide[item.key] = {side, dir: sides[side]};
  }
  const g = geometry(labelSide[item.key].dir);
  // Last resort: slide the text back inside the stage.
  const dx = Math.max(3 - g.box.x, Math.min(0, size.w - 3 - g.box.x - g.box.w));
  g.tx += dx; g.box.x += dx; g.to[0] += dx; boxes.push(g.box);
  return {...item, ...g};
 }).filter(Boolean);
}
function drawLabel({text, note, opacity, color = '#dde6fc', p, from, elbow, to, tx, ty, side}) {
 ctx.save(); ctx.globalAlpha = opacity; ctx.strokeStyle = color; ctx.lineWidth = 1;
 ctx.globalAlpha = opacity * .85; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2); ctx.stroke();
 ctx.globalAlpha = opacity * .6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...from); ctx.lineTo(...elbow); ctx.lineTo(...to); ctx.stroke();
 ctx.globalAlpha = opacity; ctx.textAlign = side < 0 ? 'right' : 'left'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(15,17,27,.9)';
 ctx.font = titleFont(); ctx.lineWidth = 4; ctx.strokeText(text, tx, ty); ctx.fillStyle = color; ctx.fillText(text, tx, ty);
 if (note) { ctx.font = noteFont(); ctx.strokeText(note, tx, ty + 15); ctx.fillStyle = '#a0adc6'; ctx.fillText(note, tx, ty + 15); }
 ctx.restore();
}
function drawLabels(q, hop, pts, swap) {
 ctx.clearRect(0, 0, size.w, size.h);
 // The tetrahedral-site label steps aside while lithium passes T (unless lithium is hidden for Play again).
 const nearT = clamp((hop - .25) / .1) - clamp((hop - .7) / .1);
 // Inspect labels wait until the atoms have mostly risen off the printed glyph, like the story's own labels.
 // These opacities fade when the slider jumps (see fade); they are kept current even while no label is drawn.
 const risen = fade('risen', clamp((q.unfold - .6) / .4));
 const shown = {li: fade('li', q.labels * liFade), b: fade('b', q.labels * across(s => 1 - clamp((s - .8) / .15), {hop, swap})), t: fade('t', q.labels * (1 - nearT * liFade))};
 if (!pts) return;
 const c = pts.center, away = p => [p.x - c.x, p.y - c.y - 1e-3];
 const obstacles = [pts.li, pts.tm, pts.b, pts.c, pts.t, ...hop > .1 ? [pts.a] : [], ...pts.route, ...pts.oxygen.filter(o => o.visible)];
 placeLabels([
  {key: 'li', p: pts.li, along: [pts.a, pts.b], text: 'Lithium ion', opacity: shown.li, dir: [-1, -.7], color: '#c7f6cc'},
  {key: 'b', p: pts.b, text: size.narrow ? 'Empty site' : 'Empty octahedral site', opacity: shown.b, dir: away(pts.b)},
  {key: 't', p: pts.t, text: 'Tetrahedral site', opacity: shown.t, dir: [-1, .9], color: '#d1efd8'},
  {key: 'tm', p: pts.tm, text: 'Transition metal', opacity: Math.max(q.tm, drawnSel === 'tm' ? risen * focus : 0), dir: [.9, -.3], color: '#ebcefe'},
  {key: 'c', p: drawnSel === 'sites' ? pts.c : null, text: 'Second vacancy', opacity: risen * focus, dir: away(pts.c), optional: true},
 ], obstacles).forEach(drawLabel);
}

// ---------- Connectors ----------
const connectors = {figure: $('#figure-connector'), model: $('#model-connector')};
// An arrow can be veiled: Replay's rewind lets both go (each fades where it was drawn, never drawing backwards), and an
// arrow the reader skipped past stays hidden. A veil fades over 250 ms (at once where the arrow shows nothing anyway)
// and stays when the rewind is interrupted. It lifts where the story would draw that arrow afresh; a scrub fades it in.
const RELEASE = 250, veils = {figure: {v: 1, to: 1, from: 1, start: null, held: 0}, model: {v: 1, to: 1, from: 1, start: null, held: 0}};
function veil(key, to) {
 const w = veils[key], c = sequence(t / DURATION)[`${key}Connector`];
 if (w.to === to) return;
 if (!to) w.held = c.draw;
 Object.assign(w, {to, from: w.v, start: null});
 if (reduced.matches || c.draw <= 0 || c.fade <= 0) w.v = to; else schedule();
}
// A single smooth arc from just after the word to a point `gap` short of the target. It leaves nearly level
// and arrives at no more than ~34°, so the head always reads as pointing into its target.
function connectorGeometry(word, target, gap, heroRect) {
 const a = word.getBoundingClientRect();
 const S = [a.right - heroRect.left + 12, a.top - heroRect.top + a.height * .56];
 const P = target;
 const theta = Math.atan2(P[1] - S[1], P[0] - S[0]), a0 = theta * .25, a1 = Math.max(-.6, Math.min(.6, theta * 1.3));
 const dir = [Math.cos(a1), Math.sin(a1)], tip = [P[0] - dir[0] * gap, P[1] - dir[1] * gap], E = [tip[0] - dir[0] * 5, tip[1] - dir[1] * 5];
 const k = Math.hypot(E[0] - S[0], E[1] - S[1]) * .38;
 const c1 = [S[0] + Math.cos(a0) * k, S[1] + Math.sin(a0) * k], c2 = [E[0] - dir[0] * k, E[1] - dir[1] * k];
 return {d: `M${S[0]} ${S[1]}C${c1[0]} ${c1[1]},${c2[0]} ${c2[1]},${E[0]} ${E[1]}`, S, E, tip, dir};
}
let stageRect = {left: 0, top: 0};
function drawConnector(g, state, geometry) {
 const [line, head, dot, ink] = [g.querySelector('.line'), g.querySelector('.head'), g.querySelector('.dot'), $(`#${g.id}-ink`)];
 const draw = reduced.matches && !playing ? (state.draw > 0 ? 1 : 0) : state.draw;
 if (!geometry || draw <= 0 || state.fade <= 0) { g.style.opacity = '0'; return; }
 g.style.opacity = String(state.fade);
 line.setAttribute('d', geometry.d);
 const [sx, sy] = geometry.S, [tx, ty] = geometry.tip, [ux, uy] = geometry.dir;
 ink?.setAttribute('x1', sx); ink?.setAttribute('y1', sy); ink?.setAttribute('x2', tx); ink?.setAttribute('y2', ty);
 const L = line.getTotalLength(), lineP = clamp(draw / .9), headP = easeOut(clamp((draw - .8) / .2));
 line.style.strokeDasharray = `${L} ${L}`; line.style.strokeDashoffset = String(L * (1 - lineP));
 // A narrow filled head with a shallow notch: tip, wing, notch, wing.
 const k = .55 + .45 * headP, len = 9.5 * k, half = 3.8 * k, notch = 6.6 * k, bx = tx - ux * len, by = ty - uy * len;
 head.setAttribute('d', headP > 0 ? `M${tx} ${ty}L${bx - uy * half} ${by + ux * half}L${tx - ux * notch} ${ty - uy * notch}L${bx + uy * half} ${by - ux * half}Z` : '');
 head.style.opacity = String(headP);
 dot.setAttribute('cx', sx); dot.setAttribute('cy', sy); dot.setAttribute('r', String(2.4 * easeOut(clamp(draw / .12))));
}
function drawConnectors(q, pts, fc, mc) {
 const hr = hero.getBoundingClientRect(); stageRect = stageEl.getBoundingClientRect();
 const ox = stageRect.left - hr.left, oy = stageRect.top - hr.top;
 const svg = $('.hero-connectors'); svg.setAttribute('viewBox', `0 0 ${hr.width} ${hr.height}`);
 let fig = null, mod = null;
 if (figureBox && fc.draw > 0 && fc.fade > 0 && !size.stacked) {
  // "figures" points at the figure's visible left edge, then slides to the glyph as the spotlight lands on it.
  const f = size.frame, g = figureBox.glyph, word = $('#figure-word').getBoundingClientRect();
  const edge = [Math.max(f.x, figureBox.x), Math.max(figureBox.y + 24, Math.min(figureBox.y + figureBox.h - 24, word.top + word.height * .56 - stageRect.top))];
  const onGlyph = [g.x, g.y + g.h * .5];
  const k = easeInOut(q.spot);
  fig = connectorGeometry($('#figure-word'), [edge[0] + (onGlyph[0] - edge[0]) * k + ox, edge[1] + (onGlyph[1] - edge[1]) * k + oy], 7, hr);
 }
 if (pts && mc.draw > 0 && !size.stacked) mod = connectorGeometry($('#understanding-word'), [pts.a.x + ox, pts.a.y + oy], pts.a.r + 9, hr);
 drawConnector(connectors.figure, fc, fig);
 drawConnector(connectors.model, mc, mod);
}
// Stacked layouts: the word underlines itself while its picture is introduced, instead of a long arrow.
const words = {figure: $('#figure-word'), model: $('#understanding-word')};
function markWords(fc, mc) {
 const mark = c => size.stacked ? (reduced.matches && !playing ? (c.draw > 0 ? 1 : 0) : c.draw) * c.fade : 0;
 words.figure.style.setProperty('--mark', mark(fc).toFixed(3));
 words.model.style.setProperty('--mark', mark(mc).toFixed(3));
}

// ---------- Scene ----------
function view(q) {
 // The printed glyph is read in the basis view; the model turns as it unfolds, then drifts a little.
 // Most of the turn happens while the atoms lift off the card, so parallax shows their depth.
 // A repeated hop keeps the camera where the story left it (driftHold) instead of jumping back along the drift.
 return {yaw: yaw - .3 + .64 * q.unfold + .2 * Math.max(q.drift, driftHold), pitch: pitch - .08 * q.unfold};
}
// A slider jump (a click on the track, a scrub across a beat) never pops a label or the transition metal's face: each
// such opacity moves toward the story's value by at most a full fade per FADE ms (tick sets the step; a render between
// frames holds). Played at 1× the story never changes them faster (4.3 per second at most), so it is untouched; the
// 3× and 4× travels are only smoothed a little. Reduced motion shows the new point at once.
const FADE = 200, faded = {};
let fadeStep = 0, fadeAt = 0, fading = false;
function fade(key, value) {
 const was = faded[key];
 faded[key] = was === undefined || reduced.matches || Math.abs(value - was) <= fadeStep ? value : was + Math.sign(value - was) * fadeStep;
 if (faded[key] !== value) fading = true;
 return faded[key];
}
function render() {
 if (!size.w && !measure()) return;
 const q = sequence(t / DURATION), want = hover || selection, hop = hopShown ?? q.hop;
 fading = false;
 // While Play again lifts lithium out, the transition metal's face fades with it (story time then jumps back to the
 // hop's start, where that face is off); hidden, its sites cross-fade by time from where it was to where it will be
 // set down: A, or the slider's point if the reader scrubs meanwhile (see across).
 if (reset && !reset.moved) q.tm *= liFade;
 q.tm = fade('tm', q.tm);
 const swap = reset?.moved && hopShown !== null ? {from: reset.from, to: reset.to, k: smooth((reset.e - LIFT_OUT) / SETTLE)} : null;
 // A new selection is drawn once the old one has let go (at once under reduced motion); tick eases `focus`.
 if (reduced.matches) { drawnSel = want; focus = 1; }
 else if (want !== drawnSel && (!drawnSel || focus <= 0)) { drawnSel = want; focus = 0; focusAt = 0; }
 if (want !== drawnSel || want && focus < 1) schedule();
 if (q.intro >= 1) introFade = false;
 // The camera hold and the veils end only where that cannot be seen: before the model unfolds, and where the arrow
 // is undrawn or faded anyway.
 if (q.unfold <= 0) { driftHold = 0; holdOut = null; }
 if (!travel && !reset) Object.entries(veils).forEach(([k, w]) => { const c = q[`${k}Connector`]; if (c.draw <= 0 || c.fade <= 0) w.v = w.to = 1; });
 drawPaper(q);
 let pts = null;
 if (gpu) {
  const v = view(q), tr = figureTransform(q.zoom);
  const glyph = q.unfold < 1 ? {scale: tr.scale, anchors: Object.fromEntries(Object.entries(ANCHORS).map(([k, p]) => [k, toScreen(tr, p)]))} : null;
  // The model's bounding box is off-centre about the tetrahedral site; these offsets balance it in the frame.
  pts = gpu.update({...v, offsetX: -.17, offsetY: -.14, unfold: q.unfold, glyph, card: q.card, tilt: q.tilt, lens: q.lens, atoms: q.atoms, hop, swap, li: liFade, oxygen: q.oxygen, context: q.context, edges: q.edges, route: q.route, tm: q.tm, selection: drawnSel, focus});
  gpu.render();
 }
 project = pts;
 // A veiled arrow keeps the length it was drawn to while it lets go.
 const arrow = (c, w) => ({...c, ...w.to < 1 && {draw: w.held}, fade: c.fade * w.v});
 const fc = arrow(q.figureConnector, veils.figure), mc = arrow(q.modelConnector, veils.model);
 drawLabels(q, hop, q.atoms > 0 ? pts : null, swap);
 drawConnectors(q, q.unfold > .6 ? pts : null, fc, mc);
 markWords(fc, mc);
 // B is a target only while its ring shows (lithium fills it at the end), and lithium wins a tie in depth: sitting at
 // B or T it is drawn over that site's marker, so a click on it is a click on lithium.
 hitAreas = pts && q.interactive ? [
  ...liFade > .5 ? [{type: 'li', ...pts.li}] : [], {type: 'tm', ...pts.tm}, ...across(s => siteRings(s).b, {hop, swap}) > .5 ? [{type: 'sites', ...pts.b}] : [], {type: 'sites', ...pts.c}, {type: 'sites', ...pts.t, r: Math.max(pts.t.r, 12)},
  ...pts.oxygen.filter(o => o.visible).map(o => ({type: 'oxygen', ...o})),
 ].sort((a, b) => a.z - b.z || (a.type === 'li') - (b.type === 'li')) : [];
 // The "Empty site" description names the rings of one end or the other, never a mix (one wording per swap).
 updatePanel(q, swap ? (swap.k < .5 ? swap.from : swap.to) : hop);
 if (fading) schedule();
}

// ---------- Panel ----------
const ticks = $('.hero-ticks');
ticks.innerHTML = BEATS.slice(1).map(b => `<i style="left:${(b.start / DURATION * 100).toFixed(3)}%"></i>`).join('');
// Captions cross-fade: the old line lifts away quickly, then the new one settles in.
const swaps = new WeakMap();
function setText(el, text, animate) {
 if (el.dataset.text === text) return;
 el.dataset.text = text;
 swaps.get(el)?.cancel(); swaps.delete(el);
 if (el.textContent === text) return;
 if (!animate || !el.animate || reduced.matches) { el.textContent = text; return; }
 const out = el.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-3px)'}], {duration: 160, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards'});
 swaps.set(el, out);
 out.onfinish = () => {
  el.textContent = text; out.cancel();
  swaps.set(el, el.animate([{opacity: 0, transform: 'translateY(5px)'}, {opacity: 1, transform: 'none'}], {duration: 380, easing: 'cubic-bezier(.22,.75,.2,1)'}));
 };
}
// The story's caption (an inspect description replaces it once the selection is drawn on the model, so it never
// describes atoms over the paper figure). While the story fast-forwards or rewinds it does not flicker through the beats
// it passes: a caption for the page holds while the page shows, then one for the 3D side (see travelTo), which is the
// lift's own ("The same sites, lifted into 3D", true of the card and the model alike) unless the caption already up was
// one for the model, which then holds, so a hand-over never steps the caption back a beat.
const LIFTED = BEATS[beatIndex('lift')].caption;
const storyCaption = q => travel ? (q.paper > 0 ? travel.caption : travel.model) : reset?.caption ?? beatAt(q.t).caption;
function updatePanel(q, hop) {
 const beat = beatAt(q.t), inspect = hover || selection;
 const text = inspect && q.edges > 0 ? INSPECT[inspect](hop) : storyCaption(q);
 if (text !== shownText) { setText(caption, text, playing || !!inspect); shownText = text; }
 if (beat.kicker !== shownKicker) { setText(kicker, beat.kicker, playing); shownKicker = beat.kicker; }
 shownBeat = beat.id;
 const value = Math.round(t / DURATION * 1000);
 if (String(value) !== slider.value) slider.value = String(value);
 slider.style.setProperty('--progress', `${value / 10}%`);
 slider.setAttribute('aria-valuetext', `${Math.round(value / 10)} percent. ${beat.caption}`);
 overlay.setAttribute('aria-label', q.interactive
  ? `Ideal 1-TM rocksalt geometry. Lithium ${hop < .5 ? 'approaches' : hop < 1 ? 'leaves' : 'has reached'} ${hop < 1 ? 'the tetrahedral site between two octahedral sites' : 'the vacant octahedral site'}. Drag or use arrow keys to rotate.`
  : 'Figure 1 from Hau et al. comparing layered, spinel and disordered rocksalt structures. The view focuses on the layered 1-TM hop.');
 resetButton.hidden = !(Math.abs(yaw) > .01 || Math.abs(pitch) > .01);
 document.querySelectorAll('[data-inspect]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.inspect === selection)));
 hero.dataset.beat = beat.id;
 // The end beat (owner decision 9): once the story has reached its end, one line leads into the companion for this hop.
 const atEnd = t >= DURATION && !reset;
 if (continueLink.dataset.shown !== String(atEnd)) { continueLink.dataset.shown = String(atEnd); continueLink.setAttribute('aria-hidden', String(!atEnd)); continueLink.tabIndex = atEnd ? 0 : -1; }
}
function controls() {
 const end = t >= DURATION, on = playing || !begun && autoplay;
 play.setAttribute('aria-pressed', String(on));
 play.setAttribute('aria-label', on ? 'Pause animation' : end ? 'Play the lithium hop again' : 'Play animation');
 play.dataset.state = on ? 'pause' : end ? 'again' : 'play';
}

// ---------- Playback ----------
// Nothing here cuts: early input fast-forwards, Play again lifts lithium out and sets it back down, Replay rewinds.
const FAST = 3, REWIND = 4, LIFT_OUT = 300, SETTLE = 400, SET_IN = 300, LET_GO = 120, TAKE = 220;
function schedule() { if (!frame) frame = requestAnimationFrame(tick); }
function tick(now) {
 frame = 0;
 let busy = false;
 if (reset) {
  reset.start ??= now - reset.faded * LIFT_OUT;
  const e = reset.e = now - reset.start;
  if (e >= LIFT_OUT && !reset.moved) { reset.moved = true; t = HOP_REPLAY_AT; delete labelSide.li; }
  resetPose();
  if (e >= LIFT_OUT + SETTLE && reset.then) { const then = reset.then; reset.then = null; then(); }
  if (e >= LIFT_OUT + SETTLE + SET_IN) { reset = null; liFade = 1; hopShown = null; }
  busy = true;
 }
 if (playing && !reset?.then) {
  if (last) {
   const dt = Math.min(now - last, 80) / 1000;
   if (travel) {
    t = travel.rate > 0 ? Math.min(travel.to, t + dt * travel.rate) : Math.max(travel.to, t + dt * travel.rate);
    if (t === travel.to) { const then = travel.then; travel = null; then(); }
   } else t = Math.min(DURATION, t + dt);
  }
  last = now; busy = true;
  if (playing && !travel && t >= DURATION) { playing = false; last = 0; controls(); }
 }
 if (viewTween) {
  const {start, ms, ease, from, to} = viewTween, k = clamp((now - start) / ms), e = ease(k);
  yaw = from[0] + (to[0] - from[0]) * e; pitch = from[1] + (to[1] - from[1]) * e; busy = true;
  if (k >= 1) { viewTween = null; [yaw, pitch] = to; }
 }
 if (holdOut) {
  holdOut.start ??= now; const k = clamp((now - holdOut.start) / 380);
  driftHold = holdOut.from * (1 - easeInOut(k)); busy = true; if (k >= 1) { holdOut = null; driftHold = 0; }
 }
 for (const w of Object.values(veils)) if (w.v !== w.to) { w.start ??= now; w.v = w.from + (w.to - w.from) * clamp((now - w.start) / RELEASE); busy = true; }
 const veiling = Object.values(veils).some(w => w.v !== w.to);
 const want = hover || selection;
 if (want !== drawnSel || want && focus < 1) {
  const dt = focusAt ? Math.min(now - focusAt, 80) : 0;
  focus = want === drawnSel ? Math.min(1, focus + dt / TAKE) : Math.max(0, focus - dt / LET_GO);
  focusAt = want !== drawnSel || focus < 1 ? now : 0;
 }
 fadeStep = fadeAt ? Math.min(now - fadeAt, 80) / FADE : 0;
 render(); fadeStep = 0;
 if (busy && (playing || viewTween || reset || holdOut || veiling)) schedule();
 fadeAt = frame ? now : 0;
}
// Lithium fades where it stands; hidden, its rings and route ease to where it will be set down (`to`: A, or the slider's
// point after a scrub); then it fades in there.
function resetPose() {
 const {e, from, to} = reset;
 liFade = e < LIFT_OUT ? 1 - e / LIFT_OUT : e < LIFT_OUT + SETTLE ? 0 : Math.min(1, (e - LIFT_OUT - SETTLE) / SET_IN);
 hopShown = e < LIFT_OUT ? from : e < LIFT_OUT + SETTLE ? from + (to - from) * easeInOut((e - LIFT_OUT) / SETTLE) : null;
}
function start() { playing = true; userPaused = false; travel = null; last = 0; controls(); schedule(); }
// Pausing stops any fast-forward or rewind where it is; a Play again already under way still sets lithium down.
function pause(byUser = true) { playing = false; travel = null; if (reset) reset.then = null; last = 0; if (byUser) { userPaused = true; autoplay = false; } controls(); }
function settle() { travel = null; reset = null; liFade = 1; hopShown = null; introFade = false; }
// The slider shows the story as it is at that point: veiled arrows fade back in and the camera hold left by Play again
// eases out (380 ms) rather than either cutting. A Play again or Replay still setting lithium down finishes doing so
// out of sight and fades it in at the slider's point, its sites cross-fading there, instead of popping it in.
function seek(time) {
 const hidden = !reduced.matches && reset;
 settle(); pause(); t = clamp(time / DURATION) * DURATION;
 if (hidden) { reset = Object.assign(hidden, {then: null, caption: null, moved: true, to: hopAt(t)}); resetPose(); schedule(); }
 Object.keys(veils).forEach(k => veil(k, 1));
 if (driftHold && reduced.matches) driftHold = 0; else if (driftHold) { holdOut ??= {start: null, from: driftHold}; schedule(); }
 controls(); render();
}
// Move the story to `to` at `rate`× real time (negative rewinds, letting both arrows go), then run `then`. `caption`
// is held while the page shows and `model` while the card or the model does.
function travelTo(to, rate, caption, then, model = LIFTED) {
 if (rate < 0) { veil('figure', 0); veil('model', 0); }
 travel = {to, rate, caption, model, then}; playing = true; introFade &&= rate > 0; last = 0; controls(); schedule();
}
// The reader's turn eases to [y, p]: back to the storyboard view over 380 ms, or a short ease-out for an arrow-key step.
function turnTo(y, p, ms = 380, ease = easeInOut) { viewTween = {start: performance.now(), ms, ease, from: [yaw, pitch], to: [y, p]}; schedule(); }
// Any input hands the story to the reader for good. Before the model is built, the rest of the lift plays at 3× (one
// step under reduced motion) and the built model then waits, lithium still at A; later input pauses where it is.
function handOver() {
 userPaused = true;
 // Before the figure has loaded begin() takes it from here; without WebGL there is no model to hand over.
 if (!begun) { handed = true; return; }
 if (!gpu || travel?.rate > 0) return;
 if (t >= HANDOVER_AT) { pause(); return; }
 const q = sequence(t / DURATION), up = storyCaption(q);
 if (q.modelConnector.draw <= 0 || q.modelConnector.fade <= 0) veil('model', 0); // the reader skipped past "understanding"
 if (reduced.matches) { settle(); pause(); t = HANDOVER_AT; controls(); render(); return; }
 travelTo(HANDOVER_AT, FAST, up, () => pause(), q.paper > 0 ? LIFTED : up);
}
// Play again and Replay never teleport lithium (see tick). The camera holds still while the hop repeats.
function resetHop(then, caption) {
 // A reset still lifting lithium out just takes the new follow-up (and sets it down at A again, should a scrub have
 // moved that); one already setting it down needs no other. Lithium still fading in after a scrub lifts out from there.
 if (reset && reset.e < LIFT_OUT + SETTLE) Object.assign(reset, {then, caption, to: 0, moved: reset.moved && t === HOP_REPLAY_AT});
 else reset = {start: null, e: 0, faded: 1 - liFade, from: hopShown ?? hopAt(t), to: 0, then, caption, moved: false};
 travel = null; holdOut = null; veil('model', 0); driftHold = Math.max(driftHold, sequence(t / DURATION).drift);
 playing = true; userPaused = false; last = 0; controls(); schedule();
}
function replayFromPaper() {
 selection = hover = '';
 if (reduced.matches) { settle(); t = 0; yaw = pitch = 0; viewTween = null; pause(); render(); return; }
 if (yaw || pitch || viewTween) turnTo(0, 0);
 // The lift plays backwards into the page (lithium first returns to A), then the story starts again.
 const rewind = () => travelTo(0, -REWIND, BEATS[0].caption, start);
 if (reset && reset.e < LIFT_OUT + SETTLE || hopAt(t) > 0) resetHop(rewind, LIFTED); else rewind();
 render();
}

play.addEventListener('click', () => {
 if (!begun) { autoplay = !autoplay; userPaused = !autoplay; controls(); } // see `autoplay`
 else if (playing) pause(); else if (t >= DURATION) resetHop(start, beatAt(HOP_REPLAY_AT).caption); else start();
});
replay.addEventListener('click', replayFromPaper);
slider.addEventListener('input', () => seek(Number(slider.value) / 1000 * DURATION));
slider.addEventListener('focus', () => pause());
resetButton.addEventListener('click', () => { if (reduced.matches) { yaw = pitch = 0; viewTween = null; render(); } else turnTo(0, 0); overlay.focus?.(); });
document.querySelectorAll('[data-inspect]').forEach(b => {
 const key = b.dataset.inspect;
 // The selection shows at once (its description replaces the caption); the model forms under it if need be.
 b.addEventListener('click', () => { selection = selection === key ? '' : key; hover = ''; handOver(); render(); });
 b.addEventListener('mouseenter', () => { if (!sequence(t / DURATION).interactive) return; hover = key; render(); });
 b.addEventListener('mouseleave', () => { hover = ''; render(); });
 b.addEventListener('focus', () => { if (!sequence(t / DURATION).interactive) return; hover = key; render(); });
 b.addEventListener('blur', () => { hover = ''; render(); });
});

// ---------- Pointer and keyboard ----------
// A mouse press on the model hands over at once. A touch hands over only as a tap or a sideways drag: a vertical touch
// drag is ordinary page scrolling (touch-action: pan-y), never input on the stage, before or after the model exists.
// A drag is measured from where the press began, so a slow drag (a pixel or two per event) is a drag, never a tap.
const at = e => { const r = overlay.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; };
const hitTest = p => [...hitAreas].reverse().find(a => Math.hypot(a.x - p.x, a.y - p.y) < Math.max(a.r, 14))?.type || '';
overlay.addEventListener('pointerdown', e => {
 const p = at(e), touch = e.pointerType === 'touch'; pointer = {...p, id: e.pointerId, from: p, touch, turn: false}; dragged = false;
 if (!touch) { viewTween = null; if (sequence(t / DURATION).interactive) handOver(); }
});
overlay.addEventListener('pointermove', e => {
 const p = at(e), ready = sequence(t / DURATION).interactive;
 if (pointer) {
  const dx = p.x - pointer.x, dy = p.y - pointer.y, ox = p.x - pointer.from.x, oy = p.y - pointer.from.y;
  // The drag's direction is read once, as it starts: sideways (or any mouse drag) turns, vertical touch scrolls. A
  // touch is read only past 10 px (about a browser's own slop for a scroll), beyond a thumb's wobble at touch-down.
  if (!dragged && Math.hypot(ox, oy) > (pointer.touch ? 10 : 3)) { dragged = true; pointer.turn = !pointer.touch || Math.abs(ox) > Math.abs(oy); if (pointer.turn) { viewTween = null; handOver(); } }
  pointer.x = p.x; pointer.y = p.y;
  if (!ready || !pointer.turn) return;
  yaw += dx * .008; pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * .006)); render();
 } else if (ready && e.pointerType !== 'touch') {
  const next = hitTest(p); overlay.style.cursor = next ? 'pointer' : 'grab';
  if (next !== hover) { hover = next; render(); }
 }
});
overlay.addEventListener('pointerup', e => {
 if (!pointer) return;
 if (!dragged) { const ready = sequence(t / DURATION).interactive; handOver(); if (ready) { selection = hitTest(at(e)); hover = ''; render(); } }
 pointer = null;
});
overlay.addEventListener('pointercancel', () => { pointer = null; });
overlay.addEventListener('pointerleave', () => { pointer = null; if (hover) { hover = ''; render(); } });
overlay.addEventListener('keydown', e => {
 if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
 e.preventDefault();
 // While the model is still forming, the first press starts the fast-forward; presses after that turn it (each press
 // eases on from where the last one was heading; Home eases back like Reset view).
 const ready = sequence(t / DURATION).interactive; handOver();
 if (!ready) return;
 const [y, p] = viewTween?.to || [yaw, pitch], home = e.key === 'Home';
 const to = home ? [0, 0] : [y + (e.key === 'ArrowLeft' ? -.15 : e.key === 'ArrowRight' ? .15 : 0), Math.max(-1.1, Math.min(1.1, p + (e.key === 'ArrowUp' ? -.12 : e.key === 'ArrowDown' ? .12 : 0)))];
 if (reduced.matches) { viewTween = null; [yaw, pitch] = to; render(); } else turnTo(...to, home ? 380 : 180, home ? easeInOut : easeOut);
});

// ---------- Lifecycle ----------
reduced.addEventListener('change', () => { if (reduced.matches) pause(); });
document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden && playing && !travel && !reset) { pause(false); userPaused = false; wasAuto = true; } else if (!document.hidden && wasAuto) { wasAuto = false; if (!userPaused && !reduced.matches && inView) start(); } });
// Pause the story while the hero is scrolled away, and pick it up again on return.
if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
 inView = entry.isIntersecting;
 if (!inView && playing && !travel && !reset) { pause(false); wasAuto = true; }
 else if (inView && wasAuto && !userPaused && !document.hidden) { wasAuto = false; start(); }
}, {threshold: .2}).observe(hero);
new ResizeObserver(() => { if (measure()) render(); }).observe(stageEl);
if (document.fonts?.ready) document.fonts.ready.then(() => { if (measure()) render(); });
function begin() {
 if (begun) return;
 measure(); begun = true;
 if (!gpu) {
  // The original figure alone: nothing to play or inspect.
  render(); play.hidden = replay.hidden = true; slider.disabled = true; $('.hero-species').hidden = true;
  caption.textContent = '3D is unavailable in this browser, so this is the original figure'; return;
 }
 if (flags.has('no-opening')) { t = DURATION; introFade = false; controls(); }
 // Input while the figure was still loading has already handed the story over: the lift now plays to the built model.
 else if (handed) handOver();
 else if (autoplay) start(); else { introFade = false; controls(); }
 render();
}
controls();
source.addEventListener('load', begin);
source.addEventListener('error', () => {
 if (!source.src.endsWith('.png')) { source.src = SOURCE_PNG; return; }
 t = DURATION; begin(); pause(false); caption.textContent = 'The source figure didn’t load, but the 3D model is here to explore';
});
if (source.complete && source.naturalWidth) begin();
const notes = $('#hero-notes-dialog');
$('#hero-notes').addEventListener('click', () => { pause(); notes.showModal(); });
notes.querySelector('.dialog-close').addEventListener('click', () => notes.close());
