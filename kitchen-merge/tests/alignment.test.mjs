import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../dist/engine.mjs';
import { backupBeforeMigration } from '../dist/save-store.mjs';
const NOW=1792108800000;
const old=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/v3-49.json',import.meta.url),'utf8'));
const blank=()=>{const s=E.createGame(null,NOW);s.board.fill(null);s.locked=[];s.pending=[];s.tools=[];s.orders=[];return s;};
const put=(s,i,id)=>(s.board[i]=E.makeItem(s,id,NOW));
const fill=s=>{for(let i=0;i<E.BOARD_SIZE;i++)if(!s.board[i])put(s,i,'food:1');};

test('dated anchors have independent capacity/CD/probability provenance',()=>{
  assert.equal(E.BOARD_COLS,7);assert.equal(E.BOARD_ROWS,9);assert.equal(E.BOARD_SIZE,63);
  for(const [id,stock,cd] of [['gen_supply:4',16,25441],['gen_supply:5',16,15959],['gen_supply:6',16,9599],['gen_supply:7',21,5639],['gen_recycle:6',10,2760],['gen_recycle:9',10,340],['gen_recycle:10',10,170]]){
    const row=E.sourceRules(E.definition(id)).manual;
    assert.equal(row.maxStock,stock,id);assert.equal(row.rechargeSeconds,cd,id);
    assert.equal(row.fieldEvidence.maxStock.evidence,'P');
    assert.equal(row.fieldEvidence.outputLevelProb.evidence,'D');
    assert.equal(row.fieldEvidence.batch.evidence,'P');
  }
  for(const [id,cap] of [['gen_tools:4',20],['gen_tools:5',24],['gen_food:5',12],['gen_herb:10',10]])assert.equal(E.sourceRules(E.definition(id)).manual.maxStock,cap);
});

test('new board locks all four lower rows and leaves old starter indices intact',()=>{
  const s=E.createGame(null,NOW);
  assert.equal(s.board.length,63);assert.equal(s.locked.length,28);
  assert.deepEqual(s.locked,Array.from({length:28},(_,i)=>35+i));
  assert.equal(E.itemKey(s.board[0]),'gen_food:5');
  assert.equal(E.itemKey(s.board[6]),'gen_tools:4');
  assert.ok(s.board.slice(49).every(x=>x===null));
  assert.equal(E.unlockCost(s,49),40);assert.equal(E.unlockCost(s,62),44);
});

test('move, hints, production and merging reach first and last cells; invalid 63 stays atomic',()=>{
  const s=blank();put(s,0,'food:1');put(s,62,'food:1');
  assert.equal(E.findMerge(s).to,62);
  assert.equal(E.move(s,0,62,NOW).ok,true);assert.equal(E.itemKey(s.board[62]),'food:2');
  put(s,0,'gen_food:5');fill(s);s.board[61]=null;
  assert.equal(E.generate(s,0,NOW).index,61);
  const before=E.serialize(s);assert.equal(E.generate(s,0,NOW).ok,false);assert.equal(E.serialize(s),before);
  assert.equal(E.move(s,62,63,NOW).ok,false);assert.equal(E.serialize(s),before);
});

test('automatic output never wraps a row; bottom corner reaches the valid neighbor',()=>{
  for(const [source,hole] of [[6,7],[56,55]]){
    const s=blank();put(s,source,'herb:6');fill(s);s.board[hole]=null;s.board[source].autoBuffer=1;
    E.tick(s,NOW);assert.equal(s.board[hole],null);assert.equal(s.board[source].autoBuffer,1);
  }
  const s=blank();put(s,62,'herb:6');fill(s);s.board[55]=null;s.board[62].autoBuffer=1;
  E.tick(s,NOW);assert.equal(E.itemKey(s.board[55]),'snail:1');assert.equal(s.board[62].autoBuffer,0);
});

test('bottom-row locked cells open beside a merge and require an explicit unlock before moving in',()=>{
  const s=blank();put(s,61,'food:1');put(s,62,'food:1');s.locked=[55,56];
  assert.equal(E.move(s,61,56,NOW).ok,false);
  E.move(s,61,62,NOW);assert.ok(!s.locked.includes(55));assert.ok(s.locked.includes(56));
  const coins=s.coins;assert.equal(E.unlockCell(s,56,NOW).ok,true);assert.equal(s.coins,coins-44);
  assert.equal(E.move(s,62,56,NOW).ok,true);
});

