const fs=require('fs'),path=require('path');
const sharp=require('/Users/zhuyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=__dirname;
async function processSprite(id){
 const key=id.replace(':','-'),file=path.join(root,'records',key+'.json'),r=JSON.parse(fs.readFileSync(file));
 if(r.processed)return r;
 const source=path.join(root,r.source),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info;let x0=w,y0=h,x1=-1,y1=-1,opaque=0,transparent=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=data[(y*w+x)*4+3];if(a===0)transparent++;if(a>=32){opaque++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}}
 if(x1<0||transparent<w*h*.02)throw Error('Missing transparent subject '+id);
 const gutter=6;x0=Math.max(0,x0-gutter);y0=Math.max(0,y0-gutter);x1=Math.min(w-1,x1+gutter);y1=Math.min(h-1,y1+gutter);
 const cw=x1-x0+1,ch=y1-y0+1,png='items/'+key+'.png',webp='items/'+key+'.webp';
 await sharp(source).extract({left:x0,top:y0,width:cw,height:ch}).resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).png().toFile(path.join(root,png));
 await sharp(path.join(root,png)).resize({width:160,height:160,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:6}).toFile(path.join(root,webp));
 let sum=0,count=0,fx0=w,fx1=0;for(let y=Math.floor(y1-ch*.1);y<=y1;y++)for(let x=x0;x<=x1;x++)if(data[(y*w+x)*4+3]>=160){sum+=x;count++;fx0=Math.min(fx0,x);fx1=Math.max(fx1,x)}
 const scale=Math.min(40/cw,(id.startsWith('gen_')?39:38)/ch);
 r.processed={png,webp,sourceSize:[w,h],crop:[x0,y0,cw,ch],box:[+(cw*scale).toFixed(2),+(ch*scale).toFixed(2)],contact:{x:+(count?(sum/count-x0)/cw*100:50).toFixed(2),width:+(count?Math.max(7,Math.min(29,(fx1-fx0)*scale*.85)):18).toFixed(2),height:2.8},alphaPolicy:'Preserve generated RGB and alpha; crop only; no background recoloring or component deletion',opaquePixels:opaque,transparentPixels:transparent};
 fs.writeFileSync(file,JSON.stringify(r,null,2));return r;
}
module.exports=processSprite;if(require.main===module)(async()=>{for(const id of process.argv.slice(2))await processSprite(id);console.log('Processed',process.argv.slice(2).join(','));})().catch(e=>{console.error(e);process.exit(1)});
