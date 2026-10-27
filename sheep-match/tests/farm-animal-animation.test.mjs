import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ANIMAL_ANIMATION_METADATA,animalAnimationPhase,animalAnimationSample,resolveAnimalAnimationFrame,createAnimalAnimationController} from '../farm-animal-animation.mjs';
import {resolveShelterAnimal} from '../farm-runtime-shelters.mjs';
import {runtimeArtHit} from '../farm-runtime-art.mjs';
const base=new URL('../',import.meta.url);
function fixture(number=1){
 let pending=null,paused=false,reduced=false,hidden=false,cancelled=0;
 const animals=Array.from({length:number},(_,i)=>({id:`bird-${i}`,configId:'chicken',status:'producing'}));
 const bounds={left:0,top:0,right:360,bottom:280,width:360,height:280};
 const nodes=animals.map(a=>{const image={href:'',getAttribute(){return this.href;},setAttribute(_,v){this.href=v;}};return {dataset:{animal:a.id,shelter:'pen'},image,bounds:{...bounds},querySelector:()=>image,getBoundingClientRect(){return this.bounds;}};});
 const doc={get hidden(){return hidden;},defaultView:{innerWidth:1000,innerHeight:1000}};
 const root={ownerDocument:doc,closest:()=>null,querySelectorAll:()=>nodes,getBoundingClientRect:()=>bounds};
 const c=createAnimalAnimationController({root,getAnimal:id=>({animal:animals.find(a=>a.id===id),shelter:{configId:'chicken'}}),getStaticArt:resolveShelterAnimal,isPaused:()=>paused,isReduced:()=>reduced,matchMedia:()=>({matches:false}),Image:null,requestFrame:fn=>(pending=fn,1),cancelFrame:()=>{pending=null;cancelled++;}});
 return {c,nodes,animals,tick:t=>{const fn=pending;pending=null;fn?.(t);},pause:v=>paused=v,reduce:v=>reduced=v,hide:v=>hidden=v,get cancelled(){return cancelled;}};
}
test('runtime has 24 registered full-canvas frames and frame-specific alpha; no editable files',()=>{
 assert.equal(Object.keys(ANIMAL_ANIMATION_METADATA).length,24);
 for(const [key,a] of Object.entries(ANIMAL_ANIMATION_METADATA)){
  assert.equal(a.width,360);assert.equal(a.height,280);assert.deepEqual(a.anchor,[.5,230/280]);assert.deepEqual(a.bounds,[0,0,360,280]);
  assert.equal(a.mask.rows.length,64);assert.ok(existsSync(new URL(a.path,base)));assert.match(a.path,/assets\/farm-runtime\/.*\.png$/);
  const png=readFileSync(new URL(a.path,base));assert.equal(png.readUInt32BE(16),360);assert.equal(png.readUInt32BE(20),280);
  const [action,frame]=key.split('/');const art=resolveAnimalAnimationFrame(action,Number(frame));assert.equal(runtimeArtHit(art,0,0),false);assert.equal(art.fullCanvas,true);assert.equal(art.shelterLayered,true);
 }
 assert.notDeepEqual(resolveAnimalAnimationFrame('eat',0).mask,resolveAnimalAnimationFrame('eat',5).mask);
 assert.equal(resolveAnimalAnimationFrame('eat',12),null);
});
test('12 fps samples distinct frames, one-shot ends at one second, phase stable',()=>{
 for(let i=0;i<12;i++)assert.deepEqual(animalAnimationSample({id:'a',status:'producing',elapsed:i*1000/12+.001,eatStarted:0}),{action:'eat',frame:i});
 assert.equal(animalAnimationSample({id:'a',status:'producing',elapsed:1000,eatStarted:0}),null);
 assert.equal(animalAnimationPhase('bird-0'),animalAnimationPhase('bird-0'));assert.notEqual(animalAnimationPhase('bird-0'),animalAnimationPhase('bird-1'));
});
test('independent RAF changes live PNG + alpha between 250ms host renders and survives sync',()=>{
 const f=fixture();const before=JSON.stringify(f.animals);f.c.sync();f.c.playEat(['bird-0']);f.tick(0);
 const zero=f.c.getArt('bird-0');assert.equal(zero.frame,0);f.tick(84);assert.equal(f.c.getArt('bird-0').frame,1);assert.notEqual(f.nodes[0].image.href,zero.src);
 f.c.sync();assert.equal(f.c.getArt('bird-0').frame,1);f.tick(168);assert.equal(f.c.getArt('bird-0').frame,2);
 for(let t=252;t<=1092;t+=84)f.tick(t);
 assert.equal(f.c.getArt('bird-0',null),null);assert.equal(f.nodes[0].image.href,resolveShelterAnimal(f.animals[0]).src);assert.equal(JSON.stringify(f.animals),before);f.c.destroy();assert.equal(f.cancelled,0);
});
test('pause/reduced/hidden restores static, resumes without catch-up, destruction restores and cancels',()=>{
 const f=fixture();f.c.sync();f.c.playEat(['bird-0']);f.tick(0);f.tick(84);
 f.pause(true);f.tick(168);assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);assert.equal(f.c.getArt('bird-0',null),null);
 f.tick(10000);f.pause(false);f.c.sync();f.tick(10084);assert.equal(f.c.getArt('bird-0').frame,1);
 f.reduce(true);f.c.sync();assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);f.reduce(false);f.hide(true);f.c.sync();assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);
 f.hide(false);f.c.sync();f.c.destroy();assert.equal(f.nodes[0].image.href,resolveShelterAnimal(f.animals[0]).src);assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);f.c.destroy();assert.equal(f.cancelled,1);
});
test('bounded visible animation; offscreen feed does not replay late; unsupported species static',()=>{
 const f=fixture(16);f.animals[15].configId='cow';f.c.sync();f.c.playEat(f.animals.map(a=>a.id));
 assert.equal(f.nodes.filter(n=>n.dataset.fwFrameRunning).length,12);
 f.nodes[0].bounds={left:2000,top:0,right:2360,bottom:280,width:360,height:280};f.c.sync();assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);
 f.nodes[0].bounds={left:0,top:0,right:360,bottom:280,width:360,height:280};f.c.sync();assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);assert.equal(f.nodes[15].dataset.fwFrameRunning,undefined);f.c.destroy();
});
test('asset failures preserve state PNG instead of blank animation',()=>{
 class FailedImage{set src(v){this.onerror();}}
 const animal={id:'chicken',configId:'chicken',status:'producing'},image={getAttribute:()=>'',setAttribute(_,v){this.src=v;}},el={dataset:{animal:'chicken',shelter:'pen'},querySelector:()=>image};
 const c=createAnimalAnimationController({root:{querySelectorAll:()=>[el]},getAnimal:()=>({animal,shelter:{}}),getStaticArt:resolveShelterAnimal,Image:FailedImage});c.sync();c.playEat(['chicken']);assert.equal(image.src,resolveShelterAnimal(animal).src);assert.equal(c.getArt('chicken',null),null);c.destroy();
});

