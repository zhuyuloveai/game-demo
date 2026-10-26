/** Remaining farm environment: 42 deterministic SVG resources in the approved palette. */
import { PALETTE, DIRECTIONS, normalizeCells, connections, project } from '../terrain/components.mjs';
export const COLORS=Object.freeze({...PALETTE,water:'#a5d9d3',waterLine:'#82bdb3',foam:'#e1f3df',sand:'#e7dcad',sandEdge:'#c1bc8c',ink:'#a39171',cream:'#fff6dc',peach:'#edb4a2'});
const frame=(width,height,anchor,footprint=[1,1])=>({width,height,anchor,footprint});
const ground=frame(128,64,[64,32]);
const definitions=[];
function add(id,label,group,geometry=ground){definitions.push({id,label,group,...geometry,legacyPath:`terrain/${id}.svg`,path:`svg/${id}.svg`});}
for(let i=0;i<3;i++)add(`grass-${i}`,['晴草地','嫩草地','深草地'][i],'grass');
for(let i=0;i<6;i++)add(`accent-${i}`,['草芽','奶油小花','桃色小花','三叶草','落叶','草间碎石'][i],'accent');
for(const [id,label,mask] of [['north','北岸',1],['east','东岸',2],['south','南岸',4],['west','西岸',8],['center','水面',0],['north-east','东北岸角',3],['east-south','东南岸角',6],['south-west','西南岸角',12],['west-north','西北岸角',9],['ripple','水波',null]]){add(`water-${id}`,label,'water');definitions.at(-1).shoreMask=mask;}
for(const axis of ['horizontal','vertical'])for(const state of ['closed','open']){add(`gate-${axis}-${state}`,`${axis==='horizontal'?'右斜':'左斜'}木门·${state==='open'?'打开':'关闭'}`,'gate',frame(256,192,[128,136],[2,1]));definitions.at(-1).axis=axis;definitions.at(-1).state=state;}
for(const [id,label] of [['owned','已拥有边界'],['expandable','可拓展边界'],['locked','未解锁边界']])add(`boundary-${id}`,label,'boundary');
add('unopened-fog','未探索薄雾','boundary');
for(const [id,label] of [['normal','普通占地'],['valid','可以放置'],['conflict','放置冲突'],['entrance','入口方向']])add(`footprint-${id}`,label,'placement');
for(const [id,label] of [['north','向上移动'],['east','向右移动'],['south','向下移动'],['west','向左移动']])add(`scroll-${id}`,label,'scroll',frame(64,64,[32,32],[0,0]));
add('natural-tree','圆冠树','nature',frame(160,200,[80,180],[1,1]));
add('natural-bush','小灌木','nature',frame(128,100,[64,82],[1,1]));
for(let i=0;i<3;i++)add(`rocks-${i}`,['小圆石','双石堆','苔藓大石'][i],'nature',frame(128,100,[64,82],[1,1]));
add('construction-scaffold','施工木架','utility',frame(256,256,[128,224],[2,2]));
add('ground-shadow','接触阴影','utility');
export const ENVIRONMENT_ASSETS=Object.freeze(definitions.map(Object.freeze));
const byId=new Map(ENVIRONMENT_ASSETS.map(a=>[a.id,a]));
const fmt=n=>Number(n.toFixed(4));
const polygon='0,32 64,0 128,32 64,64';
const path=(d,fill='none',stroke=COLORS.ink,width=2,extra='')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const ellipse=(x,y,rx,ry,fill,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
function flower(x,y,color=COLORS.cream,size=1){return `<g transform="translate(${x} ${y}) scale(${size})">`+Array.from({length:5},(_,i)=>ellipse(Math.sin(i*Math.PI*2/5)*4,Math.cos(i*Math.PI*2/5)*4,3,3.4,color)).join('')+ellipse(0,0,2,2,'#e4bc68')+'</g>';}
function foliage(index){
 const sites=[[37,31],[67,21],[85,40]];
 if(index===0)return sites.map(([x,y])=>path(`M${x-5} ${y}q-2 -7 -6 -6M${x} ${y+1}q0 -10 4 -12M${x+4} ${y}q4 -6 8 -5`,'none','#98b77e',2.3)).join('');
 if(index===1||index===2)return sites.map(([x,y],i)=>path(`M${x} ${y+5}v-9`,'none','#9bb581',1.5)+flower(x,y-6,index===1?COLORS.cream:'#f4c6b5',.65+i*.12)).join('');
 if(index===3)return sites.map(([x,y])=>`<g transform="translate(${x} ${y})">`+ellipse(-3,-3,4,3.2,'#a3c984')+ellipse(3,-3,4,3.2,'#a3c984')+ellipse(0,2,3.2,4,'#a3c984')+path('M0 4q2 3 0 6','none','#94b779',1.5)+'</g>').join('');
 if(index===4)return sites.map(([x,y],i)=>path(`M${x-5} ${y}q5 -8 12 -4q0 8 -12 4` ,i%2?'#e5cd96':'#b6ce89','#aeb883',1.2)).join('');
 return sites.map(([x,y],i)=>ellipse(x,y,4+i,2+i*.3,'#d6d7ba',`stroke="#b9bba1" stroke-width="1"`)+path(`M${x+8} ${y+1}q-1 -4 2 -5`,'none','#9ab880',1.4)).join('');
}
function grassSvgBody(index){return `<polygon points="${polygon}" fill="${['#c6dea4','#cfe3ae','#bcd59c'][index]}"/>`+ellipse(34,31,12,3,'#b8d397','opacity=".22"')+ellipse(89,30,9,2.5,'#edf2cb','opacity=".28"')+`<g opacity=".45">${foliage(0)}</g>`;}
export function waterTileSvg(mask=0){
 if(!Number.isInteger(mask)||mask<0||mask>15)throw new RangeError('Water shore mask must be 0..15');
 const edges={1:'M-.7 -.5H.7',2:'M.5 -.7V.7',4:'M-.7 .5H.7',8:'M-.5 -.7V.7'};
 const inner={1:'M-.7 -.39H.7',2:'M.39 -.7V.7',4:'M-.7 .39H.7',8:'M-.39 -.7V.7'};
 const arms=DIRECTIONS.filter(d=>mask&d.bit);
 let body=`<defs><clipPath id="water-${mask}-clip"><polygon points="${polygon}"/></clipPath></defs><g clip-path="url(#water-${mask}-clip)"><polygon points="${polygon}" fill="${COLORS.water}"/>`;
 body+=`<g transform="matrix(64 32 -64 32 64 32)" fill="none" stroke-linecap="square">`;
 body+=arms.map(d=>`<path d="${edges[d.bit]}" stroke="${COLORS.grass}" stroke-width=".3"/>`).join('');
 body+=arms.map(d=>`<path d="${inner[d.bit]}" stroke="${COLORS.sand}" stroke-width=".14"/>`).join('');
 body+='</g>'+path('M49 29q9 -3 17 0M69 40h10','none',COLORS.foam,1.8)+'<path d="M47 42h7" stroke="#91c9c1" stroke-width="1.5"/></g>';
 return svg(ground,body);
}
export function waterConnections(cells){return connections(cells).map(c=>({...c,shoreMask:15^c.mask}));}
function reframe(source,definition,p,unit,unique){
 const factor=unit/64,[ax,ay]=definition.anchor;
 const inner=source.slice(source.indexOf('>')+1,source.lastIndexOf('</svg>')).replaceAll(/id="([^"]+)"/g,(_,id)=>`id="${id}-${unique}"`).replaceAll(/url\(#([^)]+)\)/g,(_,id)=>`url(#${id}-${unique})`);
 return `<svg x="${fmt(p.x-ax*factor)}" y="${fmt(p.y-ay*factor)}" width="${fmt(definition.width*factor)}" height="${fmt(definition.height*factor)}" viewBox="0 0 ${definition.width} ${definition.height}" fill="none" stroke-linecap="round" stroke-linejoin="round" overflow="visible">${inner}</svg>`;
}
export function waterPatchMarkup(cells,options={}){return waterConnections(cells).map(c=>{const p=project(c.x,c.y,options),tag=`${p.x}_${p.y}_${options.unit??40}`.replaceAll('.','p').replaceAll('-','m');return reframe(waterTileSvg(c.shoreMask),ground,p,options.unit??40,tag);}).join('');}
function rail(p,q){return [12,30].map(h=>path(`M${p.x} ${p.y-h}L${q.x} ${q.y-h}`,'none',COLORS.railEdge,8)+path(`M${p.x} ${p.y-h-1}L${q.x} ${q.y-h-1}`,'none',COLORS.rail,5)).join('');}
function post(p){return `<g transform="translate(${p.x} ${p.y})">`+path('M-5 -45L0 -50L6 -45V0Q0 4 -5 0Z',COLORS.post,COLORS.postEdge,1.8)+path('M1 -43V-2','none',COLORS.postLight,2)+'</g>';}
export function gateGeometry(axis,state){
 if(!['horizontal','vertical'].includes(axis)||!['open','closed'].includes(state))throw new RangeError('Unknown gate orientation or state');
 const flip=axis==='horizontal'?1:-1;
 const hinge={x:128-48*flip,y:112},latch={x:128+48*flip,y:160};
 const end=state==='closed'?latch:{x:128+48*flip,y:64};
 return {hinge,latch,end,passable:state==='open',anchor:[128,136]};
}
function gateBody(axis,state){const g=gateGeometry(axis,state),{hinge:a,latch:b,end:c}=g;
 const leaves=rail(a,c)+path(`M${a.x} ${a.y-10}L${c.x} ${c.y-31}`,'none',COLORS.railEdge,5)+path(`M${a.x} ${a.y-11}L${c.x} ${c.y-32}`,'none',COLORS.rail,2.5);
 return leaves+post(a)+post(b)+ellipse(c.x,c.y-22,2.5,2.5,'#b19b75');}
