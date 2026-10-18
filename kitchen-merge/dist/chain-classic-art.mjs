// Hand-drawn native SVG illustrations for the approved October 2026 identity plan.
// The two skins share identities, while this module preserves the classic painted look.
import CLASSIC_LAYOUT, {CLASSIC_LEVELS} from './chain-classic-layout.mjs';
const C={ink:'#876b51',cream:'#fff0d4',white:'#fff9eb',gold:'#e7ba60',orange:'#e6a15c',red:'#d97869',wine:'#985b6b',pink:'#dca2ac',purple:'#9774a1',green:'#91aa70',darkGreen:'#597f58',blue:'#91b7c3',dark:'#65575b',wood:'#cba174',silver:'#b4c5c7'};
const p=(d,f=C.cream,s=C.ink,w=1.5)=>`<path d="${d}" fill="${f}" stroke="${s}" stroke-width="${w}"/>`;
const e=(x,y,rx,ry,f=C.cream,s=C.ink)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" stroke="${s}" stroke-width="1.4"/>`;
const r=(x,y,w,h,rad=4,f=C.cream,s=C.ink)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}" fill="${f}" stroke="${s}" stroke-width="1.5"/>`;
const l=(d,c=C.ink,w=1.7)=>p(d,'none',c,w);
const g=(body,x=0,y=0,s=1,rot=0)=>`<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${body}</g>`;
const dots=(positions,color=C.cream,rad=1.7)=>positions.map(([x,y])=>e(x,y,rad,rad,color,'none')).join('');
const leaf=(x,y,s=1,rot=0,color=C.green)=>g(p('M0 0Q-19-3-17-17 1-20 0 0Z',color)+l('M-13-14 0 0',C.darkGreen,1),x,y,s,rot);
const plate=()=>e(40,63,30,7,C.white)+e(40,61,24,4,C.cream,'none');
const bowl=(fill=C.cream)=>e(40,42,29,9,fill)+p('M11 42Q14 66 40 68 65 66 69 42Q40 59 11 42Z',fill)+e(40,42,24,5,C.gold,'none');
const seedDots=(color=C.cream)=>dots([[29,31],[42,27],[51,35],[23,43],[37,41],[48,48],[33,54],[40,61]],color,1.3);
const strawberry=()=>p('M18 30Q12 44 38 67Q43 69 62 43Q71 25 51 23H30Z',C.red)+p('m40 29-19-6 13-3-4-10 11 8 10-11-1 13 14 4-18 5Z',C.green)+seedDots();
const fruit=[
 ()=>p('M40 26C13 10 8 42 21 60Q31 73 40 66Q53 73 63 58C76 32 59 13 40 26Z',C.red)+l('M40 26Q38 16 44 10',C.wood,4)+leaf(43,20,.85,70)+l('M24 31Q19 41 24 47',C.cream,3),
 ()=>e(35,43,26,26,C.orange)+leaf(38,20,.8,90)+l('M35 20v-7',C.wood,3)+p('M47 48L70 37Q81 66 53 71Z','#f6d082')+p('m50 51 17-9q6 21-12 25Z',C.orange)+l('m52 53 12 8m-11-6 8-9',C.cream,2),
 ()=>p('M13 56Q43 66 57 15L68 20Q65 65 24 70L13 64Z',C.gold)+p('M54 20 59 12Q66 9 68 20L59 48Z',C.cream)+p('M58 31Q37 29 35 51L45 48Q44 36 57 39M59 33Q75 35 72 56L64 48Q68 42 59 40Z',C.gold)+l('M20 61Q46 61 56 44','#f5d790',3),
 strawberry,
 ()=>p('M21 22C42 5 57 23 63 39Q77 61 57 69Q35 76 21 59Q9 42 21 22Z',C.orange)+p('M19 29Q18 52 43 67Q20 66 16 46Z',C.gold,'none')+leaf(34,21,.85,80),
 ()=>p('M21 31Q27 13 45 17Q63 22 63 45Q64 66 43 68Q18 64 21 31Z',C.pink)+[[-2,1],[16,-5],[28,11],[4,26]].map(([x,y])=>g(p('m22 29-8-13 2 18 10 7Z',C.green),x,y)).join('')+p('m45 19 7-13-1 18m6 31 14-3-10 13m-35-5-14 5 15 3',C.green),
 ()=>e(35,45,26,23,C.purple)+p('m35 25-17-6 6-11 12 9 11-10 10 14-17 6Z',C.darkGreen)+e(56,58,18,15,'#724f7c')+e(56,57,14,11,C.white)+[0,60,120].map(a=>g(e(0,0,3.5,9,C.white,'#dbcfc0'),56,57,1,a)).join(''),
 ()=>p('M15 39 16 25 25 27 28 14 38 20 48 12 54 23 65 22 63 35 73 43 64 52 62 64 50 63 41 71 31 63 20 64 22 53 10 48Z','#a4ad69')+Array.from({length:4},(_,i)=>p(`m${24+i*9} 29 4-7 3 11-8 8 4-7`,C.green)).join('')+p('M40 41Q65 35 71 54Q65 70 46 71Q40 62 40 41Z','#edf0c1')+e(55,56,9,11,C.gold)
];
const vegetable=[
 ()=>p('M25 27Q36 18 49 31L31 70Q24 76 23 65Z',C.orange)+leaf(35,27,.9,-20)+leaf(35,25,.8,75)+l('m25 40 8 2m-6 9 7 2m-7 8 4 1'),
 ()=>g(p('M32 11Q45 7 49 20L45 65Q39 75 30 66Z',C.darkGreen)+l('M37 18 35 62',C.green,4)+dots([[43,24],[31,31],[43,43],[32,52],[40,60]],C.green,1.2),9,0,1,18),
 ()=>p('M42 23Q61 20 64 43Q67 68 40 69Q12 69 18 48Q22 33 42 23Z',C.purple)+p('m39 27-5-9 9 2 7-7 1 10 10 3-11 5Z',C.green)+l('M46 21q3-8 10-10',C.darkGreen,3)+l('M24 47q-3 11 7 14',C.pink,3),
 ()=>p('m31 44-3 24h25l-5-25Z','#aec68a')+[[-16,0],[-7,-11],[8,-10],[18,0],[0,5]].map(([x,y])=>e(40+x,34+y,14,13,C.darkGreen)).join('')+dots([[20,32],[34,20],[48,24],[58,33],[38,41]],C.green,3),
 ()=>e(40,46,31,24,C.orange)+e(40,46,20,24,C.orange)+e(40,46,9,24,'#efb96c')+p('m35 23 2-12 8-1-1 14Z',C.wood),
 ()=>[-12,0,12].map((x,i)=>g(p('M37 31H43L42 70H37Z',C.green)+p('m36 32 4-22 5 22Z',C.darkGreen)+l('m37 23 6 4m-5 1 6 4',C.green),x,Math.abs(i-1)*5,1,i===1?0:i===0?-8:8)).join(''),
 ()=>p('M14 65Q21 46 26 42L29 29 37 29 40 9 48 27 55 28 58 42 67 53 69 66Z','#b9ca78')+[[29,52,1],[42,38,.9],[52,52,.8],[40,22,.6],[19,60,.5],[61,62,.5]].map(([x,y,s])=>g(p('M-10 8Q-8-2 0-15L10 8Z','#b9ca78')+l('m-7 4 13-1M-4-2h8M-2-7h4','#94a95e'),x,y,s)).join('')+p('m16 64-6 4 31 5 30-8-13 1Z',C.green),
 ()=>p('M17 44Q16 22 40 14Q66 26 63 48L48 67H32Z','#9bad86')+[[26,35],[43,28],[55,42],[33,51],[47,57]].map(([x,y])=>g(p('M-10 8Q-12-6 0-16Q12-6 10 8Q0 14-10 8Z','#b4c29b')+l('M0 8V-10','#7f9669'),x,y,.8)).join('')+r(36,65,8,8,2,C.green)
];
function grain(level){
 const stem=l('M38 69Q37 39 40 12',C.wood,2);
 if(level===2||level===7){const color=level===7?'#6e5a73':C.gold;return l('M21 70Q15 22 43 17Q64 14 68 32',C.wood,2)+[0,1,2,3].map(i=>l(`M${31+i*10} ${22+i*3}q-7 6-4 22`,C.wood,1.3)+[0,1,2].map(k=>g(e(0,0,3,6,color),28+i*10,28+i*4+k*8,1,-25)).join('')).join('')+leaf(21,66,.8,20)+(level===7?Array.from({length:7},(_,i)=>g(e(0,0,2.5,5,color),36+i*4,69+(i%2)*3,1,-40)).join(''):'');}
 if(level===4)return l('M40 71V14',C.wood,2)+[[27,29],[54,20],[18,43],[58,42],[29,57]].map(([x,y])=>l(`M40 ${y-8}Q${x} ${y-15} ${x} ${y}`,C.wood,1.2)+e(x,y+5,4,9,'#d5bc82')+l(`m${x} ${y+12}-2 6`,C.wood,1)).join('')+leaf(40,68,.7,20);
 if(level===5||level===8){const color=level===5?'#b37a59':'#c485a2';return l('M39 71V48',C.wood,3)+leaf(39,66,.8,20)+leaf(39,61,.7,110)+Array.from({length:7},(_,row)=>Array.from({length:Math.min(row+1,5)},(_,col)=>{const count=Math.min(row+1,5),x=40+(col-(count-1)/2)*7+(row%2?2:0),y=14+row*6;return e(x,y,level===5?4:3.5,level===5?4.5:3.5,color)}).join('')).join('');}
 if(level===3)return p('M27 19Q42 10 52 21L56 56Q45 72 28 62Z',C.gold)+Array.from({length:6},(_,i)=>l(`M28 ${25+i*6}h24`,'#c79749',1.2)).join('')+l('M35 18v44m9-44v45','#c79749',1.2)+p('M28 62Q9 57 14 29Q30 40 33 64M45 65Q68 54 64 32Q48 39 45 65Z',C.green);
 if(level===6)return stem+[[25,35],[45,24],[54,43],[35,51],[47,58]].map(([x,y])=>p(`m${x} ${y-7} 7 11-12 1Z`,C.wood)).join('')+leaf(38,64,.8,40);
 const colors=[C.gold,C.cream,C.gold,'#d5bc82','#bd7b63',C.wood,'#6e5a73','#d6a5a5'];const c=colors[level-1];
 const grains=Array.from({length:level===1?6:4},(_,i)=>{let y=18+i*7;return level===1?g(e(-4,0,4,8,c)+e(5,1,4,8,c),40,y,1,30):l(`M39 ${y}Q${level===4?20:27} ${y-4} ${20+i%2*7} ${y+7}`,C.wood,1)+e(20+i%2*7,y+8,level===8?4:3,level===8?4:6,c)+l(`M40 ${y}q12-2 19 6`,C.wood,1)+e(59,y+8,level===5?4:3,level===5?4:6,c)}).join('');
 return stem+grains+leaf(38,66,.9,25);
}
function herb(level){
 if(level===6)return p('m40 49-20-9-6-15 14-7 12 14 8-20 18 8-6 17Z',C.purple)+p('m40 49-10-25 12-9 9 10Z','#b99bc5')+l('m37 43 5-18m-2 17 10-13m-12 14-7-11',C.red,2.2)+l('M40 49v22',C.green,3);
 if(level===2)return l('M39 70V17M39 43 20 30m19 9 21-15',C.darkGreen,2)+[[21,29,0],[59,25,110],[39,45,10],[41,58,110]].map(([x,y,a])=>g(p('M0 0-7-2-4-6-12-6-9-11-16-12-13-17-7-15-6-21 1-16 5-10 4-3Z','#8baa78')+l('M-8-14 0-2',C.darkGreen,1),x,y,1,a)).join('');
 const colors=[C.green,'#8baa78','#7c9a80','#a4ad79','#9b719a'];
 let body=l('M40 70V15',C.darkGreen,2);
 for(let i=0;i<4;i++){const y=25+i*11;for(const side of [-1,1]){body+=level===3?l(`M40 ${y}l${side*16}-14`,colors[2],3):level===4?e(40+side*9,y-3,7,4,colors[3]):g(p(level===5?'M0 0-12-2-9-7-16-9-12-14-6-14-2-20 3-10Z':'M0 0Q-23-1-18-16 1-20 0 0Z',colors[level-1]),40,y,.8,side===-1?0:100)}}
 return body;
}
function flower(level){
 const petal=(count,rx,ry,color)=>Array.from({length:count},(_,i)=>g(e(0,-ry+2,rx,ry,color),40,31,1,i*360/count)).join('');
 const stem=l('M40 70V38',C.darkGreen,3)+leaf(40,64,.75,0)+leaf(40,55,.7,105);
 const heads=[()=>petal(10,4,14,C.white)+e(40,31,8,8,C.gold),()=>petal(12,5,17,C.gold)+e(40,31,13,13,C.wood)+dots([[35,25],[43,25],[32,33],[40,34],[47,33],[38,40]],C.dark,1.3),()=>p('M20 18 30 25 40 9 50 25 60 18L56 38Q40 55 24 38Z',C.pink),()=>petal(12,7,14,C.pink)+petal(8,5,10,'#e4b9b9')+e(40,31,6,6,C.red),()=>petal(6,7,20,C.cream)+l('M40 31 28 20m12 11 12-11M40 31v-17',C.wood,2)+e(40,31,4,4,C.gold),()=>petal(7,10,14,C.red)+p('M29 30Q28 19 41 22Q54 25 47 37Q35 44 31 34Q30 27 40 29Q46 31 39 36',C.pink),()=>[[24,27],[37,18],[52,26],[27,41],[44,39],[56,40]].map(([x,y])=>g(petal(4,5,8,C.blue)+e(40,31,2,2,C.cream),x-24,y-19,.6)).join(''),()=>p('M40 34Q7 37 17 15Q36 6 40 34Q46 5 64 17Q72 37 40 34Q65 40 55 53L42 39 29 53Q16 41 40 34Z',C.white)+p('M34 32h12l4 10-10 9-10-9Z',C.purple),()=>petal(14,5,20,C.pink)+p('M24 41Q24 18 40 13Q57 19 57 41Z',C.cream)+Array.from({length:5},(_,i)=>l(`M${28+i*6} 39q-3-12 0-19`,C.pink,2)).join('')];
 return stem+heads[level-1]();
}
function baked(level){
 if(level===1)return e(40,43,27,24,C.gold)+Array.from({length:12},(_,i)=>g(l('M0-17v-5',C.wood),40,43,1,i*30)).join('')+e(40,43,16,14,'#f0cc88')+l('M29 37h22m-23 9h22',C.wood);
 if(level===2)return e(40,43,29,24,C.wood)+e(40,41,28,22,C.gold)+e(40,41,10,8,C.cream)+dots([[23,30],[32,25],[49,26],[59,33],[20,42],[25,52],[35,58],[48,56],[60,47]],C.white,1.3);
 if(level===3)return p('M19 63V34Q6 18 28 13Q40 6 52 14Q75 16 62 35V63Z',C.wood)+p('M24 59V31Q15 21 31 19Q41 14 51 20Q65 20 57 32V59Z',C.cream);
 if(level===4)return p('M10 53Q18 18 40 24Q62 18 71 53L58 60 48 51H31L20 61Z',C.gold)+p('m31 26 8-4 12 3 2 27-25 1Z',C.orange)+l('M22 31 29 52m25-21-3 21M15 44l10 10m39-11-10 11',C.wood,2);
 if(level===5)return p('M40 42C9 7 4 49 30 62Q40 67 40 56Q40 68 52 61C80 47 69 9 40 42Z',C.gold)+p('M37 45C16 18 13 47 31 54M43 45C62 18 67 45 50 55','none',C.wood,3);
 if(level===6)return g(r(9,27,62,25,12,C.gold)+p('M13 30Q20 20 31 29Q40 21 48 28Q61 22 68 33L65 41H15Z','#9e6956')+l('M19 45h39',C.cream,3),-4,7,1,-8);
 if(level===7)return e(40,47,26,21,C.gold)+p('M57 48Q57 24 35 28Q12 33 24 52Q42 67 51 49Q53 35 39 36Q28 39 34 48Q42 54 43 45','none',C.wood,4)+l('M21 34q20-15 37 7',C.cream,2);
 if(level===8)return p('M20 39h40l-6 28H27Z',C.wood)+p('M17 40Q11 25 25 24Q27 12 40 18Q55 11 59 25Q72 29 63 42Z',C.gold)+dots([[24,32],[37,24],[50,30],[55,39],[39,36]],'#737999',3)+l('M30 46v14m10-14v17m10-17v13',C.cream);
 if(level===9)return p('m14 34 26-18 26 20-7 28-35 1Z',C.gold)+p('m24 37 16-11 15 12-5 16H29Z',C.cream)+e(36,42,7,7,C.red)+e(48,44,7,7,C.red)+l('M36 36q2-11 12-12M47 38V25',C.darkGreen);
 if(level===10)return p('M16 35Q25 26 57 25L66 38V61L22 66 16 57Z','#976950')+e(60,44,12,19,C.wood)+p('M64 34q-15-11-14 11Q53 60 62 52Q70 43 58 39Q52 40 58 48','none',C.cream,2)+l('m20 38 24-4m-23 13 25-6m-20 17 20-6','#d8a172',2)+p('m26 29 5-14 11 3-4 10Z',C.wood);
 return e(40,60,28,9,C.wood)+r(14,32,52,28,8,C.cream)+Array.from({length:8},(_,i)=>r(15+i*6,31,5,32,3,C.gold)).join('')+e(40,32,26,8,C.white)+[[25,30],[38,23],[53,29]].map(([x,y])=>g(strawberry(),x-12,y-11,.32)).join('')+l('M13 49h54',C.pink,5);
}
function drink(level){
 const glass=(color,shape='tall')=>shape==='stem'?p('M17 17H63Q61 42 44 47V65H55V70H25V65H36V47Q20 42 17 17Z',C.white)+p('M21 25H59Q55 43 40 43Q25 43 21 25Z',color):shape==='jar'?r(19,24,42,43,9,C.white)+r(23,31,34,31,6,color,'none')+r(22,18,36,7,2,C.silver):p('M18 18H62L57 67H23Z',C.white)+p('M22 31H58L54 63H26Z',color,'none');
 if(level===1)return r(24,19,32,51,7,C.white)+r(29,10,22,12,3,C.silver)+r(24,32,32,21,0,C.blue,'none')+e(40,42,6,7,C.white,'none');
 if(level===4)return e(40,64,29,6,C.white)+p('M18 30H57V50Q55 64 37 63Q19 61 18 50Z',C.cream)+e(38,30,20,7,'#986b50')+l('M58 36q21-3 11 16l-12 1',C.wood,4)+l('M27 29q11-6 21 0',C.gold,2);
 if(level===8)return p('M18 29Q29 16 53 23L65 42 57 65 28 69 14 49Z',C.green)+e(40,27,22,8,C.white)+e(40,27,12,5,'#80644d')+l('m42 27 7-15 9-3',C.wood,4);
 const colors={2:'#f1dfa6',3:C.orange,5:'#b0bb84',6:'#ceaa7a',7:C.pink,9:'#f0c16c',10:'#a191b1',11:'#a9bfd6'};
 let body=glass(colors[level],level===7||level===11?'stem':level===9?'jar':'tall');
 if(level===2)body+=g(e(0,0,10,10,C.gold)+e(0,0,7,7,C.cream)+l('M-7 0H7M0-7V7',C.gold),58,24)+dots([[31,48],[47,39],[41,57]],C.white,2);
 if(level===3)body+=g(fruit[1](),9,40,.35);
 if(level===5)body+=e(40,29,17,5,C.white)+l('M29 28q12-8 21 0M34 28q7-4 12 0',C.green,2);
 if(level===6)body+=dots([[30,55],[39,58],[49,54],[33,46],[45,46]],C.dark,3)+l('m45 37 6-28',C.wood,5);
 if(level===7||level===10)body+=p('M22 28Q21 20 29 19Q29 9 40 14Q51 6 52 19Q64 18 60 29Z',C.white)+e(41,13,4,4,level===7?C.red:C.purple);
 if(level===9)body+=p('M22 26Q26 5 40 11Q58 5 60 26Z',C.gold)+l('m44 20 8-13',C.green,3);
 if(level===11)body+=p('M24 32H56Q53 39 43 42H36Q27 39 24 32Z',C.purple,'none')+p('M28 17Q17 1 33 6L40 15Q48 0 54 8Q58 20 43 20Z',C.blue)+e(39,17,3,3,C.gold);
 return body+l('M27 35v9',C.white,2.5);
}
const noodles=(dark=false)=>bowl()+l('M19 39q8-15 16 0t16 0t13 2M19 43q10-12 20-1t21-2M24 46q9-9 18 0t12-2',dark?C.dark:C.gold,3);
const dumpling=()=>p('M13 53Q15 15 43 24Q60 27 68 54Q40 71 13 53Z',C.cream)+l('M20 48q18 13 40 0M24 36l4 12m6-19 2 20m9-20-3 21m13-14-6 13',C.wood);
function chinese(level){
 const variants=[()=>e(40,45,29,22,C.gold)+l('M19 45q6-23 31-14t8 28q-26 14-33-5t26-13',C.wood,2)+dots([[28,32],[51,44],[35,55],[22,47],[52,31]],C.darkGreen,2),dumpling,()=>p('M19 56Q10 40 25 31L33 20H47L55 31Q72 42 61 57Q42 73 19 56Z',C.cream)+e(40,25,9,5,C.wood)+l('M31 27q-12 13-9 24m15-23-6 25m14-25 5 25m0-27q13 13 11 24'),()=>noodles()+p('m25 34 13-7 14 9-16 7Z','#a6785a')+leaf(58,41,.5,110),()=>p('M20 30 27 37 31 26 39 34 48 25 53 36 63 29 59 62Q42 73 24 61Z',C.cream)+e(41,34,18,7,C.gold)+dots([[30,35],[43,31],[53,36]],C.wood,2),()=>p('M11 39 40 13 68 35 59 63 29 69Z',C.darkGreen)+l('m15 40 42 20M39 18l-9 45m-8-31 36 26m-29-31 34 22',C.green,2),()=>plate()+r(20,28,43,32,7,'#a65f45')+r(20,30,43,10,3,'#d99160')+r(20,42,43,6,0,C.cream)+l('M29 30q8 8 21 0',C.gold,2)+leaf(56,62,.6,110),()=>plate()+p('M14 45 6 28 23 36Q46 20 65 43L70 34 73 55 63 50Q39 68 19 52Z',C.orange)+Array.from({length:5},(_,i)=>l(`m${25+i*7} 36-6 16`,C.red,2)).join('')+e(17,43,2,2,C.dark)];return variants[level-1]();
}
function japanese(level){
 const variants=[()=>p('M14 60Q10 53 18 39L32 17Q40 8 48 18L66 49Q73 65 58 68H24Z',C.cream)+r(30,46,21,22,2,C.darkGreen)+e(40,34,7,7,C.red),()=>plate()+p('M16 36 53 25 66 37 62 59 25 66 14 52Z',C.gold)+p('m25 43 39-9-2 24-37 9Z',C.cream)+l('M29 48q23-11 28-6M29 56q20-10 28-7',C.gold,3),()=>e(40,53,28,14,C.white)+p('M13 39Q39 22 67 37L62 51Q41 62 15 51Z','#e99b85')+l('m24 36 9 17m2-20 9 19m3-19 9 16',C.cream,2),()=>p('M16 27 66 40 30 70Z',C.darkGreen)+e(40,31,25,9,C.cream)+p('m22 25 16-8 9 14-8 5Z',C.red)+p('m43 24 14-8 8 15-14 5Z',C.green)+l('M28 41 33 60',C.green),()=>p('M15 59Q11 50 24 41L53 25 61 32Q48 50 26 64Z',C.gold)+p('m52 27 4-15 10 8 7 12-14 1Z',C.orange)+dots([[24,49],[34,43],[43,38],[30,55],[47,34]],C.cream,2),()=>noodles()+e(24,39,9,6,C.white)+e(24,39,4,3,C.gold)+e(48,40,10,6,C.pink)+l('M41 40q6-6 13 1',C.red)+p('m56 37 5-18 9 2-7 19Z',C.darkGreen),()=>bowl(C.dark)+p('M18 31 58 26 64 42 24 48Z','#a77147')+Array.from({length:6},(_,i)=>l(`m${22+i*6} 31 3 13`,C.gold,2)).join(''),()=>plate()+p('M18 52Q18 27 40 23Q61 28 62 52Q40 71 18 52Z',C.pink)+p('M13 51Q29 36 63 48L48 62 28 61Z',C.green)+l('m19 52 37-1m-25 0 7 9m7-9 5 6',C.darkGreen)+g(flower(3),23,6,.4)];return variants[level-1]();
}
function italian(level){
 const variants=[()=>[[-10,-3],[4,1],[16,6]].map(([x,y])=>g(r(28,12,9,56,4,C.gold)+l('M31 21v29',C.cream,2),x,y,1,-17)).join(''),()=>plate()+p('M15 53Q19 33 38 34Q58 31 65 54Z',C.gold)+l('M23 52q-3-17 13-12t13 11M31 52q-4-10 10-9t14 10',C.wood)+e(40,44,15,6,C.red,'none')+leaf(46,43,.5,90),()=>e(40,45,31,23,C.gold)+e(40,43,27,19,C.red)+[[26,38],[43,31],[54,44],[33,51]].map(([x,y])=>e(x,y,7,5,C.cream,'none')+leaf(x+4,y,.35,80)).join(''),()=>plate()+p('M17 56Q19 35 40 34Q61 35 64 56Z',C.gold)+dots([[26,45],[32,54],[44,42],[54,49],[45,55],[34,43]],C.cream,2)+p('m26 37 12-7 10 8-13 7Z',C.orange)+leaf(54,42,.45,80),()=>plate()+p('m14 37 42-13 12 12-2 29-42 6-10-9Z',C.gold)+p('m24 45 42-11v8l-42 13Z',C.red)+p('m24 56 42-11v8l-42 13Z',C.red)+l('M19 36q11-6 19-3t20-5',C.cream,3),()=>plate()+p('m19 39 26-12 19 16-25 19Z',C.gold)+p('m27 40 17-7 12 10-16 11Z',C.cream)+l('m21 39 4 2m1-5 4 2m1-4 4 2m5 22 2-5m6 2 1-5m5 0 1-4',C.wood)+leaf(44,44,.6,80),()=>noodles(true)+p('M27 32q17-12 25 0l-9 7Z',C.orange)+leaf(54,44,.6,90),()=>plate()+p('m18 32 32-10 16 12v28L31 68 18 57Z',C.wood)+p('m31 43 35-9v9l-35 10Z',C.cream)+p('m31 57 35-9v9l-35 10Z',C.cream)+p('m18 32 32-10 16 12-35 9Z','#8e644f')+dots([[29,32],[40,29],[50,31],[56,34]],'#6b5048',1)];return variants[level-1]();
}
function mexican(level){
 const variants=[()=>g(vegetable[5](),0,0,.01)+g(grain(3),0,0,1,0)+l('m29 30 23 4m-22 10 22 4m-20 8 17 3',C.white,3),()=>p('M10 57Q12 20 39 22Q66 21 71 58Z',C.gold)+p('M18 52Q28 29 40 31Q56 34 64 53Z',C.green)+p('M15 59Q21 35 40 37Q60 38 67 60Z',C.gold)+dots([[31,34],[42,31],[53,38]],C.red,3),()=>plate()+p('M13 51 43 22 69 55Q42 70 13 51Z',C.gold)+l('m20 50 26-24m-7 35 21-22',C.wood)+dots([[33,45],[49,44],[49,55]],C.wood,1.5),()=>g(p('M19 21Q43 11 61 24L61 56Q42 72 20 58Z',C.cream)+p('M19 49 61 37v18Q43 70 20 58Z',C.gold)+e(40,22,21,8,C.cream)+e(40,22,16,5,C.red)+dots([[29,21],[39,24],[49,21]],C.green,2),-5,10,1,-12),()=>p('M16 21 39 27 65 18 57 62 33 72 22 60Z','#b7b889')+p('M22 28 49 29 52 57 34 64 27 55Z',C.gold)+l('M19 26 29 59m23-35-14 42m21-34-14 34','#879669',1.5),()=>plate()+p('M17 45Q27 23 53 32Q62 35 62 49Q55 68 20 59Z',C.darkGreen)+p('M25 40Q43 31 56 40L52 53Q34 60 25 48Z',C.gold)+l('M58 36q10-13 15-4',C.green,3)+dots([[34,43],[46,41],[43,49]],C.red,2),()=>plate()+g(r(17,31,48,25,11,C.cream)+p('M18 32Q41 22 64 34V42H18Z',C.red)+l('m26 33 1 9m12-12 1 14m11-13 2 11',C.white,3),0,1,1,-8),()=>e(40,46,29,23,C.gold)+l('m22 33 35 25M24 59l30-29',C.cream,6)+e(40,30,8,7,C.cream)+dots([[20,45],[59,47],[40,62]],C.wood,1.2)];return variants[level-1]();
}
function tools(level){
 const handle=(body)=>g(r(35,39,9,33,4,C.wood)+body,3,-4,1,12);
 const variants=[()=>handle(e(39,25,12,19,C.wood)+e(39,23,7,12,C.gold,'none')),()=>handle(e(39,24,13,20,C.silver)+e(39,24,7,20,'none')+l('M39 4v40')),()=>p('M24 15 40 64 55 15M28 16 40 54 51 16','none',C.silver,6)+e(24,15,6,11,C.wood)+e(55,15,6,11,C.wood),()=>handle(r(25,8,27,34,7,C.pink)+l('M39 16v21',C.cream,2)),()=>handle(e(39,24,16,19,C.silver)+dots([[32,15],[44,15],[28,26],[39,26],[48,26],[33,35],[44,35]],C.ink,2)),()=>g(r(9,35,62,10,4,C.wood)+r(20,27,40,26,8,C.gold)+l('M25 31h29',C.cream,3),8,-5,1,30),()=>p('M27 14H55L64 65H18Z',C.silver)+p('M30 15V9H50V15','none',C.ink,4)+[26,36,46,56].map(y=>dots([[31,y],[44,y],[54,y]],C.ink,2)).join(''),()=>p('M14 39H66Q66 67 40 70Q13 66 14 39Z',C.wood)+e(40,39,26,8,C.cream)+g(r(35,9,10,40,4,C.wood),20,-7,1,25),()=>e(34,49,25,20,C.dark)+e(34,47,20,15,C.silver)+p('m53 34 13-24 7 4-13 27Z',C.wood),()=>p('M19 30H61V58Q40 76 19 58Z',C.silver)+e(40,30,21,7,C.white)+l('M19 38H8V48H19M61 38H72V48H61',C.wood,4),()=>p('M15 35H65V57Q39 75 15 57Z',C.red)+p('M12 34Q40 6 68 34Z',C.red)+r(34,17,12,7,3,C.wood)+l('M15 42H5m60 0h10',C.ink,5),()=>r(18,28,44,38,10,C.silver)+e(40,28,24,7,C.white)+r(22,21,36,6,3,C.dark)+r(37,14,6,7,2,C.wood)+l('M18 36H5m57 0h13',C.dark,5),()=>r(23,28,33,29,7,C.silver)+e(58,43,12,14,C.silver)+dots([[55,35],[62,41],[54,46],[60,51]],C.dark,2)+p('M30 29 22 12H51L44 29Z',C.silver)+l('M26 45H13V30H6',C.wood,4)+r(31,57,11,14,2,C.dark),()=>r(15,29,45,33,5,C.silver)+r(20,23,34,7,3,C.dark)+r(24,35,29,14,3,C.cream)+l('M27 38v26m7-26v26m7-26v26m7-26v26',C.gold,3)+l('M60 40h10V23h6',C.wood,4)+r(14,62,48,7,2,C.dark)];return variants[level-1]();
}
const star=(x=40,y=38,s=1,fill=C.gold)=>g(p('M0-18 6-6 19-4 9 6 12 20 0 13-12 20-9 6-19-4-6-6Z',fill),x,y,s);
const chefHat=(color=C.red)=>p('M24 28V19Q10 13 18 5Q26-2 34 5Q41-5 50 3Q63-1 66 10Q66 19 58 20V29Z',color)+l('M26 23h30',C.cream,2);
const puppyCap=()=>p('M18 24Q18 2 41 2Q64 2 64 24Z',C.red)+e(41,2,4,2,C.red)+p('M18 23Q40 15 66 24L73 30Q43 22 23 29Z',C.red)+l('M21 25q21-8 47 2',C.gold,2)+l('m32 19 1-10q4-7 8 6q4-13 8-6l2 10',C.gold,3);
function puppyHead(sleeping=false){return e(39,33,19,18,C.white)+p('M22 21Q10 17 11 29Q3 36 13 41Q17 49 25 40M56 21Q68 17 67 29Q75 36 65 41Q61 49 53 40Z',C.white)+(sleeping?l('M28 33q5 4 9 0m6 0q5 4 9 0',C.dark,1.8):e(33,32,2,2,C.dark)+e(47,32,2,2,C.dark))+e(40,39,3,2.5,C.dark)+l('M40 41v3m0 0q-5 5-8 0m8 0q5 5 8 0',C.dark,1.4)+g(puppyCap(),4,6,.8);}
function puppy(pose=1){
 const seated=p('M25 63Q19 39 39 36Q62 39 59 65Z',C.white)+e(30,66,10,5,C.white)+e(54,66,10,5,C.white);
 if(pose===1)return p('M18 63Q12 45 40 44Q66 43 69 62Q62 72 18 68Z',C.white)+e(59,65,13,5,C.white)+g(puppyHead(true),-3,30,.74,-12)+e(23,66,13,5,C.white);
 if(pose===3)return seated+puppyHead()+r(8,52,64,10,5,C.wood)+r(1,55,10,5,2,C.wood)+r(69,55,10,5,2,C.wood)+e(22,54,7,8,C.white)+e(58,54,7,8,C.white);
 if(pose===4)return seated+puppyHead()+p('M14 49H66V62Q40 80 14 62Z','#496a86')+e(40,49,26,7,'#69869b')+l('M14 54H5v8h9m52-8h9v8h-9',C.silver,3)+e(19,50,7,6,C.white)+e(61,50,7,6,C.white);
 if(pose===5)return g(seated+puppyHead(),-5,4,.93,-8)+g(p('M17 28H49V58Q31 67 17 58Z',C.green)+e(33,28,16,6,C.darkGreen)+p('m49 38 23-20 5 6-25 29Z',C.green)+l('M18 34Q-3 24 3 49L17 53',C.green,5),25,24,.66)+e(42,51,7,6,C.white);
 if(pose===6)return p('M23 61 28 40H43L48 59 59 68 54 74 38 65 29 75 16 73Z',C.white)+g(puppyHead(),-5,6,.78)+l('M42 43 56 36',C.white,8)+e(62,38,9,5,C.white)+p('M42 29Q43 9 59 9Q75 9 76 29Z',C.silver)+r(39,29,40,5,2,C.silver)+e(59,8,4,3,C.gold);
 if(pose===7)return p('M27 64 29 39H51L54 64 61 71H43L40 62 36 71H19Z',C.white)+l('M29 47 13 53 7 45m43 1 17-10',C.white,9)+puppyHead()+g(r(62,22,6,27,3,C.gold)+e(65,12,10,14,C.gold),2,-1,1,5)+e(65,40,5,6,C.white);
 return seated+puppyHead();
}
function tableware(level){const variants=[()=>e(40,45,29,17,C.white)+e(40,44,22,11,C.cream)+l('M20 44q19 12 41 0',C.blue,2),()=>bowl(C.blue),()=>p('M23 31H57V58Q40 70 23 58Z',C.white)+e(40,31,17,6,C.cream)+l('M23 39H11V49H23M57 39H69V49H57',C.blue,4),()=>p('M21 12H59Q62 41 44 45V65H56V70H24V65H36V45Q18 41 21 12Z','#dbe8e4')+l('M29 19v13',C.white,3),()=>e(40,49,23,20,C.cream)+l('M22 38Q-2 27 10 55L19 56',C.wood,4)+p('m60 40 14-12-5 25-12 6Z',C.cream)+p('M21 33Q41 16 60 33Z',C.pink)+e(40,22,4,4,C.gold)+p('m28 48 8-9 7 9-7 8Z',C.pink),()=>p('M11 36Q30 49 62 26L59 54Q45 73 18 59Z',C.blue)+l('M60 36q22-6 13 17l-15 1',C.cream,4)+e(37,40,23,7,C.white),()=>p('M14 37H66V57Q40 74 14 57Z',C.white)+p('M10 36Q40 11 70 36Z',C.blue)+e(40,22,5,4,C.gold)+l('M14 45H5m61 0h9',C.wood,4),()=>p('M15 53Q14 35 41 43Q47 43 49 35Q32 19 46 13Q60 10 61 21L54 26Q48 24 49 20Q44 21 54 31Q67 44 57 60Q29 76 15 53Z',C.white)+p('m54 22 13 3-13 3Z',C.gold)+e(53,19,1.5,1.5,C.dark)+p('M22 50q11-17 27-4l-9 13Z',C.cream)];return variants[level-1]();}
function preservation(level){return [()=>r(16,22,23,44,9,C.silver)+e(28,23,12,5,C.white)+p('M33 26 65 35 64 65 34 57Z','#dae7e2')+l('m42 37 15 5m-15 4 15 5',C.white,2),()=>p('M18 20H62L65 65H15Z','#dce7de')+r(16,17,48,7,2,C.blue)+l('M23 36v18m9-29h22',C.white,3),()=>r(13,29,54,37,7,'#d8e4dc')+r(10,22,60,13,5,C.blue)+r(20,31,10,8,2,C.wood)+r(50,31,10,8,2,C.wood),()=>r(9,22,62,25,8,C.cream)+r(15,38,50,7,3,C.dark)+p('M22 45H59V69H22Z','#dce7de')+e(60,28,3,3,C.green)+l('M28 52h24',C.white,2)][level-1]();}
function bakeware(level){return [()=>p('M19 33 25 63Q40 73 55 63L61 33Z',C.pink)+e(40,33,21,8,C.cream)+l('m26 40 3 21m5-20 2 24m9-24-1 24m10-24-3 22',C.wood),()=>Array.from({length:10},(_,i)=>g(e(0,-19,9,12,C.silver),40,43,1,i*36)).join('')+e(40,43,22,18,C.cream),()=>p('M12 33H68V52Q40 72 12 52Z',C.silver)+e(40,33,28,12,C.cream)+e(40,33,22,8,C.silver),()=>p('M10 30 63 22 72 55 18 65Z',C.silver)+p('m16 34 43-6 7 23-44 7Z',C.dark),()=>r(9,20,62,47,5,C.silver)+[24,51].map(y=>[22,40,58].map(x=>e(x,y+5,7,7,C.dark)+e(x,y+3,5,4,C.ink)).join('')).join(''),()=>p('M33 43H47L51 65H29Z',C.blue)+e(40,65,23,5,C.wood)+e(40,38,32,9,C.white)+l('M18 38h44',C.pink,2),()=>p('M16 67V24H25V16H32V24H48V16H55V24H64V67Z',C.pink)+p('M25 65V38H35V30H45V38H55V65Z',C.cream)+p('M34 67V53Q40 44 46 53V67Z',C.wood)+l('M20 32h7m26 0h7M20 47h7m26 0h7',C.wood)][level-1]();}
function seedbag(level){return [()=>p('m21 17 39 5-5 47-39-4Z',C.cream)+l('m22 23 33 4')+leaf(41,54,1,20),()=>p('m40 11 28 56-56 1Z',C.cream)+l('M40 14v50')+leaf(50,60,.7,10),()=>p('M23 17 33 24 48 22 57 16 52 31Q77 68 42 71Q7 70 25 34Z',C.cream)+l('M25 33h27',C.wood,4)+leaf(42,59,.8,40),()=>p('M21 19H60L63 64 53 71H23L16 62Z',C.cream)+p('m53 21 7-2 3 45-10 7Z',C.wood)+l('M23 27h29M24 64h26')+leaf(40,56,.85,20)][level-1]();}
function emptybag(level){return [()=>p('M16 28 31 23 60 29 65 61 48 67 20 58Z',C.cream)+l('M21 35q20 7 39 1M25 39l8 17m8-16 15 17'),()=>p('m15 19 23 5 13-7 18 7-8 39-24 6-22-10Z',C.cream)+l('m15 26-6-4m8 11-9-2m9 12-8-1m8 10-7 3M62 26l10-4'),()=>r(14,16,53,53,3,C.cream)+r(24,29,25,21,2,C.pink)+l('M18 21h45v43H19ZM28 34h17v12H28',C.wood,1),()=>g(r(14,28,51,30,12,C.cream)+e(63,43,11,15,C.wood)+e(63,43,7,10,C.cream)+e(63,43,3,5,C.wood)+l('M18 33h40',C.wood),-2,6,1,-12)][level-1]();}
function coins(level){if(level<=2)return Array.from({length:level===1?1:4},(_,i)=>g(e(40,49-i*6,23,12,C.gold)+e(40,47-i*6,18,8,'#f0d28b')+star(40,47-i*6,.25,C.gold))).join('');const body=level===3?p('M25 17 36 24 52 18 50 31Q75 70 42 72Q8 71 26 32Z',C.wood)+l('M25 33h26',C.dark,4):level===4?r(12,30,56,34,4,C.wood)+r(10,23,60,12,3,C.gold)+r(35,32,10,11,2,C.gold):level===5?p('M22 24Q12 37 18 62Q40 79 62 62Q69 37 57 24Z',C.cream)+e(40,24,19,7,C.gold):p('M11 35Q12 12 40 13Q68 12 69 35V65H11Z',C.wood)+r(11,34,58,8,1,C.gold)+r(23,17,7,47,2,C.gold)+r(51,17,7,47,2,C.gold);return body+star(40,48,.45,C.gold);}
function energy(level){return [()=>p('m43 8-25 33h19l-4 32 30-43H44Z',C.gold),()=>p('M40 10Q10 40 20 57Q39 78 59 58Q72 43 40 10Z','#ead88c')+p('m40 25-10 19h10l-3 16 14-23H40Z',C.gold),()=>e(40,42,27,27,C.blue)+e(32,30,7,4,C.white,'none')+p('m43 21-17 23h13l-3 19 21-29H44Z',C.gold),()=>r(23,17,34,53,7,C.gold)+r(31,10,18,9,2,C.dark)+r(27,25,26,37,3,C.cream)+p('m42 28-12 19h11l-2 12 12-20H41Z',C.orange),()=>p('m40 7 28 16 3 35-31 17-30-18 3-34Z',C.purple)+e(40,40,21,21,C.gold)+p('m43 20-18 25h14l-3 17 22-29H43Z',C.white)][level-1]();}
function hourglass(level){const colors=[C.wood,C.blue,C.red,C.purple,C.gold],color=colors[level-1];let frame=level===2?e(40,40,29,31,'none',color):level===3?p('M40 5 74 70H6Z','none',color,5):level===4?p('M20 31 5 14 8 58 23 63M60 31 75 14 72 58 57 63Z',color):level===5?star(40,38,1.8,color):l('M19 14v52m42-52v52',color,5);return frame+r(16,11,48,7,3,color)+r(16,64,48,7,3,color)+p('M24 18Q24 35 37 40Q24 48 24 64H56Q56 48 43 40Q56 35 56 18Z','#e5ece0')+p('M28 25H52L40 39ZM28 60 40 47 52 60Z',C.gold,'none')+l('M40 40v9',C.gold,2);}
function infinite(level){let shape=level===1?r(8,25,64,34,17,C.purple):level===2?e(40,42,29,27,C.purple):level===3?p('m40 8 30 33-30 32L9 41Z',C.purple):star(40,37,1.65,C.purple);return shape+p('M40 42C26 21 13 30 18 44C25 59 40 40 48 33C62 23 70 42 59 49C51 54 44 46 40 42Z','none',C.white,4);}
function utility(f,level){
 if(f==='charge')return [()=>r(15,28,50,36,5,C.blue)+l('M29 28V16H51V28',C.wood,4)+r(15,40,50,7,0,C.cream),()=>r(12,24,56,42,8,C.blue)+r(10,19,60,12,4,C.white)+r(20,35,40,22,4,C.cream)+l('M27 19v-8h26v8',C.wood,3),()=>r(18,18,44,46,7,C.blue)+r(24,25,32,30,4,C.cream)+l('M25 18V8H55V18',C.dark,3)+e(26,68,5,5,C.dark)+e(55,68,5,5,C.dark)][level-1]()+p('m39 34-8 11h8l-1 9 12-15H41Z',C.gold);
 if(f==='splitter')return g(e(24,57,9,10,C.red)+e(52,57,9,10,C.red)+p(level===1?'M29 49 53 28 59 31 38 53ZM46 48 29 27 24 31 37 53Z':'M29 49 51 9 58 12 39 53ZM46 48 24 10 18 14 37 53Z',C.silver)+e(38,44,4,4,C.gold)+(level===3?star(38,44,.42,C.wood):''),level===1?2:0,level===1?4:0,1,level===1?-22:0);
 if(f==='upgrade')return level===1?r(17,11,46,59,6,C.green)+p('m40 22-15 18h9v17h12V40h10Z',C.cream):p('m40 8 27 16v32L40 72 13 56V24Z',C.blue)+star(40,39,.95,C.silver)+l('m28 54 24-30',C.cream,6)+p('m48 24-2-10 9 6 7-3-1 10-9 5Z',C.cream);
 if(f==='blackbag')return level===1?r(13,27,54,34,8,C.dark)+l('M20 33h40m-34-5v32m28-32v32',C.wood,3)+r(30,24,20,7,3,C.wood):r(10,26,60,40,5,C.dark)+l('M29 26V15H51V26',C.wood,4)+r(11,41,58,6,0,C.silver)+r(23,38,8,12,2,C.gold)+r(50,38,8,12,2,C.gold);
 if(f==='pinkbag')return level===1?p('M24 16 36 22 55 16 50 31Q77 72 41 71Q6 71 25 32Z',C.pink)+l('M25 32h25',C.wood,4):r(12,27,56,39,7,C.pink)+l('M27 28V15H53V28',C.wood,4)+l('M17 36h45',C.cream,3)+r(21,42,38,17,4,C.cream);
 if(f==='chest')return level===1?r(14,26,52,43,5,C.pink)+r(11,21,58,12,3,C.cream)+r(35,21,10,48,0,C.gold)+p('M39 21Q15 18 22 8Q35 6 39 21Q46 4 58 11Q62 22 39 21Z',C.gold):level===2?p('M40 70Q-2 42 13 22Q26 10 40 28Q56 9 68 24Q82 42 40 70Z',C.pink)+l('M15 37q25 17 51 0',C.gold,4)+r(36,41,9,14,2,C.gold):p('M12 34Q11 8 40 9Q69 8 68 34V68H12Z',C.purple)+r(12,32,56,8,0,C.gold)+r(20,17,7,51,0,C.gold)+r(53,17,7,51,0,C.gold)+star(40,43,.5,C.gold);
 return null;
}
const wheel=(x,y,s=1)=>e(x,y,5*s,5*s,C.dark)+e(x,y,2*s,2*s,C.silver,'none');
const handle=(x,y,w)=>l(`M${x} ${y}v-9h${w}v9`,C.wood,3);
const drawers=(x,y,w,h,n,color=C.cream)=>Array.from({length:n},(_,i)=>r(x,y+i*h/n,w,h/n-2,3,color)+r(x+w/2-4,y+i*h/n+4,8,3,1,C.gold)).join('');
const cupboard=(top=14,height=54,color=C.wood)=>r(16,top,48,height,4,color)+l(`M22 ${top+height}v5m36-5v5`,C.ink,3);
function pantry(level){return [
 ()=>p('M12 29H68L61 65H20Z',C.wood)+e(40,29,28,7,C.cream)+l('M17 39h46M20 49h42M22 58h38m-34-25 4 29m7-29 1 30m9-30-1 30m11-30-4 29',C.gold),
 ()=>r(11,27,58,40,5,C.wood)+r(8,22,64,12,3,C.cream)+r(35,31,10,12,2,C.gold),
 ()=>r(10,22,60,44,3,C.wood)+r(15,28,49,33,3,C.cream)+r(32,36,16,5,2,C.gold),
 ()=>cupboard(19,47)+drawers(21,24,38,39,2),
 ()=>cupboard(31,37)+r(21,35,38,28,2,C.cream)+Array.from({length:5},(_,i)=>l(`M24 ${39+i*5}h31`,C.wood)).join(''),
 ()=>p('M16 68V30Q17 6 40 7Q63 6 64 30V68Z',C.wood)+p('M22 63V31Q22 14 40 14Q58 14 58 31V63Z',C.cream)+l('M40 17v46')+dots([[35,42],[46,42]],C.gold,2),
 ()=>p('m8 24 32-14 31 15-2 43-28 6-31-8Z',C.wood)+p('m14 29 21-10v47l-19-6Zm31-9 19 12-1 30-18 4Z',C.cream)+dots([[29,42],[50,43]],C.gold,2),
 ()=>p('M18 24H62V64Q40 76 18 64Z',C.wood)+e(40,24,22,9,C.cream)+e(40,42,22,8,C.cream)+e(40,61,22,8,C.cream)+l('M21 25v38m37-38v38',C.gold,3),
 ()=>cupboard(12,57)+r(21,19,38,42,2,C.blue)+l('M40 19v42M22 41h35M24 23l10 11M44 45l10 11',C.cream,2),
 ()=>cupboard(8,61)+r(22,15,36,44,3,C.cream)+Array.from({length:9},(_,i)=>l(`M24 ${19+i*4}h32`,C.wood)).join('')+r(31,59,18,4,2,C.gold),
 ()=>p('M14 68V31Q16 2 40 4Q65 3 66 31V68Z',C.wood)+p('M20 29Q23 11 40 11Q57 11 60 29Z',C.blue)+r(21,34,38,28,3,C.cream)+l('M40 34v28')+star(40,21,.35,C.gold)+dots([[34,49],[46,49]],C.gold,2)
][level-1]();}
function lost(level){return [
 ()=>e(24,41,15,15,'none',C.wood)+e(57,41,15,15,'none',C.wood)+l('M39 39q1-6 4 0M10 37l-4-12m65 12 4-12',C.wood,3),
 ()=>p('M22 13H57V29H46L58 66 41 72 29 41 21 65 10 59 24 25Z',C.pink)+l('M23 20h30M18 43l10 5m8-5 13-6m-9 17 13-6m-30 10-7-4',C.cream,4),
 ()=>g(p('M40 9 53 53H25Z',C.blue)+l('M40 9v54q0 14-10 7',C.wood,3)+l('M29 46h21',C.cream,3),14,-6,1,20),
 ()=>r(10,27,60,37,6,C.dark)+r(19,20,17,9,3,C.wood)+e(41,45,17,17,C.silver)+e(41,45,12,12,C.blue)+e(37,41,4,4,C.white)+r(57,31,8,6,1,C.gold),
 ()=>r(11,30,58,37,9,C.wood)+handle(28,30,23)+l('M19 37v28m40-28v28',C.cream,4)+r(25,43,29,16,3,C.cream),
 ()=>r(18,18,44,49,7,C.wood)+handle(30,18,20)+l('M28 21v43m23-43v43',C.cream,5)+wheel(25,70,.8)+wheel(56,70,.8)+r(34,37,13,12,2,C.gold)
][level-1]();}
function comfort(level){return [
 ()=>p('M13 37Q15 9 40 11Q68 12 69 37Q71 61 57 63Q43 60 50 44Q55 27 40 27Q25 27 30 44Q38 60 23 63Q9 60 13 37Z',C.blue),
 ()=>p('M13 58Q17 35 34 18Q39 11 45 19Q63 37 68 58Q39 76 13 58Z',C.pink)+l('M39 21q-5 27 1 43',C.cream,2),
 ()=>r(12,20,56,45,12,C.wood)+e(29,38,10,10,C.cream)+e(52,47,10,10,C.cream)+l('M21 24h35',C.gold,3),
 ()=>g(r(19,21,44,19,8,C.dark)+r(34,37,14,31,5,C.blue)+e(66,30,9,12,C.dark)+e(18,30,6,7,C.silver),8,-2,1,15),
 ()=>r(14,37,50,29,5,C.wood)+p('M14 38V11H64V38Z',C.cream)+e(39,50,16,6,C.gold)+star(39,31,.55,C.pink)+l('M64 49h10v10',C.wood,3),
 ()=>r(15,21,50,44,12,C.blue)+e(40,44,18,18,C.dark)+e(40,44,11,11,C.silver)+handle(27,21,26),
 ()=>r(9,27,62,30,10,C.dark)+e(26,42,14,12,C.blue)+e(54,42,14,12,C.blue)+p('m7 32 9-14h49l9 13','none',C.wood,5),
 ()=>r(12,43,56,24,5,C.blue)+p('m16 40 4-29h42l4 29Z',C.blue)+r(25,16,31,19,3,C.dark)+l('M23 54h12m-6-6v12',C.cream,3)+dots([[53,52],[60,57]],C.pink,2.5)
][level-1]();}
function doll(level){return [
 ()=>p('m13 22 25-8 26 12-9 38-34 5Z',C.pink)+p('m29 34 30-6 7 25-26 15Z',C.cream)+l('M18 29l19-7m-13 36 10 2m9-18 13-4m-8 24 11-6',C.wood),
 ()=>r(17,23,39,40,5,C.cream)+e(36,24,19,6,C.wood)+e(36,62,19,6,C.wood)+l('m61 15-17 55M56 24q15-14 17-6',C.silver,2.5)+l('M25 33h23m-23 6h23m-23 6h23m-23 6h23',C.pink,3),
 ()=>e(40,45,28,23,C.red)+p('m40 25-14-5 10-4 7-8 5 11 11 3-14 5Z',C.green)+[[23,29],[36,21],[54,28]].map(([x,y])=>l(`M${x} ${y+9}v-18`,C.silver)+e(x,y-10,3,3,C.blue)).join(''),
 ()=>vegetable[0]()+l('m28 37 6 3m-6 7 4 2m-4 6 3 2',C.cream,2),
 ()=>p('M20 43Q40 15 65 41Q57 67 22 53L8 66 12 42 7 23Z',C.blue)+e(57,40,3,3,C.dark)+l('M45 31q-7 14 0 25M23 40l3 4m5-8 3 4m-4 8 3 4',C.cream,2),
 ()=>p('M25 65Q15 39 25 26L24 13 36 22 51 21 63 11 59 32Q70 63 52 68Z',C.wood)+e(34,33,2,2,C.dark)+e(49,33,2,2,C.dark)+p('m38 40 7 0-3 4Z',C.pink)+l('M28 49h29m-26 9h23M29 26l4 3m19-5-4 5',C.cream,4),
 ()=>e(40,53,19,18,C.cream)+e(27,17,7,16,C.cream)+e(50,16,7,16,C.cream)+e(39,34,21,16,C.cream)+e(32,32,2,2,C.dark)+e(46,32,2,2,C.dark)+p('m36 39 7 0-3 4Z',C.pink)+l('M24 49h7m20 0h7M40 48v15',C.wood),
 ()=>puppy(2)+l('M25 54h8m14 0h8M39 49v11',C.wood,1)
][level-1]();}
function snail(level){
 if(level===1)return e(40,42,27,25,C.wood)+p('M53 40Q52 18 31 24Q10 32 27 54Q47 68 56 49Q62 35 43 34Q30 35 37 47Q43 53 47 43','none',C.gold,3);
 const body=p('M9 62Q14 52 44 57Q55 56 55 36Q66 28 70 42L66 63Q45 75 9 68Z',C.cream)+l('m59 38-2-13m9 12 5-12',C.wood,2)+dots([[57,23],[71,23]],C.dark,2);
 const shells={2:g(snail(1),-1,6,.68),3:p('M14 56 33 9 52 58Z',C.gold)+l('M26 28h13M20 41h24M16 52h32',C.wood,2),4:p('M12 58Q3 18 44 16Q56 49 35 60Z',C.green)+l('m16 55 22-30m-16 21-9-9m17 1 11 0',C.darkGreen,2),5:g(flower(6),2,12,.75),6:e(32,42,23,23,C.blue)+p('M39 22Q21 32 35 51Q20 49 17 37Q18 24 39 22Z',C.cream)+star(40,43,.45,C.gold)};
 return body+shells[level];
}
const doorway=(x=24,y=22,w=32,h=40,color=C.cream)=>r(x,y,w,h,3,color)+p(`M${x+6} ${y+h}V${y+14}Q${x+w/2} ${y+1} ${x+w-6} ${y+14}V${y+h}Z`,C.wood)+e(x+w-10,y+h/2+6,1.5,1.5,C.gold);
const page=(color=C.cream)=>p('M17 12H57L65 22V69H17Z',color)+p('M57 12v11h8Z',C.white);
const check=(x=40,y=42,s=1,color=C.red)=>g(l('m-13 0 9 10 18-23',color,5),x,y,s);
const paw=(x=40,y=43,s=1,color=C.wood)=>g(e(0,6,10,8,color,'none')+dots([[-12,-4],[-5,-12],[6,-12],[13,-3]],color,4),x,y,s);
const wrench=(x=40,y=42,s=1,color=C.cream)=>g(p('M-5 4-15 17-10 22 4 7Q19 7 18-8L10-2 3-8 8-17Q-8-15-5 4Z',color),x,y,s);
function story(level){return [
 ()=>p('M16 19 29 13 43 20 60 13 65 64 47 70 32 63 14 69Z',C.cream)+l('M29 16 32 63M44 21 47 67',C.wood)+l('M20 52q25-4 16-15t18-5',C.red,3)+star(55,31,.25,C.red),
 ()=>l('M27 40Q-5 27 14 11Q32-4 34 28',C.red,3)+p('m23 31 31-8 16 20-26 16-21-11Z',C.blue)+r(31,33,13,8,2,C.dark)+e(63,42,7,9,C.cream),
 ()=>e(40,43,28,28,C.gold)+e(40,43,22,22,C.cream)+p('m40 22-6 21 6 20 6-20Z',C.blue)+p('m40 22-6 21h6Z',C.darkGreen)+l('M40 11V6m-26 37h6m40 0h7M40 64v5',C.wood,2),
 ()=>p('M12 18 40 8 68 18V47Q61 63 40 73Q19 62 12 47Z',C.purple)+doorway(26,25,28,29,C.cream),
 ()=>p('M12 19 40 8 68 19V49Q57 65 40 73Q23 65 12 49Z',C.red)+p('M20 24 40 16 60 24V47Q53 59 40 65Q26 58 20 47Z',C.white)+g(puppy(2),16,20,.61)+l('M15 49h49',C.gold,2)
][level-1]();}
function keys(level){return [
 ()=>e(27,28,15,15,C.gold)+e(27,28,7,7,C.cream)+p('m36 39 27 25 7-6-7-6-4 4-5-5 4-4-9-9Z',C.gold),
 ()=>e(39,18,13,10,'none',C.silver)+[-13,0,13].map((x,i)=>g(e(40,31,7,8,C.wood)+p('M37 37h6v23h8v6H37Z',C.gold),x,i*4,1,i*9-9)).join(''),
 ()=>r(17,13,46,56,6,C.blue)+r(25,24,17,12,3,C.gold)+l('M47 25q14 8 0 16m-3-12q7 4 0 8',C.white,2),
 ()=>e(27,20,12,12,'none',C.silver)+r(22,29,37,39,10,C.wood)+e(41,47,13,13,C.blue)+l('M41 37v10l7 5',C.cream,3),
 ()=>e(40,43,28,24,C.blue)+e(40,43,17,14,C.cream)+r(28,17,24,26,7,C.blue)+e(40,30,7,7,C.dark)+l('M36 28q4-4 8 0',C.white,2)
][level-1]();}
function timegate(level){return [
 ()=>e(40,41,31,22,C.blue)+e(40,41,26,17,C.white)+doorway(28,26,24,27,C.blue),
 ()=>p('M19 50Q27 42 27 27Q40 6 53 27Q53 42 61 50Z',C.gold)+e(40,52,23,6,C.wood)+e(40,54,6,7,C.gold)+l('M40 61v12',C.red,4),
 ()=>r(10,33,60,32,5,C.wood)+e(38,34,24,10,C.dark)+e(38,34,6,3,C.gold)+l('M65 30 53 43H43',C.silver,4)+l('M70 45h7v12',C.wood,3),
 ()=>p('M19 69V25Q20 8 40 7Q60 8 61 25V69Z',C.wood)+e(40,29,17,17,C.cream)+l('M40 17v12l10 6',C.dark,2)+r(28,48,24,17,8,C.dark)+l('M40 46v10',C.gold,2)+e(40,60,7,7,C.gold),
 ()=>p('m17 26 23-13 25 13v37L41 73 17 63Z',C.cream)+p('m17 26 24 10 24-10M41 36v37','none',C.gold,3)+doorway(23,35,13,25,C.wood)+p('m46 40 12-4v24l-12 5Z',C.wood)+handle(33,17,15),
 ()=>r(17,48,49,21,4,C.wood)+e(41,48,22,7,C.dark)+p('M43 49Q28 37 40 24L49 24Q40 38 50 48Z',C.gold)+p('M42 25 14 14 12 5Q52 0 69 22L64 35Z',C.gold)+e(41,14,28,12,C.cream)+e(41,15,14,6,C.wood)
][level-1]();}
function tasting(level){return [
 ()=>g(r(35,38,10,32,5,C.blue)+e(40,27,16,20,C.white)+e(40,26,11,14,C.cream),12,-5,1,19),
 ()=>e(40,42,29,29,C.cream)+[C.gold,C.pink,C.green,C.blue,C.wood].map((c,i)=>g(p('M0 0 0-27A27 27 0 0 1 25.7-8.3Z',c),40,42,1,i*72)).join('')+p('m40 42-5-21 13 17Z',C.red)+e(40,42,5,5,C.cream),
 ()=>r(10,24,60,43,4,C.wood)+r(27,18,26,10,3,C.silver)+[C.red,C.gold,C.green].map((c,i)=>e(23+i*17,46,7,7,c)).join(''),
 ()=>p('M30 45Q35 36 29 25Q23 7 40 8Q57 7 51 25Q45 36 50 45Z',C.red)+r(18,45,44,17,4,C.wood)+r(16,60,48,8,3,C.red)+g(chefHat(),20,46,.45),
 ()=>p('M16 18H63V64H16Z',C.cream)+r(10,14,9,54,4,C.gold)+r(61,14,9,54,4,C.gold)+e(39,32,13,8,C.white)+check(40,49,.6),
 ()=>g(r(24,15,32,52,13,C.blue)+e(40,16,16,6,C.cream)+e(40,65,16,6,C.dark)+r(24,41,32,12,0,C.gold)+star(40,47,.3,C.red)+p('m31 15-5-8 23 0-1 9Z',C.cream),11,-5,1,15)
][level-1]();}
function courses(level){return [
 ()=>p('M10 18 29 12 49 21 69 14 66 65 47 72 29 63 10 70Z',C.green)+l('M29 14v49M49 23 47 69')+l('M16 29l7-2m-7 11 7-2m12-6 8 4m12-4 8-3',C.cream,3),
 ()=>[-15,0,15].map(a=>g(r(24,17,34,51,5,C.cream)+l('M31 36h19m-19 8h15',C.blue,3),40,17,1,a).replace('translate(40 17)','translate(0 0)')).join('')+e(30,24,7,9,'none',C.silver),
 ()=>r(16,11,49,60,4,C.blue)+l('M25 15v52m-8-45 13 2m-13 10 13 2m-13 10 13 2m-13 10 13 2',C.cream,2.5)+r(33,24,23,29,3,C.cream),
 ()=>p('M8 37Q23 29 40 38Q56 29 72 37V67Q56 59 40 70Q23 59 8 67Z',C.pink)+p('M13 39Q26 35 40 43Q57 35 67 39V61Q54 57 40 64Q27 56 13 61Z',C.cream)+g(tools(10),18,4,.57),
 ()=>e(36,36,27,27,C.silver)+e(36,36,7,7,C.dark)+[0,72,144,216,288].map(a=>g(e(0,-15,6,6,C.dark),36,36,1,a)).join('')+p('M48 56Q70 45 68 66H32V59H59Q59 52 48 56Z',C.dark)+l('M35 62h3m4 0h3m4 0h3m4 0h3',C.cream,2),
 ()=>r(9,18,62,45,3,C.gold)+r(14,23,52,35,2,C.cream)+l('M23 32h34M23 39h34M29 46h20',C.wood)+star(57,58,.55,C.red)+p('m51 62-4 14 11-6 7 5-2-14Z',C.red)
][level-1]();}
const photo=(x,y,w,h)=>{const scale=Math.min((w-12)/80,(h-15)/74);return r(x,y,w,h,2,C.white)+r(x+4,y+4,w-8,h-10,0,C.blue)+doorway(x+6,y+7,(w-12)*.45,h-17,C.cream)+g(puppy(2),x+(w-80*scale)/2+3,y+5,scale);};
function puzzle(level){return [
 ()=>p('M15 12 48 8 68 19 60 68 30 72 11 60Z',C.cream)+p('m22 35 18-15 20 16M28 32v27h25V32','none',C.red,3)+l('M18 64h43m-39-16h5'),
 ()=>e(36,34,24,24,C.orange)+e(36,34,13,13,C.cream)+p('M38 55H66V70H25V62H53V55Z',C.gold)+l('M29 64v5m9-5v5m10-5v5m10-5v5',C.wood),
 ()=>[C.blue,C.green,C.gold,C.pink,C.cream].map((c,i)=>`<g transform="rotate(${i*18-35} 24 62)">${r(17,11,17,56,3,c)}${e(25,59,3,3,C.wood)}</g>`).join(''),
 ()=>r(17,12,47,58,4,C.red)+doorway(27,25,25,34,C.white)+l('M23 17v48',C.pink,2),
 ()=>p('M15 12 41 18 65 12V65L40 73 15 65Z',C.darkGreen)+l('M40 20v47',C.green)+g(tools(1),11,16,.65)+l('M51 30v27m-6-27v10h12V30',C.cream,2.5),
 ()=>p('M20 9 27 13 34 9 41 13 48 9 56 13 61 9V73L54 69 48 73 41 69 34 73 27 69 20 73Z',C.white)+l('M28 23h24m-24 8h24m-24 8h15',C.wood,2)+e(42,55,13,11,'none',C.red)+check(42,55,.65),
 ()=>p('M23 23 15 10 38 17 59 8 56 32Z',C.darkGreen)+e(40,47,25,25,C.gold)+e(40,47,20,20,C.cream)+g(doorway(),14,27,.65),
 ()=>p('M24 14H55L53 31 66 65Q40 78 13 65L26 31Z',C.blue)+l('M28 14q12-20 23 0',C.blue,4)+r(26,43,27,19,4,C.white)+l('M25 33H8m46 0h18',C.blue,3),
 ()=>r(7,26,66,36,5,C.wood)+l('M16 26 22 11h36l7 15',C.dark,2)+e(40,48,10,8,C.cream)+dots([[27,38],[37,33],[48,34],[55,41]],C.cream,3),
 ()=>photo(7,20,66,48),
 ()=>page('#e4e2d6')+r(24,21,31,23,1,C.dark)+g(doorway(),21,20,.5)+l('M24 51h31m-31 6h13m4 0h14m-31 6h13m4 0h14',C.ink,1.5),
 ()=>r(15,10,50,62,5,'#a56878')+r(17,14,6,54,2,C.red)+e(44,37,15,19,C.cream)+g(puppy(2),27,23,.43)+r(51,56,17,8,2,C.gold),
 ()=>r(13,6,54,67,4,C.gold)+r(18,11,44,57,3,C.wood)+photo(21,14,38,51)
][level-1]();}
function scraps(level){return [
 ()=>p('M27 20Q41 12 56 21Q38 38 55 61Q42 74 26 61Q42 42 27 20Z',C.cream)+p('M26 21q17-13 31 0l-5 8q-12-9-22 0Z',C.red)+p('M26 60q15 10 29 0l-2 7q-13 10-25 0Z',C.red)+l('M42 20V11',C.wood,3)+dots([[41,39],[43,49]],C.wood,2),
 ()=>p('M14 34H66V53Q40 72 14 53Z','#775847')+e(40,34,26,11,'#99765a')+dots([[24,31],[35,36],[48,31],[56,37]],C.wood,1),
 ()=>p('M15 59Q7 18 57 16L66 11 63 33Q61 65 15 59Z',C.wood)+l('m15 63 42-41m-30 30-7-14m18 6 17 1m-12-11-3-16',C.gold,2),
 ()=>p('M39 25Q9 26 8 54Q27 64 36 39Q34 71 52 70L61 56Q44 58 45 36Q62 55 74 44Q72 23 48 25Z',C.gold)+l('M42 30V13',C.wood,5)+p('M41 31Q32 51 19 53M44 32Q56 37 67 43','none',C.cream,3),
 ()=>p('m13 32 40-14 16 18v26l-41 10-15-17Z','#95785b')+p('m28 43 41-7v26L28 72Z','#765c47')+l('m20 34 9 0m5-7 8 1m7 19 7-3m-14 15 6-2',C.green,3),
 ()=>p('M11 52Q10 33 26 35Q23 17 40 20Q59 13 59 34Q76 34 68 54Q56 70 29 65Z','#aa9479')+l('M20 47q17-15 33 7m-16-22 4 22m-8-15-9-3m21 4 13-3m-30 18 9-6',C.cream,2.5),
 ()=>p('M8 64Q14 47 29 40Q34 22 49 40Q65 44 73 64Q44 79 8 64Z','#81654b')+dots([[23,55],[35,47],[45,58],[56,49],[61,64],[29,65]],C.wood,2)+l('M33 58q7-12 15-2',C.pink,2),
 ()=>p('M8 62Q12 44 29 39Q38 29 52 40Q70 42 73 63Q45 78 8 62Z','#a17b50')+p('M12 53Q27 34 51 40Q64 39 70 55L53 53 43 58 28 52Z',C.green)+leaf(38,44,.85,25)+leaf(51,44,.6,120)+l('M20 64q8-10 17-3',C.pink,2)
][level-1]();}
function gardenGuest(level){return [
 ()=>e(40,44,25,25,C.pink)+l('M18 37q21-15 43 2M17 47q22-16 46 0M24 24q24 13 24 43M34 20q24 18 23 39',C.cream,2)+l('M17 55Q4 70 18 73H35',C.pink,3),
 ()=>l('M16 69 34 14',C.wood,4)+l('M34 14Q62 4 63 36',C.ink,1.3)+g(doll(5),39,20,.45,-10),
 ()=>p('m11 36 42-16 16 25-42 23Z',C.wood)+p('m17 37 34-12 11 18-34 18Z',C.cream)+Array.from({length:7},(_,i)=>l(`m${23+i*5} ${37-i*1.7} 7 16`,C.wood,1.5)).join(''),
 ()=>e(40,48,32,21,C.blue)+e(40,45,24,14,C.cream)+e(40,47,17,9,C.pink),
 ()=>p('M40 9 73 67H8Z',C.cream)+p('M40 29 57 66H23Z',C.dark)+l('M40 9 35 29M9 67h64',C.wood,3)+p('m39 29-18 36h12Z',C.pink),
 ()=>e(40,46,31,26,C.orange)+e(40,46,20,26,C.gold)+p('M27 70V49Q40 31 53 49V70Z',C.dark)+p('m34 21 3-12 8-2 1 15Z',C.wood)+leaf(44,22,.7,100)
][level-1]();}
function cats(level){
 const fur=[C.orange,C.white,'#d8c8a9','#998877','#b5bdba',C.cream,'#a68e70',C.orange][level-1];
 const slender=level===3,fluffy=[5,6,7].includes(level);
 let body=l(level===4?'M22 61Q-2 58 7 39Q16 30 18 40Q16 48 10 47':'M59 61Q77 62 72 39',fur,7)+p(slender?'M28 65Q26 36 40 36Q54 36 54 65Z':fluffy?'M20 66 22 52 15 47 24 42 27 34 55 34 57 43 66 49 59 53 64 66Z':'M22 65Q18 37 40 35Q63 37 60 65Z',fur)+e(29,66,10,5,fur)+e(54,66,10,5,fur)+p(fluffy?'M17 33 21 23 19 11 34 20 47 18 61 9 59 24 66 36 58 47 28 49Z':slender?'M21 31 17 8 35 21 46 21 64 8 59 33Q56 50 41 50Q25 48 21 31Z':'M21 31 21 13 34 23 47 23 60 13 59 34Q58 51 40 51Q21 49 21 31Z',fur);
 if(level===2)body+=p('M21 31V13L34 23 38 37 30 42Z',C.dark)+e(53,54,9,10,C.dark,'none');
 if(level===3)body+=p('M21 31 32 27 40 35 48 27 59 31Q56 49 41 49Q25 48 21 31Z',C.wood)+p('m17 8 17 15-11 4Zm47 0-17 15 11 4Z',C.wood);
 if(level===4||level===1)body+=l('m32 22 4 7m10-7-4 7M23 40l7 2m23-2-7 2M26 55l7 2m20-2-7 2',C.wood,2.5);
 if(level===5)body+=p('M21 31 32 28 40 34 49 28 60 31 57 40 49 36 40 40 31 36 23 40Z',C.silver,'none');
 if(level===6)body+=p('M21 31 27 21 39 35 51 19 60 31 51 42 40 45 29 42Z',C.wood)+p('m40 27-8 20 9 4 8-5Z',C.cream,'none');
 if(level===7)body+=p('m18 13 2-10 9 16M54 18l8-14 1 13m-38 29 16 13 14-13-4 17-11 7-14-7Z',C.wood);
 body+=e(32,34,2.2,2.5,[3,6].includes(level)?'#6398b8':C.dark)+e(49,34,2.2,2.5,[3,6].includes(level)?'#6398b8':C.dark)+p('m37 41 7 0-3 4Z',C.pink)+l('M41 45q-4 4-7 0m7 0q4 4 7 0',C.ink,1.1);
 if(level===8)body+=p('m26 50 13 5 15-5 7 19H20Z',C.blue)+r(31,58,17,10,3,C.cream)+l('M27 51 31 43m19 1 4 7',C.blue,3);
 return body;
}
function honor(level){
 if(level<=4){const color=[C.pink,C.wood,C.silver,C.gold][level-1];return p('M20 11H60L52 43 40 53 28 43Z',color)+p('m25 56-4 18 18-9 17 9-3-21Z',color)+e(40,45,23,23,C.gold)+e(40,45,18,18,C.cream)+(level===1?star(40,43,.65,C.pink):level===2?g(tools(1),22,24,.45):level===3?g(tools(10),22,26,.45):g(chefHat(),18,34,.55));}
 const cup=p('M20 20H60L56 43Q52 53 44 55V63H57V70H23V63H36V55Q26 51 23 43Z',C.gold)+l('M21 25H10Q5 46 27 45M59 25H70Q75 46 53 45',C.wood,4);
 return cup+(level===5?star(40,35,.75,C.cream):level===6?Array.from({length:4},(_,i)=>leaf(22-i*2,54-i*8,.5,40,C.green)+leaf(58+i*2,54-i*8,.5,130,C.green)).join(''):g(chefHat(C.gold),10,9,.75))+r(27,63,26,6,2,C.wood);
}
const feet=(x=20,y=66,w=40)=>l(`M${x} ${y}v6m${w}-6v6`,C.dark,4);
const ovenWindow=(x=20,y=34,w=40,h=25)=>r(x,y,w,h,4,C.dark)+r(x+4,y+4,w-8,h-8,2,'#a48c67')+l(`M${x+7} ${y+6}h${w-15}`,C.cream,2);
const slats=(x,y,w,count=4)=>Array.from({length:count},(_,i)=>l(`M${x} ${y+i*5}h${w}`,C.wood,1.2)).join('');
const sprouts=(x=40,y=34,s=1)=>leaf(x,y,s,20)+leaf(x,y,s,110)+l(`M${x} ${y+8*s}v-${15*s}`,C.darkGreen,2);
const container=(color=C.cream)=>p('M20 31H60L57 65Q40 74 23 65Z',color)+e(40,31,20,6,C.wood);
function genTools(level){return [
 ()=>p('M15 58Q9 42 22 32Q22 16 39 24Q59 16 64 36Q75 49 63 63Q39 75 15 58Z',C.wood)+l('M23 42q18-15 33-3',C.gold,3),
 ()=>p('M20 23H60V62Q40 74 20 62Z',C.wood)+e(40,23,20,8,C.gold)+e(40,23,13,5,C.wood)+slats(25,40,30,4),
 ()=>container(C.orange)+e(40,31,15,3,C.dark)+l('M27 42v15',C.gold,3),
 ()=>g(tools(1),2,2,.75,-12)+g(tools(2),20,-3,.72,12)+container(C.cream)+l('M26 43v13',C.gold,3),
 ()=>g(tools(3),12,-7,.7)+l('M23 35Q1 27 9 50H24M57 35Q79 27 71 50H56',C.wood,4)+p('M21 28H59Q68 60 56 67Q40 74 24 67Q13 60 21 28Z',C.orange)+e(40,28,19,6,C.cream),
 ()=>g(tools(1),1,-6,.68)+g(tools(4),27,-3,.68)+r(13,34,54,33,3,C.cream)+p('m13 34 9-8h43l2 8Z',C.wood)+l('M39 34v33',C.gold,3),
 ()=>r(9,13,62,12,3,C.wood)+[15,32,49].map((x,i)=>g(tools(i+1),x-8,-8,.6)).join('')+[15,32,49].map(x=>r(x,34,15,30,4,C.blue)+e(x+7.5,34,7.5,3,C.cream)).join(''),
 ()=>e(40,65,29,6,C.wood)+l('M40 63V14M17 27h46',C.wood,5)+[0,22,40].map((x,i)=>g(tools(i+1),x+2,18,.54)).join('')+e(40,15,6,5,C.gold),
 ()=>p('M17 40 49 30 64 43 60 70 20 66Z',C.wood)+[23,35,47].map((x,i)=>p(`M${x} 43V${12+i*5}h7v${31-i*5}Z`,C.silver)+r(x,5+i*5,7,14,2,C.dark)).join('')+r(28,53,24,9,2,C.cream)+r(35,55,10,3,1,C.gold),
 ()=>r(11,38,58,30,5,C.wood)+p('M12 39V12H68V39Z',C.cream)+g(tools(1),3,4,.6)+g(tools(2),31,3,.6)+r(36,48,10,9,2,C.gold),
 ()=>e(40,68,22,5,C.wood)+l('M40 66V7M11 20h58M19 43h43',C.wood,5)+g(tools(2),1,19,.56)+g(tools(5),37,17,.56)+g(tools(1),20,36,.42),
 ()=>e(40,68,29,6,C.wood)+l('M40 67V8',C.wood,5)+[24,44,63].map((y,i)=>e(40,y,27-i*3,6,C.cream)+r(18+i*3,y-12,9,12,2,[C.blue,C.pink,C.wood][i])+r(34,y-14,9,14,2,C.gold)+r(51-i*3,y-10,9,10,2,C.green)).join('')
][level-1]();}
function genFood(level){return [
 ()=>p('m10 36 42-16 20 15v22L30 72 10 57Z',C.red)+p('m30 49 42-14v22L30 72Z',C.wood)+l('m18 39 8 5m7-11 9 5',C.cream,3),
 ()=>r(13,16,54,53,5,C.dark)+ovenWindow(20,25,40,35)+r(24,19,32,5,2,C.silver)+dots([[18,21],[62,21],[18,64],[62,64]],C.silver,1.5),
 ()=>p('M10 24 22 13H64L70 25V67H10Z',C.silver)+r(16,26,47,35,3,C.dark)+l('M22 37h35m-35 13h35',C.silver,2)+p('m16 26 9 10v24','none',C.cream,2),
 ()=>r(10,17,60,52,5,C.cream)+r(16,28,48,34,3,C.dark)+l('M64 30h9m-9 25h9',C.silver,3)+dots([[22,22],[35,22],[48,22]],C.gold,2),
 ()=>p('M12 66V33Q12 12 40 12Q68 12 68 33V66Z',C.dark)+ovenWindow(22,35,36,25)+r(29,23,22,5,2,C.wood)+feet(20,66,39),
 ()=>e(40,45,30,25,C.dark)+p('M12 30Q40 3 68 30Z',C.dark)+r(33,12,14,7,3,C.wood)+ovenWindow(22,35,36,20)+feet(22,65,35),
 ()=>r(9,15,62,53,7,C.blue)+r(10,16,60,14,5,C.cream)+dots([[21,23],[32,23],[60,23]],C.gold,3)+ovenWindow(18,36,45,25)+r(23,32,34,4,2,C.wood)+feet(),
 ()=>p('M7 65V42Q8 8 40 7Q72 7 73 42V65Z',C.wood)+p('M18 65V42Q19 22 40 22Q61 22 62 42V65Z',C.dark)+l('M11 42h10m-7-15 11 7m5-21 5 12m17-11-5 11m18 2-10 7m14 9H61',C.cream,3)+r(6,65,68,7,2,C.wood),
 ()=>p('M22 19H58V64Q40 76 22 64Z',C.silver)+e(40,19,18,7,C.cream)+r(27,26,26,34,9,C.blue)+l('M40 28v29m-11-20h22m-22 12h22',C.cream,2)+r(34,8,12,9,3,C.wood),
 ()=>e(40,40,32,31,C.cream)+e(40,40,23,24,C.blue)+e(40,40,16,16,C.dark)+r(12,64,56,8,4,C.wood)+dots([[30,17],[40,14],[50,17]],C.gold,2)+r(29,46,22,4,2,C.silver),
 ()=>r(18,20,44,36,12,C.cream)+ovenWindow(24,29,32,20)+r(4,53,72,11,5,C.dark)+Array.from({length:9},(_,i)=>l(`M${9+i*8} 55v7`,C.silver,2)).join('')+feet(16,64,48)+r(26,17,28,6,3,C.red)
][level-1]();}
function genProduce(level){const woven=(body)=>body+slats(22,44,35,4)+l('M28 37v27m12-27v27m12-27v27',C.gold,1.3);return [
 ()=>e(40,43,29,20,'none',C.wood)+e(40,43,25,16,'none',C.gold)+l('M16 35l3 5m5-13 3 5m11-9v5m17-1-3 5m12 4-5 2',C.wood,2),
 ()=>e(40,48,30,20,C.wood)+e(40,46,24,14,C.gold)+slats(21,38,39,5)+l('M27 35v24m10-27v28m10-27v26m10-23v18',C.wood),
 ()=>l('M18 37Q17-5 61 15Q68 22 61 37',C.wood,5)+sprouts(45,39,.9)+woven(p('M12 36H68L60 66H20Z',C.wood)),
 ()=>l('M16 38Q-1 20 15 20H25m30 0h11q16 0-2 18',C.wood,4)+sprouts(40,35,.8)+woven(p('M13 34H67L61 66H19Z',C.gold)),
 ()=>l('M26 18Q3 11 13 60m42-42q21-7 13 42',C.wood,4)+woven(p('M22 16H61L58 66Q40 76 20 63Z',C.wood))+e(41,16,19,6,C.cream)+sprouts(42,22,.6),
 ()=>r(10,28,60,39,4,C.green)+r(9,24,62,8,3,C.cream)+l('M17 36 61 60M17 60 61 36',C.cream,3)+handle(26,26,28),
 ()=>woven(r(12,33,57,34,8,C.wood))+p('M12 34Q12 13 40 14Q69 14 69 34Z',C.gold)+handle(31,18,18)+l('M14 34h53',C.cream,3),
 ()=>r(13,27,54,40,9,C.pink)+handle(27,27,26)+r(13,36,54,6,1,C.cream)+r(22,46,36,15,4,C.cream)+sprouts(40,60,.35),
 ()=>p('M21 27H57L61 62H25Z',C.blue)+l('M22 27 19 12H43',C.dark,4)+wheel(25,68)+wheel(58,68)+r(29,37,22,15,3,C.cream),
 ()=>r(12,29,54,31,4,C.wood)+l('M66 55h8V16H62',C.dark,4)+r(8,59,64,6,2,C.silver)+[16,30,55,67].map(x=>wheel(x,69,.8)).join('')+slats(18,37,41,4),
 ()=>r(12,9,56,60,5,C.cream)+drawers(18,16,44,46,3,C.blue)+feet(),
 ()=>r(20,5,42,67,6,C.cream)+r(25,13,31,38,4,C.blue)+l('M30 19v23',C.white,3)+r(26,56,28,10,2,C.wood)+r(51,29,3,12,1,C.gold)
][level-1]();}
function genDrink(level){return [
 ()=>p('M18 17H58V28H39V51L26 60 15 51V37H27V28H18Z',C.silver)+r(44,12,16,9,3,C.wood)+e(22,52,7,4,C.dark),
 ()=>r(21,24,40,34,13,C.silver)+e(40,24,20,8,C.wood)+r(35,9,10,15,2,C.silver)+slats(27,36,27,4)+l('M60 45h12v18',C.red,3),
 ()=>p('M17 28H61L71 66H9Z',C.cream)+e(39,28,15,6,C.silver)+r(33,18,13,11,2,C.dark)+e(39,52,8,8,C.gold),
 ()=>e(40,66,29,6,C.wood)+l('M52 61V12H29',C.wood,7)+p('M19 35H50L43 46H26Z',C.silver)+p('M26 31 34 17 43 31Z',C.gold)+l('M33 16 64 8',C.wood,5)+r(29,48,16,14,3,C.cream),
 ()=>p('M23 13H58L54 44H27Z','#cee1d9')+r(22,8,36,8,3,C.blue)+l('M58 19h10v18H56',C.blue,3)+p('M25 46H55L60 68H20Z',C.blue)+e(40,57,5,5,C.gold)+p('m28 31 26 1-1 10H29Z',C.pink,'none'),
 ()=>r(12,17,56,34,6,C.pink)+r(48,44,17,23,3,C.pink)+r(10,64,60,7,3,C.wood)+l('M22 39v8h15v-8M61 34l9 17',C.silver,3)+e(26,27,6,6,C.gold)+r(23,49,22,13,3,C.cream),
 ()=>r(23,8,34,18,8,C.blue)+r(49,19,11,45,5,C.blue)+r(19,63,45,8,3,C.blue)+r(24,27,18,32,7,C.white)+r(28,22,10,7,3,C.silver)+p('M27 39h12v16H27Z','#c9e0e4')+dots([[31,45],[35,51]],C.white,2),
 ()=>r(9,47,62,21,5,C.cream)+[14,44].map((x,i)=>r(x,14,22,33,7,'#e2e9db')+r(x+3,23,16,20,3,i?C.blue:C.pink)+r(x,10,22,8,3,C.wood)+l(`M${x+8} 49v11h7`,C.dark,3)).join('')+r(12,66,56,6,2,C.silver),
 ()=>r(47,12,15,54,5,C.silver)+r(21,9,42,19,9,C.blue)+l('M31 27v16',C.silver,3)+p('M18 43H44L39 64H23Z',C.silver)+e(31,43,13,5,C.white)+r(16,65,50,7,3,C.blue),
 ()=>r(10,10,60,58,15,C.cream)+r(18,19,44,21,9,C.blue)+r(16,43,48,19,3,C.dark)+[27,52].map((x,i)=>e(x,30,7,7,i?C.red:C.blue)+l(`M${x} 37v10`,C.silver,4)+r(x-6,50,13,10,3,C.cream)).join('')+r(13,65,54,7,3,C.wood)
][level-1]();}
function genHerb(level){return [
 ()=>p('m15 36 26-21 12 17-8 33-25-8Z',C.orange)+p('m48 51 17-12 7 21-17 9Z',C.wood)+l('M21 40 37 28',C.cream,3),
 ()=>p('M17 24H63L56 65H24Z',C.orange)+e(40,24,23,7,C.cream)+l('m29 29 7 11-9 8 14 13m8-28-8 10 11 11',C.wood,2),
 ()=>r(17,25,46,42,5,C.wood)+e(40,25,23,7,C.cream)+[31,46,60].map(y=>dots([[25,y],[39,y],[54,y]],C.dark,2)).join(''),
 ()=>sprouts(40,33,1.2)+p('M18 37H62L56 67H24Z',C.orange)+r(16,32,48,10,3,C.wood),
 ()=>[20,40,60].map((x,i)=>sprouts(x,38,.75-i*.06)).join('')+p('M7 41H73L66 66H14Z',C.wood)+r(6,36,68,9,3,C.cream)+slats(17,49,46,3),
 ()=>l('M15 42 40 7 65 42M40 7V3',C.wood,2)+sprouts(40,40,1)+p('M12 42H68Q65 70 40 71Q15 70 12 42Z',C.wood)+slats(22,51,36,3),
 ()=>sprouts(40,34,1.1)+r(17,34,46,34,8,C.blue)+p('M22 34H58L52 56H28Z',C.cream)+l('M21 60h38',C.white,3)+r(58,22,5,36,2,C.blue),
 ()=>r(14,8,52,63,5,C.wood)+[25,45,64].map(y=>sprouts(40,y-8,.75)+p(`M21 ${y-6}H59L54 ${y+4}H26Z`,C.cream)).join(''),
 ()=>p('M13 65V36Q13 7 40 8Q67 7 67 36V65Z','#dce6d9')+sprouts(40,55,1.3)+r(9,63,62,8,3,C.wood)+l('M21 35Q22 17 36 15',C.white,3)+e(40,8,4,4,C.gold),
 ()=>e(40,68,25,6,C.wood)+r(29,9,22,58,10,C.cream)+[25,43,60].map(y=>p(`M20 ${y-7}H61L54 ${y+3}H26Z`,C.blue)+sprouts(27,y-6,.5)+sprouts(53,y-6,.5)).join('')+e(40,10,11,5,C.cream)
][level-1]();}
function genAsian(level){return [
 ()=>r(29,20,22,45,6,C.silver)+e(40,20,19,8,C.silver)+r(17,13,46,7,3,C.red)+r(23,49,34,12,3,C.wood),
 ()=>e(40,45,29,24,C.silver)+e(40,42,22,17,C.dark)+p('M25 42q0-22 21-12t-5 27q-18 1-13-13t17 0q0 8-10 5','none',C.red,4)+l('M17 60v9m46-9v9',C.silver,4),
 ()=>r(11,33,58,33,10,C.cream)+e(40,33,29,10,C.silver)+e(40,33,20,6,C.dark)+r(27,47,26,11,3,C.blue)+dots([[19,54],[60,54]],C.gold,2),
 ()=>r(14,54,52,14,5,C.cream)+p('M12 26H68V49Q40 69 12 49Z',C.wood)+e(40,26,28,11,C.gold)+l('M17 35h46m-46 10h46M23 24h34M25 17v18m15-20v22m15-20v17',C.wood,2)+r(34,10,13,7,2,C.wood),
 ()=>p('M18 31H62Q67 64 40 69Q13 64 18 31Z',C.pink)+p('M14 31Q40 9 66 31Z',C.cream)+r(34,16,12,6,3,C.wood)+l('M18 40H7m55 0h11',C.wood,4)+r(29,51,22,10,3,C.cream),
 ()=>r(17,7,46,62,4,C.silver)+r(23,16,34,41,4,C.blue)+slats(29,26,22,5)+r(51,27,4,17,2,C.cream)+r(23,61,34,5,2,C.dark)+feet(24,68,32),
 ()=>r(8,20,64,46,5,C.silver)+drawers(14,27,52,33,2,C.cream)+e(21,23,2,2,C.red)+e(58,23,2,2,C.blue)+feet(),
 ()=>p('M9 66V39Q9 8 40 7Q71 8 71 39V66Z',C.cream)+ovenWindow(18,35,44,25)+r(28,26,24,5,2,C.gold)+r(7,65,66,7,3,C.silver),
 ()=>e(40,42,32,26,C.silver)+e(40,38,31,22,C.cream)+e(40,38,13,10,C.dark)+p('M16 36q25-27 48 0','none',C.blue,6)+r(26,60,28,9,3,C.wood)+dots([[20,49],[60,49]],C.blue,3),
 ()=>p('M14 28Q12 8 39 8Q67 8 66 28V53Q65 72 40 72Q14 71 14 53Z',C.silver)+e(40,39,22,25,C.blue)+e(40,39,15,18,C.dark)+r(36,13,8,6,2,C.wood)+l('M20 39h40',C.cream,4)+r(17,64,46,7,3,C.wood)
][level-1]();}
function genMediterranean(level){return [
 ()=>p('M25 10H46L60 65H47L35 25 28 65H16Z',C.dark)+l('M31 16h10',C.silver,3),
 ()=>p('m9 31 49-15 14 30-48 18Z',C.dark)+Array.from({length:6},(_,i)=>l(`m${16+i*7} ${33-i*2} 10 23`,C.silver,2)).join(''),
 ()=>p('M13 20H67V67H13ZM19 27V60H61V27Z',C.silver)+l('M19 27 61 60m0-33L19 60',C.wood,3)+feet(17,66,46),
 ()=>r(9,24,62,29,4,C.dark)+e(21,45,3,3,C.gold)+e(60,45,3,3,C.gold)+r(13,19,54,13,3,C.silver)+slats(20,23,40,2)+feet(18,52,44),
 ()=>r(10,48,60,20,7,C.silver)+p('M13 42 19 15 68 23 64 49Z',C.dark)+p('m20 38 4-16 37 7-2 13Z',C.silver)+l('m23 15 3-8 31 5',C.wood,4)+e(61,58,3,3,C.red),
 ()=>r(13,11,15,56,5,C.silver)+p('m26 13 29 7 8 42H26Z',C.red)+l('M46 9v57',C.silver,3)+p('M37 22Q53 14 56 31L52 51Q43 60 32 49Z',C.wood)+slats(35,31,19,4)+r(8,65,63,7,3,C.cream),
 ()=>e(40,58,32,12,C.silver)+p('M9 53V36Q11 13 40 13Q69 13 71 36V53Z',C.cream)+ovenWindow(21,32,39,20)+e(40,54,23,6,C.gold)+l('M29 54h22',C.red,2),
 ()=>p('m12 44 13-27 43 18-11 29Z',C.silver)+p('m18 41 10-18 33 14-8 18Z',C.dark)+l('m26 29 31 12m-35-5 32 12',C.cream,2)+feet(20,56,41)+e(17,49,3,3,C.red),
 ()=>p('M13 25H58L68 34V57L58 65H13Z',C.silver)+e(16,45,12,21,C.dark)+e(62,45,12,20,C.cream)+r(18,26,39,38,3,C.wood)+slats(22,34,30,5)+l('M29 28v34m12-34v34m12-34v34',C.silver,1)+l('M72 44h5v13',C.wood,3)+feet(20,65,40),
 ()=>p('M9 48Q10 8 40 8Q70 8 71 48Z',C.orange)+r(10,46,60,22,8,C.wood)+ovenWindow(22,49,37,15)+r(31,12,18,7,3,C.wood)+l('M20 35Q25 18 41 19',C.gold,3)+feet()
][level-1]();}
function genSupply(level){return [
 ()=>e(40,43,27,29,C.dark)+e(40,43,17,19,C.silver)+e(40,43,10,11,C.cream)+l('M19 28 15 35m45-7 5 8M18 55l6 8m33-1 6-9',C.silver,2),
 ()=>l('M15 45h50',C.silver,9)+wheel(16,45,2.6)+wheel(65,45,2.6),
 ()=>p('M10 25 61 19 71 52 20 62Z','none',C.silver,5)+l('M15 29 66 49m-42 8 34-32',C.wood,3)+wheel(25,65,1.2)+wheel(65,58,1.2),
 ()=>p('M13 29H59L53 53H28Z',C.wood)+l('M14 29 7 18H3m54 34 15 10M27 53l-9 16',C.dark,4)+wheel(47,64,1.6),
 ()=>l('M24 58V10H52V58',C.silver,5)+l('M22 58H68V65H22',C.silver,6)+r(25,28,29,24,4,C.wood)+wheel(23,66,1.2)+wheel(56,66,1.2),
 ()=>r(9,51,63,11,4,C.silver)+l('M16 51V15H40',C.blue,4)+l('M22 49 39 26',C.silver,3)+[19,61].map(x=>wheel(x,68,1.1)).join(''),
 ()=>r(13,37,55,25,4,C.wood)+p('M10 38V24Q38 3 70 24V38Z',C.cream)+l('M19 38V19m42 19V19',C.wood,3)+wheel(23,68,1.2)+wheel(61,68,1.2),
 ()=>r(8,21,64,10,3,C.silver)+r(8,58,64,8,3,C.blue)+l('M19 34 59 55M19 55 59 34',C.silver,5)+e(40,45,4,4,C.gold)+wheel(18,71,.8)+wheel(63,71,.8),
 ()=>r(13,15,53,49,8,C.cream)+r(20,23,38,31,4,C.blue)+l('M38 23v31',C.cream,2)+r(44,33,4,11,2,C.gold)+wheel(24,70)+wheel(58,70)+l('M66 25h9v24',C.wood,3),
 ()=>r(11,35,33,28,7,C.blue)+l('M19 35V12H34',C.dark,5)+p('M41 55H72V63H41ZM41 42H67V48H41Z',C.silver)+wheel(20,67,1.2)+wheel(62,67,.8)+p('m30 42-7 10h7v8l9-13h-8Z',C.gold),
 ()=>r(7,51,66,20,10,C.dark)+[18,33,48,63].map(x=>wheel(x,61,1.2)).join('')+r(16,22,48,30,6,C.wood)+r(21,16,38,12,3,C.cream)+r(21,30,36,14,3,C.green),
 ()=>p('M14 55V36Q13 9 40 8Q68 9 67 36V55Q63 69 40 69Q17 69 14 55Z',C.cream)+r(22,22,37,17,8,C.dark)+dots([[32,30],[49,30]],C.blue,3)+r(23,43,35,18,5,C.blue)+wheel(22,69)+wheel(60,69)+l('M40 8V3',C.gold,2)
][level-1]();}
function genPublicity(level){return [
 ()=>r(20,19,40,42,3,C.cream)+r(25,11,30,17,4,C.silver)+l('M32 13V6H49v7',C.silver,3)+l('M29 36h22m-22 9h18',C.wood,2),
 ()=>p('m15 68 23-59h9l23 59H58L41 26 25 68Z',C.wood)+l('M25 50h31',C.gold,5),
 ()=>l('M14 68 27 14H58L68 68M23 37H62',C.silver,4)+r(26,17,29,37,4,C.cream)+l('M31 20v-8m18 8v-8',C.wood,3),
 ()=>l('M15 70 32 19M65 70 49 19',C.wood,5)+r(14,20,53,40,4,C.cream)+l('M40 20v40',C.wood,2)+g(tools(10),20,21,.48)+r(10,59,61,7,2,C.wood),
 ()=>r(14,31,48,29,6,C.wood)+r(18,15,40,10,4,C.silver)+l('M21 25v12m35-12v12',C.silver,4)+p('M25 25H53V64H25Z',C.cream)+l('M29 40h19m-19 7h15m-15 7h19',C.wood,2)+l('M62 43h12V29',C.wood,3)+e(73,27,4,4,C.gold),
 ()=>r(31,49,19,19,5,C.wood)+e(40,67,26,5,C.wood)+e(40,31,29,28,C.blue)+e(40,31,23,22,C.cream)+g(tools(10),17,9,.56)+e(40,54,3,3,C.gold)
][level-1]();}
function genFlower(level){const bloom=(x,y,s=.5)=>g(flower(3),x-40*s,y-31*s,s);return [
 ()=>e(40,45,30,17,C.silver)+e(40,43,23,11,C.cream)+l('M22 43h35',C.wood,2),
 ()=>p('M15 23Q40 9 65 23V65Q40 76 15 65Z',C.silver)+p('M48 22Q38 30 48 70H64V23Z',C.cream)+dots([[52,29],[52,43],[52,59]],C.wood,2),
 ()=>p('M17 27H63L58 65Q40 75 22 65Z',C.blue)+e(40,27,23,7,C.cream)+l('M19 27Q15 0 40 7Q65 0 61 27',C.wood,3),
 ()=>p('M21 27H58L61 64Q40 74 19 64Z',C.blue)+e(39,27,19,6,C.cream)+l('M23 35Q-3 24 7 54L20 58',C.wood,4)+r(56,37,10,14,3,C.silver)+e(65,43,4,7,C.dark),
 ()=>p('M19 29H53L55 65Q35 73 16 64Z',C.blue)+p('m52 42 20-22 6 7-23 29Z',C.blue)+e(72,21,8,4,C.silver)+l('M21 37Q-1 23 4 51L17 56',C.wood,4)+e(35,29,17,6,C.cream),
 ()=>e(40,68,27,5,C.wood)+l('M40 65V15',C.wood,5)+[30,51].map((y,i)=>e(40,y,30-i*4,7,C.cream)+bloom(25,y-15,.45)+bloom(53,y-13,.4)).join('')+e(40,11,6,5,C.gold),
 ()=>r(15,32,48,35,12,C.blue)+e(39,32,24,8,C.cream)+l('M40 30V13M23 13h33',C.silver,4)+[24,40,56].map(x=>p(`M${x} 18q-5 7 0 11q5-4 0-11Z`,C.blue,'none')).join('')+r(27,47,24,13,4,C.cream),
 ()=>p('M10 66V37Q10 10 40 10Q70 10 70 37V66Z','#dce8de')+l('M40 12v51M12 39h56',C.wood,2)+bloom(27,43,.62)+bloom(53,46,.56)+r(7,63,66,9,3,C.wood)+l('M18 32q1-12 13-15',C.white,3),
 ()=>p('M24 18H56L65 68H15Z',C.cream)+r(27,21,26,12,4,C.blue)+r(22,39,36,25,4,C.blue)+bloom(30,48,.38)+bloom(50,53,.4)+p('M18 18 40 5 62 18Z',C.wood)+e(40,27,6,6,C.gold)+r(12,67,56,6,3,C.wood)
][level-1]();}
function genRecycle(level){return [
 ()=>p('m9 35 43-18 19 19-42 26Z',C.wood)+l('m21 32 18 21m-7-27 19 22m-8-26 19 22',C.gold,3),
 ()=>p('M13 16H37V59H67V70H13Z',C.wood)+slats(17,24,15,7)+l('M39 62h22',C.gold,3),
 ()=>p('M13 18H64V63H13Z',C.wood)+slats(18,24,41,7)+r(23,13,10,9,2,C.silver)+r(50,13,10,9,2,C.silver)+r(29,54,19,5,2,C.gold),
 ()=>p('M19 21H61V64Q40 75 19 64Z',C.silver)+e(40,21,21,8,C.cream)+[34,47,60].map(y=>dots([[28,y],[40,y],[52,y]],C.dark,2)).join(''),
 ()=>r(12,22,57,46,4,C.wood)+r(9,17,63,10,3,C.cream)+slats(19,34,42,5)+sprouts(42,52,.5)+r(31,12,19,6,2,C.wood),
 ()=>p('M18 24H59V59H18Z',C.wood)+e(18,42,12,19,C.green)+e(59,42,12,19,C.green)+slats(23,30,30,5)+l('M23 56 17 71m39-15 7 15M59 32h14v15',C.silver,4),
 ()=>r(17,29,46,38,13,C.green)+e(40,29,23,7,C.cream)+l('M40 60V10H60',C.silver,4)+p('M32 35q17-13 16 0t-16 12q17-1 16 12','none',C.gold,4)+r(58,7,12,6,3,C.wood),
 ()=>r(19,18,43,48,8,C.silver)+r(16,13,49,10,4,C.green)+r(30,65,22,9,3,C.dark)+l('M53 25v34',C.cream,3)+sprouts(40,50,.7),
 ()=>p('M13 33Q12 8 40 8Q69 8 68 33V55Q68 72 40 72Q13 72 13 55Z',C.green)+e(40,34,27,8,C.cream)+e(40,12,7,5,C.wood)+e(40,49,10,11,C.gold)+l('M40 43v7l4 2',C.wood,2),
 ()=>e(40,40,32,32,C.cream)+e(40,40,24,24,C.green)+e(40,40,17,17,C.blue)+sprouts(40,47,.9)+r(14,66,52,7,3,C.wood)+dots([[21,20],[60,21],[20,59],[61,58]],C.gold,2)
][level-1]();}
const PRODUCER_DRAW={gen_tools:genTools,gen_food:genFood,gen_produce:genProduce,gen_drink:genDrink,gen_herb:genHerb,gen_asian:genAsian,gen_mediterranean:genMediterranean,gen_supply:genSupply,gen_publicity:genPublicity,gen_flower:genFlower,gen_recycle:genRecycle};
const DRAW={fruit:l=>fruit[l-1](),vegetable:l=>vegetable[l-1](),grain,herb,flowers:flower,food:baked,drink,chinese,japanese,italian,mexican,tools,tableware,preservation,bakeware,seedbag,emptybag,coins,energy,timeskip:hourglass,infinite,pantry,lost,comfort,doll,snail,story,keys,timegate,tasting,courses,mascot:puppy,puzzle,scraps,garden_guest:gardenGuest,cats,honor,...PRODUCER_DRAW,...Object.fromEntries(['charge','splitter','upgrade','blackbag','pinkbag','chest'].map(f=>[f,l=>utility(f,l)]))};
// Refinements follow the approved per-level silhouette, rather than a generic family template.
const REFINED={
 'chinese:8':()=>plate()+p('M17 54 9 29 26 42Q51 18 69 39L66 53Q45 65 17 54Z',C.orange)+p('M24 43Q48 28 64 37L61 51Q46 60 25 52Z',C.red)+l('M28 38 38 56m0-22 11 22m0-24 11 19M26 48 55 31M36 56 64 39',C.gold,2.8)+p('M18 46 6 39 8 22 17 32Z',C.orange)+e(64,39,2,2,C.dark),
 'japanese:5':()=>p('M19 59Q11 54 17 45L23 45 22 38 28 36 27 29 35 28Q46 18 55 27Q65 39 58 48L49 53Q38 46 39 39L32 45 31 52 26 53 26 60Z',C.gold)+p('M51 28 47 10 57 17 66 13 64 28Z',C.orange)+dots([[23,51],[29,41],[35,33],[44,29],[53,35],[50,43]],C.cream,2),
 'flowers:6':()=>l('M40 71V42',C.darkGreen,3)+leaf(40,64,.75,0)+leaf(40,55,.7,105)+p('M16 34Q7 22 20 16Q21 4 36 11Q49 0 58 14Q75 15 65 33Q72 47 56 49Q44 64 30 51Q13 53 16 34Z',C.red)+p('M24 32Q23 13 42 19Q62 19 53 38Q51 52 33 44Q20 40 30 29Q42 22 46 34Q45 43 36 36',C.red,'#9f5355',2)+l('M24 18Q37 10 45 17',C.pink,3),
 'flowers:7':()=>l('M40 72V51',C.darkGreen,3)+leaf(40,67,.95,0)+leaf(42,65,.9,110)+e(40,32,29,26,'#9c91bd')+[[21,20],[38,12],[56,20],[15,35],[33,29],[51,34],[64,36],[23,49],[42,47],[57,50]].map(([x,y],i)=>g([0,90,180,270].map(a=>g(e(0,-4,5,6,i%2?C.blue:'#b3a3ce'),0,0,1,a)).join('')+e(0,0,2,2,C.cream),x,y,.9)).join(''),
 'flowers:9':()=>l('M40 72V52',C.darkGreen,3)+leaf(40,67,1,10)+leaf(44,64,.9,115)+p('M13 42 10 26 21 32 24 13 33 24 40 7 47 24 57 12 61 33 72 25 67 49Q40 72 13 42Z',C.pink)+p('M20 43Q20 22 40 16Q61 23 61 43L53 58H28Z',C.cream)+[25,31,37,43,49,55].map((x,i)=>l(`M${x} 44v-${15-Math.abs(i-2.5)*2}`,C.pink,2)).join('')+p('M13 38 25 48 27 34 38 47 47 33 52 48 68 37 58 57Q40 68 23 56Z',C.pink),
 'comfort:5':()=>r(14,28,48,39,5,C.wood)+p('M14 28 24 17H68L62 28Z',C.cream)+r(21,36,34,23,3,C.cream)+l('M62 48h12V34',C.wood,4)+e(74,33,4,4,C.gold)+l('M36 49V35l12-3v14',C.wood,3)+e(32,50,5,4,C.wood)+e(44,47,5,4,C.wood),
 'story:5':()=>p('M12 19 40 8 68 19V49Q57 65 40 73Q23 65 12 49Z',C.red)+p('M20 24 40 16 60 24V47Q53 59 40 65Q26 58 20 47Z',C.white)+g(puppyHead(),8,15,.8)+l('M15 52h49',C.gold,2)+r(34,50,12,7,2,C.gold),
 'chest:1':()=>r(14,26,52,43,5,C.pink)+r(11,21,58,12,3,C.pink)+r(34,21,12,48,0,C.cream)+r(14,39,52,10,0,C.cream)+p('M39 21Q15 18 22 8Q35 6 39 21Q46 4 58 11Q62 22 39 21Z',C.cream),
 'tasting:5':()=>p('M13 20H68V61H13Z',C.cream)+r(8,16,9,49,4,C.gold)+r(64,16,9,49,4,C.gold)+e(34,38,14,9,C.white)+e(34,38,10,6,C.cream)+check(48,49,.6),
 'tasting:6':()=>g(p('M26 18H54V66Q40 75 26 66Z','#577897')+e(40,18,14,6,C.blue)+r(25,12,30,8,3,C.dark)+p('M34 13V5H58V18Q47 22 34 13Z',C.cream)+e(39,46,10,11,C.gold)+star(39,46,.36,C.cream),-3,3,1,-12),
 'garden_guest:5':()=>p('M40 9 73 67H8Z',C.blue)+p('M25 67V48Q25 29 40 29Q55 29 55 48V67Z',C.dark)+l('M40 9 37 24M9 67h64',C.wood,3)+p('M25 67V48Q25 33 37 30L29 67Z',C.cream),
 'infinite:2':()=>e(40,42,29,27,C.purple)+e(40,42,21,19,'#735b88')+p('M40 42C26 21 13 30 18 44C25 59 40 40 48 33C62 23 70 42 59 49C51 54 44 46 40 42Z','none',C.white,4),
 'tools:3':()=>g(p('M26 14Q17 16 23 27L35 61Q40 69 45 61L58 27Q64 15 54 13L42 51H38Z',C.silver)+p('M18 17Q18 9 26 11Q33 17 30 29L23 34Q17 28 18 17ZM53 11Q62 8 63 17Q64 28 57 34L50 29Q47 17 53 11Z',C.red),0,0),
 'italian:2':()=>plate()+e(40,49,26,14,C.gold)+[0,1,2,3,4].map(i=>l(`M${18+i*3} ${45+i*3}Q${25+i*5} ${25+i*3} ${54-i*2} ${42+i*4}Q${68-i*3} ${57-i*4} ${32+i} ${59-i*3}`,i%2?C.orange:C.cream,2)).join('')+p('M22 44Q19 35 30 36Q39 29 43 37Q58 31 59 44L49 47 39 42 31 47Z',C.red)+leaf(43,43,.5,110),
 'italian:4':()=>plate()+e(40,48,26,14,C.gold)+dots([[20,49],[27,43],[33,52],[42,45],[49,55],[59,49],[35,38],[23,55],[48,39]],C.cream,2)+p('M38 22Q54 20 64 41L55 48Q51 31 35 31Z',C.orange)+p('M38 22Q54 20 64 41L60 43Q51 27 36 26Z',C.darkGreen)+leaf(37,44,.5,10),
 'italian:7':()=>plate()+e(40,48,27,15,C.dark)+[0,1,2,3,4].map(i=>l(`M${17+i*4} ${44+i*3}Q${32+i*4} ${27+i*3} ${59-i*3} ${43+i*3}Q${65-i*2} ${56-i*2} ${30+i} ${59-i*4}`,i%2?'#8a8076':'#b3a99a',1.7)).join('')+leaf(46,41,.6,50),
 'mexican:5':()=>p('M16 18 39 33 62 13 67 55 42 72 15 54Z',C.gold)+p('M26 26 39 31 57 26 52 60 40 67 29 56Z',C.cream)+l('M17 21 23 54 38 68M60 19 57 55 43 69M22 28 31 59m27-33-11 35',C.wood,1.5)+l('M19 49 61 45',C.wood,3),
 'mexican:8':()=>e(40,46,29,25,C.gold)+e(40,41,26,20,C.cream)+l('M19 36Q30 41 23 56M29 25Q46 38 37 60M42 22Q59 36 52 56M54 28Q67 37 62 47M17 43Q39 29 64 40',C.orange,3),
 'gen_tools:2':()=>p('M20 24 21 20 29 22 34 18 44 21 54 19 60 24V63Q40 75 20 63Z',C.silver)+e(40,24,19,7,C.white)+e(40,24,13,4,C.wood)+l('M24 34v23',C.white,3),
 'gen_tools:3':()=>container(C.cream)+e(40,31,15,3,C.wood)+l('M27 42v15',C.white,3),
 'gen_tools:4':()=>g(tools(1),10,-5,.8)+container(C.cream)+g(tools(1),21,31,.4),
 'gen_tools:5':()=>l('M23 35Q1 27 9 50H24M57 35Q79 27 71 50H56',C.pink,5)+p('M21 28H59Q68 60 56 67Q40 74 24 67Q13 60 21 28Z',C.pink)+e(40,28,19,6,C.white)+e(40,28,13,3,C.wood),
 'gen_tools:6':()=>r(13,32,54,35,3,C.blue)+p('M13 32 24 18H65L67 32Z',C.blue)+p('M19 29 28 22H60L61 29Z',C.dark)+l('M23 25h40M42 20v11',C.white,3)+l('M39 34v30',C.white,2),
 'gen_tools:9':()=>p('M13 39 54 21 69 44 58 70 14 62Z',C.dark)+p('M13 39 54 21 58 47 14 62Z',C.wood)+l('M23 40 48 29m-23 18 25-11',C.dark,4)+r(27,53,21,7,2,C.cream),
 'gen_tools:10':()=>p('M13 36V11H67V36Z',C.pink)+r(18,17,44,16,3,C.white)+p('M11 38 19 33H63L69 38V68H11Z',C.cream)+p('M18 39H62V45H18Z',C.wood)+r(36,49,10,10,2,C.gold),
 'gen_tools:11':()=>e(40,68,22,5,C.blue)+l('M40 65V9M10 19H70',C.blue,6)+l('M17 21v17q0 9 9 4M62 21v17q0 9-9 4',C.blue,4)+e(40,9,5,5,C.gold),
 'gen_food:1':()=>p('m10 36 42-16 20 15v22L30 72 10 57Z',C.red)+p('m30 49 42-14v22L30 72Z',C.wood)+p('m23 35 26-8 11 7-25 9Z','#9b6752')+l('m28 36 19-6',C.dark,2),
 'gen_food:2':()=>r(14,11,52,58,5,C.pink)+r(20,17,40,46,3,C.pink)+r(23,35,34,9,4,C.cream)+dots([[19,17],[61,17],[19,63],[61,63]],C.gold,2),
 'gen_food:8':()=>p('M10 67V37Q10 10 40 10Q70 10 70 37V67Z',C.cream)+p('M21 65V41Q21 24 40 24Q59 24 59 41V65Z',C.red)+p('M27 65V43Q27 31 40 31Q53 31 53 43V65Z',C.dark)+r(7,64,66,8,3,C.wood)+l('M40 12v10M20 20l9 9m31-9-9 9',C.wood,2),
 'gen_drink:9':()=>r(48,12,13,54,5,C.cream)+r(22,9,40,19,9,C.cream)+l('M32 27v16',C.silver,3)+p('M18 42H45L40 64H23Z',C.silver)+e(32,42,14,5,C.white)+r(16,65,50,7,3,C.cream),
 'gen_drink:10':()=>r(10,10,60,58,15,C.blue)+r(17,19,46,20,9,C.dark)+r(16,44,48,18,3,C.dark)+[27,52].map((x,i)=>e(x,30,7,7,i?C.red:'#679ab8')+l(`M${x} 38v9`,C.silver,4)+r(x-6,50,13,10,3,C.white)).join('')+r(13,65,54,7,3,C.blue),
 'gen_flower:5':()=>p('M19 29H53L55 65Q35 73 16 64Z',C.cream)+p('m52 42 20-22 6 7-23 29Z',C.blue)+e(72,21,8,4,C.silver)+l('M21 37Q-1 23 4 51L17 56',C.wood,4)+e(35,29,17,6,C.white),
 'gen_flower:6':()=>e(40,68,27,5,C.pink)+l('M40 65V17',C.pink,6)+e(40,48,30,10,C.pink)+[20,40,60].map((x,i)=>g(p('M-9 0H9L7 12H-7Z',C.cream)+sprouts(0,0,.5),x,i===1?26:41)).join('')+e(40,17,5,5,C.gold),
 'gen_tools:7':()=>p('M17 51V19Q17 4 40 4Q63 4 63 19V51Z',C.cream)+e(40,14,4,4,C.wood)+p('M12 39H68V61Q40 78 12 61Z',C.cream)+e(40,39,28,8,C.white),
 'gen_tools:12':()=>r(32,6,16,63,6,C.wood)+e(40,68,28,6,C.cream)+[[-4,5,-12],[5,26,12],[-3,47,-10]].map(([x,y,a])=>g(p('M14 8Q40-4 66 8L56 22H24Z',C.cream)+p('M14 8V19Q40 35 66 19V8Q40 24 14 8Z',C.cream)+e(40,21,4,2,C.gold),x,y,1,a)).join(''),
 'gen_food:5':()=>r(11,25,58,40,7,C.cream)+r(17,31,46,29,4,C.wood)+e(40,45,13,12,C.dark)+e(40,45,9,8,C.blue)+r(25,18,30,7,3,C.cream)+feet(17,65,46),
 'gen_food:6':()=>l('M21 59 15 71m44-12 6 12M40 61v14',C.dark,6)+p('M14 31H66V53Q40 73 14 53Z',C.dark)+e(40,31,26,8,'#7d7b78')+p('M10 29Q40 4 70 29Z',C.dark)+r(31,13,18,6,3,C.wood)+r(28,42,24,13,4,C.orange),
 'gen_produce:11':()=>r(10,18,60,49,6,C.cream)+drawers(16,25,48,35,2,C.blue)+feet(),
 'gen_herb:3':()=>p('M12 28H68L61 63Q40 72 19 63Z',C.cream)+e(40,28,28,9,C.white)+e(40,28,20,5,C.wood)+[25,40,55].map(x=>e(x,56,4,5,C.dark)).join(''),
 'gen_herb:8':()=>r(14,7,52,64,5,C.pink)+[31,58].map(y=>sprouts(40,y-7,.9)+p(`M19 ${y-6}L61 ${y-11} 54 ${y+9} 26 ${y+13}Z`,C.cream)+p(`M19 ${y-6}L61 ${y-11} 54 ${y-3} 26 ${y+2}Z`,C.wood)).join(''),
 'gen_asian:1':()=>r(28,26,24,37,7,C.orange)+r(13,46,54,16,5,C.orange)+r(6,43,10,22,3,C.wood)+r(64,43,10,22,3,C.wood)+p('M36 24Q13 22 22 11Q30 3 39 17Q44-3 54 6Q66 14 46 25Q62 40 49 43Q36 45 36 24Z',C.orange)+e(41,25,5,5,C.gold),
 'gen_asian:3':()=>p('M10 44H70V58Q40 77 10 58Z',C.cream)+e(40,44,30,12,C.cream)+r(31,20,18,26,6,C.silver)+e(40,20,9,5,C.dark)+e(25,56,3,3,C.gold)+r(47,51,13,6,2,C.blue),
 'gen_asian:8':()=>l('M65 45H75V18H64',C.orange,7)+p('M9 61V40Q9 9 37 9Q65 9 65 40V61Z',C.orange)+r(5,61,66,10,4,C.wood)+ovenWindow(17,38,39,22)+e(37,10,6,4,C.gold),
 'gen_asian:9':()=>e(40,52,32,20,C.cream)+e(40,48,31,15,C.white)+e(40,48,22,10,C.dark)+p('M30 49V15H50V49Q40 58 30 49Z',C.cream)+e(40,15,10,5,C.dark)+e(40,49,10,5,C.orange)+r(8,64,64,6,3,C.wood),
 'gen_asian:10':()=>p('M14 29Q12 7 40 7Q68 7 66 29V53Q67 72 40 72Q13 72 14 53Z',C.orange)+e(40,40,23,25,C.wood)+e(40,40,17,19,C.orange)+e(40,40,12,12,'none',C.cream)+l('M40 26v28M26 40h28M30 30l20 20m-20 0 20-20',C.cream,2.5)+e(40,40,5,5,C.gold)+feet(22,68,36),
 'gen_mediterranean:8':()=>p('M12 30 60 17 70 61 18 71Z',C.blue)+p('M12 30 60 17 66 43 17 57Z',C.dark)+l('m21 32 34-9m-31 17 33-9m-30 18 33-9',C.silver,2)+r(24,59,26,6,2,C.cream)+e(61,55,3,3,C.orange),
 'gen_mediterranean:10':()=>p('M17 46Q9 8 40 6Q71 8 64 47L61 62Q40 77 19 62Z',C.blue)+l('M16 43H64',C.cream,3)+r(62,37,10,15,3,C.silver)+ovenWindow(25,45,28,20)+r(30,6,20,6,3,C.wood)+feet(26,67,29),
 'gen_publicity:1':()=>p('M12 29H68L64 59H16Z',C.orange)+r(10,52,60,9,3,C.wood)+l('M26 31V10H54V31',C.orange,5)+r(25,30,30,9,3,C.gold),
 'gen_publicity:3':()=>l('M13 69 27 17H58L68 69M24 39H62',C.cream,5)+p('M22 20H61V60H22Z','none',C.cream,4)+r(18,10,46,11,5,C.silver)+r(18,57,47,7,3,C.cream),
 'gen_publicity:4':()=>l('M15 70 32 19M65 70 49 19',C.pink,5)+r(14,20,53,40,4,C.green)+l('M40 20v40',C.cream,3)+g(tools(10),20,21,.48)+r(10,59,61,7,2,C.pink)+r(12,14,56,8,4,C.silver),
 'gen_publicity:5':()=>r(12,36,51,29,6,C.orange)+r(18,17,39,23,9,C.orange)+e(18,29,7,12,C.gold)+l('M63 46h12V28',C.wood,4)+e(74,27,4,4,C.gold)+p('M25 40H54V70H25Z',C.cream)+l('M30 47h18m-18 7h14m-14 7h18',C.wood,2),
 'gen_publicity:6':()=>r(32,49,16,19,5,C.cream)+e(40,68,25,5,C.cream)+e(40,31,29,28,C.cream)+e(40,31,23,22,C.blue)+g(tools(10),17,9,.56)+e(40,54,3,3,C.gold),
 'gen_recycle:2':()=>p('M10 19 40 10 70 19V65L58 71V32L46 28V65H34V28L22 32V71L10 65Z',C.wood)+l('M15 27v32m3-31v34m44-35v35m4-36v32M29 17 51 24m-22 4 22 8',C.gold,2),
 'gen_recycle:4':()=>p('M13 21H67V65L57 72H22L13 65Z',C.cream)+e(40,21,27,7,C.wood)+p('M19 21H61V26H19Z',C.dark)+r(23,38,34,7,3,C.dark)+r(23,53,34,7,3,C.dark),
 'gen_recycle:8':()=>p('M22 18H58L66 66Q40 76 14 66Z',C.blue)+r(18,12,44,10,5,C.blue)+p('M28 61H54L58 73H24Z',C.orange)+sprouts(40,48,.6)+l('M54 27 57 55',C.cream,3),
 'gen_recycle:9':()=>e(40,44,30,28,C.cream)+e(40,37,29,22,C.white)+r(34,8,12,18,4,C.wood)+r(25,7,30,7,3,C.orange)+e(40,49,10,10,C.gold)+l('M40 43v7l5 2',C.wood,2)+feet(22,68,36),
 'gen_recycle:10':()=>e(40,40,32,32,C.blue)+e(40,40,25,25,C.cream)+e(40,40,19,19,C.white)+l('M26 44Q18 25 36 22Q50 20 56 34M54 38Q62 58 42 61Q29 63 23 50',C.green,5)+p('m48 33 12 7 2-14ZM17 56l4-14 13 5Z',C.green)+r(14,67,52,7,3,C.wood),
 'grain:6':()=>[[24,40,1,0],[47,24,.85,25],[58,51,1,-10],[36,61,.9,20]].map(([x,y,s,a])=>g(p('M0-15 13 11-12 13Z',C.wood)+p('M0-15 1 8 13 11Z',C.gold)+p('M1 8-12 13 13 11Z','#a87d50'),x,y,s,a)).join(''),
 'herb:4':()=>[-25,-12,0,12,25].map((dx,i)=>l(`M40 67Q${40+dx} 52 ${40+dx} ${29+Math.abs(dx)*.3}`,C.wood,1.5)+Array.from({length:4},(_,k)=>e(40+dx-k*dx*.15,35+Math.abs(dx)*.2+k*7,4,2.5,'#9fac86')).join('')).join(''),
 'flowers:3':()=>flower(3).replaceAll(`fill="${C.pink}"`,`fill="${C.orange}"`),
 'food:1':()=>Array.from({length:12},(_,i)=>g(e(0,-21,7,8,C.gold),40,43,1,i*30)).join('')+e(40,43,24,22,C.gold)+p('M57 44Q58 21 35 27Q12 33 25 53Q42 66 53 48Q59 36 42 34Q29 34 34 47Q41 54 46 44','none',C.wood,3)+l('M20 38q9-17 27-11',C.cream,2),
 'food:3':()=>p('M23 27Q25 8 51 14Q68 17 68 32V61L40 71 18 62Z',C.wood)+p('M32 29Q41 13 56 20Q62 24 64 34V60L40 68Z',C.gold)+p('M12 37Q6 23 23 21Q41 21 42 37V68H12Z',C.wood)+p('M17 38Q11 28 24 27Q37 27 37 38V62H17Z',C.cream)+l('M43 23q7 7 7 18m3-21q8 8 8 18',C.cream,2),
 'food:7':()=>baked(7)+l('M23 36q13-15 28-4m-26 17q10 13 23 2m-14-13q10-5 12 5',C.white,3),
 'food:8':()=>baked(8).replaceAll(`fill="${C.wood}"`,`fill="#717a9c"`),
 'food:9':()=>p('M10 41 40 13 71 41 40 70Z',C.gold)+p('m17 41 23-20 24 20-24 20Z',C.cream)+p('m10 41 16 1 14 28m0-57-2 21 33 7','none',C.wood,2)+e(41,44,11,11,C.red)+l('M41 34q0-14 11-16',C.darkGreen,2)+leaf(50,24,.4,110),
 'drink:1':()=>p('M29 17H51V27Q64 31 63 50L60 66Q41 75 20 66L17 50Q16 31 29 27Z',C.white)+r(27,10,26,11,5,C.blue)+l('M24 39q-4 10 0 18',C.cream,3),
 'drink:3':()=>p('M22 22H58L63 42Q69 64 40 69Q11 64 17 42Z','#e3e9da')+p('M21 34H59L61 44Q64 62 40 65Q15 61 19 45Z',C.orange)+l('m44 35 8-24 10-3',C.green,4)+l('M25 39q-4 8-1 14',C.white,3),
 'drink:5':()=>p('M13 27H58V51Q56 69 36 68Q15 66 13 51Z',C.green)+e(35,27,23,8,C.white)+e(35,27,17,5,'#b7c294')+l('M59 34q21-3 13 16l-14 5',C.darkGreen,4)+l('M25 27q10-8 22 0m-17 0q6-4 11 0',C.white,2),
 'drink:9':()=>p('M13 30H67L44 57V67H56V72H24V67H36V57Z','#e2e8dc')+p('M15 30Q21 12 31 15Q38 1 47 13Q62 11 66 30Z',C.gold)+p('M18 32H62L40 53Z',C.orange)+l('m26 26 10-7m8 11 13-7',C.cream,3),
 'drink:10':()=>r(22,14,36,9,4,C.silver)+p('M22 25Q12 34 15 53Q16 70 40 71Q64 70 65 53Q68 34 58 25Z','#e5e4e6')+p('M22 31Q15 43 20 57Q21 66 40 67Q59 66 61 54Q64 39 57 31Z',C.purple)+p('M23 36q23 16 33 1m-33 14q23 16 33 1','none',C.white,5)+e(40,25,18,6,C.white)+dots([[32,23],[43,20],[50,25]],'#66688b',4),
 'chinese:4':()=>p('M10 40H70Q65 68 40 70Q15 68 10 40Z',C.dark)+e(40,40,30,11,'#9a6542')+[0,1,2,3,4].map(i=>l(`M${17+i*3} ${35+i*2}Q${27+i*3} ${27+i*2} ${57-i*2} ${37+i*2}Q${65-i*3} ${45-i} ${26+i*2} ${47-i*2}`,C.gold,1.8)).join('')+g(r(19,32,14,10,3,C.wood),-2,3,1,-8)+g(r(43,31,15,11,3,C.wood),5,-4,1,8)+leaf(53,42,.45,50),
 'chinese:6':()=>chinese(6)+p('m39 15 23 19-24 10-11-13Z',C.gold)+p('m39 15-1 28-13-10Z',C.green)+dots([[44,28],[51,32],[42,36]],C.cream,1.5),
 'japanese:2':()=>plate()+p('m13 37 36-13 20 13v24L33 71 13 57Z',C.gold)+p('m33 48 36-11v24L33 71Z',C.cream)+p('M59 44q-19-1-17 14q5 13 17-1q6-8-6-6q-9 3-3 8','none',C.gold,3),
 'japanese:6':()=>bowl(C.dark)+e(40,42,25,7,C.white)+l('M22 41q9-12 17 0t20 0',C.gold,2)+l('M15 47q25 13 50 0',C.red,4)+e(40,39,11,7,C.pink)+l('M34 38q7-5 13 2',C.red,2),
 'japanese:7':()=>p('m10 33 45-12 16 12-1 31-44 9-16-12Z',C.red)+p('m16 35 39-10 10 10-37 9Z',C.cream)+p('m21 35 34-7 8 9-33 8Z',C.wood)+Array.from({length:6},(_,i)=>l(`m${26+i*5} ${34-i*1.2} 5 7`,C.gold,2)).join('')+l('M27 48v19',C.wood,2),
 'japanese:8':()=>plate()+Array.from({length:5},(_,i)=>g(e(0,-12,12,18,C.pink),40,39,1,i*72)).join('')+e(40,39,7,7,C.gold)+[0,72,144,216,288].map(a=>g(l('M0-7v-9',C.red,1),40,39,1,a)).join(''),
 'italian:1':()=>[[-8,1],[9,7]].map(([x,y])=>g(r(28,12,10,56,5,C.gold)+l('M31 21v29',C.cream,2)+dots([[35,24],[32,35],[35,48],[32,59]],C.cream,1),x,y,1,-17)).join(''),
 'italian:6':()=>plate()+p('M15 35 21 34 22 28 29 29 32 22 39 24 44 19 49 25 56 25 57 32 64 34 61 41 67 46 60 51 60 58 52 58 48 65 42 61 36 66 31 60 24 61 23 54 17 52 20 45 14 41Z',C.green)+p('m24 38 19-10 15 14-18 12Z','#bed29a')+l('m27 43 13 5 13-8',C.darkGreen,1),
 'italian:7':()=>plate()+p('M17 56Q16 33 40 29Q65 32 66 56Z',C.dark)+l('M22 52q-2-18 14-13t16 9M30 56q-2-13 15-13t12 11M27 43q10-16 24-6',C.ink,3)+leaf(55,39,.45,90),
 'mexican:1':()=>mexican(1)+dots([[29,34],[47,39],[32,51],[46,55],[37,27]],C.red,1.5),
 'mexican:3':()=>mexican(3)+l('m48 61 5 9 4-10',C.cream,2),
 'tools:2':()=>tools(2).replaceAll(`fill="${C.wood}"`,`fill="${C.blue}"`),
 'tools:8':()=>tools(8).replaceAll(`fill="${C.wood}"`,`fill="#899795"`).replaceAll(`fill="${C.cream}"`,`fill="${C.silver}"`),
 'tableware:3':()=>tableware(3)+p('M22 30Q40 13 58 30Z',C.cream)+e(40,20,4,3,C.gold),
 'tableware:8':()=>tableware(8)+e(33,48,14,6,C.cream)+e(32,44,3,3,C.gold),
 'preservation:1':()=>p('M14 28H61V49H14Z','#dde6df')+e(14,39,9,12,C.cream)+e(14,39,4,7,C.wood)+e(61,39,9,12,C.white)+p('m21 48 44-5 4 23-45 3Z','#dbe7df')+l('m28 56 29-3',C.white,3),
 'bakeware:2':()=>p('M13 30H67V55Q40 75 13 55Z',C.silver)+[20,30,40,50,60].map(x=>l(`M${x} 36v25`,C.wood,1.5)).join('')+Array.from({length:10},(_,i)=>g(e(0,-13,7,9,C.silver),40,30,1,i*36)).join('')+e(40,30,20,11,C.cream),
 'bakeware:4':()=>p('m15 28 48-6 4 37-49 7Z',C.pink)+p('m21 33 36-5 4 25-38 6Z',C.cream)+l('M16 38H6v15h10M66 32h10v16H66',C.pink,4),
 'seedbag:3':()=>seedbag(3)+l('M39 33q-18 12-17 26m19-25q19 8 15 21',C.wood,2),
 'seedbag:4':()=>p('M21 21H60L63 64 53 71H23L16 62Z',C.wood)+p('m53 22 7-1 3 43-10 7Z','#ad835e')+r(19,14,41,12,6,C.cream)+l('M24 21h29',C.wood,2)+leaf(39,56,.8,20),
 'emptybag:1':()=>p('M17 28Q36 17 61 29L67 61 49 68 19 60Z',C.wood)+e(39,29,22,8,C.cream)+e(39,30,17,5,C.ink)+l('m23 43 8 13m10-17 17 15',C.cream,2),
 'emptybag:3':()=>p('m13 19 52 1 1 49-53-1Z',C.white)+p('M13 19 66 69 13 68Z',C.pink)+l('M18 25v37h38M28 23h31v32',C.wood,1)+p('M30 36h10v-8h9v8h9v10h-9v9h-9v-9H30Z',C.cream)+l('M34 41h20m-10-9v18',C.wood,1),
 'emptybag:4':()=>emptybag(4)+p('m34 29 9-2 7 29-10 3Z',C.pink)+l('M38 31l7 23',C.cream,2),
 'pantry:1':()=>l('M16 30Q17-2 40 9Q65 2 64 30',C.wood,4)+pantry(1),
 'pantry:3':()=>r(10,22,60,44,3,C.cream)+r(15,28,49,33,3,C.white)+e(40,43,9,6,'none',C.gold)+e(40,37,3,3,C.gold),
 'pantry:8':()=>p('M17 24H63V63Q40 76 17 63Z',C.wood)+e(40,24,23,8,C.cream)+p('M24 30H56V61Q40 69 24 61Z',C.dark)+l('M40 30v35M27 47h26',C.gold,3)+p('M43 27Q61 18 70 31V63Q61 70 43 66Z',C.wood)+l('M51 32v28',C.gold,2),
 'pantry:9':()=>cupboard(12,57,C.blue)+r(21,19,38,42,2,'#cce0de')+l('M26 24 48 46M26 33l9 9',C.white,3)+r(52,34,4,12,2,C.gold),
 'pantry:10':()=>cupboard(8,61,'#bd7c94')+r(22,15,36,47,3,C.dark)+r(22,38,36,23,3,C.pink)+Array.from({length:5},(_,i)=>l(`M24 ${42+i*4}h32`,C.wood)).join('')+e(40,20,18,8,C.pink)+e(40,21,12,4,C.cream)+r(31,58,18,4,2,C.gold),
 'pantry:11':()=>p('m14 35 9-9h34l9 9v30l-9 9H23l-9-9Z',C.cream)+p('M18 27Q19 3 40 4Q61 3 62 27Z','#cee1df')+l('M26 26Q26 9 36 9',C.white,3)+r(21,34,38,29,3,C.blue)+l('M31 35v28m18-28v28',C.cream,2)+e(40,4,4,3,C.gold),
 'lost:5':()=>l('M24 30Q23 2 40 7Q57 2 57 30',C.wood,4)+p('M15 35Q20 22 31 26H52Q65 24 68 40L67 61Q39 75 12 60Z',C.wood)+l('M19 36q22 10 43 0',C.cream,2)+r(31,42,23,15,4,C.cream),
 'comfort:3':()=>r(12,20,56,45,12,C.cream)+[[28,35],[52,35],[28,53],[52,53]].map(([x,y])=>e(x,y,8,8,C.orange)).join(''),
 'comfort:6':()=>r(23,24,43,39,16,C.blue)+e(24,44,20,21,C.blue)+e(24,44,15,16,C.dark)+dots([[18,36],[26,36],[32,43],[17,45],[24,52]],C.silver,1.5)+handle(39,25,15),
 'comfort:8':()=>r(12,44,56,23,6,C.red)+p('m16 41 4-29h42l4 29Z',C.red)+r(24,16,32,19,3,C.white)+p('M29 23Q34 18 39 23H45Q52 18 55 28L51 32 46 28H37L32 32Z',C.blue)+l('M30 25h7m-3-3v6',C.dark,1.5)+dots([[48,23],[51,27]],C.red,1.5)+l('M24 55h13m-6-6v12',C.cream,3)+dots([[53,53],[60,58]],C.cream,2),
 'doll:1':()=>p('M14 15H62V36L53 41 62 47V68H14V47L22 41 14 35Z',C.cream)+l('M20 22h34m-34 5h6m5 0h6m5 0h6M20 60h6m5 0h6m5 0h6m5 0h4',C.pink,2)+l('M37 24v11m0 6v11m0 5v6',C.pink,2),
 'doll:2':()=>r(11,29,52,33,8,C.purple)+p('M12 30V13H59V31Z',C.pink)+l('M18 29v27m9-27v27m9-27v27',C.cream,1)+r(44,29,22,35,3,C.cream)+e(55,28,13,5,C.wood)+e(55,63,13,5,C.wood)+slats(47,36,16,4)+l('M35 17 27 43',C.silver,2),
 'doll:6':()=>l('M55 63Q76 56 65 19',C.silver,7)+p('M25 65Q21 39 27 27L23 12 36 22 49 22 61 11 56 34 56 66Z',C.silver)+e(32,32,2,2,C.dark)+e(48,32,2,2,C.dark)+p('m37 39 7 0-3 4Z',C.pink)+l('M26 47h28m-27 9h27m-26 9h25M64 27l6 1m-6 11 7 1m-9 10 7 2',C.white,4),
 'doll:7':()=>doll(7)+e(40,56,10,11,C.pink)+l('M34 54h12m-6-6v14',C.cream,1.5),
 'doll:8':()=>puppy(2)+p('M26 48 39 53 53 48 58 67H21Z',C.red)+r(32,56,16,11,3,C.cream)+l('M25 50 29 43m21 1 4 7M26 63h4m20 0h4',C.cream,1.2),
 'snail:1':()=>snail(1)+e(55,53,13,16,C.wood)+e(56,53,8,11,C.dark),
 'snail:3':()=>snail(3).replaceAll(`fill="${C.gold}"`,`fill="${C.orange}"`)+dots([[30,29],[27,44],[39,52]],C.dark,3),
 'snail:5':()=>p('M9 62Q14 52 44 57Q55 56 55 36Q66 28 70 42L66 63Q45 75 9 68Z',C.cream)+l('m59 38-2-13m9 12 5-12',C.wood,2)+dots([[57,23],[71,23]],C.dark,2)+e(32,42,24,23,C.pink)+p('M17 42Q16 20 36 26Q54 29 48 47Q34 63 22 48Q17 34 34 33Q46 34 39 44Q30 51 29 40','none',C.red,3),
 'snail:6':()=>p('M9 62Q14 52 44 57Q55 56 55 36Q66 28 70 42L66 63Q45 75 9 68Z',C.cream)+l('m59 38-2-13m9 12 5-12',C.wood,2)+dots([[57,23],[71,23]],C.dark,2)+p('M43 16Q7 11 8 42Q11 69 44 62Q23 48 34 30Z','#697c9e')+star(37,40,.65,C.gold),
 'keys:4':()=>e(40,14,11,10,'none',C.silver)+e(40,49,24,24,C.red)+e(40,47,16,16,C.cream)+e(40,47,11,11,C.silver)+l('M40 39v8l7 4',C.dark,3),
 'keys:5':()=>p('M11 44A29 25 0 1 0 69 44A29 25 0 1 0 11 44M23 44A17 14 0 1 1 57 44A17 14 0 1 1 23 44Z',C.white).replace('/>',' fill-rule="evenodd"/>')+r(26,17,28,28,9,C.white)+paw(40,32,.62,C.red),
 'scraps:8':()=>p('M8 62Q12 43 30 38Q43 29 55 40Q70 44 73 63Q44 78 8 62Z',C.wood)+e(27,61,8,5,C.dark)+l('M46 48V27',C.darkGreen,3)+[0,120,240].map(a=>g(p('M0 1Q-18-3-13-14Q-4-20 0-8Q8-20 15-10Q19 1 0 1Z',C.green),46,27,.65,a)).join(''),
 'garden_guest:3':()=>p('M10 51Q24 27 40 43Q56 61 70 31V46Q55 78 39 58Q24 41 10 67Z',C.wood)+l('M12 55Q25 34 40 48Q57 66 69 38M12 61Q25 39 40 53Q56 71 69 44',C.cream,1.8),
 'cats:3':()=>cats(3)+e(29,66,10,5,C.wood)+e(54,66,10,5,C.wood),
 'cats:5':()=>l('M58 63q20-3 12-18',C.silver,8)+e(40,55,24,19,C.white)+p('m20 22 5-13 13 11M45 19 56 8 61 25Z',C.silver)+e(40,32,24,20,C.white)+p('M18 25Q40 6 62 25L54 28 40 22 26 28Z',C.silver,'none')+dots([[31,32],[49,32]],C.dark,2.5)+p('m37 40 7 0-3 4Z',C.pink)+l('M41 44q-4 4-7 0m7 0q4 4 7 0',C.dark,1.2)+e(29,69,10,5,C.white)+e(53,69,10,5,C.white),
 'cats:6':()=>cats(6)+p('M57 65Q77 67 74 43L67 33 66 47 62 43 63 55 57 53Z',C.white),
 'honor:1':()=>p('M17 10H29L40 35 51 10H64L49 43H31Z',C.red)+e(40,52,20,20,C.cream)+star(40,51,.65,C.gold),
 'honor:2':()=>p('M21 8H59L47 28H33Z',C.green)+g(e(40,29,16,18,C.wood)+r(35,45,10,27,5,C.wood)+e(40,27,10,11,C.gold),0,0),
 'honor:3':()=>p('M18 9H62L49 32H31Z',C.blue)+p('M21 35H59V62Q40 76 21 62Z',C.silver)+p('M19 35Q40 18 61 35Z',C.silver)+e(40,24,5,3,C.gold)+l('M21 43H9V53H21M59 43H71V53H59',C.silver,5),
 'honor:4':()=>p('M19 8H61L49 34H31Z',C.purple)+g(chefHat(C.gold),-8,26,1.2)+r(22,60,38,10,3,C.gold),
 'honor:5':()=>star(40,31,1.38,C.gold)+r(34,52,12,12,3,C.wood)+e(40,68,27,6,C.gold),
 'honor:6':()=>e(40,40,17,19,C.silver)+Array.from({length:5},(_,i)=>leaf(23-i,61-i*9,.55,35,C.gold)+leaf(57+i,61-i*9,.55,145,C.gold)).join('')+l('M21 63q19 11 38 0',C.gold,3)+r(22,68,36,6,3,C.dark),
 'honor:7':()=>g(chefHat(C.gold),-6,10,1.15)+r(24,43,34,17,3,C.gold)+r(19,61,44,12,3,C.dark)+r(30,64,22,5,1,C.gold),
 'energy:2':()=>energy(2).replaceAll(`fill="${C.gold}"`,`fill="${C.white}"`).replaceAll('fill="#ead88c"',`fill="${C.gold}"`),
 'energy:3':()=>e(40,42,26,27,C.gold)+e(31,28,7,4,C.white,'none')+e(40,44,30,10,'none',C.blue).replace('stroke-width="1.4"','stroke-width="5"'),
 'energy:4':()=>p('M23 21H57V63Q40 75 23 63Z',C.gold)+e(40,21,17,7,C.blue)+r(32,10,16,6,2,C.blue)+p('m42 32-12 17h10l-2 12 13-20H41Z',C.white),
 'energy:5':()=>p('m40 7 29 16v35L40 75 11 58V23Z',C.blue)+p('m40 17 20 11v24L40 64 20 52V28Z',C.gold)+p('m42 26-13 19h11l-2 12 15-23H42Z',C.white),
 'coins:1':()=>e(40,42,25,29,C.gold)+e(40,42,19,23,C.cream)+paw(40,43,.9,C.gold)+l('M25 28q5-10 14-11',C.white,2),
 'coins:3':()=>p('M21 30 35 23 56 29 51 38Q77 73 40 73Q4 73 25 39Z',C.cream)+e(39,29,18,7,C.wood)+g(e(0,0,10,12,C.gold)+paw(0,1,.4,C.wood),31,23,1,-18)+g(e(0,0,10,12,C.gold),49,24,1,15)+l('M24 40h29',C.wood,4)+paw(40,58,.5,C.gold),
 'coins:4':()=>r(10,30,60,33,6,C.silver)+r(10,24,60,12,4,C.cream)+r(20,41,40,12,4,C.gold)+r(26,44,28,5,2,C.dark),
 'coins:5':()=>p('M23 26Q11 35 16 57Q18 72 40 72Q62 72 64 57Q68 35 57 26Z','#e0e8dc')+[[-9,4],[11,7],[0,-8]].map(([x,y])=>g(e(40,49,12,12,C.gold)+paw(40,50,.42,C.wood),x,y)).join('')+p('M19 21H61L66 31 58 30 54 35 45 29 36 34 28 29 19 33Z',C.red)+r(23,15,34,8,4,C.red)+l('M24 38q-3 8 0 13',C.white,3),
 'coins:6':()=>p('M12 41V25Q14 8 40 8Q66 8 68 25V41Z',C.wood)+p('M20 35V25Q22 16 40 16Q58 16 60 25V35Z',C.gold)+[25,40,55].map(x=>e(x,43,12,11,C.gold)+paw(x,43,.4,C.wood)).join('')+r(10,48,60,23,4,C.wood)+r(18,47,8,24,1,C.gold)+r(55,47,8,24,1,C.gold)+r(35,49,10,13,2,C.gold),
 'blackbag:1':()=>r(11,26,58,37,10,'#8b9d9b')+l('M23 28v33m34-33v33',C.orange,5)+wrench(40,44,.62,C.cream),
 'blackbag:2':()=>r(9,26,62,40,5,'#6c849b')+l('M28 26V14H52V26',C.dark,4)+r(10,42,60,5,0,C.silver)+wrench(40,47,.7,C.white),
 'pinkbag:1':()=>utility('pinkbag',1)+leaf(41,58,.85,40,C.cream),
 'pinkbag:2':()=>p('M20 25H59L69 65Q39 75 10 65Z',C.pink)+p('M20 25H59L63 40H16Z',C.cream)+l('M28 26V12H52V26',C.blue,5)+l('M17 37h44',C.blue,4)+r(54,35,7,12,2,C.blue),
 'infinite:4':()=>p('m40 5 9 24 25 11-25 10-9 25-9-25L6 40l25-11Z',C.purple)+p('M40 42C26 21 13 30 18 44C25 59 40 40 48 33C62 23 70 42 59 49C51 54 44 46 40 42Z','none',C.white,4),
 'splitter:2':()=>g(e(23,58,12,12,C.red)+e(54,58,9,10,C.red)+p('M29 48 51 9 58 12 39 53ZM46 48 24 10 18 14 37 53Z',C.silver)+e(38,44,5,5,C.gold)),
 'splitter:3':()=>p('M25 49Q14 27 23 9L42 39Q66 30 61 9L67 12Q74 42 47 51Z',C.silver)+p('M29 48Q5 47 11 68Q18 80 33 65L38 53Q53 79 66 68Q79 52 56 46L47 51 38 47Z',C.blue)+e(22,61,7,8,C.cream)+e(60,60,6,7,C.cream)+star(40,46,.68,C.gold)+e(40,46,7,7,C.gold)+e(40,46,3,3,C.wood),
 'chest:2':()=>utility('chest',2).replaceAll(`fill="${C.pink}"`,`fill="${C.red}"`)+p('M55 29Q47 9 61 12Q69 16 60 29Q78 14 76 30Q70 39 60 32Z',C.gold),
 'upgrade:2':()=>p('M30 7H50L52 17 62 13 73 30 65 38 74 47 64 64 53 60 50 73H30L27 60 15 65 6 48 14 39 6 29 18 13 28 18Z',C.blue)+e(40,40,24,24,'#749cb4')+wrench(37,40,.9,C.white)+p('m55 26-7 9h5v10h6V35h5Z',C.cream),
};
// Keep the dominant identity colors aligned between the two independently drawn styles.
const PALETTE={
 'tableware:6':{blue:'white'},'tableware:7':{white:'blue'},
 'preservation:2':{blue:'red'},'preservation:3':{blue:'green'},
 'bakeware:5':{silver:'cream'},'bakeware:6':{blue:'silver',wood:'silver',white:'silver'},'bakeware:7':{pink:'gold'},
 'seedbag:1':{cream:'green'},'seedbag:2':{cream:'gold'},'emptybag:2':{cream:'wood'},
 'pantry:4':{cream:'pink'},'pantry:5':{wood:'blue'},'pantry:6':{wood:'cream'},
 'lost:1':{dark:'gold'},'lost:2':{pink:'purple'},'lost:6':{wood:'wine'},
 'comfort:1':{blue:'gold'},'comfort:2':{pink:'purple'},'comfort:4':{blue:'pink'},'comfort:7':{cream:'dark',blue:'purple'},
 'snail:2':{wood:'gold'},'garden_guest:1':{pink:'orange'},'garden_guest:4':{blue:'purple'},'garden_guest:5':{cream:'blue'},
 'splitter:1':{red:'silver'},'chest:1':{pink:'cream',cream:'gold'},
 'charge:1':{blue:'green'},'charge:2':{blue:'cream',white:'green'},'charge:3':{blue:'darkGreen'},
 'gen_tools:1':{cream:'wood'},'gen_tools:2':{wood:'silver'},'gen_tools:8':{wood:'pink'},'gen_tools:11':{wood:'blue'},
 'gen_food:2':{wood:'pink'},'gen_food:4':{cream:'pink'},'gen_food:7':{cream:'pink'},'gen_food:9':{silver:'pink',cream:'pink'},
 'gen_produce:4':{gold:'cream'},'gen_produce:6':{green:'blue'},'gen_produce:7':{wood:'pink',gold:'pink'},'gen_produce:8':{pink:'cream',cream:'blue'},'gen_produce:9':{blue:'pink'},'gen_produce:10':{wood:'blue'},'gen_produce:12':{cream:'blue',blue:'cream'},
 'gen_drink:1':{wood:'blue'},'gen_drink:2':{silver:'blue'},'gen_drink:4':{wood:'blue'},'gen_drink:5':{blue:'cream'},'gen_drink:6':{pink:'blue'},'gen_drink:7':{blue:'cream'},'gen_drink:8':{cream:'blue'},
 'gen_herb:5':{wood:'cream'},'gen_herb:6':{wood:'blue'},'gen_herb:7':{blue:'cream',cream:'blue'},'gen_herb:9':{wood:'blue'},
 'gen_asian:2':{silver:'orange'},'gen_asian:4':{cream:'orange'},'gen_asian:5':{pink:'cream',cream:'orange'},'gen_asian:6':{silver:'orange'},'gen_asian:7':{silver:'cream'},
 'gen_mediterranean:1':{dark:'blue'},'gen_mediterranean:3':{silver:'blue'},'gen_mediterranean:4':{dark:'blue',silver:'dark'},'gen_mediterranean:5':{silver:'blue',wood:'orange'},'gen_mediterranean:6':{red:'blue',silver:'blue'},'gen_mediterranean:7':{silver:'blue',cream:'blue'},'gen_mediterranean:9':{silver:'blue',wood:'blue'},
 'gen_supply:1':{silver:'cream'},'gen_supply:3':{silver:'cream'},'gen_supply:4':{wood:'pink'},'gen_supply:5':{silver:'blue'},'gen_supply:6':{silver:'cream',blue:'cream'},'gen_supply:7':{wood:'pink',cream:'pink'},'gen_supply:9':{blue:'pink'},'gen_supply:11':{wood:'pink'},'gen_supply:12':{dark:'blue'},
 'gen_publicity:2':{wood:'pink'},
 'gen_flower:1':{silver:'pink'},'gen_flower:2':{silver:'pink'},'gen_flower:3':{blue:'cream'},'gen_flower:4':{blue:'pink'},'gen_flower:7':{blue:'cream'},'gen_flower:8':{wood:'pink'},
 'gen_recycle:3':{wood:'blue'},'gen_recycle:5':{cream:'blue'},'gen_recycle:6':{wood:'blue',green:'blue',silver:'cream'},'gen_recycle:7':{green:'cream'}
};
function identityPalette(id,body){const colors=PALETTE[id];if(!colors)return body;const map=Object.fromEntries(Object.entries(colors).map(([a,b])=>[C[a],C[b]]));return body.replace(/(fill|stroke)="(#[a-f\d]+)"/g,(all,attr,color)=>map[color]?`${attr}="${map[color]}"`:all);}
const classicCache=new Map();
export const CLASSIC_ALIASES=Object.freeze({
 'legacy_energy:1':'energy:1','legacy_energy:2':'energy:2','legacy_energy:3':'energy:3','legacy_energy:4':'energy:5',
 'legacy_coins:1':'coins:1','legacy_coins:2':'coins:2','legacy_coins:3':'coins:4','legacy_coins:4':'coins:6',
 'legacy_chest:1':'chest:1','legacy_chest:2':'chest:2','legacy_chest:3':'chest:3'
});
export function chainClassicMarkup(id,{fit=true}={}){
 if(CLASSIC_ALIASES[id]){const target=CLASSIC_ALIASES[id];return chainClassicMarkup(target,{fit}).replace(`data-classic-item="${target}"`,`data-classic-item="${id}" data-classic-alias="${target}"`);}
 const [family,rawLevel]=String(id).split(':'),level=Number(rawLevel),fn=DRAW[family];
 if(!fn||!Number.isInteger(level)||level<1||(CLASSIC_LEVELS[family]&&level>CLASSIC_LEVELS[family]))return null;
 if(!classicCache.has(id))classicCache.set(id,REFINED[id]?REFINED[id]():identityPalette(id,fn(level)));
 const body=classicCache.get(id);if(!body)return null;const box=fit&&CLASSIC_LAYOUT[id];
 const subject=box?`<ellipse cx="${box.contact[0]}" cy="74" rx="${box.contact[1]}" ry="2.6" fill="#876b51" opacity=".13" stroke="none"/><g transform="translate(${box.x} ${box.y}) scale(${box.scale})">${body}</g>`:body;
 return `<g data-classic-item="${id}" stroke-linecap="round" stroke-linejoin="round">${subject}</g>`;
}
export const CLASSIC_REFRESH_FAMILIES=Object.freeze(Object.keys(DRAW));
