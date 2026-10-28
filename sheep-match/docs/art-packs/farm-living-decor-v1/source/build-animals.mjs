import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {sharp,components,cutComponent,median,svg,alphaBounds,footTip} from './raster.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const species=[
 {id:'duck',name:'奶油鸭',width:202,action:'walk',feet:[.32,.74],stride:24},
 {id:'rabbit',name:'棉尾兔',width:190,action:'hop',feet:[.32,.72],stride:34},
 {id:'goat',name:'花斑山羊',width:240,action:'walk',feet:[.48,.83],stride:32},
 {id:'alpaca',name:'云朵羊驼',width:190,action:'walk',feet:[.45,.82],stride:30},
 {id:'deer',name:'斑点小鹿',width:216,action:'walk',feet:[.52,.82],stride:32},
 {id:'fox',name:'蜜桃狐狸',width:254,action:'walk',feet:[.35,.70],stride:32}
];
const all=[];
for(const s of species){
 const source=path.join(root,'source/raw',s.id+'.png');try{await fs.access(source);}catch{continue;}
 const raw=await components(source);if(raw.groups.length!==12)throw Error(`${s.id}: ${raw.groups.length} components, expected 12`);
 raw.groups.sort((a,b)=>a.center[1]-b.center[1]);const groups=[];for(let row=0;row<3;row++)groups.push(...raw.groups.slice(row*4,row*4+4).sort((a,b)=>a.center[0]-b.center[0]));
 const scale=s.width/median(groups.map(g=>g.bounds[2]-g.bounds[0]));
 const folder=path.join(root,'animals',s.id);for(const sub of ['frames','sources','previews'])await fs.mkdir(path.join(folder,sub),{recursive:true});
 const records=[],buffers=[];
 for(let i=0;i<12;i++){
  const sourceIndex=s.id==='rabbit'?[0,8,1,9,2,10,3,11,4,5,6,7][i]:i;
  const c=await cutComponent(raw,groups[sourceIndex]);await fs.writeFile(path.join(folder,'sources',`${i.toString().padStart(2,'0')}.png`),c.png);
  const w=Math.round(c.rect[2]*scale),h=Math.round(c.rect[3]*scale);const scaled=await sharp(c.png).resize(w,h).png().toBuffer();
  const bounds=await alphaBounds(scaled);
  const feet=s.id==='rabbit'&&[2,3,4,10,11].includes(sourceIndex)?[.32,.91]:s.feet;
  const visible=await Promise.all(feet.map(f=>footTip(scaled,f*w,Math.max(6,w*.065))));
  const support=visible.reduce((a,b)=>!a||b[1]>a[1]?b:a,null);
  // New animals have no existing layout. Define anatomical ground from reviewed paw regions,
  // then keep a single scale per species; never resize each frame to its own bounding box.
  const lift=s.id==='rabbit'?[0,0,1,2,8,12,18,18,14,4,0,0][i]:0;
  const left=Math.round(180-(bounds[0]+bounds[2])/2),top=Math.round(230-support[1]-lift);
  if(left<0||top<0||left+w>360||top+h>280)throw Error(`Clipping ${s.id} ${i}`);
  const png=await sharp({create:{width:360,height:280,channels:4,background:'#00000000'}}).composite([{input:scaled,left,top}]).png().toBuffer();
  const file=`frames/${String(i).padStart(2,'0')}.png`;await fs.writeFile(path.join(folder,file),png);buffers.push(png);
  records.push({index:i,file,sourceRect:c.rect,sourceScale:scale,sourceOffset:[left,top],anchor:[180,230],visibleFootTips:visible.map(p=>[p[0]+left,p[1]+top]),groundSupport:lift>4?null:[support[0]+left,230-lift],airborne:lift>4,bounds:await alphaBounds(png),atlasRect:[i%4*364+2,Math.floor(i/4)*284+2,360,280],sha256:crypto.createHash('sha256').update(png).digest('hex')});
 }
 const atlasPixels=Buffer.alloc(1456*852*4);
 for(let i=0;i<buffers.length;i++){const data=await sharp(buffers[i]).ensureAlpha().raw().toBuffer(),x=i%4*364+2,y=Math.floor(i/4)*284+2;for(let row=0;row<280;row++)data.copy(atlasPixels,((y+row)*1456+x)*4,row*360*4,(row+1)*360*4);}
 await sharp(atlasPixels,{raw:{width:1456,height:852,channels:4}}).png().toFile(path.join(folder,'atlas.png'));
 await fs.copyFile(path.join(folder,'frames/00.png'),path.join(folder,'idle.png'));
 const shadow=svg(`<ellipse cx="180" cy="230" rx="${s.width*.34}" ry="15" fill="#796b4b" opacity=".16"/>`,360,280);
 await fs.writeFile(path.join(folder,'shadow.svg'),shadow);await sharp(Buffer.from(shadow)).png().toFile(path.join(folder,'shadow.png'));
 const labels=svg(records.map((r,i)=>`<g transform="translate(${i%4*360} ${Math.floor(i/4)*310})"><path d="M30 230H330" stroke="#cbd1ad"/><text x="16" y="296" fill="#746046" font-family="sans-serif" font-size="14">${s.id} / ${String(i).padStart(2,'0')} ${r.airborne?'airborne':''}</text>${r.visibleFootTips.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#c57765"/>`).join('')}</g>`).join(''),1440,930);
 await sharp({create:{width:1440,height:930,channels:4,background:'#eef0df'}}).composite([...buffers.map((input,i)=>({input,left:i%4*360,top:Math.floor(i/4)*310})),{input:Buffer.from(labels)}]).png().toFile(path.join(folder,'previews/contact-sheet.png'));
 const manifest={version:1,id:s.id,name:s.name,canvas:[360,280],anchor:[180,230],offset:[0,0],bodyWidth:s.width,direction:'elevated front-left',action:s.action,fps:12,durationMs:1000,loop:true,endFrameRepeated:false,atlas:'atlas.png',atlasSize:[1456,852],idle:'idle.png',idleNote:'Frame 00 held as a still; not an additional authored neutral pose.',shadow:'shadow.png',editableSource:'sources/editable.ora',stride:{pixelsPerCycle:[-s.stride,s.stride/2],note:'Initial integration recommendation; adjust velocity to planted-foot motion at the final display scale.'},contactMethod:'Visible underside pixels within manually reviewed paw/hoof regions; occluded feet omitted. Lifted visible feet are not ground support. New species ground reference is y=230.',frames:records};
 await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');all.push({id:s.id,name:s.name,type:'animal',action:s.action,manifest:`animals/${s.id}/manifest.json`,frameCount:12});
 console.log(s.id,12,'frames',`scale=${scale.toFixed(3)}`);
}
await fs.writeFile(path.join(root,'source/animals-index.json'),JSON.stringify(all,null,2)+'\n');
