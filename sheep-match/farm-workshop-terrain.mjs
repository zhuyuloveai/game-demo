/** Approved farm-ui-v1 ground connectors. Pure presentation; never saved.
 * PNGs are @2x, ports are in 256×160 source units. No screen-plane rotations.
 */
import {forestBoundaryEdges} from './farm-forest-boundary.mjs';
import {isCellOpen,LAND_PATCHES} from './farm-layout.mjs';
import {project} from './farm-world-geometry.mjs';
const families=['grass-edge-ne-dense','grass-edge-ne-sparse','grass-edge-nw-dense','grass-edge-nw-sparse','soil-grass-ne','soil-grass-nw',...['outer','inner'].flatMap(t=>['n','e','s','w'].map(d=>`grass-corner-${t}-${d}`)),...['ne','nw'].flatMap(d=>['start','end'].map(t=>`grass-cap-${d}-${t}`)),'fog-overlay-reused'];
export const WORKSHOP_TERRAIN=Object.freeze(Object.fromEntries(families.map(id=>[id,Object.freeze({id,src:new URL(`./assets/farm/terrain-workshop/${id}.png`,import.meta.url).href,width:id==='fog-overlay-reused'?128:256,height:id==='fog-overlay-reused'?64:160,anchor:id==='fog-overlay-reused'?[64,32]:[128,80]})])));
const key=(x,y)=>`${x},${y}`;
function placed(id,kind,x,y,scale=.6){const art=WORKSHOP_TERRAIN[kind],p=project(x,y);return {id,kind,src:art.src,x,y,left:p.x-art.anchor[0]*scale,top:p.y-art.anchor[1]*scale,width:art.width*scale,height:art.height*scale};}
function visible(a,v){return !v||a.left<v.right&&a.left+a.width>v.left&&a.top<v.bottom&&a.top+a.height>v.top;}
/** Work from the entire contour before culling: camera movement must not create caps.
 * Each perpendicular join consumes two logical cells on either side. Straight
 * pieces meet the exact connector ports; collinear patch boundaries have no seam.
 */
export function workshopForestFringe(state,{viewport}={}){
 const edges=forestBoundaryEdges(state),vertices=new Map(),pieces=[];
 for(const e of edges)for(const [x,y,nx,ny]of [[e.x1,e.y1,e.x2,e.y2],[e.x2,e.y2,e.x1,e.y1]]){const k=key(x,y);if(!vertices.has(k))vertices.set(k,{x,y,rays:[]});vertices.get(k).rays.push([Math.sign(nx-x),Math.sign(ny-y)]);}
 const joins=new Map();
 for(const [k,v]of vertices){
  if(v.rays.length!==2||v.rays[0][0]*v.rays[1][0]+v.rays[0][1]*v.rays[1][1]!==0)continue;
  const dx=v.rays.reduce((n,r)=>n+r[0],0),dy=v.rays.reduce((n,r)=>n+r[1],0),dir=dx>0?(dy>0?'n':'w'):(dy>0?'e':'s');
  const owned=[[-1,-1],[0,-1],[-1,0],[0,0]].filter(([x,y])=>isCellOpen(state,v.x+x,v.y+y)).length;
  const kind=`grass-corner-${owned===3?'inner':'outer'}-${dir}`;
  joins.set(k,true);pieces.push(placed(`join:${k}`,kind,v.x,v.y));
 }
 for(const e of edges){
  const length=Math.abs(e.x2-e.x1)+Math.abs(e.y2-e.y1),dx=(e.x2-e.x1)/length,dy=(e.y2-e.y1)/length;
  const a=joins.has(key(e.x1,e.y1))?2:0,b=length-(joins.has(key(e.x2,e.y2))?2:0),direction=dx?'nw':'ne';
  for(let n=a;n<b;n+=4){const span=Math.min(4,b-n),m=n+span/2,x=e.x1+dx*m,y=e.y1+dy*m;
   const dense=(Math.floor(x/4)+Math.floor(y/4))%2===0;
   // A road meeting the forest gets the soil lip, without adding a road or changing ownership.
   const road=(state.entities||[]).some(r=>r.kind==='road'&&!r.stored&&Math.abs(r.x+.5-x)+Math.abs(r.y+.5-y)<2);
   pieces.push(placed(`edge:${e.id}:${n}`,road?`soil-grass-${direction}`:`grass-edge-${direction}-${dense?'dense':'sparse'}`,x,y,span*24/160));
  }
  for(const [x,y,atStart]of [[e.x1,e.y1,true],[e.x2,e.y2,false]])if(vertices.get(key(x,y))?.rays.length===1){
   // The cap's one port faces the retained edge. NE reverses screen left/right.
   const suffix=direction==='ne'?(atStart?'start':'end'):(atStart?'end':'start');
   pieces.push(placed(`cap:${e.id}:${atStart}`,`grass-cap-${direction}-${suffix}`,x+(atStart?-2:2)*dx,y+(atStart?-2:2)*dy));
  }
 }
 return pieces.filter(a=>visible(a,viewport));
}
/** One faint cloud per unopened 8×8 patch, never tiled/staked over the same point. */
export function workshopForestFog(state,{viewport}={}){
 return LAND_PATCHES.filter(p=>!(state.openedLand||[]).includes(p.id)).map(p=>({...placed(`fog:${p.id}`,'fog-overlay-reused',p.x+4,p.y+4,1),patchId:p.id})).filter(a=>visible(a,viewport)).slice(0,24);
}
