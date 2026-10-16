// Family-specific producer silhouettes. Coordinates leave room for the shared
// material renderer's outline and contact shadow in the 80 × 80 board cell.
import { CHAINS, PRODUCER_DEFS } from './catalog.mjs';
import { producerPartsMarkup } from './producer-parts-art.mjs';

const C = {
  cream: '#fff3dd', oak: '#d3aa79', dark: '#86664e', pink: '#dba2aa',
  green: '#92aa78', gold: '#e5bc63', blue: '#9bafbc', ink: '#665b54',
  white: '#fff9ee', clay: '#ca8965', clayLight: '#e6ac83', steel: '#bdc8c1',
  leaf: '#708e60', lime: '#b6c58e', carrot: '#e9a069', tomato: '#d68471',
  bamboo: '#dfbe88', inside: '#85735c', linen: '#e9d8b8', coal: '#5d6259',
};
const p = (d, fill = C.cream, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const line = (d, color = C.dark, width = 1.7) => p(d, 'none', `stroke="${color}" stroke-width="${width}"`);
const rect = (x, y, w, h, r = 3, fill = C.cream) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const ellipse = (x, y, rx, ry, fill = C.cream) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const circle = (x, y, r, fill = C.cream) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const group = (x, y, s, body, angle = 0) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${s})">${body}</g>`;
const shine = d => line(d, C.white, 2.8);
const sprig = (x, y, s = 1, angle = 0, color = C.green) => group(x, y, s,
  line('M0 1V-22', C.leaf, 2) +
  p('M0-6C-13-5-17-14-12-18-3-18 1-12 0-6Z', color) +
  p('M0-13C0-22 7-29 13-26 17-19 9-12 0-13Z', C.lime) +
  p('M0-20C-8-22-11-29-7-32 0-31 3-26 0-20Z', color), angle);
const wheat = (x, y, s = 1, angle = 0) => group(x, y, s,
  line('M0 4V-26', '#aa884e', 1.8) +
  p('M0-6q-12-1-10-9Q0-14 0-6Zm0-8q-11-2-8-10Q1-21 0-14Zm0 4q12-2 10-10Q0-17 0-10Zm0-10q10-3 7-10Q0-27 0-20Zm0-5q-6-7 0-13 6 6 0 13Z', C.gold), angle);
const carrot = (x, y, s = 1, angle = 0) => group(x, y, s,
  p('M-6-8Q0-14 6-8L2 15q-1 4-4 0Z', C.carrot) +
  p('M-1-9q-14-2-10-10 8 0 10 10Zm1 0q-3-15 5-17 6 6-5 17Zm1 0q7-12 14-7 0 8-14 7Z', C.green) + line('M-4-2h5m-3 7h4', '#bd8056', 1.3), angle);
const radish = (x, y, s = 1, angle = 0) => group(x, y, s,
  sprig(0, -6, .55, -12) + p('M-8-5q8-9 16 0 7 12-7 22-3 0-4-6Q-12 4-8-5Z', C.white) + line('M-5 4h4m-2 5h4', C.linen, 1.3), angle);
const blossom = (x, y, s = 1, color = C.pink, variant = 0) => group(x, y, s,
  variant === 1
    ? p('M-9 0Q-13-12-5-15l5 5 5-5q9 4 4 15Q0 10-9 0Z', color) + line('M0-8v13', C.cream, 1.4)
    : [0, 72, 144, 216, 288].map(a => `<g transform="rotate(${a})">${ellipse(0, -6, 4.5, 6, color)}</g>`).join('') + circle(0, 0, 4, C.gold));
const flourSack = (x, y, s = 1) => group(x, y, s,
  p('M-12-13l3-7 8 2 8-2 4 6-2 6 5 24q-1 7-15 7-15 0-16-7l5-24Z', C.linen) +
  line('M-11-9q11 4 21 0', C.dark, 1.5) + wheat(0, 12, .48, 12) + shine('M-10 1l-2 12'));
const jar = (x, y, w, h, color = C.cream, lid = true) => {
  const top = y - h;
  return p(`M${x-w/2+4} ${top+5}Q${x-w/2-2} ${top+11} ${x-w/2} ${top+19}v${h-25}q0 8 ${w/2} 8t${w/2}-8v-${h-25}q2-8-4-14Z`, color) +
    (lid ? rect(x-w/2-1, top, w+2, 9, 4, C.oak) + ellipse(x, top, w/2+1, 3, C.bamboo) : ellipse(x, top+5, w/2-4, 4, C.inside)) +
    shine(`M${x-w/2+6} ${top+18}v${Math.max(6, h-32)}`);
};

