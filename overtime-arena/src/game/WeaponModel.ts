import { WEAPONS, type EquippedWeapon, type WeaponId, type WeaponLevel, type WeaponLoadout } from '../shared.ts';

export const WEAPON_LEVELS: readonly { level: WeaponLevel; name: string; color: number; css: string }[] = [
  { level: 1, name: '普通', color: 0xb7c3ce, css: '#b7c3ce' },
  { level: 2, name: '精良', color: 0x81dfa3, css: '#81dfa3' },
  { level: 3, name: '稀有', color: 0x79bdff, css: '#79bdff' },
  { level: 4, name: '史诗', color: 0xc39bff, css: '#c39bff' },
  { level: 5, name: '传说', color: 0xffca6b, css: '#ffca6b' },
];

export const WEAPON_XP_THRESHOLDS = [0, 60, 160, 320, 560] as const;
export const DEFAULT_LOADOUT: readonly EquippedWeapon[] = [
  { weapon: 'stapler', level: 1 }, { weapon: 'laser', level: 1 },
  { weapon: 'scatter', level: 1 }, { weapon: 'coffee', level: 1 },
  { weapon: 'keyboard', level: 1 }, { weapon: 'folder', level: 1 },
];

function validLevel(level: unknown): WeaponLevel {
  return typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 5 ? level as WeaponLevel : 1;
}

/** Invalid or old storage recovers each of the six hands independently. */
export function normalizeLoadout(input: unknown): EquippedWeapon[] {
  const entries = Array.isArray(input) ? input : [];
  return DEFAULT_LOADOUT.map((fallback, slot) => {
    const candidate: unknown = entries[slot];
    if (!candidate || typeof candidate !== 'object') return { ...fallback };
    const record = candidate as Record<string, unknown>;
    if (typeof record.weapon !== 'string' || !Object.hasOwn(WEAPONS, record.weapon)) return { ...fallback };
    return { weapon: record.weapon as WeaponId, level: validLevel(record.level) };
  });
}

/** Run equipment retains empty hands; malformed entries never grant a free weapon. */
export function normalizeRunLoadout(input: unknown): WeaponLoadout {
  const entries = Array.isArray(input) ? input : [];
  return Array.from({ length: 6 }, (_, slot) => {
    const candidate: unknown = entries[slot];
    if (!candidate || typeof candidate !== 'object') return null;
    const record = candidate as Record<string, unknown>;
    if (typeof record.weapon !== 'string' || !Object.hasOwn(WEAPONS, record.weapon)) return null;
    return { weapon: record.weapon as WeaponId, level: validLevel(record.level) };
  });
}

/** A new challenge starts with one level-I weapon, regardless of laboratory presets. */
export function createStartingLoadout(input: unknown): WeaponLoadout {
  const first = normalizeRunLoadout(input).find(entry => entry !== null);
  return [{ weapon: first?.weapon ?? DEFAULT_LOADOUT[0].weapon, level: 1 }, null, null, null, null, null];
}

/** The next threshold is cumulative XP; null means this hand is fully upgraded. */
export function nextWeaponXp(level: WeaponLevel): number | null {
  const safe = validLevel(level);
  return safe === 5 ? null : WEAPON_XP_THRESHOLDS[safe];
}

export type WeaponKind = 'projectile' | 'melee' | 'beam' | 'lob' | 'boomerang' | 'slam' | 'chain';
export interface WeaponStats {
  kind: WeaponKind;
  damage: number; interval: number; range: number; knockback: number;
  projectileSpeed: number; life: number; pellets: number; spread: number; pierce: number;
  radius: number; chains: number; chainRange: number; color: number;
}

const empty = { projectileSpeed: 0, life: 0, pellets: 1, spread: 0, pierce: 1, radius: 0, chains: 0, chainRange: 0 };
const BASE: Record<WeaponId, WeaponStats> = {
  stapler: { ...empty, kind: 'projectile', damage: 21, interval: 0.145, range: 650, knockback: 170, projectileSpeed: 1150, life: 0.65, spread: 0.025, pierce: 2, color: 0xffc67b },
  scatter: { ...empty, kind: 'projectile', damage: 12, interval: 0.62, range: 420, knockback: 260, projectileSpeed: 880, life: 0.46, pellets: 7, spread: 0.105, color: 0xffb179 },
  keyboard: { ...empty, kind: 'melee', damage: 42, interval: 0.46, range: 155, knockback: 560, radius: 158, color: 0x80dfdf },
  laser: { ...empty, kind: 'beam', damage: 46, interval: 0.7, range: 630, knockback: 90, pierce: 5, radius: 4, color: 0xff678b },
  coffee: { ...empty, kind: 'lob', damage: 68, interval: 1.1, range: 430, knockback: 240, projectileSpeed: 360, life: 1.5, radius: 84, color: 0xe5aa64 },
  folder: { ...empty, kind: 'boomerang', damage: 33, interval: 0.92, range: 440, knockback: 160, projectileSpeed: 530, life: 1.9, pierce: 5, radius: 20, color: 0x8fc7ff },
  stamp: { ...empty, kind: 'slam', damage: 78, interval: 1.15, range: 112, knockback: 650, radius: 130, color: 0xff838b },
  cable: { ...empty, kind: 'chain', damage: 30, interval: 0.66, range: 370, knockback: 70, chains: 3, chainRange: 115, color: 0xb69aff },
};

/** Level III and V unlock the weapon's signature effect as well as raw power. */
export function weaponStats(weapon: WeaponId, level: WeaponLevel): WeaponStats {
  const safeLevel = validLevel(level);
  const index = safeLevel - 1;
  const milestone = safeLevel >= 5 ? 2 : safeLevel >= 3 ? 1 : 0;
  const base = BASE[weapon];
  // Shot/chain counts also add damage: keep their total output near 2.5x at V.
  const damageScale = weapon === 'scatter' ? [1, 1.15, 1.3, 1.5, 1.7][index]
    : weapon === 'cable' ? [1, 1.1, 1.18, 1.24, 1.32][index]
    : [1, 1.22, 1.44, 1.68, 1.94][index];
  const stats: WeaponStats = { ...base,
    damage: Math.round(base.damage * damageScale * 10) / 10,
    interval: base.interval * [1, 0.97, 0.94, 0.91, 0.88][index],
    knockback: base.knockback * (1 + 0.04 * index),
  };
  if (weapon === 'stapler') stats.pierce += milestone;
  if (weapon === 'scatter') stats.pellets += milestone;
  if (weapon === 'keyboard') { stats.range += milestone * 14; stats.radius += milestone * 14; }
  if (weapon === 'laser') { stats.pierce += milestone * 2; stats.radius += milestone * 1.5; }
  if (weapon === 'coffee') stats.radius += milestone * 19;
  if (weapon === 'folder') { stats.pierce += milestone * 2; stats.radius += milestone * 4; }
  if (weapon === 'stamp') { stats.range += milestone * 18; stats.radius += milestone * 18; }
  if (weapon === 'cable') { stats.chains += milestone; stats.chainRange += milestone * 25; }
  return stats;
}
