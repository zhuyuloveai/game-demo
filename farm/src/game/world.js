// ===== 田地：布局 / 地块 / 渲染 =====
import { viewport } from "../engine/viewport.js";

export const COLS = 5;
export const ROWS = 4;

// 网格几何（resize 时由 initField 重新计算）
export const field = { x0: 0, y0: 0, plot: 0 };
// 每块地：crop 为 null 表示空地
export const plots = [];

let tufts = []; // 背景草丛装饰（静态，resize 时重建）

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

  // 地块
  for (let i = 0; i < plots.length; i++) drawPlot(ctx, i, i === hoverIdx);
}
