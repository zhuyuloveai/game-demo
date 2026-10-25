import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,restore,pick,verifySolution,getGameConfig} from '../engine.mjs';
import {FARM_STAGES,startFarmStage,actFarmStage} from '../farm-linkage.mjs';
import {FARM_STAGE_LAYOUTS} from '../farm-stage-layouts.mjs';
for(const [index,stage] of FARM_STAGES.entries())test(`${stage.stageId}: all certified boards replay and restore`,()=>{
  for(const seed of FARM_STAGE_LAYOUTS[index].seeds){
    const game=createGame(index,seed,'farm');
    assert.equal(game.total,stage.tileCount);assert.equal(getGameConfig(game).layers.length,stage.layers);
    assert.equal(new Set(game.board.map(t=>t.type)).size,stage.types);
    assert(verifySolution(game.board,game.solution));assert(restore(game));
    for(const id of game.solution)assert(pick(game,id).ok);
    assert.equal(game.status,'won');assert(restore(game));
  }
});
test('farm branch cannot open before harvest or skip ahead; free tools persist with board',()=>{
  const state={branch:{unlocked:false,stages:{},active:null}};
  assert.throws(()=>startFarmStage(state,'F01'),{code:'LEVEL_LOCKED'});
  state.branch.unlocked=true;assert.throws(()=>startFarmStage(state,'F02'),{code:'LEVEL_LOCKED'});
  let {game}=startFarmStage(state,'F01');const before=structuredClone(game);
  actFarmStage(state,'pick',{tileId:game.board[0].id});actFarmStage(state,'undo');
  assert.deepEqual(game.board,before.board);assert.equal(game.tools.undo,2);
  const resumed=startFarmStage(state,'F01').game;assert.equal(resumed.tools.undo,2);
});
test('campaign curve and mode remain distinct from farm branches',()=>{
  const main=createGame(0,'main'),farm=createGame(0,'farm','farm');
  assert.equal(main.total,18);assert.equal(farm.total,24);
  assert.equal(restore({...farm,mode:'classic'}),null);assert.equal(restore({...main,mode:'farm'}),null);
});
