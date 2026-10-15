#!/usr/bin/env bash
# Run on hw-gw-1 after uploading a release under /srv/overtime-arena/releases/.
set -euo pipefail

release_name=${1:?Usage: activate.sh kitchen-YYYYMMDD-HHMMSS}
[[ "$release_name" =~ ^kitchen-[0-9]{8}-[0-9]{6}$ ]] || exit 64
service_root=/srv/overtime-arena
release_root="$service_root/releases/$release_name"
cd "$release_root"
sha256sum -c SHA256SUMS
test -f site/index.html
test -f nginx.conf
test -L "$service_root/current"
previous_target=$(readlink "$service_root/current")
test -d "$service_root/$previous_target"
if [ "$previous_target" = "releases/$release_name/site" ] || [ -e "$release_root/previous/current-target.txt" ]; then
    printf 'Release already activated or attempted; preserve its rollback snapshot and use a new release name.\n' >&2
    exit 65
fi
mkdir -p "$release_root/previous"
cp -p "$service_root/nginx.conf" "$release_root/previous/nginx.conf"
if [ -f "$service_root/DEPLOYMENT.md" ]; then
    cp -p "$service_root/DEPLOYMENT.md" "$release_root/previous/DEPLOYMENT.md"
fi
printf '%s\n' "$previous_target" > "$release_root/previous/current-target.txt"

rollback() {
    trap - ERR
    cat "$release_root/previous/nginx.conf" > "$service_root/nginx.conf"
    ln -s "$previous_target" "$service_root/.rollback-$release_name"
    mv -Tf "$service_root/.rollback-$release_name" "$service_root/current"
    docker exec overtime-arena-web nginx -t
    docker exec overtime-arena-web nginx -s reload
    printf 'Activation failed; restored %s\n' "$previous_target" >&2
}
trap rollback ERR
# Preserve the inode of the Docker-bound Nginx config file.
cat "$release_root/nginx.conf" > "$service_root/nginx.conf"
docker exec overtime-arena-web nginx -t
docker exec overtime-arena-web nginx -s reload
ln -s "releases/$release_name/site" "$service_root/.next-$release_name"
mv -Tf "$service_root/.next-$release_name" "$service_root/current"
verified=0
for attempt in 1 2 3 4 5; do
    if curl --fail --silent http://127.0.0.1/ | grep -q '小厨合合' &&
       curl --fail --silent --head http://127.0.0.1/app.mjs | grep -qi 'Content-Type: application/javascript'; then
        verified=1
        break
    fi
    sleep 1
done
test "$verified" = 1
container_health=$(docker inspect overtime-arena-web --format '{{.State.Status}} {{.State.Health.Status}}')
printf '%s\n' "$container_health"
test "$container_health" = 'running healthy'
trap - ERR
printf 'Activated %s; previous release retained at %s\n' "$release_name" "$previous_target"
