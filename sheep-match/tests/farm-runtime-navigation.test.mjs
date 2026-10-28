import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createGameNavigation} from '../game-navigation.mjs';
import {historyWindow} from './navigation-fixture.mjs';
const source=readFileSync(new URL('../farm-runtime.mjs',import.meta.url),'utf8');
async function harness(useNavigation=true){
 const win=historyWindow(),navigation=useNavigation?createGameNavigation(win):null;
 navigation?.push({kind:'farm'});
 const state={revision:1,settings:{sound:false,music:false},branch:{active:null},inventory:{wheat:6},coins:100},commands=[],matches=[],scenes=[];let farmCtx,exits=0;
 const store={ready:Promise.resolve(),readOnly:false,getState:()=>structuredClone(state),subscribe:()=>()=>{},dispatch(command){commands.push(command);if(command.type==='startStage')state.branch.active={level:Number(command.stageId.slice(1))-1,status:'playing',started:false,seed:command.seed};return{ok:true};},close(){}};
 const document={hidden:false,body:{append(){},dataset:{}},createElement:()=>({hidden:false,setAttribute(){},remove(){},querySelector(){return null;}}),addEventListener(){},removeEventListener(){}};
 const code=source.replace(/^import .*;\n/gm,'').replace('export async function','async function')+'\ncreateFarmRuntime';
 const create=vm.runInNewContext(code,{document,window:win,createFarmStore:()=>store,createFarmSoundEffects:()=>({setEnabled(){},setHidden(){},play(){},destroy(){}}),farmMatchCue:v=>v,mountFarm:ctx=>{farmCtx=ctx;return{refresh(){},setActive(){},destroy(){}};},mountFarmMatch:ctx=>{const match={ctx,destroyed:0,destroy(){this.destroyed++;}};matches.push(match);return match;},setInterval(){return 1;},clearInterval(){}});
 const runtime=await create({navigation,onExit:()=>exits++,onScene:scene=>scenes.push(scene)});navigation?.subscribe(()=>runtime.open());runtime.open();
 return{runtime,navigation,win,state,commands,matches,scenes,document,get farmCtx(){return farmCtx;},get exits(){return exits;}};
}
test('history restores a saved story board without replaying startStage or farm economy',async()=>{
 const h=await harness();assert(h.farmCtx.onStartStage('S01','fixed-seed').ok);assert.equal(h.navigation.path.at(-1).kind,'match');assert.equal(h.matches.length,1);
 const before=structuredClone(h.state);h.navigation.back();h.win.flush();assert.equal(h.document.body.dataset.view,'farm');assert.equal(h.matches[0].destroyed,1);
 h.win.history.forward();h.win.flush();assert.equal(h.document.body.dataset.view,'farm-story');assert.equal(h.matches.length,2);assert.equal(h.commands.filter(c=>c.type==='startStage').length,1);assert.deepEqual(h.state,before);
 h.matches.at(-1).ctx.onExit();h.win.flush();assert.equal(h.navigation.path.at(-1).kind,'farm');h.runtime.destroy();
});
test('confirmed stage switch replaces confirmation, so dismiss cannot navigate away from new board',async()=>{
 const h=await harness();h.state.branch.active={level:0,status:'playing',started:true};h.navigation.push({kind:'scene',id:'P15'});h.navigation.push({kind:'confirm',token:'switch'});
 assert(h.farmCtx.onStartStage('S02',undefined,true).ok);assert.deepEqual(h.navigation.path.map(r=>r.kind),['home','farm','scene','match']);assert.equal(h.document.body.dataset.view,'farm-story');
 h.navigation.back();h.win.flush();assert.equal(h.navigation.path.at(-1).kind,'scene');assert.equal(h.commands.filter(c=>c.type==='startStage').length,1);h.runtime.destroy();
});
test('explicit replay replaces the match renderer once and does not append another history route',async()=>{
 const h=await harness();h.farmCtx.onStartStage('S01','first');const length=h.win.history.length;h.matches[0].ctx.onStartStage('S01','retry');
 assert.equal(h.matches.length,2);assert.equal(h.matches[0].destroyed,1);assert.equal(h.win.history.length,length);assert.equal(h.commands.filter(c=>c.type==='startStage').length,2);h.runtime.destroy();
});
test('runtime without app navigation still supports restarting and returning to the farm',async()=>{
 const h=await harness(false);h.farmCtx.onStartStage('S01','first');h.matches[0].ctx.onStartStage('S01','retry');assert.equal(h.matches.length,2);assert.equal(h.matches[0].destroyed,1);
 h.matches[1].ctx.onExit();assert.equal(h.document.body.dataset.view,'farm');h.farmCtx.onExit();assert.equal(h.exits,1);h.runtime.destroy();
});
test('unavailable historical story route is normalized without creating a game or rewarding it',async()=>{
 const h=await harness();h.navigation.push({kind:'match'});assert.equal(h.navigation.path.at(-1).kind,'farm');assert.equal(h.matches.length,0);assert.equal(h.commands.filter(c=>c.type==='startStage').length,0);h.runtime.destroy();
});
