# Monitoring & Health Checks Guide

## Overview

Eden ERP now includes a comprehensive monitoring and health check system designed for production deployments. This system provides real-time visibility into application health, performance metrics, and system status.

---

## 🏥 Health Check Endpoints

### Quick Health Check
**Endpoint:** `GET /api/health/quick`

Lightweight health check suitable for load balancers and uptime monitoring.

```bash
curl https://your-app.repl.co/api/health/quick
```

**Response:**
```json
{
  "healthy": true,
  "status": "healthy",
  "timestamp": "2025-10-20T21:27:12.031Z"
}
```

**Status Codes:**
- `200` - Service is healthy
- `503` - Service is unhealthy

---

### Detailed Health Check
**Endpoint:** `GET /api/health/detailed`

Comprehensive health check with detailed subsystem status.

```bash
curl https://your-app.repl.co/api/health/detailed
```

**Response:**
```json
{
  "healthy": true,
  "status": "healthy",
  "timestamp": "2025-10-20T21:27:12.031Z",
  "duration": 125,
  "checks": {
    "database": {
      "healthy": true,
      "status": "healthy",
      "message": "Database connected",
      "responseTime": 45,
      "dbTime": "2025-10-20T21:27:12.031Z",
      "pool": {
        "total": 10,
        "idle": 9,
        "waiting": 0
      }
    },
    "schema": {
      "healthy": true,
      "status": "healthy",
      "message": "Schema intact",
      "tableCount": 17,
      "columnCount": 111,
      "missingTables": []
    },
    "api": {
      "healthy": true,
      "status": "healthy",
      "message": "API responding",
      "uptime": 3600,
      "responseTime": 2,
      "memory": {
        "heapUsed": 45,
        "heapTotal": 78,
        "rss": 125,
        "external": 2
      }
    },
    "system": {
      "healthy": true,
      "status": "healthy",
      "message": "Memory 58% used",
      "uptime": 3600,
      "memory": {
        "heapUsed": 45,
        "heapTotal": 78,
        "rss": 125,
        "usagePercent": 58
      },
      "cpu": {
        "user": 1234,
        "system": 567
      },
      "pid": 12345,
      "nodeVersion": "v20.0.0"
    },
    "environment": {
      "healthy": true,
      "status": "healthy",
      "message": "Environment configured",
      "required": {
        "configured": 2,
        "missing": []
      },
      "optional": {
        "configured": 2,
        "total": 3
      },
      "nodeEnv": "production"
    }
  }
}
```

**Subsystem Checks:**
- **Database:** Connectivity, response time, connection pool status
- **Schema:** Table count, missing critical tables
- **API:** Uptime, response time, memory usage
- **System:** Memory, CPU, process information
- **Environment:** Required and optional environment variables

---

### Liveness Probe
**Endpoint:** `GET /api/health/live`

Simple check that the process is running. Use for container orchestration.

```bash
curl https://your-app.repl.co/api/health/live
```

**Response:**
```json
{
  "alive": true,
  "timestamp": "2025-10-20T21:27:13.059Z"
}
```

**Always returns 200 if the process is running.**

---

### Readiness Probe
**Endpoint:** `GET /api/health/ready`

Checks if the service is ready to accept traffic. Use for container orchestration and load balancers.

```bash
curl https://your-app.repl.co/api/health/ready
```

**Response (Ready):**
```json
{
  "ready": true,
  "timestamp": "2025-10-20T21:27:13.059Z"
}
```

**Response (Not Ready):**
```json
{
  "ready": false,
  "reason": "unhealthy",
  "timestamp": "2025-10-20T21:27:13.059Z"
}
```

**Status Codes:**
- `200` - Ready to accept traffic
- `503` - Not ready

---

### Legacy Health Check
**Endpoint:** `GET /health` or `GET /api/health`

Simple health check for backward compatibility.

