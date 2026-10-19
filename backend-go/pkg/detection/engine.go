package detection

import (
	"math"
	"time"

	"cloudrdr-backend/pkg/config"
	"cloudrdr-backend/pkg/models"
)

type EvaluationParams struct {
	Events              []models.ChangeEvent
	TotalProtectedFiles int
	CanaryPaths         map[string]bool
	AccountID           string
	Config              *config.Config
	Now                 time.Time
}

type EvaluationResult struct {
	AccountID                 string            `json:"account_id"`
	WindowSeconds             int               `json:"window_seconds"`
	TotalFiles                int               `json:"total_files"`
	ChangedFiles              int               `json:"changed_files"`
	ChangeRate                float64           `json:"change_rate"`
	Threshold                 float64           `json:"threshold"`
	CanaryTriggered           bool              `json:"canary_triggered"`
	EntropyTriggered          bool              `json:"entropy_triggered"`
	HeuristicTriggered        bool              `json:"heuristic_triggered"`
	RansomwareExtensionsFound []string          `json:"ransomware_extensions_found"`
	RansomNotesFound          []string          `json:"ransom_notes_found"`
	MeanEntropy               float64           `json:"mean_entropy"`
	HighEntropyFilesCount     int               `json:"high_entropy_files_count"`
	Verdict                   string            `json:"verdict"` // normal, suspicious, ransomware
	AffectedPaths             []string          `json:"affected_paths"`
	IsAllowlisted             bool              `json:"is_allowlisted"`
	RiskScore                 int               `json:"risk_score"`
	ThreatLevel               string            `json:"threat_level"`
	Confidence                float64           `json:"confidence"`
	MitreTechniques           []string          `json:"mitre_techniques"`
	Indicators                []string          `json:"indicators"`
	ShadowCopyTampering       bool              `json:"shadow_copy_tampering"`
	NoiseFilteredCount        int               `json:"noise_filtered_count"`
}

// Evaluate evaluates telemetry events against ransomware detection heuristics
func Evaluate(params EvaluationParams) EvaluationResult {
	cfg := params.Config
	if cfg == nil {
		cfg = config.Load()
	}

	refTime := params.Now
	if refTime.IsZero() {
		refTime = time.Now()
	}

	// 1. Noise Filter
	var effectiveEvents []models.ChangeEvent
	noiseFilteredCount := 0
	if cfg.EnableNoiseFilter {
		effectiveEvents, noiseFilteredCount = FilterNoiseEvents(params.Events, params.CanaryPaths)
	} else {
		effectiveEvents = params.Events
	}

	// 2. Sliding window filter
	windowCutoff := refTime.Add(-time.Duration(cfg.WindowSeconds) * time.Second)
	var windowEvents []models.ChangeEvent
	uniqueChangedMap := make(map[string]bool)
	canaryTriggered := false

	var entropyEvents []models.ChangeEvent
	var highEntropyEvents []models.ChangeEvent
	var entropySum float64

	for _, e := range effectiveEvents {
		if e.ObservedAt.Before(windowCutoff) {
			continue
		}
		windowEvents = append(windowEvents, e)
		uniqueChangedMap[e.Path] = true

		if e.IsCanary || IsCanaryPath(e.Path, params.CanaryPaths) {
			canaryTriggered = true
		}

		if e.Entropy > 0 {
			entropyEvents = append(entropyEvents, e)
			entropySum += e.Entropy
			if e.Entropy >= cfg.EntropyThreshold {
				highEntropyEvents = append(highEntropyEvents, e)
			}
		}
	}

	changedCount := len(uniqueChangedMap)
	var changeRate float64
	if params.TotalProtectedFiles > 0 {
		changeRate = math.Round((float64(changedCount)/float64(params.TotalProtectedFiles))*10000) / 10000
	}

	// 3. Check allowlist
	isAllowlisted := false
	for _, acc := range cfg.AllowlistedAccounts {
		if acc == params.AccountID {
			isAllowlisted = true
			break
		}
	}

	// 4. Entropy analysis
	meanEntropy := 0.0
	if len(entropyEvents) > 0 {
		meanEntropy = math.Round((entropySum/float64(len(entropyEvents)))*100) / 100
	}
	entropyTriggered := len(highEntropyEvents) >= 2 || (changedCount > 0 && float64(len(highEntropyEvents))/float64(changedCount) >= 0.5)

	// 5. Signature & Extension Heuristics
	heuristics := ScanHeuristics(windowEvents)

	// 6. Process Anomaly Scan
	processInfo := ScanProcessAnomalies(windowEvents)

	// 7. Multi-vector threat risk scoring
	threatScore := ComputeThreatScore(ThreatScoreInput{
		CanaryTriggered:           canaryTriggered,
		RansomNotesCount:          len(heuristics.RansomNotesFound),
		RansomwareExtensionsCount: len(heuristics.RansomwareExtensionsFound),
		EntropyTriggered:          entropyTriggered,
		HighEntropyFilesCount:     len(highEntropyEvents),
		MeanEntropy:               meanEntropy,
		ShadowCopyTampering:       processInfo.ShadowCopyTampering,
		ChangeRate:                changeRate,
		RansomwareRate:            cfg.RansomwareRate,
		SuspiciousRate:            cfg.SuspiciousRate,
		IsAllowlisted:             isAllowlisted,
	})

	// 8. Verdict Classification
	verdict := "normal"
	if isAllowlisted {
		verdict = "normal"
	} else if canaryTriggered ||
		processInfo.ShadowCopyTampering ||
		threatScore.RiskScore >= cfg.MinRiskScoreRansomware ||
		(changeRate >= cfg.RansomwareRate && (entropyTriggered || heuristics.HeuristicTriggered)) {
		verdict = "ransomware"
	} else if threatScore.RiskScore >= cfg.MinRiskScoreSuspicious ||
		changeRate >= cfg.SuspiciousRate ||
		heuristics.HeuristicTriggered ||
		entropyTriggered {
		verdict = "suspicious"
	}

	var affectedPaths []string
	for p := range uniqueChangedMap {
		affectedPaths = append(affectedPaths, p)
	}

	return EvaluationResult{
		AccountID:                 params.AccountID,
		WindowSeconds:             cfg.WindowSeconds,
		TotalFiles:                params.TotalProtectedFiles,
		ChangedFiles:              changedCount,
		ChangeRate:                changeRate,
		Threshold:                 cfg.RansomwareRate,
		CanaryTriggered:           canaryTriggered,
		EntropyTriggered:          entropyTriggered,
		HeuristicTriggered:        heuristics.HeuristicTriggered,
		RansomwareExtensionsFound: heuristics.RansomwareExtensionsFound,
		RansomNotesFound:          heuristics.RansomNotesFound,
		MeanEntropy:               meanEntropy,
		HighEntropyFilesCount:     len(highEntropyEvents),
		Verdict:                   verdict,
		AffectedPaths:             affectedPaths,
		IsAllowlisted:             isAllowlisted,
		RiskScore:                 threatScore.RiskScore,
		ThreatLevel:               threatScore.ThreatLevel,
		Confidence:                threatScore.Confidence,
		MitreTechniques:           threatScore.MitreTechniques,
		Indicators:                threatScore.Indicators,
		ShadowCopyTampering:       processInfo.ShadowCopyTampering,
		NoiseFilteredCount:        noiseFilteredCount,
	}
}
