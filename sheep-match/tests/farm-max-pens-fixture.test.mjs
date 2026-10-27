import test from 'node:test';
import assert from 'node:assert/strict';
import {growthFixture,maxPensFixture} from './farm-growth-fixtures.mjs';
import {ANIMALS} from '../farm-config.mjs';
import {assertFarm} from '../farm-core.mjs';
import {validateFarmState} from '../farm-save.mjs';
import {validateLayout} from '../farm-layout.mjs';

test('maximum pens fixture owns all 12 legal shelters and 63 animals without moving the stage-3 layout',()=>{
 const before=growthFixture(3),state=maxPensFixture(),pens=state.entities.filter(e=>e.kind==='shelter');
 assert.equal(pens.length,12);
 assert.equal(pens.reduce((n,p)=>n+p.animals.length,0),63);
 for(const animal of Object.values(ANIMALS)){
  const own=pens.filter(p=>p.configId===animal.id);
  assert.equal(own.length,animal.levels.length);
  assert.deepEqual(own.map(p=>p.tier).sort(),animal.levels.map((_,i)=>i));
  for(const pen of own){assert.equal(pen.animals.length,animal.capacity);assert.deepEqual(new Set(pen.animals.map(a=>a.status)),new Set(['hungry','producing','ready']));}
 }
 for(const previous of before.entities){
  const current=state.entities.find(e=>e.id===previous.id);
  assert(current,previous.id+' must remain present');
  assert.deepEqual([current.x,current.y,current.w,current.h],[previous.x,previous.y,previous.w,previous.h]);
 }
 assert.deepEqual(state.openedLand,[],'Current maximum fits legally inside the original land');
 assertFarm(state);validateFarmState(state);assert.equal(validateLayout(state).ok,true);
});
