import {createFarm,advanceFarm,executeFarm,assertFarm} from './farm-core.mjs';
import {restore as restoreBoard} from './engine.mjs';
import {SCHEMA_VERSION,CONTENT_VERSION,FARM_FEATURES,ITEMS,CROPS,FRUITS,BUILDINGS,ANIMALS,DECORATIONS,REWARD_DECORATIONS,COSMETICS,decorationConfig,RECIPES,FARM_ERRORS} from './farm-config.mjs';
import {validateLayout,beginLayout} from './farm-layout.mjs';
export const FARM_SAVE_KEY='sheep_match_farm_v1';
export const MAX_IMPORT_BYTES=10*1024*1024;
export const REFERENCE_VERSION='hayday-public-snapshot-2026-10-24';
const clone=value=>structuredClone(value);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const int=value=>Number.isSafeInteger(value)&&value>=0;
const fail=(code,message)=>Object.assign(new Error(message??FARM_ERRORS[code]??code),{code});
const STATE_KEYS=new Set('features schemaVersion contentVersion referenceVersion revision layoutRevision now coins xp level vouchers materialChoices nextId inventory storage entities openedLand rewards ledger mastery rng day fertilizerUntil materials stats tutorial commandLog commandWatermarks commandSeen settings layoutSlots decorations cosmetics animalCredits branch npc orders daily camera clockWarning'.split(' '));
const ENVELOPE_KEYS=new Set('schemaVersion contentVersion referenceVersion saveId revision layoutRevision commitId savedAtWallMs checksum payload exportedAtWallMs saveFormatVersion'.split(' '));
const uid=prefix=>`${prefix}_${globalThis.crypto?.randomUUID?.()??`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
export function canonicalStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonicalStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(',')}}`;
}

/** Accident detection only, never an authentication signature. */
export function checksum(value){
  const text=typeof value==='string'?value:canonicalStringify(value);
  let hash=2166136261;
  for(
    let i=0
    ;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return `fnv1a32:${(hash>>>0).toString(16).padStart(8,'0')}`;
}
function checkedTree(value,depth=0){
  if(depth>80)throw fail('INVALID_SAVE','存档嵌套层级过深');
  if(value===null||typeof value==='boolean')return;
  if(typeof value==='number'){
    if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER)throw fail('INVALID_SAVE','存档包含无效数字');
    return;
  }
  if(typeof value==='string'){
    if(value.length>200000)throw fail('INVALID_SAVE','存档文字过长');
    return;
  }
  if(Array.isArray(value)){
    if(value.length>20000)throw fail('INVALID_SAVE','存档列表过长');
    for(const child of value)checkedTree(child,depth+1);
    return;
  }
  if(!plain(value))throw fail('INVALID_SAVE','存档必须为纯数据');
  for(const [key,child]of Object.entries(value)){
    if(['__proto__','prototype','constructor'].includes(key))throw fail('INVALID_SAVE','存档包含禁止字段');
    checkedTree(child,depth+1);
  }
}
function checkItems(map,label){
  if(!plain(map))throw fail('INVALID_SAVE',`${label}格式无效`);
  for(const [id,n]of Object.entries(map))if(!ITEMS[id]||!int(n))throw fail('INVALID_SAVE',`${label}含未知物品或无效数量`);
}
// Only schema text is memoized, never an input object or validation result.
// Bound even future dynamic callers; private Sets are never exposed to consumers.
const schemaKeyCache=new Map();
function schemaKeys(keys){
  let schema=schemaKeyCache.get(keys);
  if(!schema){
    const list=keys.split(' ');schema={list,allowed:new Set(list)};
    if(schemaKeyCache.size>=64)schemaKeyCache.delete(schemaKeyCache.keys().next().value);
    schemaKeyCache.set(keys,schema);
  }
  return schema;
}
function keysOnly(value,keys,label){
  if(!plain(value))throw fail('INVALID_SAVE',`${label}格式无效`);
  const {allowed}=schemaKeys(keys);
  for(const key of Object.keys(value))if(!allowed.has(key))throw fail('INVALID_SAVE',`${label}包含未知关键字段：${key}`);
}
function requiredKeys(value,keys,label){
  for(const key of schemaKeys(keys).list)if(!Object.prototype.hasOwnProperty.call(value,key))throw fail('INVALID_SAVE',`${label}缺少必填字段：${key}`);
}
function nonnegative(value,label){
  if(!int(value))throw fail('INVALID_SAVE',`${label}必须是非负整数`);
}
function knownNumberMap(value,known,label){
  if(!plain(value))throw fail('INVALID_SAVE',`${label}格式无效`);
  for(const [id,n]of Object.entries(value)){
    if(!known(id))throw fail('INVALID_SAVE',`${label}包含未知ID`);
    nonnegative(n,label);
  }
}
function validateLedgers(state){
  keysOnly(state.features,Object.keys(FARM_FEATURES).join(' '),'功能开关');
  for(const key of Object.keys(FARM_FEATURES))if(typeof state.features[key]!=='boolean')throw fail('INVALID_SAVE','功能开关必须是完整的布尔值配置');
  keysOnly(state.camera,'centerX centerY zoom','地图视角');
  if(!Number.isFinite(state.camera.centerX)||state.camera.centerX<0||state.camera.centerX>=64||!Number.isFinite(state.camera.centerY)||state.camera.centerY<0||state.camera.centerY>=64||!Number.isFinite(state.camera.zoom)||state.camera.zoom<.75||state.camera.zoom>1.75)throw fail('INVALID_SAVE','地图视角超出允许范围');
  keysOnly(state.storage,'silo barn','仓容');
  for(const kind of ['silo','barn'])keysOnly(state.storage[kind],'capacity upgrades','仓容');
  keysOnly(state.settings,'sound music reducedMotion','偏好');
  keysOnly(state.cosmetics,'background','外观');
  if(!['default','background_1','background_2'].includes(state.cosmetics.background))throw fail('INVALID_SAVE','未知背景');
  knownNumberMap(state.decorations,id=>!!decorationConfig(id)||!!COSMETICS[id],'装饰库存');
  for(const key of ['sound','music','reducedMotion'])if(typeof state.settings[key]!=='boolean')throw fail('INVALID_SAVE','偏好必须为布尔值');
  if(!Array.isArray(state.layoutSlots)||state.layoutSlots.length!==2)throw fail('INVALID_SAVE','必须保留两个布局方案槽');
  for(const slot of state.layoutSlots)if(slot!==null){
    if(!Array.isArray(slot)||slot.length>8192)throw fail('INVALID_SAVE','布局方案无效');
    const ids=new Set();
    for(const p of slot){
      keysOnly(p,'id x y rotation stored','方案位置');
      if(typeof p.id!=='string'||ids.has(p.id)||!int(p.x)||!int(p.y)||![0,90,180,270].includes(p.rotation)||typeof p.stored!=='boolean')throw fail('INVALID_SAVE','方案位置无效');
      ids.add(p.id);
    }
  }
  knownNumberMap(state.mastery,id=>Object.values(BUILDINGS).some(b=>b.machineType===id),'熟练度');
  knownNumberMap(state.animalCredits,id=>!!ANIMALS[id],'领养抵扣');
  if(!plain(state.ledger)||Object.values(state.ledger).some(v=>typeof v!=='boolean'))throw fail('INVALID_SAVE','奖励账本无效');
  knownNumberMap(state.stats,()=>true,'累计计数');
  keysOnly(state.tutorial,'entered completed initialFed plantStroke firstHarvest collectedEgg replanted enqueuedBread startedFeedMill highPriceSale cameraMoved returnToFields openSilo openBarn skip','教学');
  requiredKeys(state.tutorial,'entered completed','教学');
  for(const [key,value]of Object.entries(state.tutorial))if(!['completed','initialFed'].includes(key)&&typeof value!=='boolean')throw fail('INVALID_SAVE','教学状态必须是布尔值');
  if(!plain(state.tutorial.completed)||Object.entries(state.tutorial.completed).some(([id,v])=>!/^T(0[1-9]|1[0-7])$/.test(id)||v!==true))throw fail('INVALID_SAVE','教学完成记录无效');
  if(Object.prototype.hasOwnProperty.call(state.tutorial,'initialFed')&&(!plain(state.tutorial.initialFed)||Object.entries(state.tutorial.initialFed).some(([id,v])=>!['animal_100','animal_101','animal_102'].includes(id)||v!==true)))throw fail('INVALID_SAVE','初始动物教学记录无效');
  if(!plain(state.commandLog)||Object.keys(state.commandLog).length>256)throw fail('INVALID_SAVE','命令结果记录格式或数量无效');
  for(const [id,receipt]of Object.entries(state.commandLog)){
    if(!id||id.length>160)throw fail('INVALID_SAVE','命令标识无效');
    keysOnly(receipt,'revision delta skipped','命令结果');
    nonnegative(receipt.revision,'命令版本');
    if(!plain(receipt.delta)||!Array.isArray(receipt.skipped))throw fail('INVALID_SAVE','命令结果结构无效');
  }
  knownNumberMap(state.commandWatermarks,()=>true,'命令序号');
  if(!plain(state.commandSeen)||Object.values(state.commandSeen).some(v=>v!==true))throw fail('INVALID_SAVE','历史命令记录无效');
  keysOnly(state.materials,'harvestCount pending choiceReceipt','材料保底');
  requiredKeys(state.materials,'harvestCount pending choiceReceipt','材料保底');
  if(state.materials.choiceReceipt!==null&&!plain(state.materials.choiceReceipt))throw fail('INVALID_SAVE','材料收据必须是对象或null');
  if(state.materials.choiceReceipt){
    keysOnly(state.materials.choiceReceipt,'id day remaining','材料收据');
    nonnegative(state.materials.choiceReceipt.day,'收据日期');
    nonnegative(state.materials.choiceReceipt.remaining,'待领材料');
  }
  keysOnly(state.daily,'trucks choiceClaimed choicePaused','每日计数');
  nonnegative(state.daily.trucks,'交单计数');
  if(!Array.isArray(state.daily.choiceClaimed)||state.daily.choiceClaimed.some(n=>![3,6,10].includes(n))||new Set(state.daily.choiceClaimed).size!==state.daily.choiceClaimed.length)throw fail('INVALID_SAVE','每日奖励记录无效');
  keysOnly(state.npc,'boxes budgetDay budgetFieldAllowance budgetUsed supplyBatch shelf materialOffers materialBought toolBought freeRevives','NPC市场');
  for(const key of ['budgetDay','supplyBatch','materialBought','freeRevives'])nonnegative(state.npc[key],`NPC ${key}`);
  if(state.npc.budgetFieldAllowance!==null)nonnegative(state.npc.budgetFieldAllowance,'NPC田额度');
  checkItems(state.npc.budgetUsed,'NPC预算');
  checkItems(state.npc.toolBought,'工具购买计数');
  if(state.npc.freeRevives>3||state.npc.materialBought>6||Object.values(state.npc.toolBought).some(n=>n>10))throw fail('INVALID_SAVE','NPC每日次数无效');
  if(!Array.isArray(state.npc.boxes)||state.npc.boxes.length<5||state.npc.boxes.length>10)throw fail('INVALID_SAVE','NPC货箱数量无效');
  const boxIds=new Set();
  for(const box of state.npc.boxes){
    keysOnly(box,'id listing','NPC货箱');
    requiredKeys(box,'id listing','NPC货箱');
    if(boxIds.has(box.id)||typeof box.id!=='string')throw fail('INVALID_SAVE','货箱ID无效');
    boxIds.add(box.id);
    if(box.listing!==null&&!plain(box.listing))throw fail('INVALID_SAVE','货箱内容必须是对象或null');
    if(box.listing){
      const l=box.listing;
      keysOnly(l,'itemId quantity tier coins readyAt day status','NPC货箱报价');
      if(!ITEMS[l.itemId]||!int(l.quantity)||l.quantity<1||l.quantity>10||![.5,.75,1].includes(l.tier)||!['listed','sold'].includes(l.status))throw fail('INVALID_SAVE','货箱物品或状态无效');
      for(const key of ['coins','readyAt','day'])nonnegative(l[key],'货箱报价');
    }
  }
  for(const group of ['shelf','materialOffers']){
    if(!Array.isArray(state.npc[group])||state.npc[group].length>(group==='shelf'?6:2))throw fail('INVALID_SAVE','NPC供货格式无效');
    const ids=new Set();
    for(const offer of state.npc[group]){
      keysOnly(offer,'id itemId quantity coins','NPC供货');
      if(ids.has(offer.id)||typeof offer.id!=='string'||!ITEMS[offer.itemId])throw fail('INVALID_SAVE','NPC供货ID无效');
      ids.add(offer.id);
      nonnegative(offer.quantity,'供货数量');
      nonnegative(offer.coins,'供货价格');
    }
  }
  if(!Array.isArray(state.orders)||state.orders.length>9)throw fail('INVALID_SAVE','卡车订单格式无效');
  const orderIds=new Set();
  for(const order of state.orders){
    keysOnly(order,'id slot requirements kind coins xp referenceValue productionXp createdAt readyAt state completed','订单');
    if(typeof order.id!=='string'||orderIds.has(order.id)||!['normal','experience','coin'].includes(order.kind)||!['active','cooldown'].includes(order.state))throw fail('INVALID_SAVE','订单ID或类型无效');
    orderIds.add(order.id);
    checkItems(order.requirements,'订单需求');
    for(const key of ['coins','xp','slot','createdAt','readyAt','productionXp'])nonnegative(order[key],'订单报价');
    if(order.slot>8||!Number.isFinite(order.referenceValue)||order.referenceValue<0)throw fail('INVALID_SAVE','订单报价无效');
  }
  if(!plain(state.rewards))throw fail('INVALID_SAVE','奖励收据格式无效');
  for(const [id,receipt]of Object.entries(state.rewards)){
    keysOnly(receipt,'id source items claimed label','奖励收据');
    if(receipt.id!==id||!['stage','level'].includes(receipt.source)||typeof receipt.claimed!=='boolean')throw fail('INVALID_SAVE','奖励收据ID或来源无效');
    checkItems(receipt.items,'奖励物品');
    if(receipt.claimed!==Object.values(receipt.items).every(q=>q===0))throw fail('INVALID_SAVE','奖励领取标记与剩余物品不一致');
  }
  keysOnly(state.branch,'unlocked stages active attempts','农场支线');
  requiredKeys(state.branch,'unlocked stages active','农场支线');
  if(typeof state.branch.unlocked!=='boolean'||!plain(state.branch.stages))throw fail('INVALID_SAVE','支线记录无效');
  const stageId=id=>/^F(0[1-9]|1[0-9]|2[0-4])$/.test(id);
  if(Object.prototype.hasOwnProperty.call(state.branch,'attempts'))knownNumberMap(state.branch.attempts,stageId,'支线尝试计数');
  for(const [id,record]of Object.entries(state.branch.stages)){
    keysOnly(record,'won bestScore receiptId','支线通关记录');
    if(!stageId(id)||typeof record.won!=='boolean'||!int(record.bestScore)||record.receiptId!==`stage_${id}`)throw fail('INVALID_SAVE','支线通关记录无效');
  }
}
const ENTITY_EXTRA_KEYS={
  field:'crop',
  house:'fixed door',
  barn:'',
  silo:'',
  shelter:'tier animals skinId',
  machine:'machineType built buildReadyAt queue completed slots slotUpgrades blockedAt lastCompletionAt',
  fruit:'harvestStage status readyAt revived',
  decoration:'walkable footprintLayer',
  obstacle:'fixed',
  road:'footprintLayer walkable'
};

export function validateFarmState(state){
  checkedTree(state);
  if(!plain(state))throw fail('INVALID_SAVE','存档主体格式无效');
  for(const key of STATE_KEYS)if(key!=='clockWarning'&&!Object.prototype.hasOwnProperty.call(state,key))throw fail('INVALID_SAVE',`存档缺少必填字段：${key}`);
  for(const key of Object.keys(state))if(!STATE_KEYS.has(key))throw fail('INVALID_SAVE',`存档包含未知关键字段：${key}`);
  if(state.schemaVersion!==SCHEMA_VERSION)throw fail('UNSUPPORTED_VERSION','存档版本不受支持');
  if(state.contentVersion!==CONTENT_VERSION)throw fail('UNSUPPORTED_CONTENT','存档内容版本不同，需要显式迁移');
  for(const key of ['revision','layoutRevision','now','coins','xp','vouchers','materialChoices'])if(state[key]!==undefined&&!int(state[key]))throw fail('INVALID_SAVE',`${key}必须是非负整数`);
  if(!int(state.level)||state.level<1||state.level>30)throw fail('INVALID_SAVE','农场等级无效');
  checkItems(state.inventory,'库存');
  if(!Array.isArray(state.entities)||state.entities.length>8192)throw fail('INVALID_SAVE','实体列表无效');
  // Config exports remain mutable: capture their keys once per validation,
  // not once per entity and never permanently across validation calls.
  const allowed={
    field:['field'],
    house:['house'],
    barn:['barn'],
    silo:['silo'],
    shelter:Object.keys(ANIMALS),
    machine:Object.keys(BUILDINGS),
    fruit:Object.keys(FRUITS),
    decoration:[...Object.keys(DECORATIONS),...Object.keys(REWARD_DECORATIONS)],
    obstacle:['natural_tree','natural_bush','rock'],
    road:['road']
  };
  const ids=new Set();
  for(const e of state.entities){
    if(!plain(e)||typeof e.id!=='string'||!/^[a-zA-Z0-9_:-]{1,160}$/.test(e.id)||ids.has(e.id))throw fail('INVALID_SAVE','实体ID重复或无效');
    ids.add(e.id);
    keysOnly(e,`id kind configId x y w h rotation stored ${ENTITY_EXTRA_KEYS[e.kind]??''}`,'实体');
    if(!allowed[e.kind]?.includes(e.configId))throw fail('INVALID_SAVE',`未知实体配置：${e.configId}`);
    let expected;
    if(e.kind==='field'||e.kind==='road'||e.kind==='obstacle')expected=[1,1]; else if(e.kind==='house')expected=[4,4]; else if(['barn','silo'].includes(e.kind))expected=[3,3]; else if(e.kind==='shelter')expected=ANIMALS[e.configId].footprint; else if(e.kind==='machine')expected=BUILDINGS[e.configId].footprint; else if(e.kind==='fruit')expected=FRUITS[e.configId].footprint; else if(e.kind==='decoration')expected=decorationConfig(e.configId).footprint;
    if(expected&&(e.w!==expected[0]||e.h!==expected[1]))throw fail('INVALID_SAVE','实体占地与配置不符');
    if(e.kind==='decoration'&&(!!e.walkable!==!!decorationConfig(e.configId).walkable||(e.footprintLayer??'solid')!==(decorationConfig(e.configId).footprintLayer??'solid')))throw fail('INVALID_SAVE','装饰通行层与配置不符');
    const crop=e.crop??e.cropInstance;
    if(crop)keysOnly(crop,'itemId plantedAt readyAt yieldCount xp rescue borrowed grossYield repay','在田作物');
    if(crop&&(!CROPS[crop.itemId??crop.cropId??crop.id??crop.configId]))throw fail('INVALID_SAVE','田地包含未知作物');
    for(const job of [...(e.queue??[]),...(e.completed??[])]){
      keysOnly(job,'id recipeId inputs outputs baseDurationMs durationMs xp createdAt startAt readyAt accountedMs','机器任务');
      if(typeof job.id!=='string'||ids.has(job.id))throw fail('INVALID_SAVE','任务ID重复或无效');
      ids.add(job.id);
      for(const key of ['baseDurationMs','durationMs','xp','createdAt','accountedMs'])nonnegative(job[key],`任务${key}`);
      if(job.baseDurationMs<1||job.durationMs<1||job.accountedMs>job.durationMs||(job.startAt!==null&&!int(job.startAt))||(job.readyAt!==null&&!int(job.readyAt)))throw fail('INVALID_SAVE','任务时长无效');
      if(job.startAt!==null&&job.readyAt!==job.startAt+job.durationMs)throw fail('INVALID_SAVE','任务结束时间无效');
      if(job.recipeId&&!RECIPES[job.recipeId])throw fail('INVALID_SAVE','队列包含未知配方');
      if(job.inputs)checkItems(job.inputs,'队列原料');
      if(job.outputs)checkItems(job.outputs,'队列成品');
    }
  }
  for(const kind of ['house','barn','silo'])if(state.entities.filter(e=>e.kind===kind).length!==1)throw fail('INVALID_SAVE','缺少或重复必要设施');
  const layout=validateLayout(state);
  if(!layout.ok)throw fail('INVALID_SAVE',layout.errors[0].message);
  if(state.branch?.active!==null&&(!restoreBoard(state.branch.active)||state.branch.active.mode!=='farm'||state.branch.active.rules!=='farm-v1'))throw fail('INVALID_SAVE','农场支线棋局无效');
  validateLedgers(state);
  assertFarm(state);
  return true;
}
export function makeEnvelope(state,{
    saveId=uid('farm'),
    commitId=uid('commit'),
    savedAtWallMs=Date.now(),
    referenceVersion=state.referenceVersion??REFERENCE_VERSION
  }={}){
  const envelope={
    saveFormatVersion:1,
    schemaVersion:SCHEMA_VERSION,
    contentVersion:CONTENT_VERSION,
    referenceVersion,
    saveId,
    revision:state.revision,
    layoutRevision:state.layoutRevision??0,
    commitId,
    savedAtWallMs:Math.max(0,Math.floor(savedAtWallMs)),
    payload:clone(state)
  };
  envelope.checksum=checksum(envelope);
  return envelope;
}
export function validateEnvelope(envelope,{allowOld=false,metadataOnly=false}={}){
  if(!plain(envelope))throw fail('INVALID_SAVE','存档外壳无效');
  for(const key of Object.keys(envelope))if(!ENVELOPE_KEYS.has(key))throw fail('INVALID_SAVE',`存档外壳有未知字段：${key}`);
  if(!int(envelope.schemaVersion)||envelope.schemaVersion>SCHEMA_VERSION||(!allowOld&&envelope.schemaVersion!==SCHEMA_VERSION))throw fail('UNSUPPORTED_VERSION','无法导入未来或未知版本的存档');
  for(const key of ['revision','layoutRevision','savedAtWallMs'])if(!int(envelope[key]))throw fail('INVALID_SAVE','存档版本或日期无效');
  for(const key of ['saveId','commitId','contentVersion','referenceVersion'])if(typeof envelope[key]!=='string'||envelope[key].length>200)throw fail('INVALID_SAVE','存档元数据无效');
  const {checksum:signature,exportedAtWallMs,...body}=envelope;
  if(signature!==checksum(body))throw fail('CHECKSUM_MISMATCH','存档校验失败，文件可能损坏');
  if(metadataOnly)return true;
  if(envelope.saveFormatVersion!==1)throw fail('MIGRATION_REQUIRED','旧开发存档需要显式元数据迁移');
  if(!allowOld||envelope.schemaVersion===SCHEMA_VERSION){
    validateFarmState(envelope.payload);
    if(envelope.revision!==envelope.payload.revision||envelope.layoutRevision!==envelope.payload.layoutRevision||envelope.contentVersion!==envelope.payload.contentVersion)throw fail('INVALID_SAVE','存档外壳与主体版本不符');
  }
  return true;
}

/** One narrowly scoped migration for snapshots written during this v0.4 build.
 * These snapshots predate the save-format marker and only added control metadata.
 * Never synthesize inventory, production clocks, IDs, receipts, or balances.
 */
export function migrateV04DevelopmentSnapshot(original){
  if(original?.saveFormatVersion!==undefined)return clone(original);
  validateEnvelope(original,{allowOld:true,metadataOnly:true});
  if(original.schemaVersion!==1||original.contentVersion!==CONTENT_VERSION||original.payload?.schemaVersion!==1||original.payload?.contentVersion!==CONTENT_VERSION)throw fail('MIGRATION_REQUIRED','不是已知v0.4开发存档');
  const state=clone(original.payload),metadata=['features','camera','commandWatermarks','commandSeen','cosmetics'];
  const missing=metadata.filter(key=>!Object.prototype.hasOwnProperty.call(state,key)).sort().join(',');
  const knownPatterns=['','camera','camera,features','camera,commandSeen,commandWatermarks,cosmetics,features'];
  if(!knownPatterns.includes(missing))throw fail('MIGRATION_REQUIRED','旧开发存档的字段组合未知，未自动补全');
  const absent=key=>!Object.prototype.hasOwnProperty.call(state,key);
  if(absent('features'))state.features={...FARM_FEATURES};
  if(absent('camera'))state.camera={centerX:29.5,centerY:28.5,zoom:1};
  if(absent('cosmetics'))state.cosmetics={background:'default'};
  if(absent('commandWatermarks')&&absent('commandSeen')){
    state.commandWatermarks={};
    state.commandSeen={};
    if(!plain(state.commandLog))throw fail('INVALID_SAVE','缺少旧命令记录，不可迁移');
    for(const id of Object.keys(state.commandLog)){
      const seq=id.match(/^farmcmd:([a-zA-Z0-9_-]{1,80}):(\d+)$/);
      if(seq)state.commandWatermarks[seq[1]]=Math.max(state.commandWatermarks[seq[1]]??0,Number(seq[2]));else state.commandSeen[id]=true;
    }
  }
  if(!plain(state.commandWatermarks)||!plain(state.commandSeen))throw fail('INVALID_SAVE','命令索引不能为null或其它非对象值');
  if(plain(state.tutorial)&&!Object.prototype.hasOwnProperty.call(state.tutorial,'completed'))state.tutorial.completed={};
  if(plain(state.commandLog)){
    const ids=Object.keys(state.commandLog);
    for(const id of ids){
      const seq=id.match(/^farmcmd:([a-zA-Z0-9_-]{1,80}):(\d+)$/);
      if(seq)state.commandWatermarks[seq[1]]=Math.max(state.commandWatermarks[seq[1]]??0,Number(seq[2]));else state.commandSeen[id]=true;
    }
    for(
      let i=0
      ;i<ids.length-256;i++)delete state.commandLog[ids[i]];
  }
  validateFarmState(state);
  const next={...original,saveFormatVersion:1,payload:state};
  delete next.checksum;
  delete next.exportedAtWallMs;
  next.checksum=checksum(next);
  return next;
}

/** Explicit per-version migration registry. Unknown historical shapes are rejected. */
export function migrateEnvelope(envelope,migrations={}){
  let value=envelope?.schemaVersion===1&&envelope?.saveFormatVersion===undefined?migrateV04DevelopmentSnapshot(envelope):clone(envelope);
  validateEnvelope(value,{allowOld:true});
  for(
    let version=value.schemaVersion
    ;version<SCHEMA_VERSION;version++){
    if(typeof migrations[version]!=='function')throw fail('MIGRATION_REQUIRED',`缺少版本${version}到${version+1}的迁移`);
    const next=migrations[version](clone(value));
    if(!next||next.schemaVersion!==version+1)throw fail('INVALID_MIGRATION','迁移未产生下一版本');
    value=next;
  }
  validateEnvelope(value);
  return value;
}
function defaultStorage(){
  try{
    return globalThis.localStorage??null;
  }catch{
    return null;
  }
}
function monotonic(){
  return globalThis.performance?.now?.()??Date.now();
}
export function createFarmStore(options={}){
  const storage=options.storage===undefined?defaultStorage():options.storage;
  const wallNow=options.now??Date.now,monoNow=options.monotonicNow??monotonic;
  const locks=options.locks===undefined?globalThis.navigator?.locks:options.locks;
  const key=options.key??FARM_SAVE_KEY,lockName=`${key}:writer`;
  const listeners=new Set(),writerId=uid('writer');
  let commandOrdinal=0;
  let state,active=null,saveId=uid('farm'),diskCommit=null,diskRevision=-1;
  let wallAnchor=0,monoAnchor=0,logicalAnchor=0,closed=false,releasing=null,acquiring=null;
  let readOnly=!!locks,status={mode:locks?'locking':'single-window',readOnly:!!locks,warnings:locks?[]:['当前浏览器没有可靠的多窗口锁，请只保留一个农场窗口。']};
  const previews=new Map();
  // At most the two A/B slot values are retained. Storage is still read on every
  // conflict check; only byte-identical values can reuse their validation.
  const snapshotCache=new Map();
  const freezeSnapshot=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeSnapshot(child);Object.freeze(value);}return value;};
  function validatedSlot(slot,raw){
    const cached=snapshotCache.get(slot);
    if(cached&&cached.raw===raw)return cached;
    let entry={raw};
    if(raw!==null){
      try{
        const parsed=JSON.parse(raw),migrated=parsed.saveFormatVersion===undefined&&parsed.schemaVersion===1;
        const envelope=migrated?migrateV04DevelopmentSnapshot(parsed):parsed;
        validateEnvelope(envelope);
        entry.snapshot=freezeSnapshot({slot,raw,envelope,migrated});
      }catch(error){entry.invalid=Object.freeze({slot,error:error.code??'INVALID_SAVE',message:error.message});}
    }
    snapshotCache.set(slot,entry);return entry;
  }
  const emit=()=>{
    for(const fn of listeners)try{
      fn(clone(state),getStatus());
    }catch(error){
      options.onListenerError?.(error);
    }
  };
  const getStatus=()=>({...status,readOnly,revision:state?.revision??0,persistedRevision:diskRevision});
  const setFailure=error=>{
    status={...status,error:error.code??'SAVE_FAILED',message:error.message};
    return {ok:false,error:error.code??'SAVE_FAILED',code:error.code??'SAVE_FAILED',message:error.message,state:clone(state)};
  };
  const readRaw=suffix=>{
    if(!storage)throw fail('SAVE_FAILED','浏览器存储不可用，本次操作未执行');
    return storage.getItem(`${key}:${suffix}`);
  };
  function readSnapshots(){
    const snapshots=[],invalid=[];
    for(const slot of ['a','b']){
      const raw=readRaw(slot);
      const entry=validatedSlot(slot,raw);
      if(entry.snapshot)snapshots.push(entry.snapshot);
      if(entry.invalid)invalid.push(entry.invalid);
    }
    snapshots.sort((a,b)=>b.envelope.revision-a.envelope.revision||b.envelope.savedAtWallMs-a.envelope.savedAtWallMs);
    return {snapshots,invalid};
  }
  function anchor(){
    wallAnchor=Number(wallNow());
    monoAnchor=Number(monoNow());
    logicalAnchor=state.now;
  }
  function clockNow(){
    return Math.max(state.now,Math.floor(logicalAnchor+Math.max(0,Number(monoNow())-monoAnchor)));
  }
  function load(){
    try{
      const {snapshots,invalid}=readSnapshots();
      if(snapshots.length){
        if(!readOnly)for(const snapshot of snapshots.filter(s=>s.migrated)){
          const backupKey=`${key}:migration-original:${snapshot.envelope.commitId}`;
          if(storage.getItem(backupKey)!==snapshot.raw){
            storage.setItem(backupKey,snapshot.raw);
            if(storage.getItem(backupKey)!==snapshot.raw)throw fail('SAVE_FAILED','旧开发存档原件备份失败，暂未迁移');
          }
        }
        if(snapshots.some(s=>s.migrated))status.warnings=[...status.warnings.filter(w=>!w.startsWith('旧开发')),'旧开发存档已显式迁移控制配置；金币、库存、生产与奖励记录保持原样。'];
        const found=snapshots[0],envelope=found.envelope;
        state=clone(envelope.payload);
        saveId=envelope.saveId;
        active=found.slot;
        diskRevision=envelope.revision;
        diskCommit=envelope.commitId;
        const gap=Math.floor(Number(wallNow())-envelope.savedAtWallMs);
        if(gap<0)status.warnings=[...status.warnings.filter(w=>!w.startsWith('设备时间')),'设备时间比存档时间更早，已按零离线时间处理，不回退生产。'];
        const result=advanceFarm(state,state.now+Math.max(0,gap));
        state=result.state??result;
        if(invalid.length)status.warnings=[...status.warnings.filter(w=>!w.startsWith('一个存档')),'一个存档槽损坏，已恢复最高有效版本。'];
        status={...status,recoveryRequired:false,error:null,message:null};
      }else{
        state=createFarm(Math.max(0,Math.floor(Number(wallNow()))));
        active=null;
        diskRevision=-1;
        diskCommit=null;
        if(invalid.length){
          readOnly=true;
          status={
            ...status,
            recoveryRequired:true,
            error:'RECOVERY_REQUIRED',
            message:`存档槽都无法读取（${invalid.map(e=>`${e.slot.toUpperCase()}：${e.message}`).join('；')}）。已保留原文件，请导入备份恢复，不会自动覆盖。`,
            slotErrors:invalid
          };
        }
      }
      anchor();
      emit();
      if(status.recoveryRequired)return {ok:false,error:'RECOVERY_REQUIRED',message:status.message,state:clone(state),status:getStatus()};
      return {ok:true,state:clone(state),status:getStatus()};
    }catch(error){
      state??=createFarm(Math.max(0,Math.floor(Number(wallNow()))));
      readOnly=true;
      anchor();
      return setFailure(error);
    }
  }
  function checkConflict(){
    const {snapshots,invalid}=readSnapshots(),latest=snapshots[0]?.envelope;
    if((latest?.revision??-1)!==diskRevision||(latest?.commitId??null)!==diskCommit){
      readOnly=true;
      status.mode='conflict';
      throw fail('STALE_REVISION','另一窗口已更新农场。本次未执行，请重新加载或接管后再试。');
    }
    if(!latest&&invalid.length)throw fail('RECOVERY_REQUIRED','没有可用存档，请先恢复备份');
  }
  function persist(candidate,{commitId=uid('commit'),skipConflict=false}={}){
    if(readOnly||closed)throw fail('READ_ONLY',status.recoveryRequired?'请先恢复存档':'当前农场为只读，请关闭另一窗口或使用接管');
    if(!skipConflict)checkConflict();
    validateFarmState(candidate);
    const envelope=makeEnvelope(candidate,{saveId,commitId,savedAtWallMs:Number(wallNow())});
    const slot=active==='a'?'b':'a',target=`${key}:${slot}`,previous=storage.getItem(target),raw=JSON.stringify(envelope);
    let wrote=false;
    try{
      storage.setItem(target,raw);
      wrote=true;
      const stored=storage.getItem(target);
      if(stored!==raw)throw fail('SAVE_FAILED','存档写入校验失败，本次操作未执行');
      const verified=JSON.parse(stored);
      validateEnvelope(verified);
      snapshotCache.set(slot,{raw:stored,snapshot:freezeSnapshot({slot,raw:stored,envelope:verified,migrated:false})});
    }catch(error){
      if(wrote){
        try{
          if(previous===null)storage.removeItem(target);else storage.setItem(target,previous);
        }catch{
          readOnly=true;
          status.mode='uncertain';
          throw fail('SAVE_UNCERTAIN','存储状态不确定，已停止写入。请重新加载核对最后一次操作。');
        }
      }
      throw fail('SAVE_FAILED','无法保存，本次操作未执行。请释放浏览器存储空间后重试。');
    }

    // The fully verified snapshot is the commit. The active pointer is only a hint.
    try{
      storage.setItem(`${key}:active`,slot);
    }catch{
      status.warnings=[...status.warnings.filter(w=>!w.startsWith('活动指针')),'活动指针未写入；完整存档已保存，恢复时自动选最高有效版本。'];
    }
    active=slot;
    diskRevision=envelope.revision;
    diskCommit=envelope.commitId;
    state=clone(candidate);
    anchor();
    status={...status,error:null,message:null};
    return envelope;
  }
  function dispatch(command){
    try{
      if(!plain(command))throw fail('INVALID_COMMAND','操作格式不正确');
      if(readOnly||closed)throw fail('READ_ONLY','当前窗口为只读，请接管后操作');
      checkConflict();
      const cmd={
        ...command,
        commandId:command.commandId??`farmcmd:${writerId}:${++commandOrdinal}`,
        expectedRevision:command.expectedRevision??state.revision
      };
      let result;
      if(cmd.type==='tick')result=advanceFarm(state,clockNow()); else result=executeFarm(state,cmd,clockNow());
      if(result.ok===false)throw fail(result.error??'INVALID_COMMAND',result.message);
      const candidate=result.state??result;
      // A changed revision already proves a changed state. Preserve the full
      // comparison for equal revisions (including legitimate no-op commands).
      if(candidate.revision!==state.revision||canonicalStringify(candidate)!==canonicalStringify(state)||diskRevision<0)persist(candidate,{commitId:cmd.commandId});
      emit();
      return {...result,ok:true,state:clone(state),revision:state.revision,commandId:cmd.commandId};
    }catch(error){
      const result=setFailure(error);
      emit();
      return result;
    }
  }
  function exportSave(){
    const projected=advanceFarm(state,clockNow()).state;
    const envelope=makeEnvelope(projected,{saveId,commitId:diskCommit??uid('export'),savedAtWallMs:Number(wallNow())});
    envelope.exportedAtWallMs=Math.max(0,Math.floor(Number(wallNow())));
    return JSON.stringify(envelope,null,2);
  }
  function importPreview(text){
    try{
      if(typeof text!=='string')throw fail('INVALID_SAVE','请选择JSON存档文件');
      if(new TextEncoder().encode(text).byteLength>MAX_IMPORT_BYTES)throw fail('FILE_TOO_LARGE','导入文件不能超过10MB');
      const parsed=JSON.parse(text);
      checkedTree(parsed);
      const envelope=migrateEnvelope(parsed,options.migrations??{});
      const token=uid('import');
      previews.clear();
      previews.set(token,{envelope,original:text,expectedRevision:state.revision,expectedCommit:diskCommit});
      return {
        ok:true,
        token,
        previewToken:token,
        summary:{
          level:envelope.payload.level,
          coins:envelope.payload.coins,
          savedAtWallMs:envelope.savedAtWallMs,
          revision:envelope.revision,
          contentVersion:envelope.contentVersion
        },
        level:envelope.payload.level,
        coins:envelope.payload.coins,
        savedAtWallMs:envelope.savedAtWallMs
      };
    }catch(error){
      return {ok:false,error:error.code??'INVALID_SAVE',message:error.message};
    }
  }
  function confirmImport(token){
    try{
      const preview=previews.get(typeof token==='object'?token.token??token.previewToken:token);
      if(!preview)throw fail('INVALID_IMPORT','请先预览存档，再确认导入');
      if(closed||(locks&&!releasing)||(!status.recoveryRequired&&readOnly))throw fail('READ_ONLY','只读窗口不能导入存档');
      if(preview.expectedRevision!==state.revision||preview.expectedCommit!==diskCommit)throw fail('STALE_REVISION','预览后农场已变化，请重新预览');
      if(!status.recoveryRequired)checkConflict();

      // Both backups are verified before the new economic state is committed.
      const backups=[['before-import',exportSave()],['import-original',preview.original]];
      for(const [suffix,raw]of backups){
        storage.setItem(`${key}:${suffix}`,raw);
        if(storage.getItem(`${key}:${suffix}`)!==raw)throw fail('SAVE_FAILED','导入前备份失败，未替换现档');
      }
      let imported=clone(preview.envelope.payload);
      imported=advanceFarm(imported,imported.now+Math.max(0,Math.floor(Number(wallNow())-preview.envelope.savedAtWallMs))).state;
      imported.revision=Math.max(state.revision,imported.revision,diskRevision)+1;
      const wasReadOnly=readOnly;
      readOnly=false;
      try{
        persist(imported,{commitId:uid('import'),skipConflict:!!status.recoveryRequired});
      }catch(error){
        readOnly=wasReadOnly;
        throw error;
      }
      status={...status,recoveryRequired:false,error:null,message:null};
      previews.clear();
      clearDraft();
      emit();
      return {ok:true,state:clone(state),revision:state.revision};
    }catch(error){
      return setFailure(error);
    }
  }
  function recoveries(){
    try{
      return readSnapshots().snapshots.slice(0,2).map(({slot,envelope:e})=>({
            slot,
            revision:e.revision,
            savedAtWallMs:e.savedAtWallMs,
            level:e.payload.level,
            coins:e.payload.coins,
            contentVersion:e.contentVersion
          }));
    }catch{
      return [];
    }
  }
  function recoveryPreview(revision){
    try{
      const snapshot=readSnapshots().snapshots.find(s=>s.envelope.revision===revision||s.slot===revision);
      if(!snapshot)throw fail('NO_BACKUP','找不到这份有效快照，请重新选择');
      const preview=importPreview(snapshot.raw);
      return preview.ok?{...preview,text:snapshot.raw}:preview;
    }catch(error){
      return {ok:false,error:error.code??'INVALID_SAVE',message:error.message};
    }
  }
  function recover(revision){
    const preview=recoveryPreview(revision);
    return preview.ok?confirmImport(preview.token):preview;
  }
  function saveDraft(draft){
    try{
      if(readOnly)throw fail('READ_ONLY','只读窗口不能保存布局草稿');
      const positions=Array.isArray(draft)?draft:draft.positions;
      if(!Array.isArray(positions))throw fail('INVALID_LAYOUT','布局草稿格式不正确');

      // Drafts may be invalid while editing, but never contain production/economics.
      const clean={
        saveId,
        baseRevision:state.revision,
        layoutRevision:state.layoutRevision,
        positions:positions.map(p=>({id:p.id,x:p.x,y:p.y,rotation:p.rotation??0,stored:!!p.stored}))
      };
      checkedTree(clean);
      storage.setItem(`${key}:draft`,JSON.stringify(clean));
      return {ok:true};
    }catch(error){
      return {ok:false,error:error.code??'SAVE_FAILED',message:error.message};
    }
  }
  function loadDraft(){
    try{
      const draft=JSON.parse(readRaw('draft'));
      if(!draft||draft.saveId!==saveId||!Array.isArray(draft.positions))return null;
      checkedTree(draft);
      return draft;
    }catch{
      return null;
    }
  }
  function clearDraft(){
    if(readOnly||closed)return {ok:false,error:'READ_ONLY',message:'只读窗口不能删除布局草稿'};
    try{
      storage?.removeItem(`${key}:draft`);
      return {ok:true};
    }catch{
      return {ok:false,error:'SAVE_FAILED'};
    }
  }
  let channel=null;
  if(options.channelFactory)channel=options.channelFactory(`${key}:coordination`); else if(typeof window!=='undefined'&&globalThis.BroadcastChannel)channel=new BroadcastChannel(`${key}:coordination`);
  channel?.addEventListener?.('message',event=>{
      if(event.data?.type==='takeover'&&releasing){
        readOnly=true;
        status.mode='read-only';
        releasing();
        releasing=null;
        emit();
      }
    });
  function acquireWriter(){
    if(closed)return Promise.resolve(false);
    if(!locks){
      readOnly=false;
      status.mode='single-window';
      const loaded=load();
      if(!loaded.ok||status.recoveryRequired)readOnly=true;
      emit();
      return Promise.resolve(!readOnly);
    }
    if(releasing)return Promise.resolve(!readOnly&&!status.recoveryRequired);
    if(acquiring)return acquiring;
    acquiring=new Promise(resolve=>{
        locks.request(lockName,{mode:'exclusive',ifAvailable:true},async lock=>{
            if(!lock||closed){
              readOnly=true;
              status.mode='read-only';
              resolve(false);
              emit();
              return;
            }
            let release;
            const held=new Promise(done=>{
                release=done;
              });
            releasing=release;
            readOnly=false;
            status.mode='writer';
            const loaded=load();
            if(!loaded.ok||status.recoveryRequired)readOnly=true;
            resolve(!readOnly);
            emit();
            await held;
          }).catch(error=>{
            readOnly=true;
            status.mode='lock-error';
            status.message=error.message;
            resolve(false);
            emit();
          });
      }).finally(()=>{
        acquiring=null;
      });
    return acquiring;
  }
  async function takeover(){
    if(!locks)return acquireWriter();
    channel?.postMessage?.({type:'takeover'});
    await new Promise(resolve=>setTimeout(resolve,80));
    return acquireWriter();
  }
  function onStorage(event){
    if(event.key===`${key}:a`||event.key===`${key}:b`){
      try{
        checkConflict();
      }catch{
        readOnly=true;
        status.mode='conflict';
        status.message='其它窗口更新了农场，请重新加载或接管。';
        emit();
      }
    }
  }
  if(typeof window!=='undefined')window.addEventListener('storage',onStorage);
  function close(){
    closed=true;
    readOnly=true;
    releasing?.();
    releasing=null;
    channel?.close?.();
    if(typeof window!=='undefined')window.removeEventListener('storage',onStorage);
    listeners.clear();
    snapshotCache.clear();
  }
  load();
  const store={
    tick:()=>dispatch({type:'tick'}),
    getState:()=>clone(state),
    getStatus,
    dispatch,
    subscribe(fn){
      listeners.add(fn);
      return()=>listeners.delete(fn);
    },
    load,
    exportSave,
    export:exportSave,
    importPreview,
    confirmImport,
    recoveries,
    recoveryPreview,
    recover,
    saveDraft,
    loadDraft,
    clearDraft,
    acquireWriter,
    takeover,
    close,
    beginLayout:()=>beginLayout(state),
    get readOnly(){
      return readOnly;
    },
    get status(){
      return getStatus();
    }
  };
  store.ready=locks?acquireWriter():Promise.resolve(!readOnly);
  return store;
}
