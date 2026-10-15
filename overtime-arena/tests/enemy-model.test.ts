import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS, enemyStats, enemyDamageMultiplier, pressureAt, chooseEnemyKind, createEnemyBrain, stepEnemyBrain, waveEnemyStats, wavePressure, chooseWaveEnemyKind, ENEMY_VOLLEY, type EnemyKind } from '../src/game/EnemyModel.ts';

const origin = { x: 0, y: 0, speed: 150 };
const ahead = { x: 250, y: 0 };
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} ≠ ${b}`);

test('enemy growth starts at its base and has bounded health, speed and damage', () => {
  for (const kind of Object.keys(ENEMY_DEFS) as EnemyKind[]) {
    const base = ENEMY_DEFS[kind];
    assert.deepEqual(enemyStats(kind, 0), base);
    assert.deepEqual(enemyStats(kind, -100), base);
    for (const elapsed of [29.99, 30, 150, 300, 36000]) {
      const stats = enemyStats(kind, elapsed);
      assert.ok(stats.hp >= base.hp && stats.hp <= base.hp * 3);
      assert.ok(stats.speed >= base.speed && stats.speed <= base.speed * 1.3);
      assert.ok(stats.damage >= base.damage && stats.damage <= Math.round(base.damage * 1.6));
    }
    assert.deepEqual(enemyStats(kind, 300), enemyStats(kind, 36000));
  }
  assert.equal(enemyStats('runner', 30).hp, 120);
  assert.deepEqual(enemyStats('dummy', 36000), ENEMY_DEFS.dummy);
});

test('pressure introduces threats from the beginning and remains inside the enemy pool budget', () => {
  assert.deepEqual(pressureAt(0, 'steady'), { tier: 0, target: 54, batch: 4, interval: 0.36 });
  assert.deepEqual(pressureAt(0, 'swarm'), { tier: 0, target: 90, batch: 6, interval: 0.26 });
  assert.equal(pressureAt(36000, 'steady').target, 120);
  assert.equal(pressureAt(36000, 'swarm').target, 190);
  assert.deepEqual(pressureAt(36000, 'dummy'), { tier: 0, target: 5, batch: 0, interval: 1 });
  for (const mode of ['steady', 'swarm'] as const) {
    let previous = pressureAt(0, mode);
    for (let elapsed = 30; elapsed <= 600; elapsed += 30) {
      const pressure = pressureAt(elapsed, mode);
      assert.ok(pressure.target >= previous.target && pressure.target < 240);
      assert.ok(pressure.batch >= previous.batch && pressure.batch <= 11);
      assert.ok(pressure.interval <= previous.interval && pressure.interval >= 0.16);
      previous = pressure;
    }
  }
});

test('all five enemies are available immediately and special populations stop at their live limits', () => {
  const seen = new Set<EnemyKind>();
  let runners = 0;
  for (let n = 0; n < 1000; n++) {
    const kind = chooseEnemyKind(0, (n + 0.5) / 1000, {});
    seen.add(kind); if (kind === 'runner') runners++;
  }
  assert.equal(runners, 500);
  assert.deepEqual(seen, new Set(['runner', 'heavy', 'charger', 'shooter', 'shield']));
  const counts: Partial<Record<EnemyKind, number>> = {};
  for (let n = 0; n < 1000; n++) {
    const kind = chooseEnemyKind(300, ((n * 73) % 1000) / 1000, counts);
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  assert.equal(counts.heavy, 12); assert.equal(counts.charger, 14);
  assert.equal(counts.shooter, 8); assert.equal(counts.shield, 12);
  for (const roll of [0, 0.5, 1]) assert.equal(chooseEnemyKind(300, roll, counts), 'runner');
  assert.equal(chooseEnemyKind(30, 0.72, { heavy: 4 }), chooseEnemyKind(30, 0.72, { heavy: 4 }));
});

test('chargers telegraph for 0.6 seconds and retain a dodgeable fixed attack direction', () => {
  const brain = createEnemyBrain('charger'); brain.cooldown = 0;
  assert.deepEqual(stepEnemyBrain(brain, 'charger', origin, ahead, 1 / 120), { vx: 0, vy: 0, fire: false });
  assert.equal(brain.state, 'windup'); close(brain.timer, 0.6);
  const movedPlayer = { x: 0, y: 300 };
  for (let frame = 0; frame < 71; frame++) {
    const action = stepEnemyBrain(brain, 'charger', origin, movedPlayer, 1 / 120);
    assert.equal(brain.state, 'windup'); assert.equal(action.vx, 0); assert.equal(action.fire, false);
  }
  const released = stepEnemyBrain(brain, 'charger', origin, movedPlayer, 1 / 120);
  assert.equal(brain.state, 'rush'); close(released.vx, 560); close(released.vy, 0);
  assert.equal(brain.angle, 0); close(brain.cooldown, 2.8);
  for (let frame = 0; frame < 47; frame++) {
    const action = stepEnemyBrain(brain, 'charger', origin, movedPlayer, 1 / 120);
    assert.equal(brain.state, 'rush'); close(action.vx, 560); close(action.vy, 0);
  }
  assert.equal(stepEnemyBrain(brain, 'charger', origin, movedPlayer, 1 / 120).vx, 0);
  assert.equal(brain.state, 'recover');
  for (let frame = 0; frame < 48; frame++) stepEnemyBrain(brain, 'charger', origin, movedPlayer, 1 / 120);
  assert.equal(brain.state, 'move'); assert.ok(brain.cooldown > 1.9);
});

test('shooters warn for 0.75 seconds, release only once, and keep their warned aim', () => {
  for (const hz of [60, 120, 240]) {
    const brain = createEnemyBrain('shooter'); brain.cooldown = 0;
    const dt = 1 / hz;
    assert.equal(stepEnemyBrain(brain, 'shooter', origin, ahead, dt).fire, false);
    assert.equal(brain.state, 'windup');
    let fired = 0;
    for (let frame = 1; frame <= hz * 2; frame++) {
      const result = stepEnemyBrain(brain, 'shooter', origin, { x: 0, y: 300 }, dt);
      if (result.fire) { fired++; assert.ok(frame * dt >= 0.75 - 1e-9); assert.equal(brain.angle, 0); }
      if (frame * dt < 0.75 - 1e-9) assert.equal(result.fire, false);
    }
    assert.equal(fired, 1); assert.ok(brain.cooldown > 0);
  }
});

test('shooters preserve a firing lane, retreat from close range, and never fire while touching the player', () => {
  const brain = createEnemyBrain('shooter'); brain.cooldown = 0;
  const tooClose = stepEnemyBrain(brain, 'shooter', origin, { x: 90, y: 0 }, 1 / 120);
  assert.ok(tooClose.vx < 0); assert.equal(tooClose.fire, false); assert.equal(brain.state, 'move');
  brain.cooldown = 2;
  assert.equal(stepEnemyBrain(brain, 'shooter', origin, ahead, 1 / 120).vx, 0);
  assert.ok(stepEnemyBrain(brain, 'shooter', origin, { x: 600, y: 0 }, 1 / 120).vx > 0);
});

test('ordinary enemies chase at their own speed and dummies remain passive', () => {
  for (const kind of ['runner', 'heavy', 'shield'] as const) {
    const brain = createEnemyBrain(kind);
    const stats = enemyStats(kind, 0);
    const result = stepEnemyBrain(brain, kind, { ...origin, speed: stats.speed }, { x: 0, y: 300 }, 1 / 120);
    close(result.vx, 0); close(result.vy, stats.speed);
    close(brain.angle, kind === 'shield' ? 2 / 120 : Math.PI / 2);
    assert.equal(result.fire, false);
  }
  const brain = createEnemyBrain('dummy');
  for (let frame = 0; frame < 600; frame++) assert.deepEqual(stepEnemyBrain(brain, 'dummy', origin, ahead, 1 / 60), { vx: 0, vy: 0, fire: false });
  assert.notEqual(createEnemyBrain('shooter', 0).cooldown, createEnemyBrain('shooter', 0.5).cooldown);
});

test('shield blocks frontal travel while rear and side attacks deal full damage', () => {
  for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    assert.equal(enemyDamageMultiplier('shield', facing, facing + Math.PI), 0.42);
    assert.equal(enemyDamageMultiplier('shield', facing, facing), 1);
    assert.equal(enemyDamageMultiplier('shield', facing, facing + Math.PI / 2), 1);
    assert.equal(enemyDamageMultiplier('shield', facing, facing - Math.PI / 2), 1);
    for (const kind of ['runner', 'heavy', 'charger', 'shooter', 'dummy'] as const) {
      assert.equal(enemyDamageMultiplier(kind, facing, facing + Math.PI), 1);
    }
  }
});

test('shield turns at two radians per second while moving directly toward the player', () => {
  for (const hz of [60, 120, 240]) {
    const brain = createEnemyBrain('shield');
    const player = { x: 0, y: 300 };
    for (let frame = 0; frame < hz / 2; frame++) {
      const previous = brain.angle;
      const move = stepEnemyBrain(brain, 'shield', origin, player, 1 / hz);
      assert.ok(Math.abs(brain.angle - previous) <= 2 / hz + 1e-9);
      close(move.vx, 0); close(move.vy, origin.speed);
    }
    close(brain.angle, 1);
    for (let frame = 0; frame < hz / 2; frame++) stepEnemyBrain(brain, 'shield', origin, player, 1 / hz);
    close(brain.angle, Math.PI / 2);
  }
  const brain = createEnemyBrain('shield');
  brain.angle = Math.PI - 0.1;
  stepEnemyBrain(brain, 'shield', origin, { x: -300, y: -30 }, 0.05);
  close(brain.angle, Math.PI);
  stepEnemyBrain(brain, 'shield', origin, { x: -300, y: -30 }, 0.05);
  close(brain.angle, Math.atan2(-30, -300));
});

test('circling behind a shield exposes it until it has time to turn', () => {
  const brain = createEnemyBrain('shield');
  assert.equal(enemyDamageMultiplier('shield', brain.angle, Math.PI), 0.42);
  const behind = { x: -300, y: 0 };
  const action = stepEnemyBrain(brain, 'shield', origin, behind, 1 / 120);
  assert.ok(action.vx < 0);
  assert.equal(enemyDamageMultiplier('shield', brain.angle, 0), 1);
  for (let frame = 0; frame < 240; frame++) stepEnemyBrain(brain, 'shield', origin, behind, 1 / 120);
  assert.equal(enemyDamageMultiplier('shield', brain.angle, 0), 0.42);
});

test('run enemy introductions leave the first three waves free of projectiles', () => {
  const collectKinds = (wave: number) => new Set(Array.from({ length: 1000 }, (_, n) => chooseWaveEnemyKind(wave, n / 1000, {})));
  assert.deepEqual(collectKinds(1), new Set(['runner']));
  assert.deepEqual(collectKinds(2), new Set(['runner', 'heavy']));
  assert.deepEqual(collectKinds(3), new Set(['runner', 'heavy', 'charger']));
  assert.ok(collectKinds(4).has('shooter'));
  assert.ok(!collectKinds(4).has('shield'));
  assert.ok(collectKinds(5).has('shield'));
  for (let wave = 1; wave <= 20; wave++) {
    const seen = collectKinds(wave);
    assert.ok(!seen.has('manager') && !seen.has('director') && !seen.has('dummy'));
    const counts: Partial<Record<EnemyKind, number>> = {};
    for (let n = 0; n < 3000; n++) {
      const kind = chooseWaveEnemyKind(wave, ((n * 73) % 1000) / 1000, counts);
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    const cap = wave < 4 ? 0 : Math.min(5, 1 + Math.floor((wave - 4) / 4));
    assert.equal(counts.shooter ?? 0, cap);
    if (wave >= 4 && wave <= 6) assert.equal(counts.shooter, 1);
  }
});

test('wave pressure and health grow from a single-weapon opening within bounded pools', () => {
  assert.equal(waveEnemyStats('runner', 1).hp, 42);
  assert.ok(waveEnemyStats('heavy', 2).hp < 150);
  assert.deepEqual(waveEnemyStats('manager', 10), ENEMY_DEFS.manager);
  assert.deepEqual(waveEnemyStats('director', 20), ENEMY_DEFS.director);
  assert.deepEqual(enemyStats('director', 10000), ENEMY_DEFS.director);
  assert.equal(wavePressure(1, 'steady').target, 12);
  assert.equal(wavePressure(1, 'steady').initial, 7);
  assert.equal(wavePressure(1, 'steady').batch, 1);
  assert.equal(wavePressure(3, 'steady').target, 18);
  for (const mode of ['steady', 'swarm'] as const) {
    let previous = wavePressure(1, mode);
    for (let wave = 2; wave <= 20; wave++) {
      const current = wavePressure(wave, mode);
      assert.ok(current.target >= previous.target && current.target <= 130);
      assert.ok(current.batch >= previous.batch && current.batch <= 8);
      assert.ok(current.interval <= previous.interval && current.interval >= 0.3);
      assert.ok(current.initial <= current.target);
      assert.ok(waveEnemyStats('runner', wave).hp > waveEnemyStats('runner', wave - 1).hp);
      previous = current;
    }
  }
  assert.deepEqual(wavePressure(NaN, 'steady'), wavePressure(1, 'steady'));
  assert.deepEqual(waveEnemyStats('runner', Infinity), waveEnemyStats('runner', 1));
  assert.deepEqual(waveEnemyStats('runner', 1000), waveEnemyStats('runner', 20));
  assert.equal(chooseWaveEnemyKind(NaN, NaN, {}), 'runner');
});

test('ordinary shooters have a short single-shot lane and at least three seconds between releases', () => {
  assert.equal(ENEMY_VOLLEY.count, 1);
  assert.equal(ENEMY_VOLLEY.range, ENEMY_VOLLEY.speed * ENEMY_VOLLEY.life);
  assert.ok(ENEMY_VOLLEY.range <= 270);
  assert.ok(ENEMY_VOLLEY.cooldown >= 3);
  for (const distance of [0, 179, 281, 520]) {
    const brain = createEnemyBrain('shooter'); brain.cooldown = 0;
    stepEnemyBrain(brain, 'shooter', origin, { x: distance, y: 0 }, 1 / 120);
    assert.equal(brain.state, 'move');
  }
  for (const hz of [60, 120, 240]) {
    const brain = createEnemyBrain('shooter'); brain.cooldown = 0;
    let last = -10, releases = 0;
    for (let frame = 0; frame < hz * 12; frame++) {
      const action = stepEnemyBrain(brain, 'shooter', origin, ahead, 1 / hz);
      if (action.fire) {
        const now = frame / hz;
        assert.ok(now - last >= 3);
        last = now; releases++;
      }
    }
    assert.ok(releases >= 3 && releases <= 4);
  }
});
