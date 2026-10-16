import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAINS, BOARD_SIZE, PRODUCER_DEFS, RENOVATIONS, CHAPTERS, SHOP_ITEMS, RECIPES,
  createGame, generate, move, fulfillOrder, getOrderProgress, refillEnergy,
  sellItem, tickEnergy, tick, getLevel, findMerge, serialize, producerStatus,
  collectItem, claimPending, storeItem, retrieveItem, expandStorage, renovate,
  buyShopItem, claimDaily, useBooster, resolveBubble, unlockCell, unlockCost,
  getRecipeProgress, cookRecipe, chinaDate, getChapterProgress, claimChapter,
} from '../dist/legacy-engine.mjs';
const NOW=1_700_000_000_000;
const blank=()=>{
  const state=createGame(null,NOW);
  state.board.fill(null);state.locked=[];state.pending=[];
  return state;
};
const put=(state,index,family,level)=>state.board[index]={id:`fixture-${index}`,family,level};
const producer=(state,index,kind='food',level=1)=>state.board[index]={id:`producer-${index}`,family:'producer',kind,level,charges:10+level*4,readyAt:0,...(kind==='herb'?{nextAutoAt:NOW+60000}:{})};
const fill=state=>{for(let i=0;i<BOARD_SIZE;i++) if(!state.board[i]) put(state,i,'food',1);return state;};
const snapshot=state=>serialize(state);
const unchanged=(state,action,type)=>{const before=snapshot(state);const r=action();assert.equal(r.ok,false);if(type)assert.equal(r.type,type);assert.equal(snapshot(state),before);return r;};

test('new kitchen offers clear starter merge, three producers, locks, rewards and 66 commodity levels',()=>{
  const state=createGame(null,NOW);
  assert.equal(state.version,2);assert.equal(state.board.length,49);
  assert.equal(state.board[0].kind,'food');assert.equal(state.board[3].kind,'produce');assert.equal(state.board[6].kind,'tools');
  assert.equal(state.locked.length,14);assert.equal(state.orders.length,3);assert.equal(state.pending[0].family,'chest');
  assert.equal(state.energy,100);assert.equal(getLevel(state),1);assert.ok(findMerge(state));
  assert.equal(Object.keys(CHAINS).filter(k=>!['energy','coins','chest'].includes(k)).length,11);
  assert.equal(CHAINS.cleaning,undefined);assert.equal(PRODUCER_DEFS.cleaning,undefined);
  assert.equal(getOrderProgress(state,state.orders[0]).ready,false);
  move(state,8,9,NOW);assert.equal(getOrderProgress(state,state.orders[0]).ready,true);
});

test('merge awards experience, discovery and stable identities on later movement',()=>{
  const state=createGame(null,NOW),count=state.board.filter(Boolean).length;
  const merged=move(state,8,9,NOW);
  assert.equal(merged.type,'merge');assert.equal(state.board[8],null);assert.equal(state.board[9].level,2);
  assert.equal(state.board.filter(Boolean).length,count-1);assert.equal(state.merges,1);assert.equal(state.xp,2);
  assert.ok(state.discovered.includes('food:2'));
  const id=state.board[9].id;move(state,9,1,NOW);assert.equal(state.board[1].id,id);
});

test('producers move, swap and upgrade only with their own kind and level',()=>{
  const state=blank();producer(state,0,'food');producer(state,1,'tools');producer(state,2,'food');
  assert.equal(move(state,0,4,NOW).type,'move');assert.equal(move(state,4,1,NOW).type,'swap');
  state.board[1].charges=0;state.board[1].readyAt=NOW+60000;
  const merged=move(state,1,2,NOW);assert.equal(merged.type,'merge');
  assert.equal(state.board[2].kind,'food');assert.equal(state.board[2].level,2);assert.equal(state.board[2].charges,18);
  unchanged(state,()=>sellItem(state,2),'producer');
  producer(state,3,'food',4);producer(state,5,'food',4);
  unchanged(state,()=>move(state,3,5,NOW),'max');
});

test('max commodities cannot merge and unlike commodities swap',()=>{
  const state=blank();put(state,0,'food',6);put(state,1,'food',6);put(state,2,'tools',1);
  unchanged(state,()=>move(state,0,1,NOW),'max');
  const food=state.board[0],tool=state.board[2];assert.equal(move(state,0,2,NOW).type,'swap');
  assert.equal(state.board[0],tool);assert.equal(state.board[2],food);
});

