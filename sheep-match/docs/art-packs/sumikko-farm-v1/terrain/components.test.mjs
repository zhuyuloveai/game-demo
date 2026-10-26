import test from 'node:test';
import assert from 'node:assert/strict';
import { connections, normalizeCells, project, roadTileSvg, roadNetworkMarkup, roadPathsMarkup, fenceTileSvg, fenceNetworkPieces, fenceLinePieces, fieldTileSvg, fieldPatchMarkup, DIRECTIONS } from './components.mjs';

test('all 16 masks match independent neighbor occupancy, including negative coordinates',()=>{
  for(let expected=0;expected<16;expected++){
    const cells=[[-3,7],...DIRECTIONS.filter(d=>expected&d.bit).map(d=>[-3+d.dx,7+d.dy])];
    const map=connections(cells),center=map.find(c=>c.x===-3&&c.y===7);
    assert.equal(center.mask,expected);
    for(const d of DIRECTIONS.filter(d=>expected&d.bit))assert.ok(map.find(c=>c.x===-3+d.dx&&c.y===7+d.dy).mask&d.opposite);
  }
});
test('duplicates and source order cannot alter roads or fence geometry',()=>{
  const cells=[[0,0],[0,1],[1,0],[1,1]];
  assert.deepEqual(normalizeCells([...cells,...cells].reverse()),normalizeCells(cells));
  assert.equal(roadNetworkMarkup(cells),roadNetworkMarkup([...cells,...cells].reverse()));
  assert.deepEqual(fenceNetworkPieces(cells),fenceNetworkPieces([...cells,...cells].reverse()));
});
test('fence network emits one post per node and one rail per shared edge',()=>{
  const pieces=fenceNetworkPieces([[0,0],[0,1],[1,0],[1,1]]);
  assert.equal(pieces.filter(p=>p.kind==='post').length,4);
  assert.equal(pieces.filter(p=>p.kind==='rail').length,4);
  assert.ok(pieces.every((p,i)=>!i||p.depth>=pieces[i-1].depth));
  assert.equal(fenceNetworkPieces([[5,5]]).length,1);
  assert.equal(fenceNetworkPieces([]).length,0);
});
test('projected adjacent cells share their exact half-edge position',()=>{
  for(const d of DIRECTIONS){const a=project(d.dx*.5,d.dy*.5),b=project(d.dx-d.dx*.5,d.dy-d.dy*.5);assert.deepEqual(a,b);}
  assert.deepEqual(project(1,0),{x:40,y:20});assert.deepEqual(project(0,1),{x:-40,y:20});
});
test('disconnected roads remain isolated and do not gain accidental links',()=>{
  assert.deepEqual(connections([[0,0],[2,0]]).map(c=>c.mask),[0,0]);
  assert.equal(connections([[0,0],[1,0],[2,0]]).find(c=>c.x===1).mask,10);
  assert.equal(new Set(Array.from({length:16},(_,i)=>roadTileSvg(i))).size,16);
  assert.equal(new Set(Array.from({length:16},(_,i)=>fenceTileSvg(i))).size,16);
});
test('separate networks have separate clip namespaces; tile endpoints extend beyond clipped seam',()=>{
  const a=roadNetworkMarkup([[0,0]],{origin:[10,20]}),b=roadNetworkMarkup([[0,0]],{origin:[110,20]});
  assert.notEqual(a.match(/clipPath id="([^"]+)"/)[1],b.match(/clipPath id="([^"]+)"/)[1]);
  assert.match(roadTileSvg(2),/L0.8 0/);assert.match(roadTileSvg(8),/L-0.8 0/);
});
test('field states preserve the same footprint and expose different plant-independent soil states',()=>{
  const states=['empty','sown','fertilized'].map(fieldTileSvg);
  assert.equal(new Set(states).size,3);states.forEach(s=>assert.match(s,/viewBox="0 0 128 72"/));
  assert.equal((fieldPatchMarkup([[0,0],[1,0]]).match(/<svg /g)||[]).length,2);
  assert.throws(()=>fieldTileSvg('ripe'));
});
test('authored fence runs preserve both endpoints and reject off-axis lines',()=>{
  const pieces=fenceLinePieces([3.1,12.1],[3.1,18.5]);
  assert.equal(pieces.filter(p=>p.kind==='post').length,7);
  assert.equal(fenceLinePieces([1,1],[1,1]).length,1);
  assert.throws(()=>fenceLinePieces([0,0],[1,1]));
  assert.throws(()=>fenceLinePieces([0,0],[0,1],{spacing:0}));
});
test('bad geometry inputs fail visibly instead of producing broken assets',()=>{
  for(const mask of [-1,16,1.5,NaN]){assert.throws(()=>roadTileSvg(mask));assert.throws(()=>fenceTileSvg(mask));}
  assert.throws(()=>connections([[.5,0]]));assert.throws(()=>project(0,0,{unit:0}));
  assert.throws(()=>roadPathsMarkup(['M0 0"/><script>bad</script>']));
});
