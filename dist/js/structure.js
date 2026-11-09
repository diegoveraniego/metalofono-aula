// Tonos de estructura suaves, separados de los colores de altura del instrumento.
export const SECTION_COLORS=['#b9ccc0','#b7c7d6','#a4bbaa','#c6b8ce','#d6bb9b','#d3c79f'];
export function sectionFamily(name){const n=name.trim().toLowerCase();return /intro|outro|final/.test(n)?0:/pre[- ]?(verso|estrofa)/.test(n)?1:/solo/.test(n)?4:/estrofa|verso/.test(n)?2:/estribillo|coro/.test(n)?3:5;}
export function sectionColor(name){return SECTION_COLORS[sectionFamily(name)];}
function migratePalette(sections){const legacy=['#c94343','#326ac7','#31805c','#9361b8','#b45d26','#ac7c24'];return sections.map(s=>s.color.toLowerCase()===legacy[sectionFamily(s.name)]?{...s,color:sectionColor(s.name)}:s);}
export function sectionsFromMarks(marks,max){const unique=[...new Map((marks||[]).filter(m=>Number.isInteger(m.startMeasure)&&m.startMeasure>=1&&m.startMeasure<=max&&m.name?.trim()).map(m=>[m.startMeasure,m])).values()].sort((a,b)=>a.startMeasure-b.startMeasure);return unique.map((m,i)=>({id:'mark-'+m.startMeasure,name:m.name.trim(),startMeasure:m.startMeasure,endMeasure:unique[i+1]?unique[i+1].startMeasure-1:max,color:sectionColor(m.name)}));}
export function normalizeStructure(data){if(!data||!Array.isArray(data.sections))return data;if(data.version===1&&data.sections.every(s=>s.startMeasure!==undefined))return data;if(!data.sections.every(s=>s.start!==undefined&&s.end!==undefined))return data;return {version:1,sections:data.sections.map((s,i)=>({id:String(s.id??'compas-'+i),name:s.name,startMeasure:s.startMeasure??s.start,endMeasure:s.endMeasure??s.end,color:s.color??sectionColor(s.name||'')}))};}
export function validateStructure(data,max){if(data.version!==1||!Array.isArray(data.sections))throw Error('JSON de estructura no válido (versión 1).');const sections=data.sections.map((s,i)=>{if(typeof s.name!=='string'||!s.name.trim()||s.name.length>100||!Number.isInteger(s.startMeasure)||!Number.isInteger(s.endMeasure)||s.startMeasure<1||s.endMeasure<s.startMeasure||s.endMeasure>max||!/^#[0-9a-f]{6}$/i.test(s.color))throw Error('Revisa nombres, colores y límites de las secciones.');return {id:String(s.id||i),name:s.name,startMeasure:s.startMeasure,endMeasure:s.endMeasure,color:s.color};}).sort((a,b)=>a.startMeasure-b.startMeasure);for(let i=1;i<sections.length;i++)if(sections[i].startMeasure<=sections[i-1].endMeasure)throw Error('Las secciones no pueden solaparse.');return sections;}
export class Structure{
 constructor(onwarning){this.onwarning=onwarning;this.sections=[];}
 load(key,max,defaults=[]){this.key='metalofono.structure.'+key;this.max=max;try{const saved=localStorage.getItem(this.key);this.sections=saved?migratePalette(validateStructure(JSON.parse(saved),max)):defaults;}catch{this.sections=defaults;this.onwarning?.('No se pudo recuperar el autoguardado. Puedes guardar un JSON.');}}
 save(){try{localStorage.setItem(this.key,JSON.stringify(this.json()));}catch{this.onwarning?.('El navegador no permite autoguardar. Guarda la estructura en JSON.');}}
 json(){return {version:1,scoreKey:this.key,sections:this.sections};}
 replace(data){this.sections=migratePalette(validateStructure(normalizeStructure(data),this.max));this.save();}
 add(section){this.replace({version:1,sections:[...this.sections,section]});}
 remove(id){this.sections=this.sections.filter(s=>s.id!==id);this.save();}
 at(measure){return this.sections.find(s=>s.startMeasure<=measure&&s.endMeasure>=measure);}
 next(measure){return this.sections.find(s=>s.startMeasure>measure);}
}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
