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
| `/prep` | Technical-test prep packs, with progress per test |
| `/prep/<slug>` | One test's simulator: timed mock exam, sprint, topic drills, coding lab (Python on Brython, JS in a worker, real tests), results with explanations. Progress is kept in this browser (`localStorage`, keys `prep.<slug>.*`) |

## Adding a test prep

1. Write `lib/prep/tests/<slug>.ts` exporting a `PrepTest` (shape and comments in `lib/prep/types.ts`; `bnp-paribas.ts` is a full example): sections, multiple-choice questions (`a` = indexes of the right options), coding tasks with tests, and the mock/sprint settings. Leave out `mock`, `sprint` or `tasks` if the test doesn't need them.
2. Add it to `PREP_TESTS` in `lib/prep/index.ts`.

That's it: `/prep` lists it and `/prep/<slug>` is generated at build time. Python test `expected` values are Python literals as strings (`"[1, 2]"`); JS ones are plain JSON values.
