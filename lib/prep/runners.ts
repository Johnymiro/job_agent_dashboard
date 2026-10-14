/* Code runners for coding tasks: JavaScript runs in a throwaway Web Worker;
   Python runs on Brython, loaded from the CDN on first use (~5 MB, cached after);
   React (JSX/TSX) is compiled here by Babel and runs on React 18 in a sandboxed
   iframe, where the tests drive the rendered DOM. */
import type { CodingTask } from "./types";

export interface TestResult {
  name: string;
  expr: string;
  expected: string;
  actual?: string;
  passed: boolean;
  error?: string;
}

export interface RunResult {
  error: string | null;
  tests: TestResult[];
  logs: string;
  /** the runtime can't execute here (CSP, no workers): the task isn't scored */
  runtimeMissing?: boolean;
}

/* Just the corner of Brython's internals that we touch. */
interface BrythonStr {
  tp_funcs: { split: unknown };
}
interface BrythonMethod {
  (this: unknown, ...args: unknown[]): unknown[];
  ob_type?: unknown;
  self?: unknown;
}
interface Brython {
  runPythonSource: (src: string, opts: { id: string }) => void;
  get_from_dict: (cls: BrythonStr, name: string) => { method: BrythonMethod };
  builtins: { str: BrythonStr; None: unknown };
}
declare global {
  interface Window {
    __BRYTHON__?: Brython;
    brython?: (opts: { debug: number }) => void;
    __pyResult?: string;
  }
}

const PY_CDN = "https://cdn.jsdelivr.net/npm/brython@3.14.3/";

const PY_HARNESS = `
import json, sys, traceback
_logs = []
class _Cap:
    def write(self, s):
        _logs.append(str(s))
        return len(str(s))
    def flush(self):
        pass
_prev_out, _prev_err = sys.stdout, sys.stderr
sys.stdout = _Cap()
sys.stderr = _Cap()
def _make_input(value, has):
    def _input(*_a):
        if not has:
            raise RuntimeError("input() has no data in this task: the tests call your function directly")
        return value
    return _input
_ns = {"__name__": "__main__", "input": _make_input(eval(STDIN_SRC, {}) if STDIN_SRC else None, bool(STDIN_SRC))}
_res = {"error": None, "tests": []}
try:
    exec(USER_SRC, _ns)
except BaseException as _e:
    _tb = _e.__traceback__
    _res["error"] = "".join(traceback.format_exception(type(_e), _e, _tb.tb_next if _tb is not None else None))

def _raises(fn, exc=Exception):
    try:
        fn()
    except exc as e:
        return type(e).__name__
    except BaseException as e:
        return "wrong exception: " + type(e).__name__
    return "no exception"
_ns["_raises"] = _raises

def _main(value):
    """Run the whole program with input() returning value; what it printed, stripped."""
    out = []
    class _Out:
        def write(self, s):
            out.append(str(s))
            return len(str(s))
        def flush(self):
            pass
    prev = sys.stdout
    sys.stdout = _Out()
    try:
        exec(USER_SRC, {"__name__": "__main__", "input": _make_input(value, True)})
    finally:
        sys.stdout = prev
    return "".join(out).strip()
_ns["_main"] = _main

import re as _re
def _has_comment(word):
    return any(word in line.split("#", 1)[1] for line in USER_SRC.splitlines() if "#" in line)
def _uses_name(name):
    code = "\\n".join(line.split("#", 1)[0] for line in USER_SRC.splitlines())
    return _re.search(r"\\b" + _re.escape(name) + r"\\b", code) is not None
_ns["_has_comment"] = _has_comment
_ns["_uses_name"] = _uses_name

if _res["error"] is None and SETUP_SRC:
    try:
        exec(SETUP_SRC, _ns)
    except BaseException:
        _res["error"] = "Test setup failed:\\n" + traceback.format_exc()

for _t in TESTS:
    _r = {"name": _t["name"], "expr": _t["expr"]}
    _exp = eval(_t["expected"], {})
    _r["expected"] = repr(_exp)
    if _res["error"] is not None:
        _r["passed"] = False
        _r["error"] = "Not run: your code raised an error while loading"
    else:
        try:
            _act = eval(_t["expr"], _ns)
            _r["actual"] = repr(_act)
            _r["passed"] = bool(_act == _exp)
        except BaseException as e:
            _r["passed"] = False
            _r["error"] = type(e).__name__ + ": " + str(e)
    _res["tests"].append(_r)

sys.stdout, sys.stderr = _prev_out, _prev_err
_res["logs"] = "".join(_logs)[-4000:]
_emit(json.dumps(_res))
`;

