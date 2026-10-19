package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"cloudrdr-backend/pkg/adapters/db"
	"cloudrdr-backend/pkg/adapters/storage"
	"cloudrdr-backend/pkg/baseline"
	"cloudrdr-backend/pkg/config"
	"cloudrdr-backend/pkg/detection"
	"cloudrdr-backend/pkg/models"
	"cloudrdr-backend/pkg/response"
	"cloudrdr-backend/pkg/restore"
)

type Server struct {
	cfg            *config.Config
	store          *db.MemoryStore
	storageAdapter *storage.LocalStorage
	mux            *http.ServeMux

	rateLimitMutex sync.Mutex
	rateLimitMap   map[string][]time.Time
}

func NewServer(cfg *config.Config, store *db.MemoryStore, storageAdapter *storage.LocalStorage) *Server {
	s := &Server{
		cfg:            cfg,
		store:          store,
		storageAdapter: storageAdapter,
		mux:            http.NewServeMux(),
		rateLimitMap:   make(map[string][]time.Time),
	}
	s.registerRoutes()
	return s
}

func (s *Server) registerRoutes() {
	// Health
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/api/health", s.handleHealth)

	// Agent Lifecycle
	s.mux.HandleFunc("/api/agent/register", s.handleAgentRegister)
	s.mux.HandleFunc("/api/agent/heartbeat", s.handleAgentHeartbeat)
	s.mux.HandleFunc("/api/agent/status", s.handleAgentStatus)

	// High-Throughput Telemetry Ingestion
	s.mux.HandleFunc("/api/telemetry/events", s.handleTelemetryEvents)

	// Threat Detection
	s.mux.HandleFunc("/api/detection/evaluate", s.handleDetectionEvaluate)
	s.mux.HandleFunc("/api/detection/runs", s.handleDetectionRuns)

	// Baseline & Merkle Tree
	s.mux.HandleFunc("/api/baseline/create", s.handleBaselineCreate)
	s.mux.HandleFunc("/api/baseline/list", s.handleBaselineList)

	// Incidents & Containment
	s.mux.HandleFunc("/api/incidents", s.handleIncidents)
	s.mux.HandleFunc("/api/incidents/freeze", s.handleManualFreeze)
	s.mux.HandleFunc("/api/incidents/unfreeze", s.handleManualUnfreeze)

	// Verified Restore
	s.mux.HandleFunc("/api/restore/start", s.handleRestoreStart)

	// Dashboard Telemetry
	s.mux.HandleFunc("/api/dashboard/stats", s.handleDashboardStats)
	s.mux.HandleFunc("/api/dashboard/summary", s.handleDashboardStats)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 1. CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 2. Rate Limiting (100 req/min per IP)
	ip := r.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	if !s.allowRate(ip, 120, time.Minute) {
		s.jsonError(w, http.StatusTooManyRequests, "rate_limit_exceeded", "Too many requests. Please slow down.")
		return
	}

	// 3. API Key Authentication (except health and public endpoints)
	path := r.URL.Path
	isPublic := path == "/health" ||
		path == "/api/health" ||
		strings.HasPrefix(path, "/api/auth") ||
		strings.HasPrefix(path, "/api/agent/register") ||
		strings.HasPrefix(path, "/dashboard") ||
		path == "/"

	if !isPublic {
		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" {
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				apiKey = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		valid := false
		for _, vk := range s.cfg.ValidAPIKeys {
			if apiKey != "" && apiKey == vk {
				valid = true
				break
			}
		}

		if !valid {
			s.jsonError(w, http.StatusUnauthorized, "unauthorized", "Valid API key or authenticated user session required")
			return
		}
	}

	s.mux.ServeHTTP(w, r)
}

func (s *Server) allowRate(ip string, limit int, window time.Duration) bool {
	s.rateLimitMutex.Lock()
	defer s.rateLimitMutex.Unlock()

	now := time.Now()
	cutoff := now.Add(-window)

	var filtered []time.Time
	for _, t := range s.rateLimitMap[ip] {
		if t.After(cutoff) {
			filtered = append(filtered, t)
		}
	}

	if len(filtered) >= limit {
		s.rateLimitMap[ip] = filtered
		return false
	}

	s.rateLimitMap[ip] = append(filtered, now)
	return true
}

