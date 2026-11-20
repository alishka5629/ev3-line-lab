(function(root){
// Instrument simulator libraries to expose real EV3 prompts and button waits.
function instrumentTarget(target){const copy=JSON.parse(JSON.stringify(target));const key='(this == brick.buttonUp ? 1 : this == brick.buttonEnter ? 2 : this == brick.buttonDown ? 4 : this == brick.buttonRight ? 8 : this == brick.buttonLeft ? 16 : 32)';
 for(const files of Object.values(copy.bundledpkgs))for(const name of Object.keys(files)){if(!name.endsWith('.ts'))continue;let s=files[name];s=s.replace(/function showString\(text: string, line: number\)\s*\{/,'$&\n console.log("__EV3LAB_PROMPT|" + line + "|" + text);');if(name!=='buttons.ts'){files[name]=s;continue;}s=s.replace(/\b(?:isPressed|wasPressed)\(\)\s*\{/g,'$&\n console.log("__EV3LAB_POLL|" + '+key+');');s=s.replace(/\bpauseUntil\(ev: ButtonEvent\)\s*\{/,'$&\n console.log("__EV3LAB_WAIT|" + '+key+');');s=s.replace(/\bonEvent\(ev: ButtonEvent, body: \(\) => void\)\s*\{/,'$&\n console.log("__EV3LAB_EVENT|" + '+key+');');files[name]=s;}return copy;}
function surface(text){const t=text.toLowerCase();if(/saved|recorded|complete|сохран|запис|^(black|white|dark|bright)\s*[:=]?\s*-?\d/.test(t))return null;const edge=/\bedge\b|boundar|border|кра[йюя]|границ/.test(t),white=/\bwhite\b|\bfloor\b|background|bright|светл|бел|фон/.test(t),black=/\bblack\b|\bdark\b|on (?:the )?line\b|ч[её]рн|на лини/.test(t);return Number(edge)+Number(white)+Number(black)===1?(edge?'edge':white?'white':'black'):null;}
class Pilot{
 constructor(now=0, sensorCount=1){this.sensorCount=sensorCount;this.dualPrompt=false;this.began=now;this.lines={};this.polls=new Map();this.events=new Set();this.stage=0;this.lastAction=now;this.nextAt=now+1100;this.pending=null;this.done=false;this.message='Reading the program’s calibration prompts…';}
 signal(str,now){let parts=str.split('|'),type=parts.shift();if(type==='__EV3LAB_PROMPT'){let line=parts.shift(),text=parts.join('|');this.lines[line]={text,at:now};if(text.includes("RIGHT+ENTER: 2 eyes"))this.dualPrompt=true;}else if(type==='__EV3LAB_POLL'||type==='__EV3LAB_WAIT')this.polls.set(+parts[0],now);else if(type==='__EV3LAB_EVENT')this.events.add(+parts[0]);}
 tick(now,moving){if(this.done)return null;if(now-this.began>22000){this.done=true;return {type:'blocked',message:'Auto setup could not identify the remaining startup steps. Read the EV3 screen and use Laboratory mode for this program.'};}
 if(this.pending){if(now<this.pending.at)return null;const action=this.pending;this.pending=null;this.stage++;this.lastAction=now;this.nextAt=now+1100;const tap={type:'tap',key:action.key,surface:action.surface};if(this.sensorCount===2&&this.dualPrompt&&action.surface==='black'&&action.key===2)tap.hold=[3];return tap;}
 if(now<this.nextAt)return null;
 const keys=[...this.polls].filter(([k,t])=>now-t<450&&![16,32].includes(k)).map(([k])=>k);const available=[...new Set([...keys,...this.events])].filter(k=>![16,32].includes(k));
 const prompts=Object.values(this.lines).filter(p=>p.at>=this.lastAction-100).map(p=>({...p,surface:surface(p.text)})).filter(p=>p.surface).sort((a,b)=>b.at-a.at);
 let which=prompts[0]?.surface;
 if(moving&&!which){this.done=true;return {type:'release',message:'Program running'};}
 if(!which&&this.stage>=3){this.done=true;return {type:'release',message:'Program running'};}
 if(!available.length)return null;
 if(!which)which=['black','white','edge'][this.stage];
 // An unambiguous active wait wins over the conventional UP/DOWN mapping.
 let key=keys.length===1?keys[0]:available.length===1?available[0]:(available.includes(which==='black'?1:which==='white'?4:2)?(which==='black'?1:which==='white'?4:2):keys[0]||available[0]);
 if(!which)return null;this.pending={key,surface:which,at:now+250};this.message=which==='black'?'Calibrating on black':which==='white'?'Calibrating on white':'Placing sensor on the right edge';return {type:'place',surface:which,message:this.message};
 }
}
root.LabAuto={instrumentTarget,surface,Pilot};
})(typeof self!=='undefined'?self:globalThis);
