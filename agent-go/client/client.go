package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"cloudrdr-agent/collector"
)

// Client handles HTTP communication with the CloudRDR Manager API.
type Client struct {
	managerURL string
	agentKey   string
	httpClient *http.Client
}

// NewClient creates a new Manager API client.
func NewClient(managerURL, agentKey string) *Client {
	return &Client{
		managerURL: managerURL,
		agentKey:   agentKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// RegisterPayload sent during enrollment.
type RegisterPayload struct {
	Hostname  string `json:"hostname"`
	IP        string `json:"ip"`
	Platform  string `json:"platform"`
	Version   string `json:"version"`
	AccountId string `json:"accountId"`
	Bucket    string `json:"bucket"`
}

// RegisterResponse returned by Manager.
type RegisterResponse struct {
	OK      bool   `json:"ok"`
	AgentId string `json:"agentId"`
	Token   string `json:"token"`
	Config  struct {
		IntervalSeconds     int     `json:"intervalSeconds"`
		DetectionWindow     int     `json:"detectionWindow"`
		RansomwareThreshold float64 `json:"ransomwareThreshold"`
		Bucket              string  `json:"bucket"`
	} `json:"config"`
}

// Register registers the agent with the Manager.
func (c *Client) Register(payload RegisterPayload) (*RegisterResponse, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/api/agent/register", c.managerURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Key", c.agentKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("register failed with status %d", resp.StatusCode)
	}

	var res RegisterResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return &res, nil
}

// HeartbeatPayload sent periodically.
type HeartbeatPayload struct {
	AgentId        string  `json:"agentId"`
	CPUUsage       float64 `json:"cpuUsage"`
	RAMUsageMb     float64 `json:"ramUsageMb"`
	FilesMonitored int     `json:"filesMonitored"`
	Status         string  `json:"status"`
}

// HeartbeatResponse from Manager.
type HeartbeatResponse struct {
	OK             bool   `json:"ok"`
	AcknowledgedAt string `json:"acknowledgedAt"`
	Command        string `json:"command"` // "CONTINUE" or "FREEZE"
}

// SendHeartbeat pings Manager with operational metrics.
func (c *Client) SendHeartbeat(payload HeartbeatPayload) (*HeartbeatResponse, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/api/agent/heartbeat", c.managerURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Key", c.agentKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("heartbeat failed with status %d", resp.StatusCode)
	}

	var res HeartbeatResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return &res, nil
}

// EventsPayload for batch change ingestion.
type EventsPayload struct {
	AgentId   string                      `json:"agentId"`
	AccountId string                      `json:"accountId"`
	Bucket    string                      `json:"bucket"`
	Events    []collector.FileChangeEvent `json:"events"`
}

// EventsResponse from Manager with detection verdict.
type EventsResponse struct {
	OK         bool   `json:"ok"`
	Processed  int    `json:"processed"`
	Verdict    string `json:"verdict"` // "normal", "suspicious", "ransomware"
	Action     string `json:"action"`  // "CONTINUE", "FREEZE"
	IncidentId string `json:"incidentId,omitempty"`
}

// SendEvents dispatches a batch of events to the Manager.
func (c *Client) SendEvents(payload EventsPayload) (*EventsResponse, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/api/agent/events", c.managerURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Key", c.agentKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("events ingestion failed with status %d", resp.StatusCode)
	}

	var res EventsResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return &res, nil
}
