import {FARM_SEASONS,farmProgress,farmReward,farmPage,farmTheme} from './farm-progress.mjs';
const HOME_MARKUP = `
      <div class="farm-scenes" id="farm-scenes" tabindex="0" role="region" aria-roledescription="轮播" aria-label="四季牧场，左右滑动或使用方向键切换"></div>
      <header class="home-top"><span class="home-name">我的四季小世界 <span id="farm-year"></span></span><span class="year-controls" id="year-controls"><button id="year-prev" aria-label="查看上一年的牧场">‹</button><button id="year-next" aria-label="查看下一年的牧场">›</button></span><button class="round-button" id="journal-open" aria-label="打开牧场笔记" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h12a2 2 0 0 1 2 2V20H7a3 3 0 0 1-3-3V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5"/><path d="M7 5v15M11 9h5M11 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></header>
      <div class="home-title"><span class="tiny-stars">✦ &nbsp; 一关一季，一点一滴 &nbsp; ✦</span><h2>羊羊牧场</h2><p id="home-subtitle">这里的一切，都会因你而来。</p></div>
      <div class="chapter"><button id="farm-prev" aria-label="查看上一个季节">‹</button><span id="chapter-label" aria-live="polite"></span><button id="farm-next" aria-label="查看下一个季节">›</button></div>
      <nav class="season-pager" id="season-pager" aria-label="四季场景"></nav>
      <div class="scene-lock" id="scene-lock" hidden><span aria-hidden="true">♧</span><b id="lock-title"></b><small id="lock-copy"></small></div>
      <div class="home-bottom">
        <p class="swipe-hint" id="swipe-hint">← 左右滑动，逛逛四季 →</p>

        <button class="next-gift" id="gift-open" aria-haspopup="dialog"><span class="gift-icon" aria-hidden="true">✿</span><span class="gift-copy"><small id="gift-caption">再过 4 关，小花园就来啦</small><b id="gift-name">下一份礼物 · 门前的小花园</b></span><span class="gift-arrow">›</span></button>
        <button class="play-button" id="play">开始闯关 <span>→</span></button>
        <div class="home-footer"><span id="cleared-label">还没有足迹 · 从第 1 关开始</span><span>慢慢来，也很好</span></div>
      </div>
      <div class="home-toast" id="home-toast" role="status" aria-live="polite"></div>

      <dialog id="reward-dialog" aria-labelledby="reward-heading">
        <button class="dialog-close" data-close aria-label="关闭奖励">×</button>
        <div class="reward-seasons" aria-label="四关小旅程完成"><span>春 ✓</span><span>夏 ✓</span><span>秋 ✓</span><span>冬 ✓</span></div>
        <p class="reward-kicker" id="reward-kicker">第 4 关 · 四季的小礼物</p>
        <h2 id="reward-heading">花开了，因为你。</h2>
        <div class="reward-art" id="reward-art" aria-hidden="true"></div>
        <h3 id="reward-name">门前的小花园</h3>
        <p class="reward-description" id="reward-description">空空的草地上，终于有了第一抹花色。</p>
        <button class="play-button" id="claim">把花园带回家 <span>♡</span></button>
        <p class="reward-footnote">每过 4 关，牧场就多一点幸福</p>
      </dialog>`;
const spriteNames = ['tree','grass','star','cloud','sun','pond','sheep','duck','house','fence','flowers','chick'];
const spriteStyle = name => {
  const i = spriteNames.indexOf(name);
  return `--sprite-x:${(i % 4) * 100 / 3}%;--sprite-y:${Math.floor(i / 4) * 50}%;`;
};
export function stickerArtwork(name,theme,preview=false) {
  const atlas=preview?(theme.previewAtlas||theme.atlas):theme.atlas;
  const box=atlas?.frames?.[name];
  if(!box)return '<span class="sticker"></span>';
  return `<svg class="sticker cropped-sticker" viewBox="0 0 100 100" aria-hidden="true"><svg x="10" y="10" width="80" height="80" viewBox="${box.join(' ')}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><image href="./assets/farm/${theme.stickers}" width="${atlas.width}" height="${atlas.height}"/></svg></svg>`;
}
function sprite(parts, theme, extra='') {
  const season=theme.key;
  const [name,x,y,w,motion='',delay=0,z=1]=parts;
  const atmosphere=name==='pond'&&season==='spring'?'<span class="ripple"></span><span class="ripple second"></span>':name==='house'&&['spring','winter'].includes(season)?'<span class="smoke"></span><span class="smoke second"></span>':'';
  return `<span class="layer ${motion} ${extra}" style="--x:${x}%;--y:${y}%;--w:${w}%;--z:${z};--delay:${delay}s;${spriteStyle(name)}">${stickerArtwork(name,theme)}${atmosphere}</span>`;
}

