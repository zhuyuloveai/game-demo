# v12 手动浏览器烟测

2026-10-27 07:42–07:46 UTC；云Chrome，冻结 candidate-v12，非玩家存档。

- 进入/取消/再进入未修改布局：fast mode有效；退出editing/fixed类均0、正常aria和12个围栏摘要恢复。
- 选中小麦后ArrowLeft合法移动（撤销启用）：退到完整编辑DOM；取消确认后恢复正常mode/aria/围栏摘要。
- 成长蓝图预览新增11条道路：退完整渲染；取消后editing=0、12个摘要恢复；未应用或扣正式资源。
- 拖饲料喂鸡：饲料22→21，动物由饿了变20分；截图观察画面完整。这不是高频零闪烁影片证明。
- 单独qaMaturity=1测试fixture将一块麦田设15秒后成熟：初始wheat-grown.png/fwReady=false/fast edit；成熟后wheat.png/fwReady=true且自动退full edit。取消后48个成熟田badge、12个围栏摘要、正常aria恢复；点收提示小麦+2。

## Harness问题与修复

手动真实移动发现旧harness仅允许farm-perf-qa:a/b/active，遗漏同隔离命名空间: draft。旧自动压力只开/关布局，未证明草稿持久化；保存草稿被QA限制拒绝不是正式游戏存储失败。现显式允许a/b/active/draft四键，并只重置这四键；schemaVersion3原始数据列allowedStorageKeys。未读取/删除玩家存档。qaMaturity仅用于本烟测，正式性能运行保持false。

单次功能烟测不能代替每操作30次性能门槛、真实手机或连续画面零闪烁验收。

## 最终视觉抽样（08:08:08–08:08:40 UTC，约32秒）

在最终v12最大场景依次观察初始、平移、收获、商店、进入布局、取消布局六张截图；样本未见整层或精灵空白，退出后world恢复正常类、editing节点0；743个HTML img中已加载但naturalWidth为0的数量为0。该检查是离散截图抽样，不是连续录像或高频filmstrip，不能证明零闪烁SLO通过，也不覆盖SVG image全部纹理解码和线上设备。
