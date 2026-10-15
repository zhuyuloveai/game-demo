import test from 'node:test';
import assert from 'node:assert/strict';
import { beamTargets, blastTargets, chainTargets } from '../src/game/WeaponAttacks.ts';
import { weaponStats } from '../src/game/WeaponModel.ts';

const target = (id: number, x: number, y = 0) => ({ id, x, y, radius: 15, active: true, spawn: 0 });
const ids = (targets: { id: number }[]) => targets.map(e => e.id);

test('beam pierces nearest targets first regardless of pool order and excludes off-line/spawned targets', () => {
  const enemies = [target(3, 300), target(1, 100), target(4, 200, 60), target(2, 200),
    { ...target(5, 40), spawn: 0.2 }, { ...target(6, 20), active: false }, target(7, -100)];
  assert.deepEqual(ids(beamTargets({ x: 0, y: 0 }, 0, 400, 4, 2, enemies)), [1, 2]);
  assert.deepEqual(ids(beamTargets({ x: 0, y: 0 }, Math.PI, 400, 4, 2, enemies)), [7]);
});

test('chain keeps the selected first target and only visits live nearby targets once', () => {
  const enemies = [target(1, 100), target(2, 180), target(3, 260), target(4, 600),
    { ...target(5, 110), active: false }, { ...target(6, 115), spawn: 1 }];
  assert.deepEqual(ids(chainTargets({ x: 0, y: 0 }, 1, 150, 5, 100, enemies)), [1, 2, 3]);
  assert.deepEqual(ids(chainTargets({ x: 0, y: 0 }, 1, 99, 5, 100, enemies)), []);
  assert.deepEqual(ids(chainTargets({ x: 0, y: 0 }, 99, 150, 5, 100, enemies)), []);
});

test('higher levels really reach more chain targets and wider blast areas', () => {
  const chain = Array.from({ length: 7 }, (_, n) => target(n, 100 + n * 90));
  const low = weaponStats('cable', 1), high = weaponStats('cable', 5);
  assert.equal(chainTargets({ x: 0, y: 0 }, 0, low.range, low.chains, low.chainRange, chain).length, 3);
  assert.equal(chainTargets({ x: 0, y: 0 }, 0, high.range, high.chains, high.chainRange, chain).length, 5);
  const e = target(1, 120);
  assert.deepEqual(blastTargets({ x: 0, y: 0 }, weaponStats('coffee', 1).radius, [e]), []);
  assert.deepEqual(ids(blastTargets({ x: 0, y: 0 }, weaponStats('coffee', 5).radius, [e])), [1]);
});

test('blast includes touching edges and skips dead/spawning enemies', () => {
  assert.deepEqual(ids(blastTargets({ x: 10, y: 20 }, 84, [target(1, 109, 20), target(2, 110, 20),
    { ...target(3, 10, 20), active: false }, { ...target(4, 10, 20), spawn: 0.1 }])), [1]);
});
