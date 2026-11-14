// The homepage's rocksalt card, live: one random rocksalt crystal in which lithium is added site by site. Wherever four
// lithium sites surround a tetrahedron (a 0-TM doorway) a hop is open and drawn as a bond; bonds join into islands, and
// at about 9% lithium excess one island reaches from the left face to the right face: the network crosses.
// Everything drawn is calculated here by the companion's own lattice model (rocksalt-model.mjs: the same lattice, the
// same random draw and the same crossing test along x as rocksalt.html). The crystal is the companion's own default for
// 4 cells (seed 55): the first seed whose network first crosses along x at 8.5 to 9% lithium excess as its slider counts
// it. Most random crystals this small cross later, which the companion's last steps show.
// The pure part (the schedule of what appears when) is exported for the checks; the scene needs a browser.
import {cubicLattice, speciesRandom, analyse} from './rocksalt-model.mjs';

export const CELLS = 4, SEED = 55, X_MAX = .26;

// For each added lithium (state k: nLi = n/2 + k, Li excess x = 2k/n): which sites are lithium, which hops are open,
// and which sites sit on an island that reaches both x faces.
export function schedule(L = CELLS, seed = SEED, xMax = X_MAX) {
  const lat = cubicLattice(L), n = lat.sites.length, K = Math.round(n * xMax / 2), axis = [[1, 0, 0]], lo = 0, hi = 2 * L - 1;
  const at = new Int32Array(n).fill(-1), tetAt = new Int32Array(lat.tets.length).fill(-1), cross = [], linked = [], spans = [];
  for (let k = 0; k <= K; k++) {
    const sp = speciesRandom(lat, 2 * k / n, seed), r = analyse(lat, sp, 0, axis, .5);
    const min = new Map(), max = new Map(), c = new Uint8Array(n), l = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (sp[i] === 0) { if (at[i] < 0) at[i] = k; const root = r.find(i), x = lat.sites[i][0]; if (!min.has(root) || x < min.get(root)) min.set(root, x); if (!max.has(root) || x > max.get(root)) max.set(root, x); }
    for (let i = 0; i < n; i++) if (sp[i] === 0) { const root = r.find(i); l[i] = r.size.get(root) > 1 ? 1 : 0; c[i] = min.get(root) <= lo + .5 && max.get(root) >= hi - .5 ? 1 : 0; }
    lat.tets.forEach((t, ti) => { if (tetAt[ti] < 0 && r.tmCount[ti] === 0) tetAt[ti] = k; });
    cross.push(c); linked.push(l); spans.push(r.spans[0]);
  }
  // A hop is drawn between two lithium sites once a tetrahedron they share has lithium on all four corners.
  const edgeAt = new Map();
  lat.tets.forEach((t, ti) => { if (tetAt[ti] < 0) return; for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) { const key = Math.min(t.v[a], t.v[b]) * n + Math.max(t.v[a], t.v[b]); if (!edgeAt.has(key) || tetAt[ti] < edgeAt.get(key)) edgeAt.set(key, tetAt[ti]); } });
  const edges = [...edgeAt].map(([key, k]) => ({a: Math.floor(key / n), b: key % n, k}));
  return {lat, n, K, at, edges, cross, linked, spans, firstCross: spans.indexOf(true), excess: k => 2 * k / n};
}

