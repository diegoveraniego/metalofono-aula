import {ChimeraCache} from './chimera-cache.js';
const RATE=48000,PREROLL=.3,TAIL=1.25,MIN_GAP=1.75;
export function chimeraFragments(phrases,duration){
 const groups=[];let group;
 for(const phrase of phrases){if(phrase.start>=duration)continue;const end=phrase.start+phrase.notes.reduce((sum,n)=>sum+n.beats/2,0);
  if(!group||phrase.start-group.noteEnd>=MIN_GAP){group={phrases:[],noteEnd:end};groups.push(group);}group.phrases.push(phrase);group.noteEnd=Math.max(group.noteEnd,end);
 }
 return groups.map(group=>{const start=Math.max(0,Math.floor((group.phrases[0].start-PREROLL)*RATE))/RATE,end=Math.min(Math.ceil(duration*RATE-1e-7),Math.ceil((group.noteEnd+TAIL)*RATE))/RATE;return {start,duration:end-start,phrases:group.phrases.map(phrase=>({...phrase,start:phrase.start-start}))};});
}
export async function chimeraFragmentKey(fragment,body,engineVersion){
 const json=JSON.stringify({fragmentVersion:1,rate:RATE,body,engineVersion,duration:fragment.duration,phrases:fragment.phrases});
 if(!globalThis.crypto?.subtle)return 'phrase:'+json;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json));return 'phrase:'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function renderChimeraFragments({phrases,body,duration,engineVersion},render,onProgress=()=>{},cache=new ChimeraCache()){
 const fragments=chimeraFragments(phrases,duration),pcm=new Float32Array(Math.ceil(duration*RATE-1e-7)),snapshots=[],segments=[],optimization={rendered:0,cached:0,computedSeconds:0,reusedSeconds:0,skippedSeconds:Math.max(0,duration-fragments.reduce((sum,f)=>sum+f.duration,0))};
 for(const [index,fragment] of fragments.entries()){
  const key=await chimeraFragmentKey(fragment,body,engineVersion);let result=await cache.get(key);
  if(result){optimization.cached++;optimization.reusedSeconds+=fragment.duration;onProgress({index:index+1,total:fragments.length,cached:true,seconds:fragment.duration,duration:fragment.duration});}
  else{result=await render({phrases:fragment.phrases,body,duration:fragment.duration},seconds=>onProgress({index:index+1,total:fragments.length,cached:false,seconds,duration:fragment.duration}));await cache.put(key,result);optimization.rendered++;optimization.computedSeconds+=fragment.duration;}
  if(result.sampleRate!==RATE)throw Error('Frecuencia de audio Chimera incompatible.');const offset=Math.round(fragment.start*RATE),count=Math.min(result.pcm.length,pcm.length-offset);if(count>0)pcm.set(result.pcm.subarray(0,count),offset);
  snapshots.push(...result.snapshots.map(snapshot=>({...snapshot,time:snapshot.time+fragment.start})));segments.push(...(result.segments??[]).map(segment=>({...segment,t0:segment.t0+fragment.start,t1:segment.t1+fragment.start})));
 }
 return {pcm,sampleRate:RATE,snapshots,segments,optimization};
}
