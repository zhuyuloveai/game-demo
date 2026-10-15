# hw-gw-1 公网部署

本次十轮迭代仅在本地完成，公网仍为旧版本。以下为未来获得部署授权后使用的说明，本轮未执行。

- 地址：http://1.92.214.23:52481/
- 服务器：`hw-gw-1`
- 静态文件：`/srv/with-you/site`
- Nginx 配置：`/srv/with-you/nginx.conf`
- 容器：`with-you-web`，`restart=unless-stopped`
- 镜像：`docker.m.daocloud.io/library/nginx:1.28-alpine`
- 网络：host，Nginx 仅监听 TCP 52481。采用主机网络以兼容服务器现有 nftables 转发策略，未修改防火墙规则。
- 只发布运行必需的 HTML/CSS/JS 和 assets；文档、测试与提示词不对外发布。

站点为无后端静态游戏，存档保存在浏览器 localStorage。公网地址与 localhost 的存档按来源隔离，不自动同步。

更新静态文件（在 with-you 目录执行）：

```sh
scp index.html style.css *.js hw-gw-1:/srv/with-you/site/
scp -r assets hw-gw-1:/srv/with-you/site/
```

查看运行状态：

```sh
ssh hw-gw-1 'docker ps --filter name=with-you-web'
curl -I http://1.92.214.23:52481/
```

容器创建命令（仅容器不存在时执行）：

```sh
docker run -d --name with-you-web --restart unless-stopped \
  --network host --read-only \
  --tmpfs /var/cache/nginx --tmpfs /var/run \
  -v /srv/with-you/site:/usr/share/nginx/html:ro \
  -v /srv/with-you/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  docker.m.daocloud.io/library/nginx:1.28-alpine
```

历史部署验证（非本次迭代）：公网首页和结局图片返回 200，浏览器完成新建角色、工作行动、结果展示；本地完成整周结局与 CG 相册验证，7 项逻辑测试通过。