const canvas = typeof document === 'undefined' ? null : document.querySelector('#crossing-teaser');
if (canvas) {
  const figure = canvas.closest('figure'), outX = figure.querySelector('#crossing-x'), outState = figure.querySelector('#crossing-state');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), ease = t => t * t * (3 - 2 * t);
  const LOOP = 17000;                                     // ms: lithium arrives, the crossing holds, lithium leaves
  const growth = p => p < .55 ? ease(p / .55) : p < .74 ? 1 : p < .93 ? 1 - ease((p - .74) / .19) : 0;
  let S, scene, visible = false, frame = 0, last = 0, clock = 0, shown = '';

  function build() {
    const T = window.THREE; if (!T) throw new Error('no 3D library');
    const {createRenderer} = S.kit, m = S.model, n = m.n, half = (2 * CELLS - 1) / 2;
    const renderer = createRenderer(T, canvas, {exposure: 1});
    const world = new T.Scene(), camera = new T.PerspectiveCamera(24, 1.28, .1, 200), crystal = new T.Group(); world.add(crystal);
    world.fog = new T.Fog(0x131b28, 30, 50);
    world.add(new T.HemisphereLight(0xe4ecff, 0x161a2a, .62));
    const key = new T.DirectionalLight(0xffffff, .95); key.position.set(-6, 9, 12); world.add(key);
    const rim = new T.DirectionalLight(0x9db4ff, .4); rim.position.set(8, -3, -10); world.add(rim);
    const pos = m.lat.sites.map(([i, j, k]) => new T.Vector3(i - half, j - half, k - half));
    const sites = new T.InstancedMesh(new T.SphereGeometry(.5, 24, 18), new T.MeshStandardMaterial({roughness: .5, metalness: 0}), n);
    const bonds = new T.InstancedMesh(new T.CylinderGeometry(.5, .5, 1, 12, 1, true), new T.MeshStandardMaterial({roughness: .5, metalness: 0}), m.edges.length);
    sites.instanceMatrix.setUsage(T.DynamicDrawUsage); bonds.instanceMatrix.setUsage(T.DynamicDrawUsage); crystal.add(sites, bonds);
    // The two faces the network has to join: a quiet frame on each, lit when it does.
    const faces = [-1, 1].map(s => { const h = half + .55, g = new T.BufferGeometry().setFromPoints([[-h, -h], [h, -h], [h, h], [-h, h]].map(([y, z]) => new T.Vector3(s * (half + .75), y, z))); const f = new T.LineLoop(g, new T.LineBasicMaterial({color: 0x9fb2e8, transparent: true, opacity: .2, fog: false})); crystal.add(f); return f; });
    // Colours are converted to linear light once, as on the companion: Figure 1's lithium green and metal violet
    const lin = hex => new T.Color(hex).convertSRGBToLinear();
    const C = {tm: lin(0x7c4fb0), li: lin(0x3d7550), net: lin(0x5fc152), cross: lin(0x9df277), faceOff: new T.Color(0x9fb2e8), faceOn: new T.Color(0xc4f7a8)};
    const mat = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), v = new T.Vector3(), sc = new T.Vector3(), col = new T.Color(), mid = new T.Vector3();
    const isLi = new Float32Array(n), inNet = new Float32Array(n), onCross = new Float32Array(n), dirs = m.edges.map(e => v.copy(pos[e.b]).sub(pos[e.a]).normalize().clone());
    let lit = 0;
    function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.set(0, -.45, h / w > .9 ? 43 : 37.5); camera.updateProjectionMatrix(); }
    new ResizeObserver(resize).observe(canvas); resize();
    // kf: how many lithium have been added, as a real number; dt in ms (0 settles at once)
    function draw(kf, dt, turn) {
      const k = Math.min(m.K, Math.floor(kf)), cross = m.cross[k], linked = m.linked[k], rate = dt ? 1 - Math.exp(-dt / 220) : 1;
      for (let i = 0; i < n; i++) {
        const li = m.at[i] === 0 ? 1 : ease(clamp(kf - m.at[i] + 1));
        isLi[i] = li; inNet[i] += ((li > .5 && linked[i] ? 1 : 0) - inNet[i]) * rate; onCross[i] += ((li > .5 && cross[i] ? 1 : 0) - onCross[i]) * rate;
        const s = .2 + .16 * li + .2 * inNet[i] + .12 * onCross[i];   // a metal is a dot; lithium counts once it is on an island
        mat.compose(pos[i], q.identity(), sc.setScalar(s)); sites.setMatrixAt(i, mat);
        col.copy(C.tm).lerp(C.li, li).lerp(C.net, inNet[i]).lerp(C.cross, onCross[i]); sites.setColorAt(i, col);
      }
      m.edges.forEach((e, j) => {
        const open = ease(clamp(kf - e.k + .2)), c = Math.min(onCross[e.a], onCross[e.b]), len = Math.SQRT2 * open, r = open ? .11 + .07 * c : 0;
        mid.copy(pos[e.a]).addScaledVector(dirs[j], len / 2); q.setFromUnitVectors(up, dirs[j]);
        mat.compose(mid, q, sc.set(r, Math.max(len, 1e-4), r)); bonds.setMatrixAt(j, mat);
        col.copy(C.net).lerp(C.cross, c); bonds.setColorAt(j, col);
      });
      sites.instanceMatrix.needsUpdate = bonds.instanceMatrix.needsUpdate = true; sites.instanceColor.needsUpdate = bonds.instanceColor.needsUpdate = true;
      lit += ((m.spans[k] ? 1 : 0) - lit) * rate;
      for (const f of faces) { f.material.opacity = .2 + .65 * lit; f.material.color.copy(C.faceOff).lerp(C.faceOn, lit); }
      crystal.rotation.set(.34, -.5 + .24 * Math.sin(turn), 0);
      renderer.render(world, camera);
      const text = `${Math.round(m.excess(k) * 100)}|${m.spans[k] ? 1 : 0}`;
      if (text !== shown) { shown = text; if (outX) outX.textContent = `${Math.round(m.excess(k) * 100)}%`; if (outState) outState.textContent = m.spans[k] ? 'the network crosses' : 'islands, no way across'; }
    }
    return {draw};
  }
  // At rest (reduced motion, or before the first frame): the crystal a little past its first crossing.
  const restAt = () => S.model.firstCross + 4;
  function tick(t) {
    frame = 0; if (!scene || !visible) return;
    const dt = last ? Math.min(60, t - last) : 16; last = t;
    if (reduced.matches) { scene.draw(restAt(), 0, 0); return; }
    clock = (clock + dt) % LOOP;
    scene.draw(growth(clock / LOOP) * S.model.K, dt, clock / LOOP * 2 * Math.PI);
    frame = requestAnimationFrame(tick);
  }
  async function begin() {
    if (!scene) {
      try { S = S || {model: schedule(), kit: await import('./kit/renderer.mjs')}; scene = build(); figure.classList.add('crossing-live'); }
      catch { figure.classList.add('crossing-failed'); return; }
    }
    last = 0; if (!frame && visible) frame = requestAnimationFrame(tick);
  }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) begin(); else if (frame) { cancelAnimationFrame(frame); frame = 0; } }, {rootMargin: '120px'}).observe(canvas);
  reduced.addEventListener('change', () => { if (visible) begin(); });
}
