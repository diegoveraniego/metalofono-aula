const CACHE='metalofono-aula-v5';
const FILES=['./','./index.html','./style.css','./diagnostico.html','./manifest.webmanifest','./icon.svg','./js/accompaniment.js','./js/app.js','./js/model.js','./js/parser.js','./js/metronome.js','./js/scheduler.js','./js/renderer.js','./js/progress.js','./js/structure.js','./js/exporter.js','./examples/himno.musicxml','./examples/himno.mid','./examples/himno.mxl'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('metalofono-aula-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===self.location.origin)e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
