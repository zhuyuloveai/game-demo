import { validLevel } from './engine.mjs';

export function restoreProgress(raw, campaign) {
  const completed = Array.isArray(raw?.completed) ? raw.completed.filter(validLevel) : [];
  const highestCleared = Math.max(-1, ...completed, validLevel(raw?.highestCleared) ? raw.highestCleared : -1);
  return {
    wins: Number.isSafeInteger(raw?.wins) && raw.wins > 0 ? raw.wins : 0,
    highestCleared,
    unlocked: Math.max(0, highestCleared + 1, validLevel(raw?.unlocked) ? raw.unlocked : 0,
      campaign?.mode === 'classic' && validLevel(campaign.level) ? campaign.level + (campaign.status === 'won' ? 1 : 0) : 0),
  };
}

export function recordWin(progress, game) {
  if (game.status !== 'won' || game.celebrated) return false;
  progress.wins++;
  if (game.mode === 'classic') {
    progress.highestCleared = Math.max(progress.highestCleared, game.level);
    progress.unlocked = Math.max(progress.unlocked, game.level + 1);
  }
  game.celebrated = true;
  return true;
}

export function levelWindow(anchor) {
  const start = Math.max(0, anchor - 1);
  return [start, start + 1, start + 2];
}

export function resumeLevel(progress, campaign) {
  return campaign?.mode === 'classic' && campaign.status !== 'won' && campaign.level === progress.unlocked
    ? campaign.level : progress.unlocked;
}
