# hw-gw-1 deployment

Public URL: http://1.92.214.23/ (TCP 80).

Active release: `kitchen-20261016-172556`, deployed 2026-10-16 (Asia/Shanghai).
Previous target: `releases/kitchen-20261016-171919/site`.
Rollback snapshot: `/srv/overtime-arena/releases/kitchen-20261016-172556/previous/`.

Validated: 42 game-rule tests covering chapters, stale claims, full boards,
all chapter unlocks and legacy progress; 320, 375, 390 and 430 px portrait views;
actual merge → storage/retrieval → order delivery → recipe cooking with retained
cookware → first chapter reward → reload. Environmental entries and independent
music/effect controls work, with both audio channels enabled by default.
The profile and hint interactions pass browser checks; the existing level and
XP survive the branding update. Public static files match local SHA-256 and expected MIME types; unshipped
internal files return 404; Nginx container is running and healthy.
The slab fills the worktop width in 320, 375, 390 and 430 px portrait views,
with square boards measuring 292, 337, 352 and 392 px respectively.
Short screens scroll vertically; content height is 804 px at 390×744 and
771 px at 375×667. All checked widths have no horizontal overflow; order
rewards and status buttons stay on one row without clipping. Desktop
1280×900 fits the page, and bottom entries remain reachable on short screens.

Board taps select items, including repeated taps on the same item; tapping an
empty unlocked cell clears selection. Producers retain tap-to-generate. Moving,
swapping and merging require dragging. Browser checks cover successive taps on
same/different items, locked items and empty cells, drag swapping/merging/moving,
locked-item merging, and producer drags without accidental extra generation.

Orders retain hanging paper slips, 42 px floating customer portraits with names
on the right, rewards beside status buttons at least 44 px high, and compact
paper padding. Cabinets and desktop spacing are compressed; the square board
uses all available worktop width, while page height includes safe-area insets. Order,
profile, cupboard, hint and gift controls retain 44 px or larger touch targets.

This release integrates the cream kitchen environment: rounded rectangular LCD electricity meter,
oval piggy bank with a half-inserted coin, origami star jar, cabinets, hood/order rail, raised merge slab,
wooden desktop, recipe book, phone, upright radio and the white outline puppy.
The game is named 小狗厨房. The top-left puppy portrait shows the real player
level and opens an XP panel. The assistant idles, waves for hints and celebrates
orders/chapter rewards using the local pet sprite sheet; reduced motion is respected. It retains
11 commodity chains (66 levels), 7 producers, 10 recipes, resources, storage,
shop, gifts and original audio, with 8 chapters replacing the renovation entry.
Chapters do not spend stars. The new `scene.css` and locally served
`fonts/ZCOOLKuaiLe-Regular.woff2`, `assets/puppy-sprites.webp` and
`assets/puppy-icon.svg` must be included with all five `.mjs` modules.

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
6. Verify the public HTML, every module, CSS, image and font file, MIME types and SHA-256 hashes.
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
