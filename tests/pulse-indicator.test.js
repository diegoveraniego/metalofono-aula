import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wholeBars,pulseState,drawPulseIndicator} from '../dist/js/rhythm.js';
import {visualTheme,DEFAULT_APPEARANCE} from '../dist/js/appearance.js';
import {vocalEntryCountdown} from '../dist/js/vocals.js';
test('indicador respeta numerador y denominador, cambios métricos y cuenta previa',()=>{
 const four={start:0,numerator:4,denominator:4},five={start:4,numerator:5,denominator:4},six={start:9,numerator:6,denominator:8};
 assert.deepEqual(pulseState(3,four),{count:4,denominator:4,index:3,unit:1});
 assert.equal(pulseState(8,five).index,4);assert.equal(pulseState(9,six).index,0);assert.equal(pulseState(11.5,six).index,5);
 assert.equal(pulseState(-3,four).index,1);assert.deepEqual(pulseState(1,four,{manualMeter:true,numerator:6,denominator:8}),{count:6,denominator:8,index:2,unit:.5});
});
test('números y puntos siguen el mismo pulso con el color de cada paleta',()=>{
 for(const theme of ['aula','nord','catppuccin-mocha']){
  const labels=[],dots=[],c={save(){},restore(){},beginPath(){},fill(){},fillText(text){labels.push({text,color:this.fillStyle});},arc(x,y,r){dots.push({x,y,r,color:this.fillStyle});}},opts={pulseStyle:'numbers',appearance:{...DEFAULT_APPEARANCE,menu:theme}};
  drawPulseIndicator(c,2.5,{start:0,numerator:6,denominator:8},{},opts);assert.deepEqual(labels.map(l=>l.text),['6/8','1','2','3','4','5','6']);assert.equal(labels.find(l=>l.text==='6').color,visualTheme(opts).warning);
  drawPulseIndicator(c,2.5,{start:0,numerator:6,denominator:8},{},{...opts,pulseStyle:'dots'});assert.equal(dots.length,6);assert.equal(dots[5].r,6);assert.equal(dots[5].color,visualTheme(opts).warning);
 }
});
test('contador mantiene enteros visibles durante fracciones de compás',()=>{
 assert.equal(wholeBars(2.5),2);assert.equal(wholeBars(2.75),2);assert.equal(wholeBars(3),3);assert.equal(wholeBars(.5),0);
 const bars=Array.from({length:4},(_,i)=>({start:i*4,duration:4,numerator:4,denominator:4}));
 assert.equal(vocalEntryCountdown(0,10,bars).label,'Entrada en 10 pulsos (2 compases)');assert.equal(vocalEntryCountdown(0,11,bars).label,'Entrada en 11 pulsos (2 compases)');
});
