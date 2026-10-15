"use client";

import { Arrow, Cell, Lbl, Name, Node, Obj, Stage, type Step, TONE, type Tone, Viz } from "./kit";

// ---- 04 a ref is a box that survives renders -------------------------------------------------

const REF = `function Counter() {
  let plain = 0;
  const ref = useRef(0);
  const [count, setCount] = useState(0);
  const click = () => { plain++; ref.current++; };
  const save = () => setCount(ref.current);
  return <button onClick={click}>{count}</button>;
}`;

/** A local variable restarts every render; the ref box is kept by React; only state re-renders. */
export function RefBox() {
  const steps: Step[] = [
    { say: "Render 1. `plain` is an ordinary local: it exists only while this call runs. `useRef(0)` gives back a box `{ current: 0 }` that **React keeps** for this component.", line: [2, 4] },
    { say: "A click runs `plain++` and `ref.current++`. Both are now 1, but nothing tells React to render: the button still shows 0.", line: 5 },
    { say: "Another click: 2 and 2. Changing a ref **never** re-renders. That's the point: use it for timer ids, DOM nodes, latest values.", line: 5 },
    { say: "`save` calls `setCount(ref.current)`. Setting **state** is what asks React for a new render.", line: 6 },
    { say: "Render 2 runs the function again from the top: `let plain = 0` starts over. `useRef` returns the **same** box, still holding 2. The button shows 2.", line: [2, 7] },
  ];
  return (
    <Viz title="useRef: a box that survives renders" code={REF} lang="jsx" steps={steps}>
      {(s) => {
        const clicks = s >= 2 ? 2 : s >= 1 ? 1 : 0;
        const render2 = s >= 4;
        const frame = (n: 1 | 2, on: boolean) => (
          <Node id={`f${n}`} className={`border border-dashed p-2 ${on ? "border-info/70 bg-info/5" : "border-line opacity-45"}`}>
            <Lbl>render {n}</Lbl>
            <div className="mt-1.5 flex flex-col items-start gap-1.5">
              <Name id={`ref${n}`} tone="iris">
                ref
              </Name>
              <Name id={`plain${n}`} tone={on && n === 1 && s >= 1 && s < 4 ? "warn" : "fg"} flash={n === 1 && s >= 1 && s <= 2 ? s : undefined}>
                plain = {n === 1 ? clicks : 0}
              </Name>
              <Name id={`count${n}`} tone="accent">
                count = {n === 1 ? 0 : 2}
              </Name>
            </div>
          </Node>
        );
        return (
          <Stage at={s} className="space-y-5">
            <div className="flex flex-wrap items-start gap-3">
              <Lbl className="w-full">kept by React between renders</Lbl>
              <Obj id="box" type="ref box" tone="iris" flash={s >= 1 && s <= 2 ? s : undefined}>
                {"{ current: "}
                <span className="text-iris">{clicks}</span>
                {" }"}
              </Obj>
              <Obj id="state" type="state slot" tone="accent" flash={s === 3 ? s : undefined}>
                count: <span className="text-accent">{s >= 3 ? 2 : 0}</span>
              </Obj>
              <Node id="screen" className="ml-auto self-center border border-line bg-surface px-3 py-1.5 font-sans text-[13px] text-fg">
                <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">screen</span>
                <span className={`inline-block min-w-[2.2em] border px-2 py-0.5 text-center ${render2 ? "border-accent/70 text-accent" : "border-line"}`}>{render2 ? 2 : 0}</span>
              </Node>
            </div>
            <div className="flex flex-wrap gap-4">
              {frame(1, !render2)}
              {render2 && frame(2, true)}
            </div>
            <Arrow from="ref1" to="box" tone="iris" dim={render2} fromSide="t" toSide="b" bend={0.3} />
            {render2 && <Arrow from="ref2" to="box" tone="iris" fromSide="t" toSide="b" bend={0.3} />}
            {s === 3 && <Arrow from="state" to="screen" tone="accent" label="re-render" />}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 05 keys decide which component keeps which state ------------------------------------------

const KEYS = (k: string) => `{items.map((item, index) => (
  <Row key={${k}} label={item.label} />
))}`;
type Inst = { inst: number; label: string; text: string; isNew?: boolean };

/** Insert at the top: with index keys the typed text stays in slot 0; with ids it moves with Milk. */
export function Keys() {
  return (
    <Viz
      title="Keys decide which row keeps its state"
      lang="jsx"
      modes={[
        { id: "index", label: "key={index}" },
        { id: "id", label: "key={item.id}" },
      ]}
      code={(m) => KEYS(m === "index" ? "index" : "item.id")}
      steps={(m) => [
        { say: "Two rows. Each `<Row>` is a component **instance** with its own state: here, the text in its quantity field." },
        { say: "You type `2 L` next to Milk. That text lives in the state of instance #1." },
        { say: "Now Bread is inserted at the **top**: `items` becomes Bread, Milk, Eggs. React has to match the new rows to the instances it already has, and it does that **by key**." },
        m === "index"
          ? { say: "With `key={index}`, key 0 was instance #1, so instance #1 (still holding `2 L`) now gets Bread's label. Every row shifts by one, and Eggs gets a brand-new instance.", line: 2 }
          : { say: "With `key={item.id}`, key `milk` is still instance #1, so React **moves** it down, state and all. Bread gets a new instance at the top.", line: 2 },
        m === "index"
          ? { say: "Result: `2 L` sits next to **Bread**. The state stayed in the slot, not with the item. Index keys are only safe for lists that never reorder, insert or delete." }
          : { say: "Result: `2 L` is still next to **Milk**. Use a stable id from your data, never the index or a random value." },
      ]}
    >
      {(s, m) => {
        const inserted = s >= 3;
        const typed = s >= 1;
        const rows: Inst[] = !inserted
          ? [
              { inst: 1, label: "Milk", text: typed ? "2 L" : "" },
              { inst: 2, label: "Eggs", text: "" },
            ]
          : m === "index"
            ? [
                { inst: 1, label: "Bread", text: "2 L" },
                { inst: 2, label: "Milk", text: "" },
                { inst: 3, label: "Eggs", text: "", isNew: true },
              ]
            : [
                { inst: 3, label: "Bread", text: "", isNew: true },
                { inst: 1, label: "Milk", text: "2 L" },
                { inst: 2, label: "Eggs", text: "" },
              ];
        const bad = inserted && m === "index";
        return (
          <Stage at={`${m}${s}`} className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Lbl>items</Lbl>
              {(s >= 2 ? ["Bread", "Milk", "Eggs"] : ["Milk", "Eggs"]).map((x) => (
                <Cell key={x} on={x === "Bread"} tone="warn" className="text-[12px]!">
                  {x}
                </Cell>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              {rows.map((r, k) => {
                const wrong = bad && r.inst === 1;
                return (
                  <Node
                    key={r.inst}
                    id={`inst${r.inst}`}
                    className={`flex items-center gap-3 border px-2.5 py-1.5 ${wrong ? "border-bad/70 bg-bad/10" : r.isNew ? "border-accent/60 bg-accent/5" : "border-line bg-surface"}`}
                  >
                    <span className="w-16 font-mono text-[10.5px] text-subtle">
                      key {m === "index" ? k : r.label.toLowerCase()}
                    </span>
                    <span className="w-14 font-sans text-[13px] text-fg">{r.label}</span>
                    <span
                      className={`inline-flex h-7 w-20 items-center border px-2 font-sans text-[13px] ${
                        r.text ? (wrong ? "border-bad/70 text-bad" : "border-accent/60 text-fg") : "border-line text-faint"
                      }`}
                    >
                      {r.text || "qty"}
                      {s === 1 && r.inst === 1 && <span className="ml-0.5 h-4 w-px animate-pulse bg-accent" />}
                    </span>
                    <span className="ml-auto whitespace-nowrap font-mono text-[10.5px] text-subtle">
                      <span className="hidden sm:inline">instance </span>#{r.inst}
                    </span>
                  </Node>
                );
              })}
            </div>
            {s >= 4 && (
              <p className={`viz-say font-mono text-[11.5px] ${bad ? "text-bad" : "text-accent"}`}>
                {bad ? "✗ Milk's quantity is now on Bread" : "✓ Milk kept its quantity"}
              </p>
            )}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 06 what re-renders, and what memo skips ------------------------------------------------------

type TreeNode = { id: string; name: string; props: string; depth: number; parent?: string };
const MEMO_TREE: TreeNode[] = [
  { id: "app", name: "App", props: "state: count", depth: 0 },
  { id: "header", name: "Header", props: 'title="Trades"', depth: 1, parent: "app" },
  { id: "list", name: "List", props: "items={items}", depth: 1, parent: "app" },
  { id: "row1", name: "Row", props: "trade={t1}", depth: 2, parent: "list" },
  { id: "row2", name: "Row", props: "trade={t2}", depth: 2, parent: "list" },
  { id: "chart", name: "Chart", props: "config={…}", depth: 1, parent: "app" },
];

/** A render runs every child by default; memo skips children whose props are the same objects as last time. */
export function MemoTree() {
  return (
    <Viz
      title="A parent's render reaches every child, unless memo stops it"
      lang="jsx"
      modes={[
        { id: "plain", label: "no memo" },
        { id: "memo", label: "memo" },
        { id: "inline", label: "memo + inline object" },
      ]}
      code={(m) =>
        m === "plain"
          ? "function Chart({ config }) { … }\n<Chart config={CONFIG} />"
          : m === "memo"
            ? "const Chart = memo(function Chart({ config }) { … });\n<Chart config={CONFIG} />          // same object every render"
            : "const Chart = memo(function Chart({ config }) { … });\n<Chart config={{ type: \"line\" }} />  // a new object every render"
      }
      steps={(m) => [
        { say: "`App` holds `count` in state. The other components get props; none of them use `count`." },
        { say: "A click calls `setCount`. React re-renders **`App`**, the component that owns the state." },
        m === "plain"
          ? { say: "By default, rendering a component renders **all** of its children, and theirs, whether their props changed or not." }
          : m === "memo"
            ? { say: "Each child is wrapped in `memo`, so React first compares its props with last time (`Object.is`, prop by prop). All the same, so the whole subtree is **skipped**.", line: 1 }
            : { say: "Header and List are skipped, but `config={{ type: \"line\" }}` builds a **new** object on every render, so `Object.is` says it changed and `Chart` renders anyway.", line: 2 },
        m === "plain"
          ? { say: "6 components rendered for one number that only `App` uses. Usually that's fine (renders are cheap); reach for `memo` when profiling shows a slow subtree." }
          : m === "memo"
            ? { say: "1 component rendered instead of 6. Keep object and function props stable (constants, `useMemo`, `useCallback`) or memo can't help." }
            : { say: "2 rendered: one inline object was enough to defeat `memo`. Hoist it to a constant or wrap it in `useMemo`." },
      ]}
    >
      {(s, m) => {
        const rendered = (id: string) => {
          if (s < 1) return null;
          if (id === "app") return true;
          if (s < 2) return null;
          if (m === "plain") return true;
          return m === "inline" && id === "chart";
        };
        const count = MEMO_TREE.filter((n) => rendered(n.id)).length;
        return (
          <Stage at={`${m}${s}`} className="space-y-3">
            <div className="flex flex-col items-start gap-1.5">
              {MEMO_TREE.map((n) => {
                const r = rendered(n.id);
                const tone: Tone = r === true ? "warn" : r === false ? "faint" : "fg";
                return (
                  <div key={n.id} className="flex items-center" style={{ paddingLeft: `${Math.max(0, n.depth - 1) * 1.6}rem` }}>
                    {n.depth > 0 && <span className={`w-[1.6rem] font-mono text-[13px] transition-colors ${r ? "text-warn" : "text-faint"}`}>└─</span>}
                    <Node
                      id={n.id}
                      flash={r ? `${m}${s}` : undefined}
                      delay={r && s === 2 ? n.depth * 220 : 0}
                      className={`flex items-center gap-2 border px-2 py-1 ${r === true ? `${TONE.warn.border} ${TONE.warn.bg}` : r === false ? "border-line opacity-45" : "border-line bg-surface"}`}
                    >
                      <span className="font-mono text-[12.5px] text-fg">
                        {m !== "plain" && n.id !== "app" ? <span className="text-iris">memo </span> : null}
                        {n.name}
                      </span>
                      <span className="font-mono text-[10.5px] text-subtle">{n.id === "chart" && m === "inline" ? 'config={{ type: "line" }}' : n.props}</span>
                      {r !== null && (
                        <span className={`viz-say font-mono text-[10.5px] ${TONE[tone].text}`}>
                          {r ? "● rendered" : n.depth === 2 ? "skipped with List" : "skipped: same props"}
                        </span>
                      )}
                    </Node>
                  </div>
                );
              })}
            </div>
            {s >= 3 && (
              <p className="viz-say font-mono text-[11.5px] text-subtle">
                rendered: <span className={count > 2 ? "text-warn" : "text-accent"}>{count} of 6</span>
              </p>
            )}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 07 prop drilling vs context ---------------------------------------------------------------------

const CHAIN = [
  { id: "app", name: "App" },
  { id: "layout", name: "Layout" },
  { id: "sidebar", name: "Sidebar" },
  { id: "menu", name: "UserMenu" },
];

/** Drilling threads a prop through every level; context lets the one reader take it from the provider. */
export function ContextVsDrilling() {
  return (
    <Viz
      title="Prop drilling vs context"
      lang="jsx"
      modes={[
        { id: "drill", label: "props" },
        { id: "context", label: "context" },
      ]}
      code={(m) =>
        m === "drill"
          ? "<Layout user={user} />           // in App\n<Sidebar user={user} />          // in Layout\n<UserMenu user={user} />         // in Sidebar"
          : "<AuthContext value={user}>{children}</AuthContext>\n\nfunction UserMenu() {\n  const { user } = useAuth();      // reads the nearest provider\n}"
      }
      steps={(m) =>
        m === "drill"
          ? [
              { say: "`App` holds `user`. Only `UserMenu`, three levels down, actually needs it." },
              { say: "So `App` passes `user` to `Layout`, which doesn't use it…", line: 1 },
              { say: "…`Layout` passes it on to `Sidebar`, which doesn't either…", line: 2 },
              { say: "…and `Sidebar` finally hands it to `UserMenu`. Two components carry a prop they don't care about.", line: 3 },
              { say: "When `user` changes, every level's props change, so all four re-render." },
            ]
          : [
              { say: "The provider holds `user` and puts it in context. It renders `{children}`: elements created **above** it." },
              { say: "`Layout` and `Sidebar` take no `user` prop at all. They don't know it exists." },
              { say: "`UserMenu` calls `useAuth()` and reads the value straight from the nearest provider.", line: 4 },
              { say: "When `user` changes, React re-renders just the components that **read** that context. `Layout` and `Sidebar` are skipped. Split contexts by how often they change." },
            ]
      }
    >
      {(s, m) => {
        const drill = m === "drill";
        const hop = drill ? Math.min(s, 3) : 0; // how far the prop has travelled
        const change = drill ? s >= 4 : s >= 3;
        return (
          <Stage at={`${m}${s}`} className="flex flex-col items-start gap-5 pl-5">
            {CHAIN.map((c, i) => {
              const uses = c.id === "menu";
              const carries = drill && i > 0 && i <= hop;
              const renders = change && (drill || c.id === "menu" || c.id === "app");
              return (
                <div key={c.id} style={{ paddingLeft: `${i * 1.4}rem` }}>
                  <Node
                    id={c.id}
                    flash={renders ? `${m}${s}` : undefined}
                    className={`flex flex-wrap items-center gap-2 border px-2.5 py-1 ${
                      renders ? "border-warn/70 bg-warn/10" : uses && (drill ? hop >= 3 : s >= 2) ? "border-accent/70 bg-accent/10" : "border-line bg-surface"
                    }`}
                  >
                    <span className="font-mono text-[12.5px] text-fg">{c.id === "app" && !drill ? "AuthProvider" : c.name}</span>
                    {c.id === "app" && (
                      <Cell className="text-[11.5px]!" on={change} tone="warn">
                        user = {change ? "Bo" : "Ana"}
                      </Cell>
                    )}
                    {carries && (
                      <Node id={`prop${i}`} className={`border px-1.5 py-px font-mono text-[11px] ${uses ? "border-accent/70 text-accent" : "border-warn/60 text-warn"}`}>
                        {`user={user}`}
                        {!uses && <span className="text-faint"> · unused</span>}
                      </Node>
                    )}
                    {!drill && uses && s >= 2 && <span className="viz-say font-mono text-[11px] text-accent">useAuth() → {change ? "Bo" : "Ana"}</span>}
                    {change && <span className="viz-say font-mono text-[10.5px] text-warn">{renders ? "● re-renders" : ""}</span>}
                    {change && !renders && <span className="viz-say font-mono text-[10.5px] text-faint">skipped</span>}
                  </Node>
                </div>
              );
            })}
            {drill
              ? CHAIN.slice(1).map((c, i) => i < hop && <Arrow key={c.id} from={CHAIN[i].id} to={c.id} tone="warn" fromSide="l" toSide="l" bend={0.6} />)
              : s >= 2 && <Arrow from="app" to="menu" tone="accent" fromSide="l" toSide="l" bend={0.3} />}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 08 hooks are matched by call order ----------------------------------------------------------

const HOOKS_BAD = `function Profile({ editing }) {
  const [name] = useState("Ana");
  if (editing) {
    const [draft] = useState("");
  }
  const [theme] = useState("dark");
}`;
const HOOKS_OK = `function Profile({ editing }) {
  const [name] = useState("Ana");
  const [draft] = useState("");    // always called
  const [theme] = useState("dark");
  // use draft only when editing
}`;

/** React stores hooks as a list per component and hands them out by position. */
export function HookSlots() {
  return (
    <Viz
      title="Why hooks can't go inside an `if`"
      lang="jsx"
      modes={[
        { id: "bad", label: "hook inside if" },
        { id: "ok", label: "always called" },
      ]}
      code={(m) => (m === "bad" ? HOOKS_BAD : HOOKS_OK)}
      steps={(m) =>
        m === "bad"
          ? [
              { say: "React keeps each component's hook state in a **list**. Hooks have no names inside React: the 1st call gets slot 0, the 2nd gets slot 1, and so on." },
              { say: "Render 1, `editing = true`: three calls, so three slots: `\"Ana\"`, `\"\"`, `\"dark\"`.", line: [2, 6] },
              { say: "Render 2, `editing = false`: the `if` skips the second call.", line: [3, 5] },
              { say: "So `theme`'s `useState` is now the **2nd** call and is handed slot 1: draft's `\"\"`. React spots that fewer hooks ran than last time and throws \"Rendered fewer hooks than expected\".", line: 6 },
            ]
          : [
              { say: "React keeps each component's hook state in a **list**, handed out by call position." },
              { say: "Render 1: three calls, three slots.", line: [2, 4] },
              { say: "Render 2, `editing = false`: the same three calls in the same order. Each finds its own slot; the condition lives **inside** your code, after the hooks.", line: [2, 5] },
            ]
      }
    >
      {(s, m) => {
        const bad = m === "bad";
        const r2 = s >= 2;
        const calls = !r2 || !bad ? ["name", "draft", "theme"] : ["name", "theme"];
        const slots = ['"Ana"', '""', '"dark"'];
        const broken = bad && s >= 3;
        return (
          <Stage at={`${m}${s}`} className="grid grid-cols-[auto_auto] items-start justify-start gap-x-12 gap-y-2 sm:gap-x-20">
            <Lbl>{s === 0 ? "calls" : `calls in render ${r2 ? 2 : 1}`}</Lbl>
            <Lbl>React&apos;s list for this component</Lbl>
            <div className="flex flex-col items-start gap-2">
              {s >= 1 &&
                calls.map((c, k) => (
                  <Name key={c} id={`call-${c}`} tone={broken && c === "theme" ? "bad" : "fg"}>
                    {k + 1}. useState → {c}
                  </Name>
                ))}
              {bad && r2 && <span className="viz-say font-mono text-[11px] text-faint">(draft&apos;s call skipped)</span>}
            </div>
            <div className="flex flex-col items-start gap-2">
              {slots.map((v, k) => (
                <Cell key={k} id={`slot${k}`} on={broken && k === 1} tone="bad" dim={broken && k === 2}>
                  slot {k}: {v}
                </Cell>
              ))}
            </div>
            {s >= 1 && calls.map((c, k) => <Arrow key={c} from={`call-${c}`} to={`slot${k}`} tone={broken && c === "theme" ? "bad" : "info"} />)}
            {broken && (
              <div className="viz-say col-span-2 mt-2 border border-bad/60 bg-bad/10 px-2.5 py-1.5 font-mono text-[11.5px] text-bad">
                Error: Rendered fewer hooks than expected.
              </div>
            )}
          </Stage>
        );
      }}
    </Viz>
  );
}