test('locked source cannot move, sell, collect or store; same merge unlocks target',()=>{
  const state=blank();put(state,8,'food',1);put(state,9,'food',1);state.locked=[9,16];
  unchanged(state,()=>move(state,9,8,NOW),'locked');unchanged(state,()=>sellItem(state,9),'locked');
  unchanged(state,()=>storeItem(state,9),'locked');unchanged(state,()=>collectItem(state,9,NOW),'locked');
  assert.deepEqual(findMerge(state),{from:8,to:9,family:'food',level:1});
  const r=move(state,8,9,NOW);assert.deepEqual(r.unlocked,[9,16]);assert.equal(state.locked.length,0);assert.equal(state.board[9].level,2);
});

test('locked empty cells reject movement and generation but open beside a merge or with coins',()=>{
  const state=blank();producer(state,0);put(state,1,'food',1);put(state,2,'food',1);state.locked=[8,9,10];
  unchanged(state,()=>move(state,1,8,NOW),'locked');
  move(state,1,2,NOW);assert.ok(!state.locked.includes(8));assert.ok(!state.locked.includes(9));assert.ok(state.locked.includes(10));
  const cost=unlockCost(state,10),coins=state.coins;assert.equal(unlockCell(state,10).ok,true);assert.equal(state.coins,coins-cost);
  state.locked=[48];fill(state);state.board[48]=null;
  unchanged(state,()=>generate(state,0,NOW),'full');
});

test('generation uses chosen movable producer, costs one energy, and deterministic output is saved',()=>{
  const state=blank();producer(state,0,'produce');
  const restored=createGame(serialize(state),NOW);
  // createGame repairs missing base producers. Ignore those added for comparison.
  restored.board=structuredClone(state.board);restored.pending=[];
  const first=generate(state,0,NOW),second=generate(restored,'producer-0',NOW);
  assert.equal(first.ok,true);assert.equal(first.item.family,second.item.family);assert.equal(first.item.level,second.item.level);
  assert.equal(state.energy,99);assert.equal(state.board[0].charges,13);
  assert.ok(['vegetable','fruit'].includes(first.item.family));
});

test('secondary family and upgraded level drops occur without unseeded randomness',()=>{
  const state=blank();producer(state,0,'tools',4);let foundSecondary=false,foundLevel2=false;
  for(let i=0;i<80;i++) {
    const r=generate(state,0,NOW+i*60000);assert.equal(r.ok,true);
    foundSecondary ||=r.item.family==='tableware';foundLevel2 ||=r.item.level===2;
    state.board[r.index]=null;
  }
  assert.ok(foundSecondary);assert.ok(foundLevel2);
});

test('producer cooldown waits until exhaustion and recovers offline exactly once',()=>{
  const state=blank();const p=producer(state,0);
  for(let i=0;i<14;i++){const r=generate(state,0,NOW);assert.equal(r.ok,true);state.board[r.index]=null;}
  assert.equal(p.charges,0);assert.equal(p.readyAt,NOW+60000);
  unchanged(state,()=>generate(state,0,NOW+59999),'cooldown');
  assert.equal(producerStatus(state,p,NOW+60000).charges,14);
  assert.equal(generate(state,0,NOW+60000).ok,true);assert.equal(p.charges,13);assert.equal(p.readyAt,0);
  p.charges=0;p.readyAt=NOW+120000;
  const reloaded=createGame(serialize(state),NOW+86400000);
  assert.equal(reloaded.board[0].charges,14);assert.equal(reloaded.board[0].readyAt,0);
});

test('full board cannot spend generator charges or energy, and energy failure preserves producer',()=>{
  const state=blank();producer(state,0);fill(state);
  unchanged(state,()=>generate(state,0,NOW),'full');
  state.board[1]=null;state.energy=0;
  unchanged(state,()=>generate(state,0,NOW),'energy');
  unchanged(state,()=>generate(state,'unknown',NOW),'invalid');
});

test('orders aggregate quantities, ignore locked and stored goods, and pay exactly once',()=>{
  const state=blank();const order={id:'order-90',title:'test',customer:'test',coins:40,xp:20,stars:2,needs:[{family:'food',level:1,count:1},{family:'food',level:1,count:1}]};
  state.orders[0]=order;put(state,0,'food',1);put(state,1,'food',1);state.locked=[1];
  state.inventory.push({id:'stored',family:'food',level:1});
  assert.equal(getOrderProgress(state,order).needs[0].have,1);unchanged(state,()=>fulfillOrder(state,order.id),'incomplete');
  state.locked=[];const r=fulfillOrder(state,order.id);assert.deepEqual(r.consumed,[0,1]);
  assert.equal(state.coins,160);assert.equal(state.stars,2);assert.equal(state.completed,1);
  assert.equal(state.inventory.length,1);unchanged(state,()=>fulfillOrder(state,order.id),'invalid');
});

