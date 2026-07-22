import { viewport } from "../engine/viewport.js";

// ===== 可变游戏世界状态（模块间共享的对象引用）=====
export const player = {
  x: viewport.W / 2, y: viewport.H * 0.8,
  r: 14,            // 碰撞半径
  power: 1,         // 武器等级，小飞机 1-5，变形后可达 10
  weapon: "gun",    // 当前武器：gun 机炮 / lightning 闪电 / laser 镭射 / missile 导弹（Q 循环切换）
  transformed: false, // 是否已变形为多喷射中型机
  fireCooldown: 0,
  fireInterval: 0.11,
  alive: true,
  invincible: 0,  // 受击后的无敌剩余时间（秒），闪烁且免疫碰撞
  charging: false, // 按住 A 蓄力中（由 input 维护，main 读）
};

// 火力上限：小飞机 5 级，变形后 10 级
export const maxPower = () => (player.transformed ? 10 : 5);

// ===== 子弹对象池 =====
export const bullets = [];
const MAX_BULLETS = 400;
for (let i = 0; i < MAX_BULLETS; i++) bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 0 });

// ===== 敌方子弹对象池 =====
export const eBullets = [];
const MAX_EBULLETS = 120;
for (let i = 0; i < MAX_EBULLETS; i++) eBullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 0 });

// ===== 敌机 =====
export const enemies = [];

// ===== 道具 =====
export const powerups = [];

// ===== 粒子 =====
export const particles = [];

// ===== 星空背景 =====
export const stars = [];
for (let i = 0; i < 120; i++) {
  stars.push({ x: Math.random() * viewport.W, y: Math.random() * viewport.H, z: Math.random() * 0.9 + 0.1 });
}

// ===== Boss 可变状态 =====
export const BOSS_INTERVAL = 60;       // Boss 出现间隔（秒）
export const bossState = {
  boss: null,                          // 当前 Boss，null 表示无
  bossTimer: BOSS_INTERVAL,            // 距离下一个 Boss 的倒计时
  bossSpawnIndex: 0,                   // 第几个 Boss（用于难度递增）
};

// ===== 刷怪可变状态 =====
export const spawnState = { spawnTimer: 0, spawnInterval: 0.9 };

// ===== 屏幕震动 =====
export const shakeState = { value: 0 };

// ===== 变形道具标志（每局仅一次）=====
export const transformState = { dropped: false };
