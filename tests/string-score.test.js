import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stringScorePage,stringScoreX,prepareStringScore} from '../dist/js/string-score.js';
test('tablatura mantiene ocho compases fijos y anticipa la siguiente línea antes del cambio',()=>{
 const measures=Array.from({length:12},(_,i)=>({number:i+1,start:i*4,duration:4}));
 assert.equal(stringScorePage(measures,-4).start,0);assert.equal(stringScorePage(measures,31.99).start,4);assert.equal(stringScorePage(measures,32).start,8);assert.equal(stringScorePage(measures,100).measures.length,4);
 const m=measures[2];assert.equal(stringScoreX(m,9,100,300),189);assert.equal(stringScoreX(m,10,100,300),254);
});
test('cursor respeta 6/8, 5/4 y anacrusa sin asumir cuatro pulsos',()=>{
 const measures=[{start:0,duration:1},{start:1,duration:3},{start:4,duration:5}];assert.equal(stringScorePage(measures,3.5).index,1);assert.equal(stringScorePage(measures,4).index,2);assert.equal(stringScoreX(measures[1],2.5,0,300),154);assert.equal(stringScoreX(measures[2],6.5,0,300),154);
});

test('prepara también compases futuros y conserva sus notas al cambiar el cursor',()=>{
 const part={measures:[{start:0,duration:4},{start:4,duration:4},{start:8,duration:4}],notation:[{start:9,duration:1,rest:true}],harmonies:[{start:8,label:'G'}]},notes=[{string:1,start:3,duration:2},{string:2,start:8,duration:1}];
 const bars=prepareStringScore(notes,part);assert.equal(bars[0].notes[0].note,notes[0]);assert.equal(bars[1].notes[0].note,notes[0]);assert.equal(bars[2].notes[0].note,notes[1]);assert.equal(bars[2].rests.length,1);assert.equal(bars[2].harmonies.length,1);assert.equal(prepareStringScore(notes,part),bars);
 const updated=prepareStringScore(notes,{...part,harmonies:[{start:4,label:'D'}]});assert.notEqual(updated,bars);assert.equal(updated[1].harmonies[0].label,'D');
});
test('renderizador completo conserva notas pasadas y futuras de toda la página para guitarra y bajo',async()=>{
 const {Renderer}=await import('../dist/js/renderer.js');
 for(const instrument of ['guitarra','bajo']){
  const labels=[],ctx=new Proxy({fillText:t=>labels.push(String(t)),measureText:()=>({width:20})},{get:(o,k)=>o[k]??(()=>{})}),canvas={getContext:()=>ctx},renderer=new Renderer(canvas);
  Object.assign(renderer.opts,{instrument,stringVisualization:'score',showStructure:false});
  const measures=Array.from({length:8},(_,i)=>({number:i+1,start:i*4,duration:4,numerator:4,denominator:4})),part={measures,keys:[],notes:[],harmonies:[]},notes=[{midi:64,string:1,fret:11,start:0,duration:.5},{midi:64,string:1,fret:19,start:28,duration:.5}],structure={sections:[],at:()=>null,next:()=>null},scheduler={tempoAt:()=>120,speed:1};
  renderer.draw(6,part,notes,structure,scheduler);
  assert.ok(labels.includes('11'),'conserva el principio del sistema aunque el cursor haya pasado');assert.ok(labels.includes('19'),'precarga la última nota visible más allá de ocho pulsos');
 }
});
