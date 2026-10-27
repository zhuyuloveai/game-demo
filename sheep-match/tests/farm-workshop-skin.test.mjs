import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const css=read('farm-workshop-skin.css');
const source=JSON.parse(read('docs/art-packs/farm-ui-v1/manifest.json'));
const runtime=JSON.parse(read('assets/farm/ui-workshop/manifest.json'));
const names=[...new Set([...css.matchAll(/\.\/assets\/farm\/ui-workshop\/([\w-]+)\.svg/g)].map(m=>m[1]))];
test('workshop skin ships only byte-identical referenced UI art, with source traceability',()=>{
 assert.equal(names.length,64);
 assert.deepEqual([...runtime.components.map(c=>c.id)].sort(),[...names].sort());
 for(const id of names){const c=source.components.find(c=>c.id===id);assert.ok(c,id);assert.equal(read(`assets/farm/ui-workshop/${id}.svg`),read(`docs/art-packs/farm-ui-v1/${c.file}`));assert.equal(c.containsText,false);}
 assert.equal(runtime.unusedComponents.length,20);
});
test('skin uses source-defined nine slices and uniform hit-safe close glyphs',()=>{
 assert.match(css,/border-image-slice:26 26 26 26 fill/);
 assert.match(css,/border-image-slice:24 24 24 24 fill/);
 assert.match(css,/border-image-slice:19 19 19 19 fill/);
 assert.match(css,/border-image-slice:18 fill/);
 assert.match(css,/close-default\.svg.*center\/42px 42px no-repeat/);
 assert.match(css,/width:46px;height:46px;min-height:46px/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/\.trade-root \.trade-tabs \.trade-button\{flex:0 0 auto;min-width:max-content\}/);
});
test('actual host loads the skin and state attributes derive from live runtime data',()=>{
 assert.ok(read('farm-scene-host.css').startsWith('@import url("./farm-workshop-skin.css");'));
 const factory=read('farm-factory-panel.mjs'),trade=read('farm-scene-trade.mjs');
 assert.match(factory,/box\.dataset\.uiState=e\.queue\.length\?'running':'empty'/);
 assert.match(factory,/data-ui-state=.*r\.level>ctx\.state\.level/);
 assert.match(trade,/data-ui-state=.*readyOrder\(x\)/);
 assert.doesNotMatch(css,/docs\/art-packs|previews\/|source\/pages\.js/);
});
