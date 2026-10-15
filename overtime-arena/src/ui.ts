import { AVATAR_SIZE, AVATAR_STORAGE_KEY, DEFAULT_AVATAR_CROP, DEFAULT_AVATAR_URL, drawAvatarCrop, isAvatarDataUrl, loadAvatarFile, loadSavedAvatar, type AvatarCropControls } from './avatar';
import { command, DEFAULT_SETTINGS, WEAPONS, type Settings, type Stats, type WeaponId, type LabMode, type EquippedWeapon } from './shared';
import { DEFAULT_LOADOUT, normalizeLoadout, WEAPON_LEVELS, WEAPON_XP_THRESHOLDS } from './game/WeaponModel';
import { weaponRecycleValue, type RunSnapshot } from './game/RunModel';
import { attackMultiplier, attackRateMultiplier, CRIT_MULTIPLIER, migratePlayerAttributes, weaponOutput } from './game/PlayerModel';

const ICONS = {
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  restart: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  expand: '<path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4"/>',
  target: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  controls: '<path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  stapler: '<path d="m4 9 15-3 2 7-15 3-2-7ZM6 16v3h15M7 9l10-2"/>',
  scatter: '<path d="m3 17 11-9 4 4-11 9ZM12 10l3 3M18 4l2-2M21 8h2M15 3V1"/>',
  keyboard: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M5 10h1m3 0h1m3 0h1m3 0h2M5 14h1m3 0h1m3 0h1m3 0h2M8 17h8"/>',
  laser: '<path d="m3 18 10-10 3 3L6 21Zm9-9 3 3M16 8l5-5M18 3l3 3M20 10h3M14 1v3"/>',
  coffee: '<path d="M4 8h13v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM17 10h2a3 3 0 0 1 0 6h-2M7 5V2M11 5V1M15 5V3"/>',
  folder: '<path d="M3 6h6l2 3h10v11H3ZM3 6V4h7l2 3h9v2M7 13h10M7 16h7"/>',
  stamp: '<path d="M9 13V9a4 4 0 1 1 6 0v4l4 3v4H5v-4ZM8 13h8M5 17h14M3 23h18"/>',
  cable: '<path d="M5 3v4m4-4v4M3 7h8v3a4 4 0 0 1-8 0ZM7 14v3a4 4 0 0 0 8 0V9a3 3 0 0 1 6 0v5M19 14h4v6h-4Z"/>',
};
const icon = (name: keyof typeof ICONS, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const attributeRanges = [
  { id: 'attackPower', label: '攻击力', labelEn: 'ATK', min: 0, max: 300, step: 5, format: (v: number) => `${Number(v.toFixed(2))}` },
  { id: 'attackSpeed', label: '攻速加成', labelEn: 'SPD', min: -50, max: 100, step: 5, format: (v: number) => `${v >= 0 ? '+' : ''}${Number(v.toFixed(2))}%` },
  { id: 'critChance', label: '暴击率', labelEn: 'CRIT', min: 0, max: 100, step: 5, format: (v: number) => `${Number(v.toFixed(2))}%` },
] as const;
const ranges = [
  { id: 'pointerSensitivity', label: '鼠标 / 触控灵敏度', labelEn: 'SENS', min: 0.5, max: 2, step: 0.1, format: (v: number) => `${v.toFixed(1)}×` },
  { id: 'speed', label: '角色最大移速', labelEn: 'MOVE', min: 180, max: 420, step: 10, format: (v: number) => `${v}` },
  { id: 'knockback', label: '击退力度', labelEn: 'IMPACT', min: 0, max: 2, step: 0.05, format: (v: number) => `${v.toFixed(2)}×` },
  { id: 'shake', label: '屏幕震动', labelEn: 'SHAKE', min: 0, max: 1, step: 0.05, format: (v: number) => `${Math.round(v * 100)}%` },
  { id: 'volume', label: '音效音量', labelEn: 'AUDIO', min: 0, max: 1, step: 0.05, format: (v: number) => `${Math.round(v * 100)}%` },
] as const;
const settingRanges = [...attributeRanges, ...ranges];
const avatarRanges = [
  { id: 'zoom', label: '缩放', min: 1, max: 4, step: 0.05, format: (v: number) => `${v.toFixed(2)}×` },
  { id: 'horizontal', label: '左右取景', min: -1, max: 1, step: 0.01, format: (v: number) => `${Math.round(v * 100)}%` },
  { id: 'vertical', label: '上下取景', min: -1, max: 1, step: 0.01, format: (v: number) => `${Math.round(v * 100)}%` },
] as const;
const avatarExpressions = [
  { id: 'neutral', label: '平静', symbol: '' }, { id: 'angry', label: '暴躁', symbol: '＃' },
  { id: 'furious', label: '愤怒', symbol: '💢' }, { id: 'panic', label: '惊恐', symbol: '!!' }, { id: 'smug', label: '得意', symbol: '✦' },
] as const;
const STORAGE_KEY = 'overtime-arena.settings.v1';
const LOADOUT_STORAGE_KEY = 'overtime-arena.loadout.v1';
const HAND_LABELS = ['左上手', '右上手', '左中手', '右中手', '左下手', '右下手'];
const escapeHTML = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const START_GUIDE = '<span class="desktop-input-copy">只管移动，武器自动索敌攻击。<br>开始后隐藏鼠标，Esc 暂停释放。</span><span class="touch-input-copy">一根手指滑动走位，停手即停。<br>武器自动索敌攻击。</span>';
const DEFAULT_PAUSE_GUIDE = '鼠标 / 触摸板：继续后锁定并隐藏光标，Esc 暂停释放。\n触屏：继续后按住滑动。调参数请先暂停。';

function savedSettings(): Settings {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const saved = { ...(raw && typeof raw === 'object' ? raw : {}), ...migratePlayerAttributes(raw) } as Partial<Settings>;
    for (const r of settingRanges) {
      const value = saved[r.id];
      if (typeof value === 'number' && Number.isFinite(value)) settings[r.id] = Math.min(r.max, Math.max(r.min, value));
    }
    if (typeof saved.practice === 'boolean') settings.practice = saved.practice;
    if (saved.mode && ['steady', 'swarm', 'dummy'].includes(saved.mode)) settings.mode = saved.mode;
  } catch { /* Storage may be unavailable in private browsing. */ }
  return settings;
}

function savedLoadout(): EquippedWeapon[] {
  try { return normalizeLoadout(JSON.parse(localStorage.getItem(LOADOUT_STORAGE_KEY) || 'null')); }
  catch { return normalizeLoadout(DEFAULT_LOADOUT); }
}

function weaponCard(equipped: EquippedWeapon, slot: number): string {
  const definition = WEAPONS[equipped.weapon];
  const level = WEAPON_LEVELS[equipped.level - 1];
  return `<div class="weapon-card" id="weapon-card-${slot}" role="listitem" style="--weapon-level:${level.css}">
    <span class="weapon-icon" id="weapon-icon-${slot}" data-weapon="${equipped.weapon}">${icon(equipped.weapon)}</span>
    <span class="weapon-copy"><span class="weapon-slot">${HAND_LABELS[slot]}</span><strong id="weapon-name-${slot}">${definition.name}</strong></span>
    <span class="weapon-level" id="weapon-level-${slot}">Lv.${equipped.level}<small>${level.name}</small></span>
    <small class="weapon-description" id="weapon-description-${slot}">${definition.description}</small>
    <dl class="weapon-output" aria-label="当前等级与人物属性下的武器输出"><div><dt>普通伤害</dt><dd id="weapon-normal-${slot}">—</dd></div><div><dt>暴击伤害</dt><dd id="weapon-critical-${slot}">—</dd></div><div><dt>每秒攻击</dt><dd id="weapon-rate-${slot}">—</dd></div></dl>
    <div class="weapon-settings">
      <label for="weapon-choice-${slot}"><span class="visually-hidden">${HAND_LABELS[slot]}武器</span><select id="weapon-choice-${slot}" data-loadout-slot="${slot}" data-loadout-field="weapon" aria-label="${HAND_LABELS[slot]}武器">${(Object.keys(WEAPONS) as WeaponId[]).map(id => `<option value="${id}" ${id === equipped.weapon ? 'selected' : ''}>${WEAPONS[id].name}</option>`).join('')}</select></label>
      <label for="weapon-start-level-${slot}"><span>起始级</span><select id="weapon-start-level-${slot}" data-loadout-slot="${slot}" data-loadout-field="level" aria-label="${HAND_LABELS[slot]}起始等级">${WEAPON_LEVELS.map(item => `<option value="${item.level}" ${item.level === equipped.level ? 'selected' : ''}>Lv.${item.level}</option>`).join('')}</select></label>
    </div>
    <div class="weapon-growth"><div class="weapon-xp-track" id="weapon-xp-${slot}" role="progressbar" aria-label="${HAND_LABELS[slot]}升级经验" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="weapon-xp-fill-${slot}"></span></div><span class="weapon-xp-copy" id="weapon-xp-copy-${slot}"></span></div>
  </div>`;
}

