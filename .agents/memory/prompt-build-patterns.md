---
name: Nexora build patterns
description: Design system, auth, Supabase column shapes, route conventions, and component locations for Nexora prompts 1–11
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

## Supabase Node.js ws fix (updated Prompt 10)
- The `ws` npm package is blocked by Replit's package firewall (es5-ext dependency blocked)
- Fix: use a `FakeWebSocket` stub class in `supabaseAdmin.ts` instead — passes to `{ realtime: { transport: FakeWebSocket } }`
- API server does NOT use realtime, so this is safe

## Mobile / PWA patterns (Prompt 10)
- Breakpoints: base=mobile, `lg:` (1024px) for sidebar/desktop panels — NOT `md:`. All DashboardLayout responsive padding uses `lg:`.
- `DashboardLayout` (dashboard.tsx): sidebar `hidden lg:flex`, mobile nav `<MobileNav>` above content, mobile padding `pt-[calc(56px+16px)] pb-[calc(64px+16px)] lg:pt-6 lg:pb-6`
- Mobile hooks: `useMediaQuery`, `useSwipe`, `useDebounce` in `src/hooks/`
- Mobile components: `MobileNav.tsx` (MobileTopBar + MobileDrawer + MobileBottomTabBar), `BottomSheet.tsx`, `InstallPrompt.tsx`
- PWA: `manifest.json` and `sw.js` in `public/`; service worker registered in `main.tsx`; meta tags in `index.html`
- Workspace mobile: 4 tabs (steps/ide/ai/budget) with `mobileTab` state; desktop `hidden lg:flex`; swipe via `useSwipe`
- Settings mobile: horizontal scrollable pill tabs (hidden `lg:hidden`), desktop sidebar `hidden lg:flex`
- `ProtectedRoute` and `ProtectedProfessorRoute`: use `React.ComponentType` (not `() => ReactNode`) so lazy components typecheck correctly

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

## BottomSheet props (Prompt 11)
- `BottomSheet` uses `isOpen` (NOT `open`) — prop is `isOpen: boolean`

## blueprints trending endpoint (Prompt 11)
- `weekly_forks/weekly_likes/weekly_views` columns do NOT exist in the blueprints table
- Trending score = `fork_count × 3 + like_count × 2 + view_count × 0.3` using regular columns

## Global Search event bus (Prompt 11)
- GlobalSearch overlay opens via `document.dispatchEvent(new CustomEvent("nexora:open-search"))`
- Ctrl+K in `useKeyboardShortcuts.ts` dispatches this event (not a direct state setter)
- This allows the search button in DashboardLayout header + MobileTopBar to open it without prop drilling

## Recently Viewed / Search History tables (Prompt 11)
- Require manual creation in Supabase: `search_history`, `recently_viewed`, `blueprint_tags`
- Routes: `POST /api/recently-viewed` with `{ itemId, itemType, item_title }` body
- All routes silently fail (`.catch(() => {})`) if tables don't exist yet
