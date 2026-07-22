import { rand, clamp } from "./core/math.js";
import { ctx, elScore, elBest, elKills, elTime, elPower, elLives, viewport } from "./engine/viewport.js";
import { mouse, initInput, startGame } from "./engine/input.js";
import { state } from "./game/state.js";
import {
  player, maxPower,
  bullets, eBullets, enemies, powerups, particles, stars,
  BOSS_INTERVAL, bossState, spawnState, shakeState, transformState,
} from "./game/world.js";

// ===== 武器等级配置（1-10 级，1-5 为小飞机，6-10 为中型机变形后）=====
// ang: 相对正上方的角度偏移（弧度），0=直射向上
const WEAPON_LEVELS = [
  // L1 单发
  { interval: 0.11, shots: [{ ox: 0, oy: -18, ang: 0 }] },
  // L2 双发
  { interval: 0.11, shots: [{ ox: -7, oy: -16, ang: 0 }, { ox: 7, oy: -16, ang: 0 }] },
  // L3 三发
  { interval: 0.10, shots: [{ ox: 0, oy: -18, ang: 0 }, { ox: -9, oy: -14, ang: 0 }, { ox: 9, oy: -14, ang: 0 }] },
  // L4 三发直射 + 两发斜射
  { interval: 0.09, shots: [
    { ox: 0, oy: -18, ang: 0 },
    { ox: -9, oy: -14, ang: 0 },
    { ox: 9, oy: -14, ang: 0 },
    { ox: -11, oy: -10, ang: -0.25 },
    { ox: 11, oy: -10, ang: 0.25 },
  ] },
  // L5 三发直射 + 四发斜射（双排）
  { interval: 0.07, shots: [
    { ox: 0, oy: -18, ang: 0 },
    { ox: -9, oy: -14, ang: 0 },
    { ox: 9, oy: -14, ang: 0 },
    { ox: -11, oy: -10, ang: -0.25 },
    { ox: 11, oy: -10, ang: 0.25 },
    { ox: -13, oy: -6, ang: -0.55 },
    { ox: 13, oy: -6, ang: 0.55 },
  ] },
  // ===== 以下为变形后中型机火力（L6-L10）=====
  // L6 三核直射 + 双侧直射
  { interval: 0.07, shots: [
    { ox: 0, oy: -22, ang: 0 }, { ox: -6, oy: -18, ang: 0 }, { ox: 6, oy: -18, ang: 0 },
    { ox: -14, oy: -12, ang: 0 }, { ox: 14, oy: -12, ang: 0 },
  ] },
  // L7 三核 + 双侧斜射
  { interval: 0.06, shots: [
    { ox: 0, oy: -22, ang: 0 }, { ox: -6, oy: -18, ang: 0 }, { ox: 6, oy: -18, ang: 0 },
    { ox: -14, oy: -12, ang: -0.2 }, { ox: 14, oy: -12, ang: 0.2 },
    { ox: -18, oy: -8, ang: -0.4 }, { ox: 18, oy: -8, ang: 0.4 },
  ] },
  // L8 三核 + 双侧直射 + 双侧斜射
  { interval: 0.055, shots: [
    { ox: 0, oy: -22, ang: 0 }, { ox: -6, oy: -18, ang: 0 }, { ox: 6, oy: -18, ang: 0 },
    { ox: -12, oy: -16, ang: 0 }, { ox: 12, oy: -16, ang: 0 },
    { ox: -18, oy: -8, ang: -0.35 }, { ox: 18, oy: -8, ang: 0.35 },
    { ox: -22, oy: -4, ang: -0.6 }, { ox: 22, oy: -4, ang: 0.6 },
  ] },
  // L9 五核直射 + 四侧斜射
  { interval: 0.05, shots: [
    { ox: 0, oy: -22, ang: 0 }, { ox: -6, oy: -20, ang: 0 }, { ox: 6, oy: -20, ang: 0 },
    { ox: -12, oy: -16, ang: 0 }, { ox: 12, oy: -16, ang: 0 },
    { ox: -18, oy: -10, ang: -0.3 }, { ox: 18, oy: -10, ang: 0.3 },
    { ox: -24, oy: -6, ang: -0.5 }, { ox: 24, oy: -6, ang: 0.5 },
    { ox: -20, oy: 0, ang: -0.8 }, { ox: 20, oy: 0, ang: 0.8 },
  ] },
  // L10 重型全覆盖
  { interval: 0.045, shots: [
    { ox: 0, oy: -24, ang: 0 }, { ox: -6, oy: -22, ang: 0 }, { ox: 6, oy: -22, ang: 0 },
    { ox: -12, oy: -18, ang: 0 }, { ox: 12, oy: -18, ang: 0 },
    { ox: -18, oy: -12, ang: -0.25 }, { ox: 18, oy: -12, ang: 0.25 },
    { ox: -24, oy: -8, ang: -0.45 }, { ox: 24, oy: -8, ang: 0.45 },
    { ox: -28, oy: -2, ang: -0.7 }, { ox: 28, oy: -2, ang: 0.7 },
    { ox: -16, oy: 2, ang: -1.0 }, { ox: 16, oy: 2, ang: 1.0 },
  ] },
];

// 按当前武器等级发射子弹
function fireBullet() {
  const lvl = WEAPON_LEVELS[Math.min(player.power - 1, WEAPON_LEVELS.length - 1)];
  const speed = 780;
  for (const s of lvl.shots) {
    for (const b of bullets) {
      if (!b.active) {
        b.active = true;
        b.x = player.x + s.ox;
        b.y = player.y + s.oy;
        b.vx = Math.sin(s.ang) * speed;   // ang=0 时 vx=0 直射
        b.vy = -Math.cos(s.ang) * speed;  // 向上为负
        b.r = 4;
        break;
      }
    }
  }
}

// 发射一发敌方子弹（vx/vy 由调用方算好方向）
function fireEnemyBullet(x, y, vx, vy, r = 5) {
  for (const b of eBullets) {
    if (!b.active) {
      b.active = true;
      b.x = x; b.y = y;
      b.vx = vx; b.vy = vy;
      b.r = r;
      return;
    }
  }
}

// 敌机开火：aim 朝玩家发射追踪弹；spread 扇形散射
function enemyFire(e) {
  if (!e.fire) return;
  const sp = 220; // 敌弹速度
  if (e.fire.kind === "aim") {
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    fireEnemyBullet(e.x, e.y + e.r, (dx / d) * sp, (dy / d) * sp, 5);
  } else if (e.fire.kind === "spread") {
    // 三发扇形，朝下方偏两侧
    for (const off of [-0.45, 0, 0.45]) {
      const a = Math.PI / 2 + off; // 向下为基准
      fireEnemyBullet(e.x, e.y + e.r, Math.cos(a) * sp, Math.sin(a) * sp, 4.5);
    }
  } else if (e.fire.kind === "rain") {
    // 向下投弹（左右各一 + 中央，慢但封走位）
    for (const off of [-8, 0, 8]) {
      fireEnemyBullet(e.x + off, e.y + e.r, 0, sp * 0.7, 5.5);
    }
  }
}

