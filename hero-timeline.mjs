// The homepage hero's storyboard: timed beats, their captions and every animation channel.
// Pure and DOM-free so the pacing can be checked in Node (see hop-verification.mjs).
// Times are seconds of viewing time; nothing here is a physical timescale.

export const clamp = x => Math.max(0, Math.min(1, x));
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeInOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const easeOut = x => 1 - (1 - clamp(x)) ** 3;
export const easeIn = x => clamp(x) ** 3;
const span = (t, a, b, f = easeInOut) => f((t - a) / (b - a));
// Rises over [a,b], holds, then falls over [c,d].
const window4 = (t, a, b, c, d) => Math.min(span(t, a, b), 1 - span(t, c, d));

// A caption stays up at least half a second longer than reading it at 15 characters per second
// (a comfortable subtitle pace while also watching motion), and never less than 2.8 s.
export const readingTime = text => Math.max(2.8, text.length / 15 + .5);

export const BEATS = [
 {id: 'paper', start: 0, kicker: 'Figure 1 · Hau et al., Adv. Mater. 2025', caption: 'Figure 1 maps lithium pathways in three structures'},
 {id: 'focus', start: 4.0, kicker: 'Figure 1 · Hau et al., Adv. Mater. 2025', caption: 'Zoom into one hop, sketched in 2D'},
 {id: 'lift', start: 7.0, kicker: 'One lithium hop · ideal 1-TM geometry', caption: 'The same sites, lifted into 3D'},
 {id: 'oxygen', start: 10.0, kicker: 'One lithium hop · ideal 1-TM geometry', caption: 'Oxygen atoms surround every site'},
 {id: 'depart', start: 12.9, kicker: 'One lithium hop · ideal 1-TM geometry', caption: 'Lithium squeezes through a triangle of oxygen'},
 {id: 'tetra', start: 16.7, kicker: 'One lithium hop · ideal 1-TM geometry', caption: 'Halfway, it passes a tetrahedral site beside one transition metal'},
 {id: 'arrive', start: 21.6, kicker: 'One lithium hop · ideal 1-TM geometry', caption: 'It exits into the vacant octahedral site'},
 {id: 'explore', start: 25.8, kicker: 'One lithium hop · ideal 1-TM geometry', caption: 'Drag to rotate, or select an atom to look closer'},
];
export const DURATION = BEATS[BEATS.length - 1].start;
BEATS.forEach((b, i) => b.end = BEATS[i + 1]?.start ?? Infinity);
export const beatAt = t => { let b = BEATS[0]; for (const x of BEATS) if (t >= x.start) b = x; return b; };
export const beatIndex = id => BEATS.findIndex(b => b.id === id);
const at = id => BEATS[beatIndex(id)].start;

// The spatial view becomes explorable once the model has settled.
export const INTERACTIVE_AT = at('oxygen') - .2;
// Play from here to repeat only the hop.
export const HOP_REPLAY_AT = at('depart');
// Early input hands the story to the reader here: the scene is fully built and lithium still rests at A.
export const HANDOVER_AT = at('depart') - .05;