function food(l) {
  // The wide flour vessel remains the anchor, with matching ingredient jars
  // becoming a connected bakery pantry as its capacity increases.
  const widths = [46, 49, 50, 50, 51, 46, 44, 44, 43, 41, 41];
  const heights = [40, 42, 44, 46, 48, 46, 47, 47, 48, 49, 49];
  const w = widths[l-1], h = heights[l-1], x = l >= 6 ? 34 : 39;
  let s = '';
  if (l >= 8) s += jar(59, 55, 22, l === 11 ? 45 : l >= 10 ? 39 : 32, C.linen);
  if (l >= 10) s += jar(18, 54, 20, 33, C.cream);
  s += wheat(l >= 6 ? 18 : 59, 37, .61, 18);
  if (l >= 2) s += wheat(l >= 6 ? 23 : 63, 36, .52, 8);
  s += jar(x, 66, w, h, C.cream, false);
  s += flourSack(x, 66-h+4, .65);
  s += group(x-3, 19, 1, ellipse(0, 0, 23, 5, C.oak) + circle(0, -5, 3.5, C.dark), -10);
  // The cloth collar and large wheat engraving read as flour storage at 48px.
  s += p(`M${x-w/2+2} ${67-h+10}q${w/2-2} 8 ${w-4} 0l-2 10-8-2-9 4-9-3-8 2Z`, C.linen);
  s += wheat(x+1, 58, .62, 15);
  if (l === 2) s += jar(62, 65, 17, 25, C.linen);
  if (l >= 4) s += flourSack(l >= 6 ? 57 : 59, 51, l >= 7 ? .65 : .68);
  if (l >= 5) s += line(`M${x-w/2+2} 56q${w/2} 7 ${w-4} 0`, C.oak, 3);
  if (l === 6 || l === 7) s += jar(60, 65, l === 6 ? 19 : 23, l === 6 ? 27 : 33, C.linen);
  if (l >= 8) s += jar(59, 66, 24, l >= 9 ? 35 : 28, C.linen) + line('M53 48h12m-12 5h12', C.oak, 1.5);
  if (l >= 9) s += p('M10 62q29 7 60-1v6q-30 3-60 0Z', C.oak);
  if (l === 11) s += rect(49, 12, 21, 7, 3, C.oak) + line('M53 11V8h12v3', C.dark, 2) + wheat(20, 42, .4, -10);
  return s;
}

function tools(l) {
  const w = [35, 38, 42, 44, 46, 48, 50, 53, 55, 56, 58, 60][l-1];
  const y = [40, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28][l-1];
  let s = '';
  // Broad spatula and recognisable pan handle are part of every silhouette.
  s += group(30, 49, 1, p('M-3 0-7-23h-5l-2-13 16-2 2 14-5 2L3 0Z', C.steel) + line('M-9-33l1 7m4-8 1 7', '#8a9e94', 1.5), -7);
  s += group(50, 43, 1, p('M-3 6 0-20q-8-5-4-13 6-6 13 0 4 9-3 13L3 7Z', C.oak) + ellipse(2, -31, 3, 5, C.dark), 13);
  if (l >= 2) s += group(42, 40, .88, line('M0 7v-29', C.dark, 4) + ellipse(0, -28, 7, 9, C.cream), -5);
  if (l >= 4) s += group(20, 46, .8, line('M0 1v-26', C.oak, 4) + ellipse(0, -31, 6, 8, C.bamboo), -17);
  if (l >= 6) s += group(60, 40, .8, line('M0 10v-29', C.blue, 3.8) + p('M-6-20h12v-14h-3v7H1v-7h-3v7h-3v-7h-2Z', C.steel), 11);
  s += p(`M${40-w/2} ${y}q${w/2}-10 ${w} 0l-4 ${64-y}q-2 7-${w/2-4} 3-22 3-${w/2-4}-3Z`, l >= 7 ? C.blue : C.cream);
  s += ellipse(40, y, w/2, 6, C.cream) + ellipse(40, y-1, w/2-5, 3.5, C.inside);
  // Rear utensils must sit inside the opening, so repeat only their visible stems.
  s += line(`M28 ${y+1}l-2-8m17 8v-8m12 8 2-8`, C.oak, 3);
  if (l >= 3) s += line(`M40 ${y+2}v${64-y}`, C.oak, 2.7);
  s += shine(`M${44-w/2} ${y+12}l2 13`);
  if (l >= 5) s += p(`M${40-w/2+4} 55h${w-8}v9q-${w/2-4} 6-${w-8} 0Z`, C.oak);
  if (l >= 7) s += rect(17, 45, 18, 17, 5, C.cream) + line('M20 48h12', C.linen);
  if (l >= 8) s += rect(45, 43, 18, 19, 5, C.cream) + line('M48 47h12', C.linen);
  if (l >= 9) s += p('M12 45q-7-2-4-10h6m52-2q8-1 7 7l-6 4', 'none', `stroke="${C.oak}" stroke-width="4"`);
  if (l >= 10) s += line('M17 26v-7q23-10 45 0v7', C.oak, 3.7);
  if (l >= 11) s += rect(29, 49, 22, 17, 4, C.bamboo) + line('M33 54h14m-14 5h14', C.dark, 1.4);
  if (l === 12) s += rect(20, 43, 40, 23, 6, C.bamboo) + line('M40 45v19M26 50h8m12 0h8M26 58h8m12 0h8', C.dark, 2) + rect(32, 14, 16, 7, 3, C.cream);
  return s;
}

