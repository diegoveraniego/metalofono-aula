import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {parseXML} from '../dist/js/parser.js';import {useXMLTree} from './xml-dom.js';import {vocalPhrases,vocalPhraseAt,drawVocals} from '../dist/js/vocals.js';import {detectedParts} from '../dist/js/instruments.js';import {AudioEngine} from '../dist/js/metronome.js';
test('voz importa sílabas, prolonga letra ligada y arma frases sin separar palabras',async()=>{
 useXMLTree(JSON.parse(await readFile(new URL('./fixtures/vocals.tree.json',import.meta.url))));const score=parseXML(await readFile(new URL('./fixtures/vocals.musicxml',import.meta.url),'utf8')),part=score.parts[0];
 assert.equal(part.lyrics.length,4);assert.equal(part.notes.length,4);assert.equal(part.lyrics[2].duration,2);const phrases=vocalPhrases(part.lyrics);assert.equal(phrases[0].text,'canta hoy');assert.equal(phrases[1].text,'sí');assert.equal(vocalPhraseAt(phrases,-4),phrases[0]);assert.equal(vocalPhraseAt(phrases,4),phrases[1]);assert.equal(vocalPhraseAt(phrases,6),null);assert.equal(detectedParts(score.parts,'voz').length,1);
 const labels=[],c=new Proxy({measureText:t=>({width:t.length*18}),fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{})});drawVocals(c,1.5,part.notes,phrases,{latin:true,middle:4});assert.ok(labels.includes('CANTA'));assert.ok(labels.includes('DESPUÉS'));assert.ok(labels.some(t=>t.includes('ta')));
});
test('voz usa muestras vocales y conserva la altura sonora y la duración',()=>{const engine=new AudioEngine();let played;engine.tutorialInstrument='voz';engine.tutorialPart={name:'Voz',program:53};engine.ctx={currentTime:0};engine.melodyBus={gain:{setValueAtTime(){}}};engine.samples={play:(...args)=>{played=args;}};engine.note({midi:71,soundMidi:71},0,2);assert.equal(played[0].sound,'voice');assert.equal(played[1].midi,71);assert.equal(played[3],2);});

test('karaoke mantiene una escala estable y colorea cada sílaba gradualmente',async()=>{
 const {vocalPitchRange,vocalSyllableProgress}=await import('../dist/js/vocals.js');const range=vocalPitchRange([{midi:66},{midi:78}]);assert.deepEqual(range,{low:60,high:81});assert.ok(vocalPitchRange([{midi:71}]).high-vocalPitchRange([{midi:71}]).low>=12);
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
 assert.equal(count(0,8,bars).label,'Entrada en 8 pulsos (2 compases)');assert.equal(count(0,6,bars).label,'Entrada en 6 pulsos (1 compás)');assert.equal(count(3,4,bars).label,'Entrada en 1 pulso (0 compases)');assert.equal(count(-4,0,bars).label,'Entrada en 4 pulsos (1 compás)');
 const triple=[{start:0,duration:3,numerator:3,denominator:4},{start:3,duration:3,numerator:3,denominator:4}];assert.equal(count(0,6,triple).label,'Entrada en 6 pulsos (2 compases)');
 assert.equal(count(0,3,[{start:0,duration:3,numerator:6,denominator:8}]).label,'Entrada en 6 pulsos (1 compás)');
 assert.equal(count(0,7,[bars[0],{start:4,duration:3,numerator:3,denominator:4}]).label,'Entrada en 7 pulsos (2 compases)');
 assert.equal(count(0,6,bars,{numerator:3,denominator:4}).label,'Entrada en 6 pulsos (2 compases)');assert.equal(count(.1,8,bars).label,'Entrada en 8 pulsos (2 compases)');
});


