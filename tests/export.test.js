import {test} from 'node:test';import assert from 'node:assert/strict';import {zipFiles} from '../dist/js/zip-writer.js';import {unzip} from '../dist/js/parser.js';import {Exporter} from '../dist/js/exporter.js';
test('ZIP conserva nombres UTF-8, archivos separados y CRC32 correcto',async()=>{
 const blob=await zipFiles([{name:'01 - Voz.webm',blob:new Blob(['123456789'])},{name:'02 - Batería.webm',blob:new Blob(['drums'])}]),buffer=await blob.arrayBuffer(),view=new DataView(buffer);assert.equal(view.getUint32(14,true),0xcbf43926);const files=await unzip(buffer);assert.equal(await files.get('01 - Voz.webm')(),'123456789');assert.equal(await files.get('02 - Batería.webm')(),'drums');
});
test('grabación múltiple usa un reloj compartido, crea un video por parte y entrega un ZIP',async t=>{
 const previousRecorder=globalThis.MediaRecorder,previousStream=globalThis.MediaStream,recorders=[],saved=[],videoTracks=[],audioTrack={kind:'audio',stop(){throw Error('No detener el audio compartido');}};
 globalThis.MediaStream=class{constructor(tracks){this.tracks=tracks;}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video');}getAudioTracks(){return this.tracks.filter(t=>t.kind==='audio');}};
 globalThis.MediaRecorder=class{static isTypeSupported(){return true;}constructor(stream){this.stream=stream;this.state='inactive';this.id=recorders.length;recorders.push(this);}start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob(['video '+this.id])});this.onstop();});}};
 t.after(()=>{if(previousRecorder===undefined)delete globalThis.MediaRecorder;else globalThis.MediaRecorder=previousRecorder;if(previousStream===undefined)delete globalThis.MediaStream;else globalThis.MediaStream=previousStream;});
 const beats=[],tutorials=['Voz','Batería'].map(name=>({name,draw:beat=>beats.push([name,beat]),renderer:{canvas:{captureStream(){const track={kind:'video',stopped:false,stop(){this.stopped=true;}};videoTracks.push(track);return new MediaStream([track]);}}}}));
 let result;const audio={init:async()=>{},capture:{stream:new MediaStream([audioTrack])}},exporter=new Exporter(tutorials[0].renderer.canvas,audio,(blob,name)=>saved.push({blob,name}));
 await exporter.startBatch({tutorials,height:720,format:'webm',title:'Clase',onstop:r=>{result=r;}});assert.equal(exporter.active,true);assert.equal(recorders.length,2);assert.ok(recorders.every(r=>r.stream.getAudioTracks()[0]===audioTrack));exporter.drawBatch(12.5);assert.deepEqual(beats.slice(-2),[['Voz',12.5],['Batería',12.5]]);
 exporter.stop();await exporter.batchFinished;assert.equal(exporter.active,false);assert.ok(videoTracks.every(t=>t.stopped));assert.equal(saved.length,1);assert.equal(saved[0].name,'Clase - tutoriales.zip');const files=await unzip(await saved[0].blob.arrayBuffer());assert.equal(await files.get('01 - Voz.webm')(),'video 0');assert.equal(await files.get('02 - Batería.webm')(),'video 1');assert.equal(result.count,2);assert.equal(result.failed,false);
});

test('preparación de tutoriales mantiene voces, percusión y posiciones de bajo independientes',async()=>{
 const {readFile}=await import('node:fs/promises'),{useXMLTree}=await import('./xml-dom.js'),{parseXML}=await import('../dist/js/parser.js'),{prepareTutorial}=await import('../dist/js/tutorials.js');
 useXMLTree(JSON.parse(await readFile(new URL('./fixtures/rhythm-section.tree.json',import.meta.url))));const parts=parseXML(await readFile(new URL('./fixtures/rhythm-section.musicxml',import.meta.url),'utf8')).parts,bass=prepareTutorial(parts,0),drums=prepareTutorial(parts,1,{drumMix:{D:{36:{volume:0,muted:true}}}});
 assert.equal(bass.opts.instrument,'bajo');assert.deepEqual(bass.notes.map(n=>n.string),[5,2]);assert.ok(bass.notes.every(n=>!n.proposed));assert.equal(drums.opts.instrument,'bateria');assert.equal(drums.notes.length,3);assert.equal(drums.notes.find(n=>n.midi===36).drumGain,0);assert.equal(drums.opts.drumLanes.length,3);
});