test('every third order queues a chest even on a crowded board',()=>{
  const state=blank();fill(state);state.completed=2;
  state.orders[0]={id:'order-33',needs:[{family:'food',level:1,count:1}],coins:10,xp:5,stars:1};
  const r=fulfillOrder(state,'order-33');assert.equal(r.ok,true);assert.equal(state.pending.length,1);assert.equal(state.pending[0].family,'chest');
});

test('new orders only request owned reachable producer families and scale within stage limits',()=>{
  const state=createGame(null,NOW);state.locked=[];state.pending=[];
  const allowed=new Set(['food','tools','tableware','vegetable','fruit']);
  for(let n=0;n<24;n++) {
    const order=state.orders[0];state.board=state.board.map(i=>i?.family==='producer'?i:null);
    let at=7;for(const need of order.needs)for(let c=0;c<need.count;c++)put(state,at++,need.family,need.level);
    assert.equal(fulfillOrder(state,order.id).ok,true);
    for(const need of state.orders[0].needs){assert.ok(allowed.has(need.family));assert.ok(need.level<=3);}
  }
});

test('energy recovers partial intervals, caps natural recovery and cannot farm clock rollback',()=>{
  const state=createGame(null,NOW);state.energy=20;
  assert.equal(tickEnergy(state,NOW+29999),0);assert.equal(tickEnergy(state,NOW+65000),2);assert.equal(state.lastEnergyAt,NOW+60000);
  const time=state.lastEnergyAt;assert.equal(tickEnergy(state,NOW-60000),0);assert.equal(state.lastEnergyAt,time);
  assert.equal(tickEnergy(state,NOW+86400000),78);assert.equal(state.energy,100);
  state.energy=120;tickEnergy(state,NOW+86460000);assert.equal(state.energy,120);
});

test('resource chains merge and atomically credit energy or coins on collection',()=>{
  const state=blank();put(state,0,'energy',1);put(state,1,'energy',1);
  assert.equal(move(state,0,1,NOW).ok,true);assert.equal(state.board[1].level,2);
  assert.equal(collectItem(state,1,NOW).amount,12);assert.equal(state.energy,112);assert.equal(state.board[1],null);
  put(state,2,'coins',4);const before=state.coins;assert.equal(collectItem(state,2,NOW).coins,80);assert.equal(state.coins,before+80);
  state.energy=995;put(state,3,'energy',2);unchanged(state,()=>collectItem(state,3,NOW),'full');
});

test('opening a merged chest preserves all rewards in pending even when full',()=>{
  const state=blank();fill(state);put(state,0,'chest',3);
  const r=collectItem(state,0,NOW);assert.equal(r.ok,true);assert.equal(r.rewards.length,5);assert.equal(state.pending.length,5);
  assert.equal(state.boosters.scissors,3);assert.equal(state.boosters.hourglass,4);
  const first=state.pending[0];assert.equal(claimPending(state).ok,true);assert.equal(state.board[0],first);
  unchanged(state,()=>claimPending(state),'full');assert.equal(state.pending.length,4);
  assert.ok(state.pending.some(i=>i.family==='producer'));
});

test('inventory preserves identity, cannot count for orders and expands two slots at correct price',()=>{
  const state=blank();put(state,0,'food',2);const item=state.board[0];
  assert.equal(storeItem(state,0).ok,true);assert.equal(state.inventory[0],item);assert.equal(state.board[0],null);
  assert.equal(getOrderProgress(state,state.orders[0]).ready,false);
  assert.equal(retrieveItem(state,0).ok,true);assert.equal(state.board[0],item);
  state.coins=80;assert.equal(expandStorage(state).ok,true);assert.equal(state.storageCapacity,8);assert.equal(state.coins,0);
  unchanged(state,()=>expandStorage(state),'coins');
  for(let n=0;n<8;n++)state.inventory.push({id:`stored-${n}`,family:'food',level:1});
  unchanged(state,()=>storeItem(state,0),'full');
});

