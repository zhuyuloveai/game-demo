# 羊羊牧场线上部署

公开入口：<http://1.92.214.23/>。2026-10-23 起替换此入口的小厨合合游戏。

- SSH：`ssh hw-gw-1`，使用现有认证。
- 容器：`overtime-arena-web`，沿用现有 Nginx 和挂载配置。
- 服务目录：`/srv/overtime-arena`。
- 活动入口：`current` 相对符号链接。
- 发布目录：`releases/sheep-YYYYMMDD-HHMMSS/site`。
- 当前源码提交、版本、前一目标和验证证据：服务器 `/srv/overtime-arena/DEPLOYMENT.md`。

## 发布

1. 运行 `node --test sheep-match/tests/*.test.mjs` 和各 `.mjs` 的 `node --check`，在浏览器检查选牌、通关、下一关和刷新续玩。
2. 使用 `python3 sheep-match/deploy/package-release.py /tmp/sheep-release-<唯一名称>` 生成全新本地发布目录（脚本不会上传、切换或部署）。`runtime_files.py` 是唯一运行清单，含原首页/三消依赖、新农场模块、589项manifest运行资源及其授权文件；自动检查静态ESM引用，不能再沿用旧45文件手工清单。测试档、设计文档、生成器、预览和开发工具排除在site之外。无构建依赖。
3. 将 `activate.sh`、`verify-release.py`、`runtime_files.py`、`nginx.conf` 和发布文件的 `SHA256SUMS` 放在发布目录中。记录精确源码 Git 提交，上传至服务器的新发布目录。
4. 读取 `current` 的目标；执行 `bash activate.sh <release-name> <expected-current-target>`。脚本校验摘要与前一目标、保存回滚快照，再安装附带的 Nginx 配置并原子切换；严格站点验证最多重试 10 次，等待 Nginx 新工作进程接管，仍失败则自动恢复入口及配置。`.mjs` 使用 `application/javascript`，新增的 `/assets/seasons/` 、`/assets/farm/` 和 `/assets/story/` 使用 `no-cache`，避免固定名称的背景资源在升级后陈旧。
5. 在本地执行 `python3 sheep-match/deploy/verify-release.py http://1.92.214.23/ <local-release-directory>`，验证清单中全部运行文件的摘要、MIME、缓存策略、四首音频 Range 请求，以及私有路径和旧歌曲 404。公开浏览器验收首页与返回续玩、四关奖励及旧存档恢复、播放/暂停、刷新设置、春夏秋冬及第 5 关回到春季、手机短屏与临时草篮、面板交互、换季换曲和连续消除后，将验证报告和截图放入发布目录 `validation/`，更新服务器部署记录。

## 存档与回滚

羊羊牧场使用独立的 `sheep-pasture-v1` 主线存储键；新经营使用独立 `sheep_match_farm_v1:a/b` 双快照，与厨房存档互不覆盖。本地试玩和线上来源不同，进度各自保存。

小厨合合历史版本和本次激活前的 `current` 目标保留。读取活动发布的 `previous/current-target.txt`，用临时相对链接加 `mv -Tf` 原子切回该目标，再执行 `docker exec overtime-arena-web nginx -t` 和 `nginx -s reload`。恢复 `previous/DEPLOYMENT.md` 后重新核对公开页面。

本次发布为 `/assets/seasons/` 和 `/assets/farm/` 新增无缓存规则，旧厨房资源规则保留。恢复配置必须通过 `cat previous/nginx.conf > /srv/overtime-arena/nginx.conf` 保留 Docker 单独挂载文件的 inode。

## 剧情验收

发布前使用独立来源的测试存档验证首次开场、第 24 与第 96 关真实结算、奖励落位后收尾、进入新季节再开场、旧档补齐、静音刷新、笔记翻页与回看、布置清单、320×480 和 375×555 布局。不得向正式浏览器存档写入测试进度。`sheep-pasture-v1-stories` 仅保存演绎确认记录；收录由主线进度派生。

## 本地交付验证

当前任务只准备并验证本地代码与发布包，不授权发布。`verify-release.py` 的HTTP摘要、MIME、no-cache、nosniff和Range检查需对实际Nginx运行环境执行；仅打包通过不等于这些HTTP检查已通过。所有新农场 `.mjs` 必须与 `engine.mjs` 同批发布，原主线引擎也引用 `farm-stage-data.mjs`。QA-only存档只可从源码测试目录手动导入到隔离测试来源，生产包不得包含。
