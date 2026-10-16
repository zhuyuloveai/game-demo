# 围坐岛台素材生成记录

2026-10-16，使用 imagegen 技能及内置 `image_gen.imagegen`，未使用 CLI/API 回退。用户确认的 B 修订图仅作为风格与构图参考；没有把整张参考图铺成可点击背景。游戏食材、生产器、小狗与资源仍使用原项目素材。

## 运行文件

- `dist/assets/island-room.webp`：原图948×1659，缩至860×1505，WebP quality84，约68 KiB。完整空台面、窄窗光、水槽/水龙头、后侧浅蓝柜体与近侧木台沿；正交棋盘另由HTML绘制。
- `dist/assets/island-book.webp`、`island-storage.webp`、`island-phone.webp`、`island-radio.webp`：从2172×724透明物件条裁出四件，保留alpha、去透明边、各高160px、WebP quality88；分别约14/9.5/8.3/11 KiB。
- 全部新增运行图约110 KiB，无运行时生成目录或远程URL依赖。书本、柜子、手机、收音机各有独立真实button与动态文本标签，背景不承担点击逻辑。

## 环境提示词（最终）

Use case: stylized-concept. Asset type: layered mobile merge-game kitchen environment background, portrait 1024x1792. Reference image is style/composition reference only. Create a polished warm cozy 3D illustrated family kitchen viewed seated at an island, soft golden sunlight, pale honey wood, cream and soft sky blue cabinetry, rounded tactile materials, rich subtle contact shadows. CRUCIAL layout normalized: top 0-9% narrow background window with blurred garden, potted herb far left, sink and silver tap far right, rear wood counter. 9-24% empty warm honey wood surface behind order cards. 24-91% almost entirely empty pale warm cream wood island worktop, straight rectangular front facing top-down working area, NO perspective shrinking grid, NO grid, NO objects or food in this large area. Tiny peripheral details only at very left/right edge. 91-100% front wooden ledge, then thin blue paneled cabinet front edge. No UI, no characters, no food, no text, no resource counters, no board lines, no book/phone/radio. This is a quiet background under real interactive HTML game, visual emphasis at top window and bottom cabinet, center low contrast and light. Follow the reference high quality crafted kitchen aesthetic but clear empty central space. Save result as local image.

## 独立物件提示词（最终）

Use case: stylized-concept. Asset type: game UI object sprite strip, four separated objects on transparent background, landscape 1536x512. Match the cozy polished 3D mobile kitchen illustration style of the reference, warm golden light from upper left, pale wood and sky blue accents, credible depth and soft contact shadows. FOUR objects evenly spaced in four equal square columns, all fully inside their column with generous transparent margin, aligned on same baseline: column 1 open thick red bound recipe cookbook seen from slightly above, cream pages and a colorful plated tomato pasta illustration, no writing; column 2 low wide sky blue kitchen storage drawer cabinet with raised rectangular panel and polished curved brass pull, honey wood top, front perspective; column 3 dark framed modern phone upright tilted slightly in a warm wooden phone dock, pale blue screen with white simple shopping basket symbol, no text; column 4 small coral orange vintage kitchen radio, horizontal, brass handle, cream speaker grill left and dark round dial right, little antenna. Each independent cutout, no shared ground, no backdrop, no extra objects, no letters, NO dogs, no UI buttons. Similar apparent height for all four, book broader than phone. These will be clickable real game objects at the island front.

## 与概念图的有意差异

真实内容视口为375×667，顶部与底部都比方向稿紧凑；实际物品继续使用项目422项逐级插画，保持原小狗身份。初始棋盘的锁定区遵从真实进度。格位没有透视，等大正方形。环境与物件保留方向稿的暖光和材质，实际画面以浏览器截图为准。
