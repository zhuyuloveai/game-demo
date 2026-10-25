"""Shared production allowlist. No test saves, generators, or design previews."""
import json
from pathlib import PurePosixPath

BASE_FILES = {
    "index.html": "text/html",
    "style.css": "text/css",
    "app.mjs": "application/javascript",
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

NEW_MODULES = ('farm-assets','farm-config','farm-core','farm-layout','farm-linkage','farm-match-ui','farm-runtime','farm-save','farm-stage-data','farm-stage-layouts','farm-ui','farm-gestures','farm-visuals','farm-audio','farm-audio-manifest','farm-delight','farm-scene-host','farm-scene-world','farm-scene-trade','farm-scene-management')
MIME = {'.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.css':'text/css','.mjs':'application/javascript','.js':'application/javascript','.json':'application/json','.m4a':('audio/mp4','audio/x-m4a'),'.wav':('audio/wav','audio/x-wav'),'.md':'text/plain','.txt':'text/plain'}
def expected_runtime(root):
    files = dict(BASE_FILES)
    files.update({name+'.mjs':'application/javascript' for name in NEW_MODULES})
    files.update({name:('audio/mp4','audio/x-m4a') for name in ('media/farm-life.m4a','media/farm-match.m4a')})
    for cue in ('plant','harvest','feed','product-ready','coin','button','soft-error','upgrade','first-clear','water','animal','tile-pick','tile-match','combo'):
        files[f'media/farm-sfx/{cue}.wav']=('audio/wav','audio/x-wav')
    files.update({f'farm-scene-{name}.css':'text/css' for name in ('host','world','trade','management')})
    files.update({'farm-ui.css':'text/css','farm-match.css':'text/css','farm-delight.css':'text/css'})
    manifest = json.loads((root/'assets/farm/manifest.json').read_text())
    assert manifest['logicalGridSize'] == 48
    for asset in manifest['assets']:
        path = PurePosixPath(asset['path'])
        assert not path.is_absolute() and '..' not in path.parts, path
        files['assets/farm/'+str(path)] = MIME[path.suffix]
    for name in ('manifest.json','licenses/ATTRIBUTION.md','licenses/sources.json','licenses/kenney-CC0.txt'):
        files['assets/farm/'+name] = MIME[PurePosixPath(name).suffix]
    return files
