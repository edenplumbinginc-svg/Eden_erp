const DEDUP_MS = 5 * 60 * 1000;
const INTERVAL_MS = 30 * 1000;

function makeAlerter({ metrics, fetchImpl, webhookUrl, env = "dev" }) {
  const sent = new Map();

  function keyOf(a) {
    return `${a.kind} :: ${a.route}`;
  }

  function gc(now) {
    for (const [k, ts] of sent.entries()) {
      if (now - ts > DEDUP_MS) sent.delete(k);
    }
  }

  async function postSlack(blocks) {
    if (!webhookUrl) return;
    const body = { blocks };
    const res = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Slack webhook ${res.status}: ${txt}`);
    }
  }

  function alarmToBlocks(a) {
    const color = a.severity === "critical" ? "#B91C1C" : "#D97706";
    const title = a.kind === "error_rate" ? "High error rate" : "p95 regression";
    const details = a.kind === "error_rate"
      ? `err% (1m): *${a.evidence.err_rate_1m}%* — samples(1m): *${a.evidence.samples_1m}*`
      : `p95: *${a.evidence.p95_prev3_ms}ms → ${a.evidence.p95_last3_ms}ms* (+${a.evidence.regress_abs_ms}ms, ${a.evidence.regress_pct}%)`;
    return [
      { type: "section", text: { type: "mrkdwn", text: `*${title}* — \`${a.route}\` (${a.severity.toUpperCase()})` } },
      { type: "context", elements: [{ type: "mrkdwn", text: `Env: *${env}* • ${a.since}` }] },
      { type: "section", text: { type: "mrkdwn", text: details } },
      { type: "divider" },
    ];
  }

  async function tick(logger) {
    const now = Date.now();
    gc(now);
    const payload = metrics.alarms();
    const list = (payload.alarms || []).filter(a => a.severity === "critical");
    const fresh = list.filter(a => {
      const k = keyOf(a);
      const last = sent.get(k) || 0;
      if (now - last > DEDUP_MS) {
        sent.set(k, now);
        return true;
      }
      return false;
    });
    if (!fresh.length) return;

    const blocks = fresh.flatMap(alarmToBlocks);
    try {
      await postSlack(blocks);
      if (logger) {
        logger.info({ count: fresh.length, routes: fresh.map(a => a.route) }, 'slack_alerts_sent');
      }
    } catch (err) {
      if (logger) {
        logger.error({ err, count: fresh.length, routes: fresh.map(a => a.route) }, 'slack_alert_failed');
      }
    }
  }

  function start(logger) {
    if (!webhookUrl) return { stop() {} };
    const id = setInterval(() => tick(logger).catch(err => {
      if (logger) logger.error({ err }, 'slack_alerter_tick_failed');
    }), INTERVAL_MS);
    id.unref?.();
    return { stop: () => clearInterval(id) };
  }

  return { start, tick };
}

module.exports = { makeAlerter };
