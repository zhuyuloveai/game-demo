import {FARM_TRACKS} from './farm-audio-manifest.mjs';
import { getLevelConfig, getGameConfig, createGame, freeTiles, pick, undo, stash, shuffle, restore } from './engine.mjs';
import { restoreProgress, recordWin, levelWindow, resumeLevel } from './progression.mjs';
import { sheep, FACES, UI } from './icons.mjs';
import { createBackgroundMusic, SEASON_TRACKS } from './music.mjs';
import { createTileEffects } from './effects.mjs';
import { seasonForLevel } from './seasons.mjs';
import { createPickMotion } from './pick-motion.mjs';
import { stackHints, boardSize, appendStackHint } from './stack-hints.mjs';
import { createFarmHome } from './farm-home.mjs';
import { farmProgress, farmReward, farmPage, farmTheme } from './farm-progress.mjs';
import {createStoryNotebook} from './story-notebook.mjs';
import {restoreStoryProgress,acknowledgeStory,acknowledgeCompletion,arrivalStory,completionStory} from './story-progress.mjs';

const $ = id => document.getElementById(id);
const STORAGE = 'sheep-pasture-v1';
const CAMPAIGN_STORAGE = `${STORAGE}-campaign`;
const DAILY_LEVEL = 14;
let storageAvailable = true;
function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { storageAvailable = false; $('save-label').textContent = '此浏览器无法保存进度'; }
}
function generateGame(level, seed = `${Date.now()}-${Math.random()}`, mode = 'classic') {
  if (!window.Worker) return Promise.resolve(createGame(level, seed, mode));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./generator.worker.mjs', import.meta.url), { type: 'module' });
    worker.onmessage = ({data}) => { worker.terminate(); data.game ? resolve(data.game) : reject(new Error(data.error)); };
    worker.onerror = () => { worker.terminate(); reject(new Error('地图生成失败')); };
    worker.postMessage({level, seed, mode});
  });
}
const activeSave = restore(read(STORAGE));
const existingPlayer=Boolean(activeSave||read(CAMPAIGN_STORAGE)||read(`${STORAGE}-stats`));
let campaign = activeSave?.mode === 'classic' ? activeSave : restore(read(CAMPAIGN_STORAGE));
let stats = restoreProgress(read(`${STORAGE}-stats`), campaign);
let game = activeSave || campaign || await generateGame(stats.unlocked).catch(() => createGame(stats.unlocked));
let generating = false;
let view = 'home', farmHome, notebook, storyState, storySeason=null, homeStoryTimer=null;
let homeScene=farmPage(farmProgress(stats),read(`${STORAGE}-home-scene`)).index;
const savedFarmSeen=read(`${STORAGE}-farm-seen`);
let farmSeen=Number.isSafeInteger(savedFarmSeen)&&savedFarmSeen>=0?savedFarmSeen:farmProgress(stats).rewards;
write(`${STORAGE}-farm-seen`,farmSeen);
let soundOn = read(`${STORAGE}-sound`) !== false;
let toastTimer, lastTick = performance.now();
const modal = $('modal');
const drawer = $('drawer');
const effects = createTileEffects({enabled:soundOn, hidden:document.hidden});
const savedMusicVolume = read(`${STORAGE}-music-volume`);
const music = createBackgroundMusic($('background-music'), {
  enabled: read(`${STORAGE}-music`) !== false,
  volume: typeof savedMusicVolume === 'number' ? savedMusicVolume : .35,
  hidden: document.hidden,
  track: SEASON_TRACKS[farmTheme(homeScene).key],
  onChange: renderMusic,
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pickMotion = createPickMotion({
  rack:game.rack,
  paint:renderRack,
  fly:flyToRack,
  onMatch:() => effects.play('match'),
  settled:({tile, matched, cue}) => {
    if (cue && cue !== 'match') effects.play(cue);
    if (matched) $('match-announcement').textContent = `三张${FACES[tile.type].name}已消除。`;
  },
  idle:() => { if (game.status !== 'playing') resultDialog(); },
});
function flyToRack({tile, from, index, duration}) {
  const target = $('rack').children[index].getBoundingClientRect();
  const flyer = document.createElement('div');
  flyer.className = 'flying-tile';
  flyer.dataset.id = tile.id;
  flyer.setAttribute('aria-hidden', 'true');
  flyer.innerHTML = FACES[tile.type].icon;
  flyer.style.width = `${from.width}px`; flyer.style.height = `${from.height}px`;
  document.body.append(flyer);
  const dx = target.left - from.left, dy = target.top - from.top;
  const sx = target.width / from.width, sy = target.height / from.height;
  const animation = flyer.animate([
    {transform:`translate(${from.left}px, ${from.top}px) scale(1, 1)`},
    {offset:.5, transform:`translate(${from.left + dx * .5}px, ${from.top + dy * .5 - 18}px) scale(${(1 + sx) / 2}, ${(1 + sy) / 2})`},
    {transform:`translate(${target.left}px, ${target.top}px) scale(${sx}, ${sy})`},
  ], {duration, easing:'cubic-bezier(.3, 0, .25, 1)', fill:'forwards'});
  return () => { animation.cancel(); flyer.remove(); };
}
function finishPickMotion() {
  if (!pickMotion.pending) return;
  pickMotion.reset(game.rack); render();
  if (game.status !== 'playing' && !modal.open) resultDialog();
}

function renderMusic(state) {
  farmHome?.setMusic(state);
  notebook?.setMusic(state);
  const active = state.playing || state.status === 'loading';
  $('music-player').classList.toggle('is-playing', state.playing);
  $('music-toggle').setAttribute('aria-pressed', String(active));
  const title = state.track?.title || '四季牧场配乐';
  $('music-title').textContent = title;
  $('music-description').textContent = state.track?.description || '原创游戏配乐 · 随四季变换';
  $('music-toggle').setAttribute('aria-label', `${active ? '暂停' : '播放'}${title}`);
  $('music-symbol').textContent = active ? 'Ⅱ' : '▶';
  $('music-status').textContent = {
    ready:'选牌即播放 · 随季节换曲', loading:'音乐加载中…', playing:'原创配乐 · 循环播放',
    paused:'音乐已暂停', background:'后台暂停', blocked:'点击播放，继续音乐', error:'音乐加载失败，点击重试',
  }[state.status];
  $('music-open').setAttribute('aria-label', `打开音乐设置，${state.playing ? '正在播放' : '音乐未播放'}`);
  const percent = Math.round(state.volume * 100);
  $('music-volume').value = percent;
  $('music-volume-value').textContent = `${percent}%`;
}

$('brand-sheep').innerHTML = sheep;
for (const key of ['undo', 'shuffle', 'stash']) $(key).querySelector('.tool-icon').innerHTML = UI[key];

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function save() {
  write(STORAGE, game);
  if (game.mode === 'classic') { campaign = game; write(CAMPAIGN_STORAGE, game); }
  if (storageAvailable) $('save-label').textContent = '进度自动保存';
}
function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600);
}
function renderSound() {
  $('sound').innerHTML = soundOn ? UI.sound : UI.muted;
  $('sound').setAttribute('aria-label', soundOn ? '关闭音效' : '开启音效');
  $('sound').setAttribute('aria-pressed', String(soundOn));
  $('sound').title = soundOn ? '操作与消除音效已开启' : '操作与消除音效已关闭';
}
function card(tile, className = '') {
  const button = document.createElement('button');
  button.className = className;
  button.dataset.id = tile.id;
  button.innerHTML = FACES[tile.type].icon;
  button.setAttribute('aria-label', `${FACES[tile.type].name}，${className.includes('tile') ? '选择卡牌' : '放回暂存槽'}`);
  return button;
}
function fitBoard() {
  const field = document.querySelector('.play-field');
  const {width, height} = boardSize(field.clientWidth, field.clientHeight);
  $('board').style.width = `${width}px`;
  $('board').style.height = `${height}px`;
}
function renderSeason() {
  const season = seasonForLevel(game.level);
  const activeSeason=view==='home'?farmTheme(homeScene):season;
  document.body.dataset.season = activeSeason.key;
  music.setTrack(view==='farm'?FARM_TRACKS[operatingFarmScene]:SEASON_TRACKS[storySeason||activeSeason.key]);
  $('season-name').textContent = season.name;
  document.querySelector('meta[name="theme-color"]').content = activeSeason.color;
  const path = `./assets/seasons/${season.key}.svg`;
  document.querySelectorAll('.farm-scenery image').forEach(image => {
    if (image.getAttribute('href') !== path) image.setAttribute('href', path);
  });
}
function closeDrawer() { drawer.close(); lastTick = performance.now(); }
function openDrawer(panel) {
  const titles = {journey:'小羊的闯关路', music:'小羊收音机', menu:'歇一小会儿'};
  $('drawer-title').textContent = titles[panel];
  for (const name of Object.keys(titles)) $(`${name}-panel`).hidden = name !== panel;
  if (!drawer.open) drawer.showModal();
  lastTick = performance.now();
}
function render() {
  renderSeason();
  if(view==='home')farmHome?.update(stats,game,farmSeen);
  notebook?.update();
  document.querySelector('.game-card').classList.toggle('has-reserve', game.reserve.length > 0);
  $('board').dataset.gameLevel = game.level;
  document.querySelector('.game-card').setAttribute('aria-busy', String(generating));
  $('generation-note').hidden = !generating;
  $('home-open').disabled = generating;
  const free = new Set(freeTiles(game.board).map(t => t.id));
  const hints = stackHints(game.board, free);
  const fragment = document.createDocumentFragment();
  for (const tile of game.board) {
    const button = card(tile, 'tile');
    button.style.left = `${tile.x / 7 * 100}%`;
    button.style.top = `${tile.y / 6.5 * 100}%`;
    button.style.zIndex = tile.z + 1;
    button.dataset.type = tile.type;
    const blocked = !free.has(tile.id);
    button.classList.toggle('covered', blocked);
    button.disabled = blocked || game.status !== 'playing' || generating;
    const hint = hints.get(tile.id);
    appendStackHint(button, hint);
    button.setAttribute('aria-label', `${FACES[tile.type].name}，第 ${tile.z + 1} 层${blocked ? '，被遮挡' : ''}${hint ? `，下方近位叠牌 ${hint.count} 张` : ''}`);
    fragment.append(button);
  }
  $('board').replaceChildren(fragment);
  renderRack(pickMotion.rack, pickMotion.clearing);
  $('reserve-area').hidden = game.reserve.length === 0;
  $('reserve').replaceChildren(...game.reserve.map(tile => {
    const button = card(tile, 'rack-tile'); button.setAttribute('aria-label', `从草篮取回${FACES[tile.type].name}`);
    button.disabled = game.status !== 'playing' || generating; return button;
  }));
  $('remaining').textContent = game.total - game.matched;
  $('timer').textContent = formatTime(game.elapsed);
  const config = getGameConfig(game);
  $('level-name').textContent = game.mode === 'daily' ? '今日牧场' : `第 ${game.level + 1} 关`;
  $('level-open').setAttribute('aria-label', `${$('level-name').textContent}，${seasonForLevel(game.level).name}，查看闯关路线`);
  $('restart').textContent = '↻';
  $('restart').setAttribute('aria-label', game.mode === 'daily' ? '重新挑战今日地图' : '随机生成新地图');
  $('restart').disabled = generating;
  $('level-label').textContent = game.mode === 'daily' ? `DAILY FARM · ${String(game.seed).replace('daily-', '')}` : `${config.count} 张牌 · ${config.layers.length} 层 · ${config.kinds} 种图案`;
  $('game-hint').textContent = game.status === 'won' ? '牧场清空，今日份快乐达成！' : game.status === 'lost' ? '暂存槽满了，试试撤回或移出' : game.rack.length >= 5 ? '位置不多了，优先凑齐一组' : !game.started ? '先选最上面的牌试试看' : '慢慢来，好事总会凑成三个';
  $('field-caption').textContent = game.board.length === 0 && game.reserve.length ? '草篮里还有牌，记得取回来哦' : game.status === 'won' ? '每一片草地，都值得再来一次' : '只有没被压住的牌，才可以选哦';
  renderJourney();
  $('daily').classList.toggle('active', game.mode === 'daily');
  $('daily').setAttribute('aria-pressed', String(game.mode === 'daily'));
  $('daily').disabled = generating;
  $('undo').disabled = generating || !game.tools.undo || !game.history.length || game.status === 'won';
  $('shuffle').disabled = generating || !game.tools.shuffle || game.board.length < 2 || game.status !== 'playing';
  $('stash').disabled = generating || !game.tools.stash || !game.rack.length || !!game.reserve.length || game.status === 'won';
  for (const key of ['undo', 'shuffle', 'stash']) {
    $(key).querySelector('.tool-count').textContent = game.tools[key];
    $(key).setAttribute('aria-label', `${{undo:'撤回上一步',shuffle:'洗牌',stash:'移出最前面的三张牌'}[key]}，剩余 ${game.tools[key]} 次`);
  }
  $('win-count').textContent = stats.wins;
  fitBoard();
}
function renderRack(rack, clearing = null) {
  $('rack').replaceChildren();
  for (let i = 0; i < 7; i++) {
    const slot = document.createElement('div'); slot.className = 'slot';
    const tile = rack[i];
    if (tile) {
      const item = document.createElement('div'); item.className = 'rack-tile';
      item.innerHTML = FACES[tile.type].icon; item.dataset.id = tile.id;
      item.setAttribute('role', 'img'); item.setAttribute('aria-label', FACES[tile.type].name);
      item.classList.toggle('same', rack.filter(t => t.type === tile.type).length === 2);
      if (clearing?.ids.includes(tile.id)) {
        item.classList.add('clearing');
        item.style.setProperty('--clear-duration', `${clearing.duration}ms`);
        // A new pick may repaint the rack: resume this effect at its current time.
        item.style.setProperty('--clear-delay', `${-Math.max(0, performance.now() - clearing.startedAt)}ms`);
      }
      slot.append(item);
    } else slot.classList.add('empty');
    $('rack').append(slot);
  }
  $('rack').classList.toggle('warning', rack.length >= 5);
  $('rack-count').innerHTML = `${rack.length} <em>/ 7</em>`;
}

