import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as core from '../farm-core.mjs';
import {createStroke,extendStroke,cancelStroke} from '../farm-scene-world.mjs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const preview=source.slice(source.indexOf('    function previewGesture('),source.indexOf('    function toolFrom('));
function harness({seeds=6,harvest=false,failAt=0}={}){
 let state=core.createFarm(0),commands=[],paints=0;
 if(harvest){state=core.executeFarm(state,{type:'plant',entityIds:['field_1','field_2'],itemId:'wheat'},0).state;state=core.advanceFarm(state,120000).state;}else state.inventory.wheat=seeds;
 const targets=[1,2,3].map(n=>({id:`field_${n}`,left:n*20,top:0,right:n*20+10,bottom:10}));
 const g={tool:{action:harvest?'harvest':'plant',itemId:'wheat'},immediate:true,completed:0,skipped:0};g.stroke=createStroke(g.tool,{x:0,y:5});
 const c=vm.createContext({camera:{x:0,y:0,zoom:1},extendStroke,targetsFor:()=>targets,render:()=>paints++,note:{},cursor:{style:{}},game:{getBoundingClientRect:()=>({left:0,top:0})},doAct:command=>{commands.push(command);if(commands.length===failAt)return {ok:false};try{const r=core.executeFarm(state,command,state.now);state=r.state;return {ok:true,...r};}catch(error){return {ok:false,error};}}});
 vm.runInContext(preview,c);return {g,move:x=>c.previewGesture(g,{x,y:5}),get state(){return state},commands,get paints(){return paints}};
}
test('pointermove commits every crossed cell before pointerup and paints once per sample',()=>{const h=harness();h.move(55);assert.equal(h.commands.length,1);assert.equal(h.state.inventory.wheat,4);assert.equal(h.g.completed,2);assert.equal(h.paints,1);assert(h.g.stroke.active);});
test('backtracking over committed cells never dispatches or spends twice',()=>{const h=harness();h.move(55);h.move(0);h.move(55);assert.equal(h.commands.length,1);assert.equal(h.state.inventory.wheat,4);});
test('cancel discards only the unfinished gesture and keeps persisted cells',()=>{const h=harness();h.move(35);cancelStroke(h.g.stroke,'pointercancel');h.move(75);assert.equal(h.commands.length,1);assert.equal(h.state.inventory.wheat,5);assert(h.state.entities.find(e=>e.id==='field_1').crop);});
test('mature field swipe updates inventory immediately using current state',()=>{const h=harness({harvest:true});const before=h.state.inventory.wheat;h.move(55);assert.equal(h.g.completed,2);assert.equal(h.state.inventory.wheat,before+4);assert.equal(h.state.entities.filter(e=>e.crop).length,0);});
test('storage dispatch failure stops remaining sampled and future targets without undoing success',()=>{const h=harness({failAt:2});h.move(35);h.move(75);assert.equal(h.commands.length,2);assert.equal(h.g.completed,1);assert.equal(h.g.skipped,2);assert.equal(h.state.inventory.wheat,5);assert(h.g.stopped);h.move(0);h.move(75);assert.equal(h.commands.length,2);});
test('insufficient seeds create no false successes and never make inventory negative',()=>{const h=harness({seeds:1});h.move(75);assert.equal(h.g.completed,1);assert.equal(h.state.inventory.wheat,0);assert.equal(h.state.entities.filter(e=>e.crop).length,1);});
