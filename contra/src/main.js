import { rand, clamp } from "./core/math.js";
import { ctx, elScore, elBest, elKills, elTime, viewport } from "./engine/viewport.js";
import { keys, initInput } from "./engine/input.js";
import { state } from "./game/state.js";
import {
  WORLD_W, player, bullets, enemies, particles, stars, camera, shakeState, spawnState,
} from "./game/world.js";

// ===== 手感参数 =====
const GRAVITY = 2600;        // 重力加速度
const MOVE_SPEED = 300;      // 跑动速度
const ACCEL = 3800;          // 地面/空中加速（快速逼近目标速度，手感干脆）
const JUMP_V = 950;          // 起跳初速度（跳高约 173px）
const JUMP_CUT = 0.45;       // 松开跳跃键时的上升速度衰减（可变跳高）
const COYOTE = 0.1;          // 土狼时间：离地后仍可起跳的宽限
const JUMP_BUFFER = 0.12;    // 落地前按跳也可起跳的预输入缓冲
const FIRE_INTERVAL = 0.13;  // 射速
const BULLET_SPEED = 950;
const BULLET_TTL = 1.1;

const groundY = () => viewport.H - 130;

let hitStop = 0;             // 击杀顿帧
let prevJump = false;        // 上一帧跳跃键状态（用于边沿检测）

// ===== 特效 =====
function explode(x, y, color, n, power) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(60, 320) * power;
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 80,
      ttl: rand(0.3, 0.7), max: 0.7,
      size: rand(2, 4.5),
      color,
      grav: 900,
    });
  }
}

function dust(x, y, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x: x + rand(-8, 8), y,
      vx: rand(-60, 60), vy: rand(-70, -10),
      ttl: rand(0.2, 0.4), max: 0.4,
      size: rand(1.5, 3),
      color: "#8a7a5a",
      grav: 300,
    });
  }
}

// ===== 射击 =====
// 八向瞄准：默认朝向前方；↑ 朝上（配合左右斜上）；空中 ↓ 朝下/斜下；地面 ↓ 卧射
function aimVector(move, up, down) {
  if (up) return move !== 0 ? [move * 0.707, -0.707] : [0, -1];
  if (down) {
    if (player.grounded) return [player.dir, 0]; // 卧倒平射
    return move !== 0 ? [move * 0.707, 0.707] : [0, 1];
  }
  return [player.dir, 0];
}

function fireBullet(ax, ay) {
  for (const b of bullets) {
    if (!b.active) {
      const h = player.crouch ? 22 : player.h;
      b.active = true;
      b.x = player.x + ax * 16;
      b.y = player.y - h * 0.65 + ay * 16;
      b.vx = ax * BULLET_SPEED;
      b.vy = ay * BULLET_SPEED;
      b.r = 4;
      b.ttl = BULLET_TTL;
      return;
    }
  }
}

// ===== 刷怪：从镜头右缘外刷出（接近世界尽头则从左缘），朝玩家冲锋 =====
function spawnInterval() {
  return Math.max(0.7, 1.6 - state.time * 0.015);
}

function spawnEnemy() {
  if (enemies.length >= 10) return;
  let x;
  if (camera.x + viewport.W + 60 < WORLD_W - 40) {
    x = camera.x + viewport.W + 60;          // 右侧进攻
  } else if (camera.x - 60 > 40) {
    x = camera.x - 60;                        // 左侧包抄
  } else {
    return;
  }
  enemies.push({ x, y: groundY(), w: 14, h: 30, speed: rand(130, 190) });
}

// ===== 击杀与死亡 =====
function killEnemy(e) {
  state.score += 100;
  state.kills += 1;
  explode(e.x, e.y - e.h / 2, "#ff7a5a", 14, 1);
  shakeState.value = Math.min(shakeState.value + 2.5, 10);
  hitStop = 0.03; // 击杀顿帧
}

