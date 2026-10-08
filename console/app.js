/* =====================================================================
   STATE
   ===================================================================== */
const S={
  role:"admin", me:null,
  sec:"color",
  published:null,
  base:null,             // the design system at the proposal's newest commit, or null with no proposal
  proposal:null, notice:null,
  draft:null,
  ui:{brand:"",q:"",openCats:{},mode:"light",ba:false,baPos:50,chrome:null,compare:false,ctx:"consumer",size:"large",vp:"desktop",asst:window.innerWidth>1100,exportFile:"theme.css",src:"sample",baBase:"live",baView:"slider",publishNote:null,confirmRb:null},
  history:[],
  storybook:"http://127.0.0.1:6006",
  save:"saved", saveErr:"",
  preview:null,          // proposal id being previewed
  msgs:[], props:{}, nextId:1,
  voice:null, draftText:"", thinking:null,
  ai:{server:false, model:null, live:false, tried:false}
};

function showVal(p,v){
  const ai=p.match(/^brands\.[^.]+\.ai\.(color|name|picture)$/);
  if(ai){const list={color:AI_SOURCES,picture:AI_PICTURES}[ai[1]];if(list) return esc((list.find(([x])=>x===(v??list[0][0]))||list[0])[1]);return v&&String(v).trim()?esc(`"${v}"`):`<span class="under">Assistant</span>`;}
  if(v===undefined) return `<span class="under">None</span>`;
  if(typeof v==="string"&&hexOk(v)&&v.startsWith("#")) return `<span class="sw" style="background:${v}"></span>${v}`;
  if(p.startsWith("guidance")) return "new text";
  if(p.startsWith("comp.")){const ks=p.split(".");const sl=slotOf(ks[1],ks[2]);if(sl&&sl.type==="text") return esc(`"${String(v).length>60?String(v).slice(0,57)+"…":v}"`);const o=sl&&sl.opts&&sl.opts.find(([x])=>String(x)===String(v));if(o) return esc(o[1]);}
  if(p.endsWith(".radius")&&RADII[v]) return RADII[v];
  if(ROLE_LABEL[v]) return ROLE_LABEL[v];
  if(p==="shape.radius") return v+" px";
  if(p==="comp.dialog.overlay") return v+"%";
  if(p==="comp.dialog.order") return v==="end"?"Main button on the right":"Main button on the left";
  if(p==="comp.button.case") return v==="upper"?"ALL CAPITALS":"Sentence case";
  return esc(String(v));}
/* Brands are data: the draft's brands, in order. The first one is the default. */
function brands(){return brandList(S.draft);}
function bn(id){return brandName(S.draft,id);}
/* Undo puts an edit back the way it is in the proposal, or live with no proposal. A whole brand added or removed,
   and the brand order, are one edit each. */
function undoPath(p,from=baseState()){
  if(p==="brandOrder"){const pub=Object.keys(from.brands),cur=Object.keys(S.draft.brands);
    S.draft.brands=Object.fromEntries([...pub.filter(id=>cur.includes(id)),...cur.filter(id=>!pub.includes(id))].map(id=>[id,S.draft.brands[id]]));return;}
  const wb=p.match(/^brands\.([^.]+)$/);
  if(wb){const id=wb[1],was=from.brands[id];
    if(!was){if(Object.keys(S.draft.brands).length<2){toast("A design system needs at least one brand, so I kept this one.");return;}delete S.draft.brands[id];return;}
    const order=Object.keys(S.draft.brands);order.splice(Math.min(Object.keys(from.brands).indexOf(id),order.length),0,id);
    S.draft.brands=Object.fromEntries(order.map(x=>[x,x===id?clone(was):S.draft.brands[x]]));return;}
  const v=getP(from,p);if(v===undefined){const ks=p.split(".");delete getP(S.draft,ks.slice(0,-1).join("."))[ks[ks.length-1]];}else setP(S.draft,p,clone(v));}
/* =====================================================================
   HELPERS
   ===================================================================== */
