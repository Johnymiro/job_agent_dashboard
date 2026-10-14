"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Empty, buttonClass } from "@/components/ui";
import { getPrepTest } from "@/lib/prep";
import {
  type Bank,
  type Item,
  type Mode,
  type Session,
  type Summary,
  bankFor,
  clearProgress,
  codeTouched,
  drop,
  feedbackMode,
  findRound,
  grade,
  load,
  newSession,
  pendingSession,
  qItem,
  recordQ,
  recordTask,
  save,
  shuffle,
  summarize,
} from "@/lib/prep/engine";
import { runTask } from "@/lib/prep/runners";
import { Dialog, type DialogSpec } from "./Dialog";
import { Exam } from "./Exam";
import { type HomeProps, PrepHome } from "./PrepHome";
import { Results } from "./Results";

/** /prep/<slug>: looks the test up, then runs the simulator for it. */
export function PrepTestPage({ slug }: { slug: string }) {
  const test = getPrepTest(slug);
  const bank = useMemo(() => (test ? bankFor(test) : null), [test]);
  if (!bank) {
    return (
      <Empty icon="graduation">
        No test prep called “{slug}”.{" "}
        <Link href="/prep" className={buttonClass("ghost", "sm", "ml-2")}>
          All tests
        </Link>
      </Empty>
    );
  }
  return <Simulator bank={bank} />;
}

type View = "home" | "exam" | "results";

