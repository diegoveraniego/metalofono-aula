import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CHIMERA_BODIES,defaultChimeraBody,chimeraPhrases} from '../dist/js/chimera-score.js';
import {ChimeraManager} from '../dist/js/chimera.js';
import {parseXML} from '../dist/js/parser.js';
import {useXMLTree} from './xml-dom.js';
const syllable=text=>({text,onset:[],nucleus:{ipa:'ɑ',stress:1},coda:[],wordEnd:true,phraseEnd:false});
test('adaptador Chimera conserva melodía, silencios y melismas del MXL coral',async()=>{
 useXMLTree(JSON.parse(await readFile(new URL('./fixtures/somebody-choir.tree.json',import.meta.url))));const score=parseXML(await readFile(new URL('./fixtures/somebody-choir.musicxml',import.meta.url),'utf8'));
 const split=word=>Array.from({length:word.toLowerCase()==='anybody'?4:word.toLowerCase()==='somebody'?3:1},()=>syllable(word));
 for(const part of score.parts){const phrases=chimeraPhrases(part,(a,b)=>(b-a)*.5,split),notes=phrases.flatMap(p=>p.notes);assert.deepEqual(notes.map(n=>n.midi),part.notes.map(n=>n.midi));assert.equal(notes.reduce((sum,n)=>sum+n.beats,0),part.notes.reduce((sum,n)=>sum+n.duration,0));if(part.name==='Soprano')assert.ok(notes.some(n=>n.syl.melisma));assert.equal(notes.filter(n=>n.syl.text==='to').length,1);}
 assert.equal(defaultChimeraBody(score.parts[0]),'female');assert.equal(defaultChimeraBody(score.parts.at(-1)),'male');assert.deepEqual(CHIMERA_BODIES.child,{female:0,child:1});
});
test('Chimera respeta tempo variable, alturas sonoras, pausas y detecta texto incompatible',()=>{
 const part={name:'Tenor',lyrics:[{start:0,duration:1,text:'ah'},{start:3,duration:1,text:'oh'}],notes:[{start:0,duration:1,midi:72,soundMidi:60},{start:3,duration:1,midi:74,soundMidi:62}]};
 const phrases=chimeraPhrases(part,(a,b)=>(b-a),text=>[syllable(text)]);assert.equal(phrases.length,2);assert.deepEqual(phrases.map(p=>p.start),[0,3]);assert.deepEqual(phrases.flatMap(p=>p.notes).map(n=>[n.midi,n.beats]),[[60,2],[62,2]]);
 assert.throws(()=>chimeraPhrases(part,(a,b)=>b-a,()=>[]),/sílabas/);
});
test('audio Chimera comparte reloj y buses del player, conserva mute y no duplica audio externo',()=>{
 const starts=[],connections=[],sources=[],audio={ctx:{currentTime:10,createBufferSource(){const s={connect:bus=>connections.push(bus),start:(...args)=>starts.push(args),disconnect(){}};sources.push(s);return s;}},voices:new Set(),muted:false,getMelodyBus:()=> 'tutorial'},mix={tracks:new Map([['b',{id:'b',buffer:null}]]),audible:()=>true,bus:()=> 'backing',update(){}},manager=new ChimeraManager();manager.enabled=true;
 for(const id of ['s','b'])manager.records.set(id,{active:true,buffer:{duration:20}});
 const clock={position:4,anchorBeat:4,anchorTime:10.1,seconds:(a,b)=>(b-a)*.5};manager.start(clock,audio,mix,'s');assert.deepEqual(starts,[[10.1,2],[10.1,2]]);assert.deepEqual(connections,['tutorial','backing']);assert.equal(audio.voices.size,2);sources.forEach(s=>s.onended());assert.equal(audio.voices.size,0);
 starts.length=0;audio.muted=true;mix.tracks.get('b').buffer={duration:20};manager.start(clock,audio,mix,'s');assert.equal(starts.length,0);
});

test('coro Chimera comparte escenario y mantiene sílaba durante un melisma junto al fonema real',async()=>{
 const {chimeraChoirLayout,chimeraSungAt}=await import('../dist/js/chimera-view.js');
 const layout=chimeraChoirLayout(6,1920,685);assert.equal(layout.columns,6);assert.equal(layout.left(1),layout.left(0)+layout.w);assert.equal(layout.left(5)+layout.w,1875);
 const voice={notes:[{midi:60,start:0,duration:1},{midi:62,start:1,duration:1}],lyrics:[{text:'to',start:0,duration:1,extend:true}]},segments=[{ipa:'t',t0:0,t1:.1},{ipa:'uː',t0:.1,t1:2}];
 const first=chimeraSungAt(voice,.5,segments,.5),next=chimeraSungAt(voice,1.5,segments,1.5);assert.equal(first.text,'to');assert.equal(next.text,'to');assert.equal(first.syllable.start,next.syllable.start);assert.equal(next.ipa,'uː');assert.equal(chimeraSungAt(voice,2,segments,2).text,'');
});

