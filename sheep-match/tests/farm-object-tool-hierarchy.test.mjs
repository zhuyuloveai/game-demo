import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as config from '../farm-config.mjs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const render=source.slice(source.indexOf('    function seedTools('),source.indexOf('    function machineBoard('));
function paint(e,{level=30,page=0,open=false,owner=e.id}={}){
 let html='';const context={querySelector:()=>open?{open:true,dataset:{owner}}:null};
 const c=vm.createContext({context,chosenSeed:null,selected:e.id,gesture:null,draft:null,placement:null,more:false,localPage:null,seedPage:page,selectedEntity:()=>e,config,ctx:{state:{level,now:0,inventory:{wheat:2},npc:{freeRevives:1}},layout:{isFixedEntity:()=>false}},tool:(a,l)=>`<button data-tool="${a}">${l}</button>`,button:(a,l)=>`<button data-action="${a}">${l}</button>`,image:()=>'<img>',item:()=>'<img>',entityArt:()=>'',esc:String,name:String,title:()=>e.kind,remaining:()=> '2分',vouchersEnabled:()=>true,patchFarmMarkup:(_el,s)=>html=s});vm.runInContext(render,c);c.renderContext();return html;
}
test('field tools remain primary, management is collapsed and seed pages are explicit',()=>{
 const html=paint({id:'field_1',kind:'field',crop:null});assert.match(html,/种子 1\/3/);assert.match(html,/拖过空田，逐格播种/);assert.match(html,/<details class="fw-object-management" data-owner="field_1"><summary>管理/);assert(html.indexOf('data-tool="plant"')<html.indexOf('<details'));assert(!html.includes('点击种子只选种'));
 const low=paint({id:'field_1',kind:'field',crop:null},{level:1});assert(!low.includes('seeds-next'));
});
test('management expansion persists through clock refresh but not a different selected object',()=>{
 const e={id:'field_1',kind:'field',crop:{itemId:'wheat',readyAt:100}};assert.match(paint(e,{open:true}),/data-owner="field_1" open/);assert.doesNotMatch(paint(e,{open:true,owner:'other'}),/data-owner="field_1" open/);
});
test('ripe fruit exposes real yield and cycle without changing harvest command',()=>{
 const e={id:'apple_1',kind:'fruit',configId:'apple',status:'ready',harvestStage:0};const html=paint(e);assert.match(html,/data-tool="harvest"/);assert(html.includes(`本次 ${config.FRUITS.apple.sequence[0]}个`));assert(html.includes(`第1轮 / ${config.FRUITS.apple.sequence.length}轮`));assert(!html.includes('revive'));
});
