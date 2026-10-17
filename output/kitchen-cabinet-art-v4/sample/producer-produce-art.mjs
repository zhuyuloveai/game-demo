// Active vegetable storage stages. Each tier owns its structure and silhouette;
// the shared producer renderer adds volume, outlines, padding and the shadow.
const C = {
  cream: '#fff3dd', white: '#fff9ee', oak: '#d3aa79', dark: '#86664e',
  green: '#92aa78', leaf: '#708e60', lime: '#b6c58e', carrot: '#e9a069',
  bamboo: '#dfbe88', inside: '#85735c', linen: '#e9d8b8',
};
const p = (d, fill = C.oak, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const line = (d, color = C.dark, width = 1.7) => p(d, 'none', `stroke="${color}" stroke-width="${width}"`);
const rect = (x, y, w, h, r = 3, fill = C.oak) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const ellipse = (x, y, rx, ry, fill = C.bamboo) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const g = (x, y, scale, body, angle = 0) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${body}</g>`;

// Large readable produce shapes, with only one broad vein or carrot cut.
const greens = (x, y, scale = 1, angle = 0) => g(x, y, scale,
  p('M0 3C-16 2-22-10-15-15-5-17 2-6 0 3Z', C.green) +
  p('M0 2C-6-12 0-24 8-23 20-21 15-7 0 2Z', C.lime) +
  line('M-10-9 0 3 8-15', C.leaf, 1.8), angle);
const carrot = (x, y, scale = 1, angle = 0) => g(x, y, scale,
  p('M-6-9Q0-14 6-9L2 13q-2 5-4 0Z', C.carrot) +
  p('M-1-10q-13-2-9-10 7 0 9 10Zm1 0q-3-13 4-16 7 6-4 16Zm2 0q6-10 12-6 0 7-12 6Z', C.green) +
  line('M-4-3h5m-4 7h3', C.dark, 1.2), angle);

// Half-open woven bowl. Content is drawn between its dark cavity and front lip.
function bowl(x, y, width, height, content = '', tilt = 0) {
  const half = width / 2;
  return g(x, y, 1,
    p(`M${-half} 0Q0-8 ${half} 0l-4 ${height-5}Q0 ${height+5} ${4-half} ${height-5}Z`) +
    ellipse(0, 0, half, 5.2) + ellipse(0, -.8, half-4, 3.5, C.inside) + content +
    p(`M${-half} 1Q0 8 ${half} 1l-1 4Q0 11 ${1-half} 5Z`, C.bamboo) +
    line(`M${4-half} ${height*.59}Q0 ${height*.59+6} ${half-4} ${height*.59}`, C.dark, 1.5) +
    line(`M${9-half} 7l2 ${Math.max(3,height-11)}M0 8v${Math.max(3,height-10)}M${half-9} 7l-2 ${Math.max(3,height-11)}`, C.dark, 1.3) +
    line(`M${5-half} 8l1 4`, C.white, 2.3), tilt);
}

function shallowTray() {
  return p('M9 46Q40 36 71 46l-5 15Q40 70 14 61Z') +
    ellipse(40, 45, 31, 10) + ellipse(40, 43, 26, 7, C.inside) +
    greens(49, 44, 1.13, 20) + carrot(27, 40, .92, -48) +
    p('M9 46Q40 60 71 46l-2 7Q40 67 11 53Z', C.bamboo) +
    line('M15 58q25 10 50 0M23 54l1 9m13-6v8m14-10-1 9m12-12-2 9', C.dark, 1.5) +
    line('M15 47q10 5 20 6', C.white, 2.4);
}

function deepHamper() {
  // Tall uninterrupted cylindrical wall, with a single high oval mouth.
  return p('M19 31h42l-2 27q-1 9-19 9-19 0-19-9Z') +
    ellipse(40, 31, 21, 7) + ellipse(40, 30, 17, 4, C.inside) +
    greens(45, 29, .83, 10) + carrot(31, 30, .76, -18) +
    p('M18 31q22 10 44 0v6q-22 11-44 0Z', C.bamboo) +
    line('M23 44q17 7 34 0M23 53q17 8 34 0M25 61q15 6 30 0', C.dark, 1.7) +
    line('M28 39l2 23m10-21v23m12-25-2 23', C.dark, 1.4) +
    rect(17, 32, 7, 12, 3, C.cream) + rect(56, 32, 7, 12, 3, C.cream) +
    line('M25 43v12', C.white, 2.6);
}

function slatCrate() {
  // Square corners and heavy slats replace the previous round wicker profile.
  return p('M10 36 20 29h45l6 8-4 27H13Z', C.oak) +
    p('M11 36 21 31h42l7 6-10 10H19Z', C.inside) +
    greens(51, 37, 1.02, 22) + carrot(29, 36, .86, -28) +
    rect(11, 38, 58, 8, 2, C.bamboo) + rect(12, 49, 56, 7, 2, C.bamboo) +
    rect(13, 59, 54, 7, 2, C.bamboo) +
    rect(12, 37, 8, 30, 2, C.oak) + rect(60, 37, 8, 30, 2, C.oak) +
    rect(31, 40, 18, 4, 2, C.inside) +
    line('M23 51h34M23 61h34', C.white, 1.8);
}

function twinBaskets() {
  // Two low circular bodies separated by a visible V-shaped central gap.
  return rect(16, 61, 48, 5, 2, C.oak) +
    bowl(24, 39, 31, 25, greens(-1, -1, .65, -8)) +
    bowl(57, 40, 30, 24, carrot(-1, -3, .67, 15)) +
    rect(35, 47, 10, 7, 3, C.cream);
}

function leaningDouble() {
  // Staggered mouths on a diagonal frame leave a large open space at right.
  return line('M20 65 32 18M59 65 46 20M24 56h32', C.oak, 5) +
    bowl(43, 27, 43, 17, greens(2, -1, .72, 12), -10) +
    bowl(32, 48, 46, 17, carrot(-4, -3, .73, -28), 8) +
    rect(15, 63, 14, 4, 2, C.bamboo) + rect(51, 63, 14, 4, 2, C.bamboo);
}

function triangularStand() {
  // A triangular load-bearing frame and three broad upward-facing mouths.
  return p('M13 63 36 15q4-7 8 0l23 48h-7L40 25 20 63Z', C.oak) +
    line('M21 57h38', C.cream, 3) +
    bowl(40, 24, 31, 15, greens(1, -1, .58, 10)) +
    bowl(23, 48, 30, 17, carrot(0, -3, .56, -24)) +
    bowl(57, 48, 30, 17, greens(1, -1, .61, 20));
}

function tallRack() {
  // Narrow three-storey rack: horizontal shelf slots stay open between tiers.
  return rect(21, 12, 6, 55, 2, C.oak) + rect(53, 12, 6, 55, 2, C.oak) +
    rect(18, 63, 12, 4, 2, C.bamboo) + rect(50, 63, 12, 4, 2, C.bamboo) +
    bowl(40, 20, 38, 10, greens(1, -1, .51, 18)) +
    bowl(40, 38, 38, 10, carrot(-2, -2, .47, -22)) +
    bowl(40, 55, 38, 10, greens(1, -1, .51, -9));
}

function broadRack() {
  // Wide, two-column open shelving uses four square front-access bins.
  let s = rect(9, 20, 5, 47, 2, C.oak) + rect(66, 20, 5, 47, 2, C.oak) +
    rect(37, 20, 6, 46, 2, C.oak) + rect(9, 63, 62, 5, 2, C.bamboo);
  for (const [x, y, veg] of [[12, 26, 0], [43, 26, 1], [12, 49, 1], [43, 49, 0]]) {
    s += p(`M${x} ${y}h25v15q-12 4-25 0Z`, C.oak) +
      rect(x, y-3, 25, 9, 2, C.inside) +
      (veg ? carrot(x+12, y, .5, 20) : greens(x+13, y+2, .55, -10)) +
      rect(x-1, y+5, 27, 9, 2, C.bamboo) +
      line(`M${x+5} ${y+9}h15`, C.dark, 1.5);
  }
  return s;
}

function fanCounter() {
  // Three long radiating compartments have a scalloped, fanned outer edge.
  // The open channels, oblique dividers and single pedestal read as one stand.
  return p('M30 55h20l6 11H24Z', C.oak) +
    p('M9 35 14 22q2-4 6-2l20 13 20-13q4-2 6 2l5 13-8 23q-23 12-46 0Z', C.oak) +
    p('M11 33 18 24l18 13 4-23q1-6 5-4l15 14 9 10-11 17-18 8-20-8Z', C.bamboo) +
    p('M15 33 19 27l17 13-3 14-12-7Z', C.inside) +
    p('M39 18 43 13l13 14-10 27-9 2Z', C.inside) +
    p('M48 42 60 27l7 8-10 13-12 7Z', C.inside) +
    greens(26, 41, .6, -38) + carrot(43, 34, .62, -2) + greens(57, 40, .56, 50) +
    line('M34 53 38 17M45 55 59 26', C.bamboo, 4) +
    p('M14 48q26 17 52 0l-3 10q-23 13-46 0Z', C.bamboo) +
    line('M22 57q18 7 36 0', C.dark, 1.7);
}

function harvestCabinet() {
  // A broad low stepped cabinet, with one rear trough and a split front chest.
  // Solid cream plinth and deep cubby openings create a heavy final silhouette.
  return rect(10, 61, 60, 7, 3, C.cream) +
    p('M17 30h45v14h9v19H9V44h8Z', C.oak) +
    p('M17 30 25 25h30l7 5-7 12H24Z', C.bamboo) +
    p('M23 31 28 28h24l5 4-7 7H28Z', C.inside) +
    greens(38, 32, .94, -12) + carrot(54, 32, .7, 24) +
    rect(16, 36, 47, 9, 2, C.bamboo) +
    p('M9 45 18 39h45l8 6-6 14H15Z', C.bamboo) +
    p('M14 45 20 42h19v13H17Zm29-3h18l6 4-5 9H43Z', C.inside) +
    carrot(27, 48, .64, -52) + greens(55, 50, .65, 22) +
    rect(9, 53, 62, 10, 2, C.bamboo) + rect(37, 42, 6, 20, 2, C.oak) +
    rect(19, 56, 12, 4, 2, C.inside) + rect(49, 56, 12, 4, 2, C.inside) +
    line('M14 65h51', C.oak, 1.7);
}

const TIERS = {
  3: shallowTray, 4: deepHamper, 5: slatCrate, 6: twinBaskets,
  7: leaningDouble, 8: triangularStand, 9: tallRack, 10: broadRack,
  11: fanCounter, 12: harvestCabinet,
};

/** Return an SVG body for active produce stages; leave assembly stages alone. */
export function produceTierMarkup(level) {
  return Number.isInteger(level) && TIERS[level] ? TIERS[level]() : null;
}