// ===== 链式闪电（Q 切换）=====
// 无弹道：直接锁定范围内最近目标（含 Boss），再向附近敌机逐级跳转，伤害逐跳衰减
const LIGHTNING_LEVELS = [
  { interval: 0.55, dmg: 2, chains: 2 }, // L1
  { interval: 0.50, dmg: 2, chains: 3 },
  { interval: 0.45, dmg: 3, chains: 3 },
  { interval: 0.42, dmg: 3, chains: 4 },
  { interval: 0.38, dmg: 3, chains: 4 }, // L5
  { interval: 0.35, dmg: 4, chains: 5 },
  { interval: 0.32, dmg: 4, chains: 5 },
  { interval: 0.30, dmg: 5, chains: 6 },
  { interval: 0.28, dmg: 5, chains: 6 },
  { interval: 0.25, dmg: 6, chains: 7 }, // L10
];
const LIGHTNING_RANGE = 420;      // 主目标锁定范围
const LIGHTNING_CHAIN_RANGE = 170; // 跳转范围
const bolts = []; // 电弧视觉：{ pts: [{x,y}...], ttl, max }

// 从 (px,py) 命中目标并生成电弧；范围内无目标时返回 false
function strikeLightning(px, py, dmg, chains, range) {
  // 主目标：范围内最近的敌机或 Boss
  let best = null, bestD = range * range;
  for (const e of enemies) {
    const dx = e.x - px, dy = e.y - py;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = e; }
  }
  const boss = bossState.boss;
  if (boss) {
    const dx = boss.x - px, dy = boss.y - py;
    if (dx * dx + dy * dy < bestD) best = boss;
  }
  if (!best) return false;

  // 依次向最近的未命中敌机跳转
  const targets = [best];
  let cur = best;
  for (let c = 0; c < chains; c++) {
    let next = null, nextD = LIGHTNING_CHAIN_RANGE * LIGHTNING_CHAIN_RANGE;
    for (const e of enemies) {
      if (targets.includes(e)) continue;
      const dx = e.x - cur.x, dy = e.y - cur.y;
      const d = dx * dx + dy * dy;
      if (d < nextD) { nextD = d; next = e; }
    }
    if (!next) break;
    targets.push(next);
    cur = next;
  }

  // 结算伤害：主目标满伤，每跳 -1（至少 1）
  const dead = [];
  let d = dmg;
  for (const t of targets) {
    t.hp -= d;
    t.hit = 1;
    if (t !== boss && t.hp <= 0) dead.push(t);
    d = Math.max(1, d - 1);
  }
  for (const t of dead) killEnemy(t);
  if (dead.length) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) enemies.splice(i, 1);
    }
  }

  bolts.push({
    pts: [{ x: px, y: py }, ...targets.map((t) => ({ x: t.x, y: t.y }))],
    ttl: 0.14,
    max: 0.14,
  });
  return true;
}

// 命中目标并生成电弧；范围内无目标时返回 false（不进入开火冷却，快速重试）
function fireLightning() {
  const lvl = LIGHTNING_LEVELS[Math.min(player.power - 1, LIGHTNING_LEVELS.length - 1)];
  return strikeLightning(player.x, player.y - 18, lvl.dmg, lvl.chains, LIGHTNING_RANGE);
}

// ===== 贯穿镭射（Q 循环切换）=====
// 即时命中：沿机头垂直向上的光柱，宽度内所有敌机（含 Boss）全吃伤害，穿透不衰减
const LASER_LEVELS = [
  { interval: 0.75, dmg: 5,  width: 8  }, // L1
  { interval: 0.70, dmg: 6,  width: 9  },
  { interval: 0.65, dmg: 7,  width: 10 },
  { interval: 0.60, dmg: 8,  width: 11 },
  { interval: 0.55, dmg: 10, width: 12 }, // L5
  { interval: 0.52, dmg: 12, width: 14 },
  { interval: 0.48, dmg: 14, width: 16 },
  { interval: 0.45, dmg: 17, width: 18 },
  { interval: 0.42, dmg: 20, width: 21 },
  { interval: 0.38, dmg: 24, width: 24 }, // L10
];
const beams = []; // 光柱视觉：{ x, y0, y1, width, ttl, max }

// 从 (bx,by) 向上发出光柱，命中宽度内所有敌机（含 Boss）；visual=false 时不产生瞬时视觉（持续光炮复用）
function laserStrike(bx, by, width, dmg, visual = true) {
  const half = width / 2;
  const dead = [];
  for (const e of enemies) {
    if (e.y > by) continue; // 只打发射点上方
    if (Math.abs(e.x - bx) < half + e.r) {
      e.hp -= dmg;
      e.hit = 1;
      if (e.hp <= 0) dead.push(e);
    }
  }
  const boss = bossState.boss;
  if (boss && boss.y < by && Math.abs(boss.x - bx) < half + boss.r) {
    boss.hp -= dmg;
    boss.hit = 1;
  }
  for (const t of dead) killEnemy(t);
  if (dead.length) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) enemies.splice(i, 1);
    }
  }

  if (visual) beams.push({ x: bx, y0: by, y1: -10, width, ttl: 0.18, max: 0.18 });
}

function fireLaser() {
  const lvl = LASER_LEVELS[Math.min(player.power - 1, LASER_LEVELS.length - 1)];
  laserStrike(player.x, player.y - 20, lvl.width, lvl.dmg);
  shakeState.value = Math.min(shakeState.value + 2, 16); // 轻微后座震屏
  return true;
}

// ===== 追踪导弹（Q 循环切换）=====
// 真弹道：扇形离架后自动转向最近目标（含 Boss），目标死亡则重新锁定，高单发伤害
const MISSILE_LEVELS = [
  { interval: 0.90, count: 2, dmg: 3 }, // L1
  { interval: 0.85, count: 2, dmg: 4 },
  { interval: 0.80, count: 3, dmg: 4 },
  { interval: 0.75, count: 3, dmg: 5 },
  { interval: 0.70, count: 4, dmg: 5 }, // L5
  { interval: 0.65, count: 4, dmg: 6 },
  { interval: 0.60, count: 5, dmg: 6 },
  { interval: 0.55, count: 5, dmg: 7 },
  { interval: 0.52, count: 6, dmg: 7 },
  { interval: 0.48, count: 6, dmg: 8 }, // L10
];
const missiles = []; // { x, y, angle, speed, turn, dmg, target, trail, life }

// 全屏最近目标（敌机或 Boss），无目标返回 null
function nearestTarget(x, y) {
  let best = null, bestD = Infinity;
  for (const e of enemies) {
    const dx = e.x - x, dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = e; }
  }
  const boss = bossState.boss;
  if (boss) {
    const dx = boss.x - x, dy = boss.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) best = boss;
  }
  return best;
}

function launchMissile(x, y, angle, dmg) {
  missiles.push({
    x, y,
    angle,
    speed: 430,
    turn: 5.2,      // 转向速率（弧度/秒）
    dmg,
    target: null,   // 首帧 update 时锁定
    trail: [],
    life: 3.5,
  });
}

function fireMissiles() {
  const lvl = MISSILE_LEVELS[Math.min(player.power - 1, MISSILE_LEVELS.length - 1)];
  for (let c = 0; c < lvl.count; c++) {
    const spread = (c - (lvl.count - 1) / 2) * 0.5; // 向上扇形离架
    launchMissile(player.x, player.y - 16, -Math.PI / 2 + spread, lvl.dmg);
  }
  return true;
}

