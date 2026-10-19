package crypto

import (
	"bytes"
	"testing"
)

func TestAES256GCMEncryptDecrypt(t *testing.T) {
	plain := []byte("CloudRDR Verified Enterprise Database Asset 2026")
	meta := MetadataAAD{
		Bucket:     "protected",
		Path:       "database/customers.sql",
		VersionRef: "v1",
	}

	enc, err := EncryptAES256GCM(plain, meta)
	if err != nil {
		t.Fatalf("encryption failed: %v", err)
	}

	dec, verified, err := DecryptAES256GCM(enc, meta)
	if err != nil {
		t.Fatalf("decryption failed: %v", err)
	}

	if !verified {
		t.Errorf("expected AEAD tag verification to succeed")
	}

	if !bytes.Equal(dec, plain) {
		t.Errorf("decrypted text mismatch")
	}

	// Test Tamper resistance: alter 1 byte in ciphertext
	corrupted := make([]byte, len(enc))
	copy(corrupted, enc)
	corrupted[len(corrupted)-1] ^= 0xFF // flip bit

	_, badVerified, _ := DecryptAES256GCM(corrupted, meta)
	if badVerified {
		t.Errorf("expected AEAD verification to FAIL on tampered ciphertext")
	}
}

func TestMerkleRoot(t *testing.T) {
	hashes := []string{
		HashString("file1"),
		HashString("file2"),
		HashString("file3"),
	}

	root1 := MerkleRoot(hashes)
	root2 := MerkleRoot(hashes)

	if root1 != root2 {
		t.Errorf("merkle root calculation must be deterministic")
	}

	if len(root1) != 64 {
		t.Errorf("expected 64-char hex root, got %s", root1)
	}
}

func TestEd25519Signing(t *testing.T) {
	record := map[string]interface{}{
		"incidentId": "inc-12345",
		"status":     "frozen",
		"riskScore":  85,
	}

	sig, keyID, canonical, err := SignRecord(record)
	if err != nil {
		t.Fatalf("signing failed: %v", err)
	}

	if keyID == "" || sig == "" {
		t.Fatalf("expected non-empty keyId and signature")
	}

	ok := VerifyRecord(record, sig, nil)
	if !ok {
		t.Errorf("signature verification failed for canonical payload: %s", canonical)
	}
}