function renderJourney() {
  const anchor = game.mode === 'classic' ? game.level : resumeLevel(stats, campaign);
  const buttons = levelWindow(anchor).map(level => {
    const active = game.mode === 'classic' && level === game.level, locked = level > stats.unlocked;
    const config = active ? getGameConfig(game) : getLevelConfig(level), button = document.createElement('button');
    button.className = `level${active ? ' active' : ''}`;
    button.dataset.level = level; button.disabled = locked || generating;
    button.setAttribute('aria-pressed', String(active));
    button.title = `第 ${level + 1} 关 · ${config.count} 张 · ${config.layers.length} 层 · ${config.kinds} 种图案${locked ? '，通关前一关后解锁' : ''}`;
    button.innerHTML = `<span class="level-number">${String(level + 1).padStart(2,'0')}</span><span><strong>第 ${level + 1} 关</strong><small>${seasonForLevel(level).name} · ${config.count} 张</small></span><span class="level-status">${locked ? '待解锁' : active ? '当前关卡' : level <= stats.highestCleared ? '已通过 ✓' : '去挑战 →'}</span>`;
    return button;
  });
  $('levels').replaceChildren(...buttons);
  $('journey-record').textContent = stats.highestCleared >= 0 ? `最远通过第 ${stats.highestCleared + 1} 关` : '从第一片草地出发';
  const target = resumeLevel(stats, campaign);
  $('continue-campaign').textContent = `继续闯关 · 第 ${target + 1} 关 →`;
  $('continue-campaign').disabled = generating || (game.mode === 'classic' && game.level === target && game.status === 'playing');
}
function closeDialog() { modal.close(); lastTick = performance.now(); }
function showDialog({ title, eyebrow = '', content, actions }) {
  closeDrawer();
  $('modal-art').innerHTML = sheep; $('modal-title').textContent = title;
  $('modal-eyebrow').textContent = eyebrow; $('modal-content').innerHTML = content;
  $('modal-actions').replaceChildren();
  for (const [label, callback, primary] of actions) {
    const button = document.createElement('button');
    button.className = `action-button${primary ? ' primary' : ''}`; button.textContent = label;
    button.addEventListener('click', () => { closeDialog(); callback(); });
    $('modal-actions').append(button);
  }
  if (!modal.open) modal.showModal();
  $('modal-actions').querySelector('button')?.focus();
}
async function start(level, seed, mode = 'classic') {
  if (generating || (mode === 'classic' && level > stats.unlocked)) return;
  pickMotion.reset(game.rack); save(); closeDrawer(); closeDialog(); generating = true; render();
  try { game = await generateGame(level, seed, mode); }
  catch { generating = false; render(); toast('这片草地还没准备好，请再试一次。'); return; }
  finally { generating = false; }
  lastTick = performance.now();
  pickMotion.reset(game.rack);
  $('match-announcement').textContent = '';
  closeDialog(); render(); save(); toast(game.mode === 'daily' ? '今日牧场已就绪。每天一局相同的挑战！' : getLevelConfig(game.level).subtitle);
}
function confirmSwitch(level, seed, mode = 'classic', restarting = false) {
  if (game.started && game.status === 'playing') {
    showDialog({ title: restarting ? (mode === 'daily' ? '重新挑战今日地图？' : '换一片新草地？') : '出发去另一片牧场？', eyebrow: 'TAKE YOUR TIME',
      content: `<p>${mode === 'daily' ? (restarting ? '今日地图保持相同，挑战进度和道具会重置。' : '主线牌局会保存，进入今天的固定地图挑战。') : '本关会随机生成一张新地图，本局进度和道具会重置。'}</p>`,
      actions: [[restarting ? (mode === 'daily' ? '重新挑战' : '换张新地图') : '出发吧', () => start(level, seed, mode), true], ['继续这一局', () => {}]] });
  } else start(level, seed, mode);
}
function resultDialog() {
  if(view!=='game')return;
  if (game.status === 'won') {
    if (recordWin(stats, game)) {
      write(`${STORAGE}-stats`, stats); save(); render();
    }
    const next = game.mode === 'classic';
    const progress=farmProgress(stats);
    const reward=next&&progress.rewards>farmSeen&&game.level+1===progress.rewards*4?farmReward(progress.rewards):null;
    showDialog({ title: next ? `第 ${game.level + 1} 关，过关啦！` : '今日牧场，挑战成功！', eyebrow: 'A LOVELY LITTLE VICTORY',
      content: `<p>所有小伙伴都找到了自己的队伍。<br>这一刻的好心情，送给你。</p>${reward?`<div class="farm-prize"><span>✿</span><div><b>${reward.name}</b><small>新的四季礼物，已经为你准备好了</small></div></div>`:''}<div class="result-stats"><div><strong>${game.total}</strong><span>张牌全部消除</span></div><div><strong>${formatTime(game.elapsed)}</strong><span>本局用时</span></div></div>`,
      actions: reward?[[reward.claim, returnHome, true],[`继续闯关 · 第 ${game.level+2} 关 →`,()=>start(game.level+1)]]:[[next ? `继续闯关 · 第 ${game.level + 2} 关 →` : '回到无限闯关 →', () => next ? start(game.level + 1) : resumeCampaign(), true], ['回牧场看看', returnHome]] });
  } else if (game.status === 'lost') {
    const actions = [];
    if (game.tools.undo && game.history.length) actions.push(['撤回一步，继续挑战', () => useTool('undo'), true]);
    if (game.tools.stash && !game.reserve.length) actions.push(['移出三张，腾出空间', () => useTool('stash'), actions.length === 0]);
    actions.push([game.mode === 'daily' ? '再试一次' : '换张地图，再试一次', () => start(game.level, game.mode === 'daily' ? game.seed : undefined, game.mode), actions.length === 0]);
    showDialog({ title: '哎呀，草篮装满了', eyebrow: 'IT’S OKAY, LITTLE SHEEP', content: '<p>就差一点点。先观察下层的牌，<br>给成对的小伙伴留个位置。</p>', actions });
  }
}
function select(id, reserve, keyboard = false) {
  if (generating||view!=='game') return;
  const source = $(reserve ? 'reserve' : 'board').querySelector(`[data-id="${id}"]`);
  const from = source?.getBoundingClientRect();
  const before = [...game.rack];
  const result = pick(game, id, reserve);
  if (!result.ok) return;
  const cue = game.status === 'won' ? 'win' : game.status === 'lost' ? 'lost' : result.matched ? 'match' : null;
  const animate = from?.width && from?.height && !reducedMotion.matches && !document.hidden && typeof Element.prototype.animate === 'function';
  effects.play(reserve ? 'return' : 'tap');
  if (!animate) pickMotion.reset(game.rack);
  render(); save();
  if (animate) {
    pickMotion.enqueue({before, after:[...game.rack], tile:result.tile, matched:result.matched, from, cue});
  } else {
    if (cue) effects.play(cue);
    if (result.matched) $('match-announcement').textContent = `三张${FACES[result.tile.type].name}已消除。`;
    if (game.status !== 'playing') resultDialog();
  }
  if (keyboard && game.status === 'playing') $('board').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}

