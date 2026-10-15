import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS } from '../src/game/EnemyModel.ts';
import { bossForWave, isBossKind, createBossBrain, bossAttackInfo, stepBossBrain, type BossKind } from '../src/game/BossModel.ts';

const body = (kind: BossKind) => ({ x: 0, y: 0, speed: ENEMY_DEFS[kind].speed, hp: ENEMY_DEFS[kind].hp, maxHp: ENEMY_DEFS[kind].hp });
const ahead = { x: 250, y: 0 };
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);

test('only the two milestone waves summon one matching boss kind', () => {
  for (let wave = 1; wave <= 20; wave++) assert.equal(bossForWave(wave), wave === 10 ? 'manager' : wave === 20 ? 'director' : null);
  assert.equal(bossForWave(10.1), null);
  assert.equal(bossForWave(NaN), null);
  assert.equal(isBossKind('runner'), false);
  assert.equal(isBossKind('manager'), true);
  assert.equal(isBossKind('director'), true);
  assert.ok(ENEMY_DEFS.director.hp > ENEMY_DEFS.manager.hp);
  assert.ok(ENEMY_DEFS.director.radius > ENEMY_DEFS.manager.radius);
});

test('boss charge warnings lock aim and match their actual maximum movement distance', () => {
  for (const kind of ['manager', 'director'] as const) for (const hz of [60, 120, 240]) {
    const brain = createBossBrain(kind); brain.cooldown = 0;
    const enemy = body(kind), dt = 1 / hz;
    stepBossBrain(brain, kind, enemy, ahead, dt);
    assert.equal(brain.state, 'windup');
    const info = bossAttackInfo(brain, kind);
    assert.ok(info.windup >= 0.8);
    close(brain.timer, info.windup);
    let elapsed = 0, travelled = 0;
    while (brain.state === 'windup') {
      const action = stepBossBrain(brain, kind, enemy, { x: 0, y: 250 }, dt);
      elapsed += dt;
      if (brain.state === 'windup') assert.deepEqual(action, { vx: 0, vy: 0, fire: false });
      travelled += Math.hypot(action.vx, action.vy) * dt;
      assert.equal(brain.angle, 0);
      assert.equal(action.fire, false);
      assert.ok(elapsed < 2);
    }
    close(elapsed, info.windup);
    assert.equal(brain.state, 'rush');
    while (brain.state === 'rush') {
      const action = stepBossBrain(brain, kind, enemy, { x: 0, y: 250 }, dt);
      travelled += Math.hypot(action.vx, action.vy) * dt;
      assert.equal(action.vy, 0);
      assert.equal(action.fire, false);
    }
    assert.equal(brain.state, 'recover');
    close(travelled, info.range);
    assert.ok(brain.timer >= 0.8);
  }
});

test('the manager mostly charges while the director alternates charge and bounded volleys', () => {
  for (const kind of ['manager', 'director'] as const) {
    const brain = createBossBrain(kind); brain.cooldown = 0;
    const attacks: string[] = [];
    let volleys = 0;
    for (let frame = 0; frame < 120 * 35; frame++) {
      const previous = brain.state;
      const action = stepBossBrain(brain, kind, body(kind), ahead, 1 / 120);
      if (previous !== 'windup' && brain.state === 'windup') attacks.push(brain.attack!);
      if (action.fire) {
        volleys++;
        const info = bossAttackInfo(brain, kind);
        assert.equal(info.attack, 'volley');
        assert.equal(info.angles.length, 3);
        close(info.range, info.projectileSpeed * info.projectileLife);
        assert.ok(info.range <= 370);
        assert.ok(Math.max(...info.angles) - Math.min(...info.angles) <= 0.6);
      }
    }
    assert.ok(volleys >= 2);
    assert.deepEqual(attacks.slice(0, 6), kind === 'manager'
      ? ['charge', 'charge', 'volley', 'charge', 'charge', 'volley']
      : ['charge', 'volley', 'charge', 'volley', 'charge', 'volley']);
  }
});

test('half-health rage starts on the next warning and cannot change a released attack', () => {
  const brain = createBossBrain('director'); brain.cooldown = 0;
  const enemy = body('director');
  stepBossBrain(brain, 'director', enemy, ahead, 1 / 120);
  const warned = bossAttackInfo(brain, 'director', 1);
  enemy.hp = enemy.maxHp / 2;
  assert.deepEqual(bossAttackInfo(brain, 'director', 0.5), warned);
  while (brain.state === 'windup') stepBossBrain(brain, 'director', enemy, ahead, 1 / 120);
  assert.deepEqual(bossAttackInfo(brain, 'director', 0.5), warned);
  while (brain.state !== 'move') stepBossBrain(brain, 'director', enemy, ahead, 1 / 120);
  brain.cooldown = 0;
  stepBossBrain(brain, 'director', enemy, ahead, 1 / 120);
  const enraged = bossAttackInfo(brain, 'director', 0.5);
  assert.equal(brain.attackEnraged, true);
  assert.equal(enraged.angles.length, 5);
  assert.ok(enraged.cooldown < warned.cooldown);
  assert.ok(enraged.projectileSpeed > warned.projectileSpeed);
  assert.ok(enraged.range <= 370);
});

test('boss attacks cannot originate offscreen or skip warnings, and invalid time does not advance them', () => {
  for (const kind of ['manager', 'director'] as const) {
    const brain = createBossBrain(kind); brain.cooldown = 0;
    const enemy = body(kind);
    const approaching = stepBossBrain(brain, kind, enemy, { x: 900, y: 0 }, 1 / 120);
    assert.equal(brain.state, 'move');
    assert.ok(approaching.vx > 0); assert.equal(approaching.fire, false);
    const before = { ...brain };
    for (const dt of [0, -1, NaN, Infinity]) {
      assert.deepEqual(stepBossBrain(brain, kind, enemy, ahead, dt), { vx: 0, vy: 0, fire: false });
      assert.deepEqual(brain, before);
    }
    brain.attackIndex = kind === 'manager' ? 2 : 1;
    stepBossBrain(brain, kind, enemy, { x: 500, y: 0 }, 1 / 120);
    assert.equal(brain.state, 'move');
    stepBossBrain(brain, kind, enemy, ahead, 1 / 120);
    assert.equal(brain.state, 'windup');
    const info = bossAttackInfo(brain, kind);
    let releases = 0;
    for (let frame = 0; frame < 120 * 2; frame++) {
      const result = stepBossBrain(brain, kind, enemy, { x: 0, y: 250 }, 1 / 120);
      if (result.fire) {
        releases++;
        assert.ok((frame + 1) / 120 >= info.windup - 1e-9);
        assert.equal(brain.angle, 0);
      }
    }
    assert.equal(releases, 1);
  }
});
