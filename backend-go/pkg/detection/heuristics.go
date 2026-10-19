package detection

import (
	"bytes"
	"regexp"
	"strings"

	"cloudrdr-backend/pkg/models"
)

var (
	RansomwareExtRegex = regexp.MustCompile(`(?i)\.(locked|crypto|crypt|enc|crypted|lockbit|blackcat|wncry|mallox|phobos|stop|djvu|r5a|akira|rhysida|medusa|bianlian|play|cactus|clop|blacksuit|inc|hunters|qilin|babuk|conti|hive|revil)$`)
	RansomNoteRegex    = regexp.MustCompile(`(?i)(how_to_decrypt|readme_to_decrypt|restore_files|decrypt_files|read_me|recover_files|recovery_instructions|instructions|!readme|help_decrypt|readme_restore)\.(txt|html|hta|rtf)$`)
)

var magicSignatures = map[string][]byte{
	"pdf": {0x25, 0x50, 0x44, 0x46},             // %PDF
	"png": {0x89, 0x50, 0x4e, 0x47},             // \x89PNG
	"jpg": {0xff, 0xd8, 0xff},                   // \xFF\xD8\xFF
	"zip": {0x50, 0x4b, 0x03, 0x04},             // PK\x03\x04
	"docx": {0x50, 0x4b, 0x03, 0x04},
	"xlsx": {0x50, 0x4b, 0x03, 0x04},
}

type HeuristicResult struct {
	RansomwareExtensionsFound []string
	RansomNotesFound          []string
	MagicByteCorruptionsFound []string
	HeuristicTriggered        bool
}

// ScanHeuristics scans events for known ransomware extensions, ransom note drops, and corruption
func ScanHeuristics(events []models.ChangeEvent) HeuristicResult {
	var extensions []string
	var notes []string
	var corruptions []string

	for _, e := range events {
		p := strings.ToLower(e.Path)
		if RansomNoteRegex.MatchString(p) {
			notes = append(notes, e.Path)
		}
		if RansomwareExtRegex.MatchString(p) {
			extensions = append(extensions, e.Path)
		}
	}

	return HeuristicResult{
		RansomwareExtensionsFound: extensions,
		RansomNotesFound:          notes,
		MagicByteCorruptionsFound: corruptions,
		HeuristicTriggered:        len(extensions) > 0 || len(notes) > 0 || len(corruptions) > 0,
	}
}

// VerifyMagicBytes checks if the initial bytes match the expected format
func VerifyMagicBytes(filePath string, header []byte) bool {
	lower := strings.ToLower(filePath)
	for ext, sig := range magicSignatures {
		if strings.HasSuffix(lower, "."+ext) {
			if len(header) < len(sig) {
				return false
			}
			return bytes.Equal(header[:len(sig)], sig)
		}
	}
	return true
}
