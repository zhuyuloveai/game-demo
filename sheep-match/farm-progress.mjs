export const FARM_REWARDS = [
  {level:4,name:'门前的小花园',short:'小花园',heading:'花开了，因为你。',description:'空空的草地上，终于有了第一抹花色。',claim:'把花园带回家',icon:'flowers',toast:'第一朵花开了，家也有了模样。'},
  {level:8,name:'第一位小居民',short:'小羊',heading:'它认得回家的路。',description:'一只软乎乎的小羊，决定在这里住下来。',claim:'接小羊回家',icon:'sheep',toast:'咩～以后，这里就有人等你啦。'},
  {level:12,name:'亮着灯的小木屋',short:'小屋',heading:'这一次，真的有家了。',description:'风再大，也有一扇亮着灯的窗等着你。',claim:'点亮家里的灯',icon:'house',toast:'小屋亮灯了，欢迎回家。'},
  {level:16,name:'甜甜的苹果树',short:'果树',heading:'把日子，种得甜一点。',description:'树荫一点点长大，小羊有了午睡的地方。',claim:'把果树种下',icon:'tree',toast:'等风吹过，就闻得到果子的香。'},
  {level:20,name:'会荡漾的小池塘',short:'池塘',heading:'有水声，也有嘎嘎声。',description:'两只小鸭划着水，带来了一个热闹的下午。',claim:'欢迎小鸭入住',icon:'duck',toast:'嘎嘎～新邻居已经迫不及待下水了。'},
  {level:24,name:'热热闹闹的大家庭',short:'新伙伴',heading:'小小的世界，满满的喜欢。',description:'又来了小羊和小鸡，每一处都慢慢热闹起来。',claim:'欢迎大家回家',icon:'chick',toast:'这些热闹，都是你一关一关攒来的。'},
];

// Rewards derive from first-time campaign progress, never total replay wins.
export function farmProgress(stats) {
  const cleared=Number.isSafeInteger(stats?.highestCleared)&&stats.highestCleared>=0?stats.highestCleared+1:0;
  const rewards=Math.floor(cleared/4);
  const latest=Math.max(0,Math.ceil(rewards/FARM_REWARDS.length)-1);
  return {cleared,rewards,latest,farms:latest+1,nextAt:(rewards+1)*4,remaining:4-cleared%4};
}
export function farmReward(number) {
  if(!Number.isSafeInteger(number)||number<1)return null;
  const index=(number-1)%FARM_REWARDS.length;
  return {...FARM_REWARDS[index],number,level:number*4,farm:Math.floor((number-1)/FARM_REWARDS.length),step:index+1};
}
export function farmPage(progress,page=progress.latest) {
  const index=Math.max(0,Math.min(progress.latest,Number.isSafeInteger(page)?page:progress.latest));
  return {index,filled:Math.max(0,Math.min(FARM_REWARDS.length,progress.rewards-index*FARM_REWARDS.length))};
}
