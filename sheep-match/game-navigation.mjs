/** Same-document UI history only: no economy snapshots, reloads or back traps. */
const STATE_KEY='sheepPastureNavigation';
const MAX_DEPTH=64;
const kinds=new Set(['home','game','farm','scene','facility','match','confirm']);
const copy=value=>JSON.parse(JSON.stringify(value));
function validState(state){
 const s=state?.[STATE_KEY];
 if(s?.version!==1||typeof s.session!=='string'||!Number.isSafeInteger(s.index)||s.index<0||!Array.isArray(s.path)||!s.path.length||s.path.length>MAX_DEPTH)return null;
 if(s.path.some((r,i)=>!r||!kinds.has(r.kind)||typeof r.key!=='string'||!Number.isSafeInteger(r.at)||r.at<0||r.at>s.index||(i&&r.at<=s.path[i-1].at)))return null;
 if(s.path[0].kind!=='home'||s.path[0].at!==0)return null;
 return copy(s);
}
export function createGameNavigation(win){
 const listeners=new Set(),queued=[];
 let state=validState(win.history.state),pending=false,destroyed=false;
 if(!state)state={version:1,session:`${Date.now()}-${Math.random().toString(36).slice(2)}`,index:0,path:[{kind:'home',key:'home',at:0}]};
 // A confirmation callback is intentionally never serialized across a reload.
 const transient=state.path.findIndex(r=>r.kind==='confirm');
 if(transient>=0)state.path=state.path.slice(0,transient);
 const write=method=>win.history[method]({...win.history.state,[STATE_KEY]:copy(state)},'');
 write('replaceState');
 const emit=()=>{for(const fn of [...listeners])fn(copy(state.path));};
 const perform=fn=>{if(destroyed)return false;if(pending){queued.push(fn);return true;}return fn();};
 const flush=()=>{while(!pending&&queued.length)queued.shift()();};
 const travel=target=>{if(target>=state.index)return false;pending=true;win.history.go(target-state.index);return true;};
 function pop(event){
  const next=validState(event.state);
  // Do not manufacture a replacement entry on Back out of this game's history.
  if(!next||next.session!==state.session){pending=false;queued.length=0;return;}
  state=next;pending=false;emit();flush();
 }
 win.addEventListener('popstate',pop);
 return {
  get path(){return copy(state.path);},get pending(){return pending;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  push(route){return perform(()=>{
   if(!kinds.has(route?.kind)||state.path.length>=MAX_DEPTH)return false;
   const clean=copy(route),last=state.path.at(-1),identity=r=>JSON.stringify({...r,key:undefined,at:undefined});
   if(identity(last)===identity(clean))return false;
   const at=state.index+1;state={...state,index:at,path:[...state.path,{...clean,key:`${state.session}:${at}:${Math.random().toString(36).slice(2)}`,at}]};write('pushState');emit();return true;
  });},
  back(){const key=state.path.at(-1).key;return perform(()=>{const i=state.path.findIndex(r=>r.key===key);return i>0?travel(state.path[i-1].at):false;});},
  close(key){return perform(()=>{const i=state.path.findIndex(r=>r.key===key);return i>0?travel(state.path[i-1].at):false;});},
  home(){return perform(()=>state.path.length>1?travel(0):false);},
  /** Invalid/unavailable UI routes can be dropped without adding history entries. */
  trim(length){return perform(()=>{if(length<1||length>=state.path.length)return false;state={...state,path:state.path.slice(0,length)};write('replaceState');emit();return true;});},
  replaceTop(route){return perform(()=>{const old=state.path.at(-1);state={...state,path:[...state.path.slice(0,-1),{...copy(route),key:old.key,at:old.at}]};write('replaceState');emit();return true;});},
  destroy(){destroyed=true;queued.length=0;listeners.clear();win.removeEventListener('popstate',pop);}
 };
}
