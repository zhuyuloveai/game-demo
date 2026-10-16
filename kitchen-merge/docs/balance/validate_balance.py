#!/usr/bin/env python3
"""Audit documentation data; no game state or runtime code is changed."""
import collections
import itertools
import json
import math
import random
import re
import statistics
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
D = json.loads((ROOT / 'kitchen-target.json').read_text())
B = json.loads((ROOT / 'current-baseline.json').read_text())
F = json.loads((ROOT / 'feige-reference.json').read_text())
CHAINS = {c['id']: c for c in D['chains']}
ITEMS = {i['id']: i for c in D['chains'] for i in c['items']}
PRODUCERS = {p['id']: p for p in D['producers']}
SOURCES = {s['id'] for s in D['sources']}
ERRORS = []
COUNTS = collections.Counter()


def check(condition, label, group='结构'):
    COUNTS[group] += 1
    if not condition:
        ERRORS.append(label)


def item_ref(value, context):
    check(value in ITEMS, f'{context}: 无效物品 {value}', '引用')


def probability(values, context):
    check(bool(values) and all(0 <= v <= 1 for v in values)
          and abs(sum(values) - 1) < 1e-9, f'{context}: 概率错误 {values}', '概率')


def reward_refs(rewards, context):
    for reward in rewards:
        if 'item' in reward:
            item_ref(reward['item'], context)
            check(reward.get('count', 1) > 0, f'{context}: 奖励数量', '奖励')


def md_table(headers, rows):
    return ('| ' + ' | '.join(headers) + ' |\n| ' + ' | '.join(['---'] * len(headers)) + ' |\n'
            + ''.join('| ' + ' | '.join(str(v) for v in row) + ' |\n' for row in rows))


def closure(chapter, finite_level_rewards=True, postgame=False):
    """Existence closure: enough time/copies, no board limit. Never a duration proof."""
    roots = {x['item'] for x in D['initial']['producers'] + D['initial']['commodities']}
    roots.update(x['item'] for x in D['economy']['dailyFree'])
    roots.update(x['item'] for x in D['economy']['weeklyCommission']['rewards'])
    roots.update(['blackbag:1', 'pinkbag:1', 'chest:1'])
    roots.update(x['item'] for x in D['economy']['shop'] if 'item' in x)
    for p in D['producers']:
        if p['unlockChapter'] <= chapter:
            # Starter/preceding chapter grants active generator, shop supplies parts.
            roots.add(f"{p['chain']}:{p['activeLevel']}")
            roots.add(f"{p['chain']}:1")
    for ch in D['chapters']:
        if ch['chapter'] < chapter or postgame:
            roots.update(x['item'] for x in ch['completionRewards'] if 'item' in x)
    if finite_level_rewards:
        for row in D['levelRewards']:
            roots.update(x['item'] for x in row['rewards'])
    if postgame:
        roots.add(D['economy']['honorMilestone']['reward'])
    reached = set(roots)
    while True:
        before = len(reached)
        for iid in list(reached):
            if ITEMS[iid]['mergeTo']:
                reached.add(ITEMS[iid]['mergeTo'])
        for p in D['producers']:
            if p['unlockChapter'] > chapter:
                continue
            for lv in p['levels']:
                if not lv['active'] or f"{p['chain']}:{lv['level']}" not in reached:
                    continue
                for drop in p['drops']:
                    if CHAINS[drop['chain']]['unlockChapter'] > chapter or drop['prob'] <= 0:
                        continue
                    for level, prob in enumerate(lv['outputLevelProb'], 1):
                        if prob > 0:
                            reached.add(f"{drop['chain']}:{min(level, len(CHAINS[drop['chain']]['items']))}")
        for t in D['transitions']:
            source = [t['source']] if 'source' in t else t['sourceLevels']
            if not reached.intersection(source):
                continue
            if 'output' in t:
                reached.add(t['output'])
            reached.update(x['item'] for x in t.get('outputs', []) if x.get('prob', 1) > 0)
            reached.update(t.get('sequence', []))
            if t.get('onExhaust'):
                reached.add(t['onExhaust'])
        for bag, drops in D['economy']['bags'].items():
            if not any(i['id'] in reached for i in CHAINS[bag]['items']):
                continue
            for cid, prob in drops.items():
                if prob > 0 and CHAINS[cid]['unlockChapter'] <= chapter:
                    for level, level_prob in enumerate(D['economy']['bagLevelProb'], 1):
                        if level_prob > 0:
                            reached.add(f'{cid}:{level}')
        if 'energybox:1' in reached:
            reached.update(x['item'] for x in D['economy']['energyBoxDrops'] if x['prob'] > 0)
        for tier, probs in D['economy']['pigLevelProbByTier'].items():
            if f'tipjar:{tier}' in reached:
                for drop in D['economy']['pigDrops']:
                    for level, prob in enumerate(probs, 1):
                        if prob > 0 and drop['prob'] > 0:
                            reached.add(f"{drop['chain']}:{level}")
        for tier, rewards in D['economy']['chestRewards'].items():
            if f'chest:{tier}' in reached:
                reached.update(x['item'] for x in rewards)
        if len(reached) == before:
            return reached


