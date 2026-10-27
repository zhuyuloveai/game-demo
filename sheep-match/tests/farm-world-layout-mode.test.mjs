import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {patchFarmMarkup} from '../farm-dom-patch.mjs';
import {isPristineWorldDraft} from '../farm-scene-world.mjs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../farm-scene-world.css',import.meta.url),'utf8');
const branch=source.slice(source.indexOf('const s=ctx.state,stages='),source.indexOf('const focused=doc.activeElement?.dataset?.entity;'));
const clock=source.slice(source.indexOf('function refreshClockLabels(){'),source.indexOf('function renderForest(){'));
const classes=()=>{const set=new Set();return {toggle(k,on){on?set.add(k):set.delete(k)},remove:(...keys)=>keys.forEach(k=>set.delete(k)),has:k=>set.has(k),contains:k=>set.has(k)}};
function harness(){
 const row={id:'field',kind:'field',x:1,y:2,rotation:0,stored:false},fixed={id:'house',kind:'house',x:5,y:5,rotation:0};
 const nodes=[row,fixed].map(e=>({dataset:{entity:e.id,delightIdle:'crop'},classList:classes(),attrs:{},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},querySelector:()=>null}));
 const world={classList:classes(),querySelectorAll:s=>s==='[data-entity]'?nodes:[]};
 const c=vm.createContext({ctx:{state:{entities:[row,fixed],now:0,openedLand:[],storage:{}},core:{storageUsed:()=>0},layout:{isFixedEntity:e=>e.kind==='house'}},resolveWorldArt:(e,now)=>({key:now<1000?'young':'grown'}),selected:null,selectedAnimal:null,harvestView:false,draft:null,placement:null,growthPreview:null,clearPreview:null,gesture:null,id:'P01',mapSignature:null,normalMapSignature:null,mapProvenance:'none',isPristineWorldDraft,world,transform(){},entity:id=>c.ctx.state.entities.find(e=>e.id===id),stateBadge:()=> '生长中',title:e=>e.id,worldBadge:()=>({mode:'none'}),name:id=>id});
 vm.runInContext(clock,c);const run=()=>vm.runInContext(`(()=>{${branch};return 'full'})()`,c),draft=()=>({positions:c.ctx.state.entities.map(e=>({id:e.id,x:e.x,y:e.y,rotation:e.rotation,stored:!!e.stored}))});return {c,world,nodes,run,draft};
}
test('pristine draft verifies every unique entity and exact geometry/stored state',()=>{
 const s={entities:[{id:'a',x:1,y:2},{id:'b',x:3,y:4,stored:true}]},d={positions:structuredClone(s.entities)};
 assert.equal(isPristineWorldDraft(s,d),true);assert.equal(isPristineWorldDraft(s,null),true);
 for(const positions of [[d.positions[0]], [d.positions[0],d.positions[0]], [{...d.positions[0],x:5},d.positions[1]], [d.positions[0],{...d.positions[1],stored:false}], [{...d.positions[0],skinId:'unexpected'},d.positions[1]]])assert.equal(isPristineWorldDraft(s,{positions}),false);
});
test('normal enter/cancel/reenter reuses mode path and restores classes, aria and animation identity',()=>{
 const h=harness();assert.equal(h.run(),'full');h.c.draft=h.draft();assert.equal(h.run(),undefined);assert(h.world.classList.has('fw-layout-fast'));assert(h.nodes[0].classList.has('editing'));assert(h.nodes[1].classList.has('fw-layout-fixed'));assert.match(h.nodes[0].attrs['aria-label'],/拖动布置/);assert.match(h.nodes[1].attrs['aria-label'],/固定建筑/);
 h.c.draft=null;assert.equal(h.run(),undefined);assert(!h.world.classList.has('fw-layout-fast'));assert(!h.nodes[0].classList.has('editing'));assert(!h.nodes[1].classList.has('fw-layout-fixed'));assert.equal(h.nodes[0].attrs['aria-label'],'field，生长中');assert.equal(h.nodes[0].dataset.delightIdle,'crop');
 h.c.draft=h.draft();assert.equal(h.run(),undefined);assert.equal(h.c.mapProvenance,'normal');
});
test('actual movement or blueprint enters full provenance and exit cannot reuse normal DOM',()=>{
 for(const mode of ['move','blueprint','selection']){const h=harness();h.run();h.c.draft=h.draft();h.run();if(mode==='move')h.c.draft.positions[0].x++;if(mode==='blueprint')h.c.growthPreview={plan:{}};if(mode==='selection')h.c.selected='field';assert.equal(h.run(),'full');assert.equal(h.c.mapProvenance,'editing-full');assert.equal(h.c.normalMapSignature,null);assert(!h.world.classList.has('fw-layout-fast'));h.c.draft=null;h.c.growthPreview=null;h.c.selected=null;assert.equal(h.run(),'full');assert.equal(h.c.mapProvenance,'normal')}
});
test('maturity or saved entity change while editing forces full and does not reuse stale badges on exit',()=>{
 for(const change of [c=>c.ctx.state.now=1000,c=>c.ctx.state.entities[0]={...c.ctx.state.entities[0],crop:{readyAt:10}}]){const h=harness();h.run();h.c.draft=h.draft();h.run();change(h.c);assert.equal(h.run(),'full');h.c.draft=null;assert.equal(h.run(),'full')}
 assert.match(css,/\.fw-layout-fast \.fw-badge,\.fw-layout-fast \.fw-pen-summary,\.fw-layout-fast \.fw-pen-label,\.fw-layout-fast \.fw-animal-state\{display:none!important\}/);
});
test('full fallback restores controller classes and aria even when markup equality skips all DOM patching',()=>{
 const h=harness();h.run();assert.equal(patchFarmMarkup(h.world,'same-normal-html'),true);h.c.draft=h.draft();h.run();assert(h.nodes[0].classList.has('editing'));assert(h.nodes[1].classList.has('fw-layout-fixed'));
 h.c.draft=null;h.c.ctx.state.storage={presentationDependencyChanged:true};assert.equal(h.run(),'full');
 assert.equal(patchFarmMarkup(h.world,'same-normal-html'),false);assert(!h.nodes[0].classList.has('editing'));assert(!h.nodes[1].classList.has('fw-layout-fixed'));assert(!h.world.classList.has('fw-layout-fast'));assert.equal(h.nodes[0].attrs['aria-label'],'field，生长中');
});
