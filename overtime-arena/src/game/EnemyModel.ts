export type EnemyKind = 'runner' | 'heavy' | 'charger' | 'shooter' | 'shield' | 'dummy' | 'manager' | 'director';

export interface EnemyDefinition {
  name: string;
  color: number;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  knockback: number;
  scale: number;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDefinition> = {
  runner: { name: '加急文件', color: 0x65dfbd, hp: 100, speed: 145, radius: 16, damage: 10, knockback: 0.6, scale: 0.9 },
  heavy: { name: '重装主管', color: 0xe8899d, hp: 650, speed: 92, radius: 25, damage: 20, knockback: 0.18, scale: 1.26 },
  charger: { name: '催命闹钟', color: 0xffa451, hp: 180, speed: 150, radius: 17, damage: 16, knockback: 0.45, scale: 0.96 },
  shooter: { name: '甩锅投手', color: 0xc9a3ff, hp: 210, speed: 115, radius: 18, damage: 10, knockback: 0.6, scale: 0.96 },
  shield: { name: '审批壁垒', color: 0x8cc5f0, hp: 460, speed: 112, radius: 24, damage: 15, knockback: 0.16, scale: 1.18 },
  dummy: { name: '训练靶', color: 0x90a9b3, hp: 160, speed: 0, radius: 17, damage: 0, knockback: 1, scale: 0.88 },
  manager: { name: '绩效主管', color: 0xff996c, hp: 8000, speed: 110, radius: 36, damage: 24, knockback: 0.035, scale: 1.24 },
  director: { name: '加班董事长', color: 0xd3a0ff, hp: 16000, speed: 115, radius: 46, damage: 28, knockback: 0.02, scale: 1.15 },
};

const tierAt = (elapsed: number): number => Math.min(10, Math.max(0, Math.floor((Number.isFinite(elapsed) ? elapsed : 0) / 30)));

export function enemyStats(kind: EnemyKind, elapsed: number): EnemyDefinition {
  const def = ENEMY_DEFS[kind];
  const tier = kind === 'dummy' || kind === 'manager' || kind === 'director' ? 0 : tierAt(elapsed);
  return { ...def, hp: Math.round(def.hp * (1 + tier * 0.2)), speed: def.speed * (1 + tier * 0.03), damage: Math.round(def.damage * (1 + tier * 0.06)) };
}

/** incomingAngle is the projectile or strike's travel direction toward the enemy. */
export function enemyDamageMultiplier(kind: EnemyKind, facing: number, incomingAngle: number): number {
  return kind === 'shield' && Math.cos(incomingAngle - facing) < -0.35 ? 0.42 : 1;
}

export function pressureAt(elapsed: number, mode: 'steady' | 'swarm' | 'dummy') {
  const tier = tierAt(elapsed);
  if (mode === 'dummy') return { tier: 0, target: 5, batch: 0, interval: 1 };
  if (mode === 'swarm') return { tier, target: Math.min(190, 90 + tier * 10), batch: 6 + Math.floor(tier / 2), interval: Math.max(0.16, 0.26 - tier * 0.01) };
  return { tier, target: Math.min(120, 54 + tier * 7), batch: 4 + Math.floor(tier / 3), interval: Math.max(0.24, 0.36 - tier * 0.012) };
}

const SPECIAL_LIMITS = { heavy: 12, charger: 14, shooter: 8, shield: 12 } as const;

/** Reweight the remaining types when a special type has reached its live cap. */
export function chooseEnemyKind(elapsed: number, roll: number, counts: Partial<Record<EnemyKind, number>>): EnemyKind {
  const progress = tierAt(elapsed) / 10;
  const weights: Array<[EnemyKind, number]> = [
    ['runner', 50 - progress * 15], ['heavy', 14 + progress * 4],
    ['charger', 14 + progress * 4], ['shooter', 10 + progress * 3], ['shield', 12 + progress * 4],
  ];
  const eligible = weights.filter(([kind]) => kind === 'runner' || (counts[kind] ?? 0) < SPECIAL_LIMITS[kind as keyof typeof SPECIAL_LIMITS]);
  let cursor = Math.min(1 - Number.EPSILON, Math.max(0, Number.isFinite(roll) ? roll : 0)) * eligible.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [kind, weight] of eligible) {
    cursor -= weight;
    if (cursor < 0) return kind;
  }
  return 'runner';
}