/** Start page → session → results for one bank. `renderHome` swaps the start page (subjects show lessons there). */
export function Simulator({
  bank,
  renderHome = (p) => <PrepHome {...p} />,
}: {
  bank: Bank;
  renderHome?: (p: HomeProps) => React.ReactNode;
}) {
  const slug = bank.test.slug;
  const [view, setView] = useState<View>("home");
  const [s, setS] = useState<Session | null>(null);
  const [result, setResult] = useState<{ r: Summary; sess: Session } | null>(null);
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  // bumped after storage writes so the start page re-reads progress
  const [rev, setRev] = useState(0);
  const refresh = () => setRev((n) => n + 1);

  // The open session is saved to this browser (debounced) so leaving the page or
  // reloading never loses answers; the clock keeps running from `ends`.
  const sRef = useRef<Session | null>(null);
  const finishing = useRef(false);
  const saveOpen = useCallback(() => {
    const cur = sRef.current;
    if (cur && !cur.done) save(slug, "session", cur);
  }, [slug]);
  useEffect(() => {
    sRef.current = s;
    if (!s) return;
    const t = setTimeout(saveOpen, 300);
    return () => clearTimeout(t);
  }, [s, saveOpen]);
  useEffect(() => {
    window.addEventListener("pagehide", saveOpen);
    return () => {
      window.removeEventListener("pagehide", saveOpen);
      saveOpen(); // navigating to another dashboard page
    };
  }, [saveOpen]);

  const update = useCallback((fn: (x: Session) => Session) => setS((prev) => (prev ? fn(prev) : prev)), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const open = (sess: Session) => {
    sRef.current = sess;
    save(slug, "session", sess);
    setS(sess);
    setView("exam");
    window.scrollTo(0, 0);
  };
  type StartOpt = { section?: string; round?: string; start?: number; items?: Item[]; title?: string };
  const start = (mode: Mode, opt?: StartOpt) => open(newSession(bank, mode, opt));

  // a Coderbyte round starts like the real one: rules first, then the clock
  const startRound = (round?: string) => {
    const r = findRound(bank.test, round);
    if (!r) return;
    setDialog({
      title: `Begin the ${r.name}?`,
      body: `The ${r.minutes % 60 === 0 ? `${r.minutes / 60}-hour` : `${r.minutes}-minute`} clock starts now and can't be paused, as on Coderbyte. Every question is visible from the start. Pasting from outside the editor and leaving this tab are counted, like Coderbyte's integrity report. Sample tests show while you work; hidden ones grade you at the end.`,
      cancelLabel: "Not yet",
      confirm: { label: "Begin assessment", onConfirm: () => start("coderbyte", { round: r.id }) },
    });
  };

  const finish = async (sess: Session, reason: "submit" | "time") => {
    if (finishing.current) return;
    finishing.current = true;
    const stale = (i: number) => sess.items[i].k === "t" && codeTouched(bank, sess, i) && sess.runs[i]?.code !== sess.code[i];
    setDialog({
      title: reason === "time" ? "Time's up" : "Scoring your answers",
      body: sess.items.some((_, i) => stale(i)) ? "Running your code against the tests…" : "Adding up your score…",
      busy: true,
    });

    // test the final code of every edited task that wasn't run since its last change
    const runs = { ...sess.runs };
    for (let i = 0; i < sess.items.length; i++) {
      const it = sess.items[i];
      if (it.k !== "t" || !stale(i)) continue;
      await new Promise((r) => setTimeout(r, 30));
      const res = await runTask(bank.T[it.id], sess.code[i]);
      runs[i] = { ...res, code: sess.code[i] };
      if (res.tests.length) recordTask(slug, it.id, res.tests.filter((x) => x.passed).length, res.tests.length);
    }
    const done: Session = { ...sess, runs, done: true, finished: Math.min(Date.now(), sess.ends || Infinity), reason };

    // drills already recorded each checked answer
    done.items.forEach((it, i) => {
      if (it.k !== "q") return;
      if (!feedbackMode(done) || (!done.checked[i] && (done.ans[i] || []).length)) recordQ(slug, it.id, grade(bank, done, i).correct);
    });
    const r = summarize(bank, done);
    save(slug, "history", [r, ...load<Summary[]>(slug, "history", [])].slice(0, 40));
    sRef.current = null; // stop the debounced save from bringing it back
    drop(slug, "session");

    setS(null);
    setResult({ r, sess: done });
    setView("results");
    setDialog(null);
    finishing.current = false;
    window.scrollTo(0, 0);
  };

  const goHome = () => {
    refresh();
    setView("home");
    window.scrollTo(0, 0);
  };

  const leave = () => {
    const go = () => {
      saveOpen();
      sRef.current = null;
      setS(null);
      goHome();
    };
    if (!s?.ends) return go();
    setDialog({
      title: "Leave this session?",
      body: "Your answers stay saved in this browser and the clock keeps running. You can resume from this page.",
      cancelLabel: "Stay",
      confirm: { label: "Leave", onConfirm: go },
    });
  };

  const resume = () => {
    const p = pendingSession(bank);
    if (!p) return refresh();
    if (p.ends && p.ends <= Date.now()) finish(p, "time");
    else open(p);
  };

  return (
    <>
      {view === "home" && (
        <Fragment key={rev}>
          {renderHome({
            bank,
            onStart: (mode, opt) => (mode === "coderbyte" ? startRound(opt?.round) : start(mode, opt)),
            onResume: resume,
            onDiscard: () =>
              setDialog({
                title: "Discard the unfinished session?",
                body: "Its answers won't be scored or saved.",
                cancelLabel: "Keep it",
                confirm: {
                  label: "Discard",
                  onConfirm: () => {
                    drop(slug, "session");
                    refresh();
                  },
                },
              }),
            onClearHistory: () =>
              setDialog({
                title: "Clear your history?",
                body: `This removes past scores${bank.test.tasks.length ? ", best coding runs," : ""} and the per-question record used to put unseen and missed questions first.`,
                confirm: {
                  label: "Clear",
                  onConfirm: () => {
                    clearProgress(slug);
                    refresh();
                  },
                },
              }),
          })}
        </Fragment>
      )}

      {view === "exam" && s && (
        <Exam
          bank={bank}
          s={s}
          update={update}
          ask={setDialog}
          dialogOpen={!!dialog}
          onFinish={(reason) => sRef.current && finish(sRef.current, reason)}
          onLeave={leave}
        />
      )}

      {view === "results" && result && (
        <Results
          bank={bank}
          r={result.r}
          sess={result.sess}
          onRetryMissed={() => {
            const missed = result.sess.items.filter((it, i) => it.k === "q" && !grade(bank, result.sess, i).correct);
            const items = shuffle(missed).map((it) => qItem(bank.Q[it.id]));
            if (items.length) start("drill", { items, title: `Retry · ${items.length} missed` });
          }}
          onDrill={(section) => start("drill", { section })}
          onNew={(mode, round) => (mode === "coderbyte" ? startRound(round) : start(mode))}
          onHome={goHome}
        />
      )}

      {dialog && <Dialog spec={dialog} onClose={closeDialog} />}
    </>
  );
}
