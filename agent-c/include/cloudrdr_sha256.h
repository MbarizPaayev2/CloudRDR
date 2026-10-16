/**
 * @file cloudrdr_sha256.h
 *
 * Standalone FIPS 180-4 / RFC 6234 Compliant SHA-256 Cryptographic Engine.
 * Provides streaming block-based hashing for large filesystem objects.
 */

#ifndef CLOUDRDR_SHA256_H
#define CLOUDRDR_SHA256_H

#include <stddef.h>
#include <stdint.h>

#define CLOUDRDR_SHA256_BLOCK_SIZE  64
#define CLOUDRDR_SHA256_DIGEST_SIZE 32
#define CLOUDRDR_SHA256_HEX_SIZE    65

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint32_t state[8];
    uint64_t count;
    uint8_t buffer[CLOUDRDR_SHA256_BLOCK_SIZE];
} cloudrdr_sha256_ctx;

/**
 * Initialize SHA-256 context.
 */
void cloudrdr_sha256_init(cloudrdr_sha256_ctx *ctx);

/**
 * Feed data chunk into context.
 */
void cloudrdr_sha256_update(cloudrdr_sha256_ctx *ctx, const void *data, size_t len);

/**
 * Finalize hash and write 32-byte binary digest.
 */
void cloudrdr_sha256_final(cloudrdr_sha256_ctx *ctx, uint8_t digest[CLOUDRDR_SHA256_DIGEST_SIZE]);

/**
 * Compute SHA-256 digest of an in-memory buffer.
 */
void cloudrdr_sha256_buffer(const void *data, size_t len, uint8_t digest[CLOUDRDR_SHA256_DIGEST_SIZE]);

/**
 * Convert 32-byte binary digest into 64-character lowercase hexadecimal string (null-terminated).
 */
void cloudrdr_sha256_to_hex(const uint8_t digest[CLOUDRDR_SHA256_DIGEST_SIZE], char hex_out[CLOUDRDR_SHA256_HEX_SIZE]);

/**
 * Compute SHA-256 hex digest of a file path on disk using buffered streaming.
 * Returns 0 on success, non-zero on I/O error.
 */
int cloudrdr_sha256_file(const char *filepath, char hex_out[CLOUDRDR_SHA256_HEX_SIZE], size_t *out_size);

#ifdef __cplusplus
}
#endif

#endif /* CLOUDRDR_SHA256_H */
