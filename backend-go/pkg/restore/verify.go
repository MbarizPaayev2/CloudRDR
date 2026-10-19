package restore

import "cloudrdr-backend/pkg/crypto"

type VerifyStatus string

const (
	StatusValid    VerifyStatus = "VALID"
	StatusModified VerifyStatus = "MODIFIED"
	StatusMissing  VerifyStatus = "MISSING"
)

type VerificationResult struct {
	Status         VerifyStatus `json:"status"`
	ExpectedSHA256 string       `json:"expected_sha256"`
	ObservedSHA256 string       `json:"observed_sha256,omitempty"`
	AeadVerified   bool         `json:"aead_verified"`
	SizeBytes      int          `json:"size_bytes"`
}

// VerifyFileBytes tests restored bytes against SHA-256 baseline and AEAD authentication status
func VerifyFileBytes(restoredBytes []byte, expectedSHA256 string, aeadVerified bool) VerificationResult {
	if len(restoredBytes) == 0 {
		return VerificationResult{
			Status:         StatusMissing,
			ExpectedSHA256: expectedSHA256,
			AeadVerified:   aeadVerified,
			SizeBytes:      0,
		}
	}

	observedSHA256 := crypto.HashBytes(restoredBytes)
	if observedSHA256 == expectedSHA256 && aeadVerified {
		return VerificationResult{
			Status:         StatusValid,
			ExpectedSHA256: expectedSHA256,
			ObservedSHA256: observedSHA256,
			AeadVerified:   true,
			SizeBytes:      len(restoredBytes),
		}
	}

	return VerificationResult{
		Status:         StatusModified,
		ExpectedSHA256: expectedSHA256,
		ObservedSHA256: observedSHA256,
		AeadVerified:   aeadVerified,
		SizeBytes:      len(restoredBytes),
	}
}