test('inventory retrieval cannot overwrite full board or bypass locked empty cells',()=>{
  const state=blank();state.inventory=[{id:'stored',family:'food',level:2}];fill(state);state.board[48]=null;state.locked=[48];
  unchanged(state,()=>retrieveItem(state,0),'full');unchanged(state,()=>retrieveItem(state,-1),'empty');
});

test('renovation consumes stars, unlocks recipes and safely queues each new producer',()=>{
  const state=blank();fill(state);
  unchanged(state,()=>renovate(state,NOW),'stars');
  state.stars=100;
  const kinds=['drink','herb','asian','mediterranean'];
  for(let n=0;n<4;n++) {
    const before=state.stars;assert.equal(renovate(state,NOW).ok,true);assert.equal(state.stage,n+1);assert.equal(state.stars,before-RENOVATIONS[n].stars);
    assert.equal(state.pending.at(-1).kind,kinds[n]);assert.equal(PRODUCER_DEFS[kinds[n]].unlockStage,state.stage);
  }
  for(let n=4;n<8;n++)assert.equal(renovate(state,NOW).ok,true);
  assert.equal(state.storageCapacity,14);unchanged(state,()=>renovate(state,NOW),'max');
});

test('shop gates producers by renovation, charges once, and never requires board space',()=>{
  const state=blank();fill(state);state.coins=1000;
  unchanged(state,()=>buyShopItem(state,'producer-asian',NOW),'locked');
  state.stage=3;const before=state.coins;const entry=SHOP_ITEMS.find(i=>i.id==='producer-asian');
  assert.equal(buyShopItem(state,entry.id,NOW).ok,true);assert.equal(state.coins,before-entry.cost);assert.equal(state.pending.at(-1).kind,'asian');
  assert.equal(buyShopItem(state,'scissors',NOW).ok,true);assert.equal(state.boosters.scissors,3);
  state.coins=0;unchanged(state,()=>buyShopItem(state,'chest',NOW),'coins');
});

test('scissors require a free unlocked slot and only consume a charge after a valid split',()=>{
  const state=blank();fill(state);put(state,0,'food',4);
  unchanged(state,()=>useBooster(state,'scissors',0,NOW),'full');
  state.board[1]=null;state.locked=[1];unchanged(state,()=>useBooster(state,'scissors',0,NOW),'full');
  state.locked=[];assert.equal(useBooster(state,'scissors',0,NOW).ok,true);
  assert.equal(state.board[0].level,3);assert.equal(state.board[1].level,3);assert.equal(state.boosters.scissors,1);
  put(state,2,'energy',3);unchanged(state,()=>useBooster(state,'scissors',2,NOW),'invalid');
});

test('hourglass refills only selected producer and is not consumed for full or invalid targets',()=>{
  const state=blank();const p=producer(state,0);producer(state,1,'tools');put(state,2,'food',1);
  unchanged(state,()=>useBooster(state,'hourglass',2,NOW),'producer');unchanged(state,()=>useBooster(state,'hourglass',0,NOW),'full');
  p.charges=0;p.readyAt=NOW+60000;assert.equal(useBooster(state,'hourglass',0,NOW).ok,true);
  assert.equal(p.charges,14);assert.equal(p.readyAt,0);assert.equal(state.boosters.hourglass,1);
});

test('fifth high merge produces a timed optional bubble without overwriting any item',()=>{
  const state=blank();put(state,0,'food',2);put(state,1,'food',2);state.merges=4;
  const r=move(state,0,1,NOW);assert.equal(r.type,'merge');assert.equal(state.board[1].family,'food');
  const bubble=state.board[r.bubbleIndex];assert.equal(bubble.family,'bubble');assert.deepEqual(bubble.item,{family:'food',level:3});
  unchanged(state,()=>move(state,r.bubbleIndex,2,NOW),'bubble');unchanged(state,()=>storeItem(state,r.bubbleIndex),'bubble');
  state.coins=0;unchanged(state,()=>resolveBubble(state,r.bubbleIndex,true,NOW),'coins');
  state.coins=bubble.cost;assert.equal(resolveBubble(state,r.bubbleIndex,true,NOW).ok,true);assert.equal(state.coins,0);assert.equal(state.board[r.bubbleIndex].family,'food');
  unchanged(state,()=>resolveBubble(state,r.bubbleIndex,true,NOW),'invalid');
});

