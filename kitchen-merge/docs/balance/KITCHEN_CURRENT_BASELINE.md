# 小厨合合当前版本数值快照

读取日期：2026-10-16；Git提交：`fdd3acf`。代码来源：[catalog.mjs](../../dist/catalog.mjs)、[engine.mjs](../../dist/engine.mjs)、[app.mjs](../../dist/app.mjs)。本表记录历史实现行为；当前运行时说明见[实现说明](../BALANCE_IMPLEMENTATION.md)。目标设计单独见 [KITCHEN_BALANCE.md](KITCHEN_BALANCE.md)。

## 全局与经济

| 项目 | 当前实现 |
| --- | --- |
| 棋盘 | 7×7＝49格；初始底部14格锁定 |
| 初始资产 | 120金币、100体力、0星星、0XP；6仓库格；剪刀2、沙漏2；1级礼盒1个待领 |
| 自然体力 | 30秒/点，上限100；手动补给硬上限999 |
| 生产 | 每次1体力；双品类主72%、副28%；二级概率0.08+0.06×生产器等级 |
| 生产器等级 | 1—4；库存14/18/22/26；耗尽后冷却60/50/40/30秒 |
| 自动香草 | 每60秒；离线每次tick最多补3，受四邻空格限制 |
| 合并 | 同类同级二合一；XP += 合并前等级×2；生产器合并后满库存 |
| 普通售价 | 2^(等级−1)金币 |
| 买体力 | 商店30金币→30点，可超过自然上限；补能按钮30金币→min(30,100−当前体力) |
| 订单 | 3槽；初始3单固定，其余按来源与序号轮换；C=Σ2^(等级−1)×数量；金币20+7C；XP12+3C；星星min(3,1+floor(C/12)) |
| 订单最高等级 | min(6,3+floor(装修阶段/2))；第6个序号倍数单主物数量2 |
| 玩家等级 | floor(XP/100)+1；每级100XP |
| 每3单礼盒 | 1级礼盒1个；无限累计，无日上限 |
| 每日开店礼 | 北京时间每日一次：20体力、25金币、1级礼盒1个 |
| 仓库 | 初始6；每次+2；价格80+max(0,容量−6)×20；上限60；装修赠格会影响下一次购买价格 |
| 解锁格子 | 12+floor(格子索引/7)×4金币；底部两排为32/36；也可同物或相邻合成解锁 |
| 泡泡 | 第5次合并的倍数，且普通合并结果≥3级、有空位时生成；60秒有效；价格6×2^结果等级金币；到期或戳破变coins:1即5金币 |
| 配方 | 材料按数量消耗，厨具保留且可高阶替代；即时；无额外体力或金币成本；XP为各配方值 |
| 沙漏 | 立即补满一个生产器库存，不按时间减CD |
| 剪刀 | 普通物品L≥2拆为两个L−1；额外需要一空位；生产器/资源不能剪 |
| 来源判断 | 棋盘、仓库、待领区中的生产器均计入订单可达品类 |
| 存档 | version=2，兼容1/2；未知高版本会落入新档路径，迁移前必须修复 |


## 77种图鉴物品

### 甜蜜烘焙 · `food`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| food:1 | 小麦 | 1 | — |
| food:2 | 面粉 | 2 | — |
| food:3 | 面团 | 3 | — |
| food:4 | 吐司 | 4 | — |
| food:5 | 可颂 | 5 | — |
| food:6 | 庆祝蛋糕 | 6 | — |



### 料理厨具 · `tools`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| tools:1 | 木勺 | 1 | — |
| tools:2 | 打蛋器 | 2 | — |
| tools:3 | 平底锅 | 3 | — |
| tools:4 | 炖锅 | 4 | — |
| tools:5 | 厨师机 | 5 | — |
| tools:6 | 梦幻烤箱 | 6 | — |



### 田园蔬菜 · `vegetable`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| vegetable:1 | 小萝卜 | 1 | — |
| vegetable:2 | 番茄 | 2 | — |
| vegetable:3 | 西兰花 | 3 | — |
| vegetable:4 | 蔬菜沙拉 | 4 | — |
| vegetable:5 | 烤蔬菜 | 5 | — |
| vegetable:6 | 田园拼盘 | 6 | — |



### 缤纷水果 · `fruit`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| fruit:1 | 苹果 | 1 | — |
| fruit:2 | 香橙 | 2 | — |
| fruit:3 | 草莓 | 3 | — |
| fruit:4 | 水果碗 | 4 | — |
| fruit:5 | 手作果酱 | 5 | — |
| fruit:6 | 水果挞 | 6 | — |