// Normalized path position s along A→T→B (0.5 is the tetrahedral site; 1/3 and 2/3 are the two
// oxygen faces). Keyframes pause at T and slow through each face; a monotone cubic joins them.
const HOP_KEYS = [
 [at('depart'), 0], [at('depart') + .45, 0], [at('depart') + 1.9, .25], [at('depart') + 3.0, .39], [at('tetra') + .1, .5],
 [at('arrive') + .35, .5], [at('arrive') + 1.3, .61], [at('arrive') + 2.3, .72], [at('arrive') + 3.4, 1], [DURATION, 1],
];
function monotone(keys) {
 const n = keys.length, x = keys.map(k => k[0]), y = keys.map(k => k[1]), d = [], m = [];
 for (let k = 0; k < n - 1; k++) d[k] = (y[k + 1] - y[k]) / (x[k + 1] - x[k]);
 m[0] = d[0]; m[n - 1] = d[n - 2];
 for (let k = 1; k < n - 1; k++) m[k] = d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2;
 for (let k = 0; k < n - 1; k++) {
  if (d[k] === 0) { m[k] = m[k + 1] = 0; continue; }
  const a = m[k] / d[k], b = m[k + 1] / d[k], h = a * a + b * b;
  if (h > 9) { const tau = 3 / Math.sqrt(h); m[k] = tau * a * d[k]; m[k + 1] = tau * b * d[k]; }
 }
 return t => {
  if (t <= x[0]) return y[0];
  if (t >= x[n - 1]) return y[n - 1];
  let k = 0; while (t > x[k + 1]) k++;
  const h = x[k + 1] - x[k], u = (t - x[k]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y[k] + (u3 - 2 * u2 + u) * h * m[k] + (-2 * u3 + 3 * u2) * y[k + 1] + (u3 - u2) * h * m[k + 1];
 };
}
export const hopAt = monotone(HOP_KEYS);
// The first time the path reaches s (used by checks and captions).
export function hopTime(s) { let a = HOP_KEYS[0][0], b = DURATION; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; hopAt(m) < s ? a = m : b = m; } return (a + b) / 2; }

// ---------- Inspection ----------
// The renderer lights and rings exactly what these say, and each inspect caption names exactly that.
// Dashed rings around A (the site lithium left) and B (its destination), as functions of the path position s.
export const siteRings = s => ({a: smooth((s - .04) / .16), b: 1 - smooth((s - .86) / .11)});
// An oxygen is drawn full red when it surrounds T, when "O" is selected, or when "Li⁺" is selected and it is a
// neighbour of the octahedral site lithium is nearer. `o` carries {tetra, shellA, shellB}.
export const oxygenLit = (o, selection, s) => o.tetra || selection === 'oxygen' || selection === 'li' && (s < .5 ? o.shellA : o.shellB);
// What the renderer draws is the graded form (0..1): with "Li⁺" selected the lit shell hands over from A to B while
// lithium closes on T (path .4 to .5) rather than in one frame. It equals oxygenLit at both endpoints and from T on.
export const shellB = s => smooth((s - .4) / .1);
export const oxygenShare = (o, selection, s) => o.tetra || selection === 'oxygen' ? 1 : selection === 'li' ? Math.min(1, (o.shellA ? 1 - shellB(s) : 0) + (o.shellB ? shellB(s) : 0)) : 0;
// While Play again sets lithium back at A unseen, whatever follows its path position (the A and B rings, the
// destination's label, the lit shell, the occupied octahedron) cross-fades from one end to the other over time
// (`swap` = {from, to, k}) instead of following that hidden position through steps as narrow as siteRings', which pop.
export const across = (f, c) => c.swap ? f(c.swap.from) * (1 - c.swap.k) + f(c.swap.to) * c.swap.k : f(c.hop);
// How strongly a selection is drawn on the model: it builds with the coordination edges, so a selection made while the
// paper figure still shows never draws ideal geometry over it, and `focus` (hero.js) eases it in and out.
export const emphasis = (selection, key, c) => selection === key ? (c.focus ?? 1) * c.edges : 0;
// The tetrahedron's glass faces (entry a, exit b, c and the TM face d) and the dotted T–TM link `tm`, as opacities.
// `win` is how brightly lithium lights each window as it crosses.
export function glass(selection, c, win = [0, 0]) {
 const o = emphasis(selection, 'oxygen', c), tm = Math.max(c.tm, emphasis(selection, 'tm', c)), base = .055 * c.edges + .05 * o;
 return {a: base + .3 * win[0] + .1 * o, b: base + .3 * win[1] + .1 * o, c: base, d: base + .2 * tm, tm};
}
const list = items => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0];
export const INSPECT = {
 li: () => 'Li⁺ moves between two octahedral sites. Each has six oxygen neighbors.',
 oxygen: () => 'Ten oxygen atoms form the two octahedra. Four surround the tetrahedral site; three form each triangular window.',
 tm: () => 'One transition-metal ion shares a face with the tetrahedral site. That count of one is the “1-TM” in the figure.',
 // Kept to two lines on desktop and three on phones (hero.js reserves the tallest), so the three-site list drops the last sentence.
 sites: s => {
  const r = siteRings(s), items = [r.a > .5 && 'lithium’s start', r.b > .5 && (r.a > .5 ? 'its destination' : 'the destination'), 'a second vacancy'].filter(Boolean);
  return `Dashed rings are empty octahedral sites: ${list(items)}.${items.length < 3 ? ' The small ring is the tetrahedral site.' : ''}`;
 },
};

