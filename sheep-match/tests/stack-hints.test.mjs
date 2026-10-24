import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stackHints, boardSize, appendStackHint, STACK_MAX_SPREAD, STACK_GUTTER} from '../stack-hints.mjs';
import {createGame, freeTiles, pick, undo, verifySolution} from '../engine.mjs';

const pile = (n, x=0, y=0) => Array.from({length:n},(_,z)=>({id:z,x,y,z,type:z%4}));

test('exact piles show one top hint, one edge per hidden card and an exact deep count',()=>{
  for(const depth of [2,3,8,16,100]) {
    const board=pile(depth), before=structuredClone(board), hints=stackHints(board);
    assert.equal(hints.size,1);
    assert.deepEqual(hints.get(depth-1),{count:depth-1,edges:depth-1});
    assert.deepEqual(board,before);
  }
});

test('tiny near alignment is counted, normal quarter-cell staggering and same layers are not',()=>{
  const board=[{id:0,x:1,y:1,z:0,type:0},{id:1,x:1.125,y:1.125,z:1,type:1},
    {id:2,x:1.375,y:1.125,z:2,type:2},{id:3,x:2.375,y:1.125,z:2,type:3}];
  assert.deepEqual([...stackHints(board)],[[1,{count:1,edges:1}]]);
  assert.equal(stackHints([{id:0,x:0,y:0,z:0},{id:1,x:0,y:0,z:0}]).size,0);
  assert.equal(stackHints([]).size,0);
});

test('only geometry contributes to hints; hidden faces and input order do not',()=>{
  const a=pile(10),b=a.map(t=>({...t,type:11-t.type})).reverse();
  assert.deepEqual([...stackHints(a)],[...stackHints(b)]);
  assert.deepEqual(Object.keys(stackHints(a).get(9)).sort(),['count','edges']);
});

test('hint computation cannot enable a covered tile or affect pick and undo',()=>{
  const game=createGame(0,'stack-logic');
  const board=pile(3,1,1);game.board=board;game.total=3;game.matched=0;
  board.forEach(t=>t.type=0);
  const before=structuredClone(game);stackHints(game.board);
  assert.deepEqual(game,before);
  assert.deepEqual(freeTiles(game.board).map(t=>t.id),[2]);
  assert.equal(pick(game,0).ok,false);
  assert.equal(pick(game,2).ok,true);
  assert.deepEqual(stackHints(game.board).get(1),{count:1,edges:1});
  assert.equal(undo(game),true);
  assert.deepEqual(stackHints(game.board).get(2),{count:2,edges:2});
});

test('ordinary non-overlapping layouts remain hint-free',()=>{
  const board=Array.from({length:12},(_,i)=>({id:i,x:i%6,y:Math.floor(i/6),z:0,type:i%4}));
  assert.equal(stackHints(board).size,0);
});

test('mobile and short-screen fitting reserves left edges without negative dimensions',()=>{
  for(const [w,h] of [[288,280],[343,350],[400,130],[0,0],[20,50]]) {
    const size=boardSize(w,h);
    assert.ok(size.width>=0&&size.height>=0);
    if(w>=STACK_GUTTER*2&&h>=8){
      assert.ok((w-size.width)/2>=STACK_GUTTER-1e-9);
      assert.ok(size.height<=h-8+1e-9);
    }
  }
});

test('generated high-level layouts keep their geometry, free tiles and verified route',()=>{
  for(const level of [0,49,999,9999]) {
    const game=createGame(level,`stack-regression-${level}`);
    const before=JSON.stringify(game),available=freeTiles(game.board).map(t=>t.id);
    stackHints(game.board);
    assert.equal(JSON.stringify(game),before);
    assert.deepEqual(freeTiles(game.board).map(t=>t.id),available);
    assert.equal(verifySolution(game.board,game.solution),true);
  }
});

function element() { return {dataset:{},children:[],attributes:{},style:{setProperty(k,v){this[k]=v;}},
  setAttribute(k,v){this.attributes[k]=v;},append(child){this.children.push(child);}}; }
test('rendered decoration contains only neutral edges, no visible text or count badge',()=>{
  const button=element();appendStackHint(button,{count:9,edges:9},{createElement:element});
  assert.equal(button.dataset.stackCount,'9');
  const hint=button.children[0];assert.equal(hint.attributes['aria-hidden'],'true');
  assert.equal(hint.children.length,9);
  assert.ok(hint.children.every(e=>e.className==='stack-edge'&&!e.textContent));
  assert.ok(hint.children.every(e=>parseFloat(e.style['--stack-offset'])<=STACK_MAX_SPREAD));
  assert.equal(new Set(hint.children.map(e=>e.style['--stack-offset'])).size,9);
  assert.ok(!JSON.stringify(hint).includes('下9'));
  assert.ok(!JSON.stringify(hint).includes('stack-count'));
  const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
  assert.match(css,/\.stack-hint, \.stack-hint \* \{ pointer-events:none;/);
  assert.doesNotMatch(css,/\.stack-count/);
  const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
  assert.match(app,/button\.style\.left = `\$\{tile\.x \/ 7 \* 100\}%`/);
  assert.match(app,/button\.disabled = blocked \|\| game\.status !== 'playing' \|\| generating/);
  assert.match(readFileSync(new URL('../deploy/verify-release.py',import.meta.url),'utf8'),/"stack-hints.mjs": "application\/javascript"/);
});


test('only engine-selectable anchors display edges, and newly revealed piles gain them',()=>{
  const board=[...pile(3,1,1),{id:3,x:1.5,y:1.5,z:3,type:1}];
  let free=new Set(freeTiles(board).map(t=>t.id));
  assert.equal(stackHints(board,free).size,0);
  board.pop();free=new Set(freeTiles(board).map(t=>t.id));
  assert.deepEqual([...stackHints(board,free)],[[2,{count:2,edges:2}]]);
});
