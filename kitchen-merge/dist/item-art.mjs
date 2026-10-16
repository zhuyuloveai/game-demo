// Original warm ceramic, oak and linen silhouettes for the expanded catalogue.
// Every level changes construction, contents or pose; no emoji or text artwork.
import { ITEMS, PRODUCER_DEFS } from "./catalog.mjs";
import { CHAINS as OLD } from "./legacy-catalog.mjs";
const C = {
  cream: "#fff3dd",
  oak: "#d3aa79",
  dark: "#86664e",
  pink: "#dba2aa",
  green: "#92aa78",
  gold: "#e5bc63",
  blue: "#9bafbc",
  ink: "#665b54",
};
const p = (d, fill = C.cream, other = "") =>
  `<path d="${d}" fill="${fill}" ${other}/>`;
const rect = (x, y, w, h, r = 3, fill = C.cream) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const circle = (x, y, r, fill = C.pink) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const line = (d, color = C.dark) =>
  p(d, "none", `stroke="${color}" stroke-width="2"`);
const leaf = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})">${p("M0 0C-14-1-16-15-9-18 3-16 5-8 0 0Z", C.green)}${p("M1-1C15-5 18-19 10-21 1-17-2-9 1-1Z", "#b5bf8c")}</g>`;
const flower = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})">${[-8, 0, 8].map((dx, i) => circle(dx, -Math.abs(dx) / 2, 6, i % 2 ? C.cream : C.pink)).join("")}${circle(0, -2, 4, C.gold)}${line("M0 5v18")}${leaf(0, 22, 0.45)}</g>`;
const plate = (x = 40, y = 59, rx = 29) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="9" fill="${C.cream}"/><ellipse cx="${x}" cy="${y - 2}" rx="${rx - 4}" ry="5" fill="#e9d8bc"/>`;
const ribbon = (y = 56) => p(`M17 ${y}h46v9l-9-3-14 6-14-6-9 3Z`, C.pink);
const book = (level, kind = "book") => {
  const a = level % 3;
  return `${level > 3 ? rect(13, 60, 51, 6, 2, C.oak) : ""}${rect(18, 14 - a * 2, 44, 51 + a * 2, 4, kind === "courses" ? C.blue : C.oak)}${rect(23, 13 - a * 2, 40, 47 + a * 2, 3, C.cream)}${line(`M28 14v46M33 27h23M33 34h${14 + level}M33 42h20`)}${kind === "tasting" ? circle(45, 51, 7, C.pink) : kind === "timegate" ? p("M40 55V39q9-15 18 0v16Z", C.blue) : leaf(46, 55, 0.6)}${level >= 5 ? ribbon(60) : ""}`;
};
const bag = (level, empty = false) => {
  const count = level === 4 ? 3 : level === 3 ? 2 : 1;
  return Array.from(
    { length: count },
    (_, i) =>
      `<g transform="translate(${i * 7 - (count - 1) * 4} ${-i * 5})">${p(`M22 ${empty ? 28 : 18}l7-8 11 3 11-3 7 8-4 11 8 ${empty ? 25 : 30}q-20 9-42 0l7-${empty ? 25 : 30}Z`, empty ? "#e0c99d" : C.cream)}${line("M26 30h29M27 53h25")}${empty ? line("M23 36l30 19M30 38l23 10") : leaf(41, 53, 0.8)}</g>`,
  ).join("");
};
function cat(level, mouse = false) {
  const count = level === 8 ? 3 : level === 3 && mouse ? 2 : 1;
  const colors = mouse
    ? ["#b9b2a0", "#999991", "#aaa08c"]
    : [
        "#cbb78f",
        "#faf0da",
        "#dca574",
        "#a5a9a7",
        "#fff2e0",
        "#c4b5a5",
        "#f3e3c8",
      ];
  return Array.from(
    { length: count },
    (_, i) =>
      `<g transform="translate(${count > 1 ? i * 19 - 18 : 0} ${count > 1 ? 14 : 0}) scale(${count > 1 ? 0.65 : 1})">${p("M24 61c-19 4-26-9-16-15 6-4 12 5 5 7", colors[(level - 1) % colors.length])}${p(mouse ? "M24 60c-5-24 3-35 18-35s25 14 21 35Z" : "M22 63c-2-19 4-33 19-33 16 0 23 14 21 33Z", colors[(level - 1) % colors.length])}${mouse ? circle(27, 27, 10, colors[(level - 1) % colors.length]) + circle(53, 27, 10, colors[(level - 1) % colors.length]) : p("M24 31 22 12 36 24M48 24 61 12 59 34Z", colors[(level - 1) % colors.length])}${circle(41, 35, 19, colors[(level - 1) % colors.length])}${circle(34, 34, 1.6, C.ink)}${circle(48, 34, 1.6, C.ink)}${p("m38 41 4 3 4-3Z", C.pink)}${line("M22 41h8m-9 6 9-2m22-4h9m-9 4 10 2")}${level >= 4 ? leaf(54, 62, 0.65) : ""}${level === 7 ? ribbon(54) : ""}${level === 5 ? p("M25 61 21 53 28 55 32 49 37 56 44 51 48 60Z", "#fff5e9") : ""}</g>`,
  ).join("");
}
function cabinet(level) {
  if (level === 1)
    return (
      p("M14 32h52l-5 31H19Z", C.oak) +
      line("M18 40h45M20 48h42M23 34v25m10-25v25m10-25v25m10-25v25")
    );
  if (level === 2)
    return p("m17 46 43-20 7 13-43 20Z", C.oak) + line("M24 48l34-16");
  if (level === 3)
    return rect(15, 24, 50, 39, 2, C.oak) + rect(21, 30, 38, 28, 1, "#7e6953");
  const columns = level >= 7 ? 2 : 1,
    rows = level >= 6 ? 2 : 1;
  return `${level >= 8 ? rect(11, 15, 58, 7, 2, C.oak) : ""}${rect(15, 23, 50, 42, 3, C.oak)}${Array.from(
    { length: columns * rows },
    (_, i) => {
      const x = 20 + (i % columns) * 23,
        y = 28 + Math.floor(i / columns) * 17;
      return (
        rect(
          x,
          y,
          columns === 1 ? 40 : 18,
          rows === 1 ? 30 : 13,
          2,
          level >= 9 ? C.blue : C.cream,
        ) +
        circle(x + (columns === 1 ? 31 : 13), y + 8, 1.6, C.gold) +
        (level >= 9 ? line(`M${x + 3} ${y + 3}l8 8`, "#f7ead7") : "")
      );
    },
  ).join(
    "",
  )}${line("M20 65v5m40-5v5")}${level >= 10 ? ribbon(18) : ""}${level === 11 ? flower(39, 15, 0.55) : ""}`;
}
function generator(f, level) {
  const def = PRODUCER_DEFS[f.slice(4)],
    active = def.activeLevel,
    r = level - active;
  if (r < 0) {
    if (level === 1)
      return `${rect(15, 40, 35, 13, 2, C.oak)}${circle(54, 32, 9, C.blue)}${circle(54, 32, 4, C.cream)}${line("M20 45h20M52 55l12-13m-8 17 12-13")}${rect(24, 24, 16, 8, 2, C.cream)}`;
    if (level === 2)
      return `${p("M15 57 28 23 58 31 64 61Z", C.oak)}${rect(25, 38, 29, 17, 2, C.cream)}${circle(32, 60, 5, C.ink)}${circle(59, 60, 5, C.ink)}${line("M19 52l10-25 25 8")}`;
    return `${rect(16, 21, 48, 44, 2, C.oak)}${rect(22, 28, 36, 30, 0, "#9c8a73")}${line("M21 28l37 30M23 58l33-29")}${level === 4 ? rect(13, 16, 54, 8, 2, C.cream) : ""}`;
  }
  const tiers = 1 + Math.floor(r / 3),
    width = 42 + Math.min(r, 5) * 3;
  let body = "";
  if (["gen_food", "gen_produce", "gen_flower"].includes(f))
    body =
      p(`M${40 - width / 2} 37h${width}l-6 29H${46 - width / 2}Z`, C.oak) +
      line(
        `M${40 - width / 2 + 5} 46h${width - 10}M${40 - width / 2 + 8} 55h${width - 16}`,
      ) +
      p(
        `M${40 - width / 2 + 6} 37q${width / 2 - 6}-${24 + Math.min(r, 4) * 2} ${width - 12} 0`,
        "none",
        `stroke="${C.dark}" stroke-width="4"`,
      ) +
      (f === "gen_food"
        ? p("M21 40q3-23 17-13l5 13Z", C.gold) +
          line("m28 29 3 8m4-11 3 11") +
          rect(43, 28, 14, 14, 3, C.cream)
        : f === "gen_produce"
          ? circle(29, 35, 10, "#cb9277") + leaf(30, 24, 0.5) + leaf(49, 39, 1)
          : flower(31, 27, 0.6) + flower(48, 22, 0.8));
  else if (f === "gen_herb")
    body =
      p(
        `M${18 - Math.min(r, 3)} 41h${44 + Math.min(r, 3) * 2}l-7 26H25Z`,
        C.oak,
      ) +
      leaf(39, 43, 1 + r * 0.07) +
      leaf(52, 44, 0.7) +
      line("M23 48h33");
  else if (f === "gen_supply")
    body =
      line("M18 18h10l7 40h31M29 28h38l-7 25H34") +
      rect(35, 20, 15, 19, 2, C.cream) +
      rect(49, 31, 12, 14, 1, C.pink) +
      circle(37, 65, 6, C.ink) +
      circle(61, 65, 6, C.ink);
  else if (f === "gen_recycle")
    body =
      rect(20, 26, width - 4, 40, 6, C.green) +
      rect(17, 21, width + 2, 9, 3, C.oak) +
      leaf(43, 55, 0.9) +
      line("M25 20v-6h25v6");
  else if (f === "gen_publicity")
    body =
      rect(13, 51, 54, 12, 2, C.oak) +
      line("M19 63v9m41-9v9") +
      rect(20, 24, 27, 27, 2, C.cream) +
      line("M24 29h18M24 35h15m-15 6h13") +
      circle(57, 42, 8, C.pink) +
      leaf(58, 34, 0.5);
  else if (f === "gen_drink")
    body =
      rect(17, 21, width, 43, 5, C.blue) +
      rect(23, 27, width - 12, 18, 3, C.ink) +
      line("M24 48h30M34 43v9m12-9v9") +
      rect(30, 52, 21, 12, 4, C.cream) +
      p("M51 53q13-3 9 6h-8", C.cream) +
      circle(26, 24, 2, C.gold);
  else if (f === "gen_asian")
    body =
      rect(13, 48, 54, 17, 3, C.oak) +
      p("M20 47q0-24 39 0Z", C.cream) +
      rect(20, 47, 39, 6, 3, C.oak) +
      line("M22 20l14 25m0-28 9 26M43 38v-5h8v6");
  else if (f === "gen_mediterranean")
    body =
      rect(12, 28, width + 10, 38, 4, C.oak) +
      p("M21 57V42q20-23 39 0v15Z", C.ink) +
      plate(40, 57, 18) +
      circle(40, 53, 12, C.gold) +
      p("m39 41 6 21-13-5Z", C.pink);
  else
    body =
      rect(16, 36, width, 29, 4, C.oak) +
      line("M19 44h36M21 53h32") +
      p("M28 36V16h8v20M44 36l4-23 8 2-5 21Z", C.blue) +
      circle(24, 22, 7, C.cream);
  // Upgrades add shelves, side racks, cabinets, canopies and fitted legs.
  return `${r >= 3 ? rect(9, 57, 62, 10, 3, C.oak) : ""}${body}${r % 3 >= 1 ? rect(8, 40, 9, 21, 2, C.cream) + line("M10 46h5m-5 6h5") : ""}${r % 3 === 2 ? rect(62, 36, 10, 26, 2, C.cream) + circle(67, 44, 2, C.gold) : ""}${tiers >= 2 ? rect(12, 13, 55, 6, 2, C.oak) + line("M17 20v12m45-12v12") : ""}${tiers >= 3 ? p("M9 13 21 5h39l11 8Z", C.pink) + line("M20 67v6m40-6v6") : ""}${r >= 8 ? ribbon(9) : ""}`;
}
const tierFood = (f, l, old) => {
  const high = l - 6;
  let main = "";
  if (f === "tools")
    return `${rect(10, 20, 60, 46, 4, C.cream)}${Array.from({ length: high < 3 ? high : 2 }, (_, i) => rect(17, 28 + i * (high === 1 ? 0 : 15), 46, high === 1 ? 28 : 11, 3, C.ink)).join("")}${line("M18 24h10m9 0h10m9 0h7")}${high >= 3 ? rect(6, 14, 68, 7, 2, C.oak) : ""}${high >= 4 ? line("M17 66v8m46-8v8") + rect(6, 47, 9, 17, 2, C.oak) : ""}${high >= 5 ? rect(18, 3, 44, 9, 2, C.blue) : ""}${high >= 6 ? line("M11 2v18m59-18v18") : ""}${high >= 7 ? rect(4, 55, 72, 7, 2, C.gold) : ""}${high === 8 ? flower(61, 12, 0.4) : ""}`;
  if (f === "drink" && l === 7)
    return `${plate()}${p("M25 24h19l-3 26H28Z", C.cream)}${p("M25 24q9-7 19 0", C.oak)}${rect(48, 36, 14, 17, 3, C.blue)}${line("M51 36v-8h7v8")}`;
  if (f === "drink" && l === 8)
    return `${rect(18, 19, 43, 43, 9, C.oak)}${line("M21 25h37M20 55h38M31 20v40m17-40v40")}${rect(49, 44, 15, 7, 2, C.ink)}${rect(34, 62, 20, 7, 2, C.cream)}`;
  const table = high >= 2;
  main = table
    ? rect(7, 53, 66, 8, 3, C.oak) + line("M14 61v12m51-12v12")
    : plate();
  if (f === "food" || f === "fruit") {
    const cakes = f === "food" ? Math.min(high + 1, 4) : 3;
    main += Array.from({ length: cakes }, (_, i) => {
      const w = 47 - i * 9,
        y = 48 - i * 10;
      return (
        rect(40 - w / 2, y, w, 9, 2, i % 2 ? C.cream : C.pink) +
        circle(40 - w / 2 + 5, y - 1, 2, C.pink)
      );
    }).join("");
  } else if (f === "tableware")
    main += cabinet(8 + high).replaceAll('y="', 'y="');
  else {
    const bases = {
      vegetable: "salad",
      chinese: "dimSum",
      japanese: "bento",
      italian: "pizza",
      mexican: "taco",
      drink: "coffee",
    };
    const icon = bases[f];
    const raw = old(icon) || old("plate");
    main += `<g transform="translate(0 9) scale(.65)">${raw}</g><g transform="translate(30 16) scale(.56)">${raw}</g>${high > 1 ? `<g transform="translate(8 -12) scale(.45)">${old(f === "drink" ? "coffeetower" : "fruitbowl")}</g>` : ""}`;
  }
  if (high >= 3)
    main +=
      rect(5, 17, 4, 35, 1, C.oak) +
      rect(71, 17, 4, 35, 1, C.oak) +
      p("M3 18 12 9h57l8 9Z", C.pink);
  if (high >= 4) main += flower(12, 45, 0.5) + flower(66, 43, 0.5);
  if (high >= 5) main += ribbon(58);
  return main;
};
export function itemMarkup(id, old) {
  const d = ITEMS[id];
  if (!d) throw Error(`Missing artwork ${id}`);
  let { family: f, level: l } = d;
  if (f.startsWith("legacy_")) f = f.slice(7);
  if (OLD[f]?.[l - 1] && d.kind !== "resource" && d.kind !== "legacy")
    return old(OLD[f][l - 1].icon);
  const shadow = '<ellipse data-shadow="1"/>';
  let body = "";
  if (f.startsWith("gen_")) {
    body = generator(f, l);
    if (l < PRODUCER_DEFS[f.slice(4)].activeLevel) {
      const motif = {
        gen_food: "wheat",
        gen_tools: "spoon",
        gen_produce: "carrot",
        gen_drink: "coffee",
        gen_herb: "basil",
        gen_asian: "bun",
        gen_mediterranean: "pizza",
        gen_supply: "basket",
        gen_publicity: "flour",
        gen_flower: "herbpot",
        gen_recycle: "herbbasket",
      }[f];
      body += `<g transform="translate(27 14) scale(.42)">${old(motif)}</g>`;
    }
  } else if (
    [
      "food",
      "tools",
      "vegetable",
      "fruit",
      "drink",
      "tableware",
      "chinese",
      "japanese",
      "italian",
      "mexican",
    ].includes(f)
  )
    body = tierFood(f, l, old);
  else if (f === "linen") {
    const glove = `${p("M21 52V27q0-10 8-10h12q8 0 8 9v14q12-15 17-5 2 4-13 20v10H23Z", C.cream)}${line("M24 54h28M29 22v26m8-26v26M22 34h25m-25 9h25", C.pink)}`;
    body =
      l === 1
        ? glove
        : `<g transform="translate(-9 6) scale(.8)">${glove}</g><g transform="translate(27 -2) scale(.8)">${glove}</g>${l === 3 ? ribbon(57) : ""}`;
  } else if (f === "preservation")
    body =
      l === 1
        ? rect(21, 24, 38, 29, 3, C.cream) + leaf(42, 46, 0.7)
        : l === 2
          ? p("M17 17h45l-4 48H21Z", C.blue) +
            line("M20 24h39M24 29l24 25", "#fff3dd")
          : rect(14, 33, 51, 29, 5, C.blue) +
            rect(11, 28, 57, 9, 3, C.cream) +
            (l === 4
              ? rect(24, 9, 32, 19, 3, C.blue) + rect(21, 7, 38, 6, 2, C.cream)
              : "");
  else if (f === "bakeware") {
    if (l <= 2)
      body =
        p(
          `M${26 - l * 5} 34h${28 + l * 10}l-6 26H${32 - l * 5}Z`,
          l === 1 ? C.cream : C.blue,
        ) + line("M23 40h33m-28-5 3 22m11-22v22m11-22-3 22");
    else if (l === 3)
      body =
        plate(40, 45, 29) +
        `<ellipse cx="40" cy="42" rx="24" ry="17" fill="${C.blue}"/>`;
    else if (l <= 5)
      body =
        rect(9, 25, 62, 34, 4, C.blue) +
        Array.from({ length: l === 4 ? 1 : 6 }, (_, i) =>
          rect(
            l === 4 ? 16 : 15 + (i % 3) * 17,
            l === 4 ? 31 : 30 + Math.floor(i / 3) * 13,
            l === 4 ? 48 : 12,
            l === 4 ? 20 : 9,
            2,
            C.cream,
          ),
        ).join("");
    else
      body =
        plate(40, 37, 31) +
        line("M40 44v18M21 66h39") +
        rect(35, 45, 10, 17, 2, C.blue) +
        (l === 7
          ? rect(7, 46, 14, 15, 2, C.pink) + p("M55 60V35l9-7 7 32Z", C.cream)
          : "");
  } else if (f === "seedbag" || f === "emptybag")
    body =
      bag(l, f === "emptybag") +
      (l === 2 ? line("M19 34h43M19 58h43", C.oak) : "");
  else if (f === "doll" || f === "mascot") {
    if (f === "doll" && l <= 2)
      body =
        p(
          l === 1
            ? "m18 28 35-9 10 33-35 12Z"
            : "M20 22h17l5 10 9-10 13 8-9 14 4 20H22l3-20-11-8Z",
          C.oak,
        ) + line("M22 31l3 7m3 4 3 7m3 4 3 7M34 26l8 2m5 2 8 2", C.cream);
    else {
      const figure = `${circle(40, 27, 13, C.cream)}${p("M24 62 27 42l13-5 13 5 6 20Z", f === "mascot" ? C.blue : C.oak)}${line("M34 24h1m11 0h1m-9 8q3 3 6 0")}${l >= 4 ? p("M31 45h18v17H31Z", C.cream) : ""}${l >= 5 ? p("M27 18v-7q6-10 14-4 14-6 14 7v4Z", C.cream) : ""}${l >= 6 ? leaf(59, 54, 0.6) : ""}`;
      body =
        l >= 7
          ? `<g transform="translate(-1 10) scale(.68)">${figure}</g><g transform="translate(26 8) scale(.7)">${figure}</g>${l === 8 ? rect(5, 59, 70, 9, 2, C.oak) + p("M5 57V13h70v44l-8-29H13Z", C.pink) : ""}`
          : figure;
    }
  } else if (f === "snail")
    body =
      p("M10 58q20-12 39-5l13-19 7 5-7 24H14Z", C.green) +
      circle(34, 44, 13 + l * 1.4, l >= 5 ? C.pink : C.oak) +
      p(
        "M31 48c-13-9 8-21 14-8 4 12-14 17-12 5 1-5 8-3 6 1",
        "none",
        `stroke="${C.cream}"`,
      ) +
      line("M61 37l-4-10m8 9 6-10") +
      circle(57, 27, 2, C.ink) +
      circle(71, 26, 2, C.ink) +
      (l >= 4 ? leaf(18, 64, 0.8) : "") +
      (l === 6 ? circle(35, 24, 4, C.gold) + circle(20, 32, 3, C.gold) : "");
  else if (f === "pantry")
    body =
      cabinet(l) +
      (l === 5
        ? rect(20, 27, 40, 4, 1, C.blue) + circle(42, 53, 4, C.cream)
        : "");
  else if (f === "lost") {
    const forms = [
      p(
        "M13 36q12-13 25 0m4 0q13-13 25 0M38 37h4",
        "none",
        `stroke="${C.dark}" stroke-width="3"`,
      ) +
        circle(25, 40, 12, C.blue) +
        circle(55, 40, 12, C.blue),
      rect(20, 16, 39, 48, 2, C.cream) +
        line("M25 26h26m-26 8h20m-20 8h24m-24 8h17"),
      p("M21 16h16v35h24v13H22Z", C.pink) +
        line("M25 18v32m-3 9h37M25 63v7m8-7v7m8-7v7m8-7v7"),
    ];
    body =
      l <= 3
        ? forms[l - 1]
        : cabinet(l === 4 ? 1 : l === 5 ? 5 : 7) +
          `<g transform="translate(19 9) scale(.5)">${forms[l % 3]}</g>`;
  } else if (f === "comfort") {
    if (l <= 3)
      body =
        p(
          l === 1
            ? "M20 26q20-22 40 0v29q-10 13-17 0V37h-8v18q-11 13-17 0Z"
            : l === 2
              ? "M15 20q25 8 50 0-7 22 0 43-25-7-50 0 7-21 0-43Z"
              : "M18 27q22-8 44 0v30q-21 8-44 0Z",
          l === 3 ? C.blue : C.cream,
        ) + line("M24 31q15 7 31 0m-30 22q13-4 29 0");
    else if (l === 4)
      body =
        p("M21 23h28v12H37v28H25V35h-4Z", C.blue) + circle(54, 29, 11, C.ink);
    else if (l === 5)
      body =
        rect(18, 29, 46, 30, 5, C.oak) +
        p("M22 29V16h39v13Z", C.cream) +
        circle(42, 44, 10, C.gold) +
        line("M48 39v11m0-10 5-3");
    else if (l === 6)
      body =
        rect(15, 19, 50, 46, 5, C.blue) +
        circle(30, 42, 11, C.ink) +
        circle(54, 32, 4, C.gold) +
        line("M48 43h11m-11 6h11");
    else if (l === 7)
      body =
        p("M8 24h64l-4 29H49l-9-9-9 9H12Z", C.blue) +
        rect(16, 30, 18, 13, 3, C.ink) +
        rect(46, 30, 18, 13, 3, C.ink);
    else
      body =
        rect(12, 27, 56, 38, 4, C.oak) +
        rect(9, 19, 62, 12, 3, C.pink) +
        ribbon(35) +
        line("M37 21v42M46 20v43");
  } else if (f === "console")
    body =
      rect(12, l === 1 ? 23 : 18, 56, l === 1 ? 31 : 44, 7, C.blue) +
      rect(l === 3 ? 28 : 30, 25, l === 3 ? 24 : 20, 22, 2, C.ink) +
      line("M17 34h10m-5-5v10") +
      circle(59, 36, 3, C.pink) +
      (l >= 2 ? circle(56, 45, 2, C.gold) + line("M30 53h20") : "") +
      (l === 3
        ? rect(8, 29, 9, 23, 3, C.pink) + rect(64, 29, 9, 23, 3, C.pink)
        : "") +
      (l === 4
        ? rect(15, 7, 50, 12, 2, C.cream) + line("M20 61v6m40-6v6")
        : "");
  else if (f === "adventure_box")
    body =
      rect(8, 15, 64, 51, 6, C.oak) +
      rect(12, 19, 56, 42, 3, C.blue) +
      [
        leaf(28, 55, 1.8) + leaf(55, 53, 1.2),
        p("M13 56 31 24l12 19 12-23 14 36Z", C.gold) +
          circle(31, 35, 4, C.cream),
        p("M14 48h52l-8 11H23Z", C.cream) +
          line("M18 38h44M39 21v25") +
          circle(40, 29, 8, C.pink),
        p("M19 57V35h11V21h19v14h12v22Z", C.cream) +
          p("m25 35 12-17 17 17Z", C.pink) +
          rect(34, 45, 12, 12, 4, C.oak),
        p("M17 56V29h45v27Z", C.cream) +
          p("m13 29 27-15 28 15Z", C.pink) +
          circle(40, 37, 5, C.gold) +
          ribbon(54),
      ][l - 1];
  else if (f === "story")
    body =
      rect(18, 9, 44, 61, 5, C.gold) +
      rect(22, 14, 36, 49, 3, C.cream) +
      (l === 1
        ? leaf(41, 54, 1.3)
        : l === 2
          ? circle(33, 36, 9, C.pink) + circle(49, 42, 8, C.blue)
          : l === 3
            ? p("M25 55 42 22l13 33Z", C.green)
            : l === 4
              ? p("M25 56V31h9V22h13v9h9v25Z", C.pink)
              : p("M28 54 22 33l12 6 6-18 7 18 12-6-7 21Z", C.gold));
  else if (f === "puzzle") {
    if (l < 4)
      body = Array.from({ length: l + 1 }, (_, i) =>
        p(
          `m${15 + i * 12} ${40 - i * 7} 16-8 10 13-18 9Z`,
          i % 2 ? C.cream : C.oak,
        ),
      ).join("");
    else if (l <= 10) {
      const count = l - 2;
      body =
        Array.from({ length: count }, (_, i) =>
          rect(
            15 + (i % 3) * 16,
            19 + Math.floor(i / 3) * 15,
            17,
            16,
            1,
            i % 3 === 0 ? C.green : i % 3 === 1 ? C.blue : C.cream,
          ),
        ).join("") + line("M18 28l9-5 9 9m1 12 9-6 10 8");
    } else if (l === 12)
      body =
        p("M12 24h56v38H12Z", C.cream) +
        p("m12 24 28 23 28-23Z", C.oak) +
        circle(40, 48, 7, C.pink);
    else
      body =
        rect(12, 16, 56, 49, 3, C.oak) +
        rect(18, 22, 44, 36, 1, C.blue) +
        p("M18 57V37l22-13 22 13v20Z", C.cream) +
        rect(34, 40, 13, 18, 1, C.oak) +
        (l === 13 ? ribbon(59) : "");
  } else if (f === "keys")
    body =
      l < 3
        ? circle(26, 29, 10, C.gold) +
          circle(26, 29, 5, C.cream) +
          p(`M33 35 58 60l6-7-7-7-5 5-12-16Z`, C.gold) +
          (l === 2 ? circle(47, 26, 9, C.blue) + line("M48 35v26m0-7h8") : "")
        : l < 5
          ? rect(21, 12, 38, 52, 5, C.blue) +
            circle(40, 29, 10, C.cream) +
            circle(40, 29, 4, C.gold) +
            line("M30 47h20m-20 7h12") +
            (l === 4 ? line("M14 22q-10 12 0 25m53-25q10 12 0 25", C.gold) : "")
          : p("M18 18h43v44H18Z", C.oak) +
            rect(26, 10, 29, 23, 6, C.blue) +
            circle(41, 22, 6, C.gold);
  else if (["timegate", "courses", "tasting"].includes(f))
    body =
      book(l, f) +
      (f === "timegate" && l >= 4
        ? rect(9, 11, 8, 56, 2, C.oak) +
          rect(62, 11, 8, 56, 2, C.oak) +
          rect(9, 9, 61, 6, 1, C.oak)
        : "");
  else if (f === "flowers")
    body =
      l <= 2
        ? flower(40, 31, l === 1 ? 1 : 1.3)
        : l <= 4
          ? flower(28, 27, 0.8) +
            flower(44, 23, 1) +
            flower(55, 32, 0.7) +
            p("M23 46h36L47 67H35Z", C.cream)
          : l <= 7
            ? p("M21 38h38l-8 28H29Z", C.blue) +
              Array.from({ length: l - 2 }, (_, i) =>
                flower(20 + i * 9, 24 + Math.abs(i - 2) * 3, 0.65),
              ).join("")
            : rect(10, 14, 60, 51, 3, C.oak) +
              Array.from({ length: l === 8 ? 9 : 12 }, (_, i) =>
                flower(19 + (i % 4) * 14, 21 + Math.floor(i / 4) * 15, 0.45),
              ).join("") +
              (l === 9 ? ribbon(58) : "");
  else if (f === "scraps")
    body =
      l < 4
        ? l === 1
          ? p("M13 41q15 22 29-5 10 17 24 5l-3 20H16Z", C.green) +
            p("M15 35 29 47 35 28Z", C.gold)
          : l === 2
            ? rect(22, 43, 36, 15, 7, C.oak) +
              circle(32, 32, 4, C.dark) +
              circle(45, 37, 5, C.dark)
            : leaf(26, 58, 1.5) + leaf(55, 60, 1.3)
        : l < 7
          ? bag(l === 4 ? 1 : 2) +
            leaf(40, 53, 0.7) +
            (l === 6 ? line("M17 15q-5-6 0-10m42 10q5-6 0-10", C.blue) : "")
          : rect(14, 25, 51, 39, 3, C.oak) +
            rect(11, 20, 57, 8, 2, C.green) +
            leaf(41, 54, 1) +
            (l === 8
              ? line("M22 28v31m36-31v31M18 36h44m-44 11h44") +
                flower(62, 14, 0.5)
              : "");
  else if (f === "garden_guest")
    body =
      l <= 3
        ? cat(l, true)
        : l < 6
          ? cabinet(l === 4 ? 4 : 6) + leaf(41, 20, 0.8)
          : p("M9 62V35l31-23 32 23v27Z", C.oak) +
            p("M22 62V41q19-26 37 0v21Z", C.ink) +
            p("M24 62q18-21 33 0Z", C.cream) +
            leaf(62, 30, 0.65);
  else if (f === "cats") body = cat(l);
  else if (f === "honor")
    body =
      l <= 4
        ? circle(40, 35, 17 + l, C.gold) +
          p("m26 49-7 21 18-9 5 10 13-21Z", C.pink) +
          circle(40, 35, 12, C.cream) +
          p("m40 24 4 8 9 2-7 6 2 9-8-5-8 5 2-9-7-6 9-2Z", C.gold)
        : p("M22 16h37l-5 25-11 10v10h15v8H23v-8h14V51L27 41Z", C.gold) +
          p("M23 21H10q0 25 21 20M58 21h13q0 25-21 20", C.gold) +
          (l >= 6 ? ribbon(58) : "") +
          (l === 7 ? leaf(14, 56, 0.8) + leaf(65, 56, 0.8) : "");
  else if (f === "energy")
    body =
      circle(40, 40, 16 + l * 3, "#edc674") +
      p(`M43 ${10 + l} 23 44h14l-3 23 23-33H43Z`, C.cream) +
      (l >= 3 ? circle(16, 24, 3, C.gold) : "") +
      (l >= 4 ? circle(64, 51, 4, C.gold) : "") +
      (l === 5 ? ribbon(60) : "");
  else if (f === "coins")
    body =
      l <= 2
        ? Array.from(
            { length: l === 1 ? 2 : 4 },
            (_, i) =>
              circle(25 + i * 9, 50 - (i % 2) * 10, 10, C.gold) +
              circle(25 + i * 9, 50 - (i % 2) * 10, 5, C.cream),
          ).join("")
        : l < 5
          ? bag(l === 3 ? 1 : 2) + circle(41, 45, 10, C.gold)
          : l === 5
            ? rect(17, 25, 46, 38, 6, C.cream) +
              rect(21, 18, 38, 10, 3, C.oak) +
              circle(40, 44, 12, C.gold)
            : rect(10, 32, 61, 32, 4, C.oak) +
              p("M10 32q30-29 61 0Z", C.gold) +
              rect(35, 37, 10, 17, 2, C.gold) +
              line("M19 31v30m42-30v30");
  else if (f === "gems")
    body =
      l < 3
        ? Array.from({ length: l === 1 ? 1 : 3 }, (_, i) =>
            p(
              `m${l === 1 ? 23 : 9 + i * 18} ${l === 1 ? 27 : 35 - (i % 2) * 12} 9-9h16l9 9-17 25Z`,
              C.blue,
            ),
          ).join("")
        : l === 3
          ? bag(1) + p("m25 44 8-8h14l8 8-15 17Z", C.blue)
          : rect(12, 29, 56, 35, 4, C.cream) +
            p("M12 29 22 16h36l10 13Z", C.blue) +
            p("m30 41 7-7h10l7 7-12 16Z", C.blue);
  else if (f === "blackbag" || f === "pinkbag")
    body =
      rect(14, 25, 52, 39, 6, f === "blackbag" ? C.blue : C.pink) +
      p(
        "M26 25v-8q14-13 28 0v8",
        "none",
        `stroke="${C.oak}" stroke-width="5"`,
      ) +
      rect(12, 29, 56, 8, 2, C.oak) +
      rect(34, 32, 12, 13, 2, C.gold) +
      (l === 2
        ? rect(8, 42, 12, 20, 2, C.cream) +
          rect(60, 42, 12, 20, 2, C.cream) +
          ribbon(56)
        : "") +
      (f === "blackbag" ? line("M27 50l7 7m0-7-7 7") : leaf(43, 58, 0.55));
  else if (f === "tipjar")
    body =
      p(
        `M18 47c-13-1-13-15-4-13 4 1 2 7-1 6M18 42q-4-22 24-23 28 0 29 25l-9 15v9h-9l-3-8H32l-4 8h-9V55Z`,
        l === 3 ? C.gold : C.pink,
      ) +
      p("M53 23 60 12l5 17Z", C.pink) +
      circle(59, 37, 2, C.ink) +
      rect(62, 41, 13, 11, 4, C.cream) +
      line("M30 22h17") +
      (l >= 2 ? circle(27, 34, 8, C.gold) : "") +
      (l === 3 ? ribbon(53) : "");
  else if (f === "infinite")
    body =
      p("M14 37c-10-15 11-28 26-8 15-20 37-7 26 8L40 64Z", C.pink) +
      line(
        "M21 39c-10-14 7-16 19-2 12-14 29-12 19 2-12 14-20-11-32-3-10 7 0 15 13 1",
        C.cream,
      ) +
      Array.from({ length: l }, (_, i) =>
        circle(22 + i * 12, 12, 3, C.gold),
      ).join("");
  else if (f === "timeskip" || f === "stopwatch")
    body =
      f === "stopwatch"
        ? circle(40, 42, 25, C.cream) +
          circle(40, 42, 19, C.blue) +
          rect(34, 9, 12, 9, 2, C.oak) +
          line("M40 42V27m0 15 12 9M20 20l-5-5")
        : rect(17, 10, 47, 7, 3, C.oak) +
          rect(17, 64, 47, 7, 3, C.oak) +
          p(
            "M24 18h33q0 15-12 23 13 8 12 22H24q0-15 12-22-13-8-12-23Z",
            C.blue,
          ) +
          p(`M28 ${19 + l * 3}h25L40 39Z`, C.gold) +
          p(`M26 61q14-${8 + l * 3} 28 0Z`, C.gold) +
          (l >= 3 ? line("M15 18v44m51-44v44") : "") +
          (l >= 4 ? ribbon(61) : "");
  else if (f === "charge" || f === "energybox")
    body =
      rect(14, 31, 53, 34, 4, C.oak) +
      p("M14 31 25 18h31l11 13Z", C.cream) +
      line("M14 37h53M27 20v11m28-11v11") +
      (f === "charge"
        ? leaf(41, 54, 0.9)
        : p("m43 32-15 17h11l-2 12 16-19H42Z", C.gold)) +
      (l >= 2 ? rect(8, 45, 12, 19, 2, C.blue) : "") +
      (l === 3 ? rect(61, 44, 12, 20, 2, C.blue) + line("M20 15h39") : "");
  else if (f === "splitter")
    body =
      circle(22, 58, 10, C.pink) +
      circle(51, 58, 10, C.pink) +
      p("M29 51 56 12l-4 27-16 17Z", C.blue) +
      p("M44 51 21 12l4 27 16 17Z", C.cream) +
      circle(37, 41, 4, C.gold) +
      (l >= 2 ? circle(22, 58, 5, C.cream) + circle(51, 58, 5, C.cream) : "") +
      (l === 3 ? line("M13 15l-4-6m49 6 5-6", C.gold) : "");
  else if (f === "chest")
    body =
      rect(13, 30, 54, 35, 4, C.cream) +
      rect(10, 24, 60, 12, 3, C.pink) +
      rect(34, 24, 12, 41, 1, C.pink) +
      p("M39 23C10 24 15 0 31 10l9 12c2-23 30-24 21-7-4 7-14 8-21 8Z", C.gold) +
      (l >= 2 ? circle(20, 45, 4, C.gold) + circle(60, 45, 4, C.gold) : "") +
      (l === 3 ? rect(9, 60, 62, 7, 2, C.gold) + flower(40, 18, 0.4) : "");
  else if (f === "backpack")
    body =
      rect(17, 19, 47, 49, 12, C.oak) +
      rect(24, 45, 33, 17, 4, C.cream) +
      line("M20 28h41M29 19V10h22v9M15 32v22m51-22v22") +
      leaf(41, 41, 0.6);
  else if (f === "upgrade")
    body =
      rect(18, 9, 44, 61, 5, l === 1 ? C.pink : C.blue) +
      rect(23, 15, 34, 48, 3, C.cream) +
      p("m40 22-15 18h10v17h10V40h10Z", C.gold) +
      (l === 2 ? circle(40, 54, 7, C.blue) + circle(40, 54, 3, C.cream) : "");
  else throw Error(`No authored silhouette for ${id}`);
  if (f === "mascot" && l === 2) body += p("M31 44h18v19H31Z", C.cream);
  if (f === "mascot" && l === 3)
    body +=
      p("M25 18V9q7-8 15-3 15-7 16 8v4Z", C.cream) +
      rect(22, 49, 11, 8, 2, C.gold);
  if (f === "flowers" && l === 4) body += ribbon(44);
  if (f === "scraps" && l === 5)
    body += p("M15 26h49v7H15Z", C.green) + line("M22 20l5-8m22 8 5-8");
  if (f === "coins" && l === 4)
    body += rect(17, 20, 45, 7, 2, C.oak) + circle(28, 29, 5, C.gold);
  if (f === "fruit" && l === 8)
    body +=
      p("M12 50h11l4-7 7 7h12l9-7 9 7Z", C.green) + circle(18, 45, 5, C.pink);
  if (d.kind === "legacy") body += line("M8 61v8h13", C.blue);

  if (f === "infinite" && l === 2)
    body =
      circle(40, 40, 29, C.cream) +
      `<g transform="translate(10 10) scale(.75)">${body}</g>` +
      rect(34, 5, 12, 7, 2, C.oak);
  if (f === "infinite" && l === 3)
    body =
      rect(17, 24, 47, 43, 12, C.blue) +
      rect(29, 10, 23, 16, 3, C.cream) +
      p("M17 45h47v12H17Z", C.pink) +
      line("M26 46c-8-9 7-14 14-3 8-11 23-6 14 3-8 8-17-11-25-4", C.cream);
  if (f === "infinite" && l === 4)
    body =
      p("M18 64V31q0-10 23-10 23 0 23 10v33Z", C.cream) +
      rect(18, 16, 46, 10, 3, C.oak) +
      p("M18 32q-18-5-12 13l12 4m45-17q18-5 12 13l-12 4", C.gold) +
      p("M40 61 23 40q2-17 17-6 16-11 18 6Z", C.pink) +
      line("M29 43c-5-8 8-9 12-1 6-8 18-7 13 1-7 7-12-9-20-4", C.cream) +
      ribbon(61);
  // Late-chain scenes and documents progress through different physical forms.
  if (f === "timegate")
    body = [
      circle(40, 40, 20, C.blue) +
        p("m40 15 6 17 17 6-17 7-6 18-7-18-17-7 17-6Z", C.cream),
      p("M17 29 32 15 42 28 57 20 65 43 49 63 27 57Z", C.blue) +
        line("M32 15l7 24-12 18m12-18 26 4", C.cream),
      rect(16, 15, 49, 47, 4, C.oak) +
        rect(22, 21, 37, 34, 2, C.blue) +
        line("M40 21v34M22 38h37", C.cream),
      p("M17 66V34q23-39 47 0v32Z", C.oak) +
        p("M24 66V35q16-27 33 0v31Z", C.blue) +
        circle(49, 47, 2, C.gold),
      p("M10 35 40 10l30 25Z", C.oak) +
        rect(15, 34, 50, 31, 2, C.cream) +
        rect(21, 43, 17, 22, 2, C.blue) +
        rect(43, 41, 14, 11, 2, C.oak) +
        plate(52, 58, 10),
      p("M8 28 40 10l32 18Z", C.gold) +
        rect(10, 28, 61, 7, 1, C.oak) +
        rect(13, 35, 8, 30, 1, C.cream) +
        rect(59, 35, 8, 30, 1, C.cream) +
        rect(29, 35, 23, 28, 2, C.blue) +
        rect(8, 65, 64, 6, 2, C.oak),
    ][l - 1];
  if (f === "tasting")
    body = [
      rect(20, 20, 38, 40, 1, C.cream) +
        p("M45 20v12h13Z", C.oak) +
        line("M27 37h23m-23 8h16m-16 8h20"),
      rect(16, 16, 48, 49, 3, C.oak) +
        rect(21, 22, 38, 38, 2, C.cream) +
        rect(30, 12, 21, 12, 3, C.blue) +
        line("M28 37h25m-25 8h19m-19 8h23"),
      rect(16, 16, 48, 49, 2, C.cream) +
        rect(23, 45, 7, 12, 1, C.green) +
        rect(34, 36, 7, 21, 1, C.gold) +
        rect(45, 27, 7, 30, 1, C.pink) +
        line("M23 23h27"),
      rect(12, 17, 56, 43, 3, C.cream) +
        rect(16, 21, 48, 35, 1, C.oak) +
        rect(19, 24, 42, 28, 1, C.cream) +
        circle(39, 37, 9, C.gold) +
        ribbon(53),
      p("M11 23q15-9 29 0 15-9 29 0v40q-15-9-29 0-15-9-29 0Z", C.cream) +
        line("M40 23v40M18 31h15m-15 9h15m14-9h15m-15 9h15") +
        plate(55, 52, 9),
      rect(12, 12, 56, 51, 4, C.oak) +
        rect(17, 17, 46, 39, 2, C.cream) +
        line("M25 26h30m-30 7h22") +
        circle(40, 43, 9, C.gold) +
        ribbon(57) +
        leaf(17, 54, 0.6) +
        leaf(66, 54, 0.6),
    ][l - 1];
  if (f === "courses") {
    if (l === 1)
      body =
        rect(21, 19, 38, 43, 2, C.cream) +
        line("M27 28h24m-24 9h20m-20 9h24M20 25h7m-7 10h7m-7 10h7m-7 10h7");
    if (l === 2) body = book(2, "courses") + rect(24, 15, 4, 45, 1, C.blue);
    if (l === 3)
      body =
        p("M10 22q15-8 30 0 15-8 30 0v40q-15-9-30 0-15-9-30 0Z", C.cream) +
        line("M40 22v40M17 33h16m-16 10h16m14-10h15m-15 10h15") +
        leaf(56, 55, 0.45);
    if (l === 4)
      body =
        book(4, "courses") +
        rect(32, 40, 23, 13, 2, C.pink) +
        p("M33 40q11-14 21 0Z", C.cream) +
        circle(44, 34, 3, C.pink);
    if (l === 5)
      body =
        book(5, "courses") +
        p("M31 39V26q6-9 12-4 13-7 16 5v12Z", C.cream) +
        line("M31 34h26");
    if (l === 6)
      body =
        rect(10, 60, 60, 7, 2, C.blue) +
        rect(16, 51, 53, 7, 2, C.oak) +
        book(6, "courses") +
        ribbon(60);
  }
  if (f === "mascot" && l === 4)
    body +=
      rect(21, 46, 14, 12, 3, C.cream) +
      p("M34 48q10-2 8 7h-7", C.cream) +
      line("M25 42q-3-4 0-8", C.blue);
  if (f === "mascot" && l === 5)
    body += p("M49 57h18l-3 10H53Z", C.oak) + flower(58, 47, 0.5);
  if (f === "snail" && l === 1)
    body =
      circle(40, 45, 18, C.oak) +
      p(
        "M30 47c-12-15 18-23 20-6 2 17-23 21-18 4 2-7 12-5 10 1",
        "none",
        `stroke="${C.cream}" stroke-width="3"`,
      );
  if (f === "snail" && l === 2)
    body = `<g transform="translate(9 12) scale(.78)">${body}</g>`;
  if (f === "snail" && l === 5)
    body +=
      circle(23, 36, 3, C.cream) +
      circle(40, 27, 3, C.gold) +
      circle(48, 44, 3, C.cream);
  if (f === "cats" && l === 1)
    body = `<g transform="translate(7 12) scale(.82)">${body}</g>`;
  if (f === "cats" && l === 2)
    body +=
      p("M23 20 24 12l10 11-5 10Z", C.ink) +
      p("M47 45q16-7 12 10l-10 1Z", C.ink) +
      p("M34 61h8v5h-8Z", C.cream);
  if (f === "cats" && l === 3)
    body +=
      p("M60 58q16-10 9-30-6-7-9 0 13 15-2 22Z", C.oak) +
      line("M34 18l3 9m8-9-3 9M30 48l8 3m14-2-8 3", C.dark);
  if (f === "cats" && l === 4)
    body = `${p("M17 59c-11-33 38-41 48-15q12 29-21 24Z", C.blue)}${circle(24, 46, 14, C.blue)}${p("M13 39 11 25l12 10m7 1 11-11-2 17Z", C.blue)}${line("M15 45q4 4 8 0m6 0q4 4 8 0M41 57q26-13 16 4-8 10-14-1")}`;
  if (f === "cats" && l === 6)
    body +=
      p("M22 35 13 38l9 8-4 9 12-2m25-20 11 5-9 9 5 8-12-2Z", C.cream) +
      p("M17 59 8 65l8 6 12-5Z", C.cream);
  if (f === "honor" && l === 1)
    body =
      p("M24 20h33v35L40 66 24 55Z", C.cream) +
      circle(40, 36, 10, C.oak) +
      line("M31 55h18");
  if (f === "honor" && l === 3)
    body =
      p("M17 15h47v31q-4 17-23 25-21-8-24-25Z", C.blue) +
      p("m40 24 4 8 9 2-7 6 2 9-8-5-8 5 2-9-7-6 9-2Z", C.cream);
  if (f === "honor" && l === 4)
    body =
      p(
        "M40 8 47 18 59 16 61 29 72 36 63 45 62 58 48 58 40 69 31 58 18 58 17 45 8 36 19 29 21 16 33 18Z",
        C.gold,
      ) +
      circle(40, 37, 17, C.cream) +
      circle(40, 37, 10, C.gold);
  return shadow + body;
}

export function originalIcon(id) {
  const d = ITEMS[id];
  return d && ["commodity", "hybrid"].includes(d.kind)
    ? OLD[d.family]?.[d.level - 1]?.icon
    : null;
}