const I={
  spark:(s=13)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9.4l-4.7 1.8L12 16l-1.8-4.8L5.5 9.4l4.7-1.8z"/></svg>`,
  mic:(c="#fff",s=16)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>`,
  send:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  stop:'<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  chevL:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  chevR:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  chevD:(c="currentColor")=>`<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`,
  lock:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  check:(c="#fff",s=10)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 7"/></svg>`,
  x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  n:{
    figma:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
    icons:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.9 6.9L22 10l-5.5 4.6L18.2 22 12 18.3 5.8 22l1.7-7.4L2 10l7.1-1.1z"/></svg>',
    library:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    brands:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="8" rx="2"/><rect x="13" y="4" width="8" height="8" rx="2"/><rect x="3" y="14" width="8" height="6" rx="2"/><path d="M17 14v6M14 17h6"/></svg>',
    color:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor"/><path d="M12 21a3 3 0 0 1 0-6h2"/></svg>',
    type:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>',
    space:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16M20 4v16M8 12h8M8 12l2-2M8 12l2 2M16 12l-2-2M16 12l-2 2"/></svg>',
    shape:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10a6 6 0 0 1 6-6h10"/></svg>',
    button:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="3"/><path d="M8 12h8"/></svg>',
    field:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="10" rx="2"/><path d="M7 11v4M3 4h8"/></svg>',
    select:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M14 11l2 2 2-2"/></svg>',
    card:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h6"/></svg>',
    dialog:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2" stroke-dasharray="2 3"/><rect x="6" y="7" width="12" height="10" rx="2"/></svg>',
    checks:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
    history:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
    export:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
    proposal:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>'}
};
function gbadge(s=24){return `<div class="gbadge" style="width:${s}px;height:${s}px">${I.spark(Math.round(s*.54))}</div>`;}
function btn(label,a,o={}){const data=o.data?Object.entries(o.data).map(([k,v])=>` data-${k}="${esc(v)}"`).join(""):"";
  return `<button class="btn${o.p?" p":""}${o.s?" s":""}${o.danger?" danger":""}" data-a="${a}"${data}${o.dis?" disabled":""}>${esc(label)}</button>`;}
function seg(bind,val,opts,o={}){return `<div class="seg" role="group"${o.label?` aria-label="${esc(o.label)}"`:""}>${opts.map(([v,l])=>`<button type="button" class="${String(v)===String(val)?"on":""}" data-seg="${bind}" data-v="${esc(v)}"${o.dis?" disabled":""} aria-pressed="${String(v)===String(val)}">${esc(l)}</button>`).join("")}</div>`;}
let toastT=null;
function toast(m){let el=document.querySelector(".toast");if(!el){el=document.createElement("div");el.className="toast";el.setAttribute("role","status");document.body.appendChild(el);}el.textContent=m;clearTimeout(toastT);toastT=setTimeout(()=>el.remove(),2800);}
const canEdit=()=>S.role!=="designer";
const isAdmin=()=>S.role==="admin";
const checks=()=>runChecks(S.draft);
const counts=()=>{const c=checks();return {block:c.filter(x=>x.level==="block").length,warn:c.filter(x=>x.level==="warn").length,pass:c.filter(x=>x.level==="pass").length};};
/* Edits: what is not in the proposal yet. With no proposal, everything that is not live. */
const baseState=()=>S.base||S.published;
const changes=()=>diff(baseState(),S.draft);

/* =====================================================================
   NAV
   ===================================================================== */
const NAV=[
  ["Foundations",[["brands","Brands"],["color","Color"],["type","Type"],["space","Spacing and size"],["shape","Corners and shadows"],["icons","Icons"]]],
  ["Components",[]],
  ["Release",[["checks","Checks"],["proposal","Proposal"],["history","Versions"],["export","Use it in apps and Figma"],["figma","Sync with Figma"]]]];
const CAT_ICON={actions:"button",inputs:"field",structure:"field",feedback:"checks",content:"card",navigation:"export",overlays:"dialog",data:"select",layout:"shape",health:"checks"};
function nrow(id,l,m="",cls=""){return `<button class="nrow${cls}${S.sec===id?" on":""}" data-a="go" data-s="${id}" ${S.sec===id?'aria-current="page"':""}>${cls?"":(I.n[id]||"")}<span>${esc(l)}</span>${m}</button>`;}
function nav(){
  const k=counts(), ch=changes().length, q=(S.ui.q||"").trim().toLowerCase();
  const meta=id=>{if(id==="checks") return k.block?`<span class="m bad">${k.block} to fix</span>`:k.warn?`<span class="m">${k.warn} tips</span>`:"";
    if(id==="brands") return `<span class="m">${brands().length}</span>`;
    if(id==="proposal") return S.proposal?`<span class="m">${S.proposal.state==="in review"?"In review":"Draft"}</span>`:ch?`<span class="m">${ch} edit${ch>1?"s":""}</span>`:"";if(id==="history") return `<span class="m">v${S.published.version}</span>`;
    if(id==="figma") return S.figma&&S.figma.connected?`<span class="m">${S.figma.lastSync?agoShort(S.figma.lastSync):"Ready"}</span>`:"";return "";};
  const curCat=REG[S.sec]&&REG[S.sec].cat;
  let comps=`<div class="navfind"><input id="navq" type="search" placeholder="Find a component" value="${esc(S.ui.q||"")}" aria-label="Find a component" autocomplete="off"></div>`+nrow("library","All components",`<span class="m">${REG_ORDER.length}</span>`);
  if(q){const hits=REG_ORDER.filter(id=>(REG[id].name+" "+REG[id].desc+" "+CATN[REG[id].cat]).toLowerCase().includes(q));
    comps+=hits.length?hits.map(id=>nrow(id,REG[id].name,"", " sub")).join(""):`<div class="under" style="padding:6px 12px">No components match.</div>`;}
  else comps+=CATS.map(([c,cl])=>{const ids=REG_ORDER.filter(id=>REG[id].cat===c);const open=S.ui.openCats[c]??(c===curCat);
    return `<button class="ncat" data-a="cat" data-c="${c}" aria-expanded="${open}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg><span>${cl}</span><span class="m">${ids.length}</span></button>`+(open?ids.map(id=>nrow(id,REG[id].name,""," sub")).join(""):"");}).join("");
  const list=NAV.map(([g,items])=>`<div class="label">${g}</div>`+(g==="Components"?comps:items.map(([id,l])=>nrow(id,l,meta(id))).join(""))).join("");
  const opts=NAV.map(([g,items])=>g==="Components"?`<optgroup label="Components"><option value="library"${S.sec==="library"?" selected":""}>All components</option></optgroup>`+CATS.map(([c,cl])=>`<optgroup label="${cl}">${REG_ORDER.filter(id=>REG[id].cat===c).map(id=>`<option value="${id}"${S.sec===id?" selected":""}>${esc(REG[id].name)}</option>`).join("")}</optgroup>`).join(""):`<optgroup label="${g}">${items.map(([id,l])=>`<option value="${id}"${S.sec===id?" selected":""}>${l}</option>`).join("")}</optgroup>`).join("");
  let dt,ds;
  const P=S.proposal, pr=P?(P.number?`Proposal #${P.number}`:"Your proposal"):"";
  if(!ch){dt=P?`${pr} is ${P.state==="in review"?"in review":"a draft"}.`:"No edits. Live is the newest version.";ds=P?"Every edit is in it. Edit anything to add more.":"Edit anything to start. Nothing changes in apps until a proposal lands.";}
  else if(k.block){dt=`${ch} edit${ch>1?"s":""} not in a proposal yet`;ds=`${k.block} problem${k.block>1?"s":""} must be fixed before you can add ${ch>1?"them":"it"}.`;}
  else {dt=`${ch} edit${ch>1?"s":""} not in a proposal yet`;ds=P?`Add ${ch>1?"them":"it"} to ${pr.toLowerCase()} when you are ready.`:"Add them to a proposal when you are ready. Your edits are saved here until then.";}
  return `<nav class="nav" aria-label="Sections"><div class="navsel"><label class="label" for="navsel" style="display:block;margin-bottom:4px">Section</label><select id="navsel" class="sel">${opts}</select></div>
    <div class="navlist">${figNavButton()}${list}</div>
    <div class="draftbox"><div class="dt">${dt}</div>${canEdit()?`<div class="btns">${btn(P?"Open the proposal":"Add to a proposal","go",{p:1,s:1,data:{s:"proposal"},dis:!ch&&!P})}</div>`:""}<div class="under">${ds}</div><div class="under" id="savenote" aria-live="polite"></div></div></nav>`;
}
function topbar(){
  return `<div class="top"><div style="display:flex;align-items:center;gap:12px;min-width:0"><div class="gbadge" style="width:26px;height:26px;border-radius:7px;background:conic-gradient(${brands().map((b,i)=>`${S.draft.brands[b.id].primary} ${i*100/brands().length}% ${(i+1)*100/brands().length}%`).join(",")})"></div><div class="t">Brand Console</div><div class="v hide-s">Design system for ${brands().length} brand${brands().length>1?"s":""}</div></div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end">${peeps()}${S.me?`<span class="who hide-s" title="Signed in as ${esc(S.me.email)}">${esc(S.me.name||S.me.email)}</span>`:""}${S.offline?"":`<a class="sblink hide-s" href="${esc(S.storybook)}" target="_blank" rel="noopener">Open Storybook</a>`}<span class="pill ok">Live: v${S.published.version}</span>${S.proposal?(S.proposal.url?`<a class="pill ${S.proposal.state==="in review"?"warn":"neutral"} hide-s" href="${esc(S.proposal.url)}" target="_blank" rel="noopener" title="${esc(reviewSummary(S.proposal)||"Open the pull request")}">${S.proposal.state==="in review"?"In review":"Draft proposal"}: #${S.proposal.number}</a>`:`<span class="pill neutral hide-s">Draft proposal</span>`):""}${changes().length?`<span class="pill warn hide-s">Draft edits</span>`:""}</div></div>`;
}

/* =====================================================================
   PREVIEW
   ===================================================================== */
function pvState(){if(S.preview&&S.props[S.preview]) return applyCh(S.draft,S.props[S.preview].changes);return S.draft;}
function pvControls(){
  const u=S.ui;
  const ch=changes().length;
  return `<div class="pvhead"><div class="r1"><span class="t">Live preview</span><span class="under" style="margin-left:auto">Click any part to edit it.</span></div>
    <div class="pvctl">
      ${!realOn()?`<div class="g"><span>Compare with</span>${seg("ui.baBase",u.baBase,[["live","Live version"],["last","Your last change"]],{label:"Compare with"})}</div><div class="g"><span>Show</span>${seg("ui.baView",u.baView||"slider",[["slider","Slider"],["side","Side by side"]],{label:"How to compare"})}</div>`:""}
      ${STORY[S.sec]&&!S.offline?`<div class="g"><span>Preview</span>${seg("ui.src",u.src,[["sample","Console sample"],["real","Real component"]],{label:"Preview source"})}</div>`:""}
      <div class="g"><span>Mode</span>${seg("ui.mode",u.mode,[["light","Light"],["dark","Dark"]],{label:"Color mode"})}</div>
      <div class="g"><span>Screen</span>${seg("ui.ctx",u.ctx,[["consumer","Consumer"],["employee","Employee"]],{label:"Screen type"})}</div>
      <div class="g"><span>Size</span>${seg("ui.size",u.size,[["standard","Standard"],["large","Large"]],{label:"Text size"})}</div>
      <div class="g"><span>Device</span>${seg("ui.vp",u.vp,[["desktop","Computer"],["phone","Phone"]],{label:"Device"})}</div>
    </div></div>`;
}
/* Real React components, rendered by Storybook */
/* Every component has a real React story in Storybook. Its id comes from the story title, which is the component name. */
const STORY_FIX={"date-input":"components-date-input",badge:"components-badge",dialog:"components-dialog",icon:"foundations-icons"};
const STORY=Object.fromEntries(REG_ORDER.map(id=>[id,STORY_FIX[id]||(REG[id].cat==="ai"?"ai-":"components-")+REG[id].name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")]));
function storyFrame(kind){const u=S.ui;const g=`brand:${u.brand};screen:${u.ctx};size:${u.size};mode:${u.mode}`;
  return `<div class="sbframe${u.vp==="phone"?" phone":""}"><iframe title="${esc(REG[kind].name)} in Storybook" src="${esc(S.storybook)}/iframe.html?id=${STORY[kind]}--all&viewMode=story&globals=${g}"></iframe></div><p class="under" style="margin-top:8px">This is the real React component running in Storybook. It updates a moment after your change is saved. If it is blank, Storybook may still be starting.</p>`;}
/* Big pictures are kept as short blob links in the preview, so the page stays fast. */
const BLOBS=new Map();
function lightStyle(css){return css.replace(/url\('(data:[^']+)'\)/g,(m,d)=>{if(!BLOBS.has(d)){try{const [h,b64]=d.split(",");const bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);BLOBS.set(d,URL.createObjectURL(new Blob([arr],{type:h.slice(5).split(";")[0]})));}catch(e){return m;}}return `url('${BLOBS.get(d)}')`;});}
function frame(st,kind,extra=""){const u=S.ui;const inner=kind==="screen"?(u.ctx==="consumer"?consumerScreen():employeeScreen()):specimen(kind,st);
  return `<div class="pvframe${u.vp==="phone"?" phone":""}"${extra}><div class="pv${u.vp==="phone"?" is-phone":""}" style="${lightStyle(pvVars(st,u.brand,u.ctx,u.size))}">${inner}</div></div>`;}
/* The preview always shows before and after. The real Storybook component is the one exception. */
function realOn(){return S.ui.src==="real"&&!!STORY[S.sec]&&!S.offline;}
function preview(kind){
  const st=pvState(), u=S.ui;
  const note=S.preview?`<div class="pvnote">${gbadge(20)}<span style="flex-grow:1;min-width:0">You are looking at the guide's idea. It is not in your edits yet.</span><span class="btns">${canEdit()?btn("Add to my edits","applyProp",{p:1,s:1,data:{id:S.preview}}):""}<button class="btn s" data-a="unpreview">Show my draft</button></span></div>`:"";
  let body;
  if(realOn()&&STORY[kind]) body=storyFrame(kind);
  else {
    // Against the live version, everything not released yet counts: the proposal's changes and the edits.
    const n=diff(S.published,S.draft).length, useLast=u.baBase==="last"&&S.beforeLast;
    const base=useLast?S.beforeLast:S.published;
    const left=useLast?`Before: ${esc(S.lastEditLabel||"your last change")}`:`Before: live version ${S.published.version}`;
    const right=useLast?"After: your edits now":`After: with your edits${n?` · ${n} change${n>1?"s":""}`:""}`;
    /* A brand added in this draft has nothing to compare with yet. */
    if(!Object.hasOwn(base.brands,u.brand)) body=`<div class="ba-tags"><span class="ba-tag">${esc(bn(u.brand))} is new. ${useLast?"It was not there before your last change.":`It is not in live version ${S.published.version} yet.`}</span></div>${frame(st,kind)}`;
    /* Side by side: for a change that moves things around, where a slider's two halves would not line up. */
    else if(u.baView==="side") body=`<div class="ba-side"><div><div class="ba-tags"><span class="ba-tag">${left}</span></div>${frame(base,kind)}</div><div><div class="ba-tags"><span class="ba-tag">${right}</span></div>${frame(st,kind)}</div></div>
      ${!useLast&&!n?`<p class="under" style="margin-top:8px">You have no edits yet, so both sides look the same.</p>`:""}`;
    else body=`<div class="ba-tags"><span class="ba-tag">${I.chevL} ${left}</span><span class="ba-tag">${right} ${I.chevR}</span></div><div class="ba" id="ba" style="--pos:${u.baPos}%"><div class="ba-l">${frame(base,kind)}</div><div class="ba-r">${frame(st,kind)}</div><div class="ba-line" aria-hidden="true"><span>${I.chevL}${I.chevR}</span></div></div>
      <div class="ba-ctl"><label for="baslider" class="under">Drag across the preview, or use this slider, to compare. If the two sides do not line up, try Side by side.</label><input type="range" id="baslider" min="0" max="100" value="${u.baPos}" aria-label="Move the line between before and after"></div>
      ${u.baBase==="last"&&!S.beforeLast?`<p class="under" style="margin-top:8px">Make a change on any page to compare it here. Until then, this shows the live version on the left.</p>`:(!useLast&&!n)?`<p class="under" style="margin-top:8px">You have no edits yet, so both sides look the same.</p>`:""}`;
  }
  return `<div class="pvcol" id="pvcol">${pvControls()}<div class="pvbody" id="pvbody"><div class="reachwrap"><div class="reach" id="reach" aria-live="polite"></div></div>${note}${body}<div class="pickbox" id="pickbox" hidden><span></span></div></div></div>`;
}
function pvBar(){const b=bn(S.ui.brand);
  return `<div class="pv-bar"><div class="pv-logo"><i></i>${esc(b)}</div><div class="pv-row" style="gap:12px"><span class="lnk small">Help</span><span class="pv-badge brand small">JM</span></div></div>`;}
function consumerScreen(){
  return `${pvBar()}<div class="pv-main">
    <div class="pv-stack" style="gap:calc(var(--gap)*.5)"><span class="lnk small">Back to my account</span><h1 class="h1">Update your contact details</h1><p class="muted">We use these details to reach you about your plan. It only takes a minute.</p></div>
    <div class="pv-card"><div class="pv-row" style="justify-content:space-between"><h2 class="h3">How we reach you</h2><span class="pv-badge">New</span></div>
      <div class="pv-grid2">
        <div class="pv-field"><span class="lb">Phone number</span><div class="pv-in">(555) 201-4488</div><span class="pv-help">We will only call between 8 AM and 8 PM.</span></div>
        <div class="pv-field err"><span class="lb">Email address</span><div class="pv-in">jmorris.gmail.com</div><span class="pv-help">Please add an @ sign, like name@email.com.</span></div>
      </div>
      <div class="pv-field"><span class="lb">How should we reach you first?</span><div class="pv-in focus">Phone call${I.chevD()}</div></div>
    </div>
    <div class="pv-row acts"><span class="pv-btn primary">Save my changes</span><span class="pv-btn outline">Cancel</span></div>
    <p class="small muted">Questions? Call us at <span class="lnk">1-800-555-0142</span>. We are here every day.</p>
  </div>`;
}
function employeeScreen(){
  const rows=[["R-20417","Morris, June","Address change","Today","warn","Waiting"],["R-20416","Patel, Arun","New card","Today","ok","Done"],["R-20411","Lee, Grace","Billing question","Sep 23","bad","Late"],["R-20409","Ortiz, Sam","Address change","Sep 23","ok","Done"],["R-20402","Brooks, Ann","Plan change","Sep 22","warn","Waiting"]];
  return `${pvBar()}<div class="pv-main">
    <div class="pv-row" style="justify-content:space-between"><h1 class="h2">Member requests</h1><span class="pv-btn primary">New request</span></div>
    <div class="pv-grid3">${[["Open","24"],["Due today","6"],["Closed this week","58"]].map(([l,n])=>`<div class="pv-card" style="gap:4px"><span class="small muted">${l}</span><span class="pv-stat">${n}</span></div>`).join("")}</div>
    <div class="pv-row"><div class="pv-in" style="flex:1 1 200px"><span class="ph">Search by name or request ID</span></div><div class="pv-in" style="flex:0 1 170px">All statuses${I.chevD()}</div><span class="pv-btn quiet">Export</span></div>
    <div class="pv-card" style="padding:0;overflow-x:auto"><table class="pv-table"><thead><tr><th>ID</th><th>Member</th><th>Request</th><th>Due</th><th>Status</th></tr></thead><tbody>
      ${rows.map((r,i)=>`<tr${i===0?' class="sel"':""}><td><span class="lnk">${r[0]}</span></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="pv-badge ${r[4]}">${r[5]}</span></td></tr>`).join("")}
    </tbody></table></div></div>`;
}
function specimen(kind,st){
  st=st||pvState();const RR=REG[kind]; if(RR&&RR.spec){const html=RR.spec(st.comp[kind]||{},st);return RR.bleed?html:`<div class="spec">${html}</div>`;}
  const G=(l,h)=>`<div class="grp"><div class="sl">${l}</div>${h}</div>`;
  if(kind==="button") return `<div class="spec">
    ${G("Kinds",`<div class="pv-row"><span class="pv-btn primary">Save my changes</span><span class="pv-btn outline">Cancel</span><span class="pv-btn quiet">Add a note</span><span class="pv-btn ghost">Skip this step</span><span class="pv-btn danger">Delete address</span></div>`)}
    ${G("States of the main button",`<div class="pv-row"><span class="pv-btn primary">Normal</span><span class="pv-btn primary hover">Mouse over</span><span class="pv-btn primary focus">Keyboard focus</span><span class="pv-btn primary off" aria-disabled="true">Turned off</span></div>`)}
    ${G("Full width on a phone",`<span class="pv-btn primary full">Continue to payment</span>`)}</div>`;
  if(kind==="field") return `<div class="spec">
    ${G("Normal, with help text",`<div class="pv-field"><span class="lb">Phone number</span><div class="pv-in">(555) 201-4488</div><span class="pv-help">We will only call between 8 AM and 8 PM.</span></div>`)}
    ${G("Empty",`<div class="pv-field"><span class="lb">Middle name</span><div class="pv-in"></div><span class="pv-help">You can leave this blank.</span></div>`)}
    ${G("Keyboard focus",`<div class="pv-field"><span class="lb">City</span><div class="pv-in focus">Springfield</div></div>`)}
    ${G("Something is wrong",`<div class="pv-field err"><span class="lb">Email address</span><div class="pv-in">jmorris.gmail.com</div><span class="pv-help">Please add an @ sign, like name@email.com.</span></div>`)}
    ${G("Turned off",`<div class="pv-field"><span class="lb">Member ID</span><div class="pv-in off">NF-448120</div><span class="pv-help">Call us to change your member ID.</span></div>`)}</div>`;
  if(kind==="select") return `<div class="spec">
    ${G("Closed",`<div class="pv-field"><span class="lb">How should we reach you first?</span><div class="pv-in">Phone call${I.chevD()}</div></div>`)}
    ${G("Open",`<div class="pv-field"><span class="lb">State</span><div class="pv-in focus">Illinois${I.chevD()}</div><div class="pv-menu"><div>Idaho</div><div class="sel">${I.check("currentColor",14)} Illinois</div><div>Indiana</div><div>Iowa</div></div></div>`)}</div>`;
  if(kind==="card") return `<div class="spec">
    ${G("Basic card",`<div class="pv-card"><h3 class="h3">Your plan</h3><p class="muted">Gold Plus, since March 2024.</p><span class="lnk">See what your plan covers</span></div>`)}
    ${G("Card with one action",`<div class="pv-card"><div class="pv-row" style="justify-content:space-between"><h3 class="h3">Next payment</h3><span class="pv-badge warn">Due soon</span></div><span class="pv-stat">$42.50</span><p class="muted small">Due October 1, 2026.</p><div class="pv-row acts"><span class="pv-btn primary">Pay my bill</span></div></div>`)}
    ${G("Cards in a row",`<div class="pv-grid2"><div class="pv-card"><span class="small muted">Open requests</span><span class="pv-stat">24</span></div><div class="pv-card"><span class="small muted">Due today</span><span class="pv-stat">6</span></div></div>`)}</div>`;
  if(kind==="dialog") return `<div class="pv-dim"><div class="pv-dialog" role="presentation"><h2 class="h3">Delete this address?</h2><p class="muted">We will stop sending mail to 42 Oak Street. You cannot undo this.</p><div class="acts"><span class="pv-btn outline">Keep it</span><span class="pv-btn danger">Delete this address</span></div></div></div>`;
  return consumerScreen();
}

/* =====================================================================
   SECTIONS
   ===================================================================== */
function head(label,title,lede){return `<div><div class="label">${label}</div><div class="h1">${esc(title)}</div>${lede?`<div class="lede">${lede}</div>`:""}</div>`;}
function gnote(b,n){return `<div class="gcard">${gbadge(26)}<div style="min-width:0"><div class="b">${b}</div>${n?`<div class="n">${n}</div>`:""}</div></div>`;}
function lockNote(t){return `<div class="lockrow">${I.lock}<span>${t}</span></div>`;}
function designerBanner(){return S.role==="designer"?`<div class="banner">${I.lock}<span>You are viewing as a designer. You can look at everything and download the Figma file. The brand team makes changes here.</span></div>`:"";}
function wrap(inner,pv){return `<div class="split"><fieldset class="plain"${canEdit()?"":" disabled"}>${inner}</fieldset>${preview(pv)}</div>`;}

/* Page style: flat color, gradient, or picture, and see-through windows. */
function lookBox(b,md,cols){
  const br=S.draft.brands[b], L=lookOf(br,md), base=`brands.${b}.look.${md}`, pct=v=>Math.round(v*100);
  let extra="";
  if(L.kind==="gradient"){const cur=normHex(L.to||bgOf(br,md,"page")), sk=md+"Grad", seed=normHex((br.seeds&&br.seeds[sk])||cur);
    extra=`<div class="field"><span class="fl">Direction</span>${seg(base+".angle",L.angle,[["down","Top to bottom"],["diag","Corner to corner"],["side","Side to side"],["glow","Glow from the top"]],{label:"Gradient direction"})}</div>
      <div class="crow"><span class="swbig" style="background:${pageFill(br,md)}"></span><div class="cn"><b>End color</b><span>The gradient starts at the page color and ends at this color.</span></div><span class="hexro">${cur}</span></div>
      <div class="pickrow"><span class="under">Start from:</span>${cols.map(x=>`<button type="button" class="pk${seed===normHex(x.hex)?" on":""}" style="background:${x.hex}" data-a="pickStep" data-p="${base}.to" data-sk="${sk}" data-seed="${normHex(x.hex)}" data-v="${normHex(x.hex)}" title="${esc(x.name)} ${x.hex}" aria-label="End at ${esc(x.name)}, ${x.hex}" aria-pressed="${seed===normHex(x.hex)}"></button>`).join("")}</div>
      ${scaleRow(base+".to",sk,cur,seed)}`;}
  if(L.kind==="image"){
    extra=`<div class="lookimg">${L.img?`<div class="thumb" style="background:${lightStyle(pageFill(br,md))} center/cover no-repeat, ${bgOf(br,md,"page")}"></div>`:`<div class="thumb empty">No picture yet</div>`}
        <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
          <div class="btns">${btn("Make a picture from our colors","makeImg",{s:1,data:{p:base}})}<label class="btn s" for="bgimg">Upload a picture</label><input type="file" id="bgimg" accept="image/*" data-img="${base}" class="sr"></div>
          <span class="hint">${L.img?esc(L.imgName||"Your picture")+". ":""}JPG or PNG. The console makes it smaller so pages still load fast.</span></div></div>
      <div class="field"><label for="veil">Color layer over the picture: ${pct(L.veil)}%</label><input type="range" id="veil" min="50" max="97" step="1" value="${pct(L.veil)}" data-pct="${base}.veil" data-lbl="Color layer over the picture"><span class="hint">A layer of the page color sits over the picture so words stay easy to read. The checks measure every part of the picture.</span></div>`;}
  return `<div class="lookbox"><div class="field"><span class="fl">Page style</span>${seg(base+".kind",L.kind,[["solid","Flat color"],["gradient","Gradient"],["image","Picture"]],{label:"Page style"})}<span class="hint">Words on the page are checked against every part of a gradient or picture.</span></div>
    ${extra}
    <div class="field"><label for="glass">Window and card see-through: ${100-pct(L.glass)}%</label><input type="range" id="glass" min="0" max="40" step="5" value="${100-pct(L.glass)}" data-pct="${base}.glass" data-inv="1" data-lbl="Window and card see-through">
      ${L.kind==="solid"?`<span class="hint">On a flat page, see-through looks the same as solid. It shows when the page has a gradient or a picture.</span><div class="btns">${btn("Try it with a gradient","lookKind",{s:1,data:{p:base+".kind",v:"gradient"}})}${btn("Try it with a picture","lookKind",{s:1,data:{p:base+".kind",v:"image"}})}</div>`:`<span class="hint">0% is solid. Watch the cards in the preview. Words on cards are still checked.</span>`}</div>
    ${L.glass<1?`<div class="field"><span class="fl">Blur behind windows</span>${seg(base+".blur",L.blur,[[0,"None"],[4,"Light"],[8,"Medium"],[16,"Strong"]],{label:"Blur behind windows"})}<span class="hint">Blur makes busy pictures calmer behind cards.</span></div>`:""}</div>`;
}
/* A picture made from the brand's colors: soft, blurred shapes. The agent makes it first, and the person can keep it or upload their own. */
function makeBrandPicture(br,md){const cv=document.createElement("canvas");cv.width=1600;cv.height=1000;const g=cv.getContext("2d");
  const cols=(br.palette?br.palette.groups.flatMap(x=>x.colors).map(x=>x.hex):[br.primary,br.secondary,br.accent]).slice(0,6);
  g.fillStyle=bgOf(br,md,"page");g.fillRect(0,0,1600,1000);g.filter="blur(70px)";
  let seed=(cols.join("").length*7+(md==="dark"?3:1))%97;const r=()=>(seed=(seed*37+11)%101)/101;
  cols.forEach((c,i)=>{g.globalAlpha=.85;g.fillStyle=c;g.beginPath();g.ellipse(200+r()*1200,100+r()*800,250+r()*300,180+r()*240,r()*3,0,Math.PI*2);g.fill();});
  g.filter="none";g.globalAlpha=1;return cv;}
function sampleCanvas(cv){const s=document.createElement("canvas");s.width=s.height=24;const g=s.getContext("2d");g.drawImage(cv,0,0,24,24);
  const d=g.getImageData(0,0,24,24).data,px=[];for(let i=0;i<d.length;i+=4)px.push(rgbToHex([d[i],d[i+1],d[i+2]]));
  px.sort((a,b)=>lum(a)-lum(b));return [...new Set([0,.02,.1,.25,.5,.75,.9,.98,1].map(q=>px[Math.min(px.length-1,Math.round(q*(px.length-1)))]))];}
function setPicture(base,cv,name){if(!canEdit())return;markBefore(base);const L=getP(S.draft,base)||{};
  setP(S.draft,base,Object.assign({},L,{kind:"image",img:cv.toDataURL("image/jpeg",.82),imgName:name,samples:sampleCanvas(cv),veil:L.veil??0.8}));render();}
/* A clickable row of shades: the exact source color, then 50 to 950. */
function scaleRow(path,sk,cur,seedRaw){
  cur=normHex(cur);let seed=seedRaw;
  if(!seed||(normHex(seed)!==cur&&!STEPS.some(([k])=>scaleOf(seed)[k]===cur))) seed=cur;
  seed=normHex(seed);const o=scaleOf(seed);const exact=cur===seed;const onStep=STEPS.find(([k])=>o[k]===cur);
  const fg=h=>contrast(h,"#FFFFFF")>contrast(h,INK)?"#FFFFFF":INK, chip=h=>Math.max(contrast(h,"#FFFFFF"),contrast(h,INK))<4.5;
  const cell=(hex,label,on,title)=>`<button type="button" class="stp${on?" on":""}" style="background:${hex};color:${fg(hex)}" data-a="pickStep" data-p="${path}" data-sk="${sk}" data-v="${hex}" data-seed="${seed}" aria-pressed="${on}" title="${title}" aria-label="${title}">${on?I.check(fg(hex),9):""}<span${chip(hex)?' class="chip9"':""}>${label}</span></button>`;
  return `<div class="scalewrap"><div class="scale s12">${cell(seed,"Source",exact,`Use the exact color, ${seed}`)}${STEPS.map(([k])=>cell(o[k],k,!exact&&o[k]===cur,`Use shade ${k}, ${o[k]}`)).join("")}</div>
    <div class="under">${exact?"You are using the exact color. Click a shade to use a lighter or darker one.":`You are using shade ${onStep?onStep[0]:""}. Click "Source" to go back to the exact color.`}</div></div>`;
}
function bgBox(b){
  const br=S.draft.brands[b], md=S.ui.mode, c=colorsFor(S.draft,b,md);
  const cols=br.palette?br.palette.groups.flatMap(g=>g.colors):[{name:"Main color",hex:br.primary},{name:"Second color",hex:br.secondary},{name:"Accent color",hex:br.accent},{name:"White",hex:"#FFFFFF"}];
  const row=(which,name,use)=>{const path=`brands.${b}.bg.${md}.${which}`,sk=BG_KEYS[md][which],cur=bgOf(br,md,which),seed=normHex(bgSeedOf(br,md,which)),auto=!bgChosen(br,md,which);
    return `<div class="crow"><span class="swbig" style="background:${cur}"></span><div class="cn"><b>${name}</b><span>${use} ${auto?(md==="dark"?`Right now it is made from your ${which==="page"?"main":"second"} color, and it follows that color when it changes.`:"Right now it is white."):""}</span></div><span class="hexro">${cur}</span></div>
      <div class="pickrow"><span class="under">Start from:</span>${cols.map(x=>`<button type="button" class="pk${seed===normHex(x.hex)?" on":""}" style="background:${x.hex}" data-a="pickRole" data-p="${path}" data-v="${x.hex}" title="${esc(x.name)} ${x.hex}" aria-label="Start from ${esc(x.name)}, ${x.hex}" aria-pressed="${seed===normHex(x.hex)}"></button>`).join("")}</div>
      ${scaleRow(path,sk,cur,seed)}
      ${auto?"":`<div class="btns">${btn("Go back to automatic","bgAuto",{s:1,data:{p:path}})}</div>`}`;};
  const L=lookOf(br,md), hard=L.kind!=="solid"||L.glass<1?", at the hardest spot":"";
  const worst=(f,list)=>list.reduce((w,x)=>contrast(f,x)<contrast(f,w)?x:w,list[0]);
  const pr=(n,f,bg)=>{const r=contrast(f,bg);const lv=r<4.5?"bad":r<7?"warn":"ok";return `<tr><td>${n}</td><td><span class="aa" data-sample="1" style="background:${bg};color:${f}">Aa</span></td><td class="num">${fmt(r)} : 1</td><td><span class="pill ${lv}">${lv==="bad"?"Too low":lv==="warn"?"Passes. 7 is better.":"Easy to read"}</span></td></tr>`;};
  return `<div class="box"><div class="bt">Backgrounds</div><div class="bs">Pick the page and window colors for each mode. They come from the ${esc(bn(b))} color set, so they always fit the brand. Borders, help text, and links adjust to them on their own.</div>
    <div class="field"><span class="fl">Mode you are editing</span>${seg("ui.mode",md,[["light","Light mode"],["dark","Dark mode"]],{label:"Mode you are editing"})}<span class="hint">This also switches the preview.</span></div>
    ${row("page","Page background","The color behind everything on the page.")}
    ${row("card","Window and card background","Cards, pop-ups, menus, and drawers sit on this color.")}
    ${lookBox(b,md,cols)}
    <div class="tw"><table class="t"><thead><tr><th>Words on the backgrounds</th><th>Sample</th><th>Contrast</th><th>Result</th></tr></thead><tbody>${pr("Body text on the page"+hard,c.foreground,worst(c.foreground,[c.background,...c.pageSet]))}${pr("Body text on a window"+hard,c.foreground,worst(c.foreground,[c.card,...c.cardSet]))}${pr("Help text on a window"+hard,c.mutedFg,worst(c.mutedFg,[c.card,...c.cardSet]))}${pr("Links on the page"+hard,c.link,worst(c.link,[c.background,...c.pageSet]))}</tbody></table></div></div>`;
}
/* The main button's color, shown as real samples with the words the console picks for each. */
function btnPicker(b){
  const md=S.ui.mode, cur=S.draft.comp.button.bg, br=S.draft.brands[b];
  const opts=(REG.button.slots.find(s=>s.k==="bg")||{opts:[]}).opts;
  const look=v=>{const st={...S.draft,comp:{...S.draft.comp,button:{...S.draft.comp.button,bg:v}}},c=colorsFor(st,b,md);let fg=c.btnFg;
    if(v==="action.primary"&&br.onPrimary!=="auto"){const w=wordsForNewMain(br);if(w)fg=w==="white"?"#FFFFFF":INK;}
    return {bg:c.btnBg,fg,edge:c.btnBorder,r:contrast(fg,c.btnBg)};};
  const L=Object.fromEntries(opts.map(([v])=>[v,look(v)]));
  const word=h=>normHex(h)==="#FFFFFF"?"white":"dark";
  const tiles=opts.map(([v,l])=>{const x=L[v],on=v===cur;
    return `<button type="button" class="bpk${on?" on":""}" data-seg="comp.button.bg" data-v="${v}" aria-pressed="${on}" aria-label="${esc(l)}. ${word(x.fg)==="white"?"White":"Dark"} words, ${fmt(x.r)} to 1."><span class="bpk-s" aria-hidden="true" data-sample="1" style="background:${x.bg};color:${x.fg};border-color:${x.edge}">Aa</span><b>${esc(l)}</b><span class="bpk-n${x.r<4.5?" lo":""}">${fmt(x.r)} : 1${x.r<4.5?" · Too low":""}</span></button>`;}).join("");
  const x=L[cur]||look(cur), other=word(x.fg)==="white"?INK:"#FFFFFF", rO=contrast(other,x.bg), name={"action.primary":"main color","highlight":"second color","ink":"dark color"}[cur]||"color";
  let say=`The main button uses your ${name}. On it, ${word(x.fg)} words are easy to read. They reach ${fmt(x.r)} to 1.`;
  if(rO<4.5) say+=` ${word(other)==="white"?"White":"Dark"} words would only reach ${fmt(rO)} to 1, which is too hard to read.`;
  const m=L["action.primary"];
  if(cur!=="action.primary"&&word(x.fg)==="dark"&&m&&word(m.fg)==="white"&&m.r>=4.5) say+=` If you want white words on the button, pick Main color.`;
  return `<div class="bpks" role="group" aria-label="Main button color">${tiles}</div><div class="under bpk-say">${say}</div>`;
}
/* Brands: add, rename, reorder, and remove them. Each brand only has its own colors; everything else is shared. */
const BRAND_COLORS=[["primary","Main color"],["secondary","Second color"],["accent","Accent color"]];
function brandRow(b,i,n){
  const br=S.draft.brands[b.id],ed=canEdit(),del=S.ui.brandDel===b.id;
  const sw=BRAND_COLORS.map(([k,l])=>`<span class="sw" style="background:${br[k]}" title="${l} ${br[k]}"></span>`).join("");
  const conf=del?`<div class="ck block" role="alert"><span class="dotc" style="background:var(--red)"></span><div class="body"><div class="tt">Remove ${esc(b.name)}?</div><div class="dd">Apps that use data-brand="${esc(b.id)}" lose its styles. That makes the next version a big change, so engineers know to check their apps.</div><div class="btns">${btn("Remove "+b.name,"brandDel",{p:1,s:1,data:{b:b.id}})}${btn("Keep it","brandDelCancel",{s:1})}</div></div></div>`:"";
  return `<div class="brandrow"><div class="crow"><span class="brandsw" aria-hidden="true">${sw}</span><div class="cn"><b>${esc(b.name)}${i===0?` <span class="pill neutral">Default</span>`:""}</b><span>Apps use data-brand="${esc(b.id)}"</span></div>
    ${ed?`<div class="btns">${btn("Move up","brandMove",{s:1,data:{b:b.id,to:i-1},dis:i===0})}${btn("Move down","brandMove",{s:1,data:{b:b.id,to:i+1},dis:i===n-1})}${btn("Remove","brandDelAsk",{s:1,data:{b:b.id},dis:n<2})}</div>`:""}</div>
    <div class="brandfields"><div class="field"><label class="fl" for="bname-${b.id}">Name</label><input class="inp" id="bname-${b.id}" value="${esc(b.name)}" data-bren="name" data-b="${b.id}" maxlength="40"></div>
    <div class="field"><label class="fl" for="bdiv-${b.id}">Description</label><input class="inp" id="bdiv-${b.id}" value="${esc(b.div)}" data-bren="division" data-b="${b.id}" maxlength="80" placeholder="Like Consumer division"></div></div>${conf}</div>`;
}
function brandAdder(){
  const A=S.ui.brandAdd;
  if(!A) return `<div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn("Add a brand","brandAddOpen",{s:1})}</div><div class="under">A new brand starts with its own three colors. Fonts, corners, and components are shared, so it fits in right away.</div></div>`;
  const colors=BRAND_COLORS.map(([k,l])=>{const v=hexOk(A[k]||"")?normHex(A[k]):"";return `<div class="crow"><input type="color" id="badd-pick-${k}" value="${(v||"#888888").toLowerCase()}" data-badd="${k}" aria-label="${l} picker"><div class="cn"><b>${l}</b><span>${k==="primary"?"Buttons, links, and focus rings use it.":k==="secondary"?"Soft backgrounds and tags use it.":"Small highlights use it."}</span></div><input class="inp hex" id="badd-hex-${k}" value="${v}" data-badd="${k}" maxlength="7" placeholder="#000000" aria-label="${l} hex code"></div>`;}).join("");
  return `<div class="paladd"><div class="bt" style="font-size:14px">Add a brand</div>
    <div class="field"><label class="fl" for="badd-name">Name</label><input class="inp" id="badd-name" value="${esc(A.name||"")}" data-badd="name" maxlength="40" placeholder="Like Harbor Clinics"><span class="hint" id="badd-id" aria-live="polite">${brandAddIdNote()}</span></div>
    <div class="field"><label class="fl" for="badd-div">Description</label><input class="inp" id="badd-div" value="${esc(A.division||"")}" data-badd="division" maxlength="80" placeholder="Like Clinics division"></div>
    ${colors}
    <div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn("Add the brand","brandAdd",{p:1,s:1})}${btn("Cancel","brandAddClose",{s:1})}</div><div class="under" id="badd-note" aria-live="polite">${esc(A.err||"")}</div></div></div>`;
}
function brandAddIdNote(){const n=String((S.ui.brandAdd||{}).name||"").trim();return n?`Apps will use data-brand="${esc(brandIdFor(S.draft,n))}". The id never changes, even if you rename the brand.`:"The id that apps use is made from the name, once. It never changes, even if you rename the brand.";}
function secBrands(){
  const list=brands(),fig=checks().find(x=>x.id==="figma-modes");
  return `<div class="page narrow">${designerBanner()}${head("Foundations","Brands","Each brand has its own colors. Fonts, corners, and components are shared by every brand. The first brand is the default.")}
    <div class="box"><div class="bt">Your brands</div><div class="bs">Renaming a brand or changing the order is a fix. Adding one is new things. Removing one is a big change.</div>
      <fieldset class="plain"${canEdit()?"":" disabled"}>${list.map((b,i)=>brandRow(b,i,list.length)).join("")}</fieldset>${fig?ckItem(fig):""}</div>
    ${canEdit()?(S.ui.brandAdd?brandAdder():`<div class="box">${brandAdder()}</div>`):""}</div>`;
}
function secColor(){
  const b=S.ui.brand, br=S.draft.brands[b], c=colorsFor(S.draft,b,S.ui.mode);
  const pal=br.palette, all=pal?pal.groups.flatMap(g=>g.colors.map(c=>({...c,g:g.name}))):[];
  const roleOf=h=>[["primary","Main"],["secondary","Second"],["accent","Accent"]].filter(([k])=>br[k]===h).map(([,l])=>l);
  const pick=(key)=>pal?`<div class="pickrow"><span class="under">From the color set:</span>${all.filter(c=>c.hex!=="#FFFFFF").map(c=>`<button type="button" class="pk${br[key]===c.hex?" on":""}" style="background:${c.hex}" data-a="pickRole" data-p="brands.${b}.${key}" data-v="${c.hex}" title="${esc(c.name)} ${c.hex}" aria-label="Use ${esc(c.name)}, ${c.hex}" aria-pressed="${br[key]===c.hex}"></button>`).join("")}</div>`:"";
  const crow=(key,name,use)=>{const v=br[key];return `<div class="crow"><input type="color" id="pick-${key}" value="${v.toLowerCase()}" data-path="brands.${b}.${key}" aria-label="${name} picker"><div class="cn"><b>${name}</b><span>${use}</span></div><input class="inp hex" id="hex-${key}" value="${v}" data-hex="brands.${b}.${key}" aria-label="${name} hex code" maxlength="7"></div>`;};
  const sc=(key)=>scaleRow(`brands.${b}.${key}`,key,br[key],(br.seeds||{})[key]);
  const md=S.ui.mode, best=br.wordGoal==="best", P0=br.primary, PR=pairsOf(br,md);
  const scl=h=>STEPS.map(([k])=>[String(k),scaleOf(h)[k]]), G=grayOf(S.draft,b), seedP=normHex((br.seeds||{}).primary||br.primary), seedS=normHex((br.seeds||{}).secondary||br.secondary);
  const WB=[["White and dark",[["White","#FFFFFF"],["Dark",INK]]]], MAIN=["Main color",scl(seedP)], SEC=["Second color",scl(seedS)], GRAY=["Gray",STEPS.map(([k])=>[String(k),G[k]])];
  const btnOnMain=S.draft.comp.button.bg==="action.primary";
  const PAIRS=[
    btnOnMain?{id:"button",n:"Main button words",fg:c.btnFg,bg:c.btnBg,min:4.5,fgPath:`brands.${b}.onPrimary`,bgPath:`brands.${b}.primary`,fgG:WB,bgG:[MAIN],bgLabel:"Button color",picked:br.onPrimary!=="auto",note:"The button color is your main color, so this changes it everywhere."}
      :{id:"button",n:"Main button words",fg:c.btnFg,bg:c.btnBg,min:4.5,info:true},
    ...(btnOnMain?[]:[{id:"main",n:"Words on the main color",fg:c.onP,bg:c.P,min:4.5,fgPath:`brands.${b}.onPrimary`,bgPath:`brands.${b}.primary`,fgG:WB,bgG:[MAIN],bgLabel:"Main color",picked:br.onPrimary!=="auto",note:"Badges, checked boxes, the chosen day and time, and the current page use these colors. Changing the main color changes it everywhere."}]),
    {id:"link",n:"Links",fg:c.link,bg:c.background,min:4.5,fgPath:`brands.${b}.pairs.${md}.link`,fgG:[MAIN],picked:!!PR.link},
    {id:"body",n:"Body text",fg:c.foreground,bg:c.background,min:4.5,fgPath:`brands.${b}.pairs.${md}.body`,fgG:[GRAY],picked:!!PR.body},
    {id:"tag",n:"Tag words",fg:c.accentFg,bg:c.accent,min:4.5,fgPath:`brands.${b}.pairs.${md}.tag`,fgG:[SEC],picked:!!(PR.tag||PR.tagBg)},
    {id:"soft",n:"Soft button words",fg:c.secondaryFg,bg:c.secondary,min:4.5,fgPath:`brands.${b}.pairs.${md}.soft`,fgG:[MAIN],picked:!!(PR.soft||PR.softBg)},
    {id:"focus",n:"Focus outline",fg:c.ring,bg:c.background,min:3}];
  const lvOf=(r,min)=>r<min?"bad":(min===4.5&&r<7)?"warn":"ok", pillOf=(r,min)=>{const lv=lvOf(r,min);return `<span class="pill ${lv}">${lv==="bad"?"Too low":lv==="warn"?"Passes. 7 is better.":"Easy to read"}</span>`;};
  const sws=(groups,path,cur,other,side,min)=>groups.map(([gname,list])=>`<div class="pgrow"><div class="pgsw">${list.map(([lab,hex])=>{const h=normHex(hex),r=side==="fg"?contrast(h,other):contrast(other,h),on=normHex(cur)===h,label=`${gname==="White and dark"?lab:gname+" "+lab}, ${h}. Contrast ${fmt(r)} to 1.`;
      return `<button type="button" class="psw${on?" on":""}${r<min?" lo":""}" style="background:${h}" data-a="pairPick" data-p="${path}" data-v="${h}" title="${esc(label)}" aria-label="${esc(label)}" aria-pressed="${on}"><span aria-hidden="true">${fmt(r)}</span></button>`;}).join("")}</div></div>`).join("");
  const editor=P=>{const r=contrast(P.fg,P.bg);let quick="";
    if(P.id!=="button"&&r<7&&!best) quick=`<div class="field"><span class="fl">Quick way to reach 7 to 1</span><div class="btns">${btn("Aim for 7 to 1","setGoal",{s:1,data:{b}})}</div><span class="hint">This makes links, help text, and tag words a little darker. Your colors stay the same.</span></div>`;
    return `<div class="paired">
      <div class="pairscore"><div class="pairbig" data-sample="1" style="background:${P.bg};color:${P.fg}"><b>Aa</b><span>Your next visit is May 1.</span></div><div><div class="pairnum">${fmt(r)} : 1</div>${pillOf(r,P.min)}</div></div>
      <div class="field"><span class="fl">Word color</span>${sws(P.fgG,P.fgPath,P.fg,P.bg,"fg",P.min)}</div>
      ${P.bgLabel?`<div class="field"><span class="fl">${P.bgLabel}</span>${P.bgPath?sws(P.bgG,P.bgPath,P.bg,P.fg,"bg",P.min):`<span class="hint">The main button uses your ${S.draft.comp.button.bg==="highlight"?"second":"dark"} color. Change it on the Button page.</span>`}${P.note&&P.bgPath?`<span class="hint">${esc(P.note)}</span>`:""}</div>`:""}
      ${quick}
      ${P.picked?`<div class="btns">${btn("Go back to automatic","pairAuto",{s:1,data:{r:P.id,m:md,b}})}</div>`:""}
      <p class="under">The number on each color is its score. Your pick goes into your draft right away.</p></div>`;};
  const open=S.ui.pairOpen;
  const rows=PAIRS.map(P=>{const r=contrast(P.fg,P.bg),ed=!!P.fgPath,isOpen=open===P.id&&ed;
    return `<tr${isOpen?' class="open"':""}><td>${P.n}${P.picked?`<div class="under">Picked by you</div>`:""}</td><td><span class="aa" data-sample="1" style="background:${P.bg};color:${P.fg}">Aa</span></td><td class="num">${fmt(r)} : 1</td><td>${pillOf(r,P.min)}</td></tr>
      ${P.id==="button"?`<tr class="actrow"><td colspan="4">${btnPicker(b)}${ed?`<div class="btns" style="margin-top:10px">${btn(isOpen?"Close":"Pick word color","pairOpen",{s:1,data:{r:P.id}})}</div>${isOpen?editor(P):""}`:""}</td></tr>`
        :ed?`<tr class="actrow"><td colspan="4">${btn(isOpen?"Close":"Pick colors","pairOpen",{s:1,data:{r:P.id}})}${isOpen?editor(P):""}</td></tr>`:""}`;}).join("");
  const blocking=checks().filter(x=>x.level==="block"&&x.fix&&x.fix.brand===b);
  const inner=`${designerBanner()}${head("Foundations","Color","Each brand sets a main, second, and accent color. The system makes every other shade from them.")}
    ${blocking.length?gnote(`I found a problem with ${bn(b)}. ${esc(blocking[0].detail)}`,(fixChanges(S.draft,blocking[0].fix)[0]||{}).why||"I can fix it for you.")+`<div class="btns">${btn("Fix it for me","fixCheck",{p:1,data:{id:blocking[0].id}})}${btn("Show me first","previewFix",{data:{id:blocking[0].id}})}</div>`
      :gnote(br.palette?`I read the ${bn(b)} color set and picked the main, second, and accent colors from it. Then I made shades and checked every pair of words and background.`:"I made a full set of shades from each brand's colors. Then I checked every pair of words and background.","Change any color and I will check it again right away.")}
    <div class="box">
      ${crow("primary","Main color",S.draft.comp.button.bg==="action.primary"?"Buttons, links, and the keyboard focus outline.":"Links, checked boxes, the chosen day, and the keyboard focus outline. Your main button uses a different color.")}
      ${pick("primary")}${sc("primary")}
      ${crow("secondary","Second color",S.draft.comp.button.bg==="highlight"?"Tags, selected rows, and your main button.":"Tags, badges, and selected rows.")}
      ${pick("secondary")}${sc("secondary")}
      ${crow("accent","Accent color","Small touches, like a logo mark or a chart line. Never used for words.")}
      ${pick("accent")}
      <div class="field"><span class="fl">Words on the main color</span>${seg("brands."+b+".onPrimary",br.onPrimary,[["auto","Pick for me"],["white","White"],["dark","Dark"]])}<span class="hint">"Pick for me" uses white when it is easy to read and dark words when it is not.</span></div>
    </div>
    ${bgBox(b)}
    ${palBox(b)}
    ${aiBox(b)}
    <div class="box"><div class="bt">Word and background pairs for ${bn(b)} in ${S.ui.mode==="dark"?"dark":"light"} mode</div><div class="bs">The rule is 4.5 to 1 for words and 3 to 1 for outlines. For readers over 65, 7 to 1 is best. Pick colors for any pair to see its score as you click.</div>
      <div class="field"><span class="fl">Mode you are editing</span>${seg("ui.mode",md,[["light","Light mode"],["dark","Dark mode"]],{label:"Mode you are editing"})}</div>
      <div class="field"><span class="fl">Contrast goal for words</span>${seg("brands."+b+".wordGoal",best?"best":"rule",[["rule","Meet the rule: 4.5 to 1"],["best","Best for older readers: 7 to 1"]],{label:"Contrast goal for words"})}<span class="hint">The goal sets how dark links, help text, tag words, and error words are. Your brand colors stay the same. The main button is different. You set its color and words in its own row below.</span></div>
      <div class="tw"><table class="t"><thead><tr><th>Pair</th><th>Sample</th><th>Contrast</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div class="box"><div class="bt">Shared colors</div><div class="bs">Both brands use these, so a warning looks the same everywhere.</div>
      ${[["danger","Error","Error messages and delete buttons."],["success","Success","Messages that say something worked."],["warning","Warning","Messages that need attention soon."]].map(([k,n,u])=>`<div class="crow"><input type="color" id="pick-sys-${k}" value="${S.draft.system[k].toLowerCase()}" data-path="system.${k}" aria-label="${n} picker"><div class="cn"><b>${n}</b><span>${u}</span></div><input class="inp hex" id="hex-sys-${k}" value="${S.draft.system[k]}" data-hex="system.${k}" maxlength="7" aria-label="${n} hex code"></div>`).join("")}
      <div class="field"><span class="fl">Gray color</span>${seg("gray",S.draft.gray||"warm",[["warm","Warm"],["neutral","Pure"],["cool","Cool"],["brand","Match the brand"]],{label:"Gray color"})}
        <div class="grayrow" aria-hidden="true">${[50,100,200,300,400,500,600,700,800,900].map(k=>`<span style="background:${grayOf(S.draft,S.ui.brand)[k]}"></span>`).join("")}</div>
        <span class="hint">Borders, help text, and quiet backgrounds are made from this gray. "Match the brand" adds a hint of each brand's main color, like the Radix design system does.</span></div></div>`;
  return wrap(inner,"screen");
}
/* A large color library to pick from, with 12 shades of each color. From Radix Colors (MIT license), light scales. */
const RADIX={gray:"FCFCFC,F9F9F9,F0F0F0,E8E8E8,E0E0E0,D9D9D9,CECECE,BBBBBB,8D8D8D,838383,646464,202020",mauve:"FDFCFD,FAF9FB,F2EFF3,EAE7EC,E3DFE6,DBD8E0,D0CDD7,BCBAC7,8E8C99,84828E,65636D,211F26",slate:"FCFCFD,F9F9FB,F0F0F3,E8E8EC,E0E1E6,D9D9E0,CDCED6,B9BBC6,8B8D98,80838D,60646C,1C2024",sage:"FBFDFC,F7F9F8,EEF1F0,E6E9E8,DFE2E0,D7DAD9,CBCFCD,B8BCBA,868E8B,7C8481,5F6563,1A211E",olive:"FCFDFC,F8FAF8,EFF1EF,E7E9E7,DFE2DF,D7DAD7,CCCFCC,B9BCB8,898E87,7F847D,60655F,1D211C",sand:"FDFDFC,F9F9F8,F1F0EF,E9E8E6,E2E1DE,DAD9D6,CFCECA,BCBBB5,8D8D86,82827C,63635E,21201C",tomato:"FFFCFC,FFF8F7,FEEBE7,FFDCD3,FFCDC2,FDBDAF,F5A898,EC8E7B,E54D2E,DD4425,D13415,5C271F",red:"FFFCFC,FFF7F7,FEEBEC,FFDBDC,FFCDCE,FDBDBE,F4A9AA,EB8E90,E5484D,DC3E42,CE2C31,641723",ruby:"FFFCFD,FFF7F8,FEEAED,FFDCE1,FFCED6,F8BFC8,EFACB8,E592A3,E54666,DC3B5D,CA244D,64172B",crimson:"FFFCFD,FEF7F9,FFE9F0,FEDCE7,FACEDD,F3BED1,EAACC3,E093B2,E93D82,DF3478,CB1D63,621639",pink:"FFFCFE,FEF7FB,FEE9F5,FBDCEF,F6CEE7,EFBFDD,E7ACD0,DD93C2,D6409F,CF3897,C2298A,651249",plum:"FEFCFF,FDF7FD,FBEBFB,F7DEF8,F2D1F3,E9C2EC,DEADE3,CF91D8,AB4ABA,A144AF,953EA3,53195D",purple:"FEFCFE,FBF7FE,F7EDFE,F2E2FC,EAD5F9,E0C4F4,D1AFEC,BE93E4,8E4EC6,8347B9,8145B5,402060",violet:"FDFCFE,FAF8FF,F4F0FE,EBE4FF,E1D9FF,D4CAFE,C2B5F5,AA99EC,6E56CF,654DC4,6550B9,2F265F",iris:"FDFDFF,F8F8FF,F0F1FE,E6E7FF,DADCFF,CBCDFF,B8BAF8,9B9EF0,5B5BD6,5151CD,5753C6,272962",indigo:"FDFDFE,F7F9FF,EDF2FE,E1E9FF,D2DEFF,C1D0FF,ABBDF9,8DA4EF,3E63DD,3358D4,3A5BC7,1F2D5C",blue:"FBFDFF,F4FAFF,E6F4FE,D5EFFF,C2E5FF,ACD8FC,8EC8F6,5EB1EF,0090FF,0588F0,0D74CE,113264",cyan:"FAFDFE,F2FAFB,DEF7F9,CAF1F6,B5E9F0,9DDDE7,7DCEDC,3DB9CF,00A2C7,0797B9,107D98,0D3C48",teal:"FAFEFD,F3FBF9,E0F8F3,CCF3EA,B8EAE0,A1DED2,83CDC1,53B9AB,12A594,0D9B8A,008573,0D3D38",jade:"FBFEFD,F4FBF7,E6F7ED,D6F1E3,C3E9D7,ACDEC8,8BCEB6,56BA9F,29A383,26997B,208368,1D3B31",green:"FBFEFC,F4FBF6,E6F6EB,D6F1DF,C4E8D1,ADDDC0,8ECEAA,5BB98B,30A46C,2B9A66,218358,193B2D",grass:"FBFEFB,F5FBF5,E9F6E9,DAF1DB,C9E8CA,B2DDB5,94CE9A,65BA74,46A758,3E9B4F,2A7E3B,203C25",bronze:"FDFCFC,FDF7F5,F6EDEA,EFE4DF,E7D9D3,DFCDC5,D3BCB3,C2A499,A18072,957468,7D5E54,43302B",gold:"FDFDFC,FAF9F2,F2F0E7,EAE6DB,E1DCCF,D8D0BF,CBC0AA,B9A88D,978365,8C7A5E,71624B,3B352B",brown:"FEFDFC,FCF9F6,F6EEE7,F0E4D9,EBDACA,E4CDB7,DCBC9F,CEA37E,AD7F58,A07553,815E46,3E332E",orange:"FEFCFB,FFF7ED,FFEFD6,FFDFB5,FFD19A,FFC182,F5AE73,EC9455,F76B15,EF5F00,CC4E00,582D1D",amber:"FEFDFB,FEFBE9,FFF7C2,FFEE9C,FBE577,F3D673,E9C162,E2A336,FFC53D,FFBA18,AB6400,4F3422",yellow:"FDFDF9,FEFCE9,FFFAB8,FFF394,FFE770,F3D768,E4C767,D5AE39,FFE629,FFDC00,9E6C00,473B1F",lime:"FCFDFA,F8FAF3,EEF6D6,E2F0BD,D3E7A6,C2DA91,ABC978,8DB654,BDEE63,B0E64C,5C7C2F,37401C",mint:"F9FEFD,F2FBF9,DDF9F2,C8F4E9,B3ECDE,9CE0D0,7ECFBD,4CBBA5,86EAD4,7DE0CB,027864,16433C",sky:"F9FEFF,F1FAFD,E1F6FD,D1F0FA,BEE7F5,A9DAED,8DCAE3,60B3D7,7CE2FE,74DAF8,00749E,1D3E56"};
const RADIX_NAMES=Object.keys(RADIX);
const capWord=t=>t.charAt(0).toUpperCase()+t.slice(1);
/* Words people type that every app shows the same way, like the AI limits notice. They count toward a limit and
   are never written by the helper. */
function wordsField(path,val,sl){
  const v=String(val??sl.def??""),id="w-"+path.replace(/[^a-z0-9]+/gi,"-"),long=(sl.max||0)>60;
  if(!canEdit()) return `<div class="field"><span class="fl">${esc(sl.label)}</span><div style="font-size:13px;line-height:1.6">${esc(v)}</div></div>`;
  const box=long?`<textarea class="inp" id="${id}" data-text="${path}" rows="3" maxlength="${sl.max}">${esc(v)}</textarea>`:`<input class="inp" id="${id}" data-text="${path}" value="${esc(v)}" maxlength="${sl.max}">`;
  return `<div class="field"><label class="fl" for="${id}">${esc(sl.label)}</label>${box}<span class="hint">${sl.hint?esc(sl.hint)+" ":""}Up to ${sl.max} letters. Every app shows these exact words, so changes go through review like any other change.${v.trim()?"":" These words cannot be empty."}</span></div>`;
}
/* How AI looks and what the assistant is called, for one brand. */
function aiBox(b){
  const br=S.draft.brands[b], a=aiOf(br), ed=canEdit(), md=S.ui.mode, c=colorsFor(S.draft,b,md), id="ai-name-"+b;
  const sw=(hex,n)=>`<span class="aisw"><span class="sw" style="background:${hex}"></span>${n} ${hex}</span>`;
  return `<div class="box"><div class="bt">AI for ${bn(b)}</div><div class="bs">AI answers, summaries, and suggestions use their own color, made from one of your brand colors, so people can tell what AI wrote. The console checks it like every other color.</div>
    <div class="field"><span class="fl">Make the AI color from</span>${seg(`brands.${b}.ai.color`,a.color,AI_SOURCES,{label:"Make the AI color from",dis:!ed})}
      <div class="aisample" style="background:${c.aiSoft};color:${c.aiFg};border-inline-start:4px solid ${c.ai}"><b style="color:${c.ai}">${AI_MARK} ${esc(S.draft.comp["ai-label"].words||"AI answer")}</b><span>Your deductible is $2,000 a year.</span></div>
      <div class="aisws">${sw(c.ai,"AI color")}${sw(c.aiSoft,"AI background")}${sw(c.aiFg,"Words on it")}</div><span class="hint">Shown for ${md} mode.</span></div>
    <div class="field"><label class="fl" for="${id}">The assistant's name</label>${ed?`<input class="inp" id="${id}" data-text="brands.${b}.ai.name" value="${esc(a.name)}" maxlength="30" placeholder="Assistant">`:`<div>${esc(aiName(br))}</div>`}<span class="hint">Leave it empty to call it "Assistant". People see it on the button that opens the assistant and before every answer.</span></div>
    <div class="field"><span class="fl">The assistant's picture</span>${seg(`brands.${b}.ai.picture`,a.picture,AI_PICTURES,{label:"The assistant's picture",dis:!ed})}</div></div>`;
}
function palBox(b){
  const br=S.draft.brands[b], pal=br.palette, ed=canEdit();
  if(!pal) return `<div class="box"><div class="bt">Full color set for ${bn(b)}</div><div class="bs">${bn(b)} does not have a color set yet. It uses the main, second, and accent colors above.</div>${ed?`<div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn("Start a color set","palStart",{p:1,s:1,data:{b}})}</div><div class="under">I will start it with your main, second, and accent colors. Then you can add more colors.</div></div>`:""}</div>`;
  const total=pal.groups.reduce((a,g)=>a+g.colors.reduce((x,c)=>x+(c.share||0),0),0)||1;
  const bar=`<div class="palbar" role="img" aria-label="How much each ${bn(b)} color should be used">${pal.groups.filter(g=>g.colors.length).map(g=>{const gs=g.colors.reduce((x,c)=>x+(c.share||0),0)||1;
    return `<div class="pg" style="flex:${gs} 1 0"><div class="segs">${g.colors.map(c=>`<i style="flex:${c.share||1} 1 0;background:${c.hex};box-shadow:${c.shade?`inset 0 -7px 0 ${c.shade}`:c.hex==="#FFFFFF"?"inset 0 0 0 1px #D5D0C3":"none"}" title="${esc(c.name)} ${c.hex}"></i>`).join("")}</div></div>`;}).join("")}</div>
    <div class="pleg">${pal.groups.filter(g=>g.colors.length).map(g=>`<span><i style="background:${g.colors[0].hex}${g.colors[0].hex==="#FFFFFF"?";box-shadow:inset 0 0 0 1px #D5D0C3":""}"></i>${esc(g.name)} · ${Math.round(g.colors.reduce((x,c)=>x+(c.share||0),0)/total*100)}%</span>`).join("")}</div>`;
  const roleOf=h=>[["primary","Main color"],["secondary","Second color"],["accent","Accent color"]].filter(([k])=>br[k]===h).map(([,l])=>`<span class="pill neutral">${l}</span>`).join("");
  const groups=pal.groups.map((g,gi)=>`<div class="pgrp"><div><div class="label">${esc(g.name)}</div><div class="under">${esc(g.note||"")}${g.id==="base"?" In dark mode, the page and window colors come from Backgrounds above.":""}</div></div>
    ${g.colors.length?"":`<div class="under">This group has no colors yet.</div>`}
    ${g.colors.map((c,ci)=>{const P=`brands.${b}.palette.groups.${gi}.colors.${ci}`;const onW=contrast(c.hex,"#FFFFFF");
      return `<div class="crow"><input type="color" id="pal-${b}-${gi}-${ci}" value="${c.hex.toLowerCase()}" data-path="${P}.hex" aria-label="${esc(c.name)} picker"><div class="cn">${ed?`<input class="inp pname" id="palname-${b}-${gi}-${ci}" value="${esc(c.name)}" data-palname="${P}" maxlength="40" aria-label="Name of this color">`:`<b>${esc(c.name)}</b>`}<span>${Math.round((c.share||0)/total*100)}% of the brand's color${c.shade?` · <span style="white-space:nowrap">Darker shade <span class="sw" style="background:${c.shade};margin:0 2px 0 4px"></span>${c.shade}</span>`:""}${onW>=4.5?" · Safe for words on white":""}</span><span style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">${roleOf(c.hex)}</span></div><input class="inp hex" id="palhex-${b}-${gi}-${ci}" value="${c.hex}" data-hex="${P}.hex" maxlength="7" aria-label="${esc(c.name)} hex code">${ed?`<button type="button" class="xbtn" data-a="palDel" data-b="${b}" data-g="${gi}" data-c="${ci}" aria-label="Remove ${esc(c.name)} from the color set" title="Remove ${esc(c.name)}">${I.x||"×"}</button>`:""}</div>`;}).join("")}</div>`).join("");
  return `<div class="box"><div class="bt">Full color set for ${bn(b)}</div><div class="bs">This is the brand's official color set. The groups and sizes show how much each color should be used. Pick the main, second, and accent colors from this set above.</div>${bar}${groups}${ed?palAdder(b):""}</div>`;
}
/* Add a color to the set: pick one from the library, or type a hex code. */
function palInfoRefresh(){const A0=S.ui.palAdd;if(!A0||!A0.b)return;const tmp=document.createElement("div");tmp.innerHTML=palAdder(A0.b);const fresh=tmp.querySelector(".libpick"),old=document.querySelector(".paladd .libpick");
  if(fresh&&old)old.replaceWith(fresh);else if(fresh){const nf=document.getElementById("paladd-name");const fld=nf&&nf.closest(".field");if(fld)fld.before(fresh);}}
function palAdder(b){
  const A=S.ui.palAdd&&S.ui.palAdd.b===b?S.ui.palAdd:null, pal=S.draft.brands[b].palette;
  if(!A) return `<div style="display:flex;flex-direction:column;gap:6px;margin-top:14px"><div class="btns">${btn("Add a color","palOpen",{s:1,data:{b}})}</div><div class="under">Pick from a large color library, or type the exact hex code from your brand guide.</div></div>`;
  const hex=hexOk(A.hex)?normHex(A.hex):"", gi=Math.min(A.g??pal.groups.length-1,pal.groups.length);
  const lib=`<div class="libgrid" role="group" aria-label="Color library">${RADIX_NAMES.map(n=>`<div class="librow"><span class="libn">${capWord(n)}</span>${RADIX[n].split(",").map((h,i)=>{const x="#"+h,on=hex===x;return `<button type="button" class="libsw${on?" on":""}" style="background:${x}" data-a="libPick" data-v="${x}" data-n="${capWord(n)} ${i+1}" aria-label="${capWord(n)} ${i+1}, ${x}" aria-pressed="${on}" title="${capWord(n)} ${i+1} ${x}"></button>`;}).join("")}</div>`).join("")}</div>
    <div class="under">Shades go from 1, the lightest, to 12, the darkest. Shade 9 is the purest color. Shades 11 and 12 are dark enough for words.</div>`;
  const info=hex?`<div class="libpick"><span class="libbig" style="background:${hex}" aria-hidden="true"></span><div class="cn"><b>${esc(A.name||hex)}</b><span>${hex} · Words on white: ${fmt(contrast(hex,"#FFFFFF"))} to 1 · White words on it: ${fmt(contrast("#FFFFFF",hex))} to 1 · Dark words on it: ${fmt(contrast(INK,hex))} to 1</span></div></div>`:"";
  return `<div class="paladd"><div class="bt" style="font-size:14px">Add a color to the ${bn(b)} set</div>
    <div class="field"><span class="fl">How to pick it</span>${seg("ui.palAddMode",S.ui.palAddMode||"library",[["library","From the color library"],["hex","Type a hex code"]],{label:"How to pick the color"})}</div>
    ${(S.ui.palAddMode||"library")==="library"?lib:`<div class="crow"><input type="color" id="paladd-pick" value="${(hex||"#3E63DD").toLowerCase()}" data-padd="hex" aria-label="New color picker"><div class="cn"><b>Hex code</b><span>Type it the way your brand guide shows it, like #6A9835.</span></div><input class="inp hex" id="paladd-hex" value="${hex}" data-padd="hex" maxlength="7" placeholder="#000000" aria-label="New color hex code"></div>`}
    ${info}
    <div class="field"><label class="fl" for="paladd-name">Name</label><input class="inp" id="paladd-name" value="${esc(A.name||"")}" data-padd="name" maxlength="40" placeholder="Like Sunrise orange"></div>
    <div class="field"><label class="fl" for="paladd-group">Group</label><select class="sel" id="paladd-group" data-padd="g">${pal.groups.map((g,i)=>`<option value="${i}"${i===gi?" selected":""}>${esc(g.name)}</option>`).join("")}<option value="${pal.groups.length}"${gi===pal.groups.length?" selected":""}>A new group: More colors</option></select></div>
    <div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn("Add to the color set","palAdd",{p:1,s:1,data:{b},dis:!hex})}${btn("Cancel","palClose",{s:1})}</div><div class="under" id="paladd-note" aria-live="polite">${hex?"":"Pick a color first."}</div></div></div>`;
}
/* Ready-made font sets: [name, heading, heading style, body, labels] */
const FONT_SETS=[["Elegant","Cormorant Garamond","italic","Atkinson Hyperlegible","Avenir Next"],["Warm and modern","Avenir Next","normal","Atkinson Hyperlegible","Avenir Next"],["Plain and official","Public Sans","normal","Public Sans","Public Sans"]];
function secType(){
  const t=S.draft.type, z=sizesFor(S.draft,S.ui.ctx,S.ui.size);
  const who=["heading","body","ui"].includes(S.ui.fontFor)?S.ui.fontFor:"body", ui=uiFont(S.draft);
  const cf={heading:t.heading,body:t.body,ui}, WHO={heading:"heading font",body:"body font",ui:"label and navigation font"};
  const ROLE={best:["ok","Easiest to read"],body:["neutral","Good for reading"],heading:["warn","For large headings only"],label:["warn","For labels and numbers only"]};
  const names=[...new Set([...fontsShown(S.draft),t.heading,t.body,ui])].filter(n=>FONTS[n]);
  const card=f=>{const F=FONTS[f],on=cf[who]===f,uses=Object.keys(cf).filter(k=>k!==who&&cf[k]===f).map(k=>WHO[k]);
    const italicNow=who==="heading"&&t.headingStyle==="italic"&&F.italic;
    return `<button type="button" class="fcard${on?" on":""}" data-a="pickFont" data-f="${esc(f)}" aria-pressed="${on}">
      <span class="fnm" style="font-family:${F.stack};font-weight:${who==="heading"?t.headingWeight:600};font-style:${italicNow?"italic":"normal"}">${esc(f)}</span>
      <span class="fsm" style="font-family:${F.stack};font-style:${italicNow?"italic":"normal"}">${F.cat==="mono"?"MEMBER ID NF-448120 · $38.00 · 9:30 AM":"Your next visit is May 1 at 9:30 AM. Il1 O0"}</span>
      <span class="ftags"><span class="pill ${ROLE[F.role][0]}">${ROLE[F.role][1]}</span><span class="pill neutral">${FONT_CATS[F.cat]}</span>${F.licensed&&!F.hosted?`<span class="pill neutral">Needs a license</span>`:""}${F.hosted?`<span class="pill neutral">Your font files</span>`:""}${on?`<span class="pill ok">Your ${WHO[who]}</span>`:""}${uses.map(u=>`<span class="pill neutral">Your ${u}</span>`).join("")}</span>
      ${F.licensed&&!F.hosted?`<span class="under">Until your company adds the font files, this shows ${esc(F.standIn)}, a free look-alike.</span>`:""}</button>`;};
  const cur=(k,l)=>{const F=FONTS[cf[k]];return `<div class="fcur"><span class="fl">${l}</span><span class="fcn" style="font-family:${F.stack};font-weight:${k==="heading"?t.headingWeight:k==="ui"?600:400};font-style:${k==="heading"&&t.headingStyle==="italic"&&F.italic?"italic":"normal"}">${esc(cf[k])}${k==="heading"&&t.headingStyle==="italic"&&F.italic?" Italic":""}</span><span class="hint">${k==="heading"?"Page titles and section headings.":k==="body"?"Sentences and paragraphs.":"Field labels, menus, tabs, badges, and buttons."}</span></div>`;};
  const SETS=FONT_SETS;
  const isSet=x=>t.heading===x[1]&&t.headingStyle===x[2]&&t.body===x[3]&&ui===x[4];
  const fontBox=`<div class="box"><div class="bt">Fonts</div><div class="bs">Pick a font for headings, one for body text, and one for labels and navigation.</div>
      <div class="fcurs">${cur("heading","Heading font")}${cur("body","Body font")}${cur("ui","Labels and navigation")}</div>
      <div class="field"><span class="fl">Try a ready-made set</span><div class="chips">${SETS.map(x=>`<button type="button" class="chip${isSet(x)?" on":""}" data-a="pickSet" data-i="${SETS.indexOf(x)}" aria-pressed="${isSet(x)}">${x[0]}</button>`).join("")}</div>
        <span class="hint">${SETS.map(x=>`${x[0]}: ${x[1]}${x[2]==="italic"?" Italic":""} headings, ${x[3]} body text, and ${x[4]} labels.`).join(" ")}</span></div>
      <div class="field"><span class="fl">You are choosing the</span>${seg("ui.fontFor",who,[["heading","Heading font"],["body","Body font"],["ui","Labels and navigation"]],{label:"Which font you are choosing"})}</div>
      ${who==="heading"?`<div class="field"><span class="fl">Heading style</span>${seg("type.headingStyle",t.headingStyle,[["normal","Regular"],["italic","Italic"]],{label:"Heading style"})}<span class="hint">${FONTS[t.heading].italic?"Italic headings feel elegant and personal. Keep them large.":`${esc(t.heading)} has no italic, so pick Regular.`}</span></div>`:""}
      ${who==="body"?`<p class="under">For body text, pick a font marked Easiest to read. Most of your customers are over 65.</p>`:who==="ui"?`<p class="under">Buttons use this font too. Button letter spacing and side space are on the Button page.</p>`:""}
      <div class="fgrid">${names.map(card).join("")}</div></div>
    ${fontLibBox()}`;
  const rows=[["Heading 1",z.h1,"heading"],["Heading 2",z.h2,"heading"],["Heading 3",z.h3,"heading"],["Body",z.base,"body"],["Label",z.sm,"ui"],["Small",z.sm,"body"]].map(([n,px,f])=>`<tr><td>${n}</td><td class="num">${px} px</td><td style="font-family:${FONTS[cf[f]].stack};font-size:${Math.min(px,34)}px;font-weight:${f==="heading"?t.headingWeight:f==="ui"?600:400};font-style:${f==="heading"&&t.headingStyle==="italic"&&FONTS[t.heading].italic?"italic":"normal"};line-height:1.2;white-space:nowrap">Your plan</td></tr>`).join("");
  const mat=CTX.map(c=>`<tr><td>${c==="consumer"?"Consumer":"Employee"}</td>${SZ.map(s=>`<td class="num">${sizesFor(S.draft,c,s).base} px</td>`).join("")}</tr>`).join("");
  const inner=`${designerBanner()}${head("Foundations","Type","Fonts and sizes are shared by both brands today. A brand can get its own fonts later without any rework.")}
    ${gnote("Most of your customers are over 65. So consumer screens use Large text by default, with body text at "+sizesFor(S.draft,"consumer","large").base+" pixels.","That is bigger than most websites use. People can still switch to Standard.")}
    ${fontBox}
    <div class="box"><div class="bt">Sizes and spacing</div>
      <div class="field"><span class="fl">Type scale</span>${seg("type.scale",t.scale,[[1.2,"Gentle"],[1.25,"Medium"],[1.333,"Strong"]])}<span class="hint">This sets how much bigger each heading is than the one below it.</span></div>
      <div class="field"><span class="fl">Heading weight</span>${seg("type.headingWeight",t.headingWeight,[[600,"Semibold"],[700,"Bold"],[800,"Extra bold"]])}</div>
      <div class="field"><span class="fl">Line spacing</span>${seg("type.lineHeight",t.lineHeight,[[1.4,"Tight"],[1.5,"Normal"],[1.6,"Roomy"]])}</div></div>
    <div class="box"><div class="bt">Sizes on ${S.ui.ctx} screens, ${S.ui.size} text</div><div class="bs">Change the screen and size above the preview to see other sizes.</div>
      <div class="tw"><table class="t"><thead><tr><th>Style</th><th>Size</th><th>Sample</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div class="box"><div class="bt">Body text size everywhere</div><div class="tw"><table class="t"><thead><tr><th>Screen</th><th>Standard</th><th>Large</th></tr></thead><tbody>${mat}</tbody></table></div></div>`;
  return wrap(inner,"screen");
}
const FONT_ROLES=[["best","Easiest to read: good for body text"],["body","Good for reading"],["heading","For large headings only"],["label","For labels and numbers only"]];
function fontLibBox(){
  const L=fontLibOf(S.draft), t=S.draft.type, ui=uiFont(S.draft), ed=canEdit();
  const all=[...FONT_LIST.map(f=>f.name),...L.added.map(f=>f.name)].filter((n,i,a)=>FONTS[n]&&a.indexOf(n)===i);
  const rows=all.map(n=>{const F=FONTS[n],hidden=L.removed.includes(n),files=L.files[n]||[],uses=[t.heading===n&&"headings",t.body===n&&"body text",ui===n&&"labels"].filter(Boolean);
    const src=files.length?`Your font files (${files.length})`:F.added?"Google Fonts":F.licensed?"Needs your company's font files":"Google Fonts";
    const act=!ed||(uses.length&&!hidden)?"":hidden?btn("Show it again","fontShow",{s:1,data:{f:n}}):F.added?btn("Remove","fontRemove",{s:1,data:{f:n}}):btn("Hide","fontHide",{s:1,data:{f:n}});
    const filesBtn=ed&&!hidden&&F.licensed&&!files.length?btn("Add font files","fontFilesFor",{s:1,data:{f:n}}):"";
    const sub=[src,hidden?"Hidden from the list":"",uses.length?`Used for ${uses.join(" and ")}`:""].filter(Boolean).join(". ")+".";
    return `<div class="frow${hidden?" dim":""}"><div class="fmeta"><span class="fnm2" style="font-family:${F.stack}">${esc(n)}</span><span class="under">${esc(sub)}</span></div>${act||filesBtn?`<div class="btns">${act}${filesBtn}</div>`:""}</div>`;}).join("");
  return `<div class="box"><div class="bt">Font library</div><div class="bs">These are the fonts people can pick above. Add a font from Google Fonts, or upload your company's own font files. Hidden and removed fonts stay in older versions, so nothing that is live breaks.</div>
    <div class="flist">${rows}</div>
    ${ed?fontAdder():""}</div>`;
}
function fontAdder(){
  const A=S.ui.fontAdd;
  if(!A) return `<div style="display:flex;flex-direction:column;gap:6px;margin-top:12px"><div class="btns">${btn("Add a font","fontOpen",{s:1})}</div><div class="under">Add any font from Google Fonts by its name, or upload font files your company owns.</div></div>`;
  const mode=S.ui.fontAddMode||"google", cat=A.cat||"sans", role=A.role||"body";
  const common=`<div class="field"><label class="fl" for="fadd-cat">Kind of font</label><select class="sel" id="fadd-cat" data-fadd="cat">${Object.entries(FONT_CATS).map(([k,l])=>`<option value="${k}"${k===cat?" selected":""}>${l}</option>`).join("")}</select></div>
    <div class="field"><label class="fl" for="fadd-role">What it is good for</label><select class="sel" id="fadd-role" data-fadd="role">${FONT_ROLES.map(([k,l])=>`<option value="${k}"${k===role?" selected":""}>${l}</option>`).join("")}</select><span class="hint">The checks use this. They warn you if a font is used where it is hard to read.</span></div>`;
  const files=A.files||[];
  const W=[[100,"Thin"],[200,"Extra light"],[300,"Light"],[400,"Regular"],[500,"Medium"],[600,"Semibold"],[700,"Bold"],[800,"Extra bold"],[900,"Black"]];
  const up=`<div class="field"><label class="fl" for="fadd-files">Font files</label><input type="file" id="fadd-files" data-fadd="pick" multiple accept=".woff2,.woff,.ttf,.otf"><span class="hint">Pick one file for each weight and style, like Regular, Bold, and Italic. .woff2 files are smallest. Only upload fonts your company has a license for.</span></div>
    ${files.length?`<div class="flist">${files.map((x,i)=>`<div class="frow"><div class="fmeta"><b style="font-size:14px;overflow-wrap:anywhere">${esc(x.fileName)}</b><span class="under">I guessed the weight and style from the file name. Fix them if they are wrong.</span></div><div class="ffsel"><select class="sel" data-ffile="${i}" data-fk="weight" aria-label="Weight of ${esc(x.fileName)}">${W.map(([v,l])=>`<option value="${v}"${v===x.weight?" selected":""}>${v} ${l}</option>`).join("")}</select><select class="sel" data-ffile="${i}" data-fk="style" aria-label="Style of ${esc(x.fileName)}"><option value="normal"${x.style!=="italic"?" selected":""}>Upright</option><option value="italic"${x.style==="italic"?" selected":""}>Italic</option></select></div></div>`).join("")}</div>`:""}`;
  return `<div class="paladd"><div class="bt" style="font-size:14px">Add a font</div>
    <div class="field"><span class="fl">Where the font comes from</span>${seg("ui.fontAddMode",mode,[["google","Google Fonts"],["upload","Upload font files"]],{label:"Where the font comes from"})}</div>
    <div class="field"><label class="fl" for="fadd-name">Font name</label><input class="inp" id="fadd-name" data-fadd="name" value="${esc(A.name||"")}" maxlength="60" placeholder="${mode==="google"?"Like Nunito Sans":"Like Avenir Next"}" list="fadd-names">${mode==="upload"?`<datalist id="fadd-names">${FONT_LIST.filter(f=>f.licensed).map(f=>`<option value="${esc(f.name)}">`).join("")}</datalist>`:""}<span class="hint">${mode==="google"?"Type the name exactly as fonts.google.com shows it.":"To add files for a font that needs a license, like Avenir Next, type its name here."}</span></div>
    ${common}
    ${mode==="upload"?up:""}
    <div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn(mode==="google"?"Find and add the font":"Upload and add the font",mode==="google"?"fontAddGoogle":"fontUpload",{p:1,s:1,dis:!!A.busy})}${btn("Cancel","fontClose",{s:1})}</div><div class="under" id="fadd-note" aria-live="polite">${esc(A.note||"")}</div></div></div>`;
}
/* Guess the weight and style from a font file name, like AvenirNext-DemiBoldItalic.woff2. */
function fontFileGuess(name){const n=name.toLowerCase().replace(/[^a-z0-9]/g,"");const style=/italic|oblique/.test(n)?"italic":"normal";
  const W=[["extralight",200],["ultralight",200],["thin",100],["hairline",100],["light",300],["book",400],["regular",400],["medium",500],["demibold",600],["semibold",600],["extrabold",800],["ultrabold",800],["heavy",800],["black",900],["bold",700]];
  const hit=W.find(([k])=>n.includes(k));const num=(n.match(/(?:^|[a-z])([1-9]00)(?:italic|$|[a-z])/)||[])[1];return {weight:num?+num:hit?hit[1]:400,style};}
function fontFilesPicked(list){const A=S.ui.fontAdd=S.ui.fontAdd||{};A.files=[...list].map(f=>({f,fileName:f.name,...fontFileGuess(f.name)}));A.note="";render();}
function setFontNote(m){S.ui.fontAdd=S.ui.fontAdd||{};S.ui.fontAdd.note=m;const n=document.getElementById("fadd-note");if(n)n.textContent=m;}
/* Checks that Google Fonts has the font. A missing font makes the style sheet fail to load. */
function googleFontAxes(name){
  const tries=["ital,wght@0,400;0,600;0,700;1,400;1,700","ital,wght@0,400;0,700;1,400;1,700","wght@400;600;700","wght@400;700",""];
  return new Promise(done=>{let i=0;const next=()=>{if(i>=tries.length)return done(null);const ax=tries[i++],l=document.createElement("link");l.rel="stylesheet";
    l.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g,"+")}${ax?":"+ax:""}&display=swap`;
    const tm=setTimeout(()=>{l.remove();done(undefined);},9000);
    l.onload=()=>{clearTimeout(tm);done(ax);};l.onerror=()=>{clearTimeout(tm);l.remove();next();};document.head.appendChild(l);};next();});}
