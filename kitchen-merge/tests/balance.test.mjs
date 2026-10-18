import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../dist/engine.mjs";
import { createGame as oldGame } from "../dist/legacy-engine.mjs";
import { icon } from "../dist/art.mjs";
const NOW = 1792108800000;
const blank = () => {
  const s = E.createGame(null, NOW);
  s.board.fill(null);
  s.locked = [];
  s.pending = [];
  s.tools = [];
  return s;
};
const put = (s, i, id, options) =>
  (s.board[i] = E.makeItem(s, id, NOW, options));
const fill = (s) => {
  for (let i = 0; i < E.BOARD_SIZE; i++) if (!s.board[i]) put(s, i, "food:1");
  return s;
};
function unchanged(s, fn) {
  const before = E.serialize(s),
    r = fn();
  assert.equal(r.ok, false, r.message);
  assert.equal(E.serialize(s), before);
  return r;
}
function tool(s, id) {
  const x = E.makeItem(s, id, NOW, { location: "tools" });
  s.tools.push(x);
  return x.id;
}
const removeOutputs = (s, source) => {
  for (let i = 0; i < E.BOARD_SIZE; i++) if (i !== source) s.board[i] = null;
};
test("default v4 keeps 421 definitions and adds the recorded tenth recycle tier", () => {
  const target = E.BALANCE.chains.flatMap((c) => c.items);
  assert.equal(target.length, 422);
  for (const d of target) {
    const actual = E.ITEMS[d.id];
    for (const key of ["name", "level", "mergeTo", "sellCoins", "standardCost"])
      assert.deepEqual(actual[key], d[key]);
    assert.match(icon(actual.icon), /^<svg/);
  }
  assert.equal(
    Object.values(E.ITEMS).filter((d) => d.kind !== "legacy").length,
    411,
  );
  const s = E.createGame(null, NOW);
  assert.equal(s.version, 4);
  assert.equal(E.activeOrders(s).length, 4);
  assert.equal(s.tools.length, 4);
  assert.equal(s.gems, 20);
});
for (const t of E.BALANCE.transitions)
  test(`actual special transition: ${t.id}`, () => {
    const s = blank(),
      id = t.source || t.sourceLevels[0];
    put(s, 24, id);
    s.energy = 999;
    if (t.mode === "cross_merge") {
      put(s, 25, id);
      assert.equal(E.move(s, 24, 25, NOW).ok, true);
      assert.equal(E.itemKey(s.board[25]), t.output);
    } else if (t.mode === "auto") {
      fill(s);
      E.tick(s, NOW + t.intervalSeconds * 1000 * t.capacity, { offline: true });
      assert.equal(s.board[24].autoBuffer, t.capacity);
      s.board[23] = null;
      E.tick(s, NOW + t.intervalSeconds * 1000 * t.capacity);
      assert.equal(E.itemKey(s.board[23]), t.output);
      assert.equal(s.board[24].autoBuffer, t.capacity - 1);
    } else if (t.mode === "delayed_once") {
      E.tick(s, NOW + t.delaySeconds * 1000 - 1);
      assert.ok(s.board[24]);
      E.tick(s, NOW + t.delaySeconds * 1000);
      assert.equal(s.board[24], null);
      assert.equal(
        s.pending.filter((x) => E.itemKey(x) === t.outputs[0].item).length,
        4,
      );
      E.tick(s, NOW + t.delaySeconds * 2000);
      assert.equal(s.pending.length, 4);
    } else if (t.mode === "recharge") {
      const p = s.board[24];
      assert.equal(p.stock, t.maxStock);
      const r = E.generate(s, 24, NOW);
      assert.equal(r.ok, true);
      assert.ok(t.outputs.some((x) => x.item === E.itemKey(r.item)));
      assert.equal(p.stock, t.maxStock);
      assert.equal(s.board[24].stock, t.maxStock - 1);
    } else {
      const count = t.draws || t.sequence.length;
      for (let i = 0; i < count; i++) {
        const r = E.generate(s, 24, NOW);
        assert.equal(r.ok, true);
        assert.equal(E.itemKey(r.item), t.sequence?.[i] || t.outputs[0].item);
        removeOutputs(s, 24);
      }
      assert.equal(s.board[24] ? E.itemKey(s.board[24]) : null, t.onExhaust);
    }
  });
