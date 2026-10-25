import {FARM_SFX,FARM_SFX_GAINS} from './farm-audio-manifest.mjs';

// Short feedback only. Background music always belongs to app.mjs's one player.
export function createFarmSoundEffects({
    enabled=true,
    hidden=false,
    volume=.65,
    sources=FARM_SFX,
    gains=FARM_SFX_GAINS,
    createMedia=src=>new Audio(src),
    clock=()=>performance.now(),
    maxVoices=4,
  }={}) {
  const media=new Map(),playing=new Set(),lastPlayed=new Map(),revisions=new Map();
  let destroyed=false;
  const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
  function stop(){
    for(const audio of media.values()){revisions.set(audio,(revisions.get(audio)||0)+1);audio.pause();}
    playing.clear();
  }
  function play(cue){
    if(destroyed||hidden||!enabled||!sources[cue])return false;
    const now=clock();
    if(now-(lastPlayed.get(cue)??-Infinity)<90)return false;
    let audio=media.get(cue);
    if(!audio){
      audio=createMedia(sources[cue]);
      audio.addEventListener('ended',()=>playing.delete(audio));
      media.set(cue,audio);
    }

    // A batch emits one cue; rapid actions cannot create an unbounded choir.
    if(!playing.has(audio)&&playing.size>=maxVoices){
      const oldest=playing.values().next().value;
      oldest.pause();
      playing.delete(oldest);
    }
    const request=(revisions.get(audio)||0)+1;
    revisions.set(audio,request);
    audio.pause();
    audio.currentTime=0;
    audio.volume=clamp(volume)*clamp(gains[cue]??1);
    lastPlayed.set(cue,now);
    playing.add(audio);
    try{
      Promise.resolve(audio.play()).catch(()=>{if(revisions.get(audio)===request)playing.delete(audio);});
    } catch{
      playing.delete(audio);
      return false;
    }
    return true;
  }
  return {
    play,
    setEnabled(value){
      enabled=!!value;
      if(!enabled)stop();
    },
    setHidden(value){
      hidden=!!value;
      if(hidden)stop();
    },
    setVolume(value){
      volume=clamp(value);
      for(const [cue,audio] of media)audio.volume=volume*clamp(gains[cue]??1);
    },
    get state(){
      return {enabled,hidden,voices:playing.size,cached:media.size};
    },
    destroy(){
      destroyed=true;
      stop();
      media.clear();
      lastPlayed.clear();
      revisions.clear();
    },
  };
}
export function farmMatchCue(cue){
  return ({
      pick:'tile-pick',
      tap:'tile-pick',
      match:'tile-match',
      win:'first-clear',
      lost:'soft-error',
      undo:'button',
      shuffle:'combo',
      stash:'button',
      return:'tile-pick'
    })[cue]||cue;
}
