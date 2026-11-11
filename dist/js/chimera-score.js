import {vocalPhrases} from './vocals.js';
export const CHIMERA_BODIES={male:{female:0,child:0},female:{female:1,child:0},child:{female:0,child:1}};
export function chimeraHairStyle(body,style='auto'){return ['none','short','long'].includes(style)?style:body==='female'?'long':'none';}
export function defaultChimeraBody(part){return /soprano|contralto|\balto\b/i.test(part.name)?'female':'male';}
export function chimeraLyricKey(lyric){return (lyric.verse??'1')+':'+lyric.start;}
export function chimeraLyricEntries(part){return vocalPhrases(part.lyrics,part.notes).flatMap(p=>p.syllables).map(lyric=>({...lyric,key:chimeraLyricKey(lyric)}));}
export function chimeraDisplayPart(part,edits={}){return {...part,lyrics:(part.lyrics??[]).map(lyric=>{const text=edits[chimeraLyricKey(lyric)];return {...lyric,text:text===undefined?lyric.text:text==='-'?'_':text,extend:true};})};}
export function validateChimeraLyricEdits(part,edits,syllabify){
 const keys=new Set(chimeraLyricEntries(part).map(l=>l.key));
 for(const [key,text] of Object.entries(edits)){if(!keys.has(key)||typeof text!=='string'||!text.trim()||text.length>100)throw Error('Corrección de sílaba no válida.');if(text!=='-'){const syllables=syllabify(text);if(syllables.length!==1)throw Error(`«${text}» produce ${syllables.length} sílabas. Usa una sílaba por casilla, o «-» para prolongar la vocal.`);}}
 return edits;
}
export function chimeraPhrases(part,seconds,syllabify){
 const lyrics=chimeraLyricEntries(part),edits=part.chimeraLyricEdits??{},mapped=new Map();let word=[];
 validateChimeraLyricEdits(part,edits,syllabify);
 function finish(){
  if(!word.length)return;const text=word.map(l=>l.text).join(''),allEdited=word.every(l=>edits[l.key]!==undefined);let syllables=allEdited?[]:syllabify(text);
  if(!allEdited&&syllables.length>word.length){const explicit=word.map(l=>syllabify(l.text));if(explicit.every(s=>s.length===1))syllables=explicit.map(s=>s[0]);}
  if(!allEdited&&(syllables.length===0||syllables.length>word.length))throw Error(`«${part.name}»: Chimera interpreta ${syllables.length} sílabas en «${text}», pero el MXL tiene ${word.length}. Puedes corregirlas en el editor de sílabas.`);
  let last=syllables[0];
  word.forEach((lyric,i)=>{
   const edited=edits[lyric.key];let syl;
   if(edited==='-')syl={...(last??{nucleus:{ipa:'ɑ',stress:1},wordEnd:true,phraseEnd:false}),text:'-',onset:[],coda:[],melisma:true};
   else if(edited!==undefined){syl={...syllabify(edited)[0],text:edited};last=syl;}
   else if(i<syllables.length){syl={...syllables[i],text:lyric.text};last=syl;}
   else syl={...last,text:lyric.text,onset:[],coda:[],melisma:true};
   mapped.set(lyric.start,syl);
  });word=[];
 }
 for(const lyric of lyrics){const type=lyric.syllabic??'single';if(type==='begin'||type==='single')finish();word.push(lyric);if(type==='end'||type==='single')finish();}finish();
 // Una sílaba escrita dentro de una ligadura conserva su instante sin reatacar la vocal del melisma.
 const boundaries=[...mapped.keys()].sort((a,b)=>a-b),notes=part.notes.flatMap(note=>{const end=note.start+note.duration,cuts=[note.start,...boundaries.filter(at=>at>note.start+1e-7&&at<end-1e-7),end];return cuts.slice(0,-1).map((start,i)=>({...note,start,duration:cuts[i+1]-start}));});
 const phrases=[];let phrase,lastEnd=-Infinity,lastSyllable={text:'ah',onset:[],nucleus:{ipa:'ɑ',stress:1},coda:[],wordEnd:true,phraseEnd:false};
 for(const note of notes){if(note.start<lastEnd-1e-5)throw Error(`«${part.name}» tiene notas simultáneas. Separa cada voz para cantarla con Chimera.`);
  const start=seconds(0,note.start),duration=seconds(note.start,note.start+note.duration),direct=mapped.get(note.start),syl=direct??{...lastSyllable,text:'-',onset:[],coda:[],melisma:true};
  if(!phrase||note.start>lastEnd+1e-5){phrase={start,notes:[]};phrases.push(phrase);if(!direct)syl.melisma=false;}
  phrase.notes.push({midi:note.soundMidi??note.midi,beats:duration*2,syl:{...syl}});if(direct&&!direct.melisma)lastSyllable=direct;lastEnd=note.start+note.duration;
 }
 return phrases;
}
