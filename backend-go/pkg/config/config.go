package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                   int
	APIKey                 string
	ValidAPIKeys           []string
	StorageProvider        string
	LocalStoragePath       string
	DataDir                string
	QuarantineDir          string
	WindowSeconds          int
	SuspiciousRate         float64
	RansomwareRate         float64
	EntropyThreshold       float64
	MinRiskScoreSuspicious int
	MinRiskScoreRansomware int
	AllowlistedAccounts    []string
	EnableNoiseFilter      bool
	BackupMasterKeyHex     string
}

func Load() *Config {
	port := 4455
	if pStr := os.Getenv("PORT"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil && p > 0 {
			port = p
		}
	}

	apiKey := os.Getenv("API_KEY")
	if apiKey == "" {
		apiKey = "dev-secret-key-12345"
	}

	validKeys := []string{apiKey, "cloudrdr-default-key-2026", "dev-secret-key-12345"}
	if extra := os.Getenv("VALID_API_KEYS"); extra != "" {
		for _, k := range strings.Split(extra, ",") {
			k = strings.TrimSpace(k)
			if k != "" {
				validKeys = append(validKeys, k)
			}
		}
	}

	windowSec := 60
	if ws := os.Getenv("WINDOW_SECONDS"); ws != "" {
		if w, err := strconv.Atoi(ws); err == nil && w > 0 {
			windowSec = w
		}
	}

	suspiciousRate := 0.20
	if sr := os.Getenv("SUSPICIOUS_RATE"); sr != "" {
		if s, err := strconv.ParseFloat(sr, 64); err == nil {
			suspiciousRate = s
		}
	}

	ransomwareRate := 0.50
	if rr := os.Getenv("RANSOMWARE_RATE"); rr != "" {
		if r, err := strconv.ParseFloat(rr, 64); err == nil {
			ransomwareRate = r
		}
	}

	entropyThreshold := 7.20
	if et := os.Getenv("ENTROPY_THRESHOLD"); et != "" {
		if e, err := strconv.ParseFloat(et, 64); err == nil {
			entropyThreshold = e
		}
	}

	storageProvider := os.Getenv("STORAGE_PROVIDER")
	if storageProvider == "" {
		storageProvider = "local"
	}

	localPath := os.Getenv("LOCAL_STORAGE_PATH")
	if localPath == "" {
		localPath = "./data/local-storage"
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}

	quarantineDir := os.Getenv("QUARANTINE_DIR")
	if quarantineDir == "" {
		quarantineDir = "./data/quarantine"
	}

	allowlist := []string{"backup-service", "migration-agent", "ci-builder"}
	if al := os.Getenv("ALLOWLISTED_ACCOUNTS"); al != "" {
		for _, acc := range strings.Split(al, ",") {
			acc = strings.TrimSpace(acc)
			if acc != "" {
				allowlist = append(allowlist, acc)
			}
		}
	}

	return &Config{
		Port:                   port,
		APIKey:                 apiKey,
		ValidAPIKeys:           validKeys,
		StorageProvider:        storageProvider,
		LocalStoragePath:       localPath,
		DataDir:                dataDir,
		QuarantineDir:          quarantineDir,
		WindowSeconds:          windowSec,
		SuspiciousRate:         suspiciousRate,
		RansomwareRate:         ransomwareRate,
		EntropyThreshold:       entropyThreshold,
		MinRiskScoreSuspicious: 30,
		MinRiskScoreRansomware: 70,
		AllowlistedAccounts:    allowlist,
		EnableNoiseFilter:      true,
		BackupMasterKeyHex:     os.Getenv("BACKUP_ENCRYPTION_KEY"),
	}
}
