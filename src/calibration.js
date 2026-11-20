const steps = [
  {surface:'black', prompt:'Sensor on LINE', title:'Sample the black tape', action:'Place on black'},
  {surface:'white', prompt:'Sensor on FLOOR', title:'Sample the light floor', action:'Place on light floor'},
  {surface:'edge', prompt:'On EDGE, keep still', title:'Line up at the start', action:'Align to the right edge'},
];
const palette = {main:'#f26b4f',aux:'#34b7aa'};

function rounded(ctx,x,y,w,h,r,fill){
  ctx.fillStyle=fill;
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  ctx.fill();
}

export class CalibrationGuide {
  constructor({getWorld,start,place,move,tap}){
    this.getWorld=getWorld;
    this.start=start;
    this.place=place;
    this.move=move;
    this.tap=tap;
    this.get=id=>document.getElementById(id);
    this.dialog=this.get('calibration-dialog');
    this.canvas=this.get('cal-canvas');
    this.ctx=this.canvas.getContext('2d');
    this.get('cal-start').onclick=()=>this.start();
    this.get('cal-restart').onclick=()=>this.start();
    this.get('cal-place').onclick=()=>this.prepare(true);
    this.get('cal-confirm').onclick=()=>{
      if(this.step===3){this.dialog.close();return;}
      if(!this.placed||this.waiting)return;
      this.waiting=true;
      this.tap(1,this.step===0&&this.world.config.sensorCount===2?[3]:[]);
      this.render();
    };
    this.canvas.addEventListener('pointerdown',e=>{
      if(!this.placed||this.waiting||this.step>=3)return;
      const point=this.canvasPoint(e);
      if(Math.hypot(point.x-this.world.x,point.y-this.world.y)>85)return;
      this.drag={x:point.x-this.world.x,y:point.y-this.world.y};
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove',e=>{
      if(!this.drag)return;
      const point=this.canvasPoint(e);
      this.world.x=point.x-this.drag.x;
      this.world.y=point.y-this.drag.y;
      this.move(this.world.x,this.world.y,this.world.yaw);
      this.render();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])
      this.canvas.addEventListener(event,()=>{this.drag=null;});
    this.reset();
  }

  reset(){
    this.step=0;
    this.running=false;
    this.waiting=false;
    this.ready=false;
    this.placed=false;
    this.drag=null;
    this.error='';
    this.world=this.getWorld();
    this.prepare(false);
  }

  open(){
    if(!this.running){this.world=this.getWorld();this.prepare(false);}
    this.dialog.showModal();
    this.render();
  }

  begin(){
    this.reset();
    this.running=true;
    this.render();
  }

  onError(message){
    this.reset();
    this.error=message;
    this.render();
  }

  prompt(text){
    if(!this.running)return;
    const index=steps.findIndex(step=>step.prompt===text);
    if(index>=0){
      this.step=index;
      this.ready=true;
      this.waiting=false;
      this.prepare(false);
    } else if(text==='Start straight'){
      this.step=3;
      this.waiting=false;
      this.drag=null;
      this.render();
    } else if(text==='Gyro: keep still') {
      this.get('cal-status').textContent='Calibrating the gyro. Keep the brick still.';
    } else if(this.step<3) this.onError(text);
  }

  prepare(apply){
    const surface=steps[this.step]?.surface??'edge';
    this.world.place(surface);
    this.center={x:this.world.x,y:this.world.y};
    this.placed=apply;
    this.drag=null;
    if(apply)this.place(surface);
    this.render();
  }

  canvasPoint(e){
    const bounds=this.canvas.getBoundingClientRect();
    const {width,height}=this.canvas;
    return {
      x:this.center.x+(width*(e.clientX-bounds.left)/bounds.width-width/2)/this.scale,
      y:this.center.y-(height*(e.clientY-bounds.top)/bounds.height-height/2)/this.scale,
    };
  }

