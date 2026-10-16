"""Field-level public-evidence decisions. Applied after the kitchen design is built.

P means a dated public observation, never a claim about the live game's private data.
This module owns rules/provenance only; it never edits asset bindings or artwork.
"""
from copy import deepcopy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OLD_VERSION = 'kitchen-reference-v1-draft'
VERSION = 'kitchen-feige-evidence-v2'
SOURCES = [
 ('S27','主棋盘实机图（7列9行）','https://www.woshipm.com/pd/5599736.html','2022-09-13','作者微信小游戏实机；原图逐格复核63格，不能证明2026所有渠道。'),
 ('S28','主棋盘元素CD文字记录','https://www.sohu.com/a/631566830_121631443','2023-01-17','大陆历史攻略；树1h/2、种子12、猫窝12、垃圾16min/2；购物车CD与后期资料冲突。'),
 ('S29','后期CD攻略（冲突对照）','https://www.9game.cn/news/9982998.html','2024-04-01','购物车L6=8h/L8=6h；扫地机L6容量10、L9=16min/L10=8min；无版本号，作为该子系统历史参照。'),
 ('S30','柜子与自动链CD记录','https://www.taptap.cn/moment/425678076534328182','2023-07-05','储物篮L1=6h；柜L8=32min/L11=4min容量6。树30min、垃圾6min与S28冲突；不采用其活动仙人掌。'),
 ('S31','有限物品次数对照','https://old.qqe2.com/news/23681.html','2023-11-21','猫窝12、手环7；NS4与S07的3冲突，沿用具体大陆墙壁路径S07的3。'),
 ('S32','原图库存表A','https://p6.itc.cn/images01/20230129/8bb44c7306f9489ba630c54719b2f1a8.png','2023-01-29','S16附件。人工核读末列库存；G/H/K可辨为周期/补量/容量；I列为估算回满时间，不能直接当周期。'),
 ('S33','原图库存表B','https://p9.itc.cn/images01/20230129/3df9068b9b44470bbf3a7e496e021db4.png','2023-01-29','S16附件；花盆、购物车G/H/K人工核读；树L6周期30min产1/容量2。分钟表含加速价换算，P历史估算。'),
 ('S34','原图库存表C','https://p7.itc.cn/images01/20230129/96b426a6819b45828bd7cf2a2446bd7b.png','2023-01-29','S16附件；工具箱/扫地机G周期/H补量/K容量可辨；工具箱L4的I列回满时间与G/H/K冲突。垃圾8min产1/容量2。'),
 ('S35','原图库存表D','https://p2.itc.cn/images01/20230129/10495ae5aaf14ac69bbc85d2e2fe90af.png','2023-01-29','S16附件；钥匙手环末列7，遗失物L5/6周期67/34min、容量4；存钱罐行的1/2/4天语义未证实，不误读为黑粉包开锁时间。'),
 ('S36','较新实机版本与截图入口','https://jingyan.baidu.com/article/36d6ed1fc12a6d5ace488351.html','2024-07-18','作者标iPhone14/iOS17/4.1.2；升级截图只作版本范围线索，不推出升级经验表。'),
]

