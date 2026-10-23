# 夏日海风 / Summer Sea Breeze

## 交付

- 背景：`assets/farm/summer-scene-v2.png`，1024 × 1536 RGB。
- 贴纸：`assets/farm/summer-stickers-v2.png`，1448 × 1086 RGBA，严格 4 列 × 3 行，每格 362 × 362。
- 配置：`docs/farm-designs/summer.json`。包含 natural、六组 groups、六条 rewards，保留现有逻辑 sprite key。

## 独立构图

夏季是海风牧场：左侧草坡承托条纹遮阳小屋和椰树，右侧浅海承托小船，中间由斜向沙滩联系海龟、海鸥和螃蟹。没有复用原草地背景的中心 S 形小路；海岸地貌、居民、建筑、围栏和活动内容均为夏季专属。背景采用轻水彩绘本肌理，贴纸采用暖棕轮廓和奶油白刀模边。

背景本身保持自然空场景，没有预画任何待解锁建筑、树木、动物、船、篱笆。标题主要占 12%–27%，季节切换占 31%–37%。可见解锁贴纸集中在约 43%–76%，给底部操作保留空间。

六组解锁次序：

1. 蓝绳木桩庭院、贝壳花箱。
2. 第一只小海龟。
3. 条纹遮阳海边木屋。
4. 两棵椰树与海边草丛。
5. 小船和海鸥伙伴。
6. 更多小海龟、小螃蟹与花箱。

## 图集逻辑映射

| 位置 | key | 夏季画面 |
| --- | --- | --- |
| 第1行第1列 | tree | 椰树 |
| 第1行第2列 | grass | 小草与扇贝 |
| 第1行第3列 | star | 橙色海星 |
| 第1行第4列 | cloud | 奶油白云 |
| 第2行第1列 | sun | 笑脸太阳 |
| 第2行第2列 | pond | 带救生圈的小船 |
| 第2行第3列 | sheep | 小海龟 |
| 第2行第4列 | duck | 海鸥 |
| 第3行第1列 | house | 条纹遮阳小屋 |
| 第3行第2列 | fence | 蓝绳沙滩篱笆 |
| 第3行第3列 | flowers | 贝壳花箱 |
| 第3行第4列 | chick | 小螃蟹 |

## 集成注意

场景按原来的 `background-size: 400% 300%` 等方格接口显示，JSON 不带 atlas。最终图集为保持充足安全边距，主体宽约占单格的 34%–40%；JSON 的 frame width 和负 x 已按实际可见主体校准，不应根据 frame width 单独缩小。主屋可见宽约屏幕 24%，椰树约 19% / 13%，小海龟约 6%–9%，螃蟹约 3.7%–5.3%。

JSON 另外提供 `previewAtlas`（仅奖励弹窗与手账缩略图使用）：1448 × 1086，frames 为图集绝对像素坐标 `[x,y,width,height]`。它依据 alpha > 24 的主体 bbox 并向外留 3px 抗锯齿余量，不参与场景坐标或尺寸计算。

原点定义仍是 layer 的左上角，而不是贴纸主体左上角。坐标按 440 × 740 的场景比例校准。对于奖励弹窗和手账缩略图，可只在图标预览中用实际 bbox 取景，避免透明留白导致图标过小；场景继续使用配置中的原格子坐标。每格的可见主体 bbox（alpha > 192，`[left,top,right,bottom]`，相对于该 362px 方格）：

```json
{
  "tree": [138,176,261,311],
  "grass": [121,190,255,302],
  "star": [112,182,243,305],
  "cloud": [100,200,236,293],
  "sun": [126,118,262,252],
  "pond": [124,142,267,243],
  "sheep": [111,140,245,243],
  "duck": [112,124,242,246],
  "house": [126,63,256,200],
  "fence": [120,104,266,187],
  "flowers": [108,83,250,189],
  "chick": [106,79,242,196]
}
```

夏季小屋没有烟囱，建议关掉原 house key 自动附带的烟雾。小船图已经自带海水涟漪，不必加原池塘的独立 ripple。海星是沙滩上的天然贴纸，不作为天空星星摆放。

## 来源与视觉检查

均由内置 `image_gen.imagegen` 生成，没有使用 API/CLI 备用模式。参考已查看的 `sticker-meadow.png` 和 `farm-stickers-spaced.png` 的绘本与贴纸语言，重新创作夏季内容和构图。

背景原始来源：
`/Users/zhuyu/.codex/generated_images/01a169a8-e4ff-7bd2-8f4a-267a697ca16d/exec-e08d1155-4c2c-4d74-8fff-f91060c3b092.png`

贴纸首版来源：
`/Users/zhuyu/.codex/generated_images/01a169a8-e4ff-7bd2-8f4a-267a697ca16d/exec-6b2caf6d-6880-4f86-893a-12b7e6a035d8.png`

贴纸最终来源（经两次内置 ImageGen 间距修正）：
`/Users/zhuyu/.codex/generated_images/01a169a8-e4ff-7bd2-8f4a-267a697ca16d/exec-9a8a90f2-b496-41a0-b468-91bd760028bf.png`

