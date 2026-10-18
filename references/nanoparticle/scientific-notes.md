# Inside a nanoparticle — source and scientific model

## Provenance

Kang, Y., João, S. M., Lin, R. et al. **Effect of crystal facets in plasmonic catalysis.** *Nature Communications* **15**, 3923 (2024). https://doi.org/10.1038/s41467-024-47994-y

Figure 1a and 1c are reproduced under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The original image, exact pixel crops and SHA-256 are retained in this folder. The module uses native-resolution, lossless crops. Panel letters and 100 nm scale bars remain intact. The separate animated outlines are Fig.3D additions.

The paper's nanocubes and octahedra expose {100} and {111} faces, respectively. Its particles are approximately 60 nm; the small cuboctahedron in this explorer is a different, ideal explanatory model. It does not reconstruct a particle from the micrographs.

## Coordinate definition

Integer FCC coordinates `(i,j,k)`, with even `i+j+k`, satisfy both:

- `max(abs(i),abs(j),abs(k)) <= n`
- `abs(i)+abs(j)+abs(k) <= 2n`

The integer coordinate unit is **a/2 = 2.04 Å**, using a representative gold lattice parameter **a = 4.08 Å** as a model input, not a fitted measurement. Browser and Blender display these same integer coordinates. Nearest-neighbor distance is a/√2 ≈ 2.885 Å. The displayed sphere radii are symbolic; selected neighborhoods use smaller spheres to reveal their connections. No atom positions move during inspection.

The cuboctahedron has six square {100} and eight triangular {111} faces. Braces denote symmetry-equivalent families; the normal of a particular selected face is held in the model. Axis-aligned boundary planes are ±i = n and equivalents. Diagonal planes are ±i ±j ±k = 2n.

The 12 nearest-neighbor offsets are permutations of `(±1,±1,0)`. Each neighbor must actually exist in the finite coordinate set. No count is assigned from an atom's category.

## Exact checks

For complete shells n = 3…10:

| Shells | Total atoms | Surface atoms | Surface fraction |
|---:|---:|---:|---:|
|3|147|92|62.585034%|
|4|309|162|52.427184%|
|5|561|252|44.919786%|
|6|923|362|39.219935%|
|7|1415|492|34.770318%|
|8|2057|642|31.210501%|
|9|2869|812|28.302544%|
|10|3871|1002|25.884784%|

The UI displays a rounded percentage plus the exact numerator and denominator. Total atoms equal `(10n³+15n²+11n+3)/3`. Surface atoms equal `10n²+2`. The independent ASE checks compare **all coordinate sets and all neighbor sets**, not just these formulas.

Coordination distributions for this construction:

- Vertex: CN 5; 12 atoms.
- Edge: CN 7; 24(n−1) atoms.
- Square terrace: CN 8; 6(n−1)² atoms.
- Triangular terrace: CN 9; 4(n−1)(n−2) atoms.
- Interior: CN 12; the remaining atoms.

These are properties of this ideal unrelaxed shape, not universal values for all nanoparticle edges and corners. Ligands, defects, reconstructions, strain, solvent and temperature are absent.

## Cutaways and site geometry

A cutaway changes per-instance display scale only. The complete neighbor graph, counts and surface fraction are retained. The selected atom and its counted neighbors remain present in the view. The cut plane is i+j+k = 0. The cut hides the half that holds the selected atom, except that atom and its counted neighbors, and the camera looks in from the hidden side. Choosing another atom while the cut is open moves the cut to that atom's half. An atom exactly on the plane is exposed by either half, so the cut stays where it is (the first cut hides the i+j+k > 0 half). Neighbors that lie in the remaining half stay part of it, so the caption says only that the rest of the atom's half is hidden. Rotating is still needed to inspect occluded neighbors; an on-screen count is not a claim that every neighbor is simultaneously visible.

On the Surfaces view, the tint and the label "each tinted atom has 8 (or 9) neighbours" cover only the terrace atoms of the chosen face: atoms on that facet plane and no other. A {100} face has (n−1)² of them, a {111} face (n−1)(n−2)/2; the face's edge and vertex atoms (7 and 5 neighbours) stay gold.

Atop is a surface atom's projected position. Bridge is the midpoint of a nearest-neighbor surface pair. A {100} hollow is the center of an actual nearest-neighbor square. The {111} hollow candidates are centroids of equilateral nearest-neighbor triangles. The two registries are classified by the first atom aligned along the inward face normal: the HCP hollow has one in layer 2, and the FCC hollow has one in layer 3. Layers count down from the surface, which is layer 1. Every on-screen string about a hollow (caption, site label, underlying-atom label, detail line) is generated from that measured layer, so they name the same layer. Every site's surrounding atoms and stacking depth are checked across all sizes and all faces.

The diamond is a **geometric position marker**, not an atom, molecule or simulated adsorbate. Its approach animation has no physical time, force field or calculated trajectory. Neighbor connectors mark counted proximity, not separate covalent bonds.

## Published chemistry comparison

The paper reports COOH* formation energies of **1.2 eV on Au{100}** and **1.4 eV on Au{111}**. The source is the Results discussion of Figure S10; computational context is the Methods section “DFT Calculation.” The slab calculation uses VASP/PAW/PBE, four-layer 4×2 periodic surfaces containing 128 atoms, 30 Å vacuum, a 450 eV cutoff and 1×2×1 k-points. Free energies include zero-point and entropy corrections at 298.15 K.

