import {FARM_DESIGNS} from './farm-designs.mjs';

export const FARM_SEASONS = FARM_DESIGNS;
export const FARM_REWARDS = FARM_DESIGNS[0].rewards;
export function farmTheme(index=0) {
  return FARM_SEASONS[(Number.isSafeInteger(index)&&index>=0?index:0)%FARM_SEASONS.length];
}

// Rewards derive from first-time campaign progress, never total replay wins.
export function farmProgress(stats) {
  const cleared=Number.isSafeInteger(stats?.highestCleared)&&stats.highestCleared>=0?stats.highestCleared+1:0;
  const rewards=Math.floor(cleared/4);
  const latest=Math.floor(rewards/FARM_REWARDS.length);
  return {cleared,rewards,latest,farms:latest+1,nextAt:(rewards+1)*4,remaining:4-cleared%4};
}
export function farmReward(number) {
  if(!Number.isSafeInteger(number)||number<1)return null;
  const index=(number-1)%FARM_REWARDS.length;
  const farm=Math.floor((number-1)/FARM_REWARDS.length);
  return {...farmTheme(farm).rewards[index],number,level:number*4,farm,step:index+1};
}
export function farmPage(progress,page=progress.latest) {
  const previewEnd=Math.floor(progress.latest/FARM_SEASONS.length)*FARM_SEASONS.length+FARM_SEASONS.length-1;
  const index=Math.max(0,Math.min(previewEnd,Number.isSafeInteger(page)?page:progress.latest));
  return {index,filled:Math.max(0,Math.min(FARM_REWARDS.length,progress.rewards-index*FARM_REWARDS.length)),unlocked:index<=progress.latest,unlockAt:index*24};
}
