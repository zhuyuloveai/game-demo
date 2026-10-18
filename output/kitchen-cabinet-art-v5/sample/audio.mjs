// Original 16-bar kitchen pop loop, synthesized locally with Web Audio.
// Warm plucked chords, a round bass, and a little music-box melody.
export function createKitchenAudio({ music = true, effects = true } = {}) {
  let context, master, musicBus, effectsBus, timer;
  let unlocked = false, hidden = false, beat = 0, nextBeat = 0;
  let musicVolume = .36, effectsVolume = .55;
  const musicVoices = new Set(), effectVoices = new Set();
  const tempo = 112, beatSeconds = 60 / tempo;
  const melody = [
    72,76,79,76, 74,77,81,79, 76,79,84,83, 79,77,74,0,
    72,76,79,84, 81,79,77,76, 74,76,79,77, 76,74,72,0,
    76,79,84,79, 77,81,84,81, 76,79,83,81, 79,77,74,0,
    72,74,76,79, 81,79,77,76, 74,77,79,71, 72,76,72,0,
  ];
  const chords = [
    [48,52,55], [53,57,60], [57,60,64], [55,59,62],
    [48,52,55], [57,60,64], [50,53,57], [55,59,62],
    [53,57,60], [55,59,62], [52,55,59], [57,60,64],
    [50,53,57], [55,59,62], [48,52,55], [48,52,55],
  ];
  const patterns = {
    tap:[76], select:[72], generate:[72,79], move:[67], swap:[69,72],
    merge:[72,76,79], order:[72,76,79,84], collect:[79,84], sell:[72,79],
    unlock:[67,72,76,84], renovate:[60,64,67,72,76,79,84], cook:[72,76,79,84,88],
    chest:[67,72,76,79,84], daily:[72,79,84], buy:[72,76], refill:[72,76,79],
    error:[55,53], booster:[84,79,88], store:[76,72], retrieve:[72,76],
  };
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);

  function tone(bus, midi, at, length, gain, type = 'sine') {
    const voices = bus === musicBus ? musicVoices : effectVoices;
    // Rapid taps cannot accumulate an unbounded number of audio nodes.
    if (voices.size >= (bus === musicBus ? 32 : 48)) return;
    at = Math.max(context.currentTime, at);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const voice = { oscillator, envelope, finish: null };
    let finished = false;
    voice.finish = () => {
      if (finished) return;
      finished = true;
      voices.delete(voice);
      oscillator.onended = null;
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(hz(midi), at);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), at + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    oscillator.connect(envelope);
    envelope.connect(bus);
    voices.add(voice);
    oscillator.onended = voice.finish;
    oscillator.start(at);
    oscillator.stop(at + length + .02);
  }

  function stopVoices(voices) {
    for (const voice of voices) {
      try { voice.oscillator.stop(context.currentTime); } catch { /* Already ended. */ }
      voice.finish();
    }
  }

  function setBusVolume(bus, value, fade = .035) {
    if (!context || !bus) return;
    bus.gain.cancelScheduledValues(context.currentTime);
    bus.gain.setTargetAtTime(value, context.currentTime, fade);
  }

  function stopLoop() {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  }

  function schedule() {
    if (!music || !unlocked || hidden || !context || context.state !== 'running') return;
    // A stalled tab skips missed beats instead of replaying them in one burst.
    if (nextBeat < context.currentTime - .08) {
      beat += Math.floor((context.currentTime - nextBeat) / beatSeconds);
      nextBeat = context.currentTime + .035;
    }
    while (nextBeat < context.currentTime + .15) {
      const position = beat % melody.length;
      const chord = chords[Math.floor(position / 4)];
      if (musicVolume > 0) {
        if (melody[position]) {
          tone(musicBus, melody[position], nextBeat, .37, .075);
          tone(musicBus, melody[position] + 12, nextBeat, .13, .011);
        }
        if (beat % 2 === 0) {
          // Alternate the root and fifth to keep the bass light and bouncy.
          tone(musicBus, chord[beat % 4 === 0 ? 0 : 2] - 12, nextBeat, .34, .08, 'triangle');
        }
        if (beat % 2 === 1) {
          chord.forEach((m, i) => tone(musicBus, m + 12, nextBeat + .018 * i, .23, .02, 'triangle'));
          tone(musicBus, chord[1] + 12, nextBeat + beatSeconds * .5, .13, .017, 'triangle');
          tone(musicBus, 90, nextBeat, .035, .012, 'triangle');
        }
      }
      nextBeat += beatSeconds;
      beat++;
    }
  }

  function startLoop() {
    if (timer !== undefined || !context || !unlocked || !music || hidden || context.state !== 'running') return;
    setBusVolume(musicBus, musicVolume, .12);
    nextBeat = context.currentTime + .06;
    timer = setInterval(schedule, 50);
    schedule();
  }

  async function resumeLoop() {
    if (!context || context.state === 'closed') return;
    try {
      if (context.state !== 'running') await context.resume();
      // A visibility change can happen while resume() is still pending.
      if (hidden) {
        if (context.state === 'running') await context.suspend();
        return;
      }
      if (context.state === 'running') startLoop();
    } catch { /* A later user gesture can retry resuming optional audio. */ }
  }

  async function unlock() {
    if (hidden) return;
    try {
      if (!context) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = .5;
        master.connect(context.destination);
        musicBus = context.createGain();
        musicBus.gain.value = music ? musicVolume : 0;
        musicBus.connect(master);
        effectsBus = context.createGain();
        effectsBus.gain.value = effects ? effectsVolume : 0;
        effectsBus.connect(master);
      }
      // Called directly from the first gesture; no audio is created on page load.
      if (context.state !== 'running') await context.resume();
      if (hidden) {
        if (context.state === 'running') await context.suspend();
        return;
      }
      if (context.state !== 'running') return;
      unlocked = true;
      startLoop();
    } catch { /* Optional audio never interrupts gameplay. */ }
  }

  function play(kind = 'tap', level = 1) {
    if (!effects || effectsVolume === 0 || !context || context.state !== 'running' || !unlocked || hidden) return;
    const t = context.currentTime;
    const notes = patterns[kind] || patterns.tap;
    const small = ['tap', 'select', 'move', 'swap'].includes(kind);
    const bright = ['order', 'unlock', 'renovate', 'cook', 'chest', 'daily', 'booster'].includes(kind);
    const offset = kind === 'merge' ? Math.min(4, Math.max(0, (Number(level) || 1) - 2)) : 0;
    const spacing = kind === 'renovate' ? .085 : kind === 'error' ? .105 : .06;
    notes.forEach((m, i) => {
      tone(effectsBus, m + offset, t + i * spacing, small ? .075 : .2, small ? .085 : .12, kind === 'error' ? 'triangle' : 'sine');
      if (bright) tone(effectsBus, m + 12, t + i * spacing, .11, .018);
    });
  }

  function setMusic(enabled) {
    const changed = music !== !!enabled;
    music = !!enabled;
    if (music) {
      if (changed) setBusVolume(musicBus, musicVolume);
      startLoop();
    } else {
      stopLoop();
      setBusVolume(musicBus, 0);
      stopVoices(musicVoices);
    }
  }

  function setEffects(enabled) {
    effects = !!enabled;
    setBusVolume(effectsBus, effects ? effectsVolume : 0);
    if (!effects) stopVoices(effectVoices);
  }

  function setVolume(kind, value) {
    const volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (kind === 'music') {
      musicVolume = volume;
      setBusVolume(musicBus, music ? volume : 0);
      if (volume === 0) stopVoices(musicVoices);
    } else {
      effectsVolume = volume;
      setBusVolume(effectsBus, effects ? volume : 0);
      if (volume === 0) stopVoices(effectVoices);
    }
  }

  function setHidden(value) {
    if (hidden === !!value) return;
    hidden = !!value;
    if (hidden) {
      stopLoop();
      stopVoices(musicVoices);
      stopVoices(effectVoices);
      if (context && context.state !== 'closed') {
        context.suspend().then(() => {
          // A quick hide/show may finish suspending after the show request.
          if (!hidden && unlocked) resumeLoop();
        }).catch(() => {});
      }
    } else if (context && unlocked) {
      resumeLoop();
    }
  }

  return { unlock, play, setMusic, setEffects, setVolume, setHidden, get started() { return unlocked; } };
}
