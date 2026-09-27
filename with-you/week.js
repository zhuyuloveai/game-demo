import {isMonth,monthToday} from './month.js?v=month08';
// Seven-day atmosphere and personal milestones. Pure data; no network or account state.
export const week = [
 {title:'新的门牌',note:'纸箱还没拆完，先给今天留一个出门的理由。',city:'楼下便利店的店员记住了你的新门牌。'},
 {title:'熟悉的街角',note:'慢慢找到自己的节奏，也听听新朋友的近况。',city:'街角的新路牌指向河边，你又认识了一个城市的方向。'},
 {title:'没说完的话',note:'每个人都有卡住的时候。今天试着多听一句。',city:'咖啡馆换上了手写的秋日菜单。'},
 {title:'各自的生活',note:'把手里的事情做好，再带一点自己的故事去见她。',city:'夜市的小摊陆续摆开，回家的路多了几种熟悉的味道。'},
 {title:'往前一步',note:'一件小事快有结果了。支持她，也尊重她的决定。',city:'周末小展的海报贴到了公寓门口。'},
 {title:'留给明天',note:'看看消息，想一想周日愿意把时间留给谁。',city:'天气预报说，明天傍晚会放晴。'},
 {title:'与你的约定',note:'这一周的选择，会在今天留下回声。',city:'雨停了。临川的晚霞值得慢慢看。'},
];
export const today = s => s&&isMonth(s)?monthToday(s):week[Math.min(6,Math.max(0,(s?.day||1)-1))];
