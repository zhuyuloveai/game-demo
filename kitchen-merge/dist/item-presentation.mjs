import { definition, sourceRules, producerStatus } from './engine.mjs';

// Presentation only: derive availability without advancing clocks or changing saves.
export function itemPresentation(state, item, index, now = state.lastNow) {
  const quiet = { cue: '', ready: false, idle: false, label: '' };
  if (!item || state.locked.includes(index)) return quiet;
  if (item.family === 'bubble') return { ...quiet, cue: 'inspect', label: '点击查看泡泡' };
  const rules = sourceRules(item), d = definition(item);
  const room = state.board.some((value, i) => !value && !state.locked.includes(i));
  const cue = (kind, label, ready = true) => ({ cue: kind, label, ready, idle: ready });
  if (rules.manual) {
    const status = producerStatus(state, item, now);
    if (!status.ready) return cue('wait', '补货中', false);
    if (!room) return cue('produce', '台面已满，先腾出空格', false);
    if (now >= state.infiniteUntil && state.energy < rules.manual.energyPerTap)
      return cue('produce', '体力不足，先补充体力', false);
    return cue('produce', rules.manual.mode === 'recharge' ? '点击生产' : '可生产，点选后点「生产」');
  }
  if (rules.auto || rules.delay) return { ...quiet, label: '自动产出中' };
  if (['blackbag', 'pinkbag'].includes(item.family)) {
    if (item.openedAt === null) return cue('open', '可开启，点选后点「使用 / 领取」');
    if (producerStatus(state, item, now).timerRemaining > 0) return cue('wait', '开锁中', false);
    return cue('collect', room ? '可取物，点选后点「使用 / 领取」' : '台面已满，先腾出空格', room);
  }
  if (['tipjar', 'energybox'].includes(item.family))
    return cue('collect', room ? '可取物，点选后点「使用 / 领取」' : '台面已满，先腾出空格', room);
  if (['energy', 'coins', 'gems'].includes(d?.valueUnit) || ['chest', 'legacy_chest'].includes(item.family))
    return cue('collect', '可领取，点选后点「使用 / 领取」');
  if (['splitter', 'charge', 'stopwatch', 'upgrade', 'infinite', 'timeskip', 'backpack'].includes(item.family))
    return cue('use', '可使用，点选后点「使用 / 领取」');
  return { ...quiet, idle: true };
}

const paths = {
  produce: '<path class="cue-bolt-rim" d="M13 2 5 12h6l-2 9 10-12h-7z"/><path class="cue-bolt" d="M13 2 5 12h6l-2 9 10-12h-7z"/><path class="cue-bolt-light" d="m12 5-4 6h4"/>',
  collect: '<circle cx="12" cy="12" r="9"/><path d="M12 6v10m-4-4 4 4 4-4"/>',
  open: '<circle cx="12" cy="12" r="9"/><path d="M8 11V9a4 4 0 0 1 8 0m-9 2h10v7H7z"/>',
  use: '<circle cx="12" cy="12" r="9"/><path d="m12 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>',
  wait: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  inspect: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10v.1"/>',
};
export function itemCueMarkup(view) {
  if (!paths[view.cue]) return '';
  return `<span class="item-cue cue-${view.cue} ${view.ready ? 'cue-ready' : 'cue-quiet'}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${paths[view.cue]}</svg></span>`;
}
