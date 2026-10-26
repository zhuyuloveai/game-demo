"""Package existing transparent exports as editable OpenRaster; no pixel edits."""
from pathlib import Path
import zipfile, xml.etree.ElementTree as ET
root=Path(__file__).resolve().parent
base=['01-ground','02-building-shadow','03-rear-fence','04-building']
for kind in ['empty','full']:
    layers=base+(['reference-animal-shadows']+[f'reference-cow-{i}' for i in range(1,6)] if kind=='full' else [])+['07-front-fence']
    image=ET.Element('image',{'w':'1200','h':'1000','name':'Cow shelter v2 '+kind,'version':'0.0.3'})
    stack=ET.SubElement(image,'stack')
    with zipfile.ZipFile(root/f'cow-{kind}.ora','w') as z:
        z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
        for name in reversed(layers):
            ET.SubElement(stack,'layer',{'name':name,'src':f'data/{name}.png','x':'0','y':'0','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
            z.write(root/'layers'/f'{name}.png',f'data/{name}.png',compress_type=zipfile.ZIP_DEFLATED)
        z.writestr('stack.xml',ET.tostring(image,encoding='utf-8',xml_declaration=True),compress_type=zipfile.ZIP_DEFLATED)
        z.write(root/'previews'/f'{kind}.png','mergedimage.png',compress_type=zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(root/f'cow-{kind}.ora') as z:
        assert z.read('mimetype')==b'image/openraster'
        assert len(ET.fromstring(z.read('stack.xml')).find('stack'))==len(layers)
        assert z.testzip() is None
    print(kind, len(layers),'editable layers')
