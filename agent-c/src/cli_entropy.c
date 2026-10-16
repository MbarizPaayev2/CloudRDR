/**
 * @file cli_entropy.c
 *
 * Standalone CLI tool to inspect Shannon byte entropy on files and folders.
 */

#include <stdio.h>
#include <stdlib.h>
#include "../include/cloudrdr_entropy.h"

int main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s <filepath>\n", argv[0]);
        return 1;
    }

    const char *filepath = argv[1];
    cloudrdr_entropy_result res;

    int ret = cloudrdr_analyze_file_entropy(filepath, &res);
    if (ret != 0) {
        fprintf(stderr, "[-] Error: failed to open or read file: %s\n", filepath);
        return 2;
    }

    printf("====================================================\n");
    printf("   CloudRDR Shannon Byte Entropy Analysis Engine    \n");
    printf("====================================================\n");
    printf("Target File:       %s\n", filepath);
    printf("Total Size:        %zu bytes\n", res.total_bytes);
    printf("Global Entropy:    %.4f / 8.0000 bits/byte\n", res.total_entropy);
    printf("Peak Block Entropy:%.4f / 8.0000 bits/byte (4KB chunks)\n", res.peak_block_entropy);
    printf("Threat Indicator:  %s\n",
           res.is_likely_encrypted ? "RANSOMWARE_ENCRYPTED_CIPHERTEXT (CRITICAL)" :
           res.is_suspicious ? "SUSPICIOUS_HIGH_ENTROPY (WARNING)" :
           "NORMAL_STRUCTURED_PLAINTEXT (SAFE)");
    printf("====================================================\n");

    return res.is_likely_encrypted ? 3 : 0;
}
