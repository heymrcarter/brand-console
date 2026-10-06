import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, LoaderCircle, Search } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";

const toOpt = (o) => (typeof o === "string" ? { value: o, label: o } : o);
const norm = (t) => String(t).toLowerCase();

/** Counts how many single-letter changes turn one word into the other. */
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

/**
 * The default matcher. Shows options that contain the typed letters, with ones that start
 * with them first. If nothing matches, it forgives one or two spelling mistakes.
 */
export function defaultFilter(options, query) {
  const q = norm(query.trim());
  if (!q) return options;
  const hits = options.filter((o) => norm(o.label).includes(q));
  if (hits.length) return hits.sort((a, b) => norm(a.label).indexOf(q) - norm(b.label).indexOf(q));
  if (q.length < 3) return [];
  const allowed = q.length < 6 ? 1 : 2;
  return options.filter((o) => norm(o.label).split(/[\s\-/]+/).some((w) => distance(w.slice(0, q.length), q) <= allowed));
}

/** Shows the typed letters in bold inside an option. */
function Highlight({ text, query, on }) {
  const i = on && query ? norm(text).indexOf(norm(query.trim())) : -1;
  if (i < 0) return text;
  const n = query.trim().length;
  return <>{text.slice(0, i)}<b className="font-bold">{text.slice(i, i + n)}</b>{text.slice(i + n)}</>;
}

/**
 * Combobox. A box that shows matches as people type, so they can pick one, like a medicine or a doctor.
 * Use it when there are too many choices for a dropdown. `options` is a list, or `source` is a
 * function that gets the typed words and returns (or promises) a list.
 *
 * Plain React, built to the WAI-ARIA Authoring Practices "editable combobox with list autocomplete" pattern:
 * - Focus stays in the text box. The active match is shown with aria-activedescendant, never by moving focus.
 * - aria-expanded is true whenever the pop-up shows, also while it says "Looking for matches" or "Nothing matches".
 * - Down and Up move through matches and wrap around at the ends. Home and End jump to the first and last match
 *   once a match is active; before that, they move the cursor in the text, like in any text box.
 * - Enter or a tap picks a match. Escape closes the pop-up, and a second Escape clears the box. Alt + Up closes it.
 *   Inside a pop-up or drawer, Escape does only those things until the box is empty.
 * - Tab never picks a match and is never trapped. Focus moves on and the pop-up closes. (If the "nothing matches"
 *   message has a link, Tab reaches that link first.)
 * - A polite status message says how many matches there are.
 * The ref points to the text <input>. (React Aria's useComboBox could replace this one day. We have not added it.)
 */
