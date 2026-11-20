import test from 'node:test';import assert from 'node:assert/strict';import '../public/autopilot.js';const {Pilot,surface}=globalThis.LabAuto;
test('recognizes prompts and ignores saved values and summaries',()=>{assert.equal(surface('Sensor on LINE'),'black');assert.equal(surface('Sensor on FLOOR'),'white');assert.equal(surface('On EDGE, keep still'),'edge');for(let text of ['BLACK saved','White: 65','UP black / DOWN white'])assert.equal(surface(text),null);});
test('three ENTER waits follow program prompts',()=>{const p=new Pilot();for(const [i,s]of ['Sensor on LINE','Sensor on FLOOR','On EDGE, keep still'].entries()){let t=1200+i*1800;p.signal('__EV3LAB_PROMPT|1|'+s,t);p.signal('__EV3LAB_POLL|2',t);assert.equal(p.tick(t,false).surface,['black','white','edge'][i]);assert.deepEqual(p.tick(t+300,false),{type:'tap',key:2,surface:['black','white','edge'][i]});}assert.equal(p.tick(6500,true).type,'release');});
test('conventional multi-button polling maps black, white and edge',()=>{const p=new Pilot();for(let i=0;i<3;i++){let t=1200+i*1800;for(let key of [1,2,4,16])p.signal('__EV3LAB_POLL|'+key,t);assert.equal(p.tick(t,false).type,'place');assert.equal(p.tick(t+300,false).key,[1,4,2][i]);}});
test('unrecognized setup times out honestly; no-button programs run',()=>{assert.equal(new Pilot().tick(23000,false).type,'blocked');assert.equal(new Pilot().tick(1400,true).type,'release');});
test('custom button order follows explicit waits, including event waits',()=>{const p=new Pilot();for(const [i,[prompt,key]]of [['Sensor on BLACK',8],['Sensor on WHITE',1],['Place on EDGE',4]].entries()){let t=1200+i*1800;p.signal('__EV3LAB_PROMPT|1|'+prompt,t);p.signal('__EV3LAB_WAIT|'+key,t);assert.equal(p.tick(t,false).surface,['black','white','edge'][i]);assert.equal(p.tick(t+300,false).key,key);}});

test('a single ENTER start releases as soon as the program drives',()=>{const p=new Pilot();p.signal('__EV3LAB_POLL|2',1200);p.tick(1200,false);p.tick(1500,false);assert.equal(p.tick(2700,true).type,'release');});

test('V3 holds RIGHT only during dual-sensor black calibration',()=>{
 for(const count of [1,2]){
  const p=new Pilot(0,count);
  const prompts=['Sensor on LINE','Sensor on FLOOR','On EDGE, keep still'];
  for(let i=0;i<prompts.length;i++){
   const t=1200+i*1800;
   p.signal('__EV3LAB_PROMPT|1|'+prompts[i],t);
   if(i===0)p.signal('__EV3LAB_PROMPT|6|RIGHT+ENTER: 2 eyes',t);
   p.signal('__EV3LAB_POLL|2',t);
   p.tick(t,false);
   const tap=p.tick(t+300,false);
   assert.equal(tap.key,2);
   assert.deepEqual(tap.hold,i===0&&count===2?[3]:undefined);
  }
 }
});
