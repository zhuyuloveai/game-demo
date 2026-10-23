# 冬季独立设计：星雪小村

- 页面名称：冬日雪乡；主题场所：星雪小村。
- 生成日期：2026-10-24。
- 生成方式：内置 ImageGen，未使用 CLI/API fallback。
- 交付：`assets/farm/winter-scene-v2.png`、`assets/farm/winter-stickers-v2.png`、`docs/farm-designs/winter.json`。
- 参考画风：`assets/farm/sticker-meadow.png` 的纸张、水彩背景，及 `assets/farm/farm-stickers-spaced.png` 的暖棕描边、厚白贴纸边、圆润表情。构图与场所重新设计。

## 构图与解锁

背景是浅亮蓝紫暮色下的斜坡雪乡，地势右高左低；唯一冰湖在左下，弯曲脚印从中下方向右上雪坡延伸。木屋、雪松、动物、雪人与灯篱都没有预绘进背景，因此空场景与逐步解锁真实对应。右侧木屋与左侧冰湖形成不对称构图，区别于春季草地或其他季节换色。

- 标题区域：高度 12%–27%，保持明亮且安静的天空留白。
- 导航区域：高度 31%–37%，中央没有实物或贴纸遮挡。
- 场景区域：主要在高度 40%–75%；右坡木屋、门前灯篱与雪人，中部企鹅脚印，左湖海豹，右下白狐。
- 按钮区域：高度 78%–100%，浅色雪面可承载按钮。
- 六组顺序：雪人／灯篱 → 围巾企鹅 → 暖灯木屋 → 覆雪松树 → 冰岸设施／海豹 → 白狐和更多伙伴。
- `pond` 是冰鞋、蓝扶栏和灯笼组成的**岸边设施**，摆在原有冰湖右上岸边（图层 x=33%、y=56%、w=24%）。它不含另一片蓝色湖面，避免重复冰湖。
- 企鹅使用 `sheep` 槽位，海豹使用 `duck`，月亮使用 `sun`，雪人使用 `flowers`，白狐使用 `chick`。

## PNG 来源及取景框

背景原图：
`/Users/zhuyu/.codex/generated_images/01a169a9-97c9-7ec1-9f3f-2741bc848498/exec-1d47d56f-2843-4070-ad1a-f98472c39fb0.png`

贴纸原图（选择的最佳画风版本）：
`/Users/zhuyu/.codex/generated_images/01a169a9-97c9-7ec1-9f3f-2741bc848498/exec-7db43229-7223-4cc0-a1f1-3bbd38b2f817.png`

两张交付 PNG 均为原图直接复制，未修改像素。曾通过内置 ImageGen 尝试两次缩小／重排留白，但未能稳定得到严格数学中心对齐，未采用这些版本。

背景为 1024×1536，图集为 **1448×1086 RGBA**，整体比例严格 4:3，行列顺序为 4×3。原图主体大体位于对应格子，个别主体略越过理想格线，不能直接依赖等分 CSS 背景裁切。为完整保留生成画风，配置提供 `atlas.frames`，由页面用各图标的独立 SVG viewBox 取景。

取景框以 alpha > 32 的主要连通域为依据，再向四周各扩展 2 px，覆盖白色轮廓的抗锯齿边缘；忽略极淡的独立透明噪点。原图 alpha=0 的像素占约 58.54%，透明背景为真实 alpha，不是棋盘或纯色底。大部分主体 alpha 约 253。

`atlas.framePadding = 0.125` 的约定：先以各 frame 的最长边建立居中的正方形取景框，再在每侧增加该最长边的 12.5%。因此主体最长边约占图层方框 80%。JSON 中的位置与宽度按这一占比设计。不要把 framePadding 解释为固定像素。

