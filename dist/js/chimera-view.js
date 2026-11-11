import {chimeraHairStyle} from './chimera-score.js';
import {chimera} from './chimera.js';
import {musicalPalette,visualTheme} from './appearance.js';
import {noteName} from './model.js';
import {vocalPhrases,vocalPhraseAt,vocalPhraseNotes,vocalPitchRange} from './vocals.js';
export const CHIMERA_DISPLAY_FONT='\"Hershey\", \"Archivo\", sans-serif';
function lightView(opts){return opts.chimeraStyle==='light'||opts.chimeraStyle!=='dark'&&visualTheme(opts).id==='chimera-light';}
function snapshotAt(frames,time){let lo=0,hi=frames.length;while(lo<hi){const mid=(lo+hi)>>1;if(frames[mid].time<=time)lo=mid+1;else hi=mid;}return lo>0?frames[lo-1]:undefined;}
export function chimeraSungAt(voice,beat,segments=[],seconds=0){
 const note=voice.notes.find(n=>beat>=n.start&&beat<n.start+n.duration),syllable=note?(voice.phrases??vocalPhrases(voice.lyrics,voice.notes)).flatMap(p=>p.syllables).findLast(s=>beat>=s.start):null,phoneme=segments.find(s=>seconds>=s.t0&&seconds<s.t1);
 return {note,syllable,text:syllable?.text??'',ipa:phoneme?.ipa??''};
}
export function chimeraChoirLayout(count,width,bottom){const columns=Math.max(1,count),w=(width-90)/columns,h=Math.min(bottom-190,Math.max(300,w*1.65+110));return {columns,w,h,left:index=>45+index*w,top:190+(bottom-190-h)/2};}
export function drawChimeraHair(c,drawing,model,body,choice,color){
 const style=chimeraHairStyle(body,choice);if(style==='none')return;
 const k=model.bodyParams.scale,ph=model.bodyParams.pharynx,P=(x,y)=>{const point={x:x*k,y:(y<7?7-(7-y)*ph:y)*k};return [drawing.X(point),drawing.Y(point)];};
 c.save();c.strokeStyle=color;c.globalAlpha=.85;c.lineWidth=2;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(...P(6.8,20.4));
 c.bezierCurveTo(...P(3.8,23.3),...P(-2.8,23.3),...P(-7.6,19.5));
 if(style==='long'){
  c.bezierCurveTo(...P(-9.6,14.8),...P(-8.2,6),...P(-7.5,-3.8));c.bezierCurveTo(...P(-6,-4.2),...P(-4.4,-3.7),...P(-3.6,-3.2));
  c.bezierCurveTo(...P(-5,1),...P(-6,5.8),...P(-6.5,10.7));
 }else c.bezierCurveTo(...P(-9.3,15.2),...P(-8.5,11.8),...P(-7.2,10.1));
 c.stroke();c.lineWidth=1.2;
 for(let strand=0;strand<3;strand++){c.beginPath();c.moveTo(...P(5.5-strand*.8,21.1));c.bezierCurveTo(...P(-1,22.4-strand*.35),...P(-7.7+strand*.35,19.8),...P(-8+strand*.45,13.2));if(style==='long')c.bezierCurveTo(...P(-7.6+strand*.4,6),...P(-6.6+strand*.5,0),...P(-5.8+strand*.55,-3.2));c.stroke();}
 c.restore();
}
export function drawChimera(c,beat,part,opts,scheduler){
 const light=lightView(opts),ink=light?'#111111':'#e5ebf2';
 const width=opts.viewWidth??1600,bottom=opts.vocalPortrait?1435:685,palette=musicalPalette(opts),voices=opts.vocalOverview?opts.vocalEnsemble??[]:[{id:part.id,name:part.name,colorIndex:opts.vocalColorIndex??0,notes:opts.vocalNotes??part.notes,lyrics:part.lyrics,phrases:opts.vocalPhrases}],layout=chimeraChoirLayout(voices.length,opts.vocalOverview?width:Math.min(width*.43,760)+90,bottom),{w,h,top}=layout,seconds=scheduler.seconds(0,Math.max(0,beat));
 // Un único escenario para todo el coro: sin tarjetas, bordes ni separaciones.
 c.fillStyle=light?'#ffffff':'#090e16';c.fillRect(45,184,width-90,bottom-184);
 voices.forEach((voice,index)=>{
  const left=layout.left(index),color=palette.strings[voice.colorIndex%palette.strings.length],record=chimera.records.get(voice.id),sung=chimeraSungAt(voice,beat,record?.segments,seconds),center=left+w/2;
  c.save();c.beginPath();c.rect(left,184,w,bottom-184);c.clip();c.textAlign='center';c.fillStyle=color;c.font=`500 19px ${CHIMERA_DISPLAY_FONT}`;c.fillText(voice.name.toUpperCase(),center,top+26,w-16);
  if(record){
   const snapshot=snapshotAt(record.snapshots,seconds),artic=snapshot?record.api.VoiceModel.articFromArray(snapshot.artic):record.api.NEUTRAL,frame=record.model.frame(artic),viewWidth=Math.min(530,w-8),viewHeight=h-140,drawLeft=center-viewWidth/2,compact=viewWidth<560,extra=compact?154:0,offset=compact?62:0;
   if(record.drawWidth!==viewWidth||record.drawHeight!==viewHeight){record.drawing.resize(viewWidth,viewHeight+extra);record.drawWidth=viewWidth;record.drawHeight=viewHeight;}
   c.save();c.beginPath();c.rect(left,top+34,w,viewHeight);c.clip();c.translate(drawLeft,top+34-offset);record.drawing.face.update(null,1/30);drawChimeraHair(c,record.drawing,record.model,record.body,chimera.appearance[voice.id]??'auto',light?'#111111':color);record.api.drawAnatomy(record.drawing,light,c,record.model,frame,artic,null,{pressure:false,particles:false,grid:false,calipers:false},{hover:null,drag:null,dt:1/30,formants:[],slots:[],info:[]});
   record.currentWord=sung.syllable?{key:sung.syllable.start,text:sung.text}:null;
   if(!record.wordOverlay||record.wordColor!==color){record.wordOverlay=record.api.mouthWords(()=>record.currentWord,color);record.wordColor=color;}
   record.wordOverlay(c,record.drawing,record.model,frame,artic,{w:viewWidth,h:viewHeight+extra,dt:scheduler.playing?1/30:0});c.restore();
   c.textAlign='center';c.fillStyle=sung.text?color:'#78828d';c.font=`500 31px ${CHIMERA_DISPLAY_FONT}`;c.fillText(sung.text.toUpperCase()||'—',center,top+h-65,w-16);
   c.fillStyle=ink;c.font='400 22px Archivo, sans-serif';c.fillText(sung.ipa?`/${sung.ipa}/`:'',center,top+h-35,w-16);
   c.fillStyle=light?'#505967':'#aab4c0';c.font=`300 14px ${CHIMERA_DISPLAY_FONT}`;c.fillText(record.body.toUpperCase()+(sung.note?' · '+noteName(sung.note.soundMidi??sung.note.midi,opts.latin,opts.middle??4,opts.displaySpelling):''),center,top+h-12,w-16);
  }else{c.textAlign='center';c.fillStyle=light?'#505967':'#c8d1dc';c.font=`300 16px ${CHIMERA_DISPLAY_FONT}`;c.fillText('Pulsa reproducir para preparar',center,top+h/2,w-16);}
  c.restore();
 });
 if(!opts.vocalOverview)drawChimeraMelody(c,beat,voices[0],opts,Math.min(width*.43,760)+120,width-65,220,bottom-35);
}


