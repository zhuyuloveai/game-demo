// Appearance lives outside the game save. Applying a style never touches game state.
export const KITCHEN_STYLES = Object.freeze({classic:'经典厨房',island:'围坐岛台'});
export const STYLE_KEY = 'little-kitchen-style';
export function readKitchenStyle(storage, hasSave = false) {
  try { const value=JSON.parse(storage.getItem(STYLE_KEY));if(Object.hasOwn(KITCHEN_STYLES,value))return value; } catch {}
  return hasSave?'classic':'island';
}
export function rememberKitchenStyle(storage, style) {
  if(!Object.hasOwn(KITCHEN_STYLES,style))return false;
  try {storage.setItem(STYLE_KEY,JSON.stringify(style));} catch {}
  return true;
}
