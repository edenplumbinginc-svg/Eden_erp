// lib/metrics.js
// Metrics collection and aggregation system

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byStatus: {},
        byPath: {}
      },
      responseTime: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        samples: []
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      database: {
        queries: 0,
        errors: 0,
        totalTime: 0
      }
    };
    
    this.startTime = Date.now();
  }

  /**
   * Record HTTP request
   */
  recordRequest(method, path, statusCode, duration) {
    // Increment counters
    this.metrics.requests.total++;
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    this.metrics.requests.byStatus[statusCode] = (this.metrics.requests.byStatus[statusCode] || 0) + 1;
    
    // Normalize path (remove IDs)
    const normalizedPath = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
    this.metrics.requests.byPath[normalizedPath] = (this.metrics.requests.byPath[normalizedPath] || 0) + 1;

    // Record response time
    this.recordResponseTime(duration);
  }

  /**
   * Record response time
   */
  recordResponseTime(duration) {
    this.metrics.responseTime.total += duration;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, duration);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, duration);
    
    // Keep last 100 samples for percentile calculations
    this.metrics.responseTime.samples.push(duration);
    if (this.metrics.responseTime.samples.length > 100) {
      this.metrics.responseTime.samples.shift();
    }
  }

  /**
   * Record error
   */
  recordError(type, message, stack = null) {
    this.metrics.errors.total++;
    this.metrics.errors.byType[type] = (this.metrics.errors.byType[type] || 0) + 1;
    
    // Keep last 10 errors
    this.metrics.errors.recent.push({
      timestamp: new Date().toISOString(),
      type,
      message,
      stack: stack ? stack.split('\n').slice(0, 3).join('\n') : null
    });
    
    if (this.metrics.errors.recent.length > 10) {
      this.metrics.errors.recent.shift();
    }
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(duration, error = null) {
    this.metrics.database.queries++;
    this.metrics.database.totalTime += duration;
    
    if (error) {
      this.metrics.database.errors++;
    }
  }

  /**
   * Calculate percentile from samples
   */
  calculatePercentile(samples, percentile) {
    if (samples.length === 0) return 0;
    
    const sorted = [...samples].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const avgResponseTime = this.metrics.responseTime.count > 0
      ? Math.round(this.metrics.responseTime.total / this.metrics.responseTime.count)
      : 0;
    
    const avgDbQueryTime = this.metrics.database.queries > 0
      ? Math.round(this.metrics.database.totalTime / this.metrics.database.queries)
      : 0;

    return {
      timestamp: new Date().toISOString(),
      uptime,
      requests: {
        total: this.metrics.requests.total,
        rate: uptime > 0 ? (this.metrics.requests.total / uptime).toFixed(2) : 0,
        byMethod: this.metrics.requests.byMethod,
        byStatus: this.metrics.requests.byStatus,
        topPaths: this.getTopPaths(10)
      },
      responseTime: {
        avg: avgResponseTime,
        min: this.metrics.responseTime.min === Infinity ? 0 : this.metrics.responseTime.min,
        max: this.metrics.responseTime.max,
        p50: this.calculatePercentile(this.metrics.responseTime.samples, 50),
        p95: this.calculatePercentile(this.metrics.responseTime.samples, 95),
        p99: this.calculatePercentile(this.metrics.responseTime.samples, 99)
      },
      errors: {
        total: this.metrics.errors.total,
        rate: uptime > 0 ? (this.metrics.errors.total / uptime).toFixed(4) : 0,
        byType: this.metrics.errors.byType,
        recent: this.metrics.errors.recent
      },
      database: {
        queries: this.metrics.database.queries,
        errors: this.metrics.database.errors,
        avgQueryTime: avgDbQueryTime,
        errorRate: this.metrics.database.queries > 0
          ? ((this.metrics.database.errors / this.metrics.database.queries) * 100).toFixed(2) + '%'
          : '0%'
      }
    };
  }

  /**
   * Get top N paths by request count
   */
  getTopPaths(n = 10) {
    return Object.entries(this.metrics.requests.byPath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .reduce((obj, [path, count]) => {
        obj[path] = count;
        return obj;
      }, {});
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byStatus: {},
        byPath: {}
      },
      responseTime: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        samples: []
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      database: {
        queries: 0,
        errors: 0,
        totalTime: 0
      }
    };
    this.startTime = Date.now();
  }
}

// Global metrics instance
const metrics = new MetricsCollector();

/**
 * Express middleware to collect metrics
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.recordRequest(req.method, req.path, res.statusCode, duration);
  });
  
  next();
}

module.exports = {
  metrics,
  metricsMiddleware,
  MetricsCollector
};
