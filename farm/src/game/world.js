// ===== 田地：布局 / 地块 / 生长 / 渲染 =====
import { viewport } from "../engine/viewport.js";
import { clamp } from "../core/math.js";
import { cropById } from "./crops.js";
import { state } from "./state.js";

export const COLS = 5;
export const ROWS = 4;

// 网格几何（resize 时由 initField 重新计算）
export const field = { x0: 0, y0: 0, plot: 0 };
// 每块地：{ crop: null | { kind, t0 } }，crop 为 null 表示空地
export const plots = [];

let tufts = []; // 背景草丛装饰（静态，resize 时重建）
let now = 0;    // 游戏时钟（秒，基于挂钟时间，切后台也能继续生长）
let lastMs = 0;

export function initField() {
  const pad = Math.min(viewport.W, viewport.H) * 0.07;
  field.plot = Math.min((viewport.W - pad * 2) / COLS, (viewport.H - pad * 2) / ROWS);
  field.x0 = (viewport.W - field.plot * COLS) / 2;
  field.y0 = (viewport.H - field.plot * ROWS) / 2;

  // 首次创建地块；resize 时保留作物状态
  if (plots.length !== COLS * ROWS) {
    plots.length = 0;
    for (let i = 0; i < COLS * ROWS; i++) plots.push({ crop: null });
  }

  tufts = [];
  for (let i = 0; i < 46; i++) {
    tufts.push({
      x: Math.random() * viewport.W,
      y: Math.random() * viewport.H,
      s: 0.6 + Math.random() * 0.9,
    });
  }
}

// 命中检测：返回地块下标，未命中返回 -1
export function hitTest(x, y) {
  const col = Math.floor((x - field.x0) / field.plot);
  const row = Math.floor((y - field.y0) / field.plot);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1;
  return row * COLS + col;
}

// 每帧推进时钟（ms 为 rAF 时间戳，跨帧差值被钳制）
export function update(ms) {
  const dt = lastMs ? Math.min((ms - lastMs) / 1000, 0.05) : 0;
  lastMs = ms;
  now = ms / 1000;
}

// 种植：空地种下当前选择的作物
export function plant(idx) {
  const crop = cropById(state.selected);
  plots[idx].crop = { kind: crop.id, t0: now };
}

// 生长进度 0~1（空地返回 0）
export function progressOf(idx) {
  const plot = plots[idx];
  if (!plot.crop) return 0;
  const crop = cropById(plot.crop.kind);
  return clamp((now - plot.crop.t0) / crop.growTime, 0, 1);
}

// 地块中心坐标
function center(i) {
  const col = i % COLS;
  const row = (i / COLS) | 0;
  return { x: field.x0 + (col + 0.5) * field.plot, y: field.y0 + (row + 0.5) * field.plot };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 画一块地（悬停时高亮边框）
function drawPlot(ctx, i, hovered) {
  const p = field.plot;
  const { x: cx, y: cy } = center(i);
  const x = cx - p / 2 + p * 0.045;
  const y = cy - p / 2 + p * 0.045;
  const w = p * 0.91;
  const h = p * 0.91;
  const r = p * 0.16;

  // 土壤主体
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = "#6e4a26";
  ctx.fill();
  // 上缘高光
  rr(ctx, x, y, w, h * 0.5, r);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();
  // 边框
  rr(ctx, x, y, w, h, r);
  ctx.strokeStyle = "#4c3318";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 悬停高亮
  if (hovered) {
    rr(ctx, x, y, w, h, r);
    ctx.strokeStyle = "rgba(235, 235, 180, 0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// 画一个 emoji（居中）
function drawEmoji(ctx, ch, x, y, size, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.font = `${Math.floor(size)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, x, y);
  ctx.globalAlpha = 1;
}

// 画地块上的作物：土堆 → 发芽 → 半熟 → 成熟
function drawCrop(ctx, i) {
  const plot = plots[i];
  if (!plot.crop) return;
  const crop = cropById(plot.crop.kind);
  const p = progressOf(i);
  const c = center(i);
  const pl = field.plot;

  if (p < 0.2) {
    // 刚种下：小土堆
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + pl * 0.14, pl * 0.14, pl * 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#8a5f34";
    ctx.fill();
    return;
  }

  if (p < 0.6) {
    // 发芽期：嫩苗随进度长大
    const size = pl * (0.32 + 0.14 * ((p - 0.2) / 0.4));
    drawEmoji(ctx, "🌱", c.x, c.y, size);
  } else {
    // 结果期：作物轮廓渐清晰
    const size = pl * (0.5 + 0.16 * ((p - 0.6) / 0.4));
    drawEmoji(ctx, crop.emoji, c.x, c.y, size, 0.85);
  }

  // 生长进度条
  if (p > 0 && p < 1) {
    const w = pl * 0.56;
    const h = 5;
    const x = c.x - w / 2;
    const y = c.y + pl * 0.34;
    rr(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();
    rr(ctx, x, y, w * p, h, h / 2);
    ctx.fillStyle = "#8fe06a";
    ctx.fill();
  }
}

export function render(ctx, hoverIdx) {
  // 背景草地渐变
  const g = ctx.createLinearGradient(0, 0, 0, viewport.H);
  g.addColorStop(0, "#1e3a17");
  g.addColorStop(1, "#132a10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewport.W, viewport.H);

  // 草丛装饰
  ctx.strokeStyle = "rgba(110, 180, 80, 0.5)";
  ctx.lineWidth = 2;
  for (const t of tufts) {
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x - 3 * t.s, t.y - 7 * t.s);
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x, t.y - 9 * t.s);
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + 3 * t.s, t.y - 6 * t.s);
    ctx.stroke();
  }

  // 地块与作物
  for (let i = 0; i < plots.length; i++) {
    drawPlot(ctx, i, i === hoverIdx);
    drawCrop(ctx, i);
  }
}
