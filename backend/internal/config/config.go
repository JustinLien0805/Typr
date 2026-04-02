package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port                  string
	RedisAddr             string
	DatabaseURL           string
	AllowedOrigins        []string
	FirebaseProjectID     string
	FirebaseCredentialsFile string
}

func Load() Config {
	return Config{
		Port:                    envOrDefault("PORT", "8080"),
		RedisAddr:               os.Getenv("REDIS_ADDR"),
		DatabaseURL:             os.Getenv("DATABASE_URL"),
		AllowedOrigins:          splitCSVEnv("ALLOWED_ORIGINS"),
		FirebaseProjectID:       os.Getenv("FIREBASE_PROJECT_ID"),
		FirebaseCredentialsFile: os.Getenv("FIREBASE_CREDENTIALS_FILE"),
	}
}

func (c Config) ListenAddr() string {
	return fmt.Sprintf(":%s", c.Port)
}

func (c Config) Validate() error {
	switch {
	case c.RedisAddr == "":
		return errors.New("REDIS_ADDR is required")
	case c.DatabaseURL == "":
		return errors.New("DATABASE_URL is required")
	default:
		return nil
	}
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func splitCSVEnv(key string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}
