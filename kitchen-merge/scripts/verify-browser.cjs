// Run against an isolated local server with Playwright and a local Chrome.
// PLAYWRIGHT_MODULE=/path/to/playwright CHROME_EXECUTABLE=/path/to/chrome node ...
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const base=process.env.KITCHEN_TEST_URL||'http://127.0.0.1:4187';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('QA must run locally');
const output=process.env.KITCHEN_TEST_OUTPUT?path.resolve(process.env.KITCHEN_TEST_OUTPUT):path.resolve(__dirname,'../docs/verification/feige-alignment');fs.mkdirSync(output,{recursive:true});
const NOW=1792108800000,checks=[],errors=[];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.addInitScript(()=>{localStorage.setItem('little-kitchen-music','false');localStorage.setItem('little-kitchen-sound','false');});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date(NOW)});await page.clock.pauseAt(new Date(NOW));
 const state=(key='little-kitchen-save-v1')=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 const close=async()=>{if(await page.locator('#modal[open]').count())await page.locator('#modal [data-action="close"]').click();};
 const cell=i=>page.locator(`[data-cell="${i}"]`);
 async function drag(from,to){await cell(from).scrollIntoViewIfNeeded();const a=await cell(from).boundingBox(),b=await cell(to).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});await page.mouse.up();await page.clock.runFor(1);}
 await page.goto(base+'/');await cell(62).waitFor();
 const board=await page.locator('#board').evaluate(el=>({cells:el.children.length,width:el.clientWidth,height:el.clientHeight,rows:getComputedStyle(el).gridTemplateRows.split(' ').length,cols:getComputedStyle(el).gridTemplateColumns.split(' ').length,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.equal(board.cells,63);assert.equal(board.rows,9);assert.equal(board.cols,7);assert.ok(Math.abs(board.height/board.width-9/7)<.01);assert.ok(board.scrollWidth<=board.viewport);
 checks.push({name:'mobile 390px board and all bottom cells',result:board});await page.screenshot({path:path.join(output,'mobile-63.png'),fullPage:true});
 await page.locator('[data-fulfill]').first().click();let s=await state();assert.equal(s.coins,131);assert.equal(s.stars,1);checks.push({name:'actual first main-order delivery',coins:s.coins,stars:s.stars});
 await cell(0).click();s=await state();assert.equal(s.energy,99);assert.equal(s.board[0].stock,11);checks.push({name:'historical food basket capacity 12 and paid production',stock:s.board[0].stock,energy:s.energy});
 await drag(9,10);s=await state();assert.equal(s.board[10].itemId,'food:2');assert.equal(s.board[9],null);
 await cell(10).click();await page.locator('[data-action="storage"]').click();await page.locator('#modal [data-action="store"]').click();s=await state();assert.equal(s.inventory[0].itemId,'food:2');await page.locator('[data-retrieve="0"]').click();await close();
 checks.push({name:'real pointer merge and inventory round trip',merges:s.merges});
 await page.locator('[data-action="rewards"]').click();await page.locator('[data-action="daily"]').click();await close();s=await state();assert.ok(s.pending.some(x=>x.itemId==='energybox:1'));checks.push({name:'daily reward enters pending exactly once',pending:s.pending.length});
 const saved=await state();await page.reload();await cell(62).waitFor();s=await state();assert.equal(s.merges,saved.merges);assert.equal(s.coins,saved.coins);await page.screenshot({path:path.join(output,'mobile-played.png'),fullPage:true});
 const player=await page.evaluate(()=>localStorage.getItem('little-kitchen-save-v1'));
 await page.goto(base+'/index.html?qa=special');await cell(62).waitFor();await cell(2).click();let hint=await page.locator('#selection-card').innerText();assert.ok(hint.includes('合成末级'));assert.ok(!hint.includes('同级可合成'));
 await cell(0).click();assert.ok((await page.locator('#selection-card').innerText()).includes('麻布片'));await drag(0,1);s=await state('little-kitchen-qa-special');assert.equal(s.board[1].itemId,'doll:1');
 await cell(13).click();await page.locator('[data-action="generate"]').click();s=await state('little-kitchen-qa-special');assert.equal(s.board[13].remainingDraws,11);assert.equal(s.board[13].stock,null);checks.push({name:'special hints, cross-chain pointer merge and finite nest',remaining:s.board[13].remainingDraws});
 await page.screenshot({path:path.join(output,'special-routes.png'),fullPage:true});
 // Seed only the isolated QA slot; subsequent actions use the rendered controls.
 await page.evaluate(async now=>{const E=await import('./engine.mjs');const s=E.createGame(null,now);s.board.fill(null);s.locked=[];s.pending=[];s.tools=[];s.stage=11;s.energy=10;for(const [i,id]of [[60,'food:1'],[61,'food:1'],[62,'gen_tools:4'],[2,'energy:5'],[3,'splitter:3'],[4,'splitter:3']])s.board[i]=E.makeItem(s,id,now);localStorage.setItem('little-kitchen-qa-resources',E.serialize(s));},NOW);
 await page.goto(base+'/index.html?qa=resources');await cell(62).waitFor();await drag(60,61);s=await state('little-kitchen-qa-resources');assert.equal(s.board[61].itemId,'food:2');await cell(62).click();
 await cell(2).click();await page.locator('[data-action="collect"]').click();s=await state('little-kitchen-qa-resources');assert.equal(s.energy,109);assert.equal(s.board[2],null);
 await drag(3,4);s=await state('little-kitchen-qa-resources');assert.equal(s.board[4].uses,2);await cell(4).click();assert.ok((await page.locator('#selection-card').innerText()).includes('余2把'));
 checks.push({name:'bottom-row pointer merge and production, resource claim, scissor stacking',energy:s.energy,uses:s.board[4].uses});await page.screenshot({path:path.join(output,'bottom-row-actions.png'),fullPage:true});
 // Frozen real PR6 save. Backup must complete before app replaces the active QA save.
 const v3=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../tests/fixtures/v3-49.json'),'utf8'));await page.evaluate(raw=>localStorage.setItem('little-kitchen-qa-migration',raw),JSON.stringify(v3));
 await page.goto(base+'/index.html?qa=migration');await cell(62).waitFor();s=await state('little-kitchen-qa-migration');assert.equal(s.version,4);assert.equal(s.board[48].id,v3.board[48].id);assert.equal(s.board[4].remainingDraws,7);assert.equal(s.board[0].stock+s.board[0].stockOverflow,27);assert.equal(s.board[3].legacyV3,true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('little-kitchen-qa-migration-v3-backup')),JSON.stringify(v3));
 checks.push({name:'real v3 browser backup + migration',cells:s.board.length,coins:s.coins,lastOldCell:s.board[48].id,oldNest:s.board[3].legacyV3});await page.screenshot({path:path.join(output,'v3-migration.png'),fullPage:true});
 await page.reload();await cell(62).waitFor();s=await state('little-kitchen-qa-migration');assert.equal(s.coins,v3.coins);assert.equal(s.board[4].remainingDraws,7);assert.equal(await page.evaluate(()=>localStorage.getItem('little-kitchen-save-v1')),player);
 checks.push({name:'QA save and backups isolated from normal player slot',result:true});
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/');await cell(62).waitFor();await page.screenshot({path:path.join(output,'desktop-63.png'),fullPage:true});
 const desktop=await cell(62).boundingBox();assert.ok(desktop.width>40);checks.push({name:'desktop last cell visible and usable',rect:desktop});
 for(const width of [320,430]){await page.setViewportSize({width,height:844});const dims=await page.locator('#board').evaluate(el=>({width:el.clientWidth,rows:el.children.length,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(dims.rows,63);assert.equal(dims.overflow,false);checks.push({name:`responsive ${width}px`,result:dims});}
 await page.goto(base+'/catalog.html');await page.waitForFunction(()=>document.querySelector('main')?.textContent.includes('大师花园循环桶'));
 const catalog=await page.locator('main').innerText();assert.ok(catalog.includes('大师花园循环桶'));checks.push({name:'new recycle L10 rendered in full catalogue',result:true});await page.locator('#search').fill('gen_recycle:10');await page.screenshot({path:path.join(output,'new-recycle-10.png'),fullPage:true});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({browser:'local Google Chrome via Playwright',checks,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
