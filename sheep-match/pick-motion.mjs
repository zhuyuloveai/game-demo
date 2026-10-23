// Present committed picks in order while allowing the board to accept more input.
// Game state is saved immediately; this queue owns only the visual rack.
export function createPickMotion({ rack = [], paint, fly, settled, idle, onMatch = () => {},
  now = () => performance.now(), later = setTimeout, cancel = clearTimeout }) {
  let visible = [...rack], availableAt = 0, pending = 0, clearing = null;
  const timers = new Set(), flights = new Set();
  function schedule(callback, delay) {
    const timer = later(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer);
  }
  function reset(rack) {
    for (const timer of timers) cancel(timer);
    for (const remove of flights) remove();
    timers.clear(); flights.clear(); pending = 0; availableAt = 0; clearing = null;
    visible = [...rack];
  }
  return {
    get rack() { return visible; },
    get pending() { return pending; },
    get clearing() { return clearing; },
    reset,
    enqueue({ before, after, tile, matched, from, cue, duration = 560 }) {
      const lastSame = before.findLastIndex(item => item.type === tile.type);
      const index = lastSame < 0 ? before.length : lastSame + 1;
      const landed = [...before]; landed.splice(index, 0, tile);
      const start = now(), arrival = Math.max(start + duration, availableAt);
      const hold = matched ? 320 : 0;
      availableAt = arrival + hold + 35;
      pending++;
      const remove = fly({tile, from, index, duration:arrival - start});
      flights.add(remove);
      schedule(() => {
        remove(); flights.delete(remove);
        clearing = matched ? {ids:landed.filter(item => item.type === tile.type).map(item => item.id), startedAt:now(), duration:hold} : null;
        visible = landed; paint(visible, clearing);
        if (matched) onMatch();
        const finish = () => {
          clearing = null;
          visible = [...after]; paint(visible, clearing); settled({tile, matched, cue});
          if (--pending === 0) { availableAt = 0; idle(); }
        };
        if (hold) schedule(finish, hold);
        else finish();
      }, arrival - start);
    },
  };
}
