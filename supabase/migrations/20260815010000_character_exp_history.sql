-- Character EXP-over-time history, same shape/pattern as stat_history —
-- feeds the Progress screen's EXP graph and "then vs now" comparison.
create table public.character_exp_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  value bigint not null,
  recorded_at timestamptz not null default now()
);

alter table public.character_exp_history enable row level security;

create policy "character_exp_history all own" on public.character_exp_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index character_exp_history_user_idx on public.character_exp_history (user_id, recorded_at);

-- Backfill one row per existing user so the graph has a starting point
-- instead of being empty until the next EXP change.
insert into public.character_exp_history (user_id, value, recorded_at)
select id, character_exp, now() from public.users;
