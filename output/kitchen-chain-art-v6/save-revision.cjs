const fs=require('fs'),path=require('path');
const processSprite=require('./process.cjs');
(async()=>{
 const [key,original,prompt,reference]=process.argv.slice(2),root=__dirname;
 const recordFile=path.join(root,'records',key+'.json'),r=JSON.parse(fs.readFileSync(recordFile)),version=(r.revision||1)+1;
 for(const dir of ['sources/rejected','records/rejected','references'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 const oldSource='sources/rejected/'+key+'-v'+(version-1)+'.png',ref='references/'+key+'-v'+(version-1)+'.png';
 fs.copyFileSync(path.join(root,r.source),path.join(root,oldSource));
 fs.copyFileSync(reference||path.join(root,r.processed.png),path.join(root,ref));
 fs.writeFileSync(path.join(root,'records/rejected',key+'-v'+(version-1)+'.json'),JSON.stringify({...r,source:oldSource},null,2));
 fs.copyFileSync(original,path.join(root,r.source));
 r.original=original;r.revision=version;r.references=[path.join(root,ref)];r.prompt='prompts/'+key+'-revision-'+version+'.txt';r.review='pending-visual';
 delete r.processed;delete r.visualReview;
 fs.writeFileSync(path.join(root,r.prompt),prompt+'\n');fs.writeFileSync(recordFile,JSON.stringify(r,null,2));
 await processSprite(r.id);console.log('Saved revision '+key+' v'+version);
})().catch(e=>{console.error(e);process.exit(1)});
