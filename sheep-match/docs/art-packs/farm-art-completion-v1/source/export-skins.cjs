const fs=require('node:fs'),path=require('node:path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..'),old=path.resolve(root,'../sumikko-farm-v1/shelter-layers-v2');
(async()=>{for(const sp of ['chicken','sheep']){
 const dir=path.join(root,'skins',sp),m=JSON.parse(fs.readFileSync(path.join(dir,'layout.json')));
 for(const p of m.newLayers)await sharp(path.join(dir,p.replace('.png','.svg'))).png().toFile(path.join(dir,p));
 fs.mkdirSync(path.join(dir,'previews'),{recursive:true});
 for(const state of ['empty','full']){
 let layers=[];
 for(const key of m.layerOrder){
  if(key==='reference-animals'){
   if(state==='full')for(const name of ['reference-animal-shadows',...Array.from({length:m.referenceAnimalPlacements.length},(_,i)=>`reference-${sp}-${i+1}`)])layers.push({input:path.join(old,sp,'layers',name+'.png'),left:0,top:0});
  }else layers.push({input:path.join(dir,'layers',key+'.png'),left:0,top:0});
 }
 await sharp({create:{width:1200,height:1000,channels:4,background:'#00000000'}}).composite(layers).png().toFile(path.join(dir,'previews',state+'.png'));
 }
 // Editable SVG composes portable embedded original raster layers and editable flower paths.
 let groups=[];
 for(const key of m.layerOrder.filter(k=>k!=='reference-animals')){
 const file=path.join(dir,'layers',key+'.svg');let body;
 if(fs.existsSync(file))body=fs.readFileSync(file,'utf8').replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');
 else body=`<image width="1200" height="1000" href="data:image/png;base64,${fs.readFileSync(path.join(dir,'layers',key+'.png')).toString('base64')}"/>`;
 groups.push(`<g id="source-${key}" inkscape:groupmode="layer" inkscape:label="${key}">${body}</g>`);
 }
 fs.writeFileSync(path.join(dir,'editable.svg'),`<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="1200" height="1000" viewBox="0 0 1200 1000">${groups.join('')}</svg>`);
}
const layers=[];for(const [i,sp] of ['chicken','sheep'].entries())for(const [j,s] of ['empty','full'].entries())layers.push({input:await sharp(path.join(root,'skins',sp,'previews',s+'.png')).resize(600,500).png().toBuffer(),left:j*600,top:i*500});
await sharp({create:{width:1200,height:1000,channels:4,background:'#F0F1DA'}}).composite(layers).png().toFile(path.join(root,'previews','floral-skins.png'));
console.log('Floral PNG layers, portable editable SVG and four composites exported');})();
