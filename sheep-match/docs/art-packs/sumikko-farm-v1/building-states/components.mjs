/** Small warm-paper badges, composited above existing buildings. No baked-in numeric progress. */
export const BUILDING_STATES=Object.freeze([
 {id:'constructing',label:'施工中',kind:'status',meaning:'木锤与木板'},
 {id:'processing',label:'加工中',kind:'status',meaning:'沙漏'},
 {id:'complete',label:'已完工',kind:'status',meaning:'叶绿对勾'},
 {id:'full',label:'仓位已满',kind:'status',meaning:'装满的货箱'},
 {id:'mastery-0',label:'熟练度·初识',kind:'mastery',level:0,meaning:'一粒种子'},
 {id:'mastery-1',label:'熟练度·上手',kind:'mastery',level:1,meaning:'两片嫩芽'},
 {id:'mastery-2',label:'熟练度·熟练',kind:'mastery',level:2,meaning:'四叶小枝'},
 {id:'mastery-3',label:'熟练度·精通',kind:'mastery',level:3,meaning:'绽放小花'},
].map(d=>Object.freeze({...d,path:`svg/${d.id}.svg`,legacyPath:`buildings/states/${d.id}.svg`,width:64,height:76,anchor:[32,72],minDisplaySize:24})));
const path=(d,fill='none',stroke='#af9976',width=2.2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const leaf=(x,y,flip=1)=>`<g transform="translate(${x} ${y}) scale(${flip} 1)">`+path('M0 0Q-14 1 -12 -10Q0 -11 0 0Z','#b8d38e','#98b37e',1.5)+'</g>';
export function buildingStateSvg(id){
 const definition=BUILDING_STATES.find(a=>a.id===id);if(!definition)throw new RangeError('Unknown building state');
 let icon='';
 if(id==='constructing')icon=path('M22 41L40 23','#e6c28e','#ad9776',6)+path('M26 21l7 -7 15 14 -7 7Z','#b7c8b3','#96ac9b',2)+path('M20 43h23v8H20Z','#edcda0','#b49b76',1.8);
 else if(id==='processing')icon=path('M22 19H42M22 48H42','none','#b69e78',3)+path('M24 20v6q0 4 8 8q8 -4 8 -8v-6M24 47v-7q0 -3 8 -7q8 4 8 7v7','#deeee0','#9fb6a0',1.8)+path('M26 42l6 -5 6 5v4H26Z','#e7c788','none',0)+path('M27 25h10l-5 5Z','#e7c788','none',0);
 else if(id==='complete')icon=path('M18 33l10 10 19 -21','none','#8eae75',6)+path('M19 31l9 9 17 -19','none','#c3db9b',2.2);
 else if(id==='full')icon=path('M17 27L32 20L47 27V46L32 53L17 46Z','#e8c394','#b79a77',2)+path('M17 27l15 8 15 -8M32 35v18','none','#b79a77',1.7)+path('M21 25v-8h11v10M34 27v-9h9v8','#f4dda9','#b79a77',1.7)+path('M28 22h4','none','#c0a981',1.2);
 else if(id==='mastery-0')icon=path('M25 41C15 28 30 19 39 26C49 35 34 50 25 41Z','#e3c48f','#b9a37b',2)+path('M28 38q2 -7 8 -10','none','#f6e7bf',2.3);
 else {
  icon=path('M32 49V28','none','#9cb27d',2.6)+leaf(32,35)+leaf(32,31,-1);
  if(id!=='mastery-1')icon+=leaf(32,44)+leaf(32,40,-1);
  if(id==='mastery-3'){icon+=Array.from({length:5},(_,i)=>`<ellipse cx="${32+Math.sin(i*Math.PI*2/5)*7}" cy="${22+Math.cos(i*Math.PI*2/5)*7}" rx="5" ry="6" fill="#f3c4ae" stroke="#c4a28a" stroke-width="1.2"/>`).join('')+'<circle cx="32" cy="22" r="4" fill="#ebd092"/>';}
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="76" viewBox="0 0 64 76" fill="none" stroke-linecap="round" stroke-linejoin="round">`+path('M15 6H49Q59 6 59 16V48Q59 59 48 59H39L32 72L25 59H16Q5 59 5 48V17Q5 6 15 6Z','#fff7df','#ccbd9a',2)+path('M16 11H47','none','#fffdf0',2)+icon+'</svg>';
}
export function buildingBadgeMarkup(id,{x,y,size=48}={}){
 if(![x,y,size].every(Number.isFinite)||size<=0)throw new RangeError('Badge position and positive size required');
 const svg=buildingStateSvg(id),body=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>')),scale=size/64;
 return `<svg x="${x-32*scale}" y="${y-72*scale}" width="${size}" height="${76*scale}" viewBox="0 0 64 76" fill="none" stroke-linecap="round" stroke-linejoin="round" pointer-events="none">${body}</svg>`;
}
