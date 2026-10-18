"""Apply approved visual identities without changing stable IDs or game mechanics."""
import json
from pathlib import Path

IDENTITY_FILE = Path(__file__).resolve().parents[1] / 'docs/art/ITEM_IDENTITIES_V6.json'

def apply_item_identities(config):
    identities = json.loads(IDENTITY_FILE.read_text())
    chains = {c['id']: c for c in identities['chains'] if c['runtimeEnabled']}
    names = {i['id']: i['name'] for c in chains.values() for i in c['items']}
    seen = set()
    for chain in config['chains']:
        if chain['id'] not in chains:
            continue
        concept = chains[chain['id']]
        if len(chain['items']) != len(concept['items']):
            raise ValueError('Identity chain length differs: ' + chain['id'])
        chain['name'] = concept['name']
        for item in chain['items']:
            item['name'] = names[item['id']]
            seen.add(item['id'])
    if seen != set(names):
        raise ValueError('Missing stable item IDs: ' + str(set(names) - seen))
    # Grandfathered resource IDs retain their original values and share the
    # refreshed equivalent artwork, so their labels must describe that artwork.
    aliases = identities.get('legacyAliases', {})
    for chain in config['chains']:
        for item in chain['items']:
            if item['id'] in aliases:
                item['name'] = names[aliases[item['id']]]
    for producer in config['producers']:
        if producer['chain'] in chains:
            producer['name'] = chains[producer['chain']]['name']
    for recipe in config['recipes']:
        output = recipe['output']
        key = f"{output['family']}:{output['level']}"
        if key in names:
            recipe['name'] = names[key] + '配方'
    config['artIdentityVersion'] = identities['version']
    return config
