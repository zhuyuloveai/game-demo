import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOADOUT, WEAPON_LEVELS, WEAPON_XP_THRESHOLDS, normalizeLoadout, normalizeRunLoadout, createStartingLoadout, nextWeaponXp, weaponStats } from '../src/game/WeaponModel.ts';
import { WEAPONS, type WeaponId, type WeaponLevel } from '../src/shared.ts';

const weapons = Object.keys(WEAPONS) as WeaponId[];
const levels = [1, 2, 3, 4, 5] as WeaponLevel[];

test('eight weapons expose five finite, progressively stronger combat stat sets', () => {
  assert.equal(weapons.length, 8);
  assert.equal(WEAPON_LEVELS.length, 5);
  assert.deepEqual(WEAPON_LEVELS.map(level => level.level), levels);
  assert.equal(new Set(WEAPON_LEVELS.map(level => level.css)).size, 5);
  for (const weapon of weapons) {
    let previous = weaponStats(weapon, 1);
    for (const level of levels) {
      const stats = weaponStats(weapon, level);
      for (const [name, value] of Object.entries(stats)) if (name !== 'kind') {
        assert.ok(typeof value === 'number' && Number.isFinite(value) && value >= 0, `${weapon} ${level} ${name}`);
      }
      assert.ok(stats.damage > 0 && stats.interval > 0 && stats.range > 0);
      if (level > 1) {
        assert.ok(stats.damage > previous.damage, `${weapon} damage at ${level}`);
        assert.ok(stats.interval < previous.interval, `${weapon} interval at ${level}`);
      }
      previous = stats;
    }
    const first = weaponStats(weapon, 1), final = weaponStats(weapon, 5);
    const totalDps = (stats: typeof first) => stats.damage * (stats.kind === 'chain' ? stats.chains : stats.pellets) / stats.interval;
    assert.ok(totalDps(final) / totalDps(first) <= 2.51, `${weapon} total shot/chain damage budget`);
    assert.notStrictEqual(weaponStats(weapon, 1), weaponStats(weapon, 1));
  }
});

test('original level-one weapons retain their damage, cadence and reach', () => {
  for (const [weapon, damage, interval, range] of [
    ['stapler', 21, 0.145, 650], ['scatter', 12, 0.62, 420], ['keyboard', 42, 0.46, 155],
  ] as const) {
    const stats = weaponStats(weapon, 1);
    assert.deepEqual([stats.damage, stats.interval, stats.range], [damage, interval, range]);
  }
});

test('level III and V improve the signature effect of every weapon', () => {
  const signature = { stapler: 'pierce', scatter: 'pellets', keyboard: 'radius', laser: 'pierce', coffee: 'radius', folder: 'pierce', stamp: 'radius', cable: 'chains' } as const;
  for (const weapon of weapons) {
    const stat = signature[weapon];
    assert.equal(weaponStats(weapon, 1)[stat], weaponStats(weapon, 2)[stat]);
    assert.ok(weaponStats(weapon, 3)[stat] > weaponStats(weapon, 2)[stat]);
    assert.equal(weaponStats(weapon, 3)[stat], weaponStats(weapon, 4)[stat]);
    assert.ok(weaponStats(weapon, 5)[stat] > weaponStats(weapon, 4)[stat]);
  }
});

test('invalid or old saved loadouts recover to exactly six independent valid hands', () => {
  for (const invalid of [null, undefined, false, 3, 'bad json', {}, [], ['stapler', 'scatter'], Array(9).fill({ weapon: 'constructor', level: 5 })]) {
    assert.deepEqual(normalizeLoadout(invalid), DEFAULT_LOADOUT);
  }
  const result = normalizeLoadout([{ weapon: 'cable', level: 5 }, { weapon: 'stamp', level: 3 }, { weapon: 'coffee', level: 7 }, { weapon: 'laser', level: '3' }, { weapon: 'folder', level: NaN }, { weapon: '__proto__', level: 5 }, { weapon: 'stamp', level: 5 }]);
  assert.deepEqual(result, [
    { weapon: 'cable', level: 5 }, { weapon: 'stamp', level: 3 }, { weapon: 'coffee', level: 1 },
    { weapon: 'laser', level: 1 }, { weapon: 'folder', level: 1 }, DEFAULT_LOADOUT[5],
  ]);
  result[5].level = 5;
  assert.equal(DEFAULT_LOADOUT[5].level, 1);
  const saved = JSON.stringify(normalizeLoadout(result));
  assert.deepEqual(normalizeLoadout(JSON.parse(saved)), result);
});

test('experience thresholds are cumulative and stop at level V', () => {
  assert.deepEqual(WEAPON_XP_THRESHOLDS, [0, 60, 160, 320, 560]);
  assert.deepEqual(levels.map(nextWeaponXp), [60, 160, 320, 560, null]);
});

test('run loadouts retain six nullable hands without granting weapons for malformed entries', () => {
  for (const invalid of [null, undefined, [], {}, 'stapler']) assert.deepEqual(normalizeRunLoadout(invalid), Array(6).fill(null));
  const source = [null, { weapon: 'cable', level: 4 }, { weapon: 'constructor', level: 3 }, { weapon: 'laser', level: 6 }];
  const result = normalizeRunLoadout(source);
  assert.deepEqual(result, [null, { weapon: 'cable', level: 4 }, null, { weapon: 'laser', level: 1 }, null, null]);
  result[1]!.level = 2;
  assert.equal(source[1]!.level, 4);
  assert.equal(normalizeRunLoadout(Array(10).fill({ weapon: 'stapler', level: 1 })).length, 6);
});

test('starting loadout chooses the first valid weapon at level one and guarantees one weapon', () => {
  assert.deepEqual(createStartingLoadout([null, { weapon: 'keyboard', level: 5 }, { weapon: 'laser', level: 3 }]),
    [{ weapon: 'keyboard', level: 1 }, null, null, null, null, null]);
  assert.deepEqual(createStartingLoadout(null), [{ weapon: 'stapler', level: 1 }, null, null, null, null, null]);
  const start = createStartingLoadout(DEFAULT_LOADOUT);
  assert.equal(start.filter(Boolean).length, 1);
  start[0]!.level = 5;
  assert.equal(DEFAULT_LOADOUT[0].level, 1);
});
