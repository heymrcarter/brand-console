/* Design system engine: color math, token resolution, checks, outputs.
   Loaded by the console in the browser and by the server and build in Node. */
/* =====================================================================
   COLOR MATH (OKLCH, WCAG contrast)
   ===================================================================== */
const INK="#1C1A17";
function hexOk(h){return /^#?[0-9a-f]{6}$/i.test(String(h||"").trim());}
function normHex(h){h=String(h).trim(); if(h[0]!=="#") h="#"+h; return h.toUpperCase();}
function hexToRgb(h){h=h.replace("#","");if(h.length===3)h=h.split("").map(x=>x+x).join("");const n=parseInt(h,16);return [(n>>16)&255,(n>>8)&255,n&255];}
function rgbToHex(a){return "#"+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("").toUpperCase();}
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const delin=c=>255*(c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055);
function toOklch(hex){const [r,g,b]=hexToRgb(hex).map(lin);
  const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b), m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b), s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
  const L=0.2104542553*l+0.7936177850*m-0.0040720468*s, A=1.9779984951*l-2.4285922050*m+0.4505937099*s, B=0.0259040371*l+0.7827717662*m-0.8086757660*s;
  return [L,Math.hypot(A,B),(Math.atan2(B,A)*180/Math.PI+360)%360];}
function rawRgb(L,C,H){const a=C*Math.cos(H*Math.PI/180), b=C*Math.sin(H*Math.PI/180);
  const l=(L+0.3963377774*a+0.2158037573*b)**3, m=(L-0.1055613458*a-0.0638541728*b)**3, s=(L-0.0894841775*a-1.2914855480*b)**3;
  return [4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s];}
function fromOklch(L,C,H){L=Math.max(0,Math.min(1,L));let c=C;
  for(let i=0;i<40;i++){const r=rawRgb(L,c,H); if(r.every(v=>v>=-0.0005&&v<=1.0005)) return rgbToHex(r.map(v=>delin(Math.min(1,Math.max(0,v))))); c*=0.92;}
  return rgbToHex(rawRgb(L,0,H).map(v=>delin(Math.min(1,Math.max(0,v)))));}
function lum(hex){const [r,g,b]=hexToRgb(hex).map(lin);return 0.2126*r+0.7152*g+0.0722*b;}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
const STEPS=[[50,.975,.14],[100,.945,.28],[200,.89,.5],[300,.81,.75],[400,.72,.95],[500,.63,1],[600,.54,1],[700,.46,.95],[800,.38,.85],[900,.29,.7],[950,.2,.55]];
function scaleOf(hex){const [L,C,H]=toOklch(hex);const o={};STEPS.forEach(([k,l,f])=>{o[k]=fromOklch(l,Math.max(C*f,0.004),H)});
  let near=500,d=9;STEPS.forEach(([k,l])=>{if(Math.abs(l-L)<d){d=Math.abs(l-L);near=k}});o.base=near;return o;}
function shift(hex,dL,dH=0,cMul=1){const [L,C,H]=toOklch(hex);return fromOklch(L+dL,C*cMul,(H+dH+360)%360);}
function darkenTo(hex,against,target){let h=hex;for(let i=0;i<40&&contrast(h,against)<target;i++) h=shift(h,-0.015);return h;}
function lightenTo(hex,against,target){let h=hex;for(let i=0;i<60&&contrast(h,against)<target;i++) h=shift(h,0.012);return h;}
function autoOn(bg){const cw=contrast("#FFFFFF",bg), cd=contrast(INK,bg); return cw>=4.5||cw>=cd?"#FFFFFF":INK;}
const fmt=r=>(Math.floor(r*10)/10).toFixed(1);

/* =====================================================================
   DESIGN DATA
   ===================================================================== */
const BRANDS=[
  {id:"northfield",name:"Northfield",div:"Consumer division"},
  {id:"crestline",name:"Crestline",div:"Partner division"}];
const BN=Object.fromEntries(BRANDS.map(b=>[b.id,b.name]));
/* The font library. The free fonts load from Google Fonts.
   Licensed fonts need your company's font files. Until those are added, a free look-alike shows instead.
   role: "best" = easiest to read for older readers, "body" = fine for reading, "heading" = headings only, "label" = short labels and numbers only. */
const SANS="system-ui,-apple-system,'Segoe UI',sans-serif", SERIF="Georgia,'Times New Roman',serif", MONO="ui-monospace,'SF Mono',Menlo,monospace";
const FONT_LIST=[
  {name:"Atkinson Hyperlegible",cat:"sans",role:"best",axes:"ital,wght@0,400;0,700;1,400;1,700",note:"Made by the Braille Institute. Letters that look alike, like I, l, and 1, are easy to tell apart."},
  {name:"Public Sans",cat:"sans",role:"best",axes:"ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700",note:"A plain, sturdy font made for government websites."},
  {name:"Source Sans 3",cat:"sans",role:"best",axes:"ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700",note:"A friendly font that stays clear at small sizes."},
  {name:"Lexend",cat:"sans",role:"best",axes:"wght@400;500;600;700;800",note:"Made to make reading faster and easier. Its letters are wide and open."},
  {name:"Avenir Next",cat:"sans",role:"body",licensed:true,standIn:"Nunito Sans",weights:"400;500;600;700;800",italic:true,note:"A warm, rounded sans serif font that is easy to read. It needs a license. Macs and iPhones already have it."},
  {name:"Merriweather",cat:"serif",role:"body",axes:"ital,wght@0,400;0,700;0,900;1,400;1,700",note:"A serif font made for screens. It looks classic, but serif body text can be harder to read for some older readers."},
  {name:"Cormorant Garamond",cat:"serif",role:"heading",axes:"ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700",note:"An elegant serif font with a beautiful italic. Its letters are small and fine, so use it only for large headings."},
  {name:"Avenir Next Mono",cat:"mono",role:"label",licensed:true,standIn:"DM Mono",weights:"400;500",note:"The fixed-width partner of Avenir Next. Use it for small labels, codes, and numbers, not sentences. It needs a license."}];
/* Free look-alikes for licensed fonts. They are not shown in the picker. */
const STAND_INS={"Nunito Sans":{cat:"sans",axes:"ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700"},"DM Mono":{cat:"mono",axes:"wght@400;500"}};
const FONT_CATS={sans:"Plain (sans serif)",serif:"Serif",mono:"Fixed width"};
const FALLBACK={sans:SANS,serif:SERIF,mono:MONO};
/* hosted: the company's own font files are added, so no free look-alike or Google Fonts link is needed. */
function fontEntry(f){const hosted=!!f.hosted, stack=[`'${f.name}'`,...(f.standIn&&!hosted?[`'${f.standIn}'`]:[]),FALLBACK[f.cat]||SANS].join(",");
  const ax=f.axes||(f.standIn&&STAND_INS[f.standIn]?STAND_INS[f.standIn].axes:"wght@400;700"), weights=f.weights||ax.replace(/^.*@/,"").split(";").filter(x=>!x.startsWith("1,")).map(x=>x.replace(/^0,/,"")).join(";");
  return {...f,cat:FALLBACK[f.cat]?f.cat:"sans",role:["best","body","heading","label"].includes(f.role)?f.role:"body",stack,weights,italic:f.italic??/ital/.test(ax)};}
const FONTS=Object.fromEntries(FONT_LIST.map(f=>[f.name,fontEntry(f)]));
/* Fonts the brand team added. st.fontLib = {added:[{name,cat,role,source:"google"|"upload",axes}], removed:[names], files:{family:[{file,weight,style}]}}.
   Added fonts are kept in FONTS even after they are removed, so older versions still show correctly. */
function fontLibOf(st){const L=(st&&st.fontLib)||{};return {added:Array.isArray(L.added)?L.added.filter(f=>f&&typeof f.name==="string"&&f.name.trim()):[],removed:Array.isArray(L.removed)?L.removed.filter(n=>typeof n==="string"):[],files:L.files&&typeof L.files==="object"?L.files:{}};}
function registerFonts(st){const L=fontLibOf(st);
  L.added.forEach(f=>{FONTS[f.name]=fontEntry({...f,added:true,hosted:f.source==="upload"||!!(L.files[f.name]||[]).length});});
  Object.entries(L.files).forEach(([n,list])=>{const base=FONT_LIST.find(x=>x.name===n);if(base&&Array.isArray(list)&&list.length) FONTS[n]=fontEntry({...base,hosted:true});});}
/* The fonts the picker shows for a state, in order. */
function fontsShown(st){const L=fontLibOf(st);return [...FONT_LIST.map(f=>f.name).filter(n=>!L.removed.includes(n)),...L.added.map(f=>f.name).filter(n=>!L.removed.includes(n))].filter((n,i,a)=>FONTS[n]&&a.indexOf(n)===i);}
const FONT_FORMATS={woff2:"woff2",woff:"woff",ttf:"truetype",otf:"opentype"};
/* @font-face rules for the company's own font files. base is where the fonts folder is, like "./" or "/". */
function fontFaceCss(st,base){const L=fontLibOf(st),out=[];
  Object.entries(L.files).forEach(([n,list])=>(list||[]).forEach(x=>{if(!x||typeof x.file!=="string")return;const ext=(x.file.split(".").pop()||"").toLowerCase();
    out.push(`@font-face { font-family: '${n.replace(/'/g,"")}'; src: url("${(x.url||base+x.file).replace(/"/g,"")}") format("${FONT_FORMATS[ext]||"woff2"}"); font-weight: ${Number(x.weight)||400}; font-style: ${x.style==="italic"?"italic":"normal"}; font-display: swap; }`);}));
  return out.join("\n");}
function fontHref(names){const fams=[...new Set(names.filter(n=>FONTS[n]&&!FONTS[n].hosted).map(n=>FONTS[n].licensed?FONTS[n].standIn:n))];
  const u=fams.map(n=>`family=${n.replace(/ /g,"+")}${(FONTS[n]&&!FONTS[n].licensed?FONTS[n].axes:STAND_INS[n]?STAND_INS[n].axes:"")?":"+(FONTS[n]&&!FONTS[n].licensed?FONTS[n].axes:STAND_INS[n].axes):""}`);
  return u.length?`https://fonts.googleapis.com/css2?${u.join("&")}&display=swap`:"";}
