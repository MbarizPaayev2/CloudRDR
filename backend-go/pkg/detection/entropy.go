package detection

import "math"

// ComputeShannonEntropy calculates Shannon entropy of byte data (0.00 to 8.00)
// High entropy (>= 7.20) typically indicates encrypted / compressed data.
func ComputeShannonEntropy(data []byte) float64 {
	if len(data) == 0 {
		return 0.0
	}

	freq := make(map[byte]int)
	for _, b := range data {
		freq[b]++
	}

	length := float64(len(data))
	var entropy float64
	for _, count := range freq {
		p := float64(count) / length
		entropy -= p * math.Log2(p)
	}

	// Round to 2 decimal places
	return math.Round(entropy*100) / 100
}
