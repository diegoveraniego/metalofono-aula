export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const LATIN=['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
export const ENGLISH=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const LATIN_FLAT=['Do','Re♭','Re','Mi♭','Mi','Fa','Sol♭','Sol','La♭','La','Si♭','Si'];
export const ENGLISH_FLAT=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
export function noteName(midi,latin=true,middle=4,spelling='sharps'){return (spelling==='flats'?(latin?LATIN_FLAT:ENGLISH_FLAT):(latin?LATIN:ENGLISH))[((midi%12)+12)%12]+(Math.floor(midi/12)-1+(middle-4));}
export function transformed(part,octave=0,semitones=0,mode='upper',pitchSource='written'){
 const groups=new Map();for(const n of part.notes){const key=Math.round(n.start*1e6);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...n,soundMidi:n.midi+12*octave+semitones,midi:(pitchSource==='written'?(n.writtenMidi??n.midi):n.midi)+12*octave+semitones});}
 let hand=0;return [...groups.values()].flatMap(g=>{g.sort((a,b)=>a.midi-b.midi);const chosen=mode==='all'?g:mode==='upper'?[g.at(-1)]:g.length>1?[g[0],g.at(-1)]:g;return chosen.map((n,i)=>({...n,hand:mode==='upper'?0:chosen.length===2?i:hand++%2}));}).sort((a,b)=>a.start-b.start||a.midi-b.midi);
}
export function rangeCount(part,base,shift,pitchSource='written',span=24){return part.notes.filter(n=>{const midi=pitchSource==='written'?(n.writtenMidi??n.midi):n.midi;return midi+shift<base||midi+shift>base+span;}).length;}
export function measureAt(part,beat){return part.measures.find(m=>beat>=m.start&&beat<m.start+m.duration)|| (beat<0?part.measures[0]:part.measures.at(-1));}
export function example(){let melody=[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60];let t=0;const notes=melody.map((midi,i)=>{const duration=[14,29].includes(i)?2:1;const n={id:'e'+i,midi,start:t,duration,measure:Math.floor(t/4)+1,beat:t%4+1,voice:'1',velocity:.75};t+=duration;return n;});return {version:1,title:'Himno a la Alegría',warnings:[],parts:[{id:'melody',name:'Melodía · Metalófono',notes,measures:Array.from({length:8},(_,i)=>({number:i+1,start:i*4,duration:4,numerator:4,denominator:4})),tempos:[{start:0,bpm:96}],meters:[{start:0,numerator:4,denominator:4}]}]};}
