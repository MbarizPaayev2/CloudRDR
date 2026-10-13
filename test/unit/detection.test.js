/**
 * @file test/unit/detection.test.js
 * Unit tests for rateWindow, thresholds boundaries, canary rules, and allowlists.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRate } from '../../src/detection/thresholds.js';
import { filterEventsInWindow, computeChangeMetrics } from '../../src/detection/rateWindow.js';
import { isCanaryPath, isCanaryTriggered } from '../../src/detection/canary.js';
import { evaluateSynthetic } from '../../src/detection/detectionEngine.js';

describe('Detection - Thresholds & Boundary Values', () => {
  it('classifies 0.0999 as normal (just below 0.10)', () => {
    assert.equal(classifyRate(0.0999), 'normal');
  });

  it('classifies 0.10 as suspicious (exact lower threshold)', () => {
    assert.equal(classifyRate(0.1), 'suspicious');
  });

  it('classifies 0.2999 as suspicious (just below 0.30)', () => {
    assert.equal(classifyRate(0.2999), 'suspicious');
  });

  it('classifies 0.30 as ransomware (exact upper threshold)', () => {
    assert.equal(classifyRate(0.3), 'ransomware');
  });

  it('classifies 0.75 as ransomware', () => {
    assert.equal(classifyRate(0.75), 'ransomware');
  });

  it('exempts allowlisted accounts regardless of high change rate', () => {
    const verdict = classifyRate(0.85, { isAllowlisted: true });
    assert.equal(verdict, 'normal');
  });

  it('immediately triggers ransomware if canary is triggered even with 0 rate', () => {
    const verdict = classifyRate(0.0, { canaryTriggered: true });
    assert.equal(verdict, 'ransomware');
  });
});

describe('Detection - Canary Rules', () => {
  it('identifies canary naming patterns correctly', () => {
    assert.equal(isCanaryPath('canaries/sentinel.docx'), true);
    assert.equal(isCanaryPath('data/secret.canary'), true);
    assert.equal(isCanaryPath('docs/canary_file.txt'), true);
    assert.equal(isCanaryPath('normal_folder/normal_file.pdf'), false);
  });

  it('triggers canary when modified or deleted', () => {
    const modEvent = [{ path: 'trap.canary', event_type: 'modified' }];
    assert.equal(isCanaryTriggered(modEvent), true);

    const delEvent = [{ path: 'canaries/sentinel.docx', event_type: 'deleted' }];
    assert.equal(isCanaryTriggered(delEvent), true);

    const createdEvent = [{ path: 'trap.canary', event_type: 'created' }];
    assert.equal(isCanaryTriggered(createdEvent), false);
  });
});

describe('Detection - rateWindow & Sliding Window', () => {
  const now = new Date('2026-10-14T12:00:00Z');

  it('filters events strictly inside window seconds', () => {
    const events = [
      { observed_at: new Date('2026-10-14T11:59:10Z').toISOString(), path: 'recent.txt' },
      { observed_at: new Date('2026-10-14T11:58:00Z').toISOString(), path: 'old.txt' },
    ];
    const filtered = filterEventsInWindow(events, 60, now);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].path, 'recent.txt');
  });

  it('computes change metrics and de-duplicates multiple modifications of the same file', () => {
    const events = [
      { path: 'a.txt', matched_baseline: false, event_type: 'modified' },
      { path: 'a.txt', matched_baseline: false, event_type: 'modified' },
      { path: 'b.txt', matched_baseline: false, event_type: 'modified' },
      { path: 'c.txt', matched_baseline: true, event_type: 'modified' }, // untouched content
    ];
    const metrics = computeChangeMetrics(events, 10);
    assert.equal(metrics.changedCount, 2);
    assert.equal(metrics.changeRate, 0.2);
    assert.deepEqual(metrics.uniqueChangedPaths, ['a.txt', 'b.txt']);
  });
});

describe('Detection - Synthetic Evaluations', () => {
  const now = new Date('2026-10-14T12:00:00Z');

  it('evaluates ransomware when change rate >= 0.30', () => {
    const events = [
      {
        path: '1.txt',
        matched_baseline: false,
        observed_at: now.toISOString(),
        event_type: 'modified',
      },
      {
        path: '2.txt',
        matched_baseline: false,
        observed_at: now.toISOString(),
        event_type: 'modified',
      },
      {
        path: '3.txt',
        matched_baseline: false,
        observed_at: now.toISOString(),
        event_type: 'modified',
      },
    ];
    const res = evaluateSynthetic({
      events,
      totalProtectedFiles: 10,
      now,
    });

    assert.equal(res.changeRate, 0.3);
    assert.equal(res.verdict, 'ransomware');
  });

  it('exempts allowlisted account from bulk modification ransomware verdict', () => {
    const events = Array.from({ length: 50 }, (_, i) => ({
      path: `file_${i}.txt`,
      matched_baseline: false,
      observed_at: now.toISOString(),
      event_type: 'modified',
    }));

    const res = evaluateSynthetic({
      events,
      totalProtectedFiles: 100,
      accountId: 'backup-agent-01',
      thresholds: {
        windowSeconds: 60,
        suspiciousRate: 0.1,
        ransomwareRate: 0.3,
        allowlistedAccounts: ['backup-agent-01'],
      },
      now,
    });

    assert.equal(res.verdict, 'normal');
    assert.equal(res.isAllowlisted, true);
  });
});
