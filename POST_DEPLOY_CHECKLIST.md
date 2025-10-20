# Post-Deploy Checklist

This checklist ensures that your Eden ERP deployment is healthy and functioning correctly after deployment to production.

## 🚀 Automated Verification

### 1. Run Production Smoke Tests
```bash
# Set the base URL of your deployment
export TEST_BASE_URL=https://your-deployment.repl.co

# Run the comprehensive smoke test suite
node scripts/prod-smoke-test.js
```

**Expected Result:** All tests should pass. If any fail, investigate immediately.

### 2. Check Health Endpoints

#### Quick Health Check
```bash
curl https://your-deployment.repl.co/api/health/quick
```
**Expected:** `{"healthy": true, "status": "healthy", ...}`

#### Detailed Health Check
```bash
curl https://your-deployment.repl.co/api/health/detailed
```
**Expected:** All subsystem checks should report `"healthy": true`
- ✅ Database connectivity
- ✅ Database schema integrity
- ✅ API responsiveness
- ✅ System resources
- ✅ Environment configuration

#### Liveness & Readiness Probes
```bash
# Liveness (is the process running?)
curl https://your-deployment.repl.co/api/health/live

# Readiness (is it ready to serve traffic?)
curl https://your-deployment.repl.co/api/health/ready
```

### 3. Verify Database Connection
```bash
curl https://your-deployment.repl.co/db/ping
```
**Expected:** `{"db": "ok", ...}`

### 4. Check Application Metrics
```bash
curl https://your-deployment.repl.co/api/health/metrics
```
**Expected:** JSON response with metrics for:
- Request counts and rates
- Response times (avg, min, max, percentiles)
- Error rates
- Database query statistics

---

## 📋 Manual Verification

### 1. Critical API Endpoints

Test each critical endpoint manually or use the smoke test script:

#### Projects
- [ ] `GET /api/projects` - List all projects
- [ ] `POST /api/projects` - Create new project
- [ ] `PATCH /api/projects/:id` - Update project
- [ ] `DELETE /api/projects/:id` - Delete project

#### Tasks
- [ ] `GET /api/projects/:projectId/tasks` - List tasks
- [ ] `POST /api/projects/:projectId/tasks` - Create task
- [ ] `GET /api/tasks/:id` - Get single task
- [ ] `PATCH /api/tasks/:id` - Update task
- [ ] `DELETE /api/tasks/:id` - Delete task

#### Comments
- [ ] `GET /api/tasks/:taskId/comments` - List comments
- [ ] `POST /api/tasks/:taskId/comments` - Add comment

#### Ball Handoff
- [ ] `POST /api/tasks/:taskId/ball` - Hand off task
- [ ] `GET /api/tasks/:taskId/ball` - View handoff history

#### Reports
- [ ] `GET /api/reports/tasks/status` - Tasks by status
- [ ] `GET /api/reports/tasks/ball` - Tasks by owner
- [ ] `GET /api/reports/tasks/priority` - Tasks by priority
- [ ] `GET /api/reports/tasks/overdue` - Overdue tasks
- [ ] `GET /api/reports/activity/recent` - Recent activity

#### Notifications
- [ ] `GET /api/notifications/recent` - Recent notifications

#### Attachments
- [ ] `POST /api/tasks/:id/attachments/init` - Initialize upload
- [ ] `POST /api/tasks/:id/attachments/complete` - Complete upload
- [ ] `GET /api/tasks/:id/attachments` - List attachments
- [ ] `DELETE /api/attachments/:attachmentId` - Delete attachment

### 2. Authentication & Authorization

- [ ] Verify authentication is enforced on all `/api/*` routes
- [ ] Confirm dev headers work in development mode
- [ ] Test that requests without auth headers are rejected (401)
- [ ] Verify role-based access control for admin/manager-only endpoints

### 3. Database Validation

```bash
# Check database configuration
curl https://your-deployment.repl.co/api/debug/dbinfo
```

Verify:
- [ ] Correct database host is connected
- [ ] Using session pooler (aws-0) not transaction pooler (aws-1)
- [ ] Expected project reference matches
- [ ] All critical tables exist (users, projects, tasks, roles, permissions)
- [ ] No database configuration warnings

### 4. Error Handling

Test error scenarios:
- [ ] Invalid project ID returns 404
- [ ] Invalid task ID returns 404
- [ ] Missing required fields returns 400
- [ ] Database errors return 500 with proper error messages
- [ ] All errors are logged with appropriate severity

### 5. Performance Baseline

```bash
# Get current metrics snapshot
curl https://your-deployment.repl.co/api/health/metrics
```

Record baseline metrics:
- [ ] Average response time: __________ ms
- [ ] P95 response time: __________ ms
- [ ] P99 response time: __________ ms
- [ ] Database query average: __________ ms
- [ ] Error rate: __________ %

---

## 🔍 Monitoring Setup

### 1. Health Check Monitoring

