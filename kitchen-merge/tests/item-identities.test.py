"""Identity refresh must never rebalance existing saves or activate preview chains."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from item_identities import apply_item_identities


def mechanics(value):
    if isinstance(value, dict):
        return {k: mechanics(v) for k, v in value.items() if k not in ('name', 'artIdentityVersion')}
    if isinstance(value, list):
        return [mechanics(v) for v in value]
    return value


class ItemIdentitiesTest(unittest.TestCase):
    def setUp(self):
        self.original = json.loads((ROOT / 'docs/balance/kitchen-target.json').read_text())

    def test_changes_display_names_only_and_is_idempotent(self):
        updated = apply_item_identities(copy.deepcopy(self.original))
        self.assertEqual(mechanics(updated), mechanics(self.original))
        self.assertEqual(apply_item_identities(copy.deepcopy(updated)), updated)
        items = {i['id']: i for c in updated['chains'] for i in c['items']}
        self.assertEqual(items['fruit:7']['name'], '山竹')
        self.assertEqual(items['fruit:8']['name'], '榴莲')
        self.assertEqual(len(items), 422)
        self.assertFalse(any(c['id'] == 'grain' for c in updated['chains']))
        self.assertFalse(any('grain' in str(p['drops']) for p in updated['producers']))

    def test_recipe_titles_describe_the_existing_output(self):
        updated = apply_item_identities(copy.deepcopy(self.original))
        names = {i['id']: i['name'] for c in updated['chains'] for i in c['items']}
        for recipe in updated['recipes']:
            key = f"{recipe['output']['family']}:{recipe['output']['level']}"
            self.assertEqual(recipe['name'], names[key] + '配方')

    def test_rejects_incomplete_existing_chains(self):
        broken = copy.deepcopy(self.original)
        next(c for c in broken['chains'] if c['id'] == 'fruit')['items'].pop()
        with self.assertRaisesRegex(ValueError, 'chain length'):
            apply_item_identities(broken)


if __name__ == '__main__':
    unittest.main()
