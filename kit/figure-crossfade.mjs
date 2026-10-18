// Layout v2's figure column changes figure by a crossfade (18 October 2026: scrolling through the steps must never jump or
// cut). The next file is decoded off-screen first. The picture on screen then stays beneath as a copy while the new one
// fades in over it, already at its own size, and the copy fades only once it is mostly covered, so the column never
// thins or flashes; the column glides to its new height in CSS (.v2-pviewport, layout-v2.css), clipping the copy as it
// goes. The copy sits under the panel outline and its veil (they are drawn after it), so the outline glides from the old
// panel to the new one across the change instead of vanishing for a frame. Figures a page will show are decoded ahead
// (preload). Reduced motion: an immediate change.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&](reduced|motion=reduce)\b/.test(location.search);
const decoded = new Map();
const FADE = 460;
export function preload(srcs) {
  for (const s of srcs) if (!decoded.has(s)) { const i = new Image(); i.src = s; decoded.set(s, i.decode ? i.decode().catch(() => {}) : Promise.resolve()); }
}
export function crossfadeFigure(img, key, src, apply) {
  if (img.dataset.want === key) { if (img.dataset.key === key) apply(); return; }
  img.dataset.want = key;
  if (!img.getAttribute('src') || !img.complete || !img.naturalWidth) {
    // The first picture: kept out of sight until it can be drawn, then faded in (never a white box, then the figure)
    const fresh = !reduced();
    if (fresh) img.style.opacity = '0';
    img.src = src; img.dataset.key = key; apply();
    if (fresh) {
      const show = () => { if (img.dataset.key !== key) return;   // a later change has taken over
        const a = img.animate([{opacity: 0}, {opacity: 1}], {duration: 360, easing: 'ease-out', fill: 'forwards'});
        a.finished.then(() => { img.style.opacity = ''; a.cancel(); }, () => { img.style.opacity = ''; }); };
      (img.decode ? img.decode() : Promise.resolve()).then(show, show);
    }
    return;
  }
  preload([src]);
  decoded.get(src).then(() => {
    if (img.dataset.want !== key) return;
    const box = img.closest('.v2-pviewport, .paper-viewport') || img.parentNode, quick = reduced();
    // A change that arrives mid-fade starts from what is on screen: the copy takes the picture at its present strength
    const from = +getComputedStyle(img).opacity;
    img.getAnimations().forEach(a => a.cancel());
    let ghost = null;
    if (!quick) {
      const b = box.getBoundingClientRect(), r = img.getBoundingClientRect();
      ghost = img.cloneNode(); ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true'); ghost.alt = ''; ghost.className = 'figure-ghost';
      Object.assign(ghost.style, {position: 'absolute', left: r.left - b.left + box.scrollLeft + 'px', top: r.top - b.top + box.scrollTop + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, maxWidth: 'none', pointerEvents: 'none', opacity: ''});
      let sheet = img; while (sheet.parentNode !== box) sheet = sheet.parentNode;
      box.insertBefore(ghost, sheet);
      // Hidden before the new file is set, so it never shows at full strength for a frame before its fade starts
      img.style.opacity = '0';
    }
    img.src = src; img.dataset.key = key; apply();
    if (!ghost) return;
    const show = () => {
      const an = img.animate([{opacity: 0}, {opacity: 1}], {duration: FADE, easing: 'ease-in-out', fill: 'both'});
      ghost.animate([{opacity: from}, {opacity: from, offset: .45}, {opacity: 0}], {duration: FADE + 120, easing: 'ease-in-out', fill: 'forwards'});
      an.finished.then(() => { img.style.opacity = ''; an.cancel(); setTimeout(() => ghost.remove(), 140); }, () => { img.style.opacity = ''; ghost.remove(); });
    };
    // The file is decoded, but the element may still be swapping it in; start the fade once it is ready to paint
    (img.decode ? img.decode() : Promise.resolve()).then(show, show);
  });
}
