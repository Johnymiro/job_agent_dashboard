import { Icon } from "@/components/icons";
import { CodeBlock, Inline, Paras } from "@/components/prep/parts";
import type { Block, NoteTone } from "@/lib/learn/types";

const NOTE: Record<NoteTone, { box: string; label: string }> = {
  tip: { box: "border-good/50 bg-good/5", label: "text-good" },
  pitfall: { box: "border-warn/50 bg-warn/5", label: "text-warn" },
  test: { box: "border-info/50 bg-info/5", label: "text-info" },
  note: { box: "border-line bg-surface-2/50", label: "text-muted" },
};

const TEXT = "text-[15.5px] leading-[1.75] text-fg-2";

/** A lesson body. The first block sits flush with the top. */
export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="[&>*:first-child]:mt-0">
      {blocks.map((b, k) => (
        <BlockView key={k} b={b} />
      ))}
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "h2":
      return (
        <h2 id={b.id} className="mt-12 scroll-mt-20 border-t border-line pt-7 text-[22px] font-semibold tracking-tight text-fg">
          <Inline text={b.text} />
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-7 text-base font-semibold text-fg">
          <Inline text={b.text} />
        </h3>
      );
    case "p":
      return (
        <p className={`mt-4 ${TEXT}`}>
          <Inline text={b.text} />
        </p>
      );
    case "code":
      return <CodeBlock src={b.src} lang={b.lang} />;
    case "list": {
      const List = b.ordered ? "ol" : "ul";
      return (
        <List
          className={`mt-4 space-y-1.5 pl-5 ${TEXT} ${
            b.ordered ? "list-decimal marker:font-mono marker:text-xs marker:text-subtle" : "list-disc marker:text-accent"
          }`}
        >
          {b.items.map((x, k) => (
            <li key={k} className="pl-1">
              <Inline text={x} />
            </li>
          ))}
        </List>
      );
    }
    case "task":
      return (
        <ul className={`mt-4 space-y-1.5 ${TEXT}`}>
          {b.items.map((x, k) => (
            <li key={k} className="flex items-start gap-2.5">
              <Icon name={x.done ? "check" : "circle"} className={`mt-1.5 h-3.5 w-3.5 ${x.done ? "text-good" : "text-faint"}`} />
              <span>
                <Inline text={x.text} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "note":
      return (
        <aside className={`mt-5 border-l-2 px-4 py-3 ${NOTE[b.tone].box}`}>
          {b.label && <div className={`font-mono text-[11px] uppercase tracking-[0.14em] ${NOTE[b.tone].label}`}>{b.label}</div>}
          <Paras text={b.text} className={`text-[15px] leading-relaxed text-fg-2 ${b.label ? "mt-1" : ""}`} />
        </aside>
      );
    case "table":
      return (
        <div className="mt-5 overflow-x-auto border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2/60">
                {b.head.map((h, k) => (
                  <th key={k} className="px-3 py-2 text-left font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-subtle">
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {b.rows.map((r, k) => (
                <tr key={k}>
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-2 align-top leading-relaxed text-fg-2">
                      <Inline text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
