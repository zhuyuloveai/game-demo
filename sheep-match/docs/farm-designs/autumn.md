# 秋日果园 · 独立场景设计

## 交付

- 背景：`assets/farm/autumn-scene-v2.png`，1024 × 1536，RGB。
- 透明图集：`assets/farm/autumn-stickers-v2.png`，1447 × 1087，RGBA。
- 场景与奖励配置：`docs/farm-designs/autumn.json`。
- 来源：全部画面均由内置 `image_gen.imagegen` 生成或编辑；未使用 CLI/API fallback，未通过脚本改写 PNG 像素。
- 参考图仅作画风参考：`assets/farm/sticker-meadow.png`、`assets/farm/farm-stickers-spaced.png`。秋季重新设计地形、建筑与动物，没有套用春季场景构图。

## 场景意图与布局

「秋日果园」是沿山坡生长的丰收小聚落。三层圆润的金色梯田和从右下攀向左上的灰米色石阶构成主视觉，与平原牧场有明显的空间区别。奶油色留白天空、金色草坡、淡鼠尾草色远山维持温柔的绘本感。

背景只有自然山坡、空梯田、土壤断面与石阶。第一轮背景生成带出了树丛，已经用内置 ImageGen 定点去除；最终背景中没有预置果树、建筑、动物、农具或花篮。未解锁时仍然是一片可以慢慢布置的空地。

- 标题 y12–27% 和季节导航 y31–37% 保持中心清爽，天空小贴纸靠两侧。
- 六阶段主要布置 y40–75%。上层花篱位于左中，风车屋落在左前梯田，金红苹果树在右中梯田，形成不对称构图。
- 丰收推车放在风车屋与果树之间的前层空地；刺猬、松鼠与麻雀沿草坡和右侧石阶错落出现。
- 大主体宽度：风车屋 36%、果树 34%、推车 31%；首位刺猬 19%，其他动物 8–16%。布局按主体居中并占方框约 80% 预估，避免背景型图集边距影响显示比例。
- 所有重点主体均结束于底部按钮 y78% 之前；底部 y78–100% 为低对比浅奶油底。
- 六组解锁分别为花篮与篱笆、刺猬居民、风车屋、金叶果树、丰收推车与松鼠、更多小伙伴。

## 图集与取景

顺序严格为 tree、grass、star、cloud / sun、pond、sheep、duck / house、fence、flowers、chick。语义映射：

| key | 秋季实际内容 |
| --- | --- |
| tree | 金红叶红苹果树 |
| grass | 落叶草簇 |
| star | 小金星 |
| cloud | 奶油云朵 |
| sun | 秋日太阳 |
| pond | 装满苹果与南瓜的木制丰收推车 |
| sheep | 捧落叶的小刺猬 |
| duck | 抱橡果的小松鼠 |
| house | 奶油石墙、橙红屋顶的风车小屋 |
| fence | 木栅栏 |
| flowers | 南瓜与金盏花篮 |
| chick | 小麻雀 |

第二轮透明图集扩大了透明边距，十二个主体均独立、没有跨相邻主体重叠。内置工具返回的画布为 1447 × 1087，和精确 4:3 有约 1 px 的单元偏差，因此不要假设原文件的四列三行切片一定能严格居中。JSON 的 `atlas.frames` 给出各主体完整取景范围，供 SVG `viewBox` 等页面方式取景；PNG 原图不做像素重排。

取景测量使用 alpha > 64 的八邻域连通主体，十二格各只有一个超过 100 px 的主连通区域；每个 bbox 增加 3 px，以保留白描边和抗锯齿。alpha≈1 的背景残留不作为有效主体边界。完整画布 alpha=0 的像素约 72.01%，图集确有透明通道。不要把工具预览的黑色透明底当成画面背景。

`pond` 现在是推车，接入时禁用水波；`house` 为风车屋，禁用原小屋烟囱烟，避免特效位置错误。两个适配事项已告知主代理。

## 内置生成来源

背景首次生成：
`/Users/zhuyu/.codex/generated_images/01a169a9-3f0a-7173-b43e-3691be1ffb72/exec-da3857cf-fec8-4239-9c59-53c68d732783.png`

背景定点去树后最终来源：
`/Users/zhuyu/.codex/generated_images/01a169a9-3f0a-7173-b43e-3691be1ffb72/exec-8d283437-0637-4f6d-9d36-51779a9d351b.png`

图集首次生成：
`/Users/zhuyu/.codex/generated_images/01a169a9-3f0a-7173-b43e-3691be1ffb72/exec-f4dd6dd4-8ada-4816-b038-258a5653da75.png`