check(len(ITEMS) == sum(len(c['items']) for c in D['chains']), '物品ID重复')
check(len(CHAINS) == len(D['chains']), '系列ID重复')
check(len(PRODUCERS) == len(D['producers']), '生产器ID重复')
check(len({o['id'] for o in D['storyOrders']}) == len(D['storyOrders']), '主线订单ID重复')
for c in D['chains']:
    check([i['level'] for i in c['items']] == list(range(1, len(c['items']) + 1)), f"{c['id']} 等级连续")
    for source in c['sources']:
        check(source in SOURCES, f"{c['id']} 无效来源 {source}", '引用')
    for i in c['items']:
        check(i['id'] == f"{c['id']}:{i['level']}", f"{i['id']} 编号格式")
        if i['mergeTo']:
            item_ref(i['mergeTo'], i['id'])
            out = ITEMS[i['mergeTo']]
            check(out['level'] == i['level'] + 1 and out['baseUnits'] == i['baseUnits'] * 2,
                  f"{i['id']} 二合一守恒", '合成')
        if i['standardCost'] is not None:
            check(math.isfinite(i['standardCost']) and i['standardCost'] > 0, f"{i['id']} C有效", '经济')
        if c['kind'] == 'stateful':
            check(i['mergeTo'] is None and i['baseUnits'] is None, f"{i['id']} 状态阶段混入合成", '合成')
for c in F['chains']:
    check(c['currentMax'] is None, f"参考{c['id']}未证实的现版上限", '证据')
    for sid in c['sources']:
        check(sid in SOURCES, f"参考{c['id']}缺来源{sid}", '证据')
for value in F['parameters']:
    check(value['evidence'] in ['O', 'P', 'U'], f"参考{value['id']}证据类型", '证据')
    if value['evidence'] == 'U':
        check(value['value'] is None, f"未知{value['id']}应为null", '证据')
    else:
        check(bool(value['sources']), f"参考{value['id']}有值无来源", '证据')
    check(all(s in SOURCES for s in value['sources']), f"参考{value['id']}来源有效", '证据')

for p in D['producers']:
    probability([d['prob'] for d in p['drops']], p['id'])
    check(len(p['levels']) == p['maxLevel'], f"{p['id']}等级数")
    for drop in p['drops']:
        check(drop['chain'] in CHAINS, f"{p['id']}掉落链存在", '引用')
    for lv in p['levels']:
        item_ref(f"{p['chain']}:{lv['level']}", p['id'])
        if lv['active']:
            probability(lv['outputLevelProb'], f"{p['id']}L{lv['level']}")
            check(lv['energyPerTap'] == 1 and 0 < lv['batch'] <= lv['maxStock']
                  and lv['rechargeSeconds'] > 0, f"{p['id']}L{lv['level']}库存/CD", '生产')
            mu = sum(v * 2**i for i, v in enumerate(lv['outputLevelProb']))
            check(abs(mu - lv['outputBaseUnitsPerTap']) < 1e-9, f"{p['id']}产能均值", '生产')
        else:
            check(not any(lv['outputLevelProb']) and lv['maxStock'] == 0, f"{p['id']}零件禁生产", '生产')
    for chapter in range(p['unlockChapter'], 13):
        available = [d for d in p['drops'] if CHAINS[d['chain']]['unlockChapter'] <= chapter]
        total = sum(d['prob'] for d in available)
        probability([d['prob']/total for d in available] if total else [], f"{p['id']}第{chapter}章过滤")
