import { Accordion as A } from "radix-ui";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

/**
 * Accordion. A list of headings that open to show more, like questions and answers.
 * Never hide the most important information in one.
 */
export function Accordion({ items = [], multiple = false, defaultValue, className }) {
  const s = comp("accordion"); const plus = s.icon === "plus";
  const rootProps = multiple ? { type: "multiple", defaultValue: defaultValue || [] } : { type: "single", collapsible: true, defaultValue };
  return (
    <A.Root {...rootProps} className={cn("border-t border-border", className)}>
      {items.map((it) => (
        <A.Item key={it.value} value={it.value} className="border-b border-border">
          <A.Header className="m-0">
            <A.Trigger className="group flex w-full items-center justify-between gap-3 text-left cursor-pointer font-bold text-link bg-transparent border-0 [min-height:var(--control-h)] [font-family:var(--font-body)] [font-size:var(--text-base)] py-[calc(var(--gap)*0.4)] focus-visible:[outline:3px_solid_var(--ring)]">
              {it.title}
              {plus ? (<><Plus aria-hidden="true" className="size-[1.1em] shrink-0 group-data-[state=open]:hidden" /><Minus aria-hidden="true" className="size-[1.1em] shrink-0 hidden group-data-[state=open]:block" /></>)
                : <ChevronDown aria-hidden="true" className="size-[1.1em] shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />}
            </A.Trigger>
          </A.Header>
          <A.Content className="pb-[var(--gap)]">{it.content}</A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
