// MusicXML escrito: independiente de las notas ligadas/transformadas del audio.
import {clamp,measureAt} from './model.js';
import {visualTheme,musicalPalette} from './appearance.js';
const STEPS='CDEFGAB',PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const SHARP=['C','C','D','D','E','F','F','G','G','A','A','B'];
const FLAT=['C','D','D','E','E','F','G','G','A','A','B','B'];
const cache=new WeakMap();
export function keyAt(part,beat,staff=1){return part.keys?.findLast(k=>k.start<=beat&&(k.staff===0||k.staff===staff))??{fifths:0};}
export function spellingPreference(opts,sections,measure){const section=sections?.find(s=>s.startMeasure<=measure&&s.endMeasure>=measure);return section?.spelling&&section.spelling!=='inherit'?section.spelling:opts.noteSpelling??'auto';}
export function spellingAt(part,beat,opts={},sections=[]){const m=measureAt(part,beat),pref=spellingPreference(opts,sections,m?.number);return pref==='auto'?(keyAt(part,Math.max(0,beat)).fifths<0?'flats':'sharps'):pref;}
export function writtenPitch(note,preference='auto'){
 if(preference==='auto')return {step:note.step,octave:note.octave,alter:note.alter??0};
 const midi=(note.octave+1)*12+PC[note.step]+(note.alter??0),pc=((midi%12)+12)%12,step=(preference==='flats'?FLAT:SHARP)[pc];
 return {step,octave:Math.floor(midi/12)-1,alter:pc-PC[step]};
}
function clefAt(part,beat,staff){return part.clefs?.findLast(c=>c.staff===staff&&c.start<=beat)??{sign:staff===1?'G':'F',line:staff===1?2:4,octaveChange:0};}
export function staffY(pitch,clef,top){const reference=clef.sign==='F'?3*7+3:clef.sign==='C'?4*7:4*7+4;const line=clef.line||(clef.sign==='F'?4:clef.sign==='C'?3:2);return top+28-(line-1)*7-(pitch.octave*7+STEPS.indexOf(pitch.step)-reference-7*(clef.octaveChange||0))*3.5;}
function keyAlter(fifths){const result={};const order=fifths<0?'BEADGCF':'FCGDAEB';for(let i=0;i<Math.min(7,Math.abs(fifths));i++)result[order[i]]=fifths<0?-1:1;return result;}
const symbol={sharp:'♯',flat:'♭',natural:'♮','double-sharp':'𝄪','flat-flat':'𝄫'};
function accidental(alter){return alter===-2?'𝄫':alter===-1?'♭':alter===1?'♯':alter===2?'𝄪':'♮';}
function line(c,x,y,x2,y2){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function typeOf(n){return n.type|| (n.duration>=4?'whole':n.duration>=2?'half':n.duration>=1?'quarter':n.duration>=.5?'eighth':n.duration>=.25?'16th':'32nd');}
function layout(part){
 if(cache.has(part))return cache.get(part);
 let left=0;const bars=part.measures.map(m=>{
  const events=(part.notation??[]).filter(n=>n.measure===m.number).sort((a,b)=>a.start-b.start),starts=[...new Set([0,...events.map(n=>n.start-m.start),m.duration])].sort((a,b)=>a-b);
  const previous=part.measures[m.number-2],meterChange=!!previous&&(previous.numerator!==m.numerator||previous.denominator!==m.denominator),keyChange=m.start>0&&part.keys?.some(k=>k.start===m.start),clefChange=m.start>0&&part.clefs?.some(k=>k.start===m.start);
  let x=24+(meterChange?24:0)+(keyChange?120:0)+(clefChange?34:0);const points=starts.map((at,i)=>{if(i)x+=Math.max(28,(at-starts[i-1])*65);return {at,x};});
  const width=x+20,bar={...m,events,points,left,width,meterChange,keyChange,clefChange};left+=width;return bar;
 });cache.set(part,bars);return bars;
}
function position(bar,beat){const at=clamp(beat-bar.start,0,bar.duration),i=bar.points.findIndex(p=>p.at>=at);if(i<=0)return bar.points[0].x;const a=bar.points[i-1],b=bar.points[i];return a.x+(b.x-a.x)*(at-a.at)/(b.at-a.at);}
export function pianoScoreWindow(part,beat){const bars=layout(part),current=bars.find(b=>beat>=b.start&&beat<b.start+b.duration)??(beat<0?bars[0]:bars.at(-1));if(!current)return null;const at=current.left+position(current,beat),offset=Math.max(0,at-360);return {bars,current,offset,cursor:at-offset};}
function drawClef(c,clef,x,top){c.font='40px "AulaMusic", "Noto Music", serif';c.fillText(clef.sign==='F'?'𝄢':clef.sign==='C'?'𝄡':'𝄞',x,top+28-((clef.line||(clef.sign==='F'?4:clef.sign==='C'?3:2))-1)*7+13);if(clef.octaveChange){c.font='10px system-ui';c.fillText(String(8*Math.abs(clef.octaveChange)),x+9,clef.octaveChange>0?top-7:top+46);}}
function drawKey(c,fifths,x,top,clef,cancel=false){
 const sequence=fifths<0?[['B',4],['E',5],['A',4],['D',5],['G',4],['C',5],['F',4]]:[['F',5],['C',5],['G',5],['D',5],['A',4],['E',5],['B',4]];
 c.font='19px "AulaMusic", "Noto Music", serif';for(let i=0;i<Math.min(7,Math.abs(fifths));i++){const [step,octave]=sequence[i],y=staffY({step,octave:octave-(clef.sign==='F'?2:0)+(clef.octaveChange||0)},clef,top);c.fillText(cancel?'♮':fifths<0?'♭':'♯',x+i*8,y+5);}
}
export function drawPianoScore(c,beat,part,opts,sections=[]){
 const t=visualTheme(opts),hands=musicalPalette(opts).hands;c.save();c.fillStyle=t.panel;c.beginPath();c.roundRect(65,143,1470,188,10);c.fill();c.strokeStyle=t.line;c.lineWidth=1;c.stroke();c.beginPath();c.rect(70,145,1460,182);c.clip();c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle=t.muted;c.font='12px system-ui';c.fillText('PARTITURA · notas escritas · seguimiento automático',82,159);
 if(!part.notation?.length){c.font='18px system-ui';c.fillText('Carga un MXL o MusicXML para ver la partitura escrita.',100,235);c.restore();return;}
 const view=pianoScoreWindow(part,beat);if(!view){c.restore();return;}
 const staves=[...new Set(part.notation.map(n=>n.staff))].sort((a,b)=>a-b).slice(0,2),tops=staves.length===1?[222]:[188,267];
 for(let si=0;si<staves.length;si++){const top=tops[si];c.strokeStyle=t.line;for(let i=0;i<5;i++)line(c,82,top+i*7,1520,top+i*7);}
 c.save();c.beginPath();c.rect(208,163,1312,161);c.clip();
 for(const bar of view.bars){const left=208+bar.left-view.offset;if(left+bar.width<208||left>1520)continue;
  const preference=spellingPreference(opts,sections,bar.number);c.fillStyle=t.muted;c.font='11px system-ui';c.fillText(String(bar.number),left+3,177);
  for(let si=0;si<staves.length;si++){
   const staff=staves[si],top=tops[si],clef=clefAt(part,bar.start,staff),key=keyAt(part,bar.start,staff),state=new Map(),defaults=keyAlter(key.fifths);
   c.strokeStyle=t.line;line(c,left,top,left,top+28);c.fillStyle=t.ink;let hx=left+8;
   if(bar.clefChange&&part.clefs?.some(k=>k.start===bar.start&&k.staff===staff)){drawClef(c,clef,hx,top);hx+=34;}
   if(bar.meterChange){c.font='bold 13px serif';c.fillText(String(bar.numerator),hx,top+11);c.fillText(String(bar.denominator),hx,top+26);hx+=24;}
   if(bar.keyChange){const previousKey=keyAt(part,bar.start-1e-6,staff);if(previousKey.fifths!==key.fifths&&previousKey.fifths){drawKey(c,previousKey.fifths,hx,top,clef,true);hx+=Math.abs(previousKey.fifths)*8+6;}drawKey(c,key.fifths,hx,top,clef);}
   const tuplets=new Map();
   for(const n of bar.events.filter(n=>n.staff===staff)){
    const x=left+position(bar,n.start),active=beat>=n.start&&beat<n.start+n.duration,color=active?(hands[clefAt(part,n.start,staff).sign]??t.accent):t.ink;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.6;
    const type=typeOf(n);
    if(n.rest){c.font='24px "AulaMusic", "Noto Music", serif';const rests={whole:'𝄻',half:'𝄼',quarter:'𝄽',eighth:'𝄾','16th':'𝄿','32nd':'𝅀','64th':'𝅁'};c.fillText(rests[n.wholeRest?'whole':type]??'𝄽',x-6,top+24);for(let d=0;d<n.dots;d++){c.beginPath();c.arc(x+12+d*5,top+12,1.8,0,Math.PI*2);c.fill();}continue;}
    const pitch=writtenPitch(n,preference),noteClef=clefAt(part,n.start,staff),y=staffY(pitch,noteClef,top),id=pitch.step+pitch.octave,previous=state.get(id)??defaults[pitch.step]??0;
    const explicit=preference==='auto'&&n.accidental;if(pitch.alter!==previous||explicit){c.font='20px "AulaMusic", "Noto Music", serif';c.fillText(explicit?(symbol[n.accidental]??accidental(pitch.alter)):accidental(pitch.alter),x-21,y+6);}state.set(id,pitch.alter);
    for(let yy=top-7;yy>=y-.1;yy-=7)line(c,x-10,yy,x+10,yy);for(let yy=top+35;yy<=y+.1;yy+=7)line(c,x-10,yy,x+10,yy);
    c.beginPath();c.ellipse(x,y,type==='whole'?8:6,3.8,-.3,0,Math.PI*2);if(type==='whole'||type==='half')c.stroke();else c.fill();
    const down=n.stem==='down'||(n.stem!=='up'&&y<top+14),sx=x+(down?-5:5),end=y+(down?24:-24);
    if(type!=='whole'&&type!=='breve'&&n.stem!=='none'){line(c,sx,y,sx,end);const flags={eighth:1,'16th':2,'32nd':3,'64th':4}[type]??0;for(let f=0;f<flags;f++){const yy=end+(down?-f*5:f*5);c.beginPath();c.moveTo(sx,yy);c.quadraticCurveTo(sx+14,yy+(down?-4:4),sx+7,yy+(down?-14:14));c.stroke();}}
    for(let d=0;d<n.dots;d++){c.beginPath();c.arc(x+12+d*5,y-2,1.8,0,Math.PI*2);c.fill();}
    if(n.tuplet){const count=tuplets.get(n.voice)??0;if(n.tupletStart||count%n.tuplet===0){c.font='10px system-ui';c.fillText(String(n.tuplet),x-2,top-8);}tuplets.set(n.voice,count+1);}else tuplets.delete(n.voice);
    if(n.ties?.includes('start')){const endX=Math.min(left+bar.width-2,left+position(bar,n.start+n.duration)-6);c.beginPath();c.moveTo(x+5,y+7);c.quadraticCurveTo((x+endX)/2,y+19,endX,y+7);c.stroke();}
   }
   for(const change of part.clefs??[]){if(change.staff===staff&&change.start>bar.start&&change.start<bar.start+bar.duration){c.fillStyle=t.ink;drawClef(c,change,left+position(bar,change.start)-26,top);}}
  }
 }
 if(beat>=0){const x=208+view.cursor;c.strokeStyle=t.accent;c.lineWidth=2;line(c,x,180,x,315);}c.restore();
 for(let si=0;si<staves.length;si++){const top=tops[si],clef=clefAt(part,Math.max(0,beat),staves[si]);c.fillStyle=t.panel;c.fillRect(75,top-16,130,64);c.fillStyle=t.ink;drawClef(c,clef,86,top);drawKey(c,keyAt(part,Math.max(0,beat),staves[si]).fifths,127,top,clef);c.font='bold 13px serif';c.fillText(String(view.current.numerator),188,top+11);c.fillText(String(view.current.denominator),188,top+26);}
 c.restore();
}

let musicFont;
export function loadPianoScoreFont(){
 if(typeof FontFace==='undefined')return Promise.resolve();
 return musicFont??=(async()=>{const face=new FontFace('AulaMusic',`url(${new URL('../vendor/NotoMusic-Regular.ttf',import.meta.url)})`);await face.load();document.fonts.add(face);})();
}
