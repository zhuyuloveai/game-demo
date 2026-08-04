// ===== 绿野农场 入口 =====
import { ctx, resize } from "./engine/viewport.js";
import { initInput, hover } from "./engine/input.js";
import { state } from "./game/state.js";
import { CROPS } from "./game/crops.js";
import { initField, render } from "./game/world.js";

// ===== 田地 =====
initField();
window.addEventListener("resize", () => { resize(); initField(); });

// ===== 作物选择 UI（由 CROPS 数据生成，按钮/图鉴共用一份数据）=====
const cropList = document.getElementById("crop-list");
const cropGuide = document.getElementById("crop-guide");

function selectCrop(id) {
  state.selected = id;
  for (const b of cropList.querySelectorAll(".crop-btn")) {
    b.classList.toggle("active", b.dataset.crop === id);
  }
}

function buildCropUI() {
  cropList.innerHTML = "";
  cropGuide.innerHTML = "";
  for (const c of CROPS) {
    const btn = document.createElement("button");
    btn.className = "crop-btn" + (c.id === state.selected ? " active" : "");
    btn.dataset.crop = c.id;
    btn.innerHTML =
      `<span class="crop-emoji">${c.emoji}</span>` +
      `<span class="crop-name">${c.name}</span>` +
      `<span class="crop-meta">${c.growTime}s · ${c.price} 金币</span>`;
    btn.addEventListener("click", () => selectCrop(c.id));
    cropList.appendChild(btn);

    const line = document.createElement("div");
    line.textContent = `${c.emoji} ${c.name} · ${c.growTime}s 成熟 · ${c.price} 金币`;
    cropGuide.appendChild(line);
  }
}
buildCropUI();

// 点击地块后的行为（后续阶段实现种植/收获）
function onAction(idx) {
  // 阶段1：交互底座，暂无动作
}

initInput(onAction);

// ===== 主循环 =====
function loop(ms) {
  render(ctx, hover.idx);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
