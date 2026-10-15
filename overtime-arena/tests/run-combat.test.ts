import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import type { RunAttributes, WeaponId } from '../src/shared.ts';

// Execute actual scene/model methods; replace rendering, audio, and browser input surfaces only.
const modules = new Map<string, { exports: any }>();
const visualModules = new Set(['textures', 'Feedback', 'PhotoHead', 'PlayerBody', 'avatar', 'BossTextures']);
let randomRoll = 0.5;
const fixedMath = Object.create(Math);
fixedMath.random = () => randomRoll;
const noop = () => {};
const documentStub = { getElementById: () => ({ focus: noop }), pointerLockElement: null };
const windowStub = { dispatchEvent: () => true, matchMedia: () => ({ matches: false }) };
class EventStub {
  type: string;
  init: unknown;
  constructor(type: string, init: unknown) { this.type = type; this.init = init; }
}
function loadSource(filename: string): any {
  const cached = modules.get(filename);
  if (cached) return cached.exports;
  const module = { exports: {} as any };
  modules.set(filename, module);
  const source = readFileSync(filename, 'utf8').replaceAll('import.meta.env.DEV', 'false');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } });
  const requireSource = (specifier: string) => {
    if (specifier === 'phaser') return { Scene: class {}, WEBGL: 1 };
    if (visualModules.has(specifier.split('/').at(-1)!.replace(/\.ts$/, ''))) return {};
    assert.ok(specifier.startsWith('.'), `Unexpected dependency: ${specifier}`);
    return loadSource(resolve(dirname(filename), specifier.endsWith('.ts') ? specifier : `${specifier}.ts`));
  };
  const evaluate = runInNewContext(`(function(require, module, exports) { ${outputText}\n})`, {
    Math: fixedMath, window: windowStub, document: documentStub, CustomEvent: EventStub,
    performance: { now: () => 1000 }, navigator: { getGamepads: () => [] },
  }, { filename });
  evaluate(requireSource, module, module.exports);
  return module.exports;
}
const { CombatScene } = loadSource(fileURLToPath(new URL('../src/game/CombatScene.ts', import.meta.url)));

