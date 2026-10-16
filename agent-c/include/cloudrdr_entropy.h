/**
 * @file cloudrdr_entropy.h
 *
 * High-Speed Shannon Byte Entropy Engine for Low-Level Threat Heuristics.
 * Used to classify plain text, structured binaries, and encrypted ransomware payloads.
 */

#ifndef CLOUDRDR_ENTROPY_H
#define CLOUDRDR_ENTROPY_H

#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>

#define CLOUDRDR_ENTROPY_RANSOMWARE_THRESHOLD 7.50
#define CLOUDRDR_ENTROPY_SUSPICIOUS_THRESHOLD 7.00
#define CLOUDRDR_ENTROPY_BLOCK_SIZE           4096

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    double total_entropy;         /* Global file Shannon entropy (0.00 to 8.00) */
    double peak_block_entropy;    /* Maximum entropy observed in any 4KB block */
    size_t byte_counts[256];      /* Byte frequency distribution histogram */
    size_t total_bytes;           /* Total analyzed bytes */
    bool is_likely_encrypted;     /* total_entropy >= CLOUDRDR_ENTROPY_RANSOMWARE_THRESHOLD */
    bool is_suspicious;           /* total_entropy >= CLOUDRDR_ENTROPY_SUSPICIOUS_THRESHOLD */
} cloudrdr_entropy_result;

/**
 * Calculate Shannon entropy of an in-memory byte buffer.
 * Returns value between 0.00 (uniform byte) and 8.00 (maximum randomness).
 */
double cloudrdr_calculate_entropy(const uint8_t *data, size_t len);

/**
 * Perform comprehensive entropy analysis on a file, including block-level inspection.
 * Returns 0 on success, non-zero on file I/O error.
 */
int cloudrdr_analyze_file_entropy(const char *filepath, cloudrdr_entropy_result *out_result);

#ifdef __cplusplus
}
#endif

#endif /* CLOUDRDR_ENTROPY_H */
