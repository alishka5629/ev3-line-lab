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
test('lab photo branches and broad patch are black and have no closing shortcut',()=>{
 const track=tracks.find(t=>t.id==='complex');
 const distanceAt=(x,y)=>globalThis.LabPhysics.surfaceDistance(track,(x-363)*1.8,(418-y)*1.8,18);
 for(const [x,y]of [[230,100],[290,120],[500,52],[685,190],[300,618],[531,630],[480,550]])assert(distanceAt(x,y)<0);
 assert(distanceAt(400,150)>0);
 assert(distanceAt(350,550)>0);
 assert.equal(track.paths.length,7);
 assert.equal(track.polygons.length,1);
});
