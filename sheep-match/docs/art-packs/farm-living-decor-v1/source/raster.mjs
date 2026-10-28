import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export const sharp=require(process.env.SHARP_MODULE || 'sharp');
export const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
export const svg=(body,w=640,h=640)=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
export async function components(path,minPixels=4000){
  const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info, seen=new Uint8Array(w*h), groups=[];
  for(let q=0;q<w*h;q++){
    if(seen[q]||data[q*4+3]<64)continue;
    const todo=[q],pixels=[];seen[q]=1;let x0=w,y0=h,x1=0,y1=0;
    for(let k=0;k<todo.length;k++){
      const t=todo[k],x=t%w,y=Math.floor(t/w);pixels.push(t);
      x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(const n of [x? t-1:-1,x<w-1?t+1:-1,y?t-w:-1,y<h-1?t+w:-1]){
        if(n<0||seen[n]||data[n*4+3]<64)continue;seen[n]=1;todo.push(n);
      }
    }
    if(pixels.length>=minPixels)groups.push({pixels,bounds:[x0,y0,x1+1,y1+1],center:[(x0+x1)/2,(y0+y1)/2]});
  }
  return {data,w,h,groups};
}
export async function cutComponent(raw,g){
  // Mask only disconnected transparency noise. Preserve generated RGB and edge alpha.
  const [x0,y0,x1,y1]=g.bounds, left=Math.max(0,x0-2),top=Math.max(0,y0-2);
  const width=Math.min(raw.w,x1+2)-left,height=Math.min(raw.h,y1+2)-top;
  const keep=new Uint8Array(width*height);
  for(const q of g.pixels){const x=q%raw.w-left,y=Math.floor(q/raw.w)-top;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height)keep[(y+dy)*width+x+dx]=1;
  }
  const out=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const j=y*width+x,i=(top+y)*raw.w+left+x;if(keep[j])raw.data.copy(out,j*4,i*4,i*4+4);}
  return {png:await sharp(out,{raw:{width,height,channels:4}}).png().toBuffer(),rect:[left,top,width,height]};
}
export async function alphaBounds(input){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=-1,y1=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=64){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 return [x0,y0,x1+1,y1+1];
}
export async function footTip(input,x,radius=10){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let best=[];let bottom=-1;
 for(let xx=Math.max(0,Math.round(x-radius));xx<Math.min(info.width,Math.round(x+radius+1));xx++)for(let yy=info.height-1;yy>=0;yy--){if(data[(yy*info.width+xx)*4+3]>=96){if(yy>bottom){bottom=yy;best=[xx];}else if(yy===bottom)best.push(xx);break;}}
 return best.length?[best[Math.floor(best.length/2)],bottom]:null;
}
