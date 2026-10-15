"use client";

import { Arrow, Cell, Lbl, Name, Node, Obj, Out, Stage, type Step, TONE, type Tone, Viz } from "./kit";

// ---- 03 scope: the LEGB rule -------------------------------------------------------------

const LEGB_FIND = `x = "global"

def outer():
    x = "enclosing"
    def inner():
        print(x, len)
    inner()

outer()`;

const LEGB_BUMP = `count = 0

def bump():
    count += 1

bump()`;

type Scope = "L" | "E" | "G" | "B";
const SCOPES: { k: Scope; name: string; tone: Tone }[] = [
  { k: "B", name: "built-ins", tone: "plum" },
  { k: "G", name: "global · the module", tone: "info" },
  { k: "E", name: "enclosing · outer()", tone: "iris" },
  { k: "L", name: "local · inner()", tone: "accent" },
];

/** A lookup walks outward, Local → Enclosing → Global → Built-in, and stops at the first hit. */
export function Legb() {
  return (
    <Viz
      title="How Python finds a name: L → E → G → B"
      modes={[
        { id: "find", label: "print(x, len)" },
        { id: "bump", label: "count += 1" },
      ]}
      code={(m) => (m === "find" ? LEGB_FIND : LEGB_BUMP)}
      steps={(m) =>
        m === "find"
          ? [
              { say: "Each function call gets its own scope, nested inside the scope where the function was **defined**. Built-ins wrap everything.", line: [1, 9] },
              { say: "To find `x`, Python starts in the **local** scope of `inner()`. No `x` there.", line: 6 },
              { say: "One level out, the **enclosing** scope of `outer()` has `x = \"enclosing\"`. Found: the search stops, so the global `x` is never reached.", line: 6 },
              { say: "Now `len`: not local, not in `outer()`, not in the module…", line: 6 },
              { say: "…and finally found among the **built-ins**. A module-level `len = …` would have shadowed it.", line: 6 },
            ]
          : [
              { say: "Before running `bump`, Python compiles it and sees an **assignment** to `count` (`+=` assigns). That makes `count` local for the **whole** function.", line: 4 },
              { say: "At run time `count += 1` must first read `count`. The lookup starts locally, and finds a local `count` that has no value yet.", line: 4 },
              { say: "Because the name is local, Python doesn't go on to the global `count = 0`. It raises `UnboundLocalError`. Fix: pass the value in and return it, or declare `global count`.", line: 6 },
            ]
      }
    >
      {(s, m) => {
        const find = m === "find";
        // which scope is being searched, and what it found there
        const probe: Scope | null = find ? ([null, "L", "E", "L", "B"] as const)[s] : s >= 1 ? "L" : null;
        const looking = find ? (s >= 3 ? "len" : "x") : "count";
        const searched = (k: Scope): "miss" | "hit" | null => {
          if (find) {
            if (s === 1 && k === "L") return "miss";
            if (s === 2) return k === "L" ? "miss" : k === "E" ? "hit" : null;
            if (s === 3 && k === "L") return "miss";
            if (s === 4) return k === "B" ? "hit" : "miss";
            return null;
          }
          if (s >= 1 && k === "L") return "miss";
          return null;
        };
        const vars: Record<Scope, string[]> = find
          ? { B: ["len", "print", "…"], G: ['x = "global"', "outer"], E: ['x = "enclosing"', "inner"], L: [] }
          : { B: ["print", "…"], G: ["count = 0", "bump"], E: [], L: ["count  (no value yet)"] };
        const layers = find ? SCOPES : SCOPES.filter((x) => x.k !== "E").map((x) => (x.k === "L" ? { ...x, name: "local · bump()" } : x));

        const nest = (i: number): React.ReactNode => {
          if (i >= layers.length) return null;
          const { k, name, tone } = layers[i];
          const hit = searched(k);
          const on = probe === k || hit === "hit";
          return (
            <Node
              id={`scope-${k}`}
              // no opacity here: scopes are nested, so it would compound and hide the inner ones
              className={`border border-dashed p-2 sm:p-2.5 ${on ? `${TONE[tone].border} ${TONE[tone].bg}` : "border-line bg-surface/50"}`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`font-mono text-[10px] uppercase tracking-[0.13em] ${on ? TONE[tone].text : "text-subtle"}`}>
                  <b className="font-semibold">{k}</b> · {name}
                </span>
                {hit && (
                  <span className={`viz-say font-mono text-[11px] ${hit === "hit" ? "text-accent" : m === "bump" ? "text-bad" : "text-faint"}`}>
                    {hit === "hit" ? `✓ ${looking} found` : m === "bump" ? `✗ ${looking} has no value: UnboundLocalError` : `✗ no ${looking}`}
                  </span>
                )}
                {probe === k && (
                  <Node id="probe" className="ml-auto border border-warn/70 bg-warn/10 px-1.5 py-px font-mono text-[11px] text-warn">
                    looking up {looking}
                  </Node>
                )}
              </div>
              {vars[k].length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {vars[k].map((v) => (
                    <Cell key={v} on={hit === "hit" && v.startsWith(looking)} tone="accent" className="text-[12px]!">
                      {v}
                    </Cell>
                  ))}
                </div>
              )}
              {i + 1 < layers.length && <div className="mt-2">{nest(i + 1)}</div>}
            </Node>
          );
        };
        return (
          <Stage at={`${m}${s}`} className="space-y-3">
            {nest(0)}
            {find && <Out lines={s >= 4 ? ["enclosing <built-in function len>"] : []} />}
            {!find && <Out lines={s >= 2 ? ["UnboundLocalError: cannot access local variable 'count'"] : []} />}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 04 closures: late binding -----------------------------------------------------------

const LATE = `callbacks = []
for name in ["fx", "rates"]:
    callbacks.append(lambda: name.upper())

print([cb() for cb in callbacks])`;

const BOUND = `callbacks = []
for name in ["fx", "rates"]:
    callbacks.append(lambda name=name: name.upper())

print([cb() for cb in callbacks])`;

/** Both lambdas refer to the variable `name`, and read it only when called. */
export function LateBinding() {
  return (
    <Viz
      title="Closures remember the variable, not its value"
      modes={[
        { id: "late", label: "lambda: name" },
        { id: "bound", label: "lambda name=name" },
      ]}
      code={(m) => (m === "late" ? LATE : BOUND)}
      steps={(m) =>
        m === "late"
          ? [
              { say: "First time round the loop: the variable `name` points at `\"fx\"`.", line: 2 },
              { say: "The lambda doesn't copy the value. It keeps a link to the **variable** `name` itself, to read later.", line: 3 },
              { say: "Next iteration: the **same** variable moves on to `\"rates\"`.", line: 2 },
              { say: "The second lambda links to that same variable. Two functions, one shared variable.", line: 3 },
              { say: "Now they're called. Each one reads `name` **now**, and it points at `\"rates\"`: `['RATES', 'RATES']`.", line: 5 },
            ]
          : [
              { say: "First time round: `name` points at `\"fx\"`.", line: 2 },
              { say: "`name=name` is a default argument, evaluated **now**, so this lambda stores its own reference to `\"fx\"`.", line: 3 },
              { say: "The loop variable moves on to `\"rates\"`. The first lambda doesn't care: it holds `\"fx\"` itself.", line: 2 },
              { say: "The second lambda stores `\"rates\"`.", line: 3 },
              { say: "Called later, each uses its own default: `['FX', 'RATES']`.", line: 5 },
            ]
      }
    >
      {(s, m) => {
        const late = m === "late";
        const cur = s >= 2 ? "rates" : "fx";
        const reading = s === 4;
        return (
          <Stage at={`${m}${s}`} className="grid grid-cols-[auto_auto] items-center justify-start gap-x-10 gap-y-4 sm:gap-x-20">
            <Lbl>functions</Lbl>
            <Lbl>loop variable and strings</Lbl>
            <div className="row-span-2 flex flex-col items-start gap-5">
              {[1, 2].map((k) =>
                s >= (k === 1 ? 1 : 3) ? (
                  <Obj key={k} id={`fn${k}`} type={`lambda #${k}`} tone="iris" flash={reading ? s : undefined}>
                    {late ? (
                      <span className="text-[12px] text-subtle">{reading ? <span className="text-iris">reads name now → &quot;rates&quot;</span> : "will read name later"}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <span className="text-subtle">default</span>
                        <Name id={`own${k}`} tone="iris">
                          name
                        </Name>
                      </span>
                    )}
                  </Obj>
                ) : (
                  <div key={k} className="h-[54px]" />
                ),
              )}
            </div>
            <Name id="name" tone="warn" flash={s === 2 ? s : undefined} className="justify-self-start">
              name
            </Name>
            <div className="flex flex-col items-start gap-3">
              <Obj id="fx" type="str" tone={cur === "fx" ? "warn" : "faint"}>
                &quot;fx&quot;
              </Obj>
              <Obj id="rates" type="str" tone={cur === "rates" ? "warn" : "faint"}>
                &quot;rates&quot;
              </Obj>
            </div>
            <Arrow from="name" to={cur} tone="warn" />
            {late
              ? [1, 2].map((k) => s >= (k === 1 ? 1 : 3) && <Arrow key={k} from={`fn${k}`} to="name" tone="iris" dashed={!reading} />)
              : [1, 2].map((k) => s >= (k === 1 ? 1 : 3) && <Arrow key={k} from={`own${k}`} to={k === 1 ? "fx" : "rates"} tone="iris" />)}
            <div className="col-span-2">
              <Out lines={s >= 4 ? [late ? "['RATES', 'RATES']" : "['FX', 'RATES']"] : []} />
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 04 stacked decorators -----------------------------------------------------------------

const STACK = `@timed        # applied second
@retry(3)     # applied first
def get_quote(isin): ...

get_quote("PT123")`;

type Layer = "timed" | "retry" | "fn";

/** Decorators wrap bottom-up; a call goes in through the outermost wrapper and back out. */
export function DecoratorStack() {
  const steps: Step[] = [
    { say: "`def` builds the plain function first. The name `get_quote` isn't bound yet: the decorators run before that happens.", line: 3 },
    { say: "The decorator nearest the `def` applies first: `retry(3)` returns a wrapper around `get_quote`.", line: 2 },
    { say: "Then `@timed` wraps **that** wrapper. Decorators apply bottom-up.", line: 1 },
    { say: "The name `get_quote` now points at the outermost layer: it's `timed(retry(3)(get_quote))`.", line: [1, 3] },
    { say: "A call enters through the **outermost** wrapper: `timed` starts its clock…", line: 5 },
    { say: "…and calls the next layer in: `retry` makes attempt 1…", line: 5 },
    { say: "…which reaches the real function. Say it raises a timeout.", line: 5 },
    { say: "`retry` catches it and tries again. Attempt 2 succeeds.", line: 5 },
    { say: "The result travels back out, and `timed` stops its clock. The time it reports **includes every retry**: order matters.", line: 5 },
  ];
  // where the call is, and what each layer shows
  const at: (Layer | null)[] = [null, null, null, null, "timed", "retry", "fn", "fn", "timed"];
  return (
    <Viz title="Stacked decorators: wrapped bottom-up, called outside-in" code={STACK} steps={steps}>
      {(s) => {
        const where = at[s];
        const layer = (k: Layer, tone: Tone, label: string, note: string, child?: React.ReactNode) => (
          <Node
            id={`layer-${k}`}
            className={`border p-2.5 ${where === k ? `${TONE[tone].border} ${TONE[tone].bg}` : `${TONE[tone].border} bg-surface/40`}`}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`font-mono text-[11px] ${TONE[tone].text}`}>{label}</span>
              <span className="font-mono text-[10.5px] text-subtle">{note}</span>
              {where === k && (
                <Node id="call" className="ml-auto border border-warn/70 bg-warn/15 px-1.5 py-px font-mono text-[11px] text-warn">
                  {s === 8 ? "← result" : "call →"}
                </Node>
              )}
            </div>
            {child && <div className="mt-2">{child}</div>}
          </Node>
        );
        const fnNote = s === 6 ? "✗ TimeoutError" : s === 7 ? "✓ returns 101.4" : "the real function";
        const retryNote = s === 5 ? "attempt 1" : s === 6 ? "attempt 1 failed" : s >= 7 ? "attempt 2" : "retries up to 3 times";
        const timedNote = s >= 4 && s < 8 ? "clock running…" : s === 8 ? "clock stopped: 2.3 s" : "times the call";
        const fn = layer("fn", "accent", "get_quote", fnNote);
        const retry = s >= 1 ? layer("retry", "iris", "retry(3) wrapper", retryNote, fn) : null;
        const timed = s >= 2 ? layer("timed", "plum", "timed wrapper", timedNote, retry) : null;
        return (
          <Stage at={s} className="space-y-4">
            <div className="flex items-start gap-6 sm:gap-10">
              <div className="pt-2">
                <Name id="name" tone="warn" dim={s < 3}>
                  get_quote
                </Name>
              </div>
              <div className="min-w-0 flex-1">{timed ?? retry ?? fn}</div>
            </div>
            {s >= 3 && <Arrow from="name" to="layer-timed" tone="warn" />}
          </Stage>
        );
      }}
    </Viz>
  );
}