export const Combobox = forwardRef(function Combobox({
  label, hint, error, optional, options = [], source, filter = defaultFilter,
  value, defaultValue, onSelect, onInputChange, allowFreeText = false, minChars,
  placeholder, noMatches, name, disabled, id, className,
}, ref) {
  const s = comp("combobox");
  const min = Number(minChars ?? s.min ?? 2);
  const bold = (s.match ?? "bold") !== "none";
  const auto = useId(); const fid = id || auto;
  const listId = fid + "-list", hintId = fid + "-hint", errId = error ? fid + "-err" : undefined, statusId = fid + "-status";
  const all = useMemo(() => options.map(toOpt), [options]);

  const find = (v) => all.find((o) => o.value === v);
  const [picked, setPicked] = useState(() => find(value ?? defaultValue) || null);
  const chosen = value !== undefined ? find(value) || (picked && picked.value === value ? picked : null) : picked;
  const [query, setQuery] = useState(chosen ? chosen.label : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [asyncList, setAsyncList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const listRef = useRef(null), wrapRef = useRef(null), call = useRef(0);

  // When the app changes the value, show that option's words in the box.
  useEffect(() => { if (value !== undefined) setQuery(chosen ? chosen.label : allowFreeText ? query : ""); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const enough = query.trim().length >= min;
  const typedSinceChoice = !chosen || query !== chosen.label;

  // Ask the source for matches, and ignore answers that come back late.
  useEffect(() => {
    if (!source || !enough || !typedSinceChoice) { setLoading(false); return; }
    const n = ++call.current; setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await source(query.trim());
        if (n === call.current) setAsyncList((r || []).map(toOpt));
      } catch { if (n === call.current) setAsyncList([]); }
      finally { if (n === call.current) setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [source, query, enough, typedSinceChoice]);

  const matches = !enough ? [] : source ? asyncList : filter(all, query);
  const showPopup = open && enough && (loading || typedSinceChoice || matches.length > 0);
  const showList = showPopup && !loading && matches.length > 0;

  // Tell screen readers how many matches there are, after typing slows down.
  useEffect(() => {
    if (!open) { setStatus(""); return; }
    const t = setTimeout(() => setStatus(
      !enough ? "" : loading ? "Looking for matches." : matches.length === 0 ? "No matches found." :
      `${matches.length} ${matches.length === 1 ? "match" : "matches"}. Use the up and down arrows to hear them.`), 500);
    return () => clearTimeout(t);
  }, [open, enough, loading, matches.length]);

  useEffect(() => {
    if (active < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${active}"]`);
    el && el.scrollIntoView && el.scrollIntoView({ block: "nearest" });
  }, [active]);

  // While Esc has something to do here (close the matches, or clear the box), it does only that,
  // and does not also close a pop-up or drawer the combobox sits in.
  const escHere = showPopup || !!query;
  useEffect(() => {
    if (!escHere) return;
    const esc = (e) => { if (e.key === "Escape" && wrapRef.current && wrapRef.current.contains(document.activeElement)) e.preventDefault(); };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [escHere]);

  // If the list gets shorter (new matches came back), forget an active match that is no longer there.
  useEffect(() => { if (active >= matches.length) setActive(-1); }, [matches.length, active]);

  const choose = (o) => {
    setPicked(o); setQuery(o.label); setOpen(false); setActive(-1);
    onSelect && onSelect(o);
  };
  const type = (t) => {
    setQuery(t); setOpen(true); setActive(-1);
    onInputChange && onInputChange(t);
    if (!t && chosen) { setPicked(null); onSelect && onSelect(null); }
  };
  const keys = (e) => {
    const n = matches.length;
    const plain = !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); if (e.altKey) return; }
      if (n) setActive((a) => (a + 1) % n);
    } else if (e.key === "ArrowUp" && e.altKey) {
      if (showPopup) { e.preventDefault(); setOpen(false); setActive(-1); }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (n) setActive((a) => (a <= 0 ? n - 1 : a - 1));
    } else if ((e.key === "Home" || e.key === "End") && plain && showList && active >= 0) {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : n - 1);
    } else if (e.key === "Enter") {
      if (showList && matches[active]) { e.preventDefault(); choose(matches[active]); }
    } else if (e.key === "Escape") {
      if (showPopup) { e.preventDefault(); setOpen(false); setActive(-1); }
      else if (query) { e.preventDefault(); type(""); }
    }
  };
  const blur = (e) => {
    // Stay open while focus moves to something inside, like a link in the "no matches" message.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setOpen(false); setActive(-1);
    // Without free text, put back the last choice if the words do not match one.
    if (!allowFreeText) setQuery(chosen ? chosen.label : "");
  };

  const defaultHint = `Type at least ${min} ${min === 1 ? "letter" : "letters"} to see matches.`;
  const hintText = hint === undefined ? defaultHint : hint;
  const describedBy = [hintText && hintId, errId].filter(Boolean).join(" ") || undefined;
  const activeId = showList && active >= 0 ? `${fid}-opt-${active}` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} optional={optional}>{label}</FieldLabel>
      <FieldHint id={hintId}>{hintText}</FieldHint>
      <FieldError id={errId}>{error}</FieldError>
      <div ref={wrapRef} className="relative" onBlur={blur}>
        <input ref={ref} id={fid} type="text" role="combobox" autoComplete="off" autoCorrect="off" spellCheck={false}
          aria-autocomplete="list" aria-expanded={showPopup} aria-controls={listId} aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy}
          value={query} placeholder={placeholder} disabled={disabled}
          onChange={(e) => type(e.target.value)} onKeyDown={keys} onClick={() => setOpen(true)}
          className={cn(inputClass, "[padding-inline-end:calc(var(--control-h)*0.9)]")} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 flex items-center [padding-inline:calc(var(--control-h)*0.28)] text-muted-foreground">
          {loading ? <LoaderCircle className="size-[1.1em] animate-spin motion-reduce:animate-none" /> : <Search className="size-[1.1em]" />}
        </span>
        {name && <input type="hidden" name={name} disabled={disabled} value={chosen ? chosen.value : allowFreeText ? query : ""} />}

        <div hidden={!showPopup} onMouseDown={(e) => e.target.closest("a,button") || e.preventDefault()}
          className="absolute inset-x-0 top-full z-50 mt-1.5 bg-card text-foreground border border-border p-1 [border-radius:var(--field-radius)] [box-shadow:var(--menu-shadow)] [font-family:var(--font-body)] [font-size:var(--text-base)]">
          <ul ref={listRef} id={listId} role="listbox" aria-label={typeof label === "string" ? `${label} matches` : undefined} hidden={!showList}
            className="m-0 p-0 list-none max-h-[min(360px,50vh)] overflow-auto">
            {showList && matches.map((o, i) => (
              <li key={o.value} id={`${fid}-opt-${i}`} data-index={i} role="option" aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)} onMouseMove={() => active !== i && setActive(i)}
                className={cn("flex items-center gap-2 cursor-pointer [min-height:calc(var(--control-h)*0.9)] [padding-inline:calc(var(--control-h)*0.24)] py-1 rounded-[calc(var(--field-radius)*0.7)]",
                  i === active && "bg-secondary text-secondary-foreground")}>
                <span className="min-w-0 flex-1">
                  <span className="block"><Highlight text={o.label} query={query} on={bold} /></span>
                  {o.hint && <span className="block [font-size:var(--text-sm)] text-muted-foreground">{o.hint}</span>}
                </span>
                {chosen && chosen.value === o.value && <Check aria-hidden="true" className="size-[1em] shrink-0" />}
              </li>
            ))}
          </ul>
          {showList && (
            <p aria-hidden="true" className="m-0 [padding:6px_calc(var(--control-h)*0.24)] [font-size:var(--text-sm)] text-muted-foreground">
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </p>
          )}
          {showPopup && loading && (
            <p className="m-0 flex items-center gap-2 [padding:10px_12px] text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-[1.1em] animate-spin motion-reduce:animate-none" />
              Looking for matches.
            </p>
          )}
          {showPopup && !loading && matches.length === 0 && (
            <div className="[padding:10px_12px] text-muted-foreground">
              {noMatches
                ? (typeof noMatches === "function" ? noMatches(query.trim()) : noMatches)
                : <p className="m-0">Nothing matches "{query.trim()}". Check the spelling and try again.</p>}
            </div>
          )}
        </div>
      </div>
      <div id={statusId} role="status" aria-live="polite" className="sr-only">{status}</div>
    </div>
  );
});
Combobox.displayName = "Combobox";