检查结果：

- 已逐项查看最终背景和图集，12 个物件顺序正确、内容互异且完整。
- 图集真实 RGBA 透明，90.34% 像素 alpha=0。三条列分界、两条行分界各 ±2px 区域的 alpha 最大值均为 1，无可见跨格主体。
- 最终图集仍有微弱抗锯齿边缘；没有以代码重新绘制、裁切或破坏生成的透明通道。
- 已用 Chrome/Playwright 在内存中渲染 440 × 740 的空场景和满布置并目视检查：天空标题和切换栏清晰；小屋、椰树、小船、动物分布自然；没有异常放大的动物；底部按钮无遮挡。该检查只是设计预览，未修改主程序。
- JSON 合约检查通过：六组解锁对应六条奖励，全部 sprite 数组为七项；motion 在允许范围内，delay 均非正数。

## 完整背景提示

```text
Use case: illustration-story.
Asset type: portrait mobile cozy-game background, full-bleed raster image, 1024 by 1536 pixels, 2:3 portrait composition.
Primary request: Create an original summer coastal meadow called "Summer Sea Breeze". A warm, quiet, empty seaside landscape ready for the player to decorate with collectible stickers.
Style/medium: Delicate Japanese children's picture-book watercolor and gouache on softly textured cream paper. Broad, translucent washes, beautifully restrained tiny dry-brush details, soft organic shapes. A flat 2D illustration with a gentle elevated side view, never 3D. Soft buttery sand, sea-glass turquoise and pale mint water, fresh light grassy green, very pale cyan sky, a tiny hint of peach warmth.
Composition/framing: Make a genuinely asymmetric coastal composition, not a central winding path through rolling hills. The upper 39 percent of the whole picture is open pale blue sky with a faint creamy haze near the horizon, exceptionally clean and low contrast. Keep x=15%-85%, y=10%-38% free of objects so title and season controls will be legible. Ocean starts at a quiet nearly horizontal horizon at y=40%. A wide soft grassy headland enters from the left around y=43%, occupying the left half of the usable central scene. The gently curved diagonal beach runs from approximately x=65%,y=44% toward x=94%,y=80%. Calm pale aqua sea occupies the right side. Plenty of open grassy room on the left at y=47%-70% for later house and palm tree stickers; open sandy room at x=38%-79%,y=58%-75% for small animal stickers. Small shallow watery crescent on the right may receive a boat later. The lower 78%-100% is quiet, lighter pale sandy/grass/water color fields beneath future buttons. At the very bottom, the shore continues naturally out of frame. Show only subtle tide lines, a few tiny soft grass brushstrokes and barely visible sand speckles.
Lighting/mood: Gentle bright summer morning with sea breeze, cozy, airy, playful yet calm.
Constraints: The background MUST be a natural empty scene. No buildings, cottages, trees, palm trees, animals, birds, fish, fences, boats, sun character, cloud characters, flowers, umbrellas, furniture, signs, people, boardwalk structures, rocks as focal objects, interface, text, labels, logo, border, vignette, watermark. No central S-shaped path. Do not pre-draw collectible objects. Keep all detail subordinate to the future small stickers. Image must feel professionally painted and charming rather than a simple geometric gradient.
```

## 完整贴纸提示

