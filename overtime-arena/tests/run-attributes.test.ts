import test from 'node:test';
import assert from 'node:assert/strict';
import { type PlayerAttributes, type RunAttributes, type WeaponId, type WeaponLevel } from '../src/shared.ts';
import {
  attackMultiplier, attackRateMultiplier, composeRunAttributes, incomingDamage, normalizePlayerAttributes,
  pickupRadius, playerMoveSpeed, regenPerSecond, resolveDamage, rollCritical, scaledWeaponDamage, weaponOutput,
} from '../src/game/PlayerModel.ts';
import { weaponStats } from '../src/game/WeaponModel.ts';

const base: PlayerAttributes = { attackPower: 100, attackSpeed: 35, critChance: 25 };
const close = (actual: number, expected: number): void => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('run attributes start from configured attack stats and independent survival and economy defaults', () => {
  const defaults: RunAttributes = {
    ...base, maxHp: 100, hpRegen: 0, lifeSteal: 0, armor: 0, dodge: 0, speedBonus: 0,
    luck: 0, harvesting: 5, meleeDamage: 0, rangedDamage: 0, elementalDamage: 0, pickupRange: 0,
  };
  assert.deepEqual(composeRunAttributes(base), defaults);
  const bonuses: Partial<RunAttributes> = { attackPower: 40, attackSpeed: 20, critChance: 5, maxHp: 25, armor: 3, harvesting: 4 };
  const before = { ...bonuses };
  const result = composeRunAttributes(base, bonuses);
  assert.deepEqual(result, { ...defaults, attackPower: 140, attackSpeed: 55, critChance: 30, maxHp: 125, armor: 3, harvesting: 9 });
  assert.deepEqual(bonuses, before);
  assert.deepEqual(base, { attackPower: 100, attackSpeed: 35, critChance: 25 });
  assert.deepEqual(composeRunAttributes(base, bonuses), result, 'recomputing a snapshot does not accumulate bonuses twice');
});

test('all run attributes clamp independently at their intended positive and negative bounds', () => {
  const expectedMinimum: RunAttributes = {
    attackPower: 0, attackSpeed: -50, critChance: 0, maxHp: 1, hpRegen: 0, lifeSteal: 0,
    armor: -20, dodge: 0, speedBonus: -50, luck: 0, harvesting: 0,
    meleeDamage: 0, rangedDamage: 0, elementalDamage: 0, pickupRange: 0,
  };
  const expectedMaximum: RunAttributes = {
    attackPower: 1000, attackSpeed: 200, critChance: 100, maxHp: 2000, hpRegen: 100, lifeSteal: 100,
    armor: 100, dodge: 60, speedBonus: 100, luck: 300, harvesting: 500,
    meleeDamage: 300, rangedDamage: 300, elementalDamage: 300, pickupRange: 200,
  };
  const keys = Object.keys(expectedMinimum) as (keyof RunAttributes)[];
  assert.deepEqual(composeRunAttributes(base, Object.fromEntries(keys.map(key => [key, -10000]))), expectedMinimum);
  assert.deepEqual(composeRunAttributes(base, Object.fromEntries(keys.map(key => [key, 10000]))), expectedMaximum);
  assert.equal(composeRunAttributes(base, { dodge: 59.5 }).dodge, 59.5);
  assert.equal(composeRunAttributes(base, { dodge: 60.5 }).dodge, 60);
});

test('malformed and inherited run bonuses cannot poison otherwise valid stats', () => {
  const defaults = composeRunAttributes(base);
  for (const invalid of [NaN, Infinity, -Infinity, undefined, null, '30', {}, []]) {
    const bonuses = Object.fromEntries(Object.keys(defaults).map(key => [key, invalid])) as Partial<RunAttributes>;
    assert.deepEqual(composeRunAttributes(base, bonuses), defaults);
  }
  assert.deepEqual(composeRunAttributes(base, Object.create({ armor: 100, maxHp: 2000 })), defaults);
  assert.deepEqual(composeRunAttributes(base, null as unknown as Partial<RunAttributes>), defaults);
  assert.equal(composeRunAttributes(base, { armor: NaN, maxHp: 25 }).maxHp, 125);
});

test('run growth keeps expanded attack caps through hit resolution, while legacy settings retain original limits', () => {
  const run = composeRunAttributes(base, { attackPower: 10000, attackSpeed: 10000, critChance: 100 });
  assert.equal(attackMultiplier(run), 11);
  assert.equal(attackRateMultiplier(run), 3);
  assert.equal(resolveDamage(10, run, false), 110);
  assert.equal(resolveDamage(10, run, true), 220);
  assert.equal(rollCritical(run, 0.9999), true);
  const legacy = { attackPower: 1000, attackSpeed: 200, critChance: 100 };
  assert.deepEqual(normalizePlayerAttributes(legacy), { attackPower: 300, attackSpeed: 100, critChance: 100 });
  assert.equal(attackMultiplier(legacy), 4);
  assert.equal(attackRateMultiplier(legacy), 2);
  assert.equal(resolveDamage(10, legacy, true), 80);
  assert.equal(attackMultiplier({ ...run, attackPower: Infinity }), 2);
  assert.equal(attackRateMultiplier({ ...run, attackSpeed: NaN }), 1.35);
});

