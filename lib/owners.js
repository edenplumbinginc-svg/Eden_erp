// lib/owners.js — Velocity/Ops Ownership
// Env example:
// ROUTE_OWNERS='{
//   "GET /notifications/recent": {"owner":"@ops-oncall","slack_webhook":"https://hooks.slack.com/services/..."},
//   "GET /reports/tasks/overdue": {"owner":"@reports-squad"}
// }'

function loadOwners() {
  try {
    return JSON.parse(process.env.ROUTE_OWNERS || "{}");
  } catch {
    return {};
  }
}

function ownerFor(route, owners) {
  return owners[route] || null;
}

module.exports = { loadOwners, ownerFor };
