/* P07–P11: original art, dedicated containers, original transactional economy. */
  const titles = { P07: '丰收小铺', P08: '仓房里的收藏', P09: '商人的补给架', P10: '我的路边货摊', P11: '小卡车出发啦' };
  const decoArt = { sign: 'wood-sign', flowerpot: 'flower-pot', haystack: 'hay-bales', windmill: 'festival-windmill', stone_stool: 'stone-seat', flagpole: 'flag', flower_fence: 'flower-fence', wood_fence: 'wood-fence', water_trough: 'trough', flowerbed: 'flower-bed', picnic_mat: 'picnic', statue: 'stone-statue' };
  const duration = ms => ms <= 0 ? '已就绪' : ms >= 3600000 ? `${Math.ceil(ms / 60000 / 6) / 10}小时` : `${Math.ceil(ms / 60000)}分钟`;
  const list = x => Object.values(x || {});
  const cropArtFiles={wheat:'c01-wheat',corn:'c02-corn',soybean:'c03-soybean',sugarcane:'c04-sugarcane',carrot:'c05-carrot',indigo:'c06-indigo',pumpkin:'c07-pumpkin',cotton:'c08-cotton',chili_pepper:'c09-pepper',black_bean:'c10-blackbean',tomato:'c11-tomato'};
  const fruitArtFiles={apple:'r01-apple',raspberry:'r02-raspberry',cherry:'r03-cherry',blackberry:'r04-blackberry',blueberries:'r05-blueberry'};
  // Keep live images, scroll containers and form controls mounted during updates.
  const nodeKey=node=>node.nodeType===1?(node.getAttribute('data-action')||node.getAttribute('data-check')||(node.hasAttribute('data-quantity-range')?'quantity-range':null)):null;
  export function patchTradeChildren(parent,desired) {
    const previous=[...parent.childNodes],used=new Set();let cursor=parent.firstChild;
    for(const next of [...desired.childNodes]) {
      const key=nodeKey(next);
      const current=previous.find(node=>!used.has(node)&&node.nodeType===next.nodeType&&node.nodeName===next.nodeName&&nodeKey(node)===key);
      const node=current||next.cloneNode(true);
      if(current) {
        if(node.nodeType===1) {
          for(const attr of [...node.attributes])if(!next.hasAttribute(attr.name))node.removeAttribute(attr.name);
          for(const attr of [...next.attributes])if(node.getAttribute(attr.name)!==attr.value)node.setAttribute(attr.name,attr.value);
          patchTradeChildren(node,next);
          if(node.nodeName==='INPUT') {
            if(node.value!==next.value)node.value=next.value;
            if(node.checked!==next.checked)node.checked=next.checked;
          }
        } else if(node.nodeValue!==next.nodeValue)node.nodeValue=next.nodeValue;
      }
      if(node!==cursor)parent.insertBefore(node,cursor);
      used.add(node);cursor=node.nextSibling;
    }
    for(const node of previous)if(!used.has(node))node.remove();
  }
  export function mountTradeScene(ctx) {
    const root = ctx.root, C = ctx.config;
    root.classList.add('trade-root');
    const ui = { tab: ctx.id === 'P07' ? 'facilities' : ((ctx.initialStorage||C.ITEMS[ctx.focusItem]?.storage) === 'barn' ? 'barn' : 'silo'), selected: ctx.id==='P08'&&ctx.focusItem?ctx.focusItem:null, quantity: 1, tier: .75, allowSeed: false, message: '', error: false, box: null, source: null, truck: false };
    let disposed = false, truckTimer, lastMarkup;
    const E = ctx.esc || (s => String(s).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])));
    const item = (id, cls = '') => ctx.item(id, `trade-art ${cls}`);
    const image = (p, alt = '', cls = '') => ctx.img(p, alt, `trade-art ${cls}`);
    const name = id => ctx.name(id);
    const used = kind => ctx.core.storageUsed(ctx.state, kind);
    const btn = (text, action, extra = '', cls = '') => `<button type="button" class="trade-button ${cls}" data-action="${action}" ${extra}>${text}</button>`;
    const banner = (title, body, good = false) => `<div class="trade-note ${good ? 'is-good' : ''}"><strong>${title}</strong>${body ? `<span>${body}</span>` : ''}</div>`;
    const tabs = (arr, selected = ui.tab) => `<nav class="trade-tabs" aria-label="分类">${arr.map(([id, title]) => btn(title, `tab:${id}`, `aria-pressed="${id === selected}"`, id === selected ? 'is-active' : '')).join('')}</nav>`;
    const capacity = kind => { const s = ctx.state, n = used(kind), cap = s.storage[kind].capacity; return `<div class="trade-capacity ${n >= cap ? 'is-full' : ''}"><span>${kind === 'silo' ? '粮仓' : '货仓'} <b>${n} / ${cap}</b></span><meter min="0" max="${cap}" value="${n}" aria-label="${kind === 'silo' ? '粮仓' : '货仓'}容量"></meter>${n >= cap ? '<strong>满仓 · 可以回收或扩容</strong>' : ''}</div>`; };
    function report(text, bad = false) { ui.message = text; ui.error = bad; render(); }
    function run(command, message, after) {
      const r = ctx.act(command);
      if (r && r.ok) { ui.error = false; ui.message = message || '已完成，物品与资源已更新。'; if (after) after(r); render(); }
      else report(r?.error?.message || r?.message || r?.error || '操作未完成，请检查物品、金币和仓容。', true);
      return r;
    }
    function confirm(title, body, command, message, after) {
      // Clock ticks revise saves every second. Freeze the quoted resources, not the clock revision.
      const quoteState=()=>JSON.stringify([ctx.state.coins,ctx.state.inventory,ctx.state.vouchers,ctx.state.materialChoices,ctx.state.storage,ctx.state.animalCredits]);
      const quoted=quoteState(), frozen={...command};
      ctx.confirm({ title, body: `<div class="trade-confirm-body">${body}</div>`, onConfirm: () => {
        if(quoteState()!==quoted){report('资源已变化，请重新核对本次操作。',true);return {ok:false,error:'STALE_QUOTE'};}
        return run(frozen, message, after);
      } });
    }
    function head(subtitle) {
      return `<header class="trade-heading"><div class="trade-title"><span class="trade-eyebrow">乡间集市</span><h2>${titles[ctx.id]}</h2></div><div class="trade-wallet">${item('coin')}<b>${ctx.state.coins.toLocaleString()}</b><span>${item('construction_voucher')}${ctx.state.vouchers}</span></div></header><p class="trade-subtitle">${subtitle}</p>`;
    }
    function quantityLimit() {
      if(ctx.id==='P08'||(ctx.id==='P10'&&ui.box)) {
        const reserve=C.CROPS[ui.selected]&&!ui.allowSeed?1:0;
        return Math.max(0,Math.min(ctx.id==='P10'?10:Infinity,(ctx.state.inventory[ui.selected]||0)-reserve));
      }
      if(ctx.id==='P07') {
        const p=shopProducts().find(p=>p.id===ui.selected);
        if(p?.category==='animal')return Math.max(0,p.animal.capacity-p.shelter.animals.length);
        if(p?.category==='tool')return Math.max(0,10-(ctx.state.npc.toolBought[p.id]||0));
      }
      return 10;
    }
    function setQuantity(value,max=quantityLimit()) {ui.quantity=Math.max(max?1:0,Math.min(max,Number.isFinite(value)?Math.floor(value):1));}
    function stepper(max = quantityLimit(), bulk = false) {
      setQuantity(ui.quantity,max);
      const min=max?1:0, label=ctx.id==='P08'?'出售数量':'上架数量';
      const controls=`<div class="trade-quantity" aria-label="数量"><span>数量</span>${btn('−', 'qty:-1', `aria-label="减少数量" ${ui.quantity<=min?'disabled':''}`)}<output aria-live="off">${ui.quantity}</output>${btn('+', 'qty:1', `aria-label="增加数量" ${ui.quantity>=max?'disabled':''}`)}</div>`;
      if(!bulk)return controls;
      const choices=ctx.id==='P08'?[[1,'1份'],[10,'10份'],[50,'50份'],[100,'100份'],['half','一半'],['all','全部可售']]:[[1,'1份'],[5,'5份'],[10,'10份'],['half','一半'],['all','本箱最多']];
      return `<div class="trade-bulk-quantity">${controls}<input type="range" data-quantity-range min="${min}" max="${max}" step="1" value="${ui.quantity}" aria-label="${label}" aria-valuetext="${ui.quantity}份，可选最多${max}份" ${max?'':'disabled'}><div class="trade-quantity-limits"><span>${min}份</span><span>最多 ${max}份${C.CROPS[ui.selected]&&!ui.allowSeed?' · 留种1份':''}</span></div><div class="trade-quantity-presets" aria-label="快捷数量">${choices.map(([value,label])=>btn(label,`quantity:${value}`,`${!max||typeof value==='number'&&value>max?'disabled':''} aria-pressed="${ui.quantity===(value==='all'?max:value==='half'?Math.max(1,Math.floor(max/2)):value)}"`)).join('')}</div></div>`;
    }
    function shelfSlot(o, selectAction, selected, material = false) {
      return `<button type="button" class="trade-shelf-slot ${selected ? 'is-selected' : ''} ${!o.quantity ? 'is-empty' : ''}" data-action="${selectAction}:${E(o.id)}" aria-pressed="${!!selected}" aria-label="${E(name(o.itemId))}，${o.quantity ? `${o.quantity}份，总价${o.coins}金币` : '本批售罄'}"><span class="trade-shelf-object">${o.quantity ? item(o.itemId) : '<span class="trade-empty-basket"></span>'}${o.quantity ? `<b class="trade-count">×${o.quantity}</b>` : '<b class="trade-sold-tag">售罄</b>'}</span><span class="trade-price-tag"><strong>${E(name(o.itemId))}</strong><span>${o.quantity ? `${o.coins} 金币${material ? ' / 件' : ' / 本槽'}` : '等待下批补货'}</span></span></button>`;
    }
    function purchaseOffer(o, material = false) {
      if (!o || !o.quantity) return;
      const kind = C.ITEMS[o.itemId].storage;
      confirm(`购买${name(o.itemId)}`, `${item(o.itemId)}<p>${name(o.itemId)} × ${o.quantity}，总价 <strong>${o.coins} 金币</strong>。</p><p>${kind === 'silo' ? '粮仓' : '货仓'} ${used(kind)} → ${used(kind) + o.quantity} / ${ctx.state.storage[kind].capacity}；余额 ${ctx.state.coins} → ${ctx.state.coins - o.coins}。</p><p>取消不扣币，售空后本批不会重置。</p>`, material ? { type: 'buy', category: 'material', slotId: o.id, itemId: o.itemId, quantity: o.quantity } : { type: 'buyNpc', slotId: o.id }, `已购买 ${name(o.itemId)} ×${o.quantity}，该槽已售罄。`);
    }
    function featureClosed(label) { return `<div class="trade-lock" role="status"><h3>${E(label)}功能关闭</h3><p>当前农场设置未开启此功能；现有资源保持不变。</p></div>`; }
    function lock(level) { return `<div class="trade-lock">${image('ui/lock.svg', '未解锁')}<h3>${level}级开放</h3><p>当前等级 ${ctx.state.level}。先收获和生产积累经验。</p></div>`; }
    function hasRecoverableSeed(id) {
      // Core preview is pure; use its authoritative recoverable-seed rule, including queues and receipts.
      try { ctx.core.executeFarm(ctx.state,{type:'buy',category:'seed',itemId:id,quantity:1},ctx.state.now); return false; }
      catch(error) { return error.code==='SEED_RECOVERABLE'; }
    }
    function shopProducts() {
      const s = ctx.state, arr = [];
      if (ui.tab === 'facilities') {
        arr.push({ id: 'field', category: 'field', name: '生产田', coins: 1, level: 1, footprint: [1, 1], art: 'terrain/field-empty.svg', reason: s.entities.filter(e => e.kind === 'field').length >= C.fieldAllowance(s.level) ? '本等级田地额度已满' : '' });
        list(C.BUILDINGS).forEach(b => arr.push({ ...b, art: `buildings/${b.referenceId.replace(/_[12]$/, '')}.svg`, reason: s.entities.some(e => e.configId === b.id) ? '已拥有 · 每种工坊限一座' : b.level > s.level ? `${b.level}级开放` : b.id==='feed_mill_2'&&!s.entities.some(e=>e.configId==='feed_mill_1')?'先建造第一台饲料机':'' }));
      }
      if (ui.tab === 'animals') list(C.ANIMALS).forEach(a => {
        const shelters = s.entities.filter(e => e.kind === 'shelter' && e.configId === a.id), tier = shelters.length;
        arr.push({ id: `shelter_${a.id}`, itemId: a.id, category: 'shelter', name: `${a.name}舍`, coins: a.buildingCost, level: a.levels[tier] || 99, footprint: a.footprint, art: `buildings/${a.referenceId}_Shelter.svg`, reason: !a.levels[tier] ? '栏舍数量已满' : s.level < a.levels[tier] ? `${a.levels[tier]}级开放` : '' });
        shelters.forEach(e => arr.push({ id: `animal_${e.id}`, itemId: a.id, entityId: e.id, category: 'animal', name: `领养${a.name}`, coins: Math.max(0, a.prices[e.tier] - (s.animalCredits[a.id] || 0)), level: a.levels[e.tier], art: `animals/${a.id}/idle/0.svg`, animal: a, shelter: e, reason: e.animals.length >= a.capacity ? '本栏已满' : '' }));
      });
      if (ui.tab === 'orchard') list(C.FRUITS).forEach(f => arr.push({ ...f, itemId: f.id, category: 'fruit', art: `plants/${f.id}/growing.svg`, reason: f.level > s.level ? `${f.level}级开放` : '' }));
      if (ui.tab === 'seeds') list(C.CROPS).forEach(c => arr.push({ ...c, category: 'seed', coins: c.buyPrice, name: `${c.name}补种10份`, reason: c.level > s.level ? `${c.level}级开放` : hasRecoverableSeed(c.id) ? '农场仍有可收回种子，请先使用现有资源' : '' }));
      if (ui.tab === 'tools') { list(C.TOOLS).filter(t => t.category === 'tool').forEach(t => arr.push({ ...t, coins: t.buyPrice, reason: t.level>s.level?`${t.level}级开放`:(s.npc.toolBought[t.id] || 0) >= 10 ? '今日10件额度已用完' : '' })); arr.push({ id: 'fertilizer', category: 'fertilizer', name: '园艺肥料', coins: 100, level: 15, reason: s.level < 15 ? '15级开放' : '' }); }
      if (ui.tab === 'decor') { arr.push({ id: 'road', category: 'road', name: '田园道路', coins: 0, level: 1, footprint: [1, 1], art: 'terrain/road-f.svg' }); list(C.DECORATIONS).forEach(d => arr.push({ ...d, category: 'decoration', art: `decor/${decoArt[d.id] || d.id}.svg` })); }
      if (ui.tab === 'vouchers') arr.push({ id: 'construction_voucher', category: 'voucher', name: '建设券', coins: 500, level: 1, reason:s.features.constructionVouchersEnabled?'':'建设券功能关闭' });
      return arr;
    }
    function productPrice(p, quantity) { return p.category==='animal' ? Math.max(0,p.animal.prices[p.shelter.tier]*quantity-(ctx.state.animalCredits[p.itemId]||0)) : p.coins*quantity; }
    function productArt(p) {
      if (p.category === 'animal') return image(`animals/${p.itemId}/front/idle_00.svg`, p.name);
      if (p.category === 'fruit') return image(`plants/${fruitArtFiles[p.id]}-growing.svg`,p.name);
      return p.art ? image(p.art, p.name) : item(p.id);
    }
    function shop() {
      const products = shopProducts();
      let p = products.find(p => p.id === ui.selected);
      if (!p) { p = products.find(x => !x.reason) || products[0]; ui.selected = p?.id; }
      return `${head('挑一件心仪的物件，拿起来再决定。')}${tabs([['facilities','田与工坊'],['animals','动物'],['orchard','果园'],['seeds','补种'],['tools','工具肥料'],['decor','装饰'],['vouchers','建设券']])}<div class="trade-scroll trade-shop-display"><div class="trade-showroom">${products.map(p => `<button type="button" class="trade-display-item ${ui.selected === p.id ? 'is-selected' : ''}" data-ui-state="${p.reason?'locked':p.coins>ctx.state.coins?'missing':'ready'}" data-action="product:${p.id}" aria-pressed="${ui.selected === p.id}"><span class="trade-display-art">${productArt(p)}${p.reason ? '<span class="trade-object-lock">▣</span>' : ''}</span><strong>${E(p.name)}</strong><span class="trade-price-tag">${p.coins} 金币 <small>${p.level || 1}级</small></span></button>`).join('')}</div></div>${p ? `<section class="trade-selection"><div><strong>${E(p.name)}</strong><span>${p.reason || (p.footprint ? `占地 ${p.footprint.join('×')} · 确认摆放才扣币` : p.category === 'animal' ? `已选 ${p.shelter.id} · ${p.shelter.animals.length}/${p.animal.capacity}只` : `库存 ${p.category === 'voucher' ? ctx.state.vouchers : ctx.state.inventory[p.id] || 0}`)}</span></div>${['animal','tool','fertilizer','voucher'].includes(p.category) ? stepper() : ''}${btn(p.reason || (p.footprint ? '拿起 · 选位置' : `${p.category==='voucher'?'核对购买':'购买'} ${p.category==='seed'?10:ui.quantity}份 · ${productPrice(p,ui.quantity)}金币`), 'shopBuy', '', p.reason ? 'is-muted' : 'is-primary')}</section>` : ''}`;
    }
    function beginPlacement(p) { ctx.openScene('P01', {initialPlacement:{category:p.category,itemId:p.itemId||p.id}}); }
    function inventoryGrid(kind, action = 'inventory', selected = ui.selected) {
      const rows = Object.entries(ctx.state.inventory).filter(([id, q]) => q > 0 && C.ITEMS[id]?.storage === kind && (action !== 'listItem' || C.ITEMS[id]?.M10));
      return `<div class="trade-inventory-grid">${rows.length ? rows.map(([id,q]) => `<button type="button" class="trade-inventory-slot ${id === selected ? 'is-selected' : ''}" data-action="${action}:${id}" aria-pressed="${id === selected}">${item(id)}<strong>${E(name(id))}</strong><span class="trade-count">${q}</span></button>`).join('') : `<div class="trade-empty-store">${image(`buildings/${kind === 'silo' ? 'Silo' : 'Barn'}.svg`,'空仓')}<strong>仓房空空的</strong><span>去收获作物或领取制品，物件会放进对应格。</span></div>`}</div>`;
    }
    function itemDetail() {
      const id = ui.selected, s = ctx.state, t = C.ITEMS[id];
      if (!t || t.storage !== ui.tab || !s.inventory[id]) return '';
      const crop = C.CROPS[id], canSell = !!t.M10 || t.sellPrice !== undefined;
      setQuantity(ui.quantity);
      const q=ui.quantity, remaining=(s.inventory[id]||0)-q, income=q?ctx.core.recoveryPrice(id,q):0;
      const uses = list(C.RECIPES).filter(r => r.inputs[id]).slice(0, 3).map(r => r.name).join('、');
      return `<section class="trade-drawer"><div class="trade-drawer-title">${item(id)}<div><h3>${E(name(id))}</h3><span>库存 ${s.inventory[id]} · ${t.storage === 'silo' ? '粮仓' : '货仓'}</span></div>${btn('×','closeDetail','aria-label="关闭物品详情"')}</div><p>${crop ? `每份可播种1格，成熟收${crop.yieldCount}份。` : ''}${uses ? `用途：${E(uses)}。` : C.TOOLS[id] ? '用于扩仓、扩地或清理场地。' : '可用于生产或对应订单。'}</p>${canSell ? `${stepper(quantityLimit(),true)}${crop ? `<label class="trade-checkbox"><input type="checkbox" data-check="allowSeed" ${ui.allowSeed ? 'checked' : ''}>本次允许用掉最后1份种子</label>` : ''}<div class="trade-quote">回收 <b>${income} 金币</b> · 剩 ${remaining}份${crop ? ` · ${ui.allowSeed ? '本次已解除留种保护' : '默认保留1份种子'}` : ''}</div>` : ''}${id === 'fertilizer' ? `${banner(s.fertilizerUntil>s.now ? `肥料生效中 · 剩 ${duration(s.fertilizerUntil-s.now)}` : '使用后30分钟内新播种快10%', '只影响新播种，不追溯已有作物，不叠乘。', true)}${btn(s.fertilizerUntil>s.now?'已生效，不能叠加':'使用1份','fertilizer',s.fertilizerUntil>s.now?'disabled':'','is-primary')}` : ''}</section>`;
    }
    function saleButton() {
      setQuantity(ui.quantity);const id=ui.selected,q=ui.quantity,income=q?ctx.core.recoveryPrice(id,q):0;
      return btn(q?`${C.TOOLS[id]||ui.allowSeed?'核对回收':'回收'} ${q}份 · +${income}金币`:'暂无可出售数量','sellItem',q?'':'disabled','is-primary');
    }
    function materials() {
      const s=ctx.state, pending=s.materials.pending, receipt=s.materials.choiceReceipt;
      return `<section class="trade-supply-box"><div class="trade-gift ${pending?'is-ready':''}">${image(pending?`items/${pending}.svg`:'ui/build.svg','补给礼盒')}<span>${pending?'待领取':'生产补给'}</span></div><div><strong>生产补给 ${s.materials.harvestCount} / 30</strong><progress max="30" value="${s.materials.harvestCount}"></progress>${pending?btn(`领取${name(pending)} ×1`,'claimTool','','is-primary'):'<span>收田、收动物产物积累；机器不计数。</span>'}</div></section><div class="trade-material-tickets">${item('construction_voucher')}<strong>材料选择券 ${s.materialChoices} / 20</strong>${receipt?btn(`领运输券 · 待领${receipt.remaining}张`,'claimChoices'):''}</div>${s.materialChoices>=20?banner('券已满，奖励不会消失','先兑换材料，再领取托管中的运输券。'):''}<h3 class="trade-small-title">一张券，换一件材料</h3><div class="trade-inventory-grid">${list(C.TOOLS).filter(t=>['storageMaterial','landMaterial'].includes(t.category)&&t.level<=s.level).map(t=>`<button type="button" class="trade-inventory-slot" data-action="redeem:${t.id}">${item(t.id)}<strong>${E(t.name)}</strong><span>库存${s.inventory[t.id]||0} · 1券兑换</span></button>`).join('')}</div><h3 class="trade-small-title">NPC金币补缺 · 今日 ${s.npc.materialBought}/6件</h3><div class="trade-shelf trade-mini-shelf">${s.npc.materialOffers.map(o=>shelfSlot(o,'material',false,true)).join('')}</div>`;
    }
    function storage() {
      const selected=C.ITEMS[ui.selected],selling=selected?.storage===ui.tab&&ctx.state.inventory[ui.selected]>0&&(selected.M10||selected.sellPrice!==undefined);
      return `${head('粮仓放作物，货仓放制品和工具。')}${tabs([['silo','粮仓'],['barn','货仓'],['materials','材料补给']])}${ui.tab==='materials'?`<div class="trade-scroll">${materials()}</div>`:`${capacity(ui.tab)}<div class="trade-scroll"><div class="trade-store-door">${image(`buildings/${ui.tab==='silo'?'Silo':'Barn'}.svg`,'仓房')}<span>${ui.tab==='silo'?'谷物、果实与种子':'制品、动物产物与工具'}</span></div>${inventoryGrid(ui.tab)}${itemDetail()}</div><div class="trade-selection">${selling?saleButton():btn(`扩容 ${ctx.state.storage[ui.tab].capacity} → ${C.storageCapacity(ctx.state.storage[ui.tab].upgrades+1)}`,'upgradeStore','','is-primary')}</div>`}`;
    }
    function market() {
      if(!ctx.state.features.npcMarketEnabled)return `${head('NPC固定报价，不是真人交易。')}${featureClosed('NPC集市')}`;
      const s=ctx.state, mat=ui.tab==='materials', offers=mat?s.npc.materialOffers:s.npc.shelf, o=offers.find(x=>x.id===ui.selected);
      return `${head('NPC固定报价，不是真人交易。')}${s.level<7?lock(7):`${tabs([['silo','日常货物'],['materials','材料补缺']])}<div class="trade-market-clock">${image('ui/clock.svg','时钟')}下批补货：${duration((s.npc.supplyBatch+1)*21600000-s.now)}${mat?` · 今日${s.npc.materialBought}/6件`:''}</div><div class="trade-scroll"><div class="trade-awning"></div><div class="trade-shelf">${offers.map(x=>shelfSlot(x,'offer',x.id===ui.selected,mat)).join('')}</div>${o?`<section class="trade-offer-slip">${item(o.itemId)}<div><strong>${E(name(o.itemId))} ×${o.quantity}</strong><span>${o.quantity?`本槽总价 ${o.coins}金币`:'空篮留在原处，等下一批补货'}</span><span>${C.ITEMS[o.itemId].storage==='silo'?'粮仓':'货仓'} ${used(C.ITEMS[o.itemId].storage)} → ${used(C.ITEMS[o.itemId].storage)+o.quantity} / ${s.storage[C.ITEMS[o.itemId].storage].capacity}；余额 ${s.coins} → ${s.coins-o.coins}</span></div></section>`:''}</div><div class="trade-selection">${o?btn(o.quantity?`购买 ${o.quantity}份 · ${o.coins}金币`:'本槽售罄','buyOffer',o.quantity?'':'disabled','is-primary'):'<span>点货架上的商品查看数量、总价和仓容。</span>'}</div>`}`;
    }
    function saleDuration(id,tier){const category=C.ITEMS[id]?.category,factor=['crop','fruit'].includes(category)?1:category==='animal'?1.5:2;return C.FARM_CONFIG.npc.saleTiers.find(x=>x[0]===tier)[1]*60000*factor;}
    function boxEditor() {
      setQuantity(ui.quantity);
      const s=ctx.state, id=ui.selected, t=C.ITEMS[id], q=ui.quantity, income=q&&t?ctx.core.npcPrice(id,q,ui.tier):0;
      const budget=t?(['crop','fruit'].includes(t.category)?(s.npc.budgetFieldAllowance??C.fieldAllowance(s.level))*2:10):0;
      return `<div class="trade-editor"><div class="trade-drawer-title"><h3>把丰收放进这只箱子</h3>${btn('×','closeBox','aria-label="取消上架编辑"')}</div>${tabs([['silo','粮仓'],['barn','货仓']])}${capacity(ui.tab)}<div class="trade-scroll">${inventoryGrid(ui.tab,'listItem',id)}</div>${id&&t?`<div class="trade-list-preview">${item(id)}<strong>${E(name(id))} ×${q}</strong><span>${income}金币</span></div>${stepper(quantityLimit(),true)}<div class="trade-tier">${[.5,.75,1].map(x=>btn(`${x*100}%`,'tier:'+x,`aria-pressed="${ui.tier===x}"`,ui.tier===x?'is-active':'')).join('')}</div><small>${ui.tier>.5?`今日该商品高价预算：已用${s.npc.budgetUsed[id]||0} / ${budget}份，上架时预占。`:'50%档不限预算，也可在仓库即时回收。'}</small>${C.CROPS[id]?`<label class="trade-checkbox"><input type="checkbox" data-check="allowSeed" ${ui.allowSeed?'checked':''}>本次允许用掉最后1份种子</label>`:''}<p class="trade-impact">上架立即移出${q}份库存${ui.tier>.5?'并预占高价预算':''}；预计${duration(saleDuration(id,ui.tier))}成交，之后点钱袋领取${income}金币。${C.CROPS[id]?(ui.allowSeed?'本次明确允许用尽种子。':'保留最后1份种子。'):''}</p><div class="trade-actions">${btn('取消','closeBox')}${btn(q?`上架 ${q}份 · ${income}金币`:'暂无可上架数量','listConfirm',q?'':'disabled','is-primary')}</div>`:'<p>从库存格选一个商品，数量1–10份。</p>'}</div>`;
    }
    function stall() {
      const s=ctx.state;
      if(!s.features.npcMarketEnabled)return `${head('每只木箱都有自己的货与款。')}${featureClosed('NPC集市')}`;
      if(s.level<7)return `${head('每只木箱都有自己的货与款。')}${lock(7)}`;
      if(ui.box)return `${head('数量、售价、留种都由你决定。')}${boxEditor()}`;
      return `${head('上架 → 等待成交 → 点金币袋收款。')}<div class="trade-scroll"><div class="trade-awning is-orange"></div><div class="trade-crate-grid">${s.npc.boxes.map((b,i)=>{const l=b.listing;return `<button type="button" class="trade-crate ${l?.status==='sold'?'is-sold':''}" data-action="box:${b.id}" aria-label="货箱${i+1}，${!l?'空箱，点击上架':l.status==='sold'?`成交，领取${l.coins}金币`:`${name(l.itemId)}${l.quantity}份，等待成交`}"><span class="trade-box-number">${i+1}</span><span class="trade-crate-art">${!l?'<span class="trade-empty-plus">+</span>':l.status==='sold'?`<span class="trade-coin-bag">${item('coin')}<b>领金币</b></span>`:item(l.itemId)}${l&&l.status!=='sold'?`<b class="trade-count">×${l.quantity}</b>`:''}</span><span class="trade-crate-plank"><strong>${!l?'装点丰收':l.status==='sold'?`${l.coins} 金币待领`:name(l.itemId)}</strong><span>${!l?'空货箱':l.status==='sold'?'点袋收款':`${l.coins}金币 · ${duration(l.readyAt-s.now)}`}</span></span></button>`;}).join('')}${s.features.constructionVouchersEnabled&&s.npc.boxes.length<10?`<button type="button" class="trade-crate trade-expand-crate" data-action="expandStall"><span>＋</span><strong>再添一只货箱</strong><small>${C.FARM_CONFIG.constructionVoucher.npcBoxes[s.npc.boxes.length-5]}建设券</small></button>`:''}</div></div><div class="trade-selection"><span>金币只在收款时到账。待售箱可退货，需仓库留有空位。</span></div>`;
    }
    function readyOrder(o) { return o.state==='active'&&Object.entries(o.requirements).every(([id,q])=>(ctx.state.inventory[id]||0)>=q+(C.CROPS[id]&&!ui.allowSeed?1:0)); }
    function orders() {
      const s=ctx.state;
      if(s.level<4)return `${head('九张小纸单，连起农场与小镇。')}${lock(4)}`;
      let o=s.orders.find(x=>x.id===ui.selected);if(!o){o=s.orders[0];ui.selected=o?.id;}
      return `${head(`今日送达 ${s.daily.trucks} 单 · 奖励按原规则即时到账`)}<div class="trade-scroll"><div class="trade-order-board">${s.orders.map((x,i)=>`<button type="button" class="trade-order-paper ${x.id===ui.selected?'is-selected':''} ${x.state==='cooldown'?'is-cooldown':''}" data-ui-state="${x.state==='cooldown'?'locked':readyOrder(x)?'ready':'missing'}" data-action="order:${x.id}" aria-pressed="${x.id===ui.selected}" aria-label="订单${i+1}，${x.state==='cooldown'?'冷却补单中':readyOrder(x)?'材料齐全':'缺少物品'}"><span class="trade-pin"></span><b>NO. ${String(i+1).padStart(2,'0')}</b>${x.state==='cooldown'?`<span class="trade-paper-clock">◷</span><small>${duration(x.readyAt-s.now)}</small>`:`<span class="trade-paper-items">${Object.keys(x.requirements).slice(0,3).map(id=>item(id)).join('')}</span><span class="trade-paper-reward">${x.coins} ◉ ${readyOrder(x)?'<b class="trade-ready-check">✓</b>':''}</span>`}</button>`).join('')}</div>${o?`<section class="trade-order-detail"><div class="trade-order-detail-title"><h3>订单 ${o.slot+1}</h3><span>${o.state==='cooldown'?'纸夹留在原处，等待新单':`${o.coins}金币 + ${o.xp}经验`}</span></div>${o.state==='active'?`<div class="trade-order-needs">${Object.entries(o.requirements).map(([id,q])=>`<button type="button" data-action="source:${id}" class="trade-need ${(s.inventory[id]||0)>=q+(C.CROPS[id]&&!ui.allowSeed?1:0)?'is-ready':'is-missing'}">${item(id)}<strong>${name(id)}</strong><span>${s.inventory[id]||0} / ${q} ${C.CROPS[id]&&!ui.allowSeed?'<small>留种1</small>':''}</span></button>`).join('')}</div><label class="trade-checkbox"><input type="checkbox" data-check="allowSeed" ${ui.allowSeed?'checked':''}>本次允许使用最后1份种子</label><p class="trade-impact">点交付会扣除上方清单，立即获得${o.coins}金币和${o.xp}经验；本订单进入冷却。点缺料可去生产，返回保留本张订单。</p>${ui.source?sourceInfo(ui.source):''}`:banner('补单中',`${duration(o.readyAt-s.now)}后生成新单；交货、换单均沿用既定冷却。`)}</section>`:''}</div><div class="trade-truck-lane"><svg class="trade-truck ${ui.truck?'is-away':''}" viewBox="0 0 150 85" role="img" aria-label="配送小卡车"><path fill="#e8b05c" stroke="#8b622f" stroke-width="3" d="M9 19h77v42H9z"/><path fill="#79a99d" stroke="#355e57" stroke-width="3" d="M86 35h32l17 19v16H86z"/><path fill="#d1e9dc" d="M93 40h22l12 14H93z"/><path stroke="#966c39" stroke-width="4" d="M13 30h68M13 43h68M13 56h68"/><path stroke="#475d4e" stroke-width="5" d="M7 68h133"/><circle fill="#4b5549" cx="33" cy="69" r="12"/><circle fill="#c7c5ae" cx="33" cy="69" r="5"/><circle fill="#4b5549" cx="116" cy="69" r="12"/><circle fill="#c7c5ae" cx="116" cy="69" r="5"/></svg><div>${o?.state==='active'?`${btn('换一张','discardOrder')}${btn(readyOrder(o)?`交付 · +${o.coins}金币`:'前往补齐缺料','submitOrder','','is-primary')}`:'<strong>等待新的订单</strong>'}</div></div>`;
    }
    function sourceInfo(id) {
      const c=C.CROPS[id],f=C.FRUITS[id],r=C.RECIPES[id],a=list(C.ANIMALS).find(x=>x.product===id);
      return banner(`${name(id)}的来源`,c?'在田地播种并收获，记得留下一份种子。':f?'等待对应果树成熟后采收。':a?`喂养${a.name}后领取产物。`:r?`${r.name}：在${C.BUILDINGS[r.machineType]?.name||r.machineType}使用${Object.entries(r.inputs).map(([id,q])=>`${name(id)}×${q}`).join('、')}制作。`:'查看对应库存与补给。');
    }
    function render() {
      if(disposed)return;
      const oldFocus=root.ownerDocument.activeElement, focusAction=root.contains(oldFocus)?oldFocus?.dataset?.action:null;
      const reduced=String(!!ctx.state.settings.reducedMotion);
      if(root.dataset.reducedMotion!==reduced)root.dataset.reducedMotion=reduced;
      const body=({P07:shop,P08:storage,P09:market,P10:stall,P11:orders}[ctx.id])();
      const markup=`<main class="trade-viewport trade-${ctx.id}" aria-label="${titles[ctx.id]}">${body}<div class="trade-feedback ${ui.error?'is-error':''}" role="status" aria-live="polite">${E(ui.message||'先选实物查看数量与成本，再点明确提交按钮；不会自动购买。')}</div></main>`;
      if(markup===lastMarkup)return;
      if(root.ownerDocument.createElement){
        const template=root.ownerDocument.createElement('template');template.innerHTML=markup;
        patchTradeChildren(root,template.content);
      }else root.innerHTML=markup;
      lastMarkup=markup;
      if(focusAction&&oldFocus!==root.ownerDocument.activeElement){const found=[...root.querySelectorAll('[data-action]')].find(x=>x.dataset.action===focusAction);if(found)found.focus({preventScroll:true});}
    }
    function click(event) {
      const target=event.target.closest('[data-action]');if(!target||!root.contains(target)||target.disabled)return;
      const [action,a,b]=target.dataset.action.split(':'), s=ctx.state;
      if(['P09','P10'].includes(ctx.id)&&!s.features.npcMarketEnabled)return report('NPC集市功能关闭。',true);
      if(action==='expandStall'&&!s.features.constructionVouchersEnabled)return report('建设券功能关闭。',true);
      if(action==='tab'){ui.tab=a;ui.selected=null;ui.quantity=1;ui.source=null;render();return;}
      if(action==='qty'){setQuantity(ui.quantity+Number(a));render();return;}
      if(action==='quantity'){const max=quantityLimit();setQuantity(a==='all'?max:a==='half'?Math.floor(max/2):Number(a));render();return;}
      if(['product','inventory','offer','listItem','order'].includes(action)){ui.selected=a;ui.quantity=1;ui.allowSeed=false;ui.source=null;render();if(action==='inventory')root.querySelector('.trade-drawer')?.scrollIntoView?.({block:'end',behavior:'auto'});if(action==='order')root.querySelector('.trade-order-detail')?.scrollIntoView?.({block:'nearest',behavior:'auto'});return;}
      if(action==='closeDetail'){ui.selected=null;render();return;}
      if(action==='shopBuy'){
        const p=shopProducts().find(x=>x.id===ui.selected);if(!p)return;
        if(p.reason)return report(p.reason,true);
        if(p.footprint)return beginPlacement(p);
        const quantity=ui.quantity,price=productPrice(p,quantity);
        const command={type:'buy',category:p.category,itemId:p.itemId||p.id,entityId:p.entityId,quantity};
        if(p.category==='voucher')confirm(`购买${p.name}`,`${productArt(p)}<p>${p.name} ×${quantity} · 总价 <b>${price}金币</b></p><p>余额 ${s.coins} → ${s.coins-price}；转换后不可撤销。</p>`,command,'建设券已购买，金币与券数已更新。');
        else run(command,`已${p.category==='animal'?'领养':'购买'}${p.name}，实际扣除${price}金币。`);return;
      }
      if(action==='sellItem'){const id=ui.selected;setQuantity(ui.quantity);const q=ui.quantity;if(!id)return;if(!q){report('暂无可出售数量，作物默认保留1份种子。',true);return;}const coins=ctx.core.recoveryPrice(id,q),command={type:'sell',itemId:id,quantity:q,confirmed:true,allowSeedReserve:ui.allowSeed};
        if(C.TOOLS[id]||ui.allowSeed)confirm('确认回收',`${item(id)}<p>${name(id)} ×${q}，收取 <b>${coins}金币</b>。</p><p>库存 ${s.inventory[id]} → ${s.inventory[id]-q}；${C.CROPS[id]?'本次明确允许用尽种子。':'工具材料回收后无法撤回。'}</p>`,command,`已回收${name(id)} ×${q}，到账${coins}金币。`,()=>ui.quantity=1);
        else run(command,`已回收${name(id)} ×${q}，到账${coins}金币。`,()=>ui.quantity=1);return;
      }
      if(action==='upgradeStore'){const kind=ui.tab,n=s.storage[kind].upgrades+1,ids=kind==='barn'?['bolt','duct_tape','plank']:['nail','screw','wood_panel'];confirm('扩建这座仓房',`<p>容量 ${s.storage[kind].capacity} → <b>${C.storageCapacity(n)}</b></p><div class="trade-confirm-materials">${ids.map(id=>`<span>${item(id)}<b>${name(id)}</b><small class="${(s.inventory[id]||0)<n?'is-missing':''}">${s.inventory[id]||0} / ${n}</small></span>`).join('')}</div><p>缺料时不会扣除任何材料，可返回材料补给页签。</p>`,{type:'upgradeStorage',storage:kind},'扩仓完成，容量与材料槽已更新。');return;}
      if(action==='fertilizer'){confirm('使用园艺肥料',`${item('fertilizer')}<p>消耗1份，30分钟内新播种快10%。已播种作物不追溯，不可叠乘。</p>`,{type:'useFertilizer'},'肥料已生效，作用时段保留在物品详情。');return;}
      if(action==='claimTool'){run({type:'claimTool'},'补给工具已入货仓。');return;}
      if(action==='claimChoices'){run({type:'claimMaterialChoices'},'可容纳的运输材料券已领取，余券保留待领。');return;}
      if(action==='redeem'){confirm('材料券兑换',`${item(a)}<p>1材料选择券 → ${name(a)} ×1。占货仓1格，不扣金币。</p><p>选择券 ${s.materialChoices} → ${s.materialChoices-1}；货仓 ${used('barn')} / ${s.storage.barn.capacity}。</p>`,{type:'redeemMaterial',itemId:a,quantity:1},`已用1张选择券兑换${name(a)}，金币未变。`);return;}
      if(action==='material'){purchaseOffer(s.npc.materialOffers.find(x=>x.id===a),true);return;}
      if(action==='buyOffer'){const o=(ui.tab==='materials'?s.npc.materialOffers:s.npc.shelf).find(x=>x.id===ui.selected);if(!o||!o.quantity)return;run(ui.tab==='materials'?{type:'buy',category:'material',slotId:o.id,itemId:o.itemId,quantity:o.quantity}:{type:'buyNpc',slotId:o.id},`已购买${name(o.itemId)} ×${o.quantity}，该槽已售罄。`);return;}
      if(action==='box'){
        const box=s.npc.boxes.find(x=>x.id===a),l=box?.listing;if(!box)return;
        if(!l){ui.box=a;ui.tab='silo';ui.selected=null;ui.quantity=1;ui.allowSeed=false;render();return;}
        if(l.status==='sold'){run({type:'claimStall',boxId:a},`货箱已清空，${l.coins}金币到账。`);return;}
        confirm('取回待售商品？',`${item(l.itemId)}<p>${name(l.itemId)} ×${l.quantity} · ${l.coins}金币报价</p><p>预计${duration(l.readyAt-s.now)}成交。取回需要仓容，当前${used(C.ITEMS[l.itemId].storage)}/${s.storage[C.ITEMS[l.itemId].storage].capacity}。取消对话框则继续售卖。</p>`,{type:'cancelStall',boxId:a},'待售商品已退回原仓，高价预算已释放。');return;
      }
      if(action==='closeBox'){ui.box=null;ui.selected=null;ui.quantity=1;report('上架编辑已取消，库存和预算未改变。');return;}
      if(action==='tier'){ui.tier=Number(a);render();return;}
      if(action==='listConfirm'){setQuantity(ui.quantity);const id=ui.selected,q=ui.quantity,box=s.npc.boxes.find(x=>x.id===ui.box);if(!id||!q||!box||box.listing)return;run({type:'listNpcStall',boxId:ui.box,itemId:id,quantity:q,tier:ui.tier,allowSeedReserve:ui.allowSeed},`已装箱${name(id)} ×${q}，等待成交。`,()=>{ui.box=null;ui.selected=null;});return;}
      if(action==='expandStall'){const cost=C.FARM_CONFIG.constructionVoucher.npcBoxes[s.npc.boxes.length-5];confirm('增加一只货箱',`<p>${s.npc.boxes.length} → ${s.npc.boxes.length+1}箱</p><p>消耗${cost}建设券，当前${s.vouchers}张。不会消耗金币。</p>`,{type:'upgradeStall'},'新货箱已放到摊位末端。');return;}
      if(action==='source'){ui.source=a;if(ctx.openSource){ctx.openSource(a);return;}render();return;}
      if(action==='submitOrder'){
        const o=s.orders.find(x=>x.id===ui.selected);if(!o||o.state!=='active')return;
        if(!readyOrder(o)){ui.source=Object.keys(o.requirements).find(id=>(s.inventory[id]||0)<o.requirements[id]+(C.CROPS[id]&&!ui.allowSeed?1:0));if(ctx.openSource){ctx.openSource(ui.source);return;}report('物品未齐或需要留种，需求格已标出。',true);return;}
        run({type:'submitOrder',orderId:o.id,allowSeedReserve:ui.allowSeed},`订单已交付，${o.coins}金币与${o.xp}经验已到账。`,()=>{ui.truck=true;clearTimeout(truckTimer);truckTimer=setTimeout(()=>{ui.truck=false;render();},1400);});return;
      }
      if(action==='discardOrder'){const o=s.orders.find(x=>x.id===ui.selected);if(!o||o.state!=='active')return;confirm('换掉这张订单？','<p>不会扣库存，也没有奖励。纸夹进入原规则冷却，计时结束生成新单。</p>',{type:'discardOrder',orderId:o.id},'旧单已撤下，补单计时已开始。');}
    }
    function input(event){if(event.target.hasAttribute?.('data-quantity-range')){setQuantity(Number(event.target.value));render();}}
    function change(event){if(event.target.dataset.check==='allowSeed'){ui.allowSeed=event.target.checked;setQuantity(ui.quantity);render();}else input(event);}
    root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);
    const unsub=ctx.subscribe(render);render();
    const cleanup=()=>{disposed=true;clearTimeout(truckTimer);unsub?.();root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);};
    ctx.onExit?.(cleanup);return cleanup;
  }