export interface EnemyBrain {
  state: 'move' | 'windup' | 'rush' | 'recover';
  timer: number;
  cooldown: number;
  angle: number;
  attack?: 'charge' | 'volley';
  attackIndex?: number;
  attackEnraged?: boolean;
}

/** Shot distance and warning geometry share this definition in the scene. */
export const ENEMY_VOLLEY = Object.freeze({
  count: 1, spread: 0, speed: 180, life: 1.5, range: 270, damageScale: 1,
  minDistance: 180, maxDistance: 280, windup: 0.75, cooldown: 3.2,
});

export function createEnemyBrain(kind: EnemyKind, seed = 0): EnemyBrain {
  const stagger = Number.isFinite(seed) ? ((seed % 1) + 1) % 1 : 0;
  return { state: 'move', timer: 0, cooldown: kind === 'charger' ? 1 + stagger : kind === 'shooter' ? 1.5 + stagger : 0, angle: 0 };
}

interface Position { x: number; y: number }
interface MovingEnemy extends Position { speed: number }
interface BrainStep { vx: number; vy: number; fire: boolean }
const still = (): BrainStep => ({ vx: 0, vy: 0, fire: false });

/** Attack direction is captured once at windup and stays fixed through release. */
export function stepEnemyBrain(brain: EnemyBrain, kind: EnemyKind, enemy: MovingEnemy, player: Position, dt: number): BrainStep {
  const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
  brain.cooldown = Math.max(0, brain.cooldown - step);
  const dx = player.x - enemy.x, dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  const toward = (speed: number): BrainStep => distance > 0 ? { vx: dx / distance * speed, vy: dy / distance * speed, fire: false } : still();
  if (kind === 'dummy') return still();

  if (brain.state === 'windup') {
    brain.timer = Math.max(0, brain.timer - step);
    if (brain.timer > 1e-9) return still();
    if (kind === 'charger') {
      brain.state = 'rush'; brain.timer = 0.4; brain.cooldown = 2.8;
      return { vx: Math.cos(brain.angle) * 560, vy: Math.sin(brain.angle) * 560, fire: false };
    }
    brain.state = 'recover'; brain.timer = 0.35; brain.cooldown = ENEMY_VOLLEY.cooldown;
    return { vx: 0, vy: 0, fire: kind === 'shooter' };
  }
  if (brain.state === 'rush') {
    brain.timer = Math.max(0, brain.timer - step);
    if (brain.timer > 1e-9) return { vx: Math.cos(brain.angle) * 560, vy: Math.sin(brain.angle) * 560, fire: false };
    brain.state = 'recover'; brain.timer = 0.4;
    return still();
  }
  if (brain.state === 'recover') {
    brain.timer = Math.max(0, brain.timer - step);
    if (brain.timer > 1e-9) return still();
    brain.state = 'move';
  }

  if (distance > 0) {
    const targetAngle = Math.atan2(dy, dx);
    if (kind === 'shield') {
      const delta = Math.atan2(Math.sin(targetAngle - brain.angle), Math.cos(targetAngle - brain.angle));
      const turned = brain.angle + Math.max(-2 * step, Math.min(2 * step, delta));
      brain.angle = Math.atan2(Math.sin(turned), Math.cos(turned));
    } else brain.angle = targetAngle;
  }
  if (kind === 'charger' && brain.cooldown <= 1e-9 && distance >= 120 && distance <= 440) {
    brain.state = 'windup'; brain.timer = 0.6;
    return still();
  }
  if (kind === 'shooter') {
    if (brain.cooldown <= 1e-9 && distance >= ENEMY_VOLLEY.minDistance && distance <= ENEMY_VOLLEY.maxDistance) {
      brain.state = 'windup'; brain.timer = ENEMY_VOLLEY.windup;
      return still();
    }
    if (distance < 210) return toward(-enemy.speed * 0.7);
    if (distance > 280) return toward(enemy.speed);
    return still();
  }
  return toward(enemy.speed);
}

