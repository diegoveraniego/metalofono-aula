import {readdir,readFile} from 'node:fs/promises';
const html=await readFile('dist/index.html','utf8'),app=await readFile('dist/js/app.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw Error('IDs HTML duplicados');
for(const m of app.matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(m[1]))throw Error('Falta elemento '+m[1]);
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(m[1]==='./')continue;await readFile('dist/'+m[1]);}
for(const f of await readdir('dist/js'))await import('../dist/js/'+f).catch(e=>{if(f!=='app.js'||!['document is not defined','window is not defined'].includes(e.message))throw e;});
console.log('Módulos, IDs y recursos locales: OK');
