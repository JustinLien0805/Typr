create table if not exists user_question_stats (
  user_id uuid not null references users(id) on delete cascade,
  question_id text not null,
  attempts integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  last_attempt_at timestamptz,
  last_correct boolean,
  avg_response_time_ms integer,
  primary key (user_id, question_id)
);

create index if not exists idx_user_question_stats_last_attempt
  on user_question_stats (user_id, last_attempt_at desc);
