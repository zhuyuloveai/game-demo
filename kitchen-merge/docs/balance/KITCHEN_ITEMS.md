# 小厨合合目标物品全表

生成日期：2026-10-16。已接入默认运行时v4。源数据：[kitchen-target.json](kitchen-target.json)。共 64 个系列、422 个定义；含生产器零件、状态阶段和仅供迁移的旧资源。

## 字段与计数

`baseUnits` 为普通同物二合一的一级等价数；状态阶段无此值。`standardCost` 为订单定价权重，自动产物包含时间权重，不能读成精确体力消耗。普通物品售价是项目拟定；资源以领取价值为准。带生产能力的实例默认保护，出售/交单必须通过依赖检查。全部名称和配置见各表，未启用的高等级也属于本版设计范围。

图鉴覆盖普通、生产器、资源和特殊阶段四页；`legacy_*` 仅旧档持有时显示，计数不纳入新玩家收集完成率。

## 烘焙甜点 · `food`

类型：commodity；最早章节：1；参考关系：有氧器材11级长主链；厨房题材适配。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| food:1 | 1 | 黄油曲奇 | food:2 | 1 | 1 | 1.111 |
| food:2 | 2 | 芝麻贝果 | food:3 | 2 | 1 | 2.222 |
| food:3 | 3 | 牛奶吐司 | food:4 | 4 | 2 | 4.444 |
| food:4 | 4 | 黄油可颂 | food:5 | 8 | 2 | 8.889 |
| food:5 | 5 | 蝴蝶酥 | food:6 | 16 | 3 | 17.778 |
| food:6 | 6 | 闪电泡芙 | food:7 | 32 | 3 | 35.556 |
| food:7 | 7 | 肉桂卷 | food:8 | 64 | 4 | 71.111 |
| food:8 | 8 | 蓝莓玛芬 | food:9 | 128 | 4 | 142.222 |
| food:9 | 9 | 樱桃丹麦酥 | food:10 | 256 | 5 | 284.444 |
| food:10 | 10 | 树根蛋糕 | food:11 | 512 | 5 | 568.889 |
| food:11 | 11 | 草莓夏洛特蛋糕 | — | 1024 | 6 | 1137.778 |



## 料理厨具 · `tools`

类型：commodity；最早章节：1；参考关系：维修工具14级长链。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| tools:1 | 1 | 木勺 | tools:2 | 1 | 1 | 1.25 |
| tools:2 | 2 | 打蛋器 | tools:3 | 2 | 1 | 2.5 |
| tools:3 | 3 | 厨房夹 | tools:4 | 4 | 2 | 5.0 |
| tools:4 | 4 | 硅胶刮刀 | tools:5 | 8 | 2 | 10.0 |
| tools:5 | 5 | 漏勺 | tools:6 | 16 | 3 | 20.0 |
| tools:6 | 6 | 擀面杖 | tools:7 | 32 | 3 | 40.0 |
| tools:7 | 7 | 刨丝器 | tools:8 | 64 | 4 | 80.0 |
| tools:8 | 8 | 石臼 | tools:9 | 128 | 4 | 160.0 |
| tools:9 | 9 | 煎锅 | tools:10 | 256 | 5 | 320.0 |
| tools:10 | 10 | 双耳汤锅 | tools:11 | 512 | 5 | 640.0 |
| tools:11 | 11 | 铸铁炖锅 | tools:12 | 1024 | 6 | 1280.0 |
| tools:12 | 12 | 压力锅 | tools:13 | 2048 | 6 | 2560.0 |
| tools:13 | 13 | 手摇绞肉机 | tools:14 | 4096 | 7 | 5120.0 |
| tools:14 | 14 | 手动压面机 | — | 8192 | 7 | 10240.0 |



## 田园蔬菜 · `vegetable`

类型：commodity；最早章节：1；参考关系：健康食品；保留旧6级并延长为8级。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| vegetable:1 | 1 | 胡萝卜 | vegetable:2 | 1 | 1 | 1.613 |
| vegetable:2 | 2 | 黄瓜 | vegetable:3 | 2 | 1 | 3.226 |
| vegetable:3 | 3 | 茄子 | vegetable:4 | 4 | 2 | 6.452 |
| vegetable:4 | 4 | 西兰花 | vegetable:5 | 8 | 2 | 12.903 |
| vegetable:5 | 5 | 南瓜 | vegetable:6 | 16 | 3 | 25.806 |
| vegetable:6 | 6 | 芦笋 | vegetable:7 | 32 | 3 | 51.613 |
| vegetable:7 | 7 | 宝塔花菜 | vegetable:8 | 64 | 4 | 103.226 |
| vegetable:8 | 8 | 朝鲜蓟 | — | 128 | 4 | 206.452 |



## 缤纷水果 · `fruit`

类型：commodity；最早章节：1；参考关系：冰箱/器材副链结构；保留项目水果。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| fruit:1 | 1 | 苹果 | fruit:2 | 1 | 1 | 3.571 |
| fruit:2 | 2 | 香橙 | fruit:3 | 2 | 1 | 7.143 |
| fruit:3 | 3 | 香蕉 | fruit:4 | 4 | 2 | 14.286 |
| fruit:4 | 4 | 草莓 | fruit:5 | 8 | 2 | 28.571 |
| fruit:5 | 5 | 芒果 | fruit:6 | 16 | 3 | 57.143 |
| fruit:6 | 6 | 火龙果 | fruit:7 | 32 | 3 | 114.286 |
| fruit:7 | 7 | 山竹 | fruit:8 | 64 | 4 | 228.571 |
| fruit:8 | 8 | 榴莲 | — | 128 | 4 | 457.143 |



## 手作饮品 · `drink`

类型：commodity；最早章节：2；参考关系：饮品至少11级。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| drink:1 | 1 | 鲜牛奶 | drink:2 | 1 | 1 | 1.0 |
| drink:2 | 2 | 柠檬汽水 | drink:3 | 2 | 1 | 2.0 |
| drink:3 | 3 | 鲜榨橙汁 | drink:4 | 4 | 2 | 4.0 |
| drink:4 | 4 | 浓缩咖啡 | drink:5 | 8 | 2 | 8.0 |
| drink:5 | 5 | 抹茶拿铁 | drink:6 | 16 | 3 | 16.0 |
| drink:6 | 6 | 珍珠奶茶 | drink:7 | 32 | 3 | 32.0 |
| drink:7 | 7 | 草莓奶昔 | drink:8 | 64 | 4 | 64.0 |
| drink:8 | 8 | 椰青冷萃 | drink:9 | 128 | 4 | 128.0 |
| drink:9 | 9 | 芒果冰沙 | drink:10 | 256 | 5 | 256.0 |
| drink:10 | 10 | 蓝莓酸奶昔 | drink:11 | 512 | 5 | 512.0 |
| drink:11 | 11 | 蝶豆花特调 | — | 1024 | 6 | 1024.0 |



