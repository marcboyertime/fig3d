// Layout v2: one screen is the instrument (design/layout-overhaul/spec.md; approved by Marcky on 17 October 2026, with
// scroll sections for decision 6). The paper's figure, then the current step's claim, words and one control share the
// left column; the model is pinned in the right. The steps are sections that scroll up under the pinned figure;
// `steps=rail` in the address shows the alternative, one step at a time with Back, Next and the arrow keys.
//
// A page passes its steps (a <template>), its chapters and an adapter for its model, its opening and its masthead. Every
// v2 control drives one of the page's own controls and copies its state, so the page keeps one code path for its model,
// its figure outline and its readouts:
//   data-check="sel"   a chip that clicks a checkbox and shows its checked state
//   data-click="sel"   a button that clicks a page control and shows its aria-pressed state (.v2-play: playing or not)
//   .v2-slider[data-range="sel"]  a range that sets a page range; [data-set] presets; output via data-out="sel" (copy
//                      that element's text) or data-fmt="name" (the adapter's fmt[name](value))
// Options: template, sections, chapters, reduced, bar, brand, back, title, kickerInto, credit, explorer, stage, paper, input,
// key (the stage's legend, folded behind a Key button), hint (the stage's hint, gone at the first touch), shifted() (the
// stage's picture and its labels: drawn in the part of the stage on screen, and scaled when a phone's stage folds),
// opening, goModel(k), after(fn), onModel(k, body), more(k, body), hash, fmt, figure (the box in the paper column that folds;
// by default its figure viewport, chart or views; null for none).
// The model follows the step crossing the reading line until the reader touches the stage; after that the step being read
// offers "Go to this view", which brings the model there and follows again. A control pressed in any step takes effect at
// once and brings the model to that step first.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const layoutV2 = () => document.documentElement.classList.contains('layout-v2');

