// Additional relationship moments used after the initial three encounters.
export function extraStory(s,who,episode){
 const lin=[
  {title:'不用替我撑伞',lines:['知夏把电脑包挪开，给你的杯子腾出位置。“今天想听你说。搬来以后，有没有哪件事比想象中难？”','你说起那些没有人催促、却总想做好的小事。她安静听着，没有急着提出解决办法。','“原来你也会这样。”她停了停，“那我们以后可以轮流当那个听的人。”'],options:[{label:'承认自己也会害怕跟不上',points:2,flag:'honestLin',response:'“下次不用等想明白了再来。”她把纸巾盒推近了一点，像第一次见面那样。'},{label:'分享今天完成的一件小事',points:1,flag:'shareLin',response:'她认真记住了那个细节。“等有下一步，也告诉我。”'}]},
  {title:'空白的周日',lines:['提案的最终版已经发出，知夏却还在检查邮箱。她看到你，终于把屏幕扣下来。',s.flags.honestLin?'“你上次说的那种害怕，我也有。不过今天，我想试试允许自己休息。”':'“我给日历留了一块空白。以前看到空白，总忍不住塞进工作。”','“如果周日你有空，我们就去窗边坐一会儿。不聊提案，也不赶时间。”'],options:[{label:'“我会留一点时间，周日再确认。”',points:2,flag:'inviteLin',response:'“好，我也留着。”她在日历上画了一个很小的咖啡杯。'},{label:'“还没排好，不过谢谢你想到我。”',points:1,response:'“没关系。”她合上日历，“你也有自己的生活。到时候再说。”'}]}
 ];
 const shen=[
  {title:'画布之外的声音',lines:['以宁正在装画框。螺丝掉到地上，她找了半天，最后坐在地板上笑了。','“我好像一紧张，就连这些小事也不会做了。”她给你让出一块干净的地方。','你们没急着把画挂好，先吃完了楼下买来的面包。她问起你这几天的生活。'],options:[{label:'说起自己做砸过的一件小事',points:2,flag:'honestShen',response:'“那今天算两个普通人一起开工。”她把另一半面包递给你。'},{label:'陪她把画框一点点装好',points:1,flag:'helpShen',response:'木框扣上的声音很轻。她在背面写下日期，又小声说了句谢谢。'}]},
  {title:'写在展签上的名字',lines:['展览的确认消息来了。以宁把手机举给你看，又很快收回去，像怕自己的高兴太明显。',s.flags.seeShen?'“那盏灯会挂在入口右边。”她说，“你应该一下就能找到。”':'“是那张安静的黄昏。他们说，想给它留一面安静的墙。”','“周日如果你来，我想带你从第一张画开始看。”'],options:[{label:'“我想听你亲自讲，周日再确认。”',points:2,flag:'inviteShen',response:'她在展览地图上圈出入口。“我会在这里等你消息。”'},{label:'“祝你顺利，我还需要安排一下。”',points:1,response:'“嗯，先顾好你自己的事。”她把地址发给你，“有空再来。”'}]}
 ];
 return (who==='lin'?lin:shen)[episode-3];
}
