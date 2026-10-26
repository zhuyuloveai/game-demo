import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {BUILDING_STATES,buildingStateSvg} from './components.mjs';
const root=dirname(fileURLToPath(import.meta.url));await mkdir(join(root,'svg'),{recursive:true});const assets=[];
for(const a of BUILDING_STATES){const source=buildingStateSvg(a.id)+'\n';await writeFile(join(root,a.path),source);assets.push({...a,sha256:createHash('sha256').update(source).digest('hex')});}
await writeFile(join(root,'manifest.json'),JSON.stringify({schemaVersion:1,count:8,title:'建筑状态与熟练度标记',placement:'anchor is the badge pointer tip; place above the building, scale independently of building footprint',assets},null,2)+'\n');
console.log('Built 8 building state SVGs.');
