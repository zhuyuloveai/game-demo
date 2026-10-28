import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {priorityIconUrl,priorityIconPaths} from '../farm-priority-icons.mjs';
import {farmAssetUrl,farmAssetPathUrl,farmAsset} from '../farm-assets.mjs';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('assets/farm/priority-icons-v1/manifest.json',root)));
test('priority icons preserve original assets and copy only live presentation mapping',()=>{
 assert.equal(manifest.icons.length,62);
 for(const icon of manifest.icons){
  const bytes=readFileSync(new URL('assets/farm/priority-icons-v1/'+icon.svg,root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),icon.sha256,icon.svg);
  assert.match(bytes.toString(),/viewBox="0 0 128 128"/);
  assert.doesNotMatch(bytes.toString(),/<image|<script|<foreignObject/);
  if(icon.originalPath)assert.ok(existsSync(new URL(icon.originalPath.replace('sheep-match/',''),root)));
 }
 assert.equal(Object.keys(priorityIconPaths()).length,62);
});
test('items and legacy UI paths resolve new icons while unrelated art stays unchanged',()=>{
 for(const id of ['wheat','milk','cow_feed','egg','blueberries'])assert.match(farmAssetUrl(id),new RegExp('/priority-icons-v1/items/'+id+'\\.svg$'));
 assert.match(farmAssetPathUrl('ui/harvest.svg'),/priority-icons-v1\/ui\/harvest\.svg$/);
 assert.equal(farmAsset('wheat').path,'items/wheat.svg');
 assert.match(farmAssetUrl('bread'),/\/completion-icons-v1\/icons\/processed\/bread\.svg$/);
 assert.equal(priorityIconUrl('buildings/Barn.svg'),null);
 assert.match(farmAssetPathUrl('buildings/Barn.svg'),/\/assets\/farm\/buildings\/Barn\.svg$/);
});
test('fruit tool uses basket, with animal collection props kept as source-only art',()=>{
 assert.match(priorityIconUrl('tools/fruit-basket.svg'),/priority-icons-v1\/tools\/fruit-basket\.svg$/);
 for(const id of manifest.unusedTools)assert.equal(priorityIconUrl('tools/'+id+'.svg'),null);
 const world=readFileSync(new URL('farm-scene-world.mjs',root),'utf8');
 assert.match(world,/action==='harvest'&&e\?\.kind==='fruit'/);
 assert.match(world,/priorityIconUrl\('tools\/fruit-basket.svg'\)/);
});
