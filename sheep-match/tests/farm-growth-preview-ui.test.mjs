import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const slice=(a,b)=>source.slice(source.indexOf(`    function ${a}(`),source.indexOf(`    function ${b}(`));
function harness(){
 const original={id:'barn',kind:'barn',x:20,y:20,w:3,h:3},manual=[{id:'barn',x:25,y:22,rotation:0,stored:false}],plan={ok:true,positions:[{id:'barn',x:24,y:20,rotation:0,stored:false}],proposedRoads:[{x:25,y:23}],signature:'canonical-plan'};
 const calls={save:[],commands:[],say:[]},state={entities:[original]},ctx={state,layout:{beginLayout:()=>({positions:[original]}),isFixedEntity:()=>false},say:s=>calls.say.push(s),store:{saveDraft:d=>calls.save.push(structuredClone(d))},confirm:({onConfirm})=>onConfirm()};
 const env={ctx,clone:structuredClone,previewGrowthLayout:()=>structuredClone(plan),selectedEntity:()=>null,render(){},clearLayoutDraft(){},doAct:c=>{calls.commands.push(c);return {ok:true};},entity:()=>original};
 const code=`let draft={positions:${JSON.stringify(manual)}},growthPreview=null,selected=null,lastFieldTap=null,preserveStoredDraft=false,undo=[],redo=[];
 ${slice('effectiveEntities','visualRect')}${slice('persistLayoutDraft','clearLayoutDraft')}${slice('changeDraft','saveDraft')}${slice('saveDraft','cancelEdit')}${slice('cancelEdit','reorderJob')}${slice('action','point')}
 return {preview:()=>action('growth-preview'),undo:()=>action('undo-growth-preview'),cancel:cancelEdit,apply:saveDraft,persist:persistLayoutDraft,change:()=>changeDraft('barn',{x:42}),entities:effectiveEntities,snapshot:()=>({draft,growthPreview})};`;
 return {api:new Function(...Object.keys(env),code)(...Object.values(env)),calls,manual,state};
}
test('growth adoption roads and placements are transient; undo restores preceding manual draft',()=>{const {api,calls,manual,state}=harness(),before=structuredClone(state);api.preview();assert.equal(api.entities().filter(e=>e.previewOnly).length,1);api.persist();api.change();assert.equal(calls.save.length,0);assert.equal(api.snapshot().draft.positions[0].x,24);assert.deepEqual(state,before);api.undo();assert.deepEqual(api.snapshot().draft.positions,manual);assert.equal(api.entities().filter(e=>e.previewOnly).length,0);assert.equal(calls.commands.length,0);});
test('growth application dispatches canonical signature only, never client-supplied entities or roads',()=>{const {api,calls}=harness();api.preview();api.apply();assert.deepEqual(calls.commands,[{type:'adoptGrowthLayout',expectedSignature:'canonical-plan'}]);assert.equal(api.snapshot().growthPreview,null);assert.equal(api.snapshot().draft,null);});
test('canceling growth preview and enclosing edit cannot change live entities',()=>{const {api,calls,state}=harness(),before=structuredClone(state);api.preview();api.cancel();assert.deepEqual(state,before);assert.equal(calls.commands.length,0);assert.equal(api.snapshot().growthPreview,null);assert.equal(api.snapshot().draft,null);});

test('connecting-road intent is present only for unchanged recommended productive placement',()=>{const placement={category:'machine',configId:'bakery',x:25,y:26,rotation:0,growthOrigin:{x:25,y:26,rotation:0}},command=new Function('placement',`${slice('buyCommand','placementCheck')};return buyCommand;`)(placement);assert.equal(command().growthPlacement,true);placement.x++;assert.equal(command().growthPlacement,undefined);placement.x--;placement.rotation=90;assert.equal(command().growthPlacement,undefined);placement.rotation=0;placement.category='road';assert.equal(command().growthPlacement,undefined);placement.category='decoration';assert.equal(command().growthPlacement,undefined);});
