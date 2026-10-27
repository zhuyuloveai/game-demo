// SVG remains the editable source. Requires sharp (or SHARP_MODULE path).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  for (const icon of manifest.icons) {
    const out = path.join(root, icon.png);
    fs.mkdirSync(path.dirname(out), {recursive:true});
    await sharp(path.join(root, icon.svg), {density:144}).resize(256,256).png().toFile(out);
  }
  const sheets = [{name:'contact-sheet', size:96}, {name:'small-size', size:40}];
  for (const {name,size} of sheets) {
    const cw=144, ch=142, cols=8, rows=Math.ceil(manifest.icons.length/cols);
    const layers=[];
    for (let i=0;i<manifest.icons.length;i++) {
      const icon=manifest.icons[i], x=(i%cols)*cw, y=Math.floor(i/cols)*ch;
      layers.push({input:await sharp(path.join(root,icon.svg)).resize(size,size).png().toBuffer(),left:x+Math.round((cw-size)/2),top:y+Math.round((108-size)/2)});
      layers.push({input:Buffer.from(`<svg width="144" height="30"><text x="72" y="18" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#725642">${icon.id}</text></svg>`),left:x,top:y+108});
    }
    fs.mkdirSync(path.join(root,'previews'),{recursive:true});
    await sharp({create:{width:cw*cols,height:ch*rows,channels:4,background:'#fff7e7'}}).composite(layers).png().toFile(path.join(root,`previews/${name}.png`));
  }
  console.log(`Exported ${manifest.icons.length} transparent PNGs and 2 contact sheets.`);
})();
