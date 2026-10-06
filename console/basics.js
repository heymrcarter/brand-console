/* The small building blocks that the engine and the component registry both use.
   They depend on nothing else, so the registry can use them without loading the engine. */
export const BRANDS=[
  {id:"northfield",name:"Northfield",div:"Consumer division"},
  {id:"crestline",name:"Crestline",div:"Partner division"}];
export const BN=Object.fromEntries(BRANDS.map(b=>[b.id,b.name]));
export const RADII={none:"No corners",sm:"Small",md:"Medium",lg:"Large",pill:"Round ends"};
export function rad(st,key){const r=st.shape.radius;return {none:0,sm:Math.min(4,r),md:r,lg:Math.round(r*1.5),pill:999}[key];}
export function shadow(k){return {none:"none",soft:"0 1px 2px rgba(20,18,16,.06), 0 4px 14px rgba(20,18,16,.07)",strong:"0 2px 4px rgba(20,18,16,.08), 0 14px 32px rgba(20,18,16,.14)"}[k];}
/* Makes text safe to put inside HTML. */
export function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
