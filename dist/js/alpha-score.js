import {visualTheme} from './appearance.js';
import {drawStringChord} from './string-score.js';
import {TUNING} from './guitar.js';
import {bassTuning} from './bass.js';
let fontPromise;const records=new WeakMap();
async function embeddedFont(){return fontPromise??=fetch(new URL('../vendor/alphatab/Bravura.woff2',import.meta.url)).then(r=>{if(!r.ok)throw Error('No se pudo cargar Bravura.');return r.arrayBuffer();}).then(buffer=>{let binary='';for(const b of new Uint8Array(buffer))binary+=String.fromCharCode(b);return btoa(binary);});}
function imageFor(fragment,font){return new Promise((resolve,reject)=>{const svg=fragment.svg.replace(/(<svg[^>]*>)/,'$1<defs><style>.at{font-family:alphaTab;font-size:36px;font-style:normal;font-weight:normal;line-height:1}@font-face{font-family:alphaTab;src:url(data:font/woff2;base64,'+font+')}@font-face{font-family:Bravura;src:url(data:font/woff2;base64,'+font+')}</style></defs>'),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve({...fragment,image});};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('No se pudo dibujar la tablatura de alphaTab.'));};image.src=url;});}
export function alphaScoreState(part,opts){
 if(!opts.musicXml||!Number.isInteger(part.sourceTrack)||typeof Worker==='undefined')return null;
 const t=visualTheme(opts),key=[part.sourceTrack,t.ink,t.line,t.muted].join(':'),cache=records.get(opts.musicXml)??new Map(),previous=cache.get(key); // source object compartido entre pistas y exportaciones
 if(previous?.key===key)return previous;
 records.set(opts.musicXml,cache);
 const record={key,ready:false,error:null};cache.set(key,record);record.done=new Promise(resolve=>{record.resolve=resolve;});
 const worker=new Worker(new URL('./alpha-score-worker.js',import.meta.url),{type:'module'});record.worker=worker;
 worker.onerror=e=>{record.error=e.message;worker.terminate();record.worker=null;record.resolve();};
 worker.onmessage=async({data})=>{worker.terminate();record.worker=null;try{if(data.error)throw Error(data.error);const font=await embeddedFont();record.images=await Promise.all(data.images.map(fragment=>imageFor(fragment,font)));record.rows=data.rows;record.ready=true;}catch(error){record.error=error.message;}finally{record.resolve();}};
 worker.postMessage({xml:opts.musicXml.xml,track:part.sourceTrack,tuning:opts.instrument==='bajo'?bassTuning(part):TUNING,ink:t.ink,line:t.line,muted:t.muted});return record;
}
export function alphaScoreCompatible(notes,part){return notes.length===part.notes.length&&notes.every((note,i)=>(note.soundMidi??note.midi)===part.notes[i].midi&&note.start===part.notes[i].start&&note.duration===part.notes[i].duration);}
export function drawAlphaScore(c,beat,notes,part,opts){
 if(!alphaScoreCompatible(notes,part)||notes.some(n=>n.proposed))return false;
 const state=alphaScoreState(part,opts),t=visualTheme(opts);if(!state)return false;
 if(!state.ready){c.textAlign='center';c.fillStyle=t.muted;c.font='20px system-ui';c.fillText(state.error?'No se pudo preparar alphaTab: '+state.error:'Preparando toda la tablatura en segundo plano…',800,360,1400);return true;}
 const index=Math.max(0,part.measures.findLastIndex(m=>m.start<=Math.max(0,beat))),current=state.rows.find(r=>r.bars.some(b=>b.index===index))??state.rows[0];if(!current)return false;
 const selected=state.rows.slice(current.index,current.index+2),from=selected[0].bounds.y,to=selected.at(-1).bounds.y+selected.at(-1).bounds.h,height=to-from,scale=Math.min(1.12,365/Math.max(1,height)),top=200,left=65;
 c.fillStyle=t.muted;c.font='17px system-ui';c.textAlign='left';c.fillText('TABLATURA · alphaTab · Lee de izquierda a derecha',65,165);
 c.save();c.beginPath();c.rect(left,top,1470,Math.min(370,height*scale));c.clip();c.translate(left,top);c.scale(1,scale);c.translate(0,-from);
 const bar=current.bars.find(b=>b.index===index),bounds=bar?.bounds;
 if(bounds){c.fillStyle=t.soft;c.fillRect(bounds.x,current.bounds.y,bounds.w,current.bounds.h);}
 for(const fragment of state.images){if(fragment.y+fragment.height>=from&&fragment.y<=to)c.drawImage(fragment.image,fragment.x,fragment.y,fragment.width,fragment.height);}
 if(bar&&beat>=0){const measure=part.measures[index],relative=Math.max(0,beat-measure.start),events=bar.beats,at=events.findLast(v=>v.start<=relative)??events[0],next=at?events.find(v=>v.start>at.start):null,start=at?.start??0,end=next?.start??measure.duration,x0=at?.x??bounds.x,x1=next?.x??bounds.x+bounds.w,x=x0+(x1-x0)*Math.min(1,Math.max(0,(relative-start)/Math.max(.001,end-start)));c.strokeStyle=t.accent;c.lineWidth=2.5;c.beginPath();c.moveTo(x,current.bounds.y);c.lineTo(x,current.bounds.y+current.bounds.h);c.stroke();}
 c.restore();drawStringChord(c,beat,notes,part,opts,opts.instrument==='bajo'?bassTuning(part):TUNING);return true;
}

export async function prepareAlphaScore(part,opts){if(!['guitarra','bajo'].includes(opts.instrument)||opts.stringVisualization==='highway')return;const state=alphaScoreState(part,opts);if(state){await state.done;if(state.error)throw Error('No se pudo preparar la tablatura: '+state.error);}}
