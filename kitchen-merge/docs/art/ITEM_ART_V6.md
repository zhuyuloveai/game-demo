# 物品身份与双风格美术 V6

本轮按照已确认的逐级清单更新 53 条既有链、389 个物品身份；另提供谷物 8 级候选素材。经典使用独立 SVG 插画，新风格使用独立透明 3D 图。两套图共用同一个物品 ID、名称和识别特征。

## 内容来源

- `ITEM_IDENTITIES_V6.json` 是运行时美术身份的权威清单，包含每一级的名称、识别特征以及是否启用。
- `../../../output/kitchen-chain-art-v6/approved-plan.json` 保存用户确认的完整规划。
- `../../../output/kitchen-chain-art-v6/prompts/` 保存逐件 3D 生成提示词；`jobs.json` 保存初次生成的提示词、参考图与物品对应关系。返修的最终提示词以 `records/*.json` 中的 `prompt` 为准，原版本保存在 `sources/rejected/` 和 `records/rejected/`。
- `sources/` 是内置 imagegen 生成的透明原图，`items/` 是逐件裁边后的 PNG 和 WebP，`classic/` 是独立 SVG 插画导出。
- `records/` 保存每件 3D 图的原始路径、裁切矩形、透明像素信息、格内尺寸、接触阴影位置和视觉检查状态。

## 游戏接入约束

既有 ID、链长度、生产器激活等级、产出概率、价值、合成关系、配方输入输出及存档结构保持原值。名称变更通过 `scripts/item_identities.py` 应用到数值文档和浏览器数据；配方标题随实际产物更新。

`grain` 的 `runtimeEnabled` 为 `false`。谷物的 8 级美术只出现在对照页中；来源、产出和数值设计需另行确定。不得仅凭已生成美术将谷物塞入现有生产器。

经典插画由 `dist/chain-classic-art.mjs` 绘制，继续使用原有材质渐变；`chain-classic-layout.mjs` 保存实际轮廓测量后的缩放、基线与阴影参数。新风格的图通过 `full-art-manifest.mjs` 引用小尺寸透明 WebP。原图和 512px PNG 不应进入游戏分发包。

白色小狗保留白身体、云朵耳、黑眼鼻嘴、红色棒球帽和金色 M。主界面角色与本轮物品小狗共用这一身份。

## 检查方式

先检查各链大图的具体身份和轮廓，再检查 44px 格内尺寸，最后在实际 375×667 游戏页面中检查两套风格。可交互提示、呼吸效果、接触阴影和选择状态都需保留。

运行 `output/kitchen-chain-art-v6/measure-classic.mjs` 可重新测量经典轮廓；`stage-preview.mjs` 生成隔离样板；`review.mjs` 导出对照页和逐链图片。未生成的图在隔离样板中明确显示待完成占位，不应进入最终分发包。

`records/*.json` 中的 `pending-visual` 表示尚未完成视觉检查。自动透明边界检查和功能测试均不能代替视觉验收。
