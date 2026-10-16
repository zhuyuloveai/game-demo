const makeChain = (family, rows, color) => Object.freeze(rows.map(([name, icon, emoji, value], index) => Object.freeze({
  id: `${family}:${index + 1}`, family, level: index + 1, name, icon, emoji, color,
  ...(value === undefined ? {} : { value }),
})));

export const CHAINS = Object.freeze({
  food: makeChain('food', [['小麦','wheat','🌾'],['面粉','flour','🥡'],['面团','dough','🍞'],['吐司','toast','🍞'],['可颂','croissant','🥐'],['庆祝蛋糕','cake','🎂']], '#dc9d72'),
  tools: makeChain('tools', [['木勺','spoon','🥄'],['打蛋器','whisk','🥢'],['平底锅','pan','🍳'],['炖锅','pot','🍲'],['厨师机','mixer','🧁'],['梦幻烤箱','oven','♨️']], '#b894c5'),
  vegetable: makeChain('vegetable', [['小萝卜','carrot','🥕'],['番茄','tomato','🍅'],['西兰花','broccoli','🥦'],['蔬菜沙拉','salad','🥗'],['烤蔬菜','roastveg','🍠'],['田园拼盘','veggieplatter','🥗']], '#dd968c'),
  fruit: makeChain('fruit', [['苹果','apple','🍎'],['香橙','orange','🍊'],['草莓','strawberry','🍓'],['水果碗','fruitbowl','🍒'],['手作果酱','jam','🫙'],['水果挞','fruittart','🥧']], '#e58eaa'),
  drink: makeChain('drink', [['咖啡豆','beans','🫘'],['浓缩咖啡','coffee','☕'],['牛奶咖啡','milkcoffee','🥛'],['拉花拿铁','latte','☕'],['冰咖啡','icedcoffee','🧋'],['咖啡分享塔','coffeetower','🍹']], '#c1968c'),
  tableware: makeChain('tableware', [['小碟子','saucer','🍽️'],['陶瓷碗','bowl','🥣'],['花边餐盘','plate','🍽️'],['下午茶壶','teapot','🫖'],['精致茶具','teaSet','🍵'],['宴会餐具','banquet','🥂']], '#b5a0cf'),
  herb: makeChain('herb', [['香草种子','seed','🫘'],['香草嫩芽','sprout','🌱'],['罗勒叶','basil','🌿'],['香草盆栽','herbpot','🪴'],['香草篮','herbbasket','🌿'],['秘制调味料','seasoning','🧂']], '#c2aabb'),
  chinese: makeChain('chinese', [['香米','rice','🍚'],['水饺','dumpling','🥟'],['小笼包','bun','🥟'],['汤面','noodles','🍜'],['暖心火锅','hotpot','🍲'],['中式点心宴','dimSum','🥢']], '#df9a91'),
  japanese: makeChain('japanese', [['海苔','nori','🌿'],['饭团','onigiri','🍙'],['寿司','sushi','🍣'],['手卷','maki','🍣'],['豚骨拉面','ramen','🍜'],['和风便当','bento','🍱']], '#d69daf'),
  italian: makeChain('italian', [['意面原料','pasta','🍝'],['番茄意面','spaghetti','🍝'],['芝士披萨','pizza','🍕'],['奶油烩饭','risotto','🍚'],['千层面','lasagna','🍝'],['意式盛宴','italianfeast','🍕']], '#cba3c3'),
  mexican: makeChain('mexican', [['甜玉米','corn','🌽'],['塔可','taco','🌮'],['芝士夹饼','quesadilla','🫓'],['墨西哥卷饼','burrito','🌯'],['玉米片拼盘','nachos','🌽'],['墨西哥派对餐','fiestaplate','🌮']], '#dcab79'),
  energy: makeChain('energy', [['小份电量补给','energy','⚡',5],['电量补给','energy','⚡',12],['大份电量补给','energy','⚡',30],['满满电量','energy','⚡',80]], '#e9b05e'),
  coins: makeChain('coins', [['零用金币','coin','🪙',5],['一叠金币','coin','🪙',12],['一袋金币','coin','🪙',30],['金币宝箱','coin','🪙',80]], '#e7b45d'),
  chest: makeChain('chest', [['厨房礼盒','gift','🎁'],['精致礼盒','gift','🎁'],['豪华礼盒','gift','🎁']], '#e293b6'),
});