function updateMissiles(dt, W, H) {
  const boss = bossState.boss;
  for (let i = missiles.length - 1; i >= 0; i--) {
    const m = missiles[i];
    m.life -= dt;
    if (m.life <= 0) { missiles.splice(i, 1); continue; }

    // 目标失效（死亡/离场/Boss 已消失）时重新锁定
    if (m.target) {
      const valid = m.target === boss ? bossState.boss === m.target : enemies.includes(m.target);
      if (!valid) m.target = null;
    }
    if (!m.target) m.target = nearestTarget(m.x, m.y);

    // 朝目标限速转向
    if (m.target) {
      const desired = Math.atan2(m.target.y - m.y, m.target.x - m.x);
      let diff = desired - m.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      m.angle += clamp(diff, -m.turn * dt, m.turn * dt);
    }
    m.x += Math.cos(m.angle) * m.speed * dt;
    m.y += Math.sin(m.angle) * m.speed * dt;

    // 尾迹
    m.trail.push({ x: m.x, y: m.y });
    if (m.trail.length > 8) m.trail.shift();

    // 出界
    if (m.x < -30 || m.x > W + 30 || m.y < -30 || m.y > H + 30) { missiles.splice(i, 1); continue; }

    // 命中敌机
    let hit = false;
    for (const e of enemies) {
      const dx = e.x - m.x, dy = e.y - m.y;
      if (dx * dx + dy * dy < (e.r + 5) * (e.r + 5)) {
        e.hp -= m.dmg;
        e.hit = 1;
        if (e.hp <= 0) {
          killEnemy(e);
          enemies.splice(enemies.indexOf(e), 1);
        }
        hit = true;
        break;
      }
    }
    // 命中 Boss
    if (!hit && boss) {
      const dx = boss.x - m.x, dy = boss.y - m.y;
      if (dx * dx + dy * dy < (boss.r + 5) * (boss.r + 5)) {
        boss.hp -= m.dmg;
        boss.hit = 1;
        hit = true;
      }
    }
    if (hit) {
      explode(m.x, m.y, "#ffcf8a", 8, 0.6);
      missiles.splice(i, 1);
    }
  }
}

// ===== 僚机（浮游炮）系统 =====
// 随火力等级自动解锁：Lv3/Lv5/Lv8/Lv10 各 +1 架，编队跟随
// 弹幕跟随主武器，发射弱化版：机炮单发 / 闪电短链 / 细镭射 / 单枚导弹
const WINGMAN_ANCHORS = [
  { ox: -34, oy: 12 },
  { ox: 34, oy: 12 },
  { ox: -54, oy: 30 },
  { ox: 54, oy: 30 },
];
const WINGMAN_UNLOCK = [3, 5, 8, 10]; // 各架僚机解锁所需火力等级
const WINGMAN_INTERVALS = { gun: 0.28, lightning: 0.9, laser: 1.1, missile: 1.2 };
const wingmen = [];

// 僚机发射当前主武器的弱化版
function wingmanFire(w) {
  const lvlIdx = Math.min(player.power - 1, 9);
  if (player.weapon === "lightning") {
    const lvl = LIGHTNING_LEVELS[lvlIdx];
    strikeLightning(w.x, w.y - 8, Math.max(1, lvl.dmg - 1), Math.min(1, lvl.chains), 280);
  } else if (player.weapon === "laser") {
    const lvl = LASER_LEVELS[lvlIdx];
    laserStrike(w.x, w.y - 8, Math.max(4, lvl.width / 2), Math.ceil(lvl.dmg / 2));
  } else if (player.weapon === "missile") {
    const lvl = MISSILE_LEVELS[lvlIdx];
    launchMissile(w.x, w.y - 8, -Math.PI / 2 + rand(-0.3, 0.3), Math.max(1, lvl.dmg - 2));
  } else {
    // 机炮：单发直射（复用子弹池）
    for (const b of bullets) {
      if (!b.active) {
        b.active = true;
        b.x = w.x; b.y = w.y - 8;
        b.vx = 0; b.vy = -780;
        b.r = 3;
        break;
      }
    }
  }
}

function updateWingmen(dt) {
  // 按当前火力同步僚机数量
  const want = WINGMAN_UNLOCK.filter((lv) => player.power >= lv).length;
  while (wingmen.length < want) {
    const a = WINGMAN_ANCHORS[wingmen.length];
    wingmen.push({ x: player.x, y: player.y, ox: a.ox, oy: a.oy, fireCd: rand(0, WINGMAN_INTERVALS[player.weapon]) });
  }
  if (wingmen.length > want) wingmen.length = want;

  const t = 1 - Math.exp(-dt * 10); // 帧无关平滑跟随（比主机略滞后，有拖拽感）
  for (const w of wingmen) {
    w.x += (player.x + w.ox - w.x) * t;
    w.y += (player.y + w.oy - w.y) * t;
    w.x = clamp(w.x, 8, viewport.W - 8);
    w.fireCd -= dt;
    if (w.fireCd <= 0) {
      wingmanFire(w);
      w.fireCd = WINGMAN_INTERVALS[player.weapon] || 0.28;
    }
  }
}

// ===== 蓄力攻击（按住 A 蓄力，松开释放，形态随主武器）=====
const CHARGE_MAX = 1.5;  // 蓄满所需秒数
const CHARGE_MIN = 0.2;  // 低于此不触发
const chargeState = { t: 0 };
const superBeams = []; // 镭射大招：{ width, dmg, tick, ttl, max }（跟随机体持续伤害）
const balls = [];      // 球形闪电：{ x, y, vy, r, ttl, zapCd, dmg }

const chargeRatio = () => clamp(chargeState.t / CHARGE_MAX, 0, 1);

function releaseCharge() {
  const p = chargeRatio();
  const lvlIdx = Math.min(player.power - 1, 9);
  if (player.weapon === "lightning") {
    // 球形闪电：缓慢上飘，持续向周围放电
    const lvl = LIGHTNING_LEVELS[lvlIdx];
    balls.push({ x: player.x, y: player.y - 30, vy: -110, r: 18 + 26 * p, ttl: 2 + 1.5 * p, zapCd: 0, dmg: lvl.dmg + 1 });
  } else if (player.weapon === "laser") {
    // 持续光炮：3~6 倍柱宽，跟随机体持续伤害
    const lvl = LASER_LEVELS[lvlIdx];
    const ttl = 1.2 + 1.3 * p;
    superBeams.push({ width: lvl.width * (3 + 3 * p), dmg: lvl.dmg, tick: 0, ttl, max: ttl });
  } else if (player.weapon === "missile") {
    // 全弹齐射：8~16 枚大扇形
    const lvl = MISSILE_LEVELS[lvlIdx];
    const n = 8 + Math.round(8 * p);
    for (let c = 0; c < n; c++) {
      launchMissile(player.x, player.y - 16, -Math.PI / 2 + (c - (n - 1) / 2) * 0.28, lvl.dmg + 2);
    }
  } else {
    // 大号弹幕：120° 扇形大弹丸
    const n = 14 + Math.round(20 * p);
    for (let c = 0; c < n; c++) {
      const a = -Math.PI / 2 + ((c - (n - 1) / 2) * Math.PI * 0.75) / n;
      for (const b of bullets) {
        if (!b.active) {
          b.active = true;
          b.x = player.x; b.y = player.y - 18;
          b.vx = Math.cos(a) * 620; b.vy = Math.sin(a) * 620;
          b.r = 6;
          break;
        }
      }
    }
  }
  shakeState.value = Math.min(shakeState.value + 5 + 6 * p, 16);
}

