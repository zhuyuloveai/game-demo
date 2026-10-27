import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(join(root,p));
const source='docs/art-packs/farm-ui-v1/';
const skin=()=>read('farm-workshop-skin.css').toString();
const skinAssets=()=>[...new Set([...skin().matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)].map(m=>m[1].replace(/^\.\//,'')))].filter(p=>p.startsWith('assets/farm/ui-workshop/'));
function runtime(){const r=spawnSync('python3',['-c',`import sys,json;from pathlib import Path;sys.path.insert(0,${JSON.stringify(join(root,'deploy'))});from runtime_files import expected_runtime;print(json.dumps(expected_runtime(Path(${JSON.stringify(root)}))))`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}

test('workshop runtime includes exact referenced UI components, terrain and only atlas effects',()=>{
  const files=runtime(), ui=skinAssets();assert(ui.length>10,'the skin uses the reusable kit, not one flattened page');
  for(const p of ['farm-workshop-skin.css','farm-workshop-terrain.mjs','farm-workshop-effects.mjs',...ui])assert(p in files,p);
  assert.deepEqual(Object.keys(files).filter(p=>p.startsWith('assets/farm/ui-workshop/')).sort(),ui.sort());
  assert.equal(Object.keys(files).filter(p=>p.startsWith('assets/farm/terrain-workshop/')).length,19);
  assert.equal(Object.keys(files).filter(p=>p.startsWith('assets/farm/effects-workshop/')).length,4);
  for(const p of Object.keys(files))assert(!/^(docs|tests|tools)\//.test(p),p);
  assert(!Object.keys(files).some(p=>p.includes('effects-workshop/frames/')));
});

test('workshop shipped components and PNGs retain the approved source bytes and geometry',()=>{
  for(const p of skinAssets())assert(read(p).equals(read(source+'components/'+p.split('/').at(-1))),p);
  const terrain=JSON.parse(read(source+'terrain/manifest.json'));
  for(const a of terrain.assets){const p='assets/farm/terrain-workshop/'+a.id+'.png',b=read(p);assert(b.equals(read(source+a.png)),p);assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],a.canvas.map(v=>v*a.pngPixelsPerUnit),p);assert.equal(b[25],6,'PNG retains RGBA transparency');}
  const effects=JSON.parse(read(source+'effects/manifest.json'));
  for(const a of effects.effects){const p='assets/farm/effects-workshop/'+a.id+'.png',b=read(p);assert(b.equals(read(source+a.atlas)),p);assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],a.atlasCanvas,p);assert.equal(b[25],6);assert.equal(a.frames.length,8);assert.equal(a.loop,false);assert.deepEqual(a.anchor,[64,76]);}
});

test('release validation follows quoted CSS imports, including missing or unpackaged skins',()=>{
  const fixture=mkdtempSync(join(tmpdir(),'farm-css-import-')),deploy=join(fixture,'deploy');mkdirSync(deploy);
  copyFileSync(join(root,'deploy/package-release.py'),join(deploy,'package-release.py'));
  writeFileSync(join(deploy,'runtime_files.py'),"def expected_runtime(root):\n    return {'root.css':'text/css'}\n");
  writeFileSync(join(fixture,'root.css'),'@import "./workshop.css";\n');
  const run=()=>spawnSync('python3',[join(deploy,'package-release.py'),join(fixture,'output')],{encoding:'utf8'});
  let r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/Missing runtime dependency root.css -> .\/workshop.css/);
  writeFileSync(join(fixture,'workshop.css'),'body {color:brown}');r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/Unpackaged runtime dependency root.css -> .\/workshop.css/);
});
