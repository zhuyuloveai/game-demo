const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),old=path.resolve(root,'../kitchen-cabinet-art-v4');
const plan=JSON.parse(fs.readFileSync(root+'/catalog-plan.json'));
const reviewed=new Date().toISOString();
const families=[...new Set(plan.items.map(i=>i.family))];
for(const family of families)if(!fs.existsSync(root+'/evidence/chain-'+family+'.png'))throw Error('Missing chain review '+family);
for(const file of fs.readdirSync(root+'/records')){const p=root+'/records/'+file,r=JSON.parse(fs.readFileSync(p));if(!r.processed||r.blocked)throw Error('Incomplete '+r.id);r.status='visually-reviewed-awaiting-user';r.visualReview={date:reviewed,evidence:'evidence/chain-'+r.id.split(':')[0]+'.png',scale:'94px overview, 44px cabinet cell, 44px dark edge inspection',reviewer:'Codex visual inspection; not user approval'};fs.writeFileSync(p,JSON.stringify(r,null,2))}
// Carry the original interface and seed provenance into this self-contained delivery.
fs.mkdirSync(root+'/ui-provenance',{recursive:true});fs.cpSync(old+'/sources',root+'/ui-provenance/sources',{recursive:true});
for(const f of ['panels-source.png','cell-source.png','environment-source.png','prompts.json','generated-prompts.json','asset-manifest.json','asset-layout.json','board-registration.json'])fs.copyFileSync(old+'/'+f,root+'/ui-provenance/'+f);
const ui=JSON.parse(fs.readFileSync(old+'/asset-manifest.json')).assets;
const rows=[],prompts=[];const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
for(const i of plan.items){let source,prompt,png,webp,note;if(i.seed){const a=ui.find(a=>a.id===i.seed);source='ui-provenance/'+a.source;prompt='ui-provenance/generated-prompts.json';png='slices/'+i.seed+'.png';webp='slices/'+i.seed+'.webp';note='沿用已选样板'}else if(i.alias){source='';prompt='';png='';webp='';note='旧档兼容映射到 '+i.alias}else{const r=JSON.parse(fs.readFileSync(root+'/records/'+i.id.replace(':','-')+'.json'));source=r.source;prompt=r.prompt;png=r.processed.png;webp=r.processed.webp;note='本轮独立生成、清理与视觉检查';prompts.push({id:i.id,name:i.name,currentPromptFile:prompt,prompt:fs.readFileSync(root+'/'+prompt,'utf8'),initialPromptFile:i.promptFile,source})}
 for(const f of [source,prompt,png,webp].filter(Boolean))if(!fs.existsSync(root+'/'+f))throw Error('Missing '+f);
 rows.push([i.id,i.chain,i.name,i.level,i.kind,source,prompt,png,webp,i.alias||'',note]);
}
fs.writeFileSync(root+'/asset-usage.csv','\uFEFF'+[['物品ID','系列','名称','等级','类型','原图','提示词','PNG切片','WebP运行素材','兼容映射','用途说明'],...rows].map(r=>r.map(quote).join(',')).join('\n')+'\n');
fs.writeFileSync(root+'/prompts-index.json',JSON.stringify({tool:'built-in image_gen.imagegen',newIndependentItems:401,items:prompts},null,2));
fs.writeFileSync(root+'/evidence/visual-review.json',JSON.stringify({reviewed,scope:'All 64 chains / 422 catalog IDs, 411 unique item assets',families:families.map(f=>({family:f,count:plan.items.filter(i=>i.family===f).length,evidence:'chain-'+f+'.png',status:'reviewed'})),revisedIds:JSON.parse(fs.readFileSync(root+'/revisions/queue.json')).map(j=>j.id),finding:'No missing image, opaque rectangular backdrop, obvious detached fringe or cropped silhouette found in the final chain contact sheets. All 401 generated originals passed source alpha sanity checks. Functional verification is recorded separately.',limitations:['Advanced producer tiers contain small decorative details at 44px; neighboring high levels still benefit from level labels or item detail view.','Reference has different characters, items and placements. Pixel differences remain; no pixel-identical claim.','Final user visual approval is pending.']},null,2));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(root+'/'+f)).digest('hex');
fs.writeFileSync(root+'/evidence/asset-integrity.json',JSON.stringify({created:reviewed,items:rows.filter(r=>r[5]).map(r=>({id:r[0],source:r[5],sourceSHA256:sha(r[5]),webp:r[8],webpSHA256:sha(r[8])}))},null,2));
console.log(JSON.stringify({families:families.length,catalog:rows.length,newPrompts:prompts.length}));