### 咖啡饮品 · `drink`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| drink:1 | 咖啡豆 | 1 | — |
| drink:2 | 浓缩咖啡 | 2 | — |
| drink:3 | 牛奶咖啡 | 3 | — |
| drink:4 | 拉花拿铁 | 4 | — |
| drink:5 | 冰咖啡 | 5 | — |
| drink:6 | 咖啡分享塔 | 6 | — |



### 精致餐具 · `tableware`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| tableware:1 | 小碟子 | 1 | — |
| tableware:2 | 陶瓷碗 | 2 | — |
| tableware:3 | 花边餐盘 | 3 | — |
| tableware:4 | 下午茶壶 | 4 | — |
| tableware:5 | 精致茶具 | 5 | — |
| tableware:6 | 宴会餐具 | 6 | — |



### 香草花园 · `herb`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| herb:1 | 香草种子 | 1 | — |
| herb:2 | 香草嫩芽 | 2 | — |
| herb:3 | 罗勒叶 | 3 | — |
| herb:4 | 香草盆栽 | 4 | — |
| herb:5 | 香草篮 | 5 | — |
| herb:6 | 秘制调味料 | 6 | — |



### 中式料理 · `chinese`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| chinese:1 | 香米 | 1 | — |
| chinese:2 | 水饺 | 2 | — |
| chinese:3 | 小笼包 | 3 | — |
| chinese:4 | 汤面 | 4 | — |
| chinese:5 | 暖心火锅 | 5 | — |
| chinese:6 | 中式点心宴 | 6 | — |



### 日式料理 · `japanese`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| japanese:1 | 海苔 | 1 | — |
| japanese:2 | 饭团 | 2 | — |
| japanese:3 | 寿司 | 3 | — |
| japanese:4 | 手卷 | 4 | — |
| japanese:5 | 豚骨拉面 | 5 | — |
| japanese:6 | 和风便当 | 6 | — |



### 意式料理 · `italian`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| italian:1 | 意面原料 | 1 | — |
| italian:2 | 番茄意面 | 2 | — |
| italian:3 | 芝士披萨 | 3 | — |
| italian:4 | 奶油烩饭 | 4 | — |
| italian:5 | 千层面 | 5 | — |
| italian:6 | 意式盛宴 | 6 | — |



### 墨西哥料理 · `mexican`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| mexican:1 | 甜玉米 | 1 | — |
| mexican:2 | 塔可 | 2 | — |
| mexican:3 | 芝士夹饼 | 3 | — |
| mexican:4 | 墨西哥卷饼 | 4 | — |
| mexican:5 | 玉米片拼盘 | 5 | — |
| mexican:6 | 墨西哥派对餐 | 6 | — |



### 能量补给 · `energy`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| energy:1 | 小能量球 | 1 | 5 |
| energy:2 | 能量球 | 2 | 12 |
| energy:3 | 大能量球 | 3 | 30 |
| energy:4 | 满满能量 | 4 | 80 |



### 金币收藏 · `coins`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| coins:1 | 零用金币 | 1 | 5 |
| coins:2 | 一叠金币 | 2 | 12 |
| coins:3 | 一袋金币 | 3 | 30 |
| coins:4 | 金币宝箱 | 4 | 80 |



### 厨房礼盒 · `chest`

| ID | 名称 | 等级 | 领取值 |
| --- | --- | --- | --- |
| chest:1 | 厨房礼盒 | 1 | — |
| chest:2 | 精致礼盒 | 2 | — |
| chest:3 | 豪华礼盒 | 3 | — |



## 7类生产器（每类4级，共28种等级实例）

| kind | 名称 | 品类 | 解锁阶段 | 级别 |
| --- | --- | --- | --- | --- |
| food | 烘焙食材篮 | food | 0 | 1—4 |
| produce | 生鲜采购篮 | vegetable / fruit | 0 | 1—4 |
| tools | 厨具收纳箱 | tools / tableware | 0 | 1—4 |
| drink | 咖啡工作台 | drink | 1 | 1—4 |
| herb | 香草花盆 | herb | 2 | 1—4 |
| asian | 亚洲料理台 | chinese / japanese | 3 | 1—4 |
| mediterranean | 环球料理台 | italian / mexican | 4 | 1—4 |


## 10道现有配方

