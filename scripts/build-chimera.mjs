import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,copyFile,writeFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=resolve(process.argv.find(a=>a.startsWith('--source='))?.slice(9)||join(root,'../chimera-vocal-synth')),out=join(root,'dist/vendor/chimera');
await access(join(source,'Cargo.toml'));await mkdir(out,{recursive:true});
const result=await Bun.build({entrypoints:[join(root,'scripts/chimera/entry.ts')],outdir:out,naming:'engine.js',target:'browser',format:'esm',minify:true,plugins:[{name:'chimera-source',setup(build){build.onResolve({filter:/^chimera-source\//},args=>({path:join(source,args.path.replace('chimera-source/',''))}));build.onLoad({filter:/\/wasm\/chimera\.ts$/},async args=>({contents:(await readFile(args.path,'utf8')).replace('(await import("./chimera.wasm?url")).default','new URL("./chimera.wasm",import.meta.url).href'),loader:'ts'}));}}]});
if(!result.success){for(const log of result.logs)console.error(log);process.exit(1);}
for(const [from,to] of [['LICENSE','LICENSE.txt'],['public/data/cmudict.txt.gz','cmudict.txt.gz'],['public/data/CMUDICT-LICENSE.txt','CMUDICT-LICENSE.txt']])await copyFile(join(source,from),join(out,to));
const fontOutput=join(root,'dist/fonts/chimera');await mkdir(fontOutput,{recursive:true});
for(const name of ['AVHersheySimplexLight.otf','AVHersheySimplexMedium.otf','archivo-latin.woff2','archivo-latin-ext.woff2','AVHERSHEY-LICENSE.txt','OFL.txt'])await copyFile(join(source,'public/fonts',name),join(fontOutput,name));
await writeFile(join(fontOutput,'fonts.css'),(await readFile(join(source,'src/ui/styles.css'),'utf8')).split(':root {')[0].replaceAll('/fonts/','./'));
const version=spawnSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).stdout.trim();await writeFile(join(out,'version.json'),JSON.stringify({repository:'https://github.com/jamesondh/chimera-vocal-synth',commit:version}));
if(process.argv.includes('--js-only')){let ready=true;try{await access(join(out,'chimera.wasm'));}catch{ready=false;}console.log(ready?'Adaptador y dibujo actualizados; se conserva el motor WebAssembly existente.':'Adaptador y dibujo compilados. Falta chimera.wasm.');process.exit(0);}
const target=spawnSync('rustup',['target','add','wasm32-unknown-unknown'],{stdio:'inherit'});if(target.status!==0)process.exit(1);
const cargo=spawnSync('cargo',['build','--release','-p','chimera-wasm','--target','wasm32-unknown-unknown'],{cwd:source,stdio:'inherit'});if(cargo.status!==0)process.exit(1);
await copyFile(join(source,'target/wasm32-unknown-unknown/release/chimera_wasm.wasm'),join(out,'chimera.wasm'));console.log('Chimera listo para aula.');