function produce(l) {
  const w = [48, 51, 53, 55, 57, 59, 60, 61, 62, 63, 64, 64][l-1];
  const top = [43, 41, 40, 39, 38, 38, 37, 36, 35, 34, 33, 38][l-1];
  const left = 40-w/2;
  let s = '';
  if (l >= 6) s += p(`M${left+6} 30q24-10 ${w-12} 0l-3 13H${left+8}Z`, C.bamboo) + ellipse(40, 30, (w-12)/2, 4, C.inside);
  s += sprig(45, top-1, l >= 5 ? .74 : .7, 18) + sprig(53, top+1, .55, 23);
  s += carrot(26, top-3, l >= 4 ? .76 : .77, -24) + radish(46, top-5, .74, 14);
  if (l >= 2) s += carrot(35, top-8, .68, 5);
  if (l >= 4) s += circle(58, top-3, 8, C.tomato) + p(`M58 ${top-9}l-5-4 5 1 3-4 1 5 5 1-6 3Z`, C.leaf);
  if (l >= 7) s += sprig(24, 39, .56, -20);
  if (l >= 8) s += ellipse(56, top-14, 9, 7, C.lime) + line(`M53 ${top-17}l6 5m-7-1 5 4`, C.green);
  s += p(`M${left} ${top}q${w/2}-7 ${w} 0l-5 ${64-top}q-23 7-${w-10} 0Z`, C.oak);
  s += ellipse(40, top, w/2, 5, C.bamboo) + line(`M${left+5} ${top+1}q${w/2-5} 5 ${w-10} 0`, C.dark);
  s += line(`M${left+5} ${top+9}q${w/2-5} 5 ${w-10} 0M${left+7} ${top+18}q${w/2-7} 5 ${w-14} 0`, '#b28a61', 2);
  s += line(`M${left+11} ${top+4}l3 ${60-top}m10-${60-top} 1 ${62-top}m12-${62-top}-1 ${62-top}m12-${62-top}-3 ${60-top}`, '#b28a61', 1.5);
  if (l >= 3) s += rect(left+2, top-1, 11, 7, 3, C.dark) + rect(left+w-13, top-1, 11, 7, 3, C.dark);
  if (l >= 5) s += line(`M41 ${top-3}v9`, C.bamboo, 4);
  if (l >= 9) s += p(`M${left+4} 55q27 6 ${w-8} 0v8q-27 7-${w-8} 0Z`, C.linen) + line(`M${left+8} 59h${w-16}`, C.oak);
  if (l >= 10) s += carrot(57, 42, .57, 34);
  if (l >= 11) s += radish(22, 42, .59, -25);
  if (l === 12) s += p('M13 48q27-6 54 0l-3 15q-24 7-48 0Z', C.bamboo) + line('M17 53h46m-44 6h42M26 50v13m13-14v16m14-15v13', '#b28a61', 2) + carrot(28, 43, .58, -22) + radish(52, 44, .59, 16);
  return s;
}

