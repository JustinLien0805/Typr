package auth

import (
	"errors"
	"net/http"
	"strings"

	"typr/backend/internal/users"
)

var ErrMissingBearerToken = errors.New("missing bearer token")

func Middleware(verifier Verifier, repo users.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, err := bearerTokenFromHeader(r.Header.Get("Authorization"))
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := verifier.VerifyIDToken(r.Context(), token)
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			user, err := repo.FindOrCreateByFirebase(r.Context(), claims.FirebaseUID, claims.Email, claims.DisplayName)
			if err != nil {
				http.Error(w, "failed to load user", http.StatusInternalServerError)
				return
			}

			authCtx := Context{
				Claims: claims,
				User: AppUser{
					ID:          user.ID,
					FirebaseUID: user.FirebaseUID,
					Email:       user.Email,
					DisplayName: user.DisplayName,
				},
			}

			next.ServeHTTP(w, r.WithContext(WithContext(r.Context(), authCtx)))
		})
	}
}

func bearerTokenFromHeader(value string) (string, error) {
	if value == "" {
		return "", ErrMissingBearerToken
	}
	parts := strings.SplitN(value, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", ErrMissingBearerToken
	}
	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", ErrMissingBearerToken
	}
	return token, nil
}
