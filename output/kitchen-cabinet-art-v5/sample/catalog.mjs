import BALANCE from "./balance-data.mjs";
import V3_RULES from "./v3-rules.mjs";
import {
  CHAINS as OLD,
  PRODUCER_DEFS as OLD_PRODUCERS,
} from "./legacy-catalog.mjs";
export { BALANCE };
export const BALANCE_VERSION = BALANCE.balanceVersion;
export const CHAINS = Object.fromEntries(
  BALANCE.chains.map((chain) => [
    chain.id,
    chain.items.map((item) => ({
      ...item,
      family: chain.id,
      kind: chain.kind,
      unlockStage: chain.unlockChapter - 1,
      icon: `item/${item.id}`,
      color: OLD[chain.id]?.[0]?.color || "#bba689",
    })),
  ]),
);
export const ITEMS = Object.fromEntries(
  Object.values(CHAINS)
    .flat()
    .map((item) => [item.id, item]),
);
export const FAMILY_META = Object.fromEntries(
  BALANCE.chains.map((c) => [
    c.id,
    {
      ...c,
      description: c.reference || `${c.name}：同物合成，逐级收藏。`,
      source: "",
    },
  ]),
);
export const PRODUCER_DEFS = Object.fromEntries(
  BALANCE.producers.map((p) => [
    p.id,
    {
      ...p,
      unlockStage: p.unlockChapter - 1,
      icon: OLD_PRODUCERS[p.id]?.icon || `item/${p.chain}:${p.activeLevel}`,
      families: p.drops.map((d) => d.chain),
    },
  ]),
);
export const RECIPES = BALANCE.recipes.map((r) => ({
  ...r,
  needs: r.inputs,
  toolLevel: r.tool.minimumLevel,
  unlockStage: r.unlockChapter - 1,
  description: `消耗 ${r.energyCost} 体力，厨具保留。`,
}));
export const CHAPTERS = BALANCE.chapters.map((c, i) => ({
  ...c,
  stage: i,
  number: c.chapter,
  description: `完成本章八份主线订单，使用 ${c.stars} 颗星星布置厨房。`,
  icon: [
    "coffee",
    "herbpot",
    "bento",
    "pizza",
    "cupboard",
    "teapot",
    "oven",
    "gift",
    "plate",
    "herbpot",
    "book",
    "star",
  ][i],
  reward: {},
  tasks: [
    { id: "main", kind: "main", target: 8, label: "完成本章8份主线订单" },
  ],
}));
export const RENOVATIONS = CHAPTERS;
export const SHOP_ITEMS = [
  ...BALANCE.economy.shop
    .filter((s) => s.item)
    .map((s) => ({
      ...s,
      cost: s.coins,
      name: ITEMS[s.item].name,
      icon: ITEMS[s.item].icon,
      description: `每日限购 ${s.dailyLimit} 件，送入待领区。`,
      unlockStage: 0,
    })),
  ...BALANCE.producers.map((p) => ({
    id: `part-${p.id}`,
    item: `${p.chain}:1`,
    cost: 300,
    dailyLimit: 1,
    limitKey: "equipment-choice",
    name: `${p.name}零件`,
    icon: `item/${p.chain}:1`,
    description: "任选设备零件，每日合计限购1件。",
    unlockStage: p.unlockChapter - 1,
  })),
];
const match = (t, id) => t.source === id || t.sourceLevels?.includes(id);
export const itemKey = (item) =>
  item?.itemId || `${item?.family}:${item?.level}`;
export const definition = (item) =>
  ITEMS[typeof item === "string" ? item : itemKey(item)];
export const transitionsFor = (item) =>
  BALANCE.transitions.filter((t) =>
    match(t, typeof item === "string" ? item : itemKey(item)),
  );
export function sourceRules(item) {
  // Migration settles already-earned time under the previous rules. Only old
  // permanent nests retain this flag after upgrading, preserving their rights.
  if (item?.legacyV3 && V3_RULES[itemKey(item)])
    return { manual: null, auto: null, delay: null, cross: null, ...V3_RULES[itemKey(item)] };
  const id = itemKey(item),
    d = definition(item),
    p = d?.family.startsWith("gen_") ? PRODUCER_DEFS[d.family.slice(4)] : null;
  const main = p?.levels[d.level - 1];
  const rules = transitionsFor(item);
  return {
    manual: main?.active
      ? { ...main, mode: "recharge", drops: p.drops }
      : rules.find((t) =>
          ["recharge", "finite", "finite_sequence"].includes(t.mode),
        ),
    auto: rules.find((t) => t.mode === "auto"),
    delay: rules.find((t) => t.mode === "delayed_once"),
    cross: rules.find((t) => t.mode === "cross_merge"),
  };
}
export const isSource = (item) => !!sourceRules(item).manual;
export const isPermanent = (item) => {
  const r = sourceRules(item);
  return r.manual?.mode === "recharge" || !!r.auto;
};
export function sourceDescription(id) {
  const d = ITEMS[id];
  if (!d) return "";
  const sources = [];
  for (const p of BALANCE.producers)
    if (p.drops.some((x) => x.chain === d.family)) sources.push(p.name);
  for (const t of BALANCE.transitions)
    if (
      t.output === id ||
      t.outputs?.some((x) => x.item === id) ||
      t.sequence?.includes(id) ||
      t.onExhaust === id
    )
      sources.push(
        `${ITEMS[t.source || t.sourceLevels[0]]?.name} · ${t.mode === "auto" ? "自动产出" : t.mode === "delayed_once" ? "成熟奖励" : t.mode === "cross_merge" ? "两个合成" : "生产/耗尽"}`,
      );
  if (d.level > 1 && ITEMS[`${d.family}:${d.level - 1}`]?.mergeTo === id)
    sources.push(`两份${ITEMS[`${d.family}:${d.level - 1}`].name}`);
  if (d.kind === "producer") sources.push("对应章节赠送 / 设备包与采购零件");
  if (d.kind === "resource") sources.push("等级、日周委托、每日礼物或同类合成");
  if (d.stackLimit) sources.push(`同级可叠加，最多${d.stackLimit}把`);
  if (d.family === "honor") sources.push("十二章通关后每10份合格订单");
  if (d.kind === "legacy") sources.push("旧档资产保值，保留旧领取值");
  return [...new Set(sources)].join("；");
}
