# Good Morning App

A morning dashboard: calendar, inbox, weather, scripture study, workouts, and an AI-planned day.

- `frontend/` — Vite + React + Tailwind, http://localhost:5173
- `backend/` — Node + Express API on port 4000 (the Vite dev server proxies `/api` to it)

## Run locally

```powershell
# one-time setup
cd backend;  npm install;  Copy-Item .env.example .env   # then fill in .env
cd ../frontend;  npm install

# every time (two terminals)
cd backend;  npm run dev
cd frontend; npm run dev
```

Open http://localhost:5173 and sign in with Google. See `backend/.env.example` for every variable.

## AI features (Groq, free tier)

AI planning runs on [Groq](https://console.groq.com) through its OpenAI-compatible API. Everything
happens on the backend; the API key never reaches the browser and is never logged.

### Setup

1. Create a free API key at https://console.groq.com/keys.
2. In `backend/.env` set:
   ```
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=openai/gpt-oss-120b      # needs strict structured-output support
   GROQ_REASONING_EFFORT=low           # low | medium | high
   APP_TIMEZONE=America/Denver
   PLAN_JOB_TIME=05:30
   ```
3. Restart the backend. The startup log should say `AI (Groq openai/gpt-oss-120b): on` and
   `Morning plan job: daily at 05:30 America/Denver`.

Models that support strict JSON schema output on Groq (as of Oct 2026): `openai/gpt-oss-120b`,
`openai/gpt-oss-20b`, `qwen/qwen3.8-27b`. Free-tier limits are per model: 30 requests/min,
1,000/day, 8,000 tokens/min, 200,000 tokens/day.

### Daily plan

- `GET /api/plan/today` returns the saved plan (never calls Groq); 404 if none yet.
- `POST /api/plan/generate` builds today's plan from your Google Calendar events and recent
  emails (sender, subject, and a 200-character snippet only; bodies are never fetched or
  stored), plus today's workout and your scripture reading time, then saves it.
- The morning job runs inside the backend at `PLAN_JOB_TIME`. If the backend was off at that
  time, it catches up as soon as it starts. It only runs while the backend is running.
- Every response is validated (Zod schema plus rules: 3–5 priorities, valid `HH:MM` times, no
  overlapping blocks, every calendar event present at its real time, known email ids). An invalid
  response is retried once with the problem explained, then reported as an error with a Retry
  button. A 429 is retried automatically when Groq asks for a wait of 10 seconds or less;
  otherwise the UI shows how long to wait.

### Workout generator

`POST /api/workout/generate` (Workout tab → AI Coach):

- `{ "mode": "edit_day", "weekIndex": 0, "weekday": "mon", "notes": "..." }` rewrites one day
  of the current plan.
- `{ "mode": "new_plan", "notes": "..." }` designs a brand-new one-week plan from your goals,
  equipment, and days per week (saved in settings), ignoring the current plan.

Both use your last 6 weeks of check-offs and body measurements, and both create a suggestion
you review: nothing changes until you tap Apply / Use this plan. Applying a new plan restarts
the rotation at Week 1 this week. "Restore original 2-week plan" brings back the default.

### Editing the prompts

All prompts are in [`backend/src/ai/prompts.js`](backend/src/ai/prompts.js). Response schemas and
validation rules are in [`backend/src/ai/schemas.js`](backend/src/ai/schemas.js).

### Testing locally

1. With the backend and frontend running and signed in, open Home: Today's Priorities shows
   "Plan my day" if no plan exists yet. Press it (5–30 s), then try Regenerate.
2. Check the API directly in the browser while signed in: http://localhost:5173/api/plan/today
3. Open http://localhost:5173/api/plan/today in a private window: it must return 401.
4. Test the morning job by setting `PLAN_JOB_TIME` to a minute from now and restarting the
   backend; watch for `Morning job: generated ...` in the backend log. (It skips users who
   already have today's plan.)
5. Workout tab → AI Coach → Edit a day, then Dismiss or Apply.

### Security notes

- Every `/api` route except Google sign-in requires your session cookie.
- Email and calendar text is passed to the model as untrusted data; the system prompt tells the
  model never to follow instructions found in it, and the model can only return a plan. The app
  has no code path that sends email or acts on your accounts based on model output (calendar
  edits only happen when you make them yourself in the event editor).
- `backend/.env` and `backend/data/` (local database with Google tokens) are git-ignored.

## Canvas LMS

Connect in **Settings → Connected Accounts → Canvas** with your school's Canvas address and a
personal access token (Canvas → Account → Settings → Approved Integrations → + New Access Token).

- Read-only: the app only sends GET requests (`/users/self`, `/planner/items`,
  `/users/self/missing_submissions`). It never submits or changes anything in Canvas.
- The token is encrypted at rest (AES-256-GCM, key derived from `SESSION_SECRET`) and never sent
  back to the browser. Changing `SESSION_SECRET` means reconnecting Canvas.
- Home shows a **Coursework** section (due in the next 7 days, plus missing work from the last 3
  weeks), and the daily plan gets work due in the next 3 days so deadlines shape your priorities.
- Disconnecting removes the token from the app; also delete it in Canvas to revoke it there.
- API: `GET /api/canvas/status`, `POST /api/canvas/connect` `{ baseUrl, token }`,
  `DELETE /api/canvas/connect`, `GET /api/canvas/upcoming?days=7`.

## Database

Data is stored in `backend/data/db.json` until `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are set. To move to Supabase, run the SQL files in `backend/supabase/migrations/` in order (0001–0004).
