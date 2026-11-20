import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sections,sourceLines} from '../src/code-sections.js';

test('walkthrough excerpts match the source without changing any code',()=>{
  const source=readFileSync('public/programs/smooth-square.ts','utf8');
  const checks=['const KP = 0.14','function readLight()','waitEnter("On EDGE','let wantedTurn','drive(speed - turn','function findLine','run()'];
  sections.forEach((section,i)=>{
    const lines=sourceLines(source,section);
    if(section.to)assert.equal(lines.length,section.to-section.from+1);
    assert(lines.join('\n').includes(checks[i]));
  });
  assert.equal(sourceLines(source,sections.at(-1)).join('\n')+'\n',source);
});

test('all ten palettes keep labels and code readable',()=>{
  const css=readFileSync('src/themes.css','utf8');
  const palettes=[...css.matchAll(/\[data-theme="([^"]+)"\]\s*\{([^}]+)\}/g)];
  assert.equal(palettes.length,10);
  const lum=hex=>hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255)
    .map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4)
    .reduce((total,c,i)=>total+c*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{
    const values=[lum(a),lum(b)].sort((x,y)=>y-x);
    return (values[0]+.05)/(values[1]+.05);
  };
  for(const [,theme,block] of palettes){
    const values=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map(([,k,v])=>[k,v]));
    for(const [fg,bg] of [['ink','panel'],['muted','panel'],['accent-ink','accent'],...['code-ink','syntax-note','syntax-key','syntax-string','syntax-number'].map(key=>[key,'code-bg'])])
      assert(contrast(values[fg],values[bg])>=4.5,`${theme}: ${fg} on ${bg}`);
  }
});
