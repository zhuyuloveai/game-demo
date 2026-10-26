/** Cute farm terrain. Pure SVG strings; no DOM, framework, or image dependencies. */
export const PALETTE = Object.freeze({
  grass: '#c6dea4', roadEdge: '#c4b58a', road: '#f5e7bd',
  railEdge: '#bd9f73', rail: '#ebc794', post: '#edca96', postEdge: '#bfa478', postLight: '#f8dcae',
  soil: '#ceaf83', soilAlt: '#c8a87e', soilEdge: '#ac916e', furrow: '#b49770', rim: '#e2c497',
});
// Directions are logical grid directions: N appears up-right, E down-right, S down-left, W up-left.
export const DIRECTIONS = Object.freeze([
  { name: 'N', bit: 1, dx: 0, dy: -1, opposite: 4 },
  { name: 'E', bit: 2, dx: 1, dy: 0, opposite: 8 },
  { name: 'S', bit: 4, dx: 0, dy: 1, opposite: 1 },
  { name: 'W', bit: 8, dx: -1, dy: 0, opposite: 2 },
]);
export const FRAME = Object.freeze({ road: { width: 128, height: 64, anchor: [64, 32] }, fence: { width: 128, height: 136, anchor: [64, 100] }, field: { width: 128, height: 72, anchor: [64, 36] } });
const key = (x, y) => `${x},${y}`;
const n = value => Number(value.toFixed(4));
function checkMask(mask) { if (!Number.isInteger(mask) || mask < 0 || mask > 15) throw new RangeError('Connection mask must be an integer in 0..15.'); }
function checkUnit(unit) { if (!Number.isFinite(unit) || unit <= 0) throw new RangeError('unit must be positive.'); }
export function project(u, v, { unit = 40, origin = [0, 0] } = {}) {
  checkUnit(unit);
  if (![u, v, ...origin].every(Number.isFinite) || origin.length !== 2) throw new TypeError('Finite grid coordinates and a two-value origin are required.');
  return { x: n(origin[0] + (u - v) * unit), y: n(origin[1] + (u + v) * unit / 2) };
}
export function normalizeCells(cells) {
  const unique = new Map();
  for (const c of cells) {
    if (!Array.isArray(c) || c.length !== 2 || !c.every(Number.isInteger)) throw new TypeError('Grid cells must be integer [x,y] pairs.');
    unique.set(key(...c), [...c]);
  }
  return [...unique.values()].sort((a, b) => a[0] + a[1] - b[0] - b[1] || a[0] - b[0]);
}
export function connections(cells) {
  const normalized = normalizeCells(cells), occupied = new Set(normalized.map(c => key(...c)));
  return normalized.map(([x, y]) => ({ x, y, mask: DIRECTIONS.reduce((mask, d) => mask | (occupied.has(key(x + d.dx, y + d.dy)) ? d.bit : 0), 0) }));
}
function svg(frame, body) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`; }
function matrix(unit, origin) { return `matrix(${unit} ${unit / 2} ${-unit} ${unit / 2} ${origin[0]} ${origin[1]})`; }

/** Merged paths: draw every outline first, then every fill, so junctions have no internal seams. */
export function roadPathsMarkup(paths, { unit = 40, origin = [0, 0], width = 1.35 } = {}) {
  project(0,0,{unit,origin}); if (!(width > 0) || !Number.isFinite(width)) throw new RangeError('Road width must be positive.');
  // Only path syntax is accepted. No markup or event attributes can enter the returned SVG.
  if (!paths.every(p => typeof p === 'string' && /^[MmLlHhVvCcSsQqTtAaZzEe0-9.,+\s-]*$/.test(p))) throw new TypeError('Invalid road path.');
  return `<g transform="${matrix(unit, origin)}" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    [[PALETTE.roadEdge, width + .13], [PALETTE.road, width]].map(([color, strokeWidth]) => paths.map(d => `<path d="${d}" stroke="${color}" stroke-width="${n(strokeWidth)}"/>`).join('')).join('') + '</g>';
}
export function roadTileSvg(mask) {
  checkMask(mask);
  const id = `farm-road-${mask.toString(16)}`;
  const arms = DIRECTIONS.filter(d => mask & d.bit).map(d => `M0 0L${d.dx * .8} ${d.dy * .8}`);
  const shape = arms.length ? arms.map(d => `<path d="${d}"/>`).join('') : '<path d="M-.06 0H.06"/>';
  // The clip boundary lies at the shared tile edge; caps extend past it so adjacent tiles join exactly.
  const body = `<g transform="${matrix(64, [64, 32])}"><defs><clipPath id="${id}"><rect x="-.5" y="-.5" width="1" height="1"/></clipPath></defs><g clip-path="url(#${id})"><g stroke="${PALETTE.roadEdge}" stroke-width=".78">${shape}</g><g stroke="${PALETTE.road}" stroke-width=".68">${shape}</g></g></g>`;
  return svg(FRAME.road, body);
}
export function roadNetworkMarkup(cells, options = {}) {
  const { unit = 40, origin = [0, 0] } = options;checkUnit(unit);
  return connections(cells).map(c => {
    const p = project(c.x, c.y, options), source = roadTileSvg(c.mask);
    const body = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'));
    // Unique clip IDs also work when several networks are embedded in one parent SVG.
    const suffix = `${origin[0]}_${origin[1]}_${unit}_${c.x}_${c.y}`.replaceAll('-', 'm').replaceAll('.', 'p');
    const unique = body.replaceAll(`farm-road-${c.mask.toString(16)}`, `farm-road-${c.mask.toString(16)}-${suffix}`);
    return `<svg x="${n(p.x-unit)}" y="${n(p.y-unit/2)}" width="${unit*2}" height="${unit}" viewBox="0 0 128 64" overflow="hidden" fill="none" stroke-linecap="round" stroke-linejoin="round">${unique}</svg>`;
  }).join('');
}

