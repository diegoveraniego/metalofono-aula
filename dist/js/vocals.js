import {wholeBars} from './rhythm.js';
import {visualTheme,musicalPalette} from './appearance.js';
import {noteName,clamp} from './model.js';

// La escala se calcula una vez para toda la parte: una altura siempre queda en la misma fila.
export function vocalPitchRange(notes=[]){
 const pitches=notes.map(n=>n.midi).filter(Number.isFinite);
 if(!pitches.length)return {low:60,high:81};
 let low=Math.min(...pitches)-2,high=Math.max(...pitches)+2;
 if(high-low<12){const middle=(high+low)/2;low=Math.floor(middle-6);high=low+12;}
 return {low:Math.min(60,low),high:Math.max(81,high)};
}

export function vocalPhrases(lyrics=[],notes=[],verse){
 const selected=verse??(lyrics.some(l=>l.verse==='1')?'1':lyrics[0]?.verse??'1');
 const timeline=[];
 for(const source of lyrics.filter(l=>(l.verse??'1')===selected).toSorted((a,b)=>a.start-b.start)){
  const text=source.text.replace(/_+/g,'').trim();
  if(!text){const previous=timeline.at(-1);if(previous){previous.extend=true;previous.duration=Math.max(previous.duration,source.start+source.duration-previous.start);}continue;}
  timeline.push({...source,text,extend:source.extend||source.text.includes('_')});
 }
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
  return cuts.slice(0,-1).map((at,i)=>{
   const syllable=phrase.syllables.findLast(s=>s.start<=at&&s.start+s.duration>at);
   return {...note,start:at,duration:cuts[i+1]-at,lyric:syllable&&Math.abs(syllable.start-at)<1e-5?syllable.text:'',lyricContinuation:!!syllable&&at>syllable.start+1e-5,fermatas:note.fermatas?.filter(f=>f.start>=at&&f.start<cuts[i+1])};
  });
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
 return {pulses,bars,unit:currentUnit,label:`Entrada en ${pulses} ${pulses===1?'pulso':'pulsos'} (${wholeBars(bars)} ${wholeBars(bars)===1?'compás':'compases'})`};
}

function round(c,x,y,w,h,r=8){c.beginPath();c.roundRect(x,y,w,h,r);}
function lyricLine(c,phrase,beat,y,size,highlight=true,t=visualTheme(),viewWidth=1600){
 if(!phrase)return;c.font=`600 ${size}px system-ui`;
 const widths=phrase.syllables.map(s=>c.measureText(s.prefix+s.text).width),total=widths.reduce((a,b)=>a+b,0),scale=Math.min(1,(viewWidth-210)/Math.max(1,total));
 c.save();c.translate(viewWidth/2,y);c.scale(scale,scale);let x=-total/2;c.textAlign='left';
 phrase.syllables.forEach((s,i)=>{
  const text=s.prefix+s.text,width=widths[i],progress=highlight?vocalSyllableProgress(s,beat):0;
  c.fillStyle=t.muted;c.fillText(text,x,0);
  if(progress>0){c.save();c.beginPath();c.rect(x,-size-5,width*progress,size+16);c.clip();c.fillStyle=t.accent;c.fillText(text,x,0);c.restore();}
  if(highlight&&beat>=s.start&&beat<s.start+s.duration){c.fillStyle=t.warning;round(c,x,13,Math.max(3,width*progress),4,2);c.fill();}
  x+=width;
 });c.restore();
}

