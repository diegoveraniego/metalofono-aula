import {test} from 'node:test';
import assert from 'node:assert/strict';
import {guitarNotes,TUNING,drawGuitar} from '../dist/js/guitar.js';
import {detectedParts} from '../dist/js/instruments.js';
import {transformed} from '../dist/js/model.js';
import {AudioEngine} from '../dist/js/metronome.js';
test('guitarra conserva digitación original y acordes, sin duplicar cuerdas propuestas',()=>{
 const source={notes:[{midi:52,string:4,fret:2,start:0,duration:2},{midi:57,string:3,fret:2,start:0,duration:2},{midi:61,start:0,duration:2}]};
 const notes=guitarNotes(transformed(source,0,0,'all'));assert.equal(notes.length,3);assert.equal(notes[0].string,4);assert.equal(notes[1].string,3);assert.equal(notes[2].proposed,true);assert.equal(new Set(notes.map(n=>n.string)).size,3);for(const n of notes)assert.equal(TUNING[n.string-1]+n.fret,n.soundMidi);assert.equal(source.notes[2].string,undefined);
});
test('posiciones transpuestas se recalculan por altura sonora; notas imposibles se identifican',()=>{
 const notes=guitarNotes([{midi:64,soundMidi:52,string:1,fret:0,start:0},{midi:100,soundMidi:100,start:1}],12);assert.equal(notes[0].proposed,true);assert.equal(TUNING[notes[0].string-1]+notes[0].fret,52);assert.equal(notes[1].string,undefined);
});
test('detector separa tres guitarras del bajo y percusión',()=>{assert.equal(detectedParts([{name:'Guitarra'},{name:'Guitarra eléctrica'},{name:'Guitarra eléctrica'},{name:'Bajo',program:33},{name:'Batería',percussion:true}],'guitarra').length,3);});
test('la vista explica las cuerdas, el slide y presenta el acorde',()=>{
 const labels=[];const c=new Proxy({fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{})});
 drawGuitar(c,0,[{midi:52,string:4,fret:2,start:0,duration:1,slide:'start'},{midi:57,string:3,fret:2,start:0,duration:1},{midi:54,string:4,fret:4,start:1,duration:1}],{measures:[{start:0}]});assert.ok(labels.includes('1.ª Mi aguda'));assert.ok(labels.includes('6.ª Mi grave'));assert.ok(labels.includes('ACORDE AHORA'));assert.ok(labels.includes('slide ↗'));
});
test('audio de guitarra conserva instrumento y duración sin usar campanas',()=>{const engine=new AudioEngine();let played;engine.tutorialInstrument='guitarra';engine.tutorialPart={name:'Guitarra eléctrica',program:27};engine.ctx={currentTime:0};engine.melodyBus={gain:{setValueAtTime(){}}};engine.samples={play:(...args)=>{played=args;}};engine.note({midi:64,soundMidi:52},0,1.5);assert.equal(played[0].program,27);assert.equal(played[0].name,'Guitarra eléctrica');assert.equal(played[1].midi,52);assert.equal(played[3],1.5);});

test('importa símbolos de acorde con posición, calidad, bajo y diagrama; conserva el acorde entre ataques',async()=>{
 const {readFile}=await import('node:fs/promises');const {parseXML}=await import('../dist/js/parser.js');const {useXMLTree}=await import('./xml-dom.js');const {harmonyAt,harmonyDiagram}=await import('../dist/js/guitar.js');
 useXMLTree(JSON.parse(await readFile(new URL('./fixtures/guitar-harmonies.tree.json',import.meta.url),'utf8')));
 const score=parseXML(await readFile(new URL('./fixtures/guitar-harmonies.musicxml',import.meta.url),'utf8')),part=score.parts[0];
 assert.deepEqual(part.harmonies.map(h=>[h.start,h.label]),[[0,'A'],[1.5,'G'],[4.5,'F♯m7/C♯']]);assert.equal(harmonyAt(part,-1),null);assert.equal(harmonyAt(part,1.49).label,'A');assert.equal(harmonyAt(part,1.5).label,'G');assert.equal(harmonyAt(part,4.4).label,'G');assert.deepEqual(harmonyDiagram(part.harmonies[0]).map(n=>[n.string,n.fret]),[[5,0],[4,2]]);
 const labels=[],c=new Proxy({fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{})});drawGuitar(c,0,[],part);assert.ok(labels.includes('ACORDE · A'));assert.ok(labels.includes('5.ª La · al aire'));assert.ok(labels.includes('×'));
});

test('las eléctricas reciben el cifrado de la guitarra y sus símbolos propios tienen prioridad',async()=>{
 const {guitarHarmonies,harmonyAt}=await import('../dist/js/guitar.js');
 const acoustic={id:'a',name:'Guitarra',harmonies:[{start:0,label:'A',frame:{notes:[{string:5,fret:0}]}},{start:4,label:'G'},{start:8,label:'D'}]},electric1={id:'e1',name:'Guitarra eléctrica',harmonies:[{start:4,label:'G5'}]},electric2={id:'e2',name:'Guitarra eléctrica',harmonies:[]};
 const first=guitarHarmonies([acoustic,electric1,electric2],electric1),second=guitarHarmonies([acoustic,electric1,electric2],electric2);
 assert.deepEqual(first.map(h=>h.label),['A','G5','D']);assert.equal(harmonyAt({harmonies:first},2).shared,true);assert.equal(harmonyAt({harmonies:first},4).shared,false);assert.equal(harmonyAt({harmonies:second},4).label,'G');assert.equal(acoustic.harmonies[0].shared,undefined);
});

test('acordes de quinta se muestran sin 5, conservando notas y digitaciones originales',async()=>{
 const {harmonyLabel}=await import('../dist/js/guitar.js'),chord={label:'D5',root:'D',kind:'power',frame:{notes:[{string:3,fret:7}]}};assert.equal(harmonyLabel(chord),'D');assert.equal(harmonyLabel({label:'G5/A',kind:'power'}),'G/A');assert.equal(harmonyLabel({label:'Dmaj7',kind:'major-seventh'}),'Dmaj7');assert.equal(chord.label,'D5');assert.equal(chord.frame.notes[0].fret,7);
});
