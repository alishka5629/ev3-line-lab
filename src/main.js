import {CalibrationGuide} from './calibration.js';
import './style.css';import {Speaker} from './speaker.js';import {tracks} from './tracks.js';import {LabScene} from './scene.js';import {LabScene2D} from './scene2d.js';
const $=id=>document.getElementById(id);let track=tracks[0],mode='auto',active=false,compiling=false,pose={x:0,y:0,yaw:0},config={},requestId=0,runGeneration=0,workerReady=false,frameReady=false,runtime=$('runtime'),pending=new Map();
let sensorCount=1,guide,runV3=false,runResult="";
let targetVisual=null,shownVisual=null,visualFrame=0,lastVisualAt=0,lastTelemetryAt=0,saveTimer;
function paintRobot(now){visualFrame=0;if(!targetVisual)return;const f=1-Math.exp(-Math.min(60,now-lastVisualAt)/35);lastVisualAt=now;const a=shownVisual||targetVisual;shownVisual={x:a.x+(targetVisual.x-a.x)*f,y:a.y+(targetVisual.y-a.y)*f,yaw:a.yaw+(targetVisual.yaw-a.yaw)*f,angles:targetVisual.angles};scene?.update(shownVisual,true);if(active)visualFrame=requestAnimationFrame(paintRobot);}
function queueRobot(p){targetVisual=p;if(!shownVisual)shownVisual={...p};if(!visualFrame){lastVisualAt=performance.now();visualFrame=requestAnimationFrame(paintRobot);}}
const speaker=new Speaker({onState:s=>{$('speaker-state').textContent=s.detail||({idle:'Ready',playing:'Playing',blocked:'Audio blocked',unavailable:'Audio unavailable'}[s.state]||s.state);$('speaker-state').dataset.state=s.state;}});
function log(s,error=false){$('console').textContent=s;$('console').classList.toggle('error',error);}
const onPlace=(x,y)=>{pose.x=x;pose.y=y;post({type:'pose',...pose});scene.update(pose,false);};let scene;try{scene=new LabScene($('scene'),onPlace);}catch(e){scene=new LabScene2D($('scene'),onPlace);document.querySelector('[data-view=perspective]').disabled=true;document.querySelector('[data-view=perspective]').classList.remove('active');document.querySelector('[data-view=top]').classList.add('active');}
function readConfig(){config={wheelDiameter:+$('cfg-wheel').value,wheelbase:+$('cfg-base').value,sensorOffset:+$('cfg-sensor').value,sensorCount,sensorGap:+$('cfg-gap').value,lineWidth:+$('cfg-line').value,black:+$('cfg-black').value,white:+$('cfg-white').value,noise:+$('cfg-noise').value,slip:+$('cfg-slip').value/100};return config;}
function post(d){runtime.contentWindow.postMessage({ev3lab:true,...d,type:'lab-'+d.type},'*');}
function setLight(light,auxLight){
 $('light').innerHTML=Math.round(light)+'<small> %</small>';
 $('light-meter').style.width=light+'%';
 $('aux-light').textContent=auxLight==null?'—':Math.round(auxLight)+'%';
}
function place(where){
 const world=new LabPhysics.Physics(track,readConfig());
 world.place(where);pose={x:world.x,y:world.y,yaw:world.yaw};
 scene?.update(pose,false);post({type:'place',where});
 setLight(world.light(),sensorCount===2?world.light(1):null);
}
function stop(){guide?.reset();runResult='';runV3=false;cancelAnimationFrame(visualFrame);visualFrame=0;targetVisual=null;shownVisual=null;speaker.stop();runGeneration++;post({type:'stop'});active=false;$('state-label').textContent='Stopped';$('run').disabled=!workerReady;$('motor-left').innerHTML='0<small> %</small>';$('motor-right').innerHTML='0<small> %</small>';}
function setView(view){
 scene?.setView(view);
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
function defaultView(){return track.defaultView??(scene instanceof LabScene2D?'top':'perspective');}
function selectTrack(t){stop();track=t;scene?.configure(readConfig());scene?.setTrack(t,config.lineWidth);setView(defaultView());place('edge');$('track-title').innerHTML=t.name+' <span class="badge">'+t.difficulty+'</span>';$('track-description').textContent=t.desc;document.querySelectorAll('.track').forEach(b=>b.classList.toggle('active',b.dataset.id===t.id));$('clock').textContent='00:00.0';$('state-label').textContent='Ready to run';}
function previewPath(points){
 return points.map(([x,y],i)=>(i?'L':'M')+(x/22+40).toFixed(1)+','+(35-y/22).toFixed(1)).join(' ');
}
tracks.forEach(t=>{
 const tape=t.paths.map(previewPath).join(' ');
 const patches=(t.polygons??[]).map(points=>previewPath(points)+'Z').join(' ');
 const b=document.createElement('button');
 b.className='track';
 b.dataset.id=t.id;
 b.innerHTML=`<svg viewBox="0 0 80 70"><path d="${tape}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="${patches}" fill="currentColor"/></svg><span><b>${t.name}</b><small>${t.tag}</small></span>`;
 b.onclick=()=>selectTrack(t);
 $('tracks').appendChild(b);
});
const worker=new Worker(new URL('./compiler.js?v='+__RUNTIME_VERSION__,document.baseURI).href);worker.onmessage=e=>{let d=e.data;if(d.type==='ready'){workerReady=true;$('run').disabled=false;log('MakeCode EV3 is ready. Choose a program and press Run.');return;}let p=pending.get(d.id);if(p){pending.delete(d.id);d.type==='error'?p.reject(Error(d.message)):p.resolve(d);}};worker.onerror=e=>{log('Compiler could not load. Check your connection and reload.',true);$('run').disabled=true;};
function compile(kind,extra){return new Promise((resolve,reject)=>{let id=++requestId;pending.set(id,{resolve,reject});worker.postMessage({id,kind,...extra});setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('Compilation took over 30 seconds. Check your code or reload.'));}},30000);});}
const labTrack=tracks.find(t=>t.id==='complex');
function hasDualV3(code){return code.includes('RIGHT+ENTER: 2 eyes');}
async function fetchProgram(name){
 const response=await fetch(`./programs/${name}.ts`);
 if(!response.ok)throw Error('Could not load the example');
 return response.text();
}
async function run({guided=false}={}){
 if(compiling)return;
 const audioReady=speaker.unlock();
 if(!frameReady||!workerReady){
  const message='The EV3 is still loading. Try again in a moment.';
  log(message);
  if(guided)guide.onError(message);
  return;
 }
 if(guided){
  setMode('manual');
  if(track!==labTrack)selectTrack(labTrack);
 }
 stop();
 const generation=runGeneration;
 if(guided){guide.begin();updateRobotControls();}
 compiling=true;$('run').disabled=true;
 $('state-label').textContent='Compiling…';
 log('Compiling with the official MakeCode compiler…');
 try{
  const code=guided?await fetchProgram('lab-v3'):$('code').value;
  const prompts=guided||hasDualV3(code)||code.includes('Default route after the pad');
  await audioReady;
  const result=await compile('compile',{code,automatic:mode==='auto',prompts});
  if(generation!==runGeneration)return;
  scene?.configure(readConfig());
  scene?.setTrack(track,config.lineWidth);
  place('edge');
  active=true;
  runV3=code.includes('Default route after the pad');
  post({type:'run',binary:result.binary,runId:generation,track,config,autoCalibration:mode==='auto'});
  log(mode==='auto'?'Program loaded. Detecting calibration and startup steps…':'Program loaded. Follow the prompts on the EV3.');
  $('state-label').textContent=mode==='auto'?'Starting…':'Manual calibration';
 }catch(e){
  if(generation!==runGeneration)return;
  log(e.message,true);$('state-label').textContent='Run could not start';
  if(guided)guide.onError(e.message);
 }finally{compiling=false;$('run').disabled=!workerReady;}
}
window.addEventListener('message',e=>{if(e.source!==runtime.contentWindow||!e.data.ev3lab)return;const s=e.data;if(s.type==='audio'){handleAudio(s);return;}if(s.type==='ready'){frameReady=true;return;}if(s.type==='error'){const guided=guide?.running;log(s.message,true);stop();if(guided)guide.onError(s.message);return;}if(s.type==='prompt'){
 if(s.runId!==runGeneration||!active)return;
 guide?.prompt(s.text);
 if(runV3&&/^(Finish|Practice complete|Stopped|.*(?:timeout|missing)|Early line loss|No outgoing edge|Check .*|Low contrast|Pad not confirmed|Outlet retry failed|Retry too far)$/i.test(s.text)){
  runResult=s.text;
  $('state-label').textContent=runResult;
 }
 return;
}if(s.type==='phase'){$('state-label').textContent=s.message;return;}if(s.type!=='state'||!active)return;if(!runResult&&!s.autoBusy&&(s.left||s.right))$('state-label').textContent='Program running';pose={x:s.x,y:s.y,yaw:s.yaw,angles:s.angles};if(s.autoBusy){shownVisual={...pose};scene?.update(pose,false);}else queueRobot(pose);if(s.screen&&s.screen.length===178*128){const pixels=s.screen instanceof Uint32Array?s.screen:new Uint32Array(s.screen);const data=new ImageData(new Uint8ClampedArray(pixels.buffer,pixels.byteOffset,pixels.byteLength),178,128);$('lcd').getContext('2d').putImageData(data,0,0);scene?.lcd($('lcd'));}if(performance.now()-lastTelemetryAt<100)return;lastTelemetryAt=performance.now();setLight(s.light,s.auxLight);$('motor-left').innerHTML=s.left+'<small> %</small>';$('motor-right').innerHTML=s.right+'<small> %</small>';$('left-meter').style.width=Math.abs(s.left)+'%';$('right-meter').style.width=Math.abs(s.right)+'%';$('gyro').innerHTML=Math.round(s.gyro)+'<small>°</small>';$('distance').textContent=(s.distance/1000).toFixed(2)+' m';if(runResult&&s.screen&&!s.left&&!s.right){active=false;cancelAnimationFrame(visualFrame);visualFrame=0;scene?.update(pose,false);}let sec=s.time/1000;$('clock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+(sec%60).toFixed(1).padStart(4,'0');});
async function loadProgram(name){try{
 const code=await fetchProgram(name);
 $('code').value=code;$('program').value=name;
 if(name==='lab-v3'&&track!==labTrack)selectTrack(labTrack);
 updateRobotControls();save();
}catch(e){log(e.message,true);}}
function save(){clearTimeout(saveTimer);try{localStorage.setItem('ev3-line-lab-code',$('code').value);$('save-status').textContent='Saved locally';}catch(e){$('save-status').textContent='Local saving unavailable';}}
$('code').addEventListener('input',()=>{$('program').value='custom';updateRobotControls();clearTimeout(saveTimer);$('save-status').textContent='Saving…';saveTimer=setTimeout(save,400);});$('code').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();let el=e.target,a=el.selectionStart,b=el.selectionEnd;el.setRangeText('    ',a,b,'end');save();}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}});
$('program').onchange=e=>{if(e.target.value!=='custom')loadProgram(e.target.value);};$('run').onclick=()=>run();$('run').disabled=true;$('stop').onclick=stop;$('reset').onclick=()=>selectTrack(track);
function updateRobotControls(){
 const dual=sensorCount===2;
 const v3=hasDualV3($('code').value)||guide?.running;
 $('aux-telemetry').hidden=!dual;
 $('use-v3').hidden=!dual||hasDualV3($('code').value);
 $('gap-setting').hidden=!dual;
 $('port-summary').textContent=dual?'Motors B + C · Color 1 + 3 · Gyro 2':'Motors B + C · Color 3 · Gyro 2';
 $('brick-ports').textContent=dual?'B C · 1 2 3':'B C · 2 3';
 $('dual-enter').hidden=!dual||!v3||mode!=='manual';
 $('manual-keys').textContent=v3
  ?(dual?'V3 · Black: RIGHT + ENTER. Floor and edge: ENTER.':'V3 · Press ENTER on black, light floor, and the edge.')
  :(['basic','advanced'].includes($('program').value)
    ?'Basic / Advanced · Black: UP. Floor: DOWN. Edge: ENTER.'
    :'Follow the EV3 screen for the buttons used by your program.');
 $('mode-hint').textContent=mode==='auto'
  ?(dual&&v3?'V3 holds RIGHT for the first ENTER, then samples both sensors.':'Run → detect prompts → calibrate → drive.')
  :'Run loads your program. Calibrate with the EV3 buttons or open the guide.';
}
function setMode(next){
 mode=next;stop();
 for(const value of ['auto','manual']){
  const button=$('mode-'+value);
  button.classList.toggle('active',mode===value);
  button.setAttribute('aria-pressed',String(mode===value));
 }
 updateRobotControls();
}
for(const value of ['auto','manual'])$('mode-'+value).onclick=()=>setMode(value);
function setSensors(next){
 sensorCount=next===2?2:1;
 $('sensor-count').value=$('guide-sensors').value=String(sensorCount);
 try{localStorage.setItem('ev3-line-lab-sensors',String(sensorCount));}catch(e){}
 selectTrack(track);
 updateRobotControls();
}
guide=new CalibrationGuide({
 getWorld:()=>new LabPhysics.Physics(labTrack,readConfig()),
 start:()=>run({guided:true}),
 place,
 move:(x,y,yaw)=>{pose={x,y,yaw};scene?.update(pose,false);post({type:'pose',...pose});},
 tap:(index,hold)=>post({type:'tap',index,hold}),
});
$('open-calibration').onclick=()=>guide.open();
$('use-v3').onclick=()=>loadProgram('lab-v3');
$('dual-enter').onclick=()=>post({type:'tap',index:1,hold:[3]});
for(const id of ['sensor-count','guide-sensors'])$(id).onchange=e=>setSensors(Number(e.target.value));
document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>place(b.dataset.place));document.querySelectorAll('[data-key]').forEach(b=>{let key=+b.dataset.key,started=0,release;const down=()=>{clearTimeout(release);started=performance.now();post({type:'button',index:key,down:true});};const up=()=>{clearTimeout(release);release=setTimeout(()=>post({type:'button',index:key,down:false}),Math.max(0,140-(performance.now()-started)));};b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);down();};b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=up;b.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();down();}};b.onkeyup=up;});
window.addEventListener('keydown',e=>{if(/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;if(e.key.toLowerCase()==='q'||e.key.toLowerCase()==='e'){pose.yaw+=(e.key.toLowerCase()==='q'?1:-1)*Math.PI/36;post({type:'pose',...pose});scene?.update(pose,false);}if(e.key==='Escape'&&!$('calibration-dialog').open)stop();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('reset-camera').onclick=()=>setView(defaultView());$('help').onclick=()=>$('help-dialog').showModal();$('settings').onclick=()=>$('settings-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('apply-settings').onclick=()=>{let inputs=[...$('settings-dialog').querySelectorAll('input')];if(inputs.some(i=>!i.checkValidity())){inputs.find(i=>!i.checkValidity()).reportValidity();return;}$('settings-dialog').close();selectTrack(track);};
$('upload').onclick=()=>$('file').click();$('file').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{stop();if(f.size>16*1024*1024)throw Error('Maximum file size: 16 MB');let code;if(f.name.toLowerCase().endsWith('.uf2')){log('Extracting MakeCode source from UF2…');let r=await compile('extract',{bytes:await f.arrayBuffer()});const extras=Object.keys(r.files).filter(n=>n.endsWith('.ts')&&n!=='main.ts');if(extras.length)throw Error('Multi-file project: merge '+extras.join(', ')+' into main.ts before running.');code=r.code;}else code=await f.text();$('code').value=code;$('program').value='custom';updateRobotControls();save();log(f.name+' loaded. Press Run to start.');}catch(err){log('Import: '+err.message,true);}e.target.value='';};
$('download').onclick=()=>{let url=URL.createObjectURL(new Blob([$('code').value],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='EV3_LineLab_main.ts';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
let saved,initialSensors=1;
try{saved=localStorage.getItem('ev3-line-lab-code');initialSensors=Number(localStorage.getItem('ev3-line-lab-sensors'));}catch(e){}
if(saved){$('code').value=saved;$('program').value='custom';}else loadProgram('basic');
setSensors(initialSensors);

const handshake=setInterval(()=>{if(frameReady)clearInterval(handshake);else post({type:'ping'});},500);runtime.addEventListener('load',()=>post({type:'ping'}));

Promise.all(['vendor/pxtsim.js','vendor/common-sim.js','vendor/sim.js','physics.js','autopilot.js','speaker-bridge.js','runtime.js'].map(async path=>{const response=await fetch(new URL(path,document.baseURI),{cache:'no-cache'});if(!response.ok)throw Error('EV3 asset: '+path);return response.text();})).then(sources=>{runtime.srcdoc='<!doctype html><body><span id="runtime-status">Loading EV3</span>'+sources.map(source=>'<script>'+source.replace(/<\/script/gi,'<\\/script')+'<\/script>').join('');}).catch(e=>log('Could not load EV3 runtime: '+e.message,true));

window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);save();});

document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){stop();log('Run stopped because the tab was hidden. Press Run to restart.');}});

