# hw-gw-1 发布

公网地址：http://1.92.214.23:52481/?v=month08 。版本month08，30天章节。

- 主机：hw-gw-1；容器with-you-web，host网络监听52481，restart=unless-stopped。
- 静态文件：/srv/with-you/site；配置：/srv/with-you/nginx.conf。
- 沿用原镜像docker.m.daocloud.io/library/nginx:1.28-alpine与只读静态挂载。
- 只发布HTML/CSS/JS和assets，测试、报告、提示词不发布。
- 更新前备份：/srv/with-you/releases/before-month08-20260928.tar.gz。
- /srv/with-you/RELEASE记录游戏运行文件对应提交。

2026-09-28：用户更正发布目标为hw-gw-1；hw-sg-1误部署服务撤下，文件保留供追溯。

玩家存档位于浏览器localStorage，沿用原公网来源，不重置已有进度。旧七天存档保留原章节；重启可体验30天内容。

验证：Nginx配置检查、34个运行文件公网HTTP逐个读取并与提交SHA256比较。回滚时将上述备份解压回site目录即可。
