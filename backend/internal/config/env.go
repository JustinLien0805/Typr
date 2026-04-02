package config

import "github.com/joho/godotenv"

// LoadEnvFiles loads backend-local environment variables for development.
// Missing files are ignored so production environments can rely on real env vars.
func LoadEnvFiles() {
	_ = godotenv.Load(".env")
}