function useTool(key) {
  if (generating) return;
  const ok = { undo, shuffle, stash }[key](game);
  if (!ok) return;
  pickMotion.reset(game.rack); render(); save(); effects.play(key);
  toast({ undo:'已经退回上一步，再想一想。', shuffle:'牌面重新排列了，看看有没有新机会。', stash:'已移入临时草篮，点击卡牌可以取回。' }[key]);
}
$('board').addEventListener('click', event => {
  const button = event.target.closest('button[data-id]');
  if (button && !button.disabled) select(Number(button.dataset.id), false, event.detail === 0);
});
$('reserve').addEventListener('click', event => {
  const button = event.target.closest('button[data-id]');
  if (button && !button.disabled) select(Number(button.dataset.id), true, event.detail === 0);
});
for (const key of ['undo','shuffle','stash']) $(key).addEventListener('click', () => useTool(key));
$('levels').addEventListener('click', event => {
  const button = event.target.closest('button[data-level]');
  if (!button || button.disabled || generating) return;
  if (game.mode === 'classic' && game.level === Number(button.dataset.level) && game.status === 'playing') { closeDrawer(); return; }
  confirmSwitch(Number(button.dataset.level));
});
function resumeCampaign() {
  if (generating) return;
  const saved = restore(read(CAMPAIGN_STORAGE)) || campaign;
  const level = resumeLevel(stats, saved);
  const resume = () => {
    closeDrawer();
    if (saved && saved.level === level && saved.status !== 'won') {
      game = saved; pickMotion.reset(game.rack); lastTick = performance.now(); render(); save();
      if (game.status === 'lost') resultDialog();
    } else start(level);
  };
  if (game.started && game.status === 'playing') {
    showDialog({title: `回到第 ${level + 1} 关？`, eyebrow:'YOUR JOURNEY CONTINUES',
      content:'<p>当前牌局会结束，继续你的牧场闯关之旅。</p>',
      actions:[['继续闯关',resume,true],['留在这一局',()=>{}]]});
  } else resume();
}
$('continue-campaign').addEventListener('click', resumeCampaign);
$('daily').addEventListener('click', () => {
  const today = new Intl.DateTimeFormat('en-CA', { year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Asia/Shanghai' }).format(new Date());
  const seed = `daily-${today}`;
  if (game.mode === 'daily' && game.seed === seed && game.status === 'playing') { closeDrawer(); return; }
  confirmSwitch(DAILY_LEVEL, seed, 'daily');
});
$('restart').addEventListener('click', () => confirmSwitch(game.level, game.mode === 'daily' ? game.seed : undefined, game.mode, true));
$('sound').addEventListener('click', () => {
  soundOn = !soundOn; effects.setEnabled(soundOn);
  write(`${STORAGE}-sound`, soundOn); renderSound();
  if (soundOn) effects.play('tap');
});
$('music-toggle').addEventListener('click', () => {
  music.toggle(); write(`${STORAGE}-music`, music.state.enabled);
});
$('music-volume').addEventListener('input', event => {
  music.setVolume(Number(event.target.value) / 100);
  write(`${STORAGE}-music-volume`, music.state.volume);
});
document.addEventListener('click', event => {
  if (!event.target.closest('#music-player')) music.unlock();
  const button = event.target.closest('button');
  if (button && !button.disabled && !button.closest('#board, #reserve, .tools, #music-player, .farm-app, .farm-match') && button.id !== 'sound') effects.play('button');
}, {capture:true});
document.addEventListener('keydown', event => {
  if (['Enter', ' '].includes(event.key) && !event.target.closest('#music-player')) music.unlock();
});
$('music-open').addEventListener('click', () => openDrawer('music'));
$('home-open').addEventListener('click', returnHome);
$('menu-open').addEventListener('click', () => openDrawer('menu'));
$('level-open').addEventListener('click', () => openDrawer('journey'));
$('drawer-close').addEventListener('click', closeDrawer);
drawer.addEventListener('cancel', () => { lastTick = performance.now(); });
drawer.addEventListener('close', () => { lastTick = performance.now(); });
$('modal-close').addEventListener('click', closeDialog);
modal.addEventListener('cancel', () => { lastTick = performance.now(); });
$('help').addEventListener('click', () => showDialog({ title:'三个一组，快乐发生', eyebrow:'HOW TO PLAY',
  content:`<div class="mini-triple">${[1,2,3].map(() => `<span>${FACES[0].icon}</span>`).join('')}</div><div class="rules"><div><b>1</b><span>点击<strong>没有被遮挡</strong>的卡牌，放入下方暂存槽。深色的牌需要先移开上层。</span></div><div><b>2</b><span>集齐<strong>三张相同图案</strong>就会自动消除。清空牌区、草篮和暂存槽即可通关。</span></div><div><b>3</b><span>暂存槽只有<strong>七个位置</strong>。第七张能凑成三张时仍会消除，否则本局结束。</span></div><div><b>✦</b><span>撤回可还原一次选牌（包括消除）；洗牌打乱剩余牌面；移出把最前面最多三张放入草篮，可随时点回。每局道具免费重置。</span></div></div>`,
  actions:[['知道啦，去消消羊', () => {}, true]] }));

setInterval(() => {
  const now = performance.now(), delta = now - lastTick; lastTick = now;
  if (view==='game' && game.started && game.status === 'playing' && !generating && !document.hidden && !modal.open && !drawer.open) {
    game.elapsed += Math.min(delta, 1500); $('timer').textContent = formatTime(game.elapsed);
  }
}, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) finishPickMotion(); else if(view==='home')scheduleHomeStory(true); music.setHidden(document.hidden); effects.setHidden(document.hidden); save(); lastTick = performance.now(); });
window.addEventListener('pagehide', () => { finishPickMotion(); music.setHidden(true); effects.setHidden(true); save(); });
window.addEventListener('pageshow', () => { music.setHidden(document.hidden); effects.setHidden(document.hidden); });
window.addEventListener('resize', finishPickMotion);
reducedMotion.addEventListener('change', finishPickMotion);
if (window.ResizeObserver) new ResizeObserver(fitBoard).observe(document.querySelector('.play-field'));
else window.addEventListener('resize', fitBoard);
function returnHome(){
  if(generating)return;
  // A final pick may still be flying when the player returns home.
  if(game.status==='won'&&recordWin(stats,game))write(`${STORAGE}-stats`,stats);
  view='home';pickMotion.reset(game.rack);save();closeDrawer();closeDialog();
  document.body.dataset.view='home';document.querySelector('.game-card').hidden=true;$('farm-home').hidden=false;
  lastTick=performance.now();render();farmHome.focus();
  if(!farmHome.openReward())scheduleHomeStory(true);
}
let operatingFarm=null,openingOperatingFarm=false,operatingFarmScene='farm';
async function enterOperatingFarm(){
  if(openingOperatingFarm)return;
  openingOperatingFarm=true;
  clearTimeout(homeStoryTimer);farmHome.closePanels();closeDrawer();closeDialog();
  try{
    if(!operatingFarm){
      const {createFarmRuntime}=await import('./farm-runtime.mjs');
      operatingFarm=await createFarmRuntime({onExit:returnHome,onScene:scene=>{operatingFarmScene=scene;music.setTrack(FARM_TRACKS[scene]);},getAudioSettings:()=>({music:music.state.enabled,sound:soundOn}),getMusicVolume:()=>music.state.volume,onMusicVolumeChange:value=>{music.setVolume(value);write(`${STORAGE}-music-volume`,music.state.volume);},initialAudio:{music:music.state.enabled,sound:soundOn},onSoundChange:enabled=>{soundOn=enabled;effects.setEnabled(enabled);write(`${STORAGE}-sound`,enabled);renderSound();},onMusicChange:enabled=>{music.setEnabled(enabled);write(`${STORAGE}-music`,enabled);}});
    }
    finishPickMotion();save();view='farm';$('farm-home').hidden=true;document.querySelector('.game-card').hidden=true;
    operatingFarm.open();
  }catch(error){view='home';$('farm-home').hidden=false;document.body.dataset.view='home';renderSeason();toast(`农场暂时未打开：${error.message}`);console.error(error);}
  finally{openingOperatingFarm=false;}
}
function enterGame(){
  clearTimeout(homeStoryTimer);
  farmHome.closePanels();view='game';document.body.dataset.view='game';$('farm-home').hidden=true;
  document.querySelector('.game-card').hidden=false;lastTick=performance.now();render();$('home-open').focus({preventScroll:true});
  if(game.status==='won')resumeCampaign();else if(game.status==='lost')resultDialog();
}
function scheduleHomeStory(includeCompletion=false,delay=550){
  clearTimeout(homeStoryTimer);
  homeStoryTimer=setTimeout(()=>{
    if(view!=='home'||!notebook||document.hidden||document.querySelector('dialog[open]'))return;
    const story=(includeCompletion&&completionStory(storyState,stats,farmSeen))||arrivalStory(storyState,stats,homeScene);
    if(story)notebook.play(story);
  },delay);
}
farmHome=createFarmHome($('farm-home'),{
  initialPage:homeScene,onContinue:enterGame,onFarm:enterOperatingFarm,onMusic:()=>openDrawer('music'),onGesture:()=>music.unlock(),
  onSeen:value=>{farmSeen=value;write(`${STORAGE}-farm-seen`,value);},
  onReward:()=>scheduleHomeStory(true,1300),
  onJournal:tab=>{clearTimeout(homeStoryTimer);notebook.open(tab);},
  onScene:(index,theme)=>{
    homeScene=index;write(`${STORAGE}-home-scene`,index);
    if(view==='home'){
      music.setTrack(SEASON_TRACKS[storySeason||theme.key]);document.body.dataset.season=theme.key;
      document.querySelector('meta[name="theme-color"]').content=theme.color;
      scheduleHomeStory();
    }
  },
});
if(game.status==='won')recordWin(stats,game);
storyState=restoreStoryProgress(read(`${STORAGE}-stories`),stats,{legacy:existingPlayer});
write(`${STORAGE}-stories`,storyState);
notebook=createStoryNotebook({
  getStats:()=>stats,getHomePage:()=>homeScene,
  onStart:story=>{
    storyState=story.kind==='complete'?acknowledgeCompletion(storyState,story.id,stats):acknowledgeStory(storyState,story.id,stats);
    write(`${STORAGE}-stories`,storyState);
  },
  onSeason:season=>{storySeason=season;music.setTrack(SEASON_TRACKS[season||farmTheme(homeScene).key]);},
  onMusicToggle:()=>{music.setEnabled(!music.state.enabled);write(`${STORAGE}-music`,music.state.enabled);},
  onMessage:toast,
});
write(`${STORAGE}-stats`,stats);
renderSound(); render(); save();
farmHome.setMusic(music.state);notebook.setMusic(music.state);
if(!farmHome.openReward())scheduleHomeStory(true);
