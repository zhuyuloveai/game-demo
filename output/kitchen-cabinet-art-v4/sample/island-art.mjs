// Exactly ten item samples. Unmapped items retain original art.
const mapping={"food:1":"wheat","food:2":"flour","food:4":"bread","vegetable:2":"tomato","fruit:2":"orange","fruit:3":"strawberry","tools:2":"whisk","tools:4":"saucepan","tableware:2":"bowl","gen_food:5":"producer"};
export const ISLAND_SAMPLE_IDS=Object.freeze(Object.keys(mapping));
export const ISLAND_UI_IDS=Object.freeze(['kitty','gift']);
export function islandArt(name,className=''){
 if(typeof document==='undefined'||document.documentElement.dataset.kitchenStyle!=='island')return null;
 const id=name.startsWith('item/')?name.slice(5):null;
 const file=id?mapping[id]:name==='gift'?'gift':name==='kitty'?'customer':['deer','bear','panda'].includes(name)?name:null;
 if(!file)return null;
 return '<img class="island-3d-art '+className+'" data-art="'+file+'" '+(id?'data-3d-item="'+id+'"':'')+' src="../slices/'+file+'.webp" alt="" aria-hidden="true" draggable="false">';
}
