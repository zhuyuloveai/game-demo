import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPON_SLOTS, createWeaponRack, advanceWeapon, triggerWeapon, weaponSwing, weaponGrip, pickWeaponTarget, grantWeaponXp } from '../src/game/WeaponRig.ts';
import { DEFAULT_LOADOUT, WEAPON_XP_THRESHOLDS, weaponStats } from '../src/game/WeaponModel.ts';
import { WEAPONS, type WeaponId, type WeaponLevel } from '../src/shared.ts';

const enemy = (id: number, x: number, y = 0) => ({ id, x, y, radius: 17, spawn: 0, active: true });

test('six distinct hands default to six weapon types and reset without shared mutable state', () => {
  const rack = createWeaponRack();
  assert.equal(rack.length, 6);
  assert.deepEqual(rack.map(({ weapon, level }) => ({ weapon, level })), DEFAULT_LOADOUT);
  assert.equal(new Set(rack.map(slot => slot.weapon)).size, 6);
  assert.equal(new Set(WEAPON_SLOTS.map(slot => `${slot.x},${slot.y}`)).size, 6);
  const untouched = structuredClone(rack[1]);
  triggerWeapon(rack[0], 1); advanceWeapon(rack[0], 0.02);
  assert.deepEqual(rack[1], untouched);
  rack[0].targetId = 99;
  assert.deepEqual(createWeaponRack(), createWeaponRack());
  assert.equal(createWeaponRack()[0].targetId, null);
});

