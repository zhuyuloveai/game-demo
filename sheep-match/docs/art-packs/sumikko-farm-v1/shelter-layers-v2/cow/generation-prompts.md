# 生成与编辑记录

模式：内置 `image_gen`，未使用 API/CLI。三次均使用真实透明背景。参考图为当前 main 素材包的 `assets/buildings/cow-shelter.png`；动物三态未生成或重画。以下为最终提示词。生成源文件原样保留在 `sources/`，随后仅通过可编辑分组、坐标变换和共享遮罩导出交付层。

## 1. 建筑主体局部编辑

输出：`sources/barn-building-edited.png`。
原始生成文件：`exec-c5618ce4-2bf4-41e7-b531-a8ebc7557515.png`。

```text
Use case: precise-object-edit. EDIT TARGET: the supplied existing blue-roof cow barn sprite, for a layered 2D farm game. Deliver ONLY the rear building cutout on genuine transparent alpha. Preserve this exact established architecture and drawing style: rounded blue scalloped roof, cream/yellow timber walls, milk-jar sign above doorway, two dormer windows, warm brown outlines, soft pastel shading, non-pixel illustration, same front-left isometric view with ground axes at about +0.5/-0.5 slope. Remove ALL freestanding outer yard fence rails and fence posts and shrubs around the feet. Remove the half-height wooden gate across the main doorway: leave a wide fully open dark warm entrance with a simple flush threshold and visible interior floor, so animals can exit naturally onto a separately supplied yard. Remove all outdoor platform/plinth/base tile/yard ground and all cast ground shadows. Keep the roof, walls, roofed side feed niche and structural building posts; the side feed niche may contain a little integrated hay but has NO outer wooden railing. Do not redesign or embellish the building. Repair formerly hidden wall feet cleanly. No animals, no fences, no exterior paving, no slab, no separate props, no UI icons, no text added, no painted background, no checkerboard. Clean soft edge alpha with no stray pixels above the roof. The object should be isolated, centered with clear margins. This is a building-only layer, NOT a complete enclosed facility.
```

## 2. 独立院落地面

输出：`sources/yard-ground-generated.png`。
原始生成文件：`exec-95c848f4-7324-43dc-b4ca-de1599e6a5aa.png`。

```text
Use case: stylized-concept. Supporting style reference: the provided warm pastel farm sprite. Produce ONE ground-only layer for an animal yard. A single flat isometric diamond of soft pale sage/cream grass with a broad warm oatmeal earth patch in the middle, viewed at 2:1 dimetric angle: the ground diamond is exactly about twice as wide as high, its four edges slope +0.5 / -0.5. No visible thickness at all, no raised tile edge, no solid border. The broad worn earth gently blends into the pale grass, suggesting a path from the rear-central area through the open yard, with very subtle quiet grain. Keep center open and plain for five large cows. Just a few tiny soft grass tips at the outer irregular soft feathered perimeter, no large flowers or props. Preserve the reference's rounded soft NON-PIXEL pastel illustrated farm character, warm cream lighting, very gentle shading. Ground only: NO barn, NO animals, NO fence, NO posts, NO shadows of buildings, NO plinth, NO rectangular background, NO text, NO UI, NO checkerboard pattern. Genuine transparent background outside the diamond. Isolated centered ground diamond with generous transparent margin. This will be placed under a separate building and single perimeter fence, so do not paint any architecture or railing.
```

## 3. 单圈低围栏

输出：`sources/fence-ring-generated.png`。
原始生成文件：`exec-549c3ec2-610f-434c-b0d7-8bc74a127385.png`。

```text
Use case: precise-object-edit / background-extraction. Extract and redesign ONLY the wooden yard fencing from the reference, with identical soft warm honey-wood rounded posts, pale cream rails, warm brown thin outlines, pastel gentle shading and non-pixel illustrated style. Output one complete single perimeter fence ring around a LARGE EMPTY transparent isometric yard. Ground-plan diamond twice as wide as high (ground slopes exactly around +0.5 and -0.5); four vertices centered top, right, bottom, left. Keep fences LOW: total post height approximately one tenth of the ground diamond's height, and two slim low rails; it must obscure only cow feet, never cow faces. Large usable empty interior. One open entry gap on the front-left edge, between two proper endposts, about 15% of that edge's length, placed near its left end. Remaining edges continuous. Each corner shared by one post, not double posts. Include the two distant back sides as well as two near front sides. NO barn, NO walls, NO roof, NO animals, NO shrubs, NO flowers, NO hay, NO ground, NO slab, NO shadow, NO background, NO checkerboard, NO text or icons. Genuine transparent alpha everywhere except fence pixels, including entire yard interior. Entire fence ring visible, with clear transparent margins. This standalone fence component will be split into front and rear layers on a shared canvas, so it must be a clean symmetrical isometric perimeter with no extra fence inside.
```

## 4. 可复现的交付处理

`build-layers.cjs` 为素材交付组装脚本。建筑、地面、整圈栏杆各自作为原图输入；后栏/前栏共享同源裁分，不各自重生成。阴影以独立可编辑 SVG 形状绘制，动物 PNG 只做等比缩放和坐标归一。所有原画保留，不用不透明底色抠图，也不使用 AI 生成新的动物状态。
