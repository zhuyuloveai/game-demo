import {mkdir,writeFile} from 'node:fs/promises';
import {flowerFenceTileSvg,FRAME,DIRECTIONS} from '../docs/art-packs/sumikko-farm-v1/terrain/components.mjs';
const root=new URL('../',import.meta.url),assets=[];
for(let mask=0;mask<16;mask++){
 const name=`flower-fence-${mask.toString(16)}.svg`,svg=flowerFenceTileSvg(mask)+'\n';
 for(const directory of ['docs/art-packs/sumikko-farm-v1/terrain/svg/flower-fences/','assets/farm-terrain/flower-fences/']){
  await mkdir(new URL(directory,root),{recursive:true});await writeFile(new URL(directory+name,root),svg);
 }
 assets.push({id:name.slice(0,-4),mask,path:'svg/flower-fences/'+name,...FRAME.fence,footprint:[1,1],directions:DIRECTIONS.filter(d=>mask&d.bit).map(d=>d.name)});
}
await writeFile(new URL('docs/art-packs/sumikko-farm-v1/terrain/flower-fences.json',root),JSON.stringify({schemaVersion:1,assets},null,2)+'\n');
console.log('Built 16 connected flower fence variants.');
