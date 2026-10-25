import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {farmAnimalVisual} from '../farm-visuals.mjs';
import {farmAnimalClip} from '../farm-assets.mjs';

const species=['chicken','cow','pig','sheep','lamb'];
const walking=Object.freeze({walking:true,elapsed:500});
const animal=(configId,status)=>Object.freeze({id:`${configId}-1`,configId,status,readyAt:9000});

test('optional wandering changes only visual frames, not hunger/production status or animal data',()=>{
  for(const configId of species)for(const status of ['hungry','producing']){
    const subject=animal(configId,status),before=structuredClone(subject);
    for(const [rotation,direction] of [[0,'front'],[90,'right'],[180,'back'],[270,'side']]){
      const visual=farmAnimalVisual(subject,{time:5000,rotation,activity:walking});
      const clip=farmAnimalClip(configId,'walk',direction);
      assert.equal(visual.state,'walk');
      assert.equal(visual.semanticState,status==='hungry'?'idle':'producing');
      assert.equal(visual.direction,direction);
      assert.equal(visual.frame,Math.floor(walking.elapsed*clip.fps/1000)%clip.urls.length);
      assert.equal(visual.src,clip.urls[visual.frame]);
      assert(existsSync(new URL(visual.src)),`${configId} walking frame is packaged locally`);
    }
    assert.deepEqual(subject,before);
  }
});

test('ready animals never wander away from their collection state',()=>{
  for(const configId of species)for(const rotation of [0,90,180,270]){
    const subject=animal(configId,'ready');
    assert.deepEqual(farmAnimalVisual(subject,{time:4750,rotation,activity:walking}),farmAnimalVisual(subject,{time:4750,rotation}));
    assert.equal(farmAnimalVisual(subject,{time:4750,activity:walking}).semanticState,'ready');
  }
});

test('successful feeding and collection animation take precedence over background wandering',()=>{
  for(const configId of species)for(const state of ['eat','collect']){
    const subject=animal(configId,state==='eat'?'producing':'hungry');
    const transient=Object.freeze({state,start:1000,until:state==='eat'?4000:1500});
    for(const time of [transient.start,transient.until-1]){
      const options={time,rotation:90,transient};
      const visual=farmAnimalVisual(subject,{...options,activity:walking});
      assert.deepEqual(visual,farmAnimalVisual(subject,options));
      assert.equal(visual.state,state);
    }
    for(const time of [transient.start-1,transient.until]){
      assert.equal(farmAnimalVisual(subject,{time,transient,activity:walking}).state,'walk');
    }
  }
});

test('reduced motion overrides wandering, direction and transient frames but preserves real status',()=>{
  for(const configId of species)for(const status of ['hungry','producing','ready']){
    const subject=animal(configId,status),expected=farmAnimalVisual(subject,{reducedMotion:true});
    for(const rotation of [0,90,180,270])for(const state of ['eat','collect']){
      const visual=farmAnimalVisual(subject,{time:1250,rotation,reducedMotion:true,activity:walking,transient:{state,start:1000,until:4000}});
      assert.deepEqual(visual,expected);
      assert.equal(visual.state,'idle');assert.equal(visual.frame,0);
      assert.equal(visual.direction,'front');assert.equal(visual.mirror,false);
      assert.equal(visual.semanticState,status==='hungry'?'idle':status);
    }
  }
});

test('rest intervals resume the original idle or production clip without changing its clock',()=>{
  for(const configId of species)for(const status of ['hungry','producing','ready']){
    const subject=animal(configId,status);
    for(const time of [0,250,1000,50000]){
      assert.deepEqual(farmAnimalVisual(subject,{time,activity:{walking:false,elapsed:999}}),farmAnimalVisual(subject,{time}));
    }
  }
});
