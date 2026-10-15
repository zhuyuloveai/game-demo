import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, type EquippedWeapon, type RunAttributes } from '../src/shared.ts';
import { DEFAULT_LOADOUT, createStartingLoadout } from '../src/game/WeaponModel.ts';
import { composeRunAttributes, RUN_ATTRIBUTE_LIMITS } from '../src/game/PlayerModel.ts';
import { ITEMS, UPGRADES, RunProgress, nextLevelXp, waveDuration, isBossWave, weaponRecycleValue, weaponShopPrice } from '../src/game/RunModel.ts';

const create = (random = () => 0, loadout: readonly EquippedWeapon[] = DEFAULT_LOADOUT) => new RunProgress(DEFAULT_SETTINGS, loadout, random);
function resolveUpgrades(run: RunProgress): void {
  let choices = 0;
  while (run.phase === 'upgrade') {
    assert.ok(++choices < 1000, 'upgrade sequence should terminate');
    assert.equal(run.chooseUpgrade(run.snapshot().upgrades[0].id), true);
  }
}
function fundedShop(random = () => 0, loadout: readonly EquippedWeapon[] = DEFAULT_LOADOUT): RunProgress {
  const run = create(random, loadout);
  run.collect(500);
  run.finishWave();
  resolveUpgrades(run);
  assert.equal(run.phase, 'shop');
  return run;
}

test('a new run owns independent attributes and starts with one level-one weapon', () => {
  const base = { ...DEFAULT_SETTINGS };
  const loadout = DEFAULT_LOADOUT.map(entry => ({ ...entry }));
  const run = new RunProgress(base, loadout, () => 0);
  base.attackPower = 0;
  loadout[0]!.level = 5;
  const snapshot = run.snapshot();
  assert.equal(snapshot.phase, 'combat');
  assert.equal(snapshot.wave, 1);
  assert.equal(snapshot.totalWaves, 20);
  assert.equal(snapshot.level, 1);
  assert.equal(snapshot.materials, 0);
  assert.equal(snapshot.pendingUpgrades, 0);
  assert.deepEqual(snapshot.attributes, composeRunAttributes(DEFAULT_SETTINGS));
  assert.deepEqual(run.getLoadout(), createStartingLoadout(DEFAULT_LOADOUT));
  assert.equal(run.phase, 'combat');
  assert.equal(run.waveDuration, 20);
});

test('collecting crosses several level thresholds without interrupting the combat phase', () => {
  const run = create();
  assert.equal(nextLevelXp(1), 20);
  assert.equal(nextLevelXp(2), 37);
  assert.equal(nextLevelXp(3), 58);
  run.collect(20 + 37 + 58 + 7);
  const result = run.snapshot();
  assert.equal(result.level, 4);
  assert.equal(result.xp, 7);
  assert.equal(result.nextLevelXp, 83);
  assert.equal(result.pendingUpgrades, 3);
  assert.equal(result.materials, 122);
  assert.equal(result.phase, 'combat');
  assert.deepEqual(result.upgrades, []);
});

test('malformed, fractional and nonpositive collection values have no effect', () => {
  const run = create();
  for (const value of [NaN, Infinity, -Infinity, 0, -1, 0.5, 1.5, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER + 1]) run.collect(value);
  assert.equal(run.snapshot().materials, 0);
  assert.equal(run.snapshot().xp, 0);
  run.collect(1);
  assert.equal(run.snapshot().materials, 1);
});

test('large finite rewards preserve their full value across many experience thresholds', () => {
  const run = create();
  run.collect(1_000_001);
  const result = run.snapshot();
  let spent = 0;
  for (let level = 1; level < result.level; level++) spent += nextLevelXp(level);
  assert.equal(result.materials, 1_000_001);
  assert.equal(spent + result.xp, 1_000_001);
  assert.equal(result.pendingUpgrades, result.level - 1);
});

test('wave duration increases to sixty seconds and snapshots contain bounded remaining time', () => {
  assert.equal(waveDuration(1), 20);
  assert.equal(waveDuration(2), 23);
  assert.equal(waveDuration(14), 59);
  assert.equal(waveDuration(15), 60);
  assert.equal(waveDuration(20), 60);
  const run = create();
  assert.equal(run.snapshot().waveRemaining, 20);
  assert.equal(run.snapshot(3.25).waveRemaining, 3.25);
  assert.equal(run.snapshot(-1).waveRemaining, 0);
  assert.equal(run.snapshot(100).waveRemaining, 20);
  assert.equal(run.snapshot(NaN).waveRemaining, 20);
  run.finishWave();
  assert.equal(run.snapshot().waveRemaining, 0);
});

