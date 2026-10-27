import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const doAct=source.slice(source.indexOf('function doAct('),source.indexOf('function ask('));
const harvest=source.slice(source.indexOf('if(harvest){lastFieldTap=null;'),source.indexOf("if(e?.kind!=='field'",source.indexOf('if(harvest){lastFieldTap=null;')));
const strokeStart=source.indexOf('const cmd=finishStroke(g.stroke);'),stroke=source.slice(strokeStart,source.indexOf("}else if(g.type==='product-pending')",strokeStart));
function harness(id='P01'){
 const frames=[],feeds=[],calls=[],c=vm.createContext({id,presentationDepth:0,gesture:null,selected:'field',chosenSeed:'wheat',lastFieldTap:{},harvest:{type:'harvest'},e:{id:'field'},config:{},name:id=>id,render:()=>frames.push(c.selected),animalAnimation:{playEat:ids=>feeds.push([...ids])},g:{tool:{action:'plant'},stroke:{}},finishStroke:()=>({type:'plant'}),ctx:{state:{entities:[{animals:[{id:'bird',status:'hungry'}]}]}},result:{ok:true},throwing:false});
 const subscriber=source.match(/const unsubscribe=ctx.subscribe\((\(\)=>\{[^\n]+?\})\);/);assert(subscriber);
 c.ctx.subscribe=fn=>{c.notify=fn;return()=>{}};c.ctx.say=()=>{};
 c.ctx.act=command=>{calls.push(command.type);if(c.throwing)throw Error('dispatch failed');if(command.type==='feed'&&c.result.ok)c.ctx.state={entities:[{animals:[{id:'bird',status:'producing'}]}]};c.notify();return c.result};
 vm.runInContext(`${doAct};ctx.subscribe(${subscriber[1]});`,c);
 return {c,frames,feeds,calls,harvest:()=>vm.runInContext(`(()=>{${harvest}})()`,c),stroke:()=>vm.runInContext(`(()=>{${stroke}})()`,c),act:(defer=false)=>vm.runInContext(`doAct({type:'harvest'},'done',${defer})`,c)};
}
test('P01 harvest suppresses intermediate notification paint; two rapid commands each paint once',()=>{
 const h=harness();h.harvest();h.c.selected='field';h.harvest();assert.deepEqual(h.frames,[null,null]);assert.deepEqual(h.calls,['harvest','harvest']);assert.equal(h.c.presentationDepth,0);
});
test('failed P01 harvest restores selection before its single final paint',()=>{
 const h=harness();h.c.result={ok:false,message:'storage failed'};h.harvest();assert.deepEqual(h.frames,['field']);assert.equal(h.c.presentationDepth,0);
});
test('throwing dispatch restores depth and still paints in harvest and stroke finally',()=>{
 for(const method of ['harvest','stroke']){const h=harness();h.c.throwing=true;assert.throws(()=>h[method](),/dispatch failed/);assert.equal(h.c.presentationDepth,0);assert.equal(h.frames.length,1);h.c.throwing=false;h.c.notify();assert.equal(h.frames.length,2)}
});
test('non-P01 and normal commands keep synchronous notification rendering',()=>{
 const h=harness();h.act(false);assert.deepEqual(h.frames,['field']);const other=harness('P02');other.harvest();assert.deepEqual(other.frames,[null,null]);assert.equal(other.c.presentationDepth,0);
});
test('plant stroke paints once after clearing selection, feed transition queues animation before final render',()=>{
 const plant=harness();plant.stroke();assert.deepEqual(plant.frames,[null]);
 const feed=harness();feed.c.g.tool.action='feed';feed.c.finishStroke=()=>({type:'feed'});feed.stroke();assert.deepEqual(feed.feeds,[['bird']]);assert.equal(feed.c.ctx.state.entities[0].animals[0].status,'producing');assert.deepEqual(feed.frames,['field']);assert.equal(feed.c.presentationDepth,0);
});
