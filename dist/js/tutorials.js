import {defaultInstrument,instrumentConfig,partDisplayName} from './instruments.js';
import {transformed,clamp} from './model.js';
import {guitarNotes,guitarHarmonies} from './guitar.js';
import {bassNotes} from './bass.js';
import {drumNotes,drumLanes} from './drums.js';
import {vocalPhrases,vocalPitchRange,vocalPhraseNotes} from './vocals.js';
export function prepareTutorial(parts,index,{prefs={},opts={},pitchSource='written',drumMappings={},drumMix={}}={}){
 const original=parts[index],instrument=defaultInstrument(original),config=instrumentConfig(instrument),pref=prefs[instrument]??{},base=clamp(pref.base??config.base,0,config.maxBase),octave=Number(pref.octave??0),semitones=Number(pref.semitones??0);
 let notes=instrument==='bateria'?drumNotes(original.notes,drumMappings[original.id],drumMix[original.id]):transformed(original,octave,semitones,instrument==='metalofono'?pref.mode??'upper':'all',pitchSource);
 notes=notes.filter(n=>n.midi>=base&&n.midi<=base+config.span);
 if(instrument==='guitarra')notes=guitarNotes(notes,octave*12+semitones);
 if(instrument==='bajo')notes=bassNotes(notes,original);
 const part=instrument==='guitarra'?{...original,harmonies:guitarHarmonies(parts,original)}:original;
 const name=partDisplayName(parts,index),options={...opts,instrument,base,cascade:pref.cascade??['piano','metalofono'].includes(instrument),partUnavailable:false,maxDuration:notes.reduce((max,n)=>Math.max(max,n.duration),.2),teacher:name+(opts.teacher?' · '+opts.teacher:'')};
 if(instrument==='voz'){options.vocalPartName=name;options.vocalPhrases=vocalPhrases(part.lyrics,notes);options.vocalNotes=notes;options.vocalRange=vocalPitchRange(notes);options.vocalPages=options.vocalPhrases.map(p=>vocalPhraseNotes(p,notes));}
 if(instrument==='bateria')options.drumLanes=drumLanes(notes);
 return {part,notes,opts:options,name};
}
