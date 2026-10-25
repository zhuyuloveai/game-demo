#!/usr/bin/env python3
"""Create and locally validate a new production directory. Never uploads or deploys."""
import hashlib
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit
from runtime_files import expected_runtime
source=Path(__file__).resolve().parents[1]
dest=Path(sys.argv[1]).resolve()
if dest.exists():
    raise SystemExit('Choose a new output directory; no existing release is overwritten.')
files=expected_runtime(source)
for name in files:
    if not (source/name).is_file():raise SystemExit('Missing runtime dependency: '+name)
# Static literals in ESM imports and new URL(..., import.meta.url) must be in the
# allowlist. Dynamic economic artwork URLs are covered by the validated manifest.
for name in files:
    suffix=Path(name).suffix
    if suffix not in ('.mjs','.css','.html'):continue
    text=(source/name).read_text()
    if suffix=='.mjs':
        refs=re.findall(r'''(?:from\s*|import\s*\(|new URL\s*\()\s*['"](\.[^'"`]+)['"]''',text)
    else:
        matches=re.findall(r'''(?:src|href)=["']([^"']+)["']|url\(["']?([^\)"']+)''',text)
        refs=[next(value for value in match if value) for match in matches]
    for ref in refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc or not url.path:continue
        path=(source / unquote(url.path.lstrip('/'))) if url.path.startswith('/') else (source/name).parent / unquote(url.path)
        if path.resolve().is_file():
            relative=str(path.resolve().relative_to(source))
            if relative not in files:raise SystemExit(f'Unpackaged runtime dependency {name} -> {ref}')
        else:raise SystemExit(f'Missing runtime dependency {name} -> {ref}')
site=dest/'site';site.mkdir(parents=True)
for name in sorted(files):
    target=site/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source/name,target)
for name in ('activate.sh','verify-release.py','runtime_files.py','nginx.conf'):
    shutil.copyfile(source/'deploy'/name,dest/name)
entries=[]
for path in sorted(dest.rglob('*')):
    if path.is_file():entries.append(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(dest)}')
(dest/'SHA256SUMS').write_text('\n'.join(entries)+'\n')
print(f'Local package validated: {len(files)} runtime files in {site}. No deployment performed.')
