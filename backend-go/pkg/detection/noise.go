package detection

import (
	"path/filepath"
	"strings"

	"cloudrdr-backend/pkg/models"
)

var noisePatterns = []string{
	"node_modules/",
	".git/",
	".vscode/",
	".idea/",
	"/dist/",
	"/build/",
	"/target/",
	"__pycache__/",
	".tmp",
	".swp",
	".cache/",
	"package-lock.json",
}

// IsNoisePath checks if path belongs to benign developer/build directories
func IsNoisePath(filePath string) bool {
	normalized := strings.ToLower(filepath.ToSlash(filePath))
	for _, p := range noisePatterns {
		if strings.Contains(normalized, p) {
			return true
		}
	}
	return false
}

// FilterNoiseEvents filters out benign developer events unless it matches a canary path
func FilterNoiseEvents(events []models.ChangeEvent, canaryPaths map[string]bool) ([]models.ChangeEvent, int) {
	var filtered []models.ChangeEvent
	noiseCount := 0

	for _, e := range events {
		if IsCanaryPath(e.Path, canaryPaths) {
			filtered = append(filtered, e)
			continue
		}

		if IsNoisePath(e.Path) {
			noiseCount++
			continue
		}

		filtered = append(filtered, e)
	}

	return filtered, noiseCount
}
