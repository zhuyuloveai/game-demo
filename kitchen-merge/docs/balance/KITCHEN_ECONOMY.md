# 小厨合合经济与等级奖励全表

设计值D；历史资源档位的来源列于物品表。操作和继承规则见 [主设计](KITCHEN_BALANCE.md)。本表由JSON生成。

## 全局参数

| 字段 | 值 |
| --- | --- |
| boardRows | 7 |
| boardCols | 7 |
| energyCap | 100 |
| manualEnergyCap | 999 |
| energyRegenSeconds | 120 |
| energyPerTap | 1 |
| initialCoins | 120 |
| initialGems | 20 |
| initialEnergy | 100 |
| initialStorage | 6 |
| maxStorage | 60 |
| dailyTimezone | Asia/Shanghai |
| maxOrdinaryOrders | 3 |
| mergeRatio | 2 |
| currencyCap | 1000000000 |
| orderCoinFormula | ceil(8 + 2*C) |
| orderXpFormula | ceil(4 + C/4) |
| repeatStarFormula | min(4, max(1, ceil(C/40))) |
| xpPerLevelFormula | 100 + 20*(level-1) |
| sellFormula | 1 + floor((level-1)/2) |
| perMergeXp | 0 |
| firstDiscoveryXp | 1 |
| coinEnergyPurchase | False |
| recipeEfficiencyFloor | 0.9 |
| playerLevelCap | 100 |
| lockedCellCoinFormula | 12 + floor(index/7)*4 |
| claimResourceEnergyCost | 0 |
| infiniteEnergyMaxSeconds | 3600 |
| stopwatchMaxCreditSeconds | 432000 |
| discardUndoSeconds | 30 |


## 每日与每周供给

| 来源 | 门槛/重置 | 内容 |
| --- | --- | --- |
| 每日免费礼 | 每日1次 | 小厨存钱罐 ×1 (tipjar:1)；能量补给箱 ×1 (energybox:1) |
| 休息补能 | 每日3次 | 每次25体力 |
| 每日设备委托 | 每日完成3单，北京日期奇/偶 | 黑包L1 / 粉包L1，各日仅1个 |
| 每周委托 | 周一0时起完成20单，限1次 | 高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时秒表 ×1 (stopwatch:1)；短时无限体力 ×1 (infinite:1)；一小时沙漏 ×1 (timeskip:1) |
| 订单礼盒 | 每5个C≥4的已交订单；每日最多3个 | 订单礼盒L1 |
| 主厨荣誉 | 通关12章后，每10个C≥4的订单 | 荣誉L1，无日上限 |


## 钻石补能和金币商店

| 当日第几次 | 钻石 | 体力 |
| --- | --- | --- |
| 1 | 5 | 100 |
| 2 | 10 | 100 |
| 3 | 20 | 100 |
| 4 | 40 | 100 |



| 商品 | 金币 | 每日限购 |
| --- | --- | --- |
| splitter:1 | 180 | 1 |
| charge:1 | 100 | 2 |
| unlocked producer L1 | 300 | 1 |


## 仓库付费扩容

每次+2格；初始6、上限60；按付费次数查价，赠格不增加购买序号。临近上限按实际格数折算。

| 购买序号 | 金币 |
| --- | --- |
| 1 | 80 |
| 2 | 120 |
| 3 | 180 |
| 4 | 260 |
| 5 | 360 |
| 6 | 500 |
| 7 | 680 |
| 8 | 900 |
| 9 | 1200 |
| 10 | 1500 |
| 11 | 1900 |
| 12 | 2300 |
| 13 | 2800 |
| 14 | 3400 |
| 15 | 4000 |
| 16 | 4700 |
| 17 | 5500 |
| 18 | 6400 |
| 19 | 7400 |
| 20 | 8500 |
| 21 | 9700 |
| 22 | 11000 |
| 23 | 12400 |
| 24 | 13900 |
| 25 | 15500 |
| 26 | 17200 |
| 27 | 19000 |


## 资源与辅助道具档位

领取值P表示来源中的历史档位；使用边界与掉率仍是D。

