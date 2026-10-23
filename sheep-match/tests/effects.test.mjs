import test from 'node:test';
import assert from 'node:assert/strict';
import { createTileEffects } from '../effects.mjs';

class Param {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  disconnected = false;
  started = false;
  connect() {}
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() {}
}
class Context {
  static instances = [];
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  sources = [];
  constructor() { Context.instances.push(this); }
  createGain() { return new Node(); }
  createOscillator() { const source = new Node(); this.sources.push(source); return source; }
  createBufferSource() { return this.createOscillator(); }
  createBiquadFilter() { return new Node(); }
  createBuffer(channels, frames) { return {getChannelData:() => new Float32Array(frames)}; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

test('effects start lazily, stay bounded during rapid moves, and release ended voices', async () => {
  const before = Context.instances.length;
  const effects = createTileEffects({AudioContext:Context});
  assert.equal(Context.instances.length, before);
  for (let i = 0; i < 100; i++) await effects.play(i % 3 ? 'tap' : 'match');
  const context = Context.instances.at(-1);
  assert.equal(effects.activeVoices, 24);
  assert.equal(context.sources.filter(source => !source.disconnected).length, 24);
  for (const source of context.sources) source.onended?.();
  assert.equal(effects.activeVoices, 0);
  effects.destroy();
});

test('mute and hidden state cancel cues and prevent late resume sounds', async () => {
  let releaseResume;
  class SuspendedContext extends Context {
    state = 'suspended';
    resume() { return new Promise(resolve => { releaseResume = () => { this.state = 'running'; resolve(); }; }); }
  }
  const effects = createTileEffects({AudioContext:SuspendedContext});
  const pending = effects.play('match');
  await effects.play('tap');
  effects.setEnabled(false); releaseResume(); await pending;
  assert.equal(effects.activeVoices, 0);
  effects.setEnabled(true); await effects.play('shuffle');
  assert.equal(effects.activeVoices, 4);
  effects.setHidden(true); await effects.play('tap');
  assert.equal(effects.activeVoices, 0);
  effects.setHidden(false); await effects.play('undo');
  assert.equal(effects.activeVoices, 2);
  effects.destroy(); await effects.play('tap');
  assert.equal(effects.activeVoices, 0);
});

test('all operation cues play without creating audio while muted or unsupported', async () => {
  const before = Context.instances.length;
  const muted = createTileEffects({enabled:false, AudioContext:Context});
  await muted.play('tap');
  assert.equal(Context.instances.length, before);
  const unsupported = createTileEffects({AudioContext:null});
  await unsupported.play('match');
  assert.equal(unsupported.activeVoices, 0);
  const effects = createTileEffects({AudioContext:Context});
  for (const kind of ['tap','button','match','undo','shuffle','stash','return','win','lost']) {
    await effects.play(kind);
    assert.ok(effects.activeVoices > 0, kind);
    effects.setEnabled(false);
    assert.equal(effects.activeVoices, 0);
    effects.setEnabled(true);
  }
  effects.destroy();
});
