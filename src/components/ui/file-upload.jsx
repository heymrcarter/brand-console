import { useId, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { buttonVariants } from "./button";
import { FieldLabel, FieldHint, FieldError } from "./field-parts";

/** Writes a file size in plain words, like "1.2 MB". */
export function fileSize(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

/** True when the file matches the accept list, like ".pdf,.jpg,image/png". */
function accepts(file, accept) {
  if (!accept) return true;
  const name = (file.name || "").toLowerCase(), type = (file.type || "").toLowerCase();
  return accept.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean).some((a) =>
    a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : type === a);
}

let seq = 0;
const wrap = (f) => ({ key: `file-${++seq}`, file: f, name: f.name, size: f.size });

/**
 * File upload. A place to add files, like a photo of a bill or a letter from a doctor.
 * There is always a real "Choose a file" button. Dragging files in is extra.
 * Each chosen file shows with a Remove button. Pass files to show upload progress.
 */
export function FileUpload({
  label, hint = "PDF, JPG, or PNG. Up to 10 MB each.", error, optional,
  accept, maxSize, multiple = true, capture, files, onChange, onUpload,
  buttonText = "Choose a file", style: styleProp, disabled, id, name, className,
}) {
  const s = comp("file-upload"); const drop = (styleProp || s.style || "drop") === "drop";
  const auto = useId(); const fid = id || auto;
  const labelId = fid + "-label", btnId = fid + "-btn", hintId = hint ? fid + "-hint" : undefined;
  const errId = fid + "-err", liveId = fid + "-live";
  const inputRef = useRef(null);
  const [inner, setInner] = useState([]);
  const [problems, setProblems] = useState([]);
  const [news, setNews] = useState("");
  const [over, setOver] = useState(false);
  const list = files
    ? files.map((f, i) => (typeof File !== "undefined" && f instanceof File ? { key: `${f.name}-${i}`, file: f, name: f.name, size: f.size } : { key: f.key || f.id || `${f.name}-${i}`, ...f }))
    : inner;
  const shownError = [error, ...problems].filter(Boolean).join(" ");

  const setList = (next) => {
    if (!files) setInner(next);
    onChange && onChange(next.map((x) => x.file).filter(Boolean), next);
  };

  const add = (picked) => {
    const good = [], bad = [];
    for (const f of picked) {
      if (!accepts(f, accept)) bad.push(`${f.name} is not a type of file we can take.`);
      else if (maxSize && f.size > maxSize * 1024 * 1024) bad.push(`${f.name} is bigger than ${maxSize} MB. Pick a smaller file.`);
      else good.push(wrap(f));
    }
    setProblems(bad);
    if (good.length) {
      setList(multiple ? [...list, ...good] : good.slice(0, 1));
      onUpload && onUpload(good.map((g) => g.file));
      setNews(good.length === 1 ? `${good[0].name} was added.` : `${good.length} files were added.`);
    }
  };

  const remove = (item) => {
    setList(list.filter((x) => x.key !== item.key));
    setNews(`${item.name} was removed.`);
    inputRef.current && inputRef.current.focus();
  };

  const onDrop = (e) => {
    e.preventDefault(); setOver(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length) add(multiple ? dropped : dropped.slice(0, 1));
  };

  const picker = (
    <>
      <input ref={inputRef} id={fid} name={name} type="file" accept={accept} multiple={multiple} capture={capture} disabled={disabled}
        aria-labelledby={`${labelId} ${btnId}`}
        aria-describedby={[hintId, shownError && errId].filter(Boolean).join(" ") || undefined}
        aria-invalid={shownError ? true : undefined}
        onChange={(e) => { add(Array.from(e.target.files || [])); e.target.value = ""; }}
        className="peer sr-only" />
      <label id={btnId} htmlFor={fid}
        className={cn(buttonVariants({ variant: "outline" }),
          "peer-focus-visible:[outline:3px_solid_var(--ring)] peer-focus-visible:[outline-offset:3px] peer-disabled:opacity-45 peer-disabled:cursor-not-allowed")}>
        {!drop && <Upload aria-hidden="true" className="size-[1.1em]" style={{ strokeWidth: "var(--c-icon-stroke,2)" }} />}
        {buttonText}
      </label>
    </>
  );

  return (
    <div className={cn("flex flex-col gap-[calc(var(--gap)*0.6)]", className)}>
      <div className="flex flex-col gap-1.5">
        <FieldLabel as="span" optional={optional}><span id={labelId}>{label}</span></FieldLabel>
        <FieldHint id={hintId}>{hint}</FieldHint>
        <FieldError id={errId}>{shownError}</FieldError>
      </div>
      {drop ? (
        <div onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
          className={cn("flex flex-col items-center text-center [gap:calc(var(--gap)*0.5)] [padding:var(--pad)] bg-card [border:2px_dashed_var(--input)] [border-radius:var(--field-radius)]",
            over && "bg-secondary [border-color:var(--link)]", shownError && "[border-color:var(--destructive-text)]")}>
          <Upload aria-hidden="true" className="size-[2em] text-muted-foreground" style={{ strokeWidth: "var(--c-icon-stroke,2)" }} />
          <span aria-hidden="true">Drag files here, or</span>
          <div>{picker}</div>
        </div>
      ) : <div>{picker}</div>}
      {list.length > 0 && (
        <ul aria-label="Files you added" className="m-0 p-0 list-none flex flex-col [gap:calc(var(--gap)*0.5)]">
          {list.map((f) => {
            const busy = typeof f.progress === "number" && f.progress < 100;
            return (
              <li key={f.key} className="flex items-center gap-[10px] [padding:calc(var(--gap)*0.6)] bg-card border border-border [border-radius:var(--field-radius)]">
                <FileText aria-hidden="true" className="size-[1.3em] shrink-0 text-muted-foreground" style={{ strokeWidth: "var(--c-icon-stroke,2)" }} />
                <span className="flex-1 min-w-0">
                  <b className="block truncate">{f.name}</b>
                  {busy ? (
                    <span role="progressbar" aria-label={`Uploading ${f.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f.progress)}
                      className="mt-1.5 block [height:var(--c-progress-height,10px)] bg-muted rounded-full overflow-hidden">
                      <span className="block h-full rounded-full bg-primary-edge motion-safe:transition-[width]" style={{ width: `${f.progress}%` }} />
                    </span>
                  ) : (
                    <span className="block [font-size:var(--text-sm)] text-muted-foreground">{fileSize(f.size)}{f.status ? ` · ${f.status}` : ""}</span>
                  )}
                </span>
                {busy && <span aria-hidden="true" className="[font-size:var(--text-sm)] text-muted-foreground tabular-nums">{Math.round(f.progress)}%</span>}
                <button type="button" onClick={() => remove(f)} aria-label={`Remove ${f.name}`} disabled={disabled}
                  className={cn(buttonVariants({ variant: "ghost" }), "shrink-0 [padding-inline:0.6em]")}>Remove</button>
              </li>
            );
          })}
        </ul>
      )}
      <p id={liveId} role="status" className="sr-only">{news}</p>
    </div>
  );
}
