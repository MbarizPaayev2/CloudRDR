package detection

import (
	"path/filepath"
	"strings"
)

var defaultCanaryPatterns = []string{
	"canary/",
	"canary_",
	".canary",
	"tripwire",
	"sentinel",
	".canary_tripwire",
	"tripwire_sentinel",
}

// IsCanaryPath checks if a path matches canary bait trap criteria
func IsCanaryPath(filePath string, customCanaryPaths map[string]bool) bool {
	normalized := strings.ToLower(filepath.ToSlash(filePath))

	if customCanaryPaths != nil && customCanaryPaths[filePath] {
		return true
	}

	for _, pattern := range defaultCanaryPatterns {
		if strings.Contains(normalized, pattern) {
			return true
		}
	}
	return false
}
