# Lithium that moves together: scientific notes and claim ledger

Companion to Xingfeng He, Yizhou Zhu & Yifei Mo, "Origin of fast ion diffusion in super-ionic conductors", *Nature Communications* 8, 15893 (2017), doi:10.1038/ncomms15893, and its Supplementary Information (SI). Both are CC BY 4.0. The figures on the page are rasterised unchanged from the author PDF and carry attribution.

This file covers what the page claims, where each claim comes from, what was computed or inferred here, and what the page does not claim. The verification report is in `production/fast-ion-diffusion/verification-report.md`.

## 1. Scope and material choice

The page explains Figures 2–3, and uses Figures 1 and 4 for the mechanism. It focuses on one material, cubic Li₇La₃Zr₂O₁₂ (LLZO). The reasons:

- Its event is the best documented of the three. The main text gives the hop rule ("T-site Li ions hop to the nearest-neighbour O sites and the Li ions occupying these O sites hop into their nearest neighbour T sites"). The Fig. 3b inset draws five streaked ions and 13 oxygens. Cubic garnet geometry is standard (Ia-3d), so the channel can be rebuilt from Wyckoff positions and checked against the inset (section 3).
- The single-ion landscape for LLZO (Fig. 3e) is defined in Methods as "single Li⁺ migration between two neighbouring tetrahedral sites after removing a Li ion". That gives an unambiguous T → O → T path to show.
- LGPS and LATP are named in the introduction and in "Go deeper", with their barriers. They get no material switch. A switch that only swapped numbers would add choice without understanding. Rebuilding their channels to the same standard would need their own registration work.

## 2. Claim ledger

Status codes: **P** stated in the paper or SI; **D** digitized here from the PDF's vector art; **C** computed here from stated inputs; **I** our inference, labelled as such on the page; **S** schematic or interpolated, labelled on the page.

