// ===== 输入：键盘 =====
// keys 按 KeyboardEvent.code 记录按住状态，main.js 每帧读取。
export const keys = {};

export function initInput({ state, reset }) {
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    // 阻止方向键 / 空格滚动页面
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (!state.started) { state.started = true; return; }
    if (state.over && e.code === "KeyR") reset();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  // 切窗时清掉所有按住状态，避免按键“卡住”
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
}