# Values below are decisions about the kitchen adaptation, not a merged Feige edition.
# The batch model is deliberately D wherever the source only states a CD and capacity.
# Tuples: level -> (cycle minutes, units per cycle, total capacity).
# Manually read G/H/K, not the separate I column estimating time to refill all.
RATES = {
 'tools': ('S34',{4:(152,8,20),5:(80,12,24),6:(60,14,32),7:(31.67,20,32),8:(22,25,32),9:(15,28,32)}),
 'food': ('S32',{5:(237,8,12),6:(195.54,8,16),7:(200,16,16),8:(120,20,20),9:(50,24,24),10:(40,32,32)}),
 'herb': ('S33',{6:(273,4,10),7:(135,4,10),8:(69,4,10),9:(34,4,10),10:(17,4,10)}),
 'supply': ('S33',{4:(424.01,4,16),5:(265.99,5,16),6:(159.99,6,16),7:(93.98,7,21)}),
 'recycle': ('S34',{6:(46,5,10),7:(23,5,10),8:(11,5,10),9:(5.67,5,10),10:(2.83,5,10)}),
}
# D extension tiers keep the dated neighbors' throughput increasing.
EXTENSION_RATES = {
 'tools':{10:(10,28,32),11:(8,28,32),12:(6,28,32)},
 'food':{11:(30,32,32)},
 'herb':{4:(1092,4,10),5:(546,4,10)},
 'supply':{8:(60,8,24),9:(45,8,24),10:(30,8,24),11:(24,8,24),12:(18,8,24)},
 'recycle':{5:(92,5,10)},
}
FAMILY_MAP = {
 'food':'aerobic','tools':'tools','vegetable':'healthy_food','drink':'drinks',
 'linen':'gloves','preservation':'medicine','bakeware':'strength','seedbag':'seedbag',
 'emptybag':'emptybag','doll':'doll','herb':'plant','snail':'snail','pantry':'locker',
 'lost':'lost','comfort':'comfort','console':'console','adventure_box':'game_stage',
 'story':'game_card','mascot':'figurine','puzzle':'puzzle','keys':'keys','timegate':'gate',
 'tasting':'test','courses':'course','flowers':'flowers','scraps':'trash',
 'garden_guest':'mouse','cats':'cat','honor':'champion','gen_tools':'toolbox',
 'gen_food':'equipment_cart','gen_produce':'fridge','gen_herb':'pot',
 'gen_supply':'shopping_cart','gen_publicity':'publicity','gen_flower':'flowerbasket',
 'gen_recycle':'sweeper',
}


