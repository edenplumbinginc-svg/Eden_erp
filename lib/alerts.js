const DEDUP_MS = 5 * 60 * 1000;
const INTERVAL_MS = 30 * 1000;

function makeAlerter({ metrics, fetchImpl, webhookUrl, env = "dev" }) {
  const sent = new Map();
  const SENTRY_ORG = process.env.SENTRY_ORG_SLUG || "";
  const SENTRY_PROJ = process.env.SENTRY_PROJECT_SLUG || "";
  const SENTRY_ENV = process.env.SENTRY_ENV || env;

  function keyOf(a) {
    return `${a.kind} :: ${a.route}`;
  }

  function gc(now) {
    for (const [k, ts] of sent.entries()) {
      if (now - ts > DEDUP_MS) sent.delete(k);
    }
  }

  async function postSlack(blocks, urlOverride) {
    const target = urlOverride || webhookUrl;
    if (!target) return;
    const body = { blocks };
    const res = await fetchImpl(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Slack webhook ${res.status}: ${txt}`);
    }
  }

  function sentryUrlForRoute(route) {
    if (!SENTRY_ORG || !SENTRY_PROJ) return null;
    const q = encodeURIComponent(`event.type:error environment:${SENTRY_ENV} route:"${route}"`);
    const name = encodeURIComponent(`Velocity: ${route}`);
    return `https://sentry.io/organizations/${SENTRY_ORG}/discover/results/?name=${name}&field=timestamp&field=message&field=release&field=trace&field=transaction&query=${q}&project=${SENTRY_PROJ}&statsPeriod=1h`;
  }

  function alarmToBlocks(a) {
    const color = a.severity === "critical" ? "#B91C1C" : "#D97706";
    const title = a.kind === "error_rate" ? "High error rate" : a.kind === "p95_regress" ? "p95 regression" : "SLO violation";
    const details = a.kind === "error_rate"
      ? `err% (1m): *${a.evidence.err_rate_1m}%* — samples(1m): *${a.evidence.samples_1m}*`
      : a.kind === "p95_regress"
        ? `p95: *${a.evidence.p95_prev3_ms}ms → ${a.evidence.p95_last3_ms}ms* (+${a.evidence.regress_abs_ms}ms, ${a.evidence.regress_pct}%)`
        : `targets p95≤${a.evidence.targets.p95_ms}ms err≤${a.evidence.targets.err_pct}% • actual p95=${a.evidence.actual.p95_ms ?? "—"}ms, err=${a.evidence.actual.err_pct ?? "—"}%`;
    const sentryUrl = sentryUrlForRoute(a.route);
    const ownerTxt = a.owner?.owner ? ` • Owner: *${a.owner.owner}*` : "";

    return [
      { type: "section", text: { type: "mrkdwn", text: `*${title}* — \`${a.route}\` (${a.severity.toUpperCase()})${ownerTxt}` } },
      { type: "context", elements: [{ type: "mrkdwn", text: `Env: *${env}* • ${a.since}` }] },
      { type: "section", text: { type: "mrkdwn", text: details } },
      ...(sentryUrl ? [{
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: "View in Sentry →" }, url: sentryUrl, style: "danger" }
        ]
      }] : []),
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

    // If routes specify their own webhooks, send per-route; otherwise batch to global.
    const withOverrides = fresh.filter(a => a.owner?.slack_webhook);
    const without = fresh.filter(a => !a.owner?.slack_webhook);

    try {
      for (const a of withOverrides) {
        await postSlack(alarmToBlocks(a), a.owner.slack_webhook).catch(()=>{});
      }
      if (without.length) {
        const blocks = without.flatMap(alarmToBlocks);
        await postSlack(blocks).catch(()=>{});
      }
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