function fontToLib(name,patch){const L=fontLibOf(S.draft);S.draft.fontLib=L;Object.assign(L,patch(L)||{});registerFonts(S.draft);if(!L.added.length&&!L.removed.length&&!Object.keys(L.files).length)delete S.draft.fontLib;}
function hostedFontCss(){let el=document.getElementById("hostedfonts");const css=[S.draft,S.published].map(st=>fontFaceCss(st,"/")).filter(Boolean).join("\n");
  if(!css){if(el)el.remove();return;}if(!el){el=document.createElement("style");el.id="hostedfonts";document.head.appendChild(el);}if(el.textContent!==css)el.textContent=css;}
function secSpace(){
  const d=S.draft.density;
  const cell=(c,k)=>isAdmin()?`<input class="inp" type="number" id="dn-${c}-${k}" style="width:74px" min="8" max="80" value="${d[c][k]}" data-num="density.${c}.${k}" aria-label="${labelFor("density."+c+"."+k)}">`:`<span class="num">${d[c][k]} px</span>`;
  const rows=[["base","Body text"],["control","Button and field height"],["gap","Space between items"],["pad","Space inside cards"]].map(([k,n])=>`<tr><td>${n}</td><td>${cell("consumer",k)}</td><td>${cell("employee",k)}</td></tr>`).join("");
  const inner=`${designerBanner()}${head("Foundations","Spacing and size","Consumer screens are roomy and easy to tap. Employee screens are tighter so they can show more at once.")}
    ${gnote("Every component reads these numbers. So one button works on both kinds of screens without a second design.","Large text makes everything about 12% bigger, including buttons.")}
    ${isAdmin()?"":lockNote("Your admin team sets these numbers. They keep buttons big enough to tap and screens easy to scan. Ask the guide if you want a change, and it will write a request for them.")}
    <div class="box"><div class="bt">Standard size values</div><div class="tw"><table class="t"><thead><tr><th>Setting</th><th>Consumer</th><th>Employee</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div class="box"><div class="bt">Rules the checks enforce</div>
      <div class="tw"><table class="t"><tbody>
        <tr><td>Consumer buttons and fields are at least 44 pixels tall.</td><td><span class="pill neutral">Must pass</span></td></tr>
        <tr><td>Employee buttons are at least 24 pixels tall.</td><td><span class="pill neutral">Must pass</span></td></tr>
        <tr><td>Consumer body text is at least 16 pixels.</td><td><span class="pill neutral">Must pass</span></td></tr>
        <tr><td>Consumer body text is 18 pixels or more in Large.</td><td><span class="pill neutral">Tip</span></td></tr></tbody></table></div></div>`;
  return wrap(inner,"screen");
}
/* ICONS: the approved set, shown like the Radix icon page. Point at an icon to see its name. */
function svgIcon(n,sz,stroke){return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||""}</svg>`;}
function pascal(n){return n.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join("");}
function secIcons(){
  const u=S.ui, q=(u.iconQ||"").trim().toLowerCase(), grp=u.iconGrp||"all", sw=(S.draft.comp.icon||{}).stroke||2;
  const sel=u.icon&&ICONS[u.icon]?u.icon:null;
  const groups=ICON_CATS.filter(([id])=>grp==="all"||id===grp).map(([id,label,names])=>[id,label,names.filter(n=>!q||n.includes(q)||label.toLowerCase().includes(q))]).filter(g=>g[2].length);
  const total=groups.reduce((a,g)=>a+g[2].length,0);
  const tile=n=>`<button type="button" class="icn${sel===n?" on":""}" data-a="pickIcon" data-n="${n}" data-name="${n}" aria-label="${n}" aria-pressed="${sel===n}">${svgIcon(n,20,sw)}</button>`;
  const detail=sel?`<div class="icbig">${svgIcon(sel,48,sw)}</div>
      <div><div class="icname">${sel}</div><div class="under">In code, this icon is called <span class="tok">${pascal(sel)}</span>.</div></div>
      <div class="icsizes">${[16,20,24,32].map(z=>`<span>${svgIcon(sel,z,sw)}<small>${z} px</small></span>`).join("")}</div>
      <pre class="codebox icode">import { ${pascal(sel)} } from "lucide-react";\n\n&lt;Button icon={&lt;${pascal(sel)} aria-hidden="true" /&gt;}&gt;\n  Your words here\n&lt;/Button&gt;</pre>
      <div class="btns">${btn("Copy the name","copyIcon",{s:1,data:{n:sel}})}${btn("Download the SVG file","dlIcon",{s:1,data:{n:sel}})}</div>
      <p class="under" id="icnote" aria-live="polite"></p>`
    :`<div class="icbig empty">${svgIcon("mouse-pointer-click" in ICONS?"mouse-pointer-click":"search",32,sw)}</div><p class="under">Click an icon to see its name, its sizes, and the code engineers use.</p>`;
  const inner=`${designerBanner()}${head("Foundations","Icons",`These are the ${Object.keys(ICONS).length} icons your teams can use. Point at an icon to see its name. Click an icon to see how to use it.`)}
    ${gnote("Every icon comes from Lucide, a free icon set that engineers already use. Apps, Figma, and AI tools all get this same list, so everyone picks from the same icons.","Icons help people scan, but many older readers do not know what an icon means. Always put words next to an icon.")}
    <div class="box"><div class="field"><span class="fl">Line thickness</span>${seg("comp.icon.stroke",sw,[[1.5,"Thin"],[2,"Medium"],[2.5,"Bold"]],{label:"Line thickness"})}<span class="hint">Thicker lines are easier to see for people with low vision. This changes every icon in both brands.</span></div>
      <div class="icsample">${["calendar","phone","pill","credit-card","map-pin"].map(n=>`<span>${svgIcon(n,20,sw)}${esc(n.replace(/-/g," ").replace(/^./,c=>c.toUpperCase()))}</span>`).join("")}</div></div>
    <div class="iclay"><div class="icmain"><div class="icbar"><input id="iconq" type="search" placeholder="Find an icon, like calendar" value="${esc(u.iconQ||"")}" aria-label="Find an icon" autocomplete="off">
      <div class="chips" role="group" aria-label="Icon groups">${[["all","All"],...ICON_CATS.map(([id,l])=>[id,l])].map(([id,l])=>`<button type="button" class="chip${grp===id?" on":""}" data-a="iconGrp" data-g="${id}" aria-pressed="${grp===id}">${esc(l)}</button>`).join("")}</div></div>
    ${total?groups.map(([id,label,names])=>`<div class="icgrp"><div class="label">${esc(label)} · ${names.length}</div><div class="icgrid">${names.map(tile).join("")}</div></div>`).join(""):`<p class="under">No icons match. Try a simpler word, like heart or money.</p>`}</div>
      <aside class="icside" aria-label="Icon details">${detail}</aside></div>`;
  return `<div class="page"><fieldset class="plain"${canEdit()?"":" disabled"}>${inner}</fieldset></div>`;
}
function secShape(){
  const s=S.draft.shape;
  const inner=`${designerBanner()}${head("Foundations","Corners and shadows","Round corners feel friendly. Square corners feel formal. Shadows help cards stand out from the page.")}
    <div class="box"><div class="field"><label for="radius">Corner size: ${s.radius} px</label><input type="range" id="radius" min="0" max="20" step="1" value="${s.radius}" data-num="shape.radius"><span class="hint">Components pick Small, Medium, or Large from this number. Medium is ${rad(S.draft,"md")} px and Large is ${rad(S.draft,"lg")} px.</span></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${["sm","md","lg","pill"].map(k=>`<div style="display:flex;flex-direction:column;gap:6px;align-items:center"><div style="width:64px;height:44px;background:var(--soft);border:1.5px solid var(--btnline);border-radius:${Math.min(rad(S.draft,k),22)}px"></div><span class="under">${RADII[k]}</span></div>`).join("")}</div>
      <div class="field"><span class="fl">Shadow</span>${seg("shape.shadow",s.shadow,[["none","None"],["soft","Soft"],["strong","Strong"]])}<span class="hint">This is the default. Each component can pick its own below.</span></div></div>`;
  return wrap(inner,"screen");
}
const COMP_SLOTS={
  button:[["bg","Button color",[["action.primary","Main color"],["highlight","Second color"],["ink","Dark"]],"The color of the main button. The words on it are picked for you."],["radius","Corners",[["sm","Small"],["md","Medium"],["lg","Large"],["pill","Round ends"]]],["weight","Word weight",[[500,"Medium"],[600,"Semibold"],[700,"Bold"]]],["case","Letter case",[["sentence","Sentence case"],["upper","ALL CAPS"]]],["track","Letter spacing",[["normal","Normal"],["wide","A little wider"],["wider","Wider"]],"A little extra space between letters makes short button words easier to read."],["pad","Space on the sides",[["normal","Normal"],["roomy","Roomy"]],"Roomy buttons are easier to tap and look calmer."]],
  field:[["border","Border",[["border.strong","Strong gray"],["border.default","Light gray"]],"The line around the box where people type."],["radius","Corners",[["none","None"],["sm","Small"],["md","Medium"],["lg","Large"]]],["labelWeight","Label weight",[[400,"Regular"],[600,"Semibold"],[700,"Bold"]]]],
  select:[["radius","Corners",[["none","None"],["sm","Small"],["md","Medium"],["lg","Large"]],"Most teams match this to the text field."],["menuShadow","Menu shadow",[["none","None"],["soft","Soft"],["strong","Strong"]]]],
  card:[["radius","Corners",[["sm","Small"],["md","Medium"],["lg","Large"]]],["shadow","Shadow",[["none","None"],["soft","Soft"],["strong","Strong"]]],["border","Border line",[["on","Show a line"],["off","No line"]]]],
  dialog:[["radius","Corners",[["md","Medium"],["lg","Large"]]],["overlay","Dark layer behind it",[[40,"Light"],[50,"Medium"],[60,"Dark"],[70,"Darker"]],"This helps people see that the rest of the page is paused."],["order","Button order",[["end","Main button on the right"],["start","Main button on the left"]]]]};
function compTokens(k){
  const st=S.draft,b=S.ui.brand,c=colorsFor(st,b,S.ui.mode),C=st.comp[k];
  const T=(slot,tok,val)=>`<tr data-tok="${esc(tok)}"><td>${slot}</td><td><span class="tok">${tok}</span></td><td class="num">${typeof val==="string"&&val.startsWith("#")?`<span class="sw" style="background:${val}"></span>${val}`:esc(val)}</td></tr>`;
  const z=sizesFor(st,S.ui.ctx,S.ui.size);
  const rows={
    button:[T("Background","{"+C.bg+"}",c.btnBg),T("Words","{color.on-action}",c.btnFg),T("Mouse over","{"+C.bg+".hover}",c.btnHover),T("Focus outline","{color.focus-ring}",c.ring),T("Height","{size.control}",z.control+" px"),T("Corners","{radius."+C.radius+"}",rad(st,C.radius)+" px")],
    field:[T("Border","{color."+C.border+"}",c.input),T("Error border","{color.status.danger}",c.danger),T("Help text","{color.text.muted}",c.mutedFg),T("Height","{size.control}",z.control+" px"),T("Corners","{radius."+C.radius+"}",rad(st,C.radius)+" px")],
    select:[T("Border","{component.field.border}",c.input),T("Chosen item","{color.action.soft}",c.secondary),T("Height","{size.control}",z.control+" px"),T("Corners","{radius."+C.radius+"}",rad(st,C.radius)+" px")],
    card:[T("Background","{color.surface.card}",c.card),T("Border","{color.border.default}",C.border==="on"?c.border:"none"),T("Padding","{space.inset}",z.pad+" px"),T("Corners","{radius."+C.radius+"}",rad(st,C.radius)+" px"),T("Shadow","{shadow."+C.shadow+"}",C.shadow)],
    dialog:[T("Background","{color.surface.card}",c.card),T("Dark layer","{color.overlay}",C.overlay+"%"),T("Main button","{component.button.danger}",c.danger),T("Corners","{radius."+C.radius+"}",rad(st,C.radius)+" px")]}[k];
  return rows.join("");
}
function compTokRows(k){
  const RR=REG[k]; if(RR.legacy) return compTokens(k);
  const st=S.draft,x={st,c:colorsFor(st,S.ui.brand,S.ui.mode),z:sizesFor(st,S.ui.ctx,S.ui.size),cfg:st.comp[k]||{}};
  return (RR.tokens?RR.tokens(x):[]).map(([p,t,v])=>`<tr data-tok="${esc(t)}"><td>${esc(p)}</td><td><span class="tok">${esc(t)}</span></td><td class="num">${typeof v==="string"&&/^#[0-9A-F]{6}$/i.test(v)?`<span class="sw" style="background:${v}"></span>${v}`:esc(v)}</td></tr>`).join("");
}
function lvlPill(l){return `<span class="lvl ${l}">${{Primitive:"Primitive",Component:"Component",Composite:"Composite",Healthcare:"Healthcare"}[l]}</span>`;}
function secComp(k){
  const RR=REG[k], C=S.draft.comp[k]||{};
  const slots=(RR.slots||[]).map(sl=>k==="button"&&sl.k==="bg"?`<div class="field"><span class="fl">${esc(sl.label)}</span>${btnPicker(S.ui.brand)}</div>`
    :sl.type==="text"?wordsField(`comp.${k}.${sl.k}`,C[sl.k],sl)
    :`<div class="field"><span class="fl">${esc(sl.label)}</span>${seg(`comp.${k}.${sl.k}`,C[sl.k],sl.opts)}${sl.hint?`<span class="hint">${esc(sl.hint)}</span>`:""}</div>`).join("");
  const g=S.draft.guidance[k]||"";
  const from=(RR.from||[]).filter(id=>REG[id]);
  const usedBy=REG_ORDER.filter(id=>(REG[id].from||[]).includes(k));
  const chip=id=>`<button class="chip" data-a="go" data-s="${id}">${esc(REG[id].name)}</button>`;
  const inner=`${designerBanner()}<div><div class="label">${CATN[RR.cat]}</div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div class="h1">${esc(RR.name)}</div>${lvlPill(RR.level)}</div><div class="lede">${esc(RR.desc)}</div>${STORY[k]&&!S.offline?`<div class="btns" style="margin-top:10px"><a class="btn s" href="${esc(S.storybook)}/?path=/docs/${STORY[k]}--docs" target="_blank" rel="noopener">Open in Storybook</a></div>`:""}</div>
    <div class="box"><div class="bt">What you can change</div>${slots||`<div class="bs" style="margin-top:0">This component has no settings of its own. It uses your colors, type, and corners${from.length?`, and the settings of the parts it is built from`:""}.</div>`}</div>
    <div class="box"><div class="bt">Built from these tokens</div><div class="bs">Values shown for ${bn(S.ui.brand)}, ${S.ui.ctx} screens, ${S.ui.size} text, ${S.ui.mode} mode.</div><div class="tw"><table class="t"><thead><tr><th>Part</th><th>Token</th><th>Value</th></tr></thead><tbody>${compTokRows(k)}</tbody></table></div></div>
    ${from.length||usedBy.length?`<div class="box"><div class="bt">How it fits with other components</div>${from.length?`<div class="field"><span class="fl">Built from</span><div class="chips">${from.map(chip).join("")}</div></div>`:""}${usedBy.length?`<div class="field"><span class="fl">Used inside</span><div class="chips">${usedBy.map(chip).join("")}</div></div>`:""}<span class="hint">When you change a part, every component built from it changes too.</span></div>`:""}
    <div class="box"><div class="bt">Properties</div><div class="bs">Engineers and AI tools use these names. They are the same in code, Storybook, and Figma.</div><div class="tw"><table class="t"><thead><tr><th>Name</th><th>Values</th><th>Notes</th></tr></thead><tbody>${(RR.props||[]).map(([n,t,d])=>`<tr><td><span class="tok">${esc(n)}</span></td><td class="code" style="font-size:11.5px">${esc(t)}</td><td>${esc(d)}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="box"><div class="bt">Accessibility</div><div style="font-size:13px;line-height:1.6">${esc(RR.a11y||"")}</div></div>
    <div class="box"><div class="bt">Guidance for AI tools</div><div class="bs">AI tools read this through Storybook before they build a screen. It tells them when and how to use this component.</div>
      ${isAdmin()?`<textarea class="inp" id="guide-${k}" data-text="guidance.${k}" rows="5">${esc(g)}</textarea>`:`<div style="font-size:13px;line-height:1.6">${esc(g)}</div>${lockNote("Your admin team writes this guidance.")}`}</div>`;
  return wrap(inner,k);
}
function secLibrary(){
  const lv=["Primitive","Component","Composite","Healthcare"], n=l=>REG_ORDER.filter(id=>REG[id].level===l).length;
  const blurb={Primitive:"The smallest parts, like a checkbox or an icon.",Component:"A few parts with one job, like a text field.",Composite:"Bigger parts with their own behavior, like a date picker or data table.",Healthcare:"Parts made for our members, like an ID card or a lab result."};
  const inner=`${head("Components","All components",`The full library has ${REG_ORDER.length} components. Every one is built from your tokens, so a change to a color or font reaches all of them.`)}
    ${gnote("Every component here works on consumer and employee screens, in both text sizes, for both brands. Use the preview on each page to see it.","Design teams can suggest new ones. I check each suggestion against this list first, so we do not end up with two components that do the same job.")}
    <div class="levels">${lv.map(l=>`<div class="stat"><div class="n">${n(l)}</div><div style="margin:2px 0 4px">${lvlPill(l)}</div><div class="l">${blurb[l]}</div></div>`).join("")}</div>
    ${CATS.map(([c,cl])=>{const ids=REG_ORDER.filter(id=>REG[id].cat===c);return `<div class="libcat"><div class="label" style="margin-top:6px">${cl} · ${ids.length}</div><div class="libgrid">${ids.map(id=>{const RR=REG[id],sl=(RR.slots||[]).length;return `<button class="libcard" data-a="go" data-s="${id}"><span class="nm">${esc(RR.name)}</span><span class="ds">${esc(RR.desc)}</span><span class="ft">${lvlPill(RR.level)}<span class="under">${sl?`${sl} setting${sl>1?"s":""}`:"No settings"}</span></span></button>`;}).join("")}</div></div>`;}).join("")}`;
  return `<div class="page">${inner}</div>`;
}
function ckItem(x){
  const col={block:"var(--red)",warn:"var(--amber)",pass:"var(--green)"}[x.level];
  const fix=x.fix&&canEdit()&&x.level!=="pass"?`<div class="btns">${btn(x.level==="block"?"Fix it for me":"Use the better value","fixCheck",{s:1,p:x.level==="block",data:{id:x.id}})}${btn("Show me first","previewFix",{s:1,data:{id:x.id}})}</div>`:"";
  return `<div class="ck${x.level==="block"?" block":""}"><span class="dotc" style="background:${col}"></span><div class="body"><div class="tt">${esc(x.title)}</div><div class="dd">${esc(x.detail)}</div><div class="wh">${x.where.map(w=>`<span class="pill neutral">${esc(w)}</span>`).join("")}${x.pair?(x.id.startsWith("fieldborder")||x.id.startsWith("ring-")?`<span class="aa" aria-hidden="true" style="background:${x.pair[1]};border:2px solid ${x.pair[0]};width:34px;height:22px;box-sizing:border-box"></span>`:`<span class="aa" data-sample="1" style="background:${x.pair[1]};color:${x.pair[0]};width:34px;height:22px;font-size:12px">Aa</span>`):""}</div>${fix}</div></div>`;
}
function secChecks(){
  const cs=checks(),k=counts();
  const inner=`${head("Release","Checks","These checks run every time anything changes. They cover both brands, both screen types, and both text sizes.")}
    <div class="stats"><div class="stat ${k.block?"bad":"ok"}"><div class="n">${k.block}</div><div class="l">Must fix before a proposal</div></div><div class="stat ${k.warn?"warn":"ok"}"><div class="n">${k.warn}</div><div class="l">Could be better</div></div><div class="stat ok"><div class="n">${k.pass}</div><div class="l">Passing</div></div></div>
    ${k.block?`<div class="label" style="margin-top:4px">Must fix</div>${cs.filter(x=>x.level==="block").map(ckItem).join("")}`:""}
    ${k.warn?`<div class="label" style="margin-top:4px">Could be better</div>${cs.filter(x=>x.level==="warn").map(ckItem).join("")}`:""}
    <div class="label" style="margin-top:4px">Passing</div>${cs.filter(x=>x.level==="pass").map(ckItem).join("")}`;
  return `<div class="page narrow">${inner}</div>`;
}
/* A short note for a change, made from its edits. The person can change it. */
function changeNote(chs){
  if(!chs.length) return "";
  const l=c=>{const x=labelFor(c.path);return brands().some(b=>x.startsWith(b.name))?x:x.charAt(0).toLowerCase()+x.slice(1);};
  if(chs.some(c=>/^brands\.[^.]+$/.test(c.path))){const c=chs.find(c=>/^brands\.[^.]+$/.test(c.path));return c.to===undefined?`Remove the ${c.from} brand`:`Add the ${c.to} brand`;}
  if(chs.length===1) return `Change the ${l(chs[0])}`;
  const names=chs.slice(0,3).map(l).join(", ");
  return `Change the ${names}${chs.length>3?`, and ${chs.length-3} more`:""}`.slice(0,140);
}
const KIND={patch:"A fix",minor:"New things",major:"A big change"};
function proposalBox(){
  const P=S.proposal; if(!P) return "";
  const nv=nextVer(S.published.version,P.bump), conf=S.ui.confirmWithdraw;
  const links=[P.url?`<a href="${esc(P.url)}" target="_blank" rel="noopener">Open pull request #${P.number}</a>`:"",P.preview?`<a href="${esc(P.preview)}" target="_blank" rel="noopener">Its Storybook</a>`:""].filter(Boolean).join(" · ");
  const list=P.changes.map((c,i)=>`<li class="pchange"><div class="cn"><b>${esc(c.note)}</b><span>${KIND[c.bump]} · ${esc(c.who)} · ${esc(fmtDate(String(c.at).slice(0,10)))}</span></div>${canEdit()?btn("Undo this change","undoChange",{s:1,data:{i}}):""}</li>`).join("");
  const state=P.state==="in review"?`<span class="pill warn">In review</span>`:`<span class="pill neutral">Draft</span>`;
  const what=P.state==="in review"?"Reviewers can see it now. You can still add changes, for example to answer their comments.":P.number?"It is a draft pull request. Reviewers are not asked to look until you submit it.":"It is saved as a branch. The pull request opens when you submit it.";
  return `<div class="box"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><div class="bt" style="flex-grow:1">${P.number?`Proposal #${P.number}`:"Your proposal"}: ${esc(P.title)}</div>${state}</div>
    <div class="bs">${what} When it lands, it becomes version <b>${nv}</b> (${KIND[P.bump].toLowerCase()}).${links?`<br>${links}`:""}</div>
    ${reviewBox(P)}
    <ol class="pchanges">${list}</ol>
    ${canEdit()?(conf?`<div class="confirm"><div style="font-size:13px;font-weight:700">Withdraw this proposal?</div><div class="under" style="color:var(--ink)">The pull request closes and its branch is deleted. Your edits stay here, so you can propose them again.</div><div class="btns">${btn("Withdraw it","withdraw",{p:1,s:1})}${btn("Keep it","withdrawCancel",{s:1})}</div></div>`
      :`<div class="btns">${P.state!=="in review"?btn("Submit for review","submitProposal",{p:1,s:1}):""}${btn("Withdraw","withdrawAsk",{s:1})}</div>`):""}</div>`;
}
/* Where the approvals stand. Reviewers approve on GitHub, on the pull request; the console only shows it. */
function reviewSummary(P){const R=P&&P.review;if(!R)return "";const w=R.pending.length,ok=R.people.filter(p=>p.state==="approved"&&p.current).length,ch=R.people.filter(p=>p.state==="changes requested").length;
  return [ok?`${ok} approved`:"",ch?`${ch} asked for changes`:"",w?`waiting on ${w}`:""].filter(Boolean).join(", ");}
function reviewBox(P){
  const names=l=>l.map(x=>x.login?`<a href="https://github.com/${esc(x.login)}" target="_blank" rel="noopener">@${esc(x.login)}</a>`:`the ${esc(x.team)} team`).join(", ");
  if(!P.number) return (P.reviewers||[]).length?`<div class="under">When you submit it, ${names(P.reviewers.map(login=>({login})))} ${P.reviewers.length>1?"are":"is"} asked to review it.</div>`:"";
  const R=P.review;if(!R)return "";
  const of=st=>R.people.filter(p=>p.state===st);
  const rows=[];
  const approved=of("approved");
  if(approved.length) rows.push(`<div class="revrow"><span class="pill ok">Approved</span><span>${approved.map(p=>`${names([p])}${p.current?"":` <span class="under">(an earlier version, before the newest change)</span>`}`).join(", ")}</span></div>`);
  if(of("changes requested").length) rows.push(`<div class="revrow"><span class="pill bad">Asked for changes</span><span>${of("changes requested").map(p=>`${names([p])}${p.url?` · <a href="${esc(p.url)}" target="_blank" rel="noopener">what they said</a>`:""}`).join(", ")}</span></div>`);
  if(R.pending.length) rows.push(`<div class="revrow"><span class="pill warn">Waiting on</span><span>${names(R.pending)}</span></div>`);
  if(of("commented").length) rows.push(`<div class="revrow"><span class="pill neutral">Commented</span><span>${names(of("commented"))}</span></div>`);
  if(of("dismissed").length) rows.push(`<div class="revrow"><span class="pill neutral">Review dismissed</span><span>${names(of("dismissed"))}</span></div>`);
  const none=!rows.length?`<div class="under">${P.state==="in review"?"Nobody has been asked to review it yet. Anyone with access can be asked on its pull request.":(P.reviewers||[]).length?`When you submit it, ${names(P.reviewers.map(login=>({login})))} ${P.reviewers.length>1?"are":"is"} asked to review it.`:"Reviewers are asked on its pull request, once you submit it."}</div>`:"";
  return `<div class="reviews"><div class="fl">Reviews</div>${rows.join("")}${none}${R.warning?`<div class="under" style="color:var(--amber)">${esc(R.warning)}</div>`:""}${R.error?`<div class="under" style="color:var(--red)">${esc(R.error)}</div>`:""}<div class="under">People review and approve on GitHub, on the pull request.</div></div>`;
}
function noticeBox(){
  const N=S.notice; if(!N) return "";
  const which=N.number?`Proposal #${N.number}`:"Your proposal";
  const body=N.kind==="landed"?`${which}, "${esc(N.title)}", landed. The design system releases the new version on its own. It shows here as live when the release finishes, in a few minutes.`:`${which}, "${esc(N.title)}", was withdrawn. Its edits are still here, so you can propose them again.`;
  return `<div class="box"><div style="display:flex;gap:10px;align-items:flex-start"><span class="pill ${N.kind==="landed"?"ok":"neutral"}">${N.kind==="landed"?"Landed":"Withdrawn"}</span><div class="bs" style="flex-grow:1;margin:0">${body}</div>${btn("Dismiss","dismissNotice",{s:1})}</div></div>`;
}
function secProposal(){
  const chs=changes(),k=counts(),P=S.proposal,base=baseState();
  const sug=chs.length?bumpFor(base,S.draft):{bump:"patch",why:""},bump=BUMPS.includes(S.ui.bump)?S.ui.bump:sug.bump;
  if(S.ui.changeNote===undefined||S.ui.changeNoteFor!==JSON.stringify(chs)){S.ui.changeNote=S.ui.undoNote||changeNote(chs);S.ui.changeNoteFor=JSON.stringify(chs);S.ui.undoNote=null;}
  const intro=P?"Each change you add is one step in the proposal. Reviewers see them all on GitHub, with a Storybook of the result. When they approve it and it lands, the design system releases a new version on its own.":"Your edits are saved here. When they are ready, add them to a proposal with a short note. The proposal becomes a pull request to the design system. When it is approved and lands, the design system releases a new version on its own.";
  const rows=chs.map(c=>`<tr><td>${esc(labelFor(c.path))}</td><td class="num">${showVal(c.path,c.from)}</td><td class="num">${showVal(c.path,c.to)}</td><td>${canEdit()?`<button class="btn s" data-a="undo" data-p="${esc(c.path)}">Undo</button>`:""}</td></tr>`).join("");
  const edits=chs.length?`<div class="box"><div class="bt">${P?"Edits not in the proposal yet":"Your edits"}</div><div class="tw"><table class="t"><thead><tr><th>Setting</th><th>${P?"In the proposal":"Live"}</th><th>Now</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`
    :`<div class="box"><div class="bt">${P?"Edits not in the proposal yet":"Your edits"}</div><div class="bs">${P?"None. Everything you edited is in the proposal.":"None yet. Edit anything in the console, and it shows up here."}</div></div>`;
  const paused=!!(S.engine&&S.engine.behind);
  const pauseBox=paused?`<div class="ck"><span class="dotc" style="background:var(--amber)"></span><div class="body"><div class="tt">The console is updating to version ${esc(S.published.version)}.</div><div class="dd">The design system has new things the console does not know yet (it runs ${esc(S.engine.version)}). It updates itself after each release, in a few minutes. Your edits are saved. Reload the page to check.</div></div></div>`:"";
  const checksBox=k.block?`<div class="ck block"><span class="dotc" style="background:var(--red)"></span><div class="body"><div class="tt">${k.block} problem${k.block>1?"s":""} must be fixed first.</div><div class="dd">${esc(checks().filter(x=>x.level==="block").map(x=>x.title).join(" "))}</div><div class="btns">${btn("Open checks","go",{s:1,data:{s:"checks"}})}</div></div></div>`:"";
  const form=chs.length&&canEdit()?`<div class="box"><div class="bt">${P?"Add a change":"Start a proposal"}</div><div class="bs">${P?"These edits become one more change in the proposal.":"These edits become its first change. You can add more changes, and submit it for review when it is ready."}</div>
      ${pauseBox}${checksBox}
      <div class="field"><label class="fl" for="chnote">What this change does</label><textarea class="inp" id="chnote" data-ui="changeNote" rows="2" maxlength="300">${esc(S.ui.changeNote||"")}</textarea><span class="hint">Reviewers and engineers read this. It goes into the release notes.</span></div>
      <div class="field"><span class="fl">This change is</span>${seg("ui.bump",bump,[["patch","A fix"],["minor","New things"],["major","A big change"]],{label:"Kind of change"})}
        <span class="hint">${bump===sug.bump?"I picked this from your edits. ":`I suggested ${KIND[sug.bump].toLowerCase()}. `}${esc(sug.why)}</span>
        <span class="hint">A fix changes values only. New things add something without taking anything away. A big change removes or renames something apps use, so apps may need work. The biggest change in a proposal decides its version.</span></div>
      ${S.previewOf?`<div class="under">This preview cannot make proposals. Try the edits here, then make the proposal in the real console.</div>`:""}
      <div class="btns">${btn(P?"Add to the proposal":"Start the proposal","addChange",{p:1,dis:!!k.block||paused||!!S.previewOf})}</div></div>`:"";
  return `<div class="page narrow">${head("Release","Proposal",intro)}${noticeBox()}${proposalBox()}${edits}${form}</div>`;
}
function secHistory(){
  const inner=`${head("Release","Versions","Each version is released by the design system when a proposal lands. To go back to an earlier version, roll back: your edits become that version, and it reaches apps when you add it to a proposal and it lands.")}
    ${S.history.length?"":gnote("No versions are released yet.","The first proposal that lands becomes version 1.0.0.")}
    ${S.history.map((h,i)=>{
      const live=h.v===S.published.version, cf=S.ui.confirmRb===h.v;
      return `<div class="ver${live?" live":""}"><div class="vn">v${h.v}</div><div class="body"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${live?`<span class="pill ok">Live now</span>`:""}<span class="meta">${esc(h.date)}</span>${h.url?`<a class="meta" href="${esc(h.url)}" target="_blank" rel="noopener">Release notes</a>`:""}</div><div class="note">${esc(h.note.replace(/^#+ .*$/gm,"").replace(/^- /gm,"").trim())}</div>
        ${cf?`<div class="confirm"><div style="font-size:13px;font-weight:700">Make your edits version ${h.v}?</div><div class="under" style="color:var(--ink)">Your edits become version ${h.v}, and any edits you made on top of the live version stay. Nothing changes in apps until you add it to a proposal and it lands.</div><div class="btns">${btn("Roll back to "+h.v,"doRb",{p:1,s:1,data:{v:h.v}})}${btn("Cancel","cancelRb",{s:1})}</div></div>`
        :`<div class="btns">${!live&&canEdit()?btn("Roll back to this version","askRb",{s:1,data:{v:h.v}}):""}</div>`}</div></div>`;}).join("")}`;
  return `<div class="page narrow">${inner}</div>`;
}

/* ---------------- EXPORT: DTCG + Tailwind v4 / shadcn CSS ---------------- */
function hl(txt,name){
  let h=esc(txt);
  if(name.endsWith(".css")) h=h.replace(/(\/\*[\s\S]*?\*\/)/g,'<span class="c">$1</span>').replace(/(--[a-z0-9-]+)(?=:)/g,'<span class="k">$1</span>');
  else h=h.replace(/(&quot;[^&]*?&quot;)(\s*:)/g,'<span class="k">$1</span>$2').replace(/(:\s*)(&quot;[^&]*?&quot;)/g,'$1<span class="s">$2</span>');
  return h;
}
function fileText(st,name){const f=files(st,st.version||S.published.version)[name];return typeof f==="string"?f:JSON.stringify(f,null,2);}
function secExport(){
  const st=clone(S.published), names=Object.keys(files(st)), cur=names.includes(S.ui.exportFile)?S.ui.exportFile:"theme.css";
  const txt=fileText(st,cur);
  const inner=`${head("Release","Use it in apps and Figma",`Everything below is made from the live version, v${S.published.version}. Your edits are not in it until they land in a new version.`)}
    <div class="steps3">
      <div class="step"><div class="sn">1</div><div class="st">Engineers</div><div class="sd">Apps import <span class="tok">theme.css</span>. It uses the same names as shadcn, so the components you already have pick up the brand. To switch brands, change one word on the page: <span class="tok">data-brand</span>.</div></div>
      <div class="step"><div class="sn">2</div><div class="st">Designers in Figma</div><div class="sd">In Figma, open Local variables and choose Import, then pick the files in the tokens folder. A full Figma setup, with brand and screen modes, comes in the next phase.</div></div>
      <div class="step"><div class="sn">3</div><div class="st">AI tools</div><div class="sd">Add <span class="tok">.mcp.json</span> to a project. AI tools can then ask Storybook which components exist, read the guidance, and install them from your shadcn registry.</div></div></div>
    <div class="box"><div class="bt">Files</div><div class="bs">Token files follow the W3C design tokens format (2025.10). The resolver file ties the brands and screens together. <span class="tok">tokens.resolved.json</span> lists every final color and size, for tools that cannot read the other files.</div>
      <div class="ftabs" role="tablist">${names.map(n=>`<button role="tab" aria-selected="${n===cur}" class="${n===cur?"on":""}" data-a="file" data-f="${esc(n)}">${esc(n)}</button>`).join("")}</div>
      <pre class="codebox" tabindex="0" aria-label="${esc(cur)}">${hl(txt,cur)}</pre>
      <div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn("Copy this file","copy",{p:1,s:1})}${btn("Download this file","dl",{s:1})}</div><div class="under" id="copynote">The same files are in the dist folder of your project. They update every time you publish.</div></div></div>`;
  return `<div class="page">${inner}</div>`;
}

/* =====================================================================
   FIGMA: open the library, and sync both ways
   ===================================================================== */
const EXT_ICON='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
function agoShort(t){const m=Math.round((Date.now()-new Date(t).getTime())/60000);return m<1?"Just now":m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} d ago`;}
function agoLong(t){const m=Math.round((Date.now()-new Date(t).getTime())/60000);return m<1?"just now":m<60?`${m} minute${m>1?"s":""} ago`:m<1440?`${Math.round(m/60)} hour${Math.round(m/60)>1?"s":""} ago`:new Date(t).toLocaleDateString(undefined,{month:"long",day:"numeric"});}
function figNavButton(){const f=S.figma||{};
  if(f.fileUrl) return `<a class="figopen" href="${esc(f.fileUrl)}" target="_blank" rel="noopener">${I.n.figma}<span>Open in Figma</span>${EXT_ICON}<span class="sr-only"> (opens a new tab)</span></a>`;
  return canEdit()?`<button type="button" class="figopen" data-a="go" data-s="figma">${I.n.figma}<span>Connect Figma</span></button>`:"";}
const FIG_ST={same:["neutral","Same"],console:["warn","Changed here"],figma:["warn","Changed in Figma"],both:["bad","Changed in both places"],new:["neutral","New to Figma"],gone:["warn","Removed in Figma"],
  extra:["warn","Only in Figma"],deleted:["warn","Removed here"],fixed:["neutral","Made by the console"],bad:["bad","Does not fit"],type:["bad","Wrong kind in Figma"]};
function figV(type,v){if(v===undefined||v===null)return `<span class="under">Not there</span>`;if(type==="COLOR")return `<span class="sw" style="background:${String(v).slice(0,7)}"></span>${esc(v)}`;return esc(String(v));}
function figPickOf(r){const p=(S.fig.picks||{})[r.rk];return p===undefined?r.pick:p;}
function figOptions(r){const keep=[["skip","Leave both as they are"]];
  if(r.status==="type"||r.status==="alias"||(r.adminOnly&&!r.canFigma)) return keep;
  if(r.status==="new") return [["console","Add it to Figma"]];
  if(r.status==="fixed"||r.status==="bad") return r.canConsole===false?keep:[["console","Send the console's value to Figma"]];
  if(r.status==="extra") return [["figma","Add it to the color set"],["skip","Leave it out"]];
  if(r.status==="deleted") return [["console","Remove it from Figma too"],["figma","Put it back here"]];
  if(r.status==="gone"&&r.coll==="sets") return [["figma","Remove it here too"],["console","Put it back in Figma"]];
  if(r.status==="gone") return [["console","Put it back in Figma"]];
  const o=[];if(r.canConsole!==false)o.push(["console","Keep the console's"]);if(r.canFigma)o.push(["figma","Use Figma's"]);if(r.canConsole===false)o.push(["skip","Leave both as they are"]);
  return o.length?o:keep;}
function figRow(r){const opts=figOptions(r),p=figPickOf(r),[cls,txt]=FIG_ST[r.status]||["neutral",r.status];
  const choice=opts.length>1?`<div class="seg" role="group" aria-label="What to keep for ${esc(r.label)}">${opts.map(([v,l])=>`<button type="button" class="${p===v?"on":""}" data-a="figPick" data-rk="${esc(r.rk)}" data-v="${v}" aria-pressed="${p===v}">${esc(l)}</button>`).join("")}</div>`:`<span class="under">${esc(opts[0][1])}.</span>`;
  return `<div class="figrow${p===null?" open":""}"><div class="figwhat"><b>${esc(capWord(r.label))}</b><span class="pill ${cls}">${txt}</span></div>
    <div class="figvals"><span><span class="under">Console</span> ${figV(r.type,r.c)}</span><span><span class="under">Figma</span> ${figV(r.type,r.f)}</span></div>
    <div class="figchoice">${choice}</div>${r.why?`<div class="under">${esc(r.why)}</div>`:""}</div>`;}
function figReview(){const F=S.fig;if(!F.rows)return "";
  const diff=F.rows.filter(r=>r.status!=="same"),open=diff.filter(r=>figPickOf(r)===null).length;
  const toFig=diff.filter(r=>figPickOf(r)==="console").length,toHere=diff.filter(r=>figPickOf(r)==="figma").length;
  if(!diff.length&&!(F.extras&&(F.extras.colors.length||F.extras.fonts.length))) return `<div class="box"><div class="bt">Everything matches</div><div class="bs">Figma and your edits have the same ${F.rows.length} values. There is nothing to sync.</div></div>`;
  const groups=FIG_COLLS.map(c=>{const rs=diff.filter(r=>r.coll===c.id);if(!rs.length)return "";
    const quiet=rs.filter(r=>r.status==="new"||r.status==="fixed"),loud=rs.filter(r=>!quiet.includes(r)),show=(F.show||{})[c.id];
    return `<div class="figgrp"><div class="label">${esc(c.name)}</div>${loud.map(figRow).join("")}
      ${quiet.length?`<div class="figquiet"><span>${quiet.filter(r=>r.status==="new").length?`${quiet.filter(r=>r.status==="new").length} new value${quiet.filter(r=>r.status==="new").length>1?"s":""} will be added to Figma. `:""}${quiet.filter(r=>r.status==="fixed").length?`${quiet.filter(r=>r.status==="fixed").length} color${quiet.filter(r=>r.status==="fixed").length>1?"s":""} made by the console will be sent to Figma.`:""}</span>${btn(show?"Hide them":"Show them","figShow",{s:1,data:{c:c.id}})}</div>${show?quiet.map(figRow).join(""):""}`:""}</div>`;}).join("");
  const ex=F.extras||{colors:[],fonts:[]};
  const extras=ex.colors.length||ex.fonts.length?`<div class="figgrp"><div class="label">Also in your Figma file</div>
    ${ex.colors.length?`<div class="field"><span class="fl">Color styles that are not in a color set</span><div class="figextra">${ex.colors.map((x,i)=>{const on=(F.add||{})[i];return `<label class="figcol"><input type="checkbox" data-figadd="${i}"${on?" checked":""}><span class="sw" style="background:${x.hex}"></span><span>${esc(x.name)} <span class="under">${x.hex}</span></span></label>`;}).join("")}</div>
      <div class="field"><label class="fl" for="fig-addto">Add the checked colors to</label><select class="sel" id="fig-addto" data-figui="addTo">${brands().map(b=>`<option value="${b.id}"${(F.addTo||S.ui.brand)===b.id?" selected":""}>The ${b.name} color set</option>`).join("")}</select></div></div>`:""}
    ${ex.fonts.length?`<div class="field"><span class="fl">Fonts in your text styles that are not in the font library</span><div class="btns">${ex.fonts.map(f=>btn(`Add ${f}`,"figFont",{s:1,data:{f}})).join("")}</div><span class="hint">This opens the Type page so you can add the font from Google Fonts or upload its files.</span></div>`:""}</div>`:"";
  const label=F.source==="files"?"Use these choices":"Sync now";
  const quietN=diff.filter(r=>r.status==="new"||r.status==="fixed").length,loudN=diff.length-quietN;
  return `<div class="box"><div class="bt">${loudN?`${loudN} thing${loudN===1?"":"s"} to review`:"Ready to sync"}</div>
    <div class="bs">${quietN?`${quietN} value${quietN===1?"":"s"} only need${quietN===1?"s":""} to go to Figma. `:""}${open?`${open} thing${open>1?"s":""} changed in both places since the last sync. Pick which one to keep for ${open>1?"each one":"it"}. `:""}${diff.some(r=>figOptions(r).length>1)?"You can change any choice before you sync.":""}</div>
    ${diff.some(r=>figOptions(r).some(o=>o[0]==="figma"))?`<div class="btns" style="margin-bottom:6px">${btn("Use Figma's for all","figAll",{s:1,data:{v:"figma"}})}${btn("Keep the console's for all","figAll",{s:1,data:{v:"console"}})}</div>`:""}
    ${groups}${extras}
    <div class="figgo"><div class="btns">${btn(label,"figApply",{p:1,dis:!!open||F.busy})}${btn("Cancel","figCancel",{s:1})}</div>
      <div class="under" aria-live="polite">${open?`Pick for ${open} more thing${open>1?"s":""} first.`:F.source==="files"?`This changes ${toHere} thing${toHere===1?"":"s"} in your edits. Then you download new files for Figma.`:`This sends ${toFig} value${toFig===1?"":"s"} to Figma and changes ${toHere} thing${toHere===1?"":"s"} in your draft.`}</div></div></div>`;}
function secFigma(){
  S.fig=S.fig||{};const f=S.figma||{},F=S.fig,ed=canEdit();
  const steps=`<ol class="figsteps"><li>In Figma, open the menu at the top left, then <b>Settings</b>, then the <b>Security</b> tab.</li><li>Under <b>Personal access tokens</b>, pick <b>Generate new token</b>.</li><li>Give it access to <b>File content: read</b> and <b>Variables: read and write</b>.</li><li>Copy the token and paste it here. The console keeps it on the team's server, and never sends it to anyone's browser. It never goes into your design system files.</li></ol>`;
  const err=F.error?`<div class="figerr" role="alert">${esc(F.error)}</div>`:"";
  let top;
  if(S.offline) top=`<div class="box"><div class="bt">Your Figma library</div><div class="bs">The live connection to Figma works in the local version on your computer. In this prototype, you can save the link and sync with files.</div>
    <div class="field"><label class="fl" for="fig-link">Figma file link</label><input class="inp" id="fig-link" data-figui="link" value="${esc(F.link??f.fileUrl??"")}" placeholder="https://www.figma.com/design/…"></div>
    <div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn("Save the link","figLink",{p:1,s:1})}</div><div class="under">After you save it, Open in Figma shows at the top of the left column.</div></div></div>`;
  else if(!f.connected) top=`<div class="box"><div class="bt">Connect your Figma library</div><div class="bs">The console reads your library's variables and styles, compares them with your edits, and sends changes both ways.${f.fileUrl?` Your link is saved, so Open in Figma already works.`:""}</div>
    ${ed?`<div class="field"><label class="fl" for="fig-link">Figma file link</label><input class="inp" id="fig-link" data-figui="link" value="${esc(F.link??f.fileUrl??"")}" placeholder="https://www.figma.com/design/…" autocomplete="off"><span class="hint">In Figma, pick Share, then Copy link.</span></div>
    <div class="field"><label class="fl" for="fig-token">Figma access token</label><input class="inp" id="fig-token" data-figui="token" type="password" value="${esc(F.token||"")}" autocomplete="off" spellcheck="false" placeholder="${f.hasToken?"A token is saved. Paste a new one to replace it.":"figd_…"}"><span class="hint">How to make a token:</span>${steps}</div>
    <div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn("Connect to Figma","figConnect",{p:1,dis:!!F.busy})}${btn("Save the link only","figLink",{s:1})}</div><div class="under" aria-live="polite">${F.busy==="connect"?"Checking the file with Figma…":"Figma lets other tools read and change variables only on its Enterprise plan. On other plans, the link still works, and you can sync with files below."}</div></div>`:`<p class="under">The brand team or the admin team connects Figma.</p>`}${err}</div>`;
  else top=`<div class="box"><div class="bt">${esc(f.fileName||"Your Figma library")}</div><div class="bs">${f.lastSync?`Last synced ${agoLong(f.lastSync)}${f.lastSource==="files"?", with files":""}.`:"Not synced yet. The first sync reads your file first. Where Figma already has a value, the console starts with Figma's value. Then it adds what is missing."}</div>
    ${f.varsBlocked?`<div class="figerr">Figma did not let the console read variables. Figma only allows that on its Enterprise plan, with a full seat. Sync with files below instead.</div>`:""}
    <div style="display:flex;flex-direction:column;gap:6px"><div class="btns"><a class="btn" href="${esc(f.fileUrl)}" target="_blank" rel="noopener">Open in Figma ${EXT_ICON}<span class="sr-only"> (opens a new tab)</span></a>${ed&&!f.varsBlocked?btn(F.busy==="compare"?"Checking…":"Check for changes","figCompare",{p:1,dis:!!F.busy}):""}${ed?btn("Change the file or token","figEdit",{s:0}):""}${ed?btn("Disconnect","figDisconnect",{s:0}):""}</div>
      <div class="under" aria-live="polite">${F.busy==="compare"?"Reading your Figma file…":F.busy==="apply"?"Syncing…":F.done?esc(F.done):ed?"Checking does not change anything. You review every difference first.":""}</div></div>${err}</div>`;
  const filesBox=`<div class="box"><div class="bt">Sync with files instead</div><div class="bs">Use files if your Figma plan does not allow the connection above. Figma can import and export these files in its Variables panel.</div>
    <div class="steps3"><div class="step"><div class="sn">1</div><div class="st">Send the console to Figma</div><div class="sd">Download one file for each collection and mode. In Figma, open Local variables, pick Import, and pick all the files.</div><div class="btns" style="margin-top:8px">${btn("Download files for Figma","figDownload",{s:1})}</div></div>
      <div class="step"><div class="sn">2</div><div class="st">Bring Figma's changes here</div><div class="sd">In Figma, export the variables, then pick the files here. You review every difference before anything changes.</div>${ed?`<div class="field" style="margin-top:8px"><label class="fl" for="fig-files">Files from Figma</label><input type="file" id="fig-files" data-figfiles="1" multiple accept=".json"></div>`:""}</div></div>
    ${F.files&&F.files.some(x=>!x.coll||!x.mode)?`<div class="field"><span class="fl">Tell me what these files are</span>${F.files.map((x,i)=>x.coll&&x.mode?"":`<div class="figfile"><span>${esc(x.name)}</span><select class="sel" data-figfile="${i}" data-k="coll" aria-label="Collection for ${esc(x.name)}"><option value="">Pick a collection</option>${FIG_COLLS.map(c=>`<option value="${c.id}"${x.coll===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select>${x.coll?`<select class="sel" data-figfile="${i}" data-k="mode" aria-label="Mode for ${esc(x.name)}"><option value="">Pick a mode</option>${figModes(x.coll).map(m=>`<option${x.mode===m?" selected":""}>${esc(m)}</option>`).join("")}</select>`:""}</div>`).join("")}<div class="btns">${btn("Compare these files","figFilesCompare",{s:1})}</div></div>`:""}
    ${F.outFiles?`<div style="display:flex;flex-direction:column;gap:6px"><div class="btns">${btn("Download the updated files for Figma","figDownloadOut",{p:1,s:1})}</div><div class="under">Import them in Figma so both sides match.</div></div>`:""}</div>`;
  const inner=`${head("Figma","Sync with Figma","Either side can change anything. When both change the same thing, you pick which one to keep.")}
    ${gnote("Designers can keep the detailed work in Figma. The console keeps the checks, so anything that comes in from Figma is checked for older readers before it goes into a proposal.","Nothing changes until you review the differences and pick Sync now.")}
    ${top}${figReview()}${filesBox}
    <div class="box"><div class="bt">What syncs</div><div class="tw"><table class="t"><thead><tr><th>Figma collection</th><th>Modes</th><th>What is in it</th></tr></thead><tbody>${FIG_COLLS.map(c=>`<tr><td>${esc(c.name)}</td><td>${figModes(c.id).join(", ")}</td><td>${esc(c.desc.replace(/ Made by the Brand Console\.$/,""))}</td></tr>`).join("")}</tbody></table></div>
      <p class="under">Theme colors that the console makes from other colors always come from the console. Spacing comes from Figma only when the admin team syncs. Component guidance stays in the console.</p></div>`;
  return `<div class="page"><fieldset class="plain"${ed?"":" disabled"}>${inner}</fieldset></div>`;}
function figSet(patch){S.fig={...(S.fig||{}),...patch};render();}
function figDownloadFiles(files){files.forEach((f,i)=>setTimeout(()=>{const data=JSON.stringify(f.json,null,2)+"\n";
  if(S.dl){S.dl.save({filename:f.name,data}).catch(()=>{});return;}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));a.download=f.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);},i*350));
  toast(`Downloading ${files.length} files for Figma.`);}
