(function(root){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function nearest(paths,x,y){let best={distance:Infinity,x:0,y:0,angle:0};for(const pts of paths)for(let i=1;i<pts.length;i++){let [ax,ay]=pts[i-1],[bx,by]=pts[i],dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy;if(!l)continue;let t=clamp(((x-ax)*dx+(y-ay)*dy)/l,0,1),xx=ax+t*dx,yy=ay+t*dy,d=Math.hypot(x-xx,y-yy);if(d<best.distance)best={distance:d,x:xx,y:yy,angle:Math.atan2(dy,dx)};}return best;}
class Physics {
 constructor(track,config={}){this.track=track;this.config={wheelDiameter:56,wheelbase:120,sensorOffset:45,lineWidth:18,black:8,white:65,noise:0,slip:0,...config};this.time=0;this.distance=0;this.yawRate=0;this.place('edge');}
 place(where){let a=this.track.paths[0][0],b=this.track.paths[0][1],h=Math.atan2(b[1]-a[1],b[0]-a[0]);let off=where==='black'?0:where==='white'?45:this.config.lineWidth/2;this.yaw=h;this.x=a[0]+off*Math.sin(h)-this.config.sensorOffset*Math.cos(h);this.y=a[1]-off*Math.cos(h)-this.config.sensorOffset*Math.sin(h);this.yawRate=0;}
 sensor(){return {x:this.x+this.config.sensorOffset*Math.cos(this.yaw),y:this.y+this.config.sensorOffset*Math.sin(this.yaw)};}
 light(){let p=this.sensor(),d=nearest(this.track.paths,p.x,p.y).distance;let f=clamp(.5+(d-this.config.lineWidth/2)/6,0,1);return clamp(this.config.black+(this.config.white-this.config.black)*f+(Math.random()-.5)*this.config.noise*2,0,100);}
 step(dt,dl,dr){let factor=Math.PI*this.config.wheelDiameter/360;let l=dl*factor*(1-this.config.slip),r=dr*factor*(1-this.config.slip*.6),angle=(r-l)/this.config.wheelbase,dist=(r+l)/2;this.x+=dist*Math.cos(this.yaw+angle/2);this.y+=dist*Math.sin(this.yaw+angle/2);this.yaw+=angle;this.yawRate=angle/dt*1000*180/Math.PI;this.time+=dt;this.distance+=Math.abs(dist);}
}
root.LabPhysics={Physics,nearest,clamp};
})(typeof self!=='undefined'?self:globalThis);
