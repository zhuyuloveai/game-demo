import test from 'node:test';
import assert from 'node:assert/strict';
import {forestBoundary,forestBoundaryEdges,expansionObstaclePreview} from '../farm-forest-boundary.mjs';
import {LAND_PATCHES,isCellOpen} from '../farm-layout.mjs';
import {createFarm,executeFarm} from '../farm-core.mjs';
import {LEVELS} from '../farm-config.mjs';
import {project} from '../farm-world-geometry.mjs';

test('forest is deterministic, pure, bounded and never decorates owned cells',()=>{
 const state=createFarm(0),before=structuredClone(state),a=forestBoundary(state);
 assert.deepEqual(a,forestBoundary(state));assert.deepEqual(state,before);
 assert.ok(a.decorations.length>200);assert.ok(a.decorations.length<=480);assert.equal(a.obstacles.length,192);
 for(const e of [...a.decorations,...a.obstacles])assert.equal(isCellOpen(state,Math.floor(e.x),Math.floor(e.y)),false);
 assert.equal(new Set(a.decorations.map(e=>e.id)).size,a.decorations.length);
});
test('preview has exact real expansion obstacle identities, footprint and configuration',()=>{
 let state=createFarm(0);state.level=30;state.xp=LEVELS[29].totalXp;Object.assign(state.inventory,{land_deed:10,mallet:10,marker_stake:10});
 const patch=LAND_PATCHES[0],preview=expansionObstaclePreview(patch);
 state=executeFarm(state,{type:'expandLand',patchId:patch.id},state.now).state;
 assert.deepEqual(preview.map(({previewOnly,patchId,...e})=>e),state.entities.filter(e=>e.id.startsWith(patch.id+'_')));
 const boundary=forestBoundary(state);assert.equal(boundary.obstacles.some(e=>e.patchId===patch.id),false);assert.equal(boundary.decorations.some(e=>e.patchId===patch.id),false);
 state.entities=state.entities.filter(e=>!e.id.startsWith(patch.id+'_'));
 assert.deepEqual(forestBoundary(state),boundary,'clearing old owned land never regenerates anything');
});
test('opening two patches preserves positions of surviving decorations and removes internal edges',()=>{
 const s={openedLand:[]},base=forestBoundary(s),p=LAND_PATCHES[0],q=LAND_PATCHES.find(q=>q.id!==p.id&&q.x===p.x+8&&q.y===p.y);
 assert.ok(q);s.openedLand=[p.id,q.id];const after=forestBoundary(s),lookup=new Map(base.decorations.map(e=>[e.id,e]));
 for(const e of after.decorations)assert.deepEqual(e,lookup.get(e.id));
 for(const e of forestBoundaryEdges(s)){
  const x=(e.x1+e.x2)/2,y=(e.y1+e.y2)/2,vertical=e.x1===e.x2;
  const sides=vertical?[isCellOpen(s,x-1,Math.floor(y)),isCellOpen(s,x,Math.floor(y))]:[isCellOpen(s,Math.floor(x),y-1),isCellOpen(s,Math.floor(x),y)];
  assert.equal(sides.filter(Boolean).length,1);
 }
 assert.equal(forestBoundaryEdges({openedLand:[]}).reduce((sum,e)=>sum+Math.abs(e.x2-e.x1)+Math.abs(e.y2-e.y1),0),128);
});
test('viewport culls projected forest with crown margin; budgets do not modify data',()=>{
 const s={openedLand:[]},p=project(20,12),viewport={left:p.x-70,right:p.x+70,top:p.y-70,bottom:p.y+70},all=forestBoundary(s),small=forestBoundary(s,{viewport});
 assert.ok(small.decorations.length<all.decorations.length);assert.ok(small.decorations.length>0);
 assert.equal(forestBoundary(s,{maxDecorations:5,maxObstacles:2}).decorations.length,5);
 assert.equal(forestBoundary(s,{maxDecorations:5,maxObstacles:2}).obstacles.length,2);
 assert.deepEqual(forestBoundary(s,{viewport:{left:100000,top:100000,right:100100,bottom:100100}}),{decorations:[],obstacles:[],edges:[],grounds:[]});
});
test('all land open produces no ghost forest, preview obstacles or internal boundaries',()=>{
 assert.deepEqual(forestBoundary({openedLand:LAND_PATCHES.map(p=>p.id)}),{decorations:[],obstacles:[],edges:[],grounds:[]});
});