/** Full Python program for one run; `emitPrelude` defines `_emit(json_str)`. */
export function buildPySource(task: CodingTask, code: string, emitPrelude: string) {
  return (
    emitPrelude +
    "\n" +
    "USER_SRC = " +
    JSON.stringify(code) +
    "\n" +
    "SETUP_SRC = " +
    JSON.stringify(task.setup || "") +
    "\n" +
    "STDIN_SRC = " +
    JSON.stringify(task.stdin || "") +
    "\n" +
    "TESTS = " +
    JSON.stringify(task.tests.map((t) => ({ name: t.name, expr: t.expr, expected: t.expected }))) +
    "\n" +
    PY_HARNESS
  );
}

const PY_EMIT_BROWSER = "from browser import window\ndef _emit(s):\n    window.__pyResult = s\n";

/* Brython 3.14 returns [''] for "".split() and "  ".split(); CPython returns []. */
function patchBrython(B: Brython) {
  try {
    const d = B.get_from_dict(B.builtins.str, "split");
    const orig = d.method;
    const fixed: BrythonMethod = function (this: unknown, ...args: unknown[]) {
      const res = orig.apply(this, args);
      const noSep = args.length < 2 || args[1] === B.builtins.None;
      if (noSep && res.length === 1 && res[0] == "") res.length = 0;
      return res;
    };
    fixed.ob_type = orig.ob_type;
    fixed.self = orig.self;
    d.method = fixed;
    B.builtins.str.tp_funcs.split = fixed;
  } catch {
    /* keep Brython's default behaviour */
  }
}

const PY_BLOCKED =
  "This browser blocks the in-page Python runtime, so your code can't run here. Compare it with the reference solution; this task won't count toward your score.";
const evalBlocked = (e: unknown) => {
  const err = e as { name?: string; message?: string } | null;
  return /unsafe-eval|EvalError|Content Security Policy/i.test(String(err && (err.name || "") + " " + (err.message || err)));
};

let pyLoading: Promise<void> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load " + src.split("/").pop()));
    document.head.appendChild(s);
  });
}

export const pythonReady = () => typeof window !== "undefined" && !!window.__BRYTHON__?.runPythonSource;

/** Loads Brython once; safe to call early to warm it up. */
export function loadPython() {
  if (!pyLoading) {
    pyLoading = (async () => {
      try {
        new Function("return 1")();
      } catch {
        throw Object.assign(new Error("eval blocked"), { blocked: true });
      }
      await loadScript(PY_CDN + "brython.min.js");
      await loadScript(PY_CDN + "brython_stdlib.js");
      try {
        window.brython?.({ debug: 0 });
      } catch {
        /* no text/python scripts on the page */
      }
      if (!window.__BRYTHON__ || typeof window.__BRYTHON__.runPythonSource !== "function") {
        throw new Error("Python runtime loaded but has no run API");
      }
      patchBrython(window.__BRYTHON__);
    })().catch((err) => {
      pyLoading = null;
      throw err;
    });
  }
  return pyLoading;
}

