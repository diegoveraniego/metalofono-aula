import {visualTheme,musicalPalette} from './appearance.js';
import {noteName,clamp} from './model.js';
const entryNumber=new Intl.NumberFormat('es-CL',{maximumFractionDigits:2});

// La escala se calcula una vez para toda la parte: una altura siempre queda en la misma fila.
export function vocalPitchRange(notes=[]){
 const pitches=notes.map(n=>n.midi).filter(Number.isFinite);
 if(!pitches.length)return {low:58,high:74};
 let low=Math.min(...pitches)-2,high=Math.max(...pitches)+2;
 if(high-low<12){const middle=(high+low)/2;low=Math.floor(middle-6);high=low+12;}
 return {low,high};
}

export function vocalPhrases(lyrics=[],notes=[],verse){
 const selected=verse??(lyrics.some(l=>l.verse==='1')?'1':lyrics[0]?.verse??'1');
 const timeline=lyrics.filter(l=>(l.verse??'1')===selected).map(l=>({...l})).sort((a,b)=>a.start-b.start);
 // Los melismas conservan la sílaba mientras cambian las notas, hasta un silencio o la siguiente sílaba.
 for(let i=0;i<timeline.length;i++){
  const lyric=timeline[i];if(!lyric.extend)continue;
  let end=lyric.start+lyric.duration;const limit=timeline[i+1]?.start??Infinity;
  for(const n of notes){if(n.start<lyric.start||n.start>=limit)continue;if(n.start>end+1e-5)break;end=Math.max(end,n.start+n.duration);}
  lyric.duration=Math.max(lyric.duration,Math.min(end,limit)-lyric.start);
 }
 const phrases=[];let phrase;
 for(const lyric of timeline){
  const previous=phrase?.syllables.at(-1),wordEnd=!previous||!['begin','middle'].includes(previous.syllabic);
  const boundary=!phrase||previous?.lineBreakAfter||lyric.newLine||wordEnd&&(lyric.start-phrase.end>=.75||lyric.start-phrase.start>=12||phrase.text.length+lyric.text.length>58);
  if(!phrase||boundary){phrase={start:lyric.start,end:lyric.start+lyric.duration,text:'',syllables:[]};phrases.push(phrase);}
  const prefix=phrase.syllables.length&&!['begin','middle'].includes(previous?.syllabic)?' ':'';
  phrase.text+=prefix+lyric.text;phrase.syllables.push({...lyric,prefix});phrase.end=Math.max(phrase.end,lyric.start+lyric.duration);
 }
 return phrases;
}

export function vocalPhraseAt(phrases,beat){return phrases.find(p=>beat<p.end)??null;}
export function vocalSyllableProgress(syllable,beat){return clamp((beat-syllable.start)/Math.max(.001,syllable.duration),0,1);}
export function vocalPhraseNotes(phrase,notes){
 if(!phrase)return [];
 // Divide también las notas ligadas que llevan una nueva sílaba en mitad de la ligadura.
 return notes.flatMap(note=>{
  const start=Math.max(phrase.start,note.start),end=Math.min(phrase.end,note.start+note.duration);
  if(end<=start)return [];
  const cuts=[start,...phrase.syllables.map(s=>s.start).filter(t=>t>start&&t<end),end];
  return cuts.slice(0,-1).map((at,i)=>({...note,start:at,duration:cuts[i+1]-at,lyric:phrase.syllables.findLast(s=>s.start<=at&&s.start+s.duration>at)?.text??''}));
 });
}

// Las posiciones musicales usan negras; los pulsos siguen la unidad del metrónomo.
export function vocalEntryCountdown(beat,entry,measures=[],manualMeter=null){
 const first=measures[0]??{start:0,duration:4,numerator:4,denominator:4};
 const meter=manualMeter??measures.find(m=>beat>=m.start&&beat<m.start+m.duration)??first;
 const currentUnit=4/meter.denominator;let exactPulses=0,bars=0;
 const add=(duration,m)=>{if(duration<=0)return;const pulses=duration/(4/m.denominator);exactPulses+=pulses;bars+=pulses/m.numerator;};
 if(manualMeter||!measures.length)add(Math.max(0,entry-beat),meter);
 else{
  if(beat<first.start)add(Math.min(entry,first.start)-beat,first);
  for(const m of measures)add(Math.min(entry,m.start+m.duration)-Math.max(beat,m.start),m);
 }
 const pulses=Math.max(0,Math.ceil(exactPulses-1e-7));
 // Redondea al próximo pulso visible también la equivalencia en compases.
 bars+=Math.max(0,pulses-exactPulses)/meter.numerator;
 return {pulses,bars,unit:currentUnit,label:`Entrada en ${pulses} ${pulses===1?'pulso':'pulsos'} (${entryNumber.format(bars)} ${Math.abs(bars-1)<1e-7?'compás':'compases'})`};
}

function round(c,x,y,w,h,r=8){c.beginPath();c.roundRect(x,y,w,h,r);}
function lyricLine(c,phrase,beat,y,size,highlight=true,t=visualTheme()){
 if(!phrase)return;c.font=`600 ${size}px system-ui`;
 const widths=phrase.syllables.map(s=>c.measureText(s.prefix+s.text).width),total=widths.reduce((a,b)=>a+b,0),scale=Math.min(1,1390/Math.max(1,total));
 c.save();c.translate(800,y);c.scale(scale,scale);let x=-total/2;c.textAlign='left';
 phrase.syllables.forEach((s,i)=>{
  const text=s.prefix+s.text,width=widths[i],progress=highlight?vocalSyllableProgress(s,beat):0;
  c.fillStyle=t.muted;c.fillText(text,x,0);
  if(progress>0){c.save();c.beginPath();c.rect(x,-size-5,width*progress,size+16);c.clip();c.fillStyle=t.accent;c.fillText(text,x,0);c.restore();}
  if(highlight&&beat>=s.start&&beat<s.start+s.duration){c.fillStyle=t.warning;round(c,x,13,Math.max(3,width*progress),4,2);c.fill();}
  x+=width;
 });c.restore();
}

