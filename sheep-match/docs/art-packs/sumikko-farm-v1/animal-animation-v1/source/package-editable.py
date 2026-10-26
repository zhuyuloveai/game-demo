"""Package existing art layers into OpenRaster and animated review WebP. No repainting."""
from pathlib import Path
from PIL import Image
import io,json,zipfile,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parent.parent
C=R/'chicken'
m=json.loads((C/'manifest.json').read_text())
for action in m['actions']:
    name=action['id'];root=ET.Element('image',{'w':'360','h':'280','name':f'chicken-{name} · 12fps','version':'0.0.3'});stack=ET.SubElement(root,'stack',{'name':f'{name} / frames 00–11 / 12fps'})
    entries={}
    for f in reversed(action['frames']):
        group=ET.SubElement(stack,'stack',{'name':f'frame-{f["index"]:02d} · 83.333 ms','visibility':'visible' if f['index']==0 else 'hidden','opacity':'1.0','composite-op':'svg:src-over','isolation':'isolate'})
        for l in reversed(f['layers']):
            src='data/'+Path(l['file']).name;entries[src]=(C/l['file']).read_bytes()
            ET.SubElement(group,'layer',{'name':l['name'],'src':src,'x':'0','y':'0','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
    shadow='data/independent-shadow.png';entries[shadow]=(C/'shadows/ground-shadow.png').read_bytes()
    ET.SubElement(stack,'layer',{'name':'ground-shadow / independent / hidden','src':shadow,'x':'0','y':'0','opacity':'1.0','visibility':'hidden','composite-op':'svg:src-over'})
    with zipfile.ZipFile(C/f'sources/chicken-{name}.ora','w',compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
        z.writestr('stack.xml',ET.tostring(root,encoding='utf-8',xml_declaration=True))
        for p,b in entries.items():z.writestr(p,b)
        z.writestr('mergedimage.png',(C/action['frames'][0]['file']).read_bytes())
        thumb=Image.open(C/action['frames'][0]['file']);thumb.thumbnail((256,256));bio=io.BytesIO();thumb.save(bio,format='PNG');z.writestr('Thumbnails/thumbnail.png',bio.getvalue())
    frames=[Image.open(C/f['file']).convert('RGBA') for f in action['frames']]
    frames[0].save(C/f'previews/{name}.webp',save_all=True,append_images=frames[1:],duration=[83,83,84]*4,loop=0,lossless=True,method=6)
print('Packaged 2 editable OpenRaster sources and 2 lossless animated WebP previews.')
