import {STORIES} from './story-data.mjs';
import {collectedStories} from './story-progress.mjs';
import {farmProgress,farmTheme,farmPage,farmReward} from './farm-progress.mjs';
import {stickerArtwork} from './farm-home.mjs';

const artwork=story=>new URL(`./assets/story/${story.id}.webp`,import.meta.url).href;
const markup=`
<dialog id="pasture-notebook" class="pasture-paper" aria-labelledby="notebook-heading">
  <header class="notebook-header"><div><small>春、夏、秋、冬，各有两页。</small><h2 id="notebook-heading">绵绵的牧场笔记</h2></div><button class="notebook-close" data-book-close aria-label="合上牧场笔记">×</button></header>
  <nav class="notebook-tabs" aria-label="笔记内容"><button data-notebook-tab="stories" aria-pressed="true">四季故事 <span id="notebook-count"></span></button><button data-notebook-tab="decorations" aria-pressed="false">布置清单</button></nav>
  <div class="notebook-scroll">
    <section id="notebook-stories" aria-label="四季故事">
      <nav id="notebook-seasons" class="notebook-seasons" aria-label="故事季节"></nav>
      <article class="notebook-spread"><div class="notebook-left"><span id="notebook-page-label"></span><figure class="notebook-photo"><img id="notebook-image" alt=""><div id="notebook-locked" hidden>♧<p id="notebook-unlock"></p></div></figure><p id="notebook-caption"></p><small id="notebook-keepsake"></small></div><div class="notebook-right"><span id="notebook-phase"></span><h3 id="notebook-title"></h3><blockquote id="notebook-lines"></blockquote><p class="notebook-signature">—— 绵绵</p><button class="story-button" id="notebook-replay">▷ 重看这一段</button><nav class="notebook-pagination" aria-label="笔记翻页"><button id="notebook-prev" aria-label="笔记上一页">← 上一页</button><span id="notebook-page-count"></span><button id="notebook-next" aria-label="笔记下一页">下一页 →</button></nav></div></article>
      <div id="notebook-catalog" class="notebook-catalog" aria-label="八页故事目录"></div><p class="notebook-stamps" id="notebook-stamps"></p>
    </section>
    <section id="notebook-decorations" aria-label="布置清单" hidden><nav class="decoration-nav"><button id="decoration-prev" aria-label="清单上一个季节">‹</button><h3 id="decoration-heading"></h3><button id="decoration-next" aria-label="清单下一个季节">›</button></nav><p id="decoration-note"></p><ol id="decoration-list"></ol></section>
  </div>
</dialog>
<dialog id="pasture-story" class="pasture-paper" aria-labelledby="story-heading">
  <header class="story-header"><span id="story-chapter"></span><button id="story-skip" aria-label="跳过剧情并收录">跳过 ×</button></header>
  <div class="story-art"><img id="story-image" alt=""><div id="story-weather" aria-hidden="true"></div><div class="story-art-title"><small id="story-number"></small><h2 id="story-heading"></h2></div><span id="story-image-status" role="status"></span></div>
  <div class="story-copy"><div id="story-dots" aria-label="剧情进度"></div><p id="story-line" aria-live="polite"></p></div>
  <footer class="story-controls"><div><button id="story-sound" aria-pressed="true">♫ 配乐开</button><button id="story-auto" aria-pressed="true">自动播放</button></div><button id="story-advance" class="story-button">下一句 →</button></footer>
</dialog>`;

