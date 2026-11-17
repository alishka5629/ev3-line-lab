self.window=self;
importScripts('vendor/typescript.js','vendor/pxtlib.js','vendor/pxtcompiler.js','vendor/lzma.js','autopilot.js');
let baseTarget;const ready=fetch('vendor/target.json').then(r=>{if(!r.ok)throw Error('Could not load MakeCode');return r.json()}).then(t=>{baseTarget=t;pxt.setAppTarget(t);postMessage({type:'ready'});});
onmessage=async e=>{let {id,kind,code,bytes,automatic}=e.data;try{await ready;
 if(kind==='extract'){if(bytes.byteLength>16*1024*1024)throw Error('Maximum UF2 size: 16 MB');let result=await pxt.cpp.unpackSourceFromHexAsync(new Uint8Array(bytes));if(!result?.source)throw Error('No embedded MakeCode source. Export a project with source code.');let files=JSON.parse(result.source);if(!files['main.ts'])throw Error('main.ts not found. Import a MakeCode EV3 project.');let conf=JSON.parse(files['pxt.json']||'{}');if(conf.dependencies&&!conf.dependencies.ev3)throw Error('This project does not target EV3.');postMessage({id,type:'extracted',code:files['main.ts'],files});return;}
 pxt.setAppTarget(automatic?LabAuto.instrumentTarget(baseTarget):JSON.parse(JSON.stringify(baseTarget)));
 let files={'main.ts':code,'pxt.json':JSON.stringify({name:'EV3 Line Lab',dependencies:{ev3:'*'},files:['main.ts']})};
 let result=await pxt.simpleCompileAsync(files,{native:false});if(!result.success)throw Error(result.errors||'Compilation error');postMessage({id,type:'compiled',binary:result.outfiles['binary.js']});
 }catch(err){postMessage({id,type:'error',message:err.message||String(err)});}};