const waveAt = (wave: number): number => Math.max(1, Math.min(20, Math.floor(Number.isFinite(wave) ? wave : 1)));

/** Run balance assumes one starting weapon and additional weapons from the shop. */
export function waveEnemyStats(kind: EnemyKind, wave: number): EnemyDefinition {
  const def = ENEMY_DEFS[kind];
  if (kind === 'dummy' || kind === 'manager' || kind === 'director') return { ...def };
  const progress = waveAt(wave) - 1;
  const start = {
    runner: { hp: 42, speed: 105, damage: 7 },
    heavy: { hp: 125, speed: 72, damage: 13 },
    charger: { hp: 85, speed: 108, damage: 11 },
    shooter: { hp: 110, speed: 90, damage: 8 },
    shield: { hp: 200, speed: 83, damage: 11 },
  }[kind];
  return {
    ...def,
    hp: Math.round(start.hp * (1 + progress * 0.09 + progress * progress * 0.005)),
    speed: start.speed * (1 + progress * 0.017),
    damage: Math.round(start.damage * (1 + progress * 0.055)),
  };
}

export function wavePressure(wave: number, mode: 'steady' | 'swarm' | 'dummy') {
  if (mode === 'dummy') return { tier: 0, target: 5, batch: 0, interval: 1, initial: 5 };
  const current = waveAt(wave), progress = current - 1;
  const swarm = mode === 'swarm';
  return {
    tier: current - 1,
    initial: Math.min(swarm ? 34 : 28, 7 + Math.floor(progress * 1.1) + (swarm ? 3 : 0)),
    target: Math.min(swarm ? 130 : 100, 12 + progress * 3 + Math.max(0, current - 7) * 2 + (swarm ? 4 + progress : 0)),
    batch: 1 + Math.floor(progress / 3) + (swarm && current > 3 ? 1 : 0),
    interval: Math.max(swarm ? 0.3 : 0.4, 0.9 - progress * 0.026 - (swarm ? 0.05 : 0)),
  };
}

export function chooseWaveEnemyKind(wave: number, roll: number, counts: Partial<Record<EnemyKind, number>>): EnemyKind {
  const current = waveAt(wave);
  const candidates: Array<[EnemyKind, number, number]> = [
    ['runner', Math.max(35, 88 - current * 2), Number.POSITIVE_INFINITY],
    ['heavy', current >= 2 ? Math.min(22, 4 + current) : 0, Math.min(12, 1 + Math.floor(current / 2))],
    ['charger', current >= 3 ? Math.min(20, 3 + current) : 0, Math.min(14, 1 + Math.floor(current / 2))],
    ['shooter', current >= 4 ? Math.min(9, 2 + (current - 4) * 0.45) : 0, current < 4 ? 0 : Math.min(5, 1 + Math.floor((current - 4) / 4))],
    ['shield', current >= 5 ? Math.min(18, 2 + current) : 0, Math.min(10, Math.max(1, Math.floor(current / 2)))],
  ];
  const eligible = candidates.filter(([kind, weight, cap]) => weight > 0 && (counts[kind] ?? 0) < cap);
  let cursor = Math.min(1 - Number.EPSILON, Math.max(0, Number.isFinite(roll) ? roll : 0)) * eligible.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [kind, weight] of eligible) {
    cursor -= weight;
    if (cursor < 0) return kind;
  }
  return 'runner';
}
