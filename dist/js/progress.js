// Coordenadas musicales compartidas por la barra HTML y el canvas exportado.
export function structureSegments(part,sections){
 const segments=[];let next=1;
 const push=(s,from,to)=>{if(from>to)return;const a=part.measures[from-1],b=part.measures[to-1];if(!a||!b)return;segments.push({id:s?.id??`gap-${from}`,name:s?.name??'Sin sección',color:s?.color??'#68766e',gap:!s,startMeasure:from,endMeasure:to,start:a.start,end:b.start+b.duration});};
 for(const s of [...sections].sort((a,b)=>a.startMeasure-b.startMeasure)){push(null,next,s.startMeasure-1);push(s,s.startMeasure,s.endMeasure);next=s.endMeasure+1;}
 push(null,next,part.measures.length);return segments;
}
export function segmentProgress(segment,beat){return Math.max(0,Math.min(1,(beat-segment.start)/(segment.end-segment.start)));}
export function segmentAt(segments,beat){if(beat<0)return segments[0];return segments.find(s=>beat>=s.start&&beat<s.end)??segments.at(-1);}
export function contrastColor(hex){const rgb=hex.replace('#','').match(/../g).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#11251c':'#ffffff';}

export function measureRangeLabel(start,end,availableWidth=Infinity,measureText=()=>0){const range=start===end?String(start):`${start}–${end}`;const full=`Compás ${range}`;return measureText(full)<=availableWidth?full:`cc. ${range}`;}
