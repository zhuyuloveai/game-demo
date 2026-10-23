#!/bin/sh
set -eu
sheep_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
sheep_port=${SHEEP_PORT:-8017}
printf '\n羊羊牧场：http://127.0.0.1:%s/\n关闭此窗口或按 Ctrl+C 停止服务。\n\n' "$sheep_port"
exec python3 -m http.server "$sheep_port" --bind 127.0.0.1 --directory "$sheep_directory"
