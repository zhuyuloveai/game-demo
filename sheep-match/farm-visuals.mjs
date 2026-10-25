/** Presentation-only selectors. No timers, random numbers, or economic mutations. */
import {farmAnimalClip} from './farm-assets.mjs';
export function farmMachineVisual(machine,now,stars=0) {
  if(machine.kind!=='machine')return {state:null,overlay:null,mastery:null,label:''};
  let state=null,label='空闲';
  if(!machine.built){
    state=machine.buildReadyAt<=now?'complete':'constructing';
    label=state==='complete'?'建造完成，待确认':'建造中';
  } else if(machine.completed.length>=9){
    state='full';
    label='完成区已满，下一批暂停';
  } else if(machine.completed.length){
    state='complete';
    label=`${machine.completed.length}批成品待领`;
  } else if(machine.queue.some(job=>job.startAt!==null)){
    state='processing';
    label='加工中';
  }
  return {
    state,
    overlay:state?`buildings.state.${state}`:null,
    mastery:machine.built?`buildings.state.mastery-${Math.max(0,Math.min(3,Math.floor(stars)))}`:null,
    label
  };
}
export function farmAnimalVisual(animal,{time=0,reducedMotion=false,rotation=0,transient=null,activity=null}={}) {
  const semanticState=animal.status==='hungry'?'idle':animal.status==='ready'?'ready':'producing';
  let state=semanticState,elapsed=time,direction=({0:'front',90:'right',180:'back',270:'side'})[rotation]||'front';
  if(activity?.walking&&animal.status!=='ready'&&!reducedMotion){
    state='walk';
    elapsed=activity.elapsed;
  }
  if(transient&&time>=transient.start&&time<transient.until&&['eat','collect'].includes(transient.state)){
    state=transient.state;
    elapsed=time-transient.start;
  }

  // The asset contract specifies a static front/idle frame in reduced-motion mode.
  // Readable status labels and product badges remain driven by the actual state.
  if(reducedMotion){
    state='idle';
    direction='front';
    elapsed=0;
  }
  const clip=farmAnimalClip(animal.configId,state,direction);
  const cursor=Math.max(0,Math.floor(elapsed*clip.fps/1000));
  const frame=clip.loop?cursor%clip.urls.length:Math.min(clip.urls.length-1,cursor);
  return {src:clip.urls[frame],state,semanticState,direction,frame,mirror:!reducedMotion&&clip.mirrorX};
}
