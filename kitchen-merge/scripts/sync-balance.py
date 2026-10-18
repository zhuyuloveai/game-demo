"""Publish the audited design as a dependency-free browser module."""
import json
from pathlib import Path
from item_identities import apply_item_identities
root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'docs/balance/kitchen-target.json').read_text())
apply_item_identities(data)
(root / 'dist/balance-data.mjs').write_text('// Generated from docs/balance/kitchen-target.json. Run scripts/sync-balance.py.\nexport default ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('Published', sum(len(c['items']) for c in data['chains']), 'definitions')
legacy = json.loads((root / 'docs/balance/v3-migration-rules.json').read_text())
(root / 'dist/v3-rules.mjs').write_text('// Frozen PR #6 rules for earned-clock migration and grandfathered v3 nests.\nexport default ' + json.dumps(legacy, ensure_ascii=False, separators=(',', ':')) + ';\n')
