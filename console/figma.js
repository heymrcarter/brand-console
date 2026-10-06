/* Figma sync: the console's values as Figma variables, and back again.
   The console uses this for file import and export. The server uses it with the Figma REST API.
   Either side can change anything. When both sides change the same thing, a person picks which one to keep. */
const FIG_COLLS=[
  {id:"brand",name:"Brand colors",desc:"The main, second, and accent colors for each brand. Made by the Brand Console."},
  {id:"theme",name:"Theme colors",desc:"Every color the components use, for each brand in light and dark mode. Made by the Brand Console."},
  {id:"sets",name:"Color sets",desc:"Each brand's official color set. Made by the Brand Console."},
  {id:"found",name:"Foundations",desc:"Fonts, type sizes, corners, shadows, spacing, and shared colors. Made by the Brand Console."},
  {id:"comp",name:"Component settings",desc:"The choices the brand team makes for each component. Made by the Brand Console."}];
const FIG_COLL=Object.fromEntries(FIG_COLLS.map(c=>[c.id,c]));
function figModes(cid){return cid==="brand"?BRANDS.map(b=>b.name):cid==="theme"?BRANDS.flatMap(b=>[b.name+" light",b.name+" dark"]):["Value"];}
function figModeBrand(cid,mode){const b=BRANDS.find(x=>mode===x.name||mode.startsWith(x.name+" "));return b?b.id:null;}
function figModeMd(mode){return /dark$/.test(mode)?"dark":"light";}
/* Figma variable names cannot have dots or curly brackets. A slash makes a group. */
function figName(t){return String(t).replace(/[.{}]/g,"-").replace(/\//g,"-").replace(/\s+/g," ").trim()||"Unnamed";}

/* ---- values ---- */
function figHex(v){if(typeof v!=="string")return null;const s=v.trim();
  const m=s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if(m){const a=m[4]===undefined?1:+m[4];return rgbToHex([+m[1],+m[2],+m[3]])+(a<1?Math.round(a*255).toString(16).padStart(2,"0").toUpperCase():"");}
  if(/^#?[0-9a-f]{8}$/i.test(s)){const h=normHex(s.slice(-8).length===8&&s[0]==="#"?s:"#"+s.replace("#",""));return h.slice(7)==="FF"?h.slice(0,7):h;}
  if(/^#?[0-9a-f]{6}$/i.test(s))return normHex(s);
  if(/^#?[0-9a-f]{3}$/i.test(s)){const t=s.replace("#","");return normHex(t.split("").map(c=>c+c).join(""));}
  return null;}
function figColorIn(v){/* Figma {r,g,b,a}, DTCG color objects, or text */
  if(v&&typeof v==="object"&&"r" in v&&"g" in v&&"b" in v){const h=rgbToHex([v.r*255,v.g*255,v.b*255]),a=v.a===undefined?1:v.a;return a<0.999?h+Math.round(a*255).toString(16).padStart(2,"0").toUpperCase():h;}
  if(v&&typeof v==="object"&&(v.hex||Array.isArray(v.components))){const h=v.hex?figHex(v.hex):rgbToHex(v.components.map(x=>x*255));const a=v.alpha===undefined?1:v.alpha;return h&&a<0.999&&h.length===7?h+Math.round(a*255).toString(16).padStart(2,"0").toUpperCase():h;}
  return figHex(typeof v==="string"?v:"");}
function figColorOut(hex){const h=figHex(hex)||"#000000",[r,g,b]=hexToRgb(h.slice(0,7)),a=h.length===9?parseInt(h.slice(7),16)/255:1;return {r:+(r/255).toFixed(5),g:+(g/255).toFixed(5),b:+(b/255).toFixed(5),a:+a.toFixed(4)};}
function figNorm(type,v){if(v===undefined||v===null)return undefined;
  if(type==="COLOR")return figColorIn(v)||undefined;
  if(type==="FLOAT"){const n=typeof v==="number"?v:v&&typeof v==="object"&&typeof v.value==="number"?v.value:parseFloat(v);return isFinite(n)?+n.toFixed(4):undefined;}
  if(Array.isArray(v))return String(v[0]??"").trim();
  return String(v).trim();}
function figSame(type,a,b){return a!==undefined&&b!==undefined&&figNorm(type,a)===figNorm(type,b);}

/* ---- the model: every value the console shares with Figma ---- */
const FIG_THEME_LABEL={background:"page background",foreground:"body text",card:"window and card background","card-foreground":"words on windows and cards",primary:"main color","primary-foreground":"words on the main color",
  secondary:"soft button background","secondary-foreground":"soft button words",muted:"quiet background","muted-foreground":"help text",accent:"tag background","accent-foreground":"tag words",
  destructive:"error button","destructive-foreground":"words on the error button","destructive-text":"error words","destructive-soft":"error message background","primary-edge":"edge of filled shapes","btn-border":"main button edge",
  success:"success color","success-soft":"success message background",warning:"warning color","warning-soft":"warning message background",border:"light border",input:"field border",ring:"keyboard focus outline",link:"links",
  "btn-bg":"main button","btn-fg":"main button words","btn-bg-hover":"main button under the mouse","field-border":"field border",panel:"window color with see-through"};
/* Theme colors a person can set directly. The rest are made from other colors. */
const FIG_THEME_SET={background:["bg","page"],card:["bg","card"],foreground:["pairs","body"],link:["pairs","link"],accent:["pairs","tagBg"],"accent-foreground":["pairs","tag"],secondary:["pairs","softBg"],"secondary-foreground":["pairs","soft"]};
const FIG_RANGES={"type.headingWeight":[100,900],"type.scale":[1.05,1.6],"type.lineHeight":[1.1,2.2],"shape.radius":[0,40],base:[12,28],control:[24,80],gap:[2,48],pad:[4,64]};
function figInRange(k,v){const r=FIG_RANGES[k];return !r||(v>=r[0]&&v<=r[1]);}
function figSetBg(st,b,md,which,hex){const br=st.brands[b];br.bg=br.bg||{};br.bg[md]={...(br.bg[md]||{}),[which]:hex};br.seeds={...(br.seeds||{}),[BG_KEYS[md][which]]:hex};}
function figSetPair(st,b,md,k,hex){const br=st.brands[b];br.pairs=br.pairs||{};br.pairs[md]={...(br.pairs[md]||{}),[k]:hex};}
function figModel(st){
  const E=[],add=(coll,name,type,o)=>E.push({key:`${coll}::${name}`,coll,name,type,modes:figModes(coll),...o});
  /* Brand colors */
  [["primary","Main color","The brand's main color. Buttons, links, and checked boxes use it."],["secondary","Second color","Used for tags, badges, and selected rows."],["accent","Accent color","Small touches, like a logo mark or a chart line. Never used for words."]].forEach(([k,n,d])=>
    add("brand",n,"COLOR",{desc:d,label:m=>`${m} ${n.toLowerCase()}`,get:(s,m)=>s.brands[figModeBrand("brand",m)][k],
      set:(s,m,v)=>{if(v.length!==7)return "The console needs a solid color here, with no see-through.";const b=figModeBrand("brand",m);s.brands[b][k]=v;s.brands[b].seeds={...(s.brands[b].seeds||{}),[k]:v};}}));
  add("brand","Words on main color","COLOR",{desc:"The word color on the main color. White or dark.",label:m=>`${m} words on the main color`,get:(s,m)=>wordOn(s.brands[figModeBrand("brand",m)]),
    set:(s,m,v)=>{if(v.length!==7)return "The console needs a solid color here, with no see-through.";const br=s.brands[figModeBrand("brand",m)];br.onPrimary=v==="#FFFFFF"?"white":v===INK?"dark":v;}});
  /* Theme colors */
  const one=s=>Object.fromEntries(BRANDS.flatMap(B=>["light","dark"].map(md=>[`${B.name} ${md}`,varsColor(s,B.id,md)])));
  const cache=new WeakMap(),vars=s=>{if(!cache.has(s))cache.set(s,one(s));return cache.get(s);};
  Object.keys(FIG_THEME_LABEL).forEach(k=>{const set=FIG_THEME_SET[k];
    add("theme",k,"COLOR",{desc:`The ${FIG_THEME_LABEL[k]}. In code: var(--${k}).`+(set?"":" The console makes this color from your other colors."),code:`var(--${k})`,label:m=>`${m} mode ${FIG_THEME_LABEL[k]}`,
      get:(s,m)=>figHex(vars(s)[m]["--"+k])||undefined,
      ro:set?null:"The console makes this color from your other colors, so it cannot take a value from Figma. Change the colors it is made from instead.",
      set:set?(s,m,v)=>{if(v.length!==7)return "The console needs a solid color here, with no see-through.";const b=figModeBrand("theme",m),md=figModeMd(m);if(set[0]==="bg")figSetBg(s,b,md,set[1],v);else figSetPair(s,b,md,set[1],v);}:null});});
  /* Color sets */
  BRANDS.forEach(B=>{const pal=st.brands[B.id]&&st.brands[B.id].palette;if(!pal)return;
    pal.groups.forEach(g=>g.colors.forEach(c=>add("sets",`${figName(B.name)}/${figName(g.name)}/${figName(c.name)}`,"COLOR",{desc:`Part of the ${B.name} color set, in the ${g.name} group.`,palette:{b:B.id,g:g.name,c:c.name},
      label:()=>`${B.name} color set: ${c.name}`,get:()=>c.hex,
      set:(s,m,v)=>{if(v.length!==7)return "The console needs a solid color here, with no see-through.";const x=figPalFind(s,B.id,g.name,c.name);if(!x)return "This color is no longer in the color set.";x.hex=v;}})));});
  /* Foundations */
  [["heading","Font/Heading","Headings"],["body","Font/Body","Body text"],["ui","Font/Labels","Labels, navigation, and buttons"]].forEach(([k,n,d])=>add("found",n,"STRING",{desc:`The font for ${d.toLowerCase()}. It must be in the console's font library.`,label:()=>`${d} font`,
    get:s=>k==="ui"?uiFont(s):s.type[k],set:(s,m,v)=>{if(!FONTS[v])return `${v} is not in the font library. Add it on the Type page first, then sync again.`;s.type[k]=v;}}));
  add("found","Font/Heading style","STRING",{desc:"normal or italic.",label:()=>"Heading style",get:s=>s.type.headingStyle||"normal",set:(s,m,v)=>{if(!["normal","italic"].includes(v))return "Use normal or italic.";s.type.headingStyle=v;}});
  [["headingWeight","Font/Heading weight","Heading weight"],["scale","Type/Scale","Type scale"],["lineHeight","Type/Line height","Line spacing"]].forEach(([k,n,l])=>add("found",n,"FLOAT",{desc:l+".",label:()=>l,get:s=>s.type[k],
    set:(s,m,v)=>{if(!figInRange("type."+k,v))return `${v} is outside what the console allows for ${l.toLowerCase()} (${FIG_RANGES["type."+k].join(" to ")}).`;s.type[k]=k==="headingWeight"?Math.round(v/100)*100:v;}}));
  add("found","Corners/Base radius","FLOAT",{desc:"Medium corners, in pixels. Small and large corners are made from this.",label:()=>"Corner size",get:s=>s.shape.radius,set:(s,m,v)=>{if(!figInRange("shape.radius",v))return "Use a corner size from 0 to 40 pixels.";s.shape.radius=Math.round(v);}});
  add("found","Shadow/Default","STRING",{desc:"none, soft, or strong.",label:()=>"Shadow",get:s=>s.shape.shadow,set:(s,m,v)=>{if(!["none","soft","strong"].includes(v))return "Use none, soft, or strong.";s.shape.shadow=v;}});
  CTX.forEach(c=>[["base","Body text"],["control","Control height"],["gap","Space between items"],["pad","Space inside cards"]].forEach(([k,l])=>add("found",`Size/${c==="consumer"?"Consumer":"Employee"}/${l}`,"FLOAT",{desc:`${l} on ${c} screens, in pixels. Set by the admin team.`,admin:true,
    label:()=>`${c==="consumer"?"Consumer":"Employee"} ${l.toLowerCase()}`,get:s=>s.density[c][k],set:(s,m,v)=>{if(!figInRange(k,v))return `${v} pixels is outside what the console allows (${FIG_RANGES[k].join(" to ")}).`;s.density[c][k]=Math.round(v);}})));
  [["danger","Colors/Error"],["success","Colors/Success"],["warning","Colors/Warning"]].forEach(([k,n])=>add("found",n,"COLOR",{desc:`The shared ${n.slice(7).toLowerCase()} color. Both brands use it.`,label:()=>`${n.slice(7)} color`,get:s=>s.system[k],
    set:(s,m,v)=>{if(v.length!==7)return "The console needs a solid color here, with no see-through.";s.system[k]=v;}}));
  add("found","Colors/Gray style","STRING",{desc:"warm, neutral, cool, or brand.",label:()=>"Gray color",get:s=>s.gray||"warm",set:(s,m,v)=>{if(!["warm","neutral","cool","brand"].includes(v))return "Use warm, neutral, cool, or brand.";s.gray=v;}});
  /* Component settings */
  REG_ORDER.forEach(id=>(REG[id].slots||[]).forEach(sl=>{if(!sl.opts||!sl.opts.length)return;const num=typeof sl.opts[0][0]==="number";
    add("comp",`${figName(REG[id].name)}/${figName(sl.label)}`,num?"FLOAT":"STRING",{desc:`Pick one: ${sl.opts.map(([v,l])=>`${v} (${l})`).join(", ")}.`,opts:sl.opts.map(([v])=>String(v)),
      label:()=>`${REG[id].name}: ${sl.label.toLowerCase()}`,get:s=>(s.comp[id]||{})[sl.k],
      set:(s,m,v)=>{const o=sl.opts.find(([x])=>String(x)===String(num?+v:v));if(!o)return `Use one of these: ${sl.opts.map(([x,l])=>`${x} (${l})`).join(", ")}.`;s.comp[id]={...(s.comp[id]||{}),[sl.k]:o[0]};}});}));
  return E;
}
function figPalFind(st,b,gName,cName){const pal=st.brands[b]&&st.brands[b].palette;if(!pal)return null;const g=pal.groups.find(x=>figName(x.name)===figName(gName));return g&&g.colors.find(x=>figName(x.name)===figName(cName))||null;}
function figFlat(st){const out={};figModel(st).forEach(e=>e.modes.forEach(m=>{const v=figNorm(e.type,e.get(st,m));if(v!==undefined)out[`${e.key}@@${m}`]=v;}));return out;}

/* ---- reading Figma ---- */
/* From GET /v1/files/:key/variables/local. Aliases are followed to their color or number. */
function figFromRest(meta){
  const colls=meta&&meta.variableCollections||{},vars=meta&&meta.variables||{};
  const out={vals:{},types:{},ids:{},colls:{},alias:{},extra:0,source:"api"};
  const byName={};Object.values(colls).forEach(c=>{if(!c.remote&&!c.isExtension&&!byName[c.name])byName[c.name]=c;});
  FIG_COLLS.forEach(fc=>{const c=byName[fc.name];if(c)out.colls[fc.id]={id:c.id,defaultModeId:c.defaultModeId,modes:Object.fromEntries((c.modes||[]).map(m=>[m.name,m.modeId]))};});
  const resolve=(val,modeName,depth)=>{if(!(val&&typeof val==="object"&&val.type==="VARIABLE_ALIAS"))return val;if(depth>12)return undefined;
    const t=vars[val.id];if(!t)return undefined;const c=colls[t.variableCollectionId];const m=c&&((c.modes||[]).find(x=>x.name===modeName)||{modeId:c.defaultModeId});
    if(!m||!t.valuesByMode)return undefined;
    return resolve(t.valuesByMode[m.modeId],modeName,depth+1);};
  Object.values(vars).forEach(v=>{if(v.remote)return;const c=colls[v.variableCollectionId];const fc=c&&byName[c.name]===c&&FIG_COLLS.find(x=>x.name===c.name);if(!fc){out.extra++;return;}
    const key=`${fc.id}::${v.name}`;out.ids[key]=v.id;out.types[key]=v.resolvedType;
    (c.modes||[]).forEach(m=>{const raw=(v.valuesByMode||{})[m.modeId];if(raw&&typeof raw==="object"&&raw.type==="VARIABLE_ALIAS")out.alias[`${key}@@${m.name}`]=true;
      const val=figNorm(v.resolvedType,resolve(raw,m.name,0));if(val!==undefined)out.vals[`${key}@@${m.name}`]=val;});});
  return out;
}
/* From token files exported by Figma (or by this console). Each file is one mode of one collection. */
function figGuessFile(name,json){
  const x=json&&json.$extensions&&json.$extensions[EXT]||{};
  let coll=FIG_COLLS.find(c=>c.name===x.collection||c.id===x.collection);
  const low=String(name||"").toLowerCase();
  if(!coll)coll=FIG_COLLS.slice().sort((a,b)=>b.name.length-a.name.length).find(c=>low.includes(c.name.toLowerCase()));
  if(!coll){/* by the names inside */const names=new Set(figFileTokens(json).map(t=>t.name));const score=c=>figModel(BASE_FOR_GUESS()).filter(e=>e.coll===c.id&&names.has(e.name)).length;coll=FIG_COLLS.map(c=>[c,score(c)]).sort((a,b)=>b[1]-a[1]).find(([,n])=>n>0)?.[0];}
  if(!coll)return {coll:null,mode:null};
  const modes=figModes(coll.id);let mode=modes.includes(x.mode)?x.mode:null;
  if(!mode&&modes.length===1)mode=modes[0];
  if(!mode)mode=modes.slice().sort((a,b)=>b.length-a.length).find(m=>low.includes(m.toLowerCase()))||null;
  return {coll:coll.id,mode};}
let __guessBase=null;function BASE_FOR_GUESS(){if(!__guessBase)__guessBase=withDefaults(clone(BASE));return __guessBase;}
function figFileTokens(json){const out=[];const walk=(o,path,type)=>{if(!o||typeof o!=="object")return;const t=o.$type||type;
  if("$value" in o){out.push({name:path.join("/"),type:t,value:o.$value});return;}
  Object.keys(o).forEach(k=>{if(!k.startsWith("$"))walk(o[k],[...path,k],t);});};walk(json,[],undefined);return out;}
function figFromFiles(list){/* list: [{name, json, coll, mode}] */
  const out={vals:{},types:{},ids:{},colls:{},extra:0,source:"files"},model=figModel(BASE_FOR_GUESS());
  const T={color:"COLOR",number:"FLOAT",dimension:"FLOAT",fontWeight:"FLOAT",string:"STRING",fontFamily:"STRING",boolean:"BOOLEAN"};
  list.forEach(f=>{if(!f.coll||!f.mode)return;out.colls[f.coll]=out.colls[f.coll]||{modes:{}};out.colls[f.coll].modes[f.mode]=f.mode;
    figFileTokens(f.json).forEach(t=>{const key=`${f.coll}::${t.name}`;const type=T[t.type]||(model.find(e=>e.key===key)||{}).type||(typeof t.value==="number"?"FLOAT":typeof t.value==="string"&&!figHex(t.value)?"STRING":"COLOR");
      out.types[key]=type;const v=figNorm(type,t.value);if(v!==undefined)out.vals[`${key}@@${f.mode}`]=v;});});
  return out;}

/* ---- writing Figma ---- */
/* Token files for Figma's own variable import. One file per collection and mode. */
function figFiles(st){
  const model=figModel(st),files=[];
  FIG_COLLS.forEach(c=>figModes(c.id).forEach(mode=>{const root={$description:c.desc,$extensions:{[EXT]:{collection:c.name,mode}}};
    model.filter(e=>e.coll===c.id).forEach(e=>{const v=figNorm(e.type,e.get(st,mode));if(v===undefined)return;
      const parts=e.name.split("/");let o=root;parts.slice(0,-1).forEach(p=>{o[p]=o[p]||{};o=o[p];});
      const val=e.type==="COLOR"?(()=>{const x=figColorOut(v);return {colorSpace:"srgb",components:[x.r,x.g,x.b],alpha:x.a,hex:v.slice(0,7).toLowerCase()};})():v;
      o[parts[parts.length-1]]={$type:e.type==="COLOR"?"color":e.type==="FLOAT"?"number":"string",$value:val,$description:e.desc};});
    files.push({name:`${c.name} - ${mode}.tokens.json`,json:root});}));
  return files;}

/* ---- comparing ---- */
/* Three-way compare. base is what both sides agreed on at the last sync.
   status: same, console (changed here), figma (changed in Figma), both (changed on both sides), new (not in Figma yet),
   gone (removed in Figma), extra (a color set color only in Figma), fixed (made by the console), bad (Figma's value does not fit). */
function figCompare(st,remote,base,opt={}){
  const rows=[],model=figModel(st),B=(base&&base.rows)||{},first=!base||!base.rows;
  model.forEach(e=>e.modes.forEach(mode=>{const rk=`${e.key}@@${mode}`,c=figNorm(e.type,e.get(st,mode)),f=remote.vals[rk],b=B[rk];
    const r={rk,key:e.key,coll:e.coll,name:e.name,mode,type:e.type,label:e.label(mode),c,f,b,canFigma:true,why:""};
    if(remote.alias&&remote.alias[rk]){r.alias=true;
      if(f===undefined){r.status="alias";r.canFigma=false;r.canConsole=false;r.pick="skip";r.why="In Figma, this points to another variable that the console cannot read. The console leaves it alone. Fix it in Figma if it is wrong.";rows.push(r);return;}}
    if(remote.types[e.key]&&remote.types[e.key]!==e.type){r.status="type";r.canFigma=false;r.canConsole=false;r.why=`In Figma, ${e.name} is a ${remote.types[e.key].toLowerCase()} variable, not a ${e.type.toLowerCase()}. Rename or delete it in Figma, then sync again.`;r.pick="skip";rows.push(r);return;}
    if(f!==undefined&&figSame(e.type,c,f)){r.status="same";r.pick="same";rows.push(r);return;}
    if(f===undefined){r.status=b!==undefined&&!first?"gone":"new";r.canFigma=e.coll==="sets"&&r.status==="gone";r.pick=r.status==="gone"&&e.coll==="sets"&&figSame(e.type,c,b)?"figma":"console";
      r.why=r.status==="gone"?(e.coll==="sets"?"Someone removed this color from Figma.":"Someone removed this from Figma. The console needs it, so it puts it back."):"Figma does not have this yet.";rows.push(r);return;}
    if(e.ro){r.status="fixed";r.canFigma=false;r.pick=r.alias?"skip":"console";r.why=r.alias?"In Figma, this points to another variable, so the console leaves it alone.":e.ro;if(r.alias)r.canConsole=false;rows.push(r);return;}
    if(e.admin&&opt.role!=="admin"){r.adminOnly=true;}
    const err=figTry(st,e,mode,f);if(err){r.status="bad";r.canFigma=false;r.pick="console";r.why=err;rows.push(r);return;}
    if(first||b===undefined){r.status="both";r.pick=opt.firstPick||"figma";r.why="Both have a value, and they are different.";}
    else if(figSame(e.type,c,b)){r.status="figma";r.pick="figma";}
    else if(figSame(e.type,f,b)){r.status="console";r.pick="console";}
    else {r.status="both";r.pick=null;r.why="It changed in both places since the last sync. Pick the one to keep.";}
    if(r.adminOnly){r.canFigma=false;r.pick="skip";r.why="Only the admin team can change this. Switch to Admin team to sync it.";}
    /* Figma points this to another variable. Sending the console's value would replace that link, so the console only reads it. */
    if(r.alias){r.canConsole=false;if(r.pick==="console")r.pick="skip";
      r.why=(r.why?r.why+" ":"")+"In Figma, this points to another variable. To change it there, change the variable it points to.";}
    rows.push(r);}));
  /* Color set colors that are only in Figma */
  const setModes=figModes("sets");
  Object.keys(remote.vals).forEach(rk=>{const [key,mode]=rk.split("@@");if(!key.startsWith("sets::")||model.some(e=>e.key===key)||!setModes.includes(mode))return;
    const parts=key.slice(6).split("/");const B0=BRANDS.find(b=>figName(b.name)===parts[0]);if(!B0||parts.length!==3)return;
    const f=remote.vals[rk],b=B[rk],was=b!==undefined&&!first;
    const r={rk,key,coll:"sets",name:key.slice(6),mode,type:"COLOR",label:`${B0.name} color set: ${parts[2]}`,c:undefined,f,b,extra:{b:B0.id,g:parts[1],c:parts[2]}};
    if(remote.alias&&remote.alias[rk])Object.assign(r,{status:"alias",canFigma:false,canConsole:false,pick:"skip",why:"In Figma, this color points to another variable. The console leaves it alone."});
    else if(String(f).length!==7)Object.assign(r,{status:"bad",canFigma:false,canConsole:false,pick:"skip",why:"This color is see-through in Figma. A color set needs solid colors, so the console leaves it alone."});
    else if(was)Object.assign(r,{status:"deleted",canFigma:true,canConsole:true,pick:figSame("COLOR",f,b)?"console":null,
      why:figSame("COLOR",f,b)?"You removed this color from the color set here.":"You removed this color here, and someone changed it in Figma. Pick the one to keep."});
    else Object.assign(r,{status:"extra",canFigma:true,canConsole:false,pick:"figma",why:"This color is in Figma but not in the console's color set."});
    rows.push(r);});
  return rows;}
/* Picks a person cannot make are ignored, so a request cannot take a value the review did not offer. */
function figCleanPicks(rows,picks){const out={};Object.entries(picks||{}).forEach(([rk,v])=>{const r=rows.find(x=>x.rk===rk);if(!r||!["console","figma","skip"].includes(v))return;
  if(v==="figma"&&!r.canFigma)return;if(v==="console"&&r.canConsole===false)return;out[rk]=v;});return out;}
function figTry(st,e,mode,v){const s=clone(st);try{return e.set?e.set(s,mode,v)||"":e.ro||"This cannot be changed from Figma.";}catch(err){return "This value does not fit here.";}}
function figSummary(rows){const n=k=>rows.filter(r=>r.status===k).length;const diff=rows.filter(r=>r.status!=="same");
  return {total:rows.length,same:n("same"),diff:diff.length,toFigma:diff.filter(r=>r.pick==="console"&&r.status!=="type").length,toConsole:diff.filter(r=>r.pick==="figma").length,open:diff.filter(r=>r.pick===null).length,both:n("both")};}

/* Applies the rows picked from Figma to a copy of the state. */
function figApply(st,rows,picks){
  const s=clone(st),errors=[],model=figModel(st),byKey=Object.fromEntries(model.map(e=>[e.key,e]));
  const pickOf=r=>picks&&picks[r.rk]!==undefined?picks[r.rk]:r.pick;
  const changedMain=new Set(),wordRows=new Set();
  rows.forEach(r=>{if(pickOf(r)!=="figma"||r.status==="same")return;
    if(r.extra){const pal=s.brands[r.extra.b].palette||(s.brands[r.extra.b].palette={groups:[]});let g=pal.groups.find(x=>figName(x.name)===figName(r.extra.g));
      if(!g){let id=slug(r.extra.g)||"more",k=2;while(pal.groups.some(x=>x.id===id))id=slug(r.extra.g)+"-"+k++;g={id,name:r.extra.g,note:"Colors added in Figma.",colors:[]};pal.groups.push(g);}
      const ex=g.colors.find(x=>figName(x.name)===figName(r.extra.c));if(ex)ex.hex=r.f.slice(0,7);else g.colors.push({name:r.extra.c,hex:r.f.slice(0,7),share:2});return;}
    const e=byKey[r.key];if(!e){errors.push(`${r.label}: not found.`);return;}
    if(r.status==="gone"&&e.palette){const br=s.brands[e.palette.b];if(["primary","secondary","accent"].some(k=>normHex(br[k])===normHex(r.c))){errors.push(`${r.label}: it is a brand color, so the console kept it.`);return;}
      const pal=br.palette,g=pal&&pal.groups.find(x=>figName(x.name)===figName(e.palette.g));if(g)g.colors=g.colors.filter(x=>figName(x.name)!==figName(e.palette.c));return;}
    if(r.f===undefined)return;
    const err=e.set?e.set(s,r.mode,r.f):"This cannot be changed from Figma.";if(err){errors.push(`${r.label}: ${err}`);return;}
    if(e.coll==="brand"&&e.name==="Main color")changedMain.add(figModeBrand("brand",r.mode));
    if(e.coll==="brand"&&e.name==="Words on main color")wordRows.add(figModeBrand("brand",r.mode));});
  /* Keep words on a new main color readable, the same way the console does. */
  changedMain.forEach(b=>{if(wordRows.has(b))return;const br=s.brands[b],w=wordsForNewMain(br);if(w&&br.onPrimary!=="auto")br.onPrimary=w;});
  return {state:withDefaults(s),errors};}

/* The body for POST /v1/files/:key/variables that makes Figma match the state.
   It creates missing collections, modes, and variables, updates values that differ, and removes color set colors picked for removal. */
function figPushBody(st,remote,rows,picks){
  const pickOf=r=>picks&&picks[r.rk]!==undefined?picks[r.rk]:r.pick;
  const skip=new Set(rows.filter(r=>pickOf(r)==="skip"||r.status==="type"||r.status==="alias"||r.alias).map(r=>r.rk));
  const body={variableCollections:[],variableModes:[],variables:[],variableModeValues:[]},collId={},modeId={},varId={};
  FIG_COLLS.forEach(c=>{const have=remote.colls[c.id],modes=figModes(c.id);
    if(!have){const tc="c_"+c.id,tm="m_"+c.id+"_0";collId[c.id]=tc;body.variableCollections.push({action:"CREATE",id:tc,name:c.name,initialModeId:tm});
      body.variableModes.push({action:"UPDATE",id:tm,name:modes[0],variableCollectionId:tc});modeId[c.id]={[modes[0]]:tm};
      modes.slice(1).forEach((m,i)=>{const id=`m_${c.id}_${i+1}`;body.variableModes.push({action:"CREATE",id,name:m,variableCollectionId:tc});modeId[c.id][m]=id;});}
    else{collId[c.id]=have.id;modeId[c.id]={...have.modes};modes.forEach((m,i)=>{if(!modeId[c.id][m]){const id=`m_${c.id}_${i}`;body.variableModes.push({action:"CREATE",id,name:m,variableCollectionId:have.id});modeId[c.id][m]=id;}});}});
  let n=0;
  figModel(st).forEach(e=>{const anyRow=e.modes.some(m=>!skip.has(`${e.key}@@${m}`));if(!anyRow)return;
    let id=remote.ids[e.key];if(remote.types[e.key]&&remote.types[e.key]!==e.type)return;
    if(!id){id="v_"+(n++);body.variables.push({action:"CREATE",id,name:e.name,variableCollectionId:collId[e.coll],resolvedType:e.type,description:e.desc,...(e.code?{codeSyntax:{WEB:e.code}}:{})});}
    varId[e.key]=id;
    e.modes.forEach(m=>{const rk=`${e.key}@@${m}`;if(skip.has(rk))return;const v=figNorm(e.type,e.get(st,m));if(v===undefined)return;
      if(remote.ids[e.key]&&figSame(e.type,remote.vals[rk],v))return;
      body.variableModeValues.push({variableId:id,modeId:modeId[e.coll][m],value:e.type==="COLOR"?figColorOut(v):v});});});
  /* Color set colors that were removed here, and picked for removal in Figma too. */
  const del=new Set();rows.filter(r=>r.status==="deleted"&&pickOf(r)==="console"&&remote.ids[r.key]).forEach(r=>{if(del.has(r.key))return;del.add(r.key);body.variables.push({action:"DELETE",id:remote.ids[r.key]});});
  ["variableCollections","variableModes","variables","variableModeValues"].forEach(k=>{if(!body[k].length)delete body[k];});
  return body;}
/* After a sync with files: only rows that were uploaded, and whose Figma value is known to match, count as agreed.
   Values going to Figma count only after the next upload shows them in Figma. */
function figBaseAfterFiles(prev,st,rows,picks){const pickOf=r=>picks&&picks[r.rk]!==undefined?picks[r.rk]:r.pick;const flat=figFlat(st),out={...((prev&&prev.rows)||{})};
  rows.forEach(r=>{if(r.status==="same"||(pickOf(r)==="figma"&&flat[r.rk]!==undefined&&figSame(r.type,flat[r.rk],r.f)))out[r.rk]=r.f;});
  return {rows:out};}
/* What both sides agree on after a sync, so the next compare can tell who changed what. */
function figBaseAfter(st,rows,picks){const pickOf=r=>picks&&picks[r.rk]!==undefined?picks[r.rk]:r.pick;const flat=figFlat(st),out={};
  rows.forEach(r=>{const p=pickOf(r);if(p==="skip"||r.status==="type"){if(r.b!==undefined)out[r.rk]=r.b;return;}if(flat[r.rk]!==undefined)out[r.rk]=flat[r.rk];});
  Object.keys(flat).forEach(k=>{if(!(k in out)&&!rows.some(r=>r.rk===k&&(pickOf(r)==="skip"||r.status==="type")))out[k]=flat[k];});
  return {rows:out};}
