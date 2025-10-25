// lib/escalation.js - Background worker for incident escalation
const { pool } = require('../services/database');
const { ownerFor, loadOwners } = require('./owners');

const WARN_ACK_SLA_MIN = parseInt(process.env.ESC_WARN_ACK_MIN || '15', 10);
const CRIT_ACK_SLA_MIN = parseInt(process.env.ESC_CRIT_ACK_MIN || '5', 10);
const MAX_ESC_LEVEL = parseInt(process.env.MAX_ESC_LEVEL || '7', 10);
const ESC_SNOOZE_MIN = parseInt(process.env.ESC_SNOOZE_MIN || '30', 10);
const ESC_DRY_RUN = process.env.ESC_DRY_RUN === 'true';
const APP_BASE_URL = process.env.APP_BASE_URL || (process.env.REPL_SLUG 
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : 'http://localhost:3000');

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
    }
  } catch (error) {
    console.error('Failed to send Slack message:', error.message);
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
 * Run one escalation tick - check for unacknowledged incidents and bump their level
 */
async function runEscalationTick(now = new Date()) {
  const owners = loadOwners();
  let escalatedCount = 0;
  let skippedCount = 0;

  const client = await pool.connect();
  try {
    // Find incidents that need escalation
    // An incident escalates when it's been open and unacknowledged for:
    // - critical: CRIT_ACK_SLA_MIN * (escalation_level + 1) minutes
    // - warning: WARN_ACK_SLA_MIN * (escalation_level + 1) minutes
    // Safety limits:
    // - Must not exceed MAX_ESC_LEVEL
    // - Must respect snooze window (ESC_SNOOZE_MIN after last escalation)
    const result = await client.query(
      `SELECT *
       FROM incidents
       WHERE status = 'open'
         AND acknowledged_at IS NULL
         AND escalation_level < $4
         AND (escalated_at IS NULL OR 
              EXTRACT(EPOCH FROM ($1::timestamptz - escalated_at)) / 60.0 >= $5)
         AND (
           EXTRACT(EPOCH FROM ($1::timestamptz - first_seen)) / 60.0
         ) >= (
           CASE 
             WHEN severity = 'critical' THEN $2::int 
             ELSE $3::int 
           END
         ) * (escalation_level + 1)
       ORDER BY first_seen ASC`,
      [now.toISOString(), CRIT_ACK_SLA_MIN, WARN_ACK_SLA_MIN, MAX_ESC_LEVEL, ESC_SNOOZE_MIN]
    );

    // Escalate each incident
    for (const row of result.rows) {
      const newLevel = row.escalation_level + 1;
      
      // Dry-run mode: log but don't update
      if (ESC_DRY_RUN) {
        console.log(
          `[esc] [DRY-RUN] Would escalate ${row.incident_key} to L${newLevel}`
        );
        skippedCount++;
        continue;
      }
      
      const updateResult = await client.query(
        `UPDATE incidents
         SET escalation_level = $1, escalated_at = $2
         WHERE id = $3
         RETURNING *`,
        [newLevel, now.toISOString(), row.id]
      );

      if (updateResult.rows.length > 0) {
        const updated = updateResult.rows[0];
        console.log(
          `[esc] Escalated incident ${updated.incident_key} to L${updated.escalation_level}`
        );
        
        // Send notification
        await notifyEscalation(updated, owners);
        escalatedCount++;
      }
    }

    if (ESC_DRY_RUN) {
      console.log(`[esc] [DRY-RUN] Would have escalated ${skippedCount} incidents`);
    }

    return escalatedCount;
  } catch (error) {
    console.error('[esc] Escalation tick failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { runEscalationTick, sendSlackMessage };
