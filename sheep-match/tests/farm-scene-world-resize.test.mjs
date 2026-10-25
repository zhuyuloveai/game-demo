import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeWorldCamera,resizeHasPendingAction} from '../farm-scene-world.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
const portrait={w:390,h:564.703},landscape={w:844,h:314};
const initial={x:-2032.2,y:-2184.00098,zoom:1.6};
const center=(c,v)=>({x:(v.w/2-c.x)/c.zoom,y:(v.h/2-c.y)/c.zoom});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
test('viewport width/height resize preserves logical world center, not a DOM top-left coordinate',()=>{
 const result=resizeWorldCamera(initial,portrait,landscape),before=center(initial,portrait),after=center(result,landscape);close(after.x,before.x);close(after.y,before.y);assert.equal(result.zoom,initial.zoom);
});
test('repeated portrait→landscape→portrait and duplicate resize events never drift',()=>{
 let c={...initial},last=portrait;
 for(let i=0;i<100;i++)for(const size of [landscape,landscape,{w:360,h:480},portrait,portrait]){c=resizeWorldCamera(c,last,size);last=size;}
 close(c.x,initial.x);close(c.y,initial.y);assert.equal(c.zoom,1.6);
});
test('390→zero screenshot viewport→390 retains camera and the last valid viewport',()=>{
 let c={...initial},last={...portrait};
 for(const size of [{w:0,h:portrait.h},{w:390,h:0},{w:0,h:0},portrait]){
   c=resizeWorldCamera(c,last,size);if(size.w>0&&size.h>0)last=size;
 }
 assert.deepEqual(plain(c),initial);assert.deepEqual(last,portrait);
});
test('invalid or hidden viewport dimensions never create NaN, recenter to zero, or mutate input',()=>{
 const before=JSON.stringify(initial);
 for(const invalid of [{w:0,h:1},{w:1,h:0},{w:-1,h:2},{w:NaN,h:2},{w:Infinity,h:3}])assert.deepEqual(plain(resizeWorldCamera(initial,portrait,invalid)),initial);
 assert.equal(JSON.stringify(initial),before);
});
test('P05 selected machine remains at its unobscured relative anchor through resize and a zero-size interval',()=>{
 const anchor={x:29*48,y:31*48,rx:.5,ry:.34};let c=resizeWorldCamera(initial,portrait,portrait,anchor),last=portrait;
 for(const size of [landscape,{w:0,h:0},{w:360,h:480},portrait]){
   c=resizeWorldCamera(c,last,size,anchor);if(!size.w||!size.h)continue;last=size;
   close(c.x+anchor.x*c.zoom,size.w*.5);close(c.y+anchor.y*c.zoom,size.h*.34);
 }
 close(c.x,-2032.2);
});
test('world camera updates from actual view size observer and never overwrites last size with a hidden frame',()=>{
 assert.match(source,/new win\.ResizeObserver\(scheduleReframe\)/);
 const reframe=source.slice(source.indexOf('function reframeViewport'),source.indexOf('function scheduleReframe'));
 assert.ok(reframe.indexOf('if(!(next.w>0&&next.h>0))return')<reframe.indexOf('viewSize=next'));
 assert.match(reframe,/resizeWorldCamera\(camera,viewSize,next,anchor\)/);
});
