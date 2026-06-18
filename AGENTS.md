# AGENTS.md

## Cursor Cloud specific instructions

Monorepo "Gold Carbon" (BYD → carbon credits). Three pieces:

- `carbon-api/` — FastAPI backend (Python 3.13, managed by `uv`). Dev: `uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload`. Lint: `uv run ruff check .`. Tests: `uv run pytest`. Reads `carbon-api/.env`.
- `carbon-app/` — Next.js 16 frontend. Dev: `npm run dev` (port 3000). Lint: `npm run lint`. Reads `carbon-app/.env.local`.
- `supabase/` — local Supabase stack (Postgres + Auth + PostgREST), source of identity + database.

The update script installs `uv`, syncs backend deps, and installs frontend deps. Everything below is NOT done by the update script — do it manually per session.

### Tooling / PATH
- `uv` lives at `~/.local/bin` (already on PATH for login shells). It manages the pinned Python 3.13.
- Docker is required only for the local Supabase stack. Daemon is not auto-started.

### Starting Docker (needed for Supabase)
Docker 29 + this VM kernel needs fuse-overlayfs and legacy iptables. `/etc/docker/daemon.json` must contain `{"storage-driver":"fuse-overlayfs","features":{"containerd-snapshotter":false}}` (containerd-snapshotter MUST be false on Docker 29 or fuse-overlayfs breaks). Start it once: `sudo dockerd` (run in a tmux session) then `sudo chmod 666 /var/run/docker.sock`.

### Starting Supabase
From repo root: `supabase start` (first run pulls images, ~1 min). Get keys with `supabase status -o env`. The anon/service_role JWTs are deterministic local defaults and are already wired into `carbon-api/.env` and `carbon-app/.env.local`.

### IMPORTANT schema gotcha (local DB)
The raw SQL in `supabase/migrations/` is out of sync with the application code, so a fresh `supabase start` will NOT support the demo/onboard flow until you patch the local DB:
1. The migrations create public tables without privilege grants, so PostgREST (service_role) gets `permission denied`. Fix once after start:
   `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;` (also `GRANT USAGE ON SCHEMA public ...` and `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ...`).
2. The `vehicles` table is missing the `vin` and `source` columns that the code inserts:
   `ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vin text; ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';`
Run these via `docker exec supabase_db_workspace psql -U postgres -d postgres -c "..."`. (These are runtime patches, not committed migrations — the migration files are a known app bug.)

### Auth for local testing
The login page is Google-OAuth only, which is unavailable in the sandbox. To exercise protected routes, create a confirmed user via the GoTrue admin API (POST `http://127.0.0.1:54321/auth/v1/admin/users` with the service_role key, `email_confirm:true`), then either call the backend directly with a Bearer JWT (password grant at `/auth/v1/token?grant_type=password`) or inject a browser session in DevTools using `createBrowserClient` + `signInWithPassword`. After login, the in-app "🧪 Testar com dados demo" button on `/dashboard` populates demo vehicles/trips/credits (no real BYD account needed).

### Production notes
- Frontend API base = `process.env.NEXT_PUBLIC_API_URL || "/api"` (`carbon-app/src/lib/api.ts`); set `NEXT_PUBLIC_API_URL` in Vercel to the backend origin. API path constants already include `/api`, so the `"/api"` fallback only works behind a same-origin rewrite — prefer setting the env var.
- Backend CORS allow-list lives in `carbon-api/src/main.py` (`ALLOWED_ORIGINS` + `*.vercel.app` regex).
- Supabase Auth redirect URLs for production must be added in the hosted Supabase dashboard; the local allow-list lives in `supabase/config.toml`.
