import type { RunSnapshot } from './game/RunModel';

export type WeaponId = 'stapler' | 'scatter' | 'keyboard' | 'laser' | 'coffee' | 'folder' | 'stamp' | 'cable';
export type WeaponLevel = 1 | 2 | 3 | 4 | 5;
export interface EquippedWeapon { weapon: WeaponId; level: WeaponLevel; }
export type WeaponLoadout = Array<EquippedWeapon | null>;
export type LabMode = 'steady' | 'swarm' | 'dummy';
export type AvatarExpression = 'neutral' | 'angry' | 'furious' | 'panic' | 'smug';
export interface PlayerAttributes {
  attackPower: number;
  attackSpeed: number;
  critChance: number;
}
export interface RunAttributes extends PlayerAttributes {
  maxHp: number;
  hpRegen: number;
  lifeSteal: number;
  armor: number;
  dodge: number;
  speedBonus: number;
  luck: number;
  harvesting: number;
  meleeDamage: number;
  rangedDamage: number;
  elementalDamage: number;
  pickupRange: number;
}
export interface Settings extends PlayerAttributes {
  speed: number;
  pointerSensitivity: number;
  knockback: number;
  shake: number;
  volume: number;
  practice: boolean;
  mode: LabMode;
}
export const DEFAULT_SETTINGS: Settings = {
  speed: 280, pointerSensitivity: 1, attackPower: 100, attackSpeed: 35, critChance: 25,
  knockback: 1, shake: 0.65, volume: 0.45,
  practice: true, mode: 'steady',
};
export const WEAPONS: Record<WeaponId, { name: string; label: string; description: string }> = {
  stapler: { name: '脉冲订书机', label: 'RAPID FIRE', description: '连射 · 穿透 · 精准反馈' },
  scatter: { name: '碎纸霰弹', label: 'SCATTER SHOT', description: '扇形散射 · 近身爆发' },
  keyboard: { name: '机械键盘', label: 'HEAVY SWING', description: '大幅横扫 · 群体击退' },
  laser: { name: '激光演示笔', label: 'LASER BEAM', description: '贯穿射线 · 切开敌群' },
  coffee: { name: '高压咖啡杯', label: 'COFFEE BOMB', description: '抛投爆破 · 范围泼溅' },
  folder: { name: '回旋文件夹', label: 'RETURN TO SENDER', description: '往返飞行 · 穿透追击' },
  stamp: { name: '解压印章', label: 'APPROVED SLAM', description: '近身重击 · 环形震退' },
  cable: { name: '超载充电线', label: 'CHAIN LIGHTNING', description: '连锁电击 · 跳跃清场' },
};
export interface Stats {
  run: RunSnapshot | null;
  boss: { name: string; hp: number; maxHp: number; wave: number } | null;
  world: { width: number; height: number; playerX: number; playerY: number; viewportX: number; viewportY: number; viewportWidth: number; viewportHeight: number };
  ready: boolean;
  running: boolean;
  paused: boolean;
  pointerLock: 'idle' | 'pending' | 'locked' | 'error' | 'unsupported';
  pointerLockMessage: string;
  weapons: { slot: number; equipped: boolean; weapon: WeaponId; level: WeaponLevel; xp: number; nextXp: number | null }[];
  elapsed: number;
  kills: number;
  combo: number;
  bestCombo: number;
  hp: number;
  maxHp: number;
  enemyCount: number;
  pressureTier: number;
  fps: number;
  frameP95: number;
  renderer: string;
  deaths: number;
}
export type LabCommand =
  | { type: 'run-boss-reward'; id: string }
  | { type: 'run-combine'; slot: number; otherSlot: number }
  | { type: 'run-sell'; slot: number }
  | { type: 'run-upgrade'; id: string }
  | { type: 'run-buy'; id: string; slot?: number }
  | { type: 'run-lock'; id: string }
  | { type: 'run-reroll-shop' | 'run-reroll-upgrades' | 'run-next' }
  | { type: 'start' | 'pause' | 'restart' | 'burst' }
  | { type: 'avatar'; dataUrl: string | null }
  | { type: 'avatar-expression'; expression: AvatarExpression }
  | { type: 'loadout'; weapons: EquippedWeapon[] }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'move'; x: number; y: number };
export function command(detail: LabCommand): void {
  window.dispatchEvent(new CustomEvent('lab:command', { detail }));
}
export function publishStats(detail: Stats): void {
  window.dispatchEvent(new CustomEvent('lab:stats', { detail }));
}
export function publishSettings(detail: Settings): void {
  window.dispatchEvent(new CustomEvent('lab:settings', { detail }));
}
