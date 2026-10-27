import test from 'node:test';
import assert from 'node:assert/strict';
import {patchFarmChildren,patchFarmMarkup} from '../farm-dom-patch.mjs';
class Style extends Map {getPropertyValue(k){return this.get(k)||''}getPropertyPriority(){return ''}setProperty(k,v){this.set(k,v)}removeProperty(k){this.delete(k)}[Symbol.iterator](){return this.keys()}}
class Node {
 constructor(name='DIV',attrs={},kids=[]){this.nodeType=1;this.nodeName=name;this.attrs=new Map(Object.entries(attrs));this.style=new Style();this.childNodes=[];this.classList={contains:c=>(this.getAttribute('class')||'').split(' ').includes(c)};for(const k of kids)this.insertBefore(k,null)}
 get attributes(){return [...this.attrs].map(([name,value])=>({name,value}))}getAttribute(k){return this.attrs.get(k)??null}hasAttribute(k){return this.attrs.has(k)}setAttribute(k,v){this.attrs.set(k,v)}removeAttribute(k){this.attrs.delete(k)}
 get firstChild(){return this.childNodes[0]||null}get nextSibling(){const a=this.parentNode?.childNodes;return a?.[a.indexOf(this)+1]||null}
 insertBefore(n,c){n.remove();const i=c?this.childNodes.indexOf(c):this.childNodes.length;this.childNodes.splice(i,0,n);n.parentNode=this;return n}remove(){if(this.parentNode){const a=this.parentNode.childNodes;a.splice(a.indexOf(this),1);this.parentNode=null}}
 cloneNode(deep){const n=new Node(this.nodeName,Object.fromEntries(this.attrs),deep?this.childNodes.map(c=>c.cloneNode(true)):[]);for(const [k,v]of this.style.entries())n.style.set(k,v);return n}
}
test('world keyed patches retain live sprites and reorder without replacements',()=>{const a=new Node('BUTTON',{'data-entity':'a'},[new Node('IMG',{src:'a.png'})]),b=new Node('BUTTON',{'data-entity':'b'}),root=new Node('DIV',{},[a,b]),image=a.firstChild;patchFarmChildren(root,new Node('DIV',{},[b.cloneNode(true),a.cloneNode(true)]));assert.equal(root.firstChild,b);assert.equal(root.childNodes[1],a);assert.equal(a.firstChild,image)});
test('controller phase and frame markers survive presentation patch, obsolete styles removed',()=>{const a=new Node('BUTTON',{'data-animal':'a','data-delight-idle':'animal','data-fw-frame':'3',title:'old'});a.style.set('--delight-delay','-300ms');a.style.set('left','10px');a.style.set('opacity','.2');const b=new Node('BUTTON',{'data-animal':'a',title:'new'});b.style.set('left','20px');const root=new Node('DIV',{},[a]);patchFarmChildren(root,new Node('DIV',{},[b]));assert.equal(a.style.get('--delight-delay'),'-300ms');assert.equal(a.getAttribute('data-fw-frame'),'3');assert.equal(a.style.get('left'),'20px');assert.equal(a.style.has('opacity'),false);assert.equal(a.getAttribute('title'),'new')});
test('forest subtree is retained during world updates, absent entities removed',()=>{const tree=new Node('IMG',{src:'tree.svg'}),forest=new Node('DIV',{'data-render-key':'forest',class:'fw-forest'},[tree]),removed=new Node('BUTTON',{'data-entity':'removed'}),root=new Node('DIV',{},[forest,removed]);patchFarmChildren(root,new Node('DIV',{},[new Node('DIV',{'data-render-key':'forest',class:'fw-forest'})]));assert.equal(root.firstChild,forest);assert.equal(forest.firstChild,tree);assert.equal(root.childNodes.length,1)});
test('unchanged markup is zero-write even for minimal adapters',()=>{let writes=0;const root={set innerHTML(v){writes++}};assert.equal(patchFarmMarkup(root,'hello'),true);assert.equal(patchFarmMarkup(root,'hello'),false);assert.equal(writes,1)});
function countedRoot(keys){
 const nodes=keys.map(k=>new Node('IMG',{'data-forest-id':k,src:`${k}.png`})),root=new Node('DIV',{},nodes);let moves=0;
 const insert=root.insertBefore;root.insertBefore=function(...args){moves++;return insert.apply(this,args)};
 return {root,nodes,get moves(){return moves},desired:keys=>new Node('DIV',{},keys.map(k=>new Node('IMG',{'data-forest-id':k,src:`${k}.png`})))};
}
test('removing forest prefix performs no insertion of any retained sprite',()=>{
 const keys=Array.from({length:200},(_,i)=>String(i)),h=countedRoot(keys);
 patchFarmChildren(h.root,h.desired(keys.slice(3)));
 assert.equal(h.moves,0);assert.equal(h.root.childNodes.length,197);assert.equal(h.root.firstChild,h.nodes[3]);
});
test('interleaved culling preserves retained order with zero moves; new key adds only itself',()=>{
 const h=countedRoot(['a','b','c','d','e']);patchFarmChildren(h.root,h.desired(['a','c','e']));
 assert.equal(h.moves,0);assert.deepEqual(h.root.childNodes,[h.nodes[0],h.nodes[2],h.nodes[4]]);
 patchFarmChildren(h.root,h.desired(['a','new','c','e']));assert.equal(h.moves,1);assert.equal(h.root.childNodes[2],h.nodes[2]);
});
test('actual reorder moves one keyed sprite and retains frame attributes and motion phase',()=>{
 const h=countedRoot(['a','b','c']);h.nodes[2].setAttribute('data-fw-frame','9');h.nodes[2].style.set('--delight-delay','-400ms');
 patchFarmChildren(h.root,h.desired(['c','a','b']));assert.equal(h.moves,1);assert.equal(h.root.firstChild,h.nodes[2]);assert.equal(h.nodes[2].getAttribute('data-fw-frame'),'9');assert.equal(h.nodes[2].style.get('--delight-delay'),'-400ms');
});
test('two-pass cull leaves retiring decorations attached for their cleanup timer',()=>{
 const h=countedRoot(['a','b']);const retiring=new Node('IMG',{class:'fw-forest-retreat','data-forest-id':'old'});h.root.insertBefore(retiring,null);
 const before=h.moves;patchFarmChildren(h.root,h.desired(['b']));assert.equal(h.moves,before);assert.deepEqual(h.root.childNodes,[h.nodes[1],retiring]);
});
test('native equal-subtree fastpath skips attribute traversal without replacing or reordering',()=>{
 const h=countedRoot(['a','b']);let equalChecks=0;
 for(const n of h.nodes){n.isEqualNode=next=>{equalChecks++;return n.getAttribute('src')===next.getAttribute('src')};Object.defineProperty(n,'attributes',{get(){throw Error('equal subtree must skip attribute walk')}})}
 patchFarmChildren(h.root,h.desired(['a','b']));assert.equal(equalChecks,2);assert.equal(h.moves,0);assert.deepEqual(h.root.childNodes,h.nodes);
});
test('native unequal-subtree path still updates changed content and preserves motion ownership',()=>{
 const h=countedRoot(['a']);h.nodes[0].isEqualNode=()=>false;h.nodes[0].setAttribute('data-fw-frame','4');
 const desired=h.desired(['a']);desired.firstChild.setAttribute('src','changed.png');patchFarmChildren(h.root,desired);
 assert.equal(h.nodes[0].getAttribute('src'),'changed.png');assert.equal(h.nodes[0].getAttribute('data-fw-frame'),'4');assert.equal(h.moves,0);
});
