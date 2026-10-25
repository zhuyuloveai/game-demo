import {createGame,pick,undo,stash,shuffle,restore} from './engine.mjs';
import {FARM_STAGES} from './farm-stage-data.mjs';
import {FARM_STAGE_LAYOUTS} from './farm-stage-layouts.mjs';
export {FARM_STAGES};
const fail=(code,message)=> {
  throw Object.assign(new Error(message),{ code });
} ;
export function startFarmStage(state,stageId,seed) {
  if(!state.branch?.unlocked) fail('LEVEL_LOCKED','第一次收获后开启牧场故事');
  const index=FARM_STAGES.findIndex(s=>s.stageId===stageId);
  if(index<0) fail('LEVEL_LOCKED','没有这个牧场关卡');
  if(index && !state.branch.stages[FARM_STAGES[index-1].stageId]?.won) fail('LEVEL_LOCKED','先通过上一关牧场故事');
  if(state.branch.active?.level===index && state.branch.active.status==='playing' && !seed) return { game:state.branch.active, stageId };
  const attempt=(state.branch.attempts?.[stageId]||0);
  state.branch.attempts??={ };
  state.branch.attempts[stageId]=attempt+1;
  const game=createGame(index,seed||FARM_STAGE_LAYOUTS[index].seeds[attempt%3],'farm');
  delete game.solution;
  state.branch.active=game;
  return { game, stageId };
}
export function actFarmStage(state,action,options={ }) {
  const game=state.branch?.active;
  if(!game || !restore(game)) fail('NOT_READY','请先打开一关牧场故事');
  let result;
  if(action==='pick') result=pick(game,options.tileId,Boolean(options.fromReserve)); else if(action==='undo') result=undo(game); else if(action==='stash') result=stash(game); else if(action==='shuffle') result=shuffle(game,options.seed||`${game.seed}-${game.tools.shuffle}`); else if(action==='elapsed') {
    game.elapsed+=Math.max(0,Math.min(5000,Number(options.elapsed)||0));
    result=true;
  } else fail('NOT_READY','未知牌局操作');
  if(!result || result.ok===false) fail('NOT_READY','这一步暂时不能执行');
  return {
    game,
    stageId:FARM_STAGES[game.level].stageId,
    won:game.status==='won',
    score:Math.max(1,100000-Math.floor(game.elapsed/1000)),
    result
  };
}

// Per-board free tools stay in the same atomic farm payload as the board. There
// is no persistent/shared consumable tool balance in the original application,
// so no cross-namespace paid-tool bridge or duplicated economy is introduced.
