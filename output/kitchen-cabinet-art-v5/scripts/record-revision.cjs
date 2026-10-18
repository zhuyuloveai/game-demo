const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const [id,source]=process.argv.slice(2),key=id.replace(':','-'),job=JSON.parse(fs.readFileSync(path.join(root,'revisions/queue.json'))).find(j=>j.id===id);
if(!job||!source.endsWith('.png'))throw Error('Unknown revision');
const version=Number(job.revisionPrompt.match(/v(\d+)-prompt/)[1]);
const dest='sources/'+key+'.png';fs.copyFileSync(source,path.join(root,dest));fs.copyFileSync(source,path.join(root,'revisions',key,'v'+version+'-source.png'));
fs.writeFileSync(path.join(root,'records',key+'.json'),JSON.stringify({id,key,source:dest,toolSource:source,tool:'built-in image_gen.imagegen',prompt:job.revisionPrompt,previous:'revisions/'+key+'/v'+(version-1)+'-record.json',generatedAt:new Date().toISOString(),status:'revised-pending-visual-review'},null,2));console.log(id+' revised');
