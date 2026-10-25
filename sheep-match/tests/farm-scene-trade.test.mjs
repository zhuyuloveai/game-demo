import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mountTradeScene} from '../farm-scene-trade.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as core from '../farm-core.mjs';
import * as config from '../farm-config.mjs';
import * as layout from '../farm-layout.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'..');
const fixture=JSON.parse(fs.readFileSync(path.join(repo,'tests/fixtures/farm-level30-ready.json'),'utf8')).payload;
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function mount(id,options={}){
 let state=structuredClone(options.initialState||fixture),confirmation=null,seq=0,exits=[],subs=new Set();
 const listeners={},missing=new Set();
 const root={innerHTML:'',dataset:{},classList:{add(){}},ownerDocument:{activeElement:null},contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(k,fn)=>listeners[k]=fn,removeEventListener:(k)=>delete listeners[k]};
 const emit=()=>{for(const f of subs)f();};
 const ctx={...options,id,root,config,core,layout,get state(){return state;},esc,name:id=>config.ITEMS[id]?.name||config.BUILDINGS[id]?.name||id,img:(p,a='',c='')=>{if(!fs.existsSync(path.join(repo,'assets/farm',p)))missing.add(p);return `<img src="${p}" alt="${a}" class="${c}">`;},item:(id,c='')=>`<img src="items/${id}.svg" alt="${id}" class="${c}">`,asset:p=>p,subscribe:f=>{subs.add(f);return()=>subs.delete(f);},onExit:f=>exits.push(f),say(){},confirm:o=>confirmation=o,act:command=>{try{const r=core.executeFarm(state,{...command,commandId:`farmcmd:test${id}:${++seq}`},state.now);state=r.state;emit();return r;}catch(error){return{ok:false,error};}},advance:ms=>{state=core.advanceFarm(state,state.now+ms).state;emit();},reset:()=>{state=structuredClone(fixture);seq=0;emit();},setScenario:(f)=>{const n=structuredClone(state);f(n);core.assertFarm(n);state=n;emit();}};
 const cleanup=mountTradeScene(ctx);
 return {ctx,root,missing,get state(){return state;},get confirmation(){return confirmation;},fire(type,event){listeners[type](event);},click(action){listeners.click({target:{closest:()=>({dataset:{action},disabled:false})}});},check(value){listeners.change({target:{dataset:{check:'allowSeed'},checked:value}});},confirm(){assert.ok(confirmation,'confirmation should exist');const c=confirmation;confirmation=null;return c.onConfirm();},cancel(){confirmation=null;},cleanup,html:()=>root.innerHTML};
}