## 精致餐具 · `tableware`

类型：commodity；最早章节：1；参考关系：手套副产物结构；项目已有6级餐具独立保留。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| tableware:1 | 1 | 小瓷碟 | tableware:2 | 1 | 1 | 12.5 |
| tableware:2 | 2 | 陶瓷饭碗 | tableware:3 | 2 | 1 | 25.0 |
| tableware:3 | 3 | 双耳汤盅 | tableware:4 | 4 | 2 | 50.0 |
| tableware:4 | 4 | 高脚玻璃杯 | tableware:5 | 8 | 2 | 100.0 |
| tableware:5 | 5 | 花瓣茶壶 | tableware:6 | 16 | 3 | 200.0 |
| tableware:6 | 6 | 船形酱汁壶 | tableware:7 | 32 | 3 | 400.0 |
| tableware:7 | 7 | 带盖陶瓷汤盆 | tableware:8 | 64 | 4 | 800.0 |
| tableware:8 | 8 | 天鹅糖罐 | — | 128 | 4 | 1600.0 |



## 香草与香料 · `herb`

类型：commodity；最早章节：3；参考关系：植物6级及末端自动产物。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| herb:1 | 1 | 罗勒 | herb:2 | 1 | 1 | 1.667 |
| herb:2 | 2 | 薄荷 | herb:3 | 2 | 1 | 3.333 |
| herb:3 | 3 | 迷迭香 | herb:4 | 4 | 2 | 6.667 |
| herb:4 | 4 | 百里香 | herb:5 | 8 | 2 | 13.333 |
| herb:5 | 5 | 紫苏 | herb:6 | 16 | 3 | 26.667 |
| herb:6 | 6 | 藏红花 | — | 32 | 0 | 53.333 |



## 中式料理 · `chinese`

类型：commodity；最早章节：4；参考关系：项目原有菜系。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| chinese:1 | 1 | 葱油饼 | chinese:2 | 1 | 1 | 1.389 |
| chinese:2 | 2 | 水饺 | chinese:3 | 2 | 1 | 2.778 |
| chinese:3 | 3 | 小笼包 | chinese:4 | 4 | 2 | 5.556 |
| chinese:4 | 4 | 牛肉汤面 | chinese:5 | 8 | 2 | 11.111 |
| chinese:5 | 5 | 糯米烧卖 | chinese:6 | 16 | 3 | 22.222 |
| chinese:6 | 6 | 荷叶糯米鸡 | chinese:7 | 32 | 3 | 44.444 |
| chinese:7 | 7 | 东坡肉 | chinese:8 | 64 | 4 | 88.889 |
| chinese:8 | 8 | 松鼠桂鱼 | — | 128 | 4 | 177.778 |



## 日式料理 · `japanese`

类型：commodity；最早章节：4；参考关系：项目原有菜系。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| japanese:1 | 1 | 梅子饭团 | japanese:2 | 1 | 1 | 3.571 |
| japanese:2 | 2 | 厚蛋烧 | japanese:3 | 2 | 1 | 7.143 |
| japanese:3 | 3 | 三文鱼握寿司 | japanese:4 | 4 | 2 | 14.286 |
| japanese:4 | 4 | 海苔手卷 | japanese:5 | 8 | 2 | 28.571 |
| japanese:5 | 5 | 炸虾天妇罗 | japanese:6 | 16 | 3 | 57.143 |
| japanese:6 | 6 | 豚骨拉面 | japanese:7 | 32 | 3 | 114.286 |
| japanese:7 | 7 | 鳗鱼饭 | japanese:8 | 64 | 4 | 228.571 |
| japanese:8 | 8 | 樱花和果子 | — | 128 | 4 | 457.143 |



## 意式料理 · `italian`

类型：commodity；最早章节：5；参考关系：项目原有菜系。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| italian:1 | 1 | 意式面包棒 | italian:2 | 1 | 1 | 1.389 |
| italian:2 | 2 | 番茄意面 | italian:3 | 2 | 1 | 2.778 |
| italian:3 | 3 | 玛格丽特披萨 | italian:4 | 4 | 2 | 5.556 |
| italian:4 | 4 | 南瓜烩饭 | italian:5 | 8 | 2 | 11.111 |
| italian:5 | 5 | 千层面 | italian:6 | 16 | 3 | 22.222 |
| italian:6 | 6 | 菠菜方饺 | italian:7 | 32 | 3 | 44.444 |
| italian:7 | 7 | 墨鱼汁意面 | italian:8 | 64 | 4 | 88.889 |
| italian:8 | 8 | 提拉米苏 | — | 128 | 4 | 177.778 |



## 墨西哥料理 · `mexican`

类型：commodity；最早章节：5；参考关系：项目原有菜系。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| mexican:1 | 1 | 墨西哥烤玉米 | mexican:2 | 1 | 1 | 3.571 |
| mexican:2 | 2 | 塔可 | mexican:3 | 2 | 1 | 7.143 |
| mexican:3 | 3 | 芝士夹饼 | mexican:4 | 4 | 2 | 14.286 |
| mexican:4 | 4 | 墨西哥卷饼 | mexican:5 | 8 | 2 | 28.571 |
| mexican:5 | 5 | 玉米叶塔玛利 | mexican:6 | 16 | 3 | 57.143 |
| mexican:6 | 6 | 酿馅辣椒 | mexican:7 | 32 | 3 | 114.286 |
| mexican:7 | 7 | 红酱恩奇拉达 | mexican:8 | 64 | 4 | 228.571 |
| mexican:8 | 8 | 亡灵节面包 | — | 128 | 4 | 457.143 |



## 厨房织物 · `linen`

类型：commodity；最早章节：1；参考关系：手套3级。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| linen:1 | 1 | 单只隔热手套 | linen:2 | 1 | 1 | 8.333 |
| linen:2 | 2 | 一双隔热手套 | linen:3 | 2 | 1 | 16.667 |
| linen:3 | 3 | 主厨隔热手套 | — | 4 | 2 | 33.333 |



## 食材保鲜 · `preservation`

