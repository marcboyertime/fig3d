# Fig.3D — How a battery works

## Scope

This interactive visualization has two completed views: a three-dimensional graphite / lithium cobalt oxide cell, and a graphite interior with hexagonal carbon sheets and interlayer lithium. A shared reaction state drives electrode inventories, formulas, role labels and the linked graph. Separate continuously moving markers indicate the selected charge/discharge direction while the composition stays fixed. It is an idealized insertion model, not a calibrated battery, molecular-dynamics trajectory, manufactured cell drawing or calculated crystal phase diagram.

The 3D cell is a slab cutaway. The negative graphite electrode stays on the left, the positive cobalt oxide on the right. Stable polarity and material identities remain visible. **Anode means oxidation; cathode means reduction.** Those electrochemical roles swap on charging, and the scene shows them: each electrode's callout carries its material, its fixed polarity sign and the active role ("Graphite − / Anode · oxidation" while discharging); on narrow stages the role follows the sign alone ("Graphite − / Anode"), with oxidation and reduction in the panel beside the stage and in each callout's accessible name. The toolbar above the stage carries the persistent mode text, "DISCHARGING" or "CHARGING", beside the Discharge/Charge switch. In battery engineering, anode/cathode often refer to discharge identities; the visualization instead names the active reaction explicitly.

## Reaction model

Take equal amounts of C₆ and CoO₂ host formula units. The illustrated partial discharge window is

Li₀.₆₀C₆ + Li₀.₆₀CoO₂ → Li₀.₃₀C₆ + Li₀.₉₀CoO₂.

Let `p ∈ [0,1]` be the selected mode's progress. In discharge, `d=p`; in charge, `d=1−p`. At either mode's current state:

- Graphite lithium fraction `xₙ = 0.60 − 0.30d`.
- Cobalt oxide lithium fraction `xₚ = 0.60 + 0.30d`.
- The sum is always 1.20 Li per equal pair of host units.

The cumulative reaction extent from the selected mode's start is `ξ=0.30p`. On a twenty-host bookkeeping basis, the amounts transferred are `20ξ=6p` Li equivalents and the same number of electron equivalents. Both half-reactions advance concurrently.

Discharge half-reactions:

- Li₀.₆₀C₆ → Li₀.₆₀₋ξC₆ + ξLi⁺ + ξe⁻.
- Li₀.₆₀CoO₂ + ξLi⁺ + ξe⁻ → Li₀.₆₀₊ξCoO₂.

Charge half-reactions:

- Li₀.₃₀C₆ + ξLi⁺ + ξe⁻ → Li₀.₃₀₊ξC₆.
- Li₀.₉₀CoO₂ → Li₀.₉₀₋ξCoO₂ + ξLi⁺ + ξe⁻.

Switching mode replaces `p` with `1−p`, so the physical composition stays unchanged. The visible slider sets graphite lithium content x directly between 0.300 and 0.600; it does not change when mode reverses. The inventory graph uses the same axis (graphite x from 0.30 on the left to 0.60 on the right) in both modes, so one composition has one place on it; a small arrow at the cursor shows which way the selected mode moves x. The half-reactions remain cumulative from the selected mode's starting point (discharge from x = 0.60, charge from x = 0.30), as the page now states. Motion does not advance or loop this finite reaction window. A quiet Pause motion control stops the direction markers. The slider is not a complete cell state-of-charge gauge. None of these chosen compositions or equal host quantities is a measured electrode loading or capacity balance.

Lithium-ion direction is graphite → oxide on discharge and oxide → graphite on charge. Electrons follow the same net electrode-to-electrode direction through the electronic solids and external circuit. Conventional current is opposite to electron motion in that external branch. Discharge uses a load; charge uses an external source. Chemical free energy can supply electrical work during discharge; an external source supplies energy to drive the reverse process. No voltage, current, power, overpotential, heat or physical timescale is calculated.

## Transport geometry