| 系列 | 等级 | 领取值/限制 | 单位 | 值证据 |
| --- | --- | --- | --- | --- |
| energy | 1 | 1 | energy | P |
| energy | 2 | 6 | energy | P |
| energy | 3 | 15 | energy | P |
| energy | 4 | 40 | energy | P |
| energy | 5 | 100 | energy | P |
| coins | 1 | 1 | coins | P |
| coins | 2 | 3 | coins | P |
| coins | 3 | 8 | coins | P |
| coins | 4 | 20 | coins | P |
| coins | 5 | 50 | coins | P |
| coins | 6 | 120 | coins | P |
| gems | 1 | 1 | gems | P |
| gems | 2 | 3 | gems | P |
| gems | 3 | 8 | gems | P |
| gems | 4 | 20 | gems | P |
| blackbag | 1 | 10 | draws | P |
| blackbag | 2 | 22 | draws | P |
| pinkbag | 1 | 12 | draws | P |
| pinkbag | 2 | 28 | draws | P |
| tipjar | 1 | 15 | draws | P |
| tipjar | 2 | 18 | draws | P |
| tipjar | 3 | 53 | draws | P |
| infinite | 1 | 30 | seconds | P |
| infinite | 2 | 60 | seconds | P |
| infinite | 3 | 120 | seconds | P |
| infinite | 4 | 300 | seconds | P |
| timeskip | 1 | 3600 | seconds | P |
| timeskip | 2 | 7200 | seconds | P |
| timeskip | 3 | 14400 | seconds | P |
| timeskip | 4 | 28800 | seconds | P |
| timeskip | 5 | 57600 | seconds | P |
| charge | 1 | 5 | charges | P |
| charge | 2 | 10 | charges | P |
| charge | 3 | 20 | charges | P |
| splitter | 1 | 4 | maxTargetLevel | P |
| splitter | 2 | 8 | maxTargetLevel | P |
| splitter | 3 | 不限 | maxTargetLevel | P |
| chest | 1 | 1 | rewardTier | D |
| chest | 2 | 2 | rewardTier | D |
| chest | 3 | 3 | rewardTier | D |
| energybox | 1 | 5 | draws | P |
| backpack | 1 | 1 | slots | P |
| stopwatch | 1 | 3600 | seconds | D |
| upgrade | 1 | 1 | levels | D |
| upgrade | 2 | 1 | levels | D |


## 黑/粉包

全部解锁后的品类权重如下；打开时过滤未解锁设备并归一化，冻结抽取池。各级包的零件等级概率相同，L1/L2/L3为65%/25%/10%。每次取物0体力。

| 包 | 产物 | 原始权重 |
| --- | --- | --- |
| blackbag | gen_tools | 35.0% |
| blackbag | gen_herb | 25.0% |
| blackbag | gen_supply | 20.0% |
| blackbag | gen_flower | 20.0% |
| pinkbag | gen_food | 20.0% |
| pinkbag | gen_produce | 20.0% |
| pinkbag | gen_drink | 15.0% |
| pinkbag | gen_asian | 15.0% |
| pinkbag | gen_mediterranean | 15.0% |
| pinkbag | gen_publicity | 7.5% |
| pinkbag | gen_recycle | 7.5% |



| 包 | 等级 | 次数 | 开锁秒 |
| --- | --- | --- | --- |
| blackbag | 1 | 10 | 600 |
| blackbag | 2 | 22 | 1800 |
| pinkbag | 1 | 12 | 900 |
| pinkbag | 2 | 28 | 2400 |


## 存钱罐

先抽金币90%或钻石10%，再抽下表中的物品等级。档位次数来自历史记录，掉率为D。

| 罐等级 | 次数 | 产L1 | 产L2 | 产L3 |
| --- | --- | --- | --- | --- |
| 1 | 15 | 90% | 10% | 0% |
| 2 | 18 | 45% | 40% | 15% |
| 3 | 53 | 35% | 45% | 20% |


## 能量箱与订单礼盒

能量箱固定5次取物，以下为每次分布；各次独立。

| 产物 | 概率 | 直接领取体力 |
| --- | --- | --- |
| energy:1 | 15% | 1 |
| energy:2 | 40% | 6 |
| energy:3 | 35% | 15 |
| energy:4 | 10% | 40 |



| 礼盒级别 | 确定奖励 |
| --- | --- |
| 1 | 能量球 ×1 (energy:2)；一小袋金币 ×1 (coins:3) |
| 2 | 大能量球 ×1 (energy:3)；一袋金币 ×1 (coins:4) |
| 3 | 充沛能量 ×1 (energy:4)；金币罐 ×1 (coins:5)；基础剪刀 ×1 (splitter:1) |


## 2—100级逐级奖励

累计XP表示达到该等级的门槛；相同等级只领取一次。等级上限100，满级后不再派等级礼包。

