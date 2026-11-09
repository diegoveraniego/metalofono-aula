import {contrastColor} from './progress.js';
import {visualTheme,musicalPalette} from './appearance.js';
// Números MIDI internos (0–127), distintos del campo MusicXML midi-unpitched (1–128).
export const DRUMS=[
 {id:'crash',name:'Crash',midi:49,symbol:'x',order:0,color:'#dfa270',members:[49,52,55]},
 {id:'crash2',name:'Crash 2',midi:57,symbol:'x',order:.5,color:'#d6bb9b',members:[57]},
 {id:'ride',name:'Ride',midi:51,symbol:'x',order:1,color:'#e4cd7a',members:[51,53,59]},
 {id:'hatClosed',name:'Hi-hat cerrado',midi:42,symbol:'x',order:2,color:'#7b91bb',members:[42]},
 {id:'hatOpen',name:'Hi-hat abierto',midi:46,symbol:'circle-x',order:3,color:'#94c3d1',members:[46]},
 {id:'tomHigh',name:'Tom 1 · agudo',midi:50,symbol:'normal',order:4,color:'#a1bc90',members:[48,50]},
 {id:'tomMid',name:'Tom 2 · medio',midi:47,symbol:'normal',order:5,color:'#b9ccc0',members:[45,47]},
 {id:'tomFloor',name:'Tom de piso',midi:41,symbol:'normal',order:6,color:'#a28abc',members:[41,43]},
 {id:'snare',name:'Caja',midi:38,symbol:'normal',order:7,color:'#d68079',members:[38,40]},
 {id:'crossStick',name:'Aro / cross-stick',midi:37,symbol:'x',order:8,color:'#d3b6a4',members:[37]},
 {id:'kick',name:'Bombo',midi:36,symbol:'normal',order:9,color:'#d6bb9b',members:[35,36]},
 {id:'hatPedal',name:'Pedal hi-hat',midi:44,symbol:'x',order:10,color:'#b7c7d6',members:[44]}
];
export function drumInfo(midi){return DRUMS.find(d=>d.members.includes(midi))??{id:'midi'+midi,midi,name:'Percusión '+midi,symbol:'normal',order:100+midi,color:'#b7c7d6'};}
// Mapa de pentagrama confirmado por el docente para este material de MuseScore.
export const DRUM_STAFF_MAP=[
 {step:'D',octave:4,midi:44,name:'Pedal hi-hat'},
 {step:'F',octave:4,midi:36,name:'Bombo'},
 {step:'A',octave:4,midi:41,name:'Tom de piso'},
 {step:'C',octave:5,midi:38,name:'Caja'},
 {step:'D',octave:5,midi:47,name:'Tom 2'},
 {step:'E',octave:5,midi:50,name:'Tom 1'},
 {step:'F',octave:5,midi:49,name:'Crash'},
 {step:'G',octave:5,midi:42,name:'Hi-hat cerrado',head:'x'},
 {step:'G',octave:5,midi:46,name:'Hi-hat abierto',head:'circle-x'},
 {step:'A',octave:5,midi:57,name:'Crash 2'}
];
export function drumStaffMidi(note){
 if(note.displayStep==='G'&&note.displayOctave===5)return ['circle-x','circle','o'].includes(note.notehead)?46:42;
 return DRUM_STAFF_MAP.find(d=>d.step===note.displayStep&&d.octave===note.displayOctave)?.midi??note.midi;
}
export function mappedDrumMidi(note,mapping={}){return Number.isInteger(mapping[note.midi])?mapping[note.midi]:drumStaffMidi(note);}
export function drumNotes(notes,mapping={},mix={}){return notes.map(n=>{const midi=mappedDrumMidi(n,mapping),channel=mix[n.midi]??{},gain=channel.muted?0:Math.max(0,Math.min(2,channel.volume??1));return {...n,sourceMidi:n.midi,midi,soundMidi:midi,drum:true,drumGain:gain};});}
export function drumLanes(notes){return [...new Set(notes.map(n=>n.midi))].map(midi=>({...drumInfo(midi),midi})).sort((a,b)=>a.order-b.order||a.midi-b.midi);}
function head(c,x,y,symbol,size,color){
 c.strokeStyle=color;c.fillStyle=color;c.lineWidth=3;
 if(symbol==='x'||symbol==='circle-x'){c.beginPath();c.moveTo(x-size*.6,y-size*.6);c.lineTo(x+size*.6,y+size*.6);c.moveTo(x+size*.6,y-size*.6);c.lineTo(x-size*.6,y+size*.6);c.stroke();if(symbol==='circle-x'){c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.stroke();}}
 else{c.beginPath();c.ellipse(x,y,size,size*.72,-.35,0,Math.PI*2);c.fill();}
}
export function drawDrums(c,beat,notes,part,opts={}){
 const t=visualTheme(opts);
 const music=musicalPalette(opts),lanes=(opts.drumLanes??drumLanes(part.notes)).map((d,i)=>({...d,color:visualTheme(opts).id==='aula'?d.color:music.strings[i%music.strings.length]})),left=280,right=1510,hit=420,horizon=8,top=244,step=Math.min(58,290/Math.max(1,lanes.length-1)),bottom=top+(lanes.length-1)*step;
 c.textAlign='left';c.fillStyle=t.ink;c.font='600 21px system-ui';c.fillText('BATERÍA / CLAVE DE PERCUSIÓN',65,169);c.fillStyle=t.muted;c.font='18px system-ui';c.fillText('Golpea al llegar a la línea · Los nombres indican qué parte de la batería tocar',65,199);
 c.fillStyle=t.soft;c.fillRect(left,top-22,right-left,Math.max(44,bottom-top+44));
 lanes.forEach((d,i)=>{const y=top+i*step;c.fillStyle=t.ink;c.textAlign='left';c.font='600 18px system-ui';c.fillText(d.name,65,y+6);head(c,252,y,d.symbol,7,d.color);c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();});
 const x=t=>hit+(t-beat)/horizon*(right-hit);
 c.save();c.beginPath();c.rect(left,top-24,right-left,Math.max(48,bottom-top+48));c.clip();
 for(const m of part.measures){if(m.start<beat||m.start>beat+horizon)continue;c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(x(m.start),top-22);c.lineTo(x(m.start),bottom+22);c.stroke();}
 for(const n of notes){if(n.start<beat-.16||n.start>beat+horizon)continue;const i=lanes.findIndex(d=>d.midi===n.midi);if(i<0)continue;const d=lanes[i],active=n.start<=beat,xx=active?hit:x(n.start),y=top+i*step;if(active){c.fillStyle=d.color;c.globalAlpha=.3;c.beginPath();c.arc(xx,y,22,0,Math.PI*2);c.fill();c.globalAlpha=1;}head(c,xx,y,d.symbol,active?12:10,active?t.accent:d.color);}
 c.restore();c.strokeStyle=t.accent;c.lineWidth=4;c.beginPath();c.moveTo(hit,top-27);c.lineTo(hit,bottom+27);c.stroke();c.textAlign='center';c.fillStyle=t.accent;c.font='bold 16px system-ui';c.fillText('TOCA AQUÍ',hit,bottom+53);
 // Tarjetas de cada elemento, con el mismo color que su carril y destello en el ataque.
 const width=Math.min(250,1450/Math.max(1,lanes.length));
 lanes.forEach((d,i)=>{const xx=75+i*width,active=notes.some(n=>n.midi===d.midi&&n.start<=beat&&beat-n.start<.16);c.fillStyle=active?d.color:t.soft;c.beginPath();c.roundRect(xx,609,width-10,69,10);c.fill();head(c,xx+(width-10)/2,630,d.symbol,8,active?contrastColor(d.color):t.accent);c.fillStyle=active?contrastColor(d.color):t.ink;c.textAlign='center';c.font='600 15px system-ui';c.fillText(d.name,xx+(width-10)/2,660,width-20);});
}
