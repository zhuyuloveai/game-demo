import test from 'node:test';
import assert from 'node:assert/strict';
import { createPickMotion } from '../pick-motion.mjs';
import { createGame, pick, undo } from '../engine.mjs';

function harness(rack = []) {
  let time = 0, next = 0, idle = 0;
  const jobs = new Map(), frames = [], cues = [], flights = new Set();
  const motion = createPickMotion({rack, now:() => time,
    later:(fn, delay) => { const id = ++next; jobs.set(id, {at:time + delay, fn}); return id; },
    cancel:id => jobs.delete(id), paint:rack => frames.push(rack.map(t => t.id)),
    fly:({tile}) => { flights.add(tile.id); return () => flights.delete(tile.id); },
    settled:event => cues.push(event), idle:() => idle++,
  });
  return {motion, frames, cues, flights, get idle() { return idle; },
    advance(to) {
      while (true) {
        const job = [...jobs].sort((a,b) => a[1].at - b[1].at)[0];
        if (!job || job[1].at > to) break;
        time = job[1].at; jobs.delete(job[0]); job[1].fn();
      }
      time = to;
    },
  };
}
function enqueue(h, game, id) {
  const before = [...game.rack], result = pick(game, id);
  assert.equal(result.ok, true);
  h.motion.enqueue({before, after:[...game.rack], ...result, cue:game.status});
}

test('rapid full-board picks land in order and triples wait until arrival', () => {
  const game = createGame(0, 'flight-order'), h = harness();
  for (const id of game.solution) enqueue(h, game, id);
  assert.equal(game.status, 'won'); // Committed independently of presentation.
  assert.equal(h.motion.pending, game.total);
  assert.equal(h.flights.size, game.total);
  assert.deepEqual(h.motion.rack, []);
  assert.equal(h.idle, 0);
  h.advance(559);
  assert.equal(h.frames.length, 0);
  h.advance(560);
  assert.equal(h.frames[0].length, 1);
  assert.equal(h.idle, 0);
  h.advance(5000);
  assert.deepEqual(h.cues.map(e => e.tile.id), game.solution);
  assert.equal(h.cues.filter(e => e.matched).length, game.total / 3);
  assert.ok(h.frames.every(frame => frame.length <= 7));
  assert.deepEqual(h.motion.rack, []);
  assert.equal(h.flights.size, 0);
  assert.equal(h.motion.pending, 0);
  assert.equal(h.idle, 1);
});

test('undo cancels in-flight callbacks and a new pick cannot revive old visuals', () => {
  const game = createGame(0, 'flight-undo'), h = harness();
  enqueue(h, game, game.solution[0]);
  h.advance(100);
  assert.equal(undo(game), true);
  h.motion.reset(game.rack);
  assert.equal(h.flights.size, 0);
  enqueue(h, game, game.solution[0]);
  h.advance(560);
  assert.equal(h.cues.length, 0);
  h.advance(660);
  assert.equal(h.cues.length, 1);
  assert.equal(h.idle, 1);
  assert.deepEqual(h.motion.rack, game.rack);
});

test('reset while showing a triple prevents delayed clear from overwriting a new board', () => {
  const h = harness([{id:1,type:0},{id:2,type:0}]);
  h.motion.enqueue({before:h.motion.rack, after:[], tile:{id:3,type:0}, matched:true});
  h.advance(560);
  assert.equal(h.motion.rack.length, 3);
  h.motion.reset([{id:9,type:1}]);
  h.advance(1000);
  assert.deepEqual(h.motion.rack, [{id:9,type:1}]);
  assert.equal(h.cues.length, 0);
  assert.equal(h.idle, 0);
});
