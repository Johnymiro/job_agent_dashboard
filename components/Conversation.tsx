"use client";

import { ThreadItem } from "@/lib/api";
import { Icon } from "@/components/icons";
import { StatusBadge, fmtTime } from "@/components/ui";

const KIND_LABEL: Record<string, string> = {
  application: "application",
  pitch: "pitch",
  followup: "follow-up",
};

/** The whole thread, oldest first: what went out (or still waits to) and what
 *  they wrote back. Shown in the Outbox and in the job / lead drawer. */
export function Conversation({ items, current, className = "mt-4" }: { items: ThreadItem[]; current: number; className?: string }) {
  return (
    <ol className={`space-y-3 border-l border-line pl-5 ${className}`}>
      {items.map((t) => {
        const ours = t.who === "us";
        const here = ours && t.id === current;
        const unsent = ours && !t.at;
        const what = !ours ? null : t.kind === "reply" ? (t.by_you ? "your reply" : "agent's reply") : KIND_LABEL[t.kind || ""] || t.kind;
        return (
          <li key={`${t.who}-${t.id}`} className="relative">
            <span
              className={`absolute -left-[25.5px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${
                ours ? (unsent ? "border border-subtle bg-surface" : "bg-accent") : "bg-plum"
              }`}
            />
            <div
              className={`rounded-lg border p-4 ${ours ? "border-line bg-surface-2/40" : "border-plum/30 bg-plum/5"} ${
                here ? "ring-1 ring-accent/50" : ""
              } ${unsent ? "border-dashed" : ""}`}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <Icon name={ours ? "send" : "message"} className={`h-3.5 w-3.5 ${ours ? "text-accent" : "text-plum"}`} />
                <span className="font-medium text-fg-2">{ours ? "You" : t.from_name || t.from_email}</span>
                {ours ? <span className="text-subtle">{what} · to {t.to_email}</span> : t.from_name && <span className="text-subtle">{t.from_email}</span>}
                <span className="text-subtle">· {unsent ? "not sent yet" : fmtTime(t.at)}</span>
                {ours && t.status && !["sent", "replied"].includes(t.status) && (
                  <StatusBadge status={t.status === "draft" ? "ready" : t.status} />
                )}
                {here && <span className="ml-auto font-medium text-accent">this email</span>}
              </div>
              {t.subject && <div className="mb-1 text-xs font-medium text-muted">{t.subject}</div>}
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm text-fg">{t.body}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
