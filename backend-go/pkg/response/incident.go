package response

import (
	"fmt"
	"log"
	"time"

	"cloudrdr-backend/pkg/adapters/db"
	"cloudrdr-backend/pkg/audit"
	"cloudrdr-backend/pkg/crypto"
	"cloudrdr-backend/pkg/detection"
	"cloudrdr-backend/pkg/models"
)

// HandleRansomwareVerdict orchestrates automated incident creation, dual-layer containment, and digital signing
func HandleRansomwareVerdict(
	eval detection.EvaluationResult,
	bucket string,
	localWatchPath string,
	store *db.MemoryStore,
) (*models.Incident, error) {
	log.Printf("[!] responseService: handling ransomware verdict for account [%s]", eval.AccountID)

	active, _ := store.FindActiveIncident(eval.AccountID)
	var inc *models.Incident

	if active != nil {
		pathSet := make(map[string]bool)
		for _, p := range active.AffectedPaths {
			pathSet[p] = true
		}
		for _, p := range eval.AffectedPaths {
			pathSet[p] = true
		}

		var merged []string
		for p := range pathSet {
			merged = append(merged, p)
		}

		updated, err := store.UpdateIncidentStatus(active.ID, active.Status, map[string]interface{}{
			"affected_paths": merged,
		})
		if err == nil && updated != nil {
			inc = updated
		} else {
			inc = active
		}
		log.Printf("[*] responseService: consolidated %d paths into active incident [%s]", len(merged), inc.ID)
	} else {
		newID := fmt.Sprintf("inc-%s-%d", eval.AccountID, time.Now().Unix())
		now := time.Now().UTC()
		created, err := store.CreateIncident(models.Incident{
			ID:             newID,
			DetectionRunID: fmt.Sprintf("dr-%d", time.Now().UnixNano()),
			AccountID:      eval.AccountID,
			Bucket:         bucket,
			Status:         "open",
			AffectedPaths:  eval.AffectedPaths,
			DetectedAt:     now,
			CreatedAt:      now,
			UpdatedAt:      now,
		})
		if err != nil {
			return nil, err
		}
		inc = &created
	}

	// 2. Perform Dual-Layer Freeze (OS + IAM)
	frozen, frozenAt := FreezeAccount(eval.AccountID, localWatchPath)
	status := "frozen"
	if !frozen {
		status = "freeze_failed"
	}

	// 3. Package Record JSON
	recordPayload := map[string]interface{}{
		"incidentId":    inc.ID,
		"accountId":     inc.AccountID,
		"bucket":        bucket,
		"affectedPaths": inc.AffectedPaths,
		"detectedAt":    inc.DetectedAt.Format(time.RFC3339),
		"frozenAt":      frozenAt.Format(time.RFC3339),
		"freezeStatus":  status,
		"riskScore":     eval.RiskScore,
		"threatLevel":   eval.ThreatLevel,
		"confidence":    eval.Confidence,
	}

	// 4. Ed25519 Digital Signature
	sig, keyID, _, err := crypto.SignRecord(recordPayload)
	if err != nil {
		log.Printf("[!] responseService: failed to sign incident record: %v", err)
	}

	// 5. Append to Hash-Chained Audit Ledger
	ledger := audit.GetDefaultLedger()
	_, _ = ledger.Append(map[string]interface{}{
		"event":      "incident_created",
		"incidentId": inc.ID,
		"status":     status,
		"signature":  sig,
		"keyId":      keyID,
		"record":     recordPayload,
	})

	// 6. Update Incident with Signature and Frozen status
	updated, _ := store.UpdateIncidentStatus(inc.ID, status, map[string]interface{}{
		"frozen_at":        &frozenAt,
		"record_signature": sig,
		"signing_key_id":   keyID,
	})

	if updated != nil {
		inc = updated
	}

	log.Printf("[+] responseService: incident [%s] secured and sealed with Ed25519 (Key: %s, SigLen: %d)", inc.ID, keyID, len(sig))

	return inc, nil
}
