package restore

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"cloudrdr-backend/pkg/adapters/db"
	"cloudrdr-backend/pkg/adapters/storage"
	"cloudrdr-backend/pkg/audit"
	"cloudrdr-backend/pkg/crypto"
	"cloudrdr-backend/pkg/models"
	"cloudrdr-backend/pkg/response"
)

type RestoreSummary struct {
	JobID         string               `json:"job_id"`
	IncidentID    string               `json:"incident_id"`
	Bucket        string               `json:"bucket"`
	Status        string               `json:"status"` // completed, staged, failed
	TotalFiles    int                  `json:"total_files"`
	ValidFiles    int                  `json:"valid_files"`
	ModifiedFiles int                  `json:"modified_files"`
	MissingFiles  int                  `json:"missing_files"`
	Results       []FileRestoreReport  `json:"results"`
}

type FileRestoreReport struct {
	Path           string       `json:"path"`
	Status         VerifyStatus `json:"status"`
	ExpectedSHA256 string       `json:"expected_sha256"`
	ObservedSHA256 string       `json:"observed_sha256"`
	AeadVerified   bool         `json:"aead_verified"`
	SizeBytes      int          `json:"size_bytes"`
}

type RestoreOptions struct {
	StageOnly        bool
	ApplyImmediately bool
	QuarantineDir    string
	BackupDir        string
}

// StartRestore executes quarantine recovery, AEAD validation, and promotion to live storage
func StartRestore(
	incidentID string,
	opts RestoreOptions,
	store *db.MemoryStore,
	storageAdapter *storage.LocalStorage,
) (*RestoreSummary, error) {
	inc := store.GetIncident(incidentID)
	if inc == nil {
		return nil, fmt.Errorf("incident not found: %s", incidentID)
	}

	bucket := inc.Bucket
	if bucket == "" {
		bucket = "protected"
	}

	targetPaths := inc.AffectedPaths
	if len(targetPaths) == 0 {
		// Delta scan fallback: inspect all baseline files
		allProtected := store.GetProtectedFiles(bucket)
		for _, pf := range allProtected {
			raw, err := storageAdapter.Read(bucket, pf.Path)
			if err != nil || crypto.HashBytes(raw) != pf.BaselineSHA256 {
				targetPaths = append(targetPaths, pf.Path)
			}
		}
	}

	// Update status to restoring
	_, _ = store.UpdateIncidentStatus(incidentID, "restoring", nil)

	jobID := fmt.Sprintf("job-restore-%s-%d", incidentID[:8], time.Now().Unix())
	job := models.RestoreJob{
		ID:            jobID,
		IncidentID:    incidentID,
		Status:        "running",
		TotalFiles:    len(targetPaths),
		StartedAt:     time.Now().UTC(),
	}

	store.Lock()
	store.RestoreJobs = append(store.RestoreJobs, job)
	store.Unlock()

	var reports []FileRestoreReport
	validCount := 0
	modifiedCount := 0
	missingCount := 0

	quarantineIncidentDir := filepath.Join(opts.QuarantineDir, incidentID)
	_ = os.MkdirAll(quarantineIncidentDir, 0755)

	baselineMap := make(map[string]string)
	for _, pf := range store.GetProtectedFiles(bucket) {
		baselineMap[pf.Path] = pf.BaselineSHA256
	}

	type stagedPayload struct {
		path  string
		bytes []byte
	}
	var stagedList []stagedPayload

	for _, relPath := range targetPaths {
		expectedSHA := baselineMap[relPath]
		backupFile := filepath.Join(opts.BackupDir, bucket, relPath+".crdr")

		encBytes, err := os.ReadFile(backupFile)
		if err != nil {
			reports = append(reports, FileRestoreReport{
				Path:           relPath,
				Status:         StatusMissing,
				ExpectedSHA256: expectedSHA,
			})
			missingCount++
			continue
		}

		plain, aeadOk, err := crypto.DecryptAES256GCM(encBytes, crypto.MetadataAAD{
			Bucket:     bucket,
			Path:       relPath,
			VersionRef: "v1", // fallback/dynamic version ref
		})

		vRes := VerifyFileBytes(plain, expectedSHA, aeadOk)
		reports = append(reports, FileRestoreReport{
			Path:           relPath,
			Status:         vRes.Status,
			ExpectedSHA256: vRes.ExpectedSHA256,
			ObservedSHA256: vRes.ObservedSHA256,
			AeadVerified:   vRes.AeadVerified,
			SizeBytes:      vRes.SizeBytes,
		})

		if vRes.Status == StatusValid {
			validCount++
			// Stage in quarantine
			qPath := filepath.Join(quarantineIncidentDir, relPath)
			_ = os.MkdirAll(filepath.Dir(qPath), 0755)
			_ = os.WriteFile(qPath, plain, 0600)

			stagedList = append(stagedList, stagedPayload{
				path:  relPath,
				bytes: plain,
			})
		} else {
			modifiedCount++
		}
	}

	finalStatus := "completed"
	now := time.Now().UTC()

	if !opts.StageOnly && opts.ApplyImmediately && validCount > 0 {
		for _, s := range stagedList {
			_ = storageAdapter.Write(bucket, s.path, s.bytes)
		}
		log.Printf("[+] restoreService: promoted %d verified files from quarantine to live storage", validCount)

		// Resolve incident and lift freeze
		resolvedAt := time.Now().UTC()
		_, _ = store.UpdateIncidentStatus(incidentID, "resolved", map[string]interface{}{
			"resolved_at": &resolvedAt,
		})
		_ = response.UnfreezeAccount(inc.AccountID, filepath.Join(storageAdapter.BasePath(), bucket))

		// Audit ledger
		ledger := audit.GetDefaultLedger()
		_, _ = ledger.Append(map[string]interface{}{
			"event":      "incident_resolved",
			"incidentId": incidentID,
			"validFiles": validCount,
			"jobId":      jobID,
		})
	} else if opts.StageOnly {
		finalStatus = "staged"
	}

	// Update restore job
	store.Lock()
	for i, j := range store.RestoreJobs {
		if j.ID == jobID {
			store.RestoreJobs[i].Status = finalStatus
			store.RestoreJobs[i].ValidFiles = validCount
			store.RestoreJobs[i].ModifiedFiles = modifiedCount
			store.RestoreJobs[i].CompletedAt = &now
			break
		}
	}
	store.Unlock()
	_ = store.Save()

	return &RestoreSummary{
		JobID:         jobID,
		IncidentID:    incidentID,
		Bucket:        bucket,
		Status:        finalStatus,
		TotalFiles:    len(targetPaths),
		ValidFiles:    validCount,
		ModifiedFiles: modifiedCount,
		MissingFiles:  missingCount,
		Results:       reports,
	}, nil
}
