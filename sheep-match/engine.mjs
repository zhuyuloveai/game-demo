import {farmStageConfig} from './farm-stage-data.mjs';
export const VERSION = 3;
const LEGACY_LEVELS = [
  { name: '初到牧场', subtitle: '先来一场轻松的热身', count: 18, kinds: 4, maxOpen: 2, layers: [[4,4,12],[3,3,6]] },
  { name: '草地迷踪', subtitle: '草丛深处，藏着一点小心机', count: 72, kinds: 8, maxOpen: 3, layers: [[6,6,28],[6,5,22],[5,4,16],[4,3,6]] },
  { name: '羊群挑战', subtitle: '每一步，都要多想一层', count: 144, kinds: 12, maxOpen: 3, layers: [[6,6,32],[6,6,29],[6,5,25],[5,5,21],[5,4,16],[4,4,12],[4,3,6],[3,2,3]] },
];

export function validLevel(level) { return Number.isSafeInteger(level) && level >= 0 && level < Number.MAX_SAFE_INTEGER; }

// No finite level list: early levels rise steadily, then logarithmic growth
// continues while keeping even very distant stages practical to generate.
export function getLevelConfig(level) {
  if (!validLevel(level)) throw new RangeError('Invalid level');
  const growth = 2 * Math.min(level, 5) + 4 * Math.log2(1 + Math.max(0, level - 5) / 4);
  const count = 18 + 6 * Math.floor(growth);
  const depth = Math.max(2, Math.ceil((count + 18) / 30));
  const sizes = Array(depth).fill(6);
  let left = count - depth * 6;
  // Fill the bottom more densely, with a smaller, irregular top layer.
  while (left) {
    for (let i = 0; i < depth && left; i++) {
      const take = Math.min(depth - i, 32 - sizes[i], left);
      sizes[i] += take; left -= take;
    }
  }
  const layers = sizes.map(n => {
    const width = n <= 12 ? 4 : 6;
    return [width, Math.min(6, Math.max(3, Math.ceil(n / width) + 1)), n];
  });
  const names = ['初到牧场','草地漫步','林间迷踪','山野寻羊','云端牧场'];
  return { name: names[Math.min(4, Math.floor(level / 5))], subtitle: `第 ${level + 1} 关，新的草地正在等你`,
    count, kinds: Math.min(12, 4 + Math.floor((level + 1) / 2)), maxOpen: level < 3 ? 2 : 3,
    openChance: .3 + .4 * level / (level + 12), layers };
}

export function getGameConfig(game) {
  if (game.rules === 'farm-v1') return farmStageConfig(game.level);
  return game.rules === 'legacy-three' || game.version < 3 ? LEGACY_LEVELS[game.level] : getLevelConfig(game.level);
}

export function random(seed) {
  let n = 2166136261;
  for (const char of String(seed)) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return () => {
    n += 0x6D2B79F5;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(items, rng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function legacyLayout(level) {
  const layers = level === 0 ? [[4,3],[3,2]] : level === 1
    ? [[6,5],[5,4],[4,4],[3,2]]
    : [[6,6],[6,5],[5,5],[5,4],[4,4],[4,3],[3,1],[2,1]];
  const tiles = [];
  layers.forEach(([w,h], z) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      tiles.push({ id: tiles.length, x: (7 - w) / 2 + x, y: (6.5 - h) / 2 + y, z, type: 0 });
    }
  });
  return tiles;
}
export function isFree(tile, board) {
  return !board.some(other => other.z > tile.z && Math.abs(other.x - tile.x) < .94 && Math.abs(other.y - tile.y) < .94);
}
export function freeTiles(board) { return board.filter(tile => isFree(tile, board)); }

// Grow a different connected shape on each staggered grid. Upper tiles must
// overlap the previous layer; cells in the same layer never overlap each other.
function randomLayout(config, rng) {
  const board = [];
  let previous = [];
  for (const [z, [width, height, count]] of config.layers.entries()) {
    const offsetX = (7 - width) / 2 + (Math.floor(rng() * 3) - 1) * .25;
    const offsetY = (6.5 - height) / 2 + (Math.floor(rng() * 3) - 1) * .25;
    const pool = [];
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
      const tile = { x: offsetX + col, y: offsetY + row, z };
      if (!z || previous.some(t => Math.abs(t.x - tile.x) < .94 && Math.abs(t.y - tile.y) < .94)) pool.push(tile);
    }
    if (pool.length < count) return null;
    const layer = [];
    while (layer.length < count) {
      const frontier = pool.filter(t => !layer.length || layer.some(other => Math.abs(t.x - other.x) + Math.abs(t.y - other.y) === 1));
      if (!frontier.length) return null;
      const tile = frontier[Math.floor(rng() * frontier.length)];
      pool.splice(pool.indexOf(tile), 1);
      layer.push(tile);
    }
    for (const tile of layer) board.push({ ...tile, id: board.length, type: 0 });
    previous = layer;
  }
  return board;
}

