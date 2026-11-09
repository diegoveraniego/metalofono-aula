import {test} from 'node:test';import assert from 'node:assert/strict';
import {Renderer,cascadeGeometry} from '../dist/js/renderer.js';
test('cascada: el borde de ataque llega a la línea al inicio, independiente de duración y altura física',()=>{
 const renderer=new Renderer({getContext:()=>({})});renderer.opts.cascade=true;const keys=renderer.layout(),naturals=keys.filter(k=>!k.sharp),sharps=keys.filter(k=>k.sharp);
 assert.ok(naturals.length&&sharps.length);assert.notEqual(naturals[0].y,sharps[0].y);
 for(const duration of [.125,1,8]){const box=cascadeGeometry(0,duration);assert.equal(box.y+box.height,box.line);assert.ok(keys.every(k=>k.y>box.line));}
 const approaching=cascadeGeometry(1),attack=cascadeGeometry(0),past=cascadeGeometry(-.1);assert.ok(approaching.bottom<attack.line);assert.ok(past.bottom>attack.line);assert.equal(cascadeGeometry(8).bottom,attack.top);
 for(const key of keys)assert.ok(key.y+key.h<700);
});
test('la guía se dibuja solo con cascada y también funciona para piano',()=>{
 const labels=[],c=new Proxy({fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{})}),renderer=new Renderer({getContext:()=>c});
 const part={measures:[{number:1,start:0,duration:4,numerator:4,denominator:4}]},structure={at:()=>null,next:()=>null},scheduler={tempoAt:()=>120,speed:1};renderer.opts.showStructure=false;
 renderer.draw(1,part,[],structure,scheduler);assert.ok(!labels.includes('TOCA AL LLEGAR A LA LÍNEA'));
 renderer.opts.cascade=true;renderer.draw(1,part,[],structure,scheduler);assert.ok(labels.includes('TOCA AL LLEGAR A LA LÍNEA'));
 renderer.opts.instrument='piano';const {line}=cascadeGeometry(0,1,'piano');assert.ok(renderer.layout().every(k=>k.y===line));
});

test('cascada de piano distingue las claves del MXL, también si coinciden las alturas o cambia la clave',async()=>{
 const {readFile}=await import('node:fs/promises'),{parseXML}=await import('../dist/js/parser.js'),{useXMLTree}=await import('./xml-dom.js'),{transformed}=await import('../dist/js/model.js'),{cascadeColor,PIANO_CLEF_COLORS}=await import('../dist/js/renderer.js');
 useXMLTree(JSON.parse(await readFile(new URL('./fixtures/piano-clefs.tree.json',import.meta.url))));const part=parseXML(await readFile(new URL('./fixtures/piano-clefs.musicxml',import.meta.url),'utf8')).parts[0],notes=transformed(part,0,0,'all');
 assert.deepEqual(notes.map(n=>[n.midi,n.staff,n.clef]),[[60,1,'G'],[60,2,'F'],[48,2,'G']]);assert.equal(cascadeColor(notes[0],{instrument:'piano'}),PIANO_CLEF_COLORS.G);assert.equal(cascadeColor(notes[1],{instrument:'piano'}),PIANO_CLEF_COLORS.F);assert.equal(cascadeColor(notes[2],{instrument:'piano'}),PIANO_CLEF_COLORS.G);assert.equal(cascadeColor({midi:36},{instrument:'piano'}),PIANO_CLEF_COLORS.unknown);
});
test('cada bloque de cascada puede mostrar su nombre sin adelantar el ataque',()=>{
 const labels=[],c=new Proxy({fillText:(...args)=>labels.push(args)},{get:(o,k)=>o[k]??(()=>{})}),renderer=new Renderer({getContext:()=>c});Object.assign(renderer.opts,{instrument:'piano',base:36,cascade:true,showCascadeNoteNames:true,latin:true,middle:4});
 renderer.drawCascade(0,renderer.layout(),[{midi:61,clef:'G',start:1,duration:.25}]);assert.ok(labels.some(([text])=>text==='Do♯4'));labels.length=0;renderer.opts.showCascadeNoteNames=false;renderer.drawCascade(0,renderer.layout(),[{midi:61,clef:'G',start:1,duration:.25}]);assert.ok(!labels.some(([text])=>text==='Do♯4'));
});
