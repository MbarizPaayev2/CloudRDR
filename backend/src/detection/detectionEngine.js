/**
 * @file src/detection/detectionEngine.js
 *
 * Ransomware detection engine for CloudRDR.
 * Evaluates file change rates in a sliding window, monitors canary traps,
 * respects account allowlists, and persists all runs to Postgres.
 */

import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
import { getThresholds, classifyRate } from './thresholds.js';
import { filterEventsInWindow, computeChangeMetrics } from './rateWindow.js';
import { isCanaryTriggered } from './canary.js';
import { scanHeuristicSignatures, computeCumulativeDrift } from './heuristics.js';
import { scanProcessAnomalies } from './processHeuristics.js';
import { filterNoiseEvents } from './noiseFilter.js';
import { computeThreatScore } from './scoring.js';
import { handleRansomwareVerdict } from '../response/responseService.js';
import logger from '../utils/logger.js';
import { subtractSeconds } from '../utils/time.js';

/**
 * Pure evaluation function for synthetic event testing and core detection.
 *
 * @param {Object} params
 * @param {Array<Object>} params.events List of change events.
 * @param {number} params.totalProtectedFiles Total baseline protected files.
 * @param {Set<string>|string[]} [params.canaryPaths] Known canary paths.
 * @param {string} [params.accountId='default-account']
 * @param {Object} [params.thresholds] Custom thresholds override.
 * @param {number} [params.totalModifiedOrMissing] Cumulative drift count if known.
 * @param {Date} [params.now=new Date()] Reference time for sliding window.
 * @returns {Object} Evaluation summary with metrics, risk score, and verdict.
 */
export function evaluateSynthetic({
  events = [],
  totalProtectedFiles = 0,
  canaryPaths = null,
  accountId = 'default-account',
  thresholds = null,
  totalModifiedOrMissing = null,
  now = new Date(),
}) {
  const config = thresholds || getThresholds();

  // 1. Noise Filter (excludes benign developer/build artifacts like node_modules, .git, .tmp)
  const noiseInfo = filterNoiseEvents(events, {
    enabled: config.enableNoiseFilter !== false,
    canaryPaths,
  });
  const effectiveEvents = noiseInfo.filteredEvents;

  // 2. Sliding Window Filtering
  const windowEvents = filterEventsInWindow(effectiveEvents, config.windowSeconds, now);
  const { uniqueChangedPaths, changedCount, changeRate } = computeChangeMetrics(
    windowEvents,
    totalProtectedFiles
  );

  // 3. Canary Bait Verification
  const canaryTriggered = isCanaryTriggered(windowEvents, canaryPaths);
  const isAllowlisted = config.allowlistedAccounts.includes(accountId);

  // 4. Multi-factor Shannon Entropy Analysis (Core heuristic)
  const entropyThreshold = config.entropyThreshold || 7.2;
  const entropyEvents = windowEvents.filter((e) => typeof e.entropy === 'number' && e.entropy > 0);
  const highEntropyEvents = entropyEvents.filter((e) => e.entropy >= entropyThreshold);
  const meanEntropy =
    entropyEvents.length > 0
      ? Number((entropyEvents.reduce((acc, e) => acc + e.entropy, 0) / entropyEvents.length).toFixed(2))
      : 0;

  // Trigger if 2+ files exhibit encryption-level entropy, or majority of changes are high-entropy
  const entropyTriggered =
    highEntropyEvents.length >= 2 ||
    (changedCount > 0 && highEntropyEvents.length / changedCount >= 0.5);

  // 5. Advanced Signature & Extension Heuristics (.locked, .enc, README_RESTORE notes, corrupted headers)
  const heuristics = scanHeuristicSignatures(windowEvents);
  const heuristicTriggered = heuristics.heuristicTriggered;

  // 6. Process & Command-Line Heuristics (vssadmin shadow deletion, powershell/wscript execution)
  const processInfo = scanProcessAnomalies(windowEvents);

  // 7. Cumulative Baseline Drift (Catching slow-burn / trickle encryption)
  const driftCount = typeof totalModifiedOrMissing === 'number' ? totalModifiedOrMissing : changedCount;
  const cumulativeDrift = computeCumulativeDrift(
    totalProtectedFiles,
    driftCount,
    config.cumulativeDriftThreshold || 0.15
  );

  // 8. Multi-Vector Threat Risk Scoring & MITRE ATT&CK Attribution (0 - 100)
  const threatScore = computeThreatScore({
    canaryTriggered,
    ransomNotesCount: heuristics.ransomNotesFound.length,
    ransomwareExtensionsCount: heuristics.ransomwareExtensionsFound.length,
    entropyTriggered,
    highEntropyFilesCount: highEntropyEvents.length,
    meanEntropy,
    shadowCopyTampering: processInfo.shadowCopyTampering,
    suspiciousProcessTriggered: processInfo.suspiciousProcessTriggered,
    magicByteCorruptionsCount: heuristics.magicByteCorruptionsFound.length,
    driftExceeded: cumulativeDrift.driftExceeded,
    changeRate,
    ransomwareRate: config.ransomwareRate,
    suspiciousRate: config.suspiciousRate,
    isAllowlisted,
  });

  if (
    isAllowlisted &&
    (canaryTriggered ||
      entropyTriggered ||
      heuristicTriggered ||
      threatScore.riskScore >= (config.minRiskScoreSuspicious || 30) ||
      changeRate >= config.suspiciousRate)
  ) {
    logger.warn(
      { accountId, changeRate, canaryTriggered, entropyTriggered, heuristicTriggered, meanEntropy },
      'detectionEngine: legitimate bulk operation exempted via ALLOWLISTED_ACCOUNTS'
    );
  }

  // 9. Final Multi-Vector Verdict Classification
  const verdict = classifyRate(changeRate, {
    suspiciousRate: config.suspiciousRate,
    ransomwareRate: config.ransomwareRate,
    canaryTriggered,
    entropyTriggered,
    heuristicTriggered,
    driftExceeded: cumulativeDrift.driftExceeded,
    shadowCopyTampering: processInfo.shadowCopyTampering,
    riskScore: threatScore.riskScore,
    minRiskScoreRansomware: config.minRiskScoreRansomware,
    minRiskScoreSuspicious: config.minRiskScoreSuspicious,
    isAllowlisted,
  });

  return {
    accountId,
    windowSeconds: config.windowSeconds,
    totalFiles: totalProtectedFiles,
    changedFiles: changedCount,
    changeRate,
    threshold: config.ransomwareRate,
    canaryTriggered,
    entropyTriggered,
    heuristicTriggered,
    ransomwareExtensionsFound: heuristics.ransomwareExtensionsFound,
    ransomNotesFound: heuristics.ransomNotesFound,
    magicByteCorruptionsFound: heuristics.magicByteCorruptionsFound,
    meanEntropy,
    highEntropyFilesCount: highEntropyEvents.length,
    verdict,
    affectedPaths: uniqueChangedPaths,
    isAllowlisted,
    // Enterprise Risk & Attribution Telemetry
    riskScore: threatScore.riskScore,
    threatLevel: threatScore.threatLevel,
    confidence: threatScore.confidence,
    mitreTechniques: threatScore.mitreTechniques,
    indicators: threatScore.indicators,
    processAnomalies: processInfo.processAnomalies,
    shadowCopyTampering: processInfo.shadowCopyTampering,
    cumulativeDriftRatio: cumulativeDrift.driftRatio,
    driftExceeded: cumulativeDrift.driftExceeded,
    noiseFilteredCount: noiseInfo.noiseFilteredCount,
  };
}

