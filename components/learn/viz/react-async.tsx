"use client";

import { Arrow, Cell, Lbl, Node, Out, Stage, type Step, TONE, type Tone, Viz } from "./kit";

// ---- 09 streaming: chunks, a decoder that holds split bytes, and appended text -------------------

const STREAM = `const reader = res.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value, { stream: true });
  setAnswer((a) => a + text);
}`;

type Chunk = { bytes: string; text: string; held?: string };
const CHUNKS: Chunk[] = [
  { bytes: "48 65 6C", text: "Hel" },
  { bytes: "6C 6F 2C 20 77 6F 72", text: "lo, wor" },
  { bytes: "6C 64 21 20 C3", text: "ld! ", held: "C3" },
  { bytes: "87 61 20 76 61 3F", text: "Ça va?" },
];

/** Chunks split anywhere, even inside a character; the decoder holds the half and the UI appends. */
export function StreamChunks() {
  const steps: Step[] = [
    { say: "`fetch` resolves as soon as the **headers** arrive. The body is still on its way, as a stream you read piece by piece.", line: 1 },
    { say: "`reader.read()` gives the first chunk: raw bytes, a `Uint8Array`. The decoder turns them into `\"Hel\"`, and the updater appends it.", line: [4, 7] },
    { say: "Chunks split wherever the network splits them, mid-word included. Append each one to what's there: `a => a + text`.", line: [4, 7] },
    { say: "This chunk ends **halfway through** a character: `Ç` is two bytes, `C3 87`, and only `C3` arrived. With `stream: true` the decoder holds that byte back instead of printing garbage.", line: 6 },
    { say: "The next chunk starts with `87`. The decoder joins it to the held `C3`, and out comes `Ça va?`.", line: 6 },
    { say: "`read()` returns `done: true`, and the loop ends. Many chunks can arrive between renders; the updater form never loses one.", line: 5 },
  ];
  return (
    <Viz title="Reading a streamed response, chunk by chunk" code={STREAM} lang="js" steps={steps}>
      {(s) => {
        const got = Math.min(s, 4); // chunks received
        const cur = s >= 1 && s <= 4 ? CHUNKS[s - 1] : null;
        const answer = CHUNKS.slice(0, got)
          .map((c) => c.text)
          .join("");
        const held = s === 3 ? "C3" : null;
        return (
          <Stage at={s} className="space-y-6">
            <div>
              <Lbl>network · chunks so far</Lbl>
              <div className="mt-1.5 flex min-h-[30px] flex-wrap gap-1.5">
                {CHUNKS.slice(0, got).map((c, k) => (
                  <Cell key={k} id={`chunk${k}`} on={k === got - 1 && s <= 4} tone="warn" dim={k < got - 1 || s > 4} className="text-[11px]!">
                    {c.bytes}
                  </Cell>
                ))}
                {s === 0 && <span className="font-mono text-[11px] text-faint">headers received, body not yet</span>}
                {s >= 5 && <Cell on tone="accent">done: true</Cell>}
              </div>
            </div>
            <Node id="decoder" className={`flex flex-wrap items-center gap-2 border px-2.5 py-1.5 ${cur ? "border-iris/70 bg-iris/5" : "border-line bg-surface/50"}`}>
              <span className="font-mono text-[12px] text-fg">TextDecoder</span>
              {cur && (
                <span key={s} className="viz-say font-mono text-[11.5px] text-iris">
                  → &quot;{cur.text}&quot;
                </span>
              )}
              {held && (
                <span className="viz-say ml-auto border border-dashed border-warn/70 px-1.5 py-px font-mono text-[11px] text-warn">holding C3 (half of Ç)</span>
              )}
            </Node>
            <Node id="screen" className="border border-line bg-surface px-2.5 py-2">
              <Lbl>answer on screen</Lbl>
              <div className="mt-1 min-h-[1.6em] font-sans text-[14px] text-fg">
                {answer}
                {s < 5 && <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-accent" />}
              </div>
            </Node>
            {got > 0 && s <= 4 && <Arrow from={`chunk${got - 1}`} to="decoder" tone="warn" fromSide="b" toSide="t" bend={0.3} />}
            {cur && <Arrow from="decoder" to="screen" tone="iris" fromSide="b" toSide="t" bend={0.3} label="append" />}
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 10 discriminated unions narrow the type ---------------------------------------------------

const UNION = `type Fetch =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: Trade[] };

switch (state.status) {
  case "loading": return <Spinner />;
  case "error":   return <ErrorBox message={state.error} />;
  case "success": return <TradeTable trades={state.data} />;
  default: const _x: never = state;
}`;

type Variant = "loading" | "error" | "success";
const VARIANTS: { k: Variant; fields: string[]; tone: Tone }[] = [
  { k: "loading", fields: ['status: "loading"'], tone: "info" },
  { k: "error", fields: ['status: "error"', "error: string"], tone: "bad" },
  { k: "success", fields: ['status: "success"', "data: Trade[]"], tone: "accent" },
];

/** Checking the shared `status` field rules variants out until only one shape is left. */
export function Narrowing() {
  const steps: Step[] = [
    { say: "`state` is **one of** three shapes. Until you check which, TypeScript only lets you read what they all share: `state.status`.", line: [1, 4] },
    { say: "`switch (state.status)`: in the `\"loading\"` branch, TypeScript knows it's the first shape. There's nothing else to read.", line: 7 },
    { say: "In the `\"error\"` branch only the error shape is left, so `state.error` is allowed, and it's a `string`.", line: 8 },
    { say: "In `\"success\"`, `state.data` exists and is `Trade[]`. No `isLoading && isError` combinations can exist.", line: 9 },
    { say: "After every case, nothing is left: `state` is `never` here. Add a fourth shape and forget its case, and this line stops compiling. The compiler finds the missing branch for you.", line: 10 },
  ];
  return (
    <Viz title="Narrowing a discriminated union" code={UNION} lang="tsx" steps={steps}>
      {(s) => {
        const branch: Variant | "none" | null = s === 0 ? null : s === 4 ? "none" : VARIANTS[s - 1].k;
        const readable =
          branch === null
            ? ["state.status"]
            : branch === "none"
              ? []
              : VARIANTS.find((v) => v.k === branch)!.fields.map((f) => `state.${f.split(":")[0]}`);
        return (
          <Stage at={s} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {VARIANTS.map((v) => {
                const live = branch === null || branch === v.k;
                return (
                  <Node
                    key={v.k}
                    id={`v-${v.k}`}
                    className={`min-w-[9.5rem] flex-1 border px-2.5 py-1.5 ${live && branch !== null ? `${TONE[v.tone].border} ${TONE[v.tone].bg}` : live ? "border-line bg-surface" : "border-line opacity-30"}`}
                  >
                    <div className={`font-mono text-[10px] uppercase tracking-[0.12em] ${live ? TONE[v.tone].text : "text-faint"}`}>
                      {live ? (branch === null ? "possible" : "this is it") : "ruled out"}
                    </div>
                    {v.fields.map((f) => (
                      <div key={f} className="mt-0.5 font-mono text-[11.5px] text-fg">
                        {f}
                      </div>
                    ))}
                  </Node>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Lbl>you can read</Lbl>
              {readable.length ? (
                readable.map((r) => (
                  <Cell key={r} on tone="accent" className="text-[12px]!">
                    {r}
                  </Cell>
                ))
              ) : (
                <Cell on tone="plum" className="text-[12px]!">
                  nothing: state is never
                </Cell>
              )}
              {branch === null && (
                <Cell on tone="bad" dim className="text-[12px]! line-through">
                  state.data
                </Cell>
              )}
            </div>
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 11 the event loop: stack, microtasks, macrotasks -------------------------------------------

const LOOP = `console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");`;

type Where = "code" | "stack" | "micro" | "macro" | "done";
const LOOP_STEPS: (Step & { b: Where; c: Where; stack: string | null; out: string[] })[] = [
  { say: "The whole script is one **task**. It runs on the call stack, top to bottom, and nothing else can run until it finishes.", line: [1, 4], b: "code", c: "code", stack: "script", out: [] },
  { say: "`console.log(\"A\")` runs right away.", line: 1, b: "code", c: "code", stack: "script", out: ["A"] },
  { say: "`setTimeout(…, 0)` doesn't run its callback now. When the timer fires, the callback joins the **macrotask** queue, behind the current task.", line: 2, b: "macro", c: "code", stack: "script", out: ["A"] },
  { say: "The promise is already resolved, so `.then`'s callback goes into the **microtask** queue.", line: 3, b: "macro", c: "micro", stack: "script", out: ["A"] },
  { say: "`console.log(\"D\")` runs: still the same task.", line: 4, b: "macro", c: "micro", stack: "script", out: ["A", "D"] },
  { say: "The script ends and the stack is empty. Before taking another task, the loop **drains every microtask**: C runs.", line: 3, b: "macro", c: "stack", stack: "then callback", out: ["A", "D", "C"] },
  { say: "Only now does the next macrotask run: the timeout's callback. Final order: **A D C B**. A 0 ms timeout still waits for all promise callbacks.", line: 2, b: "stack", c: "done", stack: "timeout callback", out: ["A", "D", "C", "B"] },
];

/** Callbacks move from the code into the queues, then onto the stack when the loop takes them. */
export function JsEventLoop() {
  return (
    <Viz title="The event loop: stack, microtasks, then macrotasks" code={LOOP} lang="js" steps={LOOP_STEPS}>
      {(s) => {
        const st = LOOP_STEPS[s];
        const chip = (k: "B" | "C", where: Where, zone: Where) =>
          where === zone && (
            <Node
              id={`cb${k}`}
              className={`border px-1.5 py-0.5 font-mono text-[11.5px] ${zone === "stack" ? "border-warn/70 bg-warn/15 text-warn" : k === "B" ? "border-plum/70 bg-plum/10 text-plum" : "border-info/70 bg-info/10 text-info"}`}
            >
              {k === "B" ? "() => log(\"B\")" : "() => log(\"C\")"}
            </Node>
          );
        const zone = (id: Where, label: string, tone: Tone, children: React.ReactNode) => (
          <Node id={`z-${id}`} className={`min-h-[64px] border border-dashed p-2 ${TONE[tone].border}`}>
            <div className={`font-mono text-[10px] uppercase tracking-[0.12em] ${TONE[tone].text}`}>{label}</div>
            <div className="mt-1.5 flex flex-col items-start gap-1.5">{children}</div>
          </Node>
        );
        return (
          <Stage at={s} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {zone(
                "stack",
                "call stack · running now",
                "warn",
                <>
                  {st.stack === "script" && (
                    <Node id="script" className="border border-warn/70 bg-warn/15 px-1.5 py-0.5 font-mono text-[11.5px] text-warn">
                      main script
                    </Node>
                  )}
                  {chip("B", st.b, "stack")}
                  {chip("C", st.c, "stack")}
                  {!st.stack && <span className="font-mono text-[11px] text-faint">empty</span>}
                </>,
              )}
              {zone("micro", "microtasks · promises", "info", <>{chip("C", st.c, "micro")}</>)}
              {zone("macro", "macrotasks · timers, I/O", "plum", <>{chip("B", st.b, "macro")}</>)}
            </div>
            <Out lines={st.out.length ? [st.out.join(" ")] : []} />
          </Stage>
        );
      }}
    </Viz>
  );
}

// ---- 12 XSS: text is escaped, raw HTML runs ------------------------------------------------------

const EVIL = `<img src=x onerror="steal(localStorage)">`;
const XSS: Record<string, { code: string; html: string; dom: string; result: string; ok: boolean; says: string[] }> = {
  text: {
    code: "<p>{comment}</p>",
    html: "&lt;img src=x onerror=…&gt;",
    dom: '<p>#text "<img src=x …>"</p>',
    result: "The page shows the characters <img src=x …> as plain text.",
    ok: true,
    says: [
      "A comment arrives from a user (or from an LLM: treat its output the same way). It contains an HTML tag with an event handler.",
      "Rendered as `{comment}`, React **escapes** it: `<` becomes `&lt;`, so the browser sees characters, not a tag.",
      "The DOM gets one text node. The reader sees the odd text, and no code runs.",
    ],
  },
  raw: {
    code: "<p dangerouslySetInnerHTML={{ __html: comment }} />",
    html: '<img src="x" onerror="steal(localStorage)">',
    dom: '<p><img src="x" onerror=…></p>',
    result: "src=x fails to load, so onerror fires and runs the attacker's code in your page, with your user's session.",
    ok: false,
    says: [
      "The same comment arrives.",
      "`dangerouslySetInnerHTML` hands the string to the browser **as HTML**. It parses it and builds a real `<img>` element with an `onerror` attribute.",
      "The image `x` fails to load, `onerror` fires, and the attacker's script runs with access to everything the page can reach: tokens, cookies, the DOM.",
    ],
  },
  clean: {
    code: "<p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment) }} />",
    html: '<img src="x">',
    dom: '<p><img src="x"></p>',
    result: "A broken image, and no code runs. DOMPurify removed the event handler.",
    ok: true,
    says: [
      "The same comment arrives.",
      "When you need real HTML (rendered Markdown, say), sanitise it first. DOMPurify parses it and **removes** scripts, event-handler attributes and `javascript:` URLs.",
      "What's left is harmless: an image tag with no handler. Regex \"script stripping\" would have missed `onerror`.",
    ],
  },
};

/** The same string, three ways into the page. */
export function Xss() {
  return (
    <Viz
      title="What happens to untrusted HTML"
      lang="jsx"
      modes={[
        { id: "text", label: "{comment}" },
        { id: "raw", label: "dangerouslySetInnerHTML" },
        { id: "clean", label: "DOMPurify" },
      ]}
      code={(m) => `const comment = '${EVIL}';\n${XSS[m].code}`}
      steps={(m) => XSS[m].says.map((say, i) => ({ say, line: i === 0 ? 1 : 2 }))}
    >
      {(s, m) => {
        const x = XSS[m];
        const tone: Tone = x.ok ? "accent" : "bad";
        return (
          <Stage at={`${m}${s}`} className="space-y-5">
            <Node id="in" className="border border-warn/60 bg-warn/5 px-2.5 py-1.5">
              <Lbl>untrusted string</Lbl>
              <div className="mt-0.5 break-all font-mono text-[12px] text-fg">{EVIL}</div>
            </Node>
            {s >= 1 && (
              <Node id="html" className="border border-iris/60 bg-iris/5 px-2.5 py-1.5">
                <Lbl>{m === "text" ? "what React writes (escaped)" : m === "raw" ? "parsed as HTML" : "after DOMPurify.sanitize"}</Lbl>
                <div className="mt-0.5 break-all font-mono text-[12px] text-fg">{x.html}</div>
                <div className="mt-1 font-mono text-[11px] text-subtle">DOM: {x.dom}</div>
              </Node>
            )}
            {s >= 2 && (
              <Node id="out" className={`border px-2.5 py-1.5 ${TONE[tone].border} ${TONE[tone].bg}`}>
                <Lbl className={TONE[tone].text}>{x.ok ? "✓ safe" : "✗ code runs"}</Lbl>
                <div className="mt-0.5 font-sans text-[13px] text-fg">{x.result}</div>
              </Node>
            )}
            {s >= 1 && <Arrow from="in" to="html" tone="iris" fromSide="b" toSide="t" bend={0.3} />}
            {s >= 2 && <Arrow from="html" to="out" tone={tone} fromSide="b" toSide="t" bend={0.3} />}
          </Stage>
        );
      }}
    </Viz>
  );
}
