# 四季牧场设计

四季使用独立绘本背景与透明贴纸图集。夏、秋、冬由三个 Astra（xhigh）子 agent 并行设计，春季与首页整合由主 agent 完成。所有插画通过内置 ImageGen 生成，PNG 保留原始像素和透明度；浏览器用 SVG 取景框或 CSS 图集定位显示，不重新绘制素材。

| 季节 | 构图与元素 | 提示词、来源与设计记录 | 最终素材 |
| --- | --- | --- | --- |
| 春日花溪 | 右侧斜向小溪、樱花树、花篱、兔子、蝴蝶与蓝鸟 | [spring.md](spring.md) | [背景](../../assets/farm/spring-scene-v2.png)、[贴纸](../../assets/farm/spring-stickers-v2.png) |
| 夏日海风 | 左侧草坡、右侧海湾、斜向沙滩、椰树小屋、海龟与螃蟹 | [summer.md](summer.md) | [背景](../../assets/farm/summer-scene-v2.png)、[贴纸](../../assets/farm/summer-stickers-v2.png) |
| 秋日果园 | 金色梯田、贯穿石阶、风车、苹果树、南瓜车、刺猬与松鼠 | [autumn.md](autumn.md) | [背景](../../assets/farm/autumn-scene-v2.png)、[贴纸](../../assets/farm/autumn-stickers-v2.png) |
| 冬日雪乡 | 蓝紫暮色、斜向雪坡、左侧冰湖、右侧暖灯木屋、企鹅、海豹与雪狐 | [winter.md](winter.md) | [背景](../../assets/farm/winter-scene-v2.png)、[贴纸](../../assets/farm/winter-stickers-v2.png) |

每份同名 JSON 定义自然层、六组奖励元素、奖励文案和图集取景框。运行 `python3 sheep-match/tools/sync-farm-designs.py` 将四份配置合并为运行时 `farm-designs.mjs`。手机短屏统一调整装饰层位置，为底部操作留出空间；太阳与月亮的位置经过整合验收，避开顶部按钮。

首页支持触屏左右滑动、鼠标拖动、方向键和季节按钮。每四次主线首通获得一份礼物，第 24/48/72 关开启下一季，第 96 关开启下一年；已完成的年份保留。未解锁季节仅展示空场景和开启条件。首页配乐跟随浏览季节，牌局配乐跟随关卡季节。
