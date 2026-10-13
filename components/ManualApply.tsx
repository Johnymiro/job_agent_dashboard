"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Opportunity, getOpportunities } from "@/lib/api";
import { Icon } from "@/components/icons";
import { MarkAppliedButton, OpportunityDrawer } from "@/components/OpportunityTable";
import {
  Card,
  Empty,
  Notice,
  RegionBadge,
  ScoreBadge,
  Segmented,
  Spinner,
  buttonClass,
  humanize,
  timeAgo,
  usd,
} from "@/components/ui";

type Scope = "high" | "all";

/** The Outbox's "Manually apply" list: jobs to apply to on their own site. */
export const manualApplyQuery = (scope: Scope, q: string) => ({
  queryKey: ["opps", "manual-apply", scope, q],
  queryFn: () =>
    getOpportunities({
      kind: "job",
      status: "apply",
      high_pay: scope === "high" || undefined,
      sort: "pay",
      q: q || undefined,
      limit: 200,
    }),
});

/** Outbox → Manually apply: well-paid jobs whose posting has an application form
 *  and no recruiting inbox or person to email, best paid first. Open one for the
 *  cover note, apply on their site, then mark it Applied. */
export function ManualApply({ q }: { q: string }) {
  const [scope, setScope] = useState<Scope>("high");
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, isLoading, isError } = useQuery({
    ...manualApplyQuery(scope, q),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const items = data?.items || [];

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: "high", label: "High pay", title: "Stated salary from $90k (Settings), or a UK / IE / DACH / Benelux / Nordic / US employer" },
            { value: "all", label: "All to apply", title: "Every job waiting for you to apply on their site" },
          ]}
        />
        {data && <span className="text-xs text-subtle">{data.total} jobs · highest salary first</span>}
      </div>
      <Notice tone="info" className="mt-3">
        Big employers hire through their application form, not cold email. Open one, write the cover note, apply on
        their site, then mark it Applied.
      </Notice>

      <Card className="mt-3 overflow-hidden">
        {isLoading && <div className="p-5"><Spinner /></div>}
        {isError && <Empty icon="alert">Could not load. Is the API running?</Empty>}
        {data && items.length === 0 && (
          <Empty icon="briefcase">
            {scope === "high" ? "No well-paid jobs waiting right now." : "Nothing waiting for you to apply."}
          </Empty>
        )}
        <div className="divide-y divide-line">
          {items.map((o) => (
            <Row key={o.id} o={o} onOpen={() => setOpenId(o.id)} />
          ))}
        </div>
      </Card>

      {openId !== null && <OpportunityDrawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Row({ o, onOpen }: { o: Opportunity; onOpen: () => void }) {
  const link = o.apply_url || o.url;
  return (
    <div
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      tabIndex={0}
      className="flex cursor-pointer flex-wrap items-start gap-3 px-4 py-3 outline-none transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2"
    >
      <ScoreBadge score={o.score} />
      {/* min width: on a phone the buttons wrap below instead of squeezing the title */}
      <div className="min-w-[13rem] flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-fg" title={o.title}>{o.title}</span>
          <span className="ml-auto shrink-0 text-xs text-subtle">{timeAgo(o.found_at)}</span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted">
          <span className="max-w-[60%] shrink-0 truncate font-medium text-fg-2">{o.company || "—"}</span>
          <RegionBadge region={o.region} />
          <span className="truncate" title={o.location || undefined}>
            {[o.location, o.remote, o.engagement && humanize(o.engagement)].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <Pay o={o} />
          <span className="text-subtle">{o.source}</span>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {link && (
          <a
            className={buttonClass("primary", "sm")}
            href={link}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            Apply <Icon name="external" className="h-3.5 w-3.5" />
          </a>
        )}
        <MarkAppliedButton o={o} kind="job" />
      </div>
    </div>
  );
}

/** What it pays: the posting's own salary text, else the scorer's estimate, else
 *  the market that makes it well paid. */
function Pay({ o }: { o: Opportunity }) {
  const salary = o.salary || (o.est_value_usd ? `est. ${usd(o.est_value_usd)}/yr` : null);
  if (salary) {
    return (
      <span className={`rounded-sm px-1.5 py-px font-medium ${o.high_pay ? "bg-good/10 text-good" : "bg-surface-2 text-muted"}`}>
        {salary}
      </span>
    );
  }
  if (o.high_pay) {
    return (
      <span className="rounded-sm bg-good/10 px-1.5 py-px font-medium text-good" title="A well-paying market; no salary stated">
        {o.high_pay} employer
      </span>
    );
  }
  return <span className="text-subtle">no salary stated</span>;
}
