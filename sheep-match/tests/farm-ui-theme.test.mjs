import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const ui=read('farm-ui.mjs'),matchUi=read('farm-match-ui.mjs');
const appCss=read('farm-ui.css'),matchCss=read('farm-match.css');

// These are source-contract tests, not a browser layout or contrast audit.
// Read nested media/supports rules too, so mobile overrides cannot evade checks.
function splitOutside(value,separator){
  const out=[];let start=0,depth=0,quote='';
  for(let i=0;i<value.length;i++){
    const c=value[i];
    if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='('||c==='[')depth++;
    else if(c===')'||c===']')depth--;
    else if(c===separator&&depth===0){out.push(value.slice(start,i).trim());start=i+1;}
  }
  out.push(value.slice(start).trim());return out.filter(Boolean);
}
function styleRules(css){
  const rules=[];
  function visit(text){
    let start=0,depth=0,bodyStart=0,prelude='',quote='';
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
      if(c==='"'||c==="'"){quote=c;continue;}
      if(c==='{'&&depth++===0){prelude=text.slice(start,i).trim();bodyStart=i+1;}
      else if(c==='}'&&--depth===0){
        const body=text.slice(bodyStart,i);
        if(/^@(media|supports|container|layer)\b/.test(prelude))visit(body);
        else if(!prelude.startsWith('@')){
          const properties={};
          for(const declaration of splitOutside(body,';')){
            const colon=declaration.indexOf(':');
            if(colon>0)properties[declaration.slice(0,colon).trim()]=declaration.slice(colon+1).trim();
          }
          for(const selector of splitOutside(prelude,','))rules.push({selector,properties});
        }
        start=i+1;
      }else if(c===';'&&depth===0)start=i+1;
    }
  }
  visit(css.replace(/\/\*[\s\S]*?\*\//g,''));return rules;
}
const appRules=styleRules(appCss),matchRules=styleRules(matchCss);
function propertiesFor(rules,selector){
  return Object.assign({},...rules.filter(rule=>rule.selector===selector).map(rule=>rule.properties));
}
function containsDeclaration(rules,selectorPattern,property,valuePattern){
  return rules.some(rule=>selectorPattern.test(rule.selector)&&valuePattern.test(rule.properties[property]||''));
}
function colorValue(value,variables){
  const resolved=value.replace(/var\((--[\w-]+)\)/g,(_,key)=>variables[key]||'');
  const colors=resolved.match(/#[\da-f]{6}\b/gi)||[];
  assert(colors.length>0,`explicit opaque theme colors are available: ${value}`);return colors;
}
function contrast(first,second){
  const luminance=hex=>{
    const [r,g,b]=hex.slice(1).match(/../g).map(value=>Number.parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
    return .2126*r+.7152*g+.0722*b;
  };
  const values=[luminance(first),luminance(second)].sort((a,b)=>a-b);
  return (values[1]+.05)/(values[0]+.05);
}
function functionSection(name,nextName){
  const start=ui.indexOf(`function ${name}(`),end=ui.indexOf(`function ${nextName}(`,start);
  assert(start>=0&&end>start,`${name} source is available`);return ui.slice(start,end);
}

test('farm theme styles remain scoped to their own screen, including mobile rules',()=>{
  for(const [file,rules,scope] of [['farm-ui.css',appRules,/^\.farm-app(?:$|[\s.:#>+~\[])/],['farm-match.css',matchRules,/^\.farm-match(?:$|[\s.:#>+~\[])/]]){
    assert(rules.length>10,`${file} has parsed presentation rules`);
    for(const {selector} of rules)assert.match(selector,scope,`${file}: ${selector} must not restyle the illustrated home or original game`);
  }
});

test('both farm screens use the shipped Happy font and keep a separate readable long-copy style',()=>{
  const common=read('style.css');
  assert.match(common,/@font-face\s*\{[^}]*font-family\s*:\s*["']?Happy["']?\s*;[^}]*ZCOOLKuaiLe-Regular\.woff2[^}]*font-display\s*:\s*swap/s);
  assert(existsSync(new URL('../fonts/ZCOOLKuaiLe-Regular.woff2',import.meta.url)));
  for(const [rules,scope] of [[appRules,'.farm-app'],[matchRules,'.farm-match']]){
    const family=propertiesFor(rules,scope)['font-family']||'';
    assert.match(family,/^["']?Happy["']?\s*,/,`${scope} must explicitly opt into the playful font`);
    assert.match(family,/sans-serif/,`${scope} needs a fallback while the local font loads`);
  }
  assert.match(ui,/farm-reading/, 'long explanations use the reading class');
  assert(containsDeclaration(appRules,/\.farm-reading\b/,'font-family',/sans-serif|var\(/),'long copy has an explicit reading font');
  assert(containsDeclaration(appRules,/\.farm-wallet\b|\.farm-amount\b|\.farm-number\b/,'font-variant-numeric',/tabular-nums/),'resource amounts retain aligned digits');
});

test('all ordinary controls keep 44px targets, with spatial map/tile buttons exempted',()=>{
  for(const [rules,scope,baseSelector] of [[appRules,'.farm-app','.farm-app button'],[matchRules,'.farm-match','.farm-match button:not(.tile)']]){
    const base={...propertiesFor(rules,`${scope} button`),...propertiesFor(rules,baseSelector)};
    assert(Number.parseFloat(base['min-height'])>=44,`${scope} button min-height`);
    assert(Number.parseFloat(base['min-width'])>=44,`${scope} button min-width`);
    for(const {selector,properties} of rules){
      if(!/\bbutton\b/.test(selector)||/\.farm-entity\b|\.tile\b(?!\))/.test(selector))continue;
      for(const dimension of ['min-height','min-width']){
        if(/^\d+(?:\.\d+)?px(?:\s*!important)?$/.test(properties[dimension]||'')){
          assert(Number.parseFloat(properties[dimension])>=44,`${selector} must not shrink ${dimension} below 44px`);
        }
      }
    }
  }
  for(const selector of ['.farm-app input[type=number]','.farm-app input[type=text]','.farm-app input[type=range]','.farm-app select','.farm-app .farm-check']){
    assert(Number.parseFloat(propertiesFor(appRules,selector)['min-height'])>=44,`${selector} min-height`);
  }
  assert(containsDeclaration(appRules,/\.farm-guide-note\s*>?\s*summary\b/,'min-height',/^(?:4[4-9]|[5-9]\d|\d{3,})px/),'rule disclosure is also a 44px target');
});

test('long rules use collapsed native details, and their state survives same-panel rerender',()=>{
  const details=[...ui.matchAll(/<details\b([^>]*)>/g)].filter(match=>/farm-guide-note/.test(match[1]));
  assert(details.length>0,'rules use native details.farm-guide-note');
  for(const match of details)assert(!/\bopen(?:\s|=|$)/.test(match[1]),'long rules start collapsed');
  assert.match(ui,/<summary\b[^>]*>/,'native summary provides Enter/Space keyboard activation');
  const renderPanel=functionSection('renderPanel','startLayout');
  assert.match(renderPanel,/preserve\s*=\s*panelKey\s*===\s*ui\.renderedPanelKey/,'retention is limited to the same panel');
  assert.match(renderPanel,/querySelectorAll\([^\n;]*details/,'capture disclosure state before replacing panel content');
  assert.match(renderPanel,/\.open\s*=/,'restore disclosure state after replacing panel content');
  assert.match(renderPanel,/summary/,'retain keyboard focus on an opened disclosure');
  assert.match(ui,/dataset\.panel\s*=|data-panel\s*=/,'panel themes have an explicit panel marker');
});

test('keyboard navigation includes disclosures, labelled dialogs, visible focus and gesture alternatives',()=>{
  assert.match(ui,/role="dialog"\s+aria-modal="true"\s+aria-labelledby="farm-panel-title"/);
  assert.match(ui,/event\.key\s*===\s*['"]Escape['"]/);
  const tab=ui.slice(ui.indexOf("event.key==='Tab'"),ui.indexOf("listen(window,'resize'"));
  assert.match(tab,/querySelectorAll\([^\n;]*summary/,'Tab trap includes native summary controls');
  assert.match(tab,/event\.shiftKey/);assert.match(tab,/first\.focus\(/);assert.match(tab,/last\.focus\(/);
  assert.match(ui,/view\.focus\(\{\s*preventScroll\s*:\s*true/,'dismissing a panel returns focus without moving the map');
  assert.match(ui,/data-form="layout-position"/,'exact coordinates remain a drag-free layout alternative');
  assert.match(ui,/data-field-crop/,'individual fields remain operable without a drawing gesture');
  assert(containsDeclaration(appRules,/:focus-visible/,'outline',/\S/));
  assert(containsDeclaration(matchRules,/:focus-visible/,'outline',/\S/));
  assert.match(matchUi,/setAttribute\(['"]aria-label['"]/,'story cards retain accessible labels');
});

test('storybook retry dialog keeps cancel, Escape, focus trapping and confirm-only restart',()=>{
  assert.match(matchUi,/role="dialog"\s+aria-modal="true"\s+aria-labelledby="farm-match-retry-title"/);
  assert.doesNotMatch(matchUi,/\bconfirm\(/,'retry is themed in-app rather than a native browser confirmation');
  const openRetry=matchUi.match(/q\('\[data-retry\]'\)\.onclick=\(\)=>\{([^\n]+)\};/);
  assert(openRetry,'retry-open handler is available');
  assert.match(openRetry[1],/dialog\.hidden=false/);
  assert.doesNotMatch(openRetry[1],/onStartStage\(/,'opening the dialog cannot restart the chapter');
  assert.match(matchUi,/q\('\[data-cancel-retry\]'\)\.onclick=hideRetry/);
  assert.match(matchUi,/q\('\[data-confirm-retry\]'\)\.onclick=[^\n]*onStartStage\(/);
  const keyboard=matchUi.slice(matchUi.indexOf('dialog.onkeydown='),matchUi.indexOf("for( const b of root.querySelectorAll('[data-action]'))"));
  assert.match(keyboard,/event\.key==='Escape'/);assert.match(keyboard,/hideRetry\(\)/);
  assert.match(keyboard,/event\.key==='Tab'/);assert.match(keyboard,/first\.focus\(/);assert.match(keyboard,/last\.focus\(/);
  assert.match(matchUi,/hideRetry=[^\n]*\[data-retry\][^\n]*focus\(\{preventScroll:true\}/,'cancel returns focus to the trigger');
  assert.match(matchUi,/!root\.hidden&&!document\.hidden/,'hidden story screens cannot advance their elapsed timer');
});

test('cute transaction presentation retains exact costs, amounts and post-purchase balances',()=>{
  const confirmBuy=functionSection('confirmBuy','editPosition');
  for(const expression of ['${cost}','${s.coins}','${s.coins-cost}'])assert(confirmBuy.includes(expression),`purchase confirmation retains ${expression}`);
  assert.match(confirmBuy,/金币/,'currency is text, not only an icon');
  const ingredients=functionSection('ingredients','card');
  assert(ingredients.includes('${s.inventory[id]||0}/${q}'),'recipe requirements retain owned/required amounts');
  const item=functionSection('renderItem','renderShop');
  assert.match(item,/name="quantity"\s+min="1"\s+max="\$\{q\}"/,'quantity still has its exact stock limit');
  assert.match(item,/data-sale-quote/,'sale preview remains visible before confirmation');
  assert.match(ui,/\$\{p\.cost\}金币/,'placement toolbar still shows cost before purchase');
  assert.match(ui,/\$\{s\.coins-p\.cost\}金币/,'placement toolbar still shows resulting balance');
});

test('primary controls, numeric card copy and empty/help states keep readable text contrast',()=>{
  const pairs=[
    [appRules,'.farm-app','.farm-app .farm-primary','.farm-app .farm-primary'],
    [appRules,'.farm-app','.farm-app button[aria-pressed=true]','.farm-app button[aria-pressed=true]'],
    [matchRules,'.farm-match','.farm-match .farm-match-primary','.farm-match .farm-match-primary'],
    [appRules,'.farm-app','.farm-app .farm-card p','.farm-app .farm-card'],
    [appRules,'.farm-app','.farm-app .farm-guide-note','.farm-app .farm-guide-note'],
    [appRules,'.farm-app','.farm-app .farm-empty','.farm-app .farm-empty'],
    [appRules,'.farm-app','.farm-app .farm-panel-intro p','.farm-app .farm-panel'],
    [matchRules,'.farm-match','.farm-match .farm-match-tools small','.farm-match button:not(.tile)']
  ];
  for(const [rules,scope,textSelector,backgroundSelector] of pairs){
    const variables=propertiesFor(rules,scope),foreground=propertiesFor(rules,textSelector).color;
    const backdrop=propertiesFor(rules,backgroundSelector),background=backdrop.background||backdrop['background-color'];
    assert(foreground&&background,`${textSelector} has inspectable text/background colors`);
    for(const ink of colorValue(foreground,variables))for(const paper of colorValue(background,variables)){
      const ratio=contrast(ink,paper);
      assert(ratio>=4.5,`${textSelector}: ${ink} on ${paper} is ${ratio.toFixed(2)}:1; small copy and amounts need at least 4.5:1`);
    }
  }
});

test('themes keep reduced-motion support and load only packaged local artwork',()=>{
  assert.match(appCss,/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/);
  assert.match(appCss,/\.farm-app\[data-reduced-motion=true\]/);
  const html=read('index.html'),allowlist=read('deploy/runtime_files.py');
  for(const file of ['farm-ui.css','farm-match.css']){
    assert(html.includes(file),`${file} is linked by the app`);
    assert(allowlist.includes(file),`${file} is in the production allowlist`);
  }
  for(const [file,css] of [['farm-ui.css',appCss],['farm-match.css',matchCss]]){
    for(const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)){
      const path=match[1];
      if(path.startsWith('data:')||path.startsWith('#'))continue;
      assert(!/^(?:https?:)?\/\//.test(path),`${file} must not require a third-party theme asset: ${path}`);
      assert(existsSync(new URL(path,new URL(`../${file}`,import.meta.url))),`${file} references a real local asset: ${path}`);
    }
  }
});

test('story feedback uses the shared bounded presentation layer and dedicated tool cues only after success',()=>{
  assert.match(matchUi,/import\s*\{mountFarmDelight\}\s*from\s*['"]\.\/farm-delight\.mjs['"]/);
  assert.match(matchUi,/delight\.setReducedMotion\(!!store\.getState\(\)\.settings\?\.reducedMotion\)/);
  assert.match(matchUi,/delight\.pause\(root\.hidden\|\|document\.hidden\)/);
  assert.match(matchUi,/hiddenObserver\.disconnect\(\)/);assert.match(matchUi,/delight\.destroy\(\)/);
  assert.match(matchUi,/action==='pick'\?'pick':action/,'undo/shuffle/stash retain their dedicated sound cue');
  const dispatchAt=matchUi.indexOf("await store.dispatch({ type:'stageAction'");
  const successAt=matchUi.indexOf('if(!saved.ok)',dispatchAt);
  const feedbackAt=matchUi.indexOf('delight.play(effect',successAt);
  assert(dispatchAt>=0&&successAt>dispatchAt&&feedbackAt>successAt,'failed commands do not produce success particles');
  assert.match(matchUi,/current\.status==='won'&&!previouslyWon\?'firstClear'/,'first-clear wording is not reused on replay');
});

test('construction-voucher gains and costs are explicit in successful action feedback',async()=>{
  const {farmChangeMessage}=await import('../farm-ui.mjs');
  assert.equal(farmChangeMessage({delta:{vouchers:2,xp:3,items:{bread:1}}}),'+3经验，建设券+2，面包+1');
  assert.equal(farmChangeMessage({delta:{vouchers:-1}}),'建设券-1');
  assert.equal(farmChangeMessage({delta:{coins:-500,vouchers:1}}),'-500金币，建设券+1');
  assert.equal(farmChangeMessage({delta:{vouchers:0}}),'');
});
