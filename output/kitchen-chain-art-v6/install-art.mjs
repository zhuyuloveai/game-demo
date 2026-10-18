import fs from 'node:fs';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname),project=path.resolve(root,'../../kitchen-merge'),dist=path.join(project,'dist');
const identities=JSON.parse(fs.readFileSync(path.join(project,'docs/art/ITEM_IDENTITIES_V6.json')));
const jobs=JSON.parse(fs.readFileSync(path.join(root,'jobs.json')));
const active=new Map(identities.chains.filter(c=>c.runtimeEnabled).flatMap(c=>c.items.map(i=>[i.id,i])));
const records=new Map(),problems=[];
for(const job of jobs){
 const file=path.join(root,'records',job.key+'.json');
 if(!fs.existsSync(file)){problems.push('Missing image '+job.id);continue;}
 const r=JSON.parse(fs.readFileSync(file));
 if(!r.processed||!fs.existsSync(path.join(root,r.processed.webp)))problems.push('Unprocessed image '+job.id);
 if(r.review!=='visual-approved')problems.push('Visual review pending '+job.id);
 records.set(job.id,r);
}
if(active.size!==389||jobs.length!==397)problems.push('Unexpected approved scope');
const approvalFile=path.join(root,'visual-acceptance.json');
if(!fs.existsSync(approvalFile)||!JSON.parse(fs.readFileSync(approvalFile)).complete)problems.push('Final paired 44px and browser visual acceptance pending');
if(problems.length){console.error(problems.slice(0,15).join('\n')+'\nTotal blockers: '+problems.length);process.exit(1);}
const old=(await import(path.join(dist,'full-art-manifest.mjs'))).default,manifest=structuredClone(old);
for(const [id,item] of active){
 if(!manifest[id])throw Error('Stable runtime item missing: '+id);
 const record=records.get(id),key=id.replace(':','-');
 manifest[id]={...manifest[id],name:item.name,src:'./assets/cabinet-v6/items/'+key+'.webp',box:record.processed.box,contact:record.processed.contact};
 delete manifest[id].pending;
}
for(const [id,source] of Object.entries(identities.legacyAliases)){
 if(manifest[id]?.alias!==source)throw Error('Legacy alias changed: '+id);
 const target=manifest[source];
 Object.assign(manifest[id],{name:target.name,src:target.src,box:target.box,contact:target.contact});
}
const balance=JSON.parse(fs.readFileSync(path.join(project,'docs/balance/kitchen-target.json')));
const runtimeIds=balance.chains.flatMap(c=>c.items.map(i=>i.id)).sort();
if(JSON.stringify(Object.keys(manifest).sort())!==JSON.stringify(runtimeIds))throw Error('Runtime ID set changed');
if(runtimeIds.length!==422||new Set(Object.values(manifest).map(a=>a.src)).size!==411)throw Error('Runtime art coverage changed');
const artPath=path.join(dist,'art.mjs');let art=fs.readFileSync(artPath,'utf8');
if(!art.includes("import {chainClassicMarkup} from './chain-classic-art.mjs';")){
 const before="const body = original?artFor(original):id?render(itemMarkup(id, key=>art[key]), 'natural'):artFor(name);";
 if(!art.includes(before))throw Error('Art integration point changed; inspect current implementation');
 art="import {chainClassicMarkup} from './chain-classic-art.mjs';\n"+art.replace(before,"const refreshed=id&&chainClassicMarkup(id);\n  const body = refreshed?render(refreshed,'natural'):original?artFor(original):id?render(itemMarkup(id, key=>art[key]), 'natural'):artFor(name);");
}
if(!process.argv.includes('--install')){console.log('All art checks passed. Use --install to update the local runtime.');process.exit(0);}
fs.mkdirSync(path.join(dist,'assets/cabinet-v6/items'),{recursive:true});
for(const id of active.keys())fs.copyFileSync(path.join(root,records.get(id).processed.webp),path.join(dist,'assets/cabinet-v6/items',id.replace(':','-')+'.webp'));
fs.writeFileSync(artPath,art);
fs.writeFileSync(path.join(dist,'full-art-manifest.mjs'),'// V6 identities: 389 new 3D sprites, 22 retained sprites, 11 legacy aliases. Grain remains preview only.\nexport default '+JSON.stringify(manifest,null,2)+';\n');
console.log('Installed 389 runtime 3D sprites and separate classic illustrations. Run scripts/sync-balance.py next.');
