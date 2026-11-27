import './style.css';
import './codes.css';
import {initThemePicker} from './themes.js';
import {sections as smoothSections,complexSections,sourceLines} from './code-sections.js';

initThemePicker();

const sections=document.body.dataset.program==='complex'?complexSections:smoothSections;

const $=id=>document.getElementById(id);
const keywords=new Set(['const','let','function','return','if','else','while','for','true','false','number','boolean','string']);
const tokenPattern=/\/\/.*|"(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$]*/g;
let source;
let index=0;
let copyTimer;
const links=sections.map(section=>{
  const link=document.createElement('a');
  link.href='#'+section.id;
  link.textContent=section.title;
  $('code-chapters').append(link);
  return link;
});

function highlight(line){
  const fragment=document.createDocumentFragment();
  let offset=0;
  for(const token of line.matchAll(tokenPattern)){
    fragment.append(line.slice(offset,token.index));
    const text=token[0];
    const type=text.startsWith('//')?'comment':text.startsWith('"')?'string':
      /^\d/.test(text)?'number':keywords.has(text)?'keyword':null;
    if(type){
      const span=document.createElement('span');
      span.className='syntax-'+type;
      span.textContent=text;
      fragment.append(span);
    }else fragment.append(text);
    offset=token.index+text.length;
    if(type==='comment')break;
  }
  fragment.append(line.slice(offset));
  return fragment;
}
function render(){
  const section=sections[index];
  clearTimeout(copyTimer);
  $('copy-code').textContent='Copy code';
  $('section-title').textContent=section.title;
  $('section-description').textContent=section.description;
  links.forEach((link,i)=>{
    if(i===index)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
  });
  $('prev-code').disabled=index===0;
  $('next-code').disabled=index===sections.length-1;
  $('section-count').textContent=`${index+1} / ${sections.length}`;
  if(!source)return;
  const lines=sourceLines(source,section);
  const block=document.createDocumentFragment();
  lines.forEach((line,i)=>{
    const row=document.createElement('span');
    row.className='source-line';
    row.dataset.line=section.from+i;
    row.append(highlight(line));
    block.append(row);
    if(i<lines.length-1)block.append('\n');
  });
  $('source-code').replaceChildren(block);
  $('source-scroll').scrollTop=0;
  $('source-scroll').scrollLeft=0;
  $('source-range').textContent=`Lines ${section.from}–${section.from+lines.length-1}`;
}
function fromHash(){
  index=Math.max(0,sections.findIndex(section=>'#'+section.id===location.hash));
  render();
}
function go(step){
  const next=sections[index+step];
  if(next)location.hash=next.id;
}
window.addEventListener('hashchange',fromHash);
$('prev-code').onclick=()=>go(-1);
$('next-code').onclick=()=>go(1);
$('focus-code').onclick=()=>{
  const focused=document.body.toggleAttribute('data-code-focus');
  $('focus-code').setAttribute('aria-pressed',String(focused));
  $('focus-code').textContent=focused?'Exit focus':'Focus mode';
  if(focused)window.scrollTo(0,0);
};
window.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||
     event.target.closest('input,textarea,select,pre,dialog,[contenteditable]'))return;
  if(event.key==='Escape'&&document.body.hasAttribute('data-code-focus'))$('focus-code').click();
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();go(event.key==='ArrowLeft'?-1:1);
  }
});
$('copy-code').onclick=async()=>{
  const section=sections[index];
  const text=section.id==='full'?source:sourceLines(source,section).join('\n');
  try{await navigator.clipboard.writeText(text);$('copy-code').textContent='Copied';}
  catch{$('copy-code').textContent='Select to copy';}
  clearTimeout(copyTimer);
  copyTimer=setTimeout(()=>$('copy-code').textContent='Copy code',1800);
};
fromHash();
fetch(document.body.dataset.source).then(response=>{
  if(!response.ok)throw Error('source');
  return response.text();
}).then(file=>{
  source=file;$('copy-code').disabled=false;render();
}).catch(()=>$('source-code').textContent='Could not load the program. Reload to try again.');
