/** Approved registered machine parts; entirely presentation-only. */
import {MACHINE_PART_METADATA} from './farm-runtime-machines-metadata.mjs';
import {RUNTIME_ART_METADATA} from './farm-runtime-art-metadata.mjs';
export {MACHINE_PART_METADATA};
const machineIds={feed_mill_1:'feed-mill',feed_mill_2:'feed-mill',loom:'loom',juice_press:'juice-press',sewing_machine:'sewing-machine'};
const descriptors=new Map();
export function resolveMachinePartArt(entity){
 const id=entity?.kind==='machine'?machineIds[entity.configId]:entity?.kind==='decoration'&&entity.configId==='windmill'?'windmill':null;
 if(!id)return null;
 if(!descriptors.has(id)){
  const data=MACHINE_PART_METADATA[id],legacy=RUNTIME_ART_METADATA[data.legacyKey];
  descriptors.set(id,Object.freeze({...data,aspect:800/750,animation:'part-transform',machineParts:true,
   layers:Object.freeze(Object.fromEntries(Object.entries(data.layers).map(([key,path])=>[key,new URL(path,import.meta.url).href]))),
   fallback:{...legacy,src:new URL(legacy.path,import.meta.url).href}}));
 }
 return descriptors.get(id);
}
/** Waiting jobs and a full completed shelf are not production. */
export function machineIsProducing(entity,now=0){
 const job=entity?.queue?.[0];
 return Boolean(entity?.kind==='machine'&&entity.built&&!entity.stored&&job&&Number.isFinite(job.startAt)&&Number.isFinite(job.readyAt)&&job.startAt<=now&&job.readyAt>now);
}
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function renderMachinePartArt(art,{className='',alt='',mirror=false}={}){
 const image=(src,x=0,y=0,width=800,height=750,extra='')=>`<image href="${escape(src)}" x="${x}" y="${y}" width="${width}" height="${height}" ${extra}/>`;
 const motion=art.motion,rotor=motion.type==='rotor',radius=art.rotorRadius;
 // Rightmost (local rotation) runs first, then the fixed isometric projection.
 const part=rotor?`<g transform="translate(${art.pivot.join(' ')}) matrix(${motion.planeMatrix.join(' ')} 0 0)"><g data-fw-part="${art.id}" style="transform:var(--fw-part-transform,rotate(0deg));transform-origin:0 0">${image(art.layers.moving,-radius,-radius,radius*2,radius*2)}</g></g>`:`<g data-fw-part="${art.id}" style="transform:var(--fw-part-transform,translate(0px,0px));transform-origin:0 0">${image(art.layers.moving)}</g>`;
 const [sw,sh]=art.fallback.originalSize;
 // Keep the prior, already-visible static sprite until all replacement layers
 // have decoded. Both versions share exactly the registered world anchor.
 const fallback=image(art.fallback.src,72,75,sw/2,sh/2,'style="visibility:var(--fw-part-fallback,visible)"');
 return `<svg class="${escape(className)} fw-runtime-png fw-machine-parts" data-fw-mechanism="${art.id}" data-render-key="mechanism:${art.id}" viewBox="0 0 800 750" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${escape(alt)}" focusable="false" style="pointer-events:none"><g${mirror?' transform="translate(800 0) scale(-1 1)"':''}>${fallback}<g style="visibility:var(--fw-part-visibility,hidden)">${image(art.layers.base)}${part}${art.layers.foreground?image(art.layers.foreground):''}</g></g></svg>`;
}
