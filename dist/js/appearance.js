import {sectionFamily} from './structure.js';
// Adaptaciones de paletas: referencias y atribuciones en licenses/appearance-palettes.md.
const base={id:'aula',name:'Aula · original',dark:false,bg:'#f8f7f2',panel:'#fffefa',ink:'#233d35',muted:'#728078',line:'#d3d9ce',soft:'#eef0e7',accent:'#284d40',onAccent:'#fffefa',warning:'#d18c4c'};
export const THEMES={
 aula:base,
 'chimera-light':{id:'chimera-light',name:'Chimera · claro',dark:false,bg:'#ffffff',panel:'#ffffff',ink:'#111111',muted:'#505967',line:'#cbd0d6',soft:'#f2f5f8',accent:'#176ca4',onAccent:'#ffffff',warning:'#a35b08'},
 chimera:{id:'chimera',name:'Chimera · vector oscuro',dark:true,bg:'#000000',panel:'#000000',ink:'#effbff',muted:'#4fb6f2',line:'#133954',soft:'#081724',accent:'#4fb6f2',onAccent:'#000000',warning:'#ffb340'},
 'modus-operandi':{id:'modus-operandi',name:'Modus Operandi · claro',dark:false,bg:'#ffffff',panel:'#f2f2f2',ink:'#000000',muted:'#595959',line:'#9f9f9f',soft:'#e0e0e0',accent:'#0031a9',onAccent:'#ffffff',warning:'#884900'},
 'modus-vivendi':{id:'modus-vivendi',name:'Modus Vivendi · oscuro',dark:true,bg:'#000000',panel:'#1e1e1e',ink:'#ffffff',muted:'#b0b0b0',line:'#646464',soft:'#303030',accent:'#79a8ff',onAccent:'#000000',warning:'#fec43f'},
 'catppuccin-latte':{id:'catppuccin-latte',name:'Catppuccin Latte · claro',dark:false,bg:'#eff1f5',panel:'#e6e9ef',ink:'#4c4f69',muted:'#5c5f77',line:'#9ca0b0',soft:'#ccd0da',accent:'#8839ef',onAccent:'#ffffff',warning:'#8a4b00'},
 'catppuccin-mocha':{id:'catppuccin-mocha',name:'Catppuccin Mocha · oscuro',dark:true,bg:'#1e1e2e',panel:'#181825',ink:'#cdd6f4',muted:'#bac2de',line:'#585b70',soft:'#313244',accent:'#cba6f7',onAccent:'#11111b',warning:'#f9e2af'},
 nord:{id:'nord',name:'Nord · oscuro',dark:true,bg:'#2e3440',panel:'#3b4252',ink:'#eceff4',muted:'#d8dee9',line:'#4c566a',soft:'#434c5e',accent:'#88c0d0',onAccent:'#2e3440',warning:'#ebcb8b'},
 'nord-light':{id:'nord-light',name:'Nord · claro',dark:false,bg:'#eceff4',panel:'#e5e9f0',ink:'#2e3440',muted:'#4c566a',line:'#aab4c4',soft:'#d8dee9',accent:'#395c7c',onAccent:'#ffffff',warning:'#79551d'},
 'gruvbox-dark':{id:'gruvbox-dark',name:'Gruvbox · oscuro',dark:true,bg:'#282828',panel:'#32302f',ink:'#ebdbb2',muted:'#d5c4a1',line:'#665c54',soft:'#3c3836',accent:'#fabd2f',onAccent:'#282828',warning:'#fe8019'},
 'gruvbox-light':{id:'gruvbox-light',name:'Gruvbox · claro',dark:false,bg:'#fbf1c7',panel:'#f2e5bc',ink:'#3c3836',muted:'#665c54',line:'#a89984',soft:'#ebdbb2',accent:'#427b58',onAccent:'#ffffff',warning:'#9a4400'},
 'tokyo-night':{id:'tokyo-night',name:'Tokyo Night · oscuro',dark:true,bg:'#1a1b26',panel:'#16161e',ink:'#c0caf5',muted:'#a9b1d6',line:'#414868',soft:'#292e42',accent:'#7aa2f7',onAccent:'#16161e',warning:'#e0af68'}
};
const MUSICAL_ACCENTS={
 'chimera-light':['#176ca4','#228344','#a35b08','#b33283','#c43a28','#7754aa','#257b87'],
 chimera:['#4fb6f2','#5be381','#ffb340','#ff73cf','#ff5d40','#eef6f8','#3487c4'],
 aula:['#7b91bb','#a1bc90','#e4cd7a','#dfa270','#d68079','#a28abc','#94c3d1'],
 'modus-operandi':['#0031a9','#006800','#6f5500','#884900','#a60000','#721045','#005e8b'],
 'modus-vivendi':['#79a8ff','#44bc44','#d0bc00','#feac64','#ff5f59','#b6a0ff','#2fafff'],
 'catppuccin-latte':['#1e66f5','#40a02b','#df8e1d','#fe640b','#d20f39','#8839ef','#179299'],
 'catppuccin-mocha':['#89b4fa','#a6e3a1','#f9e2af','#fab387','#f38ba8','#cba6f7','#94e2d5'],
 nord:['#81a1c1','#a3be8c','#ebcb8b','#d08770','#bf616a','#b48ead','#88c0d0'],
 'nord-light':['#5e81ac','#577048','#9b721b','#a75f3b','#bf616a','#8c6081','#397882'],
 'gruvbox-dark':['#83a598','#b8bb26','#fabd2f','#fe8019','#fb4934','#d3869b','#8ec07c'],
 'gruvbox-light':['#076678','#79740e','#b57614','#af3a03','#9d0006','#8f3f71','#427b58'],
 'tokyo-night':['#7aa2f7','#9ece6a','#e0af68','#ff9e64','#f7768e','#bb9af7','#7dcfff']
};
const AULA_NOTES=['#7b91bb','#a8b6d5','#a1bc90','#a8b6d5','#e4cd7a','#dfa270','#a8b6d5','#d68079','#a8b6d5','#a28abc','#a8b6d5','#94c3d1'];
export function musicalPalette(opts={}){
 const t=visualTheme(opts),[blue,green,yellow,orange,red,purple,cyan]=MUSICAL_ACCENTS[t.id]??MUSICAL_ACCENTS.aula;
 const notes=t.id==='aula'?(opts.custom??AULA_NOTES):(opts.appearance?.noteColors?.[t.id]??[blue,cyan,green,cyan,yellow,orange,cyan,red,cyan,purple,cyan,cyan]);
 return {notes,strings:[blue,green,yellow,orange,red,purple],hands:{G:purple,F:orange,unknown:t.id==='aula'?'#b7c7d6':cyan},sections:t.id==='aula'?['#b9ccc0','#b7c7d6','#a4bbaa','#c6b8ce','#d6bb9b','#d3c79f']:[green,blue,cyan,purple,orange,yellow]};
}
export function sectionFillColor(section,opts={}){const t=visualTheme(opts);const key=section?.name?.trim().toLowerCase(),overrides=opts.appearance?.sectionColors?.[t.id];return t.id==='aula'?(section?.color??'#68766e'):section?.gap||!section?t.line:overrides&&Object.hasOwn(overrides,key)?overrides[key]:musicalPalette(opts).sections[sectionFamily(section.name)];}
export function themedSections(sections,opts={}){return sections.map(s=>({...s,color:sectionFillColor(s,opts)}));}
export const FONTS={
 inter:{name:'Inter · predeterminada',family:'Inter, system-ui, sans-serif'},
 system:{name:'Sistema · sans serif',family:'system-ui, -apple-system, "Segoe UI", sans-serif'},
 noto:{name:'Noto Sans',family:'"Noto Sans", Arial, sans-serif'},
 arial:{name:'Arial / Liberation Sans',family:'Arial, "Liberation Sans", sans-serif'},
 verdana:{name:'Verdana · amplia',family:'Verdana, "DejaVu Sans", sans-serif'},
 comic:{name:'Comic Sans · local',family:'"Comic Sans MS", "Comic Sans", cursive'},
 serif:{name:'Georgia / Liberation Serif',family:'Georgia, "Liberation Serif", serif'},
 mono:{name:'Monoespaciada',family:'"DejaVu Sans Mono", "Liberation Mono", monospace'},
 atkinson:{name:'Atkinson Hyperlegible · local',family:'"Atkinson Hyperlegible", "Atkinson Hyperlegible Next", Arial, sans-serif'},
 dyslexic:{name:'OpenDyslexic · local',family:'OpenDyslexic, "OpenDyslexic3", Arial, sans-serif'}
};
export const DEFAULT_APPEARANCE={menu:'aula',video:'same',font:'inter',borders:'soft',textSize:100,applyVideo:true,highContrast:false,noteColors:{},sectionColors:{}};
export function normalizeAppearance(value={}){if(!value||typeof value!=='object'||Array.isArray(value))value={};return {menu:Object.hasOwn(THEMES,value.menu)?value.menu:'aula',video:value.video==='same'||Object.hasOwn(THEMES,value.video)?value.video:'same',font:Object.hasOwn(FONTS,value.font)?value.font:'inter',borders:['soft','square','round','strong'].includes(value.borders)?value.borders:'soft',textSize:Math.min(130,Math.max(90,Number(value.textSize)||100)),applyVideo:typeof value.applyVideo==='boolean'?value.applyVideo:true,highContrast:!!value.highContrast,noteColors:Object.fromEntries(Object.entries(value.noteColors??{}).filter(([id,colors])=>Object.hasOwn(THEMES,id)&&Array.isArray(colors)&&colors.length===12&&colors.every(c=>typeof c==='string'&&/^#[a-f\d]{6}$/i.test(c))).map(([id,colors])=>[id,[...colors]])),sectionColors:Object.fromEntries(Object.entries(value.sectionColors??{}).filter(([id,colors])=>Object.hasOwn(THEMES,id)&&colors&&typeof colors==='object'&&!Array.isArray(colors)).map(([id,colors])=>[id,Object.fromEntries(Object.entries(colors).filter(([name,color])=>name.length<=100&&typeof color==='string'&&/^#[a-f\d]{6}$/i.test(color)))]))};}
export function visualTheme(opts={}){const appearance=opts.appearance;if(!appearance?.applyVideo)return base;const t=THEMES[appearance.video==='same'?appearance.menu:appearance.video]??base;return appearance.highContrast?{...t,muted:t.ink,line:t.ink}:t;}
export function canvasFont(font,appearance){if(!appearance?.applyVideo||appearance.font==='system')return font;return font.replace(/system-ui\b/g,FONTS[appearance.font]?.family??FONTS.system.family);}
export function styledContext(ctx,getAppearance){
 const methods=new Map();return new Proxy(ctx,{
  get(target,key){const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;
   if(!methods.has(key))methods.set(key,key==='roundRect'?function(x,y,w,h,r=0){const a=getAppearance();return target.roundRect(x,y,w,h,a?.applyVideo&&a.borders==='square'?0:a?.applyVideo&&a.borders==='round'&&typeof r==='number'?Math.min(Math.abs(w)/2,Math.abs(h)/2,r*1.5):r);}:value.bind(target));return methods.get(key);},
  set(target,key,value){return Reflect.set(target,key,key==='font'?canvasFont(value,getAppearance()):value,target);}
 });
}
export function applyMenuAppearance(root,appearance){const a=normalizeAppearance(appearance),t=THEMES[a.menu],style=root.style;
 for(const [key,value]of Object.entries({bg:t.bg,panel:t.panel,ink:t.ink,muted:a.highContrast?t.ink:t.muted,line:a.highContrast?t.ink:t.line,soft:t.soft,accent:t.accent,'on-accent':t.onAccent,amber:t.warning,'app-font':FONTS[a.font].family,'text-scale':a.textSize/100,'ui-radius':a.borders==='square'?'0px':a.borders==='round'?'20px':'9px','ui-border':a.borders==='strong'?'2px':'1px','canvas-bg':visualTheme({appearance:a}).bg}))style.setProperty('--'+key,value);
 root.dataset.appearance='custom';root.dataset.borders=a.borders;style.colorScheme=t.dark?'dark':'light';
}
