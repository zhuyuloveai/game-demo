"""Shared production allowlist. No test saves, generators, or design previews."""
import json
import re
from pathlib import PurePosixPath

BASE_FILES = {
    "index.html": "text/html",
    "style.css": "text/css",
    "app.mjs": "application/javascript",
    "game-navigation.mjs": "application/javascript",
    "display-mode.mjs": "application/javascript",
    "display-mode.css": "text/css",
    "engine.mjs": "application/javascript",
    "icons.mjs": "application/javascript",
    "progression.mjs": "application/javascript",
    "generator.worker.mjs": "application/javascript",
    "music.mjs": "application/javascript",
    "effects.mjs": "application/javascript",
    "pick-motion.mjs": "application/javascript",
    "stack-hints.mjs": "application/javascript",
    "seasons.mjs": "application/javascript",
    "farm-home.mjs": "application/javascript",
    "farm-progress.mjs": "application/javascript",
    "farm-home.css": "text/css",
    "farm-designs.mjs": "application/javascript",
    "story-data.mjs": "application/javascript",
    "story-progress.mjs": "application/javascript",
    "story-notebook.mjs": "application/javascript",
    "story-notebook.css": "text/css",
    **{f"assets/story/{index:02d}-{season}-{phase}.webp": "image/webp"
       for index, season, phase in [
           (1, "spring", "arrival"), (2, "spring", "home"),
           (3, "summer", "arrival"), (4, "summer", "home"),
           (5, "autumn", "arrival"), (6, "autumn", "home"),
           (7, "winter", "arrival"), (8, "winter", "home")]},
    **{f"assets/farm/{season}-{kind}-v2.png": "image/png"
       for season in ("spring", "summer", "autumn", "winter")
       for kind in ("scene", "stickers")},
    "fonts/ZCOOLKuaiLe-Regular.woff2": ("font/woff2", "application/font-woff2"),
    "assets/seasons/spring.svg": "image/svg+xml",
    "assets/seasons/summer.svg": "image/svg+xml",
    "assets/seasons/autumn.svg": "image/svg+xml",
    "assets/seasons/winter.svg": "image/svg+xml",

    **{f"media/{season}-pasture.m4a": ("audio/mp4", "audio/x-m4a")
       for season in ("spring", "summer", "autumn", "winter")},
}

