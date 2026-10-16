import { CHAINS, FAMILY_META, PRODUCER_DEFS, RENOVATIONS, SHOP_ITEMS, RECIPES, createGame, generate, move, fulfillOrder, getOrderProgress, refillEnergy, sellItem, getLevel, findMerge, tick, producerStatus, collectItem, claimPending, storeItem, retrieveItem, expandStorage, renovate, buyShopItem, claimDaily, useBooster, resolveBubble, unlockCell, unlockCost, storageExpansionCost, getRecipeProgress, cookRecipe } from './engine.mjs';
import { icon, glyph, avatar, kitchenScene } from './art.mjs';
import { createKitchenAudio } from './audio.mjs';

const $ = s => document.querySelector(s);
const STORAGE = 'little-kitchen-save-v1';
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readPref = (key,fallback) => {try {const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}};
const writePref = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let storageAvailable=true, saved=null;
try {
  saved=localStorage.getItem(STORAGE);
  if(saved && JSON.parse(saved).version===1 && !localStorage.getItem('little-kitchen-v1-backup')) localStorage.setItem('little-kitchen-v1-backup',saved);
} catch {storageAvailable=false;}
let state=createGame(saved);
let effectsEnabled=readPref('little-kitchen-sound',true), musicEnabled=readPref('little-kitchen-music',true);
let musicVolume=readPref('little-kitchen-music-volume',.36), effectsVolume=readPref('little-kitchen-effects-volume',.55);
const audio=createKitchenAudio({music:musicEnabled,effects:effectsEnabled});
audio.setVolume('music',musicVolume);audio.setVolume('effects',effectsVolume);
let selected=null, hinted=[], toastTimer, hintTimer, pointer=null, ghost=null, dropCell=null, suppressClick=false;
let modalView='', catalogFamily='food', recipeFilter='all', sceneStage=-1;
const board=$('#board'), modal=$('#modal');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
// Keep each item's idle phase stable when a render replaces the board DOM.
function motionPhase(id){
  const hash=[...String(id)].reduce((n,c)=>(n*31+c.charCodeAt(0))%997,0);
  const seed=(hash*211%997)/997*4.8;
  const time=performance.now()/1000+seed;
  return `--idle-phase:-${(time%3.2).toFixed(3)}s;--cue-phase:-${(time%4.8).toFixed(3)}s`;
}
function animateItem(index,kind){
  if(!reducedMotion.matches)board.querySelector(`[data-cell="${index}"]`)?.classList.add(`${kind}-pop`);
}
function syncMotion(){document.body.classList.toggle('motion-paused',document.hidden||modal.open);}
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)$('#effects').replaceChildren();});
board.addEventListener('animationend',event=>{
  const cell=event.target.closest('[data-cell]');if(!cell)return;
  if(event.target.matches('.item-art'))cell.classList.remove('pop','tap-pop','generate-pop','merge-pop','settle-pop');
  if(event.animationName==='producerBurst')cell.classList.remove('producer-burst');
});
const isLocked=i=>state.locked.includes(i);
const meta=item=>CHAINS[item?.family]?.[item.level-1];
const itemName=item=>!item?'空格':item.family==='producer'?PRODUCER_DEFS[item.kind]?.name||'生产器':item.family==='bubble'?`${itemName(item.item)}泡泡`:meta(item)?.name||'厨房礼物';
const itemArt=item=>icon(!item?'gift':item.family==='producer'?PRODUCER_DEFS[item.kind]?.icon||'basket':item.family==='bubble'?meta(item.item)?.icon||'gift':meta(item)?.icon||'gift');
const formatTime=ms=>`${Math.ceil(Math.max(0,ms)/1000)}秒`;
const today=()=>new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
const dailyReady=()=>!state.dailyClaimDate||state.dailyClaimDate<today();
const availableFamilies=()=>new Set(Object.values(PRODUCER_DEFS).filter(d=>d.unlockStage<=state.stage).flatMap(d=>d.families));
const panelIcon=name=>`<span class="panel-item-icon">${icon(name)}</span>`;
const button=(label,action,disabled=false,extra='')=>`<button class="small-button" data-action="${action}" ${disabled?'disabled':''} ${extra}>${label}</button>`;

