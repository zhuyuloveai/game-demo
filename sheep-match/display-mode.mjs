/** Native display controls. No save state or simulated screen rotation. */
export function createDisplayController({doc=document,screen=globalThis.screen,onChange=()=>{}}={}) {
  let busy=false,locked='auto',message='',disposed=false,wasFullscreen=false,generation=0;
  const full=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement);
  const request=()=>doc.documentElement.requestFullscreen||doc.documentElement.webkitRequestFullscreen;
  const exit=()=>doc.exitFullscreen||doc.webkitExitFullscreen;
  function state(){return {fullscreen:full(),fullscreenSupported:!!request()&&doc.fullscreenEnabled!==false,busy,locked,message};}
  function emit(){if(!disposed)onChange(state());}
  function unlock(){screen?.orientation?.unlock?.();locked='auto';}
  function releaseOrientation(){generation++;try{unlock();}catch{locked='auto';}message='';emit();}
  function changed(){const current=full();if(wasFullscreen&&!current)releaseOrientation();wasFullscreen=current;emit();}
  async function transition(method,target,expected) {
    let resolve,timer;const observed=new Promise(r=>resolve=r);
    const check=()=>{if(full()===expected)resolve(true);};
    doc.addEventListener('fullscreenchange',check);doc.addEventListener('webkitfullscreenchange',check);
    try {
      await method.call(target,...(expected?[{navigationUI:'hide'}]:[]));
      if(full()!==expected){
        timer=setTimeout(()=>resolve(false),2000);
        if(!await observed)throw Error('FULLSCREEN_NOT_CHANGED');
      }
    } finally {
      clearTimeout(timer);doc.removeEventListener('fullscreenchange',check);doc.removeEventListener('webkitfullscreenchange',check);
    }
  }
  async function enter(){
    if(full())return;
    const method=request();if(!method||doc.fullscreenEnabled===false)throw Error('UNSUPPORTED_FULLSCREEN');
    await transition(method,doc.documentElement,true);
    if(!full())throw Error('UNSUPPORTED_FULLSCREEN');
    wasFullscreen=true;
  }
  async function action(type){
    if(busy||disposed)return false;
    busy=true;message='';const version=generation;emit();
    try {
      if(type==='fullscreen'){
        if(full()){const method=exit();if(!method)throw Error('UNSUPPORTED_FULLSCREEN');await transition(method,doc,false);}else await enter();
      } else if(type==='auto') {unlock();message='已跟随设备方向；横置手机即可横屏游玩。';}
      else if(type==='landscape'||type==='portrait') {
        if(!screen?.orientation?.lock){message='当前浏览器不支持自动转向。请关闭手机方向锁定，再横置或竖置手机，游戏会随屏幕调整。';return false;}
        if(!full()&&request()&&doc.fullscreenEnabled!==false)await enter();
        if(version!==generation||disposed)return false;
        await screen.orientation.lock(type);
        if(version!==generation||disposed){try{unlock();}catch{}return false;}
        locked=type;message=type==='landscape'?'已锁定横屏。':'已锁定竖屏。';
      } else return false;
      changed();return true;
    } catch(error) {
      if(type==='fullscreen')message='浏览器未允许全屏。请在独立浏览器页面重试；不支持全屏的设备可添加到主屏幕后打开。';
      else message='浏览器未允许锁定方向。请开启手机自动旋转，再横置或竖置手机；也可以先点全屏后重试。';
      return false;
    } finally {busy=false;emit();}
  }
  doc.addEventListener('fullscreenchange',changed);doc.addEventListener('webkitfullscreenchange',changed);
  emit();
  return {state,action,releaseOrientation,destroy(){disposed=true;generation++;doc.removeEventListener('fullscreenchange',changed);doc.removeEventListener('webkitfullscreenchange',changed);try{unlock();}catch{}}};
}

export function mountDisplayControls(doc=document,win=window){
  const dialog=doc.createElement('dialog');dialog.className='display-dialog';dialog.id='display-settings';dialog.setAttribute('aria-labelledby','display-title');
  dialog.innerHTML=`<header><div><small>看得更舒服一点</small><h2 id="display-title">屏幕与方向</h2></div><button type="button" data-display-close aria-label="关闭屏幕设置">×</button></header><p class="display-current"></p><button type="button" class="display-fullscreen" data-display-action="fullscreen">进入全屏</button><section class="display-farm-direction"><h3>牧场游玩方向</h3><div class="display-directions" role="group" aria-label="游玩方向"><button type="button" data-display-action="auto">自动</button><button type="button" data-display-action="landscape">横屏</button><button type="button" data-display-action="portrait">竖屏</button></div></section><p class="display-result" role="status" aria-live="polite"></p><p class="display-help">部分手机浏览器需要先全屏才能锁定方向。不支持自动切换时，请开启手机自动旋转，再转动手机。</p>`;
  doc.body.append(dialog);
  const fullscreen=dialog.querySelector('[data-display-action="fullscreen"]'),result=dialog.querySelector('.display-result');
  const direction=()=>win.innerWidth>win.innerHeight?'横屏':'竖屏';
  const farmScope=()=>doc.body.dataset.view==='farm';
  function paint(s){
    dialog.querySelector('.display-farm-direction').hidden=!farmScope();
    dialog.querySelector('.display-help').textContent=farmScope()?'部分手机浏览器需要先全屏才能锁定方向。不支持自动切换时，请开启手机自动旋转，再转动手机。':'横屏切换仅用于经营牧场；首页和三消沿用竖版布局。';
    fullscreen.textContent=s.fullscreen?'退出全屏':'进入全屏';fullscreen.setAttribute('aria-pressed',String(s.fullscreen));
    dialog.querySelector('.display-current').textContent=`当前：${direction()} · ${s.fullscreen?'全屏':'浏览器窗口'}`;
    for(const button of dialog.querySelectorAll('[data-display-action]')){
      button.disabled=s.busy;
      if(button!==fullscreen)button.setAttribute('aria-pressed',String(button.dataset.displayAction===s.locked));
    }
    result.textContent=s.message||(!s.fullscreenSupported?'当前浏览器没有开放全屏，仍可转动手机切换布局。':'全屏后可看到更大的牧场；退出全屏也会恢复自动方向。');
  }
  const controller=createDisplayController({doc,screen:win.screen,onChange:paint});
  let opener=null;
  function close(){if(dialog.open)dialog.close();const target=opener?.isConnected?opener:[...doc.querySelectorAll('[data-display-open]')].find(el=>el.getClientRects().length);target?.focus({preventScroll:true});}
  function open(button){if(dialog.open)return;opener=button;paint(controller.state());dialog.showModal();}
  function click(event){
    const button=event.target.closest('[data-display-open]');if(button){event.preventDefault();open(button);return;}
    const action=event.target.closest('[data-display-action]');if(action&&dialog.contains(action)){if(action.dataset.displayAction==='fullscreen'||farmScope())controller.action(action.dataset.displayAction);}
    else if(event.target.closest('[data-display-close]'))close();
    else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}
  }
  let inFarm=farmScope();
  const observer=new win.MutationObserver(()=>{const next=farmScope();if(inFarm&&!next)controller.releaseOrientation();inFarm=next;paint(controller.state());});
  observer.observe(doc.body,{attributes:true,attributeFilter:['data-view']});
  const resized=()=>paint(controller.state());doc.addEventListener('click',click);win.addEventListener('resize',resized);
  return {open,close,destroy(){observer.disconnect();controller.destroy();doc.removeEventListener('click',click);win.removeEventListener('resize',resized);dialog.remove();}};
}
