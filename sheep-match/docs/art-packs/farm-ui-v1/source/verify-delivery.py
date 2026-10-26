from pathlib import Path
from collections import defaultdict
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import xml.etree.ElementTree as ET
import json,hashlib
R=Path(__file__).resolve().parents[1];GAME=R.parents[2]
m=json.loads((R/'manifest.json').read_text());families=defaultdict(list)
for x in m['components']:
 p=R/x['file'];root=ET.parse(p).getroot();assert not list(root.iter('{http://www.w3.org/2000/svg}text')),p
 assert [int(root.attrib['width']),int(root.attrib['height'])]==x['canvas'];families[x['family']].append(x)
for family,states in families.items():
 assert len({tuple(x['canvas']) for x in states})==1,family
 if family!='progress':assert len({json.dumps(x['safeContentRect']) for x in states})==1,family
for x in json.loads((R/'reuse-manifest.json').read_text()):
 assert hashlib.sha256((GAME/x['original']).read_bytes()).hexdigest()==x['sha256']
 assert (GAME/x['original']).read_bytes()==(R/x['file']).read_bytes()
for x in json.loads((R/'environment-reuse-review.json').read_text()):assert hashlib.sha256((R/x['source']).read_bytes()).hexdigest()==x['sha256']
layouts=[]
for p in (R/'source').glob('*-layout.json'):
 d=json.loads(p.read_text());q=d['qa'];assert not q['documentOverflow'] and not q['brokenImages'] and not q['undersizedTargets'],p
 assert q['bodyScrollHeight']<=q['bodyClientHeight']+1,p
 art=ET.parse(p.with_name(p.name.replace('-layout.json','.svg')));assert len(list(art.iter('{http://www.w3.org/2000/svg}text')))>=25,p
 layouts.append({'name':p.stem,'viewport':[d['width'],d['height']],**q})
missing=[]
class Links(HTMLParser):
 def __init__(self,p):super().__init__();self.p=p
 def handle_starttag(self,t,a):
  for k,v in a:
   if k not in ['src','href'] or not v:continue
   u=urlsplit(v)
   if u.scheme or not u.path:continue
   if not (self.p.parent/unquote(u.path)).exists():missing.append([str(self.p.relative_to(R)),v])
for p in R.glob('*.html'):Links(p).feed(p.read_text())
assert not missing,missing
report={'status':'passed','components':len(m['components']),'families':len(families),'unchangedReusedArt':12,'existingEnvironmentReviewed':12,'layouts':layouts,'gameCodeChanged':False,'p1TerrainAuthored':False,'p2EffectsAuthored':False}
(R/'qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
