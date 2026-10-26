import { roadPathsMarkup, fenceLinePieces, fieldTileSvg } from '../terrain/components.mjs';
const NS = 'http://www.w3.org/2000/svg';
const scene = document.querySelector('#scene');
const viewport = document.querySelector('#viewport');
const $ = (id) => document.getElementById(id);
const make = (tag, attrs = {}, parent = null) => {
  const el = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  if (parent) parent.append(el);
  return el;
};
const point = (u, v) => ({ x: 800 + (u - v) * 40, y: 75 + (u + v) * 20 });
const poly = (points) => points.map(([u, v]) => { const p = point(u, v); return `${p.x},${p.y}`; }).join(' ');
let seed = 7316;
const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const layers = [];
const addLayer = (el, depth) => { layers.push({ el, depth, order: layers.length }); return el; };
const ground = make('g', { id: 'ground' }, scene);
const objects = make('g', { id: 'objects' }, scene);
const atmosphere = make('g', { id: 'atmosphere', 'pointer-events': 'none' }, scene);
const layout = make('g', { class: 'layout-layer' }, scene);
let assets;
const plantMode = new URLSearchParams(location.search).get('plants') || 'mature';
const plantFamilies = new Map();
let toastTimer;
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2300);
}

// Ground geometry shares the PNG sprites' 2:1 orthographic ground axes.
function bed(u, v, w, h, fill, stroke = 'none', sw = 1, parent = ground) {
  return make('polygon', { points: poly([[u, v], [u + w, v], [u + w, v + h], [u, v + h]]), fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' }, parent);
}

function drawGround() {
  make('rect', { x: -2200, y: -1600, width: 6000, height: 4300, fill: '#c6dea4' }, ground);
  make('path', { d: 'M140 390C170 235 430 170 600 170C810 120 1130 220 1280 330C1440 430 1450 630 1270 750C1130 850 990 920 780 900C580 910 320 820 190 690C90 590 60 490 140 390Z', fill: '#cce2a9' }, ground);
  make('path', { d: 'M400 440C470 350 700 350 810 400C950 390 1110 470 1130 550C1100 680 990 770 820 795C640 805 390 700 350 560Z', fill: '#d0e5ad' }, ground);
  // Gentle lawn freckles: deterministic and kept away from the paths by drawing below them.
  for (let i = 0; i < 310; i++) {
    const x = 80 + rand() * 1450, y = 160 + rand() * 760;
    if (i % 3 === 0) make('ellipse', { cx: x, cy: y, rx: 9 + rand() * 16, ry: 3 + rand() * 5, fill: '#bcd69a', opacity: .35 }, ground);
    else make('path', { d: `M${x-4} ${y}q-2 -6 -5 -5M${x} ${y+1}q0 -8 3 -9M${x+4} ${y}q4 -5 7 -4`, fill: 'none', stroke: i % 4 ? '#abc98c' : '#eef3c9', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: .65 }, ground);
  }
  // A continuous connected lane with the same width at bends and intersections.
  const roads = ['M3 10.5H21.6', 'M11 3.3V21.5', 'M5.5 5.6V10.5', 'M9 5.5V10.5', 'M17 5V10.5', 'M15.4 10.5V15.1', 'M11 16.6H15.4'];
  const roadLayer = make('g', {}, ground);
  roadLayer.innerHTML = roadPathsMarkup(roads, { unit: 40, origin: [800, 75] });
  for (let u = 3.4; u < 21; u += 1.15) {
    const p = point(u, 10.5 + (rand() - .5) * .5);
    make('ellipse', { cx: p.x, cy: p.y, rx: 6 + rand() * 5, ry: 3, fill: '#e7d7aa', opacity: .6 }, ground);
  }
  for (let v = 3.8; v < 21; v += 1.35) {
    const p = point(11 + (rand() - .5) * .5, v);
    make('ellipse', { cx: p.x, cy: p.y, rx: 8, ry: 3.5, fill: '#e7d7aa', opacity: .6 }, ground);
  }
  bed(3.3, 12.2, 5.6, 6.1, '#bea077', '#ab906d', 3);
  bed(3.3, 12.2, 5.6, .13, '#e2c497');
  bed(3.3, 12.2, .13, 6.1, '#e2c497');
  // Every crop has a complete soil cell, with furrows under the plant.
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
    const u = 3.5 + col * 1.35, v = 12.4 + row * 1.17;
    // Affine placement retains the approved rectangular cell footprint.
    const field = make('g', { transform: `matrix(${1.22*40/64} ${1.22*20/64} ${-1.02*40/64} ${1.02*20/64} ${point(u+.61,v+.51).x} ${point(u+.61,v+.51).y})` }, ground);
    const tile = make('g', { transform: 'matrix(.5 -.5 1 1 -68 -4)' }, field);
    tile.innerHTML = fieldTileSvg(plantMode === 'sprout' ? 'sown' : 'empty');
  }
  bed(13.2, 3.5, 6, 5.8, '#d7e4ad');
  bed(13.5, 12.6, 5.5, 5.5, '#d8e4b3');
  // A small pond closes the lower-left corner of the composition.
  make('path', { d: 'M216 711C253 681 312 689 338 715C355 733 410 733 421 758C433 786 388 811 339 817C285 825 211 809 191 780C172 755 185 732 216 711Z', fill: '#b4ca90' }, ground);
  make('path', { d: 'M222 716C257 691 305 699 330 723C350 743 396 741 409 763C423 784 376 803 336 806C284 812 222 797 201 777C185 757 198 734 222 716Z', fill: '#e7dcad', stroke: '#c1bc8c', 'stroke-width': 2 }, ground);
  make('path', { d: 'M229 723C260 706 301 711 323 733C347 754 383 749 397 768C407 781 368 793 330 797C285 801 231 790 212 772C197 758 209 738 229 723Z', fill: '#a5d9d3', stroke: '#90c8ba', 'stroke-width': 2 }, ground);
  const water = make('g', { class: 'water-shine', fill: 'none', stroke: '#e1f3df', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, ground);
  make('path', { d: 'M232 747q19 -6 39 0M289 775q23 4 44 -2M357 770h16' }, water);
  make('ellipse', { cx: 244, cy: 767, rx: 12, ry: 5.5, fill: '#96bc7b' }, ground);
  make('ellipse', { cx: 362, cy: 782, rx: 10, ry: 4, fill: '#a6c686' }, ground);
  flower(363, 778, .7, '#f6c9c2', ground);
}

function flower(x, y, scale = 1, color = '#fff5d7', parent = null) {
  const g = make('g', { transform: `translate(${x} ${y}) scale(${scale})` }, parent);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    make('ellipse', { cx: Math.sin(a) * 4, cy: Math.cos(a) * 4, rx: 3, ry: 3.4, fill: color }, g);
  }
  make('circle', { r: 2, fill: '#e4bc68' }, g);
  return g;
}

// Code-native greenery and terrain can tile without altering the generated sprites.
function tree(x, y, size = 1, variant = 0) {
  const root = make('g', { class: 'entity sway', transform: `translate(${x} ${y})`, style: `--delay:${-rand()*5}s` });
  make('ellipse', { cx: 0, cy: -2, rx: 48 * size, ry: 15 * size, fill: '#9ebd7d', opacity: .25 }, root);
  const g = make('g', { class: 'sprite-art' }, root);
  const s = make('g', { transform: `scale(${size})`, stroke: '#94aa77', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, g);
  make('path', { d: 'M-9 -55L-12 -8Q0 0 13 -8L9 -60Z', fill: '#d7b78a', stroke: '#b4a079' }, s);
  make('path', { d: 'M-2 -12L-1 -44M0 -34L10 -43', fill: 'none', stroke: '#bba57e', 'stroke-width': 2 }, s);
  make('path', { d: 'M-45 -55C-66 -58 -66 -84 -51 -94C-61 -111 -43 -131 -26 -128C-27 -151 -5 -157 9 -146C27 -159 48 -147 49 -128C70 -126 76 -105 63 -91C79 -71 61 -49 43 -52C33 -35 10 -37 0 -44C-18 -32 -40 -39 -45 -55Z', fill: variant % 2 ? '#a8ce91' : '#bad78d' }, s);
  make('path', { d: 'M-50 -76Q-33 -52 -16 -69Q-4 -48 15 -67Q38 -50 58 -78Q65 -55 44 -52C33 -35 10 -37 0 -44C-18 -32 -40 -39 -45 -55Q-60 -60 -50 -76Z', fill: variant % 2 ? '#8fba7e' : '#a1c47b', stroke: 'none' }, s);
  make('path', { d: 'M-31 -117q-4 -17 12 -19M-7 -139q12 -9 20 0M26 -125q12 -5 16 8', fill: 'none', stroke: '#d5e7af', 'stroke-width': 6, 'stroke-linecap': 'round' }, s);
  if (variant === 2) {
    flower(-35, -94, .8, '#f8e4d2', s); flower(24, -113, .8, '#fff2de', s); flower(32, -62, .7, '#f8e4d2', s);
  }
  return addLayer(root, y);
}

function bush(x, y, size = 1, blossoms = false) {
  const root = make('g', { class: 'entity', transform: `translate(${x} ${y}) scale(${size})` });
  make('ellipse', { cx: 0, cy: -3, rx: 36, ry: 10, fill: '#a4c086', opacity: .2 }, root);
  make('path', { d: 'M-33 -6C-48 -8 -44 -28 -31 -29C-34 -44 -17 -51 -8 -41C1 -57 21 -50 22 -37C39 -42 51 -23 39 -14C45 0 22 4 14 -2C0 8 -20 3 -23 -2Q-31 1 -33 -6Z', fill: '#b0d18b', stroke: '#a2bb81', 'stroke-width': 2 }, root);
  make('path', { d: 'M-24 -30q7 -12 17 -4M4 -37q7 -7 14 0', stroke: '#d4e4a8', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, root);
  if (blossoms) { flower(-16, -19, .8, '#fff7dc', root); flower(14, -25, .7, '#f5d7cb', root); flower(23, -9, .55, '#fff7dc', root); }
  return addLayer(root, y + 2);
}

function rock(x, y, size = 1) {
  const g = make('g', { transform: `translate(${x} ${y}) scale(${size})` });
  make('path', { d: 'M-20 0L-25 -11L-13 -26L9 -28L24 -13L21 -2L6 4Z', fill: '#d5d4ba', stroke: '#b9bba1', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  make('path', { d: 'M-13 -26L-3 -11L24 -13M-3 -11L6 4', fill: 'none', stroke: '#c3c5a9', 'stroke-width': 1.5 }, g);
  return addLayer(g, y);
}

function fence(a, b) {
  for (const piece of fenceLinePieces(a, b, { unit: 40, origin: [800, 75] })) {
    const group = make('g'); group.innerHTML = piece.markup; addLayer(group, piece.depth);
  }
}

function sprite(key, u, v, width, options = {}) {
  const family = plantFamilies.get(key);
  if (family && ['sprout','grown','mixed'].includes(plantMode)) {
    const stage = plantMode === 'mixed' ? ['sprout','grown','mature'][Math.abs(Math.round(u*10+v*10))%3] : plantMode;
    const state = family.group === 'crops' ? stage : ({sprout:'young',grown:'growing',mature:'mature'}[stage]);
    const alternative = `${key}-${state}`;
    if (assets[alternative]) { key = alternative; width *= assets[key].displayScale; }
  }
  const asset = assets[key];
  if (!asset) throw new Error(`Missing scene asset: ${key}`);
  const p = options.screen ? { x: u, y: v } : point(u, v);
  const [l, t, r, b] = asset.bounds, height = (b - t) / (r - l) * width;
  const root = make('g', { class: `entity ${options.motion || ''} ${options.interactive ? 'interactive' : ''}`, transform: `translate(${p.x} ${p.y})`, 'data-asset': key, style: `--delay:${-rand()*5}s` });
  const title = make('title', {}, root); title.textContent = asset.label;
  if (options.interactive) make('rect', { x: -width / 2, y: -height, width, height, fill: 'transparent', 'pointer-events': 'all' }, root);
  if (options.shadow !== false) make('ellipse', { class: 'contact-shadow', cx: 0, cy: -width * .07, rx: width * .32, ry: width * .095, fill: '#829c64', opacity: options.shadowOpacity || .17 }, root);
  const art = make('g', { class: 'sprite-art' }, root);
  const crop = make('svg', { x: -width / 2, y: -height, width, height, viewBox: `${l} ${t} ${r-l} ${b-t}`, overflow: 'hidden', 'aria-hidden': 'true' }, art);
  make('image', { href: asset.src, width: asset.size[0], height: asset.size[1] }, crop);
  if (options.interactive) {
    root.setAttribute('role', 'button'); root.setAttribute('tabindex', '0'); root.setAttribute('aria-label', `和${asset.label}打招呼`);
    const react = () => {
      root.classList.remove('pop'); void root.getBoundingClientRect(); root.classList.add('pop');
      const reaction = make('g', { transform: `translate(${p.x} ${p.y-height-12})` }, atmosphere);
      const float = make('g', { class: 'reaction' }, reaction);
      make('path', { d: 'M0 7C-23 -6 -13 -21 0 -10C13 -21 23 -6 0 7Z', fill: '#edb4a2', stroke: '#c78f7e', 'stroke-width': 1.5 }, float);
      setTimeout(() => { root.classList.remove('pop'); reaction.remove(); }, 1650);
      toast(options.message || `${asset.label}向你打了个招呼`);
    };
    root.addEventListener('click', () => { if (!camera.suppressClick) react(); });
    root.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); react(); } });
  }
  return addLayer(root, options.depth || p.y);
}

function drawNature() {
  // The grove embraces the playable space. Foreground trees are smaller to keep the farm legible.
  const trees = [[250,255,1.12],[360,220,1.2],[477,197,1.1],[605,185,1.15],[735,190,1.12],[870,210,1.2],[1010,240,1.05],[1150,280,1.14],[1270,335,1.07],[1385,395,1.13],[1465,496,1.05],[1450,607,.94],[1350,723,.97],[1270,813,1.05],[1150,875,1.02],[1010,935,1.04],[858,968,1.03],[700,963,.95],[558,916,.98],[423,869,.9],[130,386,1.12],[155,285,1.02],[90,501,1.05],[112,619,.97],[142,697,.81]];
  trees.forEach(([x,y,s],i) => tree(x,y,s,i%3));
  [[204,313,1.1],[413,238,.8],[544,220,.95],[948,256,1.05],[1224,350,.95],[1365,465,1],[1410,550,1],[1300,670,.9],[1230,773,.9],[1140,825,.8],[995,891,.9],[780,917,.9],[619,890,.95],[476,823,.8],[172,461,.9],[169,576,.8],[195,655,.9],[368,690,.6],[545,349,.7],[734,361,.65],[985,419,.75]].forEach(([x,y,s],i) => bush(x,y,s,i%3===0));
  [[180,546,.7],[1290,735,.8],[1114,865,.65],[467,803,.6],[353,259,.6],[1370,605,.65],[602,879,.65],[190,677,.65]].forEach(args=>rock(...args));
  for (let i=0;i<42;i++) {
    const angle = i / 42 * Math.PI * 2;
    const x = 790 + Math.cos(angle) * (560 + rand() * 70), y = 548 + Math.sin(angle) * (300 + rand() * 45);
    addLayer(flower(x,y,.6+rand()*.3,i%4===0?'#f2cfbd':'#fff6d6'), y);
  }
}

function populateFarm() {
  // Back courtyard: front doors face the approach lane, rather than being buried by other buildings.
  sprite('farmhouse',5.5,5.4,218);
  sprite('barn',9.45,5.4,194);
  sprite('silo',9.9,2.5,96);
  sprite('hay-bales',11.3,5.25,75);
  sprite('flower-pot',4.35,6.9,38);
  sprite('flower-pot',6.7,6.6,35);
  sprite('order-board',4.35,8.5,76);
  sprite('lamp',8,8.7,28);
  sprite('flower-bed',8.45,7.4,70);
  sprite('wood-sign',2.7,10,50);
  sprite('apple',2.7,6.2,135,{motion:'sway'});
  sprite('cherry',2.6,9,112,{motion:'sway'});
  fence([3,3],[3,5]); fence([3,7.3],[3,9.2]);
  fence([7.1,2.7],[9.2,2.7]);

  // Productive fields: 20 planted cells with a consistent physical footprint.
  for (let row=0;row<5;row++) for (let col=0;col<4;col++) {
    const key = row < 2 ? 'wheat' : row < 4 ? 'carrot' : 'pumpkin';
    const width = key==='wheat'?63:key==='carrot'?59:65;
    sprite(key,4.12+col*1.35,12.98+row*1.17,width,{motion: row<2?'sway':'',shadowOpacity:.1});
  }
  fence([3.1,12.1],[3.1,18.5]);
  fence([3.1,18.5],[8.95,18.5]);
  sprite('wood-sign',9.3,12.7,44);
  sprite('flower-pot',9.4,18.4,38);
  sprite('bench',9.3,20.1,86);
  sprite('blueberries',6.5,19.5,74,{motion:'sway'});
  sprite('raspberry',4.6,19.6,68,{motion:'sway'});

  // Two animal yards. Fence pieces are depth-sorted independently so animals sit inside the enclosure.
  fence([13.15,3.3],[19.1,3.3]);
  fence([19.1,3.3],[19.1,9.3]);
  fence([13.15,3.3],[13.15,9.3]);
  fence([13.15,9.3],[15.3,9.3]);
  fence([16.8,9.3],[19.1,9.3]);
  sprite('chicken-shelter',15.1,4.8,150);
  sprite('hay-bales',17.7,4.7,68);
  sprite('chicken',14.55,7.7,44,{motion:'breathing',interactive:true,message:'小鸡凑过来看了看你。'});
  sprite('chicken',16.6,6.9,41,{motion:'breathing',interactive:true,message:'咯咯，今天的阳光刚刚好。'});
  sprite('chicken',17.75,8.1,46,{motion:'breathing',interactive:true,message:'小鸡开心地抖了抖羽毛。'});
  sprite('trough',18.3,6.1,63);
  for (let i=0;i<10;i++) {const p=point(15.5+rand()*2,7+rand());make('ellipse',{cx:p.x,cy:p.y,rx:2,ry:1.2,fill:'#e7bc6e'},ground);}

  fence([13.3,12.4],[19.2,12.4]);
  fence([19.2,12.4],[19.2,18.3]);
  fence([13.3,12.4],[13.3,14.6]);
  fence([13.3,16.2],[13.3,18.3]);
  fence([13.3,18.3],[19.2,18.3]);
  sprite('sheep-shelter',17.5,13.8,166);
  sprite('hay-bales',19,14.3,60);
  sprite('sheep',15.2,15.7,80,{motion:'breathing',interactive:true,message:'小羊蹦了一下，似乎很喜欢这里。'});
  sprite('lamb',15.1,17.5,58,{motion:'breathing',interactive:true,message:'小羊羔靠近了你一点。'});
  sprite('cow',17.65,16.5,96,{motion:'breathing',interactive:true,message:'奶牛慢悠悠地向你点了点头。'});
  sprite('trough',18.6,17.8,72);

  // An orchard pocket and a picnic spot complete the foreground without obscuring the fields.
  sprite('apple',12.6,19.65,119,{motion:'sway'});
  sprite('cherry',14.45,20.3,112,{motion:'sway'});
  sprite('raspberry',11.35,20.45,67,{motion:'sway'});
  sprite('picnic',12.1,17.9,94);
  sprite('flower-bed',12.1,14.35,61);
  sprite('arch',20.7,10.55,128);
  sprite('flower-pot',20.2,11.9,40);
  sprite('wood-sign',21.55,9.9,48);
  bush(955,789,.65,true);
  bush(1120,678,.65,true);
}

function drawLayout() {
  for(let i=2;i<=21;i++) {
    const a=point(2,i),b=point(21,i),c=point(i,2),d=point(i,21);
    make('path',{d:`M${a.x} ${a.y}L${b.x} ${b.y}M${c.x} ${c.y}L${d.x} ${d.y}`,fill:'none',stroke:'#7f9e73','stroke-width':1,opacity:.3},layout);
  }
  const zones=[{u:3,v:3,w:8,h:6.5,label:'房舍院落',color:'#cf9a7c'},{u:3.1,v:12,w:6,h:6.5,label:'20 格菜地',color:'#ae9066'},{u:13.1,v:3.3,w:6,h:6,label:'鸡舍围场',color:'#b49c65'},{u:13.3,v:12.4,w:5.9,h:5.9,label:'小动物围场',color:'#91a977'}];
  for(const z of zones) {
    const b=bed(z.u,z.v,z.w,z.h,'none',z.color,3,layout); b.setAttribute('stroke-dasharray','8 6');
    const p=point(z.u+z.w/2,z.v+z.h/2),g=make('g',{},layout);
    make('rect',{x:p.x-65,y:p.y-16,width:130,height:32,rx:16,fill:'#fff9e9',stroke:z.color,'stroke-width':1.5},g);
    const t=make('text',{x:p.x,y:p.y+5,'text-anchor':'middle',fill:'#807b5d','font-size':13,'font-family':'system-ui'},g);t.textContent=z.label;
  }
}

function addAtmosphere() {
  [[540,440],[1030,610],[360,680]].forEach(([x,y],i)=>{
    const group=make('g',{transform:`translate(${x} ${y})`},atmosphere);
    const g=make('g',{class:'butterfly',style:`animation-delay:${-i*2}s`},group);
    make('ellipse',{cx:-4,cy:0,rx:4.5,ry:7,fill:i%2?'#fff6d6':'#f3d4b9',transform:'rotate(-25)'},g);
    make('ellipse',{cx:4,cy:0,rx:4.5,ry:7,fill:i%2?'#fff6d6':'#f3d4b9',transform:'rotate(25)'},g);
    make('path',{d:'M0 -3V5',stroke:'#b3a776','stroke-width':1.5},g);
  });
  for(let i=0;i<5;i++) {
    const g=make('g',{transform:`translate(${300+i*230} ${240+i*80})`},atmosphere);
    make('path',{class:'float-leaf',d:'M0 0Q13 -9 17 1Q8 10 0 0Z',fill:'#a9c886',opacity:.6,style:`animation-delay:${-i*2.8}s`},g);
  }
}

async function exportScene() {
  const button=$('export');button.disabled=true;
  try {
    const copy=scene.cloneNode(true);copy.removeAttribute('style');copy.setAttribute('width','1600');copy.setAttribute('height','1030');
    copy.querySelector('.layout-layer')?.remove();copy.querySelectorAll('.reaction').forEach(el=>el.remove());
    const dataURLs=new Map();
    for(const img of copy.querySelectorAll('image')) {
      const src=img.getAttribute('href');
      if(!dataURLs.has(src)) {
        const response=await fetch(src);if(!response.ok)throw new Error('素材读取失败');
        const blob=await response.blob();
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
        dataURLs.set(src,data);
      }
      img.setAttribute('href',dataURLs.get(src));
    }
    const source=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(source);
    try {
      const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
      const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1030;
      canvas.getContext('2d').drawImage(img,0,0);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('图片导出失败');
      const download=URL.createObjectURL(blob),link=document.createElement('a');link.href=download;link.download='羊羊牧场-完整小场景.png';link.click();setTimeout(()=>URL.revokeObjectURL(download),10000);
      toast('场景图已保存');
    } finally { URL.revokeObjectURL(url); }
  } catch(error) { console.error(error);toast('暂时没能保存，请再试一次'); }
  finally { button.disabled=false; }
}

const camera = { zoom: 1, x: 0, y: 0, base: 1, suppressClick: false, pointers: new Map(), gesture: null };
function renderCamera() {
  const rect=viewport.getBoundingClientRect();
  camera.base=Math.min(rect.width/1510,rect.height/995);
  const scale=camera.base*camera.zoom;
  const tx=rect.width/2-800*scale+camera.x,ty=rect.height/2-505*scale+camera.y;
  scene.style.width='1600px';scene.style.height='1030px';scene.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
  $('zoom-value').value=`${Math.round(camera.zoom*100)}%`;
  for(const id of ['overview','closeup']) {const active=id==='overview'?camera.zoom<1.35:camera.zoom>=1.35;$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}
}
function zoomTo(value, px=viewport.clientWidth/2, py=viewport.clientHeight/2) {
  const next=Math.max(.85,Math.min(2.7,value)),ratio=next/camera.zoom;
  camera.x=px-viewport.clientWidth/2-(px-viewport.clientWidth/2-camera.x)*ratio;
  camera.y=py-viewport.clientHeight/2-(py-viewport.clientHeight/2-camera.y)*ratio;
  camera.zoom=next;clampCamera();renderCamera();
}
function clampCamera(){const scale=camera.base*camera.zoom;camera.x=Math.max(-660*scale,Math.min(660*scale,camera.x));camera.y=Math.max(-420*scale,Math.min(420*scale,camera.y));}
function reset(){camera.zoom=1;camera.x=0;camera.y=0;renderCamera();}
function configureCamera(){
  new ResizeObserver(renderCamera).observe(viewport);
  $('export').onclick=exportScene;
  $('overview').onclick=reset;$('reset').onclick=reset;$('closeup').onclick=()=>zoomTo(1.6);
  $('zoom-in').onclick=()=>zoomTo(camera.zoom+.2);$('zoom-out').onclick=()=>zoomTo(camera.zoom-.2);
  $('layout').onclick=()=>{const on=scene.classList.toggle('show-layout');$('layout').classList.toggle('active',on);$('layout').setAttribute('aria-pressed',String(on));};
  $('motion').onclick=()=>{const on=scene.classList.toggle('paused');$('motion').setAttribute('aria-pressed',String(on));$('motion').setAttribute('aria-label',on?'继续场景动态':'暂停场景动态');$('motion').querySelector('path').setAttribute('d',on?'M9 5L18 12L9 19Z':'M9 5V19M15 5V19');};
  viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoomTo(camera.zoom*Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  const restartGesture=()=>{
    const ps=[...camera.pointers.values()];
    camera.gesture=ps.length===2?{type:'pinch',distance:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),zoom:camera.zoom}:ps.length===1?{type:'pan',start:ps[0],x:camera.x,y:camera.y}:null;
  };
  viewport.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    camera.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});camera.suppressClick=false;restartGesture();
    if(camera.pointers.size===2)camera.suppressClick=true;
  });
  viewport.addEventListener('pointermove',e=>{
    if(!camera.pointers.has(e.pointerId))return;
    camera.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=camera.gesture;if(!g)return;
    if(g.type==='pan'){
      const dx=e.clientX-g.start.x,dy=e.clientY-g.start.y;
      if(Math.hypot(dx,dy)>5){camera.suppressClick=true;viewport.classList.add('dragging');viewport.setPointerCapture(e.pointerId);}
      if(camera.suppressClick){camera.x=g.x+dx;camera.y=g.y+dy;clampCamera();renderCamera();}
    }else{
      const ps=[...camera.pointers.values()],r=viewport.getBoundingClientRect();
      zoomTo(g.zoom*Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)/Math.max(1,g.distance),(ps[0].x+ps[1].x)/2-r.left,(ps[0].y+ps[1].y)/2-r.top);camera.suppressClick=true;
    }
  });
  const end=e=>{camera.pointers.delete(e.pointerId);restartGesture();if(!camera.pointers.size){viewport.classList.remove('dragging');setTimeout(()=>camera.suppressClick=false,0);}};
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  viewport.addEventListener('keydown',e=>{
    if(e.target!==viewport)return;const delta={ArrowLeft:[50,0],ArrowRight:[-50,0],ArrowUp:[0,50],ArrowDown:[0,-50]}[e.key];
    if(delta){e.preventDefault();camera.x+=delta[0];camera.y+=delta[1];clampCamera();renderCamera();}else if(e.key==='+'||e.key==='=')zoomTo(camera.zoom+.2);else if(e.key==='-')zoomTo(camera.zoom-.2);else if(e.key==='0')reset();
  });
  renderCamera();
}