test('vista individual Chimera muestra alturas y duraciones a la derecha sin rejilla',async()=>{
 const {drawChimeraMelody}=await import('../dist/js/chimera-view.js'),notes=[{midi:60,start:0,duration:1},{midi:64,start:1,duration:2}],voice={notes,lyrics:[{text:'to',start:0,duration:1,extend:true}]},rects=[],paths=[],labels=[];
 const c=new Proxy({measureText:t=>({width:t.length*8}),roundRect:(...args)=>rects.push(args),moveTo:(...args)=>paths.push(args),fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{})});
 drawChimeraMelody(c,.5,voice,{},800,1500,220,650);assert.ok(rects.length>=2);assert.ok(rects.every(r=>r[0]>=800));assert.ok(rects[0][1]>rects.at(-1)[1]);assert.ok(rects.at(-1)[2]>rects[0][2]);assert.equal(labels.filter(t=>t==='to').length,1);assert.ok(paths.length<=2);
});

test('vista Chimera usa Hershey y Archivo con fuentes locales y licencias',async()=>{
 const {CHIMERA_DISPLAY_FONT}=await import('../dist/js/chimera-view.js');assert.ok(CHIMERA_DISPLAY_FONT.includes('Hershey'));assert.ok(CHIMERA_DISPLAY_FONT.includes('Archivo'));
 const css=await readFile(new URL('../dist/fonts/chimera/fonts.css',import.meta.url),'utf8');assert.ok(css.includes('AVHersheySimplexLight.otf'));assert.ok(css.includes('archivo-latin-ext.woff2'));
 for(const name of ['AVHersheySimplexLight.otf','AVHersheySimplexMedium.otf','archivo-latin.woff2','archivo-latin-ext.woff2','AVHERSHEY-LICENSE.txt','OFL.txt'])assert.ok((await readFile(new URL('../dist/fonts/chimera/'+name,import.meta.url))).length>0);
});

test('cabello automático de female es largo y puede cambiarse independientemente del modelo',async()=>{
 const {chimeraHairStyle}=await import('../dist/js/chimera-score.js'),{drawChimeraHair}=await import('../dist/js/chimera-view.js');
 assert.equal(chimeraHairStyle('female'),'long');assert.equal(chimeraHairStyle('male'),'none');assert.equal(chimeraHairStyle('child','long'),'long');assert.equal(chimeraHairStyle('female','none'),'none');
 const curves=[],c=new Proxy({bezierCurveTo:(...args)=>curves.push(args)},{get:(o,k)=>o[k]??(()=>{})}),drawing={X:p=>p.x,Y:p=>-p.y},model={bodyParams:{scale:.9,pharynx:.9}};
 drawChimeraHair(c,drawing,model,'female','none','#ff73cf');assert.equal(curves.length,0);drawChimeraHair(c,drawing,model,'female','auto','#ff73cf');const long=curves.length;assert.ok(long>0);assert.ok(curves.flat().every(Number.isFinite));curves.length=0;drawChimeraHair(c,drawing,model,'female','short','#ff73cf');assert.ok(curves.length<long);
});

test('li-fe del MXL mantiene texto y tiempos incluso dentro de una ligadura, sosteniendo el diptongo de life',async()=>{
 const {chimeraLyricEntries,chimeraDisplayPart}=await import('../dist/js/chimera-score.js');useXMLTree(JSON.parse(await readFile(new URL('./fixtures/life-melisma.tree.json',import.meta.url))));const part=parseXML(await readFile(new URL('./fixtures/life-melisma.musicxml',import.meta.url),'utf8')).parts[0];
 const original=JSON.stringify(part),life={text:'life',onset:[{ipa:'l'}],nucleus:{ipa:'aɪ',stress:1},coda:[{ipa:'f'}],wordEnd:true,phraseEnd:false},split=text=>text==='life'?[life]:[syllable(text)];assert.equal(part.notes.length,2);
 const plan=chimeraPhrases(part,(a,b)=>(b-a)*.5,split).flatMap(p=>p.notes);assert.deepEqual(plan.map(n=>n.midi),[69,71,71]);assert.deepEqual(plan.map(n=>n.beats),[.5,.5,1]);assert.deepEqual(plan.map(n=>n.syl.text),['li','-','fe']);assert.equal(plan[2].syl.melisma,true);assert.equal(plan[0].syl.coda[0].ipa,'f');assert.equal(JSON.stringify(part),original);assert.deepEqual(chimeraLyricEntries(part).map(l=>[l.text,l.start]),[['li',0],['fe',1]]);const {chimeraSungAt}=await import('../dist/js/chimera-view.js');assert.equal(chimeraSungAt(part,.75).text,'li');assert.equal(chimeraSungAt(part,1.25).text,'fe');
 const edits={'1:0':'life','1:1':'-'},changed=chimeraPhrases({...part,chimeraLyricEdits:edits},(a,b)=>(b-a)*.5,split).flatMap(p=>p.notes);assert.deepEqual(changed.map(n=>n.syl.text),['life','-','-']);const display=chimeraDisplayPart(part,edits);assert.deepEqual(part.lyrics.map(l=>l.text),['li','fe']);assert.deepEqual(display.lyrics.map(l=>l.text),['life','_']);
});


test('tumbling usa las separaciones del MXL cuando el diccionario propone una sílaba adicional',()=>{
 const part={name:'Voz',notes:[{midi:60,start:0,duration:1},{midi:62,start:1,duration:1}],lyrics:[{text:'tum',start:0,duration:1,syllabic:'begin'},{text:'bling',start:1,duration:1,syllabic:'end'}]},split=text=>text==='tumbling'?[syllable('tum'),syllable('bel'),syllable('ing')]:[syllable(text)];
 assert.deepEqual(chimeraPhrases(part,(a,b)=>b-a,split)[0].notes.map(n=>n.syl.text),['tum','bling']);
});
