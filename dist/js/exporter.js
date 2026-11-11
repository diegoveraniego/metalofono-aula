import {zipFiles} from './zip-writer.js';
import {download} from './structure.js';
export class Exporter{
 constructor(canvas,audio,save=download){this.save=save;this.canvas=canvas;this.audio=audio;this.active=false;this.batch=null;}
 formats(){if(!globalThis.MediaRecorder||!this.canvas.captureStream)return [];return ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'].filter(t=>MediaRecorder.isTypeSupported(t));}
 async start({height,format,title,onstop,drawInitial}){if(this.active)throw Error('Ya hay una grabación.');await this.audio.init();const mime=this.formats().find(t=>t.startsWith('video/'+format));if(!mime)throw Error('Este navegador no permite grabar '+format+'. Prueba WebM o captura externa.');this.lastFrame=null;this.stalls=0;this.oldSize=[this.canvas.width,this.canvas.height];const portrait=this.oldSize[0]<this.oldSize[1];this.canvas.width=portrait?height:Math.round(height*16/9);this.canvas.height=portrait?Math.round(height*16/9):height;drawInitial?.();const video=this.canvas.captureStream(30);this.stream=new MediaStream([...video.getVideoTracks(),...this.audio.capture.stream.getAudioTracks()]);this.video=video;this.chunks=[];this.recorder=new MediaRecorder(this.stream,{mimeType:mime,videoBitsPerSecond:height===1080?8000000:4000000});this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);};this.recorder.onstop=()=>{this.save(new Blob(this.chunks,{type:mime}),title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,70)+'.'+(mime.includes('mp4')?'mp4':'webm'));this.video.getTracks().forEach(t=>t.stop());[this.canvas.width,this.canvas.height]=this.oldSize;this.active=false;onstop?.({frameWarnings:this.stalls??0});};this.recorder.onerror=()=>{this.stop();};this.active=true;this.recorder.start(1000);}
 async startBatch({tutorials,height,format,title,onstop,onstatus,onPartPrepare,onPartStart,onPartEnd}){
  if(this.active)throw Error('Ya hay una grabación.');if(!tutorials.length)throw Error('No hay partes para grabar.');
  await this.audio.init();const mime=this.formats().find(t=>t.startsWith('video/'+format));if(!mime)throw Error('Formato de video no disponible.');
  const batch={tutorials,current:null,index:-1,files:[],stopping:false,failed:false,frameWarnings:0};this.batch=batch;this.active=true;
  this.batchFinished=(async()=>{
   try{
    for(let index=0;index<tutorials.length&&!batch.stopping;index++){
     const tutorial=tutorials[index];batch.index=index;onstatus?.(`Grabando ${index+1}/${tutorials.length}: ${tutorial.name}`);await onPartPrepare?.(tutorial,index);if(batch.stopping)break;
     const canvas=tutorial.renderer.canvas;const portrait=tutorial.opts?.instrument==='voz'&&tutorial.opts?.vocalPortrait;canvas.width=portrait?height:Math.round(height*16/9);canvas.height=portrait?Math.round(height*16/9):height;tutorial.draw(0);
     const video=canvas.captureStream(30),stream=new MediaStream([...video.getVideoTracks(),...this.audio.capture.stream.getAudioTracks()]);
     let recorder;try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:height===1080?8000000:4000000});}catch(error){video.getVideoTracks().forEach(t=>t.stop());throw error;}
     const session={tutorial,video,recorder,chunks:[],lastFrame:null,stalls:0};session.done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)session.chunks.push(e.data);};recorder.onstop=resolve;});
     recorder.onerror=()=>{batch.failed=true;this.stop();};batch.current=session;let started=false;
     try{recorder.start(1000);started=true;await onPartStart?.(tutorial,index);if(batch.stopping&&recorder.state!=='inactive')recorder.stop();await session.done;}
     finally{if(started&&recorder.state!=='inactive'){recorder.stop();await session.done;}video.getVideoTracks().forEach(t=>t.stop());}
     const extension=mime.includes('mp4')?'mp4':'webm';if(session.chunks.length)batch.files.push({name:String(index+1).padStart(2,'0')+' - '+tutorial.name.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,95)+'.'+extension,blob:new Blob(session.chunks,{type:mime})});
     batch.frameWarnings+=session.stalls;session.chunks=[];batch.current=null;await onPartEnd?.(tutorial,index);
    }
   }catch(error){batch.failed=true;batch.error=error.message;}
   try{
    if(batch.files.length){onstatus?.('Preparando el ZIP con '+batch.files.length+' videos…');const zip=await zipFiles(batch.files);this.save(zip,title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,70)+' - tutoriales'+(batch.failed||batch.stopping?' - parcial':'')+'.zip');}
   }catch(error){batch.failed=true;batch.error=error.message;}
   finally{const count=batch.files.length;batch.files=[];this.active=false;this.batch=null;onstop?.({batch:true,count,failed:batch.failed,error:batch.error,cancelled:batch.stopping,frameWarnings:batch.frameWarnings});}
  })();
 }
 drawBatch(beat){const batch=this.batch;if(this.active&&batch?.current&&!batch.stopping)try{batch.current.tutorial.draw(beat);}catch(error){batch.failed=true;batch.error=error.message;this.stop();}}
 noteFrame(now=performance.now()){
  const session=this.batch?.current??this;if(!this.active||session.recorder?.state!=='recording')return;
  if(session.lastFrame!=null&&now-session.lastFrame>100)session.stalls=(session.stalls??0)+1;session.lastFrame=now;
 }
 finishPart(){const session=this.batch?.current;if(session&&session.recorder.state!=='inactive')session.recorder.stop();}
 stop(){if(this.batch){if(this.batch.current||this.batch.files.length<this.batch.tutorials.length)this.batch.stopping=true;this.finishPart();return;}if(this.active&&this.recorder.state!=='inactive')this.recorder.stop();}
}
