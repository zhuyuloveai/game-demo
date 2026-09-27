// Preserve the original seven-day regression contract; monthly routes have separate tests.
const fresh=(name,background)=>baseFresh(name,background,7);
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh as baseFresh} from '../engine.js';
import {normaliseSave} from '../storage.js';
import {replyToMessage,incoming} from '../messages.js';
import {projectProgress,lifeSummary} from '../life.js';
test('legacy saves preserve choices while recovering personal progress',()=>{const s=fresh();s.logs.push('第 1 天：完成项目，收入 ¥300。');s.flags.listenLin=true;const r=normaliseSave(JSON.parse(JSON.stringify(s)));assert.equal(r.workCount,1);assert.ok(r.flags.listenLin);assert.equal(normaliseSave({...s,energy:-1}),null);});
test('daily reply deduplication and original day survive future days',()=>{const s=fresh();s.visits.lin=1;assert.ok(replyToMessage(s,'lin','greet'));assert.equal(replyToMessage(s,'lin','greet'),false);s.day=4;assert.ok(replyToMessage(s,'lin','greet'));assert.equal(s.messages.lin[0].day,1);assert.equal(s.messages.lin[2].day,4);assert.equal(s.messages.lin.length,4);});
test('message uses real encounter state rather than old three-scene cap',()=>{const s=fresh();s.visits.lin=3;assert.ok(!incoming(s,'lin').includes('周日'));s.visits.lin=5;assert.ok(incoming(s,'lin').includes('周日'));});
test('personal milestone summary only claims earned work',()=>{const s=fresh();assert.equal(projectProgress(s),0);assert.ok(!lifeSummary(s).includes('交付'));s.workCount=3;assert.ok(lifeSummary(s).includes('交付'));});
import {workTerms} from '../life.js';
test('polished work trades eight more energy for income and requires trained skill',()=>{const s=fresh();s.workStyle='polish';assert.deepEqual(workTerms(s),{pay:300,energy:18,polished:false});s.skill=3;assert.deepEqual(workTerms(s),{pay:480,energy:26,polished:true});});
import {guidance,relationshipNote} from '../guidance.js';
test('home guidance gives a recoverable next action when tired',()=>{const s=fresh();s.energy=0;assert.ok(guidance(s).includes('免费休息'));s.visits.lin=1;assert.equal(relationshipNote(s,'lin'),'记住了彼此的名字');});
