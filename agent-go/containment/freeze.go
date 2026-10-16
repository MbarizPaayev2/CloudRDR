package containment

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"runtime"
)

// ExecuteHostFreeze applies an immediate local write-lock to the protected directory.
func ExecuteHostFreeze(watchDir string) error {
	log.Printf("[ACTIVE DEFENSE] Executing immediate local write-freeze on: %s", watchDir)

	switch runtime.GOOS {
	case "windows":
		// Use icacls to deny write permissions to all users
		cmd := exec.Command("icacls", watchDir, "/deny", "*S-1-1-0:(W)")
		if out, err := cmd.CombinedOutput(); err != nil {
			log.Printf("[!] icacls freeze warning: %v (%s)", err, string(out))
			return err
		}
		log.Printf("[CONTAINED] Directory write-lock engaged via Windows ACLs.")
		return nil

	case "linux", "darwin":
		// Remove write permissions recursively
		cmd := exec.Command("chmod", "-R", "a-w", watchDir)
		if out, err := cmd.CombinedOutput(); err != nil {
			// Fallback: try os.Chmod on the directory itself
			_ = os.Chmod(watchDir, 0555)
			log.Printf("[!] chmod freeze warning: %v (%s)", err, string(out))
			return err
		}
		log.Printf("[CONTAINED] Directory write-lock engaged via POSIX permissions.")
		return nil

	default:
		return fmt.Errorf("unsupported platform for local freeze: %s", runtime.GOOS)
	}
}

// ExecuteHostUnfreeze lifts the local write-lock after operator verifies recovery.
func ExecuteHostUnfreeze(watchDir string) error {
	log.Printf("[RECOVERY] Lifting local write-freeze on: %s", watchDir)

	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("icacls", watchDir, "/remove:d", "*S-1-1-0")
		if out, err := cmd.CombinedOutput(); err != nil {
			log.Printf("[!] icacls unfreeze warning: %v (%s)", err, string(out))
			return err
		}
		log.Printf("[RESTORED] Directory write permissions restored.")
		return nil

	case "linux", "darwin":
		cmd := exec.Command("chmod", "-R", "u+w", watchDir)
		if out, err := cmd.CombinedOutput(); err != nil {
			_ = os.Chmod(watchDir, 0755)
			log.Printf("[!] chmod unfreeze warning: %v (%s)", err, string(out))
			return err
		}
		log.Printf("[RESTORED] Directory write permissions restored.")
		return nil

	default:
		return fmt.Errorf("unsupported platform for local unfreeze: %s", runtime.GOOS)
	}
}
