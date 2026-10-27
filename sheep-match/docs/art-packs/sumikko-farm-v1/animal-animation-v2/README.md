# 农场动物动作 · 第二批

基于 main `0a8363f` 的 `shelter-layers-v2` 动物状态补充动作。牛、猪、绵羊、羊羔各有吃东西、短走路两段，每段 12 个不同帧，共 **96 帧、8 张图集、8 份可编辑 ORA**。现有鸡动画和 hungry / producing / ready 状态保留。本包只交付美术，不修改游戏代码。

## 查看

从 `sheep-match/docs/art-packs` 启动本地 HTTP 服务，打开 `sumikko-farm-v1/animal-animation-v2/index.html`。页面支持 12 / 6 fps、暂停、逐帧、独立阴影和脚点叠加、原状态对照。

各物种的 `previews/` 包含两个动画 WebP、两张静态联系图和一张原状态对照图。吃东西 WebP 为便于观察而循环；游戏中建议播放一次后切换状态。

## 文件与原资源对应

| 物种目录 | 保留的原状态路径（相对于 sumikko-farm-v1） | 新动作 |
| --- | --- | --- |
| `cow/` | `shelter-layers-v2/cow/animals/cow-{hungry,producing,ready}.png` | `cow/frames/{eat,walk}/00.png` 至 `11.png` |
| `pig/` | `shelter-layers-v2/pig/animals/pig-{hungry,producing,ready}.png` | `pig/frames/{eat,walk}/00.png` 至 `11.png` |
| `sheep/` | `shelter-layers-v2/sheep/animals/sheep-{hungry,producing,ready}.png` | `sheep/frames/{eat,walk}/00.png` 至 `11.png` |
| `lamb/` | `shelter-layers-v2/lamb/animals/lamb-{hungry,producing,ready}.png` | `lamb/frames/{eat,walk}/00.png` 至 `11.png` |

每种动物的 `sources/` 保存三种原状态的原样副本、原 layout、两个生成原图、逐动作提示词、透明切片及 ORA。原图通过内置 `image_gen` 参考当前动物逐动作生成；没有使用旧 SVG 动画重画。`production-plan.json` 记录来源、提示词和原图 SHA-256。

ORA 是可在 Krita / GIMP 等软件中编辑的 **逐帧位图源文件**：12 个独立帧组、独立阴影层，不是头部和四肢拆件的骨骼源文件。默认只显示第 0 帧，其他帧组隐藏。

## 坐标与播放

- 帧画布均为 **360×280**，未裁切；根锚点 **(180,230)**，运行时偏移 `(0,0)`。当前斜侧朝向与原素材一致，反向可围绕根锚点镜像。
- `manifest.json` 的每帧 `visibleHoofTips` 是人工检查过解剖区域后提取的真实可见蹄尖。被头部遮挡的蹄子不标注。走路时抬起的蹄尖不等于地面承重点。
- 吃东西使用稳定支撑点：牛使用原 layout 中的后蹄点，避免低头时把嘴误识别为蹄子；其他物种使用近侧蹄。`supportAnchor` / `supportTarget` 记录实际值和目标值。它们不取透明画布底部。
- 身体尺寸按各物种原 hungry 状态统一，单段使用同一个缩放比例，不逐帧拉伸。走路在原地绘制交替迈步，场景位移由代码完成。
- **12 fps，1 秒，帧序 00–11**；没有复制第一帧充当末帧。走路循环，吃东西建议单次播放。
- 步幅初始建议：每周期 `(-32,+16)` 个参考像素，沿地图一条斜轴、每周期两步；实际显示乘以缩放倍率。该数值是接入起点，不能替代引擎内的脚底滑步校准。
- 阴影单独放在 `shadows/ground-shadow.png`，复用当前 hungry 阴影。动物帧中没有地面、饲料、围栏、产物或计时 UI。
- 图集 **1456×852**，4 列×3 行。每个 360×280 帧外留 2px 透明间隔，格距 364×284；读取 manifest 的 `atlasRect`，不要按裸帧尺寸连续切割。

## 检查与重建

```sh
python3 source/build-delivery.py
python3 source/verify-delivery.py
```

需要 Pillow。打包脚本只提取原图已有的 12 个姿势，清理分离的低透明度噪点，缩放、对齐和打包，不通过整张图片晃动伪造步态。原始生成图始终保留。

`qa-report.json` 检查了 96 个透明帧、每段帧唯一性、画布边界、图集矩形、ORA 与 PNG 一致性、真实蹄尖像素、支撑点、12 张原状态副本，以及配套 67 个图标。静态联系图已逐组检查，播放页已检查播放、暂停、逐帧和叠加显示。

吃东西支撑点误差不超过 1px。首尾帧的像素差记录在报告中，用于定位接缝，不代表数学意义上的零闪烁。新帧保留逐帧绘制的轮廓与表情变化；尚未接入游戏，行走位移速度、状态切换和栏杆遮挡仍需在运行时验收。
