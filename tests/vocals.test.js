import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {parseXML} from '../dist/js/parser.js';import {useXMLTree} from './xml-dom.js';import {vocalPhrases,vocalPhraseAt,drawVocals} from '../dist/js/vocals.js';import {detectedParts} from '../dist/js/instruments.js';import {AudioEngine} from '../dist/js/metronome.js';
test('voz importa sílabas, prolonga letra ligada y arma frases sin separar palabras',async()=>{
 useXMLTree(JSON.parse(await readFile(new URL('./fixtures/vocals.tree.json',import.meta.url))));const score=parseXML(await readFile(new URL('./fixtures/vocals.musicxml',import.meta.url),'utf8')),part=score.parts[0];
 assert.equal(part.lyrics.length,4);assert.equal(part.notes.length,4);assert.equal(part.lyrics[2].duration,2);const phrases=vocalPhrases(part.lyrics);assert.equal(phrases[0].text,'canta hoy');assert.equal(phrases[1].text,'sí');assert.equal(vocalPhraseAt(phrases,-4),phrases[0]);assert.equal(vocalPhraseAt(phrases,4),phrases[1]);assert.equal(vocalPhraseAt(phrases,6),null);assert.equal(detectedParts(score.parts,'voz').length,1);
 const labels=[],c=new Proxy({measureText:t=>({width:t.length*18}),fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{})});drawVocals(c,1.5,part.notes,phrases,{latin:true,middle:4});assert.ok(labels.includes('CANTA'));assert.ok(labels.includes('DESPUÉS'));assert.ok(labels.some(t=>t.includes('ta')));
});
test('voz usa muestras vocales y conserva la altura sonora y la duración',()=>{const engine=new AudioEngine();let played;engine.tutorialInstrument='voz';engine.tutorialPart={name:'Voz',program:53};engine.ctx={currentTime:0};engine.melodyBus={gain:{setValueAtTime(){}}};engine.samples={play:(...args)=>{played=args;}};engine.note({midi:71,soundMidi:71},0,2);assert.equal(played[0].sound,'voice');assert.equal(played[1].midi,71);assert.equal(played[3],2);});

test('karaoke mantiene una escala estable y colorea cada sílaba gradualmente',async()=>{
 const {vocalPitchRange,vocalSyllableProgress}=await import('../dist/js/vocals.js');const range=vocalPitchRange([{midi:66},{midi:78}]);assert.deepEqual(range,{low:64,high:80});assert.ok(vocalPitchRange([{midi:71}]).high-vocalPitchRange([{midi:71}]).low>=12);
 const syllable={start:4,duration:2};assert.equal(vocalSyllableProgress(syllable,3),0);assert.equal(vocalSyllableProgress(syllable,5),.5);assert.equal(vocalSyllableProgress(syllable,6),1);
});
test('cambios de sílaba dentro de una ligadura dividen la barra sin perder melodía',async()=>{
 const {vocalPhraseNotes}=await import('../dist/js/vocals.js');const phrase=vocalPhrases([{start:0,duration:1,text:'can',syllabic:'begin'},{start:1,duration:1,text:'ta',syllabic:'end'}])[0];const segments=vocalPhraseNotes(phrase,[{midi:60,start:0,duration:2}]);assert.deepEqual(segments.map(n=>[n.start,n.duration,n.lyric]),[[0,1,'can'],[1,1,'ta']]);assert.equal(segments.reduce((sum,n)=>sum+n.duration,0),2);
});
test('melisma abarca notas consecutivas y termina ante un silencio; respeta saltos explícitos',()=>{
 const lyrics=[{start:0,duration:1,text:'ah',extend:true},{start:5,duration:1,text:'sí',lineBreakAfter:true},{start:6,duration:1,text:'hoy'}],notes=[{midi:60,start:0,duration:1},{midi:62,start:1,duration:1},{midi:64,start:3,duration:1}];const phrases=vocalPhrases(lyrics,notes);assert.equal(phrases[0].syllables[0].duration,2);assert.equal(phrases[0].end,2);assert.equal(phrases[1].text,'sí');assert.equal(phrases[2].text,'hoy');assert.equal(lyrics[0].duration,1);
});

test('modo Voz elige la parte vocal antes que láminas con nombres de notas como letra',()=>{
 const parts=[{id:'metal',name:'Metalófono',lyrics:[{text:'do'},{text:'si'}]},{id:'v',name:'Voz',lyrics:[{text:'hola'}]},{id:'g',name:'Guitarra',lyrics:[{text:'la'}]}];assert.deepEqual(detectedParts(parts,'voz').map(p=>p.part.id),['v']);
});

test('nombres de notas opcionales: ocultos de inicio y disponibles en español o inglés',()=>{
 const notes=[{midi:60,start:0,duration:1}],phrases=vocalPhrases([{start:0,duration:1,text:'ah'}]);
 const draw=opts=>{const labels=[],c=new Proxy({measureText:t=>({width:t.length*18}),fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{})});drawVocals(c,.5,notes,phrases,opts);return labels;};
 assert.ok(!draw({}).includes('Do4'));assert.ok(!draw({}).includes('C4'));
 assert.ok(draw({showVocalNoteNames:true,latin:true,middle:4}).includes('Do4'));
 assert.ok(draw({showVocalNoteNames:true,latin:false,middle:4}).includes('C4'));
 assert.ok(draw({showVocalNoteNames:true,latin:true,middle:3}).includes('Do3'));
});
test('cuenta vocal muestra pulsos y compases en 4/4, 3/4, 6/8 y cambios de compás',async()=>{
 const {vocalEntryCountdown:count}=await import('../dist/js/vocals.js');
 const bars=[{start:0,duration:4,numerator:4,denominator:4},{start:4,duration:4,numerator:4,denominator:4}];
 assert.equal(count(0,8,bars).label,'Entrada en 8 pulsos (2 compases)');assert.equal(count(0,6,bars).label,'Entrada en 6 pulsos (1,5 compases)');assert.equal(count(3,4,bars).label,'Entrada en 1 pulso (0,25 compases)');assert.equal(count(-4,0,bars).label,'Entrada en 4 pulsos (1 compás)');
 const triple=[{start:0,duration:3,numerator:3,denominator:4},{start:3,duration:3,numerator:3,denominator:4}];assert.equal(count(0,6,triple).label,'Entrada en 6 pulsos (2 compases)');
 assert.equal(count(0,3,[{start:0,duration:3,numerator:6,denominator:8}]).label,'Entrada en 6 pulsos (1 compás)');
 assert.equal(count(0,7,[bars[0],{start:4,duration:3,numerator:3,denominator:4}]).label,'Entrada en 7 pulsos (2 compases)');
 assert.equal(count(0,6,bars,{numerator:3,denominator:4}).label,'Entrada en 6 pulsos (2 compases)');assert.equal(count(.1,8,bars).label,'Entrada en 8 pulsos (2 compases)');
});
