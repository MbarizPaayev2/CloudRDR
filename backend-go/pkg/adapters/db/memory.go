package db

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"cloudrdr-backend/pkg/models"
)

type MemoryStore struct {
	sync.RWMutex
	filePath string

	ProtectedFiles    []models.ProtectedFile    `json:"protected_files"`
	BaselineSnapshots []models.BaselineSnapshot `json:"baseline_snapshots"`
	ChangeEvents      []models.ChangeEvent      `json:"change_events"`
	DetectionRuns     []models.DetectionRun     `json:"detection_runs"`
	Incidents         []models.Incident         `json:"incidents"`
	RestoreJobs       []models.RestoreJob       `json:"restore_jobs"`
	ConnectedAgents   []models.ConnectedAgent   `json:"connected_agents"`
	InternalUsers     []models.InternalUser     `json:"internal_users"`
	UserSessions      []models.UserSession      `json:"user_sessions"`
}

var (
	defaultStore     *MemoryStore
	defaultStoreOnce sync.Once
)

func GetDefaultStore() *MemoryStore {
	defaultStoreOnce.Do(func() {
		defaultStore = NewMemoryStore(filepath.Join("data", "db-storage.json"))
	})
	return defaultStore
}

func NewMemoryStore(filePath string) *MemoryStore {
	s := &MemoryStore{
		filePath:          filePath,
		ProtectedFiles:    make([]models.ProtectedFile, 0),
		BaselineSnapshots: make([]models.BaselineSnapshot, 0),
		ChangeEvents:      make([]models.ChangeEvent, 0),
		DetectionRuns:     make([]models.DetectionRun, 0),
		Incidents:         make([]models.Incident, 0),
		RestoreJobs:       make([]models.RestoreJob, 0),
		ConnectedAgents:   make([]models.ConnectedAgent, 0),
		InternalUsers:     make([]models.InternalUser, 0),
		UserSessions:      make([]models.UserSession, 0),
	}
	_ = s.Load()
	return s
}

func (s *MemoryStore) Load() error {
	s.Lock()
	defer s.Unlock()

	if s.filePath == "" {
		return nil
	}

	raw, err := os.ReadFile(s.filePath)
	if err != nil {
		return nil
	}

	return json.Unmarshal(raw, s)
}

func (s *MemoryStore) Save() error {
	s.RLock()
	defer s.RUnlock()

	if s.filePath == "" {
		return nil
	}

	_ = os.MkdirAll(filepath.Dir(s.filePath), 0755)
	raw, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, raw, 0644)
}

// Protected Files operations
func (s *MemoryStore) GetProtectedFiles(bucket string) []models.ProtectedFile {
	s.RLock()
	defer s.RUnlock()

	var res []models.ProtectedFile
	for _, f := range s.ProtectedFiles {
		if bucket == "" || f.Bucket == bucket {
			res = append(res, f)
		}
	}
	return res
}

func (s *MemoryStore) UpsertProtectedFiles(files []models.ProtectedFile) error {
	s.Lock()
	existingMap := make(map[string]int)
	for i, f := range s.ProtectedFiles {
		key := f.Bucket + ":" + f.Path
		existingMap[key] = i
	}

	for _, f := range files {
		key := f.Bucket + ":" + f.Path
		if idx, ok := existingMap[key]; ok {
			s.ProtectedFiles[idx] = f
		} else {
			s.ProtectedFiles = append(s.ProtectedFiles, f)
		}
	}
	s.Unlock()
	return s.Save()
}

// Change Events
func (s *MemoryStore) AppendChangeEvent(event models.ChangeEvent) error {
	s.Lock()
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	if event.ObservedAt.IsZero() {
		event.ObservedAt = time.Now().UTC()
	}
	s.ChangeEvents = append(s.ChangeEvents, event)
	s.Unlock()
	return s.Save()
}

func (s *MemoryStore) AppendChangeEvents(events []models.ChangeEvent) error {
	s.Lock()
	now := time.Now().UTC()
	for i := range events {
		if events[i].CreatedAt.IsZero() {
			events[i].CreatedAt = now
		}
		if events[i].ObservedAt.IsZero() {
			events[i].ObservedAt = now
		}
		s.ChangeEvents = append(s.ChangeEvents, events[i])
	}
	s.Unlock()
	return s.Save()
}

