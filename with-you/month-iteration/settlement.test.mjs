import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../engine.js';
import {ensureEconomy,transact,tickEconomy} from '../economy.js';
test('paused company clears the last settled cashflow without charging or catching up',()=>{
 let s=fresh();s.cash=10000;ensureEconomy(s).seed=42;s=transact(s,'found','studio').state;tickEconomy(s);
 s=transact(s,'strategy','pause').state;const cash=s.cash,period=s.economy.period;
 tickEconomy(s);tickEconomy(s);assert.equal(s.cash,cash);assert.equal(s.economy.company.last,0);assert.equal(s.economy.period,period+2);
 s=transact(s,'strategy','steady').state;tickEconomy(s);assert.equal(s.cash-cash,s.economy.company.last);assert.equal(s.economy.company.paused,false);
});
test('liquidity shortage report distinguishes cost from the actual cash gap',()=>{
 let s=fresh();s.cash=4000;ensureEconomy(s);s=transact(s,'found','studio').state;s.cash=358;tickEconomy(s);
 assert.equal(s.cash,358);assert.match(s.economy.lastReport.join(''),/需要 ¥450.*有 ¥358.*尚缺 ¥92/);
 assert.equal(s.economy.company.last,0);
});
