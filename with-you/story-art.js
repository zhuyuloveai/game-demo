export const storyArt={
 'lin-market':{name:'知夏 · 市集的半张桌子',place:'街区 · 创意市集',image:'assets/lin-market.png',ambience:'午后的市集，风翻过桌上的城市卡片'},
 'shen-riverside':{name:'以宁 · 河边的速写本',place:'南岸 · 滨河步道',image:'assets/shen-riverside.png',ambience:'河面泛着光，铅笔轻轻划过纸面'}
};
export function storyArtKey(s){const p=s?.pending;if(!p)return null;if(s.campaignDays===30&&!s.career&&!p.weekend&&p.episode===8)return p.who==='lin'?'lin-market':'shen-riverside';return p.who;}
