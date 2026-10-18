#!/usr/bin/env python3
"""Build the reviewable balance data and item appendices; never edits runtime files."""
import json
import math
import sys
from pathlib import Path
from align_feige import apply as align_feige, write_mapping

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / 'scripts'))
from item_identities import apply_item_identities
DATE = '2026-10-16'
BASE = json.loads((ROOT / 'current-baseline.json').read_text())

SOURCES = [
 ('S01','官方 2023-06-30 更新公告','https://www.taptap.cn/moment/423905649257087137?group_id=322770','2023-06-30','官方公告图片已核读；饮品增加11级，体能测试增加5、6级；未公开完整掉率。'),
 ('S02','游戏狗：初始物品来源','https://www.gamedog.cn/games/a/3257892.html','2023-02-07','早期来源关系；包含已被替换的装修工具箱，不能视作现版全量。'),
 ('S03','维修工具箱、工具图鉴','https://www.sohu.com/a/626888163_121631443','2023-01-08','逐级物品名称；部分高等级缺失。'),
 ('S04','冰箱、食品、药品、器材图鉴','https://www.sohu.com/a/627837767_121631443','2023-01-10','饮品上限早于官方扩级；药品末级文字存在冲突。'),
 ('S05','购物车、储物柜图鉴','https://www.taptap.cn/moment/431479647348196040','2023-07-21','个别错字及重复名称；只采用能核对的连续等级。'),
 ('S06','钥匙、遗失物、娱乐设施图鉴','https://www.taptap.cn/moment/431855084888916076','2023-07-22','遗失物1—6级及5/6级产U型枕；娱乐设施仅前段名称完整。'),
 ('S07','植物、蜗牛与手办支线','https://www.sohu.com/a/638585093_121631443','2023-02-08','蜗牛编号冲突；NS后墙壁路径为历史记录。'),
 ('S08','拼图13级图鉴','https://www.9game.cn/news/9982361.html','2024-04-01','图鉴截图已核读；正文首级及掉落描述有错误，仅采用对应名称和顺序。'),
 ('S09','大白猫来源','https://www.9game.cn/news/9650029.html','2024-01-05','确认垃圾袋—老鼠—猫窝—猫关系；非全等级表。'),
 ('S10','青春之舞订单物品','https://www.9game.cn/news/9987817.html','2024-04-02','用于确认名称存在，不能据订单排列推断等级。'),
 ('S11','大扫除订单记录','https://www.taptap.cn/moment/424948477592603287','2023-07-03','确认高阶饮品及花卉名称；个别错字。'),
 ('S12','原始玩家新手攻略','https://www.taptap.cn/moment/260763709427681258?group_id=322770','2022-04-06','早期主链、特殊发射器关系；旧刷新时间后来变更。'),
 ('S13','台服游戏机与手办路径','https://forum.gamer.com.tw/C.php?bsn=77871&snA=67','2023','NS后野餐篮，与大陆旧墙壁路径单独保存。'),
 ('S14','台服资源合成数值记录','https://forum.gamer.com.tw/C.php?bsn=77871&snA=66','2023-07-02','金币1/3/8/20/50/120，钻石1/3/8/20，能量1/6/15/40/100；台服玩家记录。'),
 ('S15','体力自然恢复记录','https://shouyou.3dmgame.com/gl/522320.html','2024-09-02','每2分钟1体力；钻石购买仅确认首档5，完整购买表未核实。'),
 ('S16','手提包、存钱罐和活动生产记录','https://www.sohu.com/a/635390261_121631443','2023-01-29','黑包10/22、粉包12/28、存钱罐15/18/53为历史次数；主表可辨库存另列S32—35；批次和模糊表头不推定。'),
 ('S17','日常辅助道具合集','https://www.yeyulingfeng.com/214916.html','2025-07-25','转载玩家资料；无限能量、加速器、充能器等档位。'),
 ('S18','玩家版本变化记录','https://www.taptap.cn/app/232158/review?os=android&page=2','2022起','装修工具箱变冰箱、花篮产物变化；评论不等于官方配置。'),
 ('S19','Kinfone生产器扩级记录','https://www.douyin.com/user/MS4wLjABAAAAY6JWg7d_GHyFPSfRS3776OAg0FYcwHkoG12mn8Yv0vU','2024—2025','购物车扩级、2025生产器调整；未读取到可确认现版全部参数的表。'),
 ('S20','新春贺岁物品图鉴','https://www.sohu.com/a/631887650_121631443','2023-01','活动限定；荤菜链中有错字，不补猜。'),
 ('S21','露营吧肥鹅活动','https://forum.gamer.com.tw/C.php?bsn=77871&snA=191','2023-08','投入材料、生产后降级的活动关系。'),
 ('S22','健康餐大作战活动','https://forum.gamer.com.tw/C.php?bsn=77871&snA=217','2023','料理配方与主棋盘同物二合一分开。'),
 ('S23','布袋玩偶来源','https://www.youxi369.com/gonglue/126585.html','2022-05-20','使用完的4级空袋二合一进入布袋玩偶系列。'),
 ('S24','官方入驻游戏页','https://www.taptap.cn/app/232158','检索2026-10-16','页面展示5.9.1、2026-06-03；无法据此推断所有渠道/热更新内容。'),
 ('S25','宣传与体能测试演示索引','https://www.douyin.com/shipin/7304898466717878310','历史视频索引','电视/电脑、4级热情的推荐与课程关系；索引转写有同音错误。'),
 ('S26','早期装修工具记录','https://www.taptap.cn/moment/285039542078017352','2022-06','装修工具、砖头、油漆属于历史版本。'),
]

def reference_chain(cid, name, kind, known, source, max_reported=None, unknown_names=(), note='', scope='主棋盘历史记录'):
    levels = known if isinstance(known, dict) else {i+1:n for i,n in enumerate(known.split('|'))}
    last=max(max_reported or 0, max(levels, default=0))
    return dict(id=cid,name=name,kind=kind,scope=scope,evidence='P',sources=source.split(','),reportedMax=max_reported,
                levels=[dict(level=i,name=levels.get(i),status='recorded' if i in levels else 'unknown') for i in range(1,last+1)],
                unranked=list(unknown_names),note=note,currentMax=None)

