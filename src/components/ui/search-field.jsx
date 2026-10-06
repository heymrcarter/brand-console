import { useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";
import { FieldLabel, FieldHint, inputClass } from "./field-parts";

/**
 * Search field. A box to search the site or a list, with a Search button.
 * Put site search in the header. After a search, keep the words in the box and pass `results`
 * so the field can say how many things were found.
 */
export function SearchField({
  label = "Search the site", hideLabel = true, hint, placeholder = "Search, like \"flu shot\"",
  value, defaultValue = "", onValueChange, onSubmit, onClear, results, name = "q", disabled, id, className,
}) {
  const s = comp("search");
  const words = (s.button ?? "text") !== "icon";
  const auto = useId(); const fid = id || auto;
  const hintId = hint ? fid + "-hint" : undefined;
  const [inner, setInner] = useState(defaultValue);
  const [searched, setSearched] = useState(null);
  const text = value !== undefined ? value : inner;
  const inputRef = useRef(null);

  const set = (v) => { if (value === undefined) setInner(v); onValueChange && onValueChange(v); };
  const submit = (e) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) { inputRef.current && inputRef.current.focus(); return; }
    setSearched(q);
    onSubmit && onSubmit(q);
  };
  const clear = () => { set(""); onClear && onClear(); inputRef.current && inputRef.current.focus(); };

  return (
    <form role="search" aria-label={label} onSubmit={submit} className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} className={hideLabel ? "sr-only" : undefined}>{label}</FieldLabel>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <div className="flex items-stretch">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute start-[calc(var(--control-h)*0.28)] top-1/2 -translate-y-1/2 size-[1.1em] text-muted-foreground" />
          <input ref={inputRef} id={fid} type="search" name={name} enterKeyHint="search" autoComplete="off"
            value={text} placeholder={placeholder} disabled={disabled} aria-describedby={hintId}
            onChange={(e) => set(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape" && text) { e.preventDefault(); clear(); } }}
            className={cn(inputClass, "[padding-inline-start:calc(var(--control-h)*0.28+1.6em)]", text && "[padding-inline-end:var(--control-h)]",
              "rounded-e-none! [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none")} />
          {text && !disabled && (
            <button type="button" onClick={clear} aria-label="Clear search"
              className="absolute inset-y-0 end-0 inline-flex items-center justify-center [width:var(--control-h)] cursor-pointer bg-transparent border-0 text-muted-foreground hover:text-foreground [border-radius:var(--field-radius)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:-3px]">
              <X aria-hidden="true" className="size-[1.1em]" />
            </button>
          )}
        </div>
        <button type="submit" disabled={disabled} aria-label={words ? undefined : "Search"}
          className={cn(buttonVariants({ variant: "primary" }), "shrink-0 -ms-[2px] rounded-s-none! rounded-e-[var(--field-radius)]!",
            !words && "[width:var(--control-h)] [padding-inline:0]")}>
          {words ? "Search" : <Search aria-hidden="true" className="size-[1.15em]" />}
        </button>
      </div>
      {/* Says what was searched and how many results there are. Sits under the box on its own row. */}
      <p role="status" className="m-0 [font-size:var(--text-sm)] text-muted-foreground empty:-mt-1.5">
        {searched && results !== undefined && results !== null
          ? (results === 0
            ? `We did not find anything for "${searched}". Try other words.`
            : `We found ${results} ${results === 1 ? "result" : "results"} for "${searched}".`)
          : ""}
      </p>
    </form>
  );
}
