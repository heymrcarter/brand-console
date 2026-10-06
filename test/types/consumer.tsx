// Uses the package by its name, like an app would. If the types are wrong, `npm run check:types` fails.
// Lines marked @ts-expect-error must stay errors: they prove the types catch mistakes.
import { useRef } from "react";
import {
  Button, buttonVariants, TextField, Select, Dialog, DialogClose, Combobox, defaultFilter,
  FieldLabel, FieldHint, FieldError, Alert, DataTable, useToast, pageList, KINDS, applyMask, toRaw,
  type ComboboxOption,
} from "brand-console";
import settings from "brand-console/settings.json";
import tokens from "brand-console/tokens.resolved.json";

export function Form() {
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const select = useRef<HTMLButtonElement | HTMLSelectElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const pick = (o: ComboboxOption | null) => o && toast(`You picked ${o.label}.`);
  const found: ComboboxOption[] = defaultFilter([{ value: "a", label: "Aspirin" }], "asp");
  const pages: Array<number | "gap"> = pageList(4, 20);
  const zip: string = applyMask(toRaw("606011234", KINDS.zip.mask), KINDS.zip.mask);
  return (
    <form>
      <Button ref={button} variant="outline" loading={false} onClick={() => input.current?.focus()}>Save</Button>
      <a className={buttonVariants({ variant: "primary", fullWidth: true })} href="/pay">Pay my bill</a>
      <TextField ref={input} label="ZIP code" hint="Like 12345" width={10} name="zip" autoComplete="postal-code" defaultValue={zip} />
      <Select ref={select} label="State" options={["Illinois", { value: "WI", label: "Wisconsin" }]} onValueChange={(v: string) => v.toUpperCase()} />
      <Combobox ref={search} label="Medicine" options={["Aspirin"]} source={async (q) => [q]} onSelect={pick} minChars={2} />
      <Dialog ref={box} title="Delete this address?" trigger={<Button>Delete</Button>} actions={<DialogClose asChild><Button>Cancel</Button></DialogClose>} />
      <FieldLabel htmlFor="x" optional>Name</FieldLabel>
      <FieldHint id="h">Help</FieldHint>
      <FieldError id="e">Wrong</FieldError>
      <Alert tone="info" title="Heads up">Loose props still work.</Alert>
      <DataTable caption="Claims" columns={[]} rows={[]} />
      <p style={{ color: tokens.color.northfield.light.primary.$value.hex }}>{found.length} {pages.length} {String(settings != null)}</p>
      {/* @ts-expect-error: not a button look */}
      <Button variant="huge">No</Button>
      {/* @ts-expect-error: TextField's ref is an input, not a div */}
      <TextField ref={box} label="Wrong ref" />
      {/* @ts-expect-error: Dialog needs a title */}
      <Dialog />
    </form>
  );
}
