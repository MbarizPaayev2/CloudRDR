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
import { handleRansomwareVerdict } from '../response/responseService.js';
import logger from '../utils/logger.js';
import { subtractSeconds } from '../utils/time.js';

/**
 * Pure evaluation function for synthetic event testing.
 *
 * @param {Object} params
 * @param {Array<Object>} params.events List of change events.
 * @param {number} params.totalProtectedFiles Total baseline protected files.
 * @param {Set<string>|string[]} [params.canaryPaths] Known canary paths.
 * @param {string} [params.accountId='default-account']
 * @param {Object} [params.thresholds] Custom thresholds override.
 * @param {Date} [params.now=new Date()] Reference time for sliding window.
 * @returns {Object} Evaluation summary with metrics and verdict.
 */
export function evaluateSynthetic({
  events = [],
  totalProtectedFiles = 0,
  canaryPaths = null,
  accountId = 'default-account',
  thresholds = null,
  now = new Date(),
}) {
  const config = thresholds || getThresholds();
  const windowEvents = filterEventsInWindow(events, config.windowSeconds, now);
  const { uniqueChangedPaths, changedCount, changeRate } = computeChangeMetrics(
    windowEvents,
    totalProtectedFiles
  );

  const canaryTriggered = isCanaryTriggered(windowEvents, canaryPaths);
  const isAllowlisted = config.allowlistedAccounts.includes(accountId);

  if (isAllowlisted && (canaryTriggered || changeRate >= config.suspiciousRate)) {
    logger.warn(
      { accountId, changeRate, canaryTriggered },
      'detectionEngine: legitimate bulk operation exempted via ALLOWLISTED_ACCOUNTS'
    );
  }

  const verdict = classifyRate(changeRate, {
    suspiciousRate: config.suspiciousRate,
    ransomwareRate: config.ransomwareRate,
    canaryTriggered,
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
    verdict,
    affectedPaths: uniqueChangedPaths,
    isAllowlisted,
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
  const canaryPaths = new Set(
    protectedRows.filter((r) => r.is_canary).map((r) => r.path)
  );

  // 2. Fetch recent change events in the sliding window
  let eventQuery = db.from('change_events')
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
  };
}
