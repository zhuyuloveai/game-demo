# Current-art motion (recovered motion-v3)

## Provenance and recovery boundary

The prior offline preview `森林边界-三阶段离线体验.html`, Library
`libfile_ddfc9e03253481919108e5df428fc6b0`, version 3, was recovered on 2026-10-27.
Its SHA-256 is `e375e97e3701aedd29bcc82200b2f65114e2ddd91223779624a5b3f2cf392b94`
(14,685,252 bytes; backing file `file_0000000016fc81f5a56bfde6192b8b9d`).

The preview contains bundled/minified runtime and CSS, **not original source,
source maps, tests or documentation**. The current readable implementation is a
behavioral reconstruction of its profile, selection, readiness and clock logic;
CSS keyframes and charm drawing were recoverable exactly. Historical claims of
583 passing tests are not evidence of this revision's test results. The dedicated
current tests are `tests/farm-current-art-motion.test.mjs`; run them afresh.

## Integration contract

- Stable outer nodes declare `data-fw-motion="animal|crop|tree|machine|ready"`.
- Crops/trees provide `data-entity` and `data-fw-ready="true|false"`.
- Animal identity uses `data-animal`; other identities fall back to entity, pen,
  then product. Stable IDs retain independent deterministic phases.
- Call `delight.refresh()` after world render/camera changes.
- Only visible items in the last non-inert `.fw-map` receive idle animation.
  Layout previews, occluded nodes, muted neighbors and motion-blocked items are
  excluded. Caps are animal 12, crop 6, tree 4, machine 4, ready 4, total 30.
- A frame-animated animal sets `data-fw-frame-running="true"` on the stable
  outer node. This excludes CSS body breathing, avoiding a second motion layer.
- Set `data-delight-dragging="true"` on an ancestor during world gestures.
  Inert/blocked/paused roots pause animations; reduced-motion and disabled roots
  disable them. Paused and reduced time is excluded from the motion clock.
- Art children move, never the outer world positions, alpha-hit rectangles,
  ground contact shadows, front fences or directional mirror transform.

## Recovered behavior

Independent seeded periods: animals 4.1–6.4 s; crops 2.7–3.9 s; trees 3.5–5.1 s;
machines 3.6–6.1 s; ready products 3.3–5.7 s. Each chooses one of three envelopes,
a phase and a bounded amplitude. Animal scales are X 1.018–1.028 / Y 1.045–1.060;
crop angles 2.0–2.8 degrees, tree angles 1.6–2.2 degrees.

Ripe crops/trees retain a static pointer-transparent star/dewdrop charm even
under reduced motion. Selected instances use staggered twinkle/dew/dot cycles.
Only an observed not-ready → ready transition can trigger an 1100 ms arrival;
at most two arrivals are active, and loading an already-ripe save never bursts.
Same-node refresh preserves the running CSS delay; replacement nodes resume
against the continuous motion clock. Destroy/disable clears idle metadata and
custom properties. The feature does not mutate economic or saved state.

## Validation

`node --test tests/farm-delight.test.mjs tests/farm-current-art-motion.test.mjs`

These deterministic DOM-harness tests cover budgets, clipping, suppression,
phase continuity, readiness transitions, pause/reduced lifecycle and CSS
invariants. They do not substitute for browser visual verification of the
latest art, clipping, fences, chicken frame registration and touch gestures.

## Latest chicken art integration — 2026-10-27

The 24 approved chicken PNGs (12 eating + 12 in-place walking) are copied,
losslessly optimized and registered in `farm-runtime-animal-animation-metadata.mjs`.
`tools/build-runtime-animal-animation.py` regenerates runtime assets and alpha
masks. Only the body image changes; the existing contact shadow and fence layers
remain independent. No scene displacement is implied by the short walk.
Other animal species keep current-art breathing; their eat/walk sequences are
not present in the source art pack and are not fabricated.

Eating starts only after a successful feed command. Hungry walking is intermittent
and independently phased by animal ID. Paints are limited to changed 12-fps
frames, with bounded visible actors and cached viewport eligibility. Hidden,
inert, reduced-motion and gesture/placement states stop frame work. Static art
is the safe fallback for missing images, unsupported skins and other species.
Alpha interaction follows the current frame and the inner art bounds. Swaying
plants use inverse rotation for art hit testing; ground-cell geometry is stable.

### Release verification

- Full Node suite: 578/578 passed, independently repeated by a second reviewer.
- Runtime release package: 999 allowlisted files; all present, including 24 frames
  and both new modules. Source ORA/art-pack working files are not packaged.
- All 24 runtime frames are pixel-identical to approved source images, with
  consistent 360×280 canvas and (180,230) contact anchor.
- Cloud Chrome, real game entry: homepage → farm loads correctly; new walking
  frame URL advances in the production scene, not just an art gallery.
- Isolated in-memory fixtures mounting the real game host/core: three layout
  stages, full pens (6 chickens, 5 of each other species), 400px viewport,
  foreground transparency and front fences visually checked.
- Real drag-feed command consumes one feed and starts eating, then returns to
  producing art. Walking frame history progresses through 0–11 independently.
- Real mature crop click adds wheat and removes the charm. Opening land UI pauses
  underlying frames; confirming expansion consumes materials and opens one plot.
- Reduced motion removes CSS motion and frame playback. Dragging from a chicken
  canvas transparent corner pans without consuming feed; release clears gesture
  blocking. Detailed pause/mask/budget edge cases also have automated tests.

This is not an FPS benchmark or a promise of 60-fps authored animation: chicken
source animation is 12 fps, while gentle transform motion is browser-interpolated.
The repository's only CI workflow is path-filtered to `kitchen-merge`; it does not
run for this farm-only change. The test/pack results above are cloud-local checks.
