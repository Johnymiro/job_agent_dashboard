"use client";

/* The animation kit behind lesson diagrams (```viz blocks, see lib/learn/viz-ids.ts).

   <Viz> is the frame: optional code with the running line marked, the picture, a narrated
   caption and play / step controls. Its child is a function of the current step, so a diagram
   only says what the picture looks like at step s; the kit animates the changes:

   - every <Node id="…"> inside a <Stage> glides from where it was to where it is now (FLIP),
     and fades in when it's new;
   - <Arrow from="…" to="…"> measures two nodes and draws a curve between them. It draws itself
     in when it appears and swings over when its target changes.
   - colours, opacity and sizes ease through CSS transitions (.viz-node in globals.css). */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Icon } from "@/components/icons";
import { Inline, highlight } from "@/components/prep/parts";

export type Tone = "fg" | "accent" | "info" | "warn" | "bad" | "plum" | "iris" | "orchid" | "faint";

/** Whole class names per tone, so Tailwind sees them. */
export const TONE: Record<Tone, { text: string; border: string; bg: string; solid: string }> = {
  fg: { text: "text-fg", border: "border-faint", bg: "bg-surface", solid: "bg-fg-2" },
  accent: { text: "text-accent", border: "border-accent/70", bg: "bg-accent/10", solid: "bg-accent" },
  info: { text: "text-info", border: "border-info/70", bg: "bg-info/10", solid: "bg-info" },
  warn: { text: "text-warn", border: "border-warn/70", bg: "bg-warn/10", solid: "bg-warn" },
  bad: { text: "text-bad", border: "border-bad/70", bg: "bg-bad/10", solid: "bg-bad" },
  plum: { text: "text-plum", border: "border-plum/70", bg: "bg-plum/10", solid: "bg-plum" },
  iris: { text: "text-iris", border: "border-iris/70", bg: "bg-iris/10", solid: "bg-iris" },
  orchid: { text: "text-orchid", border: "border-orchid/70", bg: "bg-orchid/10", solid: "bg-orchid" },
  faint: { text: "text-faint", border: "border-line", bg: "bg-surface-2/40", solid: "bg-faint" },
};

const EASE = "cubic-bezier(0.22, 0.8, 0.24, 1)";
const MOVE_MS = 650;
const SWING_MS = 550;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- the frame -----------------------------------------------------------------------

export interface Step {
  /** the narration; inline `code` and **bold** work */
  say: string;
  /** code line(s) to mark, 1-based: one line or an inclusive [from, to] range */
  line?: number | [number, number];
  /** time on this step while playing, when the default (from the caption's length) is wrong */
  ms?: number;
}

export interface Mode {
  id: string;
  label: string;
}

type PerMode<T> = T | ((mode: string) => T);
const pick = <T,>(v: PerMode<T>, mode: string): T => (typeof v === "function" ? (v as (m: string) => T)(mode) : v);

/** Time on a step while playing: enough to read the caption, and for the picture to settle. */
const dwell = (say: string) => Math.min(9000, Math.max(2800, 1500 + say.length * 52));

