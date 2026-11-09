const CACHE='metalofono-aula-v39';
const FILES=['./','./index.html','./style.css','./diagnostico.html','./manifest.webmanifest','./icon.svg','./vendor/compas-samples.js','./vendor/compas-sampler.js','./licenses/MS-Basic-MIT.md','./licenses/appearance-palettes.md','./licenses/Big-Rusty-Drums-CC0.txt','./js/sample-player.js','./js/accompaniment.js','./js/app.js','./js/appearance.js','./js/style-lab.js','./js/shortcuts.js','./js/instruments.js','./js/guitar.js','./js/bass.js','./js/drums.js','./js/vocals.js','./js/model.js','./js/parser.js','./js/metronome.js','./js/scheduler.js','./js/renderer.js','./js/progress.js','./js/structure.js','./js/exporter.js','./js/tutorials.js','./js/video-intro.js','./js/zip-writer.js','./examples/himno.musicxml','./examples/himno.mid','./examples/himno.mxl'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('metalofono-aula-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// En desarrollo, usa el archivo actual; sin servidor conserva la copia offline.
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const local=['localhost','127.0.0.1','[::1]'].includes(self.location.hostname);
 if(local)e.respondWith(fetch(e.request,{cache:'no-store'}).then(response=>{
  if(response.ok){const copy=response.clone();e.waitUntil(caches.open(CACHE).then(cache=>cache.put(e.request,copy)));}
  return response;
 }).catch(()=>caches.match(e.request).then(cached=>cached||Response.error())));
 else e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));
});
