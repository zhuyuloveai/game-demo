import { DEFAULT_SETTINGS, type PlayerAttributes, type RunAttributes, type WeaponId, type WeaponLevel } from '../shared.ts';
import { weaponStats } from './WeaponModel.ts';

export const CRIT_MULTIPLIER = 2;
export const ATTRIBUTE_LIMITS = {
  attackPower: { min: 0, max: 300 },
  attackSpeed: { min: -50, max: 100 },
  critChance: { min: 0, max: 100 },
} as const;

const RUN_DEFAULTS: RunAttributes = {
  attackPower: DEFAULT_SETTINGS.attackPower, attackSpeed: DEFAULT_SETTINGS.attackSpeed, critChance: DEFAULT_SETTINGS.critChance,
  maxHp: 100, hpRegen: 0, lifeSteal: 0, armor: 0, dodge: 0, speedBonus: 0,
  luck: 0, harvesting: 5, meleeDamage: 0, rangedDamage: 0, elementalDamage: 0, pickupRange: 0,
};

export const RUN_ATTRIBUTE_LIMITS: Record<keyof RunAttributes, { min: number; max: number }> = {
  attackPower: { min: 0, max: 1000 }, attackSpeed: { min: -50, max: 200 }, critChance: { min: 0, max: 100 },
  maxHp: { min: 1, max: 2000 }, hpRegen: { min: 0, max: 100 }, lifeSteal: { min: 0, max: 100 },
  armor: { min: -20, max: 100 }, dodge: { min: 0, max: 60 }, speedBonus: { min: -50, max: 100 },
  luck: { min: 0, max: 300 }, harvesting: { min: 0, max: 500 }, meleeDamage: { min: 0, max: 300 },
  rangedDamage: { min: 0, max: 300 }, elementalDamage: { min: 0, max: 300 }, pickupRange: { min: 0, max: 200 },
};

function clampAttribute(key: keyof RunAttributes, value: number): number {
  const { min, max } = RUN_ATTRIBUTE_LIMITS[key];
  return Math.max(min, Math.min(max, value));
}

function finiteOwn(record: Record<string, unknown>, key: keyof RunAttributes, fallback: number): number {
  const value = record[key];
  return Object.hasOwn(record, key) && typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Rebuild from the starting configuration and accumulated run bonuses; never mutate either. */
export function composeRunAttributes(base: PlayerAttributes, bonuses: Partial<RunAttributes> = {}): RunAttributes {
  const result: RunAttributes = { ...RUN_DEFAULTS, ...normalizePlayerAttributes(base) };
  const record = recordOf(bonuses);
  for (const key of Object.keys(result) as (keyof RunAttributes)[]) {
    result[key] = clampAttribute(key, result[key] + finiteOwn(record, key, 0));
  }
  return result;
}

/** Run stats use wider growth limits while legacy settings retain their original validation. */
function combatAttributes(attributes: PlayerAttributes | RunAttributes): PlayerAttributes | RunAttributes {
  const record = recordOf(attributes);
  if (!Object.hasOwn(record, 'maxHp')) return normalizePlayerAttributes(record);
  const result = { ...RUN_DEFAULTS };
  for (const key of Object.keys(result) as (keyof RunAttributes)[]) {
    result[key] = clampAttribute(key, finiteOwn(record, key, RUN_DEFAULTS[key]));
  }
  return result;
}

function recordOf(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function attribute(input: Record<string, unknown>, key: keyof PlayerAttributes): number {
  const value = input[key];
  const { min, max } = ATTRIBUTE_LIMITS[key];
  return Object.hasOwn(input, key) && typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value)) : DEFAULT_SETTINGS[key];
}

/** Attack power/speed are percentage bonuses; critical chance is a percentage probability. */
export function normalizePlayerAttributes(input: unknown): PlayerAttributes {
  const record = recordOf(input);
  return {
    attackPower: attribute(record, 'attackPower'),
    attackSpeed: attribute(record, 'attackSpeed'),
    critChance: attribute(record, 'critChance'),
  };
}

/** Keep an explicitly tuned legacy fire rate; untouched saves receive the new default boost. */
export function migratePlayerAttributes(input: unknown): PlayerAttributes {
  const record = recordOf(input);
  const normalized = normalizePlayerAttributes(record);
  const fireRate = record.fireRate;
  if (!Object.hasOwn(record, 'attackSpeed') && Object.hasOwn(record, 'fireRate')
    && typeof fireRate === 'number' && Number.isFinite(fireRate) && fireRate >= 0.5 && fireRate <= 2 && fireRate !== 1) {
    const percentage = Number(((fireRate - 1) * 100).toFixed(6));
    normalized.attackSpeed = Math.max(ATTRIBUTE_LIMITS.attackSpeed.min, Math.min(ATTRIBUTE_LIMITS.attackSpeed.max, percentage));
  }
  return normalized;
}

export function attackMultiplier(attributes: PlayerAttributes | RunAttributes): number {
  return 1 + combatAttributes(attributes).attackPower / 100;
}