function setTheme(theme){document.documentElement.dataset.theme=theme;$('theme').value=theme;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#141a18':'#f5f5f0';try{localStorage.setItem('ev3-line-lab-theme',theme);}catch(e){}scene?.setTheme(theme);}
$('theme').onchange=e=>setTheme(e.target.value);setTheme(document.documentElement.dataset.theme||'light');

async function handleAudio(s){if(s.runId!==runGeneration||!active)return;try{if(s.action==='stop')speaker.stop();else if(s.action==='volume')speaker.setProgramVolume(s.volume);else if(s.action==='tone')speaker.tone(s.frequency);else if(s.action==='wav')await speaker.wav(s.bytes);}catch(e){$('speaker-state').textContent=e.message;}finally{if(s.action==='wav')post({type:'audio-ended',runId:s.runId,id:s.id});}}
$('speaker-enable').onclick=()=>speaker.unlock();$('speaker-mute').onclick=()=>{speaker.setMuted(!speaker.muted);$('speaker-mute').textContent=speaker.muted?'Unmute':'Mute';$('speaker-mute').setAttribute('aria-pressed',String(speaker.muted));};$('speaker-volume').oninput=e=>{speaker.setLevel(e.target.value);$('speaker-volume-value').textContent=e.target.value+'%';};
setInterval(()=>{const rms=speaker.rms();$('speaker-level').value=Math.min(1,rms*3);$('speaker-level').setAttribute('aria-valuetext',(rms*100).toFixed(1)+'% output');scene?.setSpeaking(speaker.state==='playing'&&!speaker.muted&&speaker.level>0);},100);