const scaling: Record<WeaponId, [keyof Pick<RunAttributes, 'meleeDamage' | 'rangedDamage' | 'elementalDamage'>, number]> = {
  keyboard: ['meleeDamage', 1], stamp: ['meleeDamage', 1], stapler: ['rangedDamage', 0.7],
  scatter: ['rangedDamage', 0.35], folder: ['rangedDamage', 0.8], laser: ['elementalDamage', 1],
  coffee: ['elementalDamage', 1], cable: ['elementalDamage', 0.8],
};

for (const weapon of Object.keys(scaling) as WeaponId[]) {
  test(`${weapon}: family damage and displayed output match hit resolution across all five weapon levels`, () => {
    const [family, factor] = scaling[weapon];
    const run = composeRunAttributes(base, { attackPower: 340, attackSpeed: 130, meleeDamage: 13, rangedDamage: 27, elementalDamage: 41 });
    for (const level of [1, 2, 3, 4, 5] as WeaponLevel[]) {
      const stats = weaponStats(weapon, level);
      const raw = stats.damage + run[family] * factor;
      close(scaledWeaponDamage(weapon, level, run), raw);
      assert.equal(scaledWeaponDamage(weapon, level, base), stats.damage);
      const output = weaponOutput(weapon, level, run);
      assert.equal(output.normalDamage, resolveDamage(raw, run, false));
      assert.equal(output.criticalDamage, resolveDamage(raw, run, true));
      close(output.attacksPerSecond, 2.65 / stats.interval);
      const hits = weapon === 'scatter' ? stats.pellets : weapon === 'folder' ? 2 : 1;
      close(output.expectedDps, (output.normalDamage * 0.75 + output.criticalDamage * 0.25) * hits * output.attacksPerSecond);
      const unrelated = composeRunAttributes(base, { meleeDamage: 13, rangedDamage: 27, elementalDamage: 41, [family]: 0 });
      assert.equal(scaledWeaponDamage(weapon, level, unrelated), stats.damage, 'unrelated family bonuses do not apply');
    }
  });
}

test('armor mitigation rounds after scaling and respects negative armor and a one-damage floor', () => {
  assert.equal(incomingDamage(30, 0), 30);
  assert.equal(incomingDamage(30, 15), 15);
  assert.equal(incomingDamage(30, 30), 10);
  assert.equal(incomingDamage(30, -15), 60);
  assert.equal(incomingDamage(30, -20), 70);
  assert.equal(incomingDamage(30, -100), 70);
  assert.equal(incomingDamage(30, 10000), incomingDamage(30, 100));
  assert.equal(incomingDamage(0.1, 100), 1);
  assert.equal(incomingDamage(10.4, 15), 5);
  assert.equal(incomingDamage(30, NaN), 30);
  for (const invalid of [-1, 0, NaN, Infinity]) assert.equal(incomingDamage(invalid, 10), 0);
});

test('health regeneration has the first-point boost followed by linear incremental recovery', () => {
  assert.equal(regenPerSecond(0), 0);
  assert.equal(regenPerSecond(0.5), 0.1);
  assert.equal(regenPerSecond(1), 0.2);
  close(regenPerSecond(2), 0.289);
  close(regenPerSecond(10), 1.001);
  close(regenPerSecond(100), 9.011);
  assert.equal(regenPerSecond(1000), regenPerSecond(100));
  for (const invalid of [-1, NaN, Infinity]) assert.equal(regenPerSecond(invalid), 0);
});

test('movement and material collection remain bounded for bonuses and malformed inputs', () => {
  assert.equal(playerMoveSpeed(280, 0), 280);
  assert.equal(playerMoveSpeed(280, 25), 350);
  assert.equal(playerMoveSpeed(280, -50), 140);
  assert.equal(playerMoveSpeed(280, 100), 560);
  assert.equal(playerMoveSpeed(20, 0), 100);
  assert.equal(playerMoveSpeed(1000, 0), 560);
  assert.equal(playerMoveSpeed(280, -100), 140);
  assert.equal(playerMoveSpeed(NaN, Infinity), 280);
  assert.equal(pickupRadius(0), 140);
  assert.equal(pickupRadius(50), 210);
  assert.equal(pickupRadius(200), 420);
  assert.equal(pickupRadius(1000), 420);
  for (const invalid of [-100, NaN, Infinity]) assert.equal(pickupRadius(invalid), 140);
});
