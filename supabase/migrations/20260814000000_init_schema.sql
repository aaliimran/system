-- Personal Progression System — initial schema
-- Every user-scoped table carries user_id + RLS from day one (multi-tenant readiness,
-- see CLAUDE.md "Multi-tenant readiness"), even though there is currently one user.

create extension if not exists pgcrypto;

-- ============================================================================
-- users (profile row extending auth.users)
-- ============================================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  intensity text not null default 'balanced' check (intensity in ('soft', 'balanced', 'hard')),
  telegram_chat_id text,
  character_level int not null default 1,
  character_exp bigint not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users select own" on public.users
  for select using (auth.uid() = id);
create policy "users update own" on public.users
  for update using (auth.uid() = id);
create policy "users insert own" on public.users
  for insert with check (auth.uid() = id);

-- ============================================================================
-- stats — 5 fixed rows per user (STR/END/VIT/MIND/INT), current value + history
-- ============================================================================
create table public.stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  code text not null check (code in ('STR', 'END', 'VIT', 'MIND', 'INT')),
  current_value numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, code)
);

alter table public.stats enable row level security;

create policy "stats all own" on public.stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.stat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  stat_code text not null check (stat_code in ('STR', 'END', 'VIT', 'MIND', 'INT')),
  value numeric not null,
  recorded_at timestamptz not null default now()
);

alter table public.stat_history enable row level security;

create policy "stat_history all own" on public.stat_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index stat_history_user_stat_idx on public.stat_history (user_id, stat_code, recorded_at);

-- ============================================================================
-- skills / sub_skills
-- linked_stats: jsonb array of {"stat": "STR", "weight": 1.0} — see
-- CLAUDE.md "Resolved Design Decisions #4" for the STR/END/INT linkage.
-- MIND and VIT are computed directly (quest_logs / vitality_logs) and are
-- never referenced by a skill's linked_stats.
-- ============================================================================
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  category text not null check (category in ('PHYSICAL', 'KNOWLEDGE_CRAFT', 'PERSONAL_DEVELOPMENT')),
  name text not null,
  linked_stats jsonb not null default '[]'::jsonb,
  level int not null default 1,
  current_exp bigint not null default 0,
  soft_ceiling int not null default 50,
  is_maintenance boolean not null default false,
  fatigue_active boolean not null default false,
  fatigue_started_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.skills enable row level security;

create policy "skills all own" on public.skills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.sub_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  name text not null,
  level int not null default 1,
  current_exp bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sub_skills enable row level security;

create policy "sub_skills all own" on public.sub_skills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index sub_skills_skill_idx on public.sub_skills (skill_id);

-- ============================================================================
-- quests / quest_logs
-- ============================================================================
create table public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('daily', 'weekly', 'main', 'milestone', 'challenge', 'boss')),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'missed', 'excluded')),
  base_exp int not null default 0,
  awarded_exp int,
  skill_id uuid references public.skills (id) on delete set null,
  sub_skill_id uuid references public.sub_skills (id) on delete set null,
  parent_quest_id uuid references public.quests (id) on delete set null,
  due_date date,
  completed_at timestamptz,
  is_pr boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.quests enable row level security;

create policy "quests all own" on public.quests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index quests_user_status_idx on public.quests (user_id, status);
create index quests_parent_idx on public.quests (parent_quest_id);

create table public.quest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  quest_id uuid not null references public.quests (id) on delete cascade,
  event text not null check (event in ('completed', 'missed', 'excluded')),
  exp_awarded int not null default 0,
  log_date date not null,
  logged_at timestamptz not null default now()
);

alter table public.quest_logs enable row level security;

create policy "quest_logs all own" on public.quest_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index quest_logs_user_date_idx on public.quest_logs (user_id, log_date);

-- ============================================================================
-- achievements — global catalog (readable by all authenticated users) +
-- per-user unlocked state
-- ============================================================================
create table public.achievements_catalog (
  key text primary key,
  name text not null,
  description text not null,
  hidden boolean not null default true,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.achievements_catalog enable row level security;

create policy "achievements_catalog read all" on public.achievements_catalog
  for select using (auth.role() = 'authenticated');

create table public.achievements_unlocked (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  achievement_key text not null references public.achievements_catalog (key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

alter table public.achievements_unlocked enable row level security;

create policy "achievements_unlocked all own" on public.achievements_unlocked
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- codex_entries — auto-generated chronicle
-- ============================================================================
create table public.codex_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  entry_type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.codex_entries enable row level security;

create policy "codex_entries all own" on public.codex_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index codex_entries_user_occurred_idx on public.codex_entries (user_id, occurred_at desc);

-- ============================================================================
-- weekly_reviews — saved Weekly Analyst snapshots
-- ============================================================================
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  stat_deltas jsonb not null default '{}'::jsonb,
  detected_issue text,
  recommended_focus text,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_reviews enable row level security;

create policy "weekly_reviews all own" on public.weekly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- onboarding_answers — raw Character Creation answers (kept so the
-- self-rating -> starting-level mapping can be recalibrated later without
-- re-asking the user; see CLAUDE.md "Resolved Design Decisions #3")
-- ============================================================================
create table public.onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  skill_id uuid references public.skills (id) on delete set null,
  question_key text not null,
  self_rating int check (self_rating between 1 and 5),
  objective_answer jsonb,
  created_at timestamptz not null default now()
);

alter table public.onboarding_answers enable row level security;

create policy "onboarding_answers all own" on public.onboarding_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- vitality_logs — daily sleep/recovery check-in; feeds VIT directly
-- (VIT is not skill-derived, see "Resolved Design Decisions #4")
-- ============================================================================
create table public.vitality_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  log_date date not null,
  sleep_hours numeric,
  sleep_quality int check (sleep_quality between 1 and 5),
  recovery_note text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.vitality_logs enable row level security;

create policy "vitality_logs all own" on public.vitality_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- life_happened_flags — explicit exclusion window (day or week): no debuff,
-- no EXP, honest not punitive. See CLAUDE.md "Failure / Recovery System".
-- ============================================================================
create table public.life_happened_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.life_happened_flags enable row level security;

create policy "life_happened_flags all own" on public.life_happened_flags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index life_happened_flags_user_range_idx on public.life_happened_flags (user_id, start_date, end_date);
