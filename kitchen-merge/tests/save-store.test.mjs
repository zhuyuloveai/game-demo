import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sha256, backupBeforeMigration } from "../dist/save-store.mjs";
function storage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    map,
  };
}
test("HTTP-compatible SHA-256 matches standard empty, UTF8 and full save vectors", () => {
  for (const text of [
    "",
    "abc",
    "小厨合合，保存原文🙂",
    JSON.stringify({
      version: 2,
      items: Array(100).fill({ name: "食材", stock: 12 }),
    }),
    "x".repeat(100000),
  ])
    assert.equal(sha256(text), createHash("sha256").update(text).digest("hex"));
});
test("backup preserves exact JSON before migration and does not write active save", () => {
  const s = storage(),
    raw = ' { "version": 2, "coins": 73 } ';
  s.setItem("active", raw);
  const out = backupBeforeMigration(s, "kitchen", raw);
  assert.equal(s.getItem("active"), raw);
  assert.equal(s.getItem("kitchen-migration-backup"), raw);
  assert.equal(s.getItem("kitchen-migration-backup-sha256"), out.digest);
  const newer = '{"version":2,"coins":99}';
  backupBeforeMigration(s, "kitchen", newer);
  assert.equal(s.getItem("kitchen-v2-backup"), raw);
  assert.equal(s.getItem("kitchen-migration-backup"), newer);
});
test("quota/write failures stop backup without touching the active save; QA prefix stays isolated", () => {
  const s = storage(),
    raw = '{"version":1}';
  s.setItem("active", raw);
  s.setItem("little-kitchen-migration-backup", "player-backup");
  backupBeforeMigration(s, "little-kitchen-qa-migration", raw);
  assert.equal(s.getItem("little-kitchen-migration-backup"), "player-backup");
  assert.throws(
    () =>
      backupBeforeMigration(
        {
          ...s,
          setItem() {
            throw Error("Quota");
          },
        },
        "failed",
        raw,
      ),
    /Quota/,
  );
  assert.equal(s.getItem("active"), raw);
  assert.throws(() => backupBeforeMigration(s, "future", '{"version":4}'));
});
