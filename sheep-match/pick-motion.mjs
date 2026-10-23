// Present committed picks in order while allowing the board to accept more input.
// Game state is saved immediately; this queue owns only the visual rack.
export function createPickMotion({ rack = [], paint, fly, settled, idle,
  now = () => performance.now(), later = setTimeout, cancel = clearTimeout }) {
  let visible = [...rack], availableAt = 0, pending = 0;
  const timers = new Set(), flights = new Set();
  function schedule(callback, delay) {
    const timer = later(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer);
  }
  function reset(rack) {
    for (const timer of timers) cancel(timer);
    for (const remove of flights) remove();
    timers.clear(); flights.clear(); pending = 0; availableAt = 0;
    visible = [...rack];
  }
  return {
    get rack() { return visible; },
    get pending() { return pending; },
    reset,
    enqueue({ before, after, tile, matched, from, cue, duration = 560 }) {
      const lastSame = before.findLastIndex(item => item.type === tile.type);
      const index = lastSame < 0 ? before.length : lastSame + 1;
      const landed = [...before]; landed.splice(index, 0, tile);
      const start = now(), arrival = Math.max(start + duration, availableAt);
      const hold = matched ? 110 : 0;
      availableAt = arrival + hold + 35;
      pending++;
      const remove = fly({tile, from, index, duration:arrival - start});
      flights.add(remove);
      schedule(() => {
        remove(); flights.delete(remove);
        visible = landed; paint(visible);
        const finish = () => {
          visible = [...after]; paint(visible); settled({tile, matched, cue});
          if (--pending === 0) { availableAt = 0; idle(); }
        };
        if (hold) schedule(finish, hold);
        else finish();
      }, arrival - start);
    },
  };
}
