# 小狗厨房

和白色线条小狗店长一起经营奶油暖光厨房的竖屏合成小游戏。原生 HTML、CSS、JavaScript，无需安装依赖或构建。

试玩：[http://1.92.214.23/](http://1.92.214.23/)（hw-gw-1 的 80 端口）。部署与回滚见 [deploy/README.md](deploy/README.md)。

## 本地运行

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

打开 http://127.0.0.1:4173/ 。ES Modules 需要通过 HTTP 打开。

## 玩法

- 默认使用新版数值：64系列、422项物品（411新版 + 11旧档保值）、11类多级主生产器和24条特殊转换。
- 相同物品二合一；生产器从零件合至启用等级。点击普通物品或零件选中，点击启用的主生产器生产；拖动相同物品合成，拖到不同物品交换，拖到空格移动。主动产出每件1体力，自然体力每120秒恢复1点，上限100。
- 种子袋—香草—蜗牛、空袋—布偶、储物柜—冒险—手办、钥匙—记忆、试菜—课程、堆肥—花园—猫咪等支线均可实际操作。有限载体先选中，再按“生产”；已开启后不能合并（L1存钱罐例外）、剪切或升级。
- 12章96份主线与3槽重复订单并行。交单获得金币、经验和星星；完成本章8单后花星星布置，解锁新设备。10道配方消耗食材与补差体力，保留厨具。
- 仓库暂停物品计时。日周委托、等级奖励、黑粉包、存钱罐、礼盒、钻石补体力、商店、泡泡、剪刀、补货箱、沙漏、秒表、无限体力、扩容包和升级卡均有入口。
- 礼物面板可使用初始随身道具；实体道具从棋盘“使用 / 领取”进入目标选择和实际结果预览。满盘时奖励保留在待领区。
- 当前浏览器沿用 `little-kitchen-save-v1` 键和原声音偏好，自动保存v4进度。迁移前保存旧档原文和摘要；设置页可导出存档、事件与恢复旧备份，高版本存档进入保护页。
- 保留原创Web Audio配乐、音效、合成和交单动效、厨房环境与小狗店长手账。

本轮公开证据、旧值与新值见 [逐字段对照](docs/balance/ALIGNMENT_PARAMETERS.md)，稳定ID与补绘节点见 [美术交接](docs/balance/ITEM_REFERENCE_MAP.md)，旧档迁移和浏览器证据见 [验收说明](docs/verification/feige-alignment/README.md)。

完整参数见 [设计包](docs/balance/README.md)，接入与适配见 [实现说明](docs/BALANCE_IMPLEMENTATION.md)。HTTP服务下访问 [全量视觉目录](dist/catalog.html) 或 [本地验收场景](dist/qa.html)。

## 视觉设计

- 默认使用正面粉木/奶油柜架，375×667完整显示主入口。7列9行63格采用单张连续柜格背景，每格44×44，窗口变宽时整体等比缩放。
- 保留白色身体、云朵耳、黑眼鼻嘴、红M帽的小狗，主线手札和礼物入口在订单区。底部为食谱、收纳、采购手机和收音机。
- 422个物品ID全部接入新风格位图：401件新生成、10件沿用样板、11项旧档兼容映射。运行使用411件独立WebP，物品按底部轮廓设置接触阴影。
- 底栏和设置中可切换经典/暖木柜架。经典风格保留原矢量物品和宠物图；两种风格共享正式存档，外观偏好单独保存。
- `cabinet.css`、`cabinet-layout.mjs`负责柜架布局；`full-art-manifest.mjs`和`island-art.mjs`负责物品映射；`assets/cabinet-v5/`保存运行素材。游戏规则和数值保持原样。
- 原图、独立PNG切片、提示词、返修记录与逐像素对照保存在仓库的`output/kitchen-cabinet-art-v5/`。这些制作资料不随网站发布。
- [柜架版本验收](docs/verification/cabinet-v5/README.md)记录实际浏览器截图、功能与旧档验证。原图稿对照仍有木纹、物品摆放和底部轮廓差异。
- 自托管站酷快乐体及OFL许可见[字体来源](docs/fonts/ZCOOLKuaiLe-SOURCE.txt)。原创Web Audio配乐与音效保留。
- 新风格左上角使用圆形小狗头像；手札、底部功能标签与收纳容量数字隐藏，以错峰扫光提示入口。食谱封面、收纳铭牌、手机应用屏幕和收音机调频面板增加细节。
- 物品呼吸幅度增强，可生产、可领取和可开启物品间歇轻晃。小狗使用真正的眨眼、抬爪动作帧，每24秒播放一次，交互回应至少间隔12秒；弹窗、后台和减少动态效果偏好均有对应处理。
- 本轮验收见[界面与动画更新记录](docs/verification/2026-10-19-ui/README.md)，小狗动作源图和生成提示词见[制作记录](../output/puppy-animation-v1/README.md)。

## 机制参考与实现范围

参考了《肥鹅健身房》的合成经营方向，以及生产器、订单、资源合成、仓库、辅助道具和空间解锁机制。厨房场景、物品插画、音乐、配方和数值由本项目制作；小狗店长复用用户提供的自定义宠物动画图。清洁用品类别未加入。

资料：[官方 App Store 介绍](https://apps.apple.com/cn/app/id1579028465)、[TapTap 生产器攻略](https://www.taptap.cn/moment/260763709427681258)、[玩家基础机制说明](https://forum.gamer.com.tw/C.php?bsn=77871&snA=35)。

这是单机浏览器版本，当前覆盖主经营循环，没有商业手游的账号服务、付费系统、广告或限时活动服务器。体力恢复、资源档位及部分库存/CD采用注明日期的公开记录；概率、奖励和未查证字段继续使用D设计，详见逐字段决策。

后续设计见 [庄园扩展与六周更新计划](docs/MANOR_ROADMAP.md)：包括竞品研究、田地农牧与合成的衔接、别墅厨房、夜市餐车及分期验收。新增玩法处于方案阶段，尚未上线。

## 验证

在仓库根目录执行：

```sh
python3 kitchen-merge/docs/balance/build_docs.py
python3 kitchen-merge/docs/balance/validate_balance.py
python3 kitchen-merge/scripts/sync-balance.py
node --test kitchen-merge/tests/*.test.mjs
node kitchen-merge/scripts/audit-runtime.mjs
for file in kitchen-merge/dist/*.mjs; do node --check "$file"; done
```

[验收记录](docs/verification/2026-10-16/README.md) 包含真实浏览器移动端操作和全部物品截图。插画、字体和音频均自托管，不依赖外部素材服务。
