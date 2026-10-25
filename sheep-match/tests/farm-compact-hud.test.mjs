import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,storageUsed} from '../farm-core.mjs';
import {LEVELS} from '../farm-config.mjs';

const source=readFileSync(new URL('../farm-ui.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../farm-ui.css',import.meta.url),'utf8');

// Source contracts execute the real small renderers with inert DOM destinations.
// These do not claim browser hit testing, layout geometry, or gesture coverage.
function functionSource(name){
  const start=source.search(new RegExp(`\\n  (?:async )?function ${name}\\(`));
  assert(start>=0,`${name} exists`);
  const remaining=source.slice(start+1),next=remaining.slice(1).search(/\n  (?:async )?function /);
  assert(next>=0,`${name} has a bounded source section`);
  return remaining.slice(0,next+1);
}
const escSource=source.slice(source.indexOf('const esc='),source.indexOf('const json='));
const buttonSource=source.slice(source.indexOf('const button='),source.indexOf('const pill='));
function method(name,context){
  return new Function(...Object.keys(context),`"use strict";${escSource}${buttonSource}return (${functionSource(name)});`)(...Object.values(context));
}
function fixture(){
  const nodes=new Map();
  const context={
    s:createFarm(1000),
    ui:{panel:null,panelTab:'',mode:'pan',placing:null,undo:[],redo:[]},
    store:{status:{},readOnly:false},
    LEVELS,used:storageUsed,
    icon:id=>`<span data-icon="${id}" aria-hidden="true"></span>`,
    doodle:id=>`<span data-doodle="${id}" aria-hidden="true"></span>`,
    intro:(title,body)=>`<p>${title} ${body}</p>`,
    app:{querySelector(selector){
      if(!nodes.has(selector)){
        const classes=new Set();
        nodes.set(selector,{innerHTML:'',hidden:false,attributes:{},setAttribute(name,value){this.attributes[name]=value;},classList:{
          toggle(name,enabled){if(enabled)classes.add(name);else classes.delete(name);},
          contains:name=>classes.has(name),remove(...names){for(const name of names)classes.delete(name);}
        }});
      }
      return nodes.get(selector);
    }}
  };
  return {context,nodes,html:selector=>nodes.get(selector)?.innerHTML||''};
}
const buttons=html=>[...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([,attributes,body])=>({attributes,body,action:attributes.match(/\bdata-action="([^"]+)"/)?.[1]}));
const actions=html=>buttons(html).map(button=>button.action);

test('compact header has five actionable statuses plus one secondary-menu entry',()=>{
  const f=fixture();
  f.context.s.coins=1234567;f.context.s.vouchers=234;
  const before=structuredClone(f.context.s);
  method('renderHeader',f.context)();
  const html=f.html('.farm-header');
  assert.deepEqual(actions(html).sort(),['shop','shop-tab:vouchers','tasks','storage:silo','storage:barn','more'].sort());
  for(const control of buttons(html)){
    assert.match(control.attributes,/\btype="button"/,'status is a native keyboard-operable button');
    assert.match(control.attributes,/\baria-label="[^"]+"/,'compact status keeps an explicit accessible name');
  }
  for(const value of [f.context.s.coins,f.context.s.vouchers])assert(html.includes(String(value)),'resource counts are not lost when compacting');
  for(const storage of ['silo','barn'])assert(html.includes(`${storageUsed(f.context.s,storage)}/${f.context.s.storage[storage].capacity}`),'storage retains used/capacity');
  assert.match(html,/<progress\b[^>]*value="\d+"[^>]*max="\d+"/,'level still displays its experience progress');
  assert.match(buttons(html).find(button=>button.action==='tasks').attributes,/aria-label="[^"]*经验\d+\/\d+/,'the level button exposes experience progress to assistive technology');
  assert.doesNotMatch(html,/farm-brand|farm-subtitle|farm-storage-row|farm-header-top/,'no separate persistent branding or storage row');
  assert.deepEqual(f.context.s,before,'rendering statuses never modifies farm state');
});

test('ordinary bottom toolbar keeps only the four direct map modes',()=>{
  for(const mode of ['pan','plant','harvest']){
    const f=fixture();f.context.ui.mode=mode;
    method('renderToolbar',f.context)();
    const controls=buttons(f.html('.farm-toolbar'));
    assert.deepEqual(controls.map(button=>button.action),['mode:pan','mode:plant','mode:harvest','mode:layout']);
    assert.deepEqual(controls.filter(button=>/aria-pressed="true"/.test(button.attributes)).map(button=>button.action),[`mode:${mode}`]);
    for(const control of controls)assert.match(control.attributes,/\baria-label="[^"]+"/);
  }
});

test('status navigation opens its associated panel or voucher tab without buying anything',async()=>{
  const expected=[['shop','shop',''],['shop-tab:vouchers','shop','vouchers'],['tasks','tasks',''],['storage:silo','storage','silo'],['storage:barn','storage','barn'],['more','more','']];
  for(const [action,panel,tab] of expected){
    const f=fixture(),opened=[],commands=[];
    f.context.ui.panelTab='old-tab';
    f.context.openPanel=panel=>opened.push({panel,tab:f.context.ui.panelTab});
    f.context.dispatch=command=>{commands.push(command);return Promise.resolve({ok:true});};
    const before=structuredClone(f.context.s);
    await method('action',f.context)(action);
    assert.deepEqual(opened,[{panel,tab}],`${action} reaches the right panel and tab`);
    assert(commands.every(command=>command.type==='tutorialEvent'),'opening status cannot purchase, sell, or alter production');
    assert.deepEqual(f.context.s,before);
  }
});

test('readonly and recovery errors remain visible and retain the recovery controls',()=>{
  const f=fixture(),render=method('renderHeader',f.context);
  render();assert.equal(f.nodes.get('.farm-error-bar').hidden,true);
  f.context.store.readOnly=true;render();
  assert.equal(f.nodes.get('.farm-error-bar').hidden,false);
  assert.match(f.html('.farm-error-bar'),/只读/);
  assert(actions(f.html('.farm-error-bar')).includes('settings'),'readonly notice retains a route to save recovery');
  assert.match(functionSource('renderSettings'),/store\.readOnly\?button\([^\n]*?'takeover'/,'settings retains the explicit takeover action');
  f.context.store.readOnly=false;f.context.store.status={recoveryRequired:true};render();
  assert.equal(f.nodes.get('.farm-error-bar').hidden,false);
  assert.match(f.html('.farm-error-bar'),/原始文件已保留/);
  assert(actions(f.html('.farm-error-bar')).includes('settings'));
  f.context.store.status={error:'保存失败'};render();
  assert.equal(f.nodes.get('.farm-error-bar').hidden,false);
  assert.match(f.html('.farm-error-bar'),/保存失败/);
});

test('secondary menu retains business, help, fields, land, home and gated story entries',()=>{
  const f=fixture(),render=method('renderMore',f.context);
  const expected=['shop','orders','market','tasks','fields','materials','land','appearances','settings','help','exit'];
  assert.deepEqual(actions(render()).sort(),expected.sort());
  f.context.s.branch.unlocked=true;
  assert(actions(render()).includes('stages'),'unlocked farm stories remain reachable');
  f.context.s.features.farmLinkageEnabled=false;
  assert(!actions(render()).includes('stages'),'disabled story feature does not gain a new entry');
  f.context.ui.mode='layout';
  const layout=buttons(render());
  for(const action of ['redo','layout-slots'])assert(layout.some(button=>button.action===action),'secondary layout controls are not removed');
  assert.match(layout.find(button=>button.action==='redo').attributes,/\bdisabled\b/);
  f.context.ui.redo.push({});
  assert.doesNotMatch(buttons(render()).find(button=>button.action==='redo').attributes,/\bdisabled\b/);
  assert.match(functionSource('renderPanel'),/case'more':[\s\S]*?html=renderMore\(\)/);
});

test('one camera toggle reveals and hides the keyboard-operable camera controls',async()=>{
  const shell=source.slice(source.indexOf('root.innerHTML='),source.indexOf('const app=root.querySelector'));
  assert.match(shell,/class="farm-camera-popover"[^>]*id="farm-camera-popover"[^>]*hidden>/);
  assert.match(shell,/'camera-menu','[^']*aria-controls="farm-camera-popover"[^']*aria-expanded="false"/);
  const f=fixture(),popover=f.context.app.querySelector('.farm-camera-popover');
  popover.hidden=true;
  f.context.setCameraTools=method('setCameraTools',f.context);
  const action=method('action',f.context);
  for(const open of [true,false,true,false]){
    await action('camera-menu');
    assert.equal(popover.hidden,!open);
    assert.equal(f.nodes.get('[data-action="camera-menu"]').attributes['aria-expanded'],String(open));
  }
  assert.match(functionSource('openPanel'),/setCameraTools\(false\)/,'opening a dialog also dismisses camera controls');
  for(const action of ['zoom-in','zoom-out','center'])assert(shell.includes(`'${action}'`));
});

test('map hint is absent while exploring and yields to contextual object tools',()=>{
  const f=fixture();f.context.name=id=>id;
  const render=method('renderMapHint',f.context);
  render();assert.equal(f.nodes.get('.farm-map-label').hidden,true);
  for(const mode of ['plant','harvest','feed','layout']){
    f.context.ui.mode=mode;render();assert.equal(f.nodes.get('.farm-map-label').hidden,false);
    f.context.ui.quickEntityId='field_1';render();assert.equal(f.nodes.get('.farm-map-label').hidden,true);
    f.context.ui.quickEntityId=null;
  }
});

test('placement keeps its explicit cost, resulting balance, and cancel/confirm actions',()=>{
  const f=fixture();
  f.context.s.coins=150;f.context.ui.placing={label:'测试设施',cost:50};
  method('renderToolbar',f.context)();
  const html=f.html('.farm-toolbar');
  assert.match(html,/50金币/);assert.match(html,/100金币/);
  for(const action of ['rotate-placement','cancel-placement','confirm-placement'])assert(actions(html).includes(action));
});

test('compact app removes the business rail but preserves dialog and live-status accessibility',()=>{
  const shell=source.slice(source.indexOf('root.innerHTML='),source.indexOf('const app=root.querySelector'));
  assert.match(shell,/data-hud="compact"/);
  assert.doesNotMatch(shell,/class="farm-rail"/);
  assert.doesNotMatch(functionSource('render'),/renderRail\(/);
  assert.match(shell,/class="farm-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(shell,/class="farm-error-bar"[^>]*role="alert"/);
  assert.match(shell,/role="dialog"\s+aria-modal="true"\s+aria-labelledby="farm-panel-title"/);
  assert.match(functionSource('openPanel'),/cancelGesture\(\)/,'menu navigation cancels an unfinished stroke');
  assert.match(functionSource('closePanel'),/view\.focus\(\{preventScroll:true\}\)/,'closing the menu returns keyboard focus to the map');
});

const compact='.farm-app[data-hud=compact]';
const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([,selectors,body])=>selectors.split(',').map(selector=>({
  selector:selector.trim(),
  properties:Object.fromEntries(body.split(';').map(declaration=>{
    const colon=declaration.indexOf(':');
    return colon<0?null:[declaration.slice(0,colon).trim(),declaration.slice(colon+1).trim()];
  }).filter(Boolean))
})));
const firstRule=selector=>{
  const rule=rules.find(rule=>rule.selector===selector);
  assert(rule,`${selector} has an explicit compact-HUD rule`);
  return rule.properties;
};

test('compact sizing budgets at least 75% nominal map height at 360 by 640',()=>{
  const variables=firstRule(compact),header=firstRule(`${compact} .farm-header`),toolbar=firstRule(`${compact} .farm-toolbar`);
  const headerHeight=Number.parseFloat(variables['--farm-hud-header-height']),toolbarHeight=Number.parseFloat(variables['--farm-hud-toolbar-height']);
  assert(Number.isFinite(headerHeight)&&headerHeight>=44);
  assert(Number.isFinite(toolbarHeight)&&toolbarHeight>=44);
  assert((640-headerHeight-toolbarHeight)/640>=.75,'normal HUD reserves at least 480 nominal CSS px for the map, excluding device safe areas');
  assert.match(header.height,/var\(--farm-hud-header-height\)/);
  assert.match(toolbar.height,/var\(--farm-hud-toolbar-height\)/);
  assert.equal(toolbar['flex-wrap'],'nowrap','ordinary map tools stay in one bottom row');
  assert.match(firstRule(`${compact} .farm-viewport`).flex,/^1\b/,'map receives the remaining flex height');
  for(const selector of [`${compact} .farm-header button`,`${compact} .farm-toolbar > button`,`${compact} .farm-placement-toolbar > button`,`${compact} .farm-camera-tools button`,`${compact} .farm-menu-grid button`]){
    const properties=firstRule(selector);
    assert(Number.parseFloat(properties['min-width'])>=44,`${selector} retains a 44px width target`);
    assert(Number.parseFloat(properties['min-height'])>=44,`${selector} retains a 44px height target`);
  }
});

test('live feedback and persistent save errors float without resizing or blocking the map',()=>{
  const status=firstRule(`${compact} .farm-status`),visible=firstRule(`${compact} .farm-status.is-visible`),error=firstRule(`${compact} .farm-error-bar`);
  assert.equal(status.position,'absolute');assert.equal(error.position,'absolute');
  assert.equal(status.width,'1px');assert.equal(status.height,'1px');
  assert.equal(status['pointer-events'],'none');assert.match(status['clip-path'],/inset\(50%\)/);
  assert.equal(visible['clip-path'],'none');
  for(const {selector,properties} of rules.filter(rule=>rule.selector.startsWith(compact)&&/\.farm-status\b/.test(rule.selector))){
    assert(!properties.position||['absolute','fixed'].includes(properties.position),`${selector} never rejoins document flow`);
    assert(!properties['pointer-events']||properties['pointer-events']==='none',`${selector} does not intercept a planting stroke`);
  }
  assert.match(functionSource('status'),/classList\.toggle\('is-visible'/,'feedback visibility changes a class instead of map geometry');
});

test('stroke preview closes on release or cancellation while ordinary feedback is transient',()=>{
  const f=fixture(),toasts=[],cancelled=[];
  Object.assign(f.context,{
    toast:message=>toasts.push(message),
    entityLayer:{querySelectorAll:()=>[],querySelector:()=>null},
    strokePreview:()=>[],
    cancelFarmStroke:(stroke,reason)=>cancelled.push({stroke,reason})
  });
  f.context.status=method('status',f.context);
  f.context.renderStroke=method('renderStroke',f.context);
  const live=f.context.app.querySelector('.farm-status');
  f.context.status('没有划到目标');
  assert.equal(live.textContent,'没有划到目标');
  assert.equal(live.classList.contains('is-visible'),false);
  assert.deepEqual(toasts,['没有划到目标']);
  f.context.ui.stroke={};
  f.context.renderStroke();
  assert.equal(live.classList.contains('is-visible'),true);
  assert.equal(toasts.length,1,'live preview does not restart a toast for each pointer movement');
  f.context.ui.stroke=null;
  f.context.renderStroke();
  assert.equal(live.classList.contains('is-visible'),false,'release removes floating preview');
  f.context.ui.stroke={};f.context.ui.gesture={type:'stroke'};
  f.context.renderStroke();
  const cancel=method('cancelGesture',f.context);
  cancel('已取消，未消耗种子');
  assert.equal(cancelled.length,1);
  assert.equal(f.context.ui.stroke,null);assert.equal(f.context.ui.gesture,null);
  assert.equal(live.classList.contains('is-visible'),false);
  assert.equal(live.textContent,'已取消，未消耗种子');
  assert.deepEqual(toasts,['没有划到目标','已取消，未消耗种子']);
  cancel('没有待取消操作');
  assert.equal(toasts.length,2,'idle cancellation does not add unrelated feedback');
  assert.doesNotMatch(functionSource('render'),/\bstatus\(/,'regular farm ticks do not replay old messages');
});