function drink(l) {
  const w = [36, 39, 42, 44, 47, 49, 51, 52, 54, 56][l-1], left = 40-w/2;
  const top = [17, 15, 14, 13, 12, 12, 11, 11, 10, 10][l-1];
  let s = '';
  if (l >= 3) s += rect(left+w-4, 28, 8, 29, 5, C.steel) + line(`M${left+w} 33v16`, C.white, 2);
  if (l >= 7) s += rect(left-6, 28, 11, 27, 5, C.steel);
  if (l >= 6) s += p(`M${left+4} ${top+2}l-3-4h17l-2 4Z`, C.linen) + rect(left+2, top-4, 17, 4, 2, C.oak);
  s += p(`M${left} 62V${top+10}Q${left} ${top} ${left+10} ${top}h${w-20}q10 0 10 10v${52-top}Z`, C.blue);
  s += p(`M${left+6} ${top+3}h${w-12}q4 0 4 5v12H${left+2}v-12q0-5 4-5Z`, C.cream);
  s += rect(left+5, top+23, w-10, 25, 4, C.coal);
  s += circle(l >= 5 ? 36 : 40, top+12, l >= 2 ? 6 : 5, C.gold) + line(`M${l>=5?36:40} ${top+12}l2-3`, C.ink, 1.5);
  if (l >= 5) s += circle(left+w-10, top+12, 3, C.pink);
  const heads = l >= 4 ? [31, 49] : [40];
  for (const x of heads) {
    s += rect(x-5, top+25, 10, 5, 2, C.steel) + line(`M${x} ${top+30}v6`, C.steel, 3);
    s += rect(x-6, 50, 12, 12, 4, C.cream) + p(`M${x+6} 53q8-2 6 5h-6`, 'none', `stroke="${C.cream}" stroke-width="3"`);
  }
  s += rect(left-3, 61, w+6, 6, 3, C.steel) + line(`M${left+4} 63h${w-8}`, C.inside, 1.4);
  s += shine(`M${left+4} ${top+28}v20`);
  if (l >= 2) s += line(`M${left+w-1} 32l6 3v15`, C.steel, 3);
  if (l >= 8) s += rect(left+3, top-3, w-6, 6, 2, C.oak) + rect(28, 7, 9, 6, 2, C.cream) + rect(41, 7, 9, 6, 2, C.cream);
  if (l >= 9) s += p('M9 62V43q0-5 6-5h4v24Z', C.blue) + circle(14, 48, 3, C.gold);
  if (l === 10) s += rect(60, 49, 12, 17, 4, C.cream) + line('M63 51v-7h6', C.steel, 2) + rect(25, 30, 30, 7, 2, C.steel);
  return s;
}

function herb(l) {
  const w = [40, 43, 46, 48, 50, 52, 50, 52, 54, 44][l-1];
  const top = [43, 42, 41, 40, 39, 38, 37, 36, 35, 34][l-1];
  let s = '';
  if (l >= 7) s += p('M12 43q-9 9-3 19 10 6 16-3l-1-16Z', C.clayLight) + sprig(23, 43, .57, -16);
  s += sprig(34, top+1, l >= 4 ? .82 : .8, -16) + sprig(46, top+1, l >= 3 ? .82 : .75, 14);
  if (l >= 2) s += sprig(40, top, .82, 2);
  if (l >= 5) s += sprig(28, top+2, .61, -22) + sprig(53, top+2, .58, 22);
  s += p(`M${40-w/2} ${top+2}C${36-w/2} 59 ${25} 67 40 67S${44+w/2} 59 ${40+w/2} ${top+2}Z`, C.clay);
  s += ellipse(40, top+2, w/2+1, 6, C.clayLight) + ellipse(40, top, w/2-4, 3, C.inside);
  s += line(`M${40-w/2+4} ${top+9}q${w/2-4} 7 ${w-8} 0`, '#ad704e', 2);
  s += shine(`M${46-w/2} ${top+12}q-1 8 6 10`);
  if (l >= 3) s += ellipse(40, 65, w/2+3, 3, C.clayLight);
  if (l >= 4) s += line(`M${40-w/2+5} 56q${w/2-5} 7 ${w-10} 0`, '#b17652', 2);
  if (l >= 6) s += rect(49, 43, 7, 18, 2, C.oak) + rect(44, 39, 18, 9, 3, C.cream) + sprig(53, 47, .22, 0);
  if (l >= 8) s += p('M60 46q14-1 11 15-5 7-16 2Z', C.clayLight) + sprig(60, 47, .55, 17);
  if (l >= 9) s += p('M9 63q31 7 62 0v4q-31 4-62 0Z', C.bamboo) + blossom(29, 13, .35, C.cream);
  if (l === 10) s += p('M9 48h18l-2 16q-7 5-14 0Zm45 0h18l-2 16q-7 5-14 0Z', C.clayLight) + ellipse(18, 48, 9, 3, C.clay) + ellipse(63, 48, 9, 3, C.clay) + sprig(42, 29, .56, -5) + blossom(54, 17, .36, C.pink);
  return s;
}

