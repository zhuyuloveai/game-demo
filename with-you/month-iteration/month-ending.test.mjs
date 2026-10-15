import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,getScene,choose} from '../engine.js';
import {monthlySummary} from '../month.js';
import {ensureEconomy,transact} from '../economy.js';
test('monthly finale preserves friend choice and only permits earned exclusive romance',()=>{
 let s=fresh();s.day=30;s.visits.lin=6;s.rel.lin=7;s=act(s,'lin');let scene=getScene(s);assert.equal(scene.options[0].requires(s),false);assert.equal(scene.options[1].requires,undefined);
 s.rel.lin=12;assert.equal(scene.options[0].requires(s),true);s=choose(s,0).state;s.visits.shen=6;s.rel.shen=20;s=act(s,'shen');scene=getScene(s);assert.equal(scene.options[0].requires(s),false);s=choose(s,1).state;assert.equal(s.ending.who,'lin');
});
test('monthly business recap distinguishes cash shortages, pause and unfinished production',()=>{
 let s=fresh();s.cash=3100;ensureEconomy(s);s=transact(s,'found','studio').state;assert.match(monthlySummary(s),/补足/);assert.doesNotMatch(monthlySummary(s),/手里也留着/);
 s.cash=1000;assert.match(monthlySummary(s),/手里也留着/);s=transact(s,'strategy','pause').state;assert.match(monthlySummary(s),/暂停营业/);
 s.economy.films=[{left:1,budget:5000}];assert.match(monthlySummary(s),/继续人生后完成/);assert.doesNotMatch(monthlySummary(s),/真正上映/);
});