async function runPython(task: CodingTask, code: string): Promise<RunResult> {
  try {
    await loadPython();
  } catch (e) {
    if ((e as { blocked?: boolean }).blocked) return { runtimeMissing: true, error: PY_BLOCKED, tests: [], logs: "" };
    return {
      error: `The Python runtime couldn't load (${(e as Error).message}). Check your connection, then run again. You can still compare your code with the reference solution.`,
      tests: [],
      logs: "",
    };
  }
  window.__pyResult = undefined;
  try {
    // synchronous: an infinite loop in the user's code freezes the tab
    window.__BRYTHON__!.runPythonSource(buildPySource(task, code, PY_EMIT_BROWSER), { id: "attempt_" + Date.now().toString(36) });
  } catch (e) {
    if (!window.__pyResult && evalBlocked(e)) return { runtimeMissing: true, error: PY_BLOCKED, tests: [], logs: "" };
    if (!window.__pyResult) {
      const msg = e && (e as Error).message ? (e as Error).message : String(e);
      return { error: "Python runtime error: " + msg, tests: [], logs: "" };
    }
  }
  if (!window.__pyResult) return { error: "The run ended without results. Check the console output for errors.", tests: [], logs: "" };
  try {
    const res = JSON.parse(window.__pyResult);
    return { error: res.error ?? null, tests: res.tests ?? [], logs: res.logs ?? "" };
  } catch {
    return { error: "Couldn't read the test results.", tests: [], logs: "" };
  }
}

/** Worker script for one JS run: user code, setup, then every test (2 s each). */
export function buildJsSource(task: CodingTask, code: string) {
  // Kept on one line so line numbers in error messages match the editor.
  const head =
    'const __logs=[];const __fmt=v=>{try{return typeof v==="string"?v:JSON.stringify(v)}catch(e){return String(v)}};console.log=console.info=console.warn=console.error=(...a)=>{if(__logs.length<200)__logs.push(a.map(__fmt).join(" "))};' +
    `const __SRC=${JSON.stringify(code)};const __STDIN=(${task.stdin || "undefined"});` +
    'var readline=()=>{if(__STDIN===undefined)throw new Error("readline() has no data in this task: the tests call your function directly");return __STDIN};' +
    'const __main=(value)=>{const out=[];const con={...console,log:(...a)=>out.push(a.map(__fmt).join(" ")),info:(...a)=>out.push(a.map(__fmt).join(" "))};new Function("readline","console",__SRC)(()=>value,con);return out.join("\\n").trim()};' +
    SOURCE_HELPERS;
  const fns = task.tests.map((t) => "async () => (" + t.expr + ")").join(",\n");
  return (
    head +
    code +
    "\n;\n" +
    (task.setup || "") +
    "\n;\n" +
    `(async () => {
  const __canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x)) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : (x === undefined ? "__undefined__" : x));
  const __expected = ${JSON.stringify(task.tests.map((t) => t.expected))};
  const __names = ${JSON.stringify(task.tests.map((t) => t.name))};
  const __exprs = ${JSON.stringify(task.tests.map((t) => t.expr))};
  const __fns = [${fns}];
  const results = [];
  for (let i = 0; i < __fns.length; i++) {
    const r = { name: __names[i], expr: __exprs[i], expected: __canon(__expected[i]) };
    try {
      const actual = await Promise.race([
        __fns[i](),
        new Promise((_, rej) => setTimeout(() => rej(new Error("test timed out after 2 s")), 2000))
      ]);
      r.actual = __canon(actual);
      r.passed = r.actual === r.expected;
    } catch (e) {
      r.passed = false;
      r.error = (e && e.name ? e.name + ": " : "") + (e && e.message ? e.message : String(e));
    }
    results.push(r);
  }
  postMessage({ error: null, tests: results, logs: __logs.join("\\n") });
})();`
  );
}

/** hasComment(word) / usesName(name) over the user's source, for Coderbyte's "use a variable
 *  named …" instructions. Injected into the JS worker and the React frame with toString(). */
function sourceHelpers(src: string) {
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  return {
    hasComment: (word: string) => new RegExp("//[^\\n]*" + esc(word) + "|/\\*(?:(?!\\*/)[\\s\\S])*" + esc(word)).test(src),
    usesName: (name: string) => new RegExp("(^|[^\\w$])" + esc(name) + "(?![\\w$])").test(code),
  };
}
const SOURCE_HELPERS = `const {hasComment,usesName}=(${sourceHelpers.toString()})(__SRC);`;

