// Explicit per-object crops; no equal-cell atlas slicing. Sources remain immutable.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.SHARP_MODULE||'/Users/zhuyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'slices');
const manifest=[];
async function slice(id,file,region,options={}){
 const input=sharp(path.join(root,file)).ensureAlpha();const meta=await input.metadata();
 if(region)input.extract({left:region[0],top:region[1],width:region[2],height:region[3]});
 const {data,info}=await input.raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=info;
 // Find connected opaque artwork. Keep the original antialiasing within 3 source pixels.
 // This removes detached alpha speckles; it does not paint new object edges.
 const seen=new Uint8Array(w*h),keep=new Uint8Array(w*h),q=new Int32Array(w*h);let best=[];
 if(!options.opaque){for(let i=0;i<w*h;i++){if(seen[i]||data[i*4+3]<64)continue;let head=0,tail=1;q[0]=i;seen[i]=1;while(head<tail){const p=q[head++],x=p%w;for(const n of [x?p-1:-1,x<w-1?p+1:-1,p>=w?p-w:-1,p+w<w*h?p+w:-1]){if(n>=0&&!seen[n]&&data[n*4+3]>=64){seen[n]=1;q[tail++]=n}}}if(tail>best.length)best=Array.from(q.subarray(0,tail));}
 for(const p of best){const x=p%w,y=(p/w)|0;for(let yy=Math.max(0,y-3);yy<=Math.min(h-1,y+3);yy++)for(let xx=Math.max(0,x-3);xx<=Math.min(w-1,x+3);xx++)keep[yy*w+xx]=1;}}
 let x0=w,y0=h,x1=-1,y1=-1,removed=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,k=i*4;if(!options.opaque&&!keep[i]){if(data[k+3])removed++;data[k+3]=0;}if(data[k+3]>=16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}}
 const pad=options.opaque?0:5;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);
 const crop=[x0,y0,x1-x0+1,y1-y0+1];
 await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:crop[0],top:crop[1],width:crop[2],height:crop[3]}).png().toFile(path.join(out,id+'.png'));
 await sharp(path.join(out,id+'.png')).resize({width:options.max||384,height:options.max||384,fit:'inside',withoutEnlargement:true}).webp({lossless:true}).toFile(path.join(out,id+'.webp'));
 manifest.push({id,source:file,sourceSize:[meta.width,meta.height],manualRegion:region||[0,0,w,h],cropInSource:[crop[0]+(region?.[0]||0),crop[1]+(region?.[1]||0),crop[2],crop[3]],removedDetachedOrLowAlphaPixels:removed,pivot:[.5,.96],...options});
}
(async()=>{fs.mkdirSync(out,{recursive:true});
 const ids=['puppy','book','drawer','phone','radio','energy','pig','stars','candy','gift','customer','wheat','flour','tomato','orange','strawberry','bread','bowl','whisk','saucepan','producer','deer','bear','panda'];
 for(const id of ids)await slice(id,'sources/'+id+'-source.png',null,{max:512});
 // Inspected coordinates in the 1047 x 1503 candidate sheet.
 const pm=await sharp(path.join(root,'panels-source.png')).metadata();console.log('panel dimensions',pm.width,pm.height);
 await slice('main-card','panels-source.png',[30,55,990,405],{max:1024,textSafe:[.08,.34,.84,.52],badgeSafe:[.13,.05,.20,.18]});
 await slice('order-card','panels-source.png',[32,520,984,370],{max:1024,textSafe:[.06,.12,.88,.76]});
 await slice('detail-plate','panels-source.png',[28,955,990,190],{max:1024,textSafe:[.04,.15,.92,.70]});
 await slice('resource-plate','panels-source.png',[240,1210,565,230],{max:512,textSafe:[.10,.20,.80,.60]});
 await slice('cell-original','cell-source.png',null,{opaque:true,max:192,displaySize:[48,48],innerOpening:[.09,.09,.82,.82]});
 await slice('cell','sources/cell-v2-source.png',null,{opaque:true,max:192,displaySize:[48,48],innerOpening:[.065,.065,.87,.87]});
 // Architectural strips: horizontal stretching only for blank backing, never sprites/cells.
 const env=path.join(root,'environment-source.png');
 const pieces={environment_top:[0,0,941,302],environment_detail:[0,302,941,83],environment_board:[0,385,941,985],environment_ledge:[0,1370,941,66],environment_bottom:[0,1436,941,183]};
 for(const [id,r]of Object.entries(pieces)){await sharp(env).extract({left:r[0],top:r[1],width:r[2],height:r[3]}).png().toFile(path.join(out,id+'.png'));await sharp(env).extract({left:r[0],top:r[1],width:r[2],height:r[3]}).webp({quality:95}).toFile(path.join(out,id+'.webp'));manifest.push({id,source:'environment-source.png',cropInSource:r});}
 require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'prepare-unified-board.cjs')]);
 manifest.find(a=>a.id==='cell').status='superseded by continuous board';
 manifest.push({id:'board-unified',source:'sources/board-unified-v1-source.png',sourceSize:[1060,1484],registration:'board-registration.json',outputSize:[924,1188],recommendedBox:[308,396],sharedDividerWidth:2,cellPitch:44,grid:[7,9],usage:'Single opaque background; 63 transparent interactive cells'});
 const layout=JSON.parse(fs.readFileSync(path.join(root,'asset-layout.json'))).assets;for(const a of manifest)Object.assign(a,layout[a.id]||{});
 fs.writeFileSync(path.join(root,'asset-manifest.json'),JSON.stringify({policy:'original RGB + generated alpha; remove detached alpha noise; keep 3px antialias perimeter; 5px transparent gutter. PNG masters and lossless WebP runtime.',assets:manifest},null,2)+'\n');
 console.log('prepared',manifest.length,'assets');
})().catch(e=>{console.error(e);process.exit(1)});