export function mountUI(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing #app');
  let settings = savedSettings();
  let loadout = savedLoadout();
  let sentInitialSettings = false;
  let sentInitialLoadout = false;
  let ready = false;
  let running = false;
  let paused = false;
  let showingEnd = false;
  let pressureTier = 0;
  let currentRun: RunSnapshot | null = null;
  const runActive = () => Boolean(currentRun && ['combat', 'reward', 'upgrade', 'shop'].includes(currentRun.phase));

  app.innerHTML = `
    <div class="lab-shell">
      <header class="masthead">
        <a class="brand" href="#" aria-label="下班突围战斗试验场"><span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span><span class="brand-copy"><strong>下班突围<span class="title-period">.</span></strong><span class="brand-en">OVERTIME / ARENA</span></span></a>
        <div class="masthead-center"><span class="live-dot"></span>下班生存战<span class="version">v0.2</span></div>
        <div class="build-label"><span class="build-bracket">[</span> FEEL FIRST<span class="build-bracket">]</span><span class="build-sub">先把每一击，打舒服。</span></div>
      </header>
      <div class="workspace-controls"><p>一把武器开始，六臂逐步成型。第 10 / 20 波挑战 Boss。</p><button type="button" id="panel-toggle" class="panel-toggle" aria-expanded="false" aria-controls="control-panel">${icon('controls')}<span id="panel-toggle-label">控制面板</span></button></div>
      <main class="workspace">
        <section class="battle-column" aria-label="战斗区域">
          <div class="combat-stats">
            <div class="hp-stat"><div class="stat-label">状态 <span>VITALS</span><strong id="hp-value">100 / 100</strong></div><div class="hp-track"><div id="hp-fill"></div></div><span class="hp-caption" id="hp-caption">练习模式 · 自由试手感</span></div>
            <div class="number-stat"><span class="stat-label">击退职场压力</span><strong id="kills-value">000</strong><span class="stat-unit">ELIMINATIONS</span></div>
            <div class="number-stat combo-stat"><span class="stat-label">连续击破</span><strong><span id="combo-value">0</span><small> COMBO</small></strong><span class="stat-unit" id="best-combo">BEST 0</span></div>
            <div class="number-stat time-stat"><span class="stat-label">试炼时间</span><strong id="time-value">00:00</strong><span class="stat-unit">RUN TIME</span></div>
          </div>
          <div class="run-hud" id="run-hud" aria-label="本局成长" hidden>
            <div><span>当前波次</span><strong id="run-wave">1 / 20</strong><small id="run-timer">20 秒</small></div>
            <div class="run-xp-hud"><span>人物等级</span><strong id="run-level">Lv.1</strong><small id="run-xp-label">0 / 20</small><div id="run-xp-track" class="run-xp-track" role="progressbar" aria-label="人物升级经验" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="run-xp-fill"></span></div></div>
            <div><span>加班费</span><strong id="run-money">0</strong><small>拾取工资条</small></div>
          </div>
          <div class="arena-card">
            <div class="arena-toolbar"><div class="arena-title"><span class="live-dot small" id="arena-dot"></span><span id="arena-status">正在准备试验场</span><span class="arena-separator">/</span><span id="weapon-status">六臂 · 1/6</span></div><div class="arena-actions"><button id="pause-button" class="icon-button" aria-label="开始战斗" title="Esc 暂停并释放鼠标" disabled>${icon('play')}</button><button id="restart-button" class="icon-button" aria-label="重新开始" title="重新开始" disabled>${icon('restart')}</button><span class="toolbar-divider"></span><button id="fullscreen-button" class="icon-button" aria-label="全屏战斗区域" title="全屏">${icon('expand')}</button></div></div>
            <div id="play-area" class="play-area">
              <div id="game-host" tabindex="0" aria-label="战斗试验场。开始或继续后锁定并隐藏鼠标，鼠标和触摸板可连续控制方向，移速有上限，停手即停。武器自动索敌攻击。Esc 暂停并释放鼠标，点击继续恢复。触屏按住滑动；WASD、方向键或手柄左摇杆也可移动。开局一把一级武器，波间商店购买补充六只手。镜头跟随角色移动。"></div>
              <div class="game-overlay" id="start-overlay"><div class="start-card"><div class="overlay-eyebrow"><span></span> COMBAT FEEL LAB <span></span></div><h1>工作先放一边。<br><em>现在，轮到你出手。</em></h1><p>${START_GUIDE}</p><button class="primary-button" id="start-button" disabled>${icon('play')}<span id="start-label">正在准备…</span><span class="button-arrow">↗</span></button><span class="overlay-note" id="start-mode-note">单武器开局 · 20 波生存 · 第 10 / 20 波 Boss</span></div></div>
              <div class="game-overlay pause-overlay" id="pause-overlay" hidden><div class="pause-card"><span class="overlay-eyebrow">TAKE A BREATH</span><h2 id="pause-title">休息一下。</h2><p id="pause-description" aria-live="polite">${DEFAULT_PAUSE_GUIDE}</p><button class="primary-button" id="resume-button">${icon('play')}<span id="resume-label">继续战斗</span><span class="button-arrow">↗</span></button><span class="overlay-note" id="pause-note">点击继续战斗</span></div></div>
              <div class="run-inset-hud" id="run-inset-hud" hidden><strong id="run-inset-wave"></strong><span id="run-inset-level"></span><span id="run-inset-money"></span></div>
              <div class="boss-hud" id="boss-hud" aria-label="Boss 生命" hidden><div><strong id="boss-name"></strong><span id="boss-hp-label"></span></div><div class="boss-hp-track" id="boss-hp-track" role="progressbar" aria-label="Boss 剩余生命" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span id="boss-hp-fill"></span></div></div>
              <div class="arena-minimap" id="arena-minimap" aria-label="当前位置" hidden><span>办公区 · 镜头跟随</span><div class="minimap-field"><span id="minimap-viewport"></span><i id="minimap-player"></i></div><small id="minimap-position"></small></div>
              <section class="run-overlay" id="run-overlay" role="region" aria-labelledby="run-title" hidden>
                <div class="run-intermission">
                  <header class="run-heading"><div><span class="run-eyebrow" id="run-eyebrow">波次完成</span><h2 id="run-title" tabindex="-1">休整一下。</h2><p id="run-description"></p></div><div class="run-wallet"><span>可用加班费</span><strong id="run-wallet">0</strong></div></header>
                  <p id="run-message" class="run-message" role="status" aria-live="polite"></p>
                  <div id="reward-stage" hidden><p class="run-reward-intro">击败 Boss 获得专属战利品，从 3 件高品质奖励中免费选取 1 件。</p><div class="run-offers reward-offers" id="boss-reward-offers"></div></div>
                  <div id="upgrade-stage" hidden><div class="run-section-toolbar"><span id="upgrade-count">选择一项本局提升</span><button type="button" class="run-secondary" id="upgrade-reroll">刷新选项</button></div><div class="run-offers upgrade-offers" id="upgrade-offers"></div></div>
                  <div id="shop-stage" hidden><div class="run-section-toolbar"><span>补给商店 · 锁定商品留到下一波</span><button type="button" class="run-secondary" id="shop-reroll">刷新商品</button></div><div class="run-offers shop-offers" id="shop-offers"></div><p class="run-merge-hint">空手可以直接购买装备。两把同种、同级武器可合为更高一级，最高 Lv.5；合成会空出一只手。六只手已满时，可购买同种同级武器合成，或先回收装备。</p><div class="run-next-row"><p>下一波开始时回复至满血，武器自动攻击。</p><button type="button" class="primary-button" id="run-next">开始下一波 ↗</button></div><details class="run-disclosure" open><summary>六臂装备 <span>当前配装</span></summary><div class="run-gear" id="run-gear"></div></details></div>
                  <div id="run-result" class="run-result" hidden><p id="run-result-copy"></p><button type="button" class="primary-button" id="run-restart">再来一局 ↗</button><p class="run-result-note">重开仅携带所选的 1 把 Lv.1 武器，其他装备在商店购买。</p></div>
                  <details class="run-disclosure"><summary>人物综合属性 <span>含升级与道具加成</span></summary><dl class="run-attributes" id="run-attributes"></dl><p class="run-merge-hint">护甲 15 时约减伤 50%；负护甲会增加承伤。闪避最高 60%。<br>生命再生持续回复：1 点每 5 秒回 1 生命，后续每点增加约 0.089 生命/秒。生命窃取按命中概率回复 1 生命，最多每秒触发 10 次。</p><p class="run-merge-hint">幸运提高升级选项和商店商品的品质。收获在波末提供等量加班费与经验，随后收获值增长 5%（向上取整）。</p><p class="run-merge-hint">近战：机械键盘、解压印章。<br>远程：脉冲订书机、碎纸霰弹、回旋文件夹。<br>元素：激光演示笔、高压咖啡杯、超载充电线。<br>对应类型伤害先乘武器系数，再计入攻击力和暴击。</p></details>
                  <div class="run-trophies" id="run-trophies" hidden></div>
                  <details class="run-disclosure"><summary>道具背包 <span id="run-inventory-count">0 件</span></summary><div class="run-inventory" id="run-inventory"></div></details>
                </div>
              </section>
              <div class="movement-hint"><span>鼠标 / 触控移动</span><small class="desktop-move-hint" id="desktop-move-hint">开始后锁定鼠标 · Esc 暂停释放</small><small class="touch-move-hint">按住滑动 · 停手即停</small></div>
            </div>
            <div class="arena-bottom"><div class="combat-mode">${icon('target')}<span>只需移动 · 自动攻击</span></div><div class="performance"><span><b id="enemy-value">0</b> 敌人</span><i></i><span><b id="fps-value">—</b> FPS</span><span class="p95"><b id="p95-value">—</b> ms P95</span><span class="renderer-badge" id="renderer-value">WEBGL</span></div></div>
          </div>
          <div class="control-guide"><div class="pointer-guide"><span id="pointer-guide-copy">鼠标 / 触摸板锁定移动 · 停手即停</span></div><div class="keyboard-guide"><kbd>WASD</kbd><span>/ 方向键移动</span></div><div class="keyboard-guide"><kbd>ESC</kbd><span>暂停 / 释放鼠标</span></div><div><span>手柄左摇杆移动</span></div></div>
          <div class="lab-caption"><span><span class="caption-cross">+</span> 拾取工资条成长，波间打造你的流派</span><span>20 波 · 两场 Boss 战 · 5 级合成</span></div>
        </section>
        <aside class="lab-panel" id="control-panel" aria-label="战斗实验面板" hidden>
          <p class="panel-intro">按分类展开设置。初始属性、配装和模式在开局前调整，本局成长通过升级与商店获得。</p>
          <details class="panel-group attributes-section">
          <summary class="panel-group-summary panel-heading"><h2><span class="section-index">01 /</span>人物属性</h2><span class="panel-meta">ATTRIBUTES</span><span class="panel-chevron" aria-hidden="true">›</span></summary>
          <div class="panel-group-body"><p class="weapon-hint" id="attribute-lock-hint">初始属性决定起跑线；开局后通过升级和道具成长。</p><div class="panel-group-actions"><button id="reset-attributes-button" class="text-button" title="恢复默认攻击力、攻速和暴击率">恢复属性 ↺</button></div>
          <div class="sliders">${attributeRanges.map(r => `<div class="slider-field"><label for="setting-${r.id}">${r.label}<span>${r.labelEn}</span></label><output id="value-${r.id}" for="setting-${r.id}">${r.format(settings[r.id])}</output><input id="setting-${r.id}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${settings[r.id]}" aria-label="${r.label}"></div>`).join('')}</div>
          <dl class="attribute-multipliers"><div><dt>伤害倍率</dt><dd id="attribute-damage">—</dd></div><div><dt>攻击频率</dt><dd id="attribute-rate">—</dd></div><div><dt>暴击倍率</dt><dd>×${CRIT_MULTIPLIER}</dd></div></dl>
          <div class="attribute-formulas"><p>伤害 = (武器当前等级伤害 + 对应类型伤害 × 武器系数) × (1 + 攻击力 ÷ 100) × 暴击倍率 × 敌人承伤系数</p><p>攻击间隔 = 武器当前等级间隔 ÷ (1 + 攻速加成 ÷ 100)</p><small>普通命中倍率为 1，暴击为 ${CRIT_MULTIPLIER}。六把武器共享人物属性；每种武器使用对应近战、远程或元素加成。</small></div>
          </div></details>
          <details class="panel-group">
          <summary class="panel-group-summary panel-heading"><h2><span class="section-index">02 /</span>六臂装备</h2><span class="panel-meta">8 种 · 5 级</span><span class="panel-chevron" aria-hidden="true">›</span></summary>
          <div class="panel-group-body">
          <div class="weapon-list"><p class="weapon-hint" id="loadout-hint">生存挑战从左上手选择的 1 把 Lv.1 武器开始，其他武器在商店购买。</p><fieldset class="loadout-controls" id="loadout-controls" disabled><legend class="visually-hidden">六臂武器与起始等级</legend><div class="equipped-weapons" role="list" aria-label="六只手的装备与空位">${loadout.map(weaponCard).join('')}</div></fieldset><div class="weapon-level-key" aria-label="五个武器等级">${WEAPON_LEVELS.map(level => `<span style="color:${level.css}">Lv.${level.level} ${level.name}</span>`).join('')}</div><p class="weapon-hint">伤害已计入人物攻击力，按单段命中显示，敌人减伤另算。<br>实战中，两把同种同级武器可在商店合成，最高 Lv.5。<br>开局只有第一只手的 Lv.1 武器；靶场可自由配置六只手。</p><p class="loadout-status" id="loadout-status" role="status" aria-live="polite">配装保存在本机，生存挑战始终从单把 Lv.1 开始。</p></div>
          </div></details>
          <details class="panel-group">
          <summary class="panel-group-summary panel-heading"><h2><span class="section-index">03 /</span>压力来源</h2><span class="pressure-badge" id="pressure-value">压力 Lv.1</span><span class="panel-chevron" aria-hidden="true">›</span></summary>
          <div class="panel-group-body"><div class="mode-buttons" role="group" aria-label="敌群模式"><button data-mode="steady" aria-pressed="true">持续来袭</button><button data-mode="swarm" aria-pressed="false">密集围攻</button><button data-mode="dummy" aria-pressed="false">固定靶场</button></div><dl class="enemy-guide" aria-label="五类敌人的行动特点"><div><dt>加急文件</dt><dd>快速追击</dd></div><div><dt>重装主管</dt><dd>高血量 · 抗击退</dd></div><div><dt>催命闹钟</dt><dd>红线预警后冲锋</dd></div><div><dt>甩锅投手</dt><dd>短程扇形慢弹 · 前 3 波不出现</dd></div><div><dt>审批壁垒</dt><dd>正面减伤 · 绕侧后方打</dd></div></dl><p class="pressure-hint" id="pressure-hint">第 10 / 20 波迎战 Boss；击败后可免费选择专属奖励。</p><button id="burst-button" class="burst-button" disabled><span>＋</span> 来一波压力<span class="burst-hint">增援</span></button></div></details>
          <details class="panel-group tuning-section">
          <summary class="panel-group-summary panel-heading"><h2><span class="section-index">04 /</span>手感调校</h2><span class="panel-meta">TUNING</span><span class="panel-chevron" aria-hidden="true">›</span></summary>
          <div class="panel-group-body"><div class="panel-group-actions"><button id="reset-button" class="text-button" title="恢复默认手感参数">恢复默认 ↺</button></div>
          <div class="sliders">${ranges.map(r => `<div class="slider-field"><label for="setting-${r.id}">${r.label}<span>${r.labelEn}</span></label><output id="value-${r.id}" for="setting-${r.id}">${r.format(settings[r.id])}</output><input id="setting-${r.id}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${settings[r.id]}" aria-label="${r.label}" title="${r.id === 'pointerSensitivity' ? '调整鼠标 / 触控小幅滑动的响应，最大移速保持不变' : r.id === 'speed' ? '鼠标、触控、键盘与手柄共用的移动速度上限' : r.label}"></div>`).join('')}</div>
          <label class="toggle-field"><span><strong>无压力练习</strong><small>保留受击反馈，倒下即恢复</small></span><input id="setting-practice" type="checkbox" ${settings.practice ? 'checked' : ''}><span class="toggle-track"></span></label></div></details>
          <details class="panel-group avatar-section" aria-labelledby="avatar-heading">
            <summary class="panel-group-summary panel-heading"><h2 id="avatar-heading"><span class="section-index">05 /</span>我的打工人</h2><span class="panel-meta">PORTRAIT</span><span class="panel-chevron" aria-hidden="true">›</span></summary>
            <div class="panel-group-body">
            <p class="avatar-pause-hint" id="avatar-pause-hint">战斗中先按 Esc 或点暂停，再调整头像。</p>
            <fieldset id="avatar-controls" class="avatar-controls" disabled>
              <legend class="visually-hidden">上传照片、裁切头像与表情预览</legend>
              <div class="avatar-preview-row">
                <div class="avatar-preview" id="avatar-preview" data-expression="neutral">
                  <div class="avatar-portrait"><img id="avatar-default-preview" class="avatar-face" src="${DEFAULT_AVATAR_URL}" alt="默认打工人头像"><canvas id="avatar-crop-preview" class="avatar-face" width="256" height="256" aria-label="头像圆形裁切预览" hidden></canvas></div>
                  <span class="avatar-comic" id="avatar-comic" aria-hidden="true"></span>
                </div>
                <div class="avatar-upload-copy"><strong>换上你的脸。</strong><button type="button" id="avatar-upload" class="avatar-secondary">选择照片</button><small>JPG / PNG / WebP<br>最大 10 MB</small></div>
              </div>
              <input id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="选择一张本地头像照片" hidden>
              <p class="avatar-file-name" id="avatar-file-name">默认头像</p>
              <div class="sliders avatar-sliders">${avatarRanges.map(r => `<div class="slider-field"><label for="avatar-${r.id}">${r.label}</label><output id="avatar-value-${r.id}" for="avatar-${r.id}">${r.format(DEFAULT_AVATAR_CROP[r.id])}</output><input id="avatar-${r.id}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${DEFAULT_AVATAR_CROP[r.id]}" aria-label="头像${r.label}" disabled></div>`).join('')}</div>
              <div class="avatar-actions"><button type="button" id="avatar-apply" class="avatar-apply" disabled>应用头像</button><button type="button" id="avatar-reset" class="avatar-secondary" disabled>恢复默认</button></div>
              <div class="avatar-expression-heading">表情试一下<span>短暂预览</span></div>
              <div class="avatar-expressions" role="group" aria-label="头像表情预览">${avatarExpressions.map(e => `<button type="button" data-avatar-expression="${e.id}" aria-label="${e.label}表情，短暂预览" disabled>${e.label}</button>`).join('')}</div>
            </fieldset>
            <p class="avatar-caption">三颗头共享你的头像，动作和表情一起加点戏。</p>
            <p class="avatar-status" id="avatar-status" role="status" aria-live="polite">正在读取本机头像…</p>
            <p class="avatar-privacy">照片仅在本机裁切；只保存处理后的小头像，原图不会上传。</p>
          </div></details>
          <div class="panel-footnote">${icon('target')}<span>参数即时生效<br><small>鼠标调参前，先按 Esc 暂停。</small></span><span class="footnote-corner">↗</span></div>
        </aside>
      </main>
      <footer class="page-footer"><span>OVERTIME ARENA<span class="footer-slash">/</span>COMBAT PROTOTYPE</span><span>把工作的压力，变成漂亮的一击。</span></footer>
    </div>`;

  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
  const panelToggle = $<HTMLButtonElement>('#panel-toggle');
  panelToggle.addEventListener('click', () => {
    const panel = $('#control-panel');
    const open = panel.hidden;
    panel.hidden = !open;
    panelToggle.setAttribute('aria-expanded', String(open));
    $('#panel-toggle-label').textContent = open ? '收起面板' : '控制面板';
    $('.workspace').classList.toggle('has-open-panel', open);
    panelToggle.focus({ preventScroll: true });
    if (open && window.matchMedia('(max-width: 940px)').matches) {
      panel.scrollIntoView({ block: 'start', behavior: 'auto' });
      panel.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
    }
  });
  const focusGame = () => $('#game-host').focus({ preventScroll: true });
  const button = (selector: string, handler: () => void) => {
    $(selector).addEventListener('click', () => { handler(); focusGame(); });
  };
  const equipmentViews = loadout.map((_, slot) => ({
    card: $(`#weapon-card-${slot}`), icon: $(`#weapon-icon-${slot}`),
    name: $(`#weapon-name-${slot}`), description: $(`#weapon-description-${slot}`),
    level: $(`#weapon-level-${slot}`), progress: $(`#weapon-xp-${slot}`),
    fill: $(`#weapon-xp-fill-${slot}`), progressCopy: $(`#weapon-xp-copy-${slot}`),
    normal: $(`#weapon-normal-${slot}`), critical: $(`#weapon-critical-${slot}`), rate: $(`#weapon-rate-${slot}`),
  }));
  let displayedWeapons: Stats['weapons'] = loadout.map((weapon, slot) => ({ ...weapon, slot,
    equipped: true, xp: WEAPON_XP_THRESHOLDS[weapon.level - 1], nextXp: weapon.level === 5 ? null : WEAPON_XP_THRESHOLDS[weapon.level] }));
  const syncWeaponOutput = () => {
    for (const weapon of displayedWeapons) {
      const view = equipmentViews[weapon.slot];
      if (!view || !weapon.equipped) continue;
      const output = weaponOutput(weapon.weapon, weapon.level, currentRun?.attributes ?? settings);
      view.normal.textContent = `${Number(output.normalDamage.toFixed(1))}`;
      view.critical.textContent = `${Number(output.criticalDamage.toFixed(1))}`;
      view.rate.textContent = output.attacksPerSecond.toFixed(2);
    }
  };
  const syncLoadoutControls = () => {
    const blocked = runActive() || running && !paused;
    const formal = settings.mode !== 'dummy';
    $('#loadout-controls').classList.toggle('formal-loadout', formal);
    $('#loadout-controls').classList.toggle('run-loadout', runActive());
    $<HTMLFieldSetElement>('#loadout-controls').disabled = !ready || blocked;
    app.querySelectorAll<HTMLSelectElement>('[data-loadout-slot]').forEach(select => {
      const slot = Number(select.dataset.loadoutSlot);
      const level = select.dataset.loadoutField === 'level';
      select.disabled = formal && (slot !== 0 || level);
      select.value = String(level && formal ? 1 : loadout[slot][level ? 'level' : 'weapon']);
      select.title = formal ? slot === 0 && !level ? '选择下局的初始武器' : '生存挑战单把 Lv.1 开局，其他装备在商店购买' : '';
    });
    $('#loadout-hint').textContent = !ready ? '正在准备武器…' : runActive()
      ? '本局通过波间商店购买、合成和回收装备。' : blocked
      ? '战斗中自动攻击。按 Esc 暂停可换装。' : formal
      ? '选择左上手的初始武器，固定 Lv.1 开局。其余五只手需要在商店购买装备。'
      : '靶场可配置六只手的武器和等级，允许重复装备。';
  };
  const syncWeaponStats = (weapons: Stats['weapons']) => {
    const opening = !currentRun && !running && settings.mode !== 'dummy';
    displayedWeapons = weapons.map(weapon => opening
      ? { ...weapon, equipped: weapon.slot === 0, weapon: loadout[weapon.slot].weapon, level: 1, xp: 0, nextXp: null }
      : weapon);
    for (const weapon of displayedWeapons) {
      const view = equipmentViews[weapon.slot];
      if (!view) continue;
      view.card.classList.toggle('is-empty', !weapon.equipped);
      view.card.querySelector<HTMLElement>('.weapon-output')!.hidden = !weapon.equipped;
      view.card.querySelector<HTMLElement>('.weapon-growth')!.hidden = !weapon.equipped;
      if (!weapon.equipped) {
        view.icon.textContent = '＋'; view.icon.dataset.weapon = '';
        view.name.textContent = '空手'; view.description.textContent = '波间商店购买武器后装备到这里。';
        view.level.textContent = '待购买'; view.level.dataset.level = '';
        view.card.style.setProperty('--weapon-level', '#779077');
        continue;
      }
      const definition = WEAPONS[weapon.weapon];
      const level = WEAPON_LEVELS[weapon.level - 1];
      if (view.icon.dataset.weapon !== weapon.weapon) {
        view.icon.innerHTML = icon(weapon.weapon);
        view.icon.dataset.weapon = weapon.weapon;
      }
      view.name.textContent = definition.name;
      view.description.textContent = definition.description;
      if (view.level.dataset.level !== String(weapon.level)) {
        view.level.replaceChildren(document.createTextNode(`Lv.${weapon.level}`));
        const name = document.createElement('small'); name.textContent = level.name;
        view.level.append(name); view.level.dataset.level = String(weapon.level);
        view.card.style.setProperty('--weapon-level', level.css);
      }
      const threshold = WEAPON_XP_THRESHOLDS[weapon.level - 1];
      const required = weapon.nextXp === null ? 0 : weapon.nextXp - threshold;
      const gained = Math.max(0, weapon.xp - threshold);
      const progress = required > 0 ? Math.min(100, gained / required * 100) : 100;
      view.fill.style.width = `${progress}%`;
      view.progress.setAttribute('aria-valuenow', String(Math.round(progress)));
      view.progress.hidden = Boolean(currentRun) || opening;
      const copy = currentRun ? weapon.level === 5 ? '已满级 · Lv.5' : '两把同种同级武器合成升级' : opening ? '初始武器 · 固定 Lv.1' : weapon.nextXp === null ? '已满级' : `${Math.floor(gained)} / ${required} · 升 Lv.${weapon.level + 1}`;
      view.progressCopy.textContent = copy;
      view.progress.setAttribute('aria-valuetext', copy);
    }
    syncWeaponOutput();
  };
  syncWeaponStats(displayedWeapons);
  app.querySelectorAll<HTMLSelectElement>('[data-loadout-slot]').forEach(select => {
    select.addEventListener('change', () => {
      const slot = Number(select.dataset.loadoutSlot);
      const field = select.dataset.loadoutField as 'weapon' | 'level';
      if (!ready || runActive() || running && !paused || settings.mode !== 'dummy' && (slot !== 0 || field === 'level')) { select.value = String(loadout[slot][field]); return; }
      const updated = normalizeLoadout(loadout.map((entry, index) => index === slot
        ? { ...entry, [field]: field === 'level' ? Number(select.value) : select.value } : entry));
      if (updated[slot].weapon === loadout[slot].weapon && updated[slot].level === loadout[slot].level) return;
      loadout = updated;
      syncWeaponStats(displayedWeapons.map(entry => entry.slot === slot ? { ...loadout[slot], slot, equipped: true,
        xp: WEAPON_XP_THRESHOLDS[loadout[slot].level - 1],
        nextXp: loadout[slot].level === 5 ? null : WEAPON_XP_THRESHOLDS[loadout[slot].level] } : entry));
      let stored = true;
      try { localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(loadout)); } catch { stored = false; }
      command({ type: 'loadout', weapons: loadout.map(entry => ({ ...entry })) });
      $('#loadout-status').textContent = `${settings.mode === 'dummy' ? HAND_LABELS[slot] : '初始武器'}已选择 ${WEAPONS[loadout[slot].weapon].name} Lv.${settings.mode === 'dummy' ? loadout[slot].level : 1}。${stored ? '选择已保存。' : '本次已生效；浏览器未能保存。'}`;
    });
  });
  $('.brand').addEventListener('click', e => e.preventDefault());
  const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Optional persistence. */ } };
  const syncPressure = () => {
    const isDummy = settings.mode === 'dummy';
    $('#pressure-value').textContent = isDummy ? '靶场' : `压力 Lv.${pressureTier + 1}`;
    $('#pressure-value').classList.toggle('is-dummy', isDummy);
    $('#pressure-hint').textContent = isDummy ? '固定靶不成长，没有敌方子弹，可自由试手感。' : currentRun ? [10, 20].includes(currentRun.wave) ? `第 ${currentRun.wave} 波 Boss 战：击败 Boss 领取专属奖励；倒计时结束后不再增援。` : `第 ${currentRun.wave} 波，完成倒计时进入休整。前 3 波没有弹幕怪，第 4–6 波少量出现。` : '前 3 波没有弹幕怪，第 4–6 波少量出现。第 10 / 20 波迎战 Boss。';
    app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => { button.disabled = runActive(); });
    $<HTMLButtonElement>('#burst-button').disabled = !ready || isDummy || runActive();
    $('#burst-button').title = runActive() ? '生存挑战按波次自动增援' : isDummy ? '靶场仅使用训练靶，切换敌群模式后可增援' : '召唤一波敌人';
  };
  const syncSettings = () => {
    for (const r of settingRanges) {
      const input = $<HTMLInputElement>(`#setting-${r.id}`);
      input.value = `${settings[r.id]}`;
      input.style.setProperty('--range-fill', `${((settings[r.id] - r.min) / (r.max - r.min)) * 100}%`);
      $(`#value-${r.id}`).textContent = r.format(settings[r.id]);
    }
    $<HTMLInputElement>('#setting-practice').checked = settings.practice;
    $('#start-mode-note').textContent = settings.mode === 'dummy' ? '固定靶场 · 自由调参 · 只管走位' : '单武器开局 · 20 波生存 · 第 10 / 20 波 Boss';
    app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.mode === settings.mode)));
    $('#hp-caption').textContent = currentRun ? '20 波生存 · 波间休整' : settings.mode === 'dummy' ? '固定靶场 · 自由试手感' : settings.practice ? '练习模式 · 倒下即恢复' : '生存模式 · 注意你的血量';
    $('#attribute-damage').textContent = `×${attackMultiplier(currentRun?.attributes ?? settings).toFixed(2)}`;
    $('#attribute-rate').textContent = `×${attackRateMultiplier(currentRun?.attributes ?? settings).toFixed(2)}`;
    syncWeaponStats(displayedWeapons);
    syncLoadoutControls();
    syncPressure();
  };
  const changeSettings = (patch: Partial<Settings>) => {
    if (runActive()) {
      const { attackPower: _attackPower, attackSpeed: _attackSpeed, critChance: _critChance, mode: _mode, practice: _practice, ...allowed } = patch;
      patch = allowed;
    }
    settings = { ...settings, ...patch }; syncSettings(); persist(); command({ type: 'settings', settings: patch }); };
  syncSettings();
  for (const r of settingRanges) {
    const input = $<HTMLInputElement>(`#setting-${r.id}`);
    input.addEventListener('input', e => changeSettings({ [r.id]: Number((e.target as HTMLInputElement).value) }));
    input.addEventListener('pointerup', () => requestAnimationFrame(focusGame));
  }
  $<HTMLInputElement>('#setting-practice').addEventListener('change', e => { changeSettings({ practice: (e.target as HTMLInputElement).checked }); focusGame(); });
  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(el => el.addEventListener('click', () => { changeSettings({ mode: el.dataset.mode as LabMode }); focusGame(); }));
  button('#start-button', () => command({ type: 'start' }));
  button('#resume-button', () => command({ type: 'pause' }));
  button('#pause-button', () => command({ type: running ? 'pause' : 'start' }));
  button('#restart-button', () => { shopSelections.clear(); command({ type: 'restart' }); });
  button('#burst-button', () => command({ type: 'burst' }));
  button('#reset-attributes-button', () => changeSettings({
    attackPower: DEFAULT_SETTINGS.attackPower, attackSpeed: DEFAULT_SETTINGS.attackSpeed, critChance: DEFAULT_SETTINGS.critChance,
  }));
  button('#reset-button', () => changeSettings({
    ...Object.fromEntries(ranges.map(({ id }) => [id, DEFAULT_SETTINGS[id]])), practice: DEFAULT_SETTINGS.practice,
  }));
  button('#fullscreen-button', () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void $('#play-area').requestFullscreen?.().catch(() => {});
  });

  // Keep the intermission mounted. HUD updates must not recreate focused shop controls.
  const runOverlay = $('#run-overlay');
  const shopSelections = new Map<string, number>();
  let renderedPhase = '';
  let upgradeMarkupKey = '';
  let rewardMarkupKey = '';
  let trophiesMarkupKey = '';
  let shopMarkupKey = '';
  let gearMarkupKey = '';
  let attributeMarkupKey = '';
  let inventoryMarkupKey = '';
  const numberText = (value: number) => String(Number(value.toFixed(1)));
  const signed = (value: number) => `${value >= 0 ? '+' : ''}${numberText(value)}`;
  const writeText = (selector: string, value: string) => { const element = $(selector); if (element.textContent !== value) element.textContent = value; };
  const tierStyle = (tier: number) => WEAPON_LEVELS[Math.max(0, Math.min(4, tier - 1))];
  const preserveFocusHTML = (container: HTMLElement, markup: string) => {
    const focused = document.activeElement instanceof HTMLElement && container.contains(document.activeElement) ? document.activeElement.id : '';
    const scrollTop = runOverlay.scrollTop;
    container.innerHTML = markup;
    if (focused) {
      const next = document.getElementById(focused) ?? container.querySelector<HTMLElement>('button:not(:disabled),select');
      next?.focus({ preventScroll: true });
    }
    runOverlay.scrollTop = scrollTop;
  };
  const canBuyInSlot = (offer: RunSnapshot['shop'][number], slot: number) => {
    const held = displayedWeapons.find(weapon => weapon.slot === slot);
    return Boolean(held && (!held.equipped || held.weapon === offer.weapon && held.level === offer.level && held.level < 5));
  };
  const preferredSlot = (offer: RunSnapshot['shop'][number]) => {
    const stored = shopSelections.get(offer.id);
    if (stored !== undefined && canBuyInSlot(offer, stored)) return stored;
    const empty = displayedWeapons.find(weapon => !weapon.equipped);
    const match = displayedWeapons.find(weapon => canBuyInSlot(offer, weapon.slot));
    return empty?.slot ?? match?.slot ?? -1;
  };
  const weaponPurchaseLabel = (offer: RunSnapshot['shop'][number], slot: number) => {
    const held = displayedWeapons.find(weapon => weapon.slot === slot);
    return held?.equipped
      ? `合成 Lv.${held.level + 1} · ${offer.price} 加班费` : `装备${HAND_LABELS[slot]} · ${offer.price} 加班费`;
  };
  const updateShopButtons = () => {
    if (!currentRun) return;
    for (const offer of currentRun.shop) {
      const buy = document.getElementById(`shop-buy-${offer.id}`) as HTMLButtonElement | null;
      if (!buy) continue;
      const slot = preferredSlot(offer);
      const full = offer.kind === 'weapon' && slot < 0;
      buy.disabled = currentRun.phase !== 'shop' || offer.price > currentRun.materials || full;
      const label = offer.kind === 'weapon' && !full ? weaponPurchaseLabel(offer, slot) : `购买 · ${offer.price} 加班费`;
      buy.textContent = full ? '六臂已满 · 请先合成或回收' : offer.price > currentRun.materials ? `加班费不足 · 需 ${offer.price}` : label;
    }
  };
  const syncRun = (stats: Stats) => {
    const run = currentRun;
    const active = runActive();
    const bossVisible = Boolean(stats.boss && run?.phase === 'combat');
    $('#boss-hud').hidden = !bossVisible;
    $('#play-area').classList.toggle('has-boss', bossVisible);
    if (stats.boss && bossVisible) {
      const boss = stats.boss;
      const percentage = Math.max(0, Math.min(100, boss.hp / Math.max(1, boss.maxHp) * 100));
      writeText('#boss-name', `${boss.wave === 20 ? '终极 Boss' : '精英 Boss'} · ${boss.name}`);
      writeText('#boss-hp-label', `${Math.ceil(boss.hp)} / ${boss.maxHp}`);
      $('#boss-hp-fill').style.width = `${percentage}%`;
      $('#boss-hp-track').setAttribute('aria-valuenow', String(Math.round(percentage)));
      $('#boss-hp-track').setAttribute('aria-valuetext', `${Math.ceil(boss.hp)} / ${boss.maxHp}`);
    }
    const mapVisible = Boolean(stats.world && stats.running && (!run || run.phase === 'combat'));
    $('#arena-minimap').hidden = !mapVisible;
    if (mapVisible) {
      const world = stats.world;
      const x = Math.max(0, Math.min(100, world.playerX / world.width * 100));
      const y = Math.max(0, Math.min(100, world.playerY / world.height * 100));
      $('#minimap-player').style.left = `${x}%`;
      $('#minimap-player').style.top = `${y}%`;
      const viewport = $('#minimap-viewport');
      viewport.style.left = `${Math.max(0, world.viewportX) / world.width * 100}%`;
      viewport.style.top = `${Math.max(0, world.viewportY) / world.height * 100}%`;
      viewport.style.width = `${Math.min(world.width, world.viewportWidth) / world.width * 100}%`;
      viewport.style.height = `${Math.min(world.height, world.viewportHeight) / world.height * 100}%`;
      writeText('#minimap-position', `${Math.round(world.playerX)}, ${Math.round(world.playerY)}`);
    }
    for (const range of attributeRanges) $<HTMLInputElement>(`#setting-${range.id}`).disabled = active;
    $<HTMLButtonElement>('#reset-attributes-button').disabled = active;
    $<HTMLInputElement>('#setting-practice').disabled = active;
    writeText('#attribute-lock-hint', active ? '本局属性通过升级与道具成长。初始属性在本局结束后可调整。' : '初始属性决定起跑线；开局后通过升级和道具成长。');
    writeText('#attribute-damage', `×${attackMultiplier(run?.attributes ?? settings).toFixed(2)}`);
    writeText('#attribute-rate', `×${attackRateMultiplier(run?.attributes ?? settings).toFixed(2)}`);
    writeText('#hp-caption', run ? settings.practice ? '20 波练习 · 倒下即恢复' : '20 波生存 · 波间休整' : settings.mode === 'dummy' ? '固定靶场 · 自由试手感' : settings.practice ? '练习模式 · 倒下即恢复' : '生存模式 · 注意你的血量');
    $('#run-hud').hidden = !run;
    $('#run-inset-hud').hidden = !run || run.phase !== 'combat';
    const intermission = Boolean(run && run.phase !== 'combat');
    runOverlay.hidden = !intermission;
    $('#play-area').classList.toggle('has-intermission', intermission);
    if (!run) { renderedPhase = ''; return; }
    writeText('#run-wave', `${run.wave} / ${run.totalWaves}`);
    const timerText = run.waveRemaining <= 0 && !run.bossDefeated && [10, 20].includes(run.wave) ? '击败 Boss 完成本波' : `${Math.ceil(Math.max(0, run.waveRemaining))} 秒`;
    writeText('#run-timer', run.phase === 'combat' ? timerText : run.phase === 'won' ? '已通关' : run.phase === 'lost' ? '本局结束' : '波间休整');
    writeText('#run-level', `Lv.${run.level}`);
    writeText('#run-xp-label', `${Math.floor(run.xp)} / ${run.nextLevelXp}`);
    writeText('#run-money', `${Math.floor(run.materials)}`);
    writeText('#run-inset-wave', `第 ${run.wave} / ${run.totalWaves} 波 · ${timerText}`);
    writeText('#run-inset-level', `Lv.${run.level} · ${Math.floor(run.xp)} / ${run.nextLevelXp} XP`);
    writeText('#run-inset-money', `${Math.floor(run.materials)} 加班费`);
    const xpPercent = Math.max(0, Math.min(100, run.xp / Math.max(1, run.nextLevelXp) * 100));
    $('#run-xp-fill').style.width = `${xpPercent}%`;
    $('#run-xp-track').setAttribute('aria-valuenow', String(Math.round(xpPercent)));
    $('#run-xp-track').setAttribute('aria-valuetext', `${Math.floor(run.xp)} / ${run.nextLevelXp}`);
    if (!intermission) { renderedPhase = run.phase; return; }
    const phaseChanged = renderedPhase !== run.phase;
    renderedPhase = run.phase;
    const isResult = run.phase === 'won' || run.phase === 'lost';
    $('#reward-stage').hidden = run.phase !== 'reward';
    $('#upgrade-stage').hidden = run.phase !== 'upgrade';
    $('#shop-stage').hidden = run.phase !== 'shop';
    $('#run-result').hidden = !isResult;
    writeText('#run-eyebrow', isResult ? 'OVERTIME / COMPLETE' : `WAVE ${String(run.wave).padStart(2, '0')} / ${run.totalWaves}`);
    writeText('#run-title', run.phase === 'reward' ? '压力打破，奖励到手。' : run.phase === 'upgrade' ? '升职，加点本事。' : run.phase === 'shop' ? '加班费，该花就花。' : run.phase === 'won' ? '下班了，漂亮！' : '这轮先休息一下。');
    writeText('#run-description', run.phase === 'reward' ? `第 ${run.wave} 波 Boss 已击败。选择一件专属战利品${run.wave === 20 ? '，完成本局通关' : '，再整装出发'}。` : run.phase === 'upgrade' ? `人物 Lv.${run.level} · 从 ${run.upgrades.length} 个选项中选择一项，本局持续生效。` : run.phase === 'shop' ? '购买武器填满空手，合成同种同级装备，再迎接下一波。' : run.phase === 'won' ? `已完成全部 ${run.totalWaves} 波压力挑战。` : `闯到了第 ${run.wave} 波，下次试试新的组合。`);
    writeText('#run-wallet', `${Math.floor(run.materials)}`);
    writeText('#run-message', run.message || (run.phase === 'reward' ? '本轮奖励免费领取，选择后持续强化人物属性。' : run.phase === 'upgrade' ? '升级不花钱；刷新选项会扣除加班费。' : run.phase === 'shop' ? '锁定商品会保留到下次刷新和下一波，价格保持不变。' : ''));
    writeText('#upgrade-count', `待选择 ${run.pendingUpgrades} 次 · ${run.upgrades.length} 选 1`);
    writeText('#upgrade-reroll', `刷新选项 · ${run.upgradeRerollCost} 加班费`);
    $<HTMLButtonElement>('#upgrade-reroll').disabled = run.phase !== 'upgrade' || run.materials < run.upgradeRerollCost;
    const allLocked = run.shop.length >= 4 && run.shop.every(offer => offer.locked);
    writeText('#shop-reroll', allLocked ? '商品已全部锁定' : `刷新商品 · ${run.shopRerollCost} 加班费`);
    $<HTMLButtonElement>('#shop-reroll').disabled = run.phase !== 'shop' || allLocked || run.materials < run.shopRerollCost;
    writeText('#run-next', `开始第 ${run.wave + 1} 波${[9, 19].includes(run.wave) ? ' · Boss 战' : ''} ↗`);
    const rewardKey = JSON.stringify(run.bossRewards);
    if (rewardKey !== rewardMarkupKey) {
      rewardMarkupKey = rewardKey;
      preserveFocusHTML($('#boss-reward-offers'), run.bossRewards.map(offer => {
        const tier = tierStyle(offer.tier);
        return `<button type="button" class="run-offer upgrade-card reward-card" id="boss-reward-${escapeHTML(offer.id)}" data-boss-reward="${escapeHTML(offer.id)}" style="--offer-color:${tier.css}"><span class="run-offer-tier">${tier.name} · Boss 专属</span><strong>${escapeHTML(offer.name)}</strong><span class="run-offer-description">${escapeHTML(offer.description)}</span><span class="run-choice-label">免费领取 ↗</span></button>`;
      }).join(''));
    }
    const upgradeKey = JSON.stringify(run.upgrades);
    if (upgradeKey !== upgradeMarkupKey) {
      upgradeMarkupKey = upgradeKey;
      preserveFocusHTML($('#upgrade-offers'), run.upgrades.map(offer => {
        const tier = tierStyle(offer.tier);
        return `<button type="button" class="run-offer upgrade-card" id="upgrade-${escapeHTML(offer.id)}" data-upgrade="${escapeHTML(offer.id)}" style="--offer-color:${tier.css}"><span class="run-offer-tier">${tier.name}</span><strong>${escapeHTML(offer.name)}</strong><span class="run-offer-description">${escapeHTML(offer.description)}</span><span class="run-choice-label">选择这项提升 ↗</span></button>`;
      }).join(''));
    }
    const gearKey = JSON.stringify(displayedWeapons.map(({ slot, weapon, level, equipped }) => ({ slot, weapon, level, equipped }))) + run.wave;
    const shopKey = JSON.stringify(run.shop) + gearKey;
    if (shopKey !== shopMarkupKey) {
      shopMarkupKey = shopKey;
      preserveFocusHTML($('#shop-offers'), run.shop.length ? run.shop.map(offer => {
        const tier = tierStyle(offer.tier);
        const selectedSlot = preferredSlot(offer);
        return `<article class="run-offer shop-card" style="--offer-color:${tier.css}"><div class="run-shop-card-top"><span class="run-offer-tier">${tier.name} · ${offer.kind === 'weapon' ? `武器 Lv.${offer.level}` : '道具'}</span><button type="button" class="shop-lock" id="shop-lock-${escapeHTML(offer.id)}" data-lock="${escapeHTML(offer.id)}" aria-pressed="${offer.locked}" aria-label="${offer.locked ? '解锁' : '锁定'}${escapeHTML(offer.name)}">${offer.locked ? '已锁定' : '锁定'}</button></div><strong>${offer.weapon ? icon(offer.weapon) : '<span class="run-item-symbol" aria-hidden="true">✦</span>'}${escapeHTML(offer.name)}</strong><p class="run-offer-description">${escapeHTML(offer.description)}</p>${offer.kind === 'weapon' ? `<label class="shop-slot-label" for="shop-slot-${escapeHTML(offer.id)}">装备到哪只手<select id="shop-slot-${escapeHTML(offer.id)}" data-shop-slot="${escapeHTML(offer.id)}">${selectedSlot < 0 ? '<option value="-1" selected>无空位或可合成装备</option>' : ''}${displayedWeapons.map(weapon => `<option value="${weapon.slot}" ${weapon.slot === selectedSlot ? 'selected' : ''} ${canBuyInSlot(offer, weapon.slot) ? '' : 'disabled'}>${HAND_LABELS[weapon.slot]} · ${!weapon.equipped ? '空手 → 装备' : `${WEAPONS[weapon.weapon].name} Lv.${weapon.level}${canBuyInSlot(offer, weapon.slot) ? ' → 合成升级' : ' · 已占用'}`}</option>`).join('')}</select></label>` : ''}<button type="button" class="shop-buy" id="shop-buy-${escapeHTML(offer.id)}" data-buy="${escapeHTML(offer.id)}" ${offer.price > run.materials ? 'disabled' : ''}>购买 · ${offer.price} 加班费</button></article>`;
      }).join('') : '<p class="run-empty">货架已清空。可以刷新补货，或直接开始下一波。</p>');
    }
    updateShopButtons();
    if (gearKey !== gearMarkupKey) {
      gearMarkupKey = gearKey;
      const equippedCount = displayedWeapons.filter(weapon => weapon.equipped).length;
      preserveFocusHTML($('#run-gear'), displayedWeapons.map(weapon => {
        if (!weapon.equipped) return `<div class="run-empty-hand"><span class="empty-hand-symbol" aria-hidden="true">＋</span><span><small>${HAND_LABELS[weapon.slot]}</small><strong>空手 · 商店购买装备</strong></span></div>`;
        const match = displayedWeapons.find(other => other.equipped && other.slot !== weapon.slot && other.weapon === weapon.weapon && other.level === weapon.level && weapon.level < 5);
        return `<div style="--offer-color:${tierStyle(weapon.level).css}">${icon(weapon.weapon)}<span><small>${HAND_LABELS[weapon.slot]}</small><strong>${WEAPONS[weapon.weapon].name}</strong></span><b>Lv.${weapon.level}</b><div class="run-gear-actions"><button type="button" id="gear-combine-${weapon.slot}" data-combine="${weapon.slot}" data-other-slot="${match?.slot ?? -1}" ${match ? '' : 'disabled'} title="${match ? `与${HAND_LABELS[match.slot]}合成，获得 Lv.${weapon.level + 1}` : weapon.level === 5 ? '已达到最高等级' : '需要另一把同种同级武器'}">${match ? `合成 Lv.${weapon.level + 1}` : weapon.level === 5 ? '已满级' : '待同级武器'}</button><button type="button" id="gear-sell-${weapon.slot}" data-sell="${weapon.slot}" ${equippedCount <= 1 ? 'disabled' : ''} title="${equippedCount <= 1 ? '保留至少一把武器' : '回收这把武器，获得加班费'}">回收 +${weaponRecycleValue(run.wave, weapon.level)}</button></div></div>`;
      }).join(''));
    }
    const attributeKey = JSON.stringify(run.attributes);
    if (attributeKey !== attributeMarkupKey) {
      attributeMarkupKey = attributeKey;
      const a = run.attributes;
      const values = [
        ['攻击力', signed(a.attackPower) + '%'], ['攻速加成', signed(a.attackSpeed) + '%'], ['暴击率', numberText(a.critChance) + '%'],
        ['最大生命', numberText(a.maxHp)], ['生命再生', numberText(a.hpRegen)], ['生命窃取', numberText(a.lifeSteal) + '%'],
        ['护甲', numberText(a.armor)], ['闪避', numberText(a.dodge) + '%'], ['移动速度', signed(a.speedBonus) + '%'],
        ['幸运', numberText(a.luck)], ['收获', numberText(a.harvesting)], ['近战伤害', signed(a.meleeDamage)],
        ['远程伤害', signed(a.rangedDamage)], ['元素伤害', signed(a.elementalDamage)], ['拾取范围', signed(a.pickupRange) + '%'],
      ];
      $('#run-attributes').innerHTML = values.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    }
    const inventoryKey = JSON.stringify(run.inventory);
    if (inventoryKey !== inventoryMarkupKey) {
      inventoryMarkupKey = inventoryKey;
      writeText('#run-inventory-count', `${run.inventory.reduce((sum, item) => sum + item.count, 0)} 件`);
      $('#run-inventory').innerHTML = run.inventory.length ? run.inventory.map(item => `<div class="run-inventory-item" style="--offer-color:${tierStyle(item.tier).css}"><strong>${escapeHTML(item.name)} <span>×${item.count}</span></strong><p>${escapeHTML(item.description)}</p></div>`).join('') : '<p class="run-empty">还没有道具，去商店挑选适合你的组合。</p>';
    }
    const trophiesKey = JSON.stringify(run.bossTrophies);
    if (trophiesKey !== trophiesMarkupKey) {
      trophiesMarkupKey = trophiesKey;
      $('#run-trophies').hidden = !run.bossTrophies.length;
      $('#run-trophies').innerHTML = `<strong>本局 Boss 战利品</strong>${run.bossTrophies.map(trophy => `<span>✦ 第 ${trophy.wave} 波 · ${escapeHTML(trophy.name)}</span>`).join('')}`;
    }
    if (isResult) writeText('#run-result-copy', `人物 Lv.${run.level} · 击破 ${stats.kills} 个敌人 · 最高 ${stats.bestCombo} 连击 · 剩余 ${Math.floor(run.materials)} 加班费`);
    if (phaseChanged) { runOverlay.scrollTop = 0; $('#run-title').focus({ preventScroll: true }); }
  };
  runOverlay.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!target || target.disabled) return;
    if (target.dataset.bossReward && currentRun?.phase === 'reward') command({ type: 'run-boss-reward', id: target.dataset.bossReward });
    else if (target.dataset.upgrade && currentRun?.phase === 'upgrade') command({ type: 'run-upgrade', id: target.dataset.upgrade });
    else if (target.dataset.buy && currentRun?.phase === 'shop') {
      const offer = currentRun.shop.find(item => item.id === target.dataset.buy);
      if (offer) command({ type: 'run-buy', id: offer.id, ...(offer.kind === 'weapon' ? { slot: preferredSlot(offer) } : {}) });
    } else if (target.dataset.lock && currentRun?.phase === 'shop') command({ type: 'run-lock', id: target.dataset.lock });
    else if (target.dataset.combine !== undefined && currentRun?.phase === 'shop') command({ type: 'run-combine', slot: Number(target.dataset.combine), otherSlot: Number(target.dataset.otherSlot) });
    else if (target.dataset.sell !== undefined && currentRun?.phase === 'shop') command({ type: 'run-sell', slot: Number(target.dataset.sell) });
  });
  runOverlay.addEventListener('change', event => {
    const select = event.target as HTMLSelectElement;
    if (!select.dataset.shopSlot) return;
    shopSelections.set(select.dataset.shopSlot, Number(select.value));
    updateShopButtons();
  });
  // Preserve native scrolling/select behavior while avoiding combat keyboard shortcuts.
  runOverlay.addEventListener('keydown', event => { if (event.key !== 'Escape') event.stopPropagation(); });
  for (const type of ['pointerdown', 'pointerup', 'click']) runOverlay.addEventListener(type, event => event.stopPropagation());
  $('#upgrade-reroll').addEventListener('click', () => { if (currentRun?.phase === 'upgrade') command({ type: 'run-reroll-upgrades' }); });
  $('#shop-reroll').addEventListener('click', () => { if (currentRun?.phase === 'shop') command({ type: 'run-reroll-shop' }); });
  $('#run-next').addEventListener('click', () => { if (currentRun?.phase === 'shop') { command({ type: 'run-next' }); focusGame(); } });
  $('#run-restart').addEventListener('click', () => { shopSelections.clear(); command({ type: 'restart' }); focusGame(); });

  const avatarCanvas = $<HTMLCanvasElement>('#avatar-crop-preview');
  const avatarFile = $<HTMLInputElement>('#avatar-file');
  let avatarInitialized = false;
  let avatarBusy = false;
  let avatarSource: HTMLImageElement | null = null;
  let appliedAvatarPreview: HTMLCanvasElement | null = null;
  let avatarDataUrl: string | null = null;
  let avatarSent = false;
  let avatarStored = false;
  let avatarCrop: AvatarCropControls = { ...DEFAULT_AVATAR_CROP };
  let avatarGeneration = 0;
  let avatarAbort: AbortController | null = null;
  let expressionTimer: number | undefined;
  const avatarStatus = (message: string, warning = false) => {
    $('#avatar-status').textContent = message;
    $('#avatar-status').classList.toggle('is-warning', warning);
  };
  const sendAvatar = () => {
    if (!ready || !avatarInitialized || avatarSent) return;
    avatarSent = true;
    command({ type: 'avatar', dataUrl: avatarDataUrl });
  };
  const syncAvatarControls = () => {
    const blocked = running && !paused;
    $<HTMLFieldSetElement>('#avatar-controls').disabled = !avatarInitialized || blocked;
    $('#avatar-pause-hint').textContent = blocked ? '按 Esc 或点暂停，即可调整头像和预览表情。' : '选择照片，调整取景，再应用到角色。';
    $<HTMLButtonElement>('#avatar-apply').disabled = !avatarSource || avatarBusy;
    $<HTMLButtonElement>('#avatar-reset').disabled = !avatarDataUrl && !avatarSource && !avatarBusy && !avatarStored;
    for (const r of avatarRanges) {
      const input = $<HTMLInputElement>(`#avatar-${r.id}`);
      input.disabled = !avatarSource || avatarBusy;
      input.value = `${avatarCrop[r.id]}`;
      input.style.setProperty('--range-fill', `${(avatarCrop[r.id] - r.min) / (r.max - r.min) * 100}%`);
      $(`#avatar-value-${r.id}`).textContent = r.format(avatarCrop[r.id]);
    }
    app.querySelectorAll<HTMLButtonElement>('[data-avatar-expression]').forEach(el => { el.disabled = !ready; });
  };
  const snapshotAvatar = () => {
    const snapshot = document.createElement('canvas');
    snapshot.width = AVATAR_SIZE; snapshot.height = AVATAR_SIZE;
    const context = snapshot.getContext('2d');
    if (!context) throw new Error('当前浏览器无法处理头像，请尝试其他浏览器。');
    context.drawImage(avatarCanvas, 0, 0);
    return snapshot;
  };
  const showAppliedAvatar = () => {
    avatarCanvas.hidden = !appliedAvatarPreview;
    $('#avatar-default-preview').hidden = Boolean(appliedAvatarPreview);
    avatarCanvas.width = AVATAR_SIZE; avatarCanvas.height = AVATAR_SIZE;
    if (appliedAvatarPreview) avatarCanvas.getContext('2d')?.drawImage(appliedAvatarPreview, 0, 0);
    $('#avatar-file-name').textContent = avatarDataUrl ? '当前头像 · 重新选照片可裁切' : '默认头像';
  };
  const cancelAvatarRead = () => {
    avatarGeneration++;
    avatarAbort?.abort(); avatarAbort = null;
    if (avatarSource) avatarSource.src = '';
    avatarSource = null; avatarBusy = false;
  };
  const renderCrop = () => {
    if (!avatarSource) return;
    drawAvatarCrop(avatarCanvas, avatarSource, avatarCrop);
    avatarCanvas.hidden = false;
    $('#avatar-default-preview').hidden = true;
  };
  const readAvatarFile = async (file: File) => {
    cancelAvatarRead();
    const generation = avatarGeneration;
    const controller = new AbortController(); avatarAbort = controller;
    avatarBusy = true; avatarCrop = { ...DEFAULT_AVATAR_CROP };
    showAppliedAvatar(); syncAvatarControls();
    avatarStatus('正在本机读取照片…');
    try {
      const image = await loadAvatarFile(file, controller.signal);
      if (generation !== avatarGeneration || controller.signal.aborted) { image.src = ''; return; }
      avatarSource = image;
      renderCrop();
      $('#avatar-file-name').textContent = file.name;
      avatarStatus('调整缩放与取景，让脸位于圆圈中，再点“应用头像”。');
    } catch (error) {
      if (generation !== avatarGeneration || controller.signal.aborted) return;
      if (avatarSource) avatarSource.src = '';
      avatarSource = null; showAppliedAvatar();
      avatarStatus(error instanceof Error ? error.message : '照片读取失败，请换一张照片。', true);
    } finally {
      if (generation === avatarGeneration) { avatarBusy = false; avatarAbort = null; syncAvatarControls(); }
    }
  };
  $('#avatar-upload').addEventListener('click', () => avatarFile.click());
  avatarFile.addEventListener('change', () => {
    const file = avatarFile.files?.[0];
    avatarFile.value = '';
    if (file && avatarInitialized) void readAvatarFile(file);
  });
  for (const r of avatarRanges) $<HTMLInputElement>(`#avatar-${r.id}`).addEventListener('input', event => {
    avatarCrop[r.id] = Number((event.target as HTMLInputElement).value);
    try { renderCrop(); syncAvatarControls(); }
    catch (error) { avatarStatus(error instanceof Error ? error.message : '裁切预览失败，请重新选择照片。', true); }
  });
  for (const r of avatarRanges) $(`#avatar-${r.id}`).addEventListener('pointerup', () => requestAnimationFrame(focusGame));
  $('#avatar-apply').addEventListener('click', () => {
    if (!avatarSource || avatarBusy) return;
    try {
      renderCrop();
      const dataUrl = avatarCanvas.toDataURL('image/png');
      if (!isAvatarDataUrl(dataUrl)) throw new Error('头像处理失败，请降低缩放或换一张照片。');
      appliedAvatarPreview = snapshotAvatar();
      avatarDataUrl = dataUrl; avatarSent = false;
      sendAvatar();
      try { localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl); avatarStored = true; avatarStatus('三颗头已同步新头像并保存在本机。试试下面的五种表情。'); }
      catch { avatarStatus('头像已应用；浏览器未能保存，刷新后需要重新选择。', true); }
      syncAvatarControls();
    } catch (error) { avatarStatus(error instanceof Error ? error.message : '头像处理失败，请重新选择照片。', true); }
  });
  $('#avatar-reset').addEventListener('click', () => {
    cancelAvatarRead();
    avatarDataUrl = null; appliedAvatarPreview = null; avatarSent = false;
    avatarCrop = { ...DEFAULT_AVATAR_CROP };
    showAppliedAvatar(); syncAvatarControls(); sendAvatar();
    try { localStorage.removeItem(AVATAR_STORAGE_KEY); avatarStored = false; syncAvatarControls(); avatarStatus('已恢复默认打工人头像。'); }
    catch { avatarStatus('已恢复默认；本地记录未能清除，下次打开可能需要再次恢复。', true); }
  });
  app.querySelectorAll<HTMLButtonElement>('[data-avatar-expression]').forEach(el => el.addEventListener('click', () => {
    const expression = avatarExpressions.find(item => item.id === el.dataset.avatarExpression);
    if (!expression || !ready) return;
    command({ type: 'avatar-expression', expression: expression.id });
    window.clearTimeout(expressionTimer);
    $('#avatar-preview').dataset.expression = expression.id;
    $('#avatar-comic').textContent = expression.symbol;
    expressionTimer = window.setTimeout(() => { $('#avatar-preview').dataset.expression = 'neutral'; $('#avatar-comic').textContent = ''; }, 1600);
  }));
  // Restore once before enabling edits; this prevents a saved-image decode from
  // replacing a newer draft. Every later file selection cancels the previous one.
  const restoreAvatar = async () => {
    const controller = new AbortController(); avatarAbort = controller;
    try {
      let saved: string | null;
      try { saved = localStorage.getItem(AVATAR_STORAGE_KEY); }
      catch { avatarStatus('浏览器无法读取本机头像；仍可选择照片在本次使用。', true); return; }
      avatarStored = Boolean(saved);
      if (!saved) { avatarStatus('选一张照片，做今天的主角。'); return; }
      if (!isAvatarDataUrl(saved)) throw new Error('保存的头像已失效，本次使用默认角色，请重新选择照片。');
      const image = await loadSavedAvatar(saved, controller.signal);
      if (controller.signal.aborted) { image.src = ''; return; }
      drawAvatarCrop(avatarCanvas, image, DEFAULT_AVATAR_CROP);
      image.src = '';
      appliedAvatarPreview = snapshotAvatar(); avatarDataUrl = saved;
      showAppliedAvatar();
      avatarStatus('已恢复本机头像；重新选择照片可调整裁切。');
    } catch (error) {
      if (!controller.signal.aborted) avatarStatus(error instanceof Error ? error.message : '保存的头像无法读取，请重新选择照片。', true);
    } finally {
      avatarAbort = null; avatarInitialized = true; syncAvatarControls(); sendAvatar();
    }
  };
  void restoreAvatar();
  window.addEventListener('pagehide', () => {
    cancelAvatarRead(); window.clearTimeout(expressionTimer);
    $('#avatar-preview').dataset.expression = 'neutral'; $('#avatar-comic').textContent = '';
    showAppliedAvatar(); syncAvatarControls();
  });

  window.addEventListener('lab:settings', event => {
    if (!sentInitialSettings) return;
    settings = { ...(event as CustomEvent<Settings>).detail }; syncSettings(); persist();
  });
  window.addEventListener('lab:stats', event => {
    const stats = (event as CustomEvent<Stats>).detail;
    ready = stats.ready;
    running = stats.running;
    paused = stats.paused;
    pressureTier = stats.pressureTier;
    currentRun = stats.run ?? null;
    syncPressure();
    syncAvatarControls(); sendAvatar();
    syncLoadoutControls(); syncWeaponStats(stats.weapons);
    syncRun(stats);
    if (ready && !sentInitialLoadout) { sentInitialLoadout = true; command({ type: 'loadout', weapons: loadout.map(entry => ({ ...entry })) }); }
    if (ready && !sentInitialSettings) { sentInitialSettings = true; command({ type: 'settings', settings }); }
    const lockPending = stats.pointerLock === 'pending';
    const lockError = stats.pointerLock === 'error';
    const lockUnsupported = stats.pointerLock === 'unsupported';
    const runIntermission = Boolean(currentRun && currentRun.phase !== 'combat');
    $('#start-overlay').hidden = running || Boolean(currentRun);
    $('#pause-overlay').hidden = !running || !paused || runIntermission;
    $('#pause-overlay').classList.toggle('lock-problem', lockError || lockUnsupported);
    $('#pause-title').textContent = lockPending ? '正在锁定鼠标…' : lockError ? '鼠标锁定未完成。' : lockUnsupported ? '使用备用操作。' : '休息一下。';
    const pauseDescription = lockError
      ? `${stats.pointerLockMessage || '浏览器未允许本次鼠标锁定。'}\n点击“继续战斗”重新尝试。`
      : lockUnsupported
        ? '当前浏览器不支持鼠标锁定，可用 WASD / 方向键或触屏继续。'
        : lockPending ? '请完成浏览器的鼠标锁定提示。' : DEFAULT_PAUSE_GUIDE;
    if ($('#pause-description').textContent !== pauseDescription) $('#pause-description').textContent = pauseDescription;
    $('#resume-label').textContent = lockPending ? '正在锁定…' : '继续战斗';
    $<HTMLButtonElement>('#resume-button').disabled = !ready || lockPending;
    $('#pause-note').textContent = lockPending ? '等待浏览器确认' : lockError ? '当前鼠标已释放 · 点击继续重试' : lockUnsupported ? '点击继续 · WASD / 方向键 / 触屏移动' : '点击继续战斗';
    $('#pointer-guide-copy').textContent = lockUnsupported ? 'WASD / 方向键移动 · 鼠标锁定不可用' : '鼠标 / 触摸板锁定移动 · 停手即停';
    $('#desktop-move-hint').textContent = stats.pointerLock === 'locked'
      ? '自动攻击 · Esc 暂停释放'
      : lockUnsupported ? 'WASD / 方向键移动 · Esc 暂停' : '开始后锁定鼠标 · Esc 暂停释放';
    const ended = !currentRun && !running && stats.hp <= 0 && stats.deaths > 0;
    if (ended !== showingEnd) {
      showingEnd = ended;
      $('.start-card h1').innerHTML = ended ? '这一轮，打得痛快。<br><em>再试一种节奏。</em>' : '工作先放一边。<br><em>现在，轮到你出手。</em>';
      if (ended) $('.start-card p').textContent = `本轮击破 ${stats.kills} 个目标，最高 ${stats.bestCombo} 连击。可以调整参数，再来一轮。`;
      else $('.start-card p').innerHTML = START_GUIDE;
    }
    $('#start-label').textContent = ready ? ended ? '再试一次' : settings.mode === 'dummy' ? '进入固定靶场' : '开始下班生存战' : '正在准备…';
    for (const id of ['start-button', 'pause-button', 'restart-button']) $<HTMLButtonElement>(`#${id}`).disabled = !ready;
    $<HTMLButtonElement>('#pause-button').disabled = !ready || runIntermission;
    $('#arena-status').textContent = runIntermission ? currentRun?.phase === 'reward' ? 'Boss 战利品' : currentRun?.phase === 'upgrade' ? '升级选择' : currentRun?.phase === 'shop' ? '波间商店' : '本局结束' : !ready ? '正在准备试验场' : lockPending ? '正在锁定鼠标' : lockError ? '鼠标锁定未完成' : !running ? '准备就绪' : paused ? '暂停中' : '试炼进行中';
    $('#arena-dot').classList.toggle('is-paused', paused || !running);
    const pauseButton = $('#pause-button');
    const showPause = running && !paused;
    if (pauseButton.dataset.icon !== String(showPause)) { pauseButton.innerHTML = icon(showPause ? 'pause' : 'play'); pauseButton.dataset.icon = String(showPause); }
    pauseButton.setAttribute('aria-label', showPause ? '暂停战斗' : running ? '继续战斗' : '开始战斗');
    $('#hp-value').textContent = `${Math.ceil(stats.hp)} / ${stats.maxHp}`;
    $('#hp-fill').style.width = `${Math.max(0, Math.min(100, stats.hp / Math.max(1, stats.maxHp) * 100))}%`;
    $('#hp-fill').classList.toggle('low-hp', stats.hp / stats.maxHp < .3);
    $('#kills-value').textContent = `${stats.kills}`.padStart(3, '0');
    $('#combo-value').textContent = `${stats.combo}`;
    $('.combo-stat').classList.toggle('combo-active', stats.combo >= 5);
    $('#best-combo').textContent = `BEST ${stats.bestCombo}`;
    $('#time-value').textContent = `${Math.floor(stats.elapsed / 60)}`.padStart(2, '0') + ':' + `${Math.floor(stats.elapsed % 60)}`.padStart(2, '0');
    $('#enemy-value').textContent = `${stats.enemyCount}`;
    $('#fps-value').textContent = stats.fps > 0 ? `${Math.round(stats.fps)}` : '—';
    $('#p95-value').textContent = stats.frameP95 > 0 ? stats.frameP95.toFixed(1) : '—';
    $('#renderer-value').textContent = stats.renderer || 'WEBGL';
    $('#weapon-status').textContent = `六臂 · ${displayedWeapons.filter(weapon => weapon.equipped).length}/6`;
  });

}
