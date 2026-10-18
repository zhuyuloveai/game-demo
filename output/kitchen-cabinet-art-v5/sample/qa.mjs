// Explicit localhost-only fixtures, isolated from the player's normal save.
import { createGame, makeItem, BALANCE, mainOrder } from "./engine.mjs";
export function fixture(kind, now = Date.now()) {
  if(kind==="cabinet-3d")kind="island-3d";
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
  if (["island","island-long","island-3d"].includes(kind)) {
    // Visual comparison only: real, interactive items in an isolated localhost QA save.
    s.coins=120;s.gems=20;s.energy=100;s.stars=12;
    const layout={0:'gen_food:5',1:'food:2',4:'food:1',6:'vegetable:2',8:'tableware:1',11:'tools:3',12:'food:4',14:'vegetable:2',16:'fruit:2',18:'tools:2',20:'food:2',21:'gen_food:5',23:'food:1',25:'food:3',27:'tableware:1',29:'food:4',31:'food:6',33:'fruit:2',35:'tools:2',37:'vegetable:2',39:'food:1',41:'food:2',43:'fruit:2',45:'tableware:1',47:'food:6',49:'food:2',51:'tools:3',53:'gen_food:5',55:'food:3',57:'vegetable:2',59:'food:4',61:'tools:2'};
    for(const [index,id]of Object.entries(layout))put(Number(index),id);
    if(kind==='island-3d'){
      s.board.fill(null);
      const samples={0:'gen_food:5',1:'food:2',4:'food:1',6:'vegetable:2',8:'tableware:2',11:'tools:2',12:'food:4',14:'vegetable:2',16:'fruit:3',18:'tools:4',20:'food:2',21:'gen_food:5',23:'food:1',25:'fruit:2',27:'tableware:2',29:'food:4',31:'food:2',33:'fruit:3',35:'tools:4',37:'vegetable:2',39:'food:1',41:'fruit:2',43:'fruit:3',45:'tableware:2',47:'food:4',49:'food:2',51:'tools:2',53:'gen_food:5',55:'food:1',57:'vegetable:2',59:'food:4',61:'tools:4'};
      for(const [index,id]of Object.entries(samples))put(Number(index),id);
    }
    if(kind==='island-long'){
      // Real catalogue names and a normal two-need order, with no rule changes.
      s.orders[0].needs=[{family:'tools',level:13,count:1},{family:'food',level:11,count:1}];
      put(2,'tools:13');put(3,'food:11');
    }
  } else if (kind === "full-art") {
    s.coins=120;s.gems=20;s.energy=100;s.stars=12;
    const samples={0:'gen_food:5',1:'food:2',2:'food:2',4:'food:4',6:'vegetable:2',7:'tools:1',9:'tools:2',11:'tools:4',12:'food:5',14:'fruit:1',16:'fruit:3',17:'drink:2',19:'drink:5',20:'tableware:2',21:'gen_drink:4',23:'chinese:2',25:'japanese:3',27:'italian:3',28:'flowers:1',30:'herb:3',32:'food:6',34:'mexican:2',35:'doll:4',37:'mascot:1',39:'cats:2',41:'snail:2',42:'gen_produce:3',44:'seedbag:2',46:'pantry:3',48:'preservation:2',49:'coins:2',51:'energy:2',53:'chest:1',55:'linen:2',56:'bakeware:3',58:'tableware:4',60:'tools:6',62:'food:8'};
    for(const [index,id] of Object.entries(samples))put(Number(index),id);
  } else if (kind === "special") {
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
  if(!["island","island-long","island-3d","full-art"].includes(kind))s.orders = [];
  s.events = [];
  return s;
}

// A PR6-shaped save for the visible migration button; the frozen regression
// fixture in tests/fixtures/v3-49.json additionally checks real historical data.
export async function legacyV3Fixture(now = Date.now()) {
  const { default: rules } = await import('./v3-rules.mjs');
  const s = fixture('resources', now);
  s.version = 3;
  s.balanceVersion = 'kitchen-reference-v1-draft';
  s.board = s.board.slice(0, 49);
  for (const item of s.board.filter(Boolean)) {
    const r = rules[item.itemId];
    if (r?.manual?.mode === 'recharge') {
      item.stock = Math.min(item.stock, r.manual.maxStock);
      item.rechargeRemaining = r.manual.rechargeSeconds * 1000;
    }
    if (r?.auto) item.autoRemaining = r.auto.intervalSeconds * 1000;
  }
  return s;
}