test('Somebody to Love: seis voces con colores distintos, melismas sin reataques de texto y calderones ligados',async()=>{
 const {prepareTutorial}=await import('../dist/js/tutorials.js');
 useXMLTree(JSON.parse(await readFile(new URL('./fixtures/somebody-choir.tree.json',import.meta.url))));
 const score=parseXML(await readFile(new URL('./fixtures/somebody-choir.musicxml',import.meta.url),'utf8'));
 const tutorials=score.parts.map((_,i)=>prepareTutorial(score.parts,i));
 assert.equal(tutorials.length,6);assert.ok(tutorials.every(t=>t.opts.instrument==='voz'));assert.equal(new Set(tutorials.map(t=>t.opts.vocalColorIndex)).size,6);
 for(const t of tutorials){
  const syllables=t.opts.vocalPhrases.flatMap(p=>p.syllables),to=syllables.find(s=>s.text==='to');assert.equal(to.start,13.5);assert.equal(to.duration,4.5);
  const pages=t.opts.vocalPages.flat();assert.equal(pages.filter(n=>n.lyric==='to').length,1);assert.ok(pages.some(n=>n.fermatas?.length));
 }
 const soprano=tutorials[0];assert.ok(soprano.opts.vocalPages.flat().some(n=>n.lyricContinuation));
 assert.ok(soprano.notes.some(n=>n.start<14&&n.fermatas?.some(f=>f.start===14)));
 const arcs=[],labels=[],colors=[],c=new Proxy({measureText:t=>({width:t.length*18}),fillText:t=>labels.push(t),arc:(...args)=>arcs.push(args),fill:()=>colors.push(c.fillStyle)},{get:(o,k)=>o[k]??(()=>{})});
 drawVocals(c,14,soprano.notes,soprano.opts.vocalPhrases,soprano.opts);
 assert.equal(labels.filter(t=>t==='to').length,1);assert.ok(labels.includes('Soprano'));assert.ok(arcs.some(a=>a[2]===10&&a[3]===Math.PI));
});

test('guiones bajos prolongan una sílaba y una repetición escrita sigue siendo una repetición',()=>{
 const phrases=vocalPhrases([{start:0,duration:1,text:'to___'},{start:1,duration:1,text:'____'},{start:2,duration:1,text:'love'}],[{start:0,duration:1},{start:1,duration:1},{start:2,duration:1}]);
 assert.equal(phrases[0].text,'to love');assert.equal(phrases[0].syllables[0].duration,2);
 assert.equal(vocalPhrases([{start:0,duration:1,text:'to'},{start:1,duration:1,text:'to'}])[0].text,'to to');
});


test('vista general coral conserva seis filas, colores y un eje de tiempo compartido',async()=>{
 const {vocalEnsemble,drawVocalEnsemble}=await import('../dist/js/vocals.js');const {musicalPalette}=await import('../dist/js/appearance.js');
 useXMLTree(JSON.parse(await readFile(new URL('./fixtures/somebody-choir.tree.json',import.meta.url))));const score=parseXML(await readFile(new URL('./fixtures/somebody-choir.musicxml',import.meta.url),'utf8'));
 const voices=vocalEnsemble(score.parts),labels=[],colors=[],rects=[],c=new Proxy({measureText:t=>({width:t.length*8}),fillText:t=>labels.push(t),fill:()=>colors.push(c.fillStyle),roundRect:(...args)=>rects.push(args)},{get:(o,k)=>o[k]??(()=>{})});
 drawVocalEnsemble(c,14,voices,{});
 for(const voice of voices)assert.ok(labels.includes(voice.name));for(const color of musicalPalette().strings)assert.ok(colors.includes(color));
 assert.equal(labels.filter(t=>t==='to').length,6);assert.equal(voices.length,6);assert.equal(voices.at(-1).name,'Bajo');assert.ok(rects.length>6);
 const {prepareTutorial}=await import('../dist/js/tutorials.js');assert.equal(prepareTutorial(score.parts,0,{opts:{vocalOverview:true}}).opts.vocalOverview,false);
});