  render(){
    const completed=this.step===3;
    const step=steps[Math.min(this.step,2)];
    const dual=this.world.config.sensorCount===2;
    this.get('cal-aux-reading').hidden=!dual;
    this.get('cal-step-title').textContent=completed?'Ready to drive':step.title;
    const sensors=dual?'Both sensor windows':'The sensor window';
    this.get('cal-mounting').textContent=dual
      ?`Mount Port 1 to the robot’s left of Port 3, ${this.world.config.sensorGap} mm between the optical spots. Point both windows down.`
      :'Mount Port 3 at the front with its optical window facing down.';
    const instructions=[
      sensors+' sit fully above the black tape. Use the wide patch so both spots are on black.',
      sensors+' sit above clean light floor. Leave a gap between the spots and any tape.',
      'Put the orange spot on the right edge of the starting line. Face along the tape, with black to the robot’s left.',
    ];
    this.get('cal-step-body').textContent=completed?'The EV3 has recorded its samples. The robot is now running Lab Bonus.':
      (dual?instructions[this.step]:instructions[this.step].replace('Use the wide patch so both spots are on black.',''));
    this.get('cal-keys').replaceChildren();
    if(!completed){
      const keys=dual&&this.step===0?['RIGHT','ENTER']:['ENTER'];
      for(const key of keys){
        const badge=document.createElement('kbd');
        badge.textContent=key;
        this.get('cal-keys').append(badge);
      }
    }
    const valid=this.validPlacement();
    const message= this.error || (completed?'Calibration complete':
      !this.running?'Start a practice run to try the buttons on the virtual EV3.':
      !this.ready?'Starting Lab Bonus V3…':
      this.waiting?'Waiting for the EV3 to finish this step…':
      !this.placed?'Place the robot to apply the position shown here.':
      !valid?'The spots are off target. Drag the robot or use the placement button again.':
      'Position ready. You can drag the robot to try a different placement.');
    this.get('cal-status').textContent=message;
    this.get('cal-start').hidden=this.running;
    this.get('cal-place').hidden=!this.running||!this.ready||completed;
    this.get('cal-place').disabled=this.waiting;
    this.get('cal-place').textContent=step.action;
    this.get('cal-confirm').hidden=!this.running||!this.ready;
    this.get('cal-confirm').disabled=!completed&&(!this.placed||!valid||this.waiting);
    this.get('cal-confirm').textContent=completed?'Watch the run':dual&&this.step===0?'Hold RIGHT + press ENTER':'Press ENTER';
    this.get('cal-restart').hidden=!this.running;
    const progress=this.dialog.querySelectorAll('.cal-progress li');
    progress.forEach((li,i)=>{
      li.classList.toggle('done',i<this.step);
      if(i===this.step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');
    });
    const light=port=>{
      this.get(port===3?'cal-light':'cal-aux').textContent=Math.round(this.world.light(port))+'%';
    };
    light(3);
    if(dual)light(1);
    this.draw();
  }

  validPlacement(){
    if(this.step>=3)return true;
    const distance=port=>{
      const p=this.world.sensor(port);
      return LabPhysics.surfaceDistance(this.world.sampleTrack,p.x,p.y,this.world.config.lineWidth);
    };
    const main=distance(3);
    if(this.step===2){
      const {x,y}=this.world.sensor(3);
      const {yaw,config,sampleTrack}=this.world;
      const dx=-6*Math.sin(yaw),dy=6*Math.cos(yaw);
      const left=LabPhysics.surfaceDistance(sampleTrack,x+dx,y+dy,config.lineWidth);
      const right=LabPhysics.surfaceDistance(sampleTrack,x-dx,y-dy,config.lineWidth);
      return Math.abs(main)<=3&&left<0&&right>0;
    }
    const both=this.world.config.sensorCount===2?[main,distance(1)]:[main];
    return both.every(d=>this.step===0?d<=-3:d>=3);
  }

  draw(){
    const {ctx,canvas,world}=this;
    const {width,height}=canvas;
    const scale=this.scale=Math.min(1.8,330/(world.config.wheelbase+38));
    const at=(x,y)=>[(x-this.center.x)*scale+width/2,height/2-(y-this.center.y)*scale];
    ctx.fillStyle='#eeeee7';
    ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='#dcded5';
    ctx.lineWidth=1;
    for(let x=width/2%30;x<width;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
    for(let y=height/2%30;y<height;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    const trace=points=>{ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](...at(x,y)));};
    ctx.strokeStyle=ctx.fillStyle='#29332c';
    ctx.lineCap=ctx.lineJoin='round';
    ctx.lineWidth=world.config.lineWidth*scale;
    for(const line of world.sampleTrack.paths){trace(line);ctx.stroke();}
    for(const polygon of world.sampleTrack.polygons??[]){trace(polygon);ctx.closePath();ctx.fill();}
    const [x,y]=at(world.x,world.y);
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(-world.yaw);
    ctx.scale(scale,scale);
    const wheelbase=world.config.wheelbase;
    const wheel=world.config.wheelDiameter;
    for(const side of [-1,1]){
      rounded(ctx,-wheel/2,side*wheelbase/2-10,wheel,20,4,'#252c27');
      for(let tread=-wheel/2+6;tread<wheel/2-3;tread+=6)
        rounded(ctx,tread,side*wheelbase/2-9,2,18,1,'#414c44');
    }
    rounded(ctx,-72,-39,115,78,7,'#8e9a91');
    rounded(ctx,-65,-34,102,68,8,'#f7f9ef');
    rounded(ctx,-53,-23,42,46,5,'#2e3d33');
    rounded(ctx,-49,-19,34,38,2,'#b2c69d');
    rounded(ctx,3,-6,11,12,3,'#ca5541');
    const xSensor=world.config.sensorOffset;
    const sensors=world.config.sensorCount===2?[[0,palette.main],[-world.config.sensorGap,palette.aux]]:[[0,palette.main]];
    for(const [offset,color] of sensors){
      rounded(ctx,xSensor-22,offset-3,22,6,2,'#7e8c81');
      rounded(ctx,xSensor-8,offset-8,16,16,3,'#f7f8ee');
      ctx.strokeStyle=color;
      ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(xSensor,offset,5,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=color;
      ctx.beginPath();ctx.arc(xSensor,offset,3,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    const arrowAt=at(world.x+(xSensor+36)*Math.cos(world.yaw),world.y+(xSensor+36)*Math.sin(world.yaw));
    ctx.save();
    ctx.translate(...arrowAt);
    ctx.rotate(-world.yaw);
    ctx.strokeStyle='#83a957';
    ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(15,0);ctx.lineTo(5,-8);ctx.moveTo(15,0);ctx.lineTo(5,8);ctx.stroke();
    ctx.restore();
  }
}
