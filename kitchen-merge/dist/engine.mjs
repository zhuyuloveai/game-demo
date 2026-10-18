import {
  BALANCE,
  BALANCE_VERSION,
  CHAINS,
  ITEMS,
  FAMILY_META,
  PRODUCER_DEFS,
  RENOVATIONS,
  CHAPTERS,
  SHOP_ITEMS,
  RECIPES,
  itemKey,
  definition,
  sourceRules,
  isSource,
  isPermanent,
  sourceDescription,
} from "./catalog.mjs";
import { createGame as restoreV2 } from "./legacy-engine.mjs";
export {
  BALANCE,
  BALANCE_VERSION,
  CHAINS,
  ITEMS,
  FAMILY_META,
  PRODUCER_DEFS,
  RENOVATIONS,
  CHAPTERS,
  SHOP_ITEMS,
  RECIPES,
  itemKey,
  definition,
  sourceRules,
  isSource,
  isPermanent,
  sourceDescription,
};
export const BOARD_COLS = BALANCE.globals.boardCols,
  BOARD_ROWS = BALANCE.globals.boardRows,
  BOARD_SIZE = BOARD_COLS * BOARD_ROWS,
  ENERGY_INTERVAL = 120000,
  MAX_ENERGY = 100;
const clone = (x) => structuredClone(x),
  safeNow = (n) => (Number.isFinite(n) && n >= 0 ? Math.floor(n) : Date.now());
const free = (s) => s.board.findIndex((x, i) => !x && !s.locked.includes(i));
const unlocked = (s, i) =>
  Number.isInteger(i) && i >= 0 && i < BOARD_SIZE && !s.locked.includes(i);
const adj = (i) =>
  [
    i - BOARD_COLS,
    i + BOARD_COLS,
    ...(i % BOARD_COLS ? [i - 1] : []),
    ...(i % BOARD_COLS < BOARD_COLS - 1 ? [i + 1] : []),
  ].filter((j) => j >= 0 && j < BOARD_SIZE);
const name = (x) => definition(x)?.name || "物品";
const all = (s) => [...s.board, ...s.inventory, ...s.pending].filter(Boolean);
export const chinaDate = (n) =>
  new Date(n + 28800000).toISOString().slice(0, 10);
