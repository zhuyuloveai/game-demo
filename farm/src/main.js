// ===== 绿野农场 入口 =====
import { ctx, resize, elCoins, elHarvested, elEarned } from "./engine/viewport.js";
import { initInput, hover } from "./engine/input.js";
import { initAudio, toggleMute, sfx } from "./engine/audio.js";
import { state } from "./game/state.js";
import { CROPS } from "./game/crops.js";
import { initField, render, update, plant, harvest, progressOf, plots } from "./game/world.js";

// ===== 田地 =====
initField();
window.addEventListener("resize", () => { resize(); initField(); });

// ===== 音频：首次用户手势后创建 AudioContext =====
let audioReady = false;
function ensureAudio() {
  if (audioReady) return;
  initAudio();
  audioReady = true;
}
window.addEventListener("pointerdown", ensureAudio);
window.addEventListener("keydown", ensureAudio);

// ===== 作物选择 UI（由 CROPS 数据生成，按钮/图鉴共用一份数据）=====
const cropList = document.getElementById("crop-list");
const cropGuide = document.getElementById("crop-guide");

function selectCrop(id) {
  state.selected = id;
  for (const b of cropList.querySelectorAll(".crop-btn")) {
    b.classList.toggle("active", b.dataset.crop === id);
  }
  sfx("select");
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

// 点击地块：空地 → 种植当前作物；成熟 → 收获；生长中 → 忽略
function onAction(idx) {
  if (!plots[idx].crop) plant(idx);
  else if (progressOf(idx) >= 1) harvest(idx);
}

initInput(onAction);

// ===== 键盘：1/2/3 切换作物，M 静音 =====
window.addEventListener("keydown", (e) => {
  if (e.key === "1") selectCrop("carrot");
  else if (e.key === "2") selectCrop("tomato");
  else if (e.key === "3") selectCrop("corn");
  else if (e.key.toLowerCase() === "m") toggleMute();
});

// ===== HUD 同步（值变化时才刷新 DOM）=====
let hud = { coins: -1, harvested: -1, earned: -1 };
function syncHud() {
  if (state.coins !== hud.coins) { hud.coins = state.coins; elCoins.textContent = state.coins; }
  if (state.harvested !== hud.harvested) { hud.harvested = state.harvested; elHarvested.textContent = `${state.harvested} 株`; }
  if (state.earned !== hud.earned) { hud.earned = state.earned; elEarned.textContent = state.earned; }
}

// ===== 主循环 =====
function loop(ms) {
  update(ms);
  render(ctx, hover.idx);
  syncHud();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
