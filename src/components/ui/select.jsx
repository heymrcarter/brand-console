import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";

const toOpt = (o) => (typeof o === "string" ? { value: o, label: o } : o);

// Phones and tablets (a finger, not a mouse) get the browser's own select.
const COARSE = "(pointer: coarse)";
const media = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(COARSE) : null);
function subscribe(onChange) {
  const m = media();
  if (!m) return () => {};
  if (m.addEventListener) { m.addEventListener("change", onChange); return () => m.removeEventListener("change", onChange); }
  m.addListener(onChange); return () => m.removeListener(onChange);
}
const isCoarse = () => !!media()?.matches;
const useCoarsePointer = () => useSyncExternalStore(subscribe, isCoarse, () => false);

/**
 * Select. A list people open to pick one choice.
 * Use it for 5 to 15 choices. For 2 to 4 choices, use radio buttons.
 *
 * Plain React. On phones and tablets it is the browser's own <select>, so it works with every screen reader and
 * opens the phone's own picker. With a mouse, it is a button that opens a list, built to the WAI-ARIA Authoring
 * Practices "select-only combobox" pattern:
 * - Focus stays on the button. The active choice is shown with aria-activedescendant and a ring.
 * - Closed: Down, Enter, or Space opens the list on the current choice. Up and Home open it on the first choice,
 *   End on the last. Typing letters opens it on the first choice that starts with them.
 * - Open: Up and Down move one choice and stop at the ends. Home, End, Page Up, and Page Down jump.
 *   Enter, Space, Tab, or Alt + Up picks the active choice. Esc closes the list and keeps the old choice.
 * The list is drawn at the end of the page (a portal), so a pop-up or a card that hides overflow cannot cut it off.
 * It opens upward when there is more room above.
 * Set `native` to true or false to always or never use the browser's select.
 * The ref points to the control people focus: the <button>, or the <select>.
 */
export const Select = forwardRef(function Select({
  label, hint, error, optional, options = [], placeholder = "Choose one", value, defaultValue, onValueChange,
  disabled, name, id, native, className,
}, ref) {
  const auto = useId(); const fid = id || auto;
  const hintId = hint ? fid + "-hint" : undefined, errId = error ? fid + "-err" : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  const list = options.map(toOpt);
  const [own, setOwn] = useState(defaultValue ?? "");
  const current = value !== undefined ? value ?? "" : own;
  const pick = (v) => {
    if (value === undefined) setOwn(v);
    if (v !== current && onValueChange) onValueChange(v);
  };
  const coarse = useCoarsePointer();
  const useNative = native ?? coarse;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} optional={optional}>{label}</FieldLabel>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <FieldError id={errId}>{error}</FieldError>
      {useNative ? (
        <div className="relative">
          <select ref={ref} id={fid} name={name} disabled={disabled} value={list.some((o) => o.value === current) ? current : ""} onChange={(e) => pick(e.target.value)}
            aria-invalid={error ? true : undefined} aria-describedby={describedBy}
            className={cn(inputClass, "appearance-none cursor-pointer [padding-inline-end:calc(var(--control-h)*0.9)] [&>option]:text-foreground", !current && "text-muted-foreground")}>
            <option value="" disabled>{placeholder}</option>
            {list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-[calc(var(--control-h)*0.28)] size-[1.1em] text-muted-foreground" />
        </div>
      ) : (
        <ListSelect ref={ref} fid={fid} label={label} list={list} current={current} pick={pick} placeholder={placeholder}
          name={name} disabled={disabled} invalid={!!error} describedBy={describedBy} />
      )}
    </div>
  );
});
Select.displayName = "Select";

