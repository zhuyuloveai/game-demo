import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worldMotionKind,ripeCharm,inverseSwayPoint} from '../farm-scene-world.mjs';
test('motion eligibility excludes dead trees, empty fields and resting machines',()=>{
 assert.equal(worldMotionKind({kind:'field'}),'');assert.equal(worldMotionKind({kind:'field',crop:{}}),'crop');
 for(const status of ['revive','withered'])assert.equal(worldMotionKind({kind:'fruit',status}),'');
 assert.equal(worldMotionKind({kind:'fruit',status:'growing'}),'tree');
 assert.equal(worldMotionKind({kind:'machine',built:true,queue:[{}]}),'machine');
 assert.equal(worldMotionKind({kind:'machine',built:true,queue:[]}),'');
});
test('maturity charm only exists on actual ripe crops/fruits and cannot intercept input',()=>{
 assert.equal(ripeCharm({kind:'field',crop:{readyAt:11}},10),'');
 assert.equal(ripeCharm({kind:'fruit',status:'growing'},10),'');
 assert.match(ripeCharm({kind:'field',crop:{readyAt:10}},10),/fw-ripe-star/);
 assert.match(ripeCharm({kind:'fruit',status:'ready'},10),/aria-hidden="true"/);
});
test('inverse sway matches forward rotation at both crop/tree pivots',()=>{
 for(const origin of [.85,.88])for(const angle of [-4,0,4])for(const [u,v] of [[.1,.2],[.5,origin],[.8,.7]]){
  const r=angle*Math.PI/180,w=65,h=97,dx=(u-.5)*w,dy=(v-origin)*h;
  const q=inverseSwayPoint(.5+(dx*Math.cos(r)-dy*Math.sin(r))/w,origin+(dx*Math.sin(r)+dy*Math.cos(r))/h,w,h,angle,origin);
  assert(Math.abs(q.u-u)<1e-12);assert(Math.abs(q.v-v)<1e-12);
 }
});
test('world hooks use current animation mask and dispose controller; host exposes current pause state',()=>{
 const world=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8'),host=readFileSync(new URL('../farm-scene-host.mjs',import.meta.url),'utf8');
 assert.match(world,/animalAnimation\.getArt\(a\.id,animalMeta/);assert.match(world,/animalAnimation\.playEat\(fed\)/);assert.match(world,/animalAnimation\.destroy\(\)/);
 assert.match(host,/get effectsPaused\(\)/);assert.match(host,/refreshPresentation\(\)\{delight\.refresh\(\)/);
});
