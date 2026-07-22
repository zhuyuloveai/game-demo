import { canvas, viewport } from "./viewport.js";
import { clamp } from "../core/math.js";

// ===== 输入：Pointer Lock + 相对位移模拟跟手 =====
// 运行时锁定鼠标在画布内（光标出不去）；用累积位移维护飞机的虚拟绝对坐标，
// 既锁住光标又保留“飞机跟着鼠标走”的跟手手感。
export const mouse = { x: viewport.W / 2, y: viewport.H * 0.8 };
let locked = false;
let _state = null;

export function requestLock() {
  canvas.requestPointerLock && canvas.requestPointerLock({ unadjustedMovement: true });
}

// 游戏首次开始 / 重开时请求锁定
export function startGame() { requestLock(); }

export function togglePause() {
  if (_state.paused) {
    requestLock(); // 恢复：重新请求锁定
  } else {
    document.exitPointerLock && document.exitPointerLock(); // 暂停：退出锁定，光标自由
  }
}

// 由 main.js 注入依赖，避免循环 import
export function initInput({ state, player, reset }) {
  _state = state;
  function onMove(e) {
    if (!locked) return;
    // 累积鼠标位移作为飞机目标坐标，并夹在画布内（碰到边即停）
    mouse.x = clamp(mouse.x + e.movementX, player.r, viewport.W - player.r);
    mouse.y = clamp(mouse.y + e.movementY, player.r, viewport.H - player.r);
  }
  window.addEventListener("mousemove", onMove);

  // Pointer Lock 状态同步：用户按系统 ESC 退出锁定时也暂停游戏
  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === canvas;
    if (!locked && !state.over) {
      state.paused = true;
      canvas.style.cursor = "default";
    } else if (locked) {
      state.paused = false;
      canvas.style.cursor = "none";
    }
  });

  // 点击/按键用于重新开始
  canvas.addEventListener("pointerdown", () => {
    if (!state.started) { state.started = true; requestLock(); return; }
    if (state.over) reset();
    else if (state.paused) requestLock(); // 点击恢复（会重新进入锁定）
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") { if (state.over) reset(); }
    if ((e.key === "q" || e.key === "Q") && state.started && !state.over) {
      const order = ["gun", "lightning", "laser", "missile"];
      player.weapon = order[(order.indexOf(player.weapon) + 1) % order.length];
    }
    if ((e.key === "a" || e.key === "A") && state.started && !state.over && !e.repeat) {
      player.charging = true; // 蓄力开始（松开由 keyup 结束）
    }
    // 注意：游戏运行中按 ESC 会被浏览器用于退出 Pointer Lock，
    // 由 pointerlockchange 自动暂停，无需在此处理。
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "a" || e.key === "A") player.charging = false; // 松手释放蓄力攻击
  });
}
