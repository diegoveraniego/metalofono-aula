export const INSTRUMENTS={
 bajo:{name:'Bajo',span:127,keys:0,base:0,maxBase:0},
 bateria:{name:'Batería',span:127,keys:0,base:0,maxBase:0},
 voz:{name:'Voz',span:127,keys:0,base:0,maxBase:0},
 guitarra:{name:'Guitarra',span:48,keys:49,base:40,maxBase:79},
 metalofono:{name:'Metalófono',span:24,keys:25,base:55,maxBase:103},
 piano:{name:'Piano',span:48,keys:49,base:36,maxBase:79}
};
export function instrumentConfig(type){return INSTRUMENTS[type]??INSTRUMENTS.metalofono;}
export function isChoralVoice(part){return /soprano|contralto|\balto\b|tenor|bar[ií]tono|bajo coral|bass voice/i.test(part.name)||!!part.lyrics?.length&&part.program>=52&&part.program<=54;}
export function matchesInstrument(part,type){
 const name=part.name.toLowerCase(),program=part.program;if(type==='bateria')return !!part.percussion;if(part.percussion)return false;
 if(type==='bajo')return !isChoralVoice(part)&&(/bajo|bass/.test(name)||Number.isInteger(program)&&program>=32&&program<=39);
 if(type==='voz'){if(isChoralVoice(part))return true;if(/voz|vocal|voice|coro|choir|cant[oa]/.test(name))return true;if(/metal[oó]fono|glock|xil[oó]fono|piano|teclado|sinte|synth|guitarra|guitar|bajo|bass/.test(name))return false;return !!part.lyrics?.length;}
 if(type==='guitarra')return /guitarra|guitar/.test(name)||Number.isInteger(program)&&program>=24&&program<=31;
 if(type==='piano'){if(/teclado|piano|sinte|synth|keyboard|organ|órgano|rhodes|clavi/.test(name))return true;if(/metal[oó]fono|glock|campana|guitarra|guitar|bajo|bass|voz|vocal|bater[ií]a/.test(name))return false;return Number.isInteger(program)&&(program>=0&&program<=7||program>=16&&program<=23||program>=80&&program<=103);}
 return /metal[oó]fono|glock|xil[oó]fono/.test(name)||Number.isInteger(program)&&program>=8&&program<=15;
}
// Nombres explícitos antes que programas MIDI genéricos; percusión siempre separada.
export function defaultInstrument(part){
 const name=part.name.toLowerCase();
 if(part.percussion)return 'bateria';
 if(isChoralVoice(part))return 'voz';
 if(/voz|vocal|voice|coro|choir|cant[oa]/.test(name))return 'voz';
 if(/bajo|bass/.test(name))return 'bajo';
 if(/guitarra|guitar/.test(name))return 'guitarra';
 if(/metal[oó]fono|glock|xil[oó]fono/.test(name))return 'metalofono';
 if(/teclado|piano|sinte|synth|keyboard|organ|órgano/.test(name))return 'piano';
 return ['voz','bajo','guitarra','metalofono','piano'].find(type=>matchesInstrument(part,type))??'piano';
}
export function detectedParts(parts,type){return parts.map((part,index)=>({part,index})).filter(({part})=>matchesInstrument(part,type));}
export function pianoLayout(base=36){
 const naturals=[],alterations=[];for(let midi=base;midi<=base+48;midi++)([1,3,6,8,10].includes(midi%12)?alterations:naturals).push(midi);
 const step=1452/naturals.length,keys=naturals.map((midi,i)=>({midi,x:74+i*step,y:335,w:step-2,h:305,sharp:false}));
 for(const midi of alterations){const lower=keys.filter(k=>!k.sharp&&k.midi<midi).at(-1),upper=keys.find(k=>!k.sharp&&k.midi>midi),w=step*.62;const center=lower&&upper?(lower.x+step):lower?lower.x+step:upper.x;keys.push({midi,x:Math.max(74,Math.min(1526-w,center-w/2)),y:335,w,h:187,sharp:true});}
 return keys;
}

export function partDisplayName(parts,index){const name=parts[index].name;const peers=parts.map((p,i)=>p.name===name?i:-1).filter(i=>i>=0);return peers.length>1?`${name} ${peers.indexOf(index)+1}`:name;}
