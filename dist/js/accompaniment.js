// Acompañamiento: alturas sonoras originales, polifonía completa y audio local opcional.
export function family(part){const p=part.program??0,n=part.name.toLowerCase();if(part.percussion)return 'drums';if(/bajo|bass/.test(n)||p>=32&&p<=39)return 'bass';if(/el[ée]ctrica/.test(n)||p>=26&&p<=31)return 'electric';if(/guitarra|guitar/.test(n)||p>=24&&p<=25)return 'guitar';if(/voz|voice|vocal/.test(n)||p>=52&&p<=54)return 'voice';if(/synth|sint|teclado/.test(n)||p>=80&&p<=103)return 'synth';return 'keys';}
export function backingEvents(parts,selectedId){return parts.filter(p=>p.id!==selectedId).flatMap(p=>p.notes.map(n=>({...n,trackId:p.id,drum:p.percussion||n.drum}))).sort((a,b)=>a.start-b.start||a.midi-b.midi);}
export class Accompaniment{
 constructor(audio){this.audio=audio;this.tracks=new Map();this.enabled=true;audio.accompany=(n,t,d)=>this.note(n,t,d);audio.startStems=s=>this.startStems(s);}
 load(parts){for(const t of this.tracks.values())t.bus?.disconnect();this.tracks=new Map(parts.map(p=>[p.id,{id:p.id,name:p.name,type:family(p),volume:.45,muted:false,solo:false,buffer:null,fileName:'',bus:null}]));this.selected=null;}
 audible(t){const solo=[...this.tracks.values()].some(x=>x.id!==this.selected&&x.solo);return this.enabled&&t.id!==this.selected&&!t.muted&&(!solo||t.solo);}
 bus(t){if(!t.bus){t.bus=this.audio.ctx.createGain();t.bus.connect(this.audio.out);}return t.bus;}
 update(){for(const t of this.tracks.values())if(t.bus)t.bus.gain.setValueAtTime(this.audible(t)?t.volume:0,this.audio.ctx.currentTime);}
 hasStems(){return [...this.tracks.values()].some(t=>t.id!==this.selected&&t.buffer);}
 async setFile(id,file){if(file.size>64*1024*1024)throw Error('El audio supera 64 MB. Usa MP3 o un archivo más corto.');await this.audio.init();const buffer=await this.audio.ctx.decodeAudioData(await file.arrayBuffer());let bytes=buffer.length*buffer.numberOfChannels*4;for(const t of this.tracks.values())if(t.id!==id&&t.buffer)bytes+=t.buffer.length*t.buffer.numberOfChannels*4;if(bytes>256*1024*1024)throw Error('El audio decodificado supera 256 MB. Quita otras pistas o usa una mezcla única.');const t=this.tracks.get(id);t.buffer=buffer;t.fileName=file.name;}
 startStems(s){for(const t of this.tracks.values()){if(!t.buffer||t.id===this.selected||!this.audible(t))continue;const pos=Math.max(0,s.position),offset=s.seconds(0,pos);if(offset>=t.buffer.duration)continue;const source=this.audio.ctx.createBufferSource();source.buffer=t.buffer;source.connect(this.bus(t));this.update();const at=s.anchorTime+s.seconds(s.anchorBeat,pos),now=this.audio.ctx.currentTime,late=Math.max(0,now-at);if(offset+late>=t.buffer.duration)continue;source.start(Math.max(now,at),offset+late);this.audio.voices.add(source);source.onended=()=>{this.audio.voices.delete(source);source.disconnect();};}}
 note(n,when,duration){const t=this.tracks.get(n.trackId);if(!t||t.buffer||!this.audible(t))return;this.update();const bus=this.bus(t);this.update();const f=440*2**((n.midi-69)/12),g=(n.velocity??.7)*.18;
  if(t.type==='drums'){this.drum(n.midi,when,g,bus);return;}
  const d=Math.max(.06,Math.min(12,duration)),type=t.type;
  if(type==='guitar'){this.audio.tone(f,when,Math.min(d+.08,1.4),g,bus,'triangle');this.audio.tone(f*2,when,.15,g*.25,bus);}
  else if(type==='electric'){this.audio.sustain(f,when,d,g*.35,bus,'sawtooth',.008);this.audio.sustain(f*2,when,d,g*.1,bus,'triangle');}
  else if(type==='bass'){this.audio.sustain(f,when,d,g*1.4,bus,'sine',.008);this.audio.tone(f*2,when,Math.min(d,.22),g*.25,bus,'triangle');}
  else if(type==='voice'){this.audio.sustain(f,when,d,g*.65,bus,'triangle',.06);this.audio.sustain(f*2,when,d,g*.15,bus,'sine',.07);}
  else if(type==='synth'){this.audio.sustain(f,when,d,g*.6,bus,'triangle',.04);this.audio.sustain(f*1.003,when,d,g*.25,bus,'sine',.05);}
  else {this.audio.tone(f,when,Math.min(d+.1,2.5),g,bus,'triangle');this.audio.tone(f*2,when,.2,g*.25,bus);}
 }
 drum(midi,when,g,bus){if(midi===35||midi===36){this.audio.tone(65,when,.19,g*2,bus);this.audio.tone(120,when,.045,g,bus);return;}
  const hat=[42,44,46,49,51,52,55,57,59].includes(midi),duration=hat?(midi===46?.3:midi===42?.055:.4):.13;
  if(!this.noise){this.noise=this.audio.ctx.createBuffer(1,this.audio.ctx.sampleRate*.5,this.audio.ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  const source=this.audio.ctx.createBufferSource(),filter=this.audio.ctx.createBiquadFilter(),gain=this.audio.ctx.createGain();source.buffer=this.noise;filter.type=hat?'highpass':'bandpass';filter.frequency.value=hat?6500:1800;gain.gain.setValueAtTime(Math.max(.0001,g*(hat?.35:.8)),when);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(when);source.stop(when+duration);this.audio.voices.add(source);source.onended=()=>{this.audio.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};if(!hat)this.audio.tone([38,40].includes(midi)?180:100+(midi-40)*14,when,.12,g*.6,bus,'triangle');
 }
}
