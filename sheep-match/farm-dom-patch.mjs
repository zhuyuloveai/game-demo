/** Retain painted nodes across presentation changes. No state/economic mutations. */
const transient=name=>name.startsWith('data-delight-')||name.startsWith('data-fw-frame');
const motionStyle=name=>name.startsWith('--delight-')||name.startsWith('--ripe-');
const identity=node=>node.nodeType===1?(node.getAttribute('data-render-key')||node.getAttribute('data-entity')||node.getAttribute('data-animal')||node.getAttribute('data-forest-id')||node.getAttribute('data-action')||null):null;
function patchAttributes(node,next){
 for(const attr of [...node.attributes])if(!next.hasAttribute(attr.name)&&!transient(attr.name)&&attr.name!=='style')node.removeAttribute(attr.name);
 for(const attr of [...next.attributes]){
  if(attr.name==='style')continue;
  if(node.getAttribute(attr.name)!==attr.value)node.setAttribute(attr.name,attr.value);
 }
 // Presentation controllers own these custom properties; resetting cssText restarts motion.
 for(const name of [...node.style])if(!next.style.getPropertyValue(name)&&!motionStyle(name))node.style.removeProperty(name);
 for(const name of [...next.style])if(node.style.getPropertyValue(name)!==next.style.getPropertyValue(name))node.style.setProperty(name,next.style.getPropertyValue(name),next.style.getPropertyPriority(name));
}
export function patchFarmChildren(parent,desired){
 const old=[...parent.childNodes],keyed=new Map(),plain=[];for(const n of old){const k=identity(n);if(k!==null)keyed.set(`${n.nodeName}:${k}`,n);else plain.push(n);}
 const used=new Set(),ordered=[];let plainIndex=0;
 for(const next of [...desired.childNodes]){
  const key=identity(next);let current=key===null?null:keyed.get(`${next.nodeName}:${key}`);
  if(key===null){for(let i=plainIndex;i<plain.length;i++)if(!used.has(plain[i])&&plain[i].nodeType===next.nodeType&&plain[i].nodeName===next.nodeName){current=plain[i];plainIndex=i+1;break;}}
  const node=current||next.cloneNode(true);
  if(current&&!node.isEqualNode?.(next)){
   if(node.nodeType===1){patchAttributes(node,next);if(!node.classList.contains('fw-forest'))patchFarmChildren(node,next);}
   else if(node.nodeValue!==next.nodeValue)node.nodeValue=next.nodeValue;
  }
  used.add(node);ordered.push(node);
 }
 for(const n of old)if(!used.has(n)&&!n.classList?.contains('fw-forest-retreat'))n.remove();
 // Remove obsolete cursors first: otherwise deleting the first tree moves every
 // retained sprite ahead of it, causing O(N) layout/compositor churn per cull.
 let cursor=parent.firstChild;for(const node of ordered){if(node!==cursor)parent.insertBefore(node,cursor);cursor=node.nextSibling;}
}
const previousMarkup=new WeakMap();
export function patchFarmMarkup(parent,markup){
 if(previousMarkup.get(parent)===markup)return false;
 const doc=parent.ownerDocument;
 if(!doc?.createElement||!parent.childNodes){parent.innerHTML=markup;previousMarkup.set(parent,markup);return true;}
 const template=doc.createElement('template');template.innerHTML=markup;
 if(!template.content){parent.innerHTML=markup;}else patchFarmChildren(parent,template.content);
 previousMarkup.set(parent,markup);return true;
}
