// Deliberately asynchronous history traversal, like a browser's popstate task.
export function historyWindow(entries=[null],index=entries.length-1){
 const listeners=new Map(),tasks=[];let position=index;
 const win={history:{get state(){return structuredClone(entries[position]);},get length(){return entries.length;},pushState(state){entries.splice(position+1);entries.push(structuredClone(state));position++;},replaceState(state){entries[position]=structuredClone(state);},go(delta){tasks.push(()=>{const next=position+delta;if(next<0||next>=entries.length)return;position=next;for(const fn of [...listeners.get('popstate')||[]])fn({state:win.history.state});});},back(){this.go(-1);},forward(){this.go(1);}},addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},flush(){let n=0;while(tasks.length){if(++n>100)throw Error('history loop');tasks.shift()();}},get index(){return position;},get entries(){return structuredClone(entries);}};
 return win;
}
