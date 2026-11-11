import {measureAt} from './model.js';
export class Scheduler{
 constructor(audio,onend){this.audio=audio;this.onend=onend;this.playing=false;this.position=0;this.speed=1;this.manualBpm=false;this.bpm=96;this.manualMeter=false;this.numerator=4;this.denominator=4;this.loop=null;this.countIn=1;this.generation=0;this.backing=[];}
 configure(part,notes){this.pause();this.part=part;this.notes=notes;this.end=part.measures.at(-1).start+part.measures.at(-1).duration;this.position=0;}
 tempoAt(beat){if(this.manualBpm)return this.bpm;let bpm=this.part.tempos[0]?.bpm||120;for(const t of this.part.tempos){if(t.start>beat)break;bpm=t.bpm;}return bpm;}
 seconds(a,b){if(b<a)return -this.seconds(b,a);if(this.manualBpm)return (b-a)*60/this.bpm/this.speed;let t=a,s=0;for(const c of this.part.tempos){if(c.start<=a||c.start>=b)continue;s+=(c.start-t)*60/this.tempoAt(t)/this.speed;t=c.start;}return s+(b-t)*60/this.tempoAt(t)/this.speed;}
 beatAfter(a,seconds){let t=a,remaining=seconds;const changes=this.manualBpm?[]:this.part.tempos.filter(c=>c.start>a);for(const c of changes){const span=(c.start-t)*60/this.tempoAt(t)/this.speed;if(remaining<span)return t+remaining*this.tempoAt(t)*this.speed/60;remaining-=span;t=c.start;}return t+remaining*this.tempoAt(t)*this.speed/60;}
 current(){if(!this.playing)return this.position;return this.beatAfter(this.anchorBeat,Math.max(0,this.audio.ctx.currentTime-this.anchorTime));}
 async play(withCount=true,startTime=null){if(this.playing)return;const gen=++this.generation;await this.audio.init();await this.audio.prepare?.(this);if(gen!==this.generation)return;this.playing=true;const m=measureAt(this.part,this.position),unit=4/(this.manualMeter?this.denominator:m.denominator),beats=(this.manualMeter?this.numerator:m.numerator)*unit;
  this.anchorBeat=this.position-(withCount?this.countIn*beats:0);this.anchorTime=startTime??this.audio.ctx.currentTime+.1;this.nextNote=this.notes.findIndex(n=>n.start>=this.position-1e-7);if(this.nextNote<0)this.nextNote=this.notes.length;
  this.clicks=[];if(withCount)for(let x=this.anchorBeat,i=0;x<this.position-1e-7;x+=unit,i++)this.clicks.push({beat:x,accent:i%(beats/unit)===0});
  if(this.manualMeter){const u=4/this.denominator;for(let i=0;i*u<this.end-1e-7;i++)if(i*u>=this.position-1e-7)this.clicks.push({beat:i*u,accent:i%this.numerator===0});}
  else for(const bar of this.part.measures){const u=4/bar.denominator;for(let b=bar.start;b<bar.start+bar.duration-1e-7;b+=u)if(b>=this.position-1e-7)this.clicks.push({beat:b,accent:Math.abs(b-bar.start)<1e-7});}
  this.nextBacking=this.backing.findIndex(n=>n.start>=this.position-1e-7);if(this.nextBacking<0)this.nextBacking=this.backing.length;
  for(const n of this.backing){if(n.start>=this.position)break;if(n.start+n.duration>this.position&&!n.drum){const at=this.anchorTime+this.seconds(this.anchorBeat,this.position);this.audio.accompany?.(n,Math.max(this.audio.ctx.currentTime,at),this.seconds(this.position,Math.min(n.start+n.duration,this.loop?.end??this.end)));}}
  if(this.audio.tutorialInstrument!=='metalofono'&&this.audio.tutorialInstrument!=='bateria')for(const n of this.notes){if(n.start>=this.position)break;if(n.start+n.duration>this.position){const at=this.anchorTime+this.seconds(this.anchorBeat,this.position);this.audio.note(n,Math.max(this.audio.ctx.currentTime,at),this.seconds(this.position,Math.min(n.start+n.duration,this.loop?.end??this.end)));}}
  this.audio.startStems?.(this);this.clickIndex=0;this.timer=setInterval(()=>this.tick(),25);this.tick();
 }
 tick(){if(!this.playing)return;const now=this.audio.ctx.currentTime,limit=now+.12,end=this.loop?.end??this.end;
  while(this.nextNote<this.notes.length){const n=this.notes[this.nextNote];if(n.start>=end)break;const when=this.anchorTime+this.seconds(this.anchorBeat,n.start);if(when>limit)break;if(when>=now-.05)this.audio.note(n,Math.max(now,when),this.seconds(n.start,Math.min(n.start+n.duration,end)));this.nextNote++;}
  while(this.nextBacking<this.backing.length){const n=this.backing[this.nextBacking];if(n.start>=end)break;const when=this.anchorTime+this.seconds(this.anchorBeat,n.start);if(when>limit)break;if(when>=now-.05)this.audio.accompany?.(n,Math.max(now,when),this.seconds(n.start,Math.min(n.start+n.duration,end)));this.nextBacking++;}
  while(this.clickIndex<this.clicks.length){const c=this.clicks[this.clickIndex];if(c.beat>=end)break;const when=this.anchorTime+this.seconds(this.anchorBeat,c.beat);if(when>limit)break;if(when>=now-.05)this.audio.click(c.accent,Math.max(now,when));this.clickIndex++;}
  if(this.current()>=end){const loop=this.loop,boundary=this.anchorTime+this.seconds(this.anchorBeat,end);this.pause();if(loop){this.position=loop.start;this.play(false,boundary);}else{this.position=this.end;this.onend?.();}}
 }
 pause(){this.generation++;if(this.playing)this.position=Math.max(0,this.current());this.playing=false;clearInterval(this.timer);this.audio.cancel();}
 seek(beat){const was=this.playing;this.pause();this.position=Math.max(0,Math.min(this.end,beat));if(was)this.play(false);}
 async setSpeed(value){const was=this.playing;this.pause();this.speed=Math.max(.25,Math.min(1.5,Number(value)||1));if(was)await this.play(false);}
 refresh(){const was=this.playing;this.pause();if(was)this.play(false);}
}
