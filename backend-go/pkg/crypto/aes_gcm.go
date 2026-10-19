package crypto

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
)

var (
	MagicHeader = []byte("CRDR-GCM1")
	ivLength    = 12 // 96-bit IV
	tagLength   = 16 // 128-bit GCM tag

	activeKeyMutex sync.RWMutex
	activeKey      []byte
)

type MetadataAAD struct {
	Bucket     string
	Path       string
	VersionRef string
}

func (m MetadataAAD) Bytes() []byte {
	return []byte(fmt.Sprintf("%s:%s:%s", m.Bucket, m.Path, m.VersionRef))
}

// GetOrInitMasterKey loads from BACKUP_ENCRYPTION_KEY or data/.master-key.key or generates one
func GetOrInitMasterKey() ([]byte, error) {
	activeKeyMutex.RLock()
	if len(activeKey) == 32 {
		k := make([]byte, 32)
		copy(k, activeKey)
		activeKeyMutex.RUnlock()
		return k, nil
	}
	activeKeyMutex.RUnlock()

	activeKeyMutex.Lock()
	defer activeKeyMutex.Unlock()

	if len(activeKey) == 32 {
		return activeKey, nil
	}

	if envKey := os.Getenv("BACKUP_ENCRYPTION_KEY"); len(envKey) == 64 {
		b, err := hex.DecodeString(envKey)
		if err == nil && len(b) == 32 {
			activeKey = b
			return activeKey, nil
		}
	}

	keyPath := filepath.Join("data", ".master-key.key")
	if raw, err := os.ReadFile(keyPath); err == nil {
		str := string(bytes.TrimSpace(raw))
		if len(str) == 64 {
			if b, err := hex.DecodeString(str); err == nil && len(b) == 32 {
				activeKey = b
				return activeKey, nil
			}
		}
	}

	// Generate new 32-byte key
	newKey := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, newKey); err != nil {
		return nil, err
	}
	activeKey = newKey

	_ = os.MkdirAll("data", 0755)
	_ = os.WriteFile(keyPath, []byte(hex.EncodeToString(newKey)), 0600)

	return activeKey, nil
}

// EncryptAES256GCM produces [ MAGIC_HEADER (8) | IV (12) | TAG (16) | CIPHERTEXT ]
func EncryptAES256GCM(plaintext []byte, meta MetadataAAD) ([]byte, error) {
	key, err := GetOrInitMasterKey()
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	iv := make([]byte, ivLength)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return nil, err
	}

	// gcm.Seal appends tag to the end of ciphertext
	sealed := gcm.Seal(nil, iv, plaintext, meta.Bytes())
	// sealed is ciphertext + tag (last 16 bytes)
	if len(sealed) < tagLength {
		return nil, errors.New("sealed ciphertext corrupted")
	}

	tag := sealed[len(sealed)-tagLength:]
	ciphertext := sealed[:len(sealed)-tagLength]

	var out bytes.Buffer
	out.Write(MagicHeader)
	out.Write(iv)
	out.Write(tag)
	out.Write(ciphertext)

	return out.Bytes(), nil
}

// DecryptAES256GCM parses package and verifies AEAD authentication tag
func DecryptAES256GCM(pkg []byte, meta MetadataAAD) ([]byte, bool, error) {
	headerLen := len(MagicHeader)
	minLen := headerLen + ivLength + tagLength
	if len(pkg) < minLen {
		return nil, false, errors.New("payload too short")
	}

	if !bytes.Equal(pkg[:headerLen], MagicHeader) {
		return nil, false, errors.New("invalid magic header")
	}

	iv := pkg[headerLen : headerLen+ivLength]
	tag := pkg[headerLen+ivLength : headerLen+ivLength+tagLength]
	ciphertext := pkg[headerLen+ivLength+tagLength:]

	key, err := GetOrInitMasterKey()
	if err != nil {
		return nil, false, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, false, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, false, err
	}

	// In Go cipher.GCM, Open expects ciphertext + tag
	combined := append(ciphertext, tag...)
	plaintext, err := gcm.Open(nil, iv, combined, meta.Bytes())
	if err != nil {
		return nil, false, nil // AEAD verification failure
	}

	return plaintext, true, nil
}
