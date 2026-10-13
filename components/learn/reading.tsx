"use client";

import { useState } from "react";

/* Lesson reading options. Readers are up to 35% faster in their best font, and the best font
   differs from person to person (Wallace et al., ACM TOCHI 2022), so font and size are a choice.
   `measure` keeps lines near 68 characters (50–75 reads best on screen); ch is the width of "0",
   which varies by font, so each one has its own (measured at 18px). */
export const READING_FONTS = {
  atkinson: { label: "Atkinson", css: "var(--font-atkinson), ui-sans-serif, system-ui, sans-serif", measure: "49ch" },
  literata: { label: "Literata", css: "var(--font-literata), Georgia, serif", measure: "59ch" },
  system: { label: "System", css: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", measure: "51ch" },
};

export const READING_SIZES = {
  s: { label: "Smaller", cls: "text-[16px] sm:text-[17px]", sample: "text-[12px]" },
  m: { label: "Default", cls: "text-[17px] sm:text-[18px]", sample: "text-[14px]" },
  l: { label: "Larger", cls: "text-[19px] sm:text-[20px]", sample: "text-[17px]" },
};

export type Reading = { font: keyof typeof READING_FONTS; size: keyof typeof READING_SIZES };

const KEY = "jobagent_reading";
const DEFAULT: Reading = { font: "atkinson", size: "m" };

/** The reader's choice, remembered in this browser. */
export function useReading() {
  const [reading, setReading] = useState<Reading>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        font: Object.hasOwn(READING_FONTS, saved.font) ? saved.font : DEFAULT.font,
        size: Object.hasOwn(READING_SIZES, saved.size) ? saved.size : DEFAULT.size,
      };
    } catch {
      return DEFAULT;
    }
  });
  const update = (patch: Partial<Reading>) => {
    const next = { ...reading, ...patch };
    setReading(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  return [reading, update] as const;
}

/** Font and size pickers; each option is drawn in the font / size it picks. */
export function ReadingPanel({ reading, onChange }: { reading: Reading; onChange: (patch: Partial<Reading>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border border-line bg-surface px-4 py-3">
      <Choice label="Font">
        {(Object.keys(READING_FONTS) as Reading["font"][]).map((k) => (
          <Option key={k} on={reading.font === k} onClick={() => onChange({ font: k })} style={{ fontFamily: READING_FONTS[k].css }}>
            {READING_FONTS[k].label}
          </Option>
        ))}
      </Choice>
      <Choice label="Size">
        {(Object.keys(READING_SIZES) as Reading["size"][]).map((k) => (
          <Option key={k} on={reading.size === k} onClick={() => onChange({ size: k })} title={READING_SIZES[k].label}>
            <span className={`inline-block w-5 text-center leading-5 ${READING_SIZES[k].sample}`}>A</span>
          </Option>
        ))}
      </Choice>
    </div>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex border border-line bg-bg p-0.5">
        {children}
      </div>
    </div>
  );
}

function Option({
  on,
  onClick,
  style,
  title,
  children,
}: {
  on: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      role="radio"
      aria-checked={on}
      aria-label={title}
      title={title}
      onClick={onClick}
      style={style}
      className={`rounded-sm px-2.5 py-1 text-sm transition-colors ${on ? "bg-accent/10 text-accent" : "text-muted hover:text-fg"}`}
    >
      {children}
    </button>
  );
}
