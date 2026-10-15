"use client";

import { Arrow, Cell, Lbl, Node, Out, Stage, type Step, TONE, type Tone, Viz } from "./kit";

// ---- 05 a lazy generator pipeline ------------------------------------------------------------

const PIPE = `def read_trades(path):
    with open(path) as f:
        for line in f:
            isin, qty = line.rstrip("\\n").split(",")
            yield isin, int(qty)

def big_only(rows, minimum):
    for isin, qty in rows:
        if qty >= minimum:
            yield isin, qty

pipeline = big_only(read_trades("trades.csv"), 1_000)
for isin, qty in pipeline:
    print(isin, qty)`;

const LINES = ["PT01,500", "PT02,2500", "PT03,1200"];
type Gen = "new" | "running" | "paused" | "done";
interface PipeState {
  read: number; // lines read so far
  rt: Gen;
  bo: Gen;
  token: { at: "rt" | "bo" | "loop"; row: number; dropped?: boolean } | null;
  out: string[];
}
const PIPE_STEPS: (Step & PipeState)[] = [
  { say: "Calling the generator functions runs **none** of their code. `pipeline` is just two paused generators, stacked. No file has been opened.", line: 12, read: 0, rt: "new", bo: "new", token: null, out: [] },
  { say: "The `for` loop asks `big_only` for a value. It starts running, reaches `for … in rows`, and asks `read_trades` for one.", line: 13, read: 0, rt: "running", bo: "running", token: null, out: [] },
  { say: "`read_trades` opens the file, reads **one** line and yields it. It pauses right there, with the file still open and its place kept.", line: 5, read: 1, rt: "paused", bo: "running", token: { at: "bo", row: 0 }, out: [] },
  { say: "`big_only` checks it: 500 is under 1,000, so it yields nothing and asks for the next row.", line: 9, read: 1, rt: "paused", bo: "running", token: { at: "bo", row: 0, dropped: true }, out: [] },
  { say: "`read_trades` resumes **after** its `yield`, reads line 2 and yields again.", line: [3, 5], read: 2, rt: "paused", bo: "running", token: { at: "bo", row: 1 }, out: [] },
  { say: "2,500 passes the check, so `big_only` yields it to the loop and pauses too. One row is in memory, however big the file is.", line: 10, read: 2, rt: "paused", bo: "paused", token: { at: "loop", row: 1 }, out: ["PT02 2500"] },
  { say: "Next round, the same relay: line 3 is read, passes the check and reaches the loop.", line: 14, read: 3, rt: "paused", bo: "paused", token: { at: "loop", row: 2 }, out: ["PT02 2500", "PT03 1200"] },
  { say: "The file runs out, so `read_trades` finishes, which ends `big_only`'s loop, which ends yours (`StopIteration` does this quietly).", line: 13, read: 3, rt: "done", bo: "done", token: null, out: ["PT02 2500", "PT03 1200"] },
];
const GEN_TONE: Record<Gen, Tone> = { new: "faint", running: "accent", paused: "warn", done: "faint" };
const GEN_LABEL: Record<Gen, string> = { new: "not started", running: "running", paused: "paused at yield", done: "finished" };

