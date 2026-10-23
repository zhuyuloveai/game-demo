import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORIES} from '../story-data.mjs';
import {collectedStories,restoreStoryProgress,acknowledgeStory,acknowledgeCompletion,arrivalStory,completionStory} from '../story-progress.mjs';
import {recordWin,restoreProgress} from '../progression.mjs';
const stats=cleared=>({highestCleared:cleared-1,unlocked:cleared});

test('eight approved stories are collected only through first-time campaign milestones',()=>{
  for(const [cleared,count] of [[0,1],[23,1],[24,3],[47,3],[48,5],[71,5],[72,7],[95,7],[96,8],[192,8],[10000,8]])assert.equal(collectedStories(stats(cleared)).length,count);
  assert.equal(collectedStories({wins:999,unlocked:999}).length,1);
  const progress=restoreProgress(stats(23));
  for(let i=0;i<5;i++){
    recordWin(progress,{level:22,mode:'classic',status:'won'});
    recordWin(progress,{level:999,mode:'daily',status:'won'});
  }
  assert.equal(collectedStories(progress).length,1);
  recordWin(progress,{level:23,mode:'classic',status:'won'});
  assert.equal(collectedStories(progress).length,3);
});

test('first arrival plays once, while locked previews and later years never autoplay it',()=>{
  let state=restoreStoryProgress(null,stats(0));
  assert.equal(arrivalStory(state,stats(0),0).id,STORIES[0].id);
  for(const page of [-1,1,2,3,4,8,NaN,null,'0'])assert.equal(arrivalStory(state,stats(0),page),null);
  state=acknowledgeStory(state,STORIES[0].id,stats(0));
  state=restoreStoryProgress(JSON.parse(JSON.stringify(state)),stats(0));
  assert.equal(arrivalStory(state,stats(0),0),null);
  assert.equal(arrivalStory(state,stats(24),1).id,STORIES[2].id);
  assert.equal(arrivalStory(state,stats(192),4),null);
});

test('completions wait for decoration acknowledgement and next-season arrival stays separate',()=>{
  for(let season=0;season<4;season++){
    const cleared=(season+1)*24,progress=stats(cleared);
    let state=restoreStoryProgress(null,stats(cleared-1),{legacy:true});
    assert.equal(completionStory(state,progress,cleared/4-1),null);
    const completion=completionStory(state,progress,cleared/4);
    assert.equal(completion.id,STORIES[season*2+1].id);
    state=acknowledgeCompletion(state,completion.id,progress);
    assert.equal(completionStory(state,progress,cleared/4),null);
    assert.equal(arrivalStory(state,progress,season),null);
    if(season<3)assert.equal(arrivalStory(state,progress,season+1).id,STORIES[(season+1)*2].id);
  }
});

test('legacy players quietly receive eligible pages without autoplay and retain future arrivals',()=>{
  for(const cleared of [0,23,24,48,72,96,192]){
    const progress=stats(cleared),state=restoreStoryProgress(null,progress,{legacy:true});
    assert.equal(state.acknowledged.length,collectedStories(progress).length);
    assert.equal(completionStory(state,progress,Math.floor(cleared/4)),null);
    for(let page=0;page<8;page++)assert.equal(arrivalStory(state,progress,page),null);
  }
  const state=restoreStoryProgress(null,stats(23),{legacy:true});
  assert.equal(completionStory(state,stats(24),6).id,STORIES[1].id);
});

test('missing fields and malformed acknowledgement cannot unlock pages or crash restoration',()=>{
  const all=STORIES.map(s=>s.id);
  for(const raw of [null,{}, {version:1}, {version:1,acknowledged:'all'}, {version:0,acknowledged:all}])assert.deepEqual(restoreStoryProgress(raw,stats(0)),{version:1,acknowledged:[]});
  const restored=restoreStoryProgress({version:1,acknowledged:[...all,...all,null,'unknown']},stats(24));
  assert.deepEqual(restored.acknowledged,all.slice(0,3));
  assert.deepEqual(acknowledgeStory(restored,STORIES[7].id,stats(24)),restored);
  assert.deepEqual(acknowledgeCompletion(restored,STORIES[7].id,stats(24)),restored);
  for(const invalid of [NaN,Infinity,null,'24',-1,2.5])assert.equal(completionStory(restored,stats(96),invalid),null);
});

test('playing through several seasons never creates a backlog of forced completion movies',()=>{
  let state=restoreStoryProgress(null,stats(0));
  const progress=stats(72),latest=completionStory(state,progress,18);
  assert.equal(latest.id,STORIES[5].id);
  state=acknowledgeCompletion(state,latest.id,progress);
  assert.equal(completionStory(state,progress,18),null);
  assert.equal(arrivalStory(state,progress,3).id,STORIES[6].id);
});

test('every chapter ships its own artwork and three approved lines',()=>{
  assert.equal(STORIES.length,8);
  assert.equal(new Set(STORIES.map(s=>s.id)).size,8);
  for(const story of STORIES){
    assert.equal(story.lines.length,3);
    assert.ok(story.lines.every(line=>typeof line==='string'&&line.length>0));
    const image=readFileSync(new URL(`../assets/story/${story.id}.webp`,import.meta.url));
    assert.equal(image.subarray(0,4).toString(),'RIFF');
    assert.equal(image.subarray(8,12).toString(),'WEBP');
  }
  assert.equal(STORIES.at(-1).lines.at(-1),'我本来要写点什么。先吃饭吧。');
});