async function figReadFiles(list){return Promise.all([...list].map(f=>new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>{try{const json=JSON.parse(String(r.result));ok({name:f.name,json,...figGuessFile(f.name,json,S.draft)});}catch(e){bad(new Error(`${f.name} is not a token file. Pick the .json files you exported from Figma.`));}};r.onerror=()=>bad(new Error(`I could not read ${f.name}.`));r.readAsText(f);})));}
async function figCompareFiles(){const F=S.fig,files=(F.files||[]).filter(x=>x.coll&&x.mode);if(!files.length){figSet({error:"Pick at least one file, and tell me what it is."});return;}
  figSet({busy:"compare",error:null,rows:null,outFiles:null});
  try{let r;if(S.offline){const vars=figFromFiles(files),seen=new Set(files.map(x=>x.coll));const rows=figCompare(S.draft,vars,S.figBase||null,{role:S.role}).filter(x=>seen.has(x.coll)&&(x.f!==undefined||x.status==="deleted"));r={rows};}
    else r=await api("POST","/api/figma/files/compare",{files:files.map(x=>({name:x.name,json:x.json,coll:x.coll,mode:x.mode})),role:S.role});
    figSet({busy:null,rows:r.rows,picks:{},extras:null,source:"files"});}
  catch(e){figSet({busy:null,error:e.message});}}
