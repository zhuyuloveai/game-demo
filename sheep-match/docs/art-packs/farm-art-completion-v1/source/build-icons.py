"""Extend the approved warm-outline icon family; editable paths, no game changes."""
from pathlib import Path
import json, hashlib, importlib.util, math
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parent/'farm-priority-icons-v1/source/build-icons.py'
spec=importlib.util.spec_from_file_location('approved',BASE);old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
from html import escape
P=old.path; E=old.ellipse; R=old.rect; G=old.group
C=old.CREAM; W=old.WOOD; Y=old.GOLD; O=old.PEACH; V=old.GREEN; L=old.LEAF; B=old.BLUE; S=old.STROKE; RED=old.RED
INK='#C19B72'; PURPLE='#ACA0BA'; PALE='#F3DFC0'
def T(s,x=0,y=0,z=1,angle=0):return f'<g transform="translate({x} {y}) rotate({angle}) scale({z})">{s}</g>'
def line(d,color=S,w=3):return P(d,stroke=color,stroke_width=w)
def motif(key,x=64,y=64,z=.25):return T(old.items[key],x-64*z,y-64*z,z)
def seeds(points,color=Y):return ''.join(E(x,y,3,2,color,stroke='none') for x,y in points)
def plate():return E(64,101,49,10,PALE)+E(64,99,39,6,C,stroke_width=2)
def cream_swirl(x=64,y=49,s=1):return T(P('M-28 16Q-36 5-21 1Q-27-9-11-13Q-7-20 0-30Q18-23 12-15Q35-12 25-1Q41 8 28 17Z',C)+line('M-21 1Q-3 7 20-2','#DCC8A6',2.5)+line('M-11-13Q0-8 12-15','#DCC8A6',2.5),x,y,s)
def bread(corn=False):
 return plate()+G('loaf',P('M22 63Q18 36 45 29Q69 16 94 39Q110 47 106 70L100 95Q63 111 25 93Z',Y if corn else '#DCA66E')+P('M25 65Q61 80 105 62L100 95Q63 110 25 93Z', '#F1CD8B' if corn else '#EDBE85')+line('M37 40 47 54M57 32 69 49M80 34 89 48',C,5)+ (seeds([(37,80),(48,88),(66,83),(88,83),(78,96)],'#D9AC54') if corn else ''))
def muffin(color):
 return G('paper',P('M28 62H100L90 108Q64 117 38 108Z',PALE)+line('M42 76 47 105M62 78V109M82 77 79 107',INK,2.4))+G('top',P('M24 65C11 52 22 33 37 33C40 13 65 12 74 27C94 17 112 33 105 47C124 65 101 80 91 72Q76 84 64 73Q45 87 33 73Z','#EDBF86')+''.join(E(x,y,5,5,color) for x,y in [(40,48),(62,36),(85,46),(66,60)]))
def pie(kind):
 color={'carrot':O,'pumpkin':Y,'bacon':RED,'apple':'#D9CA8B'}[kind]
 body=plate()+P('M21 61 30 96Q65 112 100 94L108 60Z','#DCA66E')+E(64,60,45,23,color)
 if kind=='bacon':body+=line('M35 59Q47 40 60 59Q74 78 94 57',C,6)+line('M33 66Q51 52 64 68Q77 79 94 64',C,4)
 else:body+=line('M27 53 91 74M35 43 103 64M25 62 75 79M40 76 87 43M27 67 67 39M62 81 105 53', '#F8DCA5',5)
 body+=E(64,60,45,23,'none',stroke='#D09D63',stroke_width=5)
 return body+motif({'carrot':'carrot','pumpkin':'pumpkin','apple':'apple','bacon':'tomato'}[kind],99,91,.33)