export function createStoryNotebook({getStats,getHomePage,onStart,onSeason,onMusicToggle,onMessage=()=>{}}) {
  const root=document.createElement('div');root.id='story-notebook-root';root.innerHTML=markup;document.body.append(root);
  const $=id=>root.querySelector('#'+id),book=$('pasture-notebook'),movie=$('pasture-story');
  let page=0,decorationPage=0,activeStory=null,line=0,auto=true,timer=null,bookFocus=null,movieFocus=null;
  const eligible=()=>new Set(collectedStories(getStats()).map(story=>story.id));
  const canRead=story=>eligible().has(story.id);
  function paintBook() {
    const story=STORIES[page],unlocked=canRead(story),progress=farmProgress(getStats());
    $('notebook-count').textContent=`${eligible().size} / 8`;
    $('notebook-seasons').innerHTML=['spring','summer','autumn','winter'].map((season,i)=>`<button data-story-page="${i*2}" aria-current="${season===story.season}">${farmTheme(i).name}</button>`).join('');
    $('notebook-page-label').textContent=`${story.seasonName} · ${story.phase} / ${String(page+1).padStart(2,'0')}`;
    $('notebook-image').hidden=!unlocked;$('notebook-locked').hidden=unlocked;
    if(unlocked){$('notebook-image').src=artwork(story);$('notebook-image').alt=story.composition;}else $('notebook-image').removeAttribute('src');
    $('notebook-unlock').textContent=`通过第 ${story.level} 关后收录`;
    $('notebook-title').textContent=unlocked?story.title:'还没写下的故事';
    $('notebook-phase').textContent=story.phase;
    $('notebook-caption').textContent=unlocked?story.caption:story.when;
    $('notebook-keepsake').textContent=unlocked?'夹在这一页：'+story.prop:'';
    $('notebook-lines').replaceChildren(...(unlocked?story.lines:[`通过第 ${story.level} 关，继续这一季的故事。`]).map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
    $('notebook-replay').disabled=!unlocked;
    $('notebook-prev').disabled=page===0;$('notebook-next').disabled=page===7;
    $('notebook-page-count').textContent=`${String(page+1).padStart(2,'0')} / 08`;
    $('notebook-catalog').innerHTML=STORIES.map((s,i)=>`<button data-story-page="${i}" aria-current="${i===page}" aria-label="${canRead(s)?'翻到'+s.title:s.seasonName+s.phase+'，第 '+s.level+' 关后解锁'}"><span>${String(i+1).padStart(2,'0')} · ${s.phase}</span><b>${canRead(s)?s.title:'待收录'}</b><small>${s.seasonName}</small></button>`).join('');
    const years=Math.floor(progress.cleared/96);
    $('notebook-stamps').textContent=years?`✿ 四季走过 ${years} 年 · 八页故事已收齐`:'第一册 · 每个季节两页，共八页';
    const theme=farmTheme(decorationPage),selected=farmPage(progress,decorationPage);
    $('decoration-heading').textContent=`第 ${Math.floor(decorationPage/4)+1} 年 · ${theme.name}`;
    $('decoration-prev').disabled=decorationPage===0;
    $('decoration-next').disabled=decorationPage===Math.floor(progress.latest/4)*4+3;
    $('decoration-note').textContent=selected.unlocked?`已布置 ${selected.filled} / 6 组 · 每过四关，添一份礼物`:`第 ${selected.unlockAt} 关后开启这一季`;
    $('decoration-list').innerHTML=theme.rewards.map((_,i)=>{
      const reward=farmReward(decorationPage*6+i+1),earned=reward.number<=progress.rewards;
      return `<li><span class="decoration-picture">${stickerArtwork(reward.icon,theme,true)}</span><span>${reward.name}<small>第 ${reward.level} 关 · ${earned?'已经布置':'待解锁'}</small></span><span class="decoration-check">${earned?'✓':'·'}</span></li>`;
    }).join('');
  }
  function setTab(tab) {
    $('notebook-stories').hidden=tab!=='stories';$('notebook-decorations').hidden=tab!=='decorations';
    root.querySelectorAll('[data-notebook-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.notebookTab===tab)));
    root.querySelector('.notebook-scroll').scrollTop=0;
  }
  function open(tab='stories') {
    if(movie.open)return;
    page=Math.min(3,getHomePage()%4)*2;decorationPage=getHomePage();bookFocus=document.activeElement;
    paintBook();setTab(tab);if(!book.open)book.showModal();
  }
  function selectPage(index){page=Math.max(0,Math.min(7,index));paintBook();root.querySelector('.notebook-scroll').scrollTop=0;}
  root.querySelector('[data-book-close]').onclick=()=>book.close();
  root.querySelectorAll('[data-notebook-tab]').forEach(button=>button.onclick=()=>setTab(button.dataset.notebookTab));
  for(const id of ['notebook-seasons','notebook-catalog'])$(id).onclick=event=>{const button=event.target.closest('[data-story-page]');if(button)selectPage(Number(button.dataset.storyPage));};
  $('notebook-prev').onclick=()=>selectPage(page-1);$('notebook-next').onclick=()=>selectPage(page+1);
  $('decoration-prev').onclick=()=>{decorationPage=Math.max(0,decorationPage-1);paintBook();};
  $('decoration-next').onclick=()=>{decorationPage=farmPage(farmProgress(getStats()),decorationPage+1).index;paintBook();};
  book.addEventListener('close',()=>bookFocus?.focus({preventScroll:true}));
  book.addEventListener('keydown',event=>{if(movie.open||$('notebook-stories').hidden)return;if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();selectPage(page+(event.key==='ArrowLeft'?-1:1));}});

  function clearTimer(){clearTimeout(timer);timer=null;}
  function schedule(){clearTimer();if(auto&&movie.open&&line<2&&!document.hidden&&$('story-image').complete&&$('story-image').naturalWidth)timer=setTimeout(()=>{line++;paintLine();},4200);}
  function paintLine(){
    $('story-line').textContent=activeStory.lines[line];
    $('story-dots').innerHTML=[0,1,2].map(i=>`<i class="${i<=line?'active':''}"></i>`).join('');
    $('story-dots').setAttribute('aria-label',`第 ${line+1} 句，共三句`);
    $('story-advance').textContent=line===2?'收进笔记':'下一句 →';schedule();
  }
  function play(story) {
    if(!story||!canRead(story)||movie.open)return false;
    activeStory=story;line=0;movieFocus=document.activeElement;
    $('story-heading').textContent=story.title;$('story-chapter').textContent=`${story.seasonName} · ${story.phase}`;
    $('story-number').textContent='牧场笔记 / '+String(STORIES.indexOf(story)+1).padStart(2,'0');
    $('story-image-status').textContent='';
    $('story-image').onload=()=>{$('story-image-status').textContent='';schedule();};
    $('story-image').onerror=()=>{$('story-image-status').textContent='插画暂未加载，可稍后在笔记里重看';clearTimer();};
    $('story-image').src=artwork(story);$('story-image').alt=story.composition;
    $('story-weather').dataset.effect=story.effect;$('story-weather').innerHTML=Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join('');
    movie.showModal();onStart(story);onSeason(story.season);paintLine();return true;
  }
  $('notebook-replay').onclick=()=>play(STORIES[page]);
  $('story-skip').onclick=()=>movie.close();
  $('story-advance').onclick=()=>{if(line<2){line++;paintLine();}else movie.close();};
  $('story-auto').onclick=()=>{auto=!auto;$('story-auto').textContent=auto?'自动播放':'手动翻句';$('story-auto').setAttribute('aria-pressed',String(auto));schedule();};
  $('story-sound').onclick=onMusicToggle;
  movie.addEventListener('close',()=>{clearTimer();activeStory=null;onSeason(null);if(book.open)paintBook();else onMessage('已收进牧场笔记，可以随时重看。');movieFocus?.focus({preventScroll:true});});
  movie.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();$('story-advance').click();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimer();else schedule();});
  window.addEventListener('pagehide',clearTimer);
  return {open,play,
    get isOpen(){return book.open||movie.open;},
    update(){if(book.open)paintBook();},
    setMusic(state){$('story-sound').textContent=state.enabled?'♫ 配乐开':'♪ 配乐关';$('story-sound').setAttribute('aria-pressed',String(state.enabled));},
  };
}
