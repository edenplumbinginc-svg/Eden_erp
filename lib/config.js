// lib/config.js - Startup config validation with Zod
const { z } = require('zod');

const boolString = z
  .string()
  .optional()
  .transform(val => val === 'true')
  .default('false');

const intString = (defaultVal) =>
  z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : defaultVal))
    .default(String(defaultVal));

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(''));

const configSchema = z.object({
  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL is required',
      invalid_type_error: 'DATABASE_URL must be a string',
    })
    .url('DATABASE_URL must be a valid URL')
    .min(1, 'DATABASE_URL cannot be empty'),

  OPS_HMAC_SECRET: z
    .string({
      required_error: 'OPS_HMAC_SECRET is required',
      invalid_type_error: 'OPS_HMAC_SECRET must be a string',
    })
    .min(16, 'OPS_HMAC_SECRET must be at least 16 characters'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),

  ESCALATION_WORKER_ENABLED: boolString,
  ESCALATION_V1: boolString,
  ESC_DRY_RUN: z
    .string()
    .optional()
    .transform(val => val !== 'false')
    .default('true'),

  ESC_CANARY_PCT: intString(100),
  ESC_TICK_MS: intString(60000),
  MAX_ESC_LEVEL: intString(7),
  ESC_SNOOZE_MIN: intString(30),

  OPS_ADMIN_ROLE: z.string().optional().default('ops_admin'),

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

let configInstance = null;

function loadConfig() {
  if (configInstance) return configInstance;

  try {
    const parsed = configSchema.parse(process.env);
    configInstance = parsed;
    return parsed;
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('\n❌ Configuration validation failed:\n');
      err.errors.forEach(e => {
        const path = e.path.join('.');
        console.error(`  • ${path}: ${e.message}`);
      });
      console.error('\n💡 Please set the required environment variables and restart.\n');
      process.exit(1);
    }
    throw err;
  }
}

function cfg() {
  if (!configInstance) {
    return loadConfig();
  }
  return configInstance;
}

function cfgSnapshot() {
  const config = cfg();
  
  const redactSecret = (key) => {
    const val = config[key];
    if (!val || val === '') return 'unset';
    return 'set';
  };

  const redactFull = (key) => {
    const val = config[key];
    if (!val || val === '') return 'unset';
    return '[REDACTED]';
  };

  return {
    DATABASE_URL: redactFull('DATABASE_URL'),
    OPS_HMAC_SECRET: redactSecret('OPS_HMAC_SECRET'),
    NODE_ENV: config.NODE_ENV,
    ESCALATION_WORKER_ENABLED: config.ESCALATION_WORKER_ENABLED,
    ESCALATION_V1: config.ESCALATION_V1,
    ESC_DRY_RUN: config.ESC_DRY_RUN,
    ESC_CANARY_PCT: config.ESC_CANARY_PCT,
    ESC_TICK_MS: config.ESC_TICK_MS,
    MAX_ESC_LEVEL: config.MAX_ESC_LEVEL,
    ESC_SNOOZE_MIN: config.ESC_SNOOZE_MIN,
    OPS_ADMIN_ROLE: config.OPS_ADMIN_ROLE,
    APP_BASE_URL: config.APP_BASE_URL || 'unset',
    SLACK_WEBHOOK_URL: redactSecret('SLACK_WEBHOOK_URL'),
    SLACK_VELOCITY_WEBHOOK: redactSecret('SLACK_VELOCITY_WEBHOOK'),
    SLACK_SIGNING_SECRET: redactSecret('SLACK_SIGNING_SECRET'),
    SENTRY_DSN: redactSecret('SENTRY_DSN'),
    SENTRY_ENV: config.SENTRY_ENV || 'unset',
    RELEASE_SHA: config.RELEASE_SHA || 'unset',
    BUILD_TIME: config.BUILD_TIME || 'unset',
  };
}

module.exports = {
  loadConfig,
  cfg,
  cfgSnapshot,
};
