import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { roadTileSvg, fenceTileSvg, fieldTileSvg, FRAME, FIELD_STATES, DIRECTIONS } from './components.mjs';
const root=dirname(fileURLToPath(import.meta.url)),assets=[];
for(const [kind,folder,render] of [['road','roads',roadTileSvg],['fence','fences',fenceTileSvg]]) {
  await mkdir(join(root,'svg',folder),{recursive:true});
  for(let mask=0;mask<16;mask++){
    const id=`${kind}-${mask.toString(16)}`,path=`svg/${folder}/${id}.svg`;
    await writeFile(join(root,path),render(mask)+'\n');
    assets.push({id,kind,mask,directions:DIRECTIONS.filter(d=>mask&d.bit).map(d=>d.name),path,...FRAME[kind],footprint:[1,1]});
  }
}
await mkdir(join(root,'svg/fields'),{recursive:true});
for(const state of FIELD_STATES){const id=`field-${state}`,path=`svg/fields/${id}.svg`;await writeFile(join(root,path),fieldTileSvg(state)+'\n');assets.push({id,kind:'field',state,path,...FRAME.field,footprint:[1,1]});}
await writeFile(join(root,'manifest.json'),JSON.stringify({schemaVersion:1,title:'小牧场 · 可拼接地形组件',projection:{ratio:'2:1',unit:64},connectionBits:Object.fromEntries(DIRECTIONS.map(d=>[d.name,d.bit])),counts:{roads:16,fences:16,fields:3,total:35},assets},null,2)+'\n');
console.log('Built 35 SVG assets: 16 roads, 16 fences, 3 fields.');
