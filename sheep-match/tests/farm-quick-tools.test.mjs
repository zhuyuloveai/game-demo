import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmStroke,extendFarmStroke,cancelFarmStroke,finishFarmStroke,previewFarmStroke,finishFarmToolDrop,isFarmToolTap,farmToolExitPoint} from '../farm-gestures.mjs';

const owner='machine_bakery_1';
const toolFor=type=>Object.freeze({kind:'drop',artId:'bread',command:Object.freeze({type,entityId:owner,...(type==='enqueue'?{recipeId:'bread'}:{})})});
const resolveField=({x,y})=>y===0&&x>=0&&x<20?`field_${x}`:null;
const fieldState=mode=>({
  now:5000,coins:123,inventory:{wheat:25},storage:{silo:{capacity:100}},
  entities:Array.from({length:20},(_,i)=>({id:`field_${i}`,kind:'field',x:i,y:0,crop:mode==='harvest'?{itemId:'wheat',readyAt:1000,yieldCount:2}:null}))
});

test('quick crop tools reuse one continuous 20-field transaction without duplicates or preview spending',()=>{
  for(const mode of ['plant','harvest']){
    const state=fieldState(mode),before=structuredClone(state);
    const stroke=createFarmStroke(mode,'wheat',{x:.5,y:.5});
    extendFarmStroke(stroke,{x:19.5,y:.5},resolveField);
    extendFarmStroke(stroke,{x:.5,y:.5},resolveField);
    const preview=previewFarmStroke(state,stroke);
    assert.equal(preview.length,20);assert(preview.every(item=>item.valid));
    const command=finishFarmStroke(stroke);
    assert.equal(command.type,mode);
    assert.deepEqual(command.entityIds,Array.from({length:20},(_,i)=>`field_${i}`));
    assert.equal(finishFarmStroke(stroke),null,'a released crop tool cannot emit the same stroke twice');
    assert.deepEqual(state,before,'preview and command construction never mutate the economy');
  }
});

test('cancelled quick crop tools discard all twenty preview targets without any command',()=>{
  for(const reason of ['second-pointer','pointercancel','outside','background','resize','mode-change']){
    const state=fieldState('plant'),before=structuredClone(state);
    const stroke=createFarmStroke('plant','wheat',{x:.5,y:.5});
    extendFarmStroke(stroke,{x:19.5,y:.5},resolveField);
    cancelFarmStroke(stroke,reason);
    assert.deepEqual(previewFarmStroke(state,stroke),[]);
    assert.equal(finishFarmStroke(stroke),null);
    assert.deepEqual(state,before);
  }
});

test('recipe and collection tool drops return a fresh allowed command only on their owner',()=>{
  const state=fieldState('plant'),before=structuredClone(state);
  for(const type of ['enqueue','collectAnimal','collectMachine']){
    const tool=toolFor(type),original=structuredClone(tool);
    const command=finishFarmToolDrop(tool,owner,{dragged:true,inside:true});
    assert.deepEqual(command,tool.command);assert.notEqual(command,tool.command);
    command.entityId='changed-copy';
    assert.deepEqual(tool,original,'the returned command does not modify its input');
    assert.deepEqual(state,before,'tool completion does not execute an economic transaction');
  }
});

test('wrong owners, no drag, cancellation and out-of-map drops always produce no command',()=>{
  for(const type of ['enqueue','collectAnimal','collectMachine']){
    const tool=toolFor(type),before=structuredClone(tool);
    for(const target of ['other_machine',null,undefined,''])assert.equal(finishFarmToolDrop(tool,target,{dragged:true,inside:true}),null);
    for(const options of [{},{dragged:false},{dragged:true,cancelled:true},{dragged:true,inside:false},{dragged:true,cancelled:true,inside:false}]){
      assert.equal(finishFarmToolDrop(tool,owner,options),null);
    }
    assert.deepEqual(tool,before);
  }
});