function killPlayer() {
  if (!player.alive) return;
  player.alive = false;
  state.over = true;
  explode(player.x, player.y - player.h / 2, "#ffb37f", 30, 1.6);
  shakeState.value = 18;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem("contra-best", state.best);
  hud();
}

// ===== 重置 =====
function reset() {
  state.score = 0;
  state.kills = 0;
  state.time = 0;
  state.over = false;
  player.x = 120;
  player.y = groundY();
  player.vx = 0;
  player.vy = 0;
  player.dir = 1;
  player.grounded = true;
  player.crouch = false;
  player.fireCd = 0;
  player.alive = true;
  camera.x = 0;
  shakeState.value = 0;
  spawnState.timer = 1.2;
  enemies.length = 0;
  particles.length = 0;
  for (const b of bullets) b.active = false;
  hitStop = 0;
  hud();
}

function hud() {
  elScore.textContent = state.score;
  elBest.textContent = state.best;
  elKills.textContent = state.kills;
  elTime.textContent = Math.floor(state.time) + "s";
}

// ===== 更新 =====
function updatePlayer(dt) {
  const move = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const up = !!(keys.KeyW || keys.ArrowUp);
  const down = !!(keys.KeyS || keys.ArrowDown);
  const jumpHeld = !!(keys.KeyK || keys.Space);

  player.crouch = down && player.grounded;
  if (move !== 0 && !player.crouch) player.dir = move;

  // 水平移动：快速逼近目标速度，干脆利落
  const target = player.crouch ? 0 : move * MOVE_SPEED;
  const dv = clamp(target - player.vx, -ACCEL * dt, ACCEL * dt);
  player.vx += dv;

  // 跳跃：预输入缓冲 + 土狼时间 + 可变跳高
  if (player.grounded) player.coyote = COYOTE;
  else player.coyote -= dt;
  if (jumpHeld && !prevJump) player.jumpBuf = JUMP_BUFFER;
  else player.jumpBuf -= dt;
  if (player.jumpBuf > 0 && player.coyote > 0) {
    player.vy = -JUMP_V;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuf = 0;
    dust(player.x, player.y, 4);
  }
  if (!jumpHeld && prevJump && player.vy < 0) player.vy *= JUMP_CUT;
  prevJump = jumpHeld;

  // 垂直运动
  player.vy += GRAVITY * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = clamp(player.x, 20, WORLD_W - 20);

  const gy = groundY();
  if (player.y >= gy) {
    if (!player.grounded && player.vy > 500) dust(player.x, gy, 7); // 重落地扬尘
    player.y = gy;
    player.vy = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }

  // 射击
  player.fireCd -= dt;
  player.flash = Math.max(0, player.flash - dt);
  if (keys.KeyJ && player.fireCd <= 0) {
    player.fireCd = FIRE_INTERVAL;
    const [ax, ay] = aimVector(move, up, down);
    fireBullet(ax, ay);
    player.flash = 0.06;
  }
}

