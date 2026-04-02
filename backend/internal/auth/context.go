package auth

import (
	"context"
	"net/http"
)

type contextKey string

const authContextKey contextKey = "auth_context"

func WithContext(ctx context.Context, authCtx Context) context.Context {
	return context.WithValue(ctx, authContextKey, authCtx)
}

func FromContext(ctx context.Context) (Context, bool) {
	value := ctx.Value(authContextKey)
	authCtx, ok := value.(Context)
	return authCtx, ok
}

func MustFromRequest(r *http.Request) (Context, bool) {
	return FromContext(r.Context())
}
