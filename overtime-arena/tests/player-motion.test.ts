import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerMotion, type PlayerMotionInput } from '../src/game/PlayerMotion.ts';

const frame = (values: Partial<PlayerMotionInput> = {}): PlayerMotionInput => ({
  x: 0, y: 0, dt: 1 / 60, time: 0, maxSpeed: 280, aim: 0, alpha: 1, paused: false, ...values,
});

function run(motion: PlayerMotion, seconds: number, hz: number, speed: number) {
  let pose;
  for (let i = 1; i <= Math.round(seconds * hz); i++) {
    pose = motion.update(frame({ x: i * speed / hz, dt: 1 / hz }));
  }
  return pose!;
}

test('running cadence follows actual traveled distance at 30, 60 and 120 fps', () => {
  const poses = [30, 60, 120].map(hz => {
    const motion = new PlayerMotion(); motion.reset(0, 0);
    return run(motion, 1, hz, 280);
  });
  for (const pose of poses) {
    assert.ok(Math.abs(pose.phase - poses[0].phase) < 1e-10);
    assert.ok(Math.abs(pose.stride - poses[0].stride) < 1e-10);
    assert.equal(pose.moving, true);
  }
  const stationary = new PlayerMotion(); stationary.reset(0, 0);
  assert.equal(run(stationary, 1, 60, 0).phase, 0);
});

test('stopping smoothly settles legs and torso without continuing to advance steps', () => {
  const motion = new PlayerMotion(); motion.reset(0, 0);
  const moving = run(motion, 1, 60, 280);
  let stopped = motion.update(frame({ x: 280 }));
  assert.ok(stopped.stride > 0 && stopped.stride < moving.stride);
  for (let i = 0; i < 90; i++) stopped = motion.update(frame({ x: 280 }));
  assert.equal(stopped.phase, moving.phase);
  assert.equal(stopped.moving, false);
  assert.ok(Math.abs(stopped.lean) < 1e-5);
  assert.ok(stopped.stride < 1e-8);
});

test('pause freezes pose and attack timers, resume consumes no stale displacement', () => {
  const motion = new PlayerMotion(); motion.reset(0, 0);
  motion.attack('keyboard', 1.5);
  motion.hurt(0.2);
  const before = motion.update(frame({ x: 4 }));
  const paused = motion.update(frame({ x: 200, paused: true, dt: 0.05 }));
  assert.deepEqual(paused, before);
  const resumed = motion.update(frame({ x: 200 }));
  assert.equal(resumed.phase, before.phase);
  assert.ok(resumed.clock > before.clock);
});

test('reset clears movement, recoil and hurt even across distant respawn points', () => {
  const motion = new PlayerMotion(); motion.reset(0, 0);
  run(motion, 1, 60, 280);
  motion.attack('scatter', Math.PI); motion.hurt(0);
  motion.reset(800, 600);
  const pose = motion.update(frame({ x: 800, y: 600 }));
  assert.equal(pose.phase, 0);
  assert.equal(pose.stride, 0);
  assert.equal(pose.hurt, 0);
  assert.ok(pose.recoil < 1e-20);
  assert.equal(pose.moving, false);
});

test('shot, melee and hurt reactions are bounded and return to breathing idle', () => {
  for (const weapon of ['stapler', 'scatter', 'keyboard'] as const) {
    const motion = new PlayerMotion(); motion.reset(0, 0);
    motion.attack(weapon, 0.7); motion.hurt(-1);
    const onset = motion.update(frame());
    assert.ok(onset.hurt > 0);
    assert.ok(weapon === 'keyboard' ? onset.swing > 0 : onset.recoil > 0);
    let settled = onset;
    for (let i = 0; i < 90; i++) {
      settled = motion.update(frame());
      for (const [key, value] of Object.entries(settled)) {
        if (typeof value === 'number') assert.ok(Number.isFinite(value), key);
      }
      assert.ok(settled.scaleX > 0.8 && settled.scaleX < 1.2);
      assert.ok(settled.scaleY > 0.8 && settled.scaleY < 1.2);
    }
    assert.equal(settled.hurt, 0);
    assert.equal(settled.swing, 0);
    assert.ok(settled.recoil < 1e-8);
  }
});