function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{storageAvailable=false;}$('#save-label').textContent=storageAvailable?'进度已自动保存':'当前浏览器无法存档，请保持页面打开';}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800);}
function playSound(kind,level){audio.play(kind,level);}
function celebrate(element,message,big=false,kind='merge'){
  if(!element)return;if(reducedMotion.matches){toast(message);return;}const r=element.getBoundingClientRect(), x=r.left+r.width/2,y=r.top+r.height/2;
  const text=document.createElement('span');text.className='floating-text';text.textContent=message;
  Object.assign(text.style,{left:`${x}px`,top:`${y}px`});$('#effects').append(text);setTimeout(()=>text.remove(),1300);
  const colors=['#f0643c','#f6b84b','#8fb07a','#9fb3c4','#f7efe4'];
  for(let i=0;i<(big?26:10);i++){
    const piece=document.createElement('i');piece.className='confetti';const angle=Math.random()*Math.PI*2,radius=(big?120:55)*(.4+Math.random());
    Object.assign(piece.style,{left:`${x}px`,top:`${y}px`,background:colors[i%colors.length]});piece.style.setProperty('--dx',`${Math.cos(angle)*radius}px`);piece.style.setProperty('--dy',`${Math.sin(angle)*radius+40}px`);
    $('#effects').append(piece);setTimeout(()=>piece.remove(),1300);
  }
  if(kind==='cook'||kind==='unlock'){const effect=document.createElement('span');effect.className=kind==='cook'?'cook-steam':'unlock-shine';Object.assign(effect.style,{left:`${x}px`,top:`${y}px`});$('#effects').append(effect);setTimeout(()=>effect.remove(),1300);}
}
function tapEffect(target){if(reducedMotion.matches)return;const r=target.getBoundingClientRect();const ring=document.createElement('span');ring.className='tap-ring';Object.assign(ring.style,{left:`${r.left+r.width/2}px`,top:`${r.top+r.height/2}px`});$('#effects').append(ring);setTimeout(()=>ring.remove(),500);}
function mergeBurst(element){
  if(!element||reducedMotion.matches)return;
  const r=element.getBoundingClientRect(),flash=document.createElement('span');flash.className='merge-flash';
  Object.assign(flash.style,{left:`${r.left+r.width/2}px`,top:`${r.top+r.height/2}px`});
  $('#effects').append(flash);setTimeout(()=>flash.remove(),650);
}
function renderBoard(popIndex=-1){
  const focused=document.activeElement?.dataset.cell;
  board.innerHTML=state.board.map((item,i)=>{
    const locked=isLocked(i),producer=item?.family==='producer',bubble=item?.family==='bubble';
    const status=producer?producerStatus(state,item):null;
    const label=locked?`锁定，${item?itemName(item):'待整理台面'}`:item?`${itemName(item)}${producer?'，点击生产':`，${item.level||1}级`}`:'空格';
    return `<button class="cell ${item?'occupied':'empty'} ${producer?'producer':''} ${producer&&status.ready&&!locked&&state.energy>0?'ready-producer':''} ${locked?'locked':''} ${bubble?'bubble':''} ${status&&!status.ready?'cooling':''} ${['energy','coins','chest'].includes(item?.family)?'resource-item':''} ${selected===i?'selected':''} ${hinted.includes(i)?'hint':''} ${popIndex===i?'pop':''}" data-cell="${i}" style="${motionPhase(item?.id||i)}" aria-label="第${Math.floor(i/7)+1}行第${i%7+1}格，${esc(label)}" title="${esc(label)}" aria-pressed="${selected===i}">${item?`<span class="item-art">${itemArt(item)}</span><span class="item-level">${producer?'Lv'+item.level:bubble?'✦':item.level}</span>`:''}${locked?`<span class="lock-badge">${glyph('lock')}</span>`:''}${producer&&!locked?`<span class="cooldown-label" data-cooldown="${i}">${status.ready?`${status.charges}次`:formatTime(status.cooldownRemaining)}</span>`:''}</button>`;
  }).join('');
  if(focused!==undefined)board.querySelector(`[data-cell="${focused}"]`)?.focus({preventScroll:true});
}
function renderStats(){
  $('#energy-count').textContent=state.energy;$('#coin-count').textContent=state.coins.toLocaleString();$('#completed-count').textContent=state.completed;$('#order-count').textContent=state.orders.length;
  const level=getLevel(state),names=['见习小厨','烘焙新秀','人气主厨','美味专家','厨房明星'];
  $('#kitchen-level-label').textContent=`Lv. ${level} ${names[Math.min(level-1,4)]}`;$('#xp-progress').style.width=`${state.xp%100}%`;$('#xp-label').textContent=`${state.xp%100}/100`;
  $('#star-count').textContent=`★ ${state.stars}`;
  const next=RENOVATIONS[state.stage];$('#quest-copy').textContent=next?`${next.name} · 需要 ${next.stars} 星`:'世界美食厨房 · 装修已完成';
  $('#storage-count').textContent=`${state.inventory.length}/${state.storageCapacity}`;
  $('#gift-count').textContent=state.pending.length?String(state.pending.length):dailyReady()?'领':'✓';
  $('#gift-count').classList.toggle('attention',state.pending.length>0||dailyReady());
  $('#sound-button').innerHTML=`<span class="dock-icon">${glyph(musicEnabled?'music':'muted')}</span><span>音乐</span>`;
  if(sceneStage!==state.stage){sceneStage=state.stage;$('#kitchen-scene').innerHTML=kitchenScene(state.stage);$('#kitchen-stage-label').textContent=`第 ${state.stage+1} 章 · ${state.stage?RENOVATIONS[state.stage-1]?.name:'草莓小厨房开张啦'}`;}
}
function renderSelection(){
  const item=state.board[selected];
  if(selected!==null&&isLocked(selected)){
    $('#selection-card').innerHTML=`<span class="selected-art">${item?itemArt(item):icon('lock')}</span><div class="selection-copy"><strong>${item?esc(itemName(item)):'待整理台面'}</strong><p>${item?'拖入相同物品合成，即可解锁。':'在相邻格合成，即可清理空台面。'}</p></div>${button(`整理 ${unlockCost(state,selected)}币`,'unlock')}`;return;
  }
  if(!item){$('#selection-card').innerHTML=`<span class="selected-art">${icon('chef')}</span><div class="selection-copy"><strong>${state.merges?'食材与厨具，一起变出美味':'先把两份小麦合成面粉吧'}</strong><p>${state.merges?'交订单赚星星，解锁更多国家料理。':'点击生产器出物品，拖动相同物品合成。'}</p></div>${button(state.merges?'做料理':'提示',state.merges?'recipes':'hint')}`;return;}
  let description='',actions='';
  if(item.family==='producer'){
    const status=producerStatus(state,item);description=status.ready?`余 ${status.charges}/${status.maxCharges} 次 · 同级生产器可合并升级`:`冷却 ${formatTime(status.cooldownRemaining)} · 用沙漏立即补满`;
    actions=button('生产','generate',false,`data-index="${selected}"`)+button('更多','item');
  }else if(item.family==='bubble'){
    description=`限时惊喜 · ${formatTime(item.expiresAt-Date.now())} 后变金币`;
    actions=button(`${item.cost}币取出`,'bubble-buy')+button('变金币','bubble-dismiss');
  }else{
    const next=CHAINS[item.family]?.[item.level];description=next?`2份可合成${next.name}`:'已到最高级，可交单、做菜或收纳';
    if(['energy','coins','chest'].includes(item.family)){description=item.family==='chest'?'合成更高级礼盒，或现在打开领取奖励':`合成后收益更多 · 当前可领 ${meta(item)?.value||''} ${item.family==='energy'?'体力':'金币'}`;actions=button(item.family==='chest'?'开礼盒':'领取','collect')+button('收纳','store');}
    else actions=button('收纳','store')+button('更多','item');
  }
  $('#selection-card').innerHTML=`<span class="selected-art">${itemArt(item)}</span><div class="selection-copy"><strong>${esc(itemName(item))}<span class="selection-meta">Lv.${item.level||1}</span></strong><p>${esc(description)}</p></div><div class="selection-actions">${actions}</div>`;
}
function renderOrders(){
  $('#orders').innerHTML=state.orders.map((order,i)=>{const p=getOrderProgress(state,order);return `<article class="order-card ${p.ready?'is-ready':''}" data-order="${order.id}" style="${motionPhase(order.id)}"><div class="order-top">${(a=>`<span class="avatar ${a.name}">${a.svg}</span>`)(avatar(order.customer))}<div><h3>${esc(order.customer)}</h3><p>${esc(order.title)}</p></div></div><div class="order-needs">${p.needs.map(n=>`<div class="need ${!n.missing?'ready':''}" title="${esc(itemName(n))} ${n.have}/${n.count}"><span class="need-art">${itemArt(n)}</span><span class="need-count">${Math.min(n.have,n.count)}/${n.count}</span>${!n.missing?`<span class="need-check">${glyph('check')}</span>`:''}</div>`).join('')}</div><div class="order-bottom"><span class="reward"><span class="reward-coin">${icon('coin')}${order.coins}</span><small>★ ${order.stars||1}</small></span><button class="order-submit" data-fulfill="${order.id}" ${p.ready?'':'disabled'}>${p.ready?'交付 ✓':'待完成'}</button></div></article>`;}).join('');
}
function render(pop=-1){renderBoard(pop);renderStats();renderSelection();renderOrders();}
function act(result,{pop=-1,fx=null,showMessage=false}={}){
  if(!result.ok){toast(result.message);playSound('error');renderStats();renderSelection();return false;}
  hinted=[];render(pop);save();playSound(fx||result.type,result.item?.level);
  if(showMessage)toast(result.message);
  if(modal.open&&['storage','shop','rewards','renovation','recipes','energy','item'].includes(modalView))refreshPanel();
  return true;
}
function doGenerate(index){
  selected=Number(index);const result=generate(state,selected);
  if(!result.ok&&result.type==='energy'){openPanel('energy');return;}
  if(act(result,{pop:result.index,fx:'generate'})){
    const cell=board.querySelector(`[data-cell="${result.index}"]`);cell?.classList.add('producer-burst');
    animateItem(index,'generate');
    if(result.item?.level>1)toast(`新鲜惊喜：${itemName(result.item)}`);
  }
}
function doMove(from,to){
  const before=state.locked.length,result=move(state,from,to);if(result.ok)selected=to;
  if(!act(result))return;
  animateItem(to,result.type==='merge'?'merge':'settle');
  if(result.type==='merge'){
    const cell=board.querySelector(`[data-cell="${to}"]`);mergeBurst(cell);celebrate(cell,`合成 ${itemName(result.item)}`);
    if(state.locked.length<before){playSound('unlock');toast('整理出了新台面！');}
    else if(state.merges===1)toast('合成成功！看看上方有没有可交付的订单');
  }
}
function chooseCell(index){
  const item=state.board[index],source=state.board[selected];
  if(item?.family==='bubble'){selected=index;renderBoard();renderSelection();animateItem(index,'tap');return;}
  if(isLocked(index)){
    if(selected!==null&&selected!==index&&source&&!isLocked(selected)&&item&&source.family===item.family&&source.level===item.level){doMove(selected,index);return;}
    selected=index;renderBoard();renderSelection();return;
  }
  if(item?.family==='producer'){
    if(source?.family==='producer'&&selected!==index&&source.kind===item.kind&&source.level===item.level){doMove(selected,index);return;}
    doGenerate(index);return;
  }
  if(selected===index)selected=null;
  else if(selected!==null&&source&&!isLocked(selected)&&source.family!=='bubble'){doMove(selected,index);return;}
  else selected=item?index:null;
  hinted=[];renderBoard();renderSelection();if(selected!==null)animateItem(selected,'tap');playSound('select');
}
function showHint(){const pair=findMerge(state);if(!pair){toast('暂时没有可合成的组合，试试生产器、仓库或礼物');return;}hinted=[pair.from,pair.to];selected=null;renderBoard();renderSelection();toast(`把发光的两份${itemName(state.board[pair.from])}合到一起`);clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hinted=[];if(!pointer)renderBoard();},6000);}

