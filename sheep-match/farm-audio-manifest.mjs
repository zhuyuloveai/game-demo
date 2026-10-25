// Original, reproducible farm themes. Metadata only: no Audio instance, fetch,
// context, or autoplay. The app owns its single background music player.
export const FARM_TRACKS = Object.freeze({
  farm: Object.freeze({
    key: 'farm-life', title: '牧场慢慢长', description: '暖木琴 · 拨弦 · 轻笛的田园散步',
    src: new URL('./media/farm-life.m4a', import.meta.url).href,
    loopStart: 0, loopEnd: 80, recommendedVolume: .35,
  }),
  match: Object.freeze({
    key: 'farm-match', title: '菜篮蹦蹦舞', description: '跳跃木琴 · 轻手鼓 · 菜篮小舞曲',
    src: new URL('./media/farm-match.m4a', import.meta.url).href,
    loopStart: 0, loopEnd: 80, recommendedVolume: .32,
  }),
});
export const FARM_SFX = Object.freeze(Object.fromEntries([
  'plant', 'harvest', 'feed', 'product-ready', 'coin', 'button', 'soft-error',
  'upgrade', 'first-clear', 'water', 'animal', 'tile-pick', 'tile-match', 'combo',
].map(key => [key, new URL(`./media/farm-sfx/${key}.wav`, import.meta.url).href])));
export const FARM_SFX_GAINS = Object.freeze(Object.fromEntries(
  Object.keys(FARM_SFX).map(key => [key, .65]),
));
