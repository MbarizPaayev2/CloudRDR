package detection

import (
	"testing"
	"time"

	"cloudrdr-backend/pkg/config"
	"cloudrdr-backend/pkg/models"
)

func TestShannonEntropy(t *testing.T) {
	// Low entropy plain text
	lowData := []byte("AAAAAAAAAAABBBBBBBBBBBBCCCCCCCCCCCC")
	lowH := ComputeShannonEntropy(lowData)
	if lowH >= 3.0 {
		t.Errorf("expected low entropy for repetitive text, got %.2f", lowH)
	}

	// Pseudo-random high entropy byte stream
	highData := make([]byte, 256)
	for i := range highData {
		highData[i] = byte(i)
	}
	highH := ComputeShannonEntropy(highData)
	if highH < 7.9 {
		t.Errorf("expected high entropy close to 8.0 for uniform distribution, got %.2f", highH)
	}
}

func TestCanaryPathDetection(t *testing.T) {
	cases := []struct {
		path     string
		isCanary bool
	}{
		{"corporate/finance.xlsx", false},
		{"canary/tripwire_sentinel.docx", true},
		{".canary_bait.pdf", true},
		{"data/sentinel_db.sql", true},
	}

	for _, tc := range cases {
		res := IsCanaryPath(tc.path, nil)
		if res != tc.isCanary {
			t.Errorf("path %s: expected %v, got %v", tc.path, tc.isCanary, res)
		}
	}
}

func TestEvaluateRansomwareVerdict(t *testing.T) {
	cfg := config.Load()
	now := time.Now()

	events := []models.ChangeEvent{
		{
			Path:       "finance/q3.xlsx.locked",
			Entropy:    7.85,
			EventType:  "modified",
			ObservedAt: now,
		},
		{
			Path:       "finance/payroll.csv.locked",
			Entropy:    7.92,
			EventType:  "modified",
			ObservedAt: now,
		},
		{
			Path:       "canary/tripwire_sentinel.docx",
			EventType:  "modified",
			IsCanary:   true,
			ObservedAt: now,
		},
		{
			Path:       "finance/README_RESTORE.txt",
			EventType:  "created",
			ObservedAt: now,
		},
	}

	eval := Evaluate(EvaluationParams{
		Events:              events,
		TotalProtectedFiles: 10,
		CanaryPaths:         map[string]bool{"canary/tripwire_sentinel.docx": true},
		AccountID:           "test-victim-acc",
		Config:              cfg,
		Now:                 now,
	})

	if eval.Verdict != "ransomware" {
		t.Fatalf("expected ransomware verdict, got %s", eval.Verdict)
	}

	if !eval.CanaryTriggered {
		t.Errorf("expected canary to be triggered")
	}

	if eval.RiskScore < 80 {
		t.Errorf("expected critical risk score >= 80, got %d", eval.RiskScore)
	}

	if eval.ThreatLevel != "CRITICAL" {
		t.Errorf("expected CRITICAL threat level, got %s", eval.ThreatLevel)
	}
}
