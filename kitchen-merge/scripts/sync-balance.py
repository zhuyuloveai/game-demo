"""Publish the audited design as a dependency-free browser module."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'docs/balance/kitchen-target.json').read_text())
(root / 'dist/balance-data.mjs').write_text('// Generated from docs/balance/kitchen-target.json. Run scripts/sync-balance.py.\nexport default ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('Published', sum(len(c['items']) for c in data['chains']), 'definitions')