test('expired and dismissed bubbles turn into collectible coins, never paid duplicate rewards',()=>{
  const state=blank();const bubble={id:'bubble',family:'bubble',level:3,item:{family:'food',level:3},cost:48,expiresAt:NOW+60000};
  state.board[0]={...bubble};assert.equal(tick(state,NOW+60000).changed,true);assert.equal(state.board[0].family,'coins');
  state.board[1]={...bubble};assert.equal(resolveBubble(state,1,false,NOW).ok,true);assert.equal(state.board[1].family,'coins');
  state.board[2]={...bubble};const coins=state.coins;assert.equal(resolveBubble(state,2,true,NOW+60000).type,'bubble-expired');assert.equal(state.coins,coins);
});

test('herb garden grows adjacent, catches up at most three offline, and keeps blocked harvest',()=>{
  const state=blank();const p=producer(state,24,'herb');
  tick(state,NOW+86400000);assert.equal(state.board.filter(i=>i?.family==='herb').length,3);assert.equal(p.nextAutoAt,NOW+86460000);
  tick(state,NOW+86400000);assert.equal(state.board.filter(i=>i?.family==='herb').length,3);
  fill(state);p.nextAutoAt=NOW+60000;const ready=p.nextAutoAt;tick(state,NOW+120000);assert.equal(p.nextAutoAt,ready);
  state.board[17]=null;tick(state,NOW+120000);assert.equal(state.board[17].family,'herb');assert.equal(p.nextAutoAt,NOW+180000);
});

test('daily rewards use Shanghai calendar, persist, and reject clock rollback and repeated claim',()=>{
  const beforeMidnight=Date.UTC(2026,9,15,15,59,59),afterMidnight=beforeMidnight+1000;
  assert.equal(chinaDate(beforeMidnight),'2026-10-15');assert.equal(chinaDate(afterMidnight),'2026-10-16');
  const state=createGame(null,beforeMidnight);assert.equal(claimDaily(state,beforeMidnight).ok,true);
  const resumed=createGame(serialize(state),beforeMidnight);unchanged(resumed,()=>claimDaily(resumed,beforeMidnight),'claimed');
  unchanged(resumed,()=>claimDaily(resumed,beforeMidnight-86400000),'claimed');
  assert.equal(claimDaily(resumed,afterMidnight).ok,true);assert.equal(resumed.dailyClaimDate,'2026-10-16');
});

test('recipe cooks on a full board, consumes exact ingredients, and retains reusable high-level tools',()=>{
  const state=blank();fill(state);put(state,0,'fruit',1);put(state,1,'fruit',1);put(state,2,'vegetable',1);put(state,3,'tools',4);
  const tool=state.board[3],progress=getRecipeProgress(state,'fruit-salad');assert.equal(progress.ready,true);assert.equal(progress.toolReady,true);
  const r=cookRecipe(state,'fruit-salad');assert.equal(r.ok,true);assert.deepEqual(r.consumed,[0,1,2]);assert.equal(state.board[0].family,'fruit');assert.equal(state.board[0].level,4);
  assert.equal(state.board[3],tool);assert.equal(state.board[1],null);assert.equal(state.cooked,1);
});

test('recipes require unlocked ingredients and reusable tools; failures consume nothing',()=>{
  const state=blank();put(state,0,'fruit',1);put(state,1,'fruit',1);put(state,2,'vegetable',1);put(state,3,'tools',1);
  state.locked=[3];unchanged(state,()=>cookRecipe(state,'fruit-salad'),'tool');
  state.locked=[2];unchanged(state,()=>cookRecipe(state,'fruit-salad'),'incomplete');
  state.locked=[];storeItem(state,2);unchanged(state,()=>cookRecipe(state,'fruit-salad'),'incomplete');
  unchanged(state,()=>cookRecipe(state,'fresh-sushi'),'locked');
  unchanged(state,()=>cookRecipe(state,'missing'),'invalid');
});

test('duplicate recipe requirements aggregate before readiness and every recipe is reachable',()=>{
  const state=blank();put(state,0,'food',1);put(state,1,'tools',1);
  const duplicated={needs:[{family:'food',level:1,count:1},{family:'food',level:1,count:1}],toolLevel:1,unlockStage:0};
  assert.equal(getRecipeProgress(state,duplicated).ready,false);put(state,2,'food',1);assert.equal(getRecipeProgress(state,duplicated).ready,true);
  for(const recipe of RECIPES) {
    assert.ok(isReachable(recipe));
    const s=blank();s.stage=recipe.unlockStage;let index=0;
    for(const need of recipe.needs)for(let n=0;n<need.count;n++)put(s,index++,need.family,need.level);
    const toolIndex=index;put(s,toolIndex,'tools',recipe.toolLevel);const tool=s.board[toolIndex];
    assert.equal(cookRecipe(s,recipe.id).ok,true,recipe.id);assert.equal(s.board[toolIndex],tool);
  }
  function isReachable(recipe){return recipe.needs.every(n=>Object.values(PRODUCER_DEFS).some(p=>p.unlockStage<=recipe.unlockStage&&p.families.includes(n.family)))&&recipe.toolLevel<=6;}
});

