import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import type { PlayerAttributes, WeaponId } from '../src/shared.ts';

// Execute the real scene without a DOM or browser. Only rendering/audio modules
// are replaced; targeting, projectile travel, defenses and damage stay real.
const moduleCache = new Map<string, { exports: any }>();
const visualModules = new Set(['textures', 'Feedback', 'PhotoHead', 'PlayerBody', 'avatar']);
const fixedMath = Object.create(Math);
fixedMath.random = () => 0.5;
function loadSource(filename: string): any {
  const cached = moduleCache.get(filename);
  if (cached) return cached.exports;
  const module = { exports: {} as any };
  moduleCache.set(filename, module);
  const source = readFileSync(filename, 'utf8').replaceAll('import.meta.env.DEV', 'false');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } });
  const requireSource = (specifier: string) => {
    if (specifier === 'phaser') return { Scene: class {} };
    if (visualModules.has(specifier.split('/').at(-1)!.replace(/\.ts$/, ''))) return {};
    assert.ok(specifier.startsWith('.'), `Unexpected dependency: ${specifier}`);
    return loadSource(resolve(dirname(filename), specifier.endsWith('.ts') ? specifier : `${specifier}.ts`));
  };
  const evaluate = runInNewContext(`(function(require, module, exports) { ${outputText}\n})`,
    { Math: fixedMath }, { filename });
  evaluate(requireSource, module, module.exports);
  return module.exports;
}
const { CombatScene } = loadSource(fileURLToPath(new URL('../src/game/CombatScene.ts', import.meta.url)));

const noop = () => {};
function imageStub(): any {
  const image: any = {};
  for (const method of ['setDepth', 'setPosition', 'setRotation', 'setScale', 'setVisible', 'setTexture']) {
    image[method] = () => image;
  }
  return image;
}
function enemy(id: number, x = 240, y = 200, kind = 'runner', facing = 0): any {
  return { id, x, y, px: x, py: y, active: true, spawn: 0, hp: 10000, maxHp: 10000,
    radius: 20, vx: 0, vy: 0, kind, brain: { state: 'move', angle: facing }, flash: 0 };
}
function setup(weapon: WeaponId, attributes: Partial<PlayerAttributes> = {}, enemies = [enemy(1)]) {
  const scene = new CombatScene();
  const hits: { x: number; amount: number; critical: boolean }[] = [];
  Object.assign(scene.settings, { attackPower: 100, attackSpeed: 35, critChance: 0, shake: 0 }, attributes);
  Object.assign(scene.player, { x: 200, y: 200 });
  scene.gripOffsets = scene.gripOffsets.map(() => ({ x: 0, y: 0 }));
  scene.add = { image: imageStub };
  scene.body = { attack: noop };
  scene.photoHead = { trigger: noop };
  scene.feedback = { shot: noop, slash: noop, muzzle: noop, beam: noop, lightning: noop,
    explosion: noop, hit: noop,
    damageText: (x: number, _y: number, amount: number, critical: boolean) => hits.push({ x, amount, critical }),
  };
  scene.enemies = enemies;
  scene.grid.rebuild(enemies);
  const slot = scene.rack[0];
  Object.assign(slot, { weapon, level: 1, cooldown: 0, angle: 0, targetId: enemies[0].id });
  return { scene, slot, hits, enemies };
}
function finishProjectiles(scene: any) {
  // Fixed simulation steps exercise impact and folder return collisions.
  for (let frame = 0; frame < 300; frame++) {
    scene.updateBullets(1 / 120);
    scene.updateSpecialShots(1 / 120);
  }
}