export function weekKey(n) {
  const d = new Date(n + 28800000);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function random(s) {
  let n = s.rng >>> 0;
  n ^= n << 13;
  n ^= n >>> 17;
  n ^= n << 5;
  s.rng = n >>> 0;
  return s.rng / 4294967296;
}
function choose(s, rows) {
  const total = rows.reduce((a, b) => a + b.prob, 0);
  let r = random(s) * total;
  for (const row of rows) {
    r -= row.prob;
    if (r < 0) return row;
  }
  return rows.at(-1);
}
const levelRoll = (s, probs) =>
  choose(
    s,
    probs.map((prob, i) => ({ prob, level: i + 1 })),
  ).level;
function result(s, ok, type, message, extra = {}) {
  return { state: s, ok, type, message, ...extra };
}
function finish(s, type, message, extra = {}) {
  s.transactionSerial++;
  s.events.push({
    tx: s.transactionSerial,
    type,
    at: s.lastNow,
    balanceVersion: BALANCE_VERSION,
    item: extra.item ? itemKey(extra.item) : null,
    energy: s.energy,
    coins: s.coins,
    free: s.board.filter((x, i) => !x && unlocked(s, i)).length,
  });
  if (s.events.length > 300) s.events.shift();
  return result(s, true, type, message, extra);
}
const fail = (s, type, message) => result(s, false, type, message);
function add(s, key, value) {
  const cap = key === "energy" ? 999 : key === "storageSlots" ? 60 : 1e9,
    field = key === "storageSlots" ? "storageCapacity" : key;
  const available = Math.max(0, cap - s[field]),
    amount = Math.min(value, available);
  s[field] += amount;
  s.credits[key] = (s.credits[key] || 0) + value - amount;
}
export function claimCredits(s) {
  let amount = 0;
  for (const [key, value] of Object.entries(s.credits)) {
    if (key === "storageSlots") continue;
    const field = key,
      cap = key === "energy" ? 999 : 1e9;
    const take = Math.min(value, Math.max(0, cap - s[field]));
    s[field] += take;
    s.credits[key] -= take;
    amount += take;
  }
  return amount
    ? finish(s, "credit", "待领额度已到账")
    : fail(s, "full", "当前余额已满，额度会继续保留");
}
export function getLevel(s) {
  let l = 1;
  while (l < 100 && s.xp >= 100 * l + 10 * l * (l - 1)) l++;
  return l;
}
export const levelFloor = (l) => 100 * (l - 1) + 10 * (l - 1) * (l - 2);
function reward(s, rows, now) {
  for (const row of rows || []) {
    if (row.item)
      for (let n = 0; n < (row.count || 1); n++)
        s.pending.push(
          makeItem(s, row.item, now, { location: "pending", discover: false }),
        );
    else if (row.resource) add(s, row.resource, row.amount);
  }
}
function grant(s, key, rows, now) {
  if (s.claimed[key]) return false;
  s.claimed[key] = true;
  reward(s, rows, now);
  return true;
}
function xp(s, n, now) {
  s.xp += n;
  const level = getLevel(s);
  for (const r of BALANCE.levelRewards)
    if (r.level > s.levelRewardClaimedThrough && r.level <= level)
      grant(s, `level:${r.level}`, r.rewards, now);
  s.levelRewardClaimedThrough = Math.max(level, s.levelRewardClaimedThrough);
}
function discover(s, item, now) {
  const id = itemKey(item);
  if (!s.discovered.includes(id)) {
    s.discovered.push(id);
    if (definition(item).kind !== "legacy") xp(s, 1, now);
  }
}
export function makeItem(
  s,
  id,
  now = s.lastNow,
  { location = "board", full = true, discover: seen = true } = {},
) {
  const d = ITEMS[id];
  if (!d) throw Error(`Unknown item ${id}`);
  const r = sourceRules(d),
    m = r.manual;
  const item = {
    id: `item-${s.nextItemId++}`,
    instanceId: null,
    itemId: id,
    family: d.family,
    level: d.level,
    createdAt: now,
    location,
    stock: m?.mode === "recharge" ? (full ? m.maxStock : 0) : null,
    stockOverflow: 0,
    rechargeRemaining: m?.mode === "recharge" ? m.rechargeSeconds * 1000 : null,
    nextRechargeAt: null,
    autoBuffer: 0,
    autoRemaining: r.auto ? r.auto.intervalSeconds * 1000 : null,
    remainingDraws:
      m?.draws ??
      m?.sequence?.length ??
      (["blackbag", "pinkbag", "tipjar", "energybox"].includes(d.family)
        ? d.value
        : null),
    sequenceIndex: 0,
    openedAt: null,
    timerRemaining: r.delay ? r.delay.delaySeconds * 1000 : null,
    protected: isPermanent(d),
    sourceVersion: BALANCE_VERSION,
    timeCredit: 0,
    clockAt: now,
  };
  item.instanceId = item.id;
  if (r.delay && location === "board") item.openedAt = now;
  if (seen) discover(s, item, now);
  return item;
}
function base(now) {
  return {
    version: 4,
    balanceVersion: BALANCE_VERSION,
    board: Array(BOARD_SIZE).fill(null),
    inventory: [],
    pending: [],
    locked: [],
    coins: 120,
    gems: 20,
    energy: 100,
    maxEnergy: 100,
    stars: 0,
    xp: 0,
    stage: 0,
    completed: 0,
    cooked: 0,
    merges: 0,
    generationCount: 0,
    nextItemId: 1,
    orderSerial: 0,
    orders: [],
    mainCompleted: [],
    discovered: [],
    claimed: {},
    levelRewardClaimedThrough: 1,
    credits: {},
    boosters: { scissors: 0, hourglass: 0 },
    tools: [],
    legacyFullRefill: 0,
    storageCapacity: 6,
    storagePurchases: 0,
    day: {
      key: chinaDate(now),
      orders: 0,
      breaks: 0,
      refresh: 0,
      chests: 0,
      purchases: 0,
      shop: {},
    },
    week: { key: weekKey(now), orders: 0 },
    chestProgress: 0,
    honorProgress: 0,
    infiniteUntil: 0,
    lastEnergyAt: now,
    lastNow: now,
    rng: 0x45ab7e12,
    transactionSerial: 0,
    events: [],
    discarded: null,
    dailyClaimDate: null,
  };
}
function fresh(now) {
  const s = base(now);
  for (const row of BALANCE.initial.producers)
    s.board[row.index] = makeItem(s, row.item, now);
  for (const row of BALANCE.initial.commodities)
    s.board[row.index] = makeItem(s, row.item, now);
  s.locked = [...BALANCE.initial.lockedIndices];
  reward(s, BALANCE.initial.pending, now);
  for (const row of BALANCE.initial.boosters)
    for (let n = 0; n < row.count; n++)
      s.tools.push(makeItem(s, row.item, now, { location: "tools" }));
  s.xp = 0;
  fillOrders(s);
  return s;
}
function resetPeriods(s, now) {
  const date = chinaDate(now),
    week = weekKey(now);
  if (date > s.day.key)
    s.day = {
      key: date,
      orders: 0,
      breaks: 0,
      refresh: 0,
      chests: 0,
      purchases: 0,
      shop: {},
    };
  if (week > s.week.key) s.week = { key: week, orders: 0 };
}
export function tickEnergy(s, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  if (s.energy >= 100) {
    s.lastEnergyAt = now;
    return 0;
  }
  const count = Math.min(
    100 - s.energy,
    Math.floor(Math.max(0, now - s.lastEnergyAt) / 120000),
  );
  s.energy += count;
  if (count)
    s.lastEnergyAt = s.energy >= 100 ? now : s.lastEnergyAt + count * 120000;
  return count;
}
// Each clock has a bounded horizon. Stopwatch credit advances all instance clocks
// together and retains time that every clock is currently unable to consume.
function advance(item, elapsed) {
  const r = sourceRules(item),
    m = r.manual;
  elapsed = Math.max(0, elapsed);
  if (
    m?.mode === "recharge" &&
    item.stockOverflow === 0 &&
    item.stock < m.maxStock
  ) {
    const time = Math.max(1, item.rechargeRemaining),
      period = m.rechargeSeconds * 1000;
    if (elapsed >= time) {
      const batches = 1 + Math.floor((elapsed - time) / period);
      item.stock = Math.min(m.maxStock, item.stock + batches * m.batch);
      item.rechargeRemaining =
        item.stock === m.maxStock
          ? period
          : period - ((elapsed - time) % period);
    } else item.rechargeRemaining = time - elapsed;
  }
  if (r.auto && item.autoBuffer < r.auto.capacity) {
    const time = Math.max(1, item.autoRemaining),
      period = r.auto.intervalSeconds * 1000;
    if (elapsed >= time) {
      item.autoBuffer = Math.min(
        r.auto.capacity,
        item.autoBuffer + 1 + Math.floor((elapsed - time) / period),
      );
      item.autoRemaining =
        item.autoBuffer === r.auto.capacity
          ? period
          : period - ((elapsed - time) % period);
    } else item.autoRemaining = time - elapsed;
  }
  if (item.openedAt !== null && item.timerRemaining !== null)
    item.timerRemaining = Math.max(0, item.timerRemaining - elapsed);
}
function creditHorizon(item) {
  const r = sourceRules(item),
    m = r.manual,
    h = [];
  if (m?.mode === "recharge" && !item.stockOverflow && item.stock < m.maxStock)
    h.push(
      item.rechargeRemaining +
        (Math.ceil((m.maxStock - item.stock) / m.batch) - 1) *
          m.rechargeSeconds *
          1000,
    );
  if (r.auto && item.autoBuffer < r.auto.capacity)
    h.push(
      item.autoRemaining +
        (r.auto.capacity - item.autoBuffer - 1) * r.auto.intervalSeconds * 1000,
    );
  return Math.max(0, ...h);
}
function settle(item, now) {
  advance(item, Math.max(0, now - item.clockAt));
  item.clockAt = Math.max(now, item.clockAt);
  const used = Math.min(item.timeCredit, creditHorizon(item));
  if (used > 0) {
    advance(item, used);
    item.timeCredit -= used;
  }
  const m = sourceRules(item).manual;
  item.nextRechargeAt =
    m?.mode === "recharge" && item.stock < m.maxStock && !item.stockOverflow
      ? item.clockAt + item.rechargeRemaining
      : null;
}
function projected(item, now) {
  const c = clone(item);
  if (item.location === "board") settle(c, now);
  return c;
}
function deliverTimers(s, i, now, release) {
  const item = s.board[i];
  if (!item) return;
  const r = sourceRules(item);
  if (r.delay && item.timerRemaining === 0) {
    reward(s, r.delay.outputs, now);
    s.board[i] = null;
    return;
  }
  if (r.auto && release) {
    for (const j of adj(i))
      if (item.autoBuffer && unlocked(s, j) && !s.board[j]) {
        s.board[j] = makeItem(s, r.auto.output, now);
        item.autoBuffer--;
      }
  }
}
export function tick(s, now = Date.now(), { offline = false, fill = true } = {}) {
  if (s.readOnly) return { changed: false };
  now = Math.max(s.lastNow, safeNow(now));
  const before = JSON.stringify(s);
  tickEnergy(s, now);
  resetPeriods(s, now);
  for (let i = 0; i < BOARD_SIZE; i++) {
    const item = s.board[i];
    if (!item || !unlocked(s, i)) continue;
    if (item.family === "bubble") {
      if (now >= item.expiresAt) s.board[i] = makeItem(s, "coins:1", now);
      continue;
    }
    settle(item, now);
    deliverTimers(s, i, now, !offline);
  }
  if (s.discarded && now >= s.discarded.until) s.discarded = null;
  s.lastNow = now;
  if (fill) fillOrders(s);
  return { changed: before !== JSON.stringify(s) };
}
export function producerStatus(s, item, now = Date.now()) {
  if (!item || item.family === "bubble")
    return { ready: false, charges: 0, maxCharges: 0, cooldownRemaining: 0 };
  const p = projected(item, Math.max(s.lastNow, safeNow(now))),
    r = sourceRules(p),
    m = r.manual;
  return {
    ready: !!m && (m.mode !== "recharge" || p.stock + p.stockOverflow > 0),
    charges: p.stockOverflow + (p.stock ?? p.remainingDraws ?? 0),
    maxCharges: m?.maxStock ?? m?.draws ?? m?.sequence?.length ?? 0,
    cooldownRemaining:
      m?.mode === "recharge" && p.stock + p.stockOverflow === 0
        ? p.rechargeRemaining
        : 0,
    buffer: p.autoBuffer,
    remaining: p.remainingDraws,
    timerRemaining: p.timerRemaining,
    opened: p.openedAt !== null,
    credit: p.timeCredit,
  };
}
function availableEnergy(s, now) {
  return s.energy >= 100
    ? s.energy
    : Math.min(
        100,
        s.energy + Math.floor(Math.max(0, now - s.lastEnergyAt) / 120000),
      );
}
function cost(s, n, now) {
  return now < s.infiniteUntil ? 0 : n;
}
function pay(s, n, now) {
  tickEnergy(s, now);
  s.lastNow = Math.max(s.lastNow, now);
  s.energy -= cost(s, n, now);
}
export function generate(s, selection, now = Date.now()) {
  if (s.readOnly) return fail(s, "readonly", "此存档版本较新，仅可导出");
  now = Math.max(s.lastNow, safeNow(now));
  const i = Number.isInteger(selection)
    ? selection
    : s.board.findIndex(
        (x) => x && (x.id === selection || x.family === `gen_${selection}`),
      );
  const source = s.board[i];
  if (!unlocked(s, i) || !source) return fail(s, "invalid", "先选择可生产物品");
  const p = projected(source, now),
    r = sourceRules(p),
    m = r.manual;
  if (!m) return fail(s, "invalid", "这个物品尚未启用生产");
  const index = free(s);
  if (index < 0) return fail(s, "full", "台面满啦，先留出一个空位");
  if (m.mode === "recharge" && p.stock + p.stockOverflow === 0)
    return fail(
      s,
      "cooldown",
      `补货中，${Math.ceil(p.rechargeRemaining / 1000)}秒`,
    );
  if (availableEnergy(s, now) < cost(s, m.energyPerTap, now))
    return fail(s, "energy", "体力不足，请领取补给");
  let id;
  if (m.drops) {
    const rows = m.drops.filter(
      (d) => FAMILY_META[d.chain].unlockChapter <= s.stage + 1,
    );
    const row = choose(s, rows);
    id = `${row.chain}:${Math.min(CHAINS[row.chain].length, levelRoll(s, m.outputLevelProb))}`;
  } else if (m.sequence) id = m.sequence[p.sequenceIndex];
  else id = choose(s, m.outputs).item;
  pay(s, m.energyPerTap, now);
  if (m.mode === "recharge") {
    if (p.stockOverflow) p.stockOverflow--;
    else p.stock--;
    if (source.stock === m.maxStock)
      p.rechargeRemaining = m.rechargeSeconds * 1000;
  } else {
    s.lastNow = now;
    p.openedAt ??= now;
    p.remainingDraws--;
    p.sequenceIndex++;
  }
  s.board[i] = p;
  s.board[index] = makeItem(s, id, now);
  s.generationCount++;
  if (p.remainingDraws === 0) {
    s.board[i] = m.onExhaust ? makeItem(s, m.onExhaust, now) : null;
  }
  s.lastNow = now;
  return finish(s, "generate", `获得${name(s.board[index])}`, {
    index,
    item: s.board[index],
    producerIndex: i,
  });
}
function mergeTarget(a, b) {
  const usedPiglets = a?.family === "tipjar" && a.level === 1 &&
    a.remainingDraws > 0 && b?.remainingDraws > 0;
  if (
    !a ||
    !b ||
    a.family === "bubble" ||
    b.family === "bubble" ||
    itemKey(a) !== itemKey(b) ||
    (!usedPiglets && (a.openedAt !== null || b.openedAt !== null))
  )
    return null;
  const stackLimit = definition(a).stackLimit;
  if (stackLimit) return (a.uses ?? 1) + (b.uses ?? 1) <= stackLimit ? itemKey(a) : null;
  return definition(a).mergeTo || sourceRules(a).cross?.output || null;
}
function inherit(s, a, b, id, now) {
  const n = makeItem(s, id, now, { full: false });
  if (definition(n).stackLimit) n.uses = (a.uses ?? 1) + (b.uses ?? 1);
  const old = sourceRules(a),
    next = sourceRules(n);
  if (next.manual?.mode === "recharge") {
    const sum =
      (a.stock || 0) +
      (a.stockOverflow || 0) +
      (b.stock || 0) +
      (b.stockOverflow || 0);
    n.stock = Math.min(sum, next.manual.maxStock);
    n.stockOverflow = Math.max(0, sum - n.stock);
    const ratio = (x) =>
      !old.manual || x.stock === old.manual.maxStock
        ? 1
        : x.rechargeRemaining / (old.manual.rechargeSeconds * 1000);
    n.rechargeRemaining =
      Math.max(ratio(a), ratio(b)) * next.manual.rechargeSeconds * 1000;
  }
  if (next.auto) {
    const ratio = (x) =>
      old.auto ? x.autoRemaining / (old.auto.intervalSeconds * 1000) : 1;
    n.autoRemaining =
      Math.max(ratio(a), ratio(b)) * next.auto.intervalSeconds * 1000;
  }
  if (old.auto)
    for (const x of [a, b])
      if (x.autoBuffer)
        reward(s, [{ item: old.auto.output, count: x.autoBuffer }], now);
  n.timeCredit = (a.timeCredit || 0) + (b.timeCredit || 0);
  return n;
}
export function move(s, from, to, now = Date.now()) {
  if (s.readOnly) return fail(s, "readonly", "存档只读");
  if (
    !unlocked(s, from) ||
    !Number.isInteger(to) ||
    to < 0 ||
    to >= BOARD_SIZE ||
    from === to ||
    !s.board[from]
  )
    return fail(s, "invalid", "选择另一个格子");
  const a = s.board[from],
    b = s.board[to];
  if (a.family === "bubble" || b?.family === "bubble")
    return fail(s, "bubble", "先处理泡泡");
  const id = mergeTarget(a, b);
  if (itemKey(a) === itemKey(b) && !id)
    return fail(s, "max", "已开启的容器或最高级物品不能合成");
  if (id) {
    now = Math.max(s.lastNow, safeNow(now));
    const pa = projected(a, now),
      pb = unlocked(s, to) ? projected(b, now) : { ...clone(b), clockAt: now },
      item = inherit(s, pa, pb, id, now);
    s.board[from] = null;
    s.board[to] = item;
    s.merges++;
    const cleared = s.locked.filter(
      (i) =>
        i === to ||
        (!s.board[i] && (adj(to).includes(i) || adj(from).includes(i))),
    );
    s.locked = s.locked.filter((i) => !cleared.includes(i));
    let bubbleIndex = -1;
    const d = definition(item);
    if (
      d.kind === "commodity" &&
      d.level >= 3 &&
      !isPermanent(item) &&
      !isSource(item) &&
      !sourceRules(item).delay &&
      d.family === a.family &&
      free(s) >= 0 &&
      !s.board.some((x) => x?.family === "bubble") &&
      random(s) < 0.08
    ) {
      bubbleIndex = free(s);
      s.board[bubbleIndex] = {
        id: `item-${s.nextItemId++}`,
        family: "bubble",
        level: d.level,
        item: { family: d.family, level: d.level },
        expiresAt: now + 120000,
        cost: Math.ceil(Math.max(2, d.standardCost / 8)),
      };
    }
    s.lastNow = now;
    return finish(s, "merge", `合成${name(item)}`, {
      from,
      to,
      item,
      unlocked: cleared,
      bubbleIndex,
    });
  }
  if (!unlocked(s, to))
    return fail(s, "locked", "相同物品合成或在相邻格合成解锁");
  s.board[from] = b;
  s.board[to] = a;
  return finish(s, b ? "swap" : "move", "移动成功", { from, to, item: a });
}
function protectedRemoval(s, indices) {
  const remaining = all(s).filter(
    (x) => !indices.some((i) => s.board[i] === x),
  );
  for (const i of indices) {
    const x = s.board[i];
    if (isPermanent(x)) {
      const outputs = (y) => {
        const r = sourceRules(y);
        return [
          ...(r.manual?.drops?.map((d) => d.chain) || []),
          ...(r.manual?.outputs?.map((d) => d.item.split(":")[0]) || []),
          ...(r.auto ? [r.auto.output.split(":")[0]] : []),
        ];
      };
      const supplies = outputs(x);
      if (
        supplies.some(
          (f) =>
            !remaining.some((y) => isPermanent(y) && outputs(y).includes(f)),
        )
      )
        return true;
    }
    if (x.family === "tools")
      for (const r of RECIPES.filter((r) => r.unlockStage <= s.stage))
        if (
          x.level >= r.toolLevel &&
          !remaining.some((y) => y.family === "tools" && y.level >= r.toolLevel)
        )
          return true;
  }
  return false;
}
function required(s, needs) {
  const used = [];
  const rows = needs.map((n) => {
    const matching = s.board.flatMap((x, i) =>
      x &&
      unlocked(s, i) &&
      itemKey(x) === `${n.family}:${n.level}` &&
      x.openedAt === null &&
      !used.includes(i)
        ? [i]
        : [],
    );
    const selected = matching.slice(0, n.count);
    used.push(...selected);
    return {
      ...n,
      have: matching.length,
      missing: Math.max(0, n.count - matching.length),
    };
  });
  return {
    needs: rows,
    indices: used,
    ready: rows.every((n) => !n.missing) && !protectedRemoval(s, used),
  };
}
export const getOrderProgress = (s, o) => {
  const p = required(s, o.needs);
  return {
    ...p,
    total: o.needs.reduce((n, x) => n + x.count, 0),
    matched: p.needs.reduce((n, x) => n + Math.min(x.have, x.count), 0),
  };
};
export function mainOrder(s) {
  return (
    BALANCE.storyOrders.find(
      (o) => o.chapter === s.stage + 1 && !s.mainCompleted.includes(o.id),
    ) || null
  );
}
export function activeOrders(s) {
  return [
    ...(mainOrder(s)
      ? [{ ...mainOrder(s), customer: "主线", main: true }]
      : []),
    ...s.orders,
  ];
}
const signature = (n) =>
  n
    .map((x) => `${x.family}:${x.level}x${x.count}`)
    .sort()
    .join("|");
function availableFamilies(s) {
  const sources = [
    ...s.board.filter((x, i) => x && unlocked(s, i)),
    ...(free(s) >= 0 ? s.inventory : []),
  ];
  return [
    ...new Set(
      sources.flatMap(
        (x) => sourceRules(x).manual?.drops?.map((d) => d.chain) || [],
      ),
    ),
  ].filter(
    (f) =>
      FAMILY_META[f]?.unlockChapter <= s.stage + 1 &&
      CHAINS[f].some((x) => x.repeatOrderEligible),
  );
}
function orderCandidate(s, slot, exclude = []) {
  const rules = BALANCE.repeatOrderRules,
    chapter = Math.min(s.stage, 11),
    [low, high] = rules.slots[slot].band.map(
      (n) => n * rules.chapterMultiplier[chapter],
    );
  const families = availableFamilies(s);
  const active = new Set(exclude.flatMap((o) => o.needs.map((n) => n.family)));
  const variants = [];
  for (const f of families)
    for (
      let l = 1;
      l <= Math.min(rules.maxLevelByChapter[chapter], CHAINS[f].length);
      l++
    )
      for (let count = 1; count <= 2; count++)
        variants.push({
          need: { family: f, level: l, count },
          cost: ITEMS[`${f}:${l}`].standardCost * count,
        });
  const seen = new Set(exclude.map((o) => signature(o.needs)));
  let selected = null,
    count = 0,
    best = null;
  const consider = (needs, C) => {
    if (
      C > high ||
      seen.has(signature(needs)) ||
      new Set([...active, ...needs.map((x) => x.family)]).size > 3
    )
      return;
    const entry = { needs, standardCost: +C.toFixed(3) };
    if (!best || C > best.standardCost) best = entry;
    if (C >= low) {
      count++;
      if (random(s) < 1 / count) selected = entry;
    }
  };
  for (let a = 0; a < variants.length; a++) {
    const x = variants[a];
    consider([x.need], x.cost);
    for (let b = a + 1; b < variants.length; b++) {
      const y = variants[b];
      if (x.need.family === y.need.family && x.need.level === y.need.level)
        continue;
      consider([x.need, y.need], x.cost + y.cost);
    }
  }
  const entry = selected || best;
  if (!entry) return null;
  const C = entry.standardCost;
  return {
    ...entry,
    id: `repeat-${++s.orderSerial}`,
    slot,
    title: `${rules.slots[slot].id === "easy" ? "暖心" : slot === 1 ? "邻里" : "宴会"}小订单`,
    customer: ["小鹿", "阿熊", "团团"][slot],
    coins: Math.ceil(8 + 2 * C),
    xp: Math.ceil(4 + C / 4),
    stars: Math.min(4, Math.max(1, Math.ceil(C / 40))),
    fallbackReason: selected
      ? null
      : "当前来源与等级下，采用不超上限的最高可达需求",
  };
}
function fillOrders(s) {
  for (let slot = 0; slot < 3; slot++)
    if (!s.orders.some((o) => o.slot === slot)) {
      const order = orderCandidate(s, slot, s.orders);
      if (order) s.orders.push(order);
    }
  s.orders.sort((a, b) => a.slot - b.slot);
}
export function refreshOrder(s, id, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const i = s.orders.findIndex((o) => o.id === id);
  if (i < 0) return fail(s, "invalid", "订单已更新");
  const trial = clone(s);
  resetPeriods(trial, Math.max(s.lastNow, now));
  if (trial.day.refresh >= 10) return fail(s, "limit", "今日刷新已达10次");
  const fee = trial.day.refresh < 3 ? 0 : 50;
  if (s.coins < fee) return fail(s, "coins", "需要50金币");
  const next = orderCandidate(trial, s.orders[i].slot, s.orders);
  if (!next) return fail(s, "source", "请先把生产器取到台面");
  s.lastNow = Math.max(s.lastNow, now);
  s.rng = trial.rng;
  s.orderSerial = trial.orderSerial;
  s.day = trial.day;
  s.day.refresh++;
  s.coins -= fee;
  s.orders[i] = next;
  return finish(s, "order_refresh", "订单已刷新");
}
export function fulfillOrder(s, id, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const main = mainOrder(s),
    order = main?.id === id ? main : s.orders.find((o) => o.id === id);
  if (!order) return fail(s, "claimed", "订单已交付");
  const p = getOrderProgress(s, order);
  if (!p.ready)
    return fail(s, "incomplete", "还缺物品，或需保留最后供给源/配方厨具");
  resetPeriods(s, Math.max(s.lastNow, now));
  s.lastNow = Math.max(s.lastNow, now);
  for (const i of p.indices) s.board[i] = null;
  add(s, "coins", order.coins);
  add(s, "stars", order.stars);
  xp(s, order.xp, now);
  s.completed++;
  s.day.orders++;
  s.week.orders++;
  if (order === main) s.mainCompleted.push(id);
  else s.orders = s.orders.filter((o) => o.id !== id);
  if (order.standardCost >= 4) {
    if (s.day.chests < 3 && ++s.chestProgress >= 5) {
      s.chestProgress = 0;
      s.day.chests++;
      reward(s, [{ item: "chest:1", count: 1 }], now);
    }
    if (s.stage === 12 && ++s.honorProgress >= 10) {
      s.honorProgress = 0;
      reward(s, [{ item: "honor:1", count: 1 }], now);
    }
  }
  fillOrders(s);
  return finish(
    s,
    "order",
    `交单成功 +${order.coins}金币 · +${order.stars}星星`,
    {
      order,
      consumed: p.indices,
      coins: order.coins,
      xp: order.xp,
      stars: order.stars,
    },
  );
}
export function getRecipeProgress(s, r, now = s.lastNow) {
  if (typeof r === "string") r = RECIPES.find((x) => x.id === r);
  if (!r) return { ready: false, needs: [], locked: true };
  const p = required(s, r.needs),
    toolIndex = s.board.findIndex(
      (x, i) =>
        x?.family === "tools" && x.level >= r.toolLevel && unlocked(s, i),
    ),
    locked = r.unlockStage > s.stage;
  return {
    ...p,
    locked,
    toolIndex,
    toolReady: toolIndex >= 0,
    toolName: ITEMS[`tools:${r.toolLevel}`].name,
    ready:
      p.ready &&
      toolIndex >= 0 &&
      !locked &&
      availableEnergy(s, Math.max(s.lastNow, now)) >=
        cost(s, r.energyCost, Math.max(s.lastNow, now)),
  };
}
export function cookRecipe(s, id, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const r = RECIPES.find((x) => x.id === id),
    p = getRecipeProgress(s, r, now);
  if (!p.ready) return fail(s, "incomplete", "准备食材、厨具和烹饪体力");
  pay(s, r.energyCost, Math.max(s.lastNow, now));
  for (const i of p.indices) s.board[i] = null;
  const index = p.indices[0],
    item = makeItem(s, `${r.output.family}:${r.output.level}`, now);
  s.board[index] = item;
  s.cooked++;
  return finish(s, "cook", `做好${name(item)}，厨具保留`, {
    index,
    item,
    recipe: r,
    consumed: p.indices,
  });
}
export function getChapterProgress(s) {
  const chapter = CHAPTERS[s.stage];
  if (!chapter)
    return {
      chapter: null,
      tasks: [],
      ready: false,
      allComplete: s.stage === 12,
      invalid: s.stage !== 12,
      completed: 0,
      total: 0,
      stage: s.stage,
    };
  const current = chapter.orders.filter((id) =>
    s.mainCompleted.includes(id),
  ).length;
  return {
    chapter,
    tasks: [
      { ...chapter.tasks[0], current, value: current, done: current === 8 },
    ],
    ready: current === 8 && s.stars >= chapter.stars,
    completed: current,
    total: 8,
    allComplete: false,
    stage: s.stage,
  };
}
export function claimChapter(s, expected = s.stage, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const p = getChapterProgress(s);
  if (expected !== s.stage) return fail(s, "claimed", "此章已结算");
  if (!p.ready) return fail(s, "incomplete", "完成八份主线并备好装修星星");
  const c = p.chapter;
  s.lastNow = Math.max(s.lastNow, now);
  s.stars -= c.stars;
  s.stage++;
  grant(
    s,
    `chapter:${c.number}`,
    [
      ...c.completionRewards,
      ...c.unlockNextProducers.map((id) => ({
        item: `${PRODUCER_DEFS[id].chain}:${PRODUCER_DEFS[id].activeLevel}`,
        count: 1,
      })),
    ],
    now,
  );
  fillOrders(s);
  return finish(s, "chapter", `第${c.number}章布置完成，奖励在待领区`, {
    chapter: c,
    reward: c.completionRewards,
  });
}
export const renovate = (s, now) => claimChapter(s, s.stage, now);
export function collectItem(s, index, now = Date.now()) {
  if (!unlocked(s, index) || !s.board[index])
    return fail(s, "invalid", "先选择已解锁的资源");
  now = Math.max(s.lastNow, safeNow(now));
  const item = s.board[index],
    d = definition(item);
  if (!d) return fail(s, "invalid", "无法领取");
  if (["energy", "coins", "gems"].includes(d.valueUnit)) {
    tickEnergy(s, now);
    s.lastNow = now;
    add(s, d.valueUnit, d.value);
    if (s.energy >= 100) s.lastEnergyAt = now;
    s.board[index] = null;
    return finish(
      s,
      "collect",
      `领取${d.value} ${d.valueUnit === "energy" ? "体力" : d.valueUnit === "coins" ? "金币" : "颗彩虹糖"}`,
      { index, item },
    );
  }
  if (item.family === "legacy_chest") {
    s.lastNow = now;
    s.board[index] = null;
    const kinds = [
      "food",
      "produce",
      "tools",
      "drink",
      "herb",
      "asian",
      "mediterranean",
    ].filter((k) => PRODUCER_DEFS[k].unlockStage <= s.stage);
    const kind = kinds[Math.floor(random(s) * kinds.length)],
      p = PRODUCER_DEFS[kind];
    const rows = [
      { item: `legacy_energy:${Math.min(4, item.level + 1)}` },
      { item: `legacy_coins:${Math.min(4, item.level + 1)}` },
      { item: `${p.chain}:${p.activeLevel}` },
    ];
    if (item.level >= 2)
      rows.push(
        { item: `legacy_energy:${item.level}` },
        { item: "splitter:3" },
      );
    if (item.level >= 3) {
      rows.push({ item: "legacy_coins:4" });
      s.legacyFullRefill += 2;
    }
    reward(s, rows, now);
    return finish(s, "chest", "旧礼盒已按原价值兑现到待领区", { index, item });
  }
  if (item.family === "chest") {
    s.lastNow = now;
    s.board[index] = null;
    reward(s, BALANCE.economy.chestRewards[item.level], now);
    return finish(s, "chest", "礼盒内容已送到待领区", { index, item });
  }
  if (["blackbag", "pinkbag", "tipjar", "energybox"].includes(item.family)) {
    const bag = ["blackbag", "pinkbag"].includes(item.family);
    if (bag && item.openedAt === null) {
      const rows = Object.entries(BALANCE.economy.bags[item.family])
        .filter(([f]) => FAMILY_META[f].unlockChapter <= s.stage + 1)
        .map(([chain, prob]) => ({ chain, prob }));
      if (!rows.length) return fail(s, "source", "尚无可用设备");
      s.lastNow = now;
      item.frozenPool = rows;
      item.openedAt = now;
      item.timerRemaining =
        BALANCE.economy.bagOpenSeconds[item.family][item.level - 1] * 1000;
      item.clockAt = now;
      return finish(s, "open_container", "开始开锁，放入仓库会暂停", {
        index,
        item,
      });
    }
    const p = projected(item, now);
    if (bag && p.timerRemaining > 0)
      return fail(s, "wait", `开锁还需${Math.ceil(p.timerRemaining / 1000)}秒`);
    const empty = free(s);
    if (empty < 0) return fail(s, "full", "取物需要一个空位");
    let id;
    if (bag)
      id = `${choose(s, p.frozenPool).chain}:${levelRoll(s, BALANCE.economy.bagLevelProb)}`;
    else if (item.family === "tipjar")
      id = `${choose(s, BALANCE.economy.pigDrops).chain}:${levelRoll(s, BALANCE.economy.pigLevelProbByTier[item.level])}`;
    else id = choose(s, BALANCE.economy.energyBoxDrops).item;
    s.lastNow = now;
    p.openedAt ??= now;
    p.remainingDraws--;
    s.board[index] = p.remainingDraws ? p : null;
    const output = makeItem(s, id, now);
    s.board[empty] = output;
    return finish(
      s,
      "collect",
      `获得${name(output)}，余${p.remainingDraws}次`,
      { index: empty, item: output },
    );
  }
  return fail(s, "tool", "请在道具详情选择使用目标");
}
export function claimPending(s, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const index = free(s);
  if (index < 0) return fail(s, "full", "台面满啦，奖励会保留");
  if (!s.pending.length) return fail(s, "empty", "暂无待领物品");
  s.lastNow = Math.max(s.lastNow, now);
  const item = s.pending.shift();
  resume(item, now);
  s.board[index] = item;
  discover(s, item, now);
  return finish(s, "claim", `领取${name(item)}`, { index, item });
}
function resume(item, now) {
  item.location = "board";
  item.clockAt = now;
  const r = sourceRules(item);
  if (r.delay) item.openedAt ??= now;
}
export function storeItem(s, index, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  if (
    !unlocked(s, index) ||
    !s.board[index] ||
    s.board[index].family === "bubble"
  )
    return fail(s, "invalid", "先选择可收纳物品");
  if (s.inventory.length >= s.storageCapacity)
    return fail(s, "full", "仓库已满");
  now = Math.max(s.lastNow, now);
  s.lastNow = now;
  settle(s.board[index], now);
  deliverTimers(s, index, now, false);
  const item = s.board[index];
  if (!item) return finish(s, "mature", "成熟奖励已入待领区");
  item.location = "inventory";
  s.inventory.push(item);
  s.board[index] = null;
  return finish(s, "store", `${name(item)}已收纳，计时暂停`, { index, item });
}
export function retrieveItem(s, index, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const empty = free(s);
  if (empty < 0) return fail(s, "full", "台面需要一个空位");
  if (!Number.isInteger(index) || !s.inventory[index])
    return fail(s, "invalid", "没有这个物品");
  s.lastNow = Math.max(s.lastNow, now);
  const [item] = s.inventory.splice(index, 1);
  resume(item, Math.max(s.lastNow, now));
  s.board[empty] = item;
  discover(s, item, now);
  fillOrders(s);
  return finish(s, "retrieve", `取出${name(item)}`, { index: empty, item });
}
export const storageExpansionCost = (s) =>
  Math.ceil(
    ((BALANCE.economy.storagePrices[Math.min(s.storagePurchases, 26)] ||
      19000) *
      Math.min(2, 60 - s.storageCapacity)) /
      2,
  );
export function expandStorage(s) {
  if (s.storageCapacity >= 60) return fail(s, "max", "仓库已满60格");
  const fee = storageExpansionCost(s);
  if (s.coins < fee) return fail(s, "coins", `需要${fee}金币`);
  s.coins -= fee;
  s.storageCapacity = Math.min(60, s.storageCapacity + 2);
  s.storagePurchases++;
  return finish(s, "expand", "仓库扩容完成");
}
export function refillEnergy(s, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const trial = clone(s);
  resetPeriods(trial, Math.max(s.lastNow, now));
  const row = BALANCE.economy.energyPurchases[trial.day.purchases];
  if (!row) return fail(s, "limit", "今日已购买4次");
  if (s.gems < row.gems) return fail(s, "gems", `需要${row.gems}颗彩虹糖`);
  s.lastNow = Math.max(s.lastNow, now);
  s.day = trial.day;
  s.day.purchases++;
  s.gems -= row.gems;
  add(s, "energy", 100);
  return finish(s, "refill", "补充100体力，超额存入待领额度");
}
export function buyShopItem(s, id, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const row = SHOP_ITEMS.find((x) => x.id === id);
  if (!row || s.stage < row.unlockStage)
    return fail(s, "locked", "商品尚未解锁");
  const trial = clone(s);
  resetPeriods(trial, Math.max(s.lastNow, now));
  const key = row.limitKey || id;
  if ((trial.day.shop[key] || 0) >= row.dailyLimit)
    return fail(s, "limit", "今日限购已用完");
  if (s.coins < row.cost) return fail(s, "coins", `需要${row.cost}金币`);
  s.lastNow = Math.max(s.lastNow, now);
  s.day = trial.day;
  s.day.shop[key] = (s.day.shop[key] || 0) + 1;
  s.coins -= row.cost;
  reward(s, [{ item: row.item }], now);
  return finish(s, "buy", "购买成功，已送待领区");
}
export function claimDaily(s, now = Date.now()) {
  now = Math.max(s.lastNow, now);
  const key = `daily:${chinaDate(now)}`;
  if (s.claimed[key]) return fail(s, "claimed", "今日礼物已领取");
  s.lastNow = now;
  grant(s, key, BALANCE.economy.dailyFree, now);
  s.dailyClaimDate = chinaDate(now);
  return finish(s, "daily", "存钱罐与能量箱已送待领区");
}
export function claimBreak(s, now = Date.now()) {
  now = Math.max(s.lastNow, now);
  resetPeriods(s, now);
  if (s.day.breaks >= 3) return fail(s, "claimed", "今日已休息三次");
  s.lastNow = now;
  s.day.breaks++;
  add(s, "energy", 25);
  return finish(s, "break", "休息补充25体力");
}
export function claimCommission(s, type, now = Date.now()) {
  now = Math.max(s.lastNow, now);
  resetPeriods(s, now);
  const weekly = type === "week",
    key = `commission:${weekly ? s.week.key : s.day.key}:${type}`;
  if (s.claimed[key]) return fail(s, "claimed", "委托奖励已领取");
  if ((weekly ? s.week.orders : s.day.orders) < (weekly ? 20 : 3))
    return fail(s, "incomplete", weekly ? "本周需交20单" : "今日需交3单");
  s.lastNow = now;
  grant(
    s,
    key,
    weekly
      ? BALANCE.economy.weeklyCommission.rewards
      : [
          {
            item: Number(s.day.key.slice(-2)) % 2 ? "blackbag:1" : "pinkbag:1",
          },
        ],
    now,
  );
  return finish(s, "commission", "委托奖励已送达");
}
export function sellItem(s, index) {
  if (!unlocked(s, index) || !s.board[index])
    return fail(s, "invalid", "选择已解锁物品");
  const item = s.board[index],
    d = definition(item);
  if (
    !d?.sellCoins ||
    d.kind === "resource" ||
    d.kind === "legacy" ||
    item.openedAt !== null ||
    protectedRemoval(s, [index])
  )
    return fail(s, "protected", "保留最后供给源与配方厨具；资源请领取");
  s.board[index] = null;
  add(s, "coins", d.sellCoins);
  return finish(s, "sell", `获得${d.sellCoins}金币`, {
    index,
    item,
    coins: d.sellCoins,
  });
}
export function discardItem(s, index, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  if (
    !unlocked(s, index) ||
    !s.board[index] ||
    s.board[index].family === "bubble"
  )
    return fail(s, "invalid", "选择物品");
  if (protectedRemoval(s, [index]))
    return fail(s, "protected", "需要保留最后供给源和配方厨具");
  const item = projected(s.board[index], Math.max(s.lastNow, now));
  s.lastNow = Math.max(s.lastNow, now);
  s.discarded = { item, until: Math.max(s.lastNow, now) + 30000 };
  s.board[index] = null;
  return finish(s, "discard", "已暂存丢弃物品，30秒内可撤回");
}
export function undoDiscard(s, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  if (!s.discarded || Math.max(s.lastNow, now) >= s.discarded.until)
    return fail(s, "expired", "撤回时间已过");
  const index = free(s);
  if (index < 0) return fail(s, "full", "请先留一个空位");
  s.lastNow = Math.max(s.lastNow, now);
  const item = s.discarded.item;
  resume(item, Math.max(s.lastNow, now));
  s.board[index] = item;
  s.discarded = null;
  return finish(s, "undo", "物品已恢复", { index, item });
}
function toolAt(s, selection) {
  if (typeof selection === "number" && unlocked(s, selection))
    return {
      item: s.board[selection],
      remove: () => (s.board[selection] = null),
    };
  const i = s.tools.findIndex((x) => x.id === selection);
  return { item: s.tools[i], remove: () => s.tools.splice(i, 1) };
}
export function useTool(s, selection, index, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const tool = toolAt(s, selection),
    d = definition(tool.item);
  if (!d) return fail(s, "empty", "请先选择道具");
  const f = d.family,
    value = d.value;
  let item =
    unlocked(s, index) && s.board[index] && index !== selection
      ? s.board[index]
      : null;
  if (f === "infinite") {
    const remains = Math.max(0, s.infiniteUntil - now);
    if (remains + value * 1000 > 3600000)
      return fail(s, "max", "无限体力最多叠加1小时");
    s.infiniteUntil = now + remains + value * 1000;
  } else if (f === "backpack") {
    if (s.storageCapacity >= 60) return fail(s, "max", "仓库已满，道具保留");
    s.storageCapacity++;
  } else if (f === "timeskip") {
    for (let i = 0; i < BOARD_SIZE; i++)
      if (
        s.board[i] &&
        i !== selection &&
        unlocked(s, i) &&
        s.board[i].family !== "bubble" &&
        (sourceRules(s.board[i]).manual?.mode === "recharge" ||
          sourceRules(s.board[i]).auto ||
          s.board[i].timerRemaining !== null)
      ) {
        settle(s.board[i], now);
        advance(s.board[i], value * 1000);
        deliverTimers(s, i, now, false);
      }
  } else {
    if (!item || item.family === "bubble")
      return fail(s, "target", "先选择一个有效目标");
    const p = projected(item, now),
      r = sourceRules(p),
      m = r.manual;
    if (f === "charge") {
      if (
        m?.mode !== "recharge" ||
        p.stockOverflow ||
        m.maxStock - p.stock < value
      )
        return fail(s, "waste", "仅补主动库存，且不能损失任何补货量");
      p.stock += value;
      s.board[index] = p;
    } else if (f === "stopwatch") {
      if (m?.mode !== "recharge" && !r.auto)
        return fail(s, "target", "秒表需要永久生产源");
      if (p.timeCredit + value * 1000 > 432000000)
        return fail(s, "max", "秒表信用已达120小时");
      p.timeCredit += value * 1000;
      settle(p, now);
      s.board[index] = p;
    } else if (f === "splitter") {
      if (
        !["commodity", "hybrid"].includes(definition(p).kind) ||
        isPermanent(p) ||
        p.openedAt !== null ||
        p.level < 2 ||
        (value !== null && p.level > value) ||
        sourceRules(p).cross
      )
        return fail(s, "target", "剪刀等级不足，或此物品受保护/已开启");
      const empty = free(s);
      if (empty < 0) return fail(s, "full", "剪切需要额外1个空位");
      s.board[index] = makeItem(s, `${p.family}:${p.level - 1}`, now);
      s.board[empty] = makeItem(s, `${p.family}:${p.level - 1}`, now);
    } else if (f === "upgrade") {
      const target = definition(p);
      if (
        !target.mergeTo ||
        ITEMS[target.mergeTo].family !== p.family ||
        p.openedAt !== null
      )
        return fail(s, "target", "此物品不能升级");
      if (d.level === 2) {
        if (target.kind !== "producer")
          return fail(s, "target", "设备升级牌仅用于主生产器与零件");
        s.board[index] = inherit(
          s,
          p,
          { ...p, stock: 0, stockOverflow: 0, autoBuffer: 0, timeCredit: 0 },
          target.mergeTo,
          now,
        );
      } else {
        if (
          !["commodity", "hybrid"].includes(target.kind) ||
          isPermanent(p) ||
          sourceRules(p).cross
        )
          return fail(s, "target", "普通升级卡不适用此物品");
        s.board[index] = makeItem(s, target.mergeTo, now);
      }
    } else return fail(s, "invalid", "这个物品无需选择目标使用");
  }
  s.lastNow = now;
  if ((tool.item.uses ?? 1) > 1) tool.item.uses--;
  else tool.remove();
  return finish(s, "booster", `已使用${d.name}`, {
    index,
    item: s.board[index],
  });
}
export function previewTool(s, selection, index, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const trial = clone(s);
  const out = useTool(trial, selection, index, now);
  return {
    ...out,
    state: undefined,
    preview: out.ok
      ? {
          energy: trial.energy,
          storage: trial.storageCapacity,
          infiniteSeconds: Math.ceil(
            Math.max(0, trial.infiniteUntil - Math.max(s.lastNow, now)) / 1000,
          ),
          target: index === null ? null : clone(trial.board[index]),
          boardChanges: trial.board.filter(
            (x, i) => JSON.stringify(x) !== JSON.stringify(s.board[i]),
          ).length,
        }
      : null,
  };
}
export function useBooster(s, type, index, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  if (type === "hourglass" && s.legacyFullRefill) {
    const item = s.board[index],
      m = item && sourceRules(item).manual;
    if (!unlocked(s, index) || m?.mode !== "recharge")
      return fail(s, "target", "选择主动生产源");
    const p = projected(item, Math.max(s.lastNow, now));
    if (p.stock >= m.maxStock) return fail(s, "full", "库存已满");
    p.stock = m.maxStock;
    p.rechargeRemaining = m.rechargeSeconds * 1000;
    s.board[index] = p;
    s.lastNow = now;
    s.legacyFullRefill--;
    return finish(s, "booster", "旧沙漏已立即补满");
  }
  const tool = s.tools.find(
    (x) => x.family === (type === "scissors" ? "splitter" : "charge"),
  );
  return tool
    ? useTool(s, tool.id, index, now)
    : fail(s, "empty", "道具已用完");
}
export function resolveBubble(s, index, buy = false, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  const b = s.board[index];
  if (!unlocked(s, index) || b?.family !== "bubble")
    return fail(s, "invalid", "泡泡已消失");
  if (buy && now < b.expiresAt && s.gems < b.cost)
    return fail(s, "gems", `需要${b.cost}颗彩虹糖`);
  const purchase = buy && now < b.expiresAt;
  s.lastNow = Math.max(s.lastNow, now);
  if (purchase) s.gems -= b.cost;
  const item = makeItem(
    s,
    purchase ? `${b.item.family}:${b.item.level}` : "coins:1",
    now,
  );
  s.board[index] = item;
  return finish(s, "bubble", purchase ? "物品已取出" : "泡泡变成金币", {
    index,
    item,
  });
}
export const unlockCost = (s, index) => 12 + Math.floor(index / BOARD_COLS) * 4;
export function unlockCell(s, index, now = Date.now()) {
  now = Math.max(s.lastNow, safeNow(now));
  if (!s.locked.includes(index)) return fail(s, "invalid", "格子已解锁");
  const fee = unlockCost(s, index);
  if (s.coins < fee) return fail(s, "coins", `需要${fee}金币`);
  s.lastNow = now;
  s.coins -= fee;
  s.locked = s.locked.filter((i) => i !== index);
  if (s.board[index]) resume(s.board[index], Math.max(s.lastNow, now));
  return finish(s, "unlock", "台面已解锁", { index });
}
export function findMerge(s) {
  for (let a = 0; a < BOARD_SIZE; a++)
    if (unlocked(s, a))
      for (let b = 0; b < BOARD_SIZE; b++)
        if (a !== b && mergeTarget(s.board[a], s.board[b]))
          return {
            from: a,
            to: b,
            family: s.board[a].family,
            level: s.board[a].level,
          };
  return null;
}
export const serialize = (s) => JSON.stringify(s);
export class SaveError extends Error {
  constructor(message, raw) {
    super(message);
    this.raw = raw;
  }
}
function migrate(raw, now) {
  const old = restoreV2(raw, now),
    s = base(now);
  s.migration = {
    from: raw.version,
    originalXp: raw.xp,
    legacyLevel: Math.floor((raw.xp || 0) / 100) + 1,
    at: now,
  };
  s.coins = 0;
  s.energy = 0;
  s.stars = 0;
  s.gems = 0;
  for (const k of ["coins", "energy", "stars"])
    add(s, k, Math.max(0, Number(raw[k] || 0)));
  for (const k of [
    "completed",
    "merges",
    "generationCount",
    "cooked",
    "orderSerial",
  ])
    s[k] = old[k];
  s.stage = old.stage;
  s.nextItemId = old.nextItemId;
  s.storageCapacity = old.storageCapacity;
  s.rng = old.rng;
  s.locked = [...old.locked, ...Array.from({ length: BOARD_SIZE - 49 }, (_, i) => i + 49)];
  s.discovered = old.discovered.filter(
    (id) => !["energy", "coins", "chest"].includes(id.split(":")[0]),
  );
  const level = Math.min(100, s.migration.legacyLevel);
  s.xp =
    levelFloor(level) +
    Math.floor(((old.xp % 100) / 100) * (100 + 20 * (level - 1)));
  s.levelRewardClaimedThrough = level;
  s.lastEnergyAt = old.lastEnergyAt;
  const convert = (x, location) => {
    if (x.family === "bubble")
      return {
        ...x,
        cost: Math.ceil(
          Math.max(2, (definition(x.item)?.standardCost || 1) / 8),
        ),
      };
    let id =
      x.family === "producer"
        ? `gen_${x.kind}:${x.level + PRODUCER_DEFS[x.kind].activeLevel - 1}`
        : `${["energy", "coins", "chest"].includes(x.family) ? "legacy_" : ""}${x.family}:${x.level}`;
    const item = makeItem(s, id, now, { location, discover: false });
    item.id = x.id;
    item.instanceId = x.id;
    if (x.family === "producer") {
      const m = sourceRules(item).manual,
        oldCD = Math.max(30000, 60000 - (x.level - 1) * 10000);
      item.stock = Math.min(x.charges, m.maxStock);
      item.stockOverflow = Math.max(0, x.charges - m.maxStock);
      item.rechargeRemaining =
        x.readyAt > now
          ? Math.min(1, (x.readyAt - now) / oldCD) * m.rechargeSeconds * 1000
          : m.rechargeSeconds * 1000;
    }
    return item;
  };
  const rawAssets = [
    ...raw.board,
    ...(raw.inventory || []),
    ...(raw.pending || []),
  ].filter(Boolean);
  const originalKinds = new Set(
    rawAssets.filter((x) => x.family === "producer").map((x) => x.kind),
  );
  const wasOriginal = (x) =>
    x.family !== "producer" || originalKinds.has(x.kind);
  s.board = old.board.map((x) =>
    x && wasOriginal(x) ? convert(x, "board") : null,
  );
  s.board.push(...Array(BOARD_SIZE - 49).fill(null));
  s.inventory = old.inventory.map((x) => convert(x, "inventory"));
  s.pending = old.pending.filter(wasOriginal).map((x) => convert(x, "pending"));
  for (let i = 0; i < old.boosters.scissors; i++)
    s.tools.push(
      makeItem(s, "splitter:3", now, { location: "tools", discover: false }),
    );
  s.legacyFullRefill = old.boosters.hourglass;
  s.mainCompleted = BALANCE.storyOrders
    .filter((o) => o.chapter <= s.stage)
    .map((o) => o.id);
  s.orders = old.orders.map((o, i) => ({
    ...o,
    id: `legacyOrder:${o.id}`,
    slot: i,
    legacyOrder: true,
    standardCost: o.needs.reduce(
      (sum, n) => sum + definition(n).standardCost * n.count,
      0,
    ),
  }));
  s.dailyClaimDate = old.dailyClaimDate;
  if (old.dailyClaimDate) s.claimed[`daily:${old.dailyClaimDate}`] = true;
  const added = [];
  if (s.stage >= 5) added.push("gen_supply:4", "pantry:6");
  if (s.stage >= 6) added.push("gen_flower:5");
  if (s.stage >= 7) added.push("gen_publicity:4");
  if (s.stage >= 8) added.push("gen_recycle:5");
  grant(
    s,
    "migration:new-facilities",
    added.map((item) => ({ item })),
    now,
  );
  for (const p of BALANCE.producers.filter(
    (p) => p.unlockChapter <= s.stage + 1,
  ))
    if (!all(s).some((x) => x.family === p.chain && x.level >= p.activeLevel))
      grant(
        s,
        `migration:repair:${p.id}`,
        [{ item: `${p.chain}:${p.activeLevel}` }],
        now,
      );
  s.migrationNotice =
    "旧资产已保值迁移。香草花盆现在产种子袋，最高级种子堆可开12次；旧沙漏仍能立即补满。";
  return s;
}
function validateSave(s, raw, { boardSize = BOARD_SIZE, balanceVersion = BALANCE_VERSION } = {}) {
  if (
    s.balanceVersion !== balanceVersion ||
    !Array.isArray(s.board) ||
    s.board.length !== boardSize ||
    !Array.isArray(s.inventory) ||
    !Array.isArray(s.pending) ||
    !Array.isArray(s.tools)
  )
    throw new SaveError("存档结构或配置版本不支持，请导出备份", raw);
  if (
    !s.claimed ||
    !s.credits ||
    !s.day?.key ||
    !s.week?.key ||
    !Array.isArray(s.discovered) ||
    !Array.isArray(s.orders) ||
    !Array.isArray(s.mainCompleted) ||
    !Array.isArray(s.locked)
  )
    throw new SaveError("存档状态结构无效", raw);
  if (new Set(s.locked).size !== s.locked.length ||
      s.locked.some(i => !Number.isInteger(i) || i < 0 || i >= boardSize))
    throw new SaveError("存档锁格索引无效", raw);
  const ids = new Set();
  for (const x of [
    ...all(s),
    ...s.tools,
    ...(s.discarded ? [s.discarded.item] : []),
  ]) {
    if (!x.id || ids.has(x.id))
      throw new SaveError("存档实例ID重复，请恢复备份", raw);
    ids.add(x.id);
    if (x.family !== "bubble") {
      const d = definition(x);
      if (
        !d ||
        d.family !== x.family ||
        d.level !== x.level ||
        x.instanceId !== x.id
      )
        throw new SaveError("存档包含未知或不一致物品，请导出备份", raw);
      if (x.legacyV3 && (s.version !== 4 || itemKey(x) !== "garden_guest:6"))
        throw new SaveError("旧规则标记无效", raw);
      if (x.uses !== undefined && (!d.stackLimit || !Number.isInteger(x.uses) || x.uses < 1 || x.uses > d.stackLimit))
        throw new SaveError("道具叠加次数无效", raw);
      for (const key of [
        "createdAt",
        "stockOverflow",
        "autoBuffer",
        "sequenceIndex",
        "timeCredit",
        "clockAt",
      ])
        if (!Number.isFinite(x[key]) || x[key] < 0)
          throw new SaveError("物品状态数值无效", raw);
      for (const key of [
        "stock",
        "rechargeRemaining",
        "autoRemaining",
        "remainingDraws",
        "openedAt",
        "timerRemaining",
      ])
        if (x[key] !== null && (!Number.isFinite(x[key]) || x[key] < 0))
          throw new SaveError("物品计时或次数无效", raw);
    } else if (
      !definition(x.item) ||
      !Number.isFinite(x.expiresAt) ||
      !Number.isSafeInteger(x.cost) ||
      x.cost < 0
    )
      throw new SaveError("泡泡状态无效", raw);
  }
  for (const o of s.orders)
    if (
      !o.id ||
      !Array.isArray(o.needs) ||
      o.needs.some(
        (n) => !definition(n) || !Number.isInteger(n.count) || n.count < 1,
      ) ||
      !["coins", "xp", "stars"].every(
        (k) => Number.isSafeInteger(o[k]) && o[k] >= 0,
      )
    )
      throw new SaveError("订单状态无效", raw);
  for (const key of [
    "coins",
    "energy",
    "gems",
    "stars",
    "xp",
    "nextItemId",
    "lastNow",
  ])
    if (!Number.isSafeInteger(s[key]) || s[key] < 0)
      throw new SaveError("存档数值无效，请恢复备份", raw);
}
function migrateV3(s, now) {
  // Mark only after validating the unmodified v3 save. Settle old production
  // before replacing capacities, preserving time earned while the app was shut.
  const assets = () => [...all(s), ...s.tools, ...(s.discarded ? [s.discarded.item] : [])];
  for (const item of assets()) if (item.family !== "bubble") item.legacyV3 = true;
  tick(s, Math.max(now, s.lastNow), { offline: true, fill: false });
  for (const item of assets()) {
    if (item.family === "bubble") continue;
    if (itemKey(item) !== "garden_guest:6") delete item.legacyV3;
    const rule = sourceRules(item).manual;
    if (rule?.mode === "recharge") {
      const total = item.stock + item.stockOverflow;
      item.stock = Math.min(total, rule.maxStock);
      item.stockOverflow = total - item.stock;
      // The remaining milliseconds of the current cycle stay earned. New
      // recharge periods start using the new table only after that cycle ends.
      item.nextRechargeAt = item.stock < rule.maxStock && !item.stockOverflow
        ? item.clockAt + item.rechargeRemaining : null;
    }
  }
  s.board.push(...Array(BOARD_SIZE - 49).fill(null));
  s.locked.push(...Array.from({ length: BOARD_SIZE - 49 }, (_, i) => i + 49));
  s.version = 4;
  s.balanceVersion = BALANCE_VERSION;
  s.boardMigration = { from: 3, previousBalanceVersion: "kitchen-reference-v1-draft", at: Math.max(now, s.lastNow), added: 14 };
  s.migrationNotice = "台面已扩为7列9行。旧位置、库存、剩余次数和已积累计时已保留；新增两行可通过相邻合成清理。";
  validateSave(s, s);
  return s;
}
export function createGame(saved = null, now = Date.now()) {
  now = safeNow(now);
  if (saved === null) return fresh(now);
  let raw;
  try {
    raw = typeof saved === "string" ? JSON.parse(saved) : clone(saved);
  } catch {
    throw new SaveError("无法读取存档，请导出后恢复备份", saved);
  }
  if (!raw || ![1, 2, 3, 4].includes(raw.version))
    throw new SaveError(
      raw?.version > 4 ? "此存档来自较新版本，已保护原档" : "存档版本无效",
      saved,
    );
  if (raw.version < 3) {
    if (!Array.isArray(raw.board) || raw.board.length !== 49)
      throw new SaveError("旧档棋盘结构无效", saved);
    return migrate(raw, now);
  }
  if (raw.version === 3) {
    validateSave(raw, saved, { boardSize: 49, balanceVersion: "kitchen-reference-v1-draft" });
    return migrateV3(raw, now);
  }
  validateSave(raw, saved);
  tick(raw, Math.max(now, raw.lastNow), { offline: true });
  return raw;
}
