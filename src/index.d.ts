// Types for apps written in TypeScript. The components are plain JavaScript (JSX); this file describes them.
// It is written by hand. The main form parts have full types. The rest list their prop names so your editor
// can suggest them, but they accept any value for now.
// When you add or rename an export in src/index.js, add it here too. `npm test` fails if one is missing,
// and `npm run check:types` checks that this file is valid TypeScript.
import type * as React from "react";

/** Known prop names show up in your editor. Other props are allowed, so these types never block you. */
type Loose<K extends string> = { [P in K]?: any } & { [prop: string]: any };

/** One choice in a list. A plain string means the value and the words are the same. */
export type Choice = string | { value: string; label: string };

/** Props every form field shares. They match the label, help text, and error parts below. */
export interface FieldProps {
  /** The words above the box. Always give one. */
  label?: React.ReactNode;
  /** Help text under the label, like "For example, 3 27 1952". */
  hint?: React.ReactNode;
  /** Says what is wrong and how to fix it. When set, the box is marked as not valid. */
  error?: React.ReactNode;
  /** Adds "(optional)" after the label. */
  optional?: boolean;
  className?: string;
}

// ---- Button -------------------------------------------------------------------------------------

export type ButtonVariant = "primary" | "outline" | "quiet" | "ghost" | "danger";

/** The class names for a button look. Use it to style a link or other element like a button. */
export declare function buttonVariants(props?: { variant?: ButtonVariant | null; fullWidth?: boolean | null; className?: string; class?: string }): string;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  /** Shows a spinner, turns the button off, and sets aria-busy. */
  loading?: boolean;
  /** An icon before the words. Hidden while loading. */
  icon?: React.ReactNode;
  /** Puts the button look on the one child element, like a link, instead of a <button>. */
  asChild?: boolean;
}
/** The ref points to the <button>, or to the child element when asChild is on. */
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

// ---- Text field ---------------------------------------------------------------------------------

export interface TextFieldProps extends FieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  /** How wide the box is, in letters. Use "full" to fill the space. */
  width?: "full" | 2 | 4 | 10 | 20;
}
/** The ref points to the <input>. */
export declare const TextField: React.ForwardRefExoticComponent<TextFieldProps & React.RefAttributes<HTMLInputElement>>;

// ---- Select -------------------------------------------------------------------------------------

export interface SelectProps extends FieldProps {
  options?: Choice[];
  /** Words shown before anything is picked. Default "Choose one". */
  placeholder?: string;
  /** The picked value, when your app controls it. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /** The form field name. The picked value is sent with the form. */
  name?: string;
  id?: string;
  /** true always uses the browser's own select, false never does. Left out, phones and tablets get it. */
  native?: boolean;
}
/** The ref points to the control people focus: the <button> on a computer, or the <select> on a phone or tablet. */
export declare const Select: React.ForwardRefExoticComponent<SelectProps & React.RefAttributes<HTMLButtonElement | HTMLSelectElement>>;

// ---- Dialog -------------------------------------------------------------------------------------