类型：commodity；最早章节：1；参考关系：常备药品4级，厨房主题转换。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| preservation:1 | 1 | 保鲜膜卷 | preservation:2 | 1 | 1 | 10.0 |
| preservation:2 | 2 | 拉链密封袋 | preservation:3 | 2 | 1 | 20.0 |
| preservation:3 | 3 | 扣盖保鲜盒 | preservation:4 | 4 | 2 | 40.0 |
| preservation:4 | 4 | 台式真空封口机 | — | 8 | 2 | 80.0 |



## 烘焙器具 · `bakeware`

类型：commodity；最早章节：1；参考关系：力量器械副链；7级为拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| bakeware:1 | 1 | 纸杯模具 | bakeware:2 | 1 | 1 | 10.0 |
| bakeware:2 | 2 | 菊花蛋糕模 | bakeware:3 | 2 | 1 | 20.0 |
| bakeware:3 | 3 | 圆形蛋糕模 | bakeware:4 | 4 | 2 | 40.0 |
| bakeware:4 | 4 | 长方烤盘 | bakeware:5 | 8 | 2 | 80.0 |
| bakeware:5 | 5 | 六孔玛芬盘 | bakeware:6 | 16 | 3 | 160.0 |
| bakeware:6 | 6 | 旋转裱花台 | bakeware:7 | 32 | 3 | 320.0 |
| bakeware:7 | 7 | 城堡蛋糕模 | — | 64 | 4 | 640.0 |



## 香草种子包装 · `seedbag`

类型：hybrid；最早章节：3；参考关系：种子袋4级。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| seedbag:1 | 1 | 扁平种子纸包 | seedbag:2 | 1 | 1 | 1.0 |
| seedbag:2 | 2 | 三角种子袋 | seedbag:3 | 2 | 1 | 2.0 |
| seedbag:3 | 3 | 束口种子袋 | seedbag:4 | 4 | 2 | 4.0 |
| seedbag:4 | 4 | 立底亚麻种子袋 | — | 8 | 2 | 8.0 |



## 布袋再利用 · `emptybag`

类型：commodity；最早章节：3；参考关系：空袋4级后跨链合成。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| emptybag:1 | 1 | 空亚麻袋 | emptybag:2 | 1 | 1 | 20 |
| emptybag:2 | 2 | 拆线布片 | emptybag:3 | 2 | 1 | 40 |
| emptybag:3 | 3 | 缝补方巾 | emptybag:4 | 4 | 2 | 80 |
| emptybag:4 | 4 | 熨平布卷 | — | 8 | 2 | 160 |



## 布艺手作 · `doll`

类型：commodity；最早章节：3；参考关系：布袋玩偶；8级为拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| doll:1 | 1 | 剪裁布片 | doll:2 | 1 | 1 | 320 |
| doll:2 | 2 | 针线包 | doll:3 | 2 | 1 | 640 |
| doll:3 | 3 | 番茄针插 | doll:4 | 4 | 2 | 1280 |
| doll:4 | 4 | 布艺胡萝卜 | doll:5 | 8 | 2 | 2560 |
| doll:5 | 5 | 布艺小鱼 | doll:6 | 16 | 3 | 5120 |
| doll:6 | 6 | 条纹袜子猫 | doll:7 | 32 | 3 | 10240 |
| doll:7 | 7 | 长耳布兔 | doll:8 | 64 | 4 | 20480 |
| doll:8 | 8 | 小白狗厨师布偶 | — | 128 | 4 | 40960 |



## 奇趣蜗牛 · `snail`

类型：commodity；最早章节：3；参考关系：蜗牛6级；名称原创。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| snail:1 | 1 | 空螺壳 | snail:2 | 1 | 1 | 4 |
| snail:2 | 2 | 圆壳小蜗牛 | snail:3 | 2 | 1 | 8 |
| snail:3 | 3 | 锥壳蜗牛 | snail:4 | 4 | 2 | 16 |
| snail:4 | 4 | 叶壳蜗牛 | snail:5 | 8 | 2 | 32 |
| snail:5 | 5 | 花壳蜗牛 | snail:6 | 16 | 3 | 64 |
| snail:6 | 6 | 星月蜗牛 | — | 32 | 3 | 128 |



## 餐厅储物柜 · `pantry`

类型：hybrid；最早章节：6；参考关系：储物柜11级；高阶名称原创。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| pantry:1 | 1 | 藤编储物篮 | pantry:2 | 1 | 0 | 2.0 |
| pantry:2 | 2 | 扣锁收纳箱 | pantry:3 | 2 | 0 | 4.0 |
| pantry:3 | 3 | 单格抽屉 | pantry:4 | 4 | 0 | 8.0 |
| pantry:4 | 4 | 双层抽屉柜 | pantry:5 | 8 | 0 | 16.0 |
| pantry:5 | 5 | 百叶矮柜 | pantry:6 | 16 | 0 | 32.0 |
| pantry:6 | 6 | 拱顶餐具柜 | pantry:7 | 32 | 0 | 64.0 |
| pantry:7 | 7 | 转角橱柜 | pantry:8 | 64 | 0 | 128.0 |
| pantry:8 | 8 | 圆筒转盘柜 | pantry:9 | 128 | 0 | 256.0 |
| pantry:9 | 9 | 玻璃展柜 | pantry:10 | 256 | 0 | 512.0 |
| pantry:10 | 10 | 卷帘高柜 | pantry:11 | 512 | 0 | 1024.0 |
| pantry:11 | 11 | 穹顶珍藏柜 | — | 1024 | 0 | 2048.0 |



## 客人遗失物 · `lost`

类型：commodity；最早章节：6；参考关系：遗失物6级；5级开始再生产。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| lost:1 | 1 | 圆框眼镜 | lost:2 | 1 | 1 | 4 |
| lost:2 | 2 | 条纹围巾 | lost:3 | 2 | 1 | 8 |
| lost:3 | 3 | 折叠雨伞 | lost:4 | 4 | 2 | 16 |
| lost:4 | 4 | 胶片相机 | lost:5 | 8 | 2 | 32 |
| lost:5 | 5 | 旅行手提包 | lost:6 | 16 | 0 | 64 |
| lost:6 | 6 | 复古旅行箱 | — | 32 | 0 | 128 |



## 待客休闲 · `comfort`

