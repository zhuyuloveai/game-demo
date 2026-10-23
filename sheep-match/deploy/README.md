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
2. 仅打包 `index.html`、`style.css`、`app.mjs`、`engine.mjs`、`icons.mjs`、`progression.mjs`、`generator.worker.mjs`、`music.mjs`、`effects.mjs`、`media/putong-disco-marblue.m4a` 至全新发布目录的 `site/`。无构建步骤。文档、测试、部署工具与源码快照均放在 `site/` 外。音乐来源及非商业使用依据见 [media/README.md](../media/README.md)。
3. 将 `activate.sh`、`verify-release.py` 和发布文件的 `SHA256SUMS` 放在发布目录中。记录精确源码 Git 提交，上传至服务器的新发布目录。
4. 读取 `current` 的目标；执行 `bash activate.sh <release-name> <expected-current-target>`。脚本校验摘要与前一目标、保存回滚快照，再原子切换；站点验证失败自动恢复。现有 Nginx 配置不变，`.mjs` 已使用 `application/javascript`。
5. 在本地执行 `python3 sheep-match/deploy/verify-release.py http://1.92.214.23/ <local-release-directory>`，验证全部 10 个运行文件的摘要、MIME、缓存策略、音频 Range 请求，以及私有路径 404。公开浏览器验收播放/暂停、刷新设置、切换关卡连续播放和连续消除后，将验证报告和截图放入发布目录 `validation/`，更新服务器部署记录。

## 存档与回滚

羊羊牧场使用独立的 `sheep-pasture-v1` 存储键，与厨房存档互不覆盖。本地试玩和线上来源不同，进度各自保存。

小厨合合历史版本和本次激活前的 `current` 目标保留。读取活动发布的 `previous/current-target.txt`，用临时相对链接加 `mv -Tf` 原子切回该目标，再执行 `docker exec overtime-arena-web nginx -t` 和 `nginx -s reload`。恢复 `previous/DEPLOYMENT.md` 后重新核对公开页面。

本次发布不修改 Nginx 配置。若将来需要恢复配置，必须通过 `cat previous/nginx.conf > /srv/overtime-arena/nginx.conf` 保留 Docker 单独挂载文件的 inode。
