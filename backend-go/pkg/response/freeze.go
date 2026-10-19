package response

import (
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

var (
	frozenAccountsMutex sync.RWMutex
	frozenAccounts      = make(map[string]time.Time)
)

// ApplyLocalFilesystemFreeze locks a directory at the OS filesystem level
func ApplyLocalFilesystemFreeze(dirPath string) bool {
	if dirPath == "" {
		return false
	}
	absPath, err := filepath.Abs(dirPath)
	if err != nil {
		absPath = dirPath
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return false
	}

	if runtime.GOOS == "windows" {
		// Windows: Universal SID *S-1-1-0 (Everyone) write-deny
		cmd := exec.Command("icacls", absPath, "/deny", "*S-1-1-0:(W)")
		if err := cmd.Run(); err != nil {
			log.Printf("[!] freeze: icacls write-deny warning: %v", err)
			return false
		}
		log.Printf("[+] freeze: applied OS filesystem write-lock on %s", absPath)
		return true
	}

	// Linux / macOS: Remove write permissions
	cmd := exec.Command("chmod", "-R", "a-w", absPath)
	if err := cmd.Run(); err != nil {
		log.Printf("[!] freeze: chmod write-lock warning: %v", err)
		return false
	}
	log.Printf("[+] freeze: applied OS filesystem write-lock on %s", absPath)
	return true
}

// RemoveLocalFilesystemFreeze lifts the write-lock on a directory
func RemoveLocalFilesystemFreeze(dirPath string) bool {
	if dirPath == "" {
		return false
	}
	absPath, err := filepath.Abs(dirPath)
	if err != nil {
		absPath = dirPath
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return false
	}

	if runtime.GOOS == "windows" {
		cmd := exec.Command("icacls", absPath, "/remove:d", "*S-1-1-0")
		if err := cmd.Run(); err != nil {
			log.Printf("[!] freeze: icacls remove warning: %v", err)
			return false
		}
		log.Printf("[+] freeze: lifted OS filesystem write-lock on %s", absPath)
		return true
	}

	cmd := exec.Command("chmod", "-R", "u+w", absPath)
	if err := cmd.Run(); err != nil {
		log.Printf("[!] freeze: chmod unfreeze warning: %v", err)
		return false
	}
	log.Printf("[+] freeze: lifted OS filesystem write-lock on %s", absPath)
	return true
}

// FreezeAccount applies dual-layer containment (IAM & local filesystem lock)
func FreezeAccount(accountID string, localPath string) (bool, time.Time) {
	frozenAccountsMutex.Lock()
	defer frozenAccountsMutex.Unlock()

	now := time.Now().UTC()
	frozenAccounts[accountID] = now

	if localPath != "" {
		_ = ApplyLocalFilesystemFreeze(localPath)
	}

	log.Printf("[+] freezeClient: account %s successfully frozen at %s", accountID, now.Format(time.RFC3339))
	return true, now
}

// UnfreezeAccount lifts containment for an account
func UnfreezeAccount(accountID string, localPath string) bool {
	frozenAccountsMutex.Lock()
	defer frozenAccountsMutex.Unlock()

	delete(frozenAccounts, accountID)

	if localPath != "" {
		_ = RemoveLocalFilesystemFreeze(localPath)
	}

	log.Printf("[+] freezeClient: account %s unfrozen", accountID)
	return true
}

// IsAccountFrozen checks if account is currently frozen
func IsAccountFrozen(accountID string) bool {
	frozenAccountsMutex.RLock()
	defer frozenAccountsMutex.RUnlock()
	_, ok := frozenAccounts[accountID]
	return ok
}
