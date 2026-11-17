self.window=self;
importScripts('vendor/typescript.js','vendor/pxtlib.js','vendor/pxtcompiler.js','vendor/lzma.js');
const ready=fetch('vendor/target.json').then(r=>{if(!r.ok)throw Error('Не удалось загрузить MakeCode');return r.json()}).then(t=>{pxt.setAppTarget(t);postMessage({type:'ready'});});
onmessage=async e=>{let {id,kind,code,bytes}=e.data;try{await ready;
 if(kind==='extract'){if(bytes.byteLength>16*1024*1024)throw Error('Максимальный размер UF2 — 16 МБ');let result=await pxt.cpp.unpackSourceFromHexAsync(new Uint8Array(bytes));if(!result?.source)throw Error('В файле нет исходников MakeCode. Экспортируй проект с исходным кодом.');let files=JSON.parse(result.source);if(!files['main.ts'])throw Error('Не найден main.ts. Нужен проект MakeCode EV3.');let conf=JSON.parse(files['pxt.json']||'{}');if(conf.dependencies&&!conf.dependencies.ev3)throw Error('Этот проект создан не для EV3.');postMessage({id,type:'extracted',code:files['main.ts'],files});return;}
 let files={'main.ts':code,'pxt.json':JSON.stringify({name:'EV3 Line Lab',dependencies:{ev3:'*'},files:['main.ts']})};
 let result=await pxt.simpleCompileAsync(files,{native:false});if(!result.success)throw Error(result.errors||'Ошибка компиляции');postMessage({id,type:'compiled',binary:result.outfiles['binary.js']});
 }catch(err){postMessage({id,type:'error',message:err.message||String(err)});}};
