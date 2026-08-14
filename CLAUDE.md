# Personal Progression System — Project Context

This file is the source of truth for a personal RPG-style life-progression app. Read this fully before writing any code. This is a single-user personal product (built for the owner, "Airim"), architected to be multi-tenant-ready in the future without over-building for that future now.

## Core Philosophy

> "The System reflects you — it doesn't judge you."

The app turns real-life actions (workouts, learning, skill practice) into RPG progression (EXP, Levels, Stats, Skills, Quests). It is not a tracker — it must feel like opening a game, not a to-do list. Emotional payoff (Level Up moments, visible progress) matters more than data completeness. It adapts to the user rather than presenting a generic one-size-fits-all system.

## Target User & Problem

Single user. Generic trackers require the user to supply their own motivation and structure — they store numbers but create no feeling. This app's value: real effort becomes visible, felt, and the system proactively decides what to do next instead of the user planning everything themselves.

## Core Loop

```
Real-life action (workout / CTF / language study / reading)
  -> User logs it (checkbox / short input)
  -> System computes EXP + Skill progress + Stat impact
  -> Feedback moment (progress bar / level up / achievement / debuff)
  -> System regenerates tomorrow's Daily Quests based on trend
  -> (weekly) Weekly Review -> new focus for next week
```
Two nested loops: daily (fast dopamine) and weekly (strategic adaptation).

## RPG Systems

### Stats (5 total — fixed, part of core game design, not user-configurable)
Each must be objectively derivable from real data (no purely subjective self-ratings):
- **STR** (Strength) — gym weights, PRs, body measurements
- **END** (Endurance) — cardio sessions, steps, session duration
- **VIT** (Vitality) — sleep, recovery regularity, wellbeing signals
- **MIND** (Discipline & Focus) — % of quests completed, streak length, consistency
- **INT** (Intelligence) — aggregate of all Skills progress (cyber, languages, math, etc.)

Social/Charisma were deliberately excluded as a stat (too subjective) — they live as **Skills** instead (Public Speaking, Social skills) with concrete measurable actions.

### Levels
- **Character Level**: grows on an increasing curve (more EXP needed per level as you go up), fed by total EXP across all Skills.
- **Skill Level**: own curve per skill, does NOT start at a fake zero — see Onboarding below.
- **Rank titles** (E -> D -> C -> B -> A -> S) layered on top of Level, synced to major milestones rather than linear per-level — creates rare, earned "big moments" rather than constant linear feedback. (Nice-to-have, not MVP.)

