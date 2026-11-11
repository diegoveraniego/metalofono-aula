import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CHIMERA_BODIES,chimeraPhrases} from '../dist/js/chimera-score.js';
let available=true;try{await access(new URL('../dist/vendor/chimera/chimera.wasm',import.meta.url));}catch{available=false;}
test('motor real: male, female y child producen anatomías y sonidos distintos sin transponer La4',{skip:!available},async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>String(url).startsWith('file:')?new Response(await readFile(new URL(url))):originalFetch(url,options);
 try{
  const {loadChimera,renderChimera}=await import('../dist/vendor/chimera/engine.js'),api=await loadChimera(),syl=api.lyricsToSyllables('ah')[0],hashes=new Set(),scales=new Set();
  for(const body of Object.values(CHIMERA_BODIES)){
   const model=new api.VoiceModel(body,48000);scales.add(model.bodyParams.scale);model.dispose();
   const result=await renderChimera({phrases:[{start:0,notes:[{midi:69,beats:2,syl}]}],body,duration:1.4},()=>{});assert.ok(result.pcm.every(Number.isFinite));assert.ok(result.pcm.some(v=>Math.abs(v)>.01));hashes.add(createHash('sha256').update(new Uint8Array(result.pcm.buffer)).digest('hex'));
   if(body.female===1){const {renderChimeraFragments}=await import('../dist/js/chimera-fragments.js'),cache={get:async()=>null,put:async()=>true},fragmented=await renderChimeraFragments({phrases:[{start:0,notes:[{midi:69,beats:2,syl}]}],body,duration:1.4,engineVersion:'test'},renderChimera,()=>{},cache);assert.deepEqual(fragmented.pcm,result.pcm);}
   const held=result.snapshots.filter(s=>s.time>.35&&s.time<.8);assert.ok(held.length>0);for(const s of held)assert.ok(Math.abs(s.f0-440)<30,`La4 se desplazó a ${s.f0}`);
  }
  assert.equal(hashes.size,3);assert.equal(scales.size,3);
  const life={name:'Voz',notes:[{midi:69,start:0,duration:.5},{midi:71,start:.5,duration:1.5}],lyrics:[{start:0,duration:.5,text:'li',syllabic:'begin'},{start:1,duration:1,text:'fe',syllabic:'end'}]},phrases=chimeraPhrases(life,(a,b)=>(b-a)*.5,api.lyricsToSyllables),sung=phrases.flatMap(p=>p.notes);assert.deepEqual(sung.filter(n=>n.syl.text!=='-').map(n=>n.syl.text),['li','fe']);assert.equal(sung.at(-1).syl.melisma,true);
  const plan=api.planSong(phrases[0].notes,{body:CHIMERA_BODIES.female,bpm:120,t0:.3,vibrato:25});assert.ok(plan.segments.findLast(s=>s.ipa==='f').t0>1);
  const tumbling={name:'Voz',notes:[{midi:60,start:0,duration:1},{midi:62,start:1,duration:1}],lyrics:[{start:0,duration:1,text:'tum',syllabic:'begin'},{start:1,duration:1,text:'bling',syllabic:'end'}]};assert.equal(api.lyricsToSyllables('tumbling').length,3);assert.deepEqual(chimeraPhrases(tumbling,(a,b)=>(b-a)*.5,api.lyricsToSyllables)[0].notes.map(n=>n.syl.text),['tum','bling']);
 }finally{globalThis.fetch=originalFetch;}
});