function imageStub(): any {
  const image: any = new Proxy({ visible: true }, {
    get(target, key) {
      if (key in target) return target[key as keyof typeof target];
      return (...args: any[]) => {
        if (key === 'setVisible') target.visible = args[0];
        return image;
      };
    },
  });
  return image;
}
function setup(mode: 'steady' | 'dummy' = 'steady', start = true) {
  randomRoll = 0.5;
  const scene = new CombatScene();
  const hits: { amount: number; critical: boolean }[] = [];
  const feedback: any = new Proxy({
    damageText: (_x: number, _y: number, amount: number, critical: boolean) => hits.push({ amount, critical }),
  }, { get: (target, key) => target[key as keyof typeof target] ?? noop });
  scene.ready = true;
  scene.lastInputKind = 'touch';
  Object.assign(scene.settings, { mode, shake: 0, critChance: 0 });
  scene.game = { canvas: { classList: { remove: noop }, getBoundingClientRect: () => ({ width: 1120, height: 720 }) },
    loop: { actualFps: 60 }, renderer: { type: 1 } };
  scene.add = { image: imageStub };
  scene.guns = Array.from({ length: 6 }, imageStub);
  scene.body = { reset: noop, hurt: noop, attack: noop };
  scene.photoHead = { reset: noop, trigger: noop, setThreatNearby: noop };
  scene.feedback = feedback;
  scene.cameras = { main: { shake: noop, setBounds: noop, setScroll: noop } };
  scene.pointerLock = { state: 'idle', requests: 0, releases: 0,
    request() { this.requests++; this.state = 'pending'; },
    release() { this.releases++; this.state = 'idle'; } };
  scene.draw = noop;
  if (start) scene.start();
  return { scene, hits };
}
function bonuses(scene: any, values: Partial<RunAttributes>): void { scene.run.addBonuses(values); }
function emptyArena(scene: any): void {
  for (const enemy of scene.enemies) scene.deactivateEnemy(enemy);
  scene.spawnTimer = 999;
  scene.grid.rebuild(scene.enemies);
}
function reachShop(scene: any): void {
  scene.finishWave();
  let remaining = 100;
  while (scene.run.phase === 'upgrade' && remaining-- > 0) {
    scene.handleCommand({ type: 'run-upgrade', id: scene.run.snapshot().upgrades[0].id });
  }
  assert.equal(scene.run.phase, 'shop');
}
function settleBossCelebration(scene: any): void {
  for (let frame = 0; frame < 240 && scene.run.phase === 'combat'; frame++) scene.tick(1 / 120, { x: 0, y: 0 });
}
function advanceToWave(scene: any, target: number): void {
  while (scene.run.wave < target) {
    const boss = scene.enemies.find((enemy: any) => enemy.active && (enemy.kind === 'manager' || enemy.kind === 'director'));
    if (boss) {
      scene.damageEnemy(boss, 100000, 0, 0, false, scene.combatAttributes());
      settleBossCelebration(scene);
      scene.handleCommand({ type: 'run-boss-reward', id: scene.run.snapshot().bossRewards[0].id });
    }
    reachShop(scene);
    scene.handleCommand({ type: 'run-next' });
  }
}
function victim(scene: any, kind = 'runner', hp = 10000): any {
  emptyArena(scene);
  scene.spawnEnemy(kind, scene.player.x + 65, scene.player.y);
  const enemy = scene.enemies.find((entry: any) => entry.active);
  Object.assign(enemy, { hp, maxHp: hp, spawn: 0 });
  scene.grid.rebuild(scene.enemies);
  return enemy;
}
const close = (actual: number, expected: number): void => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('a run starts with one level-I weapon and five empty hands that neither fire nor appear later', () => {
  const { scene, hits } = setup('steady', false);
  scene.loadout = Array.from({ length: 6 }, () => ({ weapon: 'laser', level: 5 }));
  scene.start();
  assert.equal(scene.rack.filter((slot: any) => slot.equipped).length, 1);
  assert.equal(scene.rack[0].weapon, 'laser');
  assert.equal(scene.rack[0].level, 1);
  assert.equal(scene.guns[0].visible, true);
  assert.ok(scene.guns.slice(1).every((gun: any) => !gun.visible));
  const enemy = victim(scene);
  for (const slot of scene.rack.slice(1)) {
    Object.assign(slot, { cooldown: 0, targetId: enemy.id, angle: 0 });
    scene.fire(slot);
  }
  assert.equal(hits.length, 0);
  assert.equal(scene.bullets.filter((entry: any) => entry.active).length, 0);
  assert.equal(scene.specialShots.filter((entry: any) => entry.active).length, 0);
  scene.rack[0].cooldown = 999;
  for (let frame = 0; frame < 120; frame++) scene.tick(1 / 120, { x: 0, y: 0 });
  assert.equal(hits.length, 0);
  assert.equal(scene.rack.filter((slot: any) => slot.equipped).length, 1);
  reachShop(scene);
  scene.handleCommand({ type: 'run-next' });
  assert.equal(scene.rack.filter((slot: any) => slot.equipped).length, 1);
  assert.equal(scene.stats().weapons.filter((slot: any) => slot.equipped).length, 1);
});

test('wave settlement collects every remaining drop once before granting harvest and presenting choices', () => {
  const { scene } = setup();
  scene.spawnPickup(100, 100, 13);
  scene.spawnPickup(900, 600, 9);
  const before = scene.rack.map((slot: any) => ({ weapon: slot.weapon, level: slot.level, xp: slot.xp }));
  scene.finishWave();
  const snapshot = scene.run.snapshot();
  assert.equal(snapshot.materials, 27);
  assert.equal(snapshot.level, 2);
  assert.equal(snapshot.xp, 7);
  assert.equal(snapshot.phase, 'upgrade');
  assert.equal(scene.paused, true);
  assert.ok(scene.pointerLock.releases > 0);
  assert.ok(scene.pickups.every((drop: any) => !drop.active));
  assert.ok(scene.enemies.every((enemy: any) => !enemy.active));
  assert.deepEqual(scene.rack.map((slot: any) => ({ weapon: slot.weapon, level: slot.level, xp: slot.xp })), before);
  scene.finishWave();
  assert.equal(scene.run.snapshot().materials, 27, 'repeated settlement cannot duplicate rewards');
});