```bash
curl https://your-app.repl.co/health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## 📊 Metrics Endpoint

### Application Metrics
**Endpoint:** `GET /api/health/metrics`

Real-time application performance metrics.

```bash
curl https://your-app.repl.co/api/health/metrics
```

**Response:**
```json
{
  "timestamp": "2025-10-20T21:27:12.031Z",
  "uptime": 3600,
  "requests": {
    "total": 1234,
    "rate": "12.34",
    "byMethod": {
      "GET": 800,
      "POST": 300,
      "PATCH": 100,
      "DELETE": 34
    },
    "byStatus": {
      "200": 1000,
      "201": 150,
      "400": 50,
      "404": 20,
      "500": 14
    },
    "topPaths": {
      "/api/projects": 450,
      "/api/tasks/:id": 320,
      "/api/reports/tasks/status": 180
    }
  },
  "responseTime": {
    "avg": 125,
    "min": 10,
    "max": 2500,
    "p50": 100,
    "p95": 450,
    "p99": 1200
  },
  "errors": {
    "total": 14,
    "rate": "0.0039",
    "byType": {
      "TypeError": 8,
      "ValidationError": 4,
      "DatabaseError": 2
    },
    "recent": [
      {
        "timestamp": "2025-10-20T21:25:00.000Z",
        "type": "DatabaseError",
        "message": "Connection timeout",
        "stack": "Error: Connection timeout\n  at Pool.query..."
      }
    ]
  },
  "database": {
    "queries": 3456,
    "errors": 5,
    "avgQueryTime": 45,
    "errorRate": "0.14%"
  }
}
```

**Metrics Tracked:**
- **Requests:** Total, rate per second, by method, by status code, top paths
- **Response Time:** Average, min, max, percentiles (P50, P95, P99)
- **Errors:** Total, rate, by type, recent samples
- **Database:** Query count, errors, average query time, error rate

---

## 🎛️ Combined Status Dashboard

### Status Endpoint
**Endpoint:** `GET /api/health/status`

Combined health checks and metrics in one response.

```bash
curl https://your-app.repl.co/api/health/status
```

**Response:**
```json
{
  "timestamp": "2025-10-20T21:27:12.031Z",
  "health": {
    "healthy": true,
    "status": "healthy",
    "checks": { ... }
  },
  "metrics": {
    "requests": { ... },
    "responseTime": { ... },
    "errors": { ... },
    "database": { ... }
  }
}
```

---

## 📝 Structured Logging

### Log Levels

All logs are output as structured JSON with the following levels:
- **DEBUG** - Detailed diagnostic information
- **INFO** - Informational messages
- **WARN** - Warning messages
- **ERROR** - Error messages
- **CRITICAL** - Critical failures

### Log Format

```json
{
  "timestamp": "2025-10-20T21:27:12.031Z",
  "level": "INFO",
  "message": "API server started",
  "port": 3000,
  "env": "production",
  "pid": 12345
}
```

### Configuring Log Level

Set the `LOG_LEVEL` environment variable:

```bash
export LOG_LEVEL=DEBUG  # Show all logs
export LOG_LEVEL=INFO   # Show INFO and above (default)
export LOG_LEVEL=WARN   # Show WARN and above
export LOG_LEVEL=ERROR  # Show ERROR and above
export LOG_LEVEL=CRITICAL  # Show only critical logs
```

### Specialized Logging

The logger includes specialized functions for common scenarios:

```javascript
const logger = require('./lib/logger');

// HTTP request logging
logger.request(req, duration);

// Database query logging
logger.query(sql, duration, error);

// Authentication event logging
logger.auth('login', userId, success, metadata);

// Security event logging
logger.security('unauthorized_access', 'critical', metadata);
```

---

## 🔔 Setting Up Monitoring

### Uptime Monitoring

Use services like UptimeRobot, Pingdom, or Datadog to monitor:

1. **Primary Monitor:**
   - URL: `https://your-app.repl.co/api/health/quick`
   - Interval: 60 seconds
   - Alert: If not 200 OK or response time > 2000ms

2. **Detailed Monitor:**
   - URL: `https://your-app.repl.co/api/health/detailed`
   - Interval: 300 seconds (5 minutes)
   - Alert: If status is "unhealthy"

### Log Aggregation

Configure log shipping to services like:
- Papertrail
- Loggly
- Datadog
- New Relic

The structured JSON logs are easy to parse and query.

### Metrics Dashboard

Create dashboards with:
- Request rate trends
- Response time percentiles
- Error rate over time
- Database query performance
- Memory and CPU usage

---

## 🚨 Alert Configuration

### Recommended Alerts

1. **Service Down**
   - Trigger: Health check fails 3 consecutive times
   - Severity: Critical

2. **High Error Rate**
   - Trigger: Error rate > 5% over 5 minutes
   - Severity: Critical

3. **Slow Response Time**
   - Trigger: P95 response time > 2000ms for 5 minutes
   - Severity: Warning

4. **Database Issues**
   - Trigger: Database error rate > 1%
   - Severity: Critical

5. **Memory Usage**
   - Trigger: Memory usage > 85% for 10 minutes
   - Severity: Warning

6. **Database Connection Pool**
   - Trigger: Waiting connections > 5
   - Severity: Warning

---

## 🧪 Testing Monitoring

### Run Production Smoke Tests

```bash
# Test all health and monitoring endpoints
npm run smoke:prod

# Test against a specific deployment
TEST_BASE_URL=https://your-app.repl.co npm run smoke:prod
```

### Manual Testing

```bash
# Test each endpoint
curl https://your-app.repl.co/api/health/quick
curl https://your-app.repl.co/api/health/detailed
curl https://your-app.repl.co/api/health/live
curl https://your-app.repl.co/api/health/ready
curl https://your-app.repl.co/api/health/metrics
curl https://your-app.repl.co/api/health/status
```

---

## 📚 Additional Resources

- **Post-Deploy Checklist:** `/POST_DEPLOY_CHECKLIST.md`
- **Production Runbook:** `/PRODUCTION.md`
- **API Documentation:** `/API_SUMMARY.md`
- **Project Documentation:** `/replit.md`

---

**Last Updated:** October 20, 2025  
**Version:** 1.0
