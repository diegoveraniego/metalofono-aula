import {zipFiles} from './zip-writer.js';
import {download} from './structure.js';
export class Exporter{
 constructor(canvas,audio,save=download){this.save=save;this.canvas=canvas;this.audio=audio;this.active=false;this.batch=null;}
 formats(){if(!globalThis.MediaRecorder||!this.canvas.captureStream)return [];return ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'].filter(t=>MediaRecorder.isTypeSupported(t));}
 async start({height,format,title,onstop,drawInitial}){if(this.active)throw Error('Ya hay una grabación.');await this.audio.init();const mime=this.formats().find(t=>t.startsWith('video/'+format));if(!mime)throw Error('Este navegador no permite grabar '+format+'. Prueba WebM o captura externa.');this.oldSize=[this.canvas.width,this.canvas.height];this.canvas.width=Math.round(height*16/9);this.canvas.height=height;drawInitial?.();const video=this.canvas.captureStream(30);this.stream=new MediaStream([...video.getVideoTracks(),...this.audio.capture.stream.getAudioTracks()]);this.video=video;this.chunks=[];this.recorder=new MediaRecorder(this.stream,{mimeType:mime,videoBitsPerSecond:height===1080?8000000:4000000});this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);};this.recorder.onstop=()=>{this.save(new Blob(this.chunks,{type:mime}),title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,70)+'.'+(mime.includes('mp4')?'mp4':'webm'));this.video.getTracks().forEach(t=>t.stop());[this.canvas.width,this.canvas.height]=this.oldSize;this.active=false;onstop?.();};this.recorder.onerror=()=>{this.stop();};this.active=true;this.recorder.start(1000);}
 async startBatch({tutorials,height,format,title,onstop,onstatus}){
  if(this.active)throw Error('Ya hay una grabación.');if(!tutorials.length)throw Error('No hay partes para grabar.');
  await this.audio.init();const mime=this.formats().find(t=>t.startsWith('video/'+format));if(!mime)throw Error('Formato de video no disponible.');
  const batch={sessions:[],stopping:false,failed:false};
  try{
   for(const tutorial of tutorials){
    const canvas=tutorial.renderer.canvas;canvas.width=Math.round(height*16/9);canvas.height=height;
    tutorial.draw(0);const video=canvas.captureStream(30),stream=new MediaStream([...video.getVideoTracks(),...this.audio.capture.stream.getAudioTracks()]);
    let recorder;try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:height===1080?8000000:4000000});}catch(error){video.getVideoTracks().forEach(t=>t.stop());throw error;}
    const session={tutorial,video,recorder,chunks:[]};session.done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)session.chunks.push(e.data);};recorder.onstop=()=>resolve();});
    recorder.onerror=()=>{batch.failed=true;this.stop();};batch.sessions.push(session);
   }
   this.batch=batch;this.active=true;for(const session of batch.sessions)session.recorder.start(1000);
  }catch(error){this.active=false;this.batch=null;for(const session of batch.sessions){if(session.recorder.state!=='inactive')session.recorder.stop();session.video.getVideoTracks().forEach(t=>t.stop());}throw error;}
  this.batchFinished=Promise.all(batch.sessions.map(s=>s.done)).then(async()=>{
   const extension=mime.includes('mp4')?'mp4':'webm';onstatus?.('Preparando el ZIP con '+batch.sessions.length+' videos…');
   const files=batch.sessions.map((s,i)=>({name:String(i+1).padStart(2,'0')+' - '+s.tutorial.name.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,95)+'.'+extension,blob:new Blob(s.chunks,{type:mime})}));
   const zip=await zipFiles(files);this.save(zip,title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,70)+' - tutoriales'+(batch.failed?' - parcial':'')+'.zip');
  }).catch(error=>{batch.failed=true;batch.error=error.message;}).finally(()=>{
   for(const session of batch.sessions){session.video.getVideoTracks().forEach(t=>t.stop());session.chunks=[];}
   this.active=false;this.batch=null;onstop?.({batch:true,count:batch.sessions.length,failed:batch.failed,error:batch.error});
  });
 }
 drawBatch(beat){if(this.active&&this.batch&&!this.batch.stopping)try{for(const session of this.batch.sessions)session.tutorial.draw(beat);}catch(error){this.batch.failed=true;this.batch.error=error.message;this.stop();}}
 stop(){if(this.batch){if(!this.batch.stopping){this.batch.stopping=true;for(const session of this.batch.sessions)if(session.recorder.state!=='inactive')session.recorder.stop();}return;}if(this.active&&this.recorder.state!=='inactive')this.recorder.stop();}
}
