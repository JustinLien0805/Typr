package learning

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionAttempt struct {
	QuestionID        string
	CategoryID        string
	AnsweredAt        time.Time
	ResponseTimeMS    int
	IsCorrect         bool
	SelectedOptionIDs []string
}

type SaveSessionInput struct {
	UserID         string
	Mode           string
	Source         string
	StartedAt      time.Time
	CompletedAt    time.Time
	DurationSec    int
	TotalQuestions int
	CorrectAnswers int
	Accuracy       float64
	Attempts       []SessionAttempt
}

type Repository interface {
	SaveSession(ctx context.Context, input SaveSessionInput) (string, error)
	ListSessionsByUser(ctx context.Context, userID string, limit int) ([]HistorySession, error)
	ListWeakAreasByUser(ctx context.Context, userID string, limit int) ([]WeakArea, error)
	ListCategoryAccuracyByUser(ctx context.Context, userID string) ([]CategoryAccuracy, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

type HistorySession struct {
	ID             string
	Date           time.Time
	TotalScore     int
	TotalQuestions int
	TotalTimeMS    int
}

type WeakArea struct {
	QuestionID        string
	CategoryID        string
	Attempts          int
	CorrectCount      int
	IncorrectCount    int
	Accuracy          float64
	LastAttemptAt     time.Time
	LastCorrect       bool
	AvgResponseTimeMS int
}

type CategoryAccuracy struct {
	CategoryID string
	Correct    int
	Total      int
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) SaveSession(ctx context.Context, input SaveSessionInput) (string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var sessionID string
	err = tx.QueryRow(ctx, `
		insert into learning_sessions (
			user_id, mode, source, started_at, completed_at, duration_sec,
			total_questions, correct_answers, accuracy
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		returning id
	`,
		input.UserID,
		input.Mode,
		input.Source,
		input.StartedAt,
		input.CompletedAt,
		input.DurationSec,
		input.TotalQuestions,
		input.CorrectAnswers,
		input.Accuracy,
	).Scan(&sessionID)
	if err != nil {
		return "", err
	}

	for _, attempt := range input.Attempts {
		selectedJSON, err := json.Marshal(attempt.SelectedOptionIDs)
		if err != nil {
			return "", err
		}

		_, err = tx.Exec(ctx, `
			insert into session_question_attempts (
				session_id, question_id, category_id, answered_at, response_time_ms,
				is_correct, selected_option_ids
			)
			values ($1, $2, $3, $4, $5, $6, $7::jsonb)
		`,
			sessionID,
			attempt.QuestionID,
			attempt.CategoryID,
			attempt.AnsweredAt,
			attempt.ResponseTimeMS,
			attempt.IsCorrect,
			string(selectedJSON),
		)
		if err != nil {
			return "", err
		}

		_, err = tx.Exec(ctx, `
			insert into user_question_stats (
				user_id, question_id, attempts, correct_count, incorrect_count,
				last_attempt_at, last_correct, avg_response_time_ms
			)
			values (
				$1, $2, 1,
				case when $3 then 1 else 0 end,
				case when $3 then 0 else 1 end,
				$4, $3, $5
			)
			on conflict (user_id, question_id)
			do update set
				attempts = user_question_stats.attempts + 1,
				correct_count = user_question_stats.correct_count + case when excluded.last_correct then 1 else 0 end,
				incorrect_count = user_question_stats.incorrect_count + case when excluded.last_correct then 0 else 1 end,
				last_attempt_at = excluded.last_attempt_at,
				last_correct = excluded.last_correct,
				avg_response_time_ms = (
					(coalesce(user_question_stats.avg_response_time_ms, 0) * user_question_stats.attempts + excluded.avg_response_time_ms)
					/ (user_question_stats.attempts + 1)
				)
		`,
			input.UserID,
			attempt.QuestionID,
			attempt.IsCorrect,
			attempt.AnsweredAt,
			attempt.ResponseTimeMS,
		)
		if err != nil {
			return "", err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}

	return sessionID, nil
}

func (r *PostgresRepository) ListSessionsByUser(ctx context.Context, userID string, limit int) ([]HistorySession, error) {
	if limit <= 0 {
		limit = 20
	}

	rows, err := r.pool.Query(ctx, `
		select id, completed_at, correct_answers, total_questions, duration_sec
		from learning_sessions
		where user_id = $1
		order by completed_at desc nulls last, created_at desc
		limit $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := make([]HistorySession, 0, limit)
	for rows.Next() {
		var session HistorySession
		var completedAt time.Time
		var durationSec int
		if err := rows.Scan(
			&session.ID,
			&completedAt,
			&session.TotalScore,
			&session.TotalQuestions,
			&durationSec,
		); err != nil {
			return nil, err
		}
		session.Date = completedAt
		session.TotalTimeMS = durationSec * 1000
		sessions = append(sessions, session)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return sessions, nil
}

func (r *PostgresRepository) ListWeakAreasByUser(ctx context.Context, userID string, limit int) ([]WeakArea, error) {
	if limit <= 0 {
		limit = 5
	}

	rows, err := r.pool.Query(ctx, `
		select
			uqs.question_id,
			coalesce(latest_attempt.category_id, ''),
			uqs.attempts,
			uqs.correct_count,
			uqs.incorrect_count,
			case
				when uqs.attempts > 0 then round((uqs.correct_count::numeric * 100.0) / uqs.attempts, 2)
				else 0
			end as accuracy,
			coalesce(uqs.last_attempt_at, now()),
			coalesce(uqs.last_correct, false),
			coalesce(uqs.avg_response_time_ms, 0)
		from user_question_stats uqs
		left join lateral (
			select sqa.category_id
			from session_question_attempts sqa
			join learning_sessions ls on ls.id = sqa.session_id
			where ls.user_id = uqs.user_id
			  and sqa.question_id = uqs.question_id
			order by sqa.answered_at desc
			limit 1
		) latest_attempt on true
		where uqs.user_id = $1
		  and uqs.attempts > 0
		order by
			case
				when uqs.attempts >= 2 then 0
				else 1
			end asc,
			case
				when uqs.attempts > 0 then uqs.correct_count::float8 / uqs.attempts
				else 1
			end asc,
			uqs.incorrect_count desc,
			uqs.last_attempt_at desc nulls last
		limit $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	weakAreas := make([]WeakArea, 0, limit)
	for rows.Next() {
		var area WeakArea
		if err := rows.Scan(
			&area.QuestionID,
			&area.CategoryID,
			&area.Attempts,
			&area.CorrectCount,
			&area.IncorrectCount,
			&area.Accuracy,
			&area.LastAttemptAt,
			&area.LastCorrect,
			&area.AvgResponseTimeMS,
		); err != nil {
			return nil, err
		}
		weakAreas = append(weakAreas, area)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return weakAreas, nil
}

func (r *PostgresRepository) ListCategoryAccuracyByUser(ctx context.Context, userID string) ([]CategoryAccuracy, error) {
	rows, err := r.pool.Query(ctx, `
		select
			sqa.category_id,
			sum(case when sqa.is_correct then 1 else 0 end) as correct,
			count(*) as total
		from session_question_attempts sqa
		join learning_sessions ls on ls.id = sqa.session_id
		where ls.user_id = $1
		  and sqa.category_id <> ''
		group by sqa.category_id
		order by total desc, sqa.category_id asc
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accuracy := make([]CategoryAccuracy, 0)
	for rows.Next() {
		var item CategoryAccuracy
		if err := rows.Scan(&item.CategoryID, &item.Correct, &item.Total); err != nil {
			return nil, err
		}
		accuracy = append(accuracy, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return accuracy, nil
}
