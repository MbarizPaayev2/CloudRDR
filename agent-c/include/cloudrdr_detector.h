/**
 * @file cloudrdr_detector.h
 *
 * Autonomous Sliding-Window Ransomware Velocity & Threat Detector in C.
 */

#ifndef CLOUDRDR_DETECTOR_H
#define CLOUDRDR_DETECTOR_H

#include <stddef.h>
#include <stdbool.h>

typedef enum {
    CLOUDRDR_VERDICT_NORMAL = 0,
    CLOUDRDR_VERDICT_SUSPICIOUS,
    CLOUDRDR_VERDICT_RANSOMWARE
} cloudrdr_verdict_t;

typedef enum {
    CLOUDRDR_ACTION_CONTINUE = 0,
    CLOUDRDR_ACTION_FREEZE
} cloudrdr_action_t;

typedef struct {
    double ransomware_rate_threshold;  /* Default: 0.30 (30%) */
    double suspicious_rate_threshold;  /* Default: 0.10 (10%) */
    double entropy_threshold;          /* Default: 7.20 */
    int    window_seconds;             /* Default: 30 */
} cloudrdr_detector_config;

typedef struct {
    size_t total_files;
    size_t changed_files;
    double change_rate;
    bool   canary_triggered;
    size_t high_entropy_count;
    int    risk_score;
    cloudrdr_verdict_t verdict;
    cloudrdr_action_t  action;
    char   summary[256];
} cloudrdr_evaluation_result;

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize detector config with enterprise defaults.
 */
void cloudrdr_detector_config_init(cloudrdr_detector_config *cfg);

/**
 * Evaluate metrics to produce security verdict and immediate containment action.
 */
void cloudrdr_detector_evaluate(
    const cloudrdr_detector_config *cfg,
    size_t total_files,
    size_t changed_files,
    bool canary_triggered,
    size_t high_entropy_count,
    cloudrdr_evaluation_result *out_res
);

/**
 * Convert verdict enum to string ("normal", "suspicious", "ransomware").
 */
const char *cloudrdr_verdict_to_string(cloudrdr_verdict_t verdict);

/**
 * Convert action enum to string ("CONTINUE", "FREEZE").
 */
const char *cloudrdr_action_to_string(cloudrdr_action_t action);

#ifdef __cplusplus
}
#endif

#endif /* CLOUDRDR_DETECTOR_H */
