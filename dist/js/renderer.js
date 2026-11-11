import {drawAlphaScore} from './alpha-score.js';
import {drawStringScore} from './string-score.js';
import {drawChimera} from './chimera-view.js';
import {drawPulseIndicator,wholeBars} from './rhythm.js';
import {drawPianoScore,spellingAt} from './piano-score.js';
import {visualTheme,styledContext,musicalPalette,sectionFillColor,themedSections} from './appearance.js';
import {drawBass} from './bass.js';
import {drawDrums} from './drums.js';
import {drawVocals,drawVocalEnsemble,vocalEnsemble} from './vocals.js';
import {drawGuitar} from './guitar.js';
import {pianoLayout} from './instruments.js';
import {noteName,measureAt,clamp} from './model.js';
import {structureSegments,segmentProgress,segmentAt,contrastColor,measureRangeLabel} from './progress.js';
// Do azul; Re verde; Mi amarillo; Fa naranjo; Sol rojo; La morado; Si celeste.
// Las cinco alteraciones comparten un azul más claro que Do, sin matiz celeste.
export const PALETTE=['#7b91bb','#a8b6d5','#a1bc90','#a8b6d5','#e4cd7a','#dfa270','#a8b6d5','#d68079','#a8b6d5','#a28abc','#a8b6d5','#94c3d1'];
export const PIANO_CLEF_COLORS={G:'#a28abc',F:'#dfa270',unknown:'#b7c7d6'};
export function cascadeColor(note,opts){const music=musicalPalette(opts);return opts.instrument==='piano'?(music.hands[note.clef]??music.hands.unknown):opts.scheme==='mono'?visualTheme(opts).accent:music.notes[note.midi%12];}
function drawPianoHand(ctx,x,y,color,left=false){
 ctx.save();ctx.translate(x,y);if(left)ctx.scale(-1,1);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=6;ctx.lineCap='round';
 for(const [finger,height]of [[-8,-12],[-2,-18],[4,-16],[10,-10]]){ctx.beginPath();ctx.moveTo(finger,1);ctx.lineTo(finger,height);ctx.stroke();}
 rr(ctx,-11,-3,24,21,7);ctx.fill();ctx.beginPath();ctx.moveTo(-9,9);ctx.lineTo(-20,-1);ctx.stroke();ctx.restore();
}
export function cascadeGeometry(delta,duration=1,instrument='metalofono'){
 const top=160,line=instrument==='piano'?335:345,horizon=8,height=clamp(duration*(line-top)/horizon,7,30),bottom=line-delta/horizon*(line-top);
 return {top,line,horizon,height,y:bottom-height,bottom};
}
function rr(ctx,x,y,w,h,r=8){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=styledContext(canvas.getContext('2d'),()=>this.opts?.appearance);this.width=1600;this.height=900;canvas.width=this.width;canvas.height=this.height;this.opts={instrument:'metalofono',stringVisualization:'score',maxDuration:.2,base:55,latin:true,middle:4,scheme:'color',custom:[...PALETTE],anticipation:1,anticipationUnit:'beats',cascade:false,showCascadeNoteNames:false,title:'Himno a la Alegría',teacher:'',showStructure:true,showVocalNoteNames:false,pulseStyle:'dots',showPianoScore:false,noteSpelling:'auto'};}
 layout(){if(['guitarra','voz','bajo','bateria'].includes(this.opts.instrument))return [];if(this.opts.instrument==='piano')return pianoLayout(this.opts.base);const {base}=this.opts;const naturals=[],sharps=[];for(let midi=base;midi<=base+24;midi++)([1,3,6,8,10].includes(midi%12)?sharps:naturals).push(midi);const step=1440/naturals.length,w=step*.84,keys=[];naturals.forEach((m,i)=>keys.push({midi:m,x:80+i*step,y:411,w,h:245-(m-base)*3.4,sharp:false}));for(const m of sharps){const lower=keys.filter(k=>!k.sharp&&k.midi<m).at(-1),upper=keys.find(k=>!k.sharp&&k.midi>m);const x=lower&&upper?(lower.x+upper.x)/2+w*.105:lower?lower.x+step/2:upper.x-step/2;keys.push({midi:m,x,y:225,w:w*.79,h:168-(m-base)*1.7,sharp:true});}if(this.opts.cascade)for(const key of keys){key.y=375+(key.y-225)*.66;key.h*=.66;}return keys;}
 hitKey(x,y){return [...this.layout()].reverse().find(k=>x>=k.x&&x<=k.x+k.w&&y>=k.y&&y<=k.y+k.h);}
 timelineHit(x,y){return this.timelineRegions?.find(r=>x>=r.left&&x<=r.right&&y>=757&&y<=840)?.segment;}
 drawTimeline(beat,part,structure,ink,width=1600){
  const viewportWidth=width-130;const c=this.ctx,t=visualTheme(this.opts),segments=structureSegments(part,structure.sections).map(s=>({...s,color:sectionFillColor(s,this.opts)})),active=segmentAt(segments,beat);this.timelineRegions=[];if(!active)return;
  const widths=segments.map(s=>Math.max(190,(s.end-s.start)*13)),total=widths.reduce((a,b)=>a+b,0),scale=total<viewportWidth?viewportWidth/total:1;let activeLeft=0;for(let i=0;i<segments.indexOf(active);i++)activeLeft+=widths[i]*scale;
  const activeWidth=widths[segments.indexOf(active)]*scale,offset=Math.max(0,Math.min(total*scale-viewportWidth,activeLeft+activeWidth/2-(viewportWidth/2)));
  c.save();c.beginPath();c.rect(65,755,viewportWidth,90);c.clip();let left=65-offset;
  segments.forEach((s,i)=>{const width=widths[i]*scale,right=left+width;if(right>=65&&left<=viewportWidth+65){c.fillStyle=s.color;rr(c,left+2,763,width-4,72,7);c.fill();const progress=segmentProgress(s,beat);c.fillStyle='rgba(0,0,0,.13)';rr(c,left+2,763,Math.max(0,(width-4)*progress),72,7);c.fill();if(s===active&&beat>=0){c.strokeStyle=ink;c.lineWidth=3;rr(c,left+3,764,width-6,70,7);c.stroke();}
   c.save();c.beginPath();c.rect(left+12,769,width-24,60);c.clip();c.fillStyle=contrastColor(s.color);c.textAlign='left';c.font='600 20px system-ui';let label=s.name;while(label.length>1&&c.measureText(label).width>width-28)label=label.slice(0,-2)+'…';c.fillText(label,left+14,790);c.font='16px system-ui';c.fillText(measureRangeLabel(s.startMeasure,s.endMeasure,width-28,t=>c.measureText(t).width),left+14,817);c.restore();this.timelineRegions.push({left:Math.max(65,left),right:Math.min(viewportWidth+65,right),segment:s});}left=right;});
  const cursor=65+activeLeft-offset+segmentProgress(active,beat)*activeWidth;c.strokeStyle=t.ink;c.lineWidth=3;c.beginPath();c.moveTo(cursor,756);c.lineTo(cursor,842);c.stroke();c.restore();
 }
 drawCascade(beat,keys,notes){
  const c=this.ctx,o=this.opts,t=visualTheme(o),{top,line,horizon}=cascadeGeometry(0,1,o.instrument);
  c.save();c.fillStyle=t.soft;rr(c,65,top-7,1470,line-top+7,9);c.fill();
  c.beginPath();c.rect(65,top,1470,line-top+2);c.clip();
  for(const n of notes){
   const delta=n.start-beat,k=keys.find(k=>k.midi===n.midi);if(!k||delta<-.15||delta>horizon)continue;
   const box=cascadeGeometry(delta,n.duration,o.instrument),active=delta<=0;if(o.showCascadeNoteNames){box.height=Math.max(18,box.height);box.y=box.bottom-box.height;}
   c.globalAlpha=active?clamp(1+delta/.15,0,1):.8;
   c.fillStyle=cascadeColor(n,o);rr(c,k.x,box.y,k.w,box.height,4);c.fill();if(o.showCascadeNoteNames){c.save();c.beginPath();c.rect(k.x,box.y,k.w,box.height);c.clip();c.fillStyle=contrastColor(cascadeColor(n,o));c.textAlign='center';c.textBaseline='middle';c.font='600 13px system-ui';c.fillText(noteName(n.midi,o.latin,o.middle,o.displaySpelling),k.x+k.w/2,box.y+box.height/2,k.w-6);c.restore();}
   if(active){c.strokeStyle=t.accent;c.lineWidth=2;c.stroke();}
  }
  c.restore();c.save();c.strokeStyle=o.instrument==='piano'?t.line:t.accent;c.globalAlpha=o.instrument==='piano'?.35:1;c.lineWidth=o.instrument==='piano'?1:3;c.beginPath();c.moveTo(o.instrument==='piano'?74:65,line);c.lineTo(o.instrument==='piano'?1526:1535,line);c.stroke();c.globalAlpha=1;
  for(const n of notes){if(beat<n.start||beat-n.start>.15)continue;const k=keys.find(k=>k.midi===n.midi);if(!k)continue;c.fillStyle=t.warning;c.beginPath();c.arc(k.x+k.w/2,line,6,0,Math.PI*2);c.fill();}
  c.fillStyle=t.accent;c.textAlign='left';c.font='600 16px system-ui';c.fillText('TOCA AL LLEGAR A LA LÍNEA',65,o.instrument==='piano'?147:line+22);if(o.instrument==='piano'){const hands=musicalPalette(o).hands;drawPianoHand(c,1390,137,hands.F,true);drawPianoHand(c,1480,137,hands.G);}c.restore();
 }
 drawPiano(beat,keys,notes,anticipation){
  const c=this.ctx,o=this.opts,t=visualTheme(o);c.fillStyle=t.soft;rr(c,61,o.cascade?335:320,1478,o.cascade?319:334,13);c.fill();
  for(const k of keys){const activeNote=notes.find(n=>n.midi===k.midi&&beat>=n.start&&beat<n.start+n.duration),active=!!activeNote,color=active?cascadeColor(activeNote,o):null;const keyColor=active?color:k.sharp?(t.dark?t.bg:t.ink):(t.dark?t.ink:t.panel);c.fillStyle=keyColor;c.shadowColor='rgba(24,44,34,.16)';c.shadowBlur=k.sharp?5:2;c.shadowOffsetY=k.sharp?4:2;rr(c,k.x,k.y,k.w,k.h,k.sharp?5:7);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle='rgba(35,61,53,.17)';c.lineWidth=1;c.stroke();
   if(active){c.strokeStyle=color;c.lineWidth=3;rr(c,k.x+1,k.y+1,k.w-2,k.h-2,5);c.stroke();}
   c.fillStyle=contrastColor(keyColor);c.textAlign='center';c.font=`600 ${k.sharp?12:17}px system-ui`;c.fillText(noteName(k.midi,o.latin,o.middle,o.displaySpelling),k.x+k.w/2,k.y+k.h-(k.sharp?17:22),k.w-6);
  }
  if(o.cascade||o.showPianoScore)return;
  for(const n of notes){const delta=n.start-beat;if(delta>anticipation||delta<-.3)continue;const k=keys.find(k=>k.midi===n.midi);if(!k)continue;const progress=clamp(1-delta/Math.max(.01,anticipation),0,1),x=k.x+k.w/2,y=k.y+22-(1-progress)*110,fade=delta<0?clamp(1+delta/.3,0,1):.25+.75*progress;const color=cascadeColor(n,o);
   c.save();c.globalAlpha=fade;const gradient=c.createLinearGradient(x,y-48,x,y);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(1,color);c.fillStyle=gradient;rr(c,x-5,y-48,10,48,5);c.fill();c.fillStyle='#fffefa';c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fill();c.stroke();c.restore();
  }
 }
 draw(beat,part,notes,structure,scheduler){
 if(this.opts.instrument==='voz'&&!this.opts.vocalPortrait){
 const c=this.ctx,o=this.opts,t=visualTheme(o),width=900*this.canvas.width/this.canvas.height,edge=width-65,bar=measureAt(part,beat),section=structure.at(bar.number);c.save();c.scale(1600/width,1);c.fillStyle=t.bg;c.fillRect(0,0,width,900);c.fillStyle=t.muted;c.textAlign='left';c.font='600 17px system-ui';c.fillText('ADAPTACIONES / AULA · VOZ',65,52);c.fillStyle=t.ink;c.font='600 31px system-ui';c.fillText(o.title,65,98,Math.max(240,width-650));if(o.teacher){c.fillStyle=t.muted;c.font='19px system-ui';c.fillText(o.teacher,65,130,width-130);}
 const label='Ahora: '+(section?.name??'Sin sección'),color=section?sectionFillColor(section,o):t.soft;c.font='600 25px system-ui';const labelWidth=Math.min(600,c.measureText(label).width+36);c.fillStyle=color;rr(c,edge-labelWidth,39,labelWidth,45,10);c.fill();c.fillStyle=contrastColor(color);c.textAlign='right';c.fillText(label,edge-18,70,labelWidth-36);c.fillStyle=t.muted;c.font='20px system-ui';c.fillText('Sigue: '+(structure.next(bar.number)?.name??'Final'),edge,111);
 o.displaySpelling=spellingAt(part,beat,o,structure.sections);const options={...o,viewWidth:width,measures:part.measures,manualMeter:scheduler.manualMeter?{numerator:scheduler.numerator,denominator:scheduler.denominator}:null};if(o.vocalVisualization==='chimera')drawChimera(c,beat,part,options,scheduler);else if(o.vocalOverview)drawVocalEnsemble(c,beat,o.vocalEnsemble??[],options);else drawVocals(c,beat,o.vocalNotes??notes,o.vocalPhrases??[],options);
 c.fillStyle=t.muted;c.textAlign='right';c.font='18px system-ui';c.fillText(beat<0?'Cuenta previa':`Compás ${wholeBars(bar.number)} / ${part.measures.length}`,edge,711);drawPulseIndicator(c,beat,bar,scheduler,o,width/2,706);if(o.showStructure)this.drawTimeline(beat,part,structure,t.ink,width);else this.timelineRegions=[];c.restore();return;}
 if(this.opts.instrument==='voz'&&this.opts.vocalPortrait){const c=this.ctx,o=this.opts,t=visualTheme(o);c.save();c.scale(1600/900,900/1600);c.fillStyle=t.bg;c.fillRect(0,0,900,1600);c.fillStyle=t.muted;c.textAlign='left';c.font='600 17px system-ui';c.fillText('ADAPTACIONES / AULA · VOZ',45,45);c.fillStyle=t.ink;c.font='600 27px system-ui';c.fillText(o.title,45,90,810);
 const voices=o.vocalOverview?o.vocalEnsemble??[]:vocalEnsemble([{...part,notes:o.vocalNotes??notes}]);if(!o.vocalOverview&&voices[0])voices[0].colorIndex=o.vocalColorIndex??0;
 if(o.vocalVisualization==='chimera')drawChimera(c,beat,part,{...o,viewWidth:900},scheduler);else drawVocalEnsemble(c,beat,voices,{...o,measures:part.measures,vocalLayout:o.vocalOverview?o.vocalLayout:'shared'});const bar=measureAt(part,beat);drawPulseIndicator(c,beat,bar,scheduler,o,450,1475);c.fillStyle=t.muted;c.font='18px system-ui';c.fillText(`Compás ${wholeBars(bar.number)} / ${part.measures.length}`,45,1510);const section=structure.at(bar.number);if(section){c.fillStyle=sectionFillColor(section,o);rr(c,45,1530,810,40,8);c.fill();c.fillStyle=contrastColor(sectionFillColor(section,o));c.fillText(section.name,60,1557,780);}this.timelineRegions=[];c.restore();return;}
 const c=this.ctx,o=this.opts,t=visualTheme(o),bg=t.bg,ink=t.ink,muted=t.muted;c.fillStyle=bg;c.fillRect(0,0,1600,900);c.textAlign='left';c.fillStyle=muted;c.font='600 17px system-ui';c.fillText('ADAPTACIONES / AULA · '+(o.instrument==='bateria'?'BATERÍA':o.instrument==='bajo'?'BAJO':o.instrument==='voz'?'VOZ':o.instrument==='guitarra'?'GUITARRA':o.instrument==='piano'?'PIANO':'METALÓFONO'),65,52);c.fillStyle=ink;c.font='600 31px system-ui';c.fillText(o.title.slice(0,65),65,98);if(o.teacher){c.fillStyle=muted;c.font='19px system-ui';c.fillText(o.teacher.slice(0,75),65,130);}
 if(o.partUnavailable){c.textAlign='center';c.fillStyle=ink;c.font='600 28px system-ui';c.fillText('Esta partitura no contiene una parte de batería.',800,400);this.timelineRegions=[];return;}
 o.displaySpelling=spellingAt(part,beat,o,structure.sections);
 const m=measureAt(part,beat),section=structure.at(m.number),next=structure.next(m.number),currentLabel='Ahora: '+(section?.name||'Sin sección'),sectionColor=section?sectionFillColor(section,o):t.soft;
 c.textAlign='right';c.font='600 25px system-ui';const labelWidth=Math.min(600,(c.measureText(currentLabel)?.width??currentLabel.length*14)+36);
 c.fillStyle=sectionColor;rr(c,1535-labelWidth,39,labelWidth,45,10);c.fill();c.fillStyle=contrastColor(sectionColor);c.fillText(currentLabel,1517,70,labelWidth-36);
 c.fillStyle=muted;c.font='20px system-ui';c.fillText('Sigue: '+(next?.name||'Final'),1535,111);
 const keys=this.layout(),anticipation=o.anticipationUnit==='ms'?o.anticipation/1000*scheduler.tempoAt(beat)*scheduler.speed/60:o.anticipation;
 if(!(['guitarra','bajo'].includes(o.instrument)&&o.stringVisualization!=='highway')){
 let lo=0,hi=notes.length;while(lo<hi){const mid=(lo+hi)>>1;if(notes[mid].start<beat-(o.instrument!=='metalofono'?Math.max(.2,o.maxDuration):.2))lo=mid+1;else hi=mid;}let stop=lo;const horizon=Math.max(['guitarra','bajo','bateria'].includes(o.instrument)?8:o.cascade?8:0,anticipation);while(stop<notes.length&&notes[stop].start<=beat+horizon)stop++;notes=notes.slice(lo,stop);
 }
 if(o.instrument==='piano'&&o.showPianoScore)drawPianoScore(c,beat,part,o,structure.sections);else if(o.cascade&&keys.length)this.drawCascade(beat,keys,notes);
 if(['guitarra','bajo'].includes(o.instrument)&&o.stringVisualization!=='highway'){if(!drawAlphaScore(c,beat,notes,part,o))drawStringScore(c,beat,notes,part,o);}else if(o.instrument==='bateria')drawDrums(c,beat,notes,part,o);else if(o.instrument==='bajo')drawBass(c,beat,notes,part,o);else if(o.instrument==='voz'&&o.vocalOverview)drawVocalEnsemble(c,beat,o.vocalEnsemble??[],{...o,measures:part.measures});else if(o.instrument==='voz')drawVocals(c,beat,o.vocalNotes??notes,o.vocalPhrases??[],{...o,measures:part.measures,manualMeter:scheduler.manualMeter?{numerator:scheduler.numerator,denominator:scheduler.denominator}:null});else if(o.instrument==='guitarra')drawGuitar(c,beat,notes,part,o);else if(o.instrument==='piano')this.drawPiano(beat,keys,notes,anticipation);else {
 c.fillStyle=t.soft;rr(c,57,o.cascade?529:458,1486,o.cascade?32:49,15);c.fill();rr(c,57,o.cascade?619:594,1486,o.cascade?18:27,10);c.fill();
 for(const k of keys){const n=notes.find(n=>n.midi===k.midi&&beat>=n.start&&beat<n.start+.19);const color=o.scheme==='mono'?t.accent:musicalPalette(o).notes[k.midi%12];c.shadowColor='rgba(24,44,34,.13)';c.shadowBlur=6;c.shadowOffsetY=5;c.fillStyle=color;rr(c,k.x,k.y,k.w,k.h,10);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;if(n){c.fillStyle='rgba(255,255,255,.65)';rr(c,k.x-3,k.y-3,k.w+6,k.h+6,12);c.fill();c.strokeStyle='#fff';c.lineWidth=3;c.stroke();}c.fillStyle='rgba(30,50,45,.35)';c.beginPath();c.arc(k.x+k.w/2,k.y+18,4,0,Math.PI*2);c.fill();c.fillStyle=contrastColor(color);c.font=`600 ${k.sharp?18:22}px system-ui`;c.textAlign='center';const label=noteName(k.midi,o.latin,o.middle,o.displaySpelling);c.fillText(label,k.x+k.w/2,k.y+k.h-24);}
 for(let hand=0;hand<2;hand++){const n=notes.find(n=>n.hand===hand&&n.start>=beat-.17&&n.start<=beat+anticipation);if(!n)continue;const k=keys.find(k=>k.midi===n.midi);if(!k)continue;const progress=clamp(1-(n.start-beat)/Math.max(.01,anticipation),0,1),x=k.x+k.w/2,y=k.y+50-(1-progress)*86,after=Math.max(0,beat-n.start);c.globalAlpha=(.18+.82*progress)*(1-after/.17);c.save();c.translate(x,y);c.rotate(hand===0?-.22:.22);c.strokeStyle=hand===0?musicalPalette(o).hands.F:musicalPalette(o).hands.G;c.lineWidth=11;c.lineCap='round';c.beginPath();c.moveTo(0,-100);c.lineTo(0,0);c.stroke();c.fillStyle=hand===0?musicalPalette(o).hands.F:musicalPalette(o).hands.G;c.strokeStyle=t.ink;c.lineWidth=3;c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=contrastColor(hand===0?musicalPalette(o).hands.F:musicalPalette(o).hands.G);c.font='bold 16px system-ui';c.textAlign='center';c.fillText(hand===0?'I':'D',0,6);c.restore();c.globalAlpha=1;}
 }
 c.fillStyle=muted;c.font='18px system-ui';c.textAlign='right';c.fillText(beat<0?'Cuenta previa':`Compás ${wholeBars(m.number)} / ${part.measures.length}`,1535,711);
 const {unit}=drawPulseIndicator(c,beat,m,scheduler,o,800,706);
 if(beat<0){c.fillStyle=ink;c.font='600 40px system-ui';c.fillText('Prepárate · '+Math.ceil(-beat/unit),800,(o.cascade||o.showPianoScore)&&keys.length?685:175);}
 if(o.showStructure)this.drawTimeline(beat,part,structure,ink);else this.timelineRegions=[];
 }
}
