import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, freeTiles, isFree, pick, undo, stash, shuffle, restore, getLevelConfig, getGameConfig, VERSION, solveBoard, verifySolution } from '../engine.mjs';

test('360 boards across early and late stages win without tools or overflow', () => {
  for (const level of [0,1,2,3,4,9,24,49,99]) for (let seed = 0; seed < 40; seed++) {
    const game = createGame(level, `seed-${seed}`);
    assert.equal(game.board.length, getLevelConfig(level).count);
    for (let type = 0; type < getLevelConfig(level).kinds; type++) assert.equal(game.board.filter(t => t.type === type).length % 3, 0);
    const route = [...game.solution];
    for (const id of route) {
      assert.ok(pick(game, id).ok, `level ${level}, seed ${seed}, tile ${id}`);
      assert.ok(game.rack.length <= 6);
    }
    assert.equal(game.status, 'won'); assert.equal(game.matched, game.total);
    assert.deepEqual(game.tools, { undo:3, shuffle:2, stash:1 });
  }
});
test('daily seeds reproduce geometry, faces and solution', () => {
  assert.deepEqual(createGame(2, 'daily-2026-10-23', 'daily'), createGame(2, 'daily-2026-10-23', 'daily'));
  assert.notDeepEqual(createGame(2, 'daily-2026-10-24').board, createGame(2, 'daily-2026-10-23').board);
});
test('difficulty is calculated for unlimited stage numbers and grows gradually', () => {
  for (let level = 1; level < 1000; level++) {
    const previous = getLevelConfig(level - 1), next = getLevelConfig(level);
    for (const key of ['count','kinds','maxOpen','openChance']) assert.ok(next[key] >= previous[key]);
    assert.ok(next.layers.length >= previous.layers.length);
    assert.ok(next.count - previous.count <= 12);
    assert.equal(next.count % 3, 0);
    assert.equal(next.layers.reduce((sum,l) => sum + l[2],0),next.count);
  }
  assert.ok(getLevelConfig(999).count > getLevelConfig(99).count);
  assert.ok(getLevelConfig(9999).count > getLevelConfig(999).count);
  assert.ok(getLevelConfig(999999).count > getLevelConfig(9999).count);
  for (const invalid of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER]) assert.throws(()=>getLevelConfig(invalid), RangeError);
});
test('distant stages retain solvability, randomness and resumable state', () => {
  for (const level of [999,9999]) for (let seed=0;seed<3;seed++) {
    const game=createGame(level,`distant-${seed}`);
    assert.ok(verifySolution(game.board,game.solution));
    for(const id of game.solution.slice(0,9)) assert.ok(pick(game,id).ok);
    const loaded=restore(game);
    assert.ok(loaded); assert.equal(loaded.level,level);
    assert.deepEqual(loaded.geometry,game.geometry);
  }
});
test('each difficulty generates diverse, supported, nonoverlapping maps within the visible board', () => {
  for (const level of [0,3,9,49,99]) {
    const fingerprints = new Set();
    for (let seed = 0; seed < 40; seed++) {
      const game = createGame(level, `map-${seed}`), { board } = game;
      fingerprints.add(JSON.stringify(game.geometry));
      assert.equal(new Set(board.map(t => t.type)).size, getLevelConfig(level).kinds);
      assert.equal(new Set(board.map(t => t.z)).size, getLevelConfig(level).layers.length);
      for (const tile of board) {
        assert.ok(tile.x >= 0 && tile.x + .94 <= 7 && tile.y >= 0 && tile.y + .94 <= 6.5);
        assert.ok(!board.some(other => other.id !== tile.id && other.z === tile.z && Math.abs(other.x - tile.x) < .94 && Math.abs(other.y - tile.y) < .94));
        if (tile.z) assert.ok(board.some(other => other.z === tile.z - 1 && Math.abs(other.x - tile.x) < .94 && Math.abs(other.y - tile.y) < .94));
      }
      assert.ok(verifySolution(board, game.solution));
      assert.equal(game.generation.rejected, game.generation.attempts - 1);
    }
    assert.equal(fingerprints.size, 40);
    if (level) for (const key of ['count','kinds']) assert.ok(getLevelConfig(level)[key] >= getLevelConfig(level - 1)[key]);
  }
});
const stack = faces => faces.map((type,id) => ({id,type,x:1,y:1,z:faces.length-id}));
test('search rejects an impossible board even when all face totals are multiples of three', () => {
  const impossible = stack(Array.from({length:24}, (_,i) => i % 8));
  assert.equal(solveBoard(impossible).status, 'unsolvable');
  assert.equal(verifySolution(impossible, impossible.map(t => t.id)), false);
  const possible = stack([0,0,1,1,2,2,0,1,2]);
  const result = solveBoard(possible);
  assert.equal(result.status, 'solvable');
  assert.ok(verifySolution(possible, result.solution));
  assert.equal(verifySolution(possible, result.solution.slice(1)), false);
  assert.equal(verifySolution(possible, [...result.solution].reverse()), false);
  assert.equal(verifySolution(possible, result.solution.map(() => 0)), false);
});
test('unverified candidates are rerolled, including search-budget exhaustion', () => {
  assert.equal(solveBoard(stack([0,0,0]), {maxNodes:0}).status, 'unknown');
  // Exercise the bounded fallback explicitly; it must still replay to a win.
  for (let level = 0; level < 3; level++) {
    const game = createGame(level, 'force-retry', 'classic', {maxNodes:0, randomAttempts:2});
    assert.ok(game.generation.rejected >= 2);
    assert.equal(game.generation.method, 'verified-construction');
    assert.ok(verifySolution(game.board, game.solution));
    for (const id of game.solution) assert.ok(pick(game,id).ok);
    assert.equal(game.status, 'won');
  }
});
test('a naturally rejected random candidate is replaced by a certified board', () => {
  let retried = 0;
  for (let seed = 0; seed < 60; seed++) {
    const game = createGame(99, `audit-${seed}`);
    if (game.generation.rejected) { retried++; assert.ok(verifySolution(game.board,game.solution)); }
  }
  assert.ok(retried > 0);
});
test('covered cards cannot be picked; removing all overlapping upper tiles frees a card', () => {
  const game = createGame(0, 11), tile = game.board.find(t => !isFree(t, game.board));
  const before = JSON.stringify(game);
  assert.equal(pick(game, tile.id).ok, false); assert.equal(JSON.stringify(game), before);
  assert.equal(pick(game, -1).ok, false);
  const removed = game.board.filter(t => t.z > tile.z && Math.abs(t.x - tile.x) < .94 && Math.abs(t.y - tile.y) < .94);
  game.board = game.board.filter(t => !removed.includes(t));
  assert.equal(isFree(tile, game.board), true);
  assert.equal(pick(game, tile.id).ok, true);
});
function fixture(rackTypes, nextType) {
  const game = createGame(2, 3);
  game.rack = rackTypes.map((type,id) => ({ id:100 + id, type, x:id, y:0, z:0 }));
  game.board = [{ id:1, type:nextType, x:0, y:0, z:0 }, { id:2, type:11, x:2,y:0,z:0 }];
  return game;
}
test('seventh tile matching a pair clears before loss; nonmatching seventh loses and freezes', () => {
  const safe = fixture([0,0,1,1,2,2], 0);
  assert.equal(pick(safe, 1).matched, true); assert.equal(safe.rack.length, 4); assert.equal(safe.status, 'playing');
  const lost = fixture([0,0,1,1,2,2], 3);
  pick(lost, 1); assert.equal(lost.status, 'lost'); assert.equal(lost.rack.length, 7);
  const before = JSON.stringify(lost); assert.equal(pick(lost, 2).ok, false); assert.equal(JSON.stringify(lost), before);
  assert.equal(undo(lost), true); assert.equal(lost.status, 'playing'); assert.equal(lost.rack.length, 6);
  assert.equal(lost.board.length, 2); assert.equal(lost.tools.undo, 2);
});
test('undo restores removed triples and consumes a limited charge', () => {
  const game = fixture([0,0], 0), before = JSON.stringify(game.board);
  pick(game, 1); assert.equal(game.matched, 3); assert.equal(game.rack.length, 0);
  assert.equal(undo(game), true); assert.equal(game.matched, 0); assert.equal(game.rack.length, 2);
  assert.equal(JSON.stringify(game.board), before); assert.equal(game.tools.undo, 2);
  assert.equal(undo(game), false);
  for (let i = 0; i < 2; i++) { pick(game, 1); assert.equal(undo(game), true); }
  pick(game, 1); assert.equal(undo(game), false);
});
test('stash rescues a full rack, reserves at most three, and cards can be reclaimed', () => {
  const game = fixture([0,0,1,1,2,2], 3); pick(game, 1);
  const allIds = [...game.board, ...game.rack].map(t => t.id).sort();
  assert.equal(stash(game), true); assert.equal(game.status, 'playing'); assert.equal(game.reserve.length, 3);
  assert.equal(game.rack.length, 4); assert.equal(game.tools.stash, 0); assert.equal(game.history.length, 0);
  assert.deepEqual([...game.board,...game.rack,...game.reserve].map(t => t.id).sort(), allIds);
  const id = game.reserve[0].id; assert.equal(pick(game,id,true).ok, true); assert.equal(game.reserve.length, 2);
  assert.equal(stash(game), false);
});
test('win waits for the reserve and rack to be empty', () => {
  const game = fixture([0,0], 0); game.board = [];
  game.reserve = [{id:11,type:0,x:0,y:0,z:0}];
  assert.equal(pick(game,11,true).ok, true); assert.equal(game.status, 'won');
  assert.equal(stash(game), false); assert.equal(undo(game), false); assert.equal(shuffle(game), false);
});
test('shuffle preserves face counts, positions, and the rack; costs one charge', () => {
  const game = createGame(2, 8); pick(game, freeTiles(game.board)[0].id);
  const faces = game.board.map(t => t.type).sort(), positions = game.board.map(({type,...t}) => t), rack = JSON.stringify(game.rack);
  assert.equal(shuffle(game, 777), true);
  assert.deepEqual(game.board.map(t => t.type).sort(), faces);
  assert.deepEqual(game.board.map(({type,...t}) => t), positions);
  assert.equal(JSON.stringify(game.rack), rack); assert.equal(game.history.length, 0); assert.equal(game.tools.shuffle, 1);
  assert.equal(shuffle(game, 778), true); assert.equal(shuffle(game, 779), false);
});
test('save/resume retains valid board and undo snapshots; rejects damaged data', () => {
  const game = createGame(1, 4); for (const id of game.solution.slice(0,12)) pick(game,id);
  game.elapsed = 15321;
  const resumed = restore(JSON.stringify(game)); assert.ok(resumed);
  assert.deepEqual(resumed.board, game.board); assert.deepEqual(resumed.history, game.history);
  assert.equal(resumed.elapsed,15321); assert.equal(undo(resumed), true);
  assert.ok(restore(resumed));
  for (const corrupt of [null, '{}', '{bad', {...game, version:99}, {...game, rack:[...game.board]}, {...game, total:0}, {...game, elapsed:-1}, {...game, matched:1}, {...game, status:'won'}, {...game, board:game.board.slice(1)}, {...game, tools:{undo:999}}]) assert.equal(restore(corrupt), null);
  const corruptHistory = restore({...game, history:[{board:null}]}); assert.ok(corruptHistory); assert.deepEqual(corruptHistory.history, []);
  assert.deepEqual(resumed.geometry, game.geometry);
  assert.equal(restore({...game, geometry:game.geometry.slice(1)}), null);
  const outside = structuredClone(game); outside.geometry[0].x = 8; assert.equal(restore(outside), null);
  const overlap = structuredClone(game);
  Object.assign(overlap.geometry[1], {...overlap.geometry[0], id:1});
  assert.equal(restore(overlap), null);
});
test('old fixed-map saves migrate without losing an in-progress game', () => {
  const board = [];
  [[4,3],[3,2]].forEach(([w,h], z) => {
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) board.push({id:board.length,x:(7-w)/2+x,y:(6.5-h)/2+y,z,type:Math.floor(board.length/3)%4});
  });
  const old = {...createGame(0, 'legacy'), version:1, board};
  delete old.geometry;
  pick(old, freeTiles(board)[0].id);
  const saved = restore(JSON.stringify(old));
  assert.ok(saved); assert.equal(saved.version, VERSION);
  assert.deepEqual(saved.board, old.board); assert.deepEqual(saved.rack, old.rack);
  assert.equal(saved.geometry.length,18);
  assert.ok(undo(saved)); assert.ok(restore(saved));
});
test('three-stage v2 saves keep their original difficulty after migration and reload', () => {
  const board=[];
  [[6,5],[5,4],[4,4],[3,2]].forEach(([w,h],z)=>{
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) board.push({id:board.length,x:(7-w)/2+x,y:(6.5-h)/2+y,z,type:Math.floor(board.length/3)%8});
  });
  const old={...createGame(1,'v2'),version:2,total:72,board,geometry:board.map(({id,x,y,z})=>({id,x,y,z}))};
  pick(old,freeTiles(board)[0].id);
  const loaded=restore(old);
  assert.ok(loaded); assert.equal(loaded.rules,'legacy-three');
  assert.equal(getGameConfig(loaded).count,72);
  assert.equal(getLevelConfig(1).count,30);
  assert.deepEqual(loaded.board,old.board);
  assert.deepEqual(restore(loaded).geometry,loaded.geometry);
});
