import { CHAINS, FAMILY_META, PRODUCER_DEFS, RENOVATIONS, CHAPTERS, SHOP_ITEMS, RECIPES } from './catalog.mjs';
export { CHAINS, FAMILY_META, PRODUCER_DEFS, RENOVATIONS, CHAPTERS, SHOP_ITEMS, RECIPES };
export const BOARD_SIZE = 49;
export const ENERGY_INTERVAL = 30_000;
export const MAX_ENERGY = 100;
const MAX_MANUAL_ENERGY = 999;
const COMMODITIES = Object.keys(CHAINS).filter(family => !['energy','coins','chest'].includes(family));
const integer = (value, fallback, min = 0, max = 1_000_000_000) => Number.isSafeInteger(value) && value >= min && value <= max ? value : fallback;
const has = (obj, key) => Object.hasOwn(obj, key);
const validIndex = index => Number.isInteger(index) && index >= 0 && index < BOARD_SIZE;
const isCommodity = item => item && COMMODITIES.includes(item.family) && Number.isInteger(item.level) && item.level >= 1 && item.level <= CHAINS[item.family].length;
const isChainItem = item => item && typeof item.family === 'string' && has(CHAINS,item.family) && Number.isInteger(item.level) && item.level >= 1 && item.level <= CHAINS[item.family].length;
const isProducer = item => item?.family === 'producer' && typeof item.kind === 'string' && has(PRODUCER_DEFS,item.kind) && Number.isInteger(item.level) && item.level >= 1 && item.level <= 4;
const isLocked = (state,index) => state.locked.includes(index);
const keyOf = item => `${item.family}:${item.level}`;
const result = (state,ok,type,message,extra={}) => ({ok,type,message,state,...extra});
const freeIndex = state => state.board.findIndex((item,index) => item === null && !isLocked(state,index));
const nameOf = item => item.family === 'producer' ? PRODUCER_DEFS[item.kind].name : CHAINS[item.family]?.[item.level-1]?.name || '物品';
const validNow = now => Number.isFinite(now) && now >= 0 ? Math.floor(now) : Date.now();
const addCoins = (state,amount) => { state.coins = Math.min(1_000_000_000,state.coins+amount); };
function newItem(state,family,level) {
  const item = {id:`item-${state.nextItemId++}`,family,level};
  if (!state.discovered.includes(keyOf(item))) state.discovered.push(keyOf(item));
  return item;
}
function newProducer(state,kind,level=1,now=Date.now()) {
  return {id:`item-${state.nextItemId++}`,family:'producer',kind,level,charges:10+level*4,readyAt:0,...(kind==='herb'?{nextAutoAt:now+60000}:{})};
}
function random(state) {
  let n = state.rng >>> 0;
  n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
  state.rng = n >>> 0;
  return state.rng / 4294967296;
}
function allItems(state) { return [...state.board,...state.inventory,...state.pending].filter(Boolean); }
function reachableFamilies(state) {
  const kinds = new Set(allItems(state).filter(isProducer).map(item=>item.kind));
  return [...new Set([...kinds].flatMap(kind=>PRODUCER_DEFS[kind].families))];
}
function newOrder(state) {
  const serial = state.orderSerial++;
  const starters = [
    {title:'烘焙准备',customer:'小鹿',needs:[{family:'food',level:2,count:1}],coins:35,xp:20,stars:1},
    {title:'香煎早午餐',customer:'阿熊',needs:[{family:'tools',level:3,count:1}],coins:45,xp:25,stars:1},
    {title:'一篮新鲜',customer:'团团',needs:[{family:'vegetable',level:2,count:1},{family:'fruit',level:1,count:1}],coins:50,xp:25,stars:1},
  ];
  if (serial<3) return {id:`order-${serial+1}`,...starters[serial]};
  const families = reachableFamilies(state);
  if (!families.length) families.push('food');
  const family = families[(serial-3)%families.length];
  const maxLevel = Math.min(6,3+Math.floor(state.stage/2));
  const level = Math.min(maxLevel,2+Math.floor((serial-3)/families.length)%Math.max(1,maxLevel-1));
  const needs = [{family,level,count:serial%6===0?2:1}];
  if (serial%3===2 && families.length>1) {
    const second = families[(serial+1)%families.length];
    if (second !== family) needs.push({family:second,level:Math.max(1,level-1),count:1});
  }
  const effort = needs.reduce((sum,need)=>sum+2**(need.level-1)*need.count,0);
  return {id:`order-${serial+1}`,title:`${FAMILY_META[family].name}小订单`,customer:['小鹿','阿熊','团团','小兔','小猫'][serial%5],needs,coins:20+effort*7,xp:12+effort*3,stars:Math.min(3,1+Math.floor(effort/12))};
}
function baseState(now) {
  return {version:2,board:Array(BOARD_SIZE).fill(null),coins:120,energy:MAX_ENERGY,maxEnergy:MAX_ENERGY,xp:0,completed:0,merges:0,discovered:[],orders:[],orderSerial:0,nextItemId:1,generationCount:0,lastEnergyAt:now,stars:0,stage:0,inventory:[],storageCapacity:6,pending:[],boosters:{scissors:2,hourglass:2},dailyClaimDate:null,lastDailyClaimAt:0,locked:[],rng:0x45ab7e12,cooked:0};
}
function freshGame(now) {
  const state = baseState(now);
  for (const [kind,index] of [['food',0],['produce',3],['tools',6]]) state.board[index]=newProducer(state,kind,1,now);
  for (const [index,family,level] of [[8,'food',1],[9,'food',1],[10,'food',1],[22,'food',3],[14,'tools',1],[15,'tools',1],[19,'tools',2],[35,'food',1],[37,'vegetable',1],[39,'tools',1],[43,'food',2],[45,'fruit',1],[47,'tools',2]]) state.board[index]=newItem(state,family,level);
  state.locked=Array.from({length:14},(_,i)=>35+i);
  state.pending.push(newItem(state,'chest',1));
  state.orders=Array.from({length:3},()=>newOrder(state));
  return state;
}
function normalizeOrder(order) {
  if (!order || typeof order.id!=='string' || !/^order-[1-9]\d{0,8}$/.test(order.id) || !Array.isArray(order.needs) || !order.needs.length || order.needs.length>6) return null;
  const needs=[];
  for (const need of order.needs) {
    if (!isCommodity(need) || !integer(need.count,0,1,10)) return null;
    const existing=needs.find(item=>keyOf(item)===keyOf(need));
    if (existing) existing.count+=need.count; else needs.push({family:need.family,level:need.level,count:need.count});
  }
  if (needs.some(need=>need.count>10)) return null;
  return {id:order.id,title:typeof order.title==='string'?order.title.slice(0,40):'厨房小订单',customer:typeof order.customer==='string'?order.customer.slice(0,20):'邻居',needs,coins:integer(order.coins,35,1,2000),xp:integer(order.xp,20,1,2000),stars:integer(order.stars,1,1,3)};
}
export function createGame(saved=null,now=Date.now()) {
  now=validNow(now);
  if (typeof saved==='string') { try { saved=JSON.parse(saved); } catch { return freshGame(now); } }
  if (!saved || ![1,2].includes(saved.version) || !Array.isArray(saved.board) || saved.board.length!==BOARD_SIZE) return freshGame(now);
  const state=baseState(now);
  for (const field of ['coins','xp','completed','merges','generationCount','stars','cooked']) state[field]=integer(saved[field],state[field]);
  state.energy=integer(saved.energy,MAX_ENERGY,0,MAX_MANUAL_ENERGY);
  state.stage=integer(saved.stage,0,0,RENOVATIONS.length);
  state.orderSerial=integer(saved.orderSerial,3,3,100_000_000);
  state.nextItemId=integer(saved.nextItemId,1,1,100_000_000);
  state.storageCapacity=integer(saved.storageCapacity,6,6,60);
  state.rng=integer(saved.rng,0x45ab7e12,1,4294967295);
  state.lastEnergyAt=integer(saved.lastEnergyAt,now,0,now);
  state.dailyClaimDate=typeof saved.dailyClaimDate==='string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.dailyClaimDate)?saved.dailyClaimDate:null;
  state.lastDailyClaimAt=integer(saved.lastDailyClaimAt,0,0,8_640_000_000_000_000);
  state.boosters={scissors:integer(saved.boosters?.scissors,2,0,9999),hourglass:integer(saved.boosters?.hourglass,2,0,9999)};
  const known=new Set(Object.values(CHAINS).flat().map(item=>item.id));
  state.discovered=[...new Set(Array.isArray(saved.discovered)?saved.discovered.filter(key=>known.has(key)):[])];
  const rawItems=[...saved.board,...(Array.isArray(saved.inventory)?saved.inventory:[]),...(Array.isArray(saved.pending)?saved.pending:[])];
  for (const item of rawItems) if (typeof item?.id==='string' && /^item-[1-9]\d{0,8}$/.test(item.id)) state.nextItemId=Math.max(state.nextItemId,Number(item.id.slice(5))+1);
  const used=new Set();
  const restore=item=>{
    if (!item || typeof item!=='object') return null;
    let restored;
    if (isChainItem(item)) restored={family:item.family,level:item.level};
    else if (isProducer(item)) {
      const max=10+4*item.level;
      restored={family:'producer',kind:item.kind,level:item.level,charges:integer(item.charges,max,0,max),readyAt:integer(item.readyAt,0,0,8_640_000_000_000_000)};
      if (restored.charges===0 && restored.readyAt===0) restored.readyAt=now+PRODUCER_DEFS[item.kind].cooldownMs;
      if (item.kind==='herb') restored.nextAutoAt=integer(item.nextAutoAt,now+60000,0,8_640_000_000_000_000);
    } else if (item.family==='bubble' && isCommodity(item.item)) restored={family:'bubble',level:item.item.level,item:{family:item.item.family,level:item.item.level},expiresAt:integer(item.expiresAt,now,0,8_640_000_000_000_000),cost:integer(item.cost,10,1,5000)};
    else return null;
    const id=typeof item.id==='string' && /^[a-zA-Z0-9_-]{1,64}$/.test(item.id) && !used.has(item.id)?item.id:`item-${state.nextItemId++}`;
    used.add(id); restored={id,...restored};
    if (isChainItem(restored) && !state.discovered.includes(keyOf(restored))) state.discovered.push(keyOf(restored));
    return restored;
  };
  state.board=Array.from({length:BOARD_SIZE},(_,i)=>restore(saved.board[i]));
  state.inventory=(Array.isArray(saved.inventory)?saved.inventory:[]).map(restore).filter(item=>item && item.family!=='bubble');
  state.pending=(Array.isArray(saved.pending)?saved.pending:[]).map(restore).filter(item=>item && item.family!=='bubble');
  state.storageCapacity=Math.max(state.storageCapacity,state.inventory.length);
  state.locked=[...new Set((saved.version===1?Array.from({length:14},(_,i)=>35+i).filter(i=>!state.board[i]):Array.isArray(saved.locked)?saved.locked:[]).filter(i=>validIndex(i) && state.board[i]?.family!=='producer'))];
  // Repair missing base generators without overwriting a single legacy item.
  for (const kind of ['food','tools','produce']) if (!allItems(state).some(item=>isProducer(item)&&item.kind===kind)) {
    const producer=newProducer(state,kind,1,now); const index=freeIndex(state);
    if (index>=0) state.board[index]=producer; else state.pending.push(producer);
  }
  if (saved.version===1) state.pending.push(newItem(state,'chest',1));
  const usedOrders=new Set();
  state.orders=(Array.isArray(saved.orders)?saved.orders:[]).slice(0,3).map(normalizeOrder).filter(order=>{
    if (!order || usedOrders.has(order.id)) return false;
    usedOrders.add(order.id); state.orderSerial=Math.max(state.orderSerial,Number(order.id.slice(6))); return true;
  });
  while (state.orders.length<3) state.orders.push(newOrder(state));
  tick(state,now);
  return state;
}
export function tickEnergy(state,now=Date.now()) {
  if (!Number.isFinite(now) || now<state.lastEnergyAt) return 0;
  now=Math.floor(now);
  if (state.energy>=MAX_ENERGY) { state.lastEnergyAt=now; return 0; }
  const recovered=Math.min(MAX_ENERGY-state.energy,Math.floor((now-state.lastEnergyAt)/ENERGY_INTERVAL));
  if (recovered>0) { state.energy+=recovered; state.lastEnergyAt=state.energy>=MAX_ENERGY?now:state.lastEnergyAt+recovered*ENERGY_INTERVAL; }
  return recovered;
}
export function producerStatus(state,item,now=Date.now()) {
  if (!isProducer(item)) return {charges:0,maxCharges:0,cooldownRemaining:0,ready:false};
  const maxCharges=10+item.level*4;
  const cooldownRemaining=item.charges===0?Math.max(0,(item.readyAt||0)-now):0;
  const charges=cooldownRemaining===0 && item.charges===0?maxCharges:Math.min(maxCharges,item.charges ?? maxCharges);
  return {charges,maxCharges,cooldownRemaining,ready:charges>0};
}
function refreshProducer(state,item,now) {
  const status=producerStatus(state,item,now);
  if (item.charges!==status.charges || (status.ready && item.readyAt!==0)) { item.charges=status.charges; item.readyAt=status.ready?0:item.readyAt; return true; }
  return false;
}
const adjacent=index=>[index-7,index+7,...(index%7?[index-1]:[]),...(index%7<6?[index+1]:[])].filter(validIndex);
export function tick(state,now=Date.now()) {
  now=validNow(now);
  let changed=tickEnergy(state,now)>0;
  for (const item of allItems(state)) if (isProducer(item)) changed=refreshProducer(state,item,now)||changed;
  for (let index=0;index<BOARD_SIZE;index++) {
    const item=state.board[index];
    if (item?.family==='bubble' && now>=item.expiresAt) { state.board[index]=newItem(state,'coins',1); changed=true; }
    if (isProducer(item) && item.kind==='herb' && !isLocked(state,index) && now>=item.nextAutoAt) {
      const empty=adjacent(index).filter(i=>state.board[i]===null&&!isLocked(state,i));
      const count=Math.min(3,empty.length,1+Math.floor((now-item.nextAutoAt)/60000));
      for (let n=0;n<count;n++) state.board[empty[n]]=newItem(state,'herb',1);
      // A blocked garden keeps a ready harvest. Offline catches up at most three drops once.
      if (count>0) { item.nextAutoAt=now+60000; changed=true; }
    }
  }
  return {changed};
}
function locateProducer(state,selection) {
  if (validIndex(selection)) return {index:selection,item:state.board[selection]};
  const index=state.board.findIndex((item,index)=>isProducer(item)&&!isLocked(state,index)&&(item.id===selection||item.kind===selection));
  return {index,item:state.board[index]};
}
export function generate(state,selection,now=Date.now()) {
  now=validNow(now);
  const {index:producerIndex,item:producer}=locateProducer(state,selection);
  if (!isProducer(producer) || isLocked(state,producerIndex)) return result(state,false,'invalid','先选择一个已解锁的生产器');
  const index=freeIndex(state);
  if (index<0) return result(state,false,'full','台面满啦，先合成、收进仓库或完成订单吧');
  const status=producerStatus(state,producer,now);
  if (!status.ready) return result(state,false,'cooldown',`正在补货，${Math.ceil(status.cooldownRemaining/1000)} 秒后再来`,status);
  tickEnergy(state,now);
  if (state.energy<1) return result(state,false,'energy','电量用完啦，稍等片刻或领取电量补给');
  refreshProducer(state,producer,now);
  const families=PRODUCER_DEFS[producer.kind].families;
  const family=families.length>1&&random(state)<0.28?families[1]:families[0];
  const level=random(state)<0.08+producer.level*0.06?2:1;
  const item=newItem(state,family,level);
  state.energy--; state.generationCount++; producer.charges--;
  if (!producer.charges) producer.readyAt=now+Math.max(30000,PRODUCER_DEFS[producer.kind].cooldownMs-(producer.level-1)*10000);
  state.board[index]=item;
  return result(state,true,'generate',`获得${nameOf(item)}`,{index,item,producerIndex});
}
function sameMerge(a,b) { return a&&b && a.family!=='bubble'&&a.family===b.family&&a.level===b.level&&(a.family!=='producer'||a.kind===b.kind); }
function maxLevel(item) { return item.family==='producer'?4:CHAINS[item.family]?.length||0; }
export function move(state,from,to,now=Date.now()) {
  if (!validIndex(from)||!validIndex(to)||from===to) return result(state,false,'invalid','选择另一个格子');
  const item=state.board[from],target=state.board[to];
  if (!item) return result(state,false,'empty','这里还没有物品');
  if (isLocked(state,from)) return result(state,false,'locked','把相同物品合到这里，就能解锁');
  if (item.family==='bubble'||target?.family==='bubble') return result(state,false,'bubble','先选择领取或戳破泡泡');
  if (sameMerge(item,target)) {
    if (item.level>=maxLevel(item)) return result(state,false,'max','已经是最高级物品啦');
    const merged=item.family==='producer'?newProducer(state,item.kind,item.level+1,now):newItem(state,item.family,item.level+1);
    state.board[from]=null;state.board[to]=merged;state.merges++;state.xp+=item.level*2;
    const unlocked=state.locked.filter(i=>i===to || (state.board[i]===null&&(adjacent(to).includes(i)||adjacent(from).includes(i))));
    state.locked=state.locked.filter(i=>!unlocked.includes(i));
    let bubbleIndex=-1;
    if (isCommodity(merged)&&merged.level>=3&&state.merges%5===0) {
      bubbleIndex=freeIndex(state);
      if (bubbleIndex>=0) state.board[bubbleIndex]={id:`item-${state.nextItemId++}`,family:'bubble',level:merged.level,item:{family:merged.family,level:merged.level},expiresAt:now+60000,cost:6*2**merged.level};
    }
    return result(state,true,'merge',`合成了${nameOf(merged)}${unlocked.length?` · 解锁 ${unlocked.length} 格`:''}`,{from,to,item:merged,xp:item.level*2,unlocked,bubbleIndex});
  }
  if (isLocked(state,to)) return result(state,false,'locked',target?'需要相同类别、相同等级的物品来解锁':'在旁边合成，或花费金币解锁');
  state.board[from]=target;state.board[to]=item;
  return result(state,true,target?'swap':'move',target?'交换了两个物品的位置':'移动成功',{from,to,item});
}
function requirements(state,requested) {
  const combined=new Map();
  for (const need of requested) {
    const key=keyOf(need); const existing=combined.get(key);
    if (existing) existing.count+=need.count; else combined.set(key,{...need});
  }
  return [...combined.values()].map(need=>{
    const have=state.board.filter((item,index)=>!isLocked(state,index)&&item?.family===need.family&&item.level===need.level).length;
    return {...need,have,missing:Math.max(0,need.count-have)};
  });
}
export function getOrderProgress(state,order) {
  const needs=requirements(state,order.needs);
  return {ready:needs.every(need=>need.missing===0),matched:needs.reduce((sum,need)=>sum+Math.min(need.count,need.have),0),total:needs.reduce((sum,need)=>sum+need.count,0),needs};
}
function consumeNeeds(state,needs) {
  const consumed=[];
  for (const need of needs) for (let n=0;n<need.count;n++) {
    const index=state.board.findIndex((item,index)=>!isLocked(state,index)&&item?.family===need.family&&item.level===need.level);
    state.board[index]=null;consumed.push(index);
  }
  return consumed;
}
export function fulfillOrder(state,id) {
  const orderIndex=state.orders.findIndex(order=>order.id===id);
  if (orderIndex<0) return result(state,false,'invalid','这个订单已经完成啦');
  const order=state.orders[orderIndex],progress=getOrderProgress(state,order);
  if (!progress.ready) return result(state,false,'incomplete','还差一点点，先合成需要的物品吧');
  const consumed=consumeNeeds(state,progress.needs);
  addCoins(state,order.coins);state.xp+=order.xp;state.stars+=order.stars||1;state.completed++;
  if (state.completed%3===0) state.pending.push(newItem(state,'chest',1));
  state.orders[orderIndex]=newOrder(state);
  return result(state,true,'order',`订单完成！+${order.coins} 金币 · +${order.stars||1} 星星${state.completed%3===0?' · 礼盒已送达':''}`,{order,consumed,coins:order.coins,xp:order.xp,stars:order.stars||1});
}
export function getRecipeProgress(state,recipe) {
  if (typeof recipe==='string') recipe=RECIPES.find(item=>item.id===recipe);
  if (!recipe) return {ready:false,needs:[],toolReady:false,toolName:'厨具',toolIndex:-1,locked:true};
  const needs=requirements(state,recipe.needs);
  const toolIndex=state.board.findIndex((item,index)=>!isLocked(state,index)&&item?.family==='tools'&&item.level>=recipe.toolLevel);
  const toolReady=toolIndex>=0,locked=state.stage<recipe.unlockStage;
  return {ready:!locked&&toolReady&&needs.every(need=>need.missing===0),needs,toolReady,toolName:CHAINS.tools[recipe.toolLevel-1].name,toolIndex,locked};
}
export function cookRecipe(state,id) {
  const recipe=RECIPES.find(item=>item.id===id);
  if (!recipe) return result(state,false,'invalid','没有找到这份食谱');
  const progress=getRecipeProgress(state,recipe);
  if (progress.locked) return result(state,false,'locked',`完成第 ${recipe.unlockStage} 章后解锁`);
  if (!progress.toolReady) return result(state,false,'tool',`台面需要${progress.toolName}或更高级厨具，厨具不会被消耗`);
  if (!progress.ready) return result(state,false,'incomplete','先准备好食谱需要的食材');
  const consumed=consumeNeeds(state,progress.needs);
  const index=consumed[0] ?? freeIndex(state);
  const item=newItem(state,recipe.output.family,recipe.output.level);
  state.board[index]=item;state.xp+=recipe.xp||0;state.cooked++;
  if (recipe.coins) addCoins(state,recipe.coins);
  return result(state,true,'cook',`做好了${nameOf(item)}！厨具已保留`,{index,item,consumed,recipe});
}
export function refillEnergy(state,now=Date.now()) {
  tickEnergy(state,now);
  if (state.energy>=MAX_ENERGY) return result(state,false,'full','电量已经满啦');
  if (state.coins<30) return result(state,false,'coins','需要 30 金币，完成订单就能获得');
  const amount=Math.min(30,MAX_ENERGY-state.energy);
  state.coins-=30;state.energy+=amount;
  if (state.energy>=MAX_ENERGY) state.lastEnergyAt=now;
  return result(state,true,'refill',`补充了 ${amount} 点电量`,{amount,cost:30});
}
export function sellItem(state,index) {
  if (!validIndex(index)||!state.board[index]) return result(state,false,'empty','先选择一个物品');
  const item=state.board[index];
  if (isLocked(state,index)) return result(state,false,'locked','先解锁这个格子');
  if (item.family==='producer') return result(state,false,'producer','生产器不能出售，可以收进仓库');
  if (item.family==='bubble') return result(state,false,'bubble','戳破泡泡即可获得金币');
  if (!isCommodity(item)) return result(state,false,'resource','资源可以直接领取，礼盒可以打开');
  const coins=2**(item.level-1);state.board[index]=null;addCoins(state,coins);
  return result(state,true,'sell',`出售获得 ${coins} 金币`,{index,item,coins});
}
export function collectItem(state,index,now=Date.now()) {
  if (!validIndex(index)||!state.board[index]) return result(state,false,'empty','先选择一份资源');
  if (isLocked(state,index)) return result(state,false,'locked','先解锁这个格子');
  const item=state.board[index];
  if (!['energy','coins','chest'].includes(item.family)) return result(state,false,'invalid','这个物品可以合成或用于订单');
  if (item.family==='energy') {
    const amount=CHAINS.energy[item.level-1].value;
    if (state.energy+amount>MAX_MANUAL_ENERGY) return result(state,false,'full','电量已经很充足，先留着这份电量补给吧');
    tickEnergy(state,now);state.energy+=amount;state.lastEnergyAt=now;state.board[index]=null;
    return result(state,true,'collect',`领取了 ${amount} 点电量`,{index,item,amount});
  }
  if (item.family==='coins') {
    const coins=CHAINS.coins[item.level-1].value;addCoins(state,coins);state.board[index]=null;
    return result(state,true,'collect',`领取了 ${coins} 金币`,{index,item,coins});
  }
  state.board[index]=null;
  const rewards=[newItem(state,'energy',Math.min(4,item.level+1)),newItem(state,'coins',Math.min(4,item.level+1))];
  const kinds=Object.keys(PRODUCER_DEFS).filter(kind=>PRODUCER_DEFS[kind].unlockStage<=state.stage);
  rewards.push(newProducer(state,kinds[Math.floor(random(state)*kinds.length)],1,now));
  if (item.level>=2) { rewards.push(newItem(state,'energy',item.level));state.boosters.scissors++; }
  if (item.level>=3) { rewards.push(newItem(state,'coins',4));state.boosters.hourglass+=2; }
  state.pending.push(...rewards);
  return result(state,true,'chest',`打开${nameOf(item)}，${rewards.length} 份物品已放入待领取区`,{index,item,rewards});
}
export function claimPending(state) {
  if (!state.pending.length) return result(state,false,'empty','暂时没有待领取奖励');
  const index=freeIndex(state);
  if (index<0) return result(state,false,'full','台面满啦，奖励会一直为你保留');
  const item=state.pending.shift();state.board[index]=item;
  return result(state,true,'claim',`领取了${nameOf(item)}`,{index,item});
}
export function storeItem(state,index) {
  if (!validIndex(index)||!state.board[index]) return result(state,false,'empty','先选择要收纳的物品');
  if (isLocked(state,index)) return result(state,false,'locked','锁住的物品还不能收纳');
  if (state.board[index].family==='bubble') return result(state,false,'bubble','泡泡不能放进仓库');
  if (state.inventory.length>=state.storageCapacity) return result(state,false,'full','仓库满啦，可以扩建或取出物品');
  const item=state.board[index];state.inventory.push(item);state.board[index]=null;
  return result(state,true,'store',`${nameOf(item)}已放入仓库`,{index,item});
}
export function retrieveItem(state,inventoryIndex) {
  if (!Number.isInteger(inventoryIndex)||inventoryIndex<0||inventoryIndex>=state.inventory.length) return result(state,false,'empty','仓库里没有这个物品');
  const index=freeIndex(state);
  if (index<0) return result(state,false,'full','台面满啦，先留出一个空位');
  const [item]=state.inventory.splice(inventoryIndex,1);state.board[index]=item;
  return result(state,true,'retrieve',`取出了${nameOf(item)}`,{index,item});
}
export const storageExpansionCost = state => 80+Math.max(0,state.storageCapacity-6)*20;
export function expandStorage(state) {
  if (state.storageCapacity>=60) return result(state,false,'max','仓库已经扩建到最大啦');
  const cost=storageExpansionCost(state);
  if (state.coins<cost) return result(state,false,'coins',`扩建需要 ${cost} 金币`);
  state.coins-=cost;state.storageCapacity+=2;
  return result(state,true,'expand','仓库增加了 2 个格子',{cost});
}
export function getChapterProgress(state) {
  const stage=state.stage;
  const invalid=!Number.isInteger(stage)||stage<0||stage>CHAPTERS.length;
  const chapter=invalid?null:CHAPTERS[stage]||null;
  if (!chapter) return {chapter:null,stage,tasks:[],ready:false,completed:0,total:0,allComplete:!invalid&&stage===CHAPTERS.length,invalid};
  const discovered=new Set(state.discovered);
  const tasks=chapter.tasks.map(task=>{
    const current=task.kind==='discover'?task.items.filter(key=>discovered.has(key)).length:integer(state[task.kind==='orders'?'completed':'cooked'],0);
    return {...task,current,value:Math.min(current,task.target),done:current>=task.target};
  });
  const completed=tasks.filter(task=>task.done).length;
  return {chapter,stage,tasks,ready:completed===tasks.length,completed,total:tasks.length,allComplete:false,invalid:false};
}
// Pass the stage shown on the claim button to reject stale clicks after a chapter advances.
export function claimChapter(state,expectedStage=state.stage,now=Date.now()) {
  const progress=getChapterProgress(state);
  if (progress.invalid) return result(state,false,'invalid','章节进度暂时不可用，请重新打开厨房');
  if (!Number.isInteger(expectedStage)||expectedStage!==state.stage) return result(state,false,'claimed','这章奖励已经领取啦，请查看新的任务');
  if (progress.allComplete) return result(state,false,'max','开店手账已经完成！继续探索食谱和收藏吧');
  if (!progress.ready) return result(state,false,'incomplete','先完成这一章的任务，再来领取奖励吧');
  const {chapter}=progress,{reward}=chapter,rewards=[];
  if (reward.unlockKind&&!allItems(state).some(item=>isProducer(item)&&item.kind===reward.unlockKind)) rewards.push(newProducer(state,reward.unlockKind,1,validNow(now)));
  if (reward.chestReward) rewards.push(newItem(state,'chest',reward.chestReward));
  state.stage++;
  state.pending.push(...rewards);
  if (reward.storageReward) state.storageCapacity=Math.min(60,state.storageCapacity+reward.storageReward);
  if (reward.coinReward) addCoins(state,reward.coinReward);
  return result(state,true,'chapter',`第 ${chapter.number} 章完成！${rewards.length?'奖励已交给糯米保管':'奖励已领取'}`,{chapter,reward,rewards,coins:reward.coinReward||0});
}
// Kept for legacy callers; the kitchen UI progresses through claimChapter without spending stars.
export function renovate(state,now=Date.now()) {
  const renovation=RENOVATIONS[state.stage];
  if (!renovation) return result(state,false,'max','梦幻小厨房已经全部建成！继续探索食谱和收藏吧');
  if (state.stars<renovation.stars) return result(state,false,'stars',`还需要 ${renovation.stars-state.stars} 颗星星，完成订单就能获得`);
  state.stars-=renovation.stars;state.stage++;
  if (renovation.unlockKind) state.pending.push(newProducer(state,renovation.unlockKind,1,now));
  if (renovation.storageReward) state.storageCapacity=Math.min(60,state.storageCapacity+renovation.storageReward);
  if (renovation.chestReward) state.pending.push(newItem(state,'chest',renovation.chestReward));
  if (renovation.coinReward) addCoins(state,renovation.coinReward);
  return result(state,true,'renovate',`${renovation.name}完成！${renovation.unlockKind?'新生产器已送到待领取区':''}`,{renovation});
}
export function buyShopItem(state,id,now=Date.now()) {
  const entry=SHOP_ITEMS.find(item=>item.id===id);
  if (!entry) return result(state,false,'invalid','没有找到这个商品');
  if (state.stage<entry.unlockStage) return result(state,false,'locked',`完成第 ${entry.unlockStage} 章后解锁`);
  if (state.coins<entry.cost) return result(state,false,'coins',`还需要 ${entry.cost-state.coins} 金币`);
  if (entry.type==='energy'&&state.energy+entry.amount>MAX_MANUAL_ENERGY) return result(state,false,'full','电量已经很充足啦');
  if (entry.type==='booster'&&state.boosters[entry.booster]>=9999) return result(state,false,'full','道具已经很充足啦');
  state.coins-=entry.cost;
  if (entry.type==='energy') { state.energy+=entry.amount;state.lastEnergyAt=now; }
  else if (entry.type==='booster') state.boosters[entry.booster]++;
  else if (entry.type==='chest') state.pending.push(newItem(state,'chest',entry.level));
  else if (entry.type==='producer') state.pending.push(newProducer(state,entry.kind,entry.level,now));
  return result(state,true,'buy',`购买了${entry.name}${['chest','producer'].includes(entry.type)?'，已送到待领取区':''}`,{entry,cost:entry.cost});
}
export const chinaDate = now => new Date(now+8*60*60*1000).toISOString().slice(0,10);
export function claimDaily(state,now=Date.now()) {
  now=validNow(now);const date=chinaDate(now);
  if ((state.dailyClaimDate && date<=state.dailyClaimDate)||now<state.lastDailyClaimAt) return result(state,false,'claimed','今天的补给已经领过啦，明天再来');
  if (state.energy+20>MAX_MANUAL_ENERGY) return result(state,false,'full','先消耗一些电量，再领取今日补给');
  state.dailyClaimDate=date;state.lastDailyClaimAt=now;state.energy+=20;state.lastEnergyAt=now;addCoins(state,25);state.pending.push(newItem(state,'chest',1));
  return result(state,true,'daily','每日补给：20 电量、25 金币和一个厨房礼盒');
}
export function useBooster(state,type,index,now=Date.now()) {
  if (!['scissors','hourglass'].includes(type)) return result(state,false,'invalid','没有这种道具');
  if (!state.boosters[type]) return result(state,false,'empty','这个道具用完啦，可以从礼盒或商店获得');
  if (!validIndex(index)||!state.board[index]||isLocked(state,index)) return result(state,false,'invalid','先选中一个已解锁的物品');
  const item=state.board[index];
  if (type==='hourglass') {
    if (!isProducer(item)) return result(state,false,'producer','沙漏需要用在生产器上');
    const status=producerStatus(state,item,now);
    if (status.charges===status.maxCharges) return result(state,false,'full','这个生产器的库存已经满啦');
    item.charges=status.maxCharges;item.readyAt=0;state.boosters.hourglass--;
    return result(state,true,'hourglass','补货完成，可以继续生产啦',{index,item});
  }
  if (!isCommodity(item)||item.level<=1) return result(state,false,'invalid','剪刀可以拆分 2 级以上的食材、厨具或菜品');
  const empty=freeIndex(state);
  if (empty<0) return result(state,false,'full','拆分需要额外一个空格');
  const first=newItem(state,item.family,item.level-1),second=newItem(state,item.family,item.level-1);
  state.board[index]=first;state.board[empty]=second;state.boosters.scissors--;
  return result(state,true,'scissors',`拆成了两份${nameOf(first)}`,{index,item:first,secondIndex:empty});
}
export function resolveBubble(state,index,buy=false,now=Date.now()) {
  if (!validIndex(index)||state.board[index]?.family!=='bubble') return result(state,false,'invalid','这个泡泡已经消失了');
  const bubble=state.board[index];
  if (now>=bubble.expiresAt) { state.board[index]=newItem(state,'coins',1);return result(state,true,'bubble-expired','泡泡已变成金币',{index,item:state.board[index]}); }
  if (buy&&state.coins<bubble.cost) return result(state,false,'coins',`需要 ${bubble.cost} 金币领取这份物品`);
  if (buy) state.coins-=bubble.cost;
  const item=buy?newItem(state,bubble.item.family,bubble.item.level):newItem(state,'coins',1);state.board[index]=item;
  return result(state,true,'bubble',buy?`领取了${nameOf(item)}`:'戳破泡泡，获得一份金币',{index,item,cost:buy?bubble.cost:0});
}
export const unlockCost = (state,index) => 12+Math.floor(index/7)*4;
export function unlockCell(state,index) {
  if (!validIndex(index)||!isLocked(state,index)) return result(state,false,'invalid','这个格子已经解锁啦');
  const cost=unlockCost(state,index);
  if (state.coins<cost) return result(state,false,'coins',`解锁需要 ${cost} 金币，也可以通过合成解锁`);
  state.coins-=cost;state.locked=state.locked.filter(i=>i!==index);
  return result(state,true,'unlock','腾出了一块新台面！',{index,cost});
}
export function getLevel(state) { return Math.floor(state.xp/100)+1; }
export function findMerge(state) {
  for (let from=0;from<BOARD_SIZE;from++) {
    const item=state.board[from];
    if (!item||item.family==='bubble'||isLocked(state,from)||item.level>=maxLevel(item)) continue;
    for (let to=0;to<BOARD_SIZE;to++) if (from!==to&&sameMerge(item,state.board[to])) return {from,to,family:item.family,level:item.level};
  }
  return null;
}
export const serialize = state => JSON.stringify(state);