for(const id of ['P07','P08','P09','P10','P11']) test(`${id} renders actual fresh progression without mutating it`,()=>{
 const a=mount(id,{initialState:core.createFarm(1000)}),before=structuredClone(a.state);
 assert.match(a.html(),/trade-viewport/);assert.doesNotMatch(a.html(),/演示时钟|内存状态|data-action="scenario:|trade-demo-controls/);
 a.click('reset');a.click('scenario:ready');a.click('time:1800000');assert.deepEqual(a.state,before);a.cleanup();
});
test('production has no fixture, reset, arbitrary state assignment, or demo clock API',()=>{
 const src=fs.readFileSync(path.join(repo,'farm-scene-trade.mjs'),'utf8');
 assert.doesNotMatch(src,/ctx\.(reset|setScenario|advance)|Object\.assign\(s|demo_choices|level30|function scenario/);
});
test('shop renders all real catalog artwork and categories',()=>{const a=mount('P07');for(const t of ['facilities','animals','orchard','seeds','tools','decor','vouchers'])a.click('tab:'+t);assert.deepEqual([...a.missing],[]);a.cleanup();});
test('map placement request is non-mutating and carries authoritative category',()=>{let target;const a=mount('P07',{openScene:(...args)=>target=args});const before=structuredClone(a.state);a.click('product:field');a.click('shopBuy');assert.deepEqual(target,['P01',{initialPlacement:{category:'field',itemId:'field'}}]);assert.deepEqual(a.state,before);a.cleanup();});
test('tool final purchase applies exactly once per explicit purchase',()=>{const a=mount('P07');a.click('tab:tools');a.click('product:axe');const old=a.state.coins,n=a.state.inventory.axe;a.click('shopBuy');assert.equal(a.confirmation,null);assert.equal(a.state.inventory.axe,n+1);assert.equal(a.state.coins,old-config.TOOLS.axe.buyPrice);a.cleanup();});
test('last seed remains protected and explicit rare approval can reclaim it',()=>{const initialState=structuredClone(fixture);initialState.inventory.wheat=1;const a=mount('P08',{initialState});a.click('inventory:wheat');const before=structuredClone(a.state);a.click('sellItem');assert.deepEqual(a.state,before);a.check(true);a.click('sellItem');assert.ok(a.confirmation);assert.equal(a.confirm().ok,true);assert.equal(a.state.inventory.wheat,0);a.cleanup();});
test('market reads do not initialize budgets or spend currency and sold offers cannot repeat',()=>{const a=mount('P09');const before=structuredClone(a.state),o=structuredClone(a.state.npc.shelf[0]);a.click('offer:'+o.id);assert.deepEqual(a.state,before);a.click('buyOffer');assert.equal(a.state.coins,before.coins-o.coins);const after=structuredClone(a.state);a.click('buyOffer');assert.deepEqual(a.state,after);a.cleanup();});
test('stall final submit shows impact and duplicate submit cannot remove goods twice',()=>{const a=mount('P10');a.click('box:'+a.state.npc.boxes[0].id);a.click('listItem:wheat');a.click('qty:1');assert.match(a.html(),/上架立即移出2份库存/);a.click('listConfirm');const after=structuredClone(a.state);a.click('listConfirm');assert.deepEqual(a.state,after);a.cleanup();});
test('missing-source roundtrip preserves original order and reserve preference',()=>{let requested;const initialState=structuredClone(fixture),order=initialState.orders[0];for(const id of Object.keys(order.requirements))initialState.inventory[id]=0;const a=mount('P11',{initialState,openSource:id=>requested=id});a.click('order:'+order.id);a.check(true);const before=structuredClone(a.state);a.click('submitOrder');assert.equal(requested,Object.keys(order.requirements)[0]);assert.deepEqual(a.state,before);a.ctx.advance(1000);assert(a.html().includes('data-action="order:'+order.id+'" aria-pressed="true"'));assert.match(a.html(),/data-check="allowSeed" checked/);a.cleanup();});
test('direct barn opens correct storage and read-only failure displays error without success',()=>{const a=mount('P08',{initialStorage:'barn',act:()=>({ok:false,error:'READ_ONLY',message:'当前窗口只读'})});assert.match(a.html(),/data-action="tab:barn" aria-pressed="true"/);a.ctx.act=()=>({ok:false,error:'READ_ONLY',message:'当前窗口只读'});const before=structuredClone(a.state);a.click('claimTool');assert.match(a.html(),/当前窗口只读/);assert.deepEqual(a.state,before);a.cleanup();});
test('real reduced motion preference is propagated to scene',()=>{const a=mount('P11');a.ctx.setScenario(s=>s.settings.reducedMotion=true);assert.equal(a.root.dataset.reducedMotion,'true');a.cleanup();});
test('seed catalog includes recoverable growing crop protection',()=>{const initialState=core.createFarm(1000);initialState.inventory.wheat=1;const e=initialState.entities.find(e=>e.kind==='field');const planted=core.executeFarm(initialState,{type:'plant',fieldIds:[e.id],itemId:'wheat'},1000).state;const a=mount('P07',{initialState:planted});a.click('tab:seeds');assert.match(a.html(),/农场仍有可收回种子/);a.cleanup();});

test('final cost confirmation survives real clock ticks but rejects changed quoted resources',()=>{const a=mount('P07');a.click('tab:vouchers');a.click('shopBuy');a.ctx.advance(1000);assert.equal(a.confirm().ok,true);a.click('shopBuy');a.ctx.setScenario(s=>s.coins--);const before=structuredClone(a.state);assert.equal(a.confirm().error,'STALE_QUOTE');assert.deepEqual(a.state,before);a.cleanup();});

for(const id of ['P09','P10'])test(`${id} explicitly blocks disabled NPC market with zero economic effects`,()=>{const initialState=structuredClone(fixture);initialState.features.npcMarketEnabled=false;const a=mount(id,{initialState});assert.match(a.html(),/NPC集市功能关闭/);assert.doesNotMatch(a.html(),/class="trade-shelf-slot|class="trade-crate /);const before=structuredClone(a.state);a.click('box:'+a.state.npc.boxes[0].id);a.click('buyOffer');a.click('expandStall');assert.deepEqual(a.state,before);a.cleanup();});
test('construction voucher disabled prevents conversion and removes stall upgrade option',()=>{const initialState=structuredClone(fixture);initialState.features.constructionVouchersEnabled=false;const shop=mount('P07',{initialState});shop.click('tab:vouchers');assert.match(shop.html(),/建设券功能关闭/);const before=structuredClone(shop.state);shop.click('shopBuy');assert.equal(shop.confirmation,null);assert.deepEqual(shop.state,before);shop.cleanup();const stall=mount('P10',{initialState});assert.doesNotMatch(stall.html(),/data-action="expandStall"/);stall.click('expandStall');assert.equal(stall.confirmation,null);assert.deepEqual(stall.state,initialState);stall.cleanup();});
