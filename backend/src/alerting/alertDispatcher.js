/**
 * @file src/alerting/alertDispatcher.js
 *
 * Enterprise Multi-Channel Incident Alerting & SIEM Dispatcher for CloudRDR.
 * Supports:
 *   1. Generic Webhook (SIEM: Splunk, Microsoft Sentinel, IBM QRadar, Wazuh)
 *   2. Slack / Discord Webhook Notifications
 *   3. Telegram Security Bot Notifications
 *
 * Non-blocking and fault-tolerant: network failures in notifications
 * never block containment or incident creation.
 */

import logger from '../utils/logger.js';

/**
 * Dispatch an incident alert to all configured notification channels.
 *
 * @param {Object} incident Incident record
 * @param {Object} [summary={}] Detection run summary
 * @returns {Promise<void>}
 */
export async function dispatchIncidentAlert(incident, summary = {}) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  const slackUrl = process.env.ALERT_SLACK_WEBHOOK_URL;
  const telegramToken = process.env.ALERT_TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.ALERT_TELEGRAM_CHAT_ID;

  const payload = {
    event: 'CLOUDRDR_RANSOMWARE_ALERT',
    timestamp: new Date().toISOString(),
    severity: 'CRITICAL',
    incidentId: incident.id,
    accountId: incident.account_id,
    bucket: incident.bucket || 'protected',
    status: incident.status,
    affectedFilesCount: (incident.affected_paths || []).length,
    affectedPaths: (incident.affected_paths || []).slice(0, 10), // Preview first 10
    meanEntropy: summary.meanEntropy || null,
    canaryTriggered: Boolean(summary.canaryTriggered),
    heuristicTriggered: Boolean(summary.heuristicTriggered),
    signature: incident.record_signature || null,
  };

  // 1. Generic SIEM Webhook (JSON POST)
  if (webhookUrl) {
    sendJsonWebhook(webhookUrl, payload).catch((err) => {
      logger.warn({ err: err.message, webhookUrl }, 'alertDispatcher: SIEM webhook failed');
    });
  }

  // 2. Slack / Discord Webhook
  if (slackUrl) {
    sendSlackWebhook(slackUrl, payload).catch((err) => {
      logger.warn({ err: err.message }, 'alertDispatcher: Slack webhook failed');
    });
  }

  // 3. Telegram Security Bot
  if (telegramToken && telegramChatId) {
    sendTelegramAlert(telegramToken, telegramChatId, payload).catch((err) => {
      logger.warn({ err: err.message }, 'alertDispatcher: Telegram alert failed');
    });
  }

  logger.info(
    { incidentId: incident.id, accountId: incident.account_id },
    'alertDispatcher: dispatched incident alerts across active notification channels'
  );
}

async function sendJsonWebhook(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`Webhook responded with HTTP ${res.status}`);
  }
}

async function sendSlackWebhook(url, payload) {
  const message = {
    text: `*[CRITICAL] CloudRDR Ransomware Outbreak Detected!*\n• *Account*: \`${payload.accountId}\`\n• *Bucket*: \`${payload.bucket}\`\n• *Affected Files*: ${payload.affectedFilesCount}\n• *Incident ID*: \`${payload.incidentId}\`\n• *Action*: IAM Write-Freeze Engaged`,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook responded with HTTP ${res.status}`);
  }
}

async function sendTelegramAlert(token, chatId, payload) {
  const text = `*[CRITICAL] CloudRDR Security Alert*\n\n*Severity*: CRITICAL\n*Account*: \`${payload.accountId}\`\n*Bucket*: \`${payload.bucket}\`\n*Affected Files*: ${payload.affectedFilesCount}\n*Incident ID*: \`${payload.incidentId}\`\n\n_Automated IAM write-freeze & Ed25519 evidence signed._`;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`Telegram API responded with HTTP ${res.status}`);
  }
}