/* =====================================================================
   HELPER (assistant) — voice + typed, agent drafts, person reviews
   ===================================================================== */
const VOICE={
  color:"Our main color is too light for white button words. How do we fix that without losing the color?",
  type:"Is our text big enough for people over sixty five? What would you change?",
  space:"Can employee screens fit more rows without the text getting too small?",
  shape:"I want the corners to feel a little softer and friendlier.",
  button:"Should our buttons use all capital letters so they stand out more?",
  field:"The lines around the fields look faint to me. Can people still see them?",
  select:"Make the dropdown feel the same as the text fields.",
  card:"The cards feel flat. Can they stand out a bit more from the page?",
  dialog:"Can the dark layer behind a pop-up be a little lighter?",
  _:"Make our main color feel a little warmer, but keep it easy to read."};
const SUGG={
  color:["Can I use white words on our main color?","Which accent colors are safe for words?","Fix every problem for me"],
  type:["Is our text big enough?","Pick a font for older readers"],
  button:["Should buttons use all caps?","Make buttons feel friendlier"],
  _:["Fix every problem for me","Make our main color warmer","Is our text big enough?"]};
function msgHTML(m){
  if(m.who==="me") return `<div class="msg me"><div class="me-av">MR</div><div class="body"><div class="who">You${m.voice?" · spoken":""}</div><div class="bub">${esc(m.x)}</div></div></div>`;
  const p=m.prop&&S.props[m.prop];
  return `<div class="msg">${gbadge(24)}<div class="body"><div class="who">Guide</div><div class="bub">${m.thinking?`<span class="think"><i></i><i></i><i></i></span> Thinking about your edits`:esc(m.x)}</div>${p?propHTML(p):""}${m.thinking?`<div class="btns" style="margin-top:6px">${btn("Stop","stopAsk",{s:1})}</div>`:""}</div></div>`;
}
function propHTML(p){
  const after=applyCh(S.draft,p.changes), k0=counts(), cs=runChecks(after), kb=cs.filter(x=>x.level==="block").length;
  const ok=kb<=k0.block;
  let status;
  if(p.state==="applied") status=`Added to your edits. You can undo it on the Proposal page.`;
  else if(p.state==="dismissed") status=`You said no to this idea.`;
  else status=kb?`With this idea, ${kb} check${kb>1?"s":""} would still fail.`:`With this idea, every must-pass check passes.`;
  const acts=p.state==="open"&&canEdit()?`<div class="btns">${btn("Add to my edits","applyProp",{p:1,s:1,data:{id:p.id}})}${btn(S.preview===p.id?"Stop showing":"Show me first","previewProp",{s:1,data:{id:p.id}})}${btn("No thanks","dismissProp",{s:1,data:{id:p.id}})}</div>`:"";
  return `<div class="prop"><div class="ph">${p.state==="applied"?"Added":"Suggested change"}</div>${p.changes.map(c=>`<div class="chg"><b>${esc(labelFor(c.path))}</b><div class="ft">${showVal(c.path,c.from)} → ${showVal(c.path,c.value)}</div>${c.why?`<div class="why">${esc(c.why)}</div>`:""}</div>`).join("")}
    ${acts}<div class="under" style="${ok||p.state!=="open"?"":"color:var(--red)"}">${status}</div></div>`;
}
function composer(){
  const v=S.voice;
  if(v){const bars=[5,9,15,11,21,14,8,18,12,6,19,11].map((h,i)=>`<i style="height:${h}px;animation-delay:${i*70}ms"></i>`).join("");
    return `<div class="cmp rec" id="cmp"><div class="rec-t"><div class="bars">${bars}</div><span class="tx" id="vtx">${esc(v.text||"I am listening…")}</span></div><button class="cbtn redb" data-a="voiceStop" aria-label="Stop talking" title="Stop talking">${I.stop}</button></div>`;}
  const has=S.draftText.trim();
  return `<div class="cmp" id="cmp"><input id="askin" value="${esc(S.draftText)}" placeholder="Ask for a change, or tap the mic and talk" aria-label="Ask the guide" autocomplete="off">${has?`<button class="cbtn dark" data-a="ask" aria-label="Send" title="Send">${I.send}</button>`:`<button class="cbtn dark" data-a="voiceStart" aria-label="Tap to talk" title="Tap to talk">${I.mic()}</button>`}</div>`;
}
function asst(){
  if(!S.ui.asst) return `<div class="asst-c"><button class="iconbtn" data-a="asstOpen" aria-label="Show the guide" title="Show the guide">${I.chevL}</button><button class="bigmic" data-a="asstOpenTalk" aria-label="Talk to the guide" title="Talk to the guide">${I.mic("#fff",18)}</button><div class="vt">Guide</div></div>`;
  const sg=(SUGG[S.sec]||SUGG._).map(s=>`<button class="chip" data-a="sugg" data-t="${esc(s)}">${esc(s)}</button>`).join("");
  return `<aside class="asst" aria-label="Design guide"><div class="asst-head">${gbadge(28)}<div style="flex-grow:1;min-width:0"><div class="t">Design guide</div><div class="s">It can see your edits. It never adds anything to a proposal by itself.</div></div><button class="iconbtn" data-a="asstClose" aria-label="Hide the guide" title="Hide the guide">${window.innerWidth<=820?I.x:I.chevR}</button></div>
    <div class="asst-list" id="alist">${S.msgs.map(msgHTML).join("")}</div>
    <div class="asst-foot"><div class="sugg">${sg}</div>${composer()}<div class="under">${S.ai.server?`The guide uses Claude (${esc(S.ai.model)}). Nothing changes until you add it to your edits.`:S.ai.live?"The guide uses Claude. Nothing changes until you add it to your edits.":S.offline?"The guide asks Claude when this page allows it. Otherwise it gives sample answers.":"The guide is using sample answers. Add a Claude API key to the .env file to connect it."} ${SR?"Tap the mic and talk. Your browser turns your words into text.":"This browser cannot turn speech into text, so the mic plays a sample."}</div></div></aside>`;
}
function addMsg(m){S.msgs.push(m);}
function addProp(changes,extra={}){const id="p"+(S.nextId++);S.props[id]={id,changes:changes.map(c=>({...c,from:getP(S.draft,c.path)})),state:"open",...extra};return id;}

