import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ITEMS } from '../dist/catalog.mjs';
import artwork from '../dist/full-art-manifest.mjs';
import { islandArt } from '../dist/island-art.mjs';
import { STYLE_KEY, readKitchenStyle, rememberKitchenStyle } from '../dist/kitchen-style.mjs';

test('every catalog item maps to a packaged WebP with valid cell geometry',()=>{
  assert.deepEqual(Object.keys(artwork).sort(),Object.keys(ITEMS).sort());
  assert.equal(new Set(Object.values(artwork).map(a=>a.src)).size,411);
  for(const [id,a] of Object.entries(artwork)){
    assert.ok(a.src.startsWith('./assets/cabinet-v5/'),id);
    const bytes=fs.readFileSync(new URL('../dist/'+a.src,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF',id);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',id);
    assert.ok(a.box[0]>0&&a.box[0]<=40&&a.box[1]>0&&a.box[1]<=39,id);
    assert.ok(a.contact.x>=0&&a.contact.x<=100&&a.contact.width>0,id);
    if(a.alias)assert.equal(a.src,artwork[a.alias].src,id);
  }
});
test('cabinet skin covers all items and classic skin retains vector fallback',()=>{
  const previous=globalThis.document;
  try{
    globalThis.document={documentElement:{dataset:{kitchenStyle:'island'}}};
    for(const id of Object.keys(ITEMS))assert.ok(islandArt('item/'+id).includes(`data-3d-item="${id}"`),id);
    document.documentElement.dataset.kitchenStyle='classic';
    assert.equal(islandArt('item/food:1'),null);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('style preference is stored separately from existing gameplay progress',()=>{
  const values=new Map([['little-kitchen-save-v1','preserved save']]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  assert.equal(readKitchenStyle(storage,true),'island');
  assert.equal(rememberKitchenStyle(storage,'classic'),true);
  assert.equal(readKitchenStyle(storage,true),'classic');
  assert.equal(rememberKitchenStyle(storage,'unknown'),false);
  assert.equal(values.get('little-kitchen-save-v1'),'preserved save');
  assert.equal(values.get(STYLE_KEY),'"classic"');
});