export const FAMILY_META = Object.freeze({
  food: {name:'甜蜜烘焙',source:'烘焙食材篮',description:'从小麦到庆祝蛋糕，烤出厨房里的小幸福。'},
  tools: {name:'料理厨具',source:'厨具收纳箱',description:'木勺、锅具与电器，让每一餐都更拿手。'},
  vegetable: {name:'田园蔬菜',source:'生鲜采购篮',description:'新鲜蔬菜一路合成为丰盛的田园拼盘。'},
  fruit: {name:'缤纷水果',source:'生鲜采购篮 · 伴生产物',description:'苹果、果酱和水果挞，收藏四季的甜。'},
  drink: {name:'咖啡饮品',source:'咖啡工作台 · 完成第 1 章',description:'从咖啡豆开始，经营属于你的咖啡角。'},
  tableware: {name:'精致餐具',source:'厨具收纳箱 · 伴生产物',description:'从小碟子到宴会餐具，布置温柔的餐桌。'},
  herb: {name:'香草花园',source:'香草花盆 · 完成第 2 章',description:'可手动采集，也会每分钟在相邻空位自然生长。'},
  chinese: {name:'中式料理',source:'亚洲料理台 · 完成第 3 章',description:'从香米、小笼包到暖心火锅，发现中式好滋味。'},
  japanese: {name:'日式料理',source:'亚洲料理台 · 伴生产物',description:'饭团、寿司与便当，让一餐也充满仪式感。'},
  italian: {name:'意式料理',source:'环球料理台 · 完成第 4 章',description:'面食、披萨与千层面，烹调意式阳光。'},
  mexican: {name:'墨西哥料理',source:'环球料理台 · 伴生产物',description:'从甜玉米到缤纷塔可，开启热闹的餐桌派对。'},
  energy: {name:'电量补给',source:'礼盒与商店',description:'合成电量补给再领取，为厨房补充更多电量。'},
  coins: {name:'金币收藏',source:'礼盒与泡泡',description:'合并金币会更划算，点击领取加入钱包。'},
  chest: {name:'厨房礼盒',source:'每 3 单奖励 · 每日补给',description:'可以直接打开，也可以合成高级礼盒收获更多。'},
});

export const PRODUCER_DEFS = Object.freeze({
  food: {name:'烘焙食材篮',icon:'basket',families:['food'],unlockStage:0,maxLevel:4,baseCharges:10,chargeStep:4,cooldownMs:60000,description:'消耗 1 电量，产出小麦或面粉。'},
  produce: {name:'生鲜采购篮',icon:'producecrate',families:['vegetable','fruit'],unlockStage:0,maxLevel:4,baseCharges:10,chargeStep:4,cooldownMs:60000,description:'产出新鲜蔬菜，偶尔带回水果。'},
  tools: {name:'厨具收纳箱',icon:'utensils',families:['tools','tableware'],unlockStage:0,maxLevel:4,baseCharges:10,chargeStep:4,cooldownMs:60000,description:'产出料理厨具，偶尔发现精致餐具。'},
  drink: {name:'咖啡工作台',icon:'coffeemachine',families:['drink'],unlockStage:1,maxLevel:4,baseCharges:10,chargeStep:4,cooldownMs:60000,description:'完成第 1 章后解锁，产出咖啡豆与浓缩咖啡。'},
  herb: {name:'香草花盆',icon:'herbgarden',families:['herb'],unlockStage:2,maxLevel:4,baseCharges:10,chargeStep:4,cooldownMs:60000,autoIntervalMs:60000,description:'产出香草种子；每分钟还会在相邻空位自然生长。'},
  asian: {name:'亚洲料理台',icon:'asianstall',families:['chinese','japanese'],unlockStage:3,maxLevel:4,baseCharges:10,chargeStep:4,cooldownMs:60000,description:'准备中式香米与日式海苔，搭配厨具烹调佳肴。'},
  mediterranean: {name:'环球料理台',icon:'worldkitchen',families:['italian','mexican'],unlockStage:4,maxLevel:4,baseCharges:10,chargeStep:4,cooldownMs:60000,description:'供应意面原料和甜玉米，探索意式与墨西哥料理。'},

});

