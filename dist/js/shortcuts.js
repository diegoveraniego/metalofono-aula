// El transporte tiene prioridad desde los selectores del player; los campos de texto y los diálogos conservan sus teclas.
export function playerShortcutHandlers({isDialogOpen,isRecording,onToggle,onMeasure,onEscape}){
 let spaceConsumed=false;
 const space=e=>e.code==='Space'||e.key===' '||e.key==='Spacebar';
 const editing=e=>!!e.target?.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')&&!((space(e)||e.key==='ArrowLeft'||e.key==='ArrowRight')&&e.target?.closest?.('.stage-card select'));
 return {
  keydown(e){
   if(e.key==='Escape'){onEscape?.();return;}
   if(e.defaultPrevented||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||isDialogOpen(e)||editing(e))return;
   const isSpace=space(e),direction=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;if(!isSpace&&!direction)return;
   e.preventDefault();e.stopPropagation();if(isSpace)spaceConsumed=true;
   if(isRecording()||isSpace&&e.repeat)return;
   if(isSpace)onToggle();else onMeasure(direction);
  },
  keyup(e){if(space(e)&&spaceConsumed){e.preventDefault();e.stopPropagation();spaceConsumed=false;}},
  blur(){spaceConsumed=false;}
 };
}


export function pulseSeekTarget(part,beat,direction,manualMeter=null){
 const bars=part.measures,end=bars.at(-1).start+bars.at(-1).duration,position=Math.max(0,Math.min(end,beat));
 let bar=bars.find(m=>position>=m.start&&position<m.start+m.duration)??bars.at(-1);
 if(direction<0&&Math.abs(position-bar.start)<1e-7&&bar!==bars[0])bar=bars[bars.indexOf(bar)-1];
 const unit=4/(manualMeter?.denominator??bar.denominator),origin=manualMeter?0:bar.start,relative=(position-origin)/unit;
 const target=origin+(direction>0?Math.floor(relative+1e-7)+1:Math.ceil(relative-1e-7)-1)*unit;
 return Math.max(0,Math.min(end,direction>0?Math.min(target,bar.start+bar.duration):Math.max(target,bar.start)));
}
