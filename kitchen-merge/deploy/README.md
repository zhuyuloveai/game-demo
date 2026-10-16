# 小狗厨房 — hw-gw-1 部署

公开地址：http://1.92.214.23/ （TCP 80）。
源仓库：https://github.com/zhuyuloveai/game-demo ，发布分支为 `main`。
当前发布名称、源码提交与历史目标以服务器 `/srv/overtime-arena/DEPLOYMENT.md` 为准。

游戏沿用既有 `overtime-arena-web` Nginx 容器及 `/srv/overtime-arena` 只读挂载。目录名称保留自早期割草游戏，无需重建容器或调整其他服务。

- SSH：`ssh hw-gw-1`（root，端口52422）。
- 服务目录：`/srv/overtime-arena/current`，使用相对符号链接原子切换。
- 发布目录：`/srv/overtime-arena/releases/kitchen-YYYYMMDD-HHMMSS/site`。
- 配置：`/srv/overtime-arena/nginx.conf`，与 `deploy/nginx.conf` 一致。
- 每次激活的回滚快照保存在该发布目录的 `previous/` 中。
- 原割草游戏 `releases/20261010-171052/site` 和各厨房历史版本保留。

## 当前运行内容

64条物品链、421个物品定义（410个新定义、11个旧定义）、11类主生产器、21种特殊转换、12章节/96个主线订单、10份食谱。生产器美术覆盖111个等级（35种零件、76种启用形态），并重画33种来源容器。

环境布局、呼吸动效、默认音乐/音效和核心操作保留。点击选择；点击可用设备生产；移动、交换、合成采用拖动。升级链与经济参数在美术更新中保持不变。

运行资源以全部被Git跟踪的 `kitchen-merge/dist/` 文件为准，包括字体、宠物图集、CSS及所有ES模块。生产器相关的 `producer-art.mjs`、`producer-parts-art.mjs`、`producer-drink-art.mjs`、`producer-produce-art.mjs`、`producer-variety-art.mjs` 和 `source-container-art.mjs` 必须随发布上传。AI概念板、文档和测试仅保存在仓库，不能复制到服务根目录。

## 发布流程

1. 执行 `node --test kitchen-merge/tests/*.test.mjs`、`node kitchen-merge/scripts/audit-runtime.mjs`、`python3 kitchen-merge/docs/balance/validate_balance.py` 及模块语法检查。
2. 在本地浏览器验收生产、选中、拖动合成/交换、刷新存档以及手机宽度。`?qa=producers` 等验收入口只在loopback主机启用，使用独立存储键。
3. 将完整已跟踪 `dist/` 内容复制到全新发布目录的 `site/`，将 `nginx.conf`、`activate.sh` 和SHA-256清单放在 `site/` 外。
4. 上传到新发布目录，在其中执行 `bash activate.sh <release-name>`。脚本校验文件、备份配置/部署记录/旧目标，再执行 `nginx -t` 和原子链接切换；失败会自动恢复。
5. 核对公开HTML、模块、样式、字体和图片的SHA-256与MIME；确认内部文档/源码/测试路径404、容器健康，完成公开页面检查。
6. 更新服务器 `DEPLOYMENT.md`，记录源码提交、发布目标、前一目标及验证结果。

Nginx配置文件被Docker单独挂载，更新时必须用 `cat` 保留inode。每次发布使用新名称，不重复激活旧目录，避免覆盖回滚记录。ES模块必须以 `application/javascript` 提供；HTML、CSS、模块要求重新验证缓存，关闭目录列表。

## 存档与回滚

存档键继续为 `little-kitchen-save-v1`，格式为v3。升级前会保存原始JSON及SHA-256，设置中支持导出和恢复。浏览器存档按来源地址隔离，并非服务端数据。

本次美术版本与 `aeab078`（`kitchen-20261016-182314`）的v3存档兼容。不要直接回退到 `5a04237` 等仅理解v2的旧前端：它可能用新游戏覆盖已经迁移的v3存档。

兼容版本回滚时，读取活动发布 `previous/current-target.txt`，用 `cat` 恢复 `previous/nginx.conf`，执行 `nginx -t`，原子切换 `current` 到记录的旧目标并reload。保留全部发布目录及浏览器备份。
