import {FARM_REWARDS,farmProgress,farmReward,farmPage} from './farm-progress.mjs';
const HOME_MARKUP = `
      <div class="scene" role="img" aria-label="空空的草地，云朵轻轻飘过" id="scene">
        <img class="landscape" src="./assets/farm/sticker-meadow.png" alt="" fetchpriority="high">
        <div class="sky-light" aria-hidden="true"></div>
        <div id="natural-layers" aria-hidden="true"></div>
        <div id="farm-layers" aria-hidden="true"></div>
        <div class="fireflies" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <header class="home-top"><span class="home-name">我的小小世界</span><button class="round-button" id="journal-open" aria-label="打开牧场手账" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h12a2 2 0 0 1 2 2V20H7a3 3 0 0 1-3-3V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5"/><path d="M7 5v15M11 9h5M11 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></header>
      <div class="home-title"><span class="tiny-stars">✦ &nbsp; 一关一季，一点一滴 &nbsp; ✦</span><h2>羊羊牧场</h2><p id="home-subtitle">这里的一切，都会因你而来。</p></div>
      <div class="chapter"><span class="chapter-line"></span><span id="chapter-label">第一章 · 风吹过的地方</span><span class="chapter-line"></span></div>
      <div class="home-bottom">
        <button class="next-gift" id="gift-open" aria-haspopup="dialog"><span class="gift-icon" aria-hidden="true">✿</span><span class="gift-copy"><small id="gift-caption">再过 4 关，小花园就来啦</small><b id="gift-name">下一份礼物 · 门前的小花园</b></span><span class="gift-arrow">›</span></button>
        <button class="play-button" id="play">开始闯关 <span>→</span></button>
        <div class="home-footer"><span id="cleared-label">还没有足迹 · 从第 1 关开始</span><span>慢慢来，也很好</span></div>
      </div>
      <div class="home-toast" id="home-toast" role="status" aria-live="polite"></div>

      <dialog id="reward-dialog" aria-labelledby="reward-heading">
        <button class="dialog-close" data-close aria-label="关闭奖励">×</button>
        <div class="reward-seasons" aria-label="春夏秋冬全部完成"><span>春 ✓</span><span>夏 ✓</span><span>秋 ✓</span><span>冬 ✓</span></div>
        <p class="reward-kicker" id="reward-kicker">第 4 关 · 四季的小礼物</p>
        <h2 id="reward-heading">花开了，因为你。</h2>
        <div class="reward-art" id="reward-art" aria-hidden="true"></div>
        <h3 id="reward-name">门前的小花园</h3>
        <p class="reward-description" id="reward-description">空空的草地上，终于有了第一抹花色。</p>
        <button class="play-button" id="claim">把花园带回家 <span>♡</span></button>
        <p class="reward-footnote">每过 4 关，牧场就多一点幸福</p>
      </dialog>

      <dialog id="journal-dialog" aria-labelledby="journal-heading">
        <button class="dialog-close" data-close aria-label="关闭牧场手账">×</button><p class="reward-kicker">一点一滴，都是你的故事</p><h2 id="journal-heading">牧场成长手账</h2><p class="journal-intro">春夏秋冬走一圈，就给家添一点喜欢。</p><ol id="journal-list"></ol><button class="paper-button" data-close>回家看看</button>
      </dialog>`;
