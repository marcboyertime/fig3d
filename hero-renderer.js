// Three.js scene for the homepage lithium hop. Coordinates come from hop-model.mjs (units of a/2),
// timing from hero-timeline.mjs. The renderer owns every 3D object; hero.js drives it with channels.
import {A, B, C, D, T as TSITE, tetraO, octO, hopPosition} from './hop-model.mjs';
import {createRenderer} from './kit/renderer.mjs';
import {siteRings, oxygenShare, shellB, across, emphasis, glass} from './hero-timeline.mjs';

const FOV = 16, LENS = 46, TILT = 1.4;
const SPECIES = {li: '#9fdc7f', oxygen: '#e5525b', context: '#86404c', tm: '#b457db', tetGlyph: '#2f7a42'};
const RADIUS = {li: .14, tm: .135, oxygen: .085, context: .062, site: .14, tsite: .055};
const sub = (p, q) => p.map((v, i) => v - q[i]);
const local = p => sub(p, TSITE); // model space is centred on the tetrahedral site
const same = (p, q) => p.every((v, i) => Math.abs(v - q[i]) < 1e-6);
const dist = (p, q) => Math.hypot(...sub(p, q));

export function createHopRenderer(canvas) {
 const T = window.THREE;
 if (!T) throw new Error('Scientific renderer unavailable');
 const renderer = createRenderer(T, canvas, {exposure: 1.12});
 const linear = hex => new T.Color(hex).convertSRGBToLinear();

 const scene = new T.Scene();
 scene.fog = new T.Fog(0x0f111b, 10, 20);
 const camera = new T.PerspectiveCamera(FOV, 1, .1, 100);
 const pmrem = new T.PMREMGenerator(renderer);
 scene.environment = pmrem.fromScene(studio(T), .035).texture;
 pmrem.dispose();
 // Studio key from the upper left, a cool fill and a violet rim so the far side of each sphere still reads.
 const lights = [[0xffffff, 1.15, [-4, 6, 8]], [0x9fb7ff, .3, [7, -2, 4]], [0xc9b6ff, .75, [3, 5, -8]]];
 for (const [color, intensity, pos] of lights) { const l = new T.DirectionalLight(color, intensity); l.position.set(...pos); scene.add(l); }
 scene.add(new T.HemisphereLight(0xbfd0ff, 0x0b0d18, .28));

 const sphere = new T.SphereGeometry(1, 64, 48);
 const atomMaterial = (hex, roughness = .3, clearcoat = .55) => new T.MeshPhysicalMaterial({color: linear(hex), roughness, metalness: 0, clearcoat, clearcoatRoughness: .16, envMapIntensity: 1.05, transparent: true});
 const materials = {li: atomMaterial(SPECIES.li, .28), oxygen: atomMaterial(SPECIES.oxygen, .34, .45), context: atomMaterial(SPECIES.context, .55, .1), tm: atomMaterial(SPECIES.tm, .24, .75), tetGlyph: atomMaterial(SPECIES.tetGlyph, .4, .3)};
 const ball = material => { const m = new T.Mesh(sphere, material.clone()); m.renderOrder = 2; return m; };

 // Model group: the rigid framework (oxygen, polyhedra, route). It rotates with the view.
 const model = new T.Group(); scene.add(model);
 const oxygenMeshes = [...tetraO.map(p => ({p, tetra: true})), ...[...octO(A), ...octO(B)].filter((p, i, all) => !tetraO.some(o => same(o, p)) && all.findIndex(q => same(q, p)) === i).map(p => ({p, tetra: false}))]
  .map(o => { const mesh = ball(o.tetra ? materials.oxygen : materials.context); mesh.position.set(...local(o.p)); model.add(mesh); return {...o, mesh, shellA: octO(A).some(q => same(q, o.p)), shellB: octO(B).some(q => same(q, o.p))}; });

 // Edges are thin cylinders (WebGL lines are one device pixel wide and look scratchy on retina screens).
 // Edges and glass faces draw after the opaque atoms, so they depth-test against them: an edge in front of
 // lithium crosses it, a face tints whatever lies behind it, and lithium shows the face slicing through it.
 const rod = new T.CylinderGeometry(1, 1, 1, 10, 1, true); rod.translate(0, .5, 0);
 const up = new T.Vector3(0, 1, 0);
 const edgeMaterial = (hex, opacity) => new T.MeshBasicMaterial({color: linear(hex), transparent: true, opacity, depthWrite: false, toneMapped: false});
 function edgeSet(pairs, material, radius) {
  return pairs.map(([p, q], i) => {
   const mesh = new T.Mesh(rod, material), a = new T.Vector3(...local(p)), b = new T.Vector3(...local(q)), dir = b.clone().sub(a);
   mesh.position.copy(a); mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize()); mesh.userData = {length: dir.length(), radius, order: i}; mesh.renderOrder = 3; model.add(mesh); return mesh;
  });
 }
 const pairs = pts => pts.flatMap((p, i) => pts.slice(i + 1).map(q => [p, q])).filter(([p, q]) => Math.abs(dist(p, q) - Math.SQRT2) < 1e-6);
 const inTetra = ([p, q]) => tetraO.some(o => same(o, p)) && tetraO.some(o => same(o, q));
 const tetraEdgeMat = edgeMaterial('#c3cff5', .7), octAMat = edgeMaterial('#9aaedc', .3), octBMat = edgeMaterial('#9aaedc', .3);
 const tetraEdges = edgeSet(pairs(tetraO), tetraEdgeMat, .0085);
 const octAEdges = edgeSet(pairs(octO(A)).filter(e => !inTetra(e)), octAMat, .005), octBEdges = edgeSet(pairs(octO(B)).filter(e => !inTetra(e)), octBMat, .005);

 // The four tetrahedron faces: entry (shared with A), exit (shared with B), and the faces shared with C and the TM.
 const faceOf = site => tetraO.filter(o => dist(o, site) < 1.001);
 const faces = {a: faceOf(A), b: faceOf(B), c: faceOf(C), d: faceOf(D)};
 const faceMeshes = Object.fromEntries(Object.entries(faces).map(([key, pts]) => {
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts.flatMap(local), 3));
  const mesh = new T.Mesh(g, new T.MeshBasicMaterial({color: linear('#9db4ff'), transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, toneMapped: false}));
  mesh.renderOrder = 3; model.add(mesh); return [key, mesh];
 }));

 // Route A→T→B as fine dots; the part behind lithium brightens into a trail.
 const dotTexture = discTexture(T), ROUTE = 29;
 const routePoints = Array.from({length: ROUTE}, (_, i) => local(hopPosition(i / (ROUTE - 1))));
 // Each dot carries its own alpha (RGBA vertex colours) so a path can sweep in with a soft front.
 const pointsObject = (pts, hex, size) => {
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts.flat(), 3)); g.setAttribute('color', new T.Float32BufferAttribute(pts.flatMap(() => [1, 1, 1, 1]), 4));
  const m = new T.Points(g, new T.PointsMaterial({color: linear(hex), size, sizeAttenuation: false, map: dotTexture, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, vertexColors: true}));
  m.renderOrder = 4; model.add(m); return m;
 };
 const sweep = (points, amount, soft = .15) => { const c = points.geometry.attributes.color, n = c.count; for (let i = 0; i < n; i++) c.setW(i, Math.max(0, Math.min(1, (amount * (1 + soft) - i / (n - 1)) / soft))); c.needsUpdate = true; };
 const routeAhead = pointsObject(routePoints, '#a9dc90', 3.4), routeBehind = pointsObject(routePoints, '#d6f5c4', 3.8);
 // The tetrahedral site and the one face-sharing TM, joined as in the source glyph's repulsion arrow.
 const tmLinkPoints = Array.from({length: 9}, (_, i) => local(TSITE.map((v, k) => v + (D[k] - v) * (.2 + .6 * i / 8))));
 const tmLink = pointsObject(tmLinkPoints, '#d8a6f7', 3.4);

 // Actors are positioned in world space so they can start exactly on the printed glyph.
 const li = ball(materials.li), tm = ball(materials.tm), tetGlyph = ball(materials.tetGlyph);
 scene.add(li, tm, tetGlyph);
 const dashed = ringTexture(T, true), solid = ringTexture(T, false);
 const ring = (texture, hex) => { const s = new T.Sprite(new T.SpriteMaterial({map: texture, color: linear(hex), transparent: true, depthWrite: false, toneMapped: false, opacity: 0})); s.renderOrder = 5; scene.add(s); return s; };
 const rings = {a: ring(dashed, '#cfd8ee'), b: ring(dashed, '#cfd8ee'), c: ring(dashed, '#cfd8ee'), t: ring(solid, '#9fd3ab')};

 // The zoomed paper glyph, painted by hero.js, becomes a card in the scene so it can lay back in perspective.
 // It pivots on its bottom edge like a page settling onto a desk.
 const cardGeometry = new T.PlaneGeometry(1, 1); cardGeometry.translate(0, .5, 0);
 const card = new T.Mesh(cardGeometry, new T.MeshBasicMaterial({transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false}));
 card.renderOrder = -1; card.visible = false; scene.add(card);
 let cardRect = null;
 function setCard(source, rect) {
  card.material.map?.dispose();
  const texture = new T.CanvasTexture(source); texture.encoding = T.sRGBEncoding; texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  card.material.map = texture; card.material.needsUpdate = true; cardRect = rect;
 }

 const M = new T.Matrix4(), basis = new T.Matrix4(), yawM = new T.Matrix4(), pitchM = new T.Matrix4(), v = new T.Vector3();
 const r = Math.SQRT1_2;
 // Rows are the view basis used since the first prototype: the printed 1-TM glyph reads in this orientation.
 basis.set(r, r, 0, 0, .5, -.5, -r, 0, -.5, .5, -r, 0, 0, 0, 0, 1);
 let width = 1, height = 1, scale = 100, frame = {x: 0, y: 0, w: 1, h: 1}, distance = 10, focal = 1, fov = FOV;

 function layout(w, h, f, unit, dpr) {
  if (w !== width || h !== height) { renderer.setPixelRatio(Math.min(dpr || 1, 2)); renderer.setSize(w, h, false); }
  width = w; height = h; frame = f; scale = unit;
  camera.aspect = w / h; camera.setViewOffset(w, h, w / 2 - (f.x + f.w / 2), h / 2 - (f.y + f.h / 2), w, h);
  lens(fov, true);
 }
 // Field of view in degrees. The camera dollies with it so the model's central plane keeps its scale
 // (a dolly zoom): anything flat on that plane looks the same, depth reads more strongly when wide.
 function lens(degrees, force) {
  if (!force && Math.abs(degrees - fov) < 1e-4) return;
  fov = degrees; camera.fov = fov;
  focal = height / (2 * Math.tan(fov * Math.PI / 360)); distance = focal / scale;
  camera.position.set(0, 0, distance); camera.near = Math.max(.1, distance - 8); camera.far = distance + 12; camera.updateProjectionMatrix();
  scene.fog.near = distance - .35; scene.fog.far = distance + 5.2;
 }
 // Screen point on the model's central plane (z = 0) → world coordinates.
 const unproject = ([x, y]) => new T.Vector3((x - frame.x - frame.w / 2) / scale, -(y - frame.y - frame.h / 2) / scale, 0);
 function project(p, radius = 0) {
  v.copy(p).project(camera); const x = (v.x + 1) / 2 * width, y = (1 - v.y) / 2 * height;
  return {x, y, z: p.z, r: radius * focal / Math.max(.1, distance - p.z)};
 }
 const world = p => new T.Vector3(...local(p)).applyMatrix4(model.matrixWorld);
 const lerp3 = (a, b, u) => a.clone().lerp(b, u);
 const out = {};

 function update(s) {
  // View: basis, then yaw about the vertical and pitch about the horizontal screen axis.
  yawM.makeRotationY(s.yaw); pitchM.makeRotationX(s.pitch); M.copy(pitchM).multiply(yawM).multiply(basis);
  model.matrixAutoUpdate = false; model.matrix.copy(M); model.matrix.setPosition(s.offsetX || 0, s.offsetY || 0, 0); model.updateMatrixWorld(true);
  lens(FOV + (LENS - FOV) * (s.lens || 0));
  camera.updateMatrixWorld(); // projected label and connector positions must match this frame's camera, not the last render's
  // `show` fades lithium (and the windows and trail it lights) while Play again lifts it from B back to A; meanwhile
  // what depends on its path position cross-fades by time (`s.swap`, see across in hero-timeline.mjs).
  const u = s.unfold, glyph = s.glyph, hop = s.hop, sel = s.selection, liPos = world(hopPosition(hop)), show = s.li ?? 1;
  const ringsOn = {a: across(h => siteRings(h).a, s), b: across(h => siteRings(h).b, s)};
  // A selection's emphasis builds with the model and eases in and out (see emphasis in hero-timeline.mjs).
  const lit = key => emphasis(sel, key, s), win = [show * bump(hop, 1 / 3, .11), show * bump(hop, 2 / 3, .11)], panes = glass(sel, s, win);
  // The paper card lays back under the atoms and fades.
  const cardOpacity = cardRect ? s.card || 0 : 0;
  card.visible = cardOpacity > .002;
  if (card.visible) {
   const tilt = s.tilt || 0;
   card.position.copy(unproject([cardRect.x + cardRect.w / 2, cardRect.y + cardRect.h])); card.position.z -= .35 * tilt;
   card.rotation.set(-TILT * tilt, 0, 0); card.scale.set(cardRect.w / scale, cardRect.h / scale, 1);
   card.material.opacity = cardOpacity;
  }
  const anchoredAt = (key, target, fallback) => glyph ? lerp3(unproject(glyph.anchors[key]), target, u) : fallback || target;
  const glyphRadius = (px, target) => glyph ? (px * glyph.scale / scale) * (1 - u) + target * u : target;

  // Lithium, its sites and the transition metal settle from the printed glyph into the ideal geometry.
  const liWorld = hop > 0 ? liPos : anchoredAt('li', world(A));
  li.position.copy(liWorld); li.scale.setScalar(glyphRadius(22, RADIUS.li)); li.material.opacity = s.atoms * show; li.material.depthWrite = s.atoms * show > .95; li.visible = s.atoms * show > .002;
  li.material.emissive = li.material.emissive || new T.Color(); li.material.emissive.copy(linear(SPECIES.li)).multiplyScalar(.14 * lit('li'));
  tm.position.copy(anchoredAt('tm', world(D))); tm.scale.setScalar(glyphRadius(22, RADIUS.tm)); tm.material.opacity = s.atoms; tm.material.depthWrite = s.atoms > .95; tm.visible = s.atoms > .002;
  tm.material.emissive.copy(linear(SPECIES.tm)).multiplyScalar(.2 * panes.tm);
  // The printed dark-green interstitial dot becomes an empty tetrahedral-site marker.
  const tWorld = anchoredAt('t', world(TSITE));
  tetGlyph.position.copy(tWorld); tetGlyph.scale.setScalar(glyphRadius(12, .06)); tetGlyph.material.opacity = s.atoms * (1 - smoothstep(.15, .6, u)); tetGlyph.visible = tetGlyph.material.opacity > .002;
  const ringAt = (sprite, pos, radius, opacity) => { sprite.position.copy(pos); sprite.scale.setScalar(2 * radius * 128 / 112); sprite.material.opacity = opacity; sprite.visible = opacity > .002; };
  const sites = lit('sites'), siteBoost = .78 + .22 * sites, ringC = .62 + .38 * (1 - u);
  ringAt(rings.b, anchoredAt('b', world(B)), glyphRadius(22, RADIUS.site), s.atoms * siteBoost * ringsOn.b);
  ringAt(rings.c, anchoredAt('c', world(C)), glyphRadius(20, RADIUS.site * .96), s.atoms * siteBoost * (ringC + (1 - ringC) * sites));
  ringAt(rings.a, world(A), RADIUS.site, siteBoost * ringsOn.a);
  ringAt(rings.t, tWorld, glyphRadius(12, RADIUS.tsite), s.atoms * smoothstep(.45, .95, u) * (.8 + .2 * sites) * (1 - .6 * show * bump(hop, .5, .1)));

  // Oxygen: four around the tetrahedral site, then the rest of both octahedra as quieter context.
  const towardB = across(shellB, s), focusLi = lit('li');
  oxygenMeshes.forEach((o, i) => {
   // 1 drawn full red, 0 quiet context; a selected oxygen eases between the two.
   const full = o.tetra ? 1 : across(h => oxygenShare(o, sel, h), s) * lit(sel);
   const appear = o.tetra ? stagger(s.oxygen, i, 4, .45) : stagger(s.context, i - 4, 6, .5);
   o.mesh.material.color.copy(linear(SPECIES.context)).lerp(linear(SPECIES.oxygen), full);
   o.mesh.material.roughness = .55 - .21 * full; o.mesh.material.envMapIntensity = .55 + .5 * full; o.mesh.material.clearcoat = .1 + .35 * full;
   o.mesh.scale.setScalar((RADIUS.context + (RADIUS.oxygen - RADIUS.context) * full) * (.55 + .45 * appear));
   o.mesh.material.opacity = appear; o.mesh.material.depthWrite = appear > .95; o.mesh.visible = appear > .002;
  });
  // Coordination edges draw outward from each vertex in turn.
  const drawEdges = (edges, amount) => edges.forEach((e, i) => { const f = stagger(amount, i, edges.length, .55); e.scale.set(e.userData.radius, Math.max(1e-4, e.userData.length * f), e.userData.radius); e.visible = f > .002; });
  drawEdges(tetraEdges, s.edges);
  // Both octahedra stay faintly drawn; the one lithium currently occupies is a little stronger.
  const atB = across(h => smoothstep(.42, .58, h), s);
  drawEdges(octAEdges, s.context); drawEdges(octBEdges, s.context);
  octAMat.opacity = s.edges * (.13 + .11 * (1 - atB)) + .4 * focusLi * (1 - towardB); octBMat.opacity = s.edges * (.13 + .11 * atB) + .4 * focusLi * towardB;
  tetraEdgeMat.opacity = .62 + .25 * lit('oxygen');
  // Faces: a faint glass tetrahedron; each window lights as lithium crosses it; the TM face tints violet.
  const setFace = (key, opacity, hex) => { faceMeshes[key].material.opacity = opacity; faceMeshes[key].material.color.copy(linear(hex)); faceMeshes[key].visible = opacity > .002; };
  setFace('a', panes.a, win[0] > .02 ? '#a9c0ff' : '#9db4ff');
  setFace('b', panes.b, win[1] > .02 ? '#a9c0ff' : '#9db4ff');
  setFace('c', panes.c, '#9db4ff');
  setFace('d', panes.d, panes.tm > .02 ? '#c688ff' : '#9db4ff');
  // Route and trail. The route sweeps from A to B as the 3D counterpart of the printed arrow.
  const behind = Math.round(hop * (ROUTE - 1));
  sweep(routeAhead, s.route);
  routeAhead.geometry.setDrawRange(behind, ROUTE - behind); routeAhead.material.opacity = .55; routeAhead.visible = s.route > .002;
  routeBehind.geometry.setDrawRange(0, behind + 1); routeBehind.material.opacity = .95 * s.route * show; routeBehind.visible = s.route > .002 && hop > 0;
  tmLink.material.opacity = .9 * panes.tm; tmLink.visible = panes.tm > .002;

  // Projected positions for labels, connectors and pointer hit testing.
  out.li = project(li.position, li.scale.x); out.tm = project(tm.position, tm.scale.x); out.t = project(tWorld, RADIUS.tsite);
  out.a = project(world(A), RADIUS.site); out.b = project(world(B), RADIUS.site); out.c = project(rings.c.position, RADIUS.site);
  out.center = project(world(TSITE));
  // A few points along the route (once it is drawn) keep labels off lithium's path.
  out.route = s.route > .5 ? [.15, .3, .5, .7, .85].map(k => project(world(hopPosition(k)), .02)) : [];
  out.oxygen = oxygenMeshes.map(o => ({...project(o.mesh.getWorldPosition(new T.Vector3()), o.mesh.scale.x), visible: o.mesh.visible && o.mesh.material.opacity > .3}));
  return out;
 }
 return {
  layout, update, setCard,
  render() { renderer.render(scene, camera); },
  dispose() { renderer.dispose(); },
 };
}

function smoothstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function bump(x, centre, width) { const d = Math.abs(x - centre) / width; return d >= 1 ? 0 : .5 + .5 * Math.cos(Math.PI * d); }
// Item i of n appears in turn while `amount` runs 0→1; `overlap` sets how much neighbours overlap.
function stagger(amount, i, n, overlap) { const slot = 1 / (n - (n - 1) * overlap), start = i * slot * (1 - overlap); return smoothstep(start, start + slot, amount); }

// A small studio for reflections: a dark gradient room with one large softbox, a strip and a cool rim.
function studio(T) {
 const room = new T.Scene(), g = new T.SphereGeometry(20, 48, 24), colors = [], top = new T.Color(0x323a5e), bottom = new T.Color(0x05060b), c = new T.Color();
 const pos = g.attributes.position;
 for (let i = 0; i < pos.count; i++) { c.lerpColors(bottom, top, Math.pow((pos.getY(i) / 20 + 1) / 2, 1.4)); colors.push(c.r, c.g, c.b); }
 g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
 room.add(new T.Mesh(g, new T.MeshBasicMaterial({vertexColors: true, side: T.BackSide})));
 const panel = (w, h, hex, intensity, p) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({color: new T.Color(hex).multiplyScalar(intensity), side: T.DoubleSide})); m.position.set(...p); m.lookAt(0, 0, 0); room.add(m); };
 panel(9, 7, 0xffffff, 5.5, [-8, 9, 9]);
 panel(2.5, 11, 0xb3c6ff, 2.4, [12, 0, 4]);
 panel(12, 3, 0xb9a8ff, 1.9, [2, 7, -12]);
 panel(14, 5, 0x28324f, 1.2, [0, -11, 3]);
 return room;
}
function ringTexture(T, dashed) {
 const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
 g.strokeStyle = '#fff'; g.lineWidth = dashed ? 7 : 6; g.lineCap = 'round';
 if (dashed) { const seg = 2 * Math.PI * 112 / 12; g.setLineDash([seg * .58, seg * .42]); }
 g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke();
 const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
}
function discTexture(T) {
 const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
 grad.addColorStop(0, '#fff'); grad.addColorStop(.62, '#fff'); grad.addColorStop(1, 'rgba(255,255,255,0)');
 g.fillStyle = grad; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
}