/**
 * Database-integrated evaluation triggered after monitor cycles or on-demand.
 * Evaluates change_events within the sliding window, writes to detection_runs,
 * and kicks off response workflow asynchronously on ransomware verdict.
 *
 * @param {string} accountId
 * @param {string} [bucket]
 * @param {Object} [options]
 * @returns {Promise<Object>} The detection_runs record
 */
export async function evaluateEvents(accountId, bucket = null, options = {}) {
  const db = getSupabaseClient();
  const config = getThresholds();
  const now = options.now || new Date();
  const windowCutoff = subtractSeconds(config.windowSeconds, now).toISOString();

  // 1. Fetch total protected files for this account/bucket
  let query = db.from('protected_files').select('path, is_canary');
  if (bucket) {
    query = query.eq('bucket', bucket);
  }
  const protectedRows = (await supaQuery(query)) || [];
  const totalFiles = protectedRows.length;
  const canaryPaths = new Set(protectedRows.filter((r) => r.is_canary).map((r) => r.path));

  // 2. Fetch recent change events in the sliding window
  let eventQuery = db
    .from('change_events')
    .select('*')
    .eq('account_id', accountId)
    .gte('observed_at', windowCutoff);
  if (bucket) {
    eventQuery = eventQuery.eq('bucket', bucket);
  }
  const eventsInWindow = (await supaQuery(eventQuery)) || [];

  // 3. Run pure evaluation
  const evaluation = evaluateSynthetic({
    events: eventsInWindow,
    totalProtectedFiles: totalFiles,
    canaryPaths,
    accountId,
    thresholds: config,
    now,
  });

  // 4. Save EVERY evaluation to detection_runs (supports threshold sweep experiments)
  const [detectionRun] = await supaQuery(
    db.from('detection_runs').insert({
      account_id: accountId,
      window_seconds: evaluation.windowSeconds,
      total_files: evaluation.totalFiles,
      changed_files: evaluation.changedFiles,
      change_rate: evaluation.changeRate,
      threshold: evaluation.threshold,
      canary_triggered: evaluation.canaryTriggered,
      verdict: evaluation.verdict,
    })
  );

  logger.info(
    {
      accountId,
      verdict: evaluation.verdict,
      changeRate: evaluation.changeRate,
      changedFiles: evaluation.changedFiles,
      canary: evaluation.canaryTriggered,
      runId: detectionRun?.id,
    },
    'detectionEngine: evaluation completed'
  );

  // 5. If ransomware verdict is reached, trigger response service asynchronously
  if (evaluation.verdict === 'ransomware') {
    logger.error(
      { accountId, runId: detectionRun?.id, affected: evaluation.affectedPaths.length },
      'detectionEngine: RANSOMWARE DETECTED — triggering response'
    );

    // Run response non-blockingly
    setImmediate(() => {
      handleRansomwareVerdict({
        detectionRunId: detectionRun?.id,
        accountId,
        bucket: bucket || (protectedRows[0]?.bucket ?? 'default'),
        affectedPaths: evaluation.affectedPaths,
        detectionRunSummary: evaluation,
      }).catch((err) => {
        logger.error({ err: err.message }, 'detectionEngine: response handler failed');
      });
    });
  }

  return {
    ...detectionRun,
    affectedPaths: evaluation.affectedPaths,
    riskScore: evaluation.riskScore,
    threatLevel: evaluation.threatLevel,
    confidence: evaluation.confidence,
    mitreTechniques: evaluation.mitreTechniques,
    indicators: evaluation.indicators,
    processAnomalies: evaluation.processAnomalies,
  };
}
