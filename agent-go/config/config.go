package config

import (
	"flag"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds runtime options for the CloudRDR Agent.
type Config struct {
	ManagerURL        string
	AgentKey          string
	WatchDir          string
	Bucket            string
	AccountId         string
	HeartbeatInterval time.Duration
	PollInterval      time.Duration
	EntropyThreshold  float64
	CanaryPatterns    []string
	SpoolDir          string
	MaxBatchSize      int
}

// Load loads configuration from environment variables and CLI flags.
func Load() *Config {
	cfg := &Config{
		ManagerURL:        getEnv("CLOUDRDR_MANAGER_URL", "http://localhost:3000"),
		AgentKey:          getEnv("CLOUDRDR_AGENT_KEY", ""),
		WatchDir:          getEnv("CLOUDRDR_WATCH_DIR", "./data/protected"),
		Bucket:            getEnv("CLOUDRDR_BUCKET", "protected"),
		AccountId:         getEnv("CLOUDRDR_ACCOUNT_ID", "default-account"),
		HeartbeatInterval: time.Duration(getEnvInt("CLOUDRDR_HEARTBEAT_SEC", 10)) * time.Second,
		PollInterval:      time.Duration(getEnvInt("CLOUDRDR_POLL_INTERVAL_SEC", 3)) * time.Second,
		EntropyThreshold:  getEnvFloat("CLOUDRDR_ENTROPY_THRESHOLD", 7.2),
		CanaryPatterns:    strings.Split(getEnv("CLOUDRDR_CANARY_PATTERNS", ".canary,.sentinel,canary_,!trap"), ","),
		SpoolDir:          getEnv("CLOUDRDR_SPOOL_DIR", "./data/spool"),
		MaxBatchSize:      getEnvInt("CLOUDRDR_MAX_BATCH_SIZE", 50),
	}

	// CLI Flags override environment variables
	flag.StringVar(&cfg.ManagerURL, "manager", cfg.ManagerURL, "CloudRDR Manager base URL")
	flag.StringVar(&cfg.WatchDir, "watch", cfg.WatchDir, "Directory path to monitor")
	flag.StringVar(&cfg.Bucket, "bucket", cfg.Bucket, "Protected storage bucket name")
	flag.StringVar(&cfg.AccountId, "account", cfg.AccountId, "Cloud account ID")
	flag.Float64Var(&cfg.EntropyThreshold, "entropy", cfg.EntropyThreshold, "Shannon entropy threshold (0.0 - 8.0)")
	flag.StringVar(&cfg.SpoolDir, "spool", cfg.SpoolDir, "Local offline spool directory")

	flag.Parse()

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvFloat(key string, defaultVal float64) float64 {
	if val := os.Getenv(key); val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return defaultVal
}
