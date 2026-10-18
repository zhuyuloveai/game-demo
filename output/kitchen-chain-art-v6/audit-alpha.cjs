const fs=require('fs'),path=require('path');
const sharp=require('/Users/zhuyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=__dirname;
(async()=>{
 const report=[];
 for(const file of fs.readdirSync(path.join(root,'records')).filter(n=>n.endsWith('.json')&&!n.endsWith('.error.json'))){
  const r=JSON.parse(fs.readFileSync(path.join(root,'records',file)));if(!r.processed)continue;
  const {data,info}=await sharp(path.join(root,r.source)).resize(160,160,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,seen=new Uint8Array(w*h),parts=[];
  for(let i=0;i<w*h;i++)if(!seen[i]&&data[i*4+3]>=48){
   const queue=[i];seen[i]=1;let minX=w,minY=h,maxX=0,maxY=0;
   for(let p=0;p<queue.length;p++){const at=queue[p],x=at%w,y=Math.floor(at/w);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    for(const n of [x>0?at-1:-1,x<w-1?at+1:-1,y>0?at-w:-1,y<h-1?at+w:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=48){seen[n]=1;queue.push(n);}
   }
   if(queue.length>1)parts.push({area:queue.length,box:[minX,minY,maxX,maxY]});
  }
  parts.sort((a,b)=>b.area-a.area);
  const [sw,sh]=r.processed.sourceSize,[x,y,cw,ch]=r.processed.crop;
  const touchesSource=x===0||y===0||x+cw===sw||y+ch===sh;
  const extra=parts.slice(1).filter(p=>p.area>=4);
  report.push({id:r.id,touchesSource,parts:parts.length,extra,needsInspection:touchesSource||extra.some(p=>p.area<parts[0].area*.025)});
 }
 fs.writeFileSync(path.join(root,'evidence','alpha-audit.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checked:report.length,flags:report.filter(r=>r.needsInspection)},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
