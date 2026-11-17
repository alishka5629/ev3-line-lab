let rt=null,world=null,timer=null,sequence=0,last=performance.now(),lastSend=0,autoBusy=false;
const send=data=>parent.postMessage({ev3lab:true,...data},'*');
pxsim.EV3Board.prototype.initAsync=function(msg){pxsim.BaseBoard.prototype.initAsync.call(this,msg);return Promise.resolve();};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function button(index,down){if(rt&&!rt.dead)rt.board.brickNode.buttonState.buttons[index].setPressed(down);}
async function tap(index){button(index,true);await sleep(140);button(index,false);}
function stop(){sequence++;clearInterval(timer);if(rt){rt.kill();rt=null;}autoBusy=false;}
function tick(){if(!rt||rt.dead)return;const now=performance.now(),dt=Math.min(40,Math.max(1,now-last));last=now;const motors=rt.board.getMotors();let before=motors.map(m=>m?m.angle:0);for(const m of motors)if(m)m.updateState(dt);
 if(!autoBusy)world.step(dt,(motors[1]?.angle||0)-(before[1]||0),(motors[2]?.angle||0)-(before[2]||0));
 const light=world.light();let color=rt.board.getInputNodes()[2];if(color?.getDeviceType()===29)color.setColor(color.mode===2?(light<30?1:6):Math.round(light));let gyro=rt.board.getInputNodes()[1];if(gyro?.getDeviceType()===32)gyro.setRate(-world.yawRate);
 if(Math.abs(world.x)>2200||Math.abs(world.y)>2200){send({type:'error',message:'Робот выехал за границы площадки. Программа остановлена.'});stop();return;}
 if(now-lastSend>45){lastSend=now;let s=rt.board.screenState;send({type:'state',x:world.x,y:world.y,yaw:world.yaw,light,gyro:world.yaw*180/Math.PI,time:world.time,distance:world.distance,left:motors[1]?.getSpeed()||0,right:motors[2]?.getSpeed()||0,angles:[motors[1]?.angle||0,motors[2]?.angle||0],screen:s.screen?Array.from(s.screen):null,screenWidth:s.width,screenHeight:s.height,autoBusy});}}
window.addEventListener('message',async e=>{if(e.source!==parent||!e.data.ev3lab)return;let d={...e.data};if(!d.type.startsWith('lab-'))return;d.type=d.type.slice(4);
 if(d.type==='ping'){document.getElementById('runtime-status').textContent='EV3 ready';send({type:'ready'});return;}
 if(d.type==='stop'){stop();send({type:'stopped'});return;}
 if(d.type==='button'){button(d.index,d.down);return;}
 if(d.type==='place'){if(world)world.place(d.where);return;}
 if(d.type==='pose'){if(world){world.x=d.x;world.y=d.y;if(d.yaw!==undefined)world.yaw=d.yaw;world.yawRate=0;}return;}
 if(d.type!=='run')return;
 try{stop();let ticket=sequence;world=new LabPhysics.Physics(d.track,d.config);let msg={type:'run',id:'ev3-lab',code:d.binary,boardDefinition:{},parts:[],fnArgs:{}};rt=new pxsim.Runtime(msg);await rt.board.initAsync(msg);rt.errorHandler=err=>send({type:'error',message:String(err)});rt.postError=err=>send({type:'error',message:String(err)});autoBusy=!!d.autoCalibration;
 rt.run(()=>{});last=performance.now();timer=setInterval(tick,10);send({type:'started'});
 if(d.autoCalibration){await sleep(1000);if(ticket!==sequence)return;world.place('black');send({type:'phase',message:'Калибровка: чёрная линия'});await sleep(150);await tap(0);await sleep(700);if(ticket!==sequence)return;world.place('white');send({type:'phase',message:'Калибровка: светлый фон'});await sleep(150);await tap(2);await sleep(700);if(ticket!==sequence)return;world.place('edge');send({type:'phase',message:'Датчик на краю · запуск'});await sleep(150);autoBusy=false;await tap(1);send({type:'phase',message:'Программа выполняется'});}
 }catch(err){send({type:'error',message:err.message||String(err)});stop();}});
document.getElementById('runtime-status').textContent='EV3 ready';send({type:'ready'});
