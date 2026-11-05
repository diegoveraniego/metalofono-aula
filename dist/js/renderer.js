import {pianoLayout} from './instruments.js';
import {noteName,measureAt,clamp} from './model.js';
import {structureSegments,segmentProgress,segmentAt,contrastColor,measureRangeLabel} from './progress.js';
// Do azul; Re verde; Mi amarillo; Fa naranjo; Sol rojo; La morado; Si celeste.
// Las cinco alteraciones comparten un azul más claro que Do, sin matiz celeste.
export const PALETTE=['#7b91bb','#a8b6d5','#a1bc90','#a8b6d5','#e4cd7a','#dfa270','#a8b6d5','#d68079','#a8b6d5','#a28abc','#a8b6d5','#94c3d1'];
function rr(ctx,x,y,w,h,r=8){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.width=1600;this.height=900;canvas.width=this.width;canvas.height=this.height;this.opts={instrument:'metalofono',maxDuration:.2,base:55,latin:true,middle:4,scheme:'color',custom:[...PALETTE],anticipation:1,anticipationUnit:'beats',cascade:false,title:'Himno a la Alegría',teacher:'',showStructure:true};}
 layout(){if(this.opts.instrument==='piano')return pianoLayout(this.opts.base);const {base}=this.opts;const naturals=[],sharps=[];for(let midi=base;midi<=base+24;midi++)([1,3,6,8,10].includes(midi%12)?sharps:naturals).push(midi);const step=1440/naturals.length,w=step*.84,keys=[];naturals.forEach((m,i)=>keys.push({midi:m,x:80+i*step,y:411,w,h:245-(m-base)*3.4,sharp:false}));for(const m of sharps){const lower=keys.filter(k=>!k.sharp&&k.midi<m).at(-1),upper=keys.find(k=>!k.sharp&&k.midi>m);const x=lower&&upper?(lower.x+upper.x)/2+w*.105:lower?lower.x+step/2:upper.x-step/2;keys.push({midi:m,x,y:225,w:w*.79,h:168-(m-base)*1.7,sharp:true});}return keys;}
 hitKey(x,y){return [...this.layout()].reverse().find(k=>x>=k.x&&x<=k.x+k.w&&y>=k.y&&y<=k.y+k.h);}
 timelineHit(x,y){return this.timelineRegions?.find(r=>x>=r.left&&x<=r.right&&y>=757&&y<=840)?.segment;}
 drawTimeline(beat,part,structure,ink){
  const c=this.ctx,segments=structureSegments(part,structure.sections),active=segmentAt(segments,beat);this.timelineRegions=[];if(!active)return;
  const widths=segments.map(s=>Math.max(190,(s.end-s.start)*13)),total=widths.reduce((a,b)=>a+b,0),scale=total<1470?1470/total:1;let activeLeft=0;for(let i=0;i<segments.indexOf(active);i++)activeLeft+=widths[i]*scale;
  const activeWidth=widths[segments.indexOf(active)]*scale,offset=Math.max(0,Math.min(total*scale-1470,activeLeft+activeWidth/2-735));
  c.save();c.beginPath();c.rect(65,755,1470,90);c.clip();let left=65-offset;
  segments.forEach((s,i)=>{const width=widths[i]*scale,right=left+width;if(right>=65&&left<=1535){c.fillStyle=s.color;rr(c,left+2,763,width-4,72,7);c.fill();const progress=segmentProgress(s,beat);c.fillStyle='rgba(0,0,0,.13)';rr(c,left+2,763,Math.max(0,(width-4)*progress),72,7);c.fill();if(s===active&&beat>=0){c.strokeStyle=ink;c.lineWidth=3;rr(c,left+3,764,width-6,70,7);c.stroke();}
   c.save();c.beginPath();c.rect(left+12,769,width-24,60);c.clip();c.fillStyle=contrastColor(s.color);c.textAlign='left';c.font='600 20px system-ui';let label=s.name;while(label.length>1&&c.measureText(label).width>width-28)label=label.slice(0,-2)+'…';c.fillText(label,left+14,790);c.font='16px system-ui';c.fillText(measureRangeLabel(s.startMeasure,s.endMeasure,width-28,t=>c.measureText(t).width),left+14,817);c.restore();this.timelineRegions.push({left:Math.max(65,left),right:Math.min(1535,right),segment:s});}left=right;});
  const cursor=65+activeLeft-offset+segmentProgress(active,beat)*activeWidth;c.strokeStyle='#11251c';c.lineWidth=3;c.beginPath();c.moveTo(cursor,756);c.lineTo(cursor,842);c.stroke();c.restore();
 }
 drawPiano(beat,keys,notes,anticipation){
  const c=this.ctx,o=this.opts;c.fillStyle='#e2e2d7';rr(c,61,320,1478,334,13);c.fill();
  for(const k of keys){const active=notes.some(n=>n.midi===k.midi&&beat>=n.start&&beat<n.start+n.duration);c.fillStyle=k.sharp?'#242b29':'#fffefa';c.shadowColor='rgba(24,44,34,.16)';c.shadowBlur=k.sharp?5:2;c.shadowOffsetY=k.sharp?4:2;rr(c,k.x,k.y,k.w,k.h,k.sharp?5:7);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle='rgba(35,61,53,.17)';c.lineWidth=1;c.stroke();
   if(active){c.fillStyle=k.sharp?'rgba(185,211,198,.25)':'rgba(130,172,150,.2)';rr(c,k.x+1,k.y+1,k.w-2,k.h-2,5);c.fill();c.strokeStyle=k.sharp?'#b9ccc0':'#5c8a73';c.lineWidth=3;c.stroke();}
   c.fillStyle=k.sharp?'#f4f6f0':'#122d28';c.textAlign='center';c.font=`600 ${k.sharp?12:17}px system-ui`;c.fillText(noteName(k.midi,o.latin,o.middle),k.x+k.w/2,k.y+k.h-(k.sharp?17:22),k.w-6);
  }
  for(const n of notes){const delta=n.start-beat;if(delta>anticipation||delta<-.3)continue;const k=keys.find(k=>k.midi===n.midi);if(!k)continue;const progress=clamp(1-delta/Math.max(.01,anticipation),0,1),x=k.x+k.w/2,y=k.y+22-(1-progress)*110,fade=delta<0?clamp(1+delta/.3,0,1):.25+.75*progress;const color='#7a9e8b';
   c.save();c.globalAlpha=fade;const gradient=c.createLinearGradient(x,y-48,x,y);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(1,color);c.fillStyle=gradient;rr(c,x-5,y-48,10,48,5);c.fill();c.fillStyle='#fffefa';c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fill();c.stroke();c.restore();
  }
 }
 draw(beat,part,notes,structure,scheduler){const c=this.ctx,o=this.opts,bg='#f8f7f2',ink='#233d35',muted='#728078';c.fillStyle=bg;c.fillRect(0,0,1600,900);c.textAlign='left';c.fillStyle=muted;c.font='600 17px system-ui';c.fillText(o.instrument==='piano'?'PIANO / AULA':'METALÓFONO / AULA',65,52);c.fillStyle=ink;c.font='600 31px system-ui';c.fillText(o.title.slice(0,65),65,98);if(o.teacher){c.fillStyle=muted;c.font='19px system-ui';c.fillText(o.teacher.slice(0,75),65,130);}
 const m=measureAt(part,beat),section=structure.at(m.number),next=structure.next(m.number);c.textAlign='right';c.fillStyle=ink;c.font='600 25px system-ui';c.fillText('Ahora: '+(section?.name||'Sin sección'),1535,70);c.fillStyle=muted;c.font='20px system-ui';c.fillText('Sigue: '+(next?.name||'Final'),1535,105);
 const keys=this.layout(),anticipation=o.anticipationUnit==='ms'?o.anticipation/1000*scheduler.tempoAt(beat)*scheduler.speed/60:o.anticipation;
 let lo=0,hi=notes.length;while(lo<hi){const mid=(lo+hi)>>1;if(notes[mid].start<beat-(o.instrument==='piano'?Math.max(.2,o.maxDuration):.2))lo=mid+1;else hi=mid;}let stop=lo;const horizon=Math.max(o.cascade?8:0,anticipation);while(stop<notes.length&&notes[stop].start<=beat+horizon)stop++;notes=notes.slice(lo,stop);
 if(o.cascade){for(const n of notes){const k=keys.find(k=>k.midi===n.midi),delta=n.start-beat;if(!k||delta<-.15||delta>8)continue;c.globalAlpha=.5;c.fillStyle=o.scheme==='mono'?'#71958a':o.custom[n.midi%12];const y=200-(delta/8)*140;rr(c,k.x,y,k.w,Math.max(7,Math.min(40,n.duration*15)),4);c.fill();}c.globalAlpha=1;}
 if(o.instrument==='piano')this.drawPiano(beat,keys,notes,anticipation);else {
 c.fillStyle='#e2e2d7';rr(c,57,458,1486,49,15);c.fill();rr(c,57,594,1486,27,10);c.fill();
 for(const k of keys){const n=notes.find(n=>n.midi===k.midi&&beat>=n.start&&beat<n.start+.19);const color=o.scheme==='mono'?(k.sharp?'#6c9188':'#a5bfb1'):o.custom[k.midi%12];c.shadowColor='rgba(24,44,34,.13)';c.shadowBlur=6;c.shadowOffsetY=5;c.fillStyle=color;rr(c,k.x,k.y,k.w,k.h,10);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;if(n){c.fillStyle='rgba(255,255,255,.65)';rr(c,k.x-3,k.y-3,k.w+6,k.h+6,12);c.fill();c.strokeStyle='#fff';c.lineWidth=3;c.stroke();}c.fillStyle='rgba(30,50,45,.35)';c.beginPath();c.arc(k.x+k.w/2,k.y+18,4,0,Math.PI*2);c.fill();c.fillStyle='#122d28';c.font=`600 ${k.sharp?18:22}px system-ui`;c.textAlign='center';const label=noteName(k.midi,o.latin,o.middle);c.fillText(label,k.x+k.w/2,k.y+k.h-24);}
 for(let hand=0;hand<2;hand++){const n=notes.find(n=>n.hand===hand&&n.start>=beat-.17&&n.start<=beat+anticipation);if(!n)continue;const k=keys.find(k=>k.midi===n.midi);if(!k)continue;const progress=clamp(1-(n.start-beat)/Math.max(.01,anticipation),0,1),x=k.x+k.w/2,y=k.y+50-(1-progress)*86,after=Math.max(0,beat-n.start);c.globalAlpha=(.18+.82*progress)*(1-after/.17);c.save();c.translate(x,y);c.rotate(hand===0?-.22:.22);c.strokeStyle=hand===0?'#614d34':'#516d83';c.lineWidth=11;c.lineCap='round';c.beginPath();c.moveTo(0,-100);c.lineTo(0,0);c.stroke();c.fillStyle=hand===0?'#f2d9a0':'#b0d5ed';c.strokeStyle=hand===0?'#785b34':'#456a83';c.lineWidth=3;c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#243b34';c.font='bold 16px system-ui';c.textAlign='center';c.fillText(hand===0?'I':'D',0,6);c.restore();c.globalAlpha=1;}
 }
 c.fillStyle=muted;c.font='18px system-ui';c.textAlign='right';c.fillText(beat<0?'Cuenta previa':`Compás ${m.number} / ${part.measures.length}`,1535,711);
 const unit=4/(scheduler.manualMeter?scheduler.denominator:m.denominator),pulse=Math.floor(Math.max(0,beat-(scheduler.manualMeter?0:m.start))/unit),count=scheduler.manualMeter?scheduler.numerator:m.numerator;c.textAlign='center';for(let i=0;i<Math.min(16,count);i++){c.beginPath();c.fillStyle=i===pulse%count?'#d18c4c':'#dce3d8';c.arc(800+(i-(Math.min(16,count)-1)/2)*25,706,i===pulse%count?6:4,0,Math.PI*2);c.fill();}
 if(beat<0){c.fillStyle=ink;c.font='600 40px system-ui';c.fillText('Prepárate · '+Math.ceil(-beat/unit),800,175);}
 if(o.showStructure)this.drawTimeline(beat,part,structure,ink);else this.timelineRegions=[];
 }
}