function uiFont(st){return FONTS[st.type.ui]?st.type.ui:st.type.body;}
const RADII={none:"No corners",sm:"Small",md:"Medium",lg:"Large",pill:"Round ends"};
const ROLE_LABEL={"action.primary":"Main brand color","highlight":"Second brand color","ink":"Dark text color","border.strong":"Strong border (gray 500)","border.default":"Light border (gray 200)"};

const BASE={
  version:"1.4.0",
  gray:"warm",
  brands:{
    northfield:{primary:"#6B2E83",secondary:"#2F5D8A",accent:"#D9653B",onPrimary:"white"},
    crestline:{primary:"#1F4E8C",secondary:"#0F7B6C",accent:"#E0A526",onPrimary:"white"}},
  system:{danger:"#B3261E",success:"#2F6E4F",warning:"#8A5F0E"},
  type:{heading:"Public Sans",body:"Public Sans",ui:"Public Sans",headingStyle:"normal",scale:1.25,headingWeight:700,lineHeight:1.5},
  shape:{radius:8,shadow:"soft"},
  density:{consumer:{base:16,control:48,gap:16,pad:24},employee:{base:14,control:36,gap:8,pad:14}},
  comp:{
    button:{bg:"action.primary",radius:"md",weight:600,case:"sentence",track:"normal",pad:"normal"},
    field:{border:"border.strong",radius:"md",labelWeight:600},
    select:{radius:"md",menuShadow:"soft"},
    card:{radius:"lg",shadow:"soft",border:"on"},
    dialog:{radius:"lg",overlay:50,order:"end"}},
  guidance:{
    button:"Use one main (primary) button for the most important action on a screen. Use the outline button for Cancel or Back. Write the label as a short action that says what will happen, like \"Save my changes.\" Keep the label on one line. Do not use a button to go to another website. Use a link instead.",
    field:"Every field needs a label above it. Put help text under the field, not inside it as gray placeholder text. When something is wrong, say what is wrong and how to fix it, in one sentence.",
    select:"Use a dropdown when there are 5 to 15 choices. For 2 to 4 choices, show them all as radio buttons instead. Sort choices in an order people expect, like by date or A to Z.",
    card:"Use a card to group things that belong together, like one account or one order. Do not put a card inside another card. Keep one main action per card.",
    dialog:"Only use a pop-up when the person must decide something before going on, like confirming a delete. The title asks the question. The main button repeats the action, like \"Delete this address,\" not \"OK.\""}
};
function clone(o){return JSON.parse(JSON.stringify(o));}
/* Makes text safe to put inside HTML. */
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
/* Official brand color sets, taken from the brand color wheels. Order and share keep the brand's hierarchy. */
const PALETTES={
  crestline:{groups:[
    {id:"signature",name:"Signature color combination",note:"These three colors together are what people should know as Crestline.",colors:[
      {name:"Royal blue",hex:"#1A3DA3",share:30},{name:"Sky blue",hex:"#4AA1CC",shade:"#4193B8",share:17},{name:"Leaf green",hex:"#8ABC3F",shade:"#6A9835",share:12}]},
    {id:"base",name:"Base",note:"The main background. It gives the other colors room to stand out.",colors:[{name:"White",hex:"#FFFFFF",share:20}]},
    {id:"accent",name:"Accent colors",note:"Use these in small amounts, like in charts, icons, and highlights.",colors:[
      {name:"Light gray",hex:"#E6E7E9",share:6},{name:"Dark gray",hex:"#555759",share:6},{name:"Navy",hex:"#0F2F55",share:4},{name:"Pale blue",hex:"#EBEFF9",share:2},{name:"Berry",hex:"#A12061",share:2}]}]},
  northfield:{groups:[
    {id:"signature",name:"Signature color",note:"These greens are what people should know as Northfield. The medium green leads, and the light green supports it.",colors:[{name:"Signature green",hex:"#6A9835",share:18},{name:"Light green",hex:"#88BC40",share:12}]},
    {id:"greens",name:"Spectrum of greens",note:"A deeper green that goes with the signature greens.",colors:[{name:"Forest green",hex:"#234924",share:12}]},
    {id:"base",name:"Base",note:"The main background. It gives the other colors room to stand out.",colors:[{name:"White",hex:"#FFFFFF",share:20}]},
    {id:"accent",name:"Accent colors",note:"Use these in small amounts, like in charts, icons, and highlights.",colors:[
      {name:"Navy",hex:"#0F2F55",share:6},{name:"Purple",hex:"#592563",share:6},{name:"Deep teal",hex:"#2F737E",share:6},{name:"Charcoal",hex:"#3A3B3D",share:6},{name:"Berry",hex:"#A12061",share:6},
      {name:"Light teal",hex:"#7AB8C3",share:2},{name:"Light gray",hex:"#C8C8C8",share:2},{name:"Coral",hex:"#E95F76",share:2},{name:"Yellow",hex:"#F7C844",share:2}]}]}};

/* =====================================================================
   TOKEN RESOLUTION: brand x context x size -> values
   ===================================================================== */
const NEUTRAL=scaleOf("#77716A");
/* Gray color, like Radix "grayColor": grays can be warm, pure, cool, or tinted with the brand's main color. */
const GRAYS={warm:"#77716A",neutral:"#737373",cool:"#6B717C"};
function grayOf(st,b){const g=st.gray||"warm";if(g==="brand"){const [,C,H]=toOklch(st.brands[b].primary);return scaleOf(fromOklch(.56,Math.min(C,.1)*.18+.004,H));}return scaleOf(GRAYS[g]||GRAYS.warm);}
const PAGE="#FAF9F7";
function rad(st,key){const r=st.shape.radius;return {none:0,sm:Math.min(4,r),md:r,lg:Math.round(r*1.5),pill:999}[key];}
function shadow(k){return {none:"none",soft:"0 1px 2px rgba(20,18,16,.06), 0 4px 14px rgba(20,18,16,.07)",strong:"0 2px 4px rgba(20,18,16,.08), 0 14px 32px rgba(20,18,16,.14)"}[k];}
/* Page and window backgrounds, per brand and mode. Picked from the brand's color set. */
const BG_KEYS={light:{page:"lightPage",card:"lightCard"},dark:{page:"darkPage",card:"darkCard"}};
function bgDefault(br,mode,which){
  if(mode==="light") return "#FFFFFF";
  const seeds=br.seeds||{};
  return which==="page"?scaleOf(seeds.primary||br.primary)[950]:scaleOf(seeds.secondary||br.secondary)[900];
}
function bgSeedDefault(br,mode,which){const seeds=br.seeds||{};if(mode==="light") return "#FFFFFF";return which==="page"?(seeds.primary||br.primary):(seeds.secondary||br.secondary);}
function bgChosen(br,mode,which){return !!(br.bg&&br.bg[mode]&&br.bg[mode][which]);}
function bgOf(br,mode,which){return bgChosen(br,mode,which)?br.bg[mode][which]:bgDefault(br,mode,which);}
/* Page look: a flat color, a gradient, or a picture, plus see-through windows (like Radix "translucent" panels). */
const LOOK_DEF={kind:"solid",to:null,angle:"down",veil:0.8,glass:1,blur:0};
const ANGLES={down:"180deg",diag:"135deg",side:"90deg"};
/* Contrast goal for words. "rule" meets WCAG AA (4.5 to 1). "best" aims for 7 to 1, which is better for older readers. */
function goalOf(br){return br&&br.wordGoal==="best"?7.05:4.6;}
function lookOf(br,mode){return Object.assign({},LOOK_DEF,(br&&br.look&&br.look[mode])||{});}
function mixHex(a,b,t){const x=hexToRgb(a),y=hexToRgb(b);return rgbToHex(x.map((v,i)=>v*t+y[i]*(1-t)));}
function hexA(h,a){const [r,g,b]=hexToRgb(h);return a>=1?normHex(h):`rgba(${r}, ${g}, ${b}, ${+a.toFixed(2)})`;}
/* Every color the page can show behind words. Checks test words against all of them. */
function pageSet(br,mode){const L=lookOf(br,mode),p=bgOf(br,mode,"page");
  if(L.kind==="gradient"&&L.to) return [p,normHex(L.to),mixHex(p,L.to,.5)];
  if(L.kind==="image"&&L.img&&(L.samples||[]).length) return L.samples.map(x=>mixHex(p,x,L.veil));
  return [p];}
function cardSet(br,mode){const L=lookOf(br,mode),c=bgOf(br,mode,"card");return L.glass>=1?[c]:pageSet(br,mode).map(x=>mixHex(c,x,L.glass));}
function pageFill(br,mode){const L=lookOf(br,mode),p=bgOf(br,mode,"page");
  if(L.kind==="gradient"&&L.to) return L.angle==="glow"?`radial-gradient(120% 90% at 50% 0%, ${normHex(L.to)}, ${p} 75%)`:`linear-gradient(${ANGLES[L.angle]||"180deg"}, ${p}, ${normHex(L.to)})`;
  if(L.kind==="image"&&L.img){const v=hexA(p,L.veil);return `linear-gradient(${v}, ${v}), url('${L.img}')`;}
  return "none";}
function bgSeedOf(br,mode,which){const sk=BG_KEYS[mode][which];return (bgChosen(br,mode,which)&&br.seeds&&br.seeds[sk])||bgSeedDefault(br,mode,which);}
function roleColor(st,b,role){const br=st.brands[b];
  if(role==="action.primary") return br.primary;
  if(role==="highlight") return br.secondary;
  if(role==="ink") return INK;
  if(role==="border.strong") return grayOf(st,b)[500];
  if(role==="border.default") return grayOf(st,b)[200];
  return br.primary;}