def cake(kind):
 color={'carrot':O,'cream':C,'red_berry':RED,'cheese':Y}[kind]
 body=plate()+P('M25 44 89 30 104 53V96L42 109 25 92Z',Y)+P('M42 62 104 49V96L42 109Z', '#F4D9A9')+P('M42 78 104 65V78L42 91Z',color)+P('M25 44 88 29 106 49 43 65Z',C)+P('M43 65 106 49V61Q98 70 92 64Q82 77 74 69Q62 85 55 75Q47 85 43 78Z',C)
 if kind=='carrot':body+=motif('carrot',68,43,.34)
 elif kind=='cream':body+=cream_swirl(68,38,.55)
 elif kind=='red_berry':body+=motif('raspberry',70,38,.36)
 else:body+=motif('cherry',78,39,.31)
 return body
icons=[]
def add(key,name,content,category='processed',original=None,**extra):
 if original is None:original=f'sheep-match/assets/farm/items/{key}.svg'
 file=f'icons/{category}/{key}.svg'
 out=ROOT/file;out.parent.mkdir(parents=True,exist_ok=True)
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="{escape(name)}"><title>{escape(name)}</title><g id="artwork" transform="translate(4 4) scale(.94)" stroke="{S}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">{content}</g></svg>\n'
 out.write_text(svg)
 icons.append(dict(id=key,name=name,category=category,svg=file,png=f'png/{category}/{key}.png',canvas=[128,128],pngCanvas=[256,256],anchor=[64,112] if category=='achievements' else [64,64],uiAnchor=[64,64],safeContentRect=[4,4,120,120],recommendedCssSize=[32,64],originalPath=original,source='source/build-icons.py',sha256=hashlib.sha256(svg.encode()).hexdigest(),**extra))
add('bread','面包',bread())
add('corn_bread','玉米面包',bread(True)+motif('corn',96,87,.36))
add('cookie','曲奇',E(50,73,32,32,'#DDB378')+E(77,57,35,35,'#E8C58B')+seeds([(65,39),(87,43),(57,58),(80,66),(98,58),(70,80),(42,77),(45,92)],'#A88162'))
add('raspberry_muffin','覆盆子松饼',muffin(RED))
add('blackberry_muffin','黑莓松饼',muffin(PURPLE))
add('cream','奶油',P('M24 70Q64 55 104 70L95 104Q64 117 33 104Z',B)+E(64,70,40,10,C)+cream_swirl(64,50,1))
add('butter','黄油',plate()+P('M31 61 76 43 99 57 99 89 52 105 31 89Z',Y)+P('M31 61 76 43 99 57 52 76Z','#F6DB91')+line('M52 76V105','#CDA65C',2.5))
add('cheese','奶酪',P('M24 69 96 32 108 86 44 109 24 95Z',Y)+P('M24 69 96 32Q88 58 108 64L108 86 44 109V80Z','#F5D893')+P('M24 69 44 80 108 64',fill='none')+E(61,86,5,6,'#D5B25F')+E(89,78,5,5,'#D5B25F')+E(74,58,4,3,'#D5B25F'))
def sugar(dark=False):
 col='#CBA27B' if dark else C
 return P('M21 56 90 42 109 71 91 105 29 110 15 83Z',PALE)+''.join(T(P('M0 0 19-9 17 16-20 24-37 15-37-9-19-17Z',col)+line('M-37-9-18 0 0-9M-18 0V23',INK,2),x,y,.65) for x,y in [(49,72),(80,68),(62,48),(95,91),(59,96)])
add('brown_sugar','红糖',sugar(True))
add('white_sugar','白糖',sugar())
add('syrup','糖浆',P('M45 30V43Q30 48 30 62V100Q65 118 99 100V62Q99 48 83 43V30Z',Y)+R(41,15,46,17,6,W)+R(38,62,53,29,7,C)+P('M65 66Q43 85 65 87Q87 85 65 66Z',O)+line('M40 48 39 56',C,4))
def popcorn(extra):
 grains=''.join(T(P('M-9 7Q-19 0-9-7Q-11-19 2-14Q15-20 15-6Q29 2 15 11Q4 21-2 12Z',C if extra!='buttered' else '#F5D992'),x,y,.65) for x,y in [(29,44),(48,32),(70,28),(92,40),(57,51),(83,56)])
 return grains+P('M24 61H104L93 110H35Z',O if extra=='chili' else PALE)+P('M41 63 47 110H59L55 63M75 63 71 110H83L89 63Z',C,stroke='none')+E(64,83,17,16,Y)+(motif('chili_pepper',64,82,.26) if extra=='chili' else P('M56 77 73 79 69 89 54 85Z',C) if extra=='buttered' else old.star(64,83,.27,C))
