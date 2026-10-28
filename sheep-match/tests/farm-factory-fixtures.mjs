/** Isolated real-core fixtures, never shipped or imported by production. */
import * as core from '../farm-core.mjs';
import * as config from '../farm-config.mjs';
import {growthFixture} from './farm-growth-fixtures.mjs';
let base;
export function factoryFixture(configId='bakery',mode='idle'){
 base??=growthFixture(3);let state=structuredClone(base);
 const machine=()=>state.entities.find(e=>e.kind==='machine'&&e.configId===configId);
 if(!machine())throw Error('Unknown factory fixture: '+configId);
 const entityId=machine().id,recipe=Object.values(config.RECIPES).find(r=>r.machineType===machine().machineType),act=command=>{const result=core.executeFarm(state,command,state.now);if(!result.ok)throw Error('Fixture command failed');state=result.state;};
 for(const [id,n] of Object.entries(recipe.inputs))state.inventory[id]=Math.max(state.inventory[id]||0,n*25+1);
 // Complete products from the baseline with the same command used by players.
 if(mode!=='readonly'&&machine().completed.length)act({type:'collectMachine',entityId,jobIds:machine().completed.map(j=>j.id)});
 if(['queue9','shelf9'].includes(mode)){
  state.vouchers=1000;while(machine().slots<9)act({type:'upgradeMachine',entityId});
 }
 if(mode==='shelf9')for(let i=0;i<9;i++){act({type:'enqueue',entityId,recipeId:recipe.id});state=core.advanceFarm(state,state.now+recipe.durationMs+1).state;}
 if(['running','queue9','shelf9'].includes(mode))for(let i=0;i<(mode==='running'?Math.min(2,machine().slots):machine().slots);i++)act({type:'enqueue',entityId,recipeId:recipe.id});
 if(mode==='missing')state.inventory[Object.keys(recipe.inputs)[0]]=0;
 if(mode==='seed'){
  for(const e of state.entities)if(e.kind==='field')e.crop=null;
  for(const [id,n] of Object.entries(recipe.inputs))if(config.CROPS[id])state.inventory[id]=n;
 }
 if(mode==='barnfull'){
  act({type:'enqueue',entityId,recipeId:recipe.id});state=core.advanceFarm(state,state.now+recipe.durationMs+1).state;
  state.inventory.bread=(state.inventory.bread||0)+state.storage.barn.capacity-core.storageUsed(state,'barn');
 }
 core.assertFarm(state);return {state,entityId,recipeId:recipe.id};
}