test('pending level choices block the next wave until all choices are taken', () => {
  const { scene } = setup();
  scene.run.collect(80);
  scene.finishWave();
  assert.equal(scene.run.phase, 'upgrade');
  assert.equal(scene.run.snapshot().pendingUpgrades, 2);
  scene.handleCommand({ type: 'run-next' });
  assert.equal(scene.run.wave, 1);
  assert.equal(scene.paused, true);
  scene.handleCommand({ type: 'run-upgrade', id: 'missing-choice' });
  assert.equal(scene.run.snapshot().pendingUpgrades, 2);
  for (let choice = 0; choice < 2; choice++) {
    scene.handleCommand({ type: 'run-upgrade', id: scene.run.snapshot().upgrades[0].id });
  }
  assert.equal(scene.run.phase, 'shop');
  assert.equal(scene.run.snapshot().pendingUpgrades, 0);
});

test('start, pause, direct resume, and late pointer-lock grants cannot resume combat behind the shop', () => {
  const { scene } = setup();
  reachShop(scene);
  const run = scene.run;
  const requests = scene.pointerLock.requests;
  for (const type of ['start', 'pause', 'start', 'pause']) {
    scene.handleCommand({ type });
    assert.equal(scene.paused, true);
    assert.equal(scene.run.phase, 'shop');
    assert.equal(scene.run, run);
  }
  scene.resumeControls();
  assert.equal(scene.paused, true);
  scene.pointerLock.state = 'locked';
  const releases = scene.pointerLock.releases;
  scene.onPointerLockState('locked');
  assert.equal(scene.paused, true);
  assert.ok(scene.pointerLock.releases > releases);
  assert.equal(scene.pointerLock.requests, requests);
});

test('starting the next wave restores effective max health and keeps earned character and weapon progress', () => {
  const { scene } = setup();
  bonuses(scene, { maxHp: 28, attackPower: 20 });
  scene.run.collect(11);
  reachShop(scene);
  const run = scene.run;
  const before = scene.run.snapshot();
  scene.player.hp = 12;
  scene.waveElapsed = 20;
  scene.handleCommand({ type: 'run-next' });
  assert.equal(scene.run, run);
  assert.equal(scene.run.phase, 'combat');
  assert.equal(scene.run.wave, 2);
  assert.equal(scene.waveElapsed, 0);
  assert.equal(scene.player.hp, 128);
  assert.equal(scene.paused, false);
  assert.equal(scene.run.snapshot().materials, before.materials);
  assert.equal(scene.run.getAttributes().attackPower, 120);
  assert.equal(scene.stats().maxHp, 128);
});

test('a frame that crosses the wave deadline settles once and stops the remaining simulation steps', () => {
  const { scene } = setup();
  emptyArena(scene);
  scene.waveElapsed = scene.run.waveDuration - 0.004;
  scene.update(1000, 50);
  assert.equal(scene.run.phase, 'shop');
  assert.equal(scene.paused, true);
  assert.equal(scene.run.snapshot().materials, 5);
  const elapsed = scene.elapsed;
  scene.update(1050, 50);
  assert.equal(scene.elapsed, elapsed);
  assert.equal(scene.run.snapshot().materials, 5);
});

test('material pickups level the character while the one equipped weapon and five empty hands keep their levels and XP', () => {
  const { scene } = setup();
  emptyArena(scene);
  scene.player.hp = 80;
  scene.spawnPickup(scene.player.x, scene.player.y, 80);
  scene.updatePickups(1 / 120);
  const snapshot = scene.run.snapshot();
  assert.equal(snapshot.materials, 80);
  assert.equal(snapshot.level, 3);
  assert.equal(snapshot.pendingUpgrades, 2);
  assert.equal(scene.player.hp, 80, 'materials do not bypass regeneration and life-steal mechanics');
  assert.ok(scene.rack.every((slot: any) => slot.level === 1 && slot.xp === 0));
  scene.updatePickups(1 / 120);
  assert.equal(scene.run.snapshot().materials, 80);
});

test('killing enemies yields collectible materials without auto-upgrading weapons', () => {
  const { scene } = setup();
  for (let kill = 0; kill < 65; kill++) {
    const enemy = victim(scene, 'runner', 1);
    scene.damageEnemy(enemy, 100, 0, 0, false, scene.combatAttributes());
  }
  assert.equal(scene.kills, 65);
  assert.ok(scene.rack.every((slot: any) => slot.level === 1 && slot.xp === 0));
  assert.ok(scene.pickups.some((drop: any) => drop.active && drop.value > 0));
  assert.equal(scene.run.snapshot().materials, 0, 'materials wait for pickup or settlement');
});

