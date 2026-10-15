import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWPORT, WORLD, WORLD_CENTER, WORLD_BOUNDS, cameraScrollFor, enemySpawnPoint } from '../src/game/WorldModel.ts';

test('the arena has four times the area while preserving viewport scale and player-centered camera motion', () => {
  assert.equal(WORLD.width, 2240);
  assert.equal(WORLD.height, 1440);
  assert.equal(WORLD.width * WORLD.height, VIEWPORT.width * VIEWPORT.height * 4);
  assert.deepEqual(cameraScrollFor(WORLD_CENTER.x, WORLD_CENTER.y), { x: 560, y: 360 });
  assert.deepEqual(cameraScrollFor(WORLD_CENTER.x + 100, WORLD_CENTER.y - 100), { x: 660, y: 260 });
});

test('camera stops at every map edge and never reveals space beyond the four-times arena', () => {
  assert.deepEqual(cameraScrollFor(0, 0), { x: 0, y: 0 });
  assert.deepEqual(cameraScrollFor(WORLD.width, WORLD.height), { x: 1120, y: 720 });
  for (let x = -100; x <= WORLD.width + 100; x += 17) for (let y = -100; y <= WORLD.height + 100; y += 23) {
    const camera = cameraScrollFor(x, y);
    assert.ok(camera.x >= 0 && camera.y >= 0);
    assert.ok(camera.x + VIEWPORT.width <= WORLD.width);
    assert.ok(camera.y + VIEWPORT.height <= WORLD.height);
    if (x >= 560 && x <= WORLD.width - 560) assert.equal(x - camera.x, 560);
    if (y >= 360 && y <= WORLD.height - 360) assert.equal(y - camera.y, 360);
  }
});

test('enemy perimeter spawning remains inside world bounds and safely separated from the player', () => {
  let seed = 93487;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const players = [
    WORLD_CENTER,
    { x: WORLD_BOUNDS.left + 10, y: WORLD_BOUNDS.top + 10 },
    { x: WORLD_BOUNDS.right - 10, y: WORLD_BOUNDS.top + 10 },
    { x: WORLD_BOUNDS.left + 10, y: WORLD_BOUNDS.bottom - 10 },
    { x: WORLD_BOUNDS.right - 10, y: WORLD_BOUNDS.bottom - 10 },
    { x: 1550, y: 900 }, { x: 200, y: 720 }, { x: 2000, y: 720 },
  ];
  for (const player of players) for (const radius of [16, 25, 36, 46]) {
    for (let sample = 0; sample < 100; sample++) {
      const point = enemySpawnPoint(player, radius, random);
      assert.ok(point.x >= WORLD_BOUNDS.left + radius && point.x <= WORLD_BOUNDS.right - radius);
      assert.ok(point.y >= WORLD_BOUNDS.top + radius && point.y <= WORLD_BOUNDS.bottom - radius);
      assert.ok(Math.hypot(point.x - player.x, point.y - player.y) >= 290 + radius);
      const camera = cameraScrollFor(player.x, player.y);
      assert.ok(point.x >= camera.x && point.x <= camera.x + VIEWPORT.width);
      assert.ok(point.y >= camera.y && point.y <= camera.y + VIEWPORT.height);
    }
    for (const roll of [0, 0.25, 0.5, 0.75, 1]) {
      const point = enemySpawnPoint(player, radius, () => roll);
      assert.ok(Math.hypot(point.x - player.x, point.y - player.y) >= 290 + radius, 'fallback corner avoids repeatedly sampling a nearby edge');
    }
  }
});
