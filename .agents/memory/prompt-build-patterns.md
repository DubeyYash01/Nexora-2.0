---
name: Nexora build patterns
description: Design system, auth, Supabase column shapes, route conventions, and component locations for Nexora prompts 1–9
---

## Auth & API pattern
- All protected Express routes use `verifyToken` middleware; sets `req.userId`
- Frontend uses `authFetch` from `@/lib/supabase` — injects `Authorization: Bearer <token>` automatically
- All DB calls via `supabaseAdmin` (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)

## Design system (never deviate)
- Bg: `#0A0A0F` | Surface: `#12121A` | Primary: `#6C63FF` | Accent: `#00D4FF` | Text: `#F0F0FF`
- Muted text: `#9090B0`, border: `#2A2A3E`, subtle: `#5A5A7A`
- Hover borders go to primary `#6C63FF`

## Supabase column naming
- DB columns are `snake_case`; map to `camelCase` in frontend manually (no ORM)
- `project_budget.components` stores `BudgetComponent[]` as jsonb
- `user_components.purchase_price` — nullable number

## Gemini JSON extraction
- Call `result.response.text().trim()`, then strip code fences: `replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")`
- Always wrap in try/catch and re-throw a clean error message

## project.components shape
- In `projects` table: `components jsonb` — set as `{ list: AiComponent[] }` by the analyze/save-components route
- Access as `project.components?.list ?? []` in workspace

**Why:** Consistent pattern across all 14 prompts prevents bugs when workspace reads project data.

## POST /api/projects — assignment_id
- `CreateProjectBody` Zod schema doesn't include `assignment_id`; the POST route reads it raw from `req.body` and spreads it separately into the Supabase insert
- `projects` table has `assignment_id uuid REFERENCES assignments(id)` and `submitted_for_assignment boolean` columns (added in Prompt 7)

## ProjectCard local Project interface
- `artifacts/nexora/src/components/ui/ProjectCard.tsx` defines its own local `Project` interface — must include all fields used in sort/filter (including `updated_at`) or TS errors appear in pages that use `Parameters<typeof ProjectCard>[0]["project"]`

## Supabase Node.js ws fix
- `supabaseAdmin` and `verifyToken` must import `ws` from `"ws"` and pass `{ realtime: { transport: ws } }` to createClient — required on Node.js 20+ where WebSocket is not global

## IDE page patterns (Prompt 8)
- `/ide` page uses `DashboardLayout` directly; it lists all user projects with "Open in IDE" → `/workspace/:id?panel=ide`
- `useSearch()` from wouter reads query params in workspace; `?panel=ide` triggers a 2.2s inset glow on the IDE panel div
- Auto-save debounce is **2s** (not 30s)
- NexoraIDE download button: check `isPro` from `usePlan()` hook; non-pro clicks open `UpgradeModal`

## zod bundling fix (critical)
- `zod` must NOT be in the `external` array of `artifacts/api-server/build.mjs` — esbuild must bundle it
- If left external, zod can't be found at runtime from the dist folder (pnpm workspace resolution doesn't symlink it there)
- **Why:** The api-server packages zod as external but it's not installed as a local node_module symlink, only in pnpm .pnpm store

## Prompt 9 — Settings & Notifications (added Prompt 9)
- `/settings` uses `DashboardLayout` with 7 sections; routing: `/settings/billing` must come BEFORE `/settings` in App.tsx (Wouter first-match)
- `useKeyboardShortcuts` is wired via `<KeyboardShortcutsProvider />` inside `Router()` — needs useLocation hook so must be inside router context
- `NotificationBell` polls `/api/notifications` every 60s; pauses on `document.visibilitychange hidden`
- `OnboardingTour` is localStorage-gated at key `nexora_tour_completed`; renders at end of DashboardLayout
- `ErrorBoundary` is a class component (required by React) — exported as named + default from `components/ui/ErrorBoundary.tsx`
- `data-tour="stats-row"` on dashboard stats grid div; `data-testid="btn-new-project"` on new project buttons

## UserProfile type (AuthContext)
- Includes (as of Prompt 9): id, email, full_name, role, college_name, course, avatar_url, plan, trial_used, bio, username, location, website, notification_preferences, profile_views, is_profile_public, blueprint_attribution
