package spooler

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"cloudrdr-agent/collector"
)

// Spooler manages an in-memory event buffer with persistent disk spooling on network loss.
type Spooler struct {
	spoolDir  string
	spoolFile string
	queue     []collector.FileChangeEvent
	mu        sync.Mutex
	maxMemory int
}

// NewSpooler creates a new Spooler.
func NewSpooler(spoolDir string, maxMemory int) *Spooler {
	_ = os.MkdirAll(spoolDir, 0755)
	return &Spooler{
		spoolDir:  spoolDir,
		spoolFile: filepath.Join(spoolDir, "events.spool"),
		queue:     make([]collector.FileChangeEvent, 0, maxMemory),
		maxMemory: maxMemory,
	}
}

// Push adds events to the queue or spools to disk if buffer is full.
func (s *Spooler) Push(events []collector.FileChangeEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, e := range events {
		if len(s.queue) < s.maxMemory {
			s.queue = append(s.queue, e)
		} else {
			_ = s.appendDisk(e)
		}
	}
}

// DrainMemory retrieves up to limit events from memory buffer.
func (s *Spooler) DrainMemory(limit int) []collector.FileChangeEvent {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.queue) == 0 {
		return nil
	}

	count := limit
	if count > len(s.queue) {
		count = len(s.queue)
	}

	batch := make([]collector.FileChangeEvent, count)
	copy(batch, s.queue[:count])
	s.queue = s.queue[count:]

	return batch
}

// SaveFailedBatch spools unacknowledged events to disk during network errors.
func (s *Spooler) SaveFailedBatch(events []collector.FileChangeEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, e := range events {
		_ = s.appendDisk(e)
	}
}

// RecoverDiskEvents reads spooled events from disk back into memory.
func (s *Spooler) RecoverDiskEvents(limit int) []collector.FileChangeEvent {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, err := os.Stat(s.spoolFile); os.IsNotExist(err) {
		return nil
	}

	f, err := os.Open(s.spoolFile)
	if err != nil {
		return nil
	}
	defer f.Close()

	var recovered []collector.FileChangeEvent
	var remainingLines []string

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if len(recovered) < limit {
			var ev collector.FileChangeEvent
			if err := json.Unmarshal([]byte(line), &ev); err == nil {
				recovered = append(recovered, ev)
				continue
			}
		}
		remainingLines = append(remainingLines, line)
	}

	// Rewrite remaining spooled lines
	if len(remainingLines) > 0 {
		_ = os.WriteFile(s.spoolFile, []byte(jsonJoin(remainingLines)), 0644)
	} else {
		_ = os.Remove(s.spoolFile)
	}

	return recovered
}

func (s *Spooler) appendDisk(event collector.FileChangeEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	f, err := os.OpenFile(s.spoolFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = f.Write(append(data, '\n'))
	return err
}

func jsonJoin(lines []string) string {
	res := ""
	for _, l := range lines {
		res += l + "\n"
	}
	return res
}
