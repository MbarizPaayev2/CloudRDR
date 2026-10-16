package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"cloudrdr-agent/client"
	"cloudrdr-agent/collector"
	"cloudrdr-agent/config"
	"cloudrdr-agent/containment"
	"cloudrdr-agent/spooler"
)

const AgentVersion = "1.0.0"

func main() {
	banner()

	cfg := config.Load()
	log.Printf("[*] Initialising CloudRDR Go Agent v%s", AgentVersion)
	log.Printf("[*] Manager Target:     %s", cfg.ManagerURL)
	log.Printf("[*] Watch Directory:    %s", cfg.WatchDir)
	log.Printf("[*] Protected Bucket:   %s", cfg.Bucket)
	log.Printf("[*] Entropy Threshold:  %.2f (Shannon)", cfg.EntropyThreshold)

	apiClient := client.NewClient(cfg.ManagerURL, cfg.AgentKey)
	watchEngine := collector.NewWatcher(cfg.WatchDir, cfg.CanaryPatterns)
	eventSpooler := spooler.NewSpooler(cfg.SpoolDir, 1000)

	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "cloud-node"
	}

	// 1. Enrollment with Manager
	var agentId string
	log.Printf("[*] Contacting CloudRDR Manager for agent registration...")
	for {
		resp, err := apiClient.Register(client.RegisterPayload{
			Hostname:  hostname,
			IP:        "127.0.0.1",
			Platform:  runtime.GOOS,
			Version:   AgentVersion,
			AccountId: cfg.AccountId,
			Bucket:    cfg.Bucket,
		})

		if err != nil {
			log.Printf("[!] Registration failed (%v). Retrying in 5s...", err)
			time.Sleep(5 * time.Second)
			continue
		}

		agentId = resp.AgentId
		log.Printf("[+] Successfully registered with Manager! Agent ID: %s", agentId)
		break
	}

	// Context and stop channels
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	// 2. Heartbeat Goroutine (Wazuh-style keepalive)
	go func() {
		ticker := time.NewTicker(cfg.HeartbeatInterval)
		defer ticker.Stop()

		for range ticker.C {
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			ramMb := float64(m.Alloc) / 1024.0 / 1024.0

			_, err := apiClient.SendHeartbeat(client.HeartbeatPayload{
				AgentId:        agentId,
				CPUUsage:       0.5, // Lightweight kernel-mode watcher
				RAMUsageMb:     ramMb,
				FilesMonitored: 0,
				Status:         "online",
			})
			if err != nil {
				log.Printf("[!] Heartbeat warning: %v", err)
			}
		}
	}()

	// 3. Spool Dispatcher Goroutine
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			// Check if we have offline-spooled events to flush first
			recovered := eventSpooler.RecoverDiskEvents(cfg.MaxBatchSize)
			batch := recovered
			if len(batch) < cfg.MaxBatchSize {
				memEvents := eventSpooler.DrainMemory(cfg.MaxBatchSize - len(batch))
				batch = append(batch, memEvents...)
			}

			if len(batch) == 0 {
				continue
			}

			resp, err := apiClient.SendEvents(client.EventsPayload{
				AgentId:   agentId,
				AccountId: cfg.AccountId,
				Bucket:    cfg.Bucket,
				Events:    batch,
			})

			if err != nil {
				log.Printf("[!] Failed to dispatch %d events (%v). Spooling to disk.", len(batch), err)
				eventSpooler.SaveFailedBatch(batch)
				continue
			}

			log.Printf("[+] Dispatched %d events. Verdict: %s | Action: %s", resp.Processed, resp.Verdict, resp.Action)

			if resp.Action == "FREEZE" {
				log.Printf("[!] ================================================================")
				log.Printf("[!] [CRITICAL ALERT] CLOUDRDR MANAGER TRIGGERED WRITE-FREEZE!")
				log.Printf("[!] Ransomware outbreak detected on bucket '%s'! Incident ID: %s", cfg.Bucket, resp.IncidentId)
				log.Printf("[!] Agent executing active defense containment protocol.")
				log.Printf("[!] ================================================================")

				if err := containment.ExecuteHostFreeze(cfg.WatchDir); err != nil {
					log.Printf("[!] Host freeze execution failed: %v", err)
				} else {
					log.Printf("[ACTIVE DEFENSE] Successfully locked down directory: %s", cfg.WatchDir)
				}
			}
		}
	}()

	// 4. Main FIM Scanner Loop
	log.Printf("[+] Agent active and monitoring file integrity...")
	scanTicker := time.NewTicker(cfg.PollInterval)
	defer scanTicker.Stop()

	for {
		select {
		case <-scanTicker.C:
			events, fileCount := watchEngine.Scan()
			if len(events) > 0 {
				for _, ev := range events {
					canaryTag := ""
					if ev.IsCanary {
						canaryTag = " [CANARY TRAP TRIGGERED!]"
					}
					entropyTag := ""
					if ev.Entropy >= cfg.EntropyThreshold {
						entropyTag = fmt.Sprintf(" [HIGH ENTROPY: %.2f - ENCRYPTED?]", ev.Entropy)
					}

					log.Printf("[EVENT:%s] %s (Size: %d bytes)%s%s", ev.EventType, ev.Path, ev.Size, canaryTag, entropyTag)
				}
				eventSpooler.Push(events)
			}
			_ = fileCount

		case sig := <-stopChan:
			log.Printf("[*] Received shutdown signal (%v). Gracefully terminating CloudRDR Agent...", sig)
			return
		}
	}
}

func banner() {
	fmt.Println(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║          CloudRDR — High-Performance Cloud Agent              ║
  ║      Real-Time FIM • Shannon Entropy • Sub-second Containment ║
  ╚═══════════════════════════════════════════════════════════════╝`)
}
