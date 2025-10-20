# Production Runbook - Eden ERP

This runbook provides operational guidance for running Eden ERP in production, including troubleshooting, monitoring, and incident response procedures.

---

## 📚 Table of Contents

1. [System Architecture](#system-architecture)
2. [Monitoring & Alerts](#monitoring--alerts)
3. [Common Issues](#common-issues)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Incident Response](#incident-response)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Performance Tuning](#performance-tuning)
8. [Security](#security)
9. [Backup & Recovery](#backup--recovery)
10. [Deployment](#deployment)

---

## 🏗️ System Architecture

### Components

**Backend API Server**
- Node.js Express application
- Port: 3000 (configurable via PORT env var)
- Authentication: Development headers or JWT bearer tokens
- Database: PostgreSQL (Supabase)

**Database**
- Provider: Supabase PostgreSQL
- Pooler: Session pooler (aws-0) recommended
- Extensions: pgcrypto, citext
- Tables: 17+ tables including users, projects, tasks, notifications, etc.

**Frontend** (if deployed)
- Vite + React application
- Port: 5000

### Key Endpoints

| Endpoint | Purpose | Critical? |
|----------|---------|-----------|
| `/health` | Legacy health check | No |
| `/api/health/quick` | Quick health status | Yes |
| `/api/health/detailed` | Comprehensive health check | Yes |
| `/api/health/live` | Liveness probe | Yes |
| `/api/health/ready` | Readiness probe | Yes |
| `/api/health/metrics` | Application metrics | Yes |
| `/api/health/status` | Combined health + metrics | No |
| `/db/ping` | Database connectivity | Yes |

---

## 📊 Monitoring & Alerts

### Health Check Monitoring

**Recommended Setup:**
- Monitor `/api/health/quick` every 60 seconds
- Alert if response is not 200 OK
- Alert if response time > 2000ms
- Alert if 3 consecutive failures

**What to Check:**
```bash
# Quick health check
curl https://your-app.repl.co/api/health/quick

# Detailed diagnostics
curl https://your-app.repl.co/api/health/detailed
```

### Key Metrics to Monitor

1. **Request Metrics**
   - Total requests
   - Requests per second
   - Requests by method (GET, POST, etc.)
   - Requests by status code (200, 400, 500, etc.)

2. **Response Time Metrics**
   - Average response time
   - P50, P95, P99 percentiles
   - Min/max response times

3. **Error Metrics**
   - Total errors
   - Error rate (errors/second)
   - Errors by type
   - Recent error samples

4. **Database Metrics**
   - Total queries
   - Query errors
   - Average query time
   - Error rate percentage
   - Active connections
   - Idle connections
   - Waiting connections

5. **System Metrics**
   - Memory usage (heap, RSS)
   - CPU usage
   - Process uptime
   - Node.js version

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Response time (avg) | > 1000ms | > 2000ms |
| Response time (P95) | > 2000ms | > 5000ms |
| Error rate | > 1% | > 5% |
| Memory usage | > 75% | > 90% |
| Database errors | > 0.1% | > 1% |
| Service downtime | > 1 min | > 5 min |

### Accessing Metrics

```bash
# Get current metrics
curl https://your-app.repl.co/api/health/metrics

# Get full status (health + metrics)
curl https://your-app.repl.co/api/health/status
```

---

## 🔧 Common Issues

### Issue: Service is Down

**Symptoms:**
- Health checks return 503 or timeout
- API endpoints are unreachable
- Users cannot access the application

**Quick Diagnosis:**
```bash
# Check if service is responding
curl https://your-app.repl.co/api/health/live

# Check detailed health
curl https://your-app.repl.co/api/health/detailed
```

**Resolution Steps:**
1. Check Replit deployment status
2. Review application logs for startup errors
3. Verify environment variables are set
4. Check database connectivity
5. Restart the deployment if necessary

### Issue: Database Connection Failed

**Symptoms:**
- Error: "Tenant or user not found"
- Error: "Connection refused"
- Database health check fails
- 500 errors on database operations

**Quick Diagnosis:**
```bash
# Test database connection
curl https://your-app.repl.co/db/ping

# Check database configuration
curl https://your-app.repl.co/api/debug/dbinfo
```

**Resolution Steps:**
1. Verify DATABASE_URL is set correctly
2. Check if using correct pooler (aws-0 vs aws-1)
3. Verify Supabase project is active
4. Check database credentials are valid
5. Ensure DB_SSL_REJECT_UNAUTHORIZED is set if needed
6. Review database connection pool settings

**Prevention:**
- Use database configuration validation on startup
- Set EXPECTED_DB_HOST to lock database identity
- Monitor database connectivity continuously

### Issue: High Response Times

**Symptoms:**
- API requests taking > 2 seconds
- P95 response time > 5 seconds
- Slow page loads

**Quick Diagnosis:**
```bash
# Check current metrics
curl https://your-app.repl.co/api/health/metrics | jq '.responseTime'

# Check database performance
curl https://your-app.repl.co/api/health/metrics | jq '.database'
```

**Resolution Steps:**
1. Check database query performance
2. Review slow queries in logs
3. Check if database needs indexing
4. Verify connection pool is not exhausted
5. Check memory usage (possible memory leak)
6. Review recent code changes
7. Consider scaling up resources

### Issue: Memory Leak

**Symptoms:**
- Memory usage steadily increasing
- Memory > 85% for extended period
- Application becoming slow over time
- Unexpected restarts

**Quick Diagnosis:**
```bash
# Check system metrics
curl https://your-app.repl.co/api/health/detailed | jq '.checks.system.memory'
```

**Resolution Steps:**
1. Review memory usage trends
2. Check for memory leaks in recent code changes
3. Review database connection pool usage
4. Check for unclosed database connections
5. Restart the service to clear memory
6. Implement memory profiling if issue persists

### Issue: Authentication Failures

**Symptoms:**
- 401 Unauthorized errors
- Users cannot log in
- API requests are rejected

**Quick Diagnosis:**
```bash
# Test authentication with dev headers
curl -H "X-Dev-Email: admin@edenmep.ca" \
     -H "X-Dev-User-Id: 00000000-0000-0000-0000-000000000000" \
     https://your-app.repl.co/api/projects
```

**Resolution Steps:**
1. Verify NODE_ENV is set correctly
2. Check authentication middleware is loaded
3. Review authentication logs
4. Verify JWT secret is set (if using JWT)
5. Check for CORS issues

### Issue: Database Schema Mismatch

**Symptoms:**
- Errors about missing columns
- Errors about type mismatches
- 500 errors on specific endpoints

**Quick Diagnosis:**
```bash
# Check schema health
curl https://your-app.repl.co/api/health/detailed | jq '.checks.schema'
```

**Resolution Steps:**
1. Run `npm run db:push` to sync schema
2. Check for pending migrations
3. Verify all critical tables exist
4. Review recent schema changes
5. Check Drizzle schema files

---

## 🔍 Troubleshooting Guide

### Step-by-Step Diagnostic Process

#### 1. Verify Service is Running

```bash
# Liveness check
curl https://your-app.repl.co/api/health/live

# Expected: {"alive": true, "timestamp": "..."}
```

#### 2. Check Overall Health

```bash
# Quick health check
curl https://your-app.repl.co/api/health/quick

# Expected: {"healthy": true, "status": "healthy", "timestamp": "..."}
```

#### 3. Get Detailed Diagnostics

```bash
# Comprehensive health check
curl https://your-app.repl.co/api/health/detailed | jq
```

Review each subsystem:
- **Database:** Check connectivity and response time
- **Schema:** Verify all tables exist
- **API:** Check response time and memory usage
- **System:** Review memory and CPU usage
- **Environment:** Verify all required variables are set

#### 4. Check Application Metrics

```bash
# Get metrics
curl https://your-app.repl.co/api/health/metrics | jq
```

Look for:
- High error rates
- Slow response times
- Database query issues
- Recent errors in `.errors.recent`

#### 5. Review Application Logs

Check Replit console for:
- Startup errors
- Runtime errors
- Database connection issues
- Authentication failures
- Unhandled exceptions

#### 6. Test Critical Endpoints

```bash
# Test projects endpoint
curl -H "X-Dev-Email: admin@edenmep.ca" \
     https://your-app.repl.co/api/projects

# Test database
curl https://your-app.repl.co/db/ping

# Test reports
curl -H "X-Dev-Email: admin@edenmep.ca" \
     https://your-app.repl.co/api/reports/tasks/status
```

### Debugging Tools

**View Database Configuration:**
```bash
curl https://your-app.repl.co/api/debug/dbinfo | jq
```

**Run Smoke Tests:**
```bash
TEST_BASE_URL=https://your-app.repl.co node scripts/prod-smoke-test.js
```

**Check Database Schema:**
```bash
npm run db:introspect
```

---

## 🚨 Incident Response

### Severity Levels

**P0 - Critical (Service Down)**
- Entire service is down
- Database is inaccessible
- Data loss or corruption

**P1 - High (Partial Outage)**
- Critical features unavailable
- Severe performance degradation
- Authentication failures

**P2 - Medium (Degraded Service)**
- Non-critical features affected
- Intermittent errors
- Slow performance

**P3 - Low (Minor Issue)**
- Cosmetic issues
- Non-urgent bugs
- Feature requests

### Response Procedures

#### P0 - Critical Incident

**Immediate Actions (< 5 minutes):**
1. Acknowledge the incident
2. Check if service is responding (`/api/health/live`)
3. Review error logs
4. Determine if rollback is needed
5. Notify engineering team

**Investigation (< 15 minutes):**
1. Run comprehensive diagnostics
2. Identify root cause
3. Determine fix or rollback strategy
4. Estimate time to resolution

**Resolution:**
1. Apply fix or perform rollback
2. Verify service is healthy
3. Run smoke tests
4. Monitor for 30 minutes
5. Document incident

#### P1 - High Severity Incident

**Immediate Actions (< 15 minutes):**
1. Acknowledge the incident
2. Run detailed health checks
3. Review recent deployments
4. Identify affected users/features
5. Notify team

**Investigation (< 30 minutes):**
1. Reproduce the issue
2. Check metrics and logs
3. Determine root cause
4. Plan remediation

**Resolution:**
1. Apply fix
2. Test affected functionality
3. Monitor metrics
4. Document findings

### Rollback Procedure

**When to Rollback:**
- Service is completely down
- Critical data corruption detected
- Unfixable bugs in new deployment
- Performance degradation > 50%

**How to Rollback:**
1. Use Replit's checkpoint system to revert
2. Or redeploy previous version
3. Verify database compatibility
4. Run smoke tests
5. Monitor for issues

**After Rollback:**
1. Identify what went wrong
2. Create hotfix plan
3. Test thoroughly before redeploying
4. Document learnings

---

## 🔧 Maintenance Procedures

### Routine Maintenance

**Daily:**
- Review application metrics
- Check error logs
- Verify scheduled jobs ran successfully
- Monitor database performance

**Weekly:**
- Review performance trends
- Check database growth
- Analyze slow queries
- Update dependencies if needed
- Review security logs

**Monthly:**
- Database maintenance (VACUUM, ANALYZE)
- Review and optimize indexes
- Analyze cost and usage
- Update documentation
- Security audit

### Database Maintenance

**Regular Tasks:**
```sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim space
VACUUM;

-- Check for bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Index Maintenance:**
```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

### Log Rotation

Application logs are managed by Replit. For external log aggregation:
1. Configure log shipping to external service
2. Set retention policies
3. Archive old logs
4. Monitor log volume

---

## ⚡ Performance Tuning

### Database Optimization

**Connection Pool Tuning:**
- Default pool size: 10 connections
- Adjust based on load: `new Pool({ max: 20 })`
- Monitor pool usage via metrics
- Watch for connection exhaustion

**Query Optimization:**
1. Identify slow queries from metrics
2. Add indexes where needed
3. Optimize joins
4. Use prepared statements
5. Implement query caching if needed

**Recommended Indexes:**
```sql
-- Tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_ball_in_court ON tasks(ball_in_court) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at) WHERE deleted_at IS NULL;

-- Activity log
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
```

### Application Optimization

**Response Time Improvements:**
1. Enable gzip compression
2. Implement caching headers
3. Use database query result caching
4. Optimize middleware order
5. Minimize database queries per request

**Memory Optimization:**
1. Limit query result sizes
2. Stream large responses
3. Clear unused data structures
4. Monitor for memory leaks
5. Use connection pooling efficiently

---

## 🔒 Security

### Security Monitoring

**Watch for:**
- Failed authentication attempts
- Unusual API usage patterns
- SQL injection attempts
- Unauthorized access attempts
- Suspicious user behavior

**Security Logs:**
- Review authentication logs daily
- Monitor for brute force attacks
- Check for data exfiltration patterns
- Alert on privilege escalation attempts

### Security Checklist

- [ ] All API routes require authentication
- [ ] Environment variables are secure
- [ ] No secrets in logs or error messages
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] SQL injection protection is active
- [ ] Input validation is comprehensive
- [ ] Rate limiting is considered
- [ ] Database credentials are rotated regularly

### Incident Response

**If Security Breach Detected:**
1. Isolate affected systems
2. Revoke compromised credentials
3. Audit access logs
4. Notify security team
5. Patch vulnerability
6. Document incident
7. Implement preventive measures

---

## 💾 Backup & Recovery

### Backup Strategy

**Database Backups:**
- Supabase provides automatic daily backups
- Retention: 7 days on free tier, 30+ days on pro
- Point-in-time recovery available

**Manual Backup:**
```bash
# Export database schema
pg_dump -s $DATABASE_URL > schema_backup.sql

# Export specific tables
pg_dump -t users -t projects -t tasks $DATABASE_URL > data_backup.sql
```

### Recovery Procedures

**Restore from Backup:**
1. Access Supabase dashboard
2. Navigate to Database > Backups
3. Select backup to restore
4. Confirm restoration
5. Verify data integrity
6. Run smoke tests

**Partial Data Recovery:**
```bash
# Restore specific tables
psql $DATABASE_URL < data_backup.sql
```

---

## 🚀 Deployment

### Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Database migrations prepared
- [ ] Environment variables documented
- [ ] Rollback plan ready
- [ ] Team notified
- [ ] Monitoring ready

### Deployment Steps

1. **Prepare:**
   - Review changes
   - Test locally
   - Prepare rollback plan

2. **Deploy:**
   - Push to production branch
   - Apply database migrations
   - Restart services

3. **Verify:**
   - Run smoke tests
   - Check health endpoints
   - Monitor metrics
   - Verify critical workflows

4. **Monitor:**
   - Watch for errors (15 min)
   - Check performance metrics
   - Review user feedback
   - Document any issues

### Post-Deployment

- [ ] Smoke tests passed
- [ ] Health checks green
- [ ] Metrics are normal
- [ ] No error spikes
- [ ] Team notified
- [ ] Documentation updated

---

## 📞 Escalation & Contacts

### On-Call Rotation

- **Primary On-Call:** _______________
- **Secondary On-Call:** _______________
- **Manager:** _______________

### Support Contacts

- **Replit Support:** https://replit.com/support
- **Supabase Support:** https://supabase.com/support
- **Database DBA:** _______________
- **Security Team:** _______________

---

## 📚 Additional Resources

- **API Documentation:** `/API_SUMMARY.md`
- **Database Schema:** `/drizzle/schema.ts`
- **Post-Deploy Checklist:** `/POST_DEPLOY_CHECKLIST.md`
- **Project Documentation:** `/replit.md`
- **README:** `/README.md`

---

**Last Updated:** _____________  
**Maintained By:** _____________  
**Review Cycle:** Monthly