function updateCharge(dt) {
  // 蓄力 / 松手释放
  if (player.charging) {
    chargeState.t = Math.min(chargeState.t + dt, CHARGE_MAX);
  } else if (chargeState.t > 0) {
    if (chargeState.t >= CHARGE_MIN) releaseCharge();
    chargeState.t = 0;
  }

  // 持续光炮：跟随机体，每 0.15s 结算一次伤害
  for (let i = superBeams.length - 1; i >= 0; i--) {
    const sb = superBeams[i];
    sb.ttl -= dt;
    if (sb.ttl <= 0) { superBeams.splice(i, 1); continue; }
    sb.tick -= dt;
    if (sb.tick <= 0) {
      laserStrike(player.x, player.y - 20, sb.width, sb.dmg, false);
      sb.tick = 0.15;
    }
  }

  // 球形闪电：上飘 + 周期放电
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.ttl -= dt;
    b.y += b.vy * dt;
    b.zapCd -= dt;
    if (b.zapCd <= 0) {
      strikeLightning(b.x, b.y, b.dmg, 2, 280);
      b.zapCd = 0.25;
    }
    if (b.ttl <= 0 || b.y < -b.r - 20) {
      explode(b.x, b.y, "#9affff", 16, 1.0);
      balls.splice(i, 1);
    }
  }
}

// ===== 道具（火力升级 / 变形）系统 =====
// 掉落概率：普通机 4%，Boss 必掉普通升级
function maybeDropPowerup(x, y, fromBoss) {
  if (fromBoss) {
    powerups.push({ x, y, vy: 70, r: 12, kind: "power" });
    return;
  }
  if (Math.random() < 0.04) powerups.push({ x, y, vy: 90, r: 12, kind: "power" });
}

function updatePowerups(dt) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += p.vy * dt;
    // 出界
    if (p.y - p.r > viewport.H) { powerups.splice(i, 1); continue; }
    // 拾取
    const dx = p.x - player.x, dy = p.y - player.y;
    if (dx * dx + dy * dy < (p.r + player.r) * (p.r + player.r)) {
      if (p.kind === "transform") {
        // 变形：升级为中型机，火力直接 +2
        if (!player.transformed) {
          player.transformed = true;
          player.power = Math.min(player.power + 2, maxPower());
          explode(p.x, p.y, "#9affff", 24, 1.2);
        }
      } else {
        if (player.power < maxPower()) player.power += 1;
        explode(p.x, p.y, "#ffe27a", 10, 0.6);
      }
      powerups.splice(i, 1);
    }
  }
}

// ===== Boss 系统 =====
// 每 BOSS_INTERVAL 秒出现一个 Boss；期间暂停普通刷怪，击杀后恢复。
function spawnBoss() {
  bossState.bossSpawnIndex += 1;
  const level = bossState.bossSpawnIndex;
  const hp = 600 + level * 200;   // 血量随波次递增
  bossState.boss = {
    x: viewport.W / 2,
    y: -120,
    r: 88,
    hp,
    maxHp: hp,
    vx: 60 + level * 8,          // 巡航速度
    dir: Math.random() < 0.5 ? 1 : -1,
    fireCd: 1.2,
    spin: 0,                    // 环形弹幕旋转角
    phase: 1,                   // 弹幕阶段
    hit: 0,
    alive: true,
  };
}

// Boss 弹幕：根据阶段切换
function bossFire() {
  const boss = bossState.boss;
  if (!boss) return;
  const ratio = boss.hp / boss.maxHp;
  boss.phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
  const sp = 200;

  if (boss.phase === 1) {
    // 阶段1：三连追踪弹
    const dx = player.x - boss.x, dy = player.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    for (const off of [-0.18, 0, 0.18]) {
      const ang = Math.atan2(dy, dx) + off;
      fireEnemyBullet(boss.x, boss.y + 20, Math.cos(ang) * sp, Math.sin(ang) * sp, 5.5);
    }
  } else if (boss.phase === 2) {
    // 阶段2：环形弹幕（带旋转）
    boss.spin += 0.4;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + boss.spin;
      fireEnemyBullet(boss.x, boss.y, Math.cos(a) * sp, Math.sin(a) * sp, 4.5);
    }
  } else {
    // 阶段3：环形 + 朝玩家追踪混合
    boss.spin += 0.5;
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + boss.spin;
      fireEnemyBullet(boss.x, boss.y, Math.cos(a) * sp, Math.sin(a) * sp, 4.5);
    }
    const dx = player.x - boss.x, dy = player.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    fireEnemyBullet(boss.x, boss.y, (dx / d) * (sp + 80), (dy / d) * (sp + 80), 6);
  }
}

function updateBoss(dt) {
  const boss = bossState.boss;
  if (!boss) return;
  boss.hit = Math.max(0, boss.hit - dt * 4);

  if (boss.y < viewport.H * 0.22) {
    // 入场
    boss.y += 90 * dt;
  } else {
    // 巡航：左右往返
    boss.x += boss.vx * boss.dir * dt;
    if (boss.x < boss.r) { boss.x = boss.r; boss.dir = 1; }
    else if (boss.x > viewport.W - boss.r) { boss.x = viewport.W - boss.r; boss.dir = -1; }
    // 开火
    boss.fireCd -= dt;
    const fireRate = boss.phase === 3 ? 0.7 : boss.phase === 2 ? 1.0 : 1.4;
    if (boss.fireCd <= 0) {
      bossFire();
      boss.fireCd = fireRate;
    }
  }

  // 玩家子弹命中 Boss
  for (const b of bullets) {
    if (!b.active) continue;
    const dx = b.x - boss.x, dy = b.y - boss.y;
    if (dx * dx + dy * dy < (boss.r + b.r) * (boss.r + b.r)) {
      b.active = false;
      boss.hp -= 1;
      boss.hit = 1;
    }
  }

  // 撞玩家
  const ddx = boss.x - player.x, ddy = boss.y - player.y;
  if (player.invincible <= 0 && ddx * ddx + ddy * ddy < (boss.r + player.r) * (boss.r + player.r)) {
    playerDie();
  }

  // 死亡
  if (boss.hp <= 0) {
    for (let i = 0; i < 4; i++) {
      explode(boss.x + rand(-30, 30), boss.y + rand(-30, 30), "#ffd27a", 20, 1.6);
    }
    explode(boss.x, boss.y, "#ff5a5a", 36, 2.2);
    state.score += 300;
    state.kills += 1;
    // 第一个 Boss 必掉变形道具（每局仅一次），之后掉普通升级
    if (!transformState.dropped) {
      powerups.push({ x: boss.x, y: boss.y, vy: 70, r: 14, kind: "transform" });
      transformState.dropped = true;
    } else {
      maybeDropPowerup(boss.x, boss.y, true);
    }
    bossState.boss = null;
    bossState.bossTimer = BOSS_INTERVAL;
    // 击杀后立刻清空场上残留敌弹，给玩家喘息
    eBullets.forEach((b) => (b.active = false));
  }
}