for t in D['transitions']:
    src = [t['source']] if 'source' in t else t['sourceLevels']
    for iid in src:
        item_ref(iid, t['id'])
        if t['mode'] in ['auto', 'recharge']:
            check(ITEMS[iid]['protectedDefault'] and ITEMS[iid]['sellCoins'] == 0, f'{iid}永久源保护', '生产')
    for key in ['output', 'onExhaust']:
        if t.get(key):
            item_ref(t[key], t['id'])
    for iid in t.get('sequence', []):
        item_ref(iid, t['id'])
    reward_refs(t.get('outputs', []), t['id'])
    if t.get('outputs') and all('prob' in x for x in t['outputs']):
        probability([x['prob'] for x in t['outputs']], t['id'])
    if 'draws' in t:
        check(t['draws'] > 0, f"{t['id']}有限次数", '生产')
    if t['mode'] == 'auto':
        check(t['intervalSeconds'] > 0 and t['capacity'] > 0, f"{t['id']}自动缓冲", '生产')

E = D['economy']
probability([x['prob'] for x in E['pigDrops']], '存钱罐品类')
for tier, values in E['pigLevelProbByTier'].items():
    probability(values, f'存钱罐{tier}等级')
probability([x['prob'] for x in E['energyBoxDrops']], '能量箱')
probability(E['bagLevelProb'], '设备包等级')
for bag, drops in E['bags'].items():
    probability(list(drops.values()), bag)
    for chapter in range(1, 13):
        available = [v for k, v in drops.items() if CHAINS[k]['unlockChapter'] <= chapter]
        probability([v/sum(available) for v in available] if available else [], f'{bag}第{chapter}章过滤')
reward_refs(E['dailyFree'], '每日')
reward_refs(E['weeklyCommission']['rewards'], '每周')
reward_refs(E['energyBoxDrops'], '能量箱')
for rewards in E['chestRewards'].values():
    reward_refs(rewards, '礼盒')
for row in D['levelRewards']:
    reward_refs(row['rewards'], f"等级{row['level']}")
    lv = row['level']
    check(row['cumulativeXp'] == 100*(lv-1)+10*(lv-1)*(lv-2), f'等级{lv}经验门槛', '奖励')
check([r['level'] for r in D['levelRewards']] == list(range(2, 101)), '完整等级奖励', '奖励')
five_bags = [[x['item'] for x in row['rewards'] if x['item'] in ['blackbag:1', 'pinkbag:1']][0]
             for row in D['levelRewards'] if row['level'] % 10 == 5]
check(all(a != b for a, b in zip(five_bags, five_bags[1:])), '尾数5级别黑粉包交替', '奖励')
check(len(E['storagePrices']) == (D['globals']['maxStorage']-D['globals']['initialStorage'])//2,
      '扩容价表覆盖初始到上限', '经济')
check(not D['globals']['coinEnergyPurchase'], '金币补能循环应关闭', '经济')
check(E['orderChestDailyLimit'] == 3 and E['energyPurchaseDailyLimit'] == len(E['energyPurchases']), '供给日上限', '经济')
for cid in ['coins', 'gems', 'energy']:
    vals = [x['value'] for x in CHAINS[cid]['items']]
    check(all(b > 2*a for a, b in zip(vals, vals[1:])), f'{cid}合成溢价', '经济')

positions = [x['index'] for x in D['initial']['producers']+D['initial']['commodities']]
check(len(set(positions)) == len(positions) and all(0 <= x < D['globals']['boardCols'] * D['globals']['boardRows'] for x in positions), '初始位置无冲突', '迁移')
for row in D['initial']['producers']+D['initial']['commodities']+D['initial']['pending']+D['initial']['boosters']:
    item_ref(row['item'], '初始')
for cid, old_items in B['chains'].items():
    if cid in ['energy', 'coins', 'chest']:
        for old in old_items:
            new = ITEMS[f"legacy_{cid}:{old['level']}"]
            check(new['name'] == old['name'] and new.get('value') == old.get('value'), f"旧资源{old['id']}保值", '迁移')
    else:
        for old in old_items:
            check(ITEMS[old['id']]['name'] == old['name'], f"旧普通物{old['id']}保留", '迁移')
for kind, old in B['producers'].items():
    p = PRODUCERS[kind]
    for lv in range(1, old['maxLevel']+1):
        new_lv = lv+p['oldLevelOffset']
        check(p['activeLevel'] <= new_lv <= p['maxLevel'], f'设备{kind}旧L{lv}迁入可生产级', '迁移')

