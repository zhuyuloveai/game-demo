"""Editable, farm-specific vector assets. No gameplay code or original art is modified."""
from pathlib import Path
import json, hashlib

ROOT=Path(__file__).resolve().parents[1]
STROKE='#9C7659'; CREAM='#FFF7E5'; GREEN='#AFC68C'; LEAF='#779C6A'; PEACH='#EDAA85'; GOLD='#E8C779'; WOOD='#D5AE7E'; BLUE='#AFC9C2'; RED='#DF927E'
def path(d,fill='none',**attrs):return '<path d="'+d+'" fill="'+fill+'" '+ ' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())+'/>'
def ellipse(x,y,rx,ry,fill,**attrs):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" '+ ' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())+'/>'
def rect(x,y,w,h,r,fill):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"/>'
def group(name,s):return f'<g id="{name}">{s}</g>'
def star(x=64,y=62,s=1,fill=GOLD):return f'<g transform="translate({x} {y}) scale({s})">'+path('M0-29 9-10 30-7 15 8 19 29 0 19-19 29-15 8-30-7-9-10Z',fill)+'</g>'
def leaf(x,y,angle=0,scale=1,fill=GREEN):return f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})">'+path('M0 0C-22-3-30-19-27-30C-7-29 3-15 0 0Z',fill)+path('M-3-4-18-21',stroke=LEAF,stroke_width=2.6)+'</g>'
def shine(d):return path(d,stroke=CREAM,stroke_width=4.5)
def egg(x=64,y=64,s=1):return f'<g transform="translate({x} {y}) scale({s})">'+path('M0-34C-12-34-28-9-27 9C-27 35 28 35 28 9C29-9 13-34 0-34Z',CREAM)+shine('M-10-17Q-17-9-17 0')+'</g>'
def basket(content=''):
 return group('contents',content)+group('basket',path('M27 61Q26 20 64 20Q102 20 101 61',stroke=WOOD,stroke_width=9)+path('M17 59 27 101Q64 116 101 101L111 59Z',WOOD)+rect(14,56,100,13,6,GOLD)+path('M38 73 41 100M64 75V104M90 73 87 100M27 86Q64 95 101 86',stroke='#B58E65',stroke_width=2.5))
def sack(color=GOLD,emblem='',band=GREEN):
 return group('bag',path('M44 28 35 14Q48 9 63 16Q78 9 93 16L82 31Q108 58 106 91Q103 111 66 111Q26 112 22 92Q20 62 44 28Z',color)+path('M41 30Q63 38 85 30',stroke=STROKE,stroke_width=6)+path('M80 30 95 44',stroke=WOOD,stroke_width=4)+shine('M35 71Q32 82 36 92'))+group('patch',ellipse(65,73,24,22,CREAM)+f'<g transform="translate(65 73) scale(.65)">{emblem}</g>')
def berry(cx,cy,color):return ellipse(cx,cy,13,13,color)+ellipse(cx-4,cy-4,3,2,CREAM,stroke='none')
def milk_can():return group('pail',path('M37 43V30Q37 13 64 13Q91 13 91 30V43',stroke=WOOD,stroke_width=6)+path('M31 43H97L91 104Q64 116 37 104Z',BLUE)+ellipse(64,43,33,9,CREAM)+path('M42 57 47 97',stroke='#D7E8DD',stroke_width=5)+path('M34 83Q64 92 94 83',stroke='#87ABA5',stroke_width=2.5))
def shears():return group('blades',path('M55 72 31 18Q25 14 26 22L61 87 101 23Q105 15 98 20Z',BLUE))+group('handles',ellipse(37,93,17,20,PEACH)+ellipse(89,93,17,20,GOLD)+ellipse(37,93,8,11,CREAM)+ellipse(89,93,8,11,CREAM)+ellipse(64,74,6,6,WOOD))
def sickle():return group('blade',path('M42 42Q52 7 94 15Q116 20 115 44Q95 23 74 33L51 55Z',BLUE)+shine('M64 24Q86 15 102 27'))+group('handle',path('M48 42 20 105Q18 112 26 115Q32 117 35 110L62 48Z',WOOD)+path('M31 90 39 94',stroke='#BF8E61',stroke_width=3)+ellipse(52,46,6,6,GOLD))

