"use client";

import { Arrow, Cell, Lbl, Name, Node, Obj, Out, Stage, type Step, TONE, type Tone, Viz } from "./kit";

// ---- 09 the event loop: await vs blocking -----------------------------------------------------

const AWAIT = `async def fetch(n):
    await asyncio.sleep(1 / n)   # waits without blocking
    return n

async def main():
    print(await asyncio.gather(fetch(1), fetch(2), fetch(4)))`;

const BLOCK = `async def fetch(n):
    time.sleep(1 / n)            # blocks the whole thread
    return n

async def main():
    print(await asyncio.gather(fetch(1), fetch(2), fetch(4)))`;

type Kind = "cpu" | "wait" | "block" | "queued";
type Seg = { lane: number; a: number; b: number; kind: Kind };
const LANES = ["event loop (1 thread)", "fetch(1)", "fetch(2)", "fetch(4)"];
const TIMELINE: Record<string, { segs: Seg[]; at: number[]; steps: Step[] }> = {
  await: {
    segs: [
      { lane: 0, a: 0, b: 0.03, kind: "cpu" },
      { lane: 0, a: 0.03, b: 0.06, kind: "cpu" },
      { lane: 0, a: 0.06, b: 0.09, kind: "cpu" },
      { lane: 0, a: 0.25, b: 0.28, kind: "cpu" },
      { lane: 0, a: 0.5, b: 0.53, kind: "cpu" },
      { lane: 0, a: 1, b: 1.03, kind: "cpu" },
      { lane: 1, a: 0.03, b: 1, kind: "wait" },
      { lane: 2, a: 0.06, b: 0.5, kind: "wait" },
      { lane: 3, a: 0.09, b: 0.25, kind: "wait" },
    ],
    at: [0, 0.09, 0.25, 0.5, 1.03],
    steps: [
      { say: "`gather` hands three coroutines to the event loop. There's **one** thread, so only one of them runs at any moment.", line: 6 },
      { say: "The loop starts `fetch(1)`, which reaches `await asyncio.sleep(1)` and gives control back. Same for `fetch(2)` and `fetch(4)`. In a few microseconds all three are waiting **at once**.", line: 2 },
      { say: "At 0.25 s the shortest sleep ends. The loop resumes `fetch(4)` right after its `await`, and it returns 4.", line: 3 },
      { say: "At 0.5 s, `fetch(2)` finishes.", line: 3 },
      { say: "At 1 s the last one finishes and `gather` returns `[1, 2, 4]`, in argument order. Total ≈ **1 s**, the longest wait, not the sum.", line: 6 },
    ],
  },
  block: {
    segs: [
      { lane: 0, a: 0, b: 1, kind: "block" },
      { lane: 0, a: 1, b: 1.5, kind: "block" },
      { lane: 0, a: 1.5, b: 1.75, kind: "block" },
      { lane: 1, a: 0, b: 1, kind: "block" },
      { lane: 2, a: 0, b: 1, kind: "queued" },
      { lane: 2, a: 1, b: 1.5, kind: "block" },
      { lane: 3, a: 0, b: 1.5, kind: "queued" },
      { lane: 3, a: 1.5, b: 1.75, kind: "block" },
    ],
    at: [0, 1, 1.5, 1.75],
    steps: [
      { say: "Same code, but with `time.sleep`, which doesn't `await`: it holds the thread until it's done.", line: 2 },
      { say: "`fetch(1)` blocks the only thread for a full second. The loop can't switch: the other two (and every other request your server is handling) are stuck.", line: 2 },
      { say: "Only then can `fetch(2)` start, and block for another 0.5 s.", line: 2 },
      { say: "Total **1.75 s**: the sum of the waits. Async code with one blocking call is slower than plain code. Use `await asyncio.sleep`, an async client, or `asyncio.to_thread`.", line: 6 },
    ],
  },
};
const SEG_STYLE: Record<Kind, string> = {
  cpu: "bg-accent",
  wait: "border border-info/70 bg-info/15",
  block: "bg-bad/70",
  queued: "border border-dashed border-faint",
};
const MAX = 2;

