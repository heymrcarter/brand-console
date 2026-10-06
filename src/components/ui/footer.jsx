import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const DEFAULT_COLUMNS = [
  { heading: "Get help", items: [{ label: "Call 1-800-555-0142", href: "tel:18005550142" }, "We are here every day, 8 AM to 8 PM.", { label: "TTY users can call 711.", href: "tel:711" }] },
  { heading: "Your plan", items: [{ label: "Plan documents", href: "#" }, { label: "Find a doctor", href: "#" }, { label: "Drug list", href: "#" }] },
  { heading: "About us", items: [{ label: "Privacy", href: "#" }, { label: "Nondiscrimination notice", href: "#" }, { label: "Help in your language", href: "#" }] },
];

/**
 * Footer. The bottom of every page, with ways to get help, links to plan papers, and legal notices.
 * Always show the phone number and the hours people can call.
 */
export function Footer({ columns = DEFAULT_COLUMNS, legal, brandName = "Northfield Health", year = new Date().getFullYear(), variant, headingLevel = 2, className }) {
  const s = comp("footer");
  const dark = (variant || s.style || "light") === "dark";
  const H = `h${headingLevel}`;
  return (
    <footer className={cn("flex flex-col [gap:var(--gap)] [padding:var(--pad)] [font-family:var(--font-body)] [font-size:var(--text-base)] [line-height:var(--lh)]",
      dark ? "bg-foreground text-background" : "bg-muted text-foreground", className)}>
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] [gap:var(--gap)]">
        {columns.map((col) => (
          <div key={col.heading} className="flex flex-col">
            <H className="m-0 mb-1 [font-size:var(--text-base)] font-bold [font-family:var(--font-ui,var(--font-body))]">{col.heading}</H>
            <ul className="m-0 p-0 list-none flex flex-col">
              {col.items.map((it, i) => (
                <li key={i}>
                  {typeof it === "string" ? <span className="inline-flex items-center [min-height:calc(var(--control-h)*.8)]">{it}</span> : (
                    <a href={it.href} className="inline-flex items-center text-inherit underline underline-offset-[3px] [min-height:var(--control-h)] rounded-[4px] hover:decoration-2 focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">{it.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-current/40 pt-[var(--gap)] [font-size:var(--text-sm)]">
        {legal ?? `© ${year} ${brandName}. All rights reserved.`}
      </div>
    </footer>
  );
}
