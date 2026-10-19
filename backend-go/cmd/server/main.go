package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cloudrdr-backend/pkg/adapters/db"
	"cloudrdr-backend/pkg/adapters/storage"
	"cloudrdr-backend/pkg/api"
	"cloudrdr-backend/pkg/config"
)

const Banner = `
  ______ _                 _ _____  _____  _____  
 / _____) |               | (____ \|  __ \(_____) 
| /     | | ___  _   _  __| |____) ) |  | |_____) 
| |     | |/ _ \| | | |/ _  |  _  /| |  | |  _  / 
| \_____| | |_| | |_| ( (_| | | \ \| |__| | | \ \ 
 \______)_|\___/ \____|\____|_|  \_)_____/|_|  \_)
 Enterprise Autonomous Ransomware Detection & Recovery Core v2.0
 Engine: Go High-Throughput Ingestion & Detection Core (Hybrid Model)
`

func main() {
	fmt.Println(Banner)

	cfg := config.Load()
	log.Printf("[*] CloudRDR Enterprise Go Backend Core starting...")
	log.Printf("[*] Listening Port:        %d", cfg.Port)
	log.Printf("[*] Storage Provider:      %s (%s)", cfg.StorageProvider, cfg.LocalStoragePath)
	log.Printf("[*] Sliding Window:        %d seconds", cfg.WindowSeconds)
	log.Printf("[*] Entropy Threshold:     %.2f Shannon", cfg.EntropyThreshold)
	log.Printf("[*] Ransomware Rate:       %.2f (%.0f%%)", cfg.RansomwareRate, cfg.RansomwareRate*100)

	store := db.GetDefaultStore()
	log.Printf("[+] Persistent State Store loaded (Protected Files: %d, Incidents: %d)",
		len(store.ProtectedFiles), len(store.Incidents))

	storageAdapter := storage.NewLocalStorage(cfg.LocalStoragePath)
	server := api.NewServer(cfg, store, storageAdapter)

	httpServer := &http.Server{
		Addr:         fmt.Sprintf("0.0.0.0:%d", cfg.Port),
		Handler:      server,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown channel
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[+] CloudRDR Go Core listening on http://0.0.0.0:%d", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[!] Server fatal error: %v", err)
		}
	}()

	<-stopChan
	log.Printf("[*] Initiating graceful shutdown...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("[!] Shutdown error: %v", err)
	}

	_ = store.Save()
	log.Printf("[+] CloudRDR Go Core stopped safely.")
}