function openPanel(view){modalView=view;renderPanel();if(!modal.open)modal.showModal();syncMotion();}
function refreshPanel(){const scroll=modal.scrollTop;renderPanel();modal.scrollTop=scroll;}
function panelHeader(title,description){return `<h2>${title}</h2><p class="modal-intro">${description}</p>`;}
function renderPanel(){
  let html='';
  if(modalView==='collection'){
    const all=Object.values(CHAINS).flat(),known=state.discovered.length;
    const family=CHAINS[catalogFamily]?catalogFamily:'food';
    html=panelHeader('厨房美味图鉴',`已发现 ${known} / ${all.length} 种合成物品。每条合成链都有自己的来源。`);
    html+=`<div class="panel-tabs">${Object.keys(CHAINS).map(key=>`<button class="panel-tab ${family===key?'active':''}" data-family="${key}">${esc(FAMILY_META[key]?.name||key)}</button>`).join('')}</div>`;
    html+=`<p class="source-note">${esc(FAMILY_META[family]?.description||'合成同级物品获得下一级。')}<br>来源：${esc(FAMILY_META[family]?.source||'礼物与订单奖励')}</p><div class="inventory-grid">${CHAINS[family].map(item=>`<div class="collection-item ${state.discovered.includes(item.id)?'':'locked'}"><span>${itemArt(item)}</span><strong>${item.name}</strong><small>Lv.${item.level} · ${state.discovered.includes(item.id)?'已发现':'待发现'}</small></div>`).join('')}</div>`;
    html+=`<button class="primary-button" data-action="sources" data-family-source="${family}">查看物品来源与生产器</button>`;
  }else if(modalView==='storage'){
    html=panelHeader('厨房收纳柜',`已使用 ${state.inventory.length} / ${state.storageCapacity} 格。收纳物品保留等级，取回棋盘后才能交付订单。`);
    html+=`<div class="inventory-grid">${Array.from({length:state.storageCapacity},(_,i)=>{const item=state.inventory[i];return `<button class="inventory-slot" ${item?`data-retrieve="${i}"`:'disabled'}>${item?`${itemArt(item)}<strong>${esc(itemName(item))}</strong><small>Lv.${item.level} · 取回</small>`:'<span>＋</span><small>空闲位置</small>'}</button>`;}).join('')}</div>`;
    if(selected!==null&&state.board[selected]&&!isLocked(selected))html+=`<button class="primary-button" data-action="store">收纳当前选中的${esc(itemName(state.board[selected]))}</button>`;
    html+=`<button class="primary-button" data-action="expand-storage">扩容两格 · ${storageExpansionCost(state)} 金币</button>`;
  }else if(modalView==='shop'){
    html=panelHeader('厨房采购铺',`现有 ${state.coins} 金币。生产器与礼盒放入礼物区，体力和辅助道具立即到账。`);
    html+=SHOP_ITEMS.map(item=>`<article class="shop-card">${panelIcon(item.icon)}<div class="panel-copy"><strong>${esc(item.name)}</strong><p>${esc(item.description)}</p><small>${item.unlockStage>state.stage?`装修至第 ${item.unlockStage+1} 章解锁`:item.type==='producer'?'同种同级生产器可拖动合并升级':'游戏金币购买'}</small></div><button class="small-button" data-buy="${item.id}" ${item.unlockStage>state.stage||state.coins<item.cost?'disabled':''}>${item.cost}币</button></article>`).join('');
  }else if(modalView==='rewards'){
    html=panelHeader('小厨房的礼物',`礼物区有 ${state.pending.length} 件待领物品。台面满了也会保留。`);
    html+=`<article class="reward-card">${panelIcon('gift')}<div class="panel-copy"><strong>每日开店礼</strong><p>体力、金币与合成礼盒，每天可领一次。</p></div>${button(dailyReady()?'领取':'今日已领','daily',!dailyReady())}</article>`;
    html+=`<p class="panel-meta">每完成 3 份订单，还能获得额外礼盒。礼盒也可以两两合成升级。</p>`;
    if(state.pending.length){html+=`<div class="inventory-grid">${state.pending.slice(0,20).map(item=>`<div class="inventory-slot">${itemArt(item)}<strong>${esc(itemName(item))}</strong><small>Lv.${item.level}</small></div>`).join('')}</div><button class="primary-button" data-action="claim">领取下一件到棋盘（剩 ${state.pending.length}）</button>`;}
    else html+='<p class="empty-state">礼物都收好啦，去完成下一份订单吧。</p>';
    html+=`<div class="feature-grid"><div class="reward-card">${panelIcon('scissors')}<div class="panel-copy"><strong>分拆剪刀 ×${state.boosters.scissors}</strong><p>选中2级以上食材，可拆成两件上一级物品。</p></div></div><div class="reward-card">${panelIcon('hourglass')}<div class="panel-copy"><strong>时光沙漏 ×${state.boosters.hourglass}</strong><p>选中生产器，立即补满次数并结束冷却。</p></div></div></div>`;
  }else if(modalView==='renovation'){
    const next=RENOVATIONS[state.stage];html=panelHeader('草莓小厨房',`装修进度 ${state.stage} / ${RENOVATIONS.length} · 可用星星 ${state.stars}。交付订单获得星星，装修会解锁新的料理类别。`);
    html+=`<div class="stage-scene">${kitchenScene(state.stage)}</div>`;
    if(next)html+=`<article class="renovation-card">${panelIcon(next.icon)}<div class="panel-copy"><strong>${esc(next.name)}</strong><p>${esc(next.description)}</p>${next.unlockKind?`<small>解锁：${esc(PRODUCER_DEFS[next.unlockKind].name)}</small>`:''}</div>${button(`装修 ★${next.stars}`,'renovate',state.stars<next.stars)}</article>`;
    else html+='<p class="empty-state">所有装修完成！继续收集世界料理，挑战高阶订单。</p>';
    html+=RENOVATIONS.map((r,i)=>`<div class="settings-row"><span>${i<state.stage?'✓':i===state.stage?'→':'○'} ${esc(r.name)}<small>${esc(r.description)}</small></span><span>${i<state.stage?'已完成':`★${r.stars}`}</span></div>`).join('');
  }else if(modalView==='recipes'){
    html=panelHeader('世界料理手账','指定食材 + 对应厨具 = 新料理。食材会消耗，厨具保留；更高级的厨具也能使用。');
    html+=RECIPES.map(recipe=>{const p=getRecipeProgress(state,recipe);return `<article class="recipe-card"><div class="panel-copy"><strong>${esc(recipe.name)}</strong><p>${esc(recipe.description)}</p></div><div class="recipe-needs">${p.needs.map(n=>`<span class="need ${!n.missing?'ready':''}" title="${esc(itemName(n))}"><span class="need-art">${itemArt(n)}</span><span class="need-count">${Math.min(n.have,n.count)}/${n.count}</span></span>`).join('')}<span class="recipe-arrow">→</span><span class="recipe-output" title="${esc(itemName(recipe.output))}">${itemArt(recipe.output)}</span></div><div class="recipe-tool">${icon('pan')} ${esc(p.toolName||CHAINS.tools[recipe.toolLevel-1]?.name)}或更高级厨具 · ${p.toolReady?'已就绪 · 保留使用':'台面暂缺'}</div><button class="primary-button" data-cook="${recipe.id}" ${p.ready?'':'disabled'}>${recipe.unlockStage>state.stage?`第 ${recipe.unlockStage+1} 章解锁`:p.ready?'开始烹饪':'准备食材与厨具'}</button></article>`;}).join('');
  }else if(modalView==='sources'){
    html=panelHeader('物品从哪里来',`${FAMILY_META[catalogFamily]?.name||'厨房物品'}的来源。高级生产器拥有更多次数，也更容易产出高级材料。`);
    const producers=Object.entries(PRODUCER_DEFS).filter(([,d])=>d.families.includes(catalogFamily));
    html+=producers.length?producers.map(([kind,d])=>{const index=state.board.findIndex(item=>item?.family==='producer'&&item.kind===kind);return `<article class="store-card">${panelIcon(d.icon)}<div class="panel-copy"><strong>${d.name}</strong><p>${d.families.map(f=>FAMILY_META[f].name).join(' / ')}</p><small>${d.unlockStage>state.stage?`第 ${d.unlockStage+1} 章装修后赠送`:'可从采购铺或礼盒获取，同级可合并'}</small></div>${index>=0?`<button class="small-button" data-locate="${index}">定位</button>`:button(d.unlockStage>state.stage?'去装修':'去采购',d.unlockStage>state.stage?'renovation':'shop')}</article>`;}).join(''):'<p class="empty-state">这类道具来自每日礼物、礼盒、订单奖励或合成惊喜。</p>';
  }else if(modalView==='item'){
    const item=state.board[selected];if(!item){modal.close();return;}
    html=panelHeader(itemName(item),`${FAMILY_META[item.family]?.name||'生产设备'} · Lv.${item.level}`)+`<div class="energy-big">${itemArt(item)}</div>`;
    if(item.family==='producer'){const status=producerStatus(state,item);html+=`<p class="source-note">产出：${PRODUCER_DEFS[item.kind].families.map(f=>FAMILY_META[f].name).join(' / ')}<br>当前 ${status.charges}/${status.maxCharges} 次${status.ready?'':`，冷却 ${formatTime(status.cooldownRemaining)}`}</p><button class="primary-button" data-action="hourglass" ${state.boosters.hourglass<1?'disabled':''}>时光沙漏 ×${state.boosters.hourglass} · 立即补满</button><button class="primary-button" data-action="store">收纳生产器</button>`;}
    else{html+=`<p class="source-note">${FAMILY_META[item.family]?.description||''}</p><div class="panel-actions">${button('查看来源','sources',false,`data-family-source="${item.family}"`)}${button('收纳物品','store')}${button(`分拆 ×${state.boosters.scissors}`,'scissors',item.level<=1||state.boosters.scissors<1)}</div><button class="primary-button" data-action="sell-confirm">出售 +${2**(item.level-1)} 金币</button>`;}
  }else if(modalView==='sell-confirm'){
    const item=state.board[selected];if(!item){modal.close();return;}html=panelHeader(`出售${esc(itemName(item))}？`,`出售后获得 ${2**(item.level-1)} 金币。`)+`<div class="panel-actions">${button('保留物品','item')}${button('确认出售','sell-now')}</div>`;
  }else if(modalView==='energy'){
    const amount=Math.max(0,Math.min(30,state.maxEnergy-state.energy));html=panelHeader('补充一点厨房灵感',`体力 ${state.energy}/${state.maxEnergy}。每30秒恢复1点，离开后也会恢复。`)+`<div class="energy-big">${icon('energy')}</div><p class="source-note">每日礼物、能量道具和采购铺也可以补充体力。能量道具合成后再领取更划算。</p><button class="primary-button" data-action="refill" ${!amount||state.coins<30?'disabled':''}>${amount?`30 金币 · 补充 ${amount} 体力`:'体力已满'}</button><button class="primary-button" data-action="rewards">看看今天的礼物</button>`;
  }else if(modalView==='music'){
    html=panelHeader('小厨房的声音','原创轻快循环配乐，搭配点击、生产、合成、交单、烹饪和装修音效。首次操作后开始播放。');
    html+=`<div class="settings-row"><span>背景音乐<small>轻快铃音、拨弦与温暖低音</small></span>${button(musicEnabled?'已开启':'已关闭','toggle-music')}</div><label class="settings-row">音乐音量 <input class="music-slider" type="range" min="0" max="100" value="${Math.round(musicVolume*100)}" data-volume="music" aria-label="背景音乐音量"></label><div class="settings-row"><span>操作音效<small>每种操作都有不同的声音反馈</small></span>${button(effectsEnabled?'已开启':'已关闭','toggle-effects')}</div><label class="settings-row">音效音量 <input class="music-slider" type="range" min="0" max="100" value="${Math.round(effectsVolume*100)}" data-volume="effects" aria-label="操作音效音量"></label>`;
  }else if(modalView==='settings'){
    html=panelHeader('厨房小设置','按自己的节奏，慢慢收集每一份美味。')+`<div class="settings-row"><span>玩法说明<small>生产、合成、做菜、交单与装修</small></span>${button('查看','help')}</div><div class="settings-row"><span>音乐和音效<small>分别开关与调节音量</small></span>${button('调整','music')}</div><div class="settings-row"><span>自动存档<small>${storageAvailable?'当前浏览器自动保存，旧版进度已兼容':'当前浏览器暂时无法保存'}</small></span>自动</div><div class="settings-row"><span>重新开张<small>清空当前进度，回到新手厨房</small></span>${button('重新开始','reset-confirm')}</div>`;
  }else if(modalView==='help'){
    html=panelHeader('厨房店长小手册','主玩法是两两合成，食谱与装修让每一件物品都有用途。');
    const steps=[['生产与升级','点击篮子、厨具架等生产器消耗1体力获取材料。次数用完会冷却，同种同级生产器可拖动合并升级。'],['合成与解锁','相同种类和等级合成升级。拖入蒙尘的相同物品可解锁；空的锁定格可通过相邻合成整理，也能花金币清理。'],['订单与装修','订单只计算台面上的已解锁物品。交单可得金币、经验和星星，用星星装修，逐步解锁咖啡、香草、亚洲及环球料理设备。'],['食材与厨具','打开食谱，凑齐指定材料和对应等级厨具即可做菜。材料会消耗，厨具可以反复使用；更高级厨具同样有效。'],['仓库与礼物','在物品信息栏收纳物品；仓库可用金币扩容。每3单有礼盒，每日有开店礼。礼盒、金币和体力道具也能合成升级。'],['辅助道具','剪刀把2级以上材料拆成两份上一级，沙漏补满选中生产器。点击选中物品后，在“更多”里使用。'],['惊喜与自动产出','高级合成有机会产生限时泡泡，可以购买或变为金币。香草花园会定时自动产出，先给它留出相邻空位。'],['音乐与存档','原创音乐在首次操作后播放；离开页面会暂停。进度自动保存，音效与配乐可以分别关闭。']];
    html+=steps.map(([title,copy],i)=>`<div class="guide-step"><span class="step-num">${i+1}</span><div><strong>${title}</strong><p>${copy}</p></div></div>`).join('');
  }else if(modalView==='reset-confirm')html=panelHeader('让小厨房重新开张？','当前的棋盘、仓库、金币、装修、订单、图鉴都会清空。')+`<div class="reset-warning">此操作会覆盖当前浏览器中的游戏进度。</div><div class="reset-actions">${button('保留进度','settings')}${button('确定重新开始','reset')}</div>`;
  $('#modal-content').innerHTML=html+(modalView==='reset-confirm'?'':'<button class="primary-button" data-action="close">回到小厨房</button>');
}

