"""Encode existing PNG frames as WebP and OpenRaster; no new artwork or poses drawn."""
from pathlib import Path
from io import BytesIO
import json,zipfile,xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]

def ora(out,size,layers,merged):
    root=ET.Element('image',{'w':str(size[0]),'h':str(size[1]),'name':out.parent.parent.name})
    stack=ET.SubElement(root,'stack',{'name':'Editable layers'})
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
        for i,(name,file,visible) in enumerate(layers):
            target=f'data/layer-{i:02}.png';z.writestr(target,file.read_bytes())
            ET.SubElement(stack,'layer',{'name':name,'src':target,'x':'0','y':'0','opacity':'1.0','visibility':'visible' if visible else 'hidden','composite-op':'svg:src-over'})
        z.writestr('stack.xml',ET.tostring(root,encoding='utf-8',xml_declaration=True))
        z.writestr('mergedimage.png',merged.read_bytes())

for folder in sorted((ROOT/'animals').iterdir()):
    frames=[folder/'frames'/f'{i:02}.png' for i in range(12)]
    ora(folder/'sources/editable.ora',(360,280),[(f'Frame {i:02} — authored pixels',f,i==0) for i,f in enumerate(frames)]+[('Optional ground shadow',folder/'shadow.png',False)],frames[0])
    images=[Image.open(f).convert('RGBA') for f in frames]
    images[0].save(folder/'previews/action.webp',save_all=True,append_images=images[1:],duration=[83,83,84]*4,loop=0,lossless=True)

for folder in sorted((ROOT/'decor').iterdir()):
    ora(folder/'sources/editable.ora',(640,640),[('Moving elements — phase 0',folder/'layers/02-motion.png',True),('Building body',folder/'layers/01-base.png',True),('Optional ground shadow',folder/'layers/00-shadow.png',False)],folder/'preview.png')

animals=json.loads((ROOT/'source/animals-index.json').read_text())
decor=json.loads((ROOT/'source/decor-index.json').read_text())
manifest={'version':1,'title':'牧场的新邻居','baseCommit':'9df456b5f3064fbe5d7c7a46e3308598d82dcd5e','scope':'Art delivery and independent preview; game code unchanged.','animalSpecies':6,'animalFrames':72,'decorBuildings':4,'animals':animals,'decor':decor,'reused':'reused/manifest.json','generationLog':'source/generation-log.json','preview':'index.html'}
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Packaged 10 editable ORA, 6 animated WebP and master manifest.')