test('escala coral compartida usa alturas sonoras y conserva cruces y unísonos sin normalizar por voz',async()=>{
 const {vocalEnsemble,vocalEnsembleGeometry,drawVocalEnsemble}=await import('../dist/js/vocals.js');
 const voices=vocalEnsemble([{id:'a',name:'Soprano',lyrics:[{start:0,duration:2,text:'ah',extend:true}],notes:[{start:0,duration:1,midi:60,soundMidi:72},{start:1,duration:1,midi:60,soundMidi:60}]},{id:'b',name:'Bajo',lyrics:[{start:0,duration:2,text:'oh',extend:true}],notes:[{start:0,duration:1,midi:48,soundMidi:60},{start:1,duration:1,midi:48,soundMidi:72}]}]);
 const separate=vocalEnsembleGeometry(voices,0),shared=vocalEnsembleGeometry(voices,0,'shared');
 assert.notEqual(separate.y(0,voices[0].notes[0]),separate.y(1,voices[1].notes[0]));
 assert.ok(shared.y(0,voices[0].notes[0])<shared.y(1,voices[1].notes[0]));assert.ok(shared.y(0,voices[0].notes[1])>shared.y(1,voices[1].notes[1]));
 assert.equal(shared.y(0,{midi:60,soundMidi:72}),shared.y(1,{midi:48,soundMidi:72}));assert.equal(shared.x(8),shared.right);assert.ok(separate.right-separate.left>1400);
 const labels=[],c=new Proxy({measureText:t=>({width:t.length*8}),fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{})});drawVocalEnsemble(c,.5,voices,{vocalLayout:'shared',vocalPortrait:true});assert.ok(labels.includes('Soprano'));assert.ok(labels.includes('Bajo'));assert.ok(labels.includes('ah'));assert.ok(labels.includes('oh'));
});

test('piano vertical alinea cada semitono y muestra ambos colores cuando dos voces coinciden',async()=>{
 const {vocalPianoKeys,drawVocalPiano,drawVocalEnsemble,vocalEnsemble}=await import('../dist/js/vocals.js');
 const range={low:60,high:72},y=midi=>500-(midi-60)*20,keys=vocalPianoKeys(range,y,100,180);
 for(const key of keys)assert.equal(key.y+key.h/2,y(key.midi));assert.ok(keys.find(k=>k.midi===61).w<keys.find(k=>k.midi===60).w);assert.ok(keys.find(k=>k.midi===72).y<keys.find(k=>k.midi===60).y);
 const fills=[],c=new Proxy({fillRect:(...rect)=>fills.push({rect,color:c.fillStyle}),measureText:t=>({width:t.length*8})},{get:(o,k)=>o[k]??(()=>{})});
 drawVocalPiano(c,range,y,100,180,[{midi:60,color:'#ff0000'},{midi:60,color:'#0000ff'}]);
 const red=fills.find(f=>f.color==='#ff0000'),blue=fills.find(f=>f.color==='#0000ff');assert.deepEqual(red.rect,[100,490,40,20]);assert.deepEqual(blue.rect,[140,490,40,20]);
 const voices=vocalEnsemble([{id:'a',name:'Soprano',lyrics:[],notes:[{midi:60,soundMidi:72,start:0,duration:1}]}]);
 fills.length=0;drawVocalEnsemble(c,1,voices,{vocalLayout:'shared',vocalPortrait:true});assert.ok(!fills.some(f=>f.color==='#7b91bb'));
 fills.length=0;drawVocalEnsemble(c,.5,voices,{vocalLayout:'shared',vocalPortrait:true});assert.ok(fills.some(f=>f.color==='#7b91bb'));
});


test('teclado vocal cubre Do4 a La5 y conserva alturas fuera de ese mínimo',async()=>{
 const {vocalPitchRange}=await import('../dist/js/vocals.js');assert.deepEqual(vocalPitchRange([]),{low:60,high:81});
 const range=vocalPitchRange([{midi:67}]);assert.ok(range.low<=60);assert.ok(range.high>=81);
 const bass=vocalPitchRange([{midi:44}]);assert.ok(bass.low<44);assert.ok(bass.high>=81);
 const soprano=vocalPitchRange([{midi:86}]);assert.ok(soprano.low<=60);assert.ok(soprano.high>86);
});