test('harvesting pays both materials and XP once, then compounds for the next wave', () => {
  const run = create();
  assert.equal(run.getAttributes().harvesting, 5);
  assert.equal(run.finishWave(), true);
  assert.equal(run.snapshot().materials, 5);
  assert.equal(run.snapshot().xp, 5);
  assert.equal(run.getAttributes().harvesting, 6);
  assert.equal(run.finishWave(), false);
  assert.equal(run.snapshot().materials, 5);
  run.nextWave();
  run.finishWave();
  assert.equal(run.snapshot().materials, 11);
  assert.equal(run.snapshot().xp, 11);
  assert.equal(run.getAttributes().harvesting, 7);
});

test('harvesting itself can trigger an upgrade before entering the shop', () => {
  const run = create();
  run.collect(15);
  assert.equal(run.snapshot().pendingUpgrades, 0);
  run.finishWave();
  assert.equal(run.phase, 'upgrade');
  assert.equal(run.snapshot().level, 2);
  assert.equal(run.snapshot().pendingUpgrades, 1);
  assert.equal(run.nextWave(), false);
});

test('upgrades offer four distinct attributes and consume one pending choice at a time', () => {
  const run = create();
  run.collect(57);
  run.finishWave();
  const before = run.snapshot();
  assert.equal(before.phase, 'upgrade');
  assert.equal(before.upgrades.length, 4);
  assert.equal(new Set(before.upgrades.flatMap(upgrade => Object.keys(upgrade.bonuses))).size, 4);
  const chosen = before.upgrades[0];
  assert.equal(chosen.bonuses.attackPower, 10);
  assert.equal(run.chooseUpgrade(chosen.id), true);
  assert.equal(run.getAttributes().attackPower, 110);
  assert.equal(run.snapshot().pendingUpgrades, 1);
  assert.equal(run.snapshot().materials, before.materials);
  assert.equal(run.chooseUpgrade(chosen.id), false, 'double clicking a stale choice cannot spend the next level');
  assert.equal(run.snapshot().pendingUpgrades, 1);
  resolveUpgrades(run);
  assert.equal(run.phase, 'shop');
  assert.equal(run.snapshot().pendingUpgrades, 0);
  assert.deepEqual(run.snapshot().upgrades, []);
});

test('upgrade rerolls charge the displayed escalating price without consuming a level', () => {
  const run = create();
  run.collect(15);
  run.finishWave();
  const old = run.snapshot();
  assert.equal(old.upgradeRerollCost, 6);
  assert.equal(run.rerollUpgrades(), true);
  assert.equal(run.snapshot().materials, 14);
  assert.equal(run.snapshot().upgradeRerollCost, 9);
  assert.equal(run.snapshot().pendingUpgrades, 1);
  assert.equal(run.chooseUpgrade(old.upgrades[0].id), false);
  assert.equal(run.rerollUpgrades(), true);
  assert.equal(run.snapshot().materials, 5);
  assert.equal(run.snapshot().upgradeRerollCost, 12);
  const ids = run.snapshot().upgrades.map(upgrade => upgrade.id);
  assert.equal(run.rerollUpgrades(), false);
  assert.equal(run.snapshot().materials, 5);
  assert.deepEqual(run.snapshot().upgrades.map(upgrade => upgrade.id), ids);
});

test('maximum critical chance is excluded from both initial upgrade choices and rerolls', () => {
  const run = new RunProgress({ ...DEFAULT_SETTINGS, critChance: 100 }, DEFAULT_LOADOUT, () => 0.15);
  run.collect(20); run.finishWave();
  assert.equal(run.snapshot().upgrades.length, 4);
  assert.ok(run.snapshot().upgrades.every(offer => offer.bonuses.critChance === undefined));
  assert.equal(run.rerollUpgrades(), true);
  assert.ok(run.snapshot().upgrades.every(offer => offer.bonuses.critChance === undefined));
  assert.equal(run.getAttributes().critChance, 100);
});

test('upgrades near the cap advertise and apply only their remaining effective increase', () => {
  const run = new RunProgress({ ...DEFAULT_SETTINGS, critChance: 99 }, DEFAULT_LOADOUT, () => 0.15);
  run.collect(57); run.finishWave();
  const offer = run.snapshot().upgrades.find(offer => offer.bonuses.critChance !== undefined)!;
  assert.ok(offer);
  assert.equal(offer.bonuses.critChance, 1);
  assert.equal(offer.description, '+1% 暴击率');
  assert.equal(run.chooseUpgrade(offer.id), true);
  assert.equal(run.getAttributes().critChance, 100);
  assert.equal(run.snapshot().pendingUpgrades, 1);
  assert.ok(run.snapshot().upgrades.every(offer => offer.bonuses.critChance === undefined));
});

// Extremal fixtures exercise cap behavior without hundreds of unrelated shop purchases.
const maxBonuses = (): Partial<RunAttributes> => Object.fromEntries(
  Object.entries(RUN_ATTRIBUTE_LIMITS).map(([attribute, range]) => [attribute, range.max]),
);

