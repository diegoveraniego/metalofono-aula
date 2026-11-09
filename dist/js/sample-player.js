// Banco y sampler idénticos a Compas.html, distribuidos junto a la app para uso offline.
import '../vendor/compas-samples.js';
import '../vendor/compas-sampler.js';
export const sampler=globalThis.CompasSampler;
export const sampleBank=globalThis.CompasSamples;
export function instrumentLabel(part){return sampleBank.instruments[sampler.soundFor({...part,drum:part.percussion??part.drum})]?.label??'Instrumento';}
export function bellFilterSpec(midi,sampleRate=44100){return {cutoff:Math.min(sampleRate*.45,2*440*2**((midi-69)/12)),q:Math.SQRT1_2,count:2};}
export class SamplePlayer{
 constructor(context,nodes){this.context=context;this.nodes=nodes;this.buses=new Map();this.sampleBuffers=sampler.buffers(context);this.chokes=new Map();}
 play(track,note,when,duration,bus){
  if(note.drumGain===0)return false;
  const filters=[];if(track.emphasizeFundamental&&sampler.soundFor(track)==='bells'){const spec=bellFilterSpec(note.midi,this.context.sampleRate);for(let i=0;i<spec.count;i++){const f=this.context.createBiquadFilter();f.type='lowpass';f.frequency.value=spec.cutoff;f.Q.value=spec.q;if(filters.length)filters.at(-1).connect(f);filters.push(f);}filters.at(-1).connect(bus);}
  this.buses.set(track.id,filters[0]??bus);const played=sampler.play(this,track,{pitch:note.midi,velocity:(note.velocity??.75)*(note.drumGain??1)},when,Math.max(.02,duration));this.buses.set(track.id,bus);
  if(filters.length){if(played){const source=[...this.nodes].at(-1),cleanup=source.onended;source.onended=(...args)=>{try{cleanup?.(...args);}finally{filters.forEach(f=>f.disconnect());}};}else filters.forEach(f=>f.disconnect());}return played;
 }
 clear(){this.chokes.clear();}
}