function runJs(task: CodingTask, code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    let worker: Worker | undefined;
    let url: string | undefined;
    let done = false;
    const finish = (res: RunResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        worker?.terminate();
      } catch {
        /* already gone */
      }
      if (url) URL.revokeObjectURL(url);
      resolve(res);
    };
    const timer = setTimeout(
      () => finish({ error: "Timed out after 8 s. Look for an infinite loop or a promise that never settles.", tests: [], logs: "" }),
      8000,
    );
    try {
      url = URL.createObjectURL(new Blob([buildJsSource(task, code)], { type: "text/javascript" }));
      worker = new Worker(url);
    } catch (e) {
      finish({
        runtimeMissing: true,
        error: `This browser couldn't start the JavaScript runner (${(e as Error).message}). Compare with the reference solution instead.`,
        tests: [],
        logs: "",
      });
      return;
    }
    worker.onmessage = (e: MessageEvent<RunResult>) => finish({ error: e.data.error, tests: e.data.tests, logs: e.data.logs || "" });
    worker.onerror = (e) => {
      e.preventDefault();
      finish({ error: (e.message || "Script error") + (e.lineno ? ` (line ${e.lineno})` : ""), tests: [], logs: "" });
    };
  });
}

// ---- React ---------------------------------------------------------------------
/* Babel compiles JSX/TSX here (loaded once, like Brython). The app runs in a sandboxed
   iframe without same-origin access, so it can't touch the dashboard; React's UMD
   source is fetched once and handed to each frame by message, because Chrome doesn't
   share its HTTP cache with opaque-origin frames (each run would download it again). */
interface BabelStandalone {
  transform: (code: string, opts: Record<string, unknown>) => { code: string };
}
declare global {
  interface Window {
    Babel?: BabelStandalone;
  }
}

const BABEL_URL = "https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.6/babel.min.js";
const REACT_URLS = [
  "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.development.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.development.js",
];

let reactLoading: Promise<string[]> | null = null;

/** Babel + React 18 sources; safe to call early to warm them up. */
export function loadReact() {
  if (!reactLoading) {
    reactLoading = (async () => {
      const libs = Promise.all(
        REACT_URLS.map(async (u) => {
          const r = await fetch(u);
          if (!r.ok) throw new Error(`Couldn't load ${u.split("/").pop()} (HTTP ${r.status})`);
          return r.text();
        }),
      );
      if (!window.Babel) await loadScript(BABEL_URL);
      if (!window.Babel?.transform) throw new Error("Babel loaded but has no transform API");
      return libs;
    })().catch((err) => {
      reactLoading = null;
      throw err;
    });
  }
  return reactLoading;
}

export const reactReady = () => typeof window !== "undefined" && !!window.Babel?.transform;

/* eslint-disable @typescript-eslint/no-explicit-any -- Babel's plugin API is untyped here */
const LOOP_MS = 1000;
export const LOOP_STOPPED = "so it was stopped. Is it infinite?";
/** Babel plugin: a loop that runs for over 1 s without awaiting throws, so a half-typed
 *  `for (;;)` in the live preview (or the tests) can't freeze the tab. */
