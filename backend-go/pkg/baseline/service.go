package baseline

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	"cloudrdr-backend/pkg/adapters/db"
	"cloudrdr-backend/pkg/adapters/storage"
	"cloudrdr-backend/pkg/audit"
	"cloudrdr-backend/pkg/crypto"
	"cloudrdr-backend/pkg/detection"
	"cloudrdr-backend/pkg/models"
)

type BaselineResult struct {
	Bucket     string `json:"bucket"`
	Version    int    `json:"version"`
	FileCount  int    `json:"file_count"`
	MerkleRoot string `json:"merkle_root"`
	SnapshotID string `json:"snapshot_id"`
}

// CreateBaseline processes files in storage bucket, encrypts backups, builds Merkle root, and records snapshot
func CreateBaseline(bucket string, storageAdapter *storage.LocalStorage, store *db.MemoryStore, backupDir string) (*BaselineResult, error) {
	log.Printf("[*] baselineService: starting baseline capture for bucket [%s]", bucket)

	entries, err := storageAdapter.List(bucket)
	if err != nil {
		return nil, err
	}

	// Auto-seed if empty
	if len(entries) == 0 {
		defaultPaths := []string{
			"corporate/financials_q3.xlsx",
			"corporate/executive_strategy.pdf",
			"corporate/payroll_records_2026.csv",
			"database/customer_pii_vault.sql",
			"blueprints/patents_cad.dwg",
			"canary/tripwire_sentinel.docx",
		}
		for _, p := range defaultPaths {
			buf := []byte(fmt.Sprintf("CloudRDR Verified Enterprise Asset [%s] — Authentic Baseline Record v1\n", p))
			_ = storageAdapter.Write(bucket, p, buf)
		}
		entries, _ = storageAdapter.List(bucket)
	}

	// Determine next version
	currentVersion := 0
	existing := store.GetProtectedFiles(bucket)
	for _, f := range existing {
		if f.BaselineVersion > currentVersion {
			currentVersion = f.BaselineVersion
		}
	}
	nextVersion := currentVersion + 1

	// Deterministically sort by path
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Path < entries[j].Path
	})

	var protectedFiles []models.ProtectedFile
	var leafHashes []string

	for _, entry := range entries {
		rawBytes, err := storageAdapter.Read(bucket, entry.Path)
		if err != nil {
			log.Printf("[!] baselineService: failed to read %s: %v", entry.Path, err)
			continue
		}

		sha := crypto.HashBytes(rawBytes)
		isCanary := detection.IsCanaryPath(entry.Path, nil)

		leafHashes = append(leafHashes, sha)
		now := time.Now().UTC()

		pf := models.ProtectedFile{
			ID:              fmt.Sprintf("pf-%s-%s-%d", bucket, crypto.HashString(entry.Path)[:12], nextVersion),
			Bucket:          bucket,
			Path:            entry.Path,
			SizeBytes:       entry.Size,
			BaselineSHA256:  sha,
			BaselineVersion: nextVersion,
			IsCanary:        isCanary,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		protectedFiles = append(protectedFiles, pf)

		// Encrypt and store verified backup
		encBytes, err := crypto.EncryptAES256GCM(rawBytes, crypto.MetadataAAD{
			Bucket:     bucket,
			Path:       entry.Path,
			VersionRef: fmt.Sprintf("v%d", nextVersion),
		})
		if err == nil && backupDir != "" {
			destFile := filepath.Join(backupDir, bucket, entry.Path+".crdr")
			_ = os.MkdirAll(filepath.Dir(destFile), 0755)
			_ = os.WriteFile(destFile, encBytes, 0600)
		}
	}

	merkleRoot := crypto.MerkleRoot(leafHashes)
	snapshotID := fmt.Sprintf("snap-%s-v%d-%s", bucket, nextVersion, merkleRoot[:8])

	snapshot := models.BaselineSnapshot{
		ID:         snapshotID,
		Bucket:     bucket,
		MerkleRoot: merkleRoot,
		FileCount:  len(protectedFiles),
		CreatedAt:  time.Now().UTC(),
		CreatedBy:  "cloudrdr-go-core",
	}

	_ = store.UpsertProtectedFiles(protectedFiles)
	store.Lock()
	store.BaselineSnapshots = append(store.BaselineSnapshots, snapshot)
	store.Unlock()
	_ = store.Save()

	// Append to audit ledger
	ledger := audit.GetDefaultLedger()
	_, _ = ledger.Append(map[string]interface{}{
		"event":       "baseline_created",
		"bucket":      bucket,
		"version":     nextVersion,
		"fileCount":   len(protectedFiles),
		"merkleRoot":  merkleRoot,
		"snapshotId":  snapshotID,
	})

	log.Printf("[+] baselineService: snapshot created v%d (Files: %d, MerkleRoot: %s)", nextVersion, len(protectedFiles), merkleRoot)

	return &BaselineResult{
		Bucket:     bucket,
		Version:    nextVersion,
		FileCount:  len(protectedFiles),
		MerkleRoot: merkleRoot,
		SnapshotID: snapshotID,
	}, nil
}