function updateBullets(dt) {
  for (const b of bullets) {
    if (!b.active) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0 || b.x < 0 || b.x > WORLD_W || b.y > groundY() + 4) {
      b.active = false;
      continue;
    }
    // 命中敌兵（圆 vs 站立矩形近似）
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.abs(b.x - e.x) < e.w / 2 + b.r && b.y > e.y - e.h - b.r && b.y < e.y + b.r) {
        b.active = false;
        killEnemy(e);
        enemies.splice(i, 1);
        break;
      }
    }
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.x += Math.sign(player.x - e.x) * e.speed * dt;
    e.y = groundY();
    // 离镜头太远的清理
    if (e.x < camera.x - 240 || e.x > camera.x + viewport.W + 240) {
      enemies.splice(i, 1);
      continue;
    }
    // 触碰到玩家 → 死亡（一命制）
    const ph = player.crouch ? 22 : player.h;
    if (
      Math.abs(e.x - player.x) < (e.w + player.w) / 2 &&
      player.y > e.y - e.h && player.y - ph < e.y
    ) {
      killPlayer();
      return;
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.ttl -= dt;
    if (p.ttl <= 0) { particles.splice(i, 1); continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

function updateCamera(dt) {
  // 跟随 + 朝向预瞄偏移，镜头平滑追赶
  const target = clamp(
    player.x - viewport.W * 0.42 + player.dir * 70,
    0,
    Math.max(0, WORLD_W - viewport.W),
  );
  camera.x += (target - camera.x) * (1 - Math.exp(-dt * 8));
}

function update(dt) {
  state.time += dt;
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateParticles(dt);
  updateCamera(dt);
  spawnState.timer -= dt;
  if (spawnState.timer <= 0) {
    spawnEnemy();
    spawnState.timer = spawnInterval();
  }
  shakeState.value = Math.max(0, shakeState.value - dt * 40);
  hud();
}

// ===== 渲染 =====
function drawBackground(gy) {
  // 天空
  const g = ctx.createLinearGradient(0, 0, 0, viewport.H);
  g.addColorStop(0, "#0a1410");
  g.addColorStop(0.7, "#0d1a12");
  g.addColorStop(1, "#12241a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewport.W, viewport.H);

  // 星星（视差）
  ctx.fillStyle = "#3a5a48";
  for (const s of stars) {
    const sx = ((s.x - camera.x * s.p) % viewport.W + viewport.W) % viewport.W;
    ctx.fillRect(sx, s.y * gy * 0.8, 1.6, 1.6);
  }

  // 远山（两层视差剪影）
  drawHills(gy, 0.25, 300, 90, "#0e241c");
  drawHills(gy, 0.45, 220, 60, "#122e22");

  // 地面
  ctx.fillStyle = "#0c1f16";
  ctx.fillRect(0, gy, viewport.W, viewport.H - gy);
  ctx.fillStyle = "#ff9a3c";
  ctx.fillRect(0, gy - 1.5, viewport.W, 3);
  // 地面网格（锁定世界坐标，随镜头滚动）
  ctx.fillStyle = "rgba(255,154,60,0.10)";
  const step = 64;
  const start = Math.floor(camera.x / step) * step;
  for (let wx = start; wx < camera.x + viewport.W + step; wx += step) {
    ctx.fillRect(wx - camera.x, gy, 1.5, viewport.H - gy);
  }
}

function drawHills(gy, parallax, gap, hBase, color) {
  ctx.fillStyle = color;
  const off = camera.x * parallax;
  const start = Math.floor(off / gap) * gap;
  for (let wx = start; wx < off + viewport.W + gap; wx += gap) {
    const i = Math.round(wx / gap);
    const h = hBase + ((i * 73) % 50);
    const sx = wx - off;
    ctx.beginPath();
    ctx.moveTo(sx - gap * 0.6, gy);
    ctx.lineTo(sx, gy - h);
    ctx.lineTo(sx + gap * 0.6, gy);
    ctx.fill();
  }
}

function drawPlayer() {
  if (!player.alive) return;
  const sx = player.x - camera.x;
  const h = player.crouch ? 22 : player.h;
  const bodyH = player.crouch ? 12 : 22;

  // 枪（朝瞄准方向）
  const move = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const up = !!(keys.KeyW || keys.ArrowUp);
  const down = !!(keys.KeyS || keys.ArrowDown);
  const [ax, ay] = aimVector(move, up, down);
  const gx = sx + ax * 6;
  const gy2 = player.y - h * 0.65 + ay * 6;
  ctx.strokeStyle = "#9fe8ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gx, gy2);
  ctx.lineTo(gx + ax * 14, gy2 + ay * 14);
  ctx.stroke();

  // 枪口闪光
  if (player.flash > 0) {
    ctx.fillStyle = "#ffe27a";
    ctx.beginPath();
    ctx.arc(gx + ax * 16, gy2 + ay * 16, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 身体
  ctx.fillStyle = "#ff9a3c";
  ctx.fillRect(sx - 7, player.y - bodyH - 6, 14, bodyH);
  // 头
  ctx.fillStyle = "#ffd9b0";
  ctx.fillRect(sx - 5, player.y - bodyH - 14, 10, 8);
  // 腿（站立时）
  if (!player.crouch) {
    ctx.fillStyle = "#c06828";
    ctx.fillRect(sx - 6, player.y - 6, 5, 6);
    ctx.fillRect(sx + 1, player.y - 6, 5, 6);
  }
}

function drawEnemies() {
  for (const e of enemies) {
    const sx = e.x - camera.x;
    ctx.fillStyle = "#ff5a5a";
    ctx.fillRect(sx - 7, e.y - 28, 14, 22);
    ctx.fillStyle = "#ffb0a0";
    ctx.fillRect(sx - 5, e.y - 36, 10, 8);
    ctx.fillStyle = "#a03030";
    ctx.fillRect(sx - 6, e.y - 6, 5, 6);
    ctx.fillRect(sx + 1, e.y - 6, 5, 6);
  }
}

function drawBullets() {
  for (const b of bullets) {
    if (!b.active) continue;
    const sx = b.x - camera.x;
    // 短曳光：从当前位置沿速度反方向拖一线
    ctx.strokeStyle = "rgba(159,232,255,0.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx - b.vx * 0.014, b.y - b.vy * 0.014);
    ctx.lineTo(sx, b.y);
    ctx.stroke();
    ctx.fillStyle = "#dff6ff";
    ctx.beginPath();
    ctx.arc(sx, b.y, b.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.ttl / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - camera.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  if (state.started && !state.over) return;
  ctx.fillStyle = "rgba(5,8,6,0.72)";
  ctx.fillRect(0, 0, viewport.W, viewport.H);
  ctx.textAlign = "center";
  if (!state.started) {
    ctx.fillStyle = "#ffd9b0";
    ctx.font = "800 44px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText("赤色战线", viewport.W / 2, viewport.H * 0.4);
    ctx.fillStyle = "#ffb37f";
    ctx.font = "15px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText("←→ 移动 · K 跳跃 · J 射击 · ↑↓ 瞄准", viewport.W / 2, viewport.H * 0.4 + 44);
    ctx.fillStyle = "#c09060";
    ctx.font = "13px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText("按任意键开始", viewport.W / 2, viewport.H * 0.4 + 80);
  } else {
    ctx.fillStyle = "#ff5a5a";
    ctx.font = "800 44px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText("任务失败", viewport.W / 2, viewport.H * 0.4);
    ctx.fillStyle = "#ffd9b0";
    ctx.font = "18px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText(`得分 ${state.score} · 击杀 ${state.kills}`, viewport.W / 2, viewport.H * 0.4 + 44);
    ctx.fillStyle = "#c09060";
    ctx.font = "13px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText("按 R 重新开始", viewport.W / 2, viewport.H * 0.4 + 78);
  }
}

function render() {
  const gy = groundY();
  ctx.save();
  // 屏幕震动施加在整个场景上
  const s = shakeState.value;
  if (s > 0) ctx.translate(rand(-s, s) * 0.5, rand(-s, s) * 0.5);
  drawBackground(gy);
  drawParticles();
  drawEnemies();
  drawPlayer();
  drawBullets();
  ctx.restore();
  drawOverlay();
}

// ===== 主循环 =====
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  if (hitStop > 0) {
    hitStop -= dt; // 顿帧：冻结世界，保留渲染
  } else if (state.started && !state.over) {
    update(dt);
  } else {
    // 开始界面 / 结算界面仍让粒子与震动衰减
    updateParticles(dt);
    shakeState.value = Math.max(0, shakeState.value - dt * 40);
  }
  render();
  requestAnimationFrame(frame);
}

state.best = Number(localStorage.getItem("contra-best")) || 0;
initInput({ state, reset });
reset();
state.started = false; // reset 后回到开始界面
requestAnimationFrame(frame);
