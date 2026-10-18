import fs from 'node:fs';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);
const plan=JSON.parse(fs.readFileSync(path.join(root,'approved-plan.json')));
const common=`Use case: stylized-concept. Asset type: ONE transparent production item sprite for a premium cozy kitchen merge game. Style reference image is only for rendering quality, warm upper-left lighting, modest top visibility and tactile 3D material; never copy its apple subject. Render a clear isolated silhouette, centered and fully visible around 80% of square canvas, readable at 38 pixels. Refined friendly 3D, soft upper-left daylight, warm neutral fill, restrained highlights, rounded but accurate shapes. Materials appropriate to the subject: realistic fruit skin, food, ceramic, oak, linen, painted metal. Genuine transparent alpha background. No floor or scenery, no plate unless essential to this particular dish, no broad cast shadow, no text or numbers or level badges, no outline or white fringe, no sparkles or floating decorations, no montage/atlas. Game supplies a contact shadow. One dominant subject, no mixed platter, set, banquet or extra objects. Preserve the following concrete identity and shape exactly.`;
const jobs=[];
for(const chain of plan.chains)for(const item of chain.items){
 const id=item.id.replace('proposed_grain:','grain:');
 const needsDog=chain.id==='mascot'||item.id==='doll:8'||item.id==='story:5'||['puzzle:10','puzzle:12','puzzle:13'].includes(item.id);
 const dog=needsDog?' Image 2 is the strict puppy identity reference: preserve WHITE body, cloud-shaped WHITE ears, black eyes/nose/mouth and the RED baseball cap with GOLD M. The M on the cap is the only allowed letter. Render the specified new pose/material; never brown fur, never substitute a tall chef toque for the red baseball cap. ':'';
 const resource=chain.id==='energy'?' Finite energy; never use an infinity sign. ':chain.id==='infinite'?' The infinity symbol ∞ is the sole allowed symbol; no hourglass. ':chain.id==='timeskip'?' Actual sand-filled hourglass with the specified frame; no printed duration. ':'';
 const prompt=`${common}\nSubject: ${item.name}. Item ID: ${id}.\nRequired visual identity: ${item.cue}.\nChain context: ${chain.note}.${dog}${resource}`;
 const job={id,key:id.replace(':','-'),family:chain.id.replace('proposed_grain','grain'),level:item.level,name:item.name,cue:item.cue,prompt,referencePaths:[path.resolve(root,'../kitchen-cabinet-art-v5/sources/fruit-1.png'),...(needsDog?[path.resolve(root,'../../kitchen-merge/dist/assets/cabinet-v5/ui/puppy.webp')]:[])]};
 if(fs.existsSync(path.join(root,'records',job.key+'.json')))job.prompt=fs.readFileSync(path.join(root,'prompts',job.key+'.txt'),'utf8').trim();
 jobs.push(job);fs.writeFileSync(path.join(root,'prompts',job.key+'.txt'),job.prompt+'\n');
}
fs.writeFileSync(path.join(root,'jobs.json'),JSON.stringify(jobs,null,2));
console.log('Prepared',jobs.length,'independent sprites');
