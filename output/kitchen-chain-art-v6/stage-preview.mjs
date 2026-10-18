import fs from 'node:fs';import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname),live=path.resolve(root,'../../kitchen-merge/dist'),sample=path.join(root,'sample');
fs.mkdirSync(sample,{recursive:true});
for(const file of fs.readdirSync(live))if(/\.(mjs|css|html)$/.test(file))fs.copyFileSync(path.join(live,file),path.join(sample,file));
if(!fs.existsSync(path.join(sample,'assets')))fs.symlinkSync(path.join(live,'assets'),path.join(sample,'assets'),'dir');
const balance=JSON.parse(fs.readFileSync(path.join(root,'staged-balance.json')));
fs.writeFileSync(path.join(sample,'balance-data.mjs'),'export default '+JSON.stringify(balance)+';\n');
let art=fs.readFileSync(path.join(sample,'art.mjs'),'utf8');
if(!art.includes("import {chainClassicMarkup} from './chain-classic-art.mjs';"))art="import {chainClassicMarkup} from './chain-classic-art.mjs';\n"+art;
art=art.replace("const body = original?artFor(original):id?render(itemMarkup(id, key=>art[key]), 'natural'):artFor(name);","const refreshed=id&&chainClassicMarkup(id);\n  const body = refreshed?render(refreshed,'natural'):original?artFor(original):id?render(itemMarkup(id, key=>art[key]), 'natural'):artFor(name);");
// Export self-contained SVGs using the same material engine as the classic game.
art+="\nexport function standaloneClassic(id){const svg=icon('item/'+id),used=new Set([...svg.matchAll(/url\\(#([^)]+)\\)/g)].map(x=>x[1])),defs=pending.filter(x=>used.has(x.match(/id=\"([^\"]+)\"/)?.[1])).join('');return svg.replace('<svg ', '<svg xmlns=\"http://www.w3.org/2000/svg\" ').replace('>', '><defs>'+defs+'</defs>');}\n";
fs.writeFileSync(path.join(sample,'art.mjs'),art);
const old=(await import(path.join(live,'full-art-manifest.mjs'))).default,manifest=structuredClone(old),concepts=JSON.parse(fs.readFileSync(path.join(root,'jobs.json')));
for(const j of concepts){if(!manifest[j.id])continue;const record=path.join(root,'records',j.key+'.json'),r=fs.existsSync(record)?JSON.parse(fs.readFileSync(record)):null;
 manifest[j.id]={...manifest[j.id],name:j.name,src:r?.processed?'../'+r.processed.webp:'./pending.svg',...(r?.processed?{box:r.processed.box,contact:r.processed.contact}:{}),pending:!r?.processed};
}
for(const a of Object.values(manifest))if(a.alias){const target=manifest[a.alias];a.name=target.name;a.src=target.src;a.box=target.box;a.contact=target.contact;a.pending=target.pending;}
fs.writeFileSync(path.join(sample,'full-art-manifest.mjs'),'export default '+JSON.stringify(manifest)+';\n');
fs.writeFileSync(path.join(sample,'pending.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="10" y="10" width="60" height="60" rx="12" fill="#e9e1d3"/><path d="M24 40h32M40 24v32" stroke="#b9a58d" stroke-width="3"/></svg>');
console.log('Preview staged with latest UI; completed 3D:',concepts.filter(j=>fs.existsSync(path.join(root,'records',j.key+'.json'))).length);
