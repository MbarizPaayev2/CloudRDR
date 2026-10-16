/**
 * @file cloudrdr_entropy.c
 *
 * Implementation of Shannon Byte Entropy Engine.
 */

#include "../include/cloudrdr_entropy.h"
#include <stdio.h>
#include <string.h>
#include <math.h>

double cloudrdr_calculate_entropy(const uint8_t *data, size_t len) {
    if (!data || len == 0) {
        return 0.0;
    }

    size_t counts[256];
    memset(counts, 0, sizeof(counts));

    for (size_t i = 0; i < len; i++) {
        counts[data[i]]++;
    }

    double entropy = 0.0;
    double d_len = (double)len;
    double log2_inv = 1.0 / log(2.0);

    for (int i = 0; i < 256; i++) {
        if (counts[i] > 0) {
            double p = (double)counts[i] / d_len;
            entropy -= p * (log(p) * log2_inv);
        }
    }

    return entropy;
}

int cloudrdr_analyze_file_entropy(const char *filepath, cloudrdr_entropy_result *out_result) {
    if (!filepath || !out_result) {
        return -1;
    }

    memset(out_result, 0, sizeof(cloudrdr_entropy_result));

    FILE *f = fopen(filepath, "rb");
    if (!f) {
        return -1;
    }

    uint8_t buffer[CLOUDRDR_ENTROPY_BLOCK_SIZE];
    size_t bytes_read;
    double peak_entropy = 0.0;

    while ((bytes_read = fread(buffer, 1, sizeof(buffer), f)) > 0) {
        out_result->total_bytes += bytes_read;

        for (size_t i = 0; i < bytes_read; i++) {
            out_result->byte_counts[buffer[i]]++;
        }

        double block_entropy = cloudrdr_calculate_entropy(buffer, bytes_read);
        if (block_entropy > peak_entropy) {
            peak_entropy = block_entropy;
        }
    }

    fclose(f);

    if (out_result->total_bytes == 0) {
        out_result->total_entropy = 0.0;
        out_result->peak_block_entropy = 0.0;
        out_result->is_likely_encrypted = false;
        out_result->is_suspicious = false;
        return 0;
    }

    double total_entropy = 0.0;
    double d_total = (double)out_result->total_bytes;
    double log2_inv = 1.0 / log(2.0);

    for (int i = 0; i < 256; i++) {
        if (out_result->byte_counts[i] > 0) {
            double p = (double)out_result->byte_counts[i] / d_total;
            total_entropy -= p * (log(p) * log2_inv);
        }
    }

    out_result->total_entropy = total_entropy;
    out_result->peak_block_entropy = peak_entropy;
    out_result->is_likely_encrypted = (total_entropy >= CLOUDRDR_ENTROPY_RANSOMWARE_THRESHOLD);
    out_result->is_suspicious = (total_entropy >= CLOUDRDR_ENTROPY_SUSPICIOUS_THRESHOLD);

    return 0;
}
