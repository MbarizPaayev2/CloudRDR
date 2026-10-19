package detection

import (
	"strings"

	"cloudrdr-backend/pkg/models"
)

var shadowCopySignatures = []string{
	"vssadmin delete shadows",
	"vssadmin.exe delete shadows",
	"wmic shadowcopy delete",
	"wbadmin delete catalog",
	"bcdedit /set {default} recoveryenabled no",
	"bcdedit /set {default} bootstatuspolicy ignoreallfailures",
}

type ProcessResult struct {
	ShadowCopyTampering        bool
	SuspiciousProcessTriggered bool
	ProcessAnomalies           []string
}

// ScanProcessAnomalies checks command lines and process paths for ransomware defense evasion
func ScanProcessAnomalies(events []models.ChangeEvent) ProcessResult {
	var anomalies []string
	shadowTampering := false

	for _, e := range events {
		cmd := strings.ToLower(e.CommandLine)
		if cmd == "" {
			continue
		}

		for _, sig := range shadowCopySignatures {
			if strings.Contains(cmd, sig) {
				shadowTampering = true
				anomalies = append(anomalies, e.CommandLine)
				break
			}
		}
	}

	return ProcessResult{
		ShadowCopyTampering:        shadowTampering,
		SuspiciousProcessTriggered: shadowTampering || len(anomalies) > 0,
		ProcessAnomalies:           anomalies,
	}
}
