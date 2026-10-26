import test from 'node:test';
import assert from 'node:assert/strict';
import {project,unproject,footprintPolygon,pointInPolygon,segmentPolygon,groundRect,spriteRect,depth,topmostHit,fitOverview} from '../farm-world-geometry.mjs';
import {projectedMachineTray,segmentHits,renderProjectedGround} from '../farm-scene-world.mjs';
import {readFileSync} from 'node:fs';
test('2:1 projection and inverse round trip all map cells and fractional coordinates',()=>{
 for(let x=0;x<=64;x+=.5)for(let y=0;y<=64;y+=.5){const p=project(x,y),q=unproject(p.x,p.y);assert.equal(q.x,x);assert.equal(q.y,y);}
 const a=project(20,20),b=project(21,20),c=project(20,21);assert.equal((b.y-a.y)/(b.x-a.x),.5);assert.equal((c.y-a.y)/(c.x-a.x),-.5);
});
test('camera projection survives zoom, viewport resize, saved logical center and wheel anchor',()=>{
 for(const zoom of [.75,1,1.75])for(const v of [{w:390,h:844},{w:1200,h:800}]){const center={x:22.25,y:25.5},p=project(center.x,center.y),camera={x:v.w/2-p.x*zoom,y:v.h/2-p.y*zoom};assert.deepEqual(unproject((v.w/2-camera.x)/zoom,(v.h/2-camera.y)/zoom),center);}
});
test('diamond corners are not hit by their rectangular bounds; narrow segment does not overhit adjacent field',()=>{
 const e={x:20,y:20,w:1,h:1},p=footprintPolygon(e),r=groundRect(e);assert(!pointInPolygon({x:r.left+1,y:r.top+1},p));assert(pointInPolygon(project(20.5,20.5),p));
 const a=project(20.1,20.1),b=project(20.9,20.9),q=footprintPolygon({...e,x:21});assert.equal(segmentPolygon(a,b,q),null);assert.equal(segmentHits(a,b,[{id:'other',...groundRect({...e,x:21}),polygon:q}]).length,0);
});
test('upright sprites preserve aspect and anchor to front footprint; depth uses both map axes',()=>{
 const e={x:20,y:20,w:3,h:2},r=spriteRect(e,{w:3,h:2},1.7),g=groundRect(e);assert.equal(r.width/r.height,1.7);assert.equal(r.top+r.height,g.bottom);assert(depth({...e,x:21})>depth(e));assert(depth({...e,y:21})>depth(e));
});
test('projected production tray is anchored in machine foreground and remains compact',()=>{
 const e={x:25,y:25,w:3,h:2,completed:[{},{}]},t=projectedMachineTray(e,{w:3,h:2}),p=project(26.5,27);assert.equal(t.x+t.width/2,p.x);assert(t.slots<=2);assert.equal(t.height,44);
});
test('renderer uses alpha hits, explicit harvest mode, projected camera and polygon strokes',()=>{
 const s=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');for(const marker of ['runtimeArtHit(meta,u,v)','hitWorld(p)','fadedIds(rows)',"button('harvest-view'",'polygon=screenPolygon(e)','project(saved.centerX,saved.centerY)','unproject((view.clientWidth/2-camera.x)'])assert(s.includes(marker),marker);
});

test('overlapping equal-depth sprites pick the later painted DOM sibling',()=>{assert.equal(topmostHit([{entityId:'rear',z:100},{entityId:'front',z:100}]).entityId,'front');assert.equal(topmostHit([{entityId:'higher',z:102},{entityId:'later',z:100}]).entityId,'higher');});

test('alpha-aware tool strokes skip transparent sprite corners',()=>{const target={id:'animal',left:0,top:0,right:100,bottom:100,acceptPoint:p=>Math.hypot(p.x-50,p.y-50)<20};assert.equal(segmentHits({x:1,y:1},{x:99,y:1},[target]).length,0);assert.equal(segmentHits({x:1,y:50},{x:99,y:50},[target]).length,1);});

test('explicit overview centers the entire developed farm and respects supported zoom limits',()=>{const rows=[{left:100,top:200,width:100,height:150},{left:1000,top:700,width:200,height:250}],v={w:1200,h:900},c=fitOverview(rows,v);assert(c.zoom>=.75&&c.zoom<=1.25);assert.equal(c.x+650*c.zoom,v.w/2);assert.equal(c.y+575*c.zoom,v.h/2);assert.equal(fitOverview(rows,{w:390,h:844}).zoom,.75);assert.equal(fitOverview([],{w:390,h:844}),null);});

test('camera persistence is scheduled for completed pan/pinch/wheel and flushed on pagehide',()=>{const s=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');for(const marker of ["if(g.type==='pan'){if(typeof rememberCamera",'if(finishedPinch)rememberCamera(true)',"on(win,'pagehide'",'transform();rememberCamera();},{passive:false})','Math.abs(next[k]-saved[k])>1e-7'])assert(s.includes(marker),marker);});

test('inactive stacked scenes cannot overwrite active camera and deactivation clears pending timer',()=>{const s=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');assert(s.includes("if(cameraReady&&!root.closest('[inert]'))"));assert(s.includes('ctx.onDeactivate?.(()=>{win.clearTimeout(cameraSaveTimer);cameraSaveTimer=0;'));});

test('runtime SVG icons are bounded in object panels and preview ghosts; adjacent field cells retain inset outlines',()=>{const css=readFileSync(new URL('../farm-scene-world.css',import.meta.url),'utf8');assert.match(css,/\.fw-object-panel \.fw-runtime-png\{[^}]*width:44px;height:44px/);assert.match(css,/\.fw-ghost>\.fw-runtime-png\{[^}]*width:100%;height:100%/);assert(css.includes("M24 1 47 12 24 23 1 12Z"));assert(css.includes("stroke-width='1.25'"));});

test('road art projects its source square onto both 2:1 ground axes instead of compressing a plus sign',()=>{const svg=renderProjectedGround('road.svg','道路','fw-entity-art');assert(svg.includes('viewBox="0 0 48 24"'));assert(svg.includes('width="48" height="48" transform="matrix(.5 .25 -.5 .25 24 0)"'));const matrix=(x,y)=>({x:.5*x-.5*y+24,y:.25*x+.25*y});assert.deepEqual([[0,0],[48,0],[48,48],[0,48]].map(([x,y])=>matrix(x,y)),[{x:24,y:0},{x:48,y:12},{x:24,y:24},{x:0,y:12}]);const a=matrix(0,0),b=matrix(48,0),c=matrix(0,48);assert.equal((b.y-a.y)/(b.x-a.x),.5);assert.equal((c.y-a.y)/(c.x-a.x),-.5);assert(renderProjectedGround('x"&.svg').includes('x&quot;&amp;.svg'));});

test('roads stay in the ground layer even when inserted after an overlapping crop or building',()=>{const e={x:28,y:28,w:1,h:1};assert(depth({...e,kind:'road'})<depth({...e,kind:'field'}));assert(depth({...e,x:63,y:63,kind:'road'})<depth({...e,x:0,y:0,kind:'machine'}));});
