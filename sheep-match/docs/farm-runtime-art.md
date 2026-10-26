# 正式农场美术适配

使用 `art-packs/sumikko-farm-v1/` 的现有贴纸风格原稿。运行时现有 115 张透明 PNG，包含基础素材、42 张新增植物状态和 10 张新增动物状态。2026-10-26 的空间适配修正见 [验收记录](art-packs/sumikko-farm-v1/integration/verification.md)，[前后对比](art-packs/sumikko-farm-v1/integration/index.html) 保存了实际游戏截图。

## 包体与空间规则

- `tools/build-runtime-art.py` 等比例生成最长边不超过 512 的透明 PNG，原稿保留。已有文件解码后的像素未变时保留原字节，避免压缩库差异造成无意义更新。
- `assets/farm-runtime/manifest.json` 记录来源、SHA-256、尺寸及字节数；`farm-runtime-art-metadata.mjs` 包含透明边界、64×64 alpha 命中采样和空间配置。
- [spatial-specs.json](art-packs/sumikko-farm-v1/spatial-specs.json) 为 115 张图定义独立显示宽度、裁剪画布中的根部/脚底落点和地面连接点。逻辑占地、显示尺寸、点击轮廓分别计算。植物状态按 `displayScale` 等比缩放，根部保持在相同地面位置。
- `renderRuntimeArt` 用裁剪 viewBox 显示 PNG。`runtimeArtHit` 根据实际反射方向检查透明区，64×64 采样在轮廓边缘仍有少量近似。
- 只有正面素材时，布置界面提供 0 / 270 两个可见正面方向，以水平反射切换。旧存档的 90 / 180 朝向继续保留，选择“恢复正面朝向”后才调整；存档校验、碰撞和道路连通规则不变。
- 桥、拱门和横幅使用同一画布上的前后遮挡分区，保持原图比例和配准。花篱笆使用原生 SVG 的 16 种邻接组件。

## 覆盖与显示策略

| 内容 | 素材和状态 |
| --- | --- |
| 作物 | 11 种，幼苗/生长/成熟共 33 态；成熟胡萝卜修正为土中生长，只露根冠 |
| 果植 | 5 种，幼树/生长/成熟/待复苏/枯死共 25 态 |
| 动物与棚舍 | 5 种动物，各有 hungry / producing / ready 三态；棚舍、院子、动物和前景围栏独立分层，满栏鸡 6 只、其他 5 只 |
| 核心建筑与机器 | 使用 PNG；显示尺寸不再直接由占地宽度决定，成品入口按标注的出货点显示 |
| 自然环境 | 使用已有环境素材，重新校准树、灌木和石头的显示尺度及落点 |
| 装饰 | PNG 与 terrain SVG；桥/拱门/横幅支持前景遮挡，木篱笆与花篱笆各自按同类邻接连接 |
| 库存物品 | 85 个原生 SVG 图标统一为较细的暖棕描边，保持既有物品辨识和经济含义 |

生长计时默认隐藏，选中后展示；成熟和复苏状态使用小标记。世界中的机器成品入口折叠为一个图标加剩余数量，点击区域在缩放后保持 44×44 屏幕像素；选中机器后的完整收取列表保留。

## 后续边界

风车叶片、机械转轴等仍是静态图，空间配置中的运动轴是后续动画的准备数据。动物状态图不等于逐帧动作动画。Floral 已领取外观继续走原 SVG 回退路径，避免丢失皮肤。当前未宣称所有外观、施工或 UI 图标都重绘完成。

## 构建和验证

从 `sheep-match/` 执行：

```sh
python3 tools/build-runtime-art.py
node tools/build-flower-fences.mjs
node --test tests/farm-*.test.mjs docs/art-packs/sumikko-farm-v1/terrain/components.test.mjs
```

本轮完整结果为 478 项通过，包含发布包检查。浏览器另验证了 844×360 横屏连续收蛋、工坊成品领取、实际图片朝向往返切换、植物状态和复合素材分层。复现入口、截图与限制见验收记录。
