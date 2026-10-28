import {movingMarkup,decorTiming} from './motion.mjs';
import {roadPathsMarkup} from './reused/terrain-components.mjs';
const NS='http://www.w3.org/2000/svg',$=s=>document.querySelector(s),make=(tag,attrs,parent)=>{const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);parent?.append(el);return el;};
const defs=[['duck','奶油鸭','轻快地交替迈步'],['rabbit','棉尾兔','收腿、蹬地、落地的小跳'],['goat','花斑山羊','短腿慢悠悠地迈步'],['alpaca','云朵羊驼','长脖子与软软的绒毛'],['deer','斑点小鹿','安静的小步行走'],['fox','蜜桃狐狸','蓬松尾巴跟着步子轻动']];
const decors=[['watermill','溪畔水车小屋','转轮慢慢转 · 9 秒'],['gazebo','花藤凉亭','彩旗轻轻摆 · 3.6 秒'],['lily-fountain','睡莲喷泉','水流与涟漪 · 1.8 秒'],['apiary','蜂蜜小屋','蜜蜂绕巢飞 · 5.2 秒']];
const animalViews=[],decorViews=[];let active='scene';
const cross=(x,y)=>`<path class="anchor-mark" d="M${x-9} ${y}h18 M${x} ${y-9}v18"/>`;
function animal(parent,id){const g=make('g',{},parent);make('image',{href:`animals/${id}/shadow.png`,width:360,height:280,class:'ground-shadow'},g);const frame=make('image',{href:`animals/${id}/frames/00.png`,width:360,height:280},g);const marks=make('g',{},g);marks.innerHTML=cross(180,230);animalViews.push({id,frame,panel:parent.closest?.('section')?.id,last:-1});return g;}
function decor(parent,id){const g=make('g',{},parent);make('image',{href:`decor/${id}/layers/00-shadow.png`,width:640,height:640,class:'ground-shadow'},g);make('image',{href:`decor/${id}/layers/01-base.png`,width:640,height:640},g);const moving=make('g',{},g);const marks=make('g',{},g);marks.innerHTML=cross(320,470);decorViews.push({id,moving,panel:parent.closest?.('section')?.id});return g;}
for(const[id,name,desc]of defs){const article=document.createElement('article');article.className='card';article.innerHTML=`<svg class="artboard" viewBox="0 0 360 280" aria-label="${name}动作预览"></svg><div class="card-info"><h3>${name}</h3><p>${desc}</p><a href="animals/${id}/previews/contact-sheet.png" target="_blank" rel="noopener">查看 12 帧联系图 ↗</a></div>`;$('#animal-cards').append(article);animal(article.querySelector('svg'),id);}
for(const[id,name,desc]of decors){const article=document.createElement('article');article.className='card';article.innerHTML=`<svg class="artboard" viewBox="0 0 640 640" aria-label="${name}动态预览"></svg><div class="card-info"><h3>${name}</h3><p>${desc}</p><a href="decor/${id}/sources/editable.svg" target="_blank" rel="noopener">查看分层源文件 ↗</a></div>`;$('#decor-cards').append(article);decor(article.querySelector('svg'),id);}
const scene=$('#scene');make('rect',{width:1200,height:760,fill:'#c9dfaa'},scene);
make('path',{d:'M80 250Q250 50 600 95T1110 300Q1230 590 920 715T130 635Q20 470 80 250Z',fill:'#d0e4b1'},scene);
let seed=419;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<90;i++){const x=50+random()*1100,y=100+random()*630;make('image',{href:'reused/grass.svg',x,y,width:20+random()*16,height:18,opacity:.55},scene);}
const roads=make('g',{},scene);roads.innerHTML=roadPathsMarkup(['M-6 5H13','M4 -6V13','M-2 1V5','M8 1V5','M4 9H9'],{unit:38,origin:[600,290]});
// This demonstration pond is adapted from the already-approved scene's code-native ground.
make('path',{d:'M455 340Q510 305 582 345Q615 380 576 408Q518 430 477 401Q442 379 455 340Z',fill:'#e8dcad',stroke:'#bbbd8e','stroke-width':3},scene);
make('path',{d:'M464 348Q511 317 574 352Q602 379 569 398Q519 418 484 394Q454 375 464 348Z',fill:'#a5d9d3'},scene);
make('path',{d:'M491 363q20 -7 40 0 M532 389h22',fill:'none',stroke:'#e8f2dd','stroke-width':4,'stroke-linecap':'round'},scene);
const entities=[];const add=(el,depth)=>entities.push({el,depth});
for(const[x,y,s]of [[145,220,.9],[245,165,.72],[1010,245,1],[1070,530,.85],[140,530,.72],[970,660,.6]]){const g=make('g',{});make('image',{href:'reused/tree.svg',x:x-80*s,y:y-180*s,width:160*s,height:200*s},g);add(g,y);}
for(const[x,y]of [[220,270],[1000,360],[1040,610],[150,660],[360,700],[870,720],[610,220]]){const g=make('g',{});make('image',{href:'reused/bush.svg',x:x-50,y:y-45,width:100,height:65},g);add(g,y);}
for(const[x,y]of [[560,292],[660,340],[230,615],[980,560]]){const g=make('g',{});make('image',{href:'reused/flower-bed.png',x:x-55,y:y-60,width:110,height:85},g);add(g,y);}
for(const[id,x,y,scale]of [['watermill',400,315,.54],['apiary',820,315,.5],['gazebo',380,580,.55],['lily-fountain',835,585,.48]]){const g=make('g',{transform:`translate(${x-320*scale} ${y-470*scale}) scale(${scale})`});decor(g,id);add(g,y);}
const walkers=[];for(const[id,x,y,scale]of [['duck',620,430,.49],['rabbit',560,570,.49],['goat',240,400,.5],['alpaca',1000,450,.5],['deer',655,690,.5],['fox',170,605,.48]]){const wrapper=make('g',{}),g=animal(wrapper,id);walkers.push({id,wrapper,g,x,y,scale});add(wrapper,y);}
entities.sort((a,b)=>a.depth-b.depth).forEach(({el})=>scene.append(el));
let running=!matchMedia('(prefers-reduced-motion: reduce)').matches,time=0,previous=performance.now(),manual=null;
const decorOffsets=Object.fromEntries(decors.map(([id])=>[id,0]));
const setRunning=value=>{running=value;$('#play').textContent=running?'暂停动态':'播放动态';$('#play').setAttribute('aria-pressed',String(!running));};setRunning(running);
$('#play').onclick=()=>{if(manual!==null){for(const[id]of decors)decorOffsets[id]=manual*decorTiming[id]-time;manual=null;}setRunning(!running);};
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{active=button.dataset.tab;for(const b of document.querySelectorAll('[data-tab]')){const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}for(const name of ['scene','animals','decor'])$(`#${name}-panel`).hidden=name!==active;render();};
$('#phase').oninput=()=>{setRunning(false);manual=Number($('#phase').value)/1000;time=manual*1000;render();};
$('#anchors').onchange=e=>document.body.classList.toggle('show-anchors',e.target.checked);$('#shadows').onchange=e=>document.body.classList.toggle('no-shadows',!e.target.checked);$('#dark').onchange=e=>document.body.classList.toggle('dark',e.target.checked);
function render(){const frame=Math.floor((time%1000)/1000*12);$('#phase-label').textContent=`${String(frame+1).padStart(2,'0')} / 12`;if(running)$('#phase').value=Math.floor(time%1000);
 for(const a of animalViews){if(!a.frame.closest('section')?.hidden&&a.last!==frame){a.frame.setAttribute('href',`animals/${a.id}/frames/${String(frame).padStart(2,'0')}.png`);a.last=frame;}}
 for(const d of decorViews){if(d.moving.closest('section')?.hidden)continue;const phase=manual??((time+decorOffsets[d.id])%decorTiming[d.id])/decorTiming[d.id];d.moving.innerHTML=movingMarkup(d.id,phase,{wheel:'decor/watermill/sources/wheel-local.png',bee:'decor/apiary/sources/bee-local.png'});}
 for(let i=0;i<walkers.length;i++){const w=walkers[i],phase=((time/6000+i*.13)%1),u=phase<.5?phase*2:(1-phase)*2,dx=-u*44,dy=u*22;w.wrapper.setAttribute('transform',`translate(${w.x+dx} ${w.y+dy}) scale(${w.scale})`);w.g.setAttribute('transform',phase<.5?'translate(-180 -230)':'translate(180 -230) scale(-1 1)');}
}
function tick(now){if(running&&!document.hidden){time+=Math.min(now-previous,100);render();}previous=now;requestAnimationFrame(tick);}render();
// Preload every frame so first-loop decoding cannot flash an empty sprite.
await Promise.all(defs.flatMap(([id])=>Array.from({length:12},(_,i)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error(`Cannot load ${id} frame ${i}`));image.src=`animals/${id}/frames/${String(i).padStart(2,'0')}.png`;}))));previous=performance.now();requestAnimationFrame(tick);