for (const [weapon, family, amount, expected] of [
  ['keyboard', 'meleeDamage', 10, 104], ['laser', 'elementalDamage', 10, 112], ['stapler', 'rangedDamage', 10, 56],
] as const) {
  test(`${weapon}: real scene attacks include matching family damage from run upgrades`, () => {
    const { scene, hits } = setup();
    bonuses(scene, { [family]: amount });
    const enemy = victim(scene);
    scene.gripOffsets = scene.gripOffsets.map(() => ({ x: 0, y: 0 }));
    const slot = scene.rack[0];
    Object.assign(slot, { weapon: weapon as WeaponId, level: 1, targetId: enemy.id, cooldown: 0, angle: 0 });
    scene.fire(slot);
    for (let step = 0; step < 120; step++) scene.updateBullets(1 / 120);
    assert.ok(hits.length > 0);
    assert.ok(hits.every(hit => hit.amount === expected));
  });
}

test('run armor, dodge, regeneration and movement bonuses affect actual scene simulation', () => {
  const { scene } = setup();
  emptyArena(scene);
  bonuses(scene, { armor: 15, hpRegen: 10, speedBonus: 25, maxHp: 20 });
  scene.player.hp = 100;
  scene.player.invulnerable = 0;
  scene.takeDamage(30, 0);
  assert.equal(scene.player.hp, 85);
  const x = scene.player.x;
  scene.tick(0.1, { x: 1, y: 0 });
  close(scene.player.x - x, 35);
  close(scene.player.hp, 85.1001);
  bonuses(scene, { dodge: 60 });
  scene.player.invulnerable = 0;
  randomRoll = 0.5;
  const hp = scene.player.hp;
  scene.takeDamage(30, 0);
  assert.equal(scene.player.hp, hp, 'a roll below the 60% dodge chance avoids damage');
});

test('life steal heals on real hits and shares its cooldown across rapid weapon hits', () => {
  const { scene } = setup();
  bonuses(scene, { lifeSteal: 100 });
  scene.player.hp = 50;
  const enemy = victim(scene);
  scene.damageEnemy(enemy, 1, 0, 0, false, scene.combatAttributes());
  assert.equal(scene.player.hp, 51);
  scene.damageEnemy(enemy, 1, 0, 0, false, scene.combatAttributes());
  assert.equal(scene.player.hp, 51, 'simultaneous hits cannot each bypass the heal cooldown');
  scene.lifeStealCooldown = 0;
  scene.damageEnemy(enemy, 1, 0, 0, false, scene.combatAttributes());
  assert.equal(scene.player.hp, 52);
});

test('restart clears run progress and dummy mode remains outside waves, shops and material rewards', () => {
  const { scene } = setup();
  bonuses(scene, { maxHp: 50, armor: 10 });
  scene.run.collect(100);
  const oldRun = scene.run;
  scene.handleCommand({ type: 'restart' });
  assert.notEqual(scene.run, oldRun);
  assert.equal(scene.run.phase, 'combat');
  assert.equal(scene.run.snapshot().materials, 0);
  assert.equal(scene.run.snapshot().level, 1);
  assert.equal(scene.run.getAttributes().maxHp, 100);
  assert.equal(scene.run.getAttributes().armor, 0);
  assert.equal(scene.waveElapsed, 0);
  const { scene: dummy } = setup('dummy');
  assert.equal(dummy.run, null);
  assert.equal(dummy.stats().run, null);
  const enemy = dummy.enemies.find((entry: any) => entry.active);
  dummy.damageEnemy(enemy, 100000, 0, 0, false, dummy.combatAttributes());
  assert.ok(dummy.pickups.every((drop: any) => !drop.active));
  dummy.finishWave();
  assert.equal(dummy.run, null);
  assert.equal(dummy.paused, false);
  assert.ok(dummy.rack.every((slot: any) => slot.xp === 0));
});