function loopGuard({ types: t, template }: any) {
  const check = template.statement(
    `if (Date.now() - START > ${LOOP_MS}) throw new RangeError("The loop on line " + LINE + " ran for over ${LOOP_MS / 1000} s, ${LOOP_STOPPED}");`,
  );
  const done = new WeakSet();
  const awaits = (path: any) => {
    let found = false;
    path.traverse({
      Function: (p: any) => p.skip(),
      "AwaitExpression|YieldExpression": (p: any) => {
        found = true;
        p.stop();
      },
    });
    return found;
  };
  return {
    visitor: {
      "WhileStatement|DoWhileStatement|ForStatement|ForInStatement|ForOfStatement"(path: any) {
        if (done.has(path.node) || path.node.await || awaits(path)) return;
        done.add(path.node);
        const start = path.scope.generateUidIdentifier("loopStart");
        const guard = check({ START: t.cloneNode(start), LINE: t.numericLiteral(path.node.loc?.start.line ?? 0) });
        const body = path.get("body");
        if (body.isBlockStatement()) body.unshiftContainer("body", guard);
        else body.replaceWith(t.blockStatement([guard, body.node]));
        path.insertBefore(t.variableDeclaration("var", [t.variableDeclarator(start, template.expression.ast`Date.now()`)]));
      },
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** JSX/TSX + ES modules → a CommonJS script the frame can run with its own require(). */
export function compileReact(code: string) {
  return window.Babel!.transform(code, {
    filename: "App.tsx",
    sourceType: "module",
    retainLines: true, // runtime errors keep the editor's line numbers
    presets: [
      ["typescript", { isTSX: true, allExtensions: true }],
      ["react", { runtime: "classic" }],
    ],
    plugins: [loopGuard, "transform-modules-commonjs"],
  }).code;
}

/* Runs inside the frame. Plain ES2017 on purpose: it's shipped as text. */
function reactFrame() {
  const W = window as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const logs: string[] = [];
  const pageErrors: unknown[] = [];
  const fmt = (v: unknown) => {
    try {
      return typeof v === "string" ? v : v instanceof Error ? String(v) : JSON.stringify(v);
    } catch {
      return String(v);
    }
  };
  // React's dev warnings use printf-style %s
  const line = (args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("%s")) {
      let k = 1;
      const head = (args[0] as string).replace(/%s/g, () => (k < args.length ? fmt(args[k++]) : "%s"));
      args = [head, ...args.slice(k)];
    }
    return args.map(fmt).join(" ");
  };
  (["log", "info", "warn", "error"] as const).forEach((k) => {
    console[k] = (...args: unknown[]) => {
      if (logs.length < 200) logs.push((k === "warn" || k === "error" ? k + ": " : "") + line(args).slice(0, 2000));
    };
  });
  window.addEventListener("error", (e) => {
    pageErrors.push(e.error || e.message);
    e.preventDefault();
  });
  window.addEventListener("unhandledrejection", (e) => {
    pageErrors.push(e.reason);
    e.preventDefault();
  });
  // runs after React's handlers: a real page would reload here and lose its state
  window.addEventListener("submit", (e) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    logs.push("warn: a form was submitted without event.preventDefault(), so a real page would reload");
  });

  const roots: { unmount: () => void }[] = [];
  const legacy: Element[] = [];
  let booted = false;
  let dom: Record<string, unknown> = {};
  let client: Record<string, unknown> = {};
  const boot = (libs: string[]) => {
    if (booted) return;
    libs.forEach((src) => (0, eval)(src));
    const RD = W.ReactDOM;
    client = {
      createRoot: (el: Element, o?: unknown) => {
        const r = RD.createRoot(el, o);
        roots.push(r);
        return r;
      },
      hydrateRoot: (el: Element, node: unknown, o?: unknown) => {
        const r = RD.hydrateRoot(el, node, o);
        roots.push(r);
        return r;
      },
    };
    dom = {
      ...RD,
      ...client,
      render: (node: unknown, el: Element, cb?: () => void) => {
        legacy.push(el);
        return RD.render(node, el, cb);
      },
    };
    booted = true;
  };

  const reset = () => {
    roots.splice(0).forEach((r) => {
      try {
        r.unmount();
      } catch {
        /* already gone */
      }
    });
    legacy.splice(0).forEach((el) => {
      try {
        W.ReactDOM.unmountComponentAtNode(el);
      } catch {
        /* already gone */
      }
    });
    document.body.innerHTML = '<div id="root"></div>';
    pageErrors.length = 0;
  };

  const requireShim = (name: string) => {
    if (name === "react") return W.React;
    if (name === "react-dom/client") return client;
    if (name === "react-dom") return dom;
    if (/\.(css|scss|sass|less|svg|png|jpe?g|gif)$/.test(name)) return {};
    throw new Error(`Module "${name}" isn't available here: only react, react-dom and react-dom/client`);
  };

  // Lets React finish rendering and effects. MessageChannel, like React's scheduler, because
  // Chrome throttles setTimeout in background windows and frames to ~1 per second.
  const waiting: (() => void)[] = [];
  const channel = typeof MessageChannel === "function" ? new MessageChannel() : null;
  if (channel) channel.port1.onmessage = () => waiting.shift()?.();
  const tick = () =>
    new Promise<void>((r) => {
      if (!channel) return setTimeout(r, 0);
      waiting.push(r);
      channel.port2.postMessage(0);
    });
  const settle = async (ms = 0) => {
    if (ms) await new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 4; i++) await tick();
  };

  const mount = async (compiled: string, setup: string) => {
    reset();
    if (setup) new Function("settle", setup)(settle);
    const mod: { exports: Record<string, unknown> } = { exports: {} };
    new Function("require", "module", "exports", compiled)(requireShim, mod, mod.exports);
    // no render call but a default export: render that
    const App = mod.exports.default;
    if (!roots.length && !legacy.length && typeof App === "function") {
      (client.createRoot as (el: Element | null) => { render: (n: unknown) => void })(document.getElementById("root")).render(
        W.React.createElement(App),
      );
    }
    await settle();
    if (pageErrors.length) throw pageErrors[0];
  };

  // ---- DOM helpers the tests use ----
  const $ = (sel: string) => document.querySelector(sel);
  const $$ = (sel: string) => Array.from(document.querySelectorAll(sel));
  const el = (sel: string | Element) => {
    const found = typeof sel === "string" ? $(sel) : sel;
    if (!found) throw new Error(`Nothing on the page matches ${sel}`);
    return found as HTMLElement;
  };
  const squash = (s: string | null) => (s || "").replace(/\s+/g, " ").trim();
  const text = (sel: string | Element) => {
    const found = typeof sel === "string" ? $(sel) : sel;
    return found ? squash(found.textContent) : null;
  };
  const texts = (sel: string) => $$(sel).map((x) => squash(x.textContent));
  const value = (sel: string) => (el(sel) as HTMLInputElement).value;
  const click = async (sel: string | Element) => {
    el(sel).click();
    await settle();
  };
  const setValue = (node: HTMLElement, v: string) => {
    const proto =
      node instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : node instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(node, v);
  };
  const type = async (sel: string | Element, v: string) => {
    const node = el(sel);
    setValue(node, v);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
  };
  const choose = async (sel: string | Element, v: string) => {
    const node = el(sel);
    setValue(node, v);
    node.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
  };
  const submit = async (sel: string | Element) => {
    const form = el(sel) as HTMLFormElement;
    if (form.requestSubmit) form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await settle();
  };
  const waitFor = async <T,>(fn: () => T, ms = 1500): Promise<T> => {
    const end = Date.now() + ms;
    for (;;) {
      try {
        const v = fn();
        if (v) return v;
      } catch {
        /* not there yet */
      }
      if (Date.now() > end) return fn();
      await settle(20);
    }
  };
  const canon = (v: unknown) =>
    JSON.stringify(v, (_k, x) =>
      x && typeof x === "object" && !Array.isArray(x)
        ? Object.keys(x)
            .sort()
            .reduce((o: Record<string, unknown>, kk) => ((o[kk] = x[kk]), o), {})
        : x === undefined
          ? "__undefined__"
          : x,
    );
  const errText = (e: unknown) => {
    const x = e as { name?: string; message?: string } | null;
    return x && x.message ? (x.name && x.name !== "Error" ? x.name + ": " : "") + x.message : String(e);
  };

  interface Msg {
    kind: "run" | "preview";
    libs: string[];
    compiled: string;
    src: string;
    setup: string;
    helpers: string;
    loopStopped: string;
    tests: { name: string; expr: string; expected: unknown }[];
  }
  const reply = (data: unknown) => parent.postMessage({ __prep: "react", ...(data as object) }, "*");

  window.addEventListener("message", (e: MessageEvent<Msg>) => {
    const m = e.data;
    if (!m || (m.kind !== "run" && m.kind !== "preview")) return;
    handle(m).catch((err) =>
      reply({ kind: "result", error: "The test harness failed: " + errText(err), tests: [], logs: logs.join("\n") }),
    );
  });

  const handle = async (m: Msg) => {
    try {
      boot(m.libs);
    } catch (err) {
      reply({ kind: "result", error: "React failed to start: " + errText(err), tests: [], logs: logs.join("\n") });
      return;
    }
    if (m.kind === "preview") {
      try {
        await mount(m.compiled, m.setup);
      } catch (err) {
        document.body.innerHTML = "";
        const pre = document.createElement("pre");
        pre.style.cssText = "color:#b42318;white-space:pre-wrap;font:12px/1.5 ui-monospace,monospace;margin:0";
        pre.textContent = errText(err);
        document.body.appendChild(pre);
      }
      reply({ kind: "rendered" });
      return;
    }
    const { hasComment, usesName } = new Function("__SRC", m.helpers + "return {hasComment,usesName};")(m.src);
    const H = { $, $$, text, texts, value, click, type, choose, submit, settle, waitFor, hasComment, usesName, source: m.src };
    const names = Object.keys(H);
    const results: Record<string, unknown>[] = [];
    let stopped = ""; // a runaway loop: React retries the render, so don't make every test wait for it
    for (const t of m.tests) {
      const r: Record<string, unknown> = { name: t.name, expr: t.expr, expected: canon(t.expected) };
      if (stopped) {
        results.push({ ...r, passed: false, error: stopped });
        continue;
      }
      try {
        await mount(m.compiled, m.setup);
        const fn = new Function(...names, "return (async () => (" + t.expr + "))();");
        const actual = await Promise.race([
          fn(...names.map((k) => H[k as keyof typeof H])),
          new Promise((_, rej) => setTimeout(() => rej(new Error("test timed out after 3 s")), 3000)),
        ]);
        if (pageErrors.length) throw pageErrors[0];
        r.actual = canon(actual);
        r.passed = r.actual === r.expected;
      } catch (err) {
        r.passed = false;
        r.error = errText(err);
        if (String(r.error).includes(m.loopStopped)) stopped = String(r.error);
      }
      results.push(r);
    }
    reset();
    const all = results.length && results.every((r) => r.error && r.error === results[0].error) ? String(results[0].error) : null;
    reply({ kind: "result", error: all, tests: results, logs: logs.join("\n") });
  };
  reply({ kind: "ready" });
}

