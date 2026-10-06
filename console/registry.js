/* =====================================================================
   COMPONENT REGISTRY
   One entry per component. The console, the preview, the checks, the
   helper's whitelist, and the exported manifest all read from here.
   level: Primitive < Component < Composite < Healthcare
   slot types: radius | shadow | num (unit) | enum
   ===================================================================== */
import { BN, RADII, esc, rad, shadow } from "./basics.js";
export const CATS=[["actions","Actions"],["inputs","Form inputs"],["structure","Form structure"],["feedback","Feedback"],["content","Content"],["navigation","Navigation"],["overlays","Overlays"],["data","Data"],["layout","Layout"],["health","Healthcare"]];
export const CATN=Object.fromEntries(CATS);
export const REG={}, REG_ORDER=[];
export function def(o){REG[o.id]=o;REG_ORDER.push(o.id);}
export const RAD4=[["none","None"],["sm","Small"],["md","Medium"],["lg","Large"]];
export const SHD=[["none","None"],["soft","Soft"],["strong","Strong"]];

/* ---------- small icon set for specimens (stroke = currentColor) ---------- */
export const ICP={
  check:'<path d="M4 12.5l5 5L20 7"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',down:'<path d="M6 9l6 6 6-6"/>',up:'<path d="M6 15l6-6 6 6"/>',right:'<path d="M9 6l6 6-6 6"/>',left:'<path d="M15 6l-6 6 6 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',err:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',ok:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',home:'<path d="M3 11l9-7 9 7v10H3z"/><path d="M9 21v-6h6v6"/>',
  file:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',upload:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',phone:'<path d="M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  pill:'<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M9.5 8.5l5 7"/>',heart:'<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',flask:'<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2l-6-10V3"/>',
  pin:'<path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',ext:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',filter:'<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',sort:'<path d="M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',dl:'<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',edit:'<path d="M4 20h4L20 8l-4-4L4 16z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17v.5"/>',card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  printer:'<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',msg:'<path d="M4 5h16v11H9l-5 4z"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'};
export function ic(n,cls=""){return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="stroke-width:var(--c-icon-stroke,2)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICP[n]||""}</svg>`;}
export const SG=(l,h)=>`<div class="grp"><div class="sl">${l}</div>${h}</div>`;
export const FLD=(label,inner,help,o={})=>`<div class="pv-field${o.err?" err":""}"><span class="lb">${label}${o.opt?` <span class="muted" style="font-weight:400">${o.opt}</span>`:""}</span>${o.hintTop?`<span class="pv-help">${o.hintTop}</span>`:""}${inner}${help?`<span class="pv-help">${o.err?ic("err")+" ":""}${help}</span>`:""}</div>`;
export const CB=(on,label,o={})=>`<div class="pv-opt"><span class="pv-cb${on?" on":""}${o.cls?" "+o.cls:""}">${on==="mixed"?ic("minus"):on?ic("check"):""}</span><span class="t"><span>${label}</span>${o.hint?`<span class="pv-help" style="display:block">${o.hint}</span>`:""}</span></div>`;
export const RD=(on,label,o={})=>`<div class="pv-opt"><span class="pv-rd${on?" on":""}${o.cls?" "+o.cls:""}"><i></i></span><span class="t"><span>${label}</span>${o.hint?`<span class="pv-help" style="display:block">${o.hint}</span>`:""}</span></div>`;

/* ======================= ACTIONS ======================= */
def({id:"button",cat:"actions",level:"Primitive",name:"Button",legacy:true,
  desc:"People press buttons to do something, like save or pay.",
  slots:[{k:"bg",label:"Button color",opts:[["action.primary","Main color"],["highlight","Second color"],["ink","Dark"]],hint:"The color of the main button. The words on it are picked for you."},{k:"radius",label:"Corners",type:"radius",opts:[["sm","Small"],["md","Medium"],["lg","Large"],["pill","Round ends"]]},{k:"weight",label:"Word weight",opts:[[500,"Medium"],[600,"Semibold"],[700,"Bold"]]},{k:"case",label:"Letter case",opts:[["sentence","Sentence case"],["upper","ALL CAPS"]]},{k:"track",label:"Letter spacing",opts:[["normal","Normal"],["wide","A little wider"],["wider","Wider"]],hint:"A little extra space between letters makes short button words easier to read."},{k:"pad",label:"Space on the sides",opts:[["normal","Normal"],["roomy","Roomy"]],hint:"Roomy buttons are easier to tap and look calmer."}],
  from:["icon"],props:[["variant","primary | outline | quiet | ghost | danger","Pick one primary button per screen."],["size","inherits screen","Height comes from the screen type and text size."],["icon","icon name","Optional. Shows before the words."],["fullWidth","true | false","Use on phones for the main action."],["loading","true | false","Shows a spinner and blocks double taps."],["disabled","true | false","Avoid it. Explain what is missing instead."]],
  a11y:"Uses a real button element. The keyboard focus outline is always visible. Words must be at least 4.5 to 1 against the button."});
def({id:"icon-button",cat:"actions",level:"Primitive",name:"Icon button",
  desc:"A small button that shows only a picture, like a trash can or a close X.",
  slots:[{k:"shape",label:"Shape",type:"radius",opts:[["md","Rounded square"],["pill","Circle"]]},{k:"showLabel",label:"Show a word under the icon",opts:[["no","No"],["yes","Yes"]],hint:"Older readers find icons easier to understand when a word is shown."}],
  defaults:{shape:"md",showLabel:"yes"},from:["button","icon","tooltip"],
  props:[["icon","icon name","Required."],["label","text","Required. Read out loud by screen readers."],["variant","primary | outline | ghost",""],["showLabel","true | false","Shows the label under the icon."]],
  a11y:"Every icon button has a hidden label for screen readers. The tap area is the full control height, even when the icon is small.",
  guide:"Only use an icon button when the picture is very common, like X for close or a trash can for delete. Always give it a label. When there is room, show the label as a word too.",
  tokens:x=>[["Size","{size.control}",x.z.control+" px"],["Shape","{component.icon-button.shape}",RADII[x.cfg.shape]],["Icon color","{color.link}",x.c.link]],
  spec:cfg=>{const L=(t)=>cfg.showLabel==="yes"?`<span class="small muted">${t}</span>`:"";const B=(v,n,t,e="")=>`<span class="pv-tip"><span class="pv-ibtn ${v}${e}">${ic(n)}</span>${L(t)}</span>`;
    return SG("Kinds",`<div class="pv-row">${B("primary","plus","Add")}${B("outline","edit","Edit")}${B("ghost","trash","Delete")}${B("outline","printer","Print")}</div>`)+SG("Keyboard focus",`<div class="pv-row">${B("outline","x","Close"," focus")}</div>`);}});
def({id:"button-group",cat:"actions",level:"Component",name:"Button group",
  desc:"A few buttons joined together. People pick one, like Day, Week, or Month.",
  slots:[{k:"selected",label:"Chosen button",opts:[["soft","Soft color"],["solid","Main color"]]}],defaults:{selected:"soft"},from:["button"],
  props:[["options","list of {label, value}","Two to five choices."],["value","value","The chosen option."],["onChange","function",""]],
  a11y:"Works like a set of radio buttons. Arrow keys move between choices. The chosen button says 'selected' to screen readers.",
  guide:"Use a button group to switch between views of the same thing. Keep it to five choices or fewer. For choices in a form, use radio buttons instead.",
  tokens:x=>[["Chosen fill","{color.action.soft}",x.cfg.selected==="solid"?x.c.P:x.c.secondary],["Border","{color.border.strong}",x.c.input],["Corners","{component.button.radius}",rad(x.st,x.st.comp.button.radius)+" px"]],
  spec:cfg=>{const s=cfg.selected==="solid"?" solidsel":"";return SG("Switch views",`<div class="pv-bgroup${s}"><span class="pv-btn outline">Day</span><span class="pv-btn outline sel">${ic("check")} Week</span><span class="pv-btn outline">Month</span></div>`)+SG("With icons",`<div class="pv-bgroup${s}"><span class="pv-btn outline sel">${ic("check")} List</span><span class="pv-btn outline">${ic("pin")} Map</span></div>`);}});
def({id:"link",cat:"actions",level:"Primitive",name:"Link",
  desc:"Words people click to go to another page. Includes action links and back links.",
  slots:[{k:"underline",label:"Underline",opts:[["always","Always"],["hover","Only on mouse over"]],hint:"Many older readers only know a link is a link when it is underlined."},{k:"weight",label:"Weight",opts:[[400,"Regular"],[600,"Semibold"]]}],
  defaults:{underline:"always",weight:600},from:["icon"],
  props:[["href","url","Required."],["variant","inline | standalone | action | back","'action' starts a main task. 'back' goes one step back."],["external","true | false","Adds an icon and says 'opens a new tab'."]],
  a11y:"Link words must make sense alone, like 'View your claims', not 'Click here'. External links say they open a new tab.",
  guide:"Use a link to go somewhere. Use a button to do something. Use an action link, not a button, to start a main task from a page, like 'Find a doctor'. Never write 'click here'.",
  tokens:x=>[["Color","{color.link}",x.c.link],["Weight","{component.link.weight}",x.cfg.weight],["Focus outline","{color.focus-ring}",x.c.ring]],
  spec:cfg=>{const st=`text-decoration:${cfg.underline==="always"?"underline":"none"};font-weight:${cfg.weight}`;
    return SG("Inside a sentence",`<p>You can <span class="lnk" style="${st}">see your plan details</span> at any time.</p>`)+SG("Action link",`<span class="pv-action"><i>${ic("arrow")}</i>Find a doctor near you</span>`)+SG("Back link",`<span class="lnk pv-lnk-row" style="${st}">${ic("back")} Back</span>`)+SG("Opens another website",`<span class="lnk pv-lnk-row" style="${st}">Social Security website ${ic("ext")}<span class="pv-sr">(opens a new tab)</span></span>`);}});

/* ======================= FORM INPUTS ======================= */
def({id:"field",cat:"inputs",level:"Component",name:"Text field",legacy:true,
  desc:"A box where people type, with a label and help text.",
  slots:[{k:"border",label:"Border",opts:[["border.strong","Strong gray"],["border.default","Light gray"]],hint:"The line around the box where people type."},{k:"radius",label:"Corners",type:"radius",opts:RAD4},{k:"labelWeight",label:"Label weight",opts:[[400,"Regular"],[600,"Semibold"],[700,"Bold"]]}],
  from:["label-hint","error-message"],props:[["label","text","Required. Always shown above the box."],["hint","text","Help under the label."],["error","text","Shown when something is wrong."],["type","text | email | tel","Sets the phone keyboard."],["autocomplete","string","Lets the browser fill it in."],["width","full | 2 | 4 | 10 | 20 characters","Match the width to the answer."]],
  a11y:"The label is connected to the box. Help and error text are read out with it. Errors are never shown by color alone."});
def({id:"textarea",cat:"inputs",level:"Component",name:"Text area",
  desc:"A big box for longer answers, like a note to a doctor. It can count characters.",
  slots:[{k:"rows",label:"Starting height",opts:[[3,"3 lines"],[5,"5 lines"],[8,"8 lines"]]},{k:"count",label:"Character count",opts:[["show","Show it"],["hide","Hide it"]]}],
  defaults:{rows:5,count:"show"},from:["field","label-hint","error-message"],
  props:[["label","text","Required."],["maxLength","number","Turns on the character count."],["rows","number","Starting height."],["error","text",""]],
  a11y:"The character count updates for screen readers after the person stops typing, not on every key.",
  guide:"Use a text area when the answer may be more than one line. Tell people how much to write. If there is a limit, show the count so they are not surprised.",
  tokens:x=>[["Border","{component.field.border}",x.c.input],["Line height","{font.line-height.body}",x.st.type.lineHeight],["Count text","{color.text.muted}",x.c.mutedFg]],
  spec:cfg=>{const h=`style="height:calc(var(--text-base) * var(--lh) * ${cfg.rows} + 20px);align-items:flex-start;padding-top:10px"`;const cnt=(t,e)=>cfg.count==="show"?t:"";
    return SG("With a character count",FLD("What would you like your doctor to know?",`<div class="pv-in" ${h}>I have been feeling dizzy in the mornings for about two weeks.</div>`,cnt("You have 438 characters left.")))+SG("Too long",FLD("Message",`<div class="pv-in" ${h}>I need a refill of my blood pressure medicine before my trip next week. I also have a question about my last lab test.</div>`,"You have 12 characters too many.",{err:1}));}});
def({id:"select",cat:"inputs",level:"Component",name:"Select",legacy:true,
  desc:"A list people open to pick one choice.",
  slots:[{k:"radius",label:"Corners",type:"radius",opts:RAD4,hint:"Most teams match this to the text field."},{k:"menuShadow",label:"Menu shadow",type:"shadow",opts:SHD}],
  from:["field","label-hint"],props:[["label","text","Required."],["options","list","5 to 15 choices."],["placeholder","text","Only 'Choose one'. Never a real choice."]],
  a11y:"On phones and tablets, it is the browser's own select, so it works with every screen reader and opens the phone's own picker. With a mouse, it is a button that opens a list. Focus stays on the button. Arrow keys, Home, End, and typing a letter move through the choices. Enter or Space picks one. Esc closes the list and keeps the old choice."});
def({id:"checkbox",cat:"inputs",level:"Primitive",name:"Checkbox",
  desc:"A small box people tick. They can pick more than one.",
  slots:[{k:"size",label:"Box size",type:"num",unit:"em",opts:[[1.25,"Standard"],[1.6,"Large"]],hint:"The size grows with the text size."},{k:"radius",label:"Box corners",type:"radius",opts:[["none","None"],["sm","Small"],["md","Medium"]]}],
  defaults:{size:1.6,radius:"sm"},from:["label-hint","error-message","fieldset"],
  props:[["label","text","Required. Clicking it ticks the box."],["checked","true | false | mixed","'mixed' is for a parent box with some children ticked."],["hint","text",""],["error","text",""]],
  a11y:"The whole label is part of the tap area. Groups sit inside a fieldset with a legend that asks the question.",
  guide:"Use checkboxes when people can pick more than one choice, or to agree to something. Put each choice on its own line. Never start with a box already ticked for anything that costs money or shares data.",
  tokens:x=>[["Box size","{component.checkbox.size}",Math.round(x.cfg.size*x.z.base)+" px"],["Box border","{component.field.border}",x.c.input],["Ticked fill","{color.action.primary}",x.c.P],["Tick","{color.on-action}",x.c.onP]],
  spec:()=>SG("A group",`<div class="pv-stack" style="gap:2px"><span class="lb" style="font-weight:var(--label-weight)">How can we reach you?</span><span class="pv-help">Pick all that apply.</span>${CB(1,"Phone call")}${CB(1,"Text message",{hint:"Message and data rates may apply."})}${CB(0,"Email")}</div>`)+SG("Some ticked",CB("mixed","All reminders"))+SG("Keyboard focus",CB(0,"Send me a paper copy",{cls:"focus"}))+SG("Something is wrong",`<div class="pv-field err">${CB(0,"I agree to the terms",{cls:"err"})}<span class="pv-help">${ic("err")} You must agree before you can go on.</span></div>`)});
def({id:"radio",cat:"inputs",level:"Primitive",name:"Radio buttons",
  desc:"A list of round buttons. People pick only one choice.",
  slots:[{k:"style",label:"Style",opts:[["plain","Plain list"],["tiles","Tiles"]],hint:"Tiles are bigger and easier to tap. They can hold a short description."}],
  defaults:{style:"tiles"},from:["checkbox","fieldset","label-hint"],
  props:[["legend","text","Required. The question."],["options","list of {label, value, hint}","2 to 6 choices."],["value","value",""],["layout","stacked | inline","Only use inline for Yes and No."]],
  a11y:"Arrow keys move between choices. The group has a legend. Nothing is chosen at the start unless there is a safe default.",
  guide:"Use radio buttons when people must pick exactly one of 2 to 6 choices. Show every choice, do not hide them in a dropdown. For Yes and No questions, put Yes first.",
  tokens:x=>[["Circle size","{component.checkbox.size}",Math.round(x.st.comp.checkbox.size*x.z.base)+" px"],["Chosen dot","{color.action.primary}",x.c.P],["Chosen tile","{color.action.soft}",x.c.secondary]],
  spec:cfg=>{const q=`<span class="lb" style="font-weight:var(--label-weight)">How would you like to get your card?</span>`;
    if(cfg.style==="tiles") return SG("Tiles",`<div class="pv-stack" style="gap:calc(var(--gap)*.6)">${q}<div class="pv-tile on">${RD(1,"<b>By mail</b>",{hint:"It arrives in 7 to 10 days."})}</div><div class="pv-tile">${RD(0,"<b>Download it now</b>",{hint:"You can print it or save it to your phone."})}</div></div>`)+SG("Yes or no",`<div class="pv-row">${RD(1,"Yes")}${RD(0,"No")}</div>`);
    return SG("Plain list",`<div class="pv-stack" style="gap:2px">${q}${RD(1,"By mail",{hint:"It arrives in 7 to 10 days."})}${RD(0,"Download it now")}</div>`)+SG("Yes or no",`<div class="pv-row">${RD(1,"Yes")}${RD(0,"No")}</div>`);}});
def({id:"switch",cat:"inputs",level:"Primitive",name:"Switch",
  desc:"An on and off control that works right away, like turning on text reminders.",
  slots:[{k:"stateText",label:"Show On or Off in words",opts:[["yes","Yes"],["no","No"]],hint:"Words make the state clear to people who do not see color well."}],
  defaults:{stateText:"yes"},from:["label-hint"],
  props:[["label","text","Required."],["checked","true | false",""],["onChange","function","Saves right away. No Save button."]],
  a11y:"Uses role switch, so screen readers say 'on' or 'off'.",
  guide:"Use a switch only for settings that take effect right away. Inside a form that has a Submit button, use a checkbox instead.",
  tokens:x=>[["On fill","{color.action.primary}",x.c.P],["Off fill","{color.surface.muted}",x.c.muted],["Border","{component.field.border}",x.c.input]],
  spec:cfg=>{const S2=(on,l,h)=>`<div class="pv-opt" style="justify-content:space-between;gap:var(--gap)"><span class="t"><span>${l}</span>${h?`<span class="pv-help" style="display:block">${h}</span>`:""}</span><span class="pv-row" style="gap:.5em;flex-wrap:nowrap">${cfg.stateText==="yes"?`<b class="small">${on?"On":"Off"}</b>`:""}<span class="pv-sw${on?" on":""}"><i></i></span></span></div>`;
    return SG("Settings list",`<div class="pv-card" style="gap:0">${S2(1,"Text me when a refill is ready","We send texts to (555) 201-4488.")}<div class="pv-hr"></div>${S2(0,"Email me my monthly statement")}</div>`);}});
def({id:"combobox",cat:"inputs",level:"Composite",name:"Combobox (search and pick)",
  desc:"A box that shows matches as people type, like finding a medicine or a doctor.",
  slots:[{k:"match",label:"Show the matching letters",opts:[["bold","In bold"],["none","Plain"]]},{k:"min",label:"Start showing matches after",opts:[[1,"1 letter"],[2,"2 letters"],[3,"3 letters"]]}],
  defaults:{match:"bold",min:2},from:["field","select","spinner","empty-state"],
  props:[["label","text","Required."],["source","list or async function","Where matches come from."],["minChars","number",""],["allowFreeText","true | false","Can people keep words that are not in the list?"],["onSelect","function",""]],
  a11y:"Follows the ARIA combobox pattern. Focus stays in the box. Up and down arrows move through matches, and Home and End jump to the first and last one. Enter picks a match. Esc closes the list. The number of matches is read out.",
  guide:"Use a combobox when there are too many choices for a dropdown, like medicines, doctors, or cities. Forgive spelling mistakes. Show 'No matches' with a next step when nothing is found.",
  tokens:x=>[["Menu","{component.select.menu-shadow}",x.st.comp.select.menuShadow],["Highlighted row","{color.action.soft}",x.c.secondary],["Border","{component.field.border}",x.c.input]],
  spec:cfg=>{const m=t=>cfg.match==="bold"?`<b>${t}</b>`:t;
    return SG("Typing and picking",FLD("Medicine name",`<div class="pv-in focus">metf<span style="border-left:2px solid var(--foreground);height:1.1em;margin-left:-6px"></span>${ic("search","chev")}</div><div class="pv-menu"><div class="sel"><span>${m("Metf")}ormin 500 mg tablet</span></div><div><span>${m("Metf")}ormin 1000 mg tablet</span></div><div><span>${m("Metf")}ormin ER 750 mg</span></div><div class="muted small" style="min-height:0;padding-top:6px;padding-bottom:6px">3 matches</div></div>`,"Type at least "+cfg.min+" letters."))+SG("Nothing found",`<div class="pv-menu"><div class="muted" style="min-height:0;padding:10px 12px;display:block">No medicines match "metx". Check the spelling, or <span class="lnk">call your pharmacist</span>.</div></div>`);}});
def({id:"search",cat:"inputs",level:"Component",name:"Search field",
  desc:"A box to search the site or a list.",
  slots:[{k:"button",label:"Search button",opts:[["text","Word 'Search'"],["icon","Icon only"]]}],defaults:{button:"text"},from:["field","button","icon-button"],
  props:[["label","text","Hidden label, like 'Search the site'."],["placeholder","text","Only an example, never instructions."],["onSubmit","function",""]],
  a11y:"Sits inside a search landmark. The button has a label even when it shows only an icon.",
  guide:"Put site search in the header. Show what people searched for and how many results there are. Keep their words in the box after they search.",
  tokens:x=>[["Border","{component.field.border}",x.c.input],["Button","{component.button.background}",x.c.btnBg]],
  spec:cfg=>{const b=cfg.button==="text"?`<span class="pv-btn primary" style="border-radius:0 var(--field-radius) var(--field-radius) 0">Search</span>`:`<span class="pv-ibtn primary" style="border-radius:0 var(--field-radius) var(--field-radius) 0">${ic("search")}</span>`;
    return SG("Site search",`<div style="display:flex"><div class="pv-in" style="border-radius:var(--field-radius) 0 0 var(--field-radius);border-right:none">${ic("search")}<span class="ph">Search, like "flu shot"</span></div>${b}</div>`)+SG("After a search",`<p class="small muted">24 results for "flu shot"</p>`);}});
def({id:"date-input",cat:"inputs",level:"Component",name:"Date input (known date)",
  desc:"Three small boxes for month, day, and year. Use it for dates people know, like a birth date.",
  slots:[{k:"labels",label:"Box labels",opts:[["words","Month, Day, Year"],["short","MM, DD, YYYY"]]}],defaults:{labels:"words"},from:["field","fieldset","error-message"],
  props:[["legend","text","Required. Like 'Date of birth'."],["hint","text","An example, like 'For example, 3 27 1952'."],["value","{month, day, year}",""],["error","text + which box",""]],
  a11y:"Three plain number boxes in a fieldset. Uses the number keyboard on phones. Each box has its own label. Errors say which box is wrong.",
  guide:"Use this for dates people already know, like a birth date or the date a card was issued. Never make people scroll back years in a calendar. Use the date picker only for dates they need to choose, like an appointment.",
  tokens:x=>[["Border","{component.field.border}",x.c.input],["Box height","{size.control}",x.z.control+" px"]],
  spec:cfg=>{const L=cfg.labels==="words"?["Month","Day","Year"]:["MM","DD","YYYY"];
    const row=(v,e)=>`<div class="pv-di">${[[L[0],v[0],2],[L[1],v[1],2],[L[2],v[2],4]].map(([l,val,w],i)=>`<div class="pv-field w${w}${e===i?" err":""}"><span class="lb" style="font-weight:400">${l}</span><div class="pv-in">${val}</div></div>`).join("")}</div>`;
    return SG("Date of birth",`<div class="pv-field"><span class="lb">Date of birth</span><span class="pv-help">For example, 3 27 1952</span>${row(["3","27","1952"])}</div>`)+SG("Something is wrong",`<div class="pv-field err"><span class="lb">Date of birth</span><span class="pv-help">${ic("err")} The day must be between 1 and 31.</span>${row(["3","42","1952"],1)}</div>`);}});
def({id:"date-picker",cat:"inputs",level:"Composite",name:"Date picker",
  desc:"A date box with a small calendar that pops open. Use it for picking a new date, like an appointment.",
  slots:[{k:"weekStart",label:"Week starts on",opts:[["sun","Sunday"],["mon","Monday"]]},{k:"day",label:"Chosen day shape",type:"radius",opts:[["pill","Circle"],["sm","Square"]]}],
  defaults:{weekStart:"sun",day:"pill"},from:["field","icon-button","popover","date-input"],
  props:[["label","text","Required."],["value","date",""],["min / max","date","Days outside are turned off."],["disabledDates","function","Like weekends for a clinic."],["typeable","true","People can always type the date instead."]],
  a11y:"People can always type the date. The calendar is a grid: arrow keys move by day, Page Up and Page Down move by month. Turned-off days say why.",
  guide:"Use a date picker for picking a new date within a few months, like a visit or a delivery. Always let people type the date too. Turn off days that cannot be picked and say why. For birth dates, use the date input.",
  tokens:x=>[["Chosen day","{color.action.primary}",x.c.P],["Today ring","{color.link}",x.c.link],["Day size","{size.control} x 0.82",Math.round(x.z.control*.82)+" px"]],
  spec:cfg=>{const days=cfg.weekStart==="sun"?["Su","Mo","Tu","We","Th","Fr","Sa"]:["Mo","Tu","We","Th","Fr","Sa","Su"];
    const first=cfg.weekStart==="sun"?4:3; /* Oct 1 2026 is a Thursday */ let cells="";
    for(let i=0;i<first;i++) cells+=`<span class="d out">${27+i-(first-4)}</span>`;
    for(let d=1;d<=31;d++){const dow=(first+d-1)%7, wk=cfg.weekStart==="sun"?(dow===0||dow===6):(dow===5||dow===6);cells+=`<span class="d${d===14?" sel":""}${d===1?" today":""}${wk?" off":""}">${d}</span>`;}
    return SG("Open",`<div class="pv-stack" style="gap:8px">${FLD("Visit date",`<div class="pv-in focus">10/14/2026<span class="chev">${ic("cal")}</span></div>`,"Type it, or pick a day.")}<div class="pv-cal"><div class="hd"><span class="pv-ibtn ghost" style="width:calc(var(--control-h)*.8);height:calc(var(--control-h)*.8)">${ic("left")}</span><span>October 2026</span><span class="pv-ibtn ghost" style="width:calc(var(--control-h)*.8);height:calc(var(--control-h)*.8)">${ic("right")}</span></div><div class="gr">${days.map(d=>`<span class="dw">${d}</span>`).join("")}${cells}</div><p class="small muted">The clinic is closed on weekends.</p></div></div>`);}});
def({id:"time-picker",cat:"inputs",level:"Component",name:"Time picker",
  desc:"A list of times to pick from, like 10:30 AM.",
  slots:[{k:"step",label:"Time steps",opts:[[15,"Every 15 minutes"],[30,"Every 30 minutes"]]}],defaults:{step:30},from:["select","combobox"],
  props:[["label","text","Required."],["step","minutes",""],["min / max","time","Opening hours."],["format","12h | 24h","Default 12h with AM and PM."]],
  a11y:"Works as a combobox. People can type '1030' or '10:30a' and it understands.",
  guide:"Use 12-hour time with AM and PM. Only show times that can be picked. For appointments, show open times as buttons with the appointment slot picker instead.",
  tokens:x=>[["Menu","{component.select.menu-shadow}",x.st.comp.select.menuShadow],["Chosen row","{color.action.soft}",x.c.secondary]],
  spec:cfg=>{const t=cfg.step==15?["10:00 AM","10:15 AM","10:30 AM","10:45 AM"]:["9:30 AM","10:00 AM","10:30 AM","11:00 AM"];
    return SG("Open",FLD("Pickup time",`<div class="pv-in focus">10:30 AM<span class="chev">${ic("clock")}</span></div><div class="pv-menu">${t.map(x=>`<div class="${x==="10:30 AM"?"sel":""}">${x==="10:30 AM"?ic("check"):""}${x}</div>`).join("")}</div>`,"The pharmacy is open 9 AM to 6 PM."));}});
def({id:"masked",cat:"inputs",level:"Component",name:"Formatted fields",
  desc:"Boxes that help people type things in the right shape, like a phone number, ZIP code, or member ID.",
  slots:[{k:"format",label:"Show the format",opts:[["hint","In the help text"],["label","Next to the label"]]}],defaults:{format:"hint"},from:["field","label-hint"],
  props:[["mask","phone | zip | member-id | ssn-last4 | currency",""],["label","text",""],["value","raw digits","The app stores digits only."]],
  a11y:"Formatting is added as people type, but they can also paste any format. Screen readers hear the format in the hint.",
  guide:"Accept numbers typed any way, with or without dashes or spaces, and fix the format for people. Never ask for a full Social Security number when the last 4 digits will do.",
  tokens:x=>[["Border","{component.field.border}",x.c.input],["Format hint","{color.text.muted}",x.c.mutedFg]],
  spec:cfg=>{const F=(l,v,f,o={})=>cfg.format==="label"?FLD(`${l} <span class="muted" style="font-weight:400">(${f})</span>`,`<div class="pv-in"${o.w?` style="max-width:${o.w}"`:""}>${v}</div>`,o.h):FLD(l,`<div class="pv-in"${o.w?` style="max-width:${o.w}"`:""}>${v}</div>`,o.h||`Like ${f}`);
    return SG("Phone number",F("Phone number","(555) 201-4488","(555) 555-5555"))+SG("ZIP code",F("ZIP code","60601","12345",{w:"8em"}))+SG("Member ID",F("Member ID","NF-448120","NF-000000",{h:"You can find it on the front of your member card."}))+SG("Last 4 of Social Security number",F("Last 4 numbers of your Social Security number","••• •• 4821","1234",{w:"10em",h:"We only need the last 4 numbers."}));}});
def({id:"number",cat:"inputs",level:"Component",name:"Number and money",
  desc:"Boxes for amounts, like how many refills or how much to pay.",
  slots:[{k:"stepper",label:"Plus and minus buttons",opts:[["show","Show them"],["hide","Hide them"]]}],defaults:{stepper:"show"},from:["field","icon-button"],
  props:[["kind","count | currency | percent",""],["min / max","number",""],["step","number",""]],
  a11y:"Uses the number keyboard. Plus and minus buttons have labels, like 'Add one'.",
  guide:"Show the dollar sign outside the box so people do not have to type it. Use plus and minus buttons for small counts. Say the limits in the help text.",
  tokens:x=>[["Border","{component.field.border}",x.c.input],["Buttons","{component.icon-button}",x.c.link]],
  spec:cfg=>SG("A count",FLD("How many 90-day refills?",cfg.stepper==="show"?`<div class="pv-row" style="gap:6px;flex-wrap:nowrap"><span class="pv-ibtn outline">${ic("minus")}</span><div class="pv-in" style="width:4.5em;justify-content:center">2</div><span class="pv-ibtn outline">${ic("plus")}</span></div>`:`<div class="pv-in" style="width:5em">2</div>`,"You can order up to 4."))+SG("Money",FLD("Payment amount",`<div class="pv-in" style="max-width:12em"><span class="muted">$</span>42.50</div>`,"Your balance is $42.50."))});
def({id:"file-upload",cat:"inputs",level:"Composite",name:"File upload",
  desc:"A place to add files, like a photo of a bill or a letter from a doctor.",
  slots:[{k:"style",label:"Style",opts:[["drop","Drop area and button"],["button","Button only"]]}],defaults:{style:"drop"},from:["button","progress","alert","icon-button"],
  props:[["accept","file types","Like PDF, JPG, PNG."],["maxSize","MB",""],["multiple","true | false",""],["onUpload","function",""]],
  a11y:"There is always a real 'Choose a file' button. Dragging is extra, never the only way. Progress and errors are read out.",
  guide:"Say which file types and sizes are OK before people pick a file. On phones, let people take a photo. Show each file with a way to remove it.",
  tokens:x=>[["Drop area border","{component.field.border}",x.c.input],["Progress","{color.action.primary}",x.c.P]],
  spec:cfg=>{const files=`<div class="pv-file">${ic("file")}<span style="flex:1;min-width:0"><b>bill-march.pdf</b><span class="pv-help" style="display:block">1.2 MB · Uploaded</span></span><span class="lnk small">Remove</span></div><div class="pv-file">${ic("file")}<span style="flex:1;min-width:0"><b>letter.jpg</b><span class="pv-prog" style="margin-top:6px"><i style="width:60%"></i></span></span><span class="small muted">60%</span></div>`;
    return SG("Add files",`<div class="pv-stack" style="gap:calc(var(--gap)*.6)"><span class="lb" style="font-weight:var(--label-weight)">Add your bill</span><span class="pv-help">PDF, JPG, or PNG. Up to 10 MB each.</span>${cfg.style==="drop"?`<div class="pv-drop">${ic("upload")}<span>Drag files here, or</span><span class="pv-btn outline">Choose a file</span></div>`:`<div><span class="pv-btn outline">${ic("upload")} Choose a file</span></div>`}${files}</div>`);}});

/* ======================= FORM STRUCTURE ======================= */
def({id:"label-hint",cat:"structure",level:"Primitive",name:"Label and help text",
  desc:"The words above a field that say what to type, and the smaller words that help.",
  slots:[{k:"mark",label:"Mark which fields",opts:[["optional","Mark optional ones"],["required","Mark required ones"]],hint:"Marking optional fields is easier, because most fields are required."}],
  defaults:{mark:"optional"},from:[],
  props:[["for","field id","Connects the label to its field."],["hint","text",""],["optional","true | false",""]],
  a11y:"Labels are always visible, never only inside the box. A red star alone is not enough, so the word is written out.",
  guide:"Write labels as short, plain questions or nouns. Put help text under the label, before the box. Mark the optional fields with the word '(optional)'.",
  tokens:x=>[["Label weight","{component.field.label-weight}",x.st.comp.field.labelWeight],["Help text","{color.text.muted}",x.c.mutedFg],["Help size","{size.text-sm}",x.z.sm+" px"]],
  spec:cfg=>SG("Label, help, and field",cfg.mark==="optional"?FLD("Middle name",`<div class="pv-in"></div>`,"",{opt:"(optional)",hintTop:"Leave it blank if you do not have one."}):FLD(`Last name <span class="muted" style="font-weight:400">(required)</span>`,`<div class="pv-in">Morris</div>`,"",{hintTop:"Use the name on your member card."}))});
def({id:"error-message",cat:"structure",level:"Primitive",name:"Error message",
  desc:"Red words under a field that say what is wrong and how to fix it.",
  slots:[{k:"icon",label:"Warning icon",opts:[["show","Show it"],["hide","Hide it"]]}],defaults:{icon:"show"},from:["icon"],
  props:[["message","text","Say what is wrong and how to fix it."],["for","field id","Read out with the field."]],
  a11y:"Never uses color alone. The icon and the words carry the meaning. The field is marked invalid for screen readers.",
  guide:"Write one short sentence that says how to fix the problem, like 'Enter a ZIP code with 5 numbers.' Do not blame the person. Do not say 'invalid'.",
  tokens:x=>[["Color","{color.status.danger}",x.c.danger],["Weight","600","600"]],
  spec:cfg=>SG("Under a field",`<div class="pv-field err"><span class="lb">ZIP code</span><div class="pv-in" style="max-width:8em">606</div><span class="pv-help">${cfg.icon==="show"?ic("err")+" ":""}Enter a ZIP code with 5 numbers, like 60601.</span></div>`)});
def({id:"fieldset",cat:"structure",level:"Component",name:"Fieldset (question group)",
  desc:"A group of fields that answer one question, like an address.",
  slots:[{k:"legend",label:"Question size",opts:[["h3","Heading size"],["body","Label size"]]}],defaults:{legend:"h3"},from:["label-hint","field"],
  props:[["legend","text","Required. The question for the group."],["hint","text",""]],
  a11y:"Uses a real fieldset and legend so screen readers read the question before each field.",
  guide:"Group fields that belong to one question, like the parts of an address or a date. Write the legend as the question.",
  tokens:x=>[["Legend size",x.cfg.legend==="h3"?"{size.text-h3}":"{size.text-base}",(x.cfg.legend==="h3"?x.z.h3:x.z.base)+" px"],["Space","{space.gap}",x.z.gap+" px"]],
  spec:cfg=>SG("An address",`<div class="pv-stack"><span class="${cfg.legend==="h3"?"h3":"lb"}" style="${cfg.legend==="h3"?"":"font-weight:var(--label-weight)"}">What is your home address?</span>${FLD("Street address",`<div class="pv-in">42 Oak Street</div>`)}${FLD("Apartment or unit",`<div class="pv-in"></div>`,"",{opt:"(optional)"})}<div class="pv-grid2">${FLD("City",`<div class="pv-in">Springfield</div>`)}${FLD("ZIP code",`<div class="pv-in" style="max-width:8em">62704</div>`)}</div></div>`)});
def({id:"error-summary",cat:"structure",level:"Component",name:"Error summary",
  desc:"A box at the top of a form that lists every problem, with links to each one.",
  slots:[{k:"border",label:"Border",type:"num",unit:"px",opts:[[2,"Thin"],[4,"Thick"]]}],defaults:{border:4},from:["error-message","link"],
  props:[["errors","list of {message, fieldId}",""],["title","text","Default: 'There is a problem'."]],
  a11y:"Gets keyboard focus when the form is sent with problems, so screen readers read it first. Each link jumps to the field.",
  guide:"Show the error summary at the top when someone sends a form with problems. Use the same words as the error under each field. Move focus to it.",
  tokens:x=>[["Border","{color.status.danger}",x.c.danger],["Border width","{component.error-summary.border}",x.cfg.border+" px"]],
  spec:()=>`<div class="pv-errsum"><h2 class="h3">There is a problem</h2><ul><li><span class="lnk">Enter a ZIP code with 5 numbers, like 60601.</span></li><li><span class="lnk">The day must be between 1 and 31.</span></li></ul></div>`});

/* ======================= FEEDBACK ======================= */
export const TONES={info:["info","Information"],success:["ok","Success"],warning:["warn","Warning"],danger:["err","Error"]};
def({id:"alert",cat:"feedback",level:"Component",name:"Alert",
  desc:"A message inside the page that tells people something important.",
  slots:[{k:"style",label:"Style",opts:[["soft","Soft color fill"],["outline","White with a colored line"]]}],defaults:{style:"soft"},from:["icon","link"],
  props:[["tone","info | success | warning | danger",""],["title","text",""],["children","text or links",""],["dismissible","true | false","Never for errors."]],
  a11y:"Every tone has its own icon and a hidden word like 'Warning:'. New alerts are announced with a live region.",
  guide:"Use alerts for things people need to know on this page. Start with the most important words. Say what to do next. Do not stack more than two.",
  tokens:x=>[["Info","{color.link}",x.c.link],["Success","{color.status.success}",x.c.success],["Warning","{color.status.warning}",x.c.warning],["Error","{color.status.danger}",x.c.danger]],
  spec:cfg=>{const A=(t,h,b)=>`<div class="pv-alert ${t} ${cfg.style}">${ic(TONES[t][0])}<div class="pv-stack" style="gap:4px"><b>${h}</b><span>${b}</span></div></div>`;
    return A("info","Your plan is changing on January 1.","Read what is new before you pick a doctor.")+A("success","Your payment went through.","We sent a receipt to june@email.com.")+A("warning","Your prescription runs out in 5 days.",`<span class="lnk">Order a refill</span> now so you do not miss a dose.`)+A("danger","We could not save your address.","Check your internet connection and try again.");}});
def({id:"banner",cat:"feedback",level:"Component",name:"Notification banner",
  desc:"A strip across the top of the page for news that affects everyone.",
  slots:[{k:"tone",label:"Color",opts:[["brand","Main color"],["info","Soft"]]}],defaults:{tone:"info"},from:["icon","icon-button","link"],
  props:[["tone","brand | info | warning",""],["message","text",""],["action","link",""],["dismissible","true | false",""]],
  a11y:"Sits in its own region at the top. The close button has a label. Closing it moves focus back to the page.",
  guide:"Use one banner at a time, for news that matters to everyone, like a service outage or open enrollment. Keep it to one sentence and one link.",
  tokens:x=>[["Fill",x.cfg.tone==="brand"?"{color.action.primary}":"{color.action.soft}",x.cfg.tone==="brand"?x.c.P:x.c.secondary],["Words",x.cfg.tone==="brand"?"{color.on-action}":"{color.action.soft-foreground}",x.cfg.tone==="brand"?x.c.onP:x.c.secondaryFg]],
  bleed:true,spec:cfg=>`<div class="pv-banner ${cfg.tone}">${ic("bell")}<span style="flex:1;min-width:0">Open enrollment ends December 7. <span class="lnk" style="color:inherit">Compare plans</span></span><span class="pv-ibtn ghost" style="color:inherit;width:auto;height:auto;padding:2px">${ic("x")}</span></div>${pvBar()}<div class="pv-main"><h1 class="h2">Your account</h1><p class="muted">The banner sits above everything else on the page.</p></div>`});
def({id:"toast",cat:"feedback",level:"Component",name:"Toast",
  desc:"A short message that pops up after an action, like 'Saved'. It can offer Undo.",
  slots:[{k:"duration",label:"Hides after",opts:[[6,"6 seconds"],[10,"10 seconds"],[0,"Stays until closed"]],hint:"Older readers need more time. 10 seconds or more is best."}],defaults:{duration:10},from:["button","icon-button"],
  props:[["message","text",""],["action","{label, onClick}","Like Undo."],["duration","seconds or 0",""]],
  a11y:"Announced politely. It stays while the mouse or keyboard focus is on it. Never the only place important news appears.",
  guide:"Use a toast to confirm something worked. Keep it to a few words. Never put an error or anything people must read in a toast.",
  tokens:x=>[["Fill","{color.text.default}",x.c.foreground],["Hides after","{component.toast.duration}",x.cfg.duration?x.cfg.duration+" s":"never"]],
  spec:cfg=>SG("After saving",`<div class="pv-toast">${ic("ok")}<span>Your address is saved.</span><span class="lnk" style="color:inherit">Undo</span></div>`)+`<p class="small muted">${cfg.duration?`This message hides after ${cfg.duration} seconds.`:"This message stays until people close it."}</p>`});
def({id:"progress",cat:"feedback",level:"Primitive",name:"Progress bar",
  desc:"A bar that fills up to show how much is done.",
  slots:[{k:"height",label:"Thickness",type:"num",unit:"px",opts:[[6,"Thin"],[12,"Thick"]]}],defaults:{height:12},from:[],
  props:[["value","0 to 100",""],["label","text","Always shown, like 'Step 2 of 4'."]],
  a11y:"Uses role progressbar with the value. The words above it say the same thing as the bar.",
  guide:"Always show words with the bar, like 'Step 2 of 4' or '60% uploaded'. For steps with names, use the step list.",
  tokens:x=>[["Fill","{color.action.primary}",x.c.P],["Track","{color.surface.muted}",x.c.muted],["Height","{component.progress.height}",x.cfg.height+" px"]],
  spec:()=>SG("A form",`<div class="pv-stack" style="gap:6px"><div class="pv-row" style="justify-content:space-between"><b>Step 2 of 4</b><span class="muted small">About 3 minutes left</span></div><div class="pv-prog"><i style="width:50%"></i></div></div>`)});
def({id:"spinner",cat:"feedback",level:"Primitive",name:"Spinner",
  desc:"A turning circle that says 'please wait'.",
  slots:[{k:"words",label:"Words next to it",opts:[["yes","Always"],["no","No words"]]}],defaults:{words:"yes"},from:[],
  props:[["label","text","Like 'Loading your plan'."],["size","sm | md | lg",""]],
  a11y:"Has a label read by screen readers. It stops turning for people who turn off motion.",
  guide:"Show a spinner only if waiting takes more than 1 second. Say what is loading. If it takes more than 10 seconds, show a progress bar instead.",
  tokens:x=>[["Color","{color.action.primary}",x.c.P],["Track","{color.surface.muted}",x.c.muted]],
  spec:cfg=>SG("Loading",`<div class="pv-row"><span class="pv-spin"></span>${cfg.words==="yes"?"<span>Loading your plan…</span>":""}</div>`)+SG("In a button",`<span class="pv-btn primary"><span class="pv-spin" style="border-color:rgba(255,255,255,.35);border-top-color:currentColor;width:1.1em;height:1.1em"></span>Saving…</span>`)});
def({id:"skeleton",cat:"feedback",level:"Primitive",name:"Loading placeholder (skeleton)",
  desc:"Gray shapes that show where things will appear while the page loads.",
  slots:[{k:"pulse",label:"Gentle pulse",opts:[["on","On"],["off","Off"]]}],defaults:{pulse:"on"},from:["card"],
  props:[["shape","text | heading | avatar | block",""],["lines","number",""]],
  a11y:"Hidden from screen readers. The page says 'Loading' in words instead. The pulse stops for people who turn off motion.",
  guide:"Use loading shapes when you know the layout of what is coming, like a list of claims. Match the shapes to the real content.",
  tokens:x=>[["Shape","{color.surface.muted}",x.c.muted]],
  spec:cfg=>SG("A card loading",`<div class="pv-card"><span class="pv-sk${cfg.pulse==="on"?" pulse":""}" style="width:45%;height:1.4em"></span><span class="pv-sk${cfg.pulse==="on"?" pulse":""}" style="width:90%"></span><span class="pv-sk${cfg.pulse==="on"?" pulse":""}" style="width:70%"></span><span class="pv-sk${cfg.pulse==="on"?" pulse":""}" style="width:9em;height:var(--control-h)"></span></div>`)});
def({id:"empty-state",cat:"feedback",level:"Component",name:"Empty state",
  desc:"What a page shows when there is nothing there yet, with a next step.",
  slots:[{k:"icon",label:"Picture",opts:[["show","Show an icon"],["hide","Words only"]]}],defaults:{icon:"show"},from:["icon","button"],
  props:[["title","text",""],["body","text",""],["action","button",""]],
  a11y:"The title is a heading. The picture is hidden from screen readers.",
  guide:"Say why the page is empty and what people can do next. Give one main action. Do not use jokes.",
  tokens:x=>[["Icon","{color.text.muted}",x.c.mutedFg]],
  spec:cfg=>`<div class="pv-empty">${cfg.icon==="show"?`<span class="bigic">${ic("pill")}</span>`:""}<h2 class="h3">You have no prescriptions yet</h2><p class="muted">When your doctor sends a prescription to us, it shows up here.</p><span class="pv-btn outline">Transfer a prescription</span></div>`});
def({id:"timeout",cat:"feedback",level:"Composite",name:"Session timeout warning",
  desc:"A message that warns people before they are signed out, so they do not lose their work.",
  slots:[{k:"warn",label:"Warn people",opts:[[1,"1 minute before"],[2,"2 minutes before"],[5,"5 minutes before"]],hint:"Slower readers need time to read the message and act."}],defaults:{warn:5},from:["dialog","button"],
  props:[["timeoutMinutes","number",""],["warnMinutes","number",""],["onStay","function",""],["onSignOut","function",""]],
  a11y:"Moves focus to the message and announces it. One key press keeps people signed in. Required by WCAG 2.2.1 when time runs out.",
  guide:"Warn people before a timeout and let them stay signed in with one click. Save what they typed so nothing is lost if they are signed out.",
  tokens:x=>[["Warn before","{component.timeout.warn}",x.cfg.warn+" min"],["Main button","{component.button.background}",x.c.btnBg]],
  bleed:true,spec:cfg=>`<div class="pv-dim"><div class="pv-dialog"><span class="pv-alert warning soft" style="padding:0;border:none;background:none">${ic("clock")}<b>You will be signed out soon</b></span><p class="pv-stat">${cfg.warn}:00</p><p class="muted">For your safety, we sign you out when you have not done anything for a while. Your answers are saved.</p><div class="acts"><span class="pv-btn outline">Sign out now</span><span class="pv-btn primary">Stay signed in</span></div></div></div>`});

/* ======================= CONTENT ======================= */
def({id:"card",cat:"content",level:"Component",name:"Card",legacy:true,
  desc:"A box that groups things that belong together.",
  slots:[{k:"radius",label:"Corners",type:"radius",opts:[["sm","Small"],["md","Medium"],["lg","Large"]]},{k:"shadow",label:"Shadow",type:"shadow",opts:SHD},{k:"border",label:"Border line",opts:[["on","Show a line"],["off","No line"]]}],
  from:["button","badge","link"],props:[["title","text",""],["children","content",""],["action","one button or link","Only one."],["href","url","Makes the whole card a link."]],
  a11y:"If the whole card is a link, only the title is the link text. The rest is read as a description."});
def({id:"badge",cat:"content",level:"Primitive",name:"Badge and tag",
  desc:"A small label that shows a status, like 'In network' or 'Due soon'.",
  slots:[{k:"shape",label:"Shape",type:"radius",opts:[["sm","Rounded"],["pill","Round ends"]]}],defaults:{shape:"pill"},from:["icon"],
  props:[["tone","neutral | brand | info | success | warning | danger",""],["icon","icon name","Status tones always have an icon."],["children","1 to 3 words",""]],
  a11y:"Color is never the only signal. Status badges have an icon and clear words.",
  guide:"Use badges for short statuses. One to three words. Use the same words for the same status everywhere, like 'Due soon' and never 'Due shortly'.",
  tokens:x=>[["Tag fill","{color.highlight-soft}",x.c.accent],["Tag words","{color.highlight-foreground}",x.c.accentFg],["Shape","{component.badge.shape}",RADII[x.cfg.shape]]],
  spec:()=>SG("Kinds",`<div class="pv-row" style="gap:8px"><span class="pv-badge">New</span><span class="pv-badge brand">Member</span><span class="pv-badge ok">${ic("ok")} In network</span><span class="pv-badge warn">${ic("clock")} Due soon</span><span class="pv-badge bad">${ic("err")} Late</span><span class="pv-badge neutral">Draft</span></div>`)});
def({id:"avatar",cat:"content",level:"Primitive",name:"Avatar",
  desc:"A small picture or initials that stand for a person, like your doctor.",
  slots:[{k:"shape",label:"Shape",type:"radius",opts:[["pill","Circle"],["md","Rounded square"]]}],defaults:{shape:"pill"},from:[],
  props:[["name","text","Required. Used for initials and the label."],["src","image url",""],["size","sm | md | lg",""]],
  a11y:"Shows the person's name as text nearby. The picture has empty alt text when the name is already shown.",
  guide:"Show a photo when you have one. Otherwise show initials. Always show the name next to it.",
  tokens:x=>[["Fill","{color.action.soft}",x.c.secondary],["Initials","{color.action.soft-foreground}",x.c.secondaryFg]],
  spec:()=>SG("Sizes",`<div class="pv-row"><span class="pv-av" style="font-size:.8em">JM</span><span class="pv-av">JM</span><span class="pv-av" style="font-size:1.35em">JM</span></div>`)+SG("With a name",`<div class="pv-row" style="gap:.7em"><span class="pv-av">AP</span><span><b>Dr. Anita Patel</b><span class="pv-help" style="display:block">Family medicine</span></span></div>`)});
def({id:"accordion",cat:"content",level:"Component",name:"Accordion",
  desc:"A list of headings that open to show more, like questions and answers.",
  slots:[{k:"icon",label:"Icon",opts:[["chevron","Arrow"],["plus","Plus and minus"]]}],defaults:{icon:"chevron"},from:["icon"],
  props:[["items","list of {title, content}",""],["multiple","true | false","Can more than one be open?"],["defaultOpen","index",""]],
  a11y:"Each heading is a button inside a heading tag. It says 'expanded' or 'collapsed'.",
  guide:"Use an accordion to hide details most people do not need, like frequently asked questions. Never hide the most important information in one.",
  tokens:x=>[["Divider","{color.border.default}",x.c.border],["Icon","{color.link}",x.c.link]],
  spec:cfg=>{const o=cfg.icon==="plus"?ic("minus"):ic("up"),c=cfg.icon==="plus"?ic("plus"):ic("down");
    return `<div class="pv-acc"><div class="it open"><div class="hd"><span>What is a deductible?</span>${o}</div><div class="bd">It is the amount you pay for care each year before your plan starts to pay.</div></div><div class="it"><div class="hd"><span>How do I get a new member card?</span>${c}</div></div><div class="it"><div class="hd"><span>Can I see a doctor out of network?</span>${c}</div></div></div>`;}});
def({id:"summary-list",cat:"content",level:"Component",name:"Summary list",
  desc:"Rows of labels and answers, with a Change link. Use it on review pages.",
  slots:[{k:"lines",label:"Lines between rows",opts:[["on","Show lines"],["off","No lines"]]}],defaults:{lines:"on"},from:["link"],
  props:[["rows","list of {key, value, action}",""]],
  a11y:"Uses a description list. The Change links have hidden words, like 'Change phone number'.",
  guide:"Use a summary list to show answers before people submit. Give each row its own Change link that goes back to that question.",
  tokens:x=>[["Line","{color.border.default}",x.c.border],["Label weight","700","700"]],
  spec:cfg=>`<div class="pv-sl${cfg.lines==="on"?" lined":""}">${[["Name","June Morris"],["Date of birth","March 27, 1952"],["Phone","(555) 201-4488"],["Address","42 Oak Street<br>Springfield, IL 62704"]].map(([k,v])=>`<div class="r"><b>${k}</b><span>${v}</span><span class="lnk">Change</span></div>`).join("")}</div>`});
def({id:"callout",cat:"content",level:"Component",name:"Inset text and warning",
  desc:"Text set apart from the page, for a key point or a safety warning.",
  slots:[{k:"weight",label:"Side line",type:"num",unit:"px",opts:[[4,"Thin"],[8,"Thick"]]}],defaults:{weight:4},from:["icon"],
  props:[["kind","inset | warning | important",""],["title","text",""]],
  a11y:"Warnings start with the hidden word 'Important:'. They never rely on color alone.",
  guide:"Use inset text for one key point. Use the warning callout for safety information, like when to call 911.",
  tokens:x=>[["Inset line","{color.border.strong}",x.c.input],["Warning fill","{color.status.warning-soft}",x.c.warningSoft]],
  spec:()=>`<div class="pv-inset">It can take up to 10 days for a new card to arrive in the mail.</div><div class="pv-warncall"><div class="hd">${ic("warn")} Important</div><p>If you have chest pain or trouble breathing, call 911 right away.</p></div>`});
def({id:"divider",cat:"content",level:"Primitive",name:"Divider",
  desc:"A thin line that separates parts of a page.",
  slots:[{k:"weight",label:"Line weight",type:"num",unit:"px",opts:[[1,"Thin"],[2,"Medium"]]}],defaults:{weight:1},from:[],
  props:[["label","text","Optional, like 'or'."],["decorative","true | false",""]],
  a11y:"Decorative lines are hidden from screen readers.",
  guide:"Use space before you use a line. Add a divider only when two parts of a page could be confused.",
  tokens:x=>[["Color","{color.border.default}",x.c.border]],
  spec:()=>SG("Plain",`<div class="pv-hr"></div>`)+SG("With a word",`<div class="pv-hrl"><span>or</span></div>`)});
def({id:"tooltip",cat:"content",level:"Primitive",name:"Tooltip",
  desc:"A small note that appears when people point at or focus on something.",
  slots:[{k:"tone",label:"Color",opts:[["dark","Dark"],["light","Light"]]}],defaults:{tone:"dark"},from:[],
  props:[["content","short text",""],["side","top | bottom | left | right",""]],
  a11y:"Shows on keyboard focus too, not only mouse over. Esc closes it. It stays while the mouse is over it (WCAG 1.4.13).",
  guide:"Use tooltips only for short names of icons. Never put important information in a tooltip, because people on phones cannot see it. Use the help drawer for explanations.",
  tokens:x=>[["Fill",x.cfg.tone==="dark"?"{color.text.default}":"{color.surface.card}",x.cfg.tone==="dark"?x.c.foreground:"#FFFFFF"]],
  spec:cfg=>`<div class="pv-tip" style="--tip-bg:${cfg.tone==="dark"?"var(--foreground)":"var(--card)"};--tip-fg:${cfg.tone==="dark"?"var(--background)":"var(--foreground)"}"><span class="pv-bubble"${cfg.tone==="light"?' style="border:1px solid var(--border)"':""}>Print your card</span><span class="pv-ibtn outline focus">${ic("printer")}</span></div>`});
def({id:"popover",cat:"content",level:"Component",name:"Popover",
  desc:"A small box that opens next to a button, with a bit more information or a few actions.",
  slots:[],from:["card","link","button"],
  props:[["trigger","button",""],["title","text",""],["children","content",""]],
  a11y:"Opens on click, not mouse over. Focus moves into it. Esc closes it and returns focus to the button.",
  guide:"Use a popover for a short explanation or a few actions tied to one button. For longer help, use the help drawer.",
  tokens:x=>[["Shadow","{component.select.menu-shadow}",x.st.comp.select.menuShadow],["Corners","{component.field.radius}",rad(x.st,x.st.comp.field.radius)+" px"]],
  spec:()=>`<div class="pv-stack" style="gap:8px;align-items:flex-start"><span class="pv-btn outline">${ic("info")} What does this cost?</span><div class="pv-menu" style="padding:calc(var(--gap)*.8);gap:6px;max-width:320px;display:flex"><b>Your cost: $20</b><span class="small">This is your copay for a visit with a specialist in your network.</span><span class="lnk small">See all costs</span></div></div>`});
def({id:"icon",cat:"content",level:"Primitive",name:"Icon",
  desc:"Small pictures that help people scan, like a phone or a calendar.",
  slots:[{k:"stroke",label:"Line thickness",type:"num",unit:"",opts:[[1.5,"Thin"],[2,"Medium"],[2.5,"Bold"]]}],defaults:{stroke:2},from:[],
  props:[["name","icon name",""],["label","text","Only when the icon stands alone."],["size","inherits text size",""]],
  a11y:"Icons next to words are hidden from screen readers. Icons that stand alone have a label.",
  guide:"Use icons next to words, not instead of them. Use the same icon for the same idea everywhere.",
  tokens:x=>[["Line thickness","{component.icon.stroke}",x.cfg.stroke],["Color","currentColor","follows the text"]],
  spec:()=>`<div class="pv-icons">${["home","user","phone","cal","clock","pill","heart","flask","pin","card","file","msg","search","bell","help","lock","dl","printer","shield","star"].map(n=>`<span>${ic(n)}<small>${n}</small></span>`).join("")}</div>`});

/* ======================= NAVIGATION ======================= */
def({id:"header",cat:"navigation",level:"Composite",name:"Header",
  desc:"The strip at the top of every page, with the logo, main links, and account.",
  slots:[{k:"style",label:"Background",opts:[["white","White"],["brand","Main color"]]},{k:"phone",label:"Show the phone number",opts:[["yes","Yes"],["no","No"]],hint:"Many older members prefer to call."}],defaults:{style:"white",phone:"yes"},from:["link","search","menu","skip-link"],
  props:[["logo","brand",""],["links","list","Up to 5."],["account","user",""],["phone","text",""]],
  a11y:"Starts with a skip link. The main links sit in a nav landmark. On phones, the menu button says 'Menu' in words.",
  guide:"Use the same header on every page. Keep five main links or fewer. On consumer screens, show the phone number.",
  tokens:x=>[["Fill",x.cfg.style==="brand"?"{color.action.primary}":"{color.surface.card}",x.cfg.style==="brand"?x.c.P:"#FFFFFF"],["Links",x.cfg.style==="brand"?"{color.on-action}":"{color.text.default}",x.cfg.style==="brand"?x.c.onP:x.c.foreground]],
  bleed:true,spec:cfg=>`<div class="pv-hdr ${cfg.style}"><div class="pv-logo"><i></i>${esc(x_brand())}</div><div class="nv"><span class="on">My plan</span><span>Find care</span><span>Claims</span><span>Pharmacy</span></div><div class="pv-row" style="gap:12px;margin-left:auto">${cfg.phone==="yes"?`<span class="ph">${ic("phone")} 1-800-555-0142</span>`:""}<span class="pv-av" style="font-size:.8em">JM</span></div><span class="mb">${ic("menu")} Menu</span></div><div class="pv-main"><h1 class="h2">My plan</h1></div>`});
def({id:"footer",cat:"navigation",level:"Composite",name:"Footer",
  desc:"The bottom of every page, with help, legal links, and the phone number.",
  slots:[{k:"style",label:"Background",opts:[["light","Light"],["dark","Dark"]]}],defaults:{style:"light"},from:["link"],
  props:[["columns","list of link groups",""],["phone","text",""],["legal","links",""]],
  a11y:"Sits in a footer landmark. Link groups have headings.",
  guide:"Put help, contact, privacy, and nondiscrimination notices in the footer. Show the phone number and hours.",
  tokens:x=>[["Fill",x.cfg.style==="dark"?"{color.text.default}":"{color.surface.muted}",x.cfg.style==="dark"?x.c.foreground:x.c.muted]],
  bleed:true,spec:cfg=>`<div class="pv-ftr ${cfg.style}"><div class="cols"><div><b>Get help</b><span>Call 1-800-555-0142</span><span>Every day, 8 AM to 8 PM</span><span>TTY 711</span></div><div><b>Your plan</b><span>Plan documents</span><span>Find a doctor</span><span>Drug list</span></div><div><b>About</b><span>Privacy</span><span>Nondiscrimination notice</span><span>Language help</span></div></div><div class="legal">© 2026 ${esc(x_brand())}. All rights reserved.</div></div>`});
def({id:"side-nav",cat:"navigation",level:"Component",name:"Side navigation",
  desc:"A list of links down the side of the page, for moving around a section.",
  slots:[{k:"current",label:"Current page style",opts:[["fill","Soft fill"],["bar","Side line"]]}],defaults:{current:"fill"},from:["link"],
  props:[["items","list with nesting","Two levels at most."],["current","id",""]],
  a11y:"The current page is marked with aria-current and is not shown by color alone.",
  guide:"Use side navigation for sections with more than five pages, mostly on employee screens. Keep two levels at most.",
  tokens:x=>[["Current fill","{color.action.soft}",x.c.secondary],["Current words","{color.action.soft-foreground}",x.c.secondaryFg]],
  spec:cfg=>`<div class="pv-snav ${cfg.current}"><span>Overview</span><span class="on">Claims</span><span class="sub">Medical</span><span class="sub">Pharmacy</span><span>Payments</span><span>Documents</span></div>`});
def({id:"tabs",cat:"navigation",level:"Component",name:"Tabs",
  desc:"A row of labels that switch between views on the same page.",
  slots:[{k:"style",label:"Style",opts:[["line","Underline"],["box","Boxes"]]}],defaults:{style:"line"},from:["badge"],
  props:[["tabs","list of {label, count}","2 to 6."],["value","id",""]],
  a11y:"Follows the ARIA tabs pattern. Arrow keys move between tabs. The chosen tab has a thick line, not only a color.",
  guide:"Use tabs to switch between related views, like Medical and Pharmacy claims. Do not use tabs for steps in a process.",
  tokens:x=>[["Chosen line","{color.action.primary}",x.c.P],["Chosen words","{color.text.default}",x.c.foreground]],
  spec:cfg=>`<div class="pv-tabs ${cfg.style}"><span class="on">Medical <span class="pv-badge neutral small">12</span></span><span>Pharmacy <span class="pv-badge neutral small">4</span></span><span>Dental</span></div><div style="padding-top:var(--gap)" class="muted">Your medical claims show here.</div>`});
def({id:"breadcrumbs",cat:"navigation",level:"Component",name:"Breadcrumbs",
  desc:"A trail of links that shows where you are, like Home, then My plan, then Claims.",
  slots:[{k:"sep",label:"Between links",opts:[["chevron","Arrow"],["slash","Slash"]]}],defaults:{sep:"chevron"},from:["link"],
  props:[["items","list of links",""]],
  a11y:"Sits in a nav landmark named 'Breadcrumb'. The last item is the current page and is not a link.",
  guide:"Use breadcrumbs on pages that are three or more levels deep. On phones, show only the link one level up.",
  tokens:x=>[["Links","{color.link}",x.c.link],["Separator","{color.text.muted}",x.c.mutedFg]],
  spec:cfg=>{const s=cfg.sep==="slash"?`<span class="muted">/</span>`:`<span class="muted">${ic("right")}</span>`;return `<div class="pv-row" style="gap:.5em"><span class="lnk">Home</span>${s}<span class="lnk">My plan</span>${s}<span>Claims</span></div>`;}});
def({id:"pagination",cat:"navigation",level:"Component",name:"Pagination",
  desc:"Links to move between pages of a long list.",
  slots:[{k:"style",label:"Style",opts:[["numbers","Page numbers"],["simple","Previous and Next only"]]}],defaults:{style:"numbers"},from:["button","link"],
  props:[["page","number",""],["total","number",""],["pageSize","number",""]],
  a11y:"Sits in a nav landmark. The current page is marked with aria-current. Previous and Next say it in words.",
  guide:"Say how many items there are, like 'Showing 1 to 20 of 240'. Always spell out Previous and Next.",
  tokens:x=>[["Current page","{color.action.primary}",x.c.P],["Size","{size.control}",x.z.control+" px"]],
  spec:cfg=>`<div class="pv-stack" style="gap:8px"><span class="small muted">Showing 1 to 20 of 240 claims</span><div class="pv-pag">${cfg.style==="numbers"?`<span class="pv-btn ghost">${ic("left")} Previous</span><span class="pg on">1</span><span class="pg">2</span><span class="pg">3</span><span class="muted gap">…</span><span class="pg">12</span><span class="pv-btn ghost">Next ${ic("right")}</span>`:`<span class="pv-btn outline">${ic("left")} Previous</span><span class="pv-btn outline">Next ${ic("right")}</span>`}</div></div>`});
def({id:"stepper",cat:"navigation",level:"Composite",name:"Step list",
  desc:"Shows the steps of a task, which ones are done, and which one is next.",
  slots:[{k:"dir",label:"Direction",opts:[["row","Across"],["col","Down"]]}],defaults:{dir:"col"},from:["progress","icon","link"],
  props:[["steps","list of {label, status}",""],["current","index",""]],
  a11y:"Each step says its status in words, like 'done' or 'current step'. Done steps can be links back.",
  guide:"Use a step list for tasks with 3 to 6 named steps, like signing up. Let people go back to finished steps. Save their answers as they go.",
  tokens:x=>[["Done","{color.status.success}",x.c.success],["Current","{color.action.primary}",x.c.P],["Line","{color.border.default}",x.c.border]],
  spec:cfg=>`<div class="pv-steps ${cfg.dir}">${[["done","Your details"],["done","Your plan"],["cur","Your doctor"],["","Review and send"]].map(([s,l],i)=>`<div class="st ${s}"><span class="n">${s==="done"?ic("check"):i+1}</span><span><b>${l}</b><span class="pv-help" style="display:block">${s==="done"?"Done":s==="cur"?"You are here":"Not started"}</span></span></div>`).join("")}</div>`});
def({id:"skip-link",cat:"navigation",level:"Primitive",name:"Skip link",
  desc:"A hidden link that appears when people use the Tab key. It jumps past the header.",
  slots:[],from:["link"],props:[["target","id","Usually main."]],
  a11y:"Required for keyboard users (WCAG 2.4.1). It is the first thing on every page.",
  guide:"Put a skip link at the very top of every page. It shows only when it has keyboard focus.",
  tokens:x=>[["Fill","{color.action.primary}",x.c.P],["Words","{color.on-action}",x.c.onP]],
  bleed:true,spec:()=>`<div style="position:relative"><span class="pv-skip">Skip to main content</span>${pvBar()}<div class="pv-main"><p class="muted">Press Tab on any page and this link shows first.</p></div></div>`});
def({id:"menu",cat:"navigation",level:"Component",name:"Menu",
  desc:"A list of actions that opens from a button, like Edit, Print, or Delete.",
  slots:[],from:["button","icon","divider"],
  props:[["trigger","button",""],["items","list of {label, icon, danger}",""]],
  a11y:"Follows the ARIA menu button pattern. Arrow keys move through items. Esc closes it.",
  guide:"Use a menu for extra actions. Put the most used action first and anything that deletes last, in red, after a line.",
  tokens:x=>[["Shadow","{component.select.menu-shadow}",x.st.comp.select.menuShadow],["Delete","{color.status.danger}",x.c.danger]],
  spec:()=>`<div class="pv-stack" style="gap:8px;align-items:flex-start"><span class="pv-btn outline">Actions ${ic("down")}</span><div class="pv-menu" style="min-width:220px"><div>${ic("edit")} Edit</div><div class="sel">${ic("printer")} Print</div><div>${ic("dl")} Download</div><div class="pv-hr" style="min-height:1px;height:1px;padding:0;margin:4px 0"></div><div style="color:var(--destructive-text)">${ic("trash")} Delete</div></div></div>`});

/* ======================= OVERLAYS ======================= */
def({id:"dialog",cat:"overlays",level:"Composite",name:"Pop-up (dialog)",legacy:true,
  desc:"A small window that asks a question before going on.",
  slots:[{k:"radius",label:"Corners",type:"radius",opts:[["md","Medium"],["lg","Large"]]},{k:"overlay",label:"Dark layer behind it",opts:[[40,"Light"],[50,"Medium"],[60,"Dark"],[70,"Darker"]],hint:"This helps people see that the rest of the page is paused."},{k:"order",label:"Button order",opts:[["end","Main button on the right"],["start","Main button on the left"]]}],
  from:["button","icon-button"],props:[["title","question",""],["children","content",""],["primaryAction","button","Repeats the action."],["onClose","function",""]],
  a11y:"Focus moves into the dialog and stays there. Esc closes it. Focus returns to the button that opened it."});
def({id:"drawer",cat:"overlays",level:"Composite",name:"Drawer",
  desc:"A panel that slides in from the side, for a form or details without leaving the page.",
  slots:[{k:"side",label:"Side",opts:[["right","Right"],["left","Left"]]},{k:"width",label:"Width",opts:[["narrow","Narrow"],["wide","Wide"]]}],defaults:{side:"right",width:"narrow"},from:["dialog","button","icon-button"],
  props:[["title","text",""],["children","content",""],["footer","buttons",""],["side","right | left",""]],
  a11y:"Works like a dialog. Focus moves in and stays in. Esc closes it. On phones it fills the screen.",
  guide:"Use a drawer for a short task or details about one item, like editing one claim. Use a full page for anything long.",
  tokens:x=>[["Dark layer","{component.dialog.overlay}",x.st.comp.dialog.overlay+"%"],["Fill","{color.surface.card}","#FFFFFF"]],
  bleed:true,spec:cfg=>`<div class="pv-dim" style="justify-content:${cfg.side==="right"?"flex-end":"flex-start"};align-items:stretch;padding:0;min-height:420px"><div class="pv-drawer" style="width:${cfg.width==="wide"?"78%":"62%"}"><div class="hd"><h2 class="h3">Claim R&#8209;20411</h2><span class="pv-ibtn ghost">${ic("x")}</span></div><div class="bd">${FLD("Status",`<div class="pv-in">Waiting${ic("down","chev")}</div>`)}${FLD("Note",`<div class="pv-in" style="height:6em;align-items:flex-start;padding-top:10px">Called member on 9/23.</div>`)}</div><div class="ft"><span class="pv-btn outline">Cancel</span><span class="pv-btn primary">Save</span></div></div></div>`});
def({id:"help-drawer",cat:"overlays",level:"Composite",name:"Help drawer",
  desc:"A panel that explains a hard word or rule in plain words, without leaving the page.",
  slots:[],from:["drawer","link"],
  props:[["term","text","The word people click."],["title","text",""],["children","content",""]],
  a11y:"The help link says what it opens, like 'What is a deductible? Opens help.'",
  guide:"Use a help drawer for insurance words people may not know, like deductible or prior authorization. Explain them in one or two short paragraphs, with an example.",
  tokens:x=>[["Link style","dotted underline",x.c.link]],
  bleed:true,spec:()=>`<div class="pv-hdwrap"><div class="pv-main" style="flex:1"><h1 class="h3">Your costs</h1><p>You have met <b>$600</b> of your <span class="pv-term">deductible</span>.</p></div><div class="pv-drawer"><div class="hd"><h2 class="h3">What is a deductible?</h2><span class="pv-ibtn ghost">${ic("x")}</span></div><div class="bd"><p>A deductible is the amount you pay for care each year before your plan starts to pay.</p><p class="muted">For example, if your deductible is $1,000, you pay the first $1,000 of your care. After that, you pay less.</p></div></div></div>`});

/* ======================= DATA ======================= */
def({id:"data-table",cat:"data",level:"Composite",name:"Data table",
  desc:"A table for lots of rows, with sorting, filters, row picking, and pages. Most used on employee screens.",
  slots:[{k:"stripes",label:"Striped rows",opts:[["on","On"],["off","Off"]]},{k:"header",label:"Header row",opts:[["plain","Plain"],["tinted","Tinted"]]}],defaults:{stripes:"off",header:"tinted"},from:["checkbox","filter-chips","search","pagination","badge","menu"],
  props:[["columns","list of {key, label, sortable, align}",""],["rows","list",""],["selectable","true | false",""],["density","inherits screen type","Compact on employee screens."],["onSort","function",""],["stickyHeader","true | false",""]],
  a11y:"Uses a real table with column headers. Sort buttons say the sort order. Picking rows tells screen readers how many are picked. Scrolls sideways on phones without breaking the page.",
  guide:"Use a data table to compare many rows. Right-align numbers and money. Let people sort and filter. On phones, show a list of cards instead when there are more than 4 columns.",
  tokens:x=>[["Row height","{size.control}",x.z.control+" px"],["Chosen row","{color.action.soft}",x.c.secondary],["Header fill",x.cfg.header==="tinted"?"{color.surface.muted}":"none",x.cfg.header==="tinted"?x.c.muted:"none"]],
  bleed:true,spec:cfg=>{const rows=[["R-20417","Morris, June","Address change","Today","warn","Waiting","$0.00"],["R-20416","Patel, Arun","New card","Today","ok","Done","$0.00"],["R-20411","Lee, Grace","Billing question","Sep 23","bad","Late","$142.18"],["R-20409","Ortiz, Sam","Address change","Sep 23","ok","Done","$0.00"],["R-20402","Brooks, Ann","Plan change","Sep 22","warn","Waiting","$38.00"]];
    return `<div class="pv-main"><div class="pv-row" style="justify-content:space-between"><h2 class="h3">Member requests</h2><span class="pv-btn primary">New request</span></div>
    <div class="pv-row"><div class="pv-in" style="flex:1 1 200px">${ic("search")}<span class="ph">Search requests</span></div><span class="pv-chip on">${ic("check")} Waiting</span><span class="pv-chip">Late</span><span class="lnk small">Clear all</span></div>
    <div class="pv-row small" style="gap:8px"><b>1 picked</b><span class="lnk">Assign to me</span><span class="lnk">Export</span></div>
    <div class="pv-card" style="padding:0;overflow-x:auto"><table class="pv-table dt${cfg.stripes==="on"?" striped":""}${cfg.header==="tinted"?" tinted":""}"><thead><tr><th style="width:1%"><span class="pv-cb" style="font-size:.8em"></span></th><th>ID ${ic("sort")}</th><th>Member ${ic("down")}</th><th>Request</th><th>Due</th><th>Status</th><th class="num">Balance</th><th></th></tr></thead><tbody>
    ${rows.map((r,i)=>`<tr${i===2?' class="sel"':""}><td><span class="pv-cb${i===2?" on":""}" style="font-size:.8em">${i===2?ic("check"):""}</span></td><td><span class="lnk">${r[0]}</span></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="pv-badge ${r[4]}">${r[5]}</span></td><td class="num">${r[6]}</td><td>${ic("more")}</td></tr>`).join("")}</tbody></table></div>
    <div class="pv-row" style="justify-content:space-between"><span class="small muted">Showing 1 to 5 of 240</span><div class="pv-pag"><span class="pg on">1</span><span class="pg">2</span><span class="pg">3</span><span class="pv-btn ghost">Next ${ic("right")}</span></div></div></div>`;}});
def({id:"list",cat:"data",level:"Component",name:"List",
  desc:"A simple list of items, like recent claims, each with a link to more.",
  slots:[{k:"lines",label:"Lines between items",opts:[["on","Show lines"],["off","No lines"]]}],defaults:{lines:"on"},from:["icon","badge","link"],
  props:[["items","list of {title, meta, status, href}",""]],
  a11y:"Uses a real list. Each row has one link, on the title, so screen readers do not hear it twice.",
  guide:"Use a list for a few items people scan, like recent claims. On phones, use a list instead of a wide table.",
  tokens:x=>[["Line","{color.border.default}",x.c.border],["Icon fill","{color.action.soft}",x.c.secondary]],
  spec:cfg=>`<div class="pv-list${cfg.lines==="on"?" lined":""}">${[["file","Office visit, Dr. Patel","Sep 12 · You owe $20","ok","Paid"],["flask","Lab work","Sep 3 · Processing","warn","In review"],["pill","Metformin 500 mg","Aug 29 · You paid $4","ok","Paid"]].map(([i,t,m,b,bl])=>`<div class="li"><span class="lic">${ic(i)}</span><span style="flex:1;min-width:0"><span class="lnk" style="display:block">${t}</span><span class="pv-help">${m}</span></span><span class="pv-badge ${b}">${bl}</span>${ic("right")}</div>`).join("")}</div>`});
def({id:"filter-chips",cat:"data",level:"Component",name:"Filter chips",
  desc:"Small buttons that turn filters on and off, like 'In network' or 'Accepting new patients'.",
  slots:[{k:"shape",label:"Shape",type:"radius",opts:[["md","Rounded"],["pill","Round ends"]]}],defaults:{shape:"pill"},from:["button","icon"],
  props:[["options","list",""],["selected","list",""],["onClear","function","Shows 'Clear all'."]],
  a11y:"Each chip is a toggle button that says 'pressed' when on. A check mark shows it is on, not only color.",
  guide:"Use filter chips for 2 to 8 common filters above a list. Show how many results match. Always offer 'Clear all'.",
  tokens:x=>[["On fill","{color.action.soft}",x.c.secondary],["On line","{color.link}",x.c.link],["Height","{size.control} x 0.8",Math.round(x.z.control*.8)+" px"]],
  spec:()=>`<div class="pv-row" style="gap:8px"><span class="pv-chip on">${ic("check")} In network</span><span class="pv-chip on">${ic("check")} Accepting new patients</span><span class="pv-chip">Speaks Spanish</span><span class="pv-chip">Video visits</span><span class="lnk small">Clear all</span></div><p class="small muted">32 doctors match.</p>`});
def({id:"chart",cat:"data",level:"Composite",name:"Chart",
  desc:"Simple bar and line charts, like costs by month.",
  slots:[{k:"labels",label:"Number labels",opts:[["last","Only the latest"],["all","On every bar"]]}],defaults:{labels:"last"},from:["card"],
  props:[["type","bar | line",""],["data","list of {label, value}",""],["title","text","Required."],["tableView","true","Every chart has a table view."]],
  a11y:"Every chart has a title, a short summary in words, and a table view. Hovering or focusing a bar shows its value. One series uses one color, so color never carries meaning alone.",
  guide:"Say the main point in the chart title, like 'Your costs went down in August.' Use one color for one series. Always offer a table view. Never use two y-axes.",
  tokens:x=>[["Bars","{color.action.primary}",x.c.P],["Grid","{color.border.default}",x.c.border],["Words","{color.text.muted}",x.c.mutedFg]],
  spec:cfg=>{const d=[["Apr",120],["May",86],["Jun",142],["Jul",64],["Aug",38],["Sep",52]],W=420,H=200,pl=34,pb=26,pt=14,mx=160,bw=36,step=(W-pl-8)/d.length;
    const y=v=>pt+(H-pt-pb)*(1-v/mx);let g="";[0,40,80,120,160].forEach(v=>{g+=`<line x1="${pl}" x2="${W-4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)" stroke-width="1"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted-foreground)">$${v}</text>`;});
    const bars=d.map(([m,v],i)=>{const x=pl+step*i+(step-bw)/2,top=y(v),b=y(0),r=4;return `<g><title>${m}: $${v}</title><path d="M${x},${b} V${top+r} Q${x},${top} ${x+r},${top} H${x+bw-r} Q${x+bw},${top} ${x+bw},${top+r} V${b} Z" fill="var(--primary-edge)"/>${cfg.labels==="all"||i===d.length-1?`<text x="${x+bw/2}" y="${top-5}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--foreground)">$${v}</text>`:""}<text x="${x+bw/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">${m}</text></g>`;}).join("");
    return `<div class="pv-card"><h3 class="h3">Your costs went down this summer</h3><p class="small muted">What you paid each month, April to September.</p><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Bar chart of monthly costs. Highest in June at $142, lowest in August at $38.">${g}<line x1="${pl}" x2="${W-4}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted-foreground)" stroke-width="1"/>${bars}</svg><span class="lnk small">Show as a table</span></div>`;}});

/* ======================= LAYOUT ======================= */
def({id:"stack",cat:"layout",level:"Primitive",name:"Stack",
  desc:"Puts things in a column or row with even space between them.",
  slots:[],from:[],props:[["direction","column | row",""],["gap","xs | sm | md | lg | xl","Always a spacing token."],["align","start | center | end | stretch",""],["wrap","true | false",""]],
  a11y:"Only changes layout. It never changes the reading order.",
  guide:"Use Stack for all spacing between things. Never add margins by hand. Pick the gap from the spacing tokens.",
  tokens:x=>[["Gap md","{space.gap}",x.z.gap+" px"],["Gap sm","{space.gap} x 0.5",Math.round(x.z.gap/2)+" px"],["Gap lg","{space.gap} x 1.5",Math.round(x.z.gap*1.5)+" px"]],
  spec:()=>SG("Column",`<div class="pv-stack pv-demo">${"<i></i>".repeat(3)}</div>`)+SG("Row",`<div class="pv-row pv-demo">${"<i style='width:70px'></i>".repeat(4)}</div>`)});
def({id:"grid",cat:"layout",level:"Primitive",name:"Grid",
  desc:"Lines up content in columns that change with the screen size.",
  slots:[{k:"cols",label:"Columns on a computer",opts:[[12,"12"],[8,"8"]]}],defaults:{cols:12},from:["stack"],
  props:[["columns","responsive number","Like {phone: 4, computer: 12}."],["gap","spacing token",""]],
  a11y:"Only changes layout. The reading order stays the same as the code order.",
  guide:"Use the grid for page layouts. Use 4 columns on phones and 12 on computers. Cards should span whole columns.",
  tokens:x=>[["Columns","{layout.columns}",x.cfg.cols],["Gutter","{space.gap}",x.z.gap+" px"]],
  spec:cfg=>`<div class="pv-gridd" style="grid-template-columns:repeat(${S.ui.vp==="phone"?4:cfg.cols},minmax(0,1fr))">${"<i></i>".repeat(S.ui.vp==="phone"?4:cfg.cols)}</div><div class="pv-grid2" style="margin-top:var(--gap)"><div class="pv-card">Half width</div><div class="pv-card">Half width</div></div>`});
def({id:"container",cat:"layout",level:"Primitive",name:"Container",
  desc:"Keeps a page from getting too wide, so lines of text are easy to read.",
  slots:[{k:"reading",label:"Reading width",opts:[[640,"Narrow"],[720,"Medium"],[800,"Wide"]]}],defaults:{reading:720},from:[],
  props:[["size","reading | page | full",""]],
  a11y:"Keeps lines near 65 characters, which is easier to read. Text can still grow to 200% without scrolling sideways.",
  guide:"Put text-heavy pages in the reading container. Put dashboards and tables in the page container.",
  tokens:x=>[["Reading width","{layout.container.reading}",x.cfg.reading+" px"],["Page width","{layout.container.page}","1200 px"],["Side space","{space.inset}",x.z.pad+" px"]],
  spec:cfg=>`<div class="pv-cont"><div class="w" style="max-width:${cfg.reading/10}%;"><b class="small">Reading · ${cfg.reading} px</b></div><div class="w" style="max-width:100%"><b class="small">Page · 1200 px</b></div></div><p class="small muted">Lines of text stay short enough to read easily, even on a big screen.</p>`});

/* ======================= HEALTHCARE ======================= */
def({id:"member-card",cat:"health",level:"Healthcare",name:"Member ID card",
  desc:"A digital copy of the member's insurance card.",
  slots:[{k:"style",label:"Top of the card",opts:[["band","Main color band"],["plain","White"]]}],defaults:{style:"band"},from:["card","button","summary-list"],
  props:[["member","{name, id, group, plan}",""],["rx","{bin, pcn, group}",""],["phone","text",""]],
  a11y:"All card details are real text, not a picture, so they can be read out and made bigger.",
  guide:"Show the member card as text people can read and zoom, with Print and Download. Put the member ID in large type. Show the phone numbers from the back of the card.",
  tokens:x=>[["Band",x.cfg.style==="band"?"{color.action.primary}":"none",x.cfg.style==="band"?x.c.P:"none"],["ID size","{size.text-h2}",x.z.h2+" px"]],
  spec:cfg=>`<div class="pv-idcard ${cfg.style}"><div class="band"><div class="pv-logo"><i></i>${esc(x_brand())}</div><span class="small">Gold Plus HMO</span></div><div class="body"><span class="small muted">Member</span><b>June A. Morris</b><span class="small muted">Member ID</span><span class="pv-stat">NF-448120</span><div class="pv-grid3 small"><span><span class="muted">Group</span><br>40218</span><span><span class="muted">Rx BIN</span><br>610014</span><span><span class="muted">Rx PCN</span><br>MEDDPRIME</span></div><span class="small">Member services: <b>1-800-555-0142</b> (TTY 711)</span></div></div><div class="pv-row acts" style="margin-top:var(--gap)"><span class="pv-btn primary">${ic("dl")} Download</span><span class="pv-btn outline">${ic("printer")} Print</span></div>`});
def({id:"provider-card",cat:"health",level:"Healthcare",name:"Provider card",
  desc:"A doctor or clinic in search results, with the key facts to choose one.",
  slots:[{k:"photo",label:"Photo or initials",opts:[["show","Show"],["hide","Hide"]]}],defaults:{photo:"show"},from:["card","avatar","badge","button","link"],
  props:[["provider","{name, specialty, distance, network, accepting, languages, phone}",""],["onBook","function",""]],
  a11y:"The name is a heading and the only link. Status badges have words and icons.",
  guide:"Show whether the doctor is in network and accepting new patients first. Show the distance and phone number. Give one main action.",
  tokens:x=>[["Card","{component.card}",rad(x.st,x.st.comp.card.radius)+" px"],["In network","{color.status.success}",x.c.success]],
  spec:cfg=>`<div class="pv-card"><div class="pv-row" style="align-items:flex-start;flex-wrap:nowrap">${cfg.photo==="show"?`<span class="pv-av" style="font-size:1.2em">AP</span>`:""}<div class="pv-stack" style="gap:6px;min-width:0"><h3 class="h3"><span class="lnk" style="color:inherit">Dr. Anita Patel</span></h3><span class="muted">Family medicine · 1.2 miles away</span><div class="pv-row" style="gap:6px"><span class="pv-badge ok">${ic("ok")} In network</span><span class="pv-badge ok">${ic("check")} Accepting new patients</span></div><span class="small">${ic("pin")} 200 Main Street, Springfield</span><span class="small">Speaks English and Hindi</span></div></div><div class="pv-row acts"><span class="pv-btn primary">Book a visit</span><span class="pv-btn outline">${ic("phone")} (555) 310-2200</span></div></div>`});
def({id:"medication",cat:"health",level:"Healthcare",name:"Medication item",
  desc:"One medicine, with how to take it, refills, and a Refill button.",
  slots:[{k:"instructions",label:"How to take it",opts:[["show","Always show"],["hide","Hide until opened"]]}],defaults:{instructions:"show"},from:["card","badge","button","alert"],
  props:[["drug","{name, strength, form}",""],["sig","text","Plain instructions."],["refillsLeft","number",""],["nextFill","date",""],["pharmacy","text",""]],
  a11y:"Drug names are real text so they can be read out. Instructions use plain words, not codes like 'BID'.",
  guide:"Write instructions in plain words, like 'Take 1 tablet by mouth 2 times a day.' Never use short codes. Show refills left and when the medicine runs out.",
  tokens:x=>[["Due soon","{color.status.warning}",x.c.warning],["Card","{component.card}",rad(x.st,x.st.comp.card.radius)+" px"]],
  spec:cfg=>`<div class="pv-card"><div class="pv-row" style="justify-content:space-between;align-items:flex-start"><div><h3 class="h3">Metformin 500 mg</h3><span class="muted small">Tablet · For diabetes</span></div><span class="pv-badge warn">${ic("clock")} Runs out in 5 days</span></div>${cfg.instructions==="show"?`<p>Take 1 tablet by mouth 2 times a day, with food.</p>`:`<span class="lnk">How to take it</span>`}<div class="pv-grid2 small"><span><span class="muted">Refills left</span><br><b>2</b></span><span><span class="muted">Pharmacy</span><br>Main Street Pharmacy</span></div><div class="pv-row acts"><span class="pv-btn primary">Order a refill</span><span class="pv-btn ghost">See details</span></div></div>`});
def({id:"lab-result",cat:"health",level:"Healthcare",name:"Lab result",
  desc:"A test result with the normal range, so people can see if it is high or low.",
  slots:[{k:"range",label:"Show the range as",opts:[["bar","A bar"],["text","Words only"]]}],defaults:{range:"bar"},from:["card","badge","help-drawer"],
  props:[["test","text",""],["value","number",""],["unit","text",""],["range","{low, high}",""],["flag","normal | high | low",""],["date","date",""]],
  a11y:"High and low are written in words with an icon. The bar has a text version: 'Your result, 6.8, is above the normal range of 4.0 to 5.6.'",
  guide:"Say in words if a result is normal, high, or low. Show the normal range. Link to a plain explanation. Suggest talking to the doctor for anything flagged.",
  tokens:x=>[["Normal zone","{color.status.success-soft}",x.c.successSoft],["Flag","{color.status.warning}",x.c.warning]],
  spec:cfg=>`<div class="pv-card"><div class="pv-row" style="justify-content:space-between;align-items:flex-start"><div><h3 class="h3">Hemoglobin A1C</h3><span class="muted small">Tested Sep 3, 2026</span></div><span class="pv-badge warn">${ic("up")} High</span></div><div class="pv-row" style="align-items:baseline;gap:6px"><span class="pv-stat">6.8</span><span class="muted">%</span></div>${cfg.range==="bar"?`<div class="pv-range"><div class="trk"><span class="nz" style="left:20%;width:40%"></span><span class="mk" style="left:76%"></span></div><div class="small muted">Normal range: 4.0 to 5.6</div></div>`:""}<p class="small">Your result is above the normal range of 4.0 to 5.6. <span class="lnk">What this means</span></p></div>`});
def({id:"appointment-slots",cat:"health",level:"Healthcare",name:"Appointment slot picker",
  desc:"Open visit times shown as big buttons, grouped by day and time of day.",
  slots:[{k:"shape",label:"Time button shape",type:"radius",opts:[["md","Rounded"],["pill","Round ends"]]}],defaults:{shape:"md"},from:["button-group","button","date-picker"],
  props:[["days","list of {date, slots}",""],["value","slot",""],["timezone","text","Always shown."]],
  a11y:"Each time is a button with the full date and time as its label. The chosen time is marked with a check, not only color.",
  guide:"Show open times as big buttons, grouped by Morning and Afternoon. Show the next few days first. Always show the time zone and the visit length.",
  tokens:x=>[["Chosen","{color.action.primary}",x.c.P],["Time button","{component.button.outline}",x.c.input]],
  spec:()=>`<div class="pv-stack"><div class="pv-row" style="gap:6px">${[["Tue","Oct 13"],["Wed","Oct 14",1],["Thu","Oct 15"],["Fri","Oct 16"]].map(([d,n,s])=>`<span class="pv-day${s?" on":""}"><b>${d}</b><span class="small">${n}</span></span>`).join("")}</div><b>Morning</b><div class="pv-slots">${["9:00 AM","9:30 AM","10:30 AM"].map(t=>`<span class="pv-slot${t==="10:30 AM"?" on":""}">${t==="10:30 AM"?ic("check"):""}${t}</span>`).join("")}</div><b>Afternoon</b><div class="pv-slots">${["1:00 PM","2:30 PM"].map(t=>`<span class="pv-slot">${t}</span>`).join("")}</div><p class="small muted">Times are Central Time. Visits are 30 minutes.</p></div>`});
def({id:"plan-compare",cat:"health",level:"Healthcare",name:"Plan comparison",
  desc:"Two or three plans side by side, so people can compare costs and benefits.",
  slots:[{k:"highlight",label:"Mark the current plan",opts:[["badge","With a tag"],["border","With a thick border"]]}],defaults:{highlight:"badge"},from:["card","badge","button","summary-list"],
  props:[["plans","list of plans","2 or 3."],["rows","list of {label, key, format}",""],["current","plan id",""]],
  a11y:"Built as a table on computers and as stacked cards on phones. Each row label is a row header.",
  guide:"Compare no more than 3 plans at once. Put the monthly cost and yearly limit first. Use the same row order for every plan. Mark the person's current plan.",
  tokens:x=>[["Current plan","{color.action.primary}",x.c.P],["Card","{component.card}",rad(x.st,x.st.comp.card.radius)+" px"]],
  spec:cfg=>{const P=(n,prem,ded,doc,cur)=>`<div class="pv-card" style="${cur&&cfg.highlight==="border"?"border:3px solid var(--primary-edge)":""}">${cur&&cfg.highlight==="badge"?`<span class="pv-badge brand" style="align-self:flex-start">Your plan now</span>`:""}<h3 class="h3">${n}</h3><div><span class="pv-stat">${prem}</span><span class="muted"> a month</span></div><div class="pv-sl lined kv">${[["Deductible",ded],["Doctor visit",doc],["Max you pay a year",cur?"$4,500":"$6,700"]].map(([k,v])=>`<div class="r"><b>${k}</b><span>${v}</span></div>`).join("")}</div><span class="pv-btn ${cur?"outline":"primary"} full">${cur?"Keep this plan":"Choose this plan"}</span></div>`;
    return `<div class="pv-grid2">${P("Gold Plus","$42","$0","$10",1)}${P("Silver Basic","$0","$500","$25")}</div>`;}});
def({id:"cost-estimate",cat:"health",level:"Healthcare",name:"Cost estimate",
  desc:"Shows what a service costs, what the plan pays, and what the member pays.",
  slots:[],from:["card","progress","help-drawer"],
  props:[["service","text",""],["total","money",""],["planPays","money",""],["youPay","money",""],["assumptions","text","Always shown."]],
  a11y:"The split bar has the same numbers written out in words next to it.",
  guide:"Put what the member pays in the biggest type. Show what the plan pays too. Say it is an estimate and what it is based on.",
  tokens:x=>[["You pay","{color.action.primary}",x.c.P],["Plan pays","{color.action.soft}",x.c.secondary]],
  spec:()=>`<div class="pv-card"><span class="muted small">Estimate for</span><h3 class="h3">MRI of the knee</h3><div><span class="muted">You pay about</span><div class="pv-stat">$180</div></div><div class="pv-split"><i style="flex:180;background:var(--primary-edge)"></i><i style="flex:1020;background:var(--secondary);box-shadow:inset 0 0 0 2px var(--primary-edge);border-radius:0 999px 999px 0"></i></div><div class="pv-grid2 small"><span><span class="sw" style="background:var(--primary-edge)"></span>You pay $180</span><span><span class="sw" style="background:var(--secondary);border:2px solid var(--primary-edge)"></span>Your plan pays $1,020</span></div><p class="small muted">This is an estimate for an in-network imaging center. Your cost may change. <span class="lnk">How we worked this out</span></p></div>`});
def({id:"consent",cat:"health",level:"Healthcare",name:"Consent and signature",
  desc:"A way to read terms, agree, and sign with a typed name.",
  slots:[{k:"sign",label:"How people sign",opts:[["typed","Type their name"],["check","Tick a box only"]]}],defaults:{sign:"typed"},from:["checkbox","field","button","callout"],
  props:[["document","content or link",""],["signer","name",""],["onSign","function","Saves the time and the words agreed to."]],
  a11y:"The terms can be read at any zoom and downloaded. The typed name field says what it means: 'Typing your name counts as your signature.'",
  guide:"Summarize the terms in plain words at the top. Let people download the full text. Say that typing their name is their signature. Show the date.",
  tokens:x=>[["Box","{component.checkbox}",Math.round(x.st.comp.checkbox.size*x.z.base)+" px"],["Terms box","{color.surface.muted}",x.c.muted]],
  spec:cfg=>`<div class="pv-stack"><h3 class="h3">Share your records with Dr. Patel</h3><div class="pv-terms"><p><b>In short:</b> Dr. Patel's office can see your last 2 years of visits and lab results. You can stop this at any time.</p><p class="muted small">Full terms: This authorization permits Main Street Family Medicine to access…</p></div><span class="lnk small">${ic("dl")} Download the full terms</span>${CB(1,"I have read this and I agree.")}${cfg.sign==="typed"?FLD("Type your full name",`<div class="pv-in" style="font-style:italic">June A. Morris</div>`,"Typing your name counts as your signature. Today's date is September 28, 2026."):""}<div class="pv-row acts"><span class="pv-btn primary">Sign and send</span></div></div>`});

/* current brand name for specimens */
export function x_brand(){return BN[S.ui.brand]||"Brand";}
export function slotOf(id,k){const R=REG[id];return R&&R.slots?R.slots.find(s=>s.k===k):null;}
export function compVars(st){
  const v=[];REG_ORDER.forEach(id=>{const R=REG[id],cfg=st.comp[id]||{};(R.slots||[]).forEach(s=>{if(!s.type)return;const val=cfg[s.k];if(val===undefined)return;
    const n=`--c-${id}-${s.k}`;if(s.type==="radius")v.push(n+":"+rad(st,val)+"px");else if(s.type==="shadow")v.push(n+":"+shadow(val));else if(s.type==="num")v.push(n+":"+val+(s.unit||""));});});
  v.push("--c-icon-stroke:"+(st.comp.icon?st.comp.icon.stroke:2));
  return v.join(";");
}

