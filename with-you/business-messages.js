const names={studio:'创意工作室',shop:'城市零售店',tech:'软件公司'};
export function businessMessage(s,id){
 if(!s.visits?.[id])return null;
 const e=s.economy,seen=s.businessShared?.[id]||{},c=e?.company;
 const film=e?.films.find(f=>f.left===0);
 if(film&&!seen.film){const gain=film.return-film.budget;return {key:'film',text:`我的第一部影片上映了。投入 ¥${film.budget.toLocaleString()}，分账 ¥${film.return.toLocaleString()}，${gain>=0?'盈利':'亏损'} ¥${Math.abs(gain).toLocaleString()}。`,response:id==='lin'?(gain>=0?'恭喜你把它做完了。回款到账以后，也记得给下一件事留一点余地。': '听起来有些失望。要不要先把这次的投入和回款记下来？也可以先只和我说说心情。'):'从开始做到真正上映，一定有很多只有你知道的时刻。下次见面，我想听听这个过程。'};}
 if(c?.level>1&&!seen.expansion)return {key:'expansion',text:`我的${names[c.sector]}扩张到 ${c.level} 级了，接下来也要承担更多运营成本。`,response:id==='lin'?'听到你走到这一步，我很替你开心。忙起来以后，别把自己的休息日全挤掉。':'那就给今天留个小记号吧。下次来喝茶，可以讲讲你最想实现的那个想法。'};
 if(c&&!seen.company)return {key:'company',text:`我开始经营一家${names[c.sector]}了。第一次自己安排资金，还有些紧张。`,response:id==='lin'?'第一步真的迈出去了。你要是愿意，我们下次可以聊聊最想保留下来的方向。':'听起来像一张刚铺开的画纸。紧张也没关系，先慢慢画第一笔。'};
 return null;
}
export function shareBusiness(s,id){const message=businessMessage(s,id);if(!message)return false;s.businessShared??={};s.businessShared[id]??={};s.businessShared[id][message.key]=true;if(s.economy?.company)s.businessShared[id].company=true;if(s.economy?.company?.level>1)s.businessShared[id].expansion=true;if(s.economy?.films.some(f=>f.left===0))s.businessShared[id].film=true;s.messages??={};s.messages[id]??=[];s.messages[id].push({me:true,day:s.day,text:message.text},{me:false,day:s.day,text:message.response});s.logs.push(`第 ${s.day} 天：向${id==='lin'?'知夏':'以宁'}分享事业近况。${message.text}`);return true;}