function asian(l) {
  const w = [44, 46, 48, 50, 52, 54, 56, 57, 58, 60][l-1];
  const tiers = l < 4 ? 1 : l < 7 ? 2 : 3;
  const tierH = l < 4 ? 22 : tiers === 2 ? 15 : 11;
  const top = 62-tiers*tierH;
  let s = '';
  if (l >= 3) s += rect(40-w/2-3, 59, w+6, 8, 4, l >= 6 ? C.blue : C.clay);
  if (l >= 5) s += line(`M${40-w/2} 48h-3v-7h5m${w-4} 0h5v7h-3`, C.dark, 3);
  for (let i = tiers-1; i >= 0; i--) {
    const y = top+i*tierH;
    s += p(`M${40-w/2} ${y}h${w}v${tierH-3}q0 9-${w/2} 9t-${w/2}-9Z`, C.bamboo) + ellipse(40, y, w/2, 6, C.oak);
    s += line(`M${40-w/2+4} ${y+7}q${w/2-4} 5 ${w-8} 0`, '#b18c5d', 1.4);
    s += line(`M${40-w/2+8} ${y+8}v${tierH-6}m10-${tierH-6}v${tierH-4}m11-${tierH-4}v${tierH-4}m11-${tierH-4}v${tierH-5}`, '#bd9c69', 1.4);
  }
  if (l >= PRODUCER_DEFS.asian.activeLevel) {
    s += group(40, top-4, 1, p(`M${-w/2-1} 0q1-11 ${w/2+1}-11t${w/2+1} 11Z`, C.bamboo) + ellipse(0, 0, w/2+1, 3, C.oak) + rect(-6, -15, 12, 5, 3, C.dark) + line('M-16-5l8 5m-1-8 8 7m0-9 8 9m-20-2 8-7m0 9 9-8', '#bd9c69', 1.3), -4);
    for (const x of [30, 49]) s += p(`M${x-9} ${top+5}q-2-7 5-10l4-4 4 4q8 3 5 10Z`, C.white) + line(`M${x} ${top-8}v8m-4-5 2 5m6-5-2 5`, C.linen, 1.4);
    s += line(`M${40-w/2+3} ${top+6}q${w/2-3} 7 ${w-6} 0`, C.bamboo, 3);
  } else {
    s += p(`M${40-w/2-2} ${top}q1-${l>=2?19:14} ${w/2+2}-${l>=2?19:14}t${w/2+2} ${l>=2?19:14}Z`, C.bamboo) + ellipse(40, top, w/2+2, 4, C.oak) + rect(34, top-(l>=2?23:18), 12, 6, 3, C.dark);
  }
  if (l >= 6) s += circle(52, 63, 2.5, C.gold) + circle(60, 63, 2.5, C.cream);
  if (l >= 8) s += rect(11, 47, 8, 14, 3, C.clay) + line('M14 47V28m4 19V26', C.dark, 2.6);
  if (l >= 9) s += p('M59 58q-1-12 10-10l2 13Z', C.cream) + ellipse(65, 49, 6, 3, C.linen);
  if (l === 10) s += rect(10, 62, 61, 5, 2, C.blue) + line('M58 21q-5-4 0-9m7 13q-4-4 0-8', C.linen, 2);
  return s;
}