test('drop tools cannot smuggle other economic commands or lack a concrete target owner',()=>{
  for(const type of ['plant','harvest','feed','buy','sell','setSettings','applyLayout','claimReward','startStage','unknown']){
    assert.equal(finishFarmToolDrop({command:{type,entityId:owner}},owner,{dragged:true}),null,type);
  }
  for(const tool of [null,undefined,{}, {command:null},{command:{}},{command:{type:'enqueue'}}]){
    assert.equal(finishFarmToolDrop(tool,undefined,{dragged:true,inside:true}),null);
  }
  for(const entityId of ['',null,0]){
    assert.equal(finishFarmToolDrop({command:{type:'enqueue',entityId}},entityId,{dragged:true,inside:true}),null,'owner IDs must be nonempty strings');
  }
});

test('quick-tool taps accept only short releases on the same visible control',()=>{
  const toolRect=Object.freeze({left:100,top:200,right:200,bottom:260});
  const viewport=Object.freeze({left:0,top:150,right:390,bottom:600});
  const start=Object.freeze({x:150,y:230}),end=Object.freeze({x:155,y:235});
  assert.equal(isFarmToolTap(start,start,toolRect,viewport),true);
  assert.equal(isFarmToolTap(start,end,toolRect,viewport),true);
  assert.equal(isFarmToolTap(start,{x:157.999,y:230},toolRect,viewport),true);
  assert.equal(isFarmToolTap(start,{x:158,y:230},toolRect,viewport),false,'8px is a drag, not a tap');
  assert.equal(isFarmToolTap(start,{x:156,y:236},toolRect,viewport),false,'diagonal distance uses the same threshold');
  assert.deepEqual(start,{x:150,y:230});assert.deepEqual(end,{x:155,y:235});
});

test('a short release outside either the tool or the viewport cannot be a quick-tool tap',()=>{
  const toolRect={left:100,top:200,right:200,bottom:260},viewport={left:0,top:150,right:390,bottom:600};
  for(const [start,end] of [[{x:199,y:230},{x:201,y:230}],[{x:150,y:259},{x:150,y:261}],[{x:101,y:230},{x:99,y:230}],[{x:150,y:201},{x:150,y:199}]]){
    assert.equal(isFarmToolTap(start,end,toolRect,viewport),false);
  }
  assert.equal(isFarmToolTap({x:5,y:230},{x:-1,y:230},{left:-10,top:200,right:50,bottom:260},viewport),false,'a clipped control cannot authorize an out-of-map release');
});

test('malformed or missing quick-tool tap coordinates fail closed without mutating inputs',()=>{
  const toolRect={left:100,top:200,right:200,bottom:260},viewport={left:0,top:150,right:390,bottom:600},valid={x:150,y:230};
  for(const point of [null,undefined,{}, {x:NaN,y:230},{x:150,y:Infinity}]){
    assert.equal(isFarmToolTap(point,valid,toolRect,viewport),false);
    assert.equal(isFarmToolTap(valid,point,toolRect,viewport),false);
  }
  assert.equal(isFarmToolTap(valid,valid,null,viewport),false);
  assert.equal(isFarmToolTap(valid,valid,toolRect,null),false);
});

test('tool drag first segments clip just beyond each of the four tray edges',()=>{
  const rect=Object.freeze({left:100,top:200,right:200,bottom:300}),start=Object.freeze({x:150,y:250});
  const cases=[
    [{x:300,y:250},{x:200,y:250},'x',1],
    [{x:0,y:250},{x:100,y:250},'x',-1],
    [{x:150,y:400},{x:150,y:300},'y',1],
    [{x:150,y:100},{x:150,y:200},'y',-1]
  ];
  for(const [end,boundary,axis,sign] of cases){
    const exit=farmToolExitPoint(start,end,rect),other=axis==='x'?'y':'x';
    assert(exit);assert((exit[axis]-boundary[axis])*sign>0,'the start is outside, not on a covered border');
    assert(Math.abs(exit[axis]-boundary[axis])<=.011,'clipping preserves the immediately adjacent outside land');
    assert.equal(exit[other],boundary[other]);
  }
  assert.deepEqual(start,{x:150,y:250});assert.deepEqual(rect,{left:100,top:200,right:200,bottom:300});
});