chapter_results = []
for ch in D['chapters']:
    chapter = ch['chapter']
    reached = closure(chapter)
    orders = [o for o in D['storyOrders'] if o['chapter'] == chapter]
    check(len(orders) == 8 and ch['orders'] == [o['id'] for o in orders], f'第{chapter}章8单', '订单')
    rewards = sum(o['stars'] for o in orders)
    check(rewards >= ch['stars'], f'第{chapter}章星星自足', '订单')
    reward_refs(ch['completionRewards'], f'章{chapter}')
    for kind in ch['unlockNextProducers']:
        check(PRODUCERS[kind]['unlockChapter'] == chapter+1, f'章{chapter}解锁设备时机', '可达性')
    for o in orders:
        c = 0
        for n in o['needs']:
            iid = f"{n['family']}:{n['level']}"
            item_ref(iid, o['id'])
            check(iid in reached and CHAINS[n['family']]['unlockChapter'] <= chapter, f"{o['id']}来源不可达 {iid}", '可达性')
            c += ITEMS[iid]['standardCost']*n['count']
        check(abs(c-o['standardCost']) < .002 and o['coins'] == math.ceil(8+2*c)
              and o['xp'] == math.ceil(4+c/4), f"{o['id']}奖励/C一致", '订单')
    chapter_results.append((chapter, len(orders), ch['stars'], rewards, len(reached)))

all_reached = closure(12, postgame=True)
new_ids = {i['id'] for c in D['chains'] if c['kind'] != 'legacy' for i in c['items']}
check(new_ids <= all_reached, '新物品不可达: '+', '.join(sorted(new_ids-all_reached)), '可达性')
repeatable_reached = closure(12, finite_level_rewards=False, postgame=True)
for c in D['chains']:
    if c['kind'] != 'legacy' and any(i['mergeTo'] for i in c['items']):
        check(c['items'][-1]['id'] in repeatable_reached, f"{c['id']}顶级缺可持续供给", '可达性')

recipe_rows = []
for recipe, old in zip(D['recipes'], B['recipes']):
    cost = sum(ITEMS[f"{n['family']}:{n['level']}"]['standardCost']*n['count'] for n in recipe['inputs'])
    out = ITEMS[f"{recipe['output']['family']}:{recipe['output']['level']}"]['standardCost']
    check(recipe['id'] == old['id'] and recipe['inputs'] == old['needs'] and recipe['output'] == old['output'], f"配方{recipe['id']}材料保留", '配方')
    check(cost+recipe['energyCost']+1e-8 >= .9*out, f"配方{recipe['id']}价格下界", '配方')
    check(recipe['xp'] == 0 and recipe['coinCost'] == 0 and not recipe['tool']['consumed'], f"配方{recipe['id']}经验/工具", '配方')
    reachable = closure(recipe['unlockChapter'])
    check(all(f"{n['family']}:{n['level']}" in reachable for n in recipe['inputs'])
          and recipe['tool']['item'] in reachable, f"配方{recipe['id']}解锁时来源", '可达性')
    recipe_rows.append((recipe['name'], recipe['energyCost'], f'{cost+recipe["energyCost"]:.3f}', f'{out:.3f}', f'{(cost+recipe["energyCost"])/out:.1%}'))

# Enumerate real repeat-order combinations; no assumption that cost bands always fill.
repeat_rows = []
for chapter in range(1, 13):
    max_level = D['repeatOrderRules']['maxLevelByChapter'][chapter-1]
    candidates = [(i['id'], i['standardCost']*count, c['id'])
                  for c in D['chains'] if c['unlockChapter'] <= chapter
                  for i in c['items'] if i['repeatOrderEligible'] and i['level'] <= max_level
                  for count in [1, 2]]
    costs = [x[1] for x in candidates]
    costs += [a[1]+b[1] for a, b in itertools.combinations(candidates, 2) if a[0] != b[0]]
    multiplier = D['repeatOrderRules']['chapterMultiplier'][chapter-1]
    bands = []
    for slot in D['repeatOrderRules']['slots']:
        low, high = [v*multiplier for v in slot['band']]
        count = sum(low <= c <= high for c in costs)
        check(count > 0, f'第{chapter}章{slot["id"]}成本区间无候选', '订单')
        bands.append(count)
    repeat_rows.append((chapter, *bands))


