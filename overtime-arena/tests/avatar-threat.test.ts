import test from 'node:test';
import assert from 'node:assert/strict';
import { hasNearbyThreat, resolveAvatarExpression } from '../src/game/AvatarThreat.ts';

const player = { x: 200, y: 200 };
const enemy = { x: 296, y: 200, active: true, spawn: 0, kind: 'runner', radius: 17 };

test('nearby threat uses enemy edges and distinct enter/release ranges', () => {
  assert.equal(hasNearbyThreat(player, [enemy], false), true);
  assert.equal(hasNearbyThreat(player, [{ ...enemy, x: 297 }], false), false);
  assert.equal(hasNearbyThreat(player, [{ ...enemy, x: 308 }], true), true);
  assert.equal(hasNearbyThreat(player, [{ ...enemy, x: 321 }], true), false);
  assert.equal(hasNearbyThreat(player, [{ ...enemy, x: 303, radius: 24, kind: 'heavy' }], false), true);
});

test('dead enemies, spawn previews and training dummies cannot provoke anger', () => {
  const close = { ...enemy, x: 210 };
  assert.equal(hasNearbyThreat(player, [
    { ...close, active: false }, { ...close, spawn: 0.1 }, { ...close, kind: 'dummy' },
  ], true), false);
  assert.equal(hasNearbyThreat(player, [{ ...close, active: false }, enemy], false), true);
  assert.equal(hasNearbyThreat(player, [], true), false);
});

test('proximity remains visibly furious during repeated attacks and critical celebrations', () => {
  for (const expression of ['neutral', 'angry', 'smug'] as const) {
    assert.equal(resolveAvatarExpression(expression, true, false), 'furious');
    assert.equal(resolveAvatarExpression(expression, false, false), expression);
  }
  assert.equal(resolveAvatarExpression('neutral', false, false), 'neutral');
});

test('hurt feedback and manually previewed expressions take priority over nearby threats', () => {
  assert.equal(resolveAvatarExpression('panic', true, false), 'panic');
  for (const expression of ['neutral', 'angry', 'furious', 'panic', 'smug'] as const) {
    assert.equal(resolveAvatarExpression(expression, true, true), expression);
  }
  // Once the timed hurt reaction ends, a still-nearby monster provokes anger again.
  assert.equal(resolveAvatarExpression('neutral', true, false), 'furious');
});
