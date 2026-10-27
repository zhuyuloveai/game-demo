import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const host=readFileSync(new URL('../farm-scene-host.mjs',import.meta.url),'utf8');
const source=host.slice(host.indexOf(' function confirm(options){'),host.indexOf(' function mount(ctx){'));
function harness(){
 const layer={inert:false},buttons={};let overlay,resumes=0,suspends=0,calls=0;
 const c={active:true,destroyed:false,escapeScene:String,cleanups:new Set(),confirmClosers:new Set(),confirmResumers:new Set([()=>resumes++]),refreshers:new Set(),deactivators:new Set([reason=>{assert.equal(reason,'confirm');suspends++;}]),say:()=>{},doc:{activeElement:{isConnected:true,focus(){}},createElement:()=>overlay={removed:false,remove(){this.removed=true;},querySelector(selector){return buttons[selector]??=( {focus(){},disabled:false});},querySelectorAll(){return Object.values(buttons);}}},root:{querySelectorAll:()=>[layer],append(){} }};
 vm.createContext(c);vm.runInContext(source,c);
 return {c,layer,buttons,get overlay(){return overlay},get resumes(){return resumes},get suspends(){return suspends},get calls(){return calls},open:fn=>c.confirm({onConfirm:()=>{calls++;return fn?.();}}),yes:()=>buttons['[data-yes]'].onclick(),no:()=>buttons['[data-no]'].onclick()};
}
test('host confirmation suspends and resumes facility on cancel without executing callback',()=>{const h=harness();h.open();assert.equal(h.suspends,1);assert(h.layer.inert);h.no();assert.equal(h.calls,0);assert.equal(h.resumes,1);assert.equal(h.layer.inert,false);assert(h.overlay.removed);});
test('host confirmation keeps facility suspended on failure or exception and permits successful retry',async()=>{const h=harness();let attempts=0;h.open(()=>{attempts++;if(attempts===1)return {ok:false};if(attempts===2)throw Error('storage unavailable');return {ok:true};});await h.yes();assert(!h.overlay.removed);assert.equal(h.resumes,0);assert.equal(h.buttons['[data-yes]'].disabled,false);await h.yes();assert(!h.overlay.removed);assert.equal(h.buttons['[data-yes]'].disabled,false);await h.yes();assert(h.overlay.removed);assert.equal(h.resumes,1);assert.equal(h.calls,3);});
test('host confirmation ignores repeated submit while callback is pending',async()=>{const h=harness();let resolve;h.open(()=>new Promise(r=>resolve=r));const first=h.yes();await h.yes();assert.equal(h.calls,1);resolve({ok:true});await first;assert.equal(h.resumes,1);});
test('inactive or destroyed host never revives a suspended facility',()=>{for(const flag of ['active','destroyed']){const h=harness();h.open();h.c[flag]=flag==='destroyed';h.no();assert.equal(h.resumes,0);}});
test('world confirmation path suspends instead of destroying facility and unregisters resumer',()=>{const world=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');assert.match(world,/reason==='confirm'/);assert.match(world,/coopPanel\?\.suspend/);assert.match(world,/onConfirmClosed/);assert.match(world,/coopPanel\?\.resume/);assert.match(world,/stopConfirmResume\?\.\(\)/);});
test('actual factory seed-reserve callback survives host suspension and retries exactly once with explicit allowance',async()=>{
 const h=harness(),factory=readFileSync(new URL('../farm-factory-panel.mjs',import.meta.url),'utf8');
 const commit=factory.slice(factory.indexOf(' function commit('),factory.indexOf(' function collect('));
 const commands=[];Object.assign(h.c,{dead:false,busy:false,box:{},entityId:'bakery',status:{},refresh(){},factoryStartCheck:()=>({ok:true,command:{type:'enqueue',entityId:'bakery',recipeId:'bread'}}),ctx:{state:{},config:{},act(command){commands.push(command);return command.allowSeedReserve?{ok:true}:{ok:false,error:{code:'KEEP_SEED_RESERVE'}};},confirm:options=>h.c.confirm(options)}});
 vm.runInContext(commit,h.c);h.c.commit('bread');assert.equal(commands.length,1);assert.equal(h.suspends,1);assert.equal(h.c.dead,false);await h.yes();assert.equal(commands.length,2);assert.equal(commands[1].allowSeedReserve,true);assert(h.overlay.removed);assert.equal(h.resumes,1);
});
test('actual factory suspend hides without disposing and resume restores focus and refreshed presentation',()=>{
 const factory=readFileSync(new URL('../farm-factory-panel.mjs',import.meta.url),'utf8'),suspend=factory.slice(factory.indexOf(' function suspend(){'),factory.indexOf(' let timer,unsubscribe;'));
 let stops=0,clears=0,paints=0,focuses=0;const focus={isConnected:true,focus(){focuses++;}};
 const c=vm.createContext({dead:false,suspended:false,resumeFocus:null,oldInert:false,suppressClick:true,pointers:new Set([1]),stop(){stops++;},refresh(){paints++;},doc:{activeElement:focus},ctx:{root:{inert:true},clearFeedback(){clears++;}},overlay:{hidden:false,contains:el=>el===focus,querySelector:()=>focus}});
 vm.runInContext(suspend,c);c.suspend();assert.equal(c.dead,false);assert.equal(c.suspended,true);assert.equal(c.overlay.hidden,true);assert.equal(c.pointers.size,0);assert.equal(c.ctx.root.inert,false);c.suspend();assert.equal(stops,1);assert.equal(clears,1);c.resume();assert.equal(c.suspended,false);assert.equal(c.overlay.hidden,false);assert.equal(c.ctx.root.inert,true);assert.equal(paints,1);assert.equal(focuses,1);c.suspend();c.dead=true;c.resume();assert.equal(c.overlay.hidden,true);
});