/** The frame's document (exported so the tasks can be checked outside a browser). */
export const FRAME_DOC =
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<style>body{margin:12px;font:14px/1.5 system-ui,sans-serif;color:#111;background:#fff}button,input,select,textarea{font:inherit}</style>" +
  `</head><body><div id="root"></div><script>(${reactFrame.toString()})()</` +
  "script></body></html>";

/** A sandboxed frame running the harness; resolves once it says it's ready. */
export function createReactFrame(visible: HTMLElement | null): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const f = document.createElement("iframe");
    // no allow-same-origin (can't reach the dashboard), no allow-modals (alert() would block the run)
    f.setAttribute("sandbox", "allow-scripts allow-forms");
    f.title = "React app";
    if (visible) {
      // stacked over the current render and shown once it has rendered (previewReact)
      f.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;opacity:0;pointer-events:none";
      visible.appendChild(f);
    } else {
      // offscreen but not display:none, which would throttle its timers
      f.style.cssText = "position:fixed;left:0;top:0;width:480px;height:360px;opacity:0;pointer-events:none;border:0;z-index:-1";
      document.body.appendChild(f);
    }
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMsg);
      reject(new Error("the React frame didn't start"));
    }, 10_000);
    const onMsg = (e: MessageEvent) => {
      if (e.source !== f.contentWindow || e.data?.__prep !== "react" || e.data.kind !== "ready") return;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      resolve(f);
    };
    window.addEventListener("message", onMsg);
    f.srcdoc = FRAME_DOC;
  });
}

