package models

import "time"

// ProtectedFile represents an enterprise file baseline record
type ProtectedFile struct {
	ID              string    `json:"id"`
	Bucket          string    `json:"bucket"`
	Path            string    `json:"path"`
	SizeBytes       int64     `json:"size_bytes"`
	BaselineSHA256  string    `json:"baseline_sha256"`
	BaselineVersion int       `json:"baseline_version"`
	IsCanary        bool      `json:"is_canary"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// BaselineSnapshot represents a point-in-time Merkle DAG snapshot
type BaselineSnapshot struct {
	ID         string    `json:"id"`
	Bucket     string    `json:"bucket"`
	MerkleRoot string    `json:"merkle_root"`
	FileCount  int       `json:"file_count"`
	CreatedAt  time.Time `json:"created_at"`
	CreatedBy  string    `json:"created_by"`
}

// ChangeEvent represents high-frequency file telemetry from agents
type ChangeEvent struct {
	ID              string    `json:"id"`
	AccountID       string    `json:"account_id"`
	Bucket          string    `json:"bucket"`
	Path            string    `json:"path"`
	EventType       string    `json:"event_type"` // created, modified, deleted
	ObservedSHA256  string    `json:"observed_sha256,omitempty"`
	ObservedAt      time.Time `json:"observed_at"`
	MatchedBaseline bool      `json:"matched_baseline"`
	Entropy         float64   `json:"entropy,omitempty"`
	IsCanary        bool      `json:"is_canary"`
	ProcessPath     string    `json:"process_path,omitempty"`
	CommandLine     string    `json:"command_line,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// DetectionRun represents the result of a sliding-window threat evaluation
type DetectionRun struct {
	ID             string    `json:"id"`
	AccountID      string    `json:"account_id"`
	WindowSeconds  int       `json:"window_seconds"`
	TotalFiles     int       `json:"total_files"`
	ChangedFiles   int       `json:"changed_files"`
	ChangeRate     float64   `json:"change_rate"`
	Threshold      float64   `json:"threshold"`
	CanaryTriggered bool     `json:"canary_triggered"`
	Verdict        string    `json:"verdict"` // normal, suspicious, ransomware
	RiskScore      int       `json:"risk_score"`
	ThreatLevel    string    `json:"threat_level"` // LOW, MEDIUM, HIGH, CRITICAL
	Confidence     float64   `json:"confidence"`
	AffectedPaths  []string  `json:"affected_paths,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// Incident represents an active or resolved security containment incident
type Incident struct {
	ID              string                 `json:"id"`
	DetectionRunID  string                 `json:"detection_run_id,omitempty"`
	AccountID       string                 `json:"account_id"`
	Bucket          string                 `json:"bucket,omitempty"`
	Status          string                 `json:"status"` // open, frozen, freeze_failed, acknowledged, restoring, resolved, closed
	AffectedPaths   []string               `json:"affected_paths"`
	DetectedAt      time.Time              `json:"detected_at"`
	FrozenAt        *time.Time             `json:"frozen_at,omitempty"`
	ResolvedAt      *time.Time             `json:"resolved_at,omitempty"`
	RecordJSON      map[string]interface{} `json:"record_json,omitempty"`
	RecordSignature string                 `json:"record_signature,omitempty"`
	SigningKeyID    string                 `json:"signing_key_id,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// RestoreJob represents a verified recovery operation
type RestoreJob struct {
	ID            string     `json:"id"`
	IncidentID    string     `json:"incident_id"`
	Status        string     `json:"status"` // running, staged, completed, failed
	TotalFiles    int        `json:"total_files"`
	ValidFiles    int        `json:"valid_files"`
	ModifiedFiles int        `json:"modified_files"`
	StartedAt     time.Time  `json:"started_at"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
}

// ConnectedAgent represents an enrolled endpoint agent
type ConnectedAgent struct {
	ID             string    `json:"id"`
	AgentID        string    `json:"agent_id"`
	Token          string    `json:"token"`
	Hostname       string    `json:"hostname"`
	IPAddress      string    `json:"ip_address"`
	Platform       string    `json:"platform"`
	Version        string    `json:"version"`
	AccountID      string    `json:"account_id"`
	Bucket         string    `json:"bucket"`
	Status         string    `json:"status"` // online, offline
	CPUUsage       float64   `json:"cpu_usage"`
	RAMUsageMB     float64   `json:"ram_usage_mb"`
	FilesMonitored int       `json:"files_monitored"`
	LastPingAt     time.Time `json:"last_ping_at"`
	RegisteredAt   time.Time `json:"registered_at"`
}

// InternalUser represents an authorized portal operator
type InternalUser struct {
	ID           string    `json:"id"`
	FullName     string    `json:"full_name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"` // admin, analyst, auditor, operator
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

// UserSession represents an active authenticated JWT/token session
type UserSession struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	SessionToken string    `json:"session_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	Revoked      bool      `json:"revoked"`
}
