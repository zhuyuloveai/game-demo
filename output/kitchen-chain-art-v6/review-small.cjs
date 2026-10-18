const fs=require('fs'),path=require('path');
const sharp=require('/Users/zhuyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=__dirname,jobs=JSON.parse(fs.readFileSync(path.join(root,'jobs.json'))),out=path.join(root,'evidence','44px');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const pages=[];
 for(let page=0;page<Math.ceil(jobs.length/50);page++){
  const entries=jobs.slice(page*50,page*50+50),layers=[];
  let bg=`<svg width="1280" height="570" xmlns="http://www.w3.org/2000/svg"><rect width="1280" height="570" fill="#f8f3e8"/><text x="16" y="25" font-size="16" font-family="sans-serif" fill="#665344">44px check ${page+1} / ${Math.ceil(jobs.length/50)} — Classic | 3D</text>`;
  for(let n=0;n<entries.length;n++){
   const j=entries[n],x=(n%10)*128,y=45+Math.floor(n/10)*102;
   bg+=`<text x="${x+8}" y="${y+13}" font-size="${j.id.length>18?9:11}" font-family="sans-serif" fill="#665344">${j.id}</text><rect x="${x+10}" y="${y+23}" width="44" height="44" fill="#ede6d6"/><rect x="${x+70}" y="${y+23}" width="44" height="44" fill="#ede6d6"/>`;
   layers.push({input:await sharp(path.join(root,'classic',j.key+'.svg')).resize(44,44).png().toBuffer(),left:x+10,top:y+23});
   const record=path.join(root,'records',j.key+'.json');
   if(fs.existsSync(record)){
    const r=JSON.parse(fs.readFileSync(record));
    if(r.processed){const w=Math.round(r.processed.box[0]),h=Math.round(r.processed.box[1]);layers.push({input:await sharp(path.join(root,r.processed.webp)).resize(w,h).png().toBuffer(),left:x+70+Math.floor((44-w)/2),top:y+23+41-h});}
   }else bg+=`<text x="${x+78}" y="${y+49}" font-size="10" fill="#9a8b78">pending</text>`;
  }
  bg+='</svg>';const name='page-'+String(page+1).padStart(2,'0')+'.png';
  await sharp(Buffer.from(bg)).composite(layers).png().toFile(path.join(out,name));pages.push(name);
 }
 console.log('Saved '+pages.length+' actual-size paired review sheets');
})().catch(e=>{console.error(e);process.exit(1)});