export function createLayoutV2(o) {
  const H = document.documentElement, S = o.sections, CH = o.chapters, T = o.template.content, reduced = !!o.reduced;
  const v = {rail: H.classList.contains('steps-rail'), secs: [], ctls: [], slots: [], cur: -1, model: -1, follow: true, phone: false,
    timer: 0, cand: -1, candT: 0, readTop: 0, jump: -1, jumpT: 0, shift: 0, vis: 0, freeze: 0, opening: false, mast: 56, pin: 120, fold: 0};
  const opening = o.opening || {on: () => false, flying: () => false, end() {}};
  const after = o.after || (fn => fn());

  // ---- Build: masthead, kicker, the steps in the left column, the dock (phones), the stage's chip and key button ----
  const bar = o.bar; bar.classList.add('v2-bar'); o.brand.classList.add('v2-brand');
  if (o.back) { o.back.textContent = 'The collection'; o.back.classList.add('v2-back'); }
  if (o.title) { const t = document.createElement('span'); t.className = 'v2-title'; t.textContent = o.title; o.brand.after(t); }
  const back = o.back || null;
  bar.insertBefore(T.querySelector('.v2-rail'), back); bar.insertBefore(T.querySelector('.v2-phonebar'), back);
  document.body.append(T.querySelector('.v2-chapters'));
  const kicker = T.querySelector('.v2-kicker'); if (kicker && o.kickerInto) o.kickerInto.prepend(kicker);
  if (o.credit) { const c = document.createElement('div'); c.className = 'v2-figcredit'; c.append(...o.credit.nodes.filter(Boolean)); o.credit.into.prepend(c); }
  const ex = o.explorer; ex.append(T.querySelector('.v2-steps'), T.querySelector('.v2-dock'));
  o.stage.classList.add('v2-stage'); o.stage.append(T.querySelector('.v2-stagechip'));
  if (o.key) {   // phones: the stage's key folds behind a button (ui-tl, so labels that avoid the stage's chips keep clear)
    o.key.classList.add('v2-key');
    const kb = document.createElement('button'); kb.type = 'button'; kb.className = 'v2-keybtn ui-tl'; kb.textContent = 'Key';
    kb.setAttribute('aria-expanded', 'false'); if (o.key.id) kb.setAttribute('aria-controls', o.key.id); o.stage.append(kb); v.kb = kb;
    kb.addEventListener('click', () => { const on = !o.stage.classList.contains('v2-key-on'); o.stage.classList.toggle('v2-key-on', on); kb.setAttribute('aria-expanded', String(on)); });
  }
  v.secs = $$('.v2-step', ex); v.ctls = v.secs.map(el => el.querySelector('.v2-ctl')); v.slots = v.secs.map(el => el.querySelector('.v2-ctl-slot'));
  // The steps are divided by a hairline; the first step of each chapter names its chapter there (layout-v2.css)
  v.secs.forEach((el, k) => el.classList.toggle('v2-chstart', !k || S[k].ch !== S[k - 1].ch));
  const stepsEl = $('.v2-steps', ex);
  // The quiet pass: a step's limits and its source line live behind "More on this step" (the source first, then the limit)
  for (const el of v.secs) { const body = el.querySelector('.v2-more-body'); for (const q of ['.v2-foot .v2-src', '.v2-limit']) { const n = el.querySelector(q); if (n && body) body.append(n); } }
  if (o.hint) { o.hint.classList.add('v2-hint'); v.hintText = o.hint.textContent; o.input.addEventListener('pointerdown', () => o.stage.classList.add('v2-touched')); }
  v.secs.forEach((el, k) => wire(el, k));
  $$('.v2-rail a, .v2-chapters a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); menu(false); jumpTo(idx(a.getAttribute('href').slice(1))); }));
  $('.v2-chbtn').addEventListener('click', () => menu($('.v2-chapters').hidden));
  $('.v2-stagechip button').addEventListener('click', () => { v.follow = true; model(v.cur); });
  $('.v2-prev').addEventListener('click', () => go(v.cur - 1)); $('.v2-next').addEventListener('click', () => go(v.cur + 1));
  addEventListener('keydown', e => {
    if (!v.rail || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return; const t = e.target;
    if (t.closest && t.closest('input,select,textarea,[contenteditable]')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(v.cur + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(v.cur - 1); }
  });
  // Touching the stage (a drag, a click on the model, a zoom, a key that turns it) hands the model to the reader: it stops
  // following the scroll. A press counts when it is released; a touch the browser takes for scrolling the page (pointercancel),
  // or one that moved mostly up or down, is page scrolling, not a touch on the model (silicon's opening uses the same rule).
  let press = null;
  o.input.addEventListener('pointerdown', e => { if (!v.rail) press = {id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch'}; });
  addEventListener('pointercancel', e => { if (press?.id === e.pointerId) press = null; }, true);
  addEventListener('pointerup', e => {
    const p = press; if (p?.id !== e.pointerId) return; press = null; const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!(p.touch && Math.abs(dy) >= 10 && Math.abs(dy) >= Math.abs(dx))) v.follow = false;
  }, true);
  o.input.addEventListener('wheel', e => { if ((e.ctrlKey || e.metaKey) && !v.rail) v.follow = false; }, {passive: true});
  o.input.addEventListener('keydown', e => { if (!v.rail && !e.metaKey && !e.ctrlKey && !e.altKey && /^(Arrow|[+=-]$)/.test(e.key)) v.follow = false; });
  // ---- The figure folds as the reader reaches the steps, and the steps move only with the scroll (18 October 2026: "as we
  // do the initial scroll down the figure from the paper should shrink a bit"; "whole thing needs to be extremely smooth") ----
  // Once the figure is pinned, its bottom edge follows the first step up until the figure is compact (30% of the screen under
  // the masthead, or its own height if it is shorter): the words rise to the middle of the screen at the speed of the scroll
  // and the figure is smaller, never cropped, while the reader is among the steps. It is scaled from its top left corner,
  // so the page's own figure code (sizes, zoom, outlines, crossfades) is untouched; a zoomed-in figure unfolds again.
  // The figure's row keeps one height while the reader is among the steps, whatever the figure does (another figure, the
  // fold, a zoom), so nothing under it is pushed: the steps move with the scroll and nothing else. Before the steps, the row
  // follows the figure; coming back up, any difference eases out over the fold. Phones do not fold; their row holds the same way.
  const F = {el: o.figure !== undefined ? o.figure : o.paper.querySelector('.v2-pviewport, .paper-viewport, .v2-chartbox, .v2-dfigs'),
    R: null, e: 0, u: null, cs: null, m: 0, pmb: 0, mb: 0, tf: '', fmb: '', sc: 1, rest: 0, ct: 0, ready: false};
  if (F.el) F.mb = parseFloat(getComputedStyle(F.el).marginBottom) || 0;
  const compact = () => Math.max(180, Math.round((innerHeight - v.mast) * .3));
  function fold() {
    const P = o.paper, el = F.el;
    if (v.rail) { if (F.ready) { if (el) { el.style.transform = el.style.transformOrigin = el.style.marginBottom = ''; } P.style.marginBottom = ''; F.ready = false; F.R = null; F.m = 0; F.sc = 1; F.tf = F.fmb = ''; } return; }
    // heights to the fraction of a pixel, so the row's height holds exactly and the words never flicker by a pixel
    const ph0 = P.getBoundingClientRect().height, flow = ph0 + F.pmb + F.m;
    const u = v.phone ? v.mast - (P.getBoundingClientRect().top + flow) : v.pin - (stepsEl.getBoundingClientRect().top - flow);
    const hf = el ? el.getBoundingClientRect().height / F.sc : 0, room = Math.min(hf, compact());
    const ct = v.phone || el?.classList.contains('zoomed') ? hf : room;
    F.cs = F.cs == null || Math.abs(ct - F.cs) < .5 ? ct : F.cs + (ct - F.cs) * .2;
    const hd = Math.min(hf, Math.max(hf - Math.max(0, u), F.cs)), sc = hf > 0 ? hd / hf : 1;
    if (el) {
      const tf = sc < .9995 ? `scale(${sc.toFixed(4)})` : '', fmb = tf ? (F.mb - (hf - hd)).toFixed(2) + 'px' : '';
      if (tf !== F.tf) { el.style.transform = tf; el.style.transformOrigin = tf ? '0 0' : ''; F.tf = tf; F.sc = tf ? +sc.toFixed(4) : 1; }
      if (fmb !== F.fmb) { el.style.marginBottom = fmb; F.fmb = fmb; }
    }
    const ph = el ? P.getBoundingClientRect().height : ph0, rest = ph - hd, target = rest + hf, zone = v.phone ? 150 : Math.max(120, hf - F.cs), first = F.R == null;
    if (first || u <= 0) { F.R = target; F.e = 0; }
    else if (u < zone) { const was = Math.min(F.u ?? zone, zone); if (u < was && was > 0) F.e *= Math.max(0, u / was); F.R = target + F.e; }
    else F.e = F.R - target;
    F.u = u; F.rest = Math.round(rest); F.ct = room; F.ready = true;
    const m = F.R - ph - F.pmb;
    if (Math.abs(m - F.m) > .005) {
      const put = () => { F.m = Math.abs(m) < .005 ? 0 : m; P.style.marginBottom = F.m ? (F.pmb + F.m).toFixed(3) + 'px' : ''; };
      if (first && u > 0) keep(put); else put();
    }
  }
  // ---- Phones: the stage folds as the reader reaches the steps (22 October 2026: on a phone too, the step being read
  // starts nearer the middle of the screen) ----
  // Once the stage is pinned, its bottom edge, with the docked control under it, follows the first step up until the stage
  // is compact (--v2-stage-c, layout-v2.css), as the figure folds on desktop; scrolling back up unfolds it. The picture (the
  // page's shifted layers, and anything else as tall as half the stage) is scaled from the stage's top centre, so it is
  // smaller, never cropped, and a picture that fills its frame (nanoparticle's terraces) fades at its new edges instead of
  // ending on a hard line; the stage's own buttons in its lower half ride up with the edge, and its hairline is redrawn
  // there (layout-v2.css). Only a clip, a mask and transforms change, so no canvas is resized and nothing in the page's flow
  // moves: the words still move only with the scroll.
  const SF = {col: o.stage.closest('.stage-column') || o.stage.parentNode, f: 0, R: '', put: new WeakMap(), c: document.createElement('div')};
  SF.c.className = 'v2-stage-c'; SF.c.setAttribute('aria-hidden', 'true'); document.body.append(SF.c);
  const put = (el, k, val) => { let m = SF.put.get(el); if (!m) SF.put.set(el, m = {}); if ((m[k] ?? '') !== val) { m[k] = val; el.style[k] = val; } };
  function stageFold() {
    const st = o.stage, S = st.offsetHeight, d = $('.v2-dock'), shown = !!d.offsetParent, top = shown ? parseFloat(getComputedStyle(d).top) : 0;
    // A stage gliding to another height (fast ion's chart): the dock's pinned place is set by the height the stage glides
    // to, so while the dock rests there it follows the stage's height now instead (it would cover or leave a gap otherwise;
    // that place is the masthead, the stage column's 6 px and the stage's height, layout-v2.css)
    const lag = shown && Math.abs(d.getBoundingClientRect().top - (SF.dt || 0) - top) < 1 ? S - (top - v.mast - 6) : 0;
    // how far the steps have moved under the pinned stage and dock (the dock's bottom once pinned)
    const b0 = shown ? top + lag + d.offsetHeight : v.mast + SF.col.offsetHeight;
    let f = v.fold > 0 && S > 0 ? clamp(b0 - stepsEl.getBoundingClientRect().top, 0, v.fold) : 0;
    if (f < .05) f = 0; const dt = Math.abs(lag - f) < .05 ? 0 : lag - f;
    if (!f && !SF.f && !dt && !SF.dt) return; SF.f = f; SF.dt = dt;
    const s = ((S - f) / S).toFixed(4), up = f ? `0 ${(-f).toFixed(2)}px` : '', drawn = o.shifted().filter(Boolean);
    if (!SF.R) { const cs = getComputedStyle(st); SF.R = cs.borderRadius; st.classList.toggle('v2-ringed', /inset/.test(cs.boxShadow)); }
    put(st, 'clipPath', f ? `inset(0 0 ${f.toFixed(2)}px 0 round ${SF.R})` : ''); put(SF.col, 'clipPath', f ? `inset(0 0 ${f.toFixed(2)}px 0)` : '');
    put(d, 'translate', dt ? `0 ${dt.toFixed(2)}px` : '');
    st.classList.toggle('v2-folded', !!f); st.style.setProperty('--v2-f', f.toFixed(2) + 'px');
    // the soft edge grows with the fold (24 px of the picture's own width at full fold)
    const e = (24 * f / v.fold).toFixed(1) + 'px', mask = f ? `linear-gradient(90deg,transparent,#000 ${e},#000 calc(100% - ${e}),transparent),linear-gradient(#000 calc(100% - ${e}),transparent)` : '';
    for (const el of drawn) if (el.matches('canvas,video')) { put(el, 'maskImage', mask); put(el, 'webkitMaskImage', mask); put(el, 'maskComposite', f ? 'intersect' : ''); put(el, 'webkitMaskComposite', f ? 'source-in' : ''); }
    for (const el of st.children) {
      const pic = el.offsetHeight >= S / 2 || drawn.some(x => el.contains(x));
      put(el, 'scale', f && pic ? s : ''); put(el, 'transformOrigin', f && pic ? `${(st.clientWidth / 2 - el.offsetLeft).toFixed(1)}px ${-el.offsetTop}px` : '');
      put(el, 'translate', f && !pic && el.offsetTop + el.offsetHeight / 2 > S / 2 ? up : '');
    }
  }
  const mq = matchMedia('(max-width:860px)'), onMq = () => {
    v.phone = mq.matches; o.paper.style.marginBottom = ''; F.m = 0; F.R = null; F.pmb = parseFloat(getComputedStyle(o.paper).marginBottom) || 0;
    SF.R = ''; v.colH = undefined; dock(); size(true);
  }; mq.addEventListener('change', onMq); onMq();
  { const ro = new ResizeObserver(() => size(false)); ro.observe(o.paper); ro.observe($('.v2-dock')); ro.observe(o.stage); } addEventListener('resize', () => size(true));
  // A pinned stage that changes height on a phone (fast ion's chart is taller, and its stage glides to it) pushes the steps
  // under it: the step being read keeps its place on the screen through every frame of the glide (this runs after layout,
  // before paint), so its words still move only with the scroll: they move down the page by what the stage grew.
  new ResizeObserver(() => {
    const h = SF.col.getBoundingClientRect().height, d = h - (v.colH ?? h), a = v.secs[v.cur]; v.colH = h;
    if (Math.abs(d) < .01 || !v.phone || v.rail || v.jump >= 0 || !a || SF.col.getBoundingClientRect().top > v.mast + 1) return;
    const r = a.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) scrollBy({top: d, behavior: 'instant'});
  }).observe(SF.col);
  document.fonts?.ready.then(() => size(true));
  addEventListener('scroll', onScroll, {passive: true});
  // Words that change in place never change in one frame (18 October 2026: scrolling never jumps or cuts): the note under
  // the figure, and a step's title and words while an opening carries its beats through them (softWords, below).
  if (!reduced) {
    const n = o.paper.querySelector('.panel-note'); if (n) softWords(n, {out: 320, in: 420, overlap: true});
    for (const el of $$('.v2-step h2, .v2-step .v2-body', ex)) softWords(el, {out: 180, in: 320});
  }
  // A page's opening may land in the shifted stage (see shift below): it reads the shift, and how much of the stage is on
  // screen, when it starts.
  window.Fig3DStageShift = () => v.shift;
  window.Fig3DStageView = () => ({shift: v.shift, height: v.vis});

  function idx(id) { return S.findIndex(s => s.id === id); }
  function wire(el, k) {
    for (const b of $$('[data-check]', el)) b.addEventListener('click', () => act(k, () => $(b.dataset.check)?.click()));
    for (const b of $$('[data-click]', el)) b.addEventListener('click', () => act(k, () => $(b.dataset.click)?.click()));
    for (const s of $$('.v2-slider', el)) {
      const r = s.querySelector('input[type=range]');
      const put = val => act(k, () => { const src = $(s.dataset.range); if (!src) return; src.value = val; src.dispatchEvent(new Event('input', {bubbles: true})); });
      r.addEventListener('pointerdown', () => { r.dataset.drag = '1'; s.classList.add('is-drag'); }); addEventListener('pointerup', () => { delete r.dataset.drag; s.classList.remove('is-drag'); });
      r.addEventListener('input', () => put(r.value));
      for (const p of $$('[data-set]', s)) p.addEventListener('click', () => { r.value = p.dataset.set; put(p.dataset.set); });
    }
    el.querySelector('.v2-go').addEventListener('click', () => { v.follow = true; model(k); });
    const mb = el.querySelector('.v2-morebtn'), body = el.querySelector('.v2-more-body');
    mb.addEventListener('click', () => {
      const open = mb.getAttribute('aria-expanded') !== 'true'; if (open && v.cur !== k) set(k, 'control');
      if (open) o.more?.(k, body);
      mb.setAttribute('aria-expanded', String(open)); body.hidden = !open;
    });
  }
  // A control press always takes effect: if the model is elsewhere it comes to this step first, and the action runs after
  // the page has put it there (a page whose step change is deferred, such as a fade, passes `after`).
  function act(k, fn) {
    if (opening.on()) opening.end();
    const moved = v.model !== k; v.follow = true;
    if (v.cur !== k) set(k, 'control'); else if (moved) model(k);
    if (moved) after(fn); else fn();
  }
  // Keep the step being read where it is while things above it change height (a reader who cannot see it is left alone)
  function keep(fn) {
    const a = v.secs[v.cur] || v.secs[0], t0 = a.getBoundingClientRect().top;
    if (t0 > innerHeight || t0 + a.offsetHeight < 0) { fn(); return; }
    fn(); const d = a.getBoundingClientRect().top - t0; if (!v.rail && Math.abs(d) > .5) scrollBy({top: d, behavior: 'instant'});
  }
  // The step being read
  function set(k, how) {
    if (opening.on() && (how === 'jump' || how === 'control')) opening.end();
    k = clamp(k, 0, S.length - 1); if (k === v.cur && how === 'scroll') return; if (how !== 'load') v.engaged = true;
    // A generic hint ("drag to turn") has done its work once the reader moves on; a step whose hint says something of its
    // own shows it again (frame, when the words change)
    if (o.hint && v.cur >= 0 && k !== v.cur && how !== 'load') o.stage.classList.add('v2-touched');
    keep(() => {
      v.cur = k;
      v.secs.forEach((el, j) => {
        el.classList.toggle('is-current', j === k);
        const mb = el.querySelector('.v2-morebtn'); if (j !== k && mb.getAttribute('aria-expanded') === 'true') { mb.setAttribute('aria-expanded', 'false'); el.querySelector('.v2-more-body').hidden = true; }
      });
      dock();
    });
    rail();
    if (how !== 'scroll' || (v.follow && !opening.on())) model(k); else show();
  }
  // The step the model shows
  function model(k) {
    v.model = k; o.goModel(k);
    keep(() => o.onModel?.(k, v.secs[k].querySelector('.v2-more-body')));
    if (o.hash) try { history.replaceState(null, '', '#' + S[k].id); } catch (e) {}
    show();
  }
  function show() {
    const off = v.cur >= 0 && v.model >= 0 && v.model !== v.cur;
    v.secs.forEach((el, j) => { el.querySelector('.v2-go').hidden = !(off && j === v.cur); });
    const c = $('.v2-stagechip'); c.hidden = !off || opening.on();
    if (off) { c.querySelector('.v2-chip-now').textContent = S[v.model].short; c.querySelector('button').textContent = 'Go to ' + S[v.cur].short; }
  }
  function rail() {
    const k = v.cur, s = S[k], ch = s.ch, inCh = S.filter(x => x.ch === ch), pos = inCh.indexOf(s);
    $$('.v2-rail a').forEach((a, c) => {
      a.classList.toggle('now', c === ch); a.classList.toggle('done', c < ch);
      if (c === ch) { a.style.setProperty('--p', (pos + 1) / inCh.length * 100 + '%'); a.setAttribute('aria-current', 'step'); } else a.removeAttribute('aria-current');
    });
    const pb = $('.v2-phonebar .v2-now'); pb.querySelector('.n').textContent = ch + 1; pb.querySelector('.t').textContent = CH[ch];
    pb.querySelector('.dots').innerHTML = inCh.map((x, j) => `<i class="${j === pos ? 'on' : ''}"></i>`).join('');
    $('.v2-pos').textContent = `${k + 1} / ${S.length}`; $('.v2-prev').disabled = k === 0;
    const nx = $('.v2-next'); nx.disabled = k === S.length - 1; nx.textContent = k < S.length - 1 ? `Next: ${S[k + 1].short} →` : 'Last step';
  }
  function dock() { const d = $('.v2-dock'); v.ctls.forEach((c, j) => { if (!c) return; const want = v.phone && j === v.cur ? d : v.slots[j]; if (c.parentNode !== want) want.append(c); }); }
  // On a phone a docked control is one row with its label (layout-v2.css). Where that is wider than the screen the label
  // steps aside, then the choices take two rows, within the dock's one height; a row that would still not fit scrolls
  // sideways: its edges fade where more is hidden, and the chosen option is brought clear of the fades by the least scroll,
  // at once when the control docks and by a glide when the choice changes.
  function fit(c, d) {
    c.classList.remove('v2-nolabel', 'v2-wrap', 'v2-scroll', 'v2-fade-l', 'v2-fade-r'); c.scrollLeft = 0;
    const wide = () => c.scrollWidth > c.clientWidth + 1;
    if (!wide()) return; c.classList.add('v2-nolabel'); if (!wide()) return; c.classList.add('v2-wrap');
    const cs = getComputedStyle(d), room = parseFloat(cs.minHeight) - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth);
    if (!wide() && c.offsetHeight <= room + .5) return; c.classList.remove('v2-wrap'); c.classList.add('v2-scroll');
  }
  function row() {
    const d = $('.v2-dock'), c = v.phone ? v.ctls[v.cur] : null;
    if (!c || c.parentNode !== d || c.querySelector('.v2-slider')) { v.row = null; return; }
    if (v.row !== c) { fit(c, d); if (!c.classList.contains('v2-scroll')) { v.row = c; return; } }
    if (!c.classList.contains('v2-scroll')) return;
    const p = c.querySelector('[aria-pressed=true]');
    if (v.row !== c || v.rowP !== p) {
      if (p) { const a = p.getBoundingClientRect(), b = c.getBoundingClientRect(), r = a.right - (b.right - 40), l = a.left - (b.left + 40);
        const by = r > 0 ? r : l < 0 && c.scrollLeft > 0 ? l : 0; if (by) c.scrollTo({left: c.scrollLeft + by, behavior: v.row !== c || reduced ? 'instant' : 'smooth'}); }
      v.row = c; v.rowP = p;
    }
    c.classList.toggle('v2-fade-l', c.scrollLeft > 1); c.classList.toggle('v2-fade-r', c.scrollLeft + c.clientWidth < c.scrollWidth - 1);
  }
  function menu(open) { $('.v2-chapters').hidden = !open; $('.v2-chbtn').setAttribute('aria-expanded', String(open)); }
  // Where the reading area starts once the figure (desktop) or the stage and its dock (phone) are pinned. A step is as tall
  // as that area; the height is kept while the reader is among the steps, so a figure of another shape (silicon's figures
  // change between steps) never resizes the steps above the one being read. The window, or anything before the reader
  // reaches the steps, sets it again.
  // (v.engaged: the reader has moved through the steps; until then a figure still loading may set the height again)
  // The reading area starts under the folded figure (fold, above), or on a phone under the folded stage (stageFold).
  function size(all) {
    const mast = v.mast = parseFloat(getComputedStyle(H).getPropertyValue('--v2-mast')) || 56;
    v.pin = parseFloat(getComputedStyle(o.paper).top) || 120;
    if (all) { F.R = null; v.row = null; }   // (a docked row is fitted again, row())
    v.fold = v.phone && !v.rail ? Math.max(0, o.stage.offsetHeight - SF.c.offsetHeight) : 0;
    v.readTop = v.phone ? mast + 6 + o.stage.offsetHeight + $('.v2-dock').offsetHeight - v.fold : v.pin + (F.ready ? F.rest + F.ct : o.paper.offsetHeight);
    if (all || !v.engaged || !v.secs[0] || v.secs[0].getBoundingClientRect().top > innerHeight) {
      const r = Math.max(360, Math.round(innerHeight - v.readTop)) + 'px'; if (H.style.getPropertyValue('--v2-read') !== r) H.style.setProperty('--v2-read', r);
    }
  }
  function line() { const top = Math.max(v.readTop, v.phone ? 0 : o.paper.getBoundingClientRect().bottom); return top + (innerHeight - top) * .3; }
  function probe() { const y = line(); let k = 0; v.secs.forEach((el, j) => { if (el.getBoundingClientRect().top <= y) k = j; }); return k; }
  // Scroll sections: a step becomes current once it has held the reading line for 160 ms, so fast scrolling lands on one
  // state; while a jump glides, the steps it passes do not take over
  function onScroll() {
    if (v.rail) return;
    if (v.jump >= 0) { clearTimeout(v.jumpT); v.jumpT = setTimeout(() => { const k = v.jump; v.jump = -1; settle(k); onScroll(); }, 180); return; }
    const k = probe(), now = performance.now(); if (k !== v.cand) { v.cand = k; v.candT = now; }
    clearTimeout(v.timer); if (v.cand === v.cur) return;
    if (now - v.candT >= 160) set(v.cand, 'scroll'); else v.timer = setTimeout(onScroll, 170);
  }
  function jumpTo(k, instant) { if (k < 0) return; set(k, 'jump'); size(false); reveal(k, instant); }
  // A glide aims at where the step was when it began; if things above it changed height on the way (a phone's docked
  // control, a figure of another shape above the stage), it ends by settling exactly on the step
  function settle(k) {
    if (v.rail || k < 0) return; size(false); const top = v.secs[k].getBoundingClientRect().top;
    if (Math.abs(top - (v.readTop + 2)) > 8) scrollTo({top: top + scrollY - v.readTop + 2, behavior: 'instant'});
  }
  // Bring a step to the top of the reading area: scroll sections always; the step rail only when the step would otherwise
  // start under the pinned figure or low on the screen
  function reveal(k, instant) {
    const top = v.secs[k].getBoundingClientRect().top; if (v.rail && top >= v.readTop - 4 && top < innerHeight * .6) return;
    v.jump = k; clearTimeout(v.jumpT); v.jumpT = setTimeout(() => { v.jump = -1; }, instant || reduced ? 60 : 1500);
    scrollTo({top: top + scrollY - v.readTop + 2, behavior: instant || reduced ? 'instant' : 'smooth'});
  }
  function go(k) { if (k < 0 || k >= S.length) return; set(k, 'jump'); size(false); reveal(k); }
  // While the stage is only partly on screen (the first screen, under the cover), the model and its labels are drawn in the
  // middle of the part that shows; the shift eases to none as the stage pins, and holds while an opening flies
  function shift() {
    const r = o.stage.getBoundingClientRect(), mast = v.phone ? 52 : 56, top = Math.max(r.top, mast), bot = Math.min(r.bottom, innerHeight);
    v.vis = bot - top > 120 ? bot - top : 0;
    let d = bot > top && bot - top < r.height - 1 ? clamp(r.top + r.height / 2 - (top + bot) / 2, -(r.height / 2 - 90), r.height / 2 - 90) : 0;
    if (opening.flying()) d = v.freeze; else v.freeze = d;
    if (Math.abs(d - v.shift) < .5) return; v.shift = d;
    const tf = Math.abs(d) < .5 ? '' : `translateY(${(-d).toFixed(1)}px)`; for (const el of o.shifted()) if (el) el.style.transform = tf;
  }
  // Every frame: the drawing shift, the end of an opening (the model joins the step being read), and the v2 controls copy
  // the state of the page's own controls, so a pressed button is always the true one
  function frame() {
    fold(); stageFold(); shift(); row();
    // A step whose key names nothing (fast ion's chart, interwoven's first two chapters) has no Key button: it fades out
    // instead of opening nothing
    if (v.kb) { const empty = !o.key.textContent.trim(); if (empty !== v.kb.classList.contains('v2-keyempty')) {
      v.kb.classList.toggle('v2-keyempty', empty); if (empty) { o.stage.classList.remove('v2-key-on'); v.kb.setAttribute('aria-expanded', 'false'); } } }
    // A hint that changes its words (a step with something to click) shows again until the next touch
    if (o.hint) { const t = o.hint.textContent; if (t !== v.hintText) { v.hintText = t; o.stage.classList.remove('v2-touched'); } }
    // An opening's end puts the model on the step being read, even the same one: a page whose opening ends elsewhere
    // (fast ion's ends on the event; its first step is the sites) comes back to the step
    const on = opening.on(); if (v.opening && !on) { if (v.follow) model(v.cur); else show(); } v.opening = on;
    for (const c of v.ctls) {
      if (!c) continue;
      for (const b of c.querySelectorAll('[data-check]')) { const s = $(b.dataset.check); if (s) { const val = String(s.checked); if (b.getAttribute('aria-pressed') !== val) b.setAttribute('aria-pressed', val); } }
      for (const b of c.querySelectorAll('[data-click]:not(.v2-play)')) { const s = $(b.dataset.click); if (s) { const val = String(s.getAttribute('aria-pressed') === 'true'); if (b.getAttribute('aria-pressed') !== val) b.setAttribute('aria-pressed', val); } }
      for (const p of c.querySelectorAll('.v2-play')) {
        const s = $(p.dataset.click), lab = s ? (s.getAttribute('aria-label') || s.textContent || '').trim() : '';
        const playing = !!s && (s.getAttribute('aria-pressed') === 'true' || /^pause/i.test(lab));
        p.classList.toggle('playing', playing); p.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      }
      for (const s of c.querySelectorAll('.v2-slider')) {
        const src = $(s.dataset.range), r = s.querySelector('input[type=range]'); if (!src) continue;
        if (!r.dataset.drag && r.value !== src.value) r.value = src.value;
        r.style.setProperty('--f', (r.value - r.min) / (r.max - r.min) * 100 + '%');
        const out = s.querySelector('output');
        if (out) { const t = s.dataset.out ? ($(s.dataset.out)?.textContent || '') : o.fmt?.[s.dataset.fmt]?.(+src.value) ?? src.value; if (out.innerHTML !== t) out.innerHTML = t; }
        for (const p of s.querySelectorAll('[data-set]')) {
          const x = +src.value, val = String(p.dataset.lo != null ? x >= +p.dataset.lo && x <= +p.dataset.hi : Math.abs(x - +p.dataset.set) < .26);
          if (p.getAttribute('aria-pressed') !== val) p.setAttribute('aria-pressed', val);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  // Start on the linked step (or the first); a link lands on its step once the page's font is in
  function start(k, linked) {
    k = Math.max(0, k); v.opening = opening.on(); set(k, 'load');
    // The page has been rebuilt: it may now appear (layout-v2.css keeps it on its background until then)
    document.documentElement.classList.add('v2-ready');
    if (linked) Promise.race([document.fonts?.ready, new Promise(r => setTimeout(r, 1000))]).then(() => requestAnimationFrame(() => { size(true); jumpTo(k, true); }));
    requestAnimationFrame(frame);
  }
  return {
    start, jumpTo, idx,
    get cur() { return v.cur; }, get model() { return v.model; }, get shift() { return v.shift; },
    set freeze(d) { v.freeze = d; },
  };
}

// A block whose words are replaced in place fades them across: a copy of the old words, laid over where they stood,
// fades out while the new ones fade in, together (overlap, for a one-line note) or one after the other (a title or a
// paragraph, so two texts are never read over each other). The copy is hidden from assistive technology.
function softWords(n, {out, in: inMs, overlap = false}) {
  let last = n.innerHTML;
  new MutationObserver(() => {
    const now = n.innerHTML; if (now === last) return; const was = last; last = now;
    if (was.trim() && n.offsetParent) {
      const g = n.cloneNode(); g.removeAttribute('id'); g.removeAttribute('aria-live'); g.setAttribute('aria-hidden', 'true'); g.innerHTML = was; g.classList.add('v2-words-ghost');
      Object.assign(g.style, {position: 'absolute', left: n.offsetLeft + 'px', top: n.offsetTop + 'px', width: n.offsetWidth + 'px', margin: 0, pointerEvents: 'none'}); n.after(g);
      g.animate([{opacity: +getComputedStyle(n).opacity || 1}, {opacity: 0}], {duration: out, easing: 'ease-in-out', fill: 'forwards'}).finished.then(() => g.remove(), () => g.remove());
    }
    if (now.trim()) n.animate([{opacity: 0}, {opacity: 1}], {duration: inMs, delay: overlap || !was.trim() ? 0 : out * .8, easing: 'ease-in-out', fill: 'backwards'});
  }).observe(n, {childList: true, characterData: true, subtree: true});
}
