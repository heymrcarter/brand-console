import { useState } from "react";
import { Dialog as D } from "radix-ui";
import { Menu, Phone, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const focusRing = "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]";
const telHref = (p) => "tel:" + String(p).replace(/[^0-9+]/g, "");

function PhoneLink({ phone, className }) {
  return (
    <a href={telHref(phone)} className={cn("inline-flex items-center gap-[.4em] font-bold text-inherit no-underline hover:underline [min-height:var(--control-h)] rounded-[4px] [font-family:var(--font-ui,var(--font-body))]", focusRing, className)}>
      <Phone aria-hidden="true" className="size-[1.1em] shrink-0" />
      <span className="sr-only">Call us at</span> {phone}
    </a>
  );
}

function AccountLink({ account }) {
  if (!account) return null;
  if (!account.name && !account.initials) return account; // a custom element
  const initials = account.initials || account.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <a href={account.href || "#"} className={cn("inline-flex items-center justify-center rounded-full [min-width:var(--control-h)] [min-height:var(--control-h)]", focusRing)}>
      <span aria-hidden="true" className="inline-flex items-center justify-center size-[2.4em] [font-size:.8em] font-bold bg-secondary text-secondary-foreground [border-radius:var(--c-avatar-shape,999px)]">{initials}</span>
      <span className="sr-only">{account.label || `Your account${account.name ? ", " + account.name : ""}`}</span>
    </a>
  );
}

/**
 * Header. The strip at the top of every page, with the logo, up to five main links, the phone number, and the account.
 * Use the same header on every page. On small screens, the links move into a menu that opens from a "Menu" button.
 */
export function Header({ logo, brandName = "Northfield Health", homeHref = "/", links = [], account, phone = "1-800-555-0142", showPhone, variant, skipTo = "#main", navLabel = "Main", className }) {
  const s = comp("header");
  const brand = (variant || s.style || "white") === "brand";
  const withPhone = phone && (showPhone ?? (s.phone || "yes") === "yes");
  const [open, setOpen] = useState(false);

  const mark = logo || (
    <span className="inline-flex items-center gap-2 [font-family:var(--font-heading)] font-extrabold [font-size:calc(var(--text-base)*1.1)]">
      <i aria-hidden="true" className={cn("block size-[calc(var(--text-base)*1.4)] [border-radius:calc(var(--radius)*.6)]", brand ? "bg-primary-foreground" : "bg-primary")} />
      {brandName}
    </span>
  );

  return (
    <header className={cn("@container relative [font-family:var(--font-body)] [font-size:var(--text-base)]",
      brand ? "bg-primary text-primary-foreground" : "bg-card text-foreground border-b border-border", className)}>
      <a href={skipTo} className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:left-2 focus:top-2 focus:inline-flex focus:items-center focus:[min-height:var(--control-h)] focus:px-4 focus:bg-card focus:text-link focus:font-semibold focus:underline focus:[border-radius:var(--radius)] focus:[outline:3px_solid_var(--ring)]">
        Skip to main content
      </a>
      <div className="flex items-center flex-wrap [gap:var(--gap)] [padding:calc(var(--gap)*.8)_var(--pad)]">
        <a href={homeHref} className={cn("inline-flex items-center text-inherit no-underline [min-height:var(--control-h)] rounded-[4px]", focusRing)}>{mark}</a>

        {links.length > 0 && (
          <nav aria-label={navLabel} className="hidden @5xl:block">
            <ul className="flex m-0 p-0 list-none [gap:calc(var(--gap)*1.2)] [font-family:var(--font-ui,var(--font-body))] font-semibold">
              {links.map((l) => (
                <li key={l.label}>
                  <a href={l.href || "#"} aria-current={l.current ? "page" : undefined}
                    className={cn("inline-flex items-center text-inherit [min-height:var(--control-h)] rounded-[4px] underline-offset-8 hover:underline",
                      l.current ? "underline decoration-[3px]" : "no-underline", focusRing)}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="hidden @5xl:flex items-center gap-3 ml-auto">
          {withPhone && <PhoneLink phone={phone} />}
          <AccountLink account={account} />
        </div>

        <D.Root open={open} onOpenChange={setOpen}>
          <D.Trigger className={cn("@5xl:hidden ml-auto inline-flex items-center gap-[.4em] cursor-pointer bg-transparent text-inherit font-bold border-2 border-current [min-height:var(--control-h)] [padding-inline:calc(var(--gap)*.8)] [border-radius:var(--btn-radius)] [font-family:var(--font-ui,var(--font-body))]", focusRing)}>
            <Menu aria-hidden="true" className="size-[1.2em]" />
            Menu
          </D.Trigger>
          <D.Portal>
            <D.Overlay className="fixed inset-0 z-40" style={{ background: "rgba(20,18,16,var(--overlay))" }} />
            <D.Content className="fixed z-50 inset-y-0 right-0 w-[min(380px,100vw)] overflow-auto flex flex-col bg-card text-foreground [gap:var(--gap)] [padding:var(--pad)] shadow-2xl [font-family:var(--font-body)] [font-size:var(--text-base)] [line-height:var(--lh)] focus:outline-none">
              <div className="flex items-center justify-between gap-3">
                <D.Title className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)]">Menu</D.Title>
                <D.Close className={cn("inline-flex items-center gap-[.4em] cursor-pointer bg-transparent text-link font-bold border-2 border-input [min-height:var(--control-h)] [padding-inline:calc(var(--gap)*.8)] [border-radius:var(--btn-radius)] [font-family:var(--font-ui,var(--font-body))] hover:bg-muted", focusRing)}>
                  <X aria-hidden="true" className="size-[1.2em]" />
                  Close
                </D.Close>
              </div>
              <D.Description className="sr-only">The main links for this site.</D.Description>
              {links.length > 0 && (
                <nav aria-label={navLabel}>
                  <ul className="flex flex-col gap-1 m-0 p-0 list-none [font-family:var(--font-ui,var(--font-body))]">
                    {links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href || "#"} aria-current={l.current ? "page" : undefined} onClick={() => setOpen(false)}
                          className={cn("flex items-center [min-height:var(--control-h)] [padding-inline:calc(var(--gap)*.8)] [border-radius:var(--field-radius)] underline underline-offset-4",
                            l.current ? "bg-secondary text-secondary-foreground font-bold no-underline [box-shadow:inset_4px_0_0_var(--primary-edge)]" : "text-link font-semibold hover:bg-muted", focusRing)}>
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              {(withPhone || account) && (
                <div className="flex flex-col gap-2 pt-[var(--gap)] border-t border-border">
                  {withPhone && <PhoneLink phone={phone} className="text-link" />}
                  {account && account.href && (
                    <a href={account.href} className={cn("inline-flex items-center [min-height:var(--control-h)] text-link font-semibold underline underline-offset-4 rounded-[4px]", focusRing)}>
                      {account.label || "Go to your account"}
                    </a>
                  )}
                </div>
              )}
            </D.Content>
          </D.Portal>
        </D.Root>
      </div>
    </header>
  );
}