`battery-model.mjs` exports the exact 3D bounds and paths consumed by `battery-scene.mjs` and the checks. Lithium markers lie between the electrode interfaces, within the electrolyte. Electron markers start and end inside the electrode solids and take a route outside the electrolyte through the upper external circuit. Separator geometry denotes an electrolyte-filled porous insulating region, not pores resolved at scale.

The graphite and oxide solids contain illustrative lithium inventory marks. In the oxide one mark sits at the centre of each of twenty of the twenty-seven grains, in an interleaved order so a partial fill is spread through the volume, not swept in from one face. Lithium in LiₓCoO₂ is held inside the oxide host (source 4), so the marks sit in the grains, not in the pores between them where electrolyte would be; like the graphite marks they encode a fractional mean occupancy, not computed site positions. The grains are drawn at a particle scale and the graphite interior at an atomic scale in the same overview; that mixing is not yet signalled on screen. Electrolyte markers indicate net transport, not an additional inventory of explicitly tracked ions. The electrolyte is a steady-throughput reservoir with zero net lithium accumulation. Real counterions, solvent, SEI, electrode porosity, concentration gradients, double layers and side reactions are omitted.

## Graphite geometry and its limits

The interior is generated from a finite honeycomb patch: 37 hexagons, 96 unique carbon positions and 132 bonds per sheet. Four parallel sheets share the same registry. Carbon–carbon bonds all have length 0.65 view units; the gallery spacing is 1.67 view units. These are display units. All edges belong to hexagonal rings; interior carbon degree is three and exposed edges have lower coordination. A finite patch does not include edge termination chemistry.

Lithium positions are at hexagonal hollow coordinates, halfway between neighboring carbon sheets. The selected hollow sublattice gives 13 sites per gallery and 39 across three galleries. Aligned layers are a simplified local intercalated-graphite motif; ordinary graphite is commonly AB stacked, and lithiation changes registry, staging and ordering. We do not claim a single uniform stage for the partial x values in this visualization. The detailed structure at each composition is not solved.

Each displayed lithium site's opacity is a fractional occupancy weight. Their summed weight is exactly `39xₙ`. This is a linked visual encoding of the mean graphite fraction, not a claim that the finite displayed carbon patch has an atomistically correct LiₓC₆ stoichiometry. This distinction avoids treating a boundary-truncated patch and arbitrary number of representative galleries as a periodic formula unit.

The larger highlighted marker explains entry/exit through an exposed edge parallel to the sheets. It is not an additional inventory atom. It starts at a central hollow whose straight path to the edge meets no lit site at any slider composition (`galleryStartSite`, the top gallery), and it grows out of its site and shrinks away at the edge, so it never doubles up on a drawn lithium or jumps back to its start. Its interpolation does not predict hopping barriers, residence times, solvation, the interface reaction mechanism or microscopic diffusion. The carbon framework stays fixed; real composition-dependent layer relaxation and staging are omitted. The camera moves into the same graphite group visible in the overview, so layer orientation and species identity persist.

## Source record

