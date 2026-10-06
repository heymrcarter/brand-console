import { useId } from "react";
import { cn } from "../../lib/utils";

const money = (n) =>
  typeof n === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n) : n;

/**
 * Cost estimate. Shows what a service costs, what the plan pays, and what the member pays.
 * Use it before a visit or test so people know what to expect. It always says it is an estimate.
 */
export function CostEstimate({
  service, youPay = 0, planPays = 0, total,
  assumptions = "This is an estimate. Your cost may change.",
  detailsLabel = "How we worked this out", detailsHref, onDetails,
  className,
}) {
  const gid = useId();
  const sum = typeof total === "number" ? total : (Number(youPay) || 0) + (Number(planPays) || 0);
  const youShare = sum > 0 ? Math.max(0, Math.min(1, youPay / sum)) : 0;
  const link = "text-link underline underline-offset-4 [min-height:var(--control-h)] inline-flex items-center cursor-pointer bg-transparent border-0 p-0 [font:inherit] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]";

  return (
    <section aria-labelledby={gid + "-t"}
      className={cn("flex flex-col min-w-0 bg-panel [backdrop-filter:blur(var(--panel-blur))] text-card-foreground [gap:calc(var(--gap)*0.75)] [padding:var(--pad)] [border-radius:var(--card-radius)] [box-shadow:var(--card-shadow)] [border:var(--card-border)]", className)}>
      <div>
        <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground">Estimate for</p>
        <h3 id={gid + "-t"} className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">{service}</h3>
      </div>

      <div>
        <p className="m-0 text-muted-foreground">You pay about</p>
        <p className="m-0 [font-family:var(--font-heading)] [font-size:var(--text-h1)] [font-weight:var(--heading-w)] tabular-nums leading-[1.1]">{money(youPay)}</p>
      </div>

      {/* The bar is a picture of the words below it, so screen readers skip it. */}
      <div aria-hidden="true" className="flex h-4 rounded-full overflow-hidden gap-[2px] bg-card">
        {youShare > 0 && <span className="block bg-primary-edge" style={{ flexGrow: youShare, minWidth: 6 }} />}
        {youShare < 1 && <span className="block bg-secondary [box-shadow:inset_0_0_0_2px_var(--primary-edge)] rounded-r-full" style={{ flexGrow: 1 - youShare, minWidth: 6 }} />}
      </div>

      <dl className="m-0 grid gap-x-[var(--gap)] gap-y-1 grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))]">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block size-[0.9em] shrink-0 rounded-[3px] bg-primary-edge" />
          <dt>You pay</dt><dd className="m-0 font-bold tabular-nums">{money(youPay)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block size-[0.9em] shrink-0 rounded-[3px] bg-secondary border-2 border-primary-edge" />
          <dt>Your plan pays</dt><dd className="m-0 font-bold tabular-nums">{money(planPays)}</dd>
        </div>
        <div className="flex items-center gap-2 col-span-full border-t border-border pt-2">
          <dt>Total cost</dt><dd className="m-0 font-bold tabular-nums">{money(sum)}</dd>
        </div>
      </dl>

      <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground">
        {assumptions}{" "}
        {detailsHref ? <a href={detailsHref} className={link}>{detailsLabel}</a>
          : onDetails ? <button type="button" onClick={onDetails} className={link}>{detailsLabel}</button> : null}
      </p>
    </section>
  );
}
