// lib/config.js
const { z } = require("zod");

const coerceBool = (def = undefined) => z.preprocess(
  v => {
    if (v == null || v === '' || v === 'undefined') {
      return def; // Return default if provided, otherwise undefined
    }
    return String(v).trim().toLowerCase();
  },
  def === undefined ? z.enum(["true","false"]).optional() : z.enum(["true","false"])
).transform(v => v === "true");

const coerceInt = (def, min, max) => z.preprocess(
  v => (v == null ? String(def) : String(v)), 
  z.string().regex(/^\d+$/)
).transform(n => {
  const x = Number(n);
  if (min != null && x < min) throw new Error(`must be >= ${min}`);
  if (max != null && x > max) throw new Error(`must be <= ${max}`);
  return x;
});

const optionalUrl = z.preprocess(
  v => {
    if (!v || v === '' || v === 'undefined') return undefined;
    // Filter out placeholder values like <your-repl-url>
    if (typeof v === 'string' && (v.includes('<') || v.includes('>'))) return undefined;
    return v;
  },
  z.string().url().optional()
);

const Base = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid URL" }),
  ESCALATION_WORKER_ENABLED: coerceBool("false"),
  ESCALATION_V1: coerceBool("false"),
  ESC_CANARY_PCT: coerceInt(100, 0, 100),
  ESC_DRY_RUN: coerceBool("true"),
  ESC_TICK_MS: coerceInt(60000, 1000, 600000), // 1s..10m
  MAX_ESC_LEVEL: coerceInt(7, 1, 99),
  ESC_SNOOZE_MIN: coerceInt(30, 1, 1440),
  OPS_ADMIN_ROLE: z.string().trim().min(3).default("ops_admin"),
  OPS_HMAC_SECRET: z.string().min(16, "OPS_HMAC_SECRET must be >=16 chars"),
  APP_BASE_URL: optionalUrl,
  SLACK_WEBHOOK_URL: optionalUrl,
  SLACK_VELOCITY_WEBHOOK: optionalUrl,
  SLACK_SIGNING_SECRET: z.string().optional(),
  SENTRY_DSN: optionalUrl,
  SENTRY_ENV: z.string().optional(),
  RELEASE_SHA: z.string().optional(),
  BUILD_TIME: z.string().optional(),
  REPL_SLUG: z.string().optional(),
  REPL_OWNER: z.string().optional(),
});

function validateEnv(env) {
  // Parse and coerce
  const parsed = Base.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error("❌ Config validation failed:\n" + issues);
    process.exit(1);
  }
  const c = parsed.data;

  // Environment-aware additional guards
  const isProd = c.NODE_ENV === "production";
  if (isProd) {
    if (!c.APP_BASE_URL) die("APP_BASE_URL is required in production");
    if (new URL(c.DATABASE_URL).hostname === "localhost") {
      die("DATABASE_URL must not point to localhost in production");
    }
    if (c.ESC_DRY_RUN) {
      warn("ESC_DRY_RUN=true in production — escalations will not send");
    }
  }

  // Shadowing/unknown env keys (helps catch typos)
  const known = new Set(Object.keys(Base.shape));
  // Only check keys with relevant prefixes
  const relevantPrefixes = ['ESC_', 'OPS_', 'SLACK_', 'APP_', 'SENTRY_', 'ESCALATION_', 'DATABASE_', 'NODE_ENV'];
  const unknown = Object.keys(env).filter(k => {
    if (!k.match(/^[A-Z][A-Z0-9_]*$/)) return false; // Must be uppercase with underscores
    if (known.has(k)) return false; // Already validated
    // Only flag keys starting with relevant prefixes
    return relevantPrefixes.some(prefix => k.startsWith(prefix));
  });
  if (unknown.length) {
    warn(`Unknown env keys: ${unknown.join(", ")}`);
  }

  return c;

  function warn(msg) { console.warn("⚠️  Config warning:", msg); }
  function die(msg)  { console.error("❌ Config error:", msg); process.exit(1); }
}

let _cfg = null;
function cfg() { 
  _cfg ??= validateEnv(process.env); 
  return _cfg; 
}

function cfgSnapshot() {
  const c = cfg();
  return {
    NODE_ENV: c.NODE_ENV,
    APP_BASE_URL: c.APP_BASE_URL ?? null,
    DATABASE_URL: "redacted",
    OPS_HMAC_SECRET: "redacted",
    SLACK_SIGNING_SECRET: c.SLACK_SIGNING_SECRET ? "set" : "unset",
    SLACK_WEBHOOK_URL: c.SLACK_WEBHOOK_URL ? "set" : "unset",
    SLACK_VELOCITY_WEBHOOK: c.SLACK_VELOCITY_WEBHOOK ? "set" : "unset",
    SENTRY_DSN: c.SENTRY_DSN ? "set" : "unset",
    SENTRY_ENV: c.SENTRY_ENV ?? null,
    RELEASE_SHA: c.RELEASE_SHA ?? null,
    BUILD_TIME: c.BUILD_TIME ?? null,
    ESCALATION_WORKER_ENABLED: c.ESCALATION_WORKER_ENABLED,
    ESCALATION_V1: c.ESCALATION_V1,
    ESC_CANARY_PCT: c.ESC_CANARY_PCT,
    ESC_DRY_RUN: c.ESC_DRY_RUN,
    ESC_TICK_MS: c.ESC_TICK_MS,
    MAX_ESC_LEVEL: c.MAX_ESC_LEVEL,
    ESC_SNOOZE_MIN: c.ESC_SNOOZE_MIN,
    OPS_ADMIN_ROLE: c.OPS_ADMIN_ROLE,
    unknown_keys_note: "see server logs for any unknown env warnings",
  };
}

module.exports = { cfg, cfgSnapshot };