/* Dark mode: warm near-black neutrals. Brand colors are lifted until they stand out on the dark page. */
const DK={bg:"#141312",card:"#1D1C1A",muted:"#2A2826",border:"#3D3A36",input:"#827C73",fg:"#EEEBE5",mutedFg:"#B3ACA1"};
/* Words on the main color follow the brand team's choice in every mode. */
function wordOn(br){return br.onPrimary==="white"?"#FFFFFF":br.onPrimary==="dark"?INK:hexOk(br.onPrimary)?normHex(br.onPrimary):autoOn(br.primary);}
/* Word and background colors the brand team picked by hand for one mode. Anything not picked is made automatically. */
const PAIR_KEYS=["link","body","tag","tagBg","soft","softBg"];
function pairsOf(br,mode){const o=(br&&br.pairs&&br.pairs[mode])||{};return Object.fromEntries(PAIR_KEYS.filter(k=>hexOk(o[k])).map(k=>[k,normHex(o[k])]));}
/* An edge color for a filled shape, so it stands out from the page and window (3 to 1). */
/* Make a color darker (light mode) or lighter (dark mode) until it passes on every background in the list. */
function dropAll(x,list,t){for(let i=0;i<3;i++)list.forEach(b=>{if(contrast(x,b)<t)x=darkenTo(x,b,t);});return x;}
function liftAll(x,list,t){for(let i=0;i<3;i++)list.forEach(b=>{if(contrast(x,b)<t)x=lightenTo(x,b,t);});return x;}
function edgeFor(fill,bg,card,dark){const list=[].concat(bg,card);return dark?liftAll(fill,list,3.1):dropAll(fill,list,3.1);}
function lightRole(st,b,r){const br=st.brands[b];return r==="highlight"?br.secondary:r==="ink"?INK:br.primary;}
function colorsDark(st,b){
  const br=st.brands[b], P0=br.primary, sc=scaleOf(P0), sc2=scaleOf(br.secondary), sys=st.system;
  const bg=bgOf(br,"dark","page"), card=bgOf(br,"dark","card"), pS=pageSet(br,"dark"), cS=cardSet(br,"dark"), LK=lookOf(br,"dark");
  const [Lc,Cc,Hc]=toOklch(card);
  const muted=fromOklch(Lc+.05,Cc*.8,Hc), border=fromOklch(Lc+.12,Cc*.6,Hc), input=lightenTo(fromOklch(Lc+.2,Cc*.5,Hc),card,3.2);
  const fg=pairsOf(br,"dark").body||liftAll(DK.fg,[card,...pS,...cS],7);
  /* Filled brand shapes keep the same color and the same words as in light mode. */
  const P=P0, onP=wordOn(br), edge=edgeFor(P,pS,cS,true);
  const [L1,C1,H1]=toOklch(P0),[L2,C2,H2]=toOklch(br.secondary);
  const PR=pairsOf(br,"dark");
  const soft=PR.softBg||fromOklch(Lc+.09,Math.min(C1,.09)*.8,H1), acc=PR.tagBg||fromOklch(Lc+.1,Math.min(C2,.09)*.8,H2);
  const GL=goalOf(br);
  const st2=(h)=>{const[l,c,hh]=toOklch(h);const sb=fromOklch(Lc+.06,Math.min(c,.08)*.7,hh);return [liftAll(h,[bg,card,sb,muted],GL),sb];};
  const [dg0,dgs]=st2(sys.danger),[sg,sgs]=st2(sys.success),[wg,wgs]=st2(sys.warning);
  /* Words that can sit on tinted rows, chosen tiles, and soft messages must still pass. */
  const tints=[bg,card,...pS,...cS,muted,soft,acc,dgs,sgs,wgs];
  const dg=liftAll(dg0,[...pS,...cS],GL);
  const mutedFg=liftAll(fromOklch(.74,Math.min(Cc,.03),Hc),tints,GL);
  const autoLink=liftAll(lightenTo(lightenTo(P0,bg,7),card,7),tints,GL), link=PR.link||autoLink;
  const role=r=>r==="border.default"?border:r==="border.strong"?input:lightRole(st,b,r);
  const btnBg=role(st.comp.button.bg), btnFg=st.comp.button.bg==="action.primary"?onP:autoOn(btnBg), btnBorder=edgeFor(btnBg,pS,cS,true);
  return {P,onP,edge,link,sc,sc2,btnBg,btnFg,btnBorder,btnHover:contrast(btnFg,shift(btnBg,.05))>=4.5?shift(btnBg,.05):shift(btnBg,-.05),
    background:bg,foreground:fg,card,muted,mutedFg,border,input:role(st.comp.field.border),ring:autoLink,
    pageSet:pS,cardSet:cS,fill:pageFill(br,"dark"),panel:hexA(card,LK.glass),blur:LK.blur,
    secondary:soft,secondaryFg:PR.soft||liftAll(sc[200],[soft,muted],7),accent:acc,accentFg:PR.tag||lightenTo(sc2[200],acc,Math.max(7,GL)),accentBrand:br.accent,
    danger:sys.danger,dangerFg:autoOn(sys.danger),dangerText:dg,dangerSoft:dgs,success:sg,successSoft:sgs,warning:wg,warningSoft:wgs};
}
function colorsFor(st,b,mode){
  if(mode==="dark") return colorsDark(st,b);
  const br=st.brands[b], P=br.primary, sc=scaleOf(P), sc2=scaleOf(br.secondary), sca=scaleOf(br.accent);
  const onP = wordOn(br);
  const page=bgOf(br,"light","page"), card=bgOf(br,"light","card"), pS=pageSet(br,"light"), cS=cardSet(br,"light"), LK=lookOf(br,"light"), onAll=[...pS,...cS];
  const sys=st.system, ds=scaleOf(sys.danger)[50], ss=scaleOf(sys.success)[50], ws=scaleOf(sys.warning)[50];
  /* Words that can sit on tinted rows, chosen tiles, and soft messages must still pass. */
  const G=grayOf(st,b), PR=pairsOf(br,"light"), softBg=PR.softBg||sc[50], tagBg=PR.tagBg||sc2[100];
  const tints=[page,card,...onAll,G[100],softBg,tagBg,ds,ss,ws];
  const GL=goalOf(br);
  const autoLink = dropAll(P,tints,GL), link = PR.link||autoLink;
  const fg = PR.body||([page,card,...onAll].every(x=>contrast(G[900],x)>=4.5)?G[900]:"#F5F3EF");
  const mutedFg = dropAll(G[600],tints,GL);
  const okText=dropAll(sys.success,[page,card,ss],GL), warnText=dropAll(sys.warning,[page,card,ws],GL);
  const btnBg = lightRole(st,b,st.comp.button.bg);
  const btnFg = st.comp.button.bg==="action.primary"?onP:autoOn(btnBg);
  const hover=shift(btnBg,-0.06);
  return {P,onP,edge:edgeFor(P,pS,cS,false),link,sc,sc2,sca,btnBg,btnFg,btnBorder:edgeFor(btnBg,pS,cS,false),
    pageSet:pS,cardSet:cS,fill:pageFill(br,"light"),panel:hexA(card,LK.glass),blur:LK.blur,btnHover:contrast(btnFg,hover)>=contrast(btnFg,btnBg)||contrast(btnFg,hover)>=4.5?hover:shift(btnBg,.05),
    background:page,foreground:fg,card,muted:G[100],mutedFg,
    border:G[200],input:roleColor(st,b,st.comp.field.border),ring:autoLink,
    secondary:softBg,secondaryFg:PR.soft||darkenTo(sc[800],softBg,7),
    accent:tagBg,accentFg:PR.tag||darkenTo(sc2[800],tagBg,GL),
    accentBrand:br.accent,
    danger:sys.danger,dangerFg:autoOn(sys.danger),dangerText:dropAll(sys.danger,[page,card,...onAll,ds],GL),dangerSoft:ds,
    success:okText,successSoft:ss,warning:warnText,warningSoft:ws};
}
function sizesFor(st,ctx,size){
  const d=st.density[ctx], big=size==="large", r=st.type.scale;
  const base=Math.round(d.base*(big?1.125:1));
  return {base,control:Math.round(d.control*(big?7/6:1)),gap:Math.round(d.gap*(big?1.25:1)),pad:Math.round(d.pad*(big?1.17:1)),
    h1:Math.round(base*r**3),h2:Math.round(base*r**2),h3:Math.round(base*r),sm:Math.max(ctx==="consumer"?14:12,Math.round(base/r))};
}
/* =====================================================================
   CHECKS (the safeguards that let the brand team publish on their own)
   ===================================================================== */