test('survival death ends the run and explicit restart starts fresh', () => {
  const { scene } = setup();
  scene.settings.practice = false;
  scene.player.hp = 1;
  scene.player.invulnerable = 0;
  scene.takeDamage(20, 0);
  assert.equal(scene.run.phase, 'lost');
  assert.equal(scene.running, false);
  assert.equal(scene.player.hp, 0);
  scene.handleCommand({ type: 'restart' });
  assert.equal(scene.run.phase, 'combat');
  assert.equal(scene.running, true);
  assert.equal(scene.player.hp, 100);
});

test('switching from a paused dummy arena returns to setup before starting a fresh structured run', () => {
  const { scene } = setup('dummy');
  scene.elapsed = 12;
  scene.kills = 5;
  scene.setPaused(true);
  scene.handleCommand({ type: 'settings', settings: { mode: 'steady' } });
  assert.equal(scene.settings.mode, 'steady');
  assert.equal(scene.run, null);
  assert.equal(scene.running, false);
  assert.equal(scene.paused, false);
  assert.equal(scene.elapsed, 0);
  assert.equal(scene.kills, 0);
  scene.handleCommand({ type: 'start' });
  assert.equal(scene.run.phase, 'combat');
  assert.equal(scene.run.wave, 1);
  assert.equal(scene.running, true);
  assert.equal(scene.run.snapshot().materials, 0);
});

test('buying a second weapon adds a hand, combining releases a hand, and recycling cannot remove the last weapon', () => {
  const { scene } = setup();
  const startingPreset = JSON.stringify(scene.loadout);
  scene.run.collect(250);
  reachShop(scene);
  const offer = scene.run.snapshot().shop.find((entry: any) => entry.kind === 'weapon');
  assert.equal(offer.weapon, scene.rack[0].weapon, 'the deterministic shop offers a matching first weapon');
  const materials = scene.run.snapshot().materials;
  scene.handleCommand({ type: 'run-buy', id: offer.id });
  assert.equal(scene.rack.filter((entry: any) => entry.equipped).length, 2);
  assert.equal(scene.rack[0].level, 1);
  assert.equal(scene.rack[1].level, 1);
  assert.equal(scene.guns[1].visible, true);
  assert.equal(scene.run.snapshot().materials, materials - offer.price);
  assert.equal(JSON.stringify(scene.loadout), startingPreset);
  scene.handleCommand({ type: 'run-combine', slot: 0, otherSlot: 1 });
  assert.equal(scene.rack[0].level, 2);
  assert.equal(scene.rack[1].equipped, false);
  assert.equal(scene.guns[1].visible, false);
  const afterCombine = scene.run.snapshot().materials;
  scene.handleCommand({ type: 'run-sell', slot: 0 });
  assert.equal(scene.rack[0].equipped, true);
  assert.equal(scene.run.snapshot().materials, afterCombine);
  const secondOffer = scene.run.snapshot().shop.find((entry: any) => entry.kind === 'weapon');
  scene.handleCommand({ type: 'run-buy', id: secondOffer.id });
  assert.equal(scene.rack[1].equipped, true);
  const beforeRecycle = scene.run.snapshot().materials;
  scene.handleCommand({ type: 'run-sell', slot: 1 });
  assert.equal(scene.rack[1].equipped, false);
  assert.equal(scene.guns[1].visible, false);
  assert.ok(scene.run.snapshot().materials > beforeRecycle);
  scene.handleCommand({ type: 'run-next' });
  assert.equal(scene.rack[0].level, 2);
  assert.equal(scene.rack.filter((entry: any) => entry.equipped).length, 1);
  scene.handleCommand({ type: 'restart' });
  assert.equal(scene.rack[0].level, 1);
  assert.equal(scene.rack.filter((entry: any) => entry.equipped).length, 1);
  assert.equal(JSON.stringify(scene.loadout), startingPreset);
});

test('an active run owns attack stats, mode, difficulty and starting equipment even while shopping', () => {
  const { scene } = setup();
  reachShop(scene);
  const settings = { ...scene.settings };
  const loadout = JSON.stringify(scene.loadout);
  scene.handleCommand({ type: 'settings', settings: {
    mode: 'dummy', practice: false, attackPower: 300, attackSpeed: 100, critChance: 100, volume: 0.2,
  } });
  for (const key of ['mode', 'practice', 'attackPower', 'attackSpeed', 'critChance']) {
    assert.equal(scene.settings[key], settings[key]);
  }
  assert.equal(scene.settings.volume, 0.2, 'presentation tuning remains available');
  scene.handleCommand({ type: 'loadout', weapons: Array.from({ length: 6 }, () => ({ weapon: 'stamp', level: 5 })) });
  assert.equal(JSON.stringify(scene.loadout), loadout);
  assert.equal(scene.run.phase, 'shop');
});

