# 鸡的动作样板 · animal-animation-v1

本批仅交付鸡的「低头啄食」和「原地短走」。每段 12 张不同帧，12 fps，约 1 秒。牛、猪、绵羊、羊羔待鸡样板确认后再制作。只增加美术资源、资源构建脚本和独立预览页，没有改动游戏代码或原素材。

基于 `origin/main` 的 `c7eab83e56fa4ec91e0d10927575eef1cf697bb2`，参考 `shelter-layers-v2/chicken/animals/chicken-{hungry,producing,ready}.png` 和 `layout.json`。实际查看了三个状态；没有参考旧 SVG 动画。

## 看效果

从本目录启动 `python3 -m http.server 64241 --bind 127.0.0.1`，打开 <http://127.0.0.1:64241/>。预览支持 12/6/3 fps、暂停、单步、两段独立拖帧、阴影开关、接触点和透明底检查，以及走路步幅校准。

- [啄食动画 WebP](chicken/previews/eat.webp)、[走路动画 WebP](chicken/previews/walk.webp)
- [啄食联系图](chicken/previews/eat-contact-sheet.png)、[走路联系图](chicken/previews/walk-contact-sheet.png)
- [与原有状态对照](chicken/previews/reference-comparison.png)
- [完整清单](chicken/manifest.json)、[自动检查结果](chicken/qa-report.json)

## 交付文件

| 资源 | 文件 | 说明 |
|---|---|---|
| 啄食透明序列 | `chicken/frames/eat/00.png`–`11.png` | 12 帧，无重复末帧 |
| 短走透明序列 | `chicken/frames/walk/00.png`–`11.png` | 12 帧，原地交替步态 |
| 图集 | `chicken/atlases/chicken-eat.png`、`chicken-walk.png` | 每张 1456×852，4 列×3 行，2px 透明留边 |
| 独立落地阴影 | `chicken/shadows/ground-shadow.png` | 复用原 hungry 阴影；不在动物帧中重复烘焙 |
| OpenRaster 可编辑源文件 | `chicken/sources/chicken-eat.ora`、`chicken-walk.ora` | 帧组、部件层清晰命名；支持 OpenRaster 的绘画软件打开 |
| 单帧可编辑排版源文件 | `chicken/sources/frame-svg/{eat,walk}-00.svg`–`11.svg` | 内嵌透明位图部件及位置变换；不是旧 SVG 动画，也不是伪称矢量重绘 |
| 原始生成图 | `chicken/sources/{eat,walk}-generated-atlas.png` | 内置 image_gen 输出，保留来源以便继续绘制 |
| 透明分割片与部件 | `chicken/sources/slices/`、`parts/`、`layer-png/` | 可独立替换、修改和重组 |
| 生成提示词 | `chicken/sources/generation-prompts.json`、`generation-refinements.json` | 含动作、步态、配色修正过程 |
| 对照副本 | `chicken/sources/reference-{hungry,producing,ready}.png`、`reference-layout.json` | 与原文件一致，原目录未覆盖 |

ORA 中每个动作有 12 个帧组，仅 00 帧默认可见；切换帧组即可编辑对应帧。阴影是独立隐藏图层。走路帧组由远脚、近脚、身体三层组成；啄食每帧是独立绘制的透明位图层，可画改和替换，不把位图描述成可编辑的矢量路径。

## 对齐、透视与动作

所有运行时帧为 **360×280 RGBA**，未裁切，偏移量 `(0,0)`。根锚点沿用 **(180,230)**。原 hungry 的近脚接触点为 `(180,230)`，远脚为 `(131.087,219.2391)`；另一个近脚趾点 `(187.337,228.0435)` 只作原图对照，不作为独立第三只脚。

对齐使用脚掌区域下侧的真实接触像素和 `layout.json`，不使用透明画布底部或整图包围盒中心。啄食按两脚接点校准轻微透视差异，近脚始终在根锚点；远脚被低头姿势遮住的帧标为 `occludedByPeck`，不假称可见。原地走路根锚点固定，脚掌按步态沿地面方向交替支撑、抬起和回摆；每帧实际脚点、投影点、抬脚高度与支撑状态写在清单里。

走路直接复用获准的 hungry **身体像素**，分离原脚后放入新绘的腿脚，身体不做整体平移、旋转或摇晃。这样避免头、翅膀和轮廓在相邻帧闪烁。啄食为新绘的姿势序列，有低头时正常的轮廓和身体形变；最终张力、节奏和回到 hungry 的观感以本次样板审阅为准。并未重画或替换 producing / ready。

两个动作的预览均可循环 `00 → … → 11 → 00`，没有再复制第一帧作为末帧。建议啄食按需播放一次，再由代码切回 hungry 或指定状态；状态切换不包含在图片里。

## 步幅建议

走路在原地完成，**不要把场景位移烘焙进图像**。

- 一周期 1 秒、两步；原尺寸每周期场景根位移建议 **(-36,+18) px**，长度约 **40.25px**。
- 每半周期一步，位移 **(-18,+9) px**。地面方向斜率为 -0.5。
- 支撑阶段脚掌相对根每帧移动 `(+3,-1.5) px`，与根每帧 `(-3,+1.5) px` 相抵消。
- 显示缩放为 `s` 时，上述位移与速度都乘 `s`；变更 fps 时速度同步按比例改变。
- 镜像后 x 位移取反，根锚点 x 仍为 180；本批未新增另一朝向或背面素材。
- 预览的步幅演示每三周期复位一次，复位仅用于有限画幅展示。

支撑脚尖随脚掌绘制会存在约 1–2px 抗锯齿变化。应以清单的脚掌接触点校准场景速度，不使用轮廓最底的一根脚趾作为每帧根锚点。

## 制作与检查

使用内置 **image_gen** 生成并修正新姿势，保留其透明 alpha。原始生成图的空白处存在少量孤立低 alpha 彩色噪点；切片按主体连通区域保留原始 RGBA 及邻近抗锯齿，剔除与主体无关的噪点。部件分离、锚点对齐、打包和图集拼装由本目录离线脚本完成。没有生成饲料、产物、地面、围栏或计时 UI。

已检查：24 帧尺寸、独立性、透明边界、图集逐像素对应、可见脚点距实际 alpha 像素、走路身体层一致、建议速度下支撑点漂移、首尾差异是否异常，以及原对照文件哈希。详见 `qa-report.json`。浏览器中可播放、暂停、切换速度并逐帧检查；联系图用于比较轮廓和脚点。数值检查不替代审美确认，本批仍是鸡样板。

重新导出需要 Node.js + Sharp、Python + Pillow：

```sh
node source/analyze-slices.cjs
node source/build-chicken.cjs
node source/package-previews.cjs
python3 source/package-editable.py
node source/validate.cjs
```

Sharp 不在默认模块路径时，设置 `SHARP_MODULE` 为安装目录。脚本仅写本美术包；不需要启动游戏构建或改动游戏资源引用。
