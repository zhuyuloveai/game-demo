export const endingArt={
'ending-lin':{name:'知夏 · 留给你的时光',image:'assets/ending-lin.png',ambience:'雨停之后，故事还会继续'},
'ending-shen':{name:'你在我的画面里',image:'assets/ending-shen.png',ambience:'落日和你，一起留在画里'},
'ending-growth':{name:'慢慢成为喜欢的自己',image:'assets/ending-growth.png',ambience:'城市的灯光，也有属于你的一盏'},
'ending-life':{name:'这座城，开始有了温度',image:'assets/ending-life.png',ambience:'灯亮着，晚饭还热，明天值得期待'}
};
export function endingKey(s){if(!s?.ended||!s.ending)return null;return s.ending.who==='lin'?'ending-lin':s.ending.who==='shen'?'ending-shen':(s.ending.kind?s.ending.kind==='growth':s.skill>=4)?'ending-growth':'ending-life';}
