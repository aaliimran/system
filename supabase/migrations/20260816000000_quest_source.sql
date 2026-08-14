-- Distinguish AI-composed quests from manually-added ones, so the Daily
-- Composer's once-per-day guard doesn't false-positive on a manually
-- created daily quest.
alter table public.quests
  add column source text not null default 'manual' check (source in ('manual', 'composer'));
