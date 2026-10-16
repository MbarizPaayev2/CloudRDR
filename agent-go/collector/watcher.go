package collector

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"cloudrdr-agent/detector"
)

// FileChangeEvent represents a detected file system change with cryptographic telemetry.
type FileChangeEvent struct {
	Path       string    `json:"path"`
	EventType  string    `json:"eventType"` // "created", "modified", "deleted"
	Size       int64     `json:"size"`
	SHA256     string    `json:"sha256,omitempty"`
	Entropy    float64   `json:"entropy"`
	IsCanary   bool      `json:"isCanary"`
	ObservedAt time.Time `json:"observedAt"`
}

type fileState struct {
	size    int64
	modTime time.Time
	sha256  string
}

// Watcher monitors a local directory for ransomware-like activity.
type Watcher struct {
	watchDir       string
	canaryPatterns []string
	state          map[string]fileState
	mu             sync.RWMutex
	isFirstScan    bool
}

// NewWatcher initializes a Watcher instance.
func NewWatcher(watchDir string, canaryPatterns []string) *Watcher {
	return &Watcher{
		watchDir:       watchDir,
		canaryPatterns: canaryPatterns,
		state:          make(map[string]fileState),
		isFirstScan:    true,
	}
}

// Scan performs one recursive directory scan and returns newly detected events.
func (w *Watcher) Scan() ([]FileChangeEvent, int) {
	w.mu.Lock()
	defer w.mu.Unlock()

	var events []FileChangeEvent
	currentFiles := make(map[string]struct{})

	// Ensure directory exists
	if _, err := os.Stat(w.watchDir); os.IsNotExist(err) {
		_ = os.MkdirAll(w.watchDir, 0755)
		return nil, 0
	}

	_ = filepath.Walk(w.watchDir, func(fullPath string, info os.FileInfo, err error) error {
		if err != nil || info == nil || info.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(w.watchDir, fullPath)
		if err != nil {
			relPath = fullPath
		}
		relPath = filepath.ToSlash(relPath)
		currentFiles[relPath] = struct{}{}

		isCanary := detector.IsCanaryFile(relPath, w.canaryPatterns)
		prev, exists := w.state[relPath]

		if !exists {
			// New file detected
			hashStr, _ := hashFile(fullPath)
			entropy, _ := detector.CalculateFileEntropy(fullPath, 64*1024)

			w.state[relPath] = fileState{
				size:    info.Size(),
				modTime: info.ModTime(),
				sha256:  hashStr,
			}

			// Do not alert on first baseline initialization scan unless canary
			if !w.isFirstScan || isCanary {
				events = append(events, FileChangeEvent{
					Path:       relPath,
					EventType:  "created",
					Size:       info.Size(),
					SHA256:     hashStr,
					Entropy:    entropy,
					IsCanary:   isCanary,
					ObservedAt: time.Now().UTC(),
				})
			}
		} else if info.ModTime().After(prev.modTime) || info.Size() != prev.size {
			// Modified file detected
			hashStr, _ := hashFile(fullPath)
			entropy, _ := detector.CalculateFileEntropy(fullPath, 64*1024)

			w.state[relPath] = fileState{
				size:    info.Size(),
				modTime: info.ModTime(),
				sha256:  hashStr,
			}

			events = append(events, FileChangeEvent{
				Path:       relPath,
				EventType:  "modified",
				Size:       info.Size(),
				SHA256:     hashStr,
				Entropy:    entropy,
				IsCanary:   isCanary,
				ObservedAt: time.Now().UTC(),
			})
		}

		return nil
	})

	// Check for deleted files
	for relPath := range w.state {
		if _, exists := currentFiles[relPath]; !exists {
			isCanary := detector.IsCanaryFile(relPath, w.canaryPatterns)
			events = append(events, FileChangeEvent{
				Path:       relPath,
				EventType:  "deleted",
				Size:       w.state[relPath].size,
				SHA256:     w.state[relPath].sha256,
				Entropy:    0.0,
				IsCanary:   isCanary,
				ObservedAt: time.Now().UTC(),
			})
			delete(w.state, relPath)
		}
	}

	w.isFirstScan = false
	return events, len(w.state)
}

func hashFile(filePath string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, f); err != nil {
		return "", err
	}

	return hex.EncodeToString(hasher.Sum(nil)), nil
}