function rails(p, q, size = 1) {
  const path = h => `M${n(p.x)} ${n(p.y-h*size)}L${n(q.x)} ${n(q.y-h*size)}`;
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`+[13, 29].map(h => `<path d="${path(h)}" stroke="${PALETTE.railEdge}" stroke-width="${10*size}"/>`).join('') + [14, 30].map(h => `<path d="${path(h)}" stroke="${PALETTE.rail}" stroke-width="${6*size}"/>`).join('')+'</g>';
}
function post(p, size = 1) {
  return `<g transform="translate(${n(p.x)} ${n(p.y)}) scale(${size})" stroke-linecap="round" stroke-linejoin="round"><path d="M-5 -37L0 -41L6 -37V0Q0 4 -5 0Z" fill="${PALETTE.post}" stroke="${PALETTE.postEdge}" stroke-width="1.5"/><path d="M1 -35V-2" stroke="${PALETTE.postLight}" stroke-width="2"/></g>`;
}
export function fenceTileSvg(mask) {
  checkMask(mask); const p = { x: 64, y: 100 }, size = 1.6;
  const body = DIRECTIONS.filter(d => mask & d.bit).map(d => rails(p, project(d.dx * .5, d.dy * .5, { unit: 64, origin: [64, 100] }), size)).join('') + post(p, size);
  return svg(FRAME.fence, body);
}
/** Individual rail and post pieces carry world depth, ready to interleave with animals/buildings. */
export function fenceNetworkPieces(cells, options = {}) {
  const normalized = normalizeCells(cells), occupied = new Set(normalized.map(c => key(...c)));
  const size = (options.unit ?? 40) / 40, pieces = [];
  for (const [x, y] of normalized) {
    const p = project(x, y, options);
    for (const d of DIRECTIONS.filter(d => d.bit === 2 || d.bit === 4)) if (occupied.has(key(x + d.dx, y + d.dy))) {
      const q = project(x + d.dx, y + d.dy, options);
      pieces.push({ kind: 'rail', depth: Math.max(p.y, q.y) - .01, markup: rails(p, q, size), from: [x, y], to: [x + d.dx, y + d.dy] });
    }
    pieces.push({ kind: 'post', depth: p.y, markup: post(p, size), at: [x, y] });
  }
  return pieces.sort((a, b) => a.depth - b.depth);
}
/** Noninteger axis-aligned runs preserve authored layouts such as the complete small farm. */
export function fenceLinePieces(a, b, { spacing = 1.25, ...options } = {}) {
  if (!(spacing > 0) || !Number.isFinite(spacing)) throw new RangeError('Fence spacing must be positive.');
  if (a[0] !== b[0] && a[1] !== b[1]) throw new RangeError('Fences must follow one of the two ground axes.');
  const p = project(...a, options), q = project(...b, options), size = (options.unit ?? 40) / 40;
  const count = Math.max(1, Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/spacing)), pieces=[];
  if (a[0] === b[0] && a[1] === b[1]) return [{ kind: 'post', depth: p.y, markup: post(p, size) }];
  for(let i=0;i<count;i++) {
    const start={x:p.x+(q.x-p.x)*i/count,y:p.y+(q.y-p.y)*i/count},end={x:p.x+(q.x-p.x)*(i+1)/count,y:p.y+(q.y-p.y)*(i+1)/count};
    pieces.push({kind:'rail',depth:Math.max(start.y,end.y)-.01,markup:rails(start,end,size)});
  }
  for(let i=0;i<=count;i++){const at={x:p.x+(q.x-p.x)*i/count,y:p.y+(q.y-p.y)*i/count};pieces.push({kind:'post',depth:at.y,markup:post(at,size)});}
  return pieces.sort((a,b)=>a.depth-b.depth);
}

export const FIELD_STATES = Object.freeze(['empty','sown','fertilized']);
export function fieldTileSvg(state = 'empty') {
  if(!FIELD_STATES.includes(state))throw new RangeError('Unknown field state.');
  const soil=state==='fertilized'?'#b99a74':PALETTE.soil;
  let body=`<path d="M3 36L64 6L125 36V40L64 70L3 40Z" fill="${PALETTE.soilEdge}"/>`;
  body+=`<path d="M3 36L64 5L125 36L64 67Z" fill="${soil}" stroke="${PALETTE.soilEdge}" stroke-width="2"/>`;
  body+=`<path d="M5 35L64 6L123 35" stroke="${PALETTE.rim}" stroke-width="2.5"/>`;
  for(let row=0;row<4;row++) {
    const v=-.32+row*.21,p=project(-.32,v,{unit:64,origin:[64,36]}),q=project(.32,v,{unit:64,origin:[64,36]});
    body+=`<path d="M${p.x} ${p.y}L${q.x} ${q.y}" stroke="${state==='fertilized'?'#9f8464':PALETTE.furrow}" stroke-width="2.4"/>`;
    if(state!=='empty')for(let col=0;col<3;col++){
      const t=project(-.22+col*.22,v,{unit:64,origin:[64,36]});
      body+=`<ellipse cx="${t.x}" cy="${t.y}" rx="${state==='sown'?2.3:1.7}" ry="${state==='sown'?1.1:1.2}" fill="${state==='sown'?'#8f775c':'#ecd8aa'}"/>`;
    }
  }
  return svg(FRAME.field,body);
}
/** Field instances keep a shared ground anchor; growth sprites are separate layers above them. */
export function fieldPatchMarkup(cells, { state = 'empty', ...options } = {}) {
  const unit=options.unit??40;checkUnit(unit);
  const source=fieldTileSvg(state),body=source.slice(source.indexOf('>')+1,source.lastIndexOf('</svg>'));
  return normalizeCells(cells).map(([x,y])=>{const p=project(x,y,options);return `<svg x="${n(p.x-unit)}" y="${n(p.y-36*unit/64)}" width="${unit*2}" height="${72*unit/64}" viewBox="0 0 128 72" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;}).join('');
}
