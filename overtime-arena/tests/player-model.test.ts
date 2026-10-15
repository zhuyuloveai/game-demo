import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, WEAPONS, type PlayerAttributes, type WeaponId, type WeaponLevel } from '../src/shared.ts';
import { CRIT_MULTIPLIER, normalizePlayerAttributes, migratePlayerAttributes, attackMultiplier, attackRateMultiplier, rollCritical, resolveDamage, weaponOutput } from '../src/game/PlayerModel.ts';
import { weaponStats } from '../src/game/WeaponModel.ts';
import { enemyDamageMultiplier } from '../src/game/EnemyModel.ts';

const defaults: PlayerAttributes = { attackPower: 100, attackSpeed: 35, critChance: 25 };
const attributes = (overrides: Partial<PlayerAttributes> = {}): PlayerAttributes => ({ ...defaults, ...overrides });
const close = (actual: number, expected: number): void => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('new saves and malformed attributes recover independent combat defaults', () => {
  assert.deepEqual(normalizePlayerAttributes(DEFAULT_SETTINGS), defaults);
  for (const input of [undefined, null, {}, [], false, 100, '100']) assert.deepEqual(normalizePlayerAttributes(input), defaults);
  assert.deepEqual(normalizePlayerAttributes({ attackPower: NaN, attackSpeed: Infinity, critChance: '100' }), defaults);
  assert.deepEqual(normalizePlayerAttributes({ attackPower: 0, attackSpeed: -50, critChance: 0 }), { attackPower: 0, attackSpeed: -50, critChance: 0 });
  assert.deepEqual(normalizePlayerAttributes({ attackPower: 500, attackSpeed: -100, critChance: 101 }), { attackPower: 300, attackSpeed: -50, critChance: 100 });
  assert.deepEqual(normalizePlayerAttributes({ attackPower: -1, attackSpeed: 101, critChance: -1 }), { attackPower: 0, attackSpeed: 100, critChance: 0 });
  assert.deepEqual(normalizePlayerAttributes(Object.create({ attackPower: 300, attackSpeed: 100, critChance: 100 })), defaults);
});

test('attack power and speed independently scale damage and reciprocal cooldown', () => {
  assert.equal(attackMultiplier(defaults), 2);
  assert.equal(attackRateMultiplier(defaults), 1.35);
  assert.equal(resolveDamage(21, defaults, false), 42);
  assert.equal(resolveDamage(21, defaults, true), 84);
  assert.equal(CRIT_MULTIPLIER, 2);
  const noBonus = attributes({ attackPower: 0, attackSpeed: 0 });
  assert.equal(attackMultiplier(noBonus), 1);
  assert.equal(attackRateMultiplier(noBonus), 1);
  assert.equal(attackRateMultiplier(attributes({ attackSpeed: -50 })), 0.5);
  assert.equal(attackRateMultiplier(attributes({ attackSpeed: 100 })), 2);
  for (const weapon of Object.keys(WEAPONS) as WeaponId[]) {
    const base = weaponStats(weapon, 1);
    const output = weaponOutput(weapon, 1, defaults);
    close(1 / output.attacksPerSecond, base.interval / 1.35);
    assert.equal(weaponOutput(weapon, 1, attributes({ attackSpeed: 100 })).normalDamage, output.normalDamage);
    assert.equal(weaponOutput(weapon, 1, attributes({ attackPower: 300 })).attacksPerSecond, output.attacksPerSecond);
  }
});

test('critical rolls respect exact percentage thresholds and safe boundary values', () => {
  for (const roll of [-1, 0, 0.999999, 1, 2, NaN, Infinity]) {
    assert.equal(rollCritical(attributes({ critChance: 0 }), roll), false);
    assert.equal(rollCritical(attributes({ critChance: 100 }), roll), true);
  }
  assert.equal(rollCritical(defaults, 0.249999), true);
  assert.equal(rollCritical(defaults, 0.25), false);
  assert.equal(rollCritical(defaults, -1), true);
  assert.equal(rollCritical(defaults, 1), false);
  assert.equal(rollCritical(defaults, 2), false);
  assert.equal(rollCritical(defaults, NaN), false);
  assert.equal(rollCritical(defaults, Infinity), false);
  assert.equal(Array.from({ length: 100 }, (_, i) => rollCritical(defaults, i / 100)).filter(Boolean).length, 25);
});

