"use client";

import { Arrow, Cell, Lbl, Name, Node, Obj, Out, Stage, type Step, TONE, type Tone, Viz } from "./kit";

// ---- 01 components are functions React calls --------------------------------------------------

const TREE = `function Badge({ label, tone }) {
  return <span className={"badge-" + tone}>{label}</span>;
}
function Card({ title, children }) {
  return <section><h2>{title}</h2>{children}</section>;
}
function App() {
  return (
    <Card title="Exposure">
      <Badge label="filled" tone="good" />
    </Card>
  );
}`;

/** Props flow down as React calls each component; the DOM is built once, at the end. */
export function RenderTree() {
  const steps: Step[] = [
    { say: "React calls your root component, `App()`. It's a plain function: no props in, JSX out.", line: 7 },
    { say: "That JSX isn't HTML yet. It's a **description**: objects saying \"a `Card` with `title=\"Exposure\"`, and a `Badge` inside it\".", line: [9, 11] },
    { say: "React calls `Card` and passes the props down: `title` and `children` (the `Badge` element). `Card` can read its props, never change them.", line: [4, 5] },
    { say: "Then `Badge({ label: \"filled\", tone: \"good\" })` returns a `span`. Data only ever flows **down** the tree, parent to child.", line: [1, 2] },
    { say: "Every component has returned, so React knows the whole UI and updates the real DOM in one go (the **commit**).", line: [8, 12] },
  ];
  return (
    <Viz title="Components are functions; props flow down" code={TREE} lang="jsx" steps={steps}>
      {(s) => {
        const fn = (id: string, name: string, on: boolean, done: boolean, out: string, props?: string) => (
          <Node id={id} className={`border px-2.5 py-1.5 ${on ? "border-warn/70 bg-warn/10" : done ? "border-accent/60 bg-accent/5" : "border-line bg-surface/50 opacity-50"}`}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12.5px] text-fg">{name}</span>
              <span className={`font-mono text-[10.5px] ${on ? "text-warn" : done ? "text-accent" : "text-faint"}`}>{on ? "● running" : done ? "✓ returned" : "not called yet"}</span>
            </div>
            {props && (on || done) && <div className="viz-say mt-1 font-mono text-[11px] text-warn">props in: {props}</div>}
            {(on || done) && <div className="viz-say mt-1 font-mono text-[11px] text-subtle">→ {out}</div>}
          </Node>
        );
        return (
          <Stage at={s} className="grid gap-x-8 gap-y-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <div className="flex flex-col items-start gap-6">
              {fn("app", "App()", s <= 1, s > 1, "<Card title=…><Badge …/></Card>")}
              <div className="pl-6">{fn("card", "Card(props)", s === 2, s > 2, "<section><h2>…</h2>{children}</section>", '{ title: "Exposure", children }')}</div>
              <div className="pl-12">{fn("badge", "Badge(props)", s === 3, s > 3, '<span className="badge-good">', '{ label: "filled", tone: "good" }')}</div>
            </div>
            <div className="space-y-2">
              <Lbl>{s >= 4 ? "the DOM, committed" : s >= 1 ? "what React knows so far" : "the screen"}</Lbl>
              <Node id="screen" className={`min-h-[110px] border p-2.5 font-mono text-[11.5px] ${s >= 4 ? "border-accent/60 bg-accent/5" : "border-dashed border-line"}`}>
                {s >= 1 && (
                  <div className="viz-say text-subtle">
                    {"{ type: Card, props: { title: \"Exposure\", children: { type: Badge … } } }"}
                  </div>
                )}
                {s >= 4 && (
                  <div className="viz-say mt-2.5 border border-line bg-surface px-2.5 py-2 font-sans">
                    <div className="text-[13px] font-semibold text-fg">Exposure</div>
                    <span className="mt-1.5 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">filled</span>
                  </div>
                )}
              </Node>
            </div>
            {s >= 2 && <Arrow from="app" to="card" tone="warn" fromSide="b" toSide="l" bend={0.35} />}
            {s >= 3 && <Arrow from="card" to="badge" tone="warn" fromSide="b" toSide="l" bend={0.35} />}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 02 state is a snapshot; updaters queue ---------------------------------------------------

const SNAP = (updater: boolean) => `function handleClick() {
  setCount(${updater ? "(c) => c + 1" : "count + 1"});
  setCount(${updater ? "(c) => c + 1" : "count + 1"});
  console.log(count);
}`;

/** In one render count never changes; setters only queue updates, processed after the handler. */
export function Snapshot() {
  return (
    <Viz
      title="State is a snapshot; setters queue updates"
      lang="jsx"
      modes={[
        { id: "value", label: "setCount(count + 1)" },
        { id: "updater", label: "setCount(c => c + 1)" },
      ]}
      code={(m) => SNAP(m === "updater")}
      steps={(m) => {
        const v = m === "value";
        return [
          { say: "Render 1: React called your component with `count = 0`. Everything created in that render, including `handleClick`, sees **0**, and keeps seeing it." },
          v
            ? { say: "`setCount(count + 1)` is `setCount(1)`: it **queues** \"replace with 1\". `count` itself doesn't change.", line: 2 }
            : { say: "`setCount(c => c + 1)` queues a **function**: \"take the latest value and add 1\".", line: 2 },
          v
            ? { say: "`count` is still 0, so this queues \"replace with 1\" again.", line: 3 }
            : { say: "The second call queues the same function again.", line: 3 },
          { say: "`console.log(count)` prints **0**. The update hasn't happened: this render's `count` is a constant.", line: 4 },
          v
            ? { say: "After the handler, React works through the queue in one batch: 0 → 1 → 1. Both entries said \"1\".", line: [2, 3] }
            : { say: "After the handler, React runs the queued functions in order, each on the result of the last: 0 → 1 → 2.", line: [2, 3] },
          { say: `**One** re-render (updates are batched), with \`count = ${v ? 1 : 2}\`. ${v ? "Use the updater form when the next value depends on the previous one." : "That's why the updater form is right for \"based on the previous value\"."}` },
        ];
      }}
    >
      {(s, m) => {
        const v = m === "value";
        const queued = s >= 2 ? 2 : s >= 1 ? 1 : 0;
        const final = v ? 1 : 2;
        const proc = s >= 4;
        return (
          <Stage at={`${m}${s}`} className="space-y-4">
            <div className="flex flex-wrap items-start gap-3">
              <Node id="r1" className={`border px-2.5 py-1.5 ${s < 5 ? "border-info/70 bg-info/10" : "border-line bg-surface/50 opacity-50"}`}>
                <Lbl>render 1</Lbl>
                <div className="mt-1 font-mono text-[13px] text-fg">
                  count = <span className="text-info">0</span> <span className="text-[10.5px] text-subtle">(frozen)</span>
                </div>
              </Node>
              {s >= 5 && (
                <Node id="r2" className="border border-accent/70 bg-accent/10 px-2.5 py-1.5">
                  <Lbl>render 2</Lbl>
                  <div className="mt-1 font-mono text-[13px] text-fg">
                    count = <span className="text-accent">{final}</span>
                  </div>
                </Node>
              )}
            </div>
            <div>
              <Lbl>React&apos;s update queue for count</Lbl>
              <div className="mt-1.5 flex min-h-[34px] flex-wrap items-center gap-1.5">
                <Cell id="q-start" on={proc} tone="info">
                  0
                </Cell>
                {Array.from({ length: queued }, (_, k) => (
                  <span key={k} className="contents">
                    <span className="font-mono text-[11px] text-faint">→</span>
                    <Cell id={`q${k}`} on tone={proc ? "accent" : "warn"} flash={proc ? s : undefined}>
                      {v ? "replace with 1" : "c => c + 1"}
                      {proc && <span className="viz-say ml-1.5 text-accent">= {v ? 1 : k + 1}</span>}
                    </Cell>
                  </span>
                ))}
                {!queued && <span className="font-mono text-[11px] text-faint">empty</span>}
              </div>
            </div>
            <Out lines={s >= 3 ? ["0"] : []} />
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 02 immutable updates: React compares references -------------------------------------------

const MUT = `items.push(newItem);
setItems(items);`;
const COPY = `setItems([...items, newItem]);`;

/** Object.is(old, new): mutate and the reference is the same, so React can skip the render. */
export function Immutable() {
  return (
    <Viz
      title="Why mutating state doesn't re-render"
      lang="jsx"
      modes={[
        { id: "mutate", label: "push + setItems(items)" },
        { id: "copy", label: "setItems([...items, x])" },
      ]}
      code={(m) => (m === "mutate" ? MUT : COPY)}
      steps={(m) =>
        m === "mutate"
          ? [
              { say: "State `items` points at an array React remembers from the last render." },
              { say: "`push` changes **that same array** in place. React isn't told anything yet.", line: 1 },
              { say: "`setItems(items)` hands React the same reference. It checks `Object.is(old, new)`: **true**, same object…", line: 2 },
              { say: "…so React decides nothing changed and can skip the render. The screen keeps showing 2 items, and memoised children never see the third." },
            ]
          : [
              { say: "State `items` points at an array React remembers from the last render." },
              { say: "`[...items, newItem]` builds a **new** array: the same items plus the new one. The old array is left alone.", line: 1 },
              { say: "React checks `Object.is(old, new)`: **false**, different objects…", line: 1 },
              { say: "…so it re-renders, and the screen shows 3 items. Copy every level you change: `{ ...obj, field }`, `arr.map(…)`, `arr.filter(…)`." },
            ]
      }
    >
      {(s, m) => {
        const mut = m === "mutate";
        const oldItems = mut && s >= 1 ? ["A", "B", "C"] : ["A", "B"];
        const fresh = !mut && s >= 1;
        const target = fresh ? "new" : "old";
        return (
          <Stage at={`${m}${s}`} className="grid grid-cols-[auto_1fr] items-center gap-x-10 gap-y-4 sm:gap-x-16">
            <div className="flex flex-col items-start gap-6">
              <Name id="prev" tone="faint">
                last render
              </Name>
              <Name id="next" tone={s >= 2 ? "warn" : "fg"}>
                setItems(…)
              </Name>
            </div>
            <div className="flex flex-col items-start gap-4">
              <Obj id="old" type="array" addr="0x51" tone={mut && s >= 1 ? "warn" : "info"} flash={mut && s === 1 ? s : undefined}>
                <span className="inline-flex gap-1">
                  {oldItems.map((x) => (
                    <Cell key={x} on={x === "C"} tone="warn">
                      {x}
                    </Cell>
                  ))}
                </span>
              </Obj>
              {fresh && (
                <Obj id="new" type="array" addr="0x7c" tone="accent">
                  <span className="inline-flex gap-1">
                    {["A", "B", "C"].map((x) => (
                      <Cell key={x} on={x === "C"} tone="accent">
                        {x}
                      </Cell>
                    ))}
                  </span>
                </Obj>
              )}
            </div>
            <Arrow from="prev" to="old" tone="faint" />
            {s >= 2 && <Arrow from="next" to={target} tone="warn" />}
            <div className="col-span-2 flex flex-wrap items-center gap-2">
              {s >= 2 && (
                <span className={`viz-say border px-2 py-1 font-mono text-[12px] ${mut ? "border-warn/60 text-warn" : "border-accent/60 text-accent"}`}>
                  Object.is(old, new) → {mut ? "true: same object" : "false: new object"}
                </span>
              )}
              {s >= 3 && (
                <span className={`viz-say border px-2 py-1 font-mono text-[12px] ${mut ? "border-bad/60 text-bad" : "border-accent/60 text-accent"}`}>
                  {mut ? "render skipped · screen shows 2 items" : "re-render · screen shows 3 items"}
                </span>
              )}
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 03 an effect's life: setup, cleanup, setup ------------------------------------------------

type Ev = { kind: "render" | "setup" | "cleanup" | "unmount"; text: string };
const LIFE: Record<string, { ev: Ev[]; says: string[] }> = {
  prod: {
    ev: [
      { kind: "render", text: "render roomId='general'" },
      { kind: "setup", text: "setup: connect('general')" },
      { kind: "render", text: "render roomId='travel'" },
      { kind: "cleanup", text: "cleanup: close('general')" },
      { kind: "setup", text: "setup: connect('travel')" },
      { kind: "unmount", text: "unmount" },
      { kind: "cleanup", text: "cleanup: close('travel')" },
    ],
    says: [
      "First render. React updates the screen **before** running any effect.",
      "Then the effect's setup runs: one open connection, to `general`.",
      "`roomId` changes to `travel`, so the component renders again. The dependency changed, so the effect must re-sync…",
      "…but first React runs the **previous** effect's cleanup, closing `general`.",
      "Then setup runs with the new value: connected to `travel`. Still exactly one connection.",
      "The component leaves the screen…",
      "…and the last cleanup closes `travel`. Every setup was matched by a cleanup.",
    ],
  },
  strict: {
    ev: [
      { kind: "render", text: "render roomId='general'" },
      { kind: "setup", text: "setup: connect('general')" },
      { kind: "cleanup", text: "cleanup: close('general')" },
      { kind: "setup", text: "setup: connect('general')" },
    ],
    says: [
      "In development, `<StrictMode>` renders the component as usual…",
      "…runs the setup…",
      "…then immediately simulates leaving and coming back: it runs your cleanup…",
      "…and the setup again. With a correct cleanup you end up with one connection. Without one you'd see **two**: the leak is the bug, not Strict Mode.",
    ],
  },
};
const EV_TONE: Record<Ev["kind"], Tone> = { render: "info", setup: "accent", cleanup: "warn", unmount: "faint" };

/** Each setup is paired with a cleanup; React runs cleanup before the next setup and on unmount. */
export function EffectLife() {
  return (
    <Viz
      title="An effect's life: setup, cleanup, setup again"
      lang="jsx"
      code={"useEffect(() => {\n  const socket = connect(roomId);   // setup\n  return () => socket.close();      // cleanup\n}, [roomId]);"}
      modes={[
        { id: "prod", label: "roomId changes" },
        { id: "strict", label: "Strict Mode (dev)" },
      ]}
      steps={(m) =>
        LIFE[m].ev.map((e, i) => ({
          say: LIFE[m].says[i],
          line: e.kind === "setup" ? 2 : e.kind === "cleanup" ? 3 : undefined,
        }))
      }
    >
      {(s, m) => {
        const ev = LIFE[m].ev.slice(0, s + 1);
        // which connections are open now
        const open: string[] = [];
        for (const e of ev) {
          const room = e.text.match(/'(\w+)'/)?.[1];
          if (e.kind === "setup" && room) open.push(room);
          if (e.kind === "cleanup" && room) open.splice(open.indexOf(room), 1);
        }
        return (
          <Stage at={`${m}${s}`} className="space-y-4">
            <div className="flex flex-col items-start gap-1.5" style={{ minHeight: `${LIFE[m].ev.length * 31}px` }}>
              {ev.map((e, i) => (
                <Node
                  key={i}
                  id={`ev${i}`}
                  className={`flex items-center gap-2 border px-2 py-1 font-mono text-[12px] ${TONE[EV_TONE[e.kind]].border} ${
                    i === s ? TONE[EV_TONE[e.kind]].bg : "bg-surface/40 opacity-70"
                  }`}
                >
                  <span className={`w-14 text-[10px] uppercase tracking-[0.12em] ${TONE[EV_TONE[e.kind]].text}`}>{e.kind}</span>
                  <span className="text-fg">{e.text.replace(/^(setup|cleanup|render): ?/, "").replace(/^render /, "")}</span>
                </Node>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Lbl>open connections</Lbl>
              {open.length ? (
                open.map((r, i) => (
                  <Cell key={`${r}${i}`} id={`open-${r}${i}`} on tone={open.length > 1 ? "bad" : "accent"}>
                    {r}
                  </Cell>
                ))
              ) : (
                <span className="font-mono text-[12px] text-faint">none</span>
              )}
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 03 race conditions: abort the stale request ------------------------------------------------

type Req = { q: string; a: number; b: number };
const REQS: Req[] = [
  { q: "ap", a: 0, b: 3 },
  { q: "apple", a: 1, b: 2 },
];

/** A slow response for an old query lands last; aborting it in the cleanup keeps the newest result. */
export function Race() {
  return (
    <Viz
      title="Out-of-order responses, and the cleanup that fixes them"
      lang="jsx"
      code={(m) =>
        m === "naive"
          ? "useEffect(() => {\n  fetch(`/api/search?q=${query}`)\n    .then((r) => r.json())\n    .then(setResults);\n}, [query]);"
          : "useEffect(() => {\n  const ctrl = new AbortController();\n  fetch(`/api/search?q=${query}`, { signal: ctrl.signal })\n    .then((r) => r.json())\n    .then(setResults);\n  return () => ctrl.abort();\n}, [query]);"
      }
      modes={[
        { id: "naive", label: "no cleanup" },
        { id: "abort", label: "ctrl.abort()" },
      ]}
      steps={(m) => {
        const ab = m === "abort";
        return [
          { say: "The user types `ap`. The effect runs and sends a request. The server is slow for this one.", line: ab ? 3 : 2 },
          ab
            ? { say: "They keep typing: `query` becomes `apple`. Before the effect re-runs, its cleanup **aborts** the `ap` request.", line: 6 }
            : { say: "They keep typing: `query` becomes `apple`, and a second request goes out. The first one is still in flight.", line: 2 },
          { say: "The `apple` response comes back first, and the list shows apple results. So far so good.", line: ab ? 5 : 4 },
          ab
            ? { say: "The `ap` request was aborted, so its result never arrives and can't overwrite anything. The screen keeps the results for what the user typed." }
            : { say: "Then the **older** `ap` response lands and `setResults` overwrites the list. The box says `apple`, the results are for `ap`.", line: 4 },
        ];
      }}
    >
      {(s, m) => {
        const ab = m === "abort";
        const now = [0.4, 1.4, 2.2, 3.2][s];
        const shown = s >= 3 ? (ab ? "apple" : "ap") : s >= 2 ? "apple" : null;
        const pct = (x: number) => `${(x / 3.6) * 100}%`;
        return (
          <Stage at={`${m}${s}`} className="space-y-4">
            <div className="relative space-y-2">
              {REQS.map((r, i) => {
                const started = now >= r.a;
                const aborted = ab && i === 0 && now >= 1;
                const end = aborted ? 1 : r.b;
                const landed = !aborted && now >= r.b;
                return (
                  <div key={r.q} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
                    <span className="font-mono text-[11.5px] text-muted">q=&quot;{r.q}&quot;</span>
                    <div className="relative h-6 border-b border-line">
                      {started && (
                        <div
                          className={`absolute top-1 bottom-1 ${aborted ? "bg-faint/40" : i === 0 ? "bg-warn/50" : "bg-info/60"}`}
                          style={{ left: pct(r.a), width: pct(Math.min(now, end) - r.a), transition: "width 600ms cubic-bezier(0.22, 0.8, 0.24, 1)" }}
                        />
                      )}
                      {aborted && (
                        <span className="viz-say absolute top-1/2 -translate-y-1/2 pl-1 font-mono text-[10.5px] text-faint" style={{ left: pct(1) }}>
                          ✗ aborted
                        </span>
                      )}
                      {landed && (
                        // near the right edge the label sits inside the bar, so it isn't cut off
                        <span
                          className={`viz-say absolute top-1/2 -translate-y-1/2 font-mono text-[10.5px] ${r.b / 3.6 > 0.65 ? "-translate-x-full pr-1 text-fg" : "pl-1"} ${
                            r.b / 3.6 > 0.65 ? "" : i === 0 ? "text-bad" : "text-info"
                          }`}
                          style={{ left: pct(r.b) }}
                        >
                          ● response
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="pointer-events-none absolute inset-y-0 right-0 left-[6rem]">
                <div className="absolute inset-y-0 w-px bg-warn" style={{ left: pct(now), transition: "left 600ms cubic-bezier(0.22, 0.8, 0.24, 1)" }} />
              </div>
            </div>
            <div className="border border-line bg-surface p-2.5">
              <div className="flex items-center gap-2 border border-line bg-field px-2 py-1 font-sans text-[13px] text-fg">
                <span className="text-faint">⌕</span>
                {s >= 1 ? "apple" : "ap"}
                <span className="h-4 w-px animate-pulse bg-accent" />
              </div>
              <div className="mt-2 min-h-[44px] font-sans text-[12.5px]">
                {shown ? (
                  <div key={shown} className={`viz-say ${shown === "ap" ? "text-bad" : "text-fg-2"}`}>
                    {shown === "apple" ? "apple · apple pie · apple juice" : "apartment · app store · apricot"}
                    <div className={`mt-1 font-mono text-[10.5px] ${shown === "ap" ? "text-bad" : "text-accent"}`}>
                      {shown === "ap" ? "✗ results for “ap”, but the box says “apple”" : "✓ matches the box"}
                    </div>
                  </div>
                ) : (
                  <span className="font-mono text-[11px] text-faint">loading…</span>
                )}
              </div>
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