test('new cat nest expires after exactly 12 paid draws, never accepts recharge tools',()=>{
  const s=blank();put(s,62,'garden_guest:6');s.energy=100;
  const t=E.makeItem(s,'charge:1',NOW,{location:'tools'});s.tools.push(t);
  const before=E.serialize(s);assert.equal(E.useTool(s,t.id,62,NOW).ok,false);assert.equal(E.serialize(s),before);
  for(let i=0;i<12;i++){
    const out=E.generate(s,62,NOW);assert.equal(out.ok,true);assert.equal(E.itemKey(out.item),'cats:1');
    s.board[out.index]=null;
    if(i<11)assert.equal(s.board[62].remainingDraws,11-i);
  }
  assert.equal(s.board[62],null);assert.equal(s.energy,88);
});

test('historical timed paths obey selected periods and capacity; newer conflicting values stay recorded',()=>{
  assert.deepEqual([E.sourceRules(E.definition('herb:6')).auto.intervalSeconds,E.sourceRules(E.definition('herb:6')).auto.capacity],[1800,2]);
  assert.equal(E.sourceRules(E.definition('scraps:8')).auto.intervalSeconds,480);
  assert.equal(E.sourceRules(E.definition('keys:5')).manual.draws,7);
  assert.equal(E.sourceRules(E.definition('console:4')).manual.draws,3);
  assert.equal(E.sourceRules(E.definition('pantry:1')).manual.rechargeSeconds,21600);
  assert.equal(E.sourceRules(E.definition('pantry:8')).auto.intervalSeconds,1920);
  assert.deepEqual([E.sourceRules(E.definition('pantry:11')).auto.intervalSeconds,E.sourceRules(E.definition('pantry:11')).auto.capacity],[240,6]);
  assert.ok(E.BALANCE.alignment.decisions.some(x=>x.target==='gen_supply:6'&&x.conflict.includes('8/6h')));
});

test('real PR6 v3 fixture migrates 49→63 with positions, claims, balances and RNG preserved',()=>{
  const raw=old(),s=E.createGame(raw,NOW);
  assert.equal(raw.board.length,49);assert.equal(s.board.length,63);assert.equal(s.version,4);
  for(let i=0;i<49;i++)assert.equal(s.board[i]?.id,raw.board[i]?.id,`index ${i}`);
  for(const k of ['coins','gems','energy','xp','stars','rng','claimed','credits','mainCompleted','orders','transactionSerial','nextItemId','dailyClaimDate'])assert.deepEqual(s[k],raw[k],k);
  assert.deepEqual(s.locked,[42,48,...Array.from({length:14},(_,i)=>49+i)]);
  assert.equal(s.board[0].stock+s.board[0].stockOverflow,27);
  assert.equal(s.board[0].stock,20);assert.equal(s.board[0].stockOverflow,7);
  assert.equal(s.board[0].rechargeRemaining,123456);assert.equal(s.board[2].autoRemaining,234567);
  assert.equal(s.board[4].remainingDraws,7);assert.equal(s.board[5].timerRemaining,456789);
  assert.equal(s.inventory[0].stock+s.inventory[0].stockOverflow,19);
  assert.equal(s.inventory[0].rechargeRemaining,567890);
  assert.equal(s.pending.length,raw.pending.length);
  assert.deepEqual(E.createGame(E.serialize(s),NOW),s);
});

test('migration settles offline production with original v3 rules before applying new CD',()=>{
  const s=E.createGame(old(),NOW+12*3600000);
  // PR6 cart L4: batch 12 / cap 24 / period 4h. New cart has a 28h CD.
  assert.equal(s.board[1].stock,16);assert.equal(s.board[1].stockOverflow,8);
  assert.equal(s.board[1].rechargeRemaining,14400000);
  assert.equal(s.rng,12345678);
  // Paused warehouse stock does not refill during migration.
  assert.equal(s.inventory[0].stock+s.inventory[0].stockOverflow,19);
  assert.equal(s.inventory[0].rechargeRemaining,567890);
  assert.ok(s.board[5].timerRemaining===0);assert.equal(s.board[4].remainingDraws,7);
});

test('old permanent cat nest survives migration, reload, storage and its next recharge',()=>{
  const s=E.createGame(old(),NOW),nest=s.board[3];
  assert.equal(nest.legacyV3,true);assert.equal(E.sourceRules(nest).manual.mode,'recharge');
  assert.equal(nest.stock+nest.stockOverflow,20);assert.equal(nest.rechargeRemaining,345678);
  E.storeItem(s,3,NOW);E.tick(s,NOW+1e8);assert.equal(nest.rechargeRemaining,345678);
  E.retrieveItem(s,s.inventory.indexOf(nest),NOW+1e8);
  const reload=E.createGame(E.serialize(s),NOW+1e8);
  const n=reload.board.find(x=>x?.id===nest.id);assert.equal(n.legacyV3,true);
  assert.equal(E.sourceRules(n).manual.maxStock,40);
});

