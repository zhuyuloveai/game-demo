# 工厂统一操作（2026-10-27）

## 参考与明确边界

参考图已实际查看：BlueStacks Township bakery screenshot (`/tmp/township-factory.png`, upstream https://cdn-www.bluestacks.com/bs-images/Township_Beginners-Guide_EN_5.png)。图中独立面板包含成品货架、生产箱、底部配方；配方信息包含原料拥有量/需要量、仓内数量、制作时间。配方拖入箱子启动制作，与单击查看配方信息分离。其他操作研究入口：https://jingyan.baidu.com/article/17bd8e526ed84c85aa2bb855.html 。参考用于操作组织，不复制图片、品牌或数值。

本项目保留自己的设施、配方、等级、计时、存档及经济。特别保留现有生产容量：普通机器 2 槽，饲料厂 3 槽，以及存档已有扩容；不引入新付费槽位。单个可见生产箱是投料目标，不代表强制缩减为单任务。已有等待任务取消/返料与调整次序收在「生产安排」里，这是项目兼容能力，不声称已核实为 Township 行为。

## 实现

- `farm-factory-panel.mjs` / `.css`：所有 13 机器实例由配置驱动，独立对话框。点击配方只查看原料、库存、时间；拖动释放到箱内才投料。键盘及无拖动用户可选择配方后点箱子。
- 成品直接点击领取，传给 `ctx.act` 的反馈包含实际产品源与货仓目标；由宿主根据真实成功 job outputs 播放反馈，失败不伪造飞入物品。
- 缺料、未解锁、未建好、队列满均不发投料命令。留种保护仍由核心检查，只有明确确认才为本次命令加 `allowSeedReserve`。仓满领取保留成品；重复领取按实时 job 存在性去重。
- Pointer cancel、多指、失焦、隐藏、resize 和关闭取消未提交拖动；关闭清理监听、时钟、光标，恢复 inert 与焦点。实际生产一旦落箱成功即持久化，关闭不撤回。
- 1 秒刷新比较无时钟的结构键，只有结构/库存变化才 patch；倒计时只写文本。排除 job `accountedMs`，避免每秒重建。拖动命中仅起手缓存箱体边界，无逐物品 layout 查询。
- 窄屏布局及 44px 点击目标；无循环装饰动画，系统 reduced-motion 禁止动画/过渡。

## 接入 API

```js
const panel = mountFactoryPanel(ctx, { entityId, onClose, onAction });
// onAction('edit') 在关闭后触发；取消/重排由模块自身执行核心命令。
panel.refresh(); // 或 update()
panel.destroy(); // 或 dispose()；幂等。open() 为已挂载面板刷新。
```

## 验证

`node --test tests/farm-factory-panel.test.mjs`：8 tests passed，覆盖全设施配方、inspect 不变更、现有容量投料与真实扣料、缺料/等级/设施错误、领取与重复领取、满仓保留、时钟不改结构键、命中和生命周期静态回归。实际浏览器由集成负责人独占验证；此模块任务未运行浏览器。
