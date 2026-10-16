/**
 * @file cloudrdr_sha256.c
 *
 * Implementation of FIPS 180-4 / RFC 6234 SHA-256 Engine.
 */

#include "../include/cloudrdr_sha256.h"
#include <stdio.h>
#include <string.h>

#define ROTR(x, n) (((x) >> (n)) | ((x) << (32 - (n))))
#define CH(x, y, z) (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x, y, z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define SIGMA0(x) (ROTR(x, 2) ^ ROTR(x, 13) ^ ROTR(x, 22))
#define SIGMA1(x) (ROTR(x, 6) ^ ROTR(x, 11) ^ ROTR(x, 25))
#define SIGMA_LOWER0(x) (ROTR(x, 7) ^ ROTR(x, 18) ^ ((x) >> 3))
#define SIGMA_LOWER1(x) (ROTR(x, 17) ^ ROTR(x, 19) ^ ((x) >> 10))

static const uint32_t K[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

static void transform(uint32_t state[8], const uint8_t block[64]) {
    uint32_t w[64];
    for (int i = 0; i < 16; i++) {
        w[i] = ((uint32_t)block[i * 4] << 24) |
               ((uint32_t)block[i * 4 + 1] << 16) |
               ((uint32_t)block[i * 4 + 2] << 8) |
               ((uint32_t)block[i * 4 + 3]);
    }
    for (int i = 16; i < 64; i++) {
        w[i] = SIGMA_LOWER1(w[i - 2]) + w[i - 7] + SIGMA_LOWER0(w[i - 15]) + w[i - 16];
    }

    uint32_t a = state[0], b = state[1], c = state[2], d = state[3];
    uint32_t e = state[4], f = state[5], g = state[6], h = state[7];

    for (int i = 0; i < 64; i++) {
        uint32_t t1 = h + SIGMA1(e) + CH(e, f, g) + K[i] + w[i];
        uint32_t t2 = SIGMA0(a) + MAJ(a, b, c);
        h = g;
        g = f;
        f = e;
        e = d + t1;
        d = c;
        c = b;
        b = a;
        a = t1 + t2;
    }

    state[0] += a;
    state[1] += b;
    state[2] += c;
    state[3] += d;
    state[4] += e;
    state[5] += f;
    state[6] += g;
    state[7] += h;
}

void cloudrdr_sha256_init(cloudrdr_sha256_ctx *ctx) {
    if (!ctx) return;
    ctx->state[0] = 0x6a09e667;
    ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372;
    ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f;
    ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab;
    ctx->state[7] = 0x5be0cd19;
    ctx->count = 0;
    memset(ctx->buffer, 0, sizeof(ctx->buffer));
}

void cloudrdr_sha256_update(cloudrdr_sha256_ctx *ctx, const void *data, size_t len) {
    if (!ctx || !data || len == 0) return;

    const uint8_t *p = (const uint8_t *)data;
    size_t buffer_idx = (size_t)(ctx->count & 0x3F);
    ctx->count += len;

    if (buffer_idx > 0) {
        size_t left = CLOUDRDR_SHA256_BLOCK_SIZE - buffer_idx;
        if (len < left) {
            memcpy(&ctx->buffer[buffer_idx], p, len);
            return;
        }
        memcpy(&ctx->buffer[buffer_idx], p, left);
        transform(ctx->state, ctx->buffer);
        p += left;
        len -= left;
    }

    while (len >= CLOUDRDR_SHA256_BLOCK_SIZE) {
        transform(ctx->state, p);
        p += CLOUDRDR_SHA256_BLOCK_SIZE;
        len -= CLOUDRDR_SHA256_BLOCK_SIZE;
    }

    if (len > 0) {
        memcpy(ctx->buffer, p, len);
    }
}

void cloudrdr_sha256_final(cloudrdr_sha256_ctx *ctx, uint8_t digest[CLOUDRDR_SHA256_DIGEST_SIZE]) {
    if (!ctx || !digest) return;

    size_t buffer_idx = (size_t)(ctx->count & 0x3F);
    uint64_t total_bits = ctx->count * 8;

    ctx->buffer[buffer_idx++] = 0x80;

    if (buffer_idx > 56) {
        memset(&ctx->buffer[buffer_idx], 0, CLOUDRDR_SHA256_BLOCK_SIZE - buffer_idx);
        transform(ctx->state, ctx->buffer);
        buffer_idx = 0;
    }

    memset(&ctx->buffer[buffer_idx], 0, 56 - buffer_idx);

    for (int i = 7; i >= 0; i--) {
        ctx->buffer[56 + (7 - i)] = (uint8_t)((total_bits >> (i * 8)) & 0xFF);
    }

    transform(ctx->state, ctx->buffer);

    for (int i = 0; i < 8; i++) {
        digest[i * 4]     = (uint8_t)((ctx->state[i] >> 24) & 0xFF);
        digest[i * 4 + 1] = (uint8_t)((ctx->state[i] >> 16) & 0xFF);
        digest[i * 4 + 2] = (uint8_t)((ctx->state[i] >> 8) & 0xFF);
        digest[i * 4 + 3] = (uint8_t)(ctx->state[i] & 0xFF);
    }
}

void cloudrdr_sha256_buffer(const void *data, size_t len, uint8_t digest[CLOUDRDR_SHA256_DIGEST_SIZE]) {
    cloudrdr_sha256_ctx ctx;
    cloudrdr_sha256_init(&ctx);
    cloudrdr_sha256_update(&ctx, data, len);
    cloudrdr_sha256_final(&ctx, digest);
}

void cloudrdr_sha256_to_hex(const uint8_t digest[CLOUDRDR_SHA256_DIGEST_SIZE], char hex_out[CLOUDRDR_SHA256_HEX_SIZE]) {
    static const char digits[] = "0123456789abcdef";
    if (!digest || !hex_out) return;
    for (int i = 0; i < CLOUDRDR_SHA256_DIGEST_SIZE; i++) {
        hex_out[i * 2]     = digits[(digest[i] >> 4) & 0x0F];
        hex_out[i * 2 + 1] = digits[digest[i] & 0x0F];
    }
    hex_out[64] = '\0';
}

int cloudrdr_sha256_file(const char *filepath, char hex_out[CLOUDRDR_SHA256_HEX_SIZE], size_t *out_size) {
    if (!filepath || !hex_out) return -1;

    FILE *f = fopen(filepath, "rb");
    if (!f) return -1;

    cloudrdr_sha256_ctx ctx;
    cloudrdr_sha256_init(&ctx);

    uint8_t chunk[16384];
    size_t total = 0;
    size_t n;

    while ((n = fread(chunk, 1, sizeof(chunk), f)) > 0) {
        cloudrdr_sha256_update(&ctx, chunk, n);
        total += n;
    }

    fclose(f);

    uint8_t digest[CLOUDRDR_SHA256_DIGEST_SIZE];
    cloudrdr_sha256_final(&ctx, digest);
    cloudrdr_sha256_to_hex(digest, hex_out);

    if (out_size) {
        *out_size = total;
    }
    return 0;
}
