// ===== Web Audio 程序化音效 =====
// 零音频资源：所有音效用振荡器 + 滤波噪声实时合成。
// AudioContext 必须由用户手势触发创建，在首次点击开始时调用 initAudio()。

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  // 预生成 1s 白噪声，所有噪声类音效共用
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

// 单音：频率扫频 + 指数衰减包络
function tone({ type = "square", f0 = 440, f1 = f0, dur = 0.1, vol = 0.3, delay = 0 }) {
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

// 噪声：共享白噪声源 + 滤波扫频 + 包络
function noise({ dur = 0.2, type = "lowpass", f0 = 1000, f1 = f0, q = 1, vol = 0.3, delay = 0 }) {
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = type;
  flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t0);
  flt.frequency.exponentialRampToValueAtTime(Math.max(f1, 10), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(flt).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// 高频触发音效的限频（秒），防止短时间大量叠加刺耳
const RATE_LIMIT = { shoot: 0.05, zap: 0.08, laser: 0.1, missile: 0.15, explode: 0.05 };
const lastPlayed = {};

export function sfx(name, opt = {}) {
  if (!ctx || muted) return;
  if (RATE_LIMIT[name]) {
    if (ctx.currentTime - (lastPlayed[name] ?? -1) < RATE_LIMIT[name]) return;
    lastPlayed[name] = ctx.currentTime;
  }
  switch (name) {
    case "shoot": // 机炮
      tone({ type: "square", f0: 880, f1: 220, dur: 0.06, vol: 0.14 });
      break;
    case "zap": // 链式闪电
      noise({ type: "bandpass", f0: 3200, f1: 700, q: 2.5, dur: 0.12, vol: 0.22 });
      tone({ type: "sawtooth", f0: 200, f1: 60, dur: 0.1, vol: 0.1 });
      break;
    case "laser": // 贯穿镭射
      tone({ type: "sawtooth", f0: 1400, f1: 180, dur: 0.1, vol: 0.13 });
      break;
    case "missile": // 导弹离架
      noise({ f0: 350, f1: 2600, dur: 0.22, vol: 0.18 });
      break;
    case "explode": { // 敌机爆炸（大型机更低沉持久）
      const big = opt.power > 1.5;
      noise({ f0: big ? 900 : 1500, f1: 90, dur: big ? 0.45 : 0.25, vol: big ? 0.45 : 0.28 });
      tone({ type: "sine", f0: big ? 130 : 170, f1: 40, dur: big ? 0.4 : 0.2, vol: 0.3 });
      break;
    }
    case "bigBoom": // Boss 死亡 / 大场面
      noise({ f0: 800, f1: 50, dur: 0.6, vol: 0.5 });
      tone({ type: "sine", f0: 110, f1: 28, dur: 0.55, vol: 0.38 });
      break;
    case "pickup": // 拾取道具
      tone({ type: "sine", f0: 660, dur: 0.08, vol: 0.28 });
      tone({ type: "sine", f0: 990, dur: 0.12, vol: 0.28, delay: 0.08 });
      break;
    case "hit": // 玩家受击掉命
      tone({ type: "sawtooth", f0: 300, f1: 70, dur: 0.35, vol: 0.35 });
      noise({ f0: 1200, f1: 140, dur: 0.3, vol: 0.28 });
      break;
    case "switch": // 切换武器（四武器不同音高）
      tone({ type: "square", f0: [440, 550, 660, 770][opt.index ?? 0], dur: 0.07, vol: 0.18 });
      break;
    case "start": // 开始 / 重开
      [523, 659, 784].forEach((f, i) => tone({ type: "triangle", f0: f, dur: 0.12, vol: 0.28, delay: i * 0.09 }));
      break;
    case "gameover": // 命尽结束（在受击音后进入）
      [392, 311, 233].forEach((f, i) => tone({ type: "triangle", f0: f, dur: 0.25, vol: 0.28, delay: i * 0.18 + 0.35 }));
      break;
    case "bossWarn": // Boss 登场警告
      [0, 0.3].forEach((d) => {
        tone({ type: "square", f0: 220, dur: 0.12, vol: 0.22, delay: d });
        tone({ type: "square", f0: 165, dur: 0.12, vol: 0.22, delay: d + 0.13 });
      });
      break;
    case "chargeRelease": // 蓄力大招释放
      noise({ f0: 500, f1: 3200, dur: 0.3, vol: 0.3 });
      tone({ type: "sine", f0: 100, f1: 45, dur: 0.35, vol: 0.35 });
      break;
  }
}

// --- 蓄力持续音：按住期间音高随蓄力比例上升 ---
let chargeOsc = null;
let chargeGain = null;

export function chargeStart() {
  if (!ctx || muted || chargeOsc) return;
  chargeOsc = ctx.createOscillator();
  chargeGain = ctx.createGain();
  chargeOsc.type = "sawtooth";
  chargeOsc.frequency.value = 110;
  chargeGain.gain.value = 0.0001;
  chargeGain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.08);
  chargeOsc.connect(chargeGain).connect(master);
  chargeOsc.start();
}

export function chargeSet(p) { // p: 0..1 蓄力比例
  if (chargeOsc) chargeOsc.frequency.setTargetAtTime(110 + 440 * p, ctx.currentTime, 0.03);
}

export function chargeStop() {
  if (!chargeOsc) return;
  chargeGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
  chargeOsc.stop(ctx.currentTime + 0.15);
  chargeOsc = null;
  chargeGain = null;
}
