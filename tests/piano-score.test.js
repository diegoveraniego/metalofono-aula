import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseXML,parseFile} from '../dist/js/parser.js';
import {useXMLTree} from './xml-dom.js';
import {pianoScoreWindow,staffY,writtenPitch,spellingAt,drawPianoScore} from '../dist/js/piano-score.js';
import {noteName,transformed} from '../dist/js/model.js';
import {Structure,validateStructure,normalizeStructure} from '../dist/js/structure.js';
import {Renderer} from '../dist/js/renderer.js';
import {prepareTutorial} from '../dist/js/tutorials.js';
import {createExportJob,validateExportJob} from '../dist/js/export-job.js';
async function fixture(){const source=await readFile('tests/fixtures/piano-score.musicxml','utf8');useXMLTree(JSON.parse(await readFile('tests/fixtures/piano-score.tree.json','utf8')));return {source,part:parseXML(source).parts[0]};}
function context(){const calls=[];const ctx=new Proxy({measureText:t=>({width:t.length*8}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});return {ctx,calls};}
test('MXL abre el rootfile declarado, incluso con otra entrada XML anterior y un PDF alternativo',async()=>{
 const reference=JSON.parse(await readFile('tests/fixtures/piano-score.tree.json','utf8'));
 useXMLTree(reference);const ScoreDOM=globalThis.DOMParser;useXMLTree(reference.container);const ContainerDOM=globalThis.DOMParser;
 globalThis.DOMParser=class{parseFromString(source,type){return new (source.startsWith('<container>')?ContainerDOM:ScoreDOM)().parseFromString(source,type);}};
 const file=new File([await readFile('tests/fixtures/piano-score.mxl')],'piano.mxl');const score=await parseFile(file);
 assert.equal(score.parts[0].notation.length,10);assert.equal(score.parts[0].keys[0].fifths,-2);assert.equal(score.title,'Piano con cambio de tonalidad');
});
test('MusicXML conserva silencios, figuras, acordes y segmentos ligados sin cambiar el audio',async()=>{
 const {part}=await fixture();assert.equal(part.measures[0].duration,1);assert.equal(part.measures[1].start,1);assert.equal(part.measures[2].start,5);assert.equal(part.measures[2].numerator,3);
 const tied=part.notes.find(n=>n.start===.5&&n.staff===1);assert.equal(tied.duration,1);
 assert.equal(part.notation.filter(n=>n.step==='B'&&n.octave===4).length,3);assert.equal(part.notation.filter(n=>n.start===0&&n.staff===1).length,2);
 assert.deepEqual(part.notation.find(n=>n.rest&&!n.wholeRest).dots,2);assert.equal(part.notation.find(n=>n.wholeRest).start,5);
 assert.deepEqual(part.keys.map(k=>[k.start,k.fifths]),[[0,-2],[5,2]]);assert.equal(part.notation.find(n=>n.start===5&&!n.rest).accidental,'sharp');
 assert.ok(part.notation.some(n=>n.ties.includes('stop')));assert.equal(part.clefs.at(-1).sign,'G');
});
test('seguimiento usa anacrusa, sostiene posición en pausa y permite saltar o volver en bucle',async()=>{
 const {part}=await fixture();const a=pianoScoreWindow(part,.5),b=pianoScoreWindow(part,1),c=pianoScoreWindow(part,6),rewind=pianoScoreWindow(part,.5);
 assert.equal(a.current.number,1);assert.equal(b.current.number,2);assert.equal(c.current.number,3);assert.ok(c.offset>0);assert.deepEqual(a,rewind);assert.deepEqual(c,pianoScoreWindow(part,6));assert.equal(pianoScoreWindow(part,-4).offset,0);
 assert.equal(pianoScoreWindow(part,8).current.number,3);
});
test('armadura y preferencias por sección cambian nombres, sin cambiar alturas ni audio',async()=>{
 const {part}=await fixture(),notes=transformed(part,0,0,'all'),before=JSON.stringify(part),sections=[{startMeasure:3,endMeasure:3,spelling:'flats'}];
 assert.equal(spellingAt(part,0), 'flats');assert.equal(spellingAt(part,5),'sharps');assert.equal(spellingAt(part,5,{},sections),'flats');assert.equal(spellingAt(part,0,{noteSpelling:'sharps'}),'sharps');
 assert.equal(spellingAt(part,5,{noteSpelling:'flats'},[{startMeasure:3,endMeasure:3,spelling:'auto'}]),'sharps');
 assert.equal(noteName(61,true,4,'flats'),'Re♭4');assert.equal(noteName(61,false,4,'sharps'),'C♯4');
 assert.deepEqual(writtenPitch({step:'B',octave:4,alter:-1},'sharps'),{step:'A',octave:4,alter:1});assert.deepEqual(writtenPitch({step:'D',octave:4,alter:1},'flats'),{step:'E',octave:4,alter:-1});
 assert.equal(JSON.stringify(part),before);assert.deepEqual(transformed(part,0,0,'all'),notes);
});
test('estructura conserva la elección al validar, guardar JSON y convertir formato Compás',()=>{
 const s={id:'verse',name:'Verso',startMeasure:1,endMeasure:2,color:'#abcdef',spelling:'flats'};const structure=new Structure();structure.sections=validateStructure({version:1,sections:[s]},3);
 assert.equal(JSON.parse(JSON.stringify(structure.json())).sections[0].spelling,'flats');assert.equal(validateStructure(normalizeStructure({sections:[{...s,start:1,end:2,startMeasure:undefined,endMeasure:undefined}]}),3)[0].spelling,'flats');
 assert.throws(()=>validateStructure({version:1,sections:[{...s,spelling:'cualquier-cosa'}]},3),/alteraciones/);
 assert.equal(validateStructure({version:1,sections:[{...s,spelling:undefined}]},3)[0].spelling,undefined);
});
test('posiciones diatónicas respetan claves Sol/Fa y cambios de octava',()=>{
 assert.equal(staffY({step:'E',octave:4},{sign:'G',line:2},100),128);assert.equal(staffY({step:'G',octave:2},{sign:'F',line:4},100),128);assert.equal(staffY({step:'C',octave:4},{sign:'G',line:2},100),135);
 assert.equal(staffY({step:'G',octave:5},{sign:'G',line:2,octaveChange:1},100),121);
});
test('partitura opcional reemplaza cascada solo en piano y mantiene el teclado y exportación determinista',async()=>{
 const {part}=await fixture(),{ctx,calls}=context(),renderer=new Renderer({getContext:()=>ctx});Object.assign(renderer.opts,{instrument:'piano',base:36,cascade:true,showPianoScore:true});let cascades=0;renderer.drawCascade=()=>cascades++;
 const structure={sections:[],at(){},next(){}};renderer.draw(.5,part,transformed(part,0,0,'all'),structure,{tempoAt:()=>120,speed:1});assert.equal(cascades,0);assert.ok(calls.some(c=>c[0]==='ellipse'));assert.ok(calls.some(c=>c[0]==='fillText'&&String(c[1]).includes('PARTITURA')));
 assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='Do2'));renderer.opts.showPianoScore=false;renderer.draw(.5,part,[],structure,{tempoAt:()=>120,speed:1});assert.equal(cascades,1);
 const empty=context();drawPianoScore(empty.ctx,0,{measures:part.measures},{},[]);assert.ok(empty.calls.some(c=>c[0]==='fillText'&&String(c[1]).includes('Carga un MXL')));
});
test('trabajo local mantiene partitura escrita y alteraciones por sección, también en lotes',async()=>{
 const {part}=await fixture(),tutorial=prepareTutorial([part],0,{opts:{showPianoScore:true,noteSpelling:'auto'}});tutorial.sections=[{id:'s',name:'Cambio',startMeasure:3,endMeasure:3,color:'#abcdef',spelling:'flats'}];
 const job=createExportJob({title:'Piano',tutorials:[tutorial],clock:{part,end:8},audio:{tutorial:{},backingEvents:[],backingTracks:[]}}),copy=validateExportJob(JSON.parse(JSON.stringify(job)));
 assert.equal(copy.tutorials[0].opts.showPianoScore,true);assert.equal(copy.tutorials[0].part.notation.length,part.notation.length);assert.equal(spellingAt(copy.tutorials[0].part,5,copy.tutorials[0].opts,copy.tutorials[0].sections),'flats');
});
