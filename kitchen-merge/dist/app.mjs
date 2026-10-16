import { CHAINS, FAMILY_META, PRODUCER_DEFS, CHAPTERS, SHOP_ITEMS, RECIPES, createGame, generate, move, fulfillOrder, getOrderProgress, refillEnergy, sellItem, getLevel, findMerge, tick, producerStatus, collectItem, claimPending, storeItem, retrieveItem, expandStorage, getChapterProgress, claimChapter, buyShopItem, claimDaily, useBooster, resolveBubble, unlockCell, unlockCost, storageExpansionCost, getRecipeProgress, cookRecipe } from './engine.mjs';
import { BALANCE, ITEMS, definition, sourceRules, isSource, isPermanent, sourceDescription, activeOrders, mainOrder, refreshOrder, claimBreak, claimCommission, useTool, previewTool, discardItem, undoDiscard, claimCredits, levelFloor, itemKey } from './engine.mjs';
import { icon, glyph, avatar } from './art.mjs';
import { backupBeforeMigration } from './save-store.mjs';
import { createKitchenAudio } from './audio.mjs';

const $ = s => document.querySelector(s);
const LEVEL_NAMES=['见习小厨','烘焙新秀','人气主厨','美味专家','厨房明星'];
const qa=new URLSearchParams(location.search).get('qa'),qaEnabled=['127.0.0.1','localhost','::1'].includes(location.hostname)&&['special','resources','chapter','migration'].includes(qa);
const STORAGE = qaEnabled?`little-kitchen-qa-${qa}`:'little-kitchen-save-v1';
const BACKUP_PREFIX=qaEnabled?STORAGE:'little-kitchen';
const backupKey=suffix=>`${BACKUP_PREFIX}-${suffix}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readPref = (key,fallback) => {try {const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}};
const writePref = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let storageAvailable=true, saved=null,backupError=null;
try {
  saved=localStorage.getItem(STORAGE);
  if(saved && [1,2].includes(JSON.parse(saved).version)){
    backupBeforeMigration(localStorage,BACKUP_PREFIX,saved);
  }
} catch(error) {storageAvailable=false;try{if(saved&&[1,2].includes(JSON.parse(saved).version))backupError=error;}catch{}}
let state;try{if(backupError)throw Error('无法保存迁移前备份。请先导出原档，释放浏览器存储后重试。');state=createGame(saved);}catch(error){document.body.innerHTML='<main class=save-recovery><h1>存档已保护</h1><p></p><button id=export-protected>导出原始存档</button><p>请使用支持此版本的程序，或从迁移前备份恢复。</p></main>';document.querySelector('p').textContent=error.message;document.querySelector('button').onclick=()=>download('kitchen-protected-save.json',saved);throw error;}
const makeFixture=qaEnabled?(await import('./qa.mjs')).fixture:null;
if(qaEnabled&&!saved)state=makeFixture(qa);
let toolSelection=null, toolTarget=null,catalogDetail='food:1';
function resolveToolSelection(){const index=state.board.findIndex(x=>x?.id===toolSelection);return index>=0?index:toolSelection;}
function selectTool(id){toolSelection=id;const tool=state.tools.find(x=>x.id===id)||state.board.find(x=>x?.id===id);if(['infinite','timeskip','backpack'].includes(tool.family)){toolTarget=null;openPanel('tool-preview');}else openPanel('tool-target');}
function download(filename,value){const url=URL.createObjectURL(new Blob([value],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
let effectsEnabled=readPref('little-kitchen-sound',true), musicEnabled=readPref('little-kitchen-music',true);
let musicVolume=readPref('little-kitchen-music-volume',.36), effectsVolume=readPref('little-kitchen-effects-volume',.55);
const audio=createKitchenAudio({music:musicEnabled,effects:effectsEnabled});
audio.setVolume('music',musicVolume);audio.setVolume('effects',effectsVolume);
let selected=null, hinted=[], toastTimer, hintTimer, pointer=null, ghost=null, dropCell=null, suppressClick=false;
let modalView='', catalogFamily='food';
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
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){$('#effects').replaceChildren();$('.puppy-sprite').classList.remove('is-waving','is-cheering');}});
function puppyMood(mood){
  if(reducedMotion.matches)return;const sprite=$('.puppy-sprite');
  sprite.classList.remove('is-waving','is-cheering');void sprite.offsetWidth;sprite.classList.add(`is-${mood}`);
}
$('.puppy-sprite').addEventListener('animationend',()=>$('.puppy-sprite').classList.remove('is-waving','is-cheering'));
board.addEventListener('animationend',event=>{
  const cell=event.target.closest('[data-cell]');if(!cell)return;
  if(event.target.matches('.item-art'))cell.classList.remove('pop','tap-pop','generate-pop','merge-pop','settle-pop');
  if(event.animationName==='producerBurst')cell.classList.remove('producer-burst');
});
const isLocked=i=>state.locked.includes(i);
const meta=item=>CHAINS[item?.family]?.[item.level-1];
const itemName=item=>!item?'空格':item.family==='bubble'?`${itemName(item.item)}泡泡`:definition(item)?.name||'厨房物品';
const itemArt=item=>icon(!item?'gift':item.family==='bubble'?meta(item.item).icon:definition(item).icon);
const formatTime=ms=>ms>=3600000?`${(ms/3600000).toFixed(1)}小时`:ms>=60000?`${Math.ceil(ms/60000)}分`:`${Math.ceil(Math.max(0,ms)/1000)}秒`;
const today=()=>new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
const dailyReady=()=>!state.dailyClaimDate||state.dailyClaimDate<today();
const availableFamilies=()=>new Set(Object.values(PRODUCER_DEFS).filter(d=>d.unlockStage<=state.stage).flatMap(d=>d.families));
const panelIcon=name=>`<span class="panel-item-icon">${icon(name)}</span>`;
function ruleSummary(item){const d=definition(item),r=sourceRules(item),m=r.manual,parts=[];if(m){parts.push(`每次消耗${m.energyPerTap}体力`);if(m.mode==='recharge')parts.push(`库存${m.maxStock}，每${formatTime(m.rechargeSeconds*1000)}补${m.batch}件`);if(m.drops){parts.push(m.drops.map(x=>`${FAMILY_META[x.chain].name} ${(x.prob*100).toFixed(1)}%`).join(' / '));parts.push(`产物L1/L2/L3：${m.outputLevelProb.map(n=>(n*100).toFixed(0)+'%').join('/')}`);}else if(m.outputs)parts.push('产出 '+m.outputs.map(x=>ITEMS[x.item].name).join(' / '));else if(m.sequence)parts.push('固定序列 '+m.sequence.map(id=>ITEMS[id].name).join(' → '));}else if(d.kind==='producer')parts.push(`合至L${PRODUCER_DEFS[d.family.slice(4)].activeLevel}开始生产`);if(d.valueUnit)parts.push(`单件数值 ${d.value===null?'不限':d.value} ${d.valueUnit}`);return parts.join('；');}
function backupSummary(){try{const raw=localStorage.getItem(backupKey('migration-backup')),digest=localStorage.getItem(backupKey('migration-backup-sha256'));return raw?`原档v${JSON.parse(raw).version} · SHA-256 ${(digest||'').slice(0,16)}…`:'暂无旧版备份';}catch{return '备份状态暂时不可读';}}
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
function rewardFlight(origin){
  if(!origin||reducedMotion.matches)return;
  for(const [index,selector] of ['.v-cash','.v-stars'].entries()){
    const receiver=$(selector),to=receiver.getBoundingClientRect(),piece=document.createElement('span');
    piece.className='resource-flight';piece.innerHTML=icon(index?'star':'coin');
    Object.assign(piece.style,{left:`${origin.left+origin.width/2}px`,top:`${origin.top+origin.height/2}px`,animationDelay:`${index*.1}s`});
    piece.style.setProperty('--dx',`${to.left+to.width/2-origin.left-origin.width/2}px`);
    piece.style.setProperty('--dy',`${to.top+to.height/2-origin.top-origin.height/2}px`);
    $('#effects').append(piece);
    setTimeout(()=>{receiver.classList.add('receiving');setTimeout(()=>receiver.classList.remove('receiving'),600);},700+index*100);
    setTimeout(()=>piece.remove(),1100);
  }
}
function renderBoard(popIndex=-1){
  const focused=document.activeElement?.dataset.cell;
  board.innerHTML=state.board.map((item,i)=>{
    const locked=isLocked(i),producer=!!item&&isSource(item),bubble=item?.family==='bubble';
    const status=producer?producerStatus(state,item):null;
    const label=locked?`锁定，${item?itemName(item):'待整理台面'}`:item?`${itemName(item)}${producer?'，点击生产':`，${item.level||1}级`}`:'空格';
    return `<button class="cell ${item?'occupied':'empty'} ${producer?'producer':''} ${producer&&status.ready&&!locked&&state.energy>0?'ready-producer':''} ${locked?'locked':''} ${bubble?'bubble':''} ${status&&!status.ready?'cooling':''} ${['energy','coins','chest'].includes(item?.family)?'resource-item':''} ${selected===i?'selected':''} ${hinted.includes(i)?'hint':''} ${popIndex===i?'pop':''}" data-cell="${i}" style="${motionPhase(item?.id||i)}" aria-label="第${Math.floor(i/7)+1}行第${i%7+1}格，${esc(label)}" title="${esc(label)}" aria-pressed="${selected===i}">${item?`<span class="item-art">${itemArt(item)}</span><span class="item-level">${producer?'Lv'+item.level:bubble?'✦':item.level}</span>`:''}${locked?`<span class="lock-badge">${glyph('lock')}</span>`:''}${producer&&!locked?`<span class="cooldown-label" data-cooldown="${i}">${status.ready?`${status.charges}次`:formatTime(status.cooldownRemaining)}</span>`:''}${item&&item.family!=='bubble'&&!producer&&sourceRules(item).auto?`<span class="cooldown-label">存${item.autoBuffer} · ${formatTime(item.autoRemaining)}</span>`:''}${item?.openedAt!==null&&item?.timerRemaining>0?`<span class="cooldown-label">${formatTime(item.timerRemaining)}</span>`:''}</button>`;
  }).join('');
  if(focused!==undefined)board.querySelector(`[data-cell="${focused}"]`)?.focus({preventScroll:true});
}
function renderStats(){
  $('#energy-count').textContent=state.energy;$('#coin-count').textContent=state.coins.toLocaleString();$('#completed-count').textContent=state.completed;$('#order-count').textContent=activeOrders(state).length;
  const level=getLevel(state),names=['见习小厨','烘焙新秀','人气主厨','美味专家','厨房明星'];
  $('#kitchen-level-label').textContent=`Lv. ${level}`;$('.puppy-profile').setAttribute('aria-label',`小狗店长，等级 ${level}，${LEVEL_NAMES[Math.min(level-1,4)]}，查看成长进度`);const within=state.xp-levelFloor(level),required=100+20*(level-1);$('#xp-progress').style.width=`${Math.min(100,within/required*100)}%`;$('#xp-label').textContent=`${within}/${required}`;
  $('#star-count').textContent=state.stars;$('#gem-count').textContent=state.gems;
  $('.v-meter').setAttribute('aria-label',`电量 ${state.energy}/${state.maxEnergy}，点击补充`);
  $('.v-cash').setAttribute('aria-label',`小猪存钱罐，${state.coins} 金币`);
  $('.v-stars').setAttribute('aria-label',`许愿星罐，${state.stars} 颗星星`);
  const progress=getChapterProgress(state), nextTask=progress.tasks.find(task=>!task.done);
  $('#quest-copy').textContent=progress.allComplete?'开店手账完成，继续发现世界美味':progress.ready?`${progress.chapter.name}完成，领取开店礼`:`下一步：${mainOrder(state)?.title||'使用星星布置本章'}`;
  $('#quest-progress').textContent=progress.allComplete?'✓':`${progress.completed}/${progress.total}`;
  $('.e-speech').classList.toggle('task-ready',progress.ready);
  $('#storage-count').textContent=`${state.inventory.length}/${state.storageCapacity}`;
  $('#gift-count').textContent=state.pending.length?String(state.pending.length):dailyReady()?'领':'✓';
  $('#gift-count').classList.toggle('attention',state.pending.length>0||dailyReady());
  $('#sound-button').classList.toggle('is-playing',musicEnabled);
  $('#sound-button').setAttribute('aria-label',`收音机，背景音乐${musicEnabled?'开启':'关闭'}，操作音效${effectsEnabled?'开启':'关闭'}`);
}
function renderSelection(){
  const item=state.board[selected];
  if(selected!==null&&isLocked(selected)){
    $('#selection-card').innerHTML=`<span class="selected-art">${item?itemArt(item):icon('lock')}</span><div class="selection-copy"><strong>${item?esc(itemName(item)):'待整理台面'}</strong><p>${item?'拖入相同物品合成，即可解锁。':'在相邻格合成，即可清理空台面。'}</p></div>${button(`整理 ${unlockCost(state,selected)}币`,'unlock')}`;return;
  }
  if(!item){$('#selection-card').innerHTML=`${state.discarded?button('撤回丢弃','undo-discard'):''}<div class="selection-copy"><strong>合成料理板</strong><p>${state.merges?'拖动相同物品，合出美味':'拖动两份小麦，合出面粉'}</p></div>${button('找一找 ✧','hint')}`;return;}
  let description='',actions='';
  if(isSource(item)){
    const status=producerStatus(state,item);description=status.ready?`余 ${status.charges}/${status.maxCharges} 次 · ${item.openedAt!==null?'已开启，禁止合成/剪切/升级':'未开启，同级可合成'}`:`冷却 ${formatTime(status.cooldownRemaining)} · 可使用补货箱或加速道具`;
    actions=button('生产','generate',false,`data-index="${selected}"`)+button('更多','item');
  }else if(item.family==='bubble'){
    description=`限时惊喜 · ${formatTime(item.expiresAt-Date.now())} 后变金币`;
    actions=button(`${item.cost}钻取出`,'bubble-buy')+button('变金币','bubble-dismiss');
  }else{
    const next=CHAINS[item.family]?.[item.level];description=next?`2份可合成${next.name}`:'已到最高级，可交单、做菜或收纳';
    if(['resource','legacy'].includes(definition(item)?.kind)){description=definition(item).valueUnit==='draws'?`容器剩余 ${item.remainingDraws} 次 · 开启后不能合成`:sourceDescription(itemKey(item));actions=button('使用 / 领取','collect')+button('更多','item');}
    else actions=button('收纳','store')+button('更多','item');
  }
  $('#selection-card').innerHTML=`<span class="selected-art">${itemArt(item)}</span><div class="selection-copy"><strong>${esc(itemName(item))}<span class="selection-meta">Lv.${item.level||1}</span></strong><p>${esc(description)}</p></div><div class="selection-actions">${actions}</div>`;
}
function renderOrders(){
  $('#orders').innerHTML=activeOrders(state).map((order,i)=>{const p=getOrderProgress(state,order);return `<article class="order-card ${p.ready?'is-ready':''}" data-order="${order.id}" style="${motionPhase(order.id)}"><div class="order-top">${(a=>`<span class="avatar ${a.name}">${a.svg}</span>`)(avatar(order.customer))}<div><h3>${esc(order.customer)}</h3><p>${esc(order.title)}</p></div></div><div class="order-needs">${p.needs.map(n=>`<div class="need ${!n.missing?'ready':''}" title="${esc(itemName(n))} ${n.have}/${n.count}"><span class="need-art">${itemArt(n)}</span><span class="need-count">${Math.min(n.have,n.count)}/${n.count}</span>${!n.missing?`<span class="need-check">${glyph('check')}</span>`:''}</div>`).join('')}</div><div class="order-bottom">${order.main?'':`<button class="order-refresh" data-refresh-order="${order.id}" aria-label="刷新${esc(order.customer)}订单">↻</button>`}<span class="reward"><span class="reward-coin">${icon('coin')}${order.coins}</span><small>★ ${order.stars||1}</small></span><button class="order-submit" data-fulfill="${order.id}" ${p.ready?'':'disabled'}>${p.ready?'交付 ✓':'待完成'}</button></div></article>`;}).join('');
}
function render(pop=-1){renderBoard(pop);renderStats();renderSelection();renderOrders();}
function act(result,{pop=-1,fx=null,showMessage=false}={}){
  if(!result.ok){toast(result.message);playSound('error');renderStats();renderSelection();return false;}
  hinted=[];save();render(pop);playSound(fx||result.type,result.item?.level);
  if(showMessage)toast(result.message);
  if(modal.open&&['storage','shop','rewards','tasks','recipes','energy','item','cash','stars','phone'].includes(modalView))refreshPanel();
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
  const item=state.board[index];
  if(item&&isSource(item)&&sourceRules(item).manual.mode==='recharge'&&!isLocked(index)){doGenerate(index);return;}
  selected=item||isLocked(index)?index:null;
  hinted=[];renderBoard();renderSelection();if(selected!==null)animateItem(selected,'tap');playSound('select');
}
function showHint(){const pair=findMerge(state);if(!pair){toast('暂时没有可合成的组合，试试生产器、仓库或礼物');return;}hinted=[pair.from,pair.to];selected=null;renderBoard();renderSelection();toast(`把发光的两份${itemName(state.board[pair.from])}拖到一起`);clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hinted=[];if(!pointer)renderBoard();},6000);}

function syncOpenObjects(){
  for(const [selector,views] of [['.e-cupboard',['storage']],['.e-book',['recipes','collection','sources']],['.e-phone',['phone','shop','settings','help']]]){
    const active=modal.open&&views.includes(modalView),element=$(selector);
    element.classList.toggle('is-open',active);element.setAttribute('aria-expanded',String(active));
  }
}
function openPanel(view){modalView=view;renderPanel();if(!modal.open)modal.showModal();$('#modal-close').focus({preventScroll:true});modal.scrollTop=0;syncOpenObjects();syncMotion();}
function refreshPanel(){const scroll=modal.scrollTop;renderPanel();modal.scrollTop=scroll;}
function panelHeader(title,description){return `<h2>${title}</h2><p class="modal-intro">${description}</p>`;}
function resourcePortrait(selector){
  const source=$(selector),copy=document.createElement('div');copy.className=source.className;
  copy.innerHTML=source.innerHTML;
  copy.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  return `<div class="resource-portrait" aria-hidden="true">${copy.outerHTML}</div>`;
}
function bookTabs(){return `<div class="book-tabs" aria-label="料理手账内容"><button data-action="recipes" class="${modalView==='recipes'?'active':''}" aria-pressed="${modalView==='recipes'}">食谱</button><button data-action="collection" class="${modalView==='collection'?'active':''}" aria-pressed="${modalView==='collection'}">图鉴</button></div>`;}
function renderPanel(){
  modal.dataset.view=modalView;
  let html='';
  if(modalView==='profile'){
    const level=getLevel(state),xp=state.xp-levelFloor(level),needed=100+20*(level-1),percent=Math.min(100,xp/needed*100);
    html=panelHeader('小狗店长', '一起把小狗厨房经营得暖暖的。')+`<div class="profile-card"><span class="puppy-avatar" aria-hidden="true"></span><div><strong>Lv. ${level}</strong><p>${LEVEL_NAMES[Math.min(level-1,4)]}</p></div></div><div class="profile-progress" role="progressbar" aria-label="当前等级经验" aria-valuemin="0" aria-valuemax="${needed}" aria-valuenow="${Math.min(xp,needed)}"><span style="width:${percent}%"></span></div><p class="source-note">经验 ${xp}/${needed} · ${level===100?'已达最高等级':`再获得 ${needed-xp} 经验升到下一级`}</p><p class="source-note">首次发现物品、完成客人的订单，就能和小狗一起成长。</p>${button('打开开店手账','tasks')}`;
  }else if(modalView==='phone'){
    html=panelHeader('店长的手机','采购、设置和开店指南，都装进口袋里。')+`<div class="phone-apps"><button class="phone-app" data-action="shop">${glyph('bag')}<span>菜篮子采购</span></button><button class="phone-app" data-action="settings">${glyph('sliders')}<span>厨房设置</span></button><button class="phone-app" data-action="help">${glyph('book')}<span>开店指南</span></button><button class="phone-app" data-action="energy">${glyph('energy')}<span>电量补给</span></button></div>`;
  }else if(modalView==='cash'){
    html=panelHeader('小猪存钱罐',`肚子里攒下了 ${state.coins.toLocaleString()} 金币。`)+resourcePortrait('.v-cash')+`<p class="source-note">交单、金币资源能攒金币，采购、刷新与扩容收纳柜会花费金币。体力使用钻石购买。</p><div class="panel-actions">${button('去采购','shop')}${button('看看收纳柜','storage')}</div>`;
  }else if(modalView==='stars'){
    html=panelHeader('许愿星星罐',`已经收好 ${state.stars} 颗折纸星星。`)+resourcePortrait('.v-stars')+`<p class="source-note">每次交付订单都会收到许愿星。每章八单完成后使用星星布置厨房，十二章合计216星。</p><p class="source-note">现在完成小狗店长的章节任务就能解锁新设备，无需花费星星。</p>${button('看看开店手账','tasks')}`;
  }else if(modalView==='tasks'){
    const progress=getChapterProgress(state),chapter=progress.chapter;
    html=panelHeader('小狗店长的开店手账',chapter?`第 ${state.stage+1} / 12 章 · ${chapter.name}`:'十二章已经完成，继续收集主厨荣誉。');
    if(chapter){html+=`<p class="source-note">${chapter.description} 已完成 ${progress.completed}/8 单；现有 ${state.stars} 星。</p>`;
    html+=BALANCE.storyOrders.filter(o=>o.chapter===state.stage+1).map(o=>`<article class="balance-task ${state.mainCompleted.includes(o.id)?'done':''}"><b>${state.mainCompleted.includes(o.id)?'✓':mainOrder(state)?.id===o.id?'→':'○'} ${esc(o.title)}</b><p>${o.needs.map(n=>`${itemName(n)} ×${n.count}`).join('、')}</p><small>+${o.coins}金币 · +${o.xp}XP · +${o.stars}星</small></article>`).join('');
    html+=`<p class="source-note">结算后解锁：${chapter.unlockNextProducers.map(id=>PRODUCER_DEFS[id].name).join('、')||'收藏里程碑'}。奖励将送入待领区。</p><button class="primary-button" data-action="chapter-claim" data-stage="${state.stage}" ${progress.ready?'':'disabled'}>使用 ${chapter.stars} 星星布置本章</button>`;}
    html+=`<div class="chapter-history">${CHAPTERS.map((c,i)=>`<p>${i<state.stage?'✓':i===state.stage?'→':'○'} ${i+1}. ${c.name}</p>`).join('')}</div>`;
  }else if(modalView==='collection'){
    const all=Object.values(ITEMS).filter(x=>x.kind!=='legacy'),known=state.discovered.filter(id=>ITEMS[id]?.kind!=='legacy').length,family=CHAINS[catalogFamily]?catalogFamily:'food';
    html=bookTabs()+panelHeader('厨房美味图鉴',`已发现 ${known} / ${all.length} 种新版物品，另保留11项旧档资产。点击物品查看等级、合成与来源。`);
    html+=`<select id="family-filter" aria-label="选择图鉴系列">${Object.entries(FAMILY_META).map(([id,m])=>`<option value="${id}" ${id===family?'selected':''}>${m.name} · ${CHAINS[id].length}项</option>`).join('')}</select><div class="inventory-grid">${CHAINS[family].map(item=>`<button class="collection-item" data-catalog-item="${item.id}"><span>${itemArt(item)}</span><strong>${item.name}</strong><small>Lv.${item.level} · ${state.discovered.includes(item.id)?'已发现':'待发现'}</small></button>`).join('')}</div><button class="primary-button" data-action="sources" data-family-source="${family}">查看来源</button><a class="primary-button" href="./catalog.html" target="_blank">查看全量视觉目录</a>`;
  }else if(modalView==='storage'){
    html=panelHeader('厨房收纳柜',`已使用 ${state.inventory.length} / ${state.storageCapacity} 格。收纳物品保留等级，取回棋盘后才能交付订单。`);
    html+=`<div class="inventory-grid">${Array.from({length:state.storageCapacity},(_,i)=>{const item=state.inventory[i];return `<button class="inventory-slot" ${item?`data-retrieve="${i}"`:'disabled'}>${item?`${itemArt(item)}<strong>${esc(itemName(item))}</strong><small>Lv.${item.level} · 取回</small>`:'<span>＋</span><small>空闲位置</small>'}</button>`;}).join('')}</div>`;
    if(selected!==null&&state.board[selected]&&!isLocked(selected))html+=`<button class="primary-button" data-action="store">收纳当前选中的${esc(itemName(state.board[selected]))}</button>`;
    html+=`<button class="primary-button" data-action="expand-storage">扩容两格 · ${storageExpansionCost(state)} 金币</button>`;
  }else if(modalView==='shop'){
    html=panelHeader('厨房采购铺',`现有 ${state.coins} 金币。生产器与礼盒放入礼物区，电量和辅助道具立即到账。`);
    html+=SHOP_ITEMS.map(item=>`<article class="shop-card">${panelIcon(item.icon)}<div class="panel-copy"><strong>${esc(item.name)}</strong><p>${esc(item.description)}</p><small>${item.unlockStage>state.stage?`完成第 ${item.unlockStage} 章解锁`:item.type==='producer'?'同种同级生产器可拖动合并升级':'游戏金币购买'}</small></div><button class="small-button" data-buy="${item.id}" ${item.unlockStage>state.stage||state.coins<item.cost?'disabled':''}>${item.cost}币</button></article>`).join('');
  }else if(modalView==='rewards'){
    html=panelHeader('小狗店长的礼物与道具',`待领 ${state.pending.length} 件；每日3单、每周20单可领设备包。`);
    html+=`<div class="panel-actions">${button(dailyReady()?'每日开店礼':'今日已领','daily',!dailyReady())}${button(`今日休息 ${state.day.breaks}/3`,'break',state.day.breaks>=3)}${button(`日委托 ${state.day.orders}/3`,'commission-day')}${button(`周委托 ${state.week.orders}/20`,'commission-week')}</div>`;
    html+=`<p>每5份成本≥4的正式订单奖励礼盒，每日上限3个。当前计数 ${state.chestProgress}/5，今日 ${state.day.chests}/3。</p>`;
    if(state.pending.length)html+=`<div class="inventory-grid">${state.pending.slice(0,24).map(item=>`<div class="inventory-slot">${itemArt(item)}<strong>${esc(itemName(item))}</strong><small>Lv.${item.level}</small></div>`).join('')}</div><button class="primary-button" data-action="claim">领取下一件（剩 ${state.pending.length}）</button>`;
    html+=`<h3>随身道具</h3><div class="inventory-grid">${state.tools.map(item=>`<button class="inventory-slot" data-tool="${item.id}">${itemArt(item)}<strong>${esc(itemName(item))}</strong><small>选择使用</small></button>`).join('')}</div>`;
    if(state.legacyFullRefill)html+=`<button class="primary-button" data-action="hourglass">旧沙漏 ×${state.legacyFullRefill} · 补满当前选中设备</button>`;
    html+=`<p>待领余额：${Object.entries(state.credits).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('、')||'暂无'}</p>${button('领取可用额度','credits')}`;

  }else if(modalView==='recipes'){
    html=bookTabs()+panelHeader('世界料理手账','指定食材 + 对应厨具 = 新料理。食材会消耗，厨具保留；更高级的厨具也能使用。');
    html+=RECIPES.map(recipe=>{const p=getRecipeProgress(state,recipe);return `<article class="recipe-card"><div class="panel-copy"><strong>${esc(recipe.name)}</strong><p>${esc(recipe.description)}</p></div><div class="recipe-needs">${p.needs.map(n=>`<span class="need ${!n.missing?'ready':''}" title="${esc(itemName(n))}"><span class="need-art">${itemArt(n)}</span><span class="need-count">${Math.min(n.have,n.count)}/${n.count}</span></span>`).join('')}<span class="recipe-arrow">→</span><span class="recipe-output" title="${esc(itemName(recipe.output))}">${itemArt(recipe.output)}</span></div><div class="recipe-tool">${icon('pan')} ${esc(p.toolName||CHAINS.tools[recipe.toolLevel-1]?.name)}或更高级厨具 · ${p.toolReady?'已就绪 · 保留使用':'台面暂缺'}</div><button class="primary-button" data-cook="${recipe.id}" ${p.ready?'':'disabled'}>${recipe.unlockStage>state.stage?`完成第 ${recipe.unlockStage} 章解锁`:p.ready?'开始烹饪':'准备食材与厨具'}</button></article>`;}).join('');
  }else if(modalView==='sources'){
    html=panelHeader('物品来源',FAMILY_META[catalogFamily]?.name||'厨房物品');
    html+=CHAINS[catalogFamily].map(d=>`<article class="store-card">${panelIcon(d.icon)}<div class="panel-copy"><strong>${d.name} · L${d.level}</strong><p>${esc(sourceDescription(d.id))}</p><small>${d.mergeTo?'两份合成 '+ITEMS[d.mergeTo].name:sourceRules(d).cross?'两份跨链合成 '+ITEMS[sourceRules(d).cross.output].name:'本系列末端'}</small></div></article>`).join('');

  }else if(modalView==='item'){
    const item=state.board[selected];if(!item){modal.close();return;}const d=definition(item),r=sourceRules(item),status=producerStatus(state,item);
    html=panelHeader(itemName(item),`${FAMILY_META[item.family]?.name} · Lv.${item.level}`)+`<div class="energy-big">${itemArt(item)}</div><p class="source-note">${esc(sourceDescription(d.id))}</p><p class="source-note">${esc(ruleSummary(item))}</p>`;
    if(r.manual)html+=`<p>可用 ${status.charges}/${status.maxCharges} 次 ${status.cooldownRemaining?'· 下批 '+formatTime(status.cooldownRemaining):''} ${item.stockOverflow?'· 溢出库存 '+item.stockOverflow:''}</p>${button('生产','generate',false,`data-index="${selected}"`)}`;
    if(r.auto)html+=`<p>自动产出 ${ITEMS[r.auto.output].name}，缓冲 ${item.autoBuffer}/${r.auto.capacity}，下份 ${formatTime(item.autoRemaining)}。</p>`;
    if(item.timerRemaining!==null)html+=`<p>${r.delay?'成熟':'开锁'}倒计时 ${formatTime(item.timerRemaining)} · 入仓暂停。</p>`;
    if(item.remainingDraws!==null)html+=`<p>剩余 ${item.remainingDraws} 次 ${item.openedAt!==null?'· 已开启，禁止合成/剪切/升级':'· 未开启'}</p>`;
    if(item.timeCredit)html+=`<p>秒表信用 ${formatTime(item.timeCredit)}</p>`;
    html+=`<p>${item.protected?'供给源保护 · ':''}${item.openedAt!==null?'已开启':'未开启'} · 售价 ${d.sellCoins} 金币</p><div class="panel-actions">${button('收纳','store')}${button('使用道具','tool-picker')}${button('出售','sell-confirm')}${button('丢弃（30秒可撤回）','discard')}</div>`;
    if(d.kind==='resource'||d.kind==='legacy')html+=button('领取 / 使用','collect');

  }else if(modalView==='sell-confirm'){
    const item=state.board[selected];if(!item){modal.close();return;}html=panelHeader(`出售${esc(itemName(item))}？`,`出售后获得 ${definition(item)?.sellCoins||0} 金币。`)+`<div class="panel-actions">${button('保留物品','item')}${button('确认出售','sell-now')}</div>`;
  }else if(modalView==='energy'){
    const purchase=BALANCE.economy.energyPurchases[state.day.purchases];
    html=panelHeader('体力与钻石',`体力 ${state.energy}/100 · 钻石 ${state.gems}。每120秒恢复1点；手动体力上限999，超额保留。`)+`<div class="energy-big">${icon('energy')}</div><p>无限体力剩余 ${formatTime(state.infiniteUntil-Math.max(state.lastNow,Date.now()))}</p><button class="primary-button" data-action="refill" ${!purchase||state.gems<purchase.gems?'disabled':''}>${purchase?`${purchase.gems}钻石补充100体力`:'今日购买已达4次'}</button><button class="primary-button" data-action="break" ${state.day.breaks>=3?'disabled':''}>休息 +25体力（${state.day.breaks}/3）</button>${button('今日礼物','rewards')}`;

  }else if(modalView==='music'){
    html=panelHeader('小狗厨房的声音','原创轻快循环配乐，搭配点击、生产、合成、交单、烹饪和开店奖励音效。首次操作后开始播放。');
    html+=`<div class="settings-row"><span>背景音乐<small>轻快铃音、拨弦与温暖低音</small></span>${button(musicEnabled?'已开启':'已关闭','toggle-music')}</div><label class="settings-row">音乐音量 <input class="music-slider" type="range" min="0" max="100" value="${Math.round(musicVolume*100)}" data-volume="music" aria-label="背景音乐音量"></label><div class="settings-row"><span>操作音效<small>每种操作都有不同的声音反馈</small></span>${button(effectsEnabled?'已开启':'已关闭','toggle-effects')}</div><label class="settings-row">音效音量 <input class="music-slider" type="range" min="0" max="100" value="${Math.round(effectsVolume*100)}" data-volume="effects" aria-label="操作音效音量"></label>`;
  }else if(modalView==='settings'){
    html=panelHeader('厨房小设置','按自己的节奏，慢慢收集每一份美味。')+`<div class="settings-row"><span>存档与调参记录<small>版本3 · ${state.balanceVersion}</small></span>${button('导出备份','export-save')}${button('导出事件','export-events')}</div><div class="settings-row"><span>迁移前备份<small>${backupSummary()}；恢复时保留当前进度副本</small></span>${button('导出原始旧档','export-legacy')}${button('恢复旧备份','restore-backup')}</div><div class="settings-row"><span>玩法说明<small>生产、合成、做菜、交单与章节任务</small></span>${button('查看','help')}</div><div class="settings-row"><span>音乐和音效<small>分别开关与调节音量</small></span>${button('调整','music')}</div><div class="settings-row"><span>自动存档<small>${storageAvailable?'当前浏览器自动保存，旧版进度已兼容':'当前浏览器暂时无法保存'}</small></span>自动</div><div class="settings-row"><span>重新开张<small>清空当前进度，回到新手厨房</small></span>${button('重新开始','reset-confirm')}</div>`;
  }else if(modalView==='help'){
    html=panelHeader('厨房店长小手册','主玩法是两两合成，食谱与开店任务让每一件物品都有用途。');
    const steps=[['生产与升级','点击篮子、厨具架等生产器消耗1电量获取材料。次数用完会冷却，同种同级生产器可拖动合并升级。'],['合成与解锁','点击物品只切换选中，拖动相同种类和等级的物品合成升级。拖入蒙尘的相同物品可解锁；空的锁定格可通过相邻合成整理，也能花金币清理。'],['订单与章节','订单只计算台面上的已解锁物品。交单可得金币、经验和许愿星；完成小狗店长手账的任务，逐步解锁咖啡、香草、亚洲及环球料理设备。星星用于章节结算布置。'],['食材与厨具','打开食谱，凑齐指定材料和对应等级厨具即可做菜。材料会消耗，厨具可以反复使用；更高级厨具同样有效。'],['仓库与礼物','在物品信息栏收纳物品；仓库可用金币扩容。每5份合格订单有礼盒，每日有开店礼。礼盒、金币和电量道具也能合成升级。'],['辅助道具','剪刀把2级以上材料拆成两份上一级，沙漏推进全棋盘生产时钟，补货箱增加选中生产器库存。点击选中物品后，在“更多”里使用。'],['惊喜与自动产出','高级合成有机会产生限时泡泡，可以购买或变为金币。香草花园会定时自动产出，先给它留出相邻空位。'],['音乐与存档','原创音乐在首次操作后播放；离开页面会暂停。进度自动保存，音效与配乐可以分别关闭。']];
    html+=steps.map(([title,copy],i)=>`<div class="guide-step"><span class="step-num">${i+1}</span><div><strong>${title}</strong><p>${copy}</p></div></div>`).join('');
  }else if(modalView==='tool-picker'){
    const tools=[...state.tools,...state.board.filter((x,i)=>x&&i!==selected&&['splitter','charge','stopwatch','upgrade','infinite','timeskip','backpack'].includes(x.family))];
    html=panelHeader('使用辅助道具','先选道具，再选目标；确认前会展示实际结果。')+`<div class="inventory-grid">${tools.map(item=>`<button class="inventory-slot" data-tool="${item.id}">${itemArt(item)}<strong>${itemName(item)}</strong></button>`).join('')}</div>`;
  }else if(modalView==='tool-target'){
    const tool=state.tools.find(x=>x.id===toolSelection)||state.board.find(x=>x?.id===toolSelection);if(!tool){modal.close();return;}
    html=panelHeader(`使用${itemName(tool)}`,'选择台面上的目标，再预览结果。')+`<div class="inventory-grid">${state.board.map((x,i)=>x&&x.id!==toolSelection&&!isLocked(i)?`<button class="inventory-slot" data-tool-target="${i}">${itemArt(x)}<strong>${itemName(x)}</strong><small>第${i+1}格</small></button>`:'').join('')}</div>`;
  }else if(modalView==='tool-preview'){
    const preview=previewTool(state,resolveToolSelection(),toolTarget);
    html=panelHeader('确认使用道具',preview.message)+`<p class="source-note">${preview.ok?`影响 ${preview.preview.boardChanges} 个台面物品；仓库 ${preview.preview.storage} 格；无限体力 ${preview.preview.infiniteSeconds} 秒。`:''}</p>${preview.preview?.target?`<div class="energy-big">${itemArt(preview.preview.target)}</div><p>目标库存 ${preview.preview.target.stock??'—'}，溢出 ${preview.preview.target.stockOverflow}，秒表信用 ${formatTime(preview.preview.target.timeCredit)}</p>`:''}${button('确认使用','tool-confirm',!preview.ok)}${button('返回道具','tool-picker')}`;
  }else if(modalView==='catalog-detail'){
    const d=ITEMS[catalogDetail];html=panelHeader(d.name,`${FAMILY_META[d.family].name} · L${d.level} · ${d.kind}`)+`<div class="energy-big">${itemArt(d)}</div><p>${esc(sourceDescription(d.id))}</p><p>${esc(ruleSummary(d))}</p><p>${d.mergeTo?'两份合成 '+ITEMS[d.mergeTo].name:sourceRules(d).cross?'跨链合成 '+ITEMS[sourceRules(d).cross.output].name:'无法普通合成'} · 售价 ${d.sellCoins}金币</p><button class="primary-button" data-action="collection">返回图鉴</button>`;
  }else if(modalView==='reset-confirm')html=panelHeader('让小狗厨房重新开张？','当前的棋盘、仓库、金币、章节、订单、图鉴都会清空。')+`<div class="reset-warning">此操作会覆盖当前浏览器中的游戏进度。</div><div class="reset-actions">${button('保留进度','settings')}${button('确定重新开始','reset')}</div>`;
  $('#modal-content').innerHTML=html+(modalView==='reset-confirm'?'':'<button class="primary-button" data-action="close">回到小狗厨房</button>');
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
  if(target.dataset.tool){selectTool(target.dataset.tool);return;}
  if(target.dataset.toolTarget!==undefined){toolTarget=Number(target.dataset.toolTarget);openPanel('tool-preview');return;}
  if(target.dataset.catalogItem){catalogDetail=target.dataset.catalogItem;openPanel('catalog-detail');return;}
  if(target.dataset.refreshOrder){act(refreshOrder(state,target.dataset.refreshOrder),{showMessage:true});return;}
  if(target.dataset.family){catalogFamily=target.dataset.family;refreshPanel();playSound('tap');return;}
  if(target.dataset.retrieve!==undefined){const r=retrieveItem(state,Number(target.dataset.retrieve));if(r.ok)selected=r.index;act(r,{pop:r.index,showMessage:true});return;}
  if(target.dataset.buy){act(buyShopItem(state,target.dataset.buy),{showMessage:true});return;}
  if(target.dataset.cook){const r=cookRecipe(state,target.dataset.cook);if(r.ok){selected=r.index;modal.close();}if(act(r,{pop:r.index,fx:'cook',showMessage:true}))celebrate(board.querySelector(`[data-cell="${r.index}"]`),'新鲜出炉！',true,'cook');return;}
  if(target.dataset.locate!==undefined){selected=Number(target.dataset.locate);modal.close();renderBoard();renderSelection();playSound('select');return;}
  if(target.dataset.fulfill){const origin=target.getBoundingClientRect(),r=fulfillOrder(state,target.dataset.fulfill);if(r.ok)selected=null;if(act(r,{fx:'order'})){puppyMood('cheering');rewardFlight(origin);celebrate($('#orders'),`+${r.coins} 金币 · +${r.stars||1} 许愿星`,true);toast(r.message);}return;}
  const action=target.dataset.action;
  if(['collection','storage','shop','rewards','tasks','phone','cash','stars','recipes','sources','item','energy','music','settings','help','reset-confirm','sell-confirm','tool-picker'].includes(action)){
    if(target.dataset.familySource)catalogFamily=target.dataset.familySource;
    openPanel(action);playSound('tap');return;
  }
  switch(action){
    case 'qa-advance':tick(state,state.lastNow+3600000);render();save();toast('场景时钟推进1小时');break;
    case 'qa-reset':state=makeFixture(qa);selected=null;hinted=[];modal.close();render();save();toast('验收场景已重置');break;
    case 'close':modal.close();playSound('tap');break;
    case 'hint':puppyMood('waving');showHint();playSound('tap');break;
    case 'generate':doGenerate(Number(target.dataset.index));break;
    case 'store':{const r=storeItem(state,selected);if(r.ok)selected=null;act(r,{showMessage:true});break;}
    case 'expand-storage':act(expandStorage(state),{fx:'unlock',showMessage:true});break;
    case 'claim':{const r=claimPending(state);if(r.ok)selected=r.index;act(r,{pop:r.index,fx:'collect',showMessage:true});break;}
    case 'daily':act(claimDaily(state),{fx:'daily',showMessage:true});break;
    case 'chapter-claim':{const r=claimChapter(state,Number(target.dataset.stage));if(act(r,{fx:'renovate',showMessage:true})){puppyMood('cheering');modal.scrollTop=0;celebrate($('.e-parcel'),'新章节开张啦！',true,'unlock');}break;}
    case 'unlock':{const r=unlockCell(state,selected);if(act(r,{pop:selected,fx:'unlock',showMessage:true}))celebrate(board.querySelector(`[data-cell="${selected}"]`),'新台面！',false,'unlock');break;}
    case 'collect':{if(['splitter','charge','stopwatch','upgrade','infinite','timeskip','backpack'].includes(state.board[selected]?.family)){selectTool(state.board[selected].id);break;}const r=collectItem(state,selected);if(r.ok&&!state.board[selected])selected=null;act(r,{showMessage:true});break;}
    case 'bubble-buy':case 'bubble-dismiss':{const r=resolveBubble(state,selected,action==='bubble-buy');act(r,{pop:selected,fx:'collect',showMessage:true});break;}
    case 'scissors':case 'hourglass':act(useBooster(state,action,selected),{pop:selected,fx:'booster',showMessage:true});break;
    case 'sell-now':{const r=sellItem(state,selected);if(r.ok){selected=null;modal.close();}act(r,{fx:'sell',showMessage:true});break;}
    case 'break':act(claimBreak(state),{showMessage:true});break;
    case 'commission-day':case 'commission-week':act(claimCommission(state,action==='commission-day'?'day':'week'),{showMessage:true});break;
    case 'credits':act(claimCredits(state),{showMessage:true});break;
    case 'discard':{const r=discardItem(state,selected);if(r.ok){selected=null;modal.close();}act(r,{showMessage:true});break;}
    case 'undo-discard':act(undoDiscard(state),{showMessage:true});break;
    case 'tool-confirm':{const r=useTool(state,resolveToolSelection(),toolTarget);if(r.ok)modal.close();act(r,{showMessage:true});break;}
    case 'export-legacy':{const raw=localStorage.getItem(backupKey('migration-backup'));if(raw)download('little-kitchen-legacy-backup.json',raw);else toast('暂无旧档备份');break;}
    case 'export-save':download('little-kitchen-v3-save.json',JSON.stringify(state,null,2));break;
    case 'export-events':download('little-kitchen-events.json',JSON.stringify(state.events,null,2));break;
    case 'restore-backup':{const backup=localStorage.getItem(backupKey('migration-backup'))||localStorage.getItem(backupKey('v2-backup'))||localStorage.getItem(backupKey('v1-backup'));if(!backup){toast('暂无旧版备份');break;}localStorage.setItem(backupKey('before-rollback'),JSON.stringify(state));state=createGame(backup);selected=null;modal.close();render();save();toast('已恢复迁移前备份，并保留当前进度副本');break;}
    case 'refill':act(refillEnergy(state),{fx:'refill',showMessage:true});break;
    case 'toggle-music':musicEnabled=!musicEnabled;audio.setMusic(musicEnabled);writePref('little-kitchen-music',musicEnabled);renderStats();refreshPanel();break;
    case 'toggle-effects':effectsEnabled=!effectsEnabled;audio.setEffects(effectsEnabled);writePref('little-kitchen-sound',effectsEnabled);refreshPanel();if(effectsEnabled)playSound('tap');break;
    case 'reset':state=createGame();selected=null;hinted=[];modal.close();render();save();playSound('renovate');toast('新厨房开张啦！');break;
  }
});
document.addEventListener('change',event=>{if(event.target.id==='family-filter'){catalogFamily=event.target.value;refreshPanel();}});
document.addEventListener('input',event=>{
  const kind=event.target.dataset.volume;if(!kind)return;const value=Number(event.target.value)/100;
  if(kind==='music'){musicVolume=value;writePref('little-kitchen-music-volume',value);}else{effectsVolume=value;writePref('little-kitchen-effects-volume',value);}
  audio.setVolume(kind,value);
});
modal.addEventListener('close',()=>{syncMotion();syncOpenObjects();});
$('#modal-close').addEventListener('click',()=>modal.close());
modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();}});

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
  if(result.changed){save();if(!pointer)render();}
  else if(!pointer){
    board.querySelectorAll('[data-cooldown]').forEach(label=>{const item=state.board[Number(label.dataset.cooldown)];if(!item)return;const status=producerStatus(state,item);label.textContent=status.ready?`${status.charges}次`:formatTime(status.cooldownRemaining);});
    if(state.board[selected]&&isSource(state.board[selected])||state.board[selected]?.family==='bubble')renderSelection();
  }
}
document.addEventListener('visibilitychange',()=>{audio.setHidden(document.hidden);syncMotion();if(document.hidden){if(pointer)endPointer({pointerId:pointer.id},true);save();}else refreshTime();});
window.addEventListener('pagehide',()=>{save();audio.setHidden(true);});
window.addEventListener('pageshow',()=>{audio.setHidden(document.hidden);syncMotion();});
setInterval(()=>{if(!document.hidden)refreshTime();},1000);
for(const [id,name] of Object.entries({'recipe-art':'cake','parcel-art':'gift'}))$(`#${id}`).innerHTML=icon(name);
$('#cabinet-art').innerHTML=icon('flour')+icon('pan');
for(const [id,name] of Object.entries({'energy-icon':'energy','phone-icon':'bag','hint-icon':'sparkles','modal-close':'close'}))$(`#${id}`).innerHTML=glyph(name);
render();save();

if(state.migrationNotice&&!state.claimed['migration:notice']){toast(state.migrationNotice);state.claimed['migration:notice']=true;save();}

if(qaEnabled){const controls=document.createElement('aside');controls.className='qa-controls';controls.innerHTML='<b>本地验收 · '+qa+'</b><button data-action=qa-advance>推进1小时</button><button data-action=qa-reset>重置场景</button><a href=qa.html>切换场景</a>';document.body.prepend(controls);}
