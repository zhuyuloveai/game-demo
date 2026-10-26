import {resolveShelterSpec} from './farm-runtime-shelters.mjs';
import {shelterCanvasRect,shelterLayerDepths} from './farm-shelter-geometry.mjs';
import {renderRuntimeArt} from './farm-runtime-art.mjs';
import {groundRect,depth} from './farm-world-geometry.mjs';

/** Reuses the approved hut PNG as the back building. Yard and fences are native
 * terrain components, drawn in the same shared ground canvas for all five pens.
 * Animals stay independent; the near fence covers feet, never faces or targets. */
export function penLayers(entity,footprint){
 const spec=resolveShelterSpec(entity);
 if(spec){const r=shelterCanvasRect(entity,footprint),d=shelterLayerDepths(entity,footprint),draw=key=>renderRuntimeArt(spec.layers[key],{className:'fw-pen-layer',mirror:entity.rotation===270});return {ground:draw('ground')+draw('buildingShadow'),rear:draw('rearFence'),front:draw('frontFence'),style:`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`,groundDepth:d.ground,rearDepth:d.rearFence,frontDepth:d.frontFence};}
 const g=groundRect(entity,footprint),w=g.width,h=g.height;
 const pt=(x,y)=>[w*x,h*y];
 const A=pt(.5,.035),B=pt(.965,.5),C=pt(.5,.965),D=pt(.035,.5);
 const line=(a,b)=>`M${a.join(' ')}L${b.join(' ')}`;
 const rail=(a,b)=>`<path d="${line([a[0],a[1]-7],[b[0],b[1]-7])}" stroke="#b69b75" stroke-width="5"/><path d="${line([a[0],a[1]-8],[b[0],b[1]-8])}" stroke="#f1d3a4" stroke-width="3"/>`;
 const post=p=>`<path d="M${p[0]-2} ${p[1]}v-13q2-3 4 0v13Z" fill="#ecd0a5" stroke="#ae946e" stroke-width="1"/>`;
 const midpoint=(a,b,t=.5)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -18 ${w} ${h+18}" aria-hidden="true" class="fw-pen-layer">${body}</svg>`;
 const ground=`<path d="M${[A,B,C,D].map(p=>p.join(' ')).join('L')}Z" fill="#d1dfaa" stroke="#b5c491" stroke-width="1.3"/><path d="M${w*.5} ${h*.28}Q${w*.68} ${h*.32} ${w*.74} ${h*.56}L${w*.5} ${h*.82}L${w*.24} ${h*.57}Q${w*.32} ${h*.39} ${w*.5} ${h*.28}" fill="#e3d2ab" opacity=".8"/>`;
 const rear=rail(D,A)+rail(A,B)+[A,B,D].map(post).join('');
 // The gate on the +y edge aligns with the actual operation door. Reflection
 // for the right-facing view puts it on the +x edge without rotating the hut.
 const gateL=midpoint(D,C,.38),gateR=midpoint(D,C,.66);
 let front=rail(D,gateL)+rail(gateR,C)+rail(C,B)+[D,gateL,gateR,C,B,midpoint(C,B)].map(post).join('');
 if(entity.rotation===270)front=`<g transform="translate(${w} 0) scale(-1 1)">${front}</g>`;
 const style=`left:${g.left}px;top:${g.top-18}px;width:${w}px;height:${h+18}px`;
 return {ground:svg(ground),rear:svg(rear),front:svg(front),style,groundDepth:1,rearDepth:Math.round((entity.x+entity.y)*10)-1,frontDepth:depth(entity,footprint)+1};
}
