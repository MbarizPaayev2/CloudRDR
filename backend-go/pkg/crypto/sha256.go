package crypto

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
)

// HashStream computes SHA-256 hex string for any io.Reader without buffering whole file in RAM
func HashStream(r io.Reader) (string, error) {
	h := sha256.New()
	if _, err := io.Copy(h, r); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// HashBytes computes SHA-256 hex string of a byte slice
func HashBytes(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

// HashString computes SHA-256 hex string of a string
func HashString(s string) string {
	return HashBytes([]byte(s))
}
