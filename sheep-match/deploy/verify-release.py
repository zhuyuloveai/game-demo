#!/usr/bin/env python3
"""Verify the exact public runtime and reject accidental source publication."""
import hashlib
import json
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

origin = sys.argv[1].rstrip("/") + "/"
release = Path(sys.argv[2])
from runtime_files import expected_runtime
expected_files = expected_runtime(release / 'site')
# Preserve the legacy engine's neutral hidden-stack renderer in every release.
required_legacy_modules = {"stack-hints.mjs": "application/javascript"}
assert all(expected_files.get(path) == mime for path, mime in required_legacy_modules.items())
actual_files = {str(p.relative_to(release / "site")) for p in (release / "site").rglob("*") if p.is_file()}
assert actual_files == set(expected_files), f"Unexpected runtime files: {actual_files}"
report = {"origin": origin, "files": [], "private_paths": []}
for filename, mime in expected_files.items():
    path = "" if filename == "index.html" else filename
    with urlopen(Request(origin + path, headers={"Cache-Control": "no-cache"}), timeout=20) as response:
        body = response.read()
        digest = hashlib.sha256(body).hexdigest()
        expected = hashlib.sha256((release / "site" / filename).read_bytes()).hexdigest()
        assert response.status == 200, filename
        assert digest == expected, f"Content mismatch: {filename}"
        actual_mime = response.headers.get_content_type()
        assert actual_mime in (mime if isinstance(mime, tuple) else (mime,)), f"Wrong MIME: {filename} ({actual_mime})"
        assert "no-cache" in response.headers.get("Cache-Control", ""), f"Stale cache policy: {filename}"
        assert response.headers.get("X-Content-Type-Options") == "nosniff", filename
        report["files"].append({"path": path or "/", "sha256": digest, "bytes": len(body), "mime": actual_mime})
report["audio_ranges"] = []
for audio_path in [f"media/{season}-pasture.m4a" for season in ("spring", "summer", "autumn", "winter")] + ["media/farm-life.m4a", "media/farm-match.m4a"]:
    with urlopen(Request(origin + audio_path, headers={"Range": "bytes=0-1023"}), timeout=20) as response:
        assert response.status == 206, "Audio must support byte-range requests"
        assert response.read() == (release / "site" / audio_path).read_bytes()[:1024], "Incorrect audio range"
        report["audio_ranges"].append({"path": audio_path, "status": response.status})
for path in ["README.md", "media/README.md", "media/source-verification.json", "media/composition-report.json", "media/putong-disco-marblue.m4a", "tools/compose-seasons.py", "previews/farm-home/index.html", "previews/story-notebook-v1/stories.json", "docs/story-notebook/sources.json", "tests/engine.test.mjs", "tests/preview-phone.html", "tools/compose-farm-themes.py", "media/farm-audio-report.json", "tests/fixtures/farm-level30-ready.json", "docs/farm-design/data/project-parameters-v04.json", "tools/create-farm-fixtures.mjs", "deploy/activate.sh", "launch.command", ".git/config", "SHA256SUMS", "DEPLOYMENT.md", "balance-data.mjs", "docs/fonts/ZCOOLKuaiLe-SOURCE.txt"]:
    try:
        with urlopen(origin + path, timeout=20) as response:
            raise AssertionError(f"Private or old runtime path exposed: {path} ({response.status})")
    except HTTPError as error:
        assert error.code == 404, f"Unexpected private path response: {path} ({error.code})"
        report["private_paths"].append({"path": path, "status": error.code})
print(json.dumps(report, ensure_ascii=False, indent=2))