def expected_taps(units, q, probs):
    expected = [0.0]*(units+1)
    for remaining in range(1, units+1):
        expected[remaining] = (1 + sum(q*p*expected[max(0, remaining-2**i)] for i, p in enumerate(probs)))/q
    return expected[-1]


def simulate(units, q, probs, samples, rng):
    limits = [q*probs[0], q*(probs[0]+probs[1]), q]
    result = []
    for _ in range(samples):
        have = taps = 0
        while have < units:
            v = rng.random()
            taps += 1
            if v < limits[0]:
                have += 1
            elif v < limits[1]:
                have += 2
            elif v < limits[2]:
                have += 4
        result.append(taps)
    return result


samples = D['validation']['samples']
rng = random.Random(D['validation']['seed'])
simulation_rows = []
for kind, family, level in [('food','food',6), ('produce','fruit',6), ('tools','tableware',6), ('mediterranean','mexican',6)]:
    p = PRODUCERS[kind]
    q = next(x['prob'] for x in p['drops'] if x['chain'] == family)
    for lv in [p['levels'][p['activeLevel']-1], p['levels'][-1]]:
        units = 2**(level-1)
        exact = expected_taps(units, q, lv['outputLevelProb'])
        observations = simulate(units, q, lv['outputLevelProb'], samples, rng)
        avg = statistics.mean(observations)
        se = statistics.stdev(observations)/math.sqrt(samples)
        check(abs(avg-exact) <= 5*se + .01, f'{kind}L{lv["level"]}模拟偏差', '模拟')
        observations.sort()
        simulation_rows.append((f'{family}:{level}', f'{kind} L{lv["level"]}', f'{exact:.2f}', f'{avg:.2f}',
                                observations[samples//2], observations[math.ceil(samples*.9)-1], f'±{1.96*se:.2f}'))

pig_rows = []
previous_total = None
for tier, probs in E['pigLevelProbByTier'].items():
    draws = ITEMS[f'tipjar:{tier}']['value']
    raw = draws*sum(p*ITEMS[f'coins:{i+1}']['value'] for i,p in enumerate(probs))
    check(previous_total is None or raw > 2*previous_total, f'存钱罐L{tier}合成收益', '经济')
    pig_rows.append((tier, draws, f'{raw*.9:.2f}', f'{raw*.1:.2f}', '—' if previous_total is None else f'{raw/(2*previous_total)-1:.1%}'))
    previous_total = raw
box_energy = ITEMS['energybox:1']['value']*sum(x['prob']*ITEMS[x['item']]['value'] for x in E['energyBoxDrops'])
check(abs(box_energy-59) < 1e-9, '能量箱直接领取期望', '经济')

# Local links only. External links retain citations but HTTP availability is not asserted.
for path in list(ROOT.glob('*.md')) + [ROOT.parent.parent/'README.md']:
    for link in re.findall(r'\]\(([^)]+)\)', path.read_text()):
        if re.match(r'^(https?://|#|mailto:)', link):
            continue
        target = (path.parent/unquote(link.split('#')[0])).resolve()
        check(target.exists() or target == ROOT/'VALIDATION.md', f'{path.name}链接缺失{link}', '本地链接')

item_counts = collections.Counter()
for c in D['chains']:
    item_counts[c['kind']] += len(c['items'])
report = [
    '# 小厨数值设计审计\n',
    f"配置版本：`{D['balanceVersion']}`。生成日期：{D['asOf']}。基线：`{D['baselineCommit']}`。\n",
    f'结果：**{len(ERRORS)}项失败，{sum(COUNTS.values())}项断言检查**。脚本只检查设计文件，不运行游戏、不改变存档。\n',
    '## 检查覆盖\n', md_table(['组别','断言数'], sorted(COUNTS.items())),
    '\n断言数包含逐个物品、等级和订单检查，不能解读为同数量的独立场景测试。\n',
    '## 物品与路径\n', md_table(['类型','数量'], sorted(item_counts.items())),
    f'\n合计{len(ITEMS)}项；除11项旧档资源外，{len(new_ids)}项都有来源闭包。主线96单逐章核对供给和解锁，原66个普通物ID/名称保留，原7类设备的28个等级映射均落在可生产范围。\n',
    '可达性模型假设有足够时间、重复掉落次数和可腾出的空间；它检查来源依赖，不能证明有限时间或实际棋盘内的可完成性。升级卡只有等级奖励有限供应，未被当成持续合成原料。高阶无限体力和沙漏由每周补给持续提供，避免只靠有限升级奖励导致最高档无法合出。\n',
    '## 每章星星与来源闭包\n', md_table(['章','订单数','星星支出','主线星星','此章可达定义数'], chapter_results),
    '\n可达定义数包含未来通过升级获得的辅助道具，但订单材料均另检查所属章节；第12章表内不含通关后的荣誉，最终全物品闭包包含。\n',
    '## 重复订单区间候选\n', md_table(['章','易槽组合','中槽组合','长槽组合'], repeat_rows),
    '\n按此章全部应解锁来源枚举1—2种不同物品、各1—2件。此表未同时摆出三个槽；实际仓库状态、已占用品类和去重可能触发主文档的降档或留空分支。\n',
    '## 配方成本下界\n', md_table(['配方','额外能量','输入C+能量','输出C','比值'], recipe_rows),
    '\n全部满足总标准成本≥输出C的90%。C是定价权重；高阶设备、自动来源、无限体力期间的实际能量不受这一比例约束。该检查不宣称完整经济无套利证明。\n',
    '## 直接链点击抽样\n',
    f'随机种子{D["validation"]["seed"]}，每个场景{samples}次独立完成采样，共{len(simulation_rows)*samples}次。目标均为一个L6物品。\n',
    '精确模型：E(0)=0；E(b)=[1+Σ(q·pᵢ·E(max(0,b−2ⁱ)))]/q。它计入无目标产物的点击和最终超额产物。假定库存/体力随时可用、空间无限、没有配方或其他来源，不计等待和操作耗时。\n',
    md_table(['目标','设备','精确期望点击','抽样均值','P50','P90','均值95%误差范围'], simulation_rows),
    '\n均值误差范围是1.96×样本标准误；P90为单次完成点击分位数，两者含义不同。抽样与精确期望按5个标准误容差检查。\n',
    '## 存钱罐与能量箱\n', md_table(['罐等级','次数','直接领金币期望','直接领钻石期望','相对两个前级罐'], pig_rows),
    '\n不合并罐内资源，直接领取；币与钻的掉落比例固定为90%/10%。L2、L3罐相对两个低一档罐的金币与钻石期望都提高；暂存更多占格仍是成本。合并罐内资源会进一步改变收益。\n',
    f'能量箱每箱5次、直接领取期望{box_energy:.0f}点；合成后兑换的收益另算。\n',
    '## 已修订的关系\n',
    '- 关闭无限金币买体力的兑换路径，减少现版生产—出售—补能正期望循环。\n'
    '- 配方增加按C计算的能量补差，重复制作/合并不再反复给XP。\n'
    '- 订单礼盒限制每日3个，设备来源改为章节、日周委托和限购零件。\n'
    '- 存钱罐分级掉率保证合罐收益；尾数5等级黑粉包正确交替。\n'
    '- 永久自动/主动载体默认保护；未解锁副产物和包掉落须过滤归一化。\n'
    '- 每周加入时间道具，补齐高阶资源的可持续来源。\n',
    '## 实现后才能验收的项目\n',
    '满盘原子性、容器使用次数继承、库存与秒表信用守恒、离线计时、最后供给源保护、旧档迁移事务、奖励幂等、网页刷新随机持久化均仍属于实现验收。本报告只审计设计；运行时与浏览器验收结果另见[实现说明](../BALANCE_IMPLEMENTATION.md)，不并入本报告的断言数量。\n',
    '实际完成天数、留存、资源溢出与金币缺口需实机试玩。第10章单猫窝的32次自动前置在单源且不浪费缓冲时约16小时，第12章手办还有成熟等待；只做来源闭包不足以判断这些等待是否合适。外部来源未在脚本中做HTTP可用性测试，证据的地区、年代和未知项继续保留。\n',
]
if ERRORS:
    report += ['## 失败项\n', '\n'.join('- '+e for e in ERRORS)+'\n']
(ROOT/'VALIDATION.md').write_text('\n'.join(report))
print(json.dumps({'assertions':sum(COUNTS.values()), 'failures':ERRORS, 'items':len(ITEMS),
                  'reachableNewItems':len(new_ids & all_reached), 'simulationEpisodes':samples*len(simulation_rows)}, ensure_ascii=False))
raise SystemExit(bool(ERRORS))