/** Each next() pulls one row through every stage; nothing runs until the loop asks. */
export function GeneratorPipeline() {
  return (
    <Viz title="A generator pipeline pulls one row at a time" code={PIPE} steps={PIPE_STEPS}>
      {(s) => {
        const st = PIPE_STEPS[s];
        const token = (at: "rt" | "bo" | "loop") =>
          st.token?.at === at && (
            <Node
              id="row"
              className={`border px-1.5 py-0.5 font-mono text-[11.5px] ${
                st.token.dropped ? "border-bad/60 bg-bad/10 text-bad line-through" : "border-warn/70 bg-warn/15 text-warn"
              }`}
            >
              ({`'${LINES[st.token.row].split(",")[0]}', ${LINES[st.token.row].split(",")[1]}`})
            </Node>
          );
        const gen = (id: "rt" | "bo", label: string) => (
          <Node id={id} className={`flex min-h-[44px] flex-wrap items-center gap-2 border px-2.5 py-1.5 ${TONE[GEN_TONE[st[id]]].border} ${TONE[GEN_TONE[st[id]]].bg}`}>
            <span className="font-mono text-[12.5px] text-fg">{label}</span>
            <span className={`font-mono text-[10.5px] ${TONE[GEN_TONE[st[id]]].text}`}>● {GEN_LABEL[st[id]]}</span>
            <span className="ml-auto">{token(id)}</span>
          </Node>
        );
        return (
          <Stage at={s} className="space-y-3">
            <Node id="file" className="flex flex-wrap items-center gap-1.5 border border-line bg-surface px-2.5 py-1.5">
              <span className="mr-1 font-mono text-[12px] text-subtle">trades.csv</span>
              {LINES.map((l, k) => (
                <Cell key={l} on={k === st.read - 1 && st.rt !== "done"} tone="warn" dim={k < st.read - 1 || st.rt === "done"} className="text-[11.5px]!">
                  {l}
                </Cell>
              ))}
              <span className="ml-auto font-mono text-[10.5px] text-subtle">{st.read ? `${st.read} of 3 read` : "not opened"}</span>
            </Node>
            {gen("rt", "read_trades()")}
            {gen("bo", "big_only(…, 1_000)")}
            <Node id="loop" className="flex min-h-[44px] flex-wrap items-center gap-2 border border-iris/70 bg-iris/5 px-2.5 py-1.5">
              <span className="font-mono text-[12.5px] text-fg">for … in pipeline</span>
              <span className="ml-auto">{token("loop")}</span>
            </Node>
            <Arrow from="file" to="rt" tone="faint" fromSide="b" toSide="t" bend={0.2} />
            <Arrow from="rt" to="bo" tone="faint" fromSide="b" toSide="t" bend={0.2} />
            <Arrow from="bo" to="loop" tone="faint" fromSide="b" toSide="t" bend={0.2} />
            <Out lines={st.out} />
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 06 attribute lookup: instance, then class ---------------------------------------------

const ATTRS = `class Account:
    currency = "EUR"
    def __init__(self, owner):
        self.owner = owner

a = Account("Ana")
b = Account("Bo")
print(a.currency)
a.currency = "USD"
print(a.currency, b.currency)`;

/** `obj.attr` checks the instance's own dict, then its class; assigning always writes to the instance. */
export function AttrLookup() {
  const steps: Step[] = [
    { say: "The class body runs once. `currency` lives on the **class**, shared by every instance.", line: [1, 4] },
    { say: "Each instance gets its own `__dict__`. `__init__` puts `owner` there, per object.", line: [6, 7] },
    { say: "`a.currency`: Python looks in `a`'s own dict first. There's no `currency` in it…", line: 8 },
    { say: "…so it follows `a`'s class and finds `currency = \"EUR\"` there.", line: 8 },
    { say: "Assigning **never** writes to the class. `a.currency = \"USD\"` adds a new entry to `a`'s own dict, which now hides the class value.", line: 9 },
    { say: "`a.currency` finds its own `\"USD\"` first. `b` has none, so `b.currency` still reaches the class: `USD EUR`.", line: 10 },
  ];
  return (
    <Viz title="Where `obj.attr` is looked up" code={ATTRS} steps={steps}>
      {(s) => {
        const probe = s === 2 ? "a" : s === 3 ? "cls" : null;
        const inst = (id: "a" | "b", owner: string) => (
          <Node
            id={id}
            className={`min-w-[8.5rem] border px-2.5 pb-2 pt-1 ${probe === id ? "border-warn/70 bg-warn/10" : "border-info/60 bg-info/5"} ${s >= 1 ? "" : "invisible"}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] text-fg">{id}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-info">instance __dict__</span>
            </div>
            <div className="mt-1.5 flex flex-col items-start gap-1">
              <Cell className="text-[12px]!">owner = &quot;{owner}&quot;</Cell>
              {id === "a" && s >= 4 && (
                <Cell id="a-cur" on tone="accent" className="text-[12px]!" flash={s}>
                  currency = &quot;USD&quot;
                </Cell>
              )}
              {probe === id && <span className="viz-say font-mono text-[11px] text-faint">✗ no currency here</span>}
            </div>
          </Node>
        );
        return (
          <Stage at={s} className="space-y-3">
            <Node id="cls" className={`border px-2.5 pb-2 pt-1 ${probe === "cls" ? "border-warn/70 bg-warn/10" : "border-plum/60 bg-plum/5"}`}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-fg">Account</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-plum">class __dict__</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Cell id="cls-cur" on={s === 3 || s === 5} tone="accent" className="text-[12px]!">
                  currency = &quot;EUR&quot;
                </Cell>
                <Cell className="text-[12px]!">__init__</Cell>
              </div>
            </Node>
            <div className="flex flex-wrap gap-x-10 gap-y-3 pt-8">
              {inst("a", "Ana")}
              {inst("b", "Bo")}
            </div>
            {s >= 1 && <Arrow from="a" to="cls" tone={s === 3 ? "warn" : "faint"} dashed={s !== 3} label="__class__" fromSide="t" toSide="b" bend={0.25} />}
            {s >= 1 && <Arrow from="b" to="cls" tone={s === 5 ? "warn" : "faint"} dashed={s !== 5} fromSide="t" toSide="b" bend={0.25} />}
            <Out lines={s >= 5 ? ["EUR", "USD EUR"] : s >= 3 ? ["EUR"] : []} />
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 07 try / except / else / finally ---------------------------------------------------------

const TRY = `try:
    rate = fetch_rate("USD")
except TimeoutError:
    rate = cached_rate("USD")
except (KeyError, ValueError) as err:
    log.warning("bad rate data: %s", err)
    raise
else:
    save(rate)
finally:
    close_session()`;

type Clause = "try" | "timeout" | "bad" | "else" | "finally" | "after";
const CLAUSES: { k: Clause; label: string; lines: [number, number] }[] = [
  { k: "try", label: "try", lines: [1, 2] },
  { k: "timeout", label: "except TimeoutError", lines: [3, 4] },
  { k: "bad", label: "except (KeyError, ValueError)", lines: [5, 7] },
  { k: "else", label: "else", lines: [8, 9] },
  { k: "finally", label: "finally", lines: [10, 11] },
  { k: "after", label: "after the block", lines: [11, 11] },
];
const ROUTES: Record<string, { path: Clause[]; says: string[]; notes: Partial<Record<Clause, string>>; end: string }> = {
  ok: {
    path: ["try", "else", "finally", "after"],
    says: [
      "The `try` body runs, and `fetch_rate` returns normally.",
      "No exception, so both `except` clauses are skipped and `else` runs: `save(rate)`. It sits outside `try`, so an error in `save()` isn't caught by mistake.",
      "`finally` runs, as it always does.",
      "The program carries on after the block.",
    ],
    notes: { try: "returned 1.08", else: "save(rate)", finally: "close_session()" },
    end: "carries on",
  },
  timeout: {
    path: ["try", "timeout", "finally", "after"],
    says: [
      "`fetch_rate` raises `TimeoutError`. The rest of the `try` body is abandoned.",
      "Python checks the `except` clauses top to bottom. The first one matches, so it handles the error: use the cached rate.",
      "`else` is skipped, because the `try` raised. `finally` still runs.",
      "The error was handled, so the program carries on.",
    ],
    notes: { try: "✗ TimeoutError", timeout: "rate = cached_rate()", finally: "close_session()" },
    end: "carries on",
  },
  bad: {
    path: ["try", "bad", "finally", "after"],
    says: [
      "`fetch_rate` raises `KeyError` this time.",
      "The first `except` doesn't match, the second does. It logs, then a bare `raise` re-raises the **same** exception.",
      "Even with an exception on its way out, `finally` runs first.",
      "Then the `KeyError` carries on up to whoever called this code.",
    ],
    notes: { try: "✗ KeyError", timeout: "doesn't match", bad: "log, then raise", finally: "close_session()" },
    end: "KeyError goes up to the caller",
  },
};

/** Which clauses run, for a success, a handled error and a re-raised one. */
export function TryFlow() {
  return (
    <Viz
      title="Which clauses run: try, except, else, finally"
      modes={[
        { id: "ok", label: "no error" },
        { id: "timeout", label: "TimeoutError" },
        { id: "bad", label: "KeyError" },
      ]}
      code={TRY}
      steps={(m) =>
        ROUTES[m].path.map((k, i) => ({
          say: ROUTES[m].says[i],
          line: k === "after" ? undefined : CLAUSES.find((c) => c.k === k)!.lines,
        }))
      }
    >
      {(s, m) => {
        const r = ROUTES[m];
        const done = r.path.slice(0, s + 1);
        const failed = m === "bad" && s >= 3;
        return (
          <Stage at={`${m}${s}`} className="flex flex-col items-start gap-2.5">
            {CLAUSES.map(({ k, label }) => {
              const visited = done.includes(k);
              const now = r.path[s] === k;
              const skipped = !r.path.includes(k) || (!visited && s >= r.path.indexOf(k));
              const tone: Tone = now ? (k === "after" && failed ? "bad" : "warn") : visited ? "accent" : "faint";
              return (
                <Node
                  key={k}
                  id={`c-${k}`}
                  className={`flex w-full max-w-[24rem] flex-wrap items-center gap-x-2.5 gap-y-1 border px-2.5 py-1.5 ${
                    k === "after" ? "border-dashed" : ""
                  } ${TONE[tone].border} ${visited ? TONE[tone].bg : "bg-surface/50"} ${skipped && !visited && s > 0 ? "opacity-35" : ""}`}
                >
                  <span className={`font-mono text-[12.5px] ${visited ? "text-fg" : "text-muted"}`}>{label}</span>
                  {visited && (r.notes[k] || k === "after") && (
                    <span className={`viz-say font-mono text-[11px] ${r.notes[k]?.startsWith("✗") ? "text-bad" : TONE[tone].text}`}>{k === "after" ? r.end : r.notes[k]}</span>
                  )}
                  {!visited && k === "timeout" && m === "bad" && s >= 1 && <span className="font-mono text-[11px] text-faint">doesn&apos;t match</span>}
                </Node>
              );
            })}
            {done.slice(1).map((k, i) => (
              <Arrow key={k} from={`c-${done[i]}`} to={`c-${k}`} tone={i === done.length - 2 ? "warn" : "accent"} fromSide="r" toSide="r" bend={0.5} />
            ))}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 08 validate at the edges ---------------------------------------------------------------

type Check = { field: string; input: string; rule: string; result: string; ok: boolean };
const EDGE: Record<string, { input: string; checks: Check[]; out: string[] }> = {
  ok: {
    input: '{"isin": "fr0000131104", "qty": "5"}',
    checks: [
      { field: "isin", input: '"fr0000131104"', rule: "str, 12 chars, then upper()", result: "'FR0000131104'", ok: true },
      { field: "qty", input: '"5"', rule: "int, > 0", result: "5  (a str of digits is coerced)", ok: true },
      { field: "side", input: "missing", rule: 'Literal["BUY", "SELL"]', result: "'BUY'  (the default)", ok: true },
      { field: "note", input: "missing", rule: "str | None", result: "None  (the default)", ok: true },
    ],
    out: ["Order(isin='FR0000131104', qty=5,", "      side='BUY', note=None)"],
  },
  bad: {
    input: '{"isin": "short", "qty": 0}',
    checks: [
      { field: "isin", input: '"short"', rule: "str, 12 chars", result: "✗ too short (5 chars)", ok: false },
      { field: "qty", input: "0", rule: "int, > 0", result: "✗ must be greater than 0", ok: false },
      { field: "side", input: "missing", rule: 'Literal["BUY", "SELL"]', result: "'BUY'  (the default)", ok: true },
      { field: "note", input: "missing", rule: "str | None", result: "None  (the default)", ok: true },
    ],
    out: ["ValidationError: 2 validation errors for Order", "  isin: String should have at least 12 characters", "  qty: Input should be greater than 0"],
  },
};

/** Untrusted data crosses one gate, field by field; inside the app everything is typed. */
export function ValidateEdge() {
  return (
    <Viz
      title="Pydantic checks data once, at the edge"
      modes={[
        { id: "ok", label: "good input" },
        { id: "bad", label: "bad input" },
      ]}
      steps={(m) => [
        { say: "Data from outside (a request body, a file, an LLM's JSON) is just a dict of whatever was sent. Type hints alone wouldn't stop anything." },
        ...EDGE[m].checks.map((c) => ({
          say:
            c.field === "isin"
              ? c.ok
                ? "`model_validate` checks each field against its declaration. `isin` is 12 characters, and the validator upper-cases it."
                : "`isin` is only 5 characters: that's an error, but Pydantic keeps going so you get **every** problem at once."
              : c.field === "qty"
                ? c.ok
                  ? "`qty` arrived as the string `\"5\"`. In the default (lax) mode a numeric string is coerced to the int `5`."
                  : "`qty` is 0, which fails `gt=0`: a second error."
                : c.field === "side"
                  ? "`side` is missing, so it gets its default."
                  : "`note` is optional and defaults to `None`.",
          ms: c.field === "note" || c.field === "side" ? 2600 : undefined,
        })),
        m === "ok"
          ? { say: "Out comes a real `Order`: right types, defaults filled in. Code past this point can trust it without checking again." }
          : { say: "Instead of an `Order`, it raises **one** `ValidationError` listing both problems. Nothing invalid gets into the app; send the errors back to the caller (or the LLM, to retry)." },
      ]}
    >
      {(s, m) => {
        const e = EDGE[m];
        const n = Math.min(s, 4); // checks done
        const last = s === 5;
        return (
          <Stage at={`${m}${s}`} className="space-y-5">
            <div>
              <Lbl>outside · untrusted</Lbl>
              <Node id="raw" className="mt-1 inline-block max-w-full border border-warn/60 bg-warn/5 px-2.5 py-1.5 font-mono text-[12px] text-fg">
                {e.input}
              </Node>
            </div>
            <Node id="gate" className={`border px-2.5 py-2 ${s >= 1 ? "border-iris/70 bg-iris/5" : "border-line bg-surface/50"}`}>
              <span className="font-mono text-[11px] text-iris">Order.model_validate(data)</span>
              <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-[11.5px]">
                {e.checks.map((c, k) => (
                  <div key={c.field} className={`contents ${k < n ? "" : "[&>*]:opacity-40"}`}>
                    <span className={`transition-opacity ${k === n - 1 && !last ? "text-warn" : "text-fg"}`}>{c.field}</span>
                    <span className="min-w-0 transition-opacity">
                      <span className="text-subtle">{c.rule}</span>
                      {k < n && <span className={`viz-say block ${c.ok ? "text-accent" : "text-bad"}`}>→ {c.result}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Node>
            <div>
              <Lbl>{last && m === "bad" ? "raised to the caller" : "inside · typed"}</Lbl>
              <Node
                id="out"
                className={`mt-1 border px-2.5 py-1.5 font-mono text-[12px] ${
                  last ? (m === "ok" ? "border-accent/70 bg-accent/10 text-fg" : "border-bad/70 bg-bad/10 text-bad") : "border-dashed border-line text-faint"
                }`}
              >
                {last ? e.out.map((l) => <div key={l} className="whitespace-pre-wrap">{l}</div>) : "nothing yet"}
              </Node>
            </div>
            <Arrow from="raw" to="gate" tone="warn" fromSide="b" toSide="t" bend={0.3} />
            {last && <Arrow from="gate" to="out" tone={m === "ok" ? "accent" : "bad"} fromSide="b" toSide="t" bend={0.3} />}
          </Stage>
        );
      }}
    </Viz>
  );
}