function mediterranean(l) {
  const w = [44, 47, 50, 52, 55, 57, 59, 61, 62, 64][l-1], left = 40-w/2;
  const top = l >= 7 ? 18 : 23-l;
  let s = '';
  if (l >= 3) s += rect(l >= 8 ? 50 : 49, l >= 6 ? 7 : 12, l >= 6 ? 12 : 10, 24, 3, C.clay) + rect(l >= 8 ? 48 : 47, l >= 6 ? 7 : 11, l >= 6 ? 16 : 14, 5, 2, C.cream);
  s += p(`M${left} 58V44Q${left} ${top} 40 ${top}t${w/2} 24v14Z`, C.clayLight);
  s += p(`M${left+w-10} 32q13 14 10 26H42q20-8 13-24Z`, C.clay);
  const mouth = l >= 5 ? 32 : 27;
  s += p(`M${40-mouth/2-3} 59V45q0-19 ${mouth/2+3}-19t${mouth/2+3} 19v14Z`, C.cream) + p(`M${40-mouth/2} 58V45q0-15 ${mouth/2}-15t${mouth/2} 15v13Z`, C.coal);
  s += p('M30 57q-2-9 4-14 0 7 5 8 1-10 8-14-2 8 4 12l-2 8Z', C.gold) + p('M35 57q0-7 6-10-1 6 5 10Z', C.carrot);
  s += ellipse(40, 57, l >= 4 ? 18 : 15, 4.5, C.bamboo) + ellipse(40, 55, l >= 4 ? 16 : 13, 3.7, C.gold) + circle(32, 54, 2.4, C.tomato) + circle(44, 55, 2.4, C.tomato) + circle(48, 53, 2, C.tomato) + line('M36 54l3 2m6-4 3 2', C.leaf, 1.7);
  s += rect(left-2, 59, w+4, l >= 6 ? 8 : 7, 3, C.clay);
  s += shine(`M${left+6} 37q3-10 12-13`);
  if (l >= 2) s += line(`M${left+6} 44h7m${w-26} 0h7M34 ${top+4}l-1 6m11-7 2 6`, '#be8562', 1.7);
  if (l >= 4) s += circle(left+w-8, 31, 4.5, C.cream) + line(`M${left+w-8} 31l1-2`, C.dark, 1.3);
  if (l >= 6) s += p('M22 64h36v3H22Z', C.coal) + line('M27 64l9 2m4-2 9 2', C.oak, 2.7);
  if (l >= 7) s += p('M10 53h7v13h-7Z', C.clay) + line('M14 52l-3-24', C.oak, 3) + p('M8 31 7 21q3-6 9-1l2 10Z', C.bamboo);
  if (l >= 8) s += p('M60 56q0-13 11-13v14Z', C.clayLight) + ellipse(66, 57, 6, 2.5, C.bamboo);
  if (l >= 9) s += line('M20 26q19-12 39 0', C.cream, 3) + rect(11, 64, 60, 4, 2, C.oak);
  if (l === 10) s += p('M54 25q5-10 15-4v21H58Z', C.clayLight) + p('M60 36v-6q4-7 8 0v6Z', C.coal) + rect(57, 39, 14, 4, 2, C.cream);
  return s;
}

function supply(l) {
  const right = [58, 60, 61, 62, 63, 64, 65, 66, 66, 67, 68, 69][l-1];
  const top = [36, 34, 32, 30, 28, 28, 27, 26, 25, 24, 23, 22][l-1];
  let s = line(`M12 15h10l11 43h${right-28}`, C.dark, 4.5) + line('M12 14h10', C.oak, 6);
  s += circle(33, 59, 9, C.coal) + circle(right-4, 59, 8.5, C.coal) + circle(33, 59, 6, C.oak) + circle(right-4, 59, 5.5, C.oak) + circle(33, 59, 2.5, C.steel) + circle(right-4, 59, 2.3, C.steel);
  if (l >= 4) s += p(`M28 49h${right-26}l-2 9H31Z`, C.oak) + rect(34, 44, 13, 12, 2, C.cream);
  if (l >= 6) s += rect(49, 42, 13, 14, 2, C.blue) + line('M52 46h7', C.white);
  if (l >= 8) s += p(`M30 40h${right-28}v4H31Z`, C.steel);
  s += p(`M25 ${top}l${right-25}-3-4 ${53-top}H31Z`, C.bamboo) + p(`M28 ${top+4}l${right-34}-3-3 ${44-top}H33Z`, C.linen);
  s += line(`M26 ${top+7}l${right-28}-3m-${right-29} 11 ${right-31}-2m-${right-32} 10 ${right-33}-1`, '#b38d61', 1.7);
  s += rect(31, top-14, l >= 5 ? 18 : 16, 17, 3, C.cream) + line(`M39 ${top-13}v15`, C.oak, 2.8);
  if (l >= 2) s += p(`M49 ${top+2}l-2-13 12-2 5 13Z`, C.blue) + line(`M50 ${top-9}l9 9`, C.white, 1.5);
  if (l >= 3) s += p(`M35 ${top-10}l1-5 12 1 1 5Z`, C.linen);
  if (l >= 5) s += p(`M58 ${top+1}l-1-14 9 1 3 12Z`, C.clayLight) + rect(58, Math.max(7, top-15), 7, 6, 2, C.oak);
  if (l >= 7) s += line(`M29 ${top-2}l-2-8h${right-27}v10`, C.steel, 3);
  if (l >= 9) s += rect(16, 35, 13, 21, 4, C.linen) + line('M20 40h5m-5 5h5', C.oak);
  if (l >= 10) s += rect(50, 11, 18, 8, 3, C.cream) + line('M54 13h9', C.oak, 2);
  if (l >= 11) s += p('M10 56q8-11 18-6l2 13H12Z', C.linen) + line('M14 57h10', C.oak);
  if (l === 12) s += p('M27 59h45v5H30Z', C.steel) + line('M23 25l-4-10', C.steel, 2.5);
  return s;
}

