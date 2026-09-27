import {isMonth,storyDays,monthLength} from './month.js?v=month08';
import {people,blocked} from './engine.js?v=month08';
import {projectProgress} from './life.js?v=month08';
export function guidance(s){
 if(!s)return '放下行李，让生活从这里开始。';
 if(s.career)return '书桌里的经营台可以交易、管理公司与拍电影。每次生活行动推进一周，记得留够运营现金。';
 if(s.energy<18)return '精力不多了。出门去滨河步道，免费休息半天。';
 if(s.day===monthLength(s))return s.ending?`今天已经和${people[s.ending]?.name||'她'}留下约定，余下时间也可以安排自己的生活。`:isMonth(s)?'月底到了。看看手机，决定下一段生活想和谁一起走。':'周日到了。手机里看看近况，见面时决定要不要更进一步。';
 if(isMonth(s)){const next=['lin','shen'].find(id=>s.visits[id]&&storyDays[s.visits[id]]<=s.day&&!blocked(s,id));if(next)return `${people[next].name}今天有新的故事。也可以打开经营台看看现金流。`;return s.economy?.company?'公司需要周转现金；查看月历安排下次见面，也给自己留一点空白。':'打开书桌积累资金、观察行情；月历里记着下一次见面的日子。';}
 const known=Object.keys(people).filter(id=>s.visits[id]>0);
 const available=known.filter(id=>!blocked(s,id));
 if(available.length)return `${people[available[0]].name}今天可以见面。出门查看地点，也给自己的生活留半天。`;
 if(!known.length)return s.day>=4?'生活已经有了自己的节奏。也可以出门，在咖啡馆或工作室认识一个新朋友。':'先安顿下来：书桌可以工作，出门也许会遇见新朋友。';
 if(projectProgress(s)<3)return `今天把时间留给自己。电脑里的独立方案已完成 ${projectProgress(s)}/3 步。`;
 return '手里的方案已交付。看看消息，或到河边歇一歇，明天再继续故事。';
}
export function relationshipNote(s,id){
 if(!s.visits[id])return '尚未相识';
 if(s.campaignDays===30){if(s.flags['sunday'+id])return s.ending===id||s.ending?.who===id||s.partner===id?'一起期待下个月':'珍惜这份友谊';if(s.flags[id+'FriendIntent']||s.flags[id+'Friends'])return '珍惜这份友谊';if(s.visits[id]>=12)return '留下月底的约定';if(s.visits[id]>=10)return '分享过彼此的失落';if(s.visits[id]>=6)return '一起经历城市日常';}
 if(s.flags['sunday'+id])return s.ending===id||s.ending?.who===id?'一起期待下周':'彼此尊重，慢慢了解';
 if(s.visits[id]>=5)return '留下周末邀请';
 if(s.visits[id]>=4)return '开始分享自己的生活';
 if(s.visits[id]>=2)return '听过彼此的烦恼';
 return '记住了彼此的名字';
}
