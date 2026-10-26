/** Presentation coordinates only. Save/economy positions remain the original logical grid. */
export const ISO={halfWidth:24,halfHeight:12,originX:1536};
export function project(x,y){return {x:ISO.originX+(x-y)*ISO.halfWidth,y:(x+y)*ISO.halfHeight};}
export function unproject(x,y){const a=(x-ISO.originX)/ISO.halfWidth,b=y/ISO.halfHeight;return {x:(a+b)/2,y:(b-a)/2};}
export function footprintPolygon(e,f={w:e.w,h:e.h}){return [project(e.x,e.y),project(e.x+f.w,e.y),project(e.x+f.w,e.y+f.h),project(e.x,e.y+f.h)];}
export function polygonBounds(points){const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return {left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};}
export function pointInPolygon(p,points){let sign=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],c=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);if(Math.abs(c)<1e-7)continue;const s=Math.sign(c);if(sign&&s!==sign)return false;sign=s;}return true;}
export function segmentPolygon(a,b,points){let lo=0,hi=1;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],ex=q.x-p.x,ey=q.y-p.y,base=ex*(a.y-p.y)-ey*(a.x-p.x),delta=ex*(b.y-a.y)-ey*(b.x-a.x);if(Math.abs(delta)<1e-9){if(base<0)return null;continue;}const t=-base/delta;if(delta>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}return lo;}
export function depth(e,f={w:e.w,h:e.h}){if(e.kind==='road'||e.footprintLayer==='ground')return 1;return Math.round((e.x+e.y+f.w+f.h)*10);}
export function groundRect(e,f){const polygon=footprintPolygon(e,f),b=polygonBounds(polygon);return {...b,width:b.right-b.left,height:b.bottom-b.top,polygon};}
export function spriteRect(e,f,aspect=1){const g=groundRect(e,f),width=g.width,height=e.kind==='road'?g.height:width/aspect;return {left:g.left,top:g.bottom-height,width,height,bottom:g.bottom,depth:depth(e,f)};}
export function overlaps(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}

/** CSS paints later siblings on top when z-index ties. */
export function topmostHit(candidates){return candidates.map((hit,order)=>({...hit,order})).sort((a,b)=>b.z-a.z||b.order-a.order)[0]||null;}
/** Explicit overview only; never changes or interprets saved logical camera state. */
export function fitOverview(rects,viewport,{padding=72,minZoom=.75,maxZoom=1.25}={}){
 if(!rects.length||!(viewport.w>0&&viewport.h>0))return null;
 const left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top)),right=Math.max(...rects.map(r=>r.left+r.width)),bottom=Math.max(...rects.map(r=>r.top+r.height));
 const zoom=Math.max(minZoom,Math.min(maxZoom,(viewport.w-2*padding)/Math.max(1,right-left),(viewport.h-2*padding)/Math.max(1,bottom-top)));
 return {zoom,x:viewport.w/2-(left+right)/2*zoom,y:viewport.h/2-(top+bottom)/2*zoom};
}
