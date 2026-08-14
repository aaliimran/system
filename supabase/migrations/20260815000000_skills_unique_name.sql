-- Dedupe existing skill rows before enforcing uniqueness (case-insensitive
-- per user), then guarantee it going forward at the DB layer so no retry/
-- double-click path can ever create a duplicate again.
delete from public.skills a
using public.skills b
where a.user_id = b.user_id
  and lower(a.name) = lower(b.name)
  and a.created_at > b.created_at;

create unique index skills_user_name_unique on public.skills (user_id, lower(name));
