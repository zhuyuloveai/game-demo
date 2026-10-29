import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createFarm,executeFarm} from '../farm-core.mjs';
import * as config from '../farm-config.mjs';
import {createStroke,extendStroke,finishStroke,cancelStroke} from '../farm-scene-world.mjs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
function harness(){
 const calls=[],messages=[],state=createFarm(0);state.level=30;state.xp=config.LEVELS[29].totalXp;state.inventory.corn=5;
 const fields=state.entities.filter(e=>e.kind==='field');
 const tray={left:0,top:0,right:20,bottom:20},bounds={left:0,top:0,right:500,bottom:500};
 const c=vm.createContext({config,chosenSeed:null,selected:fields[0].id,selectedAnimal:null,gesture:null,draft:null,placement:null,more:false,localPage:null,seedPage:0,recipePage:0,lastFieldTap:null,harvestView:false,clearPreview:null,pendingRecipe:null,activeJob:null,pinch:null,destroyed:false,edgeStamp:0,edgeRaf:0,camera:{x:0,y:0,zoom:1},context:{},note:{},cursor:{style:{}},root:{querySelectorAll:()=>[]},game:{getBoundingClientRect:()=>bounds},win:{cancelAnimationFrame(){},requestAnimationFrame:()=>1},edgeFrame(){},refreshMotion(){},renderMap(){},renderTransaction(){},ctx:{state,say:s=>messages.push(s),clearFeedback(){},layout:{isFixedEntity:()=>false}},createStroke,extendStroke,finishStroke,cancelStroke,
  esc:String,name:id=>config.ITEMS[id]?.name||id,toolArt:()=>'',image:()=>'',title:()=> '农田',remaining:()=> '1分钟',entityArt:()=>'',button:(a,label)=>`<button data-action="${a}">${label}</button>`,patchFarmMarkup:(_node,html)=>{c.html=html;},point:e=>({x:e.clientX,y:e.clientY}),within:(p,r)=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom,gestureUI:()=>false,
 });
 c.entity=id=>c.ctx.state.entities.find(e=>e.id===id);c.selectedEntity=()=>c.entity(c.selected);c.targets=fields.map((e,i)=>({id:e.id,left:40+i*30,right:60+i*30,top:40,bottom:60}));c.targetsFor=()=>c.targets.filter(t=>!c.entity(t.id).crop);
 c.doAct=command=>{calls.push(JSON.parse(JSON.stringify(command)));try{const result=executeFarm(c.ctx.state,JSON.parse(JSON.stringify(command)),c.ctx.state.now);c.ctx.state=result.state;return {ok:true,...result};}catch(error){return {ok:false,error};}};
 vm.runInContext([
  section('    function tool(action,','    function machineBoard('),
  section('    function rectData(','    function toolFrom(').replace(section('    function actualUI(','    function cancelGesture('),''),
  section('    function tapTool(','    function gestureUI('),
  section('    function handleUp(','    function edgeFrame('),
  section('    function closeTemporary(','    function openStorage('),
  section('    function action(action,el)','    function point(event)'),
  'function render(){renderContext();}',
 ].join('\n'),c);
 const makeGesture=(itemId='wheat')=>({id:1,type:'tool-pending',start:{x:10,y:10},last:{x:50,y:50},tool:{action:'plant',itemId,entityId:c.selected||'__seedmode'},source:{getBoundingClientRect:()=>tray,closest:()=>({getBoundingClientRect:()=>tray})}});
 const start=(itemId='wheat',p={x:50,y:50})=>{const g=makeGesture(itemId);c.gesture=g;c.startToolDrag(g,p);return g;};
 const up=(x=50,y=50)=>c.handleUp({pointerId:1,clientX:x,clientY:y});
 const visibleSeeds=()=>[...(c.html||'').matchAll(/data-item="([^"]+)"/g)].map(m=>m[1]);
 return {c,calls,messages,fields,start,up,visibleSeeds};
}
function assertList(h){assert.deepEqual(h.visibleSeeds(),Object.values(config.CROPS).filter(x=>x.level<=h.c.ctx.state.level).slice(h.c.seedPage*4,h.c.seedPage*4+4).map(x=>x.id));assert.equal(h.c.selected,null);}
test('completed sowing returns all seeds on the current page, retaining continuous seed choice and charging once',()=>{
 const h=harness(),before=h.c.ctx.state.inventory.wheat;h.start();assert.equal(h.c.chosenSeed,'wheat');assert.equal(h.c.html,'');h.up();assertList(h);assert.equal(h.c.ctx.state.inventory.wheat,before-1);assert.equal(h.calls.length,1);h.up();assert.equal(h.calls.length,1);
});
test('one multi-field sow gesture keeps its original seed until release, then immediately permits another seed',()=>{
 const h=harness(),g=h.start();h.c.previewGesture(g,{x:110,y:50});assert.equal(h.c.chosenSeed,'wheat');assert.equal(h.fields.slice(0,3).filter(e=>h.c.entity(e.id).crop?.itemId==='wheat').length,3);h.up(110);assertList(h);
 h.c.tapTool({action:'plant',itemId:'corn',entityId:'__seedmode'});assert.equal(h.c.chosenSeed,'corn');assertList(h);h.start('corn',{x:140,y:50});h.up(140);assert.equal(h.c.entity(h.fields[3].id).crop.itemId,'corn');assertList(h);
});
test('sowing preserves pagination and the next-page control stays usable afterward',()=>{
 const h=harness();h.c.seedPage=1;h.start();h.up();assertList(h);assert.equal(h.c.seedPage,1);h.c.action('seeds-next');assert.equal(h.c.seedPage,2);assertList(h);
});
test('pointer cancel after partial sow keeps committed crops and restores the list rather than growing-crop detail',()=>{
 const h=harness();h.start();h.c.cancelGesture('pointercancel');assertList(h);assert.equal(h.c.entity(h.fields[0].id).crop.itemId,'wheat');h.up();assert.equal(h.calls.length,1);
});
test('outside or UI release restores seed list and never replays already committed sowing',()=>{
 for(const exit of ['outside','ui']){const h=harness();h.start();if(exit==='ui')h.c.gestureUI=()=>true;h.up(exit==='outside'?600:50);assertList(h);assert.equal(h.calls.length,1);assert.equal(h.c.entity(h.fields[0].id).crop.itemId,'wheat');}
});
test('no-hit, full-field and insufficient-seed strokes all return seed list without a stale detail panel',()=>{
 for(const mode of ['empty','full','insufficient']){const h=harness();if(mode==='empty')h.c.targets=[];if(mode==='full')for(const e of h.c.ctx.state.entities.filter(e=>e.kind==='field'))e.crop={itemId:'wheat',readyAt:1000};if(mode==='insufficient')h.c.ctx.state.inventory.wheat=0;const economy=()=>JSON.stringify({inventory:h.c.ctx.state.inventory,coins:h.c.ctx.state.coins,entities:h.c.ctx.state.entities});const before=economy();h.start();h.up();assertList(h);assert.equal(economy(),before);assert.equal(h.calls.length,mode==='insufficient'?1:0);}
});
test('close and explicit end sowing clear the retained seed and list; later pointerup cannot plant',()=>{
 for(const action of ['close-tool','stop-seeding']){const h=harness();h.start();h.up();h.c.action(action);assert.equal(h.c.chosenSeed,null);assert.equal(h.c.selected,null);assert.equal(h.c.html,'');h.up();assert.equal(h.calls.length,1);}
});

test('a rejected sow command restores the list and is not retried by pointerup',()=>{
 const h=harness();let attempts=0;h.c.doAct=()=>{attempts++;return {ok:false,error:{code:'STALE_REVISION'}};};const before=h.c.ctx.state.inventory.wheat;h.start();h.up();assertList(h);assert.equal(attempts,1);assert.equal(h.c.ctx.state.inventory.wheat,before);h.up();assert.equal(attempts,1);
});
