// The lit panel can be read (16 November 2026), for the figure columns that keep their own figure code (fast ion and
// nanoparticle; rocksalt has the same behaviour inside kit/paper-view.mjs). Two parts, as there:
// Focus: on a desktop, a newly lit panel is brought up inside the figure's own frame until it fills about four fifths of it,
// gliding (520 ms) from panel to panel as the steps change. The frame keeps its size, so nothing around it moves; a panel as
// wide as the figure stays at Fit; no lit panel returns to Fit. Fit shows the whole figure until the next panel is lit; the
// zoom buttons work as before. Off on phones and while autoFocus() is false (an opening that lifts a piece of the figure
// needs it at Fit).
// Inset: on a phone the figure scrolls away above the pinned stage, so while it is off screen the lit panel is shown, small,
// in the stage's top left corner (top right with corner: 'right', where the stage's own chips hold the left), cut from the
// same image; a tap on it scrolls back to the whole figure.
//
// createPanelFocus({view, viewport, image, stage, figure, zoom, setZoom, autoFocus})
//   figure()      {width, height} of the figure on show, in its pixels
//   zoom()        the column's current zoom (1 is Fit); setZoom(z) sets it and refits the image, without scrolling
//   .update(id, box)  call every frame: id names the figure on show, box [x0, y0, x1, y1] is its lit panel, or null
//   .fit()        the reader pressed Fit: the panel lit now stays whole
//   .manual()     the reader pressed − or +: any glide stops there
export function createPanelFocus({view, viewport, image, stage, figure, zoom, setZoom, autoFocus = () => true, maxZoom = 4, maxScale = 1.6, corner = 'left'}) {
  const stacked = matchMedia('(max-width: 860px)'), still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&](reduced|motion=reduce)\b/.test(location.search);
  let lit = null, held = null, glide = 0, litBox = null, figSeen = true, auto = false;
  const inset = document.createElement('button'); inset.type = 'button'; inset.className = 'panel-inset'; inset.setAttribute('aria-label', 'Show the whole figure'); if (corner === 'right') inset.classList.add('at-right');
  inset.addEventListener('click', () => view.scrollIntoView({block: 'center', behavior: still() ? 'auto' : 'smooth'}));
  stage.append(inset);
  function showInset() {
    const f = figure(), on = !!litBox && !!f && stacked.matches && !figSeen && auto;
    if (on) {
      // about 9,400 px² whatever the panel's shape (a tall column of two panels gets about 60 × 120, not a 39 px strip)
      const bw = litBox[2] - litBox[0], bh = litBox[3] - litBox[1], k = Math.min(Math.sqrt(9400 / (bw * bh)), 150 / bw, 120 / bh), W = Math.round(bw * k), H = Math.round(bh * k), src = image.currentSrc || image.src;
      Object.assign(inset.style, {width: W + 'px', height: H + 'px', backgroundImage: `url("${src}")`, backgroundSize: `${f.width * k}px auto`,
        backgroundPosition: `${-(litBox[0] + (litBox[2] - litBox[0]) / 2) * k + W / 2}px ${-litBox[1] * k}px`});
    }
    inset.classList.toggle('on', on);
  }
  new IntersectionObserver(([e]) => { figSeen = e.isIntersecting; showInset(); }, {threshold: .15}).observe(view);
  function stop() { cancelAnimationFrame(glide); viewport.classList.remove('focused'); }
  function focus(box, instant) {
    cancelAnimationFrame(glide);
    const p = viewport, vw = p.clientWidth, vh = p.clientHeight, f = figure(); if (!(vw > 0) || !f) return;
    // At Fit the figure fills the frame, so a box's share of the figure is its share of the frame
    const z1 = box ? Math.max(1, Math.min(maxZoom, f.width * maxScale / vw, .82 * Math.min(f.width / (box[2] - box[0]), f.height / (box[3] - box[1])))) : 1;
    const c1 = box ? [(box[0] + box[2]) / 2 / f.width, (box[1] + box[3]) / 2 / f.height] : [.5, .5];
    const z0 = zoom(), c0 = [(p.scrollLeft + vw / 2) / p.scrollWidth, (p.scrollTop + vh / 2) / p.scrollHeight];
    const put = (z, c) => { setZoom(z); p.classList.toggle('focused', z > 1.001); p.scrollTo(c[0] * p.scrollWidth - vw / 2, c[1] * p.scrollHeight - vh / 2); };
    if (instant || still() || Math.abs(z1 - z0) < .01 && Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) < .002) { put(z1, c1); return; }
    const t0 = performance.now(), e = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const tick = now => { const t = Math.min(1, (now - t0) / 520), k = e(t); put(z0 + (z1 - z0) * k, [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k]); if (t < 1) glide = requestAnimationFrame(tick); };
    glide = requestAnimationFrame(tick);
  }
  // A phone shows the whole figure; back on a desktop the lit panel is brought up again
  stacked.addEventListener('change', () => { if (stacked.matches) { if (zoom() > 1) focus(null, true); stop(); } else lit = null; showInset(); });
  function update(id, box) {
    const a = !!autoFocus();
    if (a !== auto) { auto = a; lit = null; if (!a) stop(); }   // when the opening ends, the step's panel is brought up
    const key = box ? id + ':' + box.join(',') : '';
    if (key === lit) return;
    lit = key; litBox = box || null; showInset();
    if (auto && !stacked.matches && held !== key) focus(litBox); held = null;
  }
  return {update, fit() { held = lit; stop(); }, manual: stop};
}
