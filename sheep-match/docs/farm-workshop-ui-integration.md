# Farm workshop UI art integration — 2026-10-27

Runtime source: `docs/art-packs/farm-ui-v1` v0.3-expanded, received on main `0a8363f`.

## Scope

- `farm-workshop-skin.css` is imported by the real scene host stylesheet. It skins the existing live factory, animal facility, shop, warehouse, order and confirmation controls; it does not replace their event handlers or copy preview business JavaScript.
- 64 unchanged source SVGs are copied to `assets/farm/ui-workshop/`. The local manifest records provenance, exact source metrics and unused component IDs. Packaging includes referenced runtime assets only, not the source previews.
- CSS border-image uses real source nine-slice coordinates. Uniform close/checkbox/thumb graphics remain uniform; the canopy alone stretches horizontally. Values, labels, prices, queue counts and accessible labels remain live DOM.
- Factory queue/recipe states and shop/order availability annotations are computed from current real state. These are presentation attributes only; original core validations and seed protection are unchanged.
- On 390 px mobile layouts, the factory heading, empty detail and production containers are tightened so the recipe rail and drop target can be seen together. Header close stays reachable; longer content remains scrollable. Classification tabs do not shrink their labels. Stock sliders stay native, keyboard-operable range controls, with custom track/thumb art.

## Art not force-fitted

The 20 component variants not used here remain in the source pack: divider-default, queue-slot-locked, quantity-missing/complete/disabled, notice-missing/full, six symbol-* assets, linen-corner-default, resource-pill-complete, toast-paper-info/warning, ribbon-default/complete/locked. Existing screens do not have a matching independent state/control, or already express the state via text/current art. In particular, no fake locked production slot, duplicate warning overlay or ornamental clutter was introduced merely to consume every SVG.

## Verification

- 37 focused Node tests passed: factory interaction, trade interaction and new skin/provenance tests. Full-suite/package validation is recorded by the overall integration task.
- Real cloud Chromium, fresh-path copied runtime (avoiding stale ESM/CSS cache), actual `mountFarm` with isolated QA localStorage.
- Wide factory visual checked; 390×640 iframe checked factory, shop, warehouse, order, chicken facility. This is responsive browser coverage, not a physical-phone performance test.
- Factory recipe inspection kept wheat 86; explicit production began 1/2 queue and deducted wheat 86→83. Closing returned to map; shop and warehouse routes opened.
- Warehouse selecting 50 units changed only draft quantity; visible inventory remained 83, quote became 90 coins, separate final action remained reachable. Native range/thumb and disabled 100-unit option rendered.
- Chicken facility rendered six horizontally scrollable targets with feed tool and management controls. Direct collection changed chicken 1 to hungry and eggs 21→22.
- Initial visual review caught too-tall mobile factory layout and shrinking category labels; both corrected and visually rechecked.
- Evidence under `docs/evidence/2026-10-27-ui-art/`: factory-mobile.png, shop-mobile.png, storage-mobile.png, orders-mobile.png, coop-mobile.png. The wrapper is a 390×640 viewport centered inside the cloud desktop. These are screenshots of runtime UI, not source art previews.
- No performance-SLO pass, deployment or physical-device claim is made by this art integration.