const CTX=["consumer","employee"], SZ=["standard","large"];
function runChecks(st){
  const out=[];
  const add=(o)=>out.push(o);
  BRANDS.forEach(B=>{
    const b=B.id, c=colorsFor(st,b);
    const r1=contrast(c.btnFg,c.btnBg);
    add({id:"btn-"+b,level:r1<4.5?"block":"pass",title:r1<4.5?`${B.name}: button words are too hard to read.`:`${B.name}: button words are easy to read.`,
      detail:`The words on the main button have a contrast of ${fmt(r1)} to 1. They need at least 4.5 to 1.`,where:[B.name,"All screens"],ratio:r1,pair:[c.btnFg,c.btnBg],
      fix:r1<4.5?(st.comp.button.bg==="action.primary"?{brand:b,kind:"primary"}:{brand:b,kind:"btnbg"}):null});
    /* Words on the main color show up on badges, checked boxes, the chosen day and time, the current page and step, and brand bands.
       When the main button uses a different color, they still need their own check. */
    if(st.comp.button.bg!=="action.primary"){const r0=contrast(c.onP,c.P);
      add({id:"onmain-"+b,level:r0<4.5?"block":"pass",title:r0<4.5?`${B.name}: words on the main color are too hard to read.`:`${B.name}: words on the main color are easy to read.`,
        detail:`Badges, checked boxes, the chosen day and time, and the current page use your main color with ${c.onP==="#FFFFFF"?"white":"dark"} words. They reach ${fmt(r0)} to 1 and need at least 4.5 to 1.`,where:[B.name,"Badges","Selected items"],ratio:r0,pair:[c.onP,c.P],
        fix:r0<4.5?{brand:b,kind:"primary"}:null});}
    ["light","dark"].forEach(md=>{const k=md==="light"?c:colorsFor(st,b,"dark");
      const all=[k.background,k.card,...k.pageSet,...k.cardSet], rb=Math.min(...all.map(x=>contrast(k.foreground,x))), rm=Math.min(...all.map(x=>contrast(k.mutedFg,x)));
      const lk=lookOf(st.brands[b],md), fancy=lk.kind!=="solid"||lk.glass<1;
      const lvl=rb<4.5||rm<4.5?"block":rb<7?"warn":"pass";
      add({id:`bg-${md}-${b}`,level:lvl,title:lvl==="pass"?`${B.name} ${md} mode: words on the backgrounds are easy to read.`:lvl==="warn"?`${B.name} ${md} mode: body text could stand out more.`:`${B.name} ${md} mode: words on the backgrounds are too hard to read.`,
        detail:`Body text reaches ${fmt(rb)} to 1 on the page and window backgrounds${fancy?", tested on every part of the "+(lk.kind==="image"?"picture":lk.kind==="gradient"?"gradient":"page")+(lk.glass<1?" that shows through the windows":""):""}. Help text reaches ${fmt(rm)} to 1. Words need at least 4.5 to 1, and 7 to 1 is best for readers over 65.`,
        fix:lvl==="block"&&fancy?{kind:"look",brand:b,mode:md}:null,
        where:[B.name,md==="light"?"Light mode":"Dark mode","Backgrounds"],ratio:rb,pair:[k.foreground,k.background]});});
    if(r1>=4.5&&r1<7&&st.brands[b].wordGoal==="best") add({id:"btn7-"+b,level:"warn",title:`${B.name}: main button words are below your 7 to 1 goal.`,detail:`The words on the main button reach ${fmt(r1)} to 1. Your goal for ${B.name} is 7 to 1. I can raise it by changing the word color or using a deeper or lighter shade of the main color.`,where:[B.name,"Buttons"],ratio:r1,pair:[c.btnFg,c.btnBg],fix:{kind:"btn7",brand:b}});
    const r2=Math.min(...[c.background,...c.pageSet,...c.cardSet].map(x=>contrast(c.link,x)));
    add({id:"link-"+b,level:r2<4.5?"block":r2<7?"warn":"pass",title:r2<7?`${B.name}: links could be darker.`:`${B.name}: links are easy to read.`,
      detail:r2<7?`Links have a contrast of ${fmt(r2)} to 1. That passes the rule, but 7 to 1 is better for readers over 65. The link color is made from your main color.`:`Links have a contrast of ${fmt(r2)} to 1.`,
      where:[B.name,"All screens"],ratio:r2,pair:[c.link,c.background],fix:r2<7?{brand:b,kind:"link"}:null});
    const r3=contrast(c.accentFg,c.accent);
    add({id:"hl-"+b,level:r3<4.5?"block":"pass",title:`${B.name}: words on tags ${r3<4.5?"are too hard to read.":"are easy to read."}`,detail:`Tags use your second color. Their words have a contrast of ${fmt(r3)} to 1.`,where:[B.name,"All screens"],ratio:r3,pair:[c.accentFg,c.accent]});
    const r4=contrast(c.ring,c.background);
    add({id:"ring-"+b,level:r4<3?"block":"pass",title:`${B.name}: the focus outline ${r4<3?"is too faint.":"is easy to see."}`,detail:`People who use a keyboard follow this outline. It has a contrast of ${fmt(r4)} to 1 and needs 3 to 1.`,where:[B.name,"All screens"],ratio:r4,pair:[c.ring,c.background]});
  });
  BRANDS.forEach(B=>{const c=colorsFor(st,B.id,"dark");
    const r1=Math.min(contrast(c.secondaryFg,c.secondary),contrast(c.dangerText,c.background),contrast(c.dangerText,c.card)), r2=Math.min(...[c.background,c.card,...c.pageSet,...c.cardSet].map(x=>contrast(c.link,x))), r3=contrast(c.accentFg,c.accent);
    const bad=[r1<4.5?"soft button or error words":"",r2<4.5?"links":"",r3<4.5?"tag words":""].filter(Boolean);
    add({id:"dark-"+B.id,level:bad.length?"block":"pass",title:bad.length?`${B.name} in dark mode: ${bad.join(" and ")} are too hard to read.`:`${B.name} in dark mode: words are easy to read.`,
      detail:`In dark mode, buttons keep the same color and words as in light mode. Links reach ${fmt(r2)} to 1, tag words reach ${fmt(r3)} to 1, and soft button and error words reach at least ${fmt(r1)} to 1. Filled shapes get an outline when they would blend into the dark page.`,where:[B.name,"Dark mode"],pair:[c.btnFg,c.btnBg]});});
  const PAIR_NAMES={button:"Main button words",link:"Links",body:"Body text",tag:"Tag words",soft:"Soft button words"};
  BRANDS.forEach(B=>["light","dark"].forEach(md=>{const k=colorsFor(st,B.id,md);
    [["button",k.btnFg,k.btnBg],["link",k.link,k.background],["body",k.foreground,k.background],["tag",k.accentFg,k.accent],["soft",k.secondaryFg,k.secondary]].forEach(([r,f,g])=>{const q=contrast(f,g);
      const PR=pairsOf(st.brands[B.id],md), picked=r==="link"?PR.link:r==="body"?PR.body:r==="tag"?(PR.tag||PR.tagBg):r==="soft"?(PR.soft||PR.softBg):null;
      if(q<4.5&&r!=="button"&&(picked||(r==="soft"&&md==="light"))) add({id:`pair-${md}-${B.id}-${r}`,level:"block",title:`${B.name} ${md} mode: ${PAIR_NAMES[r].toLowerCase()} are too hard to read.`,detail:`These words reach ${fmt(q)} to 1 on their background. They need at least 4.5 to 1. Pick a darker or lighter color on the Color page.`,where:[B.name,md==="light"?"Light mode":"Dark mode"],ratio:q,pair:[f,g]});});}));
  BRANDS.forEach(B=>["light","dark"].forEach(md=>{const lk=lookOf(st.brands[B.id],md);
    if(lk.kind==="image"&&(!lk.img||!(lk.samples||[]).length)) add({id:`img-${md}-${B.id}`,level:"block",title:`${B.name} ${md} mode: the page picture is missing.`,detail:"Add the picture again from the Color page, so the console can measure its colors and check the words on it.",where:[B.name,md==="light"?"Light mode":"Dark mode","Backgrounds"]});}));
  const fb=roleColor(st,"northfield",st.comp.field.border), r5=contrast(fb,"#FFFFFF");
  add({id:"fieldborder",level:r5<3?"block":"pass",title:r5<3?"Field borders are too faint to see.":"Field borders are easy to see.",detail:`The line around a text field has a contrast of ${fmt(r5)} to 1. It needs at least 3 to 1 so people can find where to type.`,where:["All brands","Text field","Select"],ratio:r5,pair:[fb,"#FFFFFF"],fix:r5<3?{kind:"field"}:null});
  const rd=contrast(st.system.danger,PAGE);
  add({id:"danger",level:rd<4.5?"block":"pass",title:`Error messages ${rd<4.5?"are too hard to read.":"are easy to read."}`,detail:`Red error text has a contrast of ${fmt(rd)} to 1.`,where:["All brands"],ratio:rd,pair:[st.system.danger,PAGE]});
  const z=sizesFor(st,"consumer","standard"), zl=sizesFor(st,"consumer","large"), ze=sizesFor(st,"employee","standard");
  add({id:"target-c",level:z.control<44?"block":"pass",title:z.control<44?"Consumer buttons are too small to tap.":"Consumer buttons are big enough to tap.",detail:`Buttons and fields on consumer screens are ${z.control} pixels tall (${zl.control} in Large). The rule is at least 44.`,where:["Consumer screens"]});
  add({id:"target-e",level:ze.control<24?"block":"pass",title:"Employee buttons are big enough to click.",detail:`Buttons on employee screens are ${ze.control} pixels tall. The rule for mouse screens is at least 24.`,where:["Employee screens"]});
  add({id:"text-c",level:z.base<16?"block":zl.base<18?"warn":"pass",title:zl.base>=18?"Consumer text is large enough.":"Consumer text could be larger.",detail:`Body text on consumer screens is ${z.base} pixels, and ${zl.base} pixels in Large, which is what most of your customers see.`,where:["Consumer screens"]});
  if(st.comp.button.case==="upper") add({id:"caps",level:"warn",title:"Button words are in all capital letters.",detail:"Words in all capital letters are harder to read, most of all for older readers. Normal sentence case is easier.",where:["All brands","Button"],fix:{kind:"caps"}});
  const bf=FONTS[st.type.body]||{}, hf=FONTS[st.type.heading]||{}, uf=FONTS[uiFont(st)]||{};
  if(bf.role==="heading"||bf.role==="label") add({id:"bodyfont",level:"warn",title:`${st.type.body} is not made for body text.`,detail:bf.role==="label"?"Fixed-width fonts are for short labels and numbers. Long sentences are hard to read in them.":"This font has small, fine letters that are hard to read in long paragraphs. A font marked Easiest to read is best for body text.",where:["All brands","All screens"],fix:{kind:"slot",path:"type.body",value:"Atkinson Hyperlegible"}});
  else if(bf.cat==="serif") add({id:"serif",level:"warn",title:"The body font is a serif font.",detail:"Serif fonts can be harder to read on screens for some older readers. A plain font is safer for body text.",where:["All brands","All screens"],fix:{kind:"slot",path:"type.body",value:"Atkinson Hyperlegible"}});
  if(uf.role==="heading") add({id:"uifont",level:"warn",title:`${uiFont(st)} is too fine for labels and buttons.`,detail:"Labels, menus, and buttons are small. A plain font is much easier to read at small sizes.",where:["All brands","Labels","Navigation","Buttons"],fix:{kind:"slot",path:"type.ui",value:"Public Sans"}});
  const lic=[...new Set([st.type.heading,st.type.body,uiFont(st)].filter(n=>FONTS[n]&&FONTS[n].licensed))];
  if(lic.length) add({id:"license",level:"warn",title:`${lic.join(" and ")} ${lic.length>1?"need":"needs"} a license.`,detail:`Your company needs a web license and the font files before apps can show ${lic.length>1?"these fonts":"this font"}. Until then, people see ${lic.map(n=>FONTS[n].standIn).join(" and ")}, a free look-alike. Macs and iPhones already have Avenir Next.`,where:["All brands","Fonts"]});
  if(st.type.headingStyle==="italic"&&!hf.italic) add({id:"hitalic",level:"warn",title:`${st.type.heading} has no italic.`,detail:"The browser will slant the letters instead, which looks rough. Pick Regular, or a heading font with an italic, like Cormorant Garamond.",where:["All brands","Headings"],fix:{kind:"slot",path:"type.headingStyle",value:"normal"}});
  if(hf.weights&&!hf.weights.split(";").includes(String(st.type.headingWeight))){const ws=hf.weights.split(";").map(Number),near=ws.reduce((a,w)=>Math.abs(w-st.type.headingWeight)<Math.abs(a-st.type.headingWeight)?w:a,ws[0]);
    add({id:"hweight",level:"warn",title:`${st.type.heading} does not come in this heading weight.`,detail:`The browser will fake weight ${st.type.headingWeight}, which can look blurry. ${st.type.heading} comes in ${ws.join(", ")}.`,where:["All brands","Headings"],fix:[600,700,800].includes(near)?{kind:"slot",path:"type.headingWeight",value:near}:null});}
  if(st.type.lineHeight<1.5) add({id:"lh",level:"warn",title:"Lines of text are close together.",detail:`Line spacing is ${st.type.lineHeight}. The accessibility rule suggests at least 1.5 for body text.`,where:["All brands"]});
  const C2=st.comp;
  if(C2.checkbox){const px=Math.round(C2.checkbox.size*sizesFor(st,"consumer","large").base);add({id:"cbsize",level:px<24?"warn":"pass",title:px<24?"Checkboxes are small on consumer screens.":"Checkboxes are big enough to tap.",detail:`Checkboxes and radio buttons are ${px} pixels on consumer screens. At least 24 is best, and the label is part of the tap area too.`,where:["Consumer screens","Checkbox","Radio buttons"],fix:px<24?{kind:"slot",path:"comp.checkbox.size",value:1.6}:null});}
  if(C2.toast&&C2.toast.duration&&C2.toast.duration<10) add({id:"toast",level:"warn",title:"Short messages disappear quickly.",detail:`Toast messages hide after ${C2.toast.duration} seconds. Slower readers may miss them. 10 seconds or more is better.`,where:["Toast"],fix:{kind:"slot",path:"comp.toast.duration",value:10}});
  if(C2.timeout) add({id:"timeout",level:C2.timeout.warn<2?"warn":"pass",title:C2.timeout.warn<2?"The sign-out warning comes late.":"People get time to stay signed in.",detail:`People are warned ${C2.timeout.warn} minute${C2.timeout.warn>1?"s":""} before they are signed out. Two minutes or more gives slower readers time to act.`,where:["Session timeout warning"],fix:C2.timeout.warn<2?{kind:"slot",path:"comp.timeout.warn",value:5}:null});
  if(C2.link&&C2.link.underline==="hover") add({id:"linkul",level:"warn",title:"Links are only underlined on mouse over.",detail:"Many older readers only know words are a link when they are underlined. Phones have no mouse over at all.",where:["Link"],fix:{kind:"slot",path:"comp.link.underline",value:"always"}});
  return out;
}
/* When the main color changes, keep its words readable. Returns the word setting to switch to, or null. */
function wordsForNewMain(br){const P=br.primary, cur=wordOn(br);if(contrast(cur,P)>=4.5) return null;
  const w=contrast("#FFFFFF",P), d=contrast(INK,P);if(Math.max(w,d)<4.5) return null;return w>=d?"white":"dark";}
