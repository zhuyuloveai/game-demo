const fs=require('fs'),path=require('path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const R=path.resolve(__dirname,'..'),C=path.join(R,'chicken'),m=JSON.parse(fs.readFileSync(path.join(C,'manifest.json')));
const uri=f=>'data:image/png;base64,'+fs.readFileSync(path.join(C,f)).toString('base64');
const img=(f,x,y,w=360,h=280)=>`<image href="${uri(f)}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const tx=(s,x,y,size=18,color='#765d48')=>`<text x="${x}" y="${y}" font-size="${size}" font-family="Arial,sans-serif" fill="${color}">${s}</text>`;
const svg=(w,h,b)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f5f0e4"/>${b}</svg>`;
(async()=>{
for(const a of m.actions){let b=tx(`CHICKEN / ${a.id.toUpperCase()} / 12 FRAMES / 12 FPS`,28,37,24);for(const f of a.frames){const x=20+f.index%4*276,y=60+Math.floor(f.index/4)*242;b+=`<rect x="${x}" y="${y}" width="264" height="230" rx="16" fill="#dfe8d4"/>`+img(f.file,x-12,y-5,288,224)+tx(String(f.index+1).padStart(2,'0'),x+14,y+217,16);b+=`<path d="M ${x+132} ${y+174}v10m-5-5h10" stroke="#bd7567" fill="none" opacity=".7"/>`;}
const s=svg(1144,810,b);fs.writeFileSync(path.join(C,`previews/${a.id}-contact-sheet.svg`),s);await sharp(Buffer.from(s)).png().toFile(path.join(C,`previews/${a.id}-contact-sheet.png`));}
let b=tx('REFERENCE → ANIMATION / SAME 360 × 280 CANVAS',25,36,24);let files=['sources/reference-hungry.png','sources/reference-producing.png','sources/reference-ready.png','frames/eat/00.png','frames/eat/05.png','frames/eat/11.png','frames/walk/00.png','frames/walk/03.png','frames/walk/06.png'];let labels=['Original hungry','Original producing','Original ready','Eat 01','Eat 06','Eat 12','Walk 01','Walk 04','Walk 07'];for(let i=0;i<9;i++){let x=20+i%3*360,y=55+Math.floor(i/3)*300;b+=`<rect x="${x}" y="${y}" width="350" height="290" rx="16" fill="#e0e8d4"/>`+img(files[i],x,y)+tx(labels[i],x+15,y+278,17);}await sharp(Buffer.from(svg(1110,980,b))).png().toFile(path.join(C,'previews/reference-comparison.png'));
console.log('Preview contact sheets created.');
})();