items={}
names={}
def item(key,name,s):items[key]=s;names[key]=name
item('wheat','小麦',group('stalks',path('M33 111 78 24M47 110 96 41',stroke=WOOD,stroke_width=4))+group('grain',''.join(f'<g transform="translate({x} {y}) rotate(28)">'+ellipse(0,0,8,14,GOLD)+'</g>' for x,y in [(43,81),(64,83),(53,60),(75,62),(64,40),(85,42),(77,21),(90,57),(82,76)]))+path('M34 98Q45 102 56 99',stroke=PEACH,stroke_width=6))
item('corn','玉米',group('cob',path('M53 20Q70 7 82 24Q97 51 79 91L46 92Q33 48 53 20Z',GOLD)+''.join(ellipse(x,y,4,5,'#F6DE94',stroke='#CCA45F',stroke_width=1.2) for x,y in [(57,30),(70,30),(50,43),(64,43),(77,43),(49,56),(62,56),(76,56),(49,69),(62,69),(75,69)]))+group('husk',path('M18 48Q41 52 62 89Q67 59 108 48Q98 93 65 114Q31 97 18 48Z',GREEN)+path('M31 66 65 110 95 67',stroke=LEAF,stroke_width=3)))
item('soybean','大豆',path('M17 88Q23 48 51 24Q69 9 92 21Q114 35 96 68Q75 101 42 108Q20 112 17 88Z',GREEN)+path('M31 93Q55 75 87 34',stroke=LEAF,stroke_width=3)+''.join(ellipse(x,y,12,13,'#D7DEA0') for x,y in [(40,85),(58,64),(77,41)])+leaf(93,24,80,.7))
item('sugarcane','甘蔗',group('canes',''.join(f'<g transform="rotate({a} 64 65)">'+rect(x,22,17,87,7,c)+path(f'M{x} 44h17M{x} 67h17M{x} 90h17',stroke=LEAF,stroke_width=3)+'</g>' for x,a,c in [(47,-19,GREEN),(69,13,'#D7D99C')]))+group('leaves',leaf(58,30,-15,.95)+leaf(76,35,85,.75)))
item('carrot','胡萝卜',group('leaves',leaf(80,35,-15,.9)+leaf(84,35,80,.85)+path('M80 34 91 12',stroke=LEAF,stroke_width=5))+group('root',path('M74 29Q96 27 102 47Q107 68 28 112Q20 117 23 107Q38 49 56 35Q65 29 74 29Z',PEACH)+path('M52 51 65 58M40 73 52 78M77 69 87 72',stroke='#C7865C',stroke_width=3)+shine('M66 39 56 47')))
item('indigo','靛蓝',group('stem',path('M62 112 61 25',stroke=LEAF,stroke_width=4))+group('leaves',leaf(62,93,-35,.9,'#A4BDA2')+leaf(62,78,80,1,'#A4BDA2')+leaf(60,59,-20,.9,'#B6C5BD')+leaf(62,42,80,.8,'#A4BDA2'))+group('flowers',''.join(ellipse(x,y,6,7,'#A6A9CD') for x,y in [(54,21),(65,16),(72,27),(56,33)])))
item('pumpkin','南瓜',group('stem',path('M59 31Q57 16 69 14L77 20 71 37Z',LEAF)+leaf(67,35,70,.7))+group('fruit',ellipse(64,74,47,36,PEACH)+ellipse(48,74,22,36,'#EFB785')+ellipse(78,74,22,36,'#EFB785')+ellipse(63,74,17,37,'#F4C58F')+shine('M54 51Q48 60 49 72')))
item('cotton','棉花',group('stem',path('M58 114 63 75',stroke=WOOD,stroke_width=5)+leaf(59,105,-30,.7)+leaf(63,93,80,.6))+group('cotton',path('M30 73C7 65 15 40 34 39C30 14 57 7 70 27C90 11 116 29 106 49C127 66 109 92 91 87Q63 113 39 87Z',CREAM)+path('M34 72Q42 91 61 80M79 37Q99 38 97 58',stroke='#D5BE98',stroke_width=3)+path('M39 87Q60 78 61 91Q72 77 90 87L64 103Z',GREEN)))
item('chili_pepper','辣椒',group('stem',path('M79 32Q79 14 93 15',stroke=LEAF,stroke_width=6)+path('M68 30 82 24 94 39 81 47Z',GREEN))+group('pepper',path('M70 32Q98 32 94 58Q87 91 34 109Q12 114 18 106Q54 86 53 52Q52 39 70 32Z',RED)+shine('M70 47Q75 56 65 74')))
item('black_bean','黑豆',group('beans',path('M24 27Q45 17 53 35Q60 47 49 57Q29 70 19 56Q10 40 24 27Z','#9F8C92')+path('M75 23Q99 17 108 38Q111 59 92 67Q69 72 67 51Q64 32 75 23Z','#8D7B83')+path('M40 72Q64 57 82 76Q94 97 76 110Q53 124 36 102Q26 85 40 72Z','#AB979C')+path('M30 36Q23 43 31 51M84 33Q76 47 88 53M49 82Q42 92 57 100',stroke='#D5C8C2',stroke_width=4)))
item('tomato','番茄',group('fruit',ellipse(64,76,45,36,RED)+shine('M38 60Q31 68 32 78'))+group('calyx',path('M65 45 44 28 47 48 24 45 42 60 61 56 80 65 77 49 99 43 76 39 70 23Z',GREEN)+path('M64 45 66 18',stroke=LEAF,stroke_width=5)))
item('apple','苹果',group('stem',path('M64 36Q60 20 67 13',stroke=WOOD,stroke_width=6)+leaf(72,35,95,.8))+group('fruit',path('M64 43Q30 23 19 57Q9 86 38 109Q51 119 64 107Q80 120 94 106Q124 78 105 49Q90 29 64 43Z',RED)+shine('M35 56Q26 65 30 76')))
rasp=''.join(berry(x,y,RED) for x,y in [(64,43),(48,52),(80,52),(37,68),(56,69),(75,69),(92,69),(48,87),(68,88),(82,85),(63,102)])
item('raspberry','覆盆子',group('berries',rasp)+group('leaves',path('M43 40 45 24 61 31 73 18 78 35 94 33 81 47 64 39 49 48Z',GREEN)))
item('cherry','樱桃',group('stems',path('M40 80Q41 34 71 18M88 76Q84 38 71 18',stroke=LEAF,stroke_width=4)+leaf(73,24,100,.9))+group('fruit',ellipse(39,89,24,24,RED)+ellipse(91,82,23,24,'#D3857E')+shine('M30 77 26 84M82 71 78 78')))
item('blackberry','黑莓',group('berries',''.join(berry(x,y,'#9A8CA2') for x,y in [(64,37),(48,48),(80,48),(40,65),(58,65),(78,65),(89,65),(49,84),(69,84),(81,82),(64,102)]))+group('leaves',leaf(64,34,-20,.7)+leaf(67,33,100,.65)))
item('blueberries','蓝莓',group('berries',''.join(ellipse(x,y,21,21,c)+path(f'M{x-8} {y-7}l7 3 7-6-1 8 7 3-9 2-4 6-2-8Z','#8893B3',stroke_width=1.5) for x,y,c in [(43,82,'#B3BBD2'),(83,83,'#A4B1CE'),(63,47,'#BDC6D8')]))+group('leaf',leaf(77,35,100,.8)))
item('egg','鸡蛋',group('egg',egg(64,67,1.25)))
item('milk','牛奶',group('bottle',path('M48 27V41Q36 47 36 61V105Q64 116 92 105V61Q92 47 80 41V27Z',CREAM)+rect(45,15,38,16,6,BLUE)+path('M37 61Q62 70 91 61V88Q64 98 37 88Z','#C8DCD4')+ellipse(64,78,12,9,CREAM)+shine('M46 49 45 57')))
item('truffle_slice','松露片',group('slices',ellipse(55,62,32,38,'#C8B2A2')+ellipse(74,83,33,28,'#DFCCB5')+path('M54 34 43 47 57 58 44 72 56 89M69 48 62 58 73 70M53 81 66 73 79 83 92 78M61 94 71 87 83 97',stroke='#A98C77',stroke_width=3)))
item('wool','羊毛',group('wool',path('M26 92C6 80 13 55 32 55C17 31 45 13 62 27C79 9 105 23 101 46C126 48 127 81 107 89C101 116 70 119 59 106C43 119 21 110 26 92Z',CREAM)+path('M32 55Q48 46 54 61M60 37Q72 28 80 42M72 86Q95 95 100 74M33 88Q38 101 54 93',stroke='#D4BE98',stroke_width=3)))
item('herb_bundle','香草束',group('stems',path('M51 111 39 42M57 112 66 25M64 112 91 41',stroke=LEAF,stroke_width=4))+group('leaves',leaf(44,64,-15,.7)+leaf(45,76,90,.7)+leaf(61,49,45,.7)+leaf(60,77,100,.7)+leaf(76,74,-15,.8)+leaf(84,58,105,.7))+group('tie',path('M46 96Q60 102 70 96',stroke=PEACH,stroke_width=7)+path('M61 100 70 111M61 100 48 113',stroke=PEACH,stroke_width=4)))
emblems={
 'chicken':ellipse(0,0,14,13,GOLD)+path('M11-3 22 2 11 7Z',PEACH)+ellipse(4,-4,2,2,STROKE,stroke='none')+path('M-5-12-3-20 3-14 7-19 10-10Z',RED),
 'cow':path('M-13-8-22-15-19-2M13-8 22-15 19-2',CREAM)+rect(-17,-15,34,31,12,CREAM)+ellipse(0,9,17,10,PEACH)+ellipse(-7,-4,2,2,STROKE,stroke='none')+ellipse(7,-4,2,2,STROKE,stroke='none')+path('M-13-14-14-24-5-17M13-14 14-24 5-17',GOLD),
 'pig':ellipse(0,1,20,18,'#F6CCB7')+path('M-15-11-20-24-5-16M15-11 20-24 5-16Z',PEACH)+ellipse(0,7,12,8,PEACH)+ellipse(-4,7,1,2,STROKE)+ellipse(4,7,1,2,STROKE),
 'sheep':path('M-20 2C-26-11-16-21-7-17C-2-28 14-23 14-15C29-17 29 1 21 6C23 23 0 27-6 18C-23 23-29 9-20 2Z',CREAM)+ellipse(0,2,12,13,'#EFD8B5')+ellipse(-5,0,1.5,1.5,STROKE,stroke='none')+ellipse(5,0,1.5,1.5,STROKE,stroke='none'),
 'lamb':path('M-21 1Q-28-13-13-17Q-7-29 3-19Q17-26 22-12Q34 1 20 9Q14 24-2 18Q-18 25-21 1Z',CREAM)+ellipse(0,2,13,14,'#F6DEC2')+path('M-8-10Q-13-20-3-20Q5-20 1-13',stroke='#D2AE87',stroke_width=3)+ellipse(-5,2,1.5,1.5,STROKE,stroke='none')+ellipse(5,2,1.5,1.5,STROKE,stroke='none')}