| 槽位 | 图标 | frame [x,y,width,height] |
|---|---|---|
| tree | 雪松 | [51,49,278,306] |
| grass | 雪草 | [412,141,289,173] |
| star | 银金星星 | [784,75,258,249] |
| cloud | 夜云 | [1120,115,297,191] |
| sun | 弯月 | [85,409,248,262] |
| pond | 冰岸设施 | [392,435,332,225] |
| sheep | 围巾企鹅 | [774,401,272,283] |
| duck | 小海豹 | [1110,468,314,206] |
| house | 暖灯雪顶木屋 | [38,730,319,294] |
| fence | 暖灯矮篱笆 | [397,831,325,181] |
| flowers | 雪人与灯笼 | [780,720,271,313] |
| chick | 小白狐 | [1117,724,281,301] |

页面对冬季 `pond` 不宜附加夏季水波圈；自然冰湖本体已经绘在背景里。木屋若沿用烟囱动效，宜以实际屋顶位置校准。

## 视觉验收

- 已查看背景与图集完整生成图，冬季场所独立、雪坡方向明确、左下单一冰湖，明亮蓝紫夜色没有压暗标题区域。
- 空背景没有预绘房子、树、雪人或动物；解锁资产均来自独立贴纸。
- 12 个槽位内容及排列顺序正确；企鹅／海豹／白狐／弯月等明显区别于原牧场素材。
- 贴纸保留暖棕轮廓、厚白边、水彩质感、柔和脸颊与暖灯点缀。
- 用只读 PNG 解码校验了 RGBA 透明通道，并对 12 个主连通域做了 bbox 测量。
- 等分格线的严格留白不是生成原图的保证项；生产裁切必须使用已提供的 atlas.frames。该修正由页面布局承担，原图不变。
- 未修改主程序，未提交或部署；最终实机页面合成由主任务完成。

## 完整背景提示

```text
Use case: illustration-story.
Asset type: portrait mobile casual game's empty winter home background, 2:3 aspect ratio, 1024 × 1536 pixels.
Create a wholly new composition, not a recoloring of the supplied meadow reference. Match the reference's delicate children's picture-book watercolor paper texture, handmade 2D shapes, gentle depth, and polished cute simplicity. The reference sticker sheet is a style cue only.
Scene: a dreamy winter location called Star-Snow Village before any buildings or inhabitants arrive. A pale periwinkle and lavender twilight sky fills the top 43% of the canvas; it is softly luminous, cheerful and readable, never dark navy. A snowy hillside slopes diagonally from high on the RIGHT at about y=43% down toward the LEFT at y=60%, distinctly asymmetrical. Rounded, soft blue-lavender distant snow ridges, without trees, frame the very low horizon.
Composition: a single small pale-turquoise frozen lake sits in the lower-left scene area, centered near x=23%, y=66%, occupying approximately x=6–41%, y=61–71%, a flattened irregular oval with a thick soft snowy bank and subtle ice reflections. Exactly one lake. A winding trail of tiny paired footprints starts near x=48%, y=78%, curves past the right bank of the lake at x=44%, y=65%, and leads up toward the empty right-hand snow terrace near x=73%, y=55%. The right terrace at x=57–89%, y=43–61% must remain broad and clear for a cabin sticker added later. No cabin is painted now. Gentle luminous snow and very subtle lavender shadows, three or four tiny neutral snow mounds, restrained detail.
UI-safe zones: top y=0–12% airy sky; y=12–27% completely quiet luminous lavender negative space for a large title; y=31–37% equally quiet space for chapter navigation; the visual location and action are focused within y=40–75%; bottom y=78–100% is simple pale snowy negative space for buttons, with no focal object.
Do not paint any tree, pine, house, hut, fence, snowman, lantern, animal, penguin, seal, fox, moon, sun, star-shaped icon, or cloud sticker. Those are all separate unlockable or atmospheric game sprites. No text, no letters, no numbers, no logo, no UI, no border, no watermark. Opaque background. Soft painterly terrain, no hard sticker outlines on the landscape. The final image must feel like a distinct snowy hillside beside a frozen lake at bright twilight, with visual space for cute white-bordered stickers.
```

## 完整图集提示