test('60-animal stress: max 12 animated, 12fps paints, visibility reads throttled, idle stops',()=>{
 const f=fixture(60);let reads=0,writes=0;
 for(const n of f.nodes){n.getBoundingClientRect=()=>{reads++;return n.bounds;};const original=n.image.setAttribute;n.image.setAttribute=function(...args){writes++;original.apply(this,args);};}
 f.c.sync();assert.equal(reads,60);f.c.playEat(f.animals.map(a=>a.id));f.tick(0);const initial=writes;
 for(let t=16;t<1000;t+=16)f.tick(t);
 assert.ok(reads<=60*4,`visibility reads ${reads}`);assert.ok(writes-initial<=12*12,`frame writes ${writes-initial}`);
 assert.ok(f.nodes.filter(n=>n.dataset.fwFrameRunning).length<=12);
 f.tick(1008);const stoppedReads=reads;for(let t=1024;t<2000;t+=16)f.tick(t);assert.equal(reads,stoppedReads);f.c.destroy();
});
test('prepareSync reads each animal and clip once without painting; commitSync paints without geometry reads',()=>{
 const events=[],bounds={left:0,top:0,right:360,bottom:280,width:360,height:280},animals=[0,1].map(i=>({id:`b${i}`,configId:'chicken',status:'producing'}));
 const nodes=animals.map(a=>{const image={href:'',getAttribute(){return this.href},setAttribute(_,v){events.push('write');this.href=v}};return {dataset:{animal:a.id,shelter:'pen'},querySelector:()=>image,getBoundingClientRect(){events.push('animal-read');return bounds}}});
 const root={closest:()=>null,querySelectorAll:()=>nodes,getBoundingClientRect(){events.push('clip-read');return bounds}};
 const c=createAnimalAnimationController({root,getAnimal:id=>({animal:animals.find(a=>a.id===id),shelter:{}}),getStaticArt:resolveShelterAnimal,Image:null,matchMedia:()=>({matches:false}),requestFrame:()=>1,cancelFrame(){}});
 c.prepareSync();assert.deepEqual(events,['clip-read','animal-read','animal-read']);events.length=0;c.commitSync();assert.deepEqual(events,['write','write']);c.destroy();events.length=0;c.prepareSync();c.commitSync();assert.deepEqual(events,[]);
});
