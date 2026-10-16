// Explicit localhost-only fixtures, isolated from the player's normal save.
import { createGame, makeItem, BALANCE, mainOrder } from "./engine.mjs";
export function fixture(kind, now = Date.now()) {
  if (kind === "migration") return createGame(null, now);
  const s = createGame(null, now);
  s.board.fill(null);
  s.locked = [];
  s.pending = [];
  s.tools = [];
  s.coins = 5000;
  s.gems = 100;
  s.energy = 999;
  const put = (i, id) => (s.board[i] = makeItem(s, id, now));
  if (kind === "special") {
    s.stage = 11;
    [
      "emptybag:4",
      "emptybag:4",
      "seedbag:4",
      "herb:6",
      "pantry:6",
      "lost:5",
      "comfort:8",
      "console:4",
      "adventure_box:5",
      "story:5",
      "keys:5",
      "tasting:4",
      "scraps:8",
      "garden_guest:6",
    ].forEach((id, i) => put(i, id));
  } else if (kind === "producers") {
    s.stage = 11;
    const families = ["food", "produce", "flower", "herb", "tools", "drink", "asian", "mediterranean", "supply", "publicity", "recycle"];
    families.forEach((family, i) => {
      const producer = BALANCE.producers.find(p => p.id === family);
      const chain = BALANCE.chains.find(c => c.id === producer.chain);
      put(i, `${producer.chain}:${producer.activeLevel}`);
      put(14 + i, `${producer.chain}:1`);
      put(28 + i, chain.items.at(-1).id);
    });
    put(25, "gen_food:1");
    ["charge:1", "energybox:1", "blackbag:1", "pinkbag:1", "seedbag:4", "emptybag:4", "pantry:9"].forEach((id, i) => put(42 + i, id));
  } else if (kind === "producer-tiers") {
    s.stage = 11;
    for (let level = 4; level <= 10; level++) put(level - 4, `gen_drink:${level}`);
    for (let level = 3; level <= 12; level++) put(7 + level - 3, `gen_produce:${level}`);
    const other = ["food", "tools", "herb", "asian", "mediterranean", "supply", "publicity", "flower", "recycle"];
    other.forEach((family, i) => {
      const producer = BALANCE.producers.find(p => p.id === family);
      const chain = BALANCE.chains.find(c => c.id === producer.chain);
      put(21 + i * 2, `${producer.chain}:${producer.activeLevel}`);
      put(22 + i * 2, chain.items.at(-1).id);
    });
    put(41, "gen_drink:4");
  } else if (kind === "resources") {
    s.stage = 11;
    [
      "gen_tools:7",
      "blackbag:1",
      "blackbag:1",
      "pinkbag:2",
      "tipjar:3",
      "energybox:1",
      "chest:3",
      "energy:5",
      "coins:6",
      "gems:4",
      "splitter:3",
      "charge:3",
      "stopwatch:1",
      "upgrade:1",
      "upgrade:2",
      "infinite:4",
      "timeskip:2",
      "backpack:1",
      "food:8",
      "gen_tools:3",
      "gen_tools:3",
    ].forEach((id, i) => put(i, id));
    s.board[0].stock = 0;
  } else if (kind === "chapter") {
    s.mainCompleted = BALANCE.chapters[0].orders.slice(0, 7);
    s.stars = 7;
    [
      "gen_food:5",
      "gen_produce:3",
      "gen_tools:4",
      "tools:3",
      "food:3",
      "food:2",
      "food:2",
      "food:2",
    ].forEach((id, i) => put(i, id));
  } else throw Error("Unknown QA fixture");
  if (kind === "chapter") {
    let i = 10;
    for (const need of mainOrder(s).needs)
      for (let count = 0; count < need.count; count++)
        put(i++, `${need.family}:${need.level}`);
  }
  s.orders = [];
  s.events = [];
  return s;
}
