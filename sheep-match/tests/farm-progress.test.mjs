import test from 'node:test';
import assert from 'node:assert/strict';
import {farmProgress,farmReward,farmPage} from '../farm-progress.mjs';
import {restoreProgress,recordWin} from '../progression.mjs';

test('the empty farm gains one gift every four first-time campaign wins',()=>{
  const stats=restoreProgress(null);
  assert.equal(farmProgress(stats).rewards,0);
  assert.equal(farmProgress(stats).remaining,4);
  for(let level=0;level<1000;level++){
    recordWin(stats,{level,mode:'classic',status:'won'});
    const progress=farmProgress(stats);
    assert.equal(progress.rewards,Math.floor((level+1)/4));
    assert.equal(progress.nextAt,4*(Math.floor((level+1)/4)+1));
    assert.ok(progress.remaining>=1&&progress.remaining<=4);
  }
});

test('repeat wins and daily challenges cannot mint extra farm rewards',()=>{
  const stats=restoreProgress({highestCleared:7,unlocked:8,wins:8});
  const before=farmProgress(stats);
  for(let n=0;n<30;n++){
    recordWin(stats,{level:3,mode:'classic',status:'won'});
    recordWin(stats,{level:999,mode:'daily',status:'won'});
  }
  assert.deepEqual(farmProgress(stats),before);
  recordWin(stats,{level:8,mode:'classic',status:'playing'});
  assert.deepEqual(farmProgress(stats),before);
});

test('after twenty-four clears, new gifts build another farm without losing the first',()=>{
  const full=farmProgress({highestCleared:23});
  assert.deepEqual(farmPage(full),{index:0,filled:6});
  assert.equal(full.farms,1);
  assert.equal(full.nextAt,28);
  const expanded=farmProgress({highestCleared:27});
  assert.equal(expanded.farms,2);
  assert.deepEqual(farmPage(expanded),{index:1,filled:1});
  assert.deepEqual(farmPage(expanded,0),{index:0,filled:6});
  assert.deepEqual(farmPage(expanded,99),{index:1,filled:1});
  assert.equal(farmReward(7).level,28);
  assert.equal(farmReward(7).farm,1);
  assert.equal(farmReward(7).step,1);
  assert.equal(farmReward(6).icon,'chick');
});

test('existing completion records restore decorations, without trusting raw win totals',()=>{
  const old=restoreProgress({wins:999,completed:[0,1,2,3,4,5,6,7]});
  assert.equal(farmProgress(old).rewards,2);
  assert.equal(farmProgress({wins:999}).rewards,0);
  for(const bad of [null,{}, {highestCleared:-1},{highestCleared:NaN}]){
    assert.equal(farmProgress(bad).rewards,0);
  }
  assert.equal(farmReward(0),null);
  assert.equal(farmReward(-1),null);
});
