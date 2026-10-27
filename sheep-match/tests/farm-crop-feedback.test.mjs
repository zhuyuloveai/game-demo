import test from 'node:test';
import assert from 'node:assert/strict';
import {committedCropFeedback} from '../farm-scene-host.mjs';
const before={entities:[{id:'a',kind:'field',crop:{itemId:'wheat'}},{id:'b',kind:'field',crop:{itemId:'corn'}},{id:'tree',kind:'fruit',configId:'apple'}]};
test('crop feedback requires durable success and successful per-target events',()=>{
 const command={type:'harvest',entityIds:['a','b']};
 for(const result of [{ok:false,delta:{events:[{id:'a',ok:true}]}},{ok:true,delta:{events:[]}},{ok:true,delta:{events:[{id:'a',ok:false}]}},{ok:true}])assert.deepEqual(committedCropFeedback(before,command,result),[]);
 assert.deepEqual(committedCropFeedback(before,command,{ok:true,delta:{events:[{id:'b',ok:true}]},skipped:[{id:'a'}]}),[{entityId:'b',itemId:'corn',action:'harvest'}]);
});
test('harvest identity comes from precommit crop; sow uses actual requested seed and excludes other entities',()=>{
 const result={ok:true,delta:{events:[{id:'a',ok:true},{id:'tree',ok:true},{id:'missing',ok:true}]}};
 assert.deepEqual(committedCropFeedback(before,{type:'harvest'},result),[{entityId:'a',itemId:'wheat',action:'harvest'},{entityId:'tree',itemId:'apple',action:'harvest'}]);
 assert.deepEqual(committedCropFeedback(before,{type:'plant',itemId:'carrot'},result),[{entityId:'a',itemId:'carrot',action:'plant'}]);
 assert.deepEqual(committedCropFeedback(before,{type:'feed',itemId:'carrot'},result),[]);
});

test('explicit chicken effects follow successful animal events and configured product only',async()=>{
 const {committedAnimalFeedback}=await import('../farm-scene-host.mjs');
 const state={entities:[{id:'pen',kind:'shelter',configId:'chicken',animals:[{id:'hen'}]}]},command={type:'collectAnimal',entityId:'pen',animalIds:['hen']};
 assert.deepEqual(committedAnimalFeedback(state,command,{ok:true,delta:{events:[{id:'hen',ok:true},{id:'other',ok:true}]}}),[{entityId:'hen',itemId:'egg',action:'collectAnimal'}]);
 assert.deepEqual(committedAnimalFeedback(state,command,{ok:false,delta:{events:[{id:'hen',ok:true}]}}),[]);
 assert.deepEqual(committedAnimalFeedback(state,command,{ok:true,delta:{events:[]},skipped:[{id:'hen'}]}),[]);
});

test('machine collection feedback uses successful completed job outputs, not recipe or command item',async()=>{
 const {committedMachineFeedback}=await import('../farm-scene-host.mjs');
 const state={entities:[{id:'machine',kind:'machine',completed:[{id:'done',recipeId:'irrelevant',outputs:{bread:2,cream:1}},{id:'blocked',outputs:{sugar:1}}]}]},command={type:'collectMachine',entityId:'machine',jobIds:['done','blocked'],itemId:'wrong'};
 assert.deepEqual(committedMachineFeedback(state,command,{ok:true,delta:{events:[{id:'done',ok:true},{id:'missing',ok:true},{id:'blocked',ok:false}]}}),[{entityId:'done',itemId:'bread',action:'collectMachine'},{entityId:'done',itemId:'cream',action:'collectMachine'}]);
 for(const result of [{ok:false,delta:{events:[{id:'done',ok:true}]}},{ok:true,delta:{events:[]}}])assert.deepEqual(committedMachineFeedback(state,command,result),[]);
});

test('batched feedback resolves each source by animal or job ID, not first selected object',async()=>{
 const {feedbackSourceElement}=await import('../farm-scene-host.mjs');
 const a={name:'first'},b={name:'second'},fallback={name:'single'};
 assert.equal(feedbackSourceElement({sourceElementsById:{a,b}},'a'),a);
 assert.equal(feedbackSourceElement({sourceElementsById:{a,b}},'b'),b);
 assert.equal(feedbackSourceElement({sourceElementsById:{a,b}},'missing'),null);
 assert.equal(feedbackSourceElement({sourceElementsById:new Map([['b',b]])},'b'),b);
 assert.equal(feedbackSourceElement({sourceElements:{a,b}},'b'),b);
 assert.equal(feedbackSourceElement({sourceElement:fallback},'a'),fallback);
});
