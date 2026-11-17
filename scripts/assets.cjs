const fs=require('fs'),path=require('path'); const root=path.dirname(require.resolve('pxt-ev3/package.json')); const core=path.dirname(require.resolve('pxt-core/package.json',{paths:[root]}));fs.mkdirSync('public/vendor',{recursive:true});
for(const n of ['typescript','pxtlib','pxtcompiler','pxtsim'])fs.copyFileSync(`${core}/built/web/${n}.js`,`public/vendor/${n}.js`);
for(const n of ['common-sim.js','sim.js','target.json'])fs.copyFileSync(`${root}/built/${n}`,`public/vendor/${n}`);
fs.copyFileSync(require.resolve('lzma/src/lzma_worker-min.js'),'public/vendor/lzma.js');
for (const [label,file] of [['pxt-ev3',`${root}/LICENSE`],['pxt-core',`${core}/LICENSE`],['three','node_modules/three/LICENSE'],['lzma','node_modules/lzma/LICENSE']]) { if(fs.existsSync(file))fs.copyFileSync(file,`public/vendor/LICENSE-${label}.txt`); }