export function drawVocals(c,beat,notes,phrases,opts={}){
 const t=visualTheme(opts),phrase=vocalPhraseAt(phrases,beat),index=phrases.indexOf(phrase),ink=t.ink,muted=t.muted;
 c.textAlign='left';c.fillStyle=muted;c.font='600 16px system-ui';c.fillText('VOZ / KARAOKE POR FRASES',65,164);
 c.textAlign='right';c.font='16px system-ui';c.fillText('Más arriba = más agudo · Más larga = más tiempo',1535,164);
 if(!phrase){c.fillStyle=ink;c.textAlign='center';c.font='600 30px system-ui';c.fillText(phrases.length?'Fin de la letra':`«${opts.vocalPartName??'Esta parte'}» no contiene letra exportada.`,800,375);if(!phrases.length){c.font='20px system-ui';c.fillStyle=muted;c.fillText('Revisa el archivo y las sílabas detectadas en el panel de la izquierda.',800,420);}return;}
 const range=opts.vocalRange??vocalPitchRange(notes),{low,high}=range;
 const from=phrase.start-.5,to=Math.max(from+4,phrase.end+.5),visible=opts.vocalPages?.[index]??vocalPhraseNotes(phrase,notes);
 const left=178,right=1504,top=232,bottom=470,x=t=>left+(t-from)/(to-from)*(right-left),y=m=>bottom-(m-low)/Math.max(1,high-low)*(bottom-top),barHeight=clamp((bottom-top)/(high-low)*.78,8,18);
 c.fillStyle=t.soft;round(c,160,195,1375,310,16);c.fill();
 for(let midi=low;midi<=high;midi++){
  const yy=y(midi);c.strokeStyle=midi%12===0?t.line:t.line;c.lineWidth=midi%12===0?1.5:1;c.beginPath();c.moveTo(left,yy);c.lineTo(right,yy);c.stroke();
  if(opts.showVocalNoteNames&&(midi%12===0||midi===low||midi===high)){c.fillStyle=muted;c.textAlign='right';c.font='14px system-ui';c.fillText(noteName(midi,opts.latin,opts.middle),145,yy+5);}
 }
 c.save();c.beginPath();c.rect(left,201,right-left,299);c.clip();
 // Marcas de tiempo tenues para leer duraciones sin saturar la melodía.
 for(let pulse=Math.ceil(from);pulse<=to;pulse++){c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(x(pulse),207);c.lineTo(x(pulse),492);c.stroke();}
 for(const n of visible){
  const start=x(n.start),end=x(n.start+n.duration),width=Math.max(4,end-start-3),yy=y(n.midi),progress=clamp((beat-n.start)/n.duration,0,1),active=beat>=n.start&&beat<n.start+n.duration;
  c.fillStyle=musicalPalette(opts).strings[0];round(c,start,yy-barHeight/2,width,barHeight,barHeight/2);c.fill();
  if(progress>0){c.save();c.beginPath();c.rect(start,yy-barHeight/2,width*progress,barHeight);c.clip();c.fillStyle=active?t.accent:musicalPalette(opts).strings[1];round(c,start,yy-barHeight/2,width,barHeight,barHeight/2);c.fill();c.restore();}
  if(active){c.strokeStyle=t.accent;c.lineWidth=2;round(c,start-2,yy-barHeight/2-3,width+4,barHeight+6,barHeight/2+2);c.stroke();}
  if(n.lyric){c.fillStyle=active?t.accent:ink;c.textAlign='left';c.font='600 16px system-ui';c.fillText(n.lyric,start,yy-15,Math.max(20,width));}
  if(opts.showVocalNoteNames){c.fillStyle=muted;c.textAlign='left';c.font='500 13px system-ui';c.fillText(noteName(n.midi,opts.latin,opts.middle),start,yy+24,Math.max(20,width));}
 }
 const cursor=x(clamp(beat,from,to));c.strokeStyle=t.warning;c.lineWidth=3;c.beginPath();c.moveTo(cursor,205);c.lineTo(cursor,493);c.stroke();
 c.fillStyle=t.warning;c.beginPath();c.arc(cursor,210,5,0,Math.PI*2);c.fill();c.restore();
 const waiting=beat<phrase.start;
 c.textAlign='left';c.fillStyle=muted;c.font='600 15px system-ui';c.fillText(waiting?'PREPARA LA ENTRADA':'CANTA',65,544);
 c.textAlign='right';c.fillText(`FRASE ${index+1} / ${phrases.length}`,1535,544);
 if(waiting){const countdown=vocalEntryCountdown(beat,phrase.start,opts.measures,opts.manualMeter);c.textAlign='center';c.fillStyle=ink;c.font='600 19px system-ui';c.fillText(countdown.label,800,543);
  for(let i=0;i<4;i++){c.fillStyle=countdown.pulses<=4-i?t.warning:t.line;c.beginPath();c.arc(761+i*26,562,4,0,Math.PI*2);c.fill();}}

 lyricLine(c,phrase,beat,612,44,true,t);
 const next=phrases[index+1];if(next){c.fillStyle=muted;c.textAlign='left';c.font='600 13px system-ui';c.fillText('DESPUÉS',65,665);lyricLine(c,next,-Infinity,670,26,false,t);}
}
