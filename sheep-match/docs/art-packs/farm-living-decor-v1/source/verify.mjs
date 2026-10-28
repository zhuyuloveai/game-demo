import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {sharp,alphaBounds,svg} from './raster.mjs';
import {movingMarkup} from '../motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let assertions=0;const check=(ok,message)=>{assertions++;if(!ok)throw Error(message);};
const readJson=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const rgba=b=>sharp(b).ensureAlpha().raw().toBuffer();
const report={baseCommit:'9df456b',checks:[],animalLoops:[]};
const manifest=await readJson('manifest.json');check(manifest.animals.length===6,'six animals');check(manifest.decor.length===4,'four buildings');
for(const animal of manifest.animals){const m=await readJson(animal.manifest),dir=path.join(root,'animals',m.id);check(m.frames.length===12,m.id+' frame count');check(new Set(m.frames.map(f=>f.sha256)).size===12,m.id+' distinct frames');const pixels=[];
 for(const f of m.frames){const b=await fs.readFile(path.join(dir,f.file)),meta=await sharp(b).metadata();check(meta.width===360&&meta.height===280&&meta.hasAlpha,m.id+' RGBA canvas');check(hash(b)===f.sha256,m.id+' hash');const data=await rgba(b);pixels.push(data);const bounds=await alphaBounds(b);check(bounds[0]>0&&bounds[1]>0&&bounds[2]<360&&bounds[3]<280,m.id+' no clipping');
  for(const[x,y]of f.visibleFootTips)check(data[(y*360+x)*4+3]>=96,m.id+' true visible foot pixel');
  if(f.groundSupport){const[x,y]=f.groundSupport;check(data[(y*360+x)*4+3]>=96,m.id+' support on silhouette');}
  const[x,y,width,height]=f.atlasRect;const tile=await sharp(path.join(dir,m.atlas)).extract({left:x,top:y,width,height}).raw().toBuffer();check(tile.equals(data),m.id+' atlas content');
 }
 const diff=(a,b)=>{let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/(a.length*255);};
 const adjacent=pixels.map((a,i)=>diff(a,pixels[(i+1)%12]));report.animalLoops.push({id:m.id,maxAdjacentDifference:Math.max(...adjacent),seamDifference:adjacent[11],method:'mean normalized RGBA absolute difference; diagnostic, not a claim of zero flicker'});
 const shadow=await sharp(path.join(dir,'shadow.png')).metadata();check(shadow.width===360&&shadow.height===280&&shadow.hasAlpha,m.id+' independent shadow');
 check((await fs.stat(path.join(dir,m.editableSource))).size>0,m.id+' editable ORA');check((await sharp(path.join(dir,'previews/action.webp'),{animated:true}).metadata()).pages===12,m.id+' webp 12 frames');
}
report.checks.push('72 independent transparent frames; hashes, real foot pixels, canvas bounds, atlas rectangles/content, 6 WebP loops and 6 ORA sources');
for(const decor of manifest.decor){const m=await readJson(decor.manifest),dir=path.join(root,'decor',m.id);for(const layer of m.layers){const meta=await sharp(path.join(dir,layer.file)).metadata();check(meta.width===640&&meta.height===640&&meta.hasAlpha,m.id+' aligned layer');const bounds=await alphaBounds(path.join(dir,layer.file));check(bounds[0]>0&&bounds[1]>0&&bounds[2]<640&&bounds[3]<640,m.id+' clear edges');}
 const refs={};if(m.wheel)refs.wheel='data:image/png;base64,'+(await fs.readFile(path.join(dir,m.wheel.source))).toString('base64');if(m.bee)refs.bee='data:image/png;base64,'+(await fs.readFile(path.join(dir,m.bee.source))).toString('base64');
 const a=await rgba(Buffer.from(svg(movingMarkup(m.id,0,refs)))),b=await rgba(Buffer.from(svg(movingMarkup(m.id,1,refs))));check(a.equals(b),m.id+' motion exact 0/1 seam');
 const phases=[];for(let i=0;i<12;i++)phases.push(hash(await fs.readFile(path.join(dir,'previews',`phase-${String(i).padStart(2,'0')}.png`))));check(new Set(phases).size>=6,m.id+' moving diagnostic phases');
 const source=await fs.readFile(path.join(dir,m.editableSource),'utf8');check(!/href="(?!data:)/.test(source),m.id+' embedded SVG');check((await fs.stat(path.join(dir,m.editableRaster))).size>0,m.id+' editable ORA');
}
report.checks.push('4 aligned building kits; independent alpha layers, editable SVG/ORA, transparent margins, dynamic phase differences and exact continuous loop endpoints');
for(const item of await readJson('reused/manifest.json'))check(hash(await fs.readFile(path.join(root,item.file)))===item.sha256,'reused source unchanged '+item.file);
const repo=path.resolve(root,'../../../..');for(const item of await readJson('reused/manifest.json'))check(hash(await fs.readFile(path.join(repo,item.source)))===item.sha256,'original source same '+item.source);
report.checks.push('8 reused assets are byte-identical to current main sources');
report.assertions=assertions;report.result='PASS';await fs.writeFile(path.join(root,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(`PASS: ${assertions} assertions`);
