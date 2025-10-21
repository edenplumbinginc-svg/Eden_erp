const express = require('express');
const { healthz } = require('./routes/healthz.cjs');

const app = express();
const { initSentry } = require("./monitoring/sentry.cjs");
initSentry(app);

// Mount health check
app.get('/healthz', healthz);

// If you already have an API, you can add more routes here or require your existing app.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