/* The smallest change that makes the main button words reach a goal. Keeps the color if the other word color works. */
function buttonFix(st,b,goal,want){const br=st.brands[b],P=br.primary,cur=wordOn(br);
  for(const [w,k] of [["#FFFFFF","white"],[INK,"dark"]]){if((!want||want===k)&&w!==cur&&contrast(w,P)>=goal) return [{path:`brands.${b}.onPrimary`,value:k,why:`Your color stays the same. ${k==="white"?"White":"Dark"} words on it reach ${fmt(contrast(w,P))} to 1.`}];}
  const seed=(br.seeds&&br.seeds.primary)||P, sc=scaleOf(seed), [L0]=toOklch(P);
  const opts=STEPS.map(([k])=>sc[k]).flatMap(x=>[["#FFFFFF","white",x],[INK,"dark",x]]).filter(([w,k,x])=>(!want||want===k)&&contrast(w,x)>=goal).sort((a,b)=>Math.abs(toOklch(a[2])[0]-L0)-Math.abs(toOklch(b[2])[0]-L0));
  if(!opts.length) return [];
  const [w,k,x]=opts[0], step=STEPS.find(([s])=>sc[s]===x)[0];
  return [{path:`brands.${b}.primary`,value:x,why:`Shade ${step} of your main color. ${k==="white"?"White":"Dark"} words on it reach ${fmt(contrast(w,x))} to 1. This changes the main color everywhere.`},...(k!==br.onPrimary?[{path:`brands.${b}.onPrimary`,value:k,why:`${k==="white"?"White":"Dark"} words on the new shade.`}]:[])];}
function fixChanges(st,fix){
  if(fix.kind==="btn7") return buttonFix(st,fix.brand,7);
  if(fix.kind==="btnbg"){const br=st.brands[fix.brand];
    if(st.comp.button.bg==="highlight"){const S2=br.secondary,[L]=toOklch(S2),sc=scaleOf(S2);
      const opts=STEPS.map(([k])=>sc[k]).filter(x=>Math.max(contrast("#FFFFFF",x),contrast(INK,x))>=4.6).sort((a,b)=>Math.abs(toOklch(a)[0]-L)-Math.abs(toOklch(b)[0]-L));
      if(opts.length) return [{path:`brands.${fix.brand}.secondary`,value:opts[0],why:"This is the closest shade of your second color that makes the button words easy to read."}];}
    if(contrast(wordOn(br),br.primary)>=4.5) return [{path:"comp.button.bg",value:"action.primary",why:"Buttons use your main color, which already has easy-to-read words."}];
    return [{path:"comp.button.bg",value:"ink",why:"Buttons use the dark color with white words, which is always easy to read."}];}
  if(fix.kind==="primary"){const P=st.brands[fix.brand].primary, cur=wordOn(st.brands[fix.brand]);
    if(cur!=="#FFFFFF"&&contrast("#FFFFFF",P)>=4.5&&contrast("#FFFFFF",P)>=contrast(INK,P)) return [{path:`brands.${fix.brand}.onPrimary`,value:"white",why:"Your color stays the same. White words on it are easy to read."}];
    if(cur!==INK&&contrast(INK,P)>=4.5) return [{path:`brands.${fix.brand}.onPrimary`,value:"dark",why:"Your color stays the same. Dark words on it are easy to read."}];
    if(contrast("#FFFFFF",P)>=4.5) return [{path:`brands.${fix.brand}.onPrimary`,value:"white",why:"Your color stays the same. White words on it are easy to read."}];
    const nv=darkenTo(P,"#FFFFFF",4.6);
    return [{path:`brands.${fix.brand}.primary`,value:nv,why:"This is the closest shade to your color that makes white words easy to read."}];}
  if(fix.kind==="link"&&st.brands[fix.brand].wordGoal!=="best") return [{path:`brands.${fix.brand}.wordGoal`,value:"best",why:"Links, help text, and error words get a little darker so they reach 7 to 1. Your main color stays the same."}];
  if(fix.kind==="link"){const P=st.brands[fix.brand].primary;const nv=darkenTo(P,PAGE,7.05);
    return [{path:`brands.${fix.brand}.primary`,value:nv,why:"A slightly deeper main color makes links reach 7 to 1."}];}
  if(fix.kind==="field") return [{path:"comp.field.border",value:"border.strong",why:"The strong gray border is easy to see."}];
  if(fix.kind==="caps") return [{path:"comp.button.case",value:"sentence",why:"Sentence case is easier to read."}];
  if(fix.kind==="look"){const {brand:b,mode:md}=fix, base=`brands.${b}.look.${md}`, L=lookOf(st.brands[b],md), out=[];
    const ok=(t)=>{const k=colorsFor(t,b,md),all=[k.background,k.card,...k.pageSet,...k.cardSet];return all.every(x=>contrast(k.foreground,x)>=4.5&&contrast(k.mutedFg,x)>=4.5);};
    const t=clone(st);const T=()=>{t.brands[b].look=t.brands[b].look||{};t.brands[b].look[md]=Object.assign({},L,t.brands[b].look[md]||{});return t.brands[b].look[md];};
    if(L.kind==="image"){let v=L.veil;while(!ok(t)&&v<0.97){v=Math.min(0.97,+(v+0.05).toFixed(2));T().veil=v;}if(v!==L.veil) out.push({path:base+".veil",value:v,why:"A stronger color layer over the picture makes words easy to read."});}
    if(L.kind==="gradient"&&L.to){let x=normHex(L.to),n=0;const p=bgOf(st.brands[b],md,"page");while(!ok(t)&&n<20){x=mixHex(x,p,.85);T().to=x;n++;}if(n) out.push({path:base+".to",value:x,why:"The end of the gradient is closer to the page color, so words stay easy to read."});}
    if(!ok(t)&&L.glass<1){let g=L.glass;while(!ok(t)&&g<1){g=Math.min(1,+(g+0.05).toFixed(2));T().glass=g;}out.push({path:base+".glass",value:g,why:"More solid windows keep the page from showing through behind words."});}
    return out;}
  if(fix.kind==="slot") return [{path:fix.path,value:fix.value,why:"This is easier for older readers."}];
  return [];
}

/* =====================================================================
   PATHS, LABELS, DIFF
   ===================================================================== */
