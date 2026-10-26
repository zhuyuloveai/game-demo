# 农场小工坊 · P0 / P1 / P2 扩展交付

本轮在用户认可 v0.2 农场元素方向后扩展。依据最新 `origin/main` **6f195a1**（2026-10-26）；任务分支已吸收 main，新增制作全部局限在本美术目录。没有为本任务修改游戏运行时代码、存档或原建筑／动物／作物。

## 查看入口

- `expansion.html`：三套界面与关键状态总览。
- `page-review.html?page=shop|storage|orders&device=phone|wide`：独立可交互组合。可切换状态、选择物品、拖动数量滑条、点快捷份数。页面不会买卖、交货或读写存档。
- `index.html#components`：全部 27 类、84 个透明 SVG 状态组件。相比已确认版，新增 10 类、34 个状态；原有组件保留。
- `landscape.html`：地形组合、薄雾、锚点、连续拼接和四组短效果播放。
- `source/*-wide.svg`、`source/*-mobile.svg`：分层可编辑组合。文本保留原生 `<text>`；滑条木珠、勾选框、物品和底板各自独立。农场截图仅是参考层，不是运行时整页大图。

## P0：共同组件与页面

| 页面 | 复用基础 | 新增组件与状态 | 组合源 |
| --- | --- | --- | --- |
| 生产面板 | 已确认木框、木牌、布棚、纸签、木箱槽 | 保留已有常态、缺料、满仓、空配方与长文案 | `source/production-wide.svg` / `production-mobile.svg` |
| 商店 | 木框、布棚、木牌、按钮、分类页签 | `shelf-card-*`、`detail-paper-*`；选中、按下、缺币、锁定、已拥有文案 | `source/shop-wide.svg` / `shop-mobile.svg` |
| 仓库 | 物品格、进度、按钮、页签 | `stepper-*`、`slider-track-*`、`slider-thumb-*`、`checkbox-*`；满仓、空仓、数量边界 | `source/storage-wide.svg` / `storage-mobile.svg` |
| 订单 | 木框、纸签、状态符号、按钮 | `order-paper-*`、详情纸签；可交付、缺料、冷却补单 | `source/orders-wide.svg` / `orders-mobile.svg` |
| 通用补充 | 原资源与状态颜色 | `resource-pill-*`、`toast-paper-*`、`ribbon-*` | `components/` 独立源 |

宽屏为 1280×720，手机为 400×740。仓库和订单宽屏左右分区，手机上下排列。短屏中部滚动、标题和主要操作固定。默认复用至少 44×44 的命中区域；小图标与视觉外框不等于点击面积。

`manifest.json` 为完整参数表：每个文件的原始画布、九宫格、内容内边距、安全区、推荐最小尺寸、锚点和状态。所有坐标为 SVG 1× 单位，九宫格顺序是 **上、右、下、左**；同族状态尺寸和安全区一致。布棚是独立装饰条，允许横向拉伸（`scaling: stretch-x`），高度保持约 24–28px；关闭按钮和小符号等比缩放。

| 新增组件族 | 源画布 | 切片范围 | 内容内边距（上右下左） |
| --- | --- | --- | --- |
| 商品货架卡 | 120×116 | 四边 24 | 24 / 12 / 20 / 12 |
| 订单纸单 | 112×104 | 四边 24 | 24 / 12 / 20 / 12 |
| 详情纸签 | 96×96 | 四边 24 | 24 / 12 / 20 / 12 |
| 数量加减底板 | 48×48 | 四边 14 | 四边 10 |
| 滑条轨道 | 96×12 | 四边 4 | 四边 2 |
| 木珠 / 勾选框 | 32×32 | 不切片；等比缩放 | 独立符号，命中区另定 |
| 资源标签 | 96×40 | 四边 15 | 8 / 12 / 8 / 12 |
| 轻提示纸片 | 112×64 | 四边 18 | 12 / 16 / 12 / 16 |
| 状态布签 | 80×32 | 四边 12 | 6 / 12 / 8 / 12 |

组件只含形状、材质和必要状态符号。设施名称、类别、金额、倒计时、库存和进度不能烘焙进去。商店大类共用同一货架结构，预览仅填入“田地与工坊”的示例；没有为每一类制作整页图。

样板展示值与玩法逻辑分开：工坊成本、等级和占地依据当前配置；仓库库存、订单奖励、倒计时仅是审阅样例。正式接入继续调用原经济规则和 `recoveryPrice`，不可复制预览 JS 作为游戏业务代码。

## P1：自然过渡

`terrain/manifest.json` 列出 **18 个新增连接件 + 1 个薄雾复用件**，每件同时交付可编辑 SVG 与透明 PNG @2x。