for sp,name,color in [('chicken','鸡饲料',GOLD),('cow','牛饲料','#C7D8B0'),('pig','猪饲料','#F0C3AB'),('sheep','绵羊饲料','#DBCCA8'),('lamb','羊羔饲料','#E5DCC8')]:item(sp+'_feed',name,sack(color,emblems[sp]))

tools={'milk-pail':('奶桶',milk_can()),'shears':('剪毛剪',shears()),'egg-basket':('收蛋篮',basket(egg(45,48,.55)+egg(78,46,.65))), 'fruit-basket':('果篮',basket(ellipse(42,48,16,15,RED)+ellipse(77,43,18,18,GOLD)+leaf(79,28,80,.5))), 'truffle-basket':('松露篮',basket(ellipse(42,47,17,16,'#B5A092')+ellipse(74,47,20,17,'#C7B5A1'))),'herb-basket':('香草篮',basket(leaf(48,54,5,.9)+leaf(62,55,65,1)+leaf(83,50,90,.9)))}

ui={}
def symbol(key,name,s):ui[key]=(name,s)
symbol('sow','播种',sack('#DAD3A2',path('M-2 17V-8',stroke=LEAF,stroke_width=4)+leaf(-1,2,0,.5)+leaf(0,-5,95,.5)))
symbol('harvest','收获',sickle())
symbol('feed','喂养',sack(GOLD,emblems['chicken']))
symbol('build','建造',group('hammer',path('M40 103 80 37 92 47 53 113Z',WOOD)+path('M55 22Q77 10 93 26L112 37 100 57 80 43 66 53 49 41Z',BLUE))+ellipse(47,99,3,3,CREAM,stroke='none'))
symbol('layout','布置',group('plots',''.join(path(f'M{x} {y}l22-11 22 11-22 12Z',c) for x,y,c in [(16,42,GREEN),(64,42,GOLD),(16,70,WOOD),(64,70,PEACH)]))+path('M19 102H109M21 95v14M106 95v14',stroke=STROKE,stroke_width=3))
symbol('rotate','旋转',path('M31 42Q42 17 73 23Q105 28 104 62Q101 96 66 102Q36 104 24 81',stroke=LEAF,stroke_width=9)+path('M17 24 17 49 42 47',GREEN)+path('M44 67 64 56 84 67 64 79Z',WOOD))
symbol('store_decor','收纳',group('box',path('M19 51 64 34 109 51 100 104 64 116 27 104Z',WOOD)+path('M64 64V116M19 51 64 64 109 51',stroke=STROKE,stroke_width=3)+path('M64 34 19 51 10 37 54 22 64 34 76 22 118 37 109 51',GOLD))+leaf(65,56,40,.8))
symbol('redo','重做',path('M99 48Q85 21 55 30Q18 43 31 80Q40 100 64 100',stroke=LEAF,stroke_width=10)+path('M83 48 107 51 106 25',GREEN))
symbol('confirm','确认',ellipse(64,64,44,44,'#D4DDB2')+path('M37 64 56 82 91 43',stroke=LEAF,stroke_width=9))
symbol('cancel','取消',ellipse(64,64,44,44,'#F2D0B7')+path('M46 46 82 82M82 46 46 82',stroke='#B77E66',stroke_width=8))
symbol('home','首页',group('cottage',rect(29,48,70,62,7,CREAM)+path('M17 52 60 14Q64 10 69 14L112 52 102 63 64 29 26 63Z',PEACH)+rect(54,74,23,36,5,WOOD)+rect(36,56,17,19,4,BLUE)+path('M45 57V74M36 66H53',stroke=CREAM,stroke_width=2.5)))
symbol('inventory','仓库',group('barn',rect(23,45,82,66,6,CREAM)+path('M15 49 62 15 113 49 106 61 64 34 22 61Z',PEACH)+rect(46,65,37,46,4,WOOD)+path('M47 67 81 109M81 67 47 109M64 65V111',stroke=CREAM,stroke_width=3)+rect(55,36,18,17,4,BLUE)))
symbol('shop','商店',rect(24,48,80,62,7,CREAM)+group('awning','<defs><clipPath id="awning-clip"><path d="M24 19H104L117 51H11Z"/></clipPath></defs>'+path('M24 19H104L117 51H11Z',GREEN)+'<g clip-path="url(#awning-clip)">'+''.join(path(f'M{x} 20h15l{(x-64)//8} 31h-20Z',CREAM,stroke_width=0) for x in [36,67,94])+'</g>'+path('M24 19H104L117 51H11Z')+path('M11 51Q13 68 29 57Q44 69 59 57Q74 69 89 57Q105 69 117 51',GREEN))+rect(36,75,24,35,4,WOOD)+rect(70,74,22,20,4,BLUE))
symbol('orders','订单',group('clipboard',rect(26,19,76,96,7,WOOD)+rect(34,27,60,78,4,CREAM)+rect(48,12,34,20,6,GOLD)+path('M46 53h35M46 69h24M46 85h18',stroke='#C3B092',stroke_width=4))+leaf(98,110,40,.7))
symbol('tasks','任务',rect(26,18,77,96,8,CREAM)+rect(45,11,36,18,6,WOOD)+path('M39 46l5 5 9-12M39 72l5 5 9-12M62 45h27M62 71h27M40 95h49',stroke=LEAF,stroke_width=4))
symbol('achievements','成就',path('M41 14H63L75 51 52 61Z',PEACH)+path('M65 14H88L77 61 55 51Z',GREEN)+ellipse(64,79,34,34,GOLD)+star(64,79,.6,CREAM))
symbol('farm_branch','牧场故事',group('book',path('M64 29Q39 15 16 29V105Q40 92 64 108Q91 94 112 105V29Q88 16 64 29Z',CREAM)+path('M64 29V108',stroke=WOOD,stroke_width=4)+path('M27 43Q40 38 53 43M27 55Q40 50 53 55',stroke='#C5B796',stroke_width=3))+leaf(90,86,25,.8))
symbol('clock','计时',ellipse(64,69,43,43,CREAM)+ellipse(64,69,34,34,'#F1E4C5')+path('M64 44V69L84 80',stroke=STROKE,stroke_width=5)+rect(51,12,26,12,5,WOOD)+path('M33 30 26 23M97 30 104 23',stroke=WOOD,stroke_width=7))
symbol('lock','锁定',path('M38 52V36Q38 10 64 10Q90 10 90 36V52',stroke=WOOD,stroke_width=9)+rect(25,49,78,62,12,GOLD)+ellipse(64,73,8,8,STROKE,stroke='none')+path('M60 76H68L70 92H58Z',STROKE,stroke='none'))
symbol('warning','提醒',path('M55 18Q64 4 74 20L117 96Q123 110 105 111H21Q5 111 13 96Z','#F2D693')+path('M64 40V73',stroke=STROKE,stroke_width=8)+ellipse(64,92,4,4,STROKE,stroke='none'))
symbol('save','保存',rect(22,17,84,96,8,WOOD)+rect(35,18,58,34,3,CREAM)+rect(38,70,52,43,5,CREAM)+rect(73,25,11,20,2,BLUE)+leaf(65,99,35,.6))
for key,name,direction in [('import','导入',1),('export','导出',-1)]:
 arrow=path('M64 22V72M46 54 64 73 82 54',stroke=LEAF,stroke_width=8) if direction==1 else path('M64 74V24M46 42 64 23 82 42',stroke=LEAF,stroke_width=8)
 symbol(key,name,path('M22 73V105Q64 121 106 105V73',fill=WOOD)+path('M22 73 45 65M106 73 83 65',stroke=STROKE,stroke_width=4)+arrow)