const spriteNames = ['tree','grass','star','cloud','sun','pond','sheep','duck','house','fence','flowers','chick'];
const spriteStyle = name => {
  const i = spriteNames.indexOf(name);
  return `--sprite-x:${(i % 4) * 100 / 3}%;--sprite-y:${Math.floor(i / 4) * 50}%;`;
};
const sprite = (name, x, y, w, motion='', delay=0, z=1, extra='') => {
  const atmosphere=name==='pond'?'<span class="ripple"></span><span class="ripple second"></span>':name==='house'?'<span class="smoke"></span><span class="smoke second"></span>':'';
  return `<span class="layer ${motion} ${extra}" style="--x:${x}%;--y:${y}%;--w:${w}%;--z:${z};--delay:${delay}s;${spriteStyle(name)}"><span class="sticker"></span>${atmosphere}</span>`;
};
const natural = [
  ['sun',77,8,20,'sun',0,0],['cloud',-7,26,32,'cloud',-4,0],['cloud',77,29,29,'cloud',-12,0],
  ['star',9,8,8,'star',0,0],['star',71,20,5,'star',-2,0],['star',19,29,4.5,'star',-3,0],
  ['grass',-4,58,16,'sway',-1,6],['grass',84,59,15,'sway',-3,6],['grass',7,69,16,'sway',-2,8],['grass',78,72,13,'sway',-4,8],['grass',41,71,11,'sway',0,8],
];
const farm = [
  {at:4,parts:[['fence',-2,58,28,'',0,2],['fence',21,58,25,'',0,2],['flowers',7,60,19,'sway',-2,3],['flowers',26,61,16,'sway',-4,3]]},
  {at:8,parts:[['sheep',49,53,20,'walk',-1,6]]},
  {at:12,parts:[['house',18,39,34,'',0,1]]},
  {at:16,parts:[['tree',-7,36,31,'sway',-2,2],['tree',75,37,29,'sway',-3,1],['flowers',64,47,17,'sway',-1,2]]},
  {at:20,parts:[['pond',61,52,34,'',0,3],['duck',67,60,13,'float',0,5],['duck',80,62,10,'float',-1,5]]},
  {at:24,parts:[['sheep',28,62,18,'walk',-7,7],['sheep',4,64,16,'walk',-5,7],['chick',50,66,9,'chick',-2,9],['chick',59,67,7.5,'chick',-2.2,9],['chick',66,68,6.5,'chick',-2.4,9],['flowers',-3,71,18,'sway',-2,9]]},
];