// ===== 敌机 =====
// 敌机类型配置：颜色、体积、速度、血量、分值、开火
// fire: null=不开火 / { interval:开火间隔, kind: 'aim'|'spread' }
const ENEMY_TYPES = {
  grunt:   { color: "#ff5a5a", glow: "#ff7a7a", r: [16, 20], vy: [140, 200], hp: 2, score: 10, fire: null },
  zigzag:  { color: "#5aff8f", glow: "#7aff9f", r: [16, 20], vy: [110, 150], hp: 4, score: 20, fire: null },
  diver:   { color: "#ffb347", glow: "#ffd27a", r: [13, 17], vy: [300, 380], hp: 2, score: 25, fire: null },
  gunner:  { color: "#ff5ad0", glow: "#ff8fe0", r: [18, 22], vy: [70, 100],  hp: 6, score: 30, fire: { interval: 1.6, kind: "spread" } },
  weaver:  { color: "#f5e85c", glow: "#fff58a", r: [14, 18], vy: [70, 100],  hp: 4, score: 25, fire: null },
  splitter:{ color: "#5affc0", glow: "#8affd6", r: [22, 26], vy: [90, 130],  hp: 4, score: 35, fire: null },
  bomber:  { color: "#5aa0ff", glow: "#8fc0ff", r: [30, 36], vy: [40, 60],   hp: 10, score: 55, fire: { interval: 1.3, kind: "rain" } },
  tank:    { color: "#b06bff", glow: "#c98bff", r: [26, 32], vy: [60, 95],   hp: 12, score: 40, fire: { interval: 1.9, kind: "aim" } },
};

// 按游戏时长解锁类型并加权抽取，形成难度曲线
function pickEnemyType() {
  const t = state.time;
  const pool = [["grunt", 1]];
  if (t > 12) pool.push(["zigzag", Math.min((t - 12) / 18, 0.7)]);
  if (t > 25) pool.push(["diver", Math.min((t - 25) / 20, 0.6)]);
  if (t > 30) pool.push(["gunner", Math.min((t - 30) / 20, 0.5)]);
  if (t > 35) pool.push(["weaver", Math.min((t - 35) / 20, 0.5)]);
  if (t > 45) pool.push(["splitter", Math.min((t - 45) / 25, 0.4)]);
  if (t > 50) pool.push(["bomber", Math.min((t - 50) / 30, 0.35)]);
  if (t > 40) pool.push(["tank", Math.min((t - 40) / 30, 0.3)]);
  let total = 0;
  for (const [, w] of pool) total += w;
  let roll = Math.random() * total;
  for (const [name, w] of pool) {
    roll -= w;
    if (roll <= 0) return name;
  }
  return "grunt";
}

function spawnEnemy() {
  const name = pickEnemyType();
  const cfg = ENEMY_TYPES[name];
  const r = rand(cfg.r[0], cfg.r[1]);
  const e = {
    type: name,
    x: rand(r, viewport.W - r),
    y: -r,
    r,
    vy: rand(cfg.vy[0], cfg.vy[1]),
    hp: cfg.hp,
    score: cfg.score,
    color: cfg.color,
    glow: cfg.glow,
    fire: cfg.fire,
    fireCd: cfg.fire ? rand(0.6, cfg.fire.interval) : 0, // 首次开火留点反应时间
    hit: 0,
    phase: rand(0, Math.PI * 2),
    angle: 0,
  };

  if (name === "zigzag") {
    e.amp = rand(40, 90);
    e.freq = rand(2, 3.4);
    e.baseX = clamp(e.x, r + e.amp, viewport.W - r - e.amp);
    e.x = e.baseX;
  } else if (name === "diver") {
    // 出场即朝玩家当前位置俯冲
    const dx = player.x - e.x, dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const sp = e.vy;
    e.vx = (dx / dist) * sp;
    e.vy = (dy / dist) * sp;
    e.angle = Math.atan2(e.vy, e.vx) - Math.PI / 2;
  } else if (name === "weaver") {
    // 蛇形横向走位：快横向 + 缓下降
    e.vx = (Math.random() < 0.5 ? -1 : 1) * rand(180, 240);
    e.baseVx = e.vx;
    e.weaveT = 0;
  } else if (name === "bomber") {
    // 下降到中部后悬停
    e.hoverY = rand(viewport.H * 0.18, viewport.H * 0.38);
    e.hovered = false;
  }
  enemies.push(e);
}

// ===== 粒子（爆炸）=====
function explode(x, y, color, count = 14, power = 1) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(60, 260) * power;
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: rand(0.3, 0.7),
      max: 0.7,
      color,
      r: rand(1.5, 3.5),
    });
  }
  shakeState.value = Math.min(shakeState.value + 6 * power, 16);
}

// 击杀敌机：爆炸、计分、掉落、分裂机裂变（不移出数组，由调用方 splice）
function killEnemy(e) {
  explode(e.x, e.y, e.glow, e.type === "tank" ? 24 : 16, e.type === "tank" ? 1.6 : 1);
  state.score += e.score;
  state.kills += 1;
  maybeDropPowerup(e.x, e.y, false);
  // 分裂机被击毁后裂成两架小型 grunt
  if (e.type === "splitter") {
    const cfg = ENEMY_TYPES.grunt;
    for (const dir of [-1, 1]) {
      enemies.push({
        type: "grunt",
        x: clamp(e.x + dir * 14, 12, viewport.W - 12),
        y: e.y,
        r: rand(cfg.r[0], cfg.r[1]),
        vy: rand(cfg.vy[0], cfg.vy[1]),
        hp: 1, score: 0, // 分裂出的不计分
        color: cfg.color, glow: cfg.glow, fire: null, fireCd: 0,
        hit: 0, phase: 0, angle: 0,
      });
    }
  }
}

// 玩家受击：扣命，原地复活 + 无敌闪烁；命尽才游戏结束
function playerDie() {
  explode(player.x, player.y, "#5fd0ff", 40, 2.2);
  state.lives -= 1;
  elLives.textContent = "♥".repeat(Math.max(0, state.lives)); // 死亡当帧立即刷新（游戏结束后 update 不再跑 HUD）
  if (state.lives <= 0) {
    player.alive = false;
    state.over = true;
    if (state.score > state.best) state.best = state.score;
  } else {
    player.invincible = 2.5; // 无敌时间（秒）
  }
}

