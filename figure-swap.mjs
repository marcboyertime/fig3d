// Changes the paper figure shown in one <img> without a broken frame. The next file is decoded off-screen while the
// current figure fades out at its own size; then the source, its size and its scroll position change together and
// the new figure fades in. `apply` runs at that moment and must size the image for the new figure.
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)'), flags = new URLSearchParams(globalThis.location?.search || '');
// The OS setting, or the ?reduced / ?motion=reduce review aliases every page reads.
const review = flags.has('reduced') || flags.get('motion') === 'reduce', reduced = {get matches() { return review || motionQuery.matches; }};
export function swapFigure(img, key, src, apply) {
  if (img.dataset.want === key) { if (img.dataset.key === key) apply(); return; }
  img.dataset.want = key;
  const quick = reduced.matches, from = +getComputedStyle(img).opacity;
  img.getAnimations().forEach(a => a.cancel());
  const fadeIn = start => { img.getAnimations().forEach(a => a.cancel()); if (start < 1) img.animate([{opacity: start}, {opacity: 1}], {duration: quick ? 0 : 200 * (1 - start), easing: 'ease-out'}); };
  // The figure already on screen (the first one, or a switch back before the next file arrived): just bring it back.
  if (!img.getAttribute('src') || img.src.endsWith(src)) { if (!img.src.endsWith(src)) img.src = src; img.dataset.key = key; apply(); fadeIn(from); return; }
  const next = new Image(); next.src = src;
  const decoded = next.decode ? next.decode().catch(() => {}) : Promise.resolve();
  // When the figure view is only now appearing, the old figure must not show at all on the way in.
  const view = img.closest('.paper-view'), seen = view && img.getClientRects().length && +getComputedStyle(view).opacity > .2;
  const out = img.animate([{opacity: from}, {opacity: 0}], {duration: quick || !seen ? 0 : 120 * from, easing: 'ease-in', fill: 'forwards'});
  Promise.all([decoded, out.finished.catch(() => {})]).then(() => {
    if (img.dataset.want !== key) return;
    img.src = src; img.dataset.key = key; apply();
    // Shown only once the new file is ready at its new size.
    if (img.complete) fadeIn(0); else img.addEventListener('load', () => fadeIn(0), {once: true});
  });
}

// Returns the room the figure will have once the stage settles.
// A wide paper figure fits the stage's width long before its height, which left it floating in an empty box. While
// such a figure is shown, the stage closes up around it (on wide screens to no less than half its height), and opens back to its full height for
// the 3D view. The 3D layer keeps the full height throughout, so the model is revealed, never rescaled.
const ghosts = new WeakMap();
export function fitStage(stage, figure, {view, opening = false} = {}) {
  // opening:true keeps the full stage with the figure centred (CSS), for a page's opening (anion framework, fast ion
  // diffusion) or while a figure lifts off into the model (interwoven battery). Otherwise figures sit top left.
  // A page floor that depends on the view (min-height) must transition with height, or the stage jumps.
  if (opening) stage.classList.remove('fits-figure'); else if (figure) stage.classList.add('fits-figure');
  let ghost = ghosts.get(stage);
  if (!ghost) {
    ghost = document.createElement('div'); ghost.className = stage.className; ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: '0', top: '0', width: '1px', transition: 'none', viewTransitionName: 'none'});
    stage.after(ghost); ghosts.set(stage, ghost);
  }
  ghost.className = stage.className;
  const full = ghost.offsetHeight;
  stage.style.setProperty('--stage-full', full + 'px');
  if (!figure) { stage.style.height = ''; settleScroll(); return null; }
  const cs = getComputedStyle(view), px = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), py = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const aspect = figure.w / figure.h, fit = Math.min(stage.clientWidth - px, (full - py) * aspect, figure.w * (figure.cap || 1.6));
  const need = fit / aspect + py, height = need < full * .8 ? Math.max(need, stage.clientWidth > 640 ? full * .5 : 0) : full;
  const now = stage.getBoundingClientRect().height;
  if (Math.abs(now - height) > 1) holdScroll(now - height);
  stage.style.height = height < full ? height + 'px' : '';
  // The height the stage is heading for, so the figure can be sized for where the stage will be, not where it is.
  return height - py;
}

// Near the end of a short page, a shrinking stage would pull the bottom of the page up past the reader, and the
// browser would scroll everything down to make up for it. A little room is added after the page instead, only as
// much as the reader's position needs, and it is given back as they scroll up or the stage reopens.
let room = 0;
const page = document.scrollingElement || document.documentElement;
let spacer = null;
function setRoom(px) {
  room = Math.max(0, Math.round(px));
  if (!spacer) { spacer = document.createElement('div'); spacer.setAttribute('aria-hidden', 'true'); document.body.append(spacer); }
  spacer.style.height = room + 'px';
}
function holdScroll(shrink) {
  const natural = page.scrollHeight - room - Math.max(0, shrink);
  setRoom(Math.max(room, scrollY + innerHeight - natural));
}
function settleScroll() { if (room) setRoom(Math.max(0, scrollY + innerHeight - (page.scrollHeight - room))); }
addEventListener('scroll', () => { if (room) settleScroll(); }, {passive: true});
