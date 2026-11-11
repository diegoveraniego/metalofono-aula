import {test} from 'node:test';
import assert from 'node:assert/strict';
import {alphaScoreCompatible} from '../dist/js/alpha-score.js';
test('alphaTab se reserva para la notación original, evitando desajustes al transponer o filtrar',()=>{
 const part={notes:[{midi:52,start:0,duration:1}]};assert.ok(alphaScoreCompatible([{midi:64,soundMidi:52,start:0,duration:1}],part));assert.ok(!alphaScoreCompatible([{midi:64,soundMidi:64,start:0,duration:1}],part));assert.ok(!alphaScoreCompatible([],part));
});
test('worker real de alphaTab prepara SVG, compases, ritmos y coordenadas del cursor',async()=>{
 const tuning=[['E',2],['A',2],['D',3],['G',3],['B',3],['E',4]].map(([step,octave],i)=>`<staff-tuning line="${i+1}"><tuning-step>${step}</tuning-step><tuning-octave>${octave}</tuning-octave></staff-tuning>`).join('');
 const xml=`<score-partwise version="4.0"><part-list><score-part id="G"><part-name>Guitarra</part-name></score-part></part-list><part id="G"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines>${tuning}</staff-details></attributes><note><pitch><step>A</step><octave>2</octave></pitch><duration>4</duration><type>whole</type><notations><technical><string>5</string><fret>0</fret></technical></notations></note></measure></part></score-partwise>`;
 const old=globalThis.self;let result;try{globalThis.self={postMessage:value=>{result=value;}};await import('../dist/js/alpha-score-worker.js?test');await self.onmessage({data:{xml,track:0,ink:'#233d35',line:'#d3d9ce',muted:'#728078'}});assert.equal(result.error,undefined);assert.ok(result.images.length);assert.match(result.images[0].svg,/<svg/);assert.ok(result.rows.length);assert.ok(result.rows[0].bars[0].beats.length);assert.ok(Number.isFinite(result.rows[0].bars[0].beats[0].x));}finally{if(old===undefined)delete globalThis.self;else globalThis.self=old;}
});
