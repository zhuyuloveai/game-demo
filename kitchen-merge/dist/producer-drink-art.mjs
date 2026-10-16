// Activated coffee producers have different machine architectures, rather than
// a shared cabinet with an increasing number of attachments. Keep the source
// colors identical to producer-art.mjs; art.mjs supplies the volume and edges.
const C = {
  cream: '#fff3dd', oak: '#d3aa79', dark: '#86664e', pink: '#dba2aa',
  gold: '#e5bc63', blue: '#9bafbc', ink: '#665b54', white: '#fff9ee',
  steel: '#bdc8c1', bamboo: '#dfbe88', inside: '#85735c', linen: '#e9d8b8',
  coal: '#5d6259',
};
const p = (d, fill = C.cream, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const r = (x, y, w, h, rx = 3, fill = C.cream) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const e = (x, y, rx, ry, fill = C.cream) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const c = (x, y, radius, fill = C.cream) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"/>`;
const line = (d, fill = C.dark, width = 1.7) => p(d, 'none', `stroke="${fill}" stroke-width="${width}"`);
const shine = d => line(d, C.white, 2.4);
const gauge = (x, y, radius = 4) => c(x, y, radius, C.gold) + line(`M${x} ${y}l1.5-2`, C.ink, 1.3);
const cup = (x, y, size = 12) =>
  line(`M${x+size/2-1} ${y+3}q7-1 6 4-1 4-7 3`, C.cream, 2.8) +
  p(`M${x-size/2} ${y}h${size}v${size-5}q0 5-${size/2} 5t-${size/2}-5Z`, C.cream) +
  e(x, y, size/2, 1.7, C.inside);
const head = (x, y, w = 13) => r(x-w/2, y, w, 5, 2, C.steel) + line(`M${x} ${y+5}v4`, C.steel, 2.7);

function capsule() {
  // L4: a squat, curved C. Its open right side is the defining silhouette.
  return p('M56 18Q62 18 63 26l-1 9H47v-5H34q-5 0-5 6v15q0 8 9 8h26q6 0 6 7H18q-8 0-8-9V35q0-17 18-17Z', C.blue) +
    p('M28 21h25q6 0 6 6v5H30q-5 0-5 6v15q0 4 3 6h-8q-6 0-6-7V35q0-14 14-14Z', C.cream) +
    r(28, 12, 23, 8, 4, C.oak) + line('M33 15h13', C.bamboo, 2) +
    c(23, 39, 4.2, C.gold) + c(23, 50, 2.6, C.pink) +
    head(52, 34, 17) + cup(52, 49, 14) +
    r(34, 61, 35, 5, 2, C.steel) + line('M39 63h22', C.inside, 1.4) +
    shine('M17 34v13');
}

function lever() {
  // L5: a narrow round boiler and a long overhead lever, with open flanks.
  return line('M44 23 59 11H15', C.dark, 4.8) + line('M15 11h18', C.oak, 7) +
    r(30, 8, 16, 7, 3, C.steel) +
    p('M25 29Q25 15 39 15t14 14v22q0 10-14 10T25 51Z', C.blue) +
    e(39, 27, 14, 5, C.cream) + r(28, 27, 22, 19, 5, C.cream) +
    gauge(39, 36, 6) + line('M26 47q13 6 26 0', C.steel, 3) +
    p('M45 46h12q5 0 5 6v8h-6v-7H45Z', C.blue) +
    head(50, 49, 14) + line('M45 51H34', C.oak, 3.8) +
    cup(50, 56, 10) +
    p('M26 56v6h-9q-5 0-5 5h55q0-5-5-5H43v-5Z', C.blue) +
    r(18, 63, 42, 4, 2, C.steel) + shine('M29 29v12') +
    line('M23 27h-6v19', C.steel, 3);
}

function drip() {
  // L6: an offset upright, cantilevered filter arm and a large clear carafe.
  return p('M13 61V20q0-9 9-9h34q9 0 9 9v8H31v33Z', C.blue) +
    p('M21 15h35q5 0 5 5v4H29v34H18V22q0-7 3-7Z', C.cream) +
    r(11, 26, 15, 30, 5, C.steel) + line('M15 33v14', C.white, 2) +
    c(21, 20, 3, C.gold) +
    p('M35 25h27l-5 13H41Z', C.oak) + r(34, 24, 29, 5, 2, C.bamboo) +
    line('M48 38v4', C.dark, 2.5) +
    line('M61 44h4q8 0 6 9-1 7-10 6', C.dark, 3) +
    p('M38 41h21l-1 7 6 10q3 7-15 7-17 0-15-7l5-10Z', C.steel, 'fill-opacity=".78"') +
    p('M36 54q12 4 26 0l1 5q0 5-14 5-14 0-13-5Z', C.inside) +
    r(37, 40, 24, 5, 2, C.coal) + shine('M40 47l-2 7') +
    r(9, 62, 63, 5, 2, C.blue) + e(49, 64, 15, 1.6, C.coal);
}

function espresso() {
  // L7: a wide two-bay bridge, dramatically lower and wider than the dripper.
  return p('M9 61V31q0-11 12-11h38q12 0 12 11v30H60V40H45v21H35V40H20v21Z', C.blue) +
    p('M19 24h41q7 0 7 8v6H13v-6q0-8 6-8Z', C.cream) +
    r(12, 16, 56, 7, 3, C.oak) + line('M19 18h41', C.bamboo, 2) +
    gauge(39, 29, 4.8) + c(22, 29, 2.6, C.pink) + c(57, 29, 2.6, C.gold) +
    p('M20 40h15v20H20Zm25 0h15v20H45Z', C.coal) +
    head(27, 39, 13) + head(53, 39, 13) +
    line('M21 41h-8m46 0h7', C.oak, 3.5) +
    cup(26, 51, 10) + cup(52, 51, 10) +
    r(8, 60, 64, 7, 3, C.steel) + line('M15 63h49', C.inside, 1.6) +
    shine('M13 42v10') + line('M68 40v13', C.steel, 2.7);
}

function automatic() {
  // L8: a tall closed bean-to-cup tower, with shoulders and one deep recess.
  return p('M25 21h30q8 0 8 10v26q0 10-10 10H27q-10 0-10-10V31q0-10 8-10Z', C.blue) +
    p('M26 8h28l-3 14H29Z', C.steel) +
    e(40, 10, 13, 3, C.inside) +
    p('M29 10q11-4 22 0l-2 5H31Z', C.oak) +
    r(25, 7, 30, 5, 2, C.oak) +
    p('M24 24h32q3 0 3 5v8H21v-8q0-5 3-5Z', C.cream) +
    r(28, 27, 19, 7, 2, C.coal) + line('M32 30h10', C.gold, 2) + c(53, 30, 2.7, C.pink) +
    p('M27 40q13-5 26 0v19H27Z', C.coal) +
    r(31, 39, 18, 7, 3, C.steel) + line('M36 46v3m8-3v3', C.steel, 2.3) +
    cup(40, 51, 12) + r(23, 61, 34, 5, 2, C.steel) +
    line('M28 63h23', C.inside, 1.4) + shine('M21 42v12') +
    r(61, 31, 7, 26, 3, C.steel) + line('M64 36v13', C.white, 1.8);
}

function twinTower() {
  // L9: separate grinder and brewing towers joined only at the worktop.
  return p('M11 23h20v35H11Z', C.blue) + e(21, 24, 10, 4, C.cream) +
    p('M9 10h24l-4 14H13Z', C.steel) + p('M12 12h18l-2 7H14Z', C.oak) +
    r(8, 8, 26, 5, 2, C.oak) +
    p('M14 31h14v9h-4v6h-6v-6h-4Z', C.cream) + c(21, 33, 3, C.gold) +
    p('M14 50h14l2 12H12Z', C.steel) + e(21, 50, 7, 2, C.inside) +
    p('M43 61V24q0-9 10-9h8q10 0 10 10v36H60V39H49v22Z', C.blue) +
    p('M51 18h10q6 0 6 7v10H47V25q0-7 4-7Z', C.cream) +
    gauge(57, 25, 4.5) + r(47, 11, 20, 7, 3, C.oak) +
    head(56, 37, 15) + line('M49 39h-7', C.oak, 3.5) +
    cup(55, 51, 11) +
    line('M69 37v14', C.steel, 3) +
    r(8, 61, 64, 6, 3, C.blue) + r(11, 62, 24, 4, 2, C.steel) +
    r(44, 62, 25, 4, 2, C.steel) + shine('M14 27v17');
}

function coffeeStation() {
  // L10: stepped professional counter. Three low heads sit beside a raised
  // boiler console; the main roofline is a staircase rather than a rectangle.
  let s = p('M9 60V24q0-7 7-7h11q7 0 7 7v7h29q9 0 9 9v20H62V47H24v13Z', C.blue) +
    p('M16 20h11q4 0 4 6v17H12V26q0-6 4-6Z', C.cream) +
    gauge(22, 29, 5) + r(17, 37, 10, 4, 2, C.oak) +
    p('M34 34h29q6 0 6 6v5H34Z', C.cream) +
    r(32, 28, 39, 7, 2, C.oak) + line('M38 30h26', C.bamboo, 2) +
    r(12, 13, 18, 7, 3, C.oak) +
    line('M12 44v12', C.steel, 3) + c(22, 50, 3, C.gold);
  for (const x of [35, 48, 61]) {
    s += head(x, 44, 10) + cup(x, 54, 8);
  }
  return s + r(8, 61, 64, 6, 3, C.steel) +
    line('M28 63h36', C.inside, 1.5) + shine('M12 24v10') +
    line('M70 46v9', C.steel, 2.5);
}

const DRINK_TIERS = new Map([
  [4, capsule], [5, lever], [6, drip], [7, espresso],
  [8, automatic], [9, twinTower], [10, coffeeStation],
]);

export function drinkTierMarkup(level) {
  return DRINK_TIERS.get(level)?.() ?? null;
}