// Legacy star-spending API data. Chapter rewards retain these unlock stages so old saves stay compatible.
export const RENOVATIONS = Object.freeze([
  {id:'coffee-corner',name:'布置咖啡角',description:'添一张奶油色吧台，解锁咖啡工作台和饮品食谱。',stars:3,icon:'coffee',unlockKind:'drink'},
  {id:'herb-window',name:'种下窗边香草',description:'邀请阳光进厨房，解锁会自然生长的香草花盆。',stars:5,icon:'herbpot',unlockKind:'herb'},
  {id:'asian-kitchen',name:'开设亚洲料理台',description:'准备蒸锅与餐盘，解锁中式和日式料理。',stars:7,icon:'bento',unlockKind:'asian'},
  {id:'world-kitchen',name:'迎接环球美味',description:'为面食与玉米留个位置，解锁意式和墨西哥料理。',stars:9,icon:'pizza',unlockKind:'mediterranean'},
  {id:'pink-pantry',name:'扩建陶瓷储藏间',description:'餐具食材都有自己的家，仓库永久增加 2 格。',stars:11,icon:'cupboard',storageReward:2,chestReward:2},
  {id:'dining-room',name:'布置花园餐桌',description:'为朋友准备下午茶，仓库永久增加 2 格。',stars:13,icon:'teapot',storageReward:2,coinReward:50},
  {id:'chef-studio',name:'升级主厨工作室',description:'给你的料理梦想更大空间，获得豪华厨房礼盒。',stars:15,icon:'oven',chestReward:3},
  {id:'dream-kitchen',name:'开业！梦幻小厨房',description:'点亮门口的灯箱招牌，仓库再增加 4 格，获得豪华礼盒。',stars:18,icon:'gift',storageReward:4,chestReward:3},
]);

const chapterTasks = (items, orders, cooked) => Object.freeze([
  Object.freeze({id:'discover',kind:'discover',items:Object.freeze(items),target:items.length,label:`发现${items.map(key=>{const [family,level]=key.split(':');return CHAINS[family][Number(level)-1].name;}).join('、')}`}),
  Object.freeze({id:'orders',kind:'orders',target:orders,label:`累计交付 ${orders} 份订单`}),
  Object.freeze({id:'cook',kind:'cook',target:cooked,label:`累计烹饪 ${cooked} 次`}),
]);

export const CHAPTERS = Object.freeze([
  ['第一份暖心早餐','和糯米一起做出吐司，送出第一份订单。',['food:4'],1,1],
  ['飘香的咖啡角','试着调一杯拿铁，让来访的朋友歇歇脚。',['drink:4'],4,2],
  ['窗边的小花园','收获罗勒，给清爽沙拉添一点香气。',['herb:3','vegetable:4'],8,3],
  ['街坊的拿手菜','尝试小笼包与寿司，让邻居尝尝你的手艺。',['chinese:3','japanese:3'],12,5],
  ['环球午餐时间','把披萨和芝士夹饼端上餐桌。',['italian:3','mexican:3'],18,8],
  ['甜蜜的下午茶','准备果酱与茶壶，招待更多新朋友。',['fruit:5','tableware:4'],25,12],
  ['主厨的庆祝蛋糕','用梦幻烤箱和庆祝蛋糕记录你的成长。',['tools:6','food:6'],35,18],
  ['热闹的开店日','用暖心火锅与千层面，办一场大家的聚餐。',['chinese:5','italian:5'],45,24],
].map(([name,description,items,orders,cooked],stage)=>{
  const legacy=RENOVATIONS[stage];
  const reward=Object.fromEntries(['unlockKind','storageReward','chestReward','coinReward'].filter(key=>legacy[key]!==undefined).map(key=>[key,legacy[key]]));
  if(stage===0) reward.coinReward=80;
  return Object.freeze({id:`chapter-${stage+1}`,stage,number:stage+1,name,description,icon:legacy.icon,tasks:chapterTasks(items,orders,cooked),reward:Object.freeze(reward)});
}));