// Mouse activates on press; touch activates on release. Click also covers assistive input.
document.addEventListener('pointerdown',()=>audio.unlock(),{passive:true});
document.addEventListener('pointerup',()=>audio.unlock(),{passive:true});
document.addEventListener('click',()=>audio.unlock(),{capture:true});
document.addEventListener('keydown',()=>audio.unlock());
document.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target||target.disabled||suppressClick)return;
  if(target.dataset.cell!==undefined){tapEffect(target);chooseCell(Number(target.dataset.cell));return;}
  tapEffect(target);
  if(target.dataset.family){catalogFamily=target.dataset.family;refreshPanel();playSound('tap');return;}
  if(target.dataset.retrieve!==undefined){const r=retrieveItem(state,Number(target.dataset.retrieve));if(r.ok)selected=r.index;act(r,{pop:r.index,showMessage:true});return;}
  if(target.dataset.buy){act(buyShopItem(state,target.dataset.buy),{showMessage:true});return;}
  if(target.dataset.cook){const r=cookRecipe(state,target.dataset.cook);if(r.ok){selected=r.index;modal.close();}if(act(r,{pop:r.index,fx:'cook',showMessage:true}))celebrate(board.querySelector(`[data-cell="${r.index}"]`),'新鲜出炉！',true,'cook');return;}
  if(target.dataset.locate!==undefined){selected=Number(target.dataset.locate);modal.close();renderBoard();renderSelection();playSound('select');return;}
  if(target.dataset.fulfill){const r=fulfillOrder(state,target.dataset.fulfill);if(act(r,{fx:'order'})){celebrate($('#orders'),`+${r.coins} 金币 · +${r.stars||1} 星星`,true);toast(r.message);}return;}
  const action=target.dataset.action;
  if(['collection','storage','shop','rewards','renovation','recipes','sources','item','energy','music','settings','help','reset-confirm','sell-confirm'].includes(action)){
    if(target.dataset.familySource)catalogFamily=target.dataset.familySource;
    openPanel(action);playSound('tap');return;
  }
  switch(action){
    case 'close':modal.close();playSound('tap');break;
    case 'hint':showHint();playSound('tap');break;
    case 'generate':doGenerate(Number(target.dataset.index));break;
    case 'store':{const r=storeItem(state,selected);if(r.ok)selected=null;act(r,{showMessage:true});break;}
    case 'expand-storage':act(expandStorage(state),{fx:'unlock',showMessage:true});break;
    case 'claim':{const r=claimPending(state);if(r.ok)selected=r.index;act(r,{pop:r.index,fx:'collect',showMessage:true});break;}
    case 'daily':act(claimDaily(state),{fx:'daily',showMessage:true});break;
    case 'renovate':{const r=renovate(state);if(act(r,{fx:'renovate',showMessage:true}))celebrate(modal.querySelector('.stage-scene')||$('#kitchen-scene'),'小厨房焕新啦！',true,'unlock');break;}
    case 'unlock':{const r=unlockCell(state,selected);if(act(r,{pop:selected,fx:'unlock',showMessage:true}))celebrate(board.querySelector(`[data-cell="${selected}"]`),'新台面！',false,'unlock');break;}
    case 'collect':{const r=collectItem(state,selected);if(r.ok)selected=null;act(r,{showMessage:true});break;}
    case 'bubble-buy':case 'bubble-dismiss':{const r=resolveBubble(state,selected,action==='bubble-buy');act(r,{pop:selected,fx:'collect',showMessage:true});break;}
    case 'scissors':case 'hourglass':act(useBooster(state,action,selected),{pop:selected,fx:'booster',showMessage:true});break;
    case 'sell-now':{const r=sellItem(state,selected);if(r.ok){selected=null;modal.close();}act(r,{fx:'sell',showMessage:true});break;}
    case 'refill':act(refillEnergy(state),{fx:'refill',showMessage:true});break;
    case 'toggle-music':musicEnabled=!musicEnabled;audio.setMusic(musicEnabled);writePref('little-kitchen-music',musicEnabled);renderStats();refreshPanel();break;
    case 'toggle-effects':effectsEnabled=!effectsEnabled;audio.setEffects(effectsEnabled);writePref('little-kitchen-sound',effectsEnabled);refreshPanel();if(effectsEnabled)playSound('tap');break;
    case 'reset':state=createGame();selected=null;hinted=[];sceneStage=-1;modal.close();render();save();playSound('renovate');toast('新厨房开张啦！');break;
  }
});
document.addEventListener('input',event=>{
  const kind=event.target.dataset.volume;if(!kind)return;const value=Number(event.target.value)/100;
  if(kind==='music'){musicVolume=value;writePref('little-kitchen-music-volume',value);}else{effectsVolume=value;writePref('little-kitchen-effects-volume',value);}
  audio.setVolume(kind,value);
});
modal.addEventListener('close',syncMotion);
$('#modal-close').addEventListener('click',()=>modal.close());
modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();}});
$('#kitchen-tab').addEventListener('click',()=>{modal.close();selected=null;renderBoard();renderSelection();});

