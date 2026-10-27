import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FARM_DELIGHT_LIMITS,delightCount,delightPoint,delightFlight,delightPhase,delightAnimalActivity,createDelightBudget,mountFarmDelight} from '../farm-delight.mjs';

test('representative count bounds hostile and bulk counts',()=>{
 for(const n of [-100,0,1,4,7.2,1e9,NaN,Infinity]){assert.ok(delightCount(n)>=1);assert.ok(delightCount(n)<=8);assert.equal(delightCount(n,true),1);}
 assert.equal(delightCount(7.2),8);
});
test('local points use client rectangles, clamp outside sources and remain finite',()=>{
 const b={left:20,top:30,width:320,height:400};
 assert.deepEqual(delightPoint({left:100,top:200,width:40,height:50},b),{x:100,y:195});
 assert.deepEqual(delightPoint({left:-100,top:900,width:0,height:0},b),{x:14,y:386});
 assert.deepEqual(delightPoint({left:NaN,top:Infinity},b),{x:14,y:14});
});
test('flight has exact endpoints, bounded opacity and scale without random timing',()=>{
 const a={x:10,y:20},b={x:300,y:80};
 assert.equal(delightFlight(a,b,0).x,a.x);assert.equal(delightFlight(a,b,1).x,b.x);
 assert.ok(Math.abs(delightFlight(a,b,1).y-b.y)<1e-8);
 for(let t=0;t<=1;t+=.01){const p=delightFlight(a,b,t);assert.ok(p.opacity>=0&&p.opacity<=1);assert.ok(p.scale>=.75&&p.scale<=1.1);}
 assert.ok(delightFlight(a,b,.5).y<50);
});
test('stable phase is per identity; walk segments bounded and suppressed in reduced mode',()=>{
 assert.equal(delightPhase('cow-1'),delightPhase('cow-1'));assert.notEqual(delightPhase('cow-1'),delightPhase('cow-2'));
 let walking=0;for(let t=0;t<11000;t+=10)walking+=Number(delightAnimalActivity('cow-1',t).walking);
 assert.equal(walking,200);
 for(const options of [{reducedMotion:true},{eligible:false}])assert.equal(delightAnimalActivity('cow-1',1000,options).walking,false);
});
test('budget evicts FIFO once and TTL sweep and destroy dispose all',()=>{
 const b=createDelightBudget(3),removed=[];
 for(let i=0;i<100;i++)b.add({until:i+100,dispose:()=>removed.push(i)});
 assert.equal(b.size,3);assert.equal(removed.length,97);b.sweep(198);assert.equal(b.size,1);b.clear();b.clear();
 assert.equal(b.size,0);assert.equal(new Set(removed).size,100);
});
// Lightweight deterministic DOM harness: exercises lifecycle contracts, not visual/browser QA.
function harness(){
 let now=0,id=0;const frames=new Map(),docEvents=new Map(),mediaEvents=new Map();
 const media={matches:false,addEventListener:(k,f)=>mediaEvents.set(k,f),removeEventListener:k=>mediaEvents.delete(k)};
 const win={matchMedia:()=>media,performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i)};
 const doc={hidden:false,defaultView:win,addEventListener:(k,f)=>docEvents.set(k,f),removeEventListener:k=>docEvents.delete(k),createElement:tag=>new Element(tag)};
 class Element {
  constructor(tag){this.tag=tag;this.ownerDocument=doc;this.dataset={};this.children=[];this.attrs={};this.style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};this.classList={add:()=>{}};}
  setAttribute(k,v){this.attrs[k]=v;}append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
  querySelector(s){return s==='.farm-viewport'?this.view:null;}querySelectorAll(){return [];}
  getBoundingClientRect(){return {left:0,top:0,width:390,height:760,right:390,bottom:760};}
 }
 const root=new Element('section');root.view=new Element('div');root.append(root.view);
 return {root,doc,media,frames,docEvents,mediaEvents,advance(ms){now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(now));},setTime(ms){now=ms;},visibility(hidden){doc.hidden=hidden;docEvents.get('visibilitychange')?.();},motion(matches){media.matches=matches;mediaEvents.get('change')?.();}};
}
test('rapid actions cap nodes globally; one RAF only; TTL drains everything',()=>{
 const h=harness(),fx=mountFarmDelight(h.root);
 assert.equal(h.frames.size,0);
 for(let i=0;i<100;i++){h.setTime(i*100);fx.play('harvest',{count:100,targetElement:h.root,itemId:'wheat'});assert.ok(fx.activeCount<=32);assert.equal(h.frames.size,1);}
 assert.equal(fx.activeCount,FARM_DELIGHT_LIMITS.total);h.advance(1600);assert.equal(fx.activeCount,0);assert.equal(h.frames.size,0);fx.destroy();
});
test('same-frame duplicate action is suppressed without queue growth',()=>{
 const h=harness(),fx=mountFarmDelight(h.root);assert.equal(fx.play('plant'),4);assert.equal(fx.play('plant'),0);assert.equal(fx.activeCount,4);fx.destroy();
});
test('background and manual pause clear transient feedback and stop scheduling',()=>{
 const h=harness(),fx=mountFarmDelight(h.root);fx.play('upgrade');h.visibility(true);assert.equal(fx.activeCount,0);assert.equal(h.frames.size,0);assert.equal(fx.play('feed'),0);
 h.visibility(false);h.advance(100);assert.equal(fx.play('feed'),4);fx.pause();assert.equal(fx.activeCount,0);assert.equal(fx.play('harvest'),0);fx.pause(false);assert.equal(h.root.dataset.delightPaused,'false');fx.destroy();
});
test('user and system reduced motion each yield one static short confirmation',()=>{
 const h=harness(),fx=mountFarmDelight(h.root);fx.play('upgrade');h.motion(true);assert.equal(fx.activeCount,0);
 assert.equal(fx.play('harvest',{count:500}),1);const layer=h.root.children.find(n=>n.className==='farm-delight-layer');assert.ok(layer.children[0].className.includes('is-still'));assert.equal(layer.children[0].textContent,'已收获');
 h.advance(1000);assert.equal(fx.activeCount,0);h.motion(false);fx.setReducedMotion(true);assert.equal(fx.play('feed'),1);fx.destroy();
});
test('disabled and destroyed instances are inert, cleanup removes listeners and nodes',()=>{
 const h=harness(),fx=mountFarmDelight(h.root,{enabled:false});assert.equal(fx.play('plant'),0);fx.setEnabled(true);assert.equal(fx.play('plant'),4);
 fx.destroy();fx.destroy();assert.equal(h.root.children.length,1);assert.equal(h.root.view.children.length,0);assert.equal(h.docEvents.size,0);assert.equal(h.mediaEvents.size,0);assert.equal(h.frames.size,0);assert.equal(fx.play('feed'),0);
});
test('style uses pointer-transparent layers and individual translate preserving animal mirror',()=>{
 const css=readFileSync(new URL('../farm-delight.css',import.meta.url),'utf8');assert.match(css,/pointer-events:none!important/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const keyframes=css.match(/@keyframes farm-delight-animal\{[^\n]+/)[0];assert.match(keyframes,/translate:/);assert.doesNotMatch(keyframes,/transform:/);
 assert.match(css,/farm-animal-preview\{overflow:hidden/);assert.match(css,/animation-play-state:paused!important/);
});
test('without any stylesheet decorative layers stay out of flex flow and cannot intercept input',()=>{
 const h=harness(),fx=mountFarmDelight(h.root);
 const layer=h.root.children.find(n=>n.className==='farm-delight-layer'),ambient=h.root.view.children[0];
 for(const el of [layer,ambient]){assert.equal(el.style.position,'absolute');assert.equal(el.style.inset,'0');assert.equal(el.style.overflow,'hidden');assert.equal(el.style['pointer-events'],'none');}
 fx.play('harvest',{sourceElements:[h.root,h.root,h.root],targetElement:h.root,itemId:'wheat',count:3});
 assert.equal(layer.children.length,4);
 const images=[];
 for(const particle of layer.children){assert.equal(particle.style.position,'absolute');assert.equal(particle.style['pointer-events'],'none');assert.equal(particle.style.width,'26px');assert.equal(particle.style.height,'26px');images.push(...particle.children);}
 assert.equal(images.length,2);
 for(const img of images){assert.equal(img.style.position,'absolute');assert.equal(img.style.width,'30px');assert.equal(img.style.height,'30px');assert.equal(img.style['max-width'],'30px');assert.equal(img.style['pointer-events'],'none');}
 for(const mote of ambient.children){assert.equal(mote.style.position,'absolute');assert.equal(mote.style['pointer-events'],'none');}
 h.advance(1600);assert.equal(layer.children.length,0);fx.destroy();
});
test('stylesheet-free reduced feedback remains bounded and outside layout',()=>{
 const h=harness(),fx=mountFarmDelight(h.root,{reducedMotion:true});fx.play('harvest');
 const layer=h.root.children.find(n=>n.className==='farm-delight-layer'),particle=layer.children[0];
 assert.equal(particle.style.position,'absolute');assert.equal(particle.style.width,'112px');assert.equal(particle.style.height,'28px');assert.equal(particle.style['pointer-events'],'none');fx.destroy();
});
test('world idle candidates read geometry before animation writes, preserving DOM order and per-kind caps',()=>{
 const h=harness(),events=[],nodes=[];
 for(const [kind,count]of [['animal',14],['crop',8],['tree',6],['machine',6],['ready',6]])for(let i=0;i<count;i++){
 const el=h.doc.createElement('div'),id=`${kind}-${i}`;el.dataset={entity:id,fwMotion:kind,fwReady:'false'};el.closest=()=>null;
 el.getBoundingClientRect=()=>{events.push('read:'+id);return {left:0,top:0,right:20,bottom:20,width:20,height:20}};
 el.style.setProperty=(k,v)=>{events.push('write:'+id);el.style[k]=v};nodes.push(el);
 }
 h.root.querySelectorAll=s=>s==='.fw-map'?[h.root.view]:[];h.root.view.closest=()=>null;h.root.view.querySelectorAll=()=>nodes;
 const fx=mountFarmDelight(h.root);events.length=0;fx.refresh();
 // Reset phases to force the write branch on a new mounted controller.
 fx.destroy();for(const n of nodes)delete n.dataset.delightIdle;events.length=0;
 const next=mountFarmDelight(h.root);const first=events.findIndex(e=>e.startsWith('write')),last=events.map(e=>e.startsWith('read')).lastIndexOf(true);
 assert(first>=0);assert(last<first);
 const active=nodes.filter(n=>n.dataset.delightIdle);assert(active.length<=FARM_DELIGHT_LIMITS.idle);
 let remaining=FARM_DELIGHT_LIMITS.idle;
 for(const [kind,cap]of [['animal',12],['crop',6],['tree',4],['machine',4],['ready',4]]){const selected=active.filter(n=>n.dataset.fwMotion===kind);assert.equal(selected.length,Math.min(cap,remaining));remaining-=selected.length;assert.deepEqual(selected.map(n=>n.dataset.entity),Array.from({length:selected.length},(_,i)=>`${kind}-${i}`));}
 next.destroy();
});
test('distinct committed cells get immediate bounded feedback even in one frame; clear stops all',()=>{
 const h=harness(),fx=mountFarmDelight(h.root),source={left:100,top:100,width:30,height:20};
 for(let i=0;i<50;i++){assert.equal(fx.play('harvest',{sourceElements:[source],targetElement:h.root,itemId:'wheat',crop:true,committed:true}),4);assert.ok(fx.activeCount<=32);assert.equal(h.frames.size,1);}
 fx.clear();assert.equal(fx.activeCount,0);assert.equal(h.frames.size,0);fx.destroy();
});
test('committed sow and harvest respect reduced motion without any animated flight',()=>{
 const h=harness(),fx=mountFarmDelight(h.root,{reducedMotion:true});
 assert.equal(fx.play('plant',{crop:true,committed:true}),1);assert.equal(fx.play('plant',{crop:true,committed:true}),1);
 assert.equal(fx.activeCount,2);for(const node of h.root.children.find(n=>n.className==='farm-delight-layer').children)assert.match(node.className,/is-still/);
 fx.destroy();
});
test('workshop atlases stay bounded, advance at asset cadence and disappear once',()=>{
 const h=harness(),fx=mountFarmDelight(h.root),point={x:180,y:300};
 assert.equal(fx.playTerrain('clear-dust',point),1);assert.equal(fx.activeCount,1);
 const layer=h.root.children.find(n=>n.className==='farm-delight-layer'),node=layer.children[0];
 assert.equal(node.style['background-position'],'-2px -2px');
 h.advance(0);h.advance(84);assert.equal(node.style.backgroundPosition,'-134px -2px');
 h.advance(250);assert.equal(node.style.backgroundPosition,'-2px -102px');
 h.advance(333);assert.equal(fx.activeCount,0);assert.equal(layer.children.length,0);
 for(let i=0;i<40;i++)fx.playTerrain('stone-chips',point);assert.equal(fx.activeCount,32);assert.equal(h.frames.size,1);
 fx.clear();assert.equal(fx.activeCount,0);assert.equal(h.frames.size,0);fx.destroy();
});
test('terrain effects require visible real source, respect reduced motion, pause and destroy',()=>{
 const h=harness(),fx=mountFarmDelight(h.root);
 assert.equal(fx.playTerrain('land-open',null),0);assert.equal(fx.playTerrain('land-open',{x:-1,y:300}),0);assert.equal(fx.playTerrain('unknown',{x:100,y:100}),0);
 fx.setReducedMotion(true);assert.equal(fx.playTerrain('land-open',{x:100,y:100}),0);fx.setReducedMotion(false);
 assert.equal(fx.playTerrain('land-open',{x:100,y:100}),1);h.visibility(true);assert.equal(fx.activeCount,0);assert.equal(h.frames.size,0);
 assert.equal(fx.playTerrain('land-open',{x:100,y:100}),0);h.visibility(false);fx.destroy();assert.equal(fx.playTerrain('land-open',{x:100,y:100}),0);
});

test('atlas playback starts on its first paint opportunity after a slow synchronous commit, with absolute TTL',()=>{
 const h=harness(),fx=mountFarmDelight(h.root);fx.playTerrain('wood-chips',{x:100,y:100});h.advance(800);assert.equal(fx.activeCount,1);
 h.advance(84);const layer=h.root.children.find(n=>n.className==='farm-delight-layer');assert.equal(layer.children[0].style.backgroundPosition,'-134px -2px');
 h.advance(617);assert.equal(fx.activeCount,0);fx.destroy();
});
test('atlas first RAF delayed 900ms retains visible progression but a delay beyond absolute TTL cannot replay',()=>{
 const h=harness(),fx=mountFarmDelight(h.root);fx.playTerrain('stone-chips',{x:100,y:100});h.advance(900);
 const layer=h.root.children.find(n=>n.className==='farm-delight-layer');
 for(let i=1;i<=6;i++){h.advance(84);assert.equal(fx.activeCount,1);assert.equal(layer.children[0].style.backgroundPosition,`-${2+i%4*132}px -${2+Math.floor(i/4)*100}px`);}
 h.advance(97);assert.equal(fx.activeCount,0);
 fx.playTerrain('land-open',{x:100,y:100});h.advance(1501);assert.equal(fx.activeCount,0);assert.equal(h.frames.size,0);fx.destroy();
});