test('v1 save migration preserves every existing item and progress, queues new producer on full board, and is idempotent',()=>{
  const old={version:1,board:Array.from({length:49},(_,i)=>({id:`item-${i+1}`,family:i%2?'food':'tools',level:i%6+1})),coins:333,energy:47,xp:125,completed:7,merges:19,orderSerial:20,nextItemId:50,generationCount:80,lastEnergyAt:NOW,discovered:['food:1','tools:6'],orders:[{id:'order-12',title:'老订单',customer:'小鹿',needs:[{family:'food',level:5,count:2}],coins:120,xp:60}]};
  old.board[0]={id:'producer-food',family:'producer',kind:'food',level:1};old.board[6]={id:'producer-tools',family:'producer',kind:'tools',level:1};
  const savedBoard=structuredClone(old.board),state=createGame(old,NOW);
  assert.equal(state.version,2);assert.equal(state.coins,333);assert.equal(state.energy,47);assert.equal(state.xp,125);assert.equal(state.completed,7);assert.equal(state.merges,19);
  for(let i=0;i<49;i++)for(const [key,value] of Object.entries(savedBoard[i]))assert.equal(state.board[i][key],value,`${i}.${key}`);
  assert.equal(state.locked.length,0);assert.equal(state.orders[0].id,'order-12');assert.equal(state.orders[0].needs[0].level,5);
  assert.ok(state.pending.some(i=>i.kind==='produce'));assert.equal(state.pending.filter(i=>i.family==='chest').length,1);
  const reloaded=createGame(serialize(state),NOW);assert.deepEqual(reloaded,state);
});

test('v1 missing producers are added to free spaces without replacing valuable occupied slots',()=>{
  const saved={version:1,board:Array(49).fill(null),nextItemId:2};saved.board[0]={id:'item-1',family:'food',level:6};
  const state=createGame(saved,NOW);assert.equal(state.board[0].level,6);assert.equal(state.board[0].family,'food');
  for(const kind of ['food','tools','produce'])assert.ok(state.board.some(i=>i?.kind===kind));
  assert.ok(state.locked.every(i=>state.board[i]===null));
});

test('save normalization repairs duplicate IDs, invalid fields, bad orders, and preserves inventory/pending',()=>{
  const state=createGame(null,NOW),saved=JSON.parse(serialize(state));saved.coins=-5;saved.energy='1';saved.xp=null;saved.maxEnergy=999;saved.lastEnergyAt=NOW+1000;
  saved.board[1]={family:'__proto__',level:1};saved.board[2]={family:'food',level:99};saved.board[8].id='item-123';saved.board[9].id='item-123';
  saved.inventory=[{id:'item-123',family:'fruit',level:6}];saved.pending=[{id:'item-123',family:'chest',level:3}];saved.locked=[-1,49,1.5,0,35,35];
  saved.discovered=['food:2','food:2','food:90'];saved.orders=[{id:'broken'},null,{id:'order-100',needs:[{family:'food',level:2,count:2}],coins:-99}];
  const restored=createGame(saved,NOW);assert.equal(restored.coins,120);assert.equal(restored.energy,100);assert.equal(restored.xp,0);assert.equal(restored.maxEnergy,100);
  assert.equal(restored.board[1],null);assert.equal(restored.board[2],null);assert.equal(restored.inventory[0].family,'fruit');assert.equal(restored.pending[0].level,3);
  const ids=[...restored.board,...restored.inventory,...restored.pending].filter(Boolean).map(i=>i.id);assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(restored.locked,[35]);assert.equal(restored.orders.length,3);assert.equal(new Set(restored.orders.map(i=>i.id)).size,3);
  assert.ok(!restored.discovered.includes('food:90'));assert.doesNotThrow(()=>createGame('{bad json',NOW));assert.doesNotThrow(()=>createGame({version:1,board:[]},NOW));
});