test('when fewer than four attributes can improve, choices contain only useful attributes', () => {
  const run = create();
  Object.assign(run, { bonuses: { ...maxBonuses(), attackPower: 899, critChance: 74 } });
  run.collect(20); run.finishWave();
  const choices = run.snapshot().upgrades;
  assert.equal(choices.length, 2);
  assert.deepEqual(new Set(choices.flatMap(offer => Object.keys(offer.bonuses))), new Set(['attackPower', 'critChance']));
  assert.ok(choices.every(offer => Object.values(offer.bonuses)[0] === 1));
});

test('fully capped characters turn all remaining level choices into money without granting XP', () => {
  const run = create();
  Object.assign(run, { bonuses: maxBonuses() });
  run.collect(20);
  // Harvesting is capped at 500 and independently awards XP before conversion.
  let expectedLevel = 1, expectedXp = 520;
  while (expectedXp >= nextLevelXp(expectedLevel)) expectedXp -= nextLevelXp(expectedLevel++);
  run.finishWave();
  const result = run.snapshot();
  assert.equal(result.phase, 'shop');
  assert.equal(result.level, expectedLevel);
  assert.equal(result.xp, expectedXp);
  assert.equal(result.materials, 520 + (expectedLevel - 1) * 25);
  assert.equal(result.pendingUpgrades, 0);
  assert.deepEqual(result.upgrades, []);
  assert.match(result.message, /属性已全部满级/);
  assert.match(result.message, /升级转换为/);
});

test('choosing the last useful attribute converts the other pending choices and permits next wave', () => {
  const run = create();
  Object.assign(run, { bonuses: { ...maxBonuses(), critChance: 74 } });
  run.collect(20); run.finishWave();
  const before = run.snapshot();
  assert.equal(before.upgrades.length, 1);
  assert.equal(run.chooseUpgrade(before.upgrades[0].id), true);
  const after = run.snapshot();
  assert.equal(after.phase, 'shop');
  assert.equal(after.materials, before.materials + (before.pendingUpgrades - 1) * 25);
  assert.equal(after.xp, before.xp);
  assert.equal(after.level, before.level);
  assert.equal(after.pendingUpgrades, 0);
  assert.equal(run.nextWave(), true);
});

test('full-attribute conversion respects the wallet cap and reports actual credited money', () => {
  const run = create();
  Object.assign(run, { bonuses: maxBonuses(), materials: Number.MAX_SAFE_INTEGER - 5 });
  run.collect(20); run.finishWave();
  assert.equal(run.snapshot().materials, Number.MAX_SAFE_INTEGER);
  assert.equal(run.snapshot().pendingUpgrades, 0);
  assert.equal(run.phase, 'shop');
  assert.match(run.snapshot().message, /转换为 0 加班费/);
});

test('a clamped caffeine regeneration penalty cannot consume a later regeneration upgrade', () => {
  const run = fundedShop(() => 0.35);
  const caffeine = run.snapshot().shop.find(offer => offer.itemId === 'caffeine')!;
  assert.ok(caffeine);
  assert.equal(run.getAttributes().hpRegen, 0);
  assert.equal(run.buy(caffeine.id), true);
  assert.equal(run.getAttributes().hpRegen, 0);
  run.nextWave(); run.collect(1000); run.finishWave();
  const regeneration = run.snapshot().upgrades.find(offer => offer.bonuses.hpRegen !== undefined)!;
  assert.ok(regeneration);
  assert.equal(regeneration.bonuses.hpRegen, 1);
  assert.equal(run.chooseUpgrade(regeneration.id), true);
  assert.equal(run.getAttributes().hpRegen, 1);
});

test('clamped gains have no hidden overflow that can absorb a later item penalty', () => {
  const run = create();
  // Apply extreme stacked effects through the same path used by upgrades and items.
  const effects = run as unknown as { addBonuses(bonuses: Partial<RunAttributes>): void };
  effects.addBonuses({ critChance: 100, attackPower: 2000, hpRegen: -10 });
  assert.equal(run.getAttributes().critChance, 100);
  assert.equal(run.getAttributes().attackPower, 1000);
  assert.equal(run.getAttributes().hpRegen, 0);
  effects.addBonuses({ critChance: -1, attackPower: -4, hpRegen: 1 });
  assert.equal(run.getAttributes().critChance, 99);
  assert.equal(run.getAttributes().attackPower, 996);
  assert.equal(run.getAttributes().hpRegen, 1);
});

test('combat disallows every shop and upgrade action and losing permanently freezes progression', () => {
  const run = create();
  assert.equal(run.nextWave(), false);
  assert.equal(run.buy('anything', 0), false);
  assert.equal(run.chooseUpgrade('anything'), false);
  assert.equal(run.rerollShop(), false);
  assert.equal(run.rerollUpgrades(), false);
  assert.equal(run.toggleLock('anything'), false);
  run.collect(3);
  run.endRun();
  assert.equal(run.phase, 'lost');
  const before = run.snapshot();
  run.collect(20);
  run.endRun();
  assert.equal(run.finishWave(), false);
  assert.equal(run.nextWave(), false);
  assert.equal(run.rerollShop(), false);
  assert.equal(run.rerollUpgrades(), false);
  assert.deepEqual(run.snapshot(), before);
});

