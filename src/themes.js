import './themes.css';

export const themes = [
  ['light','Studio'],
  ['dark','Evergreen'],
  ['paper','Paper'],
  ['dune','Dune'],
  ['frost','Frost'],
  ['ink','Midnight'],
  ['lavender','Lavender'],
  ['violet','After Hours'],
  ['ember','Ember'],
  ['ocean','Deep Sea'],
];

export function initThemePicker(onChange=()=>{}){
  const root=document.documentElement;
  const name=document.getElementById('theme-name');
  const button=document.getElementById('open-themes');
  const dialog=document.createElement('dialog');
  dialog.className='theme-dialog';
  dialog.setAttribute('aria-labelledby','theme-title');
  dialog.innerHTML='<div class="dialog-head"><h2 id="theme-title">Colour theme</h2><button type="button" class="close" aria-label="Close themes">×</button></div><div class="theme-grid"></div>';
  document.body.append(dialog);
  const choices=themes.map(([id,label])=>{
    const option=document.createElement('button');
    option.type='button';
    option.className='theme-option';
    const preview=document.createElement('span');
    preview.dataset.theme=id;
    preview.setAttribute('aria-hidden','true');
    preview.className='theme-preview';
    const text=document.createElement('span');
    text.className='theme-option-name';
    text.textContent=label;
    option.append(preview,text);
    option.onclick=()=>{apply(id,true);dialog.close();button.focus();};
    dialog.querySelector('.theme-grid').append(option);
    return option;
  });

  function apply(id,save){
    const selected=Math.max(0,themes.findIndex(theme=>theme[0]===id));
    root.dataset.theme=themes[selected][0];
    name.textContent=themes[selected][1];
    button.setAttribute('aria-label','Colour theme: '+name.textContent);
    choices.forEach((option,i)=>option.setAttribute('aria-pressed',String(i===selected)));
    const palette=getComputedStyle(root);
    document.querySelector('meta[name="theme-color"]').content=palette.getPropertyValue('--page').trim();
    if(save){try{localStorage.setItem('ev3-line-lab-theme',root.dataset.theme);}catch{}}
    onChange({
      scene:palette.getPropertyValue('--scene').trim(),
      floor:palette.getPropertyValue('--floor').trim(),
      grid:palette.getPropertyValue('--grid').trim(),
      track:palette.getPropertyValue('--rail').trim(),
      trace:palette.getPropertyValue('--trace').trim(),
    });
  }

  button.onclick=()=>dialog.showModal();
  dialog.querySelector('.close').onclick=()=>dialog.close();
  window.addEventListener('storage',event=>{
    if(event.key==='ev3-line-lab-theme')apply(event.newValue,false);
  });
  window.addEventListener('pageshow',()=>{
    try{
      const saved=localStorage.getItem('ev3-line-lab-theme');
      if(saved&&saved!==root.dataset.theme)apply(saved,false);
    }catch{}
  });
  apply(root.dataset.theme,false);
}
