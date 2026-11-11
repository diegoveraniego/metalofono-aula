import {visualTheme,musicalPalette} from './appearance.js';
import {TUNING,harmonyAt,harmonyLabel,harmonyDiagram} from './guitar.js';
import {bassTuning} from './bass.js';
import {noteName} from './model.js';
// Compases fijos: el tiempo mueve el cursor, nunca las notas dentro de la página.
export function stringScorePage(measures,beat,perPage=8){
 const index=Math.max(0,measures.findLastIndex(m=>m.start<=Math.max(0,beat))),stride=Math.max(1,Math.floor(perPage/2)),start=Math.floor(index/stride)*stride;
 return {start,measures:measures.slice(start,start+perPage),index};
}
// Indexa la partitura completa una sola vez; el dibujo no vuelve a buscar cada nota por frame.
const scoreIndexes=new WeakMap();
export function prepareStringScore(notes,part){
 const previous=scoreIndexes.get(notes);if(previous?.measures===part.measures&&previous.notation===part.notation&&previous.harmonies===part.harmonies)return previous.bars;
 const bars=part.measures.map(m=>({measure:m,notes:[],rests:[],harmonies:[]}));
 const locate=time=>{let lo=0,hi=bars.length;while(lo<hi){const mid=(lo+hi)>>1;if(bars[mid].measure.start<=time)lo=mid+1;else hi=mid;}return Math.max(0,lo-1);};
 const notation=new Map();for(const v of part.notation??[]){if(v.rest){const bar=bars[locate(v.start)];if(bar)bar.rests.push(v);}else{const key=Math.round(v.start*1e6)+':'+v.voice;if(!notation.has(key))notation.set(key,v);}}
 for(const n of notes){if(!n.string)continue;const written=notation.get(Math.round(n.start*1e6)+':'+n.voice),next=n.slide==='start'?notes.find(v=>v.string===n.string&&v.start>n.start):null;for(let i=locate(n.start);i<bars.length&&bars[i].measure.start<n.start+n.duration-1e-6;i++){const m=bars[i].measure;if(n.start<m.start+m.duration-1e-6)bars[i].notes.push({note:n,written,next});}}
 for(const h of part.harmonies??[]){const bar=bars[locate(h.start)];if(bar)bar.harmonies.push(h);}
 scoreIndexes.set(notes,{measures:part.measures,notation:part.notation,harmonies:part.harmonies,bars});return bars;
}
export function stringScoreX(measure,beat,left,width){return left+24+Math.max(0,Math.min(1,(beat-measure.start)/measure.duration))*(width-40);}
export function drawStringScore(c,beat,notes,part,opts={}){
 const t=visualTheme(opts),colors=musicalPalette(opts).strings,tuning=opts.instrument==='bajo'?bassTuning(part):part.tuning?.length?part.tuning:TUNING,page=stringScorePage(part.measures,beat),bars=prepareStringScore(notes,part),step=22,rowHeight=180,barWidth=337,left=170;
 c.textAlign='left';c.fillStyle=t.muted;c.font='17px system-ui';c.fillText('TABLATURA · Lee de izquierda a derecha · 0 = cuerda al aire · * posición propuesta',65,165);
 page.measures.forEach((m,i)=>{
  const row=Math.floor(i/4),column=i%4,x=left+column*barWidth,top=235+row*rowHeight,bottom=top+(tuning.length-1)*step,xx=b=>stringScoreX(m,b,x,barWidth),active=beat>=m.start&&beat<m.start+m.duration;
  if(active){c.fillStyle=t.soft;c.fillRect(x,top-15,barWidth,bottom-top+66);}
  c.fillStyle=t.muted;c.font='14px system-ui';c.textAlign='left';c.fillText(String(m.number),x+4,top-24);
  if(column===0){tuning.forEach((pitch,s)=>{c.fillStyle=t.ink;c.font='15px system-ui';c.fillText(`${s+1}.ª ${noteName(pitch,opts.latin,opts.middle??4,opts.displaySpelling)}`,65,top+s*step+5);});}
  const previous=part.measures[page.start+i-1];if(column===0||!previous||previous.numerator!==m.numerator||previous.denominator!==m.denominator){c.fillStyle=t.ink;c.font='bold 18px system-ui';c.fillText(`${m.numerator}/${m.denominator}`,x+5,top-47);}
  for(let s=0;s<tuning.length;s++){c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(x,top+s*step);c.lineTo(x+barWidth,top+s*step);c.stroke();}
  for(const bx of [x,x+barWidth]){c.strokeStyle=t.muted;c.beginPath();c.moveTo(bx,top);c.lineTo(bx,bottom);c.stroke();}
  const pulse=4/m.denominator;for(let p=0;p<m.duration-1e-6;p+=pulse){const px=xx(m.start+p);c.fillStyle=t.muted;c.font='11px system-ui';c.textAlign='center';c.fillText(String(Math.round(p/pulse)+1),px,bottom+42);}
  for(const h of bars[page.start+i].harmonies){if(h.start>=m.start&&h.start<m.start+m.duration){c.fillStyle=t.accent;c.font='600 17px system-ui';c.textAlign='center';c.fillText(harmonyLabel(h),xx(h.start),top-8);}}
  const visible=bars[page.start+i].notes;
  if(!visible.length){c.fillStyle=t.ink;c.font='22px NotoMusic, serif';c.textAlign='center';c.fillText('𝄻',x+barWidth/2,top+step*2);}
  for(const rest of bars[page.start+i].rests){if(!rest.rest||rest.start<m.start||rest.start>=m.start+m.duration||!visible.length)continue;c.fillStyle=t.ink;c.font='21px NotoMusic, serif';c.textAlign='center';c.fillText(({whole:'𝄻',half:'𝄼',quarter:'𝄽',eighth:'𝄾','16th':'𝄿'})[rest.type]??'𝄽',xx(rest.start),top+step*2);}
  for(const {note:n,written,next} of visible){const nx=xx(Math.max(m.start,n.start)),y=top+(n.string-1)*step,on=beat>=n.start&&beat<n.start+n.duration,label=String(n.fret)+(n.proposed?'*':'');c.font='600 19px system-ui';const w=c.measureText(label).width+8;c.fillStyle=active?t.soft:t.bg;c.fillRect(nx-w/2,y-11,w,22);c.fillStyle=on?t.accent:t.ink;c.textAlign='center';c.fillText(label,nx,y+6);
   if(n.start<m.start){c.strokeStyle=t.muted;c.beginPath();c.arc(nx,y+15,9,Math.PI,Math.PI*2);c.stroke();}
   if(n.start>=m.start){const duration=written?.duration??n.duration;c.strokeStyle=t.ink;c.lineWidth=1.5;if(duration<4){c.beginPath();c.moveTo(nx,bottom+7);c.lineTo(nx,bottom+26);c.stroke();for(let f=0;f<Math.max(0,written?.type?({eighth:1,'16th':2,'32nd':3,'64th':4}[written.type]??0):Math.ceil(Math.log2(1/duration)-1e-6));f++){c.beginPath();c.moveTo(nx,bottom+26-f*5);c.lineTo(nx+9,bottom+22-f*5);c.stroke();}}if(written?.dots){c.fillStyle=t.ink;for(let d=0;d<written.dots;d++){c.beginPath();c.arc(nx+w/2+4+d*5,y-3,1.7,0,Math.PI*2);c.fill();}}if(written?.tuplet){c.font='11px system-ui';c.fillStyle=t.muted;c.fillText(String(written.tuplet),nx,bottom+17);}}
   if(n.slide==='start'){if(next&&next.start<m.start+m.duration){c.strokeStyle=colors[(n.string-1)%colors.length];c.beginPath();c.moveTo(nx+13,y+8);c.lineTo(xx(next.start)-12,y-8);c.stroke();}}
  }
  if(active){const cursor=xx(beat);c.strokeStyle=t.accent;c.lineWidth=3;c.beginPath();c.moveTo(cursor,top-17);c.lineTo(cursor,bottom+30);c.stroke();}
 });
 drawStringChord(c,beat,notes,part,opts,tuning);
}
export function drawStringChord(c,beat,notes,part,opts={},tuning=TUNING){
 const t=visualTheme(opts),colors=musicalPalette(opts).strings,h=harmonyAt(part,beat),written=harmonyDiagram(h).filter(n=>n.string<=tuning.length),group=written.length?written:notes.filter(n=>n.string&&n.start<=beat&&n.start+n.duration>beat),fretted=group.filter(n=>n.fret>0),first=h?.frame?.firstFret??(fretted.length?Math.max(1,Math.min(...fretted.map(n=>n.fret))):1),gx=740,gy=610,width=170,step=13,frets=Math.max(4,...fretted.map(n=>n.fret-first+1));
 if(!h&&group.length<2)return;
 c.fillStyle=t.ink;c.font='600 22px system-ui';c.textAlign='center';c.fillText(h?'ACORDE · '+harmonyLabel(h):'ACORDE',800,589);
 for(let f=0;f<=frets;f++){c.strokeStyle=t.line;c.lineWidth=f===0&&first===1?3:1;c.beginPath();c.moveTo(gx+f*width/frets,gy);c.lineTo(gx+f*width/frets,gy+(tuning.length-1)*step);c.stroke();}
 tuning.forEach((pitch,s)=>{const y=gy+s*step;c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(gx,y);c.lineTo(gx+width,y);c.stroke();c.fillStyle=t.ink;c.font='11px system-ui';c.textAlign='right';c.fillText(`${s+1}.ª`,gx-25,y+4);const n=group.find(n=>n.string===s+1);c.fillText(n?.fret===0?'○':!n&&written.length?'×':'',gx-8,y+4);});
 for(const n of fretted){c.fillStyle=colors[(n.string-1)%colors.length];c.beginPath();c.arc(gx+(n.fret-first+.5)*width/frets,gy+(n.string-1)*step,5,0,Math.PI*2);c.fill();}
 c.fillStyle=t.muted;c.font='12px system-ui';c.textAlign='left';c.fillText(`Traste ${first}`,gx+width+14,gy+14);
}