类型：commodity；最早章节：6；参考关系：娱乐设施8级。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| comfort:1 | 1 | 旅行颈枕 | comfort:2 | 1 | 1 | 4 |
| comfort:2 | 2 | 豆袋靠垫 | comfort:3 | 2 | 1 | 8 |
| comfort:3 | 3 | 按摩靠垫 | comfort:4 | 4 | 2 | 16 |
| comfort:4 | 4 | 筋膜按摩枪 | comfort:5 | 8 | 2 | 32 |
| comfort:5 | 5 | 手摇音乐盒 | comfort:6 | 16 | 3 | 64 |
| comfort:6 | 6 | 便携音箱 | comfort:7 | 32 | 3 | 128 |
| comfort:7 | 7 | 沉浸观影镜 | comfort:8 | 64 | 4 | 256 |
| comfort:8 | 8 | 翻盖游戏匣 | — | 128 | 4 | 512 |



## 复古游戏机 · `console`

类型：commodity；最早章节：6；参考关系：游戏机4级。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| console:1 | 1 | 迷你掌机 | console:2 | 1 | 1 | 128 |
| console:2 | 2 | 彩屏掌机 | console:3 | 2 | 1 | 256 |
| console:3 | 3 | 双人掌机 | console:4 | 4 | 2 | 512 |
| console:4 | 4 | 家庭游戏机 | — | 8 | 2 | 1024 |



## 厨房冒险场景 · `adventure_box`

类型：stateful；最早章节：6；参考关系：墙壁/野餐篮状态机；5个耗尽转换阶段。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| adventure_box:1 | 1 | 食材森林 | — | — | 0 | — |
| adventure_box:2 | 2 | 烘焙山谷 | — | — | 0 | — |
| adventure_box:3 | 3 | 汤锅港口 | — | — | 0 | — |
| adventure_box:4 | 4 | 甜品城堡 | — | — | 0 | — |
| adventure_box:5 | 5 | 星光宴会厅 | — | — | 0 | — |



## 厨房冒险信物 · `story`

类型：commodity；最早章节：6；参考关系：斗恶龙5级产手办材料。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| story:1 | 1 | 启程地图 | story:2 | 1 | 1 | 4 |
| story:2 | 2 | 伙伴口哨 | story:3 | 2 | 1 | 8 |
| story:3 | 3 | 旅途罗盘 | story:4 | 4 | 2 | 16 |
| story:4 | 4 | 城堡通行符 | story:5 | 8 | 2 | 32 |
| story:5 | 5 | 守护者徽盒 | — | 16 | 3 | 64 |



## 小厨手办 · `mascot`

类型：commodity；最早章节：6；参考关系：肥鹅手办；7级拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| mascot:1 | 1 | 趴睡小厨 | mascot:2 | 1 | 1 | 32 |
| mascot:2 | 2 | 坐姿小厨 | mascot:3 | 2 | 1 | 64 |
| mascot:3 | 3 | 擀面小厨 | mascot:4 | 4 | 2 | 128 |
| mascot:4 | 4 | 抱锅小厨 | mascot:5 | 8 | 2 | 256 |
| mascot:5 | 5 | 浇花小厨 | mascot:6 | 16 | 3 | 512 |
| mascot:6 | 6 | 送餐小厨 | mascot:7 | 32 | 3 | 1024 |
| mascot:7 | 7 | 挥勺主厨 | — | 64 | 4 | 2048 |



## 开店纪念物 · `puzzle`

类型：commodity；最早章节：6；参考关系：拼图13级。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| puzzle:1 | 1 | 店面草图 | puzzle:2 | 1 | 1 | 1.25 |
| puzzle:2 | 2 | 量房卷尺 | puzzle:3 | 2 | 1 | 2.5 |
| puzzle:3 | 3 | 装修色卡 | puzzle:4 | 4 | 2 | 5.0 |
| puzzle:4 | 4 | 开业请柬 | puzzle:5 | 8 | 2 | 10.0 |
| puzzle:5 | 5 | 首版菜单 | puzzle:6 | 16 | 3 | 20.0 |
| puzzle:6 | 6 | 首单小票 | puzzle:7 | 32 | 3 | 40.0 |
| puzzle:7 | 7 | 开店纪念币 | puzzle:8 | 64 | 4 | 80.0 |
| puzzle:8 | 8 | 旧店员围裙 | puzzle:9 | 128 | 4 | 160.0 |
| puzzle:9 | 9 | 木制旧招牌 | puzzle:10 | 256 | 5 | 320.0 |
| puzzle:10 | 10 | 第一张合影 | puzzle:11 | 512 | 5 | 640.0 |
| puzzle:11 | 11 | 开店报纸剪报 | puzzle:12 | 1024 | 6 | 1280.0 |
| puzzle:12 | 12 | 周年纪念相册 | puzzle:13 | 2048 | 6 | 2560.0 |
| puzzle:13 | 13 | 珍藏开店相框 | — | 4096 | 7 | 5120.0 |



## 储物通行物 · `keys`

类型：commodity；最早章节：6；参考关系：钥匙5级。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| keys:1 | 1 | 铜制小钥匙 | keys:2 | 1 | 1 | 5 |
| keys:2 | 2 | 三齿钥匙串 | keys:3 | 2 | 1 | 10 |
| keys:3 | 3 | 感应门卡 | keys:4 | 4 | 2 | 20 |
| keys:4 | 4 | 旋钮钥匙扣 | keys:5 | 8 | 2 | 40 |
| keys:5 | 5 | 餐厅感应手环 | — | 16 | 3 | 80 |



## 旧日记忆 · `timegate`

类型：commodity；最早章节：6；参考关系：神秘光门；6级拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| timegate:1 | 1 | 旧店门牌 | timegate:2 | 1 | 1 | 40 |
| timegate:2 | 2 | 黄铜门铃 | timegate:3 | 2 | 1 | 80 |
| timegate:3 | 3 | 手摇唱片机 | timegate:4 | 4 | 2 | 160 |
| timegate:4 | 4 | 摆锤挂钟 | timegate:5 | 8 | 2 | 320 |
| timegate:5 | 5 | 旋转走马灯 | timegate:6 | 16 | 3 | 640 |
| timegate:6 | 6 | 喇叭留声机 | — | 32 | 3 | 1280 |



## 试菜评估 · `tasting`

类型：commodity；最早章节：8；参考关系：体能测试6级，4级开始产课程。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| tasting:1 | 1 | 试味瓷勺 | tasting:2 | 1 | 1 | 1.176 |
| tasting:2 | 2 | 口味转盘 | tasting:3 | 2 | 1 | 2.353 |
| tasting:3 | 3 | 调味评分板 | tasting:4 | 4 | 2 | 4.706 |
| tasting:4 | 4 | 主厨推荐印章 | tasting:5 | 8 | 2 | 9.412 |
| tasting:5 | 5 | 菜单诊断卷轴 | tasting:6 | 16 | 3 | 18.824 |
| tasting:6 | 6 | 评审结果信筒 | — | 32 | 3 | 37.647 |



