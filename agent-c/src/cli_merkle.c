/**
 * @file cli_merkle.c
 *
 * Standalone CLI tool to compute SHA-256 and Merkle Root of input files.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/cloudrdr_sha256.h"
#include "../include/cloudrdr_merkle.h"

int main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s <file1> [file2] [file3] ...\n", argv[0]);
        return 1;
    }

    int file_count = argc - 1;
    char (*hashes)[CLOUDRDR_SHA256_HEX_SIZE] = malloc(file_count * sizeof(*hashes));
    const char **hash_ptrs = malloc(file_count * sizeof(char *));

    if (!hashes || !hash_ptrs) {
        fprintf(stderr, "[-] Out of memory\n");
        return 2;
    }

    printf("====================================================\n");
    printf("   CloudRDR Cryptographic Merkle DAG Calculation    \n");
    printf("====================================================\n");

    for (int i = 0; i < file_count; i++) {
        const char *filepath = argv[i + 1];
        size_t sz = 0;
        if (cloudrdr_sha256_file(filepath, hashes[i], &sz) != 0) {
            fprintf(stderr, "[-] Warning: unable to hash file: %s (using empty)\n", filepath);
            strncpy(hashes[i], "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", CLOUDRDR_SHA256_HEX_SIZE);
        }
        hash_ptrs[i] = hashes[i];
        printf("[%02d] %s -> %s\n", i + 1, filepath, hashes[i]);
    }

    char root[CLOUDRDR_SHA256_HEX_SIZE];
    cloudrdr_merkle_root(hash_ptrs, file_count, root);

    printf("----------------------------------------------------\n");
    printf("Total Leaves: %d\n", file_count);
    printf("Merkle Root:  %s\n", root);
    printf("====================================================\n");

    free(hashes);
    free(hash_ptrs);
    return 0;
}