function reset() {
  state.score = 0;
  state.kills = 0;
  state.over = false;
  state.paused = false;
  state.started = true;
  state.time = 0;
  state.lives = 3;
  player.x = viewport.W / 2;
  player.y = viewport.H * 0.8;
  mouse.x = player.x;
  mouse.y = player.y;
  player.alive = true;
  player.invincible = 0;
  player.power = 1;
  player.transformed = false;
  player.fireCooldown = 0;
  transformState.dropped = false;
  bullets.forEach((b) => (b.active = false));
  eBullets.forEach((b) => (b.active = false));
  enemies.length = 0;
  powerups.length = 0;
  particles.length = 0;
  bolts.length = 0;
  beams.length = 0;
  missiles.length = 0;
  wingmen.length = 0;
  superBeams.length = 0;
  balls.length = 0;
  chargeState.t = 0;
  player.charging = false;
  spawnState.spawnInterval = 0.9;
  bossState.boss = null;
  bossState.bossTimer = BOSS_INTERVAL;
  bossState.bossSpawnIndex = 0;
  shakeState.value = 0;
  startGame(); // 重开后请求 Pointer Lock
}

// ===== 主循环 =====
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // 防止切后台后大跳

  update(dt);
  render();
  requestAnimationFrame(frame);
}

function update(dt) {
  if (state.over || state.paused || !state.started) return;
  state.time += dt;
  const W = viewport.W, H = viewport.H;

  // 无敌时间衰减
  player.invincible = Math.max(0, player.invincible - dt);

  // 难度递增
  spawnState.spawnInterval = Math.max(0.35, 0.9 - state.time * 0.01);

  // --- 玩家跟手（帧无关平滑插值，目标即 Pointer Lock 累积坐标）---
  const k = 24;
  const t = 1 - Math.exp(-dt * k);
  player.x += (mouse.x - player.x) * t;
  player.y += (mouse.y - player.y) * t;
  player.x = clamp(player.x, player.r, W - player.r);
  player.y = clamp(player.y, player.r, H - player.r);

  // --- 蓄力攻击（蓄力中主机停火）---
  updateCharge(dt);

  // --- 自动开火（间隔随武器等级提升；闪电范围内无目标时快速重试）---
  player.fireCooldown -= dt;
  if (!player.charging && player.fireCooldown <= 0) {
    if (player.weapon === "lightning") {
      const lvl = LIGHTNING_LEVELS[Math.min(player.power - 1, LIGHTNING_LEVELS.length - 1)];
      player.fireCooldown = fireLightning() ? lvl.interval : 0.08;
    } else if (player.weapon === "laser") {
      const lvl = LASER_LEVELS[Math.min(player.power - 1, LASER_LEVELS.length - 1)];
      fireLaser();
      player.fireCooldown = lvl.interval;
    } else if (player.weapon === "missile") {
      const lvl = MISSILE_LEVELS[Math.min(player.power - 1, MISSILE_LEVELS.length - 1)];
      fireMissiles();
      player.fireCooldown = lvl.interval;
    } else {
      const wLvl = WEAPON_LEVELS[Math.min(player.power - 1, WEAPON_LEVELS.length - 1)];
      fireBullet();
      player.fireCooldown = wLvl.interval;
    }
  }

  // --- 子弹移动 ---
  for (const b of bullets) {
    if (!b.active) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -10 || b.x < -10 || b.x > W + 10) b.active = false;
  }

  // --- Boss 计时 / 普通敌机生成（Boss 期间暂停刷怪）---
  if (!bossState.boss) {
    bossState.bossTimer -= dt;
    if (bossState.bossTimer <= 0) {
      spawnBoss();
    } else {
      spawnState.spawnTimer -= dt;
      if (spawnState.spawnTimer <= 0) {
        spawnEnemy();
        spawnState.spawnTimer = spawnState.spawnInterval * rand(0.7, 1.3);
      }
    }
  }

  // --- Boss 更新 ---
  updateBoss(dt);

  // --- 敌机移动 + 与子弹碰撞 ---
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.hit = Math.max(0, e.hit - dt * 4);

    // 按类型移动
    if (e.type === "zigzag") {
      e.y += e.vy * dt;
      e.x = e.baseX + Math.sin((state.time + e.phase) * e.freq) * e.amp;
    } else if (e.type === "diver") {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else if (e.type === "weaver") {
      // 快速横向走位，撞边反弹，同时缓慢下降
      e.weaveT += dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx); }
      else if (e.x > W - e.r) { e.x = W - e.r; e.vx = -Math.abs(e.vx); }
      e.angle = Math.sin(e.weaveT * 6) * 0.5; // 摆动朝向
    } else if (e.type === "bomber") {
      // 下降到悬停高度后停止下降
      if (!e.hovered && e.y >= e.hoverY) { e.y = e.hoverY; e.hovered = true; }
      if (!e.hovered) e.y += e.vy * dt;
    } else {
      e.y += e.vy * dt;
    }

    // 开火（敌机进入画面后才开）
    if (e.fire && e.y > e.r) {
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        enemyFire(e);
        e.fireCd = e.fire.interval;
      }
    }

    // 子弹命中
    for (const b of bullets) {
      if (!b.active) continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) {
        b.active = false;
        e.hp -= 1;
        e.hit = 1;
        if (e.hp <= 0) {
          killEnemy(e);
          enemies.splice(i, 1);
          break;
        }
      }
    }
    if (!enemies[i]) continue;

    // 出界（敌机完全离开画面）
    if (e.y - e.r > H || e.x < -e.r - 20 || e.x > W + e.r + 20) {
      enemies.splice(i, 1);
      continue;
    }
    // 撞玩家
    const dx = e.x - player.x, dy = e.y - player.y;
    if (player.invincible <= 0 && dx * dx + dy * dy < (e.r + player.r) * (e.r + player.r)) {
      explode(e.x, e.y, "#ffb347", 20, 1.4);
      enemies.splice(i, 1);
      playerDie();
    }
  }

  // --- 追踪导弹 ---
  updateMissiles(dt, W, H);

  // --- 僚机 ---
  updateWingmen(dt);

  // --- 敌方子弹：移动 + 出界 + 命中玩家 ---
  for (const eb of eBullets) {
    if (!eb.active) continue;
    eb.x += eb.vx * dt;
    eb.y += eb.vy * dt;
    if (eb.x < -20 || eb.x > W + 20 || eb.y < -20 || eb.y > H + 20) {
      eb.active = false;
      continue;
    }
    const dx = eb.x - player.x, dy = eb.y - player.y;
    if (player.invincible <= 0 && dx * dx + dy * dy < (eb.r + player.r) * (eb.r + player.r)) {
      eb.active = false;
      playerDie();
    }
  }

  // --- 道具更新 ---
  updatePowerups(dt);

  // --- 粒子 ---
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  }

  // --- 电弧衰减 ---
  for (let i = bolts.length - 1; i >= 0; i--) {
    bolts[i].ttl -= dt;
    if (bolts[i].ttl <= 0) bolts.splice(i, 1);
  }

  // --- 光柱衰减 ---
  for (let i = beams.length - 1; i >= 0; i--) {
    beams[i].ttl -= dt;
    if (beams[i].ttl <= 0) beams.splice(i, 1);
  }

  // --- 星空 ---
  for (const s of stars) {
    s.y += (40 + s.z * 260) * dt;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  }

  // --- 震动衰减 ---
  shakeState.value *= Math.pow(0.0001, dt);

  // --- HUD ---
  elScore.textContent = state.score;
  elBest.textContent = state.best;
  elKills.textContent = state.kills;
  elTime.textContent = state.time.toFixed(0) + "s";
  elPower.textContent = (player.weapon === "lightning" ? "⚡" : player.weapon === "laser" ? "✦" : player.weapon === "missile" ? "🚀" : "") + "Lv" + player.power;
  elLives.textContent = "♥".repeat(Math.max(0, state.lives));
}