// A bounded search returns 'unknown' on budget exhaustion, never 'solvable'.
// The remaining mask determines rack counts modulo three, so it is a complete
// memoization key for a fresh board. Equivalent free tiles share one branch.
export function solveBoard(board, { maxNodes = 2500 } = {}) {
  const n = board.length, counts = new Uint8Array(12), totals = new Uint16Array(12);
  if (n % 3 || n > 1536 || board.some(t => !Number.isInteger(t.type) || t.type < 0 || t.type >= 12)) return { status: 'unsolvable', solution: [], nodes: 0 };
  board.forEach(t => totals[t.type]++);
  if ([...totals].some(count => count % 3)) return { status: 'unsolvable', solution: [], nodes: 0 };
  const bits = board.map((_,i) => 1n << BigInt(i));
  const covers = board.map(tile => board.reduce((mask, other, j) =>
    other.z > tile.z && Math.abs(other.x - tile.x) < .94 && Math.abs(other.y - tile.y) < .94 ? mask | bits[j] : mask, 0n));
  const reveals = board.map((_,i) => covers.reduce((mask, blockers, j) => blockers & bits[i] ? mask | bits[j] : mask, 0n));
  const seen = new Set(), route = [];
  let nodes = 0, exhausted = false;
  function search(remaining, slots) {
    if (!remaining) return slots === 0;
    if (nodes >= maxNodes) { exhausted = true; return false; }
    nodes++;
    if (seen.has(remaining)) return false;
    const options = [], equivalent = new Set();
    for (let i = 0; i < n; i++) {
      if (!(remaining & bits[i]) || (remaining & covers[i])) continue;
      const type = board[i].type, held = counts[type];
      if (held !== 2 && slots === 6) continue;
      const key = `${type}:${remaining & reveals[i]}`;
      if (equivalent.has(key)) continue;
      equivalent.add(key);
      options.push({ i, type, priority: held * 100 + (reveals[i] & remaining ? 1 : 0) });
    }
    options.sort((a,b) => b.priority - a.priority);
    for (const { i, type } of options) {
      const held = counts[type];
      counts[type] = (held + 1) % 3;
      route.push(board[i].id);
      if (search(remaining ^ bits[i], slots + (held === 2 ? -2 : 1))) return true;
      route.pop(); counts[type] = held;
      if (exhausted) return false;
    }
    seen.add(remaining);
    return false;
  }
  const solved = search((1n << BigInt(n)) - 1n, 0);
  return { status: solved ? 'solvable' : exhausted ? 'unknown' : 'unsolvable', solution: solved ? route : [], nodes };
}

export function verifySolution(board, route) {
  if (!Array.isArray(route) || route.length !== board.length || new Set(route).size !== route.length) return false;
  let remaining = [...board], rack = [];
  for (const id of route) {
    const tile = remaining.find(t => t.id === id);
    if (!tile || !isFree(tile, remaining)) return false;
    remaining = remaining.filter(t => t.id !== id);
    rack.push(tile.type);
    if (rack.filter(type => type === tile.type).length === 3) rack = rack.filter(type => type !== tile.type);
    if (rack.length >= 7) return false;
  }
  return remaining.length === 0 && rack.length === 0;
}