```text
Use case: illustration-story.
Asset type: production-ready transparent PNG sprite atlas for a cute 2D cozy mobile game.
Primary request: Paint exactly TWELVE separate collectible SUMMER SEASIDE stickers in a precisely aligned 4-column by 3-row atlas. Canvas aspect ratio EXACTLY 4:3, preferred 1536 by 1152 pixels, so every grid cell is an equal square of 384 by 384 pixels. Real alpha transparency everywhere outside the sticker silhouettes.
Style/medium: Polished cute children's picture-book sticker art. Hand-painted watercolor/gouache textures inside clear warm dark-brown drawn contours. Friendly rounded shapes, appealing tiny faces on animals and sun, warm gentle shading, a neat cream-white die-cut border around each separate object. Charming, refined and readable when small, never photorealistic or 3D. Summery sea-glass turquoise, peach coral, buttery yellow, leafy green, sandy cream. Consistent line weight and style throughout.
GRID RULES, CRITICAL: Four columns of exactly equal width and three rows of exactly equal height. 12 virtual square cells. One self-contained centered sticker per cell. Center positions must be exactly: row 1 at (12.5%,16.666%),(37.5%,16.666%),(62.5%,16.666%),(87.5%,16.666%); row 2 at the same x coordinates and y=50%; row 3 at the same x coordinates and y=83.333%. Keep every sticker including white border strictly within the middle 72% of its square cell, leaving at least 14% empty margin on every edge. Similar optical scale. Absolutely no touching, crossing or fragments from neighboring cells. No visible grid or cell backgrounds.
EXACT ORDER left-to-right and top-to-bottom:
Row 1 column 1: one adorable gently curved coconut palm tree, fresh broad feathery green leaves and two small coconuts, trunk and small sandy root mound.
Row 1 column 2: one compact cluster of seaside grass with a pale pink scallop shell and a tiny sandy base.
Row 1 column 3: one coral-orange five-armed sea star, softly dotted texture, cute tiny calm face.
Row 1 column 4: one soft fluffy cream-white cloud with a subtle pale blue lower edge, no rain.
Row 2 column 1: one happy round golden summer sun with tiny rosy cheeks and rounded rays.
Row 2 column 2: one charming small pale turquoise and cream rowboat on a tiny oval of translucent aqua ripples, two wooden oars and a coral life ring. No animals or people in the boat.
Row 2 column 3: one small friendly baby sea turtle, mint flippers, olive patterned shell, facing right in a gentle side-three-quarter view, four anatomically sensible flippers.
Row 2 column 4: one adorable small plump white seagull standing in side view, gray wing tips, tiny yellow-orange beak and feet, two wings and two legs.
Row 3 column 1: one charming tiny beach hut with pale wooden walls, a rounded aqua door, one circular window, a coral-and-cream striped shade awning, a simple low blue-green roof, tiny porch. A building alone, with no animal, trees or separate accessories.
Row 3 column 2: one short sandy beach rope fence, three rounded bleached wooden posts linked by two gently drooping blue ropes, compact horizontal silhouette.
Row 3 column 3: one low washed-wood flower box filled with small coral, yellow and cream seaside flowers and two tiny shells tucked along its base.
Row 3 column 4: one tiny friendly orange-coral sand crab with two raised rounded claws, two eyes, and compact symmetric little walking legs.
Constraints: Transparent background, genuine alpha channel. Do NOT draw a black, white, colored, paper, or checkerboard background. No text, labels, numbers, logos, watermark, grid lines, panel borders, extra objects, extra animals, ground plane spanning cells or stray colored pixels. The only opaque white is the neat die-cut border and intentional parts of a sticker. Every sticker must fit fully inside its own generously padded square cell.
```

## 图集安全边距修正提示 1

```text
Use case: precise-object-edit.
Edit the supplied SUMMER SEASIDE 12-sticker atlas. Preserve exactly the same twelve subjects, the same painted designs, warm brown outlines, cream die-cut borders, colors, charm, and the same row-major order. Change ONLY their layout, size and alpha cleanliness to make this a valid production sprite sheet.
The current objects are too large and the palm and hut cross cell boundaries. Make EVERY sticker significantly smaller, about 72% of its current displayed size, and place each EXACTLY in the center of its own square cell.
Canvas MUST remain exactly 1448 pixels wide and 1086 pixels high, a 4:3 rectangle, containing FOUR columns and THREE rows, with square cells 362x362 pixels. Center x coordinates: 181,543,905,1267. Center y coordinates:181,543,905. For each sticker, the longest dimension INCLUDING its white border must be at most 250 pixels. In every cell there must be at least 56 fully transparent pixels of padding to every cell edge. The full twelve-object sheet must visibly have wide transparent gutters between rows and columns.
Exact row-major order MUST stay: palm tree, shell-and-grass, orange sea star, cloud; sun, little rowboat with life ring, sea turtle, standing seagull; beach hut with striped awning, blue rope fence, shell flower box, orange crab.
Alpha cleanup: remove ALL stray white specks, white dust, opaque halos beyond the neat die-cut border, disconnected pixels, checker patterns and artifacts throughout all gutters and empty background. Empty regions must be 100% transparent alpha zero. Only the 12 solid, clean, complete sticker silhouettes should have visible pixels. Do not put shadows into the gutter. Do not draw grid lines, panels, labels, text, borders or a background. No objects may be cropped. No new subjects. This is a precise spacing and clean-alpha edit, preserve the illustration quality.
```

## 图集安全边距修正提示 2（最终）

```text
Use case: precise-object-edit.
ONE SPECIFIC CHANGE: on the supplied 1448x1086 transparent summer sticker atlas, make ALL TWELVE stickers HALF as large as they currently appear. Each entire existing illustration including its white border should be exactly 50 percent of its present width and height. Keep the canvas exactly 1448x1086 and transparent. Keep the same illustrations, colors, outlines, twelve subjects, relative order, and illustration quality. DO NOT enlarge them again to fill the canvas. The intention is unusually small stickers surrounded by enormous fully transparent empty space.
Organize into FOUR columns and THREE rows of equal square 362px cells. Exact centers in pixels, each icon center must match one of these points:
palm tree (181,181); shell and grass (543,181); sea star (905,181); cloud (1267,181).
sun (181,543); rowboat (543,543); turtle (905,543); seagull (1267,543).
beach hut (181,905); rope fence (543,905); flower box (905,905); crab (1267,905).
No drawing should be larger than 170x170 pixels. Leave a minimum 90 pixels of EMPTY, alpha-zero space on all four sides inside every square cell. There should be vast transparent gutters between all twelve tiny stickers. Alpha background must be totally clean with no visible pixels or dust outside the neat white sticker borders. No grid, no text, no labels, no numbers, no new details, no background color. This is only a layout scaling correction.
```