async function init(){
  try{
    const response=await fetch('assets.json');if(!response.ok)throw new Error('资源清单加载失败');assets=await response.json();
    if (['sprout','grown','mixed'].includes(plantMode)) {
      const states = await fetch('../plant-states/manifest.json'); if (!states.ok) throw new Error('植物状态清单加载失败');
      const manifest = await states.json();
      manifest.families.forEach(f => plantFamilies.set(f.plant, f));
      for (const a of manifest.assets.filter(a => a.status === 'generated')) assets[a.key] = { src: '../plant-states/'+a.path, size: a.size, bounds: a.opaqueBounds, label: a.label+'·'+a.stateLabel, displayScale: a.displayScale };
    }
    scene.dataset.plants = plantMode;
    drawGround();drawNature();populateFarm();drawLayout();addAtmosphere();
    layers.sort((a,b)=>a.depth-b.depth||a.order-b.order).forEach(({el})=>objects.append(el));
    configureCamera();
    const urls=[...new Set([...scene.querySelectorAll('image')].map(el=>el.getAttribute('href')))];
    const checks=await Promise.allSettled(urls.map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error(src));img.src=src;})));
    const failed=checks.filter(r=>r.status==='rejected');if(failed.length)throw new Error(`${failed.length} 张素材加载失败`);
    $('loading').classList.add('done');
    scene.dataset.ready='true';scene.dataset.assetCount=String(urls.length);scene.dataset.spriteCount=String(scene.querySelectorAll('[data-asset]').length);
  }catch(error){console.error(error);$('loading').querySelector('span').textContent=`${error.message}，请刷新重试`;}
}
init();
