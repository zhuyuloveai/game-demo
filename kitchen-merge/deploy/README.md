# hw-gw-1 deployment

Public URL: http://1.92.214.23/ (TCP 80).

Active release: `kitchen-20261016-010418`, deployed 2026-10-16 (Asia/Shanghai).
Previous target: `releases/kitchen-20261016-003237/site`.
Rollback snapshot: `/srv/overtime-arena/releases/kitchen-20261016-010418/previous/`.

Validated: 35 game-rule tests; 6,000 mixed engine action/reload invariant checks;
390×844 and 375×667 portrait browser views; actual merge → recipe cooking with
retained cookware → storage/retrieval → order delivery; daily reward, pending
claim, independent music/effect controls; legacy v1 progress survives migration.
Public browser generation succeeds and has no application console errors.
All seven public static files match local SHA-256 and expected MIME types;
unshipped internal files return 404; Nginx container is running and healthy.
Small screens scroll vertically while preserving readable labels and square tiles.

The expanded release includes `catalog.mjs` and `audio.mjs`; both are required.
It has 11 commodity chains (66 levels), 7 producers, 10 recipes, 8 renovation
stages, resource chains, storage/shop/rewards, original music and action effects.

The portrait kitchen game replaces the previous **下班突围** homepage. It reuses
the existing `overtime-arena-web` Nginx container and its read-only bind mount at
`/srv/overtime-arena`. The legacy container/directory names are retained so no
container recreation or changes to other services are needed.

- SSH: `ssh hw-gw-1` (root, port 52422).
- Served directory: `/srv/overtime-arena/current`, an atomic relative symlink.
- Release directories: `/srv/overtime-arena/releases/kitchen-YYYYMMDD-HHMMSS/site`.
- Previous grass-cutting game: `releases/20261010-171052/site`, preserved intact.
- Configuration: `/srv/overtime-arena/nginx.conf` (matches `deploy/nginx.conf`).
- The `.mjs` location returns `application/javascript`, required by native modules.
- The root HTML, modules and CSS require revalidation; directory listing is off.
- No security group, firewall, listening-port or other-container changes.

## Release procedure

1. Run `node --test tests/engine.test.mjs` and `node --check dist/app.mjs` locally.
2. Copy only `dist/` files into a new release's `site/`. Keep documentation,
   `.openai`, source control, tests, screenshots and backups outside this folder.
3. Include `nginx.conf`, `activate.sh` and SHA-256 checksums alongside `site/`.
4. Upload to a new release directory, then run `bash activate.sh <release-name>`
   from that release. The script checks file hashes and saves previous config,
   deployment notes and symlink target into `previous/` outside the served tree.
5. Nginx configuration is copied into the existing inode because Docker bind
   mounts that file. `nginx -t` must pass before reload. The current symlink is
   swapped atomically. HTTP and container health checks must succeed; activation
   errors restore the prior config and symlink automatically.
6. Verify the public HTML, every module and CSS file, MIME types and SHA-256 hashes.
   Verify unshipped internal paths return 404, then exercise gameplay in browser.

Each activation uses a new release name. Re-running a prior release is refused
to preserve the original rollback record.

## Rollback

Read the target in the active release's `previous/current-target.txt`, restore
its `previous/nginx.conf` with `cat` into `/srv/overtime-arena/nginx.conf` (retain
the inode), run `docker exec overtime-arena-web nginx -t`, swap `current` back
atomically, then run `docker exec overtime-arena-web nginx -s reload`. Old static
files remain in their original release directories.

Browser progress is saved per origin in localStorage; the old Sites URL and this
HTTP origin have independent progress.
