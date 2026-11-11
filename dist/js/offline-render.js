import {prepareAlphaScore} from './alpha-score.js';
import {loadPianoScoreFont} from './piano-score.js';
import {validateExportJob} from './export-job.js';
import {Renderer} from './renderer.js';
import {Structure} from './structure.js';
import {Scheduler} from './scheduler.js';
import {AudioEngine} from './metronome.js';
import {SamplePlayer} from './sample-player.js';
import {introDuration,drawVideoIntro} from './video-intro.js';
import {FONTS} from './appearance.js';
import {wavByteLength,wavChunk,bytesBase64} from './wav.js';

export function offlineClock(job){
 const clock=new Scheduler({cancel(){}});clock.part=job.clock.part;Object.assign(clock,job.clock);const first=clock.part.measures[0],unit=4/(clock.manualMeter?clock.denominator:first.denominator),beats=(clock.manualMeter?clock.numerator:first.numerator)*unit;
 const startBeat=-clock.countIn*beats,intro=introDuration(job.tutorials.map(t=>t.instruction??{enabled:false,text:''})),duration=Math.min(job.maxSeconds??Infinity,intro+clock.seconds(startBeat,clock.end)+1.25);
 return {clock,startBeat,intro,duration};
}
export async function renderJobAudio(job,onProgress=()=>{}){
 const {duration}=offlineClock(job),rate=44100,frames=Math.ceil(duration*rate),channels=[new Float32Array(frames),new Float32Array(frames)];
 for(let start=0;start<frames;start+=12*rate){
  const end=Math.min(frames,start+12*rate),offset=Math.max(0,start/rate-2);
  onProgress({stage:'rendering',seconds:start/rate,total:duration});
  const buffer=await renderAudioWindow(job,offset,end/rate-offset),skip=Math.round((start/rate-offset)*rate);
  for(let channel=0;channel<2;channel++)channels[channel].set(buffer.getChannelData(channel).subarray(skip,skip+end-start),start);
 }
 onProgress({stage:'complete',seconds:duration,total:duration});
 return {numberOfChannels:2,sampleRate:rate,length:frames,duration,getChannelData:index=>channels[index]};
}
async function renderAudioWindow(job,offset,windowDuration){
 const {clock,startBeat,intro}=offlineClock(job),duration=windowDuration,context=new OfflineAudioContext(2,Math.ceil(duration*44100),44100),engine=new AudioEngine();engine.ctx=context;engine.out=context.createGain();engine.out.gain.value=.45;engine.limiter=context.createDynamicsCompressor();engine.limiter.threshold.value=-10;engine.limiter.ratio.value=8;engine.out.connect(engine.limiter);engine.limiter.connect(context.destination);engine.metro=context.createGain();engine.metro.connect(context.destination);engine.metroRecord=context.createGain();engine.samples=new SamplePlayer(context,engine.voices);
 const audio=job.audio,tutorial=audio.tutorial;engine.tutorialInstrument=tutorial.instrument;engine.tutorialPart=tutorial.part;engine.tutorialPitch=tutorial.pitch;engine.melodyVolume=tutorial.volume;engine.muted=tutorial.muted;engine.metalTone=tutorial.metalTone;engine.keyboardSound=tutorial.keyboardSound;engine.metroVolume=audio.metroVolume;engine.metroOn=audio.metroOn;
 const rawWhen=beat=>intro+clock.seconds(startBeat,beat)-offset,when=beat=>Math.max(0,rawWhen(beat)),length=n=>Math.max(.02,clock.seconds(n.start,Math.min(clock.end,n.start+n.duration))+Math.min(0,rawWhen(n.start))),audible=n=>rawWhen(n.start)<duration&&rawWhen(Math.min(clock.end,n.start+n.duration))+2>0;
 for(const n of tutorial.notes){const at=when(n.start);if(audible(n)&&n.start<clock.end)engine.note(n,at,length(n));}
 const tracks=new Map(audio.backingTracks.map(t=>{const bus=context.createGain();bus.gain.value=t.volume;bus.connect(engine.out);return [t.id,{...t,bus}];}));
 for(const n of audio.backingEvents){const t=tracks.get(n.trackId),at=when(n.start);if(t&&audible(n)&&n.start<clock.end)engine.samples.play(t,n,at,length(n),t.bus);}
 if(audio.metroOn){
  const first=clock.part.measures[0],unit=4/(clock.manualMeter?clock.denominator:first.denominator),numerator=clock.manualMeter?clock.numerator:first.numerator;
  for(let b=startBeat,i=0;b<0-1e-7;b+=unit,i++)if(rawWhen(b)>=0&&rawWhen(b)<duration)engine.click(i%numerator===0,when(b));
  if(clock.manualMeter){for(let i=0;i*unit<clock.end;i++)if(rawWhen(i*unit)>=0&&rawWhen(i*unit)<duration)engine.click(i%clock.numerator===0,when(i*unit));}
  else for(const bar of clock.part.measures)for(let b=bar.start;b<Math.min(clock.end,bar.start+bar.duration)-1e-7;b+=4/bar.denominator)if(rawWhen(b)>=0&&rawWhen(b)<duration)engine.click(Math.abs(b-bar.start)<1e-7,when(b));
 }
 return context.startRendering();
}

