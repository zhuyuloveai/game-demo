// Game levels are zero-based. Replays and restored saves keep the same season.
const SEASONS = [
  { key: 'spring', name: '春日牧场', color: '#e7edce' },
  { key: 'summer', name: '夏日牧场', color: '#dfebc6' },
  { key: 'autumn', name: '秋日牧场', color: '#eee0bd' },
  { key: 'winter', name: '冬日牧场', color: '#e5e9e0' },
];
export function seasonForLevel(level) {
  return SEASONS[level % SEASONS.length];
}
