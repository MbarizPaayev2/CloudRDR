package audit

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"cloudrdr-backend/pkg/crypto"
)

const GenesisPrevHash = "0000000000000000000000000000000000000000000000000000000000000000"

type AuditBlock struct {
	Index     int         `json:"index"`
	PrevHash  string      `json:"prevHash"`
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data"`
	Hash      string      `json:"hash"`
}

type AuditLedger struct {
	sync.RWMutex
	filePath string
	entries  []AuditBlock
}

var (
	defaultLedger     *AuditLedger
	defaultLedgerOnce sync.Once
)

func GetDefaultLedger() *AuditLedger {
	defaultLedgerOnce.Do(func() {
		defaultLedger = NewAuditLedger(filepath.Join("data", "audit-chain.jsonl"))
	})
	return defaultLedger
}

func NewAuditLedger(filePath string) *AuditLedger {
	l := &AuditLedger{
		filePath: filePath,
		entries:  []AuditBlock{},
	}
	_ = l.load()
	return l
}

func (l *AuditLedger) load() error {
	if l.filePath == "" {
		return nil
	}
	raw, err := os.ReadFile(l.filePath)
	if err != nil {
		return nil
	}

	lines := strings.Split(string(raw), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var block AuditBlock
		if err := json.Unmarshal([]byte(line), &block); err == nil {
			l.entries = append(l.entries, block)
		}
	}
	return nil
}

// ComputeBlockHash computes SHA-256(index : prevHash : timestamp : canonicalJson(data))
func ComputeBlockHash(index int, prevHash, timestamp string, data interface{}) string {
	canonical, _ := crypto.CanonicalJSON(data)
	payload := fmt.Sprintf("%d:%s:%s:%s", index, prevHash, timestamp, canonical)
	sum := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(sum[:])
}

// Append appends a new verified event block to the ledger
func (l *AuditLedger) Append(data interface{}) (AuditBlock, error) {
	l.Lock()
	defer l.Unlock()

	idx := len(l.entries)
	prevHash := GenesisPrevHash
	if idx > 0 {
		prevHash = l.entries[idx-1].Hash
	}

	ts := time.Now().UTC().Format(time.RFC3339Nano)
	h := ComputeBlockHash(idx, prevHash, ts, data)

	block := AuditBlock{
		Index:     idx,
		PrevHash:  prevHash,
		Timestamp: ts,
		Data:      data,
		Hash:      h,
	}

	l.entries = append(l.entries, block)

	if l.filePath != "" {
		_ = os.MkdirAll(filepath.Dir(l.filePath), 0755)
		b, _ := json.Marshal(block)
		f, err := os.OpenFile(l.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err == nil {
			_, _ = f.Write(append(b, '\n'))
			_ = f.Close()
		}
	}

	return block, nil
}

// VerifyChain validates every cryptographic link and block hash from genesis to tip
func (l *AuditLedger) VerifyChain() (bool, int, error) {
	l.RLock()
	defer l.RUnlock()

	for i, block := range l.entries {
		if block.Index != i {
			return false, i, fmt.Errorf("block %d has invalid index %d", i, block.Index)
		}

		expectedPrev := GenesisPrevHash
		if i > 0 {
			expectedPrev = l.entries[i-1].Hash
		}
		if block.PrevHash != expectedPrev {
			return false, i, fmt.Errorf("block %d has invalid prevHash %s (expected %s)", i, block.PrevHash, expectedPrev)
		}

		expectedHash := ComputeBlockHash(block.Index, block.PrevHash, block.Timestamp, block.Data)
		if block.Hash != expectedHash {
			return false, i, fmt.Errorf("block %d hash mismatch", i)
		}
	}

	return true, len(l.entries), nil
}

// GetEntries returns a copy of all audit entries
func (l *AuditLedger) GetEntries() []AuditBlock {
	l.RLock()
	defer l.RUnlock()
	res := make([]AuditBlock, len(l.entries))
	copy(res, l.entries)
	return res
}
