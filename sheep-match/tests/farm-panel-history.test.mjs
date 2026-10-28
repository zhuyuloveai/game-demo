import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createGameNavigation} from '../game-navigation.mjs';
import {historyWindow} from './navigation-fixture.mjs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const open=source.slice(source.indexOf('    function openObject('),source.indexOf('    function startPlacement('));
const action=source.slice(source.indexOf('    function action(action,el)'),source.indexOf('    function point(event)'));
function harness(){
 const win=historyWindow(),navigation=createGameNavigation(win);navigation.push({kind:'farm'});
 let restoring=false,dismiss=null,panel=null,route=null;
 const shelter={id:'chicken_coop',kind:'shelter',configId:'chicken',animals:[{id:'hen1'}]};
 const c={cancelGesture(){},more:false,localPage:null,clearPreview:null,selected:null,selectedAnimal:null,seedPage:0,recipePage:0,lastFieldTap:null,draft:null,placement:null,chosenSeed:null,harvestView:false,coopPanel:null,destroyed:false,entity:id=>id===shelter.id?shelter:null,selectedEntity:()=>c.entity(c.selected),cropDoubleTapCommand:()=>null,directCropHarvestCommand:()=>null,render(){},config:{},ctx:{state:{now:0}},enterEdit(){c.draft={};},mountChickenCoop(_ctx,opts){panel={destroy(){},act(name){this.destroy();opts.onClose();opts.onAction(name);},close(){this.destroy();opts.onClose();}};return panel;}};
 c.ctx.openFacility=(entityId,create)=>{if(restoring){dismiss=create();return true;}navigation.push({kind:'facility',entityId});return true;};c.ctx.closeFacility=()=>navigation.close(route.key);
 vm.createContext(c);vm.runInContext(open+action,c);
 navigation.subscribe(()=>{const next=navigation.path.find(r=>r.kind==='facility');if(!next&&dismiss){const fn=dismiss;dismiss=null;fn();}else if(next&&!dismiss){route=next;restoring=true;try{c.openObject(next.entityId);}finally{restoring=false;}}});
 c.openObject(shelter.id);
 return{c,win,navigation,get panel(){return panel}};
}
test('actual coop onAction migration keeps selected shelter after asynchronous popstate cleanup',()=>{
 const h=harness();h.panel.act('move-animal-panel');assert.equal(h.c.localPage,'move-animal');assert.equal(h.c.selected,'chicken_coop');h.win.flush();assert.equal(h.c.localPage,'move-animal');assert.equal(h.c.selected,'chicken_coop');assert.equal(h.navigation.path.at(-1).kind,'farm');
});
test('actual coop onAction edit keeps target selected after asynchronous popstate cleanup',()=>{
 const h=harness();h.panel.act('edit');assert(h.c.draft);h.win.flush();assert.equal(h.c.selected,'chicken_coop');assert(h.c.draft);
});
test('browser Back without a panel action still clears the old selection and can Forward reopen',()=>{
 const h=harness();h.navigation.back();h.win.flush();assert.equal(h.c.selected,null);assert.equal(h.c.coopPanel,null);h.win.history.forward();h.win.flush();assert.equal(h.c.selected,'chicken_coop');assert(h.c.coopPanel);
});
test('explicit facility X matches Back and never keeps a stale selected object',()=>{
 const h=harness();h.panel.close();h.win.flush();assert.equal(h.c.selected,null);assert.equal(h.c.coopPanel,null);
});
