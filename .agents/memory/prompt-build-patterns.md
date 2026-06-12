---
name: Nexora build patterns
description: Design system, auth, Supabase column shapes, and route conventions for Nexora prompts
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