test('valid save round trip retains all state including cooldown, storage, RNG and pending reward identities',()=>{
  const state=createGame(null,NOW);move(state,8,9,NOW);generate(state,0,NOW);storeItem(state,22);claimDaily(state,NOW);
  const restored=createGame(serialize(state),NOW);assert.deepEqual(restored,state);
});

test('invalid indexes never move, delete, unlock, or spend resources',()=>{
  const state=createGame(null,NOW);
  for(const invalid of [-1,49,999,1.5,NaN,undefined,null,'8']){
    unchanged(state,()=>move(state,invalid,9,NOW));unchanged(state,()=>move(state,8,invalid,NOW));
    unchanged(state,()=>sellItem(state,invalid));unchanged(state,()=>storeItem(state,invalid));unchanged(state,()=>collectItem(state,invalid,NOW));
    unchanged(state,()=>unlockCell(state,invalid));unchanged(state,()=>resolveBubble(state,invalid,true,NOW));
  }
});

test('legacy refill and selling continue to use the original economy',()=>{
  const state=createGame(null,NOW);state.energy=10;const r=refillEnergy(state,NOW);assert.equal(r.amount,30);assert.equal(state.energy,40);assert.equal(state.coins,90);
  assert.equal(sellItem(state,22).coins,4);assert.equal(state.coins,94);assert.equal(state.board[22],null);
});

test('chapter journal shows cumulative tasks and never grants unfinished rewards',()=>{
  const state=createGame(null,NOW),before=snapshot(state),progress=getChapterProgress(state);
  assert.equal(progress.chapter.id,'chapter-1');assert.equal(progress.total,3);assert.equal(progress.completed,0);
  assert.equal(progress.ready,false);assert.equal(progress.allComplete,false);assert.equal(progress.invalid,false);
  assert.deepEqual(progress.tasks.map(task=>[task.value,task.target,task.done]),[[0,1,false],[0,1,false],[0,1,false]]);
  assert.equal(snapshot(state),before);unchanged(state,()=>claimChapter(state,0,NOW),'incomplete');
});

test('first chapter follows merge, delivery and cooking and grants coffee plus 80 coins without spending stars',()=>{
  const state=createGame(null,NOW);
  move(state,8,9,NOW);assert.equal(fulfillOrder(state,state.orders[0].id).ok,true);
  move(state,14,15,NOW);move(state,15,19,NOW);put(state,1,'food',2);
  assert.equal(cookRecipe(state,'golden-toast').ok,true);
  const progress=getChapterProgress(state);assert.equal(progress.ready,true);assert.equal(progress.completed,3);
  const coins=state.coins,stars=state.stars,board=structuredClone(state.board),r=claimChapter(state,0,NOW);
  assert.equal(r.ok,true);assert.equal(r.type,'chapter');assert.equal(state.stage,1);assert.equal(state.coins,coins+80);assert.equal(state.stars,stars);
  assert.deepEqual(state.board,board);assert.equal(r.rewards.length,1);assert.equal(r.rewards[0].kind,'drink');
  assert.equal(state.pending.at(-1),r.rewards[0]);assert.equal(getRecipeProgress(state,'silky-latte').locked,false);
  unchanged(state,()=>claimChapter(state,0,NOW),'claimed');
});

test('chapter rewards stay pending on a full board and stale claims cannot advance another ready chapter',()=>{
  const state=blank();fill(state);state.discovered.push('food:4','drink:4');state.completed=4;state.cooked=2;
  const board=structuredClone(state.board);assert.equal(claimChapter(state,0,NOW).ok,true);
  assert.deepEqual(state.board,board);assert.equal(state.pending[0].kind,'drink');assert.equal(getChapterProgress(state).ready,true);
  unchanged(state,()=>claimChapter(state,0,NOW),'claimed');assert.equal(state.pending.length,1);
  const restored=createGame(serialize(state),NOW);
  unchanged(restored,()=>claimChapter(restored,0,NOW),'claimed');assert.equal(restored.pending.filter(item=>item.kind==='drink').length,1);
  assert.equal(claimChapter(restored,1,NOW).ok,true);assert.equal(restored.pending.filter(item=>item.kind==='herb').length,1);
});

test('chapter claims preserve an already-owned unlocked producer without issuing a duplicate',()=>{
  for(const location of ['board','inventory','pending']) {
    const state=blank(),existing={id:'old-coffee',family:'producer',kind:'drink',level:2,charges:18,readyAt:0};
    if(location==='board')state.board[0]=existing;else state[location].push(existing);
    state.discovered.push('food:4');state.completed=1;state.cooked=1;
    assert.equal(claimChapter(state,0,NOW).ok,true);
    const devices=[...state.board,...state.inventory,...state.pending].filter(item=>item?.kind==='drink');
    assert.deepEqual(devices,[existing]);
  }
});

