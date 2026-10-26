import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ENVIRONMENT_ASSETS,environmentSvg,environmentInstance,waterConnections,waterPatchMarkup,gateGeometry} from './components.mjs';
import {BUILDING_STATES,buildingStateSvg,buildingBadgeMarkup} from '../building-states/components.mjs';

test('42 environment assets close the exact remaining legacy terrain coverage',async()=>{
 const old=JSON.parse(await readFile(new URL('../../../../assets/farm/manifest.json',import.meta.url)));
 const completed=JSON.parse(await readFile(new URL('../terrain/manifest.json',import.meta.url))).assets;
 const existing=new Set(completed.map(a=>'terrain/'+a.id+'.svg'));
 const missing=old.assets.filter(a=>a.category==='terrain'&&!existing.has(a.path)).map(a=>a.path).sort();
 assert.equal(ENVIRONMENT_ASSETS.length,42);assert.deepEqual(ENVIRONMENT_ASSETS.map(a=>a.legacyPath).sort(),missing);
});
test('all eight building overlay IDs are covered, including zero-based mastery',async()=>{
 const old=JSON.parse(await readFile(new URL('../../../../assets/farm/manifest.json',import.meta.url)));
 assert.deepEqual(BUILDING_STATES.map(a=>a.legacyPath).sort(),old.assets.filter(a=>a.category==='building-overlay').map(a=>a.path).sort());
});
test('a 3x3 pond has four shore corners, four straight banks and one interior',()=>{
 const cells=[];for(let u=-1;u<=1;u++)for(let v=-1;v<=1;v++)cells.push([u,v]);
 const shores=waterConnections(cells);assert.equal(shores.find(c=>c.x===0&&c.y===0).shoreMask,0);
 assert.deepEqual(shores.map(c=>c.shoreMask).sort((a,b)=>a-b),[0,1,2,3,4,6,8,9,12]);
 assert.deepEqual(waterConnections([...cells,...cells].reverse()),shores);
});
test('water edges appear only at exposed sides, including holes and isolated tiles',()=>{
 const cells=[[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[7,7]],lookup=new Set(cells.map(c=>c.join(',')));
 for(const c of waterConnections(cells))for(const [bit,dx,dy] of [[1,0,-1],[2,1,0],[4,0,1],[8,-1,0]])assert.equal(Boolean(c.shoreMask&bit),!lookup.has([c.x+dx,c.y+dy].join(',')));
 assert.equal(waterConnections([[7,7]])[0].shoreMask,15);
 const markup=waterPatchMarkup(cells);const ids=[...markup.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
test('opening both gate orientations keeps the hinge, latch and ground anchor fixed',()=>{
 for(const axis of ['horizontal','vertical']){const shut=gateGeometry(axis,'closed'),open=gateGeometry(axis,'open');
  assert.deepEqual(shut.hinge,open.hinge);assert.deepEqual(shut.latch,open.latch);assert.deepEqual(shut.anchor,open.anchor);
  assert.deepEqual(shut.end,shut.latch);assert.notDeepEqual(open.end,open.latch);assert.equal(open.passable,true);assert.equal(shut.passable,false);
  const length=g=>Math.hypot(g.hinge.x-g.end.x,g.hinge.y-g.end.y);assert.equal(length(shut),length(open));
 }
});
test('visual resizing preserves world placement and depth',()=>{
 const small=environmentInstance('natural-tree',3,4,{unit:40,origin:[100,50]}),large=environmentInstance('natural-tree',3,4,{unit:40,origin:[100,50],scale:2});
 assert.equal(small.depth,190);assert.equal(large.depth,190);
 const box=s=>Object.fromEntries([...s.markup.matchAll(/\b(x|y|width|height)="([\d.-]+)"/g)].slice(0,4).map(m=>[m[1],+m[2]]));
 for(const item of [small,large]){const b=box(item);assert.equal(b.x+b.width/2,60);assert.equal(b.y+b.height*.9,190);}
});
test('every asset renders deterministically with finite geometry and a usable frame',()=>{
 const outputs=[];for(const a of ENVIRONMENT_ASSETS){const out=environmentSvg(a.id);assert.equal(out,environmentSvg(a.id));assert.ok(out.endsWith('</svg>'));assert.doesNotMatch(out,/NaN|undefined|Infinity|<script/);assert.ok(a.anchor[0]>=0&&a.anchor[0]<=a.width&&a.anchor[1]>=0&&a.anchor[1]<=a.height);outputs.push(out);}
 assert.equal(new Set(outputs).size,42);
 const badges=BUILDING_STATES.map(a=>buildingStateSvg(a.id));assert.equal(new Set(badges).size,8);assert.ok(badges.every(s=>s.includes('viewBox="0 0 64 76"')));
 assert.match(buildingBadgeMarkup('full',{x:100,y:200,size:32}),/x="84" y="164"/);
});
test('invalid geometry fails visibly',()=>{
 assert.throws(()=>environmentSvg('missing'));assert.throws(()=>gateGeometry('diagonal','open'));assert.throws(()=>waterConnections([[.5,1]]));assert.throws(()=>environmentInstance('natural-tree',0,0,{scale:-1}));assert.throws(()=>buildingBadgeMarkup('full',{x:0,y:0,size:0}));
});
