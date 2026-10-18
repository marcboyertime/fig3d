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
export function createPaperView({view, viewport, image, stage, mark, note, zoomOut, fit, zoomIn, figure, maxScale = 1.6, maxZoom = 4, step = 1.5}) {
  const stacked = matchMedia('(max-width: 860px)');
  let zoom = 1, centre = null, pan = null;
  function size() {
    // On a phone the figure gets at most 42% of the screen's height; beside the stage, the stage's height.
    const room = stacked.matches ? Math.min(innerHeight * .42, 420) : stage.clientHeight;
    const w = Math.round(Math.min(view.clientWidth, room * figure.width / figure.height, figure.width * maxScale));
    if (!(w > 0)) return;
    viewport.style.width = w + 'px'; viewport.style.height = Math.round(w * figure.height / figure.width) + 'px';
    image.style.width = Math.max(1, w * zoom) + 'px'; viewport.classList.toggle('zoomed', zoom > 1);
    zoomOut.disabled = zoom <= 1; zoomIn.disabled = zoom >= maxZoom; fit.textContent = zoom === 1 ? 'Fit' : Math.round(zoom * 100) + '%';
  }
  function setZoom(factor) {
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
    if (note.textContent !== text) note.textContent = text;
  }
  zoomIn.addEventListener('click', () => setZoom(step)); zoomOut.addEventListener('click', () => setZoom(1 / step)); fit.addEventListener('click', () => setZoom(0));
  viewport.addEventListener('pointerdown', e => { if (zoom > 1 && e.pointerType !== 'touch') { pan = {x: e.clientX, y: e.clientY, l: viewport.scrollLeft, t: viewport.scrollTop}; viewport.setPointerCapture(e.pointerId); viewport.classList.add('panning'); } });
  viewport.addEventListener('pointermove', e => { if (pan) { viewport.scrollLeft = pan.l - (e.clientX - pan.x); viewport.scrollTop = pan.t - (e.clientY - pan.y); } });
  const end = () => { if (pan) { pan = null; viewport.classList.remove('panning'); } };
  viewport.addEventListener('pointerup', end); viewport.addEventListener('pointercancel', end);
  image.addEventListener('load', size);
  new ResizeObserver(size).observe(view); new ResizeObserver(size).observe(stage);
  stacked.addEventListener('change', size);
  size();
  return {outline, size, setZoom};
}
