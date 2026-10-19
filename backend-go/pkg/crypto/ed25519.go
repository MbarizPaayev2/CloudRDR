package crypto

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"sync"
)

var (
	activeKeyPairMutex sync.RWMutex
	activePublicKey    ed25519.PublicKey
	activePrivateKey   ed25519.PrivateKey
	activeKeyID        string
)

func init() {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err == nil {
		activePublicKey = pub
		activePrivateKey = priv
		sum := sha256.Sum256(pub)
		activeKeyID = fmt.Sprintf("key-%s", hex.EncodeToString(sum[:])[:16])
	}
}

// CanonicalJSON produces a deterministic RFC 8785 style JSON string by sorting object keys recursively
func CanonicalJSON(v interface{}) (string, error) {
	switch val := v.(type) {
	case nil:
		return "null", nil
	case bool:
		if val {
			return "true", nil
		}
		return "false", nil
	case string:
		b, _ := json.Marshal(val)
		return string(b), nil
	case float64, float32, int, int32, int64, uint, uint32, uint64:
		b, _ := json.Marshal(val)
		return string(b), nil
	case []interface{}:
		var items []string
		for _, item := range val {
			cj, err := CanonicalJSON(item)
			if err != nil {
				return "", err
			}
			items = append(items, cj)
		}
		res := "["
		for i, item := range items {
			if i > 0 {
				res += ","
			}
			res += item
		}
		res += "]"
		return res, nil
	case map[string]interface{}:
		var keys []string
		for k := range val {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		res := "{"
		for i, k := range keys {
			if i > 0 {
				res += ","
			}
			kb, _ := json.Marshal(k)
			vj, err := CanonicalJSON(val[k])
			if err != nil {
				return "", err
			}
			res += fmt.Sprintf("%s:%s", string(kb), vj)
		}
		res += "}"
		return res, nil
	default:
		// Attempt round-trip to generic interface map/slice
		raw, err := json.Marshal(v)
		if err != nil {
			return "", err
		}
		var generic interface{}
		if err := json.Unmarshal(raw, &generic); err != nil {
			return string(raw), nil
		}
		return CanonicalJSON(generic)
	}
}

// SignRecord signs a map/struct with active Ed25519 key
func SignRecord(record interface{}) (signature string, keyID string, canonicalPayload string, err error) {
	activeKeyPairMutex.RLock()
	priv := activePrivateKey
	kid := activeKeyID
	activeKeyPairMutex.RUnlock()

	if priv == nil {
		return "", "", "", fmt.Errorf("active signing key is not initialized")
	}

	canonical, err := CanonicalJSON(record)
	if err != nil {
		return "", "", "", err
	}

	sigBytes := ed25519.Sign(priv, []byte(canonical))
	return hex.EncodeToString(sigBytes), kid, canonical, nil
}

// VerifyRecord verifies an Ed25519 signature over a record
func VerifyRecord(record interface{}, signatureHex string, publicKey ed25519.PublicKey) bool {
	if publicKey == nil {
		activeKeyPairMutex.RLock()
		publicKey = activePublicKey
		activeKeyPairMutex.RUnlock()
	}

	canonical, err := CanonicalJSON(record)
	if err != nil {
		return false
	}

	sigBytes, err := hex.DecodeString(signatureHex)
	if err != nil || len(sigBytes) != ed25519.SignatureSize {
		return false
	}

	return ed25519.Verify(publicKey, []byte(canonical), sigBytes)
}
