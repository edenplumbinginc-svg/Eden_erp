const jobQueue = [];
const handlers = {};

function registerHandler(name, handler) {
  handlers[name] = handler;
}

function enqueue(name, payload) {
  jobQueue.push({ name, payload, enqueuedAt: new Date() });
  console.log(`[QUEUE] Enqueued job: ${name}`, payload);
  
  const handler = handlers[name];
  if (handler) {
    setImmediate(() => handler(payload).catch(err => console.error(`[job:${name}]`, err)));
  }
}

async function processJobs() {
  if (jobQueue.length === 0) return;
  
  const job = jobQueue.shift();
  const handler = handlers[job.name];
  
  if (!handler) {
    console.error(`[QUEUE] No handler registered for job: ${job.name}`);
    return;
  }
  
  try {
    console.log(`[QUEUE] Processing job: ${job.name}`);
    await handler(job.payload);
    console.log(`[QUEUE] Completed job: ${job.name}`);
  } catch (error) {
    console.error(`[QUEUE] Failed job: ${job.name}`, error);
    jobQueue.push({ ...job, retryCount: (job.retryCount || 0) + 1 });
  }
}

setInterval(processJobs, 1000);

registerHandler("notify-user", async ({ userId, event, meta }) => {
  console.log(`[notify-user] → user=${userId} event=${event}`, meta || {});
});

registerHandler("daily-summary", async ({ dateIso }) => {
  console.log(`[daily-summary] generating for ${dateIso}`);
  
  const { mailer, MAIL_FROM, SUMMARY_TO } = require('./mailer');
  const { buildDailySummary } = require('./summary');
  
  const { text, counts } = await buildDailySummary(dateIso);
  const subject = `Daily Summary — ${dateIso} (Overdue:${counts.overdue} • Today:${counts.dueToday})`;
  
  await mailer.sendMail({
    from: MAIL_FROM,
    to: SUMMARY_TO,
    subject,
    text,
  });
  
  console.log("[daily-summary] email sent", { to: SUMMARY_TO, subject });
});

module.exports = {
  enqueue,
  registerHandler,
  getQueueSize: () => jobQueue.length
};