function publicity(l) {
  const left = [16, 14, 12, 11, 10, 9][l-1];
  const top = [24, 21, 19, 17, 15, 13][l-1];
  let s = line(`M27 ${top+6}l-8 37m32-35 12 36`, C.oak, 4);
  if (l >= 3) s += p('M16 58h47v7H16Z', C.blue) + line('M22 60h34', C.cream);
  if (l >= 5) s += p('M18 52h43v6H18Z', C.clayLight) + line('M23 54h32', C.cream);
  s += p(`M${left} ${top+5}q12-8 ${40-left} 0 14-8 ${29+left/4} 0l-7 33q-13-6-27 0-13-6-${30-left/2} 0Z`, C.oak);
  s += p(`M${left+3} ${top}q12-6 ${37-left} 2 15-8 ${26+left/4} 0l-7 32q-14-4-26 2-12-7-${28-left/2} 0Z`, C.cream);
  s += line(`M40 ${top+2}l-4 33`, C.linen, 2.4);
  s += line(`M${left+8} ${top+10}q7-2 15 2m-16 5q7-2 15 2m-16 5q6-2 13 2M47 ${top+11}q7-3 13-2m-14 8q7-3 12-2`, C.oak, 1.7);
  s += p(`M24 ${top+25}q-6-7 1-10 9-1 10 9Z`, C.carrot) + line(`M24 ${top+16}l5 6`, C.cream, 1.5);
  s += rect(left-1, top+35, 61-left, 6, 2, C.oak);
  if (l >= 2) s += p(`M46 ${top+1}l7-1-3 14-4-3-3 3Z`, C.pink);
  if (l >= 4) s += p(`M57 ${top+23}q9-4 9 3l-1 9H54Z`, C.cream) + ellipse(60, top+23, 6, 2, C.linen);
  if (l >= 6) s += line('M24 61l-2 6m35-6 3 6', C.dark, 3) + rect(48, 8, 15, 7, 3, C.blue) + circle(54, 11, 1.5, C.gold);
  return s;
}

function flower(l) {
  const w = [30, 32, 34, 36, 38, 40, 42, 44, 46][l-1], top = [37, 36, 35, 34, 33, 32, 31, 30, 29][l-1];
  let s = '';
  // Long stems and a high bouquet distinguish this florist bucket from baskets.
  const points = [[24,24,.75,-1],[44,18,.88,0],[60,27,.75,1],[34,14,.6,0],[18,31,.6,0],[59,17,.64,0],[42,24,.7,1]];
  const count = [3,3,4,4,5,5,6,6,7][l-1];
  for (let i=0;i<count;i++) {
    const [x,y,scl,v] = points[i];
    s += line(`M${x} ${y+3}L${38+i%3*3} ${top+17}`, C.leaf, 2);
    s += sprig(x, y+13, .38, i%2 ? 30 : -35);
    s += blossom(x, y, scl, i%3===1 ? C.cream : i%3===2 ? C.gold : C.pink, v);
  }
  if (l >= 5) s += line('M12 34l11 22', C.oak, 3) + ellipse(11, 31, 4, 7, C.oak);
  s += p(`M${40-w/2} ${top}q${w/2}-5 ${w} 0l-4 ${64-top}q-${w/2-4} 8-${w-8} 0Z`, l >= 6 ? C.blue : C.cream);
  s += ellipse(40, top, w/2, 4, C.steel) + ellipse(40, top-1, w/2-4, 2.2, C.inside);
  s += line(`M${40-w/2+3} ${top+15}q${w/2-3} 6 ${w-6} 0`, C.oak, 3.5) + line(`M${40-w/2+3} ${top+18}q${w/2-3} 6 ${w-6} 0`, C.linen, 1.5);
  s += p(`M40 ${top+18}q-12-12-14-3 0 7 14 3 13-12 14-3-1 8-14 3Z`, C.linen) + line(`M40 ${top+18}l-5 10m6-10 6 9`, C.oak, 2);
  s += shine(`M${46-w/2} ${top+6}l1 8`);
  if (l >= 2) s += line(`M${40+w/2} ${top+5}q10 2 6 12l-7 3`, C.oak, 3);
  if (l >= 4) s += line(`M${40-w/2} ${top+5}q-9 2-5 12l6 3`, C.oak, 3);
  if (l >= 7) s += p('M57 44h11l-2 18q-4 4-8 0Z', C.cream) + line('M61 44V31m3 13V29', C.leaf, 2) + blossom(63, 29, .45, C.pink, 1);
  if (l >= 8) s += rect(16, 60, 49, 7, 3, C.oak) + line('M21 62h40', C.bamboo);
  if (l === 9) s += p('M13 43h10l2 17q-7 7-12 0Z', C.linen) + line('M17 44l-3-12m7 12-1-14', C.dark, 2) + circle(14, 30, 3, C.steel) + circle(21, 29, 3, C.steel);
  return s;
}