export function createFarmHome(root,{onContinue,onMusic,onFarm=()=>{},onSeen=()=>{},onReward=()=>{},onJournal=()=>{},onScene=()=>{},onGesture=()=>{},initialPage}) {
  root.innerHTML=HOME_MARKUP;
  const $=selector=>root.querySelector(selector);
  const track=$('#farm-scenes'), reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let progress=farmProgress(null),game=null,unlocked=0,seen=0,page=0,pending=null,toastTimer;
  let initialized=false,renderedYear=-1,renderedRewards=-1,reported=-1,scrollTarget=null,drag=null,touch=null;
  const musicButton=document.createElement('button');
  musicButton.className='round-button';musicButton.id='home-music';musicButton.textContent='♫';
  musicButton.setAttribute('aria-label','打开音乐设置');musicButton.setAttribute('aria-haspopup','dialog');
  $('.home-top').insertBefore(musicButton,$('#journal-open'));
  musicButton.addEventListener('click',onMusic);

  function sceneMarkup(index,animateFrom=6) {
    const selected=farmPage(progress,index),theme=farmTheme(index);
    const parts=theme.groups.slice(0,selected.filled).map((g,i)=>g.parts.map(p=>sprite(p,theme,i>=animateFrom?'new-arrival':'')).join('')).join('');
    const label=selected.unlocked?`${theme.name}，已布置 ${selected.filled} 组元素`:`${theme.name}，第 ${selected.unlockAt} 关后解锁`;
    return `<section class="scene season-scene" data-scene="${index}" data-season="${theme.key}" role="${theme.key==='spring'?'group':'img'}" aria-label="${label}" style="--farm-stickers:url('./assets/farm/${theme.stickers}')">
      <img class="landscape" src="./assets/farm/${theme.background}" alt="" draggable="false" loading="${index===page?'eager':'lazy'}">
      <div class="sky-light" aria-hidden="true"></div>
      <div class="natural-layers" aria-hidden="true">${theme.natural.map(p=>sprite(p,theme)).join('')}</div>
      <div class="farm-layers" aria-hidden="true">${parts}</div>
      ${theme.key==='spring'?`<button class="farm-house-entry" aria-label="进入羊羊牧场经营" title="进入牧场" style="--entry-x:14%;--entry-y:42%;--entry-w:33%">${selected.filled<3?stickerArtwork('house',theme):''}<span>进入牧场 ↗</span></button>`:''}
      <div class="season-weather" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
    </section>`;
  }
  function buildScenes(animateFrom=6) {
    const year=Math.floor(page/4);
    track.innerHTML=FARM_SEASONS.map((_,i)=>sceneMarkup(year*4+i,year*4+i===page?animateFrom:6)).join('');
    renderedYear=year;renderedRewards=progress.rewards;
    align(false);
  }
  function align(smooth) {
    if(!track.clientWidth)return;
    scrollTarget=(page%4)*track.clientWidth;
    track.scrollTo({left:scrollTarget,behavior:smooth&&!reduced.matches?'smooth':'instant'});
    if(Math.abs(track.scrollLeft-scrollTarget)<2)scrollTarget=null;
  }
  function paint() {
    const selected=farmPage(progress,page),theme=farmTheme(page),year=Math.floor(page/4);
    const next=farmReward(progress.rewards+1);
    root.dataset.season=theme.key;
    root.style.setProperty('--farm-stickers',`url('./assets/farm/${theme.stickers}')`);
    $('#home-subtitle').textContent=theme.subtitle;
    $('#farm-year').textContent=progress.latest>=4?`· 第 ${year+1} 年`:'';
    $('#year-controls').hidden=progress.latest<4;
    $('#year-prev').disabled=year===0;$('#year-next').disabled=year===Math.floor(progress.latest/4);
    $('#chapter-label').textContent=`${theme.name} · ${selected.unlocked?`${selected.filled} / 6`:'待开启'}`;
    $('#farm-prev').disabled=page===0;
    $('#farm-next').disabled=page===Math.floor(progress.latest/4)*4+3;
    $('#season-pager').innerHTML=FARM_SEASONS.map((s,i)=>{
      const index=year*4+i,locked=index>progress.latest;
      return `<button data-page="${index}" aria-label="${locked?'预览':'查看'}${s.name}${locked?'，尚未解锁':''}" aria-current="${index===page?'true':'false'}">${s.short}<span aria-hidden="true">${locked?'♧':index<progress.latest?'✓':'·'}</span></button>`;
    }).join('');
    for(const scene of track.children)scene.setAttribute('aria-hidden',String(Number(scene.dataset.scene)!==page));
    $('#scene-lock').hidden=selected.unlocked;
    $('#lock-title').textContent=`${theme.name}，等你来`;
    $('#lock-copy').textContent=`布置满${farmTheme(page-1).name}后开启 · 第 ${selected.unlockAt} 关`;
    $('#swipe-hint').textContent=selected.unlocked?'← 左右滑动，逛逛四季 →':'预览中 · 每过 4 关，为牧场添一份礼物';
    if(!selected.unlocked) {
      $('#gift-caption').textContent=`先把${farmTheme(progress.latest).name}布置好吧`;
      $('#gift-name').textContent='回到正在建设的季节';
    } else if(selected.filled===6) {
      $('#gift-caption').textContent='这一季的六份礼物，都到家啦';
      $('#gift-name').textContent=`下一站 · ${farmTheme(page+1).name} 已开启`;
    } else {
      $('#gift-caption').textContent=`再过 ${progress.remaining} 关，${next.short}就来啦`;
      $('#gift-name').textContent=`下一份礼物 · ${next.name}`;
    }
    const nextLevel=game?.status==='won'?unlocked:(game?.level||0);
    $('#play').innerHTML=(game?.started&&game.status!=='won'?'继续闯关':progress.cleared?'继续闯关':'开始闯关')+` <small>${game?.mode==='daily'&&game.status!=='won'?'今日挑战':`第 ${nextLevel+1} 关`}</small> <span>→</span>`;
    $('#cleared-label').textContent=progress.cleared?`已走过 ${progress.cleared} 关 · 收获 ${progress.rewards} 份惊喜`:'还没有足迹 · 从第 1 关开始';
    if(reported!==page){reported=page;onScene(page,theme);}
  }
  function goTo(next,smooth=true) {
    const target=farmPage(progress,next).index;
    page=target;
    if(Math.floor(page/4)!==renderedYear)buildScenes();else align(smooth);
    paint();
  }
  function update(stats,currentGame,acknowledged) {
    const next=farmProgress(stats);
    if(!initialized){page=farmPage(next,initialPage).index;initialized=true;}
    else if(next.rewards>progress.rewards)page=farmReward(next.rewards).farm;
    progress=next;page=farmPage(progress,page).index;game=currentGame;unlocked=stats.unlocked;
    seen=Math.max(0,Math.min(progress.rewards,acknowledged||0));
    if(renderedRewards!==progress.rewards||renderedYear!==Math.floor(page/4))buildScenes();
    else align(false);
    paint();
  }
  function openReward() {
    if($('#reward-dialog').open)return true;
    if(progress.rewards<=seen)return false;
    pending=farmReward(progress.rewards);goTo(pending.farm,false);
    $('#reward-kicker').textContent=`${farmTheme(page).name} · 第 ${pending.level} 关的礼物`;
    $('#reward-heading').textContent=pending.heading;$('#reward-name').textContent=pending.name;
    $('#reward-description').textContent=pending.description;$('#claim').innerHTML=pending.claim+' <span>♡</span>';
    const theme=farmTheme(page);
    $('#reward-art').innerHTML=`<span class="layer sway" style="--x:11%;--y:0%;--w:78%;${spriteStyle(pending.icon)}">${stickerArtwork(pending.icon,theme,true)}</span>`;
    $('.reward-footnote').textContent=pending.step===6?`${farmTheme(page+1).name}已解锁，左滑去看看吧`:'每过 4 关，牧场就多一点幸福';
    $('#reward-dialog').showModal();
    return true;
  }
  function showToast(text){
    clearTimeout(toastTimer);$('#home-toast').textContent=text;$('#home-toast').classList.add('visible');
    toastTimer=setTimeout(()=>$('#home-toast').classList.remove('visible'),3600);
  }
  $('#reward-dialog').addEventListener('close',()=>{
    if(!pending)return;
    const reward=pending;pending=null;seen=reward.number;onSeen(seen);page=reward.farm;
    buildScenes(reward.step-1);paint();
    showToast(reward.step===6?`${farmTheme(page+1).name}开启啦，左滑去看看。`:reward.toast);
    onReward(reward);
  });
  $('#claim').addEventListener('click',()=>$('#reward-dialog').close());
  $('#play').addEventListener('click',onContinue);
  $('#farm-prev').addEventListener('click',()=>goTo(page-1));
  $('#farm-next').addEventListener('click',()=>goTo(page+1));
  $('#year-prev').addEventListener('click',()=>goTo((Math.floor(page/4)-1)*4));
  $('#year-next').addEventListener('click',()=>goTo((Math.floor(page/4)+1)*4));
  $('#season-pager').addEventListener('click',event=>{
    const button=event.target.closest('[data-page]');if(button)goTo(Number(button.dataset.page));
  });
  $('#journal-open').addEventListener('click',()=>onJournal('stories'));
  $('#gift-open').addEventListener('click',()=>{
    if(progress.rewards>seen){openReward();return;}
    const selected=farmPage(progress,page);
    if(!selected.unlocked)goTo(progress.latest);
    else if(selected.filled===6)goTo(page+1);
    else onJournal('decorations');
  });
  root.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  let entryDown=null;
  track.addEventListener('pointerdown',event=>{if(event.target.closest('.farm-house-entry'))entryDown={x:event.clientX,y:event.clientY,cancel:false};});
  track.addEventListener('pointermove',event=>{if(entryDown&&Math.hypot(event.clientX-entryDown.x,event.clientY-entryDown.y)>8)entryDown.cancel=true;});
  track.addEventListener('pointercancel',()=>{if(entryDown)entryDown.cancel=true;});
  track.addEventListener('click',event=>{if(!event.target.closest('.farm-house-entry'))return;if(event.detail===0||!entryDown?.cancel){onGesture();onFarm();}entryDown=null;});
  track.addEventListener('animationend',event=>{if(event.animationName==='farm-arrive')event.target.classList.remove('new-arrival');});
  root.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',event=>{
    if(event.target!==d)return;const r=d.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();
  }));

  // Touch uses native scrolling and snapping. Mouse dragging follows the same pages.
  track.addEventListener('scroll',()=>{
    if(!track.clientWidth||drag)return;
    if(scrollTarget!==null){if(Math.abs(track.scrollLeft-scrollTarget)<2)scrollTarget=null;return;}
    const next=renderedYear*4+Math.max(0,Math.min(3,Math.round(track.scrollLeft/track.clientWidth)));
    if(next!==page){page=next;paint();}
  },{passive:true});
  track.addEventListener('pointerdown',event=>{
    if(event.target.closest('.farm-house-entry'))return;
    scrollTarget=null;onGesture();
    if(event.pointerType!=='mouse'||event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX,left:track.scrollLeft,page};
    track.setPointerCapture(event.pointerId);track.classList.add('is-dragging');
  });
  track.addEventListener('pointermove',event=>{
    if(drag&&event.pointerId===drag.id)track.scrollLeft=drag.left+drag.x-event.clientX;
  });
  const endDrag=event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const start=drag,dx=start.x-event.clientX;drag=null;track.classList.remove('is-dragging');
    if(track.hasPointerCapture(event.pointerId))track.releasePointerCapture(event.pointerId);
    const step=event.type==='pointercancel'?0:Math.abs(dx)>Math.min(55,track.clientWidth*.18)?Math.sign(dx):0;
    goTo(start.page+step);
  };
  track.addEventListener('pointerup',endDrag);track.addEventListener('pointercancel',endDrag);
  // Native scrolling handles pages within a year; an outward swipe at either
  // edge must also reach the adjacent year. Touch events survive pan cancellation.
  track.addEventListener('touchstart',event=>{
    touch=null;
    if(event.touches.length!==1)return;
    const point=event.touches[0],edge=page%4;
    if((edge===0||edge===3)&&Math.abs(track.scrollLeft-edge*track.clientWidth)<2)
      touch={id:point.identifier,x:point.clientX,y:point.clientY,page};
  },{passive:true});
  track.addEventListener('touchend',event=>{
    if(!touch)return;
    const start=touch;touch=null;
    const point=Array.from(event.changedTouches).find(p=>p.identifier===start.id);
    if(!point)return;
    const dx=start.x-point.clientX,dy=start.y-point.clientY;
    if(Math.abs(dx)<Math.min(55,track.clientWidth*.18)||Math.abs(dx)<=Math.abs(dy))return;
    if((start.page%4===3&&dx>0)||(start.page%4===0&&dx<0))goTo(start.page+Math.sign(dx));
  },{passive:true});
  track.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
  track.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();onGesture();goTo(page+(event.key==='ArrowRight'?1:-1));
  });
  if(window.ResizeObserver)new ResizeObserver(()=>align(false)).observe(track);
  else window.addEventListener('resize',()=>align(false));
  return {update,openReward,
    get season(){return farmTheme(page);},
    closePanels(){root.querySelectorAll('dialog[open]').forEach(d=>d.close());},
    focus(){ $('#play').focus({preventScroll:true}); },
    setMusic(state){musicButton.textContent=state.playing?'♫':'♪';musicButton.setAttribute('aria-label',`打开音乐设置，${state.track?.title||'四季配乐'}，${state.playing?'正在播放':'音乐未播放'}`);},
  };
}