## 烹饪课程 · `courses`

类型：commodity；最早章节：8；参考关系：健身课程；6级拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| courses:1 | 1 | 折页食谱 | courses:2 | 1 | 1 | 7.5 |
| courses:2 | 2 | 环装操作卡 | courses:3 | 2 | 1 | 15.0 |
| courses:3 | 3 | 线装菜谱 | courses:4 | 4 | 2 | 30.0 |
| courses:4 | 4 | 立体示范书 | courses:5 | 8 | 2 | 60.0 |
| courses:5 | 5 | 烹饪教学胶片 | courses:6 | 16 | 3 | 120.0 |
| courses:6 | 6 | 厨师结业证书 | — | 32 | 3 | 240.0 |



## 珍稀花卉 · `flowers`

类型：commodity；最早章节：7；参考关系：花卉链；9级拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| flowers:1 | 1 | 雏菊 | flowers:2 | 1 | 1 | 1.0 |
| flowers:2 | 2 | 向日葵 | flowers:3 | 2 | 1 | 2.0 |
| flowers:3 | 3 | 郁金香 | flowers:4 | 4 | 2 | 4.0 |
| flowers:4 | 4 | 康乃馨 | flowers:5 | 8 | 2 | 8.0 |
| flowers:5 | 5 | 百合 | flowers:6 | 16 | 3 | 16.0 |
| flowers:6 | 6 | 玫瑰 | flowers:7 | 32 | 3 | 32.0 |
| flowers:7 | 7 | 绣球 | flowers:8 | 64 | 4 | 64.0 |
| flowers:8 | 8 | 蝴蝶兰 | flowers:9 | 128 | 4 | 128.0 |
| flowers:9 | 9 | 帝王花 | — | 256 | 5 | 256.0 |



## 花园堆肥 · `scraps`

类型：commodity；最早章节：9；参考关系：垃圾末端生产结构；8级拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| scraps:1 | 1 | 苹果果核 | scraps:2 | 1 | 1 | 1.0 |
| scraps:2 | 2 | 咖啡粉饼 | scraps:3 | 2 | 1 | 2.0 |
| scraps:3 | 3 | 干枯落叶 | scraps:4 | 4 | 2 | 4.0 |
| scraps:4 | 4 | 香蕉果皮 | scraps:5 | 8 | 2 | 8.0 |
| scraps:5 | 5 | 堆肥料砖 | scraps:6 | 16 | 3 | 16.0 |
| scraps:6 | 6 | 发酵菌团 | scraps:7 | 32 | 3 | 32.0 |
| scraps:7 | 7 | 熟成腐殖土 | scraps:8 | 64 | 4 | 64.0 |
| scraps:8 | 8 | 花园生态土丘 | — | 128 | 0 | 128.0 |



## 猫咪安居 · `garden_guest`

类型：commodity；最早章节：9；参考关系：老鼠—猫窝；6级拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| garden_guest:1 | 1 | 旧毛线球 | garden_guest:2 | 1 | 1 | 4 |
| garden_guest:2 | 2 | 鱼形逗猫棒 | garden_guest:3 | 2 | 1 | 8 |
| garden_guest:3 | 3 | 瓦楞猫抓板 | garden_guest:4 | 4 | 2 | 16 |
| garden_guest:4 | 4 | 圆形猫垫 | garden_guest:5 | 8 | 2 | 32 |
| garden_guest:5 | 5 | 帐篷猫窝 | garden_guest:6 | 16 | 3 | 64 |
| garden_guest:6 | 6 | 南瓜猫屋 | — | 32 | 0 | 128 |



## 餐厅猫咪 · `cats`

类型：commodity；最早章节：9；参考关系：猫链；8级拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| cats:1 | 1 | 橘猫 | cats:2 | 1 | 1 | 5 |
| cats:2 | 2 | 奶牛猫 | cats:3 | 2 | 1 | 10 |
| cats:3 | 3 | 暹罗猫 | cats:4 | 4 | 2 | 20 |
| cats:4 | 4 | 狸花猫 | cats:5 | 8 | 2 | 40 |
| cats:5 | 5 | 银渐层猫 | cats:6 | 16 | 3 | 80 |
| cats:6 | 6 | 布偶猫 | cats:7 | 32 | 3 | 160 |
| cats:7 | 7 | 缅因猫 | cats:8 | 64 | 4 | 320 |
| cats:8 | 8 | 围裙店长猫 | — | 128 | 4 | 640 |



## 主厨荣誉 · `honor`

类型：commodity；最早章节：12；参考关系：冠军之路；改为永久里程碑奖励，7级拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| honor:1 | 1 | 参与绶带 | honor:2 | 1 | 1 | 64 |
| honor:2 | 2 | 铜勺奖章 | honor:3 | 2 | 1 | 128 |
| honor:3 | 3 | 银锅奖章 | honor:4 | 4 | 2 | 256 |
| honor:4 | 4 | 金帽奖章 | honor:5 | 8 | 2 | 512 |
| honor:5 | 5 | 街区星杯 | honor:6 | 16 | 3 | 1024 |
| honor:6 | 6 | 城市桂冠奖杯 | honor:7 | 32 | 3 | 2048 |
| honor:7 | 7 | 年度金帽奖杯 | — | 64 | 4 | 4096 |



## 体力补给 · `energy`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| energy:1 | 1 | 能量火花 | energy:2 | 1 | 1 energy | — |
| energy:2 | 2 | 能量晶滴 | energy:3 | 2 | 6 energy | — |
| energy:3 | 3 | 能量晶球 | energy:4 | 4 | 15 energy | — |
| energy:4 | 4 | 能量电池 | energy:5 | 8 | 40 energy | — |
| energy:5 | 5 | 能量核心 | — | 16 | 100 energy | — |



## 金币 · `coins`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| coins:1 | 1 | 一枚金币 | coins:2 | 1 | 1 coins | — |
| coins:2 | 2 | 一叠金币 | coins:3 | 2 | 3 coins | — |
| coins:3 | 3 | 金币布袋 | coins:4 | 4 | 8 coins | — |
| coins:4 | 4 | 金币钱匣 | coins:5 | 8 | 20 coins | — |
| coins:5 | 5 | 金币罐 | coins:6 | 16 | 50 coins | — |
| coins:6 | 6 | 金币宝箱 | — | 32 | 120 coins | — |



## 彩虹糖 · `gems`

