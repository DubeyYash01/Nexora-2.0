# Nexora

An AI-powered IoT project creation platform that turns any IoT idea into a working project — guided by AI, step by step.

## Run & Operate

- `pnpm --filter @workspace/nexora run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter (routing) + Tailwind CSS
- Backend: Express 5 (Node.js)
- Auth & DB: Supabase (email+password auth, PostgreSQL)
- AI: Google Gemini API (gemini-1.5-flash — planned for later prompts)
- Icons: Lucide React
- Fonts: Inter (body), JetBrains Mono (code)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas (used by API server)
- `artifacts/nexora/src/` — React frontend
  - `pages/` — Landing, Login, Signup, RoleSelect, Dashboard
  - `context/AuthContext.tsx` — Supabase auth state (user, profile, signUp, signIn, signOut, updateProfile)
  - `lib/supabase.ts` — Supabase client + authFetch helper
  - `hooks/useAuth.ts` — hook to access AuthContext
  - `index.css` — design system CSS variables (Nexora dark theme)
- `artifacts/api-server/src/routes/` — Express route handlers
  - `profiles.ts` — GET/PATCH /api/profiles/me
  - `projects.ts` — CRUD /api/projects + /api/projects/stats
- `artifacts/api-server/src/middlewares/verifyToken.ts` — Supabase JWT verification

## Architecture decisions

- Supabase Auth handles user identity; the Express API verifies JWTs using `supabase.auth.getUser(token)` so we don't need a service role key for auth validation.
- Profiles table in Supabase stores extended user data (role, college_name, course, etc.) — a DB trigger auto-creates a profile row on signup.
- OpenAPI-first: all API contracts defined in `lib/api-spec/openapi.yaml`, codegen produces typed hooks + Zod validators.
- Design system is entirely CSS custom properties in `index.css` — dark purple/cyan palette applied globally.

## Supabase Setup Required

Run these SQL statements in Supabase SQL Editor:

```sql
-- Profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  email text,
  full_name text,
  role text CHECK (role IN ('student','maker','professor','professional')),
  college_name text,
  course text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  idea_input text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed')),
  current_step integer DEFAULT 0,
  ai_analysis jsonb,
  components jsonb,
  build_plan jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project members table
CREATE TABLE project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  user_id uuid REFERENCES profiles(id),
  role text CHECK (role IN ('owner','collaborator')),
  joined_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can CRUD own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can read projects" ON project_members FOR SELECT USING (auth.uid() = user_id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Design System

Colors (dark purple-tinted palette):
- Background: `#0A0A0F` / HSL(240 33% 6%)
- Surface: `#12121A` / HSL(240 27% 8%)
- Primary: `#6C63FF` / HSL(245 100% 69%)
- Accent (cyan): `#00D4FF` / HSL(192 100% 50%)
- Text: `#F0F0FF` / HSL(240 100% 97%)

## Product

Nexora is a complete IoT project creation platform. This is Prompt 1 of 14:
- Landing page with hero, problem section, features
- Email/password auth via Supabase
- Role selection (student/maker/professor/professional)
- Dashboard placeholder with sidebar layout + project stats

## User preferences

- Design system must be consistent across every screen built in all future prompts
- This is Prompt 1 of 14 — future prompts will build on top of this foundation

## Gotchas

- Google Fonts `@import url(...)` must be the VERY FIRST line in `index.css` — before `@import "tailwindcss"`
- Supabase tables + trigger must be manually created in Supabase dashboard (see SQL above)
- API server reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to verify JWTs
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
