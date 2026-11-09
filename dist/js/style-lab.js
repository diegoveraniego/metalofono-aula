import {THEMES,FONTS,DEFAULT_APPEARANCE,normalizeAppearance,applyMenuAppearance,visualTheme} from './appearance.js';
import {download} from './structure.js';
const STORAGE='adaptaciones.appearance.v1';
export function setupStyleLab({renderer,isRecording,onChange,notify}){
 const $=id=>document.getElementById(id);let settings={...DEFAULT_APPEARANCE},customFace=null;
 try{const saved=localStorage.getItem(STORAGE);if(saved)settings=normalizeAppearance(JSON.parse(saved));}catch{}
 const option=(value,label)=>{const el=document.createElement('option');el.value=value;el.textContent=label;return el;};
 for(const id of ['styleMenuPalette','styleVideoPalette'])$(id).replaceChildren(...(id==='styleVideoPalette'?[option('same','Igual que el menú')]:[]),...Object.values(THEMES).map(t=>option(t.id,t.name)));
 $('styleFont').replaceChildren(...Object.entries(FONTS).map(([key,font])=>option(key,font.name)));
 function sync(){
  $('styleMenuPalette').value=settings.menu;$('styleVideoPalette').value=settings.video;$('styleFont').value=settings.font;$('styleBorders').value=settings.borders;$('styleTextSize').value=settings.textSize;$('styleTextSizeValue').textContent=settings.textSize+'%';$('styleApplyVideo').checked=settings.applyVideo;$('styleHighContrast').checked=settings.highContrast;
  $('styleVideoPalette').disabled=!settings.applyVideo;
  const t=THEMES[settings.menu];$('styleSwatches').replaceChildren(...['bg','panel','ink','muted','accent','warning'].map(role=>{const swatch=document.createElement('span');swatch.style.background=t[role];swatch.title=role+' · '+t[role];return swatch;}));
  const active=visualTheme({appearance:settings});$('stylePreviewName').textContent=THEMES[settings.menu].name+' · visualizador: '+(settings.applyVideo?active.name:'Aula original');
 }
 function apply(){settings=normalizeAppearance(settings);applyMenuAppearance(document.documentElement,settings);renderer.opts.appearance={...settings};onChange?.();sync();try{localStorage.setItem(STORAGE,JSON.stringify(settings));}catch{}}
 function change(){if(isRecording())return;settings=normalizeAppearance({...settings,menu:$('styleMenuPalette').value,video:$('styleVideoPalette').value,font:$('styleFont').value,borders:$('styleBorders').value,textSize:$('styleTextSize').value,applyVideo:$('styleApplyVideo').checked,highContrast:$('styleHighContrast').checked});apply();}
 for(const id of ['styleMenuPalette','styleVideoPalette','styleFont','styleBorders','styleApplyVideo','styleHighContrast'])$(id).onchange=change;$('styleTextSize').oninput=change;
 $('openStyleLab').onclick=()=>{if(isRecording())return;if($('styleLab').open)$('styleLab').close();else{$('styleLab').show();$('styleMenuPalette').focus();}};
 $('styleLoadFont').onclick=()=>$('styleFontFile').click();$('styleFontFile').onchange=async()=>{
  const file=$('styleFontFile').files[0];if(!file||isRecording())return;
  try{if(file.size>10*1024*1024)throw Error('La fuente supera 10 MB.');const face=new FontFace('AulaPersonalizada',await file.arrayBuffer());await face.load();if(isRecording())return;if(customFace)document.fonts.delete(customFace);document.fonts.add(face);customFace=face;FONTS.custom={name:'Archivo: '+file.name,family:'"AulaPersonalizada", sans-serif'};const existing=$('styleFont').querySelector('option[value="custom"]');if(existing)existing.remove();$('styleFont').append(option('custom',FONTS.custom.name));settings.font='custom';apply();notify('Fuente local aplicada.');}catch(error){notify('No se pudo cargar la fuente: '+error.message);}finally{$('styleFontFile').value='';}
 };
 $('styleReset').onclick=()=>{if(isRecording())return;settings={...DEFAULT_APPEARANCE};apply();};
 $('styleExport').onclick=()=>download(new Blob([JSON.stringify({version:1,appearance:settings},null,2)],{type:'application/json'}),'adaptaciones-aula-estilo.json');
 $('styleImport').onclick=()=>$('styleFile').click();$('styleFile').onchange=async()=>{
  const file=$('styleFile').files[0];if(!file||isRecording())return;try{if(file.size>65536)throw Error('El archivo de estilo supera 64 KB.');const data=JSON.parse(await file.text());if(data.version!==1||!data.appearance||typeof data.appearance!=='object')throw Error('Archivo de estilo no válido.');settings=normalizeAppearance(data.appearance);apply();notify('Estilo cargado.');}catch(error){notify('No se pudo cargar el estilo: '+error.message);}finally{$('styleFile').value='';}
 };
 apply();
}