类型：resource；最早章节：1；参考关系：彩虹糖为项目原创资源外观；数值档位参考S14历史资源记录。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gems:1 | 1 | 彩虹糖 | gems:2 | 1 | 1 gems | — |
| gems:2 | 2 | 几颗彩虹糖 | gems:3 | 2 | 3 gems | — |
| gems:3 | 3 | 一袋彩虹糖 | gems:4 | 4 | 8 gems | — |
| gems:4 | 4 | 彩虹糖罐 | — | 8 | 20 gems | — |



## 设备工具包 · `blackbag`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| blackbag:1 | 1 | 卷折工具包 | blackbag:2 | 1 | 10 draws | — |
| blackbag:2 | 2 | 硬壳工具箱 | — | 2 | 22 draws | — |



## 食材设备包 · `pinkbag`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| pinkbag:1 | 1 | 束口食材袋 | pinkbag:2 | 1 | 12 draws | — |
| pinkbag:2 | 2 | 拉链保鲜包 | — | 2 | 28 draws | — |



## 小厨存钱罐 · `tipjar`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| tipjar:1 | 1 | 小厨存钱罐 | tipjar:2 | 1 | 15 draws | — |
| tipjar:2 | 2 | 胖胖存钱罐 | tipjar:3 | 2 | 18 draws | — |
| tipjar:3 | 3 | 金色存钱罐 | — | 4 | 53 draws | — |



## 无限体力 · `infinite`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| infinite:1 | 1 | 30秒无限体力 | infinite:2 | 1 | 30 seconds | — |
| infinite:2 | 2 | 1分钟无限体力 | infinite:3 | 2 | 60 seconds | — |
| infinite:3 | 3 | 2分钟无限体力 | infinite:4 | 4 | 120 seconds | — |
| infinite:4 | 4 | 5分钟无限体力 | — | 8 | 300 seconds | — |



## 棋盘加速 · `timeskip`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| timeskip:1 | 1 | 1小时沙漏 | timeskip:2 | 1 | 3600 seconds | — |
| timeskip:2 | 2 | 2小时沙漏 | timeskip:3 | 2 | 7200 seconds | — |
| timeskip:3 | 3 | 4小时沙漏 | timeskip:4 | 4 | 14400 seconds | — |
| timeskip:4 | 4 | 8小时沙漏 | timeskip:5 | 8 | 28800 seconds | — |
| timeskip:5 | 5 | 16小时沙漏 | — | 16 | 57600 seconds | — |



## 设备补货 · `charge`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| charge:1 | 1 | 补货手提盒 | charge:2 | 1 | 5 charges | — |
| charge:2 | 2 | 补货保温箱 | charge:3 | 2 | 10 charges | — |
| charge:3 | 3 | 补货滚轮箱 | — | 4 | 20 charges | — |



## 合成剪刀 · `splitter`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| splitter:1 | 1 | 折叠剪刀 | splitter:2 | 1 | 4 maxTargetLevel | — |
| splitter:2 | 2 | 厨房剪刀 | splitter:3 | 2 | 8 maxTargetLevel | — |
| splitter:3 | 3 | 齿轮助力剪 | — | 4 | 不限 maxTargetLevel | — |



## 订单礼盒 · `chest`

类型：resource；最早章节：1；参考关系：项目拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| chest:1 | 1 | 方形厨房礼盒 | chest:2 | 1 | 1 rewardTier | — |
| chest:2 | 2 | 心形精致礼盒 | chest:3 | 2 | 2 rewardTier | — |
| chest:3 | 3 | 拱顶紫金礼箱 | — | 4 | 3 rewardTier | — |



## 能量补给箱 · `energybox`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| energybox:1 | 1 | 能量补给箱 | — | 1 | 5 draws | — |



## 扩容背包 · `backpack`

类型：resource；最早章节：1；参考关系：资源档位采用历史记录；使用约束为项目设计。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| backpack:1 | 1 | 收纳扩容包 | — | 1 | 1 slots | — |



## 单机加速 · `stopwatch`

类型：resource；最早章节：1；参考关系：单台加速/可堆叠概念参考S17；单件3600秒为项目拟定D。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| stopwatch:1 | 1 | 一小时秒表 | — | 1 | 3600 seconds | — |



## 升级道具 · `upgrade`

类型：resource；最早章节：1；参考关系：项目拟定。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| upgrade:1 | 1 | 普通升级卡 | — | — | 1 levels | — |
| upgrade:2 | 2 | 设备升级牌 | — | — | 1 levels | — |



## 旧档能量补给 · `legacy_energy`

类型：legacy；最早章节：1；参考关系：当前版本完整保值。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| legacy_energy:1 | 1 | 能量火花 | — | 1 | 5 energy | — |
| legacy_energy:2 | 2 | 能量晶滴 | — | 2 | 12 energy | — |
| legacy_energy:3 | 3 | 能量晶球 | — | 4 | 30 energy | — |
| legacy_energy:4 | 4 | 能量核心 | — | 8 | 80 energy | — |



## 旧档金币收藏 · `legacy_coins`

类型：legacy；最早章节：1；参考关系：当前版本完整保值。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| legacy_coins:1 | 1 | 一枚金币 | — | 1 | 5 coins | — |
| legacy_coins:2 | 2 | 一叠金币 | — | 2 | 12 coins | — |
| legacy_coins:3 | 3 | 金币钱匣 | — | 4 | 30 coins | — |
| legacy_coins:4 | 4 | 金币宝箱 | — | 8 | 80 coins | — |



## 旧档厨房礼盒 · `legacy_chest`

类型：legacy；最早章节：1；参考关系：当前版本完整保值。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| legacy_chest:1 | 1 | 方形厨房礼盒 | — | 1 | 0 | — |
| legacy_chest:2 | 2 | 心形精致礼盒 | — | 2 | 0 | — |
| legacy_chest:3 | 3 | 拱顶紫金礼箱 | — | 4 | 0 | — |



## 厨具收纳器 · `gen_tools`

