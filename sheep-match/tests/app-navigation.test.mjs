import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createGameNavigation} from '../game-navigation.mjs';
import {historyWindow} from './navigation-fixture.mjs';
const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const enter=source.slice(source.indexOf('async function enterOperatingFarm('),source.indexOf('function enterGame(')).replace("await import('./farm-runtime.mjs')",'await loadRuntime()');
function harness(){
 const win=historyWindow(),navigation=createGameNavigation(win);navigation.push({kind:'farm'});let resolve,reject;const loading=new Promise((yes,no)=>{resolve=yes;reject=no;}),notices=[],nodes=new Map();
 const c={navigation,view:'home',operatingFarm:null,openingOperatingFarm:false,homeStoryTimer:null,clearTimeout(){},farmHome:{closePanels(){}},closeDrawer(){},closeDialog(){},loadRuntime:()=>loading,returnHome(){},music:{state:{enabled:false,volume:.3},setTrack(){}},FARM_TRACKS:{},soundOn:false,effects:{},write(){},STORAGE:'test',finishPickMotion(){},save(){},renderSeason(){},renderSound(){},toast:value=>notices.push(value),console:{error(){}},document:{body:{dataset:{view:'home'}},querySelector:()=>({hidden:true})},$:id=>{if(!nodes.has(id))nodes.set(id,{hidden:false});return nodes.get(id);}};
 vm.createContext(c);vm.runInContext(enter,c);
 return{c,win,navigation,resolve,reject,notices};
}
test('late farm load rejection cannot erase a newer game navigation after browser Back',async()=>{
 const h=harness(),pending=h.c.enterOperatingFarm(true);h.navigation.back();h.win.flush();h.navigation.push({kind:'game'});h.c.view='game';h.c.document.body.dataset.view='game';
 h.reject(Error('late import failure'));await pending;assert.equal(h.c.view,'game');assert.equal(h.c.document.body.dataset.view,'game');assert.equal(h.navigation.path.at(-1).kind,'game');assert.equal(h.notices.length,0);assert.equal(h.c.openingOperatingFarm,false);
});
test('late farm load success never reveals farm over a newer game navigation',async()=>{
 const h=harness();let opens=0;const pending=h.c.enterOperatingFarm(true);h.navigation.back();h.win.flush();h.navigation.push({kind:'game'});h.c.view='game';h.c.document.body.dataset.view='game';
 h.resolve({createFarmRuntime:async()=>({open(){opens++;}})});await pending;assert.equal(opens,0);assert.equal(h.c.view,'game');assert.equal(h.navigation.path.at(-1).kind,'game');assert.equal(h.c.openingOperatingFarm,false);
});
test('active farm load failure returns to home without reloading or appending history',async()=>{
 const h=harness(),pending=h.c.enterOperatingFarm(true),length=h.win.history.length;h.reject(Error('load failure'));await pending;
 assert.equal(h.c.view,'home');assert.equal(h.navigation.path.length,1);assert.equal(h.win.history.length,length);assert.equal(h.notices.length,1);
});
