import test from 'node:test';
import assert from 'node:assert/strict';
import {createDisplayController} from '../display-mode.mjs';
function fixture(options={}){
 const events=new Map(),calls=[],changes=[];const doc={fullscreenEnabled:true,fullscreenElement:null,documentElement:{},addEventListener:(k,f)=>{if(!events.has(k))events.set(k,new Set());events.get(k).add(f);},removeEventListener:(k,f)=>{events.get(k)?.delete(f);if(!events.get(k)?.size)events.delete(k);}};
 const screen={orientation:{async lock(mode){calls.push(['lock',mode]);if(options.rejectLock)throw Error('NotSupportedError');},unlock(){calls.push(['unlock']);}}};
 doc.documentElement.requestFullscreen=async()=>{calls.push(['enter']);if(options.rejectFull)throw Error('Denied');doc.fullscreenElement=doc.documentElement;events.get('fullscreenchange')?.forEach(fn=>fn());};
 doc.exitFullscreen=async()=>{calls.push(['exit']);doc.fullscreenElement=null;events.get('fullscreenchange')?.forEach(fn=>fn());};
 if(options.noLock)delete screen.orientation.lock;
 if(options.noFull)delete doc.documentElement.requestFullscreen;
 const controller=createDisplayController({doc,screen,onChange:s=>changes.push(s)});
 return {controller,doc,screen,calls,events,changes};
}
test('landscape enters native fullscreen before locking, and automatic mode releases the lock',async()=>{
 const f=fixture();assert.equal(await f.controller.action('landscape'),true);
 assert.deepEqual(f.calls,[['enter'],['lock','landscape']]);assert.equal(f.controller.state().locked,'landscape');assert.equal(f.controller.state().fullscreen,true);
 await f.controller.action('auto');assert.equal(f.controller.state().locked,'auto');assert.equal(f.controller.state().fullscreen,true);
});
test('browser escape exits fullscreen, clears requested direction and refreshes real state',async()=>{
 const f=fixture();await f.controller.action('portrait');f.doc.fullscreenElement=null;f.events.get('fullscreenchange').forEach(fn=>fn());assert.equal(f.controller.state().locked,'auto');assert.equal(f.controller.state().fullscreen,false);assert.deepEqual(f.calls.at(-1),['unlock']);
});
test('unsupported or denied orientation never claims successful locking',async()=>{
 for(const options of [{noLock:true},{rejectLock:true},{rejectFull:true}]){
 const f=fixture(options);assert.equal(await f.controller.action('landscape'),false);assert.equal(f.controller.state().locked,'auto');assert.match(f.controller.state().message,/不支持|未允许/);assert.equal(f.controller.state().busy,false);
 }
});
test('fullscreen rejection and missing API remain recoverable',async()=>{
 for(const options of [{noFull:true},{rejectFull:true}]){const f=fixture(options);assert.equal(await f.controller.action('fullscreen'),false);assert.equal(f.controller.state().fullscreen,false);assert.equal(f.controller.state().busy,false);assert.match(f.controller.state().message,/未允许全屏/);}
});
test('an in-progress request cannot trigger duplicate fullscreen or orientation calls',async()=>{
 const f=fixture();let complete;f.screen.orientation.lock=mode=>{f.calls.push(['lock',mode]);return new Promise(r=>complete=r);};const first=f.controller.action('landscape');await Promise.resolve();await Promise.resolve();assert.equal(f.controller.state().busy,true);assert.equal(await f.controller.action('portrait'),false);complete();await first;assert.equal(f.calls.filter(c=>c[0]==='lock').length,1);
});
test('native exit button and WebKit-prefixed fullscreen use real document state',async()=>{
 const f=fixture();f.doc.documentElement.webkitRequestFullscreen=f.doc.documentElement.requestFullscreen;delete f.doc.documentElement.requestFullscreen;f.doc.webkitExitFullscreen=f.doc.exitFullscreen;delete f.doc.exitFullscreen;
 await f.controller.action('fullscreen');assert.equal(f.controller.state().fullscreen,true);await f.controller.action('fullscreen');assert.equal(f.controller.state().fullscreen,false);f.controller.destroy();assert.equal(f.events.size,0);assert.equal(await f.controller.action('landscape'),false);
});

test('legacy WebKit waits for its asynchronous event when the API returns void',async()=>{
 const f=fixture();delete f.doc.documentElement.requestFullscreen;f.doc.documentElement.webkitRequestFullscreen=()=>{setTimeout(()=>{f.doc.webkitFullscreenElement=f.doc.documentElement;f.events.get('webkitfullscreenchange')?.forEach(fn=>fn());},0);};
 assert.equal(await f.controller.action('fullscreen'),true);assert.equal(f.controller.state().fullscreen,true);assert.equal(f.controller.state().message,'');f.controller.destroy();
});

test('leaving the farm releases direction without exiting user-selected fullscreen',async()=>{
 const f=fixture();await f.controller.action('landscape');f.controller.releaseOrientation();assert.equal(f.controller.state().locked,'auto');assert.equal(f.controller.state().fullscreen,true);assert.deepEqual(f.calls.at(-1),['unlock']);
});
test('a late orientation lock cannot survive leaving the farm while its promise is pending',async()=>{
 const f=fixture();let resolve;f.screen.orientation.lock=()=>new Promise(r=>resolve=r);const action=f.controller.action('landscape');for(let i=0;i<8&&!resolve;i++)await Promise.resolve();assert.equal(typeof resolve,'function');f.controller.releaseOrientation();resolve();assert.equal(await action,false);assert.equal(f.controller.state().locked,'auto');assert.deepEqual(f.calls.at(-1),['unlock']);
});