test('diagonal tray exits follow the original line at corners and the first intersected side',()=>{
  const rect={left:100,top:200,right:200,bottom:300},start={x:150,y:250};
  for(const end of [{x:300,y:400},{x:0,y:100},{x:0,y:400},{x:300,y:100},{x:400,y:300},{x:200,y:500}]){
    const exit=farmToolExitPoint(start,end,rect);assert(exit);
    const tX=(exit.x-start.x)/(end.x-start.x),tY=(exit.y-start.y)/(end.y-start.y);
    assert(Math.abs(tX-tY)<1e-10,'exit remains on the pointer segment');assert(tX>0&&tX<=1);
    assert(exit.x<rect.left||exit.x>rect.right||exit.y<rect.top||exit.y>rect.bottom,'exit is outside the tray');
  }
  const side=farmToolExitPoint(start,{x:400,y:300},rect);
  assert(side.x>200&&side.x<200.011);assert(Math.abs(side.y-260)<.011);
});

test('movement entirely inside the tray, even to its border, never starts a map stroke',()=>{
  const rect={left:100,top:200,right:200,bottom:300},start={x:150,y:250};
  for(const end of [start,{x:170,y:270},{x:100,y:250},{x:200,y:250},{x:150,y:200},{x:150,y:300},{x:200,y:300}]){
    assert.equal(farmToolExitPoint(start,end,rect),null);
  }
  const outside=Object.freeze({x:90,y:250}),end={x:20,y:250};
  const result=farmToolExitPoint(outside,end,rect);
  assert.deepEqual(result,outside);assert.notEqual(result,outside,'outside starts are copied, not mutated');
});

test('invalid tool exit coordinates and rectangles cannot manufacture a stroke start',()=>{
  const rect={left:100,top:200,right:200,bottom:300},start={x:150,y:250},end={x:300,y:250};
  for(const point of [null,undefined,{}, {x:NaN,y:250},{x:150,y:Infinity}]){
    assert.equal(farmToolExitPoint(point,end,rect),null);
    assert.equal(farmToolExitPoint(start,point,rect),null);
  }
  for(const invalid of [null,undefined,{}, {...rect,left:NaN},{...rect,bottom:Infinity}]){
    assert.equal(farmToolExitPoint(start,end,invalid),null);
  }
});

test('the clipped first swipe includes every outside field and excludes land under the tray',()=>{
  const rect={left:0,top:0,right:5,bottom:1},start={x:.5,y:.5},end={x:19.5,y:.5};
  const exit=farmToolExitPoint(start,end,rect);assert(exit&&exit.x>5);
  for(const mode of ['plant','harvest']){
    const state=fieldState(mode),before=structuredClone(state),stroke=createFarmStroke(mode,'wheat',exit);
    extendFarmStroke(stroke,end,resolveField);
    assert.deepEqual(previewFarmStroke(state,stroke).map(item=>item.id),Array.from({length:15},(_,i)=>`field_${i+5}`));
    assert.deepEqual(finishFarmStroke(stroke).entityIds,Array.from({length:15},(_,i)=>`field_${i+5}`));
    assert.deepEqual(state,before);
  }
  const leftwardExit=farmToolExitPoint({x:19.5,y:.5},{x:.5,y:.5},{left:15,top:0,right:20,bottom:1});
  const reverse=createFarmStroke('plant','wheat',leftwardExit);extendFarmStroke(reverse,{x:.5,y:.5},resolveField);
  assert.deepEqual(finishFarmStroke(reverse).entityIds,Array.from({length:15},(_,i)=>`field_${14-i}`));
});