symbol('recover','恢复',path('M29 49Q33 18 67 19Q102 21 108 53',stroke=LEAF,stroke_width=8)+path('M13 30 25 54 47 41',GREEN)+group('seedling',path('M63 107V58',stroke=LEAF,stroke_width=5)+leaf(63,85,-10,.7)+leaf(64,72,95,.7))+path('M28 108Q64 97 100 108',stroke=WOOD,stroke_width=7))
for key,name,plus in [('zoom_in','放大',True),('zoom_out','缩小',False)]:symbol(key,name,path('M81 84 110 113',stroke=WOOD,stroke_width=13)+ellipse(54,53,35,35,'#E0EBDE')+path('M37 53H71'+('M54 36V70' if plus else ''),stroke=LEAF,stroke_width=5)+shine('M30 43Q34 30 44 29'))
symbol('seed_protect','留种保护',path('M64 15 105 31V66Q103 96 64 116Q24 96 23 66V31Z','#D9E3BC')+path('M64 92V48',stroke=LEAF,stroke_width=4)+leaf(64,69,-10,.7)+leaf(64,54,100,.65))
symbol('help_gardener','照料',group('can',path('M24 51Q12 34 28 28Q45 26 47 51',stroke=WOOD,stroke_width=7)+path('M29 49H79L86 100Q56 116 24 98Z',GREEN)+path('M77 65 103 42 115 52 87 84Z',GREEN)+ellipse(111,47,7,13,BLUE)+path('M45 45V32H67V45',WOOD))+path('M114 68 117 76M104 70 106 79',stroke=BLUE,stroke_width=3))
symbol('full','已满',basket(egg(39,41,.5)+ellipse(68,37,18,18,RED)+leaf(91,44,90,.8))+path('M21 18 17 11M104 22 111 15M64 11V5',stroke=WOOD,stroke_width=3))
symbol('info','说明',ellipse(64,64,44,44,'#D7E3CF')+ellipse(64,41,4,4,STROKE,stroke='none')+path('M57 59H64V89M53 90H75',stroke=STROKE,stroke_width=6))
symbol('undo','撤销',path('M29 48Q43 21 73 30Q110 43 97 80Q88 100 64 100',stroke=LEAF,stroke_width=10)+path('M45 48 21 51 22 25',GREEN))
symbol('shuffle','洗牌',path('M17 36H32Q43 36 50 49L78 88Q84 95 96 95H111M17 95H32Q42 95 51 80L78 43Q85 36 97 36H111',stroke=LEAF,stroke_width=7)+path('M99 24 112 36 99 48M99 83 112 95 99 107',stroke=WOOD,stroke_width=6))
symbol('stash','临时收纳',basket(path('M44 47V20H83V49Z',CREAM)+leaf(65,42,65,.55)))
symbol('sound','声音',path('M20 49H39L66 25V103L39 81H20Z',GOLD)+path('M81 46Q101 64 81 83M94 31Q126 64 94 98',stroke=LEAF,stroke_width=5))
symbol('muted','静音',path('M17 49H36L63 25V103L36 81H17Z','#D9CFB6')+path('M82 47 111 81M111 47 82 81',stroke='#BD8970',stroke_width=5))

