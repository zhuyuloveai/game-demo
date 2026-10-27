import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmStore,makeEnvelope,FARM_SAVE_KEY} from '../farm-save.mjs';
import {createFarm} from '../farm-core.mjs';
function setup(){
 const data=new Map();let time=1000,mono=0,reads=0,writes=0;
 const storage={getItem(k){reads++;return data.get(k)??null},setItem(k,v){writes++;data.set(k,String(v))},removeItem:k=>data.delete(k)};
 const store=createFarmStore({storage,locks:null,now:()=>time,monotonicNow:()=>mono});
 store.dispatch({type:'setSettings',settings:{sound:false}});
 return {data,store,storage,get reads(){return reads},get writes(){return writes},advance(){time+=1000;mono+=1000}};
}
function parseCount(fn){const original=JSON.parse;let count=0;JSON.parse=(...args)=>{count++;return original(...args)};try{fn();return count}finally{JSON.parse=original}}
test('byte-identical A/B snapshots reuse validation but read storage each time',()=>{
 const f=setup(),before=f.reads;
 assert.equal(parseCount(()=>{for(let i=0;i<20;i++)assert.equal(f.store.recoveries().length,1)}),0);
 assert.equal(f.reads-before,40);f.store.close();
});
test('corrupt changed slot is rejected, invalid bytes cached, and later repaired bytes revalidated',()=>{
 const f=setup(),key=FARM_SAVE_KEY+':a',original=f.data.get(key);
 f.data.set(key,'{broken');assert.equal(parseCount(()=>assert.deepEqual(f.store.recoveries(),[])),1);
 assert.equal(parseCount(()=>assert.deepEqual(f.store.recoveries(),[])),0);
 f.data.set(key,original);assert.equal(parseCount(()=>assert.equal(f.store.recoveries().length,1)),1);
 f.data.delete(key);assert.deepEqual(f.store.recoveries(),[]);f.data.set(key,original);
 assert.equal(parseCount(()=>assert.equal(f.store.recoveries().length,1)),1);f.store.close();
});
test('changed valid external commit cannot bypass conflict check through cached slot',()=>{
 const f=setup(),before=f.store.getState(),external=structuredClone(before);external.revision++;external.coins++;
 f.data.set(FARM_SAVE_KEY+':a',JSON.stringify(makeEnvelope(external,{savedAtWallMs:1000,commitId:'external_changed'})));
 const result=f.store.dispatch({type:'setSettings',settings:{sound:true}});
 assert.equal(result.ok,false);assert.equal(result.code,'STALE_REVISION');assert.equal(f.store.readOnly,true);assert.deepEqual(f.store.getState(),before);f.store.close();
});
test('tick retains synchronous readback, A/B durability and clock checkpoint despite cache',()=>{
 const f=setup(),before=f.store.getState(),writes=f.writes,reads=f.reads;f.advance();
 assert.equal(f.store.tick().ok,true);assert.equal(f.writes-writes,2);assert.equal(f.reads-reads,6);
 const after=f.store.getState();assert.equal(after.now,before.now+1000);assert(after.revision>before.revision);
 const latest=f.store.recoveries()[0],saved=JSON.parse(f.data.get(FARM_SAVE_KEY+':'+latest.slot));assert.equal(saved.payload.now,after.now);
 // Public copies cannot corrupt the internally cached validated envelope.
 after.coins=999999;latest.coins=888888;assert.equal(f.store.recoveries()[0].coins,before.coins);f.store.close();
});
test('post-write corruption is still detected and uncommitted state is not published',()=>{
 const f=setup(),before=f.store.getState(),set=f.storage.setItem;
 f.storage.setItem=(k,v)=>set(k,k.endsWith(':b')?'{broken':v);
 const result=f.store.dispatch({type:'setSettings',settings:{sound:true}});
 assert.equal(result.ok,false);assert.equal(result.code,'SAVE_FAILED');assert.deepEqual(f.store.getState(),before);assert.equal(f.data.has(FARM_SAVE_KEY+':b'),false);f.store.close();
});

function canonicalRootCount(fn){
 const original=JSON.stringify;let count=0;
 JSON.stringify=(value,...rest)=>{if(value==='entities')count++;return original(value,...rest)};
 try{fn();return count}finally{JSON.stringify=original}
}
test('changed revision skips duplicate state comparison but still checksums write and readback',()=>{
 const f=setup(),writes=f.writes;f.advance();
 assert.equal(canonicalRootCount(()=>assert.equal(f.store.tick().ok,true)),2);
 assert.equal(f.writes-writes,2);f.store.close();
});
test('equal revision retains canonical comparison and does not rewrite an unchanged tick',()=>{
 const f=setup(),before=f.store.getState(),writes=f.writes;
 assert.equal(canonicalRootCount(()=>assert.equal(f.store.tick().ok,true)),2);
 assert.equal(f.writes,writes);assert.deepEqual(f.store.getState(),before);f.store.close();
});
