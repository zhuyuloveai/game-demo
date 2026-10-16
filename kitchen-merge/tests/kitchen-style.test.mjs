import test from 'node:test';
import assert from 'node:assert/strict';
import {readKitchenStyle,rememberKitchenStyle,STYLE_KEY} from '../dist/kitchen-style.mjs';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};};
test('existing save defaults to classic, new kitchen to island',()=>{
 const s=memory();assert.equal(readKitchenStyle(s,true),'classic');assert.equal(readKitchenStyle(s,false),'island');
});
test('explicit preference survives reload and never writes the game save',()=>{
 const s=memory();s.setItem('little-kitchen-save-v1','protected progress');
 for(const style of ['classic','island','classic']){assert.equal(rememberKitchenStyle(s,style),true);assert.equal(readKitchenStyle(s,true),style);assert.equal(readKitchenStyle(s,false),style);}
 assert.equal(s.getItem('little-kitchen-save-v1'),'protected progress');assert.equal(s.data.size,2);
});
test('malformed preferences and unavailable storage still allow session switching',()=>{
 const s=memory();for(const value of ['broken','null','"unknown"','{}']){s.setItem(STYLE_KEY,value);assert.equal(readKitchenStyle(s,true),'classic');}
 const denied={getItem(){throw Error('denied')},setItem(){throw Error('quota')}};
 assert.equal(readKitchenStyle(denied),'island');assert.equal(rememberKitchenStyle(denied,'classic'),true);assert.equal(rememberKitchenStyle(s,'unknown'),false);
});
