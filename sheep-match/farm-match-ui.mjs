import {FACES} from './icons.mjs';
import {freeTiles} from './engine.mjs';
import {FARM_STAGES} from './farm-stage-data.mjs';
import {stackHints,appendStackHint} from './stack-hints.mjs';
import {farmAssetUrl} from './farm-assets.mjs';
import {mountFarmDelight} from './farm-delight.mjs';
const art=id=>`<img class="farm-match-icon" src="${farmAssetUrl(id)}" alt="" draggable="false">`;
export function mountFarmMatch({ root,store,onExit,onStartStage,onSound=()=> { } }) {
  root.className='farm-match';
  root.innerHTML=`<header><button data-exit aria-label="返回牧场">${art('ui.home')}<span>回牧场</span></button><div class="farm-match-title"><h2>牧场故事</h2><span class="farm-match-kicker">忙里偷闲，收集小美好</span></div><button data-retry aria-label="再来一次，重新挑战本章">${art('ui.branch_replay')}<span>再来一次</span></button></header><p class="farm-match-summary"></p><div class="farm-match-field"><div class="board" role="group" aria-label="牧场故事叠牌"></div></div><div class="farm-match-reserve" aria-label="临时草篮，点击可取回"></div><div class="farm-match-basket"><span class="farm-match-basket-label">凑齐 3 张，一起收进篮子</span><div class="rack" role="group" aria-label="7个收集格"></div></div><nav class="farm-match-tools" aria-label="本局免费小工具"><button data-action="undo">撤回</button><button data-action="shuffle">洗牌</button><button data-action="stash">移出</button></nav><section class="farm-match-result" aria-live="polite" hidden></section><p class="farm-match-notice" role="status"></p><div class="farm-match-dialog" hidden><section class="farm-match-dialog-card" role="dialog" aria-modal="true" aria-labelledby="farm-match-retry-title"><h3 id="farm-match-retry-title">重新翻开这一页？</h3><p>本关牌面与本局免费道具会重置。农场进度、已经领取的首通奖励不变。</p><div class="farm-match-dialog-actions"><button data-cancel-retry>再想想</button><button data-confirm-retry class="farm-match-primary">确认重开</button></div></section></div>`;
  let busy=false,stopped=false,last=performance.now(),lastMatchAt=-Infinity,matchChain=0;
  const q=s=>root.querySelector(s);
  const delight=mountFarmDelight(root,{reducedMotion:!!store.getState().settings?.reducedMotion});
  const syncVisibility=()=>delight.pause(root.hidden||document.hidden);
  const hiddenObserver=new MutationObserver(syncVisibility);
  hiddenObserver.observe(root,{attributes:true,attributeFilter:['hidden']});
  async function act(action,extra={ }) {
    if(busy) return;
    busy=true;
    const sourceElement=extra.tileId!==undefined?q(`[data-tile="${extra.tileId}"]`):q(`[data-action="${action}"]`);
    const source=sourceElement?.getBoundingClientRect();
    try {
      const previous=store.getState().branch.active;
      const previouslyWon=store.getState().branch.stages[FARM_STAGES[previous.level].stageId]?.won;
      const saved=await store.dispatch({ type:'stageAction', action,...extra });
      if(!saved.ok) throw new Error(saved.message||'保存失败，这一步未执行');
      const current=store.getState().branch.active;
      if(action!=='elapsed') {
        const matched=current.matched>previous.matched;
        if(matched){const time=performance.now();matchChain=time-lastMatchAt<2200?matchChain+1:1;lastMatchAt=time;}
        const cue=current.status==='won'?'win':current.status==='lost'?'lost':matched?(matchChain>1?'combo':'match'):action==='pick'?'pick':action;
        onSound(cue);
        const effect=current.status==='won'&&!previouslyWon?'firstClear':matched?'harvest':'click';
        delight.play(effect,{sourceElements:source?[source]:[],targetElement:q('.rack'),count:matched?6:1});
      }
      q('.farm-match-notice').textContent='';
    } catch(e) {
      onSound('soft-error');
      q('.farm-match-notice').textContent=e.message||'保存失败，这一步未执行';
    } finally {
      busy=false;
      render();
    }
  }
  function render() {
    if(stopped) return;
    const game=store.getState().branch.active;
    if(!game) return;
    const stage=FARM_STAGES[game.level];
    const won=store.getState().branch.stages[stage.stageId]?.won;
    const background=store.getState().cosmetics?.background||'default';
    root.dataset.background=background==='background_2'?'harvest':background==='background_1'?'meadow':'default';
    q('h2').textContent=`牧场故事 · 第${game.level+1}章`;
    root.dataset.reducedMotion=String(!!store.getState().settings?.reducedMotion);
    delight.setReducedMotion(!!store.getState().settings?.reducedMotion);
    syncVisibility();
    q('.farm-match-summary').textContent=`还剩 ${game.board.length} 张 · 篮子 ${game.rack.length}/7 · 首通礼物：${stage.label}`;
    const board=q('.board'),free=new Set(freeTiles(game.board).map(t=>t.id)),hints=stackHints(game.board,free);
    const focused=document.activeElement?.dataset?.tile;
    board.replaceChildren();
    for( const tile of [...game.board].sort((a,b)=>a.z-b.z||a.id-b.id)) {
      const b=document.createElement('button');
      b.className=`tile${free.has(tile.id)?'':' covered'}`;
      b.style.left=`${tile.x/7*100}%`;
      b.style.top=`${tile.y/6.5*100}%`;
      b.style.zIndex=tile.z+1;
      b.innerHTML=FACES[tile.type].icon;
      b.dataset.tile=tile.id;
      b.disabled=!free.has(tile.id)||game.status!=='playing'||busy;
      b.setAttribute('aria-label',`${FACES[tile.type].name}${free.has(tile.id)?'，可选择':'，被遮挡'}`);
      appendStackHint(b,hints.get(tile.id));
      b.onclick=()=>act('pick',{ tileId:tile.id });
      board.append(b);
    }
    if(focused) board.querySelector(`[data-tile="${focused}"]`)?.focus({ preventScroll:true });
    const rack=q('.rack');
    rack.replaceChildren();
    for(
      let i=0
      ;i<7;i++) {
      const slot=document.createElement('div');
      slot.className='slot';
      if(game.rack[i]) {
        slot.innerHTML=`<div class="rack-tile">${FACES[game.rack[i].type].icon}</div>`;
        slot.setAttribute('aria-label',FACES[game.rack[i].type].name);
      }
      rack.append(slot);
    }
    const reserve=q('.farm-match-reserve');
    reserve.replaceChildren();
    for( const tile of game.reserve) {
      const b=document.createElement('button');
      b.innerHTML=FACES[tile.type].icon;
      b.setAttribute('aria-label',`取回${FACES[tile.type].name}`);
      b.onclick=()=>act('pick',{ tileId:tile.id, fromReserve:true });
      reserve.append(b);
    }
    for( const [action,label] of [['undo','撤回'],['shuffle','洗牌'],['stash','移出']]) {
      const b=q(`[data-action="${action}"]`);
      b.innerHTML=`${art(({undo:'ui.undo',shuffle:'ui.branch_replay',stash:'ui.stash'})[action])}<span>${label}<small>剩 ${game.tools[action]} 次</small></span>`;
      b.setAttribute('aria-label',`${label}，本局剩余${game.tools[action]}次`);
      b.disabled=busy||!game.tools[action]||game.status==='won'||(action==='undo'&&!game.history.length)||(action==='stash'&&(!game.rack.length||game.reserve.length>0))||(action==='shuffle'&&(game.status!=='playing'||game.board.length<2));
    }
    const result=q('.farm-match-result');
    result.hidden=game.status==='playing';
    result.replaceChildren();
    if(game.status!=='playing') {
      const heading=document.createElement('h3');
      heading.textContent=game.status==='won'?'收获一页小美好！':'小篮子装满啦';
      result.append(heading);
      const p=document.createElement('p');
      p.textContent=game.status==='won'?`${won?'首通礼物已记入牧场，重玩不会重复发奖。':''} 放不下或尚未解锁的物品，会乖乖等你回去领取。`:'用撤回或移出再试试吧。农场产物不会损失，放心慢慢玩。';
      result.append(p);
      if(game.status==='won'&&game.level<23) {
        const next=document.createElement('button');
        next.textContent='翻开下一页 →';
        next.className='farm-match-primary';
        next.onclick=()=>onStartStage(FARM_STAGES[game.level+1].stageId);
        result.append(next);
      }
      const back=document.createElement('button');
      back.textContent='回牧场看看';
      back.onclick=onExit;
      result.append(back);
    }
  }
  q('[data-exit]').onclick=onExit;
  const dialog=q('.farm-match-dialog');
  const hideRetry=()=>{dialog.hidden=true;q('[data-retry]').focus({preventScroll:true});};
  q('[data-retry]').onclick=()=>{onSound('button');dialog.hidden=false;q('[data-cancel-retry]').focus();};
  q('[data-cancel-retry]').onclick=hideRetry;
  q('[data-confirm-retry]').onclick=()=>{hideRetry();onStartStage(FARM_STAGES[store.getState().branch.active.level].stageId,`retry-${Date.now()}`);};
  dialog.onclick=event=>{if(event.target===dialog)hideRetry();};
  dialog.onkeydown=event=>{
    if(event.key==='Escape'){event.preventDefault();hideRetry();}
    if(event.key==='Tab'){
      const first=q('[data-cancel-retry]'),last=q('[data-confirm-retry]');
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  };
  for( const b of root.querySelectorAll('[data-action]')) b.onclick=()=>act(b.dataset.action);
  const unsub=store.subscribe(render);
  render();
  const timer=setInterval(()=> {
      const now=performance.now(),elapsed=now-last;
      last=now;
      if(!root.hidden&&!document.hidden&&!busy&&store.getState().branch.active?.status==='playing') act('elapsed',{ elapsed });
    } ,5000);
  return { destroy() {
      stopped=true;
      hiddenObserver.disconnect();
      delight.destroy();
      clearInterval(timer);
      unsub?.();
      root.replaceChildren();
    } , refresh:render };
}