/** Message for a frame: compiled app, React sources, tests and helpers. */
async function frameMessage(task: CodingTask, code: string, kind: "run" | "preview") {
  const libs = await loadReact();
  return {
    kind,
    libs,
    compiled: compileReact(code),
    src: code,
    setup: task.setup || "",
    helpers: SOURCE_HELPERS,
    loopStopped: LOOP_STOPPED,
    tests: task.tests.map((t) => ({ name: t.name, expr: t.expr, expected: t.expected })),
  };
}

const babelError = (e: unknown) => {
  const msg = (e as Error)?.message || String(e);
  return /unknown|App\.tsx/.test(msg) ? "Syntax error: " + msg.replace(/^.*App\.tsx:\s*/, "") : msg;
};

async function runReact(task: CodingTask, code: string): Promise<RunResult> {
  let msg;
  try {
    await loadReact();
  } catch (e) {
    return {
      error: `React or Babel couldn't load (${(e as Error).message}). Check your connection, then run again.`,
      tests: [],
      logs: "",
    };
  }
  try {
    msg = await frameMessage(task, code, "run");
  } catch (e) {
    return { error: babelError(e), tests: [], logs: "" };
  }
  let frame: HTMLIFrameElement;
  try {
    frame = await createReactFrame(null);
  } catch (e) {
    return {
      runtimeMissing: true,
      error: `This browser couldn't start the React runner (${(e as Error).message}). Compare with the reference solution instead.`,
      tests: [],
      logs: "",
    };
  }
  return new Promise((resolve) => {
    const done = (res: RunResult) => {
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      frame.remove();
      resolve(res);
    };
    const timer = setTimeout(
      () => done({ error: "Timed out after 20 s. Look for an infinite loop or a render that never stops.", tests: [], logs: "" }),
      20_000,
    );
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow || e.data?.__prep !== "react" || e.data.kind !== "result") return;
      done({ error: e.data.error ?? null, tests: e.data.tests ?? [], logs: e.data.logs ?? "" });
    };
    window.addEventListener("message", onMsg);
    frame.contentWindow!.postMessage(msg, "*");
  });
}

