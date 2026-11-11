import {visualTheme,musicalPalette} from './appearance.js';
// Cuerdas numeradas desde la más aguda. Afinación estándar, alturas reales.
export const TUNING=[64,59,55,50,45,40];
export const STRING_NAMES=['1.ª Mi aguda','2.ª Si','3.ª Sol','4.ª Re','5.ª La','6.ª Mi grave'];
export const STRING_COLORS=['#7b91bb','#a1bc90','#e4cd7a','#dfa270','#d68079','#a28abc'];
export function guitarNotes(notes,shift=0,tuning=TUNING){
 const used=new Map();return notes.map(n=>{const midi=(n.soundMidi??n.midi),occupied=used.get(n.start)??new Set();used.set(n.start,occupied);
 const valid=shift===0&&Number.isInteger(n.string)&&n.string>=1&&n.string<=tuning.length&&Number.isInteger(n.fret)&&n.fret>=0&&n.fret<=24&&tuning[n.string-1]+n.fret===midi&&!occupied.has(n.string);
 if(valid){occupied.add(n.string);return {...n,proposed:false};}
 const candidates=tuning.map((open,i)=>({string:i+1,fret:midi-open})).filter(p=>p.fret>=0&&p.fret<=24&&!occupied.has(p.string)).sort((a,b)=>a.fret-b.fret);
 const pos=candidates[0];if(pos)occupied.add(pos.string);return {...n,string:pos?.string,fret:pos?.fret,proposed:true};});
}
// El cifrado escrito en otra guitarra sirve de referencia para las partes sin símbolos.
export function guitarHarmonies(parts,selected){
 const own=selected.harmonies??[];
 const source=parts.filter(p=>p.id!==selected.id&&/guitarra|guitar/i.test(p.name)&&p.harmonies?.length).sort((a,b)=>b.harmonies.length-a.harmonies.length)[0];
 if(!source)return own;
 const byTime=new Map(source.harmonies.map(h=>[h.start,{...h,shared:true,source:source.name}]));
 for(const h of own)byTime.set(h.start,{...h,shared:false});
 return [...byTime.values()].sort((a,b)=>a.start-b.start);
}
export function harmonyLabel(harmony){return harmony?.kind==='power'?harmony.label.replace(/5(?=\/|$)/,''):harmony?.label??'';}
export function harmonyAt(part,beat){return (part.harmonies??[]).findLast(h=>h.start<=beat)??null;}
export function harmonyDiagram(harmony){return (harmony?.frame?.notes??[]).filter(n=>n.string>=1&&n.string<=6&&Number.isInteger(n.fret)&&n.fret>=0).map(n=>({...n,proposed:false}));}
export function drawGuitar(c,beat,notes,part,opts={}){
 const t=visualTheme(opts),stringColors=musicalPalette(opts).strings;
 const left=265,right=1510,hit=420,top=250,step=44,horizon=8;
 c.textAlign='left';c.fillStyle=t.ink;c.font='600 21px system-ui';c.fillText('CUERDAS Y TRASTES',65,169);c.font='18px system-ui';c.fillStyle=t.muted;c.fillText('Toca en la línea · Los números indican el traste · 0 = al aire',65,199);
 c.fillStyle=t.soft;c.fillRect(left,top-22,right-left,step*5+44);
 for(let s=0;s<6;s++){const y=top+s*step;c.fillStyle=t.ink;c.textAlign='left';c.font='600 19px system-ui';c.fillText(STRING_NAMES[s],65,y+6);c.strokeStyle=stringColors[s];c.lineWidth=1.5+s*.45;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();}
 c.textAlign='center';c.font='bold 24px system-ui';c.fillStyle=t.accent;
 for(const h of part.harmonies??[]){if(h.start<beat||h.start>beat+horizon)continue;const x=hit+(h.start-beat)/horizon*(right-hit);c.fillText(harmonyLabel(h),x,top-30);}
 c.save();c.beginPath();c.rect(left,top-23,right-left,step*5+46);c.clip();
 for(const m of part.measures){const delta=m.start-beat;if(delta<0||delta>horizon)continue;const x=hit+delta/horizon*(right-hit);c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(x,top-22);c.lineTo(x,top+step*5+22);c.stroke();}
 const xFor=t=>hit+(t-beat)/horizon*(right-hit);
 for(const n of notes){if(!n.string||n.start+n.duration<beat-.12||n.start>beat+horizon)continue;const y=top+(n.string-1)*step,x=xFor(Math.max(beat,n.start)),end=Math.min(right,xFor(n.start+n.duration)),active=n.start<=beat&&beat<n.start+n.duration;
 c.strokeStyle=stringColors[n.string-1];c.lineWidth=9;c.beginPath();c.moveTo(x,y);c.lineTo(Math.max(x,end),y);c.stroke();
 if(n.slide==='start'){const next=notes.find(v=>v.string===n.string&&v.start>n.start);if(next){c.setLineDash([5,4]);c.lineWidth=3;c.beginPath();c.moveTo(x+20,y-12);c.lineTo(xFor(next.start)-20,y-24);c.stroke();c.setLineDash([]);c.font='bold 15px system-ui';c.fillStyle=t.ink;c.textAlign='left';c.fillText('slide ↗',x+25,y-17);}}
 c.fillStyle=active?t.accent:t.panel;c.strokeStyle=stringColors[n.string-1];c.lineWidth=3;c.beginPath();c.roundRect(x-22,y-19,44,38,9);c.fill();c.stroke();c.fillStyle=active?t.onAccent:t.ink;c.textAlign='center';c.font='bold 26px system-ui';c.fillText(String(n.fret)+(n.proposed?'*':''),x,y+9);
 }
 c.restore();c.strokeStyle=t.accent;c.lineWidth=4;c.beginPath();c.moveTo(hit,top-27);c.lineTo(hit,top+step*5+27);c.stroke();c.fillStyle=t.accent;c.textAlign='center';c.font='bold 16px system-ui';c.fillText('TOCA AQUÍ',hit,top+step*5+53);
 const current=notes.filter(n=>n.string&&n.start<=beat+.025&&n.start+n.duration>beat);let upcoming=notes.find(n=>n.string&&n.start>beat);const soundingGroup=current.length?current:upcoming?notes.filter(n=>n.string&&Math.abs(n.start-upcoming.start)<.001):[];
 const harmony=harmonyAt(part,beat),diagram=harmonyDiagram(harmony),group=diagram.length?diagram:soundingGroup;
 c.textAlign='left';c.font='600 18px system-ui';c.fillStyle=t.ink;c.fillText(harmony?'ACORDE · '+harmonyLabel(harmony):group.length>1?(current.length?'ACORDE AHORA':'PRÓXIMO ACORDE'):(current.length?'AHORA':'PREPARA'),65,568);
 // Misma orientación que la tablatura: 1.ª arriba, 6.ª abajo; trastes hacia la derecha.
 const gx=151,gy=598,width=174,stringStep=18,fretted=group.filter(n=>n.fret>0),base=Math.max(1,Math.min(...fretted.map(n=>n.fret),1e3));
 const first=harmony?.frame?.firstFret??(base===1e3?1:base),frets=Math.max(4,...fretted.map(n=>n.fret-first+1)),fretWidth=width/frets;
 for(let f=0;f<=frets;f++){const x=gx+f*fretWidth;c.strokeStyle=t.line;c.lineWidth=f===0&&first===1?3:1;c.beginPath();c.moveTo(x,gy);c.lineTo(x,gy+5*stringStep);c.stroke();if(f<frets){c.fillStyle=t.muted;c.textAlign='center';c.font='12px system-ui';c.fillText(String(first+f),x+fretWidth/2,gy-11);}}
 for(let i=0;i<6;i++){const y=gy+i*stringStep,n=group.find(n=>n.string===i+1);c.strokeStyle=stringColors[i];c.lineWidth=1+i*.25;c.beginPath();c.moveTo(gx,y);c.lineTo(gx+width,y);c.stroke();
  c.textAlign='left';c.fillStyle=t.ink;c.font='600 13px system-ui';c.fillText(`${i+1}.ª ${['Mi','Si','Sol','Re','La','Mi'][i]}`,65,y+4);
  c.textAlign='center';c.fillText(n?(n.fret===0?'○':''):(diagram.length?'×':'—'),gx-16,y+4);
 }
 for(const n of fretted){const x=gx+(n.fret-first+.5)*fretWidth,y=gy+(n.string-1)*stringStep;c.fillStyle=stringColors[n.string-1];c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill();}
 c.textAlign='left';c.fillStyle=t.ink;c.font='600 19px system-ui';let y=579;for(const n of group){c.fillText(`${STRING_NAMES[n.string-1]} · ${n.fret===0?'al aire':'traste '+n.fret}${n.proposed?' *':''}`,350,y);y+=23;}
 c.fillStyle=t.muted;c.font='16px system-ui';c.fillText('Slide: desliza el dedo entre trastes sin levantarlo.',950,588);c.fillText('Acorde: toca juntas las cuerdas indicadas.',950,615);c.fillText(diagram.length?'× = no tocar · Diagrama de la partitura':'— = cuerda sin nota indicada · * posición propuesta',950,642);if(harmony?.shared){c.fillText('Cifrado compartido desde '+harmony.source,950,667);}else if(harmony&&!diagram.length){c.fillText('Sin diagrama en el archivo: posiciones de las notas.',950,667);}
}