类型：producer；最早章节：1；参考关系：维修工具箱。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_tools:1 | 1 | 陶土坯 | gen_tools:2 | 1 | 0 | — |
| gen_tools:2 | 2 | 圆筒陶坯 | gen_tools:3 | 2 | 0 | — |
| gen_tools:3 | 3 | 烧制空缸 | gen_tools:4 | 4 | 0 | — |
| gen_tools:4 | 4 | 素陶厨具缸 | gen_tools:5 | 8 | 0 | — |
| gen_tools:5 | 5 | 双耳厨具瓮 | gen_tools:6 | 16 | 0 | — |
| gen_tools:6 | 6 | 方口分格缸 | gen_tools:7 | 32 | 0 | — |
| gen_tools:7 | 7 | 壁挂厨具筒 | gen_tools:8 | 64 | 0 | — |
| gen_tools:8 | 8 | 旋转厨具架 | gen_tools:9 | 128 | 0 | — |
| gen_tools:9 | 9 | 抽拉刀具座 | gen_tools:10 | 256 | 0 | — |
| gen_tools:10 | 10 | 翻盖厨具箱 | gen_tools:11 | 512 | 0 | — |
| gen_tools:11 | 11 | 立柱悬挂架 | gen_tools:12 | 1024 | 0 | — |
| gen_tools:12 | 12 | 旋转收纳塔 | — | 2048 | 0 | — |



## 烘焙设备 · `gen_food`

类型：producer；最早章节：1；参考关系：器材采购车长主链+副链。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_food:1 | 1 | 耐火砖 | gen_food:2 | 1 | 0 | — |
| gen_food:2 | 2 | 烤炉门板 | gen_food:3 | 2 | 0 | — |
| gen_food:3 | 3 | 烤炉内胆 | gen_food:4 | 4 | 0 | — |
| gen_food:4 | 4 | 未装门烤炉 | gen_food:5 | 8 | 0 | — |
| gen_food:5 | 5 | 铁皮小烤炉 | gen_food:6 | 16 | 0 | — |
| gen_food:6 | 6 | 铸铁圆炉 | gen_food:7 | 32 | 0 | — |
| gen_food:7 | 7 | 窗式电烤箱 | gen_food:8 | 64 | 0 | — |
| gen_food:8 | 8 | 拱顶石炉 | gen_food:9 | 128 | 0 | — |
| gen_food:9 | 9 | 立式旋转烤炉 | gen_food:10 | 256 | 0 | — |
| gen_food:10 | 10 | 圆舱热风炉 | gen_food:11 | 512 | 0 | — |
| gen_food:11 | 11 | 隧道输送烤炉 | — | 1024 | 0 | — |



## 生鲜采购器 · `gen_produce`

类型：producer；最早章节：1；参考关系：冰箱三产物链。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_produce:1 | 1 | 藤条圈 | gen_produce:2 | 1 | 0 | — |
| gen_produce:2 | 2 | 编织篮底 | gen_produce:3 | 2 | 0 | — |
| gen_produce:3 | 3 | 单柄菜篮 | gen_produce:4 | 4 | 0 | — |
| gen_produce:4 | 4 | 双耳提篮 | gen_produce:5 | 8 | 0 | — |
| gen_produce:5 | 5 | 背负菜篓 | gen_produce:6 | 16 | 0 | — |
| gen_produce:6 | 6 | 折叠菜筐 | gen_produce:7 | 32 | 0 | — |
| gen_produce:7 | 7 | 带盖采购篮 | gen_produce:8 | 64 | 0 | — |
| gen_produce:8 | 8 | 保温采购包 | gen_produce:9 | 128 | 0 | — |
| gen_produce:9 | 9 | 双轮买菜车 | gen_produce:10 | 256 | 0 | — |
| gen_produce:10 | 10 | 四轮货箱车 | gen_produce:11 | 512 | 0 | — |
| gen_produce:11 | 11 | 抽屉保鲜柜 | gen_produce:12 | 1024 | 0 | — |
| gen_produce:12 | 12 | 立式冷藏柜 | — | 2048 | 0 | — |



## 饮品制作机 · `gen_drink`

类型：producer；最早章节：2；参考关系：饮品链按项目原来源独立。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_drink:1 | 1 | 饮料出液嘴 | gen_drink:2 | 1 | 0 | — |
| gen_drink:2 | 2 | 搅拌机电机 | gen_drink:3 | 2 | 0 | — |
| gen_drink:3 | 3 | 饮品机底座 | gen_drink:4 | 4 | 0 | — |
| gen_drink:4 | 4 | 手压榨汁机 | gen_drink:5 | 8 | 0 | — |
| gen_drink:5 | 5 | 玻璃搅拌机 | gen_drink:6 | 16 | 0 | — |
| gen_drink:6 | 6 | 意式咖啡机 | gen_drink:7 | 32 | 0 | — |
| gen_drink:7 | 7 | 气泡饮料机 | gen_drink:8 | 64 | 0 | — |
| gen_drink:8 | 8 | 双缸冷饮机 | gen_drink:9 | 128 | 0 | — |
| gen_drink:9 | 9 | 立式奶昔机 | gen_drink:10 | 256 | 0 | — |
| gen_drink:10 | 10 | 冷热饮一体机 | — | 512 | 0 | — |



## 香草栽培器 · `gen_herb`

类型：producer；最早章节：3；参考关系：花盆—种子袋。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_herb:1 | 1 | 陶盆碎片 | gen_herb:2 | 1 | 0 | — |
| gen_herb:2 | 2 | 黏合花盆 | gen_herb:3 | 2 | 0 | — |
| gen_herb:3 | 3 | 带孔育苗盆 | gen_herb:4 | 4 | 0 | — |
| gen_herb:4 | 4 | 红陶香草盆 | gen_herb:5 | 8 | 0 | — |
| gen_herb:5 | 5 | 长槽育苗箱 | gen_herb:6 | 16 | 0 | — |
| gen_herb:6 | 6 | 悬吊栽培篮 | gen_herb:7 | 32 | 0 | — |
| gen_herb:7 | 7 | 自吸水花盆 | gen_herb:8 | 64 | 0 | — |
| gen_herb:8 | 8 | 壁挂种植板 | gen_herb:9 | 128 | 0 | — |
| gen_herb:9 | 9 | 玻璃育苗罩 | gen_herb:10 | 256 | 0 | — |
| gen_herb:10 | 10 | 旋转水培柱 | — | 512 | 0 | — |



## 蒸煮料理机 · `gen_asian`

类型：producer；最早章节：4；参考关系：项目已有双产物菜系。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_asian:1 | 1 | 蒸汽阀 | gen_asian:2 | 1 | 0 | — |
| gen_asian:2 | 2 | 加热炉芯 | gen_asian:3 | 2 | 0 | — |
| gen_asian:3 | 3 | 蒸汽底座 | gen_asian:4 | 4 | 0 | — |
| gen_asian:4 | 4 | 竹笼蒸汽炉 | gen_asian:5 | 8 | 0 | — |
| gen_asian:5 | 5 | 陶胆炖煮机 | gen_asian:6 | 16 | 0 | — |
| gen_asian:6 | 6 | 立式蒸柜 | gen_asian:7 | 32 | 0 | — |
| gen_asian:7 | 7 | 抽屉蒸炉 | gen_asian:8 | 64 | 0 | — |
| gen_asian:8 | 8 | 穹顶蒸烤机 | gen_asian:9 | 128 | 0 | — |
| gen_asian:9 | 9 | 环形蒸汽机 | gen_asian:10 | 256 | 0 | — |
| gen_asian:10 | 10 | 压力蒸煮舱 | — | 512 | 0 | — |