| 等级 | 累计XP | 该级奖励 |
| --- | --- | --- |
| 2 | 100 | 能量补给箱 ×1 (energybox:1) |
| 3 | 220 | 能量补给箱 ×1 (energybox:1) |
| 4 | 360 | 能量补给箱 ×1 (energybox:1) |
| 5 | 520 | 能量补给箱 ×1 (energybox:1)；设备工具包 ×1 (blackbag:1) |
| 6 | 700 | 能量补给箱 ×1 (energybox:1) |
| 7 | 900 | 能量补给箱 ×1 (energybox:1) |
| 8 | 1120 | 能量补给箱 ×1 (energybox:1) |
| 9 | 1360 | 能量补给箱 ×1 (energybox:1) |
| 10 | 1620 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1) |
| 11 | 1900 | 能量补给箱 ×1 (energybox:1) |
| 12 | 2200 | 能量补给箱 ×1 (energybox:1) |
| 13 | 2520 | 能量补给箱 ×1 (energybox:1) |
| 14 | 2860 | 能量补给箱 ×1 (energybox:1) |
| 15 | 3220 | 能量补给箱 ×1 (energybox:1)；食材设备包 ×1 (pinkbag:1)；短时无限体力 ×1 (infinite:1) |
| 16 | 3600 | 能量补给箱 ×1 (energybox:1) |
| 17 | 4000 | 能量补给箱 ×1 (energybox:1) |
| 18 | 4420 | 能量补给箱 ×1 (energybox:1) |
| 19 | 4860 | 能量补给箱 ×1 (energybox:1) |
| 20 | 5320 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1)；普通升级卡 ×1 (upgrade:1) |
| 21 | 5800 | 能量补给箱 ×1 (energybox:1) |
| 22 | 6300 | 能量补给箱 ×1 (energybox:1) |
| 23 | 6820 | 能量补给箱 ×1 (energybox:1) |
| 24 | 7360 | 能量补给箱 ×1 (energybox:1) |
| 25 | 7920 | 能量补给箱 ×1 (energybox:1)；设备工具包 ×1 (blackbag:1)；收纳扩容包 ×1 (backpack:1) |
| 26 | 8500 | 能量补给箱 ×1 (energybox:1) |
| 27 | 9100 | 能量补给箱 ×1 (energybox:1) |
| 28 | 9720 | 能量补给箱 ×1 (energybox:1) |
| 29 | 10360 | 能量补给箱 ×1 (energybox:1) |
| 30 | 11020 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1)；短时无限体力 ×1 (infinite:1) |
| 31 | 11700 | 能量补给箱 ×1 (energybox:1) |
| 32 | 12400 | 能量补给箱 ×1 (energybox:1) |
| 33 | 13120 | 能量补给箱 ×1 (energybox:1) |
| 34 | 13860 | 能量补给箱 ×1 (energybox:1) |
| 35 | 14620 | 能量补给箱 ×1 (energybox:1)；食材设备包 ×1 (pinkbag:1) |
| 36 | 15400 | 能量补给箱 ×1 (energybox:1) |
| 37 | 16200 | 能量补给箱 ×1 (energybox:1) |
| 38 | 17020 | 能量补给箱 ×1 (energybox:1) |
| 39 | 17860 | 能量补给箱 ×1 (energybox:1) |
| 40 | 18720 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1)；普通升级卡 ×1 (upgrade:1) |
| 41 | 19600 | 能量补给箱 ×1 (energybox:1) |
| 42 | 20500 | 能量补给箱 ×1 (energybox:1) |
| 43 | 21420 | 能量补给箱 ×1 (energybox:1) |
| 44 | 22360 | 能量补给箱 ×1 (energybox:1) |
| 45 | 23320 | 能量补给箱 ×1 (energybox:1)；设备工具包 ×1 (blackbag:1)；短时无限体力 ×1 (infinite:1) |
| 46 | 24300 | 能量补给箱 ×1 (energybox:1) |
| 47 | 25300 | 能量补给箱 ×1 (energybox:1) |
| 48 | 26320 | 能量补给箱 ×1 (energybox:1) |
| 49 | 27360 | 能量补给箱 ×1 (energybox:1) |
| 50 | 28420 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1)；收纳扩容包 ×1 (backpack:1)；设备升级卡 ×1 (upgrade:2) |
| 51 | 29500 | 能量补给箱 ×1 (energybox:1) |
| 52 | 30600 | 能量补给箱 ×1 (energybox:1) |
| 53 | 31720 | 能量补给箱 ×1 (energybox:1) |
| 54 | 32860 | 能量补给箱 ×1 (energybox:1) |
| 55 | 34020 | 能量补给箱 ×1 (energybox:1)；食材设备包 ×1 (pinkbag:1) |
| 56 | 35200 | 能量补给箱 ×1 (energybox:1) |
| 57 | 36400 | 能量补给箱 ×1 (energybox:1) |
| 58 | 37620 | 能量补给箱 ×1 (energybox:1) |
| 59 | 38860 | 能量补给箱 ×1 (energybox:1) |
| 60 | 40120 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1)；短时无限体力 ×1 (infinite:1)；普通升级卡 ×1 (upgrade:1) |
| 61 | 41400 | 能量补给箱 ×1 (energybox:1) |
| 62 | 42700 | 能量补给箱 ×1 (energybox:1) |
| 63 | 44020 | 能量补给箱 ×1 (energybox:1) |
| 64 | 45360 | 能量补给箱 ×1 (energybox:1) |
| 65 | 46720 | 能量补给箱 ×1 (energybox:1)；设备工具包 ×1 (blackbag:1) |
| 66 | 48100 | 能量补给箱 ×1 (energybox:1) |
| 67 | 49500 | 能量补给箱 ×1 (energybox:1) |
| 68 | 50920 | 能量补给箱 ×1 (energybox:1) |
| 69 | 52360 | 能量补给箱 ×1 (energybox:1) |
| 70 | 53820 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1) |
| 71 | 55300 | 能量补给箱 ×1 (energybox:1) |
| 72 | 56800 | 能量补给箱 ×1 (energybox:1) |
| 73 | 58320 | 能量补给箱 ×1 (energybox:1) |
| 74 | 59860 | 能量补给箱 ×1 (energybox:1) |
| 75 | 61420 | 能量补给箱 ×1 (energybox:1)；食材设备包 ×1 (pinkbag:1)；短时无限体力 ×1 (infinite:1)；收纳扩容包 ×1 (backpack:1) |
| 76 | 63000 | 能量补给箱 ×1 (energybox:1) |
| 77 | 64600 | 能量补给箱 ×1 (energybox:1) |
| 78 | 66220 | 能量补给箱 ×1 (energybox:1) |
| 79 | 67860 | 能量补给箱 ×1 (energybox:1) |
| 80 | 69520 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1)；普通升级卡 ×1 (upgrade:1) |
| 81 | 71200 | 能量补给箱 ×1 (energybox:1) |
| 82 | 72900 | 能量补给箱 ×1 (energybox:1) |
| 83 | 74620 | 能量补给箱 ×1 (energybox:1) |
| 84 | 76360 | 能量补给箱 ×1 (energybox:1) |
| 85 | 78120 | 能量补给箱 ×1 (energybox:1)；设备工具包 ×1 (blackbag:1) |
| 86 | 79900 | 能量补给箱 ×1 (energybox:1) |
| 87 | 81700 | 能量补给箱 ×1 (energybox:1) |
| 88 | 83520 | 能量补给箱 ×1 (energybox:1) |
| 89 | 85360 | 能量补给箱 ×1 (energybox:1) |
| 90 | 87220 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1)；短时无限体力 ×1 (infinite:1) |
| 91 | 89100 | 能量补给箱 ×1 (energybox:1) |
| 92 | 91000 | 能量补给箱 ×1 (energybox:1) |
| 93 | 92920 | 能量补给箱 ×1 (energybox:1) |
| 94 | 94860 | 能量补给箱 ×1 (energybox:1) |
| 95 | 96820 | 能量补给箱 ×1 (energybox:1)；食材设备包 ×1 (pinkbag:1) |
| 96 | 98800 | 能量补给箱 ×1 (energybox:1) |
| 97 | 100800 | 能量补给箱 ×1 (energybox:1) |
| 98 | 102820 | 能量补给箱 ×1 (energybox:1) |
| 99 | 104860 | 能量补给箱 ×1 (energybox:1) |
| 100 | 106920 | 能量补给箱 ×1 (energybox:1)；高级设备工具包 ×1 (blackbag:2)；高级食材设备包 ×1 (pinkbag:2)；一小时沙漏 ×1 (timeskip:1)；普通升级卡 ×1 (upgrade:1)；收纳扩容包 ×1 (backpack:1)；设备升级卡 ×1 (upgrade:2) |