| # | Claim on the page | Status | Source |
|---|---|---|---|
| 1 | LLZO's concerted-migration barrier is 0.26 eV (LGPS 0.20, LATP 0.27) | P | Main text "Concerted migration…"; Fig. 3a–c |
| 2 | LLZO's single-ion landscape barrier is 0.58 eV (LGPS 0.47, LATP 0.49) | P | Main text "Origin of concerted migration…"; Fig. 3d–f |
| 3 | Fig. 3b has 17 NEB images, peak 0.2618 eV, start 0.063 eV above the end | D | Vector markers, section 4 |
| 4 | Fig. 3e has 14 points, peak 0.5808 eV at the O site, both T ends at 0 | D | Vector markers, section 4 |
| 5 | Fig. 3b's x axis is NEB image index ("Concerted migration path"), evenly spaced | D | Marker x spacing 6.42–6.48 pt |
| 6 | Fig. 3e's x axis is position along the path, not image index | D | Marker x spacing uneven, 7.24–8.32 pt; axis label "Position along migration path" |
| 7 | Each curve is measured from its own lower end; the two are not on a common energy reference | P/I | Different systems (Fig. 3e removes a Li ion and relaxes only non-Li atoms, Methods). Reading each zero as its own reference is ours. The page never overlays them. |
| 8 | In LLZO, T-site ions hop to neighbouring O sites while O-site ions hop to neighbouring T sites | P | Main text, quoted in section 1 |
| 9 | The drawn event has five ions: O0→T1, O1→T2, T2→O2, T3→O3, O3→T4 | P/I | Inset streak count and direction (white → green). Assignment to sites is ours, fixed by registration (section 3). |
| 10 | The occupancy pattern before (1,0,1,1,0,1,1,0 over O0…T4) reappears shifted by one site afterwards | C | Follows from claim 9 |
| 11 | The start is higher than the end, consistent with one fewer ion on an O site at the end | I | Labelled "our reading, not a statement in the paper" |
| 12 | T and O sites alternate 1.99 Å apart; T has 4 O at 1.94 Å, O has 6 O at 2.03–2.45 Å | C | Rebuilt structure, section 3 |
| 13 | The motion between start and end is straight-line interpolation at a common rate; the coordinate is not time | S | Labelled under the scrubber and in captions |
| 14 | Mid-event, ions 2 and 3 pass within 1.78 Å near T2 | C/S | Artifact of the interpolation, disclosed in "What the animation does not show" |
| 15 | Hops within 1 ps were grouped as one event; groups of n ≥ 2 dominate diffusion | P | SI Note 1, Supplementary Fig. 2 |
| 16 | Correlation factor at 900 K: 3.0 (LGPS), 3.0 (LLZO), 2.1 (LATP), about two to three ions on average | P | Main text; Methods eq. 4 |
| 17 | LLZO shows many concerted modes, all with barriers 0.18–0.29 eV | P | SI Note 2, Supplementary Fig. 3 |
| 18 | LLZO AIMD activation energy 0.25 ± 0.02 eV; σ(300 K) 1.3 mS/cm | P | SI Table 1 |
| 19 | Experimental LLZO: Ea 0.31–0.34 eV, σ 0.31–0.51 mS/cm (one reference is 1.7 wt% Sr-doped) | P | SI Table 1 and footnote |
| 20 | K computed from DFT: 2.0 eV·Å (LLZO), 2.7 (LGPS), 4.2 (LATP) | P | SI Note 3 |
| 21 | Fig. 4 model: 4 ions, two 6 Å cells, E = Σφ(xᵢ) + Σ K/|xᵢ − xⱼ|; φa, φb as Methods eqs 7–8 | P | Methods "Diffusion model for concerted migration" |
| 22 | Landscape b has a 0.3 eV local barrier at the high-energy sites | P | Methods, after eq. 8 |
| 23 | Re-run barriers at K = 3: 0.319 eV (a), 1.528 eV (b); printed 0.330 and 1.547 | C/D | `production/fast-ion-diffusion/model/rerun.py` |
| 24 | In the 1D model the energy change is exactly the sum of per-ion Δφ and Δrepulsion | C | By construction of the model; checked numerically |
| 25 | No per-ion energy split is drawn for LLZO | — | DFT total energies cannot be decomposed per ion; the page says so |
| 26 | LiTiS₂ has a landscape like Fig. 4b and is not super-ionic | P | SI Note 4 |
| 27 | The model's ion arrangement resembles LATP more than LLZO | P | Methods ("similar between two nearest-neighbour M1 sites in LATP") |
| 28 | Cubic LLZO: 56 Li per cell, 24 T + 48 O sites | C | Ia-3d with Z = 8, 24d and 48g/96h Wyckoff multiplicities |
| 29 | Figure 2e's density is elongated along the channel around O sites | P | Fig. 2 caption ("elongation along the migration channel") and main text |
| 30 | Barriers 0.26 eV and Ea values "agree" | P | Main text: "in good agreement with the activation energies obtained from the AIMD simulations and from experiments". The page keeps the three numbers separate. |
| 31 | In "One ion alone", the rest of the lithium is held fixed | P | Methods, "Energy landscape of single-ion migration": one Li removed, "only non-Li cations and anions were relaxed" |
| 32 | The fixed ions drawn are ions 1, 2 and 5 at the event's start sites; the ion at T3 is the one removed | S/I | Which sites the paper's calculation kept filled is not shown. Our choice, said in the caption note; `singleContext` in the model. The lone ion's straight path stays at least 2.37 Å from each (checked). |
| 33 | The paper plots K = 2–6.5 eV·Å; 1–1.75 and 6.75–7 on the slider are extrapolated | P/C | Fig. 4d: ten printed points per landscape at K = 2.0, 2.5 … 6.5, the last past the axis's "6" tick (`curves.json` panels['4d'], last x 6.500 and 6.495). Until the 16 Oct 2026 repair this row said 2–6, read from the tick labels; the re-run model outside the range is labelled "extrapolated" in the readout |

### What the page does not claim

- That collective migration always lowers a barrier. Fig. 4b and SI Note 4 are shown as the counter-case.
- That more lithium is always better. The page says occupied high-energy sites help only with a locally flat landscape.
- That one event sets a material's conductivity. The "Barrier, activation energy, conductivity" note says it depends on carrier number, event frequency and network connectivity.
- That the NEB barrier, the AIMD activation energy and the experimental activation energy are interchangeable. They are listed as three different numbers.
- That the drawn stretch of channel establishes long-range connectivity. The whole-cell view is labelled "connectivity only".
- Any transition-state geometry, path shape, timing or rate. Motion is interpolated, playback is a reading pace, and the scrubber is labelled "Event coordinate, start to end. Not time."
- That partial occupancy is full occupancy. The "one moment" view shows the event's actual ions only; the "average occupancy" view draws small translucent spheres labelled as a time average.

