// Banco y sampler idénticos a Compas.html, distribuidos junto a la app para uso offline.
import '../vendor/compas-samples.js';
import '../vendor/compas-sampler.js';
export const sampler=globalThis.CompasSampler;
export const sampleBank=globalThis.CompasSamples;
export function instrumentLabel(part){return sampleBank.instruments[sampler.soundFor({...part,drum:part.percussion??part.drum})]?.label??'Instrumento';}
export class SamplePlayer{
 constructor(context,nodes){this.context=context;this.nodes=nodes;this.buses=new Map();this.sampleBuffers=sampler.buffers(context);this.chokes=new Map();}
 play(track,note,when,duration,bus){this.buses.set(track.id,bus);return sampler.play(this,track,{pitch:note.midi,velocity:note.velocity??.75},when,Math.max(.02,duration));}
 clear(){this.chokes.clear();}
}