board.addEventListener('pointerdown',event=>{
  if(event.button!==0 || pointer) return;
  const cell=event.target.closest('[data-cell]'); if(!cell)return;
  const index=Number(cell.dataset.cell);const item=state.board[index];
  if(!item || item.family==='bubble' || isLocked(index))return;
  pointer={index,itemId:item.id,x:event.clientX,y:event.clientY,id:event.pointerId,dragging:false};
});
window.addEventListener('pointermove',event=>{
  if(!pointer || event.pointerId!==pointer.id)return;
  if(state.board[pointer.index]?.id!==pointer.itemId){endPointer(event,true);return;}
  if(!pointer.dragging && Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>7){
    pointer.dragging=true;hinted=[];board.classList.add('is-dragging');
    ghost=document.createElement('div');ghost.className='drag-ghost';ghost.innerHTML=itemArt(state.board[pointer.index]);document.body.append(ghost);
    board.querySelector(`[data-cell="${pointer.index}"]`)?.classList.add('drag-source');
  }
  if(!pointer.dragging)return;
  event.preventDefault();ghost.style.left=`${event.clientX}px`;ghost.style.top=`${event.clientY}px`;
  const cell=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-cell]');
  if(dropCell!==cell){dropCell?.classList.remove('drop-target');dropCell=cell;if(cell&&Number(cell.dataset.cell)!==pointer.index)cell.classList.add('drop-target');}
},{passive:false});

