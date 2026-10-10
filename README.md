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
