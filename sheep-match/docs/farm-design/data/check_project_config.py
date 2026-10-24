"""Validate the proposed core-farm package. No game runtime or network is used."""
from pathlib import Path
import json,math
P=Path(__file__).resolve().parent;c=json.loads((P/'project-parameters-v04.json').read_text())
known={x['referenceId'] for x in c['crops']+c['items']+c['fruits']}
assert len({x['projectId'] for x in c['crops']+c['items']+c['fruits']})==len(known)
for x in c['items']:
 assert x['durationMs']>0 and x['yieldCount']>0 and x['M10']>0
 assert x['ingredients'] is not None
 assert set(x['ingredients'])<=known,(x['referenceId'],set(x['ingredients'])-known)
 assert all(isinstance(n,int) and n>0 for n in x['ingredients'].values())
assert len(c['items'])==48 and len(c['buildings'])==13
assert all(x['id'] not in {'Mine','Lure_Workbench','Net_Maker'} and not x['id'].startswith('Smelter') for x in c['buildings'])
assert all(x['id'] in {b['id'] for b in c['buildings']} for x in c['buildings'])
patches=c['map']['expansionPatches'];assert len(patches)==48
occupied={(x,y) for x in range(16,48) for y in range(16,48)}
for p in patches:
 cells={(x,y) for x in range(p['x'],p['x']+8) for y in range(p['y'],p['y']+8)}
 assert not occupied&cells
 assert any((x+dx,y+dy) in occupied for x,y in cells for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)])
 occupied|=cells
assert len(occupied)==4096
assert sum(p['land_deed'] for p in patches)==624
assert len(c['linkage'])==24 and len({r['stageId'] for r in c['linkage']})==24
assert all(r['tileCount']%3==0 for r in c['linkage'])
assert sum(r['estimatedCoinValue'] for r in c['linkage'])==5140
assert c['rescue']['grossYield']-c['rescue']['repay']==c['rescue']['netYield']==1
assert c['constructionVoucher']['maxMachineSlots']==9
assert c['orders']['finalCoinCapRatio']==1.05
# Include fruit prices and every mastery tier in immediate trade bounds.
n=0
for item in c['crops']+c['items']+c['fruits']:
 m=item['M10']
 for q in range(1,101):
  buy=math.ceil(q*m*1.10/10);cap=math.floor(q*m/10)
  for kind in c['orders']['types'].values():
   for star in (0,1):
    reward=min(math.floor(math.floor(cap*kind['coins'])*(1.1 if star else 1)),math.floor(cap*1.05))
    assert reward<=buy,(item['projectId'],q,reward,buy)
    n+=1
report={'status':'PASS','scope':'core proposal static checks, not player validation','productionItems':len(c['items']),'fieldCrops':len(c['crops']),'fruits':len(c['fruits']),'buildings':len(c['buildings']),'landPatches':len(patches),'totalMapCells':len(occupied),'eachLandMaterialTotal':624,'firstClearRewardValueUpperBound':5140,'tradeComparisonsWithMasteryAndFruits':n,'notValidated':['full progression economy','random order distribution','field interaction runtime','storage crash recovery runtime','fertilizer/mastery combined long-run balance']}
(P/'project-validation-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
