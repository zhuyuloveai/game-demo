# hw-gw-1 HTTP deployment

Public entry: http://1.92.214.23/

The game is served at the origin root by the independent `overtime-arena-web`
Nginx container. Existing services on other ports are unchanged. TCP port 80 was
already permitted by the server's security group; deployment did not change
firewall or cloud rules.

- Host: `hw-gw-1` (`1.92.214.23`), SSH port `52422`.
- Service directory: `/srv/overtime-arena`.
- Active web root: `/srv/overtime-arena/current`, a symlink to a release's `site` directory.
- First release: `releases/20261010-075619/site`.
- Active release: `releases/20261010-171052/site` (single-weapon start, weapon combining/recycling, four-times world with camera follow, reduced projectiles, wave-10/20 bosses and rewards).
- Previous release retained for rollback: `releases/20261010-164623/site`.
- Nginx site config: `/srv/overtime-arena/nginx.conf`, matching this directory's `nginx.conf`.
- Image: `docker.m.daocloud.io/library/nginx@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236`.
- Container uses host networking and listens only on TCP 80, with a read-only
  filesystem and site mount. Docker restart policy is `unless-stopped`.
- Health check requests the homepage every 30 seconds. Logs rotate at 10 MB, three files.

## Release contents

Run `npm run build` and `npm test`. Package only `dist/index.html`, its referenced
hashed JS/CSS, and these images from `dist/assets`:

- `office-background-v1.png`
- `weixin-avatar-front-v1.png`
- `weixin-avatar-profile-v1.png`

Keep `ART-PROMPTS.txt`, original photos, source files, tests, and obsolete avatar
assets out of the public release. Store SHA-256 checksums beside `site`, outside
the served directory, and verify them after upload. This deployment intentionally
uses the origin root; a subdirectory deployment requires updating resource URLs.

## Updating and rolling back

Upload a new release into `/srv/overtime-arena/releases/<release>/site` and verify
its checksums. Create a new relative symlink, then atomically rename it over
`current`. Nginx does not enable file caching, so a content-only update needs no
container restart. Keep the previous release for rollback; switch `current` back
to its `site` directory to restore it.

For Nginx config changes, preserve the previous config, run
`docker exec overtime-arena-web nginx -t`, then
`docker exec overtime-arena-web nginx -s reload` after the check succeeds.

Status and logs:

```sh
ssh hw-gw-1 'docker inspect overtime-arena-web --format "{{.State.Status}} {{.State.Health.Status}}"'
ssh hw-gw-1 'docker logs --tail 30 overtime-arena-web'
curl -I http://1.92.214.23/
```

Validate the public HTML, every referenced script/style and image, MIME types,
and checksums after updating. Confirm missing paths and `/assets/ART-PROMPTS.txt`
return 404. Browser gameplay validation is separate from HTTP delivery checks.