## 3. The garnet channel

**Structure.** Cubic LLZO in Ia-3d (No. 230), a = 12.9827 Å, origin choice 2, built with ASE (`production/fast-ion-diffusion/garnet.py`).

| Species | Wyckoff | Position |
|---|---|---|
| La | 24c | (1/8, 0, 1/4) |
| Zr | 16a | (0, 0, 0) |
| O | 96h | (0.30738, 0.21716, 0.39787), fitted to Zr–O 2.10, La–O 2.55, Li(T)–O 1.935 Å |
| Li T | 24d | (3/8, 0, 1/4) |
| Li O cavity | 48g | (0.125, 0.1877, 0.4377), void centre |
| Li O split | 96h | (0.0985, 0.6889, 0.5791), 0.408 Å from 48g |

The O position is a fit to standard bond lengths, not a quoted experimental coordinate. It lands within the range of published cubic LLZO refinements, and the registration below is an independent check.

**Geometry checks** (all in `site/fast-ion-diffusion-verification.mjs`):

- T–O cavity centre distance: 1.988 Å, linear chains of alternating sites.
- T: four oxygens at 1.935 Å. O cavity: six oxygens at 2.03, 2.34 and 2.45 Å (two each).
- 96h split: 1.62 Å and 2.37 Å to its two T neighbours; Li–O 1.79 Å at the split.
- Zr–O 2.10 Å; minimum O–O 2.4 Å or more among the 66 drawn oxygens.

**Registration to Fig. 3b's inset.** `production/fast-ion-diffusion/registration/fit_inset.py`:

