/**
 * @file cloudrdr_merkle.h
 *
 * Pairwise Binary Merkle Tree & DAG Root Engine in C.
 * Exactly compatible with CloudRDR cryptographic specification:
 * SHA-256(hex_left || hex_right) with odd-leaf duplicate padding.
 */

#ifndef CLOUDRDR_MERKLE_H
#define CLOUDRDR_MERKLE_H

#include <stddef.h>
#include "cloudrdr_sha256.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Compute the Merkle root of an array of 64-character hex leaf hashes.
 * @param leaves Array of null-terminated 64-character hexadecimal SHA-256 strings.
 * @param count Number of leaf hashes in array.
 * @param out_root Output buffer (must be at least 65 bytes).
 * @return 0 on success, non-zero on error.
 */
int cloudrdr_merkle_root(const char **leaves, size_t count, char out_root[CLOUDRDR_SHA256_HEX_SIZE]);

#ifdef __cplusplus
}
#endif

#endif /* CLOUDRDR_MERKLE_H */
