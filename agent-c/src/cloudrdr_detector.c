/**
 * @file cloudrdr_detector.c
 *
 * Implementation of Ransomware Velocity & Threat Detector.
 */

#include "../include/cloudrdr_detector.h"
#include <stdio.h>
#include <string.h>

void cloudrdr_detector_config_init(cloudrdr_detector_config *cfg) {
    if (!cfg) return;
    cfg->ransomware_rate_threshold = 0.30;
    cfg->suspicious_rate_threshold = 0.10;
    cfg->entropy_threshold = 7.20;
    cfg->window_seconds = 30;
}

void cloudrdr_detector_evaluate(
    const cloudrdr_detector_config *cfg,
    size_t total_files,
    size_t changed_files,
    bool canary_triggered,
    size_t high_entropy_count,
    cloudrdr_evaluation_result *out_res
) {
    if (!out_res) return;
    memset(out_res, 0, sizeof(cloudrdr_evaluation_result));

    cloudrdr_detector_config default_cfg;
    if (!cfg) {
        cloudrdr_detector_config_init(&default_cfg);
        cfg = &default_cfg;
    }

    out_res->total_files = total_files;
    out_res->changed_files = changed_files;
    out_res->canary_triggered = canary_triggered;
    out_res->high_entropy_count = high_entropy_count;

    double rate = 0.0;
    if (total_files > 0) {
        rate = (double)changed_files / (double)total_files;
    }
    out_res->change_rate = rate;

    int risk_score = 0;

    /* Factor 1: Change velocity */
    if (rate >= cfg->ransomware_rate_threshold) {
        risk_score += 50;
    } else if (rate >= cfg->suspicious_rate_threshold) {
        risk_score += 25;
    }

    /* Factor 2: Canary sentinel breach */
    if (canary_triggered) {
        risk_score += 50;
    }

    /* Factor 3: High entropy cipher payloads */
    if (high_entropy_count > 0) {
        risk_score += (int)(high_entropy_count * 15);
        if (risk_score > 100) risk_score = 100;
    }

    out_res->risk_score = risk_score;

    /* Verdict decision logic */
    if (canary_triggered || rate >= cfg->ransomware_rate_threshold || risk_score >= 60) {
        out_res->verdict = CLOUDRDR_VERDICT_RANSOMWARE;
        out_res->action = CLOUDRDR_ACTION_FREEZE;
        snprintf(out_res->summary, sizeof(out_res->summary),
                 "RANSOMWARE DETECTED: rate=%.1f%%, canary=%s, high_entropy=%zu, risk=%d (FREEZE ACTIVE)",
                 rate * 100.0, canary_triggered ? "TRIGGERED" : "CLEAR", high_entropy_count, risk_score);
    } else if (rate >= cfg->suspicious_rate_threshold || high_entropy_count > 0 || risk_score >= 25) {
        out_res->verdict = CLOUDRDR_VERDICT_SUSPICIOUS;
        out_res->action = CLOUDRDR_ACTION_CONTINUE;
        snprintf(out_res->summary, sizeof(out_res->summary),
                 "SUSPICIOUS ACTIVITY: rate=%.1f%%, high_entropy=%zu, risk=%d (MONITORING)",
                 rate * 100.0, high_entropy_count, risk_score);
    } else {
        out_res->verdict = CLOUDRDR_VERDICT_NORMAL;
        out_res->action = CLOUDRDR_ACTION_CONTINUE;
        snprintf(out_res->summary, sizeof(out_res->summary),
                 "NORMAL: rate=%.1f%%, monitored=%zu (SYSTEM NOMINAL)",
                 rate * 100.0, total_files);
    }
}

const char *cloudrdr_verdict_to_string(cloudrdr_verdict_t verdict) {
    switch (verdict) {
        case CLOUDRDR_VERDICT_RANSOMWARE: return "ransomware";
        case CLOUDRDR_VERDICT_SUSPICIOUS: return "suspicious";
        case CLOUDRDR_VERDICT_NORMAL:
        default:                          return "normal";
    }
}

const char *cloudrdr_action_to_string(cloudrdr_action_t action) {
    switch (action) {
        case CLOUDRDR_ACTION_FREEZE:   return "FREEZE";
        case CLOUDRDR_ACTION_CONTINUE:
        default:                       return "CONTINUE";
    }
}
