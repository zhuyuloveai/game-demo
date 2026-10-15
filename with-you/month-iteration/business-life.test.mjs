import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../engine.js';
import {ensureEconomy,transact,tickEconomy} from '../economy.js';
import {investmentPlan,operatingCost} from '../finance-plan.js';
import {businessMessage,shareBusiness} from '../business-messages.js';
test('investment preview accounts for future expanded strategy cost without spending',()=>{
 let s=fresh();s.cash=17048;ensureEconomy(s);s=transact(s,'found','studio').state;
 const before=JSON.stringify(s),p=investmentPlan(s,9000,operatingCost(s.economy,2));assert.equal(p.after,5048);assert.equal(p.nextCost,1350);assert.equal(p.gap,0);assert.equal(JSON.stringify(s),before);
 s=transact(s,'upgrade').state;assert.equal(operatingCost(s.economy),1350);assert.equal(investmentPlan(s,5000).gap,1302);
 s=transact(s,'strategy','growth').state;assert.equal(operatingCost(s.economy),2295);
 s=transact(s,'strategy','pause').state;assert.equal(operatingCost(s.economy),0);
});
test('business sharing uses earned facts once per contact and never advances resources or relation',()=>{
 let s=fresh();s.cash=6000;ensureEconomy(s);assert.equal(businessMessage(s,'lin'),null);s=transact(s,'found','studio').state;assert.equal(businessMessage(s,'lin'),null);s.visits.lin=1;
 const values=[s.cash,s.energy,s.day,s.slot,s.rel.lin,s.economy.period];assert.equal(shareBusiness(s,'lin'),true);assert.match(s.messages.lin[0].text,/创意工作室/);assert.equal(shareBusiness(s,'lin'),false);assert.deepEqual([s.cash,s.energy,s.day,s.slot,s.rel.lin,s.economy.period],values);
 s=JSON.parse(JSON.stringify(s));assert.equal(shareBusiness(s,'lin'),false);s.visits.shen=1;assert.equal(shareBusiness(s,'shen'),true);
 s.economy.company.level=2;assert.equal(shareBusiness(s,'lin'),true);assert.match(s.messages.lin.at(-2).text,/扩张到 2 级/);assert.equal(shareBusiness(s,'lin'),false);s.economy.films=[{left:0,budget:5000,return:2890}];assert.equal(shareBusiness(s,'lin'),true);assert.match(s.messages.lin.at(-2).text,/亏损 ¥2,110/);assert.equal(shareBusiness(s,'lin'),false);
});