图集增加边距后最终来源：
`/Users/zhuyu/.codex/generated_images/01a169a9-3f0a-7173-b43e-3691be1ffb72/exec-4a96cc0b-dd8a-4c03-8550-bfe442cea8c5.png`

## 完整提示词：背景

```text
Use case: illustration-story.
Asset type: production mobile casual-game homepage background, portrait 1024 x 1536 PNG.
Primary request: create a NEW independent autumn orchard landscape, an empty terraced hillside ready to be decorated with separate unlockable stickers. This must have a different landform and composition from an ordinary green meadow with an S-shaped dirt road.
Visual style: exquisitely cute 2D children's picture-book environment, soft gouache and watercolor on fine warm paper grain, gentle shapes, flat graphic depth, cohesive with dark-warm-outline white-edged storybook stickers that will be placed over it. This background itself has no sticker border.
Composition: upper 0–39% is nearly empty pale cream and very faint peach sky, especially centered x20–80% and y12–37%, preserving clear space for title at y12–27% and season navigation at y31–37%. Low distant muted ochre and dusty sage hills begin at y40%. The main layout is a diagonal set of three broad rounded orchard terraces occupying y43–76%, warm honey grass and tan soil edges, with generous EMPTY planting terraces left foreground, right middle, and left upper. A slender curved grey-beige stepping-stone stair path climbs diagonally from the lower RIGHT edge near x94%, y76% toward the UPPER LEFT near x19%, y46%, bending with the terrace contours. Keep the stair path slim and pleasantly readable, not a massive central road. Terrace lines emphasize the gentle rising slope. The bottom y78–100% is quiet flat warm buttery-cream ground with only extremely subtle paper texture so game buttons can overlay it. All interesting landscape composition stays within y40–76%.
Atmosphere: bright clear mellow autumn afternoon; refined golden ochre, peach, oatmeal cream, muted sage accents; warm but never dark brown or orange monochrome. A few tiny fallen leaf marks may appear only near the terrace edges; no scattered dense texture.
Critical exclusions: terrain and small path ONLY. No houses, windmills, fences, trees, apples, pumpkins, stalls, carts, animals, characters, flowers, sun icon, clouds, stars, text, labels, interface, watermarks, frames, or decorative objects. The orchard is completely empty of all unlockable props. No photorealism, no 3D rendering, no dark outlines around hills, no giant close-up foliage.
```

### 背景定点修正提示词

```text
Edit target: the attached/generated autumn terraced hillside background. Preserve exactly the portrait composition, cream empty sky, three broad gold terraces, diagonal stepping-stone stair path, colors and paper texture. Remove ALL shrubs, bushes, tree canopies, trunks, and foliage clusters from the scene, including those in the distant horizon and along every terrace edge. Replace them seamlessly with gentle unplanted grassy hillside shapes or empty soil edges. This must be a completely EMPTY orchard terrain before any tree is unlocked. Keep the main scenery at y40–76% and the bottom y78–100% quiet for buttons. No other change. No text, buildings, trees, animals, flowers, props.
```

## 完整提示词：透明图集