func (s *MemoryStore) GetRecentEvents(accountID string, since time.Time) []models.ChangeEvent {
	s.RLock()
	defer s.RUnlock()

	var res []models.ChangeEvent
	for _, e := range s.ChangeEvents {
		if (accountID == "" || e.AccountID == accountID) && !e.ObservedAt.Before(since) {
			res = append(res, e)
		}
	}
	return res
}

// Detection Runs
func (s *MemoryStore) SaveDetectionRun(run models.DetectionRun) error {
	s.Lock()
	if run.CreatedAt.IsZero() {
		run.CreatedAt = time.Now().UTC()
	}
	s.DetectionRuns = append(s.DetectionRuns, run)
	s.Unlock()
	return s.Save()
}

func (s *MemoryStore) GetDetectionRuns(limit int) []models.DetectionRun {
	s.RLock()
	defer s.RUnlock()

	count := len(s.DetectionRuns)
	if limit <= 0 || limit > count {
		limit = count
	}

	res := make([]models.DetectionRun, limit)
	for i := 0; i < limit; i++ {
		res[i] = s.DetectionRuns[count-1-i]
	}
	return res
}

// Incidents
func (s *MemoryStore) CreateIncident(inc models.Incident) (models.Incident, error) {
	s.Lock()
	if inc.CreatedAt.IsZero() {
		inc.CreatedAt = time.Now().UTC()
	}
	if inc.DetectedAt.IsZero() {
		inc.DetectedAt = time.Now().UTC()
	}
	inc.UpdatedAt = time.Now().UTC()
	s.Incidents = append(s.Incidents, inc)
	s.Unlock()
	_ = s.Save()
	return inc, nil
}

func (s *MemoryStore) FindActiveIncident(accountID string) (*models.Incident, error) {
	s.RLock()
	defer s.RUnlock()

	for i := len(s.Incidents) - 1; i >= 0; i-- {
		inc := s.Incidents[i]
		if inc.AccountID == accountID && (inc.Status == "open" || inc.Status == "frozen" || inc.Status == "restoring") {
			return &inc, nil
		}
	}
	return nil, nil
}

func (s *MemoryStore) UpdateIncidentStatus(id string, status string, updates map[string]interface{}) (*models.Incident, error) {
	s.Lock()
	defer s.Unlock()

	for i, inc := range s.Incidents {
		if inc.ID == id {
			s.Incidents[i].Status = status
			s.Incidents[i].UpdatedAt = time.Now().UTC()

			if paths, ok := updates["affected_paths"].([]string); ok {
				s.Incidents[i].AffectedPaths = paths
			}
			if frozenAt, ok := updates["frozen_at"].(*time.Time); ok {
				s.Incidents[i].FrozenAt = frozenAt
			}
			if resolvedAt, ok := updates["resolved_at"].(*time.Time); ok {
				s.Incidents[i].ResolvedAt = resolvedAt
			}
			if sig, ok := updates["record_signature"].(string); ok {
				s.Incidents[i].RecordSignature = sig
			}
			if kid, ok := updates["signing_key_id"].(string); ok {
				s.Incidents[i].SigningKeyID = kid
			}

			updated := s.Incidents[i]
			go s.Save()
			return &updated, nil
		}
	}
	return nil, nil
}

func (s *MemoryStore) GetIncidents() []models.Incident {
	s.RLock()
	defer s.RUnlock()

	res := make([]models.Incident, len(s.Incidents))
	for i := 0; i < len(s.Incidents); i++ {
		res[i] = s.Incidents[len(s.Incidents)-1-i]
	}
	return res
}

func (s *MemoryStore) GetIncident(id string) *models.Incident {
	s.RLock()
	defer s.RUnlock()

	for _, inc := range s.Incidents {
		if inc.ID == id {
			return &inc
		}
	}
	return nil
}

// Connected Agents
func (s *MemoryStore) UpsertAgent(agent models.ConnectedAgent) error {
	s.Lock()
	now := time.Now().UTC()
	agent.LastPingAt = now

	found := false
	for i, a := range s.ConnectedAgents {
		if a.AgentID == agent.AgentID {
			s.ConnectedAgents[i] = agent
			found = true
			break
		}
	}
	if !found {
		if agent.RegisteredAt.IsZero() {
			agent.RegisteredAt = now
		}
		s.ConnectedAgents = append(s.ConnectedAgents, agent)
	}
	s.Unlock()
	return s.Save()
}

func (s *MemoryStore) GetAgents() []models.ConnectedAgent {
	s.RLock()
	defer s.RUnlock()

	res := make([]models.ConnectedAgent, len(s.ConnectedAgents))
	copy(res, s.ConnectedAgents)
	return res
}
