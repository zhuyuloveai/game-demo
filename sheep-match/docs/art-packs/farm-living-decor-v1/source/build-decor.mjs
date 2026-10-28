import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sharp,components,cutComponent,svg,alphaBounds} from './raster.mjs';
import {movingMarkup,decorTiming} from '../motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const specs=[{id:'watermill',name:'溪畔水车小屋',footprint:[4,3],description:'独立转轮，9 秒一圈'},{id:'gazebo',name:'花藤凉亭',footprint:[3,3],description:'四枚彩旗轻摆，3.6 秒循环'},{id:'lily-fountain',name:'睡莲喷泉',footprint:[3,3],description:'两股细水流与水面涟漪，1.8 秒循环'},{id:'apiary',name:'蜂蜜小屋',footprint:[3,3],description:'两只蜜蜂绕巢飞行，5.2 秒循环'}];
const dataUri=b=>'data:image/png;base64,'+b.toString('base64');
async function clean(id){const r=await components(path.join(root,'source/raw',id+'.png'));if(r.groups.length!==1)throw Error(id+' component mismatch');return cutComponent(r,r.groups[0]);}
const wheel=await clean('waterwheel-part'),bee=await clean('bee-part');
const wp=await sharp(wheel.png).resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer();
const bp=await sharp(bee.png).resize(128,128,{fit:'contain',background:'#00000000'}).png().toBuffer();
for(const spec of specs){
 const dir=path.join(root,'decor',spec.id);for(const sub of ['layers','previews','sources'])await fs.mkdir(path.join(dir,sub),{recursive:true});
 const c=await clean(spec.id);const ratio=Math.min(480/c.rect[2],480/c.rect[3]);const w=Math.round(c.rect[2]*ratio),h=Math.round(c.rect[3]*ratio),left=Math.round(320-w/2),top=560-h;
 const base=await sharp({create:{width:640,height:640,channels:4,background:'#00000000'}}).composite([{input:await sharp(c.png).resize(w,h).png().toBuffer(),left,top}]).png().toBuffer();
 await fs.writeFile(path.join(dir,'layers/01-base.png'),base);
 if(spec.id==='watermill')await fs.writeFile(path.join(dir,'sources/wheel-local.png'),wp);
 if(spec.id==='apiary')await fs.writeFile(path.join(dir,'sources/bee-local.png'),bp);
 const refs={wheel:dataUri(wp),bee:dataUri(bp)};
 const moving=svg(movingMarkup(spec.id,0,refs));await fs.writeFile(path.join(dir,'layers/02-motion.svg'),moving);
 const overlay=await sharp(Buffer.from(moving)).png().toBuffer();await fs.writeFile(path.join(dir,'layers/02-motion.png'),overlay);
 const shadowSvg=svg('<ellipse cx="320" cy="495" rx="198" ry="68" fill="#6b654e" opacity=".13"/>');
 await fs.writeFile(path.join(dir,'layers/00-shadow.svg'),shadowSvg);await sharp(Buffer.from(shadowSvg)).png().toFile(path.join(dir,'layers/00-shadow.png'));
 const baseTag=`<image id="building-base" href="${dataUri(base)}" width="640" height="640"/>`;
 const editable=svg(`<g id="optional-ground-shadow" opacity="0"><ellipse cx="320" cy="495" rx="198" ry="68" fill="#6b654e" opacity=".13"/></g>${baseTag}<g id="moving-components">${movingMarkup(spec.id,0,refs)}</g>`);
 await fs.writeFile(path.join(dir,'sources/editable.svg'),editable);
 const phases=[];
 for(let i=0;i<12;i++){
  const markup=svg(baseTag+movingMarkup(spec.id,i/12,refs));const png=await sharp(Buffer.from(markup)).png().toBuffer();await fs.writeFile(path.join(dir,'previews',`phase-${String(i).padStart(2,'0')}.png`),png);phases.push(png);
 }
 await fs.writeFile(path.join(dir,'preview.png'),phases[0]);
 await sharp({create:{width:1280,height:960,channels:4,background:'#eef0df'}}).composite(await Promise.all(phases.map(async(input,i)=>({input:await sharp(input).resize(320,320).png().toBuffer(),left:i%4*320,top:Math.floor(i/4)*320})))).png().toFile(path.join(dir,'previews/contact-sheet.png'));
 const manifest={version:1,...spec,canvas:[640,640],anchor:[320,470],offset:[0,0],groundPolygon:[[320,380],[500,470],[320,560],[140,470]],recommendedDisplayWidth:220,sourceRect:c.rect,sourceScale:ratio,sourceOffset:[left,top],baseBounds:await alphaBounds(base),layers:[{id:'shadow',file:'layers/00-shadow.png',optional:true},{id:'base',file:'layers/01-base.png'},{id:'motion',file:'layers/02-motion.png',source:'layers/02-motion.svg'}],editableSource:'sources/editable.svg',editableRaster:'sources/editable.ora',periodMs:decorTiming[spec.id],motionSource:'../../motion.mjs',motionNote:'12 preview phases are diagnostic samples, not a 12-fps runtime atlas. Render transforms continuously using periodMs.',occlusion:'moving components over building; animals remain separate world objects and must be depth-sorted.',integration:'Decorative art only; no economy, unlock costs, UI or runtime behavior added.'};
 if(spec.id==='watermill'){manifest.wheel={pivot:[427,435],localCanvas:[256,256],localPivot:[128,128],size:210,projection:[.8,-.4,0,1],source:'sources/wheel-local.png',order:'rotate in local circular plane, then apply projection, then translate to pivot'};manifest.groundPolygon=[[290,365],[545,492],[350,590],[95,462]];}
 if(spec.id==='gazebo')manifest.pennantPivots=[[190,320],[235,335],[280,345],[325,348]];
 if(spec.id==='lily-fountain')manifest.nozzle=[329,187];
 if(spec.id==='apiary')manifest.bee={source:'sources/bee-local.png',localCanvas:[128,128],localPivot:[64,64],motion:'two translated flight paths; source wings are static, not a wingbeat frame sequence'};
 await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(spec.id,'base + independent motion + optional shadow');
}
await fs.writeFile(path.join(root,'source/decor-index.json'),JSON.stringify(specs.map(s=>({...s,type:'decor',manifest:`decor/${s.id}/manifest.json`})),null,2)+'\n');
