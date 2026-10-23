// All recordings are original, synthesized game loops. Resolve assets from this
// module so the same player also works in nested design and music previews.
export const SEASON_TRACKS = Object.freeze(Object.fromEntries([
  ['spring', '春日蹦蹦芽', '木琴 · 轻笛 · 春芽轻跳'],
  ['summer', '夏日汽水湾', '拨弦 · 手鼓 · 阳光摇摆'],
  ['autumn', '秋日栗子舞', '暖钢琴 · 三拍子 · 落叶小舞'],
  ['winter', '冬日雪花铃', '音乐盒 · 铃音 · 雪花轻落'],
].map(([key, title, description]) => [key, Object.freeze({key, title, description,
  src:new URL(`./media/${key}-pasture.m4a`, import.meta.url).href})])));

// Keep one media element across stages; playback starts from a user gesture.
export function createBackgroundMusic(media, {
  enabled = true, volume = .35, hidden = false, track = null, onChange = () => {},
} = {}) {
  let unlocked = false, destroyed = false, pending = null, revision = 0;
  let currentTrack = null;
  let status = enabled ? 'ready' : 'paused';
  const clamp = value => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : .35;
  media.loop = true;
  media.volume = clamp(volume);
  const wanted = () => enabled && unlocked && !hidden && !destroyed;
  const state = () => ({ enabled, unlocked, status, track:currentTrack, volume: media.volume, playing: status === 'playing' });
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
  function setTrack(next) {
    if (destroyed || !next?.src || (currentTrack?.key === next.key && currentTrack.src === next.src)) return;
    revision++; pending = null;
    currentTrack = next;
    status = enabled ? hidden && unlocked ? 'background' : 'ready' : 'paused';
    media.pause();
    media.src = next.src;
    media.load();
    emit();
    if (wanted()) start();
  }
  const onPlaying = () => {
    if (!wanted()) { media.pause(); return; }
    if (media.paused) return;
    status = 'playing'; emit();
  };
  const onPause = () => {
    if (!media.paused || (status === 'loading' && pending)) return;
    if (!['loading', 'playing'].includes(status)) return;
    status = hidden ? 'background' : 'paused'; emit();
  };
  const onError = () => {
    if (!wanted() || !media.error) return;
    revision++; pending = null; status = 'error'; emit();
  };
  media.addEventListener('playing', onPlaying);
  media.addEventListener('pause', onPause);
  media.addEventListener('error', onError);
  if (track) setTrack(track); else emit();
  return {
    unlock, toggle, setEnabled, setVolume, setHidden, setTrack,
    get state() { return state(); },
    destroy() {
      destroyed = true; pause('paused');
      media.removeEventListener('playing', onPlaying);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('error', onError);
    },
  };
}
