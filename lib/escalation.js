// lib/escalation.js - Background worker for incident escalation
const crypto = require('crypto');
const { pool } = require('../services/database');
const { ownerFor, loadOwners } = require('./owners');
const logger = require('./logger');

const WARN_ACK_SLA_MIN = parseInt(process.env.ESC_WARN_ACK_MIN || '15', 10);
const CRIT_ACK_SLA_MIN = parseInt(process.env.ESC_CRIT_ACK_MIN || '5', 10);
const MAX_ESC_LEVEL = parseInt(process.env.MAX_ESC_LEVEL || '7', 10);
const ESC_SNOOZE_MIN = parseInt(process.env.ESC_SNOOZE_MIN || '30', 10);
const ESC_DRY_RUN = process.env.ESC_DRY_RUN === 'true';
const APP_BASE_URL = process.env.APP_BASE_URL || (process.env.REPL_SLUG 
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : 'http://localhost:3000');

// Feature flags
const ESCALATION_WORKER_ENABLED = process.env.ESCALATION_WORKER_ENABLED;
const ESCALATION_V1 = process.env.ESCALATION_V1;
const ESC_CANARY_PCT = parseInt(process.env.ESC_CANARY_PCT || '100', 10);

// Structured metrics
const metrics = {
  inc: (k, v=1) => logger.info({metric: k, value: v}),
  gauge: (k, v) => logger.info({metric: k, value: v})
};

// Track last tick timestamp for health monitoring
let lastTickTimestamp = null;

/**
 * Canary rollout: hash incident_key and check if it falls within canary percentage
 */
function inCanary(incidentKey) {
  const hash = crypto.createHash('md5').update(incidentKey).digest('hex');
  const first8 = hash.substring(0, 8);
  const hashInt = parseInt(first8, 16);
  return (hashInt % 100) < ESC_CANARY_PCT;
}

/**
 * Send a Slack message with blocks
 */
async function sendSlackMessage({ webhook, blocks }) {
  if (!webhook) return;
  
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Slack webhook failed:', response.status, text);
      metrics.inc('slack_send_failure');
    }
  } catch (error) {
    console.error('Failed to send Slack message:', error.message);
    metrics.inc('slack_send_failure');
  }
}

/**
 * Notify about an escalation via Slack
 */
async function notifyEscalation(row, owners) {
  const snapshot = row.owner || null;
  const live = ownerFor(row.route, owners);
  const webhook =
    snapshot?.slack_webhook || live?.slack_webhook || process.env.SLACK_VELOCITY_WEBHOOK;

  if (!webhook) {
    console.log('[esc] No webhook configured for escalation notification');
    return;
  }

  const ownerName = snapshot?.owner || live?.owner || 'unassigned';
  const velocityUrl = `${APP_BASE_URL}/velocity?incident=${row.id}`;

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⏫ *Escalation L${row.escalation_level}* — \`${row.route}\` (${row.kind.toUpperCase()})`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Status:*\n${row.status}` },
        { type: 'mrkdwn', text: `*Severity:*\n${row.severity.toUpperCase()}` },
        { type: 'mrkdwn', text: `*Owner:*\n${ownerName}` },
        { type: 'mrkdwn', text: `*Level:*\nL${row.escalation_level}` },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `First seen: ${row.first_seen} • Last seen: ${row.last_seen}`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Incident key: \`${row.incident_key}\``,
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in Velocity Dashboard' },
          url: velocityUrl,
          style: 'primary',
        },
      ],
    },
    { type: 'divider' },
  ];

  await sendSlackMessage({ webhook, blocks });
}

/**
 * Generate a hash for an escalation event (incident_key|level)
 */
function generateEventHash(incidentKey, level) {
  return `${incidentKey}|L${level}`;
}

/**
 * Calculate next escalation due time based on SLA
 */
function calculateNextDueAt(firstSeen, severity, escalationLevel) {
  const CRIT_SLA_MIN = parseInt(process.env.ESC_CRIT_ACK_MIN || '5', 10);
  const WARN_SLA_MIN = parseInt(process.env.ESC_WARN_ACK_MIN || '15', 10);
  
  const slaMinutes = severity === 'critical' ? CRIT_SLA_MIN : WARN_SLA_MIN;
  const totalMinutes = slaMinutes * (escalationLevel + 1);
  
  const firstSeenDate = new Date(firstSeen);
  const dueDate = new Date(firstSeenDate.getTime() + totalMinutes * 60 * 1000);
  
  return dueDate.toISOString();
}

/**
 * Run one escalation tick - check for unacknowledged incidents and bump their level
 */
