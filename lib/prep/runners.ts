/* Code runners for coding tasks: JavaScript runs in a throwaway Web Worker;
   Python runs on Brython, loaded from the CDN on first use (~5 MB, cached after). */
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
_ns = {"__name__": "__main__"}
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
    'const __logs=[];const __fmt=v=>{try{return typeof v==="string"?v:JSON.stringify(v)}catch(e){return String(v)}};console.log=console.info=console.warn=console.error=(...a)=>{if(__logs.length<200)__logs.push(a.map(__fmt).join(" "))};';
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

export function runTask(task: CodingTask, code: string): Promise<RunResult> {
  return task.lang === "python" ? runPython(task, code) : runJs(task, code);
}
