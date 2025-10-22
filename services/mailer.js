const nodemailer = require('nodemailer');

function makeTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: process.env.SMTP_USER ? { 
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
      } : undefined,
    });
  }
  
  // Dev fallback: log emails to console
  return {
    sendMail: async (opts) => {
      console.log("[MAIL:DEV]", { to: opts.to, subject: opts.subject });
      console.log(opts.text || "");
      return { messageId: `dev-${Date.now()}` };
    },
  };
}

const mailer = makeTransport();

const MAIL_FROM = process.env.SMTP_FROM || "Eden ERP <no-reply@eden.local>";
const SUMMARY_TO = process.env.SUMMARY_TO || process.env.SMTP_FROM || "owner@eden.local";

module.exports = {
  mailer,
  MAIL_FROM,
  SUMMARY_TO
};
