/** QA fixtures only. Never loaded automatically by the game. Run from any cwd. */
import {writeFileSync,mkdirSync} from 'node:fs';
import {createFarm,executeFarm,advanceFarm} from '../farm-core.mjs';
import {FARM_CONFIG,BUILDINGS,ANIMALS,FRUITS,ITEMS,RECIPES,storageCapacity} from '../farm-config.mjs';
import {findFreePlacement} from '../farm-layout.mjs';
import {makeEnvelope,validateFarmState} from '../farm-save.mjs';
const output=new URL('../tests/fixtures/',import.meta.url);mkdirSync(output,{recursive:true});
let s=createFarm(Date.now());
const act=(c,at=s.now)=>{s=executeFarm(s,c,at).state;};
act({type:'plant',itemId:'wheat',ids:['field_1']});act({type:'harvest',ids:['field_1']},s.now+120000);
s.coins=1000000;s.xp=FARM_CONFIG.levelXpToNext.slice(0,29).reduce((a,b)=>a+b,0);s.level=30;s.vouchers=1000;
for(const kind of ['silo','barn'])s.storage[kind]={upgrades:100,capacity:storageCapacity(100)};
const place=(kind,configId,footprint,extra={})=>{const p=findFreePlacement(s,{id:'qa_proposed',kind,configId,w:footprint[0],h:footprint[1],rotation:0});if(!p)throw Error('No space: '+configId);act({type:'buy',category:kind==='shelter'?'shelter':kind,itemId:configId,...p,...extra});return s.entities.at(-1).id;};
for(const b of Object.values(BUILDINGS)){const id=place('machine',b.id,b.footprint);act({type:'completeBuilding',entityId:id},s.entities.find(e=>e.id===id).buildReadyAt);}
for(const a of Object.values(ANIMALS)){const id=a.id==='chicken'?'shelter_chicken_1':place('shelter',a.id,a.footprint);if(a.id!=='chicken')act({type:'buy',category:'animal',entityId:id,quantity:2});}
for(const f of Object.values(FRUITS))place('fruit',f.id,f.footprint);
for(const item of Object.values(ITEMS))s.inventory[item.id]=item.category==='crop'?30:10;
for(const m of s.entities.filter(e=>e.kind==='machine')){const r=Object.values(RECIPES).find(r=>r.machineType===m.machineType);act({type:'enqueue',entityId:m.id,recipeId:r.id});}
for(const e of s.entities.filter(e=>e.kind==='shelter'))act({type:'feed',entityId:e.id});
act({type:'plant',itemId:'wheat',ids:s.entities.filter(e=>e.kind==='field').map(e=>e.id)});
s=advanceFarm(s,s.now+3*86400000).state;
// Rebase timestamps to present so import is not an intentional future-clock test.
const offset=Date.now()-s.now;const timeKeys=new Set(['now','plantedAt','readyAt','startAt','createdAt','buildReadyAt','lastCompletionAt','blockedAt','fertilizerUntil']);
function rebase(v){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(timeKeys.has(k)&&typeof x==='number'&&x>0)v[k]=Math.max(0,x+offset);else if(typeof x==='object')rebase(x);}}
rebase(s);s.day=Math.floor(s.now/86400000);s.npc.budgetDay=s.day;s.npc.supplyBatch=Math.floor(s.now/21600000);s.commandLog={};s.commandWatermarks={};s.commandSeen={};
validateFarmState(s);const envelope=makeEnvelope(s,{saveId:'qa-only-level30',commitId:'qa-fixture',savedAtWallMs:Date.now()});
writeFileSync(new URL('farm-level30-ready.json',output),JSON.stringify(envelope,null,2));
writeFileSync(new URL('README.md',output),'# QA-only农场存档\n\n由tools/create-farm-fixtures.mjs创建，不被游戏自动载入。通过农场设置→导入→确认进行测试。包含30级合法布局、13机器、5动物栏与5果树、成熟作物和待收品。金币与库存是测试预置，不用于经济平衡结论。导入前请导出当前本机档。\n');
console.log(new URL('farm-level30-ready.json',output).pathname);