1. **U.S. Department of Energy, DOE Explains…Batteries.** [Authoritative explanation](https://www.energy.gov/science/doe-explainsbatteries). Supports coupled ionic/electronic transport and conversion between chemical and electrical energy. Its electrode naming follows conventional battery discharge identities; our active roles use IUPAC definitions.
2. **IUPAC Gold Book, anode and cathode.** [Anode, DOI 10.1351/goldbook.A00370](https://doi.org/10.1351/goldbook.A00370); [cathode, DOI 10.1351/goldbook.C00905](https://doi.org/10.1351/goldbook.C00905). Oxidation defines the anode; reduction defines the cathode. Indexed authoritative definitions were checked; some direct HTML/PDF endpoints returned access errors.
3. **Ohzuku, Iwakoshi & Sawai (1993), “Formation of Lithium-Graphite Intercalation Compounds in Nonaqueous Electrolytes and Their Application as a Negative Electrode for a Lithium Ion (Shuttlecock) Cell,” Journal of The Electrochemical Society 140, 2490–2498.** [DOI 10.1149/1.2220849](https://doi.org/10.1149/1.2220849). Primary basis for reversible lithium–graphite insertion. No quantitative data from this paper are reproduced.
4. **Mizushima, Jones, Wiseman & Goodenough (1980), “LiₓCoO₂ (0<x≤1): A new cathode material for batteries of high energy density,” Materials Research Bulletin 15, 783–789.** [DOI 10.1016/0025-5408(80)90012-4](https://doi.org/10.1016/0025-5408(80)90012-4). Primary lithium–cobalt-oxide insertion research. Bibliographic record and publisher abstract checked in the original model audit; no voltage curve is reused.
5. **Hazrati, de Wijs & Brocks (2014), “Li intercalation in graphite: a van der Waals density-functional study,” Physical Review B 90, 155448.** [DOI 10.1103/PhysRevB.90.155448](https://doi.org/10.1103/PhysRevB.90.155448); [open author text](https://arxiv.org/html/1410.5632v1). Checked its carbon-layer registry, interlayer insertion and composition-dependent staging discussion. This motivates the geometry and its stated limits. No energies, calculated diffusion paths or phase predictions are transferred into the visualization.
6. **“Lithium intercalation into bilayer graphene,” Nature Communications 10, 275 (2019).** [Primary experimental and computational article](https://www.nature.com/articles/s41467-018-07942-z). Supports interlayer insertion via edges or defects and the importance of layer registry. Bilayer results are not treated as a quantitative model for bulk graphite.

Sources were checked on 30 September 2026. Human expert review remains optional; model/software checks are not empirical validation.

## Reproducible verification

Run from the site directory:

```sh
node battery-verification.mjs
node battery-controller-verification.mjs
```

Scientific and geometric verification passed:

- 2,002 progress states spanning both modes, checked against independent twenty-host equations.
- Lithium conservation, electron/Li transfer coupling, equal release/acceptance and balanced Li/C/Co/O/charge in both half-reactions.
- Partial stoichiometry limits, monotonic state changes and mode-switch composition continuity.
- Deterministic scrubbing and invalid-input rejection.
- Actual shared 3D route endpoints within solids; no electronic path inside the electrolyte; all nine ionic rows within the electrolyte.
- Unique honeycomb carbon positions, six-member rings, bond lengths and degrees.
- All lithium sites inside galleries at hexagonal hollows; gallery entry paths remain parallel to sheets.
- Exact fractional population encoding for graphite.

Added 16 October 2026: one unmirrored graphite-x axis shared by slider and graph (`compositionFraction`, and the controller check that a mode switch moves neither lines nor cursor); a gallery path clear of lit sites for every x from 0.300 to 0.600; end fades on every looping marker (`endFade`); paired ion/electron departures, checked on the scene's own `setState` with stub markers (ion i and electron i at the same route fraction in every step of a loop in both modes, each pair wrapping once, together, at almost no size); callout presence that only falls while the camera flies (`calloutPresence`); the `?reduced` and `?fallback` review modes, and a fallback status that announces no motion.

Added in the second repair round the same day: rider callouts checked on the scene's own `setFlow` and `rider` through seventy seconds of seeded play, pauses and mode switches (the words never exceed the soft window while ions move, hand over only once gone, change by at most 2dt/300 per frame, and settle on a fully visible ion when paused; reduced motion shows them in full at once); direction arrows checked on the scene's own `advance` through a dive, a return, a mode switch, a switch undone within 64 ms and a turn back mid-dive (an arrow is redrawn or turned round only once it has faded out, none fades in while the camera flies, and the settled view's arrows are back in full).

Added in the final wave 1 round: no rider takes up an ion and no rider's words rise while the camera flies (27 flights at every offset from the hand-overs); the gallery ion's words, now a one-marker rider, never cut or pop, stay within their window while the ion runs, and when paused are in full inside the window and gone outside it (pauses placed on both soft edges, the middle and outside the window in both modes); and stage gestures on the scene's own `pointerDown`/`pointerMove`/`pointerUp` (`gestureStep`): a slow mouse drag turns and is never a tap, a jittery click is a tap and never turns, a finger that sets off vertically neither turns, tips, stops the spin nor picks, and a sideways finger turns. Each of these checks fails on a mutated copy that brings the old behaviour back (ten mutations, all caught).

Maximum bookkeeping residual: **3.552713678800501×10⁻¹⁵** equivalents, floating-point roundoff. Graphite bond-length range: 0.6499999999999995–0.6500000000000006 display units.

Controller checks execute the real controller with a stub renderer and DOM, covering the persistent mode text on the stage toolbar (markup and the visible, exposed word after each switch), continuous fixed-composition motion, no automatic advance or reset of reaction state, velocity reversal on charge, slider coupling, reduced-motion static arrival, explicit Resume motion, pause after preference changes, preserved composition and reversed roles on mode change, graphite entry/return and hidden-tab pause. They do not substitute for actual WebGL/browser inspection, which is performed separately by the parent task.

## Implementation and third-party asset

- `battery.html` and `battery.css`: accessible controls, explanatory content, shared typography integration and responsive layout.
- `battery.js`: one reaction state and user interactions.
- `battery-model.mjs`: declarative bookkeeping, paths and graphite geometry.
- `battery-scene.mjs`: actual Three.js geometry, linearized material colors, lighting, damped bounded camera rotation and selection. It also exposes an optional label-free, noninteractive configuration for the parent-owned homepage teaser.
- `battery-verification.mjs` and `battery-controller-verification.mjs`: reproducible checks.
- `assets/battery-three-r128.min.js`: Three.js r128, extracted unchanged from the user-supplied `rocksalt-li-pathways (4).html` bundle. Original copyright/SPDX header retained; see `assets/battery-three-LICENSE.txt`. No source application's interface or teaching logic was copied.

The shared `visual-language.css` and Sora font are maintained by the parent site task. The visualization remains local-only; no site was published.

## 16 October 2026 — wave 1 fixes

From the deep-dive audit of this page. Each change was captured before and after in headless Chrome with real-GPU WebGL at 1512×982 and 390×844 (scratchpad `work2/battery/before` and `after`).

- **One graph axis.** The graph used to mirror between modes, so one composition had two places on it and the cursor disagreed with the slider in discharge. The x axis is now graphite x (0.30 → 0.60), the slider's own scale, in both modes; the half-reaction note names each mode's starting point. Checked by `battery-controller-verification.mjs` (fails on the old controller).
- **Roles on the scene.** The owner's battery contract asks for the anode/cathode roles on the scene and role plus polarity sign on phones. The electrode callouts now read "Graphite −" and "Cobalt oxide +" with the active role beneath, swapping (with the shared blur swap) on mode change. The old role-swap and label CSS that nothing used is deleted.
- **Mode switch beside the stage.** Discharge/Charge moved from the title row to the stage toolbar, replacing the non-interactive "DISCHARGING" tag; on phones it takes its own row above the view tabs. Its top is 104 px above the stage on a 390 px phone (was 718 px; this entry first said 94 px). *Correction, final round:* removing the "DISCHARGING"/"CHARGING" tag broke the battery contract's "persistent mode text"; it is back, on the stage toolbar beside the switch (see the final round below), and is on screen whenever the explorer is framed (skip link, footer link, `#explorer`).
- **Callouts never in the wrong place.** Two causes. Callouts were re-chosen while the camera was still flying back from graphite, so sides and positions were picked on a moving view; they are now chosen only once the camera settles. *Correction, final round:* a rider hand-over could still take up a new ion mid-flight, so the Electron words could come in faintly at a new anchor during a dive; that was fixed in the final round. And the callouts are buttons, so the generic button transitions made each new one glide in from the stage's top-left corner (under the view tabs) while fading; `battery.css` now turns transitions off for them. Checked frame by frame on return.
- **Dive pacing.** The dive was an exponential ease (τ 145 ms) with the cell gone after about 125 ms. It is now a critically damped spring that settles in about one second, and the cell stays in view for the first third, so the graphite patch is seen in place before the camera enters it. Owner judgement on the exact pace is still open.
- **No teleporting markers.** The highlighted gallery ion and the circuit electrons used to jump from the end of their route back to the start; they now fade in and out at both ends (as the electrolyte ions already did). The gallery ion's path no longer passes through a lit site.
- **Paired ions and electrons.** Electron i now shares ion i's phase: each pair leaves graphite in the same step and arrives in the oxide together.
- **Oxide lithium inside the grains.** See Transport geometry above.
- **Separator reachable.** Pointing at the separator used to report the electrolyte, whose box encloses it; the separator now wins when it is the first solid the ray meets (6 of 63 probe points over the stage, was 0).
- **Smaller fixes.** Background `#0f111b` (owner's 14 October value; was `#0d111b`), with the theme colour and callout halo following; every text colour keeps more than 8:1 contrast. "Separate solids, connect ions" lost its periods. Formula subscripts in the notes and readout labels use real subscripts instead of characters the font lacks. `?reduced` and `?fallback` now work as on the other pages.

Not changed here: no energy or voltage view, no scale signalling, no staging, no oxide interior, no phone recomposition and no styled evidence page (wave 2 or owner decisions). Untested: Safari, Firefox, real phones, screen readers and OS-level reduced motion (only the `?reduced` alias was exercised). The homepage teaser reuses this scene, so it also shows the oxide marks in the grains and the paired, fading electrons.

### 16 October 2026 — wave 1 repairs after independent verification

An independent check confirmed the fixes above and found four small regressions and two missed bugs. Each repair was captured before and after in headless Chrome with real-GPU WebGL (scratchpad `work2/battery/repair1`).

- **Callouts fade when the view changes.** Clicking a view tab or Go inside graphite cut every callout in one frame (the shared layout snaps to its target when the page lays it out). The callouts of the view being left now stay on their anchors and fade out with the camera over about 0.2 s; none returns mid-flight, even if the reader turns back, and the new view's callouts still wait for the camera to settle. Per-frame logs: the largest opacity step is 0.13 (was 1.0) and the largest label move is 22 px per frame, under the shared 46 px jump threshold.
- **Riders hand over with a fade.** Found while checking the above, and older than wave 1: the Lithium ion and Electron callouts were cut when their marker left its window and popped back on the next one, about every two seconds; the gallery ion's callout did the same. Their words now fade out as the marker nears the end of its window and fade in after the hand-over (largest step 0.09 per frame).
- **Phone roles off the separator.** On narrow stages the role follows the sign alone ("Graphite −" / "Anode", "Cobalt oxide +" / "Cathode", the contract's role plus polarity sign); oxidation and reduction stay in the panel beside the stage and in each callout's accessible name. The graphite words hang straight down into the clear space under the cell's front edge instead of across the separator grid. Checked at 360, 390 and 600 px.
- **Graphite patch reachable through the electrolyte.** In the cell view the right half of the graphite patch, seen through the electrolyte box, reported the ionic path. A ray through the electrolyte that goes on into the graphite electrode through the patch's bounds now reports graphite (22 more of 1,050 hover-probe points; 75 against 53); the electrolyte still answers between the patch and the separator and beside the oxide.
- **Fallback status.** Without the 3D view the live status no longer announces motion ("Discharging, graphite composition 0.450.").
- **Toolbar targets.** The mode buttons on the stage toolbar are 41 px tall again (37 px after the move), and 44 px, with the view tabs, on touch screens.
- **A real pairing check.** The Node check of paired departures compared one expression with itself. It now runs the scene's own `setState` (see Reproducible verification) and fails if the electrons run on their own phase or wrap at full size.

Untested: Safari, Firefox, real phones and touch hardware (the 44 px rule was checked under Chrome's touch emulation), screen readers, OS-level reduced motion.

### 16 October 2026 — wave 1, second repair round

A second independent check confirmed the repairs above and found one regression and two missed bugs. Each was captured before and after in headless Chrome with real-GPU WebGL at 1512×982 and phone sizes (scratchpad `work2/battery/repair2`; `js/run.sh before|after` reruns the captures; the before loop layouts came from a scratch copy of the site holding the pre-repair battery files).

- **Rider words through a mode switch or a pause.** The hand-over fade added in the first round measured the distance to the far end of the window, which flips when the direction reverses: a "Lithium ion" fading out jumped from 0.18 to 1 in one frame when Charge was pressed, and a just-picked one dropped from 0.26 to 0.09. A paused or reduced-motion view could also keep the words at part opacity for good (0.49 after a pause, 0.648 under `?reduced` in charge). The riders now follow `riderStep` (battery-model.mjs): a soft window that is the same either way round, words that rise at most dt/300 and fall at most 2dt/300 per frame, a hand-over only once they are gone, and, while nothing moves, a marker parked on the soft edge is let go and the most central ion taken up. Between hand-overs the hidden anchor stays on the ion just let go, so words still fading never jump to the stage corner. The electron's window now ends at 0.29 of its route (0.71 in charge), so its plate lets go before reaching the tail of the circuit arrow. Per-frame logs: the largest step at a switch is 0.07; after a pause and under `?reduced` the words are at 1. *Correction, final round:* this covered the cell's two riders only; inside graphite the gallery ion's words still froze part-faded when the motion was paused near either end of their window (0.58 and 0.88 in the final round's before captures), fixed in the final round.
- **Direction arrows never snap.** The arrows of the arriving view used to fade in with the camera at full length, then vanish and regrow when it settled (a 100–180 px arrow cut to 2–4 px in one frame); a mode switch cut them the same way. Arrows now never show before their view's callouts may (`arrowLevels` takes the lower of the camera fade and the callout presence), so they draw in only once the camera has settled, and only if they had faded out: after a turn back mid-flight they return as they were. A mode switch fades the old arrows out (240 ms) before drawing them the other way. Per-frame logs: no arrow loses more than half its length in a frame (7 cuts before on desktop, 0 after).
- **Words on glass plates.** The moving ion's words rode across the separator grid, and the gallery ion's across the carbon sheets, so lines struck through them. The battery callouts now use the shared annotations' dark glass plates (as nanoparticle, silicon nanowire and the interwoven battery do), the owner's 6 October rule for busy scenes.
- **Words clear of the arrows.** On 360–390 px phones the ion arrow touched the "Cobalt oxide +" title; on narrow stages those words now hang a little lower (8 px clear). Inside graphite the moving ion's words lay over the gallery arrow at every width; they now hang below the gallery (the arrow runs just above it), and on narrow stages, where the short path leaves room for one set of words, "Exposed edge" is hidden as a secondary callout (the arrow's end and the panel still name the way out). Over a full loop in both modes no callout box meets an arrow or another callout at 390, 768 or 1512 px (*correction, final round:* at 360 px the "Graphite −" plate ended about 2 px from the ion arrow's tail, fixed in the final round) (before: the gallery ion's words over the arrow at every width, the oxide words on the phone arrow).

Untested: Safari, Firefox, real phones, screen readers and OS-level reduced motion. The plates use `backdrop-filter`, already used over WebGL on three other pages. Under `?reduced` the shared annotations still drew new callouts in over 0.76 s, because they read the OS setting, not the `?reduced` alias. *Correction, final round:* the shared annotations now read the alias too, and the scene passes its own reduced-motion source; under `?reduced` every callout, inside graphite as well, is at full opacity in the first logged frame after a view change.

### 16 October 2026 — wave 1, final repair round

A third independent check confirmed the earlier repairs and left four small regressions and one missed bug; the round also took up three general rules from the other pages' checks (scrolling on a phone stage is not stage input, a slow drag is not a tap, labels never cover what they name or flip sides in one frame). Each item was captured before any edit and again after, in headless Chrome with real-GPU WebGL (scratchpad `work3/battery/before` and `after`; `js/` holds the driver with real touch and mouse paths, the per-frame hook and the analysers; `mut/` the mutation runs).

- **Persistent mode text is back.** The battery contract asks for an easy toggle *with persistent mode text*; the first round had removed the "DISCHARGING" tag when it moved the switch. "DISCHARGING" (mint) or "CHARGING" (violet) now sits on the stage toolbar beside the switch. Where the stage column is narrower than 560 px (phones up to about 610 px wide, and the two-column layout from 801 to about 917 px) the switch takes its own full-width row and the mode text ends the views' row; a first version keyed this to the window width and squeezed the toolbar between 801 and 900 px, which the container query fixes. Both words share one place and cross-fade over 0.3 s; only the current one is exposed to assistive technology. Checked at fifteen widths from 360 to 1512 px (no overflow, no wrapped view tabs), and by the controller suite.
- **Scrolling on a phone stage is not stage input.** A vertical swipe that started on the stage scrolled the page but also tipped the cell (camera moved 1.63 units in the before log), stopped its spin and cleared the hover preview, because the drag began on pointerdown. A press now decides by how far it has gone from where it went down (`gestureStep`, 6 px): a finger that sets off vertically is the page scrolling and touches nothing on the stage; a sideways one turns the cell as before. After: the page scrolls 172 px and the camera does not move; a sideways swipe still turns the cell and a tap still pins.
- **No drag is a tap, no tap is a turn.** A slow mouse drag already kept its pin (the distance was measured from the start), but a click with a few pixels of jitter both pinned and turned the cell. Nothing turns now until the pointer leaves the 6 px slop; a press that never leaves it is the only tap.
- **No rider comes in during a flight.** Diving from the cell, a rider could take up a new ion and its words rose faintly at the new anchor (Electron 0.011 → 0.014 at a camera step of 0.26 in the before log). Riders now take up ions only while the camera is settled on their view, and their words may only fade in flight. After, over six timed dives: no cell callout rises while the camera moves.
- **Gallery ion's words when paused.** Paused near either end of its window, the gallery ion's words held 0.58 (charge) or 0.88 (discharge) for as long as the pause lasted. They now follow the same rider step as the cell's riders: while the ion runs they fade with the window; when it stops inside the window they come to full words (largest step 0.06 per frame) and when it stops outside it they stay gone; on resume they fade with the window again.
- **Graphite words clear of the ion arrow on narrow stages.** At 360 px the "Graphite −" plate ended 2 px from the ion arrow's tail (5 px from its head in charge). On narrow stages the graphite ring now sits further left on the same front edge, so the plate ends 16 px short of the arrow at 360 px and 24 px at 390 px; wider stages are unchanged.
- **Graph direction arrow on phones.** It was 14 × 5 px at 390 px. On phones it is drawn 1.8× larger, now 26 × 10 px (24 × 9 at 360 px), still turning with the mode.
- **Reduced motion.** The scene now hands its own reduced-motion source to the shared annotations; with the shared fix, every callout is at full opacity in the first frame after a view change under `?reduced`.

Checked as well: over 8 s loops of both views in both modes at 360, 390, 521, 600, 768 and 1512 px, no callout's words cover its own ring, none changes side while visible, none jumps more than 46 px, and no callout box meets a direction arrow (head included) or another callout; through mouse and touch drags and two mode switches no callout flips side in one frame (one side change during a drag happened, as designed, by fading out and back in). `?fallback` shows the mode text and announces no motion; the homepage teaser still renders; no console errors.

Not changed: the dive pace, the plates, the phone wording and callout set (owner decisions), and the wave-2 items listed in the earlier entries. Untested: Safari, Firefox, real phones and touch hardware (touch was emulated through Chrome's DevTools protocol, which does send the browser's own pointercancel when it starts a scroll), screen readers, OS-level reduced motion and browser zoom.
