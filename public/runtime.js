let rt=null,world=null,timer=null,sequence=0,last=performance.now(),lastSend=0,autoBusy=false,pilot=null,lastScreenAt=0,lastPixels=null;
const send=data=>parent.postMessage({ev3lab:true,...data},'*');
pxsim.EV3Board.prototype.initAsync=function(msg){pxsim.BaseBoard.prototype.initAsync.call(this,msg);return Promise.resolve();};
const stockLog=pxsim.control.__log;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function button(index,down){if(rt&&!rt.dead)rt.board.brickNode.buttonState.buttons[index].setPressed(down);}
async function tap(index,ticket,hold=[]){
 if(ticket!==sequence||!rt)return;
 const owner=rt;
 for(const extra of hold)button(extra,true);
 button(index,true);
 await sleep(180);
 if(owner!==rt)return;
 button(index,false);
 for(const extra of hold)button(extra,false);
}
function setColor(node,light){
 if(node?.getDeviceType()===29)node.setColor(node.mode===2?(light<30?1:6):Math.round(light));
}
function stop(){LabSpeaker.stop();sequence++;clearInterval(timer);if(rt){rt.kill();rt=null;}autoBusy=false;pilot=null;lastPixels=null;lastScreenAt=0;}
function tick(){if(!rt||rt.dead)return;const now=performance.now(),dt=Math.min(40,Math.max(1,now-last));last=now;const motors=rt.board.getMotors();let before=motors.map(m=>m?m.angle:0);for(const m of motors)if(m)m.updateState(dt);
 if(!autoBusy)world.step(dt,(motors[1]?.angle||0)-(before[1]||0),(motors[2]?.angle||0)-(before[2]||0));
 if(pilot){const moving=motors.some(m=>m&&Math.abs(m.getSpeed())>0);const action=pilot.tick(now,moving);if(action?.type==='place'){world.place(action.surface);send({type:'phase',message:action.message});}if(action?.type==='tap'){tap({1:0,2:1,4:2,8:3}[action.key],sequence,action.hold);}if(action?.type==='release'){world.place('edge');autoBusy=false;pilot=null;send({type:'phase',message:action.message});}if(action?.type==='blocked'){send({type:'error',message:action.message});stop();return;}}
 const light=world.light();
 const auxLight=world.config?.sensorCount===2?world.light(1):null;
 const inputs=rt.board.getInputNodes();
 setColor(inputs[2],light);
 if(inputs[0])setColor(inputs[0],auxLight??0);
 const gyro=inputs[1];if(gyro?.getDeviceType()===32)gyro.setRate(-world.yawRate);
 if(Math.abs(world.x)>2200||Math.abs(world.y)>2200){send({type:'error',message:'Robot left the workspace. Program stopped.'});stop();return;}
 if(now-lastSend>30){lastSend=now;let s=rt.board.screenState,screen=null;if(now-lastScreenAt>100&&s.screen){lastScreenAt=now;const pixels=s.screen;if(!lastPixels||pixels.some((v,i)=>v!==lastPixels[i])){lastPixels=Uint32Array.from(pixels);screen=lastPixels;}}send({type:'state',x:world.x,y:world.y,yaw:world.yaw,light,auxLight,gyro:world.yaw*180/Math.PI,time:world.time,distance:world.distance,left:motors[1]?.getSpeed()||0,right:motors[2]?.getSpeed()||0,angles:[motors[1]?.angle||0,motors[2]?.angle||0],screen,screenWidth:s.width,screenHeight:s.height,autoBusy});}}
window.addEventListener('message',async e=>{if(e.source!==parent||!e.data.ev3lab)return;let d={...e.data};if(!d.type.startsWith('lab-'))return;d.type=d.type.slice(4);
 if(d.type==='ping'){document.getElementById('runtime-status').textContent='EV3 ready';send({type:'ready'});return;}
 if(d.type==='stop'){stop();send({type:'stopped'});return;}
 if(d.type==='button'){button(d.index,d.down);return;}
 if(d.type==='tap'){tap(d.index,sequence,d.hold);return;}
 if(d.type==='place'){if(world)world.place(d.where);return;}
 if(d.type==='pose'){if(world){world.x=d.x;world.y=d.y;if(d.yaw!==undefined)world.yaw=d.yaw;world.yawRate=0;}return;}
 if(d.type!=='run')return;
 try{stop();LabSpeaker.begin(d.runId);world=new LabPhysics.Physics(d.track,d.config);let msg={type:'run',id:'ev3-lab',code:d.binary,boardDefinition:{},parts:[],fnArgs:{}};rt=new pxsim.Runtime(msg);await rt.board.initAsync(msg);rt.errorHandler=err=>send({type:'error',message:String(err)});rt.postError=err=>send({type:'error',message:String(err)});autoBusy=!!d.autoCalibration;pilot=autoBusy?new LabAuto.Pilot(performance.now(),world.config.sensorCount):null;const originalLog=stockLog;pxsim.control.__log=(priority,str)=>{if(String(str).startsWith('__EV3LAB_')){const signal=String(str).trim();
 pilot?.signal(signal,performance.now());
 if(signal.startsWith('__EV3LAB_PROMPT|1|'))send({type:'prompt',text:signal.slice('__EV3LAB_PROMPT|1|'.length),runId:d.runId});
 return;}originalLog(priority,str);};
 rt.run(()=>{});last=performance.now();timer=setInterval(tick,10);send({type:'started'});

 }catch(err){send({type:'error',message:err.message||String(err)});stop();}});
document.getElementById('runtime-status').textContent='EV3 ready';send({type:'ready'});