/** One thread: awaiting lets waits overlap; a blocking call makes them queue. */
export function EventLoop() {
  return (
    <Viz
      title="The event loop: waits overlap only at an `await`"
      modes={[
        { id: "await", label: "await asyncio.sleep" },
        { id: "block", label: "time.sleep" },
      ]}
      code={(m) => (m === "await" ? AWAIT : BLOCK)}
      steps={(m) => TIMELINE[m].steps}
    >
      {(s, m) => {
        const t = TIMELINE[m];
        const now = t.at[s];
        const pct = (x: number) => `${(x / MAX) * 100}%`;
        return (
          <Stage at={`${m}${s}`}>
            <div className="relative space-y-1.5">
            {LANES.map((lane, i) => (
              <div key={lane} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                <span className={`truncate font-mono text-[11px] ${i === 0 ? "text-fg" : "text-muted"}`}>{lane}</span>
                <div className={`relative h-6 border-b border-line ${i === 0 ? "bg-surface-2/60" : ""}`}>
                  {t.segs
                    .filter((g) => g.lane === i && g.a <= now)
                    .map((g, k) => (
                      <div
                        key={k}
                        className={`absolute top-1 bottom-1 ${SEG_STYLE[g.kind]}`}
                        style={{
                          left: pct(g.a),
                          width: `max(3px, ${((Math.min(g.b, now) - g.a) / MAX) * 100}%)`,
                          transition: "width 600ms cubic-bezier(0.22, 0.8, 0.24, 1)",
                        }}
                      />
                    ))}
                  {i > 0 && t.segs.filter((g) => g.lane === i).every((g) => g.b <= now) && (
                    <span
                      className="viz-say absolute top-1/2 -translate-y-1/2 pl-1.5 font-mono text-[10.5px] text-accent"
                      style={{ left: pct(Math.max(...t.segs.filter((g) => g.lane === i).map((g) => g.b))) }}
                    >
                      ✓ {LANES[i].match(/\d/)![0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {/* time axis and playhead */}
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
              <span className="font-mono text-[10px] text-subtle">time</span>
              <div className="relative h-5">
                {[0, 0.5, 1, 1.5, 2].map((x) => (
                  <span key={x} className="absolute -translate-x-1/2 font-mono text-[10px] text-faint" style={{ left: pct(x) }}>
                    {x}s
                  </span>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 left-[calc(6.5rem+0.5rem)] sm:left-[calc(9.5rem+0.5rem)]">
              <div
                className="absolute inset-y-0 w-px bg-warn"
                style={{ left: pct(now), transition: "left 600ms cubic-bezier(0.22, 0.8, 0.24, 1)" }}
              >
                <span className={`absolute -top-0.5 bg-bg px-1 font-mono text-[10px] text-warn ${now / MAX > 0.7 ? "right-1" : "left-1"}`}>{now.toFixed(2)}s</span>
              </div>
            </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 font-mono text-[10.5px] text-subtle">
              {m === "await" ? (
                <>
                  <Legend cls={SEG_STYLE.cpu} label="running on the thread" />
                  <Legend cls={SEG_STYLE.wait} label="awaiting (thread free)" />
                </>
              ) : (
                <>
                  <Legend cls={SEG_STYLE.block} label="blocking the thread" />
                  <Legend cls={SEG_STYLE.queued} label="stuck, can't start" />
                </>
              )}
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-4 ${cls}`} />
      {label}
    </span>
  );
}

// ---- 10 patch where the name is looked up ------------------------------------------------------

const PATCH = (target: string) => `# pricing.py
from rates import fetch_rate
def price(amount):
    return amount * fetch_rate("USD")

# test_pricing.py
with patch("${target}", return_value=1.1):
    price(10)`;

/** `from x import f` copies the name; patching the original module leaves the copy alone. */
export function PatchWhere() {
  return (
    <Viz
      title="Patch the name where it's looked up"
      modes={[
        { id: "wrong", label: 'patch("rates.fetch_rate")' },
        { id: "right", label: 'patch("pricing.fetch_rate")' },
      ]}
      code={(m) => PATCH(m === "wrong" ? "rates.fetch_rate" : "pricing.fetch_rate")}
      steps={(m) => [
        { say: "Every module has its own namespace of names. `rates.fetch_rate` points at the real function, which calls the network.", line: 2 },
        { say: "`from rates import fetch_rate` **copies the name** into `pricing`. Now two names point at the same function.", line: 2 },
        m === "wrong"
          ? { say: "`patch(\"rates.fetch_rate\")` swaps the name in **`rates`** for a mock. The name in `pricing` still points at the real function.", line: 7 }
          : { say: "`patch(\"pricing.fetch_rate\")` swaps the name in **`pricing`**, the one `price()` will look up.", line: 7 },
        m === "wrong"
          ? { say: "`price(10)` looks up `fetch_rate` in its own module, finds the **real** function and calls the network. The test is slow, flaky, and doesn't test what you meant.", line: [3, 4] }
          : { say: "`price(10)` looks up `fetch_rate` in `pricing`, gets the mock, and returns `10 * 1.1`. The real function is never called.", line: [3, 4] },
        { say: "When the `with` block ends, `patch` puts the original binding back.", line: 8 },
      ]}
    >
      {(s, m) => {
        const right = m === "right";
        const swappedRates = !right && s >= 2 && s < 4;
        const swappedPricing = right && s >= 2 && s < 4;
        const calling = s === 3;
        const hitsReal = calling && !right;
        const mod = (id: string, label: string, children: React.ReactNode, on = false) => (
          <Node id={id} className={`border border-dashed p-2 ${on ? "border-warn/70 bg-warn/5" : "border-line bg-surface/50"}`}>
            <Lbl>{label}</Lbl>
            <div className="mt-1.5 flex flex-col items-start gap-1.5">{children}</div>
          </Node>
        );
        return (
          <Stage at={`${m}${s}`} className="grid grid-cols-[auto_auto] items-center justify-start gap-x-10 gap-y-4 sm:gap-x-16">
            <div className="flex flex-col gap-4">
              {mod(
                "m-rates",
                "module rates",
                <Name id="n-rates" tone={swappedRates ? "warn" : "fg"} flash={swappedRates ? s : undefined}>
                  fetch_rate
                </Name>,
              )}
              {mod(
                "m-pricing",
                "module pricing",
                <>
                  <span className={s >= 1 ? "" : "invisible"}>
                    <Name id="n-pricing" tone={swappedPricing ? "warn" : calling ? "iris" : "fg"} flash={swappedPricing ? s : undefined}>
                      fetch_rate
                    </Name>
                  </span>
                  <Cell on={calling} tone="iris" className="text-[12px]!">
                    price()
                  </Cell>
                </>,
                calling,
              )}
            </div>
            <div className="flex flex-col items-start gap-6">
              <Obj id="real" type="function" addr="the real one" tone={hitsReal ? "bad" : "info"} flash={hitsReal ? s : undefined}>
                fetch_rate → network
              </Obj>
              <Obj id="mock" type="MagicMock" tone="warn" dim={!(s >= 2 && s < 4)} flash={calling && right ? s : undefined}>
                returns 1.1
              </Obj>
            </div>
            <Arrow from="n-rates" to={swappedRates ? "mock" : "real"} tone={swappedRates ? "warn" : "info"} />
            {s >= 1 && <Arrow from="n-pricing" to={swappedPricing ? "mock" : "real"} tone={swappedPricing ? "warn" : hitsReal ? "bad" : "info"} />}
            <div className="col-span-2">
              <Out lines={calling ? [right ? "11.0   (mock called once with 'USD')" : "calls the real API: slow, flaky"] : s >= 4 ? [right ? "11.0" : "calls the real API: slow, flaky"] : []} />
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 11 groupby: agg vs transform ---------------------------------------------------------------

const ROWS = [
  { desk: "FX", n: 100 },
  { desk: "Rates", n: 300 },
  { desk: "FX", n: 50 },
  { desk: "Credit", n: 200 },
  { desk: "Rates", n: 100 },
];
const DESKS: { desk: string; tone: Tone }[] = [
  { desk: "Credit", tone: "plum" },
  { desk: "FX", tone: "info" },
  { desk: "Rates", tone: "warn" },
];
const toneOf = (desk: string) => DESKS.find((d) => d.desk === desk)!.tone;
const total = (desk: string) => ROWS.filter((r) => r.desk === desk).reduce((a, r) => a + r.n, 0);

/** Split rows by key, apply a function per group, combine: agg shrinks, transform keeps the shape. */
export function GroupBy() {
  return (
    <Viz
      title="groupby: split, apply, combine"
      modes={[
        { id: "agg", label: '.sum()  (agg)' },
        { id: "transform", label: '.transform("sum")' },
      ]}
      code={(m) =>
        m === "agg" ? 'df.groupby("desk")["notional"].sum()' : 'df["desk_total"] = df.groupby("desk")["notional"].transform("sum")\ndf["share"] = df["notional"] / df["desk_total"]'
      }
      steps={(m) => [
        { say: "Five trades, in their original order. Each row has a desk and a notional.", line: 1 },
        { say: "**Split:** `groupby(\"desk\")` sorts the rows into one group per desk. No maths yet.", line: 1 },
        { say: "**Apply:** `sum` runs on each group's notional on its own: FX 150, Rates 400, Credit 200.", line: 1 },
        m === "agg"
          ? { say: "**Combine (agg):** each group collapses to **one** row. You get a Series indexed by desk, 3 rows instead of 5: a summary.", line: 1 }
          : { say: "**Combine (transform):** each row gets its group's total and goes back to its **original** place. Same 5 rows, same order, so you can assign it as a column.", line: 1 },
        ...(m === "transform" ? [{ say: "Now row-level maths against the group works: each trade's share of its desk.", line: 2 as const }] : []),
      ]}
    >
      {(s, m) => {
        const split = s >= 1 && !(m === "transform" && s >= 3) && !(m === "agg" && s >= 3);
        const summed = s >= 2;
        const row = (i: number, extra?: React.ReactNode) => {
          const r = ROWS[i];
          const tone = toneOf(r.desk);
          return (
            <Node key={i} id={`r${i}`} className={`flex items-center gap-2 border px-2 py-1 font-mono text-[12px] ${TONE[tone].border} ${TONE[tone].bg}`}>
              <span className="w-12 text-subtle">{i}</span>
              <span className={`w-12 ${TONE[tone].text}`}>{r.desk}</span>
              <span className="w-10 text-right text-fg">{r.n}</span>
              {extra}
            </Node>
          );
        };
        if (!split && m === "agg" && s >= 3)
          return (
            <Stage at={`${m}${s}`} className="space-y-2">
              <Lbl>result · a Series, one row per desk</Lbl>
              <div className="flex flex-col items-start gap-1.5">
                {DESKS.map(({ desk, tone }) => (
                  <Node key={desk} id={`g-${desk}`} className={`flex items-center gap-2 border px-2 py-1 font-mono text-[12px] ${TONE[tone].border} ${TONE[tone].bg}`}>
                    <span className={`w-14 ${TONE[tone].text}`}>{desk}</span>
                    <Node id={`sum-${desk}`} className="w-10 text-right text-fg">
                      {total(desk)}
                    </Node>
                  </Node>
                ))}
              </div>
              <p className="font-mono text-[11px] text-subtle">5 rows in → 3 rows out</p>
            </Stage>
          );
        if (split)
          return (
            <Stage at={`${m}${s}`} className="space-y-2">
              <Lbl>{summed ? "apply: sum each group" : "split: one group per desk"}</Lbl>
              <div className="flex flex-col items-start gap-3">
                {DESKS.map(({ desk, tone }) => (
                  <Node key={desk} id={`g-${desk}`} className={`flex flex-wrap items-center gap-3 border border-dashed p-2 ${TONE[tone].border}`}>
                    <div className="flex flex-col gap-1">{ROWS.map((r, i) => (r.desk === desk ? row(i) : null))}</div>
                    {summed && (
                      <Node id={`sum-${desk}`} className={`viz-say border px-2 py-1 font-mono text-[12px] ${TONE[tone].border} ${TONE[tone].text}`}>
                        sum = {total(desk)}
                      </Node>
                    )}
                  </Node>
                ))}
              </div>
            </Stage>
          );
        // the table: original order, plus the transform columns
        return (
          <Stage at={`${m}${s}`} className="space-y-2">
            <Lbl>
              {s === 0 ? "df" : s === 3 ? "transform: back in the original order" : "share = notional / desk_total"}
            </Lbl>
            <div className="flex flex-col items-start gap-1">
              {ROWS.map((r, i) =>
                row(
                  i,
                  s >= 3 && (
                    <>
                      <Node id={i === ROWS.findIndex((x) => x.desk === r.desk) ? `sum-${r.desk}` : `t${i}`} className={`w-12 text-right ${TONE[toneOf(r.desk)].text}`}>
                        {total(r.desk)}
                      </Node>
                      {s >= 4 && <span className="viz-say w-12 text-right text-accent">{(r.n / total(r.desk)).toFixed(2)}</span>}
                    </>
                  ),
                ),
              )}
            </div>
            {s >= 3 && (
              <p className="font-mono text-[11px] text-subtle">
                columns: index · desk · notional · desk_total{s >= 4 ? " · share" : ""}
              </p>
            )}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 12 floats are binary approximations ----------------------------------------------------------

// four neighbouring doubles around 0.3, one ulp (5.55e-17) apart, placed on the line in %
const TICKS = [
  { x: 10, v: "0.29999999999999993" },
  { x: 36.7, v: "0.29999999999999999" },
  { x: 63.3, v: "0.30000000000000004" },
  { x: 90, v: "0.30000000000000010" },
];

/** Only the ticks exist; 0.1 + 0.2 lands on a different tick than 0.3. */
export function FloatLine() {
  const steps: Step[] = [
    { say: "Zoom far into the number line around 0.3. A float can only be one of these **ticks**, about 5.6 × 10⁻¹⁷ apart. Everything between them is unreachable.", line: 1 },
    { say: "The real 0.3 falls between two ticks, so the literal `0.3` is stored as the nearest one: **0.29999999999999998889…**, a hair below.", line: 1 },
    { say: "`0.1` and `0.2` were also rounded when stored, both slightly **up**. Add them exactly and you get 0.30000000000000001665…, which is again between ticks (exactly halfway, as it happens).", line: 2 },
    { say: "The result has to be a float, so it rounds to a tick: on a tie, the even one. That's **0.30000000000000004**, the tick to the right of where `0.3` is stored.", line: 2 },
    { say: "So `==` compares two **different** ticks and says `False`. `math.isclose` asks whether they're within a tolerance, and says `True`. For money, use `Decimal(\"0.1\")` or integer cents.", line: [3, 4] },
  ];
  return (
    <Viz
      title="Why `0.1 + 0.2 != 0.3`"
      code={"x = 0.3\ny = 0.1 + 0.2\nx == y              # False\nmath.isclose(x, y)  # True"}
      steps={steps}
    >
      {(s) => (
        <Stage at={s} className="pb-2">
          <div className="relative mx-1 h-[150px]">
            {/* the line */}
            <div className="absolute inset-x-0 top-[70px] h-px bg-faint" />
            {TICKS.map((t, i) => (
              <div key={t.v} className="absolute top-[58px] -translate-x-1/2" style={{ left: `${t.x}%` }}>
                <Node
                  id={`tick${i}`}
                  className={`mx-auto h-6 w-[3px] ${(s >= 1 && i === 1) || (s >= 3 && i === 2) ? (i === 1 ? "bg-info" : "bg-warn") : "bg-subtle"}`}
                />
                <span
                  className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] transition-colors ${i % 2 ? "top-[46px]" : "top-8"} ${
                    i === 0 || i === 3 ? "hidden text-faint sm:block" : s >= 1 && i === 1 ? "text-info" : s >= 3 && i === 2 ? "text-warn" : "text-subtle"
                  }`}
                >
                  {t.v}
                  {s >= 1 && i === 1 ? " = x" : s >= 3 && i === 2 ? " = y" : ""}
                </span>
              </div>
            ))}
            {/* real 0.3, between ticks */}
            {s >= 1 && (
              <div className="viz-say absolute top-[22px] -translate-x-1/2 text-center" style={{ left: "42%" }}>
                <span className="block font-mono text-[10px] text-info">real 0.3</span>
                <span className="mx-auto mt-0.5 block h-6 w-px border-l border-dashed border-info" />
              </div>
            )}
            {/* the sum: first exact (between ticks), then rounded onto a tick */}
            {s >= 2 && (
              <Node
                id="sum"
                className="absolute top-[63px] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-warn bg-bg"
                style={{ left: s >= 3 ? "63.3%" : "50%" }}
              />
            )}
            {s >= 2 && (
              <span
                className="viz-say absolute top-[2px] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-warn"
                style={{ left: s >= 3 ? "63.3%" : "50%", transition: "left 600ms" }}
              >
                {s >= 3 ? "y = 0.1 + 0.2, rounded" : "exact 0.1 + 0.2"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[11.5px]">
            <Cell on={s >= 2} tone="warn">
              0.1 → 0.1000000000000000055…
            </Cell>
            <Cell on={s >= 2} tone="warn">
              0.2 → 0.2000000000000000111…
            </Cell>
          </div>
          <div className="mt-3">
            <Out lines={s >= 4 ? ["x == y            → False", "math.isclose(x, y) → True"] : []} />
          </div>
        </Stage>
      )}
    </Viz>
  );
}
