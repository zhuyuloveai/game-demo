#!/bin/bash
set -euo pipefail

demo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
godot_path=""
for candidate in \
  "${GODOT_BIN:-}" \
  "$demo_dir/.runtime/Godot.app/Contents/MacOS/Godot" \
  "/Applications/Godot.app/Contents/MacOS/Godot" \
  "$HOME/Applications/Godot.app/Contents/MacOS/Godot"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    godot_path="$candidate"
    break
  fi
done

if [[ -z "$godot_path" ]]; then
  godot_path="$(command -v godot || command -v godot4 || true)"
fi
if [[ -z "$godot_path" ]]; then
  printf '%s\n' '未找到 Godot 4。请用 Godot 导入本目录的 project.godot，或设置 GODOT_BIN 为 Godot 可执行文件的路径。'
  exit 1
fi

exec "$godot_path" --path "$demo_dir" "$@"
