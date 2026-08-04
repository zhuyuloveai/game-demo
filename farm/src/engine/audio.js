// ===== Web Audio 程序化音效 =====
// 零音频资源：所有音效用振荡器实时合成。
// AudioContext 必须由用户手势触发创建，在首次点击/按键时调用 initAudio()。

let ctx = null;
let master = null;
let muted = false;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.32;
  master.connect(ctx.destination);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.32;
  return muted;
}

// 单音：频率扫频 + 指数衰减包络
function tone({ type = "sine", f0, f1 = f0, dur = 0.1, vol = 0.3, delay = 0 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// 音效表：种植 / 收获 / 切换作物
export function sfx(name) {
  if (!ctx || muted) return;
  if (name === "plant") {
    // 轻柔上扫，像种子入土
    tone({ type: "sine", f0: 240, f1: 430, dur: 0.1, vol: 0.2 });
  } else if (name === "harvest") {
    // 双音上扬，金币入账
    tone({ type: "triangle", f0: 660, dur: 0.09, vol: 0.22 });
    tone({ type: "triangle", f0: 990, dur: 0.14, vol: 0.22, delay: 0.07 });
  } else if (name === "select") {
    // 短促嘀声
    tone({ type: "square", f0: 500, dur: 0.045, vol: 0.1 });
  }
}
