// Use SHARP_MODULE to supply the installed runtime; no package installation required.
const fs=require('fs'),path=require('path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..');
(async()=>{
 const terrain=JSON.parse(fs.readFileSync(path.join(root,'terrain/manifest.json')));
 for(const a of terrain.assets)await sharp(path.join(root,a.svg),{density:144}).png().toFile(path.join(root,a.png));
 const fx=JSON.parse(fs.readFileSync(path.join(root,'effects/manifest.json')));
 for(const e of fx.effects){
  for(const f of e.frames)await sharp(path.join(root,f.svg)).png().toFile(path.join(root,f.png));
  await sharp({create:{width:e.atlasCanvas[0],height:e.atlasCanvas[1],channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(e.frames.map(f=>({input:path.join(root,f.png),left:f.atlasRect[0],top:f.atlasRect[1]}))).png().toFile(path.join(root,e.atlas));
 }
 console.log('Exported transparent terrain @2x, 32 effect frames, 4 padded atlases.');
})();
