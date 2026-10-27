# Terrain and clearing art validation — 2026-10-27

## Integration
- Runtime: 18 contour connector PNGs + one fog PNG; 4 eight-frame atlases (dust, wood chips, stone chips, land opening). Total additional binary payload 244,608 bytes. No frame duplicates or source/preview dependency.
- Contour topology calculated before viewport culling; corner/end ports match ground axes ±0.5, with no arbitrary bitmap rotation. Road geometry, including placement drafts, invalidates the soil-edge model; clock-only updates reuse it.
- Successful committed expansion uses the patch center; successful actual obstacle removal uses the removed object's ground anchor. Failed, canceled and no-op commands produce no effect. Images are preloaded; bounded shared rAF effects use asset cadence 12/16 fps, pointer-transparent nodes, and cleanup.
- Playback begins on first rAF opportunity with an absolute 1,500 ms creation deadline. Slow commits cannot consume the entire animation before first paint; expired/background/reduced-motion effects do not replay. This does not fix the underlying long main-thread tasks.

## Browser: actual UI, formal host/core/store
Cloud Chrome tab 15, localhost:46280, isolated fixture `tests/farm-terrain-browser.html?stage=3`; private QA save, no player data. All game commands were issued through native locator clicks, not direct dispatch.

- Expanded land_01: successful command; materials 25 → 23; actual contour opens outward. No broken connector/fog images.
- Tree cancel: no command/cost/effect; saw remains 25. Reopened the tree tool and confirmed: saw 24; tree removed; dust + wood effects at tree anchor.
- Stones: actual shovel confirmations remove the selected rocks, decrement the tool once and emit dust + stone effects at their individual anchors.
- Reduced motion: enabled through real settings UI; next stone removal succeeds and decrements tool without adding any atlas node.
- Latest cold-path run persisted in `terrain-browser-results.json`: four successful economic commands; all seven effect nodes cleaned; active=0; brokenImages=0. Observed atlas positions include land frames 1/2/3/5/6/7, wood frame 1, stone frame 7. Frame skipping still occurs under the cloud browser/main-thread workload; no claim of stable 12/16 fps or performance SLO compliance.
- Browser error sample contained extension metadata errors from chrome-extension://, not game errors. This is not an exhaustive error-log audit.

Screenshots: terrain-before.png, terrain-expanded.png, terrain-tree-cleared.png, terrain-stone-cleared.png, terrain-final.png. Final JSON is the latest cold run; earlier cancel/reduced-motion observations were separate UI runs.

## Bug corrected during UI validation
Expanded obstacle IDs such as land_01_5_5 were mistaken for land patch IDs by startsWith('land_'), throwing on an undefined patch and retaining stale confirmation markup after cancel. Exact LAND_PATCHES membership now distinguishes them. A confirmation without an active preview returns before dispatch, so stale/double confirmations cannot send an incomplete command. Core economic validation was not changed.

## Focused automated result
`node --test tests/farm-workshop-terrain.test.mjs tests/farm-delight.test.mjs tests/farm-world-performance-regressions.test.mjs`: **46 passed, 0 failed**.

Includes contour ports/culling and road draft cache, actual committed-state mapping, frame gutters/cadence, effect cap/cleanup, reduced motion/background/destroy, delayed first rAF at 900 ms with visible frames 1–6, expiry beyond 1,500 ms with no late replay, exact obstacle-ID classification, and stale confirm no-dispatch. Duplicate confirmation and long-delay timing are automated regression evidence, not falsely labeled browser gestures.
