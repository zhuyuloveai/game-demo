import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chainClassicMarkup,CLASSIC_ALIASES} from '../dist/chain-classic-art.mjs';
import layout from '../dist/chain-classic-layout.mjs';

const plan=JSON.parse(fs.readFileSync(new URL('../docs/art/ITEM_IDENTITIES_V6.json',import.meta.url)));

test('classic illustration covers every approved identity with different adjacent drawings',()=>{
  let active=0,preview=0;
  for(const chain of plan.chains){
    let previous=null;
    for(const item of chain.items){
      const id=chain.id==='grain'?'grain:'+item.level:item.id;
      const raw=chainClassicMarkup(id,{fit:false});
      assert.ok(raw?.includes(`data-classic-item="${id}"`),id);
      assert.doesNotMatch(raw,/<image|data-3d-item|undefined|NaN/,id);
      const silhouette=raw.replace(/data-classic-item="[^"]+"/,'');
      assert.notEqual(silhouette,previous,'Repeated adjacent artwork: '+id);
      previous=silhouette;
      const box=layout[id];
      assert.ok(Number.isFinite(box.x)&&Number.isFinite(box.y)&&box.scale>0&&box.scale<=1,id);
      chain.runtimeEnabled?active++:preview++;
    }
  }
  assert.equal(active,389);assert.equal(preview,8);
  assert.equal(chainClassicMarkup('fruit:9'),null);
  assert.equal(chainClassicMarkup('unknown:1'),null);
});

test('legacy resource drawings reuse their matching V6 identity without changing the old IDs',()=>{
  assert.deepEqual(CLASSIC_ALIASES,plan.legacyAliases);
  for(const [id,target] of Object.entries(CLASSIC_ALIASES)){
    const svg=chainClassicMarkup(id);
    assert.ok(svg.includes(`data-classic-item="${id}"`));
    assert.ok(svg.includes(`data-classic-alias="${target}"`));
  }
});
