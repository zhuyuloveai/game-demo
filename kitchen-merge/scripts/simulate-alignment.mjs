// Upper-bound supply simulation: empty output space, perfect immediate cleanup.
// It measures this project's rules, not player retention or competitor telemetry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../dist/engine.mjs';
import V3 from '../dist/v3-rules.mjs';
const start=1792108800000,day=86400000,rows=[];
function run(id,legacy){
  const s=E.createGame(null,start);s.board.fill(null);s.locked=[];s.pending=[];s.tools=[];s.stage=12;s.orders=[];
  const p=s.board[0]=E.makeItem(s,id,start);
  if(legacy){p.legacyV3=true;const old=E.sourceRules(p).manual;p.stock=old.maxStock;p.rechargeRemaining=old.rechargeSeconds*1000;}
  let taps=0,baseUnits=0,energySpent=0;
  for(let minute=0;minute<1440;minute++){
    const time=start+minute*60000;
    E.tick(s,time,{offline:true,fill:false});
    while(s.energy>0&&E.producerStatus(s,s.board[0],time).ready){
      const out=E.generate(s,0,time);assert.equal(out.ok,true);taps++;energySpent++;
      baseUnits+=E.definition(out.item).baseUnits;s.board[out.index]=null;
    }
  }
  assert.equal(taps,energySpent);assert.ok(taps<=819,'100 initial + 719 natural over 23:59');
  return {taps,baseUnits,remainingStock:s.board[0].stock,energyRemaining:s.energy};
}
for(const p of E.BALANCE.producers){
  for(const level of new Set([p.activeLevel,p.maxLevel])){
    const id=`${p.chain}:${level}`,legacy=V3[id]?.manual;
    rows.push({id,current:run(id,false),previous:legacy?run(id,true):null,
      cdSeconds:p.levels[level-1].rechargeSeconds,maxStock:p.levels[level-1].maxStock,
      probabilityEvidence:'D',batchEvidence:p.levels[level-1].fieldEvidence.batch.evidence});
  }
}
const report={balanceVersion:E.BALANCE_VERSION,horizon:'24h, first tap t=0, last sample t=23:59',
  assumptions:['单台设备独立使用全部体力','产物立即移出棋盘，空间无竞争','自然恢复120秒，上限100，初始100','无商店、日礼、容器、无限体力、付费/广告','既有存档权益另由迁移测试覆盖'],
  limits:'可供给量上界；不是通关时长、实际留存、竞品精确掉率或全局空间模拟',
  gardenNestEarliestMinutes:32*8,rows};
if(process.argv.includes('--write'))fs.writeFileSync(new URL('../docs/verification/feige-alignment/supply-simulation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