The explorer does not calculate these values. They describe formation energetics, not transition-state activation barriers. Their difference alone is not a reaction-rate or activity prediction. The paper studies plasmonic effects too; those mechanisms and quantitative activity prediction are deliberately outside this release.

## Claim-to-source ledger

| Claim or visual element | Basis | Where to inspect |
|---|---|---|
| Gold nanocube / octahedron imagery; facet assignments | Kang et al. Figure 1a,c and characterization text | Original PNG; DOI above |
| Published formation-energy comparison and context | Kang et al., Results, Figure S10 and DFT Methods | DOI above |
| Cuboctahedral construction and shell sizes | Explicit half-space FCC model, independently cross-checked with ASE | `nanoparticle-model.mjs`; `production/nanoparticle/ase-verification.json` |
| Neighbor counts, distances and surface fractions | Calculated from the finite coordinate set | `nanoparticle-verification.mjs` |
| HCP/FCC registry | Coordinate-derived second/third-layer alignment | Binding geometry tests for all 14 faces at all 8 sizes |
| Face label "each tinted atom has N neighbours" | Derived: N is read from the tinted terrace atoms themselves | `faceNote`, `terraceIds` in `nanoparticle-model.mjs`; checks in `nanoparticle-verification.mjs` |
| Hollow wording (second / third layer) | Derived: first atom found below the hollow along the inward normal | `siteCopy` in `nanoparticle-model.mjs`; independent layer walk in `nanoparticle-verification.mjs` |
| {100} red and {111} violet accents | Kang et al. Figure 1 frames the nanocubes in red and the octahedra in violet | Original PNG, panels a and c |
| Physical gold optical response | Not calculated | Materials and lights are explanatory art direction |
| Catalytic active-site ranking | Not claimed | Binding caption and comparison disclosure |

Independent geometry reference: [ASE cluster construction](https://docs.ase-lib.org/ase/cluster/cluster.html), `Octahedron('Au', length=2*n+1, cutoff=n, latticeconstant=4.08)`. Neighbor sets are independently obtained using ASE's distance-based neighbor list. Verified with ASE 3.29.0.

## Scope of verification

Numerical and software checks establish consistency of this ideal model and interface. They are not experimental validation, an expert scientific review, or a learner study. The proposed understanding tasks remain suitable for testing with actual learners.

## 16 October 2026 — wave 1 fixes

- **Surface labels no longer overclaim.** Before, the whole {100} or {111} face was tinted and labelled "each atom has 8 (9) neighbours", although 24 of 49 {100} atoms and 18 of 28 {111} atoms at six shells sit on edges or vertices with 7 or 5. Only terrace atoms are tinted now, and the label's number is read from them.
- **The FCC hollow no longer contradicts itself.** The site label used to say "Over a gap with no atom in the layer below" while a second label read "Atom in the layer below" and the caption placed that atom in the third layer. All strings now come from the measured layer: the HCP hollow sits over an atom in the second layer, and the FCC hollow over a gap in the second layer and an atom in the third.
- **Corner beat.** The last opening caption now describes what the camera shows (two square and two triangular faces meet at the cuboctahedron vertex; five neighbours) instead of inviting the reader to choose an atom while the tour still moves the camera. Checked against the coordinates.
- **Colours.** The {100} face tint, outline and trace and the {100} energy bar now use the paper's nanocube red; {111} keeps the octahedron violet. Measured on rendered pixels, the coral tint stays at ΔE76 ≥ 10 from the gold atoms under simulated protanopia (18), deuteranopia (14) and tritanopia (11). That is less than the old silver-blue (34, 34 and 20), so the face keeps its outline and label as redundant cues.
- **Not changed (needs source data or wave 2):** the rhombic dodecahedron and its {110} COOH* value (1.1 eV is not yet in this ledger), dark/light efficiencies, the paper's own cube and octahedron coordination counts, and the HRTEM fringe comparison.

## 16 October 2026 — wave 1 repair

- **Choosing another atom with the cut open.** The cut used to stay on the first atom's half, so a newly chosen atom on the remaining half sat embedded in it while the caption said its half had been removed. The cut now follows the chosen atom (rule above), the camera looks in from the hidden side, and the caption was narrowed to what is always true: "The cut hides the rest of its half, leaving the atom and its highlighted neighbors." `nanoparticle-verification.mjs` checks, for first cuts on both sides at 3 and 6 shells and every atom a reader could then choose, that exactly the rest of that atom's half is hidden.
- **No science values changed.** Counts, distances, registry and the published energies are untouched.

## 16 October 2026 — wave 1 repair round 2

- **Callouts name one thing each.** The words of every scene callout (face, atom, binding site, the atom revealed beneath a hollow, and the size count) now come from `callouts()` in `nanoparticle-model.mjs`, keyed by the object they name. Before, a shared key let the new name appear for a moment at the previous object's place (for example "{111} face" beside the {100} face). `nanoparticle-verification.mjs` checks at 3, 6 and 10 shells that one key never carries two names, and that every callout has one.
- **No science values changed.** The strings are the same functions as before (`faceNote`, `siteDescription`, `siteCopy`); only their keys moved.