const ListSelect = forwardRef(function ListSelect({ fid, label, list, current, pick, placeholder, name, disabled, invalid, describedBy }, ref) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef(null), boxRef = useRef(null), typed = useRef({ text: "", at: 0 }), skipClick = useRef(false);
  const [place, setPlace] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const setRefs = useCallback((node) => {
    boxRef.current = node;
    if (typeof ref === "function") ref(node); else if (ref) ref.current = node;
  }, [ref]);
  const listId = fid + "-list";
  const chosenIndex = list.findIndex((o) => o.value === current);
  const chosen = list[chosenIndex];
  const last = list.length - 1;
  const start = chosenIndex >= 0 ? chosenIndex : 0;
  const clamp = (i) => Math.max(0, Math.min(last, i));

  const show = (i) => { setOpen(true); setActive(clamp(i)); };
  const close = () => { setOpen(false); setActive(-1); };
  const choose = (i) => { if (list[i]) pick(list[i].value); close(); };

  // Keep the active choice in view.
  useEffect(() => {
    if (!open || active < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${active}"]`);
    el && el.scrollIntoView && el.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // Put the list under the button (or over it, when there is more room above), and keep it there while the page scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    const update = (e) => {
      if (e && listRef.current && listRef.current.contains(e.target)) return;
      const b = boxRef.current; if (!b) return;
      const r = b.getBoundingClientRect(), vh = window.innerHeight, gap = 6;
      const below = vh - r.bottom - gap - 8, above = r.top - gap - 8, up = below < 180 && above > below;
      setPlace({ left: r.left, width: r.width, top: up ? undefined : r.bottom + gap, bottom: up ? vh - r.top + gap : undefined, maxHeight: Math.max(120, Math.min(360, up ? above : below)) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open]);

  // While the list is open, Esc closes only the list, not a pop-up or drawer the select sits in.
  useEffect(() => {
    if (!open) return;
    const esc = (e) => { if (e.key === "Escape" && boxRef.current && boxRef.current === document.activeElement) e.preventDefault(); };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [open]);

  // Typing letters jumps to the first choice that starts with them. Typing one letter again moves to the next one.
  const findTyped = (ch) => {
    const now = Date.now(), t = typed.current;
    t.text = now - t.at > 700 ? ch : t.text + ch; t.at = now;
    const q = t.text.toLowerCase();
    const one = [...q].every((c) => c === q[0]);
    const from = open ? active : chosenIndex;
    const base = one ? from + 1 : Math.max(from, 0);
    for (let k = 0; k < list.length; k++) {
      const i = (base + k) % list.length;
      if (list[i].label.toLowerCase().startsWith(one ? q[0] : q)) return i;
    }
    return -1;
  };

  const keys = (e) => {
    if (!list.length) return;
    const k = e.key;
    const typing = Date.now() - typed.current.at < 700 && typed.current.text;
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !(k === " " && !typing)) {
      e.preventDefault();
      if (k === " ") skipClick.current = true; // A space typed into a search must not press the button when it comes up.
      const i = findTyped(k);
      if (i >= 0) show(i);
      return;
    }
    if (!open) {
      if (k === "ArrowDown") { e.preventDefault(); show(start); }
      else if (k === "ArrowUp" || k === "Home") { e.preventDefault(); show(0); }
      else if (k === "End") { e.preventDefault(); show(last); }
      // Enter and Space press the button, and the click opens the list.
      return;
    }
    if (k === "ArrowDown") { e.preventDefault(); setActive((a) => clamp(a + 1)); }
    else if (k === "ArrowUp" && e.altKey) { e.preventDefault(); choose(active); }
    else if (k === "ArrowUp") { e.preventDefault(); setActive((a) => clamp(a - 1)); }
    else if (k === "Home") { e.preventDefault(); setActive(0); }
    else if (k === "End") { e.preventDefault(); setActive(last); }
    else if (k === "PageDown") { e.preventDefault(); setActive((a) => clamp(a + 10)); }
    else if (k === "PageUp") { e.preventDefault(); setActive((a) => clamp(a - 10)); }
    else if (k === "Enter") { e.preventDefault(); choose(active); }
    else if (k === " ") { e.preventDefault(); skipClick.current = true; choose(active); }
    else if (k === "Escape") { e.preventDefault(); close(); }
    else if (k === "Tab") { choose(active); }
  };
  const click = (e) => {
    if (skipClick.current) { skipClick.current = false; return; }
    if (!list.length) return;
    e.currentTarget.focus(); // Safari does not focus a button when it is clicked.
    open ? close() : show(start);
  };
  // Space picks on key down. Some browsers still press the button when Space comes up, so skip that one click.
  const spaceUp = (e) => {
    if (e.key !== " " || !skipClick.current) return;
    e.preventDefault();
    setTimeout(() => { skipClick.current = false; });
  };
  const blur = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) close(); };
  const activeId = open && active >= 0 ? `${fid}-opt-${active}` : undefined;

  return (
    <div className="relative" onBlur={blur}>
      <button ref={setRefs} id={fid} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        aria-activedescendant={activeId} aria-invalid={invalid || undefined} aria-describedby={describedBy} disabled={disabled}
        onClick={click} onKeyDown={keys} onKeyUp={spaceUp} onPointerDown={() => { skipClick.current = false; }}
        className={cn(inputClass, "flex items-center justify-between gap-2 text-left cursor-pointer", !chosen && "text-muted-foreground")}>
        <span className="min-w-0 truncate">{chosen ? chosen.label : placeholder}</span>
        <ChevronDown aria-hidden="true" className="size-[1.1em] shrink-0" />
      </button>
      {/* Like the browser's own select, nothing is sent with the form until a choice is picked. */}
      {name && <input type="hidden" name={name} value={current} disabled={disabled || !current} />}
      {mounted && createPortal(
      <ul ref={listRef} id={listId} role="listbox" hidden={!open}
        aria-label={typeof label === "string" ? label : undefined} aria-labelledby={typeof label === "string" ? undefined : fid}
        onMouseDown={(e) => e.preventDefault()}
        style={{ ...(place || {}), pointerEvents: "auto" }}
        className="fixed z-[60] m-0 list-none overflow-auto bg-card text-foreground border border-border p-1 [border-radius:var(--field-radius)] [box-shadow:var(--menu-shadow)] [font-family:var(--font-body)] [font-size:var(--text-base)] [line-height:var(--lh)]">
        {list.map((o, i) => {
          const on = o.value === current;
          return (
            <li key={o.value} id={`${fid}-opt-${i}`} data-index={i} role="option" aria-selected={i === active}
              onClick={() => choose(i)} onMouseMove={() => active !== i && setActive(i)}
              className={cn("relative flex items-center gap-2 cursor-pointer [min-height:calc(var(--control-h)*0.9)] [padding-inline:calc(var(--control-h)*0.24)] rounded-[calc(var(--field-radius)*0.7)]",
                i === active && "bg-muted [outline:2px_solid_var(--ring)] [outline-offset:-2px]",
                on && "bg-secondary text-secondary-foreground font-semibold")}>
              {on && <Check aria-hidden="true" className="size-[1em] shrink-0" />}
              <span>{o.label}</span>
            </li>
          );
        })}
      </ul>, document.body)}
    </div>
  );
});
