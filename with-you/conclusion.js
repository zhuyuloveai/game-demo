import {monthLength,monthlySummary} from './month.js?v=month08';
import {lifeSummary} from './life.js?v=month08';
function baseConclusion(s){
 const who=s.ending, f=s.flags;
 if(who==='lin')return {who,title:'把下个周末，也留给你',text:[
 '知夏把两杯咖啡放在窗边。她把手机调成静音，认真问你：“下周，你想去哪儿？”',
 f.honestLin?'她记得你说过害怕跟不上。“慢一点也没关系。”她说，“下次也把这些告诉我。”':f.listenLin?'“最想留下的那部分，我留住了。”她笑着说。这次你知道，她说的也不全是提案。':'你们还没有给关系命名，但已经开始一起期待未来。',lifeSummary(s)
 ].join(' ')};
 if(who==='shen')return {who,title:'你在我的画面里',text:[
 '以宁把那张速写送给你。画面里没有正脸，只有两个并肩看落日的影子。',
 f.seeShen?'画角留着一盏小灯。“你第一次看到它的时候，我就记住了。”她说。':f.honestShen?'“下次再一起吃面包吧，两个普通人。”她小声说，笑得很坦然。':'“下次换你选地方。”她说，把展览票根夹进了你的手记。',lifeSummary(s)
 ].join(' ')};
 const growth=(s.workCount||0)>=3 || (s.studyCount||0)>=3;
 const known=['lin','shen'].filter(id=>s.visits[id]>0).map(id=>id==='lin'?'知夏':'以宁');
 const memory=s.flags.honestShen||s.flags.helpShen?'一起装画框、吃面包的那天，也留在了手记里。':s.flags.seeShen?'你还记得画里那盏小灯，她也记得有人认真看过。':s.flags.listenLin?'那次关于提案的长谈，还留在彼此的记忆里。':'';
 const relation=known.length?`${known.join('和')}的名字已经在通讯录里。你们还在慢慢了解，这一周的相处并没有因为没有约会而消失。`:'这周还没有熟悉的名字，但城市已经不再完全陌生。';
 return {who:null,kind:growth?'growth':'life',title:growth?'慢慢成为喜欢的自己':'这座城，开始有了温度',text:`${lifeSummary(s)} ${relation} ${memory} 晚饭还热，明天也值得期待。`};
}

export function conclusion(s){const result=baseConclusion(s);if(monthLength(s)===30){if(result.who==='lin')result.title='把下个月，也留给你';result.text=result.text.replaceAll('这一周','这一个月').replaceAll('这周还没有','这个月还没有').replace('你们还没有给关系命名，但已经开始一起期待未来。','你们认真确定了彼此的关系，也开始一起期待未来。')+' '+monthlySummary(s);if(s.flags.linFailure&&result.who==='lin')result.text+=' 她还记得市集不顺的那天，你愿意陪她把失望说完。';if(s.flags.shenFailure&&result.who==='shen')result.text+=' 那次退稿后的晚饭，也成为你们愿意继续靠近的理由。';}return result;}
