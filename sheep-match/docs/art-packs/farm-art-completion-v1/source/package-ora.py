"""Package existing layer PNGs into editable OpenRaster documents (no pixel editing)."""
from pathlib import Path
import json,zipfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
def ora(path,size,layers,preview):
 image=ET.Element('image',w=str(size[0]),h=str(size[1]),name=path.stem,version='0.0.3');stack=ET.SubElement(image,'stack')
 with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
  for i,(name,file) in enumerate(reversed(layers)):
   loc=f'data/layer-{i:02}.png';z.write(file,loc);ET.SubElement(stack,'layer',name=name,src=loc,x='0',y='0',opacity='1.0',visibility='visible',**{'composite-op':'svg:src-over'})
  z.writestr('stack.xml',ET.tostring(image,encoding='utf-8',xml_declaration=True));z.write(preview,'mergedimage.png')
for sp in ['chicken','sheep']:
 d=ROOT/'skins'/sp;m=json.loads((d/'layout.json').read_text());layers=[(x,d/'layers'/f'{x}.png') for x in m['layerOrder'] if x!='reference-animals'];ora(d/'editable.ora',[1200,1000],layers,d/'previews/empty.png')
for s in json.loads((ROOT/'machines-manifest.json').read_text())['sets']:
 d=ROOT/s['path'];m=json.loads((d/'manifest.json').read_text());ora(d/'editable.ora',m['canvas'],[(x['id'],d/x['png']) for x in m['layers']],d/'previews/phase-00.png')
print('7 editable ORA documents packaged; SVG vector flower/shuttle sources also retained.')