test('migration validates locks/unknown fields before mutation and backs up v3 exact text',()=>{
  for(const change of [s=>s.locked.push(49),s=>s.locked.push(42),s=>s.board[0].legacyV3=true,s=>s.board[0].itemId='unknown:1']){
    const raw=old();change(raw);const text=JSON.stringify(raw);
    assert.throws(()=>E.createGame(raw,NOW),E.SaveError);assert.equal(JSON.stringify(raw),text);
  }
  const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},text=JSON.stringify(old());
  backupBeforeMigration(storage,'qa-v3',text);assert.equal(store.get('qa-v3-v3-backup'),text);assert.equal(store.get('qa-v3-migration-backup'),text);
  assert.throws(()=>backupBeforeMigration({getItem:()=>null,setItem:()=>{throw Error('quota');}},'qa-v3',text),/quota/);
});

test('used L1 piglets follow the recorded merge route; used L2 and bags cannot wash draws',()=>{
  const s=blank();put(s,0,'tipjar:1');put(s,1,'tipjar:1');
  for(const i of [0,1])for(let n=0;n<14;n++){
    const out=E.collectItem(s,i,NOW);assert.equal(out.ok,true);s.board[out.index]=null;
  }
  assert.equal(s.board[0].remainingDraws,1);assert.equal(s.board[1].remainingDraws,1);
  assert.equal(E.move(s,0,1,NOW).ok,true);assert.equal(E.itemKey(s.board[1]),'tipjar:2');
  assert.equal(s.board[1].remainingDraws,18);assert.equal(s.board[1].openedAt,null);
  put(s,0,'tipjar:2');E.collectItem(s,1,NOW);
  const before=E.serialize(s);assert.equal(E.move(s,1,0,NOW).ok,false);assert.equal(E.serialize(s),before);
});

test('purple scissors stack up to 20; use, full-board failure, reload and warehouse preserve counts',()=>{
  const s=blank();put(s,0,'splitter:3');
  for(let i=1;i<20;i++){put(s,1,'splitter:3');assert.equal(E.move(s,1,0,NOW).ok,true);}
  assert.equal(s.board[0].uses,20);put(s,1,'splitter:3');
  const before=E.serialize(s);assert.equal(E.move(s,1,0,NOW).ok,false);assert.equal(E.serialize(s),before);
  s.board[1]=null;put(s,2,'food:4');
  assert.equal(E.previewTool(s,0,2,NOW).ok,true);assert.equal(s.board[0].uses,20);
  assert.equal(E.useTool(s,0,2,NOW).ok,true);assert.equal(s.board[0].uses,19);
  fill(s);const full=E.serialize(s);assert.equal(E.useTool(s,0,2,NOW).ok,false);assert.equal(E.serialize(s),full);
  E.storeItem(s,0,NOW);const r=E.createGame(E.serialize(s),NOW);assert.equal(r.inventory[0].uses,19);
  r.board[3]=null;E.retrieveItem(r,0,NOW);assert.equal(r.board.find(x=>x?.family==='splitter'&&x.uses===19)?.uses,19);
});

test('art outside the approved V6 redesign stays byte-identical; refreshed IDs use separate illustrations',async()=>{
  const {createHash}=await import('node:crypto'),{icon}=await import('../dist/art.mjs');
  const {hashes}=JSON.parse(fs.readFileSync(new URL('./fixtures/art-main-ae84b44.json',import.meta.url),'utf8'));
  const plan=JSON.parse(fs.readFileSync(new URL('../docs/art/ITEM_IDENTITIES_V6.json',import.meta.url),'utf8'));
  const refreshed=new Set([...plan.chains.filter(c=>c.runtimeEnabled).flatMap(c=>c.items.map(i=>i.id)),...Object.keys(plan.legacyAliases)]);
  assert.equal(Object.keys(hashes).length,421);
  let retained=0;
  for(const [id,digest]of Object.entries(hashes)){
    const svg=icon(E.ITEMS[id].icon),actual=createHash('sha256').update(svg).digest('hex');
    if(refreshed.has(id)){
      assert.ok(svg.includes(`data-classic-item="${id}"`),id);
      assert.notEqual(actual,digest,id);
    }else{assert.equal(actual,digest,id);retained++;}
  }
  assert.equal(retained,22);
  assert.ok(!/NaN|undefined/.test(icon(E.ITEMS['gen_recycle:10'].icon)));
});