for (const p of E.BALANCE.producers)
  test(`all active producer levels: ${p.id}`, () => {
    for (const level of p.levels) {
      const s = blank();
      s.stage = 12;
      put(s, 0, `${p.chain}:${level.level}`);
      if (!level.active) {
        unchanged(s, () => E.generate(s, 0, NOW));
        continue;
      }
      const r = E.generate(s, 0, NOW);
      assert.equal(r.ok, true);
      assert.ok(p.drops.some((d) => d.chain === r.item.family));
      assert.equal(s.board[0].stock, level.maxStock - 1);
      E.tick(s, NOW + level.rechargeSeconds * 1000);
      assert.equal(s.board[0].stock, level.maxStock);
    }
  });
test("unlocked drop filtering and deterministic persisted RNG use runtime distributions", () => {
  const s = blank();
  put(s, 0, "gen_supply:12");
  s.stage = 5;
  s.infiniteUntil = NOW + 1e12;
  const counts = {};
  for (let i = 0; i < 20000; i++) {
    s.board[0].stock = 180;
    removeOutputs(s, 0);
    const r = E.generate(s, 0, NOW);
    counts[r.item.family] = (counts[r.item.family] || 0) + 1;
    assert.ok(!["gen_flower"].includes(r.item.family));
  }
  assert.ok(Math.abs(counts.pantry / 20000 - 0.5 / 0.9) < 0.025);
  const restored = E.createGame(E.serialize(s), NOW);
  removeOutputs(s, 0);
  removeOutputs(restored, 0);
  assert.equal(
    E.itemKey(E.generate(s, 0, NOW).item),
    E.itemKey(E.generate(restored, 0, NOW).item),
  );
});
test("producer merge preserves stock, overflow and slower normalized cooldown", () => {
  const s = blank(),
    a = put(s, 0, "gen_tools:4"),
    b = put(s, 1, "gen_tools:4");
  a.stock = 22;
  b.stock = 21;
  a.rechargeRemaining = 120000;
  b.rechargeRemaining = 300000;
  assert.equal(E.move(s, 0, 1, NOW).ok, true);
  const out = s.board[1];
  assert.equal(out.stock, 24);
  assert.equal(out.stockOverflow, 19);
  assert.ok(Math.abs(out.rechargeRemaining - 300000 * 4800 / 9120) < 1e-6);
  E.tick(s, NOW + 99999999);
  assert.equal(out.stockOverflow, 19);
  assert.equal(out.stock, 24);
  const c = blank();
  put(c, 0, "gen_tools:3");
  put(c, 1, "gen_tools:3");
  E.move(c, 0, 1, NOW);
  assert.equal(c.board[1].stock, 0);
  assert.equal(c.board[1].rechargeRemaining, 9120000);
});
test("all opened finite/container sources reject merge, split and upgrade without washing draws", () => {
  for (const id of [
    "seedbag:4",
    "comfort:8",
    "tasting:4",
    "keys:5",
    "blackbag:1",
    "pinkbag:1",
    "tipjar:2",
    "energybox:1",
  ]) {
    const s = blank();
    put(s, 0, id);
    put(s, 1, id);
    if (
      ["blackbag", "pinkbag", "tipjar", "energybox"].includes(s.board[0].family)
    )
      E.collectItem(s, 0, NOW);
    else E.generate(s, 0, NOW);
    unchanged(s, () => E.move(s, 0, 1, NOW));
    const scissors = tool(s, "splitter:3"),
      upgrade = tool(s, "upgrade:1");
    unchanged(s, () => E.useTool(s, scissors, 0, NOW));
    unchanged(s, () => E.useTool(s, upgrade, 0, NOW));
  }
});
test("full board production, draw and split preserve every asset including RNG", () => {
  for (const id of [
    "gen_food:5",
    "seedbag:4",
    "comfort:8",
    "tipjar:2",
    "energybox:1",
  ]) {
    const s = blank();
    put(s, 0, id);
    fill(s);
    unchanged(s, () =>
      ["tipjar:1", "energybox:1"].includes(id)
        ? E.collectItem(s, 0, NOW)
        : E.generate(s, 0, NOW),
    );
  }
  const s = fill(blank());
  put(s, 0, "food:3");
  {
    const selection = tool(s, "splitter:3");
    unchanged(s, () => E.useTool(s, selection, 0, NOW));
  }
});
test("offline auto caps buffers, pauses in inventory, resumes fractional time and flushes only adjacent", () => {
  const s = blank(),
    source = put(s, 24, "herb:6");
  E.tick(s, NOW + 900000);
  assert.equal(source.autoRemaining, 900000);
  E.storeItem(s, 24, NOW + 900000);
  E.tick(s, NOW + 86400000);
  assert.equal(source.autoRemaining, 900000);
  E.retrieveItem(s, 0, NOW + 86400000);
  const i = s.board.indexOf(source);
  E.tick(s, NOW + 86400000 + 899999);
  assert.equal(source.autoBuffer, 0);
  E.tick(s, NOW + 86400000 + 900000, { offline: true });
  assert.equal(source.autoBuffer, 1);
  E.tick(s, NOW + 86400000 + 900000);
  assert.equal(source.autoBuffer, 0);
  assert.equal(s.board.filter((x) => x?.family === "snail").length, 1);
  assert.ok(i >= 0);
});
test("auto merge transfers buffers to pending and preserves timer ratio and summed credit", () => {
  const s = blank(),
    a = put(s, 0, "lost:5"),
    b = put(s, 1, "lost:5");
  a.autoBuffer = 4;
  b.autoBuffer = 4;
  a.autoRemaining = 1800000;
  b.autoRemaining = 2700000;
  a.timeCredit = 300000000;
  b.timeCredit = 300000000;
  E.move(s, 0, 1, NOW);
  assert.equal(s.pending.filter((x) => x.family === "comfort").length, 8);
  assert.equal(s.board[1].timeCredit, 600000000);
  assert.ok(Math.abs(s.board[1].autoRemaining - 2700000 * 2040 / 4020) < 1e-6);
  {
    const selection = tool(s, "stopwatch:1");
    unchanged(s, () => E.useTool(s, selection, 1, NOW));
  }
});
test("bag unlock freezes chapter pool, pauses in storage and gives exactly original draw count", () => {
  const s = blank();
  s.stage = 0;
  const bag = put(s, 0, "blackbag:1");
  E.collectItem(s, 0, NOW);
  assert.deepEqual(
    bag.frozenPool.map((x) => x.chain),
    ["gen_tools"],
  );
  E.storeItem(s, 0, NOW + 100000);
  E.tick(s, NOW + 10000000);
  E.retrieveItem(s, 0, NOW + 10000000);
  const index = s.board.indexOf(bag);
  assert.equal(bag.timerRemaining, 500000);
  E.tick(s, NOW + 10500000);
  s.stage = 12;
  for (let i = 0; i < 10; i++) {
    const r = E.collectItem(s, index, NOW + 10500000);
    assert.equal(r.ok, true);
    assert.equal(r.item.family, "gen_tools");
    removeOutputs(s, index);
  }
  assert.equal(s.board[index], null);
});
test("stopwatch retains blocked credit, hourglass does not advance account clocks", () => {
  const s = blank(),
    p = put(s, 0, "gen_food:5");
  const stop = tool(s, "stopwatch:1");
  E.useTool(s, stop, 0, NOW);
  assert.equal(p.stock, 12);
  assert.equal(s.board[0].timeCredit, 3600000);
  E.generate(s, 0, NOW);
  E.tick(s, NOW);
  assert.equal(s.board[0].stock, 11);
  assert.equal(s.board[0].timeCredit, 0);
  assert.equal(s.board[0].rechargeRemaining, 237*60000-3600000);
  s.energy = 20;
  const before = s.lastEnergyAt;
  E.useTool(s, tool(s, "timeskip:5"), null, NOW);
  assert.equal(s.energy, 20);
  assert.equal(s.lastEnergyAt, before);
  assert.equal(s.infiniteUntil, 0);
});
test("recharge tool forbids waste and finite source; upgrades conserve empty inventory", () => {
  const s = blank();
  const p = put(s, 0, "gen_tools:4");
  p.stock = 18;
  const c = tool(s, "charge:1");
  unchanged(s, () => E.useTool(s, c, 0, NOW));
  p.stock = 14;
  assert.equal(E.useTool(s, c, 0, NOW).ok, true);
  assert.equal(s.board[0].stock, 19);
  s.board[0].stock = 0;
  s.board[0].rechargeRemaining = 300000;
  E.useTool(s, tool(s, "upgrade:2"), 0, NOW);
  assert.equal(s.board[0].stock, 0);
  assert.ok(Math.abs(s.board[0].rechargeRemaining - 300000 * 4800 / 9120) < 1e-6);
  put(s, 1, "seedbag:4");
  {
    const selection = tool(s, "charge:1");
    unchanged(s, () => E.useTool(s, selection, 1, NOW));
  }
});
test("last supply source and required recipe tool cannot be sold, discarded or submitted", () => {
  const s = blank();
  put(s, 0, "gen_food:5");
  unchanged(s, () => E.discardItem(s, 0, NOW));
  put(s, 1, "tools:3");
  unchanged(s, () => E.sellItem(s, 1));
  s.orders = [
    {
      id: "protect",
      slot: 0,
      needs: [{ family: "tools", level: 3, count: 1 }],
      coins: 10,
      xp: 1,
      stars: 1,
    },
  ];
  assert.equal(E.getOrderProgress(s, s.orders[0]).ready, false);
  put(s, 2, "tools:4");
  assert.equal(E.sellItem(s, 1).ok, true);
  const id = tool(s, "upgrade:1");
  put(s, 3, "herb:6");
  unchanged(s, () => E.useTool(s, id, 3, NOW));
});
test("recipe consumes exact counts and energy on full board with reusable tool", () => {
  const s = fill(blank());
  put(s, 0, "tools:3");
  put(s, 1, "food:3");
  put(s, 2, "food:2");
  const before = s.energy;
  assert.equal(E.cookRecipe(s, "golden-toast", NOW).ok, true);
  assert.equal(s.energy, before - 2);
  assert.equal(s.board[0].family, "tools");
  assert.equal(E.itemKey(s.board[1]), "food:4");
  assert.equal(s.board[2], null);
});
test("resources preserve caps in pending credits, storage purchase counters ignore free slots", () => {
  const s = blank();
  s.energy = 995;
  put(s, 0, "energy:5");
  E.collectItem(s, 0, NOW);
  assert.equal(s.energy, 999);
  assert.equal(s.credits.energy, 96);
  s.coins = 1e9 - 2;
  put(s, 1, "coins:6");
  E.collectItem(s, 1, NOW);
  assert.equal(s.coins, 1e9);
  assert.equal(s.credits.coins, 118);
  s.storageCapacity = 59;
  assert.equal(E.storageExpansionCost(s), 40);
  E.expandStorage(s);
  assert.equal(s.storageCapacity, 60);
  {
    const selection = tool(s, "backpack:1");
    unchanged(s, () => E.useTool(s, selection, null, NOW));
  }
});
test("daily, weekly, levels and chapter rewards are idempotent with Shanghai period keys", () => {
  const s = blank();
  E.claimDaily(s, NOW);
  const count = s.pending.length;
  unchanged(s, () => E.claimDaily(s, NOW));
  assert.equal(s.pending.length, count);
  s.day.orders = 3;
  s.week.orders = 20;
  assert.equal(E.claimCommission(s, "day", NOW).ok, true);
  unchanged(s, () => E.claimCommission(s, "day", NOW));
  assert.equal(E.claimCommission(s, "week", NOW).ok, true);
  unchanged(s, () => E.claimCommission(s, "week", NOW));
  s.stage = 0;
  s.mainCompleted = E.CHAPTERS[0].orders.slice();
  s.stars = 8;
  E.claimChapter(s, 0, NOW);
  assert.equal(s.stage, 1);
  assert.equal(s.stars, 5);
  unchanged(s, () => E.claimChapter(s, 0, NOW));
  assert.ok(s.pending.some((x) => E.itemKey(x) === "gen_drink:4"));
});
test("all 96 actual main orders can complete in sequence, reward once and unlock 12 chapters", () => {
  const s = blank();
  s.energy = 999;
  for (const o of E.BALANCE.storyOrders) {
    s.board.fill(null);
    for (const n of o.needs)
      for (let k = 0; k < n.count; k++)
        put(
          s,
          s.board.findIndex((x) => !x),
          `${n.family}:${n.level}`,
        );
    assert.equal(E.fulfillOrder(s, o.id, NOW).ok, true, o.id);
    assert.equal(E.fulfillOrder(s, o.id, NOW).ok, false);
    if (o.id === E.CHAPTERS[s.stage].orders.at(-1))
      assert.equal(E.claimChapter(s, s.stage, NOW).ok, true);
  }
  assert.equal(s.stage, 12);
  assert.equal(s.mainCompleted.length, 96);
  assert.ok(s.pending.some((x) => x.family === "honor"));
  assert.equal(new Set(s.pending.map((x) => x.id)).size, s.pending.length);
});
test("repeat slots have available sources, frozen rewards, unique signatures and paid refresh limits", () => {
  const s = E.createGame(null, NOW);
  s.coins = 10000;
  for (let i = 0; i < 10; i++)
    assert.equal(E.refreshOrder(s, s.orders[0].id, NOW).ok, true);
  assert.equal(s.coins, 9650);
  unchanged(s, () => E.refreshOrder(s, s.orders[0].id, NOW));
  assert.equal(s.orders.length, 3);
  assert.equal(new Set(s.orders.map((o) => JSON.stringify(o.needs))).size, 3);
  assert.ok(
    new Set(s.orders.flatMap((o) => o.needs.map((n) => n.family))).size <= 3,
  );
  const b = blank();
  b.orders = [];
  E.tick(b, NOW);
  assert.equal(b.orders.length, 0);
});
for (const version of [1, 2])
  test(`v${version} assets migrate at exact value and survive v3 reload without repeated grants`, () => {
    const old = oldGame(null, NOW);
    old.version = version;
    old.stage = 8;
    old.xp = 275;
    old.boosters = { scissors: 3, hourglass: 4 };
    old.energy = 1100;
    old.coins = 1e9 + 25;
    old.pending.push({ id: "old-energy", family: "energy", level: 4 });
    const original = JSON.stringify(old);
    const s = E.createGame(original, NOW);
    assert.equal(s.energy, 999);
    assert.equal(s.credits.energy, 101);
    assert.equal(s.coins, 1e9);
    assert.equal(s.credits.coins, 25);
    assert.equal(s.gems, 0);
    assert.equal(s.xp, E.levelFloor(3) + 105);
    assert.equal(s.legacyFullRefill, 4);
    assert.equal(s.tools.length, 3);
    assert.ok(s.pending.some((x) => E.itemKey(x) === "legacy_energy:4"));
    assert.equal(E.itemKey(s.board[0]), "gen_food:5");
    const n = s.pending.length;
    const again = E.createGame(E.serialize(s), NOW);
    assert.equal(again.pending.length, n);
    assert.equal(again.mainCompleted.length, 64);
    assert.equal(JSON.stringify(old), original);
  });