test('legacy stage progress and resources migrate into chapters without replaying claimed rewards',()=>{
  for(const version of [1,2]) {
    const saved=createGame(null,NOW);saved.version=version;saved.stage=3;saved.stars=17;saved.coins=250;saved.energy=43;
    saved.completed=12;saved.cooked=5;saved.discovered.push('chinese:3','japanese:3');
    producer(saved,1,'drink');producer(saved,2,'herb');producer(saved,4,'asian');
    const state=createGame(serialize(saved),NOW),progress=getChapterProgress(state);
    assert.equal(progress.chapter.id,'chapter-4');assert.equal(progress.ready,true);assert.equal(state.stars,17);
    assert.equal(state.coins,250);assert.equal(state.energy,43);unchanged(state,()=>claimChapter(state,0,NOW),'claimed');
    assert.equal(claimChapter(state,3,NOW).ok,true);assert.equal(state.stage,4);assert.equal(state.stars,17);
    assert.equal(state.pending.filter(item=>item.kind==='mediterranean').length,1);
    const resumed=createGame(serialize(state),NOW);assert.deepEqual(resumed,state);unchanged(resumed,()=>claimChapter(resumed,3,NOW),'claimed');
  }
});

test('all chapters are reachable with earlier devices and preserve the original unlock and storage rewards',()=>{
  const state=createGame(null,NOW),available=new Set(['food','produce','tools']);state.locked=[];
  for(const chapter of CHAPTERS) {
    assert.equal(state.stage,chapter.stage);
    const discoveries=chapter.tasks.find(task=>task.kind==='discover').items;
    for(const key of discoveries) {
      const [family,levelText]=key.split(':'),level=Number(levelText);
      assert.ok([...available].some(kind=>PRODUCER_DEFS[kind].families.includes(family)),`${chapter.id} cannot discover ${key}`);
      assert.ok(level>1&&level<=CHAINS[family].length);
      // A successful merge records the required discovery even after the item is sold or delivered.
      put(state,10,family,level-1);put(state,11,family,level-1);assert.equal(move(state,10,11,NOW).ok,true);
    }
    const orderTarget=chapter.tasks.find(task=>task.kind==='orders').target;
    while(state.completed<orderTarget) {
      const order=state.orders[0];let index=7;
      for(const need of order.needs)for(let n=0;n<need.count;n++)put(state,index++,need.family,need.level);
      assert.equal(fulfillOrder(state,order.id).ok,true);
    }
    const cookTarget=chapter.tasks.find(task=>task.kind==='cook').target;
    while(state.cooked<cookTarget) {
      put(state,7,'fruit',1);put(state,8,'fruit',1);put(state,9,'vegetable',1);put(state,12,'tools',1);
      assert.equal(cookRecipe(state,'fruit-salad').ok,true);
    }
    const stars=state.stars;assert.equal(getChapterProgress(state).ready,true);assert.equal(claimChapter(state,chapter.stage,NOW).ok,true);
    assert.equal(state.stars,stars);
    if(chapter.reward.unlockKind) {
      available.add(chapter.reward.unlockKind);
      assert.ok(state.pending.some(item=>item.kind===chapter.reward.unlockKind));
      assert.equal(PRODUCER_DEFS[chapter.reward.unlockKind].unlockStage,state.stage);
    }
  }
  assert.equal(state.stage,8);assert.equal(state.storageCapacity,14);
  assert.equal(getChapterProgress(state).allComplete,true);assert.equal(getChapterProgress(state).ready,false);
  unchanged(state,()=>claimChapter(state,8,NOW),'max');
});

test('invalid and stale chapter stages cannot grant items, spend stars or advance progress',()=>{
  const state=createGame(null,NOW);state.discovered.push('food:4');state.completed=100;state.cooked=100;
  for(const stage of [-1,9,0.5,NaN,undefined,null,'0']) {
    state.stage=stage;assert.equal(getChapterProgress(state).invalid,true);unchanged(state,()=>claimChapter(state,stage,NOW),'invalid');
  }
  state.stage=0;
  for(const expected of [-1,1,0.5,NaN,null,'0'])unchanged(state,()=>claimChapter(state,expected,NOW),'claimed');
});
