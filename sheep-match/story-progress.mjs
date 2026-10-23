import {STORIES} from './story-data.mjs';
import {farmProgress} from './farm-progress.mjs';

export function collectedStories(stats) {
  const {cleared}=farmProgress(stats);
  return STORIES.filter(story=>story.level<=cleared);
}

// Collection follows campaign progress. Acknowledgement only controls autoplay.
export function restoreStoryProgress(raw,stats,{legacy=false}={}) {
  const eligible=new Set(collectedStories(stats).map(story=>story.id));
  const acknowledged=raw?.version===1&&Array.isArray(raw.acknowledged)
    ? [...new Set(raw.acknowledged.filter(id=>eligible.has(id)))]
    : legacy?[...eligible]:[];
  return {version:1,acknowledged};
}

export function acknowledgeStory(state,id,stats) {
  if(!collectedStories(stats).some(story=>story.id===id)||state.acknowledged.includes(id))return state;
  return {...state,acknowledged:[...state.acknowledged,id]};
}

export function arrivalStory(state,stats,page) {
  if(!Number.isInteger(page)||page<0||page>3)return null;
  const story=STORIES[page*2];
  return story.level<=farmProgress(stats).cleared&&!state.acknowledged.includes(story.id)?story:null;
}

export function completionStory(state,stats,claimedRewards) {
  // When several seasons passed without a home visit, show the latest completion
  // once; earlier eligible stories remain available in the notebook.
  if(!Number.isSafeInteger(claimedRewards)||claimedRewards<0)return null;
  return collectedStories(stats).filter(story=>story.kind==='complete'&&story.level/4<=claimedRewards&&!state.acknowledged.includes(story.id)).at(-1)||null;
}

export function acknowledgeCompletion(state,id,stats) {
  const story=STORIES.find(entry=>entry.id===id&&entry.kind==='complete');
  if(!story||!collectedStories(stats).some(entry=>entry.id===id))return state;
  // Older chapters are silently filed instead of forming a delayed popup queue.
  for(const entry of collectedStories(stats))if(entry.level<story.level||entry.id===id)state=acknowledgeStory(state,entry.id,stats);
  return state;
}