// After bounded random searches, build another random map with a certified
// route. This keeps high-level generation finite even on a slow phone.
function assignWithRoute(board, config, rng) {
  let remaining = [...board];
  const solution = [];
  while (remaining.length) {
    const available = freeTiles(remaining);
    const tile = available[Math.floor(rng() * available.length)];
    solution.push(tile.id);
    remaining = remaining.filter(t => t.id !== tile.id);
  }
  const groups = Array.from({ length: config.count / 3 }, (_,i) => i % config.kinds);
  const open = [];
  for (const id of solution) {
    const options = groups.filter(type => !open.some(g => g.type === type));
    if (options.length && (!open.length || (open.length < config.maxOpen && rng() < config.openChance))) {
      const type = options[Math.floor(rng() * options.length)];
      open.push({ type, left: 3 });
      groups.splice(groups.indexOf(type), 1);
    }
    const group = open[Math.floor(rng() * open.length)];
    board[id].type = group.type;
    if (--group.left === 0) open.splice(open.indexOf(group), 1);
  }
  return solution;
}

export function createGame(level = 0, seed = Date.now(), mode = 'classic', { maxNodes = 2500, randomAttempts = 4 } = {}) {
  const rng = random(seed), config = mode === 'farm' ? farmStageConfig(level) : getLevelConfig(level);
  let board, solution, rejected = 0, nodes = 0, method;
  // Geometry growth also has a finite retry limit; invalid candidates never
  // become playable boards. Search and verification consume no RNG state.
  for (let attempt = 0; attempt < 64; attempt++) {
    board = randomLayout(config, rng);
    if (!board) { rejected++; continue; }
    if (attempt < randomAttempts) {
      const faces = shuffled(Array.from({ length: config.count }, (_,i) => Math.floor(i / 3) % config.kinds), rng);
      board.forEach((tile,i) => { tile.type = faces[i]; });
      const result = solveBoard(board, { maxNodes });
      nodes += result.nodes; solution = result.solution; method = 'search';
    } else {
      solution = assignWithRoute(board, config, rng); method = 'verified-construction';
    }
    if (verifySolution(board, solution)) {
      return { version: VERSION, rules: mode === 'farm' ? 'farm-v1' : 'endless-v1', level, seed, mode, board, geometry: board.map(({ id,x,y,z }) => ({ id,x,y,z })),
        rack: [], reserve: [], matched: 0, total: board.length, status: 'playing',
        tools: { undo: 3, shuffle: 2, stash: 1 }, history: [], solution, elapsed: 0, started: false,
        generation: { attempts: attempt + 1, rejected, nodes, method } };
    }
    rejected++;
  }
  throw new Error('Could not generate a verified board; please try again.');
}
const clone = value => JSON.parse(JSON.stringify(value));
function snapshot(game) {
  return clone({ board: game.board, rack: game.rack, reserve: game.reserve, matched: game.matched, status: game.status });
}
function remember(game) { game.history.push(snapshot(game)); game.history = game.history.slice(-3); }
function settle(game, tile) {
  const lastSame = game.rack.findLastIndex(t => t.type === tile.type);
  game.rack.splice(lastSame < 0 ? game.rack.length : lastSame + 1, 0, tile);
  const matched = game.rack.filter(t => t.type === tile.type);
  if (matched.length === 3) {
    game.rack = game.rack.filter(t => t.type !== tile.type);
    game.matched += 3;
  }
  game.started = true;
  if (game.board.length + game.rack.length + game.reserve.length === 0) game.status = 'won';
  else if (game.rack.length >= 7) game.status = 'lost';
  return { ok: true, matched: matched.length === 3, tile };
}
export function pick(game, id, fromReserve = false) {
  if (game.status !== 'playing') return { ok: false, reason: 'finished' };
  const source = fromReserve ? game.reserve : game.board;
  const tile = source.find(t => t.id === id);
  if (!tile || (!fromReserve && !isFree(tile, game.board))) return { ok: false, reason: 'covered' };
  remember(game);
  source.splice(source.indexOf(tile), 1);
  return settle(game, tile);
}
export function undo(game) {
  if (!game.tools.undo || !game.history.length || game.status === 'won') return false;
  Object.assign(game, game.history.pop());
  game.tools.undo--;
  return true;
}
export function stash(game) {
  if (game.status === 'won' || !game.tools.stash || !game.rack.length || game.reserve.length) return false;
  game.reserve.push(...game.rack.splice(0, 3));
  game.tools.stash--;
  game.status = 'playing';
  game.history = [];
  return true;
}
export function shuffle(game, seed = Date.now()) {
  if (game.status !== 'playing' || !game.tools.shuffle || game.board.length < 2) return false;
  const faces = shuffled(game.board.map(t => t.type), random(seed));
  game.board.forEach((tile, index) => { tile.type = faces[index]; });
  game.tools.shuffle--;
  game.history = [];
  game.solution = [];
  return true;
}

