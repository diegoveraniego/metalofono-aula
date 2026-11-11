import {keyboardSound} from './keyboard-sounds.js';
import {defaultInstrument} from './instruments.js';
import {isChoralVoice} from './instruments.js';
import {drumNotes} from './drums.js';
import {instrumentLabel} from './sample-player.js';
// Acompañamiento: alturas sonoras originales, polifonía completa y audio local opcional.
export function family(part){const p=part.program??0,n=part.name.toLowerCase();if(part.percussion)return 'drums';if(isChoralVoice(part))return 'voice';if(/bajo|bass/.test(n)||p>=32&&p<=39)return 'bass';if(/el[ée]ctrica/.test(n)||p>=26&&p<=31)return 'electric';if(/guitarra|guitar/.test(n)||p>=24&&p<=25)return 'guitar';if(/voz|voice|vocal/.test(n)||p>=52&&p<=54)return 'voice';if(/synth|sint|teclado/.test(n)||p>=80&&p<=103)return 'synth';return 'keys';}
export function backingEvents(parts,selectedId,{drumMappings={},drumMix={}}={}){return parts.filter(p=>p.id!==selectedId).flatMap(p=>(p.percussion?drumNotes(p.notes,drumMappings[p.id],drumMix[p.id]):p.notes).map(n=>({...n,trackId:p.id,drum:p.percussion||n.drum}))).sort((a,b)=>a.start-b.start||a.midi-b.midi);}
export class Accompaniment{
 constructor(audio){this.audio=audio;this.tracks=new Map();this.enabled=true;this.focused=true;audio.accompany=(n,t,d)=>this.note(n,t,d);audio.startStems=s=>this.startStems(s);}
 load(parts){for(const t of this.tracks.values())t.bus?.disconnect();this.tracks=new Map(parts.map(p=>[p.id,{id:p.id,name:p.name,type:family(p),program:p.program??0,drum:!!p.percussion,sound:isChoralVoice(p)?'voice':defaultInstrument(p)==='piano'?keyboardSound(p):undefined,label:instrumentLabel({...p,sound:isChoralVoice(p)?'voice':defaultInstrument(p)==='piano'?keyboardSound(p):undefined}),volume:.45,muted:false,solo:false,buffer:null,fileName:'',bus:null}]));this.selected=null;}
 audible(t){const solo=[...this.tracks.values()].some(x=>x.id!==this.selected&&x.solo);return this.enabled&&t.id!==this.selected&&!t.muted&&(!solo||t.solo);}
 bus(t){if(!t.bus){t.bus=this.audio.ctx.createGain();t.bus.connect(this.audio.out);}return t.bus;}
 effectiveVolume(t){return this.audible(t)?t.volume*(this.focused?.35:1):0;}
 update(){for(const t of this.tracks.values())if(t.bus)t.bus.gain.setValueAtTime(this.effectiveVolume(t),this.audio.ctx.currentTime);}
 hasStems(){return [...this.tracks.values()].some(t=>t.id!==this.selected&&t.buffer);}
 async setFile(id,file){if(file.size>64*1024*1024)throw Error('El audio supera 64 MB. Usa MP3 o un archivo más corto.');await this.audio.init();const buffer=await this.audio.ctx.decodeAudioData(await file.arrayBuffer());let bytes=buffer.length*buffer.numberOfChannels*4;for(const t of this.tracks.values())if(t.id!==id&&t.buffer)bytes+=t.buffer.length*t.buffer.numberOfChannels*4;if(bytes>256*1024*1024)throw Error('El audio decodificado supera 256 MB. Quita otras pistas o usa una mezcla única.');const t=this.tracks.get(id);t.buffer=buffer;t.fileName=file.name;}
 startStems(s){for(const t of this.tracks.values()){if(!t.buffer||t.id===this.selected||!this.audible(t))continue;const pos=Math.max(0,s.position),offset=s.seconds(0,pos);if(offset>=t.buffer.duration)continue;const source=this.audio.ctx.createBufferSource();source.buffer=t.buffer;source.connect(this.bus(t));this.update();const at=s.anchorTime+s.seconds(s.anchorBeat,pos),now=this.audio.ctx.currentTime,late=Math.max(0,now-at);if(offset+late>=t.buffer.duration)continue;source.start(Math.max(now,at),offset+late);this.audio.voices.add(source);source.onended=()=>{this.audio.voices.delete(source);source.disconnect();};}}
 note(n,when,duration){const t=this.tracks.get(n.trackId);if(!t||t.buffer||!this.audible(t))return;if(this.audio.chimera?.enabled&&this.audio.chimera.records.get(t.id)?.active)return;const bus=this.bus(t);this.update();this.audio.samples.play(t,n,when,duration,bus);}
}