test('pickup pool saturation and timeout preserve earned rewards', () => {
  const { scene } = setup();
  for (let count = 0; count < 161; count++) scene.spawnPickup(100, 100, 1);
  assert.equal(scene.pickups.length, 160);
  assert.equal(scene.run.snapshot().materials, 1, 'a full pool credits additional materials directly');
  scene.pickups[0].life = 0;
  scene.updatePickups(1 / 120);
  assert.equal(scene.run.snapshot().materials, 2, 'an expired distant drop still credits its value');
  scene.finishWave();
  assert.equal(scene.run.snapshot().materials, 166, 'settlement includes 161 drops and 5 harvest exactly once');
});

test('twenty actual scene settlements require both boss victories and the final reward before winning', () => {
  const { scene } = setup();
  for (let wave = 1; wave <= 20; wave++) {
    assert.equal(scene.run.phase, 'combat');
    assert.equal(scene.run.wave, wave);
    if (wave === 10 || wave === 20) {
      const boss = scene.enemies.find((enemy: any) => enemy.active && enemy.kind === (wave === 10 ? 'manager' : 'director'));
      assert.ok(boss);
      scene.damageEnemy(boss, 100000, 0, 0, false, scene.combatAttributes());
      settleBossCelebration(scene);
      assert.equal(scene.run.phase, 'reward');
      assert.equal(scene.running, true, 'the reward is still part of the active challenge');
      scene.handleCommand({ type: 'run-boss-reward', id: scene.run.snapshot().bossRewards[0].id });
    } else scene.finishWave();
    if (wave < 20) {
      reachShop(scene);
      scene.handleCommand({ type: 'run-next' });
    }
  }
  assert.equal(scene.run.phase, 'won');
  assert.equal(scene.running, false);
  assert.equal(scene.paused, true);
  assert.ok(scene.enemies.every((enemy: any) => !enemy.active));
  assert.ok(scene.pickups.every((drop: any) => !drop.active));
  assert.equal(scene.run.snapshot().bossTrophies.length, 2);
});