export function drawChimeraMelody(c,beat,voice,opts,left,right,top,bottom){
 if(!voice||right-left<80)return;
 const ink=lightView(opts)?'#111111':'#e5ebf2';
 const phrases=voice.phrases??vocalPhrases(voice.lyrics,voice.notes),phrase=vocalPhraseAt(phrases,beat);if(!phrase)return;
 const color=musicalPalette(opts).strings[(voice.colorIndex??0)%6],range=opts.vocalRange??vocalPitchRange(voice.notes),from=phrase.start-.5,to=Math.max(from+4,phrase.end+.5),x=value=>left+(value-from)/(to-from)*(right-left),y=midi=>bottom-20-(midi-range.low)/(range.high-range.low)*(bottom-top-55),height=Math.max(6,Math.min(15,(bottom-top)/(range.high-range.low)*.7));
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top+10);c.clip();
 for(const note of vocalPhraseNotes(phrase,voice.notes)){
  const at=x(note.start),width=Math.max(4,x(note.start+note.duration)-at-3),yy=y(note.midi),active=beat>=note.start&&beat<note.start+note.duration;
  c.save();c.globalAlpha=active?1:.5;c.fillStyle=color;c.beginPath();c.roundRect(at,yy-height/2,width,height,Math.min(5,height/2));c.fill();c.restore();
  if(active){c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.roundRect(at-2,yy-height/2-3,width+4,height+6,5);c.stroke();}
  c.fillStyle=ink;c.textAlign='left';c.font=`500 16px ${CHIMERA_DISPLAY_FONT}`;if(note.lyric)c.fillText(note.lyric,at,yy-15,Math.max(20,width));
  if(note.lyricContinuation){c.strokeStyle=ink;c.lineWidth=1.5;c.beginPath();c.moveTo(at,yy-14);c.lineTo(at+width,yy-14);c.stroke();}
  if(opts.showVocalNoteNames){c.font=`300 13px ${CHIMERA_DISPLAY_FONT}`;c.fillText(noteName(note.midi,opts.latin,opts.middle??4,opts.displaySpelling),at,yy+24,Math.max(20,width));}
  for(const fermata of note.fermatas??[]){const fx=x(fermata.start)+8,fy=Math.max(top+12,yy-37);c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.arc(fx,fy,8,Math.PI,Math.PI*2);c.stroke();c.fillStyle=ink;c.beginPath();c.arc(fx,fy-1,2,0,Math.PI*2);c.fill();}
 }
 if(beat>=from&&beat<=to){c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.moveTo(x(beat),top+8);c.lineTo(x(beat),bottom);c.stroke();}
 c.restore();
}
