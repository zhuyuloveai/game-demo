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

- 顶层资源嵌入实物：圆角方形电表用液晶屏显示电量，一体椭圆小猪存钱罐显示金币，投币口露出半枚金币，折纸星星罐收好许愿星。交单奖励会飞向小猪和星星罐。
- 左上角使用小狗头像与经验等级。吉祥物复用用户本机 Codex 自定义宠物「M 帽小狗」的动画图，原样复制到 `dist/assets/puppy-sprites.webp`，通过 CSS 帧定位展示头像和桌面小狗店长。
- 订单保留悬挂纸签与大头像，顾客名字位于头像右侧，奖励与完成状态横向并排；料理板撑满台面可用宽度，棋盘使用7列9行、63个正方形格子，短屏通过纵向滚动显示完整厨房。
- 奶油色吊柜和抽油烟机围合厨房，顾客订单挂在夹单轨上；合成板有厚侧壁和接触阴影，与下面木桌区分层次。
- 功能嵌入环境：收纳柜、食谱与图鉴书、采购与设置手机、竖款收音机、小狗店长及礼物包裹；便签打开章节手账。
- 物品继续使用 `art.mjs` 原有材质插画、连续奶油格底、呼吸与弹性合成动效，保留完整棋盘操作。
- 11类主生产器使用独立剪影与专属零件，覆盖111个等级；另重画33种来源容器。烘焙原料罐、生鲜采购筐、花艺工具桶分别采用圆胖、矮宽、高挑的形体，升级沿各自的器具结构发展。新绘制集中在 `producer-art.mjs`、`producer-parts-art.mjs` 与 `source-container-art.mjs`，继续通过同一材质渲染器呈现。
- [生产器美术说明](docs/art/PRODUCER_ART_REDESIGN.md) 包含分组、兼容性与实机验收；[生成参考图与提示词](docs/art/PRODUCER_IMAGE_PROMPT.md) 记录内置生图工具的概念图，运行时采用项目内的矢量插画。
- 使用自托管的站酷快乐体，数字使用系统字体；字体和 OFL 许可见 [字体来源](docs/fonts/ZCOOLKuaiLe-SOURCE.txt)。
- 场景样式在 `dist/scene.css`，基础组件及物品动效在 `dist/style.css`。界面结构与迁移说明见 [环境厨房界面](docs/ENVIRONMENT_UI.md)。

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
