import type { EquippedWeapon, WeaponId, WeaponLevel } from '../shared.ts';
import { DEFAULT_LOADOUT, WEAPON_XP_THRESHOLDS, nextWeaponXp, normalizeRunLoadout, weaponStats } from './WeaponModel.ts';

export const WEAPON_SLOTS = [
  { weapon: 'stapler', x: -46, y: -24, side: -1 },
  { weapon: 'laser', x: 46, y: -24, side: 1 },
  { weapon: 'scatter', x: -48, y: 4, side: -1 },
  { weapon: 'coffee', x: 48, y: 4, side: 1 },
  { weapon: 'keyboard', x: -37, y: 28, side: -1 },
  { weapon: 'folder', x: 37, y: 28, side: 1 },
] as const;

export interface WeaponSlotState {
  slot: number;
  equipped: boolean;
  weapon: WeaponId;
  level: WeaponLevel;
  xp: number;
  cooldown: number;
  angle: number;
  recoil: number;
  swingLeft: number;
  swingDuration: number;
  targetId: number | null;
}

export function createWeaponRack(loadout: readonly (EquippedWeapon | null)[] = DEFAULT_LOADOUT): WeaponSlotState[] {
  const normalized = normalizeRunLoadout(loadout);
  return WEAPON_SLOTS.map((config, slot) => ({ slot, equipped: normalized[slot] !== null,
    weapon: normalized[slot]?.weapon ?? DEFAULT_LOADOUT[slot].weapon, level: normalized[slot]?.level ?? 1,
    xp: WEAPON_XP_THRESHOLDS[(normalized[slot]?.level ?? 1) - 1],
    cooldown: 0.2 + slot * 0.04, angle: config.side < 0 ? -Math.PI * 0.85 : -Math.PI * 0.15,
    recoil: 0, swingLeft: 0, swingDuration: 0.3, targetId: null }));
}

/** Every equipped hand shares the kill reward, including hands still waiting for range. */
export function grantWeaponXp(rack: WeaponSlotState[], amount: number): number[] {
  if (!Number.isFinite(amount) || amount <= 0) return [];
  const upgraded: number[] = [];
  for (const slot of rack) {
    if (!slot.equipped) continue;
    slot.xp = Math.min(WEAPON_XP_THRESHOLDS[4], slot.xp + amount);
    const previous = slot.level;
    let next = nextWeaponXp(slot.level);
    while (next !== null && slot.xp >= next) {
      slot.level = (slot.level + 1) as WeaponLevel;
      next = nextWeaponXp(slot.level);
    }
    if (slot.level > previous) upgraded.push(slot.slot);
  }
  return upgraded;
}

export function advanceWeapon(slot: WeaponSlotState, dt: number): void {
  if (!slot.equipped || !Number.isFinite(dt) || dt <= 0) return;
  // Keep at most this frame's overshoot, so cadence does not slow at lower FPS.
  slot.cooldown = Math.max(-dt, slot.cooldown - dt);
  slot.recoil *= Math.exp(-24 * dt);
  slot.swingLeft = Math.max(0, slot.swingLeft - dt);
}

export function triggerWeapon(slot: WeaponSlotState, fireRate: number): void {
  if (!slot.equipped) return;
  const stats = weaponStats(slot.weapon, slot.level);
  const interval = stats.interval / (Number.isFinite(fireRate) && fireRate > 0 ? fireRate : 1);
  slot.cooldown = interval + Math.min(0, Math.max(-interval * 0.5, slot.cooldown));
  if (stats.kind === 'melee' || stats.kind === 'slam') {
    slot.swingDuration = Math.min(0.3, slot.cooldown * 0.9);
    slot.swingLeft = slot.swingDuration;
  } else slot.recoil = slot.weapon === 'scatter' ? 13 : slot.weapon === 'coffee' ? 10 : 7;
}

/** Complete the wind-up, swing and recovery before this hand can attack again. */
export function weaponSwing(slot: WeaponSlotState): number {
  if (!slot.equipped || slot.swingLeft <= 0) return 0;
  const t = Math.max(0, Math.min(1, 1 - slot.swingLeft / slot.swingDuration));
  if (t === 0) return 0;
  const ease = (value: number) => value * value * (3 - 2 * value);
  return t < 0.16 ? -0.65 * ease(t / 0.16)
    : t < 0.6 ? -0.65 + 1.7 * ease((t - 0.16) / 0.44)
    : 1.05 * (1 - ease((t - 0.6) / 0.4));
}

/** Local hand position, shared by the drawn arm and the physical firing origin. */
export function weaponGrip(slot: number, angle: number, recoil: number, swing: number): { x: number; y: number } {
  const config = WEAPON_SLOTS[slot];
  return {
    x: config.x - Math.cos(angle) * recoil * 0.45 + (Math.cos(angle + swing) - Math.cos(angle)) * 14,
    y: config.y - Math.sin(angle) * recoil * 0.45 + (Math.sin(angle + swing) - Math.sin(angle)) * 14,
  };
}

interface Target { id: number; active: boolean; spawn: number; x: number; y: number; radius: number; }

/** Each hand owns its target. Existing locks are retained only inside the true range. */
export function pickWeaponTarget<T extends Target>(slot: WeaponSlotState, x: number, y: number,
  enemies: readonly T[], claimed: ReadonlySet<number>): T | null {
  if (!slot.equipped) return null;
  const stats = weaponStats(slot.weapon, slot.level);
  let best: T | null = null, bestScore = Infinity;
  for (const enemy of enemies) {
    if (!enemy.active || enemy.spawn > 0) continue;
    const distance = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
    const reach = stats.range + (stats.kind === 'melee' || stats.kind === 'slam' ? enemy.radius : 0);
    if (distance > reach * reach) continue;
    const score = distance * (enemy.id === slot.targetId ? 0.88 : 1) * (claimed.has(enemy.id) ? 1.25 : 1);
    if (score < bestScore) { best = enemy; bestScore = score; }
  }
  return best;
}
