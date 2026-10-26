# 道路、围栏与田地组件

从已确认的小牧场场景提取配色、线条和 2:1 斜向投影，整理为纯 SVG / JavaScript 组件。共 35 个独立 SVG：道路 16、围栏 16、田地 3。源码是 `components.mjs`，生成物位于 `svg/`，资源尺寸、锚点和连接方向见 `manifest.json`。

## 四邻接规则

连接掩码为 N=1、E=2、S=4、W=8，合并用按位或，文件后缀为十六进制 0–f。方向指逻辑网格：N 在屏幕右上、E 右下、S 左下、W 左上。坐标投影为 `x=(u-v)*unit`、`y=(u+v)*unit/2`。

`connections(cells)` 根据整数格子的实际邻居计算掩码。道路包括独立块、端头、直线、转角、T 形和十字，填充延伸到共享边界并裁切到地块，连接处保持同宽。

围栏贴图是一个中心立柱加相应方向的半段横杆。实际地图建议使用 `fenceNetworkPieces()`：每个节点只生成一根柱、每条连接只生成一段横杆，并返回独立深度，方便把动物和建筑插入前后遮挡顺序。`fenceLinePieces()` 支持已设计好的非整数轴向连续围栏。

## 接口示例

```js
import { connections, roadNetworkMarkup, fenceNetworkPieces, fieldPatchMarkup } from './components.mjs';
const options = { unit: 40, origin: [800, 75] };
const roads = roadNetworkMarkup([[0,0],[1,0],[2,0],[1,1]], options);
const fences = fenceNetworkPieces([[3,0],[3,1],[3,2]], options);
const fields = fieldPatchMarkup([[0,3],[1,3]], { ...options, state: 'sown' });
// 将道路与田地加入地面层，将 fences 与角色按 depth 合并排序。
```

田地状态为 `empty` 空田、`sown` 已播种、`fertilized` 已施肥，三种状态使用相同框与落地点。植物作为独立上层素材，田地本身不带植物。

| 类型 | SVG 尺寸 | 地面中心锚点 |
| --- | --- | --- |
| 道路 | 128×64 | (64,32) |
| 围栏 | 128×136 | (64,100) |
| 田地 | 128×72 | (64,36) |

`roadPathsMarkup()` 也支持固定连续路径；完整小场景已复用道路、围栏和田地组件，保持原有布局。自然树丛、水岸、门等 42 项补充组件已整理到 [`../environment/`](../environment/README.md)，组合预览位于 `/expansion/`。

## 生成、验证与预览

```sh
node terrain/build.mjs
node --test terrain/components.test.mjs
```

静态服务中访问 `/terrain/`。上方拼接区可铺路、添加围栏/田地、移除格子、切换田地状态，并实时更新连接；编辑不保存。下方展示全部 35 个 SVG。

测试覆盖全部 16 种邻接、负坐标、输入去重、交点立柱/横杆去重、共享边界、独立路段、多个路网的 clip ID、田地状态和非法几何输入。main 的 `2c4d221` 已将本目录 35 项地形及四邻接选择接入正式游戏；本目录继续保留可复现的源组件与独立预览。