// El centro de cada tecla coincide con la misma coordenada MIDI de la rejilla.
export function vocalPianoKeys(range,y,left,right){
 const step=Math.abs(y(range.low+1)-y(range.low));
 return Array.from({length:range.high-range.low+1},(_,i)=>{
  const midi=range.low+i,sharp=[1,3,6,8,10].includes(midi%12);
  return {midi,sharp,x:left,y:y(midi)-step/2,w:(right-left)*(sharp?.67:1),h:step};
 });
}
export function drawVocalPiano(c,range,y,left,right,active=[],opts={}){
 const t=visualTheme(opts),keys=vocalPianoKeys(range,y,left,right);
 for(const key of keys){
  c.fillStyle=key.sharp?'#25272b':'#fafafa';c.fillRect(left,key.y,right-left,key.h);
  // La franja clara al lado derecho deja reconocer la forma de las teclas negras.
  if(key.sharp){c.fillStyle='#fafafa';c.fillRect(left+key.w,key.y,right-left-key.w,key.h);}
  const colors=[...new Set(active.filter(n=>n.midi===key.midi).map(n=>n.color))];
  colors.forEach((color,index)=>{c.fillStyle=color;c.fillRect(left+index*(right-left)/colors.length,key.y,(right-left)/colors.length,key.h);});
  c.strokeStyle=t.line;c.lineWidth=.7;c.strokeRect(left,key.y,right-left,key.h);
  if(key.sharp){c.strokeStyle=colors.length?t.ink:'#25272b';c.lineWidth=1;c.beginPath();c.moveTo(left+key.w,key.y+1);c.lineTo(left+key.w,key.y+key.h-1);c.stroke();}
  if(opts.showVocalNoteNames&&key.h>=10){c.fillStyle=colors.length?t.ink:key.sharp?'#fafafa':'#25272b';c.textAlign='left';c.font=`${Math.min(12,key.h*.75)}px system-ui`;c.fillText(noteName(key.midi,opts.latin,opts.middle??4,opts.displaySpelling),left+3,key.y+key.h*.76,key.w-6);}
 }
}

