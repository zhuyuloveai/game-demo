// Keep one media element across stages; playback starts from a user gesture.
export function createBackgroundMusic(media, {
  enabled = true, volume = .35, hidden = false, onChange = () => {},
} = {}) {
  let unlocked = false, destroyed = false, pending = null, revision = 0;
  let status = enabled ? 'ready' : 'paused';
  const clamp = value => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : .35;
  media.loop = true;
  media.volume = clamp(volume);
  const wanted = () => enabled && unlocked && !hidden && !destroyed;
  const state = () => ({ enabled, unlocked, status, volume: media.volume, playing: status === 'playing' });
  const emit = () => { if (!destroyed) onChange(state()); };

  function pause(nextStatus) {
    revision++;
    pending = null;
    status = nextStatus;
    media.pause();
    emit();
  }
  function start() {
    if (!wanted() || pending || (status === 'playing' && !media.paused)) return;
    const request = ++revision;
    status = 'loading'; emit();
    const failed = error => {
      if (request !== revision || !wanted()) return;
      pending = null;
      status = error?.name === 'NotAllowedError' ? 'blocked' : 'error';
      emit();
    };
    try {
      pending = Promise.resolve(media.play()).then(() => {
        if (request !== revision || !wanted()) return;
        pending = null;
        status = media.paused ? 'blocked' : 'playing'; emit();
      }, failed);
    } catch (error) { failed(error); }
  }
  function unlock(retry = false) {
    if (destroyed || hidden || !enabled || (status === 'error' && !retry)) return;
    unlocked = true;
    if (retry && media.error) media.load();
    start();
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled) unlock(true);
    else pause('paused');
  }
  function toggle() {
    if (enabled && ['loading', 'playing'].includes(status)) setEnabled(false);
    else setEnabled(true);
  }
  function setHidden(value) {
    if (hidden === Boolean(value) || destroyed) return;
    hidden = Boolean(value);
    if (hidden) pause(enabled && unlocked ? 'background' : enabled ? 'ready' : 'paused');
    else if (wanted()) start();
  }
  function setVolume(value) { media.volume = clamp(value); emit(); }
  const onPlaying = () => {
    if (!wanted()) { media.pause(); return; }
    status = 'playing'; emit();
  };
  const onPause = () => {
    if (!['loading', 'playing'].includes(status)) return;
    status = hidden ? 'background' : 'paused'; emit();
  };
  const onError = () => {
    if (!wanted()) return;
    revision++; pending = null; status = 'error'; emit();
  };
  media.addEventListener('playing', onPlaying);
  media.addEventListener('pause', onPause);
  media.addEventListener('error', onError);
  emit();
  return {
    unlock, toggle, setEnabled, setVolume, setHidden,
    get state() { return state(); },
    destroy() {
      destroyed = true; pause('paused');
      media.removeEventListener('playing', onPlaying);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('error', onError);
    },
  };
}
