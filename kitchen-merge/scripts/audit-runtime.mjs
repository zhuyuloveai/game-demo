import assert from "node:assert/strict";
import fs from "node:fs";
import * as E from "../dist/engine.mjs";
import { icon } from "../dist/art.mjs";
const root = new URL("../", import.meta.url),
  now = 1792108800000;
const target = JSON.parse(
  fs.readFileSync(new URL("docs/balance/kitchen-target.json", root), "utf8"),
);
assert.deepEqual(
  E.BALANCE,
  target,
  "published runtime data must exactly match audited design",
);
const coverage = [];
for (const chain of target.chains)
  for (const item of chain.items) {
    const id = item.id,
      d = E.ITEMS[id];
    assert.ok(d);
    assert.equal(d.name, item.name);
    assert.equal(d.level, item.level);
    assert.equal(d.mergeTo, item.mergeTo);
    const svg = icon(d.icon);
    assert.ok(!svg.includes("undefined") && !svg.includes("NaN"));
    assert.ok(E.sourceDescription(id), `missing source ${id}`);
    const s = E.createGame(null, now);
    s.board.fill(null);
    s.locked = [];
    s.pending = [];
    s.board[0] = E.makeItem(s, id, now);
    s.board[1] = E.makeItem(s, id, now);
    const expected = item.mergeTo || E.sourceRules(d).cross?.output || null;
    const r = E.move(s, 0, 1, now);
    if (expected) {
      assert.equal(r.ok, true, id);
      assert.equal(E.itemKey(s.board[1]), expected);
    } else assert.equal(r.ok, false, id);
    coverage.push({
      id,
      name: d.name,
      level: d.level,
      kind: d.kind,
      mergeTo: expected,
      source: E.sourceDescription(id),
      artBytes: svg.length,
      mergeChecked: true,
    });
  }
const report = {
  balanceVersion: E.BALANCE_VERSION,
  definitions: coverage.length,
  newDefinitions: coverage.filter((x) => x.kind !== "legacy").length,
  chains: target.chains.length,
  producers: target.producers.length,
  transitions: target.transitions.length,
  mainOrders: target.storyOrders.length,
  recipes: target.recipes.length,
  items: coverage,
};
if (process.argv.includes("--write"))
  fs.writeFileSync(
    new URL("docs/verification/2026-10-16/runtime-coverage.json", root),
    JSON.stringify(report, null, 2) + "\n",
  );
console.log(JSON.stringify({ ...report, items: undefined }));
