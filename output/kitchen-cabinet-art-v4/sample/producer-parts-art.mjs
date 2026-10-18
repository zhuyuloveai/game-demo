// Unassembled equipment stages. Open cavities and separated components make
// these visibly incomplete while retaining the mature producer's materials.
import { PRODUCER_DEFS } from './catalog.mjs';
const C = {
  cream: '#fff3dd', white: '#fff9ee', oak: '#d3aa79', paper: '#e4c79e',
  dark: '#86664e', pink: '#dba2aa', green: '#92aa78', gold: '#e5bc63',
  blue: '#9bafbc', ink: '#665b54', clay: '#ca8965', clayLight: '#e6ac83',
  steel: '#bdc8c1', glass: '#cad8cf', bamboo: '#dfbe88', inside: '#85735c', linen: '#e9d8b8',
};
const p = (d, fill = C.cream, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const r = (x, y, w, h, radius = 4, fill = C.cream) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
const c = (x, y, radius, fill = C.gold) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"/>`;
const e = (x, y, rx, ry, fill = C.cream) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const line = (d, color = C.dark, width = 2) => p(d, 'none', `stroke="${color}" stroke-width="${width}"`);
const g = (x, y, scale, body, angle = 0) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${body}</g>`;
const shine = d => line(d, C.white, 3);
const leaf = (x, y, scale = 1) => g(x, y, scale, line('M0 0v-15', '#708e60', 2) + p('M0-4C-12-2-16-13-10-15-2-15 1-9 0-4Z', C.green) + p('M0-8C0-20 10-25 14-19 16-11 8-6 0-8Z', '#b6c58e'));
const lid = (x, y, width = 50, angle = 0) => g(x, y, 1, e(0, 0, width / 2, 7, C.oak) + e(0, -3, width / 2, 6, C.bamboo) + r(-5, -14, 10, 10, 4, C.dark) + shine(`M${-width / 2 + 5} -4q10-5 18-4`), angle);
const emptyJar = (x, y, width, height) => p(`M${x-width/2+3} ${y-height}q-6 8-3 19v${height-25}q0 9 ${width/2} 9t${width/2}-9v-${height-25}q3-11-3-19Z`, C.cream) + e(x, y-height+1, width/2-1, 6, C.linen) + e(x, y-height, width/2-6, 3.5, C.inside) + shine(`M${x-width/2+7} ${y-height+14}v${Math.max(6,height-27)}`);
const spoon = (x, y, scale = 1, angle = 0) => g(x, y, scale, line('M0 18V-7', C.oak, 5) + e(0, -18, 8, 12, C.oak) + e(-1, -19, 3, 6, C.dark), angle);
const spatula = (x, y, scale = 1, angle = 0) => g(x, y, scale, line('M0 19V-8', C.oak, 5) + r(-10, -30, 20, 23, 5, C.steel) + line('M-4-24v11m8-11v11', '#8a9e94', 2), angle);
const pot = (x, y, width, height, full = true) => p(`M${x-width/2} ${y-height}q${width/2}-4 ${width} 0l-5 ${height-7}q-${width/2-5} 13-${width-10} 0Z`, C.clay) + e(x, y-height, width/2+1, 6, C.clayLight) + e(x, y-height-1, width/2-4, 3.5, C.inside) + (full ? line(`M${x-width/2+5} ${y-9}q${width/2-5} 7 ${width-10} 0`, '#ad704e', 2) : '') + shine(`M${x-width/2+7} ${y-height+10}l2 8`);
const bucket = (x, y, width, height) => p(`M${x-width/2} ${y-height}h${width}l-4 ${height-5}q-${width/2-4} 10-${width-8} 0Z`, C.cream) + e(x, y-height, width/2, 5, C.steel) + e(x, y-height-1, width/2-4, 2.7, C.inside) + line(`M${x-width/2+3} ${y-11}q${width/2-3} 5 ${width-6} 0`, C.oak, 3) + shine(`M${x-width/2+6} ${y-height+9}l1 9`);
const blossom = (x, y, color = C.pink, scale = 1) => g(x, y, scale, c(-5, -3, 5, color) + c(4, -4, 5, color) + c(5, 4, 5, color) + c(-4, 5, 5, color) + c(0, 0, 3, C.gold));
const ring = (x, y, rx, ry, fill = C.bamboo) => e(x, y, rx, ry, fill) + e(x, y-2, rx-5, Math.max(3, ry-5), C.inside) + e(x, y-3, rx-8, Math.max(2, ry-7), C.cream);

function food(level) {
  if (level === 1) return e(39, 51, 28, 10, C.oak) + e(39, 47, 28, 10, C.bamboo) + r(33, 28, 12, 17, 5, C.dark) + e(39, 29, 6, 4, C.oak) + shine('M17 44q10-6 20-5') + line('M18 53q22 9 43 0');
  if (level === 2) return lid(58, 30, 30, 32) + p('M14 45q17-5 34 0v12q0 9-17 9t-17-9Z', C.cream) + e(31, 44, 17, 6, C.linen) + e(31, 43, 12, 3, C.inside) + shine('M20 51v6');
  if (level === 3) return emptyJar(35, 65, 43, 45) + r(55, 33, 10, 17, 3, C.steel) + line('M59 35v-8h8', C.dark, 2.5) + r(59, 54, 10, 6, 3, C.oak) + line('M23 59q13 5 25 0', C.linen, 3);
  return emptyJar(28, 65, 36, 33) + lid(27, 21, 35, -8) + p('M53 39l3-6 7 2 6-2-2 9 4 17q0 7-12 7-12 0-11-7Z', C.linen) + line('M53 42q8 3 14 0M56 53h10', C.oak, 2) + p('M11 36h6v15h-6Z', C.steel) + line('M39 35h7', C.dark, 2.5);
}
function produce(level) {
  if (level === 1) return e(33, 51, 25, 11, C.bamboo) + line('M13 47q20-9 40 0m-40 7q20-9 40 0M23 43l4 16m12-17 3 16', '#b28a61', 2.2) + p('M52 22q12 12 12 30l-6 1q2-16-10-27Z', C.oak) + p('M61 16q12 13 10 30l-6-1q1-14-9-25Z', C.paper);
  return p('M10 44h46l-4 17q-19 10-38 0Z', C.oak) + e(33, 43, 23, 7, C.bamboo) + e(33, 42, 18, 4, C.inside) + line('M15 53q18 6 36 0m-29-5 2 13m16-14-1 14', '#b28a61', 2) + line('M61 49V27q0-11 10-11', C.oak, 5) + line('M12 33q-2-12 7-13', C.oak, 5);
}
function tools(level) {
  if (level === 1) return e(33, 61, 23, 7, C.cream) + e(33, 58, 19, 4, C.linen) + spatula(30, 40, .85, -25) + spoon(48, 39, .88, 22) + line('M25 46q12 5 25-1', C.linen, 5);
  if (level === 2) return p('M12 42q18-6 36 0l-3 20q-15 9-30 0Z', C.cream) + e(30, 42, 18, 6, C.linen) + e(30, 41, 13, 3.5, C.inside) + shine('M20 52l1 7') + p('M56 18q6-3 11 0v42q-6 4-11 0Z', C.oak) + r(60, 25, 4, 25, 2, C.cream) + line('M51 28v23', C.steel, 2.5);
  return emptyJar(28, 65, 34, 35) + line('M28 34v28', C.oak, 3) + spatula(57, 44, .69, 20) + spoon(61, 49, .65, 15) + line('M51 54l15-4', C.linen, 4);
}
function drink(level) {
  if (level === 1) return g(31, 32, 1, p('M-15 0h30l-4 16q-11 5-22 0Z', C.steel) + e(0, -1, 15, 7, C.steel) + e(0, -2, 10, 4, C.inside) + line('M13 9h20', C.dark, 8), -15) + c(29, 58, 10, C.gold) + c(29, 58, 5, C.cream) + line('M29 58l3-4');
  if (level === 2) return r(10, 29, 24, 36, 7, C.steel) + r(13, 24, 18, 8, 3, C.oak) + r(15, 36, 14, 21, 4, C.glass) + line('M19 40v12', C.white, 3) + p('M44 64V25q0-12 12-12 13 0 13 12v39H58V31H53v33Z', C.blue) + shine('M49 24q1-6 7-6') + line('M60 19v8', C.cream, 3);
  return p('M14 64V24q0-12 12-12h24q12 0 12 12v40H50V34H26v30Z', C.blue) + r(22, 17, 32, 13, 5, C.cream) + r(24, 35, 28, 25, 4, C.inside) + r(10, 61, 57, 6, 3, C.steel) + line('M30 38h16m-12-5v5m8-5v5', C.steel, 2.3) + c(37, 24, 3, C.inside) + r(64, 29, 7, 23, 3, C.steel) + shine('M19 36v18');
}
function flower(level) {
  if (level === 1) return e(31, 56, 23, 9, C.steel) + e(31, 52, 23, 8, C.cream) + e(31, 52, 17, 4, C.linen) + line('M55 43q-8-23 5-25 14 2 10 19', C.oak, 5) + line('M62 18v7', C.dark, 2.5);
  if (level === 2) return bucket(35, 65, 42, 25) + line('M13 33q23-10 46 0', C.steel, 4) + line('M21 29v-7m29 7v-7', C.oak, 3) + r(63, 39, 7, 21, 3, C.steel);
  if (level === 3) return bucket(29, 65, 35, 44) + line('M56 49V27q0-13 13-13v32', C.oak, 4) + c(58, 55, 3, C.steel) + c(68, 55, 3, C.steel) + line('M15 31h5m19 0h5', C.oak, 3);
  return bucket(26, 65, 32, 39) + line('M49 59 54 30m-5 29 15-27m-15 27 19-17', '#708e60', 2.5) + leaf(53, 48, .45) + blossom(53, 25, C.pink, .8) + blossom(65, 28, C.cream, .75) + blossom(68, 39, C.gold, .55) + line('M46 54l11 4', C.linen, 4) + line('M29 34q10 1 7 11', C.oak, 2.5);
}
function herb(level) {
  if (level === 1) return e(34, 55, 25, 10, C.clay) + e(34, 51, 25, 9, C.clayLight) + e(34, 51, 18, 5, C.clay) + p('M51 22q12-3 20 8l-13 9-12-8Z', C.clayLight) + line('m54 27 9 4', C.cream, 3) + p('m17 24 14-4 7 13-18 5Z', C.clay);
  if (level === 2) return pot(28, 65, 37, 24, false) + p('M55 32l4-7 8 3-1 7 5 22q0 8-11 8-12 0-10-8Z', C.linen) + line('M54 37q7 3 13 0') + e(61, 51, 6, 5, C.inside) + p('M14 31q11-9 27-1l-2 6-23 2Z', C.clayLight);
  return pot(29, 65, 40, 36) + e(62, 63, 9, 5, C.inside) + leaf(61, 59, .8) + line('M56 64l3-9m6 9-2-8', C.linen, 1.7) + line('M18 55q11 7 22 0', C.clayLight, 2.5);
}
function asian(level) {
  if (level === 1) return p('M10 47q0-20 27-20t27 20Z', C.bamboo) + e(37, 48, 27, 7, C.oak) + r(31, 20, 12, 9, 4, C.dark) + line('M19 43q18-15 36 0m-32-7 7 10m7-14 7 14m-21-3 18-13', '#bd9c69', 2) + line('M52 59q10-5 15 1 3 8-6 7-10-1-4-9', C.linen, 3);
  if (level === 2) return p('M11 40h56v18q0 9-28 9-28 0-28-9Z', C.bamboo) + e(39, 39, 28, 10, C.oak) + e(39, 38, 22, 6, C.inside) + e(39, 38, 17, 3, C.cream) + line('M16 52q23 7 46 0M23 48v12m16-11v14m16-15v12', '#bd9c69', 2);
  return lid(58, 24, 28, 28) + p('M9 40h43v18q0 8-21 8-22 0-22-8Z', C.bamboo) + e(30.5, 40, 21.5, 7, C.oak) + e(30.5, 39, 16.5, 4, C.inside) + line('M14 50q16 5 33 0M19 47v13m12-12v14m11-15v13', '#bd9c69', 2) + line('M61 53q-4 8 3 10', C.linen, 3);
}
function mediterranean(level) {
  if (level === 1) return p('M11 56q0-24 19-31l7 13q-11 5-11 18Z', C.clayLight) + p('M34 23q13-5 25 3l-7 13q-8-5-15-1Z', C.cream) + p('m58 40 10-3 5 18-15 2Z', C.clay) + line('m18 40 10 5m15-18 2 9', C.clay, 2.3) + r(13, 61, 48, 6, 3, C.clay);
  if (level === 2) return r(10, 57, 60, 10, 4, C.clay) + p('M15 56V44q0-22 22-22v14q-9 1-9 13v7Z', C.clayLight) + p('M38 22q16 0 24 14L51 44q-5-9-13-8Z', C.cream) + line('M21 34l10 8m12-18-2 10', C.clay, 2) + p('M49 53h14l-1 5H48Z', C.paper);
  return r(9, 59, 47, 8, 3, C.clay) + p('M13 58V41q0-24 20-24t20 24v17H42V43q0-13-9-13t-9 13v15Z', C.clayLight) + p('M24 58V43q0-13 9-13t9 13v15Z', C.inside) + line('M19 31l8 4m12-14-2 9', C.cream, 3) + r(60, 30, 11, 35, 4, C.clay) + r(58, 26, 15, 8, 3, C.cream) + e(65.5, 27, 4, 2, C.inside) + line('M57 21h8', C.oak, 2.5);
}
const wheel = (x, y, radius = 12) => c(x, y, radius, C.ink) + c(x, y, radius-4, C.steel) + c(x, y, 3, C.dark);
function supply(level) {
  if (level === 1) return wheel(27, 49, 17) + wheel(55, 47, 15) + line('M20 19h36m-32-4v8m29-8v8', C.steel, 4);
  if (level === 2) return wheel(25, 56, 10) + wheel(61, 56, 10) + r(12, 36, 57, 13, 5, C.oak) + r(17, 33, 47, 6, 3, C.bamboo) + line('M25 49h36', C.steel, 4) + line('M18 25h43', C.steel, 4) + line('M23 22v6m32-6v6', C.oak, 3);
  return wheel(25, 62, 6) + wheel(62, 62, 6) + line('M14 14h9l5 43h37V23', C.dark, 4) + line('M13 13h10', C.oak, 6) + r(24, 54, 44, 7, 3, C.oak) + r(23, 29, 45, 7, 3, C.bamboo) + line('M28 36v16m35-16v16', C.steel, 3) + line('M29 23h35', C.steel, 3);
}
const bracket = (x, y, scale = 1, angle = 0) => g(x, y, scale, line('M-12 15 0-16 12 15Zm2-5h20', C.oak, 4), angle);
function publicity(level) {
  if (level === 1) return p('M13 27 37 20l24 7v33l-24-6-24 6Z', C.cream) + p('M37 20v34l24 6V27Z', C.linen) + line('M37 23v28', C.oak, 2.5) + line('M61 17h8v13', C.steel, 3) + line('M63 16v13', C.dark, 1.5) + shine('M19 32v19');
  if (level === 2) return p('M11 27 29 20l19 7v32l-19-5-18 5Z', C.oak) + p('M15 29 29 25l15 4v24l-15-4-14 4Z', C.linen) + line('M29 26v22', C.dark, 2.5) + bracket(61, 48, .85) + line('M53 24h16', C.steel, 2.5);
  return p('M9 31q12-8 25-1 13-7 25 1l-4 27q-11-5-23 1-12-6-23-1Z', C.oak) + p('M11 28q12-7 23 1 13-8 24-1l-4 25q-11-4-21 2-11-6-22-2Z', C.cream) + line('M34 30l-1 24', C.linen, 2.5) + bracket(65, 48, .56, 10) + r(13, 62, 39, 5, 2, C.oak) + line('M57 65h14', C.steel, 2.5);
}
function recycle(level) {
  if (level === 1) return e(37, 49, 27, 9, C.oak) + e(37, 45, 27, 9, C.bamboo) + r(29, 27, 17, 11, 4, C.dark) + line('M33 30h9', C.bamboo, 2.5) + r(32, 43, 10, 19, 3, C.steel) + c(37, 54, 2, C.dark) + shine('M17 43q7-4 13-4');
  if (level === 2) return p('M12 43h42v16q0 8-21 8t-21-8Z', C.green) + e(33, 43, 21, 7, '#708e60') + e(33, 42, 16, 4, C.inside) + line('M15 56q18 6 36 0', C.oak, 3) + r(61, 29, 10, 31, 4, C.oak) + line('M61 35h10', C.bamboo, 2.5);
  if (level === 3) return p('M17 27h44v32q0 8-22 8t-22-8Z', C.green) + e(39, 27, 22, 8, '#708e60') + e(39, 26, 17, 5, C.inside) + line('M18 43q21 7 42 0M18 58q21 7 42 0', C.oak, 3) + shine('M23 34v9') + line('M64 31h6v16h-6', C.dark, 3) + r(10, 25, 7, 9, 3, C.steel);
  return p('M10 32h36v28q0 7-18 7t-18-7Z', C.green) + e(28, 32, 18, 6, '#708e60') + e(28, 31, 13, 3.5, C.inside) + line('M11 45q17 6 34 0M11 59q17 6 34 0', C.oak, 3) + shine('M16 39v8') + g(60, 39, 1, e(0, 0, 10, 22, C.oak) + e(-2, 0, 8, 19, C.bamboo) + r(-7, -7, 10, 15, 3, C.steel) + c(-2, 0, 2, C.dark)) + line('M57 65h11', C.dark, 3);
}
const DRAW = { food, produce, tools, drink, flower, herb, asian, mediterranean, supply, publicity, recycle };

/** Only unused equipment levels are handled; active stages fall through. */
export function producerPartsMarkup(family, level) {
  if (typeof family !== 'string' || !family.startsWith('gen_') || !Number.isInteger(level) || level < 1) return null;
  const id = family.slice(4), definition = PRODUCER_DEFS[id];
  if (!definition || definition.chain !== family || !DRAW[id] || level >= definition.activeLevel) return null;
  return DRAW[id](level);
}