function recycle(l) {
  const w = [37, 40, 43, 46, 49, 52, 54, 56, 58][l-1];
  const top = [27, 25, 24, 23, 22, 21, 20, 19, 18][l-1], left = 40-w/2;
  let s = '';
  if (l >= 4) s += line(`M${left-1} 33h-4v12h6m${w-2}-12h5v12h-6`, C.dark, 3.5);
  s += p(`M${left} ${top+5}h${w}v${52-top}q0 10-${w/2} 10t-${w/2}-10Z`, C.green);
  s += p(`M${40+w/2-10} ${top+6}h10v${50-top}q0 10-23 11 14-6 13-23Z`, '#7e986b');
  s += ellipse(40, top+5, w/2, 6, C.leaf);
  s += rect(left-2, top, w+4, 8, 4, C.oak) + ellipse(40, top, w/2+2, 5, C.bamboo);
  s += rect(32, top-10, 16, 7, 3, C.dark) + line(`M35 ${top-7}h10`, C.bamboo, 2);
  // The large metal latch, barrel bands, sealed lid and vents separate the
  // compost equipment from open terracotta planters even at its first level.
  s += rect(35, top+3, 10, 15, 3, C.steel) + circle(40, top+10, 2, C.dark);
  s += line(`M${left+1} ${top+19}q${w/2-1} 7 ${w-2} 0M${left+1} 57q${w/2-1} 8 ${w-2} 0`, C.oak, 3);
  s += shine(`M${left+6} ${top+23}v10`);
  s += sprig(41, 55, .52, 23);
  if (l >= 2) s += line(`M${left+7} ${top+26}h5m-5 5h5m${w-26}-5h5m-5 5h5`, C.leaf, 2);
  if (l >= 3) s += rect(51, 54, 10, 7, 2, C.steel) + line('M56 59v5h6', C.dark, 2.4);
  if (l >= 5) s += p(`M${left-2} 58h9v9h-9Zm${w-5} 0h9v9h-9Z`, C.dark);
  if (l >= 6) s += rect(left+5, 34, 15, 10, 3, C.cream) + line(`M${left+8} 39h9`, C.green, 2);
  if (l >= 7) s += p('M59 43q13-6 13 6v14q-5 7-13 0Z', C.green) + rect(58, 41, 14, 6, 3, C.oak) + line('M63 50v8m5-8v8', C.leaf);
  if (l >= 8) s += line('M18 56l-5-26v-9', C.steel, 3) + rect(9, 15, 9, 10, 3, C.oak) + line('M18 64h43', C.steel, 3);
  if (l === 9) s += p('M8 47h13l3 15q-8 7-15 0Z', C.bamboo) + p('M8 46q4-10 8-6 7-6 8 6Z', C.linen) + line('M13 51h6m-5 5h6', C.oak, 1.5);
  return s;
}

const DRAW = { food, tools, produce, drink, herb, asian, mediterranean, supply, publicity, flower, recycle };

/** Return an SVG body only; the caller owns defs, material rendering and shadow. */
export function producerMarkup(family, level) {
  if (typeof family !== 'string' || !family.startsWith('gen_')) return null;
  const id = family.slice(4), definition = PRODUCER_DEFS[id];
  if (!definition || definition.chain !== family || !DRAW[id] || !Number.isInteger(level) || !CHAINS[family]?.[level-1]) return null;
  // Validate against the live catalogue rather than copying active/max levels.
  const active = level >= definition.activeLevel;
  const body = active ? DRAW[id](level) : producerPartsMarkup(family, level);
  return `<g data-producer="${id}" data-level="${level}" data-active="${active}" transform="translate(1 1) scale(.975 .97)">${body}</g>`;
}
