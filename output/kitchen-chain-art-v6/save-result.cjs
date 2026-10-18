const fs=require('fs'),path=require('path');
const processSprite=require('./process.cjs');
(async()=>{
 const [key,original]=process.argv.slice(2),root=__dirname;
 const job=JSON.parse(fs.readFileSync(path.join(root,'jobs.json'))).find(j=>j.key===key);
 if(!job||!original||!fs.existsSync(original))throw Error('Missing job or generated image');
 const recordPath=path.join(root,'records',key+'.json');
 if(fs.existsSync(recordPath))throw Error('Already saved: '+key);
 fs.copyFileSync(original,path.join(root,'sources',key+'.png'));
 const record={id:job.id,name:job.name,source:'sources/'+key+'.png',prompt:'prompts/'+key+'.txt',generation:'built-in image_gen',references:job.referencePaths,original,review:'pending-visual'};
 fs.writeFileSync(recordPath,JSON.stringify(record,null,2));
 await processSprite(job.id);
 console.log('Saved '+key);
})().catch(e=>{console.error(e);process.exit(1)});
