// Presentation only. Never writes inventory, currency, growth or layout state.
export const events={
 V01:{name:'播种落点',className:'sow',duration:420,glyph:'·',text:'已播种'},
 V02:{name:'划刷选中',className:'brush',duration:400,glyph:'✓',text:'已选中'},
 V03:{name:'收获飞入库存',className:'harvest',duration:650,glyph:'↗',text:'已收获'},
 V04:{name:'喂养小心形',className:'feed',duration:650,glyph:'♥',text:'已喂养'},
 V05:{name:'机器完成闪光',className:'complete',duration:700,glyph:'✦',text:'加工完成'},
 V06:{name:'交易金币汇总',className:'sale',duration:700,glyph:'●',text:'交易完成'},
 V07:{name:'扩地雾消散',className:'fog',duration:850,glyph:'',text:'地块已开放'},
 V08:{name:'布局合法/冲突轮廓',className:'layout',duration:900,glyph:'✓',text:'可放置'},
 V09:{name:'取消回弹',className:'cancel',duration:380,glyph:'↶',text:'已取消'},
 V10:{name:'留种保护提示',className:'protect',duration:1000,glyph:'!',text:'已保留最低种植库存'},
 V11:{name:'复苏亮叶',className:'revive',duration:750,glyph:'❧',text:'植株已复苏'},
 V12:{name:'仓满/完成区满',className:'full',duration:1000,glyph:'!',text:'空间不足'}
};
export function createFeedback(layer,{reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}={}){const seen=new Set(),active=new Set();let live=document.createElement('span');live.className='fx-sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');layer.append(live);return {beginBatch(){seen.clear();},emit(id,{x=0,y=0,targetX=x,targetY=y-44,entityId='',batchId='',label,conflict=false,fullReason='storage'}={}){const spec=events[id];if(!spec)throw Error('Unknown feedback '+id);const key=[id,batchId,entityId].join(':');if(batchId&&seen.has(key))return null;if(batchId)seen.add(key);const node=document.createElement('span');node.className='farm-fx fx-'+spec.className+(conflict?' fx-conflict':'')+(reducedMotion()?' fx-reduced':'');node.style.left=x+'px';node.style.top=y+'px';node.style.setProperty('--dx',(targetX-x)+'px');node.style.setProperty('--dy',(targetY-y)+'px');node.style.setProperty('--duration',spec.duration+'ms');let text=label??(id==='V08'&&conflict?'无法放置：占地冲突':id==='V12'?(fullReason==='output'?'完成区已满，生产暂停':'仓库已满，请先整理'):spec.text);const glyph=document.createElement('b');glyph.textContent=id==='V08'&&conflict?'×':spec.glyph;node.append(glyph);const caption=document.createElement('small');caption.textContent=text;node.append(caption);node.setAttribute('aria-hidden','true');live.textContent=text;layer.append(node);active.add(node);const timer=setTimeout(()=>{node.remove();active.delete(node);},reducedMotion()?1400:spec.duration+650);return{element:node,cancel(){clearTimeout(timer);node.remove();active.delete(node);}};},destroy(){active.forEach(n=>n.remove());active.clear();seen.clear();live.remove();}};}
