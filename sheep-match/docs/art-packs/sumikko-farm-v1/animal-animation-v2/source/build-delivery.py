"""Slice authored RGBA sheets; align, annotate and package. No new poses are synthesized."""
from pathlib import Path
from collections import deque
from statistics import median
from io import BytesIO
import base64, hashlib, json, zipfile, xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT.parent
SPECIES = ['cow', 'pig', 'sheep', 'lamb']
CANVAS = (360, 280)
ANCHOR = (180, 230)
# Visually reviewed hoof regions in the first normalized pass. Occluded feet
# are omitted explicitly; a lowered nose must never become a hoof annotation.
HOOF_X = {
 'cow': {
  'eat': [[134,180,255],[131,180,250],[180,250],[213,286],[218,285],[218,285],[218,285],[218,285],[134,180,255],[134,180,255],[134,180,255],[134,180,255]],
  'walk': [[120,165,258],[137,265],[143,270],[138,166,252,273],[126,155,250],[117,180,248,275],[125,175,270],[125,165,260],[124,170,252],[143,170,251],[139,164,263],[122,172,257]]},
 'pig': {
  'eat': [[118,180,264],[118,180,264],[180,264],[180,264],[180,264],[180,264],[180,264],[180,264],[118,180,264],[118,180,264],[118,180,264],[118,180,264]],
  'walk': [[130,193,284],[131,176,282],[134,194,284],[132,177,281],[134,194,282],[154,248,293],[134,174,283],[139,173,283],[134,176,283],[135,202,284],[126,197,284],[131,196,284]]},
 'sheep': {
  'eat': [[116,180,272],[116,180,272],[180,272],[180,272],[180,272],[180,272],[180,272],[180,272],[116,180,276],[116,180,272],[116,180,272],[116,180,272]],
  'walk': [[101,177,273],[109,166,263],[112,176,277],[114,168,275],[117,156,272],[101,176,262],[121,166,277],[100,177,276],[116,170,266],[122,176,263],[118,169,277],[100,177,276]]},
 'lamb': {
  'eat': [[140,180,246],[140,180,246],[180,246],[180,246],[180,246],[180,246],[180,246],[180,246],[140,180,246],[140,180,246],[140,180,246],[140,180,246]],
  'walk': [[128,186,246],[142,244],[144,187,244],[133,171,246],[141,188,250],[142,254],[128,189,265],[145,252],[143,252],[137,175,257],[141,198,261],[126,191,251]]}
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def components(im, threshold=64):
    w,h=im.size; mask=bytearray(v>=threshold for v in im.getchannel('A').tobytes()); groups=[]
    for pos in range(w*h):
        if not mask[pos]: continue
        mask[pos]=0; stack=[pos]; pixels=[]
        while stack:
            q=stack.pop(); pixels.append(q); x=q%w; y=q//w
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                k=ny*w+nx
                if 0<=nx<w and 0<=ny<h and mask[k]: mask[k]=0;stack.append(k)
        if len(pixels)>5000:
            xs=[p%w for p in pixels];ys=[p//w for p in pixels]
            groups.append({'pixels':pixels,'bounds':[min(xs),min(ys),max(xs)+1,max(ys)+1], 'center':[sum(xs)/len(xs),sum(ys)/len(ys)]})
    return groups

def solid_bounds(im):
    return im.getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()

def contact(im, x, radius=14):
    """Find actual opaque underside in an annotated hoof region, never canvas bottom."""
    alpha=im.getchannel('A'); pts=[]
    for xx in range(max(0,round(x-radius)),min(im.width,round(x+radius)+1)):
        for yy in range(im.height-1,-1,-1):
            if alpha.getpixel((xx,yy))>=96:
                pts.append((xx,yy));break
    if not pts: return None
    bottom=max(y for x,y in pts)
    band=[x for x,y in pts if y>=bottom-1]
    center=sum(band)/len(band)
    # Choose a real boundary pixel; the mean can land in a transparent gap.
    exact=[x for x,y in pts if y==bottom]
    return [min(exact,key=lambda x:abs(x-center)),bottom]

def contact_sheet(frames, records, out):
    sheet=Image.new('RGB',(1440,3*320),'#eef0d9');draw=ImageDraw.Draw(sheet)
    for i,im in enumerate(frames):
        x=(i%4)*360;y=(i//4)*320
        draw.line((x+15,y+230,x+345,y+230),fill='#c6cbb5')
        sheet.paste(im,(x,y),im)
        for p in records[i]['visibleHoofTips']:
            xx,yy=p;draw.ellipse((x+xx-3,y+yy-3,x+xx+3,y+yy+3),fill='#a25c51')
        draw.line((x+174,y+230,x+186,y+230),fill='#356857',width=2)
        draw.line((x+180,y+224,x+180,y+236),fill='#356857',width=2)
        draw.text((x+16,y+286),f'{i:02}  root 180,230  |  red: visible hoof tips',fill='#6e5943')
    sheet.save(out)

def make_ora(species,action,frames,shadow,path):
    root=ET.Element('image',{'w':'360','h':'280','name':f'{species}-{action}'})
    stack=ET.SubElement(root,'stack',{'name':'Frames - show one group at a time'})
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
        for i,im in enumerate(frames):
            group=ET.SubElement(stack,'stack',{'name':f'Frame {i:02} / {i/12:.3f}s','visibility':'visible' if i==0 else 'hidden','opacity':'1.0','composite-op':'svg:src-over'})
            f=f'data/frame-{i:02}.png';b=BytesIO();im.save(b,format='PNG');z.writestr(f,b.getvalue())
            ET.SubElement(group,'layer',{'name':'Authored animal RGBA - editable pixels','src':f,'x':'0','y':'0','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
        b=BytesIO();shadow.save(b,format='PNG');z.writestr('data/shadow.png',b.getvalue())
        ET.SubElement(stack,'layer',{'name':'Ground shadow - optional independent layer','src':'data/shadow.png','x':'0','y':'0','visibility':'hidden','opacity':'1.0','composite-op':'svg:src-over'})
        z.writestr('stack.xml',ET.tostring(root,encoding='utf-8',xml_declaration=True))
        b=BytesIO();frames[0].save(b,format='PNG');z.writestr('mergedimage.png',b.getvalue())
        thumb=frames[0].copy();thumb.thumbnail((256,256));b=BytesIO();thumb.save(b,format='PNG');z.writestr('Thumbnails/thumbnail.png',b.getvalue())

def main():
    summary=[]
    for species in SPECIES:
        folder=ROOT/species;src=folder/'sources';layout=json.loads((src/'reference-layout.json').read_text())
        hungry=next(a for a in layout['animals'] if a['state']=='hungry')
        reference=Image.open(src/'reference-hungry.png').convert('RGBA');rb=solid_bounds(reference)
        target_width=rb[2]-rb[0]
        shadow_src=PACK/f'shelter-layers-v2/{species}/animals/{species}-hungry-shadow.png'
        shadow=Image.open(shadow_src).convert('RGBA');(folder/'shadows').mkdir(exist_ok=True);shadow.save(folder/'shadows/ground-shadow.png')
        manifest={'version':1,'species':species,'baseCommit':'0a8363f','canvas':list(CANVAS),'anchor':list(ANCHOR),'offset':[0,0],'direction':'front-left elevated three-quarter; mirror x for other side','originalHungryContacts':hungry['normalizedContacts'],'groundShadow':'shadows/ground-shadow.png','sourceLayout':'sources/reference-layout.json','actions':{},'integration':'Art delivery only; runtime code unchanged.'}
        actions={}
        for action in ['eat','walk']:
            raw=Image.open(src/f'{action}-generated-atlas.png').convert('RGBA');groups=components(raw)
            assert len(groups)==12,(species,action,len(groups))
            groups.sort(key=lambda g:g['center'][1]);ordered=[]
            for row in range(3):ordered.extend(sorted(groups[row*4:row*4+4],key=lambda g:g['center'][0]))
            width=median(g['bounds'][2]-g['bounds'][0] for g in ordered);scale=target_width/width
            # Anatomical root's horizontal relation comes from approved reference contacts.
            root_fraction=(180-rb[0])/target_width
            y_reference=median(g['bounds'][1] for g in ordered[:4])
            frame_dir=folder/'frames'/action;frame_dir.mkdir(parents=True,exist_ok=True)
            slice_dir=src/'slices';slice_dir.mkdir(exist_ok=True)
            previews=folder/'previews';previews.mkdir(exist_ok=True)
            atlases=folder/'atlases';atlases.mkdir(exist_ok=True)
            frames=[];records=[]
            for index,g in enumerate(ordered):
                x0,y0,x1,y1=g['bounds'];w=x1-x0;h=y1-y0
                # Component mask retains source antialiasing and removes detached low-alpha noise.
                mask=Image.new('L',raw.size);mask.putdata([0]* (raw.width*raw.height))
                md=mask.load()
                for q in g['pixels']:md[q%raw.width,q//raw.width]=255
                mask=mask.filter(ImageFilter.MaxFilter(5))
                box=(max(0,x0-2),max(0,y0-2),min(raw.width,x1+2),min(raw.height,y1+2))
                tile=raw.crop(box);tile.putalpha(ImageChops.multiply(tile.getchannel('A'),mask.crop(box)))
                tile.save(slice_dir/f'{action}-{index:02}.png')
                sw,sh=tile.size;scaled=tile.resize((round(sw*scale),round(sh*scale)),Image.Resampling.LANCZOS)
                root_x=(2+root_fraction*width)*scale
                # Near-front hoof is explicitly located on the actual source silhouette.
                near=contact(scaled,root_x,18)
                assert near is not None
                if action=='eat':
                    tx=round(180-near[0]);ty=round(230-near[1])
                else:
                    # Fixed torso/top alignment leaves moving feet free to describe the gait.
                    tx=round(rb[0]-2*scale);ty=round(rb[1]-2*scale)
                canvas=Image.new('RGBA',CANVAS);canvas.alpha_composite(scaled,(tx,ty))
                seeds=HOOF_X[species][action][index]
                correction=[0,0]
                if species=='cow' and action=='eat':
                    # The lowered muzzle can overlap the near-front hoof region.
                    # Use the visible rear hoof instead, aligned to its real reference contact.
                    rear=contact(canvas,seeds[-1],10)
                    target=hungry['normalizedContacts'][-1]
                    correction=[round(target[0]-rear[0]),round(target[1]-rear[1])]
                    tx+=correction[0];ty+=correction[1]
                    canvas=Image.new('RGBA',CANVAS);canvas.alpha_composite(scaled,(tx,ty))
                bounds=solid_bounds(canvas);assert bounds and bounds[0]>0 and bounds[1]>=0 and bounds[2]<360 and bounds[3]<280,(species,action,index,bounds)
                contacts=[]
                for x in seeds:
                    c=contact(canvas,x+correction[0],8)
                    if c and not any(abs(c[0]-o[0])<10 and abs(c[1]-o[1])<4 for o in contacts):contacts.append(c)
                f=frame_dir/f'{index:02}.png';canvas.save(f)
                record={'index':index,'file':str(f.relative_to(folder)),'sourceRect':[box[0],box[1],sw,sh],'sourceScale':round(scale,6),'sourceOffset':[tx,ty],'anchor':[180,230],'visibleHoofTips':contacts,'contactMethod':'Opaque hoof underside in visually reviewed per-frame anatomical regions. Occluded feet omitted. Walking tips may be raised, not all are ground support points.','bounds':list(bounds),'sha256':digest(f)}
                if action=='eat':
                    record['supportAnchor']=contact(canvas,seeds[-1]+correction[0],10) if species=='cow' else [round(near[0]+tx,2),near[1]+ty]
                    record['supportTarget']=hungry['normalizedContacts'][-1] if species=='cow' else [180,230]
                record['atlasRect']=[(index%4)*364+2,(index//4)*284+2,360,280]
                frames.append(canvas);records.append(record)
            atlas=Image.new('RGBA',(1456,852))
            for i,f in enumerate(frames):atlas.alpha_composite(f,((i%4)*364+2,(i//4)*284+2))
            atlas.save(atlases/f'{species}-{action}.png')
            frames[0].save(previews/f'{action}.webp',save_all=True,append_images=frames[1:],duration=[83,83,84]*4,loop=0,lossless=True)
            contact_sheet(frames,records,previews/f'{action}-contact-sheet.png')
            make_ora(species,action,frames,shadow,src/f'{species}-{action}.ora')
            actions[action]=frames
            manifest['actions'][action]={'fps':12,'frameCount':12,'durationMs':1000,'loop':action=='walk','previewLoop':True,'endFrameRepeated':False,'atlas':f'atlases/{species}-{action}.png','atlasCanvas':[1456,852],'editableSource':f'sources/{species}-{action}.ora','frames':records}
            assert len({r['sha256'] for r in records})==12
            print(species,action,'12 unique RGBA frames; width scale',round(scale,3))
        manifest['walkTravel']={'suggestedPixelsPerCycle':[-32,16],'cycleMs':1000,'stepsPerCycle':2,'speedScaling':'Multiply root displacement by display scale; movement belongs to game code.','note':'Initial stride recommendation. Visible contact samples are provided for final in-engine slip tuning; no frame claims mathematically zero slip.'}
        (folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        comparison=Image.new('RGB',(1080,560),'#eef0d9');d=ImageDraw.Draw(comparison)
        for i,state in enumerate(['hungry','producing','ready']):
            im=Image.open(src/f'reference-{state}.png').convert('RGBA');comparison.paste(im,(i*360,0),im);d.text((i*360+12,248),'Original '+state,fill='#725642')
        for i,(action,index) in enumerate([('eat',0),('eat',5),('walk',3)]):
            im=actions[action][index];comparison.paste(im,(i*360,280),im);d.text((i*360+12,528),f'New {action} {index:02}',fill='#725642')
        comparison.save(folder/'previews/reference-comparison.png')
        summary.append({'species':species,'manifest':f'{species}/manifest.json','frames':24,'referenceBodyWidth':target_width})
    (ROOT/'manifest.json').write_text(json.dumps({'version':1,'species':summary,'totalFrames':96,'fps':12,'canvas':[360,280],'anchor':[180,230]},indent=2)+'\n')

if __name__=='__main__':main()