export function drawVocals(c,beat,notes,phrases,opts={}){
 const viewWidth=opts.viewWidth??1600,center=viewWidth/2,rightEdge=viewWidth-65;
 const palette=musicalPalette(opts),color=palette.strings[(opts.vocalColorIndex??0)%palette.strings.length],t={...visualTheme(opts),accent:color},phrase=vocalPhraseAt(phrases,beat),index=phrases.indexOf(phrase),ink=t.ink,muted=t.muted;
 c.textAlign='left';c.fillStyle=muted;c.font='600 16px system-ui';c.fillStyle=color;c.fillText(opts.vocalPartName??'VOZ / KARAOKE POR FRASES',65,164);
 c.textAlign='right';c.font='16px system-ui';c.fillText('Más arriba = más agudo · Más larga = más tiempo',rightEdge,164);
 if(!phrase){c.fillStyle=ink;c.textAlign='center';c.font='600 30px system-ui';c.fillText(phrases.length?'Fin de la letra':`«${opts.vocalPartName??'Esta parte'}» no contiene letra exportada.`,center,375);if(!phrases.length){c.font='20px system-ui';c.fillStyle=muted;c.fillText('Revisa el archivo y las sílabas detectadas en el panel de la izquierda.',center,420);}return;}
 const range=opts.vocalRange??vocalPitchRange(notes),{low,high}=range;
 const from=phrase.start-.5,to=Math.max(from+4,phrase.end+.5),visible=opts.vocalPages?.[index]??vocalPhraseNotes(phrase,notes);
 const left=155,right=viewWidth-85,top=232,bottom=470,x=t=>left+(t-from)/(to-from)*(right-left),y=m=>bottom-(m-low)/Math.max(1,high-low)*(bottom-top),barHeight=clamp((bottom-top)/(high-low)*.78,8,18);
 c.fillStyle=t.soft;round(c,65,195,viewWidth-130,310,16);c.fill();
 for(let midi=low;midi<=high;midi++){
  const yy=y(midi);c.strokeStyle=midi%12===0?t.line:t.line;c.lineWidth=midi%12===0?1.5:1;c.beginPath();c.moveTo(left,yy);c.lineTo(right,yy);c.stroke();

 }
 drawVocalPiano(c,range,y,75,left,notes.filter(n=>beat>=n.start&&beat<n.start+n.duration).map(n=>({midi:n.midi,color})),opts);
 c.save();c.beginPath();c.rect(left,201,right-left,299);c.clip();
 // Marcas de tiempo tenues para leer duraciones sin saturar la melodía.
 for(let pulse=Math.ceil(from);pulse<=to;pulse++){c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(x(pulse),207);c.lineTo(x(pulse),492);c.stroke();}
 for(const n of visible){
  const start=x(n.start),end=x(n.start+n.duration),width=Math.max(4,end-start-3),yy=y(n.midi),progress=clamp((beat-n.start)/n.duration,0,1),active=beat>=n.start&&beat<n.start+n.duration;
  c.save();c.globalAlpha=.35;c.fillStyle=color;round(c,start,yy-barHeight/2,width,barHeight,barHeight/2);c.fill();c.restore();
  if(progress>0){c.save();c.beginPath();c.rect(start,yy-barHeight/2,width*progress,barHeight);c.clip();c.fillStyle=color;round(c,start,yy-barHeight/2,width,barHeight,barHeight/2);c.fill();c.restore();}
  if(active){c.strokeStyle=t.accent;c.lineWidth=2;round(c,start-2,yy-barHeight/2-3,width+4,barHeight+6,barHeight/2+2);c.stroke();}
  if(n.lyric){c.fillStyle=active?t.accent:ink;c.textAlign='left';c.font='600 16px system-ui';c.fillText(n.lyric,start,yy-15,Math.max(20,width));}
  if(n.lyricContinuation){c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.moveTo(start,yy-14);c.lineTo(start+width,yy-14);c.stroke();}
  for(const f of n.fermatas??[]){const fx=x(f.start),fy=Math.max(218,yy-(n.lyric||n.lyricContinuation?44:28));c.strokeStyle=ink;c.lineWidth=2.5;c.beginPath();c.arc(fx+10,fy,10,Math.PI,Math.PI*2);c.stroke();c.fillStyle=ink;c.beginPath();c.arc(fx+10,fy-2,2.5,0,Math.PI*2);c.fill();}
  if(opts.showVocalNoteNames){c.fillStyle=muted;c.textAlign='left';c.font='500 13px system-ui';c.fillText(noteName(n.midi,opts.latin,opts.middle,opts.displaySpelling),start,yy+24,Math.max(20,width));}
 }
 const cursor=x(clamp(beat,from,to));c.strokeStyle=t.warning;c.lineWidth=3;c.beginPath();c.moveTo(cursor,205);c.lineTo(cursor,493);c.stroke();
 c.fillStyle=t.warning;c.beginPath();c.arc(cursor,210,5,0,Math.PI*2);c.fill();c.restore();
 const waiting=beat<phrase.start;
 c.textAlign='left';c.fillStyle=muted;c.font='600 15px system-ui';c.fillText(waiting?'PREPARA LA ENTRADA':'CANTA',65,544);
 c.textAlign='right';c.fillText(`FRASE ${index+1} / ${phrases.length}`,rightEdge,544);
 if(waiting){const countdown=vocalEntryCountdown(beat,phrase.start,opts.measures,opts.manualMeter);c.textAlign='center';c.fillStyle=ink;c.font='600 19px system-ui';c.fillText(countdown.label,center,543);
  for(let i=0;i<4;i++){c.fillStyle=countdown.pulses<=4-i?t.warning:t.line;c.beginPath();c.arc(center-39+i*26,562,4,0,Math.PI*2);c.fill();}}

 lyricLine(c,phrase,beat,612,44,true,t,viewWidth);
 const next=phrases[index+1];if(next){c.fillStyle=muted;c.textAlign='left';c.font='600 13px system-ui';c.fillText('DESPUÉS',65,665);lyricLine(c,next,-Infinity,670,26,false,t,viewWidth);}
}

