export class AudioEngine{
 constructor(){this.ctx=null;this.voices=new Set();this.melodyVolume=.65;this.metroVolume=.35;this.muted=false;this.metroOn=true;this.recordMetro=true;}
 async init(){if(!this.ctx){this.ctx=new AudioContext();this.out=this.ctx.createGain();this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-10;this.limiter.ratio.value=8;this.out.connect(this.limiter);this.limiter.connect(this.ctx.destination);this.capture=this.ctx.createMediaStreamDestination();this.limiter.connect(this.capture);this.metro=this.ctx.createGain();this.metro.connect(this.ctx.destination);this.metroRecord=this.ctx.createGain();this.metro.connect(this.metroRecord);this.metroRecord.connect(this.capture);}await this.ctx.resume();}
 cancel(){for(const o of this.voices){try{o.stop();}catch{}}this.voices.clear();}
 tone(freq,when,duration,gain,bus,type='sine'){
  const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),when+.003);g.gain.exponentialRampToValueAtTime(.0001,when+duration);o.connect(g);g.connect(bus);o.start(when);o.stop(when+duration+.01);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};
 }
 sustain(freq,when,duration,gain,bus,type='sine',attack=.015){
  const o=this.ctx.createOscillator(),g=this.ctx.createGain(),d=Math.max(.03,duration),a=Math.min(attack,d*.4);o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(gain,when+a);g.gain.setValueAtTime(gain*.75,when+Math.max(a,d-.04));g.gain.exponentialRampToValueAtTime(.0001,when+d+.04);o.connect(g);g.connect(bus);o.start(when);o.stop(when+d+.05);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};
 }
 note(n,when){if(this.muted)return;const f=440*2**((n.midi-69)/12),g=this.melodyVolume*n.velocity*.32;this.tone(f,when,.8,g,this.out);this.tone(f*2.76,when,.18,g*.28,this.out);}
 click(accent,when){if(!this.metroOn)return;this.metroRecord.gain.value=this.recordMetro?1:0;this.tone(accent?1400:950,when,.055,this.metroVolume*.23,this.metro);}
}
