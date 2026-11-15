// The paper figure beside the model (figure-pair.css, 14 October 2026): the figure fits its column, is never taller than the
// model's stage nor blown up past 1.6× its pixels; the zoom buttons enlarge it (from Fit, toward the outlined panel) and a
// mouse drag pans it; and one panel is outlined to match what the model shows, with a note under the figure.
// Written for the rocksalt rebuild (17 October 2026) from silicon-nanowire.js's figure code, which the older figure pairs keep
// for now; they can move onto this module one at a time.
//
// createPaperView({view, viewport, image, stage, mark, note, zoomOut, fit, zoomIn, figure: {width, height}})
//   .outline(box, text, matched)  box [x0, y0, x1, y1] in the figure's pixels, or null. A matched box is outlined and its note
//                                 shown; an unmatched one (or none) leaves the figure unmarked and the note, with a dashed
//                                 swatch, says why. No box and no text clears both.
//   .size()                       refit (also runs on resize of the column or the stage)
// Focus (14 November 2026): with autoFocus() true, a lit panel is brought up inside the figure's own frame until it fills
// about four fifths of it, gliding from panel to panel as the steps change, so the panel the step is about can be read (a
// folded figure drew rocksalt's hop panel about 60 × 75 px). The frame keeps its size, so nothing around it moves; a lit
// panel as wide as the figure stays at Fit. Fit shows the whole figure until the next panel is lit; the zoom buttons work as
// before. Off on phones (a zoomed figure would hold vertical swipes) and while autoFocus() is false (an opening that lifts
// a piece of the figure needs it at Fit).
// Inset (14 November 2026): on a phone the figure scrolls away above the pinned stage after the first step, so while it is
// off screen the lit panel is shown, small, in the stage's top left corner, cut from the same image; a tap on it scrolls back
// to the whole figure. With no lit panel, or with the figure in view, it fades out.
export function createPaperView({view, viewport, image, stage, mark, note, zoomOut, fit, zoomIn, figure, maxScale = 1.6, maxZoom = 4, step = 1.5, autoFocus = () => false}) {
  const stacked = matchMedia('(max-width: 860px)'), still = matchMedia('(prefers-reduced-motion: reduce)');
  let zoom = 1, centre = null, pan = null, lit = null, held = null, glide = 0, litBox = null, figSeen = true;
  const inset = document.createElement('button'); inset.type = 'button'; inset.className = 'panel-inset'; inset.setAttribute('aria-label', 'Show the whole figure');
  inset.addEventListener('click', () => view.scrollIntoView({block: 'center', behavior: still.matches ? 'auto' : 'smooth'}));
  stage.append(inset);
  function showInset() {
    const on = !!litBox && stacked.matches && !figSeen && autoFocus();
    if (on) {
      const H = 78, k = H / (litBox[3] - litBox[1]), W = Math.min(150, Math.round((litBox[2] - litBox[0]) * k)), src = image.currentSrc || image.src;
      Object.assign(inset.style, {width: W + 'px', height: H + 'px', backgroundImage: `url("${src}")`, backgroundSize: `${figure.width * k}px auto`,
        backgroundPosition: `${-(litBox[0] + (litBox[2] - litBox[0]) / 2) * k + W / 2}px ${-litBox[1] * k}px`});
    }
    inset.classList.toggle('on', on);
  }
  new IntersectionObserver(([e]) => { figSeen = e.isIntersecting; showInset(); }, {threshold: .15}).observe(view);
  function size() {
    // On a phone the figure gets at most 42% of the screen's height; beside the stage, the stage's height.
    const room = stacked.matches ? Math.min(innerHeight * .42, 420) : stage.clientHeight;
    const w = Math.round(Math.min(view.clientWidth, room * figure.width / figure.height, figure.width * maxScale));
    if (!(w > 0)) return;
    viewport.style.width = w + 'px'; viewport.style.height = Math.round(w * figure.height / figure.width) + 'px';
    image.style.width = Math.max(1, w * zoom) + 'px'; viewport.classList.toggle('zoomed', zoom > 1);
    zoomOut.disabled = zoom <= 1; zoomIn.disabled = zoom >= maxZoom; fit.textContent = zoom === 1 ? 'Fit' : Math.round(zoom * 100) + '%';
  }
  // Bring the lit box up in the frame: zoom and centre glide together (520 ms, as the outline does), or land at once.
  function focus(box, instant) {
    cancelAnimationFrame(glide);
    const p = viewport, vw = p.clientWidth, vh = p.clientHeight; if (!(vw > 0)) return;
    const fw = vw, fh = vw * figure.height / figure.width;   // the figure at Fit fills the frame's width
    const z1 = box ? Math.max(1, Math.min(maxZoom, figure.width * maxScale / fw, .82 * Math.min(vw / ((box[2] - box[0]) / figure.width * fw), vh / ((box[3] - box[1]) / figure.height * fh)))) : 1;
    const c1 = box ? [(box[0] + box[2]) / 2 / figure.width, (box[1] + box[3]) / 2 / figure.height] : [.5, .5];
    const z0 = zoom, c0 = [(p.scrollLeft + vw / 2) / p.scrollWidth, (p.scrollTop + vh / 2) / p.scrollHeight];
    const put = (z, c) => { zoom = z; size(); p.classList.toggle('focused', z > 1.001); p.scrollTo(c[0] * p.scrollWidth - vw / 2, c[1] * p.scrollHeight - vh / 2); };
    if (instant || still.matches || Math.abs(z1 - z0) < .01 && Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) < .002) { put(z1, c1); return; }
    const t0 = performance.now(), e = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const tick = now => { const t = Math.min(1, (now - t0) / 520), k = e(t); put(z0 + (z1 - z0) * k, [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k]); if (t < 1) glide = requestAnimationFrame(tick); };
    glide = requestAnimationFrame(tick);
  }
  function setZoom(factor) {
    cancelAnimationFrame(glide); viewport.classList.remove('focused');
    const p = viewport, old = zoom;
    // From Fit, zooming in heads for the outlined panel; after that it keeps the reader's own centre.
    const c = old === 1 && factor > 1 && centre ? centre : [(p.scrollLeft + p.clientWidth / 2) / p.scrollWidth, (p.scrollTop + p.clientHeight / 2) / p.scrollHeight];
    zoom = factor === 0 ? 1 : Math.max(1, Math.min(maxZoom, zoom * factor)); if (zoom === old) return;
    size(); p.scrollTo(c[0] * p.scrollWidth - p.clientWidth / 2, c[1] * p.scrollHeight - p.clientHeight / 2);
  }
  // Within the figure the outline glides from panel to panel; from nothing it appears in place and fades in.
  function outline(box, text, matched = true) {
    if (!box && !text) { mark.classList.remove('on'); note.textContent = ''; note.classList.remove('is-unmatched'); centre = null; return; }
    const on = !!box && matched;
    if (on) {
      const pos = {left: box[0] / figure.width * 100 + '%', top: box[1] / figure.height * 100 + '%', width: (box[2] - box[0]) / figure.width * 100 + '%', height: (box[3] - box[1]) / figure.height * 100 + '%'};
      if (!mark.classList.contains('on')) { mark.style.transition = 'none'; Object.assign(mark.style, pos); void mark.offsetWidth; mark.style.transition = ''; }
      else Object.assign(mark.style, pos);
      centre = [(box[0] + box[2]) / 2 / figure.width, (box[1] + box[3]) / 2 / figure.height];
    } else centre = null;
    mark.classList.toggle('on', on); note.classList.toggle('is-unmatched', !on);
    // A new lit panel is brought up (unless the reader has chosen Fit for this one); no panel returns to Fit
    const key = on ? box.join(',') : ''; litBox = on ? box : null; showInset();
    if (key !== lit) { lit = key; if (autoFocus() && !stacked.matches && held !== key) focus(on ? box : null); held = null; }
    if (note.textContent !== text) note.textContent = text;
  }
  zoomIn.addEventListener('click', () => setZoom(step)); zoomOut.addEventListener('click', () => setZoom(1 / step)); fit.addEventListener('click', () => { held = lit; setZoom(0); });
  viewport.addEventListener('pointerdown', e => { if (zoom > 1 && e.pointerType !== 'touch') { pan = {x: e.clientX, y: e.clientY, l: viewport.scrollLeft, t: viewport.scrollTop}; viewport.setPointerCapture(e.pointerId); viewport.classList.add('panning'); } });
  viewport.addEventListener('pointermove', e => { if (pan) { viewport.scrollLeft = pan.l - (e.clientX - pan.x); viewport.scrollTop = pan.t - (e.clientY - pan.y); } });
  const end = () => { if (pan) { pan = null; viewport.classList.remove('panning'); } };
  viewport.addEventListener('pointerup', end); viewport.addEventListener('pointercancel', end);
  image.addEventListener('load', size);
  new ResizeObserver(size).observe(view); new ResizeObserver(size).observe(stage);
  stacked.addEventListener('change', size);
  size();
  return {outline, size, setZoom, focus: box => focus(box)};
}
