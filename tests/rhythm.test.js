import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {parseXML} from '../dist/js/parser.js';import {useXMLTree} from './xml-dom.js';import {transformed} from '../dist/js/model.js';import {detectedParts} from '../dist/js/instruments.js';import {bassNotes,bassTuning,drawBass} from '../dist/js/bass.js';import {drumNotes,drumLanes,drawDrums,DRUM_STAFF_MAP,drumStaffMidi} from '../dist/js/drums.js';import {AudioEngine} from '../dist/js/metronome.js';import {backingEvents} from '../dist/js/accompaniment.js';
async function fixture(){useXMLTree(JSON.parse(await readFile(new URL('./fixtures/rhythm-section.tree.json',import.meta.url))));return parseXML(await readFile(new URL('./fixtures/rhythm-section.musicxml',import.meta.url),'utf8'));}
test('bajo importa afinación de cinco cuerdas y respeta transposición, tablatura y duraciones',async()=>{
 const score=await fixture(),bass=score.parts[0],notes=bassNotes(transformed(bass,0,0,'all'),bass);assert.deepEqual(bassTuning(bass),[43,38,33,28,23]);assert.deepEqual(notes.map(n=>[n.string,n.fret,n.soundMidi,n.duration]),[[5,0,23,2],[2,0,38,2]]);assert.ok(notes.every(n=>!n.proposed));assert.equal(bass.clefs[0].sign,'TAB');assert.deepEqual(detectedParts(score.parts,'bajo').map(p=>p.index),[0]);
});
test('percusión usa el instrumento MIDI 1–128 y conserva clave, posición y cabeza separadas',async()=>{
 const score=await fixture(),drums=score.parts[1];assert.equal(drums.clefs[0].sign,'percussion');assert.equal(drums.drumInstruments.find(i=>i.id==='kick').xmlMidi,37);assert.equal(drums.drumInstruments.find(i=>i.id==='kick').midi,36);assert.equal(drums.notes[0].drumName,'Closed Hi-Hat');assert.equal(drums.notes[0].displayStep,'G');assert.equal(drums.notes[0].displayOctave,5);assert.equal(drums.notes[0].notehead,'x');assert.equal(drums.notes[2].notehead,'circle-x');assert.deepEqual(detectedParts(score.parts,'bateria').map(p=>p.index),[1]);
 const notes=drumNotes(drums.notes);assert.equal(notes.length,3);assert.deepEqual(notes.filter(n=>n.start===0).map(n=>n.midi).sort(),[36,42]);assert.deepEqual(drumLanes(notes).map(d=>d.name),['Hi-hat cerrado','Hi-hat abierto','Bombo']);assert.ok(backingEvents(score.parts,drums.id).every(n=>n.trackId!==drums.id));
});
test('mapa del docente: cada posición y símbolo se asigna al elemento acordado',()=>{
 for(const d of DRUM_STAFF_MAP)assert.equal(drumStaffMidi({midi:0,displayStep:d.step,displayOctave:d.octave,notehead:d.head??'normal'}),d.midi);
 const source=[{midi:42,displayStep:'G',displayOctave:5,notehead:'x',start:0},{midi:46,displayStep:'G',displayOctave:5,notehead:'circle-x',start:0}];const changed=drumNotes(source,{42:49});assert.deepEqual(changed.map(n=>n.midi),[49,46]);assert.equal(source[0].midi,42);assert.equal(changed[0].sourceMidi,42);assert.equal(changed[0].soundMidi,49);assert.equal(drumStaffMidi({midi:60}),60);
});
test('vistas de bajo y batería dibujan trastes, carriles con nombres y golpes simultáneos',async()=>{
 const score=await fixture(),calls=[],c=new Proxy({fillText:t=>calls.push(t)},{get:(o,k)=>o[k]??(()=>{})});const bass=score.parts[0],drums=score.parts[1];drawBass(c,0,bassNotes(transformed(bass,0,0,'all'),bass),bass,{latin:true,middle:4});assert.ok(calls.includes('BAJO / 5 CUERDAS'));assert.ok(calls.includes('5.ª Si0'));drawDrums(c,0,drumNotes(drums.notes),drums);assert.ok(calls.includes('BATERÍA / CLAVE DE PERCUSIÓN'));assert.ok(calls.includes('Hi-hat cerrado'));assert.ok(calls.includes('Hi-hat abierto'));assert.ok(calls.includes('Bombo'));
});
test('audio del tutorial selecciona bass o drums sin convertir sonidos de batería en alturas melódicas',()=>{
 for(const [type,sound,midi]of [['bajo','bass',23],['bateria','drums',42]]){let played;const audio=new AudioEngine();audio.tutorialInstrument=type;audio.tutorialPart={name:type,program:33};audio.ctx={currentTime:0};audio.melodyBus={gain:{setValueAtTime(){}}};audio.samples={play:(...args)=>{played=args;}};audio.note({midi,soundMidi:midi},0,.25);assert.equal(played[0].sound,sound);assert.equal(played[0].drum,type==='bateria');assert.equal(played[1].midi,midi);}
});

test('mezcla por elemento conserva ritmo y aplica volumen o silencio en tutorial y acompañamiento',async()=>{
 const score=await fixture(),part=score.parts[1],mix={42:{volume:.4,muted:false},36:{volume:1,muted:true}},notes=drumNotes(part.notes,{},mix);
 assert.deepEqual(notes.map(n=>[n.midi,n.start,n.drumGain]),[[42,0,.4],[36,0,0],[46,1,1]]);assert.equal(part.notes[0].drumGain,undefined);
 const backing=backingEvents(score.parts,score.parts[0].id,{drumMix:{D:mix}});assert.equal(backing.find(n=>n.midi===42).drumGain,.4);assert.equal(backing.find(n=>n.midi===36).drumGain,0);
});
test('sampler aplica la ganancia del elemento y omite completamente golpes silenciados',async t=>{
 const {SamplePlayer,sampler}=await import('../dist/js/sample-player.js');let calls=0,event;t.mock.method(sampler,'play',(_player,_track,ev)=>{calls++;event=ev;return false;});
 const player={buses:new Map(),context:{}},track={id:'d',name:'Batería',drum:true};
 SamplePlayer.prototype.play.call(player,track,{midi:42,velocity:.8,drumGain:.5},0,.2,{});assert.equal(event.velocity,.4);assert.equal(event.pitch,42);
 SamplePlayer.prototype.play.call(player,track,{midi:42,velocity:.8,drumGain:0},0,.2,{});assert.equal(calls,1);
});

test('silenciar la escucha desconecta solo los altavoces y conserva el bus de captura',()=>{
 const engine=new AudioEngine(),destination={},calls=[];engine.ctx={destination};engine.limiter={disconnect:d=>calls.push(['limiter-disconnect',d]),connect:d=>calls.push(['limiter-connect',d])};engine.metro={disconnect:d=>calls.push(['metro-disconnect',d]),connect:d=>calls.push(['metro-connect',d])};engine.setMonitoring(false);assert.equal(engine.monitoring,false);assert.equal(calls.length,2);assert.ok(calls.every(c=>c[1]===destination));engine.setMonitoring(true);assert.equal(engine.monitoring,true);assert.ok(calls.some(c=>c[0]==='limiter-connect'));assert.ok(calls.some(c=>c[0]==='metro-connect'));
});
