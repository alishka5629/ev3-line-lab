import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('LCD streaming sends changed typed pixels only, preserves physics ticks and refreshes after restart',()=>{
 let now=1000,steps=0;const messages=[],pixels=new Uint32Array(178*128);
 const board={getMotors:()=>[],getInputNodes:()=>[],screenState:{screen:pixels,width:178,height:128}};
 const c=vm.createContext({Uint32Array,Math,performance:{now:()=>now},parent:{postMessage:m=>messages.push(m)},pxsim:{EV3Board:function(){},BaseBoard:function(){},control:{__log(){}}},document:{getElementById:()=>({})},window:{addEventListener(){}},setInterval,clearInterval,setTimeout,LabSpeaker:{stop(){}},board,worldMock:{step(){steps++},light:()=>40,x:0,y:0,yaw:0,time:0,distance:0}});
 vm.runInContext(fs.readFileSync(new URL('../public/runtime.js',import.meta.url),'utf8'),c);
 vm.runInContext('rt={dead:false,board};world=worldMock;tick()',c);
 let states=messages.filter(m=>m.type==='state');assert(states.at(-1).screen instanceof Uint32Array);const first=states.at(-1).screen;assert.equal(first.length,pixels.length);
 now+=150;vm.runInContext('tick()',c);states=messages.filter(m=>m.type==='state');assert.equal(states.at(-1).screen,null);
 pixels[10]=42;now+=150;vm.runInContext('tick()',c);states=messages.filter(m=>m.type==='state');assert.equal(states.at(-1).screen[10],42);assert.equal(first[10],0);assert.equal(steps,3);
 vm.runInContext('rt.kill=()=>{};stop();rt={dead:false,board};world=worldMock;',c);now+=150;vm.runInContext('tick()',c);assert(messages.filter(m=>m.type==='state').at(-1).screen);
});