// JSON helpers
func (s *Server) jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func (s *Server) jsonError(w http.ResponseWriter, status int, code, message string) {
	s.jsonResponse(w, status, map[string]interface{}{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

// Handlers
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":        true,
		"status":    "healthy",
		"mode":      "cloudrdr-go-core-hybrid",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   "2.0.0-enterprise",
	})
}

func (s *Server) handleAgentRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.jsonError(w, http.StatusMethodNotAllowed, "method_not_allowed", "POST required")
		return
	}

	var payload struct {
		Hostname  string `json:"hostname"`
		IP        string `json:"ip"`
		Platform  string `json:"platform"`
		Version   string `json:"version"`
		AccountID string `json:"account_id"`
		Bucket    string `json:"bucket"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		s.jsonError(w, http.StatusBadRequest, "invalid_json", "Failed to parse registration payload")
		return
	}

	agentID := fmt.Sprintf("agt-%s-%d", payload.Platform, time.Now().Unix()%100000)
	token := fmt.Sprintf("tok-%d-%s", time.Now().UnixNano(), agentID)

	agent := models.ConnectedAgent{
		ID:           fmt.Sprintf("ca-%d", time.Now().UnixNano()),
		AgentID:      agentID,
		Token:        token,
		Hostname:     payload.Hostname,
		IPAddress:    payload.IP,
		Platform:     payload.Platform,
		Version:      payload.Version,
		AccountID:    payload.AccountID,
		Bucket:       payload.Bucket,
		Status:       "online",
		RegisteredAt: time.Now().UTC(),
		LastPingAt:   time.Now().UTC(),
	}

	_ = s.store.UpsertAgent(agent)
	log.Printf("[+] Registered agent: %s (%s on %s)", agentID, payload.Hostname, payload.Platform)

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":       true,
		"agent_id": agentID,
		"token":    token,
	})
}

func (s *Server) handleAgentHeartbeat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.jsonError(w, http.StatusMethodNotAllowed, "method_not_allowed", "POST required")
		return
	}

	var payload struct {
		AgentID        string  `json:"agent_id"`
		CPUUsage       float64 `json:"cpu_usage"`
		RAMUsageMB     float64 `json:"ram_usage_mb"`
		FilesMonitored int     `json:"files_monitored"`
		AccountID      string  `json:"account_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		s.jsonError(w, http.StatusBadRequest, "invalid_json", "Invalid heartbeat JSON")
		return
	}

	action := "CONTINUE"
	if response.IsAccountFrozen(payload.AccountID) {
		action = "FREEZE"
	}

	// Update agent ping
	agents := s.store.GetAgents()
	for _, a := range agents {
		if a.AgentID == payload.AgentID {
			a.CPUUsage = payload.CPUUsage
			a.RAMUsageMB = payload.RAMUsageMB
			a.FilesMonitored = payload.FilesMonitored
			_ = s.store.UpsertAgent(a)
			break
		}
	}

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":     true,
		"action": action,
	})
}

func (s *Server) handleAgentStatus(w http.ResponseWriter, r *http.Request) {
	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":     true,
		"agents": s.store.GetAgents(),
	})
}