test('intermission ignores collection and endRun while allowing only its current stage actions', () => {
  const run = create();
  run.collect(20);
  run.finishWave();
  const before = run.snapshot();
  run.collect(10);
  run.endRun();
  assert.equal(run.snapshot().materials, before.materials);
  assert.equal(run.phase, 'upgrade');
  assert.equal(run.buy('anything', 0), false);
  assert.equal(run.toggleLock('anything'), false);
  assert.equal(run.rerollShop(), false);
  resolveUpgrades(run);
  run.endRun();
  assert.equal(run.phase, 'shop');
  assert.equal(run.chooseUpgrade(before.upgrades[0].id), false);
  assert.equal(run.rerollUpgrades(), false);
});

test('an unaffordable shop purchase leaves the balance, offer, and equipment untouched', () => {
  const run = create();
  run.finishWave();
  const before = run.snapshot();
  const weapon = before.shop.find(offer => offer.kind === 'weapon')!;
  assert.ok(weapon.price > before.materials);
  assert.equal(run.buy(weapon.id, 0), false);
  assert.deepEqual(run.snapshot(), before);
  assert.deepEqual(run.getLoadout(), createStartingLoadout(DEFAULT_LOADOUT));
});

test('weapon purchase requires a valid hand and matching weapon and level combine exactly once', () => {
  const run = fundedShop();
  const before = run.snapshot();
  const weapon = before.shop.find(offer => offer.kind === 'weapon')!;
  assert.equal(weapon.weapon, 'stapler');
  assert.equal(weapon.level, 1);
  for (const slot of [-1, 6, 0.5, NaN]) assert.equal(run.buy(weapon.id, slot), false);
  assert.equal(run.snapshot().materials, before.materials);
  assert.equal(run.buy(weapon.id, 0), true);
  assert.deepEqual(run.getLoadout()[0], { weapon: 'stapler', level: 2 });
  assert.equal(run.snapshot().materials, before.materials - weapon.price);
  assert.equal(run.snapshot().shop.length, 3);
  assert.equal(run.buy(weapon.id, 0), false);
  assert.equal(run.snapshot().materials, before.materials - weapon.price);
});

test('a bought copy can fill an empty hand without replacing the first weapon', () => {
  const run = fundedShop();
  const before = run.snapshot();
  const offer = before.shop[0];
  assert.equal(run.getLoadout()[1], null);
  assert.equal(run.buy(offer.id, 1), true);
  assert.deepEqual(run.getLoadout()[1], { weapon: 'stapler', level: 1 });
  assert.equal(run.snapshot().materials, before.materials - offer.price);
  assert.deepEqual(run.getLoadout().slice(2), Array(4).fill(null));
});

test('a different weapon or a different level in the target hand rejects a purchase atomically', () => {
  const run = fundedShop();
  const first = run.snapshot().shop[0];
  assert.equal(run.buy(first.id, 0), true);
  const offer = run.snapshot().shop[0];
  const before = run.snapshot(), gear = run.getLoadout();
  assert.equal(offer.level, 1);
  assert.equal(run.getLoadout()[0]!.level, 2);
  assert.equal(run.buy(offer.id, 0), false);
  assert.deepEqual(run.snapshot(), before);
  assert.deepEqual(run.getLoadout(), gear);
  Object.assign(run, { loadout: [{ weapon: 'laser', level: 1 }, null, null, null, null, null] });
  assert.equal(run.buy(offer.id, 0), false);
  assert.equal(run.getLoadout()[0]!.weapon, 'laser');
});

test('merchant biases matching merge levels and sequential merges stop at five', () => {
  const run = fundedShop();
  for (const target of [2, 3, 4, 5]) {
    const offer = run.snapshot().shop.find(offer => offer.kind === 'weapon' && offer.weapon === 'stapler' && offer.level === target - 1)!;
    assert.ok(offer);
    assert.equal(run.buy(offer.id, 0), true);
    assert.equal(run.getLoadout()[0]!.level, target);
    if (target < 5) assert.equal(run.rerollShop(), true);
  }
  assert.equal(run.rerollShop(), true);
  assert.ok(run.snapshot().shop.every(offer => offer.weapon !== 'stapler' || offer.level === 1), 'maxed hands no longer attract merge-level offers');
});

test('matching legendary weapons cannot be bought as a no-op or combined', () => {
  const run = create(() => 1);
  Object.assign(run, { currentWave: 13, loadout: Array.from({ length: 6 }, () => ({ weapon: 'cable', level: 5 })) });
  run.collect(1000); run.finishWave(); resolveUpgrades(run);
  const before = run.snapshot();
  const offer = before.shop.find(offer => offer.weapon === 'cable' && offer.level === 5)!;
  assert.ok(offer);
  assert.equal(run.buy(offer.id, 0), false);
  assert.equal(run.buy(offer.id), false);
  assert.equal(run.combine(0, 1), false);
  assert.deepEqual(run.snapshot(), before);
  assert.equal(run.getLoadout()[0]!.level, 5);
});

