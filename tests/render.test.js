import test from 'node:test';import assert from 'node:assert/strict';import {LabScene2D} from '../src/scene2d.js';
test('Canvas batches updates into one frame and preserves its backing buffer between frames',()=>{
 const old={document:globalThis.document,ResizeObserver:globalThis.ResizeObserver,requestAnimationFrame:globalThis.requestAnimationFrame,devicePixelRatio:globalThis.devicePixelRatio};
 const frames=[];let resizes=0,w=0,h=0;const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});const canvas={addEventListener(){},style:{},getContext:()=>ctx,get width(){return w},set width(v){w=v;resizes++},get height(){return h},set height(v){h=v;resizes++}};
 Object.assign(globalThis,{document:{createElement:()=>canvas},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>frames.push(fn),devicePixelRatio:1});
 try{const scene=new LabScene2D({clientWidth:700,clientHeight:500,appendChild(){}},()=>{});scene.setTrack({paths:[[[0,0],[100,0]]]});scene.update({x:10,y:0,yaw:0});scene.lcd(null);assert.equal(frames.length,1);frames.shift()();assert.equal(resizes,2);for(let i=0;i<30;i++)scene.update({x:10+i,y:0,yaw:0});assert.equal(frames.length,1);frames.shift()();assert.equal(resizes,2);assert.equal(w,700);assert.equal(h,500);}finally{Object.assign(globalThis,old);}
});

import {fitTrack,trackBounds} from '../src/track-view.js';
import {tracks} from '../src/tracks.js';
test('every track fits portrait, laptop and wide simulation viewports',()=>{
 for(const track of tracks){
  const bounds=trackBounds(track);
  for(const [width,height] of [[294,265],[470,300],[695,460],[1160,710]]){
   const scale=fitTrack(bounds,width,height);
   for(const [x,y] of track.paths.concat(track.polygons??[]).flat()){
    assert(Math.abs((x-bounds.x)*scale)<width/2,track.id);
    assert(Math.abs((y-bounds.y)*scale)<height/2,track.id);
   }
  }
 }
});
