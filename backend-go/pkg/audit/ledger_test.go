package audit

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAuditLedgerChain(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "audit-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	logFile := filepath.Join(tmpDir, "test-chain.jsonl")
	ledger := NewAuditLedger(logFile)

	// Append 5 blocks
	for i := 0; i < 5; i++ {
		_, err := ledger.Append(map[string]interface{}{
			"action": "test_event",
			"index":  i,
		})
		if err != nil {
			t.Fatalf("failed to append block %d: %v", i, err)
		}
	}

	valid, count, err := ledger.VerifyChain()
	if !valid || err != nil {
		t.Fatalf("expected audit chain to be valid, got valid=%v, err=%v", valid, err)
	}

	if count != 5 {
		t.Errorf("expected 5 verified blocks, got %d", count)
	}

	// Verify persistence: re-open ledger from disk
	reloaded := NewAuditLedger(logFile)
	if len(reloaded.entries) != 5 {
		t.Errorf("expected 5 reloaded entries, got %d", len(reloaded.entries))
	}

	reValid, _, reErr := reloaded.VerifyChain()
	if !reValid || reErr != nil {
		t.Errorf("reloaded chain verification failed: %v", reErr)
	}
}
