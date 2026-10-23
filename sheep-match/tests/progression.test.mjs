import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreProgress, recordWin, levelWindow, resumeLevel } from '../progression.mjs';

test('each cleared stage unlocks the next, including beyond the original third stage',()=>{
  const progress=restoreProgress(null);
  for(let level=0;level<1000;level++) {
    const game={level,mode:'classic',status:'won'};
    assert.equal(progress.unlocked,level);
    assert.ok(recordWin(progress,game));
    assert.equal(progress.unlocked,level+1);
    assert.equal(progress.highestCleared,level);
    assert.equal(progress.wins,level+1);
    assert.equal(recordWin(progress,game),false);
    assert.deepEqual(restoreProgress(progress),progress);
  }
});
test('daily wins and replaying old stages do not move the frontier',()=>{
  const progress=restoreProgress({unlocked:50,highestCleared:49,wins:50});
  recordWin(progress,{mode:'daily',level:999,status:'won'});
  recordWin(progress,{mode:'classic',level:2,status:'won'});
  assert.equal(progress.unlocked,50); assert.equal(progress.highestCleared,49); assert.equal(progress.wins,52);
  assert.equal(recordWin(progress,{mode:'classic',level:50,status:'lost'}),false);
  assert.equal(recordWin(progress,{mode:'classic',level:50,status:'playing'}),false);
});
test('migrate old completion lists and recover frontier from current saved stage',()=>{
  assert.deepEqual(restoreProgress({wins:4,completed:[0,1,2]}),{wins:4,highestCleared:2,unlocked:3});
  assert.equal(restoreProgress(null,{mode:'classic',level:50,status:'playing'}).unlocked,50);
  assert.equal(restoreProgress(null,{mode:'classic',level:50,status:'won'}).unlocked,51);
  assert.equal(restoreProgress(null,{mode:'daily',level:50,status:'won'}).unlocked,0);
  assert.equal(restoreProgress({unlocked:-1,highestCleared:Infinity,wins:NaN}).unlocked,0);
});
test('level window moves forward forever; continuing returns to the current frontier',()=>{
  assert.deepEqual(levelWindow(0),[0,1,2]);
  assert.deepEqual(levelWindow(3),[2,3,4]);
  assert.deepEqual(levelWindow(1000),[999,1000,1001]);
  const progress=restoreProgress({unlocked:10});
  assert.equal(resumeLevel(progress,{mode:'classic',level:2,status:'playing'}),10);
  assert.equal(resumeLevel(progress,{mode:'classic',level:10,status:'playing'}),10);
  assert.equal(resumeLevel(progress,{mode:'classic',level:9,status:'won'}),10);
});
