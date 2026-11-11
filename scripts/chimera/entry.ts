// Adaptador de aula sobre el motor y el dibujo originales de Chimera (MIT).
import {initChimera,chimeraModule} from 'chimera-source/src/wasm/chimera.ts';
import {writeGestures} from 'chimera-source/src/wasm/wire.ts';
import {mouthWords} from 'chimera-source/src/ui/mouthWords.ts';
import {AnatomyRenderer} from 'chimera-source/src/ui/render/anatomy.ts';
import {V} from 'chimera-source/src/ui/colors.ts';
function drawAnatomy(drawing:any,light:boolean,...args:any[]){
 const original={...V};
 try{if(light)Object.assign(V,{blue:'#111111',blueMid:'#222222',blueDim:'#444444',frame:'#cbd0d6',green:'#228344',red:'#c43a28',pink:'#b33283',white:'#7754aa',amber:'#a35b08'});if(light){const ctx=args[0];args[0]=new Proxy(ctx,{get(target,key){const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){if(key==='globalCompositeOperation'&&value==='lighter')value='source-over';if(key==='strokeStyle'&&typeof value==='string'){for(const color of Object.values(V)){const n=parseInt(color.slice(1),16),core='#'+[16,8,0].map(shift=>Math.round(((n>>shift)&255)*.45+255*.55).toString(16).padStart(2,'0')).join('');if(value===core){value=color;break;}}}return Reflect.set(target,key,value,target);}});}
 drawing.draw(...args);}
 finally{Object.assign(V,original);}
}
let api:any;
export async function loadChimera(){
 await initChimera(new URL('./chimera.wasm',import.meta.url).href);
 if(!api){const engine=await import('chimera-source/src/wasm/engine.ts'),analysis=await import('chimera-source/src/ui/analysis.ts');await new engine.EnglishG2P().load(new URL('./cmudict.txt.gz',import.meta.url).href);api={drawAnatomy,...engine,VoiceModel:analysis.VoiceModel,AnatomyRenderer,mouthWords};}
 return api;
}
export async function renderChimera({phrases,body,duration}:any,onProgress:(seconds:number)=>void){
 const api=await loadChimera(),instance=new WebAssembly.Instance(chimeraModule(),{}),x:any=instance.exports,rate=48000,lead=.3,h=x.engine_new(rate),total=Math.ceil(duration*rate-1e-7)+Math.round(lead*rate),pcm=new Float32Array(total),snapshots:any[]=[];
 try{
  x.engine_set_body(h,body.female,body.child);
  const plans=phrases.map((phrase:any)=>api.planSong(phrase.notes,{body,bpm:120,t0:phrase.start+lead,vibrato:25})),gestures=plans.flatMap((plan:any)=>plan.gestures),segments=plans.flatMap((plan:any)=>plan.segments.map((s:any)=>({...s,t0:s.t0-lead,t1:s.t1-lead}))).sort((a:any,b:any)=>a.t0-b.t0);
  if(gestures.length>16000)throw Error('La parte es demasiado larga para preparar de una vez con Chimera.');
  for(let i=0;i<gestures.length;i+=4000){const count=writeGestures(x.memory.buffer,x.engine_records(h),gestures.slice(i,i+4000),4000);x.engine_schedule(h,count,0,i===0?1:0);}
  let nextSnapshot=lead,report=0;
  for(let at=0;at<total;at+=4096){const count=Math.min(4096,total-at),p=x.engine_render(h,count);pcm.set(new Float32Array(x.memory.buffer,p,count),at);
   const time=(at+count)/rate;
   if(time>=nextSnapshot){const pointer=x.engine_telemetry(h),header=new Float64Array(x.memory.buffer,pointer,16),artic=Array.from(new Float64Array(x.memory.buffer,pointer+16*8,header[11]));snapshots.push({time:time-lead,artic,f0:header[3],voicing:header[4],rms:header[6],gate:header[9]});nextSnapshot=time+1/15;}
   if(time>=report){onProgress(Math.max(0,time-lead));report=time+1;}
  }
  return {pcm:pcm.slice(Math.round(lead*rate)),sampleRate:rate,snapshots,segments};
 }finally{x.engine_free(h);}
}