## 环球煎烤机 · `gen_mediterranean`

类型：producer；最早章节：5；参考关系：项目已有双产物菜系。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_mediterranean:1 | 1 | 煎烤炉脚 | gen_mediterranean:2 | 1 | 0 | — |
| gen_mediterranean:2 | 2 | 铸铁热板 | gen_mediterranean:3 | 2 | 0 | — |
| gen_mediterranean:3 | 3 | 煎烤机框架 | gen_mediterranean:4 | 4 | 0 | — |
| gen_mediterranean:4 | 4 | 铸铁煎烤炉 | gen_mediterranean:5 | 8 | 0 | — |
| gen_mediterranean:5 | 5 | 双面压烤机 | gen_mediterranean:6 | 16 | 0 | — |
| gen_mediterranean:6 | 6 | 旋转烤肉炉 | gen_mediterranean:7 | 32 | 0 | — |
| gen_mediterranean:7 | 7 | 披萨转盘炉 | gen_mediterranean:8 | 64 | 0 | — |
| gen_mediterranean:8 | 8 | 斜面石板炉 | gen_mediterranean:9 | 128 | 0 | — |
| gen_mediterranean:9 | 9 | 滚筒翻烤机 | gen_mediterranean:10 | 256 | 0 | — |
| gen_mediterranean:10 | 10 | 穹顶慢烤炉 | — | 512 | 0 | — |



## 设备配送器 · `gen_supply`

类型：producer；最早章节：6；参考关系：购物车供零件。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_supply:1 | 1 | 配送轮胎 | gen_supply:2 | 1 | 0 | — |
| gen_supply:2 | 2 | 配送车轴 | gen_supply:3 | 2 | 0 | — |
| gen_supply:3 | 3 | 配送车架 | gen_supply:4 | 4 | 0 | — |
| gen_supply:4 | 4 | 独轮推车 | gen_supply:5 | 8 | 0 | — |
| gen_supply:5 | 5 | 双轮手推车 | gen_supply:6 | 16 | 0 | — |
| gen_supply:6 | 6 | 折叠平板车 | gen_supply:7 | 32 | 0 | — |
| gen_supply:7 | 7 | 带篷送货车 | gen_supply:8 | 64 | 0 | — |
| gen_supply:8 | 8 | 升降搬运车 | gen_supply:9 | 128 | 0 | — |
| gen_supply:9 | 9 | 封闭保温推车 | gen_supply:10 | 256 | 0 | — |
| gen_supply:10 | 10 | 电动搬运车 | gen_supply:11 | 512 | 0 | — |
| gen_supply:11 | 11 | 履带运输车 | gen_supply:12 | 1024 | 0 | — |
| gen_supply:12 | 12 | 圆舱配送机器人 | — | 2048 | 0 | — |



## 食谱教学器 · `gen_publicity`

类型：producer；最早章节：8；参考关系：宣传方式自生产与体能测试。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_publicity:1 | 1 | 食谱夹 | gen_publicity:2 | 1 | 0 | — |
| gen_publicity:2 | 2 | 木质支架 | gen_publicity:3 | 2 | 0 | — |
| gen_publicity:3 | 3 | 折叠翻页架 | gen_publicity:4 | 4 | 0 | — |
| gen_publicity:4 | 4 | 翻页食谱架 | gen_publicity:5 | 8 | 0 | — |
| gen_publicity:5 | 5 | 手摇印谱机 | gen_publicity:6 | 16 | 0 | — |
| gen_publicity:6 | 6 | 圆屏教学终端 | — | 32 | 0 | — |



## 花卉培育器 · `gen_flower`

类型：producer；最早章节：7；参考关系：新版花篮。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_flower:1 | 1 | 园艺桶底 | gen_flower:2 | 1 | 0 | — |
| gen_flower:2 | 2 | 铆接桶壁 | gen_flower:3 | 2 | 0 | — |
| gen_flower:3 | 3 | 空提手花桶 | gen_flower:4 | 4 | 0 | — |
| gen_flower:4 | 4 | 未装嘴浇花桶 | gen_flower:5 | 8 | 0 | — |
| gen_flower:5 | 5 | 长嘴浇花桶 | gen_flower:6 | 16 | 0 | — |
| gen_flower:6 | 6 | 旋转育花台 | gen_flower:7 | 32 | 0 | — |
| gen_flower:7 | 7 | 自动喷雾桶 | gen_flower:8 | 64 | 0 | — |
| gen_flower:8 | 8 | 拱罩育花箱 | gen_flower:9 | 128 | 0 | — |
| gen_flower:9 | 9 | 灯塔育花柜 | — | 256 | 0 | — |



## 花园循环机 · `gen_recycle`

类型：producer；最早章节：9；参考关系：扫地机—垃圾—动物，厨房园艺主题。

| ID | 等级 | 名称 | 下一合成物 | 一级等价 | 售价/领取值 | 定价权重 |
| --- | --- | --- | --- | --- | --- | --- |
| gen_recycle:1 | 1 | 堆肥底板 | gen_recycle:2 | 1 | 0 | — |
| gen_recycle:2 | 2 | 堆肥箱壁 | gen_recycle:3 | 2 | 0 | — |
| gen_recycle:3 | 3 | 铰链箱盖 | gen_recycle:4 | 4 | 0 | — |
| gen_recycle:4 | 4 | 通风桶壳 | gen_recycle:5 | 8 | 0 | — |
| gen_recycle:5 | 5 | 方形堆肥桶 | gen_recycle:6 | 16 | 0 | — |
| gen_recycle:6 | 6 | 圆筒翻滚桶 | gen_recycle:7 | 32 | 0 | — |
| gen_recycle:7 | 7 | 螺旋搅拌桶 | gen_recycle:8 | 64 | 0 | — |
| gen_recycle:8 | 8 | 脚踏密封桶 | gen_recycle:9 | 128 | 0 | — |
| gen_recycle:9 | 9 | 穹顶发酵罐 | gen_recycle:10 | 256 | 0 | — |
| gen_recycle:10 | 10 | 圆舱循环机 | — | 512 | 0 | — |