test('damage applies critical and shield defense before a single final rounding', () => {
  const frontShield = enemyDamageMultiplier('shield', 0, Math.PI);
  const rearShield = enemyDamageMultiplier('shield', 0, 0);
  assert.equal(frontShield, 0.42);
  assert.equal(rearShield, 1);
  assert.equal(resolveDamage(21, defaults, false, frontShield), 18);
  assert.equal(resolveDamage(21, defaults, true, frontShield), 35);
  assert.equal(resolveDamage(21, defaults, true, rearShield), 84);
  // Rounding each intermediate product would incorrectly produce 18 instead of 17.
  assert.equal(resolveDamage(20.5, attributes({ attackPower: 0 }), true, frontShield), 17);
  assert.equal(resolveDamage(0.01, defaults, false, 0.01), 1);
  for (const damage of [-20, 0, NaN, Infinity, -Infinity]) assert.equal(resolveDamage(damage, defaults, true), 0);
  for (const multiplier of [-1, 0, NaN, Infinity]) assert.equal(resolveDamage(21, defaults, true, multiplier), 0);
  assert.equal(resolveDamage(Number.MAX_VALUE, defaults, true), 0);
});

test('all eight weapons and all five levels report finite increasing output using actual rounded damage', () => {
  const weapons = Object.keys(WEAPONS) as WeaponId[];
  assert.equal(weapons.length, 8);
  for (const weapon of weapons) {
    let previousDps = 0;
    for (const level of [1, 2, 3, 4, 5] as WeaponLevel[]) {
      const base = weaponStats(weapon, level);
      const output = weaponOutput(weapon, level, defaults);
      for (const value of Object.values(output)) assert.ok(Number.isFinite(value) && value > 0);
      assert.equal(output.normalDamage, Math.round(base.damage * 2));
      assert.equal(output.criticalDamage, Math.round(base.damage * 4));
      const hitCount = weapon === 'scatter' ? base.pellets : weapon === 'folder' ? 2 : 1;
      close(output.expectedDps, (output.normalDamage * 0.75 + output.criticalDamage * 0.25) * hitCount * 1.35 / base.interval);
      assert.ok(output.expectedDps > previousDps, `${weapon} level ${level}`);
      previousDps = output.expectedDps;
    }
  }
});

test('single-target DPS counts all pellets and both folder legs without multiplying splash or chain targets', () => {
  const noCrit = attributes({ critChance: 0 });
  for (const weapon of ['scatter', 'folder', 'coffee', 'keyboard', 'stamp', 'laser', 'cable'] as WeaponId[]) {
    const output = weaponOutput(weapon, 5, noCrit);
    const hits = weapon === 'scatter' ? 9 : weapon === 'folder' ? 2 : 1;
    close(output.expectedDps / (output.normalDamage * output.attacksPerSecond), hits);
    const guaranteedCrit = weaponOutput(weapon, 5, attributes({ critChance: 100 }));
    close(guaranteedCrit.expectedDps, guaranteedCrit.criticalDamage * hits * guaranteedCrit.attacksPerSecond);
  }
});

test('legacy fire-rate tuning migrates while untouched saves get the stronger default', () => {
  for (const input of [null, {}, { fireRate: 1 }, { fireRate: 0.49 }, { fireRate: 2.01 }, { fireRate: '2' }, { fireRate: NaN }, { fireRate: Infinity }]) {
    assert.deepEqual(migratePlayerAttributes(input), defaults);
  }
  for (const [fireRate, attackSpeed] of [[0.5, -50], [0.55, -45], [0.75, -25], [1.05, 5], [1.1, 10], [1.5, 50], [2, 100]]) {
    assert.deepEqual(migratePlayerAttributes({ fireRate }), { ...defaults, attackSpeed });
  }
  assert.deepEqual(migratePlayerAttributes({ fireRate: 2, attackSpeed: 0, critChance: 70 }), { ...defaults, attackSpeed: 0, critChance: 70 });
  assert.deepEqual(migratePlayerAttributes({ fireRate: 2, attackSpeed: NaN }), defaults);
  assert.deepEqual(migratePlayerAttributes({ fireRate: 2, attackSpeed: undefined }), defaults);
  const save = { fireRate: 1.5, attackPower: 200, arbitrary: 'kept outside this function' };
  const before = { ...save };
  assert.deepEqual(migratePlayerAttributes(save), { attackPower: 200, attackSpeed: 50, critChance: 25 });
  assert.deepEqual(save, before);
  const migrated = migratePlayerAttributes(save);
  assert.deepEqual(migratePlayerAttributes(JSON.parse(JSON.stringify(migrated))), migrated);
});
