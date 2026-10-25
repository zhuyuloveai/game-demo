// Original, short Web Audio cues: ceramic clicks, a clear triple-match chime,
// and distinct tool sounds. No audio nodes or downloads before interaction.
export function createTileEffects({ enabled = true, hidden = false,
  AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext,
} = {}) {
  let context, output, noise, resuming = false, epoch = 0, destroyed = false;
  const voices = new Set();
  const MAX_VOICES = 24;
  const patterns = {
    tap: [[0, 820, .055, .12], [0, 2150, .025, .045, 'triangle'], [0, 2900, .024, .075, 'noise']],
    button: [[0, 580, .045, .08], [0, 1800, .018, .035, 'noise']],
    match: [[0, 1150, .035, .08, 'noise'], [0, 784, .12, .10], [.045, 988, .13, .09], [.09, 1319, .17, .085]],
    undo: [[0, 880, .07, .10], [.045, 587, .10, .09]],
    shuffle: [[0, 1600, .035, .09, 'noise'], [.04, 2200, .035, .08, 'noise'], [.08, 1300, .045, .09, 'noise'], [.12, 740, .065, .07]],
    stash: [[0, 392, .07, .10], [.055, 587, .09, .08], [.055, 1700, .025, .05, 'noise']],
    return: [[0, 660, .05, .09], [.035, 880, .07, .075]],
    win: [[0, 659, .15, .10], [.07, 784, .16, .09], [.14, 988, .18, .085], [.21, 1319, .25, .07]],
    lost: [[0, 330, .12, .08, 'triangle'], [.10, 247, .18, .07, 'triangle']],
  };

  function setup() {
    if (context || !AudioContext) return;
    context = new AudioContext();
    output = context.createGain(); output.gain.value = .7; output.connect(context.destination);
    noise = context.createBuffer(1, Math.ceil(context.sampleRate * .06), context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * .24));
  }
  function stopAll() { for (const voice of [...voices]) voice.stop(); }
  function voice(at, frequency, duration, level, type = 'sine') {
    if (voices.size >= MAX_VOICES) voices.values().next().value.stop();
    const gain = context.createGain(), nodes = [gain];
    let source;
    if (type === 'noise') {
      source = context.createBufferSource(); source.buffer = noise;
      const filter = context.createBiquadFilter(); filter.type = 'bandpass';
      filter.frequency.value = frequency; filter.Q.value = .8;
      source.connect(filter); filter.connect(gain); nodes.push(filter);
    } else {
      source = context.createOscillator(); source.type = type;
      source.frequency.setValueAtTime(frequency, at);
      source.frequency.exponentialRampToValueAtTime(frequency * .94, at + duration);
      source.connect(gain);
    }
    nodes.push(source);
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true; voices.delete(handle); source.onended = null;
      for (const node of nodes) node.disconnect();
    };
    const handle = {stop() { try { source.stop(); } catch { /* Already ended. */ } cleanup(); }};
    voices.add(handle); source.onended = cleanup;
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + .002);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    gain.connect(output); source.start(at); source.stop(at + duration + .01);
  }
  async function play(kind = 'tap') {
    if (!enabled || hidden || destroyed || resuming) return;
    const request = epoch, requestedAt = Date.now();
    try {
      setup(); if (!context) return;
      if (context.state !== 'running') {
        resuming = true;
        try { await context.resume(); } finally { resuming = false; }
      }
      // Never replay a backlog after a slow permission/device resume.
      if (!enabled || hidden || destroyed || request !== epoch || context.state !== 'running' || Date.now() - requestedAt > 200) return;
      for (const [delay, frequency, duration, level, type] of patterns[kind] || patterns.tap) {
        voice(context.currentTime + .004 + delay, frequency, duration, level, type);
      }
    } catch { /* Optional sound must never interrupt a move. */ }
  }
  function setEnabled(value) { enabled = Boolean(value); epoch++; if (!enabled) stopAll(); }
  function setHidden(value) { hidden = Boolean(value); epoch++; if (hidden) stopAll(); }
  return {
    play, setEnabled, setHidden,
    get activeVoices() { return voices.size; },
    destroy() { destroyed = true; epoch++; stopAll(); context?.close().catch(() => {}); },
  };
}
