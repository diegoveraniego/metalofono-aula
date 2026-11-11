import {visualTheme} from './appearance.js';
import {clamp} from './model.js';
export function instructionDefaults(instrument){return {enabled:false,seconds:6,text:instrument==='guitarra'?'Toca la melodía indicada en el gráfico. Cuando no haya melodía, toca los acordes señalados abajo.':instrument==='voz'?'Canta siguiendo la letra y la melodía indicadas en el gráfico.':instrument==='bateria'?'Toca cada elemento de la batería cuando su símbolo llegue a la línea.':instrument==='bajo'?'Toca la cuerda y el traste indicados cuando la nota llegue a la línea.':'Toca las notas indicadas en el gráfico y sigue el pulso.'};}
export function introDuration(instructions){return instructions.reduce((max,i)=>i.enabled&&i.text.trim()?Math.max(max,clamp(Number(i.seconds)||6,2,30)):max,0);}
export function instructionLines(ctx,text,maxWidth){
 const lines=[];
 for(const paragraph of text.split('\n')){
  let line='';for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
   if(line&&ctx.measureText(line+' '+word).width>maxWidth){lines.push(line);line='';}
   if(ctx.measureText(word).width>maxWidth){for(const char of word){if(line&&ctx.measureText(line+char).width>maxWidth){lines.push(line);line='';}line+=char;}}
   else line+=(line?' ':'')+word;
  }if(line)lines.push(line);else if(!paragraph.trim())lines.push('');
 }return lines;
}
export function drawVideoIntro(renderer,{title,partName,text,remaining}){
 const c=renderer.ctx,t=visualTheme(renderer.opts),portrait=renderer.canvas.height>renderer.canvas.width,w=portrait?900:1600,h=portrait?1600:900,center=w/2,contentWidth=w-180;c.save();c.setTransform(renderer.canvas.width/w,0,0,renderer.canvas.height/h,0,0);
 c.fillStyle=t.bg;c.fillRect(0,0,w,h);c.textAlign='left';c.fillStyle=t.muted;c.font='600 17px system-ui';c.fillText('ADAPTACIONES / AULA',65,65);c.textAlign='center';c.fillStyle=t.ink;c.font='600 30px system-ui';c.fillText(title,center,172,w-130);c.fillStyle=t.muted;c.font='600 21px system-ui';c.fillText(partName,center,218,w-130);
 const content=text?.trim()||'Prepárate. La música comenzará después de esta pantalla.';let font=38,lines;
 do{c.font=`500 ${font}px system-ui`;lines=instructionLines(c,content,contentWidth);if(lines.length*font*1.5<=350)break;font-=2;}while(font>20);
 c.fillStyle=t.ink;const height=font*1.5;lines.forEach((line,i)=>c.fillText(line,center,h*.44+(i-(lines.length-1)/2)*height,contentWidth));
 c.fillStyle=t.muted;c.font='20px system-ui';c.fillText('Comenzamos en '+Math.max(1,Math.ceil(remaining))+' s',center,h-185);c.restore();
}