- It finds the 13 yellow oxygen dots in the inset (579 × 265 px, the embedded render's native size).
- It enumerates all 36 six-site walks T–O–T–O–T–O. For each walk it fits an orthographic pose (rotation, scale, offset) to the walk's coordinating oxygens by chamfer distance.
- One walk class fits at 3.22 px RMS, at 47.39 px/Å, which is 0.07 Å. Every other class misses by 18 px or more.
- The fitted pose and the streaks' white → green direction fix which ion goes where.
- `fig3b-inset-overlay.png` shows the projected model over the inset.

**Scene export.** `export-scene.py` writes `site/assets/fast-ion-diffusion/llzo-scene.json`. It contains:

- 8 channel sites and 5 ions with start and end positions.
- 66 anions, the polyhedra with convex-hull faces, 11 ZrO₆ and 16 La.
- 10 branch sites (off-channel neighbours whose occupancy is not shown).
- A whole-cell context, and the paper-view quaternion.

The site positions are centred on the drawn stretch.

**Atom counts on screen.** Only the event's five ions are drawn as atoms. Branch sites are faint rings, never atoms. The whole-cell view draws site dots and network lines, not 56 Li.

## 4. Digitized curves

`production/fast-ion-diffusion/extract-curves.py` reads marker paths from the author PDF with PyMuPDF:

- **Y axis.** Calibrated against the tick strokes: 84.23 pt/eV (3b) and 84.38 pt/eV (3e). The tick residual is ≤ 6 × 10⁻⁵ eV.
- **Marker centres.** Each centre is the path's bounding-box centre. Duplicate markers within 0.5 pt are collapsed.
- **Accuracy.** Marker-centre uncertainty is about ±0.05 pt, i.e. ±0.0006 eV. The JSON records a deliberately generous ±0.006 eV, and the page says "better than 0.01 eV".
- **Normalized coordinate.** s = 0…1. For 3b, s is image index / 16. For 3e, s follows each marker's printed x position, normalized end to end.
- **Fig. 4c/4d.**
  - The x axes are calibrated from tick-label centres (±0.05 Å, ±0.05 eV·Å). The y axes are calibrated from tick strokes.
  - Triangle markers use the vertex centroid.
  - Legend glyphs inside the white legend boxes are excluded.

On the page:

- Curves are piecewise-linear between markers, which is the same way the paper connects them. No smoothing or added points.
- Printed markers stay visible on every plot.

## 5. The 1D model re-run (Fig. 4)

`production/fast-ion-diffusion/model/fig4_model.py` and `rerun.py`.

**Equations.**

- φa(x) = Ea (cos θ − 0.25 cos 2θ − C1)/C2 with C1 = −1.25, C2 = 2.00.
- φb(x) = Ea (cos θ − 1.5 cos 2θ − C1)/C2 with C1 = −2.50, C2 = 4.08.
- θ = 2πx/L − π, L = 6 Å, Ea = 0.6 eV.
- E = Σφ(xᵢ) + Σ_{i<j} K/r_ij.

**Boundary convention.** The paper does not state it, so it was found empirically. The convention is a periodic 12 Å cell, minimum-image distances, and each pair counted once. Open ends, double-counted pairs and summed periodic images all miss Fig. 4c/4d by much more.

**Path.** All four ions are relaxed by SLSQP under the constraint that their mean position advances a fixed shift, 0 → 3 Å in 24 steps, starting from x = 0, 3, 6, 9 Å.

**Agreement with print.**

| Panel | Max abs error | Notes |
|---|---|---|
| 4c, landscape a | 0.013 eV | Barrier 0.319 vs printed 0.330 |
| 4c, landscape b | 0.069 eV | Barrier 1.528 vs printed 1.547 |
| 4d, landscape a | 0.014 eV | K = 2…6.5, all ten printed points |
| 4d, landscape b | 0.022 eV | K = 2…6.5, all ten printed points |

**Range on the page.** The page offers K = 1–7 eV·Å in 0.25 steps; the paper plots 2–6.5 (Fig. 4d's printed points run from 2.0 to 6.5; `PAPER_K` in the model, checked against `curves.json`). Values outside 2–6.5 are the same model extrapolated. Under the slider a bar spans 2–6.5 and ticks sit at the LLZO (2.0) and LATP (4.2) values from SI Note 3, each at its own position on the track (until 16 October 2026 both were one centred label). The barrier plot shades the same 2–6.5 band, and the readout adds "beyond the paper's 2–6.5, extrapolated" outside it. The first wave 1 version said 2–6, from the axis's last tick label, and so called the printed points at 6.25–6.5 extrapolated; the independent verification caught it the same day. An energy below the start reads "0.10 eV below the start" (it read "−0.10 eV above" at K = 1).

**Bars.** Per-ion Δφ, Δrepulsion and total are exact for this model, because the energy is defined as that sum. The page says the crystal's DFT energy cannot be split this way and draws no such bars for LLZO.

## 6. Simulated versus experimental quantities

| Quantity | Kind | LLZO value | Where |
|---|---|---|---|
| Concerted barrier | DFT NEB, 0 K, one event | 0.26 eV | Fig. 3b |
| Single-ion landscape barrier | DFT NEB, one Li removed, Li sublattice fixed | 0.58 eV | Fig. 3e |
| Activation energy | AIMD Arrhenius fit, 300–1500 K | 0.25 ± 0.02 eV | SI Table 1 |
| Conductivity at 300 K | AIMD, extrapolated | 1.3 mS/cm [0.47, 3.49] | SI Table 1 |
| Activation energy | Experiment (cubic, one Sr-doped) | 0.31–0.34 eV | SI Table 1 |
| Conductivity | Experiment | 0.31–0.51 mS/cm | SI Table 1 |
| Correlation factor f | AIMD, 900 K | 3.0 | Main text |
| Coulomb strength K | DFT, two-Li energy difference fit | 2.0 eV·Å | SI Note 3 |

**Methods** (paper):

- VASP, PAW, PBE.
- NEB in supercells with a Γ-centred 2×2×2 k-grid.
- AIMD: non-spin-polarized, Γ point, 2 fs step, NVT Nosé–Hoover, 300–1500 K, 100–600 ps.
- Disordered occupancies were ordered for the calculations.

## 7. Interpolated and schematic elements

These are labelled where they appear:

- **Ion motion.** Straight lines from start to end at one shared rate, used to follow identities.
- **Playback.** 7 s per sweep, chosen as a reading pace.
- **Opening.**
  - The opening zooms Fig. 3 to the inset, then hands over to the model at the fitted pose and scale.
  - The printed and model oxygens coincide to the registration's 3 px.
  - The handover and the turn to a working view are camera moves, not data.
- **Arrows.** Shafts and heads show start → end only.
- **One ion alone.** The lone red ion runs T2 → O2 → T3. Ions 1, 2 and 5 stay at the event's start sites as dimmed green spheres ("Li⁺ held fixed"); ion 4, at T3, is drawn as the one removed (ledger 31–32). Switching between this view and the five-ion event is a crossfade: the outgoing picture fades where it stands and the incoming one starts at its own coordinate, because the two are different calculations, not one motion. Clicked back before that fade ends, the returning set carries on from where it stands and the scrubber takes its coordinate, so nothing rewinds.
- **Average-occupancy view.** Small translucent spheres at every channel and branch site. This is schematic: their size does not encode a measured occupancy value.
- **Whole-cell view.** Positions are exact (Ia-3d); highlighting one chain is a selection, not a claim about where conduction happens.

## 8. Wave 1 fixes, 16 October 2026

Fixes from the deep-dive audit of the page. What changed in claims and depictions:

- **One ion alone** no longer shows an empty channel: the fixed lithium is drawn (ledger 31–32), and the caption note says which ions are drawn and that the arrangement is ours.
- **Whole cell**: the caption said the loops run "between the lavender ZrO₆ octahedra", but the cell view draws zirconium as lavender dots (ZrO₆ centres) with no octahedra. It now says "around the lavender zirconium ions". The key adds La (grey dots, drawn but unnamed before), and the Full framework key adds La too.
- **Key wording**: the oxide ions are keyed "Oxygen" rather than "O²⁻", so the key no longer shows the letter O for two different things (the octahedral site and the anion). Sites are keyed "Li site (T or O)".
- **K slider and readout**: see section 5 (range corrected from 2–6 to 2–6.5 in the repair round below).
- **1D-model ledger**: bars and numbers are unchanged; the names moved to a left column so a falling ion's number never covers its name. The layout is checked over the whole re-run grid.

Nothing else on the page changed in substance; no new numbers were introduced.

**Repair round, same day** (after an independent verification of the fixes above):

- **K range**: 2–6.5, not 2–6, everywhere it appears (slider bar and note, barrier-plot band, readout, ledger row 33, §5). The source is the paper's own printed Fig. 4d points, already in `curves.json`; no new number.
- **Keys** now list only what is drawn, in every view: "Oxygen" is gone in "Lithium only" (no oxygen is drawn there), and ZrO₆ and La appear in the One-ion-alone and Average-occupancy keys whenever the Full framework draws them (`keyItems` in the model, checked against the scene's own visibility rules).
- **Without 3D**, the ion chips, the One moment / Average occupancy and This channel / Whole cell choices, and the ion/site description are no longer offered: they only steer the 3D scene, which is not there. The 1D model starts below the "3D is unavailable" note.

No claim, caption or depicted value changed otherwise.

**Repair round 2, same day** (after a second independent verification):

- **Whole-cell key** now names the oxygens it draws: the channel's oxide ions stay in the cell view at 40 % strength unless "Lithium only" is chosen. Depiction unchanged; only the key.
- **Without 3D**, "Where it sits" now opens on Figure 2, the paper's figure for the lithium sites, not Figure 3.
- **1D-model ledger**: the dashed "one ion alone: 0.60" reference line breaks around any value written across it. No value or position changed.

No claim, number or depicted value changed.

**Final wave 1 repair, same day** (after a third independent verification):

- **After the opening** the caption now shows the event's own words ("Three ions leave high-energy O sites for T sites while two leave T sites for O sites…"). Before, a first-time reader kept the opening's last words, which do not say which ions climb and which fall, until they left the tab and came back. The words are the existing caption (ledger rows for Fig. 3b); nothing new is claimed.
- **Ion and site tags** fade out where the stage has no room for them beside what they name, instead of being pushed onto it. The 3D key sits on a dark plate. Presentation only.

No claim, number or depicted value changed.

## 9. Expert review

No human expert reviewed this page. All checks are automated or by the author of the page.
