import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultInstrument,partDisplayName} from '../dist/js/instruments.js';
test('selector único asocia cada parte a su visualización, priorizando su nombre sobre programas genéricos',()=>{
 const parts=[{name:'Metalófono',program:9},{name:'Voz',program:0},{name:'Teclado 2 (Synth)',program:90},{name:'Teclado 1 (Synth)',program:90},{name:'Guitarra',program:0},{name:'Guitarra eléctrica',program:27},{name:'Guitarra eléctrica',program:27},{name:'Bajo eléctrico de 5 cuerdas',program:33},{name:'Batería',program:0,percussion:true}];
 assert.deepEqual(parts.map(defaultInstrument),['metalofono','voz','piano','piano','guitarra','guitarra','guitarra','bajo','bateria']);assert.equal(partDisplayName(parts,5),'Guitarra eléctrica 1');assert.equal(partDisplayName(parts,6),'Guitarra eléctrica 2');
});
test('selector reconoce MIDI sin nombres y mantiene batería separada de los instrumentos melódicos',()=>{
 assert.equal(defaultInstrument({name:'Pista 1',program:33}),'bajo');assert.equal(defaultInstrument({name:'Pista 2',program:27}),'guitarra');assert.equal(defaultInstrument({name:'Pista 3',program:0}),'piano');assert.equal(defaultInstrument({name:'Pista 4',program:0,percussion:true}),'bateria');assert.equal(defaultInstrument({name:'Parte sin nombre',lyrics:[{text:'ah'}]}),'voz');
});
