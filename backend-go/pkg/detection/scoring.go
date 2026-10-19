package detection

type ThreatScoreInput struct {
	CanaryTriggered           bool
	RansomNotesCount          int
	RansomwareExtensionsCount int
	EntropyTriggered          bool
	HighEntropyFilesCount     int
	MeanEntropy               float64
	ShadowCopyTampering       bool
	ChangeRate                float64
	RansomwareRate            float64
	SuspiciousRate            float64
	IsAllowlisted             bool
}

type ThreatScoreResult struct {
	RiskScore       int      `json:"risk_score"`
	ThreatLevel     string   `json:"threat_level"` // LOW, MEDIUM, HIGH, CRITICAL
	Confidence      float64  `json:"confidence"`
	MitreTechniques []string `json:"mitre_techniques"`
	Indicators      []string `json:"indicators"`
}

// ComputeThreatScore evaluates multi-vector threat signals into a 0-100 enterprise risk score
func ComputeThreatScore(in ThreatScoreInput) ThreatScoreResult {
	if in.IsAllowlisted {
		return ThreatScoreResult{
			RiskScore:       0,
			ThreatLevel:     "LOW",
			Confidence:      0.95,
			MitreTechniques: []string{},
			Indicators:      []string{"account_allowlisted"},
		}
	}

	score := 0
	var techniques []string
	var indicators []string

	if in.CanaryTriggered {
		score += 40
		indicators = append(indicators, "canary_tripwire_triggered")
		techniques = append(techniques, "T1083:File and Directory Discovery")
	}

	if in.RansomNotesCount > 0 {
		score += 35
		indicators = append(indicators, "ransom_note_dropped")
		techniques = append(techniques, "T1486:Data Encrypted for Impact")
	}

	if in.RansomwareExtensionsCount > 0 {
		score += 35
		indicators = append(indicators, "ransomware_file_extension_detected")
		techniques = append(techniques, "T1486:Data Encrypted for Impact")
	}

	if in.ShadowCopyTampering {
		score += 35
		indicators = append(indicators, "shadow_copy_tampering")
		techniques = append(techniques, "T1490:Inhibit System Recovery")
	}

	if in.EntropyTriggered || in.HighEntropyFilesCount >= 2 {
		score += 30
		indicators = append(indicators, "shannon_entropy_encryption_detected")
		techniques = append(techniques, "T1486:Data Encrypted for Impact")
	}

	if in.ChangeRate >= in.RansomwareRate && in.RansomwareRate > 0 {
		score += 35
		indicators = append(indicators, "mass_file_modification_rate_exceeded")
	} else if in.ChangeRate >= in.SuspiciousRate && in.SuspiciousRate > 0 {
		score += 15
		indicators = append(indicators, "elevated_file_modification_rate")
	}

	if score > 100 {
		score = 100
	}

	threatLevel := "LOW"
	if score >= 80 {
		threatLevel = "CRITICAL"
	} else if score >= 60 {
		threatLevel = "HIGH"
	} else if score >= 30 {
		threatLevel = "MEDIUM"
	}

	confidence := 0.50
	if in.CanaryTriggered || in.RansomNotesCount > 0 || in.RansomwareExtensionsCount > 0 {
		confidence = 0.98
	} else if in.EntropyTriggered && in.ChangeRate >= in.SuspiciousRate {
		confidence = 0.92
	} else if in.ChangeRate >= in.RansomwareRate {
		confidence = 0.85
	}

	// Deduplicate MITRE techniques
	uniqueTechMap := make(map[string]bool)
	var uniqueTechs []string
	for _, t := range techniques {
		if !uniqueTechMap[t] {
			uniqueTechMap[t] = true
			uniqueTechs = append(uniqueTechs, t)
		}
	}

	return ThreatScoreResult{
		RiskScore:       score,
		ThreatLevel:     threatLevel,
		Confidence:      confidence,
		MitreTechniques: uniqueTechs,
		Indicators:      indicators,
	}
}
