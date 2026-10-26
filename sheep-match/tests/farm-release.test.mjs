import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('production package contains every static dependency and excludes QA-only content',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const destination=join(mkdtempSync(join(tmpdir(),'farm-release-test-')),'release');
  const result=spawnSync('python3',[join(root,'deploy/package-release.py'),destination],{encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
  for(const file of ['farm-runtime-environment.mjs','farm-runtime-environment-metadata.mjs','assets/farm-runtime/environment-manifest.json','assets/farm-runtime/environment/natural-tree.svg','assets/farm-runtime/building-states/processing.svg','assets/farm-runtime/animal-states/chicken-ready.png','farm-runtime-terrain.mjs','assets/farm-terrain/roads/road-f.svg','assets/farm-terrain/fences/fence-a.svg','assets/farm-terrain/fields/field-fertilized.svg','assets/farm-runtime/plant-states/crops/wheat-sprout.png','farm-runtime-art.mjs','farm-runtime-art-metadata.mjs','farm-world-geometry.mjs','farm-growth-layouts.mjs','assets/farm-runtime/manifest.json','assets/farm-runtime/buildings/farmhouse.png','farm-scene-host.mjs','farm-scene-host.css','farm-scene-world.mjs','farm-scene-world.css','farm-scene-trade.mjs','farm-scene-trade.css','farm-scene-management.mjs','farm-scene-management.css','farm-ui.mjs','farm-ui.css','farm-match-ui.mjs','farm-match.css','farm-visuals.mjs','fonts/ZCOOLKuaiLe-Regular.woff2'])assert(existsSync(join(destination,'site',file)),file);
  for(const path of ['tests','docs','tools'])assert(!existsSync(join(destination,'site',path)),path);
  const sums=readFileSync(join(destination,'SHA256SUMS'),'utf8');
  assert(sums.includes('site/farm-ui.css'));
  assert(sums.includes('site/assets/farm/licenses/ATTRIBUTION.md'));
});
