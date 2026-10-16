// Distinct working silhouettes for the active producer tiers. The shared art
// renderer supplies its material treatment, outline and contact shadow.
const C = {
  cream: '#fff3dd', oak: '#d3aa79', dark: '#86664e', pink: '#dba2aa',
  green: '#92aa78', gold: '#e5bc63', blue: '#9bafbc', ink: '#665b54',
  white: '#fff9ee', clay: '#ca8965', clayLight: '#e6ac83', steel: '#bdc8c1',
  leaf: '#708e60', lime: '#b6c58e', carrot: '#e9a069', tomato: '#d68471',
  bamboo: '#dfbe88', inside: '#85735c', linen: '#e9d8b8', coal: '#5d6259',
};
const p = (d, fill = C.cream) => `<path d="${d}" fill="${fill}"/>`;
const r = (x,y,w,h,fill=C.cream,rx=3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const e = (x,y,rx,ry,fill=C.cream) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const c = (x,y,rad,fill=C.cream) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}"/>`;
const ln = (d,fill=C.dark,w=1.8) => `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const g = (x,y,s,body,a=0) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">${body}</g>`;
const sprig = (x,y,s=1,a=0) => g(x,y,s,ln('M0 0V-25',C.leaf,2)+p('M0-5C-12-5-16-14-11-17-3-17 1-11 0-5Z',C.green)+p('M0-13C0-24 8-29 13-24 15-16 7-12 0-13Z',C.lime)+p('M0-20C-8-22-9-29-5-31 1-29 3-24 0-20Z',C.green),a);
const wheat = (x,y,s=.55) => g(x,y,s,ln('M0 4V-26',C.dark,2)+p('M0-4q-12-1-10-10Q0-12 0-4Zm0-10q-11-1-8-11Q0-22 0-14Zm0 4q12-1 10-11Q0-18 0-10Zm0-11q10-2 7-10Q0-28 0-21Zm0-4q-6-7 0-13 6 6 0 13Z',C.gold));
const foot = (x,y,w) => r(x,y,w,4,C.oak,2);
const jar = (x,top,w,h,{fill=C.cream,neck=false,lid=false}={}) => {
  const l=x-w/2, bot=top+h;
  const body=neck ? p(`M${x-w*.28} ${top}h${w*.56}v9Q${l+w} ${top+13} ${l+w} ${top+22}v${h-29}q0 7-${w/2} 7t-${w/2}-7v-${h-29}q0-9 ${w*.22}-13Z`,fill)
    : p(`M${l} ${top+3}q${w/2}-9 ${w} 0l-2 ${h-12}q-1 9-${w/2-2} 9t-${w/2-2}-9Z`,fill);
  return body+e(x,top+3,neck?w*.28:w/2,4,C.oak)+e(x,top+2,neck?w*.2:w/2-3,2.6,C.inside)+(lid?r(x-w*.32,top-2,w*.64,6,C.bamboo):'')+ln(`M${l+5} ${top+15}v${Math.max(5,h-27)}`,C.white,2.5)+ln(`M${l+3} ${bot-10}q${w/2-3} 4 ${w-6} 0`,C.oak,2)+wheat(x,bot-11,Math.min(.52,w/45));
};
const dispenser = (x,y,w,h) => jar(x,y,w,h,{neck:true,lid:true})+r(x-5,y+h-9,10,8,C.oak)+ln(`M${x} ${y+h-3}v6h6`,C.steel,3);
function food(l) {
  switch(l) {
    case 5: return jar(40,32,54,33)+e(40,32,27,5,C.linen)+e(40,31,21,3,C.inside)+wheat(40,58,.64);
    case 6: return jar(40,14,34,51,{neck:true})+r(26,12,28,7,C.oak)+wheat(40,53,.7);
    case 7: return jar(25,29,29,36)+jar(56,21,29,44,{lid:true})+foot(9,63,62);
    case 8: return foot(18,62,44)+dispenser(40,11,40,44)+p('M24 64l5-11h22l5 11Z',C.linen);
    case 9: return foot(9,63,62)+jar(23,39,27,26)+jar(51,13,35,52,{neck:true,lid:true})+r(9,61,27,4,C.oak);
    case 10: return foot(10,63,60)+jar(25,15,30,28,{lid:true})+jar(55,15,30,28,{lid:true})+jar(40,40,39,25)+r(13,39,54,5,C.oak);
    case 11: return foot(9,63,62)+dispenser(23,10,27,44)+dispenser(57,10,27,44)+jar(40,45,24,20,{fill:C.linen})+r(13,53,54,4,C.oak);
    default:return null;
  }
}
// Utensils sit well above their pottery; their large cups remain the tier cue.
const utensil = (x,y,s=1,type=0,a=0) => g(x,y,s,
  type===0 ? ln('M0 0V-24',C.oak,4)+e(0,-28,5,7,C.bamboo)
  : type===1 ? p('M-2 0-3-22h-5v-13H8v13H3L2 0Z',C.steel)+ln('M-4-32v7m4-7v7m4-7v7',C.inside,1.2)
  : ln('M0 0V-22',C.dark,3)+e(0,-28,6,8,C.cream),a);