function endPointer(event,cancel=false){
  if(!pointer || event.pointerId!==pointer.id)return;
  const p=pointer;pointer=null;board.classList.remove('is-dragging');
  if(p.dragging){
    suppressClick=true;setTimeout(()=>suppressClick=false,0);
    const cell=!cancel&&document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-cell]');
    ghost?.remove();ghost=null;dropCell?.classList.remove('drop-target');dropCell=null;
    if(cell && Number(cell.dataset.cell)!==p.index && state.board[p.index]?.id===p.itemId)doMove(p.index,Number(cell.dataset.cell));
    else {selected=p.index;renderBoard();renderSelection();}
    // Restore visual state even for rejected drops on a producer or max-level pair.
    board.querySelector('.drag-source')?.classList.remove('drag-source');
  }
}
window.addEventListener('pointerup',event=>endPointer(event));
window.addEventListener('pointercancel',event=>endPointer(event,true));
window.addEventListener('blur',()=>{if(pointer)endPointer({pointerId:pointer.id},true);});
window.addEventListener('keydown',event=>{if(event.key==='Escape'){if(pointer)endPointer({pointerId:pointer.id},true);selected=null;hinted=[];renderBoard();renderSelection();}});
function refreshTime(){
  const result=tick(state);
  if(result.changed){if(pointer)endPointer({pointerId:pointer.id},true);render();save();}
  else if(!pointer){
    board.querySelectorAll('[data-cooldown]').forEach(label=>{const item=state.board[Number(label.dataset.cooldown)];if(!item)return;const status=producerStatus(state,item);label.textContent=status.ready?`${status.charges}次`:formatTime(status.cooldownRemaining);});
    if(state.board[selected]?.family==='producer'||state.board[selected]?.family==='bubble')renderSelection();
  }
}
document.addEventListener('visibilitychange',()=>{audio.setHidden(document.hidden);syncMotion();if(document.hidden){if(pointer)endPointer({pointerId:pointer.id},true);save();}else refreshTime();});
window.addEventListener('pagehide',()=>{save();audio.setHidden(true);});
window.addEventListener('pageshow',()=>{audio.setHidden(document.hidden);syncMotion();});
setInterval(()=>{if(!document.hidden)refreshTime();},1000);
for(const [id,name] of Object.entries({'energy-icon':'energy','coin-icon':'coin','level-icon':'star','quest-icon':'star'}))$(`#${id}`).innerHTML=icon(name);
for(const [id,name] of Object.entries({'brand-icon':'merge','collection-icon':'book','settings-icon':'sliders','hint-icon':'sparkles','modal-close':'close','storage-icon':'archive','shop-icon':'bag','gift-icon':'gift','recipes-icon':'recipes','renovation-icon':'store'}))$(`#${id}`).innerHTML=glyph(name);
render();save();
