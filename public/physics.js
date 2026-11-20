(function(root){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function nearest(paths,x,y){let best={distance:Infinity,x:0,y:0,angle:0};for(const pts of paths)for(let i=1;i<pts.length;i++){let ax=pts[i-1][0],ay=pts[i-1][1],bx=pts[i][0],by=pts[i][1],dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy;if(!l)continue;let t=clamp(((x-ax)*dx+(y-ay)*dy)/l,0,1),xx=ax+t*dx,yy=ay+t*dy,d=Math.hypot(x-xx,y-yy);if(d<best.distance){best.distance=d;best.x=xx;best.y=yy;best.angle=Math.atan2(dy,dx);}}return best;}
// Signed distance to the union of tape strokes and filled black areas.
function surfaceDistance(track,x,y,width){
 let distance=nearest(track.paths,x,y).distance-width/2;
 for(const polygon of track.polygons||[]){
  let inside=false,boundary=Infinity;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const [ax,ay]=polygon[j],[bx,by]=polygon[i],dx=bx-ax,dy=by-ay;
   const length=dx*dx+dy*dy;
   const t=length?clamp(((x-ax)*dx+(y-ay)*dy)/length,0,1):0;
   boundary=Math.min(boundary,Math.hypot(x-ax-t*dx,y-ay-t*dy));
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  distance=Math.min(distance,inside?-boundary:boundary);
 }
 return distance;
}
class Physics {
 constructor(track,config={}){this.track=track;this.config={wheelDiameter:56,wheelbase:120,sensorOffset:45,sensorCount:1,sensorGap:24,lineWidth:18,black:8,white:65,noise:0,slip:0,...config};this.time=0;this.distance=0;this.yawRate=0;this.place('edge');}
 place(where){
  const [first,next]=this.track.paths[0];
  const [x,y]=this.track.start?.point??first;
  const heading=this.track.start?.heading??Math.atan2(next[1]-first[1],next[0]-first[0]);
  const dual=this.config.sensorCount===2;
  const offset=where==='black'?0:where==='white'?(dual?this.config.sensorGap+this.config.lineWidth/2+20:45):this.config.lineWidth/2;
  let sx=x+offset*Math.sin(heading), sy=y-offset*Math.cos(heading);
  this.sampleTrack=this.track;
  if(where!=='edge'&&dual){
   const patch=this.track.polygons?.[0];
   if(where==='black'&&patch){
    const center=patch.reduce(([u,v],[px,py])=>[u+px/patch.length,v+py/patch.length],[0,0]);
    sx=center[0]+Math.sin(heading)*this.config.sensorGap/2;
    sy=center[1]-Math.cos(heading)*this.config.sensorGap/2;
   }else if(where==='black'||[0,this.config.sensorGap].some(gap=>
       surfaceDistance(this.track,sx-gap*Math.sin(heading),sy+gap*Math.cos(heading),this.config.lineWidth)<3)){
    // A calibration tile provides a real uniform surface even on narrow courses.
    // The enlarged view and both optical readings use this same geometry.
    const tile=[[sx-90,sy-90],[sx+90,sy-90],[sx+90,sy+90],[sx-90,sy+90]];
    this.sampleTrack={paths:[],polygons:where==='black'?[tile]:[]};
   }
  }
  this.surface=where;
  this.yaw=heading;
  this.x=sx-this.config.sensorOffset*Math.cos(heading);
  this.y=sy-this.config.sensorOffset*Math.sin(heading);
  this.yawRate=0;
 }
 sensor(port=3){
  const offset=port===1?this.config.sensorGap:0;
  return {x:this.x+this.config.sensorOffset*Math.cos(this.yaw)-offset*Math.sin(this.yaw),
          y:this.y+this.config.sensorOffset*Math.sin(this.yaw)+offset*Math.cos(this.yaw)};
 }
 light(port=3){
  const p=this.sensor(port),d=surfaceDistance(this.sampleTrack,p.x,p.y,this.config.lineWidth);
  const fraction=clamp(.5+d/6,0,1);
  return clamp(this.config.black+(this.config.white-this.config.black)*fraction+(Math.random()-.5)*this.config.noise*2,0,100);
 }
 step(dt,dl,dr){let factor=Math.PI*this.config.wheelDiameter/360;let l=dl*factor*(1-this.config.slip),r=dr*factor*(1-this.config.slip*.6),angle=(r-l)/this.config.wheelbase,dist=(r+l)/2;this.x+=dist*Math.cos(this.yaw+angle/2);this.y+=dist*Math.sin(this.yaw+angle/2);this.yaw+=angle;this.yawRate=angle/dt*1000*180/Math.PI;this.time+=dt;this.distance+=Math.abs(dist);}
}
root.LabPhysics={Physics,nearest,clamp,surfaceDistance};
})(typeof self!=='undefined'?self:globalThis);
