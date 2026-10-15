// Preserve the original seven-day regression contract; monthly routes have separate tests.
const fresh=(name,background)=>baseFresh(name,background,7);
import assert from 'node:assert/strict';
import {fresh as baseFresh,act,choose,blocked,getScene} from '../engine.js';
// Seeded strategy coverage supplements, but does not replace, the UI playthroughs.
let seed=20260927;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const endings={};
for(let run=0;run<300;run++){
 let s=fresh('路线验证',['new','work','study'][run%3]),count=0;
 while(!s.ended){
  const ids=['work','study','rest','lin','shen'].filter(id=>!blocked(s,id));
  assert.ok(ids.length,'must always have a recovery action');
  s=act(s,ids[Math.floor(random()*ids.length)]);
  if(s.pending){
   s=JSON.parse(JSON.stringify(s));
   const choices=getScene(s).options.map((o,i)=>({o,i})).filter(({o})=>!o.requires||o.requires(s));
   assert.ok(choices.length,'story must offer an available choice');
   s=choose(s,choices[Math.floor(random()*choices.length)].i).state;
  }
  assert.ok(s.cash>=0 && s.energy>=0 && s.energy<=100);
  count++;assert.ok(count<=14);
 }
 assert.equal(count,14);assert.ok(s.ending?.text);
 const k=s.ending.who||'life';endings[k]=(endings[k]||0)+1;
}
console.log('300 seeded complete-week routes passed',endings);