// Cada fila conserva su tesitura; todas comparten exactamente el mismo eje temporal.
export function vocalEnsemble(parts,transform=part=>part.notes){
 return parts.map((part,index)=>{const notes=transform(part),phrases=vocalPhrases(part.lyrics,notes);return {id:part.id,name:part.name,colorIndex:index,notes,phrases,range:vocalPitchRange(notes)};});
}
export function vocalMeasureWindow(measures,beat,count=8){
 if(!measures?.length){const span=count*4,from=Math.max(0,Math.floor(Math.max(0,beat)/span)*span);return {from,to:from+span};}
 const current=measures.findIndex(m=>beat<m.start+m.duration),first=Math.floor((current<0?measures.length-1:current)/count)*count,last=Math.min(measures.length-1,first+count-1);
 return {from:measures[first].start,to:measures[last].start+measures[last].duration};
}
export function vocalEnsembleGeometry(voices,beat,mode='separate',portrait=false,measures=[],viewWidth=1600){
 const shared=mode==='shared',width=portrait?900:viewWidth,left=shared?190:130,right=width-45,top=190,bottom=portrait?1440:687,window=portrait?vocalMeasureWindow(measures,beat):{from:Math.max(0,Math.floor(Math.max(0,beat)/8)*8),to:Math.max(0,Math.floor(Math.max(0,beat)/8)*8)+8},from=window.from,span=window.to-from,height=(bottom-top)/Math.max(1,voices.length);
 const range=vocalPitchRange(voices.flatMap(v=>v.notes.map(n=>({...n,midi:n.soundMidi??n.midi}))));
 const plotTop=226,plotBottom=bottom-Math.max(74,voices.length*21)-12;
 return {shared,width,left,right,top,bottom,span,from,to:from+span,height,range,plotTop,plotBottom,
  x:value=>left+(value-from)/span*(right-left),
  y:(index,note)=>shared?plotBottom-((note.soundMidi??note.midi)-range.low)/(range.high-range.low)*(plotBottom-plotTop):top+index*height+height*.72-(note.midi-voices[index].range.low)/(voices[index].range.high-voices[index].range.low)*height*.54};
}
export function drawVocalEnsemble(c,beat,voices,opts={}){
 const t=visualTheme(opts),palette=musicalPalette(opts),g=vocalEnsembleGeometry(voices,beat,opts.vocalLayout,opts.vocalPortrait,opts.measures,opts.viewWidth),{shared,left,right,top,bottom,from,to,x,height}=g;
 c.textAlign='left';c.font='600 17px system-ui';c.fillStyle=t.ink;c.fillText(opts.vocalOverview===false?(voices[0]?.name??'VOZ'):'CORO · TODAS LAS VOCES',65,164);
 c.textAlign='right';c.fillStyle=t.muted;c.font='15px system-ui';c.fillText(shared?'Escala compartida · alturas reales':'Voces separadas · una fila por voz',right,164);
 if(shared){
  c.fillStyle=t.soft;round(c,65,top,g.width-130,bottom-top,10);c.fill();
  voices.forEach((voice,index)=>{c.fillStyle=palette.strings[voice.colorIndex%palette.strings.length];c.textAlign='left';c.font='600 16px system-ui';c.fillText(voice.name,92+index*(g.width-160)/Math.max(1,voices.length),211,(g.width-160)/Math.max(1,voices.length)-10);});
  for(let midi=g.range.low;midi<=g.range.high;midi++){
   const yy=g.y(0,{midi});c.strokeStyle=t.line;c.lineWidth=midi%12===0?1.5:.5;c.beginPath();c.moveTo(left,yy);c.lineTo(right,yy);c.stroke();

  }
  const active=voices.flatMap(voice=>voice.notes.filter(n=>beat>=n.start&&beat<n.start+n.duration).map(n=>({midi:n.soundMidi??n.midi,color:palette.strings[voice.colorIndex%palette.strings.length]})));
  drawVocalPiano(c,g.range,midi=>g.y(0,{midi}),100,left,active,opts);
 }
 voices.forEach((voice,index)=>{
  const y0=top+index*height,color=palette.strings[voice.colorIndex%palette.strings.length],rowTop=shared?g.plotTop:y0,rowBottom=shared?g.plotBottom:y0+height-4;
  if(!shared){c.fillStyle=index%2?t.panel:t.soft;round(c,65,y0,g.width-130,height-4,8);c.fill();c.fillStyle=color;c.textAlign='left';c.font='600 15px system-ui';c.fillText(voice.name,78,y0+16,160);}
  if(!shared){
   for(let midi=voice.range.low;midi<=voice.range.high;midi++){const yy=g.y(index,{midi});c.strokeStyle=t.line;c.lineWidth=.5;c.beginPath();c.moveTo(left,yy);c.lineTo(right,yy);c.stroke();}
   const sounding=[...new Set(voice.notes.filter(n=>beat>=n.start&&beat<n.start+n.duration).map(n=>noteName(n.midi,opts.latin,opts.middle??4,opts.displaySpelling)))];
   c.fillStyle=sounding.length?color:t.muted;c.textAlign='center';c.font='600 15px system-ui';c.fillText(sounding.join(' / ')||'—',(72+left)/2,y0+height*.56,left-78);
  }
  c.save();c.beginPath();c.rect(left,rowTop,right-left,rowBottom-rowTop);c.clip();
  if(!shared||index===0)for(let pulse=from;pulse<=to;pulse++){c.strokeStyle=t.line;c.lineWidth=1;c.beginPath();c.moveTo(x(pulse),rowTop);c.lineTo(x(pulse),rowBottom);c.stroke();}
  let previous;
  for(const note of voice.notes){
   if(note.start>=to||note.start+note.duration<=from)continue;
   const at=x(Math.max(from,note.start)),end=x(Math.min(to,note.start+note.duration)),yy=g.y(index,note),active=beat>=note.start&&beat<note.start+note.duration;
   if(shared&&previous&&Math.abs(previous.note.start+previous.note.duration-note.start)<1e-5){c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();c.moveTo(previous.end,previous.yy);c.lineTo(at,yy);c.stroke();}
   c.save();c.globalAlpha=active?1:shared?.65:.55;c.fillStyle=color;round(c,at,yy-4,Math.max(3,end-at-2),8,4);c.fill();c.restore();
   if(active){c.strokeStyle=color;c.lineWidth=2;round(c,at-1,yy-7,Math.max(5,end-at),14,6);c.stroke();}
   for(const f of note.fermatas??[]){if(f.start<from||f.start>=to)continue;const fx=x(f.start)+7,fy=Math.max(rowTop+14,yy-11);c.strokeStyle=t.ink;c.lineWidth=2;c.beginPath();c.arc(fx,fy,7,Math.PI,Math.PI*2);c.stroke();c.fillStyle=t.ink;c.beginPath();c.arc(fx,fy-1,1.8,0,Math.PI*2);c.fill();}
   previous={note,end,yy};
  }
  c.restore();
  const lyricY=shared?g.plotBottom+24+index*21:y0+height-9;
  if(shared){c.fillStyle=color;c.textAlign='left';c.font='600 12px system-ui';c.fillText(voice.name,68,lyricY,105);}
  c.save();c.beginPath();c.rect(left,lyricY-17,right-left,22);c.clip();
  for(const s of voice.phrases.flatMap(p=>p.syllables)){if(s.start>=to||s.start+s.duration<=from)continue;
   const at=x(Math.max(from,s.start)),end=x(Math.min(to,s.start+s.duration)),active=beat>=s.start&&beat<s.start+s.duration;
   c.fillStyle=active?color:t.ink;c.textAlign='left';c.font=`${active?'700':'500'} 15px system-ui`;c.fillText(s.text,at,lyricY,Math.max(12,end-at-3));
   if(s.extend){const textWidth=Math.min(c.measureText(s.text).width,Math.max(12,end-at-3));if(end-at>textWidth+8){c.strokeStyle=t.ink;c.lineWidth=1.5;c.beginPath();c.moveTo(at+textWidth+4,lyricY+1);c.lineTo(end-3,lyricY+1);c.stroke();}}
  }
  c.restore();
 });
 if(beat>=from&&beat<=to){c.strokeStyle=t.warning;c.lineWidth=3;c.beginPath();c.moveTo(x(beat),shared?g.plotTop:top-5);c.lineTo(x(beat),shared?g.plotBottom:bottom);c.stroke();}
}
