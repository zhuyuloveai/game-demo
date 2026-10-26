/** Isolated browser QA fixtures. Never imported by the production runtime. */
import * as core from '../farm-core.mjs';
import * as config from '../farm-config.mjs';
export function growthFixture(stage=1){
 let s=core.createFarm(1800000000000);if(stage===1)return s;
 const levels=[1,9,17,26,30],fieldCounts=[6,18,30,42,48],machineCounts=[0,4,7,11,13],animalCounts=[1,2,3,4,5];
 s.level=levels[stage-1];s.xp=config.FARM_CONFIG.levelXpToNext.slice(0,s.level-1).reduce((a,b)=>a+b,0);s.coins=1000000;
 for(const kind of ['silo','barn'])s.storage[kind]={upgrades:100,capacity:config.storageCapacity(100)};
 const act=(c,now=s.now)=>{s=core.executeFarm(s,c,now).state;};
 while(s.entities.filter(e=>e.kind==='field').length<fieldCounts[stage-1])act({type:'buy',category:'field'});
 for(const b of Object.values(config.BUILDINGS).filter(b=>b.level<=s.level).slice(0,machineCounts[stage-1])){act({type:'buy',category:'machine',itemId:b.id});const e=s.entities.at(-1);act({type:'completeBuilding',entityId:e.id},e.buildReadyAt);}
 for(const a of Object.values(config.ANIMALS).slice(1,animalCounts[stage-1])){act({type:'buy',category:'shelter',itemId:a.id});act({type:'buy',category:'animal',entityId:s.entities.at(-1).id,quantity:3});}
 if(stage>=4)for(const f of Object.values(config.FRUITS).filter(f=>f.level<=s.level))for(let i=0;i<(stage===5?3:2);i++)act({type:'buy',category:'fruit',itemId:f.id});
 for(const item of Object.values(config.ITEMS))s.inventory[item.id]=item.category==='crop'?100:25;
 const crops=Object.values(config.CROPS).filter(c=>c.level<=s.level);s.entities.filter(e=>e.kind==='field').forEach((e,i)=>act({type:'plant',entityIds:[e.id],itemId:crops[i%crops.length].id}));
 for(const e of s.entities.filter(e=>e.kind==='shelter'))act({type:'feed',entityId:e.id});
 for(const e of s.entities.filter(e=>e.kind==='machine')){const r=Object.values(config.RECIPES).find(r=>r.machineType===e.machineType&&r.level<=s.level);if(r)act({type:'enqueue',entityId:e.id,recipeId:r.id});}
 return core.advanceFarm(s,s.now+3*86400000).state;
}

/** Legal isolated all-state atlas mounted through the REAL farm host, never a renderer mock.
 * Columns: crops sprout/grown/ripe; fruit young/growing/ripe/wilt_help/wilt_final.
 * Commands establish ownership/economy first. Logical clocks are then adjusted on this QA
 * copy to show all states simultaneously; no QA labels enter the saved entity schema.
 */
export function artStatesFixture(){
 let s=core.createFarm(1800000000000);s.level=30;s.xp=config.LEVELS[29].totalXp;s.coins=1000000;
 for(const kind of ['silo','barn'])s.storage[kind]={upgrades:100,capacity:config.storageCapacity(100)};
 const act=c=>{s=core.executeFarm(s,c,s.now).state;};
 while(s.entities.filter(e=>e.kind==='field').length<33)act({type:'buy',category:'field'});
 // Paths would visually compete with this diagnostic grid. They are QA-owned free
 // ground entities, so this isolated atlas intentionally omits them, not player data.
 s.entities=s.entities.filter(e=>e.kind!=='road');
 const fields=s.entities.filter(e=>e.kind==='field'),crops=Object.values(config.CROPS);
 fields.forEach((e,i)=>{e.x=27+(i%3)*2;e.y=24+Math.floor(i/3)*2;});
 for(const crop of crops){s.inventory[crop.id]=10;const row=crops.indexOf(crop);act({type:'plant',entityIds:fields.slice(row*3,row*3+3).map(e=>e.id),itemId:crop.id});}
 // executeFarm clones objects, so always update the current state's field references.
 s.entities.filter(e=>e.kind==='field').forEach((e,i)=>{
   const duration=config.CROPS[e.crop.itemId].durationMs,elapsed=[Math.floor(duration/4),Math.floor(duration*3/4),duration][i%3];
   e.crop.plantedAt=s.now-elapsed;e.crop.readyAt=e.crop.plantedAt+duration;
 });
 const fruitRows=[24,28,32,36,44],states=['young','growing','ripe','wilt_help','wilt_final'];
 Object.values(config.FRUITS).forEach((fruit,row)=>states.forEach((visual,col)=>{
   act({type:'buy',category:'fruit',itemId:fruit.id,x:34+col*3,y:fruitRows[row]});
   const e=s.entities.at(-1);
   if(visual==='young')Object.assign(e,{status:'growing',harvestStage:0,readyAt:s.now+Math.floor(fruit.durationMs*3/4),revived:false});
   if(visual==='growing')Object.assign(e,{status:'growing',harvestStage:1,readyAt:s.now+Math.floor(fruit.durationMs/4),revived:false});
   if(visual==='ripe')Object.assign(e,{status:'ready',harvestStage:0,readyAt:s.now-1,revived:false});
   if(visual==='wilt_help')Object.assign(e,{status:'revive',harvestStage:3,readyAt:0,revived:false});
   if(visual==='wilt_final')Object.assign(e,{status:'withered',harvestStage:4,readyAt:0,revived:true});
 }));
 core.assertFarm(s);return s;
}
export function artStateCoverage(state){
 return {
   crops:state.entities.filter(e=>e.kind==='field'&&e.crop).map(e=>({entityId:e.id,itemId:e.crop.itemId,visual:e.crop.readyAt<=state.now?'ripe':e.crop.readyAt-state.now>(e.crop.readyAt-e.crop.plantedAt)/2?'sprout':'grown',x:e.x,y:e.y})),
   fruits:state.entities.filter(e=>e.kind==='fruit').map(e=>({entityId:e.id,itemId:e.configId,visual:e.status==='ready'?'ripe':e.status==='revive'?'wilt_help':e.status==='withered'?'wilt_final':e.harvestStage===0&&e.readyAt-state.now>config.FRUITS[e.configId].durationMs/2?'young':'growing',x:e.x,y:e.y}))
 };
}
