import {createFarmSoundEffects,farmMatchCue} from './farm-audio.mjs';
import {createFarmStore} from './farm-save.mjs';
import {mountFarm} from './farm-scene-host.mjs';
import {mountFarmMatch} from './farm-match-ui.mjs';
export async function createFarmRuntime({
    onExit,
    onSound=()=> { } ,
    onMusicChange=()=> { } ,
    onSoundChange=()=>{},
    initialAudio={ },
    onScene=()=>{},
    getAudioSettings=()=>null,
    getMusicVolume=()=>.35,
    onMusicVolumeChange=()=>{}
  }) {
  const farmRoot=document.createElement('main');
  farmRoot.id='farm-game';
  farmRoot.hidden=true;
  farmRoot.setAttribute('aria-label','羊羊牧场经营');
  document.body.append(farmRoot);
  const matchRoot=document.createElement('main');
  matchRoot.id='farm-story-game';
  matchRoot.hidden=true;
  matchRoot.setAttribute('aria-label','牧场故事三消');
  document.body.append(matchRoot);
  const store=createFarmStore();
  await store.ready;
  if(store.getState().revision===0&&!store.readOnly&&Object.keys(initialAudio).length) store.dispatch({ type:'setSettings', settings:initialAudio });
  const farmSounds=createFarmSoundEffects({enabled:store.getState().settings.sound,hidden:true});
  let lastMusic=store.getState().settings.music,lastSound=store.getState().settings.sound;
  const unsubscribeAudio=store.subscribe(state=> {
      if(state.settings.sound!==lastSound){
        lastSound=state.settings.sound;
        farmSounds.setEnabled(lastSound);
        onSoundChange(lastSound);
      }
      if(state.settings.music!==lastMusic) {
        lastMusic=state.settings.music;
        onMusicChange(lastMusic);
      }
    } );
  let active=false,ui=null,match=null;
  function checked(command) {
    const result=store.dispatch(command);
    if(!result.ok) throw Object.assign(new Error(result.message||'保存失败，操作未执行'),{ code:result.code });
    return result;
  }
  function showFarm() {
    if(!active){
      const audio=getAudioSettings();
      if(audio&&!store.readOnly)store.dispatch({type:'setSettings',settings:audio});
    }
    active=true;
    farmSounds.setHidden(document.hidden);
    onScene('farm');
    match?.destroy();
    match=null;
    matchRoot.hidden=true;
    farmRoot.hidden=false;
    store.dispatch({ type:'tick' });
    if(!ui) ui=mountFarm({
        root:farmRoot,
        store,
        onExit:exit,
        onStartStage:startStage,
        getMusicVolume,
        onMusicVolumeChange,
        onSound:cue=>farmSounds.play(cue)
      }); else ui.refresh?.();
    ui?.setActive?.(true);
    document.body.dataset.view='farm';
  }
  function startStage(stageId,seed,confirmedSwitch=false) {
    const current=store.getState().branch.active;
    const target=Number(stageId.slice(1))-1;
    if(current?.status==='playing'&&current.started&&current.level!==target&&!confirmedSwitch) return {ok:false,code:'stage-switch-confirmation',message:'换一章会重置当前牌面，请先确认。农场进度和已领首通奖励不变。'};
    let result;
    try {
      result=checked({ type:'startStage', stageId, seed });
    } catch(error) {
      const notice=matchRoot.querySelector('.farm-match-notice');
      if(notice) notice.textContent=error.message;
      return { ok:false, code:error.code, message:error.message };
    }
    ui?.setActive?.(false);
    farmRoot.hidden=true;
    matchRoot.hidden=false;
    match?.destroy();
    match=mountFarmMatch({
        root:matchRoot,
        store,
        onExit:showFarm,
        onStartStage:startStage,
        onSound:cue=> {
          if(store.getState().settings.sound) farmSounds.play(farmMatchCue(cue));
        }
      });
    onScene('match');
    document.body.dataset.view='farm-story';
    return result;
  }
  function exit() {
    store.dispatch({ type:'tick' });
    active=false;
    farmSounds.setHidden(true);
    ui?.setActive?.(false);
    match?.destroy();
    match=null;
    farmRoot.hidden=true;
    matchRoot.hidden=true;
    onExit();
  }
  const tick=()=> {
    farmSounds.setHidden(!active||document.hidden);
    if(active&&!document.hidden) store.dispatch({ type:'tick' });
  } ;
  const timer=setInterval(tick,1000);
  document.addEventListener('visibilitychange',tick);
  window.addEventListener('pageshow',tick);
  const finalTick=()=> {
    farmSounds.setHidden(true);
    if(active) store.dispatch({ type:'tick' });
  } ;
  window.addEventListener('pagehide',finalTick);
  return {
    open:showFarm,
    store,
    destroy() {
      clearInterval(timer);
      document.removeEventListener('visibilitychange',tick);
      window.removeEventListener('pageshow',tick);
      window.removeEventListener('pagehide',finalTick);
      ui?.destroy();
      match?.destroy();
      unsubscribeAudio();
      farmSounds.destroy();
      store.close();
      farmRoot.remove();
      matchRoot.remove();
    }
  };
}
