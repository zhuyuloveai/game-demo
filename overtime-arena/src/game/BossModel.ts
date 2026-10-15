import type { EnemyBrain, EnemyKind } from './EnemyModel';

export type BossKind = 'manager' | 'director';

export function isBossKind(kind: EnemyKind): kind is BossKind {
  return kind === 'manager' || kind === 'director';
}

export function bossForWave(wave: number): BossKind | null {
  return wave === 10 ? 'manager' : wave === 20 ? 'director' : null;
}

export interface BossAttackInfo {
  attack: 'charge' | 'volley';
  windup: number;
  duration: number;
  speed: number;
  range: number;
  width: number;
  angles: number[];
  projectileSpeed: number;
  projectileLife: number;
  damageScale: number;
  cooldown: number;
}

export function createBossBrain(kind: BossKind, seed = 0): EnemyBrain {
  const stagger = Number.isFinite(seed) ? ((seed % 1) + 1) % 1 : 0;
  return {
    state: 'move', timer: 0, cooldown: 2 + stagger, angle: 0,
    attack: 'charge', attackIndex: 0, attackEnraged: false,
  };
}

/** Cache the rage state at windup so warning and released attack stay identical. */
export function bossAttackInfo(brain: EnemyBrain, kind: BossKind, healthRatio = 1): BossAttackInfo {
  const enraged = brain.state === 'move' ? kind === 'director' && healthRatio <= 0.5 : brain.attackEnraged === true;
  const attack = brain.attack ?? 'charge';
  const director = kind === 'director';
  const speed = director ? (enraged ? 460 : 400) : 370;
  const duration = director ? 0.7 : 0.65;
  const projectileSpeed = director ? (enraged ? 205 : 190) : 175;
  const projectileLife = director ? 1.8 : 1.65;
  return {
    attack,
    windup: attack === 'charge' ? (director ? (enraged ? 0.8 : 1) : 0.9) : (director ? 1 : 0.9),
    duration: attack === 'charge' ? duration : 0,
    speed: attack === 'charge' ? speed : 0,
    range: attack === 'charge' ? speed * duration : projectileSpeed * projectileLife,
    width: director ? 92 : 72,
    angles: attack === 'volley' ? (director && enraged ? [-0.3, -0.15, 0, 0.15, 0.3] : [-0.2, 0, 0.2]) : [],
    projectileSpeed, projectileLife,
    damageScale: director ? (enraged ? 0.6 : 0.55) : 0.6,
    cooldown: director ? (enraged ? 2.4 : 3.2) : 3.6,
  };
}

interface Position { x: number; y: number }
interface BossBody extends Position { speed: number; hp: number; maxHp: number }
interface BossAction { vx: number; vy: number; fire: boolean }
const still = (): BossAction => ({ vx: 0, vy: 0, fire: false });

/** The manager uses two charges per volley; the director alternates both attacks. */
export function stepBossBrain(brain: EnemyBrain, kind: BossKind, enemy: BossBody, player: Position, dt: number): BossAction {
  const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
  if (step <= 0) return still();
  brain.cooldown = Math.max(0, brain.cooldown - step);
  const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
  const dx = player.x - enemy.x, dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  const move = (speed: number): BossAction => distance > 0 ? { vx: dx / distance * speed, vy: dy / distance * speed, fire: false } : still();

  if (brain.state === 'windup') {
    brain.timer = Math.max(0, brain.timer - step);
    if (brain.timer > 1e-9) return still();
    const attack = bossAttackInfo(brain, kind, ratio);
    brain.cooldown = attack.cooldown;
    if (attack.attack === 'charge') {
      brain.state = 'rush'; brain.timer = attack.duration;
      return { vx: Math.cos(brain.angle) * attack.speed, vy: Math.sin(brain.angle) * attack.speed, fire: false };
    }
    brain.state = 'recover'; brain.timer = kind === 'director' ? 0.75 : 0.9;
    return { vx: 0, vy: 0, fire: true };
  }
  if (brain.state === 'rush') {
    const attack = bossAttackInfo(brain, kind, ratio);
    brain.timer = Math.max(0, brain.timer - step);
    if (brain.timer > 1e-9) return { vx: Math.cos(brain.angle) * attack.speed, vy: Math.sin(brain.angle) * attack.speed, fire: false };
    brain.state = 'recover'; brain.timer = kind === 'director' ? 0.85 : 1;
    return still();
  }
  if (brain.state === 'recover') {
    brain.timer = Math.max(0, brain.timer - step);
    if (brain.timer > 1e-9) return still();
    brain.state = 'move';
  }

  if (distance > 0) brain.angle = Math.atan2(dy, dx);
  const index = brain.attackIndex ?? 0;
  const next = kind === 'manager' ? (index % 3 === 2 ? 'volley' : 'charge') : (index % 2 === 1 ? 'volley' : 'charge');
  const maxDistance = next === 'charge' ? 460 : 340;
  if (brain.cooldown <= 1e-9 && distance >= 100 && distance <= maxDistance) {
    brain.attack = next;
    brain.attackEnraged = kind === 'director' && ratio <= 0.5;
    brain.state = 'windup';
    brain.timer = bossAttackInfo(brain, kind, ratio).windup;
    brain.attackIndex = index + 1;
    return still();
  }
  return move(enemy.speed * (kind === 'director' && ratio <= 0.5 ? 1.15 : 1));
}
