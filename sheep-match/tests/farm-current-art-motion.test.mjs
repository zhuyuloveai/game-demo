import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountFarmDelight,delightProfile} from '../farm-delight.mjs';
function harness(){
 let now=0,id=0;const frames=new Map(),docEvents=new Map(),mediaEvents=new Map();
 const media={matches:false,addEventListener:(k,f)=>mediaEvents.set(k,f),removeEventListener:k=>mediaEvents.delete(k)};
 const win={matchMedia:()=>media,performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i)};
 const doc={hidden:false,defaultView:win,addEventListener:(k,f)=>docEvents.set(k,f),removeEventListener:k=>docEvents.delete(k),createElement:tag=>new Element(tag)};
 class Element {
  constructor(tag){this.tag=tag;this.ownerDocument=doc;this.dataset={};this.children=[];this.attrs={};this.style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};this.classList={add:()=>{}};}
  setAttribute(k,v){this.attrs[k]=v;}append(...nodes){for(const n of nodes){n.parent=this;n.parentNode=this;this.children.push(n);}}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
  querySelector(s){return s==='.farm-viewport'?this.view:null;}querySelectorAll(selector){return this.selections?.[selector]||[];}
  closest(selector){return this.blocked&&selector.includes(this.blocked)?this:null;}
  getBoundingClientRect(){return {left:0,top:0,width:390,height:760,right:390,bottom:760};}
 }
 const root=new Element('section');root.view=new Element('div');root.append(root.view);
 return {Element,root,doc,media,frames,docEvents,mediaEvents,advance(ms){now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(now));},setTime(ms){now=ms;},visibility(hidden){doc.hidden=hidden;docEvents.get('visibilitychange')?.();},motion(matches){media.matches=matches;mediaEvents.get('change')?.();}};
}
function world(){
 const h=harness(),map=new h.Element('div');h.root.selections={'.fw-map':[map]};map.selections={'[data-fw-motion]':[]};h.root.append(map);
 h.add=(kind,id,ready)=>{const el=new h.Element('div');el.dataset={fwMotion:kind,entity:id};if(ready!==undefined)el.dataset.fwReady=String(ready);map.selections['[data-fw-motion]'].push(el);map.append(el);return el;};
 h.map=map;return h;
}
test('motion v3 profiles reproduce recovered bundle constants and remain varied',()=>{
 const range={animal:[4100,6400],crop:[2700,3900],tree:[3500,5100],machine:[3600,6100],ready:[3300,5700]};
 for(const [kind,[min,max]] of Object.entries(range)){
  const profiles=Array.from({length:100},(_,i)=>delightProfile('entity-'+i,kind));
  assert.ok(new Set(profiles.map(p=>p.duration)).size>80);
  assert.deepEqual(profiles[0],delightProfile('entity-0',kind));
  for(const p of profiles){assert.ok(p.duration>=min&&p.duration<=max);assert.ok(p.phase>=0&&p.phase<=p.duration);assert.ok(p.hold>=0&&p.hold<3);assert.ok(p.scaleY>=1.045&&p.scaleY<=1.06);}
 }
});
test('PNG runtime enforces 30 total and 12/6/4/4/4 kind caps',()=>{
 const h=world();for(const kind of ['animal','crop','tree','machine','ready'])for(let i=0;i<20;i++)h.add(kind,kind+i);
 const fx=mountFarmDelight(h.root),selected=h.map.children.filter(el=>el.dataset.delightIdle);
 assert.equal(selected.length,30);
 for(const [kind,max] of Object.entries({animal:12,crop:6,tree:4,machine:4,ready:4}))assert.equal(selected.filter(e=>e.dataset.delightIdle===kind).length,max);
 fx.destroy();for(const el of selected){assert.equal(el.dataset.delightIdle,undefined);assert.equal(el.style['--delight-duration'],undefined);}
});
test('offscreen, occluded, neighbors and blocked items receive no idle budget',()=>{
 const h=world(),outside=h.add('animal','outside');outside.getBoundingClientRect=()=>({left:500,right:520,top:20,bottom:40,width:20,height:20});
 for(const blocker of ['.fw-layout-world','.fw-occluder-faded','.fw-muted-neighbor','[data-motion-blocked="true"]'])h.add('animal',blocker).blocked=blocker;
 const good=h.add('animal','good'),fx=mountFarmDelight(h.root);
 assert.equal(good.dataset.delightIdle,'animal');assert.equal(h.map.children.filter(e=>e.dataset.delightIdle).length,1);fx.destroy();
});
test('same-node refresh preserves CSS phase and rerender uses continuous clock',()=>{
 const h=world(),a=h.add('crop','wheat',false),fx=mountFarmDelight(h.root),delay=a.style['--delight-delay'];
 h.advance(500);fx.refresh();assert.equal(a.style['--delight-delay'],delay);
 h.map.selections['[data-fw-motion]']=[];const b=h.add('crop','wheat',false);fx.refresh();
 assert.equal(parseFloat(b.style['--delight-delay']),parseFloat(delay)-500);assert.equal(a.dataset.delightIdle,undefined);fx.destroy();
});
test('fresh arrival only on false-to-true readiness, bounded to two, no load burst',()=>{
 const h=world(),loaded=h.add('crop','loaded',true),crops=Array.from({length:4},(_,i)=>h.add('crop','crop'+i,false)),fx=mountFarmDelight(h.root);
 assert.equal(loaded.dataset.delightFresh,undefined);
 crops.forEach(e=>e.dataset.fwReady='true');fx.refresh();
 assert.equal(crops.filter(e=>e.dataset.delightFresh==='true').length,2);
 h.advance(1101);fx.refresh();assert.equal(crops.filter(e=>e.dataset.delightFresh).length,0);fx.destroy();
});
test('pause freezes arrival time; reduced motion suppresses new arrival and disabled cleans styles',()=>{
 const h=world(),crop=h.add('crop','c',false),fx=mountFarmDelight(h.root);
 crop.dataset.fwReady='true';fx.refresh();h.advance(100);fx.pause();h.advance(5000);fx.pause(false);fx.refresh();
 assert.equal(crop.dataset.delightFresh,'true');h.advance(1001);fx.refresh();assert.equal(crop.dataset.delightFresh,undefined);
 crop.dataset.fwReady='false';fx.refresh();fx.setReducedMotion(true);crop.dataset.fwReady='true';fx.refresh();assert.equal(crop.dataset.delightFresh,undefined);
 fx.setEnabled(false);assert.equal(crop.dataset.delightIdle,undefined);assert.equal(crop.style['--ripe-cycle-duration'],undefined);fx.destroy();
});
test('recovered CSS protects frame animation, input geometry, reduced and drag/inert pauses',()=>{
 const css=readFileSync(new URL('../farm-delight.css',import.meta.url),'utf8');
 assert.match(css,/:not\(\[data-fw-frame-running="true"\]\)/);
 assert.match(css,/\.fw-ripe-charm\{[^}]*pointer-events:none!important/);
 for(const token of ['fw-ripe-twinkle','fw-ripe-dewdrop','fw-ripe-arrival','data-delight-dragging','data-motion-blocked','[inert]','prefers-reduced-motion'])assert.ok(css.includes(token));
});
test('active drag pauses existing CSS motion without resetting its phase or granting new motion budget',()=>{
 const h=world(),a=h.add('crop','wheat',true),fx=mountFarmDelight(h.root),delay=a.style['--delight-delay'];
 a.blocked='[data-motion-blocked="true"]';const newcomer=h.add('crop','other',true);newcomer.blocked=a.blocked;
 h.advance(500);fx.refresh();assert.equal(a.dataset.delightIdle,'crop');assert.equal(a.style['--delight-delay'],delay);assert.equal(newcomer.dataset.delightIdle,undefined);
 a.blocked=null;fx.refresh();assert.equal(a.style['--delight-delay'],delay);fx.destroy();
});
