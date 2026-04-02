package users

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID          string
	FirebaseUID string
	Email       string
	DisplayName string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Repository interface {
	FindByFirebaseUID(ctx context.Context, firebaseUID string) (User, error)
	FindOrCreateByFirebase(ctx context.Context, firebaseUID, email, displayName string) (User, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) FindByFirebaseUID(ctx context.Context, firebaseUID string) (User, error) {
	row := r.pool.QueryRow(ctx, `
		select id, firebase_uid, coalesce(email, ''), coalesce(display_name, ''), created_at, updated_at
		from users
		where firebase_uid = $1
	`, firebaseUID)

	var user User
	err := row.Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.DisplayName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	return user, err
}

func (r *PostgresRepository) FindOrCreateByFirebase(ctx context.Context, firebaseUID, email, displayName string) (User, error) {
	firebaseUID = strings.TrimSpace(firebaseUID)
	if firebaseUID == "" {
		return User{}, errors.New("firebase uid is required")
	}

	row := r.pool.QueryRow(ctx, `
		insert into users (firebase_uid, email, display_name)
		values ($1, nullif($2, ''), nullif($3, ''))
		on conflict (firebase_uid)
		do update set
			email = excluded.email,
			display_name = excluded.display_name,
			updated_at = now()
		returning id, firebase_uid, coalesce(email, ''), coalesce(display_name, ''), created_at, updated_at
	`, firebaseUID, strings.TrimSpace(email), strings.TrimSpace(displayName))

	var user User
	err := row.Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.DisplayName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	return user, err
}

func IsNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
