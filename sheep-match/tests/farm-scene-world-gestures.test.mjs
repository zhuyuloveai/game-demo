import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm, executeFarm} from '../farm-core.mjs';
import * as H from '../farm-scene-world.mjs';
const plain=value=>value==null?value:JSON.parse(JSON.stringify(value));
const rect=(id,x,y=0,entityId)=>({id,left:x,top:y,right:x+8,bottom:y+8,...(entityId?{entityId}:{})});
test('P02 a fast two-point stroke hits 20 visible fields in geometric order, not array order', () => {
  const targets = Array.from({length: 20}, (_, i) => rect(`field_${i + 1}`, i * 10));
  const stroke = H.createStroke({action: 'plant', itemId: 'wheat'}, {x: -1, y: 4});
  H.extendStroke(stroke, {x: 200, y: 4}, [...targets].reverse());
  assert.deepEqual(plain(H.finishStroke(stroke)), {type: 'plant', itemId: 'wheat', entityIds: targets.map(t => t.id)});
});

test('P02 brush backtracking deduplicates each identity and preserves first-hit ordering', () => {
  const targets = [rect('field_1', 0), rect('field_2', 10), rect('field_3', 20)];
  const stroke = H.createStroke({action: 'harvest'}, {x: 29, y: 4});
  H.extendStroke(stroke, {x: -1, y: 4}, targets);
  H.extendStroke(stroke, {x: 29, y: 4}, targets);
  H.extendStroke(stroke, {x: -1, y: 4}, targets);
  assert.deepEqual(plain(H.finishStroke(stroke)), {type: 'harvest', entityIds: ['field_3', 'field_2', 'field_1']});
});

test('visible target geometry is used rather than an invisible expanded rectangle', () => {
  const stroke = H.createStroke({action: 'harvest'}, {x: -1, y: 12});
  H.extendStroke(stroke, {x: 30, y: 12}, [rect('field_1', 0), rect('field_2', 10), rect('field_3', 20)]);
  assert.equal(H.finishStroke(stroke), null);
});

test('segment intersection ignores malformed or zero-area hitboxes and does not mutate visible target definitions', () => {
  const targets = [rect('valid', 10), {...rect('zero', 20), right: 20}, {...rect('nonfinite', 30), left: NaN}];
  const before = structuredClone(targets);
  assert.deepEqual(plain(H.segmentHits({x: -1, y: 4}, {x: 40, y: 4}, targets)).map(t => t.id), ['valid']);
  assert.deepEqual(targets, before);
  assert.deepEqual(plain(H.segmentHits({x: NaN, y: 4}, {x: 40, y: 4}, targets)), []);
});

test('a point inside a visible target can be a click-equivalent hit; a point in the gap cannot', () => {
  const inside = H.createStroke({action: 'harvest'}, {x: 4, y: 4});
  H.extendStroke(inside, {x: 4, y: 4}, [rect('field_1', 0)]);
  assert.deepEqual(plain(H.finishStroke(inside)), {type: 'harvest', entityIds: ['field_1']});
  const outside = H.createStroke({action: 'harvest'}, {x: 9, y: 4});
  H.extendStroke(outside, {x: 9, y: 4}, [rect('field_1', 0), rect('field_2', 10)]);
  assert.equal(H.finishStroke(outside), null);
});

test('P04 exact animal IDs are filtered to their owner shelter, deduplicated and returned in first-hit order', () => {
  const targets = [rect('animal_a', 0, 0, 'coop'), rect('animal_other', 10, 0, 'other_coop'), rect('animal_b', 20, 0, 'coop')];
  for (const action of ['feed', 'collectAnimal']) {
    const stroke = H.createStroke({action, entityId: 'coop'}, {x: -1, y: 4});
    H.extendStroke(stroke, {x: 30, y: 4}, [...targets].reverse());
    H.extendStroke(stroke, {x: -1, y: 4}, targets);
    assert.deepEqual(plain(H.finishStroke(stroke)), {type: action, entityId: 'coop', animalIds: ['animal_a', 'animal_b']});
  }
});

