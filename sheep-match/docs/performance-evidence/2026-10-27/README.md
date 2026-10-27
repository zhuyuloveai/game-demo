# 性能证据有效性索引

更新：2026-10-27。保留所有raw，不删除、不重写历史测量。**源码核验通过不等于性能SLO通过；云端代理不等于真机呈现或输入验收。**

发现可变after模块URL在代码修改后仍被浏览器缓存，故全部 `after-*` 只作探索，不归因到最终代码，不计最终验收。`source-sha256.txt` 是磁盘状态记录，不能补证旧浏览器实际执行的源码。`before-management-paint-gate`是中间态诊断，不是3046927基线。

| 运行文件 | 有效性 / 验收资格 | 依据与限制 |
| --- | --- | --- |
| [after-five-pens-localStorage-10min-mixed.json](after-five-pens-localStorage-10min-mixed.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [after-max-pens-localStorage-stress-initial.json](after-max-pens-localStorage-stress-initial.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [after-max-pens-stress-keyed-delete-fix.json](after-max-pens-stress-keyed-delete-fix.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [after-stage1-idle.json](after-stage1-idle.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [after-stage2-pan.json](after-stage2-pan.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [after-stage3-idle-initial.json](after-stage3-idle-initial.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [after-stage3-localStorage-mixed-run2.json](after-stage3-localStorage-mixed-run2.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [after-stage3-localStorage-mixed-run3.json](after-stage3-localStorage-mixed-run3.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [after-stage3-localStorage-mixed.json](after-stage3-localStorage-mixed.json) | 探索性；不用于验收 | 未版本化模块可能命中跨修改缓存，实际执行源码未核实 |
| [before-management-paint-gate.json](before-management-paint-gate.json) | 中间态诊断；不是3046927基线 | moduleBase指向可变工作区；名称before仅指局部改动前 |
| [before-max-pens-localStorage-stress.json](before-max-pens-localStorage-stress.json) | 不可变基线诊断有效 | 304692764236de3f5e1a3cbe7e819aca2c2027aa worktree；仍限于该场景/云端代理 |
| [before-stage1-idle.json](before-stage1-idle.json) | 不可变基线诊断有效 | 304692764236de3f5e1a3cbe7e819aca2c2027aa worktree；仍限于该场景/云端代理 |
| [before-stage2-pan.json](before-stage2-pan.json) | 不可变基线诊断有效 | 304692764236de3f5e1a3cbe7e819aca2c2027aa worktree；仍限于该场景/云端代理 |
| [before-stage3-idle.json](before-stage3-idle.json) | 不可变基线诊断有效 | 304692764236de3f5e1a3cbe7e819aca2c2027aa worktree；仍限于该场景/云端代理 |
| [before-stage3-localStorage-mixed.json](before-stage3-localStorage-mixed.json) | 不可变基线诊断有效 | 304692764236de3f5e1a3cbe7e819aca2c2027aa worktree；仍限于该场景/云端代理 |
| [candidate-v2-management-15s.json](candidate-v2-management-15s.json) | v2版本已直接核验；非完整验收 | 六项sourceHashes全部匹配candidate-v2-sha256.txt；仅15秒 |
| [candidate-v2-max-pens-stress-60s.json](candidate-v2-max-pens-stress-60s.json) | v2不可变base已交叉核验；SLO失败 | 自身无sourceHashes；同base后续management哈希匹配且profile非空；p95=33.4ms |
| [candidate-v3-max-pens-stress-60s.json](candidate-v3-max-pens-stress-60s.json) | v3六项关键哈希直接匹配；混合压力SLO失败 | 独立版本化base；p95=16.8ms、>25ms=4.326%；单轮/云端代理 |
| [candidate-v4-max-pens-stress-60s.json](candidate-v4-max-pens-stress-60s.json) | v4六项关键哈希直接匹配；混合压力SLO失败 | 独立版本化base；p95=16.8ms、>25ms=3.475%；单轮/云端代理 |
| [candidate-v5-max-pens-stress-60s.json](candidate-v5-max-pens-stress-60s.json) | v5六项关键哈希直接匹配；混合压力SLO失败 | 独立版本化base；p95=33.3ms、>25ms=6.792%；单轮/云端代理 |
| [candidate-v6-max-pens-stress-60s.json](candidate-v6-max-pens-stress-60s.json) | v6六项关键哈希直接匹配；混合压力SLO失败 | 独立版本化base；p95=16.8ms、>25ms=2.714%；单轮/云端代理 |
| [candidate-v7-clean-action-classification-60s.json](candidate-v7-clean-action-classification-60s.json) | v7六项关键哈希直接匹配；混合压力SLO失败 | 独立版本化base；p95=33.3ms、>25ms=5.611%；单轮/云端代理 |
| [candidate-v7-clean-idle-60s.json](candidate-v7-clean-idle-60s.json) | v7六项关键哈希直接匹配；仅待机代理；不替代混合压力 | 独立版本化base；p95=16.7ms、>25ms=0.362%；单轮/云端代理 |
| [candidate-v7-max-pens-stress-10min.json](candidate-v7-max-pens-stress-10min.json) | v7六项关键哈希直接匹配；混合压力SLO失败 | 独立版本化base；p95=33.3ms、>25ms=5.554%；单轮/云端代理 |
| [candidate-v7-max-pens-stress-60s.json](candidate-v7-max-pens-stress-60s.json) | v7六项关键哈希直接匹配；混合压力SLO失败 | 独立版本化base；p95=16.8ms、>25ms=2.816%；单轮/云端代理 |
| [candidate-v8-max-pens-stress-60s.json](candidate-v8-max-pens-stress-60s.json) | v8的7项关键哈希直接匹配；压力SLO失败 | 独立版本化base；p95=16.8ms、>25ms=3.987%；仅云端代理 |
| [candidate-v9-max-pens-stress-10min.json](candidate-v9-max-pens-stress-10min.json) | v9的8项关键哈希直接匹配；压力SLO失败 | 独立版本化base；p95=33.3ms、>25ms=5.641%；仅云端代理 |
| [candidate-v9-max-pens-stress-60s-run1.json](candidate-v9-max-pens-stress-60s-run1.json) | v9的8项关键哈希直接匹配；压力SLO失败 | 独立版本化base；p95=16.8ms、>25ms=3.764%；仅云端代理 |
| [candidate-v9-max-pens-stress-60s-run2.json](candidate-v9-max-pens-stress-60s-run2.json) | v9的8项关键哈希直接匹配；压力SLO失败 | 独立版本化base；p95=16.8ms、>25ms=4.197%；仅云端代理 |
| [candidate-v9-max-pens-stress-60s-run3.json](candidate-v9-max-pens-stress-60s-run3.json) | v9的8项关键哈希直接匹配；压力SLO失败 | 独立版本化base；p95=16.8ms、>25ms=3.686%；仅云端代理 |
| [v9-browser-localStorage-tick-diagnostic.json](v9-browser-localStorage-tick-diagnostic.json) | 独立插桩诊断；不用于最终验收 | 15个tick，差异见v9-store-diagnostic.patch；不能与冻结v9正式raw混用 |
| [candidate-v10-max-pens-stress-60s.json](candidate-v10-max-pens-stress-60s.json) | 8项关键源码哈希直接匹配；完整SLO失败 | v10独立冻结base；p95=16.8ms、>25ms=4.222%；不等于手机实呈 |
| [candidate-v11-max-pens-stress-60s.json](candidate-v11-max-pens-stress-60s.json) | 9项关键源码哈希直接匹配；完整SLO失败 | v11独立冻结base；p95=16.8ms、>25ms=3.978%；不等于手机实呈 |
| [candidate-v12-max-pens-stress-10min.json](candidate-v12-max-pens-stress-10min.json) | 9项关键源码哈希直接匹配；完整SLO失败 | v12独立冻结base；p95=33.2ms、>25ms=5.111%；不等于手机实呈 |
| [candidate-v12-max-pens-stress-60s-run1.json](candidate-v12-max-pens-stress-60s-run1.json) | 9项关键源码哈希直接匹配；完整SLO失败 | v12独立冻结base；p95=33.3ms、>25ms=5.708%；不等于手机实呈 |
| [candidate-v12-max-pens-stress-60s-run2.json](candidate-v12-max-pens-stress-60s-run2.json) | 9项关键源码哈希直接匹配；完整SLO失败 | v12独立冻结base；p95=16.8ms、>25ms=4.196%；不等于手机实呈 |
| [candidate-v12-max-pens-stress-60s-run3.json](candidate-v12-max-pens-stress-60s-run3.json) | 9项关键源码哈希直接匹配；完整SLO失败 | v12独立冻结base；p95=16.8ms、>25ms=4.978%；不等于手机实呈 |
| [v12-render-motion-phase-diagnostic.json](v12-render-motion-phase-diagnostic.json) | 独立插桩诊断；不作最终验收 | 差异见v12-phase-diagnostic.patch；非GPU/GC trace |

## 哈希与后续候选

- `candidate-v2-sha256.txt`：六个关键模块清单；`candidate-v2-management-15s.json`中六项逐项匹配。仅覆盖所列模块，不声称对所有运行资源逐字节核验。
- v2最大压力样本与management使用同一个不可变 `farm-performance-candidate-v2/sheep-match/` base；最大压力本身无sourceHashes，依据冻结目录及后续哈希样本交叉核验，不能改写为“本次raw自带全部源码哈希”。
- v3–v7上述各raw的六项关键sourceHashes已逐项匹配各自清单，版本化base独立；哈希核验不等于SLO通过。v7完整10分钟rAF p95 33.3ms、>25ms 5.554%、158长任务(max160ms)仍失败；干净混合样本仍失败。
- v7已报告618/618功能测试和1000文件包验证；599/608为较早轮次，不绑定旧缓存after或未来提交。v8/v9已列出；v9最新628/628功能测试，完整预热后10分钟仍失败。v10重复render优化进行中，未列出的未来文件默认待核验。最终仍需对应冻结代码的完整性能、视觉与真机验收。
- worldRebuilds/forestRebuilds是保留旧字段名的直接子节点childList记录，keyed后的合法增删/移动也计数，不等于全层重建或闪烁次数。
- v7十分钟包含已知可能CPU竞争时段，完整数据保留；干净混合/待机轮独立列出，不用局部好结果替代整体。

- v9三轮60秒各202/202动作与完整10分钟1978/1978动作成功；操作无错不等于性能过线。120秒预热后首末p95由16.8升33.2ms，稳定性门槛失败。正式v9不套用v7并行CPU作业限制。

## 最终云端候选v12

v12三轮与10分钟raw均9项关键源码哈希匹配对应manifest，含world CSS；schemaVersion3四个QA隔离键、qaMaturity=false。正式120秒预热后10分钟p95 33.2ms、>25ms 5.111%、112长任务max103ms，完整SLO失败。638功能测试/1000文件运行包验证仅各自范围通过。无main推送或部署。

旧harness漏draft键意味着旧压力未验证完整草稿持久化，不证明生产缺陷。v12 workloadSamples记录readyEntities/forest/zoom/edit变化，首末改善不能判同负载稳定性通过；heap非强制GC retained。v12-manual-qa.md是限定手工烟测，v12-ui-feed-smoke.jpg仅内部单帧证据，均非零闪烁验收。后续方案见../../performance-next-steps.md，未实施。
