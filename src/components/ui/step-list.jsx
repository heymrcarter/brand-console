import { Check } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";

const WORDS = { done: "Done", current: "You are here", upcoming: "Not started" };

/**
 * Step list. Shows the steps of a task, which ones are done, and which one is next.
 * Use it for tasks with 3 to 6 named steps, like signing up for a plan.
 *
 * Give each step a `status` ("done", "current", or "upcoming"), or pass `current` (the index of the current step).
 * Done steps with an `href` or `onClick` become links back to that step.
 */
export function StepList({ steps = [], current, dir, label = "Steps in this task", words = WORDS, className }) {
  const s = comp("stepper");
  const d = (dir || s.dir || "col") === "row" ? "row" : "col";
  const total = steps.length;
  return (
    <ol aria-label={label}
      className={cn("m-0 p-0 list-none flex [gap:var(--gap)] [font-family:var(--font-ui,var(--font-body))]", d === "col" ? "flex-col" : "flex-row flex-wrap", className)}>
      {steps.map((step, i) => {
        const status = step.status || (current == null ? "upcoming" : i < current ? "done" : i === current ? "current" : "upcoming");
        const isDone = status === "done", isCur = status === "current";
        const canGoBack = isDone && (step.href || step.onClick);
        const Title = canGoBack ? (step.href ? "a" : "button") : "span";
        return (
          <li key={step.id ?? i} aria-current={isCur ? "step" : undefined}
            className={cn("flex [gap:0.7em] items-start min-w-0", d === "row" && "flex-col flex-[1_1_120px]", !isDone && !isCur && "text-muted-foreground")}>
            <span aria-hidden="true"
              className={cn("shrink-0 inline-flex items-center justify-center size-[2em] rounded-full border-2 font-bold",
                isDone ? "bg-success border-success text-background" : isCur ? "bg-primary border-primary-edge text-primary-foreground" : "bg-card border-input")}>
              {isDone ? <Check strokeWidth={3} className="size-[1.1em]" /> : i + 1}
            </span>
            <span className="flex flex-col min-w-0 pt-[0.15em]">
              <Title
                {...(Title === "a" ? { href: step.href } : {})}
                {...(Title === "button" ? { type: "button", onClick: step.onClick } : {})}
                className={cn("font-bold",
                  canGoBack && "self-start text-link underline underline-offset-4 cursor-pointer bg-transparent border-0 p-0 text-left [font:inherit] [font-weight:700] [min-height:calc(var(--control-h)*0.6)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px] rounded-sm")}>
                <span className="sr-only">Step {i + 1} of {total}: </span>
                {step.label}
              </Title>
              <span className="[font-size:var(--text-sm)] text-muted-foreground">{step.statusText || words[status]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