test('all weapons retain their level-dependent cadence across simulation step sizes', () => {
  for (const weapon of Object.keys(WEAPONS) as WeaponId[]) for (const level of [1, 3, 5] as WeaponLevel[]) {
    const counts = [60, 120, 240].map(hz => {
      const slot = createWeaponRack([{ weapon, level }])[0];
      let fired = 0;
      for (let frame = 0; frame < 30 * hz; frame++) {
        advanceWeapon(slot, 1 / hz);
        if (slot.cooldown <= 1e-10) { fired++; triggerWeapon(slot, 1.7); }
      }
      assert.ok(fired > 0);
      return fired;
    });
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${weapon} ${level}: ${counts}`);
  }
});

test('hands may pick different live targets and never retain an out-of-range lock', () => {
  const rack = createWeaponRack();
  const left = enemy(1, -180), right = enemy(2, 180);
  assert.equal(pickWeaponTarget(rack[0], -46, -24, [left, right], new Set())?.id, 1);
  assert.equal(pickWeaponTarget(rack[1], 46, -24, [left, right], new Set([1]))?.id, 2);
  rack[2].targetId = 3;
  assert.equal(pickWeaponTarget(rack[2], 0, 0, [enemy(3, 421)], new Set()), null);
  assert.equal(pickWeaponTarget(rack[0], 0, 0, [
    { ...left, active: false }, { ...right, spawn: 0.1 }, enemy(3, 651),
  ], new Set()), null);
});

test('melee can reach an enemy edge but cannot auto-swing at a distant ranged target', () => {
  const slot = createWeaponRack()[4];
  assert.equal(pickWeaponTarget(slot, 0, 0, [enemy(1, 172)], new Set())?.id, 1);
  assert.equal(pickWeaponTarget(slot, 0, 0, [enemy(1, 173), enemy(2, 400)], new Set()), null);
});

test('both melee animations complete before the next attack at all levels and fire rates', () => {
  for (const weapon of ['keyboard', 'stamp'] as WeaponId[]) for (const level of [1, 2, 3, 4, 5] as WeaponLevel[]) for (const rate of [0.5, 1, 2]) {
    const slot = createWeaponRack([{ weapon, level }])[0]; triggerWeapon(slot, rate);
    assert.ok(slot.swingDuration < slot.cooldown);
    assert.equal(weaponSwing(slot), 0);
    let min = 0, max = 0, previous = 0;
    while (slot.cooldown > 0) {
      advanceWeapon(slot, 1 / 240);
      const angle = weaponSwing(slot);
      assert.ok(Math.abs(angle - previous) < 0.2);
      min = Math.min(min, angle); max = Math.max(max, angle); previous = angle;
    }
    assert.ok(min < -0.6 && max > 1);
    assert.equal(slot.swingLeft, 0); assert.equal(weaponSwing(slot), 0);
  }
});

test('loadout weapons and levels control the slot cooldown and target range', () => {
  const stamp = createWeaponRack([{ weapon: 'stamp', level: 5 }])[0];
  triggerWeapon(stamp, 1);
  assert.equal(stamp.cooldown, weaponStats('stamp', 5).interval);
  assert.ok(stamp.swingLeft > 0);
  const reach = weaponStats('stamp', 5).range + 17;
  assert.equal(pickWeaponTarget(stamp, 0, 0, [enemy(1, reach)], new Set())?.id, 1);
  assert.equal(pickWeaponTarget(stamp, 0, 0, [enemy(1, reach + 1)], new Set()), null);
  const folder = createWeaponRack([{ weapon: 'folder', level: 3 }])[0];
  triggerWeapon(folder, 1);
  assert.ok(folder.recoil > 0);
  assert.equal(folder.swingLeft, 0);
});

test('kill experience upgrades all hands at exact cumulative thresholds', () => {
  const rack = createWeaponRack();
  assert.deepEqual(grantWeaponXp(rack, 59), []);
  assert.ok(rack.every(slot => slot.level === 1 && slot.xp === 59));
  assert.deepEqual(grantWeaponXp(rack, 1), [0, 1, 2, 3, 4, 5]);
  assert.ok(rack.every(slot => slot.level === 2 && slot.xp === 60));
  assert.deepEqual(grantWeaponXp(rack, 499), [0, 1, 2, 3, 4, 5]);
  assert.ok(rack.every(slot => slot.level === 4 && slot.xp === 559));
  assert.deepEqual(grantWeaponXp(rack, 1), [0, 1, 2, 3, 4, 5]);
  assert.ok(rack.every(slot => slot.level === 5 && slot.xp === 560));
  assert.deepEqual(grantWeaponXp(rack, 1000), []);
  assert.ok(rack.every(slot => slot.level === 5 && slot.xp === 560));
});

test('experience safely crosses multiple levels and preserves mixed starting levels', () => {
  const rack = createWeaponRack([{ weapon: 'stapler', level: 1 }, { weapon: 'stamp', level: 4 }, { weapon: 'cable', level: 5 }]);
  assert.deepEqual(rack.slice(0, 3).map(slot => slot.xp), [0, WEAPON_XP_THRESHOLDS[3], WEAPON_XP_THRESHOLDS[4]]);
  assert.deepEqual(grantWeaponXp(rack, 560), [0, 1]);
  assert.ok(rack.slice(0, 3).every(slot => slot.level === 5 && slot.xp === 560));
  assert.ok(rack.slice(3).every(slot => !slot.equipped && slot.level === 1 && slot.xp === 0));
  const unchanged = structuredClone(rack);
  for (const invalid of [NaN, Infinity, -Infinity, -1, 0]) assert.deepEqual(grantWeaponXp(rack, invalid), []);
  assert.deepEqual(rack, unchanged);
});

test('recoil and swing alter only the firing hand and always recover to its own grip', () => {
  const rack = createWeaponRack();
  triggerWeapon(rack[2], 1); triggerWeapon(rack[4], 1);
  assert.notEqual(weaponGrip(2, 0, rack[2].recoil, 0).x, WEAPON_SLOTS[2].x);
  assert.deepEqual(weaponGrip(3, 0, rack[3].recoil, weaponSwing(rack[3])), { x: 48, y: 4 });
  for (let i = 0; i < 240; i++) for (const slot of rack) advanceWeapon(slot, 1 / 120);
  for (const slot of rack) {
    const grip = weaponGrip(slot.slot, slot.angle, slot.recoil, weaponSwing(slot));
    assert.ok(Math.abs(grip.x - WEAPON_SLOTS[slot.slot].x) < 1e-9);
    assert.ok(Math.abs(grip.y - WEAPON_SLOTS[slot.slot].y) < 1e-9);
  }
});

test('empty hands cannot target, attack, animate, or earn weapon experience', () => {
  const rack = createWeaponRack([{ weapon: 'stapler', level: 1 }, null]);
  assert.equal(rack.length, 6);
  assert.equal(rack.filter(slot => slot.equipped).length, 1);
  const empty = structuredClone(rack.slice(1));
  for (const slot of rack.slice(1)) {
    assert.equal(pickWeaponTarget(slot, 0, 0, [enemy(1, 1)], new Set()), null);
    triggerWeapon(slot, 2);
    advanceWeapon(slot, 1);
    assert.equal(weaponSwing(slot), 0);
  }
  assert.deepEqual(grantWeaponXp(rack, 60), [0]);
  assert.deepEqual(rack.slice(1), empty);
  assert.equal(rack[0].level, 2);
});
