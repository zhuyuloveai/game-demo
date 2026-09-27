# hw-sg-1 发布

地址：http://101.44.160.78:52481/ 。版本month08，30天章节。原hw-gw-1站点保持原状。

- 主机：hw-sg-1，容器with-you-web，host网络监听52481。
- 静态站点：/srv/with-you/site；配置：/srv/with-you/nginx.conf。
- 镜像：nginx@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94。
- 只发布根目录HTML/CSS/JS和assets；测试、报告与提示词不发布。
- 容器只读，缓存与运行目录使用tmpfs，restart=unless-stopped。
- 每次部署归档保存在/srv/with-you/releases/<git-sha>，RELEASE文件记录提交。

存档保存在玩家浏览器localStorage，按访问来源隔离，不会自动从旧地址迁移。

验证首页、所有运行文件及图片HTTP200，并比较部署文件SHA256与提交版本；报告和测试路径应404。
