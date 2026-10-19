package crypto

import (
	"crypto/sha256"
	"encoding/hex"
)

// MerkleRoot computes the pairwise Merkle root hex string from ordered leaf SHA-256 hashes.
// Matches the exact pairing logic: duplicates last leaf if count is odd.
func MerkleRoot(hashes []string) string {
	if len(hashes) == 0 {
		emptyHash := sha256.Sum256([]byte(""))
		return hex.EncodeToString(emptyHash[:])
	}

	layer := make([]string, len(hashes))
	copy(layer, hashes)

	for len(layer) > 1 {
		var next []string
		for i := 0; i < len(layer); i += 2 {
			left := layer[i]
			right := left
			if i+1 < len(layer) {
				right = layer[i+1]
			}

			combined := left + right
			sum := sha256.Sum256([]byte(combined))
			next = append(next, hex.EncodeToString(sum[:]))
		}
		layer = next
	}

	return layer[0]
}
