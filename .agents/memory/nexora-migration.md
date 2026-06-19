---
name: Nexora migration
description: Replit environment setup decisions for the Nexora app (Supabase auth + DB, Groq AI)
---

# Nexora Replit Environment Setup

**Auth & DB**: App uses Supabase (email+password auth, PostgreSQL). Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. API server uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to create `supabaseAdmin` client.

**AI**: Groq API via `GROQ_API_KEY` secret (replaces Gemini in this Replit environment). Routes in `artifacts/api-server/src/routes/analyze.ts` and `workspace.ts` call Groq.

**Supabase ws fix**: The `ws` npm package is blocked by Replit's package firewall. Fix: use a `FakeWebSocket` stub class in `supabaseAdmin.ts` passed to `{ realtime: { transport: FakeWebSocket } }`.

**Service worker (CRITICAL)**: The original `public/sw.js` used a cache-first strategy that caused ALL JS to be served from a stale cache, making the app appear broken even after code changes. Fix applied: replaced `sw.js` with a self-destructing service worker that:
1. Calls `self.skipWaiting()` on install
2. On activate: clears ALL caches, then calls `self.registration.unregister()`
This ensures no stale JS is ever served in dev or production.

**main.tsx SW unregistration**: Added dev-mode check to unregister any existing SWs on startup (belt-and-suspenders with the self-destructing sw.js).

**Why the SW was the root cause**: First app load caches all JS via cache-first SW. Any subsequent load — even after code fixes — serves old broken JS from cache. The "Invalid hook call" error was from stale cached modules, not from the current code.

**HMR config**: `clientPort: 443, protocol: "wss"` is correct for Replit proxy access. Screenshot tool uses `localhost:5000` directly and gets HMR connection refused — expected, app still functions.

**esbuild externals**: `drizzle-orm`, `pg`, `zod` must NOT be in the external array — esbuild must bundle them (pnpm workspace doesn't symlink to dist/).
