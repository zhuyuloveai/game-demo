import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, makeItem, collectItem, ITEMS } from '../dist/engine.mjs';
import { itemPresentation } from '../dist/item-presentation.mjs';

const NOW=1792339200000;
function scene(id){const s=createGame(null,NOW);s.board.fill(null);s.locked=[];s.stage=11;s.energy=10;s.board[0]=makeItem(s,id,NOW);return s;}
const view=s=>itemPresentation(s,s.board[0],0,NOW);
test('production cues follow stock, available space, energy and infinite energy',()=>{
  const s=scene('gen_tools:4');assert.equal(view(s).cue,'produce');assert.equal(view(s).ready,true);
  s.energy=0;assert.equal(view(s).ready,false);
  s.infiniteUntil=NOW+1000;assert.equal(view(s).ready,true);
  s.board[0].stock=0;assert.equal(view(s).cue,'wait');assert.equal(view(s).idle,false);
  s.board[0].stock=1;s.locked=Array.from({length:62},(_,i)=>i+1);assert.equal(view(s).ready,false);assert.match(view(s).label,/空格/);
});
test('finite producers retain their select-then-produce interaction',()=>{
  const s=scene('seedbag:4');assert.equal(view(s).ready,true);assert.match(view(s).label,/点选后/);
});
test('bag cue changes from open to waiting to collect, and respects board capacity',()=>{
  const s=scene('blackbag:1');assert.equal(view(s).cue,'open');
  assert.equal(collectItem(s,0,NOW).ok,true);assert.equal(view(s).cue,'wait');assert.equal(view(s).ready,false);
  s.board[0].timerRemaining=0;assert.equal(view(s).cue,'collect');assert.equal(view(s).ready,true);
  s.locked=Array.from({length:62},(_,i)=>i+1);assert.equal(view(s).ready,false);
});
test('currency can be collected on a full board, while containers require space',()=>{
  for(const id of ['coins:1','energy:5','gems:1','legacy_coins:1','tipjar:1','energybox:1']){
    const s=scene(id);s.locked=Array.from({length:62},(_,i)=>i+1);
    assert.equal(view(s).cue,'collect',id);assert.equal(view(s).ready,!['tipjar:1','energybox:1'].includes(id),id);
  }
});
test('tools show use cues; ordinary and automatic items do not promise tap production',()=>{
  assert.equal(view(scene('splitter:3')).cue,'use');
  assert.equal(view(scene('food:1')).cue,'');assert.equal(view(scene('food:1')).idle,true);
  assert.equal(view(scene('story:5')).idle,false);
});
test('locked and empty cells remain quiet',()=>{
  const s=scene('gen_tools:4');s.locked=[0];assert.equal(view(s).cue,'');assert.equal(view(s).idle,false);
  s.board[0]=null;assert.equal(view(s).cue,'');
});
test('computing presentation for the whole catalogue never mutates gameplay',()=>{
  for(const id of Object.keys(ITEMS)){const s=scene(id),before=JSON.stringify(s);view(s);assert.equal(JSON.stringify(s),before,id);}
});
