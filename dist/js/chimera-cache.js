export const CHIMERA_CACHE_VERSION=3;
const MAX_BYTES=256*1024*1024;
export async function chimeraCacheKey(part,body,clock,duration,engineVersion){
 const content=JSON.stringify({version:CHIMERA_CACHE_VERSION,engineVersion,body,duration,clock:{tempos:clock.part.tempos,speed:clock.speed,manualBpm:clock.manualBpm,bpm:clock.manualBpm?clock.bpm:null},notes:part.notes.map(n=>({midi:n.soundMidi??n.midi,start:n.start,duration:n.duration})),lyrics:part.lyrics??[],lyricEdits:Object.entries(part.chimeraLyricEdits??{}).sort(([a],[b])=>a.localeCompare(b))});
 if(!globalThis.crypto?.subtle)return content;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function chimeraRenderTargets(parts,selectedId,mode='all',overview=false){return new Set((mode==='all'||overview?parts:parts.filter(p=>p.id===selectedId)).map(p=>p.id));}
export class ChimeraCache{
 constructor(factory=globalThis.indexedDB){this.factory=factory;this.connection=null;this.lastError='';}
 async open(){
  if(!this.factory)throw Error('El almacenamiento del navegador no está disponible.');
  if(!this.connection)this.connection=new Promise((resolve,reject)=>{const request=this.factory.open('adaptaciones-chimera',2);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('renders'))db.createObjectStore('renders',{keyPath:'key'});if(!db.objectStoreNames.contains('usage')){const usage=db.createObjectStore('usage',{keyPath:'key'}),cursor=request.transaction.objectStore('renders').openCursor();cursor.onsuccess=()=>{const entry=cursor.result;if(entry){usage.put({key:entry.value.key,bytes:entry.value.bytes,lastUsed:entry.value.lastUsed});entry.continue();}};}};request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();this.connection=null;};resolve(db);};});
  try{return await this.connection;}catch(error){this.connection=null;throw error;}
 }
 async transaction(mode,action){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction(['renders','usage'],mode),store=tx.objectStore('renders');let result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error??Error('No se pudo acceder al almacenamiento.'));action(store,value=>{result=value;},tx.objectStore('usage'));});}
 async get(key){try{const value=await this.transaction('readonly',(store,done)=>{const request=store.get(key);request.onsuccess=()=>done(request.result);});if(!value)return null;await this.transaction('readwrite',(_store,_done,usage)=>{usage.put({key,bytes:value.bytes,lastUsed:Date.now()});}).catch(error=>{this.lastError=error.message;});return value.result;}catch(error){this.lastError=error.message;return null;}}
 async put(key,result){
  const bytes=result.pcm.byteLength+(result.snapshots?.length??0)*240+JSON.stringify(result.segments??[]).length*2;
  if(bytes>MAX_BYTES){this.lastError='Esta voz supera el espacio reservado para la caché.';return false;}
  try{await this.transaction('readwrite',(store,_done,usage)=>{const request=usage.getAll();request.onsuccess=()=>{const entries=request.result.filter(e=>e.key!==key).sort((a,b)=>a.lastUsed-b.lastUsed);let total=entries.reduce((sum,e)=>sum+e.bytes,0);for(const entry of entries){if(total+bytes<=MAX_BYTES)break;store.delete(entry.key);usage.delete(entry.key);total-=entry.bytes;}const lastUsed=Date.now();store.put({key,result,bytes,lastUsed});usage.put({key,bytes,lastUsed});};});this.lastError='';return true;}catch(error){this.lastError=error.message;return false;}
 }
 async clear(){await this.transaction('readwrite',(store,_done,usage)=>{store.clear();usage.clear();});this.lastError='';}
}