```text
Use case: illustration-story.
Asset type: transparent PNG sprite atlas for a polished cozy 2D mobile game, exactly 4 columns by 3 rows of equal SQUARE cells; landscape canvas 1536 × 1152 pixels, aspect ratio 4:3. Actual alpha transparency everywhere outside each sticker, including spaces between stickers. No opaque white, black, colored or checkerboard background.
Create TWELVE new winter stickers in the exact order below. Match the reference sticker sheet's cute children's picture-book style: charming rounded hand-painted 2D illustration, subtle watercolor/gouache texture, warm dark-brown ink contours, cheerful tiny faces and rosy cheeks where appropriate, soft simple shading, thick crisp WHITE die-cut sticker border on every isolated silhouette. Not realistic, not 3D. A unified winter set for a pale lavender twilight snowy village, with icy powder blue, snowy ivory, muted pine green, and warm golden/coral accents.
GRID RULES: exactly 4 columns and 3 rows, equally spaced square cells. Every object is centered in its own square cell. A generous completely transparent gutter: each sticker including white outline fits within the central 74% of its square cell, with at least 13% empty padding on all four sides. No stray specks, no shared shadows, no connecting scene, no overlap, no object crosses a cell boundary. No captions, labels, grid lines or numbers. Large and legible at mobile scale.
Exact row-major contents:
ROW 1 COLUMN 1 (tree): a friendly short conical evergreen pine tree, three layers of rounded snowy boughs, muted blue-green needles peeking below thick ivory snow, little warm brown trunk; one tree only, no ornaments.
ROW 1 COLUMN 2 (grass): a small soft snow mound with three tiny frosted blue-green grass blades poking out, low and broad, no animal.
ROW 1 COLUMN 3 (star): a cute plump five-point star with a silvery ivory center and warm pale-gold edge, tiny smiling face and rosy cheeks, soft glow contained inside its outline.
ROW 1 COLUMN 4 (cloud): one small rounded night cloud, pale silver-lavender with softly blue lower lobes, simple and luminous.
ROW 2 COLUMN 1 (sun): replace the sun with a sleepy smiling CRESCENT MOON, ivory and pale butter yellow, tiny closed eye, subtly rounded, no extra star.
ROW 2 COLUMN 2 (pond): a small ICE-LAKE-SHORE ACCESSORY, NOT a pond or a second lake: a low rounded snow bank with one short blue wooden skating rail and a tiny warm lantern, a pair of cute pale-coral ice skates resting by the rail. This is a compact shoreline facility to place at the edge of a lake already painted on the background. Absolutely no oval blue water pool and no full skating rink.
ROW 2 COLUMN 3 (sheep): a tiny adorable plump baby penguin wearing a warm coral-red knitted scarf, blue-gray head and wings, ivory belly, orange feet, round dot eyes, blushing cheeks, standing three-quarter front.
ROW 2 COLUMN 4 (duck): a round baby white seal, lying on its belly with small flippers, tiny black nose, cheerful dot eyes, subtle icy blue shading and rosy cheeks, no clothing.
ROW 3 COLUMN 1 (house): a welcoming compact wooden cabin, simple warm honey-brown timber walls, broad snowy roof, chimney with NO detached smoke, glowing amber window and a rounded coral door, a small snowy doorstep. One cabin, no surrounding tree or animal.
ROW 3 COLUMN 2 (fence): a short low rustic wooden fence, four rounded posts, fluffy snowy caps, a single string of three small warm golden fairy lights, strong horizontal shape.
ROW 3 COLUMN 3 (flowers): a cute little snowman in a dusty blue knitted hat and coral scarf beside one small glowing amber lantern, two simple snowballs, twig arms kept close, friendly dot eyes, small carrot nose, grouped into ONE sticker.
ROW 3 COLUMN 4 (chick): a baby arctic white fox sitting with a large fluffy curled tail, tiny warm beige inside ears, sweet dot eyes, small dark nose, rosy cheeks and delicate ice-blue shadows.
No typography, no title, no watermark, no branding. True transparent alpha PNG. The 4×3 equal-square-cell alignment and large clean transparent gutters are essential for automatic CSS sprite cropping.
```
