const Twilio = require('twilio');

const sid = process.env.TWILIO_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM;
const enabled = process.env.FEATURE_SMS === 'true' && sid && token && from;

let client = null;
if (enabled) {
  try {
    client = Twilio(sid, token);
  } catch (error) {
    console.error('[SMS] Failed to initialize Twilio client:', error.message);
  }
}

/**
 * sendSMS({ to, body })
 * Returns { ok: boolean, sid?: string, error?: string }
 */
async function sendSMS({ to, body }) {
  if (!enabled) {
    return { 
      ok: false, 
      error: 'SMS disabled (FEATURE_SMS=false or missing Twilio credentials)' 
    };
  }
  
  if (!to) {
    return { ok: false, error: "Missing 'to' phone number" };
  }
  
  if (!body) {
    return { ok: false, error: "Missing 'body' content" };
  }

  try {
    const message = await client.messages.create({ 
      to, 
      from, 
      body 
    });
    
    console.log('[SMS] Message sent successfully:', {
      sid: message.sid,
      to,
      status: message.status
    });
    
    return { 
      ok: true, 
      sid: message.sid,
      status: message.status
    };
  } catch (error) {
    console.error('[SMS] Failed to send message:', error.message);
    return { 
      ok: false, 
      error: error?.message || String(error) 
    };
  }
}

/**
 * Get SMS capabilities for diagnostics
 */
function smsCapabilities() {
  return {
    enabled,
    from: enabled ? from : null,
    provider: 'twilio',
    hasWhatsApp: false,
    hasVoice: false,
    configured: !!(sid && token && from)
  };
}

module.exports = {
  sendSMS,
  smsCapabilities
};
