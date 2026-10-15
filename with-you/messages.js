import {shareBusiness} from './business-messages.js?v=month08';
import {isMonth,monthLength,storyDays} from './month.js?v=month08';
export function incoming(s,id){
 const n=s.visits[id],f=s.flags;
 if(!n)return '附近的人 · 先去认识她';
 if(s.career)return id==='lin'?'这周过得怎么样？忙完也记得给自己留一点时间。':'我又画了一张新的街景。有空来喝茶，听你讲讲最近的事。';
 if(isMonth(s)&&!s.ended&&s.day!==30){const next=storyDays[n];const specific=id==='lin'?['那天没有待办的散步，我还记得。','我在想清楚合作范围，也给自己的生活留时间。','把边界说出来之后，好像没那么害怕了。','市集的桌子收好了，谢谢你陪我试了一次。','这次有点失望，不过我想保留那些真正喜欢的部分。','谢谢你愿意把自己的那一页也翻开。','月底见面吧，我们慢慢聊下个月。']:['展览的留言册上，多了一些陌生人的话。','报价发出去了，这次每一项我都算过。','署名和修改范围，我想自己认真决定。','那本街区小册子，有一页是和你一起完成的。','退回来的画，我还是给它留了一面墙。','样本已经印好了，想带一本给你。','月底一起走走吧，不用找特别的理由。'];if(n>=6)return specific[Math.min(n-6,6)]+(next&&s.day<next?`第${next}天再见。`:'');if(next&&s.day<next)return `第${next}天我有空，见面再慢慢聊。`; }
 if(s.ended)return '这一章的聊天已收进回忆。';
 if(s.day===monthLength(s))return f['sunday'+id]?'今天见到你很开心。回去慢点。':s.ending?'今天也记得照顾好自己。':'今天有空的话，要不要一起坐坐？';
 if(n>=5)return isMonth(s)?'下次一起走走吧，看看月历里的安排。':'周日再确认时间吧。先好好过完今天。';
 if(n===4)return id==='lin'?'谢谢你也愿意说起自己的事。下次换我听。':'面包吃完了，画框也装好了。今天很踏实。';
 if(n===3)return id==='lin'?'提案发出去了。今天终于能喝一杯热咖啡。':'画投出去了。现在有点紧张，也有点期待。';
 if(n===2)return id==='lin'?(f.listenLin?'我还在想你问的：最想留下哪一部分。':'我准备再看一遍提案，也早点睡。'):(f.seeShen?'你看到的那盏灯，我想保留下来。':'那张黄昏还在桌边，我会再想一想。');
 return id==='lin'?'今天有没有淋到雨？记得把湿纸袋里的东西拿出来。':'那支逃跑的画笔已经回家了。谢谢你。';
}
export function replyToMessage(s,id,kind){
 if(kind==='business')return shareBusiness(s,id);
 s.messages??={};s.messages[id]??=[];s.chatReplies??={};
 const key=`${id}-${s.day}-${kind}`;
 if(s.chatReplies[key])return false;
 s.chatReplies[key]=true;
 const greet=kind==='greet';
 s.messages[id].push({me:true,day:s.day,text:greet?'今天过得怎么样？':'有空时，我想再去看看你。'}, {me:false,day:s.day,text:greet?incoming(s,id):s.flags['metDay'+id]===s.day?'今天的事还记着呢，明天再聊。':s.visits[id]>=5&&s.day<7?'那就周日联系，我也给自己留一点空白。':'好，出门前看看自己的安排。我们见面再慢慢说。'});
 s.logs.push(`第 ${s.day} 天：给${id==='lin'?'知夏':'以宁'}发了一条消息。`);
 return true;
}