add('popcorn','爆米花',popcorn('plain'));add('buttered_popcorn','黄油爆米花',popcorn('buttered'));add('chili_popcorn','辣味爆米花',popcorn('chili'))
add('pancake','煎饼',plate()+''.join(E(64,y,43,13,'#E3B47B') for y in [89,78,67])+E(64,62,43,15,'#F3D39A')+P('M39 52Q57 41 87 52L84 62Q89 80 78 78L74 65Q53 72 43 63Z','#CF9B66')+P('M53 46 72 40 84 48 65 56Z',Y))
add('bacon_and_eggs','培根煎蛋',plate()+P('M21 72Q15 47 40 48Q57 34 71 50Q94 56 84 78Q64 94 43 85Q23 91 21 72Z',C)+E(49,63,15,13,Y)+P('M72 81Q87 58 102 61L111 74Q94 76 84 98Z',RED)+line('M81 86Q94 68 106 68',C,4))
add('hamburger','汉堡',P('M21 83H107V95Q64 117 22 95Z',Y)+P('M22 75Q31 66 41 77L53 71 69 79 84 70 106 75 104 88H24Z',V)+R(19,68,90,12,6,'#A48469')+P('M24 64 57 86 78 67 104 63Z',Y)+P('M18 58Q19 20 64 20Q108 20 110 58Q68 72 18 58Z','#E8BD83')+seeds([(40,40),(58,31),(80,34),(65,48),(94,47)],C))
add('grilled_lamb_skewer','烤羊肉串',line('M23 113 100 17',W,7)+''.join(T(R(-16,-12,32,25,8,'#D6AA85')+line('M-9-6 8 5',INK,3),x,y,1,-38) for x,y in [(43,86),(63,61),(83,36)])+old.leaf(98,96,95,.6))
add('roasted_tomatoes','烤番茄',plate()+''.join(E(x,y,23,21,RED)+E(x,y-5,18,12,O)+line(f'M{x-10} {y-9}l19 9M{x-6} {y-16}l19 9','#BD7C64',2.7) for x,y in [(40,71),(83,76)])+old.leaf(66,49,60,.65))
for k,n in [('carrot','胡萝卜'),('pumpkin','南瓜'),('bacon','培根'),('apple','苹果')]:add(k+'_pie',n+'派',pie(k))
def knit(color,kind):
 if kind=='hat':return P('M28 78Q24 29 65 27Q103 31 102 80Z',color)+R(19,76,91,26,8,PALE)+E(65,19,13,12,C)+line('M42 46 43 72M63 40V72M83 46 82 72',C,3)
 body=P('M43 24 24 35 10 65 27 75 38 57 36 110H94L91 57 102 75 118 65 103 35 84 24Q65 42 43 24Z',color)+P('M43 24Q64 53 84 24L80 17Q64 32 48 17Z',PALE)+line('M38 96H92M41 102H89',PALE,4)
 if kind=='shirt':body+=line('M65 38V107',PALE,3)+R(72,49,14,16,3,PALE)+''.join(E(64,y,1.4,1.4,S,stroke='none') for y in [49,66,83])
 else:body+=line('M47 57l6 7 6-7 6 7 6-7 6 7 6-7M47 77l6 7 6-7 6 7 6-7 6 7 6-7',PALE,2.5)
 return body
