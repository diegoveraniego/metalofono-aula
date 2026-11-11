import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chimeraCacheKey,chimeraRenderTargets} from '../dist/js/chimera-cache.js';
import {ChimeraManager} from '../dist/js/chimera.js';
const parts=[{id:'s',name:'Soprano',lyrics:[{start:0,duration:1,text:'ah'}],notes:[{midi:60,start:0,duration:1}]},{id:'a',name:'Alto',lyrics:[{start:0,duration:1,text:'oh'}],notes:[{midi:64,start:0,duration:1}]}];
function fixture(){const values=new Map(),calls=[];const cache={lastError:'',async get(key){return values.get(key);},async put(key,value){values.set(key,structuredClone(value));return true;},async clear(){values.clear();}},api={VoiceModel:class{dispose(){}},AnatomyRenderer:class{}},render=async data=>{calls.push(data.part.id);return {pcm:new Float32Array([.1,.2]),sampleRate:48000,snapshots:[],segments:[]};},options={cache,load:async()=>api,render,engineVersion:'engine-1'},clock={part:{id:'clock-s',tempos:[{start:0,bpm:120}]},speed:1,manualBpm:false,bpm:120,end:4,seconds:(a,b)=>(b-a)*.5},context={createBuffer:()=>({copyToChannel(){}})};return {values,calls,cache,options,clock,context};}
test('por defecto procesa todas; individual prepara solo la seleccionada y la vista general pide todas',async()=>{
 assert.deepEqual([...chimeraRenderTargets(parts,'s')],['s','a']);assert.deepEqual([...chimeraRenderTargets(parts,'s','individual')],['s']);assert.deepEqual([...chimeraRenderTargets(parts,'s','individual',true)],['s','a']);
 const f=fixture(),m=new ChimeraManager(f.options);m.processing='individual';await m.prepare(parts,f.clock,f.context,()=>{},{selectedId:'s'});assert.deepEqual(f.calls,['s']);assert.equal(m.records.size,1);
 await m.prepare(parts,f.clock,f.context,()=>{},{selectedId:'a'});assert.deepEqual(f.calls,['s','a']);assert.ok(m.records.get('s').active);assert.ok(m.records.get('a').active);
});
test('recupera voces de almacenamiento tras recrear el manager y cambiar la parte que marca el reloj',async()=>{
 const f=fixture(),m=new ChimeraManager(f.options);await m.prepare(parts,f.clock,f.context,()=>{},{});assert.deepEqual(f.calls,['s','a']);assert.equal(f.values.size,2);
 const restored=new ChimeraManager(f.options);restored.processing='individual';const result=await restored.prepare(parts,{...f.clock,part:{...f.clock.part,id:'clock-a',name:'Alto'}},f.context,()=>{},{selectedId:'a'});assert.deepEqual(result,{rendered:0,memory:0,disk:2});assert.deepEqual(f.calls,['s','a']);assert.equal(restored.records.size,2);
});
test('cambiar un modelo solo regenera esa voz; la caché distingue tempo, notas, letra y versión del motor',async()=>{
 const f=fixture(),m=new ChimeraManager(f.options);await m.prepare(parts,f.clock,f.context,()=>{});m.profiles.s='child';await m.prepare(parts,f.clock,f.context,()=>{});assert.deepEqual(f.calls,['s','a','s']);
 const key=await chimeraCacheKey(parts[0],'female',f.clock,3,'v1');
 for(const variant of [await chimeraCacheKey(parts[0],'child',f.clock,3,'v1'),await chimeraCacheKey(parts[0],'female',{...f.clock,speed:.5},3,'v1'),await chimeraCacheKey({...parts[0],lyrics:[{text:'oh'}]},'female',f.clock,3,'v1'),await chimeraCacheKey(parts[0],'female',f.clock,3,'v2')])assert.notEqual(variant,key);
});
test('cancelar no guarda audio parcial y borrar caché no elimina perfiles',async()=>{
 const f=fixture();let resolve;const manager=new ChimeraManager({...f.options,render:()=>new Promise(done=>{resolve=done;})});manager.profiles.s='child';
 const preparing=manager.prepare([parts[0]],f.clock,f.context,()=>{});while(!resolve)await new Promise(done=>setTimeout(done,0));manager.cancelPreparation();resolve({pcm:new Float32Array([1]),sampleRate:48000,snapshots:[]});await assert.rejects(preparing,/cancelada/);assert.equal(f.values.size,0);assert.equal(manager.preparing,false);
 await manager.clearCache();assert.equal(manager.profiles.s,'child');
});

test('cambiar male/female/child actualiza modelo visual y timbre; el cabello no regenera audio',async()=>{
 const f=fixture(),bodies=[],api={VoiceModel:class{constructor(body){this.body=body;bodies.push(body);}dispose(){}},AnatomyRenderer:class{}},m=new ChimeraManager({...f.options,load:async()=>api});
 m.setProfile(parts[0],'male');await m.prepare([parts[0]],f.clock,f.context,()=>{});assert.deepEqual(m.records.get('s').model.body,{female:0,child:0});const initial=f.calls.length;
 m.setProfile(parts[0],'female');assert.equal(m.records.get('s').body,'female');assert.equal(m.records.get('s').active,false);assert.equal(m.records.get('s').buffer,null);assert.deepEqual(m.records.get('s').model.body,{female:1,child:0});await m.prepare([parts[0]],f.clock,f.context,()=>{});assert.equal(f.calls.length,initial+1);
 m.setProfile(parts[0],'child');assert.deepEqual(m.records.get('s').model.body,{female:0,child:1});await m.prepare([parts[0]],f.clock,f.context,()=>{});assert.equal(f.calls.length,initial+2);
 m.appearance.s='long';await m.prepare([parts[0]],f.clock,f.context,()=>{});assert.equal(f.calls.length,initial+2);assert.throws(()=>m.setProfile(parts[0],'invalid'),/no válido/);
 m.setProfile(parts[0],'male');await m.prepare([parts[0]],f.clock,f.context,()=>{});assert.equal(f.calls.length,initial+2);assert.ok(bodies.length>=3);
});

test('editar sílabas invalida solo la voz editada y conserva las correcciones al borrar audio',async()=>{
 const f=fixture(),m=new ChimeraManager(f.options);await m.prepare(parts,f.clock,f.context,()=>{});const original=await chimeraCacheKey(parts[0],'female',f.clock,3,'v1'),edited=await chimeraCacheKey({...parts[0],chimeraLyricEdits:{'1:0':'oh'}},'female',f.clock,3,'v1');assert.notEqual(original,edited);
 assert.equal(m.setLyricEdits(parts[0],{'1:0':'oh'}),true);assert.equal(m.records.get('s').active,false);assert.equal(m.records.get('a').active,true);await m.prepare(parts,f.clock,f.context,()=>{});assert.deepEqual(f.calls,['s','a','s']);assert.equal(m.setLyricEdits(parts[0],{'1:0':'oh'}),false);
 await m.clearCache();assert.deepEqual(m.lyricEdits.s,{'1:0':'oh'});
});