test('partial locks retain their identity and quoted price while rerolls replace unlocked stock', () => {
  const run = fundedShop();
  const initial = run.snapshot();
  const locked = initial.shop[0];
  run.toggleLock(locked.id);
  assert.equal(run.rerollShop(), true);
  const refreshed = run.snapshot();
  assert.equal(refreshed.materials, initial.materials - initial.shopRerollCost);
  assert.equal(refreshed.shopRerollCost, initial.shopRerollCost + 5);
  assert.equal(refreshed.shop.length, 4);
  assert.deepEqual(refreshed.shop.find(offer => offer.id === locked.id), { ...locked, locked: true });
  assert.ok(initial.shop.slice(1).every(old => refreshed.shop.every(offer => offer.id !== old.id)));
  assert.equal(run.buy(initial.shop[1].id, 0), false);
  assert.equal(run.toggleLock(initial.shop[1].id), false);
});

test('locking all four slots makes reroll a free no-op and retains stock across waves', () => {
  const run = fundedShop();
  for (const offer of run.snapshot().shop) run.toggleLock(offer.id);
  const locked = run.snapshot();
  assert.equal(locked.shopRerollCost, 0);
  assert.equal(run.rerollShop(), false);
  assert.deepEqual(run.snapshot(), locked);
  assert.equal(run.nextWave(), true);
  assert.equal(run.nextWave(), false);
  run.finishWave(); resolveUpgrades(run);
  assert.deepEqual(run.snapshot().shop, locked.shop);
  assert.equal(run.snapshot().materials, locked.materials + 6);
  run.toggleLock(locked.shop[0].id);
  assert.equal(run.snapshot().shopRerollCost, 12);
});

test('each new wave resets escalating refresh fees and preserves only locked stock', () => {
  const run = fundedShop();
  const locked = run.snapshot().shop[0];
  run.toggleLock(locked.id);
  run.rerollShop(); run.rerollShop();
  assert.equal(run.snapshot().shopRerollCost, 20);
  const prior = run.snapshot();
  run.nextWave();
  run.finishWave(); resolveUpgrades(run);
  const next = run.snapshot();
  assert.equal(next.shopRerollCost, 12);
  assert.equal(next.upgradeRerollCost, 7);
  assert.deepEqual(next.shop.find(offer => offer.id === locked.id), { ...locked, locked: true });
  assert.ok(prior.shop.filter(offer => !offer.locked).every(old => next.shop.every(offer => offer.id !== old.id)));
  assert.ok(next.shop.filter(offer => !offer.locked).every(offer => offer.price > locked.price));
});

test('buying an item stacks bonuses, charges once, and prunes duplicate offers at its cap', () => {
  const run = fundedShop(() => 0.5);
  const before = run.getAttributes();
  const item = ITEMS.find(item => item.id === 'lucky-pass')!;
  for (let i = 0; i < item.maxStacks; i++) {
    let offer = run.snapshot().shop.find(offer => offer.itemId === item.id);
    if (!offer) { assert.equal(run.rerollShop(), true); offer = run.snapshot().shop.find(offer => offer.itemId === item.id); }
    assert.ok(offer);
    const money = run.snapshot().materials;
    assert.equal(run.buy(offer.id), true);
    assert.equal(run.snapshot().materials, money - offer.price);
    assert.equal(run.buy(offer.id), false);
  }
  assert.equal(run.getAttributes().luck, before.luck + 48);
  assert.equal(run.getAttributes().attackPower, before.attackPower - 16);
  assert.equal(run.snapshot().inventory.find(entry => entry.id === item.id)?.count, 4);
  assert.ok(run.snapshot().shop.every(offer => offer.itemId !== item.id));
  assert.equal(run.rerollShop(), true);
  assert.ok(run.snapshot().shop.every(offer => offer.itemId !== item.id));
});

test('a purchased weapon leaves space that reroll fills while retaining locked items', () => {
  const run = fundedShop(() => 0.5);
  const stock = run.snapshot().shop;
  assert.equal(stock.filter(offer => offer.kind === 'weapon').length, 2);
  for (const offer of stock.filter(offer => offer.kind === 'item')) run.toggleLock(offer.id);
  const weapon = stock.find(offer => offer.kind === 'weapon')!;
  assert.equal(run.buy(weapon.id, 0), true);
  assert.equal(run.snapshot().shop.length, 3);
  assert.ok(run.snapshot().shopRerollCost > 0);
  assert.equal(run.rerollShop(), true);
  assert.equal(run.snapshot().shop.length, 4);
  assert.equal(run.snapshot().shop.filter(offer => offer.kind === 'weapon').length, 2);
});