add('sweater','毛衣',knit(O,'sweater'));add('blue_sweater','蓝毛衣',knit(B,'sweater'));add('blue_woolly_hat','蓝毛线帽',knit(B,'hat'));add('cotton_shirt','棉衬衫',knit('#DDE5CE','shirt'))
add('cotton_fabric','棉布',P('M28 37 85 22 110 44V96L48 112 26 92Z',C)+P('M28 37 48 54 110 44M48 54V112',fill='none')+P('M29 48 49 66 109 55V67L50 80 29 63Z',B,stroke='none')+line('M61 53V107M83 48V101', '#D5BA96',2)+E(85,30,25,11,C)+line('M75 28Q95 20 101 33',INK,2.5))
add('wooly_chaps','羊毛护腿裤',P('M35 18H93L99 106H74L65 62 55 106H29Z',W)+P('M34 34Q42 23 48 35Q58 27 60 39L50 108Q42 116 29 107Z',C)+P('M73 37Q80 27 87 35Q96 26 96 39L104 107Q92 119 80 109Z',C)+R(30,18,68,14,4,W)+R(56,19,19,13,3,Y)+line('M35 52 45 54M83 58 95 56',PALE,3))
add('violet_dress','紫罗兰连衣裙',P('M44 15 28 33 38 47 49 37 47 59 23 107Q64 122 105 107L81 59 80 37 90 47 101 33 84 15Q64 33 44 15Z',PURPLE)+P('M46 57H82V66H46Z',C)+P('M64 60 51 49 46 58 53 68 64 60 77 48 84 58 75 68Z',PALE)+line('M50 76 41 101M77 77 87 103',C,3))
for k,n in [('carrot','胡萝卜'),('cream','奶油'),('red_berry','红莓'),('cheese','奶酪')]:add(k+'_cake' if k!='cheese' else 'cheesecake',n+'蛋糕',cake(k))
def juice(kind,color):return P('M47 27V43Q33 50 33 62V104Q64 115 95 104V62Q95 50 81 43V27Z',C)+P('M34 58Q65 64 94 58V103Q64 114 34 103Z',color)+R(43,14,42,16,5,V)+R(38,70,52,28,6,C)+motif(kind,64,83,.29)+line('M43 48 41 57',C,4)
for k,n,c in [('carrot','胡萝卜汁',O),('apple','苹果汁',Y),('cherry','樱桃汁',RED)]:add(k+'_juice',n,juice(k,c))
add('vanilla_ice_cream','香草冰激凌',P('M34 65H97L69 115Q64 122 60 115Z',Y)+line('M43 72 78 104M57 70 87 91M87 72 52 103M75 71 44 91',INK,2)+cream_swirl(64,44,1.12))
# Materials use silhouette distinctions at inventory sizes.
add('bolt','螺栓',T(P('M-12-15H12V45L0 57-12 45Z',B)+line('M-10 4H10M-10 15H10M-10 26H10M-10 37H10', '#789F99',2.5)+P('M-24-34 0-46 24-34V-10L0 2-24-10Z','#CBDAD0')+E(0,-22,9,9,C),63,60,1,40),'materials')
add('duct_tape','胶带',E(62,75,42,30,B)+R(20,44,84,31,3,B)+E(62,43,42,28,'#D6DFCE')+E(62,43,21,13,C)+P('M96 57 113 75 105 103 78 109 78 88 96 79Z',B),'materials')
add('plank','木板',P('M18 41 89 16 111 38 42 66Z',W)+P('M18 41V85L42 111 111 85V38L42 66Z','#E4C193')+line('M42 66V111M54 76 101 58M54 92 91 79M29 56V82',INK,3),'materials')
add('nail','钉子',T(P('M-6-25H6V49L0 61-6 49Z',B)+E(0,-25,22,8,'#C9D8D1')+line('M-1-18V35',C,2.5),62,58,1,40),'materials')
add('screw','螺丝',T(P('M-9-22H9V43L0 57-9 43Z',B)+line('M-11-10 11-3M-11 3 11 10M-11 16 11 23M-11 29 11 36','#7B9F98',3)+E(0,-25,23,12,'#CFDCD2')+line('M-11-29 11-22',S,3),63,59,1,40),'materials')
add('wood_panel','木墙板',P('M22 25H106V105H22Z',PALE)+line('M43 27V103M65 27V103M85 27V103',INK,2)+R(17,35,94,15,4,W)+R(17,81,94,15,4,W)+''.join(E(x,y,2,2,S,stroke='none') for x in [30,98] for y in [42,88]),'materials')
add('land_deed','土地契约',P('M32 17H100Q108 18 108 28V100H38Q19 106 18 93V30Q18 17 32 17Z',C)+P('M19 84H89Q81 105 101 105H32Q14 101 19 84Z',PALE)+P('M38 53 63 39 87 53 63 67Z',V)+old.leaf(67,50,55,.55)+E(77,88,13,13,O)+P('M68 98 65 114 77 108 87 115 86 98Z',O),'materials')
add('mallet','木槌',T(R(-8,-2,16,62,6,W)+R(-37,-34,74,37,8,'#E9C696')+line('M-24-29V-3M24-29V-3',INK,3),62,57,1,35),'materials')
add('marker_stake','标记桩',P('M57 18H73V102L65 118 57 102Z',W)+P('M64 21Q83 10 108 26L98 48Q80 35 64 43Z',O)+line('M40 108 25 113M88 108 102 115',V,4),'materials')
add('axe','斧头',T(R(-7,-9,14,78,6,W)+P('M-33-29Q-16-16-5-23H15L33-34Q48-11 31 9L13 0H-3Q-20 7-34 1Z',B)+line('M31-26Q40-11 29 3',C,3),59,49,1,35),'materials')
add('saw','锯子',P('M23 49 95 21 113 58 44 98 40 88 32 88 32 79 24 79 25 69 17 67Z',B)+P('M14 53 38 42 54 82 30 97Q19 101 15 90L6 68Q2 57 14 53Z',W)+P('M18 62 28 57 39 80 28 86Z',C)+line('M53 57 95 38',C,3),'materials')
add('shovel','铁锹',T(P('M-6-28H6V35H-6Z',W)+P('M-25 22H25V44Q25 62 0 71Q-25 62-25 44Z',B)+P('M-21-52H21V-35Q20-20 0-19Q-20-20-21-35Z',W)+P('M-12-44H12V-36Q12-27 0-27Q-12-27-12-36Z',C)+line('M0 30V56',C,3),63,58,.95,33),'materials')
add('dynamite','炸药棒',T(R(-15,-31,30,85,10,O)+E(0,-30,15,7,'#F1C9AC')+R(-15,6,30,18,3,C)+line('M0-32Q-10-53 10-54Q22-55 24-65',W,4),61,62,.95,28),'materials')
add('tnt','成捆炸药',G('sticks',''.join(T(R(-12,-30,24,79,8,O)+E(0,-30,12,6,'#F5D4B9'),x,y,1,0) for x,y in [(40,62),(64,53),(88,62)]))+P('M28 61Q63 73 100 61V79Q64 91 28 79Z',W)+line('M65 22Q54 5 80 12Q95 17 104 8',W,4),'materials')
add('fertilizer','肥料',old.sack('#E0D4AA',P('M0 16V-9',stroke=L,stroke_width=4)+old.leaf(0,2,-10,.55)+old.leaf(0,-3,90,.55)),'materials')
def ticket(color,emblem):return P('M18 29H110V52Q92 60 110 69V99H18V69Q36 60 18 52Z',color)+line('M36 37V46M36 55V64M36 73V82M36 91V94',C,2.5)+T(emblem,73,63,.7)
add('coin','金币',E(64,67,43,43,Y)+E(64,65,32,32,'#F5D995')+old.leaf(65,82,40,.85),'currency')
add('construction_voucher','建造券',ticket('#D6DEBC',T(old.ui['build'][1],-64,-64,.95)),'currency')
add('material_choice_voucher','材料自选券',ticket(PALE,P('M-23-10 0-22 23-10 23 16 0 29-23 16Z',W)+P('M-23-10 0 1 23-10M0 1V29',fill='none')+old.star(0,-8,.28,C)),'currency')
add('xp','经验星',old.star(64,66,1.52,Y)+old.star(64,66,.9,C)+old.leaf(91,106,85,.6),'currency')
add('chicken_credit','小鸡兑换凭证',ticket('#F2D8A1',old.emblems['chicken']),'currency')
add('cow_credit','奶牛兑换凭证',ticket('#CDDCC8',old.emblems['cow']),'currency')
# Ten achievement identities; tier is also conveyed by outline and ribbon count.
truck=R(16,49,57,37,6,V)+P('M73 58H94L109 73V90H73Z',O)+R(80,63,14,13,3,C)+E(38,94,11,11,W)+E(88,94,11,11,W)
expand=P('M18 69 64 45 110 69 64 94Z',V)+line('M30 33 64 16 97 33M30 26V40M97 26V40',W,4)+old.leaf(64,68,40,.65)
subjects=[('田园收获',old.items['wheat']),('巧手加工',old.ui['build'][1]),('温柔饲养',old.items['chicken_feed']),('配送达人',truck),('集市好邻居',old.ui['shop'][1]),('仓储管家',old.ui['inventory'][1]),('开垦新地',expand),('工坊收藏',old.ui['home'][1]),('庭院设计',old.ui['layout'][1]),('牧场故事',old.ui['farm_branch'][1])]
for i,(label,emblem) in enumerate(subjects,1):
 for tier,color in [('bronze','#D9B491'),('silver','#C2D3CD'),('gold','#E8C779')]:
  ribbon=P('M39 77 29 114 47 106 61 116 66 82Z',O)+P('M62 84 72 116 86 105 103 112 90 76Z',V)
  if tier=='bronze':border=E(64,59,41,41,color)
  elif tier=='silver':border=P('M64 12 76 19 91 18 97 32 110 40 106 56 111 70 98 80 91 94 76 94 64 103 51 95 36 95 29 81 17 71 21 56 17 41 30 32 36 18 51 20Z',color)
  else:border=P('M64 13Q85 26 106 24V64Q102 91 64 106Q26 91 22 64V24Q43 26 64 13Z',color)+old.leaf(29,98,-30,.45)+old.leaf(99,98,100,.45)
  face=E(64,59,31,31,C,stroke_width=2)
  s=ribbon+border+face+T(emblem,36,30,.44)
  if tier=='silver':s+=old.star(64,100,.16,C)
  if tier=='gold':s+=''.join(old.star(x,100,.14,C) for x in [52,64,76])
  add(f'g{i:02}-{tier}',label+' · '+{'bronze':'铜','silver':'银','gold':'金'}[tier],s,'achievements',f'sheep-match/assets/farm/decor/badges/g{i:02}-{tier}.svg',family=f'g{i:02}',tier=tier)
