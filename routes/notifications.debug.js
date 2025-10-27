const express = require('express');
const router = express.Router();
const notifService = require('../services/notifications');
const mailerService = require('../services/mailer');
const queueService = require('../services/queue');
const { authenticate, authorize } = require('../middleware/auth');
const { providerCapabilities } = notifService;

router.get('/debug', authenticate, authorize(['Admin', 'System']), async (req, res) => {
  try {
    const providerCaps = providerCapabilities();
    const smsCaps = providerCaps?.sms || {};
    
    const caps = {
      channels: {
        inApp: {
          available: typeof notifService.createNotification === 'function',
          methods: ['createNotification', 'getDepartmentUsers'].filter(
            m => typeof notifService[m] === 'function'
          )
        },
        email: {
          available: !!mailerService.mailer,
          provider: process.env.SMTP_HOST ? 'SMTP' : 'Console (Dev)',
          configured: !!process.env.SMTP_HOST,
          from: mailerService.MAIL_FROM
        },
        sms: {
          available: smsCaps.enabled || false,
          provider: smsCaps.provider || null,
          configured: smsCaps.configured || false,
          from: smsCaps.from || null,
          featureFlag: process.env.FEATURE_SMS === 'true'
        },
        voice: {
          available: smsCaps.hasVoice || false,
          provider: smsCaps.hasVoice ? smsCaps.provider : null,
          configured: false
        },
        whatsapp: {
          available: smsCaps.hasWhatsApp || false,
          provider: smsCaps.hasWhatsApp ? smsCaps.provider : null,
          configured: false
        },
        slack: {
          available: !!process.env.SLACK_VELOCITY_WEBHOOK,
          provider: 'Slack Webhooks',
          configured: !!process.env.SLACK_VELOCITY_WEBHOOK,
          escalationEnabled: process.env.ESCALATION_WORKER_ENABLED === 'true'
        }
      },
      
      infrastructure: {
        queue: {
          available: typeof queueService.enqueue === 'function',
          size: queueService.getQueueSize(),
          handlers: ['notify-user', 'daily-summary']
        },
        escalation: {
          available: !!process.env.ESCALATION_WORKER_ENABLED,
          enabled: process.env.ESCALATION_WORKER_ENABLED === 'true',
          dryRun: process.env.ESC_DRY_RUN === 'true',
          canaryPct: parseInt(process.env.ESC_CANARY_PCT || '100', 10)
        }
      },
      
      providerEnvVars: {
        smtp: {
          SMTP_HOST: !!process.env.SMTP_HOST,
          SMTP_PORT: !!process.env.SMTP_PORT,
          SMTP_USER: !!process.env.SMTP_USER,
          SMTP_PASS: !!process.env.SMTP_PASS,
          SMTP_FROM: !!process.env.SMTP_FROM
        },
        slack: {
          SLACK_VELOCITY_WEBHOOK: !!process.env.SLACK_VELOCITY_WEBHOOK,
          SLACK_SIGNING_SECRET: !!process.env.SLACK_SIGNING_SECRET
        },
        twilio: {
          TWILIO_SID: !!process.env.TWILIO_SID,
          TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
          TWILIO_FROM: !!process.env.TWILIO_FROM
        },
        sendgrid: {
          SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY
        },
        resend: {
          RESEND_API_KEY: !!process.env.RESEND_API_KEY
        },
        telegram: {
          TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN
        }
      },
      
      features: {
        userPreferences: false,
        quietHours: false,
        digestMode: false,
        channelSelection: false,
        escalationRules: true,
        batchNotifications: false,
        notificationHistory: true,
        unreadBadge: true,
        markAsRead: true
      },
      
      recommendedNextSteps: []
    };
    
    if (!caps.channels.email.configured) {
      caps.recommendedNextSteps.push({
        priority: 'high',
        action: 'Configure SMTP email provider',
        envVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']
      });
    }
    
    if (!caps.channels.sms.available) {
      caps.recommendedNextSteps.push({
        priority: 'medium',
        action: 'Enable SMS notifications via Twilio',
        envVars: ['TWILIO_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'FEATURE_SMS=true'],
        note: 'SMS adapter is already implemented at providers/sms.twilio.js'
      });
    }
    
    if (!caps.features.userPreferences) {
      caps.recommendedNextSteps.push({
        priority: 'medium',
        action: 'Add user notification preferences',
        implementation: 'Database schema + UI for per-channel, per-event preferences'
      });
    }
    
    res.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      caps 
    });
  } catch (e) {
    res.status(500).json({ 
      ok: false, 
      error: e?.message || String(e) 
    });
  }
});

module.exports = router;