test('luck raises item rarity under the same random rolls without changing locked prices', () => {
  let roll = 0.5;
  const lucky = fundedShop(() => roll);
  for (const offer of lucky.snapshot().shop.filter(offer => offer.itemId === 'lucky-pass')) lucky.buy(offer.id);
  assert.equal(lucky.getAttributes().luck, 24);
  const baseline = fundedShop(() => roll);
  roll = 0.56;
  lucky.rerollShop(); baseline.rerollShop();
  assert.ok(lucky.snapshot().shop.filter(offer => offer.kind === 'item').every(offer => offer.tier === 2));
  assert.ok(baseline.snapshot().shop.filter(offer => offer.kind === 'item').every(offer => offer.tier === 1));
});

test('all twenty waves lead to a terminal win and cannot enter a twenty-first wave', () => {
  const run = create();
  for (let wave = 1; wave <= 20; wave++) {
    assert.equal(run.wave, wave);
    assert.equal(run.phase, 'combat');
    if (isBossWave(wave)) {
      assert.equal(run.finishWave(), false);
      assert.equal(run.defeatBoss(), true);
    }
    assert.equal(run.finishWave(), true);
    if (isBossWave(wave)) assert.equal(run.chooseBossReward(run.snapshot().bossRewards[0].id), true);
    if (wave < 20) {
      resolveUpgrades(run);
      assert.equal(run.phase, 'shop');
      assert.equal(run.nextWave(), true);
    }
  }
  assert.equal(run.phase, 'won');
  const win = run.snapshot();
  run.collect(100);
  run.endRun();
  assert.equal(run.finishWave(), false);
  assert.equal(run.nextWave(), false);
  assert.equal(run.rerollShop(), false);
  assert.equal(run.chooseUpgrade('old'), false);
  assert.deepEqual(run.snapshot(), win);
});

test('a new run has no previous currency, purchases, bonuses, locks, or weapon upgrades', () => {
  const first = fundedShop(() => 0.5);
  const stock = first.snapshot().shop;
  const weapon = stock.find(offer => offer.kind === 'weapon')!;
  first.buy(weapon.id, 0);
  first.buy(stock.find(offer => offer.kind === 'item')!.id);
  first.toggleLock(first.snapshot().shop[0].id);
  const second = create();
  assert.equal(second.snapshot().materials, 0);
  assert.deepEqual(second.snapshot().inventory, []);
  assert.deepEqual(second.snapshot().shop, []);
  assert.deepEqual(second.getAttributes(), composeRunAttributes(DEFAULT_SETTINGS));
  assert.deepEqual(second.getLoadout(), createStartingLoadout(DEFAULT_LOADOUT));
});

test('snapshots and equipment clones cannot mutate live progression', () => {
  const run = fundedShop(() => 0.5);
  run.buy(run.snapshot().shop.find(offer => offer.kind === 'item')!.id);
  const before = run.snapshot();
  const exposed = run.snapshot();
  exposed.attributes.attackPower = -100;
  exposed.shop[0].price = 0;
  exposed.inventory[0].count = 999;
  exposed.shop.pop();
  const loadout = run.getLoadout();
  loadout[0]!.level = 5;
  assert.deepEqual(run.snapshot(), before);
  assert.deepEqual(run.getLoadout(), createStartingLoadout(DEFAULT_LOADOUT));
  run.nextWave(); run.collect(1000); run.finishWave();
  const upgradeBefore = run.snapshot();
  run.snapshot().upgrades[0].bonuses.attackPower = 999;
  assert.deepEqual(run.snapshot(), upgradeBefore);
});

test('random boundaries remain safe and every refill includes a valid weapon', () => {
  for (const value of [NaN, Infinity, -Infinity, -2, 0, 0.5, 0.99999999, 1, 2]) {
    const run = fundedShop(() => value);
    const shop = run.snapshot().shop;
    assert.equal(shop.length, 4);
    assert.equal(new Set(shop.map(offer => offer.id)).size, 4);
    assert.ok(shop.some(offer => offer.kind === 'weapon'));
    assert.ok(shop.every(offer => Number.isInteger(offer.price) && offer.price > 0 && offer.tier >= 1 && offer.tier <= 5));
    assert.equal(run.rerollShop(), true);
    assert.equal(run.snapshot().shop.length, 4);
    assert.ok(run.snapshot().shop.some(offer => offer.kind === 'weapon'));
  }
});

test('the original office catalog covers every attribute through both items and level choices', () => {
  assert.equal(ITEMS.length, 16);
  assert.equal(new Set(ITEMS.map(item => item.id)).size, ITEMS.length);
  const attributes = Object.keys(composeRunAttributes(DEFAULT_SETTINGS));
  const itemAttributes = new Set(ITEMS.flatMap(item => Object.keys(item.bonuses)));
  assert.equal(new Set(UPGRADES.map(upgrade => upgrade.id)).size, attributes.length);
  for (const attribute of attributes) {
    assert.ok(itemAttributes.has(attribute), attribute);
    assert.ok(UPGRADES.some(upgrade => upgrade.id === attribute), attribute);
  }
  for (const item of ITEMS) {
    assert.ok(Number.isInteger(item.maxStacks) && item.maxStacks > 0);
    assert.ok(item.price > 0);
    assert.ok(Object.values(item.bonuses).every(Number.isFinite));
  }
});

