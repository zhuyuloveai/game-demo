# 植物状态补充包

沿用首批已确认的浅暖色描边、圆润比例、粉彩配色与俯视角度。新增 42 张独立透明 PNG，按植物家族保留造型特征。

| 分类 | 新增状态 | 新增数量 | 加上已有成熟图 |
| --- | --- | ---: | ---: |
| 11 种作物 | `sprout` 幼苗、`grown` 生长中 | 22 | 33 |
| 5 种果树/浆果 | `young` 幼株、`growing` 生长中、`wilt_help` 待复苏、`wilt_final` 枯死 | 20 | 25 |
| 合计 | | **42** | **58** |

成熟作物与结果果树直接引用 `../assets/` 中的原图，没有重复复制。`manifest.json` 的 58 条记录包括这 16 张已有素材。

## 预览与使用

从素材包根目录启动静态服务器，访问 `/plant-states/`。支持作物/果树筛选、草地/奶油/透明底色、原图放大和下载。每行按同一落地基准比较各阶段。

完整小场景可通过 `/scene/?plants=sprout`、`?plants=grown`、`?plants=mixed` 检查不同阶段在原布局中的效果；默认 `/scene/` 保持成熟植物。

每条清单记录包含：

- `opaqueBounds`：原始 PNG 内 alpha ≥ 128 的主体范围；预览通过 SVG viewBox 显示，源文件不裁切。
- `anchor`：主体底部中心的原图像素坐标。不同阶段共用世界坐标中的落地点。
- `heightScale` / `displayScale`：相对成熟图的展示高/宽比例；宽度比例按主体纵横比换算，避免枯枝在换图后被放得过大。
- `projectId` / `state`：原项目植物 ID 与状态，便于后续映射。
- `provenance` / `sha256`：实际生成记录和源文件校验值。

这批保留原始分辨率；正式游戏接入时仍需根据目标显示尺寸做运行时导出、压缩与图集。

## 生成与检查

使用 Codex 内置 imagegen，逐张参考已批准的成熟植物图；没有使用 CLI/API key 模式。`generation/*.json` 保存实际提示词、参考文件和工具原始输出路径。小麦生长中采用第二版提示词，改为未抽穗的茎叶；实际采用记录以 `generation/wheat-grown.json` 为准。

`prepare_jobs.py` 只整理初始 42 项计划与提示词，不调用生成服务。`jobs.json` 是初始计划；后续修订提示词保存在对应生成记录中。工具原始文件保留在生成目录，素材包中的 PNG 与原始文件逐字节一致。

```sh
# 需要 Pillow；只读源 PNG，重建清单与 QA 拼图
python3 plant-states/build_manifest.py
```

`qa/report.json` 检查数量、RGBA、透明背景、实体填色、唯一哈希、原始文件一致性及主体范围。`qa/crops-1.jpg`、`qa/crops-2.jpg`、`qa/fruit-plants.jpg` 用于整组目视比较。半透明比例较高的条目列入人工复核；验收记录见 `qa/review-notes.md`。
