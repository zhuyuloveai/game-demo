/* Art export only: projected rotor planes and separable needle/press/shuttle parts. */
const fs=require('node:fs'),path=require('node:path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..'),base=path.resolve(root,'../sumikko-farm-v1/assets');
const W=800,H=750,ox=144,oy=150;
let embedded=[];
function portable(s,prefix=''){for(const [uri,name] of embedded)s=s.split(uri).join(prefix+'sources/'+name);return s;}
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${W}" height="${H}" viewBox="0 0 1600 1500">${body}</svg>`;
const embed=(file,w,h,x=0,y=0)=>{const uri='data:image/png;base64,'+fs.readFileSync(file).toString('base64');embedded.push([uri,path.basename(file)]);return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${uri}"/>`;};
const group=(id,body)=>`<g id="${id}" inkscape:groupmode="layer" inkscape:label="${id}">${body}</g>`;
const world=s=>`<g transform="translate(${ox} ${oy})">${s}</g>`;
const masked=(body,d,id)=>`<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>`;
const specs=[
 {id:'feed-mill',label:'饲料机 · 转轮',source:'buildings/feed-mill.png',kind:'rotor',pivot:[906,693],plane:[.82,-.30,.1,.99],radius:174,cycleMs:4200,front:'M674 739Q716 695 764 734L765 944 674 982Z M1026 609Q1063 583 1083 617V786L1021 792Z M902 813Q912 764 1039 773Q1124 781 1152 823L1190 1057Q1089 1120 857 1072L885 892Z'},
 {id:'windmill',label:'风车 · 扇叶',source:'decor/windmill.png',kind:'rotor',pivot:[623,529],plane:[.94,.08,-.04,1],radius:445,cycleMs:8500},
 {id:'loom',label:'织布机 · 梭子',source:'buildings/loom.png',kind:'shuttle',pivot:[665,589],cycleMs:1600},
 {id:'juice-press',label:'榨汁机 · 压板',source:'buildings/juice-press.png',kind:'press',pivot:[642,572],cycleMs:2400,
 fixed:'M436 326Q442 309 469 320L597 370V337L675 346V403L849 482Q879 499 858 535Q847 552 824 542L672 466V544Q636 565 600 544V437L453 380Q431 374 436 326Z',
 moving:'M534 553Q581 518 636 507L749 549 751 604Q699 634 639 654L534 613Z',
 front:'M436 637Q632 759 844 637L857 884 437 909Z'},
 {id:'sewing-machine',label:'缝纫机 · 机针',source:'buildings/sewing-machine.png',kind:'needle',pivot:[516,521],cycleMs:650,
 moving:'M484 478H549V506Q549 519 530 524V558Q526 574 506 568Q500 564 501 552V523Q484 520 483 509Z',
 front:'M0 0H1312V492H0Z'}
];
async function raster(s,out){await sharp(Buffer.from(svg(s))).png().toFile(out);}
(async()=>{
 const {RUNTIME_ART_METADATA:legacy}=await import(path.resolve(root,'../../../farm-runtime-art-metadata.mjs'));
 let sets=[];
 for(const spec of specs){
 embedded=[];
 const dir=path.join(root,'machines',spec.id),layers=path.join(dir,'layers'),srcdir=path.join(dir,'sources');
 fs.mkdirSync(layers,{recursive:true});fs.mkdirSync(srcdir,{recursive:true});fs.mkdirSync(path.join(dir,'previews'),{recursive:true});
 fs.copyFileSync(path.join(base,spec.source),path.join(srcdir,'original.png'));
 const original=path.join(srcdir,'original.png'),meta=await sharp(original).metadata();
 const generated=path.join(srcdir,'clean-base-generated.png');
 const fixedSource=fs.existsSync(generated)?generated:original;
 const gm=await sharp(fixedSource).metadata();
 // The generation matches the source coordinate canvas; scale only when dimensions differ.
 const fixed=embed(fixedSource,meta.width,meta.height),originalImage=embed(original,meta.width,meta.height);
 let stationary=world(fixed),front='',movingAt,partSource;
 if(spec.kind==='rotor'){
 const rotor=path.join(srcdir,'rotor-generated.png');
 // Crop transparent margins and normalize the physical plane before projection.
 const planeFile=path.join(srcdir,'rotor-plane.png');
 await sharp(rotor).trim({threshold:12}).resize(512,512,{fit:'contain',background:'#00000000'}).png().toFile(planeFile);
 partSource=embed(planeFile,512,512,-256,-256);
 movingAt=t=>world(`<g transform="translate(${spec.pivot.join(' ')}) matrix(${spec.plane.join(' ')} 0 0) rotate(${360*t}) scale(${spec.radius/256})">${partSource}</g>`);
 }else if(spec.kind==='shuttle'){
 // New editable shuttle follows the existing wooden loom palette and +/-0.5 yarn plane.
 partSource='<g stroke="#BA8955" stroke-width="5" stroke-linejoin="round"><path d="M-110 0Q-65-34 0-32Q69-28 111 0Q56 32-2 32Q-71 27-110 0Z" fill="#F4C880"/><path d="M-74 0Q-37-21 7-20Q48-16 75 0Q37 19-6 18Q-43 16-74 0Z" fill="#C49A6C"/><rect x="-37" y="-14" width="78" height="28" rx="12" fill="#F9EBD1"/><path d="M-23-12V12M-9-13V13M6-13V13M21-12V12" stroke="#DBCAA8" stroke-width="3"/><path d="M38 0H84" fill="none" stroke="#E9F1E8" stroke-width="4"/></g>';
 fs.writeFileSync(path.join(srcdir,'shuttle.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="100" viewBox="-120 -50 240 100">${partSource}</svg>`);
 movingAt=t=>{const d=Math.sin(2*Math.PI*t)*105;return world(`<g transform="translate(${spec.pivot[0]+d} ${spec.pivot[1]+.5*d}) matrix(1 .5 -.7 .35 0 0)">${partSource}</g>`);};
 // Side guides occlude shuttle ends as it crosses the warp.
 front=world(masked(fixed,'M362 320 445 350 445 503 362 557Z M935 567 1005 588 1005 730 935 690Z','front-mask'));
 }else{
 const cut=masked(originalImage,spec.moving,'part-mask');partSource=cut;
 if(spec.kind==='press'){
  const block=path.join(srcdir,'press-block.png');
  await sharp(path.join(srcdir,'press-block-generated.png')).trim({threshold:12}).resize(440,292,{fit:'fill'}).png().toFile(block);
  partSource=embed(block,220,146,532,509);
 }
 movingAt=t=>world(`<g transform="translate(0 ${(spec.kind==='needle'?-28:20)*(.5-.5*Math.cos(2*Math.PI*t))})">${partSource}</g>`);
 }
 if(spec.front)front=world(masked(spec.kind==='press'?originalImage:fixed,spec.front,'front-mask'));
 if(spec.fixed)front=world(masked(originalImage,spec.fixed,'fixed-mask'))+front;
 const defs=[['01-base',stationary],['02-moving',movingAt(0)],...(front?[['03-foreground',front]]:[])];
 for(const [name,s] of defs){fs.writeFileSync(path.join(layers,name+'.svg'),portable(svg(group(name,s)),'../'));await raster(s,path.join(layers,name+'.png'));}
 fs.writeFileSync(path.join(dir,'editable.svg'),portable(svg(defs.map(([name,s])=>group(name,s)).join(''))));
 const samples=[];
 for(let i=0;i<12;i++){
 const t=i/12,file=`previews/phase-${String(i).padStart(2,'0')}.png`;
 await raster(stationary+movingAt(t)+front,path.join(dir,file));samples.push({phase:t,file});
 }
 // Standalone preview renderer consumes these local vector parts only; no game runtime imported.
 fs.writeFileSync(path.join(dir,'motion-data.json'),JSON.stringify({stationary:portable(stationary),partSource:portable(partSource),front:portable(front),spec},null,2)+'\n');
 const reg=legacy[spec.source.replace('.png','')],b=reg.bounds;
 const sourceAnchor=[(b[0]+(b[2]-b[0])*reg.anchor[0])*meta.width/reg.width,(b[1]+(b[3]-b[1])*reg.anchor[1])*meta.height/reg.height];
 const legacyRegistration={bounds:b,canvas:[reg.width,reg.height],anchor:reg.anchor,visualWidth:reg.visualWidth,sourceAnchor,fullCanvasDisplayWidth:reg.visualWidth*1600/((b[2]-b[0])*meta.width/reg.width),note:'Keep the same world registration and full-canvas scale for every layer; do not crop each layer separately.'};
 const a0=await sharp(Buffer.from(svg(stationary+movingAt(0)+front))).ensureAlpha().raw().toBuffer();
 const a1=await sharp(Buffer.from(svg(stationary+movingAt(1)+front))).ensureAlpha().raw().toBuffer();
 let delta=0;for(let j=0;j<a0.length;j++)delta=Math.max(delta,Math.abs(a0[j]-a1[j]));
 if(delta>1)throw Error(spec.id+' loop seam '+delta);
 const manifest={version:1,id:spec.id,name:spec.label,canvas:[W,H],anchor:[(sourceAnchor[0]+ox)/2,(sourceAnchor[1]+oy)/2],legacyRegistration,loopSeamMaxChannelDelta:delta,sourceCanvas:[meta.width,meta.height],sourceToCanvas:{scale:.5,offset:[72,75]},sourcePath:'sheep-match/docs/art-packs/sumikko-farm-v1/assets/'+spec.source,originalRetained:true,pivot:[(spec.pivot[0]+ox)/2,(spec.pivot[1]+oy)/2],layers:defs.map(([key])=>({id:key,png:`layers/${key}.png`,svg:`layers/${key}.svg`,offset:[0,0],canvas:[W,H]})),animation:{type:spec.kind,cycleMs:spec.cycleMs,loop:true,interpolation:spec.kind==='rotor'?'linear angle in local plane before projection':'sinusoidal translation',planeMatrix:spec.plane||null,sourcePivot:spec.pivot,travelSourcePx:spec.kind==='shuttle'?[210,105]:spec.kind==='needle'?[0,-28]:spec.kind==='press'?[0,20]:null,groundMotion:false,samplesAre:'12 diagnostic phase samples, not a 12fps playback sequence',restPhase:0,reducedMotion:'freeze at phase 0'},partsEditable:spec.kind==='shuttle'?'vector paths':'independent raster parts with editable SVG transforms and clipping paths',shadow:'none baked; reuse game contact shadow once',recommendedDisplayWidth:[240,420],samples};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const sheet=[];for(let i=0;i<12;i++)sheet.push({input:await sharp(path.join(dir,samples[i].file)).resize(240,225).png().toBuffer(),left:(i%4)*240,top:Math.floor(i/4)*225});
 await sharp({create:{width:960,height:675,channels:4,background:'#F0F1DA'}}).composite(sheet).png().toFile(path.join(dir,'previews','phases.png'));
 sets.push({id:spec.id,name:spec.label,path:`machines/${spec.id}`,layerCount:defs.length,manifest:`machines/${spec.id}/manifest.json`,sourceSize:[meta.width,meta.height],generatedSize:fs.existsSync(generated)?[gm.width,gm.height]:null});
 }
 fs.writeFileSync(path.join(root,'machines-manifest.json'),JSON.stringify({version:1,sets},null,2)+'\n');
 const montage=[];for(let i=0;i<sets.length;i++)montage.push({input:await sharp(path.join(root,sets[i].path,'previews/phase-00.png')).resize(400,375).png().toBuffer(),left:(i%3)*400,top:Math.floor(i/3)*375});
 await sharp({create:{width:1200,height:750,channels:4,background:'#F0F1DA'}}).composite(montage).png().toFile(path.join(root,'previews','machines.png'));
 console.log('Five machine kits exported:',sets.map(s=>`${s.id}: ${s.layerCount} layers`).join(', '));
})();