def apply(config, reference_chains, reference_numbers, original_sources):
    old = deepcopy(config)
    config.update(balanceVersion=VERSION, status='IMPLEMENTED_RUNTIME', saveVersion=4)
    original_sources.extend(SOURCES)
    # Keep the source list shared with the generated research tables.
    config['sources'] = [dict(id=i,title=t,url=u,date=d,limits=l) for i,t,u,d,l in original_sources]
    source_index = {s['id']:s for s in config['sources']}
    decisions = []
    def record(target, field, before, after, source=None, observed=None, unit='', conflict='', reason='', evidence=None):
        if target == 'gen_recycle:10': before = None
        s = source_index.get(source,{})
        if not unit: unit = {'intervalSeconds':'秒','rechargeSeconds':'秒','capacity':'件','draws':'次','mode':'模式','onExhaust':'物品ID','mergeTo':'物品ID','activeLevel':'级','maxLevel':'级','batch':'件/周期','outputLevelProb':'概率','maxStock':'件'}.get(field,'结构/规则')
        decisions.append(dict(target=target,field=field,old=before,new=after,
            referenceValue=after if observed is None and source else observed,unit=unit,
            evidence=evidence or ('P' if source else 'D'),sources=[source] if source else [],
            url=s.get('url'),published=s.get('date'),accessed=config['asOf'],region=('台服历史资料' if source=='S14' else '微信小游戏（作者说明）' if source=='S27' else '中文资料；客户端地区/渠道未标明') if source else '小厨',
            version='来源未标客户端版本；采用带日期历史锚点' if source else VERSION,
            conflict=conflict,decision=reason or ('采用该字段历史记录；其他字段独立标记' if source else '公开资料不足，保留厨房设计'),
            implementation='docs/balance/align_feige.py → kitchen-target.json → dist/balance-data.mjs → catalog/engine.mjs'))
    config['globals']['boardRows']=9
    record('globals','boardRows',7,9,'S27',unit='行',reason='原图逐格数为7列9行。保留7列，旧0—48索引不变')
    record('initial','newRowLocks',[],list(range(49,63)),unit='索引',reason='新增14格为空锁格；沿用相邻合成免费清理与金币解锁，不增加直接赠币')
    config['initial']['lockedIndices'] += list(range(49,63))
    producers = {p['id']:p for p in config['producers']}
    for p in config['producers']:
        p['stockRule']='field_specific_reservoir'
        for field in ['activeLevel','maxLevel','drops']:
            sid=({'tools':'S03','food':'S04','supply':'S07','recycle':'S02'}.get(p['id']) if field=='activeLevel' else 'S19' if field=='maxLevel' and p['id']=='supply' else 'S34' if field=='maxLevel' and p['id']=='recycle' else None)
            record(p['chain'],field,9 if p['id']=='recycle' and field=='maxLevel' else p[field],p[field],sid,
                reason='沿已知历史启用等级/扩级记录；最高级存在不代表现版上限' if sid else '厨房映射含独立咖啡台、原创菜系和餐具；精确启用/最高级及产物权重无完整版本证据，保留D')
        for row in p['levels']:
            row['fieldEvidence']={k:dict(evidence='D',sources=[]) for k in ['energyPerTap','batch','maxStock','rechargeSeconds','outputLevelProb']}
            if row['active']:
                row['fieldEvidence']['energyPerTap']=dict(evidence='P',sources=['S12'],limits='普通主棋盘点击历史机制；具体自动/活动另判')
    for pid,(sid,levels) in RATES.items():
        for level,(minutes,batch,capacity) in levels.items():
            row=producers[pid]['levels'][level-1]
            for field,val,unit in [('batch',batch,'件/周期'),('maxStock',capacity,'件'),('rechargeSeconds',round(minutes*60),'秒')]:
                conflict=''
                if pid=='supply': conflict='S28为约28/14/7h的回满叙述；S29的8/6h与旧表有差异；不直接当逐周期CD'
                if pid=='recycle': conflict='S29的92/46/22min接近旧表回满两周期；9/10级新旧表不同。采用2023-01-29同组周期/补量/容量'
                if pid=='tools' and level==4: conflict='原图I列回满304min与G/H/K的152/8/20算式不一致；采用明确字段，回满过程以运行时离散批次为D'
                record(f'gen_{pid}:{level}',field,row[field],val,sid,unit=unit,conflict=conflict,
                    reason='人工核读原图G周期分钟/H每周期量/K库存；分钟换算秒四舍五入。历史玩家表含加速价换算，非现版官方精确配置；满库存暂停与离散批次规则为D')
                row[field]=val
                row['fieldEvidence'][field]=dict(evidence='P',sources=[sid],limits='2023历史换算表；秒取整；批次调度与满库暂停D')
    for pid,levels in EXTENSION_RATES.items():
        for level,(minutes,batch,capacity) in levels.items():
            row=producers[pid]['levels'][level-1]
            record(f'gen_{pid}:{level}','reservoir',[row['batch'],row['maxStock'],row['rechargeSeconds']],[batch,capacity,minutes*60],unit='件/件/秒',
                conflict='购物车L8的旧文5h/16不是可确认的逐周期参数，且与L7新表不连续' if pid=='supply' and level==8 else '',
                reason='无相同版本逐周期表，按相邻历史档的供给效率单独设计。花盆L4/5为保留旧ID的厨房额外启用档，CD依次为L6的4/2倍；其他扩展档逐级缩短等待，限制容量膨胀')
            row.update(batch=batch,maxStock=capacity,rechargeSeconds=minutes*60)
    transitions = {t['id']:t for t in config['transitions']}
    def transition(tid,changes,sid,conflict='',reason=''):
        t=transitions[tid]
        t['fieldEvidence']={k:dict(evidence='D',sources=[]) for k in t if k not in ['id','source','sourceLevels','mode']}
        for field,val in changes.items():
            record(t.get('source',tid),field,t.get(field),val,sid,conflict=conflict,reason=reason)
            t[field]=val
            t['fieldEvidence'][field]=dict(evidence='P',sources=[sid])
    transition('seed',{'draws':12,'onExhaust':'emptybag:1'},'S28')
    transition('herb_snail',{'intervalSeconds':1800,'capacity':2},'S33',conflict='S28的1h是容量2的回满时间；原图G30min/H1/K2与S30单个30min相符')
    transition('scraps_guest',{'intervalSeconds':480,'capacity':2},'S34',conflict='S28的16min对应容量2的回满时间；S30后来写6min，采用2023-01-29原图G8min/H1/K2')
    transition('lost5',{'intervalSeconds':4020,'capacity':4},'S35')
    transition('lost6',{'intervalSeconds':2040,'capacity':4},'S35')
    transition('keys_gate',{'draws':7},'S31')
    transition('console_scenes',{'draws':3},'S07',conflict='S31写4次；本项目选择S07大陆墙壁阶段路径的3次')
    transition('nest_cat',{'mode':'finite','draws':12},'S28',reason='恢复有限猫窝路径；新实例12次后消失。旧v3永久猫窝单独保留旧生产规则')
    for key in ['batch','maxStock','rechargeSeconds']: transitions['nest_cat'].pop(key,None)
    transitions['nest_cat']['onExhaust']=None
    next(c for c in config['chains'] if c['id']=='garden_guest')['items'][5]['protectedDefault']=False
    # Keep only confirmed per-level records rather than spreading a single value to a family.
    manual=transitions['pantry_manual']
    manual['sourceLevels'].remove('pantry:1')
    first=deepcopy(manual);first.update(id='pantry_manual1',source='pantry:1',rechargeSeconds=21600)
    first.pop('sourceLevels')
    first['fieldEvidence']={'rechargeSeconds':dict(evidence='P',sources=['S30'],limits='6h历史CD；8/16批次与容量为D')}
    config['transitions'].append(first)
    record('pantry:1','rechargeSeconds',1800,21600,'S30',unit='秒',reason='只改可核实的L1；其他级别手动CD仍D')
    auto=transitions['pantry_auto']
    auto['sourceLevels'].remove('pantry:8');auto['sourceLevels'].remove('pantry:11')
    for level,seconds,capacity in [(8,1920,2),(11,240,6)]:
        t=deepcopy(auto);t.update(id=f'pantry_auto{level}',source=f'pantry:{level}',intervalSeconds=seconds,capacity=capacity);t.pop('sourceLevels')
        t['fieldEvidence']={'intervalSeconds':dict(evidence='P',sources=['S30']),'capacity':dict(evidence='P' if level==11 else 'D',sources=['S30'] if level==11 else [])}
        config['transitions'].append(t)
        record(f'pantry:{level}','intervalSeconds',1800,seconds,'S30',unit='秒')
        record(f'pantry:{level}','capacity',2,capacity,'S30' if level==11 else None,unit='件')
    # Bottom rows are piggy banks, not bags. The 1/2/4-day column is
    # ambiguous (restock/availability); it must not overwrite bag opening timers.
    for bag in ['blackbag','pinkbag']:
        record(bag,'bagOpenSeconds',old['economy']['bagOpenSeconds'][bag],config['economy']['bagOpenSeconds'][bag],
            reason='原图末行实际为存钱罐，1/2/4天语义未知；没有可复核包开锁时间，保留D')
    for field in ['energyCap','initialStorage','maxStorage','orderCoinFormula','orderXpFormula','xpPerLevelFormula','sellFormula','infiniteEnergyMaxSeconds']:
        record('globals',field,old['globals'][field],config['globals'][field],reason='检索官方5.9.1页、2022原帖、2023/2024CD图、2025道具合集后，未取得可复核完整数表；延用有守恒边界的厨房值')
    for field in ['storagePrices','storageIncrement','bagLevelProb','pigDrops','pigLevelProbByTier','energyBoxDrops','weeklyCommission','dailyDeviceCommission','bubbleProbability']:
        record('economy',field,old['economy'][field],config['economy'][field])
    record('economy','energyPurchasePrices',[5,10,20,40],[5,10,20,40],'S12',unit='颗彩虹糖',reason='2022原帖直接列出阶梯；每次100点/每日4次仍为厨房D；刷新沿官方2023零时公告')
    record('economy','dailyFree',old['economy']['dailyFree'],config['economy']['dailyFree'],'S12',reason='每日罐+能量箱采用原始玩家记录；广告商业流程转为厨房休息领取D')
    config['policies']['resourcePartUsedMerge']='tipjar:1 only; L2 used merge remains blocked (inheritance unknown)'
    record('tipjar:1','partUsedMerge',False,True,'S12',reason='原始玩家记载L1点14次后可合并；新L2为未开启18次，已用L2→L3公式未知，继续禁止')
    next(c for c in config['chains'] if c['id']=='splitter')['items'][2]['stackLimit']=20
    record('splitter:3','stackLimit',1,20,'S17',unit='把',reason='同级紫剪刀可叠加；使用每次扣一把，失败不扣；其他剪刀仍按原路线升级')
    record('gen_recycle:9','mergeTo',None,'gen_recycle:10','S34',reason='历史图表确认10级存在；增加必要节点，既有9级ID和图形保持')
    # Document resource values and every unproven producer field, including unchanged ones.
    for p in config['producers']:
        for row in p['levels']:
            if not row['active']: continue
            oldrow=next(x for x in old['producers'] if x['id']==p['id'])['levels'][row['level']-1]
            for field in ['batch','outputLevelProb']:
                if row['fieldEvidence'][field]['evidence']=='P': continue
                record(f"{p['chain']}:{row['level']}",field,oldrow[field],row[field],reason='来源没有该级产物等级概率样本或同版回补批次；保留D。容量/CD证据不能单独推导概率或批次')
            for field in ['maxStock','rechargeSeconds']:
                if row['fieldEvidence'][field]['evidence']=='D':
                    record(f"{p['chain']}:{row['level']}",field,oldrow[field],row[field])
    for c in config['chains']:
        if c['kind']=='resource':
            for it in c['items']:
                sid=(it.get('valueSources') or [None])[0]
                record(it['id'],'value',it['value'],it['value'],sid,unit=it['valueUnit'])
    config['alignment']=dict(asOf=config['asOf'],status='PARTIAL_DATED_EVIDENCE_WITH_EXPLICIT_DESIGN',
        previousBalanceVersion=OLD_VERSION,decisions=decisions,
        editionPolicy='按字段采用注明日期的子系统历史锚点；不存在一份已证实的2026统一配置。P不代表当前官方值。',
        unknowns=['现版逐级掉率与回补粒度','现版全部生产器参数','完整仓库价格与经验奖励表','订单生成公式','已用容器合并继承公式','道具边界与叠加细节'])
    reference_numbers.extend([
        ('board','历史主棋盘行列',[7,9],'列/行','P',['S27'],'逐格实机图核读；2026所有渠道未知'),
        ('plant_auto','花树历史单个产出周期',[1800,2],'秒/容量','P',['S33'],'S28的1h为两件回满；原图单周期30min产1'),
        ('trash_auto','垃圾袋历史单个产出周期',[480,2],'秒/容量','P',['S34'],'S28的16min为两件回满；S30的6min为后期资料冲突'),
        ('nest_finite','猫窝耗尽次数',12,'次','P',['S28','S31'],'点完消失；旧小厨永久实例保留旧规则'),
        ('key_finite','感应手环耗尽次数',7,'次','P',['S31'],'无可靠现版复测'),
    ])
    return old


