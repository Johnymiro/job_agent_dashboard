"use client";

import { Arrow, Cell, Lbl, Name, Node, Obj, Out, Stage, Viz } from "./kit";

// ---- 01 names and mutability ----------------------------------------------------------

const ALIAS = `a = [1, 2, 3]
b = a
b.append(4)
print(a)
a = a + [5]
print(a, b)`;

/** b = a shares one list; a = a + [5] builds a new one and moves only a. */
export function Aliasing() {
  return (
    <Viz
      title="Names point at objects"
      code={ALIAS}
      steps={[
        { say: "Python builds a list object, then attaches the name `a` to it. The name isn't a box holding the list. It points at it.", line: 1 },
        { say: "`b = a` copies nothing. It attaches a second name to the **same** object. There's still only one list.", line: 2 },
        { say: "`b.append(4)` changes that one list in place.", line: 3 },
        { say: "So `a` sees the 4 too: both names lead to the object that changed.", line: 4 },
        { say: "`a + [5]` builds a **new** list, and `a =` moves only the name `a` onto it. `b` stays on the old list.", line: 5 },
        { say: "Now the names point at different objects, so they print different lists.", line: 6 },
      ]}
    >
      {(s) => {
        const items = s >= 2 ? [1, 2, 3, 4] : [1, 2, 3];
        const out = s >= 5 ? ["[1, 2, 3, 4]", "[1, 2, 3, 4, 5] [1, 2, 3, 4]"] : s >= 3 ? ["[1, 2, 3, 4]"] : [];
        return (
          <Stage at={s} className="grid grid-cols-[auto_1fr] items-center gap-x-10 gap-y-5 sm:gap-x-16">
            <Lbl>names</Lbl>
            <Lbl>objects</Lbl>
            <div className="flex flex-col items-start gap-6">
              <Name id="a" tone="accent" flash={s === 4 ? "re" : undefined}>
                a
              </Name>
              {s >= 1 && (
                <Name id="b" tone="warn">
                  b
                </Name>
              )}
            </div>
            <div className="flex flex-col items-start gap-4">
              {s >= 4 && (
                <Obj id="new" type="list" addr="id 0x2a8" tone="accent">
                  <span className="inline-flex gap-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Cell key={v} on={v === 5} tone="accent">
                        {v}
                      </Cell>
                    ))}
                  </span>
                </Obj>
              )}
              <Obj id="old" type="list" addr="id 0x1f0" flash={s === 2 ? "grew" : undefined}>
                <span className="inline-flex gap-1">
                  {items.map((v) => (
                    <Cell key={v} id={`o${v}`} on={s === 2 && v === 4} tone="info">
                      {v}
                    </Cell>
                  ))}
                </span>
              </Obj>
            </div>
            <Arrow from="a" to={s >= 4 ? "new" : "old"} tone="accent" />
            {s >= 1 && <Arrow from="b" to="old" tone="warn" />}
            <div className="col-span-2">
              <Out lines={out} />
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 02 collections and big-o ---------------------------------------------------------

const NUMS = [17, 4, 93, 27, 63, 16, 42, 70];
// a small int hashes to itself, so with 8 slots each number lands in slot n % 8 (real tables are bigger)
const SLOT = (n: number) => n % 8;

/** `42 in list` checks items one by one; `42 in set` hashes straight to its slot. */
export function LookupCost() {
  return (
    <Viz
      title="Why `in` is fast on a set and slow on a list"
      lang="python"
      modes={[
        { id: "list", label: "42 in a_list" },
        { id: "set", label: "42 in a_set" },
      ]}
      code={(m) => (m === "list" ? "a_list = [17, 4, 93, 27, 63, 16, 42, 70]\n42 in a_list   # O(n)" : "a_set = {17, 4, 93, 27, 63, 16, 42, 70}\n42 in a_set    # O(1) on average")}
      steps={(m) =>
        m === "list"
          ? [
              { say: "A list keeps items in order and knows nothing else about them. To answer `42 in a_list` it has to look.", line: 1 },
              ...NUMS.slice(0, 7).map((v, k) => ({
                say: v === 42 ? `Comparison ${k + 1}: found it. That took 7 checks; a missing value would take all 8. Double the list, double the work: **O(n)**.` : `Comparison ${k + 1}: is ${v} equal to 42? No, move to the next slot.`,
                line: 2 as const,
                ms: v === 42 ? undefined : 1500,
              })),
            ]
          : [
              { say: "A set stores each item in the slot its **hash** picks. A small int hashes to itself, so with 8 slots, 27 lands in slot 27 % 8 = 3. Building the set took one pass over the items.", line: 1 },
              { say: "For `42 in a_set`, Python computes `hash(42)` and turns it into a slot number. No scanning.", line: 2 },
              { say: "It goes straight to slot 2 and compares just that entry: found, in **one** check, however big the set. That's **O(1)** on average.", line: 2 },
            ]
      }
    >
      {(s, m) => {
        if (m === "list") {
          const at = s - 1; // index being compared
          return (
            <Stage at={`l${s}`} className="space-y-4">
              <div className="flex items-center gap-2">
                <Lbl>looking for</Lbl>
                <Cell tone="accent" on>
                  42
                </Cell>
                <span className="ml-auto font-mono text-[12px] text-subtle">
                  checks: <span className="text-fg">{Math.max(0, s)}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {NUMS.map((v, k) => (
                  <div key={v} className="flex flex-col items-center gap-1">
                    <Cell
                      id={`n${v}`}
                      on={k <= at}
                      tone={k === at ? (v === 42 ? "accent" : "warn") : "faint"}
                      dim={k < at}
                      flash={k === at ? s : undefined}
                    >
                      {v}
                    </Cell>
                    <span className="font-mono text-[10px] text-faint">{k}</span>
                    <span className="h-4">
                      {k === at && (
                        <Node id="ptr" className={`font-mono text-[12px] leading-none ${v === 42 ? "text-accent" : "text-warn"}`}>
                          ▲
                        </Node>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Stage>
          );
        }
        const slots = Array.from({ length: 8 }, (_, k) => NUMS.find((v) => SLOT(v) === k)!);
        return (
          <Stage at={`s${s}`} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Node id="q" className="inline-flex">
                <Cell tone="accent" on>
                  42
                </Cell>
              </Node>
              {s >= 1 && (
                <Node id="h" className="border border-iris/70 bg-iris/10 px-2 py-1 font-mono text-[12px] text-iris">
                  hash(42) % 8 → 2
                </Node>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              {slots.map((v, k) => (
                <div key={k} className="flex flex-col items-center gap-1">
                  <Cell id={`slot${k}`} on={s >= 2 && k === 2} tone="accent" dim={s >= 2 && k !== 2} flash={s === 2 && k === 2 ? 1 : undefined}>
                    {v}
                  </Cell>
                  <span className="font-mono text-[10px] text-faint">slot {k}</span>
                </div>
              ))}
            </div>
            {s >= 1 && <Arrow from="q" to="h" tone="iris" />}
            {s >= 2 && <Arrow from="h" to="slot2" tone="accent" toSide="t" />}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 01 default arguments ---------------------------------------------------------------

const DEFAULT_SHARED = `def add(item, bucket=[]):
    bucket.append(item)
    return bucket

add("EUR")
print(add("USD"))`;

const DEFAULT_FIXED = `def add(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket

add("EUR")
print(add("USD"))`;

/** The default list lives on the function object, so every call shares it. */
export function DefaultArg() {
  return (
    <Viz
      title="A mutable default is created once, at `def` time"
      modes={[
        { id: "shared", label: "bucket=[]" },
        { id: "fixed", label: "bucket=None" },
      ]}
      code={(m) => (m === "shared" ? DEFAULT_SHARED : DEFAULT_FIXED)}
      steps={(m) =>
        m === "shared"
          ? [
              { say: "`def` runs **once**. It builds the function object and evaluates the default `[]` right then, storing that one list on the function (`add.__defaults__`).", line: 1 },
              { say: "`add(\"EUR\")` starts a call frame. No bucket was passed, so `bucket` points at the stored default list.", line: 5 },
              { say: "`append` changes that list in place: the default itself now holds `'EUR'`.", line: 2 },
              { say: "The call returns and its frame is thrown away. The list isn't: the function still holds it, with `'EUR'` inside.", line: 3 },
              { say: "`add(\"USD\")` starts a fresh frame, but `bucket` gets the **same** default list again, already holding `'EUR'`.", line: 6 },
              { say: "So `append` adds to the shared list, and it prints `['EUR', 'USD']`. Every call that leaves `bucket` out shares this list.", line: 2 },
            ]
          : [
              { say: "With `bucket=None`, the stored default is `None`, which can't change, so there's nothing to share.", line: 1 },
              { say: "`add(\"EUR\")`: the frame's `bucket` points at `None`…", line: 7 },
              { say: "…so the function builds a **new** list and rebinds `bucket` to it, inside this call only.", line: [2, 3] },
              { say: "`append` fills this call's own list. When the call returns, the default is still `None`.", line: 4 },
              { say: "`add(\"USD\")` gets a fresh frame and a fresh list.", line: [2, 3] },
              { say: "It prints `['USD']`. Each call starts clean.", line: 8 },
            ]
      }
    >
      {(s, m) => {
        const shared = m === "shared";
        const call = s >= 4 ? 2 : s >= 1 ? 1 : 0; // which call is running
        const inFrame = shared ? s === 1 || s === 2 || s >= 4 : s >= 1;
        const shared1 = shared ? (s >= 2 ? ["'EUR'"] : []) : [];
        const sharedList = shared && s >= 5 ? ["'EUR'", "'USD'"] : shared1;
        const own = !shared && s >= 2; // this call made its own list
        const ownItems = !shared ? (s === 3 || s >= 5 ? [call === 1 ? "'EUR'" : "'USD'"] : []) : [];
        return (
          <Stage at={`${m}${s}`} className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-start gap-x-6 gap-y-5 sm:gap-x-14">
            <div className="flex flex-col items-start gap-5">
              <Obj id="fn" type="function add" tone="iris">
                <span className="flex items-center gap-1.5 text-[12px]">
                  <span className="text-subtle">defaults:</span>
                  <Name id="dflt" tone="iris">
                    bucket
                  </Name>
                </span>
              </Obj>
              {inFrame ? (
                <Node id={`frame${call}`} className="border border-dashed border-warn/70 bg-warn/5 p-2">
                  <Lbl className="text-warn!">call {call} frame</Lbl>
                  <div className="mt-2 flex flex-col items-start gap-2">
                    <Name id="item">item = {call === 1 ? "'EUR'" : "'USD'"}</Name>
                    <Name id="bucket" tone="warn">
                      bucket
                    </Name>
                  </div>
                </Node>
              ) : (
                <div className="flex h-[92px] items-center font-mono text-[11px] text-faint">{s > 0 ? "frame gone" : "no call yet"}</div>
              )}
            </div>
            <div className="flex flex-col items-start gap-4 pt-2">
              {shared ? (
                <Obj id="dlist" type="list" addr="the default" flash={s === 2 || s === 5 ? s : undefined}>
                  <span className="flex min-h-[1.9em] flex-wrap items-center gap-1">
                    {sharedList.length ? sharedList.map((v) => <Cell key={v}>{v}</Cell>) : <span className="text-faint">[ ]</span>}
                  </span>
                </Obj>
              ) : (
                <Obj id="none" type="NoneType" tone="faint">
                  None
                </Obj>
              )}
              {own && (
                <Obj id={`own${call}`} type="list" addr={`call ${call}'s own`} tone="accent" flash={ownItems.length ? s : undefined}>
                  <span className="flex min-h-[1.9em] flex-wrap items-center gap-1">
                    {ownItems.length ? ownItems.map((v) => <Cell key={v}>{v}</Cell>) : <span className="text-faint">[ ]</span>}
                  </span>
                </Obj>
              )}
            </div>
            <Arrow from="dflt" to={shared ? "dlist" : "none"} tone="iris" />
            {inFrame && <Arrow from="bucket" to={shared ? "dlist" : own ? `own${call}` : "none"} tone="warn" />}
            <div className="col-span-2">
              <Out lines={shared ? (s >= 5 ? ["['EUR', 'USD']"] : []) : s >= 5 ? ["['USD']"] : []} />
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 01 shallow and deep copies ----------------------------------------------------------

const COPIES = `grid = [[0, 0], [0, 0]]
shallow = grid.copy()
deep = copy.deepcopy(grid)
grid[0][0] = 9
print(shallow[0][0], deep[0][0])`;

/** A shallow copy is a new outer list whose slots point at the same inner lists. */
export function ShallowDeep() {
  return (
    <Viz
      title="Shallow copy vs deep copy"
      code={COPIES}
      steps={[
        { say: "`grid` is an outer list whose two slots point at two inner lists. Three objects in all.", line: 1 },
        { say: "`grid.copy()` makes a **new outer list**, but its slots point at the **same** inner lists. Only the top level was copied.", line: 2 },
        { say: "`copy.deepcopy` copies all the way down: a new outer list **and** new inner lists.", line: 3 },
        { say: "`grid[0][0] = 9` changes the first inner list. `shallow[0]` is that same list, so it sees the 9. `deep` has its own copy.", line: 4 },
        { say: "So it prints `9 0`. Shallow copies are fine for flat lists of numbers or strings; nested data you'll change needs a deep copy.", line: 5 },
      ]}
    >
      {(s) => {
        const v = s >= 3 ? 9 : 0;
        const outer = (id: string, tone: "info" | "accent" | "orchid", label: string) => (
          <Obj id={id} type="list" addr={label} tone={tone}>
            <span className="flex flex-col gap-1">
              <Cell id={`${id}0`}>[0]</Cell>
              <Cell id={`${id}1`}>[1]</Cell>
            </span>
          </Obj>
        );
        const inner = (id: string, first: number, tone: "info" | "orchid", hot = false) => (
          <Obj id={id} type="list" tone={tone} flash={hot ? s : undefined}>
            <span className="inline-flex gap-1">
              <Cell on={hot} tone="warn">
                {first}
              </Cell>
              <Cell>0</Cell>
            </span>
          </Obj>
        );
        return (
          <Stage at={s} className="grid grid-cols-[auto_auto_auto] items-center justify-start gap-x-6 gap-y-3 sm:gap-x-12">
            <Name id="n-grid" tone="info">
              grid
            </Name>
            {outer("g", "info", "outer")}
            <div className="row-span-2 flex h-full flex-col justify-around gap-3">
              {inner("a", v, "info", s >= 3)}
              {inner("b", 0, "info")}
            </div>
            <div className={s >= 1 ? "" : "invisible"}>
              <Name id="n-shallow" tone="accent">
                shallow
              </Name>
            </div>
            <div className={s >= 1 ? "" : "invisible"}>{s >= 1 && outer("s", "accent", "new outer")}</div>
            <div className={s >= 2 ? "" : "invisible"}>
              <Name id="n-deep" tone="orchid">
                deep
              </Name>
            </div>
            <div className={s >= 2 ? "" : "invisible"}>{s >= 2 && outer("d", "orchid", "new outer")}</div>
            <div className={`flex flex-col gap-3 ${s >= 2 ? "" : "invisible"}`}>
              {s >= 2 && inner("a2", 0, "orchid")}
              {s >= 2 && inner("b2", 0, "orchid")}
            </div>
            <Arrow from="n-grid" to="g" tone="info" />
            <Arrow from="g0" to="a" tone="info" bend={0.3} />
            <Arrow from="g1" to="b" tone="info" bend={0.3} />
            {s >= 1 && (
              <>
                <Arrow from="n-shallow" to="s" tone="accent" />
                <Arrow from="s0" to="a" tone="accent" bend={0.3} />
                <Arrow from="s1" to="b" tone="accent" bend={0.3} />
              </>
            )}
            {s >= 2 && (
              <>
                <Arrow from="n-deep" to="d" tone="orchid" />
                <Arrow from="d0" to="a2" tone="orchid" bend={0.3} />
                <Arrow from="d1" to="b2" tone="orchid" bend={0.3} />
              </>
            )}
            <div className="col-span-3 mt-2">
              <Out lines={s >= 4 ? ["9 0"] : []} />
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}