add('branch_first_clear','首次通关',T(old.ui['farm_branch'][1],0,0,.94)+old.star(94,34,.6,Y),'branch','sheep-match/assets/farm/ui/branch_first_clear.svg')
add('branch_replay','重温故事',T(old.ui['farm_branch'][1],0,3,.86)+line('M77 21Q113 18 113 49Q113 66 99 73',L,6)+P('M99 58 98 76 114 72',V),'branch','sheep-match/assets/farm/ui/branch_replay.svg')
add('branch_locked','故事未开启',T(old.ui['farm_branch'][1],0,0,.9)+T(old.ui['lock'][1],59,56,.48),'branch','sheep-match/assets/farm/ui/branch_locked.svg')
add('branch_escrow','奖励暂存',P('M22 51H106V108H22Z',W)+R(16,42,96,21,5,PALE)+R(56,43,17,65,3,O)+P('M65 43Q29 43 31 22Q49 7 65 43Q79 7 96 23Q100 43 65 43Z',O)+T(old.ui['clock'][1],77,76,.32),'branch','sheep-match/assets/farm/ui/branch_escrow.svg')
counts={c:sum(x['category']==c for x in icons) for c in sorted(set(x['category'] for x in icons))}
assert counts==dict(achievements=30,branch=4,currency=6,materials=15,processed=38),counts
(ROOT/'icons-manifest.json').write_text(json.dumps(dict(version=1,baseCommit='de94fb3a5f71a4bda6cb92358aa0cd4571c1bdb6',styleSource='../farm-priority-icons-v1/',counts=counts,total=len(icons),icons=icons,integration='Art-only. Original files retained; quantities and labels remain dynamic.'),ensure_ascii=False,indent=2)+'\n')
print(counts,'total',len(icons))