// A connector draws on from its word, holds, then fades (it never un-draws backwards).
function connector(t, drawFrom, drawTo, fadeFrom = Infinity, fadeTo = Infinity) {
 return {draw: span(t, drawFrom, drawTo), fade: t < fadeFrom ? 1 : 1 - span(t, fadeFrom, fadeTo, smooth)};
}

// Every channel is in [0,1]. `p` is the normalized scrub position used by the range input.
export function sequence(p) {
 const t = clamp(p) * DURATION, s = hopAt(t);
 const lift = at('lift'), oxygen = at('oxygen'), tetra = at('tetra'), arrive = at('arrive');
 return {
  t, p: clamp(p), beat: beatAt(t).id, hop: s,
  // Paper: fade in, hold the whole figure, spotlight the 1-TM glyph, then let the rest fall away while zooming in.
  intro: span(t, 0, .45, easeOut),
  spot: span(t, at('focus') + .1, at('focus') + .8),
  zoom: span(t, at('focus') + .9, lift - .1),
  // The dimmed page stays faintly around the glyph while zooming (a camera move, not a cut), then clears.
  ghost: 1 - span(t, lift - .55, lift - .05),
  // Takeover: the zoomed glyph becomes a card in the 3D scene and spheres settle onto its printed atoms.
  // The card then lays back and fades while the atoms rise out of it into the ideal geometry.
  paper: t < lift + .1 ? 1 : 0,
  card: t < lift ? 0 : 1 - span(t, lift + .95, lift + 1.9, smooth),
  tilt: span(t, lift + .3, lift + 1.85),
  atoms: span(t, lift + .05, lift + .4, easeOut),
  unfold: span(t, lift + .4, lift + 2.6),
  // A wider lens while the card lays back gives it real perspective; back to the flat look before oxygen.
  lens: 1 - span(t, lift + 1.7, lift + 2.85),
  // Four tetrahedral oxygens, then the octahedral context and the coordination edges.
  oxygen: span(t, oxygen, oxygen + 1.1, easeOut),
  context: span(t, oxygen + .5, oxygen + 1.6, easeOut),
  edges: span(t, oxygen + .3, oxygen + 1.6),
  labels: span(t, oxygen + 1.3, oxygen + 2.0),
  // The route appears while the atoms settle: the printed hop arrow, now a path through space.
  route: span(t, lift + 1.2, lift + 2.6),
  // One transition metal shares a face with the tetrahedral site while lithium waits there.
  tm: window4(t, tetra + .6, tetra + 1.3, arrive - .2, arrive + .5),
  // A slow, finite drift adds parallax; it stops when the story ends (never an endless spin).
  drift: span(t, lift + .7, DURATION, clamp),
  figureConnector: connector(t, .7, 2.0, lift, lift + .3),
  // Each word keeps its arrow only while it introduces its picture; the hop itself plays uncluttered.
  modelConnector: connector(t, oxygen - 1.1, oxygen + .2, at('depart') + .2, at('depart') + .7),
  interactive: t >= INTERACTIVE_AT,
 };
}
