#!/usr/bin/env bash
# Run on hw-gw-1 inside a freshly uploaded sheep release.
set -euo pipefail

release_name=${1:?Usage: activate.sh sheep-YYYYMMDD-HHMMSS expected-current-target}
expected_target=${2:?Pass the current target observed before preparing this release}
[[ "$release_name" =~ ^sheep-[0-9]{8}-[0-9]{6}$ ]] || exit 64
service_root=/srv/overtime-arena
release_root="$service_root/releases/$release_name"
exec 9>"$service_root/.deploy.lock"
flock -n 9
cd "$release_root"
sha256sum -c SHA256SUMS
test -f site/index.html
test -L "$service_root/current"
previous_target=$(readlink "$service_root/current")
test "$previous_target" = "$expected_target"
test -d "$service_root/$previous_target"
test ! -e previous/current-target.txt
docker exec overtime-arena-web nginx -t
mkdir previous
cp -p "$service_root/nginx.conf" previous/nginx.conf
if [ -f "$service_root/DEPLOYMENT.md" ]; then
    cp -p "$service_root/DEPLOYMENT.md" previous/DEPLOYMENT.md
fi
printf '%s\n' "$previous_target" > previous/current-target.txt

rollback() {
    trap - ERR
    ln -s "$previous_target" "$service_root/.rollback-$release_name"
    mv -Tf "$service_root/.rollback-$release_name" "$service_root/current"
    cat previous/nginx.conf > "$service_root/nginx.conf"
    docker exec overtime-arena-web nginx -t
    docker exec overtime-arena-web nginx -s reload
    printf 'Activation failed; restored %s\n' "$previous_target" >&2
}
trap rollback ERR
# Preserve the inode of the Docker-bound configuration file.
if [ -f nginx.conf ]; then
    cat nginx.conf > "$service_root/nginx.conf"
    docker exec overtime-arena-web nginx -t
fi
ln -s "releases/$release_name/site" "$service_root/.next-$release_name"
mv -Tf "$service_root/.next-$release_name" "$service_root/current"
docker exec overtime-arena-web nginx -s reload
mkdir validation
# Reload returns after signalling the master; old workers can briefly serve requests.
# Keep all checks strict, but allow the replacement workers time to take over.
verified=false
for attempt in {1..10}; do
    if python3 verify-release.py http://127.0.0.1/ "$release_root" > validation/loopback.json.tmp 2> validation/loopback.stderr; then
        mv validation/loopback.json.tmp validation/loopback.json
        verified=true
        break
    fi
    sleep 1
done
if [ "$verified" != true ]; then
    cat validation/loopback.stderr >&2
    false
fi
container_health=$(docker inspect overtime-arena-web --format '{{.State.Status}} {{.State.Health.Status}}')
printf '%s\n' "$container_health"
test "$container_health" = 'running healthy'
trap - ERR
printf 'Activated %s; previous release retained at %s\n' "$release_name" "$previous_target"
