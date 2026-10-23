import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackgroundMusic, SEASON_TRACKS } from '../music.mjs';
import { seasonForLevel } from '../seasons.mjs';

class FakeMedia extends EventTarget {
  paused = true;
  volume = 1;
  loop = false;
  error = null;
  calls = 0;
  loads = 0;
  behavior = null;
  play() {
    this.calls++;
    if (this.behavior) return this.behavior();
    this.paused = false;
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  load() { this.loads++; this.error = null; }
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('music waits for a gesture, loops on one element, and toggles independently', async () => {
  const media = new FakeMedia();
  const music = createBackgroundMusic(media, {volume:.23});
  assert.equal(media.calls, 0);
  assert.equal(media.volume, .23);
  assert.equal(media.loop, true);
  music.unlock(); await settle();
  assert.equal(music.state.playing, true);
  for (let i = 0; i < 40; i++) music.unlock();
  assert.equal(media.calls, 1);
  music.toggle();
  assert.equal(media.paused, true);
  assert.equal(music.state.enabled, false);
  music.unlock(); await settle();
  assert.equal(media.calls, 1);
  music.toggle(); await settle();
  assert.equal(music.state.playing, true);
});

test('turning off during loading ignores stale play rejection and keeps later playback', async () => {
  const media = new FakeMedia();
  let rejectFirst;
  media.behavior = () => new Promise((resolve, reject) => { rejectFirst = reject; });
  const music = createBackgroundMusic(media);
  music.unlock(); music.unlock();
  assert.equal(media.calls, 1);
  music.toggle();
  assert.equal(media.paused, true);
  media.behavior = null;
  music.toggle(); await settle();
  rejectFirst(new DOMException('Interrupted', 'AbortError')); await settle();
  assert.equal(music.state.playing, true);
  assert.equal(media.calls, 2);
});

test('background pauses and resumes only after an initial gesture and while enabled', async () => {
  const media = new FakeMedia();
  const music = createBackgroundMusic(media);
  music.setHidden(true); music.setHidden(false);
  assert.equal(media.calls, 0);
  music.unlock(); await settle();
  music.setHidden(true);
  assert.equal(media.paused, true);
  assert.equal(music.state.status, 'background');
  music.setHidden(false); await settle();
  assert.equal(music.state.playing, true);
  music.setEnabled(false);
  music.setHidden(true); music.setHidden(false); await settle();
  assert.equal(media.paused, true);
  assert.equal(media.calls, 2);
});

test('autoplay rejection and external pause can be retried with one play click', async () => {
  const media = new FakeMedia();
  media.behavior = () => Promise.reject(new DOMException('Gesture required', 'NotAllowedError'));
  const music = createBackgroundMusic(media);
  music.unlock(); await settle();
  assert.equal(music.state.status, 'blocked');
  media.behavior = null;
  music.toggle(); await settle();
  assert.equal(music.state.playing, true);
  media.pause();
  assert.equal(music.state.status, 'paused');
  music.toggle(); await settle();
  assert.equal(music.state.playing, true);
});

test('load errors require an explicit retry; saved mute and disposal stay silent', async () => {
  const media = new FakeMedia();
  const music = createBackgroundMusic(media, {enabled:false});
  music.unlock(); assert.equal(media.calls, 0);
  music.toggle(); await settle();
  media.error = {code:2}; media.paused = true;
  media.dispatchEvent(new Event('error'));
  assert.equal(music.state.status, 'error');
  music.unlock(); assert.equal(media.calls, 1);
  music.toggle(); await settle();
  assert.equal(media.loads, 1);
  assert.equal(music.state.playing, true);
  music.destroy(); music.unlock(); music.setHidden(false);
  assert.equal(media.paused, true);
  assert.equal(media.calls, 2);
});

test('seasonal tracks follow levels, including wraparound, and rendering does not restart a song', async () => {
  const media = new FakeMedia();
  const music = createBackgroundMusic(media, {track:SEASON_TRACKS.spring, volume:.19});
  assert.equal(media.calls, 0);
  assert.match(media.src, /spring-pasture\.m4a$/);
  music.unlock(); await settle();
  for (let level=0;level<9;level++) {
    const next=SEASON_TRACKS[seasonForLevel(level).key];
    music.setTrack(next); await settle();
    const loads=media.loads, calls=media.calls;
    for (let frame=0;frame<25;frame++) music.setTrack(next);
    assert.equal(media.loads,loads);
    assert.equal(media.calls,calls);
    assert.equal(music.state.track,next);
    assert.equal(music.state.playing,true);
    assert.equal(media.volume,.19);
    assert.equal(media.loop,true);
  }
});

test('season changes preserve muted and background states and resume the current song', async () => {
  const media = new FakeMedia();
  const music = createBackgroundMusic(media, {enabled:false,track:SEASON_TRACKS.autumn});
  music.setTrack(SEASON_TRACKS.winter);
  assert.equal(media.calls,0);
  assert.equal(music.state.enabled,false);
  assert.equal(media.paused,true);
  music.toggle(); await settle();
  music.setHidden(true);
  music.setTrack(SEASON_TRACKS.spring);
  assert.equal(media.calls,1);
  assert.equal(music.state.status,'background');
  music.setHidden(false); await settle();
  assert.equal(media.calls,2);
  assert.match(media.src,/spring-pasture\.m4a$/);
  assert.equal(music.state.playing,true);
});

test('rapid season changes ignore interrupted playback and never revive an old request', async () => {
  const media = new FakeMedia();
  const rejects=[];
  media.behavior=()=>new Promise((resolve,reject)=>rejects.push(reject));
  const music = createBackgroundMusic(media,{track:SEASON_TRACKS.spring});
  music.unlock();
  music.setTrack(SEASON_TRACKS.summer);
  media.behavior=null;
  music.setTrack(SEASON_TRACKS.autumn);await settle();
  rejects.forEach(reject=>reject(new DOMException('Source changed','AbortError')));
  await settle();
  assert.equal(music.state.track.key,'autumn');
  assert.equal(music.state.playing,true);
  music.destroy();
  music.setTrack(SEASON_TRACKS.winter);
  assert.equal(media.paused,true);
  assert.equal(music.state.track.key,'autumn');
});