test('each opening shop has two weapon choices and the first offers an affordable level-one weapon', () => {
  for (const random of [() => 0, () => 0.5, () => 1]) {
    const run = create(random);
    run.collect(15); run.finishWave(); resolveUpgrades(run);
    const first = run.snapshot();
    assert.ok(first.shop.filter(offer => offer.kind === 'weapon').length >= 2);
    const affordable = first.shop.find(offer => offer.kind === 'weapon' && offer.level === 1 && offer.price <= 15)!;
    assert.ok(affordable);
    assert.equal(run.buy(affordable.id), true);
    assert.equal(run.getLoadout().filter(Boolean).length, 2);
    assert.equal(run.getLoadout()[0]!.level, 1, 'default purchase fills an empty hand before merging');
    run.nextWave(); run.finishWave(); resolveUpgrades(run);
    assert.ok(run.snapshot().shop.filter(offer => offer.kind === 'weapon').length >= 2);
  }
});

test('a full rack automatically merges a matching shop copy and never replaces unrelated equipment', () => {
  const run = fundedShop();
  for (let hand = 1; hand < 6; hand++) {
    let offer = run.snapshot().shop.find(offer => offer.kind === 'weapon')!;
    if (!offer) { run.rerollShop(); offer = run.snapshot().shop.find(offer => offer.kind === 'weapon')!; }
    assert.equal(run.buy(offer.id), true);
    assert.equal(run.getLoadout()[hand]!.level, 1);
  }
  assert.equal(run.getLoadout().filter(Boolean).length, 6);
  run.rerollShop();
  const offer = run.snapshot().shop.find(offer => offer.kind === 'weapon')!;
  assert.equal(run.buy(offer.id), true);
  assert.equal(run.getLoadout()[0]!.level, 2);
  assert.ok(run.getLoadout().slice(1).every(weapon => weapon!.level === 1));
});

test('combining two equipped copies consumes exactly one hand and retains currency', () => {
  const run = fundedShop();
  assert.equal(run.buy(run.snapshot().shop[0].id), true);
  const money = run.snapshot().materials;
  assert.equal(run.combine(0, 1), true);
  assert.deepEqual(run.getLoadout(), [{ weapon: 'stapler', level: 2 }, null, null, null, null, null]);
  assert.equal(run.snapshot().materials, money);
  const before = run.snapshot();
  for (const [first, second] of [[0, 1], [0, 0], [-1, 0], [0, 6], [0.5, 1], [NaN, 1]]) assert.equal(run.combine(first, second), false);
  assert.deepEqual(run.snapshot(), before);
});

test('manual merging rejects unequal types and levels, and every equipment action is shop-only', () => {
  const run = fundedShop();
  Object.assign(run, { loadout: [{ weapon: 'stapler', level: 1 }, { weapon: 'stapler', level: 2 }, { weapon: 'laser', level: 1 }, null, null, null] });
  const gear = run.getLoadout();
  assert.equal(run.combine(0, 1), false);
  assert.equal(run.combine(0, 2), false);
  assert.deepEqual(run.getLoadout(), gear);
  run.nextWave();
  const combat = run.snapshot();
  assert.equal(run.sell(1), false);
  assert.equal(run.combine(0, 1), false);
  assert.deepEqual(run.snapshot(), combat);
  run.endRun();
  assert.equal(run.sell(1), false);
});

test('recycling pays twenty-five percent once, preserves XP, and cannot sell the final weapon', () => {
  const run = fundedShop();
  assert.equal(run.sell(0), false);
  assert.equal(run.buy(run.snapshot().shop[0].id), true);
  const before = run.snapshot();
  const value = weaponRecycleValue(run.wave, 1);
  assert.equal(value, Math.floor(weaponShopPrice(run.wave, 1) * 0.25));
  assert.equal(run.sell(1), true);
  assert.equal(run.snapshot().materials, before.materials + value);
  assert.equal(run.snapshot().xp, before.xp);
  assert.equal(run.getLoadout()[1], null);
  const after = run.snapshot();
  assert.equal(run.sell(1), false);
  assert.equal(run.sell(0), false);
  assert.deepEqual(run.snapshot(), after);
});

function reachWave(target: number): RunProgress {
  const run = create();
  while (run.wave < target) {
    if (isBossWave(run.wave)) assert.equal(run.defeatBoss(), true);
    assert.equal(run.finishWave(), true);
    if (run.phase === 'reward') assert.equal(run.chooseBossReward(run.snapshot().bossRewards[0].id), true);
    resolveUpgrades(run);
    assert.equal(run.nextWave(), true);
  }
  return run;
}