func (s *Server) handleTelemetryEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.jsonError(w, http.StatusMethodNotAllowed, "method_not_allowed", "POST required")
		return
	}

	var req struct {
		AccountID string               `json:"account_id"`
		Bucket    string               `json:"bucket"`
		Events    []models.ChangeEvent `json:"events"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonError(w, http.StatusBadRequest, "invalid_json", "Failed to parse telemetry events")
		return
	}

	if req.AccountID == "" {
		req.AccountID = "default-account"
	}
	if req.Bucket == "" {
		req.Bucket = "protected"
	}

	now := time.Now().UTC()
	for i := range req.Events {
		req.Events[i].AccountID = req.AccountID
		req.Events[i].Bucket = req.Bucket
		if req.Events[i].ObservedAt.IsZero() {
			req.Events[i].ObservedAt = now
		}
	}

	// 1. Ingest events into memory store
	_ = s.store.AppendChangeEvents(req.Events)

	// 2. Fetch baseline protected files
	protected := s.store.GetProtectedFiles(req.Bucket)
	canaryPaths := make(map[string]bool)
	for _, f := range protected {
		if f.IsCanary {
			canaryPaths[f.Path] = true
		}
	}

	// 3. Evaluate Sliding Window Detection Engine
	eval := detection.Evaluate(detection.EvaluationParams{
		Events:              s.store.GetRecentEvents(req.AccountID, now.Add(-time.Duration(s.cfg.WindowSeconds)*time.Second)),
		TotalProtectedFiles: len(protected),
		CanaryPaths:         canaryPaths,
		AccountID:           req.AccountID,
		Config:              s.cfg,
		Now:                 now,
	})

	// 4. Save Detection Run
	dr := models.DetectionRun{
		ID:              fmt.Sprintf("dr-%d", now.UnixNano()),
		AccountID:       req.AccountID,
		WindowSeconds:   eval.WindowSeconds,
		TotalFiles:      eval.TotalFiles,
		ChangedFiles:    eval.ChangedFiles,
		ChangeRate:      eval.ChangeRate,
		Threshold:       eval.Threshold,
		CanaryTriggered: eval.CanaryTriggered,
		Verdict:         eval.Verdict,
		RiskScore:       eval.RiskScore,
		ThreatLevel:     eval.ThreatLevel,
		Confidence:      eval.Confidence,
		AffectedPaths:   eval.AffectedPaths,
		CreatedAt:       now,
	}
	_ = s.store.SaveDetectionRun(dr)

	// 5. Automated Containment if Ransomware Detected
	action := "CONTINUE"
	if eval.Verdict == "ransomware" {
		action = "CONTAIN_AND_FREEZE"
		go func() {
			watchPath := filepath.Join(s.storageAdapter.BasePath(), req.Bucket)
			_, _ = response.HandleRansomwareVerdict(eval, req.Bucket, watchPath, s.store)
		}()
	}

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":           true,
		"ingested":     len(req.Events),
		"verdict":      eval.Verdict,
		"action":       action,
		"risk_score":   eval.RiskScore,
		"threat_level": eval.ThreatLevel,
		"confidence":   eval.Confidence,
	})
}

func (s *Server) handleDetectionEvaluate(w http.ResponseWriter, r *http.Request) {
	bucket := r.URL.Query().Get("bucket")
	if bucket == "" {
		bucket = "protected"
	}
	accountID := r.URL.Query().Get("account_id")
	if accountID == "" {
		accountID = "default-account"
	}

	now := time.Now().UTC()
	recentEvents := s.store.GetRecentEvents(accountID, now.Add(-time.Duration(s.cfg.WindowSeconds)*time.Second))
	protected := s.store.GetProtectedFiles(bucket)
	canaryPaths := make(map[string]bool)
	for _, f := range protected {
		if f.IsCanary {
			canaryPaths[f.Path] = true
		}
	}

	eval := detection.Evaluate(detection.EvaluationParams{
		Events:              recentEvents,
		TotalProtectedFiles: len(protected),
		CanaryPaths:         canaryPaths,
		AccountID:           accountID,
		Config:              s.cfg,
		Now:                 now,
	})

	s.jsonResponse(w, http.StatusOK, eval)
}

func (s *Server) handleDetectionRuns(w http.ResponseWriter, r *http.Request) {
	runs := s.store.GetDetectionRuns(50)
	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":   true,
		"runs": runs,
	})
}

func (s *Server) handleBaselineCreate(w http.ResponseWriter, r *http.Request) {
	bucket := r.URL.Query().Get("bucket")
	if bucket == "" {
		bucket = "protected"
	}

	backupDir := filepath.Join(s.cfg.DataDir, "backup")
	res, err := baseline.CreateBaseline(bucket, s.storageAdapter, s.store, backupDir)
	if err != nil {
		s.jsonError(w, http.StatusInternalServerError, "baseline_failed", err.Error())
		return
	}

	s.jsonResponse(w, http.StatusOK, res)
}

func (s *Server) handleBaselineList(w http.ResponseWriter, r *http.Request) {
	bucket := r.URL.Query().Get("bucket")
	if bucket == "" {
		bucket = "protected"
	}

	files := s.store.GetProtectedFiles(bucket)
	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":        true,
		"bucket":    bucket,
		"count":     len(files),
		"files":     files,
		"snapshots": s.store.BaselineSnapshots,
	})
}

func (s *Server) handleIncidents(w http.ResponseWriter, r *http.Request) {
	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":        true,
		"incidents": s.store.GetIncidents(),
	})
}

func (s *Server) handleManualFreeze(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("account_id")
	if accountID == "" {
		accountID = "default-account"
	}
	bucket := r.URL.Query().Get("bucket")
	if bucket == "" {
		bucket = "protected"
	}

	watchPath := filepath.Join(s.storageAdapter.BasePath(), bucket)
	frozen, frozenAt := response.FreezeAccount(accountID, watchPath)

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":        true,
		"account":   accountID,
		"frozen":    frozen,
		"frozen_at": frozenAt,
	})
}

func (s *Server) handleManualUnfreeze(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("account_id")
	if accountID == "" {
		accountID = "default-account"
	}
	bucket := r.URL.Query().Get("bucket")
	if bucket == "" {
		bucket = "protected"
	}

	watchPath := filepath.Join(s.storageAdapter.BasePath(), bucket)
	unfrozen := response.UnfreezeAccount(accountID, watchPath)

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":       true,
		"account":  accountID,
		"unfrozen": unfrozen,
	})
}

func (s *Server) handleRestoreStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.jsonError(w, http.StatusMethodNotAllowed, "method_not_allowed", "POST required")
		return
	}

	var req struct {
		IncidentID       string `json:"incident_id"`
		ApplyImmediately bool   `json:"apply_immediately"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.IncidentID == "" {
		// Pick most recent active incident
		incidents := s.store.GetIncidents()
		for _, inc := range incidents {
			if inc.Status == "frozen" || inc.Status == "open" {
				req.IncidentID = inc.ID
				break
			}
		}
	}

	if req.IncidentID == "" {
		s.jsonError(w, http.StatusBadRequest, "no_incident", "No active incident found for restore")
		return
	}

	res, err := restore.StartRestore(req.IncidentID, restore.RestoreOptions{
		StageOnly:        !req.ApplyImmediately,
		ApplyImmediately: req.ApplyImmediately,
		QuarantineDir:    s.cfg.QuarantineDir,
		BackupDir:        filepath.Join(s.cfg.DataDir, "backup"),
	}, s.store, s.storageAdapter)

	if err != nil {
		s.jsonError(w, http.StatusInternalServerError, "restore_failed", err.Error())
		return
	}

	s.jsonResponse(w, http.StatusOK, res)
}

func (s *Server) handleDashboardStats(w http.ResponseWriter, r *http.Request) {
	incidents := s.store.GetIncidents()
	activeIncidents := 0
	for _, inc := range incidents {
		if inc.Status == "frozen" || inc.Status == "open" || inc.Status == "restoring" {
			activeIncidents++
		}
	}

	runs := s.store.GetDetectionRuns(1)
	latestRun := models.DetectionRun{Verdict: "normal", RiskScore: 0, ThreatLevel: "LOW"}
	if len(runs) > 0 {
		latestRun = runs[0]
	}

	protectedFiles := s.store.GetProtectedFiles("protected")

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"ok":                true,
		"monitored_files":   len(protectedFiles),
		"active_incidents":  activeIncidents,
		"agents_online":     len(s.store.GetAgents()),
		"latest_verdict":    latestRun.Verdict,
		"latest_risk_score": latestRun.RiskScore,
		"threat_level":      latestRun.ThreatLevel,
		"timestamp":         time.Now().UTC().Format(time.RFC3339),
	})
}
