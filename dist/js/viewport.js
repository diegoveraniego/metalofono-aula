export function zoomLevel(value){return Math.min(2.5,Math.max(.5,Math.round(value*10)/10));}
export function fittedCanvasWidth(width,height,zoom=1,aspect=16/9){return Math.max(1,Math.min(width,height*aspect))*zoom;}
export function setupViewport({viewport,canvas,outButton,inButton,fitButton,output,fluid=()=>false}){
 let zoom=1,fitToHeight=false;
 function update(){const card=viewport.closest('.stage-card'),transport=card?.querySelector('.transport'),seek=card?.querySelector('.seek');const reserved=(transport?.getBoundingClientRect().height??80)+(seek?.getBoundingClientRect().height??0)+22;viewport.style.height=Math.max(220,window.innerHeight-viewport.getBoundingClientRect().top-reserved)+'px';if(fluid()){const pixels=Math.max(900,Math.round(900*viewport.clientWidth/viewport.clientHeight));if(canvas.width!==pixels)canvas.width=pixels;if(canvas.height!==900)canvas.height=900;}const aspect=canvas.width/canvas.height,width=aspect<1&&!fitToHeight?viewport.clientWidth*zoom:fittedCanvasWidth(viewport.clientWidth,viewport.clientHeight,zoom,aspect);canvas.style.width=width+'px';canvas.style.height=width/aspect+'px';output.textContent=Math.round(zoom*100)+'%';outButton.disabled=zoom<=.5;inButton.disabled=zoom>=2.5;}
 function change(value){fitToHeight=false;zoom=zoomLevel(value);update();}
 outButton.onclick=()=>change(zoom-.1);inButton.onclick=()=>change(zoom+.1);fitButton.onclick=()=>{fitToHeight=true;zoom=1;update();viewport.scrollTo({left:0,top:0});};
 viewport.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();change(zoom+(event.deltaY<0?.1:-.1));},{passive:false});
 const observer=new ResizeObserver(update);observer.observe(viewport);const transport=viewport.closest('.stage-card')?.querySelector('.transport');if(transport)observer.observe(transport);window.addEventListener('resize',update);new MutationObserver(()=>{fitToHeight=false;update();}).observe(canvas,{attributes:true,attributeFilter:['width','height']});update();
 return {get zoom(){return zoom;},update};
}
