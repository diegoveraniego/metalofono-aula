import {test} from 'node:test';import assert from 'node:assert/strict';import {instructionDefaults,introDuration,instructionLines,drawVideoIntro} from '../dist/js/video-intro.js';
test('instrucción de guitarra es opcional y el lote usa una duración común sin perder texto por parte',()=>{
 const guitar=instructionDefaults('guitarra'),voice=instructionDefaults('voz');assert.equal(guitar.enabled,false);assert.ok(guitar.text.includes('acordes'));assert.ok(voice.text.includes('Canta'));assert.equal(introDuration([guitar,voice]),0);
 assert.equal(introDuration([{...guitar,enabled:true,seconds:6},{...voice,enabled:true,seconds:10}]),10);assert.equal(introDuration([{...guitar,enabled:true,text:'   '}]),0);assert.equal(introDuration([{...guitar,enabled:true,seconds:90}]),30);assert.equal(guitar.enabled,false);
});
test('instrucción se ajusta al ancho y respeta saltos de línea y palabras largas',()=>{
 const c={measureText:text=>({width:text.length*10})};const lines=instructionLines(c,'Toca la melodía\ny los acordes señalados. abcdefghijklmnop',80);assert.ok(lines.every(line=>c.measureText(line).width<=80));assert.equal(lines.slice(0,2).join(' '),'Toca la melodía');assert.ok(lines.join(' ').includes('acordes'));
});
test('pantalla de instrucción incluye obra, parte y texto editable antes de la entrada',()=>{
 const labels=[],ctx=new Proxy({measureText:text=>({width:text.length*15}),fillText:text=>labels.push(text)},{get:(o,k)=>o[k]??(()=>{})}),renderer={ctx,canvas:{width:1280,height:720}};
 drawVideoIntro(renderer,{title:'Obra',partName:'Guitarra eléctrica 1',text:'Toca la melodía.\nLuego los acordes.',remaining:5.2});assert.ok(labels.includes('Obra'));assert.ok(labels.includes('Guitarra eléctrica 1'));assert.ok(labels.includes('Toca la melodía.'));assert.ok(labels.includes('Luego los acordes.'));assert.ok(labels.includes('Comenzamos en 6 s'));
});
