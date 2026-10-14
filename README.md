# Job Agent Dashboard (frontend)

Next.js 16 · React 19 · Tailwind v4 · TanStack Query · Axios — static export.
Talks to the FastAPI backend in `../webscrapping_server`.

## Run

```bash
# 1. backend (see its README)
cd ../webscrapping_server && python main.py serve      # http://127.0.0.1:8000

# 2. dashboard
npm install
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 npm run dev  # http://localhost:3000
```

Open it via `localhost` (not `127.0.0.1`) in dev — Next blocks dev assets for
other origins. For production set `NEXT_PUBLIC_API_URL` (see `netlify.toml`) and
add the dashboard origin to the API's `CORS_ORIGINS`.

## Pages

| Route | What it does |
|---|---|
| `/` | Today's sends vs warm-up allowance, replies, reply/bounce rate, setup checklist, run pipeline |
| `/jobs` | Scored jobs — filter by status/region/source/score; drawer with reasons, contacts, "Write email", "Find email" |
| `/leads` | Agencies, funded startups, freelance asks — ranked by odds of a >$5k engagement |
| `/outbox` | **Ready to send** list (best match first): edit, preview exactly as sent (HTML / plain text), Send, re-write, skip; sent emails and replies inline; a "visited" badge when someone opened the portfolio link in a sent email |
| `/portfolio` | Portfolio visitors (PostHog): visits per day, countries and cities, pages (time, scroll), sources, actions, clicks, and which sent emails brought a visit. Needs `POSTHOG_*` in the API's `.env` |
| `/searches` | What discovery runs (Google Jobs/Maps/search via SerpAPI + free boards, HN, RSS, ATS boards) |
| `/runs` | Trigger the full pipeline or one step; live per-step stats |
| `/settings` | Daily cap & warm-up, thresholds, pipeline time, profile + CV upload, mail test, do-not-contact list |
| `/prep` | Technical-test prep packs and subjects to learn, with progress per test and subject |
| `/prep/<slug>` | One test's simulator: Coderbyte-style rounds (when the test has them), timed mock exam, sprint, topic drills, coding lab (Python on Brython, JS in a worker, React 18 in a sandboxed frame, real tests), results with explanations. Progress is kept in this browser (`localStorage`, keys `prep.<slug>.*`) |
| `/prep/learn/<subject>` | A subject (Python, React & TypeScript): lessons with progress, and a quick review of their checks (missed first) on the same simulator |
| `/prep/learn/<subject>/<lesson>` | One lesson: explanations, examples, callouts, quick checks with instant feedback, "mark as learned", prev / next |

## Adding a test prep

1. Write `lib/prep/tests/<slug>.ts` exporting a `PrepTest` (shape and comments in `lib/prep/types.ts`; `bnp-paribas.ts` is a full example): sections, multiple-choice questions (`a` = indexes of the right options), coding tasks with tests, and the mock/sprint settings. Leave out `mock`, `sprint` or `tasks` if the test doesn't need them.
2. Add it to `PREP_TESTS` in `lib/prep/index.ts`.

That's it: `/prep` lists it and `/prep/<slug>` is generated at build time. Python test `expected` values are Python literals as strings (`"[1, 2]"`); JS and React ones are plain JSON values.

**Coderbyte-style rounds** (`coderbyte` in the `PrepTest`, see `bnp-coderbyte.ts`): one clock that can't be paused, one challenge drawn from each pool, then multiple choice; each challenge scores out of `points`. Tests marked `hidden` stay hidden until you submit, so keep at least one visible sample per rule in the prompt and hide only edge cases, and pasting from outside the editor or leaving the tab is counted like Coderbyte's integrity report. Coderbyte-format programs set `stdin`: `input()` / `readline()` returns it, and tests call `_main(value)` (Python) or `__main(value)` (JS) to run the whole program and get what it printed. `_uses_name` / `_has_comment` (Python) and `usesName` / `hasComment` (JS, React) check "use a variable named…" instructions.

**React tasks** (`lang: "react"`): JSX or TSX, compiled by Babel and run on React 18 in a sandboxed iframe. Each test renders the app fresh, then evaluates its expression with DOM helpers: `$`, `$$`, `text`, `texts`, `value`, `click`, `type`, `choose`, `submit`, `settle`, `waitFor`, plus `source` (the code as text). `setup` runs before each render (e.g. a fake `fetch`) and gets `settle()`.

## Adding lessons or a subject

Lessons are Markdown files in `content/learn/<subject>/`, named `NN-lesson-id.md` (the number sets the order, the rest is the URL). `level` is `core`, `intermediate` or `advanced`. They're read at build time, so a new file only needs a rebuild (or a refresh in dev). A malformed quick check fails the build with the file name.

```md
---
title: Closures and decorators
summary: One line for the lesson list.
level: core
---

Intro paragraph. Inline `code`, **bold**, [links](https://docs.python.org).

## A section          (h2s build the "On this page" list)

> **Tip:** / **Pitfall:** / **In the test:** callouts (a plain > quote is a note)

## Quick check

**Q:** Question stem

- [ ] wrong option
- [x] right option    (several [x] = select all that apply)

> One-paragraph explanation.
```

Code fences (` ```python `, ` ```jsx ` …), lists and `| tables |` work as usual. To add a subject, add it to `SUBJECTS` in `lib/learn/subjects.ts` and create its folder.
