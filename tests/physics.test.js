import test from 'node:test';import assert from 'node:assert/strict';import '../public/physics.js';import {tracks} from '../src/tracks.js';
const {Physics,nearest}=globalThis.LabPhysics;
test('calibration samples black, white and edge',()=>{let p=new Physics(tracks[0]);p.place('black');assert.equal(p.light(),8);p.place('white');assert.equal(p.light(),65);p.place('edge');assert(Math.abs(p.light()-36.5)<.01);});
test('equal wheels drive straight by circumference',()=>{let p=new Physics(tracks[0]);let x=p.x,y=p.y,h=p.yaw;p.step(1000,360,360);assert(Math.abs(p.x-x-Math.PI*56)<.001);assert.equal(p.y,y);assert.equal(p.yaw,h);});
test('opposite wheels turn in place',()=>{let p=new Physics(tracks[0]),x=p.x,y=p.y;p.step(100,-30,30);assert.equal(p.x,x);assert.equal(p.y,y);assert(p.yawRate>0);});
test('every track has finite geometry and usable start',()=>{assert.equal(tracks.length,8);for(let t of tracks){let p=new Physics(t);assert(Number.isFinite(p.light()));assert(t.paths.every(path=>path.length>1));assert(t.paths.flat(2).every(Number.isFinite));}});
test('nearest point projects onto segment',()=>assert.equal(nearest([[[0,0],[100,0]]],50,10).distance,10));