for (const [wave, kind, bonus, tier] of [[10, 'manager', 200, 4], [20, 'director', 600, 5]] as const) {
  test(`wave ${wave} must defeat the actual ${kind}, celebrates safely, and pays a unique tier-${tier} reward`, () => {
    const { scene } = setup();
    advanceToWave(scene, wave);
    const bosses = scene.enemies.filter((enemy: any) => enemy.active && enemy.kind === kind);
    assert.equal(bosses.length, 1);
    const boss = bosses[0];
    assert.equal(boss.maxHp, wave === 10 ? 8000 : 16000);
    assert.equal(scene.stats().boss.name, wave === 10 ? '绩效主管' : '加班董事长');
    scene.waveElapsed = scene.run.waveDuration - 0.004;
    scene.spawnTimer = 0;
    const count = scene.enemies.filter((enemy: any) => enemy.active).length;
    scene.tick(1 / 120, { x: 0, y: 0 });
    assert.equal(scene.waveElapsed, scene.run.waveDuration);
    assert.equal(scene.run.phase, 'combat');
    assert.equal(scene.paused, false);
    assert.equal(scene.enemies.filter((enemy: any) => enemy.active).length, count, 'overtime does not add another ordinary enemy');
    scene.finishWave();
    assert.equal(scene.run.phase, 'combat', 'calling settlement cannot skip the boss');
    const before = scene.run.snapshot();
    scene.damageEnemy(boss, 100000, 0, 0, false, scene.combatAttributes());
    assert.equal(boss.active, false);
    assert.equal(scene.run.bossDefeated, true);
    assert.equal(scene.stats().boss, null);
    assert.equal(scene.run.snapshot().materials, before.materials + bonus);
    scene.damageEnemy(boss, 100000, 0, 0, false, scene.combatAttributes());
    assert.equal(scene.run.snapshot().materials, before.materials + bonus, 'a second hit cannot duplicate a boss reward');
    scene.player.hp = 1; scene.player.invulnerable = 0; scene.settings.practice = false;
    scene.takeDamage(999, 0);
    assert.equal(scene.player.hp, 1, 'celebration is safe from lingering contact damage');
    const position = { x: scene.player.x, y: scene.player.y };
    for (let frame = 0; frame < 60; frame++) scene.tick(1 / 120, { x: 1, y: 0 });
    assert.equal(scene.run.phase, 'combat', 'the death effect remains visible for the celebration interval');
    assert.equal(scene.player.x, position.x); assert.equal(scene.player.y, position.y);
    settleBossCelebration(scene);
    assert.equal(scene.run.phase, 'reward');
    assert.equal(scene.paused, true);
    const rewards = scene.run.snapshot().bossRewards;
    assert.equal(rewards.length, 3);
    assert.ok(rewards.every((reward: any) => reward.tier === tier));
    const materials = scene.run.snapshot().materials;
    const trophies = scene.run.snapshot().bossTrophies.length;
    scene.finishWave();
    scene.handleCommand({ type: 'run-next' });
    scene.handleCommand({ type: 'start' });
    assert.equal(scene.run.phase, 'reward');
    assert.equal(scene.run.snapshot().materials, materials);
    scene.handleCommand({ type: 'run-boss-reward', id: rewards[0].id });
    scene.handleCommand({ type: 'run-boss-reward', id: rewards[0].id });
    assert.equal(scene.run.snapshot().inventory.filter((entry: any) => entry.id === rewards[0].id).length, 1);
    assert.equal(scene.run.snapshot().bossTrophies.length, trophies);
    if (wave === 20) {
      assert.equal(scene.run.phase, 'won'); assert.equal(scene.running, false);
    } else {
      assert.notEqual(scene.run.phase, 'won'); reachShop(scene);
    }
    scene.handleCommand({ type: 'restart' });
    const restarted = scene.run.snapshot();
    assert.equal(restarted.wave, 1);
    assert.equal(restarted.materials, 0);
    assert.equal(restarted.bossRewards.length, 0);
    assert.equal(restarted.bossTrophies.length, 0);
    assert.equal(restarted.inventory.length, 0);
    assert.equal(scene.rack.filter((slot: any) => slot.equipped).length, 1);
  });
}

test('ordinary enemy volleys emit one real projectile with a maximum travel distance of 270', () => {
  for (const dt of [1 / 60, 1 / 120, 1 / 240, 2]) {
    const { scene } = setup();
    emptyArena(scene);
    Object.assign(scene.player, { x: 1500, y: 1200, px: 1500, py: 1200 });
    scene.spawnEnemy('shooter', 1300, 600);
    const shooter = scene.enemies.find((enemy: any) => enemy.active);
    shooter.brain.angle = 0;
    scene.spawnEnemyVolley(shooter);
    const shots = scene.enemyShots.filter((shot: any) => shot.active);
    assert.equal(shots.length, 1);
    const shot = shots[0], start = { x: shot.x, y: shot.y };
    let steps = 0;
    while (shot.active && steps++ < 1000) scene.updateEnemyShots(dt);
    assert.ok(steps < 1000);
    assert.ok(Math.hypot(shot.x - start.x, shot.y - start.y) <= 270 + 1e-8);
    close(Math.hypot(shot.x - start.x, shot.y - start.y), 270);
  }
});

test('player and enemy projectiles still collide after moving beyond the old viewport right edge', () => {
  const { scene, hits } = setup();
  emptyArena(scene);
  Object.assign(scene.player, { x: 1500, y: 900, px: 1500, py: 900, invulnerable: 0 });
  scene.spawnEnemy('runner', 1650, 900);
  const enemy = scene.enemies.find((entry: any) => entry.active);
  Object.assign(enemy, { hp: 10000, maxHp: 10000, spawn: 0 });
  scene.grid.rebuild(scene.enemies);
  scene.spawnBullet(1500, 900, 0, 1150, 21, 0.65, 0, false, 1, 1500, 900, 1, scene.combatAttributes());
  for (let frame = 0; frame < 60; frame++) scene.updateBullets(1 / 120);
  assert.equal(hits.length, 1);
  assert.equal(enemy.hp, 9958);
  scene.spawnEnemy('shooter', 1300, 900);
  const shooter = scene.enemies.find((entry: any) => entry.active && entry.kind === 'shooter');
  shooter.brain.angle = 0;
  const hp = scene.player.hp;
  scene.spawnEnemyVolley(shooter);
  for (let frame = 0; frame < 180; frame++) scene.updateEnemyShots(1 / 120);
  assert.equal(scene.player.hp, hp - shooter.damage);
});

