# Learning Analytics Schema Draft

PostgreSQL schema draft for a typography learning product using:
- Firebase Auth for identity
- PostgreSQL for durable learning data
- Redis for live multiplayer room/game state

This draft is optimized for:
- tracking weak areas
- showing progress over time
- generating personalized review recommendations

It is intentionally not optimized for:
- public leaderboards
- competitive ranking systems

## Design Principles

- Keep auth identity and app identity separate.
- Store both question-level and concept-level learning signals.
- Model durable learning history in PostgreSQL, not Redis.
- Keep multiplayer live state ephemeral in Redis; only persist the final learning outcome.
- Prefer append-only event history for sessions, plus derived summary tables for fast reads.

## Identity Model

### `users`

Application user table. Do not use Firebase UID as the primary key of the whole system.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null unique,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:
- `firebase_uid` maps to Firebase Auth identity.
- `display_name` is app-owned and can later diverge from Firebase profile fields.

## Content Model

### `categories`

High-level learning buckets already reflected in the app.

```sql
create table categories (
  id text primary key,
  name text not null,
  description text
);
```

Examples:
- `classification`
- `anatomy`
- `history`
- `microtypography`

### `concepts`

Knowledge units used for mastery analysis.

```sql
create table concepts (
  id text primary key,
  category_id text not null references categories(id),
  name text not null,
  description text
);
```

Examples:
- `serif`
- `script`
- `monospace`
- `x_height`
- `terminal`

### `questions`

Durable metadata for analyzable questions.

```sql
create table questions (
  id text primary key,
  category_id text not null references categories(id),
  prompt text,
  difficulty smallint,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### `question_concepts`

Many-to-many mapping from questions to concepts.

```sql
create table question_concepts (
  question_id text not null references questions(id) on delete cascade,
  concept_id text not null references concepts(id) on delete cascade,
  weight numeric(4,3) not null default 1.0,
  primary key (question_id, concept_id)
);
```

Notes:
- `weight` allows partial attribution for multi-concept questions.

## Session Model

### `learning_sessions`

One completed practice run, either solo or multiplayer.

```sql
create table learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  mode text not null check (mode in ('solo', 'multiplayer')),
  source text not null check (source in ('web', 'mobile', 'imported')),
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_sec integer,
  total_questions integer not null default 0,
  correct_answers integer not null default 0,
  accuracy numeric(5,2),
  created_at timestamptz not null default now()
);
```

Notes:
- A multiplayer match can produce one `learning_sessions` row per authenticated player.
- This table is learner-centric, not match-centric.

### `session_question_attempts`

Per-question outcome inside one session.

```sql
create table session_question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references learning_sessions(id) on delete cascade,
  question_id text not null references questions(id),
  answered_at timestamptz,
  response_time_ms integer,
  is_correct boolean not null,
  selected_option_ids jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);
```

Notes:
- `selected_option_ids` stays flexible with `jsonb`.
- This is your most important raw learning table.

## Derived Learner State

### `user_question_stats`

Fast lookup of question-level familiarity.

```sql
create table user_question_stats (
  user_id uuid not null references users(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  attempts integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  last_attempt_at timestamptz,
  last_correct boolean,
  avg_response_time_ms integer,
  primary key (user_id, question_id)
);
```

### `user_concept_mastery`

The core table for weak-area analysis and personalized review.

```sql
create table user_concept_mastery (
  user_id uuid not null references users(id) on delete cascade,
  concept_id text not null references concepts(id) on delete cascade,
  attempts integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  mastery_score numeric(5,2) not null default 0,
  confidence_score numeric(5,2) not null default 0,
  last_attempt_at timestamptz,
  last_reviewed_at timestamptz,
  needs_review boolean not null default false,
  primary key (user_id, concept_id)
);
```

Interpretation:
- `mastery_score`: how well the user performs on this concept
- `confidence_score`: how trustworthy that mastery estimate is based on sample size and recency
- `needs_review`: simple boolean for product UI

### `review_recommendations`

Optional materialized recommendation table for cheap reads.

```sql
create table review_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  concept_id text references concepts(id),
  question_id text references questions(id),
  reason text not null,
  priority smallint not null,
  status text not null default 'open' check (status in ('open', 'completed', 'dismissed')),
  generated_at timestamptz not null default now()
);
```

Use this only if recommendation logic becomes expensive; otherwise derive recommendations at read time first.

## Multiplayer Persistence

Redis remains the source of truth for:
- active room membership
- in-progress question state
- reconnect grace periods
- temporary scores during a live match

PostgreSQL should only persist the completed learning outcome.

### `multiplayer_matches`

```sql
create table multiplayer_matches (
  id uuid primary key default gen_random_uuid(),
  room_id text not null unique,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null check (status in ('completed', 'abandoned', 'forfeit'))
);
```

### `multiplayer_match_players`

```sql
create table multiplayer_match_players (
  match_id uuid not null references multiplayer_matches(id) on delete cascade,
  user_id uuid references users(id),
  guest_name text,
  final_score integer not null default 0,
  result text not null check (result in ('win', 'loss', 'draw', 'forfeit', 'abandoned')),
  primary key (match_id, user_id, guest_name)
);
```

Notes:
- `user_id` can be null for guest participants if you keep guest mode.
- This table is useful for session attribution, not ranking.

## Suggested Indexes

```sql
create index idx_learning_sessions_user_completed_at
  on learning_sessions (user_id, completed_at desc);

create index idx_attempts_session_id
  on session_question_attempts (session_id);

create index idx_attempts_question_id
  on session_question_attempts (question_id);

create index idx_user_concept_mastery_needs_review
  on user_concept_mastery (user_id, needs_review, mastery_score asc);

create index idx_review_recommendations_open
  on review_recommendations (user_id, status, priority desc);
```

## First-Phase MVP

If you want the smallest useful schema, build these first:
- `users`
- `categories`
- `concepts`
- `questions`
- `question_concepts`
- `learning_sessions`
- `session_question_attempts`
- `user_question_stats`
- `user_concept_mastery`

Skip for phase 1:
- `review_recommendations`
- `multiplayer_matches`
- `multiplayer_match_players`

## Example Product Queries

Weakest concepts for one user:

```sql
select concept_id, attempts, correct_count, mastery_score, needs_review
from user_concept_mastery
where user_id = $1
order by mastery_score asc, attempts desc
limit 5;
```

Questions most worth reviewing:

```sql
select uqs.question_id, uqs.attempts, uqs.incorrect_count, uqs.last_attempt_at
from user_question_stats uqs
where uqs.user_id = $1
order by uqs.last_correct asc nulls first, uqs.incorrect_count desc, uqs.last_attempt_at desc
limit 10;
```

Recent learning trend:

```sql
select date_trunc('day', completed_at) as day,
       avg(accuracy) as avg_accuracy,
       sum(total_questions) as total_questions
from learning_sessions
where user_id = $1
group by 1
order by 1 desc;
```

## Recommended Scoring Strategy

Start simple:
- question correctness updates `user_question_stats`
- each question attempt updates all linked concepts in `user_concept_mastery`
- initial `mastery_score` can be:
  - `100 * correct_count / nullif(attempts, 0)`
- later, refine with recency weighting:
  - recent attempts count more
  - stale concepts decay toward `needs_review = true`

Do not over-model this at the beginning. A good simple signal is better than a complex opaque one.