export function restore(raw) {
  try {
    const game = typeof raw === 'string' ? JSON.parse(raw) : clone(raw);
    if (![1, 2, VERSION].includes(game.version) || !validLevel(game.level)) return null;
    if (game.version < 3) game.rules = 'legacy-three';
    if (!['legacy-three', 'endless-v1', 'farm-v1'].includes(game.rules)) return null;
    const config = getGameConfig(game);
    if (!config) return null;
    if ((game.rules === 'farm-v1') !== (game.mode === 'farm')) return null;
    if (!['classic','daily','farm'].includes(game.mode) || !['playing','lost','won'].includes(game.status)) return null;
    if (!Array.isArray(game.board) || !Array.isArray(game.rack) || !Array.isArray(game.reserve)) return null;
    const tiles = [...game.board, ...game.rack, ...game.reserve];
    const geometry = game.version === 1 ? legacyLayout(game.level).map(({id,x,y,z}) => ({id,x,y,z})) : game.geometry;
    if (!Array.isArray(geometry) || geometry.length !== config.count) return null;
    if (geometry.some((t,i) => !t || t.id !== i || !Number.isFinite(t.x) || !Number.isFinite(t.y) || t.x < 0 || t.x > 6.06 || t.y < 0 || t.y > 5.56 || !Number.isInteger(t.z) || t.z < 0 || t.z >= config.layers.length)) return null;
    if (geometry.some((tile,i) => geometry.slice(i + 1).some(other => tile.z === other.z && Math.abs(tile.x - other.x) < .94 && Math.abs(tile.y - other.y) < .94))) return null;
    game.version = VERSION; game.geometry = geometry;
    if (tiles.some(t => !Number.isInteger(t.id) || !geometry[t.id] || t.x !== geometry[t.id].x || t.y !== geometry[t.id].y || t.z !== geometry[t.id].z || !Number.isInteger(t.type) || t.type < 0 || t.type >= config.kinds)) return null;
    if (new Set(tiles.map(t => t.id)).size !== tiles.length) return null;
    if (game.total !== config.count || !Number.isInteger(game.matched) || game.matched < 0 || game.matched % 3 || tiles.length + game.matched !== game.total) return null;
    if (game.rack.length > 7 || game.reserve.length > 3 || !game.tools || Object.entries({ undo:3, shuffle:2, stash:1 }).some(([k,max]) => !Number.isInteger(game.tools[k]) || game.tools[k] < 0 || game.tools[k] > max)) return null;
    for (let type = 0; type < config.kinds; type++) if (tiles.filter(t => t.type === type).length % 3) return null;
    if (game.status === 'won' ? tiles.length !== 0 : game.status === 'lost' ? game.rack.length !== 7 : game.rack.length >= 7 || tiles.length === 0) return null;
    if (!Number.isFinite(game.elapsed) || game.elapsed < 0) return null;
    // History is optional; validate snapshots as complete positions before use.
    game.history = (Array.isArray(game.history) ? game.history.slice(-3) : []).filter(h => h && restore({ ...game, ...h, history: [] }));
    game.solution = [];
    return game;
  } catch { return null; }
}
