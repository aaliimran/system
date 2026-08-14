-- Achievement catalog seed. Trigger thresholds documented in
-- CLAUDE.md "Resolved Design Decisions #10"; detection logic lives in app code.
insert into public.achievements_catalog (key, name, description, hidden, criteria) values
  ('comeback', 'Comeback', 'Returned after a break with zero misses in the new attempt.', true,
    '{"inactive_days_min": 3, "followed_by_days": 3, "completion_rate": 1.0}'),
  ('polymath', 'Polymath', 'Leveled up skills in 3+ different categories in one week.', true,
    '{"categories_min": 3, "window_days": 7}'),
  ('plateau_breaker', 'Plateau Breaker', 'Broke a personal record after weeks of no progress in that skill.', true,
    '{"quiet_days_min": 21}'),
  ('night_before', 'Night Before', 'Completed all daily quests the day before a big event.', true,
    '{"relative_to": "main_quest_milestone_due_date"}');
