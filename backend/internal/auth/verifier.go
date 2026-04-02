package auth

import (
	"context"
	"errors"
)

var ErrMissingVerifier = errors.New("auth verifier not configured")

type Verifier interface {
	VerifyIDToken(ctx context.Context, idToken string) (Claims, error)
}

type NoopVerifier struct{}

func (NoopVerifier) VerifyIDToken(context.Context, string) (Claims, error) {
	return Claims{}, ErrMissingVerifier
}
