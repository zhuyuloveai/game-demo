import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmSoundEffects,farmMatchCue} from '../farm-audio.mjs';
import {createBackgroundMusic,SEASON_TRACKS} from '../music.mjs';
import {FARM_TRACKS,FARM_SFX} from '../farm-audio-manifest.mjs';
class FakeMedia extends EventTarget {
  paused=true;volume=1;currentTime=0;plays=0;
  play(){this.paused=false;this.plays++;return Promise.resolve();}
  pause(){this.paused=true;}
  load(){}
}
test('farm feedback has bounded voices, throttles repeated taps and never owns BGM',()=>{
  let time=0;const created=[];
  const fx=createFarmSoundEffects({clock:()=>time,createMedia:()=>{const m=new FakeMedia();created.push(m);return m;},maxVoices:3});
  assert(fx.play('harvest'));assert.equal(fx.play('harvest'),false);
  for(const cue of ['plant','feed','coin']){time+=100;fx.play(cue);}
  assert.equal(fx.state.voices,3);assert.equal(created[0].paused,true);
  assert.equal(fx.play('farm-life'),false);
  fx.setHidden(true);assert(created.every(m=>m.paused));assert.equal(fx.play('harvest'),false);
  fx.setHidden(false);fx.setEnabled(false);assert.equal(fx.play('harvest'),false);
  fx.setEnabled(true);time+=100;assert(fx.play('harvest'));
  fx.destroy();assert.equal(fx.state.voices,0);assert.equal(fx.play('harvest'),false);
});
test('SFX volume is clamped and rejected playback is nonfatal',async()=>{
  const m=new FakeMedia();m.play=()=>Promise.reject(new Error('blocked'));
  const fx=createFarmSoundEffects({createMedia:()=>m,volume:5});
  fx.play('button');assert(m.volume<=1);await new Promise(r=>setImmediate(r));assert.equal(fx.state.voices,0);
  fx.setVolume(-2);assert.equal(m.volume,0);fx.destroy();
});
test('farm, farm match, and original home share one media player and retain mute/volume',async()=>{
  const media=new FakeMedia(),player=createBackgroundMusic(media,{volume:.21,track:SEASON_TRACKS.spring});
  player.unlock();await new Promise(r=>setImmediate(r));
  for(const track of [FARM_TRACKS.farm,FARM_TRACKS.match,FARM_TRACKS.farm,SEASON_TRACKS.spring]){
    player.setTrack(track);await new Promise(r=>setImmediate(r));assert.equal(media.src,track.src);assert.equal(media.volume,.21);
  }
  player.setEnabled(false);const count=media.plays;
  player.setTrack(FARM_TRACKS.match);player.setHidden(true);player.setHidden(false);
  assert.equal(media.plays,count);assert.equal(media.paused,true);assert.equal(player.state.enabled,false);
  player.destroy();
});
test('branch feedback maps onto the new original sound palette',()=>{
  for(const cue of ['pick','tap','match','win','lost','undo','shuffle','stash','return'])assert(FARM_SFX[farmMatchCue(cue)]);
});
test('an interrupted old sound rejection cannot remove a newer voice from the budget',async()=>{
  const media=new FakeMedia();let rejectOld,time=0;
  media.play=()=>new Promise((resolve,reject)=>{rejectOld=reject;});
  const fx=createFarmSoundEffects({clock:()=>time,createMedia:()=>media});
  fx.play('button');const reject=rejectOld;
  media.play=()=>Promise.resolve();time=100;fx.play('button');
  reject(new Error('interrupted old play'));
  await new Promise(r=>setImmediate(r));assert.equal(fx.state.voices,1);
  fx.destroy();
});
