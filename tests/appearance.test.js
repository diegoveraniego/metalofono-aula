import {test} from 'node:test';import assert from 'node:assert/strict';
import {THEMES,FONTS,DEFAULT_APPEARANCE,normalizeAppearance,visualTheme,canvasFont,styledContext,applyMenuAppearance,musicalPalette,sectionFillColor,themedSections} from '../dist/js/appearance.js';
import {Renderer,PALETTE,PIANO_CLEF_COLORS,cascadeColor} from '../dist/js/renderer.js';import {prepareTutorial} from '../dist/js/tutorials.js';import {drawVideoIntro} from '../dist/js/video-intro.js';
test('presets validan paletas, fuentes y tamaño al cargar JSON sin aceptar valores CSS arbitrarios',()=>{
 const settings=normalizeAppearance({menu:'__proto__',video:'url(secret)',font:'constructor',borders:'anything',textSize:999,applyVideo:false});assert.equal(settings.menu,'aula');assert.equal(settings.video,'same');assert.equal(settings.font,'inter');assert.equal(settings.borders,'soft');assert.equal(settings.textSize,130);assert.equal(settings.applyVideo,false);assert.deepEqual(normalizeAppearance(null),DEFAULT_APPEARANCE);assert.deepEqual(normalizeAppearance(JSON.parse(JSON.stringify(DEFAULT_APPEARANCE))),DEFAULT_APPEARANCE);
});
test('menús y visualizador admiten paletas independientes y se puede preservar el video original',()=>{
 const a={...DEFAULT_APPEARANCE,menu:'nord',video:'catppuccin-latte'};assert.equal(visualTheme({appearance:a}).id,'catppuccin-latte');assert.equal(visualTheme({appearance:{...a,video:'same'}}).id,'nord');assert.equal(visualTheme({appearance:{...a,applyVideo:false}}).id,'aula');assert.equal(visualTheme({appearance:{...a,highContrast:true}}).muted,THEMES['catppuccin-latte'].ink);
 const values=new Map(),root={style:{setProperty:(k,v)=>values.set(k,v)},dataset:{}};applyMenuAppearance(root,a);assert.equal(values.get('--bg'),THEMES.nord.bg);assert.equal(values.get('--canvas-bg'),THEMES['catppuccin-latte'].bg);assert.equal(root.style.colorScheme,'dark');
});
test('adaptador de canvas conserva el receptor nativo y aplica fuentes y bordes sin alterar coordenadas',()=>{
 const calls=[],raw={font:'',roundRect(...args){assert.equal(this,raw);calls.push(args);},fillText(){assert.equal(this,raw);}};let a={...DEFAULT_APPEARANCE,font:'comic',borders:'square'};const c=styledContext(raw,()=>a);c.font='600 24px system-ui';assert.ok(raw.font.includes('Comic Sans MS'));c.roundRect(1,2,100,50,8);assert.deepEqual(calls[0],[1,2,100,50,0]);c.fillText('texto',0,0);a={...a,applyVideo:false};c.font='600 24px system-ui';assert.equal(raw.font,'600 24px system-ui');c.roundRect(1,2,100,50,8);assert.equal(calls[1][4],8);
});
test('todas las paletas preservan contraste alto entre fondo y texto principal',()=>{
 const luminance=hex=>{const v=hex.slice(1).match(/../g).map(h=>parseInt(h,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
 for(const t of Object.values(THEMES)){const a=luminance(t.ink),b=luminance(t.bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=7,t.name+' '+ratio);}
});
test('temas de video se propagan a todas las partes y a las instrucciones incluyendo los colores musicales del tema',()=>{
 const appearance={...DEFAULT_APPEARANCE,menu:'tokyo-night',font:'mono'},opts={appearance,custom:PALETTE,title:'Prueba'},parts=[{id:'p',name:'Piano',notes:[{midi:60,start:0,duration:1,clef:'G'}],measures:[{number:1,start:0,duration:4,numerator:4,denominator:4}]}],tutorial=prepareTutorial(parts,0,{opts});assert.equal(tutorial.opts.appearance,appearance);assert.equal(cascadeColor(tutorial.notes[0],tutorial.opts),musicalPalette(tutorial.opts).hands.G);assert.notEqual(cascadeColor(tutorial.notes[0],tutorial.opts),PIANO_CLEF_COLORS.G);
 const calls=[],raw=new Proxy({measureText:text=>({width:text.length*12}),fillRect(...args){calls.push({style:this.fillStyle,args});}},{get:(o,k)=>o[k]??(()=>{})}),renderer=new Renderer({getContext:()=>raw});Object.assign(renderer.opts,tutorial.opts,{showStructure:false});renderer.draw(0,tutorial.part,tutorial.notes,{at:()=>null,next:()=>null},{tempoAt:()=>120,speed:1});assert.equal(calls[0].style,THEMES['tokyo-night'].bg);assert.ok(raw.font.includes('Mono'));calls.length=0;drawVideoIntro(renderer,{title:'Prueba',partName:'Piano',text:'Toca la melodía',remaining:6});assert.equal(calls[0].style,THEMES['tokyo-night'].bg);
});

test('cada tema adapta notas, manos, cuerdas y estructura, con buen contraste de las etiquetas',()=>{
 for(const menu of Object.keys(THEMES)){
  const opts={appearance:{...DEFAULT_APPEARANCE,menu}},music=musicalPalette(opts);assert.equal(music.notes.length,12);assert.equal(music.strings.length,6);assert.equal(music.sections.length,6);assert.notEqual(music.hands.G,music.hands.F);
  assert.ok([...music.notes,...music.strings,...music.sections,...Object.values(music.hands)].every(c=>/^#[a-f\d]{6}$/i.test(c)));
  if(menu!=='aula'){assert.notDeepEqual(music.notes,PALETTE);assert.notEqual(music.hands.G,PIANO_CLEF_COLORS.G);assert.notEqual(sectionFillColor({name:'Intro',color:'#123456'},opts),'#123456');}
 }
});
test('cambiar el tema de estructuras no modifica sus colores guardados y permite ajustes por tema',()=>{
 const sections=[{id:'intro',name:'Intro',color:'#123456'},{id:'chorus',name:'Estribillo 3',color:'#654321'}],opts={appearance:{...DEFAULT_APPEARANCE,menu:'nord',sectionColors:{nord:{'estribillo 3':'#abcdef'}}}},themed=themedSections(sections,opts);
 assert.equal(sections[0].color,'#123456');assert.equal(themed[0].color,musicalPalette(opts).sections[0]);assert.equal(themed[1].color,'#abcdef');assert.equal(sectionFillColor({gap:true,name:'Sin sección'},opts),THEMES.nord.line);
 const original=themedSections(sections,{appearance:{...opts.appearance,applyVideo:false}});assert.deepEqual(original,sections);
});
test('ediciones musicales manuales sobreviven al guardado del preset y no se transfieren a otro tema',()=>{
 const colors=Array(12).fill('#123456'),a=normalizeAppearance({...DEFAULT_APPEARANCE,menu:'nord',noteColors:{nord:colors},sectionColors:{nord:{intro:'#abcdef'}}}),roundtrip=normalizeAppearance(JSON.parse(JSON.stringify(a)));
 assert.deepEqual(musicalPalette({appearance:roundtrip}).notes,colors);assert.equal(sectionFillColor({name:'Intro'}, {appearance:roundtrip}),'#abcdef');assert.notDeepEqual(musicalPalette({appearance:{...roundtrip,menu:'tokyo-night'}}).notes,colors);assert.deepEqual(normalizeAppearance({noteColors:{nord:['bad']},sectionColors:{nord:{intro:'url(nope)'}}}).noteColors,{});
});

test('tema Chimera conserva colores originales y los aplica también a la música',()=>{
 const opts={appearance:{...DEFAULT_APPEARANCE,menu:'chimera'}},theme=visualTheme(opts),music=musicalPalette(opts);
 assert.equal(theme.bg,'#000000');assert.equal(theme.accent,'#4fb6f2');assert.equal(theme.warning,'#ffb340');assert.deepEqual(music.strings,['#4fb6f2','#5be381','#ffb340','#ff73cf','#ff5d40','#eef6f8']);assert.equal(normalizeAppearance(opts.appearance).menu,'chimera');
});
