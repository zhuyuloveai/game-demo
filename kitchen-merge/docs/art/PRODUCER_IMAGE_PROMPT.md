# Producer redesign image prompt

用途：Kitchen Merge 的 11 种生产器统一美术方向预览与评审参考。此图为概念板，尚未拆分为运行时资源，未替换现有 SVG 或 UI。

工具：内置 `image_gen.imagegen`（built-in tool mode），`transparent_background=false`。先生成统一概念板，再对第三行右侧采购车进行一次局部编辑以明确双大轮剪影。

最终选用原图：`producer-redesign-concept.png`。直接复制工具生成的原始 PNG，未重绘、未压缩、未裁剪。
工具原图：`/Users/zhuyu/.codex/generated_images/01a14454-deea-7a80-9723-a31b8831986a/exec-3828ebab-812a-4a09-9651-456db073d4f4.png`。

布局：3 列 × 4 行，依次为烘焙原料罐、生鲜菜筐、花艺桶、厨具缸、咖啡机、竹蒸笼、披萨炉、香草盆、采购车、食谱架、堆肥桶；右下格留空。无标题、编号、文字与 UI 卡片。

## Initial generation prompt

```text
Use case: stylized-concept
Asset type: one unified game art direction concept sheet for eleven kitchen-themed merge-game producer icons.
Primary request: Create a polished hand-painted casual mobile merge-game asset sheet. Eleven distinct standalone objects, in a perfectly regular invisible 3-column by 4-row grid, one large object per slot, with the twelfth bottom-right slot empty. Read order is left to right, top to bottom. Each object fills roughly 75–82% of its own slot, with clear equal spacing, no touching or overlap and no cropped edges.
Scene/backdrop: a single flat warm light cream background (#fff3dd), no visible grid lines, cards, tiles, borders, or separate white panels. Soft warm contact shadows directly below each object.
Style/medium: premium hand-painted 2D chibi kitchen game assets, charming round plump shapes, simplified readable construction, subtly visible painterly brush texture, fine warm brown outlines (#86664e), soft warm shading, restrained creamy highlights. Unified slightly overhead three-quarter view and consistent top-left light. A little more refined than simple SVG game assets. Cheerful and clean, not photorealistic, not glossy plastic or 3D toy renders.
Color palette: warm cream, honey oak (#d3aa79), blush pink (#dba2aa), sage green (#92aa78), mist blue (#9bafbc), warm gold (#e5bc63), lively terracotta and vegetable accents. Colors should feel fresh, warm and bright, never muddy gray.
Subjects, exactly one per slot:
Top row left: a round plump lidded baking-ingredient storage canister, cream ceramic body and warm wooden lid tilted slightly open, with a visible little flour sack and wheat ears tucked in the opening. Its silhouette is short and round.
Top row middle: a low, wide, OPEN fresh vegetable basket with large carrot leaves, orange carrot and red tomatoes rising above its rim; low side grips only, absolutely no tall arch handle. Broad horizontal silhouette.
Top row right: a tall narrow mist-blue florist bucket holding exactly three large pink and cream flowers with clear green stems and leaves. Tall floral silhouette.
Second row left: an open cream ceramic utensil crock holding a rounded wooden spatula, spoon and slotted turner, the individual utensil heads readable. Rounded open rim and separate upright utensil silhouette.
Second row middle: a vertical retro mist-blue coffee machine, with rounded upper housing, small round dial, short coffee spout, and one cream cup on the drip tray. Tall appliance silhouette, no lettering.
Second row right: a round bamboo steamer cooking vessel with two stacked shallow bamboo rings and a domed woven bamboo lid tipped slightly open to reveal a little white dumpling. Circular layered silhouette.
Third row left: a low plump arched pizza oven, warm terracotta dome, dark arched mouth with a small visible pizza and a short chimney. Broad low dome silhouette.
Third row middle: a round-bellied terracotta herb pot with a generous cluster of bright sage and basil leaves, short neck and thick rounded rim. Bulbous plant-pot silhouette.
Third row right: a small kitchen procurement pushcart with a diagonally raised push handle, two very large visible wheels and two open shelves holding a cream sack and a couple of produce boxes. Clearly slanted handle and oversized double-wheel silhouette.
Bottom row left: an open recipe book on a tilted wooden cookbook stand, broad cream facing pages with only tiny food illustrations and abstract sparse brush marks, visible spine and pink ribbon bookmark. The open V-shaped book is the dominant silhouette.
Bottom row middle: a cylindrical sage-green compost bin with rounded wooden lid, clear front latch and small embossed leaf symbol. Cylindrical clipped-lid silhouette.
Bottom row right: empty cream background.
Constraints: exactly eleven objects; visually different silhouettes; uniform illustration quality, outline thickness, perspective and lighting; compact chunky kitchen-friendly construction; all eleven objects fully visible. No text, no letters, no numbers, no labels, no Chinese writing, no watermark, no brand logos, no emoji, no UI chrome. No generic wooden stalls, no roofs or awnings, no white card backgrounds. Avoid excess tiny clutter and avoid realism.
```

## Final targeted edit prompt

参考输入：首张概念板 `exec-d50a9320-60f2-4d01-818e-738bd7c13d20.png`（先通过 `view_image` 检查，再以 `referenced_image_paths` 交给内置工具）。

```text
Use case: precise-object-edit
Asset type: kitchen merge-game producer concept sheet.
Edit only the procurement pushcart in the third row, right column of the reference image. Keep all other ten objects, all spacing, background, colors, painterly illustration, scale, lighting, perspective, and the empty bottom-right slot unchanged.
The procurement cart must have exactly TWO large wheels total, like a small two-wheel kitchen handcart: one large visible wheel at the near left side of its lower chassis, and one large visible wheel at the far right side; remove the small extra rear wheel at the far left. Use a single axle for the two large wheels, with the wooden two-shelf cart balanced above it. Preserve its diagonally raised pushing handle, shelves, sack and produce boxes. The silhouette should read as two oversized circular wheels and a slanted push handle. Do not add legs, casters or any additional wheels. Keep it compact, stable and charming.
No text, letters, numbers, labels, logos or watermark. All eleven objects fully visible.
```

## Visual review

已用 `view_image` 检查最终文件。11 种生产器齐全，网格间隔规整，右下格留空；奶油背景、暖棕线条、软阴影、木色与陶瓷材质保持统一。各类生产器以圆罐、横筐、高桶、竖向电器、圆蒸笼、拱炉、圆肚盆、双大轮推车、展开书本和圆筒桶形成轮廓差异。采购车局部修正后保留两只大轮；其余十件与原排版保留。食谱页面采用食物图案和抽象笔画，无可读文字。后续实现应按小尺寸游戏图标进一步简化细节，并将当前概念作为材质、配色与轮廓参考。
