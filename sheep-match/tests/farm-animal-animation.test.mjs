import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ANIMAL_ANIMATION_METADATA,animalAnimationPhase,animalAnimationSample,resolveAnimalAnimationFrame,createAnimalAnimationController} from '../farm-animal-animation.mjs';
import {resolveShelterAnimal} from '../farm-runtime-shelters.mjs';
import {runtimeArtHit} from '../farm-runtime-art.mjs';
const base=new URL('../',import.meta.url);
function fixture(number=1,species='chicken'){
 let pending=null,paused=false,reduced=false,hidden=false,cancelled=0;
 const animals=Array.from({length:number},(_,i)=>({id:`bird-${i}`,configId:species,status:'producing'}));
 const bounds={left:0,top:0,right:360,bottom:280,width:360,height:280};
 const nodes=animals.map(a=>{const image={href:'',getAttribute(){return this.href;},setAttribute(_,v){this.href=v;}};return {dataset:{animal:a.id,shelter:'pen'},image,bounds:{...bounds},querySelector:()=>image,getBoundingClientRect(){return this.bounds;}};});
 const doc={get hidden(){return hidden;},defaultView:{innerWidth:1000,innerHeight:1000}};
 const root={ownerDocument:doc,closest:()=>null,querySelectorAll:()=>nodes,getBoundingClientRect:()=>bounds};
 const c=createAnimalAnimationController({root,getAnimal:id=>({animal:animals.find(a=>a.id===id),shelter:{configId:species}}),getStaticArt:resolveShelterAnimal,isPaused:()=>paused,isReduced:()=>reduced,matchMedia:()=>({matches:false}),Image:null,requestFrame:fn=>(pending=fn,1),cancelFrame:()=>{pending=null;cancelled++;}});
 return {c,nodes,animals,tick:t=>{const fn=pending;pending=null;fn?.(t);},pause:v=>paused=v,reduce:v=>reduced=v,hide:v=>hidden=v,get cancelled(){return cancelled;}};
}
test('runtime has 120 registered five-species full-canvas frames and frame-specific alpha; no editable files',()=>{
 assert.equal(Object.keys(ANIMAL_ANIMATION_METADATA).length,120);
 for(const [key,a] of Object.entries(ANIMAL_ANIMATION_METADATA)){
  assert.equal(a.width,360);assert.equal(a.height,280);assert.deepEqual(a.anchor,[.5,230/280]);assert.deepEqual(a.bounds,[0,0,360,280]);
  assert.equal(a.mask.rows.length,64);assert.ok(existsSync(new URL(a.path,base)));assert.match(a.path,/assets\/farm-runtime\/.*\.png$/);
  const png=readFileSync(new URL(a.path,base));assert.equal(png.readUInt32BE(16),360);assert.equal(png.readUInt32BE(20),280);
  const art=resolveAnimalAnimationFrame(a.action,a.frame,a.species);assert.equal(runtimeArtHit(art,0,0),false);assert.equal(art.fullCanvas,true);assert.equal(art.shelterLayered,true);
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
test('temporary pause freezes painted frame, reduced motion restores static, resume has no catch-up',()=>{
 const f=fixture();f.c.sync();f.c.playEat(['bird-0']);f.tick(0);f.tick(84);
 const frozen=f.nodes[0].image.href;f.pause(true);f.tick(168);assert.equal(f.nodes[0].dataset.fwFrameRunning,'true');assert.equal(f.c.getArt('bird-0').frame,1);assert.equal(f.nodes[0].image.href,frozen);
 f.tick(10000);f.pause(false);f.c.sync();f.tick(10084);assert.equal(f.c.getArt('bird-0').frame,1);
 f.reduce(true);f.c.sync();assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);f.reduce(false);f.hide(true);f.c.sync();assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);
 f.hide(false);f.c.sync();f.c.destroy();assert.equal(f.nodes[0].image.href,resolveShelterAnimal(f.animals[0]).src);assert.equal(f.nodes[0].dataset.fwFrameRunning,undefined);f.c.destroy();assert.equal(f.cancelled,1);
});
test('bounded visible animation; offscreen feed does not replay late; unsupported species static',()=>{
 const f=fixture(16);f.animals[15].configId='unsupported';f.c.sync();f.c.playEat(f.animals.map(a=>a.id));
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

for(const species of ['cow','pig','sheep','lamb'])test(`${species}: twelve distinct eating and walking frames, one-shot restores exact state art`,()=>{
 const entries=Object.values(ANIMAL_ANIMATION_METADATA).filter(a=>a.species===species);assert.equal(entries.length,24);
 for(const action of ['eat','walk']){const frames=entries.filter(a=>a.action===action);assert.equal(new Set(frames.map(a=>a.sourceSha256)).size,12);assert.equal(frames.length,12);for(const a of frames)assert.equal(resolveAnimalAnimationFrame(action,a.frame,species).species,species);}
 const f=fixture(1,species);f.c.sync();f.c.playEat(['bird-0']);f.tick(0);assert.equal(f.c.getArt('bird-0').species,species);
 f.tick(84);assert.equal(f.c.getArt('bird-0').frame,1);for(let t=168;t<=1092;t+=84)f.tick(t);
 assert.equal(f.c.getArt('bird-0',null),null);assert.equal(f.nodes[0].image.href,resolveShelterAnimal(f.animals[0]).src);
 f.animals[0].status='hungry';f.c.sync();const before=JSON.stringify(f.animals);let walk=false;for(let t=1176;t<10000;t+=84){f.tick(t);if(f.c.getArt('bird-0')?.action==='walk')walk=true;}assert.ok(walk);assert.equal(JSON.stringify(f.animals),before);f.c.destroy();
});
test('visible-species loading is shared across controllers, hidden/reduced species are not eagerly decoded',()=>{
 const requests=[];class LoadedImage{set src(value){requests.push(value);this.onload();}}
 const animal={id:'cow',configId:'cow',status:'hungry'},bounds={left:0,top:0,right:100,bottom:100,width:100,height:100};
 const make=(reduced=false)=>{const image={getAttribute:()=>'',setAttribute(){}},el={dataset:{animal:'cow',shelter:'pen'},querySelector:()=>image,getBoundingClientRect:()=>bounds};return createAnimalAnimationController({root:{querySelectorAll:()=>[el],getBoundingClientRect:()=>bounds},getAnimal:()=>({animal,shelter:{}}),getStaticArt:resolveShelterAnimal,Image:LoadedImage,matchMedia:()=>({matches:false}),isReduced:()=>reduced,requestFrame:()=>1,cancelFrame(){}});};
 const reduced=make(true);reduced.sync();assert.equal(requests.length,0);reduced.destroy();const first=make();assert.equal(requests.length,0);animal.status='producing';first.sync();assert.equal(requests.length,0);animal.status='ready';first.sync();assert.equal(requests.length,0);animal.status='hungry';first.sync();assert.equal(requests.length,24);assert.ok(requests.every(p=>p.includes('/cow/')));const second=make();second.sync();assert.equal(requests.length,24);first.destroy();second.destroy();
});
test('mixed five-species herd obeys one visible frame budget and keeps source registrations',()=>{
 const f=fixture(60),species=['chicken','cow','pig','sheep','lamb'];f.animals.forEach((a,i)=>a.configId=species[i%species.length]);
 f.c.sync();f.c.playEat(f.animals.map(a=>a.id));f.tick(0);
 assert.equal(f.nodes.filter(n=>n.dataset.fwFrameRunning).length,12);
 for(let i=0;i<12;i++)assert.equal(f.c.getArt(f.animals[i].id).species,species[i%species.length]);
 for(const a of Object.values(ANIMAL_ANIMATION_METADATA).filter(a=>a.species!=='chicken'&&a.action==='eat')){
  assert.ok(Math.hypot(a.supportAnchor[0]-a.supportTarget[0],a.supportAnchor[1]-a.supportTarget[1])<=1,`${a.key} support drift`);
 }
 f.c.destroy();
});
function delayedFixture({decode=false}={}){
 const images=[];let pending=null,requests=0,writes=0,reduced=false;
 class DelayedImage{constructor(){images.push(this);if(decode)this.decode=()=>new Promise(resolve=>{this.resolveDecode=resolve;});}set src(value){this.url=value;}}
 const animal={id:'late-cow',configId:'cow',status:'producing'},image={href:'',getAttribute(){return this.href;},setAttribute(_,v){writes++;this.href=v;}},bounds={left:0,top:0,right:100,bottom:100,width:100,height:100};
 const el={dataset:{animal:animal.id,shelter:'pen'},querySelector:()=>image,getBoundingClientRect:()=>bounds},root={querySelectorAll:()=>[el],getBoundingClientRect:()=>({left:0,top:0,right:500,bottom:500,width:500,height:500})};
 const c=createAnimalAnimationController({root,getAnimal:()=>({animal,shelter:{}}),getStaticArt:resolveShelterAnimal,Image:DelayedImage,matchMedia:()=>({matches:false}),isReduced:()=>reduced,requestFrame:fn=>{requests++;pending=fn;return 1;},cancelFrame:()=>{pending=null;}});
 const eat=()=>images.filter(i=>i.url.includes('/eat/'));return {c,animal,bounds,image,images,eat,reduce:value=>reduced=value,get requests(){return requests;},get writes(){return writes;},tick:t=>{const fn=pending;pending=null;fn?.(t);}};
}
test('cold feed waits for all twelve frames, ignores out-of-order partial loads and starts once at zero',()=>{
 const f=delayedFixture();f.c.sync();f.c.playEat([f.animal.id]);assert.equal(f.eat().length,12);assert.equal(f.requests,0);
 const staticSrc=f.image.href;for(const index of [10,2,7,0,8,5,9,3,4,1,6]){f.eat()[index].onload();f.c.sync();assert.equal(f.image.href,staticSrc);assert.equal(f.requests,0);}
 f.tick(10000);assert.equal(f.requests,0);f.eat()[11].onload();assert.equal(f.c.getArt(f.animal.id).frame,0);assert.equal(f.requests,1);
 f.tick(10000);f.tick(10084);assert.equal(f.c.getArt(f.animal.id).frame,1);for(let t=10168;t<=11092;t+=84)f.tick(t);
 assert.equal(f.c.getArt(f.animal.id,null),null);assert.equal(f.image.href,staticSrc);f.c.destroy();
});
test('clip is atomic across decode completion, not just successful image loads',async()=>{
 const f=delayedFixture({decode:true});f.c.sync();f.c.playEat([f.animal.id]);for(const image of f.eat())image.onload();await Promise.resolve();
 assert.equal(f.c.getArt(f.animal.id,null),null);assert.equal(f.requests,0);
 for(const image of f.eat().slice(0,11))image.resolveDecode();await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(f.c.getArt(f.animal.id,null),null);f.eat()[11].resolveDecode();await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(f.c.getArt(f.animal.id).frame,0);f.c.destroy();
});
test('failed or abandoned cold feed remains static without polling or late replay',()=>{
 const failure=delayedFixture();failure.c.sync();failure.c.playEat([failure.animal.id]);failure.eat()[4].onerror();for(const image of failure.eat())image.onload?.();
 assert.equal(failure.requests,0);assert.equal(failure.c.getArt(failure.animal.id,null),null);failure.c.destroy();
 const offscreen=delayedFixture();offscreen.c.sync();offscreen.c.playEat([offscreen.animal.id]);offscreen.bounds.left=2000;offscreen.bounds.right=2100;
 for(const image of offscreen.eat())image.onload?.();assert.equal(offscreen.requests,0);assert.equal(offscreen.c.getArt(offscreen.animal.id,null),null);
 offscreen.bounds.left=0;offscreen.bounds.right=100;offscreen.c.sync();assert.equal(offscreen.c.getArt(offscreen.animal.id,null),null);offscreen.c.destroy();
 const closed=delayedFixture();closed.c.sync();closed.c.playEat([closed.animal.id]);closed.c.destroy();const writes=closed.writes;
 for(const image of closed.images)image.onload?.();assert.equal(closed.requests,0);assert.equal(closed.writes,writes);
});

test('reduced motion abandons pending cold feed instead of replaying after re-enable',()=>{
 const f=delayedFixture();f.c.sync();f.c.playEat([f.animal.id]);assert.equal(f.requests,0);
 f.reduce(true);f.c.sync();f.reduce(false);f.c.sync();for(const image of f.eat())image.onload?.();
 assert.equal(f.c.getArt(f.animal.id,null),null);assert.equal(f.requests,0);f.c.destroy();
});