```text
Use case: illustration-story.
Asset type: production sprite atlas for a cute 2D casual game's autumn orchard homepage.
Primary request: create exactly TWELVE separate hand-painted sticker illustrations on a genuinely TRANSPARENT canvas, arranged in a PERFECT 4-COLUMN by 3-ROW regular grid of EQUAL SQUARE cells. Canvas must be exactly 4:3 landscape, ideally 2048 x 1536 pixels (each square cell 512 x 512). This is an atlas, not a composed scene.
Style: premium kawaii storybook paper stickers, refined soft gouache watercolor texture inside rounded shapes, rich warm dark-brown hand-inked outlines, crisp consistent white die-cut edge around each object, gentle warm highlights, smiling faces on animals and sky icons. Cohesive with the existing farm-stickers-spaced.png reference seen in context, but all subjects are original autumn orchard designs.
Critical grid geometry: one isolated object or compact coherent object cluster centered within EACH cell; a minimum 18% transparent padding on ALL FOUR SIDES within EVERY cell. No object exceeds 64% of its cell's width or height including white border. Objects never touch, overlap, cross cell boundaries, or align in uneven rows. No grid lines, labels, text, framing, background, ground plane, colored squares, paper sheet, shadows outside the white border, or checkerboard baked into the pixels. All unoccupied pixels truly transparent.
STRICT READING ORDER, left to right and top to bottom:
ROW 1 CELL 1 tree: one round-canopy autumn APPLE TREE with gold and red-orange leaves, three clear red apples, stout warm trunk, tiny grass base, no planter.
ROW 1 CELL 2 grass: one compact low tuft of soft olive-gold grass with two fallen red maple leaves at the base.
ROW 1 CELL 3 star: one small golden four-or-five-point smiling star with blush.
ROW 1 CELL 4 cloud: one softly puffed creamy white cloud with very pale peach shaded underside.
ROW 2 CELL 1 sun: one happy mellow autumn sun, rounded short ochre rays, warm honey face, tiny rosy cheeks.
ROW 2 CELL 2 pond: one cute small wooden HARVEST HANDCART facing three-quarter view, two round wooden wheels, basket of red apples and a couple of pumpkins inside, no roof, no sign, no text; this replaces the usual pond sprite completely.
ROW 2 CELL 3 sheep: one adorable round baby HEDGEHOG, cinnamon-brown rounded spines and cream face, blushing cheeks, holding one small fallen orange leaf.
ROW 2 CELL 4 duck: one adorable warm rust-orange SQUIRREL with big curled tail, holding a small acorn, smiling face, no other objects.
ROW 3 CELL 1 house: one charming compact WINDMILL COTTAGE, cream stone body, orange terracotta conical roof, FOUR SHORT wooden windmill blades contained well inside the cell, a tiny teal-blue arched door, golden window, complete whole building. The building remains large and legible within the mandated 18% padding; no trees around it.
ROW 3 CELL 2 fence: one compact four-picket warm pale wood fence segment, rounded tops and two rails, two tiny grass tufts at feet.
ROW 3 CELL 3 flowers: one small round wicker basket containing a bright pumpkin and blooming golden marigolds, coherent single cluster, no loose props outside.
ROW 3 CELL 4 chick: one tiny plump cheerful SPARROW, cocoa-brown cap and wings, cream chest, small orange beak and feet, blush.
Palette: autumn honey gold, russet, pumpkin orange, warm cream, restrained sage accents; readable contrast and fine clean detail at small mobile display size. No green summer trees, no sheep, ducks, chicks, water or pond, no photorealism, no 3D render, no typography, no watermark. Preserve actual transparency.
```

### 图集边距修正提示词

```text
Use case: precise-object-edit. This is a sprite atlas layout repair. Preserve the twelve exact wonderful autumn sticker subjects, their reading order, artwork style, dark brown lines and white die-cut borders. The only change: make EVERY object MUCH SMALLER and exactly centered in its own square grid cell. Output canvas 1448 x 1086, exactly 4 columns by 3 rows of 362 x 362 SQUARE cells. Center each sticker at cell centers x181,543,905,1267 and y181,543,905. Every sticker's entire outer white edge must fit inside the CENTRAL 60% (217 x 217 pixels) of its cell, leaving at least 72 truly transparent pixels along EVERY cell edge. This generous padding is essential because the atlas will be cut into equal squares. Do not enlarge wide objects to fill the cell. Tree and windmill must fit within 217 x 217 just like everything else. Keep all 12 stickers complete, isolated, equal visual importance, no overlap. Remove ALL detached specks, noise, stray white dots, stray colored pixels, or tiny fragments outside the 12 main cutout shapes. Background must be genuine alpha 0 transparency everywhere except the twelve sticker cutouts. No checkerboard pixels, no sheet, no background, no grid or text. Strict order row1 apple tree / grass / star / cloud; row2 sun / harvest cart / hedgehog / squirrel; row3 windmill cottage / fence / pumpkin flower basket / sparrow.
```

## 视觉检查与接入验证

已直接查看两张参考、两次背景输出及两次图集输出。最终背景确认空梯田、右下至左上石阶、柔和远山和天空/底部留白；最终图集确认十二个题材与顺序完整、暖深棕轮廓和白色模切边统一，没有文字或水印。风车四叶片、动物尾巴/脚、树冠与木车轮子均包含在各自 bbox 内。

已读取 PNG 实际尺寸、透明通道、alpha 直方图和每格有效主体边界；已验证 JSON 六组与六条奖励完整、sprite key 与 motion 值合法，原图拷贝与生成来源逐字节一致。

本子任务只提供秋季素材与配置，不改主程序、不提交、不部署。合成后的手机页面由主代理统一执行 QA；以上 y 坐标按主体取景后占方框约 80% 预估，实际小屏仍需结合页面高度核对。
