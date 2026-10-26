import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ENVIRONMENT_ART_METADATA,resolveEnvironmentArt,resolveEnvironmentLegacyArt,resolveObstacleArt,resolveBuildingBadge,resolveMachineMasteryArt} from '../farm-runtime-environment.mjs';
import {BUILDINGS} from '../farm-config.mjs';
test('all 50 approved environment and building SVGs retain exact source bytes and anchors',()=>{
 assert.equal(Object.keys(ENVIRONMENT_ART_METADATA).length,50);
 for(const [key,art] of Object.entries(ENVIRONMENT_ART_METADATA)){
  const data=readFileSync(new URL('../'+art.path,import.meta.url)),source=readFileSync(new URL('../'+art.source,import.meta.url));
  assert.deepEqual(data,source,key);assert.equal(createHash('sha256').update(data).digest('hex'),art.sha256);
  assert.ok(art.width>0&&art.height>0);assert.ok(art.anchor.every(Number.isFinite));
  assert.equal(resolveEnvironmentLegacyArt(art.legacyPath).key,key);
 }
});
test('natural obstacles and unsupported entities keep exact component/fallback boundaries',()=>{
 for(const [configId,id] of [['natural_tree','natural-tree'],['natural_bush','natural-bush'],['rock','rocks-0']])assert.equal(resolveObstacleArt({kind:'obstacle',configId}).id,id);
 assert.equal(resolveObstacleArt({kind:'obstacle',configId:'unknown'}),null);assert.equal(resolveObstacleArt({kind:'shelter',configId:'cow'}),null);
 assert.equal(resolveEnvironmentArt('absent'),null);assert.equal(resolveEnvironmentLegacyArt('special-skin.svg'),null);
});
test('building state markers follow construction, completion, work and real capacity without changing state',()=>{
 const state={now:100,inventory:{wheat:3,chicken_feed:2},storage:{silo:{capacity:3},barn:{capacity:4}},mastery:{}};
 const copy=structuredClone(state),machine={kind:'machine',built:false,buildReadyAt:101};
 assert.equal(resolveBuildingBadge(machine,state).id,'constructing');
 assert.equal(resolveBuildingBadge({...machine,buildReadyAt:100},state).id,'complete');
 assert.equal(resolveBuildingBadge({...machine,built:true,queue:[{}]},state).id,'processing');
 assert.equal(resolveBuildingBadge({...machine,built:true,queue:[{}],completed:[{}]},state).id,'complete');
 assert.equal(resolveBuildingBadge({...machine,built:true,queue:[],completed:[]},state),null);
 assert.equal(resolveBuildingBadge({kind:'silo'},state).id,'full');assert.equal(resolveBuildingBadge({kind:'barn'},state),null);
 assert.deepEqual(state,copy);
});
test('all four mastery states use configured cumulative hours rather than invented thresholds',()=>{
 const config=Object.values(BUILDINGS)[0],entity={kind:'machine',machineType:config.machineType,built:true};
 assert.equal(resolveMachineMasteryArt(entity,{mastery:{}}).id,'mastery-0');
 for(let i=0;i<3;i++)assert.equal(resolveMachineMasteryArt(entity,{mastery:{[config.machineType]:config.masteryCumulativeHours[i]*3600000}}).id,'mastery-'+(i+1));
 assert.equal(resolveMachineMasteryArt({...entity,built:false},{mastery:{}}),null);
});
