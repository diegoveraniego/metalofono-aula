import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {readFile,mkdir,mkdtemp,rm,open,copyFile,unlink,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {validateExportJob} from '../dist/js/export-job.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=join(root,'dist');
export function parseRenderArgs(args){
 const opts={};for(let i=0;i<args.length;i++){const arg=args[i];if(arg==='--')continue;if(['--check','--help','--list'].includes(arg))opts[arg.slice(2)]=true;else if(['--out','--chrome','--ffmpeg','--seconds','--part'].includes(arg)){if(!args[i+1])throw Error('Falta valor para '+arg);opts[arg.slice(2)]=args[++i];}else if(arg.startsWith('-'))throw Error('Opción desconocida: '+arg);else if(!opts.job)opts.job=arg;else throw Error('Solo se acepta un archivo de trabajo.');}
 if(opts.seconds!=null&&(!Number.isFinite(Number(opts.seconds))||Number(opts.seconds)<=0))throw Error('--seconds debe ser positivo.');if(opts.part!=null&&(!Number.isInteger(Number(opts.part))||Number(opts.part)<1))throw Error('--part debe ser un número desde 1.');return opts;
}
export function outputName(name,index){return String(index+1).padStart(2,'0')+' - '+name.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,95)+'.mp4';}
export function encoderArgs({fps,audio,path}){return ['-hide_banner','-loglevel','error','-nostdin','-n','-f','image2pipe','-framerate',String(fps),'-vcodec','png','-i','pipe:0','-i',audio,'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-shortest',path];}
function executable(explicit,candidates,flag){for(const path of explicit?[explicit]:candidates){const result=spawnSync(path,[flag],{encoding:'utf8',timeout:10000,windowsHide:true});if(result.status===0)return {path,version:(result.stdout||result.stderr).split('\n')[0]};}throw Error('No se encontró '+candidates[0]+'. Instálalo o indica su ruta.');}
function chromeExecutable(explicit){return executable(explicit||process.env.CHROME_BIN,['chromium','chromium-browser','google-chrome','google-chrome-stable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'],'--version');}
async function serve(job){
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.woff2':'font/woff2','.wasm':'application/wasm','.svg':'image/svg+xml','.css':'text/css','.json':'application/json'};
 const server=createServer(async(req,res)=>{try{if(req.method!=='GET'){res.writeHead(405);res.end();return;}const url=new URL(req.url,'http://localhost');if(url.pathname==='/job.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(job));return;}
  const path=resolve(dist,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(dist+sep)){res.writeHead(403);res.end();return;}const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Recurso no encontrado');}});
 server.listen(0,'127.0.0.1');await once(server,'listening');return {server,url:'http://127.0.0.1:'+server.address().port+'/offline.html'};
}
export class ChromePipe{
 constructor(child){this.child=child;this.nextId=0;this.pending=new Map();this.buffer=Buffer.alloc(0);child.stdio[4].on('data',chunk=>{this.buffer=Buffer.concat([this.buffer,chunk]);let end;while((end=this.buffer.indexOf(0))!==-1){const raw=this.buffer.subarray(0,end);this.buffer=this.buffer.subarray(end+1);if(!raw.length)continue;try{const message=JSON.parse(raw.toString('utf8')),wait=this.pending.get(message.id);if(wait){clearTimeout(wait.timer);this.pending.delete(message.id);if(message.error)wait.reject(Error(message.error.message));else wait.resolve(message.result);}}catch(error){this.rejectAll(error);}}});child.on('error',error=>this.rejectAll(error));child.on('exit',code=>this.rejectAll(Error('Chromium terminó antes de completar el trabajo ('+code+').')));child.stdio[3].on('error',error=>this.rejectAll(error));}
 rejectAll(error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
 send(method,params={},sessionId,timeoutMs=120000){return new Promise((resolve,reject)=>{const id=++this.nextId,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Tiempo agotado: '+method));},timeoutMs);this.pending.set(id,{resolve,reject,timer});this.child.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0',error=>{if(error){clearTimeout(timer);this.pending.delete(id);reject(error);}});});}
 async evaluate(expression,sessionId,timeoutMs){const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId,timeoutMs);if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||'Error de renderizado');return result.result?.value;}
}
export async function main(args=process.argv.slice(2)){
 const opts=parseRenderArgs(args);if(opts.help){console.log('Uso: npm run render -- "trabajo-local.json" [--out carpeta] [--part 1] [--seconds 8]\nRevisar dependencias: npm run render -- --check\nRutas opcionales: --chrome /ruta/chromium --ffmpeg /ruta/ffmpeg');return;}
 const chrome=chromeExecutable(opts.chrome),ffmpeg=executable(opts.ffmpeg||process.env.FFMPEG_BIN,['ffmpeg'],'-version');
 if(opts.check){console.log('Node: '+process.version+'\nChromium: '+chrome.version+'\nFFmpeg: '+ffmpeg.version);return;}
 if(!opts.job)throw Error('Indica el trabajo JSON guardado desde la app. Usa --help para ver ejemplos.');const bytes=await readFile(resolve(opts.job));if(bytes.length>64*1024*1024)throw Error('El trabajo supera 64 MB.');const job=validateExportJob(JSON.parse(bytes.toString('utf8')));if(opts.seconds)job.maxSeconds=Number(opts.seconds);
 if(opts.list){job.tutorials.forEach((t,i)=>console.log(`${i+1}. ${t.name}`));return;}
 const indices=opts.part?[Number(opts.part)-1]:job.tutorials.map((t,i)=>i);if(indices.some(i=>!job.tutorials[i]))throw Error('La parte indicada no existe.');
 const output=resolve(opts.out||join(root,'videos-adaptaciones-'+new Date().toISOString().replace(/[:.]/g,'-')));await mkdir(output,{recursive:true});for(const i of indices)try{await access(join(output,outputName(job.tutorials[i].name,i)));throw Error('Ya existe '+outputName(job.tutorials[i].name,i));}catch(error){if(error.code!=='ENOENT')throw error;}
 const temp=await mkdtemp(join(tmpdir(),'adaptaciones-render-'));let server,child,encoder,stderr='',cancelled=false;
 const interrupt=()=>{cancelled=true;encoder?.kill('SIGTERM');child?.kill('SIGTERM');};process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
 try{
  const page=await serve(job);server=page.server;
  child=spawn(chrome.path,['--headless','--remote-debugging-pipe','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-component-update','--disable-sync','--disable-extensions','--disable-dev-shm-usage','--user-data-dir='+join(temp,'chromium-profile'),'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe'],windowsHide:true});child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-16000);});
  const cdp=new ChromePipe(child),target=await cdp.send('Target.createTarget',{url:'about:blank'}),attached=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),session=attached.sessionId;await cdp.send('Runtime.enable',{},session);await cdp.send('Page.navigate',{url:page.url},session);
  const deadline=Date.now()+30000;for(;;){let ready=false;try{ready=await cdp.evaluate('typeof AulaOffline !== "undefined"',session);}catch(error){if(!/context.*destroyed|Cannot find context|navigated/i.test(error.message))throw error;}if(ready)break;if(Date.now()>deadline)throw Error('No se pudo abrir el renderizador local.');await new Promise(r=>setTimeout(r,100));}
  const info=await cdp.evaluate('AulaOffline.load()',session);console.log(`Preparando audio sin reproducción: ${info.duration.toFixed(1)} s · ${job.fps} fps · ${indices.length} videos.`);
  const audioStarted=Date.now(),audioTimeout=Math.max(600000,Math.ceil(info.duration*10000));
  const audioProgress=setInterval(async()=>{try{const progress=await cdp.evaluate('AulaOffline.audioProgress',session);console.log(`Audio: ${Number(progress.seconds??0).toFixed(1)} / ${info.duration.toFixed(1)} s · ${Math.round((Date.now()-audioStarted)/1000)} s transcurridos.`);}catch{}},15000);
  let audio;try{audio=await cdp.evaluate('AulaOffline.audio()',session,audioTimeout);}catch(error){throw Error('Falló la preparación de audio: '+error.message);}finally{clearInterval(audioProgress);}
  console.log('Audio preparado. Generando los videos por separado.');
  const audioPath=join(temp,'mezcla.wav'),handle=await open(audioPath,'wx');try{for(let offset=0;offset<audio.bytes;offset+=262144){if(cancelled)throw Error('Exportación cancelada.');const data=await cdp.evaluate(`AulaOffline.audioChunk(${offset},262144)`,session);await handle.write(Buffer.from(data,'base64'));}}finally{await handle.close();}
  for(const index of indices){
   if(cancelled)throw Error('Exportación cancelada.');await cdp.evaluate(`AulaOffline.select(${index})`,session);const filename=outputName(job.tutorials[index].name,index),temporary=join(temp,index+'.mp4');console.log('Renderizando '+filename);let encoderError='';
   encoder=spawn(ffmpeg.path,encoderArgs({fps:job.fps,audio:audioPath,path:temporary}),{stdio:['pipe','ignore','pipe'],windowsHide:true});encoder.stderr.on('data',chunk=>{encoderError=(encoderError+chunk).slice(-8000);});let pipeError;encoder.stdin.on('error',error=>{pipeError=error;});const finished=new Promise((resolve,reject)=>{encoder.once('error',reject);encoder.once('close',code=>code===0?resolve():reject(Error('FFmpeg terminó con error: '+encoderError)));});finished.catch(()=>{});
   for(let frame=0;frame<info.frames;frame++){
    if(cancelled)throw Error('Exportación cancelada.');if(pipeError)throw Error('FFmpeg no pudo recibir los cuadros: '+encoderError);const png=await cdp.evaluate(`AulaOffline.frame(${frame})`,session);if(!encoder.stdin.write(Buffer.from(png,'base64')))await Promise.race([once(encoder.stdin,'drain'),finished.then(()=>{throw Error('FFmpeg cerró antes de recibir todos los cuadros.');})]);if(frame%job.fps===0)process.stdout.write(`\r${Math.round(frame/info.frames*100)}% · cuadro ${frame+1}/${info.frames}`);
   }
   encoder.stdin.end();await finished;encoder=null;await copyFile(temporary,join(output,filename),constants.COPYFILE_EXCL);await unlink(temporary);console.log('\r100% · Guardado '+filename);
  }
  console.log('Listo. Videos en '+output);
 }catch(error){if(stderr&&/Chrom|pipe|EPIPE|agotado/i.test(error.message))error.message+='\n'+stderr.trim();throw error;}
 finally{encoder?.kill('SIGTERM');child?.kill('SIGTERM');server?.closeAllConnections();await new Promise(resolve=>server?server.close(resolve):resolve());process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);await rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('\nNo se pudo exportar: '+error.message);process.exitCode=1;});