const cup = (x,y,w,h,fill=C.cream) => p(`M${x-w/2} ${y}h${w}l-2 ${h-6}q-${w/2-2} 10-${w-4} 0Z`,fill)+e(x,y,w/2,4,C.cream)+e(x,y-1,w/2-3,2.4,C.inside)+ln(`M${x-w/2+5} ${y+8}v${Math.max(4,h-18)}`,C.white,2.5);
const toolCup = (x,y,w,h,fill=C.cream,count=2) => {
 const size=Math.min(.7,w/40,(y-8)/36);
 return utensil(x-w*.18,y+3,size*.96,1,-10)+utensil(x+w*.2,y+3,size,0,11)+(count>2?utensil(x,y+1,size*1.04,2):'')+cup(x,y,w,h,fill);
};
function tools(l) {
  const blue=l>=7?C.blue:C.cream;
  switch(l) {
    case 4: return toolCup(40,37,48,29,C.cream,3)+ln('M17 43q-8-1-7 8l8 3m45-11q8-1 7 8l-8 3',C.oak,3);
    case 5: return utensil(25,40,.79,1,-10)+utensil(48,40,.85,0,10)+cup(40,39,62,25)+ln('M40 39v24',C.oak,3)+e(40,39,3,4,C.oak);
    case 6: return toolCup(24,37,28,29)+toolCup(56,28,28,38)+foot(10,63,60);
    case 7: return toolCup(40,31,31,35,blue,3)+cup(18,48,18,18,blue)+cup(62,48,18,18,blue)+foot(9,63,62);
    case 8: return toolCup(22,39,26,27,blue)+toolCup(45,20,25,36,blue)+toolCup(62,44,20,22,blue)+r(31,53,27,6,C.oak);
    case 9: return utensil(25,25,.45,1,-10)+utensil(55,25,.45,0,9)+cup(25,24,26,21,blue)+cup(55,24,26,21,blue)+r(11,44,58,5,C.oak)+r(15,48,5,16,C.oak)+r(60,48,5,16,C.oak)+toolCup(40,47,29,20,C.cream);
    case 10: return toolCup(22,30,24,35,blue)+toolCup(58,30,24,35,blue)+cup(40,48,22,18,C.cream)+foot(9,63,62)+ln('M32 37h16',C.oak,4);
    case 11: return toolCup(19,43,20,23,blue)+toolCup(40,32,23,34,blue,3)+toolCup(62,21,19,45,blue)+r(9,63,62,4,C.oak)+r(51,49,20,4,C.oak);
    case 12: return utensil(22,25,.47,1,-8)+utensil(41,25,.5,0)+utensil(59,25,.46,2,8)+cup(40,24,58,20,blue)+r(10,43,60,5,C.oak)+toolCup(23,49,25,18,C.cream)+toolCup(57,49,25,18,C.cream)+ln('M15 46v18m50-18v18',C.oak,3);
    default:return null;
  }
}
const pot = (x,y,w,h,plants=2) => {
  let leaves='';
  for(let i=0;i<plants;i++) leaves+=sprig(x+(i-(plants-1)/2)*w*.18,y+2,Math.min(.65,w/43,(y-8)/32),i%2?15:-15);
  return leaves+p(`M${x-w/2} ${y}h${w}l-4 ${h-5}q-${w/2-4} 8-${w-8} 0Z`,C.clay)+e(x,y,w/2,4,C.clayLight)+e(x,y-1,w/2-3,2.5,C.inside)+ln(`M${x-w/2+5} ${y+8}l2 ${Math.max(4,h-16)}`,C.white,2.5)+e(x,y+h,w/2,2.5,C.clayLight);
};
function herb(l) {
  switch(l) {
    case 4:return pot(40,35,38,30,3);
    case 5:return pot(40,47,62,17,4)+ln('M13 53h54',C.clayLight,3);
    case 6:return pot(24,39,29,26)+pot(57,31,29,34)+foot(10,64,61);
    case 7:return foot(10,64,60)+r(44,48,23,15,C.oak)+pot(24,46,29,18)+pot(56,25,29,24);
    case 8:return r(14,38,52,5,C.oak)+ln('M18 42v22m44-22v22',C.oak,4)+pot(26,25,25,15)+pot(55,25,25,15)+pot(40,50,39,15,3);
    case 9:return pot(17,46,20,19)+pot(40,24,29,41,3)+pot(63,46,20,19)+foot(8,64,64);
    case 10:return foot(9,64,62)+r(29,47,20,16,C.oak)+r(50,33,20,30,C.oak)+pot(19,48,22,17)+pot(40,32,24,17)+pot(61,17,21,17);
    default:return null;
  }
}
const bun = (x,y,s=.65) => g(x,y,s,p('M-10 3q-2-8 5-11l5-5 5 5q7 3 5 11Z',C.white)+ln('M0-10v8m-4-5 2 5m6-5-2 5',C.linen,1.5));
const steam = (x,y,w,h,open=false) => {
  const left=x-w/2;
  return p(`M${left} ${y}h${w}v${h-5}q-${w/2} 10-${w} 0Z`,C.bamboo)+e(x,y,w/2,4,C.oak)+(open?e(x,y-1,w/2-3,2.5,C.inside)+bun(x-w*.19,y,.6)+bun(x+w*.2,y,.6):'')+ln(`M${left+3} ${y+5}q${w/2-3} 4 ${w-6} 0`,C.bamboo,2)+[.2,.5,.8].map(t=>ln(`M${left+w*t} ${y+7}v${Math.max(3,h-10)}`,C.oak,1.5)).join('');
};
const lid = (x,y,w) => {
 const dome=Math.min(12,y-10);
 return p(`M${x-w/2} ${y}Q${x-w*.43} ${y-dome} ${x} ${y-dome}t${w/2} ${dome}Z`,C.bamboo)+e(x,y,w/2,2.8,C.oak)+r(x-5,Math.max(7,y-16),10,5,C.dark,2);
};
function asian(l) {
  switch(l) {
    case 4:return r(17,60,46,6,C.clay)+steam(40,36,44,26,true)+lid(40,25,47);
    case 5:return r(10,60,60,6,C.clay)+steam(40,47,58,14)+steam(40,32,58,14,true)+lid(40,21,58);
    case 6:return r(21,61,38,5,C.blue)+steam(40,48,34,14)+steam(40,34,34,14)+steam(40,20,34,14,true)+lid(40,17,37);
    case 7:return r(8,59,64,7,C.blue)+steam(23,37,29,22,true)+steam(57,37,29,22,true)+lid(23,26,29)+lid(57,26,29)+c(35,63,2,C.gold)+c(45,63,2,C.cream);
    case 8:return r(9,59,62,7,C.blue)+steam(40,44,61,17,true)+steam(40,25,39,18,true)+lid(40,19,42)+ln('M11 45H8v9h4m57-9h3v9h-4',C.dark,2.5);
    case 9:return r(9,60,62,6,C.blue)+steam(24,45,29,16)+steam(24,28,29,16,true)+lid(24,20,30)+steam(57,43,29,18,true)+lid(57,32,30);
    case 10:return r(8,59,64,7,C.blue)+steam(40,43,62,17,true)+lid(40,32,62)+steam(20,20,22,13,true)+steam(60,20,22,13,true)+r(29,12,22,6,C.dark)+c(34,63,2,C.gold)+c(45,63,2,C.cream);
    default:return null;
  }
}
const fire = (x,y,s=1) => g(x,y,s,p('M-8 0q-4-9 1-14 0 7 5 8 2-11 7-14-2 9 4 13l-1 7Z',C.gold)+p('M-3 0q-1-7 4-10 0 6 5 10Z',C.carrot));
const mouth = (x,y,w,h) => p(`M${x-w/2-3} ${y}v-${h}q0-${h*.8} ${w/2+3}-${h*.8}t${w/2+3} ${h*.8}v${h}Z`,C.cream)+p(`M${x-w/2} ${y}v-${h}q0-${h*.65} ${w/2}-${h*.65}t${w/2} ${h*.65}v${h}Z`,C.coal)+fire(x,y-2,Math.min(.85,w/24));
const oven = (x,base,w,h,wide=false) => {
 const top=base-h;
 return p(`M${x-w/2} ${base}v-${h*.4}Q${x-w/2} ${top} ${x} ${top}t${w/2} ${h*.6}v${h*.4}Z`,C.clayLight)+p(`M${x+w/2-9} ${top+h*.34}q12 ${h*.3} 9 ${h*.66}H${x+6}q14-${h*.2} 6-${h*.6}Z`,C.clay)+mouth(x,base-2,w*(wide?.69:.47),h*.37)+r(x-w/2-1,base,w+2,5,C.clay)+ln(`M${x-w/2+6} ${top+h*.5}q2-${h*.3} ${w*.25}-${h*.35}`,C.white,2.5);
};
function mediterranean(l) {
  switch(l) {
    case 4:return oven(40,61,58,32,true)+r(53,18,11,17,C.clay)+r(51,17,15,5,C.cream);
    case 5:return r(48,10,12,18,C.clay)+r(46,9,16,5,C.cream)+oven(40,61,44,47)+c(55,33,3,C.cream);
    case 6:return p('M8 61V39Q8 22 23 22h34q15 0 15 17v22Z',C.clayLight)+mouth(25,60,20,15)+mouth(56,60,20,15)+r(8,61,64,5,C.clay)+r(13,12,12,17,C.clay)+r(11,11,16,5,C.cream)+ln('M13 37q3-10 11-10',C.white,2.5);
    case 7:return r(14,60,52,6,C.clay)+oven(40,59,54,29,true)+oven(40,32,35,22)+r(32,8,16,6,C.cream)+r(35,12,10,10,C.clay);
    case 8:return r(51,11,11,23,C.clay)+r(49,10,15,5,C.cream)+oven(27,61,37,34)+oven(56,61,30,46)+ln('M12 63h56',C.oak,3);
    case 9:return r(9,61,62,5,C.clay)+oven(40,60,62,28,true)+oven(23,32,28,21)+oven(57,32,28,21)+ln('M11 35h58',C.cream,3);
    case 10:return r(11,61,58,5,C.clay)+oven(24,60,30,39)+oven(56,60,30,39)+oven(40,29,33,17,true)+r(34,8,12,7,C.clay)+r(31,7,18,5,C.cream)+ln('M12 46h56',C.cream,2.5);
    default:return null;
  }
}
// Carts vary through the cargo structure itself, with wheels and handle as anchors.
const wheels = (x1=24,x2=61,y=61) => c(x1,y,6,C.coal)+c(x2,y,6,C.coal)+c(x1,y,3.5,C.oak)+c(x2,y,3.5,C.oak)+c(x1,y,1.5,C.steel)+c(x2,y,1.5,C.steel);
const handle = (x=11,y=20,base=56) => ln(`M${x} ${y}h9l8 ${base-y}h40`,C.dark,3.5)+ln(`M${x} ${y}h8`,C.oak,5);
const parcel = (x,y,w=15,h=15,fill=C.cream) => r(x,y,w,h,fill,2)+ln(`M${x+w/2} ${y+1}v${h-2}`,C.oak,2)+ln(`M${x+3} ${y+4}h${w-6}`,C.linen,1.5);
const cargo = (x,y,w,h,deep=false) => p(`M${x} ${y}h${w}l-3 ${h}H${x+4}Z`,C.bamboo)+p(`M${x+3} ${y+3}h${w-6}l-2 ${deep?7:4}H${x+5}Z`,C.linen)+ln(`M${x+4} ${y+h*.5}h${w-8}M${x+5} ${y+h-4}h${w-10}`,C.oak,1.7);
const platform = (x,y,w) => r(x,y,w,5,C.steel,2);
function supply(l) {
  switch(l) {
    case 4:return handle(12,16)+wheels(36,58)+p('M27 24 52 20 61 54 35 58Z',C.bamboo)+p('M31 27 49 24 55 49 38 52Z',C.linen)+ln('M31 32l24-3m-21 13 24-3m-20 12 22-3',C.oak,1.8)+parcel(31,11,18,15)+r(38,34,13,10,C.blue,2)+ln('M41 38h7',C.white,1.5);
    case 5:return handle(10,18)+wheels(27,60)+p('M24 29q18-14 45-7l-7 33H30Z',C.bamboo)+e(47,25,22,5,C.linen)+parcel(32,13,18,16)+ln('M29 37h35m-32 10h29',C.oak,2);
    case 6:return handle(10,26)+wheels(24,65)+platform(20,53,52)+parcel(24,33,20,20)+parcel(45,39,24,14,C.blue)+parcel(48,22,16,17,C.cream);
    case 7:return handle(10,15)+wheels(26,62)+ln('M27 23v34m40-34v34',C.steel,3)+cargo(23,23,47,13)+cargo(26,44,43,12)+parcel(29,11,18,13)+parcel(46,32,17,14,C.blue);
    case 8:return handle(10,14)+wheels(26,63)+ln('M27 18v39m41-39v39',C.steel,3)+platform(23,21,48)+platform(25,38,45)+platform(27,54,42)+parcel(28,8,17,13)+parcel(47,24,19,14,C.blue)+parcel(31,41,20,13);
    case 9:return handle(10,18)+wheels(24,64)+cargo(21,42,22,13)+cargo(43,29,26,26)+parcel(25,29,15,15)+parcel(48,13,17,18,C.blue)+ln('M22 55h48',C.steel,3);
    case 10:return handle(10,19)+wheels(26,62)+cargo(23,29,48,26)+ln('M47 30v24',C.dark,3)+parcel(28,12,16,19)+parcel(51,18,15,13,C.blue)+ln('M24 29h46',C.steel,3);
    case 11:return handle(10,14)+wheels(25,63)+ln('M24 19v37m45-37v37',C.steel,3)+cargo(23,19,46,13)+cargo(23,43,46,13)+parcel(29,7,17,12)+parcel(28,32,16,12,C.blue)+parcel(49,33,16,11)+ln('M46 20v35',C.oak,2.5);
    case 12:return handle(9,16)+wheels(23,65)+ln('M24 17v40m45-40v40',C.steel,3)+cargo(21,43,50,13)+cargo(38,24,32,15)+cargo(21,17,18,22)+parcel(24,7,13,12)+parcel(45,11,19,15,C.blue)+parcel(26,31,14,13)+ln('M21 56h50',C.steel,3);
    default:return null;
  }
}
const book = (x,y,w,h,open=true) => open ? p(`M${x-w/2} ${y+3}q${w/4}-6 ${w/2} 0 ${w/4}-6 ${w/2} 0l-3 ${h}q-${w/4}-5-${w/2-3} 0-${w/4}-5-${w/2-3} 0Z`,C.oak)+p(`M${x-w/2+2} ${y}q${w/4}-5 ${w/2-2} 1 ${w/4}-5 ${w/2-2} 0l-3 ${h-2}q-${w/4}-3-${w/2-5} 1-${w/4}-5-${w/2-5} 0Z`,C.cream)+ln(`M${x} ${y+2}v${h-2}`,C.linen,2)+ln(`M${x-w/2+6} ${y+8}h${w*.23}m-${w*.23} 6h${w*.2}M${x+5} ${y+8}h${w*.2}m-${w*.2} 6h${w*.17}`,C.oak,1.5)
  : r(x-w/2,y,w,h,C.cream)+r(x-w/2,y,4,h,C.blue)+ln(`M${x-w/2+7} ${y+6}h${w-11}m-${w-11} 6h${w-13}`,C.oak,1.5);