### XP System
EXP source and weighting:
- Daily Quest completed -> base EXP set at quest generation
- Personal Record / breakthrough -> rare, large bonus EXP
- Streak multiplier -> grows with streak length, capped (don't let it dominate balance)
- Milestone/Boss completed -> large one-time EXP + full-screen visual moment
- Recovery quest (sleep, rest) -> normal EXP — rest is not penalized, it's equal to training

### Skills (hierarchical: Category -> Skill -> Sub-skill, only where sub-skill detail is actually useful)
```
PHYSICAL
 - Strength Training
 - Cardio
 - Flexibility & Mobility
 - Martial Arts (Taekwondo)

KNOWLEDGE & CRAFT
 - Cybersecurity
    - Web Security
    - Cryptography
    - Reverse Engineering
 - Programming
 - Languages
    - Korean
    - (English/Turkish — maintenance mode, not actively leveled)
 - Mathematics

PERSONAL DEVELOPMENT
 - Reading
 - Public Speaking
 - Video Editing
 - Business/Entrepreneurship
```
Skills are fully user-defined/addable — this part of the system is already user-scoped by design (important for future multi-tenant use). Sub-skills only where real internal variety exists (e.g. Cybersecurity); don't force sub-skills everywhere.

### Quest Types
- **Daily Quest** — system-generated daily tasks
- **Weekly Quest** — bigger goal for the week
- **Main Quest** — long-term goal (weeks/months), e.g. "Reach 60kg"
- **Milestone** — checkpoints inside a Main Quest (earlier taste of triumph)
- **Challenge** — optional stretch quest for bonus EXP when the user has extra capacity
- **Boss** — rare, multi-day intense challenge (e.g. 30-day consistency streak) with real stakes

(Side Quest type was deliberately dropped — it duplicated Challenge.)

### Achievements
Hidden achievements tied to **behavior patterns**, not click-counters. Examples:
- "Comeback" — returned after a long break with zero misses in the new attempt
- "Polymath" — leveled 3+ different skill categories in one week
- "Plateau Breaker" — broke a personal record after 3+ weeks of no progress in that skill
- "Night Before" — completed all daily quests the day before a big event instead of dropping everything

### Failure / Recovery System (critical — do not skip)
- Missed daily quest -> skill does NOT lose level, but gets a temporary **Fatigue debuff** (visually dimmed progress bar), cleared by returning to activity — never retroactive punishment.
- After 3+ full days of inactivity -> system enters **"Re-entry mode"**: increases odds of easy quests on the return day to avoid a wall on comeback.
- Explicit **"Life happened" flag** — user can mark a day/week as excluded (illness, exams): no debuff applied, but no EXP either — honest, not punitive.
- Design intent: penalties are real (they matter) but never retroactively punitive (never claw back progress already earned). This exists specifically to prevent burnout/shame spirals given the user wants strong consequences but is prone to high personal standards.

### AI System — two structured (non-chat) calls, JSON output only
- **Daily Composer**: input = last 14 days of activity, current weekly focus, chosen intensity level -> output = structured JSON list of today's Daily Quests.
- **Weekly Analyst**: input = 7-day aggregates across all stats/skills -> output = JSON with deltas, detected imbalance/plateau, recommended focus for next week.

Prompts must be parameterized per `user_id` context (goals, history, profile) rather than hardcoded to one person — this is what keeps multi-tenant readiness cheap.

### AI Autonomy Model (important constraint — do not build free-form AI code generation)
| Change type | Autonomy level |
|---|---|
| New daily quest / quest content | Full autopilot |
| New skill (inferred from activity outside the defined list) | Proposes -> auto-applies -> user can revert after the fact |
| Dashboard layout/theme (from a pre-built component library only) | Autopilot, user can pin/lock a layout manually |
| New functionality / code changes | AI may only propose + describe; deployment is manual/reviewed — **never** autonomous live code rewriting in production |

This constraint is deliberate: the AI must NOT write/rewrite arbitrary interface code on the fly in production. Instead, "AI adapts the design" is implemented as **constrained generative UI**: the AI selects/arranges from a fixed library of pre-built, tested components and outputs a JSON layout config (which widgets, in what order, which theme/accent) — never arbitrary code. This gives the felt experience of an adaptive app without the stability/security risk of live-generated code.

## Onboarding ("Character Creation")
Must exist before any skill/stat tracking starts. A short RPG-flavored onboarding flow captures real starting baselines per skill (self-assessment + a few objective questions) so Level 1 doesn't falsely imply zero real-world ability (the user already has e.g. C1 English, CTF/bug bounty experience, etc. — starting those at 0% would feel dishonest and demotivating). Also captures chosen system intensity: soft / balanced / hard.

## UX Structure (screens)
1. **Dashboard** — Level + Rank + EXP bar; **radar chart of the 5 Stats** (replaces a plain text summary — normalize each stat to % of current target/ceiling so all axes are comparable); Today's quests (checkable, instant EXP feedback inline); streak; current weekly focus; subtle active-debuff indicator if any. Nothing else — no history graphs, no achievements feed here. This screen is "here and now," not an archive.
2. **Quests** — full list, tabs by type (Daily/Weekly/Main/Challenges/Boss), Main Quest progress bars, manually request a Challenge, set "Life happened" flag.
3. **Stats** — deep dive per stat: 30/90-day graph, which skills/actions feed it (transparency).
4. **Skills** — grouped by category, level bars, add custom skill, tap for history + related quests.
5. **Progress** — Level Up/Rank Up timeline, overall EXP-over-time graph, "then vs now" comparison. (Skill tree visualization is a nice-to-have, NOT MVP — flat progress bars first.)
6. **Achievements** — grid, hidden ones shown as dimmed silhouettes until unlocked.
7. **History / Codex** — auto-generated chronicle of significant events (not a manual journal). Future: usable as raw material for the user's personal-brand content.
8. **Weekly Review** — ritual modal, not a menu tab: stat deltas, detected weakness, recommended focus, "Accept new directive" button.
9. **Profile** — character sheet: avatar/visual rank, overall level, key milestones, physical baseline data.
10. **Settings** — system intensity, skill/quest config management, future integrations.

## Visual Direction: "System" (chosen over "Operator"/Linear-style and "Vitals"/Whoop-style)
90% of the UI is restrained, dark, structural, premium — minimal color, clean typography, no neon/gaming clutter. The remaining ~10% is reserved for rare, fully-deserved moments: a monospace accent font for numbers (Level, EXP, Rank), a subtle glow on progress bars when they update, and a full-screen overlay ONLY at Level Up / Rank Up moments — not persistent. The RPG feeling comes from rare earned moments, not constant visual noise.

## Technical Architecture

- **Frontend**: Next.js + TypeScript + Tailwind CSS, shipped as a PWA (covers both laptop and phone with one codebase; no native app needed).
- **Backend**: Next.js API routes / tRPC — no separate backend service (unnecessary for this scale).
- **Database**: PostgreSQL via Supabase (bundles DB + Auth + realtime, saves significant MVP infra time).
- **Auth**: Supabase Auth, email+password only, no social login, no roles/teams — just a locked door.
- **AI**: Claude API (Anthropic) for Daily Composer and Weekly Analyst, structured JSON output only, no chat history retained between calls.
- **Notifications**: In-app primarily; external push via a Telegram bot (store `telegram_chat_id` per user) rather than Web Push — much less setup friction for a PWA.
- **Analytics**: None needed — no product-analytics tooling; the app's own Stats/Progress screens are the "analytics."
- **Deployment**: Vercel (app) + Supabase Cloud (DB/Auth) + Vercel Cron Jobs (Daily Composer at 00:00, Weekly Review on Sundays) — no separate queue/worker infra.

### Multi-tenant readiness (build in now, cheap; do not retrofit later)
- Every table gets a `user_id` column from day one, even though there's currently one user.
- Supabase **Row Level Security (RLS)** policies scoped by `user_id` enabled from the start.
- AI prompts parameterized by user context (never hardcode "this is Airim" into prompt text/logic).
- `telegram_chat_id` stored per-user in the DB, not as an env var.
- Explicitly NOT built now: public signup/onboarding for other users, billing/subscriptions, admin panel, invite system, marketing site. These are pure feature work layered on top later, not architecture.

### Data Model (core tables)
```
users            -- currently one row; user_id used everywhere else
stats            -- 5 fixed rows per user (STR/END/VIT/MIND/INT), current value + history
skills           -- category, name, level, linked stat(s), user-defined
sub_skills       -- optional, only for skills needing detail (e.g. Cybersecurity)
quests           -- type (daily/weekly/main/milestone/challenge/boss), status, EXP, linked skill
quest_logs       -- history of completions/misses (input for Daily Composer)
achievements     -- catalog + unlocked state + date
codex_entries    -- auto-generated chronicle entries
weekly_reviews   -- saved weekly report snapshots
```
Simple relational schema — no NoSQL/graph DB, not justified at this scale.

## MVP Scope

**MUST HAVE** (core loop — without these it's not the product we designed):
- Onboarding / Character Creation
- 5 Stats + radar chart on Dashboard
- Skills system (custom skills, categories, level bars)
- Daily Quests + Main Quest
- XP/Level system with formula and level-up moment
- Daily Composer (AI)
- Debuff/Recovery system (Fatigue, Re-entry, "Life happened")
- Auth + `user_id`/RLS from day one

**SHOULD HAVE** (valuable, not launch-blocking):
- Weekly Analyst + Weekly Review ritual
- Milestone / Challenge / Boss quest types
- Achievements (incl. hidden ones)
- Telegram notifications
- Intensity setting (soft/balanced/hard) — can hardcode "balanced" at first

**NICE TO HAVE** (defer intentionally):
- Progress screen with Level Up timeline
- Codex/History
- Rank titles (E→S) on top of Level
- Radar chart for skill sub-categories (e.g. Cybersecurity)

**FUTURE** (do not build yet):
- Constrained generative UI (AI adapts layout/theme from component library)
- Any form of AI code-generation workflow
- Third-party integrations (Apple Health, Strava, Calendar, etc.)
- Opening the app to other users (public onboarding, billing, admin)

## Resolved Design Decisions (v1)
These were open questions the original concept left unspecified. Resolved deliberately (per Working Agreement) before build start, rather than left to be decided ad hoc in code. Treat as part of the spec; revise here first if they turn out wrong in practice.

1. **EXP/Level curve**
   - Character Level: `EXP_to_next(N) = round(100 * N^1.5)`, cumulative EXP across all skills.
   - Skill Level: `EXP_to_next(N) = round(50 * N^1.3)` — cheaper per-skill curve since Character EXP already sums across every skill.

2. **Streak multiplier**: `multiplier = min(1 + 0.05 * streak_days, 1.5)` — caps at +50% around a 10-day streak.

3. **Onboarding -> starting Skill Level**: self-assessment 1-5 maps to a base level (1->Lv1, 2->Lv5, 3->Lv10, 4->Lv15, 5->Lv20), nudged ± by objective questions (e.g. CEFR tier for languages). Raw onboarding answers are stored so the mapping can be recalibrated later without re-asking the user.

4. **Stat <- Skill linkage** (the original spec described stats conceptually but not which skills feed which):
   - **STR** <- Strength Training (100%), Martial Arts (50% weight)
   - **END** <- Cardio (100%), Martial Arts (50% weight), Flexibility & Mobility (small weight)
   - **INT** <- weighted aggregate of all skills in Knowledge & Craft + Personal Development (each skill's % of its own soft ceiling, averaged)
   - **MIND** <- NOT skill-derived; computed directly from `quest_logs` (% completion + streak length)
   - **VIT** <- NOT skill-derived; computed directly from sleep/recovery signals via a lightweight daily check-in (own log table, not a skill)

5. **Radar chart ceiling**: floating, not fixed — `ceiling(stat) = 20 + CharacterLevel * 2`. Keeps the radar meaningfully using its full space as the character grows instead of saturating at 100%.

6. **Fatigue debuff mechanics**: skill's progress bar rendered at ~50% opacity, -20% EXP on that skill while active, cleared immediately on the next completed quest tied to that skill (not time-based, not multi-day).

7. **Re-entry mode**: triggered after 3+ full inactive days. Next Daily Composer run for that user: 2 quests instead of the usual intensity-driven count, lowest difficulty tier, at least one quest drawn from the skill with the user's historically highest completion rate (guaranteed early win), Challenge/Boss suggestions suppressed for that day.

8. **Intensity levels** (soft/balanced/hard) — purely quantitative, no other behavior change:
   - soft: 2 quests/day, EXP x0.8
   - balanced: 3 quests/day, EXP x1.0
   - hard: 4 quests/day, EXP x1.2, higher chance of a Challenge being offered

9. **Daily Composer output shape**: quest count set by intensity; exactly one quest always tied to the current weekly focus skill. Base EXP by quest type (before streak multiplier): Daily=20, Weekly=100, Milestone=250, Boss=500. PR/breakthrough bonus = +50% of the action's normal EXP.

10. **Achievement trigger thresholds** (concrete precedent for the four named examples, future achievements should follow this level of specificity):
    - *Comeback*: return after >=3 inactive days, followed by 100% quest completion for the next 3 days.
    - *Polymath*: at least one skill level-up in 3+ different top-level categories within a rolling 7-day window.
    - *Plateau Breaker*: a PR/breakthrough in a skill that had zero PRs in the preceding 21 days.
    - *Night Before*: all daily quests completed on the day before a date flagged via a Main Quest milestone due date.

## Build Order (suggested)
1. Repo scaffold (Next.js + TS + Tailwind + Supabase) + schema/migrations with `user_id`/RLS from the start
2. Onboarding / Character Creation flow
3. Dashboard shell with radar chart (static data first)
4. Skills CRUD + level calculation
5. Daily Quests CRUD + completion flow + EXP feedback
6. XP/Level engine + Level Up moment
7. Daily Composer AI integration (structured JSON prompt)
8. Debuff/Recovery logic
9. Then move into Should Have items

## Working Agreement
- Do not silently agree with every request — flag risks, scope creep, or UX/architecture concerns directly, the way this spec itself was arrived at (several ideas here were deliberately revised after pushback, e.g. penalty design, AI-authored live code was rejected in favor of constrained generative UI).
- If a design/mechanic question comes up during development that isn't covered here, treat it as an open question to resolve deliberately rather than deciding ad hoc in code.
