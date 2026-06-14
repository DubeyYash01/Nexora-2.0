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
  - `pages/` — Landing, Login, Signup, RoleSelect, Dashboard, Projects, NewProject, Workspace
  - `components/ide/NexoraIDE.tsx` — Monaco Editor IDE component (C++/Arduino, custom nexora-dark theme)
  - `context/AuthContext.tsx` — Supabase auth state (user, profile, signUp, signIn, signOut, updateProfile)
  - `lib/supabase.ts` — Supabase client + authFetch helper
  - `hooks/useAuth.ts` — hook to access AuthContext
  - `index.css` — design system CSS variables (Nexora dark theme) + workspace/IDE CSS
- `artifacts/api-server/src/routes/` — Express route handlers
  - `profiles.ts` — GET/PATCH /api/profiles/me
  - `projects.ts` — CRUD /api/projects + /api/projects/stats
  - `analyze.ts` — POST /api/projects/analyze (Gemini AI analysis), POST /api/projects/save-components
  - `workspace.ts` — POST /api/projects/generate-plan, GET /api/projects/workspace/:id, POST /api/projects/complete-step, POST /api/projects/save-ide-code
- `artifacts/api-server/src/middlewares/verifyToken.ts` — Supabase JWT verification

## Architecture decisions

- Supabase Auth handles user identity; the Express API verifies JWTs using `supabase.auth.getUser(token)` so we don't need a service role key for auth validation.
- Profiles table in Supabase stores extended user data (role, college_name, course, etc.) — a DB trigger auto-creates a profile row on signup.
- OpenAPI-first: all API contracts defined in `lib/api-spec/openapi.yaml`, codegen produces typed hooks + Zod validators.
- Design system is entirely CSS custom properties in `index.css` — dark purple/cyan palette applied globally.

## Supabase Setup Required (Prompt 6 additions)

Run these SQL statements in Supabase SQL Editor after the Prompt 5 tables:

```sql
CREATE TABLE IF NOT EXISTS blueprints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  difficulty text CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  category text,
  components jsonb,
  build_plan jsonb,
  ai_analysis jsonb,
  tags text[],
  is_featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  fork_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  source_project_id uuid REFERENCES projects(id),
  estimated_cost_min integer,
  estimated_cost_max integer,
  estimated_time text,
  platform text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blueprint_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_id uuid REFERENCES blueprints(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(blueprint_id, user_id)
);

CREATE TABLE IF NOT EXISTS blueprint_forks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_id uuid REFERENCES blueprints(id),
  forked_by uuid REFERENCES profiles(id),
  new_project_id uuid REFERENCES projects(id),
  forked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blueprint_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_id uuid REFERENCES blueprints(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blueprint_id, user_id)
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS blueprint_id uuid REFERENCES blueprints(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS forked_from uuid REFERENCES blueprints(id);

ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public blueprints readable" ON blueprints FOR SELECT USING (is_public = true);
CREATE POLICY "authors manage blueprints" ON blueprints FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "users manage own likes" ON blueprint_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users manage own forks" ON blueprint_forks FOR ALL USING (auth.uid() = forked_by);
CREATE POLICY "users manage own reviews" ON blueprint_reviews FOR ALL USING (auth.uid() = user_id);
```

## Supabase Setup Required (Prompt 7 additions)

Run these SQL statements in Supabase SQL Editor after the Prompt 6 tables:

```sql
-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id uuid REFERENCES profiles(id),
  name text NOT NULL,
  description text,
  join_code text UNIQUE NOT NULL,
  subject text,
  academic_year text,
  semester text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Class members table
CREATE TABLE IF NOT EXISTS class_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  instructions text,
  due_date timestamptz,
  max_score integer DEFAULT 100,
  difficulty text CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  required_components text[],
  starter_code text,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assignment submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id),
  project_id uuid REFERENCES projects(id),
  status text DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','rejected','resubmit')),
  score integer,
  feedback text,
  ai_feedback text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  UNIQUE(assignment_id, student_id)
);

-- Add assignment columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES assignments(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_for_assignment boolean DEFAULT false;

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "professors manage own classes" ON classes FOR ALL USING (auth.uid() = professor_id);
CREATE POLICY "students view enrolled classes" ON classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM class_members WHERE class_id = classes.id AND student_id = auth.uid())
);

-- RLS Policies for class_members
CREATE POLICY "professors view class members" ON class_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM classes WHERE id = class_members.class_id AND professor_id = auth.uid())
);
CREATE POLICY "students manage own membership" ON class_members FOR ALL USING (auth.uid() = student_id);

-- RLS Policies for assignments
CREATE POLICY "professors manage own assignments" ON assignments FOR ALL USING (auth.uid() = professor_id);
CREATE POLICY "students view published assignments" ON assignments FOR SELECT USING (
  is_published = true AND
  EXISTS (SELECT 1 FROM class_members WHERE class_id = assignments.class_id AND student_id = auth.uid())
);

-- RLS Policies for assignment_submissions
CREATE POLICY "students manage own submissions" ON assignment_submissions FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "professors view class submissions" ON assignment_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM assignments WHERE id = assignment_submissions.assignment_id AND professor_id = auth.uid())
);
CREATE POLICY "professors update submissions" ON assignment_submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM assignments WHERE id = assignment_submissions.assignment_id AND professor_id = auth.uid())
);
```

