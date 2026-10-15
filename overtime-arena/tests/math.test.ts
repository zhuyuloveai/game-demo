import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseInput, segmentCircle, SpatialHash, angleDifference } from '../src/game/math.ts';

test('keyboard diagonals never move faster; analog walking retains input strength', () => {
  assert.equal(Math.hypot(...Object.values(normaliseInput(1, 1))), 1);
  assert.deepEqual(normaliseInput(0.2, 0), { x: 0.2, y: 0 });
  assert.deepEqual(normaliseInput(0, 0), { x: 0, y: 0 });
});
test('a fast bullet hits a target crossed between frames', () => {
  assert.equal(segmentCircle(0, 0, 150, 0, 75, 0, 17), true);
  assert.equal(segmentCircle(0, 0, 150, 0, 75, 18, 17), false);
  assert.equal(segmentCircle(0, 0, 150, 0, 75, 17, 17), true);
});
test('muzzle sweep covers a point-blank enemy inside the muzzle offset', () => {
  assert.equal(segmentCircle(36, 0, 46, 0, 8, 0, 21), false);
  assert.equal(segmentCircle(0, 0, 46, 0, 8, 0, 21), true);
});
test('collision is bounded to the segment and handles zero-length sweeps', () => {
  assert.equal(segmentCircle(0, 0, 10, 0, 20, 0, 2), false);
  assert.equal(segmentCircle(0, 0, 10, 0, -5, 0, 2), false);
  assert.equal(segmentCircle(3, 4, 3, 4, 3, 5, 2), true);
  assert.equal(segmentCircle(3, 4, 3, 4, 3, 7, 2), false);
});
test('spatial queries cross cell boundaries and cannot retain recycled enemies', () => {
  const grid = new SpatialHash<{ x: number; y: number; active: boolean }>(80);
  const a = { x: 79, y: 79, active: true }, b = { x: 81, y: 81, active: true };
  const far = { x: 500, y: 500, active: true };
  grid.rebuild([a, b, far]);
  assert.deepEqual(new Set(grid.query(80, 80, 5, [])), new Set([a, b]));
  a.active = false; b.x = 600;
  grid.rebuild([a, b, far]);
  assert.deepEqual(grid.query(80, 80, 5, []), []);
  assert.deepEqual(grid.query(600, 81, 2, []), [b]);
});
test('melee angles wrap across the -π/π boundary', () => {
  assert.ok(Math.abs(angleDifference(Math.PI - 0.05, -Math.PI + 0.05)) < 0.11);
  assert.ok(Math.abs(angleDifference(0, Math.PI)) > 3);
});
