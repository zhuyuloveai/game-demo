// Real Chrome, isolated browser storage. No production save or remote service is used.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.KITCHEN_TEST_URL||'http://127.0.0.1:4193';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local verification only');
const output=path.resolve(process.env.KITCHEN_VERIFICATION_OUTPUT||path.resolve(__dirname,'../docs/verification/kitchen-island'));fs.mkdirSync(output,{recursive:true});
const checks=[],errors=[],NOW=1792156800000;
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});try{
 const context=await browser.newContext({viewport:{width:375,height:667},hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.addInitScript(()=>{localStorage.setItem('little-kitchen-music','false');localStorage.setItem('little-kitchen-sound','false');const seed=sessionStorage.getItem('kitchen-verification-seed');if(seed!==null){sessionStorage.removeItem('kitchen-verification-seed');if(seed==='__new__')localStorage.removeItem('little-kitchen-save-v1');else localStorage.setItem('little-kitchen-save-v1',seed)}});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await p.clock.install({time:new Date(NOW)});await p.clock.pauseAt(new Date(NOW));
 const cell=i=>p.locator(`[data-cell="${i}"]`),raw=()=>p.evaluate(()=>localStorage.getItem('little-kitchen-save-v1')),state=async()=>JSON.parse(await raw());
 const close=async()=>{if(await p.locator('#modal[open]').count())await p.locator('#modal-close').click()};
 async function settings(){await close();await p.locator('[data-action="phone"]').click();await p.locator('[data-action="settings"]').click()}
 async function theme(style){await settings();const before=await raw();await p.locator(`button[data-kitchen-style="${style}"]`).click();assert.equal(await raw(),before);assert.equal(await p.locator(`button[data-kitchen-style="${style}"]`).getAttribute('aria-pressed'),'true');await close();await p.locator('#toast').evaluate(e=>e.classList.remove('visible'))}
 async function drag(from,to){let a=await cell(from).boundingBox(),b=await cell(to).boundingBox();await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await p.mouse.up();await p.clock.runFor(1)}
 async function geometry(label){const r=await p.evaluate(()=>{const board=document.querySelector('#board'),cells=[...board.children],br=board.getBoundingClientRect();return {viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],board:br.toJSON(),cells:cells.length,cell:cells[0].getBoundingClientRect().toJSON(),last:cells[62].getBoundingClientRect().toJSON(),square:cells.every(c=>{const r=c.getBoundingClientRect();return Math.abs(r.width-r.height)<.3}),footer:[...document.querySelectorAll('.e-desk-items>.island-object')].map(e=>{const r=e.getBoundingClientRect();return {action:e.dataset.action,rect:r.toJSON(),hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})}});
 assert.equal(r.cells,63);assert.ok(r.square);assert.ok(r.scroll[0]<=r.viewport[0]);assert.ok(r.scroll[1]<=r.viewport[1]);assert.ok(r.last.bottom<=r.viewport[1]-55);assert.ok(r.footer.every(x=>x.hit&&x.rect.height>=44&&x.rect.bottom<=r.viewport[1]));checks.push({name:label,...r});}
 await p.goto(base);await cell(62).waitFor();assert.equal(await p.evaluate(()=>document.documentElement.dataset.kitchenStyle),'island');await p.reload();await cell(62).waitFor();assert.equal(await p.evaluate(()=>document.documentElement.dataset.kitchenStyle),'island');
 for(const style of ['island','classic']){await theme(style);await geometry(`${style} 375×667`);await p.screenshot({path:path.join(output,`${style}-375x667.png`),fullPage:true});}
 await settings();await p.screenshot({path:path.join(output,'style-settings-375x667.png')});await close();
 const initial=await raw();await theme('island');await theme('classic');assert.equal(await raw(),initial);await p.reload();await cell(62).waitFor();assert.equal(await p.evaluate(()=>document.documentElement.dataset.kitchenStyle),'classic');assert.equal(await raw(),initial);checks.push({name:'two-way theme switching and reload preserve exact game-save bytes',result:true});
 for(const style of ['island','classic']){
  await theme(style);
  for(const [width,height]of [[320,667],[390,744],[430,740],[1440,900]]){await p.setViewportSize({width,height});await geometry(`${style} ${width}×${height}`);await p.screenshot({path:path.join(output,`${style}-${width}x${height}.png`),fullPage:true});}
  await p.setViewportSize({width:375,height:667});
  for(const [action,view]of [['profile','profile'],['energy','energy'],['cash','cash'],['stars','stars'],['tasks','tasks'],['rewards','rewards'],['recipes','recipes'],['storage','storage'],['phone','phone'],['music','music']]){await p.locator(`.game-shell [data-action="${action}"]`).first().click();assert.equal(await p.locator('#modal').getAttribute('data-view'),view);await close();}
  await p.locator('[data-action="recipes"]').click();await p.locator('#modal [data-action="collection"]').click();assert.ok((await p.locator('#modal').innerText()).includes('图鉴'));await close();
  await p.locator('[data-action="phone"]').click();await p.locator('#modal [data-action="shop"]').click();assert.ok((await p.locator('#modal').innerText()).includes('采购铺'));await close();
  await p.locator('[data-action="music"]').click();await p.locator('[data-action="toggle-music"]').click();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('little-kitchen-music'))),true);await p.locator('[data-action="toggle-music"]').click();await close();
  await geometry(`${style} after all panels close`);checks.push({name:`${style} all resource, story, gift, recipe/catalogue, storage, phone/shop/settings, music controls`,result:true});
 }
 // Existing save without a style defaults to classic; explicit selection still wins.
 await p.evaluate(()=>localStorage.removeItem('little-kitchen-style'));await p.reload();assert.equal(await p.evaluate(()=>document.documentElement.dataset.kitchenStyle),'classic');
 await theme('island');await p.reload();assert.equal(await p.evaluate(()=>document.documentElement.dataset.kitchenStyle),'island');
 // Exercise real normal-play controls in both themes, starting from the same fresh game.
 for(const style of ['island','classic']){
  await p.evaluate(()=>sessionStorage.setItem('kitchen-verification-seed','__new__'));await p.reload();await theme(style);
  await p.locator('[data-fulfill]').first().click();assert.equal((await state()).coins,131);
  await cell(0).click();assert.equal((await state()).energy,99);
  await drag(9,10);assert.equal((await state()).board[10].itemId,'food:2');
  await drag(10,8);assert.equal((await state()).board[8].itemId,'food:2');
  await drag(8,14);assert.equal((await state()).board[14].itemId,'food:2');assert.equal((await state()).board[8].itemId,'tools:1');
  await cell(14).click();await p.locator('#selection-card [data-action="store"]').click();assert.equal((await state()).inventory[0].itemId,'food:2');
  await p.locator('[data-action="storage"]').click();await p.locator('[data-retrieve="0"]').click();await close();assert.equal((await state()).inventory.length,0);
  await p.locator('[data-action="rewards"]').click();await p.locator('[data-action="daily"]').click();await close();const afterDaily=await raw();await theme(style==='island'?'classic':'island');await theme(style);assert.equal(await raw(),afterDaily);
  await p.locator('[data-action="rewards"]').click();assert.equal(await p.locator('[data-action="daily"]').isDisabled(),true);await close();
  checks.push({name:`${style} real main delivery, production, merge/move/swap, storage round trip and no duplicate daily reward on theme switch`,result:true});
 }
 // Seed a local ordinary order from the same engine, then deliver using the UI.
 await p.evaluate(async now=>{const E=await import('./engine.mjs');const s=E.createGame(null,now);s.board.fill(null);s.locked=[];let i=0;for(const n of s.orders[0].needs)for(let k=0;k<n.count;k++)s.board[i++]=E.makeItem(s,n.item||n.itemId||`${n.family}:${n.level}`,now);sessionStorage.setItem('kitchen-verification-seed',E.serialize(s))},NOW);
 await p.reload();await cell(62).waitFor();const beforeOrdinary=await state();await p.locator('.order-card:not(.is-main) [data-fulfill]').first().click();assert.equal((await state()).completed,beforeOrdinary.completed+1);checks.push({name:'ordinary order delivery through rendered control',result:true});
 // Genuine touch input checks order swipe and board drag without page scroll.
 const cdp=await context.newCDPSession(p);
 async function touchDrag(a,b){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.clock.runFor(1)}
 await touchDrag({x:320,y:80},{x:90,y:80});assert.ok(await p.locator('#orders').evaluate(e=>e.scrollLeft>0));assert.equal(await p.evaluate(()=>scrollY),0);
 await p.evaluate(async now=>{const E=await import('./engine.mjs');const s=E.createGame(null,now);s.locked=[];s.board.fill(null);s.board[60]=E.makeItem(s,'food:1',now);s.board[61]=E.makeItem(s,'food:1',now);sessionStorage.setItem('kitchen-verification-seed',E.serialize(s))},NOW);await p.reload();const a=await cell(60).boundingBox(),b=await cell(61).boundingBox();await touchDrag({x:a.x+a.width/2,y:a.y+a.height/2},{x:b.x+b.width/2,y:b.y+b.height/2});assert.equal((await state()).board[61].itemId,'food:2');assert.equal(await p.evaluate(()=>scrollY),0);checks.push({name:'real Chrome touch order swipe and bottom-row merge with no page scroll',result:true});
 // Theme selection must finish an in-flight pointer without applying a move.
 const r=await cell(61).boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+10,r.y-35);assert.equal(await p.locator('.drag-ghost').count(),1);const preDrag=await raw();
 await p.locator('[data-action="phone"]').dispatchEvent('click');await p.locator('[data-action="settings"]').dispatchEvent('click');await p.locator('button[data-kitchen-style="classic"]').dispatchEvent('click');assert.equal(await p.locator('.drag-ghost').count(),0);assert.equal(await raw(),preDrag);await p.mouse.up();await p.clock.runFor(1);await close();checks.push({name:'theme change cancels active pointer and ghost without changing the board',result:true});
 // Revision 1: direct, reproducible comparison fixture; normal progress stays isolated.
 const playerBeforeQA=await raw();await p.goto(base+'/qa.html');await p.locator('#island-comparison').click();await cell(62).waitFor();await theme('island');
 assert.equal(await p.evaluate(()=>document.documentElement.dataset.kitchenStyle),'island');
 const qaState=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('little-kitchen-qa-island')));
 let qs=await qaState();assert.equal(qs.locked.length,0);assert.equal(qs.board.length,63);assert.equal(qs.energy,100);
 await geometry('revision 1 unlocked comparison fixture 375×667');
 const legibility=await p.evaluate(()=>[...document.querySelectorAll('.order-card')].slice(0,2).map(card=>({rect:card.getBoundingClientRect().toJSON(),fields:[...card.querySelectorAll('.need-name,.need-quantity,.reward')].map(e=>({text:e.textContent,font:parseFloat(getComputedStyle(e).fontSize),rect:e.getBoundingClientRect().toJSON(),overflow:e.scrollWidth>e.clientWidth+1}))})));
 for(const card of legibility){assert.ok(card.rect.right<=375);for(const field of card.fields){assert.ok(field.font>=11);assert.ok(field.rect.right<=card.rect.right+1);assert.equal(field.overflow,false);}}
 const support=await p.evaluate(()=>{const footer=document.querySelector('.e-foreground').getBoundingClientRect();return [...document.querySelectorAll('.island-object')].map(e=>{const box=e.getBoundingClientRect(),style=getComputedStyle(e,'::before');return {object:e.dataset.action,base:box.bottom-parseFloat(style.bottom),surface:footer.bottom-11,artHeight:parseFloat(style.height)}})});
 assert.ok(support.every(r=>Math.abs(r.base-r.surface)<=1));checks.push({name:'revision 1 readable order text, complete first two tickets and prop support plane',legibility,support});
 await p.screenshot({path:path.join(output,'island-comparison-375x667.png')});
 await settings();await p.screenshot({path:path.join(output,'style-settings-375x667.png')});await close();
 await cell(0).click();qs=await qaState();assert.equal(qs.energy,99);assert.equal(qs.board[0].stock,11);assert.ok((await p.locator('#selection-card').innerText()).includes('11/12'));
 await p.screenshot({path:path.join(output,'island-producer-selected-375x667.png')});
 await theme('classic');await p.screenshot({path:path.join(output,'classic-comparison-375x667.png')});await theme('island');
 const qaBeforeSwipe=await qaState();const ta=await cell(4).boundingBox(),tb=await cell(23).boundingBox();await touchDrag({x:ta.x+ta.width/2,y:ta.y+ta.height/2},{x:tb.x+tb.width/2,y:tb.y+tb.height/2});qs=await qaState();assert.equal(qs.merges,qaBeforeSwipe.merges+1);assert.equal(qs.board[23].itemId,'food:2');assert.equal(await raw(),playerBeforeQA);
 checks.push({name:'revision 1 QA uses real source production and touch merge; separate save never writes normal progress',result:true});
 // Long real catalogue names must wrap, leaving separate quantity and reward space.
 await p.goto(base+'/?qa=island-long');await cell(62).waitFor();
 const longRows=await p.locator('.order-card:not(.is-main)').first().evaluate(card=>({rows:[...card.querySelectorAll('.need')].map(e=>{const n=e.querySelector('.need-name'),q=e.querySelector('.need-quantity');return {name:n.textContent,n:n.getBoundingClientRect().toJSON(),q:q.getBoundingClientRect().toJSON(),overflow:n.scrollWidth>n.clientWidth+1}}),reward:card.querySelector('.order-bottom').getBoundingClientRect().toJSON()}));
 assert.equal(longRows.rows.length,2);assert.equal(longRows.rows[0].name,'开放式中央厨房');
 for(const row of longRows.rows){assert.equal(row.overflow,false);assert.ok(row.n.right+2<=row.q.left);assert.ok(row.n.bottom<=longRows.reward.top+.5);assert.ok(row.n.height<=24);}
 await p.screenshot({path:path.join(output,'island-long-names-375x667.png')});checks.push({name:'real long catalogue names in a two-need order wrap without quantity or reward overlap',...longRows});
 const header=await p.evaluate(()=>[...document.querySelectorAll('.k-hud button')].map(e=>{const r=e.getBoundingClientRect();const avatar=e.querySelector('.puppy-avatar');const style=getComputedStyle(e,'::before');return {action:e.dataset.action,iconTop:avatar?avatar.getBoundingClientRect().top:r.bottom-parseFloat(style.bottom)-parseFloat(style.height),iconBase:avatar?avatar.getBoundingClientRect().bottom:r.bottom-parseFloat(style.bottom)}}));
 assert.ok(header.every(e=>e.iconTop>=5&&Math.abs(e.iconBase-header[0].iconBase)<=.1));checks.push({name:'all five resource cutouts have 5px top clearance and the same 43px support baseline',header});
 // Denied storage must not prevent this-session styling.
 await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError')}});await theme('island');assert.equal(await p.evaluate(()=>document.documentElement.dataset.kitchenStyle),'island');checks.push({name:'storage write denied: session theme still switches',result:true});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({browser:'Google Chrome via Playwright + Chrome DevTools touch events',checks,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
