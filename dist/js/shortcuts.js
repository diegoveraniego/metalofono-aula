// El transporte tiene prioridad sobre botones del player; los campos y diálogos conservan sus teclas.
export function playerShortcutHandlers({isDialogOpen,isRecording,onToggle,onMeasure,onEscape}){
 let spaceConsumed=false;
 const space=e=>e.code==='Space'||e.key===' '||e.key==='Spacebar';
 const editing=e=>!!e.target?.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
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