test('voces separadas muestran la nota activa y silencio sin dibujar teclados',async()=>{
 const {vocalEnsemble,drawVocalEnsemble}=await import('../dist/js/vocals.js');
 const voices=vocalEnsemble([{id:'a',name:'Soprano',lyrics:[],notes:[{midi:60,start:0,duration:1}]}]);
 const labels=[],keys=[],c=new Proxy({measureText:t=>({width:t.length*8}),fillText:t=>labels.push(t),fillRect:(...rect)=>keys.push(rect)},{get:(o,k)=>o[k]??(()=>{})});
 drawVocalEnsemble(c,.5,voices,{vocalLayout:'separate',latin:true,middle:4});assert.ok(labels.includes('Do4'));assert.equal(keys.length,0);
 labels.length=0;drawVocalEnsemble(c,1,voices,{vocalLayout:'separate',latin:true,middle:4});assert.ok(labels.includes('—'));assert.ok(!labels.includes('Do4'));
});


test('formato vertical amplía la altura coral y ambas orientaciones muestran piano',async()=>{
 const {vocalEnsemble,vocalEnsembleGeometry,drawVocalEnsemble}=await import('../dist/js/vocals.js');
 const voices=vocalEnsemble([{id:'a',name:'Soprano',lyrics:[],notes:[{midi:60,start:0,duration:1}]}]);
 const horizontal=vocalEnsembleGeometry(voices,0,'shared'),vertical=vocalEnsembleGeometry(voices,0,'shared',true);assert.ok(vertical.bottom-vertical.top>2*(horizontal.bottom-horizontal.top));assert.equal(vertical.width,900);assert.equal(vertical.span,32);
 const keys=[],c=new Proxy({measureText:t=>({width:t.length*8}),fillRect:(...rect)=>keys.push(rect)},{get:(o,k)=>o[k]??(()=>{})});
 drawVocalEnsemble(c,.5,voices,{vocalLayout:'shared'});assert.ok(keys.length>0);keys.length=0;drawVocalEnsemble(c,.5,voices,{vocalLayout:'shared',vocalPortrait:true});assert.ok(keys.length>0);
});


test('tramo vertical cuenta ocho compases reales incluyendo cambios de métrica y el final',async()=>{
 const {vocalMeasureWindow}=await import('../dist/js/vocals.js');let start=0;
 const measures=Array.from({length:10},(_,i)=>{const duration=i<4?3:4,bar={start,duration};start+=duration;return bar;});
 assert.deepEqual(vocalMeasureWindow(measures,0),{from:0,to:28});assert.deepEqual(vocalMeasureWindow(measures,27),{from:0,to:28});
 assert.deepEqual(vocalMeasureWindow(measures,28),{from:28,to:36});assert.deepEqual(vocalMeasureWindow(measures,36),{from:28,to:36});
});


test('voz horizontal distribuye la rejilla por todo el ancho disponible sin ampliar la altura ni las fuentes',async()=>{
 const {Renderer}=await import('../dist/js/renderer.js');const rects=[],texts=[],scales=[];
 const raw=new Proxy({measureText:t=>({width:t.length*8}),fillRect:(...args)=>rects.push(args),roundRect:(...args)=>rects.push(args),scale:(...args)=>scales.push(args),fillText:(...args)=>texts.push(args)},{get:(o,k)=>o[k]??(()=>{})});
 const canvas={width:0,height:0,getContext:()=>raw},renderer=new Renderer(canvas);canvas.width=3000;canvas.height=900;
 const notes=[{midi:60,start:0,duration:2}],part={name:'Soprano',notes,measures:[{number:1,start:0,duration:4,numerator:4,denominator:4}],lyrics:[{text:'ah',start:0,duration:2}]};Object.assign(renderer.opts,{instrument:'voz',showStructure:false,vocalNotes:notes,vocalPhrases:vocalPhrases(part.lyrics,notes)});
 renderer.draw(.5,part,notes,{sections:[],at:()=>null,next:()=>null},{manualMeter:false});
 assert.ok(rects.some(r=>r[0]===65&&r[2]===2870));assert.ok(scales.some(s=>s[0]===1600/3000&&s[1]===1));assert.ok(texts.some(t=>t[0]==='Más arriba = más agudo · Más larga = más tiempo'&&t[1]===2935));
});