function diamond(fill,stroke,dash=''){return `<polygon points="4,32 64,2 124,32 64,62" fill="${fill}" stroke="${stroke}" stroke-width="2" ${dash?`stroke-dasharray="${dash}"`:''}/>`;}
function lock(x,y){return `<g transform="translate(${x} ${y})">`+path('M-5 -3V-7a5 5 0 0 1 10 0v4','none','#aa997c',2)+`<rect x="-9" y="-3" width="18" height="13" rx="4" fill="#f7e4b8" stroke="#aa997c" stroke-width="1.7"/>`+ellipse(0,3,1.5,2,'#aa997c')+'</g>';}
function boundaryBody(id){
 if(id==='unopened-fog')return diamond('#c1d1ad','#b6c7a5')+`<g fill="#edf0d9" opacity=".92">`+path('M15 38Q4 27 18 23Q13 11 30 12Q34 2 47 11Q61 2 72 12Q87 5 94 18Q112 15 113 30Q128 37 109 44Q104 55 86 49Q72 64 59 52Q42 61 34 48Q14 53 15 38Z','#edf0d9','none',0)+'</g>';
 if(id==='boundary-owned')return diamond('#d0e5ad77','#93af7a','5 4')+path('M57 32l5 5 10 -10','none','#86a36b',2.4);
 if(id==='boundary-expandable')return diamond('#f5ebc677','#c2b88b','5 4')+ellipse(64,32,12,10,'#fff6db')+path('M58 32h12M64 26v12','none','#a9a479',2.5);
 return diamond('#c9d2b799','#a3ae94','4 5')+lock(64,31);
}
function footprintBody(state){
 const c={normal:['#f7efcd55','#c2b48c'],valid:['#d2e8ad88','#86a66e'],conflict:['#f2bfb477','#ca8f81'],entrance:['#c8e5dc88','#8bb5a3']}[state];
 let body=diamond(c[0],c[1],state==='normal'?'4 4':'');
 if(state==='valid')body+=path('M55 32l6 6 13 -13','none','#7e9d65',3);
 if(state==='conflict')body+=path('M57 26l14 12M71 26L57 38','none','#bc8276',3);
 if(state==='entrance')body+=path('M46 23L79 40M66 39l13 1 -4 -10','none','#78a695',3);
 return body;
}
function scrollBody(direction){const angle={north:0,east:90,south:180,west:270}[direction];return `<circle cx="32" cy="32" r="26" fill="#fff6dc" stroke="#d3c7a5" stroke-width="2"/><g transform="rotate(${angle} 32 32)">`+path('M21 35l11 -10 11 10M25 43l7 -6 7 6','none','#a7ae82',3.5)+'</g>';}
function treeBody(){return `<g transform="translate(80 180)">`+path('M-9 -55L-12 -8Q0 0 13 -8L9 -60Z','#d7b78a','#b4a079',2.2)+path('M-2 -12L-1 -44M0 -34L10 -43','none','#bba57e',2)+path('M-45 -55C-66 -58 -66 -84 -51 -94C-61 -111 -43 -131 -26 -128C-27 -151 -5 -157 9 -146C27 -159 48 -147 49 -128C70 -126 76 -105 63 -91C79 -71 61 -49 43 -52C33 -35 10 -37 0 -44C-18 -32 -40 -39 -45 -55Z','#bad78d','#94aa77',2.2)+path('M-50 -76Q-33 -52 -16 -69Q-4 -48 15 -67Q38 -50 58 -78Q65 -55 44 -52C33 -35 10 -37 0 -44C-18 -32 -40 -39 -45 -55Q-60 -60 -50 -76Z','#a1c47b','none',0)+path('M-31 -117q-4 -17 12 -19M-7 -139q12 -9 20 0M26 -125q12 -5 16 8','none','#d5e7af',6)+'</g>';}
function bushBody(){return `<g transform="translate(64 80)">`+path('M-33 -6C-48 -8 -44 -28 -31 -29C-34 -44 -17 -51 -8 -41C1 -57 21 -50 22 -37C39 -42 51 -23 39 -14C45 0 22 4 14 -2C0 8 -20 3 -23 -2Q-31 1 -33 -6Z','#b0d18b','#a2bb81',2)+path('M-24 -30q7 -12 17 -4M4 -37q7 -7 14 0','none','#d4e4a8',5)+flower(-16,-19,'#fff7dc',.7)+flower(14,-25,'#f5d7cb',.6)+'</g>';}
function rockBody(index){
 const one=(x,y,scale,moss)=>`<g transform="translate(${x} ${y}) scale(${scale})">`+path('M-20 0L-25 -11L-13 -26L9 -28L24 -13L21 -2L6 4Z','#d5d4ba','#b9bba1',2)+path('M-13 -26L-3 -11L24 -13M-3 -11L6 4','none','#c3c5a9',1.5)+(moss?path('M-20 -15q5 -12 15 -10q11 -6 18 4q-8 0 -12 5q-7 -5 -13 3Z','#adc58f','none',0):'')+'</g>';
 if(index===0)return one(64,77,1.15,false);
 if(index===1)return one(47,67,1.1,false)+one(82,79,.85,false);
 return one(62,74,1.8,true)+one(95,83,.6,false);
}
function scaffoldBody(){
 let b='';const p=(u,v,z)=>{const q=project(u,v,{unit:48,origin:[128,182]});return{x:q.x,y:q.y-z};};
 const runs=[[[ -1,-1],[1,-1]],[[1,-1],[1,1]]];
 for(const [a,c] of runs){for(const z of [10,60,110]){const x=p(...a,z),y=p(...c,z);b+=path(`M${x.x} ${x.y}L${y.x} ${y.y}`,'none','#b59b75',8)+path(`M${x.x} ${x.y-1}L${y.x} ${y.y-1}`,'none','#e8c99a',5);}const x=p(...a,12),y=p(...c,108);b+=path(`M${x.x} ${x.y}L${y.x} ${y.y}`,'none','#c0a57e',5);}
 for(const [u,v] of [[-1,-1],[1,-1],[1,1]]){const q=p(u,v,0);b+=path(`M${q.x} ${q.y}v-130`,'none','#b49c78',9)+path(`M${q.x+1} ${q.y-2}v-126`,'none','#efd2a2',5);}
 b+=path('M145 83L166 93L166 117L145 107Z','#f0c6a8','#bf9c7d',1.5)+path('M151 97l9 5','none','#fff0cd',3);return b;
}
function svg(def,body){return `<svg xmlns="http://www.w3.org/2000/svg" width="${def.width}" height="${def.height}" viewBox="0 0 ${def.width} ${def.height}" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;}
export function environmentSvg(id){
 const d=byId.get(id);if(!d)throw new RangeError(`Unknown environment asset: ${id}`);
 if(d.group==='water'&&d.shoreMask!==null)return waterTileSvg(d.shoreMask);
 let b='';
 if(d.group==='grass')b=grassSvgBody(Number(id.at(-1)));
 else if(d.group==='accent')b=foliage(Number(id.at(-1)));
 else if(id==='water-ripple')b=path('M30 32q12 -6 24 0M63 38q14 5 28 -1M60 22h15','none',COLORS.foam,2.4);
 else if(d.group==='gate')b=gateBody(d.axis,d.state);
 else if(d.group==='boundary')b=boundaryBody(id);
 else if(d.group==='placement')b=footprintBody(id.slice(10));
 else if(d.group==='scroll')b=scrollBody(id.slice(7));
 else if(id==='natural-tree')b=treeBody();
 else if(id==='natural-bush')b=bushBody();
 else if(id.startsWith('rocks-'))b=rockBody(Number(id.at(-1)));
 else if(id==='construction-scaffold')b=scaffoldBody();
 else if(id==='ground-shadow')b=ellipse(64,32,43,15,'#829c64','opacity=".17"');
 return svg(d,b);
}
/** Instances share ground anchors; callers sort tall items by returned depth. */
export function environmentInstance(id,u,v,options={}){
 const d=byId.get(id);if(!d)throw new RangeError(`Unknown environment asset: ${id}`);
 const p=project(u,v,options),unit=(options.unit??40)*(options.scale??1),unique=`${id}_${p.x}_${p.y}_${unit}`.replaceAll('-','m').replaceAll('.','p');
 if(!Number.isFinite(unit)||unit<=0)throw new RangeError('Positive visual scale required');
 return {id,depth:p.y,markup:reframe(environmentSvg(id),d,p,unit,unique)};
}