def write_svg(pathname,content,label):
    pathname.parent.mkdir(parents=True,exist_ok=True)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="{label}"><title>{label}</title><g id="artwork" transform="translate(4 4) scale(.94)" stroke="{STROKE}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">{content}</g></svg>'
    pathname.write_text(svg+'\n')

def main():
    entries=[]
    for category,objects in [('items',{k:(names[k],v) for k,v in items.items()}),('ui',ui),('tools',tools)]:
        for key,(label,content) in objects.items():
            file=f'{category}/{key}.svg';write_svg(ROOT/file,content,label)
            original=f'sheep-match/assets/farm/items/{key}.svg' if category=='items' else f'sheep-match/assets/farm/ui/{key}.svg' if category=='ui' else None
            entries.append({'id':key,'name':label,'category':category,'svg':file,'png':f'png/{category}/{key}.png','canvas':[128,128],'pngCanvas':[256,256],'anchor':[64,64],'safeContentRect':[4,4,120,120],'recommendedCssSize':[32,64],'originalPath':original,'originalRetained':True,'source':'source/build-icons.py','sha256':hashlib.sha256((ROOT/file).read_bytes()).hexdigest()})
    assert len(items)==26 and len(ui)==35 and len(tools)==6,(len(items),len(ui),len(tools))
    manifest={'version':1,'baseCommit':'0a8363f','style':'warm rounded farm sticker illustration; editable SVG, transparent PNG derivatives','counts':{'items':26,'ui':35,'tools':6,'total':67},'icons':entries,'aliases':{'sickle':'ui/harvest.svg','seed-pouch':'ui/sow.svg','feed-bag':'ui/feed.svg','chicken_feed':'items/chicken_feed.svg'},'integration':'Standalone art pack; dynamic quantities, prices and text remain in game code.'}
    (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print('Created 26 item + 35 UI + 6 dedicated tool SVGs. Original files untouched.')

if __name__=='__main__':main()
