"""OpenRaster packaging of existing PNG layers; does not edit pixels."""
from pathlib import Path
import json,zipfile,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parent
for ident in ['cow','pig','sheep','lamb','chicken']:
 d=root/ident;m=json.loads((d/'layout.json').read_text())
 for kind in ['empty','full']:
  names=m['layerOrder'] if kind=='full' else [n for n in m['layerOrder'] if not n.startswith('reference-')]
  image=ET.Element('image',{'w':'1200','h':'1000','name':m.get('name',ident)+' '+kind,'version':'0.0.3'});stack=ET.SubElement(image,'stack')
  with zipfile.ZipFile(d/f'{ident}-{kind}.ora','w') as z:
   z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
   for name in reversed(names):
    ET.SubElement(stack,'layer',{'name':name,'src':f'data/{name}.png','x':'0','y':'0','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
    z.write(d/'layers'/f'{name}.png',f'data/{name}.png',compress_type=zipfile.ZIP_DEFLATED)
   z.writestr('stack.xml',ET.tostring(image,encoding='utf-8',xml_declaration=True),compress_type=zipfile.ZIP_DEFLATED)
   z.write(d/'previews'/f'{kind}.png','mergedimage.png',compress_type=zipfile.ZIP_DEFLATED)
  with zipfile.ZipFile(d/f'{ident}-{kind}.ora') as z:
   assert z.testzip() is None
   assert len(ET.fromstring(z.read('stack.xml')).find('stack'))==len(names)
   assert z.read('mergedimage.png')==(d/'previews'/f'{kind}.png').read_bytes()
  print(ident,kind,len(names),'layers OK')
