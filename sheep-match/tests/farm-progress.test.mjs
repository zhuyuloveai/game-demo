import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FARM_SEASONS,farmProgress,farmReward,farmPage,farmTheme} from '../farm-progress.mjs';
import {restoreProgress,recordWin} from '../progression.mjs';

test('the empty farm gains one gift every four first-time campaign wins',()=>{
  const stats=restoreProgress(null);
  assert.equal(farmProgress(stats).rewards,0);
  assert.equal(farmProgress(stats).remaining,4);
  for(let level=0;level<1000;level++){
    recordWin(stats,{level,mode:'classic',status:'won'});
    const progress=farmProgress(stats);
    assert.equal(progress.cleared,level+1);
    assert.equal(progress.rewards,Math.floor((level+1)/4));
    assert.equal(progress.nextAt,4*(Math.floor((level+1)/4)+1));
    assert.equal(progress.remaining,progress.nextAt-progress.cleared);
    assert.equal(progress.latest,Math.floor((level+1)/24));
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

test('the 24th, 48th, 72nd and 96th clears immediately unlock the next empty season',()=>{
  for(const [clears,index,key] of [[24,1,'summer'],[48,2,'autumn'],[72,3,'winter'],[96,4,'spring']]){
    const before=farmProgress({highestCleared:clears-2});
    assert.equal(before.latest,index-1);
    assert.deepEqual(farmPage(before),{index:index-1,filled:5,unlocked:true,unlockAt:clears-24});

    const unlocked=farmProgress({highestCleared:clears-1});
    assert.equal(unlocked.latest,index);
    assert.equal(unlocked.farms,index+1);
    assert.equal(unlocked.rewards,clears/4);
    assert.equal(unlocked.nextAt,clears+4);
    assert.deepEqual(farmPage(unlocked),{index,filled:0,unlocked:true,unlockAt:clears});
    assert.equal(farmTheme(index).key,key);
    assert.deepEqual(farmPage(unlocked,index-1),{index:index-1,filled:6,unlocked:true,unlockAt:clears-24});

    for(let extra=1;extra<=3;extra++){
      const waiting=farmProgress({highestCleared:clears+extra-1});
      assert.equal(waiting.rewards,unlocked.rewards);
      assert.equal(farmPage(waiting).filled,0);
    }
    const firstGift=farmProgress({highestCleared:clears+3});
    assert.deepEqual(farmPage(firstGift),{index,filled:1,unlocked:true,unlockAt:clears});
  }
});

test('the final gift stays with its completed season and the following gift belongs to the next',()=>{
  for(const [number,farm,step,key] of [
    [1,0,1,'spring'],[6,0,6,'spring'],[7,1,1,'summer'],
    [12,1,6,'summer'],[13,2,1,'autumn'],[18,2,6,'autumn'],
    [19,3,1,'winter'],[24,3,6,'winter'],[25,4,1,'spring'],[30,4,6,'spring'],
  ]){
    const reward=farmReward(number);
    const theme=FARM_SEASONS.find(s=>s.key===key);
    assert.deepEqual(reward,{...theme.rewards[step-1],number,level:number*4,farm,step});
    const before=farmProgress({highestCleared:number*4-2});
    const after=farmProgress({highestCleared:number*4-1});
    assert.equal(before.rewards,number-1);
    assert.equal(after.rewards,number);
    assert.equal(farmPage(after,farm).filled,step);
  }
});

test('locked seasons in the current year can be previewed without awarding decorations',()=>{
  const stats=Object.freeze({highestCleared:3,wins:1});
  const progress=Object.freeze(farmProgress(stats));
  const before={...progress};
  assert.deepEqual(farmPage(progress,0),{index:0,filled:1,unlocked:true,unlockAt:0});
  for(const index of [1,2,3]){
    assert.deepEqual(farmPage(progress,index),{index,filled:0,unlocked:false,unlockAt:index*24});
    assert.equal(farmTheme(index).key,['spring','summer','autumn','winter'][index]);
  }
  assert.deepEqual(farmPage(progress,99),{index:3,filled:0,unlocked:false,unlockAt:72});
  assert.deepEqual(progress,before);
  assert.deepEqual(farmProgress(stats),before);
  assert.equal(progress.rewards,1);
  assert.equal(progress.nextAt,8);
});

test('completed seasons remain available when a new year opens and starts receiving gifts',()=>{
  for(const [clears,latest] of [[96,4],[100,4],[192,8],[196,8]]){
    const progress=farmProgress({highestCleared:clears-1});
    assert.equal(progress.latest,latest);
    assert.equal(farmTheme(latest).key,'spring');
    assert.deepEqual(farmPage(progress),{index:latest,filled:clears%96/4,unlocked:true,unlockAt:latest*24});
    for(let index=0;index<latest;index++){
      assert.deepEqual(farmPage(progress,index),{index,filled:6,unlocked:true,unlockAt:index*24});
      assert.equal(farmTheme(index).key,['spring','summer','autumn','winter'][index%4]);
    }
    for(let index=latest+1;index<=latest+3;index++){
      assert.deepEqual(farmPage(progress,index),{index,filled:0,unlocked:false,unlockAt:index*24});
    }
    assert.equal(farmPage(progress,999).index,latest+3);
    assert.equal(farmPage(progress,-1).index,0);
    for(const invalid of [NaN,Infinity,1.5,'2',null])assert.deepEqual(farmPage(progress,invalid),farmPage(progress));
  }
});

test('existing completion records restore decorations, without trusting raw win totals',()=>{
  const old=restoreProgress({wins:999,completed:[0,1,2,3,4,5,6,7]});
  assert.equal(farmProgress(old).rewards,2);
  assert.equal(farmProgress({wins:999}).rewards,0);
  for(const bad of [null,{}, {highestCleared:-1},{highestCleared:NaN},{highestCleared:Infinity},{highestCleared:1.5},{highestCleared:'23'}]){
    assert.equal(farmProgress(bad).rewards,0);
  }
  for(const invalid of [0,-1,NaN,Infinity,1.5,'1',null,undefined])assert.equal(farmReward(invalid),null);
});

test('all four seasons have complete unlock layouts and distinct real image assets',()=>{
  const spriteKeys=['tree','grass','star','cloud','sun','pond','sheep','duck','house','fence','flowers','chick'];
  const motions=['','sway','cloud','sun','star','walk','float','chick'];
  const backgroundHashes=new Set(),stickerHashes=new Set();
  assert.deepEqual(FARM_SEASONS.map(s=>s.key),['spring','summer','autumn','winter']);
  assert.equal(new Set(FARM_SEASONS.map(s=>s.background)).size,4);
  assert.equal(new Set(FARM_SEASONS.map(s=>s.stickers)).size,4);
  assert.equal(new Set(FARM_SEASONS.map(s=>JSON.stringify(s.groups))).size,4);

  for(const theme of FARM_SEASONS){
    assert.ok(theme.name.trim()&&theme.subtitle.trim(),theme.key);
    assert.equal(theme.groups.length,6,theme.key);
    assert.equal(theme.rewards.length,6,theme.key);
    assert.ok(theme.natural.length>0,theme.key);
    for(const group of theme.groups)assert.ok(group.parts.length>0,theme.key);
    for(const part of [...theme.natural,...theme.groups.flatMap(g=>g.parts)]){
      assert.equal(part.length,7,theme.key);
      const [key,x,y,width,motion,delay,z]=part;
      assert.ok(spriteKeys.includes(key),`${theme.key}: ${key}`);
      assert.ok([x,y,width,delay,z].every(Number.isFinite),theme.key);
      assert.ok(width>0&&delay<=0,theme.key);
      assert.ok(motions.includes(motion),`${theme.key}: ${motion}`);
    }
    for(const reward of theme.rewards){
      for(const field of ['name','short','heading','description','claim','toast']){
        assert.ok(typeof reward[field]==='string'&&reward[field].trim(),`${theme.key}: ${field}`);
      }
      assert.ok(spriteKeys.includes(reward.icon),theme.key);
    }

    let stickerSize;
    for(const [field,hashes] of [['background',backgroundHashes],['stickers',stickerHashes]]){
      const bytes=readFileSync(new URL(`../assets/farm/${theme[field]}`,import.meta.url));
      assert.deepEqual(bytes.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]),`${theme.key}: ${field} is PNG`);
      const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
      assert.ok(width>0&&height>0,theme.key);
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
      if(field==='stickers'){
        stickerSize={width,height};
        assert.ok([4,6].includes(bytes[25]),`${theme.key}: stickers retain an alpha channel`);
      }
    }
    if(!theme.atlas)assert.equal(stickerSize.width*3,stickerSize.height*4,`${theme.key}: square 4 by 3 sprite cells`);
    for(const atlas of [theme.atlas,theme.previewAtlas].filter(Boolean)){
      assert.equal(atlas.width,stickerSize.width,theme.key);
      assert.equal(atlas.height,stickerSize.height,theme.key);
      assert.deepEqual(Object.keys(atlas.frames).sort(),[...spriteKeys].sort(),theme.key);
      for(const [key,frame] of Object.entries(atlas.frames)){
        assert.equal(frame.length,4,`${theme.key}: ${key}`);
        assert.ok(frame.every(Number.isSafeInteger),`${theme.key}: ${key}`);
        const [x,y,width,height]=frame;
        assert.ok(x>=0&&y>=0&&width>0&&height>0&&x+width<=atlas.width&&y+height<=atlas.height,`${theme.key}: ${key} stays inside its atlas`);
      }
    }
  }
  assert.equal(backgroundHashes.size,4,'each season uses different background image data');
  assert.equal(stickerHashes.size,4,'each season uses different sticker image data');
});
