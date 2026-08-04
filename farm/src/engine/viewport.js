// ===== 画布与尺寸 =====
export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d", { alpha: false });
export const elCoins = document.getElementById("coins");
export const elHarvested = document.getElementById("harvested");
export const elEarned = document.getElementById("earned");

// 可变的画布尺寸（resize 会更新，其他模块读 W/H）
export const viewport = { W: 0, H: 0 };

let DPR = 1;
export function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  viewport.W = rect.width;
  viewport.H = rect.height;
  canvas.width = Math.floor(viewport.W * DPR);
  canvas.height = Math.floor(viewport.H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
resize();
window.addEventListener("resize", resize);
