package detector

import (
	"path/filepath"
	"strings"
)

// IsCanaryFile checks if a file path matches any known canary or sentinel patterns.
func IsCanaryFile(filePath string, canaryPatterns []string) bool {
	base := strings.ToLower(filepath.Base(filePath))
	cleanPath := strings.ToLower(filepath.ToSlash(filePath))

	for _, pattern := range canaryPatterns {
		p := strings.TrimSpace(strings.ToLower(pattern))
		if p == "" {
			continue
		}

		if strings.Contains(base, p) || strings.Contains(cleanPath, p) {
			return true
		}
	}

	return false
}