Set up external monitoring service (e.g., UptimeRobot, Pingdom, Datadog) to ping:
- [ ] `/api/health/quick` every 1-5 minutes
- [ ] Alert if response is not 200 OK
- [ ] Alert if response time > 2000ms
- [ ] Alert if service is down for > 2 minutes

### 2. Log Monitoring

If using external log aggregation (e.g., Papertrail, Loggly):
- [ ] Configure log shipping
- [ ] Set up alerts for ERROR and CRITICAL log levels
- [ ] Create dashboard for key metrics
- [ ] Test that logs are being received

### 3. Metrics Dashboard

Create monitoring dashboard with:
- [ ] Request rate (requests/second)
- [ ] Error rate (errors/second)
- [ ] Average response time
- [ ] P95 and P99 response times
- [ ] Database query performance
- [ ] Active database connections
- [ ] Memory usage
- [ ] CPU usage

### 4. Alert Configuration

Set up alerts for:
- [ ] Error rate > 5% over 5 minutes
- [ ] P95 response time > 2000ms
- [ ] Database connection failures
- [ ] Memory usage > 85%
- [ ] Service restarts
- [ ] Failed deployments

---

## 🛡️ Security Validation

### 1. Environment Variables

- [ ] All required environment variables are set
- [ ] No secrets are hardcoded in code
- [ ] DATABASE_URL is properly configured
- [ ] EXPECTED_DB_HOST matches actual database
- [ ] No sensitive data in logs

### 2. HTTPS Configuration

- [ ] Service is accessible via HTTPS
- [ ] HTTP redirects to HTTPS (if applicable)
- [ ] SSL certificate is valid
- [ ] No mixed content warnings

### 3. API Security

- [ ] CORS is properly configured
- [ ] Authentication is enforced on all protected routes
- [ ] Input validation is working
- [ ] SQL injection protection verified
- [ ] Rate limiting considered (if implemented)

---

## 📊 Database Verification

### 1. Schema Integrity

```bash
# Run schema validation
npm run db:push
```

- [ ] Schema is up to date
- [ ] All migrations applied successfully
- [ ] No pending schema changes
- [ ] All critical tables present

### 2. Data Integrity

- [ ] Sample data is present (if seeded)
- [ ] Foreign key constraints are working
- [ ] Indexes are created
- [ ] Triggers are functioning (e.g., last_activity_at)

### 3. Backup Verification

- [ ] Database backups are configured
- [ ] Backup schedule is set
- [ ] Test restore procedure documented
- [ ] Backup retention policy defined

---

## 🔧 Configuration Validation

### 1. Database Configuration

```bash
# Verify database settings
node scripts/verify-db.js
```

- [ ] Database host is correct
- [ ] Project reference matches
- [ ] Using recommended pooler type
- [ ] Connection pool size is appropriate

### 2. Application Configuration

- [ ] PORT is set correctly (default: 3000)
- [ ] NODE_ENV is set to 'production'
- [ ] LOG_LEVEL is appropriate for production
- [ ] All feature flags are configured

---

## 📝 Post-Deployment Tasks

### Immediate (< 15 minutes)

- [ ] Run automated smoke tests
- [ ] Verify all health checks pass
- [ ] Check application metrics
- [ ] Review deployment logs for errors
- [ ] Verify critical user workflows
- [ ] Update status page (if applicable)
- [ ] Notify team of successful deployment

### Short-term (< 1 hour)

- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify database performance
- [ ] Review application logs
- [ ] Test key integrations
- [ ] Verify scheduled jobs are running

### Medium-term (< 24 hours)

- [ ] Analyze performance trends
- [ ] Review security logs
- [ ] Check for memory leaks
- [ ] Verify all automated jobs ran successfully
- [ ] Review user feedback (if applicable)
- [ ] Document any issues encountered

---

## 🚨 Rollback Procedure

If any critical issues are found:

1. **Stop Traffic** (if possible)
   ```bash
   # Scale down or stop the deployment
   ```

2. **Assess Impact**
   - Identify which systems are affected
   - Determine severity and scope
   - Check if data corruption occurred

3. **Rollback Decision**
   - Minor issues: Apply hotfix
   - Major issues: Rollback to previous version

4. **Execute Rollback**
   ```bash
   # Use Replit's rollback feature or redeploy previous version
   ```

5. **Verify Rollback**
   - Run smoke tests on rolled-back version
   - Verify all systems are healthy
   - Check database integrity

6. **Post-Mortem**
   - Document what went wrong
   - Identify root cause
   - Create action items to prevent recurrence

---

## 📞 Emergency Contacts

- **DevOps Lead:** _____________
- **Database Admin:** _____________
- **Engineering Manager:** _____________
- **On-Call Engineer:** _____________

---

## ✅ Deployment Sign-Off

- [ ] All automated tests passed
- [ ] All manual verifications completed
- [ ] Monitoring is configured and active
- [ ] Team has been notified
- [ ] Documentation is updated
- [ ] Rollback procedure is tested and ready

**Deployed By:** _______________  
**Date:** _______________  
**Version:** _______________  
**Sign-Off:** _______________
