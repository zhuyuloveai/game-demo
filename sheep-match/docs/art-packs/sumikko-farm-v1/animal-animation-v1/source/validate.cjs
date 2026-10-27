/* Asset contract checks. This file is not imported by the game. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert'),sharp=require(process.env.SHARP_MODULE||'sharp');
const R=path.resolve(__dirname,'..'),C=path.join(R,'chicken'),m=JSON.parse(fs.readFileSync(path.join(C,'manifest.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function pixels(file){return sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})}
function delta(a,b){let sum=0;for(let i=0;i<a.length;i+=4){for(let c=0;c<3;c++)sum+=Math.abs(a[i+c]*a[i+3]/255-b[i+c]*b[i+3]/255);sum+=Math.abs(a[i+3]-b[i+3]);}return sum/(a.length*255)}
(async()=>{const report={scope:'art-only chicken sample',canvas:[360,280],actions:[],referenceFilesUnchanged:true,sourceFilesExist:true};
for(const a of m.actions){assert.equal(a.fps,12);assert.equal(a.frames.length,12);const hashes=new Set,frames=[];let boundaryCount=0,maxContactError=0;
for(const f of a.frames){assert(fs.existsSync(path.join(C,f.source)));const {data,info}=await pixels(path.join(C,f.file));assert.deepEqual([info.width,info.height,info.channels],[360,280,4]);assert(data.some((v,i)=>i%4===3&&v===0));hashes.add(hash(data));frames.push(data);
for(let y=0;y<280;y++)for(let x=0;x<360;x++)if(x===0||y===0||x===359||y===279)boundaryCount+=data[(y*360+x)*4+3]>0?1:0;
const atlas=await sharp(path.join(C,a.atlas)).extract({left:f.atlasRect[0],top:f.atlasRect[1],width:360,height:280}).ensureAlpha().raw().toBuffer();assert.equal(hash(data),hash(atlas));
for(const c of Object.values(f.contacts)){if(!c.actual)continue;let best=999;const [cx,cy]=c.actual;for(let y=Math.max(0,Math.floor(cy-4));y<Math.min(280,Math.ceil(cy+4));y++)for(let x=Math.max(0,Math.floor(cx-4));x<Math.min(360,Math.ceil(cx+4));x++)if(data[(y*360+x)*4+3]>64)best=Math.min(best,Math.hypot(x+.5-cx,y+.5-cy));maxContactError=Math.max(maxContactError,best)}
}assert.equal(hashes.size,12);assert.equal(boundaryCount,0);assert(maxContactError<3,'visible anatomical contacts >3 px from alpha');const adjacent=frames.slice(1).map((d,i)=>delta(d,frames[i])),seam=delta(frames[11],frames[0]);assert(seam<=Math.max(...adjacent)*1.15,'loop seam is a motion outlier');
report.actions.push({id:a.id,frameCount:12,uniqueFrames:hashes.size,transparentBorder:true,atlasMatchesFrames:true,maxContactPixelDistance:+maxContactError.toFixed(3),adjacentPixelDeltaRange:[Math.min(...adjacent),Math.max(...adjacent)],loopSeamPixelDelta:seam,loopSeamNotMotionOutlier:true});}
const walk=m.actions.find(a=>a.id==='walk');const bodies=walk.frames.map(f=>hash(fs.readFileSync(path.join(C,f.layers.find(l=>l.name==='approved-hungry-body').file))));assert.equal(new Set(bodies).size,1);report.walkBodyStable=true;
let maxWorldFootDrift=0;for(const leg of ['near','far'])for(let i=0;i<11;i++){const a=walk.frames[i].contacts[leg],b=walk.frames[i+1].contacts[leg];if(a.support&&b.support){const move=[b.actual[0]-a.actual[0]-3,b.actual[1]-a.actual[1]+1.5];maxWorldFootDrift=Math.max(maxWorldFootDrift,Math.hypot(...move))}}assert(maxWorldFootDrift<.00001);report.walkStanceDriftAtSuggestedStride=maxWorldFootDrift;
for(const state of ['hungry','producing','ready']){const a=fs.readFileSync(path.resolve(R,`../shelter-layers-v2/chicken/animals/chicken-${state}.png`)),b=fs.readFileSync(path.join(C,`sources/reference-${state}.png`));assert.equal(hash(a),hash(b));}
report.note='Numerical checks support technical alignment; aesthetic approval remains the chicken sample review. Pixel-delta seam check is not a substitute for animation review.';
fs.writeFileSync(path.join(C,'qa-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));})();