// Este módulo también se puede importar en pruebas sin DOM ni Web Audio.
if(typeof document!=='undefined'&&document.getElementById('stage')){
 let job,renderer,current,sections,audioBuffer,timing;
 globalThis.AulaOffline={ready:false,error:null,
  async load(){await loadPianoScoreFont();job=validateExportJob(await (await fetch('/job.json')).json());timing=offlineClock(job);if(job.customFont){const raw=atob(job.customFont.base64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),font=new FontFace('AulaPersonalizada',bytes);await font.load();document.fonts.add(font);FONTS.custom={name:job.customFont.name,family:'"AulaPersonalizada", sans-serif'};}
   const canvas=document.getElementById('stage');renderer=new Renderer(canvas);canvas.width=Math.round(job.height*16/9);canvas.height=job.height;await Promise.all([400,500,600,700].map(weight=>document.fonts.load(`${weight} 20px Inter`)));await document.fonts.ready;this.ready=true;return {duration:timing.duration,frames:Math.ceil(timing.duration*job.fps),parts:job.tutorials.map(t=>t.name)};
  },
  audioProgress:{stage:'idle',seconds:0},
  async audio(){audioBuffer=await renderJobAudio(job,progress=>{this.audioProgress=progress;});return {bytes:wavByteLength(audioBuffer),seconds:audioBuffer.duration};},
  audioChunk(offset,count){if(!audioBuffer)throw Error('El audio aún no está preparado.');return bytesBase64(wavChunk(audioBuffer,offset,count));},
  async select(index){current=job.tutorials[index];if(!current)throw Error('Parte no válida.');renderer.opts={...renderer.opts,...current.opts};const portrait=renderer.opts.instrument==='voz'&&renderer.opts.vocalPortrait;renderer.canvas.width=portrait?job.height:Math.round(job.height*16/9);renderer.canvas.height=portrait?Math.round(job.height*16/9):job.height;sections=new Structure();sections.sections=current.sections;await prepareAlphaScore(current.part,renderer.opts);return current.name;},
  frame(index){const seconds=index/job.fps;if(seconds<timing.intro)drawVideoIntro(renderer,{title:job.title,partName:current.name,text:current.instruction?.enabled?current.instruction.text:'',remaining:timing.intro-seconds});else{renderer.ctx.setTransform(renderer.canvas.width/1600,0,0,renderer.canvas.height/900,0,0);const beat=timing.clock.beatAfter(timing.startBeat,seconds-timing.intro);renderer.draw(beat,current.part,current.notes,sections,timing.clock);}return renderer.canvas.toDataURL('image/png').split(',')[1];}
 };
}
