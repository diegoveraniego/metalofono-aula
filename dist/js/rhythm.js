import {visualTheme} from './appearance.js';
export function wholeBars(value){return Math.max(0,Math.floor(value+1e-7));}
export function pulseState(beat,measure,scheduler={}){
 const numerator=scheduler.manualMeter?scheduler.numerator:measure.numerator,denominator=scheduler.manualMeter?scheduler.denominator:measure.denominator,unit=4/denominator;
 const relative=beat-(scheduler.manualMeter?0:measure.start),index=Math.floor(relative/unit+1e-7);
 return {count:numerator,denominator,index:((index%numerator)+numerator)%numerator,unit};
}
export function drawPulseIndicator(c,beat,measure,scheduler,opts={},center=800,y=706){
 const t=visualTheme(opts),state=pulseState(beat,measure,scheduler),numbers=opts.pulseStyle==='numbers',count=Math.min(16,state.count),step=numbers?34:25;
 c.save();c.textAlign='center';
 if(numbers){c.font='500 16px system-ui';c.fillStyle=t.muted;c.fillText(`${state.count}/${state.denominator}`,center-(count-1)*step/2-48,y+6);}
 for(let i=0;i<count;i++){
  const active=i===state.index,x=center+(i-(count-1)/2)*step;c.fillStyle=active?t.warning:numbers?t.muted:t.line;
  if(numbers){c.font=`${active?'700':'500'} 24px system-ui`;c.fillText(String(i+1),x,y+8);}
  else{c.beginPath();c.arc(x,y,active?6:4,0,Math.PI*2);c.fill();}
 }
 c.restore();return state;
}
