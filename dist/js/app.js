import {prepareAlphaScore} from './alpha-score.js';
import {chimeraDisplayPart,chimeraLyricEntries,validateChimeraLyricEdits} from './chimera-score.js';
import {chimera,loadChimera} from './chimera.js';
import {keyboardSound,KEYBOARD_SOUNDS} from './keyboard-sounds.js';
import {wholeBars} from './rhythm.js';
import {setupViewport} from './viewport.js';
import {spellingAt,loadPianoScoreFont} from './piano-score.js';
import {createExportJob} from './export-job.js';
import {visualTheme,musicalPalette,sectionFillColor,themedSections} from './appearance.js';
import {setupStyleLab,getCustomFontAsset} from './style-lab.js';
import {instructionDefaults,introDuration,drawVideoIntro} from './video-intro.js';
import {playerShortcutHandlers,pulseSeekTarget} from './shortcuts.js';
import {prepareTutorial} from './tutorials.js';
import {bassNotes,bassTuning} from './bass.js';
import {DRUMS,drumNotes,drumLanes,drumInfo,mappedDrumMidi} from './drums.js';
import {vocalPhrases,vocalPitchRange,vocalPhraseNotes,vocalEnsemble} from './vocals.js';
import {guitarNotes,guitarHarmonies} from './guitar.js';
import {example,transformed,rangeCount,noteName as rawNoteName,measureAt,clamp} from './model.js';
import {instrumentConfig,detectedParts,partDisplayName,defaultInstrument} from './instruments.js';
import {parseFile} from './parser.js';
import {AudioEngine} from './metronome.js';
import {Scheduler} from './scheduler.js';
import {Renderer,PALETTE} from './renderer.js';
import {Structure,download,sectionsFromMarks,sectionColor} from './structure.js';
import {structureSegments,segmentProgress,segmentAt,contrastColor,measureRangeLabel} from './progress.js';
import {Exporter} from './exporter.js';
import {Accompaniment,backingEvents} from './accompaniment.js';
const $=id=>document.getElementById(id), audio=new AudioEngine(),renderer=new Renderer($('stage')),exporter=new Exporter($('stage'),audio);
const accompaniment=new Accompaniment(audio);
let progressSegments=[],progressButtons=[],lastProgressId=null;
const labelMeasureContext=document.createElement('canvas').getContext('2d');
function fitProgressLabel(button){const label=button.querySelector('span');if(!label)return;labelMeasureContext.font=getComputedStyle(label).font;const text=measureRangeLabel(Number(label.dataset.start),Number(label.dataset.end),label.clientWidth,t=>labelMeasureContext.measureText(t).width);if(label.textContent!==text)label.textContent=text;}
const progressResizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(entries=>entries.forEach(e=>fitProgressLabel(e.target))):null;
window.addEventListener('resize',()=>progressButtons.forEach(fitProgressLabel));
const instrumentPrefs={bajo:{base:0,octave:'0',semitones:0,mode:'all'},bateria:{base:0,octave:'0',semitones:0,mode:'all'},voz:{base:0,octave:'0',semitones:0,mode:'all'},guitarra:{base:40,octave:'0',semitones:0,mode:'all'},metalofono:{base:55,octave:'0',semitones:0,mode:'upper'},piano:{base:36,octave:'0',semitones:0,mode:'all'}};const lastPart={};
let keyboardSounds={},drumMappings={},drumMix={},videoInstructions={},recordIntro=null;
let scoreFileName='Ejemplo incluido';
let noticeTimer,score,part,allNotes,notes,scoreKey='example-v1',recordBackup=null,importToken=0;
function notify(message){$('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,9500);}
const structure=new Structure(notify),scheduler=new Scheduler(audio,()=>{syncPlay();if(exporter.active){const session=exporter.batch?.current,recorder=exporter.recorder;setTimeout(()=>{if(session){if(exporter.batch?.current===session)exporter.finishPart();}else if(exporter.active&&!exporter.batch&&exporter.recorder===recorder)exporter.stop();},950);}});
function noteName(midi,latin=true,middle=4){return rawNoteName(midi,latin,middle,part?spellingAt(part,scheduler.current(),renderer.opts,structure.sections):renderer.opts.noteSpelling);}
const number=(id,min,max)=>{const el=$(id),v=Number(el.value);const n=clamp(Number.isFinite(v)?v:min,min,max);el.value=String(n);return n;};
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
audio.chimera=chimera;
const startRecordedStems=audio.startStems;
audio.startStems=s=>{startRecordedStems(s);chimera.start(s,audio,accompaniment,part.id);};
audio.prepare=async clock=>{
 if(!chimera.enabled)return;const voices=detectedParts(score.parts,'voz').map(x=>x.part.id===part.id?{...x.part,notes:allNotes}:x.part);
 const result=await chimera.prepare(voices,clock,audio.ctx,message=>{$('chimeraStatus').textContent=message;notify(message);},{selectedId:part.id,overview:!!renderer.opts.vocalOverview});
 const available=[...chimera.records.values()].filter(record=>record.active).length;
 $('chimeraStatus').textContent=`Chimera listo · ${available} voces disponibles · ${result.rendered} procesadas, ${result.disk+result.memory} reutilizadas.`+(chimera.cache.lastError?' No se pudo guardar todo en el navegador.':' Guardadas en este navegador.');
};
try{const saved=localStorage.getItem('adaptaciones.chimera.processing');if(['all','individual'].includes(saved))chimera.processing=saved;}catch{}
try{renderer.opts.chimeraStyle=localStorage.getItem('adaptaciones.chimera.style')||'auto';}catch{}
$('chimeraStyle').value=renderer.opts.chimeraStyle||'auto';
$('chimeraStyle').onchange=()=>{renderer.opts.chimeraStyle=$('chimeraStyle').value;try{localStorage.setItem('adaptaciones.chimera.style',renderer.opts.chimeraStyle);}catch{}};
try{renderer.opts.stringVisualization=localStorage.getItem('adaptaciones.strings.view')||'score';}catch{}
$('stringVisualization').value=renderer.opts.stringVisualization;
$('stringVisualization').onchange=()=>{renderer.opts.stringVisualization=$('stringVisualization').value;try{localStorage.setItem('adaptaciones.strings.view',renderer.opts.stringVisualization);}catch{}rebuild();};
$('chimeraProcessing').value=chimera.processing;
$('chimeraProcessing').onchange=()=>{chimera.processing=$('chimeraProcessing').value;try{localStorage.setItem('adaptaciones.chimera.processing',chimera.processing);}catch{}};
$('clearChimeraCache').onclick=async()=>{scheduler.pause();try{await chimera.clearCache();$('chimeraStatus').textContent='Voces guardadas eliminadas. Se volverán a procesar cuando las necesites.';}catch(error){notify('No se pudo borrar la caché: '+error.message);}syncPlay();};
function loadChimeraProfiles(){
 try{const profiles=JSON.parse(localStorage.getItem('adaptaciones.chimera.profiles.'+scoreKey)||'{}');chimera.profiles=Object.fromEntries(Object.entries(profiles).filter(([,value])=>['male','female','child'].includes(value)));}catch{}
 try{const appearance=JSON.parse(localStorage.getItem('adaptaciones.chimera.appearance.'+scoreKey)||'{}');chimera.appearance=Object.fromEntries(Object.entries(appearance).filter(([,value])=>['auto','none','short','long'].includes(value)));}catch{}
 try{const stored=JSON.parse(localStorage.getItem('adaptaciones.chimera.lyrics.'+scoreKey)||'{}');chimera.lyricEdits=Object.fromEntries(Object.entries(stored).filter(([,edits])=>edits&&typeof edits==='object'&&!Array.isArray(edits)).map(([id,edits])=>[id,Object.fromEntries(Object.entries(edits).filter(([key,value])=>key.length<200&&typeof value==='string'&&value.trim()&&value.length<=100))]));}catch{}
}
function vocalDisplayPart(p){const edits=chimera.lyricEdits[p.id];return chimera.enabled?chimeraDisplayPart(p,edits??{}):p;}
function renderChimeraLyricEditor(){
 const voice=score.parts.find(p=>p.id===$('chimeraLyricsPart').value);$('chimeraLyricInputs').replaceChildren();if(!voice)return;
 const entries=chimeraLyricEntries(voice),edits=chimera.lyricEdits[voice.id]??{};
 for(const [index,entry] of entries.entries()){
  const bar=measureAt(voice,entry.start),label=document.createElement('label');label.className='chimera-lyric';label.title=`Compás ${bar.number} · MXL: ${entry.text}`;const number=document.createElement('span');number.textContent=`${index+1} · c.${bar.number}`;const input=document.createElement('input');input.type='text';input.maxLength=100;input.value=edits[entry.key]??entry.text;input.dataset.lyricKey=entry.key;input.dataset.original=entry.text;input.style.width=Math.max(56,Math.min(130,input.value.length*10+22))+'px';input.setAttribute('aria-label',`Sílaba ${index+1}, compás ${bar.number}, original ${entry.text}`);input.classList.toggle('edited',input.value!==entry.text);input.oninput=()=>input.classList.toggle('edited',input.value.trim()!==entry.text);label.append(number,input);$('chimeraLyricInputs').append(label);
 }
 $('chimeraLyricsInfo').textContent=`${entries.length} sílabas del MXL · las correcciones se guardan por voz y partitura.`;
}
function saveChimeraLyricEdits(voice,edits){
 scheduler.pause();chimera.cancelPreparation();const changed=chimera.setLyricEdits(voice,edits);try{localStorage.setItem('adaptaciones.chimera.lyrics.'+scoreKey,JSON.stringify(chimera.lyricEdits));}catch{}
 if(changed)rebuild();renderChimeraLyricEditor();$('chimeraLyricsInfo').textContent=changed?'Sílabas guardadas. Pulsa reproducir para preparar esta voz.':'Las sílabas ya coinciden con esta configuración.';syncPlay();
}
$('chimeraLyricsEditor').ontoggle=()=>{if($('chimeraLyricsEditor').open)renderChimeraLyricEditor();};$('chimeraLyricsPart').onchange=renderChimeraLyricEditor;
$('applyChimeraLyrics').onclick=async()=>{
 const voice=score.parts.find(p=>p.id===$('chimeraLyricsPart').value);if(!voice)return;
 try{const edits={};for(const input of $('chimeraLyricInputs').querySelectorAll('input')){const text=input.value.trim();if(!text)throw Error('Usa «-» para una prolongación; no dejes casillas vacías.');if(text!==input.dataset.original)edits[input.dataset.lyricKey]=text;}const api=await loadChimera();validateChimeraLyricEdits(voice,edits,api.lyricsToSyllables);saveChimeraLyricEdits(voice,edits);}catch(error){$('chimeraLyricsInfo').textContent=error.message;}
};
$('resetChimeraLyrics').onclick=()=>{const voice=score.parts.find(p=>p.id===$('chimeraLyricsPart').value);if(voice)saveChimeraLyricEdits(voice,{});};
function renderChimeraProfiles(){
 $('chimeraProfiles').replaceChildren();$('stringVisualization').hidden=!['guitarra','bajo'].includes(renderer.opts.instrument);
 const voices=detectedParts(score.parts,'voz');$('chimeraNoVoices').hidden=voices.length>0;$('chimeraSettings').hidden=voices.length===0;$('chimeraLyricsPart').replaceChildren(...voices.map(({part:p})=>option(p.id,p.name)));$('chimeraLyricsPart').value=voices.some(x=>x.part.id===part.id)?part.id:voices[0]?.part.id??'';if($('chimeraLyricsEditor').open)renderChimeraLyricEditor();
 for(const {part:voice} of detectedParts(score.parts,'voz')){
  const row=document.createElement('div');row.className='field-row';const label=document.createElement('label');label.className='field';label.append(document.createTextNode(voice.name+' · modelo vocal'));
  const select=document.createElement('select');select.setAttribute('aria-label','Modelo Chimera de '+voice.name);select.replaceChildren(...['male','female','child'].map(name=>option(name,name)));select.value=chimera.profile(voice);
  select.onchange=()=>{scheduler.pause();chimera.cancelPreparation();chimera.setProfile(voice,select.value);try{localStorage.setItem('adaptaciones.chimera.profiles.'+scoreKey,JSON.stringify(chimera.profiles));}catch{}$('chimeraStatus').textContent='Modelo actualizado en la figura. Pulsa reproducir para preparar el nuevo timbre.';syncPlay();};label.append(select);
  const hairLabel=document.createElement('label');hairLabel.className='field';hairLabel.append(document.createTextNode(voice.name+' · cabello'));const hair=document.createElement('select');hair.setAttribute('aria-label','Cabello de '+voice.name);hair.replaceChildren(...[['auto','Automático'],['none','Sin cabello'],['short','Corto'],['long','Largo']].map(([value,text])=>option(value,text)));hair.value=chimera.appearance[voice.id]??'auto';hair.onchange=()=>{chimera.appearance[voice.id]=hair.value;try{localStorage.setItem('adaptaciones.chimera.appearance.'+scoreKey,JSON.stringify(chimera.appearance));}catch{}};hairLabel.append(hair);
  row.append(label,hairLabel);$('chimeraProfiles').append(row);
 }
}
async function setChimera(enabled,view=false){
 const wasPlaying=scheduler.playing;scheduler.pause();chimera.cancelPreparation();
 try{if(enabled&&view)await clean(true);if(enabled){$('chimeraStatus').textContent='Cargando motor Chimera…';await loadChimera();}chimera.enabled=enabled;rebuild();$('vocalEngine').value=enabled?'chimera':'samples';if(view)renderer.opts.vocalVisualization=enabled?'chimera':'notes';if(!enabled&&renderer.opts.vocalVisualization==='chimera')renderer.opts.vocalVisualization='notes';$('vocalVisualization').value=renderer.opts.vocalVisualization??'notes';$('chimeraStatus').textContent=enabled?'Motor listo. Pulsa reproducir para preparar las voces.':'Coro muestreado activo.';if(wasPlaying)await scheduler.play(false);}
 catch(error){chimera.enabled=false;renderer.opts.vocalVisualization='notes';$('vocalVisualization').value='notes';$('vocalEngine').value='samples';$('chimeraStatus').textContent=error.message;notify(error.message);if(view)await clean(false);}
 syncPlay();
}
$('vocalEngine').onchange=()=>setChimera($('vocalEngine').value==='chimera');
$('vocalVisualization').onchange=()=>{if($('vocalVisualization').value==='chimera')setChimera(true,true);else{renderer.opts.vocalVisualization='notes';if(document.body.classList.contains('clean'))clean(false);}};
function installScore(newScore,key,isExample=false,fileName='Ejemplo incluido'){const playable=newScore.parts.filter(p=>p.notes.length&&p.measures.length);if(!playable.length)throw Error('El archivo no contiene notas reproducibles.');scheduler.pause();scoreFileName=fileName;score={...newScore,parts:playable};renderer.opts.musicXml=score.musicXml;scoreKey=key;chimera.clear();loadChimeraProfiles();keyboardSounds={};drumMappings={};drumMix={};videoInstructions={};for(const type of Object.keys(lastPart))delete lastPart[type];accompaniment.load(score.parts);const initial=['metalofono','piano','voz','guitarra','bajo','bateria'].find(type=>detectedParts(score.parts,type).length)||'metalofono';configureInstrument(initial,false);$('pitchSource').value='written';$('sourceBadge').textContent=isExample?'EJEMPLO':'ARCHIVO';$('videoTitle').value=score.title;renderer.opts.title=score.title;$('scoreName').textContent=score.title;selectPart();if(score.warnings.length)notify(score.warnings.join(' '));}
function configureInstrument(type,remember=true){
 if(remember&&part){const old=renderer.opts.instrument;instrumentPrefs[old]={...instrumentPrefs[old],cascade:renderer.opts.cascade,base:Number($('base').value),octave:$('octave').value,semitones:Number($('semitones').value),mode:$('mode').value};lastPart[old]=part.id;}
 $('keyboardSoundSettings').hidden=type!=='piano';$('pianoScoreSettings').hidden=type!=='piano';$('pianoClefHint').hidden=type!=='piano';$('vocalSettings').hidden=type!=='voz';$('drumSettings').hidden=type!=='bateria';$('instrumentAdjustments').hidden=type==='bateria';$('instrument').value=type;renderer.opts.instrument=type;audio.tutorialInstrument=type;const config=instrumentConfig(type),prefs=instrumentPrefs[type];renderer.opts.cascade=prefs.cascade??['piano','metalofono'].includes(type);$('cascade').checked=renderer.opts.cascade;$('showCascadeNoteNames').disabled=!renderer.opts.cascade;$('base').max=config.maxBase;$('base').value=clamp(prefs.base,0,config.maxBase);$('octave').value=prefs.octave;$('semitones').value=prefs.semitones;
 for(const o of $('mode').options)o.disabled=type!=='metalofono'?o.value!=='all':o.value==='all';$('mode').value=type!=='metalofono'?'all':prefs.mode;$('mode').disabled=type!=='metalofono';$('metalToneField').hidden=type!=='metalofono';$('schemeField').hidden=type!=='metalofono';$('palette').hidden=type!=='metalofono';
 const matches=detectedParts(score.parts,type),matched=new Set(matches.map(x=>x.index)),others=score.parts.map((part,index)=>({part,index})).filter(x=>!!x.part.percussion===(type==='bateria')&&!matched.has(x.index));$('part').replaceChildren();
 for(const [label,list]of [[type==='bateria'?'Baterías detectadas':type==='bajo'?'Bajos detectados':type==='voz'?'Voces detectadas':type==='guitarra'?'Guitarras detectadas':type==='piano'?'Teclados y sintetizadores detectados':'Metalófonos detectados',matches],['Otras partes (selección manual)',others]])if(list.length){const group=document.createElement('optgroup');group.label=label;for(const x of list)group.append(option(x.index,partDisplayName(score.parts,x.index)));$('part').append(group);}
 const remembered=score.parts.findIndex(p=>p.id===lastPart[type]&&!!p.percussion===(type==='bateria')),selected=remembered>=0?remembered:matches[0]?.index??others[0]?.index??0;$('part').value=String(selected);
 $('detectedParts').textContent=matches.length?`${matches.length} ${type==='bateria'?'parte(s) de batería':type==='bajo'?'parte(s) de bajo':type==='voz'?'parte(s) de voz':type==='guitarra'?'parte(s) de guitarra':type==='piano'?'parte(s) de teclado o sintetizador':'parte(s) de metalófono'} detectadas. Elige cuál quieres enseñar.`:'No se reconoció este instrumento; puedes elegir una parte manualmente.';
 for(const label of document.querySelectorAll('[data-tutorial-name]'))label.textContent=config.name;
 $('stage').setAttribute('aria-label',type==='bateria'?'Batería: carriles con nombres y símbolos de cada elemento.':type==='bajo'?'Bajo: tablatura con cuerdas, trastes y notas sostenidas.':type==='voz'?'Voz: melodía por alturas y letra sincronizada por sílabas.':type==='guitarra'?'Guitarra: tablatura en movimiento y diapasón con cuerdas y trastes.':type==='piano'?'Piano de cuatro octavas con estela de preparación. Pulsa una tecla para escucharla.':'Metalófono de 25 láminas con baquetas de preparación. Pulsa una lámina para escucharla.');
}
function partInstruction(p){return videoInstructions[p.id]??instructionDefaults(defaultInstrument(p));}
function loadInstructionSettings(){const instruction=partInstruction(part);$('introPartName').textContent='Para «'+partDisplayName(score.parts,score.parts.indexOf(part))+'»';$('introEnabled').checked=instruction.enabled;$('introText').value=instruction.text;$('introSeconds').value=instruction.seconds;for(const id of ['introText','introSeconds'])$(id).disabled=!instruction.enabled;}
function saveInstructionSettings(){videoInstructions[part.id]={enabled:$('introEnabled').checked,text:$('introText').value,seconds:number('introSeconds',2,30)};for(const id of ['introText','introSeconds'])$(id).disabled=!$('introEnabled').checked;}
$('introEnabled').onchange=saveInstructionSettings;$('introText').oninput=saveInstructionSettings;$('introSeconds').onchange=saveInstructionSettings;
function cancelRecordIntro(){if(!recordIntro)return;const intro=recordIntro;recordIntro=null;intro.resolve(false);}
function runRecordIntro(seconds,views){return new Promise(resolve=>{recordIntro={start:performance.now(),seconds,views,resolve};});}
function syncPartFocus(){accompaniment.focused=$('focusPart').checked&&!renderer.opts.vocalOverview;accompaniment.update();}
function syncQuickPart(){
 syncPartFocus();
 $('stringVisualization').hidden=!['guitarra','bajo'].includes(renderer.opts.instrument);
 const voices=detectedParts(score.parts,'voz');$('vocalVisualization').hidden=renderer.opts.instrument!=='voz';$('vocalVisualization').value=renderer.opts.vocalVisualization??'notes';$('vocalOrientation').hidden=renderer.opts.instrument!=='voz';$('vocalOrientation').value=renderer.opts.vocalPortrait?'portrait':'landscape';syncCanvasOrientation();$('choralLayout').hidden=!renderer.opts.vocalOverview;$('choralLayout').value=renderer.opts.vocalLayout??'separate';
 if($('quickPart').dataset.scoreKey!==scoreKey){$('quickPart').replaceChildren(...score.parts.map((p,index)=>option(index,partDisplayName(score.parts,index))),...(voices.length>1?[option('all-voices','Todas las voces · coro')]:[]));$('quickPart').dataset.scoreKey=scoreKey;}
 $('quickPart').value=renderer.opts.vocalOverview?'all-voices':String(score.parts.indexOf(part));
 const overviewOption=$('instrument').querySelector('option[value="coro"]');overviewOption.hidden=voices.length<2;overviewOption.disabled=voices.length<2;
 $('instrument').value=renderer.opts.vocalOverview?'coro':renderer.opts.instrument;
}
async function chooseQuickPart(){
 if(exporter.active)return;
 const overview=$('quickPart').value==='all-voices',index=overview?detectedParts(score.parts,'voz')[0]?.index:Number($('quickPart').value),chosen=score.parts[index];if(!chosen)return;
 const position=Math.max(0,scheduler.current()),wasPlaying=scheduler.playing;
 scheduler.pause();const type=overview?'voz':defaultInstrument(chosen);
 if(type!==renderer.opts.instrument)configureInstrument(type);
 $('part').value=String(index);selectPart();renderer.opts.vocalOverview=overview;syncQuickPart();scheduler.seek(Math.min(position,scheduler.end));
 if(wasPlaying)try{await scheduler.play(false);}catch(e){notify('No se pudo continuar el audio: '+e.message);}
 syncPlay();
}
$('quickPart').onchange=chooseQuickPart;
function syncCanvasOrientation(){if(exporter.active)return;const portrait=renderer.opts.instrument==='voz'&&renderer.opts.vocalPortrait,w=portrait?900:1600,h=portrait?1600:900;if($('stage').width!==w)$('stage').width=w;if($('stage').height!==h)$('stage').height=h;}
$('vocalOrientation').onchange=()=>{renderer.opts.vocalPortrait=$('vocalOrientation').value==='portrait';syncCanvasOrientation();};
$('choralLayout').onchange=()=>{renderer.opts.vocalLayout=$('choralLayout').value;};
$('instrument').onchange=()=>{if($('instrument').value==='coro'){$('quickPart').value='all-voices';return chooseQuickPart();}scheduler.pause();configureInstrument($('instrument').value);selectPart();};
function selectPart(){renderer.opts.vocalOverview=false;part=score.parts[Number($('part').value)||0];syncQuickPart();loadInstructionSettings();renderChimeraProfiles();audio.keyboardSound=keyboardSound(part,keyboardSounds[part.id]);$('keyboardSound').value=audio.keyboardSound;audio.tutorialPart={id:part.id,name:part.name,program:part.program??0,drum:!!part.percussion};renderer.opts.partUnavailable=renderer.opts.instrument==='bateria'&&!part.percussion;const firstTempo=part.tempos[0]?.bpm||120;scheduler.bpm=firstTempo;$('bpm').value=Math.round(firstTempo);const m=part.measures[0];if(!m){notify('Esta parte no tiene compases; elige otra.');return;}$('numerator').value=m.numerator;$('denominator').value=m.denominator;scheduler.numerator=m.numerator;scheduler.denominator=m.denominator;
 const end=part.measures.length;for(const id of ['jump','loopStart','loopEnd','sectionStart','sectionEnd'])$(id).max=end;$('loopStart').value=1;$('loopEnd').value=end;$('sectionEnd').value=Math.min(4,end);scheduler.loop=null;$('loopToggle').setAttribute('aria-pressed','false');
 structure.load(scoreKey+'.'+part.id,end,scoreKey==='example-v1'?[{id:'a',name:'Tema A',startMeasure:1,endMeasure:4,color:'#b9ccc0'},{id:'b',name:'Tema B',startMeasure:5,endMeasure:8,color:'#b7c7d6'}]:sectionsFromMarks(score.structureMarks,end));
 accompaniment.selected=part.id;rebuild(true);renderSections();renderMixer();renderDrumMapping();$('fileStatus').textContent=`${scoreFileName} · ${part.notes.length} notas · ${end} compases`;$('tempoInfo').textContent=`${part.tempos.length} indicación(es) de tempo y ${part.meters.length} de compás. BPM expresado en negras/minuto.`;}
function rebuild(reset=false){const was=scheduler.playing,position=scheduler.current(),config=instrumentConfig(renderer.opts.instrument),base=number('base',0,config.maxBase),oct=Number($('octave').value),semi=number('semitones',-48,48),shift=oct*12+semi,pitchSource=$('pitchSource').value;allNotes=renderer.opts.instrument==='bateria'?drumNotes(part.percussion?part.notes:[],drumMappings[part.id],drumMix[part.id]):transformed(part,oct,semi,$('mode').value,pitchSource);notes=allNotes.filter(n=>n.midi>=base&&n.midi<=base+config.span);renderer.opts.base=base;if(renderer.opts.instrument==='bajo')notes=bassNotes(notes,part);if(renderer.opts.instrument==='bateria')renderer.opts.drumLanes=drumLanes(notes);if(renderer.opts.instrument==='voz'){renderer.opts.vocalEnsemble=vocalEnsemble(detectedParts(score.parts,'voz').map(x=>vocalDisplayPart(x.part)),p=>transformed(p,oct,semi,'all',pitchSource));renderer.opts.vocalColorIndex=Math.max(0,score.parts.filter(p=>p.lyrics?.length).findIndex(p=>p.id===part.id));renderer.opts.vocalPartName=part.name;renderer.opts.vocalPhrases=vocalPhrases(vocalDisplayPart(part).lyrics,notes);renderer.opts.vocalNotes=notes;renderer.opts.vocalRange=vocalPitchRange(notes);renderer.opts.vocalPages=renderer.opts.vocalPhrases.map(p=>vocalPhraseNotes(p,notes));}if(renderer.opts.instrument==='guitarra'){renderer.opts.guitarHarmonies=guitarHarmonies(score.parts,part);const offset=pitchSource==='written'?(part.notes.find(n=>n.writtenMidi!==undefined)?.midi-part.notes.find(n=>n.writtenMidi!==undefined)?.writtenMidi||0):0;notes=guitarNotes(notes,offset+shift);const missing=notes.filter(n=>!n.string).length;$('guitarHelp').textContent=`${missing?missing+' notas sin posición posible. ':''}Números = trastes · 0 = cuerda al aire · 1.ª Mi aguda arriba, 6.ª Mi grave abajo. Las posiciones propuestas llevan *.`;}$('guitarHelp').hidden=renderer.opts.instrument!=='guitarra';renderer.opts.maxDuration=notes.reduce((max,n)=>Math.max(max,n.duration),.2);
 if(reset)scheduler.configure(part,notes);else{scheduler.pause();scheduler.notes=notes;scheduler.position=Math.min(scheduler.end,Math.max(0,position));if(was)scheduler.play(false);}
 scheduler.backing=backingEvents(score.parts,part.id,{drumMappings,drumMix});$('seek').max=scheduler.end;const out=rangeCount(part,base,shift,pitchSource,config.span);$('rangeSummary').classList.toggle('warning',out>0);$('rangeSummary').textContent=out?`⚠ ${out} de ${part.notes.length} notas fuera del rango`:`✓ Las ${part.notes.length} notas caben en tu instrumento`;
 $('rangeLabel').textContent=renderer.opts.instrument==='bateria'?'Clave de percusión':renderer.opts.instrument==='bajo'?bassTuning(part).length+' cuerdas':renderer.opts.instrument==='voz'?'Melodía + letra':`${noteName(base,renderer.opts.latin,renderer.opts.middle)} — ${noteName(base+config.span,renderer.opts.latin,renderer.opts.middle)}`;
 const counts=new Map();for(const n of part.notes){const m=(pitchSource==='written'?(n.writtenMidi??n.midi):n.midi)+shift;counts.set(m,(counts.get(m)||0)+1);}$('notePreview').replaceChildren(...[...counts].sort((a,b)=>a[0]-b[0]).map(([m,count])=>{const el=document.createElement('span');el.className='note-chip'+(m<base||m>base+config.span?' out':'');el.textContent=noteName(m,renderer.opts.latin,renderer.opts.middle)+` ×${count}`;el.title=m<base||m>base+config.span?'Fuera del instrumento':'Dentro del instrumento';return el;}));
 const choices=Array.from({length:97},(_,i)=>{const s=i-48;return {shift:s,out:rangeCount(part,base,s,pitchSource,config.span)};}).sort((a,b)=>a.out-b.out||Math.abs(a.shift-shift)-Math.abs(b.shift-shift));
 $('suggestions').replaceChildren(...choices.map(c=>option(c.shift,`${c.shift>=0?'+':''}${c.shift} semitonos${c.shift%12===0?' · '+c.shift/12+' oct.':''} → ${c.out} fuera`)));
 const bounds=part.notes.reduce((b,n)=>{const m=pitchSource==='written'?(n.writtenMidi??n.midi):n.midi;return [Math.min(b[0],m),Math.max(b[1],m)];},[Infinity,-Infinity]);const span=part.notes.length?bounds[1]-bounds[0]:0;$('rangeHint').textContent=span>config.span?`La amplitud supera las ${config.keys} alturas del instrumento. Ninguna transposición puede hacer caber toda la parte. Selecciona otra pista o adapta la partitura.`:'Las opciones indican el desplazamiento total desde el archivo original.';
 const groups=new Map();for(const n of part.notes){const k=Math.round(n.start*1e6);groups.set(k,(groups.get(k)||0)+1);}const large=[...groups.values()].filter(n=>n>2).length;$('polyphony').textContent=renderer.opts.instrument==='bateria'?'Se conservan todos los golpes simultáneos. Cada elemento tiene su propio carril.':renderer.opts.instrument==='bajo'?'Se conservan las cuerdas y los trastes del archivo. Las posiciones propuestas llevan *.':renderer.opts.instrument==='voz'?'Canta siguiendo las barras de altura y la letra resaltada. El audio guía la melodía sin pronunciar la letra.':renderer.opts.instrument==='guitarra'?'Lee de izquierda a derecha siguiendo el cursor por compases, o elige notas en movimiento. Número = traste; 0 = al aire.':renderer.opts.instrument==='piano'?'Se conservan todos los acordes y sus duraciones, sin reducir voces.':$('mode').value==='two'&&large?`${large} acordes de más de 2 notas: se tocarán solo la nota más grave y la más aguda.`:'La fuente se conserva; esta selección solo adapta la reproducción.';
 const transposes=[...new Set(part.notes.filter(n=>n.writtenMidi!==undefined).map(n=>n.midi-n.writtenMidi))];$('pitchInfo').textContent=renderer.opts.instrument==='bajo'?'Los números respetan la tablatura y el sonido usa la altura real del bajo, incluida su transposición de octava.':transposes.some(n=>n!==0)?`El archivo declara transposición sonora de ${transposes.join(', ')} semitonos. Para las láminas escolares usa notas escritas; el sonido respeta esa transposición en «Como la partitura», igual que Compás.`:'Esta parte no declara diferencias entre altura escrita y sonora.';
 const first=notes[0];$('firstEntry').textContent=first?`Primera nota visible: compás ${first.measure}, pulso ${Number(first.beat.toFixed(2))}.`:'No hay ataques dentro del rango. Revisa altura escrita/sonora y transposición.';$('firstNote').disabled=!first;
 const vocal=renderer.opts.instrument==='voz';$('lyricStatus').hidden=!vocal;
 if(vocal){const count=part.lyrics?.length??0,other=score.parts.find(p=>p.id!==part.id&&/voz|vocal|voice|coro|choir/i.test(p.name)&&p.lyrics?.length);$('lyricStatus').textContent=count?`${count} sílabas detectadas en «${part.name}» · ${renderer.opts.vocalPhrases.length} frases.`:other?`«${part.name}» no tiene letra. Elige «${other.name}», que contiene ${other.lyrics.length} sílabas.`:`«${part.name}» no contiene letra exportada en ${scoreFileName}. Si la ves en MuseScore, guarda y vuelve a exportar esa versión como MXL.`;}
 syncPlay();}

function renderDrumMapping(){
 $('drumMap').replaceChildren();if(renderer.opts.instrument!=='bateria'||!part.percussion)return;
 const mapping=drumMappings[part.id]??{},groups=new Map();for(const n of part.notes)if(!groups.has(n.midi))groups.set(n.midi,n);
 $('drumMapInfo').textContent=`${part.clefs?.[0]?.sign==='percussion'?'Clave de percusión':'Percusión MIDI'} · ${groups.size} elementos utilizados · ${part.notes.length} golpes.`;
 for(const [midi,note]of [...groups].sort((a,b)=>a[0]-b[0])){
  const row=document.createElement('div');row.className='drum-map-row';const label=document.createElement('label'),source=document.createElement('span');
  source.textContent=`${note.displayStep??''}${note.displayOctave??''} ${note.notehead==='circle-x'?'⊗':note.notehead==='x'?'×':'●'} · ${note.drumName??drumInfo(midi).name} · MIDI ${midi}`;
  const select=document.createElement('select');select.setAttribute('aria-label','Elemento de batería para '+source.textContent);
  const choices=DRUMS.map(d=>option(d.midi,d.name));if(!choices.some(o=>Number(o.value)===midi))choices.unshift(option(midi,drumInfo(midi).name+' (original)'));select.replaceChildren(...choices);select.value=String(mappedDrumMidi(note,mapping));
  select.onchange=()=>{(drumMappings[part.id]??={})[midi]=Number(select.value);rebuild();};label.append(source,select);
  const test=document.createElement('button');test.type='button';test.className='secondary small';test.textContent='▶ Probar';test.setAttribute('aria-label','Escuchar '+source.textContent);
  test.onclick=async()=>{if(exporter.active)return;try{await audio.init();const sound=Number(select.value);audio.note({...drumNotes([note],drumMappings[part.id],drumMix[part.id])[0],midi:sound,soundMidi:sound,velocity:.85},audio.ctx.currentTime,.2);}catch(e){notify(e.message);}};
  const channel=drumMix[part.id]?.[midi]??{volume:1,muted:false},volumeLabel=document.createElement('label');volumeLabel.className='volume-label drum-volume';
  const caption=document.createElement('span');caption.textContent='Volumen';const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='200';slider.step='5';slider.value=String(Math.round(channel.volume*100));slider.setAttribute('aria-label','Volumen de '+source.textContent);
  const output=document.createElement('output');output.textContent=slider.value+'%';
  const muteLabel=document.createElement('label');muteLabel.className='toggle';const mute=document.createElement('input');mute.type='checkbox';mute.checked=channel.muted;muteLabel.append(mute,document.createTextNode('Silenciar'));
  const update=()=>{(drumMix[part.id]??={})[midi]={volume:Number(slider.value)/100,muted:mute.checked};output.textContent=slider.value+'%';rebuild();};slider.oninput=update;mute.onchange=update;
  volumeLabel.append(caption,slider,output);row.append(label,test,volumeLabel,muteLabel);$('drumMap').append(row);
 }
}

function lockForStems(){const locked=accompaniment.hasStems();if(locked){scheduler.speed=1;$('speed').value='100';$('speedValue').textContent='100%';scheduler.manualBpm=false;$('manualBpm').checked=false;}
 for(const id of ['speed','resetSpeed','bpm','manualBpm'])$(id).disabled=locked||exporter.active;
 $('stemHint').textContent=locked?'Audio externo activo: velocidad fijada a 100% y tempo original para mantener sincronía y afinación. Cada pista debe incluir los silencios desde el inicio del compás 1, sin cuenta previa ni repeticiones adicionales.':'Los timbres de Compás permiten cambiar velocidad sin cambiar tono. Para usar una grabación propia de MuseScore, carga WAV o MP3 por instrumento, o una mezcla de acompañamiento en una fila silenciando las demás.';
}
function renderMixer(){lockForStems();accompaniment.update();$('mixerTracks').replaceChildren();const names=new Map();for(const t of accompaniment.tracks.values())names.set(t.name,(names.get(t.name)||0)+1);const seen=new Map();
 for(const t of accompaniment.tracks.values()){const row=document.createElement('div');row.className='mixer-track';const selected=t.id===part.id;const name=document.createElement('strong');seen.set(t.name,(seen.get(t.name)||0)+1);name.textContent=t.name+(names.get(t.name)>1?' '+seen.get(t.name):'')+(selected?' · tutorial':'');const source=document.createElement('small');source.textContent=selected?'Volumen independiente del tutorial':t.buffer?t.fileName:'Muestras de Compás · '+t.label;const heading=document.createElement('div');heading.className='track-name';heading.append(name,source);row.append(heading);
 const mute=document.createElement('button');mute.className='quiet small';mute.textContent=t.muted?'Silenciada':'Silenciar';mute.setAttribute('aria-pressed',String(t.muted));mute.setAttribute('aria-label','Silenciar '+t.name);mute.disabled=selected;mute.onclick=()=>{t.muted=!t.muted;accompaniment.update();scheduler.refresh();renderMixer();};
 const solo=document.createElement('button');solo.className='quiet small';solo.textContent='Solo';solo.setAttribute('aria-pressed',String(t.solo));solo.setAttribute('aria-label','Escuchar solo '+t.name+' y tutorial');solo.disabled=selected;solo.onclick=()=>{t.solo=!t.solo;accompaniment.update();scheduler.refresh();renderMixer();};
 const volume=document.createElement('input');volume.type='range';volume.min=0;volume.max=selected?200:100;volume.value=Math.round((selected?audio.melodyVolume:t.volume)*100);volume.setAttribute('aria-label','Volumen '+t.name);if(selected)volume.dataset.metalVolume='';volume.oninput=()=>{if(selected)setMetalVolume(Number(volume.value));else{t.volume=Number(volume.value)/100;accompaniment.update();}};
 const file=document.createElement('input');file.type='file';file.accept='.wav,.mp3,.ogg,.m4a,audio/*';file.hidden=true;const load=document.createElement('button');load.className='quiet small';load.textContent=t.buffer?'Cambiar audio':'Cargar audio';load.disabled=selected;load.onclick=()=>file.click();file.onchange=async()=>{const f=file.files[0];if(!f)return;scheduler.pause();syncPlay();try{load.disabled=true;load.textContent='Leyendo…';await accompaniment.setFile(t.id,f);notify('Audio cargado localmente. Comprueba la alineación con el compás 1.');}catch(e){notify('No se pudo cargar audio: '+e.message);}renderMixer();};row.append(mute,solo,volume,load,file);
 if(t.buffer){const remove=document.createElement('button');remove.className='quiet small';remove.textContent='×';remove.setAttribute('aria-label','Quitar audio de '+t.name);remove.onclick=()=>{scheduler.pause();t.buffer=null;t.fileName='';renderMixer();syncPlay();};row.append(remove);}
 $('mixerTracks').append(row);
 }
}
$('focusPart').onchange=syncPartFocus;
$('backingOn').onchange=()=>{accompaniment.enabled=$('backingOn').checked;accompaniment.update();scheduler.refresh();};

function renderSections(){renderProgress();$('restoreMarks').disabled=!score.structureMarks?.length;$('sectionList').replaceChildren();if(!structure.sections.length){const p=document.createElement('p');p.className='hint';p.textContent='Aún no hay secciones. Agrega la primera abajo.';$('sectionList').append(p);}for(const s of structure.sections){const row=document.createElement('div');row.className='section-item';row.style.setProperty('--section',sectionFillColor(s,renderer.opts));const go=document.createElement('button');go.type='button';go.className='section-go';const title=document.createElement('span');title.textContent=s.name;const info=document.createElement('small');info.textContent=`Compases ${s.startMeasure}–${s.endMeasure}${s.spelling==='sharps'?' · ♯':s.spelling==='flats'?' · ♭':s.spelling==='auto'?' · armadura':''}`;go.append(title,info);go.onclick=()=>{scheduler.loop=null;$('loopToggle').setAttribute('aria-pressed','false');scheduler.seek(part.measures[s.startMeasure-1].start);syncPlay();};const loop=document.createElement('button');loop.textContent='↻ Bucle';loop.setAttribute('aria-label','Repetir '+s.name);loop.onclick=()=>{$('loopStart').value=s.startMeasure;$('loopEnd').value=s.endMeasure;setLoop(true);scheduler.seek(part.measures[s.startMeasure-1].start);};const edit=document.createElement('button');edit.textContent='✎';edit.setAttribute('aria-label','Editar '+s.name);edit.onclick=()=>{$('sectionName').value=s.name;$('sectionStart').value=s.startMeasure;$('sectionEnd').value=s.endMeasure;$('sectionColor').value=sectionFillColor(s,renderer.opts);$('sectionSpelling').value=s.spelling??'inherit';$('sectionForm').dataset.editId=s.id;$('sectionName').focus();};const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label','Eliminar '+s.name);del.onclick=()=>{structure.remove(s.id);renderSections();};row.append(go,loop,edit,del);$('sectionList').append(row);}}
function renderProgress(){
 progressResizeObserver?.disconnect();progressSegments=structureSegments(part,structure.sections).map(s=>({...s,color:sectionFillColor(s,renderer.opts)}));progressButtons=[];lastProgressId=null;
 const track=$('sectionProgressTrack');track.style.setProperty('--track-min-width',`${progressSegments.length*170}px`);track.replaceChildren($('sectionCursor'));
 for(const segment of progressSegments){const button=document.createElement('button');button.type='button';button.className='section-progress-block';button.style.setProperty('--block-color',segment.color);button.style.setProperty('--block-ink',contrastColor(segment.color));button.style.flexGrow=String(segment.end-segment.start);button.setAttribute('aria-label',`${segment.name}, compases ${segment.startMeasure} a ${segment.endMeasure}. Saltar al inicio`);const title=document.createElement('strong');title.textContent=segment.name;const range=document.createElement('span');range.dataset.start=segment.startMeasure;range.dataset.end=segment.endMeasure;range.textContent=measureRangeLabel(segment.startMeasure,segment.endMeasure);button.append(title,range);button.onclick=()=>{if(exporter.active)return;scheduler.loop=null;$('loopToggle').setAttribute('aria-pressed','false');scheduler.seek(segment.start);syncPlay();updateProgress(scheduler.current());};track.append(button);progressButtons.push(button);progressResizeObserver?.observe(button);fitProgressLabel(button);}
 updateProgress(scheduler.current());
}
function updateProgress(beat){
 const current=segmentAt(progressSegments,beat);if(!current)return;const active=progressSegments.indexOf(current),button=progressButtons[active];
 progressButtons.forEach((b,i)=>{b.classList.toggle('is-current',i===active&&beat>=0);b.classList.toggle('is-past',beat>=progressSegments[i].end);b.style.setProperty('--section-fill',`${segmentProgress(progressSegments[i],beat)*100}%`);if(i===active&&beat>=0)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.disabled=exporter.active;});
 $('progressSection').textContent=beat<0?'Cuenta previa':`${current.name} · ${measureRangeLabel(current.startMeasure,current.endMeasure)}`;
 const x=button.offsetLeft+segmentProgress(current,beat)*button.offsetWidth;$('sectionCursor').style.transform=`translateX(${x}px)`;
 if(lastProgressId!==current.start){lastProgressId=current.start;if(scheduler.playing){const viewport=$('sectionProgressViewport');viewport.scrollTo({left:Math.max(0,button.offsetLeft-(viewport.clientWidth-button.offsetWidth)/2),behavior:'auto'});}}
}
$('restoreMarks').onclick=()=>{try{structure.replace({version:1,sections:sectionsFromMarks(score.structureMarks,part.measures.length)});renderSections();notify('Secciones recuperadas desde las marcas de la partitura.');}catch(e){notify(e.message);}};
function setLoop(enabled){if(!enabled){scheduler.loop=null;$('loopToggle').setAttribute('aria-pressed','false');scheduler.refresh();return;}const a=number('loopStart',1,part.measures.length),b=number('loopEnd',1,part.measures.length);if(b<a){notify('El fin del bucle debe ser posterior o igual al inicio.');return;}const start=part.measures[a-1].start,end=part.measures[b-1].start+part.measures[b-1].duration;scheduler.loop={start,end};$('loopToggle').setAttribute('aria-pressed','true');if(scheduler.current()<start||scheduler.current()>=end)scheduler.seek(start);else scheduler.refresh();}
function syncPlay(){$('play').textContent=chimera.preparing?'■':scheduler.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',chimera.preparing?'Cancelar preparación de Chimera':scheduler.playing?'Pausar':'Reproducir');}
async function togglePlay(){if(chimera.preparing){scheduler.pause();chimera.cancelPreparation();return;}if(scheduler.playing)scheduler.pause();else {if(scheduler.position>=scheduler.end)scheduler.position=scheduler.loop?.start||0;try{await scheduler.play(scheduler.position===0);}catch(e){notify('No se pudo iniciar el audio: '+e.message);}}syncPlay();}
$('play').onclick=togglePlay;$('restart').onclick=()=>{scheduler.seek(scheduler.loop?.start||0);syncPlay();};
$('seek').oninput=()=>{scheduler.seek(Number($('seek').value));syncPlay();};
$('jumpGo').onclick=()=>{const n=number('jump',1,part.measures.length);scheduler.seek(part.measures[n-1].start);syncPlay();};
$('loopToggle').onclick=()=>setLoop(!scheduler.loop);for(const id of ['loopStart','loopEnd'])$(id).onchange=()=>{if(scheduler.loop)setLoop(true);};
$('part').onchange=selectPart;$('firstNote').onclick=()=>{if(notes[0]){scheduler.seek(part.measures[notes[0].measure-1].start);syncPlay();}};for(const id of ['base','octave','semitones','mode','pitchSource'])$(id).onchange=()=>{scheduler.position=scheduler.current();rebuild();};
$('applyShift').onclick=()=>{$('octave').value='0';$('semitones').value=$('suggestions').value;scheduler.position=scheduler.current();rebuild();};
$('names').onchange=()=>{renderer.opts.latin=$('names').value==='latin';rebuild();};$('middle').onchange=()=>{renderer.opts.middle=Number($('middle').value);rebuild();};
$('tutorialPitch').onchange=()=>{audio.tutorialPitch=$('tutorialPitch').value;scheduler.refresh();};
$('keyboardSound').onchange=()=>{const sound=keyboardSound(part,$('keyboardSound').value);keyboardSounds[part.id]=sound;audio.keyboardSound=sound;const track=accompaniment.tracks.get(part.id);if(track){track.sound=sound;track.label=KEYBOARD_SOUNDS[sound];}scheduler.refresh();};
$('metalTone').onchange=()=>{audio.metalTone=$('metalTone').value;scheduler.refresh();};
$('scheme').onchange=()=>renderer.opts.scheme=$('scheme').value;
function persistMusicalStyle(){try{localStorage.setItem('adaptaciones.appearance.v1',JSON.stringify(renderer.opts.appearance));}catch{}}
function syncMusicalStyle(){const colors=musicalPalette(renderer.opts).notes;[...$('palette').children].forEach((input,i)=>input.value=colors[i]);if(score&&part)renderSections();}
for(let i=0;i<12;i++){const input=document.createElement('input');input.type='color';input.value=PALETTE[i];input.setAttribute('aria-label','Color '+noteName(60+i));input.oninput=()=>{
 const indices=[1,3,6,8,10].includes(i)?[1,3,6,8,10]:[i],theme=visualTheme(renderer.opts);
 if(theme.id==='aula'){for(const index of indices)renderer.opts.custom[index]=input.value;try{localStorage.setItem('metalofono.palette.v2',JSON.stringify(renderer.opts.custom));}catch{}}
 else{const appearance=renderer.opts.appearance,colors=[...musicalPalette(renderer.opts).notes];for(const index of indices)colors[index]=input.value;(appearance.noteColors??={})[theme.id]=colors;persistMusicalStyle();}
 syncMusicalStyle();};$('palette').append(input);}
$('sectionColor').oninput=()=>{const theme=visualTheme(renderer.opts),name=$('sectionName').value.trim().toLowerCase();if(theme.id==='aula'||!name)return;((renderer.opts.appearance.sectionColors??={})[theme.id]??={})[name]=$('sectionColor').value;persistMusicalStyle();renderSections();};

try{const palette=JSON.parse(localStorage.getItem('metalofono.palette.v2'));if(Array.isArray(palette)&&palette.length===12&&palette.every(c=>/^#[a-f\d]{6}$/i.test(c))){renderer.opts.custom=palette;[...$('palette').children].forEach((el,i)=>el.value=palette[i]);}}catch{}
$('anticipation').onchange=()=>renderer.opts.anticipation=number('anticipation',$('anticipationUnit').value==='ms'?20:.05,$('anticipationUnit').value==='ms'?10000:8);
$('anticipationUnit').onchange=()=>{const ms=$('anticipationUnit').value==='ms';renderer.opts.anticipationUnit=ms?'ms':'beats';Object.assign($('anticipation'),{min:ms?20:.05,max:ms?10000:8,step:ms?20:.05,value:ms?600:1});renderer.opts.anticipation=Number($('anticipation').value);};
function saveNotationPreferences(){try{localStorage.setItem('adaptaciones.notation.v1',JSON.stringify({showPianoScore:renderer.opts.showPianoScore,noteSpelling:renderer.opts.noteSpelling}));}catch{}}
try{const pref=JSON.parse(localStorage.getItem('adaptaciones.notation.v1')||'{}');renderer.opts.showPianoScore=pref.showPianoScore===true;if(['auto','sharps','flats'].includes(pref.noteSpelling))renderer.opts.noteSpelling=pref.noteSpelling;}catch{}
$('showPianoScore').checked=renderer.opts.showPianoScore;$('noteSpelling').value=renderer.opts.noteSpelling;
$('showPianoScore').onchange=()=>{renderer.opts.showPianoScore=$('showPianoScore').checked;saveNotationPreferences();};
$('noteSpelling').onchange=()=>{renderer.opts.noteSpelling=$('noteSpelling').value;saveNotationPreferences();if(part)rebuild();};
$('showVocalNoteNames').onchange=()=>renderer.opts.showVocalNoteNames=$('showVocalNoteNames').checked;
$('cascade').onchange=()=>{renderer.opts.cascade=$('cascade').checked;instrumentPrefs[renderer.opts.instrument].cascade=renderer.opts.cascade;$('showCascadeNoteNames').disabled=!renderer.opts.cascade;};$('showCascadeNoteNames').onchange=()=>renderer.opts.showCascadeNoteNames=$('showCascadeNoteNames').checked;$('showStructure').onchange=()=>renderer.opts.showStructure=$('showStructure').checked;
async function changeSpeed(percent){if(exporter.active||accompaniment.hasStems())return;try{const pending=scheduler.setSpeed(percent/100);$('speed').value=String(Math.round(scheduler.speed*100));$('speedValue').textContent=$('speed').value+'%';await pending;syncPlay();}catch(e){notify('No se pudo cambiar la velocidad: '+e.message);}}
$('speed').oninput=()=>changeSpeed(Number($('speed').value));$('resetSpeed').onclick=()=>changeSpeed(100);
for(const [id,prop,min,max]of [['bpm','bpm',20,300],['numerator','numerator',1,16],['denominator','denominator',2,16],['countIn','countIn',0,4]])$(id).onchange=()=>{const was=scheduler.playing;scheduler.pause();scheduler[prop]=number(id,min,max);if(id==='countIn')$('quickCountIn').value=$('countIn').value;if(id==='bpm'){$('manualBpm').checked=true;scheduler.manualBpm=true;}if(id==='numerator'||id==='denominator'){$('manualMeter').checked=true;scheduler.manualMeter=true;}if(was)scheduler.play(false);syncPlay();};
for(const [id,prop]of [['manualBpm','manualBpm'],['manualMeter','manualMeter']])$(id).onchange=()=>{const was=scheduler.playing;scheduler.pause();scheduler[prop]=$(id).checked;if(was)scheduler.play(false);syncPlay();};
function setMetronome(enabled){$('metroOn').checked=enabled;audio.metroOn=enabled;$('metroQuick').setAttribute('aria-pressed',String(enabled));$('metroQuick').title=enabled?'Metrónomo activado':'Metrónomo desactivado';scheduler.refresh();}
function setPulseStyle(value){renderer.opts.pulseStyle=value;$('pulseStyle').value=value;$('quickPulseStyle').value=value;}
$('pulseStyle').onchange=()=>setPulseStyle($('pulseStyle').value);$('quickPulseStyle').onchange=()=>setPulseStyle($('quickPulseStyle').value);
$('quickCountIn').onchange=()=>{$('countIn').value=$('quickCountIn').value;$('countIn').onchange();};
$('metroQuick').onclick=()=>setMetronome(!$('metroOn').checked);$('metroOn').onchange=()=>setMetronome($('metroOn').checked);$('metroVolume').oninput=()=>audio.metroVolume=Number($('metroVolume').value)/100;function setMetalVolume(percent){audio.setMelodyVolume(percent/100);for(const input of document.querySelectorAll('[data-metal-volume]'))input.value=String(Math.round(audio.melodyVolume*100));for(const output of document.querySelectorAll('[data-metal-volume-label]'))output.textContent=Math.round(audio.melodyVolume*100)+'%';}$('melodyVolume').oninput=()=>setMetalVolume(Number($('melodyVolume').value));$('metalVolume').oninput=()=>setMetalVolume(Number($('metalVolume').value));$('mute').onchange=()=>{audio.muted=$('mute').checked;audio.setMelodyVolume(audio.melodyVolume);scheduler.refresh();};
$('sectionForm').onsubmit=e=>{e.preventDefault();try{const id=e.currentTarget.dataset.editId||'s'+Date.now();const s={id,spelling:$('sectionSpelling').value,name:$('sectionName').value.trim(),startMeasure:Number($('sectionStart').value),endMeasure:Number($('sectionEnd').value),color:visualTheme(renderer.opts).id==='aula'?$('sectionColor').value:structure.sections.find(s=>s.id===id)?.color??sectionColor($('sectionName').value)};structure.replace({version:1,sections:[...structure.sections.filter(s=>s.id!==id),s]});delete e.currentTarget.dataset.editId;$('sectionName').value='';$('sectionSpelling').value='inherit';const next=Math.min(part.measures.length,s.endMeasure+1);$('sectionStart').value=next;$('sectionEnd').value=next;renderSections();}catch(err){notify(err.message);}};
$('saveStructure').onclick=()=>download(new Blob([JSON.stringify(structure.json(),null,2)],{type:'application/json'}),'estructura.json');$('loadStructure').onclick=()=>$('structureFile').click();$('structureFile').onchange=async()=>{const f=$('structureFile').files[0];if(!f)return;try{if(f.size>1000000)throw Error('JSON demasiado grande.');structure.replace(JSON.parse(await f.text()));renderSections();notify('Estructura cargada y guardada.');}catch(e){notify('No se pudo cargar la estructura: '+e.message);}$('structureFile').value='';};
async function loadFile(file){if(!file||exporter.active)return;const token=++importToken;try{notify('Leyendo '+file.name+'…');const s=await parseFile(file),bytes=new Uint8Array(await file.arrayBuffer());let key;if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',bytes);key=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');}else{let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);key=(h>>>0).toString(16)+'-'+bytes.length;}if(token!==importToken)return;installScore(s,key,false,file.name);openSettings('source');if(!s.warnings.length)notify('Partitura lista. Revisa la pista y el rango antes de reproducir.');}catch(e){if(token===importToken)notify('No se pudo abrir el archivo: '+e.message);}}
function openSettings(tab='source'){if($('styleLab').open)$('styleLab').close();
 const keys=['source','instrument','chimera','audio','practice','video'];
 for(const key of keys){const selected=key===tab;$('tab-'+key).setAttribute('aria-selected',String(selected));$('tab-'+key).tabIndex=selected?0:-1;$('settings-'+key).hidden=!selected;}
 if(!$('settingsDialog').open)$('settingsDialog').showModal();
 requestAnimationFrame(()=>progressButtons.forEach(fitProgressLabel));
}
$('openSettings').onclick=()=>openSettings(document.querySelector('.settings-tabs [aria-selected="true"]')?.id.replace('tab-','')||'source');
for(const key of ['source','instrument','chimera','audio','practice','video'])$('tab-'+key).onclick=()=>openSettings(key);
document.querySelector('.settings-tabs').addEventListener('keydown',e=>{
 const tabs=[...document.querySelectorAll('.settings-tabs [role="tab"]')],index=tabs.indexOf(document.activeElement);if(index<0)return;
 let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;
 e.preventDefault();tabs[next].click();tabs[next].focus();
});
$('uploadScore').onclick=()=>$('file').click();
$('settingsDialog').addEventListener('click',e=>{if(e.target!==$('settingsDialog'))return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();});
$('file').onchange=()=>{loadFile($('file').files[0]);$('file').value='';};$('example').onclick=()=>{importToken++;installScore(example(),'example-v1',true);};
for(const target of [$('dropzone'),document.querySelector('.canvas-wrap')]){
 for(const event of ['dragover','dragenter'])target.addEventListener(event,e=>{e.preventDefault();target.classList.add('drag');});
 target.addEventListener('dragleave',()=>target.classList.remove('drag'));
 target.addEventListener('drop',e=>{e.preventDefault();target.classList.remove('drag');loadFile(e.dataTransfer.files[0]);});
}
$('stage').onclick=async e=>{if(exporter.active)return;const r=$('stage').getBoundingClientRect(),x=(e.clientX-r.left)/r.width*(renderer.opts.instrument==='voz'&&!renderer.opts.vocalPortrait?900*$('stage').width/$('stage').height:1600),y=(e.clientY-r.top)/r.height*900;if(renderer.opts.showStructure&&y>=757&&y<=840){const segment=renderer.timelineHit(x,y);if(segment){scheduler.loop=null;$('loopToggle').setAttribute('aria-pressed','false');scheduler.seek(segment.start);}return;}const key=renderer.hitKey(x,y);if(key){try{await audio.init();audio.note({midi:key.midi,soundMidi:key.midi+($('pitchSource').value==='written'?(part.notes[0]?.midi-(part.notes[0]?.writtenMidi??part.notes[0]?.midi)||0):0),velocity:.8},audio.ctx.currentTime);}catch(e){notify(e.message);}}};
function setClean(on){document.body.classList.toggle('clean',on);$('exitClean').hidden=!on;$('fullscreen').setAttribute('aria-pressed',String(on));$('fullscreen').setAttribute('aria-label',on?'Salir de pantalla completa':'Entrar en pantalla completa');$('fullscreen').title=on?'Salir de pantalla completa':'Pantalla completa';}
async function clean(on){
 if(on){if($('styleLab').open)$('styleLab').close();if($('settingsDialog').open)$('settingsDialog').close();setClean(true);const player=document.querySelector('.stage-card');if(player.requestFullscreen&&!document.fullscreenElement)try{await player.requestFullscreen();}catch{notify('Se activó pantalla limpia. El navegador no permitió pantalla completa.');}}
 else{setClean(false);if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}}
}
$('clean').onclick=()=>clean(true);$('fullscreen').onclick=()=>clean(!document.body.classList.contains('clean'));$('exitClean').onclick=()=>clean(false);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)setClean(false);});
$('help').onclick=()=>{$('settingsDialog').close();$('helpDialog').showModal();};for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
const shortcuts=playerShortcutHandlers({
 isDialogOpen:e=>!!document.querySelector('dialog[open]:not(#styleLab)')||!!e.target?.closest?.('#styleLab'),isRecording:()=>exporter.active,onToggle:togglePlay,onEscape:()=>{if($('styleLab').open)$('styleLab').close();else clean(false);},
 onMeasure:direction=>{if(!part)return;scheduler.seek(pulseSeekTarget(part,scheduler.current(),direction,scheduler.manualMeter?{denominator:scheduler.denominator}:null));syncPlay();}
});
window.addEventListener('keydown',shortcuts.keydown,true);window.addEventListener('keyup',shortcuts.keyup,true);window.addEventListener('blur',shortcuts.blur);
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))$('stage').focus({preventScroll:true});});
function openRecording(scope='part',method='browser'){
 if(exporter.active)return;if($('styleLab').open)$('styleLab').close();if(method==='browser'&&!exporter.formats().length){notify('Este navegador no permite grabar. Puedes usar la exportación local.');return;}
 $('recordMethod').value=method;$('recordCount').value=$('countIn').value;$('recordScope').value=scope;updateRecordInfo();$('settingsDialog').close();$('recordDialog').showModal();
}
$('processAll').onclick=()=>openRecording('all');$('record').onclick=()=>openRecording('part');$('recordAll').onclick=()=>openRecording('all');$('exportLocal').onclick=()=>openRecording('all','local');
function updateRecordInfo(){
 const local=$('recordMethod').value==='local',types=local?['mp4']:['webm','mp4'].filter(t=>exporter.formats().some(m=>m.startsWith('video/'+t))),previous=$('format').value;
 $('format').replaceChildren(...types.map(t=>option(t,t.toUpperCase())));if(types.includes(previous))$('format').value=previous;$('format').disabled=local;
 $('recordMonitorField').hidden=local;$('recordRealtimeHint').hidden=local;$('localExportHelp').hidden=!local;$('recordSubmit').textContent=local?'↓ Guardar trabajo local':'● Comenzar grabación';
 $('recordInfo').textContent=local?'Guarda el trabajo y ejecútalo desde la terminal. Se generan cuadros completos a 30 fps, una parte a la vez, con audio y MP4. Puedes cerrar esta página.':$('recordScope').value==='all'?`Se grabarán ${score.parts.length} videos separados, uno después de otro (nunca al mismo tiempo), y se reunirán en un ZIP. Cada parte reproduce la obra completa con la mezcla actual. Mantén la pestaña visible.`:'Se grabará la parte que muestra el player, con la mezcla de audio actual. Mantén la pestaña visible.';
}
$('recordScope').onchange=updateRecordInfo;$('recordMethod').onchange=updateRecordInfo;
function tutorialData(all){
 const prefs={...instrumentPrefs,[renderer.opts.instrument]:{...instrumentPrefs[renderer.opts.instrument],cascade:renderer.opts.cascade,base:Number($('base').value),octave:$('octave').value,semitones:Number($('semitones').value),mode:$('mode').value}},indices=all?score.parts.map((p,i)=>i):[score.parts.indexOf(part)];
 return indices.map(index=>{
  const p=score.parts[index],tutorial=all?prepareTutorial(score.parts.map(vocalDisplayPart),index,{prefs,opts:renderer.opts,pitchSource:$('pitchSource').value,drumMappings,drumMix}):{part:renderer.opts.instrument==='guitarra'?{...part,harmonies:renderer.opts.guitarHarmonies}:part,notes,opts:{...renderer.opts},name:partDisplayName(score.parts,index)};
  const sections=new Structure(notify);sections.load(scoreKey+'.'+p.id,p.measures.length,scoreKey==='example-v1'?structure.sections:sectionsFromMarks(score.structureMarks,p.measures.length));
  return {...tutorial,opts:{...tutorial.opts,title:$('videoTitle').value||score.title,teacher:tutorial.name+($('teacher').value?' · '+$('teacher').value:'')},sections:sections.sections,instruction:partInstruction(p)};
 });
}
function saveLocalJob(all){
 if(chimera.enabled)throw Error('La exportación local de Chimera aún no está disponible. Graba desde la página para conservar sus voces y su visualización.');
 if(accompaniment.hasStems())throw Error('La exportación local usa los sonidos de la partitura. Quita las pistas de audio externas o graba desde la página para conservarlas.');
 const tutorials=tutorialData(all),end=Math.max(...score.parts.map(p=>p.measures.at(-1).start+p.measures.at(-1).duration));
 for(const t of tutorials)t.opts.showStructure=$('recordStructure').checked;
 const job=createExportJob({title:$('videoTitle').value||score.title,height:Number($('resolution').value),fps:30,tutorials,customFont:renderer.opts.appearance?.font==='custom'?getCustomFontAsset():null,
  clock:{part:{measures:part.measures,tempos:part.tempos,meters:part.meters},end,speed:scheduler.speed,manualBpm:scheduler.manualBpm,bpm:scheduler.bpm,manualMeter:scheduler.manualMeter,numerator:scheduler.numerator,denominator:scheduler.denominator,countIn:Number($('recordCount').value)},
  audio:{tutorial:{part:{id:part.id,name:part.name,program:part.program,percussion:part.percussion},instrument:renderer.opts.instrument,notes,volume:audio.melodyVolume,muted:audio.muted,pitch:audio.tutorialPitch,metalTone:audio.metalTone,keyboardSound:audio.keyboardSound},backingEvents:backingEvents(score.parts,part.id,{drumMappings,drumMix}),backingTracks:[...accompaniment.tracks.values()].filter(t=>accompaniment.audible(t)).map(t=>({id:t.id,name:t.name,program:t.program,drum:t.drum,sound:t.sound,volume:accompaniment.effectiveVolume(t)})),metroOn:$('recordMetro').checked,metroVolume:audio.metroVolume}});
 download(new Blob([JSON.stringify(job)],{type:'application/json'}),job.title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,65)+' - trabajo-local.json');$('recordDialog').close();notify('Trabajo guardado. En la terminal: npm run render -- "ruta/al/trabajo-local.json"');
}
function restoreRecording(result={}){
 cancelRecordIntro();if(!recordBackup)return;renderer.opts.showStructure=recordBackup.showStructure;scheduler.countIn=recordBackup.countIn;scheduler.loop=recordBackup.loop;scheduler.end=recordBackup.end;scheduler.position=Math.min(scheduler.position,scheduler.end);audio.setMonitoring(recordBackup.monitoring);audio.recordMetro=true;audio.metroOn=$('metroOn').checked;recordBackup=null;
 syncQuickPart();$('record').hidden=false;$('recordAll').hidden=false;$('stopRecord').hidden=true;for(const el of document.querySelectorAll('[data-record-lock]')){el.disabled=false;el.removeAttribute('data-record-lock');}$('mode').disabled=renderer.opts.instrument!=='metalofono';$('showCascadeNoteNames').disabled=!renderer.opts.cascade;loadInstructionSettings();lockForStems();
 const message=result.failed?(result.error?'No se pudo completar la exportación: '+result.error:'Se descargó una grabación parcial; hubo un error al grabar.'):result.batch?`ZIP descargado con ${result.count} videos${result.cancelled?' (lote detenido)':''}.`:'Video descargado.';notify(message+(result.frameWarnings?' Se detectaron pausas de dibujo; para un framerate fijo usa exportación local.':''));syncPlay();
}
function lockRecordingControls(){
 $('recordDialog').close();$('record').hidden=true;$('recordAll').hidden=true;$('stopRecord').hidden=false;
 for(const el of document.querySelectorAll('#styleLab input,#styleLab select,#styleLab button,#openStyleLab,#settingsDialog input,#settingsDialog select,#settingsDialog textarea,#settingsDialog .panel button,#uploadScore,#processAll,#metroQuick,#vocalVisualization,#vocalOrientation,#choralLayout,#quickPart,.transport input,.transport select,#part,#play,#seek,#speed,#loopToggle,#resetSpeed,#restart,#example'))if(!el.disabled){el.disabled=true;el.dataset.recordLock='1';}
}
$('recordForm').onsubmit=async e=>{
 e.preventDefault();const all=$('recordScope').value==='all';if($('recordMethod').value==='local'){try{saveLocalJob(all);}catch(error){notify(error.message);}return;}
 try{
  scheduler.pause();recordBackup={showStructure:renderer.opts.showStructure,countIn:scheduler.countIn,loop:scheduler.loop,end:scheduler.end,monitoring:audio.monitoring};scheduler.loop=null;scheduler.position=0;scheduler.countIn=Number($('recordCount').value);audio.recordMetro=$('recordMetro').checked;audio.metroOn=true;renderer.opts.showStructure=$('recordStructure').checked;renderer.opts.title=$('videoTitle').value||score.title;renderer.opts.teacher=$('teacher').value;
  await audio.init();audio.setMonitoring($('recordMonitor').checked);const data=tutorialData(all);lockRecordingControls();
  const recordingOptions={height:Number($('resolution').value),format:$('format').value,title:renderer.opts.title,onstop:restoreRecording};
  if(all){
   const tutorials=data.map(t=>{const view=new Renderer(document.createElement('canvas'));Object.assign(view.opts,t.opts);const sections=new Structure();sections.sections=t.sections;return {...t,renderer:view,draw(beat){view.ctx.setTransform(view.canvas.width/1600,0,0,view.canvas.height/900,0,0);if(!scheduler.playing&&scheduler.position===0&&introDuration([t.instruction]))drawVideoIntro(view,{title:t.opts.title,partName:t.name,text:t.instruction.text,remaining:introDuration([t.instruction])});else view.draw(beat,t.part,t.notes,sections,scheduler);}};});
   scheduler.end=Math.max(...score.parts.map(p=>p.measures.at(-1).start+p.measures.at(-1).duration));
   await exporter.startBatch({...recordingOptions,tutorials,onstatus:notify,async onPartPrepare(t){await prepareAlphaScore(t.part,t.opts);scheduler.pause();scheduler.position=0;$('quickPart').value=String(score.parts.findIndex(p=>p.id===t.part.id));},async onPartStart(t){
    const seconds=introDuration([t.instruction]);if(seconds){const completed=await runRecordIntro(seconds,[{renderer,title:t.opts.title,partName:t.name,text:t.instruction.text},{renderer:t.renderer,title:t.opts.title,partName:t.name,text:t.instruction.text}]);if(!completed||!exporter.active||exporter.batch?.stopping)return;}
    if(!exporter.batch?.stopping)await scheduler.play(true);syncPlay();
   },onPartEnd(){scheduler.pause();}});
  }else{
   const instruction=data[0].instruction,seconds=introDuration([instruction]),introView={renderer,title:renderer.opts.title,partName:data[0].name,text:instruction.text};
   await prepareAlphaScore(part,renderer.opts);
   await exporter.start({...recordingOptions,drawInitial:()=>{if(seconds)drawVideoIntro(renderer,{...introView,remaining:seconds});}});
   if(seconds){const completed=await runRecordIntro(seconds,[introView]);if(!completed||!exporter.active)return;}await scheduler.play(true);syncPlay();notify('Grabando en tiempo real. Mantén la pestaña visible.');
  }
 }catch(error){cancelRecordIntro();scheduler.pause();if(exporter.active)exporter.stop();else restoreRecording({failed:true,error:error.message});notify('No se pudo grabar: '+error.message);}
};
$('stopRecord').onclick=()=>{cancelRecordIntro();scheduler.pause();exporter.stop();syncPlay();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&exporter.active)notify('La pestaña se ocultó: el video puede tener pausas visuales. Revisa la grabación.');});
function formatTime(sec){sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function frame(){if(recordIntro){const intro=recordIntro,remaining=intro.seconds-(performance.now()-intro.start)/1000;for(const view of intro.views)drawVideoIntro(view.renderer,{...view,remaining});if(remaining<=0){recordIntro=null;intro.resolve(true);}exporter.noteFrame();requestAnimationFrame(frame);return;}if(part){const beat=scheduler.current(),displayPart=exporter.batch?.current?.tutorial.part??part,m=measureAt(displayPart,Math.max(0,beat));renderer.ctx.setTransform($('stage').width/1600,0,0,$('stage').height/900,0,0);if(exporter.batch?.current){exporter.drawBatch(beat);renderer.ctx.save();renderer.ctx.setTransform(1,0,0,1,0,0);renderer.ctx.drawImage(exporter.batch.current.tutorial.renderer.canvas,0,0,$('stage').width,$('stage').height);renderer.ctx.restore();}else renderer.draw(beat,renderer.opts.instrument==='guitarra'?{...part,harmonies:renderer.opts.guitarHarmonies}:part,notes,structure,scheduler);exporter.noteFrame();updateProgress(beat);$('seek').value=Math.max(0,beat);if($('position').dataset.bar!==String(m.number)||$('position').dataset.total!==String(displayPart.measures.length)){$('position').replaceChildren(document.createTextNode('Compás '+wholeBars(m.number)+' '),Object.assign(document.createElement('span'),{textContent:'/ '+displayPart.measures.length}));$('position').dataset.bar=String(m.number);$('position').dataset.total=String(displayPart.measures.length);}$('timeLabel').textContent=formatTime(scheduler.seconds(0,Math.max(0,beat)))+' / '+formatTime(scheduler.seconds(0,scheduler.end));syncPlay();}requestAnimationFrame(frame);}
setupStyleLab({renderer,isRecording:()=>exporter.active,onChange:syncMusicalStyle,notify});
installScore(example(),'example-v1',true);loadPianoScoreFont().catch(()=>notify('No se pudo cargar la fuente musical local. Recarga la página.'));requestAnimationFrame(frame);
if('serviceWorker'in navigator&&location.protocol!=='file:'){let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload();}});navigator.serviceWorker.register('./sw.js').then(async reg=>{await navigator.serviceWorker.ready;if(reg.active?.state==='activated')notify('Lista para usar sin conexión en este navegador.');}).catch(()=>notify('No se pudo habilitar la caché offline. Conserva los archivos locales.'));}

setupViewport({viewport:$('canvasViewport'),canvas:$('stage'),outButton:$('zoomOut'),inButton:$('zoomIn'),fitButton:$('zoomFit'),output:$('zoomValue'),fluid:()=>renderer.opts.instrument==='voz'&&!renderer.opts.vocalPortrait&&!exporter.active});