/* whitelist for anything the model proposes */
const ALLOWED=[
  [/^brands\.([a-z][a-z0-9-]*)\.(primary|secondary|accent)$/,v=>hexOk(v)?normHex(v):null],
  [/^brands\.([a-z][a-z0-9-]*)\.bg\.(light|dark)\.(page|card)$/,v=>hexOk(v)?normHex(v):null],
  [/^gray$/,v=>["warm","neutral","cool","brand"].includes(v)?v:null],
  [/^brands\.([a-z][a-z0-9-]*)\.pairs\.(light|dark)\.(link|body|tag|tagBg|soft|softBg)$/,v=>hexOk(v)?normHex(v):null],
  [/^brands\.([a-z][a-z0-9-]*)\.wordGoal$/,v=>["rule","best"].includes(v)?v:null],
  [/^brands\.([a-z][a-z0-9-]*)\.onPrimary$/,v=>["auto","white","dark"].includes(v)?v:hexOk(v)?normHex(v):null],
  [/^brands\.([a-z][a-z0-9-]*)\.look\.(light|dark)\.kind$/,v=>["solid","gradient"].includes(v)?v:null],
  [/^brands\.([a-z][a-z0-9-]*)\.look\.(light|dark)\.to$/,v=>hexOk(v)?normHex(v):null],
  [/^brands\.([a-z][a-z0-9-]*)\.look\.(light|dark)\.angle$/,v=>["down","diag","side","glow"].includes(v)?v:null],
  [/^brands\.([a-z][a-z0-9-]*)\.look\.(light|dark)\.veil$/,v=>(+v>=0.5&&+v<=0.97)?+(+v).toFixed(2):null],
  [/^brands\.([a-z][a-z0-9-]*)\.look\.(light|dark)\.glass$/,v=>(+v>=0.6&&+v<=1)?+(+v).toFixed(2):null],
  [/^brands\.([a-z][a-z0-9-]*)\.look\.(light|dark)\.blur$/,v=>[0,4,8,16].includes(+v)?+v:null],
  [/^system\.(danger|success|warning)$/,v=>hexOk(v)?normHex(v):null],
  [/^type\.(heading|body|ui)$/,v=>FONTS[v]?v:null],
  [/^type\.headingStyle$/,v=>["normal","italic"].includes(v)?v:null],
  [/^type\.scale$/,v=>[1.2,1.25,1.333].includes(+v)?+v:null],
  [/^type\.headingWeight$/,v=>[600,700,800].includes(+v)?+v:null],
  [/^type\.lineHeight$/,v=>[1.4,1.5,1.6].includes(+v)?+v:null],
  [/^shape\.radius$/,v=>(+v>=0&&+v<=20)?Math.round(+v):null],
  [/^shape\.shadow$/,v=>["none","soft","strong"].includes(v)?v:null],
  [/^brands\.([a-z][a-z0-9-]*)\.ai\.color$/,v=>AI_SOURCES.some(([x])=>x===v)?v:null],
  [/^brands\.([a-z][a-z0-9-]*)\.ai\.picture$/,v=>AI_PICTURES.some(([x])=>x===v)?v:null],
  /* Approved words (text settings, like the AI limits notice) and the assistant's name are only typed by people. */
  ...REG_ORDER.flatMap(id=>(REG[id].slots||[]).filter(sl=>sl.opts).map(sl=>[new RegExp(`^comp\\.${id.replace(/-/g,"\\-")}\\.${sl.k}$`),v=>{const o=sl.opts.find(([x])=>String(x)===String(v));return o?o[0]:null;}]))];
function cleanChanges(list){const out=[];(Array.isArray(list)?list:[]).slice(0,6).forEach(c=>{if(!c||typeof c.path!=="string")return;
  const mb=c.path.match(/^brands\.([^.]+)\./);if(mb&&!Object.hasOwn(S.draft.brands,mb[1]))return;
  for(const [re,fn] of ALLOWED){if(re.test(c.path)){const v=fn(c.value);if(v!==null&&v!==getP(S.draft,c.path)) out.push({path:c.path,value:v,why:String(c.why||"").slice(0,240)});return;}}});return out;}

function summaryForModel(){
  const d=S.draft, cs=checks().filter(x=>x.level!=="pass").map(x=>`- [${x.level==="block"?"MUST FIX":"tip"}] ${x.title} ${x.detail}`).join("\n")||"- none";
  return `DRAFT DESIGN SYSTEM (${brands().length} brand${brands().length>1?"s":""}, colors only differ between brands, the first is the default):
${brands().map(b=>`- ${b.name} (id ${b.id}): primary ${d.brands[b.id].primary}, secondary ${d.brands[b.id].secondary}, accent ${d.brands[b.id].accent}, words on primary: ${d.brands[b.id].onPrimary}, backgrounds: light page ${bgOf(d.brands[b.id],"light","page")} / light window ${bgOf(d.brands[b.id],"light","card")} / dark page ${bgOf(d.brands[b.id],"dark","page")} / dark window ${bgOf(d.brands[b.id],"dark","card")}${d.brands[b.id].palette?`\n  Official color set (in order of importance): ${d.brands[b.id].palette.groups.map(g=>`${g.name}: ${g.colors.map(c=>`${c.name} ${c.hex} (${c.share}%)`).join(", ")}`).join(" | ")}`:""}`).join("\n")}
- Page looks: ${brands().map(b=>["light","dark"].map(md=>`${b.id} ${md}: ${lookSummary(lookOf(d.brands[b.id],md))}`).join("; ")).join("; ")}
- Gray color: ${d.gray||"warm"}
- Shared: danger ${d.system.danger}, success ${d.system.success}, warning ${d.system.warning}
- Type: heading font ${d.type.heading} (${d.type.headingStyle}), body font ${d.type.body}, label font ${uiFont(d)}, scale ${d.type.scale}, heading weight ${d.type.headingWeight}, line height ${d.type.lineHeight}
- Shape: base corner radius ${d.shape.radius}px, default shadow ${d.shape.shadow}
- Components: ${JSON.stringify(d.comp)}
- Sizes (admin-owned, not changeable by you): consumer body ${sizesFor(d,"consumer","standard").base}px (${sizesFor(d,"consumer","large").base}px in Large, the default), consumer control height ${sizesFor(d,"consumer","large").control}px; employee body ${sizesFor(d,"employee","standard").base}px, control ${sizesFor(d,"employee","standard").control}px.
CURRENT CHECK RESULTS:
${cs}
The person is looking at the "${S.sec}" section, with the ${bn(S.ui.brand)} brand selected.`;
}
const RULES=`You are the design guide inside a brand console. The people using it are a brand marketing team, not engineers. Most of the end customers are over 65, so readability and accessibility matter a lot (WCAG AA is required: 4.5:1 for text, 3:1 for outlines; aim for 7:1 for body text and links).
You can suggest changes to the draft. Nothing is applied until the person accepts it.
Allowed change paths and values:
- brands.<brand id>.<primary|secondary|accent>: "#RRGGBB"
- brands.<id>.onPrimary: "auto" | "white" | "dark"
- brands.<id>.pairs.<light|dark>.<link|body|tag|tagBg|soft|softBg>: "#RRGGBB" hand-picked word or background colors. Only suggest pairs that reach at least 4.5 to 1, and prefer 7 to 1.
- brands.<id>.wordGoal: "rule" (4.5 to 1) | "best" (7 to 1, darker links, help text, tag and error words; brand colors stay the same)
- brands.<id>.bg.<light|dark>.<page|card>: "#RRGGBB" page and window backgrounds. Use colors from the brand's color set or their shades. In dark mode, prefer deep shades of the brand's main and second colors, not black.
- brands.<id>.look.<light|dark>.kind: "solid" | "gradient" (a picture can only be added by the person). .to: "#RRGGBB" the gradient's end color, from the brand's color set. .angle: "down"|"diag"|"side"|"glow". .veil: 0.5-0.97, how strong the page-color layer over a picture is. .glass: 0.6-1, how solid windows and cards are (1 is solid). .blur: 0|4|8|16 px blur behind see-through windows.
- gray: "warm" | "neutral" | "cool" | "brand" (the gray used for borders, help text, and quiet backgrounds; "brand" tints it with each brand's main color)
- system.<danger|success|warning>: "#RRGGBB"
- type.headingStyle: "normal" | "italic" (only for heading fonts that have an italic)
- type.heading, type.body, type.ui (labels, navigation, and buttons): one of ${Object.keys(FONTS).map(f=>`"${f}" (${FONTS[f].role==="best"?"easiest to read":FONTS[f].role==="heading"?"large headings only":FONTS[f].role==="label"?"labels and numbers only":"good for reading"}, ${FONTS[f].cat}${FONTS[f].licensed?", needs a license":""})`).join(", ")}. For body text, strongly prefer fonts marked easiest to read.
- type.scale: 1.2 | 1.25 | 1.333 ; type.headingWeight: 600|700|800 ; type.lineHeight: 1.4|1.5|1.6
- shape.radius: 0-20 ; shape.shadow: "none"|"soft"|"strong"
${REG_ORDER.filter(id=>(REG[id].slots||[]).some(sl=>sl.opts)).map(id=>`- comp.${id} (${REG[id].name}): ${REG[id].slots.filter(sl=>sl.opts).map(sl=>`${sl.k} = ${sl.opts.map(([v])=>JSON.stringify(v)).join("|")}`).join(" ; ")}`).join("\n")}
- brands.<id>.ai.color: ${AI_SOURCES.map(([v,l])=>`"${v}" (${l.toLowerCase()})`).join(" | ")}. The AI color is made from this brand color. brands.<id>.ai.picture: ${AI_PICTURES.map(([v])=>`"${v}"`).join(" | ")}.
Never propose approved words, like the AI label, limits notice, emergency reply, or handoff words, or the assistant's name. People type and review those themselves. If asked, say where to change them.
Spacing and size numbers belong to the admin team. If asked about them, explain and suggest the person ask the admin team; do not propose a change.
When you suggest a color, make sure white or dark text on it will pass 4.5:1. If the brand has an official color set, choose colors from that set and respect its order of importance. Otherwise keep the brand's hue family.
Write "reply" at a fifth-grade reading level: short, full sentences, plain words, no jargon, no lists, no markdown. Two to four sentences.
Reply with only JSON: {"reply": string, "changes": [{"path": string, "value": string|number, "why": string}]}. "changes" may be empty. At most 4 changes. Each "why" is one short plain sentence.`;