test('boss waves remain combat when the timer expires until their boss has been defeated', () => {
  for (const wave of [10, 20]) {
    const run = reachWave(wave);
    const before = run.snapshot(0);
    assert.equal(run.bossDefeated, false);
    assert.equal(run.finishWave(), false);
    assert.equal(run.phase, 'combat');
    assert.equal(run.nextWave(), false);
    assert.deepEqual(run.snapshot(0), before);
    assert.equal(run.defeatBoss(), true);
    assert.equal(run.bossDefeated, true);
    assert.equal(run.finishWave(), true);
    assert.equal(run.phase, 'reward');
    assert.equal(run.snapshot().bossRewards.length, 3);
    assert.ok(run.snapshot().bossRewards.every(reward => reward.tier === (wave === 10 ? 4 : 5)));
  }
});

test('boss kill currencies and XP pay exactly once and cannot be claimed in ordinary waves', () => {
  assert.equal(create().defeatBoss(), false);
  for (const wave of [10, 20]) {
    const run = reachWave(wave), before = run.snapshot();
    assert.equal(run.defeatBoss(), true);
    const after = run.snapshot();
    assert.equal(after.materials - before.materials, wave === 10 ? 200 : 600);
    const totalXp = (snapshot: typeof after) => {
      let value = snapshot.xp;
      for (let level = 1; level < snapshot.level; level++) value += nextLevelXp(level);
      return value;
    };
    assert.equal(totalXp(after) - totalXp(before), wave === 10 ? 80 : 200);
    assert.equal(after.bossTrophies.length, wave === 10 ? 1 : 2);
    assert.equal(run.defeatBoss(), false);
    assert.deepEqual(run.snapshot(), after);
    assert.equal(run.finishWave(), true);
    const reward = run.snapshot();
    assert.equal(run.finishWave(), false);
    assert.equal(run.defeatBoss(), false);
    assert.deepEqual(run.snapshot(), reward);
  }
});

test('mini-boss reward offers a single permanent build choice before upgrades and shopping', () => {
  const run = reachWave(10);
  run.defeatBoss(); run.finishWave();
  const before = run.snapshot();
  const reward = before.bossRewards[1];
  assert.equal(run.chooseUpgrade('anything'), false);
  assert.equal(run.nextWave(), false);
  assert.equal(run.rerollShop(), false);
  assert.equal(run.rerollUpgrades(), false);
  assert.equal(run.sell(0), false);
  assert.equal(run.chooseBossReward('invalid'), false);
  assert.deepEqual(run.snapshot(), before);
  assert.equal(run.chooseBossReward(reward.id), true);
  assert.equal(run.getAttributes().maxHp, before.attributes.maxHp + 35);
  assert.equal(run.getAttributes().armor, before.attributes.armor + 5);
  assert.equal(run.getAttributes().hpRegen, before.attributes.hpRegen + 4);
  assert.equal(run.snapshot().inventory.find(item => item.id === reward.id)?.name, reward.name);
  assert.deepEqual(run.snapshot().bossRewards, []);
  const chosen = run.snapshot();
  assert.equal(run.chooseBossReward(reward.id), false);
  assert.deepEqual(run.snapshot(), chosen);
  resolveUpgrades(run);
  assert.equal(run.phase, 'shop');
  run.nextWave();
  assert.equal(run.bossDefeated, false);
  assert.equal(run.snapshot().bossTrophies.length, 1);
});

test('final-boss reward must be chosen to complete a run and survives in the victory inventory', () => {
  const run = reachWave(20);
  run.defeatBoss(); run.finishWave();
  assert.equal(run.phase, 'reward');
  const before = run.snapshot(), reward = before.bossRewards[2];
  assert.equal(run.chooseBossReward(reward.id), true);
  const win = run.snapshot();
  assert.equal(win.phase, 'won');
  assert.equal(win.attributes.meleeDamage, before.attributes.meleeDamage + 12);
  assert.equal(win.attributes.rangedDamage, before.attributes.rangedDamage + 8);
  assert.equal(win.attributes.elementalDamage, before.attributes.elementalDamage + 12);
  assert.equal(win.inventory.find(item => item.id === reward.id)?.tier, 5);
  assert.equal(win.bossTrophies.length, 2);
  assert.equal(win.pendingUpgrades, 0);
  assert.equal(run.chooseBossReward(reward.id), false);
  assert.equal(run.defeatBoss(), false);
  assert.equal(run.finishWave(), false);
  assert.equal(run.nextWave(), false);
  assert.equal(run.sell(0), false);
  assert.deepEqual(run.snapshot(), win);
});

test('boss rewards and trophy snapshots are cloned and a new run has no inherited trophies', () => {
  const run = reachWave(10);
  run.defeatBoss(); run.finishWave();
  const before = run.snapshot(), exposed = run.snapshot();
  exposed.bossRewards[0].bonuses.attackPower = 9999;
  exposed.bossTrophies[0].name = 'changed';
  exposed.bossRewards.pop();
  assert.deepEqual(run.snapshot(), before);
  const fresh = create();
  assert.equal(fresh.bossDefeated, false);
  assert.deepEqual(fresh.snapshot().bossRewards, []);
  assert.deepEqual(fresh.snapshot().bossTrophies, []);
});
