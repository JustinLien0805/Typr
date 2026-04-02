package auth

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	fbauth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"

	"typr/backend/internal/config"
)

type FirebaseVerifier struct {
	client *fbauth.Client
}

func NewFirebaseVerifier(ctx context.Context, cfg config.Config) (*FirebaseVerifier, error) {
	if cfg.FirebaseCredentialsFile == "" {
		return nil, ErrMissingVerifier
	}

	appConfig := &firebase.Config{}
	if cfg.FirebaseProjectID != "" {
		appConfig.ProjectID = cfg.FirebaseProjectID
	}

	app, err := firebase.NewApp(ctx, appConfig, option.WithCredentialsFile(cfg.FirebaseCredentialsFile))
	if err != nil {
		return nil, fmt.Errorf("initialize firebase app: %w", err)
	}

	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("initialize firebase auth client: %w", err)
	}

	return &FirebaseVerifier{client: client}, nil
}

func (v *FirebaseVerifier) VerifyIDToken(ctx context.Context, idToken string) (Claims, error) {
	token, err := v.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		return Claims{}, err
	}

	claims := Claims{
		FirebaseUID: token.UID,
	}
	if email, ok := token.Claims["email"].(string); ok {
		claims.Email = email
	}
	if name, ok := token.Claims["name"].(string); ok {
		claims.DisplayName = name
	}
	return claims, nil
}