function getP(o,p){return p.split(".").reduce((a,k)=>a==null?a:a[k],o);}
function setP(o,p,v){const ks=p.split(".");let a=o;for(let i=0;i<ks.length-1;i++){if(a[ks[i]]==null||typeof a[ks[i]]!=="object")a[ks[i]]={};a=a[ks[i]];}a[ks[ks.length-1]]=v;}
function flat(o,pre="",out={}){for(const k in o){const v=o[k],p=pre?pre+"."+k:k;if(v&&typeof v==="object")flat(v,p,out);else out[p]=v;}return out;}
const SLOT={primary:"main color",secondary:"second color",accent:"accent color",onPrimary:"words on the main color"};
const CNAME={button:"Button",field:"Text field",select:"Select",card:"Card",dialog:"Pop-up (dialog)"};
function labelFor(p){const k=p.split(".");
  if(k[0]==="brands"&&k[2]==="palette"){if(k.length>3){const c=typeof S!=="undefined"?getP(S.draft,k.slice(0,-1).join(".")):null;return `${BN[k[1]]} ${c&&c.name?c.name:"color"}`;}return `${BN[k[1]]} color set`;}
  if(k[0]==="brands"&&k[2]==="bg") return `${BN[k[1]]} ${k[3]} mode ${k[4]==="page"?"page background":"window and card background"}`;
  if(k[0]==="brands"&&k[2]==="seeds"&&/^(light|dark)(Page|Card)$/.test(k[3])) return `${BN[k[1]]} ${k[3].replace(/(Page|Card)$/,"")} mode ${/Page$/.test(k[3])?"page background":"window background"} shade range`;
  if(k[0]==="brands"&&k[2]==="pairs"){const w={link:"link color",body:"body text color",tag:"tag word color",tagBg:"tag background",soft:"soft button word color",softBg:"soft button background"}[k[4]];return `${BN[k[1]]} ${k[3]} mode ${w||"word colors"}`;}
  if(k[0]==="brands"&&k[2]==="wordGoal") return `${BN[k[1]]} contrast goal for words`;
  if(k[0]==="brands"&&k[2]==="look"){const w={kind:"background style",to:"gradient end color",angle:"gradient direction",veil:"color layer over the picture",glass:"window see-through",blur:"window blur",img:"page picture"}[k[4]];return `${BN[k[1]]} ${k[3]} mode ${w||"page look"}`;}
  if(k[0]==="brands"&&k[2]==="seeds") return `${BN[k[1]]} ${SLOT[k[3]]||"color"} shade range`;
  if(k[0]==="brands") return `${BN[k[1]]} ${SLOT[k[2]]||k[2]}`;
  if(k[0]==="gray") return "Gray color";
  if(k[0]==="fontLib") return "Font library";
  if(k[0]==="system") return {danger:"Error color",success:"Success color",warning:"Warning color"}[k[1]];
  if(k[0]==="type") return {heading:"Heading font",body:"Body font",ui:"Label and navigation font",headingStyle:"Heading style",scale:"Type scale",headingWeight:"Heading weight",lineHeight:"Line spacing"}[k[1]];
  if(k[0]==="shape") return {radius:"Corner size",shadow:"Shadow"}[k[1]];
  if(k[0]==="density") return `${k[1]==="consumer"?"Consumer":"Employee"} ${{base:"text size",control:"control height",gap:"space between items",pad:"space inside cards"}[k[2]]}`;
  if(k[0]==="comp"){const sl=slotOf(k[1],k[2]);return `${REG[k[1]]?REG[k[1]].name:k[1]}: ${sl?sl.label.toLowerCase():k[2]}`;}
  if(k[0]==="guidance") return `AI guidance for ${REG[k[1]]?REG[k[1]].name:k[1]}`;
  return p;}
function fontLibSummary(L){const x=fontLibOf({fontLib:L}),files=Object.values(x.files).reduce((a,l)=>a+(l||[]).length,0);
  const parts=[x.added.length?`${x.added.length} added font${x.added.length>1?"s":""}`:"",x.removed.length?`${x.removed.length} hidden`:"",files?`${files} font file${files>1?"s":""}`:""].filter(Boolean);
  return parts.length?parts.join(", "):"The standard fonts";}
function palSummary(p){if(!p)return "No color set";const n=p.groups.reduce((a,g)=>a+g.colors.length,0);return `${n} colors in ${p.groups.length} groups`;}
function diff(a,b){const fa=flat(a),fb=flat(b),out=[],seen=new Set();
  new Set([...Object.keys(fa),...Object.keys(fb)]).forEach(k=>{if(k==="version"||fa[k]===fb[k])return;
    const m=k.match(/^brands\.(\w+)\.palette\./);
    if(m){const pp=`brands.${m[1]}.palette`;if(seen.has(pp))return;seen.add(pp);out.push({path:pp,from:palSummary(getP(a,pp)),to:palSummary(getP(b,pp))});return;}
    if(k.startsWith("fontLib.")){if(seen.has("fontLib"))return;seen.add("fontLib");out.push({path:"fontLib",from:fontLibSummary(a.fontLib),to:fontLibSummary(b.fontLib)});return;}
    const m2=k.match(/^brands\.(\w+)\.look\.(light|dark)\./);
    if(m2){const pp=`brands.${m2[1]}.look.${m2[2]}`;if(seen.has(pp))return;seen.add(pp);
      const ba=(a.brands||{})[m2[1]],bb=(b.brands||{})[m2[1]];out.push({path:pp,from:lookSummary(lookOf(ba,m2[2])),to:lookSummary(lookOf(bb,m2[2]))});return;}
    out.push({path:k,from:fa[k],to:fb[k]});});
  return out;}
function lookSummary(L){const pct=v=>Math.round(v*100)+"%";
  const base=L.kind==="gradient"&&L.to?`Gradient to ${normHex(L.to)}`:L.kind==="image"&&L.img?`Picture with a ${pct(L.veil)} color layer`:"Flat color";
  return base+(L.glass<1?`, windows ${pct(L.glass)} solid${L.blur?`, ${L.blur} px blur`:""}`:"");}
function applyCh(st,chs){const s=clone(st);chs.forEach(c=>setP(s,c.path,c.value));return s;}
/* Version numbers: patch (1.4.0 -> 1.4.1) for value tweaks, minor (-> 1.5.0) for new things, major (-> 2.0.0) when something apps use goes away.
   Without a bump, it is minor, like before. */
const BUMPS=["patch","minor","major"];
function nextVer(v,bump="minor"){const [a,b,c]=String(v||"0.0.0").split(".").map(n=>parseInt(n,10)||0);
  return bump==="major"?`${a+1}.0.0`:bump==="patch"?`${a}.${b}.${c+1}`:`${a}.${b+1}.0`;}
/* Suggests a bump by comparing the CSS variables apps use. A removed variable can break an app, so that is major. */
function cssVarNames(st){return new Set((themeCss(st,"x").match(/--[a-z0-9-]+(?=\s*:)/gi)||[]));}
function bumpFor(pub,draft){const a=cssVarNames(pub),b=cssVarNames(draft),removed=[...a].filter(x=>!b.has(x)),added=[...b].filter(x=>!a.has(x));
  if(removed.length) return {bump:"major",removed,added,why:`${removed.length} CSS variable${removed.length>1?"s that apps may use are":" that apps may use is"} gone, like ${removed.slice(0,3).join(", ")}. Apps that use ${removed.length>1?"them":"it"} need a change.`};
  if(added.length) return {bump:"minor",removed,added,why:`This adds ${added.length} new CSS variable${added.length>1?"s":""}, like ${added.slice(0,3).join(", ")}. Nothing apps use goes away.`};
  return {bump:"patch",removed,added,why:"Only values change, like colors and sizes. Every name apps use stays the same."};}
/* =====================================================================
   OUTPUTS: W3C design token files, theme.css for Tailwind v4 + shadcn,
   component settings, and the component manifest for AI tools.
   ===================================================================== */
