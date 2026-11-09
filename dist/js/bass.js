import {visualTheme,musicalPalette} from './appearance.js';
import {guitarNotes,STRING_COLORS} from './guitar.js';
import {noteName} from './model.js';
export const BASS_TUNING=[43,38,33,28,23];
export function bassTuning(part){return part.tuning?.length>=4&&part.tuning.length<=6?part.tuning:BASS_TUNING;}
export function bassNotes(notes,part){return guitarNotes(notes,0,bassTuning(part));}
export function drawBass(c,beat,notes,part,opts={}){
 const t=visualTheme(opts),stringColors=musicalPalette(opts).strings;
 const tuning=bassTuning(part),left=265,right=1510,hit=420,top=240,step=65,horizon=8;
 c.textAlign='left';c.fillStyle=t.ink;c.font='600 21px system-ui';c.fillText(`BAJO / ${tuning.length} CUERDAS`,65,169);c.fillStyle=t.muted;c.font='18px system-ui';c.fillText('Toca al llegar a la línea · Número = traste · 0 = cuerda al aire',65,199);
 c.fillStyle=t.soft;c.fillRect(left,top-24,right-left,(tuning.length-1)*step+48);
 tuning.forEach((midi,i)=>{const y=top+i*step;c.fillStyle=t.ink;c.textAlign='left';c.font='600 19px system-ui';c.fillText(`${i+1}.ª ${noteName(midi,opts.latin,opts.middle)}`,65,y+6);c.strokeStyle=stringColors[i%6];c.lineWidth=2+i*.5;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();});
 const x=t=>hit+(t-beat)/horizon*(right-hit);
 c.save();c.beginPath();c.rect(left,top-24,right-left,(tuning.length-1)*step+48);c.clip();
 for(const m of part.measures){if(m.start<beat||m.start>beat+horizon)continue;c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(x(m.start),top-24);c.lineTo(x(m.start),top+(tuning.length-1)*step+24);c.stroke();}
 for(const n of notes){if(!n.string||n.start+n.duration<beat||n.start>beat+horizon)continue;const active=n.start<=beat&&n.start+n.duration>beat,xx=x(Math.max(beat,n.start)),y=top+(n.string-1)*step;c.strokeStyle=stringColors[(n.string-1)%6];c.lineWidth=9;c.beginPath();c.moveTo(xx,y);c.lineTo(Math.min(right,x(n.start+n.duration)),y);c.stroke();c.fillStyle=active?t.accent:t.panel;c.lineWidth=3;c.beginPath();c.roundRect(xx-23,y-20,46,40,9);c.fill();c.stroke();c.fillStyle=active?t.onAccent:t.ink;c.textAlign='center';c.font='bold 26px system-ui';c.fillText(String(n.fret)+(n.proposed?'*':''),xx,y+9);}
 c.restore();c.strokeStyle=t.accent;c.lineWidth=4;c.beginPath();c.moveTo(hit,top-30);c.lineTo(hit,top+(tuning.length-1)*step+30);c.stroke();c.textAlign='center';c.fillStyle=t.accent;c.font='bold 16px system-ui';c.fillText('TOCA AQUÍ',hit,top+(tuning.length-1)*step+55);
 c.textAlign='left';c.fillStyle=t.muted;c.font='18px system-ui';c.fillText('La cuerda más aguda está arriba · * posición propuesta',65,627);
 const current=notes.filter(n=>n.string&&n.start<=beat&&n.start+n.duration>beat);c.fillStyle=t.ink;c.font='600 23px system-ui';c.fillText(current.length?current.map(n=>`${n.string}.ª cuerda · ${n.fret===0?'al aire':'traste '+n.fret} · ${noteName(n.soundMidi??n.midi,opts.latin,opts.middle)}`).join(' / '):'Escucha el acompañamiento y prepara tu entrada.',65,667);
}