## Supabase Setup Required (original)

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
  ide_code text,
  completed_steps integer[],
  instruction_checks jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- If table already exists, add new columns (Prompt 3):
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS ide_code text;
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_steps integer[];
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS instruction_checks jsonb;

-- AI Conversations table (Prompt 4)
CREATE TABLE ai_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  user_id uuid REFERENCES profiles(id),
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Feedback table (Prompt 4)
CREATE TABLE ai_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id text NOT NULL,
  project_id uuid REFERENCES projects(id),
  user_id uuid REFERENCES profiles(id),
  feedback text CHECK (feedback IN ('helpful','not_helpful')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "Users can manage own conversations" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own feedback" ON ai_feedback FOR ALL USING (auth.uid() = user_id);

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

Nexora is a complete IoT project creation platform. Prompts 1–6 of 14 complete:
- **Prompt 1**: Landing page, auth (login/signup/role-select), dashboard shell, Supabase setup
- **Prompt 2**: Project creation (2-step: AI analysis → component selection), Gemini integration, project/stats routes
- **Prompt 3**: Build plan generator (Gemini), Project Workspace (`/workspace/:id`) with 3-panel layout:
  - Left panel: step-by-step build plan (locked/active/completed states, checkboxes, wiring notes, safety warnings)
  - Right panel: Nexora IDE (Monaco Editor, custom nexora-dark theme, C++/Arduino, code push on step completion, highlight animation)
  - Right panel tabs: Code Editor + Library Reference (auto-accumulated per completed step)
  - Resizable panels, 30s auto-save, state persists across reloads
- **Prompt 4**: Full context-aware AI Assistant:
  - Bottom panel in workspace: real Gemini-powered chat with full project context injection every message
  - Conversation persists in Supabase `ai_conversations` table per project
  - Smart suggested prompts that change by build phase
  - Markdown + syntax-highlighted code rendering; "Push to IDE" button on code blocks
  - Error debugger modal, "Explain this" tooltip, Voice input, 👍/👎 feedback
  - Rate limiting: 30 messages/hour; Floating AI button on all non-workspace pages
- **Prompt 5**: Component Inventory + Budget Tracker:
  - `/components` page: full CRUD component inventory with autocomplete, search, filter, stats
  - Suggest Projects panel: Gemini matches inventory → 6 ranked project ideas
  - Shopping list generator (Gemini, India-optimized with store links)
  - Component substitution finder
  - Workspace Budget tab: per-component estimated vs. actual cost, progress bar
  - Dashboard "Components Saved" stat; New Project auto-matches inventory
- **Prompt 6**: Blueprint Library + Sharing System:
  - `/blueprints` page: hero, sticky search/filter, featured horizontal scroll, 3-col grid
  - 6 official seed blueprints (seeded automatically on first visit)
  - Blueprint Detail page (`/blueprints/:id`): 4 tabs — Overview, Components, Build Plan, Reviews
  - Fork flow: creates customized project, Gemini adapts components to user inventory
  - Publish Blueprint modal: 3-step (Details → Visibility → Preview) with CSS confetti
  - Project Sharing: share toggle → generates share_token → public URL
  - Public project view (`/p/:shareToken`): no auth required, "Get Started Free" CTA
  - Export Code tab: syntax-highlighted code viewer
  - "Made with Nexora" card: beautiful shareable card with QR + LinkedIn/Instagram/WhatsApp captions
  - Dashboard blueprint cards now load from real API (featured blueprints)
  - Workspace "Export / Share" button opens the full Share modal
- **Prompt 7**: Professor Dashboard + Assignment System:
  - Professor role redirect on login → `/professor` overview dashboard
  - `ProfessorLayout` sidebar with: Overview, My Classes, Assignments, Submissions, Analytics, Students
  - Classes: create/delete classes with join codes, view enrolled student count
  - Assignments: create assignments with title, description, due date, max score, difficulty, linked class
  - Submissions: list + filter student submissions by class/assignment/status, with review link
  - Review page: approve/reject submission, add feedback, set score, trigger Gemini AI feedback
  - Analytics: class + assignment performance charts (submissions by status, avg score, activity timeline)
  - Students: list all enrolled students across professor's classes, search, view per-class breakdown
  - Student side: `/assignments` page — join class by code, view active/completed assignments
  - StartAssignment modal: creates a linked project from the assignment
  - Workspace banner: shows assignment context; Submit button opens SubmitAssignment modal
  - GradeView inline: shows received grade + professor feedback after submission review
  - Backend routes: `/api/classes`, `/api/assignments`, `/api/submissions`, `/api/analytics`
  - Supabase tables: `classes`, `class_members`, `assignments`, `assignment_submissions`
  - `projects` table: added `assignment_id uuid` and `submitted_for_assignment boolean` columns

- **Prompt 8**: Pricing Plans + Razorpay Payments + Subscription Management:
  - `/pricing` page: Free / Student Pro (₹299/month or ₹999/semester) / Maker Pro (₹499/month) / College Lab (contact)
  - 7-day free trial for Student Pro (no payment needed), `trial_used` flag prevents repeat
  - Razorpay checkout integration: create-order → Razorpay modal → verify signature → activate subscription
  - `/settings/billing` page: current plan, usage stats, payment history, cancel subscription
  - `usePlan` hook: fetches subscription state from `/api/payments/subscription/:userId`
  - `useAILimit` hook: fetches daily AI message usage from `/api/usage/me`
  - `UpgradeModal` component: plan picker with billing cycle selector + free trial CTA
  - `PaywallGate` component: wraps features with upgrade prompt (block / blur / lock-icon modes)
  - `PLANS` config in `lib/planLimits.ts`: limits, prices, features per plan
  - Backend routes: `/api/payments/*` (create-order, verify, start-trial, cancel, subscription/:id, history/:id), `/api/usage/me`, `/api/contact/college-inquiry`
  - Supabase tables: `subscriptions`, `payment_history`, `usage_tracking`, `college_inquiries`; `profiles.plan` and `profiles.trial_used` columns
  - Razorpay env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (set in Replit secrets)

- **Prompt 9**: Settings, Notifications, Onboarding, Error Handling, Loading States, 404, Keyboard Shortcuts:
  - `/settings` page: 7-section tabbed layout (Profile, Account, Notifications, Appearance, Billing, Privacy, Keyboard Shortcuts)
  - Profile section: full_name, username (with real-time uniqueness check + 500ms debounce), bio (160 char limit), role modal, college/course, location, website
  - Account section: change password (with strength indicator + visibility toggle), delete account (requires typing "DELETE"), request data export
  - Notifications section: 6 toggle preferences, auto-saved on change
  - Appearance section: font size slider for IDE (localStorage), layout toggles
  - Privacy section: public/private profile toggle, per-project defaults
  - Keyboard Shortcuts section: full reference table (Ctrl+H/P/I/N/B/,/K/Enter etc.)
  - Notification Bell: replaces placeholder Bell in navbar header; polls every 60s (paused on `visibilitychange`); unread count badge (max "9+"); dropdown with type icons, mark-all-read
  - Onboarding Tour: 5-step spotlight system (localStorage gated at `nexora_tour_completed`); CSS box-shadow spotlight; tooltip with step dots, Back/Next/Skip
  - 404 Page: gradient "404" text, compass icon, two action buttons, quick links row
  - `ErrorBoundary` class component: wraps `<Workspace>` + entire app; collapsible error details; Try Again + Go to Dashboard
  - `EmptyState` component: applied to `/projects` (no projects / filtered empty)
  - `SkeletonCard` + `SkeletonCards`: shimmer animation, replaces spinner on `/projects` loading state
  - `useKeyboardShortcuts` hook: activated globally via `KeyboardShortcutsProvider` in `App.tsx`; ignores INPUT/TEXTAREA targets
  - `/profile/:username` public profile page: avatar, bio, role badge, stats, blueprints/projects tabs; no auth required
  - Backend routes: `settings.ts` (PUT /api/settings/profile, POST /settings/change-password, DELETE /auth/delete-account, PUT /settings/notifications, POST /settings/validate-username, GET /api/profile/:username), `notifications.ts` (GET/PUT /api/notifications, POST /api/notifications)
  - Bug fix: removed `zod` from esbuild `external` list so it bundles correctly (was failing on API server restart)
  - New Supabase tables: `notifications`; new columns on `profiles`: `username`, `bio`, `location`, `website`, `notification_preferences`, `profile_views`, `is_profile_public`

## Supabase Setup Required (Prompt 8 additions)

Run these SQL statements in Supabase SQL Editor after the Prompt 7 tables:

```sql
-- Add plan columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  status text DEFAULT 'active' CHECK (status IN ('active','trial','cancelled','expired')),
  billing_cycle text DEFAULT 'monthly',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_subscription_id text,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  plan text NOT NULL,
  billing_cycle text,
  amount integer NOT NULL,
  currency text DEFAULT 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  status text DEFAULT 'captured',
  created_at timestamptz DEFAULT now()
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  date date DEFAULT CURRENT_DATE,
  ai_messages_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- College inquiries table
CREATE TABLE IF NOT EXISTS college_inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  student_count integer,
  message text,
  user_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users manage own subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users view own payment history" ON payment_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own usage" ON usage_tracking FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users insert own inquiries" ON college_inquiries FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
```

## Supabase Setup Required (Prompt 9 additions)

Run these SQL statements in Supabase SQL Editor after the Prompt 8 tables:

```sql
-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  type text,
  title text,
  message text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- New profile columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_views integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_profile_public boolean DEFAULT true;
```

## User preferences

- Design system must be consistent across every screen built in all future prompts
- This is Prompt 10 of 14 — future prompts will build on top of this foundation

## Gotchas

- Google Fonts `@import url(...)` must be the VERY FIRST line in `index.css` — before `@import "tailwindcss"`
- Supabase tables + trigger must be manually created in Supabase dashboard (see SQL above)
- API server reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to verify JWTs
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
