package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port        string
	RedisAddr   string
	DatabaseURL string
}

func Load() Config {
	return Config{
		Port:        envOrDefault("PORT", "8080"),
		RedisAddr:   envOrDefault("REDIS_ADDR", "localhost:6379"),
		DatabaseURL: envOrDefault("DATABASE_URL", "postgres://typr:typr@localhost:5432/typr?sslmode=disable"),
	}
}

func (c Config) ListenAddr() string {
	return fmt.Sprintf(":%s", c.Port)
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
