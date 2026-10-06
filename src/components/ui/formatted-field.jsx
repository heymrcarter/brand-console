import { useId, useLayoutEffect, useRef, useState } from "react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";

/*
 * Masks: "9" is a number, "A" is a letter, "*" is a letter or number. Anything else is added for people.
 * Added marks only show once people type the next letter or number, so "60601" stays "60601"
 * and "606011234" becomes "60601-1234".
 */
export const KINDS = {
  phone: { mask: "(999) 999-9999", example: "(555) 555-5555", autoComplete: "tel-national", type: "tel", width: "max-w-[14em]" },
  zip: { mask: "99999-9999", example: "12345", autoComplete: "postal-code", width: "max-w-[9em]" },
  "member-id": { mask: "AA-999999", example: "NF-000000", autoComplete: "off", width: "max-w-[12em]" },
  "ssn-last4": { mask: "9999", example: "1234", autoComplete: "off", width: "max-w-[10em]", prefix: "••• •• " },
};
const SLOT = { 9: /\d/, A: /[a-z]/i, "*": /[a-z\d]/i };
const isSlot = (c) => c in SLOT;

/** Keeps only the letters and numbers that fit the mask, in order. */
export function toRaw(text, mask) {
  let chars = String(text ?? "").replace(/[^a-z\d]/gi, "").toUpperCase();
  const slots = [...mask].filter(isSlot);
  // A phone number pasted with a leading 1, like +1 555 201 4488.
  if (mask === KINDS.phone.mask && chars.length === 11 && chars[0] === "1") chars = chars.slice(1);
  let out = "", i = 0;
  for (const c of chars) { if (i >= slots.length) break; if (SLOT[slots[i]].test(c)) { out += c; i++; } }
  return out;
}
/** Puts the raw letters and numbers into the mask. */
export function applyMask(raw, mask) {
  let out = "", r = 0;
  for (let i = 0; i < mask.length && r < raw.length; i++) out += isSlot(mask[i]) ? raw[r++] : mask[i];
  return out;
}
/** How many real letters or numbers are before a spot in the formatted text. */
const countBefore = (formatted, mask, pos) => { let n = 0; for (let i = 0; i < pos && i < formatted.length; i++) if (isSlot(mask[i])) n++; return n; };
/** Where the caret goes to sit after the nth real letter or number. */
const caretAt = (formatted, mask, n) => {
  if (n <= 0) { let i = 0; while (i < formatted.length && !isSlot(mask[i])) i++; return i; }
  let seen = 0; for (let i = 0; i < formatted.length; i++) if (isSlot(mask[i]) && ++seen === n) return i + 1;
  return formatted.length;
};

/**
 * Formatted field. A box that adds the right marks as people type, like a phone number,
 * ZIP code, or member ID. People can type or paste in any format. The app gets letters and numbers only.
 * `kind` is "phone", "zip", "member-id", or "ssn-last4". Pass `mask` and `example` for other shapes.
 */
export function FormattedField({
  kind = "phone", mask: maskProp, example: exampleProp, label, hint, error, optional,
  value, defaultValue, onValueChange, width, id, className, ...props
}) {
  const s = comp("masked");
  const k = KINDS[kind] || {};
  const mask = maskProp || k.mask || "*".repeat(40);
  const example = exampleProp || k.example;
  const inLabel = (s.format ?? "hint") === "label";
  const onlyNumbers = [...mask].filter(isSlot).every((c) => c === "9");
  const auto = useId(); const fid = id || auto;
  const hintId = fid + "-hint", errId = error ? fid + "-err" : undefined;

  const [inner, setInner] = useState(() => toRaw(defaultValue, mask));
  const raw = value !== undefined ? toRaw(value, mask) : inner;
  const shown = applyMask(raw, mask);
  const ref = useRef(null), caret = useRef(null);

  useLayoutEffect(() => {
    if (caret.current === null || !ref.current || document.activeElement !== ref.current) return;
    const p = caretAt(ref.current.value, mask, caret.current);
    ref.current.setSelectionRange(p, p); caret.current = null;
  });

  const commit = (nextRaw, realBefore) => {
    caret.current = realBefore;
    if (value === undefined) setInner(nextRaw);
    onValueChange && onValueChange(nextRaw, applyMask(nextRaw, mask));
    if (nextRaw === raw && ref.current) { // Nothing changed, so React will not redraw. Fix the box by hand.
      ref.current.value = shown; const p = caretAt(shown, mask, realBefore); ref.current.setSelectionRange(p, p); caret.current = null;
    }
  };
  const change = (e) => {
    const el = e.target, typed = el.value, pos = el.selectionStart ?? typed.length;
    const nextRaw = toRaw(typed, mask);
    commit(nextRaw, toRaw(typed.slice(0, pos), mask).length);
  };
  const keys = (e) => {
    const el = e.currentTarget, a = el.selectionStart, b = el.selectionEnd;
    if (a !== b || a == null) return;
    // Backspace or Delete next to an added mark removes the nearest real letter or number instead.
    if (e.key === "Backspace" && a > 0 && !isSlot(mask[a - 1])) {
      let i = a; while (i > 0 && !isSlot(mask[i - 1])) i--;
      if (i === 0) return;
      e.preventDefault();
      const n = countBefore(shown, mask, i);
      commit(raw.slice(0, n - 1) + raw.slice(n), n - 1);
    } else if (e.key === "Delete" && a < shown.length && !isSlot(mask[a])) {
      let i = a; while (i < shown.length && !isSlot(mask[i])) i++;
      if (i >= shown.length) return;
      e.preventDefault();
      const n = countBefore(shown, mask, i);
      commit(raw.slice(0, n) + raw.slice(n + 1), n);
    }
  };

  const formatSentence = example ? `It should look like ${example}.` : null;
  const hintText = inLabel ? hint : [hint, formatSentence].filter(Boolean).join(" ");
  const labelNode = inLabel && example
    ? <>{label} <span className="font-normal text-muted-foreground">({example})</span></>
    : label;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} optional={optional}>{labelNode}</FieldLabel>
      <FieldHint id={hintText ? hintId : undefined}>{hintText}</FieldHint>
      <FieldError id={errId}>{error}</FieldError>
      <div className={cn("relative w-full", width || k.width)}>
        {k.prefix && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 flex items-center [padding-inline-start:calc(var(--control-h)*0.28)] text-muted-foreground tracking-wider">
            {k.prefix}
          </span>
        )}
        <input ref={ref} id={fid} type={k.type || "text"} value={shown} onChange={change} onKeyDown={keys}
          inputMode={onlyNumbers ? (k.type === "tel" ? "tel" : "numeric") : "text"}
          autoComplete={k.autoComplete || "off"} autoCapitalize={onlyNumbers ? "off" : "characters"} autoCorrect="off" spellCheck={false}
          aria-invalid={error ? true : undefined} aria-describedby={[hintText && hintId, errId].filter(Boolean).join(" ") || undefined}
          className={cn(inputClass, "tabular-nums", k.prefix && "[padding-inline-start:calc(var(--control-h)*0.28+4.2em)]")}
          {...props} />
      </div>
    </div>
  );
}