export const RECIPES = Object.freeze([
  {id:'fruit-salad',name:'缤纷果蔬沙拉',description:'木勺轻拌水果与蔬菜，变成清爽水果碗。',needs:[{family:'fruit',level:1,count:2},{family:'vegetable',level:1,count:1}],toolLevel:1,output:{family:'fruit',level:4},unlockStage:0,xp:8},
  {id:'golden-toast',name:'金黄煎吐司',description:'平底锅烘烤面团，撒上面粉，做一份早餐。',needs:[{family:'food',level:3,count:1},{family:'food',level:2,count:1}],toolLevel:3,output:{family:'food',level:4},unlockStage:0,xp:8},
  {id:'garden-salad',name:'田园沙拉',description:'用木勺拌匀番茄、萝卜与罗勒叶。',needs:[{family:'vegetable',level:2,count:1},{family:'vegetable',level:1,count:1},{family:'herb',level:3,count:1}],toolLevel:1,output:{family:'vegetable',level:4},unlockStage:2,xp:10},
  {id:'silky-latte',name:'绵密拿铁',description:'打蛋器打出细腻泡沫，调制一杯暖心拿铁。',needs:[{family:'drink',level:2,count:1},{family:'drink',level:1,count:1}],toolLevel:2,output:{family:'drink',level:4},unlockStage:1,xp:8},
  {id:'steamed-buns',name:'手作小笼包',description:'面团包入蔬菜，使用炖锅蒸出小笼包。',needs:[{family:'food',level:3,count:1},{family:'vegetable',level:2,count:1}],toolLevel:4,output:{family:'chinese',level:3},unlockStage:3,xp:12},
  {id:'fresh-sushi',name:'蔬菜寿司',description:'木勺拌好米饭，海苔裹住爽脆小萝卜。',needs:[{family:'japanese',level:1,count:2},{family:'vegetable',level:1,count:1}],toolLevel:1,output:{family:'japanese',level:3},unlockStage:3,xp:10},
  {id:'homemade-pizza',name:'手作番茄披萨',description:'平底锅煎烤面饼，加入番茄，化身意式经典。',needs:[{family:'italian',level:1,count:2},{family:'vegetable',level:2,count:1}],toolLevel:3,output:{family:'italian',level:3},unlockStage:4,xp:12},
  {id:'crisp-tacos',name:'香脆芝士夹饼',description:'用平底锅烙出玉米饼，包入鲜甜番茄。',needs:[{family:'mexican',level:1,count:2},{family:'vegetable',level:2,count:1}],toolLevel:3,output:{family:'mexican',level:3},unlockStage:4,xp:12},
  {id:'family-hotpot',name:'围炉暖心锅',description:'炖锅慢煮汤面与西兰花，再添一把香草。',needs:[{family:'chinese',level:4,count:1},{family:'vegetable',level:3,count:1},{family:'herb',level:2,count:1}],toolLevel:4,output:{family:'chinese',level:5},unlockStage:3,xp:20},
  {id:'baked-lasagna',name:'香草千层面',description:'梦幻烤箱层层烘烤意面、番茄与罗勒。',needs:[{family:'italian',level:2,count:2},{family:'vegetable',level:2,count:1},{family:'herb',level:3,count:1}],toolLevel:6,output:{family:'italian',level:5},unlockStage:4,xp:20},
]);

export const SHOP_ITEMS = Object.freeze([
  {id:'energy',name:'30 点电量',description:'立即补充电量，可超过自然恢复上限。',cost:30,icon:'energy',type:'energy',amount:30,unlockStage:0},
  {id:'chest',name:'厨房礼盒',description:'送到待领取区，可合并成更高级礼盒。',cost:65,icon:'gift',type:'chest',level:1,unlockStage:0},
  {id:'scissors',name:'合成剪刀',description:'把普通物品拆成两个低一级物品。',cost:45,icon:'scissors',type:'booster',booster:'scissors',unlockStage:0},
  {id:'hourglass',name:'加速沙漏',description:'立即补满选中生产器的库存。',cost:40,icon:'hourglass',type:'booster',booster:'hourglass',unlockStage:0},
  ...Object.entries(PRODUCER_DEFS).map(([kind,def]) => ({id:`producer-${kind}`,name:def.name,description:'一级生产器，可与同类同级生产器合并升级。',cost:kind==='food'||kind==='tools'||kind==='produce'?90:110,icon:def.icon,type:'producer',kind,level:1,unlockStage:def.unlockStage})),
]);
