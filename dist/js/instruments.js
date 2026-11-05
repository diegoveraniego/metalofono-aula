export const INSTRUMENTS={
 metalofono:{name:'Metalófono',span:24,keys:25,base:55,maxBase:103},
 piano:{name:'Piano',span:48,keys:49,base:36,maxBase:79}
};
export function instrumentConfig(type){return INSTRUMENTS[type]??INSTRUMENTS.metalofono;}
export function matchesInstrument(part,type){
 if(part.percussion)return false;const name=part.name.toLowerCase(),program=part.program;
 if(type==='piano'){if(/teclado|piano|sinte|synth|keyboard|organ|órgano|rhodes|clavi/.test(name))return true;if(/metal[oó]fono|glock|campana|guitarra|guitar|bajo|bass|voz|vocal|bater[ií]a/.test(name))return false;return Number.isInteger(program)&&(program>=0&&program<=7||program>=16&&program<=23||program>=80&&program<=103);}
 return /metal[oó]fono|glock|xil[oó]fono/.test(name)||Number.isInteger(program)&&program>=8&&program<=15;
}
export function detectedParts(parts,type){return parts.map((part,index)=>({part,index})).filter(({part})=>matchesInstrument(part,type));}
export function pianoLayout(base=36){
 const naturals=[],alterations=[];for(let midi=base;midi<=base+48;midi++)([1,3,6,8,10].includes(midi%12)?alterations:naturals).push(midi);
 const step=1452/naturals.length,keys=naturals.map((midi,i)=>({midi,x:74+i*step,y:335,w:step-2,h:305,sharp:false}));
 for(const midi of alterations){const lower=keys.filter(k=>!k.sharp&&k.midi<midi).at(-1),upper=keys.find(k=>!k.sharp&&k.midi>midi),w=step*.62;const center=lower&&upper?(lower.x+step):lower?lower.x+step:upper.x;keys.push({midi,x:Math.max(74,Math.min(1526-w,center-w/2)),y:335,w,h:187,sharp:true});}
 return keys;
}

export function partDisplayName(parts,index){const name=parts[index].name;const peers=parts.map((p,i)=>p.name===name?i:-1).filter(i=>i>=0);return peers.length>1?`${name} ${peers.indexOf(index)+1}`:name;}
