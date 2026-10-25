/** Pure, transactional farm economy. Time is logical milliseconds; no storage or UI side effects. */
import {FARM_CONFIG,FARM_FEATURES,CONTENT_VERSION,SCHEMA_VERSION,CROPS,FRUITS,ANIMALS,BUILDINGS,RECIPES,ITEMS,TOOLS,DECORATIONS,ROADS,STORAGE_MATERIALS,LAND_MATERIALS,CLEARING_TOOLS,COSMETICS,decorationConfig,FARM_ERRORS,fieldAllowance,levelForXp,storageCapacity} from './farm-config.mjs';
import {validateLayout,applyLayout} from './farm-layout.mjs';
import {startFarmStage,actFarmStage} from './farm-linkage.mjs';
const DAY=86400000, SIX_HOURS=21600000;
const clone = value => structuredClone(value);
const own = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
const integer = (value,min=0) => Number.isSafeInteger(value)&&value>=min;
function fail(code,detail='') {
  const error=new Error(`${FARM_ERRORS[code]||code}${detail?`：${detail}`:''}`);
  error.code=code;
  throw error;
}
function requireThat(condition,code,detail) {
  if(!condition) fail(code,detail);
}
function count(value=1) {
  requireThat(integer(value,1)&&value<=1000000,'INVALID_COMMAND','数量必须为正整数');
  return value;
}
function entity(state,id,kind) {
  const e=state.entities.find(e=>e.id===id);
  requireThat(e&&(!kind||e.kind===kind),'INVALID_COMMAND','找不到对应设施');
  return e;
}
function uniqueIds(ids) {
  requireThat(Array.isArray(ids)&&ids.length<=4096,'INVALID_COMMAND');
  return [...new Set(ids)];
}
function newId(state,prefix) {
  return `${prefix}_${state.nextId++}`;
}
function needLevel(state,level) {
  requireThat(state.level>=level,'LEVEL_LOCKED',`需要 ${level} 级`);
}
function pay(state,coins) {
  requireThat(state.coins>=coins,'INSUFFICIENT_COINS',`需要 ${coins} 金币`);
  state.coins-=coins;
}
function payVoucher(state,n) {
  requireThat(state.vouchers>=n,'INSUFFICIENT_ITEM',`需要 ${n} 建设券`);
  state.vouchers-=n;
}
function random(state) {
  state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;
  return state.rng/4294967296;
}
function choose(state,array) {
  return array[Math.floor(random(state)*array.length)];
}
export function storageUsed(state,kind) {
  return Object.entries(state.inventory).reduce((n,[id,q])=>n+(ITEMS[id]?.storage===kind?q:0),0);
}
function fits(state,items) {
  return ['silo','barn'].every(kind=>storageUsed(state,kind)+Object.entries(items).reduce((n,[id,q])=>n+(ITEMS[id]?.storage===kind?q:0),0)<=state.storage[kind].capacity);
}
function addItems(state,items) {
  requireThat(fits(state,items),'STORAGE_FULL');
  for(const [id,q] of Object.entries(items)) {
    requireThat(own(ITEMS,id)&&integer(q),'INVALID_COMMAND',id);
    state.inventory[id]=(state.inventory[id]||0)+q;
  }
}
function spendItems(state,items,allowSeedReserve=false) {
  for(const [id,q] of Object.entries(items)) {
    requireThat(own(ITEMS,id)&&integer(q),'INVALID_COMMAND',id);
    requireThat((state.inventory[id]||0)>=q,'INSUFFICIENT_ITEM',ITEMS[id]?.name);
    if(CROPS[id]&&!allowSeedReserve&&q>0) requireThat(state.inventory[id]-q>=1,'KEEP_SEED_RESERVE',ITEMS[id].name);
  }
  for(const [id,q] of Object.entries(items)) state.inventory[id]-=q;
}
export function recoveryPrice(itemId,quantity=1) {
  const item=ITEMS[itemId];
  requireThat(item&&(item.M10||item.sellPrice!==undefined)&&integer(quantity,1),'INVALID_COMMAND');
  return item.sellPrice!==undefined?item.sellPrice*quantity:Math.max(1,Math.floor(quantity*item.M10*0.5/10));
}
export function npcPrice(itemId,quantity=1,ratio=1.1) {
  requireThat(ITEMS[itemId]?.M10&&integer(quantity,1),'INVALID_COMMAND');
  return ratio>1?Math.ceil(quantity*ITEMS[itemId].M10*ratio/10):Math.max(1,Math.floor(quantity*ITEMS[itemId].M10*ratio/10));
}
export function masteryStars(state,machineType) {
  const c=Object.values(BUILDINGS).find(b=>b.machineType===machineType);
  return c?c.masteryCumulativeHours.filter(h=>(state.mastery[machineType]||0)>=h*3600000).length:0;
}
function durationFactor(state,machineType) {
  const stars=masteryStars(state,machineType);
  return machineType==='feed_mill'?1-stars*0.05:stars===3?0.85:1;
}
function makeEntity(id,kind,configId,x,y,w,h,extra={}) {
  return {id,kind,configId,x,y,w,h,rotation:0,...extra};
}
function animalInstance(state,configId) {
  return {id:newId(state,'animal'),configId,status:'hungry',readyAt:0};
}
function reward(state,id,source,items={},extra={}) {
  if(state.rewards[id]) return state.rewards[id];
  const receipt={id,source,items:{...items},claimed:false,...extra};
  state.rewards[id]=receipt;
  claimReceipt(state,receipt);
  return receipt;
}
function claimReceipt(state,receipt) {
  for(const [id,q] of Object.entries(receipt.items)) {
    if(!q||state.level<(ITEMS[id]?.level||1)) continue;
    const amount=Math.min(q,Math.max(0,state.storage[ITEMS[id].storage].capacity-storageUsed(state,ITEMS[id].storage)));
    if(amount) {
      addItems(state,{[id]:amount});
      receipt.items[id]-=amount;
    }
  }
  receipt.claimed=Object.values(receipt.items).every(q=>q===0);
}
function gainXp(state,amount) {
  const old=state.level;
  state.xp+=amount;
  state.level=levelForXp(state.xp);
  for(
    let level=old+1
    ;level<=state.level;level++) {
    for(const crop of Object.values(CROPS).filter(c=>c.level===level)) reward(state,`level_${level}_${crop.id}`,'level',{[crop.id]:FARM_CONFIG.cropUnlockGift});
    if(level%5===0&&!state.ledger[`level_voucher_${level}`]) {
      state.ledger[`level_voucher_${level}`]=true;
      if(state.features.constructionVouchersEnabled)state.vouchers+=FARM_CONFIG.constructionVoucher.each5Levels;
    }
  }
}
function bump(state,key,n=1) {
  state.stats[key]=(state.stats[key]||0)+n;
}
export function createFarm(now=Date.now(),options={}) {
  requireThat(integer(now),'INVALID_COMMAND','时间必须是非负毫秒');
  const features={...FARM_FEATURES,...options.features};
  for(const [key,value]of Object.entries(features))requireThat(own(FARM_FEATURES,key)&&typeof value==='boolean','INVALID_COMMAND','未知功能开关');
  const state={
    features,
    schemaVersion:SCHEMA_VERSION,
    contentVersion:CONTENT_VERSION,
    referenceVersion:'hay-day-community-2026-10-24',
    revision:0,
    layoutRevision:0,
    now,
    coins:100,
    xp:0,
    level:1,
    vouchers:0,
    materialChoices:0,
    nextId:100,
    inventory:{wheat:6,chicken_feed:3},
    storage:{silo:{capacity:50,upgrades:0},barn:{capacity:50,upgrades:0}},
    entities:[],
    openedLand:[],
    rewards:{},
    ledger:{},
    mastery:{},
    rng:0x51ee9a17,
    day:Math.floor(now/DAY),
    fertilizerUntil:0,
    materials:{harvestCount:0,pending:null,choiceReceipt:null},
    stats:{},
    tutorial:{entered:true,completed:{T01:true}},
    commandLog:{},
    commandWatermarks:{},
    commandSeen:{},
    settings:{sound:true,music:true,reducedMotion:false},
    camera:{centerX:29.5,centerY:28.5,zoom:1},
    layoutSlots:[null,null],
    decorations:{},
    cosmetics:{background:'default'},
    animalCredits:{chicken:0,cow:0},
    branch:{unlocked:false,stages:{},active:null},
    npc:{
      boxes:Array.from({length:5},(_,i)=>({id:`box_${i+1}`,listing:null})),
      budgetDay:Math.floor(now/DAY),
      budgetFieldAllowance:null,
      budgetUsed:{},
      supplyBatch:-1,
      shelf:[],
      materialOffers:[],
      materialBought:0,
      toolBought:{},
      freeRevives:0
    },
    orders:[],
    daily:{trucks:0,choiceClaimed:[]}
  };
  state.entities.push(makeEntity('house','house','house',20,20,4,4,{fixed:true,door:{x:22,y:24}}),makeEntity('barn','barn','barn',24,20,3,3),makeEntity('silo','silo','silo',28,20,3,3));
  for(
    let i=0
    ;i<6;i++) state.entities.push(makeEntity(`field_${i+1}`,'field','field',28+i%3,28+Math.floor(i/3),1,1,{crop:null}));
  state.entities.push(makeEntity('shelter_chicken_1','shelter','chicken',34,24,4,4,{tier:0,animals:[animalInstance(state,'chicken'),animalInstance(state,'chicken'),animalInstance(state,'chicken')]}));
  for(const [id,configId,x,y] of [['natural_tree_1','natural_tree',18,36],['natural_bush_1','natural_bush',20,36],['rock_1','rock',40,40],['rock_2','rock',41,40],['rock_3','rock',40,41]]) state.entities.push(makeEntity(id,'obstacle',configId,x,y,1,1,{fixed:true}));
  refreshSupplies(state);
  return state;
}
function startNextJob(state,machine,at) {
  if(!machine.built||machine.completed.length>=FARM_CONFIG.queue.completedBatchCap||machine.queue.some(j=>j.startAt!==null)) return;
  const job=machine.queue[0];
  if(!job) return;
  job.startAt=at;
  job.durationMs=Math.max(1,Math.round(job.baseDurationMs*durationFactor(state,machine.machineType)));
  job.readyAt=at+job.durationMs;
  job.accountedMs=0;
  machine.blockedAt=null;
}
function advanceProduction(state,now) {

 // Process all machine completion events in chronological order. Concurrent machines
 // contribute only actual work to shared mastery, including partial/offline work.
  let at=state.now;
  for(const m of state.entities.filter(e=>e.kind==='machine')) startNextJob(state,m,at);
  while(at<now) {
    const running=state.entities.filter(e=>e.kind==='machine'&&e.queue[0]?.startAt!==null&&e.queue[0]?.startAt!==undefined);
    if(!running.length) break;
    const event=Math.min(now,...running.map(m=>m.queue[0].readyAt));
    for(const m of running) {
      const job=m.queue[0];
      const elapsed=Math.max(0,Math.min(job.durationMs,event-job.startAt)-(job.accountedMs||0));
      state.mastery[m.machineType]=(state.mastery[m.machineType]||0)+elapsed;
      job.accountedMs=(job.accountedMs||0)+elapsed;
    }
    at=event;
    for(const m of running) {
      const job=m.queue[0];
      if(job.readyAt<=at) {
        m.queue.shift();
        m.completed.push(job);
        m.lastCompletionAt=job.readyAt;
        if(m.completed.length>=9)m.blockedAt=at;else startNextJob(state,m,at);
      }
    }
    if(event===now) break;
  }
  for(const e of state.entities) {
    if(e.kind==='shelter') for(const a of e.animals) if(a.status==='producing'&&a.readyAt<=now)a.status='ready';
    if(e.kind==='fruit'&&e.status==='growing'&&e.readyAt<=now)e.status='ready';
  }
  for(const box of state.npc.boxes) if(box.listing?.status==='listed'&&box.listing.readyAt<=now)box.listing.status='sold';
}
function advanceMutable(state,now) {
  requireThat(integer(now),'INVALID_COMMAND','时间不合法');
  if(now<state.now) state.clockWarning=true;
  now=Math.max(now,state.now);
  advanceProduction(state,now);
  state.now=now;
  const day=Math.floor(now/DAY);
  if(day>state.day) {
    state.day=day;
    state.daily={trucks:0,choiceClaimed:[]};
    Object.assign(state.npc,{budgetDay:day,budgetFieldAllowance:null,budgetUsed:{},materialBought:0,toolBought:{},freeRevives:0});
  }
  refreshSupplies(state);
  refreshOrders(state);
}
function changes(before,state,events=[],skipped=[]) {
  const items={};
  for(const id of new Set([...Object.keys(before.inventory),...Object.keys(state.inventory)])) if((state.inventory[id]||0)!==(before.inventory[id]||0)) items[id]=(state.inventory[id]||0)-(before.inventory[id]||0);
  return {
    coins:state.coins-before.coins,
    xp:state.xp-before.xp,
    vouchers:state.vouchers-before.vouchers,
    items,
    events,
    skipped:skipped.length
  };
}
export function advanceFarm(input,now=Date.now()) {
  const state=clone(input);
  advanceMutable(state,now);
  const changed=JSON.stringify(state)!==JSON.stringify(input);
  if(changed) state.revision++;
  return {ok:true,state,delta:changes(input,state),skipped:[]};
}
export function canProduce(state,itemId,seen=new Set()) {
  const item=ITEMS[itemId];
  if(!item||state.level<(item.level||1)||seen.has(itemId))return false;
  const next=new Set(seen);
  next.add(itemId);
  if(CROPS[itemId])return state.entities.some(e=>e.kind==='field');
  if(FRUITS[itemId])return state.entities.some(e=>e.kind==='fruit'&&e.configId===itemId&&e.status!=='withered');
  const animal=Object.values(ANIMALS).find(a=>a.product===itemId);
  if(animal)return state.entities.some(e=>e.kind==='shelter'&&e.configId===animal.id&&e.animals.length)&&canProduce(state,animal.feedItem,next);
  const recipe=RECIPES[itemId];
  return !!recipe&&state.entities.some(e=>e.kind==='machine'&&e.built&&e.machineType===recipe.machineType)&&Object.keys(recipe.inputs).every(id=>canProduce(state,id,next));
}
function refreshSupplies(state) {
  const batch=Math.floor(state.now/SIX_HOURS);
  if(batch<=state.npc.supplyBatch)return;
  state.npc.supplyBatch=batch;
  const crops=Object.values(CROPS).filter(c=>c.level<=state.level);
  const reachable=Object.values(ITEMS).filter(i=>i.M10&&canProduce(state,i.id));
  const ingredients=[...new Set(Object.values(RECIPES).filter(r=>state.level>=r.level&&state.entities.some(e=>e.kind==='machine'&&e.built&&e.machineType===r.machineType)).flatMap(r=>Object.keys(r.inputs)))].map(id=>ITEMS[id]).filter(i=>i&&i.level<=state.level);
  state.npc.shelf=Array.from({length:6},(_,i)=>{
      const pool=i<2?crops:i<4?(ingredients.length?ingredients:crops):(reachable.length?reachable:crops);
      const item=choose(state,pool),quantity=1+Math.floor(random(state)*5);
      return {id:`shelf_${batch}_${i}`,itemId:item.id,quantity,coins:npcPrice(item.id,quantity)};
    });
  const materialPool=[...STORAGE_MATERIALS,...(state.level>=22?LAND_MATERIALS:[])];
  const needs=id=>{
    if(STORAGE_MATERIALS.includes(id))return state.storage[['bolt','duct_tape','plank'].includes(id)?'barn':'silo'].upgrades+1-(state.inventory[id]||0);
    const patches=FARM_CONFIG.map.expansionPatches.filter(p=>!state.openedLand.includes(p.id));
    return (patches.length?Math.min(...patches.map(p=>p[id])):0)-(state.inventory[id]||0);
  };
  const offset=batch%materialPool.length,rank=Object.fromEntries(materialPool.map((id,i)=>[id,(i+offset)%materialPool.length]));
  materialPool.sort((a,b)=>needs(b)-needs(a)||rank[a]-rank[b]);
  state.npc.materialOffers=materialPool.slice(0,2).map((id,i)=>({id:`material_${batch}_${i}`,itemId:id,quantity:1,coins:TOOLS[id].buyPrice}));
}
function orderCooldown(state) {
  return FARM_CONFIG.orders.refreshMinutes.find(([min,max])=>state.level>=min&&state.level<=max)[2]*60000;
}
function oneRound(state,id) {
  if(CROPS[id])return state.entities.filter(e=>e.kind==='field').length*2;
  const animal=Object.values(ANIMALS).find(a=>a.product===id);
  if(animal)return state.entities.filter(e=>e.kind==='shelter'&&e.configId===animal.id).reduce((n,e)=>n+e.animals.length,0);
  return RECIPES[id]?.yieldCount||FRUITS[id]?.sequence[0]||1;
}
export function quoteOrder(state,requirements,kind='normal') {
  const type=FARM_CONFIG.orders.types[kind];
  requireThat(type,'INVALID_COMMAND');
  let B=0,P=0,bonusB=0,bonusP=0;
  for(const [id,q] of Object.entries(requirements)) {
    const item=ITEMS[id];
    requireThat(item?.M10&&integer(q,1),'INVALID_COMMAND');
    const value=q*item.M10/10;
    const xp=CROPS[id]?q*CROPS[id].xpPerHarvest/2:FRUITS[id]?q*FRUITS[id].xpPerFruit:q*(item.xpPerBatch||0)/(item.yieldCount||1);
    B+=value;
    P+=xp;
    const recipe=RECIPES[id],stars=recipe&&masteryStars(state,recipe.machineType);
    if(recipe?.machineType!=='feed_mill'&&stars>=1)bonusB+=value;
    if(recipe?.machineType!=='feed_mill'&&stars>=2)bonusP+=xp;
  }
  return {
    coins:Math.max(1,Math.min(Math.floor((B+bonusB*.1)*type.coins),Math.floor(B*1.05))),
    xp:Math.max(1,Math.ceil((Math.ceil(P)+bonusP*.1)*type.xp)),
    referenceValue:B,
    productionXp:Math.ceil(P)
  };
}
function generateOrder(state,slot) {
  const pool=Object.values(ITEMS).filter(i=>['crop','fruit','animal','processed'].includes(i.category)&&canProduce(state,i.id));
  if(!pool.length)return null;
  const min=state.level>=20?2:1,max=state.level>=10?3:2,n=Math.min(pool.length,min+Math.floor(random(state)*(max-min+1))),requirements={};
  for(
    let i=0
    ;i<n;i++){
    const index=Math.floor(random(state)*pool.length),item=pool.splice(index,1)[0],limit=Math.max(1,Math.min(10,Math.floor(state.storage[item.storage].capacity*.1),oneRound(state,item.id)*2));
    requirements[item.id]=1+Math.floor(random(state)*limit);
  }
  const roll=random(state)*100,kind=roll<60?'normal':roll<85?'experience':'coin';
  return {
    id:newId(state,'order'),
    slot,
    requirements,
    kind,
    ...quoteOrder(state,requirements,kind),
    createdAt:state.now,
    readyAt:state.now,
    state:'active'
  };
}
function refreshOrders(state) {
  if(state.level<4)return;
  if(!state.orders.length)state.orders=Array.from({length:9},(_,i)=>generateOrder(state,i)).filter(Boolean); else state.orders=state.orders.map(order=>order.state==='cooldown'&&order.readyAt<=state.now?(generateOrder(state,order.slot)||order):order);
}
function materialDrop(state,eligible) {
  if(!state.features.materialRewardsEnabled)return;
  for(
    let i=0
    ;i<eligible;i++) {
    if(state.materials.pending){
      state.materials.harvestCount=Math.min(29,state.materials.harvestCount+1);
      continue;
    }
    state.materials.harvestCount++;
    if(state.materials.harvestCount<30)continue;
    state.materials.harvestCount=0;
    let pool=STORAGE_MATERIALS;
    if(state.level>=5){
      const total=state.level>=22?100:90,roll=random(state)*total;
      pool=roll<70?STORAGE_MATERIALS:roll<90?CLEARING_TOOLS:LAND_MATERIALS;
    }
    const id=choose(state,pool);
    if(fits(state,{[id]:1}))addItems(state,{[id]:1});else state.materials.pending=id;
  }
}
function addDailyChoice(state,n) {
  const room=20-state.materialChoices,taken=Math.min(room,n);
  state.materialChoices+=taken;
  const left=n-taken;
  if(left){
    if(!state.materials.choiceReceipt)state.materials.choiceReceipt={id:`choice_${state.day}`,day:state.day,remaining:0};
    if(state.materials.choiceReceipt.day===state.day)state.materials.choiceReceipt.remaining+=left;
  }
}
function recoverableItems(state) {
  const result={...state.inventory};
  const add=(id,q)=>{
    result[id]=(result[id]||0)+q;
  };
  for(const e of state.entities){
    if(e.kind==='field'&&e.crop)add(e.crop.itemId,e.crop.rescue?1:e.crop.yieldCount);
    if(e.kind==='fruit'&&e.status==='ready')add(e.configId,FRUITS[e.configId].sequence[e.harvestStage]);
    if(e.kind==='shelter')for(const a of e.animals)if(a.status==='ready')add(ANIMALS[a.configId].product,ANIMALS[a.configId].yieldCount);
    if(e.kind==='machine'){
      for(const job of e.completed)for(const [id,q]of Object.entries(job.outputs))add(id,q);
      for(const job of e.queue)if(job.startAt===null)for(const [id,q]of Object.entries(job.inputs))add(id,q);
    }
  }
  for(const box of state.npc.boxes)if(box.listing?.status==='listed')add(box.listing.itemId,box.listing.quantity);
  for(const receipt of Object.values(state.rewards))for(const [id,q]of Object.entries(receipt.items))if(state.level>=(ITEMS[id]?.level||1))add(id,q);
  if(state.materials.pending)add(state.materials.pending,1);
  return result;
}
export function rescueEligibility(state) {
  const assets=recoverableItems(state),pendingCoins=state.npc.boxes.reduce((n,b)=>n+(b.listing?.status==='sold'?b.listing.coins:0),0),value=Object.entries(assets).reduce((n,[id,q])=>n+(q&&(ITEMS[id]?.M10||ITEMS[id]?.sellPrice!==undefined)?recoveryPrice(id,q):0),0);
  const already=state.entities.some(e=>e.kind==='field'&&e.crop?.rescue);
  return {
    eligible:!already&&!assets.wheat&&state.coins+pendingCoins+value+state.materialChoices*150<45,
    recoverableWheat:assets.wheat||0,
    recoverableCoins:state.coins+pendingCoins+value+state.materialChoices*150,
    activeLoan:already
  };
}
function place(state,e) {
  state.entities.push(e);
  const check=validateLayout(state);
  requireThat(check.ok,'SPACE_BLOCKED',check.errors?.[0]?.message||'请换一个位置');
  return e;
}
function batch(state,ids,act,skipped,events) {
  for(const id of uniqueIds(ids)){
    const draft=clone(state);
    try{
      act(id,draft);
      Object.assign(state,draft);
      events.push({id,ok:true});
    }catch(error){
      if(!error.code)throw error;
      skipped.push({id,code:error.code,message:error.message});
    }
  }
}
function purchase(state,c) {
  const category=c.category, id=c.itemId||c.configId,quantity=count(c.quantity);
  if(category==='voucher') {
    requireThat(state.features.constructionVouchersEnabled,'FEATURE_DISABLED');
    pay(state,quantity*500);
    state.vouchers+=quantity;
    return;
  }
  if(category==='animal') {
    const shelter=entity(state,c.entityId,'shelter'),config=ANIMALS[shelter.configId];
    if(id)requireThat(id===shelter.configId,'INVALID_COMMAND');
    needLevel(state,config.levels[shelter.tier]);
    requireThat(shelter.animals.length+quantity<=config.capacity,'COUNT_LIMIT','栏舍已满');
    const price=config.prices[shelter.tier]*quantity,credit=Math.min(price,state.animalCredits[config.id]||0);
    pay(state,price-credit);
    state.animalCredits[config.id]=(state.animalCredits[config.id]||0)-credit;
    for(
      let i=0
      ;i<quantity;i++)shelter.animals.push(animalInstance(state,config.id));
    return;
  }
  if(category==='seed') {
    const crop=CROPS[id];
    requireThat(crop,'INVALID_COMMAND');
    needLevel(state,crop.level);
    requireThat(!(recoverableItems(state)[id]||0),'SEED_RECOVERABLE');
    requireThat(quantity===1||quantity===10,'INVALID_COMMAND','补种固定购买10份');
    requireThat(fits(state,{[id]:10}),'STORAGE_FULL');
    pay(state,crop.buyPrice);
    addItems(state,{[id]:10});
    return;
  }
  if(category==='tool') {
    const tool=TOOLS[id];
    requireThat(tool?.category==='tool','INVALID_COMMAND');
    needLevel(state,tool.level);
    requireThat((state.npc.toolBought[id]||0)+quantity<=10,'COUNT_LIMIT','每种工具每日最多10件');
    requireThat(fits(state,{[id]:quantity}),'STORAGE_FULL');
    pay(state,tool.buyPrice*quantity);
    addItems(state,{[id]:quantity});
    state.npc.toolBought[id]=(state.npc.toolBought[id]||0)+quantity;
    return;
  }
  if(category==='material') {
    const offer=state.npc.materialOffers.find(o=>c.slotId?o.id===c.slotId:o.itemId===id&&o.quantity>0);
    requireThat(offer&&offer.quantity>=quantity,'COUNT_LIMIT','补缺槽已售完，每6小时刷新');
    needLevel(state,TOOLS[offer.itemId].level);
    requireThat(state.npc.materialBought+quantity<=6,'COUNT_LIMIT','材料每日最多6件');
    requireThat(fits(state,{[offer.itemId]:quantity}),'STORAGE_FULL');
    pay(state,offer.coins*quantity);
    addItems(state,{[offer.itemId]:quantity});
    offer.quantity-=quantity;
    state.npc.materialBought+=quantity;
    return;
  }
  if(category==='fertilizer') {
    needLevel(state,15);
    requireThat(fits(state,{fertilizer:quantity}),'STORAGE_FULL');
    pay(state,100*quantity);
    addItems(state,{fertilizer:quantity});
    return;
  }
  requireThat(quantity===1,'INVALID_COMMAND','设施请逐个选择位置');
  requireThat(integer(c.x)&&integer(c.y),'SPACE_BLOCKED');
  const rot=c.rotation||0;
  let e;
  if(category==='road') {
    requireThat(!id||id==='road','INVALID_COMMAND');
    requireThat(state.entities.filter(e=>e.kind==='road').length<4096,'COUNT_LIMIT','道路最多4096格，可移动或收起已有道路');
    e=makeEntity(newId(state,'road'),'road','road',c.x,c.y,1,1,{footprintLayer:'ground',walkable:true,stored:false});
  } else if(category==='field') {
    requireThat(state.entities.filter(e=>e.kind==='field').length<fieldAllowance(state.level),'COUNT_LIMIT','请升级以增加田地额度');
    pay(state,1);
    e=makeEntity(newId(state,'field'),'field','field',c.x,c.y,1,1,{crop:null});
  } else if(category==='machine') {
    const config=BUILDINGS[id];
    requireThat(config,'INVALID_COMMAND');
    needLevel(state,config.level);
    requireThat(!state.entities.some(e=>e.kind==='machine'&&e.configId===id),'COUNT_LIMIT');
    if(id==='feed_mill_2')requireThat(state.entities.some(e=>e.configId==='feed_mill_1'),'NO_PRODUCTION_CHAIN','先建造第一台饲料机');
    pay(state,config.coins);
    e=makeEntity(newId(state,id),'machine',id,c.x,c.y,...config.footprint,{
        machineType:config.machineType,
        built:false,
        buildReadyAt:state.now+config.buildMs,
        queue:[],
        completed:[],
        slots:config.slots,
        slotUpgrades:0,
        blockedAt:null
      });
  } else if(category==='shelter') {
    const config=ANIMALS[id];
    requireThat(config,'INVALID_COMMAND');
    const tier=state.entities.filter(e=>e.kind==='shelter'&&e.configId===id).length;
    requireThat(tier<config.levels.length,'COUNT_LIMIT');
    needLevel(state,config.levels[tier]);
    pay(state,config.buildingCost);
    e=makeEntity(newId(state,`shelter_${id}`),'shelter',id,c.x,c.y,...config.footprint,{tier,animals:[]});
  } else if(category==='fruit') {
    const config=FRUITS[id];
    requireThat(config,'INVALID_COMMAND');
    needLevel(state,config.level);
    pay(state,config.coins);
    e=makeEntity(newId(state,id),'fruit',id,c.x,c.y,...config.footprint,{harvestStage:0,status:'growing',readyAt:state.now+config.durationMs,revived:false});
  } else if(category==='decoration') {
    const config=DECORATIONS[id];
    requireThat(config,'INVALID_COMMAND');
    pay(state,config.coins);
    e=makeEntity(newId(state,id),'decoration',id,c.x,c.y,...config.footprint,{walkable:config.walkable,footprintLayer:config.footprintLayer,stored:false});
    state.decorations[id]=(state.decorations[id]||0)+1;
  } else fail('INVALID_COMMAND','未知商店分类');
  e.rotation=rot;
  place(state,e);
}
function harvestOne(state,id) {
  const e=entity(state,id);
  if(e.kind==='field'){
    const crop=e.crop;
    requireThat(crop&&crop.readyAt<=state.now,'NOT_READY');
    addItems(state,{[crop.itemId]:crop.yieldCount});
    e.crop=null;
    gainXp(state,crop.xp);
    bump(state,'fieldHarvests');
    state.branch.unlocked=state.features.farmLinkageEnabled;
    state.tutorial.firstHarvest=true;
    return crop.rescue?0:1;
  }
  if(e.kind==='fruit'){
    requireThat(e.status==='ready','NOT_READY');
    const config=FRUITS[e.configId],n=config.sequence[e.harvestStage];
    addItems(state,{[e.configId]:n});
    gainXp(state,n*config.xpPerFruit);
    e.harvestStage++;
    e.status=e.harvestStage===3?'revive':e.harvestStage===4?'withered':'growing';
    e.readyAt=e.status==='growing'?state.now+config.durationMs:0;
    bump(state,'fruitHarvests');
    return 0;
  }
  fail('INVALID_COMMAND','请选择田地或果树');
}
function collectAnimalOne(state,shelter,id) {
  const a=shelter.animals.find(a=>a.id===id);
  requireThat(a,'INVALID_COMMAND');
  requireThat(a.status==='ready','NOT_READY');
  const config=ANIMALS[a.configId];
  addItems(state,{[config.product]:config.yieldCount});
  a.status='hungry';
  a.readyAt=0;
  gainXp(state,config.xp);
  bump(state,'animalHarvests');
  if(config.product==='egg')state.tutorial.collectedEgg=true;
  return 1;
}
function completeOrder(state,c,discard=false) {
  needLevel(state,4);
  const order=state.orders.find(o=>o.id===c.orderId);
  requireThat(order?.state==='active','NOT_READY');
  if(!discard){
    spendItems(state,order.requirements,c.allowSeedReserve);
    state.coins+=order.coins;
    gainXp(state,order.xp);
    bump(state,'trucks');
    state.daily.trucks++;
    if(state.features.constructionVouchersEnabled&&state.stats.trucks%20===0)state.vouchers++;
    if(state.features.materialRewardsEnabled&&state.level>=12){
      for(
        let i=0
        ;i<3;i++){
        const threshold=FARM_CONFIG.materials.choiceThresholds[i];
        if(state.daily.trucks>=threshold&&!state.daily.choiceClaimed.includes(threshold)){
          const pending=state.materials.choiceReceipt;
          if(pending&&pending.day!==state.day){
            state.daily.choicePaused=true;
            continue;
          }
          addDailyChoice(state,FARM_CONFIG.materials.choiceRewards[i]);
          state.daily.choiceClaimed.push(threshold);
        }
      }
    }
  }
  order.state='cooldown';
  order.readyAt=state.now+orderCooldown(state);
  order.completed=!discard;
}
function recordVictory(state,stageId,score=0) {
  const config=FARM_CONFIG.linkage.find(s=>s.stageId===stageId);
  requireThat(config,'INVALID_COMMAND');
  const previous=state.branch.stages[stageId]||{};
  if(previous.won){
    previous.bestScore=Math.max(previous.bestScore||0,score);
    return;
  }
  const receiptId=`stage_${stageId}`;
  state.branch.stages[stageId]={...previous,won:true,bestScore:score,receiptId};
  const id=config.rewardId;
  let items={};
  if(/^coins_/.test(id))state.coins+=Number(id.split('_')[1]);else if(/^voucher_/.test(id)){
    if(state.features.constructionVouchersEnabled)state.vouchers+=Number(id.split('_')[1]);
  }else if(id==='animal_credit_20')state.animalCredits.chicken+=20;else if(id==='animal_credit_50')state.animalCredits.cow+=50;else {
    const match=id.match(/^(.*)_(\d+)$/);
    if(match&&ITEMS[match[1]])items[match[1]]=Number(match[2]);
  }
  if(id.includes('background_2'))state.ledger.background_2=true;
  if(id==='background_1'){
    state.ledger.background_1=true;
    state.decorations.decor_memorial=1;
  }
  if(id.startsWith('decor_')||id.startsWith('skin_'))state.decorations[id]=1;
  if(id==='skin_sheep')state.decorations.decor_bridge=1;
  reward(state,receiptId,'stage',items,{label:config.label});
  bump(state,'stageVictories');
}
function evaluateTutorial(state) {
  const t=state.tutorial;
  t.completed??={};
  const checks={
    T01:true,
    T02:t.cameraMoved&&t.returnToFields,
    T03:t.plantStroke,
    T04:Object.keys(t.initialFed||{}).filter(id=>['animal_100','animal_101','animal_102'].includes(id)).length===3,
    T05:t.firstHarvest,
    T06:t.replanted,
    T07:state.stats.recoverySales>0,
    T08:t.openSilo&&t.openBarn,
    T09:state.stats.layoutSaves>0,
    T10:state.entities.some(e=>e.kind==='machine'&&e.configId==='bakery'&&e.built),
    T11:t.enqueuedBread,
    T12:t.startedFeedMill,
    T13:t.collectedEgg,
    T14:state.ledger.breadTutorial,
    T15:state.stats.trucks>0,
    T16:t.highPriceSale,
    T17:state.stats.storageUpgrades>0||state.level>=12
  };
  for(const [id,done]of Object.entries(checks))if(done)t.completed[id]=true;
}
function achievementRewards(state) {
  const builtTypes=new Set(state.entities.filter(e=>e.kind==='machine'&&e.built).map(e=>e.machineType)).size;
  const checks={
    fieldHarvests:[100,1000,10000],
    machineBatches:[30,300,3000],
    feeds:[30,300,3000],
    trucks:[20,200,2000],
    npcSales:[10,100,1000],
    storageUpgrades:[2,10,30],
    landExpansions:[1,8,24],
    machineTypes:[3,8,12],
    layoutSaves:[1,10,50],
    stageVictories:[6,12,24]
  };
  for(const [key,thresholds]of Object.entries(checks))for(
    let i=0
    ;i<3;i++)if((key==='machineTypes'?builtTypes:state.stats[key]||0)>=thresholds[i])state.decorations[`badge_${key}_${i+1}`]=1;
}
function clearObstacle(state,c) {
  requireThat(c.confirmed===true,'CONFIRM_REQUIRED');
  const ids=uniqueIds(c.entityIds||[c.entityId]),tool=c.toolId;
  requireThat(CLEARING_TOOLS.includes(tool),'INVALID_COMMAND');
  const targets=ids.map(id=>entity(state,id,'obstacle'));
  requireThat(targets.length>0,'INVALID_COMMAND');
  if(['axe','saw'].includes(tool)){
    requireThat(targets.length===1&&targets[0].configId===(tool==='saw'?'natural_tree':'natural_bush'),'INVALID_COMMAND','工具与障碍不匹配');
  }else{
    requireThat(targets.every(e=>e.configId==='rock'),'INVALID_COMMAND');
    const first=targets[0];
    requireThat(targets.length<=(tool==='tnt'?3:tool==='dynamite'?2:1),'COUNT_LIMIT');
    if(tool==='dynamite')requireThat(targets.every(e=>Math.abs(e.x-first.x)+Math.abs(e.y-first.y)<=1),'SPACE_BLOCKED','炸药只清理相邻石堆');
    if(tool==='tnt'){
      const xs=targets.map(e=>e.x),ys=targets.map(e=>e.y);
      requireThat(Math.max(...xs)-Math.min(...xs)<=2&&Math.max(...ys)-Math.min(...ys)<=2,'SPACE_BLOCKED','TNT目标须在3×3范围');
    }
  }
  spendItems(state,{[tool]:1},true);
  state.entities=state.entities.filter(e=>!ids.includes(e.id));
}
function expandLand(state,c) {
  needLevel(state,22);
  const patch=FARM_CONFIG.map.expansionPatches.find(p=>p.id===(c.patchId||c.landId));
  requireThat(patch,'INVALID_COMMAND');
  requireThat(!state.openedLand.includes(patch.id),'ALREADY_CLAIMED');
  const owned=[{x:16,y:16,w:32,h:32},...FARM_CONFIG.map.expansionPatches.filter(p=>state.openedLand.includes(p.id))];
  const adjacent=owned.some(p=>((p.x+p.w===patch.x||patch.x+patch.w===p.x)&&p.y<patch.y+patch.h&&patch.y<p.y+p.h)||((p.y+p.h===patch.y||patch.y+patch.h===p.y)&&p.x<patch.x+patch.w&&patch.x<p.x+p.w));
  requireThat(adjacent,'SPACE_BLOCKED','必须与已开土地共边');
  spendItems(state,Object.fromEntries(LAND_MATERIALS.map(id=>[id,patch[id]])),true);
  state.openedLand.push(patch.id);
  for(const [dx,dy,configId]of [[1,1,'rock'],[2,1,'rock'],[1,2,'rock'],[5,5,'natural_tree']])state.entities.push(makeEntity(`${patch.id}_${dx}_${dy}`,'obstacle',configId,patch.x+dx,patch.y+dy,1,1,{fixed:true}));
  bump(state,'landExpansions');
}
const ALIASES={
  commitStroke:'stroke',
  feedAnimals:'feed',
  enqueueRecipe:'enqueue',
  collectOutput:'collectMachine',
  sellToRecovery:'sell',
  buySeed:'repurchaseSeed'
};
function perform(state,c,events,skipped) {
  const type=ALIASES[c.type]||c.type;
  if(['startStage','stageAction','recordVictory'].includes(type))requireThat(state.features.farmLinkageEnabled,'FEATURE_DISABLED','经营模式未开启故事联动');
  if(['openMarket','listNpcStall','claimStall','cancelStall','upgradeStall','buyNpc'].includes(type))requireThat(state.features.npcMarketEnabled,'FEATURE_DISABLED','NPC集市未开启');
  if(['upgradeMachine','upgradeStall'].includes(type))requireThat(state.features.constructionVouchersEnabled,'FEATURE_DISABLED','建设券未开启');
  const targetIds=()=>c.entityIds||c.ids||(c.entityId?[c.entityId]:[]);
  switch(type){
    case 'tick':
    break;
    case 'stroke':
    return perform(state,{...c,type:c.mode==='plant'?'plant':c.mode==='feed'?'feed':'harvest'},events,skipped);
    case 'plant':{
      const crop=CROPS[c.itemId||c.cropId];
      requireThat(crop,'INVALID_COMMAND');
      needLevel(state,crop.level);
      batch(state,targetIds(),(id,draft)=>{
          const e=entity(draft,id,'field');
          requireThat(!e.crop,'NOT_READY','田内已有作物');
          spendItems(draft,{[crop.id]:1},true);
          e.crop={
            itemId:crop.id,
            plantedAt:state.now,
            readyAt:state.now+Math.round(crop.durationMs*(state.fertilizerUntil>state.now?.9:1)),
            yieldCount:crop.yieldCount,
            xp:crop.xpPerHarvest,
            rescue:false
          };
          bump(draft,'plants');
          if(draft.tutorial.firstHarvest)draft.tutorial.replanted=true;
        },skipped,events);
      if(events.length>=3)state.tutorial.plantStroke=true;
      break;
    }
    case 'harvest':{
      let eligible=0;
      batch(state,targetIds(),(id,draft)=>{
          eligible+=harvestOne(draft,id);
        },skipped,events);
      materialDrop(state,eligible);
      break;
    }
    case 'feed':{
      if(c.entityIds){
        for(const entityId of uniqueIds(c.entityIds))perform(state,{...c,entityIds:undefined,entityId},events,skipped);
        break;
      }
      const shelter=entity(state,c.entityId,'shelter'),config=ANIMALS[shelter.configId];
      batch(state,c.animalIds||shelter.animals.map(a=>a.id),(id,draft)=>{
          const a=entity(draft,c.entityId,'shelter').animals.find(a=>a.id===id);
          requireThat(a,'INVALID_COMMAND');
          requireThat(a.status==='hungry','NOT_READY');
          spendItems(draft,{[config.feedItem]:1},true);
          a.status='producing';
          a.readyAt=state.now+config.durationMs;
          bump(draft,'feeds');
          if(shelter.id==='shelter_chicken_1'){
            draft.tutorial.initialFed??={};
            draft.tutorial.initialFed[id]=true;
          }
        },skipped,events);
      break;
    }
    case 'collectAnimal':{
      const shelter=entity(state,c.entityId,'shelter');
      let eligible=0;
      batch(state,c.animalIds||shelter.animals.map(a=>a.id),(id,draft)=>{
          eligible+=collectAnimalOne(draft,entity(draft,c.entityId,'shelter'),id);
        },skipped,events);
      materialDrop(state,eligible);
      break;
    }
    case 'moveAnimal':{
      const source=entity(state,c.entityId,'shelter'),target=entity(state,c.targetEntityId,'shelter'),index=source.animals.findIndex(a=>a.id===c.animalId);
      requireThat(index>=0&&source.id!==target.id&&source.configId===target.configId,'INVALID_COMMAND');
      requireThat(target.animals.length<ANIMALS[target.configId].capacity,'COUNT_LIMIT');
      target.animals.push(source.animals.splice(index,1)[0]);
      break;
    }
    case 'completeBuilding':{
      const m=entity(state,c.entityId,'machine');
      requireThat(!m.built,'ALREADY_CLAIMED');
      requireThat(m.buildReadyAt<=state.now,'NOT_READY');
      m.built=true;
      gainXp(state,BUILDINGS[m.configId].xp);
      bump(state,'buildings');
      break;
    }
    case 'enqueue':{
      const m=entity(state,c.entityId,'machine'),r=RECIPES[c.recipeId];
      requireThat(m.built,'NOT_READY','先完成建造');
      requireThat(r&&r.machineType===m.machineType,'INVALID_COMMAND');
      needLevel(state,r.level);
      requireThat(m.queue.length<m.slots,'QUEUE_FULL');
      spendItems(state,r.inputs,c.allowSeedReserve);
      m.queue.push({
          id:newId(state,'job'),
          recipeId:r.id,
          inputs:{...r.inputs},
          outputs:{...r.outputs},
          baseDurationMs:r.durationMs,
          durationMs:r.durationMs,
          xp:r.xp,
          createdAt:state.now,
          startAt:null,
          readyAt:null,
          accountedMs:0
        });
      startNextJob(state,m,state.now);
      if(r.id==='bread')state.tutorial.enqueuedBread=true;
      if(r.machineType==='feed_mill')state.tutorial.startedFeedMill=true;
      break;
    }
    case 'collectMachine':{
      const m=entity(state,c.entityId,'machine');
      batch(state,c.jobIds||m.completed.map(j=>j.id),(id,draft)=>{
          const machine=entity(draft,c.entityId,'machine'),index=machine.completed.findIndex(j=>j.id===id);
          requireThat(index>=0,'NOT_READY');
          const job=machine.completed[index];
          addItems(draft,job.outputs);
          machine.completed.splice(index,1);
          gainXp(draft,job.xp);
          bump(draft,'machineBatches');
          if(job.recipeId==='bread'){
            bump(draft,'breadBatches');
            if(draft.stats.breadBatches>=2&&!draft.ledger.breadTutorial){
              draft.ledger.breadTutorial=true;
              if(draft.features.constructionVouchersEnabled)draft.vouchers+=2;
            }
          }
        },skipped,events);
      startNextJob(state,entity(state,c.entityId,'machine'),state.now);
      break;
    }
    case 'cancelJob':{
      const m=entity(state,c.entityId,'machine'),index=m.queue.findIndex(j=>j.id===c.jobId);
      requireThat(index>=0,'INVALID_COMMAND');
      const job=m.queue[index];
      requireThat(job.startAt===null,'JOB_RUNNING');
      addItems(state,job.inputs);
      m.queue.splice(index,1);
      break;
    }
    case 'reorderQueue':{
      const m=entity(state,c.entityId,'machine'),running=m.queue.filter(j=>j.startAt!==null),waiting=m.queue.filter(j=>j.startAt===null),ids=uniqueIds(c.jobIds);
      requireThat(ids.length===waiting.length&&ids.every(id=>waiting.some(j=>j.id===id)),'INVALID_COMMAND');
      m.queue=[...running,...ids.map(id=>waiting.find(j=>j.id===id))];
      break;
    }
    case 'upgradeMachine':{
      const m=entity(state,c.entityId,'machine');
      requireThat(m.slots<9,'COUNT_LIMIT');
      payVoucher(state,FARM_CONFIG.constructionVoucher.ordinarySlots[m.slotUpgrades]);
      m.slotUpgrades++;
      m.slots++;
      break;
    }
    case 'buy':
    purchase(state,c);
    break;
    case 'repurchaseSeed':
    purchase(state,{...c,category:'seed'});
    break;
    case 'sell':{
      const quantity=count(c.quantity),item=ITEMS[c.itemId];
      requireThat(item&&(item.M10||item.sellPrice!==undefined),'INVALID_COMMAND','此物品不能出售');
      if(TOOLS[c.itemId])requireThat(c.confirmed===true,'CONFIRM_REQUIRED','出售材料需要确认');
      const coins=recoveryPrice(c.itemId,quantity);
      spendItems(state,{[c.itemId]:quantity},c.allowSeedReserve);
      state.coins+=coins;
      bump(state,'recoverySales');
      break;
    }
    case 'useFertilizer':
    needLevel(state,15);
    requireThat(state.fertilizerUntil<=state.now,'FERTILIZER_ACTIVE');
    spendItems(state,{fertilizer:1},true);
    state.fertilizerUntil=state.now+1800000;
    break;
    case 'rescue':{
      const e=entity(state,c.entityId,'field');
      requireThat(!e.crop,'NOT_READY');
      requireThat(rescueEligibility(state).eligible,'SEED_RECOVERABLE','先取回资源、出售或补种');
      e.crop={
        itemId:'wheat',
        plantedAt:state.now,
        readyAt:state.now+CROPS.wheat.durationMs,
        yieldCount:1,
        xp:1,
        rescue:true,
        borrowed:1,
        grossYield:2,
        repay:1
      };
      break;
    }
    case 'reviveTree':{
      const e=entity(state,c.entityId,'fruit');
      requireThat(e.status==='revive'&&!e.revived,'NOT_READY');
      if(c.useVoucher)payVoucher(state,1);else{
        requireThat(state.npc.freeRevives<3,'COUNT_LIMIT','今日3次免费复苏已用完，可使用1建设券');
        state.npc.freeRevives++;
      }
      e.revived=true;
      e.status='growing';
      e.readyAt=state.now+FRUITS[e.configId].durationMs;
      break;
    }
    case 'clearTree':{
      requireThat(c.confirmed===true,'CONFIRM_REQUIRED');
      const e=entity(state,c.entityId,'fruit');
      spendItems(state,{[FRUITS[e.configId].clearTool]:1},true);
      state.entities=state.entities.filter(x=>x.id!==e.id);
      break;
    }
    case 'upgradeStorage':{
      const kind=c.storage||c.target;
      requireThat(['barn','silo'].includes(kind),'INVALID_COMMAND');
      const ids=kind==='barn'?['bolt','duct_tape','plank']:['nail','screw','wood_panel'],n=state.storage[kind].upgrades+1;
      spendItems(state,Object.fromEntries(ids.map(id=>[id,n])),true);
      state.storage[kind]={upgrades:n,capacity:storageCapacity(n)};
      bump(state,'storageUpgrades');
      break;
    }
    case 'openMarket':
    needLevel(state,7);
    if(state.npc.budgetFieldAllowance===null)state.npc.budgetFieldAllowance=fieldAllowance(state.level);
    break;
    case 'listNpcStall':{
      needLevel(state,7);
      const box=state.npc.boxes.find(b=>b.id===c.boxId);
      requireThat(box&&!box.listing,'COUNT_LIMIT','货箱已占用');
      const q=count(c.quantity),item=ITEMS[c.itemId],tier=Number(c.tier);
      requireThat(item?.M10&&q<=10&&[.5,.75,1].includes(tier),'INVALID_COMMAND');
      needLevel(state,item.level||1);
      if(state.npc.budgetFieldAllowance===null)state.npc.budgetFieldAllowance=fieldAllowance(state.level);
      if(tier>.5){
        const budget=['crop','fruit'].includes(item.category)?state.npc.budgetFieldAllowance*2:10;
        requireThat((state.npc.budgetUsed[item.id]||0)+q<=budget,'BUDGET_EXHAUSTED');
      }
      spendItems(state,{[item.id]:q},c.allowSeedReserve);
      if(tier>.5)state.npc.budgetUsed[item.id]=(state.npc.budgetUsed[item.id]||0)+q;
      const factor=['crop','fruit'].includes(item.category)?1:item.category==='animal'?1.5:2;
      box.listing={
        itemId:item.id,
        quantity:q,
        tier,
        coins:npcPrice(item.id,q,tier),
        readyAt:state.now+FARM_CONFIG.npc.saleTiers.find(t=>t[0]===tier)[1]*60000*factor,
        day:state.day,
        status:'listed'
      };
      break;
    }
    case 'claimStall':{
      const box=state.npc.boxes.find(b=>b.id===c.boxId);
      requireThat(box?.listing?.status==='sold','NOT_READY');
      state.coins+=box.listing.coins;
      if(box.listing.tier>.5)state.tutorial.highPriceSale=true;
      box.listing=null;
      bump(state,'npcSales');
      break;
    }
    case 'cancelStall':{
      const box=state.npc.boxes.find(b=>b.id===c.boxId),listing=box?.listing;
      requireThat(listing?.status==='listed','NOT_READY','已成交货物只能领取金币');
      addItems(state,{[listing.itemId]:listing.quantity});
      if(listing.day===state.day&&listing.tier>.5)state.npc.budgetUsed[listing.itemId]-=listing.quantity;
      box.listing=null;
      break;
    }
    case 'upgradeStall':
    needLevel(state,7);
    requireThat(state.npc.boxes.length<10,'COUNT_LIMIT');
    payVoucher(state,FARM_CONFIG.constructionVoucher.npcBoxes[state.npc.boxes.length-5]);
    state.npc.boxes.push({id:`box_${state.npc.boxes.length+1}`,listing:null});
    break;
    case 'buyNpc':{
      needLevel(state,7);
      const offer=state.npc.shelf.find(o=>o.id===c.slotId);
      requireThat(offer&&offer.quantity>0,'COUNT_LIMIT','本批货物已售完');
      requireThat(fits(state,{[offer.itemId]:offer.quantity}),'STORAGE_FULL');
      pay(state,offer.coins);
      addItems(state,{[offer.itemId]:offer.quantity});
      offer.quantity=0;
      break;
    }
    case 'submitOrder':
    completeOrder(state,c);
    break;
    case 'discardOrder':
    completeOrder(state,c,true);
    break;
    case 'claimTool':
    requireThat(state.materials.pending,'ALREADY_CLAIMED');
    addItems(state,{[state.materials.pending]:1});
    state.materials.pending=null;
    break;
    case 'redeemMaterial':{
      const q=count(c.quantity);
      requireThat([...STORAGE_MATERIALS,...LAND_MATERIALS].includes(c.itemId),'INVALID_COMMAND');
      needLevel(state,TOOLS[c.itemId].level);
      requireThat(state.materialChoices>=q,'INSUFFICIENT_ITEM','材料选择券不足');
      addItems(state,{[c.itemId]:q});
      state.materialChoices-=q;
      break;
    }
    case 'claimMaterialChoices':{
      const receipt=state.materials.choiceReceipt;
      requireThat(receipt?.remaining,'ALREADY_CLAIMED');
      const n=Math.min(20-state.materialChoices,receipt.remaining);
      requireThat(n>0,'COUNT_LIMIT','选择券最多持有20枚');
      state.materialChoices+=n;
      receipt.remaining-=n;
      if(!receipt.remaining)state.materials.choiceReceipt=null;
      break;
    }
    case 'claimReward':{
      const receipt=state.rewards[c.receiptId];
      requireThat(receipt&&!receipt.claimed,'ALREADY_CLAIMED');
      requireThat(Object.entries(receipt.items).some(([id,q])=>q>0&&state.level>=(ITEMS[id]?.level||1)),'LEVEL_LOCKED','先达到奖励物品所需等级');
      const before=JSON.stringify(receipt.items);
      claimReceipt(state,receipt);
      requireThat(before!==JSON.stringify(receipt.items),'STORAGE_FULL','奖励尚未解锁或仓库空间不足');
      break;
    }
    case 'expandLand':
    expandLand(state,c);
    break;
    case 'clearObstacle':
    clearObstacle(state,c);
    break;
    case 'applyLayout':{
      const result=applyLayout(state,c.positions||c.draft);
      requireThat(result.ok,'SPACE_BLOCKED',result.errors?.[0]?.message);
      state.entities=result.state.entities;
      state.layoutRevision=result.state.layoutRevision??state.layoutRevision+1;
      bump(state,'layoutSaves');
      break;
    }
    case 'saveLayoutSlot':{
      requireThat(integer(c.slot)&&c.slot<2,'INVALID_COMMAND');
      const positions=c.positions||state.entities.map(({id,x,y,rotation,stored})=>({id,x,y,rotation,stored:!!stored}));
      const checked=validateLayout(state,positions);
      requireThat(checked.ok,'SPACE_BLOCKED');
      state.layoutSlots[c.slot]=clone(positions);
      break;
    }
    case 'loadLayoutSlot':{
      requireThat(integer(c.slot)&&c.slot<2&&state.layoutSlots[c.slot],'INVALID_COMMAND');
      return perform(state,{type:'applyLayout',positions:state.layoutSlots[c.slot]},events,skipped);
    }
    case 'tutorialEvent':{
      const allowed=['cameraMoved','returnToFields','openSilo','openBarn','skip'];
      requireThat(allowed.includes(c.event),'INVALID_COMMAND');
      state.tutorial[c.event]=true;
      break;
    }
    case 'placeDecoration':{
      const id=c.configId||c.itemId;
      requireThat(typeof id==='string'&&state.decorations[id]&&!id.startsWith('skin_'),'INVALID_COMMAND');
      requireThat(state.entities.filter(e=>e.kind==='decoration'&&e.configId===id).length<state.decorations[id],'COUNT_LIMIT','该装饰已摆放');
      const config=decorationConfig(id);
      requireThat(config,'INVALID_COMMAND');
      place(state,makeEntity(newId(state,'decor'),'decoration',id,c.x,c.y,...config.footprint,{rotation:c.rotation||0,walkable:!!config.walkable,stored:false}));
      break;
    }
    case 'setSkin':{
      const e=entity(state,c.entityId,'shelter');
      // Restoring an owned shelter's original appearance is presentation-only.
      if(c.skinId===null){delete e.skinId;break;}
      const skin=COSMETICS[c.skinId];
      requireThat(skin?.target===e.configId&&state.decorations[c.skinId],'LEVEL_LOCKED','尚未获得对应外观');
      e.skinId=c.skinId;
      break;
    }
    case 'setBackground':{
      requireThat(['default','background_1','background_2'].includes(c.background),'INVALID_COMMAND');
      requireThat(c.background==='default'||state.ledger[c.background],'LEVEL_LOCKED','请先领取故事背景奖励');
      state.cosmetics.background=c.background;
      break;
    }
    case 'setCamera':{
      const camera=c.camera||c;
      requireThat(Number.isFinite(camera.centerX)&&camera.centerX>=0&&camera.centerX<64&&Number.isFinite(camera.centerY)&&camera.centerY>=0&&camera.centerY<64&&Number.isFinite(camera.zoom)&&camera.zoom>=.75&&camera.zoom<=1.75,'INVALID_COMMAND','相机范围不合法');
      state.camera={centerX:camera.centerX,centerY:camera.centerY,zoom:camera.zoom};
      break;
    }
    case 'setSettings':
    for(const [key,value]of Object.entries(c.settings||{})){
      requireThat(['sound','music','reducedMotion'].includes(key)&&typeof value==='boolean','INVALID_COMMAND');
      state.settings[key]=value;
    }
    break;
    case 'startStage':
    startFarmStage(state,c.stageId,c.seed);
    break;
    case 'stageAction':{
      const result=actFarmStage(state,c.action,c);
      if(result.won)recordVictory(state,result.stageId,result.score);
      break;
    }
    case 'recordVictory':{
      const active=state.branch.active;
      requireThat(active&&active.status==='won','INVALID_COMMAND','必须先完成实际牌局');
      const actualStage=FARM_CONFIG.linkage[active.level]?.stageId;
      requireThat(actualStage&&(!c.stageId||c.stageId===actualStage),'INVALID_COMMAND','关卡奖励必须对应实际获胜牌局');
      recordVictory(state,actualStage,Math.max(1,100000-Math.floor(active.elapsed/1000)));
      break;
    }
    default:
    fail('INVALID_COMMAND',type);
  }
}
export function executeFarm(input,command,now=Date.now()) {
  requireThat(command&&typeof command.type==='string','INVALID_COMMAND');
  if(command.commandId!==undefined)requireThat(typeof command.commandId==='string'&&command.commandId.length>0&&command.commandId.length<=160&&!['__proto__','constructor','prototype'].includes(command.commandId),'INVALID_COMMAND');
  if(command.commandId&&own(input.commandLog,command.commandId)){
    const previous=input.commandLog[command.commandId];
    return {ok:true,state:clone(input),delta:clone(previous.delta),skipped:clone(previous.skipped),duplicate:true};
  }
  const sequence=typeof command.commandId==='string'?command.commandId.match(/^farmcmd:([a-zA-Z0-9_-]{1,80}):(\d+)$/):null;
  if(sequence)requireThat(Number.isSafeInteger(Number(sequence[2]))&&Number(sequence[2])>(input.commandWatermarks?.[sequence[1]]||0),'ALREADY_CLAIMED','此操作已完成，旧结果收据已归档');else if(command.commandId&&own(input.commandSeen||{},command.commandId))fail('ALREADY_CLAIMED','此操作已完成');
  if(command.expectedRevision!==undefined)requireThat(command.expectedRevision===input.revision,'STALE_REVISION');
  const state=clone(input),events=[],skipped=[];
  advanceMutable(state,now);
  perform(state,command,events,skipped);
  refreshOrders(state);
  evaluateTutorial(state);
  achievementRewards(state);
  state.revision=input.revision+1;
  const delta=changes(input,state,events,skipped);
  if(command.commandId){
    state.commandLog[command.commandId]={revision:state.revision,delta:clone(delta),skipped:clone(skipped)};
    state.commandWatermarks??={};
    state.commandSeen??={};
    if(sequence)state.commandWatermarks[sequence[1]]=Number(sequence[2]);else state.commandSeen[command.commandId]=true;
    const keys=Object.keys(state.commandLog);
    for(
      let i=0
      ;i<keys.length-256;i++)delete state.commandLog[keys[i]];
  }
  assertFarm(state);
  return {ok:true,state,delta,skipped};
}
export function previewStroke(state,command,now=state.now) {
  return executeFarm(state,{...command,commandId:undefined,expectedRevision:undefined},now);
}
export function assertFarm(state) {
  const valid=(condition,detail)=>requireThat(condition,'INVALID_SAVE',detail);
  const map=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const itemMap=(value,positive=false)=>{
    valid(map(value),'物料映射');
    for(const [id,q]of Object.entries(value))valid(own(ITEMS,id)&&integer(q,positive?1:0),`未知物品或数量 ${id}`);
  };
  valid(state&&typeof state==='object'&&state.schemaVersion===SCHEMA_VERSION&&state.contentVersion===CONTENT_VERSION,'不支持的存档版本');
  for(const key of ['revision','layoutRevision','now','coins','xp','vouchers','materialChoices','nextId','rng','day','fertilizerUntil'])valid(integer(state[key]),key);
  valid(map(state.features)&&Object.keys(state.features).length===Object.keys(FARM_FEATURES).length&&Object.entries(state.features).every(([key,value])=>own(FARM_FEATURES,key)&&typeof value==='boolean'),'功能开关');
  valid(state.level===levelForXp(state.xp)&&state.materialChoices<=20,'等级或选择券不合法');
  itemMap(state.inventory);
  valid(map(state.storage),'仓容');
  for(const kind of ['barn','silo']){
    const storage=state.storage[kind];
    valid(storage&&integer(storage.upgrades)&&storage.capacity===storageCapacity(storage.upgrades)&&storageUsed(state,kind)<=storage.capacity,`${kind} 容量`);
  }
  valid(Array.isArray(state.entities)&&state.entities.length<=10000,'实体');
  const ids=new Set();
  const id=value=>{
    valid(typeof value==='string'&&/^[a-zA-Z0-9_:-]{1,160}$/.test(value)&&!ids.has(value),'实体、动物或任务ID重复或无效');
    ids.add(value);
  };
  function job(value,machine,completed,index=0){
    valid(map(value),'任务');
    id(value.id);
    valid(own(RECIPES,value.recipeId)&&RECIPES[value.recipeId].machineType===machine.machineType,'任务配方与机器不匹配');
    for(const key of ['baseDurationMs','durationMs'])valid(integer(value[key],1),`任务 ${key}`);
    for(const key of ['createdAt','accountedMs','xp'])valid(integer(value[key]),`任务 ${key}`);
    valid(value.accountedMs<=value.durationMs,'任务累计时长');
    itemMap(value.inputs,true);
    itemMap(value.outputs,true);
    valid(Object.keys(value.inputs).length>0&&Object.keys(value.outputs).length>0,'任务原料与产物不能为空');
    if(value.startAt===null){
      valid(!completed&&value.readyAt===null&&value.accountedMs===0,'等待任务不应有完成计时');
    }else{
      valid(integer(value.startAt)&&integer(value.readyAt)&&value.readyAt===value.startAt+value.durationMs&&machine.built,'任务结束时间');
      valid(completed||index===0,'仅队首任务可开工');
      valid(!completed||value.accountedMs===value.durationMs,'完成任务必须完整累计加工时间');
    }
    if(completed)valid(integer(value.startAt)&&integer(value.readyAt),'完成区任务缺少时间');
  }
  for(const e of state.entities){
    valid(map(e),'实体格式');
    id(e.id);
    valid(integer(e.x)&&integer(e.y)&&integer(e.w,1)&&integer(e.h,1)&&[0,90,180,270].includes(e.rotation),'坐标');
    valid(['house','barn','silo','field','machine','shelter','fruit','decoration','obstacle','road'].includes(e.kind),'未知实体类型');
    if(e.kind==='field'){
      valid(e.configId==='field'&&own(e,'crop'),'田地缺少生产状态');
      if(e.crop!==null){
        const crop=e.crop;
        valid(map(crop)&&own(CROPS,crop.itemId)&&typeof crop.rescue==='boolean','作物');
        valid(integer(crop.readyAt)&&integer(crop.plantedAt)&&crop.readyAt>crop.plantedAt&&integer(crop.yieldCount,1)&&integer(crop.xp),'作物计时与产量');
        valid(crop.rescue?crop.itemId==='wheat'&&crop.yieldCount===1&&crop.borrowed===1&&crop.grossYield===2&&crop.repay===1:crop.yieldCount===CROPS[crop.itemId].yieldCount,'作物产量或借种状态');
      }
    }
    if(e.kind==='machine'){
      valid(own(BUILDINGS,e.configId)&&e.machineType===BUILDINGS[e.configId].machineType,'机器类型');
      valid(typeof e.built==='boolean'&&integer(e.buildReadyAt),'机器缺少建造状态或完成时间');
      valid(integer(e.slots,2)&&e.slots<=9&&integer(e.slotUpgrades)&&e.slots===BUILDINGS[e.configId].slots+e.slotUpgrades,'机器槽位');
      valid(Array.isArray(e.queue)&&Array.isArray(e.completed)&&e.queue.length<=e.slots&&e.completed.length<=9,'机器队列');
      valid(e.blockedAt===null||integer(e.blockedAt),'机器阻塞时间');
      valid(e.lastCompletionAt===undefined||integer(e.lastCompletionAt),'机器最近完成时间');
      valid(e.built||(!e.queue.length&&!e.completed.length),'未建成机器不能有任务');
      e.queue.forEach((value,index)=>job(value,e,false,index));
      e.completed.forEach(value=>job(value,e,true));
    }
    if(e.kind==='shelter'){
      valid(own(ANIMALS,e.configId),'动物栏类型');
      const config=ANIMALS[e.configId];
      valid(Array.isArray(e.animals)&&e.animals.length<=config.capacity&&integer(e.tier)&&e.tier<config.levels.length,'动物栏');
      for(const animal of e.animals){
        valid(map(animal),'动物');
        id(animal.id);
        valid(animal.configId===e.configId&&['hungry','producing','ready'].includes(animal.status)&&integer(animal.readyAt),'动物生产状态');
        valid(animal.status==='hungry'?animal.readyAt===0:animal.readyAt>0,'动物计时');
      }
      if(e.skinId!==undefined)valid(COSMETICS[e.skinId]?.target===e.configId&&state.decorations[e.skinId]>0,'未拥有的动物栏外观');
    }
    if(e.kind==='fruit'){
      valid(own(FRUITS,e.configId)&&integer(e.harvestStage)&&e.harvestStage<=4&&typeof e.revived==='boolean'&&integer(e.readyAt),'果树缺少合法生产状态或时间');
      valid(['growing','ready','revive','withered'].includes(e.status),'果树状态');
      if(e.status==='revive')valid(e.harvestStage===3&&!e.revived&&e.readyAt===0,'果树复苏状态'); else if(e.status==='withered')valid(e.harvestStage===4&&e.revived&&e.readyAt===0,'果树终末状态'); else valid(e.harvestStage<4&&e.readyAt>0&&e.revived===(e.harvestStage===3),'果树生产轮次');
    }
    if(e.kind==='road')valid(e.configId==='road'&&e.w===1&&e.h===1&&e.rotation===0&&e.footprintLayer==='ground'&&e.walkable===true,'道路配置');
    if(e.kind==='decoration')valid(decorationConfig(e.configId)&&state.decorations[e.configId]>0,'未知或未拥有装饰');
  }
  valid(state.entities.filter(e=>e.kind==='field').length<=fieldAllowance(state.level),'田地额度');
  valid(state.entities.filter(e=>e.kind==='road').length<=4096,'道路数量');
  valid(state.entities.filter(e=>e.kind==='field'&&e.crop?.rescue).length<=1,'不能叠加借种');
  valid(map(state.materials)&&integer(state.materials.harvestCount)&&state.materials.harvestCount<=29&&(!state.materials.pending||own(TOOLS,state.materials.pending)),'补给计数');
  valid(map(state.rewards),'奖励');
  for(const receipt of Object.values(state.rewards))itemMap(receipt.items);
  valid(state.camera&&Number.isFinite(state.camera.centerX)&&state.camera.centerX>=0&&state.camera.centerX<64&&Number.isFinite(state.camera.centerY)&&state.camera.centerY>=0&&state.camera.centerY<64&&Number.isFinite(state.camera.zoom)&&state.camera.zoom>=.75&&state.camera.zoom<=1.75,'相机位置');
  const layout=validateLayout(state);
  valid(layout.ok,layout.errors?.[0]?.message||'布局');
  return true;
}
