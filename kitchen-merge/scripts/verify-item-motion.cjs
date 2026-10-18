// Isolated browser regression for visible availability, motion and real production.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.KITCHEN_TEST_URL||'http://127.0.0.1:4199';
const local=['127.0.0.1','localhost'].includes(new URL(base).hostname);
const output=path.resolve(process.env.KITCHEN_TEST_OUTPUT||path.join(__dirname,'../docs/verification/item-motion'));
fs.mkdirSync(output,{recursive:true});
const checks=[],errors=[],NOW=1792339200000;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try{
 const context=await browser.newContext({viewport:{width:375,height:667},deviceScaleFactor:1,reducedMotion:'no-preference',recordVideo:{dir:output+'/video',size:{width:375,height:667}}});
 await context.addInitScript(()=>{localStorage.setItem('little-kitchen-music','false');localStorage.setItem('little-kitchen-sound','false')});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await p.clock.install({time:new Date(NOW)});await p.clock.pauseAt(new Date(NOW));
 const cell=i=>p.locator(`[data-cell="${i}"]`);
 const ready=async()=>{await cell(62).waitFor();await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())))};
 const style=async(i,property)=>cell(i).locator('.item-art>svg,.item-3d>img').evaluate((el,prop)=>getComputedStyle(el)[prop],property);
 const state=key=>p.evaluate(k=>JSON.parse(localStorage.getItem(k||'little-kitchen-save-v1')),key);
 await p.goto(base+'/');await ready();
 assert.equal(await p.locator('.cue-produce.cue-ready').count(),3);
 assert.equal(await style(0,'animationName'),'activeBreathe, attentionWiggle');assert.equal(await style(9,'animationName'),'shelfBreathe');
 assert.equal(await p.locator('.locked .item-cue').count(),0);
 const first=await style(0,'transform');await wait(400);assert.notEqual(await style(0,'transform'),first);
 await p.screenshot({path:output+'/production-375x667.png'});
 checks.push('WebP producers and ordinary items breathe; three starter producers carry lightning cues');
 await cell(0).click();assert.equal(await p.locator('.production-flight').count(),1);
 await p.screenshot({path:output+'/production-flight.png'});await wait(550);
 assert.equal((await state()).energy,99);assert.equal(await p.locator('.receiving-output,.production-flight').count(),0);
 for(let i=0;i<3;i++)await cell(0).click();await wait(550);
 assert.equal((await state()).energy,96);assert.equal(await p.locator('.receiving-output,.production-flight').count(),0);
 checks.push('Real production and rapid taps animate output, consume correct energy and leave no hidden items');
 await p.locator('[data-action="rewards"]').first().click();assert.equal(await style(0,'animationPlayState'),'paused');
 await p.locator('#modal-close').click();await p.clock.runFor(20);assert.equal(await style(0,'animationPlayState'),'running, running');
 await p.locator('[data-kitchen-style="classic"]').first().click();await ready();
 assert.equal(await p.locator('#board [data-3d-item]').count(),0);assert.equal(await style(0,'animationName'),'activeBreathe, attentionWiggle');
 await p.screenshot({path:output+'/classic-375x667.png'});
 const saved=await state();await p.locator('[data-kitchen-style="island"]').first().click();await ready();assert.deepEqual((await state()).board,saved.board);
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await style(0,'animationName'),'none');
 await cell(0).click();assert.equal(await p.locator('.production-flight').count(),0);assert.equal((await state()).energy,95);
 assert.equal(await p.locator('.cue-produce.cue-ready').count(),3);
 checks.push('Modal pauses, both skins, shared progress and reduced motion preserve static interaction cues');
 await p.emulateMedia({reducedMotion:'no-preference'});
 if(local){
  await p.evaluate(async now=>{const E=await import('./engine.mjs'),s=E.createGame(null,now);s.board.fill(null);s.locked=Array.from({length:21},(_,i)=>42+i);s.stage=11;s.energy=10;
   for(const [i,id]of [[0,'gen_food:4'],[2,'gen_produce:4'],[4,'gen_tools:4'],[6,'seedbag:4'],[8,'food:1'],[9,'food:1'],[11,'coins:3'],[12,'gems:2'],[13,'energy:3'],[15,'blackbag:1'],[17,'pinkbag:1'],[19,'splitter:3'],[21,'tipjar:2'],[23,'energybox:1'],[25,'story:5'],[42,'gen_tools:4']])s.board[i]=E.makeItem(s,id,now);
   s.board[4].stock=0;s.board[4].rechargeRemaining=2000;s.board[17].openedAt=now;s.board[17].timerRemaining=2000;
   localStorage.setItem('little-kitchen-qa-resources',E.serialize(s));},NOW);
  await p.goto(base+'/?qa=resources');await ready();
  assert.equal(await cell(4).getAttribute('data-item-cue'),'wait');assert.equal(await style(4,'animationName'),'none');
  assert.equal(await cell(6).getAttribute('data-item-cue'),'produce');
  for(const i of [11,12,13,21,23])assert.equal(await cell(i).getAttribute('data-item-cue'),'collect');
  assert.equal(await cell(15).getAttribute('data-item-cue'),'open');assert.equal(await cell(17).getAttribute('data-item-cue'),'wait');assert.equal(await cell(19).getAttribute('data-item-cue'),'use');
  await p.screenshot({path:output+'/interaction-states-375x667.png'});
  await p.clock.runFor(2100);assert.equal(await cell(4).getAttribute('data-item-cue'),'produce');assert.equal(await cell(17).getAttribute('data-item-cue'),'collect');
  // Pointer movement must pause the inner idle picture, then preserve real merging.
  const a=await cell(8).boundingBox(),b=await cell(9).boundingBox();await p.mouse.move(a.x+22,a.y+22);await p.mouse.down();await p.mouse.move(b.x+22,b.y+22,{steps:8});
  assert.equal(await style(0,'animationPlayState'),'paused');await p.mouse.up();await p.clock.runFor(1);
  assert.equal((await state('little-kitchen-qa-resources')).board[9].itemId,'food:2');
  assert.equal(await style(0,'animationPlayState'),'running, running');
  await cell(11).click();await p.locator('#selection-card [data-action="collect"]').click();assert.equal((await state('little-kitchen-qa-resources')).board[11],null);
  assert.equal((await state()).energy,95);
  checks.push('Finite producers, resources, tools, bag opening/cooldown expiry, drag merge and QA isolation');
 }
 for(const viewport of [{width:375,height:667},{width:768,height:667},{width:1280,height:900}]){
  await p.setViewportSize(viewport);const g=await p.evaluate(()=>{const c=[...document.querySelectorAll('[data-cell]')].map(e=>e.getBoundingClientRect());return{cells:c.length,w:c[0].width,h:c[0].height,x:c[1].x-c[0].right,y:c[7].y-c[0].bottom,scroll:document.documentElement.scrollHeight,view:innerHeight}});
  assert.equal(g.cells,63);assert(Math.abs(g.w-g.h)<.01&&Math.abs(g.x)<.01&&Math.abs(g.y)<.01);assert.equal(g.scroll,g.view);
 }
 checks.push('63 square, gapless cells and no page scroll at three viewport sizes');assert.deepEqual(errors,[]);
 await context.close();fs.renameSync(await p.video().path(),output+'/motion-demo.webm');
 fs.writeFileSync(output+'/results.json',JSON.stringify({url:base,checks,errors,passed:true},null,2)+'\n');console.log(JSON.stringify({checks,errors,passed:true}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
