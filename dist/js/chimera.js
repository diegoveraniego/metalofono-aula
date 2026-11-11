import {ChimeraCache,chimeraCacheKey,chimeraRenderTargets} from './chimera-cache.js';
import {defaultChimeraBody,CHIMERA_BODIES} from './chimera-score.js';
let modulePromise;
export async function loadChimera(){if(!modulePromise)modulePromise=(async()=>{const response=await fetch(new URL('../vendor/chimera/chimera.wasm',import.meta.url));if(!response.ok)throw Error('Falta compilar Chimera. Ejecuta npm run chimera:build en la terminal del proyecto.');if(typeof document!=='undefined'&&document.fonts)await Promise.all([document.fonts.load('300 20px Hershey'),document.fonts.load('500 20px Hershey'),document.fonts.load('400 20px Archivo','ɑ ɛ ɪ ə uː')]);const bridge=await import('../vendor/chimera/engine.js');return bridge.loadChimera();})().catch(error=>{modulePromise=null;throw error;});return modulePromise;}
export class ChimeraManager{
 constructor({cache=new ChimeraCache(),load=loadChimera,render=null,engineVersion=null}={}){this.cache=cache;this.loadRuntime=load;this.renderVoice=render;this.engineVersion=engineVersion;this.processing='all';this.records=new Map();this.profiles={};this.appearance={};this.lyricEdits={};this.enabled=false;this.generation=0;this.workers=new Set();this.error='';}
 cancelPreparation(){this.generation++;this.preparing=false;for(const worker of this.workers){worker.terminate();worker.reject?.(Error('Preparación de Chimera cancelada.'));}this.workers.clear();}
 clear(){this.cancelPreparation();for(const r of this.records.values())r.model?.dispose();this.records.clear();this.profiles={};this.appearance={};this.lyricEdits={};this.error='';}
 setProfile(part,body){
  if(!Object.hasOwn(CHIMERA_BODIES,body))throw Error('Modelo Chimera no válido.');
  this.profiles[part.id]=body;const previous=this.records.get(part.id);
  if(previous&&previous.body!==body){const model=new previous.api.VoiceModel(CHIMERA_BODIES[body],previous.sampleRate);previous.model?.dispose();this.records.set(part.id,{...previous,body,model,drawing:new previous.api.AnatomyRenderer(),snapshots:[],segments:[],buffer:null,key:null,active:false,preview:true,drawWidth:null,wordOverlay:null});}
 }
 setLyricEdits(part,edits){if(JSON.stringify(Object.entries(this.lyricEdits[part.id]??{}).sort())===JSON.stringify(Object.entries(edits).sort()))return false;this.lyricEdits[part.id]={...edits};const record=this.records.get(part.id);if(record){record.key=null;record.active=false;record.buffer=null;record.snapshots=[];record.segments=[];record.preview=true;record.wordOverlay=null;}return true;}
 profile(part){return this.profiles[part.id]??defaultChimeraBody(part);}
 async version(){if(!this.engineVersion){const response=await fetch(new URL('../vendor/chimera/version.json',import.meta.url));if(!response.ok)throw Error('No se pudo leer la versión de Chimera.');this.engineVersion=(await response.json()).commit;}return this.engineVersion;}
 async clearCache(){this.cancelPreparation();for(const record of this.records.values())record.model?.dispose();this.records.clear();await this.cache.clear();}
 async runWorker(data,onStatus){
  if(this.renderVoice)return this.renderVoice(data,onStatus);
  return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./chimera-worker.js',import.meta.url),{type:'module'});worker.reject=reject;this.workers.add(worker);const finish=()=>{this.workers.delete(worker);worker.terminate();};worker.onerror=e=>{finish();reject(Error(e.message||'Error del motor Chimera.'));};worker.onmessage=({data:message})=>{if(message.status!==undefined){onStatus(message.status);return;}if(message.progress!==undefined){onStatus(`Chimera · ${data.part.name}: ${Math.round(message.progress)} / ${Math.round(data.duration)} s`);return;}finish();if(message.error)reject(Error(message.error));else resolve(message.result);};worker.postMessage(data);});
 }
 async prepare(parts,scheduler,context,onStatus,{selectedId,overview=false,mode=this.processing}={}){
  this.cancelPreparation();const token=this.generation;this.preparing=true;const stats={rendered:0,memory:0,disk:0};for(const record of this.records.values())record.active=false;
  try{
   const api=await this.loadRuntime(),version=await this.version(),targets=chimeraRenderTargets(parts,selectedId,mode,overview);
   for(const sourcePart of parts){
    const part={...sourcePart,chimeraLyricEdits:this.lyricEdits[sourcePart.id]??{}};
    if(token!==this.generation)throw Error('Preparación cancelada.');
    const body=this.profile(part),clock={part:{tempos:scheduler.part.tempos},speed:scheduler.speed,manualBpm:scheduler.manualBpm,bpm:scheduler.bpm},duration=scheduler.seconds(0,scheduler.end)+1.25,key=await chimeraCacheKey(part,body,clock,duration,version),previous=this.records.get(part.id);
    if(previous?.key===key){previous.active=true;stats.memory++;continue;}
    let result=await this.cache.get(key);
    if(token!==this.generation)throw Error('Preparación cancelada.');
    if(result){onStatus('Recuperando voz guardada · '+part.name);stats.disk++;}
    else if(targets.has(part.id)){
     onStatus('Preparando Chimera · '+part.name+'…');result=await this.runWorker({part,body,clock,duration,engineVersion:version},onStatus);
     if(token!==this.generation)throw Error('Preparación cancelada.');await this.cache.put(key,result);stats.rendered++;
    }else{previous?.model?.dispose();this.records.delete(part.id);continue;}
    if(token!==this.generation)throw Error('Preparación cancelada.');
    const buffer=context.createBuffer(1,result.pcm.length,result.sampleRate);buffer.copyToChannel(result.pcm,0);const model=new api.VoiceModel(CHIMERA_BODIES[body],result.sampleRate),drawing=new api.AnatomyRenderer();previous?.model?.dispose();this.records.set(part.id,{sampleRate:result.sampleRate,snapshots:result.snapshots,segments:result.segments??[],optimization:result.optimization,buffer,model,drawing,key,body,part,api,active:true});
   }
   return stats;
  }finally{if(token===this.generation)this.preparing=false;}
 }

 start(scheduler,audio,accompaniment,selectedId){
  if(!this.enabled)return;const pos=Math.max(0,scheduler.position),offset=scheduler.seconds(0,pos),at=scheduler.anchorTime+scheduler.seconds(scheduler.anchorBeat,pos),now=audio.ctx.currentTime,late=Math.max(0,now-at);
  for(const [id,record] of this.records){if(!record.active||offset+late>=record.buffer.duration)continue;let bus;if(id===selectedId){if(audio.muted)continue;bus=audio.getMelodyBus();}else{const track=accompaniment.tracks.get(id);if(!track||!accompaniment.audible(track)||track.buffer)continue;bus=accompaniment.bus(track);accompaniment.update();}
   const source=audio.ctx.createBufferSource();source.buffer=record.buffer;source.connect(bus);source.start(Math.max(now,at),offset+late);audio.voices.add(source);source.onended=()=>{audio.voices.delete(source);source.disconnect();};
  }
 }
}
export const chimera=new ChimeraManager();
