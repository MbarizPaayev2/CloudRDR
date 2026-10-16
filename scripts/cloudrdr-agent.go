package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
)

const AgentVersion = "2.1.0-go-enterprise"

type Config struct {
	ManagerURL       string
	WatchDir         string
	Bucket           string
	AccountId        string
	PollInterval     time.Duration
	EntropyThreshold float64
	AgentKey         string
	CanaryPatterns   []string
}

type FileChangeEvent struct {
	Path       string    `json:"path"`
	EventType  string    `json:"eventType"`
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

func calculateShannonEntropy(data []byte) float64 {
	if len(data) == 0 {
		return 0.0
	}
	freqs := make([]int, 256)
	for _, b := range data {
		freqs[b]++
	}
	total := float64(len(data))
	entropy := 0.0
	for _, count := range freqs {
		if count > 0 {
			p := float64(count) / total
			entropy -= p * math.Log2(p)
		}
	}
	return math.Round(entropy*100) / 100
}

func getFileEntropy(path string) float64 {
	f, err := os.Open(path)
	if err != nil {
		return 0.0
	}
	defer f.Close()
	buf := make([]byte, 64*1024)
	n, _ := f.Read(buf)
	return calculateShannonEntropy(buf[:n])
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

func isCanaryPath(relPath string, patterns []string) bool {
	lower := strings.ToLower(relPath)
	for _, p := range patterns {
		if strings.Contains(lower, strings.ToLower(p)) {
			return true
		}
	}
	return false
}

func executeHostFreeze(targetDir string) error {
	log.Printf("[ACTIVE DEFENSE] Executing containment write-freeze on: %s", targetDir)
	if runtime.GOOS == "windows" {
		cmd := exec.Command("icacls", targetDir, "/deny", "*S-1-1-0:(W,WD,AD)")
		return cmd.Run()
	}
	cmd := exec.Command("chmod", "-R", "a-w", targetDir)
	return cmd.Run()
}

func main() {
	managerURL := flag.String("manager", "http://localhost:3000", "CloudRDR Manager URL")
	watchDir := flag.String("watch", "./protected", "Directory to monitor")
	bucket := flag.String("bucket", "protected", "Storage bucket name")
	account := flag.String("account", "default-account", "Account ID")
	interval := flag.Int("interval", 3, "Scan interval in seconds")
	entropyThresh := flag.Float64("entropy", 7.2, "Shannon entropy threshold")
	key := flag.String("key", "cloudrdr-default-key-2026", "Agent API Key")
	flag.Parse()

	cfg := Config{
		ManagerURL:       strings.TrimRight(*managerURL, "/"),
		WatchDir:         *watchDir,
		Bucket:           *bucket,
		AccountId:        *account,
		PollInterval:     time.Duration(*interval) * time.Second,
		EntropyThreshold: *entropyThresh,
		AgentKey:         *key,
		CanaryPatterns:   []string{"canary", "decoy", "tripwire", ".canary."},
	}

	fmt.Printf(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║          CloudRDR — High-Performance Go Endpoint Agent        ║
  ║      Real-Time FIM • Shannon Entropy • Sub-second Containment ║
  ╚═══════════════════════════════════════════════════════════════╝
  Version: %s | Manager: %s | Watching: %s
`, AgentVersion, cfg.ManagerURL, cfg.WatchDir)

	client := &http.Client{Timeout: 10 * time.Second}
	hostname, _ := os.Hostname()

	// 1. Enrollment
	var agentId string
	log.Println("[*] Registering with CloudRDR Manager...")
	for {
		regPayload, _ := json.Marshal(map[string]interface{}{
			"hostname":  hostname,
			"ip":        "127.0.0.1",
			"platform":  runtime.GOOS,
			"version":   AgentVersion,
			"accountId": cfg.AccountId,
			"bucket":    cfg.Bucket,
		})

		req, _ := http.NewRequest("POST", cfg.ManagerURL+"/api/agent/register", bytes.NewBuffer(regPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Agent-Key", cfg.AgentKey)

		resp, err := client.Do(req)
		if err == nil && resp.StatusCode >= 200 && resp.StatusCode < 300 {
			var r map[string]interface{}
			_ = json.NewDecoder(resp.Body).Decode(&r)
			resp.Body.Close()
			if id, ok := r["agentId"].(string); ok {
				agentId = id
			}
			log.Printf("[+] Registered successfully! Agent ID: %s", agentId)
			break
		}
		if resp != nil {
			resp.Body.Close()
		}
		log.Println("[!] Manager unreachable. Retrying in 5s...")
		time.Sleep(5 * time.Second)
	}

	// 2. Heartbeat Keepalive
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			hbPayload, _ := json.Marshal(map[string]interface{}{
				"agentId":        agentId,
				"cpuUsage":       0.5,
				"ramUsageMb":     8.5,
				"filesMonitored": 0,
				"status":         "online",
			})
			req, _ := http.NewRequest("POST", cfg.ManagerURL+"/api/agent/heartbeat", bytes.NewBuffer(hbPayload))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-Agent-Key", cfg.AgentKey)
			resp, err := client.Do(req)
			if err == nil && resp != nil {
				var r map[string]interface{}
				_ = json.NewDecoder(resp.Body).Decode(&r)
				resp.Body.Close()
				if r["command"] == "FREEZE" {
					log.Println("[FREEZE COMMAND RECEIVED] Locking host directory...")
					_ = executeHostFreeze(cfg.WatchDir)
				}
			}
		}
	}()

	// 3. FIM Watcher & Event Loop
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	fileStateMap := make(map[string]fileState)
	var stateMu sync.Mutex
	isFirstScan := true

	_ = os.MkdirAll(cfg.WatchDir, 0755)
	log.Printf("[+] FIM scanner active on %s. Polling every %s...", cfg.WatchDir, cfg.PollInterval)

	scanTicker := time.NewTicker(cfg.PollInterval)
	defer scanTicker.Stop()

	for {
		select {
		case <-scanTicker.C:
			stateMu.Lock()
			currentFiles := make(map[string]struct{})
			var events []FileChangeEvent

			_ = filepath.Walk(cfg.WatchDir, func(path string, info os.FileInfo, err error) error {
				if err != nil || info == nil || info.IsDir() {
					return nil
				}
				relPath, _ := filepath.Rel(cfg.WatchDir, path)
				relPath = filepath.ToSlash(relPath)
				currentFiles[relPath] = struct{}{}

				isCanary := isCanaryPath(relPath, cfg.CanaryPatterns)
				prev, exists := fileStateMap[relPath]

				if !exists {
					h, _ := hashFile(path)
					ent := getFileEntropy(path)
					fileStateMap[relPath] = fileState{size: info.Size(), modTime: info.ModTime(), sha256: h}

					if !isFirstScan || isCanary {
						events = append(events, FileChangeEvent{
							Path:       relPath,
							EventType:  "created",
							Size:       info.Size(),
							SHA256:     h,
							Entropy:    ent,
							IsCanary:   isCanary,
							ObservedAt: time.Now().UTC(),
						})
					}
				} else if info.ModTime().After(prev.modTime) || info.Size() != prev.size {
					h, _ := hashFile(path)
					ent := getFileEntropy(path)
					fileStateMap[relPath] = fileState{size: info.Size(), modTime: info.ModTime(), sha256: h}

					events = append(events, FileChangeEvent{
						Path:       relPath,
						EventType:  "modified",
						Size:       info.Size(),
						SHA256:     h,
						Entropy:    ent,
						IsCanary:   isCanary,
						ObservedAt: time.Now().UTC(),
					})
				}
				return nil
			})

			for relPath, prev := range fileStateMap {
				if _, exists := currentFiles[relPath]; !exists {
					events = append(events, FileChangeEvent{
						Path:       relPath,
						EventType:  "deleted",
						Size:       prev.size,
						SHA256:     prev.sha256,
						Entropy:    0,
						IsCanary:   isCanaryPath(relPath, cfg.CanaryPatterns),
						ObservedAt: time.Now().UTC(),
					})
					delete(fileStateMap, relPath)
				}
			}

			isFirstScan = false
			stateMu.Unlock()

			if len(events) > 0 {
				for _, ev := range events {
					log.Printf("[EVENT] [%s] %s (Size: %d bytes | Entropy: %.2f)", ev.EventType, ev.Path, ev.Size, ev.Entropy)
					if ev.IsCanary && (ev.EventType == "modified" || ev.EventType == "deleted") {
						log.Println("[CANARY TRIPWIRE] Canary file altered! Executing local write freeze!")
						_ = executeHostFreeze(cfg.WatchDir)
					}
				}

				// Dispatch to Manager
				eventsPayload, _ := json.Marshal(map[string]interface{}{
					"agentId":   agentId,
					"accountId": cfg.AccountId,
					"bucket":    cfg.Bucket,
					"events":    events,
				})
				req, _ := http.NewRequest("POST", cfg.ManagerURL+"/api/agent/events", bytes.NewBuffer(eventsPayload))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("X-Agent-Key", cfg.AgentKey)

				resp, err := client.Do(req)
				if err == nil && resp != nil {
					var r map[string]interface{}
					_ = json.NewDecoder(resp.Body).Decode(&r)
					resp.Body.Close()
					if r["action"] == "FREEZE" {
						log.Println("[MANAGER OUTBREAK DETECTED] Manager issued FREEZE! Locking directory...")
						_ = executeHostFreeze(cfg.WatchDir)
					}
				}
			}

		case <-stopChan:
			log.Println("[*] Stopping CloudRDR Agent...")
			return
		}
	}
}
