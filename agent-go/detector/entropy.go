package detector

import (
	"io"
	"math"
	"os"
)

// CalculateShannonEntropy computes the Shannon entropy of a byte slice.
// Returns a value between 0.0 (completely uniform/zero information) and 8.0 (completely random/encrypted).
func CalculateShannonEntropy(data []byte) float64 {
	if len(data) == 0 {
		return 0.0
	}

	var freq [256]int
	for _, b := range data {
		freq[b]++
	}

	length := float64(len(data))
	var entropy float64

	for _, count := range freq {
		if count > 0 {
			p := float64(count) / length
			entropy -= p * math.Log2(p)
		}
	}

	return entropy
}

// CalculateFileEntropy reads up to maxBytes from the file and calculates Shannon entropy.
// If maxBytes <= 0, a default 64KB sample window is used.
func CalculateFileEntropy(filePath string, maxBytes int64) (float64, error) {
	if maxBytes <= 0 {
		maxBytes = 64 * 1024 // 64 KB sample window
	}

	file, err := os.Open(filePath)
	if err != nil {
		return 0.0, err
	}
	defer file.Close()

	buf := make([]byte, maxBytes)
	n, err := io.ReadFull(file, buf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return 0.0, err
	}

	return CalculateShannonEntropy(buf[:n]), nil
}