export function Viz({
  title,
  steps,
  code,
  lang = "python",
  modes,
  children,
}: {
  title: string;
  steps: PerMode<Step[]>;
  code?: PerMode<string>;
  lang?: string;
  /** alternative scenarios (e.g. index keys vs stable keys), switched in the header */
  modes?: Mode[];
  children: (s: number, mode: string) => React.ReactNode;
}) {
  const [mode, setMode] = useState(modes?.[0].id ?? "");
  const list = pick(steps, mode);
  const src = code === undefined ? undefined : pick(code, mode);
  const last = list.length - 1;
  const [at, setAt] = useState(0);
  const s = Math.min(at, last);
  const step = list[s];
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const fig = useRef<HTMLElement>(null);
  const ms = step.ms ?? dwell(step.say);

  useEffect(() => {
    if (!playing) return;
    if (s >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setAt(s + 1), ms);
    return () => clearTimeout(t);
  }, [playing, s, last, ms]);

  // starts by itself the first time it reaches the middle of the screen; pauses once it's out of view
  useEffect(() => {
    const el = fig.current;
    if (!el) return;
    const middle = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current && !reducedMotion()) {
          started.current = true;
          setPlaying(true);
        }
      },
      { rootMargin: "-30% 0px -30% 0px" },
    );
    const away = new IntersectionObserver(([e]) => !e.isIntersecting && setPlaying(false));
    middle.observe(el);
    away.observe(el);
    return () => {
      middle.disconnect();
      away.disconnect();
    };
  }, []);

  const go = (n: number) => {
    started.current = true;
    setPlaying(false);
    setAt(Math.max(0, Math.min(last, n)));
  };
  const play = () => {
    started.current = true;
    if (playing) return setPlaying(false);
    if (s >= last) setAt(0);
    setPlaying(true);
  };
  const choose = (m: string) => {
    started.current = true;
    setMode(m);
    setAt(0);
    setPlaying(true);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(s + 1);
    else if (e.key === "ArrowLeft") go(s - 1);
    else if (e.key === " " && e.target === e.currentTarget) play();
    else return;
    e.preventDefault();
  };

  const range = step.line === undefined ? null : typeof step.line === "number" ? [step.line, step.line] : step.line;

  return (
    <figure
      ref={fig}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={`Animated diagram: ${title}. Left and right arrow keys step through it.`}
      className="panel mt-6 border border-line bg-bg/70 outline-none focus-visible:border-accent/60"
    >
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent">
          <span className={`h-1.5 w-1.5 rounded-full bg-accent ${playing ? "animate-pulse" : "opacity-60"}`} />
          diagram
        </span>
        <span className="text-[0.86em] font-semibold leading-snug text-fg">
          <Inline text={title} />
        </span>
        {modes && (
          <div role="radiogroup" aria-label="Scenario" className="ml-auto inline-flex border border-line bg-surface p-0.5">
            {modes.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => choose(m.id)}
                className={`rounded-sm px-2 py-0.5 font-mono text-[11.5px] transition-colors ${
                  mode === m.id ? "bg-accent/12 text-accent" : "text-muted hover:text-fg"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </figcaption>

      {src !== undefined && <CodePane src={src} lang={lang} range={range} />}

      <div
        className="overflow-hidden px-3.5 py-5 sm:px-5"
        style={{
          backgroundImage: "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {children(s, mode)}
      </div>

      <p key={`${mode}:${s}`} aria-live="polite" className="viz-say min-h-[4.4em] border-t border-line px-3.5 py-3 text-[0.9em] leading-[1.55] text-fg-2">
        <Inline text={step.say} />
      </p>

      <div className="flex items-center gap-1.5 border-t border-line px-2.5 py-2">
        <CtrlButton label="Restart" onClick={() => go(0)} disabled={s === 0}>
          <Icon name="rotate" className="h-3.5 w-3.5" />
        </CtrlButton>
        <CtrlButton label="Previous step" onClick={() => go(s - 1)} disabled={s === 0}>
          <Icon name="chevronLeft" className="h-4 w-4" />
        </CtrlButton>
        <button
          onClick={play}
          aria-label={playing ? "Pause" : s >= last ? "Play again" : "Play"}
          className="inline-flex h-8 items-center gap-1.5 bg-accent px-3 font-mono text-[11.5px] text-on-accent transition-colors hover:bg-accent-hover"
        >
          <Icon name={playing ? "pause" : s >= last ? "rotate" : "play"} className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{playing ? "pause" : s >= last ? "replay" : "play"}</span>
        </button>
        <CtrlButton label="Next step" onClick={() => go(s + 1)} disabled={s >= last}>
          <Icon name="chevronRight" className="h-4 w-4" />
        </CtrlButton>
        <div className="ml-1.5 flex min-w-0 flex-1 items-center gap-1">
          {list.map((_, k) => (
            <button
              key={k}
              onClick={() => go(k)}
              aria-label={`Step ${k + 1}`}
              aria-current={k === s ? "step" : undefined}
              className="group flex h-6 min-w-0 flex-1 items-center"
            >
              <span className="relative h-1 w-full overflow-hidden bg-line transition-colors group-hover:bg-faint">
                {k < s && <span className="absolute inset-0 bg-accent/60" />}
                {k === s && (
                  <span
                    key={`${mode}:${s}:${playing}`}
                    className={`absolute inset-0 origin-left bg-accent ${playing && s < last ? "viz-fill" : ""}`}
                    style={playing && s < last ? { animationDuration: `${ms}ms` } : undefined}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
        <span className="ml-1.5 shrink-0 font-mono text-[11px] tabular-nums text-subtle">
          {s + 1}/{list.length}
        </span>
      </div>
    </figure>
  );
}

function CtrlButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:border-faint hover:text-fg disabled:opacity-35 disabled:hover:border-line disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}

/** The snippet, with a bar that glides to the line(s) running now. */
function CodePane({ src, lang, range }: { src: string; lang: string; range: number[] | null }) {
  const lines = src.split("\n");
  const [a, b] = range ?? [1, 1];
  return (
    <pre className="overflow-x-auto border-b border-line bg-surface-2/60 py-2.5 font-mono text-[12.5px] leading-[1.7] text-fg [tab-size:4]">
      <div className="relative w-max min-w-full">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 border-l-2 border-accent bg-accent/12 transition-[transform,height,opacity] duration-500"
          style={{
            transform: `translateY(${(a - 1) * 1.7}em)`,
            height: `${(b - a + 1) * 1.7}em`,
            opacity: range ? 1 : 0,
            transitionTimingFunction: EASE,
          }}
        />
        {lines.map((l, i) => {
          const on = !!range && i + 1 >= a && i + 1 <= b;
          return (
            <div key={i} className="relative flex pr-4">
              <span className={`w-9 shrink-0 select-none pr-3 text-right transition-colors ${on ? "text-accent" : "text-faint"}`}>{i + 1}</span>
              <code className="whitespace-pre">{l ? highlight(l, lang) : " "}</code>
            </div>
          );
        })}
      </div>
    </pre>
  );
}

// ---- the stage: nodes that glide, arrows that follow ----------------------------------

type Rect = { x: number; y: number; w: number; h: number };
const near = (a: Rect, b?: Rect) =>
  !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;

/** Where every node is, relative to the stage; arrows subscribe to it. */
class Rects {
  map = new Map<string, Rect>();
  private version = 0;
  private subs = new Set<() => void>();
  subscribe = (f: () => void) => {
    this.subs.add(f);
    return () => void this.subs.delete(f);
  };
  snapshot = () => this.version;
  set(next: Map<string, Rect>) {
    if (next.size === this.map.size && [...next].every(([k, r]) => near(r, this.map.get(k)))) return;
    this.map = next;
    this.version++;
    this.subs.forEach((f) => f());
  }
}

const StageCtx = createContext<Rects | null>(null);

/** Lays out a diagram and animates it whenever `at` changes. */
export function Stage({ at, className = "", children }: { at: string | number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rects = useMemo(() => new Rects(), []);
  const flips = useRef(new WeakMap<Element, Animation>());
  const mounted = useRef(false);

  const measure = useCallback(() => {
    const stage = ref.current;
    if (!stage) return;
    const s = stage.getBoundingClientRect();
    const next = new Map<string, Rect>();
    for (const el of stage.querySelectorAll<HTMLElement>("[data-node]")) {
      const r = el.getBoundingClientRect();
      next.set(el.dataset.node!, { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
    }
    rects.set(next);
  }, [rects]);

  useLayoutEffect(() => {
    const stage = ref.current!;
    const s = stage.getBoundingClientRect();
    const before = rects.map;
    const animate = mounted.current && !reducedMotion();
    mounted.current = true;
    const els = [...stage.querySelectorAll<HTMLElement>("[data-node]")];
    els.forEach((el) => flips.current.get(el)?.cancel());
    // where everything landed, measured before any animation starts
    const now = els.map((el) => el.getBoundingClientRect());
    const was = els.map((el) => before.get(el.dataset.node!));
    const parents = els.map((el) => {
      const up = el.parentElement?.closest("[data-node]");
      return up && stage.contains(up) ? up : null;
    });
    // a new container that holds nodes we already had appears at once, so they can glide into it
    const holdsOld = new Set<Element>();
    els.forEach((_, k) => {
      if (!was[k]) return;
      for (let p = parents[k]; p; p = parents[els.indexOf(p as HTMLElement)]) holdsOld.add(p);
    });
    const shift = new Map<Element, [number, number]>();
    const fading = new Set<Element>();
    if (animate)
      els.forEach((el, k) => {
        const parent = parents[k];
        const r = was[k];
        if (!r) {
          // new: fade in, unless a fading parent already does it for us
          if ((parent && fading.has(parent)) || holdsOld.has(el)) return;
          fading.add(el);
          flips.current.set(el, el.animate([{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: EASE }));
          return;
        }
        const dx = r.x - (now[k].left - s.left);
        const dy = r.y - (now[k].top - s.top);
        shift.set(el, [dx, dy]);
        // a nested node already moves with its parent; only add the difference
        const [px, py] = (parent && shift.get(parent)) || [0, 0];
        if (Math.abs(dx - px) < 0.5 && Math.abs(dy - py) < 0.5) return;
        flips.current.set(
          el,
          el.animate([{ transform: `translate(${dx - px}px, ${dy - py}px)` }, { transform: "none" }], { duration: MOVE_MS, easing: EASE }),
        );
      });
    // arrows follow the motion frame by frame
    let raf = 0;
    const end = performance.now() + MOVE_MS + 150;
    const follow = () => {
      measure();
      if (performance.now() < end) raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [at, measure, rects]);

  // re-measure when anything changes size (fonts, window, content)
  useEffect(() => {
    const stage = ref.current!;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    stage.querySelectorAll("[data-node]").forEach((n) => ro.observe(n));
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [at, measure]);

  return (
    <StageCtx.Provider value={rects}>
      <div ref={ref} className={`relative ${className}`}>
        {children}
      </div>
    </StageCtx.Provider>
  );
}

/** Anything an arrow can point at, or that should glide when the layout changes. */
export function Node({
  id,
  className = "",
  style,
  flash,
  delay = 0,
  children,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  /** change this value to pulse a ring around the node */
  flash?: unknown;
  /** ms before the pulse, and before colour changes ease in: lets a change ripple through a tree */
  delay?: number;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(flash);
  useEffect(() => {
    if (Object.is(seen.current, flash)) return;
    seen.current = flash;
    if (flash == null || flash === false || reducedMotion()) return;
    ref.current?.animate([{ boxShadow: "0 0 0 0px currentColor" }, { boxShadow: "0 0 0 7px transparent" }], {
      duration: 750,
      delay,
      easing: "ease-out",
    });
  }, [flash, delay]);
  return (
    <div ref={ref} data-node={id} className={`viz-node ${className}`} style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}>
      {children}
    </div>
  );
}

type Side = "l" | "r" | "t" | "b";
type Geo = number[]; // start, control 1, control 2, end: [x, y] × 4
const NORMAL: Record<Side, [number, number]> = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] };

function anchor(r: Rect, side: Side): [number, number] {
  if (side === "l") return [r.x, r.y + r.h / 2];
  if (side === "r") return [r.x + r.w, r.y + r.h / 2];
  if (side === "t") return [r.x + r.w / 2, r.y];
  return [r.x + r.w / 2, r.y + r.h];
}

/** Leave and enter on the facing sides: left/right when the boxes sit side by side, else top/bottom. */
function sides(a: Rect, b: Rect): [Side, Side] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  const gx = Math.abs(dx) - (a.w + b.w) / 2;
  const gy = Math.abs(dy) - (a.h + b.h) / 2;
  if (gx >= gy) return dx > 0 ? ["r", "l"] : ["l", "r"];
  return dy > 0 ? ["b", "t"] : ["t", "b"];
}

function geometry(a: Rect, b: Rect, from?: Side, to?: Side, bend = 0.4): Geo {
  const [sa, sb] = sides(a, b);
  const s1 = from ?? sa;
  const s2 = to ?? sb;
  const [x1, y1] = anchor(a, s1);
  const [x2, y2] = anchor(b, s2);
  const k = Math.max(16, Math.hypot(x2 - x1, y2 - y1) * bend);
  const [n1x, n1y] = NORMAL[s1];
  const [n2x, n2y] = NORMAL[s2];
  const ex = x2 + n2x * 2;
  const ey = y2 + n2y * 2;
  return [x1, y1, x1 + n1x * k, y1 + n1y * k, ex + n2x * k, ey + n2y * k, ex, ey];
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** A curved arrow between two nodes of the same stage. */
export function Arrow({
  from,
  to,
  tone = "fg",
  dashed = false,
  dim = false,
  label,
  fromSide,
  toSide,
  bend,
}: {
  from: string;
  to: string;
  tone?: Tone;
  dashed?: boolean;
  dim?: boolean;
  label?: string;
  fromSide?: Side;
  toSide?: Side;
  /** how far the curve bows out, as a share of its length (0 = straight) */
  bend?: number;
}) {
  const rects = useContext(StageCtx)!;
  useSyncExternalStore(rects.subscribe, rects.snapshot, () => 0);
  const a = rects.map.get(from);
  const b = rects.map.get(to);
  const target = a && b ? geometry(a, b, fromSide, toSide, bend) : null;

  // when it's re-aimed, swing from what was on screen instead of jumping
  const drawn = useRef<Geo | null>(null);
  const swing = useRef<{ from: Geo; start: number } | null>(null);
  const [, redraw] = useState(0);
  const key = `${from}>${to}`;
  useLayoutEffect(() => {
    if (drawn.current && !reducedMotion()) {
      swing.current = { from: drawn.current, start: performance.now() };
      redraw((n) => n + 1);
    }
  }, [key]);

  let geo = target;
  const sw = swing.current;
  const t = sw ? Math.min(1, (performance.now() - sw.start) / SWING_MS) : 1;
  if (sw && target) geo = target.map((v, i) => sw.from[i] + (v - sw.from[i]) * ease(t));
  useLayoutEffect(() => {
    if (geo) drawn.current = geo;
  });
  useEffect(() => {
    if (!swing.current) return;
    const id = requestAnimationFrame(() => {
      if (t >= 1) swing.current = null;
      redraw((n) => n + 1);
    });
    return () => cancelAnimationFrame(id);
  });

  if (!geo) return null;
  const [x1, y1, c1x, c1y, c2x, c2y, ex, ey] = geo;
  // head along the curve's final direction
  let ux = ex - c2x;
  let uy = ey - c2y;
  const len = Math.hypot(ux, uy) || 1;
  ux /= len;
  uy /= len;
  const H = 7;
  const bx = ex - ux * H;
  const by = ey - uy * H;
  const head = `M${ex},${ey} L${bx - uy * 4},${by + ux * 4} L${bx + uy * 4},${by - ux * 4} Z`;
  const mx = (x1 + 3 * c1x + 3 * c2x + ex) / 8;
  const my = (y1 + 3 * c1y + 3 * c2y + ey) / 8;
  return (
    <>
      <svg
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible transition-opacity duration-500 ${TONE[tone].text} ${
          dim ? "opacity-30" : ""
        }`}
      >
        <path
          d={`M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${bx},${by}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          {...(dashed ? { strokeDasharray: "4 4", className: "viz-fade" } : { pathLength: 1, className: "viz-draw" })}
        />
        <path d={head} fill="currentColor" className="viz-head" />
      </svg>
      {label && (
        <span
          className={`viz-head pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-bg px-1 font-mono text-[10.5px] ${TONE[tone].text}`}
          style={{ left: mx, top: my }}
        >
          {label}
        </span>
      )}
    </>
  );
}

// ---- building blocks -----------------------------------------------------------------

/** A small uppercase caption over a group. */
export function Lbl({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-mono text-[10px] uppercase tracking-[0.13em] text-subtle ${className}`}>{children}</div>;
}

/** A variable name: a label attached to an object. */
export function Name({
  id,
  children,
  tone = "fg",
  dim,
  flash,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  tone?: Tone;
  dim?: boolean;
  flash?: unknown;
  className?: string;
}) {
  return (
    <Node
      id={id}
      flash={flash}
      className={`inline-flex items-center border bg-surface px-2 py-[3px] font-mono text-[13px] leading-tight ${TONE[tone].border} ${TONE[tone].text} ${
        dim ? "opacity-30" : ""
      } ${className}`}
    >
      {children}
    </Node>
  );
}

/** An object in memory: its type over its value. */
export function Obj({
  id,
  type,
  addr,
  tone = "info",
  dim,
  flash,
  className = "",
  children,
}: {
  id: string;
  type: React.ReactNode;
  /** a made-up memory address, to show identity */
  addr?: string;
  tone?: Tone;
  dim?: boolean;
  flash?: unknown;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Node
      id={id}
      flash={flash}
      className={`inline-flex flex-col border px-2.5 pb-2 pt-1 ${TONE[tone].border} ${TONE[tone].bg} ${TONE[tone].text} ${
        dim ? "opacity-30" : ""
      } ${className}`}
    >
      <span className="font-mono text-[9.5px] tracking-[0.1em] opacity-90">
        <span className="uppercase tracking-[0.13em]">{type}</span>
        {addr && <span className="text-subtle"> · {addr}</span>}
      </span>
      <span className="mt-1 font-mono text-[13px] leading-tight text-fg">{children}</span>
    </Node>
  );
}

/** One value in a row of cells (a list slot, a queue entry …). */
export function Cell({
  id,
  children,
  tone = "fg",
  on = false,
  dim = false,
  className = "",
  flash,
}: {
  id?: string;
  children: React.ReactNode;
  tone?: Tone;
  on?: boolean;
  dim?: boolean;
  className?: string;
  flash?: unknown;
}) {
  const cls = `viz-node inline-flex min-w-[2.1em] items-center justify-center border px-1.5 py-1 font-mono text-[13px] leading-tight ${
    on ? `${TONE[tone].border} ${TONE[tone].bg} ${TONE[tone].text}` : "border-line bg-surface text-fg"
  } ${dim ? "opacity-30" : ""} ${className}`;
  return id ? (
    <Node id={id} flash={flash} className={cls}>
      {children}
    </Node>
  ) : (
    <span className={cls}>{children}</span>
  );
}

/** A labelled region (a scope, a module, a queue …). */
export function Zone({
  label,
  tone = "faint",
  id,
  className = "",
  children,
  on = false,
}: {
  label: React.ReactNode;
  tone?: Tone;
  id?: string;
  className?: string;
  children?: React.ReactNode;
  on?: boolean;
}) {
  const cls = `viz-node border border-dashed p-2.5 ${on ? `${TONE[tone].border} ${TONE[tone].bg}` : "border-line bg-surface/60"} ${className}`;
  const inner = (
    <>
      <div className={`mb-2 font-mono text-[10px] uppercase tracking-[0.13em] transition-colors ${on ? TONE[tone].text : "text-subtle"}`}>{label}</div>
      {children}
    </>
  );
  return id ? (
    <Node id={id} className={cls}>
      {inner}
    </Node>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Printed output so far. */
export function Out({ lines, className = "" }: { lines: string[]; className?: string }) {
  return (
    <div className={`border border-line bg-surface-2/70 px-2.5 py-1.5 font-mono text-[12px] leading-[1.6] ${className}`}>
      <div className="text-[9.5px] uppercase tracking-[0.13em] text-subtle">output</div>
      {lines.length ? (
        lines.map((l, i) => (
          <div key={i} className={`viz-say whitespace-pre text-fg ${i === lines.length - 1 ? "" : "opacity-70"}`}>
            {l}
          </div>
        ))
      ) : (
        <div className="text-faint">—</div>
      )}
    </div>
  );
}