export interface DialogProps {
  /** The button that opens the pop-up. */
  trigger?: React.ReactNode;
  /** The question the pop-up asks. It names the pop-up for screen readers. */
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** The buttons at the bottom, like "Delete this address" and "Cancel". */
  actions?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
/** The ref points to the pop-up box (role="dialog"). It is null while the pop-up is closed. */
export declare const Dialog: React.ForwardRefExoticComponent<DialogProps & React.RefAttributes<HTMLDivElement>>;
/** Closes the pop-up it is inside. Use asChild to make your own button close it. */
export declare const DialogClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>;

// ---- Combobox -----------------------------------------------------------------------------------

export interface ComboboxOption { value: string; label: string; /** A second, smaller line under the words. */ hint?: string }

/** The default matcher. Options that contain the typed letters come first; it forgives small spelling mistakes. */
export declare function defaultFilter(options: ComboboxOption[], query: string): ComboboxOption[];

export interface ComboboxProps extends FieldProps {
  options?: Array<string | ComboboxOption>;
  /** Gets the typed words and returns (or promises) the matches. Use it instead of options to ask a server. */
  source?: (query: string) => Array<string | ComboboxOption> | Promise<Array<string | ComboboxOption>>;
  /** Picks which options match. Default: defaultFilter. */
  filter?: (options: ComboboxOption[], query: string) => ComboboxOption[];
  value?: string;
  defaultValue?: string;
  /** Called with the picked option, or null when the box is cleared. */
  onSelect?: (option: ComboboxOption | null) => void;
  onInputChange?: (text: string) => void;
  /** Lets people keep words that are not in the list. */
  allowFreeText?: boolean;
  /** How many letters to type before matches show. Default comes from the Brand Console (2). */
  minChars?: number;
  placeholder?: string;
  /** What to show when nothing matches. A function gets the typed words. */
  noMatches?: React.ReactNode | ((query: string) => React.ReactNode);
  /** The form field name. The picked value is sent with the form. */
  name?: string;
  disabled?: boolean;
  id?: string;
}
/** The ref points to the text <input>. */
export declare const Combobox: React.ForwardRefExoticComponent<ComboboxProps & React.RefAttributes<HTMLInputElement>>;

// ---- Field parts --------------------------------------------------------------------------------

export declare function FieldLabel(props: { htmlFor?: string; children?: React.ReactNode; optional?: boolean; as?: React.ElementType; className?: string }): React.ReactElement;
export declare function FieldHint(props: { id?: string; children?: React.ReactNode }): React.ReactElement | null;
export declare function FieldError(props: { id?: string; children?: React.ReactNode }): React.ReactElement | null;

// ---- Helpers ------------------------------------------------------------------------------------

/** "June A. Morris" becomes "JM". Titles like "Dr." are skipped. */
export declare function initials(name?: string): string;
/** A date as MM/DD/YYYY, or "" for no date. */
export declare function formatDate(date: Date | null | undefined): string;
/** Reads "10/14/2026" (or with dashes, dots, or spaces). Returns null if it is not a real date. */
export declare function parseDate(text: string | null | undefined): Date | null;
/** 2048 becomes "2 KB". */
export declare function fileSize(bytes?: number): string;
export interface FieldKind { mask: string; example: string; autoComplete: string; type?: string; width: string; prefix?: string }
/** The built-in kinds for FormattedField: phone, zip, member-id, ssn-last4. */
export declare const KINDS: Record<"phone" | "zip" | "member-id" | "ssn-last4", FieldKind>;
/** Keeps only the letters and numbers that fit the mask. */
export declare function toRaw(text: string | null | undefined, mask: string): string;
/** Puts the mask's dashes, spaces, and brackets back in. */
export declare function applyMask(raw: string, mask: string): string;
/** The class names for an icon button's box. */
export declare function iconButtonBox(props?: { variant?: "primary" | "outline" | "ghost" | null; className?: string; class?: string }): string;
/** The page numbers to show, with "gap" where pages are skipped. */
export declare function pageList(page: number, pages: number): Array<number | "gap">;
/** "14:30" becomes "2:30 PM" (or "14:30" with "24h"). */
export declare function timeLabel(value: string, format?: "12h" | "24h"): string;

export interface ToastOptions { id?: string; message?: React.ReactNode; /** Seconds to stay. 0 keeps it until people close it. */ duration?: number; action?: { label: string; onClick: () => void }; [option: string]: any }
export declare function ToastProvider(props: { children?: React.ReactNode; label?: string }): React.ReactElement;
export declare function Toaster(props: { className?: string }): React.ReactElement | null;
/** Shows a toast: toast("Saved.") or toast({ message, action: { label, onClick } }). Use it inside a ToastProvider. */
export declare function useToast(): { toast: (options: string | ToastOptions) => string; dismiss: (id: string) => void };
export declare const DrawerClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>;
export declare const PopoverClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>;

// ---- Other components ---------------------------------------------------------------------------
// These list their prop names. See each component's story in Storybook for what the props do.
export declare const Textarea: React.FC<Loose<"label" | "hint" | "error" | "optional" | "maxLength" | "rows" | "id" | "className" | "defaultValue" | "value" | "onChange">>;
export declare const Checkbox: React.FC<Loose<"label" | "hint" | "error" | "checked" | "defaultChecked" | "onCheckedChange" | "disabled" | "id" | "className">>;
export declare const RadioGroup: React.FC<Loose<"legend" | "hint" | "error" | "options" | "value" | "defaultValue" | "onValueChange" | "layout" | "className">>;
export declare const Switch: React.FC<Loose<"label" | "hint" | "checked" | "defaultChecked" | "onCheckedChange" | "disabled" | "className">>;
export declare const DateInput: React.FC<Loose<"legend" | "hint" | "error" | "errorField" | "value" | "onChange" | "className">>;
export declare const ErrorSummary: React.FC<Loose<"title" | "errors" | "autoFocus" | "className">>;
export declare const Alert: React.FC<Loose<"tone" | "title" | "children" | "className">>;
export declare const Badge: React.FC<Loose<"tone" | "icon" | "children" | "className">>;
export declare const Card: React.FC<Loose<"title" | "children" | "action" | "className" | "as">>;
export declare const Tabs: React.FC<Loose<"tabs" | "value" | "defaultValue" | "onValueChange" | "label" | "className">>;
export declare const Accordion: React.FC<Loose<"items" | "multiple" | "defaultValue" | "className">>;
export declare const Icon: React.FC<Loose<"as" | "label" | "size" | "className">>;
export declare const AppointmentSlots: React.FC<Loose<"days" | "value" | "defaultValue" | "onValueChange" | "day" | "defaultDay" | "onDayChange" | "timezone" | "visitLength" | "dayLegend" | "timeLegend" | "shape" | "className">>;
export declare const Avatar: React.FC<Loose<"name" | "src" | "size" | "nameShown" | "className">>;
export declare const Banner: React.FC<Loose<"tone" | "message" | "children" | "action" | "dismissible" | "onDismiss" | "label" | "focusOnDismiss" | "className">>;
export declare const Breadcrumbs: React.FC<Loose<"items" | "sep" | "label" | "className">>;
export declare const ButtonGroup: React.FC<Loose<"label" | "options" | "value" | "defaultValue" | "onChange" | "onValueChange" | "disabled" | "className">>;
export declare const InsetText: React.FC<Loose<"children" | "className">>;
export declare const WarningText: React.FC<Loose<"title" | "children" | "className">>;
export declare const BarChart: React.FC<Loose<"title" | "summary" | "data" | "format" | "valueName" | "labelName" | "labels" | "tableView" | "className">>;
export declare const LineChart: React.FC<Loose<"title" | "summary" | "data" | "compare" | "format" | "valueName" | "labelName" | "labels" | "tableView" | "className">>;
export declare const Consent: React.FC<Loose<"title" | "summary" | "terms" | "termsLabel" | "downloadHref" | "downloadLabel" | "agreeLabel" | "sign" | "date" | "submitLabel" | "onSign" | "className">>;
export declare const Container: React.FC<Loose<"size" | "as" | "className" | "style" | "children">>;
export declare const CostEstimate: React.FC<Loose<"service" | "youPay" | "planPays" | "total" | "assumptions" | "detailsLabel" | "detailsHref" | "onDetails" | "className">>;
export declare const DataTable: React.FC<Loose<"caption" | "captionHidden" | "columns" | "rows" | "rowKey" | "rowLabel" | "selectable" | "selected" | "defaultSelected" | "onSelectedChange" | "sort" | "defaultSort" | "onSort" | "stripes" | "header" | "toolbar" | "emptyText" | "className">>;
export declare const DatePicker: React.FC<Loose<"label" | "hint" | "error" | "optional" | "value" | "defaultValue" | "onChange" | "min" | "max" | "disabledDates" | "unavailableNote" | "today" | "weekStart" | "disabled" | "id" | "name" | "className">>;
export declare const Divider: React.FC<Loose<"label" | "decorative" | "orientation" | "weight" | "className">>;
export declare const Drawer: React.FC<Loose<"trigger" | "title" | "description" | "children" | "footer" | "side" | "width" | "open" | "defaultOpen" | "onOpenChange" | "closeLabel" | "className">>;
export declare const EmptyState: React.FC<Loose<"icon" | "title" | "text" | "children" | "action" | "headingLevel" | "className">>;
export declare const ErrorMessage: React.FC<Loose<"id" | "message" | "children" | "announce" | "className">>;
export declare const Fieldset: React.FC<Loose<"legend" | "hint" | "error" | "headingLevel" | "children" | "id" | "className">>;
export declare const FileUpload: React.FC<Loose<"label" | "hint" | "error" | "optional" | "accept" | "maxSize" | "multiple" | "capture" | "files" | "onChange" | "onUpload" | "buttonText" | "style" | "disabled" | "id" | "name" | "className">>;
export declare const FilterChips: React.FC<Loose<"options" | "value" | "defaultValue" | "onValueChange" | "onClear" | "label" | "resultText" | "clearLabel" | "className">>;
export declare const Footer: React.FC<Loose<"columns" | "legal" | "brandName" | "year" | "variant" | "headingLevel" | "className">>;
export declare const FormattedField: React.FC<Loose<"kind" | "mask" | "example" | "label" | "hint" | "error" | "optional" | "value" | "defaultValue" | "onValueChange" | "width" | "id" | "className">>;
export declare const Grid: React.FC<Loose<"columns" | "gap" | "as" | "className" | "style" | "children">>;
export declare const GridItem: React.FC<Loose<"span" | "as" | "className" | "style" | "children">>;
export declare const Header: React.FC<Loose<"logo" | "brandName" | "homeHref" | "links" | "account" | "phone" | "showPhone" | "variant" | "skipTo" | "navLabel" | "className">>;
export declare const HelpDrawer: React.FC<Loose<"term" | "triggerLabel" | "trigger" | "title" | "children" | "topics" | "phone" | "open" | "defaultOpen" | "onOpenChange" | "side" | "width">>;
export declare const IconButton: React.FC<Loose<"icon" | "label" | "variant" | "showLabel" | "labelPosition" | "tooltip" | "type" | "disabled" | "className">>;
export declare const LabResult: React.FC<Loose<"test" | "value" | "unit" | "range" | "flag" | "date" | "explainHref" | "explainLabel" | "display" | "format" | "headingLevel" | "className">>;
export declare const LabelHint: React.FC<Loose<"htmlFor" | "label" | "children" | "hint" | "optional" | "labelId" | "hintId" | "as" | "className">>;
export declare const Link: React.FC<Loose<"href" | "variant" | "external" | "as" | "className" | "children">>;
export declare const List: React.FC<Loose<"items" | "lines" | "label" | "className">>;
export declare const MedicationItem: React.FC<Loose<"drug" | "purpose" | "sig" | "refillsLeft" | "status" | "statusText" | "nextFill" | "pharmacy" | "onRefill" | "refillLabel" | "onDetails" | "refilling" | "message" | "instructions" | "headingLevel" | "className">>;
export declare const MemberCard: React.FC<Loose<"member" | "rx" | "phone" | "tty" | "brandName" | "onDownload" | "onPrint" | "style" | "headingLevel" | "className">>;
export declare const Menu: React.FC<Loose<"label" | "trigger" | "items" | "align" | "open" | "onOpenChange" | "className">>;
export declare const NumberField: React.FC<Loose<"label" | "hint" | "error" | "optional" | "kind" | "value" | "defaultValue" | "onValueChange" | "min" | "max" | "step" | "stepper" | "name" | "disabled" | "id" | "className">>;
export declare const Pagination: React.FC<Loose<"page" | "total" | "pageSize" | "onPageChange" | "hrefFor" | "itemLabel" | "label" | "variant" | "className">>;
export declare const PlanCompare: React.FC<Loose<"plans" | "rows" | "current" | "recommended" | "onChoose" | "caption" | "highlight" | "className">>;
export declare const Popover: React.FC<Loose<"trigger" | "triggerLabel" | "title" | "children" | "action" | "side" | "align" | "open" | "defaultOpen" | "onOpenChange" | "className">>;
export declare const Progress: React.FC<Loose<"value" | "max" | "label" | "hint" | "show" | "className">>;
export declare const ProviderCard: React.FC<Loose<"provider" | "onBook" | "bookLabel" | "photo" | "headingLevel" | "className">>;
export declare const SearchField: React.FC<Loose<"label" | "hideLabel" | "hint" | "placeholder" | "value" | "defaultValue" | "onValueChange" | "onSubmit" | "onClear" | "results" | "name" | "disabled" | "id" | "className">>;
export declare const SessionTimeout: React.FC<Loose<"open" | "timeoutMinutes" | "warnMinutes" | "onStay" | "onSignOut" | "onTimeout" | "title" | "message">>;
export declare const SideNav: React.FC<Loose<"items" | "current" | "label" | "currentStyle" | "className">>;
export declare const Skeleton: React.FC<Loose<"shape" | "lines" | "width" | "height" | "label" | "className">>;
export declare const SkipLink: React.FC<Loose<"target" | "children" | "className">>;
export declare const Spinner: React.FC<Loose<"label" | "size" | "words" | "className">>;
export declare const Stack: React.FC<Loose<"direction" | "gap" | "align" | "justify" | "wrap" | "as" | "className" | "children">>;
export declare const StepList: React.FC<Loose<"steps" | "current" | "dir" | "label" | "words" | "className">>;
export declare const SummaryList: React.FC<Loose<"rows" | "className">>;
export declare const TimePicker: React.FC<Loose<"label" | "hint" | "error" | "optional" | "value" | "defaultValue" | "onValueChange" | "min" | "max" | "step" | "unavailable" | "format" | "placeholder" | "name" | "disabled" | "className">>;
export declare const Tooltip: React.FC<Loose<"content" | "side" | "tone" | "children" | "delayDuration" | "open" | "defaultOpen" | "onOpenChange" | "className">>;
export declare const TermTooltip: React.FC<Loose<"term" | "children" | "definition" | "title" | "side" | "tone" | "className">>;