export function attackRateMultiplier(attributes: PlayerAttributes | RunAttributes): number {
  return 1 + combatAttributes(attributes).attackSpeed / 100;
}

/** Rolls normally come from Math.random(); finite outliers clamp to [0, 1], invalid rolls miss. */
export function rollCritical(attributes: PlayerAttributes | RunAttributes, roll: number): boolean {
  const chance = combatAttributes(attributes).critChance;
  if (chance <= 0) return false;
  if (chance >= 100) return true;
  return Number.isFinite(roll) && Math.min(1, Math.max(0, roll)) < chance / 100;
}

/** Round only once, after both critical damage and the enemy's defense have been applied. */
export function resolveDamage(weaponDamage: number, attributes: PlayerAttributes | RunAttributes, critical: boolean, targetMultiplier = 1): number {
  if (!Number.isFinite(weaponDamage) || weaponDamage <= 0 || !Number.isFinite(targetMultiplier) || targetMultiplier <= 0) return 0;
  const damage = weaponDamage * attackMultiplier(attributes) * (critical ? CRIT_MULTIPLIER : 1) * targetMultiplier;
  return Number.isFinite(damage) ? Math.max(1, Math.round(damage)) : 0;
}

const WEAPON_SCALING: Record<WeaponId, { attribute: 'meleeDamage' | 'rangedDamage' | 'elementalDamage'; factor: number }> = {
  keyboard: { attribute: 'meleeDamage', factor: 1 }, stamp: { attribute: 'meleeDamage', factor: 1 },
  stapler: { attribute: 'rangedDamage', factor: 0.7 }, scatter: { attribute: 'rangedDamage', factor: 0.35 },
  folder: { attribute: 'rangedDamage', factor: 0.8 }, laser: { attribute: 'elementalDamage', factor: 1 },
  coffee: { attribute: 'elementalDamage', factor: 1 }, cable: { attribute: 'elementalDamage', factor: 0.8 },
};

/** Flat weapon-family damage is applied before percentage damage, criticals, and enemy defense. */
export function scaledWeaponDamage(weapon: WeaponId, level: WeaponLevel, attributes: PlayerAttributes | RunAttributes): number {
  const normalized = combatAttributes(attributes);
  const scaling = WEAPON_SCALING[weapon];
  const bonus = 'maxHp' in normalized ? normalized[scaling.attribute] : 0;
  return weaponStats(weapon, level).damage + bonus * scaling.factor;
}

/** Fifteen armor doubles effective health; negative armor increases incoming damage. */
export function incomingDamage(raw: number, armor: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const safeArmor = clampAttribute('armor', Number.isFinite(armor) ? armor : 0);
  const value = safeArmor >= 0 ? raw / (1 + safeArmor / 15) : raw * (1 + Math.abs(safeArmor) / 15);
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 0;
}

export function regenPerSecond(regen: number): number {
  const safe = clampAttribute('hpRegen', Number.isFinite(regen) ? regen : 0);
  return safe <= 1 ? safe * 0.2 : 0.2 + (safe - 1) * 0.089;
}

export function playerMoveSpeed(base: number, speedBonus: number): number {
  const safeBase = Number.isFinite(base) ? base : DEFAULT_SETTINGS.speed;
  const safeBonus = clampAttribute('speedBonus', Number.isFinite(speedBonus) ? speedBonus : 0);
  return Math.max(100, Math.min(560, safeBase * (1 + safeBonus / 100)));
}

export function pickupRadius(bonus: number): number {
  return 140 * (1 + clampAttribute('pickupRange', Number.isFinite(bonus) ? bonus : 0) / 100);
}

export interface WeaponOutput {
  normalDamage: number;
  criticalDamage: number;
  attacksPerSecond: number;
  expectedDps: number;
}

/**
 * Single unarmored target, every attack hits at full cadence. Scatter assumes every pellet hits;
 * the folder hits on both outward and return legs. Piercing, chains, and splash add no extra targets.
 * Damage fields describe one hit; DPS averages the rounded normal/critical hit damage.
 */
export function weaponOutput(weapon: WeaponId, level: WeaponLevel, attributes: PlayerAttributes | RunAttributes): WeaponOutput {
  const stats = weaponStats(weapon, level);
  const normalized = combatAttributes(attributes);
  const damage = scaledWeaponDamage(weapon, level, normalized);
  const normalDamage = resolveDamage(damage, normalized, false);
  const criticalDamage = resolveDamage(damage, normalized, true);
  const attacksPerSecond = attackRateMultiplier(normalized) / stats.interval;
  const hitsPerAttack = weapon === 'scatter' ? stats.pellets : weapon === 'folder' ? 2 : 1;
  const probability = normalized.critChance / 100;
  const expectedDps = (normalDamage * (1 - probability) + criticalDamage * probability) * hitsPerAttack * attacksPerSecond;
  return { normalDamage, criticalDamage, attacksPerSecond, expectedDps };
}
