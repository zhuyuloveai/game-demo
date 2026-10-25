/* Management chapters. All economy transitions use the unmodified farm core. */
import {FARM_STAGES} from './farm-stage-data.mjs';
const scenes = {};
  const E = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const btn = (text, action, extra = '') => `<button type="button" data-mg="${E(action)}" ${extra}>${text}</button>`;
  const badge = (text, cls = '') => `<span class="mg-badge ${cls}">${E(text)}</span>`;
  const claimedParts = new WeakMap();
  const status = (text, error = false) => `<div class="mg-status ${error ? 'is-error' : ''}" role="status">${E(text)}</div>`;
  const heads = {P13:['成长手记','一页一页，记下牧场的小进步'],P14:['牧场故事','24 段叠牌支线，慢慢走就好'],P15:['忙里偷闲','三张相同，收进小篮子'],P17:['设置与帮助','管理音画偏好与本机存档'],P18:['让田野重新发芽','先找回资源，再决定是否补种'],P19:['装点我的牧场','只改变风景，不改变生产收益']};
  function shell(ctx, content, options = {}) {
    const head = heads[ctx.id] || heads.P13;
    return `<div class="mg-root ${options.cls || ''}" data-reduced-motion="${!!ctx.state.settings.reducedMotion}"><section class="mg-viewport"><header class="mg-header"><div><span class="mg-eyebrow">牧场生活</span><h2>${E(head[0])}</h2><p>${E(head[1])}</p></div><div class="mg-wallet" aria-label="当前牧场资产">${ctx.item('wheat')}<span>${ctx.state.inventory.wheat || 0}</span><b>金币 ${ctx.state.coins}</b></div></header>${content}</section></div>`;
  }
  function wire(ctx, render, handler, onStoreUpdate = render) {
    const click = event => {
      const target = event.target.closest('[data-mg]');
      if (target && ctx.root.contains(target) && !target.disabled) handler(target.dataset.mg, target, event);
    };
    ctx.root.addEventListener('click', click);
    const unsubscribe = ctx.subscribe(() => {
      // Clock/store notifications must not destroy a native picker or an in-progress edit.
      // Explicit actions still render immediately; the real production clock keeps running.
      const active = ctx.doc.activeElement;
      if (active && ctx.root.contains(active) && active.matches?.('input, textarea, select')) return;
      onStoreUpdate();
    });
    let disposed = false;
    const cleanup = () => { if (disposed) return; disposed = true; ctx.root.removeEventListener('click', click); unsubscribe(); };
    ctx.onExit(cleanup);
    return cleanup;
  }
  function paint(ctx, html) {
    const focused = ctx.root.contains(ctx.doc.activeElement) ? ctx.doc.activeElement : null;
    const focusKey = focused?.getAttribute('data-mg');
    const focusControl = focused?.hasAttribute('data-volume')?'[data-volume]':focused?.hasAttribute('data-font')?'[data-font]':focused?.hasAttribute('data-setting')?'[data-setting="'+focused.dataset.setting+'"]':null;
    const outer=ctx.root.querySelector('.mg-root'),outerScroll=outer?[outer.scrollTop,outer.scrollLeft]:null;
    const scrolls = Array.from(ctx.root.querySelectorAll('[data-keep-scroll]'), el => [el.dataset.keepScroll, el.scrollTop, el.scrollLeft]);
    ctx.root.innerHTML = html;
    const nextOuter=ctx.root.querySelector('.mg-root');if(nextOuter&&outerScroll){nextOuter.scrollTop=outerScroll[0];nextOuter.scrollLeft=outerScroll[1];}
    for (const [id, top, left] of scrolls) {
      const el = Array.from(ctx.root.querySelectorAll('[data-keep-scroll]')).find(e => e.dataset.keepScroll === id);
      if (el) { el.scrollTop = top; el.scrollLeft = left; }
    }
    if(focusControl)ctx.root.querySelector(focusControl)?.focus({preventScroll:true});
    if (focusKey) Array.from(ctx.root.querySelectorAll('[data-mg]')).find(el => el.dataset.mg === focusKey && !el.disabled)?.focus({preventScroll:true});
  }
  function transact(ctx, command, success) {
    const remainingBefore=command.type==='claimReward'?Object.values(ctx.state.rewards[command.receiptId]?.items||{}).reduce((a,b)=>a+b,0):0;
    const result = ctx.act(command);
    if(result.ok&&command.type==='claimReward'){const remaining=Object.values(ctx.state.rewards[command.receiptId]?.items||{}).reduce((a,b)=>a+b,0);if(remaining<remainingBefore){const records=claimedParts.get(ctx)||{};records[command.receiptId]=true;claimedParts.set(ctx,records);}}
    if (!result.ok) return {text: result.error?.message || result.message || result.error || '这一步没有完成，状态保持不变。', error:true};
    if (result.skipped?.length && !result.delta?.events?.length) return {text:result.skipped.map(s => s.message).join('；'),error:true};
    return {text:success || '操作已保存。',error:false};
  }
  const rewardItems = (ctx, items) => Object.entries(items || {}).filter(([, n]) => n > 0).map(([id,n]) => `<span class="mg-reward-item">${ctx.item(id)}${E(ctx.name(id))} ×${n}</span>`).join('');
  const receiptTitle = r => r.label || (r.source === 'level' ? '升级赠种' : r.source === 'stage' ? '故事首通礼物' : '待领实物');
  function receiptRows(ctx, includeClaimed = false) {
    const receipts = Object.values(ctx.state.rewards).filter(r => includeClaimed || !r.claimed);
    return receipts.length ? receipts.map(r => `<article class="mg-receipt"><div>${badge(r.claimed ? '已领取' : claimedParts.get(ctx)?.[r.id] ? '部分入仓 · 余量托管' : '待领取 · 托管中', r.claimed ? 'green' : 'amber')}<h3>${E(receiptTitle(r))}</h3><small>收据 ${E(r.id)}</small><div class="mg-rewards">${r.claimed ? '已全部入仓，不会重复发奖。' : rewardItems(ctx,r.items)}</div></div>${r.claimed ? '' : btn('领取可装下部分',`claim:${r.id}`,'class="mg-primary"')}</article>`).join('') : '<div class="mg-empty">托管箱现在是空的。每份首通奖励只记一次。</div>';
  }
  const GUIDE = [
    ['T01','认识牧场入口','从房子进入牧场，回到地图时仍保留牧场状态。','P01'],
    ['T02','移动地图并回田','拖动空地，再用回田定位找回作物。','P01'],
    ['T03','一笔播种至少 3 田','拿起小麦，连续经过至少 3 块合法空田。','P02'],
    ['T04','喂养初始 3 只鸡','到鸡舍，用饲料喂养最初的 3 只鸡。','P04'],
    ['T05','第一次收获','小麦 2 分钟成熟。收获后开放牧场故事。','P02'],
    ['T06','收获后再播一田','留一份种子，开始下一轮生长。','P02'],
    ['T07','一笔保底回收','只出售多余库存，不把回收当作经验来源。','P08'],
    ['T08','认识双仓','分别打开粮仓和货仓，了解分仓与留种。','P08'],
    ['T09','保存合法布局','移动已有设施即可，不要求购买装饰。','P16'],
    ['T10','建成面包房','2 级开放，20 金币建造，10 秒后点完成。','P06'],
    ['T11','排入一批面包','3 小麦制作 1 面包，入队时一次扣料。','P05'],
    ['T12','饲料机开工','3 级开放饲料机，投料制作鸡饲料。','P05'],
    ['T13','收取第一轮鸡蛋','喂食 20 分钟后收蛋，再次喂养开始下一轮。','P04'],
    ['T14','完成 2 批面包','领取 2 批面包后，一次性获得 2 建设券。','P05'],
    ['T15','交第一张卡车单','只领取当前订单明示的金币与经验。','P11'],
    ['T16','完成 NPC 高价交易','75% 或 100% 档实际成交后领取金币。','P10'],
    ['T17','扩仓一次或达到 12 级','认识生产补给、运输选择券与材料补缺。','P08']
  ];
  scenes.P13 = function (ctx) {
    let tab = 'guide', feedback = '', error = false;
    function render() {
      const s=ctx.state, complete=Object.values(s.tutorial.completed||{}).filter(Boolean).length, nextTask=GUIDE.find(([id])=>!s.tutorial.completed?.[id])?.[0];
      const tabs = [['guide','教学'],['goals','经营目标'],['achievements','成就'],['rewards','待领奖']].map(([id,name])=>btn(name,`tab:${id}`,`role="tab" aria-selected="${tab===id}" class="${tab===id?'active':''}"`)).join('');
      let body='';
      if(tab==='guide') body=`<div class="mg-summary"><strong>已经学会 ${complete} / 17 件小事</strong>${badge(s.tutorial.skip?'已跳过就地提示':'就地提示开启',s.tutorial.skip?'':'green')}<progress value="${complete}" max="17"></progress><span>前往只定位对象，不会替你花钱或领取。</span></div><div class="mg-task-list">${GUIDE.map(([id,title,text,destination])=>`<article class="mg-task ${s.tutorial.completed[id]?'done':''}"><span class="mg-task-check">${s.tutorial.completed[id]?'✓':id.slice(1)}</span><div><h3>${E(title)}</h3><p>${E(text)}</p><small>${s.tutorial.completed[id]?'已完成':id===nextTask?'进行中':'未开始'} · ${id}</small></div>${btn('前往',`goto:${destination}:${id}`)}</article>`).join('')}</div>${btn('跳过教学提示','skip',s.tutorial.skip?'disabled':'')}`;
      if(tab==='goals') body=`<p class="mg-note">经营目标沿用原教学记录，不添加额外金币、经验或每日任务奖励。</p><div class="mg-task-list">${GUIDE.filter(([id])=>['T05','T06','T11','T14','T15','T16'].includes(id)).map(([id,title,text,destination])=>`<article class="mg-task"><span class="mg-task-check">${s.tutorial.completed[id]?'✓':'○'}</span><div><h3>${E(title)}</h3><p>${E(text)}</p>${id==='T14'?badge('一次性 2 建设券'):badge('原经营进度')}</div>${btn('去看看',`goto:${destination}:${id}`)}</article>`).join('')}</div>`;
      if(tab==='achievements') body=`<p class="mg-note">成就自动授予铜、银、金装饰，不发金币或经验。已获装饰可以去外观册摆放。</p><div class="mg-achievements">${Object.entries(ctx.config.ACHIEVEMENTS).map(([key,c],i)=>{const n=key==='machineTypes'?new Set(s.entities.filter(e=>e.kind==='machine'&&e.built).map(e=>e.machineType)).size:s.stats[key]||0;const tier=n>=c.thresholds[2]?2:n>=c.thresholds[1]?1:0;return `<article><img src="${ctx.asset(`decor/badges/g${String(i+1).padStart(2,'0')}-${['bronze','silver','gold'][tier]}.svg`)}" alt="${E(c.name)}徽章"><h3>${E(c.name)}</h3><p>累计 ${n}</p><progress value="${Math.min(n,c.thresholds[tier])}" max="${c.thresholds[tier]}"></progress><div>${c.thresholds.map((v,j)=>badge(`${['铜','银','金'][j]} ${v}${s.decorations[`badge_${key}_${j+1}`]?' ✓':''}`,n>=v?'green':'')).join('')}</div></article>`;}).join('')}</div>${btn('前往外观册','goto:P19:成就')}`;
      if(tab==='rewards')body=`<p class="mg-note">达到物品等级且仓库有空间时可以部分领取，剩余继续托管。重复点击不会重复发奖。</p><div class="mg-storage-readout">粮仓 ${ctx.core.storageUsed(s,'silo')} / ${s.storage.silo.capacity} · 货仓 ${ctx.core.storageUsed(s,'barn')} / ${s.storage.barn.capacity}</div>${receiptRows(ctx,true)}${btn('前往仓库腾空间','goto:P08:奖励')}`;
      paint(ctx,shell(ctx,`<nav class="mg-tabs" role="tablist" aria-label="成长手记分类">${tabs}</nav>${feedback?status(feedback,error):''}${body}`));
    }
    const cleanup=wire(ctx,render,(action)=>{
      if(action.startsWith('tab:')){tab=action.split(':')[1];feedback='';render();}
      if(action.startsWith('claim:')){const r=transact(ctx,{type:'claimReward',receiptId:action.slice(6)},'可装下的奖励已入仓，剩余仍在托管箱。');feedback=r.text;error=r.error;render();}
      if(action==='skip'){const r=transact(ctx,{type:'tutorialEvent',event:'skip'},'已关闭牧场就地教学提示，手记仍可随时查看。');feedback=r.text;error=r.error;render();}
      if(action.startsWith('goto:')){const [,target,task]=action.split(':');ctx.openScene(target,{task});}
    });render();return cleanup;
  };


  scenes.P14 = scenes.P15 = function(ctx) {
    let selected = Math.max(0, ctx.state.branch.active?.level ?? 0), feedback = '', error = false;
    const stages = FARM_STAGES;
    function available(i) { return ctx.state.features?.farmLinkageEnabled!==false && !!ctx.state.branch.unlocked && (i === 0 || !!ctx.state.branch.stages[stages[i-1].stageId]?.won); }
    function label(i) { const r=ctx.state.branch.stages[stages[i].stageId]; return !available(i)?'待解锁':r?.won?(r.receiptId&&!ctx.state.rewards[r.receiptId]?.claimed?'待领奖':'已通过'):'可以开始'; }
    function render() {
      const s=ctx.state, stage=stages[selected], record=s.branch.stages[stage.stageId], active=s.branch.active;
      paint(ctx,shell(ctx,`${feedback?status(feedback,error):''}${!s.branch.unlocked?'<p class="mg-note">完成第一次收获后，牧场故事会开放。牌局进度与首通奖励独立保存。</p>':''}<div class="mg-story-map" style="--story-bg:url('${ctx.asset('decor/match-background-meadow.svg')}')"><div class="mg-story-trail" aria-hidden="true"></div><div class="mg-stage-nodes">${stages.map((st,i)=>btn(`<span class="mg-node-number">${i+1}</span><span>${label(i)}</span>`,`node:${i}`,`class="mg-stage-node ${available(i)?s.branch.stages[st.stageId]?.won?'won':'open':'locked'} ${i===selected?'selected':''}" aria-pressed="${selected===i}" aria-label="第 ${i+1} 关 ${E(st.label)} ${label(i)}"`)).join('')}</div></div><section class="mg-stage-preview"><div><span class="mg-eyebrow">${E(stage.stageId)}</span><h3>第 ${selected+1} 关 · ${E(stage.label)}</h3><p>${record?.won?'重玩只更新最好成绩，不会重复发放首通奖励。':'三张同类自动消除；篮子最多容纳七张牌。返回牧场会保留牌面、计时和道具。'}</p>${badge(label(selected))}</div>${btn(active?.level===selected&&active.status!=='won'?'继续牌局':record?.won?'重玩这一关':'开始这一关','start',available(selected)?'class="mg-primary"':'disabled')}</section><section class="mg-paper"><h3>故事礼物</h3>${receiptRows(ctx)}</section>`,{cls:'mg-branch'}));
    }
    function start(confirmed=false) {
      const active=ctx.state.branch.active;
      if(!available(selected)){feedback='请先完成前置收获或上一关。';error=true;render();return;}
      if(!confirmed&&active&&active.level!==selected&&active.status!=='won'){
        ctx.confirm({title:'切换到另一关？',body:'<p>当前未完成牌面将被新关卡替换；已经获得的奖励不变。取消可继续原牌局。</p>',onConfirm:()=>start(true)});return;
      }
      Promise.resolve(ctx.startStage(stages[selected].stageId,undefined,confirmed)).then(r=>{if(r?.ok===false){feedback=r.message||r.error?.message||'牌局未能开始，进度未改变。';error=true;render();}});
    }
    const cleanup=wire(ctx,render,action=>{
      if(action.startsWith('node:')){selected=Number(action.slice(5));render();}
      if(action==='start')start();
      if(action.startsWith('claim:')){const r=transact(ctx,{type:'claimReward',receiptId:action.slice(6)},'可装下的奖励已入仓，余量继续托管。');feedback=r.text;error=r.error;render();}
    });render();return cleanup;
  };
  scenes.P18 = function(ctx){
    let selected=null,feedback='',error=false,loanHarvested=false;
    function render(){
      const s=ctx.state,r=ctx.core.rescueEligibility(s),fields=s.entities.filter(e=>e.kind==='field'),empty=fields.filter(e=>!e.crop),active=fields.find(e=>e.crop?.rescue),crop=ctx.config.CROPS.wheat;
      const resources=[];
      for(const e of s.entities){
        if(e.kind==='field'&&e.crop)resources.push(`<article class="mg-recovery-source">${ctx.item(e.crop.itemId)}<div><strong>田地 ${E(e.id)}</strong><p>${e.crop.rescue?'借种田 · 产 2 还 1 净 1':`${ctx.name(e.crop.itemId)} ×${e.crop.yieldCount}`} · ${e.crop.readyAt<=s.now?'已成熟':`还需 ${Math.ceil((e.crop.readyAt-s.now)/1000)} 秒`}</p></div>${btn('查看这块田',`field:${e.id}`)}</article>`);
        if(e.kind==='fruit'&&e.status==='ready')resources.push(`<article class="mg-recovery-source">${ctx.item(e.configId)}<div><strong>${E(ctx.name(e.configId))}可采收</strong><p>${E(e.id)} · ${ctx.config.FRUITS[e.configId].sequence[e.harvestStage]} 份</p></div>${btn('采收这株果树',`fruit:${e.id}`)}</article>`);
        if(e.kind==='shelter')for(const a of e.animals.filter(a=>a.status==='ready'))resources.push(`<article class="mg-recovery-source">${ctx.item(ctx.config.ANIMALS[a.configId].product)}<div><strong>动物产物可取回</strong><p>${E(e.id)} · ${E(a.id)}</p></div>${btn('收取产物',`animal:${e.id}:${a.id}`)}</article>`);
        if(e.kind==='machine'){
          if(e.completed.length)resources.push(`<article class="mg-recovery-source"><div><strong>${E(ctx.config.BUILDINGS[e.configId].name)} 成品</strong><p>${e.completed.length} 批可取回</p></div>${btn('收取成品',`machine:${e.id}`)}</article>`);
          for(const job of e.queue.filter(j=>j.startAt===null))resources.push(`<article class="mg-recovery-source"><div><strong>队列可退料</strong><div class="mg-rewards">${rewardItems(ctx,job.inputs)}</div></div>${btn('取消这批并退料',`cancel-job:${e.id}:${job.id}`)}</article>`);
        }
      }
      for(const box of s.npc.boxes.filter(b=>b.listing))resources.push(`<article class="mg-recovery-source">${ctx.img('buildings/NPC_Stall.svg')}<div><strong>${box.listing.status==='sold'?'已成交货款':'尚未成交货箱'}</strong><p>${E(box.id)} · ${box.listing.status==='sold'?`${box.listing.coins} 金币`:ctx.name(box.listing.itemId)+' ×'+box.listing.quantity}</p></div>${btn(box.listing.status==='sold'?'领回货款':'撤回货物',`stall:${box.id}`)}</article>`);
      if(s.materials.pending)resources.push(`<article class="mg-recovery-source">${ctx.item(s.materials.pending)}<div><strong>生产补给待领</strong><p>${E(ctx.name(s.materials.pending))} ×1，仓库有空位即可领回。</p></div>${btn('领回补给','claim-tool')}</article>`);
      if(s.materialChoices>0)resources.push(`<article class="mg-recovery-source"><div><strong>材料选择券 ${s.materialChoices} 枚</strong><p>兑换一份螺栓后可按配置回收，不会直接赠金币。</p></div>${btn('用 1 券兑换螺栓','redeem-bolt')}</article>`);
      if(s.materials.choiceReceipt?.remaining)resources.push(`<article class="mg-recovery-source"><div><strong>待领材料选择券</strong><p>托管 ${s.materials.choiceReceipt.remaining} 枚，持有上限 20 枚。</p></div>${btn('领取可持有部分','claim-choices')}</article>`);
      const current=fields.find(e=>e.id===selected);
      const explanation=r.activeLoan?'已有一块借种田。等待成熟收获后，再判断后续经营。':r.eligible&&!empty.length?'符合资产条件，但没有空田。先收获或等待腾出空田。':r.eligible?'现在可以借种。请选一块空田，确认后直接在田里发芽。':'还有可恢复资产。先取回、出售或正常补种，再重新判断。';
      paint(ctx,shell(ctx,`${feedback?status(feedback,error):''}<section class="mg-rescue-summary"><div class="mg-rescue-art">${ctx.item('wheat')}</div><div><h3>${r.activeLoan?'一份借种，一次重新开始':r.eligible?'可以重新播下希望':'先找回自己的资源'}</h3><p>${explanation}</p><div>${badge(`可恢复小麦 ${r.recoverableWheat} 份`,r.recoverableWheat?'green':'')}${badge(`可恢复资产估值 ${r.recoverableCoins} 金币`)}${badge(`合法空田 ${empty.length} 块`)}</div></div></section><p class="mg-loan-contract">借 1 → 长 2 → 自动还 1 → 净入仓 1。借种不赠金币，也不发可倒卖的免费种包。</p><section class="mg-rescue-fields"><h3>选择具体田块</h3><div class="mg-field-grid">${fields.map((e,i)=>btn(`${e.crop?ctx.item(e.crop.itemId):'<span class="mg-soil"></span>'}<span>田 ${i+1}</span><small>${e.crop?.rescue?'借种田':e.crop?e.crop.readyAt<=s.now?'可收获':'生长中':'空田'}</small>`,`field:${e.id}`,`class="mg-field ${selected===e.id?'selected':''} ${e.crop?.rescue?'loan':''}" aria-label="田${i+1}，${e.crop?.rescue?'借种小麦':e.crop?'有作物':'空田'}，坐标${e.x},${e.y}" aria-pressed="${selected===e.id}"`)).join('')}</div>${current?`<div class="mg-selected-field"><strong>已选 ${E(current.id)} · ${current.x},${current.y}</strong>${!current.crop&&r.eligible?btn('在这块空田借种','borrow','class="mg-primary"'):''}${current.crop&&current.crop.readyAt<=s.now?'<p>直接点击上方成熟作物即可收获；借种自动还 1 留 1。</p>':''}${current.crop&&current.crop.readyAt>s.now?`<p>还需 ${Math.ceil((current.crop.readyAt-s.now)/1000)} 秒。生产按实际时间推进，不会自动收取。</p>`:''}${!current.crop&&(s.inventory.wheat||0)>0?btn(`${ctx.item('wheat')} 使用库存小麦播种`,'plant','class="mg-seed-chip"'):''}${btn('取消选择','cancel-selection')}</div>`:'<p class="mg-note">点击成熟作物直接收获；空田仅查看，不会自动借种或播种。</p>'}</section><section class="mg-paper"><h3>先检查可取回资源</h3>${resources.length?resources.join(''):'<p class="mg-note">当前田地、动物、机器和货箱没有可取回产物。</p>'}${Object.values(s.rewards).some(r=>!r.claimed)?receiptRows(ctx):''}${Object.entries(s.inventory).filter(([,n])=>n>0).map(([id,n])=>`<article class="mg-recovery-source">${ctx.item(id)}<div><strong>${E(ctx.name(id))} ×${n}</strong><p>${ctx.config.CROPS[id]?'最后一份种子受保护':''}</p></div>${(ctx.config.ITEMS[id]?.M10||ctx.config.ITEMS[id]?.sellPrice!==undefined)?btn('回收 1 份',`sell:${id}`,ctx.config.CROPS[id]&&n<=1?'disabled':''):''}</article>`).join('')}</section><section class="mg-seed-shop">${ctx.item('wheat')}<div><h3>正常补种包</h3><p>10 份小麦 · ${crop.buyPrice} 金币</p><small>只有没有可恢复小麦时才能购买，需确认，不会自动付费。</small></div>${btn('查看补种条件','buy-seed',r.recoverableWheat>0?'disabled':'')}</section>`));
    }
    const cleanup=wire(ctx,render,action=>{
      if(action.startsWith('field:')){selected=action.slice(6);const field=ctx.state.entities.find(e=>e.id===selected);if(field?.crop&&field.crop.readyAt<=ctx.state.now)action='harvest';else render();}
      if(action==='cancel-selection'){selected=null;render();}
      let command=null,success='资源已取回，借种资格已重新计算。';
      if(action==='borrow'&&selected)ctx.confirm({title:'在这块空田直接借种？',body:`<p>田块 ${E(selected)}。借 1 份小麦，成熟产 2 份并自动归还 1 份，净入仓 1 份。没有金币或库存种包赠送。</p>`,onConfirm(){const r=transact(ctx,{type:'rescue',entityId:selected},'借种已直接种入所选空田。等待成熟后收获，自动还 1 留 1。');feedback=r.text;error=r.error;render();}});
      if(action==='harvest'&&selected){const loan=ctx.state.entities.find(e=>e.id===selected)?.crop?.rescue;command={type:'harvest',entityIds:[selected]};success=loan?'借种收获完成：实际产 2，自动还 1，净入仓 1 小麦；金币没有增加。':'作物已收获，田块变为空田。';}
      if(action==='plant'&&selected){command={type:'plant',entityIds:[selected],itemId:'wheat'};success='已用 1 份库存小麦种回田里，没有免费增加种子。';}
      if(action.startsWith('claim:'))command={type:'claimReward',receiptId:action.slice(6)};
      if(action.startsWith('fruit:'))command={type:'harvest',entityIds:[action.slice(6)]};
      if(action==='claim-tool')command={type:'claimTool'};
      if(action==='redeem-bolt')command={type:'redeemMaterial',itemId:'bolt',quantity:1};
      if(action==='claim-choices')command={type:'claimMaterialChoices'};
      if(action.startsWith('animal:')){const [,entityId,animalId]=action.split(':');command={type:'collectAnimal',entityId,animalIds:[animalId]};}
      if(action.startsWith('machine:'))command={type:'collectMachine',entityId:action.slice(8)};
      if(action.startsWith('cancel-job:')){const [,entityId,jobId]=action.split(':');command={type:'cancelJob',entityId,jobId};}
      if(action.startsWith('stall:')){const boxId=action.slice(6);command={type:ctx.state.npc.boxes.find(b=>b.id===boxId).listing.status==='sold'?'claimStall':'cancelStall',boxId};}
      if(action.startsWith('sell:')){const itemId=action.slice(5);ctx.confirm({title:'回收这 1 份物品？',body:`<p>${E(ctx.name(itemId))} ×1 → ${ctx.core.recoveryPrice(itemId,1)} 金币。最后一份种子仍受保护。</p>`,onConfirm(){const r=transact(ctx,{type:'sell',itemId,quantity:1,confirmed:true},'已回收 1 份，资产估值与借种资格已重新计算。');feedback=r.text;error=r.error;render();}});}
      if(action==='buy-seed')ctx.confirm({title:'正常购买补种包？',body:`<p>10 份小麦，支付 ${ctx.config.CROPS.wheat.buyPrice} 金币。当前金币 ${ctx.state.coins}。取消零消耗；确认时会重新检查可恢复资源与仓容。</p>`,onConfirm(){const r=transact(ctx,{type:'repurchaseSeed',itemId:'wheat',quantity:10},'已支付配置价格，10 份小麦进入粮仓。选择空田可以继续种植。');feedback=r.text;error=r.error;render();}});
      if(command){const r=transact(ctx,command,success);feedback=r.text;error=r.error;if(command.type==='harvest'&&command.entityIds?.includes(selected)&&!ctx.state.entities.find(e=>e.id===selected)?.crop)selected=null;render();}
    });render();return cleanup;
  };

  const DECOR_ART={sign:'wood-sign',flowerpot:'flower-pot',haystack:'hay-bales',stone_stool:'stone-seat',flagpole:'flag',flower_fence:'flower-fence',wood_fence:'wood-fence',water_trough:'trough',flowerbed:'flower-bed',statue:'stone-statue',picnic_mat:'picnic',decor_flag:'meadow-banner',decor_windmill:'festival-windmill',decor_memorial:'land-memorial',decor_bridge:'reward-bridge'};
  function decorPath(id){
    if(id.startsWith('badge_')){const keys=['fieldHarvests','machineBatches','feeds','trucks','npcSales','storageUpgrades','landExpansions','machineTypes','layoutSaves','stageVictories'],match=id.match(/^badge_(.+)_([123])$/);if(match)return `decor/badges/g${String(keys.indexOf(match[1])+1).padStart(2,'0')}-${['bronze','silver','gold'][Number(match[2])-1]}.svg`;}
    return `decor/${DECOR_ART[id]||id.replaceAll('_','-')}.svg`;
  }
  function entityPicture(ctx,e,previewSkin){
    if(e.kind==='decoration')return ctx.img(decorPath(e.configId),ctx.config.decorationConfig(e.configId)?.name||e.configId);
    if(e.kind==='shelter'){const names={chicken:'Chicken',cow:'Cow',pig:'Pig',sheep:'Sheep',lamb:'Lamb'};return ctx.img(`buildings/${names[e.configId]}_Shelter${previewSkin||e.skinId?'_Floral':''}.svg`,`${ctx.name(e.configId)}栏舍`);}
    if(e.kind==='house')return ctx.img('buildings/Farmhouse.svg','农舍');
    if(e.kind==='barn')return ctx.img('buildings/Barn.svg','货仓');
    if(e.kind==='silo')return ctx.img('buildings/Silo.svg','粮仓');
    if(e.kind==='field')return e.crop?ctx.item(e.crop.itemId):'<span class="mg-soil"></span>';
    if(e.kind==='machine'){const name={bakery:'Bakery',feed_mill:'Feed_Mill',dairy:'Dairy',sugar_mill:'Sugar_Mill',popcorn_pot:'Popcorn_Pot',bbq_grill:'BBQ_Grill',pie_oven:'Pie_Oven',loom:'Loom',sewing_machine:'Sewing_Machine',cake_oven:'Cake_Oven',juice_press:'Juice_Press',ice_cream_maker:'Ice_Cream_Maker'}[e.configId];return name?ctx.img(`buildings/${name}.svg`,ctx.name(e.configId)):'<span>⚙</span>';}
    if(e.kind==='fruit')return ctx.item(e.configId);
    if(e.kind==='obstacle')return '<span class="mg-map-rock" aria-hidden="true">●</span>';
    return '';
  }
  scenes.P19=function(ctx){
    let tab='decor',pending=null,preview=null,appearanceUndo=null,selectedEntity=null,feedback='',error=false,placementFeedback='',mapScroll=null,drag=null;
    const config=id=>ctx.config.decorationConfig(id);
    function candidateCommand(p=pending){return p.mode==='owned'?{type:'placeDecoration',configId:p.id,x:p.x,y:p.y,rotation:p.rotation}:p.mode==='stored'?{type:'applyLayout',positions:ctx.state.entities.map(e=>({id:e.id,x:e.id===p.entityId?p.x:e.x,y:e.id===p.entityId?p.y:e.y,rotation:e.id===p.entityId?p.rotation:e.rotation,stored:e.id===p.entityId?false:!!e.stored}))}:{type:'buy',category:'decoration',itemId:p.id,x:p.x,y:p.y,rotation:p.rotation};}
    function checkPlacement(p=pending){try{ctx.core.executeFarm(ctx.state,candidateCommand(p),ctx.state.now);return{ok:true};}catch(err){return{ok:false,message:err.message};}}
    function findLocation(p){
      const state=ctx.state,c=config(p.id),existing=state.entities.find(e=>e.id===p.entityId);
      const entity=existing?{...existing,stored:false,rotation:p.rotation}:{id:'placement-preview',kind:'decoration',configId:p.id,w:c.footprint[0],h:c.footprint[1],rotation:p.rotation,walkable:!!c.walkable,stored:false};
      return {...p,...(ctx.layout.findFreePlacement(state,entity,{around:{x:28,y:28}})||{x:28,y:28})};
    }
    function beginPlace(id,mode,entityId){pending=findLocation({id,mode,entityId,x:28,y:28,rotation:0});selectedEntity=null;preview=null;placementFeedback='';render();ctx.win.requestAnimationFrame(()=>centerMap(pending?.x??28,pending?.y??28));}
    function centerMap(x,y){const map=ctx.root.querySelector('.mg-place-scroll');if(map){map.scrollLeft=x*44-map.clientWidth/2+22;map.scrollTop=y*44-map.clientHeight/2+22;}}
    function map(){
      const s=ctx.state,p=pending,check=p&&checkPlacement(),size=p&&config(p.id)?.footprint||[1,1],w=p?.rotation%180?size[1]:size[0],h=p?.rotation%180?size[0]:size[1];
      return `<div class="mg-placement"><div class="mg-placement-title"><div><h3>${p?'待摆放 · '+E(config(p.id)?.name):'已经摆在农场的装饰'}</h3><p>${p?(p.mode==='buy'?`${config(p.id).coins} 金币，确认合法位置才购买`:'已有装饰，不重复扣款')+' · 按住半透明物件拖到格子，确认才落地':'点击装饰查看或收起；生产设施不能收起。'}</p></div>${p?btn('取消摆放','cancel-place'):''}</div><div class="mg-place-scroll" data-keep-scroll="decor-map" tabindex="0" aria-label="农场摆放预览，可滚动查看地图"><div class="mg-placement-world">${btn('','map-position',`class="mg-map-grid" aria-label="点击选择摆放位置，也可使用下方坐标输入" ${p?'':'tabindex="-1"'}`)}${s.entities.filter(e=>!e.stored).map(e=>{const f=ctx.layout.getFootprint(e);return `<div class="mg-map-entity ${e.kind==='decoration'?'decor':''} ${e.id===selectedEntity?'selected':''}" style="left:${e.x*44}px;top:${e.y*44}px;width:${f.w*44}px;height:${f.h*44}px" ${e.kind==='decoration'?`data-mg="entity:${E(e.id)}" role="button" tabindex="0" aria-label="${E(config(e.configId)?.name||e.id)}，坐标${e.x},${e.y}"`:''}>${entityPicture(ctx,e)}</div>`;}).join('')}${p?`<div data-mg-drag="placement" class="mg-placement-ghost ${check.ok?'valid':'invalid'}" style="left:${p.x*44}px;top:${p.y*44}px;width:${w*44}px;height:${h*44}px">${ctx.img(decorPath(p.id))}<strong>${check.ok?'✓':'×'}</strong></div>`:''}</div></div>${p?`<div class="mg-placement-controls"><label>X<input data-place-x type="number" min="0" max="63" value="${p.x}"></label><label>Y<input data-place-y type="number" min="0" max="63" value="${p.y}"></label>${btn('定位坐标','position')}${btn(`旋转 ${p.rotation}°`,'rotate')}${btn('找一处合法位置','find-position')}</div><div class="mg-placement-result ${check.ok?'valid':'invalid'}">${check.ok?'✓ 占地、门口与通行校验通过':E(check.message)}</div><div class="mg-actions">${btn(p.mode==='buy'?`确认摆放并付 ${config(p.id).coins} 金币`:'确认摆放','apply-place',check.ok?'class="mg-primary"':'disabled')}${btn('取消，零消耗','cancel-place')}</div>`:''}</div>`;
    }
    function render(){
      const s=ctx.state;let content='';
      if(tab==='decor'){
        const owned=Object.entries(s.decorations).filter(([id,n])=>n>0&&config(id));
        content=`<p class="mg-note">16 种原装饰明码标价；所有摆位通过原布局校验。不会增加产量、速度或收入。</p>${pending?map():''}<div class="mg-decor-shop">${Object.values(ctx.config.DECORATIONS).map(d=>`<article class="mg-decor-product">${ctx.img(decorPath(d.id),d.name)}<h3>${E(d.name)}</h3><p>${d.coins} 金币 · ${d.footprint.join('×')} 格</p>${btn('拿起预览',`buy:${d.id}`)}</article>`).join('')}</div><section class="mg-paper"><h3>我已经拥有的</h3>${owned.length?`<div class="mg-owned-grid">${owned.map(([id,n])=>{const all=s.entities.filter(e=>e.kind==='decoration'&&e.configId===id),free=n-all.length,stored=all.filter(e=>e.stored);return `<article>${ctx.img(decorPath(id),config(id).name)}<h4>${E(config(id).name)}</h4><small>拥有 ${n} · 摆出 ${all.length-stored.length} · 收起 ${stored.length} · 未摆 ${free}</small>${free>0?btn('免费摆出',`owned:${id}`):''}${stored.map(e=>btn('摆出已收起装饰',`stored:${e.id}`)).join('')}${all.filter(e=>!e.stored).map(e=>btn('定位已摆装饰',`locate:${e.id}`)).join('')}</article>`;}).join('')}</div>`:'<p>还没有收藏。购买或获得首通/成就礼物后会出现在这里。</p>'}</section>${!pending?map():''}${selectedEntity?`<div class="mg-selected-decor"><strong>${E(config(s.entities.find(e=>e.id===selectedEntity)?.configId)?.name||selectedEntity)}</strong>${btn('收起这件装饰','store')}${btn('取消选择','cancel-entity')}</div>`:''}`;
      }
      if(tab==='skins'){
        content=`<p class="mg-note">已获得外观点一下立即应用，可撤销最近一次更换；不购买、不解锁，动物状态和计时不变。</p>${appearanceUndo?`<div class="mg-appearance-undo"><span>已更换${appearanceUndo.kind==='skin'?'栏舍外观':'故事背景'}，可恢复上一次样式。</span>${btn('撤销这次更换','undo-appearance')}</div>`:''}<div class="mg-skins">${Object.values(ctx.config.COSMETICS).filter(c=>c.target).map(c=>{const entities=s.entities.filter(e=>e.kind==='shelter'&&e.configId===c.target),owned=s.decorations[c.id]>0;return `<article>${ctx.img(`buildings/${c.target==='chicken'?'Chicken':'Sheep'}_Shelter_Floral.svg`,c.name)}<div><h3>${E(c.name)}</h3>${badge(owned?'已获得':'未获得',owned?'green':'')}<p>${c.id==='skin_coop'?'第 5 关首通获得':'第 23 关首通获得'}</p>${entities.map(e=>btn(e.skinId===c.id?'使用中':'应用到此栏舍',`skin:${c.id}:${e.id}`,owned&&e.skinId!==c.id?'':'disabled')).join('')}${!entities.length?'<p>当前牧场没有对应栏舍。</p>':''}</div></article>`;}).join('')}</div><h3>故事牌局背景</h3><div class="mg-backgrounds">${[['default','默认春日','decor/match-background-meadow.svg'],['background_1','春田晨光','decor/match-background-meadow.svg'],['background_2','牧野星光','decor/match-background-harvest.svg']].map(([id,label,path])=>`<article><img src="${ctx.asset(path)}" alt="${label}"><h4>${label}</h4>${badge(s.cosmetics.background===id?'使用中':id==='default'||s.ledger[id]?'已获得':'未获得')}${btn(s.cosmetics.background===id?'使用中':'直接应用',`background:${id}`,(id==='default'||s.ledger[id])&&s.cosmetics.background!==id?'':'disabled')}</article>`).join('')}</div>`;
      }
      if(tab==='seasons')content=`<section class="mg-paper"><h3>回到四季小院</h3><p>四季主线保留在原来的小院入口；牧场不会另外添加季节货币或奖励。离开牧场会保留生产和故事进度。</p>${btn('回小院，查看四季','seasons-home','class="mg-primary"')}</section>`;
      paint(ctx,shell(ctx,`<nav class="mg-tabs" role="tablist" aria-label="外观分类">${[['decor','装饰陈列'],['skins','外观册'],['seasons','季节入口']].map(([id,label])=>btn(label,`tab:${id}`,`role="tab" aria-selected="${tab===id}" class="${tab===id?'active':''}"`)).join('')}</nav>${feedback?status(feedback,error):''}${content}`));
    }
    const cleanup=wire(ctx,render,(action,target,event)=>{
      if(action.startsWith('tab:')){tab=action.slice(4);preview=null;pending=null;appearanceUndo=null;feedback='';render();}
      if(action.startsWith('buy:'))beginPlace(action.slice(4),'buy');
      if(action.startsWith('owned:'))beginPlace(action.slice(6),'owned');
      if(action.startsWith('stored:')){const e=ctx.state.entities.find(e=>e.id===action.slice(7));beginPlace(e.configId,'stored',e.id);}
      if(action==='cancel-place'){pending=null;feedback='已取消摆放，金币、装饰库存与地图均未改变。';error=false;render();}
      if(action==='map-position'&&pending){const box=ctx.root.querySelector('.mg-placement-world').getBoundingClientRect();pending.x=Math.floor((event.clientX-box.left)/44);pending.y=Math.floor((event.clientY-box.top)/44);render();}
      if(action.startsWith('cell:')&&pending){const [,x,y]=action.split(':');pending.x=Number(x);pending.y=Number(y);render();}
      if(action==='position'&&pending){pending.x=Number(ctx.root.querySelector('[data-place-x]').value);pending.y=Number(ctx.root.querySelector('[data-place-y]').value);render();centerMap(pending.x,pending.y);}
      if(action==='rotate'&&pending){pending.rotation=(pending.rotation+90)%360;render();}
      if(action==='find-position'&&pending){pending=findLocation(pending);render();centerMap(pending.x,pending.y);}
      if(action==='apply-place'&&pending){const p={...pending},commit=()=>{const r=transact(ctx,candidateCommand(p),'装饰已真实摆入牧场地图。经济生产参数没有改变。');feedback=r.text;error=r.error;if(!r.error)pending=null;render();centerMap(p.x,p.y);};commit();}
      if(action.startsWith('locate:')||action.startsWith('entity:')){selectedEntity=action.split(':')[1];const e=ctx.state.entities.find(e=>e.id===selectedEntity);render();centerMap(e.x,e.y);}
      if(action==='cancel-entity'){selectedEntity=null;render();}
      if(action==='store'&&selectedEntity){const e=ctx.state.entities.find(e=>e.id===selectedEntity);if(e?.kind!=='decoration')return;const positions=ctx.state.entities.map(e=>({id:e.id,x:e.x,y:e.y,rotation:e.rotation,stored:e.id===selectedEntity?true:!!e.stored}));const r=transact(ctx,{type:'applyLayout',positions},'装饰已收起，仍在已拥有列表中，没有出售或生成金币。');feedback=r.text;error=r.error;selectedEntity=null;render();}
      if(action.startsWith('skin:')){
        const [,id,entityId]=action.split(':'),target=ctx.state.entities.find(e=>e.id===entityId);if(!target||target.skinId===id)return;
        const previous=target.skinId||null,r=transact(ctx,{type:'setSkin',skinId:id,entityId},'外观已应用；可撤销最近更换，动物状态与计时保持不变。');feedback=r.text;error=r.error;if(!r.error)appearanceUndo={kind:'skin',entityId,previous,applied:id};render();
      }
      if(action.startsWith('background:')){
        const id=action.slice(11),previous=ctx.state.cosmetics.background;if(previous===id)return;
        const r=transact(ctx,{type:'setBackground',background:id},'故事背景已应用，可撤销最近更换；没有经济奖励。');feedback=r.text;error=r.error;if(!r.error)appearanceUndo={kind:'background',previous,applied:id};render();
      }
      if(action==='undo-appearance'&&appearanceUndo){
        const undo=appearanceUndo,current=undo.kind==='skin'?ctx.state.entities.find(e=>e.id===undo.entityId)?.skinId:ctx.state.cosmetics.background;
        if(current!==undo.applied){appearanceUndo=null;feedback='外观已经有新变化，未覆盖当前选择。';error=true;render();return;}
        let result;
        if(undo.kind==='skin'&&!undo.previous){const r=ctx.restoreDefaultSkin?.(undo.entityId);result=r?.ok?{text:'已恢复默认栏舍外观，动物与生产进度未改变。',error:false}:{text:r?.error?.message||'无法恢复默认外观，当前状态未改动。',error:true};}
        else result=transact(ctx,undo.kind==='skin'?{type:'setSkin',entityId:undo.entityId,skinId:undo.previous}:{type:'setBackground',background:undo.previous},'已撤销最近一次外观更换。');
        feedback=result.text;error=result.error;if(!result.error)appearanceUndo=null;render();
      }
      if(action==='seasons-home')ctx.exitFarm();
    },()=>{if(!drag)render();});
    const keydown=event=>{const el=event.target.closest('.mg-map-entity[data-mg]');if(el&&(event.key==='Enter'||event.key===' ')){event.preventDefault();el.click();}};
    const pointerdown=event=>{
      if(!pending||event.button!==undefined&&event.button!==0||!event.target.closest('[data-mg-drag]'))return;
      drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,original:{...pending},moved:false,outside:false};
      ctx.root.setPointerCapture?.(event.pointerId);event.preventDefault();
    };
    const pointermove=event=>{
      if(!drag||drag.pointerId!==event.pointerId)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<6)return;
      const world=ctx.root.querySelector('.mg-placement-world'),viewport=ctx.root.querySelector('.mg-place-scroll');
      if(!world||!viewport)return;
      const box=world.getBoundingClientRect(),visible=viewport.getBoundingClientRect();
      drag.moved=true;drag.outside=event.clientX<visible.left||event.clientX>visible.right||event.clientY<visible.top||event.clientY>visible.bottom;
      if(!drag.outside){pending.x=Math.floor((event.clientX-box.left)/44);pending.y=Math.floor((event.clientY-box.top)/44);render();}
      event.preventDefault();
    };
    const finishDrag=(event,cancel)=>{
      if(!drag||drag.pointerId!==event.pointerId)return;
      const was=drag;drag=null;
      if(cancel||was.outside){pending=was.original;feedback='已取消这次拖动，预览回到原位置；没有购买或改动地图。';error=false;}
      else if(was.moved){feedback=checkPlacement().ok?'位置预览合法。仍需点击确认才会摆放或扣款。':'这个位置无法摆放。继续拖到合法空地，或取消；没有扣款。';error=!checkPlacement().ok;}
      if(ctx.root.hasPointerCapture?.(event.pointerId))ctx.root.releasePointerCapture(event.pointerId);render();
    };
    const pointerup=event=>finishDrag(event,false),pointercancel=event=>finishDrag(event,true);
    ctx.root.addEventListener('keydown',keydown);ctx.root.addEventListener('pointerdown',pointerdown);ctx.root.addEventListener('pointermove',pointermove);ctx.root.addEventListener('pointerup',pointerup);ctx.root.addEventListener('pointercancel',pointercancel);
    render();ctx.win.requestAnimationFrame(()=>centerMap(28,28));return()=>{drag=null;cleanup();ctx.root.removeEventListener('keydown',keydown);ctx.root.removeEventListener('pointerdown',pointerdown);ctx.root.removeEventListener('pointermove',pointermove);ctx.root.removeEventListener('pointerup',pointerup);ctx.root.removeEventListener('pointercancel',pointercancel);};
  };

  scenes.P17 = function(ctx) {
    let tab='audio',feedback='',error=false,jsonText='',pending=null,downloadUrl=null,lastPaintKey=null;
    const store=ctx.store;
    function note(result,success){error=result?.ok===false;feedback=error?(result.message||result.error?.message||String(result.error)||'未能保存'):success;render();}
    function render(){
      const s=ctx.state,info=store.getStatus(),volume=Math.round((ctx.getMusicVolume?.()??.35)*100);
      // Do not replace a live file picker or the user's text selection on one-second ticks.
      if(ctx.doc.activeElement&&ctx.root.querySelector('[data-import-text]')===ctx.doc.activeElement)return;
      // Native file pickers can move focus outside the document. Keep the input node
      // stable on time-only commits, without freezing real production or save writes.
      const paintKey=JSON.stringify({tab,feedback,error,jsonText,pending,volume,settings:s.settings,
        coins:s.coins,level:s.level,wheat:s.inventory.wheat,readOnly:store.readOnly,
        saveError:info.error??null,saveMessage:info.message??null,warnings:info.warnings||[],recoveryRequired:!!info.recoveryRequired});
      if(paintKey===lastPaintKey)return;
      lastPaintKey=paintKey;
      let content='';
      if(tab==='audio')content=`<section class="mg-paper"><h3>音画偏好</h3>${[['sound','农场音效','点击、生产与收获声音'],['music','背景音乐','沿用小院的音乐设置'],['reducedMotion','减少动态','停止轻晃与光晕，减少界面动画']].map(([id,label,desc])=>`<label class="mg-setting"><span><strong>${label}</strong><small>${desc}</small></span><input type="checkbox" data-setting="${id}" ${s.settings[id]?'checked':''}><span>${s.settings[id]?'开启':'关闭'}</span></label>`).join('')}<label class="mg-setting range"><span><strong>音乐音量 ${volume}%</strong></span><input data-volume type="range" min="0" max="100" value="${volume}" aria-label="音乐音量"></label><p class="mg-note">偏好立即保存；关闭音效不会影响生产计时。</p></section>`;
      if(tab==='backup')content=`<section class="mg-paper"><h3>给牧场留一份备份</h3><div class="mg-save-facts"><span>修订 <b>${s.revision}</b></span><span>等级 <b>${s.level}</b></span><span>金币 <b>${s.coins}</b></span><span>状态 <b>${store.readOnly?'只读':'可保存'}</b></span></div><p class="mg-note">进度保存在本浏览器，不是云备份。清理网站数据或退出隐私模式可能丢失。导入先校验，确认替换时自动备份当前存档。</p><div class="mg-actions">${btn('导出 JSON 存档','export','class="mg-primary"')}${btn('显示可复制文本','show-export')}${store.readOnly?btn('尝试接管写入','takeover'):''}</div><div class="mg-import-zone"><label class="mg-file-label">选择存档文件<input type="file" accept="application/json,.json" data-import-file></label><label>或粘贴存档文本<textarea data-import-text rows="6">${E(jsonText)}</textarea></label>${btn('校验存档，先不替换','validate')}${pending?`<div class="mg-import-preview"><h4>校验通过，等待确认</h4><p>当前 ${s.level} 级、${s.coins} 金币 → ${pending.summary.level} 级、${pending.summary.coins} 金币。确认后替换当前牧场。</p>${btn('确认替换牧场存档','confirm-import','class="mg-danger"')}${btn('取消，不替换','cancel-import')}</div>`:''}</div><h3>本机自动快照</h3>${store.recoveries().map(r=>`<article class="mg-receipt"><div><strong>${r.level} 级 · ${r.coins} 金币</strong><p>${E(new Date(r.savedAtWallMs).toLocaleString())} · 修订 ${r.revision}</p></div>${btn('预览恢复',`recover:${r.revision}`)}</article>`).join('')||'<p>尚无可恢复的有效快照。</p>'}</section>`;
      if(tab==='help')content=`<section class="mg-paper"><h3>牧场小贴士</h3>${[['生产与离线','生产按真实时间推进。离线只完成已经安排的作物、动物和队列，不自动重新播种、喂食或收货。'],['采收与连续播种','成熟作物直接点收。空田不会自动种植：明确选择种子后可连续点击空田，完成后退出播种。'],['双仓与托管','种植产物进入粮仓，加工品与工具进入货仓。首通奖励仓满时继续托管，不会消失或重复发奖。'],['最后一份种子','普通回收保护最后一份种子。没有可恢复小麦和足够资产时，可以在空田借种，成熟后自动还一留一。'],['回小院与牌局','离开牧场或牌局不会清空进度。主动切换未完成关卡或重开时才需要确认。'],['保存失败','保存失败的操作不会生效。先导出存档，释放浏览器存储空间；若出现只读冲突，请关闭另一窗口再尝试接管。']].map(([title,text])=>`<details class="mg-help"><summary>${title}</summary><p>${text}</p></details>`).join('')}<p class="mg-note">键盘 Tab 移动焦点，Enter 或空格激活；地图方向键移动视野，Escape 取消当前工具或预览。</p></section>`;
      paint(ctx,shell(ctx,`<nav class="mg-tabs" role="tablist" aria-label="设置分类">${[['audio','音画'],['backup','存档与恢复'],['help','帮助']].map(([id,label])=>btn(label,`tab:${id}`,`role="tab" aria-selected="${id===tab}" class="${id===tab?'active':''}"`)).join('')}</nav>${feedback?status(feedback,error):''}${(info.warnings||[]).map(t=>status(t,true)).join('')}${info.message?status(info.message,true):''}${content}`));
    }
    function validate(text){jsonText=text;try{JSON.parse(text);}catch{pending=null;note({ok:false,message:'存档文本不是有效 JSON，未替换当前进度。'});return;}const result=store.importPreview(text);pending=result.ok?result:null;note(result,'校验通过，尚未替换。请核对等级和金币，再确认。');}
    function exportFile(download){
      jsonText=store.exportSave();pending=null;
      if(download)try{if(downloadUrl)ctx.win.URL.revokeObjectURL(downloadUrl);downloadUrl=ctx.win.URL.createObjectURL(new ctx.win.Blob([jsonText],{type:'application/json'}));const a=ctx.doc.createElement('a');a.href=downloadUrl;a.download='sheep-match-farm-save.json';ctx.root.append(a);a.click();a.remove();}catch(err){note({ok:false,message:`下载未能启动：${err.message}。仍可复制下方完整文本。`});return;}
      note({ok:true},download?'存档文件已交给浏览器下载，导出文本也保留在下方。':'完整存档文本已准备好，可复制另存为 JSON。');
    }
    const cleanup=wire(ctx,render,action=>{
      if(action.startsWith('tab:')){tab=action.slice(4);feedback='';render();}
      if(action==='export'||action==='show-export')exportFile(action==='export');
      if(action==='validate')validate(ctx.root.querySelector('[data-import-text]').value);
      if(action==='cancel-import'){pending=null;note({ok:true},'已取消导入，现有牧场不变。');}
      if(action==='confirm-import'&&pending){
        // Time ticks may advance revision after preview. Revalidate the exact reviewed bytes,
        // then synchronously commit its fresh token; never apply an unchecked snapshot.
        const fresh=store.importPreview(jsonText),result=fresh.ok?store.confirmImport(fresh.token):fresh;
        if(result.ok)pending=null;note(result,'存档已校验并恢复，导入前存档已备份。');
      }
      if(action.startsWith('recover:')){const result=store.recoveryPreview(Number(action.slice(8)));if(result.ok){jsonText=result.text;pending=result;}note(result,'快照校验通过。请核对等级和金币，确认后才恢复。');}
      if(action==='takeover')Promise.resolve(store.takeover()).then(ok=>note({ok,message:'尚未取得写入权，请关闭另一窗口后重试。'},'本窗口已取得写入权。'));
    });
    const input=event=>{if(event.target.matches('[data-import-text]')){jsonText=event.target.value;pending=null;}};
    const change=async event=>{
      const el=event.target;
      if(el.matches('[data-setting]'))note(ctx.act({type:'setSettings',settings:{[el.dataset.setting]:el.checked}}),'音画偏好已保存。');
      if(el.matches('[data-volume]')){ctx.onMusicVolumeChange?.(Number(el.value)/100);render();}
      if(el.matches('[data-import-file]')&&el.files?.[0]){const file=el.files[0];if(file.size>10*1024*1024){note({ok:false,message:'文件超过 10 MB，未读取或替换。'});return;}try{validate(await file.text());}catch(err){note({ok:false,message:`读取失败：${err.message}`});}}
    };
    ctx.root.addEventListener('input',input);ctx.root.addEventListener('change',change);render();
    return()=>{cleanup();ctx.root.removeEventListener('input',input);ctx.root.removeEventListener('change',change);if(downloadUrl)ctx.win.URL.revokeObjectURL(downloadUrl);};
  };

export const MANAGEMENT_SCENES = Object.freeze(['P13','P14','P15','P17','P18','P19']);
export function mountManagementScene(ctx) {
  if(!scenes[ctx.id]) throw new Error(`Unknown management scene: ${ctx.id}`);
  return scenes[ctx.id](ctx);
}
