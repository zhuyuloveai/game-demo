import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameNavigation} from '../game-navigation.mjs';
import {historyWindow} from './navigation-fixture.mjs';
const kinds=nav=>nav.path.map(r=>r.kind);
test('initial root replaces only current entry; Back at root is allowed to leave',()=>{
 const win=historyWindow([{external:true},null]),nav=createGameNavigation(win);
 assert.equal(win.history.length,2);nav.push({kind:'farm'});nav.back();win.flush();assert.deepEqual(kinds(nav),['home']);
 const length=win.history.length;win.history.back();win.flush();assert.equal(win.index,0);assert.equal(win.history.length,length);assert.deepEqual(win.history.state,{external:true});nav.destroy();
});
test('Back, Forward, explicit X, and repeated X traverse the same finite stack',()=>{
 const win=historyWindow(),nav=createGameNavigation(win);nav.push({kind:'farm'});nav.push({kind:'scene',id:'P07'});nav.push({kind:'scene',id:'P08'});
 const key=nav.path.at(-1).key;nav.close(key);nav.close(key);win.flush();assert.equal(nav.path.at(-1).id,'P07');
 win.history.forward();win.flush();assert.equal(nav.path.at(-1).id,'P08');nav.home();win.flush();assert.deepEqual(kinds(nav),['home']);
 win.history.forward();win.flush();assert.deepEqual(kinds(nav),['home','farm']);
});
test('duplicate opens are ignored and a new route after Back truncates Forward',()=>{
 const win=historyWindow(),nav=createGameNavigation(win);nav.push({kind:'farm'});nav.push({kind:'facility',entityId:'chicken_coop'});
 const length=win.history.length;assert.equal(nav.push({kind:'facility',entityId:'chicken_coop'}),false);assert.equal(win.history.length,length);
 nav.back();win.flush();nav.push({kind:'scene',id:'P07'});win.history.forward();win.flush();assert.equal(nav.path.at(-1).id,'P07');assert.equal(win.history.length,length);
});
test('panel close then a source action waits for popstate instead of racing history',()=>{
 const win=historyWindow(),nav=createGameNavigation(win);nav.push({kind:'farm'});nav.push({kind:'facility',entityId:'chicken_coop'});
 nav.close(nav.path.at(-1).key);nav.push({kind:'scene',id:'P05'});assert.equal(nav.path.at(-1).kind,'facility');win.flush();assert.deepEqual(kinds(nav),['home','farm','scene']);
 nav.back();win.flush();assert.deepEqual(kinds(nav),['home','farm']);
});
test('refresh restores scenes and facility descriptors, but never callbacks or economy',()=>{
 const win=historyWindow(),nav=createGameNavigation(win);nav.push({kind:'farm'});nav.push({kind:'scene',id:'P04',options:{focusEntity:'chicken_coop'}});nav.push({kind:'facility',entityId:'chicken_coop'});
 const path=nav.path,length=win.history.length;nav.destroy();const restored=createGameNavigation(win);assert.deepEqual(restored.path,path);assert.equal(win.history.length,length);
});
test('refresh discards transient confirmation and still closes to the correct real ancestor',()=>{
 const win=historyWindow(),nav=createGameNavigation(win);nav.push({kind:'farm'});nav.push({kind:'facility',entityId:'bakery'});nav.push({kind:'confirm',token:'1'});nav.destroy();
 const restored=createGameNavigation(win);assert.deepEqual(kinds(restored),['home','farm','facility']);restored.back();win.flush();assert.deepEqual(kinds(restored),['home','farm']);
});
test('malformed state and excessive nesting cannot create unbounded synthetic entries',()=>{
 const win=historyWindow([{sheepPastureNavigation:{version:1,index:-1,path:[]}}]),nav=createGameNavigation(win);assert.deepEqual(kinds(nav),['home']);
 for(let i=0;i<100;i++)nav.push({kind:'scene',id:`P${i}`});assert.equal(nav.path.length,64);assert.equal(win.history.length,64);
});