function canned(text){
  const t=text.toLowerCase(), d=S.draft;
  if(/fix every|fix all|every problem|all the problems/.test(t)){
    const ch=[];checks().filter(x=>x.level==="block"&&x.fix).forEach(x=>fixChanges(d,x.fix).forEach(c=>{if(!ch.some(y=>y.path===c.path))ch.push(c);}));
    return ch.length?{reply:`I found ${ch.length} thing${ch.length>1?"s":""} I can fix. Each fix keeps your color family and only makes it a little deeper. Look them over before you add them.`,changes:ch}:{reply:"Every check already passes. There is nothing to fix right now.",changes:[]};}
  if(/safe for words|safe for text|which accent/.test(t)){const b=S.ui.brand,pal=d.brands[b].palette;
    if(!pal) return {reply:`${bn(b)} does not have a full color set yet. Its main color is ${d.brands[b].primary}.`,changes:[]};
    const ok=pal.groups.flatMap(g=>g.colors).filter(c=>contrast(c.hex,"#FFFFFF")>=4.5).map(c=>c.name);
    return {reply:`In the ${bn(b)} set, these colors are dark enough for words on white: ${ok.join(", ")}. The lighter colors are fine for shapes, lines, and backgrounds, but not for words.`,changes:[]};}
  if(/main color|too light|white button|white text|white words|fix the buttons/.test(t)){
    const b=S.ui.brand, P=d.brands[b].primary, c=colorsFor(d,b), r=contrast(c.onP,P);
    if(r>=4.5&&c.onP!=="#FFFFFF"&&/white/.test(t)){const sc=scaleOf(P),k=[600,700,800,900].find(k=>contrast("#FFFFFF",sc[k])>=4.5);
      if(k) return {reply:`White words on ${P} reach only ${fmt(contrast("#FFFFFF",P))} to 1, so your buttons use dark words now. If you want white words, shade ${k} of your green is dark enough. It reaches ${fmt(contrast("#FFFFFF",sc[k]))} to 1. Buttons would look the same in light and dark mode.`,changes:[{path:`brands.${b}.primary`,value:sc[k],why:`Shade ${k} of your green. White words on it are easy to read.`},{path:`brands.${b}.onPrimary`,value:"white",why:"White words on the main color."}]};}
    if(r>=4.5) return {reply:`The ${bn(b)} buttons pass right now. The words on them reach ${fmt(r)} to 1.`,changes:[]};
    return {reply:`White words on ${P} reach only ${fmt(contrast("#FFFFFF",P))} to 1. The rule is 4.5 to 1. The best fix keeps your color and puts dark words on it.`,changes:[{path:`brands.${b}.onPrimary`,value:"dark",why:"Your color stays the same. Dark words on it are easy to read."}]};}
  if(/sixty|65|older|big enough|font for older|read/.test(t)){
    const ch=[];if(d.type.body!=="Atkinson Hyperlegible") ch.push({path:"type.body",value:"Atkinson Hyperlegible",why:"Letters that look alike, like I and l, are easy to tell apart."});
    if(d.type.lineHeight<1.6) ch.push({path:"type.lineHeight",value:1.6,why:"More space between lines helps people keep their place."});
    return {reply:`Your consumer text is already ${sizesFor(d,"consumer","large").base} pixels in Large, which is good for older readers. I would make two small changes to make reading even easier.`,changes:ch};}
  if(/capital|caps|upper/.test(t)) return {reply:"I would not use all capital letters. They are harder to read, because every word becomes the same box shape. A bold weight makes buttons stand out without that problem.",changes:d.comp.button.weight<700?[{path:"comp.button.weight",value:700,why:"Bold words stand out and stay easy to read."}]:[]};
  if(/friendl|softer|corner/.test(t)) return {reply:"Rounder corners feel softer and friendlier. I would raise the corner size a little. It will change buttons, fields, and cards together, so they still match.",changes:[{path:"shape.radius",value:Math.min(20,d.shape.radius+4),why:"A bit rounder everywhere, so everything still matches."}]};
  if(/faint|line|border/.test(t)) return d.comp.field.border==="border.strong"?{reply:`The lines around fields reach ${fmt(contrast(NEUTRAL[500],"#FFFFFF"))} to 1. The rule is 3 to 1, so people can see them. The lighter gray would fail, so I would keep this one.`,changes:[]}:{reply:"The light gray line is too faint. People may not see where to type.",changes:[{path:"comp.field.border",value:"border.strong",why:"The strong gray line is easy to see."}]};
  if(/dropdown|same as/.test(t)) return {reply:"The dropdown should match the text field, so a form looks like one piece. I would give it the same corners.",changes:d.comp.select.radius!==d.comp.field.radius?[{path:"comp.select.radius",value:d.comp.field.radius,why:"Matches the text field corners."}]:[]};
  if(/flat|stand out/.test(t)) return {reply:"A stronger shadow lifts the cards off the page. Keep the thin line too, because some people cannot see soft shadows well.",changes:[{path:"comp.card.shadow",value:"strong",why:"Cards lift off the page a little more."}]};
  if(/dark layer|lighter|overlay/.test(t)) return {reply:"A lighter layer still shows that the page is paused. I would not go lighter than this, or people may try to click behind the pop-up.",changes:d.comp.dialog.overlay>40?[{path:"comp.dialog.overlay",value:40,why:"Lighter, but the page behind still looks paused."}]:[]};
  if(/employee|rows|more on/.test(t)) return {reply:"Employee screen sizes are set by your admin team, so I cannot change them here. I can tell you that the text is already 14 pixels, which is the smallest size we allow. Fitting more rows would mean tighter row spacing, which your admin team can decide.",changes:[]};
  if(/warm/.test(t)){const b=S.ui.brand,P=d.brands[b].primary;let nv=shift(P,-0.03,-14);if(contrast(INK,nv)<4.5)nv=darkenTo(nv,"#FFFFFF",4.6);
    return {reply:`I moved the ${bn(b)} main color a little toward yellow. That makes it feel warmer and sunnier. It still reads as your color.`,changes:[{path:`brands.${b}.primary`,value:nv,why:"A warmer color that still passes with white words."}]};}
  if(/why.*white|white.*problem/.test(t)) return {reply:`Light colors make white words hard to see. White words need a color that is dark enough behind them. The rule is 4.5 to 1. The ${bn(S.ui.brand)} main color is ${d.brands[S.ui.brand].primary}, and white words on it reach ${fmt(contrast("#FFFFFF",d.brands[S.ui.brand].primary))} to 1. Many of your customers have weaker eyesight, so this matters even more.`,changes:[]};
  return {reply:"I can help with colors, fonts, corners, shadows, and how each component looks. Tell me what you want to change, and I will suggest something that passes every check.",changes:[]};
}
let askCtl=null;
async function ask(text,voice){
  text=text.trim(); if(!text||S.thinking) return;
  addMsg({who:"me",x:text,voice}); S.draftText="";
  const m={who:"g",thinking:true};addMsg(m);S.thinking=m;render();scrollChat();
  let res=null;
  if(!S.ai.server&&S.ai.sample){
    askCtl=new AbortController();
    const hist=S.msgs.filter(x=>!x.thinking&&x!==m&&x.x).slice(-8).map(x=>({role:x.who==="me"?"user":"assistant",content:x.x}));hist.pop();
    try{const out=await S.ai.sample.json(mergeTurns([{role:"user",content:RULES+"\n\n"+summaryForModel()},...hist,{role:"user",content:summaryForModel()+"\n\nThe person says: "+text}]),{signal:askCtl.signal,cache:false});
      if(out&&typeof out.reply==="string"){res={reply:out.reply,changes:cleanChanges(out.changes)};S.ai.live=true;}}
    catch(e){if(e&&e.code==="cancelled"){m.thinking=false;m.x="I stopped. Ask me again when you are ready.";S.thinking=null;render();return;}
      if(e&&["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(e.code))S.ai.sample=null;}
  }
  if(S.ai.server){
    askCtl=new AbortController();
    const hist=S.msgs.filter(x=>!x.thinking&&x!==m&&x.x).slice(-8).map(x=>({role:x.who==="me"?"user":"assistant",content:x.x}));
    hist.pop();
    const turns=mergeTurns([{role:"user",content:RULES+"\n\n"+summaryForModel()},...hist,{role:"user",content:summaryForModel()+"\n\nThe person says: "+text}]);
    try{const r=await api("POST","/api/ask",{turns},askCtl.signal);const out=parseLoose(r.text);
      if(out&&typeof out.reply==="string"){res={reply:out.reply,changes:cleanChanges(out.changes)};S.ai.live=true;}
      else res={reply:r.text.slice(0,900),changes:[]};}
    catch(e){if(e.name==="AbortError"){m.thinking=false;m.x="I stopped. Ask me again when you are ready.";S.thinking=null;render();return;}
      m.err=e.message;}
  }
  S.ai.tried=true;
  if(!res){await new Promise(r=>setTimeout(r,500));res=canned(text);if(m.err) res.reply="I could not reach Claude just now, so here is a sample answer. "+res.reply;}
  m.thinking=false;m.x=res.reply;if(res.changes.length) m.prop=addProp(res.changes);
  S.thinking=null;render();scrollChat();
}
function scrollChat(){const l=document.getElementById("alist");if(l)l.scrollTop=l.scrollHeight;}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function voiceStart(){
  if(S.voice) return;
  if(SR){
    const rec=new SR();rec.lang="en-US";rec.interimResults=true;rec.continuous=true;
    S.voice={text:"",rec,real:true};
    rec.onresult=e=>{let t="";for(const r of e.results) t+=r[0].transcript;if(S.voice){S.voice.text=t;const el=document.getElementById("vtx");if(el)el.textContent=t;}};
    rec.onerror=ev=>{if(!S.voice)return;S.voice=null;toast(ev.error==="not-allowed"?"The browser blocked the microphone. Allow it next to the address bar, or type instead.":"The microphone stopped. You can type instead.");render();};
    rec.onend=()=>{if(S.voice&&S.voice.real) voiceStop();};
    try{rec.start();}catch(e){}
    render();return;
  }
  const full=VOICE[S.sec]||VOICE._;
  S.voice={text:"",words:full.split(" "),i:0};
  S.voice.timer=setInterval(()=>{const v=S.voice;if(!v)return;if(v.i<v.words.length){v.text+=(v.i?" ":"")+v.words[v.i++];const el=document.getElementById("vtx");if(el)el.textContent=v.text;}else voiceStop();},120);
  render();
}
function voiceStop(){const v=S.voice;if(!v)return;S.voice=null;
  if(v.real){try{v.rec.stop();}catch(e){}S.draftText=(v.text||"").trim();} else {clearInterval(v.timer);S.draftText=v.words.join(" ");}
  S.lastVoice=S.draftText;S.focusAsk=true;render();}

/* =====================================================================
   RENDER
   ===================================================================== */
function brandBar(){
  return `<div class="brandbar" role="group" aria-label="Brand you are editing"><span class="bbl">Brand you are editing</span><div class="bbseg">${brands().map(b=>{const on=b.id===S.ui.brand;return `<button type="button" class="${on?"on":""}" data-seg="ui.brand" data-v="${b.id}" aria-pressed="${on}"><i style="background:${S.draft.brands[b.id].primary}"></i>${esc(b.name)}</button>`;}).join("")}</div></div>`;
}
/* The offline prototype says that its changes stay in the page. Online, the top bar shows who is signed in instead. */
function proto(){
  if(S.previewOf&&!S.offline) return `<div class="proto"><b>Preview</b><span>This is a preview of a change to the console (${esc(S.previewOf)}). Its edits and its Figma connection are separate from the real console, and it cannot make proposals.</span></div>`;
  return S.offline?`<div class="proto"><b>Prototype</b><span>Changes stay in this page until you reload.</span></div>`:"";
}
function section(){
  switch(S.sec){
    case "brands":return secBrands();case "color":return secColor();case "type":return secType();case "space":return secSpace();case "shape":return secShape();case "icons":return secIcons();
    case "library":return secLibrary();
    case "checks":return secChecks();case "proposal":return secProposal();case "history":return secHistory();case "export":return secExport();case "figma":return secFigma();}
  if(REG[S.sec]) return secComp(S.sec);
  S.sec="color";return secColor();
}
/* Fonts load from Google Fonts only when they are needed, one family at a time. */
const LOADED_FONTS=new Set();
function loadFonts(names){hostedFontCss();names.forEach(n=>{if(!FONTS[n])return;const key=FONTS[n].standIn||n;if(LOADED_FONTS.has(key))return;LOADED_FONTS.add(key);const l=document.createElement("link");l.rel="stylesheet";l.href=fontHref([n]);document.head.appendChild(l);});}
function render(){
  if(!Object.hasOwn(S.draft.brands,S.ui.brand)) S.ui.brand=brands()[0].id;
  loadFonts([S.draft.type.heading,S.draft.type.body,uiFont(S.draft),uiFont(S.published),S.published.type.heading,S.published.type.body,...(S.beforeLast?[S.beforeLast.type.heading,S.beforeLast.type.body]:[]),pvState().type.heading,pvState().type.body,...(S.sec==="type"?Object.keys(FONTS):[])]);
  const ae=document.activeElement, fid=ae&&ae.id, sel=ae&&("selectionStart" in ae)?[ae.selectionStart,ae.selectionEnd]:null;
  const sc=document.getElementById("scroller"), st=sc?sc.scrollTop:0, pb=document.getElementById("pvbody"), pst=pb?pb.scrollTop:0;
  const inner=section();
  document.getElementById("app").innerHTML=proto()+topbar()+`<div class="shell">${nav()}<main class="main"><div class="scroll" id="scroller">${brandBar()}${inner.startsWith("<div class=\"split\"")?`<div class="page">${inner}</div>`:inner}</div></main>${asst()}</div>`;
  const sc2=document.getElementById("scroller"); if(sc2) sc2.scrollTop=st;
  const pb2=document.getElementById("pvbody"); if(pb2) pb2.scrollTop=pst;
  if(S.focusAsk){S.focusAsk=false;const i=document.getElementById("askin");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}}
  else if(fid){const el=document.getElementById(fid);if(el){el.focus({preventScroll:true});if(sel&&el.setSelectionRange){try{el.setSelectionRange(sel[0],sel[1]);}catch(e){}}}}
  scheduleSave();saveNote();liveHere();
}
/* light update while dragging a color or slider: preview + derived bits only */
let rafP=null;
function renderLive(){cancelAnimationFrame(rafP);rafP=requestAnimationFrame(()=>{
  const col=document.getElementById("pvcol");if(col){const pst=document.getElementById("pvbody").scrollTop;const kind=REG[S.sec]?S.sec:"screen";const t=document.createElement("div");t.innerHTML=preview(kind);col.replaceWith(t.firstElementChild);document.getElementById("pvbody").scrollTop=pst;if(S.lastReach)showReach(S.lastReach);}
  scheduleSave();
});}

/* =====================================================================
   CANVAS: click to edit, reach, before and after
   ===================================================================== */
const PICK=[[".pv-idcard","member-card"],[".pv-errsum","error-summary"],[".pv-cal","date-picker"],[".pv-di","date-input"],[".pv-bgroup","button-group"],[".pv-slot,.pv-day","appointment-slots"],[".pv-range","lab-result"],[".pv-split","cost-estimate"],[".pv-terms","consent"],
  [".pv-tile,.pv-rd","radio"],[".pv-cb","checkbox"],[".pv-sw","switch"],[".pv-chip","filter-chips"],[".pv-ibtn","icon-button"],[".pv-btn","button"],[".pv-action,.lnk,.pv-term","link"],[".pv-badge","badge"],[".pv-av","avatar"],
  [".pv-menu","select"],[".pv-in","field"],[".pv-alert","alert"],[".pv-banner","banner"],[".pv-toast","toast"],[".pv-prog","progress"],[".pv-spin","spinner"],[".pv-sk","skeleton"],[".pv-empty","empty-state"],
  [".pv-acc","accordion"],[".pv-sl","summary-list"],[".pv-inset,.pv-warncall","callout"],[".pv-tabs","tabs"],[".pv-pag","pagination"],[".pv-steps","stepper"],[".pv-skip","skip-link"],[".pv-hdr,.pv-bar","header"],[".pv-ftr","footer"],
  [".pv-snav","side-nav"],[".pv-table","data-table"],[".pv-list","list"],[".pv-drawer","drawer"],[".pv-dialog","dialog"],[".pv-drop,.pv-file","file-upload"],[".pv-bubble","tooltip"],[".pv-icons","icon"],[".pv-hr,.pv-hrl","divider"],
  [".pv-gridd","grid"],[".pv-demo","stack"],[".pv-cont","container"],["svg[role=img]","chart"],[".pv-card","card"]];
const PICK_SEL=PICK.map(p=>p[0]).join(",");
function pickAt(el){
  while(el&&!el.classList?.contains("pvbody")){if(el.matches&&el.matches(PICK_SEL)){for(const [sel,id] of PICK){if(el.matches(sel)&&REG[id]) return {el,id};}}el=el.parentElement;}
  return null;
}
function placeBox(box,el,label){const pb=document.getElementById("pvbody");if(!pb)return;const a=pb.getBoundingClientRect(),r=el.getBoundingClientRect();
  box.style.left=(r.left-a.left+pb.scrollLeft-3)+"px";box.style.top=(r.top-a.top+pb.scrollTop-3)+"px";box.style.width=(r.width+6)+"px";box.style.height=(r.height+6)+"px";box.firstElementChild.textContent=label;box.hidden=false;}
/* token -> components map, built once from the registry */
let TOKMAP=null;
function tokMap(){if(TOKMAP) return TOKMAP;TOKMAP={};const st=S.draft;
  REG_ORDER.forEach(id=>{let toks=[];const R2=REG[id];
    if(R2.legacy){const h=compTokens(id);toks=[...h.matchAll(/<span class="tok">([^<]*)<\/span>/g)].map(m=>m[1]);}
    else if(R2.tokens){try{toks=R2.tokens({st,c:colorsFor(st,brandList(st)[0].id),z:sizesFor(st,"consumer","large"),cfg:st.comp[id]||{}}).map(r=>r[1]);}catch(e){}}
    (R2.slots||[]).forEach(sl=>{if(sl.type==="radius")toks.push("{radius.slot}");if(sl.type==="shadow")toks.push("{shadow.slot}");});
    TOKMAP[id]=toks.join(" ");});return TOKMAP;}
function usersOf(needles){const m=tokMap();return REG_ORDER.filter(id=>needles.some(n=>m[id].includes(n)));}
function closure(ids){const out=new Set(ids);let grew=true;while(grew){grew=false;REG_ORDER.forEach(id=>{if(!out.has(id)&&(REG[id].from||[]).some(f=>out.has(f))){out.add(id);grew=true;}});}return [...out];}
function reachOf(path){
  const k=path.split(".");let ids=[],what=labelFor(path)||path,note="";
  if(k[0]==="comp") ids=[k[1]];
  else if(k[0]==="guidance"){ids=[k[1]];note="This only changes what AI tools read.";}
  else if(k[0]==="brands"){const sl=k[2];
    if(sl==="primary") ids=usersOf(["action.primary","on-action","link","focus-ring","action.soft","component.button","button.background"]);
    else if(sl==="onPrimary") ids=usersOf(["on-action"]);
    else if(sl==="secondary") ids=usersOf(["highlight"]);
    else if(sl==="bg"){ids=[...REG_ORDER];}
    else if(sl==="accent"){ids=[];note="No component uses the accent color yet. It is kept for logos, charts, and pictures.";}
    else if(sl==="palette"){ids=[];note="The color set is the source list. Components use the colors you pick from it.";}
  }
  else if(k[0]==="system") ids=usersOf(["status."+k[1],"destructive","danger"].slice(0,k[1]==="danger"?3:1));
  else if(k[0]==="type"||k[0]==="density") ids=[...REG_ORDER];
  else if(k[0]==="shape") ids=k[1]==="radius"?usersOf(["radius.","{radius","corner"]):usersOf(["shadow","menu-shadow"]);
  else if(k[0]==="tok"){const t=k.slice(1).join(".");ids=usersOf([t]);what=t;}
  ids=k[0]==="type"||k[0]==="density"?ids:closure(ids);
  return {ids,what,note};
}
let reachT=null;
function showReach(path,flash){
  const box=document.getElementById("reach"),pb=document.getElementById("pvbody");if(!box||!pb)return;
  pb.querySelectorAll(".is-reach").forEach(e=>e.classList.remove("is-reach"));
  if(!path){box.classList.remove("on");return;}
  const r=reachOf(path),set=new Set(r.ids);
  pb.querySelectorAll(PICK_SEL).forEach(el=>{const h=pickAt(el);if(h&&h.el===el&&set.has(h.id))el.classList.add("is-reach");});
  box.classList.add("on");
  box.innerHTML=r.ids.length?`<b>${esc(r.what)}</b> reaches <b>${r.ids.length}</b> of ${REG_ORDER.length} components.${r.ids.length<=6?" "+r.ids.map(id=>esc(REG[id].name)).join(", ")+".":""} <span class="under">They glow in the preview when they are on screen.</span>`:`<b>${esc(r.what)}</b>. ${esc(r.note||"This does not change any component on its own.")}`;
  clearTimeout(reachT);if(flash) reachT=setTimeout(()=>showReach(null),2600);
}
function pathOfEditor(el){const f=el.closest(".field,.crow,tr[data-tok],.pgrp .crow");if(!f)return null;
  if(f.dataset.tok) return "tok."+f.dataset.tok.replace(/[{}]/g,"");
  const c=f.querySelector("[data-path],[data-hex],[data-num],[data-seg],[data-text]");if(!c)return null;
  const p=c.dataset.path||c.dataset.hex||c.dataset.num||c.dataset.seg||c.dataset.text;return p&&!p.startsWith("ui.")?p.replace(/\.hex$/,"").replace(/\.groups\..*$/,""):null;}
function applyChrome(){}
function chromeIsDark(){return false;}

/* =====================================================================
   EVENTS
   ===================================================================== */
const EDIT_WORDS={brands:"the brand change",guide:"the guide's change",fix:"the fix",undo:"the undo",figma:"the Figma sync",fontLib:"the font library"};
function markBefore(path){const now=Date.now();if(now-(S.lastEditAt||0)>1500||S.lastEditPath!==path){S.beforeLast=clone(S.draft);S.lastEditLabel=EDIT_WORDS[path]||(path?labelFor(path):"");}S.lastEditAt=now;S.lastEditPath=path;}
function setDraft(path,val,live,opts={}){
  if(!canEdit())return;
  markBefore(path);
  const m=path.match(/^brands\.([^.]+)\.(primary|secondary)$/);
  if(m&&!opts.keepSeed){const br=S.draft.brands[m[1]];br.seeds={...(br.seeds||{}),[m[2]]:normHex(val)};}
  const m2=path.match(/^brands\.([^.]+)\.bg\.(light|dark)\.(page|card)$/);
  if(m2&&!opts.keepSeed){const br=S.draft.brands[m2[1]];br.seeds={...(br.seeds||{}),[BG_KEYS[m2[2]][m2[3]]]:normHex(val)};}
  setP(S.draft,path,val);
  /* The main color changed: keep the words on it readable, and say so. */
  if(m&&m[2]==="primary"){const br=S.draft.brands[m[1]],w=wordsForNewMain(br);
    if(w&&br.onPrimary!=="auto"){br.onPrimary=w;clearTimeout(S.wordT);S.wordT=setTimeout(()=>toast(`I changed the words on the ${bn(m[1])} main color to ${w==="white"?"white":"dark"}, so they stay easy to read.`),live?400:0);}}
  if(path==="comp.button.bg"&&val==="action.primary"){const done=[];
    for(const id of Object.keys(S.draft.brands)){const br=S.draft.brands[id],w=wordsForNewMain(br);if(w&&br.onPrimary!=="auto"){br.onPrimary=w;done.push(`${bn(id)} to ${w==="white"?"white":"dark"}`);}}
    if(done.length){clearTimeout(S.wordT);S.wordT=setTimeout(()=>toast(`I changed the words on the main button for ${done.join(" and ")}, so they stay easy to read.`),live?400:0);}}
  if(S.preview) S.preview=null;
  S.lastReach=path;
  if(live) renderLive(); else {render();showReach(path,true);}
}
function palNameFree(g,name,skip){let n=String(name||"").trim().slice(0,40)||"New color",k=2;const base=n;while(g.colors.some((c,i)=>i!==skip&&slug(c.name)===slug(n))){n=`${base} ${k++}`;}return n;}
function brandErr(e){toast(e&&e.message?e.message:"That did not work.");render();}
const A={
  reloadPage(){location.reload();},
  brandAddOpen(){S.ui.brandAdd={name:"",division:"",primary:"",secondary:"",accent:""};render();const i=document.getElementById("badd-name");if(i)i.focus();},
  brandAddClose(){S.ui.brandAdd=null;render();},
  brandAdd(){if(!canEdit())return;const A0=S.ui.brandAdd||{};let r;
    try{r=addBrand(S.draft,{name:A0.name,division:A0.division,primary:A0.primary,secondary:A0.secondary,accent:A0.accent});}
    catch(e){S.ui.brandAdd={...A0,err:e.message};render();return;}
    markBefore("brands");S.draft=r.state;S.ui.brand=r.id;S.ui.brandAdd=null;render();scheduleSave();
    toast(`I added ${bn(r.id)}. Its colors are on the Color page, where you can add its color set.`);},
  brandMove(e){if(!canEdit())return;try{const st=moveBrand(S.draft,e.dataset.b,+e.dataset.to);markBefore("brands");S.draft=st;render();scheduleSave();}catch(err){brandErr(err);}},
  brandDelAsk(e){S.ui.brandDel=e.dataset.b;render();},
  brandDelCancel(){S.ui.brandDel=null;render();},
  brandDel(e){if(!canEdit())return;const id=e.dataset.b,name=bn(id);
    try{const st=removeBrand(S.draft,id);markBefore("brands");S.draft=st;S.ui.brandDel=null;render();scheduleSave();toast(`I removed ${name}. Undo it on the Proposal page if you need it back.`);}catch(err){brandErr(err);}},
  palStart(e){if(!canEdit())return;const b=e.dataset.b,br=S.draft.brands[b];markBefore(`brands.${b}.palette`);
    br.palette={groups:[{id:"signature",name:"Signature colors",note:"These colors are what people should know as "+bn(b)+".",colors:[{name:"Main color",hex:br.primary,share:20},{name:"Second color",hex:br.secondary,share:12}]},
      {id:"base",name:"Base",note:"The main background. It gives the other colors room to stand out.",colors:[{name:"White",hex:"#FFFFFF",share:20}]},
      {id:"accent",name:"Accent colors",note:"Use these in small amounts, like in charts, icons, and highlights.",colors:[{name:"Accent color",hex:br.accent,share:6}]}]};
    S.ui.palAdd={b};render();scheduleSave();toast(`I started a color set for ${bn(b)}. Rename the colors and add more.`);},
  palOpen(e){S.ui.palAdd={b:e.dataset.b};render();},
  async figConnect(){const link=(document.getElementById("fig-link")||{}).value||"",token=(document.getElementById("fig-token")||{}).value||"";
    figSet({busy:"connect",error:null});
    try{S.figma=await api("POST","/api/figma/connect",{fileUrl:link,token});figSet({busy:null,rows:null,token:"",link:undefined,done:"Connected. Pick Check for changes to compare your draft with Figma."});}
    catch(e){figSet({busy:null,error:e.message});}},
  async figLink(){const link=((document.getElementById("fig-link")||{}).value||"").trim();
    if(!/figma\.com\/(design|file|board|proto|slides)\/[A-Za-z0-9]{10,}/.test(link)){figSet({error:"That does not look like a Figma file link. In Figma, pick Share, then Copy link."});return;}
    if(S.offline){S.figma={...(S.figma||{}),fileUrl:link};figSet({error:null});toast("I saved the link. Open in Figma is at the top of the left column.");return;}
    try{S.figma=await api("POST","/api/figma/link",{fileUrl:link});figSet({error:null});toast("I saved the link. Open in Figma is at the top of the left column.");}catch(e){figSet({error:e.message});}},
  figEdit(){S.figma={...(S.figma||{}),connected:false};figSet({rows:null,error:null,done:null});},
  async figDisconnect(){try{S.figma=await api("POST","/api/figma/disconnect",{forgetToken:true});figSet({rows:null,error:null,done:null});toast(`I disconnected Figma and removed the token from the team's server.`);}catch(e){figSet({error:e.message});}},
  async figCompare(){figSet({busy:"compare",error:null,done:null,rows:null});
    try{const r=await api("POST","/api/figma/compare",{role:S.role});S.figma=r.status||S.figma;figSet({busy:null,rows:r.rows,extras:r.extras,picks:{},add:{},source:"api",other:r.otherVariables});}
    catch(e){if(/Enterprise/.test(e.message))S.figma={...(S.figma||{}),varsBlocked:true};figSet({busy:null,error:e.message});}},
  figPick(e){S.fig.picks={...(S.fig.picks||{}),[e.dataset.rk]:e.dataset.v};render();},
  figAll(e){const v=e.dataset.v,p={...(S.fig.picks||{})};(S.fig.rows||[]).forEach(r=>{if(r.status!=="same"&&figOptions(r).some(o=>o[0]===v))p[r.rk]=v;});S.fig.picks=p;render();},
  figShow(e){S.fig.show={...(S.fig.show||{}),[e.dataset.c]:!(S.fig.show||{})[e.dataset.c]};render();},
  figCancel(){figSet({rows:null,picks:{},extras:null,done:null});},
  figFont(e){S.sec="type";S.ui.fontAdd={name:e.dataset.f};S.ui.fontAddMode="google";render();const sc=document.getElementById("scroller");if(sc)sc.scrollTop=sc.scrollHeight;},
  async figApply(){const F=S.fig;if(!canEdit())return;
    if(F.source==="files"){figSet({busy:"apply",error:null});
      try{const files=(F.files||[]).filter(x=>x.coll&&x.mode);let out;
        if(S.offline){const vars=figFromFiles(files),seen=new Set(files.map(x=>x.coll));const rows=figCompare(S.draft,vars,S.figBase||null,{role:S.role}).filter(x=>seen.has(x.coll)&&(x.f!==undefined||x.status==="deleted"));
          const picks=figCleanPicks(rows,F.picks);const open=rows.filter(x=>x.status!=="same"&&(picks[x.rk]===undefined?x.pick:picks[x.rk])===null);if(open.length)throw new Error(`Pick which one to keep for ${open.length} more thing${open.length>1?"s":""} first.`);
          const r=figApply(S.draft,rows,picks);markBefore("figma");S.draft=r.state;S.figBase=figBaseAfterFiles(S.figBase,S.draft,rows,picks);out={errors:r.errors,files:figFiles(S.draft)};}
        else{out=await api("POST","/api/figma/files/apply",{files:files.map(x=>({name:x.name,json:x.json,coll:x.coll,mode:x.mode})),picks:F.picks,role:S.role});markBefore("figma");loadState(out);S.figma=out.status||S.figma;}
        figSet({busy:null,rows:null,outFiles:out.files,done:null,error:(out.errors||[]).length?`Some values did not fit: ${out.errors.join(" ")}`:null});toast("Your edits have Figma's changes. Download the updated files for Figma next.");}
      catch(e){figSet({busy:null,error:e.message});}return;}
    const add=Object.entries(F.add||{}).filter(([,on])=>on).map(([i])=>({...F.extras.colors[+i],brand:F.addTo||S.ui.brand}));
    figSet({busy:"apply",error:null});
    const seen=Object.fromEntries((F.rows||[]).filter(r=>r.status!=="same").map(r=>[r.rk,[r.c??null,r.f??null]]));
    try{const r=await api("POST","/api/figma/apply",{picks:F.picks||{},role:S.role,addColors:add,seen});markBefore("figma");loadState(r);S.figma=r.status||S.figma;
      const sent=r.sentToFigma||{};const msg=`Synced. Figma got ${sent.values||0} value${sent.values===1?"":"s"}${sent.created?`, including ${sent.created} new variable${sent.created>1?"s":""}`:""}. ${r.changedHere?`${r.changedHere} thing${r.changedHere>1?"s":""} changed in your draft. The checks ran again.`:"Your draft did not change."}`;
      figSet({busy:null,rows:null,extras:null,picks:{},done:msg,error:(r.errors||[]).length?`Some values did not fit, so the console kept its own: ${r.errors.join(" ")}`:null});}
    catch(e){figSet({busy:null,error:e.message});}},
  figDownload(){figDownloadFiles(figFiles(S.draft));},
  figDownloadOut(){if(S.fig.outFiles)figDownloadFiles(S.fig.outFiles);},
  figFilesCompare(){figCompareFiles();},
  fontOpen(){S.ui.fontAdd={};render();},
  fontClose(){S.ui.fontAdd=null;render();},
  fontFilesFor(e){S.ui.fontAdd={name:e.dataset.f};S.ui.fontAddMode="upload";render();const f=document.getElementById("fadd-files");if(f)f.focus();},
  fontHide(e){if(!canEdit())return;markBefore("fontLib");fontToLib(e.dataset.f,L=>({removed:[...L.removed,e.dataset.f]}));render();scheduleSave();toast(`I hid ${e.dataset.f}. It no longer shows in the font list.`);},
  fontShow(e){if(!canEdit())return;markBefore("fontLib");fontToLib(e.dataset.f,L=>({removed:L.removed.filter(n=>n!==e.dataset.f)}));render();scheduleSave();},
  fontRemove(e){if(!canEdit())return;const n=e.dataset.f;markBefore("fontLib");fontToLib(n,L=>{const files={...L.files};delete files[n];return {added:L.added.filter(f=>f.name!==n),files};});render();scheduleSave();toast(`I removed ${n} from the font library.`);},
  async fontAddGoogle(){if(!canEdit())return;const A=S.ui.fontAdd||{};let name=String(A.name||"").trim().replace(/\s+/g," ");
    if(!name){setFontNote("Type the name of the font first.");return;}
    if(FONTS[name]&&fontsShown(S.draft).includes(name)){setFontNote(`${name} is already in your font library.`);return;}
    if(FONTS[name]){markBefore("fontLib");fontToLib(name,L=>({removed:L.removed.filter(n=>n!==name)}));S.ui.fontAdd=null;render();scheduleSave();toast(`${name} is back in your font list.`);return;}
    A.busy=true;render();setFontNote(`Looking for ${name} on Google Fonts…`);
    let ax=await googleFontAxes(name),found=name;
    if(ax===null){const t=name.replace(/\b\w/g,c=>c.toUpperCase());if(t!==name){ax=await googleFontAxes(t);found=t;}}
    A.busy=false;
    if(ax===undefined){render();setFontNote("I could not reach Google Fonts to check that name. Check your internet connection, then try again.");return;}
    if(ax===null){render();setFontNote(`Google Fonts does not have a font called ${name}. Check the spelling on fonts.google.com, or upload the font files instead.`);return;}
    markBefore("fontLib");fontToLib(found,L=>({added:[...L.added.filter(f=>f.name!==found),{name:found,cat:A.cat||"sans",role:A.role||"body",source:"google",axes:ax||"wght@400"}],removed:L.removed.filter(n=>n!==found)}));
    S.ui.fontAdd=null;loadFonts([found]);render();scheduleSave();toast(`I added ${found}. Pick it above for headings, body text, or labels.`);},
  async fontUpload(){if(!canEdit())return;const A=S.ui.fontAdd||{},name=String(A.name||"").trim().replace(/\s+/g," ");
    if(!name){setFontNote("Type the name of the font first.");return;}
    if(!(A.files||[]).length){setFontNote("Pick at least one font file.");return;}
    A.busy=true;render();setFontNote("Uploading your font files…");
    try{const saved=[];
      for(const x of A.files){const data=await new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]||"");r.onerror=()=>bad(new Error("I could not read "+x.fileName+"."));r.readAsDataURL(x.f);});
        if(S.offline){saved.push({file:"fonts/"+x.fileName.replace(/[^a-z0-9._-]+/gi,"-"),url:URL.createObjectURL(x.f),weight:x.weight,style:x.style});}
        else{const r=await api("POST","/api/fonts",{family:name,weight:x.weight,style:x.style,fileName:x.fileName,data});saved.push({file:r.file,weight:x.weight,style:x.style});}}
      markBefore("fontLib");
      fontToLib(name,L=>{const keep=(L.files[name]||[]).filter(o=>!saved.some(n=>Number(n.weight)===Number(o.weight)&&n.style===o.style));
        const builtIn=FONT_LIST.some(f=>f.name===name);
        return {files:{...L.files,[name]:[...keep,...saved].sort((a,b)=>a.weight-b.weight)},removed:L.removed.filter(n=>n!==name),
          added:builtIn?L.added:[...L.added.filter(f=>f.name!==name),{name,cat:A.cat||"sans",role:A.role||"body",source:"upload"}]};});
      S.ui.fontAdd=null;hostedFontCss();render();scheduleSave();toast(`I added ${saved.length} font file${saved.length>1?"s":""} for ${name}.`);}
    catch(err){A.busy=false;render();setFontNote(err.message||"The upload did not work. Try again.");}},
  palClose(){S.ui.palAdd=null;render();},
  libPick(e){S.ui.palAdd={...(S.ui.palAdd||{}),hex:e.dataset.v,name:e.dataset.n};render();},
  palAdd(e){if(!canEdit())return;const b=e.dataset.b,A0=S.ui.palAdd||{},pal=S.draft.brands[b].palette;if(!pal||!hexOk(A0.hex))return;
    markBefore(`brands.${b}.palette`);let gi=Number(A0.g??pal.groups.length-1);
    if(!(gi>=0&&gi<pal.groups.length)){let id="more",k=2;while(pal.groups.some(g=>g.id===id))id="more-"+k++;pal.groups.push({id,name:"More colors",note:"Colors the brand team added.",colors:[]});gi=pal.groups.length-1;}
    const g=pal.groups[gi],name=palNameFree(g,A0.name||normHex(A0.hex));g.colors.push({name,hex:normHex(A0.hex),share:2});
    S.ui.palAdd={b,g:gi};render();scheduleSave();toast(`I added ${name} to the ${g.name} group.`);},
  palDel(e){if(!canEdit())return;const b=e.dataset.b,br=S.draft.brands[b],g=br.palette.groups[+e.dataset.g],c=g&&g.colors[+e.dataset.c];if(!c)return;
    const role=[["primary","main color"],["secondary","second color"],["accent","accent color"]].find(([k])=>normHex(br[k])===normHex(c.hex));
    if(role){toast(`${c.name} is your ${role[1]}. Pick a different ${role[1]} first, then remove it.`);return;}
    markBefore(`brands.${b}.palette`);g.colors.splice(+e.dataset.c,1);render();scheduleSave();toast(`I removed ${c.name} from the color set. Undo it on the Proposal page if you need it back.`);},
  go(e){S.sec=e.dataset.s;S.preview=null;S.ui.confirmRb=null;render();const sc=document.getElementById("scroller");if(sc)sc.scrollTop=0;if(window.innerWidth<=820)window.scrollTo(0,0);},
  reset(){location.reload();},
  asstOpen(){S.ui.asst=true;render();scrollChat();},
  asstOpenTalk(){S.ui.asst=true;render();voiceStart();},
  asstClose(){S.ui.asst=false;if(S.voice)voiceStop();render();},
  voiceStart(){voiceStart();},
  voiceStop(){voiceStop();},
  ask(){const last=S.msgs.length&&S.msgs[S.msgs.length-1];ask(S.draftText,S.lastVoice===S.draftText);},
  sugg(e){ask(e.dataset.t);},
  stopAsk(){askCtl&&askCtl.abort();},
  applyProp(e){const p=S.props[e.dataset.id];if(!p||!canEdit())return;markBefore("guide");p.changes.forEach(c=>setP(S.draft,c.path,c.value));
    p.changes.forEach(c=>{const m=c.path.match(/^brands\.([^.]+)\.primary$/);if(m&&!p.changes.some(x=>x.path===`brands.${m[1]}.onPrimary`)){const br=S.draft.brands[m[1]],w=wordsForNewMain(br);if(w&&br.onPrimary!=="auto")br.onPrimary=w;}});p.state="applied";S.preview=null;render();toast("Added to your draft.");},
  previewProp(e){S.preview=S.preview===e.dataset.id?null:e.dataset.id;render();},
  dismissProp(e){const p=S.props[e.dataset.id];p.state="dismissed";if(S.preview===p.id)S.preview=null;render();},
  unpreview(){S.preview=null;render();},
  fixPair(e){const ch=buttonFix(S.draft,e.dataset.b,7,e.dataset.w);if(!ch.length||!canEdit())return;markBefore("fix");ch.forEach(c=>setP(S.draft,c.path,c.value));S.preview=null;render();toast("Done. The main button words now reach 7 to 1. Drag the line in the preview to compare.");},
  previewPair(e){const ch=buttonFix(S.draft,e.dataset.b,7,e.dataset.w);if(!ch.length)return;S.preview=addProp(ch);render();},
  pairOpen(e){S.ui.pairOpen=S.ui.pairOpen===e.dataset.r?null:e.dataset.r;render();},
  pairPick(e){if(!canEdit())return;const p=e.dataset.p;let v=e.dataset.v;const b=p.split(".")[1],br=S.draft.brands[b];
    if(p.endsWith(".onPrimary")){v=v==="#FFFFFF"?"white":v===INK?"dark":v;setDraft(p,v);return;}
    if(p.endsWith(".primary")){markBefore(p);br.seeds={...(br.seeds||{}),primary:normHex((br.seeds||{}).primary||br.primary)};setDraft(p,v,false,{keepSeed:true});return;}
    setDraft(p,v);},
  pairAuto(e){if(!canEdit())return;const {r,m,b}=e.dataset,br=S.draft.brands[b];markBefore(`brands.${b}.pairs`);
    if(r==="button"||r==="main"){br.onPrimary="auto";}
    else{const keys=r==="link"?["link"]:r==="body"?["body"]:r==="tag"?["tag","tagBg"]:["soft","softBg"];if(br.pairs&&br.pairs[m]){keys.forEach(k=>delete br.pairs[m][k]);if(!Object.keys(br.pairs[m]).length)delete br.pairs[m];if(!Object.keys(br.pairs).length)delete br.pairs;}}
    render();},
  setGoal(e){setDraft(`brands.${e.dataset.b}.wordGoal`,"best");toast("Links, help text, and tag words now aim for 7 to 1.");},
  fixCheck(e){const x=checks().find(c=>c.id===e.dataset.id);if(!x||!x.fix)return;markBefore("fix");fixChanges(S.draft,x.fix).forEach(c=>setP(S.draft,c.path,c.value));S.preview=null;render();toast("Fixed. The checks ran again.");},
  previewFix(e){const x=checks().find(c=>c.id===e.dataset.id);if(!x||!x.fix)return;const ch=fixChanges(S.draft,x.fix);
    const id=addProp(ch);addMsg({who:"g",x:`Here is my fix for this problem: ${x.title} Look at the preview, then add it if you like it.`,prop:id});S.preview=id;S.ui.asst=true;render();scrollChat();},
  undo(e){markBefore("undo");undoPath(e.dataset.p);render();},
  bgAuto(e){const [,b,,md,w]=e.dataset.p.split(".");const br=S.draft.brands[b];markBefore(e.dataset.p);
    if(br.bg&&br.bg[md]){delete br.bg[md][w];if(!Object.keys(br.bg[md]).length)delete br.bg[md];if(!Object.keys(br.bg).length)delete br.bg;}
    if(br.seeds) delete br.seeds[BG_KEYS[md][w]];render();},
  pickStep(e){const p=e.dataset.p,sk=e.dataset.sk,br=S.draft.brands[p.split(".")[1]];if(!canEdit()||!br)return;
    markBefore(p);br.seeds={...(br.seeds||{}),[sk]:e.dataset.seed};setDraft(p,e.dataset.v,false,{keepSeed:true});},
  pickRole(e){setDraft(e.dataset.p,e.dataset.v);},
  lookKind(e){const f=document.querySelector(`[data-seg="${e.dataset.p}"][data-v="${e.dataset.v}"]`);if(f)f.click();},
  pickFont(e){setDraft("type."+(["heading","body","ui"].includes(S.ui.fontFor)?S.ui.fontFor:"body"),e.dataset.f);},
  pickSet(e){if(!canEdit())return;const x=FONT_SETS[+e.dataset.i];markBefore("type.heading");
    setP(S.draft,"type.heading",x[1]);setP(S.draft,"type.headingStyle",x[2]);setP(S.draft,"type.ui",x[4]);setDraft("type.body",x[3]);},
  makeImg(e){const [,b,,md]=e.dataset.p.split(".");setPicture(e.dataset.p,makeBrandPicture(S.draft.brands[b],md),"A picture made from your colors");},
  cat(e){const c=e.dataset.c;const cur=REG[S.sec]&&REG[S.sec].cat;const open=S.ui.openCats[c]??(c===cur);S.ui.openCats[c]=!open;render();},
  async addChange(){if(!canEdit())return;const chs=changes();if(!chs.length)return;
    const note=String(S.ui.changeNote||"").trim(),bump=BUMPS.includes(S.ui.bump)?S.ui.bump:bumpFor(baseState(),S.draft).bump;
    if(!note){toast("Write a short note that says what this change does.");const el=document.getElementById("chnote");if(el)el.focus();return;}
    const first=!S.proposal;
    if(S.offline){const change={note,bump,who:roleWho(),at:new Date().toISOString(),edits:chs.map(c=>({path:c.path,before:c.path==="brandOrder"?Object.keys(baseState().brands):clone(getP(baseState(),c.path)??null)}))};
      S.proposal=S.proposal||{number:null,url:null,preview:null,title:note,state:"draft",changes:[],bump:"patch"};
      S.proposal.changes.push(change);S.proposal.bump=["patch","minor","major"].reduce((b,x)=>S.proposal.changes.some(c=>c.bump===x)?x:b,"patch");
      S.base=clone(S.draft);S.ui.bump=null;S.ui.changeNote=undefined;render();toast(first?"I started the proposal. In this prototype it stays in the page.":"I added the change to the proposal.");return;}
    try{await flushSave();const r=await api("POST","/api/proposal/add",{note,bump});loadState(r);S.ui.bump=null;S.ui.changeNote=undefined;render();
      toast(first?(S.proposal.number?`I opened proposal #${S.proposal.number} as a draft pull request.`:"I started the proposal. Its pull request opens when you submit it."):"I added the change to the proposal.");}
    catch(err){toast(err.message);}},
  async submitProposal(){if(!canEdit()||!S.proposal)return;
    if(S.offline){S.proposal.state="in review";render();toast("Submitted. In this prototype, nobody reviews it.");return;}
    try{await flushSave();const r=await api("POST","/api/proposal/submit",{});loadState(r);render();toast(`Proposal #${S.proposal.number} is ready for review.`);}catch(err){toast(err.message);}},
  withdrawAsk(){S.ui.confirmWithdraw=true;render();},
  withdrawCancel(){S.ui.confirmWithdraw=false;render();},
  async withdraw(){if(!canEdit()||!S.proposal)return;S.ui.confirmWithdraw=false;
    if(S.offline){S.notice={kind:"withdrawn",number:null,title:S.proposal.title};S.proposal=null;S.base=null;render();toast("I withdrew the proposal. Your edits are still here.");return;}
    try{const r=await api("POST","/api/proposal/withdraw",{});loadState(r);render();toast("I withdrew the proposal. Your edits are still here.");}catch(err){toast(err.message);}},
  async dismissNotice(){if(S.offline){S.notice=null;render();return;}try{const r=await api("POST","/api/proposal/dismiss",{});loadState(r);render();}catch(err){S.notice=null;render();}},
  /* Undoing a change in a proposal is a new change that puts its values back. History is never rewritten. */
  undoChange(e){if(!canEdit()||!S.proposal)return;const c=S.proposal.changes[+e.dataset.i];if(!c)return;
    markBefore("undo");
    const from=clone(S.draft);for(const x of c.edits){if(x.path==="brandOrder"){const keep=x.before.filter(id=>S.draft.brands[id]),rest=Object.keys(S.draft.brands).filter(id=>!keep.includes(id));from.brands=Object.fromEntries([...keep,...rest].map(id=>[id,S.draft.brands[id]]));}else if(x.before===null){const ks=x.path.split(".");delete getP(from,ks.slice(0,-1).join("."))[ks.at(-1)];}else setP(from,x.path,clone(x.before));}
    for(const x of c.edits){if(x.path==="brandOrder"){S.draft.brands=from.brands;continue;}if(x.before===null){const ks=x.path.split(".");const par=getP(S.draft,ks.slice(0,-1).join("."));if(par)delete par[ks.at(-1)];}else setP(S.draft,x.path,clone(x.before));}
    S.ui.undoNote=`Undo: ${c.note}`.slice(0,300);S.ui.changeNote=undefined;S.sec="proposal";render();scheduleSave();
    toast("The values from before that change are back, as edits. Add them to the proposal to undo it.");},
  askRb(e){S.ui.confirmRb=e.dataset.v;render();},
  cancelRb(){S.ui.confirmRb=null;render();},
  async doRb(e){const v=e.dataset.v;
    if(S.offline){const snap=S.snaps[v];if(!snap){toast("This prototype does not have that version.");return;}const pending=diff(S.published,S.draft),d=clone(snap);d.version=S.published.version;
      pending.forEach(c=>{if(c.path==="brandOrder")return;const x=getP(S.draft,c.path);if(x===undefined){const ks=c.path.split(".");const par=getP(d,ks.slice(0,-1).join("."));if(par)delete par[ks.at(-1)];}else setP(d,c.path,clone(x));});
      markBefore("undo");S.draft=d;S.ui.confirmRb=null;S.ui.undoNote=`Roll back to version ${v}`;S.ui.changeNote=undefined;S.sec="proposal";render();toast(`Your edits are version ${v} now. Add them to a proposal to make it live.`);return;}
    try{await flushSave();markBefore("undo");const r=await api("POST","/api/rollback",{version:v});loadState(r);lastSaved=JSON.stringify(S.draft);S.ui.confirmRb=null;S.ui.undoNote=`Roll back to version ${v}`;S.ui.changeNote=undefined;S.sec="proposal";render();toast(`Your edits are version ${v} now. Add them to a proposal to make it live.`);}catch(err){toast(err.message);}},
  file(e){S.ui.exportFile=e.dataset.f;render();},
  pickIcon(e){S.ui.icon=S.ui.icon===e.dataset.n?null:e.dataset.n;render();},
  iconGrp(e){S.ui.iconGrp=e.dataset.g;render();},
  async copyIcon(e){const n=document.getElementById("icnote");try{await navigator.clipboard.writeText(e.dataset.n);if(n)n.textContent=`Copied "${e.dataset.n}".`;}catch(err){if(n)n.textContent=`The name is ${e.dataset.n}.`;}},
  dlIcon(e){const nm=e.dataset.n, sw=(S.draft.comp.icon||{}).stroke||2, txt=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[nm]}</svg>\n`;
    const n=document.getElementById("icnote");
    if(S.dl){S.dl.save({filename:nm+".svg",data:txt}).catch(()=>{});}
    else{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"image/svg+xml"}));a.download=nm+".svg";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
    if(n)n.textContent=`Downloaded ${nm}.svg.`;},
  async copy(){const txt=fileText(clone(S.published),S.ui.exportFile);const n=document.getElementById("copynote");
    try{await navigator.clipboard.writeText(txt);if(n)n.textContent="Copied. Paste it into your project.";}
    catch(err){const pre=document.querySelector("pre.codebox");const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);if(n)n.textContent="The text is selected. Press Ctrl+C or Command+C to copy it.";}},
  dl(){if(S.dl){const name=S.ui.exportFile.split("/").pop();S.dl.save({filename:name,data:fileText(clone(S.published),S.ui.exportFile)}).catch(()=>{});return;}
    const name=S.ui.exportFile.split("/").pop();const blob=new Blob([fileText(clone(S.published),S.ui.exportFile)],{type:"text/plain"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
    const n=document.getElementById("copynote");if(n)n.textContent=`Downloaded ${name}.`;}
};
document.addEventListener("click",e=>{
  const s=e.target.closest("[data-seg]");
  if(s&&!s.matches(":disabled")){const p=s.dataset.seg,raw=s.dataset.v;
    if(p.startsWith("ui.")){const k=p.slice(3);if(k==="brand"){S.ui.brand=raw;}else S.ui[k]=raw;render();return;}
    const cur=getP(S.draft,p);
    if(/\.look\.(light|dark)\.kind$/.test(p)){const base=p.replace(/\.kind$/,""),[,b,,md]=p.split("."),br=S.draft.brands[b];
      if(raw==="gradient"&&!(br.look&&br.look[md]&&br.look[md].to)){const sc=scaleOf(br.secondary);setP(S.draft,base+".to",md==="dark"?sc[800]:sc[100]);}
      if(raw==="image"&&!(br.look&&br.look[md]&&br.look[md].img)){setPicture(base,makeBrandPicture(br,md),"A picture made from your colors");return;}}
    setDraft(p,typeof cur==="number"||/\.look\.(light|dark)\.(blur|veil|glass)$/.test(p)?+raw:raw);return;}
  const a=e.target.closest("[data-a]");if(a&&!a.matches(":disabled")&&A[a.dataset.a]){A[a.dataset.a](a);}
});
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.id==="baslider"){S.ui.baPos=+t.value;const ba=document.getElementById("ba");if(ba)ba.style.setProperty("--pos",t.value+"%");return;}
  if(t.id==="navq"){S.ui.q=t.value;render();return;}
  if(t.id==="iconq"){S.ui.iconQ=t.value;render();return;}
  if(t.id==="askin"){const had=!!S.draftText.trim();S.draftText=t.value;if(had!==!!t.value.trim()){const c=document.getElementById("cmp");const tmp=document.createElement("div");tmp.innerHTML=composer();c.replaceWith(tmp.firstElementChild);const i=document.getElementById("askin");i.focus();i.setSelectionRange(i.value.length,i.value.length);}return;}
  if(t.dataset.path&&t.type==="color"){setDraft(t.dataset.path,normHex(t.value),true);const hx=document.getElementById(t.id.replace("pick-","hex-"));if(hx)hx.value=normHex(t.value);return;}
  if(t.dataset.pct){const v=t.dataset.inv?1-t.value/100:t.value/100;setDraft(t.dataset.pct,+v.toFixed(2),true);const l=t.previousElementSibling;if(l)l.textContent=`${t.dataset.lbl}: ${t.value}%`;return;}
  if(t.dataset.num&&t.type==="range"){setDraft(t.dataset.num,+t.value,true);const l=t.previousElementSibling;if(l)l.textContent=`Corner size: ${t.value} px`;return;}
  if(t.dataset.hex){const ok=hexOk(t.value);t.classList.toggle("bad",!ok);if(ok)setDraft(t.dataset.hex,normHex(t.value),true);return;}
  if(t.dataset.ui){S.ui[t.dataset.ui]=t.value;return;}
  if(t.dataset.text){if(canEdit()){setP(S.draft,t.dataset.text,t.value);scheduleSave();}return;}
  if(t.dataset.padd){S.ui.palAdd=S.ui.palAdd||{};const k=t.dataset.padd;if(k==="hex"){if(hexOk(t.value)){S.ui.palAdd.hex=normHex(t.value);palInfoRefresh();const o=document.getElementById(t.type==="color"?"paladd-hex":"paladd-pick");if(o)o.value=t.type==="color"?normHex(t.value):normHex(t.value).toLowerCase();const btnAdd=document.querySelector('[data-a="palAdd"]');if(btnAdd)btnAdd.disabled=false;const n=document.getElementById("paladd-note");if(n)n.textContent="";}}else if(k==="name")S.ui.palAdd.name=t.value;return;}
  if(t.dataset.fadd){S.ui.fontAdd=S.ui.fontAdd||{};S.ui.fontAdd[t.dataset.fadd]=t.value;return;}
  if(t.dataset.figui){S.fig=S.fig||{};S.fig[t.dataset.figui]=t.value;return;}
  if(t.dataset.badd){const A0=S.ui.brandAdd=S.ui.brandAdd||{},k=t.dataset.badd;
    if(k==="name"||k==="division"){A0[k]=t.value;if(k==="name"){const n=document.getElementById("badd-id");if(n)n.innerHTML=brandAddIdNote();}return;}
    const ok=hexOk(t.value);if(t.type!=="color")t.classList.toggle("bad",!!t.value&&!ok);if(!ok)return;A0[k]=normHex(t.value);
    const o=document.getElementById(t.type==="color"?`badd-hex-${k}`:`badd-pick-${k}`);if(o)o.value=t.type==="color"?normHex(t.value):normHex(t.value).toLowerCase();return;}
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.id==="navsel"){A.go({dataset:{s:t.value}});return;}
  if(t.dataset.path){setDraft(t.dataset.path,t.type==="color"?normHex(t.value):t.value);return;}
  if(t.dataset.pct){render();return;}
  if(t.dataset.img&&t.files&&t.files[0]){const f=t.files[0],base=t.dataset.img,im=new Image(),url=URL.createObjectURL(f);
    im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(url);setPicture(base,cv,f.name);};
    im.onerror=()=>{toast("That file did not open as a picture. Try a JPG or PNG.");};im.src=url;return;}
  if(t.dataset.num){const v=Math.round(+t.value);if(!isNaN(v))setDraft(t.dataset.num,v);return;}
  if(t.dataset.hex){if(hexOk(t.value))setDraft(t.dataset.hex,normHex(t.value));else{t.value=getP(S.draft,t.dataset.hex);t.classList.remove("bad");}return;}
  if(t.dataset.text){render();return;}
  if(t.dataset.padd==="g"){S.ui.palAdd=S.ui.palAdd||{};S.ui.palAdd.g=+t.value;return;}
  if(t.dataset.figadd!==undefined){S.fig.add={...(S.fig.add||{}),[t.dataset.figadd]:t.checked};return;}
  if(t.dataset.figui){S.fig[t.dataset.figui]=t.value;return;}
  if(t.dataset.figfiles&&t.files&&t.files.length){figReadFiles(t.files).then(files=>{S.fig.files=files;if(files.every(x=>x.coll&&x.mode))figCompareFiles();else render();}).catch(e=>figSet({error:e.message}));return;}
  if(t.dataset.figfile!==undefined){const x=S.fig.files[+t.dataset.figfile];x[t.dataset.k]=t.value||null;if(t.dataset.k==="coll"){const m=figModes(t.value);x.mode=m.length===1?m[0]:null;}if(S.fig.files.every(y=>y.coll&&y.mode))figCompareFiles();else render();return;}
  if(t.dataset.padd==="hex")return;
  if(t.dataset.badd)return;
  if(t.dataset.bren){if(!canEdit())return;const id=t.dataset.b,b=brandList(S.draft).find(x=>x.id===id);if(!b)return;
    const v=t.value.trim(),patch={name:b.name,division:b.div,[t.dataset.bren]:v};if(v===(t.dataset.bren==="name"?b.name:b.div))return;
    try{const st=renameBrand(S.draft,id,patch);markBefore(`brands.${id}.${t.dataset.bren}`);S.draft=st;render();scheduleSave();}catch(err){brandErr(err);}return;}
  if(t.dataset.palname){if(!canEdit())return;const P=t.dataset.palname,ks=P.split("."),g=getP(S.draft,ks.slice(0,-2).join(".")),i=+ks[ks.length-1];const n=palNameFree(g,t.value,i);
    if(n!==g.colors[i].name){markBefore(P+".name");g.colors[i].name=n;scheduleSave();}render();return;}
  if(t.dataset.fadd){S.ui.fontAdd=S.ui.fontAdd||{};S.ui.fontAdd[t.dataset.fadd]=t.value;if(t.type==="file")fontFilesPicked(t.files);return;}
  if(t.dataset.ffile){const F=S.ui.fontAdd&&S.ui.fontAdd.files&&S.ui.fontAdd.files[+t.dataset.ffile];if(F)F[t.dataset.fk]=t.dataset.fk==="weight"?+t.value:t.value;return;}
});
document.addEventListener("keydown",e=>{
  if(e.target.id==="askin"&&e.key==="Enter"){e.preventDefault();ask(S.draftText);}
});
/* canvas: hover to see what you would edit, click to open it */
/* Dragging anywhere on the preview moves the line. A click that does not move still picks a part to edit. */
let baDrag=false,baStart=null,baSkipClick=false;
function setBa(x){const ba=document.getElementById("ba");if(!ba)return;const r=ba.getBoundingClientRect();S.ui.baPos=Math.max(0,Math.min(100,Math.round((x-r.left)/r.width*100)));ba.style.setProperty("--pos",S.ui.baPos+"%");const sl=document.getElementById("baslider");if(sl)sl.value=S.ui.baPos;}
document.addEventListener("pointerdown",e=>{const ba=e.target.closest("#ba");if(!ba||e.button>0)return;baStart={x:e.clientX,id:e.pointerId,moved:false};
  const r=ba.getBoundingClientRect(),lx=r.left+r.width*S.ui.baPos/100;
  if(Math.abs(e.clientX-lx)<28){baDrag=true;ba.setPointerCapture&&ba.setPointerCapture(e.pointerId);setBa(e.clientX);e.preventDefault();}});
document.addEventListener("pointermove",e=>{
  if(baStart&&!baDrag&&Math.abs(e.clientX-baStart.x)>6){const ba=document.getElementById("ba");if(ba){baDrag=true;ba.setPointerCapture&&ba.setPointerCapture(baStart.id);}}
  if(baDrag){if(baStart)baStart.moved=true;setBa(e.clientX);const box=document.getElementById("pickbox");if(box)box.hidden=true;return;}
  const pb=e.target.closest&&e.target.closest("#pvbody"), box=document.getElementById("pickbox");if(!box)return;
  if(!pb){box.hidden=true;return;}
  const h=pickAt(e.target);if(!h){box.hidden=true;return;}
  placeBox(box,h.el,`${REG[h.id].name}${h.id===S.sec?"":" · click to edit"}`);});
document.addEventListener("pointerup",()=>{if(baDrag&&baStart&&baStart.moved){baSkipClick=true;setTimeout(()=>{baSkipClick=false;},400);}baDrag=false;baStart=null;});
document.addEventListener("click",e=>{
  if(baSkipClick&&e.target.closest("#ba")){baSkipClick=false;e.preventDefault();e.stopPropagation();return;}
  if(e.target.closest(".pvnote,.ba-ctl"))return;
  const pb=e.target.closest("#pvbody");if(!pb)return;
  const h=pickAt(e.target);if(!h)return;
  if(h.id===S.sec){h.el.classList.add("is-reach");setTimeout(()=>h.el.classList.remove("is-reach"),900);return;}
  A.go({dataset:{s:h.id}});toast(`Opened ${REG[h.id].name}. Its settings are on the left.`);
},true);
/* settings: hover or focus to see how far a change reaches */
let reachHover=null;
function onEditorHover(e){const fs=e.target.closest&&e.target.closest("fieldset.plain");if(!fs){if(reachHover){reachHover=null;showReach(null);}return;}
  const p=pathOfEditor(e.target);if(p===reachHover)return;reachHover=p;showReach(p);}
document.addEventListener("pointerover",onEditorHover);
document.addEventListener("focusin",onEditorHover);
window.addEventListener("resize",(()=>{let w=window.innerWidth;return()=>{const n=window.innerWidth;if((w>820)!==(n>820)){w=n;render();}w=n;};})());

/* =====================================================================
   SERVER: load, autosave, proposals
   ===================================================================== */
async function api(method,url,body,signal){
  if(body&&typeof body==="object"&&!Array.isArray(body)) body={...body,page:S.page}; // So the live room does not send this page its own change.
  // redirect "manual": when the Cloudflare Access sign-in ends, Access answers with a redirect to its sign-in page,
  // which a request from the page cannot follow. Seeing the redirect is how the console knows to ask for a reload.
  const r=await fetch(url,{method,headers:{"content-type":"application/json"},body:body?JSON.stringify(body):undefined,signal,redirect:"manual"});
  if(r.type==="opaqueredirect"){showSignedOut();throw Object.assign(new Error("Your sign-in has ended."),{status:401});}
  const j=await r.json().catch(()=>({}));
  if(r.status===403&&/sign in|sign-in/i.test(j.error||"")) showSignedOut();
  if(!r.ok) throw Object.assign(new Error(j.error||`The server returned an error (${r.status}).`),{status:r.status});
  return j;
}
/* Cloudflare Access signs people in before the page loads. If the sign-in ends while the console is open, say so. */
function showSignedOut(){
  if(document.getElementById("signedout")) return;
  const el=document.createElement("div");el.id="signedout";el.className="toast";el.setAttribute("role","alert");
  el.innerHTML=`Your sign-in has ended, so changes cannot be saved. <button class="btn s" type="button">Reload to sign in</button>`;
  el.querySelector("button").addEventListener("click",()=>location.reload());
  document.body.appendChild(el);
}
function fmtDate(d){const t=new Date(d+"T12:00:00");return isNaN(t)?d:t.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
function mapHistory(v){return v.map(x=>({v:x.version,date:fmtDate(x.date),note:x.note||"",url:x.url||null}));}
/* Who a change is credited to, in the offline prototype. Online, the server records the signed-in person. */
function roleWho(){return S.me?S.me.email:"Brand team";}
function loadState(r){S.previewOf=r.preview||null;S.draft=r.draft;if(r.draftRev)S.draftRev=r.draftRev;lastSaved=JSON.stringify(r.draft);S.published=r.published;S.engine=r.engine||null;S.base=r.base||null;S.proposal=r.proposal||null;S.notice=r.notice||null;if(!Object.hasOwn(S.draft.brands,S.ui.brand))S.ui.brand=brandList(S.draft)[0].id;S.history=mapHistory(r.history||[]);if("ai" in r){S.ai.server=!!r.ai;S.ai.model=r.model;}if(r.storybook)S.storybook=r.storybook;if(r.figma)S.figma=r.figma;if("github" in r)S.github=r.github;if(r.me){S.me=r.me;S.role=r.me.role;}lastSaved=JSON.stringify(S.draft);S.save="saved";}
function mergeTurns(t){const o=[];t.forEach(x=>{if(o.length&&o[o.length-1].role===x.role)o[o.length-1].content+="\n\n"+x.content;else o.push({...x});});while(o.length&&o[0].role!=="user")o.shift();return o;}
function parseLoose(t){if(!t)return null;try{return JSON.parse(t);}catch(e){}const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f){try{return JSON.parse(f[1]);}catch(e){}}const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1));}catch(e){}}return null;}
let saveT=null,lastSaved="",savePromise=null;
function saveNote(){const el=document.getElementById("savenote");if(!el)return;
  if(S.save==="conflict"){el.innerHTML=`${esc(S.saveErr)} <button class="btn s" data-a="reloadPage">Reload</button>`;el.style.color="var(--red)";return;}
  el.textContent=S.save==="saving"?"Saving your edits…":S.save==="error"?`Your last edit did not save. ${S.saveErr}`:"All edits are saved here.";
  el.style.color=S.save==="error"?"var(--red)":"";}
/* Each save says which version of the edits the page was showing (S.draftRev). If others saved since, the server
   adds only this page's changes to theirs, and sends the combined edits back, so nobody's work is lost. */
function scheduleSave(){if(!S.draft||S.offline||S.save==="conflict")return;const j=JSON.stringify(S.draft);if(j===lastSaved)return;S.save="saving";saveNote();clearTimeout(saveT);saveT=setTimeout(()=>doSave(j),500);}
function doSave(j){savePromise=(async()=>{try{const r=await api("PUT","/api/draft",{draft:JSON.parse(j),base:S.draftRev});
    if(r.rev)S.draftRev=r.rev;
    if(r.merged&&r.draft){S.draft=mergeEdits(JSON.parse(j),S.draft,r.draft);lastSaved=JSON.stringify(r.draft);if(!S.mergedToast){S.mergedToast=true;toast("Someone else changed the edits too. I combined their changes with yours.");}render();}
    else lastSaved=j;
    S.save=JSON.stringify(S.draft)===lastSaved?"saved":"saving";if(S.save==="saving")scheduleSave();}
  catch(e){if(e.status===409){S.save="conflict";S.saveErr=e.message;}else{S.save="error";S.saveErr=e.message;}}saveNote();})();return savePromise;}
async function flushSave(){if(S.offline)return;clearTimeout(saveT);const j=JSON.stringify(S.draft);if(j!==lastSaved) await doSave(j);else if(savePromise) await savePromise;if(S.save==="error"||S.save==="conflict") throw new Error("Your edits could not be saved, so nothing was sent. "+S.saveErr);}
window.addEventListener("beforeunload",e=>{if(S.draft&&JSON.stringify(S.draft)!==lastSaved){e.preventDefault();e.returnValue="";}});

/* the guide's first messages: it has already looked at the draft */
function greet(){
  const ch=changes(), bl=checks().filter(x=>x.level==="block");
  const P=S.proposal,N=S.notice;
  addMsg({who:"g",x:N&&N.kind==="landed"?`Hi. Your proposal "${N.title}" landed, so a new version is on its way.`:P?`Hi. ${P.number?`Proposal #${P.number}`:"Your proposal"} is ${P.state==="in review"?"in review":"a draft"}, with ${P.changes.length} change${P.changes.length>1?"s":""}.${ch.length?` You also have ${ch.length} edit${ch.length>1?"s":""} that ${ch.length>1?"are":"is"} not in it yet.`:""}`:ch.length?`Hi. I looked at your edits before you got here. There ${ch.length>1?"are":"is"} ${ch.length} that ${ch.length>1?"are":"is"} not in a proposal yet.`:"Hi. Nothing is waiting. Every edit you make is saved here until you add it to a proposal."});
  bl.forEach(x=>{
    if(x.fix){const id=addProp(fixChanges(S.draft,x.fix));addMsg({who:"g",x:`${x.title} ${x.detail} Here is a fix that keeps your color.`,prop:id});}
    else addMsg({who:"g",x:`${x.title} ${x.detail}`});
    const m=x.id.match(/^btn-(.+)$/);const pal=m&&S.draft.brands[m[1]]&&S.draft.brands[m[1]].palette;
    if(pal){const alt=pal.groups.filter(g=>g.id!=="base"&&g.id!=="accent").flatMap(g=>g.colors).find(c=>contrast("#FFFFFF",c.hex)>=4.5&&c.hex!==S.draft.brands[m[1]].primary);
      if(alt){const id2=addProp([{path:`brands.${m[1]}.primary`,value:alt.hex,why:`${alt.name} is in your color set. White words on it are easy to read.`}]);addMsg({who:"g",x:`Or, if white words matter more to you, I can use ${alt.name} from your color set for buttons.`,prop:id2});}}
  });
  if(!bl.length&&ch.length) addMsg({who:"g",x:"Every must-pass check passes, so you can add your edits to a proposal when you are ready."});
  addMsg({who:"g",x:"You can talk to me any time by tapping the mic."});
}
/* =====================================================================
   LIVE: others' edits, and who is here, without reloading (server/live.mjs)
   ===================================================================== */
S.page=Math.random().toString(36).slice(2,10);S.people=[];S.liveUp=false;
let liveWs=null,liveTry=0,livePing=null,liveSent="",liveToastAt=0;
const SEC_NAME=id=>(NAV.flatMap(g=>g[1]).find(x=>x[0]===id)||[])[1]||(REG[id]&&REG[id].name)||id;
function peeps(){
  const seen=new Map();for(const p of S.people)if(p.page!==S.page&&!(S.me&&p.email===S.me.email&&p.page===S.page))seen.set(p.email+"|"+p.page,p);
  const list=[...seen.values()];if(!list.length)return `<span class="peeps" aria-live="polite"></span>`;
  const ini=p=>(p.name||p.email||"?").split(/[\s.@_-]+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
  return `<span class="peeps" aria-live="polite" aria-label="Also here: ${esc(list.map(p=>p.name||p.email).join(", "))}">${list.slice(0,5).map(p=>`<span class="peep" title="${esc(p.name||p.email)}${p.sec?` · on ${esc(SEC_NAME(p.sec))}${p.brand&&S.draft.brands[p.brand]?` · ${esc(bn(p.brand))}`:""}`:""}">${esc(ini(p))}</span>`).join("")}${list.length>5?`<span class="peep">+${list.length-5}</span>`:""}</span>`;}
function peepsRefresh(){const el=document.querySelector(".peeps");if(!el)return;const t=document.createElement("div");t.innerHTML=peeps();el.replaceWith(t.firstElementChild);}
function liveHere(){if(!liveWs||liveWs.readyState!==1)return;const k=S.sec+"|"+S.ui.brand;if(k===liveSent)return;liveSent=k;liveWs.send(JSON.stringify({type:"here",sec:S.sec,brand:S.ui.brand}));}
function liveSay(m){const now=Date.now();if(now-liveToastAt<2500)return;liveToastAt=now;toast(m);}
function connectLive(){
  if(S.offline||!("WebSocket" in window))return;
  // A page the browser loads ahead of time, before anyone looks at it, connects only once it is shown.
  if(document.prerendering){document.addEventListener("prerenderingchange",connectLive,{once:true});return;}
  try{liveWs=new WebSocket(location.origin.replace(/^http/,"ws")+"/api/live?page="+S.page);}catch(e){return;}
  liveWs.onopen=()=>{const again=liveTry>0;liveTry=0;S.liveUp=true;liveSent="";liveHere();clearInterval(livePing);livePing=setInterval(()=>{try{liveWs.send('{"type":"ping"}');}catch(e){}},30000);if(again)liveCatchUp();};
  liveWs.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(err){return;}
    if(m.type==="presence"){S.people=m.people||[];peepsRefresh();}
    else if(m.type==="edits")liveEdits(m);
    else if(m.type==="refresh")liveRefresh(m);};
  liveWs.onclose=()=>{S.liveUp=false;clearInterval(livePing);S.people=[];peepsRefresh();liveTry++;setTimeout(connectLive,Math.min(30000,1000*2**Math.min(liveTry,5)));};
}
/* Someone else saved. Their edits come in, combined with anything this page has not saved yet. */
function liveEdits(m){
  const before=S.draft,dirty=JSON.stringify(S.draft)!==lastSaved,base=lastSaved?JSON.parse(lastSaved):null;
  S.draft=dirty&&base?mergeEdits(base,S.draft,m.draft):m.draft;
  lastSaved=JSON.stringify(m.draft);S.draftRev=m.rev;
  const ch=diff(before,S.draft);
  if(ch.length)liveSay(`${m.by||"Someone"} changed ${labelFor(ch[0].path).replace(/^./,c=>c.toLowerCase())}${ch.length>1?`, and ${ch.length-1} more`:""}.`);
  render();if(dirty)scheduleSave();}
/* Something else changed: the proposal, a Figma sync, a rollback. This page loads the newest state. */
async function liveRefresh(m){try{await flushSave();const r=await api("GET","/api/state");loadState(r);render();if(m&&m.by)liveSay(`${m.by} ${m.what||"changed something"}.`);}catch(e){}}
/* After the connection was down: catch up on anything missed. */
function liveCatchUp(){liveRefresh(null);}
async function boot(){
  applyChrome();
  document.getElementById("app").innerHTML=`<div class="boot">Loading your design system…</div>`;
  try{if(window.__EMBED__)throw new Error("offline");const r=await api("GET","/api/state");loadState(r);greet();render();connectLive();}
  catch(e){
    if(e.status===401||document.getElementById("signedout")) return;
    if(window.__EMBED__){const E=window.__EMBED__;S.offline=true;S.snaps=E.snaps;loadState({draft:E.draft,published:E.published,history:E.history});greet();render();
      (async()=>{try{if(window.claude&&claude.use){const [smp,dl]=await Promise.all([claude.use("sample").catch(()=>null),claude.use("downloads").catch(()=>null)]);S.ai.sample=smp||null;S.dl=dl||null;render();}}catch(err){}})();
      return;}
    document.getElementById("app").innerHTML=`<div class="boot"><b>The console could not load the design system.</b><p>Reload the page to try again. On your own computer, start the console with <code>npm start</code>.</p><p class="under">${esc(e.message)}</p></div>`;}
}
boot();
