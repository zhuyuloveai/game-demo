// Art-delivery assembler only. Does not import or modify game code.
// AI-made artwork is preserved; SVG groups, transforms and clip boundaries
// define the shared canvas and export layers without painting over the sources.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require(process.env.SHARP_MODULE || 'sharp');
const root=__dirname,W=1200,H=1000;
const data=n=>'data:image/png;base64,'+fs.readFileSync(path.join(root,'sources',n)).toString('base64');
const sourceImage=(name,x,y,w,h,extra='')=>`<image href="${data(name)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" ${extra}/>`;
const svg=(body,w=W,h=H)=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const group=(id,label,body)=>`<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}">${body}</g>`;
const blur=`<defs><filter id="shadow-blur" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>`;
const ring=sourceImage('fence-ring-generated.png',60,270,1774*.609,887*.66);
const cut='M0 0H1774V370H1695L1650 400L1600 430H170L125 405L94 370H0Z';
// Clip masks live in the generated ring's original coordinates, then share one transform.
const clippedRing=(side)=>`<defs><clipPath id="${side}" clipPathUnits="userSpaceOnUse"><path d="${side==='front'?'M0 0H1774V887H0Z':''}${cut}" clip-rule="evenodd"/></clipPath></defs><g transform="translate(60 270) scale(.609 .66)">${sourceImage('fence-ring-generated.png',0,0,1774,887,`clip-path="url(#${side})"`)}</g>`;
const layers=[
 {id:'01-ground',label:'01 院落地面',body:sourceImage('yard-ground-generated.png',39.6,245.4,1774*.631,887*.723)},
 {id:'02-building-shadow',label:'02 建筑落地阴影',body:blur+`<path d="M415 446L645 355L907 490L640 575Z" fill="#7f7053" opacity=".14" filter="url(#shadow-blur)"/><path d="M414 447L635 571L903 494" fill="none" stroke="#8d7854" stroke-width="10" stroke-linecap="round" opacity=".1" filter="url(#shadow-blur)"/>`},
 {id:'03-rear-fence',label:'03 后栏与远侧栏',body:clippedRing('rear')},
 {id:'04-building',label:'04 后方建筑主体',body:sourceImage('barn-building-edited.png',350-96*(560/1187),100-60*(560/1187),1312*(560/1187),1199*(560/1187))},
 {id:'07-front-fence',label:'07 前栏与近侧栏',body:clippedRing('front')}
];
const animals=[
 {state:'hungry',source:'cow-hungry-original.png',body:[98,304,1138,951],anchor:[618,1020],contacts:[[405,990],[618,1020],[951,982]],contactKind:'standing hooves'},
 {state:'producing',source:'cow-producing-original.png',body:[74,354,1174,986],anchor:[624,1013],contacts:[[404,996],[624,1013],[813,976],[1004,965]],contactKind:'curled hooves and belly'},
 {state:'ready',source:'cow-ready-original.png',body:[96,325,1160,979],anchor:[628,1022],contacts:[[405,984],[628,1022],[811,956],[998,982]],contactKind:'standing hooves'}
];
const animalTarget={width:360,height:280,anchor:[180,230],bodyWidth:238};
const places=[{state:'hungry',at:[330,620]},{state:'producing',at:[600,620]},{state:'ready',at:[870,620]},{state:'ready',at:[470,730]},{state:'hungry',at:[730,730]}];
(async()=>{
 for(const a of animals){a.scale=animalTarget.bodyWidth/(a.body[2]-a.body[0]);a.offset=[180-a.anchor[0]*a.scale,230-a.anchor[1]*a.scale];a.normalizedContacts=a.contacts.map(p=>p.map((v,i)=>+(v*a.scale+a.offset[i]).toFixed(3)));a.bodyNormalized=[a.body[0]*a.scale+a.offset[0],a.body[1]*a.scale+a.offset[1],a.body[2]*a.scale+a.offset[0],a.body[3]*a.scale+a.offset[1]];
 a.bodySvg=sourceImage(a.source,...a.offset,1312*a.scale,1199*a.scale);
 a.shadowSvg=`<ellipse cx="180" cy="220" rx="88" ry="16" fill="#85734d" opacity=".09"/>`+a.normalizedContacts.map(([x,y])=>`<ellipse cx="${x}" cy="${y-1}" rx="18" ry="4.5" fill="#806e4d" opacity=".13"/>`).join('');
 await sharp(Buffer.from(svg(a.bodySvg,360,280))).png().toFile(path.join(root,'animals',`cow-${a.state}.png`));
 await sharp(Buffer.from(svg(a.shadowSvg,360,280))).png().toFile(path.join(root,'animals',`cow-${a.state}-shadow.png`));
 fs.writeFileSync(path.join(root,'animals',`cow-${a.state}.svg`),svg(group(a.state,a.state,a.bodySvg),360,280));
 }
 for(const l of layers){fs.writeFileSync(path.join(root,'layers',l.id+'.svg'),svg(group(l.id,l.label,l.body)));await sharp(Buffer.from(svg(l.body))).png().toFile(path.join(root,'layers',l.id+'.png'));}
 let animalGroups=[],shadowGroups=[];
 for(let i=0;i<places.length;i++){const p=places[i],a=animals.find(a=>a.state===p.state),t=`translate(${p.at[0]-180} ${p.at[1]-230})`;shadowGroups.push(group('animal-shadow-'+(i+1),'动物阴影 '+(i+1),`<g transform="${t}">${a.shadowSvg}</g>`));animalGroups.push(group('animal-'+(i+1),'牛 '+(i+1)+' '+p.state,`<g transform="${t}">${a.bodySvg}</g>`));await sharp(Buffer.from(svg(animalGroups.at(-1)))).png().toFile(path.join(root,'layers',`reference-cow-${i+1}.png`));}
 const base=layers.slice(0,4).map(l=>group(l.id,l.label,l.body)).join(''),front=group(layers[4].id,layers[4].label,layers[4].body);
 const empty=svg(base+front),full=svg(base+group('05-animal-shadows','05 动物落地阴影',shadowGroups.join(''))+group('06-animals','06 独立动物参考',animalGroups.join(''))+front);
 fs.writeFileSync(path.join(root,'cow-empty-source.svg'),empty);fs.writeFileSync(path.join(root,'cow-full-source.svg'),full);
 await sharp(Buffer.from(empty)).png().toFile(path.join(root,'previews','empty.png'));await sharp(Buffer.from(full)).png().toFile(path.join(root,'previews','full.png'));
 await sharp(Buffer.from(svg(shadowGroups.join('')))).png().toFile(path.join(root,'layers','reference-animal-shadows.png'));
 const footprint=[[600,340],[1100,590],[600,840],[100,590]],standing=[[250,545],[950,545],[1095,590],[600,838],[105,590]],buildingSupport=[[645,355],[907,490],[640,575],[415,446]],entry=[524,500];
 const overlay=`<path d="M${footprint.map(p=>p.join(' ')).join('L')}Z" fill="#518ba322" stroke="#387b9b" stroke-width="3" stroke-dasharray="10 8"/><path d="M${standing.map(p=>p.join(' ')).join('L')}ZM${buildingSupport.map(p=>p.join(' ')).join('L')}Z" fill-rule="evenodd" fill="#5da36a22" stroke="#428454" stroke-width="3"/><path d="M${buildingSupport.map(p=>p.join(' ')).join('L')}Z" fill="#b084a522" stroke="#9d6b8d" stroke-width="2"/><path d="M100 590L600 840L1100 590" fill="none" stroke="#c77b4e" stroke-width="4" stroke-dasharray="10 8"/><circle cx="${entry[0]}" cy="${entry[1]}" r="9" fill="#d8803f"/>`+places.map((p,i)=>`<circle cx="${p.at[0]}" cy="${p.at[1]}" r="6" fill="#31694d"/><text x="${p.at[0]+10}" y="${p.at[1]+5}" font-family="sans-serif" font-size="18" fill="#28563e">${i+1}</text>`).join('');
 fs.writeFileSync(path.join(root,'previews','spatial-guide.svg'),svg(base+front+overlay));await sharp(Buffer.from(svg(base+front+overlay))).png().toFile(path.join(root,'previews','spatial-guide.png'));
 const metadata={version:2,id:'cow',name:'牛棚',status:'completed art-only delivery',baseCommit:'7925a5b255cdb07efc4a1d148aa8fdea45019691',canvas:{width:W,height:H,commonAnchor:[600,590],layerOffset:[0,0],cropped:false},footprint:{logicalTiles:[4,4],tileAxisX:[125,62.5],tileAxisY:[-125,62.5],polygon:footprint},buildingSupport,standingRegion:standing,standingExclusions:[buildingSupport],entry:{threshold:entry,direction:'front-left',yardGate:[235,660]},occlusion:{foregroundGroundBoundary:[[100,590],[600,840],[1100,590]],fenceHeightPx:60,fenceOriginalSplitPath:cut,maskIn:'sources/fence-ring-generated.png',sourceToCanvas:{scale:[.609,.66],offset:[60,270]},note:'Use exported front alpha to occlude feet; do not use the entire foreground bounding box.'},layerOrder:['01-ground','02-building-shadow','03-rear-fence','04-building','reference-animal-shadows','reference-cow-1','reference-cow-2','reference-cow-3','reference-cow-4','reference-cow-5','07-front-fence'],animalCanvas:animalTarget,animals:animals.map(({bodySvg,shadowSvg,...a})=>a),referenceAnimalPlacements:places,sourceMapping:{'assets/buildings/cow-shelter.png':'layers/04-building.png','assets/animals/cow.png':'animals/cow-hungry.png','animal-states/assets/cow-producing.png':'animals/cow-producing.png','animal-states/assets/cow-ready.png':'animals/cow-ready.png'},notes:['No game modules or original art changed.','Animal originals are reused pixel-for-pixel before uniform scaling and placement.','Sources retain original canvases; all facility exports are aligned 1200x1000.','Use normalized animals at unit scale; their actual front-middle hoof contact is [180,230], not canvas bottom center.','No capacity or hitbox changes are implemented.']};
 fs.writeFileSync(path.join(root,'layout.json'),JSON.stringify(metadata,null,2)+'\n');
 console.log('Exported common-canvas layers, editable SVGs, normalized animal references and previews.');
})();
