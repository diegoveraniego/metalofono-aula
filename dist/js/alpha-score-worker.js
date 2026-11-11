// alphaTab MPL-2.0, sin modificar; este adaptador conserva el reloj y audio de aula.
if(typeof self!=='undefined')self.onmessage=async({data})=>{
 try{
 const a=await import('../vendor/alphatab/alphaTab.core.min.mjs'),s=new a.Settings();s.core.engine='svg';s.core.enableLazyLoading=false;s.display.staveProfile=a.StaveProfile.Tab;s.display.barsPerRow=4;s.display.systemsLayoutMode=a.SystemsLayoutMode.Automatic;
 for(const [key,value]of Object.entries({mainGlyphColor:data.ink,secondaryGlyphColor:data.ink,barSeparatorColor:data.line,staffLineColor:data.line,barNumberColor:data.muted,scoreInfoColor:data.ink}))s.display.resources[key]=a.model.Color.fromJson(value);
 const score=a.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(data.xml),s),track=score.tracks[data.track];if(!track)throw Error('No se encuentra esta pista en alphaTab.');
 score.title='';score.subTitle='';score.artist='';score.album='';score.words='';score.music='';score.copyright='';score.tab='';
 // Los saltos de MuseScore no deben limitar la anticipación en pantalla.
 for(const staff of track.staves){if(!staff.tuning.length)staff.stringTuning.tunings=data.tuning??[64,59,55,50,45,40];staff.showStandardNotation=false;staff.showTablature=true;}
 const renderer=new a.rendering.ScoreRenderer(s),images=[];renderer.width=1470;
 renderer.error.on(error=>{throw error;});renderer.partialRenderFinished.on(e=>{if(e.firstMasterBarIndex>=0)images.push({svg:e.renderResult.replace('<svg ','<svg fill="'+data.ink+'" '),x:e.x,y:e.y,width:e.width,height:e.height,first:e.firstMasterBarIndex,last:e.lastMasterBarIndex});});
 renderer.postRenderFinished.on(()=>{
  const rows=renderer.boundsLookup.staffSystems.map(row=>({index:row.index,bounds:row.realBounds,bars:row.bars.map(bar=>({index:bar.index,bounds:bar.lineAlignedBounds,beats:bar.bars.flatMap(b=>b.beats.map(v=>({x:v.onNotesX,start:v.beat.displayStart/960,duration:v.beat.playbackDuration/960}))).sort((a,b)=>a.start-b.start)}))}));
  self.postMessage({images,rows});renderer.destroy();
 });renderer.renderScore(score,[data.track]);
 }catch(error){self.postMessage({error:error.message});}
};
