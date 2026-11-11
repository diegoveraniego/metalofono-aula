import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chimeraFragments,renderChimeraFragments} from '../dist/js/chimera-fragments.js';
const syl=text=>({text,nucleus:{ipa:'ɑ'},onset:[],coda:[],wordEnd:true,phraseEnd:false}),phrase=(start,text='ah')=>({start,notes:[{midi:69,beats:2,syl:syl(text)}]});
function fixture(){const values=new Map(),calls=[],cache={async get(key){return values.get(key);},async put(key,value){values.set(key,structuredClone(value));}},render=async options=>{calls.push(options);const length=Math.ceil(options.duration*48000),pcm=new Float32Array(length);pcm.fill(.2);return {pcm,sampleRate:48000,snapshots:[{time:.3,artic:[1]}],segments:[{t0:.3,t1:.5,ipa:'ɑ'}]};};return {values,calls,cache,render};}
test('recorta silencios largos, conserva preparación y cola, y agrupa pausas cortas',()=>{
 const fragments=chimeraFragments([phrase(5),phrase(7),phrase(15)],30);assert.equal(fragments.length,2);assert.equal(fragments[0].phrases.length,2);assert.ok(fragments[0].start<5);assert.ok(fragments[0].start+fragments[0].duration>=9.25);assert.ok(fragments[0].duration+fragments[1].duration<15);assert.ok(fragments[1].start>fragments[0].start+fragments[0].duration);
 assert.equal(chimeraFragments([phrase(40)],30).length,0);
});
test('edición local solo recalcula un tramo, manteniendo los tiempos de audio y fonemas',async()=>{
 const f=fixture(),input={phrases:[phrase(5),phrase(15)],body:{female:1,child:0},duration:25,engineVersion:'v1'},first=await renderChimeraFragments(input,f.render,()=>{},f.cache);assert.equal(f.calls.length,2);assert.equal(first.pcm.length,25*48000);assert.equal(first.pcm[0],0);assert.ok(first.pcm[5*48000]>.1);assert.equal(first.pcm[12*48000],0);assert.ok(Math.abs(first.segments[0].t0-5)<.0001);
 const second=await renderChimeraFragments({...input,phrases:[phrase(5,'oh'),phrase(15)]},f.render,()=>{},f.cache);assert.equal(f.calls.length,3);assert.equal(second.optimization.rendered,1);assert.equal(second.optimization.cached,1);assert.ok(second.optimization.skippedSeconds>15);
 const third=await renderChimeraFragments(input,f.render,()=>{},f.cache);assert.equal(f.calls.length,3);assert.equal(third.optimization.cached,2);
});
test('un archivo completamente silencioso no llama al sintetizador',async()=>{
 const f=fixture(),result=await renderChimeraFragments({phrases:[],duration:2,body:{female:0,child:0},engineVersion:'v1'},f.render,()=>{},f.cache);assert.equal(f.calls.length,0);assert.ok(result.pcm.every(v=>v===0));
});