def write_mapping(config, refs, table):
    refs={c['id']:c for c in refs}
    rows=[]
    resource_names={'energy':'能量道具','coins':'金币','gems':'钻石','blackbag':'黑色手提包','pinkbag':'粉色手提包','tipjar':'肥鹅存钱罐','infinite':'无限能量','timeskip':'棋盘加速器','charge':'充能器','splitter':'拆分器（剪刀）','backpack':'扩容背包','stopwatch':'秒表','upgrade':'升级卡（小厨两类适配）','energybox':'能量箱'}
    for c in config['chains']:
        reference=refs.get(FAMILY_MAP.get(c['id']))
        for it in c['items']:
            known=next((x for x in reference['levels'] if x['level']==it['level']),None) if reference else None
            cross=next((t['output'] for t in config['transitions'] if t['mode']=='cross_merge' and t.get('source')==it['id']),None)
            rows.append(dict(id=it['id'],name=it['name'],referenceFamily=reference['id'] if reference else resource_names.get(c['id']),
                referenceName=known['name'] if known and known['name']!='待核实' else resource_names.get(c['id']),
                referenceLevel=it['level'] if reference and (known and known['status']=='recorded' or reference.get('reportedMax') and it['level']<=reference['reportedMax']) else None,
                referenceReportedMax=reference.get('reportedMax') if reference else None,referenceCurrentMax=None,
                routeEvidence='P历史机制适配；名称与美术为厨房原创' if reference else 'P档位/功能参照；使用边界见逐字段表' if c['sources'] else 'D厨房原创/旧档兼容',
                sources=reference['sources'] if reference else c['sources'],mergeTo=it['mergeTo'],crossMergeTo=cross,
                artKey=f"item/{it['id']}",change='新增' if it['id']=='gen_recycle:10' else '保留ID/名称/资产键',
                migration='旧v3猫窝保留永久规则；新猫窝有限12次' if it['id']=='garden_guest:6' else '旧实例ID/位置保留；库存溢出保值，当前计时剩余秒数保留',
                limits=c['reference']))
    (ROOT/'item-reference-map.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    out=['# 稳定物品ID、参考路线与美术交接\n',
        '生成源：`build_docs.py` + `align_feige.py`。逐项映射支持审查，P仅为历史机制参照。相同等级序号不代表外形/名称逐项相同；无逐级证据的名称为未知。厨房原创菜系、餐具、水果和旧档资源继续保留。\n',
        '本轮已有421项ID、资产键全部保留，名称沿用最新main美术提交4d9d9ef的缸/罐/筐/桶调整，新增 `gen_recycle:10`（大师花园循环桶，资产键 `item/gen_recycle:10`）。沿用4d9d9ef的桶体扩展该节点，增加仪表和脚轮；既有1—9级图形保持。建议美术单独检查10级识别度。本轮没有重绘现有资产。空袋末级跨链与冒险场景耗尽转场分列。\n',
        '原始肥鹅图仅供研究，未进入游戏素材。主生产器映射有结构差异：生鲜篮借鉴冰箱三支线，但厨房饮品来自独立咖啡台；餐具为保留原创副链；荣誉为永久里程碑，未恢复旧冠军活动。花篮采用花卉路径。\n',
        table(['稳定ID','厨房名称','肥鹅系列/逐级名称','合成→ / 跨链→','资产键','变更'],[(r['id'],r['name'],f"{r['referenceFamily'] or '厨房原创/兼容'} / {r['referenceName'] or '逐级名称未知'}",f"{r['mergeTo'] or '—'} / {r['crossMergeTo'] or '—'}",r['artKey'],r['change']) for r in rows])]
    (ROOT/'ITEM_REFERENCE_MAP.md').write_text('\n'.join(out))
    decisions=config['alignment']['decisions']
    (ROOT/'ALIGNMENT_PARAMETERS.md').write_text('# 可追溯参数决策表\n\n'+config['alignment']['editionPolicy']+'\n\n旧值对应PR #6；P为带日期历史记录，D为厨房设计。完整字段、单位、冲突、实现位置见 [JSON](kitchen-target.json) 的 alignment.decisions。每级库存、CD、回补批次和等级掉率独立列证据。\n\n'+table(['目标','字段','旧值','新值','证据/日期','来源','冲突与采用理由'],[(r['target'],r['field'],json.dumps(r['old'],ensure_ascii=False),json.dumps(r['new'],ensure_ascii=False),f"{r['evidence']} / {r['published'] or '厨房D'}",f"[{','.join(r['sources'])}]({r['url']})" if r['url'] else '—',r['conflict']+'；'+r['decision']) for r in decisions]))