test("unknown future, corrupted and duplicate-ID saves never become new games", () => {
  assert.throws(() => E.createGame({ version: 5 }, NOW), E.SaveError);
  assert.throws(() => E.createGame("oops", NOW), E.SaveError);
  const s = E.createGame(null, NOW);
  s.board[1] = structuredClone(s.board[0]);
  assert.throws(() => E.createGame(s, NOW), E.SaveError);
});
test("all 99 level rewards enqueue once after crossing multiple levels; repeated discovery pays zero", () => {
  const s = blank();
  s.xp = 0;
  s.levelRewardClaimedThrough = 1;
  s.orders = [
    {
      id: "xp",
      slot: 0,
      needs: [{ family: "food", level: 1, count: 1 }],
      standardCost: 4,
      coins: 1,
      stars: 1,
      xp: E.levelFloor(100),
    },
  ];
  put(s, 0, "food:1");
  assert.equal(E.fulfillOrder(s, "xp", NOW).ok, true);
  assert.equal(E.getLevel(s), 100);
  for (const row of E.BALANCE.levelRewards)
    assert.equal(s.claimed[`level:${row.level}`], true);
  const count = s.pending.length;
  E.tick(s, NOW + 1000);
  assert.equal(s.pending.length, count);
  const xp = s.xp;
  put(s, 0, "food:1");
  assert.equal(s.xp, xp);
  assert.equal(E.getLevel({ ...s, xp: s.xp + 1e8 }), 100);
});
test("maturity and active recharge pause in pending and storage across reload", () => {
  const s = blank();
  const delayed = E.makeItem(s, "story:5", NOW, { location: "pending" });
  s.pending = [delayed];
  E.tick(s, NOW + 1e8);
  assert.equal(delayed.timerRemaining, 7200000);
  E.claimPending(s, NOW + 1e8);
  E.tick(s, NOW + 1e8 + 1800000);
  E.storeItem(s, 0, NOW + 1e8 + 1800000);
  const restored = E.createGame(E.serialize(s), NOW + 2e8);
  assert.equal(restored.inventory[0].timerRemaining, 5400000);
  E.retrieveItem(restored, 0, NOW + 2e8);
  E.tick(restored, NOW + 2e8 + 5400000);
  assert.equal(restored.pending.filter((x) => x.family === "mascot").length, 4);
});
test("clock rollback cannot claim historical days, recharge backwards or create energy", () => {
  const s = blank();
  E.claimDaily(s, NOW + 86400000);
  unchanged(s, () => E.claimDaily(s, NOW));
  assert.equal(s.lastNow, NOW + 86400000);
  s.energy = 0;
  s.lastEnergyAt = s.lastNow;
  assert.equal(E.tickEnergy(s, NOW), 0);
  put(s, 0, "gen_food:5");
  const result = E.generate(s, 0, s.lastNow + 120000);
  assert.equal(result.ok, true);
  assert.equal(s.energy, 0);
});
test("discard undo is frozen and atomic on full board, only one undo survives", () => {
  const s = blank();
  const p = put(s, 0, "blackbag:1");
  E.collectItem(s, 0, NOW);
  E.discardItem(s, 0, NOW + 100000);
  assert.equal(s.discarded.item.timerRemaining, 500000);
  fill(s);
  unchanged(s, () => E.undoDiscard(s, NOW + 110000));
  s.board[0] = null;
  E.undoDiscard(s, NOW + 110000);
  assert.equal(s.board[0].timerRemaining, 500000);
  assert.equal(s.board[0].id, p.id);
  unchanged(s, () => E.undoDiscard(s, NOW + 110000));
});
test("all 10 recipes enforce energy, materials and minimum reusable tools at runtime", () => {
  for (const r of E.RECIPES) {
    const s = blank();
    s.stage = r.unlockStage;
    put(s, 0, `tools:${r.toolLevel}`);
    let i = 1;
    for (const n of r.needs)
      for (let c = 0; c < n.count; c++) put(s, i++, `${n.family}:${n.level}`);
    s.energy = 0;
    s.lastEnergyAt = NOW;
    if (r.energyCost) unchanged(s, () => E.cookRecipe(s, r.id, NOW));
    s.energy = 100;
    assert.equal(E.cookRecipe(s, r.id, NOW).ok, true, r.id);
    assert.equal(s.energy, 100 - r.energyCost);
    assert.equal(E.itemKey(s.board[1]), `${r.output.family}:${r.output.level}`);
    assert.equal(s.board[0].family, "tools");
  }
});
test("bubble uses gems, cannot enter storage, and expires only once", () => {
  const s = blank();
  s.board[0] = {
    id: "bubble-test",
    family: "bubble",
    item: { family: "food", level: 3 },
    level: 3,
    cost: 2,
    expiresAt: NOW + 120000,
  };
  unchanged(s, () => E.storeItem(s, 0, NOW));
  const gems = s.gems,
    coins = s.coins;
  assert.equal(E.resolveBubble(s, 0, true, NOW).ok, true);
  assert.equal(s.gems, gems - 2);
  assert.equal(s.coins, coins);
  unchanged(s, () => E.resolveBubble(s, 0, true, NOW));
});
test("legacy chest pays original seven-device pool and refill effect, no new equipment leakage", () => {
  const s = blank();
  s.stage = 12;
  put(s, 0, "legacy_chest:3");
  assert.equal(E.collectItem(s, 0, NOW).ok, true);
  assert.equal(s.legacyFullRefill, 2);
  assert.ok(s.pending.some((x) => E.itemKey(x) === "legacy_energy:4"));
  assert.ok(s.pending.some((x) => E.itemKey(x) === "legacy_coins:4"));
  assert.ok(
    !s.pending.some((x) =>
      ["gen_supply", "gen_publicity", "gen_flower", "gen_recycle"].includes(
        x.family,
      ),
    ),
  );
  put(s, 0, "gen_tools:4");
  s.board[0].stock = 0;
  assert.equal(E.useBooster(s, "hourglass", 0, NOW).ok, true);
  assert.equal(s.board[0].stock, 20);
  assert.equal(s.legacyFullRefill, 1);
});
test("pantry separate clocks operate at all eleven levels; parts preserve automatic merge buffer", () => {
  for (let level = 1; level <= 11; level++) {
    const s = blank();
    put(s, 0, `pantry:${level}`);
    assert.equal(E.generate(s, 0, NOW).ok, true);
    assert.equal(s.board[0].stock, 15);
    const rules=E.sourceRules(s.board[0]);
    E.tick(s, NOW + rules.manual.rechargeSeconds*1000, { offline: true });
    assert.equal(s.board[0].stock, 16);
    assert.equal(s.board[0].autoBuffer, rules.auto ? Math.min(rules.auto.capacity, Math.floor(rules.manual.rechargeSeconds/rules.auto.intervalSeconds)) : 0);
  }
});
test("all item renderings retain their IDs and the original 66 slots use refreshed classic identities", async () => {
  const old = await import("../dist/legacy-catalog.mjs");
  const defs = Object.values(E.ITEMS),
    svgs = defs.map((d) => icon(d.icon));
  assert.equal(new Set(svgs).size, 422);
  for (const [family, chain] of Object.entries(old.CHAINS).filter(
    ([f]) => !["energy", "coins", "chest"].includes(f),
  ))
    for (const d of chain) {
      const refreshed=icon(E.ITEMS[d.id].icon);
      assert.ok(refreshed.includes(`data-classic-item="${d.id}"`), d.id);
      assert.notEqual(refreshed, icon(d.icon), d.id);
    }
});
test("new player balances start at exactly the approved values including zero XP", () => {
  const s = E.createGame(null, NOW);
  assert.deepEqual(
    [s.coins, s.gems, s.energy, s.stars, s.xp],
    [120, 20, 100, 0, 0],
  );
});
test("missing legacy sources are repaired only into pending, keeping empty board positions", () => {
  const old = oldGame(null, NOW);
  old.board.fill(null);
  old.inventory = [];
  old.pending = [];
  old.locked = [];
  const s = E.createGame(old, NOW);
  assert.equal(s.board.filter(Boolean).length, 0);
  for (const id of ["gen_food:5", "gen_tools:4", "gen_produce:3"])
    assert.ok(s.pending.some((x) => E.itemKey(x) === id));
  const n = s.pending.length;
  assert.equal(E.createGame(E.serialize(s), NOW).pending.length, n);
});
test("invalid v3 clock and inconsistent item IDs are protected before mutation", () => {
  const s = E.createGame(null, NOW);
  s.board[0].clockAt = null;
  assert.throws(() => E.createGame(s, NOW), E.SaveError);
  const other = E.createGame(null, NOW);
  other.board[0].family = "food";
  assert.throws(() => E.createGame(other, NOW), E.SaveError);
});
