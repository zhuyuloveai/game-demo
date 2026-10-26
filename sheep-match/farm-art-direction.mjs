/** Only two front-facing views are supplied. Reflection swaps the two isometric
 * ground axes (0 / 270); it is never a quarter-turn of the upright picture. */
export function artRotations(entity){
 if(!entity||entity.fixed||entity.skinId||['house','field','road','ground','obstacle','fruit'].includes(entity.kind))return [0];
 if(entity.kind==='decoration'&&['wood_fence','flower_fence','picnic_mat'].includes(entity.configId))return [0];
 return [0,270];
}
export function nextArtRotation(entity){const choices=artRotations(entity),i=choices.indexOf(entity.rotation||0);return choices[(i+1)%choices.length];}
export function mirroredArt(entity){return entity?.rotation===270;}
export function legacyArtRotation(entity){return !artRotations(entity).includes(entity.rotation||0);}
