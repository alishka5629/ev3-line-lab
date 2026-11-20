import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const version=createHash('sha256').update(readFileSync('public/compiler.js')).update(readFileSync('public/autopilot.js')).digest('hex').slice(0,12);
export default defineConfig({base:'./',define:{__RUNTIME_VERSION__:JSON.stringify(version)},build:{chunkSizeWarningLimit:900,rollupOptions:{input:{simulator:"index.html",codes:"codes/index.html"}}}});
