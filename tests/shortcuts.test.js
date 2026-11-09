import {test} from 'node:test';import assert from 'node:assert/strict';import {playerShortcutHandlers} from '../dist/js/shortcuts.js';
function event(key,{field=false,...extra}={}){return {key,code:key===' '?'Space':key,target:{closest:()=>field?{}:null},preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};}
function setup(){const calls=[],state={dialog:false,recording:false},handlers=playerShortcutHandlers({isDialogOpen:()=>state.dialog,isRecording:()=>state.recording,onToggle:()=>calls.push('toggle'),onMeasure:n=>calls.push(n),onEscape:()=>calls.push('escape')});return {calls,state,...handlers};}
test('espacio y flechas controlan el player aunque el foco esté en configuración u otro botón',()=>{
 const h=setup(),space=event(' ');h.keydown(space);assert.equal(space.prevented,true);assert.equal(space.stopped,true);assert.deepEqual(h.calls,['toggle']);const up=event(' ');h.keyup(up);assert.equal(up.prevented,true);
 h.keydown(event('ArrowLeft'));h.keydown(event('ArrowRight'));assert.deepEqual(h.calls,['toggle',-1,1]);
});
test('los campos, diálogos y combinaciones del navegador mantienen su comportamiento',()=>{
 const h=setup();for(const e of [event(' ',{field:true}),event('ArrowLeft',{field:true}),event(' ',{ctrlKey:true}),event('ArrowRight',{altKey:true}),event(' ',{isComposing:true})]){h.keydown(e);assert.equal(e.prevented,undefined);}
 h.state.dialog=true;const inside=event(' ');h.keydown(inside);assert.equal(inside.prevented,undefined);assert.deepEqual(h.calls,[]);
});
test('mantener espacio no alterna pausa continuamente ni activa el botón enfocado durante grabación',()=>{
 const h=setup();h.keydown(event(' '));const repeated=event(' ',{repeat:true});h.keydown(repeated);assert.equal(repeated.prevented,true);assert.deepEqual(h.calls,['toggle']);
 h.state.recording=true;const space=event(' '),arrow=event('ArrowRight');h.keydown(space);h.keydown(arrow);assert.equal(space.prevented,true);assert.equal(arrow.prevented,true);assert.deepEqual(h.calls,['toggle']);
});