test('P04 skipped visible animals do not accidentally become whole-shelter actions', () => {
  const stroke = H.createStroke({action: 'feed', entityId: 'coop'}, {x: -1, y: 4});
  H.extendStroke(stroke, {x: 30, y: 4}, [rect('animal_other', 10, 0, 'other_coop')]);
  assert.equal(H.finishStroke(stroke), null);
});

test('P05 recipe drag cannot enqueue a different machine and only returns its real recipe/owner', () => {
  const wrong = H.createStroke({action: 'enqueue', entityId: 'bakery_1', recipeId: 'bread'}, {x: -1, y: 4});
  H.extendStroke(wrong, {x: 20, y: 4}, [rect('bakery_2', 0)]);
  assert.equal(H.finishStroke(wrong), null);
  const own = H.createStroke({action: 'enqueue', entityId: 'bakery_1', recipeId: 'bread'}, {x: -1, y: 4});
  H.extendStroke(own, {x: 20, y: 4}, [rect('bakery_1', 0)]);
  assert.deepEqual(plain(H.finishStroke(own)), {type: 'enqueue', entityId: 'bakery_1', recipeId: 'bread'});
});

test('finishing a valid stroke is one-shot, including after a second pointerup or further pointermove', () => {
  const targets = [rect('field_1', 0), rect('field_2', 10)];
  const stroke = H.createStroke({action: 'plant', itemId: 'wheat'}, {x: -1, y: 4});
  H.extendStroke(stroke, {x: 9, y: 4}, targets);
  assert.deepEqual(plain(H.finishStroke(stroke)), {type: 'plant', itemId: 'wheat', entityIds: ['field_1']});
  assert.equal(H.finishStroke(stroke), null);
  H.extendStroke(stroke, {x: 20, y: 4}, targets);
  assert.equal(H.finishStroke(stroke), null);
});

test('tool and start-point snapshots cannot be changed behind an in-progress gesture', () => {
  const tool = {action: 'plant', itemId: 'wheat'}, point = {x: -1, y: 4};
  const stroke = H.createStroke(tool, point);
  tool.itemId = 'corn';
  point.y = 100;
  H.extendStroke(stroke, {x: 9, y: 4}, [rect('field_1', 0)]);
  assert.deepEqual(plain(H.finishStroke(stroke)), {type: 'plant', itemId: 'wheat', entityIds: ['field_1']});
});

test('every interrupted gesture cancels the entire pending stroke and cannot consume resources later', () => {
  const reasons = ['second-pointer', 'pointercancel', 'blur', 'visibility', 'resize', 'navigation', 'tool-switch', 'ui-entry', 'edit-mode', 'escape'];
  for (const reason of reasons) {
    let state = createFarm(0);
    const before = structuredClone(state), targets = [rect('field_1', 0), rect('field_2', 10)];
    const stroke = H.createStroke({action: 'plant', itemId: 'wheat'}, {x: -1, y: 4});
    H.extendStroke(stroke, {x: 20, y: 4}, targets);
    H.cancelStroke(stroke, reason);
    H.extendStroke(stroke, {x: -1, y: 4}, targets);
    const command = H.finishStroke(stroke);
    if (command) state = executeFarm(state, command, state.now).state;
    assert.equal(command, null, reason);
    assert.deepEqual(state, before, reason);
  }
});

test('completed plant helper command integrates with original core as one deduplicated immutable transaction', () => {
  const state = createFarm(0), before = structuredClone(state), stroke = H.createStroke({action: 'plant', itemId: 'wheat'}, {x: -1, y: 4});
  const targets = [rect('field_1', 0), rect('field_2', 10)];
  H.extendStroke(stroke, {x: 20, y: 4}, targets);
  H.extendStroke(stroke, {x: -1, y: 4}, targets);
  const command = H.finishStroke(stroke), result = executeFarm(state, plain(command), state.now);
  assert.deepEqual(state, before);
  assert.equal(result.delta.events.length, 2);
  assert.equal(result.state.inventory.wheat, state.inventory.wheat - 2);
  assert.equal(result.state.revision, state.revision + 1);
  assert.equal(H.finishStroke(stroke), null);
});

