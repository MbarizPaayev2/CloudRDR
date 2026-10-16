/**
 * @file cloudrdr_merkle.c
 *
 * Implementation of Pairwise Binary Merkle Tree & DAG Root Engine.
 */

#include "../include/cloudrdr_merkle.h"
#include <stdlib.h>
#include <string.h>

int cloudrdr_merkle_root(const char **leaves, size_t count, char out_root[CLOUDRDR_SHA256_HEX_SIZE]) {
    if (!out_root) return -1;

    if (!leaves || count == 0) {
        /* SHA-256 of empty string */
        uint8_t empty_digest[CLOUDRDR_SHA256_DIGEST_SIZE];
        cloudrdr_sha256_buffer("", 0, empty_digest);
        cloudrdr_sha256_to_hex(empty_digest, out_root);
        return 0;
    }

    if (count == 1) {
        strncpy(out_root, leaves[0], CLOUDRDR_SHA256_HEX_SIZE);
        out_root[64] = '\0';
        return 0;
    }

    /* Allocate working layer buffer */
    char (*current_layer)[CLOUDRDR_SHA256_HEX_SIZE] = malloc(count * sizeof(*current_layer));
    if (!current_layer) return -2;

    for (size_t i = 0; i < count; i++) {
        strncpy(current_layer[i], leaves[i], CLOUDRDR_SHA256_HEX_SIZE);
        current_layer[i][64] = '\0';
    }

    size_t layer_size = count;

    while (layer_size > 1) {
        size_t next_size = (layer_size + 1) / 2;
        char (*next_layer)[CLOUDRDR_SHA256_HEX_SIZE] = malloc(next_size * sizeof(*next_layer));
        if (!next_layer) {
            free(current_layer);
            return -2;
        }

        for (size_t i = 0; i < layer_size; i += 2) {
            const char *left = current_layer[i];
            const char *right = (i + 1 < layer_size) ? current_layer[i + 1] : current_layer[i];

            char concat[129];
            memcpy(concat, left, 64);
            memcpy(concat + 64, right, 64);
            concat[128] = '\0';

            uint8_t digest[CLOUDRDR_SHA256_DIGEST_SIZE];
            cloudrdr_sha256_buffer(concat, 128, digest);
            cloudrdr_sha256_to_hex(digest, next_layer[i / 2]);
        }

        free(current_layer);
        current_layer = next_layer;
        layer_size = next_size;
    }

    memcpy(out_root, current_layer[0], CLOUDRDR_SHA256_HEX_SIZE);
    free(current_layer);
    return 0;
}
