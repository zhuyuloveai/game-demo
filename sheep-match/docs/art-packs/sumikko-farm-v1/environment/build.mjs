import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {ENVIRONMENT_ASSETS,environmentSvg} from './components.mjs';
const root=dirname(fileURLToPath(import.meta.url));await mkdir(join(root,'svg'),{recursive:true});
const assets=[];
for(const d of ENVIRONMENT_ASSETS){const source=environmentSvg(d.id)+'\n';await writeFile(join(root,d.path),source);assets.push({...d,sha256:createHash('sha256').update(source).digest('hex')});}
await writeFile(join(root,'manifest.json'),JSON.stringify({schemaVersion:1,title:'牧场环境补充组件',count:42,projection:'2:1',anchorConvention:'source pixel coordinates; bottom/ground center',groups:Object.fromEntries([...new Set(assets.map(a=>a.group))].map(g=>[g,assets.filter(a=>a.group===g).length])),assets},null,2)+'\n');
console.log(`Built ${assets.length} environment SVGs.`);