/** Renders the app into a visible frame inside `box` (no tests); the error text if it can't compile.
 *  The previous render stays up until the new one is ready, and also when the code doesn't compile. */
export async function previewReact(box: HTMLElement, task: CodingTask, code: string): Promise<string | null> {
  try {
    await loadReact();
  } catch (e) {
    return `React or Babel couldn't load (${(e as Error).message}).`;
  }
  let msg;
  try {
    msg = await frameMessage(task, code, "preview");
  } catch (e) {
    return babelError(e);
  }
  const gen = String(Number(box.dataset.gen || 0) + 1);
  box.dataset.gen = gen;
  let frame: HTMLIFrameElement;
  try {
    frame = await createReactFrame(box);
  } catch (e) {
    return (e as Error).message;
  }
  await new Promise<void>((resolve) => {
    const done = () => {
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 4000); // show whatever it has by then
    const onMsg = (e: MessageEvent) => {
      if (e.source === frame.contentWindow && e.data?.__prep === "react" && e.data.kind === "rendered") done();
    };
    window.addEventListener("message", onMsg);
    frame.contentWindow!.postMessage(msg, "*");
  });
  if (box.dataset.gen !== gen) {
    frame.remove(); // a newer render started meanwhile
    return null;
  }
  for (const old of Array.from(box.children)) if (old !== frame) old.remove();
  frame.style.opacity = "1";
  frame.style.pointerEvents = "auto";
  return null;
}

export function runTask(task: CodingTask, code: string): Promise<RunResult> {
  return task.lang === "python" ? runPython(task, code) : task.lang === "react" ? runReact(task, code) : runJs(task, code);
}