| 文件 | 数量 | 用途 |
| --- | ---: | --- |
| `grass-edge-ne/nw-dense/sparse` | 4 | 两方向直边，疏密交替 |
| `soil-grass-ne/nw` | 2 | 泥土与草地连接 |
| `grass-corner-outer-n/e/s/w` | 4 | 外转角 |
| `grass-corner-inner-n/e/s/w` | 4 | 内转角，减少中央密度 |
| `grass-cap-ne/nw-start/end` | 4 | 开放边缘收尾 |
| `fog-overlay-reused` | 1 | 原云团去掉旧菱形底板；属于派生复用 |

新连接件为 256×160 SVG 单位，统一锚点 **(128,80)**；PNG 为 512×320 像素，默认显示 256×160。薄雾为 128×64，锚点 (64,32)，PNG 256×128。`ports` 指定连接端口，位置单位与 SVG 一致，**不以透明画布底边中心定位**。

- NE 连续步长 `(160,-80)`；NW 连续步长 `(160,80)`。地面两轴斜率 ±0.5。
- 根据端口对齐，而不是按图片外框排方格。端口外约 10 单位是同色实心重叠区。
- 疏、密交替；遇角使用命名转角，不在屏幕平面旋转精灵。转角端口相对锚点仍沿 80:40 轴线。
- 顺序：已有地面 → 草土连接 → 原树／灌木／石头与建筑 → 原云团薄雾 → 游戏状态 UI。
- 薄雾不反复叠黑；锁、可开拓提示、按钮和文案保持单独 UI 层。本次没有新增矿场玩法。

`source/terrain-composition.svg`、`terrain-composition-fog.svg` 和 `terrain-composition-anchors.svg` 分别为普通、薄雾、锚点组合参考。`terrain-seam-study.svg` 检查两方向各连续四段。所有参考背景、道路、建筑和文字层只用于查看，不进入单件 PNG。

## P2：清障与开放短效果

交付 **4 组、共 32 帧**：每帧均有可编辑 SVG 和独立透明 PNG，另有每组透明图集。`effects/manifest.json` 记录完整帧序与裁切矩形。

| 效果 | 帧数 | 帧率 | 时长 | 播放 |
| --- | ---: | ---: | ---: | --- |
| `clear-dust` 清障扬尘 | 8 | 12 fps | 约 667 ms | 一次，结束隐藏 |
| `stone-chips` 石头碎屑 | 8 | 12 fps | 约 667 ms | 一次，结束隐藏 |
| `wood-chips` 木屑 | 8 | 12 fps | 约 667 ms | 一次，结束隐藏 |
| `land-open` 土地开放微光 | 8 | 16 fps | 500 ms | 一次，结束隐藏 |

统一画布 **128×96**，落点 **(64,76)**；各帧不裁切、不改变偏移。帧序 00 → 07，首尾透明。每组图集 528×200，4 列×2 行，单元格 132×100，内容四周各留 2px 透明隔离区；按 `atlasRect` 读取 128×96 内容，不把隔离区当画面。

推荐 1× 显示、普通 source-over 混合、放在清理对象的地面位置；不自动循环，不放到屏幕中心，不加全屏遮罩。减少动态效果时直接跳过。普通淡入、晃动和进度变化依然由代码处理。

## 新增与复用追踪

- 新增组件：`source/build-extensions.py`；继承组件仍在 `source/build-kit.py`，清单合并为 `manifest.json`。
- `reuse-manifest.json`：**21 个已有物品 SVG、9 个已有建筑 PNG**；原路径、交付路径、SHA-256 与“未修改”状态均可核对。
- `environment-reuse-review.json`：原有 12 项环境核对记录不变。
- `terrain/manifest.json`：额外记录原灌木作为小簇元素的复用来源和哈希；薄雾标注移除底板的派生关系。原文件均保留。
- 实际页面依据：`evidence/current-shop-main.png`、`current-storage-main.png`、`current-orders-main.png`，通过正式 main 的隔离 QA 页面查看，没有使用玩家存档。
- 交互与边界验证：`expansion-verification.md`；结构与图像检查：`qa-report.json`、`expansion-qa-report.json`。

## 重建

```sh
python3 source/build-kit.py
python3 source/build-terrain-effects.py
# 使用已安装的 sharp；也可通过 SHARP_MODULE 指定现有包的绝对路径
node source/render-vector-exports.cjs
python3 source/build-landscape-review.py
python3 source/export-artboards.py
python3 source/build-expansion-review.py
python3 source/build-gallery.py
python3 source/verify-delivery.py
# 此项需要 Pillow，用于检查 PNG 透明与图集帧一致性
python3 source/verify-expansion.py
```

HTML 组合使用独立文本与组件；`source/*-layout.json` 为真实浏览器可见布局记录。改字号或排版后，应先重新采集布局再导出 SVG，不能只改截图。此交付已完成美术预览验证，尚不代表正式游戏接入或实体手机性能验收。
