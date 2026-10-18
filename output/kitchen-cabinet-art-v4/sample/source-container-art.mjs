// Warm, rounded source containers. SVG bodies share art.mjs's material renderer.
const C = {
  cream: '#fff3dd', paper: '#e4c79e', oak: '#d3aa79', dark: '#86664e',
  pink: '#dba2aa', rose: '#bf858c', green: '#92aa78', gold: '#e5bc63',
  blue: '#9bafbc', ink: '#665b54', soft: '#ead8bd', glass: '#cad8cf',
};
const p = (d, fill = C.cream, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const r = (x, y, w, h, radius = 5, fill = C.cream) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
const c = (x, y, radius, fill = C.gold) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"/>`;
const e = (x, y, rx, ry, fill = C.cream) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const line = (d, color = C.dark, width = 2) => p(d, 'none', `stroke="${color}" stroke-width="${width}"`);
const leaf = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${p('M0 0C-14 0-17-12-12-17-2-17 2-8 0 0Z', C.green)}${p('M0 0C-2-12 7-21 15-18 17-9 9-1 0 0Z', '#b6c294')}</g>`;
const wrench = (x, y, scale = 1, angle = 0) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${p('M-6-18c-8 3-9 12-3 17L-17 14q-3 6 3 8 3 1 5-2L0 5c9 1 16-8 12-16L6-4-1-8Z', C.cream)}${c(-12, 17, 2, C.blue)}</g>`;
const pull = (x, y, width = 14) => line(`M${x} ${y}v3q${width / 2} 5 ${width} 0v-3`, C.dark, 2.5);
const seedWindow = (x, y, width = 20, height = 20) => r(x, y, width, height, 7, '#b5b789') + e(x + width * .35, y + height * .4, 2.5, 4, C.gold) + e(x + width * .65, y + height * .65, 2.5, 4, C.paper) + e(x + width * .3, y + height * .8, 2.5, 3, C.cream);

function toolbox(level) {
  if (level === 1) return line('M29 25v-6q0-8 11-8t11 8v6', C.dark, 5) + r(19, 24, 42, 39, 10, C.blue) + r(17, 24, 46, 13, 6, '#b7c7cc') + r(22, 34, 7, 12, 3, C.gold) + r(51, 34, 7, 12, 3, C.gold) + wrench(40, 47, .52, 26);
  return line('M28 24v-6q0-6 7-6h10q7 0 7 6v6', C.dark, 5) + r(9, 26, 62, 37, 11, C.blue) + r(8, 23, 64, 17, 7, '#b7c7cc') + line('M13 40h54', C.dark, 2.5) + r(18, 34, 9, 15, 3, C.gold) + r(53, 34, 9, 15, 3, C.gold) + wrench(40, 47, .7, 45) + line('M15 54v3m50-3v3', C.cream, 3);
}
function cooler(level) {
  if (level === 1) return line('M27 29V19q0-7 7-7h12q7 0 7 7v10', C.rose, 5) + p('M24 25q16-7 32 0l7 24q4 16-22 17-27 0-25-15Z', C.pink) + p('M24 25q16 5 32 0l3 10q-19 6-38 0Z', '#edbdc0') + line('M23 34q17 5 34 0', C.rose, 2.5) + line('M54 35v6', C.gold, 3) + r(28, 43, 24, 15, 7, C.cream) + leaf(40, 54, .5);
  return line('M26 29q-4-19 4-20 7 1 8 18m7 0q2-19 9-17 7 2 0 21', C.rose, 5) + p('M20 27q20-7 40 0 8 6 10 23 2 17-29 17-30 0-30-16 0-15 9-24Z', C.pink) + p('M20 27q20 9 40 0l4 11q-24 8-48 0Z', '#edbdc0') + line('M18 35q22 8 44 0', C.rose, 2.5) + line('M60 36v8', C.gold, 3) + p('M21 45q19 7 38 0l-3 16H24Z', C.cream) + leaf(41, 58, .6) + line('M17 45q-2 10 2 15m44-15q2 10-2 15', C.rose, 2);
}
function refill(level) {
  if (level === 1) return p('M23 29 40 20l18 9v29q-17 12-35 0Z', C.paper) + p('M23 29 40 38l18-9-18-9Z', C.cream) + p('M36 22 44 26v36l-8-1V34l-8-4Z', C.oak) + line('M40 39v22') + p('m47 44 7-4v11l-7 4Z', C.cream) + line('M27 46v7', C.dark, 2.5);
  if (level === 2) return p('M15 30 29 18h29l8 12v29q0 7-25 7-26 0-26-7Z', C.paper) + p('M15 30h51L58 18H29Z', C.cream) + p('M34 18h12l5 12v35H34Z', C.oak) + line('M16 31h49M35 24h10', C.dark, 2) + r(20, 41, 18, 14, 3, C.cream) + p('M23 50v-4h11v4m-8-5v-4h5v4', 'none', `stroke="${C.dark}" stroke-width="2"`) + line('M56 45v13');
  return p('M10 29 23 16h35l12 13v29q0 8-30 8-30 0-30-8Z', C.paper) + p('M10 29h60L58 16H23Z', C.cream) + p('M34 16h12l6 13v36H34Z', C.oak) + p('M13 29 8 21l15-5 11 13m18 0 6-13 14 5-5 8Z', '#efdbc1') + line('M11 30h58') + r(17, 41, 22, 16, 4, C.cream) + p('M21 51v-5h13v5m-10-6v-5h6v5', 'none', `stroke="${C.dark}" stroke-width="2.2"`) + line('M58 42v17m5-17v17', C.dark, 2) + line('M20 61h10');
}
function energyBox() {
  return line('M57 40h6q7 0 7-8v-5', C.dark, 5) + line('M64 15v8m7-8v8', C.gold, 3) + r(61, 22, 12, 14, 5, C.blue) + r(13, 24, 43, 41, 11, C.green) + r(24, 16, 21, 11, 4, C.gold) + r(19, 31, 31, 27, 8, C.cream) + p('m37 32-13 15h10l-2 10 15-17H37Z', C.gold) + line('M23 61h22', '#c2d0a7', 3);
}
function seeds(level) {
  if (level === 1) return p('M28 19q12-6 24 0l-2 10 6 24q3 12-16 13-19-1-16-13l6-24Z', C.cream) + r(27, 17, 26, 9, 4, C.paper) + seedWindow(30, 36, 20, 21) + line('M29 23h22');
  if (level === 2) return p('M20 28q20-7 40 0l-4 10q14 23 1 28-17 5-34 0-13-5 1-28Z', C.cream) + r(18, 25, 44, 10, 5, C.paper) + seedWindow(25, 41, 30, 18) + line('M23 31h34M18 52q-2 7 5 11m39-11q2 7-5 11');
  if (level === 3) return p('M21 15q19-7 38 0l-4 15 9 23q5 15-24 15-30 0-25-15l10-23Z', C.cream) + r(19, 14, 42, 10, 5, C.paper) + seedWindow(25, 32, 30, 27) + line('M25 20h30M22 60q18 8 36 0');
  return p('M45 22q10-7 20 0l-2 11 7 18q4 12-15 14-18-2-15-14l6-18Z', C.paper) + r(43, 20, 24, 8, 4, C.oak) + p('M17 22q18-8 36 0l-4 11 10 20q7 16-23 16-28-1-24-16l9-20Z', C.cream) + r(15, 20, 40, 10, 5, C.paper) + seedWindow(22, 38, 28, 23) + line('M21 26h28') + e(62, 63, 3, 4, C.gold) + e(68, 60, 2.5, 3.5, C.gold);
}
function emptyBags(level) {
  if (level === 1) return p('M25 20h30l-3 31 6 10-18 4-19-4 7-10Z', C.paper) + line('M26 25h28M29 31l19 26m3-26L31 57M25 60h28') + p('m29 53 11 5 10-6-2 8H31Z', C.cream);
  if (level === 2) return p('m20 34 34-8 8 28-34 9Z', C.paper) + p('m20 34 9 10 31-8-6-10Z', C.cream) + line('m29 44-1 18m0-10 30-8m-28 13 30-8');
  if (level === 3) return p('M16 40 56 29l10 25-40 12Z', C.paper) + p('M15 36 55 25l11 25-40 12Z', C.cream) + line('m21 43 39-10m-36 19 39-11m-34-3 9 22', C.oak) + p('m36 31 9-3 10 26-9 3Z', C.pink);
  return p('M10 47 53 35l17 19-44 13Z', C.paper) + p('M11 42 54 30l16 19-44 13Z', '#efdbc1') + p('M12 37 55 25l15 19-44 13Z', C.cream) + p('m31 32 10-3 15 20v10l-10 3V52Z', C.pink) + line('m17 43 11 13m-10-8 11 13m27-30 9 11', C.oak) + line('m45 35 7 11', C.cream, 2.5);
}

const feet = (left = 23, right = 57) => r(left, 61, 7, 8, 3, C.dark) + r(right - 7, 61, 7, 8, 3, C.dark);
const plateStack = (x, y, width = 18) => r(x, y, width, 4, 2, C.cream) + line(`M${x + 1} ${y + 5}h${width - 2}`, C.cream, 2.5);
function pantry(level) {
  if (level === 1) return p('M14 36q26-8 52 0l-4 25q-22 9-44 0Z', C.oak) + r(12, 28, 56, 13, 6, C.paper) + r(31, 23, 18, 7, 3, C.oak) + line('M18 46h44M19 54h42M27 41v21m13-21v23m13-23v21', '#a88560', 2) + line('M19 33h42', C.cream, 2.5);
  if (level === 2) return p('M14 47 53 21q5-3 8 1l7 9q3 4-1 7L28 64q-4 3-7-1l-9-10q-2-3 2-6Z', C.oak) + p('m19 45 34-22 8 10-35 23Z', C.paper) + line('m27 46 25-17', C.cream, 3) + r(15, 47, 9, 13, 3, C.dark) + r(56, 26, 9, 12, 3, C.dark);
  if (level === 3) return p('M15 32q25-12 50 0v26q-25 13-50 0Z', C.oak) + p('M21 34q19-8 38 0v20q-19 7-38 0Z', '#92765b') + p('M21 48q19-7 38 0v6q-19 7-38 0Z', C.paper) + r(11, 28, 10, 34, 5, C.oak) + r(59, 28, 10, 34, 5, C.oak) + line('M22 34q18-6 36 0', C.cream, 3);
  if (level === 4) return p('M14 31 25 24h31l11 7v29q-26 12-53 0Z', C.oak) + r(14, 33, 53, 30, 7, C.paper) + r(20, 38, 41, 20, 5, C.oak) + pull(33, 44, 15) + line('M18 29h42', C.cream, 3) + line('M22 60h34');
  if (level === 5) return p('M12 34 24 23h34l11 11v26q-27 11-57 0Z', C.oak) + p('M18 34 27 28h28l9 6v13H18Z', C.dark) + line('M34 31v14m16-14v14', C.paper, 3) + line('M25 34v8m-3-8v4m6-4v4m13-5v10m15-10v10', C.cream, 3) + r(12, 44, 57, 20, 7, C.paper) + pull(32, 49, 17) + r(10, 39, 9, 19, 4, C.oak) + r(62, 39, 9, 19, 4, C.oak);
  if (level === 6) return feet() + r(20, 19, 40, 46, 8, C.oak) + r(16, 15, 48, 10, 5, C.paper) + r(25, 28, 30, 14, 4, C.cream) + r(25, 46, 30, 14, 4, C.cream) + pull(34, 31, 12) + pull(34, 49, 12);
  if (level === 7) return feet(18, 62) + r(12, 21, 56, 44, 9, C.oak) + r(10, 17, 60, 9, 4, C.paper) + r(18, 30, 20, 28, 5, C.cream) + r(42, 30, 20, 28, 5, C.cream) + c(32, 43, 2.5, C.gold) + c(48, 43, 2.5, C.gold) + line('M21 53h13m12 0h13');
  if (level === 8) return feet() + p('M19 23q0-14 21-14t21 14v41H19Z', C.oak) + p('M26 26q0-10 14-10t14 10v24H26Z', C.paper) + line('M40 18v32M28 54h24') + c(35, 35, 2.2, C.gold) + c(45, 35, 2.2, C.gold) + r(26, 56, 28, 7, 3, C.cream) + pull(35, 57, 10);
  if (level === 9) return feet(20, 60) + r(16, 12, 48, 53, 8, C.oak) + r(13, 9, 54, 9, 4, C.paper) + r(23, 23, 34, 35, 6, C.glass) + line('M40 23v35m-16-17h32', C.oak, 3) + plateStack(27, 34, 10) + plateStack(43, 49, 10) + p('M45 30h9l-1 7h-7Z', C.cream) + c(36, 44, 1.8, C.gold) + c(44, 44, 1.8, C.gold);
  if (level === 10) return feet(18, 62) + p('M15 21q0-13 25-13t25 13v43H15Z', C.oak) + p('M23 24q0-9 17-9t17 9v24H23Z', C.glass) + line('M24 34h32', C.oak, 2.5) + plateStack(27, 41, 10) + p('M45 23h9l-1 8h-7Z', C.cream) + r(21, 52, 38, 11, 4, C.paper) + pull(34, 54, 12) + p('m16 22-6 5v31h6m48-36 6 5v31h-6Z', C.paper);
  return feet(17, 63) + p('M13 25q0-10 12-10h30q12 0 12 10v39H13Z', C.oak) + p('M26 26q0-12 14-12t14 12v26H26Z', C.glass) + line('M27 37h26', C.oak, 3) + p('M34 29h12l-2 6h-8Z', C.cream) + plateStack(32, 44, 16) + r(18, 28, 7, 29, 3, C.paper) + r(55, 28, 7, 29, 3, C.paper) + r(23, 55, 34, 9, 4, C.cream) + pull(34, 56, 12) + p('M32 17v-4q-5-5 0-6 4-1 7 2 4-4 8-1 5 0 3 5v4Z', C.cream) + line('M34 14h13', C.oak, 1.8);
}

const glasses = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${e(-8, 0, 7, 5, C.blue)}${e(8, 0, 7, 5, C.blue)}${line('M-2 0h4m-17-2-3-3m33 3 3-3', C.dark, 2.5)}</g>`;
const scarf = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${p('M-8-14h11v15h10v9H-8Z', C.pink)}${line('M-5-10v15m0 8v3m5-3v3m5-3v3', C.rose, 1.6)}</g>`;
function lostProperty(level) {
  if (level === 4) return scarf(49, 34, .9) + glasses(30, 30, .7) + p('M15 37q25-9 50 0l-5 24q-20 10-40 0Z', C.paper) + p('M17 38q23 8 46 0l-2 10q-20 9-42 0Z', C.cream) + r(29, 45, 23, 15, 6, C.pink) + line('M24 43v-8m32 8v-8', C.dark, 3) + line('M34 50h12', C.cream, 2.5);
  if (level === 5) return line('M17 35V23q0-7 8-7h30q8 0 8 7v12', C.dark, 4) + line('M25 18v7q0 5 5 2m21-9v7q0 5 5 2', C.gold, 3) + scarf(52, 36, 1) + p('M11 39q29-10 58 0l-5 22q-24 12-48 0Z', C.paper) + r(10, 34, 60, 11, 5, C.cream) + p('M19 45q8-3 16 0v17q-8 4-16 0Zm25 0q8-3 16 0v17q-8 4-16 0Z', C.pink) + glasses(51, 46, .55) + line('M23 51h8m17 7h8', C.cream, 2.5);
  return line('M15 46V16q0-6 7-6h36q7 0 7 6v30', C.oak, 5) + r(14, 10, 52, 10, 5, C.paper) + line('M26 20v8q0 7 6 3m16-11v8q0 7 6 3', C.gold, 3) + scarf(50, 39, .9) + p('M18 33q9-4 18 0v15q-9 6-18 0Z', C.pink) + glasses(27, 39, .5) + r(9, 46, 62, 11, 5, C.oak) + r(14, 56, 8, 13, 4, C.dark) + r(58, 56, 8, 13, 4, C.dark) + p('M25 57h30l-3 9H28Z', C.cream) + line('M35 61h10', C.oak, 2.5);
}
const mouseFace = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${c(-8, -7, 6, '#b9b2a0')}${c(8, -7, 6, '#b9b2a0')}${e(0, 0, 12, 10, '#c7bba2')}${c(-4, -1, 1.4, C.ink)}${c(4, -1, 1.4, C.ink)}${c(0, 3, 2, C.pink)}</g>`;
function gardenNest(level) {
  if (level === 4) return p('M15 58q-3-14 3-29 7-15 22-15t22 15q7 15 3 29-25 15-50 0Z', C.paper) + e(24, 18, 8, 9, C.paper) + e(56, 18, 8, 9, C.paper) + p('M26 56V43q0-16 14-16t14 16v13Z', C.dark) + mouseFace(40, 47, .8) + e(40, 60, 24, 6, C.cream) + line('M19 33q1-6 5-10m-4 26 3-9m36-7-3-8', '#f5e4c7', 3);
  if (level === 5) return p('M10 57q0-25 15-36 14-10 29 0 16 11 16 36-29 17-60 0Z', C.green) + p('M17 54q-1-22 12-30 13-8 25 2 10 10 10 28Z', C.paper) + p('M27 56V43q0-15 14-15t14 15v13Z', C.dark) + mouseFace(40, 46, .85) + e(40, 60, 28, 7, C.cream) + leaf(21, 28, .75) + leaf(57, 24, .8) + c(63, 37, 4, C.pink) + c(63, 37, 1.5, C.gold) + line('M16 52q-1-8 3-13', C.cream, 3);
  return p('M12 56q-2-15 4-29l-1-15q8-2 17 8 9-3 17 0 9-10 17-8l-2 16q7 14 4 28-27 17-56 0Z', C.pink) + p('m20 18 2 12 8-7Zm40 0-9 6 8 6Z', '#edbdc0') + p('M22 55V44q0-20 18-20t18 20v11Z', C.rose) + p('M27 56q-4-7 1-14l-1-8 9 6h8l9-6-1 9q5 9 0 14Z', C.cream) + line('M33 47q2 2 4 0m6 0q2 2 4 0', C.dark, 1.8) + p('m38 51 2 2 2-2Z', C.pink) + e(40, 61, 29, 7, C.cream) + p('M22 59q17-6 36 0l-4 8H26Z', C.soft) + line('M28 62q12-3 24 0', C.cream, 2.5);
}

export function sourceContainerMarkup(family, level) {
  if (!Number.isInteger(level)) return null;
  if (family === 'blackbag' && level >= 1 && level <= 2) return toolbox(level);
  if (family === 'pinkbag' && level >= 1 && level <= 2) return cooler(level);
  if (family === 'charge' && level >= 1 && level <= 3) return refill(level);
  if (family === 'energybox' && level === 1) return energyBox();
  if (family === 'seedbag' && level >= 1 && level <= 4) return seeds(level);
  if (family === 'emptybag' && level >= 1 && level <= 4) return emptyBags(level);
  if (family === 'pantry' && level >= 1 && level <= 11) return pantry(level);
  if (family === 'lost' && level >= 4 && level <= 6) return lostProperty(level);
  if (family === 'garden_guest' && level >= 4 && level <= 6) return gardenNest(level);
  return null;
}
