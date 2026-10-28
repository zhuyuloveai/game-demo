// Set SHARP_MODULE to a local Sharp installation when it is not on NODE_PATH.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..');
(async()=>{
const m=JSON.parse(fs.readFileSync(path.join(root,'icons-manifest.json')));
for(const i of m.icons){fs.mkdirSync(path.dirname(path.join(root,i.png)),{recursive:true});await sharp(path.join(root,i.svg),{density:144}).resize(256,256).png().toFile(path.join(root,i.png));}
for(const [name,icons,cols] of [['p0',m.icons.filter(i=>['processed','materials','currency'].includes(i.category)),8],['p1',m.icons.filter(i=>['achievements','branch'].includes(i.category)),6]])for(const size of [96,32]){
 const cw=144,ch=142,rows=Math.ceil(icons.length/cols),layers=[];
 for(let i=0;i<icons.length;i++){const x=i%cols*cw,y=Math.floor(i/cols)*ch;
 layers.push({input:await sharp(path.join(root,icons[i].svg)).resize(size,size).png().toBuffer(),left:x+(cw-size)/2,top:y+(108-size)/2});
 layers.push({input:Buffer.from(`<svg width="144" height="30"><text x="72" y="18" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="#725642">${icons[i].id}</text></svg>`),left:x,top:y+108});}
 await sharp({create:{width:cw*cols,height:ch*rows,channels:4,background:'#fff7e7'}}).composite(layers).png().toFile(path.join(root,`previews/${name}-${size}.png`));
}
console.log('93 PNG icons, four contact sheets exported');
})();
