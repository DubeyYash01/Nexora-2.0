---
name: Nexora migration
description: Key decisions from migrating Nexora from Supabase to Replit Auth + Replit PostgreSQL (Drizzle ORM)
---

# Nexora Migration Decisions

**Auth**: Replaced Supabase Auth with Replit OIDC via `openid-client` + `passport`. Session stored in PostgreSQL via `connect-pg-simple`. Session table auto-created by `connect-pg-simple` (createTableIfMissing: true). Auth routes: `/api/login`, `/api/callback`, `/api/logout`. Frontend redirects to `/api/login` instead of form-based auth.

**Why:** Replit Auth is required for Replit-hosted projects; Supabase Auth requires external JWT validation which doesn't work with session-based Replit OAuth flow.

**DB**: Drizzle ORM with `@workspace/db` package (lib/db). Schema in `lib/db/src/schema/`. Push with `pnpm --filter @workspace/db run push`. All routes import `{ db } from "@workspace/db"` and `{ table } from "@workspace/db/schema"`.

**Frontend auth**: `AuthContext.tsx` uses `/api/auth/user` endpoint (session-based). `authFetch` in `lib/supabase.ts` uses `credentials: "include"` for session cookies. No more JWT Bearer tokens.

**esbuild externals**: `drizzle-orm`, `drizzle-orm/*`, `pg`, `zod`, `openid-client`, `passport`, `passport-*`, `express-session`, `connect-pg-simple`, `memoizee` all must be in the `external` array in `artifacts/api-server/build.mjs` — they cannot be bundled by esbuild.

**Secrets**: `SESSION_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL` all provisioned by Replit. GEMINI_API_KEY auto-injected via `javascript_gemini_ai_integrations:2.0.0` integration.

**How to apply:** When adding new server packages that use native modules or complex ESM, add them to the external list in build.mjs before building.