test('pointer movement keeps viewport CSS scale and speed limits while the camera follows a larger world', () => {
  for (const canvasWidth of [1120, 560]) {
    const { scene } = setup();
    emptyArena(scene);
    scene.game.canvas.getBoundingClientRect = () => ({ width: canvasWidth, height: canvasWidth * 720 / 1120 });
    scene.settings.pointerSensitivity = 1;
    scene.pointerSampleTime = 1000;
    const start = scene.player.x;
    scene.pointer.moveRelative(1, 0);
    scene.applyDirectPointer(1000 + 1000 / 60);
    close(scene.player.x - start, 1120 / canvasWidth);
    const second = scene.player.x;
    scene.pointer.moveRelative(10000, 0);
    scene.applyDirectPointer(1000 + 2000 / 60);
    close(scene.player.x - second, scene.moveSpeed() / 60);
    const stopped = scene.player.x;
    scene.applyDirectPointer(1000 + 3000 / 60);
    close(scene.player.x, stopped);
    const stats = scene.stats();
    assert.equal(stats.world.width, 2240);
    assert.equal(stats.world.height, 1440);
    assert.equal(stats.world.viewportWidth, 1120);
    assert.equal(stats.world.viewportHeight, 720);
    close(stats.world.viewportX, scene.player.x - 560);
  }
});

test('projectile collision finds a grazing director across a spatial-hash cell boundary', () => {
  const { scene, hits } = setup();
  emptyArena(scene);
  scene.spawnEnemy('director', 810, 1040);
  const boss = scene.enemies.find((enemy: any) => enemy.active);
  boss.spawn = 0;
  scene.grid.rebuild(scene.enemies);
  scene.spawnBullet(805, 995, 0, 1200, 21, 0.65, 0, false, 1, 805, 995, 1, scene.combatAttributes());
  scene.updateBullets(1 / 120);
  assert.equal(hits.length, 1, 'the boss radius overlaps the bullet despite its center being in the next 80px grid cell');
  assert.equal(boss.hp, boss.maxHp - 42);
});

test('returning-folder collision includes the outer edge of a director across grid cells', () => {
  const { scene, hits } = setup();
  emptyArena(scene);
  scene.spawnEnemy('director', 810, 1040);
  const boss = scene.enemies.find((enemy: any) => enemy.active);
  boss.spawn = 0;
  scene.grid.rebuild(scene.enemies);
  Object.assign(scene.player, { x: 805, y: 981, px: 805, py: 981 });
  scene.gripOffsets[0] = { x: 0, y: 0 };
  Object.assign(scene.rack[0], { weapon: 'folder', angle: 0, targetId: boss.id });
  scene.fire(scene.rack[0]);
  scene.updateSpecialShots(1 / 53);
  assert.equal(hits.length, 1, '59px combined radii touch even when the former broadphase stopped below the cell border');
  assert.equal(boss.hp, boss.maxHp - 66);
});

test('keyboard swings hit the visible outer edge of a director when its center lies just beyond base weapon range', () => {
  const { scene, hits } = setup();
  emptyArena(scene);
  scene.spawnEnemy('director', 810, 1040);
  const boss = scene.enemies.find((enemy: any) => enemy.active);
  boss.spawn = 0;
  scene.grid.rebuild(scene.enemies);
  Object.assign(scene.player, { x: 810, y: 840, px: 810, py: 840 });
  scene.gripOffsets[0] = { x: 0, y: 0 };
  Object.assign(scene.rack[0], { weapon: 'keyboard', angle: Math.PI / 2, targetId: boss.id });
  scene.fire(scene.rack[0]);
  assert.equal(hits.length, 1, '155px weapon reach plus 46px boss radius includes a boss centered 200px away');
  assert.equal(boss.hp, boss.maxHp - 84);
});
