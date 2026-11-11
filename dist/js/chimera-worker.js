import {renderChimeraFragments} from './chimera-fragments.js';
import {chimeraPhrases,CHIMERA_BODIES} from './chimera-score.js';
import {Scheduler} from './scheduler.js';
if(typeof self!=='undefined')self.onmessage=async({data})=>{
 try{
  const {loadChimera,renderChimera}=await import('../vendor/chimera/engine.js'),api=await loadChimera(),clock=new Scheduler({});Object.assign(clock,data.clock);
  const phrases=chimeraPhrases(data.part,(a,b)=>clock.seconds(a,b),api.lyricsToSyllables),result=await renderChimeraFragments({phrases,body:CHIMERA_BODIES[data.body],duration:data.duration,engineVersion:data.engineVersion},renderChimera,progress=>self.postMessage({status:`Chimera · ${data.part.name} · tramo ${progress.index}/${progress.total}: ${progress.cached?'guardado':Math.round(progress.seconds)+' / '+Math.round(progress.duration)+' s'}`}));
  self.postMessage({result},[result.pcm.buffer]);
 }catch(error){self.postMessage({error:error.message});}
};
