# Migrations

Current migration layout uses plain SQL files in [`backend/migrations`](/Users/justinlien/Desktop/typography/backend/migrations).

## Current files

- `0001_enable_pgcrypto_and_users.up.sql`
- `0001_enable_pgcrypto_and_users.down.sql`
- `0002_learning_sessions.up.sql`
- `0002_learning_sessions.down.sql`
- `0003_user_question_stats.up.sql`
- `0003_user_question_stats.down.sql`

## Local development

Start dependencies first:

```bash
docker compose up -d
```

Apply the first migration with Dockerized Postgres:

```bash
docker compose exec -T postgres psql -U typr -d typr < backend/migrations/0001_enable_pgcrypto_and_users.up.sql
docker compose exec -T postgres psql -U typr -d typr < backend/migrations/0002_learning_sessions.up.sql
docker compose exec -T postgres psql -U typr -d typr < backend/migrations/0003_user_question_stats.up.sql
```

Rollback:

```bash
docker compose exec -T postgres psql -U typr -d typr < backend/migrations/0003_user_question_stats.down.sql
docker compose exec -T postgres psql -U typr -d typr < backend/migrations/0002_learning_sessions.down.sql
docker compose exec -T postgres psql -U typr -d typr < backend/migrations/0001_enable_pgcrypto_and_users.down.sql
```

## Next step

Once auth wiring is in place, the next tables to add should be:

- `user_concept_mastery`
