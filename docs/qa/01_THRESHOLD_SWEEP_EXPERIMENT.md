# CloudRDR — Threshold Sweep Experiment Report

**Document ID:** QA-EXP-001  
**Author:** Tural Səfərov (QA Lead)  
**Date:** 2026-10-14  
**Project Phase:** Year 3 Information Security Capstone  
**Target Module:** `src/detection/detectionEngine.js` & `src/detection/thresholds.js`

---

## 1. Executive Summary & Objective

In ransomware detection, selecting the rate threshold is a fundamental security trade-off:
- **Overly sensitive thresholds (e.g. 1% – 10%):** Yield high False Positive rates, interrupting legitimate business workflows and causing accidental account freezes.
- **Overly tolerant thresholds (e.g. 50% – 80%):** Allow aggressive attackers to encrypt a majority of assets before containment triggers, increasing Recovery Time and potential data loss.

This experiment swept across 7 discrete change-rate thresholds (`1%`, `5%`, `10%`, `20%`, `30%`, `50%`, `80%`) under a realistic workload suite comprising routine office edits, asset compilation batches, allowlisted cloud synchronization, canary-triggered attacks, stealthy low-rate encryption, and fast bulk ransomware payloads.

---

## 2. Experimental Methodology

### 2.1 Test Dataset Structure
- **Baseline asset pool:** 100 protected corporate files per evaluation window.
- **Benign traffic scenarios:**
  1. Routine single document edits (1%)
  2. Multi-file editing session (4%)
  3. Graphics / code asset compilation batch (8%)
  4. Template migration batch (15%)
  5. Heavy project restructuring (25%)
  6. Nightly backup sync on allowlisted account (60%)
  7. Data warehouse shard compaction on allowlisted account (85%)
- **Malicious ransomware scenarios:**
  1. Low-rate stealth attack triggering canary trap (5% + canary)
  2. Phishing macro payload tripping canary (12% + canary)
  3. Low-rate stealth attack avoiding canary (18% without canary)
  4. Moderate burst encryption (32%)
  5. Standard LockBit-style burst encryption (45%)
  6. Aggressive BlackCat mass encryption (75%)
  7. Catastrophic whole-bucket encryption (98%)

### 2.2 Metrics Formulations
$$\text{Precision} = \frac{TP}{TP + FP}$$
$$\text{Recall (Sensitivity)} = \frac{TP}{TP + FN}$$
$$\text{Specificity} = \frac{TN}{TN + FP}$$
$$F_1\text{-Score} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

---

## 3. Results Matrix

| Threshold | TP | FP | TN | FN | Precision | Recall (Sensitivity) | Specificity | F1-Score | Assessment |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **1%** | 7 | 5 | 2 | 0 | 58.3% | 100.0% | 28.6% | **0.737** | High False Positives |
| **5%** | 7 | 3 | 4 | 0 | 70.0% | 100.0% | 57.1% | **0.824** | High False Positives |
| **10%** | 7 | 2 | 5 | 0 | 77.8% | 100.0% | 71.4% | **0.875** | High False Positives |
| **20%** | 6 | 1 | 6 | 1 | 85.7% | 85.7% | 85.7% | **0.857** | High False Positives |
| **30%** | 6 | 0 | 7 | 1 | 100.0% | 85.7% | 100.0% | **0.923** | **Optimal Balance (Default)** |
| **50%** | 4 | 0 | 7 | 3 | 100.0% | 57.1% | 100.0% | **0.727** | Suboptimal Recall |
| **80%** | 3 | 0 | 7 | 4 | 100.0% | 42.9% | 100.0% | **0.600** | Suboptimal Recall |

---

## 4. Key Findings & Engineering Recommendations

1. **Why 30% is the Optimal Global Threshold:**
   - At **30% (`RANSOMWARE_RATE=0.30`)**, CloudRDR achieves **100% Specificity** (Zero False Positives on benign user workloads) while maintaining **85.7% Recall**.
   - The F1-Score peaks at **0.923**, outperforming all lower and higher thresholds.
   - All bulk bursts (> 30%) and all attacks touching canaries are detected instantaneously.

2. **The Critical Role of Canary Traps:**
   - At 30%, the only attack that evaded instant detection was Scenario 10 (18% low-rate drip *without* touching the canary).
   - However, in Scenarios 8 and 9, even at low rates (5% and 12%), **canary traps triggered an immediate ransomware verdict**, boosting effective detection sensitivity without causing false positives.
   - Strategic canary placement (e.g., hidden `canary/zz_sentinel.docx` or alphabetically prioritized files) is mandatory to catch drip attacks before they reach 30%.

3. **Allowlist Exemption Validation:**
   - The authorized backup agent (`backup-agent-01`) generating 60% and 85% modification spikes was successfully exempted across all thresholds, confirming zero business disruption for critical background services.

4. **Conclusion for CloudRDR Production Configuration:**
   - Keep default `RANSOMWARE_RATE=0.30`.
   - Keep `SUSPICIOUS_RATE=0.10` for operator warnings.
   - Deploy canary files per folder tree at deployment time.