NEW_MODULES = ('farm-assets','farm-config','farm-core','farm-layout','farm-linkage','farm-match-ui','farm-runtime','farm-save','farm-stage-data','farm-stage-layouts','farm-ui','farm-gestures','farm-visuals','farm-audio','farm-audio-manifest','farm-delight','farm-scene-host','farm-scene-world','farm-dom-patch','farm-scene-trade','farm-scene-management','farm-growth-layouts','farm-forest-boundary','farm-world-geometry','farm-runtime-art','farm-runtime-art-metadata','farm-runtime-terrain','farm-runtime-environment','farm-runtime-environment-metadata','farm-animal-layout')
MIME = {'.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.css':'text/css','.mjs':'application/javascript','.js':'application/javascript','.json':'application/json','.m4a':('audio/mp4','audio/x-m4a'),'.wav':('audio/wav','audio/x-wav'),'.md':'text/plain','.txt':'text/plain'}
NEW_MODULES += ('farm-coop-panel','farm-factory-panel','farm-workshop-terrain','farm-workshop-effects','farm-priority-icons')
NEW_MODULES += ('farm-animal-animation','farm-runtime-animal-animation-metadata')
NEW_MODULES += ('farm-art-direction','farm-art-presentation','farm-pen-art','farm-runtime-shelters','farm-runtime-shelters-metadata','farm-shelter-geometry')
NEW_MODULES += ('farm-machine-animation','farm-runtime-machines','farm-runtime-machines-metadata')
def expected_runtime(root):
    files = dict(BASE_FILES)
    files.update({name+'.mjs':'application/javascript' for name in NEW_MODULES})
    files.update({name:('audio/mp4','audio/x-m4a') for name in ('media/farm-life.m4a','media/farm-match.m4a')})
    for cue in ('plant','harvest','feed','product-ready','coin','button','soft-error','upgrade','first-clear','water','animal','tile-pick','tile-match','combo'):
        files[f'media/farm-sfx/{cue}.wav']=('audio/wav','audio/x-wav')
    files.update({f'farm-scene-{name}.css':'text/css' for name in ('host','world','trade','management')})
    files.update({'farm-ui.css':'text/css','farm-match.css':'text/css','farm-delight.css':'text/css','farm-coop-panel.css':'text/css','farm-factory-panel.css':'text/css'})
    files['farm-workshop-skin.css'] = 'text/css'
    # Only the shipped UI skin's actual local SVG references are runtime assets.
    # Never glob the design package: previews, source artboards and sample logic
    # intentionally remain outside production.
    skin = (root/'farm-workshop-skin.css').read_text()
    for ref in re.findall(r'''url\(\s*['"]?([^'"\s)]+)['"]?\s*\)''', skin):
        path = PurePosixPath(ref.removeprefix('./'))
        if str(path).startswith('assets/farm/ui-workshop/'):
            assert not path.is_absolute() and '..' not in path.parts and path.suffix == '.svg', path
            files[str(path)] = 'image/svg+xml'
    manifest = json.loads((root/'assets/farm/manifest.json').read_text())
    assert manifest['logicalGridSize'] == 48
    for asset in manifest['assets']:
        path = PurePosixPath(asset['path'])
        assert not path.is_absolute() and '..' not in path.parts, path
        files['assets/farm/'+str(path)] = MIME[path.suffix]
    for name in ('manifest.json','licenses/ATTRIBUTION.md','licenses/sources.json','licenses/kenney-CC0.txt'):
        files['assets/farm/'+name] = MIME[PurePosixPath(name).suffix]
    runtime_art = json.loads((root/'assets/farm-runtime/manifest.json').read_text())
    files['assets/farm-runtime/manifest.json'] = 'application/json'
    for asset in runtime_art['assets']:
        path = PurePosixPath(asset['path'])
        assert not path.is_absolute() and '..' not in path.parts and str(path).startswith('assets/farm-runtime/'), path
        files[str(path)] = MIME[path.suffix]
    shelter_art = json.loads((root/'assets/farm-runtime/shelters-v2/manifest.json').read_text())
    files['assets/farm-runtime/shelters-v2/manifest.json'] = 'application/json'
    for asset in shelter_art['assets']:
        path = PurePosixPath(asset['path'])
        assert not path.is_absolute() and '..' not in path.parts and str(path).startswith('assets/farm-runtime/shelters-v2/'), path
        files[str(path)] = MIME[path.suffix]
    animation_manifest = 'assets/farm-runtime/animal-animation-v1/chicken/manifest.json'
    animation_art = json.loads((root/animation_manifest).read_text())
    files[animation_manifest] = 'application/json'
    for asset in animation_art['assets']:
        path = PurePosixPath(asset['path'])
        assert not path.is_absolute() and '..' not in path.parts and str(path).startswith('assets/farm-runtime/animal-animation-v1/'), path
        assert path.suffix == '.png', path
        files[str(path)] = MIME[path.suffix]
    for species in ('cow', 'pig', 'sheep', 'lamb'):
        animation_manifest = f'assets/farm-runtime/animal-animation-v2/{species}/manifest.json'
        animation_art = json.loads((root/animation_manifest).read_text())
        files[animation_manifest] = 'application/json'
        for asset in animation_art['assets']:
            path = PurePosixPath(asset['path'])
            assert not path.is_absolute() and '..' not in path.parts and str(path).startswith(f'assets/farm-runtime/animal-animation-v2/{species}/'), path
            assert path.suffix == '.png', path
            files[str(path)] = MIME[path.suffix]
    environment_art = json.loads((root/'assets/farm-runtime/environment-manifest.json').read_text())
    files['assets/farm-runtime/environment-manifest.json'] = 'application/json'
    for asset in environment_art['assets']:
        path = PurePosixPath(asset['path'])
        assert not path.is_absolute() and '..' not in path.parts and str(path).startswith('assets/farm-runtime/'), path
        files[str(path)] = MIME[path.suffix]
    for group, names in [('roads', [f'road-{i:x}.svg' for i in range(16)]), ('fences', [f'fence-{i:x}.svg' for i in range(16)]), ('flower-fences', [f'flower-fence-{i:x}.svg' for i in range(16)]), ('fields', ['field-empty.svg', 'field-sown.svg', 'field-fertilized.svg'])]:
        for name in names:
            files[f'assets/farm-terrain/{group}/{name}'] = 'image/svg+xml'
    icon_manifest = 'assets/farm/priority-icons-v1/manifest.json'
    icon_art = json.loads((root/icon_manifest).read_text())
    files[icon_manifest] = 'application/json'
    for icon in icon_art['icons']:
        path = PurePosixPath(icon['svg'])
        assert not path.is_absolute() and '..' not in path.parts and path.suffix == '.svg' and path.parts[0] in ('items', 'ui', 'tools'), path
        files['assets/farm/priority-icons-v1/'+str(path)] = 'image/svg+xml'
    completion_manifest = 'assets/farm/completion-icons-v1/manifest.json'
    completion_art = json.loads((root/completion_manifest).read_text())
    files[completion_manifest] = 'application/json'
    for icon in completion_art['icons']:
        path = PurePosixPath(icon['svg'])
        assert not path.is_absolute() and '..' not in path.parts and path.suffix == '.svg', path
        assert path.parts[0] == 'icons' and path.parts[1] in ('processed', 'materials', 'currency', 'achievements', 'branch'), path
        files['assets/farm/completion-icons-v1/'+str(path)] = 'image/svg+xml'
    floral_manifest = 'assets/farm-runtime/floral-skins-v1/manifest.json'
    floral_art = json.loads((root/floral_manifest).read_text())
    files[floral_manifest] = 'application/json'
    files['assets/farm-runtime/floral-skins-v1/metadata.mjs'] = 'application/javascript'
    for asset in floral_art['assets']:
        path = PurePosixPath(asset['path'])
        assert not path.is_absolute() and '..' not in path.parts and str(path).startswith('assets/farm-runtime/floral-skins-v1/') and path.suffix == '.png', path
        files[str(path)] = 'image/png'
    for name in (
        'grass-edge-ne-dense', 'grass-edge-ne-sparse', 'grass-edge-nw-dense', 'grass-edge-nw-sparse',
        'soil-grass-ne', 'soil-grass-nw',
        *(f'grass-corner-{kind}-{direction}' for kind in ('inner', 'outer') for direction in ('n', 'e', 's', 'w')),
        *(f'grass-cap-{axis}-{end}' for axis in ('ne', 'nw') for end in ('start', 'end')),
        'fog-overlay-reused',
    ):
        files[f'assets/farm/terrain-workshop/{name}.png'] = 'image/png'
    for name in ('clear-dust', 'stone-chips', 'wood-chips', 'land-open'):
        files[f'assets/farm/effects-workshop/{name}.png'] = 'image/png'
    # Only approved independent parts, never diagnostics or editable source.
    part_manifest = 'assets/farm-runtime/machine-parts-v1/manifest.json'
    part_art = json.loads((root/part_manifest).read_text())
    files[part_manifest] = 'application/json'
    for asset in part_art['assets']:
        path = PurePosixPath(asset['path'])
        assert not path.is_absolute() and '..' not in path.parts and str(path).startswith('assets/farm-runtime/machine-parts-v1/'), path
        assert path.suffix == '.png', path
        files[str(path)] = MIME[path.suffix]
    return files