| ID | 材料 | 保留工具最低级 | 输出 | XP | 解锁阶段 |
| --- | --- | --- | --- | --- | --- |
| fruit-salad | fruit:1 ×2；vegetable:1 ×1 | 1 | fruit:4 | 8 | 0 |
| golden-toast | food:3 ×1；food:2 ×1 | 3 | food:4 | 8 | 0 |
| garden-salad | vegetable:2 ×1；vegetable:1 ×1；herb:3 ×1 | 1 | vegetable:4 | 10 | 2 |
| silky-latte | drink:2 ×1；drink:1 ×1 | 2 | drink:4 | 8 | 1 |
| steamed-buns | food:3 ×1；vegetable:2 ×1 | 4 | chinese:3 | 12 | 3 |
| fresh-sushi | japanese:1 ×2；vegetable:1 ×1 | 1 | japanese:3 | 10 | 3 |
| homemade-pizza | italian:1 ×2；vegetable:2 ×1 | 3 | italian:3 | 12 | 4 |
| crisp-tacos | mexican:1 ×2；vegetable:2 ×1 | 3 | mexican:3 | 12 | 4 |
| family-hotpot | chinese:4 ×1；vegetable:3 ×1；herb:2 ×1 | 4 | chinese:5 | 20 | 3 |
| baked-lasagna | italian:2 ×2；vegetable:2 ×1；herb:3 ×1 | 6 | italian:5 | 20 | 4 |


## 8阶段装修（合计81星）

| 阶段 | 名称 | 星星 | 奖励 |
| --- | --- | --- | --- |
| 1 | 布置咖啡角 | 3 | {"unlockKind": "drink"} |
| 2 | 种下窗边香草 | 5 | {"unlockKind": "herb"} |
| 3 | 开设亚洲料理台 | 7 | {"unlockKind": "asian"} |
| 4 | 迎接环球美味 | 9 | {"unlockKind": "mediterranean"} |
| 5 | 扩建陶瓷储藏间 | 11 | {"storageReward": 2, "chestReward": 2} |
| 6 | 布置花园餐桌 | 13 | {"storageReward": 2, "coinReward": 50} |
| 7 | 升级主厨工作室 | 15 | {"chestReward": 3} |
| 8 | 开业！梦幻小厨房 | 18 | {"storageReward": 4, "chestReward": 3} |


## 商店

| 商品 | 金币价格 | 解锁阶段 | 内容 |
| --- | --- | --- | --- |
| 30 点能量 | 30 | 0 | {"type": "energy", "amount": 30} |
| 厨房礼盒 | 65 | 0 | {"type": "chest", "level": 1} |
| 合成剪刀 | 45 | 0 | {"type": "booster", "booster": "scissors"} |
| 加速沙漏 | 40 | 0 | {"type": "booster", "booster": "hourglass"} |
| 烘焙食材篮 | 90 | 0 | {"type": "producer", "kind": "food", "level": 1} |
| 生鲜采购篮 | 90 | 0 | {"type": "producer", "kind": "produce", "level": 1} |
| 厨具收纳箱 | 90 | 0 | {"type": "producer", "kind": "tools", "level": 1} |
| 咖啡工作台 | 110 | 1 | {"type": "producer", "kind": "drink", "level": 1} |
| 香草花盆 | 110 | 2 | {"type": "producer", "kind": "herb", "level": 1} |
| 亚洲料理台 | 110 | 3 | {"type": "producer", "kind": "asian", "level": 1} |
| 环球料理台 | 110 | 4 | {"type": "producer", "kind": "mediterranean", "level": 1} |


## 当前礼盒精确奖励

- L1：energy:2（12体力）+ coins:2（12金币）+ 已解锁种类随机L1生产器1个。
- L2：energy:3（30体力）+ coins:3（30金币）+ 随机L1生产器1个 + energy:2（12体力）+ 剪刀1。
- L3：energy:4（80体力）+ coins:4（80金币）+ 随机L1生产器1个 + energy:3（30体力）+ coins:4（80金币）+ 剪刀1 + 沙漏2。
- 物品进待领取区，道具计数直接增加；打开先移除原礼盒。


## 待修正的数值关系

1. L1生产器每体力平均产出1.14个一级等价，L4为1.32；直接出售平均1.14—1.32金币，而30金币能无限购买30体力。库存和操作速度限制短期速度，正期望兑换循环仍成立。
2. 果蔬沙拉用3个一级等价产出8个，拿铁用3产8；配方不耗体力，可形成显著的订单成本差。
3. 每3单必发生产器，零件供应与空间占用缺少长期约束。
4. 来源包含待领设备，可能提前产生新类别订单。
5. 合并生产器恢复满库存，拆合/升级若扩展不设守恒会增加库存套利风险。
6. 普通厨具订单能消耗唯一厨具，影响配方可用性。

本次只记录与设计，不改变运行时。
