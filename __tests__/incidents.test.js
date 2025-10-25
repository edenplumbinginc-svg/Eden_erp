// __tests__/incidents.test.js
const { recordIncidentForAlarm, buildKey } = require("../lib/incidents");

describe("Incident correlation", () => {
  test("buildKey creates correct incident key format", () => {
    expect(buildKey("GET /api/test", "error_rate")).toBe("GET /api/test::error_rate");
    expect(buildKey("POST /tasks", "slo_violation")).toBe("POST /tasks::slo_violation");
  });

  test("creates then updates incident by incident_key", async () => {
    const route = "GET /test/route";
    const kind = "error_rate";
    
    // First alarm creates new incident
    const first = await recordIncidentForAlarm({
      route,
      kind,
      severity: "warning",
      evidence: { err_rate_1m: 50, samples_1m: 10 },
      owner: { owner: "@ops-team" },
      hint: "Check error logs"
    });
    
    expect(first.status).toBe("open");
    expect(first.route).toBe(route);
    expect(first.kind).toBe(kind);
    expect(first.severity).toBe("warning");
    expect(first.incidentKey).toBe("GET /test/route::error_rate");
    expect(first.owner).toEqual({ owner: "@ops-team" });
    
    // Wait a tiny bit to ensure time difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second alarm for same route::kind updates existing incident
    const second = await recordIncidentForAlarm({
      route,
      kind,
      severity: "critical",
      evidence: { err_rate_1m: 90, samples_1m: 20 },
      hint: "Critical errors detected"
    });
    
    expect(second.id).toBe(first.id); // Same incident
    expect(second.severity).toBe("critical"); // Escalated to critical
    expect(second.status).toBe("open"); // Still open
    expect(new Date(second.lastSeen).getTime()).toBeGreaterThan(new Date(first.lastSeen).getTime());
    
    // Metadata should contain latest evidence
    expect(second.metadata).toHaveProperty("lastEvidence");
    expect(second.metadata.lastEvidence).toEqual({ err_rate_1m: 90, samples_1m: 20 });
  });

  test("creates separate incidents for different route::kind combinations", async () => {
    const route = "GET /api/separate";
    
    const errorRateIncident = await recordIncidentForAlarm({
      route,
      kind: "error_rate",
      severity: "warning",
      evidence: { err_rate_1m: 10 }
    });
    
    const p95Incident = await recordIncidentForAlarm({
      route,
      kind: "p95_regress",
      severity: "critical",
      evidence: { p95_ms: 500 }
    });
    
    expect(errorRateIncident.id).not.toBe(p95Incident.id);
    expect(errorRateIncident.incidentKey).toBe("GET /api/separate::error_rate");
    expect(p95Incident.incidentKey).toBe("GET /api/separate::p95_regress");
  });

  test("preserves owner from first alarm when not provided in updates", async () => {
    const route = "GET /test/owner-preserve";
    const kind = "slo_violation";
    
    const first = await recordIncidentForAlarm({
      route,
      kind,
      severity: "critical",
      owner: { owner: "@platform-team", slack_webhook: "https://hooks.slack.com/test" }
    });
    
    expect(first.owner).toEqual({ owner: "@platform-team", slack_webhook: "https://hooks.slack.com/test" });
    
    const second = await recordIncidentForAlarm({
      route,
      kind,
      severity: "critical",
      owner: null
    });
    
    // Owner should still be from first alarm (not overwritten with null)
    expect(second.owner).toEqual({ owner: "@platform-team", slack_webhook: "https://hooks.slack.com/test" });
  });
});
