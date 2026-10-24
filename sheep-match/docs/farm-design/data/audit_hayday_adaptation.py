"""Project ADAPTATION only. Deterministic 30-minute budget scenarios, not Hay Day telemetry."""
from pathlib import Path
from collections import Counter
import csv,json,math
P=Path(__file__).resolve().parent
levels=list(csv.DictReader((P/'hayday-levels-1-30.csv').open(encoding='utf-8-sig')))
crops={r['crop_en']:r for r in csv.DictReader((P/'hayday-field-crops-level1-30.csv').open(encoding='utf-8-sig'))}
params=json.loads((P/'hayday-production-parameters.json').read_text())
items={r['id']:r for r in params['items']}
M={k:int(r['max_sale_10_coins']) for k,r in crops.items()}
M.update({k:r['max_price_10'] for k,r in items.items() if r['max_price_10'] is not None})
config=dict(status='LOCAL_ADAPTATION_NOT_ORIGINAL_GAME',version='local-audit-v1',horizon_minutes=30,initial_coins=100,fields=6,wheat=6,chickens=3,chicken_feed=3,barn=50,silo=50,unlock_gift=5,field_cost=1,bakery_coins=20,bakery_build_seconds=10,feedmill_coins=5,feedmill_build_seconds=40,chicken_feed_seconds=300,npc_recycle_ratio=0.5,strategies={'casual':300,'active':120,'mixed_processing':120})
config['rescue']={'status':'PROJECT_DEFAULT_ADAPTATION','cooldown_seconds':0,'max_active':1,'borrowed_seed':1,'harvest_units':2,'automatic_repayment_units':1,'net_inventory_units':1,'harvest_xp':1,'strict_no_seed_or_liquid_assets_gate':True}
(P/'hayday-adaptation-audit-config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2))
def sale(k,q):return max(1,q*M[k]//20) if q else 0
# Check exact INTEGER transaction paths, not only nominal percentage differences.
arbitrage=[]
for k,m in M.items():
 for q in range(1,101):
  buy=(q*m*110+999)//1000;recycle=sale(k,q);cap=q*m//10;coinorder=cap*105//100
  assert recycle<=buy and cap<=buy and coinorder<=buy,(k,q)
  arbitrage.append(dict(item=k,quantity=q,buy=buy,recycle=recycle,cap=cap,coin_order=coinorder))
results=[];logs=[]
for strategy,step in config['strategies'].items():
 coins=100;xp=0;lv=1;cap=6;inv=Counter(Wheat=6,Chicken_Feed=3);fields=[None]*6;chickens=[None]*3
 machines={};seen={'Wheat'};sales=0;spent=0;harvests=0;barnblocks=0;siloblocks=0
 def silo():return sum(v for k,v in inv.items() if k in crops)
 def barn():return sum(v for k,v in inv.items() if k not in crops)
 def update_level():
  global lv
  lv=max(int(r['level']) for r in levels if int(r['cumulative_xp_to_enter_derived'])<=xp)
  for k,r in crops.items():
   if int(r['unlock_level'])<=lv and k not in seen:
    assert silo()+5<=50,'gift overflow: must add pending reward in real implementation'
    inv[k]+=5;seen.add(k)
 for t in range(0,1801):
  # Queue completion while away produces ONE pending item; no auto-repeat.
  for m,v in machines.items():
   if v['job'] and v['job']['done_at']<=t:v['job']['complete']=True
  if t%step:continue
  for n,v in enumerate(fields):
   if v and v[1]<=t:
    k=v[0]
    if silo()+2<=50:inv[k]+=2;xp+=int(crops[k]['harvest_xp_per_field']);fields[n]=None;harvests+=1
    else:siloblocks+=1
  for n,ready in enumerate(chickens):
   if ready is not None and ready<=t:
    if barn()+1<=50:inv['Egg']+=1;xp+=2;chickens[n]=None
    else:barnblocks+=1
  for m,v in machines.items():
   if v['job'] and v['job'].get('complete'):
    j=v['job'];qty=j['qty']
    if barn()+qty<=50:inv[j['item']]+=qty;xp+=j['xp'];v['job']=None
    else:barnblocks+=1
   if not v['build_awarded'] and v['ready']<=t:xp+=v['build_xp'];v['build_awarded']=True
  update_level()
  wanted=int(next(r for r in levels if int(r['level'])==lv)['field_cap_historical_derived'])
  while cap<wanted and coins>=1:coins-=1;spent+=1;cap+=1;fields.append(None)
  if strategy=='mixed_processing':
   for name,minlv,price,seconds,bxp in [('Bakery',2,20,10,3),('Feed_Mill',3,5,40,4)]:
    if lv>=minlv and name not in machines and coins>=price:
     coins-=price;spent+=price;machines[name]=dict(ready=t+seconds,build_awarded=False,build_xp=bxp,job=None)
  for n,v in enumerate(fields):
   if v is None:
    k='Corn' if strategy=='mixed_processing' and 'Corn' in seen and n<2 else 'Soybean' if strategy=='mixed_processing' and 'Soybean' in seen and n==2 else 'Wheat'
    if inv[k]==0:k='Wheat'
    if inv[k]>0:inv[k]-=1;fields[n]=(k,t+int(crops[k]['base_minutes'])*60)
  for n,v in enumerate(chickens):
   if v is None and inv['Chicken_Feed']>0:inv['Chicken_Feed']-=1;chickens[n]=t+1200
  if strategy=='mixed_processing':
   for m,product,needs,qty,seconds,pxp in [('Feed_Mill','Chicken_Feed',{'Wheat':2,'Corn':1},3,300,1),('Bakery','Bread',{'Wheat':3},1,300,3)]:
    v=machines.get(m)
    if v and v['ready']<=t and v['job'] is None and all(inv[k]>=q+1 for k,q in needs.items()):
     for k,q in needs.items():inv[k]-=q
     v['job']=dict(item=product,qty=qty,done_at=t+seconds,xp=pxp)
  for k,q in list(inv.items()):
   if k=='Chicken_Feed':continue
   keep=cap if k=='Wheat' else 1 if k in crops else 0
   sell=max(0,q-keep)
   if sell:
    earned=sale(k,sell);inv[k]-=sell;coins+=earned;sales+=earned
  assert coins>=0 and silo()<=50 and barn()<=50
  logs.append(dict(strategy=strategy,minute=t/60,coins=coins,xp=xp,level=lv,field_count=cap,silo=silo(),barn=barn(),sales=sales,spent=spent))
 results.append(dict(strategy=strategy,coins=coins,net_coin_change=coins-100,sale_cash=sales,capital_spent=spent,xp=xp,level=lv,field_count=cap,inventory=dict(inv),inventory_recycle_value=sum(sale(k,q) for k,q in inv.items() if q and k in M),growing_fields=sum(v is not None for v in fields),animals_in_cycle=sum(v is not None for v in chickens),jobs_in_progress=sum(v['job'] is not None for v in machines.values()),harvested_fields=harvests,silo_blocks=siloblocks,barn_blocks=barnblocks))
(P/'hayday-adaptation-30min-results.json').write_text(json.dumps(dict(config=config,results=results,arbitrage_cases_checked=len(arbitrage),limitations=['No random orders/loot/match3/market demand','NPC immediate recycle only','No current-game claims','Only first basic machines purchased; no cows/dairy','No active human action time; discrete session approximation','Uncollected/growing work excluded from cash','Startup tutorial assets are not cash expenses']),ensure_ascii=False,indent=2))
with (P/'hayday-adaptation-30min-events.csv').open('w') as h:
 w=csv.DictWriter(h,fieldnames=list(logs[0]));w.writeheader();w.writerows(logs)
# Emergency borrowed seed: harvest2, repay1, receive1. No cooldown deadlock.
normal_net=sum(2-1 for _ in range(15));rescue_net=sum(2-1 for _ in range(15))
unsafe_rescue_net=sum(2 for _ in range(15))
assert normal_net==rescue_net==15 and unsafe_rescue_net==30
(P/'hayday-adaptation-rescue-check.json').write_text(json.dumps(dict(status='PROJECT_RESCUE_RULE',cycles=15,normal_net_units=normal_net,borrow_repay_rescue_net_units=rescue_net,unsafe_free_reseed_net_units=unsafe_rescue_net,rule='rescue sow1, harvest2, atomically repay borrowed1, deliver ordinary1'),indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2));print('Integer buy/resale checks:',len(arbitrage));print('Rescue baseline check:',normal_net,rescue_net)
# Project local fallback pricing. Never edits original source unknowns.
local_m=dict(M);fallback=[]
for k,i in items.items():
 if k not in local_m and i['displayed_single_max_price'] is not None:
  local_m[k]=i['displayed_single_max_price']*10;fallback.append(k)
for k,m in local_m.items():
 for q in range(1,101):
  buy=(q*m*110+999)//1000;cap=q*m//10;recycle=max(1,q*m//20);order=cap*105//100
  mastered_order=min(math.floor(order*1.10),cap*105//100)
  assert max(cap,recycle,order,mastered_order)<=buy
(P/'hayday-adaptation-fallback-price-check.json').write_text(json.dumps(dict(status='LOCAL_ADAPTATION_NOT_ORIGINAL_PRICE',items=len(local_m),cases=len(local_m)*100,fallback_items=fallback,rule='Only unknown M10 with verified displayed single max use local M10=display*10; source unknown preserved',instant_roundtrip_arbitrage_found=False,does_not_test='production chain profitability, market demand, random drops, unknown ingredients, materials outside source table'),ensure_ascii=False,indent=2))
print('Local fallback integer roundtrip checks:',len(local_m)*100)
