import test from 'node:test';import assert from 'node:assert/strict';import '../public/physics.js';import {tracks} from '../src/tracks.js';
const {Physics,nearest}=globalThis.LabPhysics;
test('calibration samples black, white and edge',()=>{let p=new Physics(tracks[0]);p.place('black');assert.equal(p.light(),8);p.place('white');assert.equal(p.light(),65);p.place('edge');assert(Math.abs(p.light()-36.5)<.01);});
test('equal wheels drive straight by circumference',()=>{let p=new Physics(tracks[0]);let x=p.x,y=p.y,h=p.yaw;p.step(1000,360,360);assert(Math.abs(p.x-x-Math.PI*56)<.001);assert.equal(p.y,y);assert.equal(p.yaw,h);});
test('opposite wheels turn in place',()=>{let p=new Physics(tracks[0]),x=p.x,y=p.y;p.step(100,-30,30);assert.equal(p.x,x);assert.equal(p.y,y);assert(p.yawRate>0);});
test('every track has finite geometry and usable start',()=>{assert.equal(tracks.length,8);for(let t of tracks){let p=new Physics(t);assert(Number.isFinite(p.light()));assert(t.paths.every(path=>path.length>1));assert(t.paths.flat(2).every(Number.isFinite));}});
test('nearest point projects onto segment',()=>assert.equal(nearest([[[0,0],[100,0]]],50,10).distance,10));
test('filled black patch participates in sensor readings, including its boundary',()=>{
 const track={paths:[[[0,-100],[100,-100]]],polygons:[[[0,0],[50,0],[50,100],[0,100]]]};
 const p=new Physics(track);p.yaw=0;
 const lightAt=(x,y)=>{p.x=x-p.config.sensorOffset;p.y=y;return p.light();};
 assert.equal(lightAt(25,50),8);
 assert.equal(lightAt(70,50),65);
 assert.equal(lightAt(50,50),36.5);
 // Existing strokes must still be black when polygons are present.
 assert.equal(lightAt(50,-100),8);
});
test('Lab Bonus spawns on the upper straight from the right, facing left',()=>{
 const track=tracks.find(t=>t.id==='complex');
 const [right,left]=track.paths[0];
 const world=new Physics(track);
 assert(right[0]>left[0]&&right[1]===left[1]);
 assert.equal(world.yaw,Math.PI);
 for(const [surface,expected] of [['black',8],['white',65],['edge',36.5]]){
  world.place(surface);
  const sensor=world.sensor();
  assert(Math.abs(sensor.x-(right[0]-10))<.01);
  assert(Math.abs(world.light()-expected)<.01);
 }
 assert(Math.abs(world.sensor().y-(right[1]+world.config.lineWidth/2))<.01);
 assert(world.x>world.sensor().x);
});
test('Lab Bonus preserves its junctions, straight runs, and solid pad',()=>{
 const track=tracks.find(t=>t.id==='complex');
 const distanceAt=(x,y)=>globalThis.LabPhysics.surfaceDistance(track,(x+14)*2.5,(y-56)*2.5,18);
 for(const [x,y] of [[-212,264],[-150,245],[-19,-127],[2,-127],[100,77],[184,180],[153,-137],[120,-62],[115,-115]]){
  assert(distanceAt(x,y)<0);
 }
 assert(distanceAt(110,190)>0);
 assert(distanceAt(20,-62)>0);
 const diagonals=track.paths.flatMap(path=>path.slice(1).filter(([x,y],i)=>x!==path[i][0]&&y!==path[i][1]));
 assert.equal(diagonals.length,1);
 assert.equal(track.polygons.length,1);
});

test('dual sensor calibration uses two spots on the same physical surface',()=>{
 const p=new Physics(tracks.find(t=>t.id==='complex'),{sensorCount:2,sensorGap:24});
 p.place('black');assert.equal(p.light(3),8);assert.equal(p.light(1),8);
 p.place('white');assert.equal(p.light(3),65);assert.equal(p.light(1),65);
 p.place('edge');
 assert.equal(p.light(3),36.5);
 const main=p.sensor(3),left=p.sensor(1);
 assert(Math.abs(main.x-left.x)<.01);
 assert(Math.abs(main.y-left.y-24)<.01);
 assert.notEqual(p.light(3),p.light(1));
});
