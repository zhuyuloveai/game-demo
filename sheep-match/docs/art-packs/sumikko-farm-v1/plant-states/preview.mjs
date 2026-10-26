const list=document.querySelector('#families'),dialog=document.querySelector('#detail');
let group='all',bg='grass',manifest;
function render(){
  list.replaceChildren();const lookup=new Map(manifest.assets.map(a=>[a.key,a]));
  for(const f of manifest.families.filter(f=>group==='all'||f.group===group)){
    const row=document.createElement('section');row.className='family';
    const header=document.createElement('div');header.className='family-header';const title=document.createElement('h2');title.textContent=f.label;const key=document.createElement('span');key.textContent=f.plant;header.append(title,key);row.append(header);
    const stages=document.createElement('div');stages.className='stages';stages.style.setProperty('--cols',f.states.length);
    for(const id of f.states){
      const a=lookup.get(id),card=document.createElement('button');card.className='card';
      if(!a){card.disabled=true;card.innerHTML='<div class="art missing">准备中</div><div class="caption">'+id.split('-').at(-1)+'</div>';stages.append(card);continue;}
      card.setAttribute('aria-label',`查看${a.label}·${a.stateLabel}`);
      const art=document.createElement('div');art.className='art';
      const ns='http://www.w3.org/2000/svg',[l,t,r,b]=a.opaqueBounds,height=155*a.heightScale;
      const crop=document.createElementNS(ns,'svg');crop.setAttribute('viewBox',`${l} ${t} ${r-l} ${b-t}`);crop.setAttribute('width',String(height*(r-l)/(b-t)));crop.setAttribute('height',String(height));crop.setAttribute('preserveAspectRatio','xMidYMax meet');crop.setAttribute('aria-hidden','true');crop.style.maxWidth='100%';crop.style.maxHeight='100%';
      const img=document.createElementNS(ns,'image');img.setAttribute('href',a.path);img.setAttribute('width',a.size[0]);img.setAttribute('height',a.size[1]);crop.append(img);art.append(crop);
      const caption=document.createElement('div');caption.className='caption';const name=document.createElement('span');name.textContent=a.stateLabel;const tag=document.createElement('small');tag.textContent=a.status==='existing'?'已有成熟图':'新增状态';caption.append(name,tag);card.append(art,caption);
      card.onclick=()=>{document.querySelector('#detail-title').textContent=`${a.label} · ${a.stateLabel}`;document.querySelector('#detail-image').src=a.path;document.querySelector('#detail-image').alt=`${a.label}·${a.stateLabel}`;document.querySelector('#detail-dimensions').textContent=`${a.size[0]} × ${a.size[1]} · 透明 PNG`;document.querySelector('#download').href=a.path;dialog.className=bg;dialog.showModal();};stages.append(card);
    }
    row.append(stages);list.append(row);
  }
}
document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{group=b.dataset.group;document.querySelectorAll('[data-group]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
document.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{bg=b.dataset.bg;list.className=bg;document.querySelectorAll('[data-bg]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelector('#close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
try{const r=await fetch('manifest.json');if(!r.ok)throw new Error('清单读取失败');manifest=await r.json();document.querySelector('#status').textContent=`已补齐 ${manifest.counts.generated} / 42 张`;render();document.body.dataset.ready='true';}catch(e){document.querySelector('#status').textContent=e.message;console.error(e);}
