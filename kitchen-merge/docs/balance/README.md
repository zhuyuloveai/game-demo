# 小厨合合数值与物品设计包

日期：2026-10-16。状态：设计已接入默认运行时；[实现与验证说明](../BALANCE_IMPLEMENTATION.md)。

## 阅读入口

| 文档 | 内容 |
| --- | --- |
| [肥鹅健身房参考研究](FEIGE_REFERENCE.md) | 玩法结构、物品关系、数值证据、版本差异、研究缺口 |
| [肥鹅物品证据表](FEIGE_ITEMS.md) | 40个已定位系列，逐级已知名称及未知项 |
| [肥鹅数值证据表](FEIGE_NUMBERS.md) | 32项参数/数据缺口，官方与玩家记录分级 |
| [来源登记](SOURCES.md) | 26个来源的链接、日期和使用限制 |
| [小厨现版快照](KITCHEN_CURRENT_BASELINE.md) | 从代码读取的77种图鉴物品、7类生产器、10道配方及全部经济规则 |
| [小厨目标数值设计](KITCHEN_BALANCE.md) | 参考映射、全局规则、生产、订单、奖励、经济、辅助道具、解锁和旧档迁移 |
| [小厨目标物品全表](KITCHEN_ITEMS.md) | 64个系列、421个条目，包含名称、等级、合成目标和价值 |
| [小厨生产器与转换表](KITCHEN_PRODUCERS.md) | 11类主生产器的全部等级数值、21条特殊产出/转换规则 |
| [小厨订单与配方表](KITCHEN_ORDERS_RECIPES.md) | 12章、96个固定主线订单、10道配方的准确数量与奖励 |
| [小厨经济与等级奖励](KITCHEN_ECONOMY.md) | 资源容器、商店、27档扩容价格和2—100级逐级奖励 |
| [数值审计](VALIDATION.md) | 引用、概率、可达性、旧物品保留、配方成本、期望值和抽样结果 |

## “参考肥鹅”的执行口径

1. 已经查证的合成结构、资源档位、典型链长作为明确参照。
2. 旧版、台服和官方更新分别留档，不把它们拼成一份伪造的现版配置。
3. 肥鹅未公开的掉率、完整冷却、订单奖励和升级曲线，在小厨中补成可执行的 **D：拟定数值**。
4. 保留小厨已有66个普通物品的ID和名称；原有料理配方、世界菜系、厨房风格继续使用。

因此本包可以支持实现和调参；它不声称取得了肥鹅的私有配置或完成了数值逐项一比一复刻。两款游戏的内容范围及适配差异在主设计文档中逐项列明。

## 数据和维护

- [current-baseline.json](current-baseline.json)：Git `fdd3acf` 的现版配置及新档样本，固定快照。
- [feige-reference.json](feige-reference.json)：研究数据；未知值使用 `null`。
- [kitchen-target.json](kitchen-target.json)：目标配置，`status=DESIGN_ONLY_NOT_RUNTIME`。
- [sources.json](sources.json)：来源登记。
- [build_docs.py](build_docs.py)：设计数据和表格的生成源。改数值先改这里，再生成表格。
- [validate_balance.py](validate_balance.py)：检查文档数据；不调用或修改游戏运行状态。

在仓库根目录运行：

```sh
python3 kitchen-merge/docs/balance/build_docs.py
python3 kitchen-merge/docs/balance/validate_balance.py
```

主文档 `FEIGE_REFERENCE.md`、`KITCHEN_BALANCE.md` 和本索引人工维护；其他表格由脚本生成。自动生成的表格不要单独手改。更新公开证据时保留原来源日期、地区、版本、获取方式以及冲突说明。

## 范围

本版覆盖常驻主棋盘、厨房配方、12章建设和辅助经济。肥鹅活动以参考案例登记；小厨庄园农牧、餐车及限时活动继续按 [庄园扩展计划](../MANOR_ROADMAP.md) 分期设计，尚未虚构为已实现系统。新增的第9—12章是常驻厨房主题任务，和六周开发批次不作一一对应。

默认运行代码已接入本设计，存档升级至v3；生产部署不在本次交付范围。