test('completed animal helper command integrates with original core without feeding unbrushed animals', () => {
  const state = createFarm(0), shelter = state.entities.find(e => e.id === 'shelter_chicken_1');
  const targets = shelter.animals.map((a, i) => rect(a.id, i * 10, 0, shelter.id));
  const stroke = H.createStroke({action: 'feed', entityId: shelter.id}, {x: -1, y: 4});
  H.extendStroke(stroke, {x: 19, y: 4}, targets);
  const result = executeFarm(state, plain(H.finishStroke(stroke)), state.now);
  assert.equal(result.delta.events.length, 2);
  assert.equal(result.state.inventory.chicken_feed, 1);
  assert.deepEqual(result.state.entities.find(e => e.id === shelter.id).animals.map(a => a.status), ['producing', 'producing', 'hungry']);
});

test('P12 exact dynamite preview equals the actual original-core removed entity set', () => {
  const state = createFarm(0);
  state.inventory.dynamite = 1;
  const selected = state.entities.find(e => e.id === 'rock_1');
  const ids = plain(H.obstacleTargets(state, selected, 'dynamite'));
  assert.ok(ids.includes(selected.id));
  assert.ok(ids.length >= 1 && ids.length <= 2);
  const result = executeFarm(state, {type: 'clearObstacle', entityIds: ids, toolId: 'dynamite', confirmed: true}, state.now);
  const remaining = new Set(result.state.entities.map(e => e.id));
  assert.deepEqual(state.entities.filter(e => !remaining.has(e.id)).map(e => e.id).sort(), [...ids].sort());
  assert.equal(result.state.inventory.dynamite, 0);
});

test('scene economic previews use the original core but never mutate current chapter state', () => {
  const state = createFarm(0), before = structuredClone(state), ctx = {state, core: {executeFarm}};
  const preview = H.commandPreview(ctx, {type: 'plant', itemId: 'wheat', entityIds: ['field_1', 'field_2']});
  assert.equal(preview.ok, true);
  assert.equal(preview.result.state.inventory.wheat, state.inventory.wheat - 2);
  assert.deepEqual(state, before);
  const invalid = H.commandPreview(ctx, {type: 'buy', category: 'machine', itemId: 'bakery', x: 20, y: 20});
  assert.equal(invalid.ok, false);
  assert.deepEqual(state, before);
});

test('world objects never infer an economic tool from a bare drag',async()=>{
 const C=await import('../farm-config.mjs'),state=createFarm(0),field=state.entities.find(e=>e.kind==='field'),shelter=state.entities.find(e=>e.kind==='shelter');
 for(const e of [field,{...field,crop:{itemId:'wheat',readyAt:0}},shelter,{id:'tree',kind:'fruit',configId:'apple',status:'ready'}])for(const editing of [false,true])assert.equal(H.directWorldTool(e,shelter.animals[0].id,'wheat',state,C,editing),null);
});
test('crop quick harvest requires the same mature field within the double-tap interval',()=>{
 const e={id:'field_1',kind:'field',crop:{itemId:'wheat',readyAt:100}};
 assert.equal(H.cropDoubleTapCommand(e,null,200,100),null);assert.equal(H.cropDoubleTapCommand(null,null,200,100),null);
 for(const [last,at,now,editing] of [[{id:'other',at:100},200,100,false],[{id:e.id,at:100},451,100,false],[{id:e.id,at:100},99,100,false],[{id:e.id,at:100},200,99,false],[{id:e.id,at:100},200,100,true]])assert.equal(H.cropDoubleTapCommand(e,last,at,now,editing),null);
 assert.deepEqual(H.cropDoubleTapCommand(e,{id:e.id,at:100},450,100),{type:'harvest',entityIds:[e.id]});
});

test('factory product sweep collects exact job IDs once from its own machine',()=>{
 const s=H.createStroke({action:'collectMachine',entityId:'bakery'}, {x:0,y:4});const targets=[rect('j1',0,0,'bakery'),rect('other',10,0,'dairy'),rect('j2',20,0,'bakery'),rect('j1',30,0,'bakery')];
 H.extendStroke(s,{x:40,y:4},targets);H.extendStroke(s,{x:0,y:4},targets);
 assert.deepEqual(H.finishStroke(s),{type:'collectMachine',entityId:'bakery',jobIds:['j1','j2']});assert.equal(H.finishStroke(s),null);
});
