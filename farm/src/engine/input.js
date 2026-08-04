// ===== 点击 / 悬停输入 =====
import { canvas } from "./viewport.js";
import { hitTest } from "../game/world.js";

// 当前悬停的地块下标（-1 表示不在田地上）
export const hover = { idx: -1 };

export function initInput(onAction) {
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener("pointerdown", (e) => {
    const p = local(e);
    const idx = hitTest(p.x, p.y);
    if (idx >= 0) onAction(idx);
  });

  canvas.addEventListener("pointermove", (e) => {
    const p = local(e);
    hover.idx = hitTest(p.x, p.y);
    canvas.style.cursor = hover.idx >= 0 ? "pointer" : "default";
  });

  canvas.addEventListener("pointerleave", () => {
    hover.idx = -1;
    canvas.style.cursor = "default";
  });
}