function render() {
  const W = viewport.W, H = viewport.H;
  ctx.save();
  // 屏幕震动
  if (shakeState.value > 0.3) {
    ctx.translate(rand(-shakeState.value, shakeState.value), rand(-shakeState.value, shakeState.value));
  }

  // 背景
  ctx.fillStyle = "#0a0e1a";
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // 星空
  for (const s of stars) {
    ctx.globalAlpha = 0.2 + s.z * 0.7;
    ctx.fillStyle = s.z > 0.7 ? "#bfe6ff" : "#5a7aa0";
    ctx.fillRect(s.x, s.y, s.z * 2, s.z * 5);
  }
  ctx.globalAlpha = 1;

  // 子弹
  for (const b of bullets) {
    if (!b.active) continue;
    ctx.fillStyle = "#aef";
    ctx.shadowColor = "#7fd0ff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // 敌方子弹（粉红辉光，区别于我方蓝色弹）
  for (const eb of eBullets) {
    if (!eb.active) continue;
    ctx.fillStyle = "#ffd0e6";
    ctx.shadowColor = "#ff5ad0";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // 道具（power 金色菱形 / transform 青色六角星）
  for (const p of powerups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(state.time * 2);
    if (p.kind === "transform") {
      // 变形道具：青色六角星
      ctx.fillStyle = "#9affff";
      ctx.shadowColor = "#5ad0ff";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const rr = k % 2 === 0 ? p.r : p.r * 0.5;
        const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#003a4a";
      ctx.font = "bold 12px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("T", p.x, p.y);
    } else {
      ctx.fillStyle = "#ffe27a";
      ctx.shadowColor = "#ffae42";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.lineTo(p.r, 0);
      ctx.lineTo(0, p.r);
      ctx.lineTo(-p.r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#5a3a00";
      ctx.font = "bold 13px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("P", p.x, p.y);
    }
  }
  ctx.shadowBlur = 0;
  ctx.textBaseline = "alphabetic";

  // 敌机
  for (const e of enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.fillStyle = e.hit > 0 ? "#fff" : e.color;
    ctx.shadowColor = e.glow;
    ctx.shadowBlur = e.hit > 0 ? 18 : 8;
    const r = e.r;
    ctx.beginPath();
    if (e.type === "tank") {
      // 六边形重装机
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (e.type === "zigzag") {
      // 菱形机动兵
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
    } else if (e.type === "diver") {
      // 尖箭头俯冲机
      ctx.moveTo(0, -r * 1.2);
      ctx.lineTo(r * 0.7, r);
      ctx.lineTo(0, r * 0.5);
      ctx.lineTo(-r * 0.7, r);
      ctx.closePath();
    } else if (e.type === "gunner") {
      // 带炮管的五边形炮手
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.95, -r * 0.3);
      ctx.lineTo(r * 0.6, r * 0.8);
      ctx.lineTo(-r * 0.6, r * 0.8);
      ctx.lineTo(-r * 0.95, -r * 0.3);
      ctx.closePath();
    } else if (e.type === "weaver") {
      // 窄长菱形（蛇形走位机）
      ctx.moveTo(0, -r * 1.1);
      ctx.lineTo(r * 0.5, 0);
      ctx.lineTo(0, r * 1.1);
      ctx.lineTo(-r * 0.5, 0);
      ctx.closePath();
    } else if (e.type === "splitter") {
      // 带裂缝的圆球（分裂机）
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.closePath();
    } else if (e.type === "bomber") {
      // 宽矩形机翼（轰炸机）
      ctx.moveTo(-r, -r * 0.4);
      ctx.lineTo(r, -r * 0.4);
      ctx.lineTo(r * 0.7, r * 0.4);
      ctx.lineTo(-r * 0.7, r * 0.4);
      ctx.closePath();
    } else {
      // grunt 杂兵三角
      ctx.moveTo(0, r);
      ctx.lineTo(-r, -r * 0.6);
      ctx.lineTo(0, -r * 0.3);
      ctx.lineTo(r, -r * 0.6);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  // Boss
  const boss = bossState.boss;
  if (boss) {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    // 主体：八角星形，颜色随阶段变红
    const ratio = boss.hp / boss.maxHp;
    const col = ratio > 0.66 ? "#b06bff" : ratio > 0.33 ? "#ff6bb5" : "#ff4040";
    ctx.fillStyle = boss.hit > 0 ? "#fff" : col;
    ctx.shadowColor = col;
    ctx.shadowBlur = boss.hit > 0 ? 24 : 14;
    const r = boss.r;
    ctx.beginPath();
    const points = 8;
    for (let k = 0; k < points * 2; k++) {
      const rr = k % 2 === 0 ? r : r * 0.62;
      const a = (k / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // 核心
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Boss 血条（顶部）
  if (boss) {
    const barW = W * 0.7, barH = 8;
    const bx = (W - barW) / 2, by = 14;
    ctx.fillStyle = "rgba(80,180,255,0.12)";
    ctx.fillRect(bx, by, barW, barH);
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = ratio > 0.66 ? "#b06bff" : ratio > 0.33 ? "#ff6bb5" : "#ff4040";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fillRect(bx, by, barW * ratio, barH);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#aef";
    ctx.textAlign = "center";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.fillText("BOSS", W / 2, by - 3);
  }

  // 追踪导弹：橙色三角弹体（朝速度方向）+ 渐隐尾迹
  for (const m of missiles) {
    if (m.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(m.trail[0].x, m.trail[0].y);
      for (const p of m.trail) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "rgba(255,180,100,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle + Math.PI / 2);
    ctx.fillStyle = "#ffd27a";
    ctx.shadowColor = "#ffae42";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  // 光柱（贯穿镭射）：金色辉光柱 + 白色内芯，alpha 随寿命衰减
  for (const b of beams) {
    ctx.globalAlpha = clamp(b.ttl / b.max, 0, 1);
    ctx.fillStyle = "#ffe27a";
    ctx.shadowColor = "#ffae42";
    ctx.shadowBlur = 18;
    ctx.fillRect(b.x - b.width / 2, b.y1, b.width, b.y0 - b.y1);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.fillRect(b.x - b.width * 0.2, b.y1, b.width * 0.4, b.y0 - b.y1);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // 持续光炮（镭射蓄力大招）：宽幅金柱跟随机体，闪烁衰减
  for (const sb of superBeams) {
    const a = clamp(sb.ttl / sb.max, 0, 1) * (0.75 + 0.25 * Math.sin(state.time * 30));
    ctx.globalAlpha = a;
    ctx.fillStyle = "#ffe27a";
    ctx.shadowColor = "#ffae42";
    ctx.shadowBlur = 26;
    ctx.fillRect(player.x - sb.width / 2, -10, sb.width, player.y - 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.fillRect(player.x - sb.width * 0.15, -10, sb.width * 0.3, player.y - 10);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // 球形闪电（闪电蓄力大招）：辉光球体 + 表面抖动电弧
  for (const b of balls) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.globalAlpha = clamp(b.ttl / 0.5, 0, 1);
    ctx.fillStyle = "rgba(154,255,255,0.28)";
    ctx.shadowColor = "#5ad0ff";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bffcff";
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) {
      const a0 = rand(0, Math.PI * 2), a1 = a0 + rand(0.6, 1.6);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * b.r, Math.sin(a0) * b.r);
      ctx.lineTo(Math.cos((a0 + a1) / 2) * b.r * rand(0.2, 0.6), Math.sin((a0 + a1) / 2) * b.r * rand(0.2, 0.6));
      ctx.lineTo(Math.cos(a1) * b.r, Math.sin(a1) * b.r);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // 电弧（链式闪电）：每帧重新抖动折线，白色内芯 + 青色辉光
  for (const b of bolts) {
    ctx.globalAlpha = clamp(b.ttl / b.max, 0, 1);
    ctx.beginPath();
    for (let i = 0; i < b.pts.length - 1; i++) {
      const p0 = b.pts[i], p1 = b.pts[i + 1];
      ctx.moveTo(p0.x, p0.y);
      const segs = 4;
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        ctx.lineTo(
          p0.x + (p1.x - p0.x) * t + rand(-14, 14),
          p0.y + (p1.y - p0.y) * t + rand(-14, 14),
        );
      }
      ctx.lineTo(p1.x, p1.y);
    }
    ctx.strokeStyle = "#7fe8ff";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#5ad0ff";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // 僚机：青色小六边形 + 尾焰
  for (const w of wingmen) {
    ctx.save();
    ctx.translate(w.x, w.y);
    const wflame = 4 + Math.sin(state.time * 40 + w.ox) * 2;
    ctx.fillStyle = "#ffd27a";
    ctx.shadowColor = "#ffae42";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-3, 6);
    ctx.lineTo(0, 6 + wflame);
    ctx.lineTo(3, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7fd0ff";
    ctx.shadowColor = "#5fd0ff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const px = Math.cos(a) * 7, py = Math.sin(a) * 7;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  // 玩家
  if (player.alive) {
    ctx.save();
    ctx.translate(player.x, player.y);
    // 无敌期间闪烁
    if (player.invincible > 0) ctx.globalAlpha = 0.4 + 0.3 * Math.sin(state.time * 20);

    if (player.transformed) {
      // ===== 中型机：多喷射双引擎，更大体型 =====
      const flame = 8 + Math.sin(state.time * 40) * 4;
      // 左右双引擎尾焰
      ctx.fillStyle = "#ffd27a";
      ctx.shadowColor = "#ffae42";
      ctx.shadowBlur = 14;
      for (const ex of [-11, 11]) {
        ctx.beginPath();
        ctx.moveTo(ex - 4, 14);
        ctx.lineTo(ex, 14 + flame);
        ctx.lineTo(ex + 4, 14);
        ctx.closePath();
        ctx.fill();
      }
      // 中央主引擎
      ctx.beginPath();
      ctx.moveTo(-4, 16);
      ctx.lineTo(0, 16 + flame * 0.7);
      ctx.lineTo(4, 16);
      ctx.closePath();
      ctx.fill();

      // 主机身（宽翼）
      ctx.fillStyle = "#5ad0ff";
      ctx.shadowColor = "#5fd0ff";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-20, 6);
      ctx.lineTo(-14, 12);
      ctx.lineTo(-6, 8);
      ctx.lineTo(0, 14);
      ctx.lineTo(6, 8);
      ctx.lineTo(14, 12);
      ctx.lineTo(20, 6);
      ctx.lineTo(8, -10);
      ctx.closePath();
      ctx.fill();

      // 侧炮管
      ctx.fillStyle = "#9fe8ff";
      ctx.shadowBlur = 0;
      ctx.fillRect(-16, -4, 4, 12);
      ctx.fillRect(12, -4, 4, 12);

      // 驾驶舱
      ctx.fillStyle = "#eaf7ff";
      ctx.beginPath();
      ctx.arc(0, -6, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ===== 小飞机 =====
      const flame = 6 + Math.sin(state.time * 40) * 3;
      ctx.fillStyle = "#ffd27a";
      ctx.shadowColor = "#ffae42";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-5, 10);
      ctx.lineTo(0, 10 + flame);
      ctx.lineTo(5, 10);
      ctx.closePath();
      ctx.fill();

      // 机身
      ctx.fillStyle = "#7fd0ff";
      ctx.shadowColor = "#5fd0ff";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(-12, 10);
      ctx.lineTo(0, 5);
      ctx.lineTo(12, 10);
      ctx.closePath();
      ctx.fill();
      // 驾驶舱
      ctx.fillStyle = "#eaf7ff";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 粒子
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  ctx.restore();

  // 蓄力光环：武器色圆环随蓄力扩大（画在震动坐标系外，稳定指示）
  if (player.charging && chargeState.t > 0) {
    const p = chargeRatio();
    const col = player.weapon === "laser" ? "#ffe27a" : player.weapon === "lightning" ? "#9affff" : player.weapon === "missile" ? "#ffae42" : "#7fd0ff";
    ctx.globalAlpha = 0.4 + 0.6 * p;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2 + 3 * p;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 26 + 30 * p + Math.sin(state.time * 12) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // 开始遮罩
  if (!state.started && !state.over) {
    ctx.fillStyle = "rgba(5,6,10,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7fd0ff";
    ctx.textAlign = "center";
    ctx.font = "bold 30px -apple-system, sans-serif";
    ctx.fillText("雷霆战机", W / 2, H / 2 - 18);
    ctx.font = "15px -apple-system, sans-serif";
    ctx.fillStyle = "#8fd0ff";
    ctx.fillText("点击画布开始", W / 2, H / 2 + 14);
    ctx.font = "12px -apple-system, sans-serif";
    ctx.fillStyle = "#5a7aa0";
    ctx.fillText("ESC 暂停 · R 重开", W / 2, H / 2 + 40);
  }

  // 暂停遮罩
  if (state.paused && !state.over) {
    ctx.fillStyle = "rgba(5,6,10,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7fd0ff";
    ctx.textAlign = "center";
    ctx.font = "bold 32px -apple-system, sans-serif";
    ctx.fillText("已暂停", W / 2, H / 2 - 8);
    ctx.font = "15px -apple-system, sans-serif";
    ctx.fillStyle = "#8fd0ff";
    ctx.fillText("点击画布继续", W / 2, H / 2 + 24);
  }

  // 游戏结束遮罩
  if (state.over) {
    ctx.fillStyle = "rgba(5,6,10,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7fd0ff";
    ctx.textAlign = "center";
    ctx.font = "bold 32px -apple-system, sans-serif";
    ctx.fillText("游戏结束", W / 2, H / 2 - 10);
    ctx.font = "16px -apple-system, sans-serif";
    ctx.fillStyle = "#aef";
    ctx.fillText("最终分数: " + state.score, W / 2, H / 2 + 22);
    ctx.fillStyle = "#8fd0ff";
    ctx.fillText("点击屏幕或按 R 重新开始", W / 2, H / 2 + 50);
  }
}

// 注入依赖（state/player 来自模块，reset 定义在本文件，避免循环 import）
initInput({ state, player, reset });
requestAnimationFrame(frame);