function publicity(l) {
 switch(l) {
  case 4:return ln('M24 29l-8 35m35-35 12 35',C.oak,4)+p('M12 54 23 22h36l10 32Z',C.oak)+g(40,24,1,book(0,0,49,29),-6)+r(12,55,57,6,C.oak)+r(19,61,43,5,C.blue);
  case 5:return ln('M16 37v27m47-27v27M16 63h47',C.oak,4)+g(24,21,1,book(0,0,29,31),-12)+g(56,21,1,book(0,0,29,31),12)+p('M11 55 39 60 69 55v6L39 66 11 61Z',C.oak)+r(28,59,24,6,C.blue);
  case 6:return ln('M14 30v34m51-45v45',C.oak,4)+book(22,13,22,22,false)+book(55,8,25,25,false)+r(9,34,61,5,C.oak)+book(40,38,53,21)+r(10,59,60,6,C.blue)+ln('M16 65v2m48-2v2',C.dark,2.5);
  default:return null;
 }
}
const bloom = (x,y,s=.6,color=C.pink) => g(x,y,s,[0,72,144,216,288].map(a=>g(0,0,1,e(0,-5,4,6,color),a)).join('')+c(0,0,3.3,C.gold));
const bouquet = (x,y,w,top,flowers=3) => {
 let s='';
 for(let i=0;i<flowers;i++) {
  const bx=x+(i-(flowers-1)/2)*w/(flowers+1), by=Math.max(12,top)+(i%2?0:6);
  s+=ln(`M${bx} ${by}L${x+(i%2?3:-3)} ${y+12}`,C.leaf,1.7)+sprig(bx,by+12,.28,i%2?30:-25)+bloom(bx,by,.46,i%3===0?C.pink:i%3===1?C.cream:C.gold);
 }
 return s;
};
const bucket = (x,y,w,h,fill=C.blue) => p(`M${x-w/2} ${y}h${w}l-3 ${h-4}q-${w/2-3} 7-${w-6} 0Z`,fill)+e(x,y,w/2,3.5,C.steel)+e(x,y-1,w/2-3,2,C.inside)+ln(`M${x-w/2+3} ${y+h*.57}q${w/2-3} 5 ${w-6} 0`,C.oak,2.8)+ln(`M${x-w/2+5} ${y+6}v${Math.max(4,h*.25)}`,C.white,2.5);
const flowerBucket = (x,y,w,h,top,fill=C.blue,n=3) => bouquet(x,y,w,top,n)+bucket(x,y,w,h,fill);
function flower(l) {
 switch(l) {
  case 5:return flowerBucket(40,34,28,31,11,C.cream,3)+ln('M54 39q10 0 8 10l-9 5',C.oak,3);
  case 6:return flowerBucket(40,46,60,19,16,C.blue,5)+ln('M11 50q-5-7 1-10m57 10q5-7-1-10',C.oak,2.5);
  case 7:return flowerBucket(24,40,29,25,17)+flowerBucket(56,31,29,34,9)+foot(9,64,62);
  case 8:return foot(9,64,62)+flowerBucket(17,49,20,16,30,C.blue,2)+flowerBucket(40,33,26,32,9,C.blue,3)+flowerBucket(63,43,20,22,22,C.blue,2);
  case 9:return ln('M14 37v27m52-27v27',C.oak,3.5)+r(10,36,60,5,C.oak)+flowerBucket(25,26,26,12,10,C.blue,2)+flowerBucket(56,26,26,12,10,C.blue,2)+flowerBucket(40,51,57,14,33,C.blue,4)+foot(10,64,60);
  default:return null;
 }
}
const leafMark = (x,y,s=.65) => sprig(x,y,s,22);
const barrel = (x,y,w,h,split=false) => p(`M${x-w/2} ${y}h${w}v${h-6}q-${w/2} 12-${w} 0Z`,C.green)+e(x,y,w/2,4,C.leaf)+r(x-w/2-1,y-3,w+2,6,C.oak)+e(x,y-3,w/2+1,3,C.bamboo)+r(x-5,y-7,10,5,C.dark)+ln(`M${x-w/2+2} ${y+h-9}q${w/2-2} 5 ${w-4} 0`,C.oak,3)+(split?ln(`M${x} ${y+4}v${h-6}`,C.leaf,3):'')+leafMark(x,y+h-10,Math.min(.5,w/50))+r(x-3,y+1,6,8,C.steel);
const drum = (x,y,w,h) => p(`M${x-w/2+7} ${y-h/2}h${w-14}q10 0 10 ${h/2}t-10 ${h/2}h-${w-14}q-10 0-10-${h/2}t10-${h/2}Z`,C.green)+e(x-w/2+7,y,7,h/2,C.leaf)+e(x+w/2-7,y,7,h/2,C.green)+ln(`M${x-w/2+14} ${y-h/2+1}v${h-2}m${w-28}-${h-2}v${h-2}`,C.oak,3)+leafMark(x,y+9,.42)+r(x-6,y-h/2-3,12,6,C.oak);
function recycle(l) {
 switch(l) {
  case 5:return barrel(40,22,38,41)+r(19,61,8,6,C.dark)+r(53,61,8,6,C.dark)+ln('M20 36h-7v12h7m40-12h7v12h-7',C.dark,3);
  case 6:return drum(40,43,59,34)+ln('M21 54l-4 11m42-11 4 11M17 65h46',C.dark,3)+r(34,28,12,8,C.steel);
  case 7:return barrel(40,18,42,45,true)+r(15,62,50,5,C.dark)+r(25,33,10,9,C.cream)+r(45,33,10,9,C.cream)+ln('M40 12v-3',C.steel,2.5);
  case 8:return barrel(23,30,28,34)+barrel(57,22,28,42)+r(9,63,62,4,C.dark)+ln('M36 41h7',C.steel,4);
  case 9:return drum(40,30,58,27)+ln('M17 35l-5 29m51-29 5 29',C.dark,3.5)+p('M18 47h44l-5 17H23Z',C.green)+e(40,47,22,4,C.leaf)+ln('M23 58h34',C.oak,3)+r(35,40,10,9,C.steel)+r(17,64,46,3,C.dark);
  case 10:return barrel(22,20,28,43,true)+barrel(57,20,28,43,true)+platform(8,64,64)+ln('M35 37h9M22 13V9h35v4',C.steel,3)+r(32,5,15,9,C.cream,2)+c(39.5,9.5,2,C.gold)+c(22,68,4,C.dark)+c(58,68,4,C.dark);
  default:return null;
 }
}
const DRAW = { food,tools,herb,asian,mediterranean,supply,publicity,flower,recycle };
/** Body markup only. Unsupported families and inactive tiers use the caller's art. */
export function varietyProducerMarkup(family,level) {
 if(typeof family!=='string'||!family.startsWith('gen_')||!Number.isInteger(level))return null;
 const id=family.slice(4);
 if(!Object.hasOwn(DRAW,id))return null;
 const draw=DRAW[id];
 const body=draw(level);
 return body===null?null:`<g data-producer-variety="${id}" data-level="${level}">${body}</g>`;
}
