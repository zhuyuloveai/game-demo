import items from './full-art-manifest.mjs';
export const ISLAND_SAMPLE_IDS=Object.freeze(Object.keys(items));
export const ISLAND_UI_IDS=Object.freeze(['kitty','gift']);
export function islandArt(name,className=''){
 if(typeof document==='undefined'||document.documentElement.dataset.kitchenStyle!=='island')return null;
 const id=name.startsWith('item/')?name.slice(5):null;
 if(id){
  const a=items[id];if(!a)return null;
  return `<span class="item-3d" style="--art-width:${a.box[0]}px;--art-height:${a.box[1]}px;--contact-x:${a.contact.x}%;--contact-width:${a.contact.width}px;--contact-height:${a.contact.height}px"><img class="island-3d-art ${className}" data-3d-item="${id}" src="${a.src}" alt="" aria-hidden="true" draggable="false"></span>`;
 }
 const file=name==='gift'?'gift':name==='kitty'?'customer':['deer','bear','panda'].includes(name)?name:null;
 if(!file)return null;
 return `<img class="island-3d-art ${className}" data-art="${file}" src="../slices/${file}.webp" alt="" aria-hidden="true" draggable="false">`;
}