const cases: { weapon: WeaponId; normal: number; critical: number; hits: number; interval: number }[] = [
  { weapon: 'stapler', normal: 42, critical: 84, hits: 1, interval: 0.145 },
  { weapon: 'scatter', normal: 24, critical: 48, hits: 7, interval: 0.62 },
  { weapon: 'keyboard', normal: 84, critical: 168, hits: 1, interval: 0.46 },
  { weapon: 'laser', normal: 92, critical: 184, hits: 1, interval: 0.7 },
  { weapon: 'coffee', normal: 136, critical: 272, hits: 1, interval: 1.1 },
  { weapon: 'folder', normal: 66, critical: 132, hits: 2, interval: 0.92 },
  { weapon: 'stamp', normal: 156, critical: 312, hits: 1, interval: 1.15 },
  { weapon: 'cable', normal: 60, critical: 120, hits: 1, interval: 0.66 },
];
for (const config of cases) {
  for (const critical of [false, true]) {
    test(`${config.weapon}: real attack applies power, ${critical ? 'guaranteed' : 'zero'} critical chance and attack speed`, () => {
      const { scene, slot, hits, enemies } = setup(config.weapon, { critChance: critical ? 100 : 0 });
      scene.fire(slot);
      if (config.weapon === 'coffee') assert.equal(hits.length, 0, 'coffee waits for landing');
      finishProjectiles(scene);
      assert.equal(hits.length, config.hits);
      for (const hit of hits) {
        assert.equal(hit.amount, critical ? config.critical : config.normal);
        assert.equal(hit.critical, critical);
      }
      assert.equal(enemies[0].hp, 10000 - config.hits * (critical ? config.critical : config.normal));
      assert.ok(Math.abs(slot.cooldown - config.interval / 1.35) < 1e-12);
    });
  }
}

for (const critical of [false, true]) {
  test(`chain damage attenuates before final rounding (${critical ? 'critical' : 'normal'})`, () => {
    const { scene, slot, hits } = setup('cable', { critChance: critical ? 100 : 0 },
      [enemy(1, 240), enemy(2, 320), enemy(3, 400), enemy(4, 480)]);
    scene.fire(slot);
    assert.deepEqual(hits.map(hit => hit.x), [240, 320, 400]);
    assert.deepEqual(hits.map(hit => hit.amount), critical ? [120, 110, 101] : [60, 55, 50]);
  });
}

test('front-facing shield reduces the final critical hit, while rear hits deal full damage', () => {
  for (const [facing, expected] of [[Math.PI, 77], [0, 184]]) {
    const { scene, slot, hits } = setup('laser', { critChance: 100 }, [enemy(1, 240, 200, 'shield', facing)]);
    scene.fire(slot);
    assert.equal(hits[0].amount, expected);
  }
});

for (const weapon of ['stapler', 'scatter', 'coffee', 'folder'] as const) {
  test(`${weapon}: in-flight damage and critical status retain their launch attributes`, () => {
    const { scene, slot, hits } = setup(weapon, { attackPower: 0, critChance: 0 });
    scene.fire(slot);
    Object.assign(scene.settings, { attackPower: 300, attackSpeed: 100, critChance: 100 });
    finishProjectiles(scene);
    const base = { stapler: 21, scatter: 12, coffee: 68, folder: 33 }[weapon];
    assert.equal(hits.length, weapon === 'scatter' ? 7 : weapon === 'folder' ? 2 : 1);
    assert.ok(hits.every(hit => hit.amount === base && !hit.critical));
    hits.length = 0;
    slot.cooldown = 0;
    scene.fire(slot);
    finishProjectiles(scene);
    assert.ok(hits.length > 0);
    assert.ok(hits.every(hit => hit.amount === base * 8 && hit.critical), 'next volley adopts edited attributes');
  });
}

test('coffee landing applies snapshotted power to each target inside its splash radius', () => {
  const { scene, slot, hits } = setup('coffee', { critChance: 100 },
    [enemy(1, 240), enemy(2, 300), enemy(3, 360)]);
  scene.fire(slot);
  Object.assign(scene.settings, { attackPower: 0, critChance: 0 });
  finishProjectiles(scene);
  assert.deepEqual(hits.map(hit => hit.x), [240, 300]);
  assert.deepEqual(hits.map(hit => hit.amount), [272, 272]);
});