FE_CHAINS=[
 reference_chain('toolbox','维修工具箱','generator','工具箱把手|箱盖|空箱子|简单五金盒|实用工具箱|家用工具箱|专业工具箱|双层工具箱|综合维修套组','S03',note='4级开始生产的历史记录；后续扩级见S19。'),
 reference_chain('tools','维修工具','product','起钉器|扁口螺丝刀|外六角扳手|钳子|扳手|钢剪|管钳|钢锯|电锯|电钻|打磨器|电砂轮|抛光机','S03',14,note='14级名称未核实；14是旧攻略报告上限。'),
 reference_chain('gloves','手套','product','单只手套|一双手套|装修手套','S03',3),
 reference_chain('fridge','冰箱','generator','包装纸箱|拆开包装|崭新冰箱|普通冰箱|保鲜冰箱|双层冰箱','S04',note='更高等级未知；生产解锁等级的文字记录不完全一致。'),
 reference_chain('drinks','饮品','product','矿泉水|一盒牛奶|浓缩咖啡|可乐|茶饮料|冰块桶','S04,S01,S11',11,['红鹅饮料','电解质饮料','蛋白粉','大水壶'],'11级存在由官方确认；7—11级名称对应关系未知；11不宣称为现版上限。'),
 reference_chain('healthy_food','健康食品','product','吐司|贝果|可颂|三明治','S04,S10',5,['能量碗'],'能量碗存在，缺独立等级证据。'),
 reference_chain('medicine','常备药品','product','创可贴|酒精喷雾|跌打药|小药箱','S04',4,note='条目写4级已最高，文章尾部又写5；采用已见1—4级，拒绝补5。'),
 reference_chain('equipment_cart','器材采购车','generator','塑料板|一对塑料板|塑料篮|采购盒|采购篮|购物车','S04',11,note='5级开始生产为旧记录；后续扩级未核齐。'),
 reference_chain('aerobic','有氧器材','product','阻力带|橡胶短绳|钢丝短绳|呼啦圈|俯卧撑支架|健身轮|拉力带','S04,S10,S11',11,['踏步机','动感单车','椭圆机','跑步机']),
 reference_chain('strength','力量器械','product',{},'S10',unknown_names=['哑铃','杠铃','卧推架','飞鸟椅','腿举机'],note='仅名称确认，无逐级表。'),
 reference_chain('shopping_cart','购物车','generator','一个车轮|一对车轮|空车架|空购物车|超市购物车|大型购物车','S05,S19',12,note='12来自2024社区扩级记录；第7级以后名称未核实。'),
 reference_chain('locker','储物柜','generator','储物篮|抽屉零件|抽屉雏形|破碎抽屉|储物抽屉|双层储物柜','S05,S02',11,note='7级以后重复名称/缺图；6级起有遗失物产出。'),
 reference_chain('lost','遗失物','hybrid','遗失的眼镜|遗失的日记本|遗失的拳套|失物篮|大型失物篮|失物招领处','S06',6,note='5/6级产U型枕。'),
 reference_chain('comfort','娱乐设施','hybrid',{1:'U型枕',2:'枕头',3:'按摩器',4:'筋膜枪',5:'随身听',8:'游戏机盒子'},'S06,S07',8,['VR眼镜']),
 reference_chain('console','游戏机','hybrid',{1:'小掌机',4:'NS'},'S07,S13',4),
 reference_chain('game_stage','墙壁／野餐篮阶段','stateful',{},'S07,S13',5,note='大陆旧路径为墙壁；台服记录为野餐篮；点击后的阶段变化不能当同物合成。'),
 reference_chain('game_card','肥鹅斗恶龙相关材料','hybrid',{5:'尼德霍格'},'S07,S13',5),
 reference_chain('figurine','肥鹅手办','product',{},'S07',unknown_names=['肥鹅精灵'],note='尼德霍格产出精灵后进入手办链；完整等级未知。'),
 reference_chain('puzzle','拼图','product','纸屑堆|纸片|一块拼图|拼图拼接|拼图板|大块拼图|拼图一角|拼图图案|进阶拼图|照片轮廓|肥鹅相框|秘密信封|珍藏照片','S08',13),
 reference_chain('keys','钥匙','hybrid','钥匙|钥匙串|感应钥匙|自动感应钥匙','S06,S12',5,['感应手环']),
 reference_chain('gate','神秘的光门','product',{},'S12,S08',note='旧攻略称时光门/时空之门；完整等级未核实。'),
 reference_chain('publicity','宣传方式','generator',{},'S02,S25',unknown_names=['宣传单','宣传手册','电视','电脑'],note='4级自生产，5级产测试材料为旧记录。'),
 reference_chain('test','体能测试','hybrid',{4:'热情的推荐'},'S01,S25',6,['体能分析仪'],'5、6级存在由官方确认，逐级名称未核齐。'),
 reference_chain('course','健身课程','product',{},'S02,S10',unknown_names=['进阶课程','力量课程','瑜伽课程']),
 reference_chain('pot','花盆','generator',{},'S02',note='购物车提供花盆材料，花盆产种子袋；完整等级未知。'),
 reference_chain('seedbag','种子袋','finite','小种子包|加量种子包|大种子包|种子堆','S07',4),
 reference_chain('plant','盆栽','hybrid','种子|温室花苗|花苗|绿植|发财树|花树','S07',6,note='花树自动产蜗牛起始物。'),
 reference_chain('snail','蜗牛','product',{},'S07',6,['蜗牛壳','幼年蜗牛','小蜗牛','大蜗牛','变色蜗牛','赛博蜗牛'],'原文等级编号重复，不据此强制排位。'),
 reference_chain('emptybag','空种子袋','conversion',{},'S23',4,note='两个4级已用空袋进入布袋玩偶系列。'),
 reference_chain('doll','布袋玩偶','product',{},'S23',unknown_names=['麻袋布'],note='起始物与系列名需区分；后续全名未知。'),
 reference_chain('flowerbasket','花篮','generator',{},'S02,S18',note='旧产冠军之路，后改花卉；不能合并为同一版本掉落表。'),
 reference_chain('flowers','花卉','product',{},'S11',unknown_names=['散装郁金香','郁金香捧花','盛宴插花']),
 reference_chain('sweeper','扫地机器人','generator',{},'S02,S09',unknown_names=['电池','陈旧扫地机'],note='旧记录5级开始生产。'),
 reference_chain('trash','垃圾','hybrid',{},'S09',unknown_names=['破袜子','香蕉皮','苹果核','易拉罐','大垃圾袋']),
 reference_chain('mouse','老鼠／猫窝','hybrid',{},'S09',unknown_names=['小老鼠','猫窝','老鼠合家欢']),
 reference_chain('cat','猫','product',{},'S09,S10',unknown_names=['田园猫','小黑猫','棕色小猫','大灰猫','大白猫','布偶猫']),
 reference_chain('champion','冠军之路','product',{},'S02,S18',unknown_names=['终极金奖杯'],note='与创始鹅之谜奖励雕塑有关；来源存在版本变化。'),
 reference_chain('renovation','装修工具','product','勾线笔|钢卷尺|滚筒刷|羊角锤|十字镐','S26',note='红车主题已替换，仅历史档案。',scope='旧版替换'),
 reference_chain('brick','砖头','product',{},'S26',5,['砖车'],scope='旧版替换'),
 reference_chain('paint','油漆','product','自喷漆|油漆桶','S26',scope='旧版替换'),
]

FE_NUMBERS = [
 ('merge','同类同级合并数量',2,'件','P',['S12'],'普通链；活动投料另外定义'),
 ('tap_energy','普通点击生产耗能',1,'体力/次','P',['S12'],'不外推所有特殊/活动发射器'),
 ('energy_regen','自然体力恢复间隔',120,'秒/点','P',['S15'],'2024攻略记录'),
 ('energy_cap','自然体力上限',None,'点','U',[],'未取得现版原始数值证据'),
 ('energy_values','能量道具1—5级',[1,6,15,40,100],'点','P',['S14'],'2023台服记录；其他文章存在低级值冲突'),
 ('coin_values','金币道具1—6级',[1,3,8,20,50,120],'金币','P',['S14'],'2023台服记录'),
 ('gem_values','钻石道具1—4级',[1,3,8,20],'钻石','P',['S14'],'2023台服记录'),
 ('black_bag','未用黑色手提包1/2级次数',[10,22],'次','P',['S16'],'2023历史记录；部分使用后的继承公式未知'),
 ('pink_bag','未用粉色手提包1/2级次数',[12,28],'次','P',['S16'],'2023历史记录'),
 ('pig','未用存钱罐1/2/3级次数',[15,18,53],'次','P',['S16'],'2023历史记录；旧攻略的先点后合建议互相矛盾'),
 ('energy_box','早期能量箱次数',5,'次','P',['S12'],'2022历史记录，非现版保证'),
 ('ad_energy','广告补能单次',25,'点','P',['S16'],'次数限制随版本/平台变化'),
 ('first_energy_buy','钻石买体力首档',5,'钻石','P',['S15'],'完整价格阶梯/购买量/日限未知'),
 ('infinite_energy','无限能量档位',[30,60,120,300],'秒','P',['S17'],'2025转载玩家记录'),
 ('global_time','棋盘加速器档位',[1,2,4,8,16],'小时','P',['S17'],'效果边界需现版实测'),
 ('recharge','充能器档位',[5,10,20],'库存','P',['S17'],'是否可超过容量需实测'),
 ('scissors','剪刀适用最高等级',[4,8,None],'物品等级','P',['S17'],'末档不限等级；含不含边界等级需界面核对'),
 ('scissors_stack','紫剪刀叠加上限',20,'把','P',['S17'],'2025转载记录'),
 ('stopwatch_stack','秒表叠加上限',5,'天','P',['S17'],'单发射器加速'),
 ('backpack','扩容背包增格',1,'格','P',['S17'],'道具增格，与金币扩容价表不同'),
 ('drink_11','新增饮品等级',11,'级','O',['S01'],'2023-06-30新增，不能推断今天最高仍为11'),
 ('test_56','新增体能测试等级',[5,6],'级','O',['S01'],'2023-06-30'),
 ('reset','能量相关每日次数刷新','00:00','时间','O',['S01'],'公告表述；不推断所有商城共用此规则'),
 ('cactus_cd','创始鹅活动仙人掌冷却',900,'秒','P',['S16'],'历史活动，8次且不堆两轮'),
 ('cactus_batch','创始鹅活动仙人掌产量',8,'次/轮','P',['S16'],'历史活动'),
 ('lighter_cd','创始鹅活动打火机冷却',1800,'秒','P',['S16'],'历史活动'),
 ('lighter_batch','创始鹅活动打火机产量',[16,32],'每轮/两轮库存','P',['S16'],'历史活动'),
 ('digit9_sell','创始鹅活动数字9售价',410,'金币','P',['S16'],'历史活动，不外推普通物品售价'),
 ('producer_params','现版各等级生产器库存/冷却/概率',None,'表','U',[],'历史库存部分可辨且逐字段采用；现版完整CD/概率仍未知，2023/2025有改版'),
 ('order_formula','现版订单奖励生成公式',None,'公式','U',[],'订单截图只证明具体实例'),
 ('storage_prices','现版完整仓库价格表',None,'表','U',[],'零散价格不能拼为完整曲线'),
 ('level_xp','现版玩家升级经验表',None,'表','U',[],'未获得原始完整表'),
]