function dtColor(hex){const [r,g,b]=hexToRgb(hex).map(v=>+(v/255).toFixed(4));return {colorSpace:"srgb",components:[r,g,b],hex:hex.toLowerCase()};}
function hexOfDt(v){if(typeof v==="string") return normHex(v);if(v&&v.hex) return normHex(v.hex);if(v&&Array.isArray(v.components)) return rgbToHex(v.components.map(x=>x*255));return "#000000";}
function slug(t){return String(t).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function dim(n){return {value:n,unit:"px"};}
function dimVal(v){return typeof v==="number"?v:(v&&typeof v.value==="number"?v.value:0);}
const EXT="org.brand-console";

/* ---- the editable state <-> DTCG files (the source of truth on disk) ---- */
/* Standard tokens for the page look. The full settings, including a picture, are kept in $extensions. */
function lookTokens(br,md){const L=lookOf(br,md),o={"window-opacity":{$type:"number",$value:L.glass,$description:"How solid windows and cards are. 1 is fully solid."},"window-blur":{$type:"dimension",$value:dim(L.blur),$description:"How much windows blur what is behind them."}};
  if(L.kind==="gradient"&&L.to) o["page-gradient"]={$type:"gradient",$value:[{color:dtColor(bgOf(br,md,"page")),position:0},{color:dtColor(L.to),position:1}],$description:"The page background gradient.",$extensions:{[EXT]:{direction:L.angle}}};
  return o;}
function stateToFiles(st){
  const f={};
  BRANDS.forEach(B=>{const br=st.brands[B.id];if(!br) return;
    const doc={$description:`${B.name} brand colors. Only this file changes between brands.`,
      $extensions:{[EXT]:{name:B.name,division:B.div,wordsOnMainColor:br.onPrimary,...(br.wordGoal==="best"?{contrastGoal:7}:{}),...(br.seeds?{shadeRangeFrom:br.seeds}:{}),...(br.look?{pageLook:br.look}:{}),...(br.pairs?{pickedPairs:br.pairs}:{})}},
      color:{$type:"color",brand:{
        primary:{$value:dtColor(br.primary),$description:"Main color. Used for buttons, links, and the keyboard focus outline."},
        secondary:{$value:dtColor(br.secondary),$description:"Second color. Used for tags, badges, and selected rows."},
        accent:{$value:dtColor(br.accent),$description:"Accent color. Used for small touches like logos and charts. Never for words."}},
      surface:{$description:"Page and window backgrounds for light and dark mode. Picked from the brand's color set.",
        ...Object.fromEntries(["light","dark"].map(md=>[md,{page:{$value:dtColor(bgOf(br,md,"page")),$description:"The page background.",...(bgChosen(br,md,"page")?{}:{$extensions:{[EXT]:{automatic:true}}})},card:{$value:dtColor(bgOf(br,md,"card")),$description:"Windows, cards, and pop-ups.",...(bgChosen(br,md,"card")?{}:{$extensions:{[EXT]:{automatic:true}}})},...lookTokens(br,md)}]))}}};
    if(br.palette) doc.color.palette=Object.fromEntries(br.palette.groups.map((g,gi)=>[g.id,{$description:g.note,$extensions:{[EXT]:{name:g.name,order:gi}},
      ...Object.fromEntries(g.colors.map((c,ci)=>[slug(c.name),{$value:dtColor(c.hex),$extensions:{[EXT]:{name:c.name,share:c.share,order:ci,...(c.shade?{shade:c.shade}:{})}}}]))}]));
    f[`tokens/brands/${B.id}.tokens.json`]=doc;});
  const d=st.density;
  f["tokens/foundations.tokens.json"]={
    $description:"Foundations shared by every brand.",
    color:{$type:"color",gray:{$value:dtColor(st.gray==="brand"?grayOf(st,BRANDS[0].id)[500]:GRAYS[st.gray]||GRAYS.warm),$description:"The gray that borders, help text, and quiet backgrounds are made from.",$extensions:{[EXT]:{style:st.gray||"warm"}}},status:{danger:{$value:dtColor(st.system.danger),$description:"Errors and delete buttons."},success:{$value:dtColor(st.system.success),$description:"Messages that say something worked."},warning:{$value:dtColor(st.system.warning),$description:"Messages that need attention soon."}}},
    font:{family:{$type:"fontFamily",...Object.fromEntries([["heading",st.type.heading,"Headings."],["body",st.type.body,"Body text."],["ui",uiFont(st),"Labels, navigation, tabs, and buttons."]].map(([k,n,d])=>{const F=FONTS[n];return [k,{$value:[n,...(F.standIn&&!F.hosted?[F.standIn]:[]),...FALLBACK[F.cat].replace(/'/g,"").split(",")],$description:d,...(F.licensed&&!F.hosted?{$extensions:{[EXT]:{needsLicense:true,freeLookAlike:F.standIn}}}:{})}];})),
      $extensions:{[EXT]:{headingStyle:st.type.headingStyle||"normal"}}},
      weight:{$type:"fontWeight",heading:{$value:st.type.headingWeight}}},
    "line-height":{$type:"number",body:{$value:st.type.lineHeight}},
    "type-scale":{$type:"number",ratio:{$value:st.type.scale,$description:"How much bigger each heading is than the one below it."}},
    radius:{$type:"dimension",base:{$value:dim(st.shape.radius),$description:"Medium corners. Small and large are made from this."}},
    size:{$type:"dimension",$description:"Set by the admin team. Large text multiplies these by about 1.12.",
      ...Object.fromEntries(CTX.map(c=>[c,{"text-base":{$value:dim(d[c].base)},control:{$value:dim(d[c].control)},gap:{$value:dim(d[c].gap)},inset:{$value:dim(d[c].pad)}}]))},
    $extensions:{[EXT]:{defaultShadow:st.shape.shadow,...(()=>{const L=fontLibOf(st);return L.added.length||L.removed.length||Object.keys(L.files).length?{fontLibrary:L}:{};})()}}};
  f["tokens/components.tokens.json"]={
    $description:"Settings and AI guidance for every component. Settings are kept in $extensions because they are choices, not raw values.",
    component:Object.fromEntries(REG_ORDER.map(id=>{const r=REG[id];return [id,{$description:r.desc,$extensions:{[EXT]:{name:r.name,category:r.cat,level:r.level,settings:{...(st.comp[id]||{})},guidance:st.guidance[id]||""}}}];}))};
  f["tokens/design-system.resolver.json"]={name:"Design system",version:"2025.10",
    description:"Ties the token files together. Pick a brand. Screen type, text size, and mode are applied by theme.css.",
    sets:{foundations:{sources:[{$ref:"foundations.tokens.json"}]},components:{sources:[{$ref:"components.tokens.json"}]}},
    modifiers:{brand:{contexts:Object.fromEntries(BRANDS.map(b=>[b.id,[{$ref:`brands/${b.id}.tokens.json`}]])),default:BRANDS[0].id}},
    resolutionOrder:[{$ref:"#/sets/foundations"},{$ref:"#/sets/components"},{$ref:"#/modifiers/brand"}]};
  return f;
}
function filesToState(files){
  const st=clone(BASE);st.brands={};
  BRANDS.forEach(B=>{const doc=files[`tokens/brands/${B.id}.tokens.json`];if(!doc) return;const x=(doc.$extensions||{})[EXT]||{},cb=doc.color.brand;
    const br={primary:hexOfDt(cb.primary.$value),secondary:hexOfDt(cb.secondary.$value),accent:hexOfDt(cb.accent.$value),onPrimary:x.wordsOnMainColor||"white"};
    if(doc.color.surface){br.bg={};["light","dark"].forEach(md=>{const g=doc.color.surface[md];if(!g)return;["page","card"].forEach(w=>{const t=g[w];if(t&&!((t.$extensions||{})[EXT]||{}).automatic){br.bg[md]=br.bg[md]||{};br.bg[md][w]=hexOfDt(t.$value);}});});}
    if(x.pageLook) br.look=clone(x.pageLook);
    if(x.contrastGoal===7) br.wordGoal="best";
    if(x.pickedPairs) br.pairs=clone(x.pickedPairs);
    if(x.shadeRangeFrom) br.seeds=Object.fromEntries(Object.entries(x.shadeRangeFrom).map(([k,v])=>[k,normHex(v)]));
    if(doc.color.palette){br.palette={groups:Object.entries(doc.color.palette).map(([gid,g])=>{const gx=(g.$extensions||{})[EXT]||{};
      const colors=Object.entries(g).filter(([k])=>!k.startsWith("$")).map(([k,t])=>{const tx=(t.$extensions||{})[EXT]||{};return {name:tx.name||k,hex:hexOfDt(t.$value),share:tx.share||0,order:tx.order??0,...(tx.shade?{shade:normHex(tx.shade)}:{})};}).sort((a,b)=>a.order-b.order).map(({order,...c})=>c);
      return {id:gid,name:gx.name||gid,note:g.$description||"",order:gx.order??0,colors};}).sort((a,b)=>a.order-b.order).map(({order,...g})=>g)};}
    st.brands[B.id]=br;});
  const fd=files["tokens/foundations.tokens.json"];
  if(fd&&fd.color&&fd.color.gray) st.gray=((fd.color.gray.$extensions||{})[EXT]||{}).style||"warm";
  if(fd&&((fd.$extensions||{})[EXT]||{}).fontLibrary) st.fontLib=clone(fd.$extensions[EXT].fontLibrary);
  if(fd){st.system={danger:hexOfDt(fd.color.status.danger.$value),success:hexOfDt(fd.color.status.success.$value),warning:hexOfDt(fd.color.status.warning.$value)};
    st.type={heading:fd.font.family.heading.$value[0],body:fd.font.family.body.$value[0],...(fd.font.family.ui?{ui:fd.font.family.ui.$value[0]}:{}),headingStyle:((fd.font.family.$extensions||{})[EXT]||{}).headingStyle||"normal",scale:fd["type-scale"].ratio.$value,headingWeight:fd.font.weight.heading.$value,lineHeight:fd["line-height"].body.$value};
    st.shape={radius:dimVal(fd.radius.base.$value),shadow:((fd.$extensions||{})[EXT]||{}).defaultShadow||"soft"};
    CTX.forEach(c=>{const g=fd.size[c];st.density[c]={base:dimVal(g["text-base"].$value),control:dimVal(g.control.$value),gap:dimVal(g.gap.$value),pad:dimVal(g.inset.$value)};});}
  const fc=files["tokens/components.tokens.json"];
  if(fc) Object.entries(fc.component||{}).forEach(([id,t])=>{const x=(t.$extensions||{})[EXT]||{};if(x.settings) st.comp[id]={...(st.comp[id]||{}),...x.settings};if(typeof x.guidance==="string") st.guidance[id]=x.guidance;});
  return withDefaults(st);
}
function withDefaults(st){
  registerFonts(st);
  if(st.fontLib){const L=fontLibOf(st);if(!L.added.length&&!L.removed.length&&!Object.keys(L.files).length) delete st.fontLib;else st.fontLib=L;}
  Object.values(st.brands||{}).forEach(br=>{if(br.bg&&!Object.keys(br.bg).length) delete br.bg;});
  st.comp=st.comp||{};st.guidance=st.guidance||{};
  REG_ORDER.forEach(id=>{st.comp[id]={...(BASE.comp[id]||REG[id].defaults||{}),...(st.comp[id]||{})};if(st.guidance[id]===undefined) st.guidance[id]=BASE.guidance[id]||REG[id].guide||"";});
  if(!GRAYS[st.gray]&&st.gray!=="brand") st.gray="warm";
  if(FONTS[st.type.heading]===undefined) st.type.heading=BASE.type.heading;
  if(!FONTS[st.type.ui]) st.type.ui=FONTS[st.type.body]?st.type.body:BASE.type.body;
  if(st.type.headingStyle!=="italic") st.type.headingStyle="normal";
  if(FONTS[st.type.body]===undefined) st.type.body=BASE.type.body;
  return st;
}

/* ---- CSS variables, split by what they depend on ---- */
function varsColor(st,b,mode){
  const c=colorsFor(st,b,mode), C=st.comp;
  return {"--background":c.background,"--foreground":c.foreground,"--card":c.card,"--card-foreground":c.foreground,
    "--primary":c.P,"--primary-foreground":c.onP,"--secondary":c.secondary,"--secondary-foreground":c.secondaryFg,
    "--muted":c.muted,"--muted-foreground":c.mutedFg,"--accent":c.accent,"--accent-foreground":c.accentFg,
    "--destructive":c.danger,"--destructive-foreground":c.dangerFg,"--destructive-text":c.dangerText,"--destructive-soft":c.dangerSoft,"--primary-edge":c.edge,"--btn-border":c.btnBorder,
    "--success":c.success,"--success-soft":c.successSoft,"--warning":c.warning,"--warning-soft":c.warningSoft,
    "--border":c.border,"--input":c.input,"--ring":c.ring,"--link":c.link,
    "--btn-bg":c.btnBg,"--btn-fg":c.btnFg,"--btn-bg-hover":c.btnHover,"--field-border":c.input,
    "--card-border":C.card.border==="on"?"1px solid "+c.border:"none",
    "--page-fill":c.fill,"--panel":c.panel,"--panel-blur":(c.blur||0)+"px"};
}
function varsSize(st,ctx,size){const z=sizesFor(st,ctx,size);
  return {"--text-base":z.base+"px","--text-sm":z.sm+"px","--text-h1":z.h1+"px","--text-h2":z.h2+"px","--text-h3":z.h3+"px","--control-h":z.control+"px","--gap":z.gap+"px","--pad":z.pad+"px"};}
function varsStatic(st){const C=st.comp;
  const v={"--radius":st.shape.radius+"px",
    "--font-heading":FONTS[st.type.heading].stack,"--font-body":FONTS[st.type.body].stack,"--font-ui":FONTS[uiFont(st)].stack,"--heading-style":st.type.headingStyle==="italic"&&FONTS[st.type.heading].italic?"italic":"normal","--heading-w":st.type.headingWeight,"--lh":st.type.lineHeight,
    "--btn-radius":rad(st,C.button.radius)+"px","--btn-weight":C.button.weight,"--btn-case":C.button.case==="upper"?"uppercase":"none","--btn-track":C.button.case==="upper"?".06em":({normal:"0",wide:".02em",wider:".04em"}[C.button.track]||"0"),"--btn-pad-x":C.button.pad==="roomy"?".6":".42",
    "--field-border-w":"1.5px","--field-radius":rad(st,C.field.radius)+"px","--label-weight":C.field.labelWeight,"--menu-shadow":shadow(C.select.menuShadow),
    "--card-radius":rad(st,C.card.radius)+"px","--card-shadow":shadow(C.card.shadow),
    "--dialog-radius":rad(st,C.dialog.radius)+"px","--overlay":(C.dialog.overlay/100).toFixed(2),"--dialog-justify":"flex-end","--dialog-dir":C.dialog.order==="end"?"row":"row-reverse"};
  compVars(st).split(";").filter(Boolean).forEach(kv=>{const i=kv.indexOf(":");v[kv.slice(0,i)]=kv.slice(i+1);});
  return v;}
function css(o){return Object.entries(o).map(([k,x])=>k+":"+x).join(";");}
function pvVars(st,b,ctx,size,mode){
  return css(varsColor(st,b,mode||(typeof S!=="undefined"?S.ui.mode:"light")))+";"+css(varsSize(st,ctx,size))+";"+css(varsStatic(st));
}

function themeCss(st,version){
  const L=[],block=(sel,o)=>{L.push(`${sel} {`,...Object.entries(o).map(([k,x])=>`  ${k}: ${x};`),`}`,``);};
  L.push(`/* Generated by the Brand Console from version ${version}. Do not edit by hand. */`,
    `/* Import this after Tailwind: @import "tailwindcss"; @import "./theme.css"; */`,
    `/* Put these on <html>: data-brand="${BRANDS.map(b=>b.id).join("|")}" data-screen="consumer|employee" data-size="standard|large" data-mode="light|dark" */`,``,
    ...(fontFaceCss(st,"./")?[`/* Your company's own font files. They are in the fonts folder next to this file. */`,fontFaceCss(st,"./"),``]:[]),
    `@theme inline {`,
    ...["background","foreground","card","card-foreground","primary","primary-foreground","secondary","secondary-foreground","muted","muted-foreground","accent","accent-foreground","destructive","destructive-foreground","destructive-text","destructive-soft","primary-edge","panel","border","input","ring","link","success","warning"].map(k=>`  --color-${k}: var(--${k});`),
    `  --radius-md: var(--radius);`,`  --font-sans: var(--font-body);`,`  --font-heading: var(--font-heading);`,`  --font-ui: var(--font-ui);`,`}`,``);
  block(":root",varsStatic(st));
  BRANDS.forEach((B,i)=>{const br=st.brands[B.id];const v=varsColor(st,B.id,"light");
    if(br.palette) br.palette.groups.forEach(g=>g.colors.forEach(x=>{v["--brand-"+slug(x.name)]=x.hex.toLowerCase();}));
    block(`${i===0?":root, ":""}[data-brand="${B.id}"]`,v);});
  BRANDS.forEach((B,i)=>block(`[data-mode="dark"][data-brand="${B.id}"]${i===0?`, [data-mode="dark"]:not([data-brand])`:""}`,varsColor(st,B.id,"dark")));
  CTX.forEach(c=>SZ.forEach(s=>block(`${c==="consumer"&&s==="large"?":root, ":""}[data-screen="${c}"][data-size="${s}"]`,varsSize(st,c,s))));
  L.push(`/* Base styles every product gets. */`,`body { background: var(--page-fill) center / cover no-repeat fixed, var(--background); color: var(--foreground); font-family: var(--font-body); font-size: var(--text-base); line-height: var(--lh); }`,``);
  return L.join("\n");
}
function manifest(st,version){
  return {$description:"Read by Storybook and AI tools. One entry per component.",version,
    components:REG_ORDER.map(id=>{const r=REG[id];return {id,name:r.name,category:CATN[r.cat],level:r.level,description:r.desc,builtFrom:(r.from||[]).filter(x=>REG[x]),
      props:(r.props||[]).map(([name,values,notes])=>({name,values,notes})),settings:{...(st.comp[id]||{})},accessibility:r.a11y||"",guidance:st.guidance[id]||""};}),
    ...(typeof ICONS!=="undefined"?{icons:{$description:"The only icons teams should use. Names match lucide-react (Calendar for calendar, HeartPulse for heart-pulse). Always put words next to an icon, or give a lone icon a label.",set:ICON_SET.name,version:ICON_SET.version,lineThickness:(st.comp.icon||{}).stroke||2,groups:ICON_CATS.map(([id,label,names])=>({id,label,names}))}}:{})};
}
function settingsJson(st){const names=[st.type.heading,st.type.body,uiFont(st)],L=fontLibOf(st);
  return {brands:BRANDS.map(b=>b.id),fonts:{heading:st.type.heading,body:st.type.body,labels:uiFont(st),headingStyle:st.type.headingStyle||"normal",href:fontHref(names),
    needLicense:[...new Set(names.filter(n=>FONTS[n]&&FONTS[n].licensed&&!FONTS[n].hosted))],
    files:[...new Set(names)].flatMap(n=>(L.files[n]||[]).map(x=>({family:n,weight:Number(x.weight)||400,style:x.style==="italic"?"italic":"normal",file:x.file})))},components:st.comp};}
/* Every token with its final value: role colors per brand and mode, sizes per screen type and text size, and the
   CSS variables from theme.css. For tools that cannot run this engine. It is a snapshot, not a set of aliases:
   tokens/*.tokens.json stay the source, and this file is made again from them on every build and publish. */
function resolvedTokens(st,version){
  const isHex=v=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v);
  const colors=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>isHex(v)).map(([k,v])=>[k.slice(2),{$value:dtColor(v)}]));
  const px=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k.slice(2),{$value:dim(parseFloat(v))}]));
  const txt=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,String(v)]));
  const brandCss=(B,md)=>{const v=varsColor(st,B.id,md),br=st.brands[B.id];
    if(md==="light"&&br.palette) br.palette.groups.forEach(g=>g.colors.forEach(x=>{v["--brand-"+slug(x.name)]=x.hex.toLowerCase();}));return txt(v);};
  return {
    $description:`Every design token with its final value, made from version ${version}. theme.css has the same values. Colors are per brand and light or dark mode. Sizes are per screen type (consumer or employee) and text size (standard or large). This is a snapshot: it has no aliases. Edit the brand in the Brand Console, not this file.`,
    $extensions:{[EXT]:{version,format:"resolved-1",aliases:false,
      css:{$description:"The CSS variables in theme.css, as text, grouped by where they apply.",
        shared:txt(varsStatic(st)),
        brand:Object.fromEntries(BRANDS.filter(B=>st.brands[B.id]).map(B=>[B.id,{light:brandCss(B,"light"),dark:brandCss(B,"dark")}])),
        size:Object.fromEntries(CTX.map(c=>[c,Object.fromEntries(SZ.map(z=>[z,txt(varsSize(st,c,z))]))]))}}},
    color:{$type:"color",...Object.fromEntries(BRANDS.filter(B=>st.brands[B.id]).map(B=>{const br=st.brands[B.id];
      return [B.id,{$description:`${B.name} colors, by mode. Names match the CSS variables without the two dashes.`,
        light:colors(varsColor(st,B.id,"light")),dark:colors(varsColor(st,B.id,"dark")),
        ...(br.palette?{palette:Object.fromEntries(br.palette.groups.flatMap(g=>g.colors).map(x=>[slug(x.name),{$value:dtColor(x.hex)}]))}:{})}];}))},
    size:{$type:"dimension",...Object.fromEntries(CTX.map(c=>[c,Object.fromEntries(SZ.map(z=>[z,px(varsSize(st,c,z))]))]))},
  };
}
function files(st,version){
  const f={};const src=stateToFiles(st);Object.keys(src).forEach(k=>f[k.replace(/^tokens\//,"tokens/")]=src[k]);
  f["theme.css"]=themeCss(st,version);
  f["components.manifest.json"]=manifest(st,version);
  f["settings.json"]=settingsJson(st);
  f["tokens.resolved.json"]=resolvedTokens(st,version);
  f["components.json"]={"$schema":"https://ui.shadcn.com/schema.json",style:"new-york",tailwind:{css:"src/styles/theme.css",baseColor:"neutral",cssVariables:true},registries:{"@your-org":"https://design.your-org.com/r/{name}.json"}};
  f[".mcp.json"]={mcpServers:{"design-system":{type:"http",url:"http://localhost:6006/mcp"},shadcn:{command:"npx",args:["shadcn@latest","mcp"]}}};
  return f;
}
