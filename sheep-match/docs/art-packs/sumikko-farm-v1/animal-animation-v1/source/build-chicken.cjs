/* Art-only atlas packaging and layer alignment. Never imported by the game. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),sharp=require(process.env.SHARP_MODULE||'sharp');
const R=path.resolve(__dirname,'..'),C=path.join(R,'chicken'),REF=path.resolve(R,'../shelter-layers-v2/chicken');
const analysis=JSON.parse(fs.readFileSync(path.join(C,'sources/slice-analysis.json')));
const refs=JSON.parse(fs.readFileSync(path.join(REF,'layout.json')));
const anchor=refs.animalCanvas.anchor;
for(const d of ['sources/parts','sources/frame-svg','sources/layer-png','frames/eat','frames/walk','atlases','shadows','previews'])fs.mkdirSync(path.join(C,d),{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const uri=p=>'data:image/png;base64,'+fs.readFileSync(p).toString('base64');
const doc=body=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="360" height="280" viewBox="0 0 360 280">${body}</svg>`;
const layer=(id,b)=>`<g id="${id}" inkscape:groupmode="layer" inkscape:label="${id}">${b}</g>`;
const placed=(file,w,h,s,x,y)=>`<image href="${uri(file)}" x="0" y="0" width="${w}" height="${h}" transform="translate(${x.toFixed(5)} ${y.toFixed(5)}) scale(${s.toFixed(8)})"/>`;
async function raw(p){const{data,info}=await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{data,w:info.width,h:info.height};}
function goldMask(d,box){const m=new Uint8Array(d.w*d.h);for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){const i=(y*d.w+x)*4,[r,g,b,a]=d.data.subarray(i,i+4);if(a>90&&r>185&&g>135&&b<180&&r-g<68&&g-b>40)m[y*d.w+x]=1;}return m;}
function dilate(m,w,h,r){const out=new Uint8Array(m.length);for(let i=0;i<m.length;i++)if(m[i]){const x=i%w,y=Math.floor(i/w);for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r)continue;const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h)out[yy*w+xx]=1;}}return out;}
function toePoint(d,m,box){let sx=0,n=0;const lower=box[1]+(box[3]-box[1])*.65;for(let y=Math.ceil(lower);y<box[3];y++)for(let x=box[0];x<box[2];x++)if(m[y*d.w+x]){sx+=x;n++;}const px=Math.round(sx/n);let bottom=0;for(let y=box[1];y<Math.min(d.h,box[3]+7);y++)for(let x=Math.max(0,px-1);x<=Math.min(d.w-1,px+1);x++)if(d.data[(y*d.w+x)*4+3]>96)bottom=Math.max(bottom,y);return[px+.5,bottom+.5];}
async function footPart(d,g,file,radius=5){const gm=goldMask(d,g.bounds),mask=dilate(gm,d.w,d.h,radius);const b=g.bounds,left=Math.max(0,b[0]-radius-1),top=Math.max(0,b[1]-radius-1),right=Math.min(d.w,b[2]+radius+1),bottom=Math.min(d.h,b[3]+radius+1),w=right-left,h=bottom-top;const rgba=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y+top)*d.w+x+left;d.data.copy(rgba,(y*w+x)*4,i*4,i*4+4);if(!mask[i])rgba[(y*w+x)*4+3]=0;}await sharp(rgba,{raw:{width:w,height:h,channels:4}}).png().toFile(file);const toe=toePoint(d,gm,b);return{file:path.relative(C,file),canvas:[w,h],sourceGoldBounds:b,sourceCrop:[left,top,w,h],toePadContact:[toe[0]-left,toe[1]-top],sourceToePadContact:toe};}
function gait(phase,site){const p=phase%12;let dx,lift,support;if(p<6){dx=-9+3*p;lift=0;support=true;}else{const t=(p-6)/6;dx=9-18*(.5-.5*Math.cos(Math.PI*t));lift=7*Math.sin(Math.PI*t);support=false;}return{toe:[site[0]+dx,site[1]-.5*dx-lift],projectedGround:[site[0]+dx,site[1]-.5*dx],lift,support};}
(async()=>{
 const refFile=path.join(REF,'animals/chicken-hungry.png'),ref=await raw(refFile),body=Buffer.from(ref.data);const bottom=new Int16Array(ref.w);bottom.fill(-1);
 // Follow the actual cream belly silhouette, preserving source RGBA above it. Do not infer a foot from canvas bounds.
 for(let y=0;y<ref.h;y++)for(let x=0;x<ref.w;x++){const i=(y*ref.w+x)*4,[r,g,b,a]=ref.data.subarray(i,i+4);if(a>240&&r>235&&g>220&&b>200&&r-b<40)bottom[x]=y;}
 for(let y=0;y<ref.h;y++)for(let x=0;x<ref.w;x++){let edge=-1;for(let k=Math.max(0,x-2);k<=Math.min(ref.w-1,x+2);k++)edge=Math.max(edge,bottom[k]);if(x>=112&&x<=202&&y>=195&&(edge<0||y>edge+3))body[(y*ref.w+x)*4+3]=0;}
 const bodyFile=path.join(C,'sources/parts/hungry-body-reused.png');await sharp(body,{raw:{width:360,height:280,channels:4}}).png().toFile(bodyFile);
 for(const state of ['hungry','producing','ready'])fs.copyFileSync(path.join(REF,`animals/chicken-${state}.png`),path.join(C,`sources/reference-${state}.png`));
 fs.copyFileSync(path.join(REF,'animals/chicken-hungry-shadow.png'),path.join(C,'shadows/ground-shadow.png'));fs.copyFileSync(path.join(REF,'layout.json'),path.join(C,'sources/reference-layout.json'));
 const nearSite=refs.animals[0].normalizedContacts[1],farSite=refs.animals[0].normalizedContacts[0];
 const eatOrder=[0,1,2,3,4,5,6,8,7,9,11,10],walkOrder=[5,6,7,8,9,10,11,0,1,2,3,4];
 const eatWidths=[260,260,259,260,267,270,266,273,270,272,278,275];
 const actions=[];
 for(const action of ['eat','walk']){const frames=[];for(let frame=0;frame<12;frame++){
  const sourceIndex=(action==='eat'?eatOrder:walkOrder)[frame],entry=analysis[action][sourceIndex],file=path.join(C,entry.file),d=await raw(file);let layers=[],contacts={},registration={};
  if(action==='eat'){
   const candidates=entry.gold.filter(g=>g.area>300&&g.center[1]>d.h*.62),near=candidates.sort((a,b)=>b.center[0]-a.center[0])[0];if(!near)throw Error('missing near foot '+sourceIndex);
   const pt=toePoint(d,goldMask(d,near.bounds),near.bounds),s=180/eatWidths[sourceIndex]*(sourceIndex===10?1.10:1);
   const far=entry.gold.filter(g=>g.area>180&&g.center[0]<near.center[0]-35&&g.center[1]>d.h*.78).sort((a,b)=>b.area-a.area)[0];
   let sx=s,shear=.05,fp=null;
   if(far&&![3,4,5,6].includes(sourceIndex)){
    fp=toePoint(d,goldMask(d,far.bounds),far.bounds);
    sx=(farSite[0]-anchor[0])/(fp[0]-pt[0]);
    shear=((farSite[1]-anchor[1])-s*(fp[1]-pt[1]))/(fp[0]-pt[0]);
   }
   const x=anchor[0]-sx*pt[0],y=anchor[1]-shear*pt[0]-s*pt[1];
   layers.push(['painted-eat-pose',`<image href="${uri(file)}" width="${d.w}" height="${d.h}" transform="matrix(${sx} ${shear} 0 ${s} ${x} ${y})"/>`]);
   contacts.near={actual:[180,230],support:true,source:pt};
   contacts.far=fp?{actual:farSite,support:true,source:fp}:{occludedByPeck:true,referenceGround:farSite};
   registration={scaleY:s,scaleX:sx,shearY:shear,translation:[x,y],bodyRegistrationWidth:eatWidths[sourceIndex],sourceRect:entry.sourceRect,method:'anatomical near/far toe-pad registration plus reviewed torso width; affine perspective calibration, not canvas or alpha-box bottom'};
  }else{
   const feet=entry.gold.filter(g=>g.area>400&&g.center[1]>d.h*.7).sort((a,b)=>a.center[0]-b.center[0]);if(feet.length!==2)throw Error('expected two feet '+sourceIndex);
   for(const [which,g,site,phase,scale] of [['far',feet[0],farSite,frame+6,.52],['near',feet[1],nearSite,frame,.55]]){
    const part=await footPart(d,g,path.join(C,`sources/parts/walk-${String(frame).padStart(2,'0')}-${which}.png`));const motion=gait(phase,site),x=motion.toe[0]-part.toePadContact[0]*scale,y=motion.toe[1]-part.toePadContact[1]*scale;
    layers.push([which+'-leg',placed(path.join(C,part.file),...part.canvas,scale,x,y)]);contacts[which]={actual:motion.toe,projectedGround:motion.projectedGround,support:motion.support,lift:motion.lift,part,scale,translation:[x,y]};
   }
   layers.push(['approved-hungry-body',placed(bodyFile,360,280,1,0,0)]);registration={body:'sources/parts/hungry-body-reused.png',bodyTranslation:[0,0],bodyScale:1,bodyWidth:180,sourcePoseIndex:sourceIndex,method:'reused approved raster body, independently drawn articulated leg sprites aligned to anatomical toe pads'};
  }
  const id=`${action}-${String(frame).padStart(2,'0')}`,svg=doc(layers.map(([n,b])=>layer(n,b)).join(''));fs.writeFileSync(path.join(C,`sources/frame-svg/${id}.svg`),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(C,`frames/${action}/${String(frame).padStart(2,'0')}.png`));
  const layerFiles=[];for(const[n,b]of layers){const f=`sources/layer-png/${id}-${n}.png`;await sharp(Buffer.from(doc(b))).png().toFile(path.join(C,f));layerFiles.push({name:n,file:f});}
  frames.push({index:frame,sourcePoseIndex:sourceIndex,file:`frames/${action}/${String(frame).padStart(2,'0')}.png`,source:`sources/frame-svg/${id}.svg`,durationMs:1000/12,anchor:[180,230],canvas:[360,280],cropped:false,offset:[0,0],contacts,registration,layers:layerFiles,atlasRect:[2+(frame%4)*364,2+Math.floor(frame/4)*284,360,280]});
 }const atlas=`atlases/chicken-${action}.png`;const atlasData=Buffer.alloc(1456*852*4);for(const f of frames){const pixel=(await raw(path.join(C,f.file))).data;for(let row=0;row<280;row++)pixel.copy(atlasData,((f.atlasRect[1]+row)*1456+f.atlasRect[0])*4,row*360*4,(row+1)*360*4);}await sharp(atlasData,{raw:{width:1456,height:852,channels:4}}).png().toFile(path.join(C,atlas));actions.push({id:action,name:action==='eat'?'低头啄食':'原地短走',fps:12,frameCount:12,durationMs:1000,loop:action==='walk'?'repeat frames 00–11; no duplicate endpoint':'play once then return to hungry; may repeat frames 00–11 for review',atlas,atlasCanvas:[1456,852],atlasPadding:2,shadow:'shadows/ground-shadow.png',frames});}
 const manifest={version:1,status:'chicken sample awaiting user review; other four species not authored',baseCommit:'c7eab83e56fa4ec91e0d10927575eef1cf697bb2',species:'chicken',canvas:[360,280],anchor:[180,230],bodyWidth:180,direction:'approved left-facing elevated oblique side; other side may be mirrored by game code',originalLayout:'../../shelter-layers-v2/chicken/layout.json',originalContacts:refs.animals[0].normalizedContacts,groundShadow:{file:'shadows/ground-shadow.png',canvas:[360,280],anchor:[180,230],independent:true,source:'../../shelter-layers-v2/chicken/animals/chicken-hungry-shadow.png',sha256:hash(path.join(C,'shadows/ground-shadow.png'))},walkTravel:{perCycleVector:[-36,18],perCycleLength:Math.hypot(36,18),cycleSeconds:1,stepCount:2,stepVector:[-18,9],nativePixelsPerSecond:Math.hypot(36,18),note:'Translate world root by (-36,+18) px per one-second cycle at native display scale. Stance toes move (+36,-18) px/s relative to root, canceling scene translation. Multiply both by display scale. Do not bake translation into frames.'},sources:{generator:'built-in image_gen',prompts:'sources/generation-prompts.json',refinements:'sources/generation-refinements.json',bodyReuse:'hungry body pixels reused for walking; only articulated legs are new; producing and ready are references only',neutralFrameReused:false},actions};
 fs.writeFileSync(path.join(C,'manifest.json'),JSON.stringify(manifest,null,2));console.log('Exported 24 frames, 2 atlases and editable layered SVG sources.');
})();
