/** Pure presentation of unopened land. Nothing returned here is inserted into a save.
 * Real clearing obstacles use exactly the existing expandLand coordinates and IDs.
 * Decoration positions depend on patch ID, never time, camera or ownership order. */
import {LAND_PATCHES,FARM_MAP,isCellOpen} from './farm-layout.mjs';
import {project,footprintPolygon,polygonBounds} from './farm-world-geometry.mjs';

export function expansionObstaclePreview(patch){
 return [[1,1,'rock'],[2,1,'rock'],[1,2,'rock'],[5,5,'natural_tree']].map(([dx,dy,configId])=>({
  id:`${patch.id}_${dx}_${dy}`,kind:'obstacle',configId,x:patch.x+dx,y:patch.y+dy,w:1,h:1,rotation:0,fixed:true,previewOnly:true,patchId:patch.id
 }));
}
function hash(s){let n=2166136261;for(const c of s){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0)/4294967296;}
function validViewport(v){return v&&['left','top','right','bottom'].every(k=>Number.isFinite(v[k]))&&v.right>v.left&&v.bottom>v.top;}
function visiblePoint(x,y,v,pad=120){if(!v)return true;const p=project(x+.5,y+.5);return p.x>=v.left-pad&&p.x<=v.right+pad&&p.y>=v.top-pad&&p.y<=v.bottom+pad;}
function visiblePatch(p,v){if(!v)return true;const b=polygonBounds(footprintPolygon(p));return b.left<v.right+120&&b.right>v.left-120&&b.top<v.bottom+120&&b.bottom>v.top-120;}
function limit(n,fallback){return Number.isFinite(n)?Math.max(0,Math.floor(n)):fallback;}
function ownedRects(state){return [{x:16,y:16,w:32,h:32},...LAND_PATCHES.filter(p=>(state.openedLand||[]).includes(p.id))];}
function distanceToOpen(x,y,rects){return Math.min(...rects.map(r=>Math.hypot(Math.max(r.x-x,0,x-r.x-r.w),Math.max(r.y-y,0,y-r.y-r.h))));}

/** Open/closed shared edges only. Internal seams of either region are never emitted.
 * Every segment follows the logical grid and can be projected by the renderer. */
export function forestBoundaryEdges(state){
 const edges=[];
 for(const p of LAND_PATCHES){if((state.openedLand||[]).includes(p.id))continue;
  for(const [side,dx,dy,vertical] of [['west',-1,0,true],['east',8,0,true],['north',0,-1,false],['south',0,8,false]]){
   let start=null;
   for(let n=0;n<=8;n++){
    const adjacent=n<8&&isCellOpen(state,p.x+dx+(vertical?0:n),p.y+dy+(vertical?n:0));
    if(adjacent&&start===null)start=n;
    if(!adjacent&&start!==null){const x=p.x+(side==='east'?8:0),y=p.y+(side==='south'?8:0);
     edges.push({id:`edge_${p.id}_${side}_${start}`,patchId:p.id,x1:x+(vertical?0:start),y1:y+(vertical?start:0),x2:x+(vertical?0:n),y2:y+(vertical?n:0)});start=null;
    }
   }
  }
 }
 return edges;
}

export function forestBoundary(state,{viewport,maxDecorations=480,maxObstacles=192}={}){
 const view=validViewport(viewport)?viewport:null,opened=new Set(state.openedLand||[]),owned=ownedRects(state);
 const patches=LAND_PATCHES.filter(p=>!opened.has(p.id));
 const grounds=patches.filter(p=>visiblePatch(p,view)).map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h}));
 const obstacles=patches.flatMap(expansionObstaclePreview).filter(e=>visiblePoint(e.x,e.y,view)).slice(0,limit(maxObstacles,192));
 const decorations=[];
 for(const p of patches){
  // Staggered, individually jittered planting points, not a tile-shaped frame.
  for(let i=0;i<12;i++){
   const seed=`${p.id}:${i}`,col=i%4,row=Math.floor(i/4),x=p.x+.5+col*1.85+hash(seed+'x')*.65,y=p.y+.45+row*2.45+hash(seed+'y')*.75;
   const distance=distanceToOpen(x+.5,y+.5,owned);
   // Keep crowns away from playable cells and leave a visual route at the farm exit.
   if(distance<1.2||Math.abs(x+.5-FARM_MAP.exit.x)<1.5&&y>=FARM_MAP.exit.y&&y<56)continue;
   if(expansionObstaclePreview(p).some(e=>Math.hypot(x-e.x,y-e.y)<1.05))continue;
   if(!visiblePoint(x,y,view))continue;
   const n=hash(seed+'kind'),key=n<.68?'natural-tree':n<.9?'natural-bush':`accent-${[0,4,5][Math.floor(hash(seed+'grass')*3)]}`;
   decorations.push({id:`forest_${p.id}_${i}`,patchId:p.id,key,x,y,w:1,h:1,scale:(key==='natural-tree'?.8:.85)+hash(seed+'scale')*.35,mirror:hash(seed+'mirror')>.5});
  }
 }
 // Existing patches retain priority; opening a neighbour never moves any surviving point.
 const edges=forestBoundaryEdges(state).filter(e=>!view||visiblePatch({x:Math.min(e.x1,e.x2),y:Math.min(e.y1,e.y2),w:Math.max(1,Math.abs(e.x2-e.x1)),h:Math.max(1,Math.abs(e.y2-e.y1))},view));
 return {decorations:decorations.slice(0,limit(maxDecorations,480)),obstacles,edges,grounds};
}
