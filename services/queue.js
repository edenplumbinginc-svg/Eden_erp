const jobQueue = [];
const handlers = {};

function registerHandler(name, handler) {
  handlers[name] = handler;
}

function enqueue(name, payload) {
  jobQueue.push({ name, payload, enqueuedAt: new Date() });
  console.log(`[QUEUE] Enqueued job: ${name}`, payload);
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

module.exports = {
  enqueue,
  registerHandler,
  getQueueSize: () => jobQueue.length
};
