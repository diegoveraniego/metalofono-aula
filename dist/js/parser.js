// Parsers sin dependencias de red. ZIP: directorio central + DecompressionStream nativo.
const text=new TextDecoder();
const MAX=32*1024*1024;
export async function unzip(buffer){
 const bytes=new Uint8Array(buffer),v=new DataView(buffer);let e=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){e=i;break;}
 if(e<0)throw Error('MXL no válido: falta el directorio ZIP.');
 if(v.getUint16(e+4,true)||v.getUint16(e+6,true))throw Error('ZIP multipartes no compatible.');
 let p=v.getUint32(e+16,true),total=0;const entries=new Map();
 for(let i=0;i<v.getUint16(e+10,true);i++){
  if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('Directorio ZIP dañado.');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),unpacked=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);
  const name=text.decode(bytes.slice(p+46,p+46+nl));p+=46+nl+extra+comment;
  total+=unpacked;if(total>MAX||size>MAX)throw Error('El MXL descomprimido supera 32 MB.');
  if(flags&1)throw Error('No se admiten archivos cifrados.');
  if(offset+30>bytes.length||v.getUint32(offset,true)!==0x04034b50)throw Error('Entrada ZIP dañada.');
  const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);
  if(start+size>bytes.length)throw Error('Archivo MXL incompleto.');
  entries.set(name,async()=>{
   const compressed=bytes.slice(start,start+size);let result;
   if(method===0)result=compressed;else if(method===8){
    let ds;try{ds=new DecompressionStream('deflate-raw');}catch{throw Error('Este navegador no descomprime MXL. Usa una versión reciente o exporta .musicxml sin comprimir.');}
    const reader=new Blob([compressed]).stream().pipeThrough(ds).getReader();const chunks=[];let len=0;
    for(;;){const {done,value}=await reader.read();if(done)break;len+=value.length;if(len>MAX){await reader.cancel();throw Error('MXL demasiado grande.');}chunks.push(value);}result=new Uint8Array(len);let j=0;for(const c of chunks){result.set(c,j);j+=c.length;}
   }else throw Error('Método ZIP no compatible: '+method);
   if(result.length!==unpacked)throw Error('Tamaño MXL inconsistente.');return text.decode(result);
  });
 }return entries;
}
const child=(el,name)=>Array.from(el.children).find(e=>e.localName===name);
const children=(el,name)=>Array.from(el.children).filter(e=>e.localName===name);
const val=(el,name,fallback='')=>child(el,name)?.textContent??fallback;
const num=(el,name,fallback=0)=>Number(val(el,name,fallback));
function readHarmony(el,start,measure){
 const root=child(el,'root'),bass=child(el,'bass'),kind=child(el,'kind'),frame=child(el,'frame');
 const accidental=n=>n===-2?'♭♭':n===-1?'♭':n===1?'♯':n===2?'𝄪':'';
 const rootName=root?val(root,'root-step')+accidental(num(root,'root-alter')):'';
 const suffixes={major:'',minor:'m',dominant:'7','major-seventh':'maj7','minor-seventh':'m7',diminished:'dim',augmented:'aug','half-diminished':'m7♭5','diminished-seventh':'dim7','major-sixth':'6','minor-sixth':'m6','dominant-ninth':'9','major-ninth':'maj9','minor-ninth':'m9','suspended-second':'sus2','suspended-fourth':'sus4',power:'5',none:''};
 const type=kind?.textContent??'major',suffix=kind?.getAttribute('text')??suffixes[type]??type;
 const degrees=children(el,'degree').map(d=>(val(d,'degree-type')==='subtract'?'omit':val(d,'degree-type')==='add'?'add':'')+accidental(num(d,'degree-alter'))+val(d,'degree-value')).join('');
 const label=type==='none'?'N.C.':rootName+suffix+(degrees?'('+degrees+')':'')+(bass?'/'+val(bass,'bass-step')+accidental(num(bass,'bass-alter')):'');
 return {start,measure,label,root:rootName,kind:type,frame:frame?{firstFret:num(frame,'first-fret',1),frets:num(frame,'frame-frets',4),strings:num(frame,'frame-strings',6),notes:children(frame,'frame-note').map(n=>({string:num(n,'string'),fret:num(n,'fret'),finger:val(n,'fingering'),barre:child(n,'barre')?.getAttribute('type')}))}:null};
}
function xmlDoc(source){const doc=new DOMParser().parseFromString(source,'application/xml');if(doc.querySelector('parsererror'))throw Error('MusicXML no válido.');return doc;}
export function parseXML(source){
 const doc=xmlDoc(source),root=doc.documentElement;
 if(root.localName!=='score-partwise')throw Error('Se requiere MusicXML score-partwise. Exporta nuevamente desde MuseScore.');
 const warnings=[];const definitions=new Map(Array.from(doc.getElementsByTagName('score-part')).map(p=>[p.getAttribute('id'),p]));
 const sharedTempos=[],structureMarks=[];
 const parts=children(root,'part').map((part,pi)=>{
  const id=part.getAttribute('id')||'p'+pi,definition=definitions.get(id),instrument=definition&&child(definition,'midi-instrument');
  const drumMap=new Map(definition?children(definition,'midi-instrument').filter(i=>child(i,'midi-unpitched')).map(i=>[i.getAttribute('id'),num(i,'midi-unpitched')-1]):[]);
  const drumInstruments=[...drumMap].map(([id,midi])=>({id,midi,xmlMidi:midi+1,name:children(definition,'score-instrument').find(i=>i.getAttribute('id')===id)?.querySelector('instrument-name')?.textContent??id}));
  const percussion=drumMap.size>0;const program=instrument?num(instrument,'midi-program',1)-1:0;
  let divisions=1,beats=4,unit=4,start=0,transpose=0,tuning=[];const notes=[],notation=[],keys=[],clefs=[],lyrics=[],harmonies=[],measures=[],tempos=[],meters=[],ties=new Map();
  children(part,'measure').forEach((measure,mi)=>{
   for(const mark of measure.getElementsByTagName('rehearsal'))if(mark.textContent.trim())structureMarks.push({name:mark.textContent.trim(),startMeasure:mi+1});
   let cursor=0,lastStart=0,extent=0;
   for(const el of measure.children){
    const tag=el.localName;
    if(tag==='attributes'){
     divisions=num(el,'divisions',divisions);if(divisions<=0)throw Error('Divisiones MusicXML inválidas.');
     const time=child(el,'time');if(time){beats=val(time,'beats','4').split('+').reduce((s,n)=>s+Number(n),0);unit=num(time,'beat-type',4);meters.push({start,numerator:beats,denominator:unit});}
     for(const key of children(el,'key'))keys.push({start:start+cursor,staff:Number(key.getAttribute('number')||0),fifths:num(key,'fifths'),mode:val(key,'mode','major')});
     const tr=child(el,'transpose');if(tr)transpose=num(tr,'chromatic')+12*num(tr,'octave-change');
     for(const clef of children(el,'clef'))clefs.push({start:start+cursor,staff:Number(clef.getAttribute('number')||1),sign:val(clef,'sign'),line:num(clef,'line'),octaveChange:num(clef,'clef-octave-change')});
     const staff=children(el,'staff-details').find(s=>children(s,'staff-tuning').length);if(staff)tuning=children(staff,'staff-tuning').sort((a,b)=>Number(b.getAttribute('line'))-Number(a.getAttribute('line'))).map(t=>12*(num(t,'tuning-octave')+1)+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[val(t,'tuning-step')])+num(t,'tuning-alter'));

    }
    if(tag==='direction'){
     const sound=child(el,'sound'),met=el.querySelector('metronome');let bpm=sound?Number(sound.getAttribute('tempo')):0;
     if(!bpm&&met){const units={whole:4,half:2,quarter:1,eighth:.5,'16th':.25};bpm=num(met,'per-minute',120)*(units[val(met,'beat-unit','quarter')]||1)*(child(met,'beat-unit-dot')?1.5:1);}
     if(bpm>0)tempos.push({start:start+cursor+num(el,'offset')/divisions,bpm});
    }
    if(tag==='harmony')harmonies.push(readHarmony(el,start+cursor+num(el,'offset')/divisions,mi+1));
    if(tag==='backup')cursor-=num(el,'duration')/divisions;
    if(tag==='forward'){cursor+=num(el,'duration')/divisions;extent=Math.max(extent,cursor);}
    if(tag==='note'){
     if(child(el,'grace')){warnings.push('Las notas de adorno se omiten.');continue;}
     const fermata=el.querySelector('fermata');
     const duration=num(el,'duration')/divisions,chord=!!child(el,'chord'),at=chord?lastStart:cursor,pitch=child(el,'pitch'),voice=val(el,'voice','1');
     if((pitch||child(el,'rest'))&&el.getAttribute('print-object')!=='no'){
      const tied=el.querySelector('notations');
      notation.push({start:start+at,duration,measure:mi+1,staff:num(el,'staff',1),voice,rest:!!child(el,'rest'),wholeRest:child(el,'rest')?.getAttribute('measure')==='yes',step:pitch?val(pitch,'step'):null,octave:pitch?num(pitch,'octave'):null,alter:pitch?num(pitch,'alter'):0,type:val(el,'type'),dots:children(el,'dot').length,stem:val(el,'stem'),accidental:val(el,'accidental'),ties:[...new Set([...children(el,'tie'),...(tied?children(tied,'tied'):[])].map(t=>t.getAttribute('type')))],tupletStart:tied?children(tied,'tuplet').some(t=>t.getAttribute('type')==='start'):false,tuplet:child(el,'time-modification')?num(child(el,'time-modification'),'actual-notes'):null});
     }
     if(pitch){
      for(const l of children(el,'lyric')){const texts=children(l,'text').map(t=>t.textContent).join(' ');if(texts)lyrics.push({start:start+at,duration,text:texts,syllabic:val(l,'syllabic','single'),verse:l.getAttribute('number')||'1',extend:!!child(l,'extend'),lineBreakAfter:!!child(l,'end-line')});}
      const pc={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[val(pitch,'step')],alter=num(pitch,'alter'),midi=12*(num(pitch,'octave')+1)+pc+alter+transpose;
      if(!Number.isInteger(midi)||midi<0||midi>127)throw Error('Altura no compatible (microtonos o nota MIDI inválida).');
      const key=voice+':'+val(el,'staff','1')+':'+midi,types=children(el,'tie').map(t=>t.getAttribute('type'));
      const old=ties.get(key);
      if(types.includes('stop')&&old&&Math.abs(old.start+old.duration-(start+at))<1e-5){old.duration+=duration;if(fermata)(old.fermatas??=[]).push({start:start+at,duration,type:fermata.getAttribute('type')||'upright'});for(const l of lyrics){if(l.start<start+at&&Math.abs(l.start+l.duration-(start+at))<1e-5&&!lyrics.some(next=>next.verse===l.verse&&Math.abs(next.start-(start+at))<1e-5))l.duration+=duration;}if(!types.includes('start'))ties.delete(key);}
      else {const n={id:`p${pi}n${notes.length}`,midi,writtenMidi:midi-transpose,start:start+at,duration,measure:mi+1,beat:at/(4/unit)+1,staff:num(el,'staff',1),voice,velocity:.75};if(fermata)n.fermatas=[{start:start+at,duration,type:fermata.getAttribute('type')||'upright'}];const technical=el.querySelector('technical');const slide=el.querySelector('slide');if(slide)n.slide=slide.getAttribute('type');if(technical){n.string=num(technical,'string');n.fret=num(technical,'fret',-1);}notes.push(n);if(types.includes('start'))ties.set(key,n);}
     }else if(child(el,'unpitched')){
      const drumId=child(el,'instrument')?.getAttribute('id'),midi=drumMap.get(drumId)??(drumMap.size===1?[...drumMap.values()][0]:null);
      const unpitched=child(el,'unpitched'),info=drumInstruments.find(i=>i.id===drumId);
      if(midi!==null)notes.push({instrumentId:drumId,drumName:info?.name,displayStep:val(unpitched,'display-step'),displayOctave:num(unpitched,'display-octave'),notehead:val(el,'notehead','normal'),id:`p${pi}n${notes.length}`,midi,start:start+at,duration,measure:mi+1,beat:at/(4/unit)+1,voice,velocity:.65,drum:true});
      else warnings.push('Se omitió percusión sin asignación MIDI.');
     }
     if(!chord){lastStart=cursor;cursor+=duration;}extent=Math.max(extent,at+duration,cursor);
    }
   }
   if(measure.querySelector('repeat, ending, segno, coda')||measure.querySelector('sound[dc],sound[ds]'))warnings.push('Las repeticiones y saltos se leen una vez; usa bucles para repetir secciones.');
   const nominal=beats*4/unit;const duration=extent>0&& (measure.getAttribute('implicit')==='yes'||mi===0&&extent<nominal)?extent:Math.max(nominal,extent);
   measures.push({number:mi+1,start,duration,numerator:beats,denominator:unit});start+=duration;
  });
  clefs.sort((a,b)=>a.start-b.start);for(const n of notes){const clef=clefs.findLast(c=>c.staff===(n.staff??1)&&c.start<=n.start);if(clef){n.clef=clef.sign;n.clefLine=clef.line;}}
  sharedTempos.push(...tempos);
  return {id,sourceTrack:pi,name:(definition?val(definition,'part-name','Parte '+(pi+1)):'Parte '+(pi+1)).trim(),program,percussion,notation,keys,clefs,tuning:tuning.map(m=>m+transpose),drumInstruments,lyrics:lyrics.sort((a,b)=>a.start-b.start),harmonies:harmonies.sort((a,b)=>a.start-b.start),notes:notes.sort((a,b)=>a.start-b.start),measures,tempos,meters:meters.length?meters:[{start:0,numerator:4,denominator:4}]};
 });
 const tempoMap=[...new Map(sharedTempos.sort((a,b)=>a.start-b.start).map(t=>[t.start,t])).values()];if(!tempoMap.some(t=>t.start===0))tempoMap.unshift({start:0,bpm:120});for(const p of parts)p.tempos=tempoMap;
 if(!parts.some(p=>p.notes.length))throw Error('La partitura no contiene notas con altura.');
 return {version:1,musicXml:{xml:source},title:doc.querySelector('work-title, movement-title')?.textContent||'Partitura sin título',parts,structureMarks:[...new Map(structureMarks.map(m=>[m.startMeasure,m])).values()].sort((a,b)=>a.startMeasure-b.startMeasure),warnings:[...new Set(warnings)]};
}
export function parseMIDI(buffer){
 const v=new DataView(buffer);let p=0;const u8=()=>{if(p>=v.byteLength)throw Error('MIDI incompleto.');return v.getUint8(p++);},u16=()=>u8()*256+u8(),u32=()=>u16()*65536+u16(),str=n=>String.fromCharCode(...Array.from({length:n},u8));
 const vlq=()=>{let n=0;for(let i=0;i<4;i++){const b=u8();n=n*128+(b&127);if(!(b&128))return n;}throw Error('MIDI: duración variable inválida.');};
 if(str(4)!=='MThd')throw Error('Cabecera MIDI inválida.');const header=u32(),format=u16(),count=u16(),ppq=u16();if(header<6||format>1||!ppq||ppq&0x8000)throw Error('Solo MIDI tipo 0/1 con resolución PPQ (no SMPTE).');p=8+header;
 const tempos=[],meters=[],parts=[],warnings=[];
 for(let ti=0;ti<count;ti++){
  if(str(4)!=='MTrk')throw Error('Pista MIDI inválida.');const len=u32(),end=p+len;if(end>v.byteLength)throw Error('Pista MIDI incompleta.');let tick=0,running=0,name='Pista '+(ti+1);const channels=new Map(),active=new Map(),programs=new Map();
  while(p<end){tick+=vlq();let status=u8();if(status<128){if(!running)throw Error('Running status MIDI inválido.');p--;status=running;}else if(status<240)running=status;
   if(status===255){running=0;const type=u8(),size=vlq(),data=Array.from({length:size},u8);if(type===3)name=text.decode(new Uint8Array(data));if(type===81&&size===3)tempos.push({start:tick/ppq,bpm:60000000/(data[0]*65536+data[1]*256+data[2])});if(type===88&&size>=2)meters.push({start:tick/ppq,numerator:data[0],denominator:2**data[1]});continue;}
   if(status===240||status===247){running=0;const size=vlq();p+=size;continue;}
   const kind=status>>4,ch=status&15;if(kind<8||kind>14)throw Error('Evento MIDI no compatible.');const a=u8(),b=kind===12||kind===13?0:u8();if(kind===12)programs.set(ch,a);const key=ch+':'+a;
   if(kind===9&&b){if(!active.has(key))active.set(key,[]);active.get(key).push({tick,velocity:b/127});}
   if(kind===8||kind===9&&!b){const on=active.get(key)?.shift();if(on){if(!channels.has(ch))channels.set(ch,[]);channels.get(ch).push({id:`t${ti}c${ch}n${channels.get(ch).length}`,midi:a,start:on.tick/ppq,duration:Math.max(1/ppq,(tick-on.tick)/ppq),velocity:on.velocity,voice:String(ch+1)});}}
   if(kind===11&&a===64&&b>=64)warnings.push('El pedal de sustain MIDI no se aplica al metalófono.');
  }p=end;
  for(const [key,pending] of active)if(pending.length)warnings.push('Se omitieron notas MIDI sin cierre note-off.');
  for(const [ch,notes]of channels){parts.push({id:`t${ti}c${ch}`,name:name+' · canal '+(ch+1),program:programs.get(ch)||0,percussion:ch===9,notes:notes.sort((a,b)=>a.start-b.start)});}
 }
 tempos.sort((a,b)=>a.start-b.start);meters.sort((a,b)=>a.start-b.start);if(!tempos.some(t=>t.start===0))tempos.unshift({start:0,bpm:120});if(!meters.some(t=>t.start===0))meters.unshift({start:0,numerator:4,denominator:4});
 for(const part of parts){part.tempos=tempos;part.meters=meters;const end=part.notes.reduce((end,n)=>Math.max(end,n.start+n.duration),0);let at=0,i=0;part.measures=[];while(at<end-1e-7){while(i+1<meters.length&&meters[i+1].start<=at+1e-7)i++;const m=meters[i],duration=Math.min(m.numerator*4/m.denominator,(meters[i+1]?.start??Infinity)-at);if(duration<=0||part.measures.length>100000)throw Error('Mapa de compases MIDI inválido.');part.measures.push({number:part.measures.length+1,start:at,duration,numerator:m.numerator,denominator:m.denominator});at+=duration;}
  let mi=0;for(const n of part.notes){while(mi+1<part.measures.length&&part.measures[mi+1].start<=n.start)mi++;const m=part.measures[mi];n.measure=m.number;n.beat=(n.start-m.start)/(4/m.denominator)+1;}
 }
 if(!parts.length)throw Error('No hay notas melódicas MIDI.');return {version:1,title:'Archivo MIDI',parts,warnings:[...new Set(warnings)]};
}
export async function parseFile(file){if(file.size>MAX)throw Error('El archivo supera 32 MB.');const ext=file.name.split('.').pop().toLowerCase(),buffer=await file.arrayBuffer();let score;
 if(ext==='mid'||ext==='midi')score=parseMIDI(buffer);else if(ext==='musicxml')score=parseXML(text.decode(buffer));else if(ext==='mxl'){
  const entries=await unzip(buffer);let path;
  if(entries.has('META-INF/container.xml')){const d=xmlDoc(await entries.get('META-INF/container.xml')());path=d.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');}
  path=path||[...entries.keys()].find(n=>/\.(musicxml|xml)$/i.test(n)&&!n.startsWith('META-INF/'));
  if(!path||!entries.has(path))throw Error('No se encuentra la partitura dentro del MXL.');score=parseXML(await entries.get(path)());
 }else throw Error('Selecciona .mxl, .musicxml, .mid o .midi.');
 if(ext==='mid'||ext==='midi'||!score.title||/sin t[íi]tulo/i.test(score.title))score.title=file.name.replace(/\.[^.]+$/,'');return score;
}