CHAINS=[]
def chain(cid,name,names,kind='commodity',chapter=1,reference=None,sources=None,**extra):
    names=names.split('|') if isinstance(names,str) else names
    c=dict(id=cid,name=name,kind=kind,unlockChapter=chapter,reference=reference or '项目保留/扩展',evidence='D',sources=sources or [],**extra)
    c['items']=[dict(id=f'{cid}:{i+1}',level=i+1,name=n,baseUnits=2**i,mergeTo=f'{cid}:{i+2}' if i+1<len(names) else None,
                     sellCoins=max(1,1+i//2) if kind=='commodity' else 0) for i,n in enumerate(names)]
    CHAINS.append(c)
    return c

EXT={
 'food':['双层庆典蛋糕','缤纷甜品塔','宴会甜品桌','婚礼甜品台','大师甜品盛宴'],
 'tools':['商用烤箱','双层烤箱','蒸烤一体机','多功能料理台','中央备餐台','主厨工作站','开放式中央厨房','星级宴会厨房'],
 'vegetable':['四季蔬食宴','丰收长桌宴'], 'fruit':['四季水果塔','缤纷鲜果宴'],
 'drink':['手冲咖啡套组','冷萃咖啡桶','精品咖啡吧','冠军咖啡台','世界咖啡盛典'],
 'tableware':['典藏瓷器柜','皇家宴会餐台'], 'herb':[],
 'chinese':['团圆家宴','四季中华宴'], 'japanese':['樱花会席','和风庆典宴'],
 'italian':['托斯卡纳长桌','地中海庆典宴'], 'mexican':['阳光街头宴','嘉年华大餐'],
}
CHAPTERS={'food':1,'tools':1,'vegetable':1,'fruit':1,'drink':2,'tableware':1,'herb':3,'chinese':4,'japanese':4,'italian':5,'mexican':5}
REF_MAP={'food':'有氧器材11级长主链；厨房题材适配','tools':'维修工具14级长链','vegetable':'健康食品；保留旧6级并延长为8级','fruit':'冰箱/器材副链结构；保留项目水果','drink':'饮品至少11级','tableware':'手套副产物结构；项目已有6级餐具独立保留','herb':'植物6级及末端自动产物','chinese':'项目原有菜系','japanese':'项目原有菜系','italian':'项目原有菜系','mexican':'项目原有菜系'}
for f,names in EXT.items():
    chain(f,BASE['familyMeta'][f]['name'],[x['name'] for x in BASE['chains'][f]]+names,chapter=CHAPTERS[f],reference=REF_MAP[f],legacyPrefix=6)

EXTRA=[
 ('linen','厨房织物','单只隔热手套|一双隔热手套|主厨隔热手套',1,'手套3级'),
 ('preservation','食材保鲜','保鲜贴|密封袋|保鲜盒|冷藏保鲜套装',1,'常备药品4级，厨房主题转换'),
 ('bakeware','烘焙器具','纸杯模具|小蛋糕模|圆形烤盘|长方烤盘|多格烤盘|旋转裱花台|专业烘焙套组',1,'力量器械副链；7级为拟定'),
 ('seedbag','香草种子袋','小种子包|加量种子包|大种子包|香草种子堆',3,'种子袋4级'),
 ('emptybag','空种子袋','空纸袋|折叠空袋|空袋束|整捆空袋',3,'空袋4级后跨链合成'),
 ('doll','手作布偶','麻布片|布偶裁片|填充布偶|围裙小偶|主厨布偶|餐厅吉祥偶|布偶小剧场|厨房布偶大家庭',3,'布袋玩偶；8级为拟定'),
 ('snail','花园蜗牛','小蜗牛壳|初生蜗牛|花园蜗牛|大叶蜗牛|彩壳蜗牛|星光蜗牛',3,'蜗牛6级；名称原创'),
 ('pantry','餐厅储物柜','藤编储物篮|抽屉木板|抽屉框架|旧餐具抽屉|餐具收纳抽屉|双层餐厅柜|双排餐厅柜|橡木储物柜|玻璃餐具柜|典藏陈列柜|主厨收藏柜',6,'储物柜11级；高阶名称原创'),
 ('lost','客人遗失物','遗落眼镜|手写便签|遗落围巾|小失物篮|大失物篮|邻里失物招领台',6,'遗失物6级；5级开始再生产'),
 ('comfort','待客休闲','颈枕|软靠垫|按摩靠枕|筋膜放松器|随身音乐盒|掌上音响|沉浸观影镜|复古游戏礼盒',6,'娱乐设施8级'),
 ('console','复古游戏机','迷你掌机|彩屏掌机|双人掌机|家庭游戏机',6,'游戏机4级'),
 ('adventure_box','厨房冒险场景','食材森林|烘焙山谷|汤锅港口|甜品城堡|星光宴会厅',6,'墙壁/野餐篮状态机；5个耗尽转换阶段'),
 ('story','厨房冒险卡','启程卡|伙伴卡|旅途卡|城堡卡|大厨守护者',6,'斗恶龙5级产手办材料'),
 ('mascot','厨房手办','小厨精灵|围裙小厨|烘焙小厨|咖啡小厨|花园小厨|庆典主厨|小厨全家福',6,'肥鹅手办；7级拟定'),
 ('puzzle','餐厅旧照片','碎纸堆|照片纸片|一块照片|照片拼接|小块照片|大块照片|照片一角|模糊合影|清晰合影|旧照片轮廓|餐厅相框|旧日信封|珍藏开店照',6,'拼图13级'),
 ('keys','储物钥匙','小钥匙|钥匙串|感应钥匙|自动感应钥匙|餐厅感应手环',6,'钥匙5级'),
 ('timegate','旧日记忆','记忆微光|记忆碎片|记忆窗口|旧日门扉|往日厨房|开店纪念馆',6,'神秘光门；6级拟定'),
 ('tasting','试菜评估','试菜便签|试吃记录|口味报告|主厨推荐|菜单分析|宴会评审',8,'体能测试6级，4级开始产课程'),
 ('courses','烹饪课程','入门笔记|基础课程|进阶课程|烘焙课程|主厨课程|大师课程',8,'健身课程；6级拟定'),
 ('flowers','餐桌花艺','小花枝|一束鲜花|散装郁金香|郁金香捧花|桌边花瓶|餐桌花艺|宴会插花|花园花墙|盛典花艺',7,'花卉链；9级拟定'),
 ('scraps','花园堆肥','果蔬边角|咖啡渣|落叶堆|混合厨余|堆肥袋|发酵堆肥|熟成堆肥|花园堆肥箱',9,'垃圾末端生产结构；8级拟定'),
 ('garden_guest','花园来客','小田鼠|灰田鼠|田鼠伙伴|田鼠小屋|花园小窝|温暖猫窝',9,'老鼠—猫窝；6级拟定'),
 ('cats','餐厅猫咪','田园小猫|奶牛小猫|橘色小猫|灰色小猫|白色长毛猫|布偶猫|围裙店长猫|花园猫咪一家',9,'猫链；8级拟定'),
 ('honor','主厨荣誉','参与徽章|铜色徽章|银色徽章|金色徽章|街区奖杯|城市奖杯|年度主厨奖杯',12,'冠军之路；改为永久里程碑奖励，7级拟定'),
]
for cid,name,names,chapter,ref in EXTRA:
    c=chain(cid,name,names,chapter=chapter,reference=ref)
    if cid=='adventure_box':
        c['kind']='stateful'
        for it in c['items']: it.update(mergeTo=None,sellCoins=0,baseUnits=None)
    if cid in ('seedbag','pantry'): c['kind']='hybrid'

# All target values below are proposed unless a resource row explicitly cites a historical source.
RESOURCE=[
 ('energy','体力补给','小能量球|能量球|大能量球|充沛能量|满满能量',[1,6,15,40,100],'energy',['S14']),
 ('coins','金币','零散金币|一叠金币|一小袋金币|一袋金币|金币罐|金币宝箱',[1,3,8,20,50,120],'coins',['S14']),
 ('gems','彩虹糖','彩虹糖|几颗彩虹糖|一袋彩虹糖|彩虹糖罐',[1,3,8,20],'gems',['S14']),
 ('blackbag','设备工具包','设备工具包|高级设备工具包',[10,22],'draws',['S16']),
 ('pinkbag','食材设备包','食材设备包|高级食材设备包',[12,28],'draws',['S16']),
 ('tipjar','小厨存钱罐','小厨存钱罐|胖胖存钱罐|金色存钱罐',[15,18,53],'draws',['S16']),
 ('infinite','无限体力','短时无限体力|一分钟无限体力|两分钟无限体力|五分钟无限体力',[30,60,120,300],'seconds',['S17']),
 ('timeskip','棋盘加速','一小时沙漏|两小时沙漏|四小时沙漏|八小时沙漏|十六小时沙漏',[3600,7200,14400,28800,57600],'seconds',['S17']),
 ('charge','补货道具','小补货箱|补货箱|大补货箱',[5,10,20],'charges',['S17']),
 ('splitter','剪刀','基础剪刀|精细剪刀|万能剪刀',[4,8,None],'maxTargetLevel',['S17']),
 ('chest','订单礼盒','厨房礼盒|精致礼盒|豪华礼盒',[1,2,3],'rewardTier',[]),
 ('energybox','能量补给箱','能量补给箱',[5],'draws',['S12']),
 ('backpack','扩容背包','收纳扩容包',[1],'slots',['S17']),
 ('stopwatch','单机加速','一小时秒表',[3600],'seconds',['S17']),
 ('upgrade','升级卡','普通升级卡|设备升级卡',[1,1],'levels',[]),
]
for cid,name,names,values,unit,sources in RESOURCE:
    c=chain(cid,name,names,kind='resource',sources=sources,reference='资源档位采用历史记录；使用约束为项目设计' if sources else '项目拟定')
    for it,value in zip(c['items'],values):
        it['value']=value
        it['valueUnit']=unit
        it['valueEvidence']='P' if sources and cid!='stopwatch' else 'D'
        it['valueSources']=sources if it['valueEvidence']=='P' else []
    if cid=='gems': c['reference']='彩虹糖为项目原创资源外观；数值档位参考S14历史资源记录'
    if cid=='stopwatch': c['reference']='单台加速/可堆叠概念参考S17；单件3600秒为项目拟定D'
    if cid=='upgrade':
        for it in c['items']: it['baseUnits']=None
    if cid in ('upgrade','backpack','energybox','stopwatch'): 
        for it in c['items']: it['mergeTo']=None
for f in ('energy','coins','chest'):
    c=chain('legacy_'+f,'旧档'+BASE['familyMeta'][f]['name'],[i['name'] for i in BASE['chains'][f]],kind='legacy',reference='当前版本完整保值',migrationOnly=True)
    for it,old in zip(c['items'],BASE['chains'][f]):
        if 'value' in old: it['value']=old['value'];it['valueUnit']=f
        it['mergeTo']=None

PRODUCERS=[]
PRODUCER_SPECS=[
 ('tools','厨具收纳缸',12,4,1,600,{'tools':.80,'linen':.12,'tableware':.08},'维修工具箱'),
 ('food','烘焙原料罐',11,5,1,900,{'food':.90,'bakeware':.10},'器材采购车长主链+副链'),
 ('produce','生鲜采购筐',12,3,1,600,{'vegetable':.62,'fruit':.28,'preservation':.10},'冰箱三产物链'),
 ('drink','咖啡工作台',10,4,2,600,{'drink':1.0},'饮品链按项目原来源独立'),
 ('herb','香草花盆',10,4,3,900,{'seedbag':1.0},'花盆—种子袋'),
 ('asian','亚洲料理台',10,4,4,1200,{'chinese':.72,'japanese':.28},'项目已有双产物菜系'),
 ('mediterranean','环球料理台',10,4,5,1200,{'italian':.72,'mexican':.28},'项目已有双产物菜系'),
 ('supply','设备采购车',12,4,6,14400,{'pantry':.50,'gen_herb':.20,'gen_tools':.15,'gen_supply':.05,'gen_flower':.10},'购物车供零件'),
 ('publicity','食谱研究台',6,4,8,3600,{'tasting':.85,'gen_publicity':.15},'宣传方式自生产与体能测试'),
 ('flower','花艺工具桶',9,5,7,1800,{'flowers':1.0},'新版花篮'),
 ('recycle','花园循环桶',10,5,9,1800,{'scraps':1.0},'扫地机—垃圾—动物，厨房园艺主题'),
]
TIER_NAMES=['入门','实用','专业','双层','高效','大师','豪华','旗舰','典藏','臻选']
RANK_PROBS=[[1,0,0],[.9,.1,0],[.8,.2,0],[.65,.30,.05],[.55,.35,.10],[.45,.40,.15],[.35,.45,.20],[.25,.45,.30],[.15,.40,.45],[.10,.30,.60]]
BATCH=[12,16,20,26,34,44,56,72,90,112]
for kind,name,max_l,active,chapter,base_cd,drops,ref in PRODUCER_SPECS:
    parts=[f'{name}零件',f'{name}组件',f'{name}框架',f'{name}雏形'][:active-1]
    names=parts+[f'{TIER_NAMES[i]}{name}' for i in range(max_l-active+1)]
    chain('gen_'+kind,name,names,kind='producer',chapter=chapter,reference=ref)
    levels=[]
    for level in range(1,max_l+1):
        r=level-active
        levels.append(dict(level=level,active=r>=0,energyPerTap=1 if r>=0 else 0,batch=BATCH[r] if r>=0 else 0,
            maxStock=2*BATCH[r] if r>=0 else 0,rechargeSeconds=math.ceil(base_cd*(1-.05*r)) if r>=0 else 0,
            outputLevelProb=RANK_PROBS[r] if r>=0 else [0,0,0],outputBaseUnitsPerTap=sum(p*2**i for i,p in enumerate(RANK_PROBS[r])) if r>=0 else 0))
    PRODUCERS.append(dict(id=kind,chain='gen_'+kind,name=name,activeLevel=active,maxLevel=max_l,unlockChapter=chapter,
         reference=ref,evidence='D',drops=[dict(chain=f,prob=p) for f,p in drops.items()],levels=levels,stockRule='two_batch_reservoir',
         oldLevelOffset=active-1 if kind in BASE['producers'] else None))

TRANSITIONS=[
 dict(id='seed',source='seedbag:4',mode='finite',energyPerTap=1,draws=12,outputs=[{'item':'herb:1','prob':1}],onExhaust='emptybag:1'),
 dict(id='empty_to_doll',source='emptybag:4',mode='cross_merge',count=2,output='doll:1'),
 dict(id='herb_snail',source='herb:6',mode='auto',intervalSeconds=1800,capacity=2,output='snail:1',stockRule='bounded_buffer'),
 dict(id='pantry_manual',sourceLevels=[f'pantry:{i}' for i in range(1,12)],mode='recharge',energyPerTap=1,batch=8,maxStock=16,rechargeSeconds=1800,outputs=[{'item':'puzzle:1','prob':.8},{'item':'keys:1','prob':.2}]),
 dict(id='pantry_auto',sourceLevels=[f'pantry:{i}' for i in range(6,12)],mode='auto',intervalSeconds=1800,capacity=2,output='lost:1',stockRule='bounded_buffer'),
 dict(id='lost5',source='lost:5',mode='auto',intervalSeconds=3600,capacity=2,output='comfort:1',stockRule='bounded_buffer'),
 dict(id='lost6',source='lost:6',mode='auto',intervalSeconds=2400,capacity=3,output='comfort:1',stockRule='bounded_buffer'),
 dict(id='comfort_console',source='comfort:8',mode='finite_sequence',energyPerTap=1,sequence=['puzzle:1','puzzle:1','console:1']*4,onExhaust=None),
 dict(id='console_scenes',source='console:4',mode='finite',energyPerTap=1,draws=3,outputs=[{'item':'adventure_box:1','prob':1}],onExhaust=None),
 *[dict(id=f'adventure{i}',source=f'adventure_box:{i}',mode='finite',energyPerTap=1,draws=6+2*i,outputs=[{'item':'story:1','prob':1}],onExhaust=f'adventure_box:{i+1}' if i<5 else None) for i in range(1,6)],
 dict(id='story_mascot',source='story:5',mode='delayed_once',delaySeconds=7200,outputs=[{'item':'mascot:1','count':4}],onExhaust=None),
 dict(id='keys_gate',source='keys:5',mode='finite',energyPerTap=1,draws=4,outputs=[{'item':'timegate:1','prob':1}],onExhaust=None),
 *[dict(id=f'tasting{i}',source=f'tasting:{i}',mode='finite',energyPerTap=1,draws={4:4,5:8,6:16}[i],outputs=[{'item':'courses:1','prob':1}],onExhaust=None) for i in [4,5,6]],
 dict(id='scraps_guest',source='scraps:8',mode='auto',intervalSeconds=1800,capacity=2,output='garden_guest:1',stockRule='bounded_buffer'),
 dict(id='nest_cat',source='garden_guest:6',mode='recharge',energyPerTap=1,batch=20,maxStock=40,rechargeSeconds=7200,outputs=[{'item':'cats:1','prob':1}]),
]

# Standard work cost is a pricing anchor at the first active generator, with L1-only drops.
WEIGHTS={}
for p in PRODUCERS:
    for drop in p['drops']:
        if not drop['chain'].startswith('gen_'):
            WEIGHTS[drop['chain']]=1/drop['prob']
WEIGHTS.update(herb=20/12,emptybag=20,doll=320,snail=4,lost=4,comfort=4,console=128,adventure_box=math.nan,
               story=4,mascot=32,puzzle=1.25,keys=5,timegate=40,courses=7.5,garden_guest=4,cats=5,honor=64)
for c in CHAINS:
    w=WEIGHTS.get(c['id'])
    c['standardCostPerBaseUnit']=round(w,6) if w is not None and math.isfinite(w) else None
    c['costBasis']='direct_expected_work' if c['id'] in {d['chain'] for p in PRODUCERS for d in p['drops']} else 'proposal_time_or_conversion_weight'
    for it in c['items']:
        it['standardCost']=round(w*it['baseUnits'],3) if w is not None and math.isfinite(w) and it['baseUnits'] is not None else None
        it['mergeCount']=2 if it['mergeTo'] else None
        it['repeatOrderEligible']=c['id'] in EXT and c['id'] not in ['herb','tools']
        permanent_source=any(t['mode'] in ['auto','recharge'] and it['id'] in ([t['source']] if 'source' in t else t.get('sourceLevels',[])) for t in TRANSITIONS)
        it['protectedDefault']=c['kind'] in ['producer','stateful'] or permanent_source or (c['id']=='tools' and it['level']>=3)
        if c['kind'] in ['producer','stateful'] or permanent_source: it['sellCoins']=0

INDEX={it['id']:it for c in CHAINS for it in c['items']}
def cost(f,l,n=1): return INDEX[f'{f}:{l}']['standardCost']*n
RECIPES=[]
for old in BASE['recipes']:
    inputs=sum(cost(x['family'],x['level'],x['count']) for x in old['needs'])
    output=cost(old['output']['family'],old['output']['level'])
    energy=max(0,math.ceil(.90*output-inputs-1e-8))
    RECIPES.append(dict(id=old['id'],name=old['name'],inputs=old['needs'],tool={'item':f"tools:{old['toolLevel']}",'minimumLevel':old['toolLevel'],'consumed':False},
       output=old['output'],unlockChapter=old['unlockStage']+1,energyCost=energy,coinCost=0,xp=0,
       inputStandardCost=round(inputs,3),outputStandardCost=round(output,3),totalStandardCost=round(inputs+energy,3),dailyLimit=None,evidence='D'))

CHAPTER_NAMES=[x['name'] for x in BASE['renovations']]+['找回开店旧照','迎接花园来客','筹办主厨课堂','举办邻里美食节']
STAR_COST=[x['stars'] for x in BASE['renovations']]+[24,30,36,45]
STORY_POOLS=[['food','vegetable','fruit'],['food','drink','vegetable'],['herb','food','vegetable'],['chinese','japanese','food'],['italian','mexican','drink'],['puzzle','lost','food'],['flowers','fruit','drink'],['tasting','courses','chinese'],['puzzle','scraps','garden_guest'],['cats','snail','herb'],['courses','tableware','italian'],['mascot','puzzle','food']]
STORY_LEVELS=[2,3,3,4,4,4,4,4,4,4,5,6]
STORY_LABELS=['开门准备','邻里尝鲜','午后小聚','整理餐桌','加一道招牌','筹备晚餐','迎接熟客','章节庆典']
STORY=[]
CHAPTER_DATA=[]
for chapter,(title,stars,pool,level) in enumerate(zip(CHAPTER_NAMES,STAR_COST,STORY_POOLS,STORY_LEVELS),1):
    reward_total=max(8,stars)
    for i in range(8):
        f=pool[i%len(pool)]
        lv=max(1,level+[-1,0,0,0,-1,1,0,0][i])
        if f in ['mascot','garden_guest','cats']: lv=min(lv,3)
        n=2 if i==7 else 1
        c=cost(f,lv,n)
        STORY.append(dict(id=f'main-{chapter:02d}-{i+1:02d}',chapter=chapter,title=f'{title} · {STORY_LABELS[i]}',needs=[dict(family=f,level=lv,count=n)],
           standardCost=round(c,3),coins=math.ceil(8+2*c),xp=math.ceil(4+c/4),stars=reward_total//8+(i<reward_total%8),
           unlockAfter=None if i==0 else f'main-{chapter:02d}-{i:02d}',evidence='D'))
    unlock=[p['id'] for p in PRODUCERS if p['unlockChapter']==chapter+1]
    old=BASE['renovations'][chapter-1] if chapter<=8 else {}
    rewards=([{'item':'pantry:6','count':1}] if chapter==5 else [])+([{'item':'honor:1','count':1}] if chapter==12 else [])
    if old.get('storageReward'): rewards.append({'resource':'storageSlots','amount':old['storageReward']})
    if old.get('coinReward'): rewards.append({'resource':'coins','amount':old['coinReward']})
    if old.get('chestReward'): rewards.append({'item':f"chest:{old['chestReward']}",'count':1})
    CHAPTER_DATA.append(dict(chapter=chapter,id=(old['id'] if chapter<=8 else f'extension-{chapter}'),name=title,stars=stars,orders=[x['id'] for x in STORY if x['chapter']==chapter],unlockNextProducers=unlock,
       completionRewards=rewards))

LEVEL_REWARDS=[]
for lv in range(2,101):
    rewards=[{'item':'energybox:1','count':1}]
    if lv%10==0: rewards += [{'item':'blackbag:2','count':1},{'item':'pinkbag:2','count':1},{'item':'timeskip:1','count':1}]
    elif lv%5==0: rewards += [{'item':'blackbag:1' if (lv//5)%4==1 else 'pinkbag:1','count':1}]
    if lv%15==0: rewards.append({'item':'infinite:1','count':1})
    if lv%20==0: rewards.append({'item':'upgrade:1','count':1})
    if lv%25==0: rewards.append({'item':'backpack:1','count':1})
    if lv in [50,100]: rewards.append({'item':'upgrade:2','count':1})
    LEVEL_REWARDS.append({'level':lv,'cumulativeXp':100*(lv-1)+10*(lv-1)*(lv-2),'rewards':rewards})

CONFIG=dict(schemaVersion=1,balanceVersion='kitchen-reference-v1-draft',status='IMPLEMENTED_RUNTIME',asOf=DATE,
 evidencePolicy='O官方历史事实；P带地区/日期的玩家记录；U未知；D小厨拟定。小厨所有未逐项引用的参数均为D。',
 baselineCommit=BASE['sourceCommit'],sources=[dict(id=i,title=t,url=u,date=d,limits=l) for i,t,u,d,l in SOURCES],
 globals=dict(boardRows=7,boardCols=7,energyCap=100,manualEnergyCap=999,energyRegenSeconds=120,energyPerTap=1,
              initialCoins=120,initialGems=20,initialEnergy=100,initialStorage=6,maxStorage=60,dailyTimezone='Asia/Shanghai',maxOrdinaryOrders=3,
              mergeRatio=2,currencyCap=1000000000,orderCoinFormula='ceil(8 + 2*C)',orderXpFormula='ceil(4 + C/4)',
              repeatStarFormula='min(4, max(1, ceil(C/40)))',xpPerLevelFormula='100 + 20*(level-1)',sellFormula='1 + floor((level-1)/2)',
              perMergeXp=0,firstDiscoveryXp=1,coinEnergyPurchase=False,recipeEfficiencyFloor=.90,playerLevelCap=100,
              lockedCellCoinFormula='12 + floor(index/7)*4',claimResourceEnergyCost=0,
              infiniteEnergyMaxSeconds=3600,stopwatchMaxCreditSeconds=432000,discardUndoSeconds=30),
 chains=CHAINS,producers=PRODUCERS,transitions=TRANSITIONS,recipes=RECIPES,chapters=CHAPTER_DATA,storyOrders=STORY,levelRewards=LEVEL_REWARDS,
 initial=dict(producers=[{'item':f'gen_{k}:{next(p["activeLevel"] for p in PRODUCERS if p["id"]==k)}','count':1,'index':i} for k,i in [('food',0),('produce',3),('tools',6)]],
              commodities=[{'item':f"{x['family']}:{x['level']}",'index':i} for i,x in enumerate(BASE['initial']['board']) if x and x['family']!='producer'],
              lockedIndices=BASE['initial']['locked'],pending=[{'item':'chest:1','count':1}],boosters=[{'item':'splitter:3','count':2},{'item':'charge:3','count':2}]),
 repeatOrderRules=dict(slots=[{'id':'easy','band':[3,12]},{'id':'medium','band':[12,32]},{'id':'long','band':[32,80]}],
    chapterMultiplier=[1,1,1.25,1.5,2,2.5,3,3.5,4,4.5,5,6],maxLevelByChapter=[3,3,4,4,5,5,6,6,7,7,8,8],
    needsPerOrder=[1,2],maxCountPerNeed=2,maxActiveCommodityFamilies=3,freeRefreshPerDay=3,refreshCoins=50,refreshDailyLimit=10,
    refreshReward=False,minimumStandardCostPerChestOrder=4,requiredAvailableStorageFreeSlots=1),
 economy=dict(energyPurchases=[dict(gems=g,energy=100) for g in [5,10,20,40]],energyPurchaseDailyLimit=4,
              dailyFree=[{'item':'tipjar:1','count':1},{'item':'energybox:1','count':1}],dailyBreakEnergy=25,dailyBreakClaims=3,
              dailyDeviceCommission={'completedOrders':3,'reward':'odd local day blackbag:1 / even local day pinkbag:1','limit':1},
              weeklyCommission={'completedOrders':20,'rewards':[{'item':'blackbag:2','count':1},{'item':'pinkbag:2','count':1},{'item':'stopwatch:1','count':1},{'item':'infinite:1','count':1},{'item':'timeskip:1','count':1}],'limit':1},
              honorMilestone={'unlockedAfterChapter':12,'ordersPerItem':10,'reward':'honor:1'},
              storagePrices=[80,120,180,260,360,500,680,900,1200,1500,1900,2300,2800,3400,4000,4700,5500,6400,7400,8500,9700,11000,12400,13900,15500,17200,19000],
              storageIncrement=2,orderChestEvery=5,orderChestDailyLimit=3,repeatOrderDailyLimit=None,
              pigDrops=[{'chain':'coins','prob':.9},{'chain':'gems','prob':.1}],pigLevelProbByTier={'1':[.9,.1,0],'2':[.45,.4,.15],'3':[.35,.45,.20]},
              energyBoxDrops=[{'item':'energy:1','prob':.15},{'item':'energy:2','prob':.40},{'item':'energy:3','prob':.35},{'item':'energy:4','prob':.10}],
              bags={'blackbag':{'gen_tools':.35,'gen_herb':.25,'gen_supply':.20,'gen_flower':.20},'pinkbag':{'gen_food':.20,'gen_produce':.20,'gen_drink':.15,'gen_asian':.15,'gen_mediterranean':.15,'gen_publicity':.075,'gen_recycle':.075}},
              bagLevelProb=[.65,.25,.10],bagOpenSeconds={'blackbag':[600,1800],'pinkbag':[900,2400]},
              chestRewards={'1':[{'item':'energy:2','count':1},{'item':'coins:3','count':1}],
                            '2':[{'item':'energy:3','count':1},{'item':'coins:4','count':1}],
                            '3':[{'item':'energy:4','count':1},{'item':'coins:5','count':1},{'item':'splitter:1','count':1}]},
              shop=[dict(id='basic-splitter',item='splitter:1',coins=180,dailyLimit=1),dict(id='charge-small',item='charge:1',coins=100,dailyLimit=2),
                    dict(id='equipment-choice',selection='unlocked producer L1',coins=300,dailyLimit=1)],
              bubbleProbability=.08,bubbleMinimumLevel=3,bubbleMaxCount=1,bubbleDurationSeconds=120,bubblePriceFormula='ceil(max(2,C/8)) gems',bubbleExpiryItem='coins:1'),
 policies=dict(resourcePartUsedMerge=False,finitePartUsedMerge=False,finitePartUsedSplit=False,producerSplit=False,
    automaticMode='adjacent_output_with_bounded_internal_buffer',warehouseTimers='pause',pendingTimers='pause',
    rechargeStarts='when_below_maxStock',offlineRecharge='elapsed_batches_clamped_to_maxStock',
    sourceProtection='block_consumption_of_last_permanent_source_or_last_required_recipe_tool',
    producerMergeStock='sum_stock_keep_overflow_credit',producerMergeCooldown='slower_normalized_remaining_fraction',
    finiteUpgrade='only_unopened_non_stateful_ordinary',upgradeGenerator='parts_or_active_generator',
    bagDrops='filter_by_unlocked_chapter_then_renormalize_at_open',primaryDrops='filter_by_unlocked_chapter_then_renormalize_per_tap',rngCommit='persist_before_showing_result',
    dailyReset='00:00 Asia/Shanghai',weeklyReset='Monday 00:00 Asia/Shanghai',
    chapterAdvance='all_8_story_orders_and_pay_stars',rewardDelivery='pending_queue_never_drop'),
 validation=dict(samples=10000,seed=20261016,limits='期望值与静态一致性审计；不代表真实留存、完成时长或现版肥鹅数值'))

align_feige(CONFIG, FE_CHAINS, FE_NUMBERS, SOURCES)
apply_item_identities(CONFIG)

def dump(name,obj): (ROOT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
def table(headers,rows):
    return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+''.join('| '+' | '.join(str(x).replace('|','／').replace('\n',' ') for x in row)+' |\n' for row in rows)

def main():
    write_mapping(CONFIG, FE_CHAINS, table)
    dump('sources.json',CONFIG['sources'])
    dump('feige-reference.json',dict(asOf=DATE,status='PUBLIC_EVIDENCE_PARTIAL_NOT_OFFICIAL_CONFIG',chains=FE_CHAINS,
        parameters=[dict(id=i,name=n,value=v,unit=u,evidence=e,sources=s,limits=l) for i,n,v,u,e,s,l in FE_NUMBERS]))
    dump('kitchen-target.json',CONFIG)
    (ROOT/'SOURCES.md').write_text('# 来源与证据登记\n\n检索截至 '+DATE+'。发布日期与检索日期分开；转载日期不能证明配置更新。原图人工核读可辨字段，模糊表头/掉率不猜值。采用限制与冲突见逐字段决策。\n\n'+table(['ID','资料','日期/范围','采用限制'],[(i,f'[{t}]({u})',d,l) for i,t,u,d,l in SOURCES]))
    out=['# 肥鹅健身房物品证据表\n',
         '本表是公开资料中可定位的40个主棋盘/历史系列。未知名称写为“待核实”，最高等级写的是来源报告值。空白现版上限一律不推断。资源道具另见 [数值证据](FEIGE_NUMBERS.md)，活动边界见 [研究文档](FEIGE_REFERENCE.md)。\n']
    for c in FE_CHAINS:
        links='、'.join(f'[{s}](SOURCES.md)' for s in c['sources'])
        out += [f'## {c["name"]} · `{c["id"]}`\n',f'范围：{c["scope"]}；来源：{links}；来源报告等级：{c["reportedMax"] or "未核齐"}；现版上限：未知。{c["note"]}\n']
        if c['levels']: out += [table(['等级','名称','证据状态'],[(i['level'],i['name'] or '待核实',i['status']) for i in c['levels']]),'\n']
        if c['unranked']: out += ['已见但未确定等级的名称：'+'、'.join(c['unranked'])+'。\n']
    (ROOT/'FEIGE_ITEMS.md').write_text('\n'.join(out))
    (ROOT/'FEIGE_NUMBERS.md').write_text('# 肥鹅健身房数值证据表\n\nO＝官方公告历史事实；P＝玩家/攻略记录，需带日期和地区；U＝未知。`null` 保持未知，不取0、不填拟合值。研究判断见 [参考主文档](FEIGE_REFERENCE.md)。\n\n'+table(['字段','含义','记录值','单位','证据','来源','限制'],[(i,n,json.dumps(v,ensure_ascii=False) if v is not None else '未知',u,e,'、'.join(f'[{sid}](SOURCES.md)' for sid in s) or '—',l) for i,n,v,u,e,s,l in FE_NUMBERS]))
    out=['# 小厨合合当前版本数值快照\n',f'读取日期：{DATE}；Git提交：`{BASE["sourceCommit"]}`。代码来源：[catalog.mjs](../../dist/catalog.mjs)、[engine.mjs](../../dist/engine.mjs)、[app.mjs](../../dist/app.mjs)。本表记录历史实现行为；当前运行时说明见[实现说明](../BALANCE_IMPLEMENTATION.md)。目标设计单独见 [KITCHEN_BALANCE.md](KITCHEN_BALANCE.md)。\n',
         '## 全局与经济\n',table(['项目','当前实现'],[
             ('棋盘','7×7＝49格；初始底部14格锁定'),('初始资产','120金币、100体力、0星星、0XP；6仓库格；剪刀2、沙漏2；1级礼盒1个待领'),
             ('自然体力','30秒/点，上限100；手动补给硬上限999'),('生产','每次1体力；双品类主72%、副28%；二级概率0.08+0.06×生产器等级'),
             ('生产器等级','1—4；库存14/18/22/26；耗尽后冷却60/50/40/30秒'),('自动香草','每60秒；离线每次tick最多补3，受四邻空格限制'),
             ('合并','同类同级二合一；XP += 合并前等级×2；生产器合并后满库存'),
             ('普通售价','2^(等级−1)金币'),('买体力','商店30金币→30点，可超过自然上限；补能按钮30金币→min(30,100−当前体力)'),
             ('订单','3槽；初始3单固定，其余按来源与序号轮换；C=Σ2^(等级−1)×数量；金币20+7C；XP12+3C；星星min(3,1+floor(C/12))'),
             ('订单最高等级','min(6,3+floor(装修阶段/2))；第6个序号倍数单主物数量2'),('玩家等级','floor(XP/100)+1；每级100XP'),
             ('每3单礼盒','1级礼盒1个；无限累计，无日上限'),('每日开店礼','北京时间每日一次：20体力、25金币、1级礼盒1个'),
             ('仓库','初始6；每次+2；价格80+max(0,容量−6)×20；上限60；装修赠格会影响下一次购买价格'),
             ('解锁格子','12+floor(格子索引/7)×4金币；底部两排为32/36；也可同物或相邻合成解锁'),
             ('泡泡','第5次合并的倍数，且普通合并结果≥3级、有空位时生成；60秒有效；价格6×2^结果等级金币；到期或戳破变coins:1即5金币'),
             ('配方','材料按数量消耗，厨具保留且可高阶替代；即时；无额外体力或金币成本；XP为各配方值'),
             ('沙漏','立即补满一个生产器库存，不按时间减CD'),('剪刀','普通物品L≥2拆为两个L−1；额外需要一空位；生产器/资源不能剪'),
             ('来源判断','棋盘、仓库、待领区中的生产器均计入订单可达品类'),('存档','version=2，兼容1/2；未知高版本会落入新档路径，迁移前必须修复')]),
         '\n## 77种图鉴物品\n']
    for f,items in BASE['chains'].items():
        out += [f'### {BASE["familyMeta"][f]["name"]} · `{f}`\n',table(['ID','名称','等级','领取值'],[(x['id'],x['name'],x['level'],x.get('value','—')) for x in items]),'\n']
    out += ['## 7类生产器（每类4级，共28种等级实例）\n',table(['kind','名称','品类','解锁阶段','级别'],[(k,p['name'],' / '.join(p['families']),p['unlockStage'],'1—4') for k,p in BASE['producers'].items()]),
            '\n## 10道现有配方\n',table(['ID','材料','保留工具最低级','输出','XP','解锁阶段'],[(r['id'],'；'.join(f"{n['family']}:{n['level']} ×{n['count']}" for n in r['needs']),r['toolLevel'],f"{r['output']['family']}:{r['output']['level']}",r['xp'],r['unlockStage']) for r in BASE['recipes']]),
            '\n## 8阶段装修（合计81星）\n',table(['阶段','名称','星星','奖励'],[(i+1,r['name'],r['stars'],json.dumps({k:v for k,v in r.items() if k in ['unlockKind','storageReward','chestReward','coinReward']},ensure_ascii=False)) for i,r in enumerate(BASE['renovations'])]),
            '\n## 商店\n',table(['商品','金币价格','解锁阶段','内容'],[(s['name'],s['cost'],s['unlockStage'],json.dumps({k:v for k,v in s.items() if k in ['type','kind','level','amount','booster']},ensure_ascii=False)) for s in BASE['shop']]),
            '\n## 当前礼盒精确奖励\n\n- L1：energy:2（12体力）+ coins:2（12金币）+ 已解锁种类随机L1生产器1个。\n- L2：energy:3（30体力）+ coins:3（30金币）+ 随机L1生产器1个 + energy:2（12体力）+ 剪刀1。\n- L3：energy:4（80体力）+ coins:4（80金币）+ 随机L1生产器1个 + energy:3（30体力）+ coins:4（80金币）+ 剪刀1 + 沙漏2。\n- 物品进待领取区，道具计数直接增加；打开先移除原礼盒。\n',
            '\n## 待修正的数值关系\n\n1. L1生产器每体力平均产出1.14个一级等价，L4为1.32；直接出售平均1.14—1.32金币，而30金币能无限购买30体力。库存和操作速度限制短期速度，正期望兑换循环仍成立。\n2. 果蔬沙拉用3个一级等价产出8个，拿铁用3产8；配方不耗体力，可形成显著的订单成本差。\n3. 每3单必发生产器，零件供应与空间占用缺少长期约束。\n4. 来源包含待领设备，可能提前产生新类别订单。\n5. 合并生产器恢复满库存，拆合/升级若扩展不设守恒会增加库存套利风险。\n6. 普通厨具订单能消耗唯一厨具，影响配方可用性。\n\n本次只记录与设计，不改变运行时。\n']
    (ROOT/'KITCHEN_CURRENT_BASELINE.md').write_text('\n'.join(out))
    out=['# 小厨合合目标物品全表\n',f'生成日期：{DATE}。已接入默认运行时v4。源数据：[kitchen-target.json](kitchen-target.json)。共 {len(CHAINS)} 个系列、{sum(len(c["items"]) for c in CHAINS)} 个定义；含生产器零件、状态阶段和仅供迁移的旧资源。\n',
         '## 字段与计数\n\n`baseUnits` 为普通同物二合一的一级等价数；状态阶段无此值。`standardCost` 为订单定价权重，自动产物包含时间权重，不能读成精确体力消耗。普通物品售价是项目拟定；资源以领取价值为准。带生产能力的实例默认保护，出售/交单必须通过依赖检查。全部名称和配置见各表，未启用的高等级也属于本版设计范围。\n',
         '图鉴覆盖普通、生产器、资源和特殊阶段四页；`legacy_*` 仅旧档持有时显示，计数不纳入新玩家收集完成率。\n']
    for c in CHAINS:
        out+= [f'## {c["name"]} · `{c["id"]}`\n',f'类型：{c["kind"]}；最早章节：{c["unlockChapter"]}；参考关系：{c["reference"]}。\n',
               table(['ID','等级','名称','下一合成物','一级等价','售价/领取值','定价权重'],[(i['id'],i['level'],i['name'],i['mergeTo'] or '—',i['baseUnits'] if i['baseUnits'] is not None else '—',f"{i['value'] if i['value'] is not None else '不限'} {i['valueUnit']}" if 'value' in i else i['sellCoins'],i['standardCost'] if i['standardCost'] is not None else '—') for i in c['items']]),'\n']
    (ROOT/'KITCHEN_ITEMS.md').write_text('\n'.join(out))
    out=['# 小厨合合生产器与转换全表\n','按字段采用有日期的P历史记录；未证实的批次/概率与厨房原创设备为D。[逐字段决策与冲突](ALIGNMENT_PARAMETERS.md)。P不代表2026现版官方值。总规则见 [数值设计](KITCHEN_BALANCE.md)。\n']
    for p in PRODUCERS:
        out += [f'## {p["name"]} · `{p["id"]}`\n',f'启用等级：{p["activeLevel"]}；解锁章节：{p["unlockChapter"]}；谱系：{p["reference"]}。抽取先选品类、再独立选等级；超出目标系列上限时钳制到最高级。\n',
                table(['产物系列','概率'],[(x['chain'],f'{100*x["prob"]:g}%') for x in p['drops']]),
                table(['等级','可生产','每周期补货','总库存','补货秒','L1/L2/L3概率D','单位点击一级等价','库存/CD/补量证据'],[(x['level'],'是' if x['active'] else '零件',x['batch'],x['maxStock'],x['rechargeSeconds'],' / '.join(f'{v:.0%}' for v in x['outputLevelProb']),f'{x["outputBaseUnitsPerTap"]:.2f}',' / '.join(x['fieldEvidence'][k]['evidence']+':'+','.join(x['fieldEvidence'][k]['sources']) for k in ['maxStock','rechargeSeconds','batch'])) for x in p['levels']]),'\n']
    out += ['## 特殊生产与跨链转换\n','此表的 source 是单个物品实例；任何一次产出先验证空位/缓冲容量，再提交耗能和状态变更。自动产物最多存至 capacity；一次性多件奖励进入待领区。\n',table(['规则','来源','模式','完整参数'],[(t['id'],t.get('source',','.join(t.get('sourceLevels',[]))),t['mode'],json.dumps({k:v for k,v in t.items() if k not in ['id','source','sourceLevels','mode']},ensure_ascii=False)) for t in TRANSITIONS])]
    (ROOT/'KITCHEN_PRODUCERS.md').write_text('\n'.join(out))
    out=['# 小厨合合订单、配方与章节表\n','设计稿；定价权重 C 是标准化工作量，含自动生产时间折算。首次解锁设备由上一章结算发放；主线订单只在所属章及前置满足后出现。重复订单为独立3槽。\n','## 12章与96个固定主线订单\n',table(['章','建设','星星成本','本章主线星星','下章设备','额外完成奖励'],[(c['chapter'],c['name'],c['stars'],sum(o['stars'] for o in STORY if o['chapter']==c['chapter']),','.join(c['unlockNextProducers']) or '—',json.dumps(c['completionRewards'],ensure_ascii=False)) for c in CHAPTER_DATA]),'\n']
    for ch in CHAPTER_DATA:
        orders=[o for o in STORY if o['chapter']==ch['chapter']]
        out += [f'## 第{ch["chapter"]}章：{ch["name"]}\n',table(['订单ID','所需物品','C','金币','经验','星星'],[(o['id'],'；'.join(f"{INDEX[x['family']+':'+str(x['level'])]['name']} ×{x['count']} ({x['family']}:{x['level']})" for x in o['needs']),o['standardCost'],o['coins'],o['xp'],o['stars']) for o in orders]),'\n']
    out += ['## 原有10道配方的目标参数\n','材料数量和厨具最低等级保留；烹饪能量按 `ceil(max(0,0.9×输出C−输入C))` 拟定。工具不消耗，更高级可替代。全部输出1件，金币成本0，重复制作XP为0；首次图鉴发现另记1XP。\n',table(['配方','材料','保留工具最低级','输出','能量','输入C','总C/输出C'],[(r['name'],'；'.join(f"{x['family']}:{x['level']} ×{x['count']}" for x in r['inputs']),r['tool']['minimumLevel'],f"{r['output']['family']}:{r['output']['level']}",r['energyCost'],r['inputStandardCost'],f"{r['totalStandardCost']} / {r['outputStandardCost']}") for r in RECIPES])]
    (ROOT/'KITCHEN_ORDERS_RECIPES.md').write_text('\n'.join(out))
    def reward_text(rewards):
        return '；'.join((f"{INDEX[x['item']]['name']} ×{x.get('count',1)} ({x['item']})" if 'item' in x else f"{x['resource']} +{x['amount']}") for x in rewards)
    e=CONFIG['economy']
    out=['# 小厨合合经济与等级奖励全表\n','设计值D；历史资源档位的来源列于物品表。操作和继承规则见 [主设计](KITCHEN_BALANCE.md)。本表由JSON生成。\n',
         '## 全局参数\n',table(['字段','值'],[(k,v) for k,v in CONFIG['globals'].items()]),
         '\n## 每日与每周供给\n',table(['来源','门槛/重置','内容'],[
             ('每日免费礼','每日1次',reward_text(e['dailyFree'])),('休息补能','每日3次','每次25体力'),
             ('每日设备委托','每日完成3单，北京日期奇/偶','黑包L1 / 粉包L1，各日仅1个'),
             ('每周委托','周一0时起完成20单，限1次',reward_text(e['weeklyCommission']['rewards'])),
             ('订单礼盒','每5个C≥4的已交订单；每日最多3个','订单礼盒L1'),
             ('主厨荣誉','通关12章后，每10个C≥4的订单','荣誉L1，无日上限')]),
         '\n## 彩虹糖补能和金币商店\n',table(['当日第几次','彩虹糖','体力'],[(i+1,x['gems'],x['energy']) for i,x in enumerate(e['energyPurchases'])]),
         '\n',table(['商品','金币','每日限购'],[(x.get('item',x.get('selection')),x['coins'],x['dailyLimit']) for x in e['shop']]),
         '\n## 仓库付费扩容\n','每次+2格；初始6、上限60；按付费次数查价，赠格不增加购买序号。临近上限按实际格数折算。\n',table(['购买序号','金币'],[(i+1,v) for i,v in enumerate(e['storagePrices'])]),
         '\n## 资源与辅助道具档位\n','领取值P表示来源中的历史档位；使用边界与掉率仍是D。\n',table(['系列','等级','领取值/限制','单位','值证据'],[(c['id'],it['level'],it['value'] if it['value'] is not None else '不限',it['valueUnit'],it['valueEvidence']) for c in CHAINS if c['kind']=='resource' for it in c['items']]),
         '\n## 黑/粉包\n','全部解锁后的品类权重如下；打开时过滤未解锁设备并归一化，冻结抽取池。各级包的零件等级概率相同，L1/L2/L3为65%/25%/10%。每次取物0体力。\n',
         table(['包','产物','原始权重'],[(bag,cid,f'{p:.1%}') for bag,drops in e['bags'].items() for cid,p in drops.items()]),
         '\n',table(['包','等级','次数','开锁秒'],[(bag,i+1,next(c for c in CHAINS if c['id']==bag)['items'][i]['value'],secs) for bag,times in e['bagOpenSeconds'].items() for i,secs in enumerate(times)]),
         '\n## 存钱罐\n','先抽金币90%或彩虹糖10%，再抽下表中的物品等级。档位次数来自历史记录，掉率为D。\n',table(['罐等级','次数','产L1','产L2','产L3'],[(lv,INDEX['tipjar:'+lv]['value'],*[f'{p:.0%}' for p in probs]) for lv,probs in e['pigLevelProbByTier'].items()]),
         '\n## 能量箱与订单礼盒\n','能量箱固定5次取物，以下为每次分布；各次独立。\n',table(['产物','概率','直接领取体力'],[(x['item'],f"{x['prob']:.0%}",INDEX[x['item']]['value']) for x in e['energyBoxDrops']]),
         '\n',table(['礼盒级别','确定奖励'],[(lv,reward_text(rewards)) for lv,rewards in e['chestRewards'].items()]),
         '\n## 2—100级逐级奖励\n','累计XP表示达到该等级的门槛；相同等级只领取一次。等级上限100，满级后不再派等级礼包。\n',
         table(['等级','累计XP','该级奖励'],[(x['level'],x['cumulativeXp'],reward_text(x['rewards'])) for x in LEVEL_REWARDS])]
    (ROOT/'KITCHEN_ECONOMY.md').write_text('\n'.join(out))
    print(json.dumps({'chains':len(CHAINS),'targetItems':len(INDEX),'primaryProducers':len(PRODUCERS),'specialRules':len(TRANSITIONS),'storyOrders':len(STORY),'recipes':len(RECIPES),'referenceFamilies':len(FE_CHAINS)},ensure_ascii=False))

if __name__=='__main__': main()