export function createFarmHome(root,{onContinue,onMusic,onSeen=()=>{}}){
  root.innerHTML=HOME_MARKUP;
  const $=selector=>root.querySelector(selector);
  let progress=farmProgress(null),game=null,unlocked=0,seen=0,page=0,pending=null,toastTimer;
  const musicButton=document.createElement('button');
  musicButton.className='round-button';musicButton.id='home-music';musicButton.textContent='♫';
  musicButton.setAttribute('aria-label','打开音乐设置');musicButton.setAttribute('aria-haspopup','dialog');
  $('.home-top').insertBefore(musicButton,$('#journal-open'));musicButton.addEventListener('click',onMusic);
  $('.chapter').innerHTML='<button id="farm-prev" aria-label="查看上一座牧场">‹</button><span id="chapter-label"></span><button id="farm-next" aria-label="查看下一座牧场">›</button>';
  $('#natural-layers').innerHTML=natural.map(p=>sprite(...p)).join('');

  function paint(animateFrom=6){
    const selected=farmPage(progress,page);page=selected.index;
    const next=farmReward(progress.rewards+1);
    $('#farm-layers').innerHTML=farm.filter(g=>g.at<=selected.filled*4).map(g=>g.parts.map(p=>sprite(...p,g.at>animateFrom*4?'new-arrival':'')).join('')).join('');
    $('#scene').setAttribute('aria-label',selected.filled===0?'空空的草地，星星闪烁，云朵轻轻飘过':`第 ${page+1} 座牧场，有${FARM_REWARDS.slice(0,selected.filled).map(m=>m.short).join('、')}`);
    $('#home-subtitle').textContent=selected.filled===0?'这里的一切，都会因你而来。':selected.filled<3?'你看，它已经有一点不一样了。':selected.filled<6?'慢慢地，这里变成了家。':'每一处热闹，都是你的足迹。';
    $('#chapter-label').textContent=`第 ${page+1} 座牧场 · ${selected.filled===6?'满满的喜欢':'慢慢长大的家'}`;
    $('#farm-prev').disabled=page===0;$('#farm-next').disabled=page===progress.latest;
    $('#gift-caption').textContent=`再过 ${progress.remaining} 关，${next.short}就来啦`;
    $('#gift-name').textContent=`下一份礼物 · ${next.name}`;
    const nextLevel=game?.status==='won'?unlocked:(game?.level||0);
    $('#play').innerHTML=(game?.started&&game.status!=='won'?'继续闯关':progress.cleared?'继续闯关':'开始闯关')+` <small>${game?.mode==='daily'&&game.status!=='won'?'今日挑战':`第 ${nextLevel+1} 关`}</small> <span>→</span>`;
    $('#cleared-label').textContent=progress.cleared?`已走过 ${progress.cleared} 关 · 收获 ${progress.rewards} 份惊喜`:'还没有足迹 · 从第 1 关开始';
    $('#journal-heading').textContent=`第 ${page+1} 座牧场手账`;
    $('#journal-list').innerHTML=FARM_REWARDS.map((m,i)=>{
      const reward=farmReward(page*6+i+1),earned=reward.number<=progress.rewards;
      return `<li class="${earned?'earned':''}"><span class="journal-thumb sticker" style="${spriteStyle(m.icon)}"></span><span class="journal-copy">${m.name}<small>第 ${reward.level} 关 · ${earned?'已经在家里啦':'等待相遇'}</small></span><span class="journal-check">${earned?'✓':'·'}</span></li>`;
    }).join('');
    $('.journal-intro').textContent='每四关收获一份礼物。布置满后，继续开拓下一座牧场。';
  }
  function update(stats,currentGame,acknowledged){
    const next=farmProgress(stats);
    if(next.rewards!==progress.rewards)page=next.latest;
    progress=next;game=currentGame;unlocked=stats.unlocked;seen=Math.max(0,Math.min(progress.rewards,acknowledged||0));paint();
  }
  function openReward(){
    if(progress.rewards<=seen)return;
    pending=farmReward(progress.rewards);page=pending.farm;paint();
    $('#reward-kicker').textContent=`第 ${pending.level} 关 · 四季的小礼物`;
    $('#reward-heading').textContent=pending.heading;$('#reward-name').textContent=pending.name;
    $('#reward-description').textContent=pending.description;$('#claim').innerHTML=pending.claim+' <span>♡</span>';
    $('#reward-art').innerHTML=sprite(pending.icon,11,0,78,pending.icon==='duck'?'float':'sway');
    $('#reward-dialog').showModal();
  }
  $('#reward-dialog').addEventListener('close',()=>{
    if(!pending)return;
    const reward=pending;pending=null;seen=reward.number;onSeen(seen);page=reward.farm;paint(reward.step-1);
    clearTimeout(toastTimer);$('#home-toast').textContent=reward.toast;$('#home-toast').classList.add('visible');
    toastTimer=setTimeout(()=>$('#home-toast').classList.remove('visible'),3600);
  });
  $('#claim').addEventListener('click',()=>$('#reward-dialog').close());
  $('#play').addEventListener('click',onContinue);
  $('#farm-prev').addEventListener('click',()=>{page--;paint();});$('#farm-next').addEventListener('click',()=>{page++;paint();});
  $('#journal-open').addEventListener('click',()=>$('#journal-dialog').showModal());
  $('#gift-open').addEventListener('click',()=>progress.rewards>seen?openReward():$('#journal-dialog').showModal());
  root.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $('#farm-layers').addEventListener('animationend',event=>{if(event.animationName==='farm-arrive')event.target.classList.remove('new-arrival');});
  root.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',event=>{
    if(event.target!==d)return;const r=d.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();
  }));
  return {update,openReward,
    closePanels(){root.querySelectorAll('dialog[open]').forEach(d=>d.close());},
    focus(){ $('#play').focus({preventScroll:true}); },
    setMusic(state){musicButton.textContent=state.playing?'♫':'♪';musicButton.setAttribute('aria-label',`打开音乐设置，${state.track?.title||'四季配乐'}，${state.playing?'正在播放':'音乐未播放'}`);},
  };
}