async function runEscalationTick(now = new Date()) {
  // Record tick timestamp for health monitoring
  lastTickTimestamp = now.toISOString();

  // Feature flag: ESCALATION_WORKER_ENABLED
  if (ESCALATION_WORKER_ENABLED !== 'true') {
    return 0;
  }

  // Feature flag: ESCALATION_V1
  if (ESCALATION_V1 !== 'true') {
    return 0;
  }

  const t0 = Date.now();
  const owners = loadOwners();
  let escalatedCount = 0;
  let skippedCount = 0;
  let dedupedCount = 0;
  let skippedCanaryCount = 0;

  const client = await pool.connect();
  try {
    // Optimized query: uses next_due_at index for fast lookups
    // Safety limits:
    // - Must not exceed MAX_ESC_LEVEL
    // - Must respect snooze window (ESC_SNOOZE_MIN after last escalation)
    // - LIMIT 50 to prevent processing too many incidents at once
    const result = await client.query(
      `SELECT *
       FROM incidents
       WHERE acknowledged_at IS NULL
         AND next_due_at IS NOT NULL
         AND now() >= next_due_at
         AND escalation_level < $1
         AND (escalated_at IS NULL OR now() - escalated_at >= ($2 || ' minutes')::interval)
       ORDER BY next_due_at ASC
       LIMIT 50`,
      [MAX_ESC_LEVEL, ESC_SNOOZE_MIN]
    );

    // Escalate each incident
    for (const row of result.rows) {
      // Canary rollout: skip incidents not in canary group
      if (!inCanary(row.incident_key)) {
        skippedCanaryCount++;
        continue;
      }

      const newLevel = row.escalation_level + 1;
      const eventHash = generateEventHash(row.incident_key, newLevel);
      
      // Check if this escalation event already exists (idempotency)
      const dedupCheck = await client.query(
        `SELECT id FROM escalation_events WHERE event_hash = $1`,
        [eventHash]
      );

      if (dedupCheck.rows.length > 0) {
        console.log(
          `[esc] Skipping duplicate escalation ${row.incident_key} to L${newLevel}`
        );
        dedupedCount++;
        continue;
      }
      
      // Dry-run mode: log but don't update
      if (ESC_DRY_RUN) {
        console.log(
          `[esc] [DRY-RUN] Would escalate ${row.incident_key} to L${newLevel}`
        );
        skippedCount++;
        continue;
      }
      
      // Begin transaction for atomic escalation + event recording
      await client.query('BEGIN');
      
      try {
        // Calculate next due time for the new escalation level
        const nextDue = calculateNextDueAt(row.first_seen, row.severity, newLevel);
        
        // Update incident escalation level and next_due_at
        const updateResult = await client.query(
          `UPDATE incidents
           SET escalation_level = $1, escalated_at = $2, next_due_at = $3
           WHERE id = $4
           RETURNING *`,
          [newLevel, now.toISOString(), nextDue, row.id]
        );

        if (updateResult.rows.length > 0) {
          const updated = updateResult.rows[0];
          
          // Record the escalation event
          await client.query(
            `INSERT INTO escalation_events 
             (incident_id, incident_key, escalation_level, event_hash, severity, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              updated.id,
              updated.incident_key,
              updated.escalation_level,
              eventHash,
              updated.severity,
              JSON.stringify({ escalated_from: row.escalation_level }),
              now.toISOString()
            ]
          );

          await client.query('COMMIT');
          
          console.log(
            `[esc] Escalated incident ${updated.incident_key} to L${updated.escalation_level}`
          );
          
          // Send notification (fire-and-forget, outside transaction)
          notifyEscalation(updated, owners).catch(err => {
            console.error('[esc] Notification failed:', err.message);
          });
          
          escalatedCount++;
        } else {
          await client.query('ROLLBACK');
        }
      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      }
    }

    if (ESC_DRY_RUN) {
      console.log(`[esc] [DRY-RUN] Would have escalated ${skippedCount} incidents`);
    }
    
    if (dedupedCount > 0) {
      console.log(`[esc] Skipped ${dedupedCount} duplicate escalations (idempotency)`);
    }

    if (skippedCanaryCount > 0) {
      console.log(`[esc] Skipped ${skippedCanaryCount} incidents (canary rollout)`);
    }

    // Emit metrics
    metrics.gauge('escalation_tick_ms', Date.now() - t0);
    metrics.inc('escalations_count', escalatedCount);
    metrics.inc('skipped_canary', skippedCanaryCount);
    metrics.inc('skipped_idempotent', dedupedCount);

    return escalatedCount;
  } catch (error) {
    console.error('[esc] Escalation tick failed:', error);
    metrics.gauge('escalation_tick_ms', Date.now() - t0);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get the timestamp of the last escalation tick
 * @returns {string|null} ISO timestamp or null if no tick has run yet
 */
function getLastTickTimestamp() {
  return lastTickTimestamp;
}

module.exports = { runEscalationTick, sendSlackMessage, getLastTickTimestamp };
