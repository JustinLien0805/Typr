create table if not exists learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
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

create table if not exists session_question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references learning_sessions(id) on delete cascade,
  question_id text not null,
  category_id text not null,
  answered_at timestamptz,
  response_time_ms integer,
  is_correct boolean not null,
  selected_option_ids jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create index if not exists idx_learning_sessions_user_completed_at
  on learning_sessions (user_id, completed_at desc);

create index if not exists idx_attempts_session_id
  on session_question_attempts (session_id);
