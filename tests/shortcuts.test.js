import {test} from 'node:test';import assert from 'node:assert/strict';import {playerShortcutHandlers,pulseSeekTarget} from '../dist/js/shortcuts.js';
function event(key,{field=false,transportSelect=false,...extra}={}){return {key,code:key===' '?'Space':key,target:{closest:selector=>(selector==='.stage-card select'?transportSelect:field)?{}:null},preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};}
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


test('espacio y flechas controlan el player desde sus selectores sin cambiar sus opciones',()=>{
 const h=setup(),space=event(' ',{field:true,transportSelect:true});h.keydown(space);assert.equal(space.prevented,true);assert.equal(space.stopped,true);assert.deepEqual(h.calls,['toggle']);
 const up=event(' ',{field:true,transportSelect:true});h.keyup(up);assert.equal(up.prevented,true);
 const arrow=event('ArrowLeft',{field:true,transportSelect:true});h.keydown(arrow);assert.equal(arrow.prevented,true);assert.deepEqual(h.calls,['toggle',-1]);
 h.state.dialog=true;const dialogSpace=event(' ',{field:true,transportSelect:true});h.keydown(dialogSpace);assert.equal(dialogSpace.prevented,undefined);
});


test('flechas saltan por pulso y respetan 4/4, 6/8, fronteras y extremos',()=>{
 const part={measures:[{start:0,duration:4,denominator:4},{start:4,duration:3,denominator:8}]};
 assert.equal(pulseSeekTarget(part,0,1),1);assert.equal(pulseSeekTarget(part,1.4,1),2);assert.equal(pulseSeekTarget(part,1.4,-1),1);
 assert.equal(pulseSeekTarget(part,4,1),4.5);assert.equal(pulseSeekTarget(part,4,-1),3);assert.equal(pulseSeekTarget(part,4.5,-1),4);
 assert.equal(pulseSeekTarget(part,7,1),7);assert.equal(pulseSeekTarget(part,0,-1),0);
 assert.equal(pulseSeekTarget(part,1,1,{denominator:8}),1.5);
});
