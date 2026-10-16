package collector

import (
	"os"
	"os/user"
)

// ProcessContext captures active process metadata for forensic attribution.
type ProcessContext struct {
	PID      int    `json:"pid"`
	Username string `json:"username"`
	Hostname string `json:"hostname"`
}

// GetProcessContext retrieves current host and execution context.
func GetProcessContext() ProcessContext {
	pid := os.Getpid()
	hostname, _ := os.Hostname()

	username := "unknown"
	if u, err := user.Current(); err == nil && u != nil {
		username = u.Username
	}

	return ProcessContext{
		PID:      pid,
		Username: username,
		Hostname: hostname,
	}
}
